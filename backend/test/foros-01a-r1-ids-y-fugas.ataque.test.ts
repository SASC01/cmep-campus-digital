import {
  listaComentariosPrivadosRespuestaSchema,
  listaForosRespuestaSchema,
  listaParticipacionesRespuestaSchema,
  listaReplicasRespuestaSchema,
  foroRespuestaSchema,
  replicaPublicadaRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba, crearUsuarioDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearClaseDePrueba,
  idDelAdminDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"
import { crearEntregaDePrueba } from "./ayudas-entregas.js"
import {
  codigoDe,
  crearEscenarioDeForo,
  crearForoDePrueba,
  crearParticipacionDePrueba,
  cuerpoDeForo,
  HORA_MS,
  pedirForo,
  rutasDelForo,
  urlForo,
  urlForos,
  type EscenarioDeForo,
  type RutaDelForo,
} from "./ayudas-foros.js"

// Ataque FORO-01a, ronda 1 (tester). Punto 3 (IDOR: ids y cursores cruzados de otro foro, de otra
// clase, de otro alumno y de otro hilo) y punto 4 (fugas a profundidad: el retraso de otros, el autor
// admin, enRespuestaA y las llaves de cada respuesta para un alumno).

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

const tokenDe = (e: EscenarioDeForo, rol: "estudiante" | "maestro" | "admin"): string => {
  if (rol === "estudiante") return e.tokenAlumno
  if (rol === "maestro") return e.tokenMaestro
  return e.tokenAdmin
}

const pedirRuta = (ruta: RutaDelForo, token: string): Promise<LightMyRequestResponse> =>
  pedir({
    method: ruta.method,
    url: ruta.url,
    token,
    ...(ruta.payload === undefined ? {} : { payload: ruta.payload }),
  })

const PASADA = (): Date => new Date(Date.now() - 2 * HORA_MS)

// Lo de un foro que una petición podría tocar.
const fotoDelForo = async (foroId: string) => {
  const db = obtenerDb()
  return {
    publicacion: await db.publicacion.findUnique({
      where: { id: foroId },
      select: { titulo: true, texto: true, version: true, actualizadoEn: true },
    }),
    tarea: await db.tarea.findUnique({
      where: { id: foroId },
      select: { version: true, fechaLimite: true, trabajoId: true, puntos: true },
    }),
    entregas: await db.entrega.findMany({
      where: { tareaId: foroId },
      select: { id: true, alumnoId: true, estado: true, version: true, calificacion: true },
      orderBy: { id: "asc" },
    }),
    participaciones: await db.participacionForo.findMany({
      where: { foroId },
      select: { id: true },
      orderBy: { id: "asc" },
    }),
    comentarios: await db.comentario.count({ where: { entrega: { tareaId: foroId } } }),
  }
}

const calificarPorLaApi = async (
  e: EscenarioDeForo,
  foroId: string,
  alumnoId: string,
  version: number,
  comentario: string,
): Promise<void> => {
  const respuesta = await pedir({
    method: "PUT",
    url: `${urlForo(e.claseId, foroId)}/participantes/${alumnoId}/calificacion`,
    token: e.tokenMaestro,
    payload: { version, puntosDeLaTarea: 10, puntajes: [], calificacion: 6, comentario },
  })
  expect(respuesta.statusCode, respuesta.body).toBe(200)
}

const publicarPrincipal = async (e: EscenarioDeForo, foroId: string, token: string) => {
  const respuesta = await pedir({
    method: "POST",
    url: `${urlForo(e.claseId, foroId)}/participaciones`,
    token,
    payload: { texto: "Mi principal" },
  })
  expect(respuesta.statusCode, respuesta.body).toBe(201)
  return (respuesta.json() as { participacion: { id: string } }).participacion.id
}

const replicarPorLaApi = async (
  e: EscenarioDeForo,
  foroId: string,
  principalId: string,
  token: string,
) => {
  const respuesta = await pedir({
    method: "POST",
    url: `${urlForo(e.claseId, foroId)}/participaciones/${principalId}/replicas`,
    token,
    payload: { texto: "Mi réplica" },
  })
  expect(respuesta.statusCode, respuesta.body).toBe(201)
  return respuesta
}

describe("ataque FORO-01a r1 · punto 3: ids cruzados", () => {
  it("ATQ-FORO-10: el foro de otra clase del mismo maestro, con un alumno inscrito en las dos, responde 404 TAREA_NO_ENCONTRADA en las 14 rutas con :foroId para cada rol, y ninguno de los dos foros cambia", async () => {
    const e = await crearEscenarioDeForo(idsUsuarios, idsClases)
    const otra = await crearClaseDePrueba(idsClases, { maestroId: e.maestro.id })
    await inscribirDePrueba(otra.id, e.alumno.id)
    await inscribirDePrueba(otra.id, e.otroAlumno.id)
    const foroPropio = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    // El foro ajeno está cerrado: así la calificación de 16 llegaría a escribir si aceptara el id.
    const foroAjeno = await crearForoDePrueba({
      claseId: otra.id,
      autorId: e.maestro.id,
      fechaLimite: PASADA(),
      aceptaTardias: false,
    })
    const principalAjena = await crearParticipacionDePrueba({
      foroId: foroAjeno,
      autorId: e.otroAlumno.id,
    })
    await crearEntregaDePrueba({ tareaId: foroAjeno, alumnoId: e.otroAlumno.id })
    const antesAjeno = await fotoDelForo(foroAjeno)
    const antesPropio = await fotoDelForo(foroPropio)

    // FORO-01b ronda 0 (C-T2 del tester, §E7.5.2, lista cerrada 3): si 01b suma la ruta 17 a
    // rutasDelForo, el caso sigue recorriendo las 14 de 01a con :foroId; la 17 tiene su propio caso.
    const rutas = rutasDelForo({
      claseId: e.claseId,
      foroId: foroAjeno,
      participacionId: principalAjena,
      alumnoId: e.alumno.id,
    }).filter(({ numero }) => numero >= 3 && numero <= 16)
    expect(rutas).toHaveLength(14)
    let casos = 0
    for (const ruta of rutas) {
      for (const rol of ROLES[ruta.numero] ?? []) {
        const url = ruta.numero === 5 ? `${ruta.url}?confirmar=entregas` : ruta.url
        const respuesta = await pedirRuta({ ...ruta, url }, tokenDe(e, rol))
        expect(
          respuesta.statusCode,
          `ruta ${String(ruta.numero)} como ${rol}: ${respuesta.body}`,
        ).toBe(404)
        expect(codigoDe(respuesta)).toBe("TAREA_NO_ENCONTRADA")
        casos += 1
      }
    }
    expect(casos).toBe(27)
    expect(await fotoDelForo(foroAjeno)).toEqual(antesAjeno)
    expect(await fotoDelForo(foroPropio)).toEqual(antesPropio)
    expect(
      await obtenerDb().entrega.count({ where: { alumnoId: e.alumno.id, tareaId: foroAjeno } }),
    ).toBe(0)
  }, 60_000)

  it("ATQ-FORO-11: en las rutas 10 y 11, una principal de un foro de otra clase, el id del propio foro y el de una réplica responden 404 PARTICIPACION_NO_ENCONTRADA sin escribir", async () => {
    const e = await crearEscenarioDeForo(idsUsuarios, idsClases)
    const otra = await crearClaseDePrueba(idsClases, { maestroId: e.maestro.id })
    await inscribirDePrueba(otra.id, e.otroAlumno.id)
    const foro = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const foroAjeno = await crearForoDePrueba({ claseId: otra.id, autorId: e.maestro.id })
    const principalAjena = await crearParticipacionDePrueba({
      foroId: foroAjeno,
      autorId: e.otroAlumno.id,
    })
    const principal = await crearParticipacionDePrueba({ foroId: foro, autorId: e.otroAlumno.id })
    const replica = await crearParticipacionDePrueba({
      foroId: foro,
      autorId: e.alumno.id,
      principalId: principal,
    })
    const antes = await fotoDelForo(foro)
    const antesAjeno = await fotoDelForo(foroAjeno)
    for (const id of [principalAjena, foro, replica]) {
      const url = `${urlForo(e.claseId, foro)}/participaciones/${id}/replicas`
      for (const token of [e.tokenAlumno, e.tokenMaestro, e.tokenAdmin]) {
        const lista = await pedir({ method: "GET", url, token })
        expect(lista.statusCode, lista.body).toBe(404)
        expect(codigoDe(lista)).toBe("PARTICIPACION_NO_ENCONTRADA")
      }
      for (const token of [e.tokenAlumno, e.tokenMaestro]) {
        const escrita = await pedir({ method: "POST", url, token, payload: { texto: "Intento" } })
        expect(escrita.statusCode, escrita.body).toBe(404)
        expect(codigoDe(escrita)).toBe("PARTICIPACION_NO_ENCONTRADA")
      }
    }
    expect(await fotoDelForo(foro)).toEqual(antes)
    expect(await fotoDelForo(foroAjeno)).toEqual(antesAjeno)
  }, 60_000)

  it("ATQ-FORO-12: en las rutas 13 a 16, un alumno de otra clase, un maestro, el admin, un alumno dado de baja, uno que ya salió de la clase (con su principal) y un id inexistente responden 404 ALUMNO_NO_ENCONTRADO sin crear entregas ni comentarios", async () => {
    const e = await crearEscenarioDeForo(idsUsuarios, idsClases)
    const foro = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      fechaLimite: PASADA(),
      aceptaTardias: false,
    })
    const ajeno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumno De Otra" })
    const otra = await crearClaseDePrueba(idsClases, { maestroId: e.maestro.id })
    await inscribirDePrueba(otra.id, ajeno.id)
    const deBaja = await crearUsuarioDePrueba(idsUsuarios, {
      nombre: "Alumna De Baja",
      activo: false,
    })
    await inscribirDePrueba(e.claseId, deBaja.id)
    const salio = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumno Que Salió" })
    await inscribirDePrueba(e.claseId, salio.id)
    await crearParticipacionDePrueba({ foroId: foro, autorId: salio.id })
    await crearEntregaDePrueba({ tareaId: foro, alumnoId: salio.id })
    await obtenerDb().inscripcion.delete({
      where: { claseId_usuarioId: { claseId: e.claseId, usuarioId: salio.id } },
    })
    const antes = await fotoDelForo(foro)
    const candidatos = [
      ajeno.id,
      e.maestro.id,
      await idDelAdminDePrueba(),
      deBaja.id,
      salio.id,
      "00000000-0000-4000-8000-000000000001",
    ]
    for (const alumnoId of candidatos) {
      const rutas = rutasDelForo({
        claseId: e.claseId,
        foroId: foro,
        participacionId: foro,
        alumnoId,
      }).filter(({ numero }) => numero >= 13)
      for (const ruta of rutas) {
        for (const rol of ROLES[ruta.numero] ?? []) {
          const respuesta = await pedirRuta(ruta, tokenDe(e, rol))
          expect(respuesta.statusCode, `ruta ${String(ruta.numero)} con ${alumnoId}`).toBe(404)
          expect(codigoDe(respuesta)).toBe("ALUMNO_NO_ENCONTRADO")
        }
      }
    }
    expect(await fotoDelForo(foro)).toEqual(antes)
  }, 60_000)

  it("ATQ-FORO-13: cursores cruzados: una réplica de otra principal o la propia principal en 10, una participación de otro alumno o de otro foro en 14 y una devolución de otro alumno en 7 y en 15 responden 400 VALIDACION sin traer nada", async () => {
    const e = await crearEscenarioDeForo(idsUsuarios, idsClases)
    const foro = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const otroForo = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principalA = await publicarPrincipal(e, foro, e.tokenAlumno)
    const principalB = await publicarPrincipal(e, foro, e.tokenOtroAlumno)
    const replicaDeB = replicaPublicadaRespuestaSchema.parse(
      (await replicarPorLaApi(e, foro, principalB, e.tokenOtroAlumno)).json(),
    ).replica.id
    const enOtroForo = await publicarPrincipal(e, otroForo, e.tokenAlumno)
    await calificarPorLaApi(e, foro, e.alumno.id, 1, "Para la alumna")
    await calificarPorLaApi(e, foro, e.otroAlumno.id, 1, "Para el otro alumno")
    const devolucionDelOtro = await obtenerDb().comentario.findFirst({
      where: { entrega: { tareaId: foro, alumnoId: e.otroAlumno.id } },
      select: { id: true },
    })
    if (devolucionDelOtro === null) throw new Error("Precondición: el otro alumno tiene devolución")
    const base = urlForo(e.claseId, foro)
    const casos: { url: string; token: string }[] = [
      {
        url: `${base}/participaciones/${principalA}/replicas?cursor=${replicaDeB}`,
        token: e.tokenAlumno,
      },
      {
        url: `${base}/participaciones/${principalA}/replicas?cursor=${principalA}`,
        token: e.tokenMaestro,
      },
      {
        url: `${base}/participantes/${e.alumno.id}/participaciones?cursor=${principalB}`,
        token: e.tokenMaestro,
      },
      {
        url: `${base}/participantes/${e.alumno.id}/participaciones?cursor=${enOtroForo}`,
        token: e.tokenAdmin,
      },
      {
        url: `${base}/mi-participacion/devoluciones?cursor=${devolucionDelOtro.id}`,
        token: e.tokenAlumno,
      },
      {
        url: `${base}/participantes/${e.alumno.id}/devoluciones?cursor=${devolucionDelOtro.id}`,
        token: e.tokenMaestro,
      },
    ]
    for (const caso of casos) {
      const respuesta = await pedir({ method: "GET", url: caso.url, token: caso.token })
      expect(respuesta.statusCode, `${caso.url}: ${respuesta.body}`).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
      expect(respuesta.body).not.toContain("Para el otro alumno")
    }
  }, 60_000)
})

