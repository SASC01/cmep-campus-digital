import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { errorApiSchema, tareaRespuestaSchema } from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { COLA_RECORDATORIO_24H } from "../src/core/eventos/avisos-de-clase.js"
import { crearAlmacenEnMemoria, type AlmacenEnMemoria } from "./almacen-en-memoria.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  crearPublicacionDePrueba,
  inscribirDePrueba,
  leerArchivoDb,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { formadasDetrasDe } from "./ayudas-concurrencia.js"
import {
  crearCategoriaDePrueba,
  crearTemaDePrueba,
  cuerpoDeTarea,
  diasDespues,
  leerTareaDb,
  trabajosDeTarea,
} from "./ayudas-tareas.js"

// Ataques del Tester, ENTREGAS-01a ronda 1: la versión de una tarea como precondición del PUT
// (P-05 a′, §D-2.1), mover de tema sube la versión (§D-2.3), el orden de bloqueo (§D-0.6) y "Cómo se
// entrega" (requiereAdjuntos, P-03 a). Las fechas límite llevan días de margen respecto de la hora
// real (preámbulo de "Pruebas requeridas" del plan); ninguna compara textos relativos al día.

const almacen: AlmacenEnMemoria = crearAlmacenEnMemoria()
let app: FastifyInstance | undefined
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

interface Escenario {
  claseId: string
  otraClaseId: string
  maestroA: UsuarioDePrueba
  maestroB: UsuarioDePrueba
  tokenA: string
  tokenB: string
  tokenAlumno: string
  tokenAdmin: string
}

const escenario = async (): Promise<Escenario> => {
  const maestroA = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Maestra A" })
  const maestroB = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Maestro B" })
  const alumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumna R1" })
  const clase = await crearClaseDePrueba(idsClases, {
    maestroId: maestroA.id,
    maestroIds: [maestroA.id, maestroB.id],
  })
  const otra = await crearClaseDePrueba(idsClases, { maestroId: maestroA.id })
  await inscribirDePrueba(clase.id, alumno.id, "codigo")
  return {
    claseId: clase.id,
    otraClaseId: otra.id,
    maestroA,
    maestroB,
    tokenA: await firmarTokenDePrueba({ usuarioId: maestroA.id }),
    tokenB: await firmarTokenDePrueba({ usuarioId: maestroB.id }),
    tokenAlumno: await firmarTokenDePrueba({ usuarioId: alumno.id }),
    tokenAdmin: await tokenDelAdminDePrueba(),
  }
}

type Metodo = "GET" | "POST" | "PUT" | "DELETE"

const peticion = (opciones: {
  method: Metodo
  url: string
  token: string
  payload?: InjectOptions["payload"]
}): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method: opciones.method,
    url: opciones.url,
    ...(opciones.payload === undefined ? {} : { payload: opciones.payload }),
    headers: {
      authorization: `Bearer ${opciones.token}`,
      ...(opciones.payload === undefined ? {} : { "content-type": "application/json" }),
    },
  })

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

const resultado = (r: LightMyRequestResponse): string =>
  r.statusCode < 400 ? String(r.statusCode) : `${String(r.statusCode)} ${codigoDe(r)}`

const urlTareas = (claseId: string): string => `/api/clases/${claseId}/tareas`
const urlTarea = (claseId: string, id: string): string => `${urlTareas(claseId)}/${id}`
const urlMover = (claseId: string, id: string): string =>
  `/api/clases/${claseId}/publicaciones/${id}/tema`

const detalleDe = (respuesta: LightMyRequestResponse) => {
  expect(respuesta.statusCode, respuesta.body).toBeLessThan(300)
  return tareaRespuestaSchema.parse(respuesta.json()).tarea
}

const crear = async (e: Escenario, cambios: Record<string, unknown> = {}, token = e.tokenA) =>
  detalleDe(
    await peticion({
      method: "POST",
      url: urlTareas(e.claseId),
      token,
      payload: cuerpoDeTarea(cambios),
    }),
  )

