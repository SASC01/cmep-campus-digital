import { randomUUID } from "node:crypto"

import { errorApiSchema, listaTrabajoRespuestaSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb, type Ejecutor } from "../src/adapters/db/cliente.js"
import { listarEntregas, listarTrabajo } from "../src/adapters/db/index.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba, type UsuarioDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { crearEntregaDePrueba } from "./ayudas-entregas.js"
import { crearMaterialConTemaDePrueba, crearTareaDePrueba } from "./ayudas-tareas.js"

// ENTREGAS-01b (PR-1B20 y PR-1B23). Lecturas de varias sentencias: la lista de entregas en una sola
// instantánea (la página y los conteos no se contradicen aunque algo cambie en medio) y "Trabajo de
// clase" con la entrega del alumno en una sola consulta por página. Un ejecutor envuelto (como el de
// lecturas-consistentes.integracion) corre un gancho después de una llamada concreta, sin retener
// bloqueos, y cuenta las llamadas de cada modelo.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

type Gancho = (llamada: string) => Promise<void>
type Funcion = (...argumentos: unknown[]) => unknown

// Envuelve el cliente (y la transacción que abra, con sus opciones) para avisar al gancho después de
// cada <modelo>.<operación>.
const conGancho = <T extends object>(objetivo: T, gancho: Gancho): T => {
  const envolverModelo = (modelo: string, delegado: object): object =>
    new Proxy(delegado, {
      get(destino, metodo) {
        const valor: unknown = Reflect.get(destino, metodo)
        if (typeof valor !== "function" || typeof metodo !== "string") return valor
        const original = valor as Funcion
        return async (...argumentos: unknown[]): Promise<unknown> => {
          const resultado: unknown = await original.apply(destino, argumentos)
          await gancho(`${modelo}.${metodo}`)
          return resultado
        }
      },
    })
  return new Proxy(objetivo, {
    get(destino, propiedad) {
      const valor: unknown = Reflect.get(destino, propiedad)
      if (propiedad === "$transaction" && typeof valor === "function") {
        const original = valor as Funcion
        return (fn: (tx: object) => Promise<unknown>, opciones?: unknown): unknown => {
          const envuelta = (tx: object): Promise<unknown> => fn(conGancho(tx, gancho))
          return opciones === undefined
            ? original.call(destino, envuelta)
            : original.call(destino, envuelta, opciones)
        }
      }
      if (
        typeof propiedad === "string" &&
        !propiedad.startsWith("$") &&
        typeof valor === "object" &&
        valor !== null
      ) {
        return envolverModelo(propiedad, valor)
      }
      return valor
    },
  })
}

const ejecutorConGancho = (gancho: Gancho): Ejecutor => conGancho(obtenerDb(), gancho)

const pedir = (token: string, url: string): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({ method: "GET", url, headers: { authorization: `Bearer ${token}` } })

const ficha = (): string => randomUUID().slice(0, 6)

