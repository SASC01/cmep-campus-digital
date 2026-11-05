import { randomUUID } from "node:crypto"

import { claseRespuestaSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { pino } from "pino"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { procesarCopiaDeObjetos } from "../src/workers/objetos.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba } from "./ayudas-auth.js"
import { terminarCopiasDePrueba, trabajosDeCopiaCon } from "./ayudas-borrado-duplicado.js"
import { archivarClaseDePrueba, codigoDeError, pedirComo } from "./ayudas-clases-archivadas.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { crearMaterialConTemaDePrueba } from "./ayudas-tareas.js"
import { crearObjetosEnMemoria, type ObjetosEnMemoria } from "./objetos-en-memoria.js"

// Ataque del Tester, ADMIN-01b, ronda 2: las carreras que quedaron pendientes entre duplicar, borrar,
// descargar y el worker de copias, sin retener filas ni tablas (lección de ADM-T1B07): cada vuelta
// lanza a la vez una petición HTTP y la función del worker, llamada directo (N-29: ningún consumidor
// en COPIAR_OBJETOS ni en BORRAR_OBJETOS). Lo que se busca: un 500 (por ejemplo, un P2003 de la FK
// RESTRICT de copia_de sin traducir), una copia que apunte a un original sin objeto o una descarga
// firmada de un objeto que todavía no existe. N-18: toda clase nace con un maestro. El log de la app
// va en "error": un 500 ("Error no controlado") sale en la corrida.

let app: FastifyInstance | undefined
const almacen = crearAlmacenEnMemoria()
const idsUsuarios: string[] = []
const idsClases: string[] = []
let tokenAdmin = ""
const log = pino({ level: "silent" })
const VUELTAS = 4

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const ficha = (): string => randomUUID().slice(0, 8)

const pedir = (method: "GET" | "POST" | "DELETE", url: string, payload?: object) =>
  pedirComo(obtenerApp(), {
    method,
    url,
    token: tokenAdmin,
    ...(payload === undefined ? {} : { payload }),
  })

const resumen = (r: LightMyRequestResponse): string => {
  if (r.statusCode < 400 || r.body === "") return String(r.statusCode)
  return `${String(r.statusCode)} ${codigoDeError(r)}`
}

beforeAll(async () => {
  app = await construirApp({ env: { ...cargarEnv(), LOG_LEVEL: "error" }, almacen })
  await app.ready()
  tokenAdmin = await tokenDelAdminDePrueba()
}, 30_000)

afterAll(async () => {
  await terminarCopiasDePrueba(idsClases)
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

// Una original Z con un recurso de aprendizaje y un archivo cuyo objeto está en `objetos`, y su
// copia X recién duplicada (copia en curso). Devuelve el trabajo de copia de X.
const copiaEnCurso = async (objetos: ObjetosEnMemoria) => {
  const maestro = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Maestro ${ficha()}`,
    rol: "maestro",
  })
  const original = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  const recursoId = await crearMaterialConTemaDePrueba({
    claseId: original.id,
    autorId: maestro.id,
    bloque: "aprendizaje",
  })
  const archivoOriginal = await crearArchivoDePrueba({
    claseId: original.id,
    subidoPor: maestro.id,
    estado: "confirmado",
    publicacionId: recursoId,
  })
  objetos.claves.add(archivoOriginal.claveObjeto)
  const duplicada = await pedir("POST", `/api/admin/clases/${original.id}/duplicar`, {
    nombre: `Copia ${ficha()}`,
    maestroIds: [maestro.id],
  })
  expect(duplicada.statusCode, duplicada.body).toBe(201)
  const copiaId = claseRespuestaSchema.parse(duplicada.json()).clase.id
  idsClases.push(copiaId)
  const archivoCopia = await obtenerDb().archivo.findFirstOrThrow({ where: { claseId: copiaId } })
  const [trabajo] = await trabajosDeCopiaCon([archivoCopia.id])
  if (trabajo === undefined) throw new Error("Precondición: el duplicado encoló su copia")
  return { maestro, original, archivoOriginal, copiaId, archivoCopia, trabajo }
}

const correrCopia = (
  trabajo: { id: string; datos: Record<string, unknown> },
  objetos: ObjetosEnMemoria,
) =>
  procesarCopiaDeObjetos(
    { id: trabajo.id, datos: trabajo.datos },
    { almacenDeObjetos: objetos, log },
  )

// Toda copia en curso apunta a un original que existe y cuyo objeto existe; toda copia terminada
// (confirmada, sin copia_de) tiene su objeto.
const coherente = async (claseId: string, objetos: ObjetosEnMemoria) => {
  const filas = await obtenerDb().archivo.findMany({
    where: { claseId },
    select: {
      estado: true,
      copiaDe: true,
      claveObjeto: true,
      original: { select: { claveObjeto: true } },
    },
  })
  for (const fila of filas) {
    if (fila.estado !== "confirmado") continue
    if (fila.copiaDe === null) {
      expect(objetos.claves.has(fila.claveObjeto), "una copia terminada tiene su objeto").toBe(true)
      continue
    }
    expect(fila.original, "una copia en curso apunta a un original que existe").not.toBeNull()
    expect(objetos.claves.has(fila.original?.claveObjeto ?? ""), "con objeto").toBe(true)
  }
}

describe("carreras entre duplicar, borrar, descargar y el worker de copias (ataque 01b-r2)", () => {
  it("ADM-T2B05: duplicar la copia X mientras el worker termina sus copias → 409 CLASE_CON_COPIAS_EN_CURSO o 201; con 201, las copias nuevas apuntan a archivos de X ya terminados y con objeto; nunca 500", async () => {
    const vistos = new Set<string>()
    for (let vuelta = 0; vuelta < VUELTAS; vuelta++) {
      const objetos = crearObjetosEnMemoria()
      const c = await copiaEnCurso(objetos)
      const [duplicado] = await Promise.all([
        pedir("POST", `/api/admin/clases/${c.copiaId}/duplicar`, {
          nombre: `Nieta ${ficha()}`,
          maestroIds: [c.maestro.id],
        }),
        correrCopia(c.trabajo, objetos),
      ])
      const estado = resumen(duplicado)
      vistos.add(estado)
      expect(["201", "409 CLASE_CON_COPIAS_EN_CURSO"], duplicado.body).toContain(estado)
      if (duplicado.statusCode === 201) {
        const nietaId = claseRespuestaSchema.parse(duplicado.json()).clase.id
        idsClases.push(nietaId)
        await coherente(nietaId, objetos)
      }
      await coherente(c.copiaId, objetos)
    }
    expect(vistos.size, `salidas vistas: ${[...vistos].join(", ")}`).toBeGreaterThanOrEqual(1)
  }, 120_000)

  it("ADM-T2B06: borrar la original Z (archivada) mientras el worker termina la copia de X → 409 CLASE_CON_COPIAS_EN_CURSO o 204; con 204, la copia de X ya terminó y su objeto existe; nunca 500 ni una copia en curso con su original borrado", async () => {
    for (let vuelta = 0; vuelta < VUELTAS; vuelta++) {
      const objetos = crearObjetosEnMemoria()
      const c = await copiaEnCurso(objetos)
      await archivarClaseDePrueba(c.original.id)
      const [borrado] = await Promise.all([
        pedir("DELETE", `/api/admin/clases/${c.original.id}?confirmar=borrar`),
        correrCopia(c.trabajo, objetos),
      ])
      const estado = resumen(borrado)
      expect(["204", "409 CLASE_CON_COPIAS_EN_CURSO"], borrado.body).toContain(estado)
      const fila = await obtenerDb().archivo.findUniqueOrThrow({
        where: { id: c.archivoCopia.id },
        select: { estado: true, copiaDe: true },
      })
      expect(fila).toEqual({ estado: "confirmado", copiaDe: null })
      expect(objetos.claves.has(c.archivoCopia.claveObjeto)).toBe(true)
      if (borrado.statusCode === 409) {
        expect(await obtenerDb().clase.count({ where: { id: c.original.id } })).toBe(1)
        expect(
          resumen(await pedir("DELETE", `/api/admin/clases/${c.original.id}?confirmar=borrar`)),
        ).toBe("204")
      }
    }
  }, 120_000)

  it("ADM-T2B07: descargar el archivo de X mientras el worker lo copia → 409 ARCHIVO_EN_COPIA sin firma, o 200 con la clave de X solo si su objeto ya existe; nunca 500", async () => {
    for (let vuelta = 0; vuelta < VUELTAS; vuelta++) {
      const objetos = crearObjetosEnMemoria()
      const c = await copiaEnCurso(objetos)
      const firmadas = almacen.descargasFirmadas.length
      const [descarga] = await Promise.all([
        pedir("POST", `/api/clases/${c.copiaId}/archivos/${c.archivoCopia.id}/descarga`),
        correrCopia(c.trabajo, objetos),
      ])
      const estado = resumen(descarga)
      expect(["200", "409 ARCHIVO_EN_COPIA"], descarga.body).toContain(estado)
      const nuevas = almacen.descargasFirmadas.slice(firmadas).map((d) => d.clave)
      if (descarga.statusCode === 200) {
        expect(nuevas).toEqual([c.archivoCopia.claveObjeto])
        expect(objetos.claves.has(c.archivoCopia.claveObjeto)).toBe(true)
      } else {
        expect(nuevas).toEqual([])
      }
    }
  }, 120_000)
})
