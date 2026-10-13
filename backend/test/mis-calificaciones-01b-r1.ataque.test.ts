import { randomUUID } from "node:crypto"

import {
  errorApiSchema,
  misCalificacionesRespuestaSchema,
  type MisCalificacionesRespuesta,
} from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import {
  borrarUsuariosDePrueba,
  desactivarUsuarioDePrueba,
  firmarTokenDePrueba,
} from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"
import { crearEntregaDePrueba } from "./ayudas-entregas.js"
import {
  crearCalificadaSinEntregaDePrueba,
  crearClaseDeGradebook,
  HORA_MS,
  inscribirAlumnoDePrueba,
  pedirGet,
} from "./ayudas-gradebook.js"
import { crearCategoriaDePrueba, crearTareaDePrueba } from "./ayudas-tareas.js"

// Ataque de la ronda 1 de CALIFICACIONES-01b sobre "Mis calificaciones" (§D-7): nada de otro alumno
// por el filtro, el cursor, la consulta ni una tarea de otra clase; la forma exacta de la respuesta
// (sin versión ni promedio de la clase); `general` igual en todas las páginas; los cinco filtros
// como partición; autorización y validación. Las fechas límite son relativas al reloj real con al
// menos 24 horas de margen.

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

const FILTROS = ["todas", "asignadas", "entregadas", "calificadas", "sin-entregar"] as const

const misDe = async (
  token: string,
  claseId: string,
  consulta = "",
): Promise<MisCalificacionesRespuesta> => {
  const respuesta = await pedir(token, `/api/clases/${claseId}/mis-calificaciones${consulta}`)
  expect(respuesta.statusCode, respuesta.body).toBe(200)
  return misCalificacionesRespuestaSchema.parse(respuesta.json())
}

const recorrer = async (
  token: string,
  claseId: string,
  filtro: string,
  limite: number,
): Promise<MisCalificacionesRespuesta[]> => {
  const paginas: MisCalificacionesRespuesta[] = []
  let cursor: string | null = null
  for (let vuelta = 0; vuelta < 30; vuelta += 1) {
    const consulta: string =
      `?estado=${filtro}&limite=${String(limite)}` + (cursor === null ? "" : `&cursor=${cursor}`)
    const pagina = await misDe(token, claseId, consulta)
    expect(pagina.tareas.length).toBeLessThanOrEqual(limite)
    paginas.push(pagina)
    cursor = pagina.siguienteCursor
    if (cursor === null) return paginas
  }
  throw new Error("El recorrido no terminó en 30 vueltas")
}

// Ocho tareas (cuatro vencidas, cuatro por vencer, dos con categoría) y dos alumnos. Ana tiene un
// caso por estado; Beto, el compañero, tiene calificaciones donde Ana no tiene nada.
const escenario = async () => {
  const f = ficha()
  const c = await crearClaseDeGradebook(idsUsuarios, idsClases, f)
  const ahora = Date.now()
  const k = await crearCategoriaDePrueba({ claseId: c.claseId, nombre: "Proyectos", peso: 100 })
  const tarea = (horas: number, categoriaId: string | null = null) =>
    crearTareaDePrueba({
      claseId: c.claseId,
      autorId: c.maestro.id,
      puntos: 10,
      categoriaId,
      aceptaTardias: false,
      fechaLimite: new Date(ahora + horas * HORA_MS),
    })
  const v1 = await tarea(-96, k.id)
  const v2 = await tarea(-72)
  const v3 = await tarea(-48)
  const v4 = await tarea(-24)
  const p1 = await tarea(24, k.id)
  const p2 = await tarea(48)
  const p3 = await tarea(72)
  const p4 = await tarea(96)
  const ana = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Ana Mis ${f}`)
  const beto = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Beto Mis ${f}`)

  // Ana: v1 calificada sin entrega (6/10); v2 calificada con retraso (8/10); v3 entregada con
  // retraso; v4 fila asignado (solo hilo); p1 calificada a tiempo (10/10); p2 entregada a tiempo;
  // p3 fila asignado; p4 sin fila.
  await crearCalificadaSinEntregaDePrueba({ tareaId: v1, alumnoId: ana.id, calificacion: 6 })
  await crearEntregaDePrueba({
    tareaId: v2,
    alumnoId: ana.id,
    estado: "calificado",
    calificacion: 8,
    conRetraso: true,
  })
  await crearEntregaDePrueba({ tareaId: v3, alumnoId: ana.id, conRetraso: true })
  await crearEntregaDePrueba({ tareaId: v4, alumnoId: ana.id, estado: "asignado", version: 0 })
  await crearEntregaDePrueba({
    tareaId: p1,
    alumnoId: ana.id,
    estado: "calificado",
    calificacion: 10,
  })
  await crearEntregaDePrueba({ tareaId: p2, alumnoId: ana.id })
  await crearEntregaDePrueba({ tareaId: p3, alumnoId: ana.id, estado: "asignado", version: 0 })
  // Beto: calificaciones y entregas justo donde Ana no tiene nada (p4) o tiene otra cosa (v4, p3).
  await crearEntregaDePrueba({
    tareaId: p4,
    alumnoId: beto.id,
    estado: "calificado",
    calificacion: 1,
  })
  await crearEntregaDePrueba({
    tareaId: v4,
    alumnoId: beto.id,
    estado: "calificado",
    calificacion: 2,
  })
  await crearEntregaDePrueba({ tareaId: p3, alumnoId: beto.id })
  return { ...c, k, v1, v2, v3, v4, p1, p2, p3, p4, ana, beto }
}

