// Centro de Operaciones — estado REAL de los motores del ecosistema.
// Cada estado sale de una sonda HTTP real; nada se supone.
import { NextResponse } from 'next/server'
import { MOTORES, estadoMotor } from '@/lib/motores'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const estados = await Promise.all(MOTORES.map((m) => estadoMotor(m.id)))
    const resumen = {
      operativos: estados.filter((e) => e.estado.estado === 'OPERATIVO').length,
      conProblemas: estados.filter((e) => e.estado.estado === 'INALCANZABLE' || e.estado.estado === 'NO_AUTORIZADO').length,
      sinConfigurar: estados.filter((e) => e.estado.estado === 'NO_CONFIGURADO').length,
    }
    return NextResponse.json({ motores: MOTORES, estados, resumen })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error al sondar motores' }, { status: 500 })
  }
}
