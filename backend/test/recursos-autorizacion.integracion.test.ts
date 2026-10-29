import { randomUUID } from "node:crypto"

import {
  errorApiSchema,
  listaRecursosRespuestaSchema,
  recursoRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  crearPublicacionDePrueba,
  idDelAdminDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import {
  crearMaterialConTemaDePrueba,
  crearTareaDePrueba,
  crearTemaDePrueba,
} from "./ayudas-tareas.js"

// CLASES-03a (CL3-A09, CL3-A11, CL3-A12 y CL3-A18): autorización de las tres rutas nuevas de recursos
// (GET …/recursos, GET y PUT …/recursos/:recursoId) y los permisos por bloque al editar (RN-07, S-02).

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
const almacen = crearAlmacenEnMemoria()
let adminId = ""
let tokenAdmin = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen })
  await app.ready()
  adminId = await idDelAdminDePrueba()
  tokenAdmin = await tokenDelAdminDePrueba()
})

afterAll(async () => {
  // N-10: clases (con sus publicaciones y archivos en cascada) antes que los usuarios.
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

const maestroDePrueba = (): Promise<UsuarioDePrueba> =>
  crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })

const estudianteDePrueba = (
  opciones: Parameters<typeof crearUsuarioDePrueba>[1] = {},
): Promise<UsuarioDePrueba> => crearUsuarioDePrueba(idsUsuarios, { ...opciones, rol: "estudiante" })

const pedir = (opciones: {
  method: "GET" | "PUT" | "HEAD"
  url: string
  token?: string | undefined
  payload?: InjectOptions["payload"]
}): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method: opciones.method,
    url: opciones.url,
    ...(opciones.payload === undefined ? {} : { payload: opciones.payload }),
    headers: opciones.token === undefined ? {} : { authorization: `Bearer ${opciones.token}` },
  })

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

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

const CLAVES_PROHIBIDAS = ["estadoPago", "accesoRestringido", "email", "rol"]

interface Escenario {
  claseId: string
  maestro: UsuarioDePrueba
  otroMaestro: UsuarioDePrueba
  alumno: UsuarioDePrueba
  tokenMaestro: string
  tokenOtroMaestro: string
  tokenAlumno: string
  // Del docente, de `maestro`; de aprendizaje, del admin.
  docenteId: string
  aprendizajeId: string
}

// Una clase con dos maestros (el autor y otro), un alumno inscrito con deuda, un recurso del docente
// del primer maestro y uno de aprendizaje del admin, con un comentario y un adjunto cada uno.
const escenario = async (): Promise<Escenario> => {
  const maestro = await maestroDePrueba()
  const otroMaestro = await maestroDePrueba()
  const alumno = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: "Alumna Recursos",
    estadoPago: "deudor",
  })
  const clase = await crearClaseDePrueba(idsClases, {
    maestroId: maestro.id,
    maestroIds: [maestro.id, otroMaestro.id],
  })
  await inscribirDePrueba(clase.id, alumno.id, "codigo")
  const docenteId = await crearMaterialConTemaDePrueba({
    claseId: clase.id,
    autorId: maestro.id,
    titulo: "Notas del docente",
    bloque: "docente",
  })
  const aprendizajeId = await crearMaterialConTemaDePrueba({
    claseId: clase.id,
    autorId: adminId,
    titulo: "Guía de aprendizaje",
    bloque: "aprendizaje",
  })
  for (const [publicacionId, subidoPor] of [
    [docenteId, maestro.id],
    [aprendizajeId, adminId],
  ] as const) {
    await crearArchivoDePrueba({
      claseId: clase.id,
      subidoPor,
      estado: "confirmado",
      publicacionId,
    })
  }
  return {
    claseId: clase.id,
    maestro,
    otroMaestro,
    alumno,
    tokenMaestro: await tokenDe(maestro),
    tokenOtroMaestro: await tokenDe(otroMaestro),
    tokenAlumno: await tokenDe(alumno),
    docenteId,
    aprendizajeId,
  }
}

