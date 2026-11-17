import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba, crearUsuarioDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import { borrarMovimientosYClasesDePrueba, inscribirDePrueba } from "./ayudas-clases.js"
import {
  codigoDe,
  crearEscenarioDeForo,
  cuerpoDeForo,
  HORA_MS,
  pedirForo,
  rutasDelForo,
  urlForo,
  urlForos,
  type EscenarioDeForo,
  type RutaDelForo,
} from "./ayudas-foros.js"

// Ataque FORO-01a, ronda 1 (tester). Punto 1 (clase archivada "sin escribir nada") y punto 5
// (autorización completa: cambio de contraseña obligatorio, cuenta dada de baja y maestro que ya no
// imparte la clase, que la matriz del programador no recorre). El foro, su principal, su réplica y su
// calificación nacen por la API real, para que haya recordatorio en la cola, trabajo_id, versión,
// entregas y desglose que comparar antes y después.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}
const pedir = pedirForo(obtenerApp)

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen: crearAlmacenEnMemoria() })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const ROLES: Readonly<Record<number, readonly ("estudiante" | "maestro" | "admin")[]>> = {
  1: ["maestro", "admin"],
  2: ["estudiante", "maestro", "admin"],
  3: ["estudiante", "maestro", "admin"],
  4: ["maestro", "admin"],
  5: ["maestro", "admin"],
  6: ["estudiante"],
  7: ["estudiante"],
  8: ["estudiante", "maestro", "admin"],
  9: ["estudiante"],
  10: ["estudiante", "maestro", "admin"],
  11: ["estudiante", "maestro"],
  12: ["maestro", "admin"],
  13: ["maestro", "admin"],
  14: ["maestro", "admin"],
  15: ["maestro", "admin"],
  16: ["maestro"],
}
const ESCRITURAS = [1, 4, 5, 9, 11, 16]
const LECTURAS = [2, 3, 6, 7, 8, 10, 12, 13, 14, 15]

const pedirRuta = (ruta: RutaDelForo, token: string): Promise<LightMyRequestResponse> =>
  pedir({
    method: ruta.method,
    url: ruta.url,
    token,
    ...(ruta.payload === undefined ? {} : { payload: ruta.payload }),
  })

// Todo lo que una escritura del foro podría tocar, leído de la base y de la cola.
const fotoDeLaClase = async (claseId: string) => {
  const db = obtenerDb()
  return {
    publicaciones: await db.publicacion.findMany({
      where: { claseId },
      select: {
        id: true,
        tipo: true,
        titulo: true,
        texto: true,
        temaId: true,
        version: true,
        actualizadoEn: true,
      },
      orderBy: { id: "asc" },
    }),
    tareas: await db.tarea.findMany({
      where: { claseId },
      select: {
        id: true,
        fechaLimite: true,
        puntos: true,
        aceptaTardias: true,
        requiereAdjuntos: true,
        categoriaId: true,
        trabajoId: true,
        version: true,
      },
      orderBy: { id: "asc" },
    }),
    entregas: await db.entrega.findMany({
      where: { tarea: { claseId } },
      select: {
        id: true,
        alumnoId: true,
        estado: true,
        fechaEntrega: true,
        conRetraso: true,
        calificacion: true,
        version: true,
      },
      orderBy: { id: "asc" },
    }),
    participaciones: await db.participacionForo.findMany({
      where: { foro: { claseId } },
      select: { id: true, texto: true, principalId: true, conRetraso: true },
      orderBy: { id: "asc" },
    }),
    comentarios: await db.comentario.count({ where: { entrega: { tarea: { claseId } } } }),
    trabajos: await db.$queryRaw<{ id: string; name: string; state: string }[]>`
      SELECT id::text AS id, name, state::text AS state FROM pgboss.job
      WHERE data ->> 'claseId' = ${claseId}::text ORDER BY id`,
  }
}

interface Montaje {
  e: EscenarioDeForo
  foroId: string
  principalId: string
  rutas: RutaDelForo[]
}

