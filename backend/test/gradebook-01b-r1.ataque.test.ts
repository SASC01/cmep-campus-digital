import { randomUUID } from "node:crypto"

import {
  errorApiSchema,
  gradebookRespuestaSchema,
  misCalificacionesRespuestaSchema,
  type GradebookRespuesta,
} from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { leerGradebook, leerMisCalificaciones } from "../src/adapters/db/calificaciones.js"
import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import {
  borrarUsuariosDePrueba,
  desactivarUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"
import { crearEntregaDePrueba } from "./ayudas-entregas.js"
import {
  crearCalificadaSinEntregaDePrueba,
  crearClaseDeGradebook,
  ejecutorEspiado,
  HORA_MS,
  inscribirAlumnoDePrueba,
  pedirGet,
} from "./ayudas-gradebook.js"
import {
  crearCategoriaDePrueba,
  crearMaterialConTemaDePrueba,
  crearTareaDePrueba,
} from "./ayudas-tareas.js"

// Ataque de la ronda 1 de CALIFICACIONES-01b sobre el gradebook (§D-6): paginación de dos
// dimensiones, agregados de toda la clase, sentencias que no crecen con los datos, autorización y
// fugas. Por la API, las fechas límite son relativas al reloj real con al menos una hora de margen
// (o fijas, lejos en el futuro, cuando solo importa el orden); las fronteras del milisegundo se
// atacan con el adaptador y un `ahora` explícito.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const pedir = pedirGet(obtenerApp)

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen: crearAlmacenEnMemoria() })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const ficha = (): string => randomUUID().slice(0, 8)

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

const gradebookDe = async (
  token: string,
  claseId: string,
  consulta = "",
): Promise<GradebookRespuesta> => {
  const respuesta = await pedir(token, `/api/clases/${claseId}/gradebook${consulta}`)
  expect(respuesta.statusCode, respuesta.body).toBe(200)
  return gradebookRespuestaSchema.parse(respuesta.json())
}

// Recorre todas las ventanas de tareas con el cursor que devuelve la API.
const recorrerTareas = async (
  token: string,
  claseId: string,
  limiteTareas: number,
): Promise<string[]> => {
  const vistas: string[] = []
  let cursor: string | null = null
  for (let vuelta = 0; vuelta < 50; vuelta += 1) {
    const consulta: string =
      `?limiteTareas=${String(limiteTareas)}` + (cursor === null ? "" : `&cursorTareas=${cursor}`)
    const g = await gradebookDe(token, claseId, consulta)
    expect(g.tareas.length).toBeLessThanOrEqual(limiteTareas)
    for (const fila of g.alumnos) {
      expect(fila.celdas.map((celda) => celda.tareaId)).toEqual(g.tareas.map((t) => t.id))
    }
    vistas.push(...g.tareas.map((t) => t.id))
    cursor = g.siguienteCursorTareas
    if (cursor === null) return vistas
  }
  throw new Error("El recorrido de tareas no terminó en 50 vueltas")
}

const recorrerAlumnos = async (
  token: string,
  claseId: string,
  limite: number,
): Promise<string[]> => {
  const vistos: string[] = []
  let cursor: string | null = null
  for (let vuelta = 0; vuelta < 50; vuelta += 1) {
    const consulta: string =
      `?limite=${String(limite)}&limiteTareas=1` + (cursor === null ? "" : `&cursor=${cursor}`)
    const g = await gradebookDe(token, claseId, consulta)
    expect(g.alumnos.length).toBeLessThanOrEqual(limite)
    vistos.push(...g.alumnos.map((f) => f.alumno.id))
    cursor = g.siguienteCursor
    if (cursor === null) return vistos
  }
  throw new Error("El recorrido de alumnos no terminó en 50 vueltas")
}

