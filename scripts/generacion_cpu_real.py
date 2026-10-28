#!/usr/bin/env python3
"""Intento REAL de generación por CPU (orden: 'si no hay GPU, prueba la alternativa de CPU').

Modelo: Stable Diffusion 1.5 (pruned-emaonly, fp16) — el más pequeño de calidad usable.
Mide: tiempo por imagen, RAM pico (maxrss), y deja el archivo PNG resultante.
Si la RAM del sandbox (3.9 GB total / ~2.6 GB disponible) no alcanza, falla con el
error exacto de memoria — que es precisamente el dato que alimenta la decisión GPU.
"""
import json
import resource
import time

RESULT = {"modelo": "stable-diffusion-v1-5 (fp16, CPU)", "pasos": None, "resolucion": None}

def registrar(ok, **kw):
    RESULT.update(kw)
    RESULT["ok"] = ok
    RESULT["ram_pico_mb"] = round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024, 1)
    print(json.dumps(RESULT, ensure_ascii=False, indent=1))

t0 = time.time()
try:
    import torch
    torch.set_num_threads(2)
    from diffusers import StableDiffusionPipeline

    RESULT["torch"] = torch.__version__
    print(f"[{time.time()-t0:6.1f}s] cargando pipeline fp16 en CPU (mmap + attention slicing)…", flush=True)
    pipe = StableDiffusionPipeline.from_pretrained(
        "stable-diffusion-v1-5/stable-diffusion-v1-5",
        torch_dtype=torch.float16,
        variant="fp16",
        use_safetensors=True,
        safety_checker=None,
        requires_safety_checker=False,
        feature_extractor=None,
    ).to("cpu")
    pipe.enable_attention_slicing("max")
    pipe.set_progress_bar_config(disable=True)
    RESULT["carga_s"] = round(time.time() - t0, 1)
    print(f"[{time.time()-t0:6.1f}s] pipeline listo; generando 384x384, 12 pasos…", flush=True)

    tg = time.time()
    img = pipe(
        "professional portrait photo of a woman, soft golden hour light, 50mm, photorealistic",
        num_inference_steps=12,
        guidance_scale=6.5,
        height=384,
        width=384,
    ).images[0]
    RESULT["pasos"] = 12
    RESULT["resolucion"] = "384x384"
    RESULT["generacion_s"] = round(time.time() - tg, 1)
    ruta = "/home/z/my-project/download/cpu_generacion_real.png"
    img.save(ruta)
    RESULT["archivo"] = ruta
    registrar(True, mensaje="GENERACIÓN CPU REAL COMPLETADA")
except MemoryError as e:
    registrar(False, bloqueo=f"MemoryError: {e}", mensaje="RAM del sandbox insuficiente para CPU fallback (dato medido, no estimado)")
except Exception as e:
    registrar(False, bloqueo=f"{type(e).__name__}: {str(e)[:300]}")