const urlLista = (claseId: string, bloque = "docente"): string =>
  `/api/clases/${claseId}/recursos?bloque=${bloque}&tema=sin-tema`
const urlRecurso = (claseId: string, recursoId: string): string =>
  `/api/clases/${claseId}/recursos/${recursoId}`

const cuerpoDeEdicion = (cambios: Record<string, unknown> = {}): Record<string, unknown> => ({
  titulo: "Título editado",
  texto: "Descripción editada",
  temaId: null,
  archivoIds: [],
  version: 0,
  ...cambios,
})

interface RutaDePrueba {
  nombre: string
  metodo: "GET" | "PUT"
  url: (e: Escenario) => string
  payload?: (e: Escenario) => InjectOptions["payload"]
  // true: el estudiante inscrito también puede (solo GET …/recursos).
  admiteEstudiante: boolean
  // El éxito del maestro de la clase y el del admin (cada uno sobre el recurso que puede tocar).
  exitoMaestro: (e: Escenario) => { url: string; payload?: InjectOptions["payload"] }
  exitoAdmin: (e: Escenario) => { url: string; payload?: InjectOptions["payload"] }
}

const RUTAS: RutaDePrueba[] = [
  {
    nombre: "GET /clases/:claseId/recursos",
    metodo: "GET",
    url: (e) => urlLista(e.claseId),
    admiteEstudiante: true,
    exitoMaestro: (e) => ({ url: urlLista(e.claseId) }),
    exitoAdmin: (e) => ({ url: urlLista(e.claseId, "aprendizaje") }),
  },
  {
    nombre: "GET /clases/:claseId/recursos/:recursoId",
    metodo: "GET",
    url: (e) => urlRecurso(e.claseId, e.docenteId),
    admiteEstudiante: false,
    exitoMaestro: (e) => ({ url: urlRecurso(e.claseId, e.docenteId) }),
    exitoAdmin: (e) => ({ url: urlRecurso(e.claseId, e.aprendizajeId) }),
  },
  {
    nombre: "PUT /clases/:claseId/recursos/:recursoId",
    metodo: "PUT",
    url: (e) => urlRecurso(e.claseId, e.docenteId),
    payload: () => cuerpoDeEdicion(),
    admiteEstudiante: false,
    exitoMaestro: (e) => ({ url: urlRecurso(e.claseId, e.docenteId), payload: cuerpoDeEdicion() }),
    exitoAdmin: (e) => ({
      url: urlRecurso(e.claseId, e.aprendizajeId),
      payload: cuerpoDeEdicion(),
    }),
  },
]

const pedirRuta = (
  ruta: RutaDePrueba,
  e: Escenario,
  token: string | undefined,
  url = ruta.url(e),
): Promise<LightMyRequestResponse> =>
  pedir({
    method: ruta.metodo,
    url,
    token,
    ...(ruta.payload === undefined ? {} : { payload: ruta.payload(e) }),
  })

// Lo que ninguna negación debe cambiar: los materiales de la clase y sus archivos.
const fotoDe = async (claseId: string): Promise<unknown> => ({
  publicaciones: await obtenerDb().publicacion.findMany({
    where: { claseId },
    orderBy: { id: "asc" },
    select: { id: true, titulo: true, texto: true, temaId: true, version: true, bloque: true },
  }),
  archivos: await obtenerDb().archivo.findMany({
    where: { claseId },
    orderBy: { id: "asc" },
    select: { id: true, estado: true, publicacionId: true },
  }),
})

