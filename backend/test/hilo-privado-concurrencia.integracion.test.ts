import { errorApiSchema } from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba, type UsuarioDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import {
  conFilaDeEntregasRetenida,
  contarEntregasDeTarea,
  crearEntregaDePrueba,
  leerEntregaDb,
  type Resultado,
} from "./ayudas-entregas.js"
import { crearTareaDePrueba } from "./ayudas-tareas.js"

// ENTREGAS-01c (PR-1C06; la parte de PR-1B22 bis que 01b no podía probar). Comentar y borrar la tarea
// a la vez, con una fila retenida (timeout explícito) y cada operación formada detrás de ella
// (formadasDetrasDe) antes de lanzar la siguiente. Nunca 500, P2003 ni deadlock.

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

interface Escenario {
  claseId: string
  tareaId: string
  alumno: UsuarioDePrueba
  tokens: { maestro: string; alumno: string; admin: string }
}

const escenario = async (): Promise<Escenario> => {
  const maestro = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: "Maestra Carrera",
    rol: "maestro",
  })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  const alumno = await crearAlumnoDePrueba(idsUsuarios, { nombre: "Alumna Carrera" })
  await inscribirDePrueba(clase.id, alumno.id)
  const tareaId = await crearTareaDePrueba({
    claseId: clase.id,
    autorId: maestro.id,
    fechaLimite: new Date(Date.now() + 48 * 60 * 60 * 1000),
  })
  return {
    claseId: clase.id,
    tareaId,
    alumno,
    tokens: {
      maestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
      alumno: await firmarTokenDePrueba({ usuarioId: alumno.id }),
      admin: await tokenDelAdminDePrueba(),
    },
  }
}

const pedir = (
  token: string,
  method: "POST" | "DELETE",
  url: string,
  payload?: InjectOptions["payload"],
): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method,
    url,
    ...(payload === undefined ? {} : { payload }),
    headers: { authorization: `Bearer ${token}` },
  })

const respuestaDe = (resultado: Resultado<LightMyRequestResponse> | undefined) => {
  if (resultado === undefined) throw new Error("Precondición: la operación se lanzó")
  if (!resultado.ok) throw new Error(`la petición rechazó: ${String(resultado.error)}`)
  expect(resultado.valor.statusCode, resultado.valor.body).toBeLessThan(500)
  return resultado.valor
}

const comentar =
  (e: Escenario, token = e.tokens.alumno, url?: string) =>
  () =>
    pedir(
      token,
      "POST",
      url ?? `/api/clases/${e.claseId}/tareas/${e.tareaId}/entrega/comentarios`,
      {
        texto: "Comentario en carrera",
      },
    )

const borrar =
  (e: Escenario, token: string, consulta = "") =>
  () =>
    pedir(token, "DELETE", `/api/clases/${e.claseId}/tareas/${e.tareaId}${consulta}`)

const comentariosDelAlumno = (alumnoId: string): Promise<number> =>
  obtenerDb().comentario.count({ where: { autorId: alumnoId } })