// Un foro creado por la API (con recordatorio: fecha a 5 días), la principal del alumno, una réplica
// del otro alumno y la calificación de la principal, todo por la API.
const montarPorLaApi = async (): Promise<Montaje> => {
  const e = await crearEscenarioDeForo(idsUsuarios, idsClases)
  const creado = await pedir({
    method: "POST",
    url: urlForos(e.claseId),
    token: e.tokenMaestro,
    payload: cuerpoDeForo(),
  })
  expect(creado.statusCode, creado.body).toBe(201)
  const foroId = (creado.json() as { foro: { id: string } }).foro.id
  const principal = await pedir({
    method: "POST",
    url: `${urlForo(e.claseId, foroId)}/participaciones`,
    token: e.tokenAlumno,
    payload: { texto: "Mi principal" },
  })
  expect(principal.statusCode, principal.body).toBe(201)
  const principalId = (principal.json() as { participacion: { id: string } }).participacion.id
  const replica = await pedir({
    method: "POST",
    url: `${urlForo(e.claseId, foroId)}/participaciones/${principalId}/replicas`,
    token: e.tokenOtroAlumno,
    payload: { texto: "Mi réplica" },
  })
  expect(replica.statusCode, replica.body).toBe(201)
  const calificada = await pedir({
    method: "PUT",
    url: `${urlForo(e.claseId, foroId)}/participantes/${e.alumno.id}/calificacion`,
    token: e.tokenMaestro,
    payload: { version: 1, puntosDeLaTarea: 10, puntajes: [], calificacion: 7, comentario: "Bien" },
  })
  expect(calificada.statusCode, calificada.body).toBe(200)
  const tarea = await obtenerDb().tarea.findUnique({
    where: { id: foroId },
    select: { trabajoId: true },
  })
  expect(tarea?.trabajoId, "Precondición: el foro tiene su recordatorio").not.toBeNull()
  // Las escrituras con datos que, en una clase abierta, sí cambiarían algo.
  const rutas = rutasDelForo({
    claseId: e.claseId,
    foroId,
    participacionId: principalId,
    alumnoId: e.alumno.id,
  }).map((ruta): RutaDelForo => {
    if (ruta.numero === 4)
      return {
        ...ruta,
        payload: cuerpoDeForo({
          titulo: "Título cambiado en archivada",
          fechaLimite: new Date(Date.now() + 9 * 24 * HORA_MS).toISOString(),
          version: 0,
        }),
      }
    if (ruta.numero === 5) return { ...ruta, url: `${ruta.url}?confirmar=entregas` }
    if (ruta.numero === 16)
      return {
        ...ruta,
        payload: { version: 2, puntosDeLaTarea: 10, puntajes: [], calificacion: 3 },
      }
    return ruta
  })
  return { e, foroId, principalId, rutas }
}

const tokenDe = (e: EscenarioDeForo, rol: "estudiante" | "maestro" | "admin", numero: number) => {
  if (rol === "maestro") return e.tokenMaestro
  if (rol === "admin") return e.tokenAdmin
  // La principal es del alumno: para publicar una principal (9) va el otro alumno, que no tiene.
  return numero === 9 ? e.tokenOtroAlumno : e.tokenAlumno
}

describe("ataque FORO-01a r1 · punto 1: la clase archivada no escribe nada", () => {
  it("ATQ-FORO-01: archivada por la API, cada una de las 6 escrituras responde 409 CLASE_ARCHIVADA a cada rol que la admite y la base y la cola quedan idénticas (título, versión, trabajo_id, recordatorio, entregas, calificación, participaciones y devoluciones); las 10 lecturas siguen respondiendo 200 al maestro y al admin", async () => {
    const { e, rutas, foroId } = await montarPorLaApi()
    const archivada = await pedir({
      method: "POST",
      url: `/api/admin/clases/${e.claseId}/archivar`,
      token: e.tokenAdmin,
    })
    expect(archivada.statusCode, archivada.body).toBe(200)
    const antes = await fotoDeLaClase(e.claseId)
    expect(antes.participaciones).toHaveLength(2)
    expect(antes.entregas).toHaveLength(1)
    expect(antes.comentarios).toBe(1)

    let escrituras = 0
    for (const ruta of rutas.filter(({ numero }) => ESCRITURAS.includes(numero))) {
      for (const rol of ROLES[ruta.numero] ?? []) {
        const respuesta = await pedirRuta(ruta, tokenDe(e, rol, ruta.numero))
        expect(respuesta.statusCode, `ruta ${String(ruta.numero)} como ${rol}`).toBe(409)
        expect(codigoDe(respuesta)).toBe("CLASE_ARCHIVADA")
        escrituras += 1
      }
    }
    expect(escrituras).toBe(10)
    expect(await fotoDeLaClase(e.claseId)).toEqual(antes)

    for (const ruta of rutas.filter(({ numero }) => LECTURAS.includes(numero))) {
      for (const rol of ["maestro", "admin"] as const) {
        if (!(ROLES[ruta.numero] ?? []).includes(rol)) continue
        const respuesta = await pedirRuta(ruta, tokenDe(e, rol, ruta.numero))
        expect(
          respuesta.statusCode,
          `ruta ${String(ruta.numero)} como ${rol}: ${respuesta.body}`,
        ).toBe(200)
      }
    }
    const detalle = await pedir({
      method: "GET",
      url: urlForo(e.claseId, foroId),
      token: e.tokenAdmin,
    })
    expect(detalle.json()).toMatchObject({ foro: { titulo: "Debate de la unidad 2", version: 0 } })
    expect(await fotoDeLaClase(e.claseId)).toEqual(antes)
  }, 60_000)
})

