from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from db.connection import get_pool
from models.schemas import (
    RecommendRecipesRequest,
    RecommendRecipesResponse,
    RecipeRecommendation,
    RecipeDetail,
    RecipeIngredientDetail,
)
from routers.auth import get_current_user
import services.embedding_service as embeddings

router = APIRouter()


@router.post("/recommend", response_model=RecommendRecipesResponse)
async def recommend_recipes(
    data: RecommendRecipesRequest,
    user_id: str = Depends(get_current_user),
):
    pool = await get_pool()
    async with pool.acquire() as conn:

        # проверка принадлежности холодильника
        fridge = await conn.fetchrow(
            "SELECT id FROM fridges WHERE id = $1 AND user_id = $2",
            data.fridge_id, user_id,
        )
        if not fridge:
            raise HTTPException(status_code=404, detail="Fridge not found")

        # инвентарь пользователя
        inv_rows = await conn.fetch(
            "SELECT LOWER(name) AS name FROM inventory_items WHERE fridge_id = $1",
            data.fridge_id,
        )
        inventory_set = {r["name"] for r in inv_rows}

        if not inventory_set and not data.query:
            return RecommendRecipesResponse(recipes=[])

        # строим текст запроса для эмбеддинга
        query_text = data.query if data.query else " ".join(inventory_set)

        # векторный поиск
        recipe_matches = []
        try:
            query_vec = await embeddings.embed(query_text)
            recipe_matches = await conn.fetch(
                "SELECT id, title, similarity FROM match_recipes($1::vector, 20)",
                query_vec,
            )
        except Exception as e:
            print(f"[recipes/recommend] vector search failed: {e}", flush=True)

        # fallback: все рецепты при пустых эмбеддингах
        if not recipe_matches:
            recipe_matches = await conn.fetch(
                "SELECT id, title, 0.5::float AS similarity FROM recipes ORDER BY title LIMIT 20"
            )

        if not recipe_matches:
            return RecommendRecipesResponse(recipes=[])

        recipe_ids = [r["id"] for r in recipe_matches]

        ing_rows = await conn.fetch(
            """SELECT recipe_id, product_name, is_optional
               FROM recipe_ingredients WHERE recipe_id = ANY($1)""",
            recipe_ids,
        )
        detail_rows = await conn.fetch(
            "SELECT id, description, cooking_time_minutes FROM recipes WHERE id = ANY($1)",
            recipe_ids,
        )

    # ─── сборка результатов ──────────────────────────────────────────────
    ing_map: dict[str, list[dict]] = defaultdict(list)
    for ing in ing_rows:
        ing_map[str(ing["recipe_id"])].append({
            "name": ing["product_name"].lower(),
            "optional": ing["is_optional"],
        })

    detail_map = {str(r["id"]): r for r in detail_rows}
    sim_map   = {str(r["id"]): float(r["similarity"]) for r in recipe_matches}

    results: list[RecipeRecommendation] = []
    for match in recipe_matches:
        rid = str(match["id"])
        required = [i for i in ing_map.get(rid, []) if not i["optional"]]
        total = len(required)

        have    = [i["name"] for i in required if i["name"] in inventory_set]
        missing = [i["name"] for i in required if i["name"] not in inventory_set]

        match_pct = round(len(have) / total * 100) if total > 0 else 0
        detail = detail_map.get(rid, {})

        results.append(RecipeRecommendation(
            id=rid,
            title=match["title"],
            description=detail.get("description"),
            cooking_time_minutes=detail.get("cooking_time_minutes"),
            match_percent=match_pct,
            have_count=len(have),
            total_count=total,
            missing_ingredients=missing,
            have_ingredients=have,
        ))

    # сортировка: больше совпадение → выше; при равенстве — по векторной близости
    results.sort(key=lambda r: (-r.match_percent, -sim_map.get(r.id, 0)))

    return RecommendRecipesResponse(recipes=results)


@router.get("/{recipe_id}", response_model=RecipeDetail)
async def get_recipe(
    recipe_id: str,
    fridge_id: str | None = None,
    _: str = Depends(get_current_user),
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        recipe = await conn.fetchrow(
            "SELECT id, title, description, instructions, cooking_time_minutes, servings FROM recipes WHERE id = $1",
            recipe_id,
        )
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")

        ing_rows = await conn.fetch(
            """SELECT ri.product_name, ri.quantity, ri.is_optional, mu.abbreviation AS unit
               FROM recipe_ingredients ri
               LEFT JOIN measurement_units mu ON mu.id = ri.unit_id
               WHERE ri.recipe_id = $1
               ORDER BY ri.is_optional, ri.product_name""",
            recipe_id,
        )

        # инвентарь для пометки «есть / нет»
        inventory_set: set[str] = set()
        if fridge_id:
            inv = await conn.fetch(
                "SELECT LOWER(name) AS name FROM inventory_items WHERE fridge_id = $1",
                fridge_id,
            )
            inventory_set = {r["name"] for r in inv}

    ingredients = [
        RecipeIngredientDetail(
            name=ing["product_name"],
            quantity=float(ing["quantity"]) if ing["quantity"] else None,
            is_optional=ing["is_optional"],
            have=ing["product_name"].lower() in inventory_set,
        )
        for ing in ing_rows
    ]

    return RecipeDetail(
        id=str(recipe["id"]),
        title=recipe["title"],
        description=recipe["description"],
        instructions=recipe["instructions"],
        cooking_time_minutes=recipe["cooking_time_minutes"],
        servings=recipe["servings"],
        ingredients=ingredients,
    )
