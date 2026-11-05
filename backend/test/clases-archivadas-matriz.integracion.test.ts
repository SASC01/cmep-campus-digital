import { randomUUID } from "node:crypto"

import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba, type UsuarioDePrueba } from "./ayudas-auth.js"
import {
  archivarClaseDePrueba,
  codigoDeError,
  leerEstadoDeClase,
  pedirComo,
  rutasDeLaApp,
  type MetodoDePrueba,
} from "./ayudas-clases-archivadas.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  crearComentarioDePrueba,
  crearPublicacionDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"

// ADMIN-01a (ADM-1A09): la matriz de §D-1. Cada ruta con :claseId tiene su política de clase
// archivada; sin declararla queda cerrada. La tabla de abajo es la de §D-1 del plan, con los HEAD
// que Fastify agrega a cada GET.

type Politica = "lectura" | "lectura-del-alumno" | "gestion" | "cerrada"

const C = "/api/clases/:claseId"
const POLITICAS: Readonly<Record<string, Politica>> = {
  [`GET ${C}`]: "lectura-del-alumno",
  [`GET ${C}/mis-calificaciones`]: "lectura-del-alumno",
  [`GET ${C}/personas`]: "lectura",
  [`GET ${C}/alumnos`]: "lectura",
  [`GET ${C}/publicaciones`]: "lectura",
  [`GET ${C}/publicaciones/:publicacionId/comentarios`]: "lectura",
  [`GET ${C}/recursos`]: "lectura",
  [`GET ${C}/recursos/:recursoId`]: "lectura",
  [`GET ${C}/dudas`]: "lectura",
  [`GET ${C}/dudas/:dudaId/respuestas`]: "lectura",
  [`GET ${C}/temas`]: "lectura",
  [`GET ${C}/categorias`]: "lectura",
  [`GET ${C}/tareas/:tareaId`]: "lectura",
  [`GET ${C}/trabajo`]: "lectura",
  [`GET ${C}/tareas/:tareaId/entrega`]: "lectura",
  [`GET ${C}/tareas/:tareaId/entrega/comentarios`]: "lectura",
  [`GET ${C}/tareas/:tareaId/entregas`]: "lectura",
  [`GET ${C}/tareas/:tareaId/entregas/:alumnoId`]: "lectura",
  [`GET ${C}/tareas/:tareaId/entregas/:alumnoId/comentarios`]: "lectura",
  [`GET ${C}/gradebook`]: "lectura",
  [`GET ${C}/calificaciones/exportacion`]: "lectura",
  [`POST ${C}/archivos/:archivoId/descarga`]: "lectura",
  [`POST ${C}/tareas/:tareaId/entrega/archivos/:archivoId/descarga`]: "lectura",
  [`POST ${C}/tareas/:tareaId/entregas/:alumnoId/archivos/:archivoId/descarga`]: "lectura",
  "POST /api/admin/clases/:claseId/archivar": "gestion",
  "POST /api/admin/clases/:claseId/restaurar": "gestion",
  // ADMIN-01b (§D-4, §D-5): el conteo de borrado, el borrado definitivo y duplicar.
  "GET /api/admin/clases/:claseId/conteo-de-borrado": "gestion",
  "DELETE /api/admin/clases/:claseId": "gestion",
  "POST /api/admin/clases/:claseId/duplicar": "gestion",
  // Cerradas: escrituras, el código (no sirve en una archivada), los candidatos (solo sirven para
  // inscribir), editar la clase y la gestión de maestros (P-01 a′).
  [`GET ${C}/codigo`]: "cerrada",
  [`POST ${C}/codigo`]: "cerrada",
  [`GET ${C}/alumnos/candidatos`]: "cerrada",
  [`POST ${C}/alumnos`]: "cerrada",
  [`DELETE ${C}/alumnos/:alumnoId`]: "cerrada",
  [`POST ${C}/dudas`]: "cerrada",
  [`PUT ${C}/dudas/:dudaId/resuelta`]: "cerrada",
  [`DELETE ${C}/dudas/:dudaId`]: "cerrada",
  [`POST ${C}/dudas/:dudaId/respuestas`]: "cerrada",
  [`DELETE ${C}/dudas/:dudaId/respuestas/:respuestaId`]: "cerrada",
  [`POST ${C}/publicaciones`]: "cerrada",
  [`DELETE ${C}/publicaciones/:publicacionId`]: "cerrada",
  [`POST ${C}/publicaciones/:publicacionId/comentarios`]: "cerrada",
  [`DELETE ${C}/publicaciones/:publicacionId/comentarios/:comentarioId`]: "cerrada",
  [`DELETE ${C}/mis-comentarios/:comentarioId`]: "cerrada",
  [`PUT ${C}/recursos/:recursoId`]: "cerrada",
  [`PUT ${C}/categorias`]: "cerrada",
  [`POST ${C}/tareas/:tareaId/entrega`]: "cerrada",
  [`POST ${C}/tareas/:tareaId/entrega/anular`]: "cerrada",
  [`POST ${C}/tareas/:tareaId/entrega/archivos`]: "cerrada",
  [`POST ${C}/tareas/:tareaId/entrega/comentarios`]: "cerrada",
  [`POST ${C}/tareas/:tareaId/entregas/:alumnoId/comentarios`]: "cerrada",
  [`PUT ${C}/tareas/:tareaId/entregas/:alumnoId/calificacion`]: "cerrada",
  [`POST ${C}/tareas`]: "cerrada",
  [`PUT ${C}/tareas/:tareaId`]: "cerrada",
  [`DELETE ${C}/tareas/:tareaId`]: "cerrada",
  [`POST ${C}/temas`]: "cerrada",
  [`PUT ${C}/temas/orden`]: "cerrada",
  [`PUT ${C}/temas/:temaId`]: "cerrada",
  [`DELETE ${C}/temas/:temaId`]: "cerrada",
  [`PUT ${C}/publicaciones/:publicacionId/tema`]: "cerrada",
  [`POST ${C}/archivos`]: "cerrada",
  "PUT /api/admin/clases/:claseId": "cerrada",
  "POST /api/admin/clases/:claseId/maestros": "cerrada",
  "DELETE /api/admin/clases/:claseId/maestros/:maestroId": "cerrada",
}

