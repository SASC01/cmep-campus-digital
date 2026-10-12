import { randomUUID } from "node:crypto"

import {
  comentarioPrivadoRespuestaSchema,
  errorApiSchema,
  listaComentariosPrivadosRespuestaSchema,
  listaPublicacionesRespuestaSchema,
  type ComentarioPrivado,
} from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  desactivarUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  crearComentarioDePrueba,
  crearPublicacionDePrueba,
  idDelAdminDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { contarEntregasDeTarea, crearEntregaDePrueba, leerEntregaDb } from "./ayudas-entregas.js"
import { crearTareaDePrueba } from "./ayudas-tareas.js"

// ENTREGAS-01c (§D-4; PR-1C01 a PR-1C06). El hilo privado de una entrega: el alumno el suyo, los
// maestros de la clase el de un alumno inscrito, el admin lo lee y no escribe (P-01 a). Las fechas
// límite llevan horas de margen respecto de la hora real.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const HORA_MS = 60 * 60 * 1000

interface Escenario {
  claseId: string
  tareaId: string
  maestro: UsuarioDePrueba
  otroMaestro: UsuarioDePrueba
  alumno: UsuarioDePrueba
  otroAlumno: UsuarioDePrueba
  tokens: {
    maestro: string
    otroMaestro: string
    alumno: string
    otroAlumno: string
    admin: string
  }
}

const escenario = async ({
  fechaLimite,
  aceptaTardias,
}: { fechaLimite?: Date; aceptaTardias?: boolean } = {}): Promise<Escenario> => {
  const ficha = randomUUID().slice(0, 6)
  const maestro = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Maestra Hilo ${ficha}`,
    rol: "maestro",
  })
  const otroMaestro = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Maestro Dos ${ficha}`,
    rol: "maestro",
  })
  const clase = await crearClaseDePrueba(idsClases, {
    maestroId: maestro.id,
    maestroIds: [maestro.id, otroMaestro.id],
  })
  const alumno = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Alumna Hilo ${ficha}` })
  const otroAlumno = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Alumno Otro ${ficha}` })
  await inscribirDePrueba(clase.id, alumno.id)
  await inscribirDePrueba(clase.id, otroAlumno.id)
  const tareaId = await crearTareaDePrueba({
    claseId: clase.id,
    autorId: maestro.id,
    fechaLimite: fechaLimite ?? new Date(Date.now() + 48 * HORA_MS),
    ...(aceptaTardias === undefined ? {} : { aceptaTardias }),
  })
  return {
    claseId: clase.id,
    tareaId,
    maestro,
    otroMaestro,
    alumno,
    otroAlumno,
    tokens: {
      maestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
      otroMaestro: await firmarTokenDePrueba({ usuarioId: otroMaestro.id }),
      alumno: await firmarTokenDePrueba({ usuarioId: alumno.id }),
      otroAlumno: await firmarTokenDePrueba({ usuarioId: otroAlumno.id }),
      admin: await tokenDelAdminDePrueba(),
    },
  }
}

