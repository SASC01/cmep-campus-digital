import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { construirApp } from "../src/app.js"
import { obtenerDb } from "../src/adapters/db/cliente.js"
import { cargarEnv } from "../src/config/env.js"
import { correoDePrueba, crearUsuarioDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import { crearTokenDePrueba } from "./ayudas-cuentas.js"

// Ataques del Tester (AUTH-03c, ronda 2) contra la corrección de T-13 y contra el lote bajo carga:
// - una ráfaga sostenida de lotes simultáneos, que se forman en el mismo bloqueo consultivo que usa
//   el caso "dos lotes lanzados a la vez…" de invitacion-masiva.integracion cuando los dos archivos
//   corren en paralelo;
// - borrados en cascada de invitaciones (lo que hace el afterAll de cualquier archivo) en medio de
//   una carrera con poco cupo.
// Deterministas con la base compartida: la ráfaga usa un límite de 10,000 y la carrera solo afirma
// lo que no depende de cuántas invitaciones haya en la ventana (todo o nada, nunca un 5xx).

const env = cargarEnv()
const ids: string[] = []
const correos: string[] = []
let appAmplia: FastifyInstance
let tokenAdmin = ""

const appConLimite = async (limite: number): Promise<FastifyInstance> => {
  const otra = await construirApp({ env: { ...env, INVITACIONES_LIMITE_DIARIO: limite } })
  await otra.ready()
  return otra
}

const nuevoCorreo = (prefijo: string): string => {
  const correo = correoDePrueba(`ataque-03c-r2-${prefijo}`)
  correos.push(correo)
  return correo
}

const enviarLote = (destino: FastifyInstance, lista: string) =>
  destino.inject({
    method: "POST",
    url: "/api/admin/maestros/lote",
    headers: { authorization: `Bearer ${tokenAdmin}` },
    payload: { lista },
  })

const contarCuentas = (emails: string[]) =>
  obtenerDb().usuario.count({ where: { email: { in: emails } } })

beforeAll(async () => {
  // Solo se cierra appAmplia (en afterAll): su onClose detiene la cola y el cliente compartidos.
  // Las demás apps nunca se cierran (mismo patrón que invitacion-masiva.integracion).
  appAmplia = await appConLimite(10_000)
  const admin = await obtenerDb().usuario.findFirst({
    where: { rol: "admin" },
    select: { id: true },
  })
  if (!admin) throw new Error("Precondición: la base desechable debe tener el admin de seed:admin")
  tokenAdmin = await firmarTokenDePrueba({ usuarioId: admin.id })
}, 30_000)

afterAll(async () => {
  await obtenerDb().usuario.deleteMany({ where: { email: { in: correos } } })
  await obtenerDb().usuario.deleteMany({ where: { id: { in: ids } } })
  await appAmplia.close()
})

describe("ataque (AUTH-03c r2): lotes bajo carga y borrados en cascada", () => {
  it("ráfaga de 8 rondas de 4 lotes simultáneos de 8 correos (256 cuentas): siempre 200, nunca un 5xx, y cada correo creado una sola vez con un token", async () => {
    const todos: string[] = []
    const estados: number[] = []
    for (let ronda = 0; ronda < 8; ronda += 1) {
      const lotes = Array.from({ length: 4 }, (_, l) =>
        Array.from({ length: 8 }, (_, i) =>
          nuevoCorreo(`rafaga-${String(ronda)}-${String(l)}-${String(i)}`),
        ),
      )
      todos.push(...lotes.flat())
      const respuestas = await Promise.all(
        lotes.map((lote) => enviarLote(appAmplia, lote.join("\n"))),
      )
      estados.push(...respuestas.map((r) => r.statusCode))
    }
    expect(
      estados.filter((e) => e !== 200),
      JSON.stringify(estados),
    ).toEqual([])
    const cuentas = await obtenerDb().usuario.findMany({
      where: { email: { in: todos } },
      select: { id: true },
    })
    expect(cuentas).toHaveLength(256)
    const tokens = await obtenerDb().tokenCuenta.count({
      where: { usuarioId: { in: cuentas.map((c) => c.id) }, tipo: "invitacion" },
    })
    expect(tokens).toBe(256)
  }, 60_000)

  it("borrados en cascada de 30 invitaciones en medio de cuatro lotes con poco cupo: cada lote es todo o nada, nunca un 5xx", async () => {
    // 30 invitaciones propias que se borran (con sus tokens, en cascada) mientras corre la carrera:
    // el conteo del cupo baja a mitad de camino, como cuando otro archivo hace su afterAll.
    const aBorrar: string[] = []
    for (let n = 0; n < 30; n += 1) {
      const maestro = await crearUsuarioDePrueba(aBorrar, { rol: "maestro" })
      await crearTokenDePrueba({
        usuarioId: maestro.id,
        tipo: "invitacion",
        expiraEn: new Date(Date.now() + 3_600_000),
      })
    }
    const usadas = await obtenerDb().tokenCuenta.count({
      where: { tipo: "invitacion", creadoEn: { gte: new Date(Date.now() - 24 * 3_600_000) } },
    })
    const appPoco = await appConLimite(usadas + 3)
    const lotes = Array.from({ length: 4 }, (_, l) =>
      Array.from({ length: 3 }, (_, i) => nuevoCorreo(`cascada-${String(l)}-${String(i)}`)),
    )
    const [respuestas] = await Promise.all([
      Promise.all(lotes.map((lote) => enviarLote(appPoco, lote.join("\n")))),
      obtenerDb().usuario.deleteMany({ where: { id: { in: aBorrar } } }),
    ])
    const estados = respuestas.map((r) => r.statusCode)
    expect(
      estados.every((e) => e === 200 || e === 409),
      JSON.stringify(estados),
    ).toBe(true)
    for (const [indice, lote] of lotes.entries()) {
      expect(await contarCuentas(lote), `lote ${String(indice)} (${String(estados[indice])})`).toBe(
        estados[indice] === 200 ? 3 : 0,
      )
    }
    ids.push(...aBorrar)
  }, 60_000)
})
