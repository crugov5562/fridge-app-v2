"""
Smart Proposal — «стратегия микро-докупок».

Алгоритм:
1. Найти продукты пользователя, истекающие через 1–3 дня.
2. Попробовать векторный поиск рецептов (match_recipes с pgvector).
   Если эмбеддинги не заполнены — текстовый fallback через ILIKE.
3. Загрузить ингредиенты кандидатов, вычислить «уже есть» vs «не хватает».
4. Отобрать top-5 кандидатов с наименьшим числом докупок.
5. YandexGPT выбирает лучший рецепт и оценивает цены недостающих.
"""

from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from db.connection import get_pool
from models.schemas import (
    SmartProposalExpiring,
    SmartProposalIngredient,
    SmartProposalResponse,
)
from routers.auth import get_current_user
import services.embedding_service as embeddings
import services.yandex_gpt as yandex_gpt

router = APIRouter()

_GPT_SYSTEM = """\
Ты помощник по кулинарному планированию. Отвечай ТОЛЬКО JSON без пояснений.

Задача: из списка рецептов-кандидатов выбери тот, который:
1. Использует пропадающие продукты как основные ингредиенты.
2. Требует докупить меньше всего позиций.
3. Является полноценным блюдом (не просто каша из одного ингредиента).

Для каждого недостающего ингредиента оцени среднюю розничную цену
в российском рублях (обычный супермаркет, минимальная упаковка).

Для savings_rub оцени суммарную стоимость пропадающих продуктов.

Формат ответа:
{
  "recipe_title": "точное название из списка",
  "missing_ingredients": [{"name": "...", "estimated_price": 70}],
  "savings_rub": 450,
  "cost_rub": 70,
  "tagline": "Спаси курицу на 450₽"
}

tagline — короткий призыв (макс. 32 символа), всегда упоминай сумму экономии.
Если ни один рецепт не подходит — {"recipe_title": null}.
"""


@router.get("/smart-proposal", response_model=Optional[SmartProposalResponse])
async def smart_proposal(
    fridge_id: str,
    user_id: str = Depends(get_current_user),
) -> SmartProposalResponse | None:
    pool = await get_pool()
    async with pool.acquire() as conn:

        # убеждаемся, что холодильник принадлежит пользователю
        fridge = await conn.fetchrow(
            "SELECT id FROM fridges WHERE id = $1 AND user_id = $2",
            fridge_id, user_id,
        )
        if not fridge:
            raise HTTPException(status_code=404, detail="Fridge not found")

        # 1. пропадающие продукты (1–3 дня)
        expiring_rows = await conn.fetch(
            """
            SELECT name, expiry_date::text
            FROM inventory_items
            WHERE fridge_id = $1
              AND expiry_date BETWEEN CURRENT_DATE + 1
                                  AND CURRENT_DATE + 3
            ORDER BY expiry_date ASC
            """,
            fridge_id,
        )
        if not expiring_rows:
            return None

        # 2a. попытка векторного поиска
        recipe_matches = []
        try:
            query_text = " ".join(r["name"] for r in expiring_rows)
            query_vec = await embeddings.embed(query_text)
            recipe_matches = await conn.fetch(
                "SELECT id, title, similarity FROM match_recipes($1::vector, 10)",
                query_vec,
            )
        except Exception as e:
            print(f"[smart_proposal] vector search failed: {e}", flush=True)

        # 2b. текстовый fallback когда эмбеддинги не заполнены
        if not recipe_matches:
            like_patterns = [f"%{r['name'].lower()}%" for r in expiring_rows]
            recipe_matches = await conn.fetch(
                """
                SELECT DISTINCT r.id, r.title, 0.7::float AS similarity
                FROM recipes r
                JOIN recipe_ingredients ri ON ri.recipe_id = r.id
                WHERE LOWER(ri.product_name) ILIKE ANY($1::text[])
                LIMIT 10
                """,
                like_patterns,
            )
            print(f"[smart_proposal] text fallback found {len(recipe_matches)} recipes", flush=True)

        if not recipe_matches:
            return None

        # 3. ингредиенты кандидатов одним запросом
        recipe_ids = [r["id"] for r in recipe_matches]
        ing_rows = await conn.fetch(
            """
            SELECT recipe_id, product_name, is_optional
            FROM recipe_ingredients
            WHERE recipe_id = ANY($1)
            """,
            recipe_ids,
        )

        # 4. весь инвентарь (для определения «что уже есть»)
        inventory_rows = await conn.fetch(
            "SELECT LOWER(name) AS name FROM inventory_items WHERE fridge_id = $1",
            fridge_id,
        )

    # ───── вычисление кандидатов ──────────────────────────────────────────
    inventory_names = {r["name"] for r in inventory_rows}

    ing_map: dict[str, list[str]] = defaultdict(list)
    for ing in ing_rows:
        if not ing["is_optional"]:
            ing_map[str(ing["recipe_id"])].append(ing["product_name"].lower())

    expiring_names_lower = {r["name"].lower() for r in expiring_rows}

    candidates = []
    for match in recipe_matches:
        rid = str(match["id"])
        required = ing_map.get(rid, [])
        missing = [i for i in required if i not in inventory_names]
        uses_expiring = expiring_names_lower & set(required)

        # рецепт должен использовать хотя бы один пропадающий продукт
        if not uses_expiring:
            continue

        candidates.append({
            "id": rid,
            "title": match["title"],
            "similarity": float(match["similarity"]),
            "required": required,
            "missing": missing,
            "missing_count": len(missing),
        })

    if not candidates:
        return None

    # сортировка: меньше докупок → выше схожесть
    candidates.sort(key=lambda c: (c["missing_count"], -c["similarity"]))
    top = candidates[:5]

    # ───── формируем промпт для GPT ──────────────────────────────────────
    expiring_str = "\n".join(
        f"- {r['name']} (истекает {r['expiry_date']})" for r in expiring_rows
    )
    candidates_str = "\n".join(
        f"{i+1}. {c['title']}\n"
        f"   Нужно докупить ({c['missing_count']} шт): {', '.join(c['missing']) or 'ничего'}"
        for i, c in enumerate(top)
    )

    try:
        result = await yandex_gpt.complete_json(
            prompt=(
                f"Пропадающие продукты:\n{expiring_str}\n\n"
                f"Рецепты-кандидаты:\n{candidates_str}"
            ),
            system=_GPT_SYSTEM,
        )
    except Exception as e:
        print(f"[smart_proposal] gpt error: {e}", flush=True)
        return None

    if not result.get("recipe_title"):
        return None

    # безопасно парсим числа из ответа GPT
    def _int(val: object, default: int = 0) -> int:
        try:
            return max(0, int(val))  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return default

    missing_ingredients = [
        SmartProposalIngredient(
            name=item.get("name", ""),
            estimated_price=_int(item.get("estimated_price")),
        )
        for item in result.get("missing_ingredients", [])
        if item.get("name")
    ]

    return SmartProposalResponse(
        recipe_title=result["recipe_title"],
        tagline=result.get("tagline", "Спаси продукты"),
        expiring_products=[
            SmartProposalExpiring(name=r["name"], expiry_date=r["expiry_date"])
            for r in expiring_rows
        ],
        missing_ingredients=missing_ingredients,
        savings_rub=_int(result.get("savings_rub")),
        cost_rub=_int(result.get("cost_rub")),
    )