describe("ataque 01b r1: «Mis calificaciones» nunca muestra lo de otro alumno", () => {
  it("CAL-T-60: ni el filtro, ni un parámetro con el id del compañero, ni un cursor de otra clase o de un usuario muestran sus entregas o sus calificaciones", async () => {
    const e = await escenario()
    const todas = await misDe(e.ana.token, e.claseId)
    const de = (id: string) => todas.tareas.find((t) => t.id === id)?.entrega
    expect(de(e.p4)).toEqual({ estado: "asignado", conRetraso: false, calificacion: null })
    expect(de(e.v4)).toEqual({ estado: "asignado", conRetraso: false, calificacion: null })
    expect(de(e.p3)).toEqual({ estado: "asignado", conRetraso: false, calificacion: null })
    const calificadas = await misDe(e.ana.token, e.claseId, "?estado=calificadas")
    expect(calificadas.tareas.map((t) => t.id).sort()).toEqual([e.v1, e.v2, e.p1].sort())
    const entregadas = await misDe(e.ana.token, e.claseId, "?estado=entregadas")
    expect(entregadas.tareas.map((t) => t.id).sort()).toEqual([e.v3, e.p2].sort())

    for (const consulta of [
      `?alumnoId=${e.beto.id}`,
      `?usuarioId=${e.beto.id}`,
      `?alumno=${e.beto.id}`,
      `?estado=todas&alumnoId=${e.beto.id}`,
    ]) {
      expect(await misDe(e.ana.token, e.claseId, consulta), consulta).toEqual(todas)
    }

    const otra = await crearClaseDeGradebook(idsUsuarios, idsClases, ficha())
    const deOtra = await crearTareaDePrueba({ claseId: otra.claseId, autorId: otra.maestro.id })
    await inscribirDePrueba(otra.claseId, e.beto.id)
    await crearEntregaDePrueba({
      tareaId: deOtra,
      alumnoId: e.beto.id,
      estado: "calificado",
      calificacion: 5,
    })
    for (const malo of [deOtra, e.beto.id, e.claseId, randomUUID()]) {
      const respuesta = await pedir(
        e.ana.token,
        `/api/clases/${e.claseId}/mis-calificaciones?cursor=${malo}`,
      )
      expect(respuesta.statusCode, malo).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
    }
    // Beto solo ve lo suyo: sus dos calificadas son «Sin categoría» y no cuentan; nada de Ana.
    const deBeto = await misDe(e.beto.token, e.claseId)
    expect(deBeto.general.puntos).toEqual({ obtenido: 0, posible: 0, tareas: 0 })
    expect(deBeto.general.porcentaje).toBeNull()
    expect(deBeto.general.sinCategoria).toEqual({ tareas: 2 })
  }, 60_000)

  it("CAL-T-61: la respuesta tiene solo las llaves del contrato: ni versión, ni promedio de la clase, ni resumen, ni datos de pago o restricción", async () => {
    const e = await escenario()
    const respuesta = await pedir(e.ana.token, `/api/clases/${e.claseId}/mis-calificaciones`)
    expect(respuesta.statusCode).toBe(200)
    expect(respuesta.body).not.toMatch(
      /"version"|promedio|resumen|totalAlumnos|enRiesgo|estadoPago|accesoRestringido|email|"rol"|@/i,
    )
    const cuerpo = respuesta.json<Record<string, unknown>>()
    expect(Object.keys(cuerpo).sort()).toEqual(["general", "siguienteCursor", "tareas"])
    const mis = misCalificacionesRespuestaSchema.parse(cuerpo)
    for (const tarea of mis.tareas) {
      expect(Object.keys(tarea).sort()).toEqual(
        ["categoria", "entrega", "fechaLimite", "id", "puntos", "titulo"].sort(),
      )
      expect(Object.keys(tarea.entrega).sort()).toEqual(["calificacion", "conRetraso", "estado"])
    }
    expect(Object.keys(mis.general).sort()).toEqual(
      ["categorias", "modo", "porcentaje", "puntos", "sinCategoria"].sort(),
    )
  }, 60_000)
})

