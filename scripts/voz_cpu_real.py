#!/usr/bin/env python3
"""TTS real por CPU con Piper (voz es_ES) — prueba separada de la generación de imagen.

Salida: /home/z/my-project/download/voz_real_es.wav + métricas por stdout (JSON).
"""
import json
import time

RUTA = "/home/z/my-project/download/voz_real_es.wav"
TEXTO = "Hola, soy Valentina. Gracias por unirte a mi página. Hoy tengo un contenido especial para ti."

t0 = time.time()
try:
    import wave

    from piper import PiperVoice

    v = PiperVoice.load("/tmp/piper-es/es_voice.onnx", config_path="/tmp/piper-es/es.json")
    carga_s = round(time.time() - t0, 2)

    tg = time.time()
    chunks = list(v.synthesize(TEXTO))
    gen_s = round(time.time() - tg, 2)

    c0 = chunks[0]
    rate = c0.sample_rate
    channels = c0.sample_channels
    width = c0.sample_width

    with wave.open(RUTA, "wb") as w:
        w.setnchannels(channels)
        w.setsampwidth(width)
        w.setframerate(rate)
        for c in chunks:
            w.writeframes(c.audio_int16_bytes)

    with wave.open(RUTA) as w:
        dur = w.getnframes() / w.getframerate()
    print(json.dumps({
        "ok": True, "motor": "piper 1.8 (onnxruntime CPU)", "voz": "es_ES-carlfm-x_low",
        "carga_s": carga_s, "generacion_s": gen_s, "duracion_audio_s": round(dur, 1),
        "hz": rate, "canales": channels, "archivo": RUTA,
        "mensaje": "TTS REAL COMPLETADO (voz ≠ imagen: probado por separado)",
    }, ensure_ascii=False))
except Exception as e:  # noqa: BLE001
    print(json.dumps({"ok": False, "bloqueo": f"{type(e).__name__}: {str(e)[:300]}"}, ensure_ascii=False))
