import { randomUUID } from "node:crypto"

import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { leerGradebook, leerMisCalificaciones } from "../src/adapters/db/calificaciones.js"
import { obtenerDb, type Ejecutor } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { borrarUsuariosDePrueba, type UsuarioDePrueba } from "./ayudas-auth.js"
import { borrarMovimientosYClasesDePrueba } from "./ayudas-clases.js"
import { crearEntregaDePrueba } from "./ayudas-entregas.js"
import {
  crearClaseDeGradebook,
  ejecutorEspiado,
  HORA_MS,
  inscribirAlumnoDePrueba,
} from "./ayudas-gradebook.js"
import { crearCategoriaDePrueba, crearTareaDePrueba } from "./ayudas-tareas.js"

// Ataque de la ronda 1 de CALIFICACIONES-01b: casos que SÍ distinguen la instantánea única (N-24 de
// la revisión). Cada gancho escribe desde otra conexión entre dos sentencias de la lectura y confirma
// antes de que la lectura siga; en READ COMMITTED la sentencia siguiente vería la escritura y la
// respuesta mezclaría dos momentos (una columna sin su celda, una fila sin su porcentaje, una
// vencida que no está en las columnas, un agregado de una categoría que la lectura no conoce). Con la
// instantánea, la respuesta es la del momento de su primera sentencia, y una lectura posterior sí ve
// la escritura (control). El reloj de cada lectura es explícito (AHORA); las fechas límite se fijan
// con horas de margen respecto de AHORA. Nadie retiene bloqueos ni pide un bloqueo de tabla.

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

const AHORA = new Date("2031-05-20T15:00:00.000Z")
const ficha = (): string => randomUUID().slice(0, 8)

// El gancho corre una sola vez, después de la n-ésima llamada con ese nombre (1 = la primera).
const despuesDeLaEnesima = (
  llamada: string,
  n: number,
  accion: () => Promise<void>,
): { gancho: (hecha: string) => Promise<void>; disparado: () => boolean } => {
  let vistas = 0
  let disparado = false
  return {
    gancho: async (hecha) => {
      if (hecha !== llamada) return
      vistas += 1
      if (vistas !== n) return
      disparado = true
      await accion()
    },
    disparado: () => disparado,
  }
}

const paramsDelGradebook = (claseId: string) => ({
  claseId,
  cursor: undefined as string | undefined,
  limite: 50,
  cursorTareas: undefined as string | undefined,
  limiteTareas: 50,
  ahora: AHORA,
})

const paramsDeMis = (claseId: string, alumnoId: string) => ({
  claseId,
  alumnoId,
  filtro: "todas" as const,
  cursor: undefined as string | undefined,
  limite: 20,
  ahora: AHORA,
})

// Cuatro tareas de 10 puntos (T1 la más reciente) y cuatro alumnos (A a D por nombre). Con
// `vencidas`, T3 y T4 ya vencieron respecto de AHORA; si no, todas vencen después.
const escenario = async ({ vencidas = false }: { vencidas?: boolean } = {}) => {
  const f = ficha()
  const c = await crearClaseDeGradebook(idsUsuarios, idsClases, f)
  const horas = vencidas ? [48, 24, -24, -48] : [48, 47, 46, 45]
  const tareas: string[] = []
  for (const [i, h] of horas.entries()) {
    tareas.push(
      await crearTareaDePrueba({
        claseId: c.claseId,
        autorId: c.maestro.id,
        titulo: `T${String(i + 1)}`,
        puntos: 10,
        fechaLimite: new Date(AHORA.getTime() + h * HORA_MS),
      }),
    )
  }
  const alumnos: (UsuarioDePrueba & { token: string })[] = []
  for (const letra of ["A", "B", "C", "D"]) {
    alumnos.push(await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `${letra} Snap ${f}`))
  }
  const [t1, t2, t3, t4] = tareas
  const [a, b, cc, d] = alumnos
  if (!t1 || !t2 || !t3 || !t4 || !a || !b || !cc || !d) {
    throw new Error("Precondición: cuatro tareas y cuatro alumnos")
  }
  return { ...c, t1, t2, t3, t4, a, b, c: cc, d }
}

const borrarTareaPorSql = async (tareaId: string): Promise<void> => {
  // La publicación arrastra en cascada la fila de tareas, sus entregas y sus puntajes.
  const borradas = await obtenerDb()
    .$executeRaw`DELETE FROM publicaciones WHERE id = ${tareaId}::uuid`
  expect(borradas, "Precondición: el gancho borró la tarea").toBe(1)
}

