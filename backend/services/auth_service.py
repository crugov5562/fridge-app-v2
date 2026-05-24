import bcrypt
from jose import jwt
from datetime import datetime, timedelta
import os


def hash_password(password: str) -> str:
    # bcrypt напрямую без passlib — нет проблем совместимости
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(
        plain.encode("utf-8"),
        hashed.encode("utf-8"),
    )


def create_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(
        minutes=int(os.getenv("JWT_EXPIRE_MINUTES", 43200))
    )
    return jwt.encode(
        {"sub": user_id, "exp": expire},
        os.getenv("JWT_SECRET"),
        algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
    )


def decode_token(token: str) -> str:
    payload = jwt.decode(
        token,
        os.getenv("JWT_SECRET"),
        algorithms=[os.getenv("JWT_ALGORITHM", "HS256")],
    )
    return payload["sub"]
