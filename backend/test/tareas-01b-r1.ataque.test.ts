import { randomUUID } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import { join, sep } from "node:path"

import {
  errorApiSchema,
  listaPublicacionesRespuestaSchema,
  listaTrabajoRespuestaSchema,
  tareaRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { COLA_RECORDATORIO_24H, COLA_TAREA_CREADA } from "../src/core/eventos/avisos-de-clase.js"
import { crearAlmacenEnMemoria, type AlmacenEnMemoria } from "./almacen-en-memoria.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  contarPublicaciones,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  crearPublicacionDePrueba,
  inscribirDePrueba,
  leerArchivoDb,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import {
  crearMaterialConTemaDePrueba,
  crearTareaDePrueba,
  crearTemaDePrueba,
  cuerpoDeTarea,
  diasDespues,
  leerTareaDb,
  trabajosDeLaClase,
  trabajosDeTarea,
} from "./ayudas-tareas.js"

// Ataque del Tester, TAREAS-01b, ronda 1: "Puntos de ataque para el Tester" → 01b, puntos 1 a 6
// (autoría, trabajos diferidos, archivos al editar, el muro y los comentarios frente a una tarea,
// fugas y validación), "Autorización" de 01b, §D-4 a §D-8 y la lista general (tiempo, asíncrono).
// Solo la base desechable y el almacén en memoria.

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
  alumno: UsuarioDePrueba
  tokenA: string
  tokenB: string
  tokenAlumno: string
}

// Dos maestros en la clase (co-docencia, CLASES-02) y un alumno inscrito. El maestro A da además
// otra clase, para las referencias cruzadas.
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
    alumno,
    tokenA: await firmarTokenDePrueba({ usuarioId: maestroA.id }),
    tokenB: await firmarTokenDePrueba({ usuarioId: maestroB.id }),
    tokenAlumno: await firmarTokenDePrueba({ usuarioId: alumno.id }),
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

const urlTareas = (claseId: string): string => `/api/clases/${claseId}/tareas`
const urlTarea = (claseId: string, tareaId: string): string => `${urlTareas(claseId)}/${tareaId}`
const urlMuro = (claseId: string): string => `/api/clases/${claseId}/publicaciones`
const urlTrabajo = (claseId: string, consulta: string): string =>
  `/api/clases/${claseId}/trabajo?${consulta}`

const crear = (e: Escenario, cambios: Record<string, unknown> = {}, token = e.tokenA) =>
  peticion({ method: "POST", url: urlTareas(e.claseId), token, payload: cuerpoDeTarea(cambios) })

const crearCrudo = (e: Escenario, cuerpo: string) =>
  peticion({ method: "POST", url: urlTareas(e.claseId), token: e.tokenA, payload: cuerpo })

const editar = (
  e: Escenario,
  tareaId: string,
  cambios: Record<string, unknown>,
  token = e.tokenA,
) =>
  peticion({
    method: "PUT",
    url: urlTarea(e.claseId, tareaId),
    token,
    payload: cuerpoDeTarea(cambios),
  })

const borrar = (e: Escenario, tareaId: string, token = e.tokenA) =>
  peticion({ method: "DELETE", url: urlTarea(e.claseId, tareaId), token })

const leer = (e: Escenario, tareaId: string, token = e.tokenA) =>
  peticion({ method: "GET", url: urlTarea(e.claseId, tareaId), token })

const detalleDe = (respuesta: LightMyRequestResponse) => {
  expect(respuesta.statusCode, respuesta.body).toBeLessThan(300)
  return tareaRespuestaSchema.parse(respuesta.json()).tarea
}

const vivos = async (cola: string, tareaId: string) =>
  (await trabajosDeTarea(cola, tareaId)).filter((trabajo) => trabajo.state === "created")

