import { randomBytes } from "node:crypto"

import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { generarTokenDeEnlace } from "../src/adapters/auth/index.js"
import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { borrarUsuariosDePrueba, correoDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"

// Ataque del Tester (AUTH-03b, ronda 2): el caso determinista que pide el arbitraje de T-07
// (revision.md, "Arbitraje de T-07 y T-10"; plan, Enmienda 6). Una transacción de la prueba retiene
// la fila del enlace; la revocación queda formada detrás (pg_blocking_pids); llegan N registros
// nuevos y quedan formados también; se suelta la fila. La revocación debe responder antes que
// cualquiera de los N, los N deben responder 400 y ningún creado_en puede ser posterior al
// revocado_en. Sin 5xx; los P2028 se revisan en la salida completa de la suite (PA-07).
//
// Dos variantes de la retención:
// - FOR NO KEY UPDATE: el modo que toma ahora un registro en curso (Enmienda 6).
// - FOR SHARE: un titular compatible con los lectores. Distingue la cola justa: con el registro en
//   FOR SHARE (el diseño anterior), los N se habrían concedido sin formarse detrás de la
//   revocación y habrían creado sus cuentas; con FOR NO KEY UPDATE chocan con el titular y se
//   forman detrás de la revocación.
//
// N = 5: el pool de pg (10 conexiones por defecto) debe alcanzar para la retención, la revocación,
// los N registros y el sondeo de pg_blocking_pids, que corren a la vez en este proceso.

const N = 5

let app: FastifyInstance | undefined
const ids: string[] = []
const enlaces: string[] = []
const env = cargarEnv()
let tokenAdmin = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env })
  await app.ready()
  const admin = await obtenerDb().usuario.findFirst({
    where: { rol: "admin" },
    select: { id: true },
  })
  if (!admin) throw new Error("Precondición: falta el admin único de la base desechable")
  tokenAdmin = await firmarTokenDePrueba({ usuarioId: admin.id })
})

afterAll(async () => {
  await obtenerDb().usuario.deleteMany({ where: { enlaceRegistroId: { in: enlaces } } })
  await borrarUsuariosDePrueba(ids)
  await obtenerDb().enlaceRegistro.deleteMany({ where: { id: { in: enlaces } } })
  await app?.close()
})

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

const crearEnlace = async (): Promise<{ id: string; token: string }> => {
  const { token, hash } = generarTokenDeEnlace()
  const { id } = await obtenerDb().enlaceRegistro.create({
    data: { hashToken: hash, expiraEn: new Date(Date.now() + 7 * 86_400_000) },
    select: { id: true },
  })
  enlaces.push(id)
  return { id, token }
}

// Procesos formados, directa o indirectamente, detrás del pid dado.
const bloqueadosPor = async (pid: number): Promise<number> => {
  const [fila] = await obtenerDb().$queryRaw<{ n: number }[]>`
    WITH RECURSIVE bloqueados(pid) AS (
      SELECT pid FROM pg_stat_activity WHERE ${pid}::int = ANY(pg_blocking_pids(pid))
      UNION
      SELECT a.pid FROM pg_stat_activity a
      JOIN bloqueados b ON b.pid = ANY(pg_blocking_pids(a.pid))
    )
    SELECT count(*)::int AS n FROM bloqueados`
  return fila?.n ?? 0
}

interface Resultado {
  nombre: string
  respuesta: LightMyRequestResponse
  orden: number
}

