import httpx
import os

_EMBED_URL = "https://llm.api.cloud.yandex.net/foundationModels/v1/textEmbedding"


def _api_key() -> str:
    return os.getenv("YANDEX_VISION_API_KEY", "")


def _folder_id() -> str:
    return os.getenv("YANDEX_FOLDER_ID", "")


async def embed(text: str) -> list[float]:
    """вектор запроса (для поиска по базе знаний)"""
    return await _embed(text, "text-search-query")


async def embed_passage(text: str) -> list[float]:
    """вектор документа (для индексации)"""
    return await _embed(text, "text-search-doc")


async def _embed(text: str, model_type: str) -> list[float]:
    api_key = _api_key()
    folder_id = _folder_id()
    if not api_key or not folder_id:
        raise RuntimeError("YANDEX_VISION_API_KEY or YANDEX_FOLDER_ID not configured")

    payload = {
        "modelUri": f"emb://{folder_id}/{model_type}/latest",
        "text": text,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            _EMBED_URL,
            json=payload,
            headers={"Authorization": f"Api-Key {api_key}"},
        )
        response.raise_for_status()
        return response.json()["embedding"]
