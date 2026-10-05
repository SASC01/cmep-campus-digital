import { randomBytes, randomUUID } from "node:crypto"

import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { normalizarParaBusqueda } from "../src/core/auth/normalizacion.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearClaseDePrueba,
  crearComentarioDePrueba,
  crearPublicacionDePrueba,
  idDelAdminDePrueba,
  inscribirDePrueba,
  leerClaseDb,
} from "./ayudas-clases.js"

// Ataque del Tester (CLASES-02a, ronda 1): las seis rutas de gestión del admin y las que se le
// abren, contra la matriz de "Autorización" del plan de CLASES-02, ruta por ruta; las que NO se le
// abren; claseId manipulado; maestroIds manipulados; idempotencia; lista institucional con cursor
// manipulado; buscador de maestros; respuestas al alumno; escritura doble de clases.maestro_id
// (punto 4: nada la lee). Cuentas creadas directamente (sin argon2: solo se usa el token firmado).

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
let idAdmin = ""
let tokenAdmin = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const ficha = (): string => `qz${randomBytes(5).toString("hex")}`

interface Cuenta {
  id: string
  email: string
  nombre: string
  token: string
}

const crearCuenta = async ({
  nombre,
  rol = "estudiante",
  activo = true,
  accesoRestringido = false,
  debeCambiarContrasena = false,
  estadoPago = "al_corriente",
}: {
  nombre: string
  rol?: "estudiante" | "maestro"
  activo?: boolean
  accesoRestringido?: boolean
  debeCambiarContrasena?: boolean
  estadoPago?: "al_corriente" | "deudor"
}): Promise<Cuenta> => {
  const email = `g02a-r1-${randomUUID()}@pruebas.local`
  const { id } = await obtenerDb().usuario.create({
    data: {
      email,
      hashContrasena: "sin-uso-en-esta-prueba",
      nombre,
      nombreBusqueda: normalizarParaBusqueda(nombre),
      rol,
      activo,
      accesoRestringido,
      debeCambiarContrasena,
      estadoPago,
    },
    select: { id: true },
  })
  idsUsuarios.push(id)
  return { id, email, nombre, token: await firmarTokenDePrueba({ usuarioId: id }) }
}

type Metodo = "GET" | "HEAD" | "POST" | "PUT" | "DELETE"

const pedir = (
  method: Metodo,
  url: string,
  token: string | undefined,
  payload?: unknown,
): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method,
    url,
    ...(payload === undefined ? {} : { payload: payload as Record<string, unknown> }),
    headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
  })

const pedirCrudo = (url: string, token: string, crudo: string): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method: "POST",
    url,
    payload: crudo,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  })

const codigoDe = (r: LightMyRequestResponse): string => {
  if (r.body === "") return ""
  try {
    return (JSON.parse(r.body) as { error?: { codigo?: string } }).error?.codigo ?? ""
  } catch {
    return ""
  }
}

const mensajeDe = (r: LightMyRequestResponse): string => {
  try {
    return (JSON.parse(r.body) as { error?: { mensaje?: string } }).error?.mensaje ?? ""
  } catch {
    return ""
  }
}

const EN_INGLES = /Invalid|expected|received|Required|discriminator|Unrecognized/

const maestrosDe = async (claseId: string): Promise<string[]> => {
  const filas = await obtenerDb().$queryRaw<{ maestro_id: string }[]>`
    SELECT maestro_id::text AS maestro_id FROM maestros_de_clase
    WHERE clase_id = ${claseId}::uuid ORDER BY creado_en, maestro_id`
  return filas.map((fila) => fila.maestro_id)
}

const clasesConNombre = (nombre: string): Promise<number> =>
  obtenerDb().clase.count({ where: { nombre } })

