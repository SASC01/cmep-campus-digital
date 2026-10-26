import {
  entregaDeAlumnoRespuestaSchema,
  listaComentariosPrivadosRespuestaSchema,
  miEntregaRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { COLA_COMENTARIO_CREADO } from "../src/core/eventos/avisos-de-clase.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba } from "./ayudas-auth.js"
import {
  codigoDe,
  crearEscenarioDeCalificar,
  cuerpoConRubrica,
  cuerpoDirecto,
  fotoDeCalificar,
  HORA_MS,
  mensajeDe,
  pedirEn,
  trabajosDeCalificacion,
  trabajosPorEntrega,
  urlDeCalificar,
  type EscenarioDeCalificar,
  type OpcionesEscenarioDeCalificar,
} from "./ayudas-calificaciones.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"
import {
  contarEntregasDeTarea,
  crearArchivoDeEntregaDePrueba,
  crearEntregaDePrueba,
  leerEntregaDb,
} from "./ayudas-entregas.js"

// CALIFICACIONES-01a (CAL-1A09, CAL-1A10, CAL-1A11, CAL-1A13, CAL-1A14 y CAL-1A19 con calificaciones
// hechas por la API). Calificar y recalificar una entrega por PUT …/entregas/:alumnoId/calificacion
// (§D-3): la versión exigida, el desglose, el comentario de devolución en el hilo privado y
// CALIFICACION_PUBLICADA en la misma transacción. P-03 (c′): a quien no entregó solo con la entrega
// cerrada. Un 409 o un 400 no escriben ni encolan nada.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}
const pedir = pedirEn(obtenerApp)

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen: crearAlmacenEnMemoria() })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const RUBRICA = [
  { criterio: "Claridad", puntosMax: 4 },
  { criterio: "Contenido", puntosMax: 5 },
]

const escenario = (opciones: OpcionesEscenarioDeCalificar = {}) =>
  crearEscenarioDeCalificar(idsUsuarios, idsClases, opciones)

const calificar = (
  e: EscenarioDeCalificar,
  cuerpo: Record<string, unknown>,
  token = e.tokens.maestro,
) => pedir(token, "PUT", urlDeCalificar(e), cuerpo)

const entregaDe = (respuesta: { json: () => unknown }) =>
  entregaDeAlumnoRespuestaSchema.parse(respuesta.json()).entrega

const comentariosDelHilo = async (e: EscenarioDeCalificar) => {
  const delMaestro = await pedir(
    e.tokens.maestro,
    "GET",
    `/api/clases/${e.claseId}/tareas/${e.tareaId}/entregas/${e.alumno.id}/comentarios`,
  )
  const delAlumno = await pedir(
    e.tokens.alumno,
    "GET",
    `/api/clases/${e.claseId}/tareas/${e.tareaId}/entrega/comentarios`,
  )
  expect([delMaestro.statusCode, delAlumno.statusCode]).toEqual([200, 200])
  return {
    maestro: listaComentariosPrivadosRespuestaSchema.parse(delMaestro.json()).comentarios,
    alumno: listaComentariosPrivadosRespuestaSchema.parse(delAlumno.json()).comentarios,
  }
}

