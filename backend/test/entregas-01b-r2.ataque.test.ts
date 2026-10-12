import { randomUUID } from "node:crypto"

import {
  entregaDeAlumnoRespuestaSchema,
  errorApiSchema,
  listaEntregasRespuestaSchema,
  listaTrabajoRespuestaSchema,
  miEntregaRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba, type UsuarioDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { crearEntregaDePrueba, leerEntregaDb, trabajosDeEntregaDeTarea } from "./ayudas-entregas.js"
import { crearTareaDePrueba } from "./ayudas-tareas.js"

// Ataques del Tester, ENTREGAS-01b ronda 2: el remedio de T-01 (el tope de 2048 también sobre el
// enlace normalizado, `.pipe(z.string().max(…))` en enlaceDeEntregaSchema) y sus vecinos, por HTTP.
// Las fechas límite llevan 48 h de margen; ninguna prueba compara textos relativos al tiempo.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen: crearAlmacenEnMemoria() })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

interface Escenario {
  claseId: string
  maestro: UsuarioDePrueba
  ana: UsuarioDePrueba
  t: { maestro: string; ana: string; admin: string }
}

const escenario = async (): Promise<Escenario> => {
  const ficha = randomUUID().slice(0, 6)
  const maestro = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Maestra R2 ${ficha}`,
    rol: "maestro",
  })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  const ana = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Ana R2 ${ficha}` })
  await inscribirDePrueba(clase.id, ana.id)
  return {
    claseId: clase.id,
    maestro,
    ana,
    t: {
      maestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
      ana: await firmarTokenDePrueba({ usuarioId: ana.id }),
      admin: await tokenDelAdminDePrueba(),
    },
  }
}

const tarea = (e: Escenario) =>
  crearTareaDePrueba({
    claseId: e.claseId,
    autorId: e.maestro.id,
    fechaLimite: new Date(Date.now() + 48 * 3_600_000),
  })

const base = (claseId: string, tareaId: string) => `/api/clases/${claseId}/tareas/${tareaId}`

const pedir = (metodo: "GET" | "POST", url: string, token: string, payload?: unknown) =>
  obtenerApp().inject({
    method: metodo,
    url,
    ...(payload === undefined ? {} : { payload: payload as object }),
    headers: {
      authorization: `Bearer ${token}`,
      ...(payload === undefined ? {} : { "content-type": "application/json" }),
    },
  })

const entregar = (e: Escenario, tareaId: string, enlaces: unknown) =>
  pedir("POST", `${base(e.claseId, tareaId)}/entrega`, e.t.ana, { archivoIds: [], enlaces })

const resultado = (r: LightMyRequestResponse): string =>
  r.statusCode < 400
    ? String(r.statusCode)
    : `${String(r.statusCode)} ${errorApiSchema.parse(r.json()).error.codigo}`
const mensajeDe = (r: LightMyRequestResponse): string =>
  errorApiSchema.parse(r.json()).error.mensaje

// Nada escrito: ni fila de entregas, ni archivos confirmados en ella, ni ENTREGA_REALIZADA.
const nadaEscrito = async (tareaId: string, alumnoId: string): Promise<string[]> => {
  const fallas: string[] = []
  const fila = await leerEntregaDb(tareaId, alumnoId)
  if (fila !== null) fallas.push(`fila de entregas en ${fila.estado}`)
  const confirmados = await obtenerDb().archivo.count({
    where: { entrega: { tareaId }, estado: "confirmado" },
  })
  if (confirmados > 0) fallas.push(`${String(confirmados)} archivos confirmados`)
  if ((await trabajosDeEntregaDeTarea(tareaId)).length > 0) fallas.push("un ENTREGA_REALIZADA")
  return fallas
}

const PREFIJO = "https://ejemplo.mx/"
// 338 «ñ» (6 caracteres cada una al normalizar) + relleno ASCII: el href mide exactamente `largo`.
const conEnes = (largo: number): string =>
  `${PREFIJO}${"ñ".repeat(338)}${"a".repeat(largo - PREFIJO.length - 338 * 6)}`