// Claves de todos los objetos de un JSON, en cualquier profundidad.
const clavesDe = (valor: unknown): string[] => {
  const claves: string[] = []
  const pila: unknown[] = [valor]
  while (pila.length > 0) {
    const actual = pila.pop()
    if (actual === null || typeof actual !== "object") continue
    for (const [clave, hijo] of Object.entries(actual)) {
      claves.push(clave)
      pila.push(hijo)
    }
  }
  return claves
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
  idAdmin = await idDelAdminDePrueba()
  tokenAdmin = await firmarTokenDePrueba({ usuarioId: idAdmin })
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("ataque CLASES-02a r1: las seis rutas de gestión, identidad por identidad", () => {
  it("sin token 401; estudiante, maestro de la clase y maestro ajeno 403 ROL_NO_PERMITIDO; restringido 403 ACCESO_RESTRINGIDO; cambio pendiente 403 CAMBIO_DE_CONTRASENA_REQUERIDO; inactivo 401; nada de lo negado escribe; el admin sí puede todo", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const ajeno = await crearCuenta({ nombre: `Ajeno ${t}`, rol: "maestro" })
    const nuevo = await crearCuenta({ nombre: `Nuevo ${t}`, rol: "maestro" })
    const alumno = await crearCuenta({ nombre: `Alumno ${t}` })
    const restringido = await crearCuenta({ nombre: `Restringido ${t}`, accesoRestringido: true })
    const conCambio = await crearCuenta({
      nombre: `Cambio ${t}`,
      rol: "maestro",
      debeCambiarContrasena: true,
    })
    const inactivo = await crearCuenta({ nombre: `Inactivo ${t}`, rol: "maestro", activo: false })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id, nombre: `C ${t}` })
    await inscribirDePrueba(clase.id, alumno.id)
    await inscribirDePrueba(clase.id, restringido.id)
    await crearClaseDePrueba(idsClases, { maestroId: conCambio.id })

    const nombreNuevo = `Creada ${t}`
    const rutas: { nombre: string; metodo: Metodo; url: string; payload?: unknown }[] = [
      { nombre: "lista", metodo: "GET", url: "/api/admin/clases" },
      { nombre: "lista HEAD", metodo: "HEAD", url: "/api/admin/clases" },
      {
        nombre: "crear",
        metodo: "POST",
        url: "/api/admin/clases",
        payload: { nombre: nombreNuevo, maestroIds: [dueno.id] },
      },
      {
        nombre: "editar",
        metodo: "PUT",
        url: `/api/admin/clases/${clase.id}`,
        payload: { nombre: `Robada ${t}` },
      },
      {
        nombre: "asignar",
        metodo: "POST",
        url: `/api/admin/clases/${clase.id}/maestros`,
        payload: { maestroId: nuevo.id },
      },
      {
        nombre: "retirar",
        metodo: "DELETE",
        url: `/api/admin/clases/${clase.id}/maestros/${dueno.id}`,
      },
      { nombre: "candidatos", metodo: "GET", url: `/api/admin/maestros/candidatos?q=${t}` },
      {
        nombre: "candidatos HEAD",
        metodo: "HEAD",
        url: `/api/admin/maestros/candidatos?q=${t}`,
      },
    ]
    const negados: [string, string | undefined, number, string][] = [
      ["sin token", undefined, 401, "NO_AUTENTICADO"],
      ["estudiante inscrito", alumno.token, 403, "ROL_NO_PERMITIDO"],
      ["maestro de la clase", dueno.token, 403, "ROL_NO_PERMITIDO"],
      ["maestro ajeno", ajeno.token, 403, "ROL_NO_PERMITIDO"],
      ["restringido inscrito", restringido.token, 403, "ACCESO_RESTRINGIDO"],
      ["maestro con cambio pendiente", conCambio.token, 403, "CAMBIO_DE_CONTRASENA_REQUERIDO"],
      ["maestro inactivo", inactivo.token, 401, ""],
    ]

    const discrepancias: string[] = []
    for (const ruta of rutas) {
      for (const [quien, token, estado, codigo] of negados) {
        const r = await pedir(ruta.metodo, ruta.url, token, ruta.payload)
        const obtenido = ruta.metodo === "HEAD" ? codigo : codigoDe(r)
        const codigoOk = codigo === "" ? true : obtenido === codigo
        if (r.statusCode !== estado || !codigoOk)
          discrepancias.push(`${ruta.nombre} con ${quien}: ${r.statusCode} ${r.body.slice(0, 120)}`)
        if (ruta.metodo === "HEAD" && r.body !== "")
          discrepancias.push(`${ruta.nombre} con ${quien}: HEAD con cuerpo`)
        if (r.body.includes(dueno.email) || r.body.includes(nuevo.email))
          discrepancias.push(`${ruta.nombre} con ${quien}: correo de un maestro en la respuesta`)
      }
    }
    expect(discrepancias).toEqual([])

    // Nada de lo negado escribió.
    expect(await clasesConNombre(nombreNuevo)).toBe(0)
    expect((await leerClaseDb(clase.id))?.nombre).toBe(`C ${t}`)
    expect(await maestrosDe(clase.id)).toEqual([dueno.id])

    // El admin sí: lista, crea, edita, asigna, retira (al de maestro_id) y busca.
    const lista = await pedir("GET", "/api/admin/clases", tokenAdmin)
    expect(lista.statusCode, lista.body).toBe(200)
    const creada = await pedir("POST", "/api/admin/clases", tokenAdmin, {
      nombre: nombreNuevo,
      maestroIds: [dueno.id],
    })
    expect(creada.statusCode, creada.body).toBe(201)
    idsClases.push(creada.json<{ clase: { id: string } }>().clase.id)
    expect(
      (await pedir("PUT", `/api/admin/clases/${clase.id}`, tokenAdmin, { nombre: `Editada ${t}` }))
        .statusCode,
    ).toBe(200)
    const asignada = await pedir("POST", `/api/admin/clases/${clase.id}/maestros`, tokenAdmin, {
      maestroId: nuevo.id,
    })
    expect(asignada.statusCode, asignada.body).toBe(200)
    const retirada = await pedir(
      "DELETE",
      `/api/admin/clases/${clase.id}/maestros/${dueno.id}`,
      tokenAdmin,
    )
    expect(retirada.statusCode, retirada.body).toBe(200)
    expect(retirada.json()).toEqual({ maestros: [{ id: nuevo.id, nombre: nuevo.nombre }] })
    expect((await leerClaseDb(clase.id))?.maestroId).toBe(nuevo.id)
    const buscar = await pedir("GET", `/api/admin/maestros/candidatos?q=${t}`, tokenAdmin)
    expect(buscar.statusCode).toBe(200)
  })
})