describe("calificar con rúbrica (CAL-1A09)", () => {
  it("CAL-1A09: PUT con rúbrica responde 200 con la calificación escalada y su desglose, sube la versión, guarda los puntajes, encola un CALIFICACION_PUBLICADA y no toca la fecha, el retraso ni los enlaces", async () => {
    const e = await escenario({ rubrica: RUBRICA, puntos: 10 })
    const fechaEntrega = new Date(Date.now() - HORA_MS)
    const entregaId = await crearEntregaDePrueba({
      tareaId: e.tareaId,
      alumnoId: e.alumno.id,
      estado: "entregado",
      conRetraso: true,
      enlaces: ["https://ejemplo.com/trabajo"],
      fechaEntrega,
      version: 1,
    })
    const [c1, c2] = e.criterios
    if (c1 === undefined || c2 === undefined) throw new Error("Precondición: dos criterios")
    const antes = Date.now()

    const respuesta = await calificar(e, cuerpoConRubrica(e, [3, 4], { version: 1 }))

    const despues = Date.now()
    expect(respuesta.statusCode, respuesta.body).toBe(200)
    const entrega = entregaDe(respuesta)
    expect(entrega.estado).toBe("calificado")
    expect(entrega.version).toBe(2)
    expect(entrega.fechaEntrega).toBe(fechaEntrega.toISOString())
    expect(entrega.conRetraso).toBe(true)
    expect(entrega.enlaces).toEqual(["https://ejemplo.com/trabajo"])
    // 7 de 9 puntos de rúbrica sobre 10 puntos de la tarea = 7.78.
    expect(entrega.calificacion).toMatchObject({
      puntos: 7.78,
      sobre: 10,
      puntajes: [
        { criterioId: c1, criterio: "Claridad", puntosMax: 4, puntos: 3 },
        { criterioId: c2, criterio: "Contenido", puntosMax: 5, puntos: 4 },
      ],
    })
    const fecha = new Date(entrega.calificacion?.fecha ?? "").getTime()
    expect(fecha).toBeGreaterThanOrEqual(antes)
    expect(fecha).toBeLessThanOrEqual(despues)

    const foto = await fotoDeCalificar(e)
    expect(foto.entrega).toMatchObject({
      estado: "calificado",
      calificacion: "7.78",
      version: 2,
      conRetraso: true,
      fechaEntrega,
      enlaces: ["https://ejemplo.com/trabajo"],
    })
    expect(foto.entrega?.fechaCalificacion?.getTime()).toBe(fecha)
    expect(foto.puntajes).toEqual(
      [
        { criterioId: c1, puntos: "3" },
        { criterioId: c2, puntos: "4" },
      ].sort((a, b) => (a.criterioId < b.criterioId ? -1 : 1)),
    )

    const trabajos = await trabajosDeCalificacion(e.tareaId)
    expect(trabajos).toHaveLength(1)
    const [trabajo] = trabajos
    expect(trabajo?.id).not.toBe(entregaId)
    expect(trabajo?.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(trabajo?.datos).toEqual({
      entregaId,
      tareaId: e.tareaId,
      claseId: e.claseId,
      version: 2,
    })
    expect(await comentariosDelHilo(e)).toEqual({ maestro: [], alumno: [] })
  })

  it("CAL-1A09: con comentario, el comentario del maestro entra al hilo de esa entrega (lo ven el maestro y el alumno) y no se encola ningún COMENTARIO_CREADO", async () => {
    const e = await escenario({ rubrica: RUBRICA, puntos: 10 })
    const entregaId = await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })

    const respuesta = await calificar(
      e,
      cuerpoConRubrica(e, [4, 5], {
        version: 1,
        comentario: "  Muy bien, revisa la fuente 2.\r\n",
      }),
    )

    expect(respuesta.statusCode, respuesta.body).toBe(200)
    expect(entregaDe(respuesta).calificacion?.puntos).toBe(10)
    const hilo = await comentariosDelHilo(e)
    expect(hilo.maestro).toHaveLength(1)
    expect(hilo.maestro[0]).toMatchObject({
      texto: "Muy bien, revisa la fuente 2.",
      autor: { id: e.maestro.id, administracion: false },
      propio: true,
    })
    expect(hilo.alumno.map((c) => ({ id: c.id, texto: c.texto, propio: c.propio }))).toEqual([
      { id: hilo.maestro[0]?.id, texto: "Muy bien, revisa la fuente 2.", propio: false },
    ])
    expect(await trabajosPorEntrega(COLA_COMENTARIO_CREADO, entregaId)).toEqual([])
    expect(await trabajosDeCalificacion(e.tareaId)).toHaveLength(1)
  })
})

