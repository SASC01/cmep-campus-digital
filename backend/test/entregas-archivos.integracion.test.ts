import { descargaRespuestaSchema, errorApiSchema, tareaRespuestaSchema } from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria, type AlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba, type UsuarioDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  contarPublicaciones,
  crearAlumnoDePrueba,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  crearPublicacionDePrueba,
  inscribirDePrueba,
  leerArchivoDb,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { crearArchivoDeEntregaDePrueba, crearEntregaDePrueba } from "./ayudas-entregas.js"
import { crearTareaDePrueba, cuerpoDeTarea } from "./ayudas-tareas.js"

// ENTREGAS-01b (§D-3.6; PR-1B17 y PR-1B18). Los archivos de una entrega solo se descargan por las
// rutas de la entrega y solo se confirman en una entrega: la descarga de la clase sirve únicamente
// archivos de publicaciones, y la confirmación de una publicación exige el prefijo de materiales.
// Los datos se fabrican con SQL parametrizado (ayudas-entregas.ts): así estas pruebas pueden estar
// rojas antes del remedio, cuando todavía no hay ruta que confirme un archivo de entrega.

let app: FastifyInstance | undefined
const almacen: AlmacenEnMemoria = crearAlmacenEnMemoria()
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

interface Escenario {
  claseId: string
  tareaId: string
  maestro: UsuarioDePrueba
  dueno: UsuarioDePrueba
  companero: UsuarioDePrueba
  tokens: { maestro: string; dueno: string; companero: string; admin: string }
}

const escenario = async (): Promise<Escenario> => {
  const maestro = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: "Maestra Archivos Entrega",
    rol: "maestro",
  })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  const dueno = await crearAlumnoDePrueba(idsUsuarios, { nombre: "Alumna Dueña" })
  const companero = await crearAlumnoDePrueba(idsUsuarios, { nombre: "Alumno Compañero" })
  await inscribirDePrueba(clase.id, dueno.id)
  await inscribirDePrueba(clase.id, companero.id)
  const tareaId = await crearTareaDePrueba({ claseId: clase.id, autorId: maestro.id })
  return {
    claseId: clase.id,
    tareaId,
    maestro,
    dueno,
    companero,
    tokens: {
      maestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
      dueno: await firmarTokenDePrueba({ usuarioId: dueno.id }),
      companero: await firmarTokenDePrueba({ usuarioId: companero.id }),
      admin: await tokenDelAdminDePrueba(),
    },
  }
}

const peticion = (
  token: string,
  method: "GET" | "POST" | "PUT",
  url: string,
  payload?: InjectOptions["payload"],
): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method,
    url,
    ...(payload === undefined ? {} : { payload }),
    headers: { authorization: `Bearer ${token}` },
  })

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

const descargarDeLaClase = (token: string, claseId: string, archivoId: string) =>
  peticion(token, "POST", `/api/clases/${claseId}/archivos/${archivoId}/descarga`)

// Un archivo de entrega confirmado, con su fila de entregas en `entregado` y el objeto en el almacén.
const archivoDeEntregaConfirmado = async (e: Escenario) => {
  const entregaId = await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.dueno.id })
  const archivo = await crearArchivoDeEntregaDePrueba({
    claseId: e.claseId,
    tareaId: e.tareaId,
    alumnoId: e.dueno.id,
    estado: "confirmado",
    entregaId,
  })
  almacen.subir(archivo.claveObjeto, { tamano: archivo.tamano, tipo: archivo.tipo })
  return archivo
}

describe("descarga de la clase solo de publicaciones (PR-1B17)", () => {
  it("PR-1B17: con el id de un archivo de entrega, la descarga de la clase responde 404 ARCHIVO_NO_ENCONTRADO al compañero, al dueño, al maestro y al admin, sin firmar nada", async () => {
    const e = await escenario()
    const archivo = await archivoDeEntregaConfirmado(e)
    const firmadasAntes = almacen.descargasFirmadas.length

    for (const token of [e.tokens.companero, e.tokens.dueno, e.tokens.maestro, e.tokens.admin]) {
      const respuesta = await descargarDeLaClase(token, e.claseId, archivo.id)
      expect(respuesta.statusCode, respuesta.body).toBe(404)
      expect(codigoDe(respuesta)).toBe("ARCHIVO_NO_ENCONTRADO")
    }
    expect(
      almacen.descargasFirmadas
        .slice(firmadasAntes)
        .filter((firmada) => firmada.clave === archivo.claveObjeto),
    ).toEqual([])
  })

  it("PR-1B17: los archivos de un material, de un anuncio y de una tarea se siguen descargando igual para el alumno, el maestro y el admin", async () => {
    const e = await escenario()
    const material = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      tipo: "material",
    })
    const anuncio = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const archivos = [
      await crearArchivoDePrueba({
        claseId: e.claseId,
        subidoPor: e.maestro.id,
        estado: "confirmado",
        publicacionId: material,
      }),
      await crearArchivoDePrueba({
        claseId: e.claseId,
        subidoPor: e.maestro.id,
        estado: "confirmado",
        publicacionId: anuncio,
      }),
      await crearArchivoDePrueba({
        claseId: e.claseId,
        subidoPor: e.maestro.id,
        estado: "confirmado",
        publicacionId: e.tareaId,
      }),
    ]
    for (const archivo of archivos) {
      for (const token of [e.tokens.dueno, e.tokens.maestro, e.tokens.admin]) {
        const respuesta = await descargarDeLaClase(token, e.claseId, archivo.id)
        expect(respuesta.statusCode, respuesta.body).toBe(200)
        const { url } = descargaRespuestaSchema.parse(respuesta.json())
        expect(url).toContain(archivo.claveObjeto)
      }
    }
  })
})