describe("ataque CLASES-02a r1: el admin en las rutas que NO se le abren", () => {
  // CLASES-02b ronda 0 (C-9, §D-2B3, P-03 a y matriz de "Autorización"): en 02b se le abren al
  // admin el muro (leer, publicar, borrar publicaciones y comentarios por la ruta general) y los
  // archivos. Siguen cerradas para él personas, inscritas, impartidas, unirse, comentar (P-03 a) y
  // mis-comentarios: 403 ROL_NO_PERMITIDO sin escribir ni borrar nada. Las que se abren se comprueban
  // aquí solo en lo que no depende del almacén (el muro); los archivos del admin los prueba
  // archivos-d-r1 con un almacén en memoria.
  it("personas, inscritas, impartidas, unirse, comentar y mis-comentarios: 403 ROL_NO_PERMITIDO y nada se escribe ni se borra; el muro ya se le abre (C-9)", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const alumno = await crearCuenta({ nombre: `Alumno ${t}` })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    await inscribirDePrueba(clase.id, alumno.id)
    const publicacionId = await crearPublicacionDePrueba({ claseId: clase.id, autorId: dueno.id })
    const comentarioId = await crearComentarioDePrueba({ publicacionId, autorId: alumno.id })
    const base = `/api/clases/${clase.id}`

    const antes = {
      publicaciones: await obtenerDb().publicacion.count({ where: { claseId: clase.id } }),
      comentarios: await obtenerDb().comentario.count({ where: { publicacionId } }),
      archivos: await obtenerDb().archivo.count({ where: { claseId: clase.id } }),
    }
    const casos: [Metodo, string, unknown?][] = [
      ["GET", `${base}/personas`],
      ["HEAD", `${base}/personas`],
      ["GET", "/api/clases/inscritas"],
      ["HEAD", "/api/clases/inscritas"],
      ["GET", "/api/clases/impartidas"],
      ["HEAD", "/api/clases/impartidas"],
      ["POST", "/api/clases/unirse", { codigo: clase.codigoInvitacion }],
      ["POST", `${base}/publicaciones/${publicacionId}/comentarios`, { texto: "del admin" }],
      ["DELETE", `${base}/mis-comentarios/${comentarioId}`],
    ]
    const fallas: string[] = []
    for (const [metodo, url, payload] of casos) {
      const r = await pedir(metodo, url, tokenAdmin, payload)
      const codigo = metodo === "HEAD" ? "ROL_NO_PERMITIDO" : codigoDe(r)
      if (r.statusCode !== 403 || codigo !== "ROL_NO_PERMITIDO")
        fallas.push(`${metodo} ${url}: ${r.statusCode} ${r.body.slice(0, 120)}`)
    }
    expect(fallas).toEqual([])
    expect(
      await obtenerDb().inscripcion.count({ where: { claseId: clase.id, usuarioId: idAdmin } }),
    ).toBe(0)
    expect({
      publicaciones: await obtenerDb().publicacion.count({ where: { claseId: clase.id } }),
      comentarios: await obtenerDb().comentario.count({ where: { publicacionId } }),
      archivos: await obtenerDb().archivo.count({ where: { claseId: clase.id } }),
    }).toEqual(antes)

    // Lo que se abre en 02b: leer el muro y los comentarios, publicar, y borrar el comentario de
    // una alumna y la publicación del maestro (el admin borra todo, §D-2B2).
    const abiertas: [Metodo, string, unknown, number][] = [
      ["GET", `${base}/publicaciones`, undefined, 200],
      ["GET", `${base}/publicaciones/${publicacionId}/comentarios`, undefined, 200],
      ["POST", `${base}/publicaciones`, { tipo: "anuncio", texto: "del admin" }, 201],
      [
        "DELETE",
        `${base}/publicaciones/${publicacionId}/comentarios/${comentarioId}`,
        undefined,
        204,
      ],
      ["DELETE", `${base}/publicaciones/${publicacionId}`, undefined, 204],
    ]
    const abiertasFallidas: string[] = []
    for (const [metodo, url, payload, estado] of abiertas) {
      const r = await pedir(metodo, url, tokenAdmin, payload)
      if (r.statusCode !== estado)
        abiertasFallidas.push(`${metodo} ${url}: ${r.statusCode} ${r.body.slice(0, 120)}`)
    }
    expect(abiertasFallidas).toEqual([])
    expect(await obtenerDb().comentario.count({ where: { id: comentarioId } })).toBe(0)
    expect(await obtenerDb().publicacion.count({ where: { id: publicacionId } })).toBe(0)
    expect(await obtenerDb().publicacion.count({ where: { claseId: clase.id } })).toBe(1)
  })

  it("el admin no se inscribe ni como alumno ni como maestro: alta manual con su id y asignarse a sí mismo dan 404 sin escribir", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const alta = await pedir("POST", `/api/clases/${clase.id}/alumnos`, tokenAdmin, {
      alumnoId: idAdmin,
    })
    expect([alta.statusCode, codigoDe(alta)]).toEqual([404, "ALUMNO_NO_ENCONTRADO"])
    const asignarse = await pedir("POST", `/api/admin/clases/${clase.id}/maestros`, tokenAdmin, {
      maestroId: idAdmin,
    })
    expect([asignarse.statusCode, codigoDe(asignarse)]).toEqual([404, "MAESTRO_NO_ENCONTRADO"])
    const crear = await pedir("POST", "/api/admin/clases", tokenAdmin, {
      nombre: `Admin maestro ${t}`,
      maestroIds: [idAdmin],
    })
    expect([crear.statusCode, codigoDe(crear)]).toEqual([404, "MAESTRO_NO_ENCONTRADO"])
    expect(await clasesConNombre(`Admin maestro ${t}`)).toBe(0)
    expect(await maestrosDe(clase.id)).toEqual([dueno.id])
    expect(
      await obtenerDb().inscripcion.count({ where: { claseId: clase.id, usuarioId: idAdmin } }),
    ).toBe(0)
  })
})

