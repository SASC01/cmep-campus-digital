import { randomUUID } from "node:crypto"

import { errorApiSchema, solicitarSubidaRespuestaSchema } from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { entregar } from "../src/adapters/db/index.js"
import { MENSAJE_SERVICIO_OCUPADO } from "../src/adapters/db/errores.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { AppError } from "../src/core/errores.js"
import { crearAlmacenEnMemoria, type AlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba, type UsuarioDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
  leerArchivoDb,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import {
  archivosConfirmadosDeEntregasAsignadas,
  conFilaDeEntregasRetenida,
  contarEntregasDeTarea,
  crearArchivoDeEntregaDePrueba,
  crearEntregaDePrueba,
  leerEntregaDb,
  trabajosDeEntregaDeTarea,
  type Resultado,
} from "./ayudas-entregas.js"
import { crearTareaDePrueba } from "./ayudas-tareas.js"

// ENTREGAS-01b (§D-6; PR-1B09, PR-1B09 bis, PR-1B22 bis y PR-1B26). Cada carrera retiene una fila
// propia (conFilaDeEntregasRetenida, con timeout explícito), lanza las operaciones en un orden fijo y
// espera a que cada una quede formada detrás de esa fila (formadasDetrasDe) antes de la siguiente.
// Nunca un 500, un P2003 ni un deadlock.

let app: FastifyInstance | undefined
const almacen: AlmacenEnMemoria = crearAlmacenEnMemoria()
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen })
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
  alumno: UsuarioDePrueba
  tokens: { maestro: string; alumno: string; admin: string }
}

