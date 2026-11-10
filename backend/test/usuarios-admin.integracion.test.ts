import { randomUUID } from "node:crypto"

import {
  altaAlumnoRespuestaSchema,
  errorApiSchema,
  listaUsuariosRespuestaSchema,
  usuarioAdminFilaSchema,
} from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  consultarMe,
  correoDePrueba,
  iniciarSesionDePrueba,
} from "./ayudas-auth.js"
import { clavesDe } from "./ayudas-clases-archivadas.js"
import { tokenDelAdminDePrueba } from "./ayudas-clases.js"
import {
  CLAVES_PROHIBIDAS,
  crearCuentaDeGestion,
  leerFilaDb,
  marcaDePrueba,
  pedirConToken,
  urlDeUsuarios,
  type CuentaDeGestion,
  type PaginaDeUsuarios,
} from "./ayudas-usuarios-admin.js"

// ADMIN-01e (§D-7.1 a §D-7.5, Enmienda 5): lista de usuarios, ficha, nombre y alta de alumno. Cada
// caso busca con su propio prefijo (E8-4, forma (a)): nunca cuenta filas de la lista global.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const correosCreados: string[] = []
let tokenAdmin = ""
const respuestas: LightMyRequestResponse[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const pedir = async (opciones: Parameters<typeof pedirConToken>[2]) => {
  const respuesta = await pedirConToken(obtenerApp(), tokenAdmin, opciones)
  respuestas.push(respuesta)
  return respuesta
}

const listar = async (consulta: Record<string, string>): Promise<LightMyRequestResponse> =>
  pedir({ method: "GET", url: urlDeUsuarios(consulta) })

const pagina = (respuesta: LightMyRequestResponse): PaginaDeUsuarios => {
  expect(respuesta.statusCode, respuesta.body).toBe(200)
  return listaUsuariosRespuestaSchema.parse(respuesta.json()) as PaginaDeUsuarios
}

const error = (respuesta: LightMyRequestResponse) => errorApiSchema.parse(respuesta.json()).error

const esperarCursorInvalido = (respuesta: LightMyRequestResponse, caso: string): void => {
  expect(respuesta.statusCode, `${caso}: ${respuesta.body}`).toBe(400)
  expect(error(respuesta), caso).toEqual({ codigo: "VALIDACION", mensaje: "cursor: no es válido" })
}

const renombrar = (id: string, nombre: string) =>
  pedir({ method: "PUT", url: `/api/admin/usuarios/${id}/nombre`, payload: { nombre } })

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
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("GET /admin/usuarios (ADM-1E02)", () => {
  it("ADM-1E02: busca por parte del nombre sin acentos ni mayúsculas y por parte del correo", async () => {
    const m = marcaDePrueba()
    const jose = await crearCuentaDeGestion(idsUsuarios, { nombre: `${m} José Peña` })
    const otra = await crearCuentaDeGestion(idsUsuarios, { nombre: `${m} Ana Ruiz` })

    const porNombre = pagina(await listar({ q: `${m.toUpperCase()} JOSÉ PEÑ` }))
    expect(porNombre.usuarios.map((u) => u.id)).toEqual([jose.id])

    const parteDelCorreo = otra.email.slice(3, 23)
    const porCorreo = pagina(await listar({ q: parteDelCorreo.toUpperCase() }))
    expect(porCorreo.usuarios.map((u) => u.id)).toEqual([otra.id])
  })

  it("ADM-1E02: filtro por rol, y estadoPago solo con rol=estudiante (si no, 400 VALIDACION)", async () => {
    const m = marcaDePrueba()
    const alumna = await crearCuentaDeGestion(idsUsuarios, {
      nombre: `${m} Alumna`,
      estadoPago: "deudor",
    })
    const alumno = await crearCuentaDeGestion(idsUsuarios, { nombre: `${m} Alumno` })
    const maestro = await crearCuentaDeGestion(idsUsuarios, {
      nombre: `${m} Maestro`,
      rol: "maestro",
    })

    expect(pagina(await listar({ q: m, rol: "maestro" })).usuarios.map((u) => u.id)).toEqual([
      maestro.id,
    ])
    expect(
      pagina(await listar({ q: m, rol: "estudiante" }))
        .usuarios.map((u) => u.id)
        .sort(),
    ).toEqual([alumna.id, alumno.id].sort())
    expect(
      pagina(await listar({ q: m, rol: "estudiante", estadoPago: "deudor" })).usuarios.map(
        (u) => u.id,
      ),
    ).toEqual([alumna.id])
    expect(
      pagina(await listar({ q: m, rol: "estudiante", estadoPago: "al_corriente" })).usuarios.map(
        (u) => u.id,
      ),
    ).toEqual([alumno.id])

    for (const consulta of [
      { q: m, estadoPago: "deudor" },
      { q: m, rol: "maestro", estadoPago: "deudor" },
      { q: m, rol: "admin", estadoPago: "al_corriente" },
    ]) {
      const respuesta = await listar(consulta)
      expect(respuesta.statusCode, JSON.stringify(consulta)).toBe(400)
      expect(error(respuesta).codigo).toBe("VALIDACION")
      expect(error(respuesta).mensaje).toMatch(/^estadoPago: /)
    }
  })

  it("ADM-1E02: término de menos de 3 caracteres normalizados → 400 BUSQUEDA_MUY_CORTA", async () => {
    for (const q of ["ab", "  ab  ", "", "áb"]) {
      const respuesta = await listar({ q })
      expect(respuesta.statusCode, JSON.stringify(q)).toBe(400)
      expect(error(respuesta)).toEqual({
        codigo: "BUSQUEDA_MUY_CORTA",
        mensaje: "Escribe al menos 3 letras para buscar.",
      })
    }
  })

  // T-01 de la ronda 1 de 01e: el nulo se rechaza en el esquema y nunca llega a PostgreSQL. Se
  // construye con su código para no escribir el carácter en el archivo.
  it("ADM-1E02: q con el carácter nulo, en cada forma en que llega (sola, con rol, con rol y estadoPago, y en la página 2 con cursor y cursorNombre) → 400 VALIDACION «q: Los datos enviados tienen caracteres no permitidos.», nunca 500", async () => {
    const nulo = String.fromCharCode(0)
    const m = marcaDePrueba()
    await crearCuentaDeGestion(idsUsuarios, { nombre: `${m} a`, estadoPago: "deudor" })
    await crearCuentaDeGestion(idsUsuarios, { nombre: `${m} b`, estadoPago: "deudor" })
    const filtros = { rol: "estudiante", estadoPago: "deudor" }
    const p1 = pagina(await listar({ q: m, ...filtros, limite: "1" }))
    expect(p1.siguienteCursor, "Precondición: hay página 2").not.toBeNull()

    const consultas: Record<string, string>[] = [
      { q: `${m}${nulo}` },
      { q: `${nulo}${m}` },
      { q: `${m}${nulo}x` },
      { q: `${m}${nulo}`, rol: "estudiante" },
      { q: `${m}${nulo}`, ...filtros },
      {
        q: `${m}${nulo}`,
        ...filtros,
        limite: "1",
        cursor: p1.siguienteCursor ?? "",
        cursorNombre: p1.siguienteCursorNombre ?? "",
      },
      { q: `${nulo}${nulo}${nulo}` },
    ]
    for (const consulta of consultas) {
      const respuesta = await listar(consulta)
      expect(respuesta.statusCode, `${JSON.stringify(consulta)}: ${respuesta.body}`).toBe(400)
      expect(error(respuesta)).toEqual({
        codigo: "VALIDACION",
        mensaje: "q: Los datos enviados tienen caracteres no permitidos.",
      })
    }
  })

  it("ADM-1E02: los comodines se escapan: % y _ solo se encuentran a sí mismos", async () => {
    const m = marcaDePrueba()
    const conGuion = await crearCuentaDeGestion(idsUsuarios, { nombre: `${m} a_b` })
    await crearCuentaDeGestion(idsUsuarios, { nombre: `${m} axb` })

    expect(pagina(await listar({ q: `${m}%` })).usuarios).toEqual([])
    expect(pagina(await listar({ q: `${m} a_b` })).usuarios.map((u) => u.id)).toEqual([conGuion.id])
    expect(pagina(await listar({ q: `${m}\\` })).usuarios).toEqual([])
  })

  it("ADM-1E02: ordena por nombre y pagina con cursor y cursorNombre; siguienteCursorNombre es el nombre de la última fila y es null exactamente cuando siguienteCursor lo es", async () => {
    const m = marcaDePrueba()
    const nombres = [`${m} Elena`, `${m} beto`, `${m} Ángel`, `${m} carla`, `${m} Diego`]
    const cuentas: CuentaDeGestion[] = []
    for (const nombre of nombres) cuentas.push(await crearCuentaDeGestion(idsUsuarios, { nombre }))
    const esperado = [`${m} Ángel`, `${m} beto`, `${m} carla`, `${m} Diego`, `${m} Elena`]

    const recorridas: string[] = []
    let consulta: Record<string, string> = { q: m, limite: "2" }
    for (let vuelta = 0; vuelta < 5; vuelta += 1) {
      const actual = pagina(await listar(consulta))
      recorridas.push(...actual.usuarios.map((u) => u.nombre))
      expect(actual.siguienteCursor === null).toBe(actual.siguienteCursorNombre === null)
      if (actual.siguienteCursor === null) break
      const ultima = actual.usuarios.at(-1)
      expect(ultima, "Precondición: una página con siguiente no viene vacía").toBeDefined()
      expect(actual.siguienteCursor).toBe(ultima?.id)
      expect(actual.siguienteCursorNombre).toBe(ultima?.nombre)
      consulta = {
        q: m,
        limite: "2",
        cursor: actual.siguienteCursor,
        cursorNombre: actual.siguienteCursorNombre ?? "",
      }
    }
    expect(recorridas).toEqual(esperado)
  })

  it("ADM-1E02: un cursor que no cumple los filtros (mandado con su nombre real) → 400", async () => {
    const m = marcaDePrueba()
    const maestro = await crearCuentaDeGestion(idsUsuarios, {
      nombre: `${m} Maestro`,
      rol: "maestro",
    })
    const alumna = await crearCuentaDeGestion(idsUsuarios, { nombre: `${m} Alumna` })
    const ajena = await crearCuentaDeGestion(idsUsuarios, { nombre: `${marcaDePrueba()} Ajena` })

    esperarCursorInvalido(
      await listar({ q: m, rol: "estudiante", cursor: maestro.id, cursorNombre: maestro.nombre }),
      "rol",
    )
    esperarCursorInvalido(
      await listar({
        q: m,
        rol: "estudiante",
        estadoPago: "deudor",
        cursor: alumna.id,
        cursorNombre: alumna.nombre,
      }),
      "estado de pago",
    )
    esperarCursorInvalido(
      await listar({ q: m, cursor: ajena.id, cursorNombre: ajena.nombre }),
      "búsqueda",
    )
    esperarCursorInvalido(
      await listar({ q: m, cursor: randomUUID(), cursorNombre: "Nadie" }),
      "inexistente",
    )
  })

  it("ADM-1E02: las cuentas dadas de baja salen con activo: false; los datos de pago y acceso solo en las filas de estudiantes", async () => {
    const m = marcaDePrueba()
    const inactiva = await crearCuentaDeGestion(idsUsuarios, {
      nombre: `${m} Inactiva`,
      activo: false,
      estadoPago: "deudor",
      accesoRestringido: true,
    })
    const maestro = await crearCuentaDeGestion(idsUsuarios, {
      nombre: `${m} Maestro`,
      rol: "maestro",
    })
    const { usuarios } = pagina(await listar({ q: m }))
    const deLaInactiva = usuarios.find((u) => u.id === inactiva.id)
    const delMaestro = usuarios.find((u) => u.id === maestro.id)
    expect(deLaInactiva, "Falta la cuenta inactiva en la lista").toBeDefined()
    expect(delMaestro, "Falta el maestro en la lista").toBeDefined()
    expect(deLaInactiva).toMatchObject({
      activo: false,
      estadoPago: "deudor",
      accesoRestringido: true,
      motivoRestriccion: null,
      fechaRestriccion: null,
      fechaEstadoPago: null,
    })
    expect(Object.keys(delMaestro ?? {}).sort()).toEqual([
      "activo",
      "creadoEn",
      "email",
      "id",
      "nombre",
      "rol",
    ])
    expect(Object.keys(deLaInactiva ?? {}).sort()).toEqual([
      "accesoRestringido",
      "activo",
      "creadoEn",
      "email",
      "estadoPago",
      "fechaEstadoPago",
      "fechaRestriccion",
      "id",
      "motivoRestriccion",
      "nombre",
      "rol",
    ])
  })
})

describe("ficha y nombre (ADM-1E03, ADM-1E04)", () => {
  it("ADM-1E03: la ficha de un id inexistente → 404 USUARIO_NO_ENCONTRADO; la de una cuenta existente, su fila", async () => {
    const inexistente = await pedir({ method: "GET", url: `/api/admin/usuarios/${randomUUID()}` })
    expect(inexistente.statusCode).toBe(404)
    expect(error(inexistente)).toEqual({
      codigo: "USUARIO_NO_ENCONTRADO",
      mensaje: "No hay ninguna cuenta con ese identificador.",
    })

    const cuenta = await crearCuentaDeGestion(idsUsuarios, { nombre: `${marcaDePrueba()} Ficha` })
    const ficha = await pedir({ method: "GET", url: `/api/admin/usuarios/${cuenta.id}` })
    expect(ficha.statusCode).toBe(200)
    expect(usuarioAdminFilaSchema.parse(ficha.json())).toMatchObject({
      id: cuenta.id,
      nombre: cuenta.nombre,
      email: cuenta.email,
      rol: "estudiante",
      activo: true,
    })
  })

  it("ADM-1E04: editar el nombre cambia nombre y nombre_busqueda: la búsqueda encuentra el nuevo y no el viejo", async () => {
    const viejo = marcaDePrueba()
    const nuevo = marcaDePrueba()
    const cuenta = await crearCuentaDeGestion(idsUsuarios, {
      nombre: `${viejo} Antes`,
      rol: "maestro",
    })

    const respuesta = await renombrar(cuenta.id, `  ${nuevo}   Después  Ñúñez `)
    expect(respuesta.statusCode, respuesta.body).toBe(200)
    expect(usuarioAdminFilaSchema.parse(respuesta.json())).toMatchObject({
      id: cuenta.id,
      nombre: `${nuevo} Después Ñúñez`,
      rol: "maestro",
    })
    expect(await leerFilaDb(cuenta.id)).toMatchObject({
      nombre: `${nuevo} Después Ñúñez`,
      nombreBusqueda: `${nuevo} despues nunez`,
    })
    expect(pagina(await listar({ q: viejo })).usuarios).toEqual([])
    expect(pagina(await listar({ q: `${nuevo} despues nu` })).usuarios.map((u) => u.id)).toEqual([
      cuenta.id,
    ])
  })

  it("ADM-1E04: un nombre que nombreSchema rechaza → 400 VALIDACION sin escribir; una cuenta inexistente → 404", async () => {
    const cuenta = await crearCuentaDeGestion(idsUsuarios, { nombre: `${marcaDePrueba()} Fija` })
    for (const nombre of ["a", "   ", "x".repeat(121), "Ana\u0000Ruiz", "Ana\u202eRuiz", 7]) {
      const respuesta = await renombrar(cuenta.id, nombre as string)
      expect(respuesta.statusCode, JSON.stringify(nombre)).toBe(400)
      expect(error(respuesta).codigo).toBe("VALIDACION")
    }
    expect((await leerFilaDb(cuenta.id))?.nombre).toBe(cuenta.nombre)

    const inexistente = await renombrar(randomUUID(), "Nombre Válido")
    expect(inexistente.statusCode).toBe(404)
    expect(error(inexistente).codigo).toBe("USUARIO_NO_ENCONTRADO")
  })
})

describe("alta de alumno (ADM-1E07)", () => {
  it("ADM-1E07: 201 con la temporal y Cache-Control: no-store; la cuenta nace estudiante, activa, al corriente y con el cambio obligatorio; el login con la temporal lleva al cambio obligatorio", async () => {
    const email = correoDePrueba("alta")
    correosCreados.push(email)
    const respuesta = await pedir({
      method: "POST",
      url: "/api/admin/alumnos",
      payload: { nombre: "  Alumna   Nueva ", email: `  ${email.toUpperCase()} ` },
    })
    expect(respuesta.statusCode, respuesta.body).toBe(201)
    expect(respuesta.headers["cache-control"]).toBe("no-store")
    const { usuario, contrasenaTemporal } = altaAlumnoRespuestaSchema.parse(respuesta.json())
    expect(usuario).toMatchObject({
      nombre: "Alumna Nueva",
      email,
      rol: "estudiante",
      activo: true,
      estadoPago: "al_corriente",
      accesoRestringido: false,
    })
    const db = await obtenerDb().usuario.findUnique({ where: { email } })
    expect(db).toMatchObject({
      rol: "estudiante",
      activo: true,
      estadoPago: "al_corriente",
      debeCambiarContrasena: true,
      accesoRestringido: false,
    })
    expect(db?.hashContrasena).not.toContain(contrasenaTemporal)

    const sesion = await iniciarSesionDePrueba(obtenerApp(), {
      email,
      contrasena: contrasenaTemporal,
    })
    // El login con la temporal entra (200) y todo lo demás pide el cambio obligatorio, también /me
    // (el contrato de admin-restablecimiento.integracion).
    expect(sesion.respuesta.statusCode).toBe(200)
    const me = await consultarMe(obtenerApp(), sesion.tokenAcceso)
    expect(me.statusCode).toBe(403)
    expect(error(me).codigo).toBe("CAMBIO_DE_CONTRASENA_REQUERIDO")
    const bloqueada = await obtenerApp().inject({
      method: "GET",
      url: "/api/clases/inscritas",
      headers: { authorization: `Bearer ${sesion.tokenAcceso}` },
    })
    expect(bloqueada.statusCode).toBe(403)
    expect(error(bloqueada).codigo).toBe("CAMBIO_DE_CONTRASENA_REQUERIDO")
  })

  it("ADM-1E07: un correo repetido, también con otra capitalización → 409 CORREO_EN_USO sin crear otra cuenta", async () => {
    const existente = await crearCuentaDeGestion(idsUsuarios, { nombre: `${marcaDePrueba()} Ya` })
    for (const email of [existente.email, existente.email.toUpperCase()]) {
      const respuesta = await pedir({
        method: "POST",
        url: "/api/admin/alumnos",
        payload: { nombre: "Otra Persona", email },
      })
      expect(respuesta.statusCode, email).toBe(409)
      expect(error(respuesta).codigo).toBe("CORREO_EN_USO")
    }
    expect(await obtenerDb().usuario.count({ where: { email: existente.email } })).toBe(1)
  })
})

describe("compatibilidad y claves (ADM-1E20, ADM-1E15)", () => {
  it("ADM-1E20: POST /admin/usuarios/buscar sigue respondiendo como hoy", async () => {
    const cuenta = await crearCuentaDeGestion(idsUsuarios, { nombre: `${marcaDePrueba()} Buscar` })
    const respuesta = await pedir({
      method: "POST",
      url: "/api/admin/usuarios/buscar",
      payload: { email: cuenta.email },
    })
    expect(respuesta.statusCode).toBe(200)
    expect(respuesta.json()).toEqual({
      usuario: {
        id: cuenta.id,
        nombre: cuenta.nombre,
        email: cuenta.email,
        rol: "estudiante",
        activo: true,
      },
    })
  })

  it("ADM-1E15: las claves de todo el JSON de cada ruta de 01e (lista, ficha, nombre, activo, alta, estado de pago, acceso, resumen y movimientos) no incluyen hashContrasena, nombreBusqueda, debeCambiarContrasena ni enlaceRegistroId", async () => {
    const cuenta = await crearCuentaDeGestion(idsUsuarios, { nombre: `${marcaDePrueba()} Claves` })
    await pedir({ method: "GET", url: `/api/admin/usuarios/${cuenta.id}` })
    await listar({ q: cuenta.nombre.slice(0, 12) })
    const maestro = await crearCuentaDeGestion(idsUsuarios, {
      nombre: `${marcaDePrueba()} Claves Maestro`,
      rol: "maestro",
    })
    const otras: Parameters<typeof pedirConToken>[2][] = [
      {
        method: "PUT",
        url: `/api/admin/usuarios/${maestro.id}/activo`,
        payload: { activo: false },
      },
      { method: "PUT", url: `/api/admin/usuarios/${maestro.id}/activo`, payload: { activo: true } },
      {
        method: "PUT",
        url: "/api/admin/alumnos/estado-pago",
        payload: { alumnoIds: [cuenta.id], estadoPago: "deudor" },
      },
      {
        method: "PUT",
        url: `/api/admin/alumnos/${cuenta.id}/acceso`,
        payload: { restringido: true, motivo: "Claves" },
      },
      { method: "GET", url: "/api/admin/resumen" },
      { method: "GET", url: "/api/admin/movimientos-inscripcion?limite=5" },
      {
        method: "PUT",
        url: `/api/admin/usuarios/${maestro.id}/nombre`,
        payload: { nombre: `${marcaDePrueba()} Claves Renombrado` },
      },
    ]
    for (const opciones of otras) {
      const respuesta = await pedir(opciones)
      expect(respuesta.statusCode, `${opciones.method} ${opciones.url}`).toBe(200)
    }
    const correoAlta = correoDePrueba("claves")
    correosCreados.push(correoAlta)
    const alta = await pedir({
      method: "POST",
      url: "/api/admin/alumnos",
      payload: { nombre: "Alta Claves", email: correoAlta },
    })
    expect(alta.statusCode).toBe(201)
    const rutasVistas = new Set(
      respuestas.map((r) => `${r.raw.req.method ?? ""} ${(r.raw.req.url ?? "").split("?", 1)[0]}`),
    )
    for (const ruta of [
      "GET /api/admin/usuarios",
      `GET /api/admin/usuarios/${cuenta.id}`,
      "POST /api/admin/alumnos",
      "PUT /api/admin/alumnos/estado-pago",
      "GET /api/admin/resumen",
      "GET /api/admin/movimientos-inscripcion",
    ]) {
      expect(rutasVistas, `Precondición: se pidió ${ruta}`).toContain(ruta)
    }
    expect(
      [...rutasVistas].some((r) => /^PUT \/api\/admin\/usuarios\/[^/]+\/nombre$/.test(r)),
      "Precondición: se pidió PUT …/nombre",
    ).toBe(true)
    const conJson = respuestas.filter(
      (r) => r.statusCode < 300 && r.headers["content-type"]?.toString().includes("json"),
    )
    expect(conJson.length, "Precondición: hay respuestas de las rutas de 01e").toBeGreaterThan(10)
    for (const respuesta of conJson) {
      const claves = clavesDe(respuesta.json())
      for (const prohibida of CLAVES_PROHIBIDAS) {
        expect(claves, respuesta.raw.req.url).not.toContain(prohibida)
      }
    }
  })
})

describe("cursor con posición en GET /admin/usuarios (ADM-1E21)", () => {
  // Cinco cuentas con un prefijo propio, N1 < N2 < N3 < N4 < N5 por nombre.
  const crearCinco = async (
    opciones: { estadoPago?: "deudor" } = {},
  ): Promise<{ m: string; n: CuentaDeGestion[] }> => {
    const m = marcaDePrueba()
    const n: CuentaDeGestion[] = []
    for (const letra of ["b", "c", "d", "e", "f"]) {
      n.push(await crearCuentaDeGestion(idsUsuarios, { nombre: `${m} ${letra}`, ...opciones }))
    }
    return { m, n }
  }

  const ids = (respuesta: LightMyRequestResponse): string[] =>
    pagina(respuesta).usuarios.map((u) => u.id)

  const primeraPagina = async (consulta: Record<string, string>) => {
    const primera = pagina(await listar({ ...consulta, limite: "2" }))
    expect(primera.siguienteCursor, "Precondición: hay página siguiente").not.toBeNull()
    return {
      ids: primera.usuarios.map((u) => u.id),
      cursor: primera.siguienteCursor ?? "",
      cursorNombre: primera.siguienteCursorNombre ?? "",
    }
  }

  it("ADM-1E21: página 1 [N1, N2] con la posición de N2; (a) la siguiente → [N3, N4]", async () => {
    const { m, n } = await crearCinco()
    const p1 = await primeraPagina({ q: m })
    expect(p1.ids).toEqual([n[0]?.id, n[1]?.id])
    expect(p1.cursor).toBe(n[1]?.id)
    expect(p1.cursorNombre).toBe(n[1]?.nombre)
    const siguiente = await listar({
      q: m,
      limite: "2",
      cursor: p1.cursor,
      cursorNombre: p1.cursorNombre,
    })
    expect(ids(siguiente)).toEqual([n[2]?.id, n[3]?.id])
  })

  it("ADM-1E21: (b) N2 renombrada hacia delante, hacia atrás o solo en mayúsculas → 400 cursor: no es válido, nunca 200; (c) devuelta a su nombre exacto → 200 [N3, N4]", async () => {
    const { m, n } = await crearCinco()
    const n2 = n[1]
    expect(n2, "Precondición: N2 existe").toBeDefined()
    const p1 = await primeraPagina({ q: m })
    for (const otroNombre of [`${m} ez`, `${m} a`, `${m.toUpperCase()} C`]) {
      expect((await renombrar(n2?.id ?? "", otroNombre)).statusCode).toBe(200)
      esperarCursorInvalido(
        await listar({ q: m, limite: "2", cursor: p1.cursor, cursorNombre: p1.cursorNombre }),
        otroNombre,
      )
    }
    expect((await renombrar(n2?.id ?? "", n2?.nombre ?? "")).statusCode).toBe(200)
    const devuelta = await listar({
      q: m,
      limite: "2",
      cursor: p1.cursor,
      cursorNombre: p1.cursorNombre,
    })
    expect(ids(devuelta)).toEqual([n[2]?.id, n[3]?.id])
  })

  it("ADM-1E21: (d) un cursorNombre que no coincide → 400: otro nombre, el mismo con espacios de más, el texto vacío", async () => {
    const { m, n } = await crearCinco()
    const p1 = await primeraPagina({ q: m })
    for (const cursorNombre of [
      n[0]?.nombre ?? "x",
      ` ${p1.cursorNombre}`,
      `${p1.cursorNombre} `,
      "",
    ]) {
      esperarCursorInvalido(
        await listar({ q: m, limite: "2", cursor: p1.cursor, cursorNombre }),
        JSON.stringify(cursorNombre),
      )
    }
  })

  it("ADM-1E21: (e) cursor sin cursorNombre → 400; (f) cursorNombre sin cursor → 400", async () => {
    const { m } = await crearCinco()
    const p1 = await primeraPagina({ q: m })
    esperarCursorInvalido(await listar({ q: m, limite: "2", cursor: p1.cursor }), "(e)")
    esperarCursorInvalido(await listar({ q: m, limite: "2", cursorNombre: p1.cursorNombre }), "(f)")
  })

  it("ADM-1E21: (g) un nombre con espacios, +, &, %, ñ y acentos como cursorNombre codificado → 200 con la página siguiente", async () => {
    const m = marcaDePrueba()
    const primera = await crearCuentaDeGestion(idsUsuarios, {
      nombre: `${m} a Ñandú + & % José  Ü`,
    })
    const segunda = await crearCuentaDeGestion(idsUsuarios, { nombre: `${m} b` })
    const p1 = pagina(await listar({ q: m, limite: "1" }))
    expect(p1.usuarios.map((u) => u.id)).toEqual([primera.id])
    expect(p1.siguienteCursorNombre).toBe(primera.nombre)
    const url = urlDeUsuarios({
      q: m,
      limite: "1",
      cursor: p1.siguienteCursor ?? "",
      cursorNombre: p1.siguienteCursorNombre ?? "",
    })
    const p2 = pagina(await pedir({ method: "GET", url }))
    expect(p2.usuarios.map((u) => u.id)).toEqual([segunda.id])
  })

  it("ADM-1E21: (h) con rol=estudiante&estadoPago=deudor, el mismo (a) y (b)", async () => {
    const { m, n } = await crearCinco({ estadoPago: "deudor" })
    const filtros = { q: m, rol: "estudiante", estadoPago: "deudor" }
    const p1 = await primeraPagina(filtros)
    expect(p1.ids).toEqual([n[0]?.id, n[1]?.id])
    const siguiente = await listar({
      ...filtros,
      limite: "2",
      cursor: p1.cursor,
      cursorNombre: p1.cursorNombre,
    })
    expect(ids(siguiente)).toEqual([n[2]?.id, n[3]?.id])
    expect((await renombrar(n[1]?.id ?? "", `${m} ez`)).statusCode).toBe(200)
    esperarCursorInvalido(
      await listar({ ...filtros, limite: "2", cursor: p1.cursor, cursorNombre: p1.cursorNombre }),
      "(h) renombrada",
    )
  })

  it("ADM-1E21: (i) R-19, lo que la posición no cubre: con la página 1 [N1, N2], renombrar N4 antes de N1 hace que la página 2 responda 200 [N3, N5]", async () => {
    // R-19 (riesgo aceptado por el humano, 2026-11-04): la posición protege solo la fila del
    // cursor; si otra fila se mueve entre dos páginas, la siguiente la salta sin aviso.
    const { m, n } = await crearCinco()
    const p1 = await primeraPagina({ q: m })
    expect(p1.ids).toEqual([n[0]?.id, n[1]?.id])
    expect((await renombrar(n[3]?.id ?? "", `${m} a`)).statusCode).toBe(200)
    const p2 = await listar({ q: m, limite: "2", cursor: p1.cursor, cursorNombre: p1.cursorNombre })
    expect(ids(p2)).toEqual([n[2]?.id, n[4]?.id])
  })
})