describe("ataque CLASES-02a r1: claseId manipulado en las 10 rutas con :claseId que admiten al admin", () => {
  it("clase inexistente: el mismo 403 SIN_ACCESO_A_LA_CLASE en las 10; el UUID en mayúsculas es la misma clase; formatos raros nunca dan 2xx ni 500", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const otro = await crearCuenta({ nombre: `Otro ${t}`, rol: "maestro" })
    const alumno = await crearCuenta({ nombre: `Alumno ${t}` })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id, nombre: `Orig ${t}` })

    const rutasDe = (id: string): [Metodo, string, unknown?][] => [
      ["GET", `/api/clases/${id}`],
      ["GET", `/api/clases/${id}/codigo`],
      ["POST", `/api/clases/${id}/codigo`],
      ["GET", `/api/clases/${id}/alumnos`],
      ["GET", `/api/clases/${id}/alumnos/candidatos?q=${t}`],
      ["POST", `/api/clases/${id}/alumnos`, { alumnoId: alumno.id }],
      ["DELETE", `/api/clases/${id}/alumnos/${alumno.id}`],
      ["PUT", `/api/admin/clases/${id}`, { nombre: `Robada ${t}` }],
      ["POST", `/api/admin/clases/${id}/maestros`, { maestroId: otro.id }],
      ["DELETE", `/api/admin/clases/${id}/maestros/${dueno.id}`],
    ]

    const inexistente = randomUUID()
    const cuerpos = new Set<string>()
    const fallas: string[] = []
    for (const [metodo, url, payload] of rutasDe(inexistente)) {
      const r = await pedir(metodo, url, tokenAdmin, payload)
      if (r.statusCode !== 403 || codigoDe(r) !== "SIN_ACCESO_A_LA_CLASE")
        fallas.push(`inexistente ${metodo} ${url}: ${r.statusCode} ${r.body.slice(0, 120)}`)
      cuerpos.add(r.body)
    }
    expect(fallas).toEqual([])
    expect(cuerpos.size, [...cuerpos].join("\n")).toBe(1)

    const sinGuiones = clase.id.replaceAll("-", "")
    for (const variante of [
      `%20${clase.id}`,
      `${clase.id}%20`,
      `${clase.id}%00`,
      `%7B${clase.id}%7D`,
      sinGuiones,
      `${clase.id}'--`,
      `${clase.id}x`,
      "00000000-0000-0000-0000-000000000000",
    ]) {
      for (const [metodo, url, payload] of rutasDe(variante)) {
        const r = await pedir(metodo, url, tokenAdmin, payload)
        if (r.statusCode < 400 || r.statusCode >= 500)
          fallas.push(`${variante} ${metodo} ${url}: ${r.statusCode} ${r.body.slice(0, 120)}`)
      }
    }
    expect(fallas).toEqual([])
    expect((await leerClaseDb(clase.id))?.nombre).toBe(`Orig ${t}`)
    expect(await maestrosDe(clase.id)).toEqual([dueno.id])
    expect(await obtenerDb().inscripcion.count({ where: { claseId: clase.id } })).toBe(0)

    // En mayúsculas es la misma clase: el admin edita, asigna y retira sobre ella.
    const mayus = clase.id.toUpperCase()
    const editada = await pedir("PUT", `/api/admin/clases/${mayus}`, tokenAdmin, {
      nombre: `Mayus ${t}`,
    })
    expect(editada.statusCode, editada.body).toBe(200)
    expect(editada.json<{ clase: { id: string } }>().clase.id).toBe(clase.id)
    expect((await leerClaseDb(clase.id))?.nombre).toBe(`Mayus ${t}`)
    const asignada = await pedir("POST", `/api/admin/clases/${mayus}/maestros`, tokenAdmin, {
      maestroId: otro.id.toUpperCase(),
    })
    expect(asignada.statusCode, asignada.body).toBe(200)
    expect(await maestrosDe(clase.id)).toEqual([dueno.id, otro.id])
    const retirada = await pedir(
      "DELETE",
      `/api/admin/clases/${mayus}/maestros/${dueno.id.toUpperCase()}`,
      tokenAdmin,
    )
    expect(retirada.statusCode, retirada.body).toBe(200)
    expect(await maestrosDe(clase.id)).toEqual([otro.id])
    expect((await leerClaseDb(clase.id))?.maestroId).toBe(otro.id)
  })
})

