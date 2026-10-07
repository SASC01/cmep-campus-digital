import { randomUUID } from "node:crypto"

import {
  errorApiSchema,
  listaPublicacionesRespuestaSchema,
  tareaRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { borrarTarea, crearTarea, editarTarea } from "../src/adapters/db/tareas.js"
import { buscarTrabajo, cancelar, encolar } from "../src/adapters/queue/index.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { COLA_RECORDATORIO_24H, COLA_TAREA_CREADA } from "../src/core/eventos/avisos-de-clase.js"
import { momentoDelRecordatorio } from "../src/core/tareas/recordatorio.js"
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
  crearCategoriaDePrueba,
  crearTareaDePrueba,
  crearTemaDePrueba,
  cuerpoDeTarea,
  diasDespues,
  leerTareaDb,
  trabajosDeLaClase,
  trabajosDeTarea,
} from "./ayudas-tareas.js"

// TAREAS-01b. PR-1B07 (crear), PR-1B08 (editar), PR-1B10 (borrar) y PR-1B13 (reversión con la
// transacción de los trabajos de pg-boss).

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
  maestro: UsuarioDePrueba
  alumno: UsuarioDePrueba
  tokenMaestro: string
  tokenAlumno: string
}

const escenario = async (): Promise<Escenario> => {
  const maestro = await crearUsuarioDePrueba(idsUsuarios, {
    rol: "maestro",
    nombre: "Maestra Tareas",
  })
  const alumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumno Tareas" })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  await inscribirDePrueba(clase.id, alumno.id, "codigo")
  return {
    claseId: clase.id,
    maestro,
    alumno,
    tokenMaestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
    tokenAlumno: await firmarTokenDePrueba({ usuarioId: alumno.id }),
  }
}

