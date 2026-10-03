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
//
// "Formada" quiere decir "esperando esta fila" (CHORE-02, §D-3): formadasDetrasDe cuenta solo los
// procesos que esperan un bloqueo de fila (wait_event "transactionid" o "tuple"), nunca uno de
// tabla ("relation") ni uno consultivo ("advisory"), ni lo que esté detrás de ellos. Antes contaba
// cualquier proceso bloqueado detrás, y una operación podía darse por formada antes de llegar a la
// fila, con lo que la siguiente se lanzaba antes y el orden se invertía (A3 de bloqueo-usuario).
// Una espera de fila solo existe sobre una fila ya confirmada: en READ COMMITTED, una fila que nace
// dentro de la retenedora no es visible para las demás, que no la encuentran y no esperan.

// AUTH-03b: se agrega "enlaces_registro" para la carrera entre revocar un enlace y registrarse
// con él (registrarMaestroConEnlace y revocarEnlaceRegistro toman FOR NO KEY UPDATE sobre esa
// fila, Enmienda 6).
export interface FilaRetenida {
  tabla: "usuarios" | "sesiones" | "enlaces_registro"
  id: string
}

// Las operaciones que llaman a un adaptador directamente devuelven null.
export type Operacion = () => Promise<LightMyRequestResponse | null>

// Ejecutor de SQL parametrizado con la transacción retenedora, para escribir algo justo antes de
// soltar la fila (AUTH-03a, ronda 1 del tester: la carrera "entre el filtro previo y el bloqueo").
export type EjecutorSqlDeLaRetencion = (
  sql: TemplateStringsArray,
  ...valores: unknown[]
) => Promise<number>

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

// Fuera de la transacción retenedora: dentro de ella, pg_stat_activity conserva la instantánea de su
// primera lectura hasta el final de la transacción. Cuenta, de forma recursiva, los procesos que
// esperan la fila que retiene el proceso pid: el primero espera su identificador de transacción
// ("transactionid") y los siguientes la tupla que tiene el primero ("tuple").
export const formadasDetrasDe = async (pid: number): Promise<number> => {
  const [fila] = await obtenerDb().$queryRaw<{ n: number }[]>`
    WITH RECURSIVE bloqueados(pid) AS (
      SELECT a.pid FROM pg_stat_activity a
      WHERE ${pid}::int = ANY(pg_blocking_pids(a.pid))
        AND a.wait_event_type = 'Lock' AND a.wait_event IN ('transactionid', 'tuple')
      UNION
      SELECT a.pid FROM pg_stat_activity a
      JOIN bloqueados b ON b.pid = ANY(pg_blocking_pids(a.pid))
      WHERE a.wait_event_type = 'Lock' AND a.wait_event IN ('transactionid', 'tuple')
    )
    SELECT count(*)::int AS n FROM bloqueados`
  return fila?.n ?? 0
}

export const conFilaRetenida = async (
  fila: FilaRetenida,
  operaciones: readonly Operacion[],
  antesDeSoltar?: (sql: EjecutorSqlDeLaRetencion) => Promise<void>,
): Promise<(LightMyRequestResponse | null)[]> => {
  const lanzadas: Promise<LightMyRequestResponse | null>[] = []
  await obtenerDb().$transaction(
    async (tx) => {
      const consultaPorTabla: Record<FilaRetenida["tabla"], () => Promise<unknown>> = {
        usuarios: () =>
          tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${fila.id}::uuid FOR UPDATE`,
        sesiones: () =>
          tx.$queryRaw`SELECT id FROM sesiones WHERE id = ${fila.id}::uuid FOR UPDATE`,
        enlaces_registro: () =>
          tx.$queryRaw`SELECT id FROM enlaces_registro WHERE id = ${fila.id}::uuid FOR UPDATE`,
      }
      await consultaPorTabla[fila.tabla]()
      const sql: EjecutorSqlDeLaRetencion = (texto, ...valores) => tx.$executeRaw(texto, ...valores)
      const [propio] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
      if (!propio) throw new Error("Precondición: no se obtuvo el pid de la transacción retenedora")

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
          formada = (await formadasDetrasDe(propio.pid)) >= indice + 1
          if (!formada) await esperar(25)
        }
        expect(
          formada || terminada,
          `Precondición: la operación ${indice + 1} no llegó a la fila retenida en 10 s`,
        ).toBe(true)
      }
      if (antesDeSoltar) await antesDeSoltar(sql)
      // Margen para que la última operación termine de formarse antes de soltar la fila.
      await esperar(100)
    },
    { timeout: 30_000, maxWait: 5_000 },
  )
  return Promise.all(lanzadas)
}
