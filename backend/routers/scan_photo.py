import asyncio
import base64
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from fastapi import APIRouter, Depends
from db.connection import get_pool
from models.schemas import (
    RecognizeProductRequest,
    RecognizeProductResponse,
    RecognizedProduct,
    ScanExpiryRequest,
    ScanExpiryResponse,
    ScanPhotoRequest,
    ScanPhotoResponse,
)
from routers.auth import get_current_user
from services.scan_utils import extract_quantity_unit, parse_expiry
import services.yandex_vision as vision
import services.yandex_gpt as yandex_gpt

UPLOADS_DIR = Path("/app/uploads")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter()


@router.post("/photo", response_model=ScanPhotoResponse)
async def scan_photo(
    data: ScanPhotoRequest,
    _: str = Depends(get_current_user),
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        cat_rows  = await conn.fetch("SELECT id, name, default_expiry_days FROM categories ORDER BY name")
        zone_rows = await conn.fetch("SELECT id, name FROM zone_types ORDER BY name")

    cat_list   = ", ".join(r["name"] for r in cat_rows)
    zone_list  = ", ".join(r["name"] for r in zone_rows)
    cat_expiry: dict[str, int] = {r["name"].lower(): r["default_expiry_days"] for r in cat_rows}
    cat_ids:    dict[str, str] = {r["name"].lower(): str(r["id"]) for r in cat_rows}
    zone_ids:   dict[str, str] = {r["name"].lower(): str(r["id"]) for r in zone_rows}

    photo_url: str | None = None
    if data.front_image_base64:
        try:
            filename = f"{uuid.uuid4().hex}.jpg"
            (UPLOADS_DIR / filename).write_bytes(base64.b64decode(data.front_image_base64))
            photo_url = f"/uploads/{filename}"
        except Exception as e:
            print(f"[scan/photo] photo save error: {e}", flush=True)

    front_text, label_text = await asyncio.gather(
        vision.recognize_text(data.front_image_base64),
        vision.recognize_text(data.label_image_base64),
    )
    print(f"[scan/photo] front_len={len(front_text)} label_len={len(label_text)}", flush=True)

    name = ""
    brand = None
    category = None
    zone_name = None
    expiry_days_gpt: int | None = None
    unit_from_gpt: str | None = None
    storage_tip = ""

    expiry_hints = "; ".join(
        f"{r['name']} — {r['default_expiry_days']} дн."
        for r in cat_rows
        if r.get("default_expiry_days")
    )
    gpt_system = (
        "Ты распознаватель продуктов питания. Отвечай ТОЛЬКО JSON без пояснений.\n"
        "Правила для name: краткое название 1-4 слова, на русском, без веса и кодов.\n"
        f"Доступные категории (выбери одну точно из списка): {cat_list}\n"
        f"Доступные зоны хранения (выбери одну точно из списка): {zone_list}\n"
        "expiry_days — реалистичный срок хранения ЗАКРЫТОЙ упаковки (целое число, не null).\n"
        f"Дефолтные сроки по категориям (используй как ориентир): {expiry_hints}\n"
        'Формат: {"name":"...","brand":null,"category":"...","zone_name":"...",'
        '"expiry_days":целое_число,"unit_suggestion":"шт","storage_tip":"..."}\n'
        "Если name/brand неизвестны — ставь null."
    )

    if front_text or label_text:
        try:
            prod = await yandex_gpt.complete_json(
                prompt=f"Текст с упаковки:\n{front_text}",
                system=gpt_system,
            )
            name            = prod.get("name") or ""
            brand           = prod.get("brand")
            category        = prod.get("category")
            zone_name       = prod.get("zone_name")
            expiry_days_gpt = prod.get("expiry_days")
            unit_from_gpt   = prod.get("unit_suggestion")
            storage_tip     = prod.get("storage_tip") or ""
            print(f"[scan/photo] product={prod}", flush=True)
        except Exception as e:
            print(f"[scan/photo] gpt error: {e}", flush=True)
    else:
        print("[scan/photo] no text → visual classification", flush=True)
        try:
            visual_labels = await vision.classify_image(data.front_image_base64)
            if visual_labels:
                label_hints = ", ".join(f"{l['name']} ({l['confidence']})" for l in visual_labels[:10])
                print(f"[scan/photo] visual labels: {label_hints}", flush=True)
                prod = await yandex_gpt.complete_json(
                    prompt=f"Визуальные метки изображения продукта: {label_hints}",
                    system=gpt_system,
                )
                name            = prod.get("name") or ""
                brand           = prod.get("brand")
                category        = prod.get("category")
                zone_name       = prod.get("zone_name")
                expiry_days_gpt = prod.get("expiry_days")
                unit_from_gpt   = prod.get("unit_suggestion")
                storage_tip     = prod.get("storage_tip") or ""
                print(f"[scan/photo] visual product={prod}", flush=True)
            else:
                print("[scan/photo] no labels — user types manually", flush=True)
        except Exception as e:
            print(f"[scan/photo] visual error: {e}", flush=True)

    category_id  = cat_ids.get(category.lower())  if category  else None
    zone_type_id = zone_ids.get(zone_name.lower()) if zone_name else None

    combined_text = front_text + " " + label_text
    expiry_date = parse_expiry(combined_text) if (front_text or label_text) else None
    print(f"[scan/photo] expiry_date={expiry_date}", flush=True)

    expiry_auto = expiry_date is None
    if expiry_auto:
        days = expiry_days_gpt or (cat_expiry.get(category.lower()) if category else None) or 7
        expiry_date = (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")
        print(f"[scan/photo] default expiry +{days}d → {expiry_date}", flush=True)

    quantity, unit_suggestion = extract_quantity_unit(combined_text)
    if not unit_suggestion:
        unit_suggestion = unit_from_gpt
    print(f"[scan/photo] qty={quantity} unit={unit_suggestion}", flush=True)

    has_text = bool(front_text or label_text)
    return ScanPhotoResponse(
        name=name,
        brand=brand,
        category=category,
        category_id=category_id,
        zone_name=zone_name,
        zone_type_id=zone_type_id,
        storage_tip=storage_tip or None,
        expiry_date=expiry_date,
        expiry_auto=expiry_auto,
        confidence=0.85 if (name and has_text) else (0.6 if name else 0.3),
        photo_url=photo_url,
        quantity=quantity,
        unit_suggestion=unit_suggestion,
    )


@router.post("/product", response_model=RecognizeProductResponse)
async def scan_product(
    data: RecognizeProductRequest,
    _: str = Depends(get_current_user),
):
    raw_text = await vision.recognize_text(data.image_base64)
    if not raw_text:
        return RecognizeProductResponse(
            product=RecognizedProduct(name="", category="", confidence=0.0),
            raw_text="",
        )

    try:
        result = await yandex_gpt.complete_json(
            prompt=f"Текст с упаковки:\n{raw_text}",
            system=(
                "Ты помощник по распознаванию продуктов питания. Отвечай только JSON.\n"
                'Формат: {"name":"название продукта","category":"категория","confidence":0.9}'
            ),
        )
        return RecognizeProductResponse(
            product=RecognizedProduct(
                name=result.get("name", ""),
                category=result.get("category", ""),
                confidence=float(result.get("confidence", 0.7)),
            ),
            raw_text=raw_text,
        )
    except Exception:
        return RecognizeProductResponse(
            product=RecognizedProduct(name="", category="", confidence=0.0),
            raw_text=raw_text,
        )


@router.post("/expiry", response_model=ScanExpiryResponse)
async def scan_expiry(
    data: ScanExpiryRequest,
    _: str = Depends(get_current_user),
):
    raw_text = await vision.recognize_text(data.image_base64)
    if not raw_text:
        return ScanExpiryResponse(found=False)

    try:
        result = await yandex_gpt.complete_json(
            prompt=f'Продукт: "{data.product_name}"\nТекст с этикетки:\n{raw_text}',
            system=(
                "Найди срок годности на этикетке продукта. Отвечай только JSON.\n"
                'Формат: {"found":true,"date":"YYYY-MM-DD","confidence":0.9}\n'
                'Если срок не найден: {"found":false}'
            ),
        )
        return ScanExpiryResponse(
            found=result.get("found", False),
            date=result.get("date"),
            raw_text=raw_text,
            confidence=float(result.get("confidence", 0.0)),
        )
    except Exception:
        return ScanExpiryResponse(found=False, raw_text=raw_text)
