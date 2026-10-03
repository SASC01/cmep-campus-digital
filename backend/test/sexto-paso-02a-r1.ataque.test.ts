import { randomUUID } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import type { Rol } from "@campus/shared"
import Fastify, { type FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { protegido, registrarMiddleware } from "../src/middleware/index.js"
import { borrarUsuariosDePrueba, crearUsuarioDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import {
  borrarClasesDePrueba,
  crearClaseDePrueba,
  idDelAdminDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"

// Ataque del Tester (CLASES-02a, ronda 1): punto 1 (el admin y el sexto paso con `roles` raros que
// los tipos no permiten pero JavaScript sí: undefined explícito, otra capitalización, con espacios,
// vacío, congelado), punto 2 (la guarda sin excepción para /api/admin/clases/:claseId…) y punto 5
// (la sentencia de datos de la migración sobre casos raros, en tablas temporales que se revierten).

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

// Los tipos impiden estos valores; una llamada sin tipos (o un `as`) los pasaría igual.
const VARIANTES: [string, unknown][] = [
  ["undefined explícito", undefined],
  ["vacío", []],
  ["Admin", ["Admin"]],
  ["ADMIN y maestro", ["ADMIN", "maestro"]],
  ["admin con espacio", [" admin"]],
  ["admin con nulo", ["admin\u0000"]],
]

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  const ok = async () => ({ ok: true })
  for (const [i, [, roles]] of VARIANTES.entries()) {
    for (const pertenencia of ["inscripcion", "propiedad"] as const) {
      app.get(
        `/prueba/r1-02a/v${i}-${pertenencia}/:claseId`,
        protegido({ roles: roles as readonly Rol[], pertenencia }),
        ok,
      )
    }
  }
  app.get(
    "/prueba/r1-02a/congelado/:claseId",
    protegido({ roles: Object.freeze(["admin"] as Rol[]), pertenencia: "propiedad" }),
    ok,
  )
  await app.ready()
})

afterAll(async () => {
  await borrarClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe('ataque CLASES-02a r1: el admin nunca pasa el sexto paso si `roles` no nombra exactamente a "admin" (punto 1)', () => {
  it('con roles undefined explícito, vacío, "Admin", "ADMIN", " admin" o "admin\\u0000": el admin recibe 403 (ROL_NO_PERMITIDO o SIN_ACCESO_A_LA_CLASE) en las dos exigencias; con un arreglo congelado con "admin", 200', async () => {
    const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
    const estudiante = await crearUsuarioDePrueba(idsUsuarios)
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, estudiante.id)
    const tokenAdmin = await firmarTokenDePrueba({ usuarioId: await idDelAdminDePrueba() })
    const tokenMaestro = await firmarTokenDePrueba({ usuarioId: maestro.id })

    const pedir = async (ruta: string, token: string) => {
      const r = await obtenerApp().inject({
        method: "GET",
        url: `/prueba/r1-02a/${ruta}/${clase.id}`,
        headers: { authorization: `Bearer ${token}` },
      })
      const codigo =
        r.body === "" ? "" : (r.json<{ error?: { codigo?: string } }>().error?.codigo ?? "")
      return `${r.statusCode} ${codigo}`.trim()
    }

    const fallas: string[] = []
    for (const [i, [nombre]] of VARIANTES.entries()) {
      for (const pertenencia of ["inscripcion", "propiedad"]) {
        const delAdmin = await pedir(`v${i}-${pertenencia}`, tokenAdmin)
        if (!["403 ROL_NO_PERMITIDO", "403 SIN_ACCESO_A_LA_CLASE"].includes(delAdmin))
          fallas.push(`${nombre} ${pertenencia}: admin ${delAdmin}`)
      }
    }
    // Control: donde roles queda vacío (cualquiera pasa el paso 5), el maestro de la clase sí pasa.
    expect(await pedir("v0-propiedad", tokenMaestro)).toBe("200")
    expect(await pedir("v1-propiedad", tokenMaestro)).toBe("200")
    expect(await pedir("congelado", tokenAdmin)).toBe("200")
    expect(fallas).toEqual([])
  })
})

const arrancaCon = async (
  prefijo: string,
  url: string,
  opciones: Parameters<typeof protegido>[0],
) => {
  const suelta = Fastify({ logger: false })
  registrarMiddleware(suelta)
  try {
    await suelta.register(
      async (hijo) => {
        hijo.get(url, protegido(opciones), async () => ({ ok: true }))
      },
      { prefix: prefijo },
    )
    await suelta.ready()
    return { arranco: true, error: "" }
  } catch (error) {
    return { arranco: false, error: String(error) }
  } finally {
    await suelta.close().catch(() => undefined)
  }
}

describe("ataque CLASES-02a r1: la guarda no tiene excepción para /api/admin/clases (punto 2)", () => {
  it("/api/admin/clases/:claseId/… sin sexto paso no arranca (con roles de admin); con el sexto paso sí; un parámetro en los dos primeros segmentos sigue rechazado", async () => {
    const sinSexto = await arrancaCon("/api", "/admin/clases/:claseId/extra", { roles: ["admin"] })
    expect(sinSexto.arranco, "una ruta del admin con :claseId arrancó sin sexto paso").toBe(false)
    expect(sinSexto.error).toContain("no pasa por requireMembership ni requireOwnership")
    const enPrefijo = await arrancaCon("/api/admin/clases/:claseId", "/extra", { roles: ["admin"] })
    expect(enPrefijo.arranco, ":claseId en el prefijo del plugin arrancó sin sexto paso").toBe(
      false,
    )
    const conSexto = await arrancaCon("/api", "/admin/clases/:claseId/extra", {
      roles: ["admin"],
      pertenencia: "propiedad",
    })
    expect(conSexto).toEqual({ arranco: true, error: "" })
    // Un parámetro en el primero o el segundo segmento sigue rechazado. (/api/admin/:x/… lleva el
    // parámetro en el tercero: la regla de CHORE-02 no lo cubre; ver la observación del reporte.)
    for (const [prefijo, url] of [
      ["", "/:api/admin/clases/:claseId"],
      ["/api", "/:admin/clases/:claseId"],
      ["/api", "/*"],
    ] as const) {
      const r = await arrancaCon(prefijo, url, { roles: ["admin"], pertenencia: "propiedad" })
      expect(r.arranco, `${prefijo}${url} arrancó`).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------------------------
// Punto 5: la sentencia de datos de la migración, tal cual del migration.sql, sobre casos raros.
// Mismo aislamiento que PR-2A07: tablas temporales sin FK que sombrean a las de public dentro de una
// transacción que se revierte.
// ---------------------------------------------------------------------------------------------
const sentenciaDeDatos = (): string => {
  const carpeta = new URL("../prisma/migrations/", import.meta.url)
  const carpetas = readdirSync(fileURLToPath(carpeta)).filter((nombre) =>
    nombre.endsWith("_clases_administradas"),
  )
  expect(carpetas, "Precondición: hay una sola migración clases_administradas").toHaveLength(1)
  const sql = readFileSync(
    fileURLToPath(new URL(`${carpetas[0] ?? ""}/migration.sql`, carpeta)),
    "utf8",
  )
  const inicio = sql.indexOf("-- CLASES-02 · datos")
  expect(inicio, "Precondición: la migración trae el bloque de datos").toBeGreaterThanOrEqual(0)
  return sql.slice(inicio)
}

interface Fila {
  clase_id: string
  maestro_id: string
  creado_en: Date
}

describe("ataque CLASES-02a r1: datos de la migración en casos raros (punto 5)", () => {
  it("una clase cuyo maestro_id ya tiene fila con otra fecha la conserva; una con dos maestros no gana un tercero; las demás reciben la de la clase; repetirla no cambia nada; el orden de impartidas queda igual que el de las clases", async () => {
    const sentencia = sentenciaDeDatos()
    const maestro = randomUUID()
    const otro = randomUUID()
    const clases = [0, 1, 2, 3].map((i) => ({
      id: randomUUID(),
      creadoEn: new Date(Date.UTC(2021, 5, 1 + i, 8, 0, 0, 0)),
    }))
    const [conFila, conDos, mismaFecha, sola] = clases
    if (!conFila || !conDos || !mismaFecha || !sola) throw new Error("Precondición")
    const REVERTIR = new Error("revertir")
    let primera: Fila[] = []
    let segunda: Fila[] = []
    let ordenAsignacion: string[] = []
    let ordenClases: string[] = []

    await obtenerDb()
      .$transaction(async (tx) => {
        await tx.$executeRaw`CREATE TEMP TABLE clases (
          id uuid PRIMARY KEY, maestro_id uuid NOT NULL, creado_en timestamptz(3) NOT NULL
        ) ON COMMIT DROP`
        await tx.$executeRaw`CREATE TEMP TABLE maestros_de_clase (
          clase_id uuid, maestro_id uuid, creado_en timestamptz(3) NOT NULL,
          PRIMARY KEY (clase_id, maestro_id)
        ) ON COMMIT DROP`
        const [resueltas] = await tx.$queryRaw<{ ok: boolean }[]>`
          SELECT to_regclass('clases') = to_regclass('pg_temp.clases')
             AND to_regclass('maestros_de_clase') = to_regclass('pg_temp.maestros_de_clase') AS ok`
        if (resueltas?.ok !== true)
          throw new Error("Precondición: las tablas sin esquema no resuelven a las temporales")

        for (const clase of clases) {
          await tx.$executeRaw`INSERT INTO clases (id, maestro_id, creado_en)
            VALUES (${clase.id}::uuid, ${maestro}::uuid, ${clase.creadoEn})`
        }
        // conFila: su maestro ya tiene fila, con otra fecha (asignado después de crearse).
        await tx.$executeRaw`INSERT INTO maestros_de_clase VALUES
          (${conFila.id}::uuid, ${maestro}::uuid, ${new Date(Date.UTC(2022, 0, 1))})`
        // conDos: sus dos maestros ya están (maestro_id es uno de ellos).
        await tx.$executeRaw`INSERT INTO maestros_de_clase VALUES
          (${conDos.id}::uuid, ${maestro}::uuid, ${conDos.creadoEn}),
          (${conDos.id}::uuid, ${otro}::uuid, ${conDos.creadoEn})`
        const leer = () =>
          tx.$queryRaw<Fila[]>`SELECT clase_id::text AS clase_id, maestro_id::text AS maestro_id,
            creado_en FROM maestros_de_clase ORDER BY clase_id, maestro_id`
        await tx.$executeRawUnsafe(sentencia)
        primera = await leer()
        await tx.$executeRawUnsafe(sentencia)
        segunda = await leer()
        ordenAsignacion = (
          await tx.$queryRaw<{ id: string }[]>`SELECT clase_id::text AS id FROM maestros_de_clase
            WHERE maestro_id = ${maestro}::uuid AND clase_id <> ${conFila.id}::uuid
            ORDER BY creado_en DESC, clase_id DESC`
        ).map((f) => f.id)
        ordenClases = (
          await tx.$queryRaw<{ id: string }[]>`SELECT id::text AS id FROM clases
            WHERE id <> ${conFila.id}::uuid ORDER BY creado_en DESC, id DESC`
        ).map((f) => f.id)
        throw REVERTIR
      })
      .catch((error: unknown) => {
        if (error !== REVERTIR) throw error
      })

    const esperadas: Fila[] = [
      { clase_id: conFila.id, maestro_id: maestro, creado_en: new Date(Date.UTC(2022, 0, 1)) },
      { clase_id: conDos.id, maestro_id: maestro, creado_en: conDos.creadoEn },
      { clase_id: conDos.id, maestro_id: otro, creado_en: conDos.creadoEn },
      { clase_id: mismaFecha.id, maestro_id: maestro, creado_en: mismaFecha.creadoEn },
      { clase_id: sola.id, maestro_id: maestro, creado_en: sola.creadoEn },
    ].sort((a, b) => {
      const ka = `${a.clase_id} ${a.maestro_id}`
      const kb = `${b.clase_id} ${b.maestro_id}`
      if (ka === kb) return 0
      return ka < kb ? -1 : 1
    })
    expect(primera).toEqual(esperadas)
    expect(segunda).toEqual(esperadas)
    expect(ordenAsignacion).toEqual(ordenClases)
    const porClase = new Map<string, number>()
    for (const fila of primera) porClase.set(fila.clase_id, (porClase.get(fila.clase_id) ?? 0) + 1)
    expect(Math.max(...porClase.values())).toBeLessThanOrEqual(2)
    expect(
      await obtenerDb().maestroDeClase.count({
        where: { claseId: { in: clases.map((c) => c.id) } },
      }),
    ).toBe(0)
  })
})
