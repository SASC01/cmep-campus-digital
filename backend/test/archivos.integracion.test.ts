import { randomUUID } from "node:crypto"

import {
  descargaRespuestaSchema,
  errorApiSchema,
  listaPublicacionesRespuestaSchema,
  publicacionRespuestaSchema,
  solicitarSubidaRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import {
  buscarArchivosParaConfirmar,
  crearPublicacion,
  type ArchivoDb,
} from "../src/adapters/db/index.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { AppError } from "../src/core/errores.js"
import { crearAlmacenEnMemoria, type AlmacenEnMemoria } from "./almacen-en-memoria.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  contarPublicaciones,
  crearAlumnoDePrueba,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  crearPublicacionDePrueba,
  inscribirDePrueba,
  leerArchivoDb,
  listarArchivosDb,
} from "./ayudas-clases.js"

let app: FastifyInstance | undefined
let appSinAlmacen: FastifyInstance | undefined
const almacen: AlmacenEnMemoria = crearAlmacenEnMemoria()
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const obtenerAppSinAlmacen = (): FastifyInstance => {
  if (!appSinAlmacen) throw new Error("La aplicación sin almacén no se construyó en beforeAll")
  return appSinAlmacen
}

const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

interface Escenario {
  claseId: string
  maestro: UsuarioDePrueba
  alumno: UsuarioDePrueba
  tokenMaestro: string
  tokenAlumno: string
}

const escenario = async (): Promise<Escenario> => {
  const maestro = await crearUsuarioDePrueba(idsUsuarios, {
    rol: "maestro",
    nombre: "Maestra Archivos",
  })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  const alumno = await crearAlumnoDePrueba(idsUsuarios, { nombre: "Alumno Archivos" })
  await inscribirDePrueba(clase.id, alumno.id, "codigo")
  return {
    claseId: clase.id,
    maestro,
    alumno,
    tokenMaestro: await tokenDe(maestro),
    tokenAlumno: await tokenDe(alumno),
  }
}

const peticion = (opciones: {
  servidor?: FastifyInstance
  method: "GET" | "POST" | "DELETE"
  url: string
  token: string
  payload?: unknown
}): Promise<LightMyRequestResponse> =>
  (opciones.servidor ?? obtenerApp()).inject({
    method: opciones.method,
    url: opciones.url,
    payload: opciones.payload,
    headers: { authorization: `Bearer ${opciones.token}` },
  })

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

const urlArchivos = (claseId: string): string => `/api/clases/${claseId}/archivos`
const urlPublicaciones = (claseId: string): string => `/api/clases/${claseId}/publicaciones`
const urlDescarga = (claseId: string, archivoId: string): string =>
  `/api/clases/${claseId}/archivos/${archivoId}/descarga`

const MB = 1024 * 1024

interface ArchivoSolicitado {
  id: string
  clave: string
  nombre: string
  tipo: string
  tamano: number
}

// Pide la subida por la API (como lo haría el navegador) y, si se pide, deja el objeto "subido" en
// el almacén en memoria con lo declarado (o con lo que se indique).
const solicitar = async (
  e: Escenario,
  {
    nombre = "guia.pdf",
    tipo = "application/pdf",
    tamano = 2000,
    subir = true,
    real,
  }: {
    nombre?: string
    tipo?: string
    tamano?: number
    subir?: boolean
    real?: { tamano: number; tipo: string }
  } = {},
): Promise<ArchivoSolicitado> => {
  const respuesta = await peticion({
    method: "POST",
    url: urlArchivos(e.claseId),
    token: e.tokenMaestro,
    payload: { nombre, tipo, tamano },
  })
  expect(respuesta.statusCode, respuesta.body).toBe(201)
  const { archivo } = solicitarSubidaRespuestaSchema.parse(respuesta.json())
  const clave = `materiales/${e.claseId}/${archivo.id}`
  if (subir) almacen.subir(clave, real ?? { tamano, tipo })
  return { id: archivo.id, clave, nombre, tipo, tamano }
}

const publicar = (
  e: Escenario,
  payload: unknown,
  servidor?: FastifyInstance,
): Promise<LightMyRequestResponse> =>
  peticion({
    ...(servidor === undefined ? {} : { servidor }),
    method: "POST",
    url: urlPublicaciones(e.claseId),
    token: e.tokenMaestro,
    payload,
  })

