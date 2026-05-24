from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

load_dotenv()

from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from db.connection import get_pool, close_pool
from routers import auth, inventory, classify, recipes, catalog
from routers import scan_photo, scan_receipt, smart_proposal
from services.ollama_service import ping as ollama_ping


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_pool()
    print("FridgeAI backend started")
    yield
    await close_pool()
    print("FridgeAI backend stopped")


app = FastAPI(title="FridgeAI Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_dir = Path("/app/uploads")
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

app.include_router(auth.router,          prefix="/auth",      tags=["auth"])
app.include_router(inventory.router,     prefix="/inventory", tags=["inventory"])
app.include_router(scan_photo.router,    prefix="/scan",      tags=["scan-photo"])
app.include_router(scan_receipt.router,  prefix="/scan",      tags=["scan-receipt"])
app.include_router(classify.router,      prefix="/classify",  tags=["classify"])
app.include_router(smart_proposal.router,  prefix="/recipes",   tags=["smart-proposal"])
app.include_router(recipes.router,         prefix="/recipes",   tags=["recipes"])
app.include_router(catalog.router,       prefix="/catalog",   tags=["catalog"])


@app.get("/health")
async def health():
    ollama_ok = await ollama_ping()
    vision_configured = bool(os.getenv("YANDEX_VISION_API_KEY"))
    return {
        "status": "ok",
        "ollama": "ok" if ollama_ok else "unavailable",
        "vision": "configured" if vision_configured else "not_configured",
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_ERROR", "message": str(exc)}},
    )