describe("ataque 01b r1: paginación de dos dimensiones del gradebook", () => {
  it("CAL-T-43: tareas con la misma fecha límite al milisegundo y vecinas a un milisegundo se recorren con 1, 2, 3 y 4 por ventana sin repetir ni saltar, en (fecha_limite DESC, id DESC)", async () => {
    const c = await crearClaseDeGradebook(idsUsuarios, idsClases, ficha())
    await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Alumno Empates ${ficha()}`)
    const f = new Date("2031-03-15T12:00:00.123Z").getTime()
    const fechas = [f + 1, f, f, f, f, f - 1, f - 1]
    for (const fecha of fechas) {
      await crearTareaDePrueba({
        claseId: c.claseId,
        autorId: c.maestro.id,
        puntos: 10,
        fechaLimite: new Date(fecha),
      })
    }
    const esperado = (
      await obtenerDb().tarea.findMany({
        where: { claseId: c.claseId },
        orderBy: [{ fechaLimite: "desc" }, { id: "desc" }],
        select: { id: true },
      })
    ).map((t) => t.id)
    expect(esperado, "Precondición: siete tareas").toHaveLength(7)

    for (const limiteTareas of [1, 2, 3, 4]) {
      const vistas = await recorrerTareas(c.tokens.maestro, c.claseId, limiteTareas)
      expect(vistas, `ventanas de ${String(limiteTareas)}`).toEqual(esperado)
    }
  }, 60_000)

  it("CAL-T-44: alumnos con el mismo nombre de búsqueda (acentos y mayúsculas distintas) se recorren con 1, 2 y 3 por página sin repetir ni saltar, en el orden del roster", async () => {
    const c = await crearClaseDeGradebook(idsUsuarios, idsClases, ficha())
    const f = ficha()
    const nombres = [
      `José Pérez ${f}`,
      `JOSE PEREZ ${f}`,
      `jose perez ${f}`,
      `José  Pérez ${f}`,
      `Ana ${f}`,
      `Zoe ${f}`,
      `Ñandú ${f}`,
    ]
    for (const nombre of nombres) await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, nombre)
    const esperado = (
      await obtenerDb().inscripcion.findMany({
        where: { claseId: c.claseId, usuario: { activo: true } },
        orderBy: [{ usuario: { nombreBusqueda: "asc" } }, { usuarioId: "asc" }],
        select: { usuarioId: true },
      })
    ).map((i) => i.usuarioId)
    expect(esperado, "Precondición: siete inscritos").toHaveLength(7)

    for (const limite of [1, 2, 3]) {
      const vistos = await recorrerAlumnos(c.tokens.maestro, c.claseId, limite)
      expect(vistos, `páginas de ${String(limite)}`).toEqual(esperado)
    }
  }, 60_000)

  it("CAL-T-45: el cursor de alumnos sirve mientras exista la cuenta (un maestro, un alumno de otra clase, uno dado de baja, uno desactivado, en mayúsculas) y una tarea o un id inexistente responden 400", async () => {
    const f = ficha()
    const c = await crearClaseDeGradebook(idsUsuarios, idsClases, f)
    const ana = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Ana Cursor ${f}`)
    const beto = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Beto Cursor ${f}`)
    const carla = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Carla Cursor ${f}`)
    const dora = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Dora Cursor ${f}`)
    const tareaId = await crearTareaDePrueba({ claseId: c.claseId, autorId: c.maestro.id })
    const otra = await crearClaseDeGradebook(idsUsuarios, idsClases, ficha())
    const ajeno = await inscribirAlumnoDePrueba(idsUsuarios, otra.claseId, `Bruno Cursor ${f}`)

    const pagina = async (cursor: string) =>
      (await gradebookDe(c.tokens.maestro, c.claseId, `?cursor=${cursor}`)).alumnos.map(
        (fila) => fila.alumno.id,
      )

    // Bruno (de otra clase) se ordena entre Beto y Carla.
    expect(await pagina(ajeno.id)).toEqual([carla.id, dora.id])
    expect(await pagina(beto.id.toUpperCase())).toEqual([carla.id, dora.id])
    const maestro = await pagina(c.maestro.id)
    expect(maestro.every((id) => [ana.id, beto.id, carla.id, dora.id].includes(id))).toBe(true)

    await obtenerDb().inscripcion.delete({
      where: { claseId_usuarioId: { claseId: c.claseId, usuarioId: beto.id } },
      select: { claseId: true },
    })
    expect(await pagina(beto.id)).toEqual([carla.id, dora.id])
    await desactivarUsuarioDePrueba(carla.id)
    expect(await pagina(carla.id)).toEqual([dora.id])
    expect(await pagina(ana.id)).toEqual([dora.id])

    for (const malo of [tareaId, randomUUID()]) {
      const respuesta = await pedir(
        c.tokens.maestro,
        `/api/clases/${c.claseId}/gradebook?cursor=${malo}`,
      )
      expect(respuesta.statusCode, respuesta.body).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
    }
  }, 60_000)

  it("CAL-T-46: cursorTareas de otra clase, inexistente, de un material de la misma clase o de un usuario responde 400; en mayúsculas sirve igual", async () => {
    const c = await crearClaseDeGradebook(idsUsuarios, idsClases, ficha())
    const alumno = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Alumno Ct ${ficha()}`)
    const ahora = Date.now()
    const t1 = await crearTareaDePrueba({
      claseId: c.claseId,
      autorId: c.maestro.id,
      fechaLimite: new Date(ahora + 48 * HORA_MS),
    })
    const t2 = await crearTareaDePrueba({
      claseId: c.claseId,
      autorId: c.maestro.id,
      fechaLimite: new Date(ahora + 24 * HORA_MS),
    })
    const material = await crearMaterialConTemaDePrueba({
      claseId: c.claseId,
      autorId: c.maestro.id,
    })
    const otra = await crearClaseDeGradebook(idsUsuarios, idsClases, ficha())
    const deOtra = await crearTareaDePrueba({ claseId: otra.claseId, autorId: otra.maestro.id })

    for (const malo of [deOtra, randomUUID(), material, alumno.id, "no-es-un-uuid", ""]) {
      const respuesta = await pedir(
        c.tokens.maestro,
        `/api/clases/${c.claseId}/gradebook?cursorTareas=${malo}`,
      )
      expect(respuesta.statusCode, `${malo}: ${respuesta.body}`).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
    }
    const enMayusculas = await gradebookDe(
      c.tokens.maestro,
      c.claseId,
      `?cursorTareas=${t1.toUpperCase()}`,
    )
    expect(enMayusculas.tareas.map((t) => t.id)).toEqual([t2])
  }, 60_000)

  it("CAL-T-47: límites: 0, 51, -1, 1.5, texto, vacío, Infinity y repetidos responden 400 en las dos dimensiones; 1 y 50, solos o combinados, responden 200 y respetan el tope", async () => {
    const c = await crearClaseDeGradebook(idsUsuarios, idsClases, ficha())
    for (const letra of ["A", "B"]) {
      await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `${letra} Limites ${ficha()}`)
    }
    for (let k = 0; k < 2; k += 1) {
      await crearTareaDePrueba({ claseId: c.claseId, autorId: c.maestro.id })
    }
    const url = `/api/clases/${c.claseId}/gradebook`
    const malos = ["0", "51", "-1", "1.5", "abc", "", "Infinity", "1e400", "%20"]
    for (const campo of ["limite", "limiteTareas"]) {
      for (const valor of malos) {
        const respuesta = await pedir(c.tokens.maestro, `${url}?${campo}=${valor}`)
        expect(respuesta.statusCode, `${campo}=${valor}: ${respuesta.body}`).toBe(400)
        expect(codigoDe(respuesta)).toBe("VALIDACION")
      }
      const repetido = await pedir(c.tokens.maestro, `${url}?${campo}=1&${campo}=2`)
      expect(repetido.statusCode, `${campo} repetido`).toBe(400)
    }
    const uno = await gradebookDe(c.tokens.maestro, c.claseId, "?limite=1&limiteTareas=1")
    expect(uno.alumnos).toHaveLength(1)
    expect(uno.tareas).toHaveLength(1)
    expect(uno.siguienteCursor).not.toBeNull()
    expect(uno.siguienteCursorTareas).not.toBeNull()
    const tope = await gradebookDe(c.tokens.maestro, c.claseId, "?limite=50&limiteTareas=50")
    expect(tope.alumnos).toHaveLength(2)
    expect(tope.tareas).toHaveLength(2)
    expect(tope.siguienteCursor).toBeNull()
    expect(tope.siguienteCursorTareas).toBeNull()
    const cruzado = await gradebookDe(c.tokens.maestro, c.claseId, "?limite=50&limiteTareas=1")
    expect(cruzado.alumnos.every((fila) => fila.celdas.length === 1)).toBe(true)
  }, 60_000)
})

