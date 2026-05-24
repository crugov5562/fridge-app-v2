import re
from datetime import datetime


def extract_quantity_unit(text: str) -> tuple[float | None, str | None]:
    normalized = text.replace(',', '.')
    patterns = [
        (r'(\d+(?:\.\d+)?)\s*кг\b', 'кг'),
        (r'(\d+(?:\.\d+)?)\s*гр?\b', 'г'),
        (r'(\d+(?:\.\d+)?)\s*г\b', 'г'),
        (r'(\d+(?:\.\d+)?)\s*мл\b', '_мл'),
        (r'(\d+(?:\.\d+)?)\s*л\b', 'л'),
        (r'(\d+(?:\.\d+)?)\s*шт\b', 'шт'),
    ]
    for pattern, unit in patterns:
        m = re.search(pattern, normalized, re.IGNORECASE)
        if m:
            qty = float(m.group(1))
            if unit == '_мл':
                return round(qty / 1000, 3), 'л'
            return qty, unit
    return None, None


def parse_expiry(text: str) -> str | None:
    print(f"[parse_expiry] input={text!r}", flush=True)
    candidates: list[tuple[int, str]] = []
    SEP = r'[./\-]'

    for m in re.finditer(rf'\b(\d{{2}}){SEP}(\d{{2}}){SEP}(\d{{4}})\b', text):
        try:
            d = datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)))
            if d.year >= 2020:
                candidates.append((m.start(), d.strftime('%Y-%m-%d')))
        except ValueError:
            pass

    for m in re.finditer(rf'\b(\d{{2}}){SEP}(\d{{2}}){SEP}(\d{{2}})\b', text):
        try:
            d = datetime(2000 + int(m.group(3)), int(m.group(2)), int(m.group(1)))
            if d.year >= 2020:
                candidates.append((m.start(), d.strftime('%Y-%m-%d')))
        except ValueError:
            pass

    for m in re.finditer(rf'\b(\d{{2}}){SEP}(\d{{4}})\b', text):
        try:
            d = datetime(int(m.group(2)), int(m.group(1)), 1)
            if d.year >= 2020:
                candidates.append((m.start(), d.strftime('%Y-%m-%d')))
        except ValueError:
            pass

    for m in re.finditer(r'\b(\d{4})[.\-/](\d{2})[.\-/](\d{2})\b', text):
        try:
            d = datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)))
            if d.year >= 2020:
                candidates.append((m.start(), d.strftime('%Y-%m-%d')))
        except ValueError:
            pass

    print(f"[parse_expiry] candidates={candidates}", flush=True)
    if not candidates:
        return None
    return max(candidates, key=lambda x: x[1])[1]
