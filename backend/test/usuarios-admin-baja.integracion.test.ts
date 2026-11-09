import { errorApiSchema, usuarioAdminFilaSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  contarSesionesVivas,
  correoDePrueba,
  crearUsuarioDePrueba,
  desactivarUsuarioDePrueba,
  firmarTokenDePrueba,
  iniciarSesionDePrueba,
  refrescarDePrueba,
  valorCookieRefresco,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import { archivarClaseDePrueba } from "./ayudas-clases-archivadas.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearClaseDePrueba,
  idDelAdminDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { conFilaRetenida } from "./ayudas-concurrencia.js"
import { crearTokenDePrueba, leerTokens } from "./ayudas-cuentas.js"
import { leerFilaDb, marcaDePrueba, pedirConToken } from "./ayudas-usuarios-admin.js"

// ADMIN-01e (§D-7.4, §D-7.8, §D-7.9, §D-7.10, M-18): baja y reactivación con el protocolo de bloqueo,
// la otra temporal, la baja frente a asignar, crear y duplicar, y la marca «Cuenta desactivada».
// N-18: ninguna clase de estas pruebas queda con 0 o con 3 maestros.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
const correosCreados: string[] = []
let tokenAdmin = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const error = (respuesta: LightMyRequestResponse) => errorApiSchema.parse(respuesta.json()).error

const pedir = (opciones: Parameters<typeof pedirConToken>[2]) =>
  pedirConToken(obtenerApp(), tokenAdmin, opciones)

const cambiarActivo = (id: string, activo: boolean) =>
  pedir({ method: "PUT", url: `/api/admin/usuarios/${id}/activo`, payload: { activo } })

const login = (email: string, contrasena: string) =>
  obtenerApp().inject({ method: "POST", url: "/api/auth/login", payload: { email, contrasena } })

const restablecer = (id: string) =>
  pedir({ method: "POST", url: `/api/admin/usuarios/${id}/restablecer-contrasena` })

const temporalDe = (respuesta: LightMyRequestResponse): string => {
  expect(respuesta.statusCode, respuesta.body).toBe(200)
  return respuesta.json<{ contrasenaTemporal: string }>().contrasenaTemporal
}

const maestro = (nombre = "Maestro de baja"): Promise<UsuarioDePrueba> =>
  crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: `${nombre} ${marcaDePrueba()}` })

const tokenDe = (usuario: { id: string }): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

const maestrosDe = (cuerpo: unknown): Record<string, unknown>[] =>
  (cuerpo as { maestros: Record<string, unknown>[] }).maestros

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
  tokenAdmin = await tokenDelAdminDePrueba()
})

