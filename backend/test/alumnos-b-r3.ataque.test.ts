import { randomBytes, randomUUID } from "node:crypto"

import { estadoDeTerminoDeBusqueda, normalizarTerminoDeBusqueda } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { normalizarParaBusqueda } from "../src/core/auth/normalizacion.js"
import { prepararTerminoDeBusqueda } from "../src/core/clases/busqueda.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"

// Ataque del Tester (CLASES-b, ronda 3): la normalización unificada de T-24 en los tres lados
// (estadoDeTerminoDeBusqueda de shared, que decide el frontend; prepararTerminoDeBusqueda de core; y
// la respuesta del endpoint, que valida con busquedaCandidatosSchema), con los bordes de 120/121
// normalizados y 1000/1001 en crudo; partes locales de 64 caracteres en el enmascarado; y el cursor
// del roster de otra clase con homónimos (§D-B3 bis, O-01). Limpieza en el orden de N-10.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const ficha = (): string => `qx${randomBytes(5).toString("hex")}`

interface Cuenta {
  id: string
  email: string
  nombre: string
  token: string
}

const crearCuenta = async (
  nombre: string,
  {
    rol = "estudiante",
    email = `b-r3-${randomUUID()}@pruebas.local`,
  }: { rol?: "estudiante" | "maestro"; email?: string } = {},
): Promise<Cuenta> => {
  const { id } = await obtenerDb().usuario.create({
    data: {
      email,
      hashContrasena: "sin-uso-en-esta-prueba",
      nombre,
      nombreBusqueda: normalizarParaBusqueda(nombre),
      rol,
    },
    select: { id: true },
  })
  idsUsuarios.push(id)
  return { id, email, nombre, token: await firmarTokenDePrueba({ usuarioId: id }) }
}

const pedir = (url: string, token: string): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({ method: "GET", url, headers: { authorization: `Bearer ${token}` } })

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

describe("ataque CLASES-b r3: la normalización unificada en los tres lados", () => {
  it("para cada término, shared (frontend), core y el endpoint deciden lo mismo, también en los bordes de 120/121 y 1000/1001", async () => {
    const t = ficha()
    const dueno = await crearCuenta(`Dueño ${t}`, { rol: "maestro" })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const terminos: [string, string][] = [
      ["120 normalizados", "a".repeat(120)],
      ["121 normalizados", "a".repeat(121)],
      ["119 + marca", `${"a".repeat(119)}b́`],
      ["120 + marcas sueltas", `${"a".repeat(120)}́́́`],
      ["121 con espacios interiores dobles", `${"a ".repeat(60)}b`.replace(/ /g, "  ")],
      ["1000 en crudo, 3 normalizados", `abc${" ".repeat(997)}`],
      ["1001 en crudo, 3 normalizados", `abc${" ".repeat(998)}`],
      ["1000 en crudo de marcas y 3 letras", `abc${"́".repeat(997)}`],
      ["1001 en crudo de marcas y 3 letras", `abc${"́".repeat(998)}`],
      ["40 hangul (120)", "각".repeat(40)],
      ["41 hangul (123)", "각".repeat(41)],
      ["60 emojis (120 unidades)", "😀".repeat(60)],
      ["120 emojis (240 unidades)", "😀".repeat(120)],
      ["121 emojis", "😀".repeat(121)],
      ["İ ×3", "İİİ"],
      ["İ ×2", "İİ"],
      ["2 en crudo", "ab"],
      ["3 marcas", "́́́"],
      ["espacios", "     "],
      ["U+FEFF entre letras", "a﻿b"],
      ["U+200B entre letras", "a​b"],
      ["tab y salto", "a\t\nb"],
    ]
    const discrepancias: string[] = []
    for (const [nombre, q] of terminos) {
      const estado = estadoDeTerminoDeBusqueda(q)
      const core = prepararTerminoDeBusqueda(q)
      const respuesta = await pedir(
        `/api/clases/${clase.id}/alumnos/candidatos?${new URLSearchParams({ q }).toString()}`,
        dueno.token,
      )
      const endpoint = `${String(respuesta.statusCode)} ${codigoDe(respuesta)}`
      const esperado =
        estado === "valido"
          ? "200 "
          : estado === "largo"
            ? "400 VALIDACION"
            : Math.max(Array.from(q).length, Array.from(normalizarTerminoDeBusqueda(q)).length) < 3
              ? "400 VALIDACION"
              : "400 BUSQUEDA_MUY_CORTA"
      if (endpoint !== esperado)
        discrepancias.push(`${nombre}: shared ${estado}, endpoint ${endpoint}`)
      // core solo decide el mínimo: si shared dice "valido", core no puede decir null, y viceversa
      // con "corto".
      if (estado === "valido" && core === null)
        discrepancias.push(`${nombre}: core lo da por corto`)
      if (estado === "corto" && core !== null)
        discrepancias.push(`${nombre}: core lo da por válido`)
      // nombre_busqueda se calcula con core/auth: la misma normalización.
      if (normalizarParaBusqueda(q) !== normalizarTerminoDeBusqueda(q)) {
        discrepancias.push(`${nombre}: core/auth y shared normalizan distinto`)
      }
    }
    expect(discrepancias).toEqual([])
  })
})

