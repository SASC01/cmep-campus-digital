import {
  claseRespuestaSchema,
  conteoDeBorradoRespuestaSchema,
  exportacionDeCalificacionesRespuestaSchema,
  foroRespuestaSchema,
  gradebookRespuestaSchema,
  listaEntregasRespuestaSchema,
  listaParticipacionesRespuestaSchema,
  listaReplicasRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria, type AlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba, crearUsuarioDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import {
  fotoDeLaClase,
  terminarCopiasDePrueba,
  trabajosDeBorradoCon,
  trabajosDeCopiaCon,
} from "./ayudas-borrado-duplicado.js"
import { idsDeCriterios } from "./ayudas-calificaciones.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"
import { archivarClaseDePrueba } from "./ayudas-clases-archivadas.js"
import {
  clavesDe,
  CLAVES_QUE_NUNCA_SALEN,
  codigoDe,
  crearEscenarioDeForo,
  crearParticipacionDePrueba,
  cuerpoDeForo,
  pedirForo,
  urlForo,
  urlForos,
  type EscenarioDeForo,
} from "./ayudas-foros.js"
import { crearCriteriosDePrueba } from "./ayudas-tareas.js"

// FORO-01b (§E7.3, "Backend", puntos 2 a 4; DH-17 a y DH-18 a). FORO-1B08 (el borrado definitivo de
// una clase archivada con un foro), FORO-1B09 (duplicar una clase con un foro: el foro no se copia) y
// FORO-1B10 (la baja de una cuenta con participaciones).

const almacen: AlmacenEnMemoria = crearAlmacenEnMemoria()
let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}
const pedir = pedirForo(obtenerApp)

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen })
  await app.ready()
})