afterAll(async () => {
  for (const correo of correosCreados) {
    const fila = await obtenerDb().usuario.findUnique({ where: { email: correo } })
    if (fila) idsUsuarios.push(fila.id)
  }
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("baja y reactivación (ADM-1E05)", () => {
  it("ADM-1E05: la baja revoca el refresco, el login responde lo mismo que una contraseña incorrecta y el enlace vivo ya no sirve; reactivar devuelve el login con su contraseña", async () => {
    const alumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumno de baja" })
    const sesion = await iniciarSesionDePrueba(obtenerApp(), alumno)
    const recuperacion = await crearTokenDePrueba({
      usuarioId: alumno.id,
      tipo: "recuperacion",
      expiraEn: new Date(Date.now() + 60 * 60 * 1000),
    })

    const baja = await cambiarActivo(alumno.id, false)
    expect(baja.statusCode, baja.body).toBe(200)
    expect(usuarioAdminFilaSchema.parse(baja.json())).toMatchObject({
      id: alumno.id,
      activo: false,
    })
    expect(await contarSesionesVivas(alumno.id)).toBe(0)
    expect((await refrescarDePrueba(obtenerApp(), sesion.cookie)).statusCode).toBe(401)

    const conLaBuena = await login(alumno.email, alumno.contrasena)
    const conOtra = await login(alumno.email, "otra-clave-incorrecta")
    expect(conLaBuena.statusCode).toBe(401)
    expect(conLaBuena.json()).toEqual(conOtra.json())

    expect((await leerTokens(alumno.id)).every((t) => t.revocadoEn !== null)).toBe(true)
    const conEnlace = await obtenerApp().inject({
      method: "POST",
      url: "/api/auth/restablecer",
      payload: { token: recuperacion.token, contrasena: "una-clave-nueva-123" },
    })
    expect(conEnlace.statusCode).toBe(400)
    expect(error(conEnlace).codigo).toBe("ENLACE_INVALIDO")

    const reactivada = await cambiarActivo(alumno.id, true)
    expect(reactivada.statusCode).toBe(200)
    expect(usuarioAdminFilaSchema.parse(reactivada.json()).activo).toBe(true)
    expect((await login(alumno.email, alumno.contrasena)).statusCode).toBe(200)
  })

  it("ADM-1E05: la baja de un maestro también revoca su invitación viva", async () => {
    const m = await maestro()
    const invitacion = await crearTokenDePrueba({
      usuarioId: m.id,
      tipo: "invitacion",
      expiraEn: new Date(Date.now() + 60 * 60 * 1000),
    })
    expect((await cambiarActivo(m.id, false)).statusCode).toBe(200)
    const uso = await obtenerApp().inject({
      method: "POST",
      url: "/api/auth/establecer-contrasena",
      payload: { token: invitacion.token, contrasena: "una-clave-nueva-123" },
    })
    expect(uso.statusCode).toBe(400)
    expect(error(uso).codigo).toBe("ENLACE_INVALIDO")
  })

  it("ADM-1E05: la cuenta de administración → 409 CUENTA_DE_ADMINISTRACION, sin escribir", async () => {
    const adminId = await idDelAdminDePrueba()
    for (const activo of [false, true]) {
      const respuesta = await cambiarActivo(adminId, activo)
      expect(respuesta.statusCode).toBe(409)
      expect(error(respuesta)).toEqual({
        codigo: "CUENTA_DE_ADMINISTRACION",
        mensaje: "La cuenta de administración no se da de baja.",
      })
    }
    expect((await leerFilaDb(adminId))?.activo).toBe(true)
  })

  it("ADM-1E05: un maestro con una clase activa → 409 MAESTRO_CON_CLASES (singular) y sigue activo", async () => {
    const m = await maestro()
    await crearClaseDePrueba(idsClases, { maestroId: m.id })
    const respuesta = await cambiarActivo(m.id, false)
    expect(respuesta.statusCode).toBe(409)
    expect(error(respuesta)).toEqual({
      codigo: "MAESTRO_CON_CLASES",
      mensaje:
        "Este maestro tiene 1 clase activa asignada. Asigna otro maestro a esa clase y quítalo de ella antes de darlo de baja.",
    })
    expect((await leerFilaDb(m.id))?.activo).toBe(true)
  })

  it("ADM-1E05: un maestro solo con clases archivadas → baja 200; sigue asignado y sale con cuentaDesactivada: true en el detalle (admin) y en «Personas» (el otro maestro)", async () => {
    const a = await maestro("Maestro que queda")
    const b = await maestro("Maestro que se va")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: a.id, maestroIds: [a.id, b.id] })
    await archivarClaseDePrueba(clase.id)

    const baja = await cambiarActivo(b.id, false)
    expect(baja.statusCode, baja.body).toBe(200)
    expect(
      await obtenerDb().maestroDeClase.count({ where: { claseId: clase.id, maestroId: b.id } }),
    ).toBe(1)

    const detalle = await pedir({ method: "GET", url: `/api/clases/${clase.id}` })
    expect(detalle.statusCode).toBe(200)
    const delDetalle = maestrosDe(detalle.json<{ clase: unknown }>().clase)
    expect(delDetalle.find((x) => x.id === b.id)).toEqual({
      id: b.id,
      nombre: expect.any(String),
      cuentaDesactivada: true,
    })
    expect(Object.keys(delDetalle.find((x) => x.id === a.id) ?? {}).sort()).toEqual([
      "id",
      "nombre",
    ])

    const personas = await pedirConToken(obtenerApp(), await tokenDe(a), {
      method: "GET",
      url: `/api/clases/${clase.id}/personas`,
    })
    expect(personas.statusCode, personas.body).toBe(200)
    const deb = maestrosDe(personas.json()).find((x) => x.id === b.id)
    expect(deb).toMatchObject({ id: b.id, cuentaDesactivada: true })
    expect(deb).not.toHaveProperty("activo")
  })

  it("ADM-1E05: un maestro sin clases → baja; repetirla responde la fila sin escribir", async () => {
    const m = await maestro()
    expect((await cambiarActivo(m.id, false)).statusCode).toBe(200)
    const antes = await leerFilaDb(m.id)
    const repetida = await cambiarActivo(m.id, false)
    expect(repetida.statusCode).toBe(200)
    expect(usuarioAdminFilaSchema.parse(repetida.json()).activo).toBe(false)
    expect((await leerFilaDb(m.id))?.actualizadoEn).toEqual(antes?.actualizadoEn)
  })
})