const archivoSubido = async (e: Escenario, subidoPor = e.maestroA.id, claseId = e.claseId) => {
  const archivo = await crearArchivoDePrueba({ claseId, subidoPor })
  almacen.subir(archivo.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
  return archivo
}

const MS_HORA = 3_600_000

describe("ataque TAREAS-01b r1: autoría contra la API (punto 1)", () => {
  it("maestro retirado y vuelto a asignar: B no toca la de A mientras A está; con A retirado, B la edita (y lo dicen puedeEditar y puedeBorrar); con A de vuelta, B vuelve a 403", async () => {
    const e = await escenario()
    const tareaId = detalleDe(await crear(e)).id
    const banderas = async (token: string) => {
      const d = detalleDe(await leer(e, tareaId, token))
      return [d.puedeEditar, d.puedeBorrar]
    }

    const editarB1 = await editar(e, tareaId, { titulo: "B mientras A está" }, e.tokenB)
    expect([editarB1.statusCode, codigoDe(editarB1)]).toEqual([403, "EDICION_NO_PERMITIDA"])
    const borrarB1 = await borrar(e, tareaId, e.tokenB)
    expect([borrarB1.statusCode, codigoDe(borrarB1)]).toEqual([403, "BORRADO_NO_PERMITIDO"])
    expect(await banderas(e.tokenB)).toEqual([false, false])

    await obtenerDb().maestroDeClase.delete({
      where: { claseId_maestroId: { claseId: e.claseId, maestroId: e.maestroA.id } },
    })
    expect(await banderas(e.tokenB)).toEqual([true, true])
    expect((await editar(e, tareaId, { titulo: "B con A retirado" }, e.tokenB)).statusCode).toBe(
      200,
    )

    await obtenerDb().maestroDeClase.create({
      data: { claseId: e.claseId, maestroId: e.maestroA.id },
    })
    expect(await banderas(e.tokenB)).toEqual([false, false])
    const editarB3 = await editar(e, tareaId, { titulo: "B con A de vuelta" }, e.tokenB)
    expect([editarB3.statusCode, codigoDe(editarB3)]).toEqual([403, "EDICION_NO_PERMITIDA"])
    expect(await banderas(e.tokenA)).toEqual([true, true])
    expect(detalleDe(await leer(e, tareaId)).titulo).toBe("B con A retirado")
    expect((await editar(e, tareaId, { titulo: "A otra vez" })).statusCode).toBe(200)
  })

  it("la tarea del admin: el maestro no la edita ni la borra (403) y sus banderas son false; el admin edita la suya y borra la de un maestro, pero no edita la del maestro (S-09)", async () => {
    const e = await escenario()
    const tokenAdmin = await tokenDelAdminDePrueba()
    const delAdmin = detalleDe(await crear(e, {}, tokenAdmin))
    expect(delAdmin.autor.administracion).toBe(true)
    const delMaestro = detalleDe(await crear(e)).id

    const editarM = await editar(e, delAdmin.id, { titulo: "Maestro" })
    const borrarM = await borrar(e, delAdmin.id)
    expect([editarM.statusCode, codigoDe(editarM)]).toEqual([403, "EDICION_NO_PERMITIDA"])
    expect([borrarM.statusCode, codigoDe(borrarM)]).toEqual([403, "BORRADO_NO_PERMITIDO"])
    const vista = detalleDe(await leer(e, delAdmin.id))
    expect([vista.puedeEditar, vista.puedeBorrar]).toEqual([false, false])

    const muro = listaPublicacionesRespuestaSchema.parse(
      (await peticion({ method: "GET", url: urlMuro(e.claseId), token: e.tokenA })).json(),
    )
    expect(muro.publicaciones.find(({ id }) => id === delAdmin.id)?.puedeBorrar).toBe(false)
    expect(muro.publicaciones.find(({ id }) => id === delMaestro)?.puedeBorrar).toBe(true)

    expect((await editar(e, delAdmin.id, { titulo: "Admin" }, tokenAdmin)).statusCode).toBe(200)
    const editarAdm = await editar(e, delMaestro, { titulo: "Admin" }, tokenAdmin)
    expect([editarAdm.statusCode, codigoDe(editarAdm)]).toEqual([403, "EDICION_NO_PERMITIDA"])
    expect((await borrar(e, delMaestro, tokenAdmin)).statusCode).toBe(204)
    expect(await leerTareaDb(delMaestro)).toBeNull()
  })

  it("el maestro de otra clase recibe 403 SIN_ACCESO_A_LA_CLASE (no EDICION_NO_PERMITIDA) en las cinco rutas; el alumno, ROL_NO_PERMITIDO al escribir y banderas false al leer", async () => {
    const e = await escenario()
    const tareaId = detalleDe(await crear(e)).id
    const ajeno = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
    const tokenAjeno = await firmarTokenDePrueba({ usuarioId: ajeno.id })
    const casos: [string, LightMyRequestResponse][] = [
      ["POST", await crear(e, {}, tokenAjeno)],
      ["GET", await leer(e, tareaId, tokenAjeno)],
      ["PUT", await editar(e, tareaId, {}, tokenAjeno)],
      ["DELETE", await borrar(e, tareaId, tokenAjeno)],
      [
        "trabajo",
        await peticion({
          method: "GET",
          url: urlTrabajo(e.claseId, "tema=sin-tema"),
          token: tokenAjeno,
        }),
      ],
    ]
    expect(casos.map(([n, r]) => [n, r.statusCode, codigoDe(r)])).toEqual(
      casos.map(([n]) => [n, 403, "SIN_ACCESO_A_LA_CLASE"]),
    )
    for (const r of [
      await crear(e, {}, e.tokenAlumno),
      await editar(e, tareaId, {}, e.tokenAlumno),
      await borrar(e, tareaId, e.tokenAlumno),
    ]) {
      expect([r.statusCode, codigoDe(r)]).toEqual([403, "ROL_NO_PERMITIDO"])
    }
    const vista = detalleDe(await leer(e, tareaId, e.tokenAlumno))
    expect([vista.puedeEditar, vista.puedeBorrar]).toEqual([false, false])
    expect(await contarPublicaciones(e.claseId)).toBe(1)
  })
})

describe("ataque TAREAS-01b r1: trabajos diferidos (punto 2)", () => {
  it(
    "seis ediciones de fecha simultáneas: todas 200 y al final hay exactamente un RECORDATORIO_24H vivo, el de trabajo_id, a fecha \u2212 24 h; un solo TAREA_CREADA",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const tareaId = detalleDe(await crear(e)).id
      const respuestas = await Promise.all(
        [6, 7, 8, 9, 10, 11].map((dias) =>
          editar(e, tareaId, { fechaLimite: diasDespues(dias).toISOString() }),
        ),
      )
      expect(respuestas.map((r) => r.statusCode)).toEqual([200, 200, 200, 200, 200, 200])
      const fila = await leerTareaDb(tareaId)
      const vivo = await vivos(COLA_RECORDATORIO_24H, tareaId)
      expect(vivo.map(({ id }) => id)).toEqual([fila?.trabajoId])
      expect(vivo[0]?.start_after.getTime()).toBe((fila?.fechaLimite.getTime() ?? 0) - 24 * MS_HORA)
      expect((await trabajosDeTarea(COLA_RECORDATORIO_24H, tareaId)).length).toBe(7)
      expect((await trabajosDeTarea(COLA_TAREA_CREADA, tareaId)).length).toBe(1)
    },
  )

  it(
    "editar la fecha y borrar a la vez (tres tareas): el borrado gana o va después, y ninguna queda con un trabajo vivo",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      for (let i = 0; i < 3; i++) {
        const tareaId = detalleDe(await crear(e)).id
        const [edicion, borrado] = await Promise.all([
          editar(e, tareaId, { fechaLimite: diasDespues(9).toISOString() }),
          borrar(e, tareaId),
        ])
        expect([200, 404]).toContain(edicion?.statusCode)
        expect(borrado?.statusCode).toBe(204)
        expect(await leerTareaDb(tareaId)).toBeNull()
        expect(await vivos(COLA_RECORDATORIO_24H, tareaId)).toEqual([])
        expect(await vivos(COLA_TAREA_CREADA, tareaId)).toEqual([])
      }
    },
  )

  it("fecha a 24 h + 3 s: se programa a fecha \u2212 24 h exacta; a 24 h \u2212 1 s: sin recordatorio y trabajo_id nulo; lo mismo al editar", async () => {
    const e = await escenario()
    const masAlla = new Date(Date.now() + 24 * MS_HORA + 3_000)
    const dentro = new Date(Date.now() + 24 * MS_HORA - 1_000)
    const conRecordatorio = detalleDe(await crear(e, { fechaLimite: masAlla.toISOString() })).id
    const sinRecordatorio = detalleDe(await crear(e, { fechaLimite: dentro.toISOString() })).id
    const vivo = await vivos(COLA_RECORDATORIO_24H, conRecordatorio)
    expect(vivo.length).toBe(1)
    expect(vivo[0]?.start_after.getTime()).toBe(masAlla.getTime() - 24 * MS_HORA)
    expect((await leerTareaDb(conRecordatorio))?.trabajoId).toBe(vivo[0]?.id)
    expect(await trabajosDeTarea(COLA_RECORDATORIO_24H, sinRecordatorio)).toEqual([])
    expect((await leerTareaDb(sinRecordatorio))?.trabajoId).toBeNull()

    const otraVez = new Date(Date.now() + 24 * MS_HORA - 1_000)
    expect(
      (await editar(e, conRecordatorio, { fechaLimite: otraVez.toISOString() })).statusCode,
    ).toBe(200)
    expect(await vivos(COLA_RECORDATORIO_24H, conRecordatorio)).toEqual([])
    expect((await leerTareaDb(conRecordatorio))?.trabajoId).toBeNull()
    const lejos = new Date(Date.now() + 24 * MS_HORA + 3_000)
    expect(
      (await editar(e, sinRecordatorio, { fechaLimite: lejos.toISOString() })).statusCode,
    ).toBe(200)
    const nuevo = await vivos(COLA_RECORDATORIO_24H, sinRecordatorio)
    expect(nuevo.map(({ id }) => id)).toEqual([(await leerTareaDb(sinRecordatorio))?.trabajoId])
  })

  it("límite de 365 días: 5 s antes pasa y 5 s después da 400 FECHA_LIMITE_INVALIDA, al crear y al editar; una fecha pasada al crear y una nueva pasada al editar también dan 400; conservar la pasada al editar pasa", async () => {
    const e = await escenario()
    const limite = Date.now() + 365 * 24 * MS_HORA
    const dentro = new Date(limite - 5_000).toISOString()
    const fuera = new Date(limite + 5_000).toISOString()
    const pasada = new Date(Date.now() - 60_000).toISOString()
    const tareaId = detalleDe(await crear(e, { fechaLimite: dentro })).id
    for (const r of [
      await crear(e, { fechaLimite: fuera }),
      await crear(e, { fechaLimite: pasada }),
      await editar(e, tareaId, { fechaLimite: fuera }),
      await editar(e, tareaId, { fechaLimite: pasada }),
    ]) {
      expect([r.statusCode, codigoDe(r)]).toEqual([400, "FECHA_LIMITE_INVALIDA"])
    }
    const vencida = new Date(Date.now() - 2 * 24 * MS_HORA)
    const antigua = await crearTareaDePrueba({
      claseId: e.claseId,
      autorId: e.maestroA.id,
      fechaLimite: vencida,
    })
    const conserva = await editar(e, antigua, {
      titulo: "Sigue vencida",
      fechaLimite: vencida.toISOString(),
    })
    expect(conserva.statusCode).toBe(200)
    expect(await vivos(COLA_RECORDATORIO_24H, antigua)).toEqual([])
  })

  it("zonas y fracciones: -06:00, +05:45 y +14:00 se guardan como el mismo instante en UTC; .5 y .123456789 se guardan al milisegundo; la respuesta va en Z", async () => {
    const e = await escenario()
    const base = diasDespues(10)
    const y = base.getUTCFullYear()
    const m = String(base.getUTCMonth() + 1).padStart(2, "0")
    const d = String(base.getUTCDate()).padStart(2, "0")
    const casos: [string, string][] = [
      [
        `${String(y)}-${m}-${d}T23:30:00-06:00`,
        new Date(`${String(y)}-${m}-${d}T23:30:00-06:00`).toISOString(),
      ],
      [
        `${String(y)}-${m}-${d}T08:15:00+05:45`,
        new Date(`${String(y)}-${m}-${d}T02:30:00Z`).toISOString(),
      ],
      [
        `${String(y)}-${m}-${d}T12:00:00+14:00`,
        new Date(`${String(y)}-${m}-${d}T12:00:00+14:00`).toISOString(),
      ],
      [`${String(y)}-${m}-${d}T10:00:00.5Z`, `${String(y)}-${m}-${d}T10:00:00.500Z`],
      [`${String(y)}-${m}-${d}T10:00:00.123456789Z`, `${String(y)}-${m}-${d}T10:00:00.123Z`],
    ]
    for (const [entrada, esperada] of casos) {
      const tarea = detalleDe(await crear(e, { fechaLimite: entrada }))
      expect([entrada, tarea.fechaLimite]).toEqual([entrada, esperada])
      expect((await leerTareaDb(tarea.id))?.fechaLimite.toISOString()).toBe(esperada)
      const vivo = await vivos(COLA_RECORDATORIO_24H, tarea.id)
      expect(vivo[0]?.start_after.getTime()).toBe(new Date(esperada).getTime() - 24 * MS_HORA)
    }
  })

  it("fechas imposibles o mal formadas (sin zona, 30 de febrero, segundo 60, hora 25, número, texto) responden 400 sin crear nada ni encolar", async () => {
    const e = await escenario()
    const y = String(diasDespues(30).getUTCFullYear() + 1)
    const fallas: string[] = []
    for (const fechaLimite of [
      `${y}-03-01T10:00:00`,
      `${y}-02-30T10:00:00Z`,
      `${y}-03-01T23:59:60Z`,
      `${y}-03-01T25:00:00Z`,
      diasDespues(5).getTime(),
      "mañana",
      null,
    ]) {
      const r = await crear(e, { fechaLimite })
      if (r.statusCode !== 400)
        fallas.push(`${JSON.stringify(fechaLimite)}: ${String(r.statusCode)}`)
    }
    expect(fallas).toEqual([])
    expect(await contarPublicaciones(e.claseId)).toBe(0)
    expect(await trabajosDeLaClase(COLA_TAREA_CREADA, e.claseId)).toEqual([])
  })
})