afterAll(async () => {
  await terminarCopiasDePrueba(idsClases)
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

// Un foro creado por la API con un adjunto del planteamiento y rúbrica; la principal del alumno, su
// calificación con desglose y devolución; una réplica del otro alumno y otra del maestro.
const foroCompleto = async (e: EscenarioDeForo) => {
  const archivo = await crearArchivoDePrueba({ claseId: e.claseId, subidoPor: e.maestro.id })
  almacen.subir(archivo.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
  const creado = await pedir({
    method: "POST",
    url: urlForos(e.claseId),
    token: e.tokenMaestro,
    payload: cuerpoDeForo({ archivoIds: [archivo.id], puntos: 20 }),
  })
  expect(creado.statusCode, creado.body).toBe(201)
  const foroId = foroRespuestaSchema.parse(creado.json()).foro.id
  await crearCriteriosDePrueba(foroId, 2)
  const principal = await pedir({
    method: "POST",
    url: `${urlForo(e.claseId, foroId)}/participaciones`,
    token: e.tokenAlumno,
    payload: { texto: "Principal" },
  })
  expect(principal.statusCode, principal.body).toBe(201)
  const principalId = principal.json<{ participacion: { id: string } }>().participacion.id
  for (const token of [e.tokenOtroAlumno, e.tokenMaestro]) {
    const replica = await pedir({
      method: "POST",
      url: `${urlForo(e.claseId, foroId)}/participaciones/${principalId}/replicas`,
      token,
      payload: { texto: "Réplica" },
    })
    expect(replica.statusCode, replica.body).toBe(201)
  }
  const [c1, c2] = await idsDeCriterios(foroId)
  if (c1 === undefined || c2 === undefined) throw new Error("Precondición: dos criterios")
  const calificada = await pedir({
    method: "PUT",
    url: `${urlForo(e.claseId, foroId)}/participantes/${e.alumno.id}/calificacion`,
    token: e.tokenMaestro,
    payload: {
      version: 1,
      puntosDeLaTarea: 20,
      calificacion: null,
      comentario: "Devolución",
      puntajes: [
        { criterioId: c1, puntos: 9 },
        { criterioId: c2, puntos: 7 },
      ],
    },
  })
  expect(calificada.statusCode, calificada.body).toBe(200)
  return { foroId, principalId, archivo }
}

describe("FORO-1B08: el borrado definitivo de una clase archivada con un foro", () => {
  it("FORO-1B08: el conteo incluye el foro, su entrega y su calificación; el borrado responde 204, no deja ninguna fila del foro y manda sus objetos a la cola", async () => {
    const e = await crearEscenarioDeForo(idsUsuarios, idsClases)
    const { foroId, archivo } = await foroCompleto(e)
    await archivarClaseDePrueba(e.claseId)
    const conteo = await pedir({
      method: "GET",
      url: `/api/admin/clases/${e.claseId}/conteo-de-borrado`,
      token: e.tokenAdmin,
    })
    expect(conteo.statusCode, conteo.body).toBe(200)
    expect(conteoDeBorradoRespuestaSchema.parse(conteo.json())).toMatchObject({
      actividades: 1,
      entregas: 1,
      calificaciones: 1,
      archivos: 1,
    })
    const borrado = await pedir({
      method: "DELETE",
      url: `/api/admin/clases/${e.claseId}?confirmar=borrar`,
      token: e.tokenAdmin,
    })
    expect(borrado.statusCode, borrado.body).toBe(204)
    const foto = await fotoDeLaClase(e.claseId)
    expect(foto).toMatchObject({
      publicaciones: 0,
      tareas: 0,
      criterios: 0,
      entregas: 0,
      puntajes: 0,
      comentarios: 0,
      archivos: 0,
    })
    expect(await obtenerDb().participacionForo.count({ where: { foroId } })).toBe(0)
    expect(await trabajosDeBorradoCon([archivo.claveObjeto])).toHaveLength(1)
    // Las cuentas siguen.
    expect(
      await obtenerDb().usuario.count({ where: { id: { in: [e.alumno.id, e.maestro.id] } } }),
    ).toBe(2)
  }, 60_000)
})

describe("FORO-1B09: duplicar una clase con un foro", () => {
  it("FORO-1B09: la copia de una clase activa y la de una archivada no tienen foro, ni tareas, participaciones, entregas ni puntajes, ningún archivo del planteamiento se copia y la original queda intacta", async () => {
    const e = await crearEscenarioDeForo(idsUsuarios, idsClases)
    const { foroId, archivo } = await foroCompleto(e)
    const antes = await fotoDeLaClase(e.claseId)
    const participaciones = await obtenerDb().participacionForo.count({ where: { foroId } })
    for (const archivar of [false, true]) {
      if (archivar) await archivarClaseDePrueba(e.claseId)
      const respuesta = await pedir({
        method: "POST",
        url: `/api/admin/clases/${e.claseId}/duplicar`,
        token: e.tokenAdmin,
        payload: { nombre: `Copia ${String(archivar)}`, maestroIds: [e.maestro.id] },
      })
      expect(respuesta.statusCode, respuesta.body).toBe(201)
      const copia = claseRespuestaSchema.parse(respuesta.json()).clase.id
      idsClases.push(copia)
      expect(await fotoDeLaClase(copia)).toMatchObject({
        publicaciones: 0,
        tareas: 0,
        criterios: 0,
        entregas: 0,
        puntajes: 0,
        comentarios: 0,
        archivos: 0,
      })
      expect(
        await obtenerDb().participacionForo.count({ where: { foro: { claseId: copia } } }),
      ).toBe(0)
    }
    expect(await trabajosDeCopiaCon([archivo.id])).toHaveLength(0)
    expect(await fotoDeLaClase(e.claseId)).toEqual(antes)
    expect(await obtenerDb().participacionForo.count({ where: { foroId } })).toBe(participaciones)
  }, 60_000)
})

describe("FORO-1B10: la baja de una cuenta con participaciones", () => {
  it("FORO-1B10: un alumno dado de baja conserva sus participaciones con su nombre, sale de Participantes, del gradebook y de la exportación; reactivarlo lo devuelve todo", async () => {
    const e = await crearEscenarioDeForo(idsUsuarios, idsClases)
    const { foroId, principalId } = await foroCompleto(e)
    // Una réplica del alumno en la principal de otro.
    const deOtro = await crearParticipacionDePrueba({ foroId, autorId: e.otroAlumno.id })
    const replicaDelAlumno = await crearParticipacionDePrueba({
      foroId,
      autorId: e.alumno.id,
      principalId: deOtro,
    })
    const activo = (valor: boolean) =>
      pedir({
        method: "PUT",
        url: `/api/admin/usuarios/${e.alumno.id}/activo`,
        token: e.tokenAdmin,
        payload: { activo: valor },
      })
    const vista = async () => {
      const lista = listaParticipacionesRespuestaSchema.parse(
        (
          await pedir({
            method: "GET",
            url: `${urlForo(e.claseId, foroId)}/participaciones`,
            token: e.tokenMaestro,
          })
        ).json(),
      )
      const replicas = listaReplicasRespuestaSchema.parse(
        (
          await pedir({
            method: "GET",
            url: `${urlForo(e.claseId, foroId)}/participaciones/${deOtro}/replicas`,
            token: e.tokenOtroAlumno,
          })
        ).json(),
      )
      const participantes = listaEntregasRespuestaSchema.parse(
        (
          await pedir({
            method: "GET",
            url: `${urlForo(e.claseId, foroId)}/participantes`,
            token: e.tokenMaestro,
          })
        ).json(),
      )
      const gradebook = gradebookRespuestaSchema.parse(
        (
          await pedir({
            method: "GET",
            url: `/api/clases/${e.claseId}/gradebook`,
            token: e.tokenMaestro,
          })
        ).json(),
      )
      const exportacion = exportacionDeCalificacionesRespuestaSchema.parse(
        (
          await pedir({
            method: "GET",
            url: `/api/clases/${e.claseId}/calificaciones/exportacion`,
            token: e.tokenMaestro,
          })
        ).json(),
      )
      return { lista, replicas, participantes, gradebook, exportacion }
    }

    expect((await activo(false)).statusCode).toBe(200)
    const deBaja = await vista()
    const suPrincipal = deBaja.lista.participaciones.find((p) => p.id === principalId)
    expect(suPrincipal?.autor).toEqual({
      id: e.alumno.id,
      nombre: "Alumna Foro",
      administracion: false,
    })
    expect(Object.keys(suPrincipal ?? {}).sort()).toEqual([
      "autor",
      "conRetraso",
      "creadoEn",
      "id",
      "propia",
      "puedeBorrar",
      "replicas",
      "texto",
    ])
    expect(deBaja.replicas.replicas.find((r) => r.id === replicaDelAlumno)?.autor.nombre).toBe(
      "Alumna Foro",
    )
    for (const prohibida of [...CLAVES_QUE_NUNCA_SALEN, "activo", "cuentaDesactivada"]) {
      expect(clavesDe(deBaja.lista)).not.toContain(prohibida)
      expect(clavesDe(deBaja.replicas)).not.toContain(prohibida)
    }
    expect(deBaja.participantes.entregas.map((f) => f.alumno.id)).not.toContain(e.alumno.id)
    const participante = await pedir({
      method: "GET",
      url: `${urlForo(e.claseId, foroId)}/participantes/${e.alumno.id}`,
      token: e.tokenMaestro,
    })
    expect(participante.statusCode).toBe(404)
    expect(codigoDe(participante)).toBe("ALUMNO_NO_ENCONTRADO")
    expect(deBaja.gradebook.alumnos.map((a) => a.alumno.id)).not.toContain(e.alumno.id)
    expect(deBaja.exportacion.alumnos.map((a) => a.alumno.id)).not.toContain(e.alumno.id)

    expect((await activo(true)).statusCode).toBe(200)
    const reactivado = await vista()
    expect(reactivado.participantes.entregas.map((f) => f.alumno.id)).toContain(e.alumno.id)
    expect(reactivado.gradebook.alumnos.map((a) => a.alumno.id)).toContain(e.alumno.id)
    expect(reactivado.exportacion.alumnos.map((a) => a.alumno.id)).toContain(e.alumno.id)
    expect(reactivado.lista.participaciones.map((p) => p.id)).toEqual(
      deBaja.lista.participaciones.map((p) => p.id),
    )
  }, 60_000)

  it("FORO-1B10: un maestro dado de baja que sigue en una clase archivada conserva sus réplicas a la vista", async () => {
    const maestro = await crearUsuarioDePrueba(idsUsuarios, {
      rol: "maestro",
      nombre: "Maestro Retirado",
    })
    const alumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumno Archivado" })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, alumno.id)
    const e = {
      claseId: clase.id,
      tokenMaestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
    }
    const tokenAdmin = (await crearEscenarioDeForo(idsUsuarios, idsClases)).tokenAdmin
    const creado = await pedir({
      method: "POST",
      url: urlForos(e.claseId),
      token: e.tokenMaestro,
      payload: cuerpoDeForo(),
    })
    const foroId = foroRespuestaSchema.parse(creado.json()).foro.id
    const principal = await crearParticipacionDePrueba({ foroId, autorId: alumno.id })
    const replica = await pedir({
      method: "POST",
      url: `${urlForo(e.claseId, foroId)}/participaciones/${principal}/replicas`,
      token: e.tokenMaestro,
      payload: { texto: "Del maestro" },
    })
    expect(replica.statusCode, replica.body).toBe(201)
    await archivarClaseDePrueba(e.claseId)
    const baja = await pedir({
      method: "PUT",
      url: `/api/admin/usuarios/${maestro.id}/activo`,
      token: tokenAdmin,
      payload: { activo: false },
    })
    expect(baja.statusCode, baja.body).toBe(200)
    const replicas = listaReplicasRespuestaSchema.parse(
      (
        await pedir({
          method: "GET",
          url: `${urlForo(e.claseId, foroId)}/participaciones/${principal}/replicas`,
          token: tokenAdmin,
        })
      ).json(),
    )
    expect(replicas.replicas.map((r) => [r.texto, r.autor.nombre])).toEqual([
      ["Del maestro", "Maestro Retirado"],
    ])
  }, 60_000)
})
