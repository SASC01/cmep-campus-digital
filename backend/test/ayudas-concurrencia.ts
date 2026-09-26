import type { LightMyRequestResponse } from "fastify"
import { expect } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"

// Ayuda de concurrencia para las pruebas de integración del protocolo de bloqueo por usuario
// (AUTH-02, Enmienda 2, ronda 3). Usa el mismo método que cuentas-r2.ataque (reescrito aquí:
// nunca se importa de un *.ataque): una transacción externa retiene una fila con
// SELECT ... FOR UPDATE mientras se lanzan las operaciones en un orden fijo, y se sondea
// pg_blocking_pids (fuera de la transacción retenedora) hasta que cada operación esté formada
// detrás de la fila retenida o ya haya terminado. Así el orden de llegada no depende de cuánto
// tarde argon2 ni de la carga de la suite.

export interface FilaRetenida {
  tabla: "usuarios" | "sesiones"
  id: string
}

// Las operaciones que llaman a un adaptador directamente devuelven null.
export type Operacion = () => Promise<LightMyRequestResponse | null>

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

export const conFilaRetenida = async (
  fila: FilaRetenida,
  operaciones: readonly Operacion[],
): Promise<(LightMyRequestResponse | null)[]> => {
  const lanzadas: Promise<LightMyRequestResponse | null>[] = []
  await obtenerDb().$transaction(
    async (tx) => {
      await (fila.tabla === "usuarios"
        ? tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${fila.id}::uuid FOR UPDATE`
        : tx.$queryRaw`SELECT id FROM sesiones WHERE id = ${fila.id}::uuid FOR UPDATE`)
      const [propio] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
      if (!propio) throw new Error("Precondición: no se obtuvo el pid de la transacción retenedora")

      const detrasDeLaFila = async (): Promise<number> => {
        // Fuera de la transacción retenedora: dentro de ella, pg_stat_activity conserva la
        // instantánea de su primera lectura hasta el final de la transacción.
        const [fila] = await obtenerDb().$queryRaw<{ n: number }[]>`
          WITH RECURSIVE bloqueados(pid) AS (
            SELECT pid FROM pg_stat_activity WHERE ${propio.pid}::int = ANY(pg_blocking_pids(pid))
            UNION
            SELECT a.pid FROM pg_stat_activity a
            JOIN bloqueados b ON b.pid = ANY(pg_blocking_pids(a.pid))
          )
          SELECT count(*)::int AS n FROM bloqueados`
        return fila?.n ?? 0
      }

      for (const [indice, operacion] of operaciones.entries()) {
        let terminada = false
        const lanzada = operacion()
        lanzada.then(
          () => (terminada = true),
          () => (terminada = true),
        )
        lanzadas.push(lanzada)
        const limite = Date.now() + 10_000
        let formada = false
        while (!formada && !terminada && Date.now() < limite) {
          formada = (await detrasDeLaFila()) >= indice + 1
          if (!formada) await esperar(25)
        }
        expect(
          formada || terminada,
          `Precondición: la operación ${indice + 1} no llegó a la fila retenida en 10 s`,
        ).toBe(true)
      }
      // Margen para que la última operación termine de formarse antes de soltar la fila.
      await esperar(100)
    },
    { timeout: 30_000, maxWait: 5_000 },
  )
  return Promise.all(lanzadas)
}