describe("ataque TAREAS-01b r1: archivos al editar (punto 3)", () => {
  const conAdjunto = async (e: Escenario) => {
    const archivo = await archivoSubido(e)
    const tarea = detalleDe(await crear(e, { archivoIds: [archivo.id] }))
    expect(tarea.adjuntos.map(({ id }) => id)).toEqual([archivo.id])
    return { tareaId: tarea.id, archivoId: archivo.id }
  }

  it("conservar un archivo de otra tarea, de otra clase, de otro usuario, uno descartado o uno pendiente de más de 24 h: 400 y nada cambia", async () => {
    const e = await escenario()
    const { tareaId, archivoId } = await conAdjunto(e)
    const otra = await conAdjunto(e)
    const deOtraClase = await archivoSubido(e, e.maestroA.id, e.otraClaseId)
    const deOtroUsuario = await archivoSubido(e, e.maestroB.id)
    const descartado = await crearArchivoDePrueba({
      claseId: e.claseId,
      subidoPor: e.maestroA.id,
      estado: "descartado",
    })
    const viejo = await crearArchivoDePrueba({
      claseId: e.claseId,
      subidoPor: e.maestroA.id,
      creadoEn: new Date(Date.now() - 25 * MS_HORA),
    })
    almacen.subir(viejo.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
    const fallas: string[] = []
    for (const [etiqueta, id] of [
      ["de otra tarea", otra.archivoId],
      ["de otra clase", deOtraClase.id],
      ["de otro usuario", deOtroUsuario.id],
      ["descartado", descartado.id],
      ["pendiente vencido", viejo.id],
    ] as const) {
      const r = await editar(e, tareaId, { titulo: "Cambio", archivoIds: [archivoId, id] })
      if (r.statusCode !== 400) fallas.push(`${etiqueta}: ${String(r.statusCode)}`)
    }
    expect(fallas).toEqual([])
    const vista = detalleDe(await leer(e, tareaId))
    expect([vista.titulo, vista.adjuntos.map(({ id }) => id)]).toEqual([
      "Ensayo del tema 3",
      [archivoId],
    ])
    expect((await leerArchivoDb(otra.archivoId))?.publicacionId).toBe(otra.tareaId)
    expect((await leerArchivoDb(deOtroUsuario.id))?.estado).toBe("pendiente")
  })

  it("seis archivos en total o el mismo id dos veces: 400 VALIDACION; el id conservado en mayúsculas se reconoce; quitar todos los deja en descartado", async () => {
    const e = await escenario()
    const { tareaId, archivoId } = await conAdjunto(e)
    const nuevos = await Promise.all([1, 2, 3, 4, 5].map(() => archivoSubido(e)))
    const seis = await editar(e, tareaId, {
      archivoIds: [archivoId, ...nuevos.map(({ id }) => id)],
    })
    expect([seis.statusCode, codigoDe(seis)]).toEqual([400, "VALIDACION"])
    const repetido = await editar(e, tareaId, { archivoIds: [archivoId, archivoId] })
    expect([repetido.statusCode, codigoDe(repetido)]).toEqual([400, "VALIDACION"])
    const mayusculas = await editar(e, tareaId, { archivoIds: [archivoId.toUpperCase()] })
    expect(detalleDe(mayusculas).adjuntos.map(({ id }) => id)).toEqual([archivoId])
    const ninguno = await editar(e, tareaId, { archivoIds: [] })
    expect(detalleDe(ninguno).adjuntos).toEqual([])
    const fila = await leerArchivoDb(archivoId)
    expect([fila?.estado, fila?.publicacionId]).toEqual(["descartado", null])
  })
})

describe("ataque TAREAS-01b r1: el muro y los comentarios frente a una tarea (punto 4)", () => {
  it("borrarla por la ruta del muro, comentarla y listar sus comentarios: 404 PUBLICACION_NO_ENCONTRADA y nada cambia (ni la tarea ni sus trabajos)", async () => {
    const e = await escenario()
    const tareaId = detalleDe(await crear(e)).id
    const casos = [
      await peticion({
        method: "DELETE",
        url: `${urlMuro(e.claseId)}/${tareaId}`,
        token: e.tokenA,
      }),
      await peticion({
        method: "POST",
        url: `${urlMuro(e.claseId)}/${tareaId}/comentarios`,
        token: e.tokenAlumno,
        payload: { texto: "¿Para cuándo?" },
      }),
      await peticion({
        method: "GET",
        url: `${urlMuro(e.claseId)}/${tareaId}/comentarios`,
        token: e.tokenAlumno,
      }),
    ]
    expect(casos.map((r) => [r.statusCode, codigoDe(r)])).toEqual([
      [404, "PUBLICACION_NO_ENCONTRADA"],
      [404, "PUBLICACION_NO_ENCONTRADA"],
      [404, "PUBLICACION_NO_ENCONTRADA"],
    ])
    expect(await leerTareaDb(tareaId)).not.toBeNull()
    expect(await obtenerDb().comentario.count({ where: { publicacionId: tareaId } })).toBe(0)
    expect((await vivos(COLA_TAREA_CREADA, tareaId)).length).toBe(1)
    expect((await vivos(COLA_RECORDATORIO_24H, tareaId)).length).toBe(1)
  })

  it("el id de una tarea como cursor del muro y de «Trabajo de clase» trae lo que sigue; en el tema equivocado, 400", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad" })
    const anuncio = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestroA.id,
      creadoEn: new Date(Date.now() - 120_000),
    })
    const material = await crearMaterialConTemaDePrueba({
      claseId: e.claseId,
      autorId: e.maestroA.id,
      temaId: tema.id,
      creadoEn: new Date(Date.now() - 60_000),
    })
    const tarea = detalleDe(await crear(e, { temaId: tema.id }))
    const muro = async (consulta: string) =>
      listaPublicacionesRespuestaSchema.parse(
        (
          await peticion({
            method: "GET",
            url: `${urlMuro(e.claseId)}?${consulta}`,
            token: e.tokenAlumno,
          })
        ).json(),
      )
    const primera = await muro("limite=1")
    expect([primera.publicaciones.map(({ id }) => id), primera.siguienteCursor]).toEqual([
      [tarea.id],
      tarea.id,
    ])
    expect(primera.publicaciones[0]).toMatchObject({
      tipo: "tarea",
      titulo: tarea.titulo,
      tarea: { fechaLimite: tarea.fechaLimite, puntos: tarea.puntos },
      comentarios: 0,
      puedeBorrar: false,
    })
    const segunda = await muro(`limite=5&cursor=${tarea.id}`)
    expect(segunda.publicaciones.map(({ id }) => id)).toEqual([material, anuncio])

    const trabajo = async (consulta: string) =>
      peticion({ method: "GET", url: urlTrabajo(e.claseId, consulta), token: e.tokenAlumno })
    const t1 = listaTrabajoRespuestaSchema.parse((await trabajo(`tema=${tema.id}&limite=1`)).json())
    expect([t1.elementos.map(({ id }) => id), t1.siguienteCursor]).toEqual([[tarea.id], tarea.id])
    expect(t1.elementos[0]?.puedeMover).toBe(false)
    const t2 = listaTrabajoRespuestaSchema.parse(
      (await trabajo(`tema=${tema.id}&limite=5&cursor=${tarea.id.toUpperCase()}`)).json(),
    )
    expect(t2.elementos.map(({ id }) => id)).toEqual([material])
    const equivocado = await trabajo(`tema=sin-tema&cursor=${tarea.id}`)
    expect([equivocado.statusCode, codigoDe(equivocado)]).toEqual([400, "VALIDACION"])
  })
})