const contarTrabajos = async (claseId: string): Promise<number> => {
  const filas = await obtenerDb().$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM pgboss.job WHERE data ->> 'claseId' = ${claseId}::text`
  return filas[0]?.n ?? -1
}

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

// Valores de tipo texto de un JSON, en cualquier profundidad.
const valoresDe = (valor: unknown): string[] => {
  if (typeof valor === "string") return [valor]
  if (valor === null || typeof valor !== "object") return []
  return Object.values(valor).flatMap(valoresDe)
}

const PROHIBIDAS = ["clave_objeto", "claveObjeto", "estadoPago"]

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen })
  await app.ready()
  appSinAlmacen = await construirApp({ env: cargarEnv(), almacen: null })
  await appSinAlmacen.ready()
})

afterAll(async () => {
  // N-10: movimientos y clases (con sus publicaciones y archivos en cascada) antes que los usuarios
  // (ON DELETE RESTRICT).
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await appSinAlmacen?.close()
  await app?.close()
})

describe("POST /api/clases/:claseId/archivos", () => {
  it("PR-D04a: solicitar: el dueño recibe 201, con la fila pendiente y la clave correcta", async () => {
    const e = await escenario()

    const respuesta = await peticion({
      method: "POST",
      url: urlArchivos(e.claseId),
      token: e.tokenMaestro,
      payload: { nombre: "Guía ñ del tema 3.pdf", tipo: "application/pdf", tamano: 4096 },
    })

    expect(respuesta.statusCode).toBe(201)
    expect(respuesta.headers["cache-control"]).toBe("no-store")
    const { archivo, subida } = solicitarSubidaRespuestaSchema.parse(respuesta.json())
    expect(archivo).toEqual({
      id: archivo.id,
      nombre: "Guía ñ del tema 3.pdf",
      tipo: "application/pdf",
      tamano: 4096,
    })
    expect(subida.metodo).toBe("PUT")
    expect(subida.cabeceras).toEqual({ "Content-Type": "application/pdf" })
    expect(Date.parse(subida.expiraEn)).toBeGreaterThan(Date.now())
    const clave = `materiales/${e.claseId}/${archivo.id}`
    expect(almacen.subidasFirmadas).toContainEqual({ clave, tipo: "application/pdf" })
    expect(subida.url).toContain(clave)

    const fila = await leerArchivoDb(archivo.id)
    expect(fila).toMatchObject({
      claveObjeto: clave,
      claseId: e.claseId,
      subidoPor: e.maestro.id,
      estado: "pendiente",
      publicacionId: null,
      nombre: "Guía ñ del tema 3.pdf",
      tamano: 4096,
    })
    // El nombre del usuario nunca forma parte de la clave.
    expect(fila?.claveObjeto).not.toContain("Gu")
  })

  it("PR-D04b: un tipo o un tamaño inválidos dan 400 sin escribir", async () => {
    const e = await escenario()
    const invalidos = [
      { nombre: "x.exe", tipo: "application/x-msdownload", tamano: 10 },
      { nombre: "foto.png", tipo: "application/pdf", tamano: 10 },
      { nombre: "a.pdf", tipo: "application/pdf", tamano: 0 },
      { nombre: "a.pdf", tipo: "application/pdf", tamano: 25 * MB + 1 },
      { nombre: "../a.pdf", tipo: "application/pdf", tamano: 10 },
    ]
    for (const payload of invalidos) {
      const respuesta = await peticion({
        method: "POST",
        url: urlArchivos(e.claseId),
        token: e.tokenMaestro,
        payload,
      })
      expect(respuesta.statusCode, JSON.stringify(payload)).toBe(400)
      expect(codigoDe(respuesta), JSON.stringify(payload)).toBe("ARCHIVO_INVALIDO")
    }
    const malFormado = await peticion({
      method: "POST",
      url: urlArchivos(e.claseId),
      token: e.tokenMaestro,
      payload: { nombre: "a.pdf", tipo: "application/pdf", tamano: "grande" },
    })
    expect(malFormado.statusCode).toBe(400)
    expect(codigoDe(malFormado)).toBe("VALIDACION")

    expect(await listarArchivosDb(e.claseId)).toHaveLength(0)
    expect(almacen.subidasFirmadas.some(({ clave }) => clave.includes(e.claseId))).toBe(false)
  })

  it("PR-D04c: sin almacén (almacen: null) responde 503 ALMACEN_NO_CONFIGURADO", async () => {
    const e = await escenario()

    const respuesta = await peticion({
      servidor: obtenerAppSinAlmacen(),
      method: "POST",
      url: urlArchivos(e.claseId),
      token: e.tokenMaestro,
      payload: { nombre: "guia.pdf", tipo: "application/pdf", tamano: 100 },
    })

    expect(respuesta.statusCode).toBe(503)
    expect(codigoDe(respuesta)).toBe("ALMACEN_NO_CONFIGURADO")
    expect(await listarArchivosDb(e.claseId)).toHaveLength(0)
  })
})

describe("POST /api/clases/:claseId/publicaciones con archivoIds", () => {
  it("PR-D05a: publicar con adjuntos (almacén en memoria) confirma los archivos", async () => {
    const e = await escenario()
    const pdf = await solicitar(e)
    const png = await solicitar(e, { nombre: "mapa.png", tipo: "image/png", tamano: 5000 })

    const respuesta = await publicar(e, {
      tipo: "material",
      titulo: "Con adjuntos",
      archivoIds: [png.id, pdf.id],
    })

    expect(respuesta.statusCode, respuesta.body).toBe(201)
    const { publicacion } = publicacionRespuestaSchema.parse(respuesta.json())
    expect(publicacion.adjuntos.map((a) => a.id)).toEqual([png.id, pdf.id])
    for (const id of [pdf.id, png.id]) {
      const fila = await leerArchivoDb(id)
      expect(fila?.estado).toBe("confirmado")
      expect(fila?.publicacionId).toBe(publicacion.id)
    }
    expect(await contarTrabajos(e.claseId)).toBe(1)
  })

  it("PR-D05b: si falta el objeto, 400 ARCHIVO_NO_SUBIDO y no se crea la publicación", async () => {
    const e = await escenario()
    const subido = await solicitar(e)
    const faltante = await solicitar(e, { subir: false })

    const respuesta = await publicar(e, {
      tipo: "material",
      titulo: "Falta uno",
      archivoIds: [subido.id, faltante.id],
    })

    expect(respuesta.statusCode).toBe(400)
    expect(codigoDe(respuesta)).toBe("ARCHIVO_NO_SUBIDO")
    expect(await contarPublicaciones(e.claseId)).toBe(0)
    expect(await contarTrabajos(e.claseId)).toBe(0)
    expect((await leerArchivoDb(subido.id))?.estado).toBe("pendiente")
    expect((await leerArchivoDb(faltante.id))?.estado).toBe("pendiente")
  })

  it("PR-D05c: si el tamaño o el tipo son distintos, 400 ARCHIVO_INVALIDO", async () => {
    const e = await escenario()
    const otroTamano = await solicitar(e, { real: { tamano: 9999, tipo: "application/pdf" } })
    const otroTipo = await solicitar(e, { real: { tamano: 2000, tipo: "image/gif" } })

    for (const archivo of [otroTamano, otroTipo]) {
      const respuesta = await publicar(e, {
        tipo: "material",
        titulo: "No coincide",
        archivoIds: [archivo.id],
      })
      expect(respuesta.statusCode).toBe(400)
      expect(codigoDe(respuesta)).toBe("ARCHIVO_INVALIDO")
      expect((await leerArchivoDb(archivo.id))?.estado).toBe("pendiente")
    }
    expect(await contarPublicaciones(e.claseId)).toBe(0)
    expect(await contarTrabajos(e.claseId)).toBe(0)
  })

  it("PR-D05d: un archivo de otra clase, de otro usuario, ya confirmado o de hace más de 24 h da 400 sin cambios", async () => {
    const e = await escenario()
    const otra = await escenario()
    const otroUsuario = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
    const publicacionAjena = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const casos = {
      "de otra clase": await crearArchivoDePrueba({
        claseId: otra.claseId,
        subidoPor: e.maestro.id,
      }),
      "de otro usuario": await crearArchivoDePrueba({
        claseId: e.claseId,
        subidoPor: otroUsuario.id,
      }),
      "ya confirmado": await crearArchivoDePrueba({
        claseId: e.claseId,
        subidoPor: e.maestro.id,
        estado: "confirmado",
        publicacionId: publicacionAjena,
      }),
      "de hace más de 24 h": await crearArchivoDePrueba({
        claseId: e.claseId,
        subidoPor: e.maestro.id,
        creadoEn: new Date(Date.now() - 25 * 60 * 60 * 1000),
      }),
    }
    for (const archivo of Object.values(casos))
      almacen.subir(archivo.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
    const publicacionesAntes = await contarPublicaciones(e.claseId)
    const estadosAntes = Object.fromEntries(
      await Promise.all(
        Object.entries(casos).map(async ([nombre, { id }]) => [nombre, await leerArchivoDb(id)]),
      ),
    )

    for (const [nombre, archivo] of Object.entries(casos)) {
      const respuesta = await publicar(e, {
        tipo: "material",
        titulo: `Caso ${nombre}`,
        archivoIds: [archivo.id],
      })
      expect(respuesta.statusCode, nombre).toBe(400)
      expect(codigoDe(respuesta), nombre).toBe("ARCHIVO_INVALIDO")
    }

    expect(await contarPublicaciones(e.claseId)).toBe(publicacionesAntes)
    for (const [nombre, { id }] of Object.entries(casos)) {
      expect(await leerArchivoDb(id), nombre).toEqual(estadosAntes[nombre])
    }
    expect(await contarTrabajos(e.claseId)).toBe(0)
  })

  it("PR-D05e: 6 ids o ids repetidos dan 400", async () => {
    const e = await escenario()
    const uno = await solicitar(e)

    const repetidos = await publicar(e, {
      tipo: "material",
      titulo: "Repetidos",
      archivoIds: [uno.id, uno.id],
    })
    expect(repetidos.statusCode).toBe(400)
    expect(codigoDe(repetidos)).toBe("VALIDACION")

    const seis = await publicar(e, {
      tipo: "material",
      titulo: "Seis",
      archivoIds: Array.from({ length: 6 }, () => randomUUID()),
    })
    expect(seis.statusCode).toBe(400)
    expect(codigoDe(seis)).toBe("VALIDACION")

    expect(await contarPublicaciones(e.claseId)).toBe(0)
    expect((await leerArchivoDb(uno.id))?.estado).toBe("pendiente")
  })

  it("PR-D05f: un error forzado dentro de la transacción no deja archivos confirmados ni trabajos", async () => {
    const e = await escenario()
    const uno = await solicitar(e)
    const dos = await solicitar(e, { nombre: "mapa.png", tipo: "image/png", tamano: 300 })
    const archivos: ArchivoDb[] = await buscarArchivosParaConfirmar({
      ids: [uno.id, dos.id],
      claseId: e.claseId,
      subidoPor: e.maestro.id,
    })
    expect(archivos).toHaveLength(2)
    const id = randomUUID()

    await expect(
      crearPublicacion(
        {
          id,
          claseId: e.claseId,
          autorId: e.maestro.id,
          tipo: "material",
          titulo: "Se revierte",
          texto: "",
          archivos,
        },
        () => Promise.reject(new AppError("FALLO_FORZADO", "Fallo forzado de la prueba", 500)),
      ),
    ).rejects.toMatchObject({ codigo: "FALLO_FORZADO" })

    expect(await contarPublicaciones(e.claseId)).toBe(0)
    expect(await contarTrabajos(e.claseId)).toBe(0)
    for (const { id: archivoId } of [uno, dos]) {
      const fila = await leerArchivoDb(archivoId)
      expect(fila?.estado).toBe("pendiente")
      expect(fila?.publicacionId).toBeNull()
    }
  })
})

describe("adjuntos en el muro", () => {
  const publicarConAdjuntos = async (e: Escenario) => {
    const png = await solicitar(e, { nombre: "Mapa ñ.png", tipo: "image/png", tamano: 5000 })
    const pdf = await solicitar(e)
    const respuesta = await publicar(e, {
      tipo: "material",
      titulo: "Con adjuntos",
      archivoIds: [png.id, pdf.id],
    })
    expect(respuesta.statusCode, respuesta.body).toBe(201)
    return { png, pdf, respuesta }
  }

  it("PR-D06a: en el muro, vistaPrevia solo existe en las imágenes", async () => {
    const e = await escenario()
    const { png, pdf } = await publicarConAdjuntos(e)

    const muro = await peticion({
      method: "GET",
      url: urlPublicaciones(e.claseId),
      token: e.tokenAlumno,
    })

    expect(muro.statusCode).toBe(200)
    const { publicaciones } = listaPublicacionesRespuestaSchema.parse(muro.json())
    const adjuntos = publicaciones[0]?.adjuntos ?? []
    expect(adjuntos.map((a) => a.id)).toEqual([png.id, pdf.id])
    expect(adjuntos[0]?.vistaPrevia).not.toBeNull()
    expect(adjuntos[0]?.vistaPrevia?.url).toContain(png.clave)
    expect(adjuntos[1]?.vistaPrevia).toBeNull()
    const firmada = almacen.descargasFirmadas.find(({ clave }) => clave === png.clave)
    expect(firmada?.tipo).toBe("image/png")
    expect(firmada?.disposicion.startsWith("inline;")).toBe(true)
    expect(almacen.descargasFirmadas.some(({ clave }) => clave === pdf.clave)).toBe(false)
  })

  it("PR-D06b: sin almacén, vistaPrevia es null y la lista sale igual", async () => {
    const e = await escenario()
    const { png, pdf } = await publicarConAdjuntos(e)

    const muro = await peticion({
      servidor: obtenerAppSinAlmacen(),
      method: "GET",
      url: urlPublicaciones(e.claseId),
      token: e.tokenAlumno,
    })

    expect(muro.statusCode).toBe(200)
    const { publicaciones } = listaPublicacionesRespuestaSchema.parse(muro.json())
    const adjuntos = publicaciones[0]?.adjuntos ?? []
    expect(adjuntos.map((a) => [a.id, a.vistaPrevia])).toEqual([
      [png.id, null],
      [pdf.id, null],
    ])
  })

  it("PR-D06c: el recorrido recursivo del muro no encuentra clave_objeto, claveObjeto ni estadoPago", async () => {
    const e = await escenario()
    const { png, respuesta } = await publicarConAdjuntos(e)
    const muro = await peticion({
      method: "GET",
      url: urlPublicaciones(e.claseId),
      token: e.tokenAlumno,
    })
    const solicitada = await peticion({
      method: "POST",
      url: urlArchivos(e.claseId),
      token: e.tokenMaestro,
      payload: { nombre: "otro.pdf", tipo: "application/pdf", tamano: 10 },
    })
    const descarga = await peticion({
      method: "POST",
      url: urlDescarga(e.claseId, png.id),
      token: e.tokenAlumno,
    })

    for (const [nombre, cuerpo] of [
      ["muro", muro],
      ["crear", respuesta],
      ["solicitar", solicitada],
      ["descarga", descarga],
    ] as const) {
      expect(cuerpo.statusCode, nombre).toBeLessThan(300)
      const claves = clavesDe(cuerpo.json())
      for (const prohibida of PROHIBIDAS) expect(claves, nombre).not.toContain(prohibida)
      // La clave solo puede aparecer dentro de una URL prefirmada, nunca como valor suelto.
      expect(valoresDe(cuerpo.json()), nombre).not.toContain(png.clave)
    }
  })

  it("PR-D06d: sin adjuntos sale adjuntos: [] en el muro y en la respuesta 201; con adjuntos, la respuesta de crear los trae con la forma del muro", async () => {
    const e = await escenario()

    const sin = await publicar(e, { tipo: "anuncio", texto: "Sin archivos" })
    expect(sin.statusCode).toBe(201)
    expect(publicacionRespuestaSchema.parse(sin.json()).publicacion.adjuntos).toEqual([])
    const sinArchivoIds = await publicar(e, {
      tipo: "anuncio",
      texto: "Con la lista vacía",
      archivoIds: [],
    })
    expect(publicacionRespuestaSchema.parse(sinArchivoIds.json()).publicacion.adjuntos).toEqual([])

    const { png, pdf, respuesta } = await publicarConAdjuntos(e)
    const creada = publicacionRespuestaSchema.parse(respuesta.json()).publicacion
    expect(creada.adjuntos).toHaveLength(2)
    expect(creada.adjuntos[0]).toMatchObject({ id: png.id, nombre: "Mapa ñ.png", tamano: 5000 })
    expect(creada.adjuntos[0]?.vistaPrevia).not.toBeNull()
    expect(creada.adjuntos[1]).toMatchObject({ id: pdf.id, vistaPrevia: null })

    const muro = await peticion({
      method: "GET",
      url: urlPublicaciones(e.claseId),
      token: e.tokenMaestro,
    })
    const { publicaciones } = listaPublicacionesRespuestaSchema.parse(muro.json())
    expect(publicaciones).toHaveLength(3)
    const delMuro = publicaciones.find((p) => p.id === creada.id)
    // Las URL prefirmadas cambian en cada firma: se compara todo lo demás.
    const sinUrl = (
      adjuntos: readonly { id: string; nombre: string; tipo: string; tamano: number }[],
    ) => adjuntos.map(({ id, nombre, tipo, tamano }) => ({ id, nombre, tipo, tamano }))
    expect(sinUrl(delMuro?.adjuntos ?? [])).toEqual(sinUrl(creada.adjuntos))
    for (const publicacion of publicaciones.filter((p) => p.id !== creada.id)) {
      expect(publicacion.adjuntos).toEqual([])
    }
  })
})

describe("POST /api/clases/:claseId/archivos/:archivoId/descarga", () => {
  it("PR-D07a: el miembro recibe 200 con no-store y una URL con disposición attachment", async () => {
    const e = await escenario()
    const { id, clave } = await solicitar(e, { nombre: "Guía ñ.pdf" })
    const creada = await publicar(e, { tipo: "material", titulo: "Para bajar", archivoIds: [id] })
    expect(creada.statusCode).toBe(201)

    for (const token of [e.tokenAlumno, e.tokenMaestro]) {
      const respuesta = await peticion({
        method: "POST",
        url: urlDescarga(e.claseId, id),
        token,
      })
      expect(respuesta.statusCode).toBe(200)
      expect(respuesta.headers["cache-control"]).toBe("no-store")
      const { url, expiraEn } = descargaRespuestaSchema.parse(respuesta.json())
      expect(url).toContain(clave)
      expect(Date.parse(expiraEn)).toBeGreaterThan(Date.now())
    }
    const firmada = almacen.descargasFirmadas.filter((f) => f.clave === clave).at(-1)
    expect(firmada?.tipo).toBe("application/pdf")
    expect(firmada?.disposicion.startsWith("attachment;")).toBe(true)
    expect(firmada?.disposicion).toContain("filename*=UTF-8''Gu%C3%ADa%20%C3%B1.pdf")
  })

  it("PR-D07b: la descarga de un archivo de otra clase con el claseId propio responde 404", async () => {
    const e = await escenario()
    const otra = await escenario()
    const publicacionAjena = await crearPublicacionDePrueba({
      claseId: otra.claseId,
      autorId: otra.maestro.id,
    })
    const ajeno = await crearArchivoDePrueba({
      claseId: otra.claseId,
      subidoPor: otra.maestro.id,
      estado: "confirmado",
      publicacionId: publicacionAjena,
    })
    const firmadasAntes = almacen.descargasFirmadas.length

    for (const token of [e.tokenAlumno, e.tokenMaestro]) {
      const respuesta = await peticion({
        method: "POST",
        url: urlDescarga(e.claseId, ajeno.id),
        token,
      })
      expect(respuesta.statusCode).toBe(404)
      expect(codigoDe(respuesta)).toBe("ARCHIVO_NO_ENCONTRADO")
    }
    const inexistente = await peticion({
      method: "POST",
      url: urlDescarga(e.claseId, randomUUID()),
      token: e.tokenAlumno,
    })
    expect(inexistente.statusCode).toBe(404)
    expect(almacen.descargasFirmadas).toHaveLength(firmadasAntes)
  })

  it("PR-D07c: la descarga de un pendiente responde 404", async () => {
    const e = await escenario()
    const pendiente = await solicitar(e)
    const firmadasAntes = almacen.descargasFirmadas.length

    const respuesta = await peticion({
      method: "POST",
      url: urlDescarga(e.claseId, pendiente.id),
      token: e.tokenMaestro,
    })

    expect(respuesta.statusCode).toBe(404)
    expect(codigoDe(respuesta)).toBe("ARCHIVO_NO_ENCONTRADO")
    expect(almacen.descargasFirmadas).toHaveLength(firmadasAntes)
  })

  it("sin almacén responde 503 ALMACEN_NO_CONFIGURADO", async () => {
    const e = await escenario()

    const respuesta = await peticion({
      servidor: obtenerAppSinAlmacen(),
      method: "POST",
      url: urlDescarga(e.claseId, randomUUID()),
      token: e.tokenAlumno,
    })

    expect(respuesta.statusCode).toBe(503)
    expect(codigoDe(respuesta)).toBe("ALMACEN_NO_CONFIGURADO")
  })
})

describe("borrar una publicación con adjuntos y los CHECK de la tabla", () => {
  it("PR-D08a: borrar una publicación con adjuntos deja sus archivos descartados y sin contexto", async () => {
    const e = await escenario()
    const uno = await solicitar(e)
    const dos = await solicitar(e, { nombre: "mapa.png", tipo: "image/png", tamano: 300 })
    const creada = await publicar(e, {
      tipo: "material",
      titulo: "Se borrará",
      archivoIds: [uno.id, dos.id],
    })
    const { publicacion } = publicacionRespuestaSchema.parse(creada.json())

    const borrada = await peticion({
      method: "DELETE",
      url: `${urlPublicaciones(e.claseId)}/${publicacion.id}`,
      token: e.tokenMaestro,
    })

    expect(borrada.statusCode).toBe(204)
    for (const { id } of [uno, dos]) {
      const fila = await leerArchivoDb(id)
      expect(fila?.estado).toBe("descartado")
      expect(fila?.publicacionId).toBeNull()
    }
    expect(await contarPublicaciones(e.claseId)).toBe(0)
    const descarga = await peticion({
      method: "POST",
      url: urlDescarga(e.claseId, uno.id),
      token: e.tokenAlumno,
    })
    expect(descarga.statusCode).toBe(404)
  })

  it("borrar con el claseId propio una publicación ajena no descarta sus archivos", async () => {
    const e = await escenario()
    const otra = await escenario()
    const archivo = await solicitar(otra)
    const creada = await publicar(otra, {
      tipo: "material",
      titulo: "De la otra clase",
      archivoIds: [archivo.id],
    })
    const { publicacion } = publicacionRespuestaSchema.parse(creada.json())

    const borrada = await peticion({
      method: "DELETE",
      url: `${urlPublicaciones(e.claseId)}/${publicacion.id}`,
      token: e.tokenMaestro,
    })

    expect(borrada.statusCode).toBe(404)
    const fila = await leerArchivoDb(archivo.id)
    expect(fila?.estado).toBe("confirmado")
    expect(fila?.publicacionId).toBe(publicacion.id)
  })

  it("PR-D08b: un UPDATE directo a confirmado sin publicación falla por el CHECK", async () => {
    const e = await escenario()
    const pendiente = await crearArchivoDePrueba({ claseId: e.claseId, subidoPor: e.maestro.id })

    await expect(
      obtenerDb().archivo.update({ where: { id: pendiente.id }, data: { estado: "confirmado" } }),
    ).rejects.toThrow()

    expect((await leerArchivoDb(pendiente.id))?.estado).toBe("pendiente")
  })

  it("PR-D08c: un UPDATE directo que pone publicacion_id a un pendiente falla por el CHECK", async () => {
    const e = await escenario()
    const publicacionId = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const pendiente = await crearArchivoDePrueba({ claseId: e.claseId, subidoPor: e.maestro.id })

    await expect(
      obtenerDb().archivo.update({ where: { id: pendiente.id }, data: { publicacionId } }),
    ).rejects.toThrow()
    await expect(
      obtenerDb().archivo.update({ where: { id: pendiente.id }, data: { tamano: 0 } }),
    ).rejects.toThrow()

    const fila = await leerArchivoDb(pendiente.id)
    expect(fila?.publicacionId).toBeNull()
    expect(fila?.tamano).toBe(1000)
  })
})