const leerConGancho = <T>(
  leer: (ejecutor: Ejecutor) => Promise<T>,
  gancho: (hecha: string) => Promise<void>,
): Promise<T> => leer(ejecutorEspiado(gancho).ejecutor)

describe("ataque 01b r1: la instantánea única del gradebook se distingue de READ COMMITTED", () => {
  it("CAL-T-32: una tarea de la ventana borrada después de comprobar cursorTareas sigue en las columnas, con su título y su celda calificada", async () => {
    const e = await escenario()
    await crearEntregaDePrueba({
      tareaId: e.t3,
      alumnoId: e.a.id,
      estado: "calificado",
      calificacion: 8,
    })
    const params = { ...paramsDelGradebook(e.claseId), cursorTareas: e.t1 }
    const previa = await leerGradebook(params)
    expect(
      previa.tareas.map((t) => t.id),
      "Precondición (control)",
    ).toEqual([e.t2, e.t3, e.t4])

    const { gancho, disparado } = despuesDeLaEnesima("tarea.findFirst", 1, () =>
      borrarTareaPorSql(e.t3),
    )
    const g = await leerConGancho((ej) => leerGradebook(params, ej), gancho)
    expect(disparado(), "Precondición: el gancho corrió tras comprobar el cursor").toBe(true)

    expect(g.tareas.map((t) => t.id)).toEqual([e.t2, e.t3, e.t4])
    expect(g.tareas[1]?.titulo).toBe("T3")
    const filaA = g.alumnos.find((fila) => fila.alumno.id === e.a.id)
    expect(filaA?.celdas[1]).toEqual({
      tareaId: e.t3,
      estado: "calificado",
      conRetraso: false,
      calificacion: 8,
    })
    expect(filaA?.porcentaje).toBe(80)

    const despues = await leerGradebook(params)
    expect(
      despues.tareas.map((t) => t.id),
      "control: la lectura nueva ya no la ve",
    ).toEqual([e.t2, e.t4])
  }, 30_000)

  it("CAL-T-33: una tarea borrada después de leer las columnas conserva su celda calificada y su porcentaje (las celdas son de la misma instantánea que las columnas)", async () => {
    const e = await escenario()
    await crearEntregaDePrueba({
      tareaId: e.t2,
      alumnoId: e.a.id,
      estado: "calificado",
      calificacion: 6,
    })
    const params = paramsDelGradebook(e.claseId)
    const { gancho, disparado } = despuesDeLaEnesima("tarea.findMany", 1, () =>
      borrarTareaPorSql(e.t2),
    )
    const g = await leerConGancho((ej) => leerGradebook(params, ej), gancho)
    expect(disparado(), "Precondición: el gancho corrió tras leer las columnas").toBe(true)

    expect(g.tareas.map((t) => t.id)).toEqual([e.t1, e.t2, e.t3, e.t4])
    const filaA = g.alumnos.find((fila) => fila.alumno.id === e.a.id)
    expect(filaA?.celdas[1]).toEqual({
      tareaId: e.t2,
      estado: "calificado",
      conRetraso: false,
      calificacion: 6,
    })
    expect(filaA?.porcentaje).toBe(60)
    expect(filaA?.motivosDeRiesgo).toEqual(["promedio"])
    expect(g.resumen.promedioDeLaClase).toBe(60)
    expect(g.resumen.alumnosEnRiesgo).toBe(1)

    const despues = await leerGradebook(params)
    expect(
      despues.tareas.map((t) => t.id),
      "control",
    ).toEqual([e.t1, e.t3, e.t4])
    expect(despues.resumen.promedioDeLaClase, "control").toBeNull()
  }, 30_000)

  it("CAL-T-34: un alumno de la página dado de baja después de comprobar el cursor de alumnos sigue en la página, con su porcentaje, y cuenta en el total y en el resumen", async () => {
    const e = await escenario()
    await crearEntregaDePrueba({
      tareaId: e.t1,
      alumnoId: e.c.id,
      estado: "calificado",
      calificacion: 5,
    })
    const params = { ...paramsDelGradebook(e.claseId), cursor: e.a.id }
    const previa = await leerGradebook(params)
    expect(
      previa.alumnos.map((f) => f.alumno.id),
      "Precondición (control)",
    ).toEqual([e.b.id, e.c.id, e.d.id])

    const { gancho, disparado } = despuesDeLaEnesima("usuario.findUnique", 1, async () => {
      await obtenerDb().inscripcion.delete({
        where: { claseId_usuarioId: { claseId: e.claseId, usuarioId: e.c.id } },
        select: { claseId: true },
      })
    })
    const g = await leerConGancho((ej) => leerGradebook(params, ej), gancho)
    expect(disparado(), "Precondición: el gancho corrió tras comprobar el cursor").toBe(true)

    expect(g.alumnos.map((f) => f.alumno.id)).toEqual([e.b.id, e.c.id, e.d.id])
    const filaC = g.alumnos.find((fila) => fila.alumno.id === e.c.id)
    expect(filaC?.porcentaje).toBe(50)
    expect(filaC?.motivosDeRiesgo).toEqual(["promedio"])
    expect(g.resumen).toEqual({
      modo: "puntos",
      totalAlumnos: 4,
      promedioDeLaClase: 50,
      alumnosEnRiesgo: 1,
    })

    const despues = await leerGradebook(params)
    expect(
      despues.alumnos.map((f) => f.alumno.id),
      "control",
    ).toEqual([e.b.id, e.d.id])
    expect(despues.resumen.totalAlumnos, "control").toBe(3)
  }, 30_000)

  it("CAL-T-35: un alumno de la página desactivado después de leer la página conserva su porcentaje, y el total y el resumen lo siguen contando", async () => {
    const e = await escenario()
    await crearEntregaDePrueba({
      tareaId: e.t1,
      alumnoId: e.b.id,
      estado: "calificado",
      calificacion: 4,
    })
    const params = paramsDelGradebook(e.claseId)
    const { gancho, disparado } = despuesDeLaEnesima("inscripcion.findMany", 1, async () => {
      await obtenerDb().usuario.update({
        where: { id: e.b.id },
        data: { activo: false },
        select: { id: true },
      })
    })
    const g = await leerConGancho((ej) => leerGradebook(params, ej), gancho)
    expect(disparado(), "Precondición: el gancho corrió tras leer la página de alumnos").toBe(true)

    const filaB = g.alumnos.find((fila) => fila.alumno.id === e.b.id)
    expect(filaB?.celdas[0]?.calificacion).toBe(4)
    expect(filaB?.porcentaje).toBe(40)
    expect(filaB?.motivosDeRiesgo).toEqual(["promedio"])
    expect(g.resumen).toEqual({
      modo: "puntos",
      totalAlumnos: 4,
      promedioDeLaClase: 40,
      alumnosEnRiesgo: 1,
    })

    const despues = await leerGradebook(params)
    expect(
      despues.alumnos.map((f) => f.alumno.id),
      "control",
    ).not.toContain(e.b.id)
    expect(despues.resumen.totalAlumnos, "control").toBe(3)
  }, 30_000)

  it("CAL-T-36: una tarea vencida creada después de leer las columnas no suma vencidas sin entregar ni pone a nadie en riesgo en esa respuesta", async () => {
    const e = await escenario({ vencidas: true })
    const params = paramsDelGradebook(e.claseId)
    const previa = await leerGradebook(params)
    expect(
      previa.alumnos.map((f) => f.vencidasSinEntregar),
      "Precondición (control): T3 y T4 vencidas",
    ).toEqual([2, 2, 2, 2])
    expect(previa.resumen.alumnosEnRiesgo, "Precondición (control)").toBe(0)

    let nueva = ""
    const { gancho, disparado } = despuesDeLaEnesima("tarea.findMany", 1, async () => {
      nueva = await crearTareaDePrueba({
        claseId: e.claseId,
        autorId: e.maestro.id,
        titulo: "Nueva vencida",
        puntos: 10,
        fechaLimite: new Date(AHORA.getTime() - 3 * HORA_MS),
      })
    })
    const g = await leerConGancho((ej) => leerGradebook(params, ej), gancho)
    expect(disparado(), "Precondición: el gancho corrió tras leer las columnas").toBe(true)

    expect(g.tareas.map((t) => t.id)).not.toContain(nueva)
    expect(g.alumnos.map((f) => f.vencidasSinEntregar)).toEqual([2, 2, 2, 2])
    expect(g.alumnos.every((f) => f.motivosDeRiesgo.length === 0)).toBe(true)
    expect(g.resumen.alumnosEnRiesgo).toBe(0)

    const despues = await leerGradebook(params)
    expect(
      despues.alumnos.map((f) => f.vencidasSinEntregar),
      "control",
    ).toEqual([3, 3, 3, 3])
    expect(despues.resumen.alumnosEnRiesgo, "control").toBe(4)
  }, 30_000)

  it("CAL-T-37: una entrega que llega entre el agregado y las vencidas no quita la vencida que su celda sigue mostrando como asignada", async () => {
    const e = await escenario({ vencidas: true })
    const params = paramsDelGradebook(e.claseId)
    const { gancho, disparado } = despuesDeLaEnesima("$queryRaw", 1, async () => {
      await crearEntregaDePrueba({ tareaId: e.t3, alumnoId: e.a.id, conRetraso: true })
    })
    const g = await leerConGancho((ej) => leerGradebook(params, ej), gancho)
    expect(disparado(), "Precondición: el gancho corrió tras el agregado").toBe(true)

    const filaA = g.alumnos.find((fila) => fila.alumno.id === e.a.id)
    expect(filaA?.celdas[2]).toEqual({
      tareaId: e.t3,
      estado: "asignado",
      conRetraso: false,
      calificacion: null,
    })
    expect(filaA?.vencidasSinEntregar).toBe(2)

    const despues = await leerGradebook(params)
    const filaDespues = despues.alumnos.find((fila) => fila.alumno.id === e.a.id)
    expect(filaDespues?.celdas[2]?.estado, "control").toBe("entregado")
    expect(filaDespues?.vencidasSinEntregar, "control").toBe(1)
  }, 30_000)

  it("CAL-T-38: una tarea calificada movida a una categoría nueva entre la lectura de categorías y el agregado no rompe la lectura (sin ERROR_INTERNO) y cuenta en la categoría de su columna", async () => {
    const e = await escenario()
    const k1 = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "K1", peso: 100 })
    await obtenerDb().tarea.update({
      where: { id: e.t1 },
      data: { categoriaId: k1.id },
      select: { id: true },
    })
    await crearEntregaDePrueba({
      tareaId: e.t1,
      alumnoId: e.a.id,
      estado: "calificado",
      calificacion: 9,
    })
    const moverACategoriaNueva = async () => {
      const k2 = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "K2", peso: 50 })
      await obtenerDb().tarea.update({
        where: { id: e.t1 },
        data: { categoriaId: k2.id },
        select: { id: true },
      })
    }
    const params = paramsDelGradebook(e.claseId)
    const { gancho, disparado } = despuesDeLaEnesima("categoria.findMany", 1, moverACategoriaNueva)
    const g = await leerConGancho((ej) => leerGradebook(params, ej), gancho)
    expect(disparado(), "Precondición: el gancho corrió tras leer las categorías").toBe(true)

    expect(g.tareas[0]?.categoria).toEqual({ id: k1.id, nombre: "K1" })
    expect(g.alumnos.find((fila) => fila.alumno.id === e.a.id)?.porcentaje).toBe(90)
    expect(g.resumen.modo).toBe("categorias")

    const despues = await leerGradebook(params)
    expect(despues.tareas[0]?.categoria?.nombre, "control").toBe("K2")
  }, 30_000)
})

