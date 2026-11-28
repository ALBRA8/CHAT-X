# POLÍTICA DE CAMBIO DE COSTES — MUSE (D-015 · A8)
**Creado:** 2026-11-20 (S-012) · **Estado:** VIGENTE · **Módulo:** Cumplimiento/ops
**Origen:** patrón A8 del destripe MIAFACTORY (su aviso honesto de subida de costes del 14-nov compensando a los ya pagados) — adoptado como POLÍTICA, jamás como texto: identidad y palabras propias (regla adaptar-no-copiar, D-015).

## 1. Principio

**El estimate mostrado antes de producir es el contrato del cobro.** Si un coste variable cambia después, nadie descubre el cambio en una factura: se avisa ANTES del siguiente uso y a quien ya pagó el precio viejo por trabajo equivalente se le compensa la diferencia. La confianza del operador (y mañana la del cliente en Fanvue) vale más que un ajuste de centavos.

## 2. Ámbito

| Qué cambia | Ejemplo | Tratamiento |
|---|---|---|
| Coste en puntos de una herramienta del Estudio (catálogo declarativo A1) | sube el coste de `fabrica_fotos` | versión de la fila + fecha; el precio viejo aplica a los trabajos ya en cola |
| Coste de un proveedor externo de pago (D-002: RunningHub u otro, SOLO con autorización) | cambia la tarifa del proveedor | aviso + revisión de estimates; si el cambio es al alza, se recalcula ANTES de producir, no después |
| Techo diario / saldo de Settings | ajuste operativo | cambia solo con orden del fundador; queda en compliance |

Fuera de ámbito: los desvíos puntuales de un trabajo ya producido — esos los refleja el veredicto `resumenCoste` de A2 (`ajustado_bajo` devuelve, `ajustado_alto` lo absorbe el estudio). Esta política gobierna cambios de PRECIO, no errores de un trabajo.

## 3. Procedimiento (4 pasos, sin excepciones)

1. **Registrar:** el cambio se asienta en el log de compliance (append-only) con fecha, precio viejo, precio nuevo y motivo. Sin registro, el cambio no existe.
2. **Avisar:** banner en el Panel y nota en la ficha de la herramienta ANTES de que nadie produzca al precio nuevo. El aviso dice qué cambió, cuándo y cuánto.
3. **Compensar:** a quien pagó el precio viejo por trabajo equivalente dentro de las 72 h anteriores al aviso, se le devuelve la diferencia al saldo automáticamente (libro de costes interno — hoy el único pagador es el estudio; cuando haya clientes, la regla es la misma).
4. **Nunca retroactivo negativo silencioso:** ningún cambio cobra "de más" a trabajos ya terminados ni recalcula el pasado sin aviso previo explícito.

## 4. Reglas duras

- El estimate que se muestra antes de ejecutar es el que se cobra — si el real sale distinto, manda A2 (reembolso/ajuste por trabajo), no esta política.
- Los cambios de precio en el catálogo declarativo se hacen editando la fila en BD (patrón A1) con fecha de vigencia; el historial del precio vive en el log de compliance.
- Subidas de coste de proveedor de pago NO autorizan gasto: la regla $0 sigue mandando (MUSE_BRIEF §7.7).
- El fundador aprueba todo cambio de precio que implique gasto nuevo (control humano, MUSE_BRIEF §7.6).

## 5. Vigencia y relación con el plan

Anotada como adopción BAJA en `PLAN_ADAPTACION_MIAFACTORY.md` (A8) y EJECUTADA en su forma documental el 2026-11-20. Cuando exista proveedor de pago (A6), esta política se activa tal cual, sin reescribirse: la compensación corre contra el saldo por proveedor que A6 introduzca.
