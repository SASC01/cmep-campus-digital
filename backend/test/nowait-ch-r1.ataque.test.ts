import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { inicializarAuth } from "../src/adapters/auth/index.js"
import { cerrarConexion, inicializarDb, obtenerDb } from "../src/adapters/db/cliente.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { cargarEnv } from "../src/config/env.js"
import { borrarUsuariosDePrueba, crearUsuarioDePrueba } from "./ayudas-auth.js"

// Ataque del Tester (CHORE-02, ronda 1, punto 2): el método de C-1 (LOCK TABLE … NOWAIT con
// reintento acotado), reescrito aquí (nunca se importa de un *.ataque). Con una fila de usuarios
// retenida por otra transacción:
// - el bloqueo de tabla nunca queda en la cola (pg_locks sin AccessExclusiveLock con
//   granted = false) y una lectura de usuarios de otra conexión no espera detrás de él;
// - cuando por fin lo obtiene, una operación que lea usuarios queda bloqueada (el caso de C-1
//   seguiría fallando por tiempo si recuperar leyera usuarios: el reintento no lo esconde).
// Retiene el bloqueo de tabla lo mínimo (300 ms), para no frenar a los demás archivos.

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

const esBloqueoNoDisponible = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false
  // Solo se leen propiedades opcionales para clasificar el error.
  const conCodigo = error as Error & {
    meta?: { driverAdapterError?: { cause?: { originalCode?: unknown } } }
  }
  if (conCodigo.meta?.driverAdapterError?.cause?.originalCode === "55P03") return true
  return /could not obtain lock on relation/i.test(error.message)
}

describe("ataque (CHORE-02 r1): LOCK TABLE … NOWAIT con reintento no forma cola", () => {
  it("con una fila retenida, el reintento nunca aparece formado ni frena lecturas; obtenido, bloquea a quien lea usuarios", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const db = obtenerDb()
    let retenida = true
    let enCola = 0
    let muestras = 0
    let lecturaMasLenta = 0

    // Sondeo de pg_locks y lecturas de usuarios desde otras conexiones mientras dura el caso.
    const sondeo = (async () => {
      while (retenida) {
        const [fila] = await db.$queryRaw<{ n: number }[]>`
          SELECT count(*)::int AS n FROM pg_locks
          WHERE relation = 'usuarios'::regclass AND mode = 'AccessExclusiveLock' AND NOT granted`
        enCola = Math.max(enCola, fila?.n ?? 0)
        muestras += 1
        const inicio = Date.now()
        await db.usuario.findUnique({ where: { id: usuario.id }, select: { id: true } })
        lecturaMasLenta = Math.max(lecturaMasLenta, Date.now() - inicio)
        await esperar(10)
      }
    })()

    let fallidosDuranteLaRetencion = 0
    const retencion = db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${usuario.id}::uuid FOR UPDATE`
        const hasta = Date.now() + 1_200
        while (Date.now() < hasta) {
          try {
            await db.$transaction(
              async (tx2) => {
                await tx2.$executeRaw`LOCK TABLE usuarios IN ACCESS EXCLUSIVE MODE NOWAIT`
              },
              { timeout: 5_000, maxWait: 5_000 },
            )
            throw new Error("el LOCK TABLE NOWAIT se concedió con una fila de usuarios retenida")
          } catch (error) {
            if (!esBloqueoNoDisponible(error)) throw error
            fallidosDuranteLaRetencion += 1
          }
          await esperar(20 + Math.floor(Math.random() * 31))
        }
      },
      { timeout: 15_000, maxWait: 5_000 },
    )
    await retencion
    retenida = false
    await sondeo

    // Ya sin la retención: obtener el bloqueo (presupuesto de 30 s) y, dentro, leer usuarios desde
    // otra conexión con una carrera de 300 ms.
    const inicio = Date.now()
    let intentos = 0
    let carrera: "leyó" | "tiempo" | "sin bloqueo" = "sin bloqueo"
    let lectura: Promise<unknown> | undefined
    while (carrera === "sin bloqueo" && Date.now() - inicio < 30_000) {
      intentos += 1
      try {
        carrera = await db.$transaction(
          async (tx) => {
            await tx.$executeRaw`LOCK TABLE usuarios IN ACCESS EXCLUSIVE MODE NOWAIT`
            lectura = db.usuario.findUnique({ where: { id: usuario.id }, select: { id: true } })
            return Promise.race([
              lectura.then(() => "leyó" as const),
              esperar(300).then(() => "tiempo" as const),
            ])
          },
          { timeout: 5_000, maxWait: 5_000 },
        )
      } catch (error) {
        if (!esBloqueoNoDisponible(error)) throw error
        await esperar(20 + Math.floor(Math.random() * 31))
      }
    }
    await lectura

    expect({
      muestrasSuficientes: muestras > 10,
      fallidosDuranteLaRetencion: fallidosDuranteLaRetencion > 0,
      enCola,
      lecturaRapida: lecturaMasLenta < 1_000,
      carrera,
    }).toEqual({
      muestrasSuficientes: true,
      fallidosDuranteLaRetencion: true,
      enCola: 0,
      lecturaRapida: true,
      carrera: "tiempo",
    })
    expect(intentos, "intentos para obtener el bloqueo").toBeGreaterThan(0)
  }, 45_000)
})
