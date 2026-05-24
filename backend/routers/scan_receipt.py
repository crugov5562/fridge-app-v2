import os
from fastapi import APIRouter, Depends
from models.schemas import ScanReceiptRequest, ScanReceiptResponse
from routers.auth import get_current_user
import services.yandex_vision as vision
import services.yandex_gpt as yandex_gpt

router = APIRouter()


@router.post("/receipt", response_model=ScanReceiptResponse)
async def scan_receipt(
    data: ScanReceiptRequest,
    _: str = Depends(get_current_user),
):
    print(
        f"[scan/receipt] START key={bool(os.getenv('YANDEX_VISION_API_KEY'))} "
        f"folder={bool(os.getenv('YANDEX_FOLDER_ID'))}",
        flush=True,
    )
    raw_text = await vision.recognize_text(data.image_base64)
    print(f"[scan/receipt] vision raw_len={len(raw_text)}", flush=True)
    if not raw_text:
        return ScanReceiptResponse(items=[], purchase_date=None)

    try:
        result = await yandex_gpt.complete_json(
            prompt=f"Текст чека:\n{raw_text}",
            system=(
                "Ты парсер кассовых чеков. Отвечай только JSON без пояснений.\n"
                "Извлеки список товаров и дату покупки.\n"
                'Формат ответа (строго): {"items":[{"name":"название","quantity":1,"unit":"шт","price":null}],'
                '"purchase_date":"YYYY-MM-DD или null"}'
            ),
        )
        print(f"[scan/receipt] parsed {len(result.get('items', []))} items", flush=True)
        return ScanReceiptResponse(
            items=result.get("items", []),
            purchase_date=result.get("purchase_date"),
        )
    except Exception as e:
        print(f"[scan/receipt] ERROR: {e}", flush=True)
        return ScanReceiptResponse(items=[], purchase_date=None)
