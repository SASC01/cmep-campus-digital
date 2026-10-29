import { errorApiSchema, listaTrabajoRespuestaSchema } from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria, type AlmacenEnMemoria } from "./almacen-en-memoria.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  crearComentarioDePrueba,
  crearPublicacionDePrueba,
  idDelAdminDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { formadasDetrasDe } from "./ayudas-concurrencia.js"
import {
  crearMaterialConTemaDePrueba,
  crearTareaDePrueba,
  crearTemaDePrueba,
} from "./ayudas-tareas.js"

// Ataque del Tester, CLASES-03a, ronda 2: los remedios de la ronda 1 y sus vecinos.
// - T-01/T-02: borrarPublicacion toma ahora la fila con FOR UPDATE antes de tocar archivos. Se cruza
//   contra editar, mover, comentar, borrar comentarios (también de un anuncio) y otro borrado, en los
//   dos órdenes: quién gana, qué responde el perdedor, sin 500, deadlock ni huérfanos.
// - T-03: puedeMover de GET …/trabajo, con y sin ?seccion, por rol y bloque (incluido el nulo),
//   contra lo que responde mover de verdad; bloque no sale en la respuesta.
// - T-04: archivoIds repetidos con otra capitalización en publicar anuncio y material, crear y editar
//   tarea, editar recurso y entregar.
// Retenciones con FOR UPDATE de una fila, formadasDetrasDe con el pid propio y timeout explícito
// (método de CHORE-02). Las fechas son instantes fijos; ninguna se compara con el reloj.

const almacen: AlmacenEnMemoria = crearAlmacenEnMemoria()
let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
let adminId = ""
let tokenAdmin = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen })
  await app.ready()
  adminId = await idDelAdminDePrueba()
  tokenAdmin = await tokenDelAdminDePrueba()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const pedir = (opciones: {
  method: "GET" | "POST" | "PUT" | "DELETE"
  url: string
  token: string
  payload?: InjectOptions["payload"]
}): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method: opciones.method,
    url: opciones.url,
    ...(opciones.payload === undefined ? {} : { payload: opciones.payload }),
    headers: { authorization: `Bearer ${opciones.token}` },
  })

const resultado = (respuesta: LightMyRequestResponse): string =>
  respuesta.statusCode < 300
    ? String(respuesta.statusCode)
    : `${String(respuesta.statusCode)} ${errorApiSchema.parse(respuesta.json()).error.codigo}`

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))
const FECHA_LIMITE = "2030-01-15T12:00:00.000Z"

interface Escenario {
  claseId: string
  maestro: UsuarioDePrueba
  otroMaestro: UsuarioDePrueba
  alumno: UsuarioDePrueba
  tokenMaestro: string
  tokenOtroMaestro: string
  tokenAlumno: string
}

const escenario = async (): Promise<Escenario> => {
  const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Maestra D" })
  const otroMaestro = await crearUsuarioDePrueba(idsUsuarios, {
    rol: "maestro",
    nombre: "Maestro E",
  })
  const alumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumna F" })
  const clase = await crearClaseDePrueba(idsClases, {
    maestroId: maestro.id,
    maestroIds: [maestro.id, otroMaestro.id],
  })
  await inscribirDePrueba(clase.id, alumno.id, "codigo")
  return {
    claseId: clase.id,
    maestro,
    otroMaestro,
    alumno,
    tokenMaestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
    tokenOtroMaestro: await firmarTokenDePrueba({ usuarioId: otroMaestro.id }),
    tokenAlumno: await firmarTokenDePrueba({ usuarioId: alumno.id }),
  }
}

const urlPublicacion = (claseId: string, id: string): string =>
  `/api/clases/${claseId}/publicaciones/${id}`

const recurso = (
  e: Escenario,
  autorId: string,
  bloque?: "aprendizaje" | "docente",
  temaId: string | null = null,
): Promise<string> =>
  crearMaterialConTemaDePrueba({
    claseId: e.claseId,
    autorId,
    temaId,
    ...(bloque === undefined ? {} : { bloque }),
  })

const borrar = (e: Escenario, id: string, token: string) =>
  pedir({ method: "DELETE", url: urlPublicacion(e.claseId, id), token })

const mover = (e: Escenario, id: string, temaId: string | null, token: string) =>
  pedir({ method: "PUT", url: `${urlPublicacion(e.claseId, id)}/tema`, token, payload: { temaId } })