describe("calificación directa y recalificar (CAL-1A10)", () => {
  it("CAL-1A10: sin rúbrica, la calificación directa se guarda tal cual; recalificar reemplaza calificación y fecha, sube la versión otra vez y encola otro aviso con otro id", async () => {
    const e = await escenario({ puntos: 80 })
    const entregaId = await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })

    const primera = await calificar(e, cuerpoDirecto(e, 72.5, { version: 1 }))
    expect(primera.statusCode, primera.body).toBe(200)
    expect(entregaDe(primera)).toMatchObject({
      version: 2,
      calificacion: { puntos: 72.5, sobre: 80, puntajes: [] },
    })
    const fechaPrimera = (await fotoDeCalificar(e)).entrega?.fechaCalificacion

    const segunda = await calificar(e, cuerpoDirecto(e, 75.25, { version: 2 }))
    expect(segunda.statusCode, segunda.body).toBe(200)
    expect(entregaDe(segunda)).toMatchObject({
      estado: "calificado",
      version: 3,
      calificacion: { puntos: 75.25, sobre: 80, puntajes: [] },
    })
    const foto = await fotoDeCalificar(e)
    expect(foto.entrega).toMatchObject({ calificacion: "75.25", version: 3 })
    expect(foto.entrega?.fechaCalificacion?.getTime()).toBeGreaterThanOrEqual(
      fechaPrimera?.getTime() ?? Number.POSITIVE_INFINITY,
    )
    expect(foto.puntajes).toEqual([])
    const trabajos = await trabajosDeCalificacion(e.tareaId)
    expect(trabajos.map((t) => t.datos)).toEqual([
      { entregaId, tareaId: e.tareaId, claseId: e.claseId, version: 2 },
      { entregaId, tareaId: e.tareaId, claseId: e.claseId, version: 3 },
    ])
    expect(new Set(trabajos.map((t) => t.id)).size).toBe(2)
  })

  it("CAL-1A10: recalificar con rúbrica reemplaza los puntajes", async () => {
    const e = await escenario({ rubrica: RUBRICA, puntos: 9 })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })
    const [c1, c2] = e.criterios
    if (c1 === undefined || c2 === undefined) throw new Error("Precondición: dos criterios")

    expect((await calificar(e, cuerpoConRubrica(e, [1, 2], { version: 1 }))).statusCode).toBe(200)
    const segunda = await calificar(e, cuerpoConRubrica(e, [2.5, 4.75], { version: 2 }))

    expect(segunda.statusCode, segunda.body).toBe(200)
    expect(entregaDe(segunda).calificacion).toMatchObject({
      puntos: 7.25,
      puntajes: [
        { criterioId: c1, puntos: 2.5 },
        { criterioId: c2, puntos: 4.75 },
      ],
    })
    const foto = await fotoDeCalificar(e)
    expect(foto.puntajes).toHaveLength(2)
    expect(Object.fromEntries(foto.puntajes.map((p) => [p.criterioId, p.puntos]))).toEqual({
      [c1]: "2.5",
      [c2]: "4.75",
    })
    expect(await trabajosDeCalificacion(e.tareaId)).toHaveLength(2)
  })
})

describe("versión vieja (CAL-1A11)", () => {
  it("CAL-1A11: con una versión vieja responde 409 ENTREGA_MODIFICADA sin escribir nada: entrega, puntajes, comentarios y trabajos iguales", async () => {
    const e = await escenario({ rubrica: RUBRICA, puntos: 10 })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id, version: 1 })
    expect((await calificar(e, cuerpoConRubrica(e, [1, 1], { version: 1 }))).statusCode).toBe(200)
    const antes = await fotoDeCalificar(e)

    for (const version of [1, 0, 3]) {
      const respuesta = await calificar(
        e,
        cuerpoConRubrica(e, [4, 5], { version, comentario: "No debe quedar" }),
      )
      expect(respuesta.statusCode, respuesta.body).toBe(409)
      expect(codigoDe(respuesta)).toBe("ENTREGA_MODIFICADA")
      expect(mensajeDe(respuesta)).toBe(
        "La entrega cambió mientras la calificabas: el alumno la anuló o la volvió a entregar, u otra persona la calificó. No se guardó tu calificación; revisa la entrega actual.",
      )
    }

    expect(await fotoDeCalificar(e)).toEqual(antes)
  })
})