describe("baja con un refresco en curso (ADM-1E06)", () => {
  it("ADM-1E06: con la fila retenida, el refresco y la baja quedan en serie y la sesión rotada también queda revocada", async () => {
    const alumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumno que refresca" })
    const sesion = await iniciarSesionDePrueba(obtenerApp(), alumno)
    const [refresco, baja] = await conFilaRetenida({ tabla: "usuarios", id: alumno.id }, [
      () => refrescarDePrueba(obtenerApp(), sesion.cookie),
      () => cambiarActivo(alumno.id, false),
    ])
    expect(refresco?.statusCode).toBe(200)
    expect(baja?.statusCode).toBe(200)
    expect(await contarSesionesVivas(alumno.id)).toBe(0)
    const rotada =
      refresco === null || refresco === undefined ? undefined : valorCookieRefresco(refresco)
    expect(rotada, "Precondición: el refresco devolvió una cookie nueva").toBeDefined()
    expect((await refrescarDePrueba(obtenerApp(), rotada)).statusCode).toBe(401)
  })
})

describe("maestros dados de baja al crear y asignar (ADM-1E12)", () => {
  it("ADM-1E12: crear una clase o asignar un maestro dado de baja → 404 MAESTRO_NO_ENCONTRADO", async () => {
    const activo = await maestro()
    const inactivo = await maestro()
    await desactivarUsuarioDePrueba(inactivo.id)
    const nombre = `Clase con baja ${marcaDePrueba()}`

    const crear = await pedir({
      method: "POST",
      url: "/api/admin/clases",
      payload: { nombre, maestroIds: [inactivo.id] },
    })
    expect(crear.statusCode).toBe(404)
    expect(error(crear).codigo).toBe("MAESTRO_NO_ENCONTRADO")
    expect(await obtenerDb().clase.count({ where: { nombre } })).toBe(0)

    const clase = await crearClaseDePrueba(idsClases, { maestroId: activo.id })
    const asignar = await pedir({
      method: "POST",
      url: `/api/admin/clases/${clase.id}/maestros`,
      payload: { maestroId: inactivo.id },
    })
    expect(asignar.statusCode).toBe(404)
    expect(error(asignar).codigo).toBe("MAESTRO_NO_ENCONTRADO")
    expect(await obtenerDb().maestroDeClase.count({ where: { claseId: clase.id } })).toBe(1)
  })
})