describe("confirmar en una publicación un archivo de entrega (PR-1B18)", () => {
  // Un archivo de entrega pendiente subido por el maestro (forzado en la base: por la API un maestro
  // no puede pedir una subida de entrega), con el objeto en el almacén tal como se declaró.
  const archivoDeEntregaDelMaestro = async (e: Escenario) => {
    const archivo = await crearArchivoDeEntregaDePrueba({
      claseId: e.claseId,
      tareaId: e.tareaId,
      alumnoId: e.maestro.id,
      subidoPor: e.maestro.id,
    })
    almacen.subir(archivo.claveObjeto, { tamano: archivo.tamano, tipo: archivo.tipo })
    return archivo
  }

  it("PR-1B18: publicar un material con el id de un archivo de entrega pendiente del mismo usuario responde 400 sin publicar ni confirmarlo", async () => {
    const e = await escenario()
    const archivo = await archivoDeEntregaDelMaestro(e)
    const publicacionesAntes = await contarPublicaciones(e.claseId)

    const respuesta = await peticion(
      e.tokens.maestro,
      "POST",
      `/api/clases/${e.claseId}/publicaciones`,
      {
        tipo: "material",
        titulo: "Material con un archivo de entrega",
        archivoIds: [archivo.id],
      },
    )

    expect(respuesta.statusCode, respuesta.body).toBe(400)
    expect(codigoDe(respuesta)).toBe("ARCHIVO_INVALIDO")
    expect(await contarPublicaciones(e.claseId)).toBe(publicacionesAntes)
    const fila = await leerArchivoDb(archivo.id)
    expect(fila).toMatchObject({ estado: "pendiente", publicacionId: null, entregaId: null })
  })

  it("PR-1B18: crear una tarea con el id de un archivo de entrega pendiente del mismo usuario responde 400 sin crearla ni confirmarlo", async () => {
    const e = await escenario()
    const archivo = await archivoDeEntregaDelMaestro(e)
    const publicacionesAntes = await contarPublicaciones(e.claseId)

    const respuesta = await peticion(
      e.tokens.maestro,
      "POST",
      `/api/clases/${e.claseId}/tareas`,
      cuerpoDeTarea({ archivoIds: [archivo.id] }),
    )

    expect(respuesta.statusCode, respuesta.body).toBe(400)
    expect(codigoDe(respuesta)).toBe("ARCHIVO_INVALIDO")
    expect(await contarPublicaciones(e.claseId)).toBe(publicacionesAntes)
    expect(await leerArchivoDb(archivo.id)).toMatchObject({
      estado: "pendiente",
      publicacionId: null,
      entregaId: null,
    })
  })

  it("PR-1B18: editar una tarea con el id de un archivo de entrega pendiente del mismo usuario responde 400 sin cambiarla ni confirmarlo", async () => {
    const e = await escenario()
    const creada = await peticion(
      e.tokens.maestro,
      "POST",
      `/api/clases/${e.claseId}/tareas`,
      cuerpoDeTarea({ titulo: "Tarea que se intenta editar" }),
    )
    expect(creada.statusCode, creada.body).toBe(201)
    const { tarea } = tareaRespuestaSchema.parse(creada.json())
    const archivo = await archivoDeEntregaDelMaestro(e)

    const respuesta = await peticion(
      e.tokens.maestro,
      "PUT",
      `/api/clases/${e.claseId}/tareas/${tarea.id}`,
      cuerpoDeTarea({ titulo: "Título nuevo", archivoIds: [archivo.id], version: tarea.version }),
    )

    expect(respuesta.statusCode, respuesta.body).toBe(400)
    expect(codigoDe(respuesta)).toBe("ARCHIVO_INVALIDO")
    expect(await leerArchivoDb(archivo.id)).toMatchObject({
      estado: "pendiente",
      publicacionId: null,
      entregaId: null,
    })
    const leida = await peticion(
      e.tokens.maestro,
      "GET",
      `/api/clases/${e.claseId}/tareas/${tarea.id}`,
    )
    expect(tareaRespuestaSchema.parse(leida.json()).tarea).toMatchObject({
      titulo: "Tarea que se intenta editar",
      version: tarea.version,
      adjuntos: [],
    })
  })
})