// Una clase con tres categorías (50, 30 y 20), tareas vencidas y por vencer y alumnos con distintos
// casos. Las fechas límite son relativas al reloj real con 24 horas o más de margen.
const claseDeAgregados = async () => {
  const f = ficha()
  const c = await crearClaseDeGradebook(idsUsuarios, idsClases, f)
  const ahora = Date.now()
  const ka = await crearCategoriaDePrueba({
    claseId: c.claseId,
    nombre: "A",
    peso: 50,
    creadoEn: new Date(ahora - 30_000),
  })
  const kb = await crearCategoriaDePrueba({
    claseId: c.claseId,
    nombre: "B",
    peso: 30,
    creadoEn: new Date(ahora - 20_000),
  })
  const kc = await crearCategoriaDePrueba({
    claseId: c.claseId,
    nombre: "C",
    peso: 20,
    creadoEn: new Date(ahora - 10_000),
  })
  const tarea = (horas: number, categoriaId: string | null, puntos = 10) =>
    crearTareaDePrueba({
      claseId: c.claseId,
      autorId: c.maestro.id,
      puntos,
      categoriaId,
      aceptaTardias: false,
      fechaLimite: new Date(ahora + horas * HORA_MS),
    })
  const ta1 = await tarea(-96, ka.id)
  const tb1 = await tarea(-72, kb.id)
  const tsc = await tarea(-48, null)
  const tc1 = await tarea(-24, kc.id)
  const ta2 = await tarea(24, ka.id)
  const tb2 = await tarea(48, kb.id)

  const uno = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Uno Agregados ${f}`)
  const dos = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Dos Agregados ${f}`)
  const tres = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Tres Agregados ${f}`)
  const cuatro = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Cuatro Agregados ${f}`)

  // Uno: A 8/10, B 5/10, C sin calificar (entregada), sin categoría 10/10 → (80×50 + 50×30) / 80.
  await crearEntregaDePrueba({
    tareaId: ta1,
    alumnoId: uno.id,
    estado: "calificado",
    calificacion: 8,
  })
  await crearEntregaDePrueba({
    tareaId: tb1,
    alumnoId: uno.id,
    estado: "calificado",
    calificacion: 5,
  })
  await crearEntregaDePrueba({
    tareaId: tsc,
    alumnoId: uno.id,
    estado: "calificado",
    calificacion: 10,
  })
  await crearEntregaDePrueba({ tareaId: tc1, alumnoId: uno.id })
  // Dos: solo la tarea sin categoría calificada (no cuenta: porcentaje null); A1 calificada sin
  // entrega con 0 no: nada más, así que tiene 3 vencidas sin entregar (A1, B1, C1).
  await crearEntregaDePrueba({
    tareaId: tsc,
    alumnoId: dos.id,
    estado: "calificado",
    calificacion: 10,
  })
  // Tres: calificada sin entrega en A1 (0/10) y nada en B1 ni C1: dos vencidas, no tres.
  await crearCalificadaSinEntregaDePrueba({ tareaId: ta1, alumnoId: tres.id, calificacion: 0 })
  await crearEntregaDePrueba({ tareaId: tsc, alumnoId: tres.id })
  // Cuatro: entregada con retraso y calificada en A1 (10/10), las otras vencidas entregadas a tiempo.
  await crearEntregaDePrueba({
    tareaId: ta1,
    alumnoId: cuatro.id,
    estado: "calificado",
    calificacion: 10,
    conRetraso: true,
  })
  for (const tareaId of [tb1, tsc, tc1]) {
    await crearEntregaDePrueba({ tareaId, alumnoId: cuatro.id })
  }
  return { ...c, ka, kb, kc, ta1, tb1, tsc, tc1, ta2, tb2, uno, dos, tres, cuatro }
}