describe("lista de entregas en una sola instantánea (PR-1B20)", () => {
  interface Escenario {
    claseId: string
    tareaId: string
    alumnos: UsuarioDePrueba[]
    tokenMaestro: string
  }

  const preparar = async (): Promise<Escenario> => {
    const f = ficha()
    const maestro = await crearAlumnoDePrueba(idsUsuarios, {
      nombre: `Maestra ${f}`,
      rol: "maestro",
    })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const alumnos: UsuarioDePrueba[] = []
    for (const nombre of ["Ana", "Beto", "Ciro"]) {
      const alumno = await crearAlumnoDePrueba(idsUsuarios, { nombre: `${nombre} ${f}` })
      await inscribirDePrueba(clase.id, alumno.id)
      alumnos.push(alumno)
    }
    const tareaId = await crearTareaDePrueba({ claseId: clase.id, autorId: maestro.id })
    return {
      claseId: clase.id,
      tareaId,
      alumnos,
      tokenMaestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
    }
  }

  it("PR-1B20: un cursor de un usuario inexistente responde 400 VALIDACION «cursor: no es válido»", async () => {
    const e = await preparar()
    const respuesta = await pedir(
      e.tokenMaestro,
      `/api/clases/${e.claseId}/tareas/${e.tareaId}/entregas?cursor=${randomUUID()}`,
    )
    expect(respuesta.statusCode, respuesta.body).toBe(400)
    expect(errorApiSchema.parse(respuesta.json()).error).toEqual({
      codigo: "VALIDACION",
      mensaje: "cursor: no es válido",
    })
  })

  it("PR-1B20: una entrega que se crea y un alumno que se inscribe entre la página y los conteos no dejan una respuesta incoherente", async () => {
    const e = await preparar()
    const [ana, beto] = e.alumnos
    if (!ana || !beto) throw new Error("Precondición: tres alumnos")
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: ana.id })
    const nuevo = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Dora ${ficha()}` })

    let disparado = false
    const lista = await listarEntregas(
      { claseId: e.claseId, tareaId: e.tareaId, cursor: undefined, limite: 50 },
      ejecutorConGancho(async (llamada) => {
        if (disparado || llamada !== "inscripcion.findMany") return
        disparado = true
        // Por otra conexión (el cliente sin envolver), después de leer la página.
        await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: beto.id })
        await inscribirDePrueba(e.claseId, nuevo.id)
      }),
    )

    expect(disparado, "Precondición: el gancho corrió después de la página").toBe(true)
    if (lista === null) throw new Error("Precondición: la tarea existe")
    expect(lista.entregas).toHaveLength(3)
    expect(lista.total).toBe(lista.entregas.length)
    const entregadasEnLaPagina = lista.entregas.filter((f) => f.estado !== "asignado").length
    expect(lista.entregadas).toBe(entregadasEnLaPagina)
    expect(lista.entregadas).toBe(1)
    expect(lista.entregas.find((f) => f.alumno.id === beto.id)?.estado).toBe("asignado")
    // Control: después de la lectura, los cambios sí están.
    const despues = await listarEntregas({
      claseId: e.claseId,
      tareaId: e.tareaId,
      cursor: undefined,
      limite: 50,
    })
    expect(despues).toMatchObject({ total: 4, entregadas: 2 })
  })
})

describe("Trabajo de clase con la entrega del alumno (PR-1B23)", () => {
  interface Escenario {
    claseId: string
    maestroId: string
    alumno: UsuarioDePrueba
    otro: UsuarioDePrueba
    tareas: { entregada: string; conRetraso: string; delOtro: string; calificada: string }
    material: string
    tokens: { alumno: string; otro: string; maestro: string; admin: string }
  }

  const preparar = async (): Promise<Escenario> => {
    const f = ficha()
    const maestro = await crearAlumnoDePrueba(idsUsuarios, {
      nombre: `Maestra ${f}`,
      rol: "maestro",
    })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const alumno = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Alumna ${f}` })
    const otro = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Otro ${f}` })
    await inscribirDePrueba(clase.id, alumno.id)
    await inscribirDePrueba(clase.id, otro.id)
    const nueva = (): Promise<string> =>
      crearTareaDePrueba({ claseId: clase.id, autorId: maestro.id })
    const tareas = {
      entregada: await nueva(),
      conRetraso: await nueva(),
      delOtro: await nueva(),
      calificada: await nueva(),
    }
    await crearEntregaDePrueba({ tareaId: tareas.entregada, alumnoId: alumno.id })
    await crearEntregaDePrueba({
      tareaId: tareas.conRetraso,
      alumnoId: alumno.id,
      conRetraso: true,
    })
    await crearEntregaDePrueba({ tareaId: tareas.delOtro, alumnoId: otro.id, conRetraso: true })
    await crearEntregaDePrueba({
      tareaId: tareas.calificada,
      alumnoId: alumno.id,
      estado: "calificado",
    })
    const material = await crearMaterialConTemaDePrueba({ claseId: clase.id, autorId: maestro.id })
    return {
      claseId: clase.id,
      maestroId: maestro.id,
      alumno,
      otro,
      tareas,
      material,
      tokens: {
        alumno: await firmarTokenDePrueba({ usuarioId: alumno.id }),
        otro: await firmarTokenDePrueba({ usuarioId: otro.id }),
        maestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
        admin: await tokenDelAdminDePrueba(),
      },
    }
  }

  const trabajoDe = async (e: Escenario, token: string) => {
    const respuesta = await pedir(token, `/api/clases/${e.claseId}/trabajo?tema=sin-tema`)
    expect(respuesta.statusCode, respuesta.body).toBe(200)
    const { elementos } = listaTrabajoRespuestaSchema.parse(respuesta.json())
    return new Map(elementos.map((elemento) => [elemento.id, elemento.entrega]))
  }

  it("PR-1B23: el alumno recibe en cada tarea su entrega (estado y conRetraso) o null, nunca la de otro alumno; los materiales, null", async () => {
    const e = await preparar()
    const delAlumno = await trabajoDe(e, e.tokens.alumno)
    expect(Object.fromEntries(delAlumno)).toEqual({
      [e.tareas.entregada]: { estado: "entregado", conRetraso: false },
      [e.tareas.conRetraso]: { estado: "entregado", conRetraso: true },
      [e.tareas.delOtro]: null,
      [e.tareas.calificada]: { estado: "calificado", conRetraso: false },
      [e.material]: null,
    })
    const delOtro = await trabajoDe(e, e.tokens.otro)
    expect(Object.fromEntries(delOtro)).toEqual({
      [e.tareas.entregada]: null,
      [e.tareas.conRetraso]: null,
      [e.tareas.delOtro]: { estado: "entregado", conRetraso: true },
      [e.tareas.calificada]: null,
      [e.material]: null,
    })
  })

  it("PR-1B23: el maestro y el admin reciben null en todos los elementos", async () => {
    const e = await preparar()
    for (const token of [e.tokens.maestro, e.tokens.admin]) {
      const entregas = await trabajoDe(e, token)
      expect(entregas.size).toBe(5)
      expect([...entregas.values()].every((entrega) => entrega === null)).toBe(true)
    }
  })

  it("PR-1B23: con alumno, la consulta de entregas es una sola por página (también con una página de 10 tareas); sin alumno, ninguna", async () => {
    const e = await preparar()
    // Seis tareas más, sin entregas: la primera página de 10 tiene diez tareas.
    for (let i = 0; i < 6; i += 1) {
      await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestroId })
    }
    const contar = async (alumnoId: string | null, limite: number) => {
      const llamadas: string[] = []
      const lista = await listarTrabajo(
        { claseId: e.claseId, tema: "sin-tema", cursor: undefined, limite, alumnoId },
        ejecutorConGancho((llamada) => {
          llamadas.push(llamada)
          return Promise.resolve()
        }),
      )
      return { lista, entregas: llamadas.filter((l) => l.startsWith("entrega.")) }
    }

    const conAlumno = await contar(e.alumno.id, 10)
    expect(conAlumno.lista.elementos).toHaveLength(10)
    expect(conAlumno.entregas).toEqual(["entrega.findMany"])
    const paginaCorta = await contar(e.alumno.id, 3)
    expect(paginaCorta.entregas).toEqual(["entrega.findMany"])
    const sinAlumno = await contar(null, 10)
    expect(sinAlumno.entregas).toEqual([])
    expect(sinAlumno.lista.elementos.every((elemento) => elemento.entrega === null)).toBe(true)
  })
})
