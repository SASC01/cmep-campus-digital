import { randomUUID } from "node:crypto"

import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  desactivarUsuarioDePrueba,
  firmarTokenDePrueba,
} from "./ayudas-auth.js"
import {
  codigoDe,
  crearEscenarioDeCalificar,
  cuerpoDirecto,
  fotoDeCalificar,
  pedirEn,
  urlDeCalificar,
  type EscenarioDeCalificar,
} from "./ayudas-calificaciones.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"
import { crearEntregaDePrueba } from "./ayudas-entregas.js"
import { crearTareaDePrueba } from "./ayudas-tareas.js"

// CALIFICACIONES-01a (CAL-1A17). Autorización del PUT de calificar (§D-0.1, "Autorización"): solo los
// maestros de la clase (S-01: el admin no califica). Cada rechazo se comprueba sin escritura ni
// trabajo encolado. La alumna calificada es deudora y está restringida (S-20: el maestro la califica
// igual); ninguna respuesta, de éxito o de error, para ningún rol, filtra su estado de pago, su
// restricción, un correo ni el rol.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const CLAVES_DE_FUGA = /estadoPago|accesoRestringido|motivoRestriccion|email|"rol"|deudor|@/i

// Cada respuesta se comprueba sin fuga en el mismo caso que la produce (M-05): el resultado no
// depende del orden de los casos, de un caso saltado ni de correr el archivo solo o con `-t`.
const sinFuga = (respuesta: LightMyRequestResponse): void => {
  expect(respuesta.body, `fuga en ${respuesta.statusCode}: ${respuesta.body}`).not.toMatch(
    CLAVES_DE_FUGA,
  )
}

const pedirSinComprobar = pedirEn(obtenerApp)
const pedir: typeof pedirSinComprobar = async (...args) => {
  const respuesta = await pedirSinComprobar(...args)
  sinFuga(respuesta)
  return respuesta
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

// La alumna del escenario pasa a deudora y restringida, con una entrega hecha.
const escenario = async (): Promise<EscenarioDeCalificar> => {
  const e = await crearEscenarioDeCalificar(idsUsuarios, idsClases, { puntos: 10 })
  await obtenerDb().usuario.update({
    where: { id: e.alumno.id },
    data: { estadoPago: "deudor", accesoRestringido: true, motivoRestriccion: "Adeudo" },
    select: { id: true },
  })
  await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })
  return e
}

const calificarCon = (token: string | null, e: EscenarioDeCalificar, url = urlDeCalificar(e)) =>
  pedir(token, "PUT", url, cuerpoDirecto(e, 8, { version: 1, comentario: "Bien" }))

const sinEscritura = async (
  e: EscenarioDeCalificar,
  antes: Awaited<ReturnType<typeof fotoDeCalificar>>,
) => {
  expect(await fotoDeCalificar(e)).toEqual(antes)
}