const trabajosDelHilo = async (claseId: string): Promise<number> =>
  (
    await obtenerDb().$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM pgboss.job
      WHERE name = 'COMENTARIO_CREADO' AND data ->> 'claseId' = ${claseId}::text`
  )[0]?.n ?? 0

describe("comentar y borrar la tarea a la vez (PR-1C06)", () => {
  it("PR-1C06: el borrado retiene la tarea y un comentario del alumno que llega espera y responde 404 TAREA_NO_ENCONTRADA, sin comentario, sin fila de entrega y sin trabajo", async () => {
    const e = await escenario()
    // La publicación retenida detiene al borrado después de tomar la fila de tareas (FOR UPDATE) y
    // antes de borrar la publicación: el comentario llega detrás del borrado.
    const [borrado, comentario] = await conFilaDeEntregasRetenida(
      { tabla: "publicaciones", id: e.tareaId },
      [borrar(e, e.tokens.maestro), comentar(e)],
    )

    expect(respuestaDe(borrado).statusCode).toBe(204)
    const rechazo = respuestaDe(comentario)
    expect(rechazo.statusCode).toBe(404)
    expect(errorApiSchema.parse(rechazo.json()).error.codigo).toBe("TAREA_NO_ENCONTRADA")
    expect(await contarEntregasDeTarea(e.tareaId)).toBe(0)
    expect(await comentariosDelAlumno(e.alumno.id)).toBe(0)
    expect(await trabajosDelHilo(e.claseId)).toBe(0)
  }, 60_000)

  it("PR-1C06: lo mismo con el comentario del maestro en el hilo del alumno y el borrado del admin con ?confirmar=entregas: 404 sin comentario ni fila", async () => {
    const e = await escenario()
    const [borrado, comentario] = await conFilaDeEntregasRetenida(
      { tabla: "publicaciones", id: e.tareaId },
      [
        borrar(e, e.tokens.admin, "?confirmar=entregas"),
        comentar(
          e,
          e.tokens.maestro,
          `/api/clases/${e.claseId}/tareas/${e.tareaId}/entregas/${e.alumno.id}/comentarios`,
        ),
      ],
    )

    expect(respuestaDe(borrado).statusCode).toBe(204)
    const rechazo = respuestaDe(comentario)
    expect(rechazo.statusCode).toBe(404)
    expect(errorApiSchema.parse(rechazo.json()).error.codigo).toBe("TAREA_NO_ENCONTRADA")
    expect(await contarEntregasDeTarea(e.tareaId)).toBe(0)
    expect(await trabajosDelHilo(e.claseId)).toBe(0)
  }, 60_000)

  it("PR-1C06: el comentario llega primero (retiene la tarea con su bloqueo de llave) y el borrado del maestro sin parámetro espera; al confirmar, el comentario responde 201 y el borrado 204, y el hilo se va con la tarea", async () => {
    const e = await escenario()
    // La fila de la entrega ya existe en asignado y queda retenida: el comentario toma la tarea y se
    // detiene al insertar (la llave foránea hacia esa fila); el borrado llega detrás de la tarea.
    const entregaId = await crearEntregaDePrueba({
      tareaId: e.tareaId,
      alumnoId: e.alumno.id,
      estado: "asignado",
      version: 0,
    })

    const [comentario, borrado] = await conFilaDeEntregasRetenida(
      { tabla: "entregas", id: entregaId },
      [comentar(e), borrar(e, e.tokens.maestro)],
    )

    expect(respuestaDe(comentario).statusCode).toBe(201)
    expect(respuestaDe(borrado).statusCode).toBe(204)
    expect(await obtenerDb().tarea.count({ where: { id: e.tareaId } })).toBe(0)
    expect(await leerEntregaDb(e.tareaId, e.alumno.id)).toBeNull()
    expect(await comentariosDelAlumno(e.alumno.id)).toBe(0)
  }, 60_000)

  it("PR-1C06: con una entrega realizada, el comentario primero y el borrado del maestro después responde 409 TAREA_CON_ENTREGAS, y el comentario y la entrega se conservan sin cambiar la versión", async () => {
    const e = await escenario()
    const entregaId = await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })

    const [comentario, borrado] = await conFilaDeEntregasRetenida(
      { tabla: "entregas", id: entregaId },
      [comentar(e), borrar(e, e.tokens.maestro)],
    )

    expect(respuestaDe(comentario).statusCode).toBe(201)
    const rechazo = respuestaDe(borrado)
    expect(rechazo.statusCode).toBe(409)
    expect(errorApiSchema.parse(rechazo.json()).error.codigo).toBe("TAREA_CON_ENTREGAS")
    expect(await leerEntregaDb(e.tareaId, e.alumno.id)).toMatchObject({
      estado: "entregado",
      version: 1,
    })
    expect(await comentariosDelAlumno(e.alumno.id)).toBe(1)
  }, 60_000)
})