describe("ataque CLASES-02a r1: crear con maestroIds manipulados (punto 6)", () => {
  it("vacío, ausente, nulo, texto, objeto, números, 3, 100, repetidos en mayúsculas, no UUID: 400; estudiante, admin, inactivo o inexistente (solos o con uno válido): 404; nada se escribe", async () => {
    const t = ficha()
    const valido = await crearCuenta({ nombre: `Valido ${t}`, rol: "maestro" })
    const otro = await crearCuenta({ nombre: `Otro ${t}`, rol: "maestro" })
    const tercero = await crearCuenta({ nombre: `Tercero ${t}`, rol: "maestro" })
    const estudiante = await crearCuenta({ nombre: `Est ${t}` })
    const inactivo = await crearCuenta({ nombre: `Inac ${t}`, rol: "maestro", activo: false })
    const nombre = `Manipulada ${t}`

    const de400: [string, unknown][] = [
      ["sin maestroIds", { nombre }],
      ["[]", { nombre, maestroIds: [] }],
      ["null", { nombre, maestroIds: null }],
      ["texto", { nombre, maestroIds: valido.id }],
      ["texto con comas", { nombre, maestroIds: `${valido.id},${otro.id}` }],
      ["objeto", { nombre, maestroIds: { 0: valido.id } }],
      ["números", { nombre, maestroIds: [1, 2] }],
      ["3 ids", { nombre, maestroIds: [valido.id, otro.id, tercero.id] }],
      ["100 ids", { nombre, maestroIds: Array.from({ length: 100 }, () => randomUUID()) }],
      ["repetido", { nombre, maestroIds: [valido.id, valido.id] }],
      ["repetido en mayúsculas", { nombre, maestroIds: [valido.id, valido.id.toUpperCase()] }],
      ["no UUID", { nombre, maestroIds: ["abc"] }],
      ["con null", { nombre, maestroIds: [valido.id, null] }],
      ["anidado", { nombre, maestroIds: [[valido.id]] }],
      ["con espacios", { nombre, maestroIds: [` ${valido.id} `] }],
      ["con llaves", { nombre, maestroIds: [`{${valido.id}}`] }],
    ]
    const de404: [string, string[]][] = [
      ["estudiante", [estudiante.id]],
      ["admin", [idAdmin]],
      ["inactivo", [inactivo.id]],
      ["inexistente", [randomUUID()]],
      ["válido + estudiante", [valido.id, estudiante.id]],
      ["válido + inactivo", [valido.id, inactivo.id]],
      ["válido + inexistente", [valido.id, randomUUID()]],
    ]
    const fallas: string[] = []
    for (const [etiqueta, cuerpo] of de400) {
      const r = await pedir("POST", "/api/admin/clases", tokenAdmin, cuerpo)
      if (r.statusCode !== 400 || codigoDe(r) !== "VALIDACION")
        fallas.push(`${etiqueta}: ${r.statusCode} ${r.body.slice(0, 160)}`)
      else if (EN_INGLES.test(mensajeDe(r))) fallas.push(`${etiqueta}: «${mensajeDe(r)}»`)
    }
    for (const [etiqueta, maestroIds] of de404) {
      const r = await pedir("POST", "/api/admin/clases", tokenAdmin, { nombre, maestroIds })
      if (r.statusCode !== 404 || codigoDe(r) !== "MAESTRO_NO_ENCONTRADO")
        fallas.push(`${etiqueta}: ${r.statusCode} ${r.body.slice(0, 160)}`)
    }
    expect(fallas).toEqual([])
    expect(await clasesConNombre(nombre)).toBe(0)
    expect(
      await obtenerDb().$queryRaw<{ n: number }[]>`
        SELECT count(*)::int AS n FROM maestros_de_clase
        WHERE maestro_id IN (${valido.id}::uuid, ${otro.id}::uuid, ${tercero.id}::uuid)`,
    ).toEqual([{ n: 0 }])
  })

  it("un id en mayúsculas se guarda en minúsculas; dos maestros quedan en el orden de S-05 (por id), maestro = maestros[0] = clases.maestro_id", async () => {
    const t = ficha()
    const a = await crearCuenta({ nombre: `A ${t}`, rol: "maestro" })
    const b = await crearCuenta({ nombre: `B ${t}`, rol: "maestro" })
    const [menor, mayor] = [a, b].sort((x, y) => (x.id < y.id ? -1 : 1))
    if (!menor || !mayor) throw new Error("Precondición: faltan maestros")

    const una = await pedir("POST", "/api/admin/clases", tokenAdmin, {
      nombre: `Una ${t}`,
      maestroIds: [a.id.toUpperCase()],
    })
    expect(una.statusCode, una.body).toBe(201)
    const claseUna = una.json<{ clase: { id: string; maestros: { id: string }[] } }>().clase
    idsClases.push(claseUna.id)
    expect(claseUna.maestros.map((m) => m.id)).toEqual([a.id])
    expect(await maestrosDe(claseUna.id)).toEqual([a.id])

    // Se pasan en orden inverso al de sus ids.
    const dos = await pedir("POST", "/api/admin/clases", tokenAdmin, {
      nombre: `Dos ${t}`,
      maestroIds: [mayor.id, menor.id],
    })
    expect(dos.statusCode, dos.body).toBe(201)
    const claseDos = dos.json<{
      clase: { id: string; maestro: { id: string }; maestros: { id: string; nombre: string }[] }
    }>().clase
    idsClases.push(claseDos.id)
    expect(claseDos.maestros.map((m) => m.id)).toEqual([menor.id, mayor.id])
    expect(claseDos.maestro.id).toBe(menor.id)
    expect((await leerClaseDb(claseDos.id))?.maestroId).toBe(menor.id)
    const detalle = await pedir("GET", `/api/clases/${claseDos.id}`, tokenAdmin)
    expect(detalle.json<{ clase: unknown }>().clase).toEqual(claseDos)
  })

  it("un cuerpo que no es objeto o con tipos incorrectos en crear y editar responde 400 en español, nunca 500", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const fallas: string[] = []
    for (const crudo of ['"hola"', "5", "null", "[]", '["x"]', "true", "{"]) {
      for (const url of ["/api/admin/clases", `/api/admin/clases/${clase.id}/maestros`]) {
        const r = await pedirCrudo(url, tokenAdmin, crudo)
        if (r.statusCode !== 400) fallas.push(`${url} ${crudo}: ${r.statusCode}`)
        else if (EN_INGLES.test(mensajeDe(r))) fallas.push(`${url} ${crudo}: «${mensajeDe(r)}»`)
      }
    }
    const casos: [Metodo, string, unknown][] = [
      ["POST", "/api/admin/clases", { nombre: 5, maestroIds: [dueno.id] }],
      ["POST", "/api/admin/clases", { nombre: "Clase", descripcion: 5, maestroIds: [dueno.id] }],
      ["POST", "/api/admin/clases", { nombre: "Clase", descripcion: null, maestroIds: [dueno.id] }],
      ["PUT", `/api/admin/clases/${clase.id}`, {}],
      ["PUT", `/api/admin/clases/${clase.id}`, { nombre: ["x"] }],
      ["PUT", `/api/admin/clases/${clase.id}`, { nombre: "Clase", descripcion: { a: 1 } }],
      ["POST", `/api/admin/clases/${clase.id}/maestros`, {}],
      ["POST", `/api/admin/clases/${clase.id}/maestros`, { maestroId: null }],
      ["POST", `/api/admin/clases/${clase.id}/maestros`, { maestroId: 5 }],
      ["POST", `/api/admin/clases/${clase.id}/maestros`, { maestroId: [dueno.id] }],
      ["POST", `/api/admin/clases/${clase.id}/maestros`, { maestroIds: [dueno.id] }],
      ["DELETE", `/api/admin/clases/${clase.id}/maestros/abc`, undefined],
    ]
    for (const [metodo, url, payload] of casos) {
      const r = await pedir(metodo, url, tokenAdmin, payload)
      if (r.statusCode !== 400)
        fallas.push(`${metodo} ${url} ${JSON.stringify(payload)}: ${r.statusCode}`)
      else if (EN_INGLES.test(mensajeDe(r)))
        fallas.push(`${metodo} ${url} ${JSON.stringify(payload)}: «${mensajeDe(r)}»`)
    }
    expect(fallas).toEqual([])
    expect(await maestrosDe(clase.id)).toEqual([dueno.id])
  })
})

