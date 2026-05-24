import httpx
import json
import os
import re

_LLM_URL = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion"


def _api_key() -> str:
    return os.getenv("YANDEX_VISION_API_KEY", "")


def _folder_id() -> str:
    return os.getenv("YANDEX_FOLDER_ID", "")


async def complete(prompt: str, system: str = "", temperature: float = 0.1) -> str:
    api_key = _api_key()
    folder_id = _folder_id()
    if not api_key or not folder_id:
        raise RuntimeError("YANDEX_VISION_API_KEY or YANDEX_FOLDER_ID not configured")

    messages = []
    if system:
        messages.append({"role": "system", "text": system})
    messages.append({"role": "user", "text": prompt})

    payload = {
        "modelUri": f"gpt://{folder_id}/yandexgpt-lite/latest",
        "completionOptions": {
            "stream": False,
            "temperature": temperature,
            "maxTokens": "1000",
        },
        "messages": messages,
    }

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            _LLM_URL,
            json=payload,
            headers={"Authorization": f"Api-Key {api_key}"},
        )
        response.raise_for_status()
        data = response.json()

    return data["result"]["alternatives"][0]["message"]["text"]


async def complete_json(prompt: str, system: str = "") -> dict:
    text = await complete(prompt, system)
    print(f"[gpt] raw={text[:600]}", flush=True)
    text = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("`").strip()
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        text = match.group(0)
    if not text:
        raise ValueError("empty gpt response")
    return json.loads(text)
