import httpx
import os

_VISION_URL = "https://vision.api.cloud.yandex.net/vision/v1/batchAnalyze"


async def recognize_text(image_base64: str) -> str:
    if not image_base64:
        return ""
    api_key = os.getenv("YANDEX_VISION_API_KEY", "")
    folder_id = os.getenv("YANDEX_FOLDER_ID", "")

    if not api_key or not folder_id:
        return ""

    payload = {
        "folderId": folder_id,
        "analyzeSpecs": [
            {
                "content": image_base64,
                "features": [
                    {
                        "type": "TEXT_DETECTION",
                        "textDetectionConfig": {"languageCodes": ["ru", "en"]},
                    }
                ],
            }
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                _VISION_URL,
                json=payload,
                headers={"Authorization": f"Api-Key {api_key}"},
            )
            print(f"[vision] status={response.status_code}", flush=True)
            if not response.is_success:
                print(f"[vision] body={response.text[:500]}", flush=True)
                return ""
            data = response.json()
    except Exception as e:
        print(f"[vision] request ERROR: {e}", flush=True)
        return ""

    words: list[str] = []
    try:
        for outer in data.get("results", []):
            for result in outer.get("results", []):
                for page in result.get("textDetection", {}).get("pages", []):
                    for block in page.get("blocks", []):
                        for line in block.get("lines", []):
                            for word in line.get("words", []):
                                words.append(word.get("text", ""))
    except Exception as e:
        print(f"[vision] parse ERROR: {e}", flush=True)
        return ""

    return " ".join(words)


async def classify_image(image_base64: str) -> list[dict]:
    """Возвращает визуальные лейблы изображения через Yandex Vision CLASSIFICATION."""
    if not image_base64:
        return []
    api_key = os.getenv("YANDEX_VISION_API_KEY", "")
    folder_id = os.getenv("YANDEX_FOLDER_ID", "")
    if not api_key or not folder_id:
        return []

    payload = {
        "folderId": folder_id,
        "analyzeSpecs": [
            {
                "content": image_base64,
                "features": [
                    {
                        "type": "CLASSIFICATION",
                        "classificationConfig": {"model": "labels"},
                    }
                ],
            }
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                _VISION_URL,
                json=payload,
                headers={"Authorization": f"Api-Key {api_key}"},
            )
            print(f"[vision/classify] status={response.status_code}", flush=True)
            if not response.is_success:
                print(f"[vision/classify] body={response.text[:300]}", flush=True)
                return []
            data = response.json()
    except Exception as e:
        print(f"[vision/classify] ERROR: {e}", flush=True)
        return []

    labels: list[dict] = []
    try:
        for outer in data.get("results", []):
            for result in outer.get("results", []):
                for prop in result.get("classification", {}).get("properties", []):
                    conf = float(prop.get("confidence", 0))
                    if conf > 0.05:
                        labels.append({"name": prop["name"], "confidence": round(conf, 2)})
    except Exception as e:
        print(f"[vision/classify] parse ERROR: {e}", flush=True)

    print(f"[vision/classify] labels={labels}", flush=True)
    return labels
