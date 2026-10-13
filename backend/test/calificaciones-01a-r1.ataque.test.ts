import { randomUUID } from "node:crypto"

import {
  entregaDeAlumnoRespuestaSchema,
  errorApiSchema,
  listaComentariosPrivadosRespuestaSchema,
  listaEntregasRespuestaSchema,
  miEntregaRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba } from "./ayudas-auth.js"
import {
  codigoDe,
  crearEscenarioDeCalificar,
  cuerpoConRubrica,
  cuerpoDirecto,
  fotoDeCalificar,
  HORA_MS,
  idsDeCriterios,
  pedirEn,
  trabajosDeCalificacion,
  urlDeCalificar,
  type CriterioDePrueba,
  type EscenarioDeCalificar,
  type OpcionesEscenarioDeCalificar,
} from "./ayudas-calificaciones.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"
import { crearEntregaDePrueba } from "./ayudas-entregas.js"
import { crearTareaDePrueba, cuerpoDeTarea } from "./ayudas-tareas.js"

// Ataques del Tester, CALIFICACIONES-01a ronda 1, por HTTP: lo que cuenta como "entregó" con P-03 (c′)
// (RF-35), la versión y los números del cuerpo en texto crudo (-0, 1e400, 2^53), la escala y el
// redondeo con rúbricas cuyo máximo no divide los puntos, la fila perezosa del hilo, la rúbrica
// congelada con espacios o mayúsculas, el aislamiento del comentario de devolución frente al muro y
// las fugas. Cada respuesta de este archivo pasa por sinFuga en el mismo caso que la pide (no depende
// del orden de los casos, N-17). Las fechas límite llevan al menos 2 h de margen respecto del reloj.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen: crearAlmacenEnMemoria() })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const FUGA = /estadoPago|fechaEstadoPago|accesoRestringido|motivoRestriccion|email|"rol"|deudor|@/i

const sinFuga = (respuesta: LightMyRequestResponse): LightMyRequestResponse => {
  expect(
    respuesta.body,
    "la respuesta filtra estado de pago, restricción, correo o rol",
  ).not.toMatch(FUGA)
  return respuesta
}

const pedirSinRevisar = pedirEn(obtenerApp)
const pedir: typeof pedirSinRevisar = async (...args) => sinFuga(await pedirSinRevisar(...args))

// Un cuerpo JSON escrito a mano: JSON.stringify convierte -0 en 0 y no puede escribir 1e400 ni 2^53
// con todos sus dígitos tal como los mandaría otro cliente.
const pedirCrudo = async (
  token: string,
  method: "PUT" | "POST",
  url: string,
  texto: string,
): Promise<LightMyRequestResponse> =>
  sinFuga(
    await obtenerApp().inject({
      method,
      url,
      payload: texto,
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    }),
  )

const escenario = (opciones: OpcionesEscenarioDeCalificar = {}) =>
  crearEscenarioDeCalificar(idsUsuarios, idsClases, {
    ficha: randomUUID().slice(0, 6),
    ...opciones,
  })

// Una tarea cerrada: vencida y sin entregas con retraso (P-03 c′: se califica a quien no entregó).
const CERRADA = { fechaLimite: new Date(Date.now() - 2 * HORA_MS), aceptaTardias: false }

const RUBRICA: CriterioDePrueba[] = [
  { criterio: "Claridad", puntosMax: 4 },
  { criterio: "Contenido", puntosMax: 5 },
]

const calificar = (
  e: EscenarioDeCalificar,
  cuerpo: Record<string, unknown>,
  token = e.tokens.maestro,
  alumnoId = e.alumno.id,
) => pedir(token, "PUT", urlDeCalificar(e, alumnoId), cuerpo)

const conEstado = (respuesta: LightMyRequestResponse, estado: number, codigo?: string) => {
  expect(respuesta.statusCode, respuesta.body).toBe(estado)
  if (codigo !== undefined) expect(codigoDe(respuesta)).toBe(codigo)
  return respuesta
}

const calificacionEnDb = async (e: EscenarioDeCalificar, alumnoId = e.alumno.id) => {
  const fila = await obtenerDb().entrega.findUnique({
    where: { tareaId_alumnoId: { tareaId: e.tareaId, alumnoId } },
    select: { calificacion: true, version: true, estado: true },
  })
  if (fila === null) throw new Error("Precondición: existe la fila de la entrega")
  return { ...fila, calificacion: fila.calificacion?.toString() ?? null }
}

