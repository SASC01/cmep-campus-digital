import { randomUUID } from "node:crypto"

import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { calificarEntrega, publicarParticipacion } from "../src/adapters/db/index.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { AppError } from "../src/core/errores.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba, crearUsuarioDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import { trabajosDeCalificacion } from "./ayudas-calificaciones.js"
import { borrarMovimientosYClasesDePrueba, inscribirDePrueba } from "./ayudas-clases.js"
import { formadasDetrasDe } from "./ayudas-concurrencia.js"
import { crearEntregaDePrueba, leerEntregaDb } from "./ayudas-entregas.js"
import {
  codigoDe,
  crearEscenarioDeForo,
  crearForoDePrueba,
  cuerpoDeForo,
  HORA_MS,
  pedirForo,
  urlForo,
  type EscenarioDeForo,
} from "./ayudas-foros.js"

// Ataque FORO-01a, ronda 1 (tester). Punto 2 (carreras): la frontera del milisegundo de la regla del
// foro entre publicar y calificar, llamando a los adaptadores con una hora fija; la principal que
// espera la fila de la entrega mientras otra transacción la califica o publica (retención deliberada
// de esa fila, con formadasDetrasDe: la operación se da por formada solo cuando espera esa fila);
// principales contra el borrado del foro; dos calificaciones a la vez; y editar el cierre contra
// publicar. Ningún LOCK TABLE; la retenedora lleva timeout explícito.

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

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

const alumnoMas = async (e: EscenarioDeForo, nombre: string) => {
  const alumno = await crearUsuarioDePrueba(idsUsuarios, { nombre })
  await inscribirDePrueba(e.claseId, alumno.id)
  return { ...alumno, token: await firmarTokenDePrueba({ usuarioId: alumno.id }) }
}

const codigoDelError = async (promesa: Promise<unknown>): Promise<string> => {
  try {
    await promesa
  } catch (error) {
    if (error instanceof AppError) return error.codigo
    throw error
  }
  return "SIN_ERROR"
}

const principalesDb = (foroId: string, autorId: string) =>
  obtenerDb().participacionForo.findMany({
    where: { foroId, autorId, principalId: null },
    select: { id: true, conRetraso: true },
  })

const calificarDirecto = (
  e: EscenarioDeForo,
  foroId: string,
  alumnoId: string,
  ahora: Date,
  version = 0,
) =>
  calificarEntrega(
    {
      claseId: e.claseId,
      tareaId: foroId,
      alumnoId,
      tipo: "foro",
      autorId: e.maestro.id,
      ahora,
      version,
      puntosDeLaTarea: 10,
      puntajes: [],
      calificacion: 4,
      comentario: null,
    },
    () => Promise.resolve(),
  )

const publicarDirecto = (e: EscenarioDeForo, foroId: string, alumnoId: string, ahora: Date) =>
  publicarParticipacion({
    id: randomUUID(),
    claseId: e.claseId,
    foroId,
    alumnoId,
    texto: "Principal con hora fija",
    ahora,
  })

const participar = (e: EscenarioDeForo, foroId: string, token: string) =>
  pedir({
    method: "POST",
    url: `${urlForo(e.claseId, foroId)}/participaciones`,
    token,
    payload: { texto: "Mi principal en carrera" },
  })

