from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from db.connection import get_pool
from models.schemas import InventoryItemCreate, InventoryItemUpdate, InventoryItemResponse
from routers.auth import get_current_user

router = APIRouter()


def _row_to_response(row) -> InventoryItemResponse:
    return InventoryItemResponse(
        id=str(row["id"]),
        fridge_id=str(row["fridge_id"]),
        name=row["name"],
        category_id=str(row["category_id"]) if row["category_id"] else None,
        zone_type_id=str(row["zone_type_id"]) if row["zone_type_id"] else None,
        quantity=float(row["quantity"]),
        unit_id=str(row["unit_id"]) if row["unit_id"] else None,
        expiry_date=str(row["expiry_date"]) if row["expiry_date"] else None,
        photo_url=row["photo_url"],
        notes=row["notes"],
        added_at=row["added_at"].isoformat(),
        updated_at=row["updated_at"].isoformat(),
    )


@router.get("", response_model=list[InventoryItemResponse])
async def list_items(
    fridge_id: str = Query(...),
    user_id: str = Depends(get_current_user),
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT * FROM inventory_items
               WHERE user_id = $1::uuid AND fridge_id = $2::uuid
               ORDER BY expiry_date ASC NULLS LAST""",
            user_id,
            fridge_id,
        )
    return [_row_to_response(r) for r in rows]


@router.get("/expiring", response_model=list[InventoryItemResponse])
async def expiring_items(
    days: int = Query(5),
    user_id: str = Depends(get_current_user),
):
    threshold = datetime.utcnow().date() + timedelta(days=days)
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT * FROM inventory_items
               WHERE user_id = $1::uuid AND expiry_date <= $2
               ORDER BY expiry_date ASC NULLS LAST""",
            user_id,
            threshold,
        )
    return [_row_to_response(r) for r in rows]


@router.post("", response_model=InventoryItemResponse)
async def create_item(data: InventoryItemCreate, user_id: str = Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        fridge = await conn.fetchrow(
            "SELECT id FROM fridges WHERE id = $1::uuid AND user_id = $2::uuid",
            data.fridge_id,
            user_id,
        )
        if not fridge:
            raise HTTPException(status_code=403, detail="Fridge not found or access denied")

        expiry = date.fromisoformat(data.expiry_date) if data.expiry_date else None

        row = await conn.fetchrow(
            """INSERT INTO inventory_items
               (user_id, fridge_id, name, category_id, zone_type_id, quantity, unit_id,
                expiry_date, photo_url, notes)
               VALUES ($1::uuid, $2::uuid, $3, $4::uuid, $5::uuid, $6, $7::uuid, $8, $9, $10)
               RETURNING *""",
            user_id,
            data.fridge_id,
            data.name,
            data.category_id,
            data.zone_type_id,
            data.quantity,
            data.unit_id,
            expiry,
            data.photo_url,
            data.notes,
        )
    return _row_to_response(row)


@router.patch("/{item_id}", response_model=InventoryItemResponse)
async def update_item(
    item_id: str,
    data: InventoryItemUpdate,
    user_id: str = Depends(get_current_user),
):
    expiry = date.fromisoformat(data.expiry_date) if data.expiry_date else None
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """UPDATE inventory_items SET
               name          = COALESCE($1, name),
               category_id   = COALESCE($2::uuid, category_id),
               zone_type_id  = COALESCE($3::uuid, zone_type_id),
               quantity      = COALESCE($4, quantity),
               unit_id       = COALESCE($5::uuid, unit_id),
               expiry_date   = COALESCE($6, expiry_date),
               photo_url     = COALESCE($7, photo_url),
               notes         = COALESCE($8, notes),
               updated_at    = now()
               WHERE id = $9::uuid AND user_id = $10::uuid
               RETURNING *""",
            data.name,
            data.category_id,
            data.zone_type_id,
            data.quantity,
            data.unit_id,
            expiry,
            data.photo_url,
            data.notes,
            item_id,
            user_id,
        )
        if not row:
            raise HTTPException(status_code=404, detail="Item not found")
    return _row_to_response(row)


@router.delete("/{item_id}")
async def delete_item(item_id: str, user_id: str = Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        deleted = await conn.fetchval(
            "DELETE FROM inventory_items WHERE id = $1::uuid AND user_id = $2::uuid RETURNING id",
            item_id,
            user_id,
        )
        if not deleted:
            raise HTTPException(status_code=404, detail="Item not found")
    return {"deleted": True}