describe("autorización de las rutas de recursos (CL3-A09, CL3-A11)", () => {
  it(
    "CL3-A09 y CL3-A11: cada ruta, sin sesión, responde 401 NO_AUTENTICADO",
    { timeout: 60_000 },
    async () => {
      for (const ruta of RUTAS) {
        const e = await escenario()
        const respuesta = await pedirRuta(ruta, e, undefined)
        expect(respuesta.statusCode, ruta.nombre).toBe(401)
        expect(codigoDe(respuesta), ruta.nombre).toBe("NO_AUTENTICADO")
      }
    },
  )

  it(
    "CL3-A09 y CL3-A11: cada ruta, con cambio de contraseña pendiente, responde 403 CAMBIO_DE_CONTRASENA_REQUERIDO",
    { timeout: 60_000 },
    async () => {
      for (const ruta of RUTAS) {
        const e = await escenario()
        const pendiente = await estudianteDePrueba({ debeCambiarContrasena: true })
        await inscribirDePrueba(e.claseId, pendiente.id, "codigo")
        const respuesta = await pedirRuta(ruta, e, await tokenDe(pendiente))
        expect(respuesta.statusCode, ruta.nombre).toBe(403)
        expect(codigoDe(respuesta), ruta.nombre).toBe("CAMBIO_DE_CONTRASENA_REQUERIDO")
      }
    },
  )

  it(
    "CL3-A09 y CL3-A11: cada ruta, con un alumno restringido inscrito, responde 403 ACCESO_RESTRINGIDO",
    { timeout: 60_000 },
    async () => {
      for (const ruta of RUTAS) {
        const e = await escenario()
        const restringido = await estudianteDePrueba({ accesoRestringido: true })
        await inscribirDePrueba(e.claseId, restringido.id, "codigo")
        const respuesta = await pedirRuta(ruta, e, await tokenDe(restringido))
        expect(respuesta.statusCode, ruta.nombre).toBe(403)
        expect(codigoDe(respuesta), ruta.nombre).toBe("ACCESO_RESTRINGIDO")
      }
    },
  )

  it(
    "CL3-A11: GET y PUT …/recursos/:recursoId responden 403 ROL_NO_PERMITIDO al estudiante inscrito",
    { timeout: 60_000 },
    async () => {
      const deMaestro = RUTAS.filter((ruta) => !ruta.admiteEstudiante)
      expect(deMaestro.map((ruta) => ruta.nombre)).toEqual([
        "GET /clases/:claseId/recursos/:recursoId",
        "PUT /clases/:claseId/recursos/:recursoId",
      ])
      for (const ruta of deMaestro) {
        const e = await escenario()
        const respuesta = await pedirRuta(ruta, e, e.tokenAlumno)
        expect(respuesta.statusCode, ruta.nombre).toBe(403)
        expect(codigoDe(respuesta), ruta.nombre).toBe("ROL_NO_PERMITIDO")
      }
    },
  )

  it(
    "CL3-A09 y CL3-A11: cada ruta, en una clase ajena (maestro de otra clase y, en la lista, el alumno no inscrito) o inexistente, responde 403 SIN_ACCESO_A_LA_CLASE, igual",
    { timeout: 90_000 },
    async () => {
      for (const ruta of RUTAS) {
        const e = await escenario()
        const ajeno = await maestroDePrueba()
        await crearClaseDePrueba(idsClases, { maestroId: ajeno.id })
        const tokens = [await tokenDe(ajeno)]
        if (ruta.admiteEstudiante) tokens.push(await tokenDe(await estudianteDePrueba()))
        const cuerpos: unknown[] = []
        for (const token of tokens) {
          const respuesta = await pedirRuta(ruta, e, token)
          expect(respuesta.statusCode, ruta.nombre).toBe(403)
          expect(codigoDe(respuesta), ruta.nombre).toBe("SIN_ACCESO_A_LA_CLASE")
          cuerpos.push(respuesta.json())
        }
        const inexistente = ruta.url(e).replace(e.claseId, randomUUID())
        for (const token of [e.tokenMaestro, tokenAdmin]) {
          const respuesta = await pedirRuta(ruta, e, token, inexistente)
          expect(respuesta.statusCode, `${ruta.nombre} / inexistente`).toBe(403)
          cuerpos.push(respuesta.json())
        }
        expect(new Set(cuerpos.map((cuerpo) => JSON.stringify(cuerpo))).size, ruta.nombre).toBe(1)
      }
    },
  )

  it(
    "CL3-A09 y CL3-A11: en cada negación, los recursos y sus archivos quedan como estaban",
    { timeout: 120_000 },
    async () => {
      for (const ruta of RUTAS) {
        const e = await escenario()
        const pendiente = await estudianteDePrueba({ debeCambiarContrasena: true })
        const restringido = await estudianteDePrueba({ accesoRestringido: true })
        await inscribirDePrueba(e.claseId, restringido.id, "codigo")
        const ajeno = await maestroDePrueba()
        const negaciones: { descripcion: string; token: string | undefined }[] = [
          { descripcion: "sin sesión", token: undefined },
          { descripcion: "cambio pendiente", token: await tokenDe(pendiente) },
          { descripcion: "restringido", token: await tokenDe(restringido) },
          { descripcion: "maestro ajeno", token: await tokenDe(ajeno) },
        ]
        if (!ruta.admiteEstudiante) {
          negaciones.push({ descripcion: "estudiante", token: e.tokenAlumno })
        }
        for (const { descripcion, token } of negaciones) {
          const antes = await fotoDe(e.claseId)
          const respuesta = await pedirRuta(ruta, e, token)
          expect(respuesta.statusCode, `${ruta.nombre} / ${descripcion}`).toBeGreaterThanOrEqual(
            400,
          )
          expect(await fotoDe(e.claseId), `${ruta.nombre} / ${descripcion}`).toEqual(antes)
        }
      }
    },
  )

  it(
    "CL3-A09 y CL3-A11: cada ruta responde su éxito al maestro de la clase y al admin, sin estadoPago, accesoRestringido, email ni rol; la lista tampoco lleva version",
    { timeout: 60_000 },
    async () => {
      for (const ruta of RUTAS) {
        for (const quien of ["maestro", "admin"] as const) {
          const e = await escenario()
          const exito = quien === "maestro" ? ruta.exitoMaestro(e) : ruta.exitoAdmin(e)
          const respuesta = await pedir({
            method: ruta.metodo,
            url: exito.url,
            token: quien === "maestro" ? e.tokenMaestro : tokenAdmin,
            ...(exito.payload === undefined ? {} : { payload: exito.payload }),
          })
          expect(respuesta.statusCode, `${ruta.nombre} / ${quien}`).toBe(200)
          const claves = clavesDe(respuesta.json())
          for (const prohibida of CLAVES_PROHIBIDAS) {
            expect(claves, `${ruta.nombre} / ${quien} / ${prohibida}`).not.toContain(prohibida)
          }
          if (ruta.admiteEstudiante) {
            expect(claves, `${ruta.nombre} / ${quien}`).not.toContain("version")
          }
        }
      }
    },
  )

  it("CL3-A09: el estudiante inscrito ve los dos bloques, sin estadoPago, accesoRestringido, email, rol ni version", async () => {
    const e = await escenario()
    const vistos: string[] = []
    for (const bloque of ["docente", "aprendizaje"]) {
      const respuesta = await pedir({
        method: "GET",
        url: urlLista(e.claseId, bloque),
        token: e.tokenAlumno,
      })
      expect(respuesta.statusCode, bloque).toBe(200)
      const lista = listaRecursosRespuestaSchema.parse(respuesta.json())
      vistos.push(...lista.recursos.map((recurso) => recurso.id))
      const claves = clavesDe(respuesta.json())
      for (const prohibida of [...CLAVES_PROHIBIDAS, "version"]) {
        expect(claves, `${bloque} / ${prohibida}`).not.toContain(prohibida)
      }
      expect(respuesta.body).not.toContain("deudor")
    }
    expect(vistos).toEqual([e.docenteId, e.aprendizajeId])
  })
})

