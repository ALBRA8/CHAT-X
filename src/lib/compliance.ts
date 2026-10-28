// Compliance: registro append-only. Nunca se actualiza ni se borra (ficha sección 6).
import { db } from '@/lib/db'

export type TipoEvento =
  | 'creacion'
  | 'filtro_edad'
  | 'rechazo_qa'
  | 'etiqueta_ia'
  | 'cifrado'
  | 'exportacion'
  | 'publicacion'
  | 'acceso_privado'
  | 'desbloqueo_venta'

export async function registrarEvento(
  type: TipoEvento,
  detail: Record<string, unknown>,
  opts: { mediaId?: string; characterId?: string } = {},
): Promise<void> {
  await db.complianceEvent.create({
    data: {
      type,
      mediaId: opts.mediaId ?? null,
      characterId: opts.characterId ?? null,
      detail: JSON.stringify({ ...detail, ts: new Date().toISOString() }),
    },
  })
}

// Jerarquía de acceso al carril privado — usada por API y exportación
export async function asegurarSettings() {
  const s = await db.settings.findUnique({ where: { id: 'main' } })
  if (s) return s
  return db.settings.create({ data: { id: 'main' } })
}