describe("ataque FORO-01a r1 · punto 4: lo que ve un alumno, a profundidad", () => {
  it("ATQ-FORO-14: con un foro del admin vencido que acepta tardías, la principal y la réplica tardías del otro alumno no traen conRetraso al alumno en 8 y 10 (las suyas sí), el autor admin sale como Administración sin rol, y la 201 de su réplica a una principal ajena solo trae su réplica", async () => {
    const e = await crearEscenarioDeForo(idsUsuarios, idsClases)
    const creado = await pedir({
      method: "POST",
      url: urlForos(e.claseId),
      token: e.tokenAdmin,
      payload: cuerpoDeForo({ titulo: "Foro del admin" }),
    })
    expect(creado.statusCode, creado.body).toBe(201)
    const foroId = foroRespuestaSchema.parse(creado.json()).foro.id
    // Vencido después de crearlo (la API no deja crear en el pasado).
    await obtenerDb().tarea.update({
      where: { id: foroId },
      data: { fechaLimite: PASADA() },
      select: { id: true },
    })
    const principalDelOtro = await publicarPrincipal(e, foroId, e.tokenOtroAlumno)
    await replicarPorLaApi(e, foroId, principalDelOtro, e.tokenOtroAlumno)
    const propia = await publicarPrincipal(e, foroId, e.tokenAlumno)
    const respuestaDeReplica = await replicarPorLaApi(e, foroId, principalDelOtro, e.tokenAlumno)
    const publicada = replicaPublicadaRespuestaSchema.parse(respuestaDeReplica.json())
    expect(Object.keys(respuestaDeReplica.json() as object)).toEqual(["replica"])
    expect(publicada.replica).toMatchObject({ propia: true, conRetraso: true })

    const lista = await pedir({
      method: "GET",
      url: urlForos(e.claseId),
      token: e.tokenAlumno,
    })
    const foros = listaForosRespuestaSchema.parse(lista.json()).foros
    expect(foros[0]?.autor).toEqual({
      id: expect.any(String) as string,
      nombre: "Administración",
      administracion: true,
    })
    expect(foros[0]?.entrega).toEqual({ estado: "entregado", conRetraso: true })

    const detalle = await pedir({
      method: "GET",
      url: urlForo(e.claseId, foroId),
      token: e.tokenAlumno,
    })
    expect(foroRespuestaSchema.parse(detalle.json()).foro.autor).toMatchObject({
      nombre: "Administración",
      administracion: true,
    })

    const principales = await pedir({
      method: "GET",
      url: `${urlForo(e.claseId, foroId)}/participaciones`,
      token: e.tokenAlumno,
    })
    const crudas = (principales.json() as { participaciones: Record<string, unknown>[] })
      .participaciones
    listaParticipacionesRespuestaSchema.parse(principales.json())
    const delOtro = crudas.find((p) => p.id === principalDelOtro)
    const mia = crudas.find((p) => p.id === propia)
    expect(delOtro, "la principal del otro sale").toBeDefined()
    expect(Object.keys(delOtro ?? {})).not.toContain("conRetraso")
    expect(mia).toMatchObject({ conRetraso: true, propia: true })

    const replicas = await pedir({
      method: "GET",
      url: `${urlForo(e.claseId, foroId)}/participaciones/${principalDelOtro}/replicas`,
      token: e.tokenAlumno,
    })
    const crudasDeReplicas = (replicas.json() as { replicas: Record<string, unknown>[] }).replicas
    listaReplicasRespuestaSchema.parse(replicas.json())
    expect(crudasDeReplicas).toHaveLength(2)
    for (const replica of crudasDeReplicas) {
      if (replica.propia === true) expect(replica.conRetraso).toBe(true)
      else expect(Object.keys(replica)).not.toContain("conRetraso")
      expect(Object.keys(replica.autor as object).sort()).toEqual([
        "administracion",
        "id",
        "nombre",
      ])
    }

    // El maestro sí ve la marca de todos, y el alumno no ve las devoluciones de nadie más.
    const delMaestro = listaParticipacionesRespuestaSchema.parse(
      (
        await pedir({
          method: "GET",
          url: `${urlForo(e.claseId, foroId)}/participaciones`,
          token: e.tokenMaestro,
        })
      ).json(),
    )
    expect(delMaestro.participaciones.every((p) => p.conRetraso === true)).toBe(true)
    const devoluciones = listaComentariosPrivadosRespuestaSchema.parse(
      (
        await pedir({
          method: "GET",
          url: `${urlForo(e.claseId, foroId)}/mi-participacion/devoluciones`,
          token: e.tokenAlumno,
        })
      ).json(),
    )
    expect(devoluciones.comentarios).toEqual([])
  }, 60_000)
})
