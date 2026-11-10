import { randomUUID } from "node:crypto"

import {
  errorApiSchema,
  listaMovimientosRespuestaSchema,
  resumenAdminRespuestaSchema,
  type MovimientoInscripcion,
} from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { enTransaccion, obtenerDb } from "../src/adapters/db/cliente.js"
import { leerResumenAdmin } from "../src/adapters/db/index.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import { clavesDe } from "./ayudas-clases-archivadas.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearClaseDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { crearCuentaDeGestion, pedirConToken } from "./ayudas-usuarios-admin.js"

// ADMIN-01e (§D-7.6, §D-7.7). Resumen y movimientos con la regla E8-4: el resumen, contra sus
// conteos en la misma instantánea y con cambios exactos dentro de una transacción que se deshace;
// por HTTP, solo la forma y cotas por filas propias. Los movimientos se buscan por id recorriendo
// páginas, sin suponer que son las primeras filas de la lista global.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
let tokenAdmin = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const error = (respuesta: LightMyRequestResponse) => errorApiSchema.parse(respuesta.json()).error

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
  tokenAdmin = await tokenDelAdminDePrueba()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

class Deshacer extends Error {}

describe("resumen del admin (ADM-1E10)", () => {
  it("ADM-1E10: las tres cifras son las de sus conteos en la misma instantánea, y cambian exactamente al crear un alumno, dar de baja a un maestro y archivar una clase (transacción que se deshace)", async () => {
    const maestro = await crearCuentaDeGestion(idsUsuarios, {
      nombre: "Resumen Maestro",
      rol: "maestro",
    })
    const otro = await crearCuentaDeGestion(idsUsuarios, { nombre: "Resumen Otro", rol: "maestro" })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: otro.id })
    let comprobado = false

    const centinela = new Deshacer("deshacer la transacción del caso")
    const resultado = await enTransaccion(
      obtenerDb(),
      async (tx) => {
        const antes = await leerResumenAdmin(tx)
        expect(antes).toEqual({
          alumnos: await tx.usuario.count({ where: { rol: "estudiante", activo: true } }),
          maestros: await tx.usuario.count({ where: { rol: "maestro", activo: true } }),
          clasesActivas: await tx.clase.count({ where: { archivadaEn: null } }),
        })
        await tx.usuario.create({
          data: {
            email: `resumen-${randomUUID()}@pruebas.local`,
            hashContrasena: "x",
            nombre: "Resumen Alumno",
            nombreBusqueda: "resumen alumno",
            rol: "estudiante",
          },
          select: { id: true },
        })
        await tx.usuario.update({ where: { id: maestro.id }, data: { activo: false } })
        await tx.clase.update({
          where: { id: clase.id },
          data: { activa: false, archivadaEn: new Date() },
        })
        const despues = await leerResumenAdmin(tx)
        expect(despues).toEqual({
          alumnos: antes.alumnos + 1,
          maestros: antes.maestros - 1,
          clasesActivas: antes.clasesActivas - 1,
        })
        comprobado = true
        throw centinela
      },
      { instantaneaUnica: true, timeout: 10_000 },
    ).catch((motivo: unknown) => motivo)
    expect(resultado).toBe(centinela)
    expect(comprobado).toBe(true)
    expect((await obtenerDb().usuario.findUnique({ where: { id: maestro.id } }))?.activo).toBe(true)
  })

  it("ADM-1E10: por HTTP, la forma de la respuesta y alumnos ≥ 1 tras crear un alumno activo", async () => {
    await crearCuentaDeGestion(idsUsuarios, { nombre: "Resumen Http" })
    const respuesta = await pedirConToken(obtenerApp(), tokenAdmin, {
      method: "GET",
      url: "/api/admin/resumen",
    })
    expect(respuesta.statusCode).toBe(200)
    const resumen = resumenAdminRespuestaSchema.parse(respuesta.json())
    expect(Object.keys(respuesta.json() as object).sort()).toEqual([
      "alumnos",
      "clasesActivas",
      "maestros",
    ])
    expect(resumen.alumnos).toBeGreaterThanOrEqual(1)
    expect(resumen.maestros).toBeGreaterThanOrEqual(0)
  })
})

