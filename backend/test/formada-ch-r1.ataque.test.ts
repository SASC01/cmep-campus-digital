import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { inicializarAuth } from "../src/adapters/auth/index.js"
import { cerrarConexion, inicializarDb, obtenerDb } from "../src/adapters/db/cliente.js"
import { generarTokenRefresco, hashTokenRefresco } from "../src/adapters/auth/index.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { cargarEnv } from "../src/config/env.js"
import { borrarUsuariosDePrueba, crearUsuarioDePrueba } from "./ayudas-auth.js"
import { formadasDetrasDe } from "./ayudas-concurrencia.js"

// Ataque del Tester (CHORE-02, ronda 1, punto 3): formas de esperar una fila retenida que el filtro
// de formadasDetrasDe (wait_event "transactionid" o "tuple") podría no reconocer. Si alguna espera
// legítima no contara, una prueba de bloqueo-usuario esperaría 10 s y fallaría su precondición.
// Retiene una fila propia de usuarios, confirmada antes de abrir la retenedora.

const ids: string[] = []
const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

beforeAll(async () => {
  const env = cargarEnv()
  inicializarDb({ connectionString: env.DATABASE_URL })
  await inicializarAuth(opcionesDeAuth(env))
})

afterAll(async () => {
  await borrarUsuariosDePrueba(ids)
  await cerrarConexion()
})

describe("ataque (CHORE-02 r1): formadasDetrasDe reconoce toda espera de la fila retenida", () => {
  it("llave foránea (INSERT de una sesión), UPDATE de la fila y FOR KEY SHARE explícito: los tres cuentan", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const db = obtenerDb()
    const opciones = { timeout: 30_000, maxWait: 5_000 }
    const esperas: Promise<unknown>[] = []

    const medida = await db.$transaction(async (retenedora) => {
      await retenedora.$queryRaw`SELECT id FROM usuarios WHERE id = ${usuario.id}::uuid FOR UPDATE`
      const [propio] = await retenedora.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
      if (!propio) throw new Error("Precondición: no se obtuvo el pid de la retenedora")

      const formadas = async (n: number): Promise<number> => {
        const limite = Date.now() + 10_000
        let actual = 0
        while (Date.now() < limite) {
          actual = await formadasDetrasDe(propio.pid)
          if (actual >= n) return actual
          await esperar(25)
        }
        return actual
      }

      // 1. Llave foránea: el INSERT de una sesión toma FOR KEY SHARE sobre la fila del usuario.
      const token = generarTokenRefresco()
      esperas.push(
        db.$transaction(
          (tx) =>
            tx.sesion.create({
              data: {
                usuarioId: usuario.id,
                hashToken: hashTokenRefresco(token),
                expiraEn: new Date(Date.now() + 60_000),
              },
              select: { id: true },
            }),
          opciones,
        ),
      )
      const trasLlave = await formadas(1)
      // 2. UPDATE directo de la fila.
      esperas.push(
        db.$transaction(
          (tx) =>
            tx.$executeRaw`UPDATE usuarios SET nombre = nombre WHERE id = ${usuario.id}::uuid`,
          opciones,
        ),
      )
      const trasUpdate = await formadas(2)
      // 3. FOR KEY SHARE explícito.
      esperas.push(
        db.$transaction(
          (tx) =>
            tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${usuario.id}::uuid FOR KEY SHARE`,
          opciones,
        ),
      )
      const trasKeyShare = await formadas(3)
      const eventos = await db.$queryRaw<{ wait_event: string | null }[]>`
        SELECT wait_event FROM pg_stat_activity
        WHERE wait_event_type = 'Lock' AND ${propio.pid}::int = ANY(pg_blocking_pids(pid))`
      return { trasLlave, trasUpdate, trasKeyShare, eventos: eventos.map((e) => e.wait_event) }
    }, opciones)

    await Promise.all(esperas)
    expect({
      trasLlave: medida.trasLlave,
      trasUpdate: medida.trasUpdate,
      trasKeyShare: medida.trasKeyShare,
    }).toEqual({ trasLlave: 1, trasUpdate: 2, trasKeyShare: 3 })
    expect(
      medida.eventos.every((e) => e === "transactionid" || e === "tuple"),
      `esperas directas: ${medida.eventos.join(", ")}`,
    ).toBe(true)
  }, 45_000)
})