const editar = (
  e: Escenario,
  id: string,
  cambios: Record<string, unknown>,
  token = e.tokenA,
  claseId = e.claseId,
) => peticion({ method: "PUT", url: urlTarea(claseId, id), token, payload: cuerpoDeTarea(cambios) })

const leer = (e: Escenario, id: string, token = e.tokenA) =>
  peticion({ method: "GET", url: urlTarea(e.claseId, id), token })

const mover = (e: Escenario, id: string, temaId: string | null, token = e.tokenA) =>
  peticion({ method: "PUT", url: urlMover(e.claseId, id), token, payload: { temaId } })

const borrar = (e: Escenario, id: string, token = e.tokenA) =>
  peticion({ method: "DELETE", url: urlTarea(e.claseId, id), token })

const versionEnLaBase = async (id: string): Promise<number> => {
  const fila = await leerTareaDb(id)
  if (!fila) throw new Error(`Precondición: la tarea ${id} existe en la base`)
  return fila.version
}

const archivoSubido = async (e: Escenario) => {
  const archivo = await crearArchivoDePrueba({ claseId: e.claseId, subidoPor: e.maestroA.id })
  almacen.subir(archivo.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
  return archivo
}

// Cuerpo JSON crudo con un literal de `version` escrito tal cual (para `1.0`, `1e0`, `-0`, `1e400`…,
// que JSON.stringify normalizaría).
const cuerpoConVersionLiteral = (literal: string): string => {
  const base = JSON.stringify(cuerpoDeTarea({ titulo: `Versión ${literal}` }))
  return `${base.slice(0, -1)},"version":${literal}}`
}

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

// Retiene la fila de `tareas` con FOR UPDATE y lanza las operaciones en orden fijo: cada una se da por
// formada solo cuando espera esa fila (formadasDetrasDe, CHORE-02). Sin LOCK TABLE. El timeout de la
// transacción (30 s) es mayor que su espera más larga (10 s por operación).
const conTareaRetenida = async (
  tareaId: string,
  operaciones: readonly (() => Promise<LightMyRequestResponse>)[],
): Promise<LightMyRequestResponse[]> => {
  const lanzadas: Promise<LightMyRequestResponse>[] = []
  await obtenerDb().$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM tareas WHERE id = ${tareaId}::uuid FOR UPDATE`
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
          formada,
          `Precondición: la operación ${String(indice + 1)} no se formó detrás de la tarea retenida en 10 s`,
        ).toBe(true)
      }
      await esperar(100)
    },
    { timeout: 30_000, maxWait: 5_000 },
  )
  return Promise.all(lanzadas)
}

describe("ataque ENTREGAS-01a r1: la versión manipulada", () => {
  it("la versión de otra tarea de la misma clase (que sí existe y es mayor) responde 409 y no cambia nada", async () => {
    const e = await escenario()
    const uno = await crear(e, { titulo: "Uno" })
    const dos = await crear(e, { titulo: "Dos" })
    for (const v of [0, 1]) {
      expect(resultado(await editar(e, dos.id, { titulo: `Dos ${String(v)}`, version: v }))).toBe(
        "200",
      )
    }
    expect(await versionEnLaBase(dos.id)).toBe(2)
    const r = await editar(e, uno.id, { titulo: "Uno con la de dos", version: 2 })
    expect(resultado(r)).toBe("409 TAREA_MODIFICADA")
    expect(detalleDe(await leer(e, uno.id))).toMatchObject({ titulo: "Uno", version: 0 })
  })

  it("literales de version: 1.0 y 1e0 valen 1, -0 vale 0; texto, decimal, booleano, lista, objeto, null, 1e400 y 2^53 dan 400 VALIDACION; nunca 500", async () => {
    const e = await escenario()
    const enCero = await crear(e)
    const pedirCrudo = (id: string, literal: string) =>
      peticion({
        method: "PUT",
        url: urlTarea(e.claseId, id),
        token: e.tokenA,
        payload: cuerpoConVersionLiteral(literal),
      })

    expect(resultado(await pedirCrudo(enCero.id, "-0"))).toBe("200")
    expect(await versionEnLaBase(enCero.id)).toBe(1)
    expect(resultado(await pedirCrudo(enCero.id, "1.0"))).toBe("200")
    expect(resultado(await pedirCrudo(enCero.id, "2e0"))).toBe("200")
    expect(await versionEnLaBase(enCero.id)).toBe(3)

    const fallas: string[] = []
    for (const literal of [
      '"3"',
      "3.5",
      "true",
      "[3]",
      '{"v":3}',
      "null",
      "1e400",
      "-1",
      "9007199254740992",
      "9007199254740993",
    ]) {
      const r = await pedirCrudo(enCero.id, literal)
      if (resultado(r) !== "400 VALIDACION") fallas.push(`${literal}: ${resultado(r)} ${r.body}`)
    }
    expect(fallas).toEqual([])
    expect(await versionEnLaBase(enCero.id)).toBe(3)
  })

  it("T-r1-1: una version entre 2^31 y MAX_SAFE_INTEGER pasa el esquema y responde 409 TAREA_MODIFICADA, nunca 500, sin escribir", async () => {
    const e = await escenario()
    const tarea = await crear(e)
    const fallas: string[] = []
    for (const v of [2 ** 31 - 1, 2 ** 31, 2 ** 32, Number.MAX_SAFE_INTEGER]) {
      const r = await editar(e, tarea.id, { titulo: `Gigante ${String(v)}`, version: v })
      if (resultado(r) !== "409 TAREA_MODIFICADA") fallas.push(`${String(v)}: ${resultado(r)}`)
    }
    expect(fallas).toEqual([])
    expect(detalleDe(await leer(e, tarea.id))).toMatchObject({
      titulo: "Ensayo del tema 3",
      version: 0,
    })
  })

  it("dos pestañas del mismo autor: la segunda en guardar recibe 409; tras releer guarda con la versión nueva y no pisa lo de la primera sin verlo", async () => {
    const e = await escenario()
    const tarea = await crear(e)
    const pestana1 = detalleDe(await leer(e, tarea.id)).version
    const pestana2 = detalleDe(await leer(e, tarea.id)).version
    expect(resultado(await editar(e, tarea.id, { titulo: "Pestaña 1", version: pestana1 }))).toBe(
      "200",
    )
    expect(resultado(await editar(e, tarea.id, { titulo: "Pestaña 2", version: pestana2 }))).toBe(
      "409 TAREA_MODIFICADA",
    )
    const releida = detalleDe(await leer(e, tarea.id))
    expect(releida).toMatchObject({ titulo: "Pestaña 1", version: 1 })
    expect(
      resultado(await editar(e, tarea.id, { titulo: "Pestaña 2", version: releida.version })),
    ).toBe("200")
    expect(detalleDe(await leer(e, tarea.id))).toMatchObject({ titulo: "Pestaña 2", version: 2 })
  })

  it("maestro de reemplazo (P-04 b) contra el autor que salió: B edita con A fuera; A vuelve con la versión vieja y recibe 409; B con A de vuelta recibe 403 aunque traiga la versión vigente", async () => {
    const e = await escenario()
    const tarea = await crear(e)
    await obtenerDb().maestroDeClase.delete({
      where: { claseId_maestroId: { claseId: e.claseId, maestroId: e.maestroA.id } },
    })
    expect(resultado(await editar(e, tarea.id, { titulo: "De B", version: 0 }, e.tokenB))).toBe(
      "200",
    )
    await obtenerDb().maestroDeClase.create({
      data: { claseId: e.claseId, maestroId: e.maestroA.id },
    })
    expect(resultado(await editar(e, tarea.id, { titulo: "De A, vieja", version: 0 }))).toBe(
      "409 TAREA_MODIFICADA",
    )
    expect(
      resultado(await editar(e, tarea.id, { titulo: "De B otra vez", version: 1 }, e.tokenB)),
    ).toBe("403 EDICION_NO_PERMITIDA")
    expect(detalleDe(await leer(e, tarea.id))).toMatchObject({ titulo: "De B", version: 1 })
  })

  it("la tarea de otra clase con la versión correcta: 404 TAREA_NO_ENCONTRADA por la URL de la clase equivocada, y la tarea no cambia", async () => {
    const e = await escenario()
    const tarea = await crear(e)
    const r = await editar(
      e,
      tarea.id,
      { titulo: "Por otra clase", version: 0 },
      e.tokenA,
      e.otraClaseId,
    )
    expect(resultado(r)).toBe("404 TAREA_NO_ENCONTRADA")
    expect(await versionEnLaBase(tarea.id)).toBe(0)
  })
})

describe("ataque ENTREGAS-01a r1: un 409 no deja nada a medias", () => {
  it("con la versión vieja y todo cambiado (título, texto, fecha, puntos, banderas, categoría, tema, rúbrica, adjuntos): 409 y la tarea, sus criterios, sus archivos y la cola quedan como los dejó la edición que ganó", async () => {
    const e = await escenario()
    const c1 = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "C1", peso: 60 })
    const c2 = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "C2", peso: 40 })
    const t1 = await crearTemaDePrueba({ claseId: e.claseId, nombre: "T1" })
    const t2 = await crearTemaDePrueba({ claseId: e.claseId, nombre: "T2" })
    const x = await archivoSubido(e)
    const base = {
      titulo: "Original",
      instrucciones: "Texto original",
      fechaLimite: diasDespues(5).toISOString(),
      puntos: 100,
      aceptaTardias: true,
      requiereAdjuntos: true,
      categoriaId: c1.id,
      temaId: t1.id,
      rubrica: [
        { criterio: "R1", puntosMax: 5 },
        { criterio: "R2", puntosMax: 5 },
      ],
      archivoIds: [x.id],
    }
    const tarea = await crear(e, base)
    // Otra pestaña gana: solo cambia el título (conserva la rúbrica, que se reemplaza con ids nuevos).
    const ganadora = detalleDe(
      await editar(e, tarea.id, { ...base, titulo: "Ganadora", version: 0 }),
    )
    const filaAntes = await leerTareaDb(tarea.id)
    const criteriosAntes = await obtenerDb().criterioRubrica.findMany({
      where: { tareaId: tarea.id },
      orderBy: { orden: "asc" },
    })
    const trabajosAntes = await obtenerDb().$queryRaw<
      { id: string; name: string; state: string }[]
    >`
      SELECT id::text AS id, name, state::text AS state FROM pgboss.job
      WHERE data ->> 'tareaId' = ${tarea.id}::text ORDER BY created_on, id`
    const publicacionAntes = await obtenerDb().publicacion.findUnique({ where: { id: tarea.id } })
    const y = await archivoSubido(e)

    const r = await editar(e, tarea.id, {
      titulo: "Perdedora",
      instrucciones: "Texto perdedor",
      fechaLimite: diasDespues(9).toISOString(),
      puntos: 50,
      aceptaTardias: false,
      requiereAdjuntos: false,
      categoriaId: c2.id,
      temaId: t2.id,
      rubrica: [{ criterio: "Otra", puntosMax: 50 }],
      archivoIds: [y.id],
      version: 0,
    })
    expect(resultado(r)).toBe("409 TAREA_MODIFICADA")

    expect(await leerTareaDb(tarea.id)).toEqual(filaAntes)
    expect(await obtenerDb().publicacion.findUnique({ where: { id: tarea.id } })).toEqual(
      publicacionAntes,
    )
    expect(
      await obtenerDb().criterioRubrica.findMany({
        where: { tareaId: tarea.id },
        orderBy: { orden: "asc" },
      }),
    ).toEqual(criteriosAntes)
    const filaX = await leerArchivoDb(x.id)
    const filaY = await leerArchivoDb(y.id)
    expect([filaX?.estado, filaX?.publicacionId, filaY?.estado, filaY?.publicacionId]).toEqual([
      "confirmado",
      tarea.id,
      "pendiente",
      null,
    ])
    expect(
      await obtenerDb().$queryRaw<{ id: string; name: string; state: string }[]>`
        SELECT id::text AS id, name, state::text AS state FROM pgboss.job
        WHERE data ->> 'tareaId' = ${tarea.id}::text ORDER BY created_on, id`,
    ).toEqual(trabajosAntes)
    expect(detalleDe(await leer(e, tarea.id))).toMatchObject({
      titulo: "Ganadora",
      version: 1,
      requiereAdjuntos: true,
      rubrica: ganadora.rubrica,
    })
  })

  it("el cuerpo del 409 es solo { error: { codigo, mensaje } } con el mensaje de §D-7 (sin versión, autor, correo ni estado de pago)", async () => {
    const e = await escenario()
    const tarea = await crear(e)
    expect(resultado(await editar(e, tarea.id, { version: 0 }))).toBe("200")
    const r = await editar(e, tarea.id, { version: 0 })
    expect(r.statusCode).toBe(409)
    expect(r.json()).toStrictEqual({
      error: {
        codigo: "TAREA_MODIFICADA",
        mensaje:
          "Otra persona guardó cambios en esta tarea mientras la editabas. Tus cambios no se guardaron: vuelve a hacerlos sobre la versión actual.",
      },
    })
  })
})

describe("ataque ENTREGAS-01a r1: los caminos de moverATema (T-r1-3)", () => {
  it("mover a un tema inexistente, a uno ya borrado o a uno de otra clase: 404 TEMA_NO_ENCONTRADO y la versión no sube; el PUT con la versión de siempre sigue en 200", async () => {
    const e = await escenario()
    const tarea = await crear(e)
    const borrado = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Se borra" })
    expect(
      (
        await peticion({
          method: "DELETE",
          url: `/api/clases/${e.claseId}/temas/${borrado.id}`,
          token: e.tokenA,
        })
      ).statusCode,
    ).toBe(204)
    const ajeno = await crearTemaDePrueba({ claseId: e.otraClaseId, nombre: "Ajeno" })
    const fallas: string[] = []
    for (const [etiqueta, temaId] of [
      ["inexistente", randomUUID()],
      ["borrado", borrado.id],
      ["de otra clase", ajeno.id],
    ] as const) {
      const r = await mover(e, tarea.id, temaId)
      if (resultado(r) !== "404 TEMA_NO_ENCONTRADO") fallas.push(`${etiqueta}: ${resultado(r)}`)
    }
    expect(fallas).toEqual([])
    expect(await versionEnLaBase(tarea.id)).toBe(0)
    expect(resultado(await editar(e, tarea.id, { titulo: "Sigue en cero", version: 0 }))).toBe(
      "200",
    )
  })

  it("mover un anuncio (409) o una publicación de otra clase con el id de una tarea (404) no toca ninguna fila de tareas", async () => {
    const e = await escenario()
    const tarea = await crear(e)
    const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad" })
    const anuncio = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestroA.id })
    const otro = await escenario()
    const ajena = await crear(otro)
    const filas = () =>
      obtenerDb().tarea.findMany({
        where: { id: { in: [tarea.id, ajena.id] } },
        select: { id: true, version: true, actualizadoEn: true },
        orderBy: { id: "asc" },
      })
    const antes = await filas()
    expect(resultado(await mover(e, anuncio, tema.id))).toBe("409 ANUNCIO_SIN_TEMA")
    expect(resultado(await mover(e, ajena.id, tema.id))).toBe("404 PUBLICACION_NO_ENCONTRADA")
    expect(resultado(await mover(e, ajena.id, null))).toBe("404 PUBLICACION_NO_ENCONTRADA")
    expect(await filas()).toEqual(antes)
  })

  it(
    "mover y borrar la misma tarea con la fila retenida, en los dos órdenes: sin 500 ni deadlock; quien llega después recibe 404 o pasa, y la tarea queda borrada",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Destino" })

      const primero = await crear(e)
      const [borradoA, movidoA] = await conTareaRetenida(primero.id, [
        () => borrar(e, primero.id),
        () => mover(e, primero.id, tema.id),
      ])
      expect([borradoA && resultado(borradoA), movidoA && resultado(movidoA)]).toEqual([
        "204",
        "404 PUBLICACION_NO_ENCONTRADA",
      ])
      expect(await leerTareaDb(primero.id)).toBeNull()

      const segundo = await crear(e)
      const [movidoB, borradoB] = await conTareaRetenida(segundo.id, [
        () => mover(e, segundo.id, tema.id),
        () => borrar(e, segundo.id),
      ])
      expect([movidoB && resultado(movidoB), borradoB && resultado(borradoB)]).toEqual([
        "200",
        "204",
      ])
      expect(await leerTareaDb(segundo.id)).toBeNull()
    },
  )

  it(
    "editar, mover y borrar la misma tarea a la vez, cinco veces: nunca 500; las respuestas son las de una ejecución en serie",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Ráfaga" })
      const fallas: string[] = []
      for (let vuelta = 0; vuelta < 5; vuelta += 1) {
        const tarea = await crear(e)
        const [edicion, movimiento, borrado] = await Promise.all([
          editar(e, tarea.id, { titulo: `Vuelta ${String(vuelta)}`, version: 0 }),
          mover(e, tarea.id, tema.id),
          borrar(e, tarea.id),
        ])
        const permitidos = {
          edicion: ["200", "409 TAREA_MODIFICADA", "404 TAREA_NO_ENCONTRADA"],
          movimiento: ["200", "404 PUBLICACION_NO_ENCONTRADA"],
          borrado: ["204"],
        }
        if (!permitidos.edicion.includes(resultado(edicion)))
          fallas.push(`vuelta ${String(vuelta)} edición: ${resultado(edicion)} ${edicion.body}`)
        if (!permitidos.movimiento.includes(resultado(movimiento)))
          fallas.push(
            `vuelta ${String(vuelta)} movimiento: ${resultado(movimiento)} ${movimiento.body}`,
          )
        if (!permitidos.borrado.includes(resultado(borrado)))
          fallas.push(`vuelta ${String(vuelta)} borrado: ${resultado(borrado)} ${borrado.body}`)
        if (await leerTareaDb(tarea.id))
          fallas.push(`vuelta ${String(vuelta)}: la tarea sigue en la base`)
        const vivos = (await trabajosDeTarea(COLA_RECORDATORIO_24H, tarea.id)).filter(
          (t) => t.state === "created",
        )
        if (vivos.length > 0) fallas.push(`vuelta ${String(vuelta)}: quedó un recordatorio vivo`)
      }
      expect(fallas).toEqual([])
    },
  )

  it(
    "mover y editar con la fila retenida: si la edición llega primero pasa y el movimiento sube a 2; si el movimiento llega primero, la edición con la versión vieja recibe 409 y el tema queda el del movimiento",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Movida" })

      const a = await crear(e)
      const [edicionA, movimientoA] = await conTareaRetenida(a.id, [
        () => editar(e, a.id, { titulo: "Editada primero", version: 0 }),
        () => mover(e, a.id, tema.id),
      ])
      expect([edicionA && resultado(edicionA), movimientoA && resultado(movimientoA)]).toEqual([
        "200",
        "200",
      ])
      expect(detalleDe(await leer(e, a.id))).toMatchObject({
        titulo: "Editada primero",
        version: 2,
        tema: { id: tema.id },
      })

      const b = await crear(e)
      const [movimientoB, edicionB] = await conTareaRetenida(b.id, [
        () => mover(e, b.id, tema.id),
        () => editar(e, b.id, { titulo: "Editada después", version: 0, temaId: null }),
      ])
      expect([movimientoB && resultado(movimientoB), edicionB && resultado(edicionB)]).toEqual([
        "200",
        "409 TAREA_MODIFICADA",
      ])
      expect(detalleDe(await leer(e, b.id))).toMatchObject({
        titulo: "Ensayo del tema 3",
        version: 1,
        tema: { id: tema.id },
      })
    },
  )
})

describe("ataque ENTREGAS-01a r1: el tema elegido se borra mientras se edita (T-r1-4)", () => {
  it("el guardado con ese tema recibe 404 TEMA_NO_ENCONTRADO sin subir la versión, y el siguiente con la misma versión y «Sin tema» pasa", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Se va" })
    const tarea = await crear(e, { temaId: tema.id })
    expect(
      (
        await peticion({
          method: "DELETE",
          url: `/api/clases/${e.claseId}/temas/${tema.id}`,
          token: e.tokenB,
        })
      ).statusCode,
    ).toBe(204)
    expect(resultado(await editar(e, tarea.id, { temaId: tema.id, version: 0 }))).toBe(
      "404 TEMA_NO_ENCONTRADO",
    )
    expect(await versionEnLaBase(tarea.id)).toBe(0)
    expect(
      resultado(await editar(e, tarea.id, { titulo: "Sin tema", temaId: null, version: 0 })),
    ).toBe("200")
    expect(detalleDe(await leer(e, tarea.id))).toMatchObject({ tema: null, version: 1 })
  })
})

describe("ataque ENTREGAS-01a r1: «Cómo se entrega» (requiereAdjuntos)", () => {
  const NO_BOOLEANOS: readonly unknown[] = ["true", "false", 1, 0, null, [], {}]

  it("al crear, cualquier valor que no sea booleano responde 400 VALIDACION y no crea nada", async () => {
    const e = await escenario()
    const contar = () => obtenerDb().publicacion.count({ where: { claseId: e.claseId } })
    const antes = await contar()
    const fallas: string[] = []
    for (const valor of NO_BOOLEANOS) {
      const r = await peticion({
        method: "POST",
        url: urlTareas(e.claseId),
        token: e.tokenA,
        payload: cuerpoDeTarea({ requiereAdjuntos: valor }),
      })
      if (resultado(r) !== "400 VALIDACION")
        fallas.push(`${JSON.stringify(valor)}: ${resultado(r)}`)
    }
    expect(fallas).toEqual([])
    expect(await contar()).toBe(antes)
  })

  it("al editar, cualquier valor que no sea booleano responde 400 VALIDACION sin escribir ni subir la versión; false se guarda y la versión sube", async () => {
    const e = await escenario()
    const tarea = await crear(e)
    const fallas: string[] = []
    for (const valor of NO_BOOLEANOS) {
      const r = await editar(e, tarea.id, { requiereAdjuntos: valor, version: 0 })
      if (resultado(r) !== "400 VALIDACION")
        fallas.push(`${JSON.stringify(valor)}: ${resultado(r)}`)
    }
    expect(fallas).toEqual([])
    expect(detalleDe(await leer(e, tarea.id))).toMatchObject({ requiereAdjuntos: true, version: 0 })
    expect(resultado(await editar(e, tarea.id, { requiereAdjuntos: false, version: 0 }))).toBe(
      "200",
    )
    for (const token of [e.tokenAlumno, e.tokenA, e.tokenB, e.tokenAdmin]) {
      expect(detalleDe(await leer(e, tarea.id, token))).toMatchObject({
        requiereAdjuntos: false,
        version: 1,
      })
    }
  })

  it("la respuesta de crear, ver y editar lleva exactamente las llaves de la tarea, para el alumno, los dos maestros y el admin, y ninguna trae trabajo_id, correo, rol ni estado de pago", async () => {
    const e = await escenario()
    const creada = await peticion({
      method: "POST",
      url: urlTareas(e.claseId),
      token: e.tokenA,
      payload: cuerpoDeTarea({ requiereAdjuntos: false }),
    })
    const id = detalleDe(creada).id
    const respuestas = [
      creada,
      await editar(e, id, { requiereAdjuntos: false, version: 0 }),
      await leer(e, id, e.tokenAlumno),
      await leer(e, id, e.tokenA),
      await leer(e, id, e.tokenB),
      await leer(e, id, e.tokenAdmin),
    ]
    const LLAVES = [
      "aceptaTardias",
      "actualizadoEn",
      "adjuntos",
      "autor",
      "categoria",
      "creadoEn",
      "fechaLimite",
      "id",
      "instrucciones",
      "puedeBorrar",
      "puedeEditar",
      "puntos",
      "requiereAdjuntos",
      "rubrica",
      "tema",
      "titulo",
      "version",
    ]
    const fallas: string[] = []
    for (const r of respuestas) {
      const cuerpo = r.json<{ tarea: Record<string, unknown> }>()
      const llaves = Object.keys(cuerpo).length === 1 ? Object.keys(cuerpo.tarea).sort() : ["?"]
      if (JSON.stringify(llaves) !== JSON.stringify(LLAVES))
        fallas.push(`${r.raw.req.method ?? ""}: ${llaves.join(",")}`)
      if (/trabajo|@|estadoPago|deudor|al_corriente|"rol"/i.test(r.body))
        fallas.push(`${r.raw.req.method ?? ""}: dato prohibido en ${r.body}`)
    }
    expect(fallas).toEqual([])
  })
})

describe("ataque ENTREGAS-01a r1: revisión estática de 01a", () => {
  const SRC = join(import.meta.dirname, "..", "src")
  const leerFuente = (ruta: string): string =>
    readFileSync(join(SRC, ruta), "utf8")
      .split("\n")
      .filter((linea) => !linea.trimStart().startsWith("//"))
      .join("\n")
  const cuerpoDe = (texto: string, inicio: string): string => {
    const desde = texto.indexOf(inicio)
    expect(desde, `Precondición: ${inicio} existe`).toBeGreaterThanOrEqual(0)
    const siguiente = texto.slice(desde + 1).search(/\n(export )?const /)
    return texto.slice(desde, siguiente === -1 ? undefined : desde + 1 + siguiente)
  }

  it("moverATema escribe tareas antes de bloquear el tema y de escribir publicaciones (§D-0.6), sin ciclos ni SQL crudo", () => {
    const cuerpo = cuerpoDe(leerFuente("adapters/db/temas.ts"), "export const moverATema =")
    const tareas = cuerpo.indexOf("tx.tarea.updateMany")
    const tema = cuerpo.indexOf("bloquearTemaParaUsar")
    const publicaciones = cuerpo.indexOf("tx.publicacion.updateMany")
    expect([tareas >= 0, tema >= 0, publicaciones >= 0]).toEqual([true, true, true])
    expect(tareas).toBeLessThan(tema)
    expect(tareas).toBeLessThan(publicaciones)
    expect(cuerpo).not.toMatch(/\b(for|while)\s*\(|\.forEach\(|\$queryRaw|\$executeRaw/)
  })

  it("editarTarea compara la versión después de la autoría y antes de la fecha, dentro de la transacción que bloquea la fila, y no tiene consultas en ciclos", () => {
    const cuerpo = cuerpoDe(leerFuente("adapters/db/tareas.ts"), "export const editarTarea =")
    const bloqueo = cuerpo.indexOf("FOR NO KEY UPDATE OF t")
    const autoria = cuerpo.indexOf("puedeEditarTarea(")
    const version = cuerpo.indexOf("exigirVersion(")
    const fecha = cuerpo.indexOf("validarFechaLimite(")
    const escritura = cuerpo.search(
      /tx\.(tarea|publicacion|criterioRubrica|archivo)\.(update|updateMany|create|createMany|delete|deleteMany)\(/,
    )
    expect([bloqueo, autoria, version, fecha, escritura].every((i) => i >= 0)).toBe(true)
    expect([bloqueo < autoria, autoria < version, version < fecha, version < escritura]).toEqual([
      true,
      true,
      true,
      true,
    ])
    expect(cuerpo).not.toMatch(/\b(for|while)\s*\([^)]*\)\s*\{[^}]*await\s/)
  })
})