describe("ataque 01b r1: agregados del gradebook", () => {
  it("CAL-T-48: redistribución de pesos, «Sin categoría» que no cuenta, calificada sin entrega que no es vencida, entregada con retraso que sí cuenta, y el resumen de toda la clase", async () => {
    const e = await claseDeAgregados()
    const g = await gradebookDe(e.tokens.maestro, e.claseId)
    const fila = (id: string) => {
      const encontrada = g.alumnos.find((f) => f.alumno.id === id)
      if (encontrada === undefined) throw new Error(`Precondición: la fila de ${id}`)
      return encontrada
    }
    expect(g.tareas.map((t) => t.id)).toEqual([e.tb2, e.ta2, e.tc1, e.tsc, e.tb1, e.ta1])
    expect(g.tareas[3]?.categoria).toBeNull()

    expect(fila(e.uno.id)).toMatchObject({
      porcentaje: 68.75,
      vencidasSinEntregar: 0,
      motivosDeRiesgo: ["promedio"],
    })
    expect(fila(e.dos.id)).toMatchObject({
      porcentaje: null,
      vencidasSinEntregar: 3,
      motivosDeRiesgo: ["vencidas"],
    })
    expect(fila(e.dos.id).celdas[3]).toEqual({
      tareaId: e.tsc,
      estado: "calificado",
      conRetraso: false,
      calificacion: 10,
    })
    expect(fila(e.tres.id)).toMatchObject({
      porcentaje: 0,
      vencidasSinEntregar: 2,
      motivosDeRiesgo: ["promedio"],
    })
    expect(fila(e.cuatro.id)).toMatchObject({
      porcentaje: 100,
      vencidasSinEntregar: 0,
      motivosDeRiesgo: [],
    })
    expect(fila(e.cuatro.id).celdas[5]).toEqual({
      tareaId: e.ta1,
      estado: "calificado",
      conRetraso: true,
      calificacion: 10,
    })
    expect(g.resumen).toEqual({
      modo: "categorias",
      totalAlumnos: 4,
      // (68.75 + 0 + 100) / 3 = 56.25; Dos (null) no entra.
      promedioDeLaClase: 56.25,
      alumnosEnRiesgo: 3,
    })

    const mis = await pedir(e.uno.token, `/api/clases/${e.claseId}/mis-calificaciones`)
    expect(mis.statusCode, mis.body).toBe(200)
    const general = misCalificacionesRespuestaSchema.parse(mis.json()).general
    expect(general.porcentaje).toBe(68.75)
    expect(general.categorias.map((k) => [k.nombre, k.pesoEfectivo, k.porcentaje])).toEqual([
      ["A", 62.5, 80],
      ["B", 37.5, 50],
      ["C", null, null],
    ])
    expect(general.sinCategoria).toEqual({ tareas: 1 })
  }, 60_000)

  it("CAL-T-49: el resumen y cada fila son los mismos con cualquier combinación de páginas de alumnos (1, 2, 50) y de ventanas de tareas (1, 50)", async () => {
    const e = await claseDeAgregados()
    const completo = await gradebookDe(e.tokens.maestro, e.claseId, "?limite=50&limiteTareas=50")
    const porAlumno = new Map(
      completo.alumnos.map((f) => [
        f.alumno.id,
        { porcentaje: f.porcentaje, vencidas: f.vencidasSinEntregar, motivos: f.motivosDeRiesgo },
      ]),
    )
    for (const limite of [1, 2, 50]) {
      for (const limiteTareas of [1, 50]) {
        let cursor: string | null = null
        let cursorTareas: string | null = null
        for (let vuelta = 0; vuelta < 12; vuelta += 1) {
          const consulta: string =
            `?limite=${String(limite)}&limiteTareas=${String(limiteTareas)}` +
            (cursor === null ? "" : `&cursor=${cursor}`) +
            (cursorTareas === null ? "" : `&cursorTareas=${cursorTareas}`)
          const g = await gradebookDe(e.tokens.maestro, e.claseId, consulta)
          expect(g.resumen, consulta).toEqual(completo.resumen)
          for (const f of g.alumnos) {
            expect(
              {
                porcentaje: f.porcentaje,
                vencidas: f.vencidasSinEntregar,
                motivos: f.motivosDeRiesgo,
              },
              `${consulta} ${f.alumno.nombre}`,
            ).toEqual(porAlumno.get(f.alumno.id))
          }
          cursor = g.siguienteCursor
          cursorTareas = g.siguienteCursorTareas
          if (cursor === null && cursorTareas === null) break
        }
      }
    }
  }, 120_000)

  it("CAL-T-50: un alumno dado de baja o desactivado con calificaciones no aparece ni cuenta; al volver a inscribirse o reactivarse, cuenta otra vez con lo que ya tenía", async () => {
    const e = await claseDeAgregados()
    const antes = await gradebookDe(e.tokens.maestro, e.claseId)
    await obtenerDb().inscripcion.delete({
      where: { claseId_usuarioId: { claseId: e.claseId, usuarioId: e.tres.id } },
      select: { claseId: true },
    })
    await desactivarUsuarioDePrueba(e.uno.id)
    const sin = await gradebookDe(e.tokens.maestro, e.claseId)
    expect(sin.alumnos.map((f) => f.alumno.id).sort()).toEqual([e.dos.id, e.cuatro.id].sort())
    expect(sin.resumen).toEqual({
      modo: "categorias",
      totalAlumnos: 2,
      promedioDeLaClase: 100,
      alumnosEnRiesgo: 1,
    })

    await inscribirDePrueba(e.claseId, e.tres.id)
    await obtenerDb().usuario.update({
      where: { id: e.uno.id },
      data: { activo: true },
      select: { id: true },
    })
    const despues = await gradebookDe(e.tokens.maestro, e.claseId)
    expect(despues.resumen).toEqual(antes.resumen)
  }, 60_000)

  it("CAL-T-51: un alumno inscrito tarde cuenta las tareas que vencieron antes de su alta (S-04): 3 vencidas lo ponen en riesgo el primer día", async () => {
    const e = await claseDeAgregados()
    const tarde = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Tarde Agregados ${ficha()}` })
    await inscribirDePrueba(e.claseId, tarde.id)
    const g = await gradebookDe(e.tokens.maestro, e.claseId)
    expect(g.alumnos.find((f) => f.alumno.id === tarde.id)).toMatchObject({
      porcentaje: null,
      vencidasSinEntregar: 4,
      motivosDeRiesgo: ["vencidas"],
    })
    expect(g.resumen.totalAlumnos).toBe(5)
    expect(g.resumen.alumnosEnRiesgo).toBe(4)
  }, 60_000)

  it("CAL-T-52: una clase que pasa de categorías a puntos (se quitan todas) cambia a modo puntos y la tarea antes «Sin categoría» empieza a contar", async () => {
    const e = await claseDeAgregados()
    await obtenerDb().tarea.updateMany({
      where: { claseId: e.claseId },
      data: { categoriaId: null },
    })
    await obtenerDb().categoria.deleteMany({ where: { claseId: e.claseId } })
    const g = await gradebookDe(e.tokens.maestro, e.claseId)
    expect(g.resumen.modo).toBe("puntos")
    expect(g.tareas.every((t) => t.categoria === null)).toBe(true)
    // Uno: (8 + 5 + 10) / 30; Dos: 10/10.
    expect(g.alumnos.find((f) => f.alumno.id === e.uno.id)?.porcentaje).toBe(76.67)
    expect(g.alumnos.find((f) => f.alumno.id === e.dos.id)?.porcentaje).toBe(100)
  }, 60_000)

  it("CAL-T-53: redondeo en el umbral: 69.99 está en riesgo, 70 no, 139.99 de 200 (69.995) se redondea a 70 y no está en riesgo; el promedio de 69.99 y 70 es 70", async () => {
    const f = ficha()
    const c = await crearClaseDeGradebook(idsUsuarios, idsClases, f)
    const ahora = Date.now()
    const t1 = await crearTareaDePrueba({
      claseId: c.claseId,
      autorId: c.maestro.id,
      puntos: 100,
      fechaLimite: new Date(ahora + 48 * HORA_MS),
    })
    const t2 = await crearTareaDePrueba({
      claseId: c.claseId,
      autorId: c.maestro.id,
      puntos: 100,
      fechaLimite: new Date(ahora + 24 * HORA_MS),
    })
    const casi = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Casi Umbral ${f}`)
    const justo = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Justo Umbral ${f}`)
    const medio = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Medio Umbral ${f}`)
    const calif = (tareaId: string, alumnoId: string, calificacion: number) =>
      crearEntregaDePrueba({ tareaId, alumnoId, estado: "calificado", calificacion })
    await calif(t1, casi.id, 69.99)
    await calif(t1, justo.id, 70)
    await calif(t1, medio.id, 69.99)
    await calif(t2, medio.id, 70)

    const g = await gradebookDe(c.tokens.maestro, c.claseId)
    const de = (id: string) => g.alumnos.find((fila) => fila.alumno.id === id)
    expect(de(casi.id)).toMatchObject({ porcentaje: 69.99, motivosDeRiesgo: ["promedio"] })
    expect(de(justo.id)).toMatchObject({ porcentaje: 70, motivosDeRiesgo: [] })
    expect(de(medio.id)).toMatchObject({ porcentaje: 70, motivosDeRiesgo: [] })
    // (69.99 + 70 + 70) / 3 = 69.9966… → 70.
    expect(g.resumen.promedioDeLaClase).toBe(70)
    expect(g.resumen.alumnosEnRiesgo).toBe(1)

    await obtenerDb().inscripcion.delete({
      where: { claseId_usuarioId: { claseId: c.claseId, usuarioId: medio.id } },
      select: { claseId: true },
    })
    // (69.99 + 70) / 2 = 69.995 → 70 (mitades hacia arriba).
    expect((await gradebookDe(c.tokens.maestro, c.claseId)).resumen.promedioDeLaClase).toBe(70)
  }, 60_000)

  it("CAL-T-54: fronteras del milisegundo con un `ahora` explícito: vencida un milisegundo después de la fecha límite, no vencida en el milisegundo exacto ni uno antes", async () => {
    const f = ficha()
    const c = await crearClaseDeGradebook(idsUsuarios, idsClases, f)
    const limite = new Date("2031-07-01T10:20:30.456Z")
    const tareaId = await crearTareaDePrueba({
      claseId: c.claseId,
      autorId: c.maestro.id,
      puntos: 10,
      fechaLimite: limite,
    })
    const alumno = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Frontera ${f}`)
    const leer = (deltaMs: number) =>
      leerGradebook({
        claseId: c.claseId,
        cursor: undefined,
        limite: 50,
        cursorTareas: undefined,
        limiteTareas: 50,
        ahora: new Date(limite.getTime() + deltaMs),
      })
    expect((await leer(-1)).alumnos[0]?.vencidasSinEntregar).toBe(0)
    expect((await leer(0)).alumnos[0]?.vencidasSinEntregar).toBe(0)
    expect((await leer(1)).alumnos[0]?.vencidasSinEntregar).toBe(1)

    const mis = (deltaMs: number, filtro: "asignadas" | "sin-entregar") =>
      leerMisCalificaciones({
        claseId: c.claseId,
        alumnoId: alumno.id,
        filtro,
        cursor: undefined,
        limite: 20,
        ahora: new Date(limite.getTime() + deltaMs),
      })
    expect((await mis(0, "asignadas")).tareas.map((t) => t.id)).toEqual([tareaId])
    expect((await mis(0, "sin-entregar")).tareas).toEqual([])
    expect((await mis(1, "asignadas")).tareas).toEqual([])
    expect((await mis(1, "sin-entregar")).tareas.map((t) => t.id)).toEqual([tareaId])
  }, 60_000)
})

describe("ataque 01b r1: sin N+1 en el gradebook", () => {
  // Una clase con `categorias` categorías, `tareas` tareas repartidas entre ellas y `alumnos`
  // inscritos, cada uno con una entregada, una sin fila y el resto calificadas.
  const claseDeTamano = async (
    lista: readonly UsuarioDePrueba[],
    tamano: { alumnos: number; tareas: number; categorias: number },
  ) => {
    const c = await crearClaseDeGradebook(idsUsuarios, idsClases, ficha())
    const ahora = Date.now()
    const categorias: string[] = []
    for (let k = 0; k < tamano.categorias; k += 1) {
      categorias.push(
        (
          await crearCategoriaDePrueba({
            claseId: c.claseId,
            peso: 10,
            creadoEn: new Date(ahora - k),
          })
        ).id,
      )
    }
    const ids: string[] = []
    for (let k = 0; k < tamano.tareas; k += 1) {
      ids.push(
        await crearTareaDePrueba({
          claseId: c.claseId,
          autorId: c.maestro.id,
          puntos: 10,
          categoriaId: categorias.length === 0 ? null : (categorias[k % categorias.length] ?? null),
          fechaLimite: new Date(ahora + (k % 2 === 0 ? -1 : 1) * (k + 2) * HORA_MS),
        }),
      )
    }
    const inscritos = lista.slice(0, tamano.alumnos)
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
    return { claseId: c.claseId, primero: inscritos[0], segundo: inscritos[1], tareas: ids }
  }

  it("CAL-T-55: leerGradebook y leerMisCalificaciones (con cada filtro) hacen las mismas llamadas con 1, 2 y 30 alumnos, con 1, 2 y 30 tareas y con 1 y 10 categorías", async () => {
    const f = ficha()
    const lista: UsuarioDePrueba[] = []
    for (let i = 0; i < 30; i += 1) {
      lista.push(
        await crearAlumnoDePrueba(idsUsuarios, { nombre: `NN ${String(i).padStart(2, "0")} ${f}` }),
      )
    }
    const tamanos = [
      { alumnos: 1, tareas: 1, categorias: 1 },
      { alumnos: 2, tareas: 2, categorias: 1 },
      { alumnos: 30, tareas: 30, categorias: 1 },
      { alumnos: 2, tareas: 30, categorias: 10 },
      { alumnos: 30, tareas: 2, categorias: 10 },
      { alumnos: 30, tareas: 30, categorias: 10 },
    ]
    const delGradebook: string[][] = []
    const conCursores: string[][] = []
    const porFiltro = new Map<string, string[][]>()
    for (const tamano of tamanos) {
      const clase = await claseDeTamano(lista, tamano)
      if (clase.primero === undefined) throw new Error("Precondición: la clase tiene alumnos")
      const params = {
        claseId: clase.claseId,
        cursor: undefined as string | undefined,
        limite: 50,
        cursorTareas: undefined as string | undefined,
        limiteTareas: 50,
        ahora: new Date(),
      }
      const espia = ejecutorEspiado()
      const g = await leerGradebook(params, espia.ejecutor)
      expect(g.alumnos, "Precondición: todas las filas").toHaveLength(tamano.alumnos)
      expect(g.tareas, "Precondición: todas las columnas").toHaveLength(tamano.tareas)
      delGradebook.push(espia.llamadas)

      // Con cursores que dejan al menos una fila y una columna en la página.
      if (tamano.alumnos > 1 && tamano.tareas > 1) {
        const espiaConCursores = ejecutorEspiado()
        const conCursor = await leerGradebook(
          { ...params, cursor: clase.primero.id, cursorTareas: g.tareas[0]?.id },
          espiaConCursores.ejecutor,
        )
        expect(conCursor.alumnos.length, "Precondición: queda una fila").toBeGreaterThan(0)
        expect(conCursor.tareas.length, "Precondición: queda una columna").toBeGreaterThan(0)
        conCursores.push(espiaConCursores.llamadas)
      }

      for (const filtro of [
        "todas",
        "asignadas",
        "entregadas",
        "calificadas",
        "sin-entregar",
      ] as const) {
        const espiaMis = ejecutorEspiado()
        await leerMisCalificaciones(
          {
            claseId: clase.claseId,
            alumnoId: clase.primero.id,
            filtro,
            cursor: undefined,
            limite: 100,
            ahora: new Date(),
          },
          espiaMis.ejecutor,
        )
        const previas = porFiltro.get(filtro) ?? []
        previas.push(espiaMis.llamadas)
        porFiltro.set(filtro, previas)
      }
    }

    expect(delGradebook.length, "Precondición: seis tamaños").toBe(6)
    for (const [i, llamadas] of delGradebook.entries()) {
      expect(llamadas, JSON.stringify(tamanos[i])).toEqual(delGradebook[0])
    }
    expect(conCursores.length, "Precondición: cinco tamaños con cursores").toBe(5)
    for (const llamadas of conCursores) expect(llamadas).toEqual(conCursores[0])
    for (const [filtro, listas] of porFiltro) {
      expect(listas.length, `Precondición: ${filtro} en seis tamaños`).toBe(6)
      // Con la página vacía no se consultan las entregas: se compara entre las no vacías.
      const conEntregas = listas.filter((l) => l.includes("entrega.findMany"))
      for (const llamadas of conEntregas) expect(llamadas, filtro).toEqual(conEntregas[0])
      expect(conEntregas[0]?.length ?? 0, filtro).toBeLessThanOrEqual(4)
    }
  }, 180_000)
})

describe("ataque 01b r1: autorización y fugas del gradebook", () => {
  const escenarioDeAutorizacion = async () => {
    const f = ficha()
    const c = await crearClaseDeGradebook(idsUsuarios, idsClases, f)
    const tareaId = await crearTareaDePrueba({
      claseId: c.claseId,
      autorId: c.maestro.id,
      puntos: 10,
      fechaLimite: new Date(Date.now() - 24 * HORA_MS),
    })
    const restringida = await crearAlumnoDePrueba(idsUsuarios, {
      nombre: `Restringida Fuga ${f}`,
      estadoPago: "deudor",
      accesoRestringido: true,
    })
    const deudor = await crearAlumnoDePrueba(idsUsuarios, {
      nombre: `Saldo Fuga ${f}`,
      estadoPago: "deudor",
    })
    for (const alumno of [restringida, deudor]) {
      await inscribirDePrueba(c.claseId, alumno.id)
      await crearEntregaDePrueba({
        tareaId,
        alumnoId: alumno.id,
        estado: "calificado",
        calificacion: 3,
      })
    }
    const ajeno = await crearAlumnoDePrueba(idsUsuarios, {
      nombre: `Ajeno Fuga ${f}`,
      rol: "maestro",
    })
    const otraClase = await crearClaseDePrueba(idsClases, { maestroId: ajeno.id })
    const suyo = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Suyo Fuga ${f}` })
    await inscribirDePrueba(otraClase.id, suyo.id)
    const comaestro = await crearAlumnoDePrueba(idsUsuarios, {
      nombre: `Comaestro Fuga ${f}`,
      rol: "maestro",
    })
    await obtenerDb().maestroDeClase.create({
      data: { claseId: c.claseId, maestroId: comaestro.id },
      select: { claseId: true },
    })
    return {
      ...c,
      tareaId,
      suyo,
      tokens: {
        ...c.tokens,
        restringida: await firmarTokenDePrueba({ usuarioId: restringida.id }),
        deudor: await firmarTokenDePrueba({ usuarioId: deudor.id }),
        ajeno: await firmarTokenDePrueba({ usuarioId: ajeno.id }),
        comaestro: await firmarTokenDePrueba({ usuarioId: comaestro.id }),
      },
    }
  }

  const inyectarHead = (token: string | null, url: string) =>
    obtenerApp().inject({
      method: "HEAD",
      url,
      headers: token === null ? {} : { authorization: `Bearer ${token}` },
    })

  it("CAL-T-56: HEAD del gradebook sigue la misma cadena: sin token 401, estudiante 403, restringida 403, maestro ajeno 403; maestro, comaestro y admin 200 sin cuerpo", async () => {
    const e = await escenarioDeAutorizacion()
    const url = `/api/clases/${e.claseId}/gradebook`
    expect((await inyectarHead(null, url)).statusCode).toBe(401)
    for (const token of [e.tokens.deudor, e.tokens.restringida, e.tokens.ajeno]) {
      const respuesta = await inyectarHead(token, url)
      expect(respuesta.statusCode).toBe(403)
      expect(respuesta.body).toBe("")
    }
    for (const token of [e.tokens.maestro, e.tokens.comaestro, e.tokens.admin]) {
      const respuesta = await inyectarHead(token, url)
      expect(respuesta.statusCode).toBe(200)
      expect(respuesta.body).toBe("")
    }
  }, 60_000)

  it("CAL-T-57: el maestro ajeno recibe el mismo 403 con un cursor de un alumno suyo, con límites o cursorTareas inválidos y en una clase inexistente (la autorización va antes que la validación de la consulta)", async () => {
    const e = await escenarioDeAutorizacion()
    const base = await pedir(e.tokens.ajeno, `/api/clases/${e.claseId}/gradebook`)
    expect(base.statusCode).toBe(403)
    expect(codigoDe(base)).toBe("SIN_ACCESO_A_LA_CLASE")
    const consultas = [
      `?cursor=${e.suyo.id}`,
      "?limite=0",
      "?limiteTareas=abc",
      `?cursorTareas=${randomUUID()}`,
      `?cursorTareas=${e.tareaId}`,
    ]
    for (const consulta of consultas) {
      const respuesta = await pedir(e.tokens.ajeno, `/api/clases/${e.claseId}/gradebook${consulta}`)
      expect(respuesta.statusCode, consulta).toBe(403)
      expect(respuesta.json(), consulta).toEqual(base.json())
      const inexistente = await pedir(
        e.tokens.ajeno,
        `/api/clases/${randomUUID()}/gradebook${consulta}`,
      )
      expect(inexistente.statusCode, consulta).toBe(403)
      expect(inexistente.json(), consulta).toEqual(base.json())
    }
    const estudiante = await pedir(e.tokens.deudor, `/api/clases/${e.claseId}/gradebook?limite=0`)
    expect(estudiante.statusCode).toBe(403)
    expect(codigoDe(estudiante)).toBe("ROL_NO_PERMITIDO")
  }, 60_000)

  it("CAL-T-58: :claseId que no es uuid responde 400; en mayúsculas responde lo mismo que en minúsculas", async () => {
    const e = await escenarioDeAutorizacion()
    for (const malo of ["no-es-un-id", "1", `${e.claseId}x`, "%00"]) {
      const respuesta = await pedir(e.tokens.maestro, `/api/clases/${malo}/gradebook`)
      expect(respuesta.statusCode, malo).toBe(400)
    }
    const minusculas = await gradebookDe(e.tokens.maestro, e.claseId)
    const mayusculas = await gradebookDe(e.tokens.maestro, e.claseId.toUpperCase())
    expect(mayusculas).toEqual(minusculas)
  }, 60_000)

  it("CAL-T-59: toda la tabla, para el maestro, el comaestro y el admin, trae solo las llaves del contrato, con la deudora restringida en su fila y sin estado de pago, restricción, correo, rol ni versión", async () => {
    const e = await escenarioDeAutorizacion()
    for (const token of [e.tokens.maestro, e.tokens.comaestro, e.tokens.admin]) {
      const respuesta = await pedir(token, `/api/clases/${e.claseId}/gradebook`)
      expect(respuesta.statusCode, respuesta.body).toBe(200)
      expect(respuesta.body).not.toMatch(
        /estadoPago|accesoRestringido|motivoRestriccion|email|"rol"|deudor|"version"|@/i,
      )
      const cuerpo = respuesta.json<Record<string, unknown>>()
      expect(Object.keys(cuerpo).sort()).toEqual(
        ["alumnos", "resumen", "siguienteCursor", "siguienteCursorTareas", "tareas"].sort(),
      )
      const g = gradebookRespuestaSchema.parse(cuerpo)
      expect(g.alumnos).toHaveLength(2)
      for (const fila of g.alumnos) {
        expect(Object.keys(fila).sort()).toEqual(
          ["alumno", "celdas", "motivosDeRiesgo", "porcentaje", "vencidasSinEntregar"].sort(),
        )
        expect(Object.keys(fila.alumno).sort()).toEqual(["id", "nombre"])
        expect(fila.porcentaje).toBe(30)
      }
    }
  }, 60_000)
})

