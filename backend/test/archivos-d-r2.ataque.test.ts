import { errorApiSchema, solicitarSubidaRespuestaSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import type { Almacen } from "../src/core/archivos/almacen.js"
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
  inscribirDePrueba,
  leerArchivoDb,
  listarArchivosDb,
} from "./ayudas-clases.js"

// Ataque del Tester (CLASES-d, ronda 2; puntos 1, 3 y 6 de la lista del manager). T-42 por la
// razón correcta y en sus bordes (sustitutos sueltos altos y bajos al inicio, en medio y al final;
// pares válidos de emoji y de CJK del plano astral), y T-39 del lado del servidor: aunque el almacén
// devolviera una URL que no es http(s), la API no la entrega. Los sustitutos se construyen con
// String.fromCharCode: el archivo no lleva ninguno literal.

const ALTO = String.fromCharCode(0xd800)
const BAJO = String.fromCharCode(0xdc00)
const EMOJI = String.fromCharCode(0xd83d, 0xde00)
const CJK_ASTRAL = String.fromCharCode(0xd840, 0xdc00)

const memoria = crearAlmacenEnMemoria()
const idsUsuarios: string[] = []
const idsClases: string[] = []
let app: FastifyInstance | undefined
let appMaliciosa: FastifyInstance | undefined

// Un almacén que firma URL con otro protocolo: no existe con el adaptador real (el endpoint se
// valida como http o https), pero el servidor no debe confiar en eso.
const URL_SUBIDA_MALA = "javascript:alert(document.domain)//subida"
const URL_DESCARGA_MALA = "data:text/html,<script>alert(1)</script>"
const almacenMalicioso: Almacen = {
  urlDeSubida: () => Promise.resolve(URL_SUBIDA_MALA),
  urlDeDescarga: () => Promise.resolve(URL_DESCARGA_MALA),
  metadatosDe: () => Promise.resolve(null),
}

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const obtenerAppMaliciosa = (): FastifyInstance => {
  if (!appMaliciosa) throw new Error("La aplicación con el almacén malicioso no se construyó")
  return appMaliciosa
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen: memoria })
  await app.ready()
  appMaliciosa = await construirApp({ env: cargarEnv(), almacen: almacenMalicioso })
  await appMaliciosa.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await appMaliciosa?.close()
  await app?.close()
})

interface Escenario {
  claseId: string
  maestro: UsuarioDePrueba
  tokenMaestro: string
  tokenAlumno: string
}

const escenario = async (): Promise<Escenario> => {
  const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Maestra D2" })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  const alumno = await crearAlumnoDePrueba(idsUsuarios, { nombre: "Alumno D2" })
  await inscribirDePrueba(clase.id, alumno.id, "codigo")
  return {
    claseId: clase.id,
    maestro,
    tokenMaestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
    tokenAlumno: await firmarTokenDePrueba({ usuarioId: alumno.id }),
  }
}

const solicitar = (
  e: Escenario,
  payload: unknown,
  servidor: FastifyInstance = obtenerApp(),
): Promise<LightMyRequestResponse> =>
  servidor.inject({
    method: "POST",
    url: `/api/clases/${e.claseId}/archivos`,
    headers: { authorization: `Bearer ${e.tokenMaestro}` },
    payload: payload as object,
  })

const puntosDe = (texto: string): string[] =>
  Array.from(texto, (c) => (c.codePointAt(0) ?? 0).toString(16))

describe("ataque d-r2: T-42 por la razón correcta y en sus bordes", () => {
  it("un sustituto suelto (alto o bajo) al inicio, en medio o al final da 400 ARCHIVO_INVALIDO, sin fila ni firma", async () => {
    const e = await escenario()
    const nombres = [
      `${ALTO}tema.pdf`,
      `tema${ALTO} uno.pdf`,
      `tema uno${ALTO}.pdf`,
      `${BAJO}tema.pdf`,
      `tema${BAJO} uno.pdf`,
      `tema uno.pdf${BAJO}`,
      `tema${BAJO}${ALTO}.pdf`,
    ]
    const firmasAntes = memoria.subidasFirmadas.length
    for (const nombre of nombres) {
      const respuesta = await solicitar(e, { nombre, tipo: "application/pdf", tamano: 10 })
      const etiqueta = puntosDe(nombre).join(" ")
      expect(respuesta.statusCode, etiqueta).toBe(400)
      expect(errorApiSchema.parse(respuesta.json()).error.codigo, etiqueta).toBe("ARCHIVO_INVALIDO")
    }
    expect(await listarArchivosDb(e.claseId)).toEqual([])
    expect(memoria.subidasFirmadas.length).toBe(firmasAntes)
  })

  it("los pares válidos (emoji y CJK del plano astral) se aceptan y se guardan tal cual", async () => {
    const e = await escenario()
    for (const nombre of [
      `${EMOJI}.png`,
      `tema ${CJK_ASTRAL} uno.pdf`,
      `${EMOJI}${CJK_ASTRAL}${EMOJI}.pdf`,
    ]) {
      const tipo = nombre.endsWith(".png") ? "image/png" : "application/pdf"
      const respuesta = await solicitar(e, { nombre, tipo, tamano: 10 })
      expect(respuesta.statusCode, respuesta.body).toBe(201)
      const { archivo } = solicitarSubidaRespuestaSchema.parse(respuesta.json())
      expect(puntosDe(archivo.nombre)).toEqual(puntosDe(nombre))
      const fila = await leerArchivoDb(archivo.id)
      expect(puntosDe(fila?.nombre ?? "")).toEqual(puntosDe(nombre))
    }
  })
})

describe("ataque d-r2: T-39 del lado del servidor", () => {
  it("si el almacén firmara una URL que no es http(s), ni solicitar, ni la descarga, ni el muro la entregan", async () => {
    const e = await escenario()
    const publicacionId = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      tipo: "material",
    })
    const imagen = await crearArchivoDePrueba({
      claseId: e.claseId,
      subidoPor: e.maestro.id,
      estado: "confirmado",
      publicacionId,
      nombre: "f.png",
      tipo: "image/png",
    })
    const servidor = obtenerAppMaliciosa()
    const respuestas = [
      await solicitar(e, { nombre: "a.pdf", tipo: "application/pdf", tamano: 10 }, servidor),
      await servidor.inject({
        method: "POST",
        url: `/api/clases/${e.claseId}/archivos/${imagen.id}/descarga`,
        headers: { authorization: `Bearer ${e.tokenAlumno}` },
      }),
      await servidor.inject({
        method: "GET",
        url: `/api/clases/${e.claseId}/publicaciones`,
        headers: { authorization: `Bearer ${e.tokenAlumno}` },
      }),
    ]
    for (const respuesta of respuestas) {
      expect(respuesta.statusCode, respuesta.body).toBeGreaterThanOrEqual(400)
      expect(respuesta.body).not.toContain("javascript:")
      expect(respuesta.body).not.toContain("data:text")
      expect(errorApiSchema.safeParse(respuesta.json()).success, respuesta.body).toBe(true)
    }
    // Control: la misma descarga con el almacén sano sí responde 200.
    const sana = await obtenerApp().inject({
      method: "POST",
      url: `/api/clases/${e.claseId}/archivos/${imagen.id}/descarga`,
      headers: { authorization: `Bearer ${e.tokenAlumno}` },
    })
    expect(sana.statusCode, sana.body).toBe(200)
  })
})