describe("M-18: establecer la contraseña con la baja retenida (ADM-1E13)", () => {
  it("ADM-1E13: con la baja formada antes, tras confirmarla el uso del token se rechaza y la contraseña no cambia", async () => {
    const m = await maestro()
    const invitacion = await crearTokenDePrueba({
      usuarioId: m.id,
      tipo: "invitacion",
      expiraEn: new Date(Date.now() + 60 * 60 * 1000),
    })
    const hashAntes = (await leerFilaDb(m.id))?.hashContrasena
    const [baja, uso] = await conFilaRetenida({ tabla: "usuarios", id: m.id }, [
      () => cambiarActivo(m.id, false),
      () =>
        obtenerApp().inject({
          method: "POST",
          url: "/api/auth/establecer-contrasena",
          payload: { token: invitacion.token, contrasena: "una-clave-nueva-123" },
        }),
    ])
    expect(baja?.statusCode).toBe(200)
    expect(uso?.statusCode).toBe(400)
    expect(uso === null || uso === undefined ? "" : error(uso).codigo).toBe("ENLACE_INVALIDO")
    expect((await leerFilaDb(m.id))?.hashContrasena).toBe(hashAntes)
    expect((await leerTokens(m.id)).find((t) => t.id === invitacion.id)?.usadoEn).toBeNull()
  })

  it("ADM-1E13: la cuenta desactivada justo antes de soltar la fila (sin revocar el token): el uso relee activo bajo el bloqueo y se rechaza sin escribir", async () => {
    const m = await maestro()
    const invitacion = await crearTokenDePrueba({
      usuarioId: m.id,
      tipo: "invitacion",
      expiraEn: new Date(Date.now() + 60 * 60 * 1000),
    })
    const hashAntes = (await leerFilaDb(m.id))?.hashContrasena
    const [uso] = await conFilaRetenida(
      { tabla: "usuarios", id: m.id },
      [
        () =>
          obtenerApp().inject({
            method: "POST",
            url: "/api/auth/establecer-contrasena",
            payload: { token: invitacion.token, contrasena: "una-clave-nueva-123" },
          }),
      ],
      async (sql) => {
        expect(await sql`UPDATE usuarios SET activo = false WHERE id = ${m.id}::uuid`).toBe(1)
      },
    )
    expect(uso?.statusCode).toBe(400)
    expect((await leerFilaDb(m.id))?.hashContrasena).toBe(hashAntes)
    const token = (await leerTokens(m.id)).find((t) => t.id === invitacion.id)
    expect(token?.usadoEn).toBeNull()
    expect(token?.revocadoEn).toBeNull()
  })
})

describe("otra contraseña temporal (ADM-1E17)", () => {
  it("ADM-1E17: alumno del alta: con A creada, restablecer da B; A ya no entra y B sí; restablecer otra vez da C y B deja de servir", async () => {
    const email = correoDePrueba("temporal")
    correosCreados.push(email)
    const alta = await pedir({
      method: "POST",
      url: "/api/admin/alumnos",
      payload: { nombre: "Alumna Temporal", email },
    })
    expect(alta.statusCode, alta.body).toBe(201)
    const { usuario, contrasenaTemporal: a } = alta.json<{
      usuario: { id: string }
      contrasenaTemporal: string
    }>()
    const b = temporalDe(await restablecer(usuario.id))
    const conA = await login(email, a)
    const incorrecta = await login(email, "no-es-ninguna-clave")
    expect(conA.statusCode).toBe(401)
    expect(conA.json()).toEqual(incorrecta.json())
    expect((await login(email, b)).statusCode).toBe(200)
    expect(
      (await obtenerDb().usuario.findUnique({ where: { email } }))?.debeCambiarContrasena,
    ).toBe(true)
    const c = temporalDe(await restablecer(usuario.id))
    expect((await login(email, b)).statusCode).toBe(401)
    expect((await login(email, c)).statusCode).toBe(200)
  })

  it("ADM-1E17: un login con la temporal que verificó el hash antes del restablecimiento y crea la sesión después no crea sesión", async () => {
    const email = correoDePrueba("temporal")
    correosCreados.push(email)
    const alta = await pedir({
      method: "POST",
      url: "/api/admin/alumnos",
      payload: { nombre: "Alumno Carrera", email },
    })
    const { usuario, contrasenaTemporal } = alta.json<{
      usuario: { id: string }
      contrasenaTemporal: string
    }>()
    const [otra, entrada] = await conFilaRetenida({ tabla: "usuarios", id: usuario.id }, [
      () => restablecer(usuario.id),
      () => login(email, contrasenaTemporal),
    ])
    expect(otra?.statusCode).toBe(200)
    expect(entrada?.statusCode).toBe(401)
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
  })

  it("ADM-1E17: un maestro invitado: restablecer da B, B entra; restablecer da C y B deja de servir; la cuenta del admin sigue en 403 OPERACION_NO_PERMITIDA", async () => {
    const email = correoDePrueba("invitado")
    correosCreados.push(email)
    const invitado = await pedir({
      method: "POST",
      url: "/api/admin/maestros",
      payload: { nombre: "Maestro Invitado", email },
    })
    expect(invitado.statusCode, invitado.body).toBe(201)
    const { id } = invitado.json<{ id: string }>()
    const b = temporalDe(await restablecer(id))
    expect((await login(email, b)).statusCode).toBe(200)
    const c = temporalDe(await restablecer(id))
    expect((await login(email, b)).statusCode).toBe(401)
    expect((await login(email, c)).statusCode).toBe(200)

    const delAdmin = await restablecer(await idDelAdminDePrueba())
    expect(delAdmin.statusCode).toBe(403)
    expect(error(delAdmin).codigo).toBe("OPERACION_NO_PERMITIDA")
  })
})

