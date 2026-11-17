import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba } from "./ayudas-auth.js"
import { borrarMovimientosYClasesDePrueba } from "./ayudas-clases.js"
import {
  codigoDe,
  crearEscenarioDeForo,
  crearForoDePrueba,
  mensajeDe,
  pedirForo,
  type EscenarioDeForo,
} from "./ayudas-foros.js"
import { crearTareaDePrueba } from "./ayudas-tareas.js"

// FORO-01b (§D-6, DH-09 a). FORO-1B06: el tipo de cada columna del gradebook y de "Mis calificaciones"
// sale solo con conTipo=si; sin él, la respuesta es la de siempre, llave por llave. La exportación
// nunca lo lleva.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}
const pedir = pedirForo(obtenerApp)

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen: crearAlmacenEnMemoria() })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const CLAVES_DE_LA_COLUMNA = ["categoria", "fechaLimite", "id", "puntos", "titulo"]

interface Montaje {
  e: EscenarioDeForo
  tarea: string
  foro: string
}

const montar = async (): Promise<Montaje> => {
  const e = await crearEscenarioDeForo(idsUsuarios, idsClases)
  const tarea = await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
  const foro = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
  return { e, tarea, foro }
}

const columnas = async (
  e: EscenarioDeForo,
  ruta: "gradebook" | "mis-calificaciones" | "calificaciones/exportacion",
  consulta: string,
) => {
  const token = ruta === "mis-calificaciones" ? e.tokenAlumno : e.tokenMaestro
  const respuesta = await pedir({
    method: "GET",
    url: `/api/clases/${e.claseId}/${ruta}${consulta}`,
    token,
  })
  expect(respuesta.statusCode, respuesta.body).toBe(200)
  return respuesta.json<{ tareas: Record<string, unknown>[] }>().tareas
}

describe("FORO-1B06: el tipo de la actividad en las calificaciones (opt-in)", () => {
  it("FORO-1B06: con conTipo=si, cada columna del gradebook y de Mis calificaciones lleva su tipo (tarea o foro)", async () => {
    const { e, tarea, foro } = await montar()
    for (const ruta of ["gradebook", "mis-calificaciones"] as const) {
      const lista = await columnas(e, ruta, "?conTipo=si")
      const tipoDe = (id: string) => lista.find((columna) => columna.id === id)?.tipo
      expect(lista).toHaveLength(2)
      expect(tipoDe(tarea), ruta).toBe("tarea")
      expect(tipoDe(foro), ruta).toBe("foro")
    }
  })

  it("FORO-1B06: sin el parámetro, las columnas son las de siempre, llave por llave (sin tipo)", async () => {
    const { e } = await montar()
    for (const ruta of ["gradebook", "mis-calificaciones"] as const) {
      const lista = await columnas(e, ruta, "")
      expect(lista).toHaveLength(2)
      for (const columna of lista) {
        // "Mis calificaciones" suma la entrega del alumno a la columna.
        const claves = Object.keys(columna).filter((clave) => clave !== "entrega")
        expect(claves.sort(), ruta).toEqual(CLAVES_DE_LA_COLUMNA)
      }
    }
  })

  it("FORO-1B06: conTipo=no o repetido responde 400 VALIDACION «conTipo: no es válido»", async () => {
    const { e } = await montar()
    for (const ruta of ["gradebook", "mis-calificaciones"]) {
      for (const consulta of ["?conTipo=no", "?conTipo=si&conTipo=si", "?conTipo="]) {
        const respuesta = await pedir({
          method: "GET",
          url: `/api/clases/${e.claseId}/${ruta}${consulta}`,
          token: ruta === "mis-calificaciones" ? e.tokenAlumno : e.tokenMaestro,
        })
        expect(respuesta.statusCode, `${ruta}${consulta}`).toBe(400)
        expect(codigoDe(respuesta)).toBe("VALIDACION")
        expect(mensajeDe(respuesta)).toBe("conTipo: conTipo: no es válido")
      }
    }
  })

  it("FORO-1B06: la exportación nunca lleva tipo, tampoco si se le pide", async () => {
    const { e, foro } = await montar()
    for (const consulta of ["", "?conTipo=si"]) {
      const lista = await columnas(e, "calificaciones/exportacion", consulta)
      expect(lista.map((columna) => columna.id)).toContain(foro)
      for (const columna of lista) {
        expect(Object.keys(columna).sort(), consulta).toEqual(CLAVES_DE_LA_COLUMNA)
      }
    }
  })
})
