// SONDEO DE DATOS REALES (fase de consolidación) — define qué significa "OPERATIVO"
// para cada uno de los 6 motores con arranque vivo. Solo lecturas GET + una prueba
// real de scraping (cazador) que NO envía nada a nadie. Imprime resúmenes, nunca secretos.
export {}
const R: { motor: string; endpoint: string; estado: string; detalle: string }[] = []

async function probe(motor: string, base: string, ruta: string, init?: RequestInit, etiqueta?: string) {
  const t0 = Date.now()
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(base + ruta, { ...init, signal: ctrl.signal, cache: 'no-store' })
    clearTimeout(t)
    const texto = await res.text()
    let resumen = texto.slice(0, 220).replace(/\s+/g, ' ')
    try {
      const j = JSON.parse(texto) as Record<string, unknown>
      if (Array.isArray(j)) resumen = `JSON array con ${j.length} elementos`
      else if (j && typeof j === 'object') resumen = Object.entries(j).slice(0, 8).map(([k, v]) => `${k}=${typeof v === 'object' ? (Array.isArray(v) ? `array(${(v as unknown[]).length})` : 'obj') : String(v)} `).join(' ').trim()
    } catch { /* texto plano */ }
    R.push({ motor, endpoint: etiqueta ?? ruta, estado: `HTTP ${res.status}`, detalle: resumen })
  } catch (e) {
    R.push({ motor, endpoint: etiqueta ?? ruta, estado: 'ERROR', detalle: e instanceof Error ? e.message : 'fallo' })
  }
}

// 1) CRM-ALBRA :3100 — salud con check de BD + catálogo real de acciones
await probe('crm', 'http://127.0.0.1:3100', '/api/health', undefined, 'health (check BD)')
await probe('crm', 'http://127.0.0.1:3100', '/api/crm/actions', undefined, 'catálogo crm-actions/v1')

// 2) WHATSPOWER :3003 — salud + flujos conversacionales guardados
await probe('whatspower', 'http://127.0.0.1:3003', '/api/health')
await probe('whatspower', 'http://127.0.0.1:3003', '/api/flows', undefined, 'flujos guardados')

// 3) WHATSPOWER-ULTRA :3004 — salud + estado de campañas (solo lectura, NADA se despacha)
await probe('ultra', 'http://127.0.0.1:3004', '/api/health')
await probe('ultra', 'http://127.0.0.1:3004', '/api/campaigns', undefined, 'campañas (lectura)')

// 4) NEX-SCOPE :3300 — salud (app disponible; endpoints de trabajo exigen sesión JWT)
await probe('nexscope', 'http://127.0.0.1:3300', '/api/health')

// 5) Extension-CAZADOR :8787 — salud + PRUEBA REAL de extracción (lectura de página pública, sin envíos)
await probe('cazador', 'http://127.0.0.1:8787', '/api/health')
await probe('cazador', 'http://127.0.0.1:8787', '/api/scrape', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://example.com', fields: ['title'] }),
}, 'PRUEBA REAL scrape example.com (título)')

// 6) AGENTE-KREA :3210 — doctor profundo (subsistemas reales)
await probe('agentekrea', 'http://127.0.0.1:3210', '/api/doctor', undefined, 'doctor (subsistemas)')

console.log('motor          endpoint                          estado       detalle')
console.log('─'.repeat(118))
for (const r of R) {
  console.log(`${r.motor.padEnd(14)} ${r.endpoint.padEnd(33)} ${r.estado.padEnd(12)} ${r.detalle.slice(0, 60)}`)
}
