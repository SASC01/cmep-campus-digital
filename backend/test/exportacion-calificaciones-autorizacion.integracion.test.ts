import { randomUUID } from "node:crypto"

import { errorApiSchema, exportacionDeCalificacionesRespuestaSchema } from "@campus/shared"
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
  crearClaseDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { crearEntregaDePrueba } from "./ayudas-entregas.js"
import { HORA_MS } from "./ayudas-gradebook.js"
import { crearTareaDePrueba } from "./ayudas-tareas.js"

// CALIFICACIONES-02a (CAL2-A01, CAL2-A02). Autorización de GET y HEAD de
// /clases/:claseId/calificaciones/exportacion (tabla "Autorización" del plan) y P-13: ninguna
// respuesta de este archivo, de éxito o de error, para ningún rol, trae el estado de pago, la
// restricción, el rol, la versión, la cuenta activa ni el hash; el alumno es { id, nombre, email }.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

// El correo sí viaja (P-13): por eso la lista no incluye "email" ni "@", a diferencia de CAL-1B06.
const CLAVES_DE_FUGA =
  /estadoPago|fechaEstadoPago|accesoRestringido|motivoRestriccion|"rol"|"version"|"activo"|hash|Deudor|deudor/

const LLAVES_DE_LA_RESPUESTA = [
  "alumnos",
  "clase",
  "siguienteCursor",
  "siguienteCursorTareas",
  "tareas",
  "totalAlumnos",
  "totalTareas",
]

type Metodo = "GET" | "HEAD"

