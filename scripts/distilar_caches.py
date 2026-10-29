#!/usr/bin/env python3
"""Destila a texto plano todos los .html cacheados en research/clonakit (solo lectura)."""
import re, html, sys
from pathlib import Path

BASE = Path("/home/z/my-project/research/clonakit")
DIRS = [BASE / "cache", BASE / "fetch", BASE / "data" / "pages"]

def to_text(h: str) -> str:
    h = re.sub(r"<script.*?</script>", " ", h, flags=re.S | re.I)
    h = re.sub(r"<style.*?</style>", " ", h, flags=re.S | re.I)
    h = re.sub(r"<!--.*?-->", " ", h, flags=re.S)
    h = re.sub(r"<br\s*/?>", "\n", h, flags=re.I)
    h = re.sub(r"</(p|div|h[1-6]|li|tr|section|article)>", "\n", h, flags=re.I)
    h = re.sub(r"<[^>]+>", " ", h)
    h = html.unescape(h)
    lines = [re.sub(r"\s+", " ", ln).strip() for ln in h.splitlines()]
    # deduplicar líneas consecutivas y vacíos
    out, prev = [], None
    for ln in lines:
        if ln and ln != prev:
            out.append(ln)
        prev = ln if ln else prev
    return "\n".join(out)

count = 0
for d in DIRS:
    if not d.is_dir():
        continue
    for f in sorted(d.glob("*.html")):
        out = f.with_suffix(".txt")
        if out.exists() and out.stat().st_size > 200:
            continue  # ya destilado
        try:
            raw = f.read_text(encoding="utf-8", errors="ignore")
            txt = to_text(raw)
            out.write_text(txt, encoding="utf-8")
            count += 1
            print(f"OK  {f.relative_to(BASE)} -> {len(txt)} chars")
        except Exception as e:
            print(f"ERR {f.name}: {e}")
print(f"destilados nuevos: {count}")
