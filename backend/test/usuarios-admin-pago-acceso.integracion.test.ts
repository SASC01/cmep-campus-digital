import { randomUUID } from "node:crypto"

import { errorApiSchema, usuarioAdminFilaSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  consultarMe,
  contarSesionesVivas,
  crearUsuarioDePrueba,
  iniciarSesionDePrueba,
} from "./ayudas-auth.js"
import { tokenDelAdminDePrueba } from "./ayudas-clases.js"
import { crearCuentaDeGestion, leerFilaDb, pedirConToken } from "./ayudas-usuarios-admin.js"

// ADMIN-01e (§D-8): estado de pago por lote (S-11) y restricción de acceso (S-10, RF-55).

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
let tokenAdmin = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const error = (respuesta: LightMyRequestResponse) => errorApiSchema.parse(respuesta.json()).error

const lote = (alumnoIds: readonly string[], estadoPago: string) =>
  pedirConToken(obtenerApp(), tokenAdmin, {
    method: "PUT",
    url: "/api/admin/alumnos/estado-pago",
    payload: { alumnoIds, estadoPago },
  })

const acceso = (id: string, payload: Record<string, unknown>) =>
  pedirConToken(obtenerApp(), tokenAdmin, {
    method: "PUT",
    url: `/api/admin/alumnos/${id}/acceso`,
    payload,
  })

const alumnos = async (cuantos: number, estadoPago: "al_corriente" | "deudor" = "al_corriente") => {
  const creadas: string[] = []
  for (let i = 0; i < cuantos; i += 1) {
    creadas.push((await crearCuentaDeGestion(idsUsuarios, { nombre: `Lote ${i}`, estadoPago })).id)
  }
  return creadas
}

const estadosDe = async (ids: readonly string[]) =>
  obtenerDb().usuario.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, estadoPago: true, fechaEstadoPago: true },
    orderBy: { id: "asc" },
  })

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
  tokenAdmin = await tokenDelAdminDePrueba()
})