const escenario = async (): Promise<Escenario> => {
  const maestro = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: "Maestra Carreras",
    rol: "maestro",
  })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  const alumno = await crearAlumnoDePrueba(idsUsuarios, { nombre: "Alumna Carreras" })
  await inscribirDePrueba(clase.id, alumno.id)
  const tareaId = await crearTareaDePrueba({
    claseId: clase.id,
    autorId: maestro.id,
    fechaLimite: new Date(Date.now() + 48 * HORA_MS),
  })
  return {
    claseId: clase.id,
    tareaId,
    maestro,
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

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

const urlEntrega = (e: Escenario, resto = ""): string =>
  `/api/clases/${e.claseId}/tareas/${e.tareaId}/entrega${resto}`

const urlTarea = (e: Escenario, consulta = ""): string =>
  `/api/clases/${e.claseId}/tareas/${e.tareaId}${consulta}`

// Sube un archivo por la ruta del alumno y deja el objeto en el almacén.
const subir = async (e: Escenario, nombre: string): Promise<string> => {
  const respuesta = await pedir(e.tokens.alumno, "POST", urlEntrega(e, "/archivos"), {
    nombre,
    tipo: "application/pdf",
    tamano: 500,
  })
  expect(respuesta.statusCode, respuesta.body).toBe(201)
  const { archivo } = solicitarSubidaRespuestaSchema.parse(respuesta.json())
  const fila = await leerArchivoDb(archivo.id)
  if (fila === null) throw new Error("Precondición: la subida registró la fila")
  almacen.subir(fila.claveObjeto, { tamano: 500, tipo: "application/pdf" })
  return archivo.id
}

const respuestaDe = (resultado: Resultado<LightMyRequestResponse> | undefined) => {
  if (resultado === undefined) throw new Error("Precondición: la operación se lanzó")
  if (!resultado.ok) throw new Error(`la petición rechazó: ${String(resultado.error)}`)
  expect(resultado.valor.statusCode, resultado.valor.body).toBeLessThan(500)
  return resultado.valor
}

const entregarApi = (e: Escenario, cuerpo: InjectOptions["payload"]) => () =>
  pedir(e.tokens.alumno, "POST", urlEntrega(e), cuerpo)

const anularApi = (e: Escenario) => () => pedir(e.tokens.alumno, "POST", urlEntrega(e, "/anular"))

const idDeEntrega = async (e: Escenario): Promise<string> => {
  const fila = await leerEntregaDb(e.tareaId, e.alumno.id)
  if (fila === null) throw new Error("Precondición: existe la fila de la entrega")
  return fila.id
}

describe("dos entregas del mismo alumno con la fila retenida (PR-1B09)", () => {
  it("PR-1B09: con la fila de la entrega retenida, dos entregas quedan en serie: un 200 y un 409 ENTREGA_YA_REALIZADA, una sola fila, un solo trabajo y solo los archivos de la primera confirmados", async () => {
    const e = await escenario()
    await crearEntregaDePrueba({
      tareaId: e.tareaId,
      alumnoId: e.alumno.id,
      estado: "asignado",
      version: 0,
    })
    const a = await subir(e, "a.pdf")
    const b = await subir(e, "b.pdf")

    const [primera, segunda] = await conFilaDeEntregasRetenida(
      { tabla: "entregas", id: await idDeEntrega(e) },
      [entregarApi(e, { archivoIds: [a] }), entregarApi(e, { archivoIds: [b] })],
    )

    expect(respuestaDe(primera).statusCode).toBe(200)
    const perdedora = respuestaDe(segunda)
    expect(perdedora.statusCode).toBe(409)
    expect(codigoDe(perdedora)).toBe("ENTREGA_YA_REALIZADA")
    expect(await contarEntregasDeTarea(e.tareaId)).toBe(1)
    expect(await leerEntregaDb(e.tareaId, e.alumno.id)).toMatchObject({
      estado: "entregado",
      version: 1,
    })
    expect(await trabajosDeEntregaDeTarea(e.tareaId)).toHaveLength(1)
    expect((await leerArchivoDb(a))?.estado).toBe("confirmado")
    expect((await leerArchivoDb(b))?.estado).toBe("pendiente")
  }, 60_000)
})

describe("entregar contra anular a la vez (PR-1B09 bis)", () => {
  // Las invariantes de todos los órdenes: ningún archivo confirmado de una entrega en asignado, la
  // versión final y un ENTREGA_REALIZADA por cada entrega con éxito, con su versión.
  const invariantes = async (
    e: Escenario,
    { version, eventos }: { version: number; eventos: number[] },
  ): Promise<void> => {
    expect(await archivosConfirmadosDeEntregasAsignadas(e.tareaId)).toBe(0)
    expect((await leerEntregaDb(e.tareaId, e.alumno.id))?.version).toBe(version)
    expect((await trabajosDeEntregaDeTarea(e.tareaId)).map((t) => t.datos.version)).toEqual(eventos)
  }

  // Parte de una entrega `entregado` hecha por la API (versión 1, con su ENTREGA_REALIZADA).
  const desdeEntregado = async (): Promise<Escenario> => {
    const e = await escenario()
    const archivo = await subir(e, "primera.pdf")
    const respuesta = await entregarApi(e, { archivoIds: [archivo] })()
    expect(respuesta.statusCode, respuesta.body).toBe(200)
    return e
  }

  it("PR-1B09 bis (a): desde entregado, si pasa primero la anulación, la entrega posterior también pasa (versión v + 2, sus archivos confirmados y un ENTREGA_REALIZADA nuevo con esa versión)", async () => {
    const e = await desdeEntregado()
    const nuevo = await crearArchivoDeEntregaDePrueba({
      claseId: e.claseId,
      tareaId: e.tareaId,
      alumnoId: e.alumno.id,
    })
    almacen.subir(nuevo.claveObjeto, { tamano: nuevo.tamano, tipo: nuevo.tipo })

    const [anulacion, entrega] = await conFilaDeEntregasRetenida(
      { tabla: "entregas", id: await idDeEntrega(e) },
      [anularApi(e), entregarApi(e, { archivoIds: [nuevo.id] })],
    )

    expect(respuestaDe(anulacion).statusCode).toBe(200)
    expect(respuestaDe(entrega).statusCode).toBe(200)
    expect(await leerEntregaDb(e.tareaId, e.alumno.id)).toMatchObject({ estado: "entregado" })
    expect(await leerArchivoDb(nuevo.id)).toMatchObject({
      estado: "confirmado",
      entregaId: await idDeEntrega(e),
    })
    await invariantes(e, { version: 3, eventos: [1, 3] })
  }, 60_000)

  it("PR-1B09 bis (a): desde entregado, si pasa primero la entrega, recibe 409 ENTREGA_YA_REALIZADA y la anulación deja asignado con versión v + 1", async () => {
    const e = await desdeEntregado()
    const nuevo = await crearArchivoDeEntregaDePrueba({
      claseId: e.claseId,
      tareaId: e.tareaId,
      alumnoId: e.alumno.id,
    })
    almacen.subir(nuevo.claveObjeto, { tamano: nuevo.tamano, tipo: nuevo.tipo })

    const [entrega, anulacion] = await conFilaDeEntregasRetenida(
      { tabla: "entregas", id: await idDeEntrega(e) },
      [entregarApi(e, { archivoIds: [nuevo.id] }), anularApi(e)],
    )

    const rechazada = respuestaDe(entrega)
    expect(rechazada.statusCode).toBe(409)
    expect(codigoDe(rechazada)).toBe("ENTREGA_YA_REALIZADA")
    expect(respuestaDe(anulacion).statusCode).toBe(200)
    expect(await leerEntregaDb(e.tareaId, e.alumno.id)).toMatchObject({ estado: "asignado" })
    expect(await leerArchivoDb(nuevo.id)).toMatchObject({ estado: "pendiente", entregaId: null })
    await invariantes(e, { version: 2, eventos: [1] })
  }, 60_000)

  it("PR-1B09 bis (b): desde asignado, con la entrega primero y la anulación detrás, la anulación espera y anula lo entregado (versión + 2)", async () => {
    const e = await escenario()
    await crearEntregaDePrueba({
      tareaId: e.tareaId,
      alumnoId: e.alumno.id,
      estado: "asignado",
      version: 4,
    })
    const archivo = await subir(e, "nuevo.pdf")

    const [entrega, anulacion] = await conFilaDeEntregasRetenida(
      { tabla: "entregas", id: await idDeEntrega(e) },
      [entregarApi(e, { archivoIds: [archivo] }), anularApi(e)],
    )

    expect(respuestaDe(entrega).statusCode).toBe(200)
    expect(respuestaDe(anulacion).statusCode).toBe(200)
    expect(await leerEntregaDb(e.tareaId, e.alumno.id)).toMatchObject({ estado: "asignado" })
    expect(await leerArchivoDb(archivo)).toMatchObject({ estado: "descartado", entregaId: null })
    await invariantes(e, { version: 6, eventos: [5] })
  }, 60_000)

  it("PR-1B09 bis (b): desde asignado, si la anulación llega antes, recibe 409 ENTREGA_NO_REALIZADA y la entrega pasa (versión + 1)", async () => {
    const e = await escenario()
    await crearEntregaDePrueba({
      tareaId: e.tareaId,
      alumnoId: e.alumno.id,
      estado: "asignado",
      version: 4,
    })
    const archivo = await subir(e, "nuevo.pdf")

    const [anulacion, entrega] = await conFilaDeEntregasRetenida(
      { tabla: "entregas", id: await idDeEntrega(e) },
      [anularApi(e), entregarApi(e, { archivoIds: [archivo] })],
    )

    const rechazada = respuestaDe(anulacion)
    expect(rechazada.statusCode).toBe(409)
    expect(codigoDe(rechazada)).toBe("ENTREGA_NO_REALIZADA")
    expect(respuestaDe(entrega).statusCode).toBe(200)
    expect(await leerArchivoDb(archivo)).toMatchObject({ estado: "confirmado" })
    await invariantes(e, { version: 5, eventos: [5] })
  }, 60_000)
})

describe("carreras del borrado de una tarea con entregas (PR-1B22 bis)", () => {
  it("PR-1B22 bis (a): una entrega en curso retiene la tarea y el borrado del maestro sin parámetro espera y, al confirmar la entrega, responde 409 con un conteo que la incluye; nada se borra", async () => {
    const e = await escenario()
    await crearEntregaDePrueba({
      tareaId: e.tareaId,
      alumnoId: e.alumno.id,
      estado: "asignado",
      version: 0,
    })

    const [entrega, borrado] = await conFilaDeEntregasRetenida(
      { tabla: "entregas", id: await idDeEntrega(e) },
      [
        entregarApi(e, { enlaces: ["https://ejemplo.com/"] }),
        () => pedir(e.tokens.maestro, "DELETE", urlTarea(e)),
      ],
    )

    expect(respuestaDe(entrega).statusCode).toBe(200)
    const rechazo = respuestaDe(borrado)
    expect(rechazo.statusCode).toBe(409)
    expect(codigoDe(rechazo)).toBe("TAREA_CON_ENTREGAS")
    expect(errorApiSchema.parse(rechazo.json()).error.mensaje).toBe(
      "Esta tarea tiene 1 alumno con entrega o calificación y no se puede borrar. Si de verdad hay que borrarla, pídelo a administración.",
    )
    expect(await obtenerDb().tarea.count({ where: { id: e.tareaId } })).toBe(1)
    expect(await leerEntregaDb(e.tareaId, e.alumno.id)).toMatchObject({ estado: "entregado" })
  }, 60_000)

  it("PR-1B22 bis (b): el borrado del admin con el parámetro retiene la tarea y una entrega que llega espera y responde 404 TAREA_NO_ENCONTRADA, sin fila de entrega, sin archivo confirmado y sin ENTREGA_REALIZADA", async () => {
    const e = await escenario()
    const archivo = await subir(e, "tarde.pdf")

    // La publicación retenida detiene al borrado después de tomar la fila de tareas (FOR UPDATE) y
    // antes de borrar la publicación: la entrega llega detrás del borrado.
    const [borrado, entrega] = await conFilaDeEntregasRetenida(
      { tabla: "publicaciones", id: e.tareaId },
      [
        () => pedir(e.tokens.admin, "DELETE", urlTarea(e, "?confirmar=entregas")),
        entregarApi(e, { archivoIds: [archivo] }),
      ],
    )

    expect(respuestaDe(borrado).statusCode).toBe(204)
    const rechazo = respuestaDe(entrega)
    expect(rechazo.statusCode).toBe(404)
    expect(codigoDe(rechazo)).toBe("TAREA_NO_ENCONTRADA")
    expect(await contarEntregasDeTarea(e.tareaId)).toBe(0)
    expect(await leerArchivoDb(archivo)).toMatchObject({ estado: "pendiente", entregaId: null })
    expect(await trabajosDeEntregaDeTarea(e.tareaId)).toEqual([])
  }, 60_000)

  it("PR-1B22 bis (b): con el borrado retenido, una anulación que llega espera y responde 404 TAREA_NO_ENCONTRADA, sin 500 por la llave foránea de los archivos", async () => {
    const e = await escenario()
    const archivo = await subir(e, "entregado.pdf")
    expect((await entregarApi(e, { archivoIds: [archivo] })()).statusCode).toBe(200)

    const [borrado, anulacion] = await conFilaDeEntregasRetenida(
      { tabla: "publicaciones", id: e.tareaId },
      [() => pedir(e.tokens.admin, "DELETE", urlTarea(e, "?confirmar=entregas")), anularApi(e)],
    )

    expect(respuestaDe(borrado).statusCode).toBe(204)
    const rechazo = respuestaDe(anulacion)
    expect(rechazo.statusCode).toBe(404)
    expect(codigoDe(rechazo)).toBe("TAREA_NO_ENCONTRADA")
    expect(await contarEntregasDeTarea(e.tareaId)).toBe(0)
    expect(await leerArchivoDb(archivo)).toMatchObject({ estado: "descartado", entregaId: null })
  }, 60_000)

  it("PR-1B22 bis (c): un comentario privado en curso (fabricado: toma la tarea con bloqueo de llave compartida y deja una fila asignado con su comentario) hace esperar al borrado del maestro, que después responde 204 y se lleva el hilo", async () => {
    const e = await escenario()
    const comentarioId = randomUUID()

    const [borrado] = await conFilaDeEntregasRetenida(
      { tabla: "tareas", id: e.tareaId, modo: "FOR KEY SHARE" },
      [() => pedir(e.tokens.maestro, "DELETE", urlTarea(e))],
      {
        // Lo que hará comentar en 01c, dentro de la retenedora: la fila perezosa y el comentario.
        alRetener: async (tx) => {
          await tx.$executeRaw`
            INSERT INTO entregas (tarea_id, alumno_id)
            VALUES (${e.tareaId}::uuid, ${e.alumno.id}::uuid)
            ON CONFLICT (tarea_id, alumno_id) DO NOTHING`
          await tx.$executeRaw`
            INSERT INTO comentarios (id, entrega_id, autor_id, texto)
            SELECT ${comentarioId}::uuid, id, ${e.alumno.id}::uuid, 'Comentario privado'
            FROM entregas WHERE tarea_id = ${e.tareaId}::uuid AND alumno_id = ${e.alumno.id}::uuid`
        },
      },
    )

    expect(respuestaDe(borrado).statusCode).toBe(204)
    expect(await obtenerDb().tarea.count({ where: { id: e.tareaId } })).toBe(0)
    expect(await contarEntregasDeTarea(e.tareaId)).toBe(0)
    expect(await obtenerDb().comentario.count({ where: { id: comentarioId } })).toBe(0)
  }, 60_000)

  it("PR-1B22 bis (d): una anulación que confirma antes del borrado del maestro deja el conteo en 0 y el borrado pasa con 204", async () => {
    const e = await escenario()
    const archivo = await subir(e, "anulada.pdf")
    expect((await entregarApi(e, { archivoIds: [archivo] })()).statusCode).toBe(200)

    const [anulacion, borrado] = await conFilaDeEntregasRetenida(
      { tabla: "entregas", id: await idDeEntrega(e) },
      [anularApi(e), () => pedir(e.tokens.maestro, "DELETE", urlTarea(e))],
    )

    expect(respuestaDe(anulacion).statusCode).toBe(200)
    expect(respuestaDe(borrado).statusCode).toBe(204)
    expect(await obtenerDb().tarea.count({ where: { id: e.tareaId } })).toBe(0)
    expect(await contarEntregasDeTarea(e.tareaId)).toBe(0)
    expect(await leerArchivoDb(archivo)).toMatchObject({ estado: "descartado", entregaId: null })
  }, 60_000)
})

describe("P2028 dentro de entregar (PR-1B26)", () => {
  it("PR-1B26: con la fila de la entrega retenida más que el timeout de la transacción, entregar rechaza con 503 SERVICIO_OCUPADO y no escribe nada", async () => {
    const e = await escenario()
    await crearEntregaDePrueba({
      tareaId: e.tareaId,
      alumnoId: e.alumno.id,
      estado: "asignado",
      version: 0,
    })
    const archivo = await crearArchivoDeEntregaDePrueba({
      claseId: e.claseId,
      tareaId: e.tareaId,
      alumnoId: e.alumno.id,
    })
    const fila = await leerArchivoDb(archivo.id)
    if (fila === null) throw new Error("Precondición: existe el archivo pendiente")
    let encolados = 0

    // Se llama al adaptador (sin la ruta), así la prueba no deja una línea de registro de P2028 más.
    const [resultado] = await conFilaDeEntregasRetenida(
      { tabla: "entregas", id: await idDeEntrega(e) },
      [
        () =>
          entregar(
            {
              claseId: e.claseId,
              tareaId: e.tareaId,
              alumnoId: e.alumno.id,
              ahora: new Date(),
              archivos: [fila],
              enlaces: ["https://ejemplo.com/"],
            },
            () => {
              encolados += 1
              return Promise.resolve()
            },
          ),
      ],
      { antesDeSoltar: () => new Promise((resolver) => setTimeout(resolver, 5_500)) },
    )

    if (resultado === undefined) throw new Error("Precondición: la operación se lanzó")
    expect(resultado.ok).toBe(false)
    const error = resultado.ok ? null : resultado.error
    expect(error).toBeInstanceOf(AppError)
    expect(error).toMatchObject({
      codigo: "SERVICIO_OCUPADO",
      estado: 503,
      message: MENSAJE_SERVICIO_OCUPADO,
    })
    expect(encolados).toBe(0)
    expect(await leerEntregaDb(e.tareaId, e.alumno.id)).toMatchObject({
      estado: "asignado",
      version: 0,
    })
    expect(await leerArchivoDb(archivo.id)).toMatchObject({ estado: "pendiente", entregaId: null })
    expect(await trabajosDeEntregaDeTarea(e.tareaId)).toEqual([])
  }, 60_000)
})
