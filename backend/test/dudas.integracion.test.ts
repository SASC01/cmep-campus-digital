import { randomUUID } from "node:crypto"

import {
  dudaRespuestaSchema,
  errorApiSchema,
  listaComentariosRespuestaSchema,
  listaDudasRespuestaSchema,
  listaPublicacionesRespuestaSchema,
  comentarioRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearClaseDePrueba,
  crearComentarioDePrueba,
  crearPublicacionDePrueba,
  idDelAdminDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { formadasDetrasDe } from "./ayudas-concurrencia.js"
import {
  contarRespuestas,
  crearDudaDePrueba,
  crearRespuestaDePrueba,
  leerDudaDb,
  trabajosQueMencionan,
} from "./ayudas-dudas.js"
import { crearEntregaDePrueba } from "./ayudas-entregas.js"
import { crearTareaDePrueba } from "./ayudas-tareas.js"

// CLASES-03b (CL3-B03 a CL3-B10, contenido): la lista de dudas, publicar, marcar "Resuelta", borrar,
// las respuestas, el aislamiento de los contextos de `comentarios` y que nada se encola (S-04). Las
// fechas de creación son instantes fijos; donde se compara una fecha que pone el servidor, el reloj
// (solo Date) se fija.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
let adminId = ""
let tokenAdmin = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
  adminId = await idDelAdminDePrueba()
  tokenAdmin = await tokenDelAdminDePrueba()
})

afterEach(() => {
  vi.useRealTimers()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

const pedir = (opciones: {
  method: "GET" | "POST" | "PUT" | "DELETE"
  url: string
  token: string
  payload?: InjectOptions["payload"]
}): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method: opciones.method,
    url: opciones.url,
    ...(opciones.payload === undefined ? {} : { payload: opciones.payload }),
    headers: { authorization: `Bearer ${opciones.token}` },
  })

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

const mensajeDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.mensaje

const resultado = (respuesta: LightMyRequestResponse): string =>
  respuesta.statusCode < 400
    ? String(respuesta.statusCode)
    : `${String(respuesta.statusCode)} ${codigoDe(respuesta)}`

const instante = (minuto: number): Date => new Date(Date.UTC(2026, 9, 1, 12, minuto))

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

interface Escenario {
  claseId: string
  maestro: UsuarioDePrueba
  otroMaestro: UsuarioDePrueba
  autora: UsuarioDePrueba
  otraAlumna: UsuarioDePrueba
  tokenMaestro: string
  tokenOtroMaestro: string
  tokenAutora: string
  tokenOtraAlumna: string
}

// Una clase con dos maestros y dos alumnas inscritas.
const escenario = async (): Promise<Escenario> => {
  const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Maestra D" })
  const otroMaestro = await crearUsuarioDePrueba(idsUsuarios, {
    rol: "maestro",
    nombre: "Maestro E",
  })
  const autora = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumna D" })
  const otraAlumna = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumna E" })
  const clase = await crearClaseDePrueba(idsClases, {
    maestroId: maestro.id,
    maestroIds: [maestro.id, otroMaestro.id],
  })
  await inscribirDePrueba(clase.id, autora.id, "codigo")
  await inscribirDePrueba(clase.id, otraAlumna.id, "codigo")
  return {
    claseId: clase.id,
    maestro,
    otroMaestro,
    autora,
    otraAlumna,
    tokenMaestro: await tokenDe(maestro),
    tokenOtroMaestro: await tokenDe(otroMaestro),
    tokenAutora: await tokenDe(autora),
    tokenOtraAlumna: await tokenDe(otraAlumna),
  }
}

const urlDudas = (claseId: string): string => `/api/clases/${claseId}/dudas`
const urlDuda = (claseId: string, dudaId: string): string => `${urlDudas(claseId)}/${dudaId}`
const urlRespuestas = (claseId: string, dudaId: string): string =>
  `${urlDuda(claseId, dudaId)}/respuestas`

const listarDudasApi = async (e: Escenario, token: string, consulta = "") => {
  const respuesta = await pedir({ method: "GET", url: `${urlDudas(e.claseId)}${consulta}`, token })
  expect(respuesta.statusCode, respuesta.body).toBe(200)
  return listaDudasRespuestaSchema.parse(respuesta.json())
}

