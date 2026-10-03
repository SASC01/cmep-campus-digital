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
  leerInscripcion,
} from "./ayudas-clases.js"

// Ataque del Tester (CLASES-b, ronda 2): la corrección de T-20 (busquedaCandidatosSchema mide la
// longitud de q después de normalizar) con otros alfabetos y bordes de 120/121 normalizados y
// 1000/1001 en crudo, y la concurrencia de movimientos con varios alumnos a la vez. Cada caso de la
// tabla lleva lo que el frontend decide (terminoDeBusquedaValido y maxLength=120 del campo, en
// unidades UTF-16), calculado a mano: frontend y backend deben coincidir (S-11, §D-B5). Limpieza en
// el orden de N-10.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const ficha = (): string => `qy${randomBytes(5).toString("hex")}`

interface Cuenta {
  id: string
  token: string
}

const crearCuenta = async (
  nombre: string,
  rol: "estudiante" | "maestro" = "estudiante",
): Promise<Cuenta> => {
  const { id } = await obtenerDb().usuario.create({
    data: {
      email: `b-r2-${randomUUID()}@pruebas.local`,
      hashContrasena: "sin-uso-en-esta-prueba",
      nombre,
      nombreBusqueda: normalizarParaBusqueda(nombre),
      rol,
    },
    select: { id: true },
  })
  idsUsuarios.push(id)
  return { id, token: await firmarTokenDePrueba({ usuarioId: id }) }
}

const pedir = (
  method: "GET" | "POST" | "DELETE",
  url: string,
  token: string,
  payload?: Record<string, unknown>,
): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method,
    url,
    ...(payload === undefined ? {} : { payload }),
    headers: { authorization: `Bearer ${token}` },
  })