const codificado = (largo: number, hex = "%C3%B1"): string =>
  `${PREFIJO}${hex.repeat(338)}${"a".repeat(largo - PREFIJO.length - 338 * 6)}`

describe("ataque ENTREGAS-01b r2: la frontera del enlace normalizado por HTTP (T-r2-1)", () => {
  it("un enlace que normalizado mide 2048 se acepta y se guarda igual; uno que mide 2049, en cualquier posición de la lista, responde 400 VALIDACION con «enlaces.<i>: …» y no deja fila, archivo confirmado ni ENTREGA_REALIZADA", async () => {
    const e = await escenario()
    expect([new URL(conEnes(2048)).href.length, new URL(conEnes(2049)).href.length]).toEqual([
      2048, 2049,
    ])
    const corto = "https://ejemplo.mx/c"
    const fallas: string[] = []
    for (let i = 0; i < 5; i += 1) {
      const t = await tarea(e)
      const enlaces = Array.from({ length: 5 }, (_, k) => (k === i ? conEnes(2049) : corto))
      const r = await entregar(e, t, enlaces)
      if (resultado(r) !== "400 VALIDACION") fallas.push(`posición ${String(i)}: ${resultado(r)}`)
      else if (!mensajeDe(r).startsWith(`enlaces.${String(i)}: `))
        fallas.push(`posición ${String(i)}: ${mensajeDe(r)}`)
      fallas.push(...(await nadaEscrito(t, e.ana.id)).map((f) => `posición ${String(i)}: ${f}`))
    }
    expect(fallas).toEqual([])

    const t = await tarea(e)
    const r = await entregar(e, t, [conEnes(2048), corto])
    expect(resultado(r)).toBe("200")
    const esperado = [new URL(conEnes(2048)).href, corto]
    expect(miEntregaRespuestaSchema.parse(r.json()).entrega.enlaces).toEqual(esperado)
    expect((await leerEntregaDb(t, e.ana.id))?.enlaces).toEqual(esperado)
  })

  it("enlaces con valores que no son texto, null dentro de la lista, seis enlaces (cinco válidos más uno inválido) o una lista que no es lista: 400 VALIDACION sin escribir nada", async () => {
    const e = await escenario()
    const valido = "https://ejemplo.mx/v"
    const casos: [string, unknown][] = [
      ["número", [valido, 7]],
      ["objeto", [{ href: valido }]],
      ["lista anidada", [[valido]]],
      ["null dentro", [valido, null]],
      ["booleano", [true]],
      ["5 válidos y 1 inválido al final", [valido, valido, valido, valido, valido, "javascript:x"]],
      [
        "5 válidos y 1 inválido al principio",
        ["javascript:x", valido, valido, valido, valido, valido],
      ],
      ["6 válidos", Array.from({ length: 6 }, () => valido)],
      ["texto en lugar de lista", valido],
      ["null en lugar de lista", null],
    ]
    const fallas: string[] = []
    for (const [etiqueta, enlaces] of casos) {
      const t = await tarea(e)
      const r = await entregar(e, t, enlaces)
      if (resultado(r) !== "400 VALIDACION") fallas.push(`${etiqueta}: ${resultado(r)}`)
      fallas.push(...(await nadaEscrito(t, e.ana.id)).map((f) => `${etiqueta}: ${f}`))
    }
    expect(fallas).toEqual([])
  })
})