const listarRespuestasApi = async (e: Escenario, dudaId: string, token: string, consulta = "") => {
  const respuesta = await pedir({
    method: "GET",
    url: `${urlRespuestas(e.claseId, dudaId)}${consulta}`,
    token,
  })
  expect(respuesta.statusCode, respuesta.body).toBe(200)
  return listaComentariosRespuestaSchema.parse(respuesta.json())
}

const marcar = (e: Escenario, dudaId: string, cuerpo: unknown, token: string) =>
  pedir({
    method: "PUT",
    url: `${urlDuda(e.claseId, dudaId)}/resuelta`,
    token,
    payload: cuerpo as InjectOptions["payload"],
  })

const responder = (e: Escenario, dudaId: string, texto: string, token: string) =>
  pedir({ method: "POST", url: urlRespuestas(e.claseId, dudaId), token, payload: { texto } })

describe("lista de dudas (CL3-B03)", () => {
  it("CL3-B03: de la más reciente a la más antigua, con el conteo de respuestas, resuelta y resueltaEn", async () => {
    const e = await escenario()
    const vieja = await crearDudaDePrueba({
      claseId: e.claseId,
      autorId: e.autora.id,
      creadoEn: instante(1),
      resueltaPor: e.maestro.id,
      resueltaEn: instante(30),
    })
    const nueva = await crearDudaDePrueba({
      claseId: e.claseId,
      autorId: e.otraAlumna.id,
      creadoEn: instante(2),
    })
    await crearRespuestaDePrueba({ dudaId: vieja, autorId: e.maestro.id })
    await crearRespuestaDePrueba({ dudaId: vieja, autorId: e.autora.id })

    const { dudas, siguienteCursor } = await listarDudasApi(e, e.tokenAutora)

    expect(dudas.map((d) => [d.id, d.resuelta, d.resueltaEn, d.respuestas])).toEqual([
      [nueva, false, null, 0],
      [vieja, true, instante(30).toISOString(), 2],
    ])
    expect(siguienteCursor).toBeNull()
  })

  it("CL3-B03: pagina con el cursor de una duda de la clase", async () => {
    const e = await escenario()
    const d1 = await crearDudaDePrueba({
      claseId: e.claseId,
      autorId: e.autora.id,
      creadoEn: instante(3),
    })
    const d2 = await crearDudaDePrueba({
      claseId: e.claseId,
      autorId: e.autora.id,
      creadoEn: instante(2),
    })
    const d3 = await crearDudaDePrueba({
      claseId: e.claseId,
      autorId: e.autora.id,
      creadoEn: instante(1),
    })
    const primera = await listarDudasApi(e, e.tokenMaestro, "?limite=2")
    expect(primera.dudas.map((d) => d.id)).toEqual([d1, d2])
    expect(primera.siguienteCursor).toBe(d2)
    const segunda = await listarDudasApi(e, e.tokenMaestro, `?limite=2&cursor=${d2}`)
    expect(segunda.dudas.map((d) => d.id)).toEqual([d3])
  })

  it("CL3-B03: propia, puedeBorrar y puedeMarcar para la alumna autora, otra alumna, un maestro, otro maestro y el admin", async () => {
    const e = await escenario()
    await crearDudaDePrueba({ claseId: e.claseId, autorId: e.autora.id, creadoEn: instante(2) })
    await crearDudaDePrueba({ claseId: e.claseId, autorId: e.maestro.id, creadoEn: instante(1) })
    const banderas = async (token: string) =>
      (await listarDudasApi(e, token)).dudas.map((d) => [d.propia, d.puedeBorrar, d.puedeMarcar])
    // [duda de la alumna autora, duda del maestro]
    expect(await banderas(e.tokenAutora)).toEqual([
      [true, true, false],
      [false, false, false],
    ])
    expect(await banderas(e.tokenOtraAlumna)).toEqual([
      [false, false, false],
      [false, false, false],
    ])
    expect(await banderas(e.tokenMaestro)).toEqual([
      [false, true, true],
      [true, true, true],
    ])
    expect(await banderas(e.tokenOtroMaestro)).toEqual([
      [false, true, true],
      [false, false, true],
    ])
    expect(await banderas(tokenAdmin)).toEqual([
      [false, true, true],
      [false, true, true],
    ])
  })

  it("CL3-B03: un cursor de otra clase, borrado o inexistente responde 400 «cursor: no es válido», igual", async () => {
    const e = await escenario()
    await crearDudaDePrueba({ claseId: e.claseId, autorId: e.autora.id })
    const otra = await crearClaseDePrueba(idsClases, { maestroId: e.maestro.id })
    const ajena = await crearDudaDePrueba({ claseId: otra.id, autorId: e.maestro.id })
    const borrada = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.autora.id })
    await obtenerDb().duda.delete({ where: { id: borrada } })
    const cuerpos: string[] = []
    for (const cursor of [ajena, borrada, randomUUID()]) {
      const respuesta = await pedir({
        method: "GET",
        url: `${urlDudas(e.claseId)}?cursor=${cursor}`,
        token: e.tokenMaestro,
      })
      expect(respuesta.statusCode, cursor).toBe(400)
      expect(mensajeDe(respuesta), cursor).toBe("cursor: no es válido")
      cuerpos.push(respuesta.body)
    }
    expect(new Set(cuerpos).size).toBe(1)
  })
})