describe("leer un recurso para editarlo (CL3-A11)", () => {
  it("CL3-A11: el maestro de la clase y el admin reciben el recurso con version y tema", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad 1", orden: 0 })
    await obtenerDb().publicacion.update({
      where: { id: e.docenteId },
      data: { temaId: tema.id },
      select: { id: true },
    })
    for (const token of [e.tokenMaestro, tokenAdmin]) {
      const respuesta = await pedir({
        method: "GET",
        url: urlRecurso(e.claseId, e.docenteId),
        token,
      })
      expect(respuesta.statusCode, respuesta.body).toBe(200)
      const { recurso } = recursoRespuestaSchema.parse(respuesta.json())
      expect(recurso).toMatchObject({
        id: e.docenteId,
        titulo: "Notas del docente",
        bloque: "docente",
        version: 0,
        tema: { id: tema.id, nombre: "Unidad 1" },
      })
    }
  })

  it("CL3-A11: el id de un anuncio, de una tarea o de un material de otra clase responde 404 RECURSO_NO_ENCONTRADO, igual que uno inexistente", async () => {
    const e = await escenario()
    const anuncio = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const tarea = await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const otra = await crearClaseDePrueba(idsClases, { maestroId: e.maestro.id })
    const deOtraClase = await crearMaterialConTemaDePrueba({
      claseId: otra.id,
      autorId: e.maestro.id,
      bloque: "docente",
    })
    const cuerpos: string[] = []
    for (const id of [anuncio, tarea, deOtraClase, randomUUID()]) {
      for (const metodo of ["GET", "PUT"] as const) {
        const respuesta = await pedir({
          method: metodo,
          url: urlRecurso(e.claseId, id),
          token: e.tokenMaestro,
          ...(metodo === "PUT" ? { payload: cuerpoDeEdicion() } : {}),
        })
        expect(respuesta.statusCode, `${metodo} ${id}`).toBe(404)
        expect(codigoDe(respuesta), `${metodo} ${id}`).toBe("RECURSO_NO_ENCONTRADO")
        cuerpos.push(respuesta.body)
      }
    }
    expect(new Set(cuerpos).size).toBe(1)
    const otraFila = await obtenerDb().publicacion.findUnique({
      where: { id: deOtraClase },
      select: { titulo: true, version: true },
    })
    expect(otraFila).toEqual({ titulo: "Material de prueba", version: 0 })
  })

  it("CL3-A11: un recursoId que no es UUID responde 400 VALIDACION", async () => {
    const e = await escenario()
    for (const metodo of ["GET", "PUT"] as const) {
      const respuesta = await pedir({
        method: metodo,
        url: urlRecurso(e.claseId, "no-es-uuid"),
        token: e.tokenMaestro,
        ...(metodo === "PUT" ? { payload: cuerpoDeEdicion() } : {}),
      })
      expect(respuesta.statusCode, metodo).toBe(400)
      expect(codigoDe(respuesta), metodo).toBe("VALIDACION")
    }
  })
})