const peticion = (opciones: {
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

const urlTareas = (claseId: string): string => `/api/clases/${claseId}/tareas`
const urlTarea = (claseId: string, tareaId: string): string => `${urlTareas(claseId)}/${tareaId}`

const crear = (e: Escenario, cuerpo: Record<string, unknown>, token = e.tokenMaestro) =>
  peticion({ method: "POST", url: urlTareas(e.claseId), token, payload: cuerpo })

const editar = (
  e: Escenario,
  tareaId: string,
  cuerpo: Record<string, unknown>,
  token = e.tokenMaestro,
) => peticion({ method: "PUT", url: urlTarea(e.claseId, tareaId), token, payload: cuerpo })

const idDeLaTarea = (respuesta: LightMyRequestResponse): string => {
  expect(respuesta.statusCode, respuesta.body).toBeLessThan(300)
  return tareaRespuestaSchema.parse(respuesta.json()).tarea.id
}

const archivoSubido = async (e: Escenario, nombre = "guia.pdf") => {
  const archivo = await crearArchivoDePrueba({
    claseId: e.claseId,
    subidoPor: e.maestro.id,
    nombre,
  })
  almacen.subir(archivo.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
  return archivo
}

const HORA_MS = 3_600_000

describe("crear una tarea (PR-1B07)", () => {
  it("PR-1B07: crear responde 201 con el detalle completo, sin trabajo_id ni rol del autor", async () => {
    const e = await escenario()

    const respuesta = await crear(
      e,
      cuerpoDeTarea({
        titulo: "  Ensayo \r\n",
        instrucciones: "Línea 1\r\nLínea 2",
        puntos: 80,
        aceptaTardias: false,
        rubrica: [
          { criterio: "Claridad", puntosMax: 30 },
          { criterio: "Fuentes", puntosMax: 50 },
        ],
      }),
    )

    expect(respuesta.statusCode, respuesta.body).toBe(201)
    const { tarea } = tareaRespuestaSchema.parse(respuesta.json())
    expect(tarea).toMatchObject({
      titulo: "Ensayo",
      instrucciones: "Línea 1\nLínea 2",
      puntos: 80,
      aceptaTardias: false,
      categoria: null,
      tema: null,
      adjuntos: [],
      autor: { id: e.maestro.id, nombre: "Maestra Tareas", administracion: false },
      puedeEditar: true,
      puedeBorrar: true,
    })
    expect(tarea.rubrica.map((c) => [c.criterio, c.puntosMax])).toEqual([
      ["Claridad", 30],
      ["Fuentes", 50],
    ])
    const crudo = JSON.stringify(respuesta.json())
    expect(crudo).not.toMatch(/trabajo_?id|"rol"|estadoPago|accesoRestringido|@/i)
    expect((await leerTareaDb(tarea.id))?.aceptaTardias).toBe(false)
  })

  it("PR-1B07: aceptaTardias ausente se guarda como true y el detalle de un alumno inscrito lo ve", async () => {
    const e = await escenario()
    const id = idDeLaTarea(await crear(e, cuerpoDeTarea()))

    const comoAlumno = await peticion({
      method: "GET",
      url: urlTarea(e.claseId, id),
      token: e.tokenAlumno,
    })

    expect(comoAlumno.statusCode).toBe(200)
    const { tarea } = tareaRespuestaSchema.parse(comoAlumno.json())
    expect(tarea.aceptaTardias).toBe(true)
    expect(tarea.puedeEditar).toBe(false)
    expect(tarea.puedeBorrar).toBe(false)
  })

  it("PR-1B07: en el muro aparece con tipo tarea y su resumen", async () => {
    const e = await escenario()
    const fecha = diasDespues(6)
    const id = idDeLaTarea(
      await crear(e, cuerpoDeTarea({ fechaLimite: fecha.toISOString(), puntos: 55 })),
    )

    const muro = await peticion({
      method: "GET",
      url: `/api/clases/${e.claseId}/publicaciones`,
      token: e.tokenAlumno,
    })

    expect(muro.statusCode).toBe(200)
    const { publicaciones } = listaPublicacionesRespuestaSchema.parse(muro.json())
    const elemento = publicaciones.find((p) => p.id === id)
    expect(elemento?.tipo).toBe("tarea")
    expect(elemento?.titulo).toBe("Ensayo del tema 3")
    expect(elemento?.tarea).toEqual({ fechaLimite: fecha.toISOString(), puntos: 55 })
    expect(elemento?.puedeBorrar).toBe(false)
  })

  it("PR-1B07: TAREA_CREADA lleva el id de la tarea y solo ids; RECORDATORIO_24H queda en created con start_after = fecha − 24 h y su id en trabajo_id", async () => {
    const e = await escenario()
    const fecha = diasDespues(5)
    const id = idDeLaTarea(await crear(e, cuerpoDeTarea({ fechaLimite: fecha.toISOString() })))

    const creada = await trabajosDeTarea(COLA_TAREA_CREADA, id)
    expect(creada).toHaveLength(1)
    expect(creada[0]?.id).toBe(id)
    expect(creada[0]?.state).toBe("created")
    expect(creada[0]?.datos).toEqual({ tareaId: id, claseId: e.claseId })

    const recordatorios = await trabajosDeTarea(COLA_RECORDATORIO_24H, id)
    expect(recordatorios).toHaveLength(1)
    expect(recordatorios[0]?.state).toBe("created")
    expect(recordatorios[0]?.datos).toEqual({ tareaId: id, claseId: e.claseId })
    expect(recordatorios[0]?.start_after.getTime()).toBe(fecha.getTime() - 24 * HORA_MS)
    expect((await leerTareaDb(id))?.trabajoId).toBe(recordatorios[0]?.id)
  })

  it("PR-1B07: a menos de 24 h no se programa recordatorio y trabajo_id queda nulo", async () => {
    const e = await escenario()
    const id = idDeLaTarea(
      await crear(
        e,
        cuerpoDeTarea({ fechaLimite: new Date(Date.now() + 12 * HORA_MS).toISOString() }),
      ),
    )

    expect(await trabajosDeTarea(COLA_RECORDATORIO_24H, id)).toHaveLength(0)
    expect((await buscarTrabajo(COLA_TAREA_CREADA, id))?.estado).toBe("created")
    expect((await leerTareaDb(id))?.trabajoId).toBeNull()
  })

  it("PR-1B07: los adjuntos quedan confirmados en la publicación de la tarea y salen en el detalle", async () => {
    const e = await escenario()
    const archivo = await archivoSubido(e)

    const respuesta = await crear(e, cuerpoDeTarea({ archivoIds: [archivo.id] }))

    const { tarea } = tareaRespuestaSchema.parse(respuesta.json())
    expect(respuesta.statusCode, respuesta.body).toBe(201)
    expect(tarea.adjuntos.map((a) => a.id)).toEqual([archivo.id])
    expect(JSON.stringify(respuesta.json())).not.toContain(archivo.claveObjeto)
    const fila = await leerArchivoDb(archivo.id)
    expect(fila?.estado).toBe("confirmado")
    expect(fila?.publicacionId).toBe(tarea.id)
  })

  it("PR-1B07: con categorías en la clase se exige una (409 CATEGORIA_REQUERIDA) y sin categorías no", async () => {
    const e = await escenario()
    const sinCategorias = await crear(e, cuerpoDeTarea())
    expect(sinCategorias.statusCode).toBe(201)

    const categoria = await crearCategoriaDePrueba({ claseId: e.claseId, peso: 100 })
    const sinElegir = await crear(e, cuerpoDeTarea())
    expect(sinElegir.statusCode).toBe(409)
    expect(codigoDe(sinElegir)).toBe("CATEGORIA_REQUERIDA")
    const elegida = await crear(e, cuerpoDeTarea({ categoriaId: categoria.id.toUpperCase() }))
    expect(elegida.statusCode, elegida.body).toBe(201)
    expect(tareaRespuestaSchema.parse(elegida.json()).tarea.categoria?.id).toBe(categoria.id)
    expect(await contarPublicaciones(e.claseId)).toBe(2)
  })

  it("PR-1B07: una categoría o un tema de otra clase responde 404 sin tarea, publicación ni trabajo", async () => {
    const e = await escenario()
    const otra = await escenario()
    const categoriaAjena = await crearCategoriaDePrueba({ claseId: otra.claseId, peso: 100 })
    const temaAjeno = await crearTemaDePrueba({ claseId: otra.claseId, orden: 0 })
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })

    const conCategoria = await crear(e, cuerpoDeTarea({ categoriaId: categoriaAjena.id }))
    const conTema = await crear(e, cuerpoDeTarea({ temaId: temaAjeno.id }))
    const conCategoriaInexistente = await crear(e, cuerpoDeTarea({ categoriaId: randomUUID() }))
    // Los dos validan: la tarea con el tema de su clase sí se crea.
    const correcta = await crear(e, cuerpoDeTarea({ temaId: tema.id }))

    expect(conCategoria.statusCode).toBe(404)
    expect(codigoDe(conCategoria)).toBe("CATEGORIA_NO_ENCONTRADA")
    expect(conCategoriaInexistente.statusCode).toBe(404)
    expect(conTema.statusCode).toBe(404)
    expect(codigoDe(conTema)).toBe("TEMA_NO_ENCONTRADO")
    expect(correcta.statusCode).toBe(201)
    expect(await contarPublicaciones(e.claseId)).toBe(1)
    expect(await trabajosDeLaClase(COLA_TAREA_CREADA, e.claseId)).toHaveLength(1)
    expect(await trabajosDeLaClase(COLA_RECORDATORIO_24H, e.claseId)).toHaveLength(1)
  })

  it("PR-1B07: el admin crea la tarea y sale firmada Administración, sin rol", async () => {
    const e = await escenario()

    const respuesta = await crear(e, cuerpoDeTarea(), await tokenDelAdminDePrueba())

    expect(respuesta.statusCode, respuesta.body).toBe(201)
    const { tarea } = tareaRespuestaSchema.parse(respuesta.json())
    expect(tarea.autor).toMatchObject({ nombre: "Administración", administracion: true })
    expect(tarea.puedeEditar).toBe(true)
    expect(tarea.puedeBorrar).toBe(true)
    expect(JSON.stringify(respuesta.json())).not.toContain('"rol"')
  })

  it("PR-1B07: una fecha pasada, a más de un año o sin zona responde 400 sin escribir nada", async () => {
    const e = await escenario()
    const casos: [string, string][] = [
      ["FECHA_LIMITE_INVALIDA", new Date(Date.now() - HORA_MS).toISOString()],
      ["FECHA_LIMITE_INVALIDA", diasDespues(400).toISOString()],
      ["VALIDACION", "2030-01-01T10:00:00"],
    ]
    for (const [codigo, fechaLimite] of casos) {
      const respuesta = await crear(e, cuerpoDeTarea({ fechaLimite }))
      expect(respuesta.statusCode, fechaLimite).toBe(400)
      expect(codigoDe(respuesta)).toBe(codigo)
    }
    expect(await contarPublicaciones(e.claseId)).toBe(0)
    expect(await trabajosDeLaClase(COLA_TAREA_CREADA, e.claseId)).toHaveLength(0)
  })
})

describe("editar una tarea (PR-1B08)", () => {
  it("PR-1B08: cambiar la fecha deja el trabajo anterior en cancelled y uno nuevo en created con otro id", async () => {
    const e = await escenario()
    const id = idDeLaTarea(
      await crear(e, cuerpoDeTarea({ fechaLimite: diasDespues(5).toISOString() })),
    )
    const [viejo] = await trabajosDeTarea(COLA_RECORDATORIO_24H, id)
    const nuevaFecha = diasDespues(9)

    const respuesta = await editar(e, id, cuerpoDeTarea({ fechaLimite: nuevaFecha.toISOString() }))

    expect(respuesta.statusCode, respuesta.body).toBe(200)
    const trabajos = await trabajosDeTarea(COLA_RECORDATORIO_24H, id)
    expect(trabajos).toHaveLength(2)
    const nuevo = trabajos.find((t) => t.id !== viejo?.id)
    expect(trabajos.find((t) => t.id === viejo?.id)?.state).toBe("cancelled")
    expect(nuevo?.state).toBe("created")
    expect(nuevo?.start_after.getTime()).toBe(nuevaFecha.getTime() - 24 * HORA_MS)
    const fila = await leerTareaDb(id)
    expect(fila?.trabajoId).toBe(nuevo?.id)
    expect(fila?.fechaLimite.getTime()).toBe(nuevaFecha.getTime())
  })

  it("PR-1B08: cambiar solo el título deja el mismo trabajo y no encola otro TAREA_CREADA", async () => {
    const e = await escenario()
    const fecha = diasDespues(5).toISOString()
    const id = idDeLaTarea(await crear(e, cuerpoDeTarea({ fechaLimite: fecha })))
    const antes = await trabajosDeTarea(COLA_RECORDATORIO_24H, id)

    const respuesta = await editar(
      e,
      id,
      cuerpoDeTarea({ fechaLimite: fecha, titulo: "Otro título" }),
    )

    expect(respuesta.statusCode, respuesta.body).toBe(200)
    expect(tareaRespuestaSchema.parse(respuesta.json()).tarea.titulo).toBe("Otro título")
    expect(await trabajosDeTarea(COLA_RECORDATORIO_24H, id)).toEqual(antes)
    expect((await trabajosDeTarea(COLA_RECORDATORIO_24H, id))[0]?.state).toBe("created")
    expect(await trabajosDeTarea(COLA_TAREA_CREADA, id)).toHaveLength(1)
    expect((await leerTareaDb(id))?.trabajoId).toBe(antes[0]?.id)
  })

  it("PR-1B08: TAREA_CREADA no se vuelve a encolar al editar la fecha", async () => {
    const e = await escenario()
    const id = idDeLaTarea(await crear(e, cuerpoDeTarea()))

    await editar(e, id, cuerpoDeTarea({ fechaLimite: diasDespues(8).toISOString() }))

    const creadas = await trabajosDeTarea(COLA_TAREA_CREADA, id)
    expect(creadas).toHaveLength(1)
    expect(creadas[0]?.state).toBe("created")
  })

  it("PR-1B08: mover la fecha a menos de 24 h cancela el recordatorio sin programar otro", async () => {
    const e = await escenario()
    const id = idDeLaTarea(
      await crear(e, cuerpoDeTarea({ fechaLimite: diasDespues(5).toISOString() })),
    )

    const respuesta = await editar(
      e,
      id,
      cuerpoDeTarea({ fechaLimite: new Date(Date.now() + 10 * HORA_MS).toISOString() }),
    )

    expect(respuesta.statusCode, respuesta.body).toBe(200)
    const trabajos = await trabajosDeTarea(COLA_RECORDATORIO_24H, id)
    expect(trabajos.map((t) => t.state)).toEqual(["cancelled"])
    expect((await leerTareaDb(id))?.trabajoId).toBeNull()
  })

  it("PR-1B08: una tarea sin recordatorio al moverla a una fecha lejana programa uno", async () => {
    const e = await escenario()
    const id = idDeLaTarea(
      await crear(
        e,
        cuerpoDeTarea({ fechaLimite: new Date(Date.now() + 10 * HORA_MS).toISOString() }),
      ),
    )
    expect(await trabajosDeTarea(COLA_RECORDATORIO_24H, id)).toHaveLength(0)

    await editar(e, id, cuerpoDeTarea({ fechaLimite: diasDespues(6).toISOString() }))

    const trabajos = await trabajosDeTarea(COLA_RECORDATORIO_24H, id)
    expect(trabajos.map((t) => t.state)).toEqual(["created"])
    expect((await leerTareaDb(id))?.trabajoId).toBe(trabajos[0]?.id)
  })

  it("PR-1B08: los criterios de la rúbrica se reemplazan", async () => {
    const e = await escenario()
    const id = idDeLaTarea(
      await crear(
        e,
        cuerpoDeTarea({
          rubrica: [
            { criterio: "Viejo A", puntosMax: 5 },
            { criterio: "Viejo B", puntosMax: 5 },
          ],
        }),
      ),
    )

    const respuesta = await editar(
      e,
      id,
      cuerpoDeTarea({
        fechaLimite: (await leerTareaDb(id))?.fechaLimite.toISOString(),
        rubrica: [{ criterio: "Nuevo", puntosMax: 20 }],
      }),
    )

    expect(respuesta.statusCode, respuesta.body).toBe(200)
    expect(
      tareaRespuestaSchema
        .parse(respuesta.json())
        .tarea.rubrica.map((c) => [c.criterio, c.puntosMax]),
    ).toEqual([["Nuevo", 20]])
    expect(await obtenerDb().criterioRubrica.count({ where: { tareaId: id } })).toBe(1)
  })

  it("PR-1B08: los adjuntos se conservan, se agregan y se quitan (descartado)", async () => {
    const e = await escenario()
    const a = await archivoSubido(e, "a.pdf")
    const b = await archivoSubido(e, "b.pdf")
    const id = idDeLaTarea(await crear(e, cuerpoDeTarea({ archivoIds: [a.id, b.id] })))
    const c = await archivoSubido(e, "c.pdf")
    const fechaLimite = (await leerTareaDb(id))?.fechaLimite.toISOString()

    const respuesta = await editar(e, id, cuerpoDeTarea({ fechaLimite, archivoIds: [a.id, c.id] }))

    expect(respuesta.statusCode, respuesta.body).toBe(200)
    expect(
      tareaRespuestaSchema
        .parse(respuesta.json())
        .tarea.adjuntos.map((x) => x.id)
        .sort(),
    ).toEqual([a.id, c.id].sort())
    expect((await leerArchivoDb(a.id))?.estado).toBe("confirmado")
    expect((await leerArchivoDb(c.id))?.publicacionId).toBe(id)
    const salido = await leerArchivoDb(b.id)
    expect(salido?.estado).toBe("descartado")
    expect(salido?.publicacionId).toBeNull()

    const sinAdjuntos = await editar(e, id, cuerpoDeTarea({ fechaLimite, archivoIds: [] }))
    expect(sinAdjuntos.statusCode).toBe(200)
    expect(tareaRespuestaSchema.parse(sinAdjuntos.json()).tarea.adjuntos).toEqual([])
    expect((await leerArchivoDb(a.id))?.estado).toBe("descartado")
  })

  it("PR-1B08: un archivo conservado que ya no es de esa tarea responde 400 sin cambiar nada", async () => {
    const e = await escenario()
    const idOtra = idDeLaTarea(await crear(e, cuerpoDeTarea()))
    const ajeno = await archivoSubido(e, "ajeno.pdf")
    await crear(e, cuerpoDeTarea({ archivoIds: [ajeno.id] }))
    const descartado = await crearArchivoDePrueba({
      claseId: e.claseId,
      subidoPor: e.maestro.id,
      estado: "descartado",
    })
    const id = idDeLaTarea(await crear(e, cuerpoDeTarea({ titulo: "Original" })))
    const antes = await leerTareaDb(id)

    for (const archivoIds of [[ajeno.id], [descartado.id], [randomUUID()]]) {
      const respuesta = await editar(
        e,
        id,
        cuerpoDeTarea({
          titulo: "Cambiado",
          fechaLimite: antes?.fechaLimite.toISOString(),
          archivoIds,
        }),
      )
      expect(respuesta.statusCode, JSON.stringify(archivoIds)).toBe(400)
    }
    expect(
      (await obtenerDb().publicacion.findUnique({ where: { id }, select: { titulo: true } }))
        ?.titulo,
    ).toBe("Original")
    expect((await leerArchivoDb(ajeno.id))?.publicacionId).not.toBe(id)
    expect(idOtra).not.toBe(id)
  })

  it("PR-1B08: editar una tarea de otra clase o inexistente responde 404; una fecha pasada nueva, 400; conservar la pasada, 200", async () => {
    const e = await escenario()
    const otra = await escenario()
    const idAjena = idDeLaTarea(await crear(otra, cuerpoDeTarea(), otra.tokenMaestro))
    const id = await crearTareaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      fechaLimite: new Date(Date.now() - 5 * HORA_MS),
    })
    const pasada = (await leerTareaDb(id))?.fechaLimite.toISOString()

    const deOtraClase = await editar(e, idAjena, cuerpoDeTarea())
    const inexistente = await editar(e, randomUUID(), cuerpoDeTarea())
    const nuevaPasada = await editar(
      e,
      id,
      cuerpoDeTarea({ fechaLimite: new Date(Date.now() - HORA_MS).toISOString() }),
    )
    const conservada = await editar(e, id, cuerpoDeTarea({ fechaLimite: pasada, titulo: "Sigue" }))

    expect(deOtraClase.statusCode).toBe(404)
    expect(codigoDe(deOtraClase)).toBe("TAREA_NO_ENCONTRADA")
    expect(inexistente.statusCode).toBe(404)
    expect(nuevaPasada.statusCode).toBe(400)
    expect(codigoDe(nuevaPasada)).toBe("FECHA_LIMITE_INVALIDA")
    expect(conservada.statusCode, conservada.body).toBe(200)
  })

  it("PR-1B08: editar exige categoría cuando la clase tiene, y valida las referencias", async () => {
    const e = await escenario()
    const id = idDeLaTarea(await crear(e, cuerpoDeTarea()))
    const fechaLimite = (await leerTareaDb(id))?.fechaLimite.toISOString()
    const categoria = await crearCategoriaDePrueba({ claseId: e.claseId, peso: 100 })
    const ajena = await crearCategoriaDePrueba({ claseId: (await escenario()).claseId, peso: 100 })

    const sinCategoria = await editar(e, id, cuerpoDeTarea({ fechaLimite }))
    const conAjena = await editar(e, id, cuerpoDeTarea({ fechaLimite, categoriaId: ajena.id }))
    const conPropia = await editar(e, id, cuerpoDeTarea({ fechaLimite, categoriaId: categoria.id }))

    expect(sinCategoria.statusCode).toBe(409)
    expect(codigoDe(sinCategoria)).toBe("CATEGORIA_REQUERIDA")
    expect(conAjena.statusCode).toBe(404)
    expect(conPropia.statusCode, conPropia.body).toBe(200)
  })
})