describe("la baja frente a asignar, crear y duplicar (ADM-1E18)", () => {
  const asignadosActivos = (maestroId: string) =>
    obtenerDb().maestroDeClase.count({ where: { maestroId, clase: { archivadaEn: null } } })

  type Escritura = (maestroId: string) => Promise<LightMyRequestResponse>

  const escrituras = async (): Promise<Record<string, Escritura>> => {
    const otro = await maestro("Maestro de la clase")
    const paraAsignar = await crearClaseDePrueba(idsClases, { maestroId: otro.id })
    const original = await crearClaseDePrueba(idsClases, { maestroId: otro.id })
    return {
      asignar: (maestroId) =>
        pedir({
          method: "POST",
          url: `/api/admin/clases/${paraAsignar.id}/maestros`,
          payload: { maestroId },
        }),
      crear: (maestroId) =>
        pedir({
          method: "POST",
          url: "/api/admin/clases",
          payload: { nombre: `Nueva ${marcaDePrueba()}`, maestroIds: [maestroId] },
        }),
      duplicar: (maestroId) =>
        pedir({
          method: "POST",
          url: `/api/admin/clases/${original.id}/duplicar`,
          payload: { nombre: `Copia ${marcaDePrueba()}`, maestroIds: [maestroId] },
        }),
    }
  }

  const registrarClaseCreada = (respuesta: LightMyRequestResponse | null | undefined): void => {
    if (!respuesta || respuesta.statusCode !== 201) return
    idsClases.push(respuesta.json<{ clase: { id: string } }>().clase.id)
  }

  it("ADM-1E18: con la baja formada primero sobre la fila del maestro, asignar, crear y duplicar esperan y responden 404 MAESTRO_NO_ENCONTRADO sin escribir", async () => {
    const operaciones = await escrituras()
    for (const [nombre, escribir] of Object.entries(operaciones)) {
      const m = await maestro()
      const [baja, escritura] = await conFilaRetenida({ tabla: "usuarios", id: m.id }, [
        () => cambiarActivo(m.id, false),
        () => escribir(m.id),
      ])
      registrarClaseCreada(escritura)
      expect(baja?.statusCode, nombre).toBe(200)
      expect(escritura?.statusCode, `${nombre}: ${escritura?.body ?? ""}`).toBe(404)
      expect(escritura === null || escritura === undefined ? "" : error(escritura).codigo).toBe(
        "MAESTRO_NO_ENCONTRADO",
      )
      expect(await asignadosActivos(m.id), nombre).toBe(0)
    }
  })

  it("ADM-1E18: con la escritura formada primero, la baja responde 409 MAESTRO_CON_CLASES y el maestro sigue activo", async () => {
    const operaciones = await escrituras()
    for (const [nombre, escribir] of Object.entries(operaciones)) {
      const m = await maestro()
      const [escritura, baja] = await conFilaRetenida({ tabla: "usuarios", id: m.id }, [
        () => escribir(m.id),
        () => cambiarActivo(m.id, false),
      ])
      registrarClaseCreada(escritura)
      expect(escritura?.statusCode, `${nombre}: ${escritura?.body ?? ""}`).toBeLessThan(300)
      expect(baja?.statusCode, nombre).toBe(409)
      expect(baja === null || baja === undefined ? "" : error(baja).codigo).toBe(
        "MAESTRO_CON_CLASES",
      )
      expect((await leerFilaDb(m.id))?.activo, nombre).toBe(true)
      expect(await asignadosActivos(m.id), nombre).toBe(1)
    }
  })
})