const comentar = (e: Escenario, id: string, token: string) =>
  pedir({
    method: "POST",
    url: `${urlPublicacion(e.claseId, id)}/comentarios`,
    token,
    payload: { texto: "Comentario en la carrera" },
  })

const editarRecurso = (e: Escenario, id: string, archivoIds: string[], token: string) =>
  pedir({
    method: "PUT",
    url: `/api/clases/${e.claseId}/recursos/${id}`,
    token,
    payload: { titulo: "Editado", texto: "", temaId: null, archivoIds, version: 0 },
  })

// Lo que debe quedar después de cualquier carrera: ningún comentario sin su publicación, ningún
// archivo confirmado sin publicación y ningún archivo apuntando a una publicación borrada.
const huerfanos = async (claseId: string, borrada: string) => {
  const comentarios = await obtenerDb().comentario.count({ where: { publicacionId: borrada } })
  const archivos = await obtenerDb().archivo.findMany({
    where: { claseId },
    select: { estado: true, publicacionId: true },
  })
  return {
    comentarios,
    archivosEnLaBorrada: archivos.filter((a) => a.publicacionId === borrada).length,
    confirmadosSinPublicacion: archivos.filter(
      (a) => a.estado === "confirmado" && a.publicacionId === null,
    ).length,
  }
}
const SIN_HUERFANOS = { comentarios: 0, archivosEnLaBorrada: 0, confirmadosSinPublicacion: 0 }

// Retiene una fila (de publicaciones o de comentarios) con FOR UPDATE y lanza cada operación cuando
// la anterior ya espera esa fila (formadasDetrasDe con el pid propio); la suelta al final.
const conFilaRetenida = async (
  fila: { tabla: "publicaciones" | "comentarios"; id: string },
  operaciones: readonly (() => Promise<LightMyRequestResponse>)[],
): Promise<LightMyRequestResponse[]> => {
  const lanzadas: Promise<LightMyRequestResponse>[] = []
  await obtenerDb().$transaction(
    async (tx) => {
      if (fila.tabla === "publicaciones") {
        await tx.$queryRaw`SELECT id FROM publicaciones WHERE id = ${fila.id}::uuid FOR UPDATE`
      } else {
        await tx.$queryRaw`SELECT id FROM comentarios WHERE id = ${fila.id}::uuid FOR UPDATE`
      }
      const [propio] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
      if (!propio) throw new Error("Precondición: no se obtuvo el pid de la transacción retenedora")
      for (const [indice, operacion] of operaciones.entries()) {
        let terminada = false
        const lanzada = operacion()
        lanzada.then(
          () => (terminada = true),
          () => (terminada = true),
        )
        lanzadas.push(lanzada)
        const limite = Date.now() + 10_000
        let formada = false
        while (!formada && !terminada && Date.now() < limite) {
          formada = (await formadasDetrasDe(propio.pid)) >= indice + 1
          if (!formada) await esperar(25)
        }
        expect(
          formada,
          `Precondición: la operación ${String(indice + 1)} no se formó detrás de la fila retenida`,
        ).toBe(true)
      }
      await esperar(100)
    },
    { timeout: 40_000, maxWait: 5_000 },
  )
  return Promise.all(lanzadas)
}