describe("autorización de calificar (CAL-1A17)", () => {
  it("CAL-1A17: sin token 401; estudiante 403; admin 403 (S-01); ninguno escribe ni encola", async () => {
    const e = await escenario()
    const antes = await fotoDeCalificar(e)
    const otroAlumno = await crearAlumnoDePrueba(idsUsuarios, { nombre: "Compañera Inscrita" })
    await inscribirDePrueba(e.claseId, otroAlumno.id)

    expect((await calificarCon(null, e)).statusCode).toBe(401)
    expect(
      (await calificarCon(await firmarTokenDePrueba({ usuarioId: otroAlumno.id }), e)).statusCode,
    ).toBe(403)
    const admin = await calificarCon(e.tokens.admin, e)
    expect(admin.statusCode, admin.body).toBe(403)
    await sinEscritura(e, antes)
  })

  it("CAL-1A17: un maestro ajeno y una clase inexistente responden igual, 403 SIN_ACCESO_A_LA_CLASE, sin escribir", async () => {
    const e = await escenario()
    const antes = await fotoDeCalificar(e)
    const ajeno = await crearAlumnoDePrueba(idsUsuarios, {
      nombre: "Maestro Ajeno",
      rol: "maestro",
    })
    await crearClaseDePrueba(idsClases, { maestroId: ajeno.id })
    const tokenAjeno = await firmarTokenDePrueba({ usuarioId: ajeno.id })

    const deAjeno = await calificarCon(tokenAjeno, e)
    const inexistente = await calificarCon(
      e.tokens.maestro,
      e,
      `/api/clases/${randomUUID()}/tareas/${e.tareaId}/entregas/${e.alumno.id}/calificacion`,
    )
    for (const r of [deAjeno, inexistente]) {
      expect(r.statusCode, r.body).toBe(403)
      expect(codigoDe(r)).toBe("SIN_ACCESO_A_LA_CLASE")
    }
    await sinEscritura(e, antes)
  })

  it("CAL-1A17: un llamador restringido responde 403 ACCESO_RESTRINGIDO y uno con cambio de contraseña pendiente 403 CAMBIO_DE_CONTRASENA_REQUERIDO, sin escribir", async () => {
    const e = await escenario()
    const antes = await fotoDeCalificar(e)
    const pendiente = await crearUsuarioDePrueba(idsUsuarios, {
      rol: "maestro",
      debeCambiarContrasena: true,
    })
    await obtenerDb().maestroDeClase.create({
      data: { claseId: e.claseId, maestroId: pendiente.id },
      select: { claseId: true },
    })

    const restringida = await calificarCon(e.tokens.alumno, e)
    expect(restringida.statusCode, restringida.body).toBe(403)
    expect(codigoDe(restringida)).toBe("ACCESO_RESTRINGIDO")
    const cambio = await calificarCon(await firmarTokenDePrueba({ usuarioId: pendiente.id }), e)
    expect(cambio.statusCode, cambio.body).toBe(403)
    expect(codigoDe(cambio)).toBe("CAMBIO_DE_CONTRASENA_REQUERIDO")
    await sinEscritura(e, antes)
  })

  it("CAL-1A17: una tarea de otra clase responde 404 TAREA_NO_ENCONTRADA, sin escribir en ninguna de las dos", async () => {
    const e = await escenario()
    const otra = await escenario()
    const antes = await fotoDeCalificar(e)
    const antesOtra = await fotoDeCalificar(otra)

    const r = await calificarCon(
      e.tokens.maestro,
      e,
      `/api/clases/${e.claseId}/tareas/${otra.tareaId}/entregas/${otra.alumno.id}/calificacion`,
    )

    expect(r.statusCode, r.body).toBe(404)
    expect(codigoDe(r)).toBe("TAREA_NO_ENCONTRADA")
    await sinEscritura(e, antes)
    await sinEscritura(otra, antesOtra)
  })

  it("CAL-1A17: un :alumnoId inexistente, de otra clase, dado de baja, desactivado o que es maestro responde 404 ALUMNO_NO_ENCONTRADO, sin crear fila ni encolar", async () => {
    const e = await escenario()
    const otra = await escenario()
    const deBaja = await crearAlumnoDePrueba(idsUsuarios, { nombre: "Alumna De Baja" })
    await inscribirDePrueba(e.claseId, deBaja.id)
    await obtenerDb().inscripcion.delete({
      where: { claseId_usuarioId: { claseId: e.claseId, usuarioId: deBaja.id } },
    })
    const desactivada = await crearAlumnoDePrueba(idsUsuarios, { nombre: "Alumna Desactivada" })
    await inscribirDePrueba(e.claseId, desactivada.id)
    await desactivarUsuarioDePrueba(desactivada.id)
    const tareaVencida = await crearTareaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      fechaLimite: new Date(Date.now() - 60 * 60 * 1000),
      aceptaTardias: false,
      puntos: 10,
    })

    for (const alumnoId of [
      randomUUID(),
      otra.alumno.id,
      deBaja.id,
      desactivada.id,
      e.otroMaestro.id,
    ]) {
      // En una tarea cerrada: si el alumno pasara el filtro, calificarlo sin entrega sería posible.
      const r = await pedir(
        e.tokens.maestro,
        "PUT",
        `/api/clases/${e.claseId}/tareas/${tareaVencida}/entregas/${alumnoId}/calificacion`,
        cuerpoDirecto(e, 0, { version: 0 }),
      )
      expect(r.statusCode, r.body).toBe(404)
      expect(codigoDe(r)).toBe("ALUMNO_NO_ENCONTRADO")
    }
    expect(await obtenerDb().entrega.count({ where: { tareaId: tareaVencida } })).toBe(0)
    expect(
      await obtenerDb().$queryRaw<{ n: number }[]>`
        SELECT count(*)::int AS n FROM pgboss.job
        WHERE name = 'CALIFICACION_PUBLICADA' AND data ->> 'tareaId' = ${tareaVencida}::text`,
    ).toEqual([{ n: 0 }])
  })

  it("CAL-1A17: el maestro de la clase califica a la alumna deudora y restringida (S-20), y el segundo maestro también", async () => {
    const e = await escenario()
    const r = await calificarCon(e.tokens.maestro, e)
    expect(r.statusCode, r.body).toBe(200)
    const otro = await pedir(
      e.tokens.otroMaestro,
      "PUT",
      urlDeCalificar(e),
      cuerpoDirecto(e, 9, { version: 2 }),
    )
    expect(otro.statusCode, otro.body).toBe(200)
    // Las lecturas de la entrega (maestro y admin) y la de la alumna (restringida: 403).
    const lectura = `/api/clases/${e.claseId}/tareas/${e.tareaId}/entregas/${e.alumno.id}`
    expect((await pedir(e.tokens.maestro, "GET", lectura)).statusCode).toBe(200)
    expect((await pedir(e.tokens.admin, "GET", lectura)).statusCode).toBe(200)
    expect(
      (await pedir(e.tokens.alumno, "GET", `/api/clases/${e.claseId}/tareas/${e.tareaId}/entrega`))
        .statusCode,
    ).toBe(403)
  })

  it('CAL-1A17: sin fuga: ninguna respuesta de este archivo (de éxito o de error, del maestro, del admin y de la alumna) contiene estadoPago, accesoRestringido, email, "rol", deudor ni @', async () => {
    // Produce sus propias respuestas, de éxito y de error, para cada rol; no lee las de otros casos.
    const e = await escenario()
    const lectura = `/api/clases/${e.claseId}/tareas/${e.tareaId}/entregas/${e.alumno.id}`
    const propias: [LightMyRequestResponse, number][] = [
      [await calificarCon(null, e), 401],
      [await calificarCon(e.tokens.alumno, e), 403],
      [await calificarCon(e.tokens.admin, e), 403],
      [await calificarCon(e.tokens.maestro, e), 200],
      [await calificarCon(e.tokens.otroMaestro, e), 409],
      [await pedir(e.tokens.maestro, "GET", lectura), 200],
      [await pedir(e.tokens.admin, "GET", lectura), 200],
      [
        await pedir(e.tokens.alumno, "GET", `/api/clases/${e.claseId}/tareas/${e.tareaId}/entrega`),
        403,
      ],
    ]

    expect(propias.map(([r]) => r.statusCode)).toEqual(propias.map(([, codigo]) => codigo))
    for (const [r] of propias) sinFuga(r)
  })
})