const urlTarea = (e: EscenarioDeCalificar) => `/api/clases/${e.claseId}/tareas/${e.tareaId}`

// El cuerpo del PUT de la tarea con lo que tiene hoy y los cambios pedidos.
const cuerpoDeEdicion = async (
  e: EscenarioDeCalificar,
  rubrica: readonly CriterioDePrueba[],
  cambios: Record<string, unknown> = {},
) => {
  const tarea = await obtenerDb().tarea.findUnique({
    where: { id: e.tareaId },
    select: { version: true, fechaLimite: true, puntos: true, aceptaTardias: true },
  })
  if (tarea === null) throw new Error("Precondición: existe la tarea")
  return cuerpoDeTarea({
    version: tarea.version,
    fechaLimite: tarea.fechaLimite.toISOString(),
    puntos: tarea.puntos,
    aceptaTardias: tarea.aceptaTardias,
    rubrica,
    archivoIds: [],
    ...cambios,
  })
}

describe("ataque CALIFICACIONES-01a r1: quién entregó con P-03 (c′) (RF-35)", () => {
  it("CAL-T-01: calificar en cero a quien no entregó no lo cuenta entre quienes entregaron: en la lista de entregas, entregadas cuenta solo a la alumna que sí entregó", async () => {
    const e = await escenario({ puntos: 10, ...CERRADA })
    const entrego = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Alumna Que Entrego T01` })
    await inscribirDePrueba(e.claseId, entrego.id)
    await crearEntregaDePrueba({
      tareaId: e.tareaId,
      alumnoId: entrego.id,
      fechaEntrega: new Date(Date.now() - 3 * HORA_MS),
    })

    // La que no entregó, en cero (entrega cerrada); la que entregó, con 9.
    conEstado(await calificar(e, cuerpoDirecto(e, 0, { version: 0 })), 200)
    conEstado(await calificar(e, cuerpoDirecto(e, 9, { version: 1 }), undefined, entrego.id), 200)

    const lista = conEstado(await pedir(e.tokens.maestro, "GET", `${urlTarea(e)}/entregas`), 200)
    const datos = listaEntregasRespuestaSchema.parse(lista.json())
    const sinEntregar = datos.entregas.find((fila) => fila.alumno.id === e.alumno.id)
    expect(sinEntregar).toMatchObject({ estado: "calificado", fechaEntrega: null })
    expect(datos.total).toBe(2)
    // RF-35: "quiénes entregaron y quiénes no". La alumna en cero nunca entregó.
    expect(datos.entregadas, "una calificada sin entrega se cuenta como entregada").toBe(1)
  })
})

describe("ataque CALIFICACIONES-01a r1: la versión del cuerpo", () => {
  it("CAL-T-02: la versión como texto, decimal, negativa, 1e400, 2^53 y 2^31 no escriben ni encolan y nunca son 500; la misma versión en dos pestañas del mismo maestro da un 200 y un 409", async () => {
    const e = await escenario({ puntos: 10 })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id, version: 1 })
    const antes = await fotoDeCalificar(e)

    const resto = '"puntosDeLaTarea":10,"puntajes":[],"calificacion":8'
    const crudos: { texto: string; estados: number[] }[] = [
      { texto: `{"version":"1",${resto}}`, estados: [400] },
      { texto: `{"version":1.5,${resto}}`, estados: [400] },
      { texto: `{"version":-1,${resto}}`, estados: [400] },
      { texto: `{"version":1e400,${resto}}`, estados: [400] },
      { texto: `{"version":9007199254740993,${resto}}`, estados: [400, 409] },
      { texto: `{"version":2147483648,${resto}}`, estados: [409] },
      { texto: `{"version":null,${resto}}`, estados: [400] },
    ]
    for (const { texto, estados } of crudos) {
      const r = await pedirCrudo(e.tokens.maestro, "PUT", urlDeCalificar(e), texto)
      expect(estados, `${texto} → ${String(r.statusCode)} ${r.body}`).toContain(r.statusCode)
      expect(errorApiSchema.safeParse(r.json()).success, r.body).toBe(true)
    }
    expect(await fotoDeCalificar(e)).toEqual(antes)

    // Dos pestañas del mismo maestro, la misma versión, una tras otra.
    conEstado(await calificar(e, cuerpoDirecto(e, 8, { version: 1 })), 200)
    conEstado(await calificar(e, cuerpoDirecto(e, 3, { version: 1 })), 409, "ENTREGA_MODIFICADA")
    expect(await calificacionEnDb(e)).toMatchObject({ calificacion: "8", version: 2 })
    expect(await trabajosDeCalificacion(e.tareaId)).toHaveLength(1)
  })

  it("CAL-T-03: en texto crudo, la versión 1.0 vale como 1 y -0 como 0 (sin fila, tarea cerrada)", async () => {
    const conFila = await escenario({ puntos: 10 })
    await crearEntregaDePrueba({ tareaId: conFila.tareaId, alumnoId: conFila.alumno.id })
    const uno = await pedirCrudo(
      conFila.tokens.maestro,
      "PUT",
      urlDeCalificar(conFila),
      '{"version":1.0,"puntosDeLaTarea":10.0,"puntajes":[],"calificacion":7}',
    )
    conEstado(uno, 200)
    expect(entregaDeAlumnoRespuestaSchema.parse(uno.json()).entrega.version).toBe(2)

    const sinFila = await escenario({ puntos: 10, ...CERRADA })
    const cero = await pedirCrudo(
      sinFila.tokens.maestro,
      "PUT",
      urlDeCalificar(sinFila),
      '{"version":-0,"puntosDeLaTarea":10,"puntajes":[],"calificacion":0}',
    )
    conEstado(cero, 200)
    expect(await calificacionEnDb(sinFila)).toMatchObject({ calificacion: "0", version: 1 })
  })
})

describe("ataque CALIFICACIONES-01a r1: forma del cuerpo y números", () => {
  it("CAL-T-04: un cuerpo que no es objeto (null, texto, número, vacío o JSON roto) responde 400 con el formato de error, sin escribir", async () => {
    const e = await escenario({ puntos: 10 })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })
    const antes = await fotoDeCalificar(e)

    for (const texto of ["null", '"hola"', "7", "", '{"version":1,', "[1,2]"]) {
      const r = await pedirCrudo(e.tokens.maestro, "PUT", urlDeCalificar(e), texto)
      expect(r.statusCode, `«${texto}» → ${r.body}`).toBe(400)
      expect(errorApiSchema.safeParse(r.json()).success, r.body).toBe(true)
    }
    expect(await fotoDeCalificar(e)).toEqual(antes)
  })

  it("CAL-T-05: -0 y 1e-2 se guardan como 0 y 0.01 (sin -0 en la respuesta); 0.1 + 0.2, 7.785, 0.001, texto, 1000.01 y 21 puntajes responden 400 sin escribir", async () => {
    const e = await escenario({ puntos: 10 })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id, version: 1 })

    const menosCero = await pedirCrudo(
      e.tokens.maestro,
      "PUT",
      urlDeCalificar(e),
      '{"version":1,"puntosDeLaTarea":10,"puntajes":[],"calificacion":-0}',
    )
    conEstado(menosCero, 200)
    const puntos = entregaDeAlumnoRespuestaSchema.parse(menosCero.json()).entrega.calificacion
      ?.puntos
    expect(puntos).toBe(0)
    expect(Object.is(puntos, -0), "la respuesta devuelve -0").toBe(false)
    expect(await calificacionEnDb(e)).toMatchObject({ calificacion: "0", version: 2 })

    const centesima = await pedirCrudo(
      e.tokens.maestro,
      "PUT",
      urlDeCalificar(e),
      '{"version":2,"puntosDeLaTarea":10,"puntajes":[],"calificacion":1e-2}',
    )
    conEstado(centesima, 200)
    expect(await calificacionEnDb(e)).toMatchObject({ calificacion: "0.01", version: 3 })

    const antes = await fotoDeCalificar(e)
    for (const valor of ["0.30000000000000004", "7.785", "0.001", '"8"', "1000.01", "10.001"]) {
      const r = await pedirCrudo(
        e.tokens.maestro,
        "PUT",
        urlDeCalificar(e),
        `{"version":3,"puntosDeLaTarea":10,"puntajes":[],"calificacion":${valor}}`,
      )
      expect(r.statusCode, `${valor} → ${r.body}`).toBe(400)
      expect(codigoDe(r)).toBe("VALIDACION")
    }
    const veintiuno = Array.from({ length: 21 }, () => ({ criterioId: randomUUID(), puntos: 1 }))
    conEstado(
      await calificar(e, cuerpoDirecto(e, 5, { version: 3, puntajes: veintiuno })),
      400,
      "VALIDACION",
    )
    expect(await fotoDeCalificar(e)).toEqual(antes)
  })

  it("CAL-T-06: los criterios de otra tarea de la misma clase, con la misma forma, responden 409 RUBRICA_MODIFICADA sin escribir ni encolar", async () => {
    const e = await escenario({ rubrica: RUBRICA, puntos: 10 })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })
    const otraTarea = await crearTareaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      puntos: 10,
    })
    await obtenerDb().criterioRubrica.createMany({
      data: RUBRICA.map((c, orden) => ({ tareaId: otraTarea, ...c, orden })),
    })
    const ajenos = await idsDeCriterios(otraTarea)
    expect(ajenos).toHaveLength(2)
    const antes = await fotoDeCalificar(e)

    const r = await calificar(
      e,
      cuerpoConRubrica(e, [3, 4], {
        version: 1,
        puntajes: ajenos.map((criterioId, i) => ({ criterioId, puntos: [3, 4][i] })),
      }),
    )

    conEstado(r, 409, "RUBRICA_MODIFICADA")
    expect(await fotoDeCalificar(e)).toEqual(antes)
    expect(await obtenerDb().puntajeRubrica.count({ where: { criterioId: { in: ajenos } } })).toBe(
      0,
    )
  })
})

// Un criterio de prueba a partir de su máximo.
const criterios = (puntosMax: number, i: number): CriterioDePrueba => ({
  criterio: `Criterio ${String(i + 1)}`,
  puntosMax,
})

describe("ataque CALIFICACIONES-01a r1: escala y redondeo por la API", () => {
  it("CAL-T-07: con máximos que no dividen los puntos de la tarea, la calificación guardada y la respondida son la centésima más cercana, con las mitades hacia arriba", async () => {
    const casos: {
      rubrica: CriterioDePrueba[]
      puntos: number
      dados: number[]
      esperada: string
    }[] = [
      { rubrica: [3, 3, 3].map(criterios), puntos: 10, dados: [1, 1, 1], esperada: "3.33" },
      { rubrica: [3, 3, 3].map(criterios), puntos: 10, dados: [1, 0, 0], esperada: "1.11" },
      { rubrica: [3, 3, 3].map(criterios), puntos: 10, dados: [2, 2, 1], esperada: "5.56" },
      // 0.01 de 2 sobre 1 = 0.005: la mitad sube.
      { rubrica: [2].map(criterios), puntos: 1, dados: [0.01], esperada: "0.01" },
      // 0.01 de 8 sobre 1 = 0.00125: baja.
      { rubrica: [8].map(criterios), puntos: 1, dados: [0.01], esperada: "0" },
      { rubrica: [3].map(criterios), puntos: 100, dados: [2.99], esperada: "99.67" },
      { rubrica: [1000].map(criterios), puntos: 1000, dados: [999.99], esperada: "999.99" },
      // 20 criterios de 50 (1000 puntos de rúbrica) sobre una tarea de 1 punto.
      {
        rubrica: Array.from({ length: 20 }, () => 50).map(criterios),
        puntos: 1,
        dados: Array.from({ length: 20 }, () => 50),
        esperada: "1",
      },
      {
        rubrica: Array.from({ length: 20 }, () => 50).map(criterios),
        puntos: 1,
        dados: [...Array.from({ length: 19 }, () => 50), 44.99],
        esperada: "0.99",
      },
    ]
    for (const caso of casos) {
      const e = await escenario({ rubrica: caso.rubrica, puntos: caso.puntos })
      await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })
      const r = await calificar(e, cuerpoConRubrica(e, caso.dados, { version: 1 }))
      const etiqueta = `${caso.dados.join("+")} de ${caso.rubrica.map((c) => c.puntosMax).join("+")} sobre ${String(caso.puntos)}`
      expect(r.statusCode, `${etiqueta}: ${r.body}`).toBe(200)
      expect((await calificacionEnDb(e)).calificacion, etiqueta).toBe(caso.esperada)
      expect(entregaDeAlumnoRespuestaSchema.parse(r.json()).entrega.calificacion?.puntos).toBe(
        Number(caso.esperada),
      )
    }
  }, 60_000)
})

describe("ataque CALIFICACIONES-01a r1: calificar sin entrega (P-03 c′)", () => {
  it("CAL-T-08: la fila asignado que creó un comentario de la alumna en el hilo se califica con la versión que da la lectura del maestro, y el hilo se conserva", async () => {
    const e = await escenario({ puntos: 10, ...CERRADA })
    const comentario = await pedir(e.tokens.alumno, "POST", `${urlTarea(e)}/entrega/comentarios`, {
      texto: "No pude entregar a tiempo",
    })
    conEstado(comentario, 201)
    const fila = await obtenerDb().entrega.findUnique({
      where: { tareaId_alumnoId: { tareaId: e.tareaId, alumnoId: e.alumno.id } },
      select: { estado: true, version: true },
    })
    expect(fila, "Precondición: el comentario crea la fila perezosa").toEqual({
      estado: "asignado",
      version: 0,
    })
    const lectura = conEstado(
      await pedir(e.tokens.maestro, "GET", `${urlTarea(e)}/entregas/${e.alumno.id}`),
      200,
    )
    const { version } = entregaDeAlumnoRespuestaSchema.parse(lectura.json()).entrega

    const r = await calificar(e, cuerpoDirecto(e, 0, { version, comentario: "Sin entrega" }))

    conEstado(r, 200)
    expect(entregaDeAlumnoRespuestaSchema.parse(r.json()).entrega).toMatchObject({
      estado: "calificado",
      fechaEntrega: null,
      conRetraso: false,
      enlaces: [],
      version: 1,
    })
    const hilo = conEstado(
      await pedir(e.tokens.alumno, "GET", `${urlTarea(e)}/entrega/comentarios`),
      200,
    )
    expect(
      listaComentariosPrivadosRespuestaSchema.parse(hilo.json()).comentarios.map((c) => c.texto),
    ).toEqual(expect.arrayContaining(["No pude entregar a tiempo", "Sin entrega"]))
  })

  it("CAL-T-09: tras calificar sin entrega, reabrir la tarea (fecha futura y acepta tardías) se guarda, la alumna sigue sin poder entregar (409 ENTREGA_CALIFICADA) y recalificar funciona", async () => {
    const e = await escenario({ puntos: 10, ...CERRADA })
    conEstado(await calificar(e, cuerpoDirecto(e, 0, { version: 0 })), 200)

    const reabrir = await cuerpoDeEdicion(e, [], {
      fechaLimite: new Date(Date.now() + 72 * HORA_MS).toISOString(),
      aceptaTardias: true,
    })
    conEstado(await pedir(e.tokens.maestro, "PUT", urlTarea(e), reabrir), 200)

    const entregar = await pedir(e.tokens.alumno, "POST", `${urlTarea(e)}/entrega`, {
      enlaces: ["https://ejemplo.com/tarde"],
    })
    conEstado(entregar, 409, "ENTREGA_CALIFICADA")
    const mia = conEstado(await pedir(e.tokens.alumno, "GET", `${urlTarea(e)}/entrega`), 200)
    expect(miEntregaRespuestaSchema.parse(mia.json()).entrega).toMatchObject({
      estado: "calificado",
      puedeEntregar: false,
      puedeAnular: false,
      calificacion: { puntos: 0, sobre: 10, puntajes: [] },
    })
    conEstado(await calificar(e, cuerpoDirecto(e, 6, { version: 1 })), 200)
    expect(await calificacionEnDb(e)).toMatchObject({ calificacion: "6", version: 2 })
  })
})

describe("ataque CALIFICACIONES-01a r1: rúbrica congelada (P-04)", () => {
  it("CAL-T-10: con calificaciones, la misma rúbrica con espacios de más en los extremos es idéntica (200 y los mismos ids); con otra capitalización no lo es (409 sin escribir)", async () => {
    const e = await escenario({ rubrica: RUBRICA, puntos: 10 })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })
    conEstado(await calificar(e, cuerpoConRubrica(e, [3, 4], { version: 1 })), 200)

    const conEspacios = await cuerpoDeEdicion(e, [
      { criterio: "  Claridad \r\n", puntosMax: 4 },
      { criterio: "\tContenido  ", puntosMax: 5 },
    ])
    conEstado(await pedir(e.tokens.maestro, "PUT", urlTarea(e), conEspacios), 200)
    expect(await idsDeCriterios(e.tareaId)).toEqual(e.criterios)

    const antes = await obtenerDb().tarea.findUnique({
      where: { id: e.tareaId },
      select: { version: true, puntos: true },
    })
    const conMayusculas = await cuerpoDeEdicion(e, [
      { criterio: "CLARIDAD", puntosMax: 4 },
      { criterio: "Contenido", puntosMax: 5 },
    ])
    conEstado(
      await pedir(e.tokens.maestro, "PUT", urlTarea(e), conMayusculas),
      409,
      "TAREA_CON_CALIFICACIONES",
    )
    expect(await idsDeCriterios(e.tareaId)).toEqual(e.criterios)
    expect(
      await obtenerDb().tarea.findUnique({
        where: { id: e.tareaId },
        select: { version: true, puntos: true },
      }),
    ).toEqual(antes)
    expect((await fotoDeCalificar(e)).puntajes).toHaveLength(2)
  })

  it("CAL-T-11: con calificaciones, cambiar solo si acepta tardías o cómo se entrega se guarda; cambiar solo los puntos es 409 (y el admin recibe 403 por autoría, sin revelar nada); omitir la rúbrica en el cuerpo es vaciarla (409)", async () => {
    const e = await escenario({ rubrica: RUBRICA, puntos: 10 })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })
    conEstado(await calificar(e, cuerpoConRubrica(e, [3, 4], { version: 1 })), 200)

    const otrasReglas = await cuerpoDeEdicion(e, RUBRICA, {
      aceptaTardias: false,
      requiereAdjuntos: false,
    })
    conEstado(await pedir(e.tokens.maestro, "PUT", urlTarea(e), otrasReglas), 200)

    // La autora cambia los puntos sin tocar la rúbrica: 409 (el admin no edita lo de la autora que
    // sigue en la clase: 403 por autoría, antes del conteo).
    const otrosPuntos = await cuerpoDeEdicion(e, RUBRICA, { puntos: 20 })
    conEstado(
      await pedir(e.tokens.maestro, "PUT", urlTarea(e), otrosPuntos),
      409,
      "TAREA_CON_CALIFICACIONES",
    )
    conEstado(
      await pedir(e.tokens.admin, "PUT", urlTarea(e), otrosPuntos),
      403,
      "EDICION_NO_PERMITIDA",
    )
    const sinRubrica = await cuerpoDeEdicion(e, RUBRICA)
    delete sinRubrica.rubrica
    conEstado(
      await pedir(e.tokens.maestro, "PUT", urlTarea(e), sinRubrica),
      409,
      "TAREA_CON_CALIFICACIONES",
    )
    expect(await idsDeCriterios(e.tareaId)).toEqual(e.criterios)
    expect(await obtenerDb().tarea.findUnique({ where: { id: e.tareaId } })).toMatchObject({
      puntos: 10,
      aceptaTardias: false,
      requiereAdjuntos: false,
    })
  })
})

describe("ataque CALIFICACIONES-01a r1: el comentario de devolución frente al muro", () => {
  it("CAL-T-12: el comentario de devolución no cambia el muro, no se lista por la ruta de comentarios de la publicación de la tarea y no se borra por las rutas del muro", async () => {
    const e = await escenario({ puntos: 10 })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })
    const muro = `/api/clases/${e.claseId}/publicaciones`
    const muroAntes = conEstado(await pedir(e.tokens.maestro, "GET", muro), 200).body
    const texto = `Devolución única ${randomUUID()}`

    conEstado(await calificar(e, cuerpoDirecto(e, 8, { version: 1, comentario: texto })), 200)

    const devolucion = await obtenerDb().comentario.findFirst({
      where: { texto },
      select: { id: true, publicacionId: true, autorId: true },
    })
    if (devolucion === null) throw new Error("Precondición: el comentario de devolución existe")
    expect(devolucion).toMatchObject({ publicacionId: null, autorId: e.maestro.id })

    // El muro del maestro sigue idéntico y el de la alumna no trae el texto.
    expect(conEstado(await pedir(e.tokens.maestro, "GET", muro), 200).body).toBe(muroAntes)
    expect(conEstado(await pedir(e.tokens.alumno, "GET", muro), 200).body).not.toContain(texto)
    const deLaPublicacion = await pedir(e.tokens.maestro, "GET", `${muro}/${e.tareaId}/comentarios`)
    expect(deLaPublicacion.statusCode).toBeLessThan(500)
    expect(deLaPublicacion.body).not.toContain(texto)

    const borrados = [
      await pedir(e.tokens.maestro, "DELETE", `${muro}/${e.tareaId}/comentarios/${devolucion.id}`),
      await pedir(
        e.tokens.maestro,
        "DELETE",
        `/api/clases/${e.claseId}/mis-comentarios/${devolucion.id}`,
      ),
    ]
    for (const r of borrados) expect(r.statusCode, r.body).toBe(404)
    expect(await obtenerDb().comentario.count({ where: { id: devolucion.id } })).toBe(1)
  })

  it("CAL-T-13: un comentario de 1000 caracteres visibles pasa; 1001, solo invisibles o null responden 400 sin escribir ni encolar", async () => {
    const e = await escenario({ puntos: 10 })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })
    const antes = await fotoDeCalificar(e)
    for (const comentario of ["a".repeat(1001), "​​​", "   ", null, 7]) {
      const r = await calificar(e, cuerpoDirecto(e, 8, { version: 1, comentario }))
      expect(r.statusCode, `${JSON.stringify(comentario)} → ${r.body}`).toBe(400)
    }
    expect(await fotoDeCalificar(e)).toEqual(antes)

    const mil = "é".repeat(1000)
    conEstado(await calificar(e, cuerpoDirecto(e, 8, { version: 1, comentario: mil })), 200)
    // M-04: solo los de la tarea del escenario; hilo-privado.integracion escribe el mismo texto.
    expect(
      await obtenerDb().comentario.count({
        where: { texto: mil, entrega: { tareaId: e.tareaId } },
      }),
    ).toBe(1)
  })
})

describe("ataque CALIFICACIONES-01a r1: fugas", () => {
  it("CAL-T-14: con la alumna deudora (sin restricción), su lectura trae la calificación sin version; las lecturas y el hilo del maestro y del admin no traen correo, estado de pago ni rol", async () => {
    const e = await escenario({ rubrica: RUBRICA, puntos: 10 })
    await obtenerDb().usuario.update({
      where: { id: e.alumno.id },
      data: { estadoPago: "deudor" },
      select: { id: true },
    })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })
    conEstado(
      await calificar(e, cuerpoConRubrica(e, [4, 5], { version: 1, comentario: "Muy bien" })),
      200,
    )

    const mia = conEstado(await pedir(e.tokens.alumno, "GET", `${urlTarea(e)}/entrega`), 200)
    const entrega = miEntregaRespuestaSchema.parse(mia.json()).entrega
    expect(entrega.calificacion).toMatchObject({ puntos: 10, sobre: 10 })
    expect(Object.keys(entrega)).not.toContain("version")
    expect(mia.body).not.toMatch(/"version"/)

    for (const token of [e.tokens.maestro, e.tokens.admin]) {
      conEstado(await pedir(token, "GET", `${urlTarea(e)}/entregas/${e.alumno.id}`), 200)
      conEstado(
        await pedir(token, "GET", `${urlTarea(e)}/entregas/${e.alumno.id}/comentarios`),
        200,
      )
      conEstado(await pedir(token, "GET", `${urlTarea(e)}/entregas`), 200)
    }
    conEstado(await pedir(e.tokens.alumno, "GET", `${urlTarea(e)}/entrega/comentarios`), 200)
  })
})

describe("ataque CALIFICACIONES-01a r1: identificadores en la ruta", () => {
  it("CAL-T-22: con los ids de la ruta en mayúsculas, la calificación cae en la entrega correcta y el aviso lleva los ids en minúsculas, iguales a los de la base", async () => {
    const e = await escenario({ puntos: 10 })
    const entregaId = await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })
    const url = `/api/clases/${e.claseId.toUpperCase()}/tareas/${e.tareaId.toUpperCase()}/entregas/${e.alumno.id.toUpperCase()}/calificacion`

    conEstado(await pedir(e.tokens.maestro, "PUT", url, cuerpoDirecto(e, 8, { version: 1 })), 200)

    expect(await calificacionEnDb(e)).toMatchObject({ calificacion: "8", estado: "calificado" })
    const trabajos = await obtenerDb().$queryRaw<{ datos: unknown }[]>`
      SELECT data AS datos FROM pgboss.job
      WHERE name = 'CALIFICACION_PUBLICADA' AND data ->> 'entregaId' = ${entregaId}::text`
    expect(trabajos).toEqual([
      { datos: { entregaId, tareaId: e.tareaId, claseId: e.claseId, version: 2 } },
    ])
  })
})