describe("editar un recurso: permisos por bloque (CL3-A12)", () => {
  const editar = (claseId: string, recursoId: string, token: string) =>
    pedir({
      method: "PUT",
      url: urlRecurso(claseId, recursoId),
      token,
      payload: cuerpoDeEdicion({ titulo: "Editado por otra persona" }),
    })

  const fotoDelRecurso = async (id: string) => ({
    fila: await obtenerDb().publicacion.findUnique({
      where: { id },
      select: { titulo: true, texto: true, temaId: true, version: true, bloque: true },
    }),
    archivos: await obtenerDb().archivo.findMany({
      where: { OR: [{ publicacionId: id }] },
      orderBy: { id: "asc" },
      select: { id: true, estado: true, publicacionId: true },
    }),
  })

  const esperarNegado = async (claseId: string, recursoId: string, token: string, caso: string) => {
    const antes = await fotoDelRecurso(recursoId)
    expect(antes.fila, `Precondición: ${caso}`).not.toBeNull()
    const respuesta = await editar(claseId, recursoId, token)
    expect(respuesta.statusCode, caso).toBe(403)
    expect(codigoDe(respuesta), caso).toBe("EDICION_NO_PERMITIDA")
    expect(await fotoDelRecurso(recursoId), caso).toEqual(antes)
  }

  const esperarEditado = async (
    claseId: string,
    recursoId: string,
    token: string,
    caso: string,
  ) => {
    const respuesta = await editar(claseId, recursoId, token)
    expect(respuesta.statusCode, `${caso}: ${respuesta.body}`).toBe(200)
    const fila = await obtenerDb().publicacion.findUnique({
      where: { id: recursoId },
      select: { titulo: true, version: true },
    })
    expect(fila, caso).toEqual({ titulo: "Editado por otra persona", version: 1 })
  }

  it("CL3-A12: el autor maestro edita su recurso del docente; otro maestro y el admin reciben 403 EDICION_NO_PERMITIDA sin cambiar título, versión ni archivos", async () => {
    const e = await escenario()
    await esperarNegado(e.claseId, e.docenteId, e.tokenOtroMaestro, "otro maestro")
    await esperarNegado(e.claseId, e.docenteId, tokenAdmin, "admin sobre docente")
    await esperarEditado(e.claseId, e.docenteId, e.tokenMaestro, "autor")
  })

  it("CL3-A12: el admin edita un recurso de aprendizaje; un maestro de la clase recibe 403 sin cambiar nada", async () => {
    const e = await escenario()
    await esperarNegado(e.claseId, e.aprendizajeId, e.tokenMaestro, "maestro sobre aprendizaje")
    await esperarNegado(e.claseId, e.aprendizajeId, e.tokenOtroMaestro, "otro maestro")
    await esperarEditado(e.claseId, e.aprendizajeId, tokenAdmin, "admin")
  })

  it("CL3-A12: un material con bloque nulo sigue el bloque efectivo del rol de su autor", async () => {
    const e = await escenario()
    const delMaestro = await crearMaterialConTemaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const delAdmin = await crearMaterialConTemaDePrueba({ claseId: e.claseId, autorId: adminId })
    await esperarNegado(e.claseId, delMaestro, e.tokenOtroMaestro, "nulo del maestro / otro")
    await esperarNegado(e.claseId, delMaestro, tokenAdmin, "nulo del maestro / admin")
    await esperarEditado(e.claseId, delMaestro, e.tokenMaestro, "nulo del maestro / autor")
    await esperarNegado(e.claseId, delAdmin, e.tokenMaestro, "nulo del admin / maestro")
    await esperarEditado(e.claseId, delAdmin, tokenAdmin, "nulo del admin / admin")
    const filas = await obtenerDb().publicacion.findMany({
      where: { id: { in: [delMaestro, delAdmin] } },
      select: { bloque: true },
    })
    expect(filas).toEqual([{ bloque: null }, { bloque: null }])
  })
})

