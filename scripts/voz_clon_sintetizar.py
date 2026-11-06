#!/usr/bin/env python3
"""Clon de voz REAL (P1.3 fase 3) — OpenVoice v2 (MIT) + MeloTTS-Spanish en CPU.

Contrato CLI (invocado por src/lib/provider/voz.ts):
  extraer:   python3 scripts/voz_clon_sintetizar.py --modo extraer \
               --muestra /ruta/muestra.wav --modelo-dir models/clon
             → stdout JSON {ok:true, embedding_b64, duracion_s, carga_s, generacion_s}

  sintetizar: python3 scripts/voz_clon_sintetizar.py --modo sintetizar \
               --texto "..." --embedding /ruta/se.tmp --modelo-dir models/clon \
               --salida /ruta/salida.wav [--velocidad 1.0]
             → stdout JSON {ok:true, duracion_s, hz, bytes, carga_s, generacion_s}

Cualquier fallo → JSON {ok:false, bloqueo:"..."} + exit 1 (NUNCA código 0 sin audio).

La identidad de la voz es un VECTOR (tensor SE, ~KB): el embedding viaja en
base64 y vive en la base de datos (VoiceProfile.embeddingB64), no en disco.
Licencia: OpenVoice v2 y MeloTTS son MIT — apto para plataforma comercial.
"""
import argparse
import base64
import contextlib
import io
import json
import os
import sys
import tempfile
import time


@contextlib.contextmanager
def stdout_a_stderr():
    """Los paquetes imprimen banners en stdout (load_ckpt, TTS...) — se derivan a
    stderr para que NUESTRO stdout sea JSON puro (contrato con voz.ts)."""
    real = sys.stdout
    sys.stdout = sys.stderr
    try:
        yield
    finally:
        sys.stdout = real