describe("ataque CLASES-03a r2: el nuevo orden de borrarPublicacion contra las demás escrituras", () => {
  it(
    "CL3a-r2-01: anuncio: comentar formado antes que borrar da 201 y 204; el comentario cae en cascada y no queda nada huérfano",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const anuncio = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
      const respuestas = await conFilaRetenida({ tabla: "publicaciones", id: anuncio }, [
        () => comentar(e, anuncio, e.tokenAlumno),
        () => borrar(e, anuncio, e.tokenMaestro),
      ])
      expect(respuestas.map(resultado)).toEqual(["201", "204"])
      expect(await huerfanos(e.claseId, anuncio)).toEqual(SIN_HUERFANOS)
    },
  )

  it(
    "CL3a-r2-02: anuncio con adjunto: borrar formado antes que comentar da 204 y el comentario un 404, sin escribir el comentario",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const anuncio = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
      await crearArchivoDePrueba({
        claseId: e.claseId,
        subidoPor: e.maestro.id,
        estado: "confirmado",
        publicacionId: anuncio,
      })
      const respuestas = await conFilaRetenida({ tabla: "publicaciones", id: anuncio }, [
        () => borrar(e, anuncio, tokenAdmin),
        () => comentar(e, anuncio, e.tokenAlumno),
      ])
      expect(respuestas.map(resultado)[0]).toBe("204")
      expect(respuestas.map(resultado)[1]).toMatch(/^404 /)
      expect(await huerfanos(e.claseId, anuncio)).toEqual(SIN_HUERFANOS)
    },
  )

  it(
    "CL3a-r2-03: recurso: mover formado antes que borrar da 200 y 204; borrar antes que mover da 204 y 404",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
      const primero = await recurso(e, e.maestro.id, "docente")
      const segundo = await recurso(e, e.maestro.id, "docente")
      const moverPrimero = await conFilaRetenida({ tabla: "publicaciones", id: primero }, [
        () => mover(e, primero, tema.id, e.tokenOtroMaestro),
        () => borrar(e, primero, tokenAdmin),
      ])
      const borrarPrimero = await conFilaRetenida({ tabla: "publicaciones", id: segundo }, [
        () => borrar(e, segundo, e.tokenMaestro),
        () => mover(e, segundo, tema.id, e.tokenOtroMaestro),
      ])
      expect(moverPrimero.map(resultado)).toEqual(["200", "204"])
      expect(borrarPrimero.map(resultado)).toEqual(["204", "404 PUBLICACION_NO_ENCONTRADA"])
      expect(await huerfanos(e.claseId, primero)).toEqual(SIN_HUERFANOS)
      expect(await huerfanos(e.claseId, segundo)).toEqual(SIN_HUERFANOS)
    },
  )

  it(
    "CL3a-r2-04: dos borrados del mismo recurso con adjunto (admin y autor) dan 204 y 404, sin 500",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const id = await recurso(e, e.maestro.id, "docente")
      await crearArchivoDePrueba({
        claseId: e.claseId,
        subidoPor: e.maestro.id,
        estado: "confirmado",
        publicacionId: id,
      })
      const respuestas = await conFilaRetenida({ tabla: "publicaciones", id }, [
        () => borrar(e, id, tokenAdmin),
        () => borrar(e, id, e.tokenMaestro),
      ])
      expect(respuestas.map(resultado)).toEqual(["204", "404 PUBLICACION_NO_ENCONTRADA"])
      expect(await huerfanos(e.claseId, id)).toEqual(SIN_HUERFANOS)
    },
  )

  it(
    "CL3a-r2-05: editar con un adjunto nuevo, comentar y borrar, formados en ese orden sobre el recurso: 200, 201 y 204, sin deadlock ni huérfanos",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const id = await recurso(e, e.maestro.id, "docente")
      const nuevo = await crearArchivoDePrueba({ claseId: e.claseId, subidoPor: e.maestro.id })
      almacen.subir(nuevo.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
      const respuestas = await conFilaRetenida({ tabla: "publicaciones", id }, [
        () => editarRecurso(e, id, [nuevo.id], e.tokenMaestro),
        () => comentar(e, id, e.tokenAlumno),
        () => borrar(e, id, tokenAdmin),
      ])
      expect(respuestas.map(resultado)).toEqual(["200", "201", "204"])
      expect(await huerfanos(e.claseId, id)).toEqual(SIN_HUERFANOS)
      expect(await obtenerDb().archivo.findUnique({ where: { id: nuevo.id } })).toMatchObject({
        estado: "descartado",
        publicacionId: null,
      })
    },
  )

  it(
    "CL3a-r2-06: borrar un comentario (por la publicación y por «mis comentarios») contra borrar su recurso, en los dos órdenes: sin 500; el perdedor responde 404",
    { timeout: 90_000 },
    async () => {
      const e = await escenario()
      const casos: [string, string][] = []
      for (const orden of ["comentario primero", "publicación primero"] as const) {
        for (const via of ["por la publicación", "mis comentarios"] as const) {
          const id = await recurso(e, e.maestro.id, "docente")
          const comentarioId = await crearComentarioDePrueba({
            publicacionId: id,
            autorId: e.alumno.id,
          })
          const borrarComentario = () =>
            via === "por la publicación"
              ? pedir({
                  method: "DELETE",
                  url: `${urlPublicacion(e.claseId, id)}/comentarios/${comentarioId}`,
                  token: e.tokenMaestro,
                })
              : pedir({
                  method: "DELETE",
                  url: `/api/clases/${e.claseId}/mis-comentarios/${comentarioId}`,
                  token: e.tokenAlumno,
                })
          const borrarPublicacion = () => borrar(e, id, tokenAdmin)
          const operaciones =
            orden === "comentario primero"
              ? [borrarComentario, borrarPublicacion]
              : [borrarPublicacion, borrarComentario]
          const respuestas = await conFilaRetenida(
            { tabla: "comentarios", id: comentarioId },
            operaciones,
          )
          const [delComentario, deLaPublicacion] =
            orden === "comentario primero" ? respuestas : [respuestas[1], respuestas[0]]
          if (delComentario === undefined || deLaPublicacion === undefined)
            throw new Error("Precondición: dos respuestas")
          casos.push([
            `${orden}, ${via}`,
            `${resultado(delComentario)} | ${resultado(deLaPublicacion)}`,
          ])
          expect(await huerfanos(e.claseId, id)).toEqual(SIN_HUERFANOS)
        }
      }
      expect(casos.filter(([, r]) => r.includes("500"))).toEqual([])
      expect(casos.map(([, r]) => r.split(" | ")[1])).toEqual(["204", "204", "204", "204"])
      expect(casos.map(([, r]) => (r.split(" | ")[0] ?? "").slice(0, 3)).sort()).toEqual([
        "204",
        "204",
        "404",
        "404",
      ])
    },
  )
})