describe("publicar una duda (CL3-B04)", () => {
  it("CL3-B04: la alumna inscrita y el maestro publican (201) con el texto normalizado; la duda queda sin resolver", async () => {
    const e = await escenario()
    for (const [token, autorId] of [
      [e.tokenAutora, e.autora.id],
      [e.tokenMaestro, e.maestro.id],
    ] as const) {
      const respuesta = await pedir({
        method: "POST",
        url: urlDudas(e.claseId),
        token,
        payload: { texto: "  Línea 1\r\nLínea 2\rLínea 3  " },
      })
      expect(respuesta.statusCode, respuesta.body).toBe(201)
      const { duda } = dudaRespuestaSchema.parse(respuesta.json())
      expect(duda).toMatchObject({
        texto: "Línea 1\nLínea 2\nLínea 3",
        resuelta: false,
        resueltaEn: null,
        respuestas: 0,
        propia: true,
        puedeBorrar: true,
      })
      const fila = await leerDudaDb(duda.id)
      expect(fila).toMatchObject({
        autorId,
        claseId: e.claseId,
        texto: "Línea 1\nLínea 2\nLínea 3",
        resueltaEn: null,
        resueltaPor: null,
      })
    }
  })

  it("CL3-B04: texto vacío, de invisibles, de 2001, con controles o con inversores responde 400 VALIDACION sin escribir", async () => {
    const e = await escenario()
    const textos = ["", "   ", "​⠀ ‍", "a".repeat(2001), "Hola\u0007", "Hola‮"]
    for (const texto of textos) {
      const respuesta = await pedir({
        method: "POST",
        url: urlDudas(e.claseId),
        token: e.tokenAutora,
        payload: { texto },
      })
      expect(respuesta.statusCode, JSON.stringify(texto)).toBe(400)
      expect(codigoDe(respuesta), JSON.stringify(texto)).toBe("VALIDACION")
    }
    expect(await obtenerDb().duda.count({ where: { claseId: e.claseId } })).toBe(0)
    const conDosMil = await pedir({
      method: "POST",
      url: urlDudas(e.claseId),
      token: e.tokenAutora,
      payload: { texto: "a".repeat(2000) },
    })
    expect(conDosMil.statusCode, conDosMil.body).toBe(201)
  })
})