describe("ataque 01b r1: la instantánea única de «Mis calificaciones» se distingue de READ COMMITTED", () => {
  it("CAL-T-39: una tarea de la página borrada después de leer la página conserva su calificación y cuenta en general", async () => {
    const e = await escenario()
    await crearEntregaDePrueba({
      tareaId: e.t1,
      alumnoId: e.a.id,
      estado: "calificado",
      calificacion: 7,
    })
    const params = paramsDeMis(e.claseId, e.a.id)
    const { gancho, disparado } = despuesDeLaEnesima("tarea.findMany", 1, () =>
      borrarTareaPorSql(e.t1),
    )
    const mis = await leerConGancho((ej) => leerMisCalificaciones(params, ej), gancho)
    expect(disparado(), "Precondición: el gancho corrió tras leer la página").toBe(true)

    expect(mis.tareas.map((t) => t.id)).toEqual([e.t1, e.t2, e.t3, e.t4])
    expect(mis.tareas[0]?.entrega).toEqual({
      estado: "calificado",
      conRetraso: false,
      calificacion: 7,
    })
    expect(mis.general.porcentaje).toBe(70)

    const despues = await leerMisCalificaciones(params)
    expect(
      despues.tareas.map((t) => t.id),
      "control",
    ).toEqual([e.t2, e.t3, e.t4])
    expect(despues.general.porcentaje, "control").toBeNull()
  }, 30_000)

  it("CAL-T-40: una calificación que llega entre la lectura de categorías y el agregado no cambia general mientras la tarea siga como entregada", async () => {
    const e = await escenario()
    const entregaId = await crearEntregaDePrueba({ tareaId: e.t2, alumnoId: e.a.id })
    const params = paramsDeMis(e.claseId, e.a.id)
    const { gancho, disparado } = despuesDeLaEnesima("categoria.findMany", 1, async () => {
      const cambiadas = await obtenerDb().$executeRaw`
        UPDATE entregas SET estado = 'calificado', calificacion = 9, fecha_calificacion = now()
        WHERE id = ${entregaId}::uuid`
      expect(cambiadas, "Precondición: el gancho calificó la entrega").toBe(1)
    })
    const mis = await leerConGancho((ej) => leerMisCalificaciones(params, ej), gancho)
    expect(disparado(), "Precondición: el gancho corrió tras leer las categorías").toBe(true)

    expect(mis.tareas[1]?.entrega.estado).toBe("entregado")
    expect(mis.general.porcentaje).toBeNull()

    const despues = await leerMisCalificaciones(params)
    expect(despues.general.porcentaje, "control").toBe(90)
  }, 30_000)

  it("CAL-T-41: una tarea calificada movida a una categoría nueva entre la lectura de categorías y el agregado no rompe «Mis calificaciones»", async () => {
    const e = await escenario()
    const k1 = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "K1", peso: 100 })
    await obtenerDb().tarea.update({
      where: { id: e.t1 },
      data: { categoriaId: k1.id },
      select: { id: true },
    })
    await crearEntregaDePrueba({
      tareaId: e.t1,
      alumnoId: e.a.id,
      estado: "calificado",
      calificacion: 9,
    })
    const params = paramsDeMis(e.claseId, e.a.id)
    const { gancho, disparado } = despuesDeLaEnesima("categoria.findMany", 1, async () => {
      const k2 = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "K2", peso: 50 })
      await obtenerDb().tarea.update({
        where: { id: e.t1 },
        data: { categoriaId: k2.id },
        select: { id: true },
      })
    })
    const mis = await leerConGancho((ej) => leerMisCalificaciones(params, ej), gancho)
    expect(disparado(), "Precondición: el gancho corrió tras leer las categorías").toBe(true)
    expect(mis.general.porcentaje).toBe(90)
    expect(mis.general.categorias.map((c) => c.nombre)).toEqual(["K1"])
  }, 30_000)
})