describe("estados con P-03 (c′) (CAL-1A13)", () => {
  it("CAL-1A13: una asignada sin vencer, sin fila y con fila, responde 409 ENTREGA_NO_CALIFICABLE sin crear fila ni escribir", async () => {
    const e = await escenario({ puntos: 10, aceptaTardias: false })

    const sinFila = await calificar(e, cuerpoDirecto(e, 5, { version: 0 }))
    expect(sinFila.statusCode, sinFila.body).toBe(409)
    expect(codigoDe(sinFila)).toBe("ENTREGA_NO_CALIFICABLE")
    expect(mensajeDe(sinFila)).toBe(
      "Este alumno todavía puede entregar. Podrás calificarlo cuando entregue o cuando se cierre la entrega.",
    )
    expect(await contarEntregasDeTarea(e.tareaId)).toBe(0)

    await crearEntregaDePrueba({
      tareaId: e.tareaId,
      alumnoId: e.alumno.id,
      estado: "asignado",
      version: 2,
    })
    const antes = await fotoDeCalificar(e)
    const conFila = await calificar(e, cuerpoDirecto(e, 5, { version: 2 }))
    expect(conFila.statusCode, conFila.body).toBe(409)
    expect(codigoDe(conFila)).toBe("ENTREGA_NO_CALIFICABLE")
    expect(await fotoDeCalificar(e)).toEqual(antes)
    expect(await trabajosDeCalificacion(e.tareaId)).toEqual([])
  })

  it("CAL-1A13: con (c′), una vencida en una tarea que acepta tardías responde 409 ENTREGA_NO_CALIFICABLE sin crear fila", async () => {
    const e = await escenario({
      puntos: 10,
      fechaLimite: new Date(Date.now() - 2 * HORA_MS),
      aceptaTardias: true,
    })

    const respuesta = await calificar(e, cuerpoDirecto(e, 0, { version: 0 }))

    expect(respuesta.statusCode, respuesta.body).toBe(409)
    expect(codigoDe(respuesta)).toBe("ENTREGA_NO_CALIFICABLE")
    expect(await contarEntregasDeTarea(e.tareaId)).toBe(0)
    expect(await trabajosDeCalificacion(e.tareaId)).toEqual([])
  })

  it("CAL-1A13: sin fila, vencida en una tarea que no acepta tardías, responde 200 y deja la fila calificada sin fecha de entrega; después el alumno recibe 409 ENTREGA_CALIFICADA al entregar, anular y subir, y ve su calificación", async () => {
    const e = await escenario({
      puntos: 10,
      fechaLimite: new Date(Date.now() - 2 * HORA_MS),
      aceptaTardias: false,
    })

    const respuesta = await calificar(e, cuerpoDirecto(e, 0, { version: 0 }))

    expect(respuesta.statusCode, respuesta.body).toBe(200)
    expect(entregaDe(respuesta)).toMatchObject({
      estado: "calificado",
      fechaEntrega: null,
      conRetraso: false,
      enlaces: [],
      version: 1,
      calificacion: { puntos: 0, sobre: 10, puntajes: [] },
    })
    expect(await leerEntregaDb(e.tareaId, e.alumno.id)).toMatchObject({
      estado: "calificado",
      fechaEntrega: null,
      version: 1,
    })

    const base = `/api/clases/${e.claseId}/tareas/${e.tareaId}/entrega`
    const entregar = await pedir(e.tokens.alumno, "POST", base, {
      enlaces: ["https://ejemplo.com/tarde"],
    })
    const anular = await pedir(e.tokens.alumno, "POST", `${base}/anular`)
    const subir = await pedir(e.tokens.alumno, "POST", `${base}/archivos`, {
      nombre: "tarde.pdf",
      tipo: "application/pdf",
      tamano: 100,
    })
    for (const r of [entregar, anular, subir]) {
      expect(r.statusCode, r.body).toBe(409)
      expect(codigoDe(r)).toBe("ENTREGA_CALIFICADA")
    }
    const mia = await pedir(e.tokens.alumno, "GET", base)
    expect(mia.statusCode, mia.body).toBe(200)
    expect(miEntregaRespuestaSchema.parse(mia.json()).entrega).toMatchObject({
      estado: "calificado",
      fechaEntrega: null,
      puedeEntregar: false,
      puedeAnular: false,
      calificacion: { puntos: 0, sobre: 10, puntajes: [] },
    })
    expect(mia.body).not.toMatch(/"version"/)
  })

  it("CAL-1A13: una entregada y una calificada son calificables aunque la tarea no haya vencido", async () => {
    const e = await escenario({ puntos: 10 })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })
    expect((await calificar(e, cuerpoDirecto(e, 6, { version: 1 }))).statusCode).toBe(200)
    expect((await calificar(e, cuerpoDirecto(e, 7, { version: 2 }))).statusCode).toBe(200)
  })
})