describe("marcar una duda como resuelta (CL3-B05)", () => {
  it("CL3-B05: el maestro y el admin marcan y quitan «Resuelta»; quién la marcó queda en la base y nunca en la respuesta", async () => {
    const e = await escenario()
    for (const [token, quien] of [
      [e.tokenMaestro, e.maestro.id],
      [tokenAdmin, adminId],
    ] as const) {
      const dudaId = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.autora.id })
      const marcada = await marcar(e, dudaId, { resuelta: true }, token)
      expect(marcada.statusCode, marcada.body).toBe(200)
      expect(dudaRespuestaSchema.parse(marcada.json()).duda.resuelta).toBe(true)
      expect(marcada.body).not.toContain(quien)
      expect((await leerDudaDb(dudaId))?.resueltaPor).toBe(quien)
      const quitada = await marcar(e, dudaId, { resuelta: false }, token)
      expect(quitada.statusCode, quitada.body).toBe(200)
      expect(dudaRespuestaSchema.parse(quitada.json()).duda).toMatchObject({
        resuelta: false,
        resueltaEn: null,
      })
      expect(await leerDudaDb(dudaId)).toMatchObject({ resueltaEn: null, resueltaPor: null })
    }
  })

  it("CL3-B05: con el reloj fijo, marcar dos veces no cambia resueltaEn", async () => {
    const e = await escenario()
    const dudaId = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.autora.id })
    const t0 = new Date(Math.floor(Date.now() / 1000) * 1000)
    vi.useFakeTimers({ toFake: ["Date"], now: t0 })
    const primera = await marcar(e, dudaId, { resuelta: true }, e.tokenMaestro)
    expect(primera.statusCode, primera.body).toBe(200)
    vi.setSystemTime(new Date(t0.getTime() + 5 * 60_000))
    const segunda = await marcar(e, dudaId, { resuelta: true }, e.tokenOtroMaestro)
    vi.useRealTimers()
    expect(segunda.statusCode, segunda.body).toBe(200)
    expect(dudaRespuestaSchema.parse(primera.json()).duda.resueltaEn).toBe(t0.toISOString())
    expect(dudaRespuestaSchema.parse(segunda.json()).duda.resueltaEn).toBe(t0.toISOString())
    expect(await leerDudaDb(dudaId)).toMatchObject({ resueltaEn: t0, resueltaPor: e.maestro.id })
  })

  it("CL3-B05: una duda de otra clase o inexistente responde 404 DUDA_NO_ENCONTRADA sin escribir", async () => {
    const e = await escenario()
    const otra = await crearClaseDePrueba(idsClases, { maestroId: e.maestro.id })
    const ajena = await crearDudaDePrueba({ claseId: otra.id, autorId: e.maestro.id })
    for (const dudaId of [ajena, randomUUID()]) {
      const respuesta = await marcar(e, dudaId, { resuelta: true }, e.tokenMaestro)
      expect(respuesta.statusCode, dudaId).toBe(404)
      expect(codigoDe(respuesta), dudaId).toBe("DUDA_NO_ENCONTRADA")
      expect(mensajeDe(respuesta), dudaId).toBe("Esa duda ya no existe.")
    }
    expect(await leerDudaDb(ajena)).toMatchObject({ resueltaEn: null, resueltaPor: null })
  })

  it("CL3-B05: un cuerpo sin resuelta, con otro tipo o con una llave de más responde 400 VALIDACION", async () => {
    const e = await escenario()
    const dudaId = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.autora.id })
    for (const cuerpo of [{}, { resuelta: "true" }, { resuelta: 1 }, { resuelta: true, x: 1 }]) {
      const respuesta = await marcar(e, dudaId, cuerpo, e.tokenMaestro)
      expect(respuesta.statusCode, JSON.stringify(cuerpo)).toBe(400)
      expect(codigoDe(respuesta), JSON.stringify(cuerpo)).toBe("VALIDACION")
    }
    expect(await leerDudaDb(dudaId)).toMatchObject({ resueltaEn: null })
  })
})

describe("borrar una duda (CL3-B06)", () => {
  const borrar = (e: Escenario, dudaId: string, token: string) =>
    pedir({ method: "DELETE", url: urlDuda(e.claseId, dudaId), token })

  it("CL3-B06: la alumna autora borra la suya con sus respuestas (cascada); otra vez responde 404 DUDA_NO_ENCONTRADA", async () => {
    const e = await escenario()
    const dudaId = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.autora.id })
    await crearRespuestaDePrueba({ dudaId, autorId: e.maestro.id })
    await crearRespuestaDePrueba({ dudaId, autorId: e.otraAlumna.id })
    const respuesta = await borrar(e, dudaId, e.tokenAutora)
    expect(respuesta.statusCode, respuesta.body).toBe(204)
    expect(await leerDudaDb(dudaId)).toBeNull()
    expect(await contarRespuestas(dudaId)).toBe(0)
    const otraVez = await borrar(e, dudaId, e.tokenAutora)
    expect(resultado(otraVez)).toBe("404 DUDA_NO_ENCONTRADA")
  })

  it("CL3-B06: otra alumna y un maestro sobre la de otro maestro reciben 403 BORRADO_NO_PERMITIDO sin borrar; un maestro borra la de una alumna y el admin cualquiera", async () => {
    const e = await escenario()
    const deAlumna = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.autora.id })
    const deMaestro = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const otraDeMaestro = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    await crearRespuestaDePrueba({ dudaId: deAlumna, autorId: e.autora.id })
    for (const [dudaId, token] of [
      [deAlumna, e.tokenOtraAlumna],
      [deMaestro, e.tokenOtroMaestro],
      [deMaestro, e.tokenAutora],
    ] as const) {
      expect(resultado(await borrar(e, dudaId, token))).toBe("403 BORRADO_NO_PERMITIDO")
      expect(await leerDudaDb(dudaId)).not.toBeNull()
    }
    expect(await contarRespuestas(deAlumna)).toBe(1)
    expect(resultado(await borrar(e, deAlumna, e.tokenOtroMaestro))).toBe("204")
    expect(resultado(await borrar(e, deMaestro, tokenAdmin))).toBe("204")
    expect(resultado(await borrar(e, otraDeMaestro, e.tokenMaestro))).toBe("204")
    expect(await obtenerDb().duda.count({ where: { claseId: e.claseId } })).toBe(0)
  })
})