describe("ataque 01b r1: filtros, páginas y general de «Mis calificaciones»", () => {
  it("CAL-T-62: los cinco filtros: los cuatro de estado son una partición de «todas» (la calificada sin entrega solo en calificadas, la entregada con retraso en entregadas, la fila asignado según su fecha)", async () => {
    const e = await escenario()
    const ids = async (filtro: string) =>
      (await misDe(e.ana.token, e.claseId, `?estado=${filtro}&limite=100`)).tareas.map((t) => t.id)
    const todas = await ids("todas")
    expect(todas).toHaveLength(8)
    const porFiltro = {
      asignadas: await ids("asignadas"),
      entregadas: await ids("entregadas"),
      calificadas: await ids("calificadas"),
      "sin-entregar": await ids("sin-entregar"),
    }
    expect(porFiltro.asignadas.sort()).toEqual([e.p3, e.p4].sort())
    expect(porFiltro.entregadas.sort()).toEqual([e.v3, e.p2].sort())
    expect(porFiltro.calificadas.sort()).toEqual([e.v1, e.v2, e.p1].sort())
    expect(porFiltro["sin-entregar"]).toEqual([e.v4])
    const union = Object.values(porFiltro).flat()
    expect(new Set(union).size, "sin repetidas entre filtros").toBe(union.length)
    expect(union.sort()).toEqual([...todas].sort())
  }, 60_000)

  it("CAL-T-63: con una tarea por página, cada filtro se recorre completo sin repetir ni saltar y todas las páginas traen el mismo general, el de core/", async () => {
    const e = await escenario()
    const completa = await misDe(e.ana.token, e.claseId, "?limite=100")
    // Proyectos: v1 6/10 y p1 10/10 → 80 %; v2 (8/10) es «Sin categoría» y no cuenta.
    expect(completa.general.porcentaje).toBe(80)
    expect(completa.general.sinCategoria).toEqual({ tareas: 1 })
    for (const filtro of FILTROS) {
      const enteras = await misDe(e.ana.token, e.claseId, `?estado=${filtro}&limite=100`)
      const paginas = await recorrer(e.ana.token, e.claseId, filtro, 1)
      expect(
        paginas.flatMap((p) => p.tareas.map((t) => t.id)),
        filtro,
      ).toEqual(enteras.tareas.map((t) => t.id))
      for (const pagina of paginas) expect(pagina.general, filtro).toEqual(completa.general)
    }
  }, 120_000)

  it("CAL-T-64: límites 0, 101, -1, 1.5, texto y vacío responden 400; 1 y 100 responden 200; un filtro desconocido, en mayúsculas, vacío o repetido responde 400", async () => {
    const e = await escenario()
    const url = `/api/clases/${e.claseId}/mis-calificaciones`
    for (const valor of ["0", "101", "-1", "1.5", "abc", "", "Infinity"]) {
      const respuesta = await pedir(e.ana.token, `${url}?limite=${valor}`)
      expect(respuesta.statusCode, `limite=${valor}`).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
    }
    expect((await misDe(e.ana.token, e.claseId, "?limite=1")).tareas).toHaveLength(1)
    expect((await misDe(e.ana.token, e.claseId, "?limite=100")).tareas).toHaveLength(8)
    for (const valor of [
      "Calificadas",
      "sin_entregar",
      "",
      "todas&estado=calificadas",
      "pendientes",
    ]) {
      const respuesta = await pedir(e.ana.token, `${url}?estado=${valor}`)
      expect(respuesta.statusCode, `estado=${valor}`).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
    }
  }, 60_000)
})

