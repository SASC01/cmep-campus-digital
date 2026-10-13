import { randomUUID } from "node:crypto"

import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { leerGradebook, leerMisCalificaciones } from "../src/adapters/db/calificaciones.js"
import { obtenerDb } from "../src/adapters/db/cliente.js"
import { borrarTarea } from "../src/adapters/db/tareas.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { borrarUsuariosDePrueba, type UsuarioDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  idDelAdminDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"
import { crearEntregaDePrueba } from "./ayudas-entregas.js"
import {
  crearClaseDeGradebook,
  ejecutorEspiado,
  HORA_MS,
  inscribirAlumnoDePrueba,
  unaVezDespuesDe,
} from "./ayudas-gradebook.js"
import { crearCategoriaDePrueba, crearTareaDePrueba } from "./ayudas-tareas.js"

// CALIFICACIONES-01b (CAL-1B03, CAL-1B04). Las dos lecturas corren en una sola instantánea: un cursor
// borrado entre su comprobación y la página no deja una página vacía, y una calificación que llega en
// medio no deja un resumen distinto de las celdas (CAL-1B03). Y su número de sentencias no crece con
// los alumnos ni con las tareas (CAL-1B04). Las dos usan un doble del ejecutor que registra cada
// llamada a la base y, en CAL-1B03, mete una escritura de otra conexión después de una llamada
// concreta (como PR-FX). Nadie retiene bloqueos.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