// Todas las claves de un JSON, a cualquier profundidad.
const clavesDe = (valor: unknown): string[] => {
  if (Array.isArray(valor)) return valor.flatMap(clavesDe)
  if (typeof valor !== "object" || valor === null) return []
  return Object.entries(valor).flatMap(([clave, hijo]) => [clave, ...clavesDe(hijo)])
}
const PROHIBIDAS = [
  "trabajoId",
  "trabajo_id",
  "rol",
  "email",
  "correo",
  "estadoPago",
  "accesoRestringido",
  "claveObjeto",
  "hashContrasena",
]

describe("ataque TAREAS-01b r1: fugas (punto 5)", () => {
  it("ninguna respuesta de las cinco rutas, de éxito o de error, para el alumno, el maestro o el admin, lleva trabajo_id, rol, correos, estadoPago ni la clave del objeto; los datos de las dos colas son exactamente los dos ids", async () => {
    const e = await escenario()
    const tokenAdmin = await tokenDelAdminDePrueba()
    const archivo = await archivoSubido(e)
    const creada = await crear(e, { archivoIds: [archivo.id] })
    const tareaId = detalleDe(creada).id
    const respuestas: LightMyRequestResponse[] = [creada]
    for (const token of [e.tokenAlumno, e.tokenA, tokenAdmin]) {
      respuestas.push(
        await leer(e, tareaId, token),
        await peticion({ method: "GET", url: urlTrabajo(e.claseId, "tema=sin-tema"), token }),
        await peticion({ method: "GET", url: urlMuro(e.claseId), token }),
      )
    }
    respuestas.push(
      await editar(e, tareaId, { titulo: "Editada", archivoIds: [archivo.id] }),
      await editar(e, tareaId, { titulo: "B" }, e.tokenB),
      await borrar(e, tareaId, e.tokenB),
      await crear(e, {}, e.tokenAlumno),
      await crear(e, { categoriaId: randomUUID() }),
      await leer(e, randomUUID()),
    )
    const fallas: string[] = []
    for (const r of respuestas) {
      const claves = clavesDe(r.json())
      for (const prohibida of PROHIBIDAS) {
        if (claves.includes(prohibida))
          fallas.push(`${r.raw.req.method ?? ""} ${r.raw.req.url ?? ""}: ${prohibida}`)
      }
      if (/@|deudor|al_corriente/i.test(r.body))
        fallas.push(`${r.raw.req.url ?? ""}: correo o pago en el cuerpo`)
    }
    expect(fallas).toEqual([])
    for (const cola of [COLA_TAREA_CREADA, COLA_RECORDATORIO_24H]) {
      for (const trabajo of await trabajosDeTarea(cola, tareaId)) {
        expect(trabajo.datos).toEqual({ tareaId, claseId: e.claseId })
      }
    }
  })
})