describe("respuestas de una duda (CL3-B07)", () => {
  // Retiene la fila de `dudas` con FOR UPDATE (choca con el FOR SHARE de responder y con el
  // FOR UPDATE del borrado) y lanza las operaciones en orden fijo: cada una se da por formada solo
  // cuando espera esa fila (formadasDetrasDe, CHORE-02). La ayuda compartida conFilaRetenida no admite
  // la tabla `dudas`, así que el mismo método vive aquí. El timeout de la transacción (30 s) es mayor
  // que la espera más larga (10 s por operación).
  const conDudaRetenida = async (
    dudaId: string,
    operaciones: readonly (() => Promise<LightMyRequestResponse>)[],
  ): Promise<LightMyRequestResponse[]> => {
    const lanzadas: Promise<LightMyRequestResponse>[] = []
    await obtenerDb().$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM dudas WHERE id = ${dudaId}::uuid FOR UPDATE`
        const [propio] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
        if (!propio)
          throw new Error("Precondición: no se obtuvo el pid de la transacción retenedora")
        for (const [indice, operacion] of operaciones.entries()) {
          let terminada = false
          const lanzada = operacion()
          lanzada.then(
            () => (terminada = true),
            () => (terminada = true),
          )
          lanzadas.push(lanzada)
          const limite = Date.now() + 10_000
          let formada = false
          while (!formada && !terminada && Date.now() < limite) {
            formada = (await formadasDetrasDe(propio.pid)) >= indice + 1
            if (!formada) await esperar(25)
          }
          expect(
            formada,
            `Precondición: la operación ${String(indice + 1)} no se formó detrás de la duda retenida en 10 s`,
          ).toBe(true)
        }
        await esperar(100)
      },
      { timeout: 30_000, maxWait: 5_000 },
    )
    return Promise.all(lanzadas)
  }

  it("CL3-B07: se listan de la más antigua a la más reciente, con cursor", async () => {
    const e = await escenario()
    const dudaId = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.autora.id })
    const r1 = await crearRespuestaDePrueba({
      dudaId,
      autorId: e.maestro.id,
      creadoEn: instante(1),
    })
    const r2 = await crearRespuestaDePrueba({ dudaId, autorId: e.autora.id, creadoEn: instante(2) })
    const r3 = await crearRespuestaDePrueba({
      dudaId,
      autorId: e.otraAlumna.id,
      creadoEn: instante(3),
    })
    const primera = await listarRespuestasApi(e, dudaId, e.tokenAutora, "?limite=2")
    expect(primera.comentarios.map((c) => [c.id, c.propio])).toEqual([
      [r1, false],
      [r2, true],
    ])
    expect(primera.siguienteCursor).toBe(r2)
    const segunda = await listarRespuestasApi(e, dudaId, e.tokenAutora, `?limite=2&cursor=${r2}`)
    expect(segunda.comentarios.map((c) => c.id)).toEqual([r3])
    const otraDuda = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.autora.id })
    const deOtra = await crearRespuestaDePrueba({ dudaId: otraDuda, autorId: e.autora.id })
    const conAjeno = await pedir({
      method: "GET",
      url: `${urlRespuestas(e.claseId, dudaId)}?cursor=${deOtra}`,
      token: e.tokenAutora,
    })
    expect(conAjeno.statusCode).toBe(400)
    expect(mensajeDe(conAjeno)).toBe("cursor: no es válido")
  })

  it("CL3-B07: la alumna y el maestro responden (201), también a una duda resuelta (S-06); el texto de 1001 responde 400", async () => {
    const e = await escenario()
    const dudaId = await crearDudaDePrueba({
      claseId: e.claseId,
      autorId: e.autora.id,
      resueltaPor: e.maestro.id,
    })
    for (const token of [e.tokenAutora, e.tokenMaestro]) {
      const respuesta = await responder(e, dudaId, "  Gracias\r\n  ", token)
      expect(respuesta.statusCode, respuesta.body).toBe(201)
      expect(comentarioRespuestaSchema.parse(respuesta.json()).comentario).toMatchObject({
        texto: "Gracias",
        propio: true,
        puedeBorrar: true,
      })
    }
    expect(resultado(await responder(e, dudaId, "a".repeat(1001), e.tokenAutora))).toBe(
      "400 VALIDACION",
    )
    expect(await contarRespuestas(dudaId)).toBe(2)
  })

  it("CL3-B07: responder a una duda borrada, de otra clase o inexistente responde 404 DUDA_NO_ENCONTRADA sin insertar", async () => {
    const e = await escenario()
    const borrada = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.autora.id })
    await obtenerDb().duda.delete({ where: { id: borrada } })
    const otra = await crearClaseDePrueba(idsClases, { maestroId: e.maestro.id })
    const ajena = await crearDudaDePrueba({ claseId: otra.id, autorId: e.maestro.id })
    for (const dudaId of [borrada, ajena, randomUUID()]) {
      expect(resultado(await responder(e, dudaId, "¿Sigue?", e.tokenAutora)), dudaId).toBe(
        "404 DUDA_NO_ENCONTRADA",
      )
      const lista = await pedir({
        method: "GET",
        url: urlRespuestas(e.claseId, dudaId),
        token: e.tokenAutora,
      })
      expect(resultado(lista), dudaId).toBe("404 DUDA_NO_ENCONTRADA")
    }
    expect(await contarRespuestas(ajena)).toBe(0)
    expect(await obtenerDb().comentario.count({ where: { autorId: e.autora.id } })).toBe(0)
  })

  it(
    "CL3-B07: responder y borrar la duda a la vez, con la respuesta formada primero: 201 y 204, y la respuesta cae con la duda",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const dudaId = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.autora.id })
      const [respondida, borrada] = await conDudaRetenida(dudaId, [
        () => responder(e, dudaId, "Llego primero", e.tokenOtraAlumna),
        () => pedir({ method: "DELETE", url: urlDuda(e.claseId, dudaId), token: e.tokenAutora }),
      ])
      expect([respondida, borrada].map((r) => (r === undefined ? "?" : resultado(r)))).toEqual([
        "201",
        "204",
      ])
      expect(await leerDudaDb(dudaId)).toBeNull()
      expect(await contarRespuestas(dudaId)).toBe(0)
      expect(await obtenerDb().comentario.count({ where: { autorId: e.otraAlumna.id } })).toBe(0)
    },
  )

  it(
    "CL3-B07: responder y borrar la duda a la vez, con el borrado formado primero: 204 y 404 DUDA_NO_ENCONTRADA sin insertar",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const dudaId = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.autora.id })
      const [borrada, respondida] = await conDudaRetenida(dudaId, [
        () => pedir({ method: "DELETE", url: urlDuda(e.claseId, dudaId), token: e.tokenAutora }),
        () => responder(e, dudaId, "Llego tarde", e.tokenOtraAlumna),
      ])
      expect([borrada, respondida].map((r) => (r === undefined ? "?" : resultado(r)))).toEqual([
        "204",
        "404 DUDA_NO_ENCONTRADA",
      ])
      expect(await obtenerDb().comentario.count({ where: { autorId: e.otraAlumna.id } })).toBe(0)
    },
  )
})

describe("borrar una respuesta (CL3-B08)", () => {
  const borrar = (e: Escenario, dudaId: string, respuestaId: string, token: string) =>
    pedir({ method: "DELETE", url: `${urlRespuestas(e.claseId, dudaId)}/${respuestaId}`, token })

  it("CL3-B08: las reglas de autoría de CL3-B06", async () => {
    const e = await escenario()
    const dudaId = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.autora.id })
    const deAlumna = await crearRespuestaDePrueba({ dudaId, autorId: e.autora.id })
    const deMaestro = await crearRespuestaDePrueba({ dudaId, autorId: e.maestro.id })
    const propia = await crearRespuestaDePrueba({ dudaId, autorId: e.otraAlumna.id })
    const otraDeMaestro = await crearRespuestaDePrueba({ dudaId, autorId: e.maestro.id })
    for (const [respuestaId, token] of [
      [deAlumna, e.tokenOtraAlumna],
      [deMaestro, e.tokenOtroMaestro],
      [deMaestro, e.tokenAutora],
    ] as const) {
      expect(resultado(await borrar(e, dudaId, respuestaId, token))).toBe(
        "403 BORRADO_NO_PERMITIDO",
      )
    }
    expect(await contarRespuestas(dudaId)).toBe(4)
    expect(resultado(await borrar(e, dudaId, propia, e.tokenOtraAlumna))).toBe("204")
    expect(resultado(await borrar(e, dudaId, deAlumna, e.tokenOtroMaestro))).toBe("204")
    expect(resultado(await borrar(e, dudaId, deMaestro, tokenAdmin))).toBe("204")
    expect(resultado(await borrar(e, dudaId, otraDeMaestro, e.tokenMaestro))).toBe("204")
    expect(await contarRespuestas(dudaId)).toBe(0)
  })

  it("CL3-B08: una respuesta de otra duda o de otra clase responde 404 RESPUESTA_NO_ENCONTRADA sin borrar", async () => {
    const e = await escenario()
    const dudaId = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.autora.id })
    const otraDuda = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.autora.id })
    const deOtraDuda = await crearRespuestaDePrueba({ dudaId: otraDuda, autorId: e.autora.id })
    const otra = await crearClaseDePrueba(idsClases, { maestroId: e.maestro.id })
    const dudaAjena = await crearDudaDePrueba({ claseId: otra.id, autorId: e.maestro.id })
    const deOtraClase = await crearRespuestaDePrueba({ dudaId: dudaAjena, autorId: e.maestro.id })
    for (const [duda, respuestaId] of [
      [dudaId, deOtraDuda],
      [dudaId, deOtraClase],
      [dudaAjena, deOtraClase],
      [dudaId, randomUUID()],
    ] as const) {
      const respuesta = await borrar(e, duda, respuestaId, tokenAdmin)
      expect(resultado(respuesta), respuestaId).toBe("404 RESPUESTA_NO_ENCONTRADA")
      expect(mensajeDe(respuesta)).toBe("Esa respuesta ya no existe.")
    }
    expect(await contarRespuestas(otraDuda)).toBe(1)
    expect(await contarRespuestas(dudaAjena)).toBe(1)
  })
})

describe("aislamiento de los contextos de comentarios (CL3-B09)", () => {
  it("CL3-B09: una respuesta no se lista ni se borra por las rutas del muro ni por «mis comentarios»", async () => {
    const e = await escenario()
    const anuncio = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const dudaId = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.autora.id })
    const respuestaId = await crearRespuestaDePrueba({ dudaId, autorId: e.autora.id })
    const base = `/api/clases/${e.claseId}`
    const intentos = [
      { method: "GET" as const, url: `${base}/publicaciones/${dudaId}/comentarios` },
      {
        method: "DELETE" as const,
        url: `${base}/publicaciones/${anuncio}/comentarios/${respuestaId}`,
      },
      {
        method: "DELETE" as const,
        url: `${base}/publicaciones/${dudaId}/comentarios/${respuestaId}`,
      },
      { method: "DELETE" as const, url: `${base}/mis-comentarios/${respuestaId}` },
    ]
    for (const intento of intentos) {
      const respuesta = await pedir({ ...intento, token: e.tokenAutora })
      expect(respuesta.statusCode, intento.url).toBe(404)
    }
    const delMuro = await pedir({
      method: "GET",
      url: `${base}/publicaciones/${anuncio}/comentarios`,
      token: e.tokenAutora,
    })
    expect(listaComentariosRespuestaSchema.parse(delMuro.json()).comentarios).toEqual([])
    expect(await contarRespuestas(dudaId)).toBe(1)
  })

  it("CL3-B09: un comentario del muro y uno del hilo privado no se listan ni se borran por las rutas de respuestas", async () => {
    const e = await escenario()
    const anuncio = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const delMuro = await crearComentarioDePrueba({ publicacionId: anuncio, autorId: e.autora.id })
    const tarea = await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const entregaId = await crearEntregaDePrueba({
      tareaId: tarea,
      alumnoId: e.autora.id,
      estado: "asignado",
    })
    const { id: delHilo } = await obtenerDb().comentario.create({
      data: { entregaId, autorId: e.autora.id, texto: "Del hilo" },
      select: { id: true },
    })
    const dudaId = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.autora.id })
    for (const comentarioId of [delMuro, delHilo]) {
      const respuesta = await pedir({
        method: "DELETE",
        url: `${urlRespuestas(e.claseId, dudaId)}/${comentarioId}`,
        token: tokenAdmin,
      })
      expect(resultado(respuesta), comentarioId).toBe("404 RESPUESTA_NO_ENCONTRADA")
    }
    for (const id of [anuncio, entregaId]) {
      const respuesta = await pedir({
        method: "GET",
        url: urlRespuestas(e.claseId, id),
        token: e.tokenAutora,
      })
      expect(resultado(respuesta), id).toBe("404 DUDA_NO_ENCONTRADA")
    }
    expect(await obtenerDb().comentario.count({ where: { id: { in: [delMuro, delHilo] } } })).toBe(
      2,
    )
    expect((await listarRespuestasApi(e, dudaId, e.tokenAutora)).comentarios).toEqual([])
  })

  it("CL3-B09: los conteos de comentarios del muro no cuentan respuestas", async () => {
    const e = await escenario()
    const anuncio = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    await crearComentarioDePrueba({ publicacionId: anuncio, autorId: e.autora.id })
    const dudaId = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.autora.id })
    await crearRespuestaDePrueba({ dudaId, autorId: e.autora.id })
    await crearRespuestaDePrueba({ dudaId, autorId: e.maestro.id })
    const muro = await pedir({
      method: "GET",
      url: `/api/clases/${e.claseId}/publicaciones`,
      token: e.tokenAutora,
    })
    const { publicaciones } = listaPublicacionesRespuestaSchema.parse(muro.json())
    expect(publicaciones.map((p) => [p.id, p.comentarios])).toEqual([[anuncio, 1]])
  })
})

describe("rutas de dudas y avisos (CL3-B10)", () => {
  it("CL3-B10: handlers/clases/dudas.ts no encola nada", () => {
    const texto = readFileSync(
      join(import.meta.dirname, "..", "src", "handlers", "clases", "dudas.ts"),
      "utf8",
    )
    expect(texto).not.toMatch(/encolar\(|adapters\/queue/)
  })

  it("CL3-B10: usar todas las rutas de dudas no deja trabajos en la cola que mencionen la clase, la duda o la respuesta", async () => {
    const e = await escenario()
    const creada = await pedir({
      method: "POST",
      url: urlDudas(e.claseId),
      token: e.tokenAutora,
      payload: { texto: "¿Hay tarea?" },
    })
    const dudaId = dudaRespuestaSchema.parse(creada.json()).duda.id
    const respondida = await responder(e, dudaId, "Sí", e.tokenMaestro)
    const respuestaId = comentarioRespuestaSchema.parse(respondida.json()).comentario.id
    const pasos = [
      await listarDudasApi(e, e.tokenAutora).then(() => "200"),
      await listarRespuestasApi(e, dudaId, e.tokenAutora).then(() => "200"),
      resultado(await marcar(e, dudaId, { resuelta: true }, e.tokenMaestro)),
      resultado(await marcar(e, dudaId, { resuelta: false }, tokenAdmin)),
      resultado(
        await pedir({
          method: "DELETE",
          url: `${urlRespuestas(e.claseId, dudaId)}/${respuestaId}`,
          token: e.tokenMaestro,
        }),
      ),
      resultado(
        await pedir({ method: "DELETE", url: urlDuda(e.claseId, dudaId), token: e.tokenAutora }),
      ),
    ]
    expect([resultado(creada), resultado(respondida), ...pasos]).toEqual([
      "201",
      "201",
      "200",
      "200",
      "200",
      "200",
      "204",
      "204",
    ])
    for (const id of [e.claseId, dudaId, respuestaId]) {
      expect(await trabajosQueMencionan(id), id).toBe(0)
    }
  })
})
