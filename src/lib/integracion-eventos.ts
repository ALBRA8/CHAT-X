// Helper compartido: registro inmutable de eventos de integración.
export async function registroEvento(source: string, event: string, detail: Record<string, unknown> | string = {}) {
  const { db } = await import('@/lib/db')
  await db.integracionEvent.create({
    data: {
      source,
      event,
      detail: typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 8000),
    },
  })
}