describe("ataque 01b r1: valores por defecto y ventanas vacías del gradebook", () => {
  it("CAL-T-67: sin límites, 25 filas y 20 columnas; con el cursor de la última fila o de la última tarea, la página queda vacía en esa dimensión sin romper la otra ni el resumen", async () => {
    const f = ficha()
    const c = await crearClaseDeGradebook(idsUsuarios, idsClases, f)
    const ahora = Date.now()
    for (let k = 0; k < 21; k += 1) {
      await crearTareaDePrueba({
        claseId: c.claseId,
        autorId: c.maestro.id,
        puntos: 10,
        fechaLimite: new Date(ahora + (k + 24) * HORA_MS),
      })
    }
    for (let i = 0; i < 26; i += 1) {
      await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `D ${String(i).padStart(2, "0")} ${f}`)
    }
    const g = await gradebookDe(c.tokens.maestro, c.claseId)
    expect(g.alumnos).toHaveLength(25)
    expect(g.tareas).toHaveLength(20)
    expect(g.siguienteCursor).not.toBeNull()
    expect(g.siguienteCursorTareas).not.toBeNull()
    expect(g.resumen.totalAlumnos).toBe(26)

    const todo = await gradebookDe(c.tokens.maestro, c.claseId, "?limite=50&limiteTareas=50")
    const ultimaFila = todo.alumnos.at(-1)?.alumno.id
    const ultimaTarea = todo.tareas.at(-1)?.id
    if (ultimaFila === undefined || ultimaTarea === undefined) {
      throw new Error("Precondición: la clase tiene filas y columnas")
    }
    const sinColumnas = await gradebookDe(
      c.tokens.maestro,
      c.claseId,
      `?cursorTareas=${ultimaTarea}`,
    )
    expect(sinColumnas.tareas).toEqual([])
    expect(sinColumnas.siguienteCursorTareas).toBeNull()
    expect(sinColumnas.alumnos).toHaveLength(25)
    expect(sinColumnas.alumnos.every((fila) => fila.celdas.length === 0)).toBe(true)
    expect(sinColumnas.resumen).toEqual(g.resumen)

    const sinFilas = await gradebookDe(c.tokens.maestro, c.claseId, `?cursor=${ultimaFila}`)
    expect(sinFilas.alumnos).toEqual([])
    expect(sinFilas.siguienteCursor).toBeNull()
    expect(sinFilas.tareas).toHaveLength(20)
    expect(sinFilas.resumen).toEqual(g.resumen)
  }, 120_000)
})
