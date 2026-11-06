#!/usr/bin/env python3
"""Descarga los pesos del clon de voz a models/clon/ (OpenVoice v2 converter +
MeloTTS-Spanish). Idempotente: salta lo que ya está. $0 — repos públicos HF."""
import os

from huggingface_hub import hf_hub_download

BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "clon")


def bajar(repo: str, archivo: str, sub: str) -> str:
    destino = os.path.join(BASE, sub)
    os.makedirs(destino, exist_ok=True)
    ruta = hf_hub_download(repo_id=repo, filename=archivo, local_dir=destino)
    print(f"OK {repo}/{archivo} -> {ruta} ({os.path.getsize(ruta)} bytes)")
    return ruta


if __name__ == "__main__":
    bajar("myshell-ai/OpenVoiceV2", "converter/config.json", "openvoicev2")
    bajar("myshell-ai/OpenVoiceV2", "converter/checkpoint.pth", "openvoicev2")
    bajar("myshell-ai/OpenVoiceV2", "base_speakers/ses/es.pth", "openvoicev2")
    bajar("myshell-ai/MeloTTS-Spanish", "config.json", "melotts-es")
    bajar("myshell-ai/MeloTTS-Spanish", "checkpoint.pth", "melotts-es")
    print("DESCARGA COMPLETA")