describe("ataque CLASES-02a r1: idempotencia de asignar y retirar", () => {
  it("asignar dos veces (también en mayúsculas) y retirar a quien no está responden la misma lista sin escribir; retirar al único da 409 aunque venga en mayúsculas", async () => {
    const t = ficha()
    const a = await crearCuenta({ nombre: `A ${t}`, rol: "maestro" })
    const b = await crearCuenta({ nombre: `B ${t}`, rol: "maestro" })
    const c = await crearCuenta({ nombre: `C ${t}`, rol: "maestro" })
    const estudiante = await crearCuenta({ nombre: `E ${t}` })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: a.id })
    const url = `/api/admin/clases/${clase.id}/maestros`

    const unico = await pedir("DELETE", `${url}/${a.id.toUpperCase()}`, tokenAdmin)
    expect([unico.statusCode, codigoDe(unico)]).toEqual([409, "CLASE_SIN_MAESTRO"])
    expect(mensajeDe(unico)).toBe(
      "Una clase necesita al menos un maestro. Asigna a otro antes de quitar a este.",
    )

    const primera = await pedir("POST", url, tokenAdmin, { maestroId: b.id })
    const repetida = await pedir("POST", url, tokenAdmin, { maestroId: b.id.toUpperCase() })
    expect(primera.statusCode).toBe(200)
    expect(repetida.statusCode).toBe(200)
    expect(repetida.json()).toEqual(primera.json())
    expect(await maestrosDe(clase.id)).toHaveLength(2)

    const tope = await pedir("POST", url, tokenAdmin, { maestroId: c.id })
    expect([tope.statusCode, codigoDe(tope)]).toEqual([409, "TOPE_DE_MAESTROS"])
    expect(mensajeDe(tope)).toBe(
      "La clase ya tiene 2 maestros. Quita a uno antes de asignar a otro.",
    )

    for (const ausente of [c.id, estudiante.id, randomUUID(), idAdmin]) {
      const r = await pedir("DELETE", `${url}/${ausente}`, tokenAdmin)
      expect(r.statusCode, r.body).toBe(200)
      expect(r.json()).toEqual(primera.json())
    }
    expect(await maestrosDe(clase.id)).toEqual(
      primera.json<{ maestros: { id: string }[] }>().maestros.map((m) => m.id),
    )
    expect((await leerClaseDb(clase.id))?.maestroId).toBe(a.id)
  })
})

describe("ataque CLASES-02a r1: escritura doble (punto 4)", () => {
  it("con clases.maestro_id cambiado a mano a un maestro NO asignado, nada cambia: ni el acceso, ni las respuestas, ni impartidas, ni la lista del admin", async () => {
    const t = ficha()
    const asignado = await crearCuenta({ nombre: `Asignado ${t}`, rol: "maestro" })
    const intruso = await crearCuenta({ nombre: `Intruso ${t}`, rol: "maestro" })
    const alumno = await crearCuenta({ nombre: `Alumno ${t}` })
    const clase = await crearClaseDePrueba(idsClases, {
      maestroId: asignado.id,
      nombre: `Doble ${t}`,
    })
    await inscribirDePrueba(clase.id, alumno.id)
    await obtenerDb().$executeRaw`
      UPDATE clases SET maestro_id = ${intruso.id}::uuid WHERE id = ${clase.id}::uuid`
    expect((await leerClaseDb(clase.id))?.maestroId).toBe(intruso.id)

    const base = `/api/clases/${clase.id}`
    const fallas: string[] = []
    for (const [metodo, url] of [
      ["GET", base],
      ["GET", `${base}/codigo`],
      ["POST", `${base}/codigo`],
      ["GET", `${base}/alumnos`],
      ["GET", `${base}/personas`],
      ["GET", `${base}/publicaciones`],
    ] as const) {
      const r = await pedir(metodo, url, intruso.token)
      if (r.statusCode !== 403 || codigoDe(r) !== "SIN_ACCESO_A_LA_CLASE")
        fallas.push(`intruso ${metodo} ${url}: ${r.statusCode}`)
      const delAsignado = await pedir(metodo, url, asignado.token)
      if (delAsignado.statusCode !== 200)
        fallas.push(`asignado ${metodo} ${url}: ${delAsignado.statusCode}`)
    }
    expect(fallas).toEqual([])

    const impartidasIntruso = await pedir("GET", "/api/clases/impartidas?limite=100", intruso.token)
    expect(impartidasIntruso.body).not.toContain(clase.id)
    const impartidasAsignado = await pedir(
      "GET",
      "/api/clases/impartidas?limite=100",
      asignado.token,
    )
    expect(impartidasAsignado.body).toContain(clase.id)

    const esperado = [{ id: asignado.id, nombre: asignado.nombre }]
    const detalle = (await pedir("GET", base, alumno.token)).json<{
      clase: { maestro: unknown; maestros: unknown }
    }>().clase
    expect(detalle.maestros).toEqual(esperado)
    expect(detalle.maestro).toEqual(esperado[0])
    // CLASES-02b ronda 0 (C-11, §D-2B4): "Personas" trae el correo completo de cada maestro y
    // maestros (1 o 2). Lo que se protege no cambia: sale el asignado, nunca el de clases.maestro_id.
    const personasRespuesta = await pedir("GET", `${base}/personas`, alumno.token)
    const personas = personasRespuesta.json<{ maestro: unknown; maestros: unknown }>()
    const conCorreo = { ...esperado[0], email: asignado.email }
    expect(personas.maestro).toEqual(conCorreo)
    expect(personas.maestros).toEqual([conCorreo])
    expect(personasRespuesta.body).not.toContain(intruso.id)
    expect(personasRespuesta.body).not.toContain(intruso.email)
    const inscritas = await pedir("GET", "/api/clases/inscritas?limite=100", alumno.token)
    expect(inscritas.body).not.toContain(intruso.nombre)
    const delAdmin = (await pedir("GET", base, tokenAdmin)).json<{ clase: { maestros: unknown } }>()
    expect(delAdmin.clase.maestros).toEqual(esperado)
    for (const r of [impartidasIntruso, inscritas]) expect(r.body).not.toContain(intruso.email)
  })
})