describe("ataque TAREAS-01b r1: validación (punto 6)", () => {
  it('puntos y puntos máximos: "100", -0, 1001 y 1.5 dan 400; 1.0 vale 1 y 1e3 vale 1000', async () => {
    const e = await escenario()
    const fallas: string[] = []
    for (const crudo of ['"100"', "-0", "1001", "1.5", "null", "true"]) {
      const r1 = await crearCrudo(
        e,
        `{"titulo":"T","fechaLimite":"${diasDespues(5).toISOString()}","puntos":${crudo}}`,
      )
      const r2 = await crearCrudo(
        e,
        `{"titulo":"T","fechaLimite":"${diasDespues(5).toISOString()}","puntos":10,"rubrica":[{"criterio":"C","puntosMax":${crudo}}]}`,
      )
      if (r1.statusCode !== 400) fallas.push(`puntos ${crudo}: ${String(r1.statusCode)}`)
      if (r2.statusCode !== 400) fallas.push(`puntosMax ${crudo}: ${String(r2.statusCode)}`)
    }
    expect(fallas).toEqual([])
    expect(await contarPublicaciones(e.claseId)).toBe(0)
    const valido = await crearCrudo(
      e,
      `{"titulo":"T","fechaLimite":"${diasDespues(5).toISOString()}","puntos":1.0,"rubrica":[{"criterio":"C","puntosMax":1e3}]}`,
    )
    const tarea = detalleDe(valido)
    expect([tarea.puntos, tarea.rubrica.map(({ puntosMax }) => puntosMax)]).toEqual([1, [1000]])
    const mil = detalleDe(
      await crearCrudo(
        e,
        `{"titulo":"T","fechaLimite":"${diasDespues(5).toISOString()}","puntos":1e3}`,
      ),
    )
    expect(mil.puntos).toBe(1000)
  })

  it("rubrica como objeto o null, 21 criterios, criterio vacío, categoriaId o temaId vacíos, título de dos líneas, aceptaTardias como texto, instrucciones null o cuerpo que no es objeto: 400 sin crear ni encolar", async () => {
    const e = await escenario()
    const criterio = { criterio: "Claridad", puntosMax: 10 }
    const fallas: string[] = []
    for (const [etiqueta, cambios] of [
      ["rubrica objeto", { rubrica: { a: criterio } }],
      ["rubrica null", { rubrica: null }],
      ["21 criterios", { rubrica: Array.from({ length: 21 }, () => criterio) }],
      ["criterio vacío", { rubrica: [{ criterio: "  ", puntosMax: 10 }] }],
      ["criterio invisible", { rubrica: [{ criterio: "\u200B\u2060", puntosMax: 10 }] }],
      ["categoriaId vacío", { categoriaId: "" }],
      ["temaId vacío", { temaId: "" }],
      ["título de dos líneas", { titulo: "Uno\nDos" }],
      ["título de 201", { titulo: "a".repeat(201) }],
      ["aceptaTardias texto", { aceptaTardias: "true" }],
      ["instrucciones null", { instrucciones: null }],
      ["instrucciones de 10 001", { instrucciones: "a".repeat(10_001) }],
    ] as const) {
      const r = await crear(e, cambios)
      if (r.statusCode !== 400) fallas.push(`${etiqueta}: ${String(r.statusCode)}`)
    }
    for (const crudo of ["null", "[]", '"tarea"', "5"]) {
      const r = await crearCrudo(e, crudo)
      if (r.statusCode !== 400) fallas.push(`cuerpo ${crudo}: ${String(r.statusCode)}`)
    }
    expect(fallas).toEqual([])
    expect(await contarPublicaciones(e.claseId)).toBe(0)
    expect(await trabajosDeLaClase(COLA_TAREA_CREADA, e.claseId)).toEqual([])
  })

  it("«Trabajo de clase» con límite 0, -1, 101, texto o tema ausente, y un tareaId que no es uuid: 400; nunca 500", async () => {
    const e = await escenario()
    const fallas: string[] = []
    for (const consulta of [
      "tema=sin-tema&limite=0",
      "tema=sin-tema&limite=-1",
      "tema=sin-tema&limite=101",
      "tema=sin-tema&limite=diez",
      "limite=5",
      "tema=Sin-Tema",
      "tema=sin-tema&cursor=x'%3B--",
    ]) {
      const r = await peticion({
        method: "GET",
        url: urlTrabajo(e.claseId, consulta),
        token: e.tokenA,
      })
      if (r.statusCode !== 400) fallas.push(`${consulta}: ${String(r.statusCode)}`)
    }
    for (const id of ["orden", "1", `${randomUUID()}x`]) {
      const r = await leer(e, id)
      if (r.statusCode !== 400) fallas.push(`tarea ${id}: ${String(r.statusCode)}`)
    }
    expect(fallas).toEqual([])
  })
})

