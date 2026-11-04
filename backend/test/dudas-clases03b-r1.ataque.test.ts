import { randomUUID } from "node:crypto"

import {
  errorApiSchema,
  listaComentariosRespuestaSchema,
  listaDudasRespuestaSchema,
  listaPublicacionesRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

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

// Ataque del Tester, CLASES-03b, ronda 1 ("Puntos de ataque para el Tester › 03b" y el encargo del
// orquestador): carreras entre responder, borrar la duda, borrar una respuesta, marcar y quitar
// «Resuelta», en los dos órdenes (retención de la fila con FOR UPDATE, formadasDetrasDe con el pid
// propio y timeout explícito, método de CHORE-02); los CHECK con inserciones raras; fugas entre
// clases, dudas y contextos de comentarios; permisos por rol y autoría; textos límite; datos que no
// deben salir; que nada se encole. Ninguna prueba compara fechas con el reloj real: las de orden son
// instantes fijos y la de «Resuelta» se compara entre respuestas de la misma corrida.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
let tokenAdmin = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
  tokenAdmin = await tokenDelAdminDePrueba()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

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

const resultado = (respuesta: LightMyRequestResponse): string =>
  respuesta.statusCode < 300
    ? String(respuesta.statusCode)
    : `${String(respuesta.statusCode)} ${errorApiSchema.parse(respuesta.json()).error.codigo}`

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))
const instante = (minuto: number): Date => new Date(Date.UTC(2026, 9, 2, 12, minuto))

interface Escenario {
  claseId: string
  maestro: UsuarioDePrueba
  otroMaestro: UsuarioDePrueba
  alumno: UsuarioDePrueba
  otroAlumno: UsuarioDePrueba
  t: { maestro: string; otroMaestro: string; alumno: string; otroAlumno: string }
}

const escenario = async (): Promise<Escenario> => {
  const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Maestra G" })
  const otroMaestro = await crearUsuarioDePrueba(idsUsuarios, {
    rol: "maestro",
    nombre: "Maestro H",
  })
  const alumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumna I" })
  const otroAlumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumno J" })
  const clase = await crearClaseDePrueba(idsClases, {
    maestroId: maestro.id,
    maestroIds: [maestro.id, otroMaestro.id],
  })
  await inscribirDePrueba(clase.id, alumno.id, "codigo")
  await inscribirDePrueba(clase.id, otroAlumno.id, "codigo")
  return {
    claseId: clase.id,
    maestro,
    otroMaestro,
    alumno,
    otroAlumno,
    t: {
      maestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
      otroMaestro: await firmarTokenDePrueba({ usuarioId: otroMaestro.id }),
      alumno: await firmarTokenDePrueba({ usuarioId: alumno.id }),
      otroAlumno: await firmarTokenDePrueba({ usuarioId: otroAlumno.id }),
    },
  }
}

const urlDudas = (claseId: string): string => `/api/clases/${claseId}/dudas`
const urlDuda = (claseId: string, dudaId: string): string => `${urlDudas(claseId)}/${dudaId}`
const urlRespuestas = (claseId: string, dudaId: string): string =>
  `${urlDuda(claseId, dudaId)}/respuestas`

const responder = (e: Escenario, dudaId: string, token: string, texto = "Respuesta en carrera") =>
  pedir({ method: "POST", url: urlRespuestas(e.claseId, dudaId), token, payload: { texto } })
const borrarDuda = (e: Escenario, dudaId: string, token: string) =>
  pedir({ method: "DELETE", url: urlDuda(e.claseId, dudaId), token })
const marcar = (e: Escenario, dudaId: string, resuelta: boolean, token: string) =>
  pedir({
    method: "PUT",
    url: `${urlDuda(e.claseId, dudaId)}/resuelta`,
    token,
    payload: { resuelta },
  })
const borrarRespuesta = (e: Escenario, dudaId: string, respuestaId: string, token: string) =>
  pedir({ method: "DELETE", url: `${urlRespuestas(e.claseId, dudaId)}/${respuestaId}`, token })