// Control negativo: los mismos ganchos con la transacción abierta sin opciones (READ COMMITTED, el
// aislamiento por defecto) sí producen la mezcla. Demuestra que los casos de arriba distinguen la
// instantánea, que es lo que N-24 echaba de menos en CAL-1B03.
const enReadCommitted = (gancho: (hecha: string) => Promise<void>): Ejecutor => {
  const espiado = ejecutorEspiado(gancho).ejecutor
  return new Proxy(espiado, {
    get(destino, propiedad) {
      if (propiedad !== "$transaction") return Reflect.get(destino, propiedad) as unknown
      return (fn: (tx: unknown) => Promise<unknown>) =>
        (destino as unknown as { $transaction: (f: typeof fn) => Promise<unknown> }).$transaction(
          fn,
        )
    },
  })
}

describe("ataque 01b r1: control negativo en READ COMMITTED (los casos de arriba distinguen la instantánea)", () => {
  it("CAL-T-42: control: sin la instantánea, la tarea vencida creada tras las columnas sí sumaría vencidas, y la tarea movida de categoría daría ERROR_INTERNO", async () => {
    const e = await escenario({ vencidas: true })
    const params = paramsDelGradebook(e.claseId)
    const nueva = despuesDeLaEnesima("tarea.findMany", 1, async () => {
      await crearTareaDePrueba({
        claseId: e.claseId,
        autorId: e.maestro.id,
        puntos: 10,
        fechaLimite: new Date(AHORA.getTime() - 3 * HORA_MS),
      })
    })
    const mezclada = await leerGradebook(params, enReadCommitted(nueva.gancho))
    expect(nueva.disparado(), "Precondición: el gancho corrió").toBe(true)
    expect(mezclada.tareas).toHaveLength(4)
    expect(mezclada.alumnos.map((f) => f.vencidasSinEntregar)).toEqual([3, 3, 3, 3])

    const k1 = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "K1", peso: 100 })
    await obtenerDb().tarea.update({
      where: { id: e.t1 },
      data: { categoriaId: k1.id },
      select: { id: true },
    })
    await crearEntregaDePrueba({
      tareaId: e.t1,
      alumnoId: e.a.id,
      estado: "calificado",
      calificacion: 9,
    })
    const mover = despuesDeLaEnesima("categoria.findMany", 1, async () => {
      const k2 = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "K2", peso: 50 })
      await obtenerDb().tarea.update({
        where: { id: e.t1 },
        data: { categoriaId: k2.id },
        select: { id: true },
      })
    })
    await expect(leerGradebook(params, enReadCommitted(mover.gancho))).rejects.toMatchObject({
      codigo: "ERROR_INTERNO",
    })
    expect(mover.disparado(), "Precondición: el gancho corrió").toBe(true)
  }, 30_000)
})