describe("ataque TAREAS-01b r1: asíncrono (lista general)", () => {
  it("crear, editar y borrar una tarea solo deja en la cola sus dos trabajos (nada de avisos en la petición), y fuera de adapters/notifier nadie escribe en notificaciones", async () => {
    const e = await escenario()
    const tareaId = detalleDe(await crear(e)).id
    expect(
      (await editar(e, tareaId, { fechaLimite: diasDespues(8).toISOString() })).statusCode,
    ).toBe(200)
    expect((await borrar(e, tareaId)).statusCode).toBe(204)
    const colas = await obtenerDb().$queryRaw<{ name: string }[]>`
      SELECT DISTINCT name FROM pgboss.job WHERE data ->> 'tareaId' = ${tareaId}::text ORDER BY name`
    expect(colas.map(({ name }) => name)).toEqual([COLA_RECORDATORIO_24H, COLA_TAREA_CREADA])
    const [tabla] = await obtenerDb().$queryRaw<{ existe: boolean }[]>`
      SELECT to_regclass('public.notificaciones') IS NOT NULL AS existe`
    expect(tabla?.existe, "notificaciones todavía no existe (NOTIFICACIONES)").toBe(false)

    const raiz = join(import.meta.dirname, "..", "src")
    const escritores = readdirSync(raiz, { recursive: true, encoding: "utf8" })
      .map((ruta) => ruta.split(sep).join("/"))
      .filter((ruta) => ruta.endsWith(".ts") && !ruta.endsWith(".test.ts"))
      .filter((ruta) => !ruta.startsWith("adapters/db/generated/"))
      .filter((ruta) =>
        /\.notificacion\.(create|createMany|update|updateMany|upsert)|INSERT\s+INTO\s+"?notificaciones/i.test(
          readFileSync(join(raiz, ruta), "utf8"),
        ),
      )
    expect(escritores.filter((ruta) => !ruta.startsWith("adapters/notifier/"))).toEqual([])
  })
})