describe("borrar una tarea (PR-1B10)", () => {
  it("PR-1B10: borrar responde 204 y quita publicación, tarea y criterios; adjuntos a descartado; los dos trabajos a cancelled", async () => {
    const e = await escenario()
    const archivo = await archivoSubido(e)
    const id = idDeLaTarea(
      await crear(
        e,
        cuerpoDeTarea({ archivoIds: [archivo.id], rubrica: [{ criterio: "Uno", puntosMax: 10 }] }),
      ),
    )

    const respuesta = await peticion({
      method: "DELETE",
      url: urlTarea(e.claseId, id),
      token: e.tokenMaestro,
    })

    expect(respuesta.statusCode).toBe(204)
    expect(await obtenerDb().publicacion.count({ where: { id } })).toBe(0)
    expect(await leerTareaDb(id)).toBeNull()
    expect(await obtenerDb().criterioRubrica.count({ where: { tareaId: id } })).toBe(0)
    const fila = await leerArchivoDb(archivo.id)
    expect(fila?.estado).toBe("descartado")
    expect(fila?.publicacionId).toBeNull()
    expect((await trabajosDeTarea(COLA_RECORDATORIO_24H, id)).map((t) => t.state)).toEqual([
      "cancelled",
    ])
    expect((await trabajosDeTarea(COLA_TAREA_CREADA, id)).map((t) => t.state)).toEqual([
      "cancelled",
    ])
  })

  it("PR-1B10: borrar una tarea sin recordatorio solo cancela TAREA_CREADA, y una inexistente o de otra clase responde 404", async () => {
    const e = await escenario()
    const otra = await escenario()
    const idAjena = idDeLaTarea(await crear(otra, cuerpoDeTarea(), otra.tokenMaestro))
    const id = idDeLaTarea(
      await crear(
        e,
        cuerpoDeTarea({ fechaLimite: new Date(Date.now() + 5 * HORA_MS).toISOString() }),
      ),
    )

    const borrada = await peticion({
      method: "DELETE",
      url: urlTarea(e.claseId, id),
      token: e.tokenMaestro,
    })
    const deOtraClase = await peticion({
      method: "DELETE",
      url: urlTarea(e.claseId, idAjena),
      token: e.tokenMaestro,
    })
    const inexistente = await peticion({
      method: "DELETE",
      url: urlTarea(e.claseId, randomUUID()),
      token: e.tokenMaestro,
    })

    expect(borrada.statusCode).toBe(204)
    expect((await trabajosDeTarea(COLA_TAREA_CREADA, id)).map((t) => t.state)).toEqual([
      "cancelled",
    ])
    expect(deOtraClase.statusCode).toBe(404)
    expect(codigoDe(deOtraClase)).toBe("TAREA_NO_ENCONTRADA")
    expect(inexistente.statusCode).toBe(404)
    expect(await leerTareaDb(idAjena)).not.toBeNull()
    expect((await trabajosDeTarea(COLA_TAREA_CREADA, idAjena))[0]?.state).toBe("created")
  })

  it("PR-1B10: DELETE …/publicaciones/:id sobre una tarea responde 404 y nada cambia", async () => {
    const e = await escenario()
    const id = idDeLaTarea(await crear(e, cuerpoDeTarea()))
    const anuncio = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })

    const respuesta = await peticion({
      method: "DELETE",
      url: `/api/clases/${e.claseId}/publicaciones/${id}`,
      token: e.tokenMaestro,
    })
    const control = await peticion({
      method: "DELETE",
      url: `/api/clases/${e.claseId}/publicaciones/${anuncio}`,
      token: e.tokenMaestro,
    })

    expect(respuesta.statusCode).toBe(404)
    expect(codigoDe(respuesta)).toBe("PUBLICACION_NO_ENCONTRADA")
    expect(await leerTareaDb(id)).not.toBeNull()
    expect((await trabajosDeTarea(COLA_RECORDATORIO_24H, id))[0]?.state).toBe("created")
    expect(control.statusCode).toBe(204)
  })

  it("PR-1B10: comentar o listar los comentarios de una tarea responde 404", async () => {
    const e = await escenario()
    const id = idDeLaTarea(await crear(e, cuerpoDeTarea()))
    const url = `/api/clases/${e.claseId}/publicaciones/${id}/comentarios`

    const comentar = await peticion({
      method: "POST",
      url,
      token: e.tokenAlumno,
      payload: { texto: "Una duda" },
    })
    const listar = await peticion({ method: "GET", url, token: e.tokenAlumno })

    expect(comentar.statusCode).toBe(404)
    expect(codigoDe(comentar)).toBe("PUBLICACION_NO_ENCONTRADA")
    expect(listar.statusCode).toBe(404)
    expect(await obtenerDb().comentario.count({ where: { publicacionId: id } })).toBe(0)
  })
})

