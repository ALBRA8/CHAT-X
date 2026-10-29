#!/usr/bin/env python3
"""Síntesis TTS REAL con Piper (P1.3 fase 2 — voz natural $0, CPU).

Contrato CLI (invocado por src/lib/provider/voz.ts):
  python3 scripts/piper_sintetizar.py \
    --texto "..." --modelo /ruta/modelo.onnx --salida /ruta/salida.wav \
    [--longitud-escala 1.0]

Salida por stdout: JSON {ok:true, duracion_s, hz, bytes, carga_s, generacion_s}
o {ok:false, bloqueo:"..."} — NUNCA devuelve código 0 con audio vacío.

Velocidad: length_scale de piper (mayor = más lento). El tono (0–99 del
contrato) NO es ajustable en piper: se declara ignorado, no se finge.
"""
import argparse
import json
import time
import wave


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--texto", required=True)
    ap.add_argument("--modelo", required=True)
    ap.add_argument("--salida", required=True)
    ap.add_argument("--longitud-escala", type=float, default=1.0)
    args = ap.parse_args()

    t0 = time.time()
    try:
        from piper import PiperVoice, SynthesisConfig

        cfg_path = args.modelo + ".json"
        v = PiperVoice.load(args.modelo, config_path=cfg_path)
        carga_s = round(time.time() - t0, 2)

        cfg = SynthesisConfig(length_scale=max(0.3, min(3.0, args.longitud_escala)))
        tg = time.time()
        chunks = list(v.synthesize(args.texto, syn_config=cfg))
        gen_s = round(time.time() - tg, 2)

        if not chunks:
            print(json.dumps({"ok": False, "bloqueo": "piper no devolvió chunks de audio"}))
            return
        c0 = chunks[0]
        with wave.open(args.salida, "wb") as w:
            w.setnchannels(c0.sample_channels)
            w.setsampwidth(c0.sample_width)
            w.setframerate(c0.sample_rate)
            for c in chunks:
                w.writeframes(c.audio_int16_bytes)

        with wave.open(args.salida) as w:
            dur = w.getnframes() / max(1, w.getframerate())
        if dur <= 0.05:
            print(json.dumps({"ok": False, "bloqueo": f"WAV sin duración útil ({dur:.3f}s)"}))
            return

        import os

        print(
            json.dumps(
                {
                    "ok": True,
                    "duracion_s": round(dur, 2),
                    "hz": c0.sample_rate,
                    "canales": c0.sample_channels,
                    "bytes": os.path.getsize(args.salida),
                    "carga_s": carga_s,
                    "generacion_s": gen_s,
                },
                ensure_ascii=False,
            )
        )
    except Exception as e:  # noqa: BLE001
        print(json.dumps({"ok": False, "bloqueo": f"{type(e).__name__}: {str(e)[:300]}"}))
        raise SystemExit(1)


if __name__ == "__main__":
    main()