describe("ataque CLASES-03a r2: puedeMover de «Trabajo de clase» contra mover de verdad (T-03)", () => {
  it("CL3a-r2-07: por rol (estudiante, maestro, admin), con y sin ?seccion=actividades, en materiales de cada bloque y con bloque nulo (autor admin y autor maestro) y en tareas, puedeMover coincide con lo que responde mover; bloque no sale", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    const elementos: Record<string, string> = {
      "aprendizaje del admin": await recurso(e, adminId, "aprendizaje"),
      "docente del maestro": await recurso(e, e.maestro.id, "docente"),
      "docente de otro maestro": await recurso(e, e.otroMaestro.id, "docente"),
      "nulo del admin": await recurso(e, adminId),
      "nulo del maestro": await recurso(e, e.maestro.id),
      "tarea del admin": await crearTareaDePrueba({
        claseId: e.claseId,
        autorId: adminId,
        fechaLimite: new Date(FECHA_LIMITE),
      }),
      "tarea del maestro": await crearTareaDePrueba({
        claseId: e.claseId,
        autorId: e.maestro.id,
        fechaLimite: new Date(FECHA_LIMITE),
      }),
    }
    const tokens: Record<string, string> = {
      estudiante: e.tokenAlumno,
      maestro: e.tokenOtroMaestro,
      admin: tokenAdmin,
    }
    const fallas: string[] = []
    for (const [rol, token] of Object.entries(tokens)) {
      const banderas = new Map<string, boolean>()
      for (const consulta of ["tema=sin-tema", "tema=sin-tema&seccion=actividades"]) {
        const r = await pedir({
          method: "GET",
          url: `/api/clases/${e.claseId}/trabajo?${consulta}&limite=50`,
          token,
        })
        expect(r.statusCode, r.body).toBe(200)
        expect(r.body, `${rol} ${consulta}`).not.toMatch(/"bloque"/)
        for (const el of listaTrabajoRespuestaSchema.parse(r.json()).elementos) {
          const previa = banderas.get(el.id)
          if (previa !== undefined && previa !== el.puedeMover)
            fallas.push(`${rol}: la bandera cambia con ?seccion en ${el.id}`)
          banderas.set(el.id, el.puedeMover)
        }
      }
      for (const [nombre, id] of Object.entries(elementos)) {
        const bandera = banderas.get(id)
        if (bandera === undefined) {
          fallas.push(`${rol}: ${nombre} no salió en la lista`)
          continue
        }
        const movido = await mover(e, id, tema.id, token)
        if (bandera !== (movido.statusCode === 200))
          fallas.push(
            `${rol}: ${nombre}: puedeMover ${String(bandera)}, mover ${resultado(movido)}`,
          )
        if (movido.statusCode === 200) await mover(e, id, null, token)
      }
    }
    expect(fallas).toEqual([])
  })
})