afterAll(async () => {
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("estado de pago por lote (ADM-1E08)", () => {
  it("ADM-1E08: con 1 id y con 100 ids responde 200 con los actualizados", async () => {
    const [uno] = await alumnos(1)
    const conUno = await lote([uno ?? ""], "deudor")
    expect(conUno.statusCode, conUno.body).toBe(200)
    expect(conUno.json()).toEqual({ actualizados: 1 })

    const cien = await alumnos(100)
    const conCien = await lote(cien, "deudor")
    expect(conCien.statusCode, conCien.body).toBe(200)
    expect(conCien.json()).toEqual({ actualizados: 100 })
    expect((await estadosDe(cien)).every((fila) => fila.estadoPago === "deudor")).toBe(true)
  })

  it("ADM-1E08: 101 ids, una lista vacía o ids repetidos (también con otra capitalización) → 400 VALIDACION sin escribir", async () => {
    const ids = await alumnos(3)
    const [primero = ""] = ids
    const de101 = [...ids, ...Array.from({ length: 98 }, () => randomUUID())]
    for (const alumnoIds of [de101, [], [primero, primero], [primero, primero.toUpperCase()]]) {
      const respuesta = await lote(alumnoIds, "deudor")
      expect(respuesta.statusCode, `${alumnoIds.length}`).toBe(400)
      expect(error(respuesta).codigo).toBe("VALIDACION")
    }
    expect((await estadosDe(ids)).every((fila) => fila.estadoPago === "al_corriente")).toBe(true)
  })

  it("ADM-1E08: un id de maestro o inexistente → 400 «alumnoIds: hay cuentas que no son de alumnos» sin escribir ninguna fila", async () => {
    const ids = await alumnos(2)
    const maestro = await crearCuentaDeGestion(idsUsuarios, {
      nombre: "Lote Maestro",
      rol: "maestro",
    })
    for (const intruso of [maestro.id, randomUUID()]) {
      const respuesta = await lote([...ids, intruso], "deudor")
      expect(respuesta.statusCode).toBe(400)
      expect(error(respuesta)).toEqual({
        codigo: "VALIDACION",
        mensaje: "alumnoIds: hay cuentas que no son de alumnos",
      })
    }
    expect((await estadosDe(ids)).every((fila) => fila.estadoPago === "al_corriente")).toBe(true)
    expect((await leerFilaDb(maestro.id))?.estadoPago).toBe("al_corriente")
  })

  it("ADM-1E08: fecha_estado_pago cambia solo en las filas cuyo estado cambia", async () => {
    const [yaDeudor = "", alCorriente = ""] = [
      ...(await alumnos(1, "deudor")),
      ...(await alumnos(1)),
    ]
    const fechaFija = new Date("2026-01-01T00:00:00.000Z")
    await obtenerDb().usuario.update({
      where: { id: yaDeudor },
      data: { fechaEstadoPago: fechaFija },
      select: { id: true },
    })
    const respuesta = await lote([yaDeudor, alCorriente], "deudor")
    expect(respuesta.json()).toEqual({ actualizados: 1 })
    const filas = await estadosDe([yaDeudor, alCorriente])
    expect(filas.find((f) => f.id === yaDeudor)?.fechaEstadoPago).toEqual(fechaFija)
    const cambiada = filas.find((f) => f.id === alCorriente)
    expect(cambiada?.estadoPago).toBe("deudor")
    expect(cambiada?.fechaEstadoPago).not.toBeNull()
  })

  it("ADM-1E08: dos lotes cruzados con los mismos ids en orden inverso, a la vez → los dos 200, sin deadlock", async () => {
    const ids = await alumnos(30)
    const inverso = [...ids].reverse()
    for (let vuelta = 0; vuelta < 5; vuelta += 1) {
      const [a, b] = await Promise.all([lote(ids, "deudor"), lote(inverso, "al_corriente")])
      expect(a.statusCode, a.body).toBe(200)
      expect(b.statusCode, b.body).toBe(200)
    }
  })
})

describe("restricción de acceso (ADM-1E09)", () => {
  it("ADM-1E09: restringir con motivo → la siguiente petición con el token vivo responde 403 ACCESO_RESTRINGIDO, las sesiones quedan revocadas y /me (tras volver a entrar) trae el motivo; restablecer lo borra", async () => {
    const alumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumna Restringida" })
    const sesion = await iniciarSesionDePrueba(obtenerApp(), alumno)

    const restringir = await acceso(alumno.id, { restringido: true, motivo: "  Adeudo de marzo  " })
    expect(restringir.statusCode, restringir.body).toBe(200)
    expect(usuarioAdminFilaSchema.parse(restringir.json())).toMatchObject({
      accesoRestringido: true,
      motivoRestriccion: "Adeudo de marzo",
    })
    expect(await contarSesionesVivas(alumno.id)).toBe(0)
    const conTokenVivo = await obtenerApp().inject({
      method: "GET",
      url: "/api/clases/inscritas",
      headers: { authorization: `Bearer ${sesion.tokenAcceso}` },
    })
    expect(conTokenVivo.statusCode).toBe(403)
    expect(error(conTokenVivo).codigo).toBe("ACCESO_RESTRINGIDO")

    const otra = await iniciarSesionDePrueba(obtenerApp(), alumno)
    const me = await consultarMe(obtenerApp(), otra.tokenAcceso)
    expect(me.statusCode, me.body).toBe(200)
    expect(me.json()).toMatchObject({
      accesoRestringido: true,
      motivoRestriccion: "Adeudo de marzo",
    })

    const restablecer = await acceso(alumno.id, { restringido: false })
    expect(restablecer.statusCode).toBe(200)
    expect(usuarioAdminFilaSchema.parse(restablecer.json())).toMatchObject({
      accesoRestringido: false,
      motivoRestriccion: null,
      fechaRestriccion: null,
    })
    const meDespues = await consultarMe(obtenerApp(), otra.tokenAcceso)
    expect(meDespues.json()).toMatchObject({ accesoRestringido: false })
    expect(meDespues.json()).not.toHaveProperty("motivoRestriccion")
  })

  it("ADM-1E09: restringir de nuevo con otro motivo cambia el motivo y conserva la fecha; repetir con el mismo no escribe", async () => {
    const alumno = await crearCuentaDeGestion(idsUsuarios, { nombre: "Alumno Motivo" })
    expect((await acceso(alumno.id, { restringido: true, motivo: "Primero" })).statusCode).toBe(200)
    const antes = await leerFilaDb(alumno.id)
    expect(antes?.fechaRestriccion).not.toBeNull()

    expect((await acceso(alumno.id, { restringido: true, motivo: "Segundo" })).statusCode).toBe(200)
    const despues = await leerFilaDb(alumno.id)
    expect(despues?.motivoRestriccion).toBe("Segundo")
    expect(despues?.fechaRestriccion).toEqual(antes?.fechaRestriccion)

    expect((await acceso(alumno.id, { restringido: true, motivo: "Segundo" })).statusCode).toBe(200)
    expect((await leerFilaDb(alumno.id))?.actualizadoEn).toEqual(despues?.actualizadoEn)
  })

  it("ADM-1E09: a un maestro → 409 NO_ES_ALUMNO sin escribir; una cuenta inexistente → 404", async () => {
    const maestro = await crearCuentaDeGestion(idsUsuarios, {
      nombre: "Maestro Acceso",
      rol: "maestro",
    })
    const respuesta = await acceso(maestro.id, { restringido: true, motivo: "No aplica" })
    expect(respuesta.statusCode).toBe(409)
    expect(error(respuesta)).toEqual({
      codigo: "NO_ES_ALUMNO",
      mensaje: "Solo se restringe el acceso de un alumno.",
    })
    expect((await leerFilaDb(maestro.id))?.accesoRestringido).toBe(false)
    const inexistente = await acceso(randomUUID(), { restringido: true })
    expect(inexistente.statusCode).toBe(404)
    expect(error(inexistente).codigo).toBe("USUARIO_NO_ENCONTRADO")
  })

  it("ADM-1E09: un motivo de 301 caracteres visibles → 400 sin escribir; 300 visibles con espacios de más pasan; uno de solo espacios queda sin motivo", async () => {
    const alumno = await crearCuentaDeGestion(idsUsuarios, { nombre: "Alumna Largo" })
    const largo = await acceso(alumno.id, { restringido: true, motivo: "a".repeat(301) })
    expect(largo.statusCode).toBe(400)
    expect(error(largo).codigo).toBe("VALIDACION")
    expect((await leerFilaDb(alumno.id))?.accesoRestringido).toBe(false)

    const justo = "ab ".repeat(150).trim()
    const conEspacios = await acceso(alumno.id, { restringido: true, motivo: justo })
    expect(conEspacios.statusCode, conEspacios.body).toBe(200)
    expect((await leerFilaDb(alumno.id))?.motivoRestriccion).toBe(justo)

    const otro = await crearCuentaDeGestion(idsUsuarios, { nombre: "Alumno Espacios" })
    const vacio = await acceso(otro.id, { restringido: true, motivo: "   \n\t  " })
    expect(vacio.statusCode).toBe(200)
    expect(await leerFilaDb(otro.id)).toMatchObject({
      accesoRestringido: true,
      motivoRestriccion: null,
    })
  })

  // Decisión del humano (2026-11-09): sin tope de longitud cruda; la única medida son los 300
  // visibles de S-10.
  it("ADM-1E09: sin tope crudo: 300 visibles con mucho relleno (más de 1000 caracteres en total, también emojis de dos unidades) se aceptan y se guardan tal cual", async () => {
    const alumno = await crearCuentaDeGestion(idsUsuarios, { nombre: "Alumna Relleno" })
    const conRelleno = Array.from({ length: 300 }, () => "a").join("     \n")
    expect(conRelleno.length, "Precondición: el motivo pasa de 1000 caracteres").toBeGreaterThan(
      1000,
    )
    const respuesta = await acceso(alumno.id, { restringido: true, motivo: conRelleno })
    expect(respuesta.statusCode, respuesta.body).toBe(200)
    expect((await leerFilaDb(alumno.id))?.motivoRestriccion).toBe(conRelleno)

    const conEmojis = "\u{1F600}".repeat(300)
    expect(conEmojis.length).toBe(600)
    const otra = await crearCuentaDeGestion(idsUsuarios, { nombre: "Alumna Emojis" })
    const deEmojis = await acceso(otra.id, { restringido: true, motivo: conEmojis })
    expect(deEmojis.statusCode, deEmojis.body).toBe(200)
    expect((await leerFilaDb(otra.id))?.motivoRestriccion).toBe(conEmojis)

    const pasado = await acceso(otra.id, {
      restringido: true,
      motivo: `${conRelleno} b`,
    })
    expect(pasado.statusCode).toBe(400)
    expect(error(pasado)).toEqual({
      codigo: "VALIDACION",
      mensaje: "motivo: El motivo no puede tener más de 300 caracteres",
    })
  })

  it("ADM-1E09: un motivo con el carácter nulo, otro carácter de control o un inversor de dirección → 400 VALIDACION (nunca 500) sin escribir", async () => {
    const alumno = await crearCuentaDeGestion(idsUsuarios, { nombre: "Alumno Control" })
    for (const motivo of ["Adeudo\u0000marzo", "Adeudo\u0007marzo", "Adeudo\u202emarzo"]) {
      const respuesta = await acceso(alumno.id, { restringido: true, motivo })
      expect(respuesta.statusCode, JSON.stringify(motivo)).toBe(400)
      expect(error(respuesta)).toEqual({
        codigo: "VALIDACION",
        mensaje: "motivo: El texto tiene caracteres no permitidos",
      })
    }
    expect(await leerFilaDb(alumno.id)).toMatchObject({
      accesoRestringido: false,
      motivoRestriccion: null,
    })
  })
})