describe("«Cuenta desactivada» (ADM-1E19)", () => {
  it("ADM-1E19: un maestro activo sale sin la clave cuentaDesactivada y uno inactivo con cuentaDesactivada: true en el detalle, en asignar y quitar y en «Personas»", async () => {
    const a = await maestro("Maestra activa")
    const b = await maestro("Maestro inactivo")
    const c = await maestro("Maestra que se asigna")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: a.id, maestroIds: [a.id, b.id] })
    await desactivarUsuarioDePrueba(b.id)

    const comprobar = (maestros: Record<string, unknown>[], donde: string): void => {
      const deB = maestros.find((x) => x.id === b.id)
      expect(deB, `${donde}: falta el maestro inactivo`).toBeDefined()
      expect(deB?.cuentaDesactivada, donde).toBe(true)
      expect(deB, donde).not.toHaveProperty("activo")
      for (const otro of maestros.filter((x) => x.id !== b.id)) {
        expect(otro, donde).not.toHaveProperty("cuentaDesactivada")
        expect(otro, donde).not.toHaveProperty("activo")
      }
    }

    const detalle = await pedir({ method: "GET", url: `/api/clases/${clase.id}` })
    comprobar(maestrosDe(detalle.json<{ clase: unknown }>().clase), "detalle")

    const quitar = await pedir({
      method: "DELETE",
      url: `/api/admin/clases/${clase.id}/maestros/${a.id}`,
    })
    expect(quitar.statusCode, quitar.body).toBe(200)
    comprobar(maestrosDe(quitar.json()), "quitar")

    const asignar = await pedir({
      method: "POST",
      url: `/api/admin/clases/${clase.id}/maestros`,
      payload: { maestroId: c.id },
    })
    expect(asignar.statusCode, asignar.body).toBe(200)
    comprobar(maestrosDe(asignar.json()), "asignar")
    expect(
      maestrosDe(asignar.json())
        .map((x) => x.id)
        .sort(),
    ).toEqual([b.id, c.id].sort())

    const personas = await pedirConToken(obtenerApp(), await tokenDe(c), {
      method: "GET",
      url: `/api/clases/${clase.id}/personas`,
    })
    expect(personas.statusCode, personas.body).toBe(200)
    comprobar(maestrosDe(personas.json()), "personas")
  })

  it("ADM-1E19: en la lista del admin, la clase con un maestro inactivo lo marca y el activo sale sin la clave", async () => {
    const a = await maestro("Maestra de la lista")
    const b = await maestro("Maestro de la lista")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: a.id, maestroIds: [a.id, b.id] })
    await desactivarUsuarioDePrueba(b.id)

    // La lista es global: se recorre por páginas, con un tope, hasta encontrar la clase del caso.
    let consulta = "estado=activas&limite=100"
    let encontrada: Record<string, unknown> | undefined
    for (let vuelta = 0; vuelta < 30 && encontrada === undefined; vuelta += 1) {
      const respuesta = await pedir({ method: "GET", url: `/api/admin/clases?${consulta}` })
      expect(respuesta.statusCode).toBe(200)
      const cuerpo = respuesta.json<{
        clases: Record<string, unknown>[]
        siguienteCursor: string | null
      }>()
      encontrada = cuerpo.clases.find((x) => x.id === clase.id)
      if (cuerpo.siguienteCursor === null) break
      consulta = `estado=activas&limite=100&cursor=${cuerpo.siguienteCursor}`
    }
    expect(encontrada, "No se encontró la clase del caso en la lista del admin").toBeDefined()
    const maestros = maestrosDe(encontrada)
    expect(maestros.find((x) => x.id === b.id)?.cuentaDesactivada).toBe(true)
    expect(maestros.find((x) => x.id === a.id)).not.toHaveProperty("cuentaDesactivada")
  })
})