describe("ataque CLASES-02a r1: respuestas al alumno con maestros (sin datos sensibles)", () => {
  it("detalle e inscritas del alumno: cada maestro trae solo id y nombre (o solo nombre); nunca correo, rol, estado de pago, restricción, activo ni hash, aunque un maestro sea deudor, esté restringido o inactivo", async () => {
    const t = ficha()
    const a = await crearCuenta({ nombre: `Maestra A ${t}`, rol: "maestro", estadoPago: "deudor" })
    const b = await crearCuenta({
      nombre: `Maestro B ${t}`,
      rol: "maestro",
      accesoRestringido: true,
    })
    const alumno = await crearCuenta({ nombre: `Alumno ${t}` })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: a.id, maestroIds: [a.id, b.id] })
    await inscribirDePrueba(clase.id, alumno.id)
    await obtenerDb().usuario.update({ where: { id: b.id }, data: { activo: false } })

    const detalle = await pedir("GET", `/api/clases/${clase.id}`, alumno.token)
    const inscritas = await pedir("GET", "/api/clases/inscritas?limite=100", alumno.token)
    expect(detalle.statusCode).toBe(200)
    expect(inscritas.statusCode).toBe(200)
    const prohibidas = [
      "email",
      "correo",
      "correoEnmascarado",
      "rol",
      "estadoPago",
      "accesoRestringido",
      "activo",
      "hashContrasena",
      "codigoInvitacion",
      "creadoEn",
    ]
    for (const r of [detalle, inscritas]) {
      expect(clavesDe(r.json()).filter((clave) => prohibidas.includes(clave))).toEqual([])
      for (const correo of [a.email, b.email]) expect(r.body).not.toContain(correo)
      expect(r.body).not.toContain("deudor")
    }
    const delDetalle = detalle.json<{ clase: { maestros: Record<string, unknown>[] } }>().clase
    for (const m of delDetalle.maestros) expect(Object.keys(m).sort()).toEqual(["id", "nombre"])
    const fila = inscritas
      .json<{ clases: { id: string; maestros: Record<string, unknown>[] }[] }>()
      .clases.find((c) => c.id === clase.id)
    expect(fila, "la clase del alumno no aparece en inscritas").toBeDefined()
    for (const m of fila?.maestros ?? []) expect(Object.keys(m)).toEqual(["nombre"])
    expect(fila?.maestros).toHaveLength(2)
  })
})

describe("ataque CLASES-02a r1: lista institucional del admin (punto 9)", () => {
  it("cursor de otra tabla, borrado, inventado o malformado: 400; en mayúsculas sirve igual; limite fuera de rango: 400; alumnos cuenta solo cuentas activas; total entre dos conteos", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const otro = await crearCuenta({ nombre: `Otro ${t}`, rol: "maestro" })
    const activo = await crearCuenta({ nombre: `Activo ${t}` })
    const restringido = await crearCuenta({ nombre: `Restr ${t}`, accesoRestringido: true })
    const inactivo = await crearCuenta({ nombre: `Inactivo ${t}`, activo: false })
    // Fechas reservadas en el pasado lejano y una clase centinela justo antes: la página que sigue
    // al cursor de la centinela son estas clases, sin depender de las que otros archivos crean a la
    // vez y sin desplazar las de PR-2A12 (2099) del principio de la lista.
    const base = Date.UTC(1901, 0, 1) + Math.floor(Math.random() * 1e6) * 10_000
    const centinela = await crearClaseDePrueba(idsClases, {
      maestroId: dueno.id,
      creadoEn: new Date(base + 1000),
    })
    const clases = []
    for (let i = 0; i < 4; i++) {
      clases.push(
        await crearClaseDePrueba(idsClases, {
          maestroId: dueno.id,
          ...(i === 1 ? { maestroIds: [dueno.id, otro.id] } : {}),
          nombre: `Lista ${t} ${i}`,
          creadoEn: new Date(base - i * 1000),
        }),
      )
    }
    const [primera] = clases
    if (!primera) throw new Error("Precondición: faltan clases")
    for (const alumno of [activo, restringido, inactivo])
      await inscribirDePrueba(primera.id, alumno.id)
    const publicacionId = await crearPublicacionDePrueba({ claseId: primera.id, autorId: dueno.id })
    const borrada = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    await obtenerDb().clase.delete({ where: { id: borrada.id } })

    const fallas: string[] = []
    for (const cursor of [
      dueno.id,
      publicacionId,
      borrada.id,
      randomUUID(),
      "abc",
      encodeURIComponent("' OR 1=1 --"),
      `${primera.id}x`,
    ]) {
      const r = await pedir("GET", `/api/admin/clases?cursor=${cursor}`, tokenAdmin)
      if (r.statusCode !== 400 || codigoDe(r) !== "VALIDACION")
        fallas.push(`cursor ${cursor}: ${r.statusCode} ${r.body.slice(0, 120)}`)
    }
    for (const limite of ["0", "-1", "101", "1.5", "abc", "", "1e3", "Infinity"]) {
      const r = await pedir("GET", `/api/admin/clases?limite=${limite}`, tokenAdmin)
      if (r.statusCode !== 400) fallas.push(`limite ${limite}: ${r.statusCode}`)
    }
    expect(fallas).toEqual([])

    const antes = await obtenerDb().clase.count()
    const sinCursor = await pedir("GET", "/api/admin/clases?limite=2", tokenAdmin)
    const despues = await obtenerDb().clase.count()
    expect(sinCursor.statusCode, sinCursor.body).toBe(200)
    const total = sinCursor.json<{ total: number }>().total
    expect(total).toBeGreaterThanOrEqual(Math.min(antes, despues))
    expect(total).toBeLessThanOrEqual(Math.max(antes, despues))

    const p1 = await pedir("GET", `/api/admin/clases?limite=2&cursor=${centinela.id}`, tokenAdmin)
    expect(p1.statusCode, p1.body).toBe(200)
    const cuerpo = p1.json<{
      clases: { id: string; maestros: { id: string }[]; alumnos: number; creadoEn: string }[]
      total: number
      siguienteCursor: string | null
    }>()
    expect(cuerpo.clases.map((c) => c.id)).toEqual([clases[0]?.id, clases[1]?.id])
    expect(cuerpo.clases[0]?.alumnos).toBe(2)
    expect(cuerpo.clases[1]?.maestros.map((m) => m.id)).toEqual(
      [dueno.id, otro.id].sort((x, y) => (x < y ? -1 : 1)),
    )
    expect(cuerpo.clases[0]?.creadoEn).toBe(new Date(base).toISOString())

    const p2 = await pedir(
      "GET",
      `/api/admin/clases?limite=2&cursor=${String(cuerpo.siguienteCursor)}`,
      tokenAdmin,
    )
    const p2Mayus = await pedir(
      "GET",
      `/api/admin/clases?limite=2&cursor=${String(cuerpo.siguienteCursor).toUpperCase()}`,
      tokenAdmin,
    )
    expect(p2.statusCode).toBe(200)
    expect(p2Mayus.statusCode, p2Mayus.body).toBe(200)
    const ids2 = p2.json<{ clases: { id: string }[] }>().clases.map((c) => c.id)
    expect(ids2).toEqual([clases[2]?.id, clases[3]?.id])
    expect(p2Mayus.json<{ clases: { id: string }[] }>().clases.map((c) => c.id)).toEqual(ids2)
  })
})