// Con los HEAD que Fastify agrega a cada GET (heredan su cadena y su política).
const TABLA: ReadonlyMap<string, Politica> = new Map(
  Object.entries(POLITICAS).flatMap(([ruta, politica]) =>
    ruta.startsWith("GET ")
      ? [[ruta, politica] as const, [`HEAD ${ruta.slice(4)}`, politica] as const]
      : [[ruta, politica] as const],
  ),
)

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

interface Actores {
  maestro: string
  admin: string
  alumno: string
  ajeno: string
}

let actores: Actores = { maestro: "", admin: "", alumno: "", ajeno: "" }
let archivadaId = ""
let gemelaId = ""
let publicacionArchivadaId = ""

// La URL concreta de una ruta: la clase dada y un id cualquiera en los demás parámetros (el sexto
// paso corre antes de validarlos, y una ruta de lectura que llega al handler responde 404).
const urlDe = (ruta: string, claseId: string): string =>
  ruta
    .slice(ruta.indexOf(" ") + 1)
    .replace(":claseId", claseId)
    .replace(":publicacionId", publicacionArchivadaId)
    .replace(/:[a-zA-Z]+/g, () => randomUUID())

const pedirRuta = (ruta: string, claseId: string, token: string): Promise<LightMyRequestResponse> =>
  pedirComo(obtenerApp(), {
    method: ruta.slice(0, ruta.indexOf(" ")) as MetodoDePrueba,
    url: urlDe(ruta, claseId),
    token,
  })

const CODIGOS_DE_NO_ADMITIDO = new Set(["ROL_NO_PERMITIDO", "SIN_ACCESO_A_LA_CLASE"])