// Retiene la fila de entregas FOR UPDATE, lanza la operación, espera a que esa operación espere la
// fila (wait_event transactionid/tuple) y escribe, dentro de la retenedora, lo que haría la operación
// rival antes de soltarla.
const conEntregaRetenida = async (
  entregaId: string,
  operacion: () => Promise<LightMyRequestResponse>,
  rival: (
    sql: (texto: TemplateStringsArray, ...valores: unknown[]) => Promise<number>,
  ) => Promise<void>,
): Promise<LightMyRequestResponse> => {
  let lanzada: Promise<LightMyRequestResponse> | undefined
  await obtenerDb().$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM entregas WHERE id = ${entregaId}::uuid FOR UPDATE`
      const [propio] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
      if (!propio) throw new Error("Precondición: no se obtuvo el pid de la retenedora")
      let terminada = false
      lanzada = operacion()
      lanzada.then(
        () => (terminada = true),
        () => (terminada = true),
      )
      const limite = Date.now() + 10_000
      let formada = false
      while (!formada && !terminada && Date.now() < limite) {
        formada = (await formadasDetrasDe(propio.pid)) >= 1
        if (!formada) await esperar(25)
      }
      expect(terminada, "Precondición: la operación terminó sin esperar la fila retenida").toBe(
        false,
      )
      expect(formada, "Precondición: la operación no llegó a la fila retenida en 10 s").toBe(true)
      await rival((texto, ...valores) => tx.$executeRaw(texto, ...valores))
    },
    { timeout: 30_000, maxWait: 5_000 },
  )
  if (lanzada === undefined) throw new Error("Precondición: la operación se lanzó")
  return lanzada
}

describe("ataque FORO-01a r1 · punto 2: la frontera del milisegundo y las carreras", () => {
  it("ATQ-FORO-20: sin tardías, en el milisegundo exacto de la fecha límite se publica a tiempo y no se califica a quien no participó; un milisegundo después no se publica (sin fila perezosa) y sí se califica, sin fecha de entrega; y quien quedó calificado ya no publica con una hora anterior", async () => {
    const e = await crearEscenarioDeForo(idsUsuarios, idsClases)
    const tercero = await alumnoMas(e, "Alumno Tercero")
    const limite = new Date(Date.now() + HORA_MS)
    const despues = new Date(limite.getTime() + 1)
    const foroId = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      fechaLimite: limite,
      aceptaTardias: false,
    })

    const aTiempo = await publicarDirecto(e, foroId, e.alumno.id, limite)
    expect(aTiempo?.participacion.conRetraso).toBe(false)
    expect(await codigoDelError(publicarDirecto(e, foroId, e.otroAlumno.id, despues))).toBe(
      "FORO_CERRADO",
    )
    expect(await leerEntregaDb(foroId, e.otroAlumno.id)).toBeNull()

    expect(await codigoDelError(calificarDirecto(e, foroId, tercero.id, limite))).toBe(
      "ENTREGA_NO_CALIFICABLE",
    )
    expect(await leerEntregaDb(foroId, tercero.id)).toBeNull()
    const calificada = await calificarDirecto(e, foroId, tercero.id, despues)
    expect(calificada).not.toBeNull()
    const fila = await leerEntregaDb(foroId, tercero.id)
    expect(fila).toMatchObject({ estado: "calificado", fechaEntrega: null })
    expect(await codigoDelError(publicarDirecto(e, foroId, tercero.id, limite))).toBe(
      "PARTICIPACION_CALIFICADA",
    )
    expect(await principalesDb(foroId, tercero.id)).toEqual([])
  }, 60_000)

  it("ATQ-FORO-21: una principal formada detrás de la fila de la entrega decide con lo que dejó la rival: si la califican sin participar, 409 PARTICIPACION_CALIFICADA; si otra principal la publica, 409 PARTICIPACION_YA_PUBLICADA; nunca 500 ni una segunda principal", async () => {
    const e = await crearEscenarioDeForo(idsUsuarios, idsClases)
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })

    const entregaA = await crearEntregaDePrueba({
      tareaId: foroId,
      alumnoId: e.alumno.id,
      estado: "asignado",
      version: 0,
    })
    const calificada = await conEntregaRetenida(
      entregaA,
      () => participar(e, foroId, e.tokenAlumno),
      async (sql) => {
        await sql`UPDATE entregas SET estado = 'calificado', calificacion = 5,
                  fecha_calificacion = now(), version = version + 1 WHERE id = ${entregaA}::uuid`
      },
    )
    expect(calificada.statusCode, calificada.body).toBe(409)
    expect(codigoDe(calificada)).toBe("PARTICIPACION_CALIFICADA")
    expect(await principalesDb(foroId, e.alumno.id)).toEqual([])

    const entregaB = await crearEntregaDePrueba({
      tareaId: foroId,
      alumnoId: e.otroAlumno.id,
      estado: "asignado",
      version: 0,
    })
    const publicada = await conEntregaRetenida(
      entregaB,
      () => participar(e, foroId, e.tokenOtroAlumno),
      async (sql) => {
        await sql`INSERT INTO participaciones_foro (id, foro_id, autor_id, texto)
                  VALUES (${randomUUID()}::uuid, ${foroId}::uuid, ${e.otroAlumno.id}::uuid, 'La rival')`
        await sql`UPDATE entregas SET estado = 'entregado', fecha_entrega = now(),
                  version = version + 1 WHERE id = ${entregaB}::uuid`
      },
    )
    expect(publicada.statusCode, publicada.body).toBe(409)
    expect(codigoDe(publicada)).toBe("PARTICIPACION_YA_PUBLICADA")
    expect(await principalesDb(foroId, e.otroAlumno.id)).toHaveLength(1)
    expect(await leerEntregaDb(foroId, e.otroAlumno.id)).toMatchObject({ version: 1 })
  }, 60_000)

  it("ATQ-FORO-22: cuatro principales de alumnos distintos contra el borrado confirmado del admin: el borrado responde 204, cada principal 201 o 404 TAREA_NO_ENCONTRADA, nunca 500, y no queda ninguna participación ni entrega del foro", async () => {
    const e = await crearEscenarioDeForo(idsUsuarios, idsClases)
    const alumnos = [
      { token: e.tokenAlumno },
      { token: e.tokenOtroAlumno },
      await alumnoMas(e, "Alumna Carrera Uno"),
      await alumnoMas(e, "Alumno Carrera Dos"),
    ]
    for (let vuelta = 0; vuelta < 4; vuelta += 1) {
      const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
      const respuestas = await Promise.all([
        ...alumnos.map(({ token }) => participar(e, foroId, token)),
        pedir({
          method: "DELETE",
          url: `${urlForo(e.claseId, foroId)}?confirmar=entregas`,
          token: e.tokenAdmin,
        }),
      ])
      const borrado = respuestas.at(-1)
      expect(borrado?.statusCode, borrado?.body).toBe(204)
      for (const respuesta of respuestas.slice(0, -1)) {
        expect([201, 404], respuesta.body).toContain(respuesta.statusCode)
        if (respuesta.statusCode === 404) expect(codigoDe(respuesta)).toBe("TAREA_NO_ENCONTRADA")
      }
      expect(await obtenerDb().participacionForo.count({ where: { foroId } })).toBe(0)
      expect(await obtenerDb().entrega.count({ where: { tareaId: foroId } })).toBe(0)
    }
  }, 90_000)

  it("ATQ-FORO-23: dos calificaciones simultáneas de la misma principal con la misma versión: una 200 y una 409 ENTREGA_MODIFICADA con el texto del foro, una sola subida de versión y un solo CALIFICACION_PUBLICADA", async () => {
    const e = await crearEscenarioDeForo(idsUsuarios, idsClases)
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    expect((await participar(e, foroId, e.tokenAlumno)).statusCode).toBe(201)
    const url = `${urlForo(e.claseId, foroId)}/participantes/${e.alumno.id}/calificacion`
    const respuestas = await Promise.all(
      [6, 9].map((calificacion) =>
        pedir({
          method: "PUT",
          url,
          token: e.tokenMaestro,
          payload: { version: 1, puntosDeLaTarea: 10, puntajes: [], calificacion },
        }),
      ),
    )
    expect(respuestas.map((r) => r.statusCode).sort()).toEqual([200, 409])
    const rechazada = respuestas.find((r) => r.statusCode === 409)
    if (rechazada === undefined) throw new Error("Precondición: hay una rechazada")
    expect(codigoDe(rechazada)).toBe("ENTREGA_MODIFICADA")
    expect(rechazada.body).toContain("participación")
    expect(await leerEntregaDb(foroId, e.alumno.id)).toMatchObject({
      estado: "calificado",
      version: 2,
    })
    expect(await trabajosDeCalificacion(foroId)).toHaveLength(1)
  }, 60_000)

  it("ATQ-FORO-24: cerrar un foro vencido (aceptaTardias false) mientras publican tres alumnos: la edición responde 200 y cada principal es 201 con retraso o 409 FORO_CERRADO sin fila, nunca 500", async () => {
    const e = await crearEscenarioDeForo(idsUsuarios, idsClases)
    const tercero = await alumnoMas(e, "Alumno Cierre")
    const creado = await pedir({
      method: "POST",
      url: `/api/clases/${e.claseId}/foros`,
      token: e.tokenMaestro,
      payload: cuerpoDeForo(),
    })
    expect(creado.statusCode, creado.body).toBe(201)
    const foroId = (creado.json() as { foro: { id: string } }).foro.id
    const vencida = new Date(Date.now() - HORA_MS)
    await obtenerDb().tarea.update({
      where: { id: foroId },
      data: { fechaLimite: vencida },
      select: { id: true },
    })
    const respuestas = await Promise.all([
      pedir({
        method: "PUT",
        url: urlForo(e.claseId, foroId),
        token: e.tokenMaestro,
        payload: cuerpoDeForo({
          fechaLimite: vencida.toISOString(),
          aceptaTardias: false,
          version: 0,
        }),
      }),
      participar(e, foroId, e.tokenAlumno),
      participar(e, foroId, e.tokenOtroAlumno),
      participar(e, foroId, tercero.token),
    ])
    const [edicion, ...principales] = respuestas
    expect(edicion?.statusCode, edicion?.body).toBe(200)
    const autores = [e.alumno.id, e.otroAlumno.id, tercero.id]
    for (const [indice, respuesta] of principales.entries()) {
      const autor = autores[indice] ?? ""
      expect([201, 409], respuesta.body).toContain(respuesta.statusCode)
      const filas = await principalesDb(foroId, autor)
      if (respuesta.statusCode === 201) {
        expect(filas).toEqual([{ id: expect.any(String) as string, conRetraso: true }])
        continue
      }
      expect(codigoDe(respuesta)).toBe("FORO_CERRADO")
      expect(filas).toEqual([])
      expect(await leerEntregaDb(foroId, autor)).toBeNull()
    }
  }, 60_000)
})