describe("ataque (AUTH-03b r2): T-07 determinista, la revocación formada antes que N registros", () => {
  it.each(["FOR NO KEY UPDATE", "FOR SHARE"] as const)(
    "fila retenida con %s: la revocación responde primero, los %s registros responden 400 y ningún creado_en es posterior al revocado_en",
    async (modo) => {
      const enlace = await crearEnlace()
      const correos = Array.from({ length: N }, () => correoDePrueba("ataque-03b-r2"))
      let siguienteOrden = 0
      const lanzadas: Promise<Resultado>[] = []
      const lanzar = (nombre: string, peticion: Promise<LightMyRequestResponse>) => {
        const conOrden = peticion.then((respuesta) => {
          siguienteOrden += 1
          return { nombre, respuesta, orden: siguienteOrden }
        })
        lanzadas.push(conOrden)
        return conOrden
      }

      await obtenerDb().$transaction(
        async (tx) => {
          if (modo === "FOR NO KEY UPDATE") {
            await tx.$queryRaw`SELECT id FROM enlaces_registro WHERE id = ${enlace.id}::uuid FOR NO KEY UPDATE`
          } else {
            await tx.$queryRaw`SELECT id FROM enlaces_registro WHERE id = ${enlace.id}::uuid FOR SHARE`
          }
          const [propio] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
          if (!propio) throw new Error("Precondición: sin pid de la transacción retenedora")

          // Espera a que la petición quede formada detrás de la fila (una más que las ya formadas)
          // o a que termine. Un registro que termina sin formarse (lo que pasaría si pudiera
          // adelantarse a la revocación) no hace fallar la precondición: llega a las aserciones,
          // que son las que deciden.
          let formadas = 0
          const formarse = async (lanzada: Promise<Resultado>, etiqueta: string) => {
            let terminada = false
            lanzada.then(
              () => (terminada = true),
              () => (terminada = true),
            )
            const limite = Date.now() + 10_000
            while (
              !terminada &&
              (await bloqueadosPor(propio.pid)) < formadas + 1 &&
              Date.now() < limite
            ) {
              await esperar(20)
            }
            const formada = !terminada && (await bloqueadosPor(propio.pid)) >= formadas + 1
            expect(
              formada || terminada,
              `Precondición: ${etiqueta} ni quedó formado detrás de la fila ni terminó`,
            ).toBe(true)
            if (formada) formadas += 1
          }

          await formarse(
            lanzar(
              "revocación",
              obtenerApp().inject({
                method: "POST",
                url: `/api/admin/enlaces-registro/${enlace.id}/revocar`,
                headers: { authorization: `Bearer ${tokenAdmin}` },
              }),
            ),
            "la revocación",
          )
          expect(formadas, "Precondición: la revocación no quedó formada").toBe(1)

          for (const [indice, email] of correos.entries()) {
            const lanzada = lanzar(
              `registro ${indice + 1}`,
              obtenerApp().inject({
                method: "POST",
                url: "/api/auth/registro-maestro",
                payload: {
                  nombre: "Maestra Formada",
                  email,
                  contrasena: `clave-${randomBytes(6).toString("hex")}`,
                  token: enlace.token,
                },
              }),
            )
            await formarse(lanzada, `el registro ${indice + 1}`)
          }
          await esperar(100)
        },
        { timeout: 30_000, maxWait: 5_000 },
      )

      const resultados = await Promise.all(lanzadas)
      const creados = await obtenerDb().usuario.findMany({
        where: { OR: [{ enlaceRegistroId: enlace.id }, { email: { in: correos } }] },
        select: { id: true, creadoEn: true },
      })
      ids.push(...creados.map((u) => u.id))
      const fila = await obtenerDb().enlaceRegistro.findUnique({
        where: { id: enlace.id },
        select: { revocadoEn: true },
      })

      const resumen = resultados
        .map((r) => `${r.orden}:${r.nombre}=${r.respuesta.statusCode}`)
        .join(", ")
      expect(
        resultados.every((r) => r.respuesta.statusCode < 500),
        resumen,
      ).toBe(true)
      const revocacion = resultados.find((r) => r.nombre === "revocación")
      expect(revocacion?.respuesta.statusCode, resumen).toBe(200)
      expect(revocacion?.orden, `la revocación no respondió primero: ${resumen}`).toBe(1)
      const registros = resultados.filter((r) => r.nombre !== "revocación")
      expect(registros).toHaveLength(N)
      for (const registro of registros) {
        expect(registro.respuesta.statusCode, `${registro.nombre}: ${resumen}`).toBe(400)
        expect(registro.respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe(
          "ENLACE_INVALIDO",
        )
      }
      expect(fila?.revocadoEn, "el enlace no quedó revocado").toBeInstanceOf(Date)
      const revocadoEn = fila?.revocadoEn?.getTime() ?? Number.NEGATIVE_INFINITY
      const posteriores = creados.filter((u) => u.creadoEn.getTime() > revocadoEn)
      expect(posteriores, "cuentas registradas después de la revocación").toEqual([])
      expect(creados, "ningún registro formado detrás de la revocación crea su cuenta").toEqual([])
    },
    60_000,
  )
})

describe("ataque (AUTH-03b r2): los registros del mismo enlace ahora van en serie (Enmienda 6)", () => {
  // El plan afirma que la serie tiene tiempo acotado y no arriesga P2028: la transacción solo hace
  // dos INSERT. Pero cada registro formado detrás de la fila ocupa una conexión del pool mientras
  // espera. 40 registros simultáneos con el mismo enlace (el cuádruple del pool de pg por defecto)
  // deben terminar todos en 201, sin 5xx, con 40 cuentas.
  it("40 registros simultáneos con el mismo enlace: 40 × 201, 40 cuentas y ningún 5xx", async () => {
    const enlace = await crearEnlace()
    const correos = Array.from({ length: 40 }, () => correoDePrueba("ataque-03b-r2-serie"))
    const inicio = Date.now()
    const respuestas = await Promise.all(
      correos.map((email) =>
        obtenerApp().inject({
          method: "POST",
          url: "/api/auth/registro-maestro",
          payload: {
            nombre: "Maestra En Serie",
            email,
            contrasena: `clave-${randomBytes(6).toString("hex")}`,
            token: enlace.token,
          },
        }),
      ),
    )
    const duracion = Date.now() - inicio
    const creados = await obtenerDb().usuario.findMany({
      where: { enlaceRegistroId: enlace.id },
      select: { id: true },
    })
    ids.push(...creados.map((u) => u.id))
    const estados = respuestas.map((r) => r.statusCode)
    const conteo = estados.reduce<Record<number, number>>((acc, e) => {
      acc[e] = (acc[e] ?? 0) + 1
      return acc
    }, {})
    const codigos = respuestas
      .filter((r) => r.statusCode !== 201)
      .map((r) => r.json<{ error?: { codigo?: string } }>().error?.codigo)
    expect(conteo, `estados en ${duracion} ms; códigos: ${codigos.join(",")}`).toEqual({ 201: 40 })
    expect(creados).toHaveLength(40)
  }, 120_000)
})
