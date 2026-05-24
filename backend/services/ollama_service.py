import httpx
import json
import os
import re


def _base_url() -> str:
    return os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")


def _model() -> str:
    return os.getenv("OLLAMA_MODEL", "llama3.2")


async def complete(prompt: str, system: str = "") -> str:
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            f"{_base_url()}/api/chat",
            json={"model": _model(), "messages": messages, "format": "json", "stream": False},
        )
        response.raise_for_status()
        return response.json()["message"]["content"]


async def complete_json(prompt: str, system: str = "") -> dict:
    text = await complete(prompt, system)
    # убираем markdown-обёртку если ollama добавил
    text = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("`").strip()
    return json.loads(text)


async def ping() -> bool:
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(f"{_base_url()}/api/tags")
            return response.status_code == 200
    except Exception:
        return False