const codigoDe = (respuesta: LightMyRequestResponse): string => {
  try {
    return (JSON.parse(respuesta.body) as { error?: { codigo?: string } }).error?.codigo ?? ""
  } catch {
    return ""
  }
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  // N-10: movimientos y clases antes que los usuarios (ON DELETE RESTRICT).
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("ataque CLASES-b r2: T-20 con otros alfabetos y bordes", () => {
  it("cada término responde lo que S-11 pide y lo que el frontend espera, y los nombres en otros alfabetos se encuentran", async () => {
    const t = ficha()
    const dueno = await crearCuenta(`Dueño ${t}`, "maestro")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const japones = await crearCuenta(`山田太郎 ${t}`)
    const arabe = await crearCuenta(`محمد علي ${t}`)
    const devanagari = await crearCuenta(`क्षमा ${t}`)
    const tailandes = await crearCuenta(`สมชาย ${t}`)
    const turco = await crearCuenta(`İnci ${t}`)

    // [término, estado esperado, código, id que debe aparecer (si 200)]
    const casos: [string, number, string, string | null][] = [
      ["山田太", 200, "", japones.id],
      ["山田", 400, "VALIDACION", null],
      ["محمد", 200, "", arabe.id],
      ["مح", 400, "VALIDACION", null],
      // क्ष: la virama (Mn) se quita: 3 en crudo, 2 normalizados → core.
      ["क्ष", 400, "BUSQUEDA_MUY_CORTA", null],
      ["क्षमा", 200, "", devanagari.id],
      ["สมชาย", 200, "", tailandes.id],
      // İ se descompone en I + U+0307 (marca que se quita) y pasa a minúscula.
      ["İnc", 200, "", turco.id],
      ["İİ", 400, "VALIDACION", null],
      // Ligaduras: NFD no las descompone.
      ["ﬁﬁ", 400, "VALIDACION", null],
      ["ﬁﬁﬁ", 200, "", null],
      // Separadores que \s junta (U+2028, U+3000, U+00A0) y uno que no (U+200B).
      ["a b", 200, "", null],
      ["a　 b", 200, "", null],
      ["　a　", 400, "BUSQUEDA_MUY_CORTA", null],
      ["a​b", 200, "", null],
    ]
    const discrepancias: string[] = []
    for (const [q, estado, codigo, idEsperado] of casos) {
      const respuesta = await pedir(
        "GET",
        `/api/clases/${clase.id}/alumnos/candidatos?${new URLSearchParams({ q, limite: "50" }).toString()}`,
        dueno.token,
      )
      const obtenido = `${String(respuesta.statusCode)} ${codigoDe(respuesta)}`
      if (obtenido !== `${String(estado)} ${codigo}`) {
        discrepancias.push(
          `${JSON.stringify(q)}: esperado ${String(estado)} ${codigo}, obtenido ${obtenido}`,
        )
      }
      if (idEsperado !== null && respuesta.statusCode === 200) {
        const ids = respuesta.json<{ candidatos: { id: string }[] }>().candidatos.map((c) => c.id)
        if (!ids.includes(idEsperado)) discrepancias.push(`${JSON.stringify(q)}: no lo encontró`)
      }
    }
    expect(discrepancias).toEqual([])
  })

  it("bordes: 120 y 121 normalizados, 1000 y 1001 en crudo, y 40 y 41 sílabas hangul (120 y 123 normalizados)", async () => {
    const t = ficha()
    const dueno = await crearCuenta(`Dueño ${t}`, "maestro")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const casos: [string, string, string][] = [
      ["120 normalizados", "a".repeat(120), "200 "],
      ["121 normalizados", "a".repeat(121), "400 VALIDACION"],
      ["120 normalizados y 500 espacios", `${"a".repeat(120)}${" ".repeat(500)}`, "200 "],
      ["1000 en crudo", `abc${" ".repeat(997)}`, "200 "],
      ["1001 en crudo", `abc${" ".repeat(998)}`, "400 VALIDACION"],
      ["40 sílabas hangul", "각".repeat(40), "200 "],
      ["41 sílabas hangul", "각".repeat(41), "400 VALIDACION"],
      ["120 emojis", "😀".repeat(120), "200 "],
      ["121 emojis", "😀".repeat(121), "400 VALIDACION"],
    ]
    const resultados: string[] = []
    for (const [nombre, q] of casos) {
      const respuesta = await pedir(
        "GET",
        `/api/clases/${clase.id}/alumnos/candidatos?${new URLSearchParams({ q }).toString()}`,
        dueno.token,
      )
      resultados.push(`${nombre}: ${String(respuesta.statusCode)} ${codigoDe(respuesta)}`)
    }
    expect(resultados).toEqual(casos.map(([nombre, , esperado]) => `${nombre}: ${esperado}`))
  })
})

describe("ataque CLASES-b r2: movimientos con varios alumnos a la vez", () => {
  it("altas y bajas cruzadas de tres alumnos en la misma clase, en orden aleatorio: el invariante se cumple para cada uno", async () => {
    const t = ficha()
    const dueno = await crearCuenta(`Dueño ${t}`, "maestro")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const alumnos = [
      await crearCuenta(`Uno ${t}`),
      await crearCuenta(`Dos ${t}`),
      await crearCuenta(`Tres ${t}`),
    ]
    const operaciones = alumnos.flatMap((alumno) => [
      () => pedir("POST", `/api/clases/${clase.id}/alumnos`, dueno.token, { alumnoId: alumno.id }),
      () => pedir("POST", `/api/clases/${clase.id}/alumnos`, dueno.token, { alumnoId: alumno.id }),
      () => pedir("DELETE", `/api/clases/${clase.id}/alumnos/${alumno.id}`, dueno.token),
    ])
    for (let i = operaciones.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const intercambio = operaciones[i]
      const otra = operaciones[j]
      if (intercambio === undefined || otra === undefined) throw new Error("índice fuera de rango")
      operaciones[i] = otra
      operaciones[j] = intercambio
    }
    const respuestas = await Promise.all(operaciones.map((operacion) => operacion()))
    expect(respuestas.filter((r) => r.statusCode >= 500).map((r) => r.body)).toEqual([])

    for (const alumno of alumnos) {
      const filas = await obtenerDb().movimientoInscripcion.findMany({
        where: { claseId: clase.id, alumnoId: alumno.id },
        orderBy: { secuencia: "asc" },
      })
      const inscrito = (await leerInscripcion(clase.id, alumno.id)) !== null
      const contexto = filas.map((f) => f.tipo).join(",")
      expect(filas.length, contexto).toBeGreaterThan(0)
      filas.forEach((fila, indice) => {
        expect(fila.tipo, contexto).toBe(indice % 2 === 0 ? "alta" : "baja")
        // CLASES-02a ronda 0 (C-6, P-08 a): maestroId pasa a actorId (misma columna maestro_id).
        expect(fila.actorId).toBe(dueno.id)
      })
      expect(filas.at(-1)?.tipo === "alta", contexto).toBe(inscrito)
    }
  })
})