describe("ataque CLASES-b r3: enmascarado con partes locales de 64 caracteres", () => {
  it("64 caracteres con +, puntos y mayúsculas al principio: solo los 2 primeros, nunca la parte local", async () => {
    const t = ficha()
    const dueno = await crearCuenta(`Dueño ${t}`, { rol: "maestro" })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const dominio = `${t}.pruebas.local`
    const locales = [
      `a+${"b".repeat(62)}`,
      `.X${"y".repeat(62)}`,
      `${"z".repeat(63)}+`,
      `Ab.${"c".repeat(61)}`,
    ]
    for (const local of locales) expect(local).toHaveLength(64)
    const cuentas: Cuenta[] = []
    for (const [i, local] of locales.entries()) {
      cuentas.push(await crearCuenta(`Larga ${t} ${String(i)}`, { email: `${local}@${dominio}` }))
    }
    const respuesta = await pedir(
      `/api/clases/${clase.id}/alumnos/candidatos?${new URLSearchParams({ q: `larga ${t}` }).toString()}`,
      dueno.token,
    )
    expect(respuesta.statusCode).toBe(200)
    const candidatos = respuesta.json<{
      candidatos: { id: string; correoEnmascarado: string }[]
    }>().candidatos
    for (const [i, local] of locales.entries()) {
      const cuenta = cuentas[i]
      if (cuenta === undefined) throw new Error("falta la cuenta")
      expect(candidatos.find((c) => c.id === cuenta.id)?.correoEnmascarado).toBe(
        `${local.slice(0, 2)}***@${dominio}`,
      )
      expect(respuesta.body).not.toContain(local.slice(0, 3))
      expect(respuesta.body).not.toContain(cuenta.email)
    }
  })
})

describe("ataque CLASES-b r3: cursor del roster de otra clase con homónimos", () => {
  it("un cursor de otra clase con el mismo nombre continúa por (nombre_busqueda, id) sin colarse ni repetir", async () => {
    const t = ficha()
    const dueno = await crearCuenta(`Dueño ${t}`, { rol: "maestro" })
    const otro = await crearCuenta(`Otro ${t}`, { rol: "maestro" })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const otraClase = await crearClaseDePrueba(idsClases, { maestroId: otro.id })
    const miembros: Cuenta[] = []
    for (let i = 0; i < 5; i++) miembros.push(await crearCuenta(`Homónimo ${t}`))
    miembros.push(await crearCuenta(`Zeta ${t}`))
    for (const miembro of miembros) await inscribirDePrueba(clase.id, miembro.id)
    const ajenos: Cuenta[] = []
    for (let i = 0; i < 3; i++) ajenos.push(await crearCuenta(`Homónimo ${t}`))
    for (const ajeno of ajenos) await inscribirDePrueba(otraClase.id, ajeno.id)
    const lector = miembros[0]
    if (lector === undefined) throw new Error("sin lector")

    const clave = (c: Cuenta): [string, string] => [normalizarParaBusqueda(c.nombre), c.id]
    const mayor = (a: [string, string], b: [string, string]) =>
      a[0] > b[0] || (a[0] === b[0] && a[1] > b[1])
    const ordenados = [...miembros].sort((a, b) => (mayor(clave(a), clave(b)) ? 1 : -1))

    for (const [ruta, token] of [
      ["alumnos", dueno.token],
      ["personas", lector.token],
    ] as const) {
      for (const ajeno of ajenos) {
        const respuesta = await pedir(
          `/api/clases/${clase.id}/${ruta}?limite=100&cursor=${ajeno.id}`,
          token,
        )
        expect(respuesta.statusCode, `${ruta} con el cursor ${ajeno.id}`).toBe(200)
        const ids = respuesta.json<{ alumnos: { id: string }[] }>().alumnos.map((a) => a.id)
        const esperados = ordenados.filter((m) => mayor(clave(m), clave(ajeno))).map((m) => m.id)
        expect(ids, `${ruta} con el cursor ${ajeno.id}`).toEqual(esperados)
        expect(ids).not.toContain(ajeno.id)
      }
    }
  })
})