const pedir = (
  token: string,
  method: "GET" | "POST" | "DELETE",
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

const urlMiHilo = (e: Escenario, tareaId = e.tareaId, consulta = ""): string =>
  `/api/clases/${e.claseId}/tareas/${tareaId}/entrega/comentarios${consulta}`

const urlHiloDe = (e: Escenario, alumnoId: string, consulta = "", tareaId = e.tareaId): string =>
  `/api/clases/${e.claseId}/tareas/${tareaId}/entregas/${alumnoId}/comentarios${consulta}`

const listaDe = (respuesta: LightMyRequestResponse) => {
  expect(respuesta.statusCode, respuesta.body).toBe(200)
  return listaComentariosPrivadosRespuestaSchema.parse(respuesta.json())
}

const creadoDe = (respuesta: LightMyRequestResponse): ComentarioPrivado => {
  expect(respuesta.statusCode, respuesta.body).toBe(201)
  return comentarioPrivadoRespuestaSchema.parse(respuesta.json()).comentario
}

// Comentarios sembrados en el hilo (la fila de la entrega debe existir), uno por minuto hacia atrás.
const sembrarHilo = async (entregaId: string, autores: readonly string[]): Promise<string[]> => {
  const ahora = Date.now()
  const ids: string[] = []
  for (const [i, autorId] of autores.entries()) {
    const { id } = await obtenerDb().comentario.create({
      data: {
        entregaId,
        autorId,
        texto: `Privado ${String(i)}`,
        creadoEn: new Date(ahora - (autores.length - i) * 60_000),
      },
      select: { id: true },
    })
    ids.push(id)
  }
  return ids
}

const trabajoDelComentario = async (comentarioId: string) =>
  obtenerDb().$queryRaw<{ name: string; datos: Record<string, unknown> }[]>`
    SELECT name, data AS datos FROM pgboss.job WHERE id = ${comentarioId}::uuid`

const trabajosDelHiloDeLaClase = async (claseId: string): Promise<number> =>
  (
    await obtenerDb().$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM pgboss.job
      WHERE name = 'COMENTARIO_CREADO' AND data ->> 'claseId' = ${claseId}::text`
  )[0]?.n ?? 0

describe("el alumno lista su hilo (PR-1C01)", () => {
  it("PR-1C01: sin fila de entrega responde un hilo vacío y no crea la fila", async () => {
    const e = await escenario()
    expect(listaDe(await pedir(e.tokens.alumno, "GET", urlMiHilo(e)))).toEqual({
      comentarios: [],
      siguienteCursor: null,
    })
    expect(await contarEntregasDeTarea(e.tareaId)).toBe(0)
  })

  it("PR-1C01: con comentarios, en orden ascendente, con propio correcto y la firma del autor (Administración para el admin, sin rol)", async () => {
    const e = await escenario()
    const entregaId = await crearEntregaDePrueba({
      tareaId: e.tareaId,
      alumnoId: e.alumno.id,
      estado: "asignado",
      version: 0,
    })
    const admin = await idDelAdminDePrueba()
    const ids = await sembrarHilo(entregaId, [e.alumno.id, e.maestro.id, admin])

    const respuesta = await pedir(e.tokens.alumno, "GET", urlMiHilo(e))
    const { comentarios } = listaDe(respuesta)
    expect(comentarios.map((c) => c.id)).toEqual(ids)
    expect(comentarios.map((c) => c.propio)).toEqual([true, false, false])
    expect(comentarios[1]?.autor).toEqual({
      id: e.maestro.id,
      nombre: expect.stringContaining("Maestra Hilo") as string,
      administracion: false,
    })
    expect(comentarios[2]?.autor).toMatchObject({ administracion: true, nombre: "Administración" })
    expect(respuesta.body).not.toMatch(/"rol"|@|estadoPago|deudor|al_corriente|accesoRestringido/)
  })

  it("PR-1C01: pagina de 20 en 20 con cursor, sin repetir ni saltar", async () => {
    const e = await escenario()
    const entregaId = await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })
    const ids = await sembrarHilo(
      entregaId,
      Array.from({ length: 25 }, () => e.alumno.id),
    )

    const primera = listaDe(await pedir(e.tokens.alumno, "GET", urlMiHilo(e)))
    expect(primera.comentarios).toHaveLength(20)
    expect(primera.siguienteCursor).toBe(ids[19])
    const segunda = listaDe(
      await pedir(
        e.tokens.alumno,
        "GET",
        urlMiHilo(e, e.tareaId, `?cursor=${primera.siguienteCursor ?? ""}`),
      ),
    )
    expect(segunda.siguienteCursor).toBeNull()
    expect([...primera.comentarios, ...segunda.comentarios].map((c) => c.id)).toEqual(ids)
    const todos = listaDe(
      await pedir(e.tokens.alumno, "GET", urlMiHilo(e, e.tareaId, "?limite=100")),
    )
    expect(todos.comentarios).toHaveLength(25)
  })

  it("PR-1C01: un cursor de otro hilo (de otro alumno o de otra tarea), de un comentario del muro o sin fila de entrega responde 400 VALIDACION", async () => {
    const e = await escenario()
    const propia = await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })
    await sembrarHilo(propia, [e.alumno.id])
    const ajena = await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.otroAlumno.id })
    const [deOtroAlumno] = await sembrarHilo(ajena, [e.otroAlumno.id])
    const otraTarea = await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const deOtraTareaEntrega = await crearEntregaDePrueba({
      tareaId: otraTarea,
      alumnoId: e.alumno.id,
    })
    const [deOtraTarea] = await sembrarHilo(deOtraTareaEntrega, [e.alumno.id])
    const anuncio = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const delMuro = await crearComentarioDePrueba({ publicacionId: anuncio, autorId: e.alumno.id })
    const sinFila = await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id })

    const casos: [string, string][] = [
      [urlMiHilo(e, e.tareaId, `?cursor=${deOtroAlumno ?? ""}`), "otro alumno"],
      [urlMiHilo(e, e.tareaId, `?cursor=${deOtraTarea ?? ""}`), "otra tarea"],
      [urlMiHilo(e, e.tareaId, `?cursor=${delMuro}`), "muro"],
      [urlMiHilo(e, sinFila, `?cursor=${deOtraTarea ?? ""}`), "sin fila"],
      [urlHiloDe(e, e.alumno.id, `?cursor=${deOtroAlumno ?? ""}`), "maestro, otro alumno"],
    ]
    for (const [url, nombre] of casos) {
      const token = url.includes("/entregas/") ? e.tokens.maestro : e.tokens.alumno
      const respuesta = await pedir(token, "GET", url)
      expect(respuesta.statusCode, nombre).toBe(400)
      expect(errorApiSchema.parse(respuesta.json()).error, nombre).toEqual({
        codigo: "VALIDACION",
        mensaje: "cursor: no es válido",
      })
    }
  })
})

describe("el alumno comenta en su hilo (PR-1C02)", () => {
  it("PR-1C02: sin fila la crea en asignado (versión 0), responde 201 y encola un COMENTARIO_CREADO con id = id del comentario y solo ids", async () => {
    const e = await escenario()
    const comentario = creadoDe(
      await pedir(e.tokens.alumno, "POST", urlMiHilo(e), { texto: "  ¿Puedo entregar en PDF?  " }),
    )
    expect(comentario).toMatchObject({ texto: "¿Puedo entregar en PDF?", propio: true })
    expect(comentario.autor).toMatchObject({ id: e.alumno.id, administracion: false })
    const fila = await leerEntregaDb(e.tareaId, e.alumno.id)
    expect(fila).toMatchObject({ estado: "asignado", version: 0, fechaEntrega: null })
    const trabajos = await trabajoDelComentario(comentario.id)
    expect(trabajos).toHaveLength(1)
    expect(trabajos[0]?.name).toBe("COMENTARIO_CREADO")
    expect(trabajos[0]?.datos).toEqual({
      comentarioId: comentario.id,
      entregaId: fila?.id,
      claseId: e.claseId,
    })
  })

  it("PR-1C02: con la entrega entregada, calificada o cerrada, comentar no cambia su estado ni su versión (S-15)", async () => {
    const abierta = await escenario()
    await crearEntregaDePrueba({
      tareaId: abierta.tareaId,
      alumnoId: abierta.alumno.id,
      version: 3,
    })
    await crearEntregaDePrueba({
      tareaId: abierta.tareaId,
      alumnoId: abierta.otroAlumno.id,
      estado: "calificado",
      version: 5,
    })
    const cerrada = await escenario({
      fechaLimite: new Date(Date.now() - 2 * HORA_MS),
      aceptaTardias: false,
    })
    await crearEntregaDePrueba({
      tareaId: cerrada.tareaId,
      alumnoId: cerrada.alumno.id,
      fechaEntrega: new Date(Date.now() - 3 * HORA_MS),
      version: 2,
    })

    const casos: [Escenario, string, UsuarioDePrueba, string, number][] = [
      [abierta, abierta.tokens.alumno, abierta.alumno, "entregado", 3],
      [abierta, abierta.tokens.otroAlumno, abierta.otroAlumno, "calificado", 5],
      [cerrada, cerrada.tokens.alumno, cerrada.alumno, "entregado", 2],
    ]
    for (const [e, token, alumno, estado, version] of casos) {
      const antes = await leerEntregaDb(e.tareaId, alumno.id)
      creadoDe(await pedir(token, "POST", urlMiHilo(e), { texto: "Una duda" }))
      const despues = await leerEntregaDb(e.tareaId, alumno.id)
      expect(despues).toMatchObject({ estado, version })
      expect(despues?.actualizadoEn).toEqual(antes?.actualizadoEn)
    }
    // Con la entrega cerrada y sin fila, también se comenta (S-04) y nace asignado.
    creadoDe(await pedir(cerrada.tokens.otroAlumno, "POST", urlMiHilo(cerrada), { texto: "Hola" }))
    expect(await leerEntregaDb(cerrada.tareaId, cerrada.otroAlumno.id)).toMatchObject({
      estado: "asignado",
      version: 0,
    })
  })

  it("PR-1C02: texto vacío, solo invisibles o de 1001 caracteres visibles responde 400 sin crear fila ni comentario ni trabajo; 1000 visibles se aceptan", async () => {
    const vacio = await escenario()
    const invalidos: unknown[] = [
      { texto: "" },
      { texto: "   " },
      { texto: "​​⠀" },
      { texto: "a".repeat(1001) },
      {},
      { texto: 5 },
    ]
    for (const cuerpo of invalidos) {
      const respuesta = await pedir(vacio.tokens.alumno, "POST", urlMiHilo(vacio), cuerpo as object)
      expect(respuesta.statusCode, JSON.stringify(cuerpo).slice(0, 30)).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
    }
    expect(await contarEntregasDeTarea(vacio.tareaId)).toBe(0)
    expect(await obtenerDb().comentario.count({ where: { autorId: vacio.alumno.id } })).toBe(0)
    expect(await trabajosDelHiloDeLaClase(vacio.claseId)).toBe(0)
    const mil = creadoDe(
      await pedir(vacio.tokens.alumno, "POST", urlMiHilo(vacio), {
        texto: `\n${"é".repeat(1000)}\n`,
      }),
    )
    expect(Array.from(mil.texto)).toHaveLength(1000)
  })
})

describe("los maestros en el hilo de un alumno (PR-1C03)", () => {
  it("PR-1C03: el maestro lista y comenta en el hilo de un alumno inscrito; el alumno lo ve con propio falso y el otro maestro de la clase también lo ve", async () => {
    const e = await escenario()
    const delAlumno = creadoDe(
      await pedir(e.tokens.alumno, "POST", urlMiHilo(e), { texto: "Duda" }),
    )
    const delMaestro = creadoDe(
      await pedir(e.tokens.maestro, "POST", urlHiloDe(e, e.alumno.id), { texto: "Respuesta" }),
    )
    expect(delMaestro.propio).toBe(true)
    const trabajos = await trabajoDelComentario(delMaestro.id)
    expect(trabajos[0]?.datos).toEqual({
      comentarioId: delMaestro.id,
      entregaId: (await leerEntregaDb(e.tareaId, e.alumno.id))?.id,
      claseId: e.claseId,
    })

    const delAlumnoVe = listaDe(await pedir(e.tokens.alumno, "GET", urlMiHilo(e))).comentarios
    expect(delAlumnoVe.map((c) => [c.id, c.propio])).toEqual([
      [delAlumno.id, true],
      [delMaestro.id, false],
    ])
    for (const token of [e.tokens.maestro, e.tokens.otroMaestro]) {
      const ve = listaDe(await pedir(token, "GET", urlHiloDe(e, e.alumno.id))).comentarios
      expect(ve.map((c) => c.id)).toEqual([delAlumno.id, delMaestro.id])
    }
    // El hilo del compañero sigue vacío.
    expect(
      listaDe(await pedir(e.tokens.maestro, "GET", urlHiloDe(e, e.otroAlumno.id))).comentarios,
    ).toEqual([])
  })

  it("PR-1C03: alumno de otra clase, dado de baja, desactivado, inexistente o un maestro como :alumnoId responden 404 ALUMNO_NO_ENCONTRADO al leer y al escribir, sin crear fila, comentario ni trabajo", async () => {
    const e = await escenario()
    const otra = await escenario()
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.otroAlumno.id })
    await obtenerDb().inscripcion.delete({
      where: { claseId_usuarioId: { claseId: e.claseId, usuarioId: e.otroAlumno.id } },
    })
    const desactivado = await crearAlumnoDePrueba(idsUsuarios, { nombre: "Desactivado Hilo" })
    await inscribirDePrueba(e.claseId, desactivado.id)
    await desactivarUsuarioDePrueba(desactivado.id)

    for (const alumnoId of [
      otra.alumno.id,
      e.otroAlumno.id,
      desactivado.id,
      randomUUID(),
      e.otroMaestro.id,
    ]) {
      for (const [metodo, payload] of [
        ["GET", undefined],
        ["POST", { texto: "Hola" }],
      ] as const) {
        const respuesta = await pedir(e.tokens.maestro, metodo, urlHiloDe(e, alumnoId), payload)
        expect(respuesta.statusCode, `${metodo} ${alumnoId}`).toBe(404)
        expect(codigoDe(respuesta)).toBe("ALUMNO_NO_ENCONTRADO")
      }
    }
    expect(await contarEntregasDeTarea(e.tareaId)).toBe(1)
    expect(await obtenerDb().comentario.count({ where: { entrega: { tareaId: e.tareaId } } })).toBe(
      0,
    )
    expect(await trabajosDelHiloDeLaClase(e.claseId)).toBe(0)
  })
})

describe("aislamiento del hilo frente al muro (PR-1C04)", () => {
  it("PR-1C04: el alumno no llega al hilo de otro: su ruta usa su propio id y la de los maestros le responde 403", async () => {
    const e = await escenario()
    creadoDe(await pedir(e.tokens.otroAlumno, "POST", urlMiHilo(e), { texto: "Secreto de Beto" }))
    const propio = listaDe(await pedir(e.tokens.alumno, "GET", urlMiHilo(e)))
    expect(propio.comentarios).toEqual([])
    for (const metodo of ["GET", "POST"] as const) {
      const respuesta = await pedir(
        e.tokens.alumno,
        metodo,
        urlHiloDe(e, e.otroAlumno.id),
        metodo === "POST" ? { texto: "x" } : undefined,
      )
      expect(respuesta.statusCode).toBe(403)
      expect(codigoDe(respuesta)).toBe("ROL_NO_PERMITIDO")
    }
  })

  it("PR-1C04: las rutas del muro no ven, no cuentan ni borran un comentario privado", async () => {
    const e = await escenario()
    const privado = creadoDe(
      await pedir(e.tokens.alumno, "POST", urlMiHilo(e), { texto: "Privado" }),
    )
    const anuncio = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    await crearComentarioDePrueba({
      publicacionId: anuncio,
      autorId: e.alumno.id,
      texto: "Público",
    })

    const muro = await pedir(e.tokens.maestro, "GET", `/api/clases/${e.claseId}/publicaciones`)
    expect(muro.statusCode, muro.body).toBe(200)
    const publicaciones = listaPublicacionesRespuestaSchema.parse(muro.json()).publicaciones
    expect(publicaciones.find((p) => p.id === e.tareaId)?.comentarios).toBe(0)
    expect(publicaciones.find((p) => p.id === anuncio)?.comentarios).toBe(1)
    expect(muro.body).not.toContain("Privado")

    const delAnuncio = await pedir(
      e.tokens.maestro,
      "GET",
      `/api/clases/${e.claseId}/publicaciones/${anuncio}/comentarios`,
    )
    expect(delAnuncio.statusCode).toBe(200)
    expect(delAnuncio.body).not.toContain(privado.id)
    const deLaTarea = await pedir(
      e.tokens.maestro,
      "GET",
      `/api/clases/${e.claseId}/publicaciones/${e.tareaId}/comentarios`,
    )
    expect(deLaTarea.statusCode).toBe(404)
    expect(deLaTarea.body).not.toContain(privado.id)

    const borrados = [
      [e.tokens.alumno, `/api/clases/${e.claseId}/mis-comentarios/${privado.id}`],
      [
        e.tokens.maestro,
        `/api/clases/${e.claseId}/publicaciones/${anuncio}/comentarios/${privado.id}`,
      ],
      [
        e.tokens.maestro,
        `/api/clases/${e.claseId}/publicaciones/${e.tareaId}/comentarios/${privado.id}`,
      ],
      [
        e.tokens.admin,
        `/api/clases/${e.claseId}/publicaciones/${anuncio}/comentarios/${privado.id}`,
      ],
    ] as const
    for (const [token, url] of borrados) {
      const respuesta = await pedir(token, "DELETE", url)
      expect(respuesta.statusCode, url).toBe(404)
    }
    expect(await obtenerDb().comentario.count({ where: { id: privado.id } })).toBe(1)
  })
})

describe("el admin en el hilo (PR-1C05)", () => {
  it("PR-1C05: el admin lee el hilo de un alumno de cualquier clase y escribir le responde 403 sin crear fila, comentario ni trabajo", async () => {
    const e = await escenario()
    const delAlumno = creadoDe(
      await pedir(e.tokens.alumno, "POST", urlMiHilo(e), { texto: "Hola" }),
    )
    const leido = listaDe(await pedir(e.tokens.admin, "GET", urlHiloDe(e, e.alumno.id)))
    expect(leido.comentarios.map((c) => [c.id, c.propio])).toEqual([[delAlumno.id, false]])

    const comentariosAntes = await obtenerDb().comentario.count({
      where: { entrega: { tareaId: e.tareaId } },
    })
    const trabajosAntes = await trabajosDelHiloDeLaClase(e.claseId)
    for (const alumnoId of [e.alumno.id, e.otroAlumno.id]) {
      const respuesta = await pedir(e.tokens.admin, "POST", urlHiloDe(e, alumnoId), {
        texto: "Admin",
      })
      expect(respuesta.statusCode).toBe(403)
      expect(codigoDe(respuesta)).toBe("ROL_NO_PERMITIDO")
    }
    expect(await leerEntregaDb(e.tareaId, e.otroAlumno.id)).toBeNull()
    expect(await obtenerDb().comentario.count({ where: { entrega: { tareaId: e.tareaId } } })).toBe(
      comentariosAntes,
    )
    expect(await trabajosDelHiloDeLaClase(e.claseId)).toBe(trabajosAntes)
  })
})

describe("comentar con la tarea borrada (PR-1C06)", () => {
  it("PR-1C06: con la tarea ya borrada, comentar (alumno y maestro) y leer responden 404 TAREA_NO_ENCONTRADA sin dejar comentario ni entrega huérfanos", async () => {
    const e = await escenario()
    const borrada = await pedir(
      e.tokens.maestro,
      "DELETE",
      `/api/clases/${e.claseId}/tareas/${e.tareaId}`,
    )
    expect(borrada.statusCode, borrada.body).toBe(204)

    const pedidas = [
      await pedir(e.tokens.alumno, "POST", urlMiHilo(e), { texto: "Tarde" }),
      await pedir(e.tokens.maestro, "POST", urlHiloDe(e, e.alumno.id), { texto: "Tarde" }),
      await pedir(e.tokens.alumno, "GET", urlMiHilo(e)),
      await pedir(e.tokens.admin, "GET", urlHiloDe(e, e.alumno.id)),
    ]
    for (const respuesta of pedidas) {
      expect(respuesta.statusCode, respuesta.body).toBe(404)
      expect(codigoDe(respuesta)).toBe("TAREA_NO_ENCONTRADA")
    }
    expect(await contarEntregasDeTarea(e.tareaId)).toBe(0)
    expect(await obtenerDb().comentario.count({ where: { autorId: e.alumno.id } })).toBe(0)
    expect(await trabajosDelHiloDeLaClase(e.claseId)).toBe(0)
  })

  it("PR-1C06: una tarea de otra clase responde 404 TAREA_NO_ENCONTRADA al leer y al comentar", async () => {
    const e = await escenario()
    const otra = await escenario()
    for (const [token, metodo, url] of [
      [e.tokens.alumno, "GET", urlMiHilo(e, otra.tareaId)],
      [e.tokens.alumno, "POST", urlMiHilo(e, otra.tareaId)],
      [e.tokens.maestro, "GET", urlHiloDe(e, e.alumno.id, "", otra.tareaId)],
      [e.tokens.maestro, "POST", urlHiloDe(e, e.alumno.id, "", otra.tareaId)],
    ] as const) {
      const respuesta = await pedir(
        token,
        metodo,
        url,
        metodo === "POST" ? { texto: "x" } : undefined,
      )
      expect(respuesta.statusCode, url).toBe(404)
      expect(codigoDe(respuesta)).toBe("TAREA_NO_ENCONTRADA")
    }
    expect(await contarEntregasDeTarea(otra.tareaId)).toBe(0)
  })
})