describe("ataque 01b r1: autorización de «Mis calificaciones»", () => {
  const inyectarHead = (token: string | null, url: string) =>
    obtenerApp().inject({
      method: "HEAD",
      url,
      headers: token === null ? {} : { authorization: `Bearer ${token}` },
    })

  it("CAL-T-65: la restringida recibe 403 ACCESO_RESTRINGIDO por GET y por HEAD, también con una consulta inválida; la deudora, 200 sin su estado de pago", async () => {
    const e = await escenario()
    const f = ficha()
    const restringida = await crearAlumnoDePrueba(idsUsuarios, {
      nombre: `Restringida Mis ${f}`,
      estadoPago: "deudor",
      accesoRestringido: true,
    })
    const saldo = await crearAlumnoDePrueba(idsUsuarios, {
      nombre: `Saldo Mis ${f}`,
      estadoPago: "deudor",
    })
    for (const alumno of [restringida, saldo]) {
      await inscribirDePrueba(e.claseId, alumno.id)
      await crearEntregaDePrueba({
        tareaId: e.v2,
        alumnoId: alumno.id,
        estado: "calificado",
        calificacion: 4,
      })
    }
    const tokenRestringida = await firmarTokenDePrueba({ usuarioId: restringida.id })
    const url = `/api/clases/${e.claseId}/mis-calificaciones`
    for (const consulta of ["", "?limite=0", "?estado=raro", `?cursor=${randomUUID()}`]) {
      const respuesta = await pedir(tokenRestringida, `${url}${consulta}`)
      expect(respuesta.statusCode, consulta).toBe(403)
      expect(codigoDe(respuesta), consulta).toBe("ACCESO_RESTRINGIDO")
      expect(respuesta.body).not.toMatch(/"calificacion"|"general"|deudor|estadoPago/)
    }
    const head = await inyectarHead(tokenRestringida, url)
    expect(head.statusCode).toBe(403)
    expect(head.body).toBe("")
    expect((await inyectarHead(null, url)).statusCode).toBe(401)

    const respuesta = await pedir(await firmarTokenDePrueba({ usuarioId: saldo.id }), url)
    expect(respuesta.statusCode, respuesta.body).toBe(200)
    expect(respuesta.body).not.toMatch(/estadoPago|deudor|accesoRestringido|email|@/i)
    expect(misCalificacionesRespuestaSchema.parse(respuesta.json()).general.porcentaje).toBeNull()
  }, 60_000)

  it("CAL-T-66: el maestro de la clase, el admin y el maestro ajeno reciben 403 aun con consulta inválida; el alumno dado de baja con calificaciones, 403; el desactivado, 401; :claseId que no es uuid, 400; en mayúsculas responde lo mismo", async () => {
    const e = await escenario()
    const url = `/api/clases/${e.claseId}/mis-calificaciones`
    const ajeno = await crearAlumnoDePrueba(idsUsuarios, {
      nombre: `Ajeno Mis ${ficha()}`,
      rol: "maestro",
    })
    const tokenAjeno = await firmarTokenDePrueba({ usuarioId: ajeno.id })
    for (const token of [e.tokens.maestro, e.tokens.admin, tokenAjeno]) {
      for (const consulta of ["", "?limite=0", `?cursor=${e.v1}`]) {
        const respuesta = await pedir(token, `${url}${consulta}`)
        expect(respuesta.statusCode, consulta).toBe(403)
        expect(codigoDe(respuesta), consulta).toBe("ROL_NO_PERMITIDO")
      }
      const head = await inyectarHead(token, url)
      expect(head.statusCode).toBe(403)
    }

    const mayusculas = await misDe(e.ana.token, e.claseId.toUpperCase())
    expect(mayusculas).toEqual(await misDe(e.ana.token, e.claseId))
    for (const malo of ["no-es-un-id", `${e.claseId}x`, "1"]) {
      const respuesta = await pedir(e.ana.token, `/api/clases/${malo}/mis-calificaciones`)
      expect(respuesta.statusCode, malo).toBe(400)
    }

    await obtenerDb().inscripcion.delete({
      where: { claseId_usuarioId: { claseId: e.claseId, usuarioId: e.ana.id } },
      select: { claseId: true },
    })
    const baja = await pedir(e.ana.token, url)
    expect(baja.statusCode).toBe(403)
    expect(codigoDe(baja)).toBe("SIN_ACCESO_A_LA_CLASE")
    expect(baja.body).not.toMatch(/"calificacion"|"general"/)

    await desactivarUsuarioDePrueba(e.beto.id)
    expect((await pedir(e.beto.token, url)).statusCode).toBe(401)
  }, 60_000)
})