// Enmienda 1, M-02. El adaptador se llama con callbacks dobles que hacen la operación real de pg-boss
// y después lanzan: la transacción se revierte y con ella la cancelación o el encolado.
describe("reversión con la transacción de los trabajos de pg-boss (PR-1B13)", () => {
  const FALLO = "fallo deliberado del callback"

  interface TareaSembrada {
    e: Escenario
    id: string
    recordatorioId: string
    fecha: Date
    archivoId: string
  }

  // Una tarea real con rúbrica, un adjunto confirmado y sus dos trabajos, creada con el adaptador y un
  // alGuardar que encola como lo hace el handler.
  const sembrar = async (): Promise<TareaSembrada> => {
    const e = await escenario()
    const id = randomUUID()
    const recordatorioId = randomUUID()
    const fecha = diasDespues(6)
    const archivo = await archivoSubido(e)
    await crearTarea(
      {
        id,
        claseId: e.claseId,
        autor: { id: e.maestro.id, rol: "maestro" },
        titulo: "Sembrada",
        instrucciones: "",
        fechaLimite: fecha,
        puntos: 10,
        aceptaTardias: true,
        categoriaId: null,
        temaId: null,
        rubrica: [{ criterio: "Uno", puntosMax: 10 }],
        trabajoId: recordatorioId,
        archivos: [
          {
            id: archivo.id,
            nombre: "guia.pdf",
            tipo: "application/pdf",
            tamano: 1000,
            claveObjeto: archivo.claveObjeto,
          },
        ],
      },
      async (sql) => {
        const datos = { tareaId: id, claseId: e.claseId }
        await encolar(COLA_TAREA_CREADA, datos, { id, sql })
        await encolar(COLA_RECORDATORIO_24H, datos, {
          id: recordatorioId,
          sql,
          inicio: momentoDelRecordatorio(fecha, new Date()) ?? fecha,
        })
      },
    )
    return { e, id, recordatorioId, fecha, archivoId: archivo.id }
  }

  const datosDeEdicion = (s: TareaSembrada, fecha: Date) => ({
    claseId: s.e.claseId,
    tareaId: s.id,
    actor: { id: s.e.maestro.id, rol: "maestro" as const },
    ahora: new Date(),
    idRecordatorioNuevo: randomUUID(),
    titulo: "Editada",
    instrucciones: "",
    fechaLimite: fecha,
    puntos: 20,
    aceptaTardias: true,
    categoriaId: null,
    temaId: null,
    rubrica: [],
    archivoIds: [s.archivoId],
    archivosNuevos: [],
  })

  it("editar: si falla el encolado del recordatorio nuevo, el recordatorio viejo sigue en created y la tarea no cambia", async () => {
    const s = await sembrar()
    const datos = datosDeEdicion(s, diasDespues(10))

    await expect(
      editarTarea(datos, async (sql, plan) => {
        if (plan.cancelar !== null) await cancelar(COLA_RECORDATORIO_24H, plan.cancelar, { sql })
        throw new Error(FALLO)
      }),
    ).rejects.toThrow(FALLO)

    const fila = await leerTareaDb(s.id)
    expect(fila?.fechaLimite.getTime()).toBe(s.fecha.getTime())
    expect(fila?.trabajoId).toBe(s.recordatorioId)
    expect(fila?.puntos).toBe(10)
    expect((await buscarTrabajo(COLA_RECORDATORIO_24H, s.recordatorioId))?.estado).toBe("created")
    expect(await buscarTrabajo(COLA_RECORDATORIO_24H, datos.idRecordatorioNuevo)).toBeNull()
    expect(await obtenerDb().criterioRubrica.count({ where: { tareaId: s.id } })).toBe(1)
  })

  it("borrar: si falla la cancelación de TAREA_CREADA, la tarea sigue y su recordatorio sigue en created", async () => {
    const s = await sembrar()

    await expect(
      borrarTarea(
        { claseId: s.e.claseId, tareaId: s.id, actor: { id: s.e.maestro.id, rol: "maestro" } },
        async (sql, trabajoId) => {
          if (trabajoId !== null) await cancelar(COLA_RECORDATORIO_24H, trabajoId, { sql })
          throw new Error(FALLO)
        },
      ),
    ).rejects.toThrow(FALLO)

    expect(await obtenerDb().publicacion.count({ where: { id: s.id } })).toBe(1)
    expect(await leerTareaDb(s.id)).not.toBeNull()
    expect(await obtenerDb().criterioRubrica.count({ where: { tareaId: s.id } })).toBe(1)
    const archivo = await leerArchivoDb(s.archivoId)
    expect(archivo?.estado).toBe("confirmado")
    expect(archivo?.publicacionId).toBe(s.id)
    expect((await buscarTrabajo(COLA_RECORDATORIO_24H, s.recordatorioId))?.estado).toBe("created")
    expect((await buscarTrabajo(COLA_TAREA_CREADA, s.id))?.estado).toBe("created")
  })

  it("crear: si falla el encolado de RECORDATORIO_24H, no queda la tarea ni TAREA_CREADA", async () => {
    const e = await escenario()
    const id = randomUUID()
    const recordatorioId = randomUUID()
    const archivo = await archivoSubido(e)

    await expect(
      crearTarea(
        {
          id,
          claseId: e.claseId,
          autor: { id: e.maestro.id, rol: "maestro" },
          titulo: "Fallida",
          instrucciones: "",
          fechaLimite: diasDespues(6),
          puntos: 10,
          aceptaTardias: true,
          categoriaId: null,
          temaId: null,
          rubrica: [{ criterio: "Uno", puntosMax: 10 }],
          trabajoId: recordatorioId,
          archivos: [
            {
              id: archivo.id,
              nombre: "guia.pdf",
              tipo: "application/pdf",
              tamano: 1000,
              claveObjeto: archivo.claveObjeto,
            },
          ],
        },
        async (sql) => {
          await encolar(COLA_TAREA_CREADA, { tareaId: id, claseId: e.claseId }, { id, sql })
          throw new Error(FALLO)
        },
      ),
    ).rejects.toThrow(FALLO)

    expect(await obtenerDb().publicacion.count({ where: { id } })).toBe(0)
    expect(await leerTareaDb(id)).toBeNull()
    expect(await obtenerDb().criterioRubrica.count({ where: { tareaId: id } })).toBe(0)
    const fila = await leerArchivoDb(archivo.id)
    expect(fila?.estado).toBe("pendiente")
    expect(fila?.publicacionId).toBeNull()
    expect(await buscarTrabajo(COLA_TAREA_CREADA, id)).toBeNull()
    expect(await buscarTrabajo(COLA_RECORDATORIO_24H, recordatorioId)).toBeNull()
  })

  it("editar: si falla la cancelación del recordatorio viejo, la edición no se guarda", async () => {
    const s = await sembrar()
    const datos = datosDeEdicion(s, diasDespues(10))

    await expect(
      editarTarea(datos, (sql) => {
        // Cancela y lanza: la cancelación se revierte con la transacción.
        return cancelar(COLA_RECORDATORIO_24H, s.recordatorioId, { sql }).then(() => {
          throw new Error(FALLO)
        })
      }),
    ).rejects.toThrow(FALLO)

    const fila = await leerTareaDb(s.id)
    expect(fila?.fechaLimite.getTime()).toBe(s.fecha.getTime())
    expect(fila?.trabajoId).toBe(s.recordatorioId)
    expect(
      (await obtenerDb().publicacion.findUnique({ where: { id: s.id }, select: { titulo: true } }))
        ?.titulo,
    ).toBe("Sembrada")
    expect((await buscarTrabajo(COLA_RECORDATORIO_24H, s.recordatorioId))?.estado).toBe("created")
  })
})