describe("validación por la API (CAL-1A14)", () => {
  it("CAL-1A14: un criterio fuera de su rango y una calificación directa mayor que los puntos responden 400 con el prefijo del campo, sin escribir ni encolar", async () => {
    const conRubrica = await escenario({ rubrica: RUBRICA, puntos: 10 })
    await crearEntregaDePrueba({ tareaId: conRubrica.tareaId, alumnoId: conRubrica.alumno.id })
    const antes = await fotoDeCalificar(conRubrica)
    const [c1, c2] = conRubrica.criterios
    if (c1 === undefined || c2 === undefined) throw new Error("Precondición: dos criterios")

    const fuera = await calificar(conRubrica, {
      version: 1,
      puntosDeLaTarea: 10,
      // c2 (máximo 5) va primero en el cuerpo.
      puntajes: [
        { criterioId: c2, puntos: 5.01 },
        { criterioId: c1, puntos: 1 },
      ],
      calificacion: null,
    })
    expect(fuera.statusCode, fuera.body).toBe(400)
    expect(mensajeDe(fuera)).toBe("puntajes.0.puntos: Escribe de 0 a 5 puntos.")
    expect(await fotoDeCalificar(conRubrica)).toEqual(antes)

    const sinRubrica = await escenario({ puntos: 80 })
    await crearEntregaDePrueba({ tareaId: sinRubrica.tareaId, alumnoId: sinRubrica.alumno.id })
    const antesDirecta = await fotoDeCalificar(sinRubrica)
    const directa = await calificar(sinRubrica, cuerpoDirecto(sinRubrica, 80.5, { version: 1 }))
    expect(directa.statusCode, directa.body).toBe(400)
    expect(mensajeDe(directa)).toBe("calificacion: Escribe de 0 a 80 puntos.")
    expect(await fotoDeCalificar(sinRubrica)).toEqual(antesDirecta)
  })

  it("CAL-1A14: la forma que no corresponde y los puntos vistos distintos responden 409 RUBRICA_MODIFICADA, sin escribir ni encolar", async () => {
    const e = await escenario({ rubrica: RUBRICA, puntos: 10 })
    const otra = await escenario({ rubrica: RUBRICA, puntos: 10 })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })
    const antes = await fotoDeCalificar(e)
    const [c1] = e.criterios
    const [deOtra] = otra.criterios
    if (c1 === undefined || deOtra === undefined) throw new Error("Precondición: criterios")

    const cuerpos = [
      // Un criterio de otra tarea.
      {
        version: 1,
        puntosDeLaTarea: 10,
        puntajes: [
          { criterioId: c1, puntos: 1 },
          { criterioId: deOtra, puntos: 1 },
        ],
        calificacion: null,
      },
      // Un criterio de menos.
      {
        version: 1,
        puntosDeLaTarea: 10,
        puntajes: [{ criterioId: c1, puntos: 1 }],
        calificacion: null,
      },
      // Calificación directa en una tarea con rúbrica.
      { version: 1, puntosDeLaTarea: 10, puntajes: [], calificacion: 5 },
      // Puntos vistos distintos, con la forma correcta y valores en rango.
      cuerpoConRubrica(e, [1, 1], { version: 1, puntosDeLaTarea: 100 }),
    ]
    for (const cuerpo of cuerpos) {
      const respuesta = await calificar(e, cuerpo)
      expect(respuesta.statusCode, respuesta.body).toBe(409)
      expect(codigoDe(respuesta)).toBe("RUBRICA_MODIFICADA")
    }
    expect(await fotoDeCalificar(e)).toEqual(antes)

    const sinRubrica = await escenario({ puntos: 10 })
    await crearEntregaDePrueba({ tareaId: sinRubrica.tareaId, alumnoId: sinRubrica.alumno.id })
    // El "9 de 10" que se guardaría como "9 de 100".
    const vistos = await calificar(
      sinRubrica,
      cuerpoDirecto(sinRubrica, 9, { version: 1, puntosDeLaTarea: 100 }),
    )
    expect(vistos.statusCode, vistos.body).toBe(409)
    expect(codigoDe(vistos)).toBe("RUBRICA_MODIFICADA")
    expect(await trabajosDeCalificacion(sinRubrica.tareaId)).toEqual([])
  })

  it("CAL-1A14: un cuerpo con llaves de más, sin version o sin puntosDeLaTarea, con version negativa o decimal, o con puntajes repetidos responde 400 sin escribir ni encolar", async () => {
    const e = await escenario({ rubrica: RUBRICA, puntos: 10 })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })
    const antes = await fotoDeCalificar(e)
    const [c1] = e.criterios
    if (c1 === undefined) throw new Error("Precondición: un criterio")
    const valido = cuerpoConRubrica(e, [1, 1], { version: 1 })
    const sin = (llave: string) => {
      const copia = { ...valido }
      delete copia[llave]
      return copia
    }

    const cuerpos: unknown[] = [
      { ...valido, extra: true },
      sin("version"),
      sin("puntosDeLaTarea"),
      sin("puntajes"),
      sin("calificacion"),
      { ...valido, version: -1 },
      { ...valido, version: 1.5 },
      { ...valido, version: "1" },
      {
        ...valido,
        puntajes: [
          { criterioId: c1, puntos: 1 },
          { criterioId: c1.toUpperCase(), puntos: 1 },
        ],
      },
      { ...valido, comentario: "" },
      [valido],
    ]
    for (const cuerpo of cuerpos) {
      const respuesta = await obtenerApp().inject({
        method: "PUT",
        url: urlDeCalificar(e),
        payload: JSON.stringify(cuerpo),
        headers: {
          authorization: `Bearer ${e.tokens.maestro}`,
          "content-type": "application/json",
        },
      })
      expect(respuesta.statusCode, `${JSON.stringify(cuerpo)} → ${respuesta.body}`).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
    }
    expect(await fotoDeCalificar(e)).toEqual(antes)
  })
})