describe("ataque CLASES-02a r1: buscador de maestros (punto 7)", () => {
  it("solo maestros activos (nunca estudiantes, inactivos ni el admin), con correo completo; acentos y mayúsculas; comodines literales; inyección; límites; q repetido o con nulo: 400", async () => {
    const t = ficha()
    const jose = await crearCuenta({ nombre: `José Núñez ${t}`, rol: "maestro" })
    const comodin = await crearCuenta({ nombre: `Por%cien_to ${t}`, rol: "maestro" })
    const barra = await crearCuenta({ nombre: `Barra\\inv ${t}`, rol: "maestro" })
    const estudiante = await crearCuenta({ nombre: `José Núñez ${t} est` })
    const inactivo = await crearCuenta({
      nombre: `José Núñez ${t} inac`,
      rol: "maestro",
      activo: false,
    })
    const admin = await obtenerDb().usuario.findUnique({
      where: { id: idAdmin },
      select: { nombre: true, email: true },
    })
    if (!admin) throw new Error("Precondición: falta el admin")

    const buscar = (q: string, extra = "") =>
      pedir("GET", `/api/admin/maestros/candidatos?q=${encodeURIComponent(q)}${extra}`, tokenAdmin)
    const ids = (r: LightMyRequestResponse) =>
      r.json<{ candidatos: { id: string }[] }>().candidatos.map((c) => c.id)

    const porNombre = await buscar(`JOSE NUNEZ ${t}`)
    expect(porNombre.statusCode, porNombre.body).toBe(200)
    expect(ids(porNombre)).toEqual([jose.id])
    expect(porNombre.json()).toEqual({
      candidatos: [{ id: jose.id, nombre: jose.nombre, email: jose.email }],
      hayMas: false,
    })
    expect(porNombre.body).not.toContain(estudiante.email)
    expect(porNombre.body).not.toContain(inactivo.email)

    expect(ids(await buscar(`%cien_to ${t}`))).toEqual([comodin.id])
    expect(ids(await buscar(`a\\inv ${t}`))).toEqual([barra.id])
    // Comodines solos: se buscan literales; José (sin "%", "_" ni "\") nunca aparece.
    for (const literal of ["%%%", "___", "\\\\\\", "%_%"]) {
      const r = await buscar(literal)
      expect(r.statusCode, literal).toBe(200)
      expect(ids(r), literal).not.toContain(jose.id)
    }

    const inyeccion = await buscar("' OR 1=1 --")
    expect(inyeccion.statusCode).toBe(200)
    expect(ids(inyeccion)).toEqual([])

    const delAdmin = await buscar(admin.nombre)
    expect([200, 400]).toContain(delAdmin.statusCode)
    expect(delAdmin.body).not.toContain(admin.email)
    expect(delAdmin.body).not.toContain(idAdmin)
    const deEstudiante = await buscar(`${t} est`)
    expect(ids(deEstudiante)).toEqual([])

    const dos = await buscar(t, "&limite=1")
    expect(dos.statusCode).toBe(200)
    expect(dos.json<{ candidatos: unknown[]; hayMas: boolean }>().candidatos).toHaveLength(1)
    expect(dos.json<{ hayMas: boolean }>().hayMas).toBe(true)

    const fallas: string[] = []
    for (const extra of ["&limite=0", "&limite=51", "&limite=-1", "&limite=abc", "&limite=1.5"]) {
      const r = await buscar(t, extra)
      if (r.statusCode !== 400) fallas.push(`${extra}: ${r.statusCode}`)
    }
    for (const url of [
      `/api/admin/maestros/candidatos?q=${t}&q=${t}`,
      "/api/admin/maestros/candidatos",
      "/api/admin/maestros/candidatos?q=ab",
      `/api/admin/maestros/candidatos?q=${encodeURIComponent(`${t}\u0000`)}`,
      `/api/admin/maestros/candidatos?q=${"a".repeat(121)}`,
    ]) {
      const r = await pedir("GET", url, tokenAdmin)
      if (r.statusCode !== 400)
        fallas.push(`${url.slice(0, 80)}: ${r.statusCode} ${r.body.slice(0, 100)}`)
      else if (EN_INGLES.test(mensajeDe(r))) fallas.push(`${url.slice(0, 80)}: «${mensajeDe(r)}»`)
    }
    expect(fallas).toEqual([])
  })

  it("el buscador de alumnos sigue enmascarado para el admin (P-05 a): ni el correo completo ni el estado de pago", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const alumno = await crearCuenta({ nombre: `Buscado ${t}`, estadoPago: "deudor" })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const r = await pedir("GET", `/api/clases/${clase.id}/alumnos/candidatos?q=${t}`, tokenAdmin)
    expect(r.statusCode, r.body).toBe(200)
    expect(r.body).not.toContain(alumno.email)
    expect(clavesDe(r.json())).not.toContain("email")
    expect(clavesDe(r.json())).not.toContain("estadoPago")
    expect(r.json<{ candidatos: { id: string }[] }>().candidatos.map((c) => c.id)).toEqual([
      alumno.id,
    ])
  })
})
