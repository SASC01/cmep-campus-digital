import { randomUUID } from "node:crypto"

import { errorApiSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"
import { crearEntregaDePrueba } from "./ayudas-entregas.js"
import { crearClaseDeGradebook, HORA_MS, pedirGet } from "./ayudas-gradebook.js"
import { crearTareaDePrueba } from "./ayudas-tareas.js"

// CALIFICACIONES-01b (CAL-1B06). Autorización de las dos lecturas ("Autorización" del plan): el
// gradebook, para los maestros de la clase y el admin; "Mis calificaciones", solo para el alumno
// inscrito. En la clase hay una alumna deudora y restringida y un alumno deudor, los dos con
// calificaciones: ninguna respuesta, de éxito o de error, para ningún rol, filtra el estado de pago,
// la restricción, un correo ni el rol. Cada respuesta se comprueba en el caso que la produce.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const CLAVES_DE_FUGA = /estadoPago|accesoRestringido|motivoRestriccion|email|"rol"|deudor|@/i

const pedirSinComprobar = pedirGet(obtenerApp)
const pedir = async (token: string | null, url: string): Promise<LightMyRequestResponse> => {
  const respuesta = await pedirSinComprobar(token, url)
  expect(respuesta.body, `fuga en ${String(respuesta.statusCode)}: ${respuesta.body}`).not.toMatch(
    CLAVES_DE_FUGA,
  )
  return respuesta
}

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen: crearAlmacenEnMemoria() })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const escenario = async () => {
  const f = randomUUID().slice(0, 8)
  const c = await crearClaseDeGradebook(idsUsuarios, idsClases, f)
  const tareaId = await crearTareaDePrueba({
    claseId: c.claseId,
    autorId: c.maestro.id,
    puntos: 10,
    fechaLimite: new Date(Date.now() - 24 * HORA_MS),
  })
  const restringida = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Alumna Restringida ${f}`,
    estadoPago: "deudor",
    accesoRestringido: true,
  })
  await obtenerDb().usuario.update({
    where: { id: restringida.id },
    data: { motivoRestriccion: "Adeudo" },
    select: { id: true },
  })
  const deudor = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Alumno Saldo ${f}`,
    estadoPago: "deudor",
  })
  for (const alumno of [restringida, deudor]) {
    await inscribirDePrueba(c.claseId, alumno.id)
    await crearEntregaDePrueba({
      tareaId,
      alumnoId: alumno.id,
      estado: "calificado",
      calificacion: 6,
    })
  }
  const ajeno = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Maestro Ajeno ${f}`,
    rol: "maestro",
  })
  const noInscrito = await crearAlumnoDePrueba(idsUsuarios, { nombre: `No Inscrito ${f}` })
  const pendiente = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Pendiente ${f}` })
  await inscribirDePrueba(c.claseId, pendiente.id)
  await obtenerDb().usuario.update({
    where: { id: pendiente.id },
    data: { debeCambiarContrasena: true },
    select: { id: true },
  })
  return {
    ...c,
    tokens: {
      ...c.tokens,
      restringida: await firmarTokenDePrueba({ usuarioId: restringida.id }),
      deudor: await firmarTokenDePrueba({ usuarioId: deudor.id }),
      ajeno: await firmarTokenDePrueba({ usuarioId: ajeno.id }),
      noInscrito: await firmarTokenDePrueba({ usuarioId: noInscrito.id }),
      pendiente: await firmarTokenDePrueba({ usuarioId: pendiente.id }),
    },
  }
}

describe("autorización del gradebook y de «Mis calificaciones» (CAL-1B06)", () => {
  it("CAL-1B06: gradebook: sin token 401, estudiante 403, maestro ajeno y clase inexistente 403 SIN_ACCESO_A_LA_CLASE, cambio pendiente 403, maestro y admin 200, todo sin fuga", async () => {
    const e = await escenario()
    const url = `/api/clases/${e.claseId}/gradebook`

    expect((await pedir(null, url)).statusCode).toBe(401)
    const estudiante = await pedir(e.tokens.deudor, url)
    expect(estudiante.statusCode).toBe(403)
    expect(codigoDe(estudiante)).toBe("ROL_NO_PERMITIDO")
    const ajeno = await pedir(e.tokens.ajeno, url)
    expect(ajeno.statusCode).toBe(403)
    expect(codigoDe(ajeno)).toBe("SIN_ACCESO_A_LA_CLASE")
    const inexistente = await pedir(e.tokens.ajeno, `/api/clases/${randomUUID()}/gradebook`)
    expect(inexistente.statusCode).toBe(403)
    expect(inexistente.json()).toEqual(ajeno.json())
    expect((await pedir(e.tokens.maestro, "/api/clases/no-es-un-id/gradebook")).statusCode).toBe(
      400,
    )

    await obtenerDb().usuario.update({
      where: { id: e.maestro.id },
      data: { debeCambiarContrasena: true },
      select: { id: true },
    })
    const pendiente = await pedir(e.tokens.maestro, url)
    expect(pendiente.statusCode).toBe(403)
    expect(codigoDe(pendiente)).toBe("CAMBIO_DE_CONTRASENA_REQUERIDO")
    await obtenerDb().usuario.update({
      where: { id: e.maestro.id },
      data: { debeCambiarContrasena: false },
      select: { id: true },
    })

    for (const token of [e.tokens.maestro, e.tokens.admin]) {
      const respuesta = await pedir(token, url)
      expect(respuesta.statusCode, respuesta.body).toBe(200)
      // Las dos alumnas con calificaciones (deudora y restringida) y la del cambio pendiente aparecen.
      expect(respuesta.json<{ alumnos: unknown[] }>().alumnos).toHaveLength(3)
    }
  })

  it("CAL-1B06: «Mis calificaciones»: sin token 401, maestro y admin 403 (rol), no inscrito 403 SIN_ACCESO_A_LA_CLASE, restringido 403 ACCESO_RESTRINGIDO, cambio pendiente 403; el inscrito 200, todo sin fuga", async () => {
    const e = await escenario()
    const url = `/api/clases/${e.claseId}/mis-calificaciones`

    expect((await pedir(null, url)).statusCode).toBe(401)
    for (const token of [e.tokens.maestro, e.tokens.admin]) {
      const respuesta = await pedir(token, url)
      expect(respuesta.statusCode).toBe(403)
      expect(codigoDe(respuesta)).toBe("ROL_NO_PERMITIDO")
    }
    const noInscrito = await pedir(e.tokens.noInscrito, url)
    expect(noInscrito.statusCode).toBe(403)
    expect(codigoDe(noInscrito)).toBe("SIN_ACCESO_A_LA_CLASE")
    const restringida = await pedir(e.tokens.restringida, url)
    expect(restringida.statusCode).toBe(403)
    expect(codigoDe(restringida)).toBe("ACCESO_RESTRINGIDO")
    const pendiente = await pedir(e.tokens.pendiente, url)
    expect(pendiente.statusCode).toBe(403)
    expect(codigoDe(pendiente)).toBe("CAMBIO_DE_CONTRASENA_REQUERIDO")

    const deudor = await pedir(e.tokens.deudor, url)
    expect(deudor.statusCode, deudor.body).toBe(200)
    expect(deudor.json<{ general: { porcentaje: number } }>().general.porcentaje).toBe(60)
  })
})
