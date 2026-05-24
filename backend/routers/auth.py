from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from db.connection import get_pool
from models.schemas import (
    RegisterRequest, LoginRequest, TokenResponse, UserResponse,
    SetPreferencesRequest,
)
from services.auth_service import hash_password, verify_password, create_token, decode_token

router = APIRouter()
_security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> str:
    try:
        return decode_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.post("/register", response_model=TokenResponse)
async def register(data: RegisterRequest):
    if len(data.password.encode("utf-8")) > 72:
        raise HTTPException(status_code=400, detail="Пароль слишком длинный")
    pool = await get_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT id FROM users WHERE email = $1", data.email
        )
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        user_id = await conn.fetchval(
            """INSERT INTO users (email, password_hash, display_name)
               VALUES ($1, $2, $3)
               RETURNING id""",
            data.email,
            hash_password(data.password),
            data.display_name,
        )

        await conn.execute(
            "INSERT INTO fridges (user_id, name) VALUES ($1, $2)",
            user_id,
            "Мой холодильник",
        )

    return TokenResponse(
        access_token=create_token(str(user_id)),
        user_id=str(user_id),
        display_name=data.display_name,
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest):
    pool = await get_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, password_hash, display_name FROM users WHERE email = $1",
            data.email,
        )

    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return TokenResponse(
        access_token=create_token(str(user["id"])),
        user_id=str(user["id"]),
        display_name=user["display_name"] or "",
    )


@router.get("/fridges")
async def get_fridges(user_id: str = Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, name, created_at FROM fridges WHERE user_id = $1::uuid ORDER BY created_at ASC",
            user_id,
        )
    return [{"id": str(r["id"]), "name": r["name"], "created_at": r["created_at"].isoformat()} for r in rows]


@router.get("/me", response_model=UserResponse)
async def me(user_id: str = Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, email, display_name, notify_days_before, preferences FROM users WHERE id = $1::uuid",
            user_id,
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(
        id=str(user["id"]),
        email=user["email"],
        display_name=user["display_name"],
        notify_days_before=user["notify_days_before"],
        preferences=list(user["preferences"] or []),
    )



@router.put("/me/preferences")
async def set_preferences(data: SetPreferencesRequest, user_id: str = Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE users SET preferences = $1 WHERE id = $2::uuid",
            data.preferences, user_id,
        )
    return {"ok": True}