describe("ataque ENTREGAS-01b r2: enlaces ya codificados y otras formas válidas (T-r2-2)", () => {
  it("«%C3%B1» y «ñ» se guardan igual, sin doble codificación, y el tope se aplica al resultado: 2048 pasa y 2049 no, en las dos formas; «%c3%b1» se conserva tal cual (sin %25)", async () => {
    const e = await escenario()
    const t1 = await tarea(e)
    const t2 = await tarea(e)
    const t3 = await tarea(e)
    expect(resultado(await entregar(e, t1, [conEnes(2048)]))).toBe("200")
    expect(resultado(await entregar(e, t2, [codificado(2048)]))).toBe("200")
    const g1 = (await leerEntregaDb(t1, e.ana.id))?.enlaces
    const g2 = (await leerEntregaDb(t2, e.ana.id))?.enlaces
    expect(g1).toEqual(g2)
    expect(JSON.stringify(g2)).not.toContain("%25")
    for (const enlace of [conEnes(2049), codificado(2049)]) {
      const t = await tarea(e)
      expect(resultado(await entregar(e, t, [enlace]))).toBe("400 VALIDACION")
      expect(await nadaEscrito(t, e.ana.id)).toEqual([])
    }
    expect(resultado(await entregar(e, t3, [codificado(2048, "%c3%b1")]))).toBe("200")
    const g3 = (await leerEntregaDb(t3, e.ana.id))?.enlaces
    expect(g3).toEqual([codificado(2048, "%c3%b1")])
  })

  it("fragmento, consulta con &, puerto, IDN, «+» y espacios ya codificados se aceptan y se guardan como su href", async () => {
    const e = await escenario()
    const t = await tarea(e)
    const enlaces = [
      "https://ejemplo.mx/a#seccion-2",
      "https://ejemplo.mx/b?a=1&b=2",
      "https://ejemplo.mx:8443/c",
      "https://ñandú.mx/",
      "https://ejemplo.mx/d?q=uno+dos%20tres",
    ]
    const r = await entregar(e, t, enlaces)
    expect(resultado(r)).toBe("200")
    const esperados = enlaces.map((enlace) => new URL(enlace).href)
    expect(esperados[3]).toMatch(/^https:\/\/xn--/)
    expect(miEntregaRespuestaSchema.parse(r.json()).entrega.enlaces).toEqual(esperados)
    expect((await leerEntregaDb(t, e.ana.id))?.enlaces).toEqual(esperados)
  })
})

describe("ataque ENTREGAS-01b r2: las lecturas no se volvieron más estrictas (T-r2-3)", () => {
  it("con enlaces guardados de 2048 normalizados, uno corto y uno de antes del remedio (más de 2048), la alumna, el maestro, el admin, la lista y «Trabajo de clase» responden 200 y devuelven los enlaces intactos", async () => {
    const e = await escenario()
    const exacto = new URL(conEnes(2048)).href
    const largoDeAntes = new URL(`${PREFIJO}${"ñ".repeat(2000)}`).href
    expect([exacto.length, largoDeAntes.length > 2048]).toEqual([2048, true])
    const casos: [string, string[]][] = [
      ["exacto y corto", [exacto, "https://ejemplo.mx/c"]],
      ["de antes del remedio", [largoDeAntes]],
    ]
    for (const [etiqueta, enlaces] of casos) {
      const t = await tarea(e)
      await crearEntregaDePrueba({ tareaId: t, alumnoId: e.ana.id, estado: "entregado", enlaces })
      const suya = await pedir("GET", `${base(e.claseId, t)}/entrega`, e.t.ana)
      expect([etiqueta, resultado(suya)]).toEqual([etiqueta, "200"])
      expect(miEntregaRespuestaSchema.parse(suya.json()).entrega.enlaces).toEqual(enlaces)
      for (const token of [e.t.maestro, e.t.admin]) {
        const del = await pedir("GET", `${base(e.claseId, t)}/entregas/${e.ana.id}`, token)
        expect([etiqueta, resultado(del)]).toEqual([etiqueta, "200"])
        expect(entregaDeAlumnoRespuestaSchema.parse(del.json()).entrega.enlaces).toEqual(enlaces)
        const lista = await pedir("GET", `${base(e.claseId, t)}/entregas`, token)
        expect([etiqueta, resultado(lista)]).toEqual([etiqueta, "200"])
        expect(listaEntregasRespuestaSchema.parse(lista.json()).entregadas).toBe(1)
      }
      const trabajo = await pedir(
        "GET",
        `/api/clases/${e.claseId}/trabajo?tema=sin-tema&limite=50`,
        e.t.ana,
      )
      expect([etiqueta, resultado(trabajo)]).toEqual([etiqueta, "200"])
      expect(
        listaTrabajoRespuestaSchema.parse(trabajo.json()).elementos.find(({ id }) => id === t)
          ?.entrega,
      ).toEqual({ estado: "entregado", conRetraso: false })
    }
  })
})