describe("rutas de recursos en el arranque (CL3-A18)", () => {
  it("CL3-A18: la API arranca con la guarda onRoute y existen GET, HEAD y PUT de las rutas de recursos, todas protegidas", async () => {
    const arbol = obtenerApp().printRoutes({ commonPrefix: false })
    expect(arbol).toMatch(/recursos \((GET, HEAD|HEAD, GET)\)/)
    expect(arbol).toMatch(
      /:recursoId \((GET, HEAD, PUT|GET, PUT, HEAD|HEAD, GET, PUT|PUT, GET, HEAD)\)/,
    )
    const claseId = randomUUID()
    const recursoId = randomUUID()
    for (const [method, url] of [
      ["GET", `/api/clases/${claseId}/recursos?bloque=docente&tema=sin-tema`],
      ["HEAD", `/api/clases/${claseId}/recursos?bloque=docente&tema=sin-tema`],
      ["GET", `/api/clases/${claseId}/recursos/${recursoId}`],
      ["HEAD", `/api/clases/${claseId}/recursos/${recursoId}`],
      ["PUT", `/api/clases/${claseId}/recursos/${recursoId}`],
    ] as const) {
      const respuesta = await pedir({ method: method === "HEAD" ? "HEAD" : method, url })
      expect(respuesta.statusCode, `${method} ${url}`).toBe(401)
    }
  })
})
