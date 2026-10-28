#!/usr/bin/env python3
"""Generador CLI de imágenes por CPU (provider 'local-cpu' de CHAT-X).

Interfaz estable para el provider TS (src/lib/provider/localcpu.ts):
  python3 scripts/provider_cpu_generar.py \
    --prompt "..." --seed 12345 --ancho 512 --alto 512 --pasos 12 \
    --salida /ruta/salida.png --resultado /ruta/resultado.json

Escribe un JSON {ok, archivo, generacion_s, ram_pico_mb, modelo, ancho, alto}.
Falla con JSON {ok:false, bloqueo} — nunca con códigos ambiguos.
"""
import argparse
import json
import resource
import sys
import time

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--ancho", type=int, default=512)
    ap.add_argument("--alto", type=int, default=512)
    ap.add_argument("--pasos", type=int, default=12)
    ap.add_argument("--modelo", default="stable-diffusion-v1-5/stable-diffusion-v1-5")
    ap.add_argument("--salida", required=True)
    ap.add_argument("--resultado", required=True)
    args = ap.parse_args()

    res: dict = {"modelo": args.modelo, "ancho": args.ancho, "alto": args.alto, "pasos": args.pasos}
    t0 = time.time()
    try:
        import torch
        torch.set_num_threads(max(1, (torch.get_num_threads() or 2) and 2))
        from diffusers import StableDiffusionPipeline

        pipe = StableDiffusionPipeline.from_pretrained(
            args.modelo, torch_dtype=torch.float16, variant="fp16", use_safetensors=True,
            safety_checker=None, requires_safety_checker=False, feature_extractor=None,
        ).to("cpu")
        pipe.enable_attention_slicing("max")
        pipe.set_progress_bar_config(disable=True)
        res["carga_s"] = round(time.time() - t0, 1)

        g = torch.Generator("cpu").manual_seed(args.seed)  # semilla determinista
        tg = time.time()
        img = pipe(args.prompt, num_inference_steps=args.pasos, guidance_scale=6.5,
                   height=args.alto, width=args.ancho, generator=g).images[0]
        res["generacion_s"] = round(time.time() - tg, 1)
        img.save(args.salida)
        res["archivo"] = args.salida
        res["ok"] = True
    except Exception as e:  # noqa: BLE001 — el error exacto ES el dato
        res["ok"] = False
        res["bloqueo"] = f"{type(e).__name__}: {str(e)[:400]}"
    res["ram_pico_mb"] = round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024, 1)
    with open(args.resultado, "w") as f:
        json.dump(res, f, ensure_ascii=False, indent=1)
    print(json.dumps(res, ensure_ascii=False))
    sys.exit(0 if res["ok"] else 1)

if __name__ == "__main__":
    main()