def morir(bloqueo: str) -> None:
    print(json.dumps({"ok": False, "bloqueo": bloqueo[:400]}, ensure_ascii=False))
    raise SystemExit(1)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--modo", required=True, choices=["extraer", "sintetizar"])
    ap.add_argument("--modelo-dir", required=True)
    ap.add_argument("--muestra")
    ap.add_argument("--texto")
    ap.add_argument("--embedding")
    ap.add_argument("--salida")
    ap.add_argument("--velocidad", type=float, default=1.0)
    ap.add_argument("--dispositivo", default="cpu")  # este entorno es CPU; 'cuda:0' exige GPU real
    args = ap.parse_args()

    if args.velocidad < 0.6 or args.velocidad > 1.6:
        args.velocidad = max(0.6, min(1.6, args.velocidad))

    t0 = time.time()
    try:
        import librosa
        import soundfile as sf
        import torch
        from openvoice import api as openvoice_api
    except Exception as e:  # noqa: BLE001
        morir(f"backend openvoice no disponible: {type(e).__name__}: {e} — "
              f"instalar con: pip install --no-deps git+https://github.com/myshell-ai/OpenVoice.git "
              f"git+https://github.com/myshell-ai/MeloTTS.git + dependencias (CONTEXTO X/02_PROCESSES/MOTOR_GPU.md)")

    conv_cfg = os.path.join(args.modelo_dir, "openvoicev2", "converter", "config.json")
    conv_ckpt = os.path.join(args.modelo_dir, "openvoicev2", "converter", "checkpoint.pth")
    melo_cfg = os.path.join(args.modelo_dir, "melotts-es", "config.json")
    melo_ckpt = os.path.join(args.modelo_dir, "melotts-es", "checkpoint.pth")
    for ruta, rotulo in [(conv_cfg, "converter config"), (conv_ckpt, "converter checkpoint"),
                         (melo_cfg, "MeloTTS-es config"), (melo_ckpt, "MeloTTS-es checkpoint")]:
        if not os.path.isfile(ruta):
            morir(f"falta el peso del clon de voz ({rotulo}) en {args.modelo_dir} — "
                  f"descargar con scripts/descargar_clon_pesos.py")

    try:
        # Nota: enable_watermark NO se pasa explícito — el padre no acepta el kwarg
        # (queda activado por defecto vía kwargs.get en ToneColorConverter).
        with stdout_a_stderr():
            conversor = openvoice_api.ToneColorConverter(config_path=conv_cfg, device=args.dispositivo)
            conversor.load_ckpt(conv_ckpt)
    except Exception as e:  # noqa: BLE001
        morir(f"no se pudo cargar el conversor de tono: {type(e).__name__}: {e}")

    carga_s = round(time.time() - t0, 2)

    if args.modo == "extraer":
        if not args.muestra or not os.path.isfile(args.muestra):
            morir(f"muestra de voz inexistente: {args.muestra}")
        t1 = time.time()
        try:
            audio, sr = librosa.load(args.muestra, sr=None, mono=True)
        except Exception as e:  # noqa: BLE001
            morir(f"no se pudo leer la muestra (formato soportado: wav/ogg/flac): {type(e).__name__}: {e}")
        dur = len(audio) / max(1, sr)
        if dur < 3.0:
            morir(f"muestra demasiado corta ({dur:.1f}s) — se necesita al menos 3s; ideal 10–30s limpios, sin música")
        if dur > 120.0:
            audio = audio[: int(120.0 * sr)]
            dur = 120.0

        # Trocear en ventanas ≤ 11s (el ref_enc promedia chunks): sin whisper/VAD,
        # ventanas fijas — suficiente para una muestra limpia de una sola voz.
        tamano = int(11.0 * sr)
        trozos = []
        try:
            for i in range(0, len(audio), tamano):
                parte = audio[i : i + tamano]
                if len(parte) < sr:  # descartar cola < 1s
                    break
                fd, ruta = tempfile.mkstemp(suffix=".wav", prefix="chatx-clon-seg-")
                os.close(fd)
                sf.write(ruta, parte, sr)
                trozos.append(ruta)
            se = conversor.extract_se(trozos, se_save_path=None)
        except Exception as e:  # noqa: BLE001
            morir(f"extracción del embedding falló: {type(e).__name__}: {e}")
        finally:
            for ruta in trozos:
                try:
                    os.unlink(ruta)
                except OSError:
                    pass

        buffer = io.BytesIO()
        torch.save(se.cpu(), buffer)
        print(json.dumps({
            "ok": True,
            "embedding_b64": base64.b64encode(buffer.getvalue()).decode("ascii"),
            "duracion_s": round(dur, 2),
            "trozos": len(trozos),
            "hz_muestra": int(sr),
            "carga_s": carga_s,
            "generacion_s": round(time.time() - t1, 2),
        }, ensure_ascii=False))
        return

    # ── modo sintetizar ──
    if not args.texto or not args.texto.strip():
        morir("texto vacío")
    if not args.embedding or not os.path.isfile(args.embedding):
        morir(f"embedding de voz inexistente: {args.embedding}")
    if not args.salida:
        morir("ruta de salida requerida")
    t1 = time.time()
    try:
        tgt_se = torch.load(args.embedding, map_location="cpu")
        from melo.api import TTS

        with stdout_a_stderr():
            tts = TTS(language="ES", device="cpu", config_path=melo_cfg, ckpt_path=melo_ckpt)
            # OJO: HParams no define __iter__ — iterarlo directo llama
            # __getitem__(0) → getattr(self, 0) → TypeError. Se itera .keys().
            claves = list(tts.hps.data.spk2id.keys())
            hablante = next((k for k in claves if "ES" in k.upper()), claves[0])
            base_wav = args.salida + ".base.wav"
            tts.tts_to_file(text=args.texto, speaker_id=tts.hps.data.spk2id[hablante], output_path=base_wav, speed=args.velocidad)
    except Exception as e:  # noqa: BLE001
        morir(f"síntesis base MeloTTS falló: {type(e).__name__}: {e}")

    try:
        with stdout_a_stderr():
            src_se = conversor.extract_se([base_wav], se_save_path=None)
            conversor.convert(audio_src_path=base_wav, src_se=src_se, tgt_se=tgt_se, output_path=args.salida, tau=0.3)
    except Exception as e:  # noqa: BLE001
        morir(f"conversión de tono OpenVoice falló: {type(e).__name__}: {e}")
    finally:
        try:
            os.unlink(base_wav)
        except OSError:
            pass

    try:
        info = sf.info(args.salida)
        dur = info.frames / max(1, info.samplerate)
    except Exception as e:  # noqa: BLE001
        morir(f"el conversor no produjo un WAV legible: {type(e).__name__}: {e}")
    if dur <= 0.05:
        morir(f"WAV sin duración útil ({dur:.3f}s)")
    print(json.dumps({
        "ok": True,
        "duracion_s": round(dur, 2),
        "hz": int(info.samplerate),
        "bytes": os.path.getsize(args.salida),
        "carga_s": carga_s,
        "generacion_s": round(time.time() - t1, 2),
        "backend": "openvoice-v2+melo-es (MIT)",
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
