from fastapi import APIRouter, Depends
from db.connection import get_pool
from routers.auth import get_current_user

router = APIRouter()


@router.get("/categories")
async def list_categories(_: str = Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT id, name, icon FROM categories ORDER BY name")
    return [{"id": str(r["id"]), "name": r["name"], "icon": r["icon"]} for r in rows]


@router.get("/units")
async def list_units(_: str = Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, name, abbreviation FROM measurement_units ORDER BY name"
        )
    return [{"id": str(r["id"]), "name": r["name"], "abbreviation": r["abbreviation"]} for r in rows]
