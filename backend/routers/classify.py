from fastapi import APIRouter, Depends
from db.connection import get_pool
from models.schemas import ClassifyProductRequest, ClassifyProductResponse
from routers.auth import get_current_user
import services.yandex_gpt as yandex_gpt
import services.embedding_service as embeddings

router = APIRouter()


@router.post("/product", response_model=ClassifyProductResponse)
async def classify_product(
    data: ClassifyProductRequest,
    _: str = Depends(get_current_user),
):
    name = data.product_name.strip()
    pool = await get_pool()

    async with pool.acquire() as conn:
        # 1. точное совпадение в product_catalog
        row = await conn.fetchrow(
            """SELECT pc.default_expiry_days, pc.unit_suggestion,
                      c.id AS category_id, c.name AS category_name,
                      zt.id AS zone_type_id, zt.name AS zone_name
               FROM product_catalog pc
               JOIN categories c  ON c.id  = pc.category_id
               JOIN zone_types zt ON zt.id = pc.zone_type_id
               WHERE LOWER(pc.name) = LOWER($1) LIMIT 1""",
            name,
        )

        if not row:
            # 2. нечёткий поиск
            row = await conn.fetchrow(
                """SELECT pc.default_expiry_days, pc.unit_suggestion,
                          c.id AS category_id, c.name AS category_name,
                          zt.id AS zone_type_id, zt.name AS zone_name
                   FROM product_catalog pc
                   JOIN categories c  ON c.id  = pc.category_id
                   JOIN zone_types zt ON zt.id = pc.zone_type_id
                   WHERE pc.name ILIKE $1 LIMIT 1""",
                f"%{name}%",
            )

        if row:
            storage_row = await conn.fetchrow(
                """SELECT sr.rule_text FROM storage_rules sr
                   WHERE sr.category_id = $1
                   ORDER BY random() LIMIT 1""",
                row["category_id"],
            )
            storage_tip = storage_row["rule_text"][:200] if storage_row else ""

            return ClassifyProductResponse(
                category=row["category_name"],
                category_id=str(row["category_id"]),
                zone_name=row["zone_name"],
                zone_type_id=str(row["zone_type_id"]),
                expiry_days=row["default_expiry_days"] or 7,
                storage_tip=storage_tip,
                unit_suggestion=row["unit_suggestion"],
                confidence="high",
            )

        # 3. RAG: эмбеддинг → knowledge_base + storage_rules → YandexGPT
        categories = await conn.fetch("SELECT id, name, default_expiry_days FROM categories ORDER BY name")
        zones = await conn.fetch("SELECT id, name FROM zone_types ORDER BY name")

        kb_chunks: list = []
        storage_chunks: list = []
        try:
            query_vec = await embeddings.embed(name)
            kb_chunks = await conn.fetch(
                "SELECT content, category FROM match_knowledge_base($1::vector, 3)",
                query_vec,
            )
            storage_chunks = await conn.fetch(
                "SELECT sr.rule_text, zt.name AS zone_name FROM storage_rules sr "
                "JOIN zone_types zt ON zt.id = sr.zone_type_id "
                "WHERE sr.embedding IS NOT NULL "
                "ORDER BY sr.embedding <=> $1::vector LIMIT 2",
                query_vec,
            )
        except Exception:
            pass

    cat_list  = ", ".join(r["name"] for r in categories)
    zone_list = ", ".join(r["name"] for r in zones)

    # ориентиры по сроку хранения из БД
    expiry_hints = "; ".join(
        f"{r['name']} — {r['default_expiry_days']} дн."
        for r in categories
        if r.get("default_expiry_days")
    )

    context_parts = []
    if kb_chunks:
        context_parts.append("База знаний:\n" + "\n".join(r["content"] for r in kb_chunks))
    if storage_chunks:
        context_parts.append("Правила хранения:\n" + "\n".join(r["rule_text"] for r in storage_chunks))
    context = "\n\n".join(context_parts)

    try:
        result = await yandex_gpt.complete_json(
            prompt=f'Продукт: "{name}"',
            system=(
                f"Ты классификатор продуктов питания. Отвечай только JSON.\n"
                f"Доступные категории: {cat_list}\n"
                f"Доступные зоны хранения: {zone_list}\n"
                + (f"{context}\n" if context else "")
                + "Определи категорию, зону хранения, срок хранения и единицу.\n"
                "ВАЖНО для expiry_days: указывай реалистичный срок хранения ЗАКРЫТОЙ оригинальной упаковки.\n"
                f"Дефолтные сроки по категориям (используй как ориентир): {expiry_hints}\n"
                "Никогда не возвращай null в expiry_days — всегда целое число.\n"
                'Формат: {"category":"из списка","zone_name":"из списка",'
                '"expiry_days":целое_число,"unit_suggestion":"л|кг|г|шт|уп",'
                '"storage_tip":"краткий совет 1-2 предложения"}'
            ),
        )

        cat_row  = next((r for r in categories if r["name"].lower() == result.get("category", "").lower()), None)
        zone_row = next((r for r in zones      if r["name"].lower() == result.get("zone_name", "").lower()), None)

        # защита от null/нечислового значения expiry_days от GPT
        raw_days = result.get("expiry_days")
        try:
            expiry_days = int(raw_days) if raw_days is not None else 7
        except (TypeError, ValueError):
            expiry_days = 7

        return ClassifyProductResponse(
            category=result.get("category", "Другое"),
            category_id=str(cat_row["id"]) if cat_row else None,
            zone_name=result.get("zone_name", "Средняя полка"),
            zone_type_id=str(zone_row["id"]) if zone_row else None,
            expiry_days=max(1, expiry_days),
            storage_tip=result.get("storage_tip", ""),
            unit_suggestion=result.get("unit_suggestion"),
            confidence="medium",
        )

    except Exception as e:
        print(f"[classify] gpt error: {e}", flush=True)
        return ClassifyProductResponse(
            category="Другое",
            category_id=None,
            zone_name="Средняя полка",
            zone_type_id=None,
            expiry_days=7,
            storage_tip="",
            unit_suggestion=None,
            confidence="low",
        )