beforeAll(async () => {
  // construirApp inicializa el cliente de la base que usan las llamadas directas a los adaptadores.
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const ficha = (): string => randomUUID().slice(0, 8)

const paramsDelGradebook = (claseId: string) => ({
  claseId,
  cursor: undefined,
  limite: 50,
  cursorTareas: undefined,
  limiteTareas: 50,
  ahora: new Date(),
})

// Cuatro tareas, de la más reciente a la más antigua (T1 a T4), y cuatro alumnos (A a D por nombre).
const escenario = async () => {
  const f = ficha()
  const c = await crearClaseDeGradebook(idsUsuarios, idsClases, f)
  const ahora = Date.now()
  const tareas: string[] = []
  for (let k = 1; k <= 4; k += 1) {
    tareas.push(
      await crearTareaDePrueba({
        claseId: c.claseId,
        autorId: c.maestro.id,
        titulo: `T${String(k)}`,
        puntos: 10,
        fechaLimite: new Date(ahora + (48 - k) * HORA_MS),
      }),
    )
  }
  const alumnos: (UsuarioDePrueba & { token: string })[] = []
  for (const letra of ["A", "B", "C", "D"]) {
    alumnos.push(await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `${letra} Instantanea ${f}`))
  }
  const [t1, t2, t3, t4] = tareas
  const [a, b, cc, d] = alumnos
  if (!t1 || !t2 || !t3 || !t4 || !a || !b || !cc || !d) {
    throw new Error("Precondición: cuatro tareas y cuatro alumnos")
  }
  return { ...c, t1, t2, t3, t4, a, b, c: cc, d }
}

const actorAdmin = async () => ({ id: await idDelAdminDePrueba(), rol: "admin" as const })

describe("instantánea única del gradebook y de «Mis calificaciones» (CAL-1B03)", () => {
  it("CAL-1B03: gradebook con la tarea de cursorTareas borrada entre su comprobación y la ventana devuelve las tareas que siguen", async () => {
    const e = await escenario()
    const params = { ...paramsDelGradebook(e.claseId), cursorTareas: e.t2 }
    const previa = await leerGradebook(params)
    expect(
      previa.tareas.map((t) => t.id),
      "Precondición (control): sin carrera",
    ).toEqual([e.t3, e.t4])

    const actor = await actorAdmin()
    const { gancho, disparado } = unaVezDespuesDe("tarea.findFirst", async () => {
      const borrada = await borrarTarea(
        { claseId: e.claseId, tareaId: e.t2, actor },
        async () => {},
      )
      expect(borrada, "Precondición: el gancho borró la tarea del cursor").toBe(true)
    })
    const g = await leerGradebook(params, ejecutorEspiado(gancho).ejecutor)
    expect(disparado(), "Precondición: el gancho corrió tras la comprobación del cursor").toBe(true)
    expect(g.tareas.map((t) => t.id)).toEqual([e.t3, e.t4])
    expect(g.alumnos[0]?.celdas.map((celda) => celda.tareaId)).toEqual([e.t3, e.t4])
    expect(await obtenerDb().tarea.count({ where: { id: e.t2 } })).toBe(0)
  }, 30_000)

  it("CAL-1B03: gradebook con el alumno del cursor borrado entre su comprobación y la página devuelve los alumnos que siguen", async () => {
    const e = await escenario()
    const params = { ...paramsDelGradebook(e.claseId), cursor: e.b.id }
    const previa = await leerGradebook(params)
    expect(
      previa.alumnos.map((f) => f.alumno.id),
      "Precondición (control)",
    ).toEqual([e.c.id, e.d.id])

    const { gancho, disparado } = unaVezDespuesDe("usuario.findUnique", async () => {
      await obtenerDb().usuario.delete({ where: { id: e.b.id }, select: { id: true } })
    })
    const g = await leerGradebook(params, ejecutorEspiado(gancho).ejecutor)
    expect(disparado(), "Precondición: el gancho corrió tras la comprobación del cursor").toBe(true)
    expect(g.alumnos.map((f) => f.alumno.id)).toEqual([e.c.id, e.d.id])
    expect(await obtenerDb().usuario.count({ where: { id: e.b.id } })).toBe(0)
  }, 30_000)

  it("CAL-1B03: «Mis calificaciones» con la tarea del cursor borrada entre su comprobación y la página devuelve las tareas que siguen", async () => {
    const e = await escenario()
    const params = {
      claseId: e.claseId,
      alumnoId: e.a.id,
      filtro: "todas" as const,
      cursor: e.t2,
      limite: 20,
      ahora: new Date(),
    }
    const previa = await leerMisCalificaciones(params)
    expect(
      previa.tareas.map((t) => t.id),
      "Precondición (control)",
    ).toEqual([e.t3, e.t4])

    const actor = await actorAdmin()
    const { gancho, disparado } = unaVezDespuesDe("tarea.findFirst", async () => {
      const borrada = await borrarTarea(
        { claseId: e.claseId, tareaId: e.t2, actor },
        async () => {},
      )
      expect(borrada, "Precondición: el gancho borró la tarea del cursor").toBe(true)
    })
    const mis = await leerMisCalificaciones(params, ejecutorEspiado(gancho).ejecutor)
    expect(disparado(), "Precondición: el gancho corrió tras la comprobación del cursor").toBe(true)
    expect(mis.tareas.map((t) => t.id)).toEqual([e.t3, e.t4])
  }, 30_000)

  it("CAL-1B03: una calificación que llega después de leer las celdas no cambia el porcentaje, el riesgo ni el resumen de esa misma respuesta", async () => {
    const e = await escenario()
    const entregaId = await crearEntregaDePrueba({ tareaId: e.t1, alumnoId: e.a.id })
    const calificar = async () => {
      const cambiadas = await obtenerDb().$executeRaw`
        UPDATE entregas SET estado = 'calificado', calificacion = 2, fecha_calificacion = now()
        WHERE id = ${entregaId}::uuid`
      expect(cambiadas, "Precondición: el gancho calificó la entrega").toBe(1)
    }

    const { gancho, disparado } = unaVezDespuesDe("entrega.findMany", calificar)
    const g = await leerGradebook(paramsDelGradebook(e.claseId), ejecutorEspiado(gancho).ejecutor)
    expect(disparado(), "Precondición: el gancho corrió tras leer las celdas").toBe(true)
    const fila = g.alumnos.find((f) => f.alumno.id === e.a.id)
    expect(fila?.celdas[0]).toEqual({
      tareaId: e.t1,
      estado: "entregado",
      conRetraso: false,
      calificacion: null,
    })
    expect(fila?.porcentaje).toBeNull()
    expect(fila?.motivosDeRiesgo).toEqual([])
    expect(g.resumen.promedioDeLaClase).toBeNull()
    expect(g.resumen.alumnosEnRiesgo).toBe(0)

    // Una lectura nueva ve la calificación en la celda, en el porcentaje y en el resumen a la vez.
    const despues = await leerGradebook(paramsDelGradebook(e.claseId))
    const filaDespues = despues.alumnos.find((f) => f.alumno.id === e.a.id)
    expect(filaDespues?.celdas[0]?.calificacion).toBe(2)
    expect(filaDespues?.porcentaje).toBe(20)
    expect(filaDespues?.motivosDeRiesgo).toEqual(["promedio"])
    expect(despues.resumen.promedioDeLaClase).toBe(20)
    expect(despues.resumen.alumnosEnRiesgo).toBe(1)
  }, 30_000)

  it("CAL-1B03: en «Mis calificaciones», una calificación que llega después de leer las entregas no cambia la calificación general de esa respuesta", async () => {
    const e = await escenario()
    const entregaId = await crearEntregaDePrueba({ tareaId: e.t1, alumnoId: e.a.id })
    const { gancho, disparado } = unaVezDespuesDe("entrega.findMany", async () => {
      const cambiadas = await obtenerDb().$executeRaw`
        UPDATE entregas SET estado = 'calificado', calificacion = 9, fecha_calificacion = now()
        WHERE id = ${entregaId}::uuid`
      expect(cambiadas, "Precondición: el gancho calificó la entrega").toBe(1)
    })
    const params = {
      claseId: e.claseId,
      alumnoId: e.a.id,
      filtro: "todas" as const,
      cursor: undefined,
      limite: 20,
      ahora: new Date(),
    }
    const mis = await leerMisCalificaciones(params, ejecutorEspiado(gancho).ejecutor)
    expect(disparado(), "Precondición: el gancho corrió tras leer las entregas").toBe(true)
    expect(mis.tareas[0]?.entrega).toEqual({
      estado: "entregado",
      conRetraso: false,
      calificacion: null,
    })
    expect(mis.general.porcentaje).toBeNull()
    expect(mis.general.puntos).toEqual({ obtenido: 0, posible: 0, tareas: 0 })

    const despues = await leerMisCalificaciones(params)
    expect(despues.tareas[0]?.entrega.calificacion).toBe(9)
    expect(despues.general.porcentaje).toBe(90)
  }, 30_000)
})

describe("sin N+1 (CAL-1B04)", () => {
  // Una clase con dos categorías, `tareas` tareas y los primeros `alumnos` de la lista inscritos, cada
  // uno con todas sus entregas calificadas salvo la primera tarea (entregada) y la segunda (sin fila).
  const claseDeTamano = async (
    lista: readonly UsuarioDePrueba[],
    { alumnos, tareas }: { alumnos: number; tareas: number },
  ) => {
    const c = await crearClaseDeGradebook(idsUsuarios, idsClases, ficha())
    const ahora = Date.now()
    const c1 = await crearCategoriaDePrueba({ claseId: c.claseId, peso: 70 })
    const c2 = await crearCategoriaDePrueba({ claseId: c.claseId, peso: 30 })
    const ids: string[] = []
    for (let k = 0; k < tareas; k += 1) {
      ids.push(
        await crearTareaDePrueba({
          claseId: c.claseId,
          autorId: c.maestro.id,
          puntos: 10,
          categoriaId: k % 2 === 0 ? c1.id : c2.id,
          fechaLimite: new Date(ahora + (k % 3 === 0 ? -1 : 1) * (k + 2) * HORA_MS),
        }),
      )
    }
    const inscritos = lista.slice(0, alumnos)
    for (const alumno of inscritos) await inscribirDePrueba(c.claseId, alumno.id)
    const [entregada, , ...calificadas] = ids
    await obtenerDb().entrega.createMany({
      data: inscritos.flatMap((alumno) => [
        ...(entregada === undefined
          ? []
          : [
              {
                tareaId: entregada,
                alumnoId: alumno.id,
                estado: "entregado" as const,
                fechaEntrega: new Date(),
                version: 1,
              },
            ]),
        ...calificadas.map((tareaId) => ({
          tareaId,
          alumnoId: alumno.id,
          estado: "calificado" as const,
          fechaEntrega: new Date(),
          calificacion: 7,
          fechaCalificacion: new Date(),
          version: 2,
        })),
      ]),
    })
    return { claseId: c.claseId, alumno: inscritos[0], tareas: ids }
  }

  it("CAL-1B04: leerGradebook y leerMisCalificaciones hacen las mismas sentencias con 2 y con 30 alumnos y con 2 y con 30 tareas", async () => {
    const f = ficha()
    const lista: UsuarioDePrueba[] = []
    for (let i = 0; i < 30; i += 1) {
      lista.push(
        await crearAlumnoDePrueba(idsUsuarios, { nombre: `N1 ${String(i).padStart(2, "0")} ${f}` }),
      )
    }
    const tamanos = [
      { alumnos: 2, tareas: 2 },
      { alumnos: 30, tareas: 2 },
      { alumnos: 2, tareas: 30 },
      { alumnos: 30, tareas: 30 },
    ]
    const delGradebook: string[][] = []
    const delGradebookConCursores: string[][] = []
    const deMisCalificaciones: string[][] = []
    for (const tamano of tamanos) {
      const clase = await claseDeTamano(lista, tamano)
      if (clase.alumno === undefined) throw new Error("Precondición: la clase tiene alumnos")

      const espia = ejecutorEspiado()
      const g = await leerGradebook(paramsDelGradebook(clase.claseId), espia.ejecutor)
      expect(g.alumnos, "Precondición: todas las filas en la página").toHaveLength(tamano.alumnos)
      expect(g.tareas, "Precondición: todas las columnas en la ventana").toHaveLength(tamano.tareas)
      expect(g.alumnos.every((fila) => fila.celdas.length === tamano.tareas)).toBe(true)
      delGradebook.push(espia.llamadas)

      const conCursores = ejecutorEspiado()
      await leerGradebook(
        {
          ...paramsDelGradebook(clase.claseId),
          cursor: clase.alumno.id,
          cursorTareas: g.tareas[0]?.id,
        },
        conCursores.ejecutor,
      )
      delGradebookConCursores.push(conCursores.llamadas)

      const delAlumno = ejecutorEspiado()
      const mis = await leerMisCalificaciones(
        {
          claseId: clase.claseId,
          alumnoId: clase.alumno.id,
          filtro: "todas",
          cursor: undefined,
          limite: 100,
          ahora: new Date(),
        },
        delAlumno.ejecutor,
      )
      expect(mis.tareas, "Precondición: todas las tareas en la página").toHaveLength(tamano.tareas)
      deMisCalificaciones.push(delAlumno.llamadas)
    }

    expect(delGradebook[0]).toEqual([
      "tarea.findMany",
      "inscripcion.findMany",
      "entrega.findMany",
      "categoria.findMany",
      "$queryRaw",
      "$queryRaw",
      "inscripcion.count",
    ])
    expect(delGradebookConCursores[0]).toEqual([
      "tarea.findFirst",
      "tarea.findMany",
      "usuario.findUnique",
      "inscripcion.findMany",
      "entrega.findMany",
      "categoria.findMany",
      "$queryRaw",
      "$queryRaw",
      "inscripcion.count",
    ])
    expect(deMisCalificaciones[0]).toEqual([
      "tarea.findMany",
      "entrega.findMany",
      "categoria.findMany",
      "$queryRaw",
    ])
    for (const [i, tamano] of tamanos.entries()) {
      const etiqueta = `${String(tamano.alumnos)} alumnos y ${String(tamano.tareas)} tareas`
      expect(delGradebook[i], etiqueta).toEqual(delGradebook[0])
      expect(delGradebookConCursores[i], etiqueta).toEqual(delGradebookConCursores[0])
      expect(deMisCalificaciones[i], etiqueta).toEqual(deMisCalificaciones[0])
    }
  }, 60_000)
})