describe("ataque CLASES-03a r2: archivoIds repetidos con otra capitalización en cada ruta que los recibe (T-04)", () => {
  it("CL3a-r2-08: publicar anuncio y material, crear y editar tarea, editar recurso y entregar responden 400 VALIDACION «No repitas un archivo adjunto» sin escribir nada", async () => {
    const e = await escenario()
    const pendiente = await crearArchivoDePrueba({ claseId: e.claseId, subidoPor: e.maestro.id })
    almacen.subir(pendiente.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
    const repetido = [pendiente.id, pendiente.id.toUpperCase()]
    const tarea = await crearTareaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      fechaLimite: new Date(FECHA_LIMITE),
    })
    const deLaTarea = await crearArchivoDePrueba({
      claseId: e.claseId,
      subidoPor: e.maestro.id,
      estado: "confirmado",
      publicacionId: tarea,
    })
    const id = await recurso(e, e.maestro.id, "docente")
    const delRecurso = await crearArchivoDePrueba({
      claseId: e.claseId,
      subidoPor: e.maestro.id,
      estado: "confirmado",
      publicacionId: id,
    })
    const deEntrega = await crearArchivoDePrueba({ claseId: e.claseId, subidoPor: e.alumno.id })
    const cuerpoDeTarea = {
      titulo: "Tarea con repetidos",
      instrucciones: "",
      fechaLimite: FECHA_LIMITE,
      puntos: 10,
      aceptaTardias: true,
      requiereAdjuntos: true,
      categoriaId: null,
      temaId: null,
      rubrica: [],
    }
    const foto = async () => ({
      publicaciones: await obtenerDb().publicacion.count({ where: { claseId: e.claseId } }),
      archivos: await obtenerDb().archivo.findMany({
        where: { claseId: e.claseId },
        orderBy: { id: "asc" },
        select: { id: true, estado: true, publicacionId: true, entregaId: true },
      }),
      versiones: await obtenerDb().publicacion.findMany({
        where: { claseId: e.claseId },
        orderBy: { id: "asc" },
        select: { id: true, version: true },
      }),
      tareaVersion: (await obtenerDb().tarea.findUnique({ where: { id: tarea } }))?.version,
      entregas: await obtenerDb().entrega.count({ where: { tareaId: tarea } }),
    })
    const antes = await foto()
    const casos: [string, () => Promise<LightMyRequestResponse>][] = [
      [
        "anuncio",
        () =>
          pedir({
            method: "POST",
            url: `/api/clases/${e.claseId}/publicaciones`,
            token: e.tokenMaestro,
            payload: { tipo: "anuncio", texto: "Aviso", archivoIds: repetido },
          }),
      ],
      [
        "material",
        () =>
          pedir({
            method: "POST",
            url: `/api/clases/${e.claseId}/publicaciones`,
            token: e.tokenMaestro,
            payload: { tipo: "material", titulo: "Guía", texto: "", archivoIds: repetido },
          }),
      ],
      [
        "crear tarea",
        () =>
          pedir({
            method: "POST",
            url: `/api/clases/${e.claseId}/tareas`,
            token: e.tokenMaestro,
            payload: { ...cuerpoDeTarea, archivoIds: repetido },
          }),
      ],
      [
        "editar tarea (adjunto que ya tiene)",
        () =>
          pedir({
            method: "PUT",
            url: `/api/clases/${e.claseId}/tareas/${tarea}`,
            token: e.tokenMaestro,
            payload: {
              ...cuerpoDeTarea,
              archivoIds: [deLaTarea.id, deLaTarea.id.toUpperCase()],
              version: 0,
            },
          }),
      ],
      [
        "editar recurso (adjunto que ya tiene)",
        () => editarRecurso(e, id, [delRecurso.id.toUpperCase(), delRecurso.id], e.tokenMaestro),
      ],
      [
        "entregar",
        () =>
          pedir({
            method: "POST",
            url: `/api/clases/${e.claseId}/tareas/${tarea}/entrega`,
            token: e.tokenAlumno,
            payload: { archivoIds: [deEntrega.id, deEntrega.id.toUpperCase()], enlaces: [] },
          }),
      ],
    ]
    const fallas: string[] = []
    for (const [nombre, peticion] of casos) {
      const r = await peticion()
      const mensaje =
        r.statusCode === 400 ? errorApiSchema.parse(r.json()).error.mensaje : r.body.slice(0, 120)
      if (resultado(r) !== "400 VALIDACION" || !mensaje.includes("No repitas un archivo adjunto"))
        fallas.push(`${nombre}: ${resultado(r)} ${mensaje}`)
    }
    expect(fallas).toEqual([])
    expect(await foto()).toEqual(antes)
  })
})