const pedir = async (
  metodo: Metodo,
  token: string | null,
  url: string,
): Promise<LightMyRequestResponse> => {
  const respuesta = await obtenerApp().inject({
    method: metodo,
    url,
    headers: token === null ? {} : { authorization: `Bearer ${token}` },
  })
  expect(
    respuesta.body,
    `fuga en ${metodo} ${String(respuesta.statusCode)}: ${respuesta.body}`,
  ).not.toMatch(CLAVES_DE_FUGA)
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

// Una clase con dos maestros, una tarea vencida y tres alumnas inscritas: una con adeudo y
// restringida, una al corriente y una con el cambio de contraseña pendiente. Fuera de la clase: un
// maestro de otra clase y un alumno sin inscribir.
const escenario = async () => {
  const f = randomUUID().slice(0, 8)
  const maestro = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Maestra Exporta ${f}`,
    rol: "maestro",
  })
  const comaestro = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Comaestro Exporta ${f}`,
    rol: "maestro",
  })
  const clase = await crearClaseDePrueba(idsClases, {
    maestroId: maestro.id,
    maestroIds: [maestro.id, comaestro.id],
    nombre: `Historia ${f}`,
  })
  const tareaId = await crearTareaDePrueba({
    claseId: clase.id,
    autorId: maestro.id,
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
  const alCorriente = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Alumno Corriente ${f}`,
    estadoPago: "al_corriente",
  })
  const pendiente = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Pendiente ${f}` })
  for (const alumno of [restringida, alCorriente, pendiente]) {
    await inscribirDePrueba(clase.id, alumno.id)
  }
  for (const alumno of [restringida, alCorriente]) {
    await crearEntregaDePrueba({
      tareaId,
      alumnoId: alumno.id,
      estado: "calificado",
      calificacion: 6,
    })
  }
  await obtenerDb().usuario.update({
    where: { id: pendiente.id },
    data: { debeCambiarContrasena: true },
    select: { id: true },
  })
  const ajeno = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Maestro Ajeno ${f}`,
    rol: "maestro",
  })
  await crearClaseDePrueba(idsClases, { maestroId: ajeno.id, nombre: `Otra ${f}` })
  const noInscrito = await crearAlumnoDePrueba(idsUsuarios, { nombre: `No Inscrito ${f}` })
  return {
    claseId: clase.id,
    nombreDeLaClase: `Historia ${f}`,
    maestro,
    comaestro,
    restringida,
    alCorriente,
    pendiente,
    tokens: {
      maestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
      comaestro: await firmarTokenDePrueba({ usuarioId: comaestro.id }),
      admin: await tokenDelAdminDePrueba(),
      ajeno: await firmarTokenDePrueba({ usuarioId: ajeno.id }),
      restringida: await firmarTokenDePrueba({ usuarioId: restringida.id }),
      alCorriente: await firmarTokenDePrueba({ usuarioId: alCorriente.id }),
      pendiente: await firmarTokenDePrueba({ usuarioId: pendiente.id }),
      noInscrito: await firmarTokenDePrueba({ usuarioId: noInscrito.id }),
      vencido: await firmarTokenDePrueba({
        usuarioId: maestro.id,
        ahora: new Date(Date.now() - 2 * HORA_MS),
      }),
    },
  }
}

const urlDe = (claseId: string): string => `/api/clases/${claseId}/calificaciones/exportacion`

const esperarError = async (
  metodo: Metodo,
  token: string | null,
  url: string,
  estado: number,
  codigo: string | null,
): Promise<LightMyRequestResponse> => {
  const respuesta = await pedir(metodo, token, url)
  expect(respuesta.statusCode, `${metodo} ${url}: ${respuesta.body}`).toBe(estado)
  if (metodo === "HEAD") {
    expect(respuesta.body, `${metodo} sin cuerpo`).toBe("")
    return respuesta
  }
  if (codigo !== null) expect(codigoDe(respuesta), `${metodo} ${url}`).toBe(codigo)
  return respuesta
}

describe("autorización de la exportación (CAL2-A01)", () => {
  it("CAL2-A01: GET y HEAD: maestro y comaestro de la clase y admin 200 (HEAD sin cuerpo); maestro ajeno, comaestro retirado y clase inexistente 403 SIN_ACCESO_A_LA_CLASE; estudiante inscrito o no 403 ROL_NO_PERMITIDO; restringida 403 ACCESO_RESTRINGIDO; cambio pendiente 403; sin token o vencido 401; claseId que no es UUID 400", async () => {
    const e = await escenario()
    const url = urlDe(e.claseId)
    const inexistente = urlDe(randomUUID())

    for (const metodo of ["GET", "HEAD"] as const) {
      for (const token of [e.tokens.maestro, e.tokens.comaestro, e.tokens.admin]) {
        const respuesta = await pedir(metodo, token, url)
        expect(respuesta.statusCode, `${metodo}: ${respuesta.body}`).toBe(200)
        if (metodo === "HEAD") {
          expect(respuesta.body, "HEAD sin cuerpo").toBe("")
          continue
        }
        const cuerpo = exportacionDeCalificacionesRespuestaSchema.parse(respuesta.json())
        expect(cuerpo.clase.nombre).toBe(e.nombreDeLaClase)
        expect(cuerpo.alumnos).toHaveLength(3)
      }

      const ajeno = await esperarError(metodo, e.tokens.ajeno, url, 403, "SIN_ACCESO_A_LA_CLASE")
      for (const token of [e.tokens.ajeno, e.tokens.maestro, e.tokens.admin]) {
        const respuesta = await esperarError(
          metodo,
          token,
          inexistente,
          403,
          "SIN_ACCESO_A_LA_CLASE",
        )
        // La misma respuesta que una clase ajena.
        if (metodo === "GET") expect(respuesta.json()).toEqual(ajeno.json())
      }
      for (const token of [e.tokens.alCorriente, e.tokens.noInscrito]) {
        await esperarError(metodo, token, url, 403, "ROL_NO_PERMITIDO")
      }
      await esperarError(metodo, e.tokens.restringida, url, 403, "ACCESO_RESTRINGIDO")
      await esperarError(metodo, e.tokens.pendiente, url, 403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
      await esperarError(metodo, null, url, 401, null)
      await esperarError(metodo, e.tokens.vencido, url, 401, null)
      const malo = await esperarError(
        metodo,
        e.tokens.maestro,
        "/api/clases/no-es-un-id/calificaciones/exportacion",
        400,
        "VALIDACION",
      )
      if (metodo === "GET") {
        expect(errorApiSchema.parse(malo.json()).error.mensaje).toMatch(/^claseId: /)
      }
    }

    // El maestro con el cambio de contraseña pendiente.
    await obtenerDb().usuario.update({
      where: { id: e.maestro.id },
      data: { debeCambiarContrasena: true },
      select: { id: true },
    })
    for (const metodo of ["GET", "HEAD"] as const) {
      await esperarError(metodo, e.tokens.maestro, url, 403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
    }
    await obtenerDb().usuario.update({
      where: { id: e.maestro.id },
      data: { debeCambiarContrasena: false },
      select: { id: true },
    })

    // El comaestro que ya no da la clase (su fila de maestros_de_clase borrada).
    const retirado = await obtenerDb().maestroDeClase.deleteMany({
      where: { claseId: e.claseId, maestroId: e.comaestro.id },
    })
    expect(retirado.count, "Precondición: se retiró al comaestro").toBe(1)
    for (const metodo of ["GET", "HEAD"] as const) {
      await esperarError(metodo, e.tokens.comaestro, url, 403, "SIN_ACCESO_A_LA_CLASE")
    }
    // El maestro que sigue en la clase no cambia.
    expect((await pedir("GET", e.tokens.maestro, url)).statusCode).toBe(200)
  }, 30_000)
})

describe("sin fuga del estado de pago ni de la restricción (CAL2-A02)", () => {
  it("CAL2-A02: para el maestro, el comaestro y el admin, la respuesta trae exactamente sus siete llaves, cada alumno exactamente id, nombre y email, y la alumna restringida aparece con su nombre y su correo, sin ningún dato de pago ni de restricción", async () => {
    const e = await escenario()
    for (const token of [e.tokens.maestro, e.tokens.comaestro, e.tokens.admin]) {
      const respuesta = await pedir("GET", token, urlDe(e.claseId))
      expect(respuesta.statusCode, respuesta.body).toBe(200)
      const crudo = respuesta.json<Record<string, unknown>>()
      expect(Object.keys(crudo).sort()).toEqual(LLAVES_DE_LA_RESPUESTA)
      const cuerpo = exportacionDeCalificacionesRespuestaSchema.parse(crudo)
      expect(cuerpo.alumnos.length, "Precondición: hay alumnos").toBeGreaterThan(0)
      for (const fila of cuerpo.alumnos) {
        expect(Object.keys(fila).sort()).toEqual(["alumno", "celdas", "porcentaje"])
        expect(Object.keys(fila.alumno).sort()).toEqual(["email", "id", "nombre"])
      }
      const restringida = cuerpo.alumnos.find((fila) => fila.alumno.id === e.restringida.id)
      expect(restringida?.alumno).toEqual({
        id: e.restringida.id,
        nombre: expect.stringMatching(/^Alumna Restringida /) as unknown,
        email: e.restringida.email,
      })
      expect(restringida?.porcentaje).toBe(60)
      const alCorriente = cuerpo.alumnos.find((fila) => fila.alumno.id === e.alCorriente.id)
      expect(alCorriente?.alumno.email).toBe(e.alCorriente.email)
    }
  }, 30_000)
})