describe("borrado confirmado del admin con calificaciones hechas por la API (CAL-1A19)", () => {
  it("CAL-1A19: el admin borra con ?confirmar=entregas una tarea con rúbrica, dos entregas calificadas por la API (con puntajes y un comentario de devolución), una entregada y archivos de entrega: 204 y no queda nada", async () => {
    const e = await escenario({ rubrica: RUBRICA, puntos: 10 })
    const otraAlumna = await crearAlumnoDePrueba(idsUsuarios, { nombre: "Segunda Calificada" })
    const tercera = await crearAlumnoDePrueba(idsUsuarios, { nombre: "Tercera Entregada" })
    await inscribirDePrueba(e.claseId, otraAlumna.id)
    await inscribirDePrueba(e.claseId, tercera.id)
    const archivos: string[] = []
    for (const alumnoId of [e.alumno.id, otraAlumna.id, tercera.id]) {
      const entregaId = await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId })
      archivos.push(
        (
          await crearArchivoDeEntregaDePrueba({
            claseId: e.claseId,
            tareaId: e.tareaId,
            alumnoId,
            estado: "confirmado",
            entregaId,
          })
        ).id,
      )
    }
    const primera = await calificar(
      e,
      cuerpoConRubrica(e, [3, 4], { version: 1, comentario: "Revisa la conclusión" }),
    )
    expect(primera.statusCode, primera.body).toBe(200)
    const segunda = await pedir(
      e.tokens.otroMaestro,
      "PUT",
      urlDeCalificar(e, otraAlumna.id),
      cuerpoConRubrica(e, [4, 5], { version: 1 }),
    )
    expect(segunda.statusCode, segunda.body).toBe(200)
    expect(
      await obtenerDb().puntajeRubrica.count({ where: { entrega: { tareaId: e.tareaId } } }),
    ).toBe(4)

    const borrado = await pedir(
      e.tokens.admin,
      "DELETE",
      `/api/clases/${e.claseId}/tareas/${e.tareaId}?confirmar=entregas`,
    )

    expect(borrado.statusCode, borrado.body).toBe(204)
    const db = obtenerDb()
    expect(await db.tarea.count({ where: { id: e.tareaId } })).toBe(0)
    expect(await db.criterioRubrica.count({ where: { tareaId: e.tareaId } })).toBe(0)
    expect(await db.entrega.count({ where: { tareaId: e.tareaId } })).toBe(0)
    expect(await db.puntajeRubrica.count({ where: { criterioId: { in: e.criterios } } })).toBe(0)
    expect(await db.comentario.count({ where: { entrega: { tareaId: e.tareaId } } })).toBe(0)
    expect(
      await db.archivo.findMany({
        where: { id: { in: archivos } },
        select: { estado: true, entregaId: true, publicacionId: true },
      }),
    ).toEqual(archivos.map(() => ({ estado: "descartado", entregaId: null, publicacionId: null })))
  })
})
