#!/usr/bin/env python3
"""Sonda honesta del subsistema de clonación de voz local (capa 3).

Reporta lo que REALMENTE hay en este host: python, paquetes, modelos en
models/clon/ y ffmpeg. Nada inventado: lo que falta se declara.
Salida: JSON por stdout.
"""
import json
import os
import sys

RAIZ_CLON = os.path.join(os.getcwd(), "models", "clon")


def paquete_disponible(nombre: str) -> bool:
    try:
        __import__(nombre)
        return True
    except Exception:  # noqa: BLE001 — cualquier fallo de import = no disponible
        return False


def main() -> int:
    resultado = {
        "python_ok": True,
        "python_version": f"{sys.version_info.major}.{sys.version_info.minor}",
        "paquetes": {},
        "modelos": [],
        "extractor": None,
        "sintetizador_ok": False,
    }

    # Paquetes relevantes (import name ≠ pip name en algunos casos)
    pruebas = {
        "numpy": "numpy",
        "resemblyzer": "resemblyzer",
        "librosa": "librosa",
        "soundfile": "soundfile",
        "torch": "torch",
    }
    for clave, modulo in pruebas.items():
        resultado["paquetes"][clave] = paquete_disponible(modulo)

    # Extractor operativo: resemblyzer (MIT) es el extractor por defecto
    if resultado["paquetes"]["resemblyzer"] and resultado["paquetes"]["numpy"]:
        resultado["extractor"] = "resemblyzer-ge2e"

    # Modelos presentes en models/clon/ (descarga única compartida)
    if os.path.isdir(RAIZ_CLON):
        resultado["modelos"] = sorted(
            f for f in os.listdir(RAIZ_CLON) if not f.startswith(".")
        )
        # Sintetizador: XTTS-v2 (no comercial) u OpenVoice v2 (MIT) como checkpoint local
        tiene_xtts = any("xtts" in f.lower() for f in resultado["modelos"])
        tiene_openvoice = any("openvoice" in f.lower() for f in resultado["modelos"])
        resultado["sintetizador_ok"] = tiene_xtts or tiene_openvoice

    # ffmpeg (para aceptar mp3/m4a/webm además de wav)
    resultado["paquetes"]["ffmpeg"] = False
    for directorio in os.environ.get("PATH", "").split(os.pathsep):
        if os.path.isfile(os.path.join(directorio, "ffmpeg")):
            resultado["paquetes"]["ffmpeg"] = True
            break

    print(json.dumps(resultado, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