// HEAD no trae cuerpo: el código se infiere del GET equivalente.
const noAdmitido = async (
  ruta: string,
  respuesta: LightMyRequestResponse,
  claseId: string,
  token: string,
): Promise<boolean> => {
  if (respuesta.statusCode !== 403) return false
  if (!ruta.startsWith("HEAD ")) return CODIGOS_DE_NO_ADMITIDO.has(codigoDeError(respuesta))
  const delGet = await pedirRuta(`GET ${ruta.slice(5)}`, claseId, token)
  return CODIGOS_DE_NO_ADMITIDO.has(codigoDeError(delGet))
}

const esArchivada = async (ruta: string, respuesta: LightMyRequestResponse, token: string) => {
  if (respuesta.statusCode !== 409) return false
  if (!ruta.startsWith("HEAD ")) return codigoDeError(respuesta) === "CLASE_ARCHIVADA"
  const delGet = await pedirRuta(`GET ${ruta.slice(5)}`, archivadaId, token)
  return delGet.statusCode === 409 && codigoDeError(delGet) === "CLASE_ARCHIVADA"
}

const contarFilasDe = async (claseId: string) => {
  const db = obtenerDb()
  return {
    publicaciones: await db.publicacion.count({ where: { claseId } }),
    comentarios: await db.comentario.count({ where: { publicacion: { claseId } } }),
    temas: await db.tema.count({ where: { claseId } }),
    categorias: await db.categoria.count({ where: { claseId } }),
    tareas: await db.tarea.count({ where: { claseId } }),
    dudas: await db.duda.count({ where: { claseId } }),
    archivos: await db.archivo.count({ where: { claseId } }),
    inscripciones: await db.inscripcion.count({ where: { claseId } }),
    maestros: await db.maestroDeClase.count({ where: { claseId } }),
  }
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
  const maestro = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: "Maestra Matriz",
    rol: "maestro",
  })
  const alumno = await crearAlumnoDePrueba(idsUsuarios, { nombre: "Alumna Matriz" })
  const ajeno = await crearAlumnoDePrueba(idsUsuarios, { nombre: "Alumno Ajeno" })
  const archivada = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  const gemela = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  for (const clase of [archivada, gemela]) await inscribirDePrueba(clase.id, alumno.id)
  const publicacion = await crearPublicacionDePrueba({
    claseId: archivada.id,
    autorId: maestro.id,
  })
  await crearComentarioDePrueba({ publicacionId: publicacion, autorId: alumno.id })
  await archivarClaseDePrueba(archivada.id)
  archivadaId = archivada.id
  gemelaId = gemela.id
  publicacionArchivadaId = publicacion
  actores = {
    maestro: await tokenDe(maestro),
    admin: await tokenDelAdminDePrueba(),
    alumno: await tokenDe(alumno),
    ajeno: await tokenDe(ajeno),
  }
}, 60_000)

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const rutasConClase = (): string[] => {
  const { rutas, noReconocidas } = rutasDeLaApp(obtenerApp())
  expect(noReconocidas, "líneas del árbol de rutas que no se pudieron analizar").toEqual([])
  return [...rutas].filter((ruta) => ruta.includes(":claseId")).sort()
}

const rutasCon = (politica: Politica): string[] =>
  [...TABLA].filter(([, valor]) => valor === politica).map(([ruta]) => ruta)