describe("ataque FORO-01a r1 · punto 5: la cadena con las cuentas que la matriz del programador no recorre", () => {
  it("ATQ-FORO-02: un alumno y un maestro de la clase con cambio de contraseña obligatorio reciben 403 CAMBIO_DE_CONTRASENA_REQUERIDO en cada ruta de su rol, sin escribir nada", async () => {
    const { e, rutas } = await montarPorLaApi()
    const alumno = await crearUsuarioDePrueba(idsUsuarios, {
      nombre: "Alumna Por Cambiar",
      debeCambiarContrasena: true,
    })
    await inscribirDePrueba(e.claseId, alumno.id)
    const maestro = await crearUsuarioDePrueba(idsUsuarios, {
      rol: "maestro",
      nombre: "Maestro Por Cambiar",
      debeCambiarContrasena: true,
    })
    await obtenerDb().maestroDeClase.create({
      data: { claseId: e.claseId, maestroId: maestro.id },
      select: { claseId: true },
    })
    const tokens = {
      estudiante: await firmarTokenDePrueba({ usuarioId: alumno.id }),
      maestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
    }
    const antes = await fotoDeLaClase(e.claseId)
    let casos = 0
    for (const ruta of rutas) {
      for (const rol of ["estudiante", "maestro"] as const) {
        if (!(ROLES[ruta.numero] ?? []).includes(rol)) continue
        const respuesta = await pedirRuta(ruta, tokens[rol])
        expect(respuesta.statusCode, `ruta ${String(ruta.numero)} como ${rol}`).toBe(403)
        expect(codigoDe(respuesta)).toBe("CAMBIO_DE_CONTRASENA_REQUERIDO")
        casos += 1
      }
    }
    expect(casos).toBe(21)
    expect(await fotoDeLaClase(e.claseId)).toEqual(antes)
  }, 60_000)

  it("ATQ-FORO-03: un alumno y un maestro de la clase dados de baja, con su JWT aún vigente, reciben 401 NO_AUTENTICADO en las 16 rutas, sin escribir nada", async () => {
    const { e, rutas } = await montarPorLaApi()
    const antes = await fotoDeLaClase(e.claseId)
    await obtenerDb().usuario.updateMany({
      where: { id: { in: [e.alumno.id, e.maestro.id] } },
      data: { activo: false },
    })
    for (const ruta of rutas) {
      for (const token of [e.tokenAlumno, e.tokenMaestro]) {
        const respuesta = await pedirRuta(ruta, token)
        expect(respuesta.statusCode, `ruta ${String(ruta.numero)}`).toBe(401)
        expect(codigoDe(respuesta)).toBe("NO_AUTENTICADO")
      }
    }
    expect(await fotoDeLaClase(e.claseId)).toEqual(antes)
  }, 60_000)

  it("ATQ-FORO-04: el autor del foro que ya no imparte la clase recibe 403 SIN_ACCESO_A_LA_CLASE en cada ruta de maestro, también en las que leen, sin escribir nada", async () => {
    const { e, rutas } = await montarPorLaApi()
    // Otro maestro sigue en la clase (una clase con alumnos no se queda sin maestros).
    const sigue = await crearUsuarioDePrueba(idsUsuarios, {
      rol: "maestro",
      nombre: "Maestra Sigue",
    })
    await obtenerDb().maestroDeClase.create({
      data: { claseId: e.claseId, maestroId: sigue.id },
      select: { claseId: true },
    })
    await obtenerDb().maestroDeClase.delete({
      where: { claseId_maestroId: { claseId: e.claseId, maestroId: e.maestro.id } },
    })
    const antes = await fotoDeLaClase(e.claseId)
    let casos = 0
    for (const ruta of rutas) {
      if (!(ROLES[ruta.numero] ?? []).includes("maestro")) continue
      const respuesta = await pedirRuta(ruta, e.tokenMaestro)
      expect(respuesta.statusCode, `ruta ${String(ruta.numero)}`).toBe(403)
      expect(codigoDe(respuesta)).toBe("SIN_ACCESO_A_LA_CLASE")
      casos += 1
    }
    expect(casos).toBe(13)
    expect(await fotoDeLaClase(e.claseId)).toEqual(antes)
  }, 60_000)
})