describe("movimientos de inscripción (ADM-1E11)", () => {
  const pedirPagina = (consulta: string) =>
    pedirConToken(obtenerApp(), tokenAdmin, {
      method: "GET",
      url: `/api/admin/movimientos-inscripcion?${consulta}`,
    })

  it("ADM-1E11: orden por secuencia descendente dentro y entre páginas, sin ids repetidos; los movimientos del caso en su orden relativo; el actor admin firmado «Administración»; sin estado de pago; claseId y alumnoId en la consulta se ignoran", async () => {
    const maestro = await crearCuentaDeGestion(idsUsuarios, {
      nombre: "Movimientos Maestra",
      rol: "maestro",
    })
    const alumna = await crearCuentaDeGestion(idsUsuarios, {
      nombre: "Movimientos Alumna",
      estadoPago: "deudor",
    })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const tokenMaestro = await firmarTokenDePrueba({ usuarioId: maestro.id })

    const alta = await pedirConToken(obtenerApp(), tokenMaestro, {
      method: "POST",
      url: `/api/clases/${clase.id}/alumnos`,
      payload: { alumnoId: alumna.id },
    })
    expect(alta.statusCode, alta.body).toBeLessThan(300)
    const baja = await pedirConToken(obtenerApp(), tokenAdmin, {
      method: "DELETE",
      url: `/api/clases/${clase.id}/alumnos/${alumna.id}`,
    })
    expect(baja.statusCode, baja.body).toBeLessThan(300)
    const propios = await obtenerDb().movimientoInscripcion.findMany({
      where: { claseId: clase.id },
      orderBy: { secuencia: "desc" },
      select: { id: true },
    })
    expect(propios, "Precondición: el alta y la baja dejaron sus dos movimientos").toHaveLength(2)

    const vistos: MovimientoInscripcion[] = []
    let consulta = `limite=50&claseId=${randomUUID()}&alumnoId=${randomUUID()}`
    const faltan = (): boolean => propios.some((p) => !vistos.some((v) => v.id === p.id))
    for (let vuelta = 0; vuelta < 40 && faltan(); vuelta += 1) {
      const respuesta = await pedirPagina(consulta)
      expect(respuesta.statusCode, respuesta.body).toBe(200)
      const pagina = listaMovimientosRespuestaSchema.parse(respuesta.json())
      for (const prohibida of ["estadoPago", "accesoRestringido", "hashContrasena", "rol"]) {
        expect(clavesDe(respuesta.json())).not.toContain(prohibida)
      }
      expect(respuesta.body).not.toContain("deudor")
      vistos.push(...pagina.movimientos)
      if (pagina.siguienteCursor === null) break
      consulta = `limite=50&cursor=${pagina.siguienteCursor}`
    }
    expect(faltan(), "No se encontraron los movimientos del caso en 40 páginas").toBe(false)

    const secuencias = vistos.map((v) => BigInt(v.secuencia))
    for (let i = 1; i < secuencias.length; i += 1) {
      expect((secuencias[i] ?? 0n) < (secuencias[i - 1] ?? 0n)).toBe(true)
    }
    expect(new Set(vistos.map((v) => v.id)).size).toBe(vistos.length)

    const delCaso = vistos.filter((v) => propios.some((p) => p.id === v.id))
    expect(delCaso.map((v) => v.id)).toEqual(propios.map((p) => p.id))
    const [laBaja, elAlta] = delCaso
    expect(laBaja).toMatchObject({
      tipo: "baja",
      clase: { id: clase.id, nombre: "Clase de prueba" },
      alumno: { id: alumna.id, nombre: alumna.nombre, email: alumna.email },
      actor: { nombre: "Administración", administracion: true },
    })
    expect(elAlta).toMatchObject({
      tipo: "alta",
      actor: { id: maestro.id, nombre: maestro.nombre, administracion: false },
    })
  })

  it("ADM-1E11: un cursor inexistente → 400 cursor: no es válido", async () => {
    const respuesta = await pedirPagina(`cursor=${randomUUID()}`)
    expect(respuesta.statusCode).toBe(400)
    expect(error(respuesta)).toEqual({ codigo: "VALIDACION", mensaje: "cursor: no es válido" })
  })
})