describe("la clase archivada en el sexto paso (ADM-1A09)", () => {
  it("ADM-1A09 (a): las rutas con :claseId de printRoutes son exactamente las de la tabla de §D-1, métodos incluidos y HEAD aparte", () => {
    expect(rutasConClase()).toEqual([...TABLA.keys()].sort())
  })

  it("ADM-1A09 (b): con una clase archivada, cada ruta cerrada responde 409 CLASE_ARCHIVADA al maestro, al admin y al alumno inscrito cuando sus roles los admiten, sin escribir nada", async () => {
    const antes = {
      filas: await contarFilasDe(archivadaId),
      clase: await leerEstadoDeClase(archivadaId),
    }
    const cerradas = rutasCon("cerrada")
    expect(cerradas.length, "Precondición: hay rutas cerradas").toBeGreaterThan(30)
    let admitidas = 0
    for (const ruta of cerradas) {
      for (const [actor, token] of Object.entries({
        maestro: actores.maestro,
        admin: actores.admin,
        alumno: actores.alumno,
      })) {
        const enLaGemela = await pedirRuta(ruta, gemelaId, token)
        const enLaArchivada = await pedirRuta(ruta, archivadaId, token)
        if (await noAdmitido(ruta, enLaGemela, gemelaId, token)) {
          expect(enLaArchivada.statusCode, `${actor} ${ruta}`).toBe(403)
          continue
        }
        admitidas++
        expect(
          await esArchivada(ruta, enLaArchivada, token),
          `${actor} ${ruta}: ${String(enLaArchivada.statusCode)}`,
        ).toBe(true)
      }
    }
    expect(admitidas, "Precondición: alguna ruta cerrada admite a algún actor").toBeGreaterThan(30)
    expect(await contarFilasDe(archivadaId)).toEqual(antes.filas)
    expect(await leerEstadoDeClase(archivadaId)).toEqual(antes.clase)
  }, 120_000)

  it("ADM-1A09 (c): cada ruta «lectura» no responde 409 al maestro ni al admin y responde 409 CLASE_ARCHIVADA al alumno inscrito cuando la admite", async () => {
    const lecturas = rutasCon("lectura")
    let alAlumno = 0
    for (const ruta of lecturas) {
      for (const [actor, token] of Object.entries({
        maestro: actores.maestro,
        admin: actores.admin,
      })) {
        const respuesta = await pedirRuta(ruta, archivadaId, token)
        expect(respuesta.statusCode, `${actor} ${ruta}`).not.toBe(409)
      }
      const enLaGemela = await pedirRuta(ruta, gemelaId, actores.alumno)
      const enLaArchivada = await pedirRuta(ruta, archivadaId, actores.alumno)
      if (await noAdmitido(ruta, enLaGemela, gemelaId, actores.alumno)) {
        expect(enLaArchivada.statusCode, `alumno ${ruta}`).toBe(403)
        continue
      }
      alAlumno++
      expect(await esArchivada(ruta, enLaArchivada, actores.alumno), `alumno ${ruta}`).toBe(true)
    }
    expect(alAlumno, "Precondición: alguna lectura admite al alumno").toBeGreaterThan(5)
  }, 120_000)

  it("ADM-1A09 (d): las dos rutas «lectura-del-alumno» responden 200 al alumno inscrito (también su HEAD) y al maestro y al admin", async () => {
    const rutas = rutasCon("lectura-del-alumno")
    expect(rutas).toHaveLength(4)
    for (const ruta of rutas) {
      const delAlumno = await pedirRuta(ruta, archivadaId, actores.alumno)
      expect(delAlumno.statusCode, `alumno ${ruta}`).toBe(200)
    }
    for (const token of [actores.maestro, actores.admin]) {
      const detalle = await pedirRuta(`GET ${C}`, archivadaId, token)
      expect(detalle.statusCode).toBe(200)
    }
  })

  it("ADM-1A09 (e): un alumno no inscrito recibe 403 SIN_ACCESO_A_LA_CLASE (nunca 409) en una archivada, en toda ruta que admite su rol", async () => {
    let revisadas = 0
    for (const ruta of [...TABLA.keys()]) {
      if (ruta.startsWith("HEAD ")) continue
      const respuesta = await pedirRuta(ruta, archivadaId, actores.ajeno)
      expect(respuesta.statusCode, ruta).toBe(403)
      const codigo = codigoDeError(respuesta)
      expect(["SIN_ACCESO_A_LA_CLASE", "ROL_NO_PERMITIDO"], ruta).toContain(codigo)
      if (codigo === "SIN_ACCESO_A_LA_CLASE") revisadas++
    }
    expect(revisadas, "Precondición: hay rutas que admiten al alumno").toBeGreaterThan(10)
  }, 60_000)
})
