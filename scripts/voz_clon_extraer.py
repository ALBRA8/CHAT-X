#!/usr/bin/env python3
"""Extracción de identidad de voz: audio del personaje → speaker embedding.

Entrada: ruta de archivo de audio (wav directo; mp3/m4a/ogg/webm requieren
ffmpeg para conversión temporal). Salida: JSON por stdout con el vector en
base64 (float32 little-endian), dimensionalidad, extractor y duración.

Honestidad ante todo: si falta el paquete o el audio no sirve, se declara
en "bloqueo" — nunca un vector inventado.
"""
import base64
import json
import os
import subprocess
import sys
import tempfile
import wave

DURACION_MIN_S = 3.0  # debajo de esto la identidad es poco fiable


def duracion_wav(ruta: str) -> float:
    with wave.open(ruta, "rb") as w:
        return w.getnframes() / float(w.getframerate())


def preparar_wav(ruta: str) -> tuple[str, bool]:
    """Devuelve (ruta_wav, es_temporal). Convierte con ffmpeg si hace falta."""
    if ruta.lower().endswith(".wav"):
        return ruta, False
    ffmpeg = None
    for directorio in os.environ.get("PATH", "").split(os.pathsep):
        candidato = os.path.join(directorio, "ffmpeg")
        if os.path.isfile(candidato):
            ffmpeg = candidato
            break
    if not ffmpeg:
        raise RuntimeError("formato no-wav requiere ffmpeg en el PATH para convertir")
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp.close()
    subprocess.run(
        [ffmpeg, "-y", "-i", ruta, "-ac", "1", "-ar", "16000", tmp.name],
        check=True, capture_output=True, timeout=120,
    )
    return tmp.name, True


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "bloqueo": "falta la ruta del audio"}))
        return 1
    ruta = sys.argv[1]
    try:
        if not os.path.isfile(ruta) or os.path.getsize(ruta) == 0:
            print(json.dumps({"ok": False, "bloqueo": "archivo de audio ausente o vacío"}))
            return 1

        try:
            from resemblyzer import VoiceEncoder, preprocess_wav
        except Exception as e:  # noqa: BLE001
            print(json.dumps({
                "ok": False,
                "bloqueo": f"falta el extractor de identidad: pip install resemblyzer ({type(e).__name__})",
            }))
            return 1

        wav, temporal = preparar_wav(ruta)
        try:
            duracion = duracion_wav(wav)
            if duracion < DURACION_MIN_S:
                print(json.dumps({
                    "ok": False,
                    "bloqueo": f"muestra demasiado corta ({duracion:.1f}s; mínimo {DURACION_MIN_S}s de voz real)",
                }))
                return 1

            import numpy as np

            encoder = VoiceEncoder("cpu")
            f_wav = preprocess_wav(wav)
            vec = encoder.embed_utterance(f_wav)  # float32, 256 dims (GE2E)
            b64 = base64.b64encode(np.asarray(vec, dtype="<f4").tobytes()).decode("ascii")
            print(json.dumps({
                "ok": True,
                "embedding_b64": b64,
                "dim": int(vec.shape[0]),
                "extractor": "resemblyzer-ge2e",
                "duracion_s": round(duracion, 1),
            }))
        finally:
            if temporal and os.path.exists(wav):
                os.unlink(wav)
        return 0
    except Exception as e:  # noqa: BLE001 — todo fallo se declara, nada se inventa
        print(json.dumps({"ok": False, "bloqueo": f"{type(e).__name__}: {str(e)[:300]}"}))
        return 1


if __name__ == "__main__":
    sys.exit(main())
