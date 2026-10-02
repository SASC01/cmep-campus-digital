import { randomUUID } from "node:crypto"

import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import * as adaptadorDb from "../src/adapters/db/index.js"
import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
  leerInscripcion,
  leerMovimientos,
} from "./ayudas-clases.js"

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const maestroDePrueba = (): Promise<UsuarioDePrueba> =>
  crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
const alumno = (nombre = "Alumno de movimientos"): Promise<UsuarioDePrueba> =>
  crearAlumnoDePrueba(idsUsuarios, { nombre })
const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

const peticion = (opciones: {
  method: "GET" | "POST" | "DELETE"
  url: string
  token: string
  payload?: unknown
}): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method: opciones.method,
    url: opciones.url,
    payload: opciones.payload,
    headers: { authorization: `Bearer ${opciones.token}` },
  })

const agregar = (claseId: string, token: string, alumnoId: string) =>
  peticion({ method: "POST", url: `/api/clases/${claseId}/alumnos`, token, payload: { alumnoId } })
const quitar = (claseId: string, token: string, alumnoId: string) =>
  peticion({ method: "DELETE", url: `/api/clases/${claseId}/alumnos/${alumnoId}`, token })

// secuencia llega como bigint (N-12): se compara como bigint, nunca se resta ni se serializa.
const maximaSecuencia = async (): Promise<bigint> => {
  const { _max } = await obtenerDb().movimientoInscripcion.aggregate({ _max: { secuencia: true } })
  return _max.secuencia ?? 0n
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  // N-10: movimientos y clases antes que los usuarios (ON DELETE RESTRICT).
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("movimientos_inscripcion (P-05 g, S-23, M-03)", () => {
  it("PR-B16a: un alta manual efectiva escribe exactamente una fila alta con clase_id, alumno_id, maestro_id del perfil y creado_en, y con una secuencia mayor que la de cualquier movimiento anterior", async () => {
    const maestro = await maestroDePrueba()
    const nuevo = await alumno()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const anterior = await maximaSecuencia()

    const respuesta = await agregar(clase.id, await tokenDe(maestro), nuevo.id)

    expect(respuesta.statusCode).toBe(200)
    const filas = await leerMovimientos(clase.id)
    expect(filas).toHaveLength(1)
    const [fila] = filas
    expect(fila).toMatchObject({
      claseId: clase.id,
      alumnoId: nuevo.id,
      maestroId: maestro.id,
      tipo: "alta",
    })
    expect(fila?.creadoEn).toBeInstanceOf(Date)
    expect(fila?.secuencia !== undefined && fila.secuencia > anterior).toBe(true)
  })

  it("PR-B16b: una baja efectiva escribe exactamente una fila baja, con una secuencia mayor que la del alta previa", async () => {
    const maestro = await maestroDePrueba()
    const nuevo = await alumno()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const token = await tokenDe(maestro)
    await agregar(clase.id, token, nuevo.id)

    const respuesta = await quitar(clase.id, token, nuevo.id)

    expect(respuesta.statusCode).toBe(204)
    const filas = await leerMovimientos(clase.id)
    expect(filas.map((fila) => fila.tipo)).toEqual(["alta", "baja"])
    const [alta, baja] = filas
    expect(baja).toMatchObject({ claseId: clase.id, alumnoId: nuevo.id, maestroId: maestro.id })
    expect(alta !== undefined && baja !== undefined && baja.secuencia > alta.secuencia).toBe(true)
  })

  it("PR-B16c: un alta con yaEstaba: true y una baja de alguien no inscrito no escriben nada (S-23)", async () => {
    const maestro = await maestroDePrueba()
    const inscrito = await alumno()
    const nuncaInscrito = await alumno()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const token = await tokenDe(maestro)
    await agregar(clase.id, token, inscrito.id)
    expect(await leerMovimientos(clase.id)).toHaveLength(1)

    const repetida = await agregar(clase.id, token, inscrito.id)
    const bajaDeNadie = await quitar(clase.id, token, nuncaInscrito.id)

    expect(repetida.json<{ yaEstaba: boolean }>().yaEstaba).toBe(true)
    expect(bajaDeNadie.statusCode).toBe(204)
    expect(await leerMovimientos(clase.id)).toHaveLength(1)
  })

  it("PR-B16d: unirse con código no escribe nada; quitar después a ese alumno escribe una baja", async () => {
    const maestro = await maestroDePrueba()
    const quienSeUne = await alumno()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })

    const unirse = await peticion({
      method: "POST",
      url: "/api/clases/unirse",
      token: await tokenDe(quienSeUne),
      payload: { codigo: clase.codigoInvitacion },
    })
    expect(unirse.statusCode).toBe(200)
    expect(await leerInscripcion(clase.id, quienSeUne.id)).not.toBeNull()
    expect(await leerMovimientos(clase.id)).toHaveLength(0)

    const baja = await quitar(clase.id, await tokenDe(maestro), quienSeUne.id)

    expect(baja.statusCode).toBe(204)
    const filas = await leerMovimientos(clase.id)
    expect(filas).toHaveLength(1)
    expect(filas[0]).toMatchObject({ tipo: "baja", alumnoId: quienSeUne.id, maestroId: maestro.id })
  })

  it("PR-B16e: si el INSERT del movimiento falla (maestroId inexistente: viola la llave foránea), la transacción se revierte y no queda ninguna fila de movimiento", async () => {
    const maestro = await maestroDePrueba()
    const paraAlta = await alumno()
    const paraBaja = await alumno()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, paraBaja.id)

    await expect(
      adaptadorDb.agregarAlumnoManual({
        claseId: clase.id,
        alumnoId: paraAlta.id,
        maestroId: randomUUID(),
      }),
    ).rejects.toThrow()
    expect(await leerInscripcion(clase.id, paraAlta.id)).toBeNull()

    await expect(
      adaptadorDb.quitarAlumno({
        claseId: clase.id,
        alumnoId: paraBaja.id,
        maestroId: randomUUID(),
      }),
    ).rejects.toThrow()
    expect(await leerInscripcion(clase.id, paraBaja.id)).not.toBeNull()

    expect(await leerMovimientos(clase.id)).toHaveLength(0)
  })

  it(
    "PR-B16f: concurrencia: 5 rondas de 8 peticiones simultáneas (4 altas y 4 bajas del mismo alumno, en orden aleatorio): la secuencia más alta coincide con el estado final, las filas alternan alta y baja empezando por alta y altas − bajas ∈ {0, 1}",
    { timeout: 60000 },
    async () => {
      const maestro = await maestroDePrueba()
      const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
      const token = await tokenDe(maestro)

      for (let ronda = 1; ronda <= 5; ronda++) {
        // Un alumno nuevo por ronda: cada ronda empieza sin inscripción ni movimientos.
        const nuevo = await alumno(`Concurrente ${String(ronda)}`)
        const operaciones = [
          ...Array.from({ length: 4 }, () => "alta" as const),
          ...Array.from({ length: 4 }, () => "baja" as const),
        ]
        for (let i = operaciones.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          const intercambio = operaciones[i]
          operaciones[i] = operaciones[j] as "alta" | "baja"
          operaciones[j] = intercambio as "alta" | "baja"
        }

        const respuestas = await Promise.all(
          operaciones.map((operacion) =>
            operacion === "alta"
              ? agregar(clase.id, token, nuevo.id)
              : quitar(clase.id, token, nuevo.id),
          ),
        )

        const estatus = respuestas.map((respuesta) => respuesta.statusCode)
        expect(
          estatus.filter((codigo) => codigo >= 500),
          `ronda ${String(ronda)}: ${operaciones.join(",")} → ${estatus.join(",")}`,
        ).toEqual([])

        const filas = await obtenerDb().movimientoInscripcion.findMany({
          where: { claseId: clase.id, alumnoId: nuevo.id },
          orderBy: { secuencia: "asc" },
        })
        const inscrito = (await leerInscripcion(clase.id, nuevo.id)) !== null
        const contexto = `ronda ${String(ronda)}: ${operaciones.join(",")} → ${filas
          .map((fila) => fila.tipo)
          .join(",")}`
        expect(filas.length, contexto).toBeGreaterThan(0)
        filas.forEach((fila, indice) => {
          expect(fila.tipo, contexto).toBe(indice % 2 === 0 ? "alta" : "baja")
          const previa = filas[indice - 1]
          if (previa !== undefined) expect(fila.secuencia > previa.secuencia, contexto).toBe(true)
        })
        expect(filas.at(-1)?.tipo === "alta", contexto).toBe(inscrito)
        const altas = filas.filter((fila) => fila.tipo === "alta").length
        const bajas = filas.length - altas
        expect([0, 1], contexto).toContain(altas - bajas)
      }
    },
  )

  it("PR-B16g: ninguna ruta de printRoutes contiene «movimiento», y ninguna respuesta de las rutas de b contiene el id ni la secuencia de una fila de movimientos_inscripcion", async () => {
    const maestro = await maestroDePrueba()
    const nuevo = await alumno("Alumno Visible")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const token = await tokenDe(maestro)
    expect(obtenerApp().printRoutes().toLowerCase()).not.toContain("movimiento")

    const cuerpos: string[] = []
    const guardar = async (pendiente: Promise<LightMyRequestResponse>): Promise<void> => {
      const respuesta = await pendiente
      expect(respuesta.statusCode).toBeLessThan(300)
      cuerpos.push(respuesta.body)
    }
    await guardar(agregar(clase.id, token, nuevo.id))
    await guardar(peticion({ method: "GET", url: `/api/clases/${clase.id}/alumnos`, token }))
    await guardar(
      peticion({
        method: "GET",
        url: `/api/clases/${clase.id}/alumnos/candidatos?q=visible`,
        token,
      }),
    )
    await guardar(peticion({ method: "GET", url: `/api/clases/${clase.id}/personas`, token }))
    await guardar(quitar(clase.id, token, nuevo.id))

    const filas = await leerMovimientos(clase.id)
    expect(filas).toHaveLength(2)
    for (const cuerpo of cuerpos) {
      expect(cuerpo.toLowerCase()).not.toContain("movimiento")
      expect(cuerpo).not.toContain("secuencia")
      for (const fila of filas) expect(cuerpo).not.toContain(fila.id)
    }
  })

  it("PR-B16h: el módulo adapters/db/index no exporta ninguna función cuyo nombre contenga «movimiento» (no hay lectura)", () => {
    const nombres = Object.keys(adaptadorDb)
    expect(nombres.length).toBeGreaterThan(0)
    expect(nombres.filter((nombre) => nombre.toLowerCase().includes("movimiento"))).toEqual([])
  })
})