// Ninguna respuesta sin su duda y la duda, si existe, coherente con su CHECK.
const huerfanas = async (dudaId: string) => {
  const [fila] = await obtenerDb().$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM comentarios c
    WHERE c.duda_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dudas d WHERE d.id = c.duda_id)`
  return { sinDuda: fila?.n ?? -1, deEsta: (await leerDudaDb(dudaId)) === null ? 0 : 1 }
}

// Retiene una fila de dudas o de comentarios con FOR UPDATE y lanza cada operación cuando la anterior
// ya espera esa fila; la suelta al final.
const conFilaRetenida = async (
  fila: { tabla: "dudas" | "comentarios"; id: string },
  operaciones: readonly (() => Promise<LightMyRequestResponse>)[],
): Promise<LightMyRequestResponse[]> => {
  const lanzadas: Promise<LightMyRequestResponse>[] = []
  await obtenerDb().$transaction(
    async (tx) => {
      if (fila.tabla === "dudas") {
        await tx.$queryRaw`SELECT id FROM dudas WHERE id = ${fila.id}::uuid FOR UPDATE`
      } else {
        await tx.$queryRaw`SELECT id FROM comentarios WHERE id = ${fila.id}::uuid FOR UPDATE`
      }
      const [propio] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
      if (!propio) throw new Error("Precondición: no se obtuvo el pid de la transacción retenedora")
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
          formada || terminada,
          `Precondición: la operación ${String(indice + 1)} no se formó detrás de la fila retenida`,
        ).toBe(true)
      }
      await esperar(100)
    },
    { timeout: 40_000, maxWait: 5_000 },
  )
  return Promise.all(lanzadas)
}

describe("ataque CLASES-03b r1: carreras sobre una duda (dos órdenes, sin 500, deadlock ni huérfanos)", () => {
  it(
    "CL3b-r1-01: responder antes que borrar la duda da 201 y 204 (la respuesta cae con la duda); borrar antes que responder da 204 y 404 DUDA_NO_ENCONTRADA sin insertar",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const primera = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.alumno.id })
      const segunda = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.alumno.id })
      const responderPrimero = await conFilaRetenida({ tabla: "dudas", id: primera }, [
        () => responder(e, primera, e.t.otroAlumno),
        () => borrarDuda(e, primera, e.t.maestro),
      ])
      const borrarPrimero = await conFilaRetenida({ tabla: "dudas", id: segunda }, [
        () => borrarDuda(e, segunda, e.t.alumno),
        () => responder(e, segunda, e.t.maestro),
      ])
      expect(responderPrimero.map(resultado)).toEqual(["201", "204"])
      expect(borrarPrimero.map(resultado)).toEqual(["204", "404 DUDA_NO_ENCONTRADA"])
      expect(await huerfanas(primera)).toEqual({ sinDuda: 0, deEsta: 0 })
      expect(await huerfanas(segunda)).toEqual({ sinDuda: 0, deEsta: 0 })
    },
  )

  it(
    "CL3b-r1-02: marcar antes que borrar da 200 y 204; borrar antes que marcar da 204 y 404 DUDA_NO_ENCONTRADA",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const primera = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.alumno.id })
      const segunda = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.alumno.id })
      const marcarPrimero = await conFilaRetenida({ tabla: "dudas", id: primera }, [
        () => marcar(e, primera, true, e.t.maestro),
        () => borrarDuda(e, primera, tokenAdmin),
      ])
      const borrarPrimero = await conFilaRetenida({ tabla: "dudas", id: segunda }, [
        () => borrarDuda(e, segunda, tokenAdmin),
        () => marcar(e, segunda, true, e.t.maestro),
      ])
      expect(marcarPrimero.map(resultado)).toEqual(["200", "204"])
      expect(borrarPrimero.map(resultado)).toEqual(["204", "404 DUDA_NO_ENCONTRADA"])
    },
  )

  it(
    "CL3b-r1-03: dos marcados a la vez (maestro y admin) dan 200 y 200 con la misma resueltaEn, y la fila conserva al primero que la marcó",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const id = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.alumno.id })
      const respuestas = await conFilaRetenida({ tabla: "dudas", id }, [
        () => marcar(e, id, true, e.t.maestro),
        () => marcar(e, id, true, tokenAdmin),
      ])
      expect(respuestas.map(resultado)).toEqual(["200", "200"])
      const fechas = respuestas.map(
        (r) => r.json<{ duda: { resueltaEn: string | null } }>().duda.resueltaEn,
      )
      expect(fechas[0]).not.toBeNull()
      expect(fechas[1]).toBe(fechas[0])
      expect((await leerDudaDb(id))?.resueltaPor).toBe(e.maestro.id)
    },
  )

  it(
    "CL3b-r1-04: marcar y quitar a la vez dan 200 y 200 y la fila acaba en el estado de un orden en serie (con quien marcó y su fecha, o sin las dos), en los dos órdenes",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const primera = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.alumno.id })
      const segunda = await crearDudaDePrueba({
        claseId: e.claseId,
        autorId: e.alumno.id,
        resueltaPor: e.otroMaestro.id,
        resueltaEn: instante(0),
      })
      const marcarYQuitar = await conFilaRetenida({ tabla: "dudas", id: primera }, [
        () => marcar(e, primera, true, e.t.maestro),
        () => marcar(e, primera, false, tokenAdmin),
      ])
      const quitarYMarcar = await conFilaRetenida({ tabla: "dudas", id: segunda }, [
        () => marcar(e, segunda, false, e.t.maestro),
        () => marcar(e, segunda, true, e.t.otroMaestro),
      ])
      expect([...marcarYQuitar, ...quitarYMarcar].map(resultado)).toEqual([
        "200",
        "200",
        "200",
        "200",
      ])
      expect(await leerDudaDb(primera)).toMatchObject({ resueltaEn: null, resueltaPor: null })
      // Sobre una duda ya resuelta, marcar no espera (su UPDATE filtra resuelta_en IS NULL) y equivale
      // a marcar antes de quitar; cualquiera de los dos órdenes en serie es válido, uno a medias no.
      const final = await leerDudaDb(segunda)
      const estado =
        final?.resueltaEn === null && final.resueltaPor === null
          ? "sin resolver"
          : final?.resueltaPor === e.otroMaestro.id &&
              final.resueltaEn !== null &&
              final.resueltaEn.toISOString() !== instante(0).toISOString()
            ? "marcada de nuevo por quien marcó al final"
            : `a medias: ${JSON.stringify(final)}`
      expect(["sin resolver", "marcada de nuevo por quien marcó al final"]).toContain(estado)
    },
  )

  it(
    "CL3b-r1-05: responder mientras se marca y mientras se borra otra respuesta: 200, 201 y 204, y el conteo de la lista es el de la base",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const id = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.alumno.id })
      const vieja = await crearRespuestaDePrueba({ dudaId: id, autorId: e.otroAlumno.id })
      const respuestas = await conFilaRetenida({ tabla: "dudas", id }, [
        () => marcar(e, id, true, e.t.maestro),
        () => responder(e, id, e.t.alumno),
        () => borrarRespuesta(e, id, vieja, e.t.otroAlumno),
      ])
      expect(respuestas.map(resultado).sort()).toEqual(["200", "201", "204"])
      const lista = listaDudasRespuestaSchema.parse(
        (await pedir({ method: "GET", url: urlDudas(e.claseId), token: e.t.alumno })).json(),
      )
      expect(lista.dudas.find((d) => d.id === id)?.respuestas).toBe(await contarRespuestas(id))
      expect(await contarRespuestas(id)).toBe(1)
    },
  )

  it(
    "CL3b-r1-06: borrar una respuesta y su duda a la vez, en los dos órdenes (con la fila de la respuesta retenida): sin 500; quien llega segundo a la respuesta no la encuentra",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const casos: string[] = []
      for (const orden of ["respuesta primero", "duda primero"] as const) {
        const id = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.alumno.id })
        const respuesta = await crearRespuestaDePrueba({ dudaId: id, autorId: e.otroAlumno.id })
        const deLaRespuesta = () => borrarRespuesta(e, id, respuesta, e.t.otroAlumno)
        const deLaDuda = () => borrarDuda(e, id, e.t.alumno)
        const r = await conFilaRetenida(
          { tabla: "comentarios", id: respuesta },
          orden === "respuesta primero" ? [deLaRespuesta, deLaDuda] : [deLaDuda, deLaRespuesta],
        )
        casos.push(`${orden}: ${r.map(resultado).join(" | ")}`)
        expect(await huerfanas(id)).toEqual({ sinDuda: 0, deEsta: 0 })
      }
      expect(casos).toEqual([
        "respuesta primero: 204 | 204",
        "duda primero: 204 | 404 RESPUESTA_NO_ENCONTRADA",
      ])
    },
  )
})

describe("ataque CLASES-03b r1: los CHECK con inserciones raras (todo se revierte)", () => {
  type Tx = Parameters<Parameters<ReturnType<typeof obtenerDb>["$transaction"]>[0]>[0]
  const intentar = async (sql: (tx: Tx) => Promise<unknown>): Promise<string> => {
    try {
      await obtenerDb().$transaction(
        async (tx) => {
          await sql(tx)
          throw new Error("revertir")
        },
        { timeout: 10_000, maxWait: 5_000 },
      )
      return "sin error"
    } catch (error) {
      const texto = error instanceof Error ? error.message : String(error)
      if (texto === "revertir") return "aceptado"
      return texto.match(/(comentarios|dudas)_[a-z_]+/)?.[0] ?? texto.slice(0, 120)
    }
  }

  it("CL3b-r1-07: un comentario con duda y publicación, con duda y entrega, o sin contexto, viola comentarios_un_solo_contexto; solo con duda se acepta; una duda con fecha sin quién o quién sin fecha viola dudas_resuelta_completa", async () => {
    const e = await escenario()
    const duda = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.alumno.id })
    const publicacion = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const tarea = await crearTareaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      fechaLimite: new Date("2030-01-15T12:00:00.000Z"),
    })
    const entrega = await crearEntregaDePrueba({
      tareaId: tarea,
      alumnoId: e.alumno.id,
      fechaEntrega: instante(5),
    })
    const comentario =
      (duda_id: string | null, pub: string | null, ent: string | null) => (tx: Tx) =>
        tx.$executeRaw`
        INSERT INTO comentarios (id, duda_id, publicacion_id, entrega_id, autor_id, texto, actualizado_en)
        VALUES (${randomUUID()}::uuid, ${duda_id}::uuid, ${pub}::uuid, ${ent}::uuid,
                ${e.alumno.id}::uuid, 'raro', now())`
    const dudaRara = (en: Date | null, por: string | null) => (tx: Tx) =>
      tx.$executeRaw`
        INSERT INTO dudas (id, clase_id, autor_id, texto, resuelta_en, resuelta_por, actualizado_en)
        VALUES (${randomUUID()}::uuid, ${e.claseId}::uuid, ${e.alumno.id}::uuid, 'rara',
                ${en}::timestamptz, ${por}::uuid, now())`
    expect({
      dudaYPublicacion: await intentar(comentario(duda, publicacion, null)),
      dudaYEntrega: await intentar(comentario(duda, null, entrega)),
      losTres: await intentar(comentario(duda, publicacion, entrega)),
      ninguno: await intentar(comentario(null, null, null)),
      soloDuda: await intentar(comentario(duda, null, null)),
      fechaSinQuien: await intentar(dudaRara(instante(1), null)),
      quienSinFecha: await intentar(dudaRara(null, e.maestro.id)),
      completa: await intentar(dudaRara(instante(1), e.maestro.id)),
    }).toEqual({
      dudaYPublicacion: "comentarios_un_solo_contexto",
      dudaYEntrega: "comentarios_un_solo_contexto",
      losTres: "comentarios_un_solo_contexto",
      ninguno: "comentarios_un_solo_contexto",
      soloDuda: "aceptado",
      fechaSinQuien: "dudas_resuelta_completa",
      quienSinFecha: "dudas_resuelta_completa",
      completa: "aceptado",
    })
  })
})

describe("ataque CLASES-03b r1: fugas entre clases, dudas y contextos", () => {
  it("CL3b-r1-08: una respuesta no se alcanza por las rutas del muro ni de «mis comentarios», y un comentario del muro o del hilo privado no se alcanza por las rutas de dudas; nada se borra", async () => {
    const e = await escenario()
    const duda = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.alumno.id })
    const respuesta = await crearRespuestaDePrueba({ dudaId: duda, autorId: e.alumno.id })
    const publicacion = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const delMuro = await crearComentarioDePrueba({
      publicacionId: publicacion,
      autorId: e.alumno.id,
    })
    const tarea = await crearTareaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      fechaLimite: new Date("2030-01-15T12:00:00.000Z"),
    })
    const entrega = await crearEntregaDePrueba({
      tareaId: tarea,
      alumnoId: e.alumno.id,
      fechaEntrega: instante(5),
    })
    const { id: delHilo } = await obtenerDb().comentario.create({
      data: { entregaId: entrega, autorId: e.alumno.id, texto: "Del hilo" },
      select: { id: true },
    })
    const muro = `/api/clases/${e.claseId}/publicaciones`
    const casos: [string, Promise<LightMyRequestResponse>, string][] = [
      [
        "muro: borrar la respuesta como comentario de la publicación",
        pedir({
          method: "DELETE",
          url: `${muro}/${publicacion}/comentarios/${respuesta}`,
          token: tokenAdmin,
        }),
        "404",
      ],
      [
        "muro: la duda como publicación (listar comentarios)",
        pedir({ method: "GET", url: `${muro}/${duda}/comentarios`, token: e.t.alumno }),
        "404",
      ],
      [
        "muro: la duda como publicación (comentar)",
        pedir({
          method: "POST",
          url: `${muro}/${duda}/comentarios`,
          token: e.t.alumno,
          payload: { texto: "x" },
        }),
        "404",
      ],
      [
        "mis comentarios: la respuesta propia",
        pedir({
          method: "DELETE",
          url: `/api/clases/${e.claseId}/mis-comentarios/${respuesta}`,
          token: e.t.alumno,
        }),
        "404",
      ],
      [
        "dudas: el comentario del muro como respuesta",
        borrarRespuesta(e, duda, delMuro, tokenAdmin),
        "404 RESPUESTA_NO_ENCONTRADA",
      ],
      [
        "dudas: el comentario del hilo como respuesta",
        borrarRespuesta(e, duda, delHilo, tokenAdmin),
        "404 RESPUESTA_NO_ENCONTRADA",
      ],
      [
        "dudas: la publicación como duda (responder)",
        responder(e, publicacion, e.t.alumno),
        "404 DUDA_NO_ENCONTRADA",
      ],
      [
        "dudas: la publicación como duda (listar respuestas)",
        pedir({ method: "GET", url: urlRespuestas(e.claseId, publicacion), token: e.t.alumno }),
        "404 DUDA_NO_ENCONTRADA",
      ],
      [
        "dudas: la publicación como duda (marcar)",
        marcar(e, publicacion, true, e.t.maestro),
        "404 DUDA_NO_ENCONTRADA",
      ],
      [
        "dudas: la publicación como duda (borrar)",
        borrarDuda(e, publicacion, tokenAdmin),
        "404 DUDA_NO_ENCONTRADA",
      ],
    ]
    const fallas: string[] = []
    for (const [nombre, peticion, esperado] of casos) {
      const r = await peticion
      const obtenido = resultado(r)
      if (!obtenido.startsWith(esperado)) fallas.push(`${nombre}: ${obtenido}`)
    }
    expect(fallas).toEqual([])
    const quedan = await obtenerDb().comentario.count({
      where: { id: { in: [respuesta, delMuro, delHilo] } },
    })
    expect(quedan).toBe(3)
    const lista = listaPublicacionesRespuestaSchema.parse(
      (await pedir({ method: "GET", url: muro, token: e.t.alumno })).json(),
    )
    expect(lista.publicaciones.find((p) => p.id === publicacion)?.comentarios).toBe(1)
  })

  it("CL3b-r1-09: cursores de otra duda, de otra clase, de un comentario del muro o ya borrados responden 400 con el mismo texto; ids en mayúsculas funcionan igual que en minúsculas", async () => {
    const e = await escenario()
    const otra = await escenario()
    const duda = await crearDudaDePrueba({
      claseId: e.claseId,
      autorId: e.alumno.id,
      creadoEn: instante(1),
    })
    const otraDuda = await crearDudaDePrueba({
      claseId: e.claseId,
      autorId: e.alumno.id,
      creadoEn: instante(2),
    })
    const ajena = await crearDudaDePrueba({ claseId: otra.claseId, autorId: otra.alumno.id })
    const r1 = await crearRespuestaDePrueba({
      dudaId: duda,
      autorId: e.alumno.id,
      creadoEn: instante(3),
    })
    await crearRespuestaDePrueba({ dudaId: duda, autorId: e.alumno.id, creadoEn: instante(4) })
    const deOtraDuda = await crearRespuestaDePrueba({ dudaId: otraDuda, autorId: e.alumno.id })
    const deAjena = await crearRespuestaDePrueba({ dudaId: ajena, autorId: otra.alumno.id })
    const borrada = await crearRespuestaDePrueba({ dudaId: duda, autorId: e.alumno.id })
    await obtenerDb().comentario.delete({ where: { id: borrada } })
    const publicacion = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const delMuro = await crearComentarioDePrueba({
      publicacionId: publicacion,
      autorId: e.alumno.id,
    })

    const mensajes = new Set<string>()
    const fallas: string[] = []
    const probar = async (nombre: string, url: string) => {
      const r = await pedir({ method: "GET", url, token: e.t.alumno })
      if (resultado(r) !== "400 VALIDACION") fallas.push(`${nombre}: ${resultado(r)}`)
      else mensajes.add(errorApiSchema.parse(r.json()).error.mensaje)
    }
    for (const [nombre, cursor] of [
      ["respuesta de otra duda", deOtraDuda],
      ["respuesta de otra clase", deAjena],
      ["comentario del muro", delMuro],
      ["respuesta borrada", borrada],
    ] as const) {
      await probar(nombre, `${urlRespuestas(e.claseId, duda)}?cursor=${cursor}`)
    }
    for (const [nombre, cursor] of [
      ["duda de otra clase", ajena],
      ["publicación", publicacion],
      ["inexistente", randomUUID()],
    ] as const) {
      await probar(nombre, `${urlDudas(e.claseId)}?cursor=${cursor}`)
    }
    expect(fallas).toEqual([])
    expect([...mensajes]).toEqual(["cursor: no es válido"])

    const enMayusculas = await pedir({
      method: "GET",
      url: `${urlRespuestas(e.claseId, duda.toUpperCase())}?cursor=${r1.toUpperCase()}&limite=5`,
      token: e.t.alumno,
    })
    expect(enMayusculas.statusCode, enMayusculas.body).toBe(200)
    expect(
      listaComentariosRespuestaSchema.parse(enMayusculas.json()).comentarios.map((c) => c.texto),
    ).toEqual(["Respuesta de prueba"])
    const dudasMayusculas = await pedir({
      method: "GET",
      url: `${urlDudas(e.claseId)}?cursor=${otraDuda.toUpperCase()}`,
      token: e.t.alumno,
    })
    expect(listaDudasRespuestaSchema.parse(dudasMayusculas.json()).dudas.map((d) => d.id)).toEqual([
      duda,
    ])
    expect(
      resultado(await borrarRespuesta(e, duda.toUpperCase(), r1.toUpperCase(), e.t.alumno)),
    ).toBe("204")
    expect(resultado(await marcar(e, duda.toUpperCase(), true, e.t.maestro))).toBe("200")
    expect(resultado(await borrarDuda(e, otraDuda.toUpperCase(), e.t.alumno))).toBe("204")
    expect(await leerDudaDb(otraDuda)).toBeNull()
  })

  it("CL3b-r1-10: la duda y la respuesta de otra clase no se alcanzan por la clase propia (aunque el maestro dé las dos clases): 404 en las seis rutas, sin escribir", async () => {
    const e = await escenario()
    const otraClase = await crearClaseDePrueba(idsClases, { maestroId: e.maestro.id })
    await inscribirDePrueba(otraClase.id, e.alumno.id, "codigo")
    const ajena = await crearDudaDePrueba({ claseId: otraClase.id, autorId: e.alumno.id })
    const respuestaAjena = await crearRespuestaDePrueba({ dudaId: ajena, autorId: e.alumno.id })
    const propia = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.alumno.id })
    const obtenidos = [
      resultado(
        await pedir({ method: "GET", url: urlRespuestas(e.claseId, ajena), token: e.t.maestro }),
      ),
      resultado(await responder(e, ajena, e.t.maestro)),
      resultado(await marcar(e, ajena, true, e.t.maestro)),
      resultado(await borrarDuda(e, ajena, e.t.maestro)),
      resultado(await borrarRespuesta(e, ajena, respuestaAjena, e.t.maestro)),
      resultado(await borrarRespuesta(e, propia, respuestaAjena, e.t.maestro)),
    ]
    expect(obtenidos).toEqual([
      "404 DUDA_NO_ENCONTRADA",
      "404 DUDA_NO_ENCONTRADA",
      "404 DUDA_NO_ENCONTRADA",
      "404 DUDA_NO_ENCONTRADA",
      "404 RESPUESTA_NO_ENCONTRADA",
      "404 RESPUESTA_NO_ENCONTRADA",
    ])
    expect(await leerDudaDb(ajena)).toMatchObject({ resueltaEn: null })
    expect(await contarRespuestas(ajena)).toBe(1)
  })
})

describe("ataque CLASES-03b r1: permisos por rol y autoría (P-07, RN-07)", () => {
  it("CL3b-r1-11: el admin no escribe dudas ni respuestas; el autor estudiante no marca; un estudiante no borra lo de otro ni un maestro lo de otro maestro; el maestro sí lo de un estudiante y el admin todo", async () => {
    const e = await escenario()
    const delAlumno = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.alumno.id })
    const delMaestro = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const respuestaDelMaestro = await crearRespuestaDePrueba({
      dudaId: delAlumno,
      autorId: e.maestro.id,
    })
    const respuestaDelAlumno = await crearRespuestaDePrueba({
      dudaId: delMaestro,
      autorId: e.otroAlumno.id,
    })
    expect([
      resultado(
        await pedir({
          method: "POST",
          url: urlDudas(e.claseId),
          token: tokenAdmin,
          payload: { texto: "Del admin" },
        }),
      ),
      resultado(await responder(e, delAlumno, tokenAdmin)),
      resultado(await marcar(e, delAlumno, true, e.t.alumno)),
      resultado(
        await pedir({
          method: "PUT",
          url: `${urlDuda(e.claseId, delAlumno)}/resuelta`,
          token: e.t.alumno,
          payload: { resuelta: "true" },
        }),
      ),
      resultado(await borrarDuda(e, delAlumno, e.t.otroAlumno)),
      resultado(await borrarDuda(e, delMaestro, e.t.otroMaestro)),
      resultado(await borrarRespuesta(e, delAlumno, respuestaDelMaestro, e.t.otroMaestro)),
      resultado(await borrarRespuesta(e, delAlumno, respuestaDelMaestro, e.t.alumno)),
    ]).toEqual([
      "403 ROL_NO_PERMITIDO",
      "403 ROL_NO_PERMITIDO",
      "403 ROL_NO_PERMITIDO",
      "403 ROL_NO_PERMITIDO",
      "403 BORRADO_NO_PERMITIDO",
      "403 BORRADO_NO_PERMITIDO",
      "403 BORRADO_NO_PERMITIDO",
      "403 BORRADO_NO_PERMITIDO",
    ])
    expect(await obtenerDb().duda.count({ where: { claseId: e.claseId } })).toBe(2)
    expect([
      resultado(await borrarRespuesta(e, delMaestro, respuestaDelAlumno, e.t.otroMaestro)),
      resultado(await borrarDuda(e, delAlumno, e.t.otroMaestro)),
      resultado(await borrarDuda(e, delMaestro, tokenAdmin)),
    ]).toEqual(["204", "204", "204"])
  })

  it("CL3b-r1-12: un maestro retirado de la clase ya no entra; un alumno restringido ni lee ni escribe; un alumno quitado de la clase tampoco, y sus dudas siguen visibles y borrables por el maestro", async () => {
    const e = await escenario()
    const delRetirado = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.otroMaestro.id })
    const delAlumno = await crearDudaDePrueba({ claseId: e.claseId, autorId: e.alumno.id })
    await obtenerDb().maestroDeClase.delete({
      where: { claseId_maestroId: { claseId: e.claseId, maestroId: e.otroMaestro.id } },
    })
    const restringido = await crearUsuarioDePrueba(idsUsuarios, {
      nombre: "Restringida K",
      accesoRestringido: true,
      motivoRestriccion: "Adeudo",
    })
    await inscribirDePrueba(e.claseId, restringido.id, "codigo")
    const tokenRestringido = await firmarTokenDePrueba({ usuarioId: restringido.id })
    await obtenerDb().inscripcion.delete({
      where: { claseId_usuarioId: { claseId: e.claseId, usuarioId: e.alumno.id } },
    })
    const obtenidos = {
      retiradoLee: resultado(
        await pedir({ method: "GET", url: urlDudas(e.claseId), token: e.t.otroMaestro }),
      ),
      retiradoMarca: resultado(await marcar(e, delAlumno, true, e.t.otroMaestro)),
      retiradoBorraLaSuya: resultado(await borrarDuda(e, delRetirado, e.t.otroMaestro)),
      restringidoLee: resultado(
        await pedir({ method: "GET", url: urlDudas(e.claseId), token: tokenRestringido }),
      ),
      restringidoPregunta: resultado(
        await pedir({
          method: "POST",
          url: urlDudas(e.claseId),
          token: tokenRestringido,
          payload: { texto: "Hola" },
        }),
      ),
      quitadoLee: resultado(
        await pedir({ method: "GET", url: urlDudas(e.claseId), token: e.t.alumno }),
      ),
      quitadoBorraLaSuya: resultado(await borrarDuda(e, delAlumno, e.t.alumno)),
    }
    expect(obtenidos).toEqual({
      retiradoLee: "403 SIN_ACCESO_A_LA_CLASE",
      retiradoMarca: "403 SIN_ACCESO_A_LA_CLASE",
      retiradoBorraLaSuya: "403 SIN_ACCESO_A_LA_CLASE",
      restringidoLee: "403 ACCESO_RESTRINGIDO",
      restringidoPregunta: "403 ACCESO_RESTRINGIDO",
      quitadoLee: "403 SIN_ACCESO_A_LA_CLASE",
      quitadoBorraLaSuya: "403 SIN_ACCESO_A_LA_CLASE",
    })
    const lista = listaDudasRespuestaSchema.parse(
      (await pedir({ method: "GET", url: urlDudas(e.claseId), token: e.t.maestro })).json(),
    )
    expect(lista.dudas.find((d) => d.id === delAlumno)).toMatchObject({
      puedeBorrar: true,
      puedeMarcar: true,
      propia: false,
    })
    expect(lista.dudas.find((d) => d.id === delRetirado)).toMatchObject({ puedeBorrar: false })
    expect(resultado(await borrarDuda(e, delAlumno, e.t.maestro))).toBe("204")
    expect(resultado(await borrarDuda(e, delRetirado, tokenAdmin))).toBe("204")
  })
})

describe("ataque CLASES-03b r1: textos límite, datos que no salen y nada en la cola", () => {
  it("CL3b-r1-13: duda de 2000 y respuesta de 1000 se aceptan normalizadas; 2001 y 1001, invisibles, controles e inversores responden 400 sin escribir", async () => {
    const e = await escenario()
    const crear = (texto: string) =>
      pedir({ method: "POST", url: urlDudas(e.claseId), token: e.t.alumno, payload: { texto } })
    const larga = await crear(`  ${"d".repeat(1998)}\r\nZ  `)
    expect(larga.statusCode, larga.body).toBe(201)
    const id = larga.json<{ duda: { id: string; texto: string } }>().duda.id
    expect((await leerDudaDb(id))?.texto).toBe(`${"d".repeat(1998)}\nZ`)
    const respuestaLarga = await responder(e, id, e.t.maestro, "r".repeat(1000))
    expect(respuestaLarga.statusCode, respuestaLarga.body).toBe(201)

    const antes = {
      dudas: await obtenerDb().duda.count({ where: { claseId: e.claseId } }),
      respuestas: await contarRespuestas(id),
    }
    const fallas: string[] = []
    for (const [nombre, texto] of [
      ["2001", "d".repeat(2001)],
      ["invisibles", "​⁠\u{E0041} ⠀"],
      ["vacía", "   \n\t "],
      ["control", "Hola\u0007"],
      ["inversor", "Hola‮mundo"],
    ] as const) {
      const r = await crear(texto)
      if (resultado(r) !== "400 VALIDACION") fallas.push(`duda ${nombre}: ${resultado(r)}`)
    }
    for (const [nombre, texto] of [
      ["1001", "r".repeat(1001)],
      ["invisibles", "​⁠"],
      ["control", "Hola\u0000"],
      ["inversor", "⁦Hola"],
    ] as const) {
      const r = await responder(e, id, e.t.alumno, texto)
      if (resultado(r) !== "400 VALIDACION") fallas.push(`respuesta ${nombre}: ${resultado(r)}`)
    }
    for (const cuerpo of [{}, { texto: 5 }, { texto: null }]) {
      const r = await pedir({
        method: "POST",
        url: urlDudas(e.claseId),
        token: e.t.alumno,
        payload: cuerpo,
      })
      if (resultado(r) !== "400 VALIDACION")
        fallas.push(`cuerpo ${JSON.stringify(cuerpo)}: ${resultado(r)}`)
    }
    expect(fallas).toEqual([])
    expect({
      dudas: await obtenerDb().duda.count({ where: { claseId: e.claseId } }),
      respuestas: await contarRespuestas(id),
    }).toEqual(antes)
  })

  it("CL3b-r1-14: ninguna respuesta de las rutas de dudas, a los tres roles, lleva correo, estado de pago, restricción, rol ni quién marcó; y nada se encola", async () => {
    const e = await escenario()
    await obtenerDb().usuario.update({
      where: { id: e.alumno.id },
      data: { estadoPago: "deudor" },
    })
    const duda = await crearDudaDePrueba({
      claseId: e.claseId,
      autorId: e.alumno.id,
      resueltaPor: e.maestro.id,
      resueltaEn: instante(9),
    })
    await crearRespuestaDePrueba({ dudaId: duda, autorId: e.alumno.id })
    const cuerpos: string[] = []
    const guardar = (r: LightMyRequestResponse) => {
      expect(r.statusCode, r.body).toBeLessThan(300)
      cuerpos.push(r.body)
      return r
    }
    for (const token of [e.t.alumno, e.t.otroAlumno, e.t.maestro, tokenAdmin]) {
      guardar(await pedir({ method: "GET", url: urlDudas(e.claseId), token }))
      guardar(await pedir({ method: "GET", url: urlRespuestas(e.claseId, duda), token }))
    }
    const nueva = guardar(
      await pedir({
        method: "POST",
        url: urlDudas(e.claseId),
        token: e.t.alumno,
        payload: { texto: "Otra duda" },
      }),
    ).json<{ duda: { id: string } }>().duda.id
    guardar(await responder(e, nueva, e.t.maestro))
    guardar(await marcar(e, nueva, true, e.t.maestro))
    guardar(await marcar(e, nueva, false, tokenAdmin))
    guardar(await borrarDuda(e, nueva, e.t.alumno))
    const correos = [e.alumno.email, e.maestro.email, e.otroAlumno.email]
    const prohibido =
      /"(email|correo|estadoPago|estado_pago|accesoRestringido|motivoRestriccion|rol|resueltaPor|resuelta_por|marcadaPor)"|deudor|@/
    expect(cuerpos.filter((c) => prohibido.test(c) || correos.some((m) => c.includes(m)))).toEqual(
      [],
    )
    expect({
      clase: await trabajosQueMencionan(e.claseId),
      duda: await trabajosQueMencionan(duda),
      nueva: await trabajosQueMencionan(nueva),
    }).toEqual({ clase: 0, duda: 0, nueva: 0 })
  })
})
