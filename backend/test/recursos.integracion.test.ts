import { randomUUID } from "node:crypto"

import {
  errorApiSchema,
  listaComentariosRespuestaSchema,
  listaRecursosRespuestaSchema,
  publicacionRespuestaSchema,
  recursoRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { crearPublicacion, listarRecursos } from "../src/adapters/db/index.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { COLA_MATERIAL_CREADO } from "../src/core/eventos/avisos-de-clase.js"
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
  leerTrabajosDeCola,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { formadasDetrasDe } from "./ayudas-concurrencia.js"
import { ejecutorEspiado, unaVezDespuesDe } from "./ayudas-gradebook.js"
import {
  crearMaterialConTemaDePrueba,
  crearTareaDePrueba,
  crearTemaDePrueba,
} from "./ayudas-tareas.js"

// CLASES-03a (CL3-A05, CL3-A10, CL3-A13 a CL3-A17): publicar un recurso con su bloque, la lista de
// recursos por bloque y tema, editar uno con su versión y sus archivos, y borrar, mover y comentar
// por las rutas de hoy con la regla del bloque (RN-07, RN-09, S-01 a S-05). Las fechas de creación
// son instantes fijos, no relativos al reloj.

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

const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

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

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

const mensajeDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.mensaje

const instante = (minuto: number): Date => new Date(Date.UTC(2026, 9, 1, 12, minuto))

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

interface Escenario {
  claseId: string
  maestro: UsuarioDePrueba
  otroMaestro: UsuarioDePrueba
  alumno: UsuarioDePrueba
  tokenMaestro: string
  tokenOtroMaestro: string
  tokenAlumno: string
}

// Una clase con dos maestros (el autor y otro) y un alumno inscrito.
const escenario = async (): Promise<Escenario> => {
  const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Maestra R" })
  const otroMaestro = await crearUsuarioDePrueba(idsUsuarios, {
    rol: "maestro",
    nombre: "Maestro S",
  })
  const alumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumna R" })
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
    tokenMaestro: await tokenDe(maestro),
    tokenOtroMaestro: await tokenDe(otroMaestro),
    tokenAlumno: await tokenDe(alumno),
  }
}

const urlRecursos = (claseId: string, consulta: string): string =>
  `/api/clases/${claseId}/recursos?${consulta}`
const urlRecurso = (claseId: string, recursoId: string): string =>
  `/api/clases/${claseId}/recursos/${recursoId}`
const urlPublicaciones = (claseId: string): string => `/api/clases/${claseId}/publicaciones`

const listar = async (e: Escenario, consulta: string, token = e.tokenMaestro) => {
  const respuesta = await pedir({ method: "GET", url: urlRecursos(e.claseId, consulta), token })
  expect(respuesta.statusCode, `${consulta}: ${respuesta.body}`).toBe(200)
  return listaRecursosRespuestaSchema.parse(respuesta.json())
}

const idsDe = (lista: { recursos: { id: string }[] }): string[] =>
  lista.recursos.map((recurso) => recurso.id)

const recurso = (
  e: Escenario,
  autorId: string,
  opciones: {
    bloque?: "aprendizaje" | "docente"
    temaId?: string | null
    minuto?: number
    titulo?: string
  } = {},
): Promise<string> =>
  crearMaterialConTemaDePrueba({
    claseId: e.claseId,
    autorId,
    temaId: opciones.temaId ?? null,
    ...(opciones.bloque === undefined ? {} : { bloque: opciones.bloque }),
    ...(opciones.minuto === undefined ? {} : { creadoEn: instante(opciones.minuto) }),
    ...(opciones.titulo === undefined ? {} : { titulo: opciones.titulo }),
  })

const cuerpoDeEdicion = (cambios: Record<string, unknown> = {}): Record<string, unknown> => ({
  titulo: "Título editado",
  texto: "Descripción editada",
  temaId: null,
  archivoIds: [],
  version: 0,
  ...cambios,
})

const editar = (
  e: Escenario,
  recursoId: string,
  cuerpo: Record<string, unknown>,
  token = e.tokenMaestro,
) => pedir({ method: "PUT", url: urlRecurso(e.claseId, recursoId), token, payload: cuerpo })

const mover = (e: Escenario, publicacionId: string, temaId: string | null, token: string) =>
  pedir({
    method: "PUT",
    url: `${urlPublicaciones(e.claseId)}/${publicacionId}/tema`,
    token,
    payload: { temaId },
  })

const filaDe = (id: string) =>
  obtenerDb().publicacion.findUnique({
    where: { id },
    select: { titulo: true, texto: true, temaId: true, version: true, bloque: true },
  })

const archivosDe = (claseId: string) =>
  obtenerDb().archivo.findMany({
    where: { claseId },
    orderBy: { id: "asc" },
    select: { id: true, estado: true, publicacionId: true },
  })

// Un archivo pendiente del usuario, con su objeto ya "subido" al almacén doble.
const archivoSubido = async (e: Escenario, subidoPor: string, nombre = "guia.pdf") => {
  const archivo = await crearArchivoDePrueba({ claseId: e.claseId, subidoPor, nombre })
  almacen.subir(archivo.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
  return archivo
}

describe("publicar un recurso con su bloque (CL3-A05)", () => {
  const publicarMaterial = (
    e: Escenario,
    token: string,
    titulo: string,
    temaId: string | null = null,
  ) =>
    pedir({
      method: "POST",
      url: urlPublicaciones(e.claseId),
      token,
      payload: { tipo: "material", titulo, texto: "", archivoIds: [], temaId },
    })

  it("CL3-A05: un maestro publica en docente y el admin en aprendizaje (en la base y en GET …/recursos); un anuncio queda sin bloque", async () => {
    const e = await escenario()
    const delMaestro = await publicarMaterial(e, e.tokenMaestro, "Del maestro")
    const delAdmin = await publicarMaterial(e, tokenAdmin, "Del admin")
    const anuncio = await pedir({
      method: "POST",
      url: urlPublicaciones(e.claseId),
      token: e.tokenMaestro,
      payload: { tipo: "anuncio", texto: "Aviso", archivoIds: [] },
    })
    for (const respuesta of [delMaestro, delAdmin, anuncio]) {
      expect(respuesta.statusCode, respuesta.body).toBe(201)
    }
    const idMaestro = publicacionRespuestaSchema.parse(delMaestro.json()).publicacion.id
    const idAdmin = publicacionRespuestaSchema.parse(delAdmin.json()).publicacion.id
    const idAnuncio = publicacionRespuestaSchema.parse(anuncio.json()).publicacion.id

    expect((await filaDe(idMaestro))?.bloque).toBe("docente")
    expect((await filaDe(idAdmin))?.bloque).toBe("aprendizaje")
    expect((await filaDe(idAnuncio))?.bloque).toBeNull()
    expect(idsDe(await listar(e, "bloque=docente&tema=sin-tema"))).toEqual([idMaestro])
    expect(idsDe(await listar(e, "bloque=aprendizaje&tema=sin-tema"))).toEqual([idAdmin])
  })

  it("CL3-A05: la respuesta de POST no cambia de forma", async () => {
    const e = await escenario()
    const respuesta = await publicarMaterial(e, e.tokenMaestro, "Forma")
    expect(respuesta.statusCode, respuesta.body).toBe(201)
    const cuerpo = respuesta.json<{ publicacion: Record<string, unknown> }>()
    expect(Object.keys(cuerpo).sort()).toEqual(["publicacion"])
    expect(Object.keys(cuerpo.publicacion).sort()).toEqual(
      [
        "adjuntos",
        "autor",
        "comentarios",
        "creadoEn",
        "id",
        "puedeBorrar",
        "tarea",
        "texto",
        "tipo",
        "titulo",
      ].sort(),
    )
  })

  it("CL3-A05: MATERIAL_CREADO se encola una vez y, si la publicación falla, no queda ni el material ni el trabajo", async () => {
    const e = await escenario()
    const respuesta = await publicarMaterial(e, e.tokenMaestro, "Con aviso")
    expect(respuesta.statusCode, respuesta.body).toBe(201)
    const id = publicacionRespuestaSchema.parse(respuesta.json()).publicacion.id
    expect(await leerTrabajosDeCola(COLA_MATERIAL_CREADO, "publicacionId", id)).toHaveLength(1)

    const fallida = await publicarMaterial(e, e.tokenMaestro, "Con tema ajeno", randomUUID())
    expect(fallida.statusCode).toBe(404)
    expect(codigoDe(fallida)).toBe("TEMA_NO_ENCONTRADO")
    expect(await leerTrabajosDeCola(COLA_MATERIAL_CREADO, "claseId", e.claseId)).toHaveLength(1)
    expect(await obtenerDb().publicacion.count({ where: { claseId: e.claseId } })).toBe(1)
  })

  it("CL3-A05: ningún material publicado por la API queda con bloque nulo", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    for (const [token, temaId] of [
      [e.tokenMaestro, null],
      [e.tokenOtroMaestro, tema.id],
      [tokenAdmin, tema.id],
      [tokenAdmin, null],
    ] as const) {
      const respuesta = await publicarMaterial(e, token, "Uno más", temaId)
      expect(respuesta.statusCode, respuesta.body).toBe(201)
    }
    const materiales = await obtenerDb().publicacion.findMany({
      where: { claseId: e.claseId, tipo: "material" },
      select: { bloque: true },
    })
    expect(materiales).toHaveLength(4)
    expect(materiales.filter((m) => m.bloque === null)).toEqual([])
  })

  it("CL3-A05: crearPublicacion llamada sin bloque deja el material con bloque nulo, como antes", async () => {
    const e = await escenario()
    const id = randomUUID()
    await crearPublicacion(
      {
        id,
        claseId: e.claseId,
        autorId: e.maestro.id,
        tipo: "material",
        titulo: "Sin bloque",
        texto: "",
      },
      async () => {},
    )
    expect((await filaDe(id))?.bloque).toBeNull()
    expect(idsDe(await listar(e, "bloque=docente&tema=sin-tema"))).toEqual([])
  })
})

describe("lista de recursos (CL3-A10)", () => {
  it("CL3-A10: filtra por bloque y por tema («sin-tema» y un id) y ordena por creado_en DESC, id DESC", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    const viejo = await recurso(e, e.maestro.id, { bloque: "docente", minuto: 1 })
    // Dos con el mismo instante: los desempata el id, de mayor a menor.
    const empateA = await recurso(e, e.maestro.id, { bloque: "docente", minuto: 5 })
    const empateB = await recurso(e, e.maestro.id, { bloque: "docente", minuto: 5 })
    const enTema = await recurso(e, e.maestro.id, { bloque: "docente", temaId: tema.id, minuto: 2 })
    const aprendizaje = await recurso(e, adminId, { bloque: "aprendizaje", minuto: 3 })
    const aprendizajeEnTema = await recurso(e, adminId, {
      bloque: "aprendizaje",
      temaId: tema.id,
      minuto: 4,
    })
    await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id })

    const empatados = [empateA, empateB].sort().reverse()
    expect(idsDe(await listar(e, "bloque=docente&tema=sin-tema"))).toEqual([...empatados, viejo])
    expect(idsDe(await listar(e, `bloque=docente&tema=${tema.id}`))).toEqual([enTema])
    expect(idsDe(await listar(e, "bloque=aprendizaje&tema=sin-tema"))).toEqual([aprendizaje])
    expect(idsDe(await listar(e, `bloque=aprendizaje&tema=${tema.id.toUpperCase()}`))).toEqual([
      aprendizajeEnTema,
    ])
  })

  it("CL3-A10: pagina con el cursor de la misma lista", async () => {
    const e = await escenario()
    const r1 = await recurso(e, e.maestro.id, { bloque: "docente", minuto: 3 })
    const r2 = await recurso(e, e.maestro.id, { bloque: "docente", minuto: 2 })
    const r3 = await recurso(e, e.maestro.id, { bloque: "docente", minuto: 1 })
    const primera = await listar(e, "bloque=docente&tema=sin-tema&limite=2")
    expect(idsDe(primera)).toEqual([r1, r2])
    expect(primera.siguienteCursor).toBe(r2)
    const segunda = await listar(e, `bloque=docente&tema=sin-tema&limite=2&cursor=${r2}`)
    expect(idsDe(segunda)).toEqual([r3])
    expect(segunda.siguienteCursor).toBeNull()
  })

  it("CL3-A10: los adjuntos salen con vista previa (imagen) y sin ella (PDF), y el conteo de comentarios", async () => {
    const e = await escenario()
    const id = await recurso(e, e.maestro.id, { bloque: "docente" })
    const imagen = await crearArchivoDePrueba({
      claseId: e.claseId,
      subidoPor: e.maestro.id,
      estado: "confirmado",
      publicacionId: id,
      nombre: "foto.png",
      tipo: "image/png",
    })
    const pdf = await crearArchivoDePrueba({
      claseId: e.claseId,
      subidoPor: e.maestro.id,
      estado: "confirmado",
      publicacionId: id,
      nombre: "guia.pdf",
    })
    await crearComentarioDePrueba({ publicacionId: id, autorId: e.alumno.id })
    await crearComentarioDePrueba({ publicacionId: id, autorId: e.maestro.id })

    const [item] = (await listar(e, "bloque=docente&tema=sin-tema", e.tokenAlumno)).recursos
    if (item === undefined) throw new Error("Precondición: la lista trae el recurso")
    expect(item.comentarios).toBe(2)
    const porId = new Map(item.adjuntos.map((adjunto) => [adjunto.id, adjunto]))
    expect(porId.get(imagen.id)?.vistaPrevia?.url).toMatch(/^https:\/\/almacen-en-memoria\.test\//)
    expect(porId.get(pdf.id)?.vistaPrevia).toBeNull()
    expect(item.adjuntos).toHaveLength(2)
  })

  it("CL3-A10: puedeEditar, puedeBorrar y puedeMover para el admin, el autor maestro, otro maestro y el estudiante en los dos bloques", async () => {
    const e = await escenario()
    await recurso(e, e.maestro.id, { bloque: "docente" })
    await recurso(e, adminId, { bloque: "aprendizaje" })
    const permisos = async (token: string, bloque: string) => {
      const [item] = (await listar(e, `bloque=${bloque}&tema=sin-tema`, token)).recursos
      if (item === undefined) throw new Error(`Precondición: hay un recurso en ${bloque}`)
      return [item.puedeEditar, item.puedeBorrar, item.puedeMover]
    }
    const esperado: [string, string, string, boolean[]][] = [
      ["admin", tokenAdmin, "docente", [false, true, true]],
      ["autor", e.tokenMaestro, "docente", [true, true, true]],
      ["otro maestro", e.tokenOtroMaestro, "docente", [false, false, true]],
      ["estudiante", e.tokenAlumno, "docente", [false, false, false]],
      ["admin", tokenAdmin, "aprendizaje", [true, true, true]],
      ["maestro", e.tokenMaestro, "aprendizaje", [false, false, false]],
      ["otro maestro", e.tokenOtroMaestro, "aprendizaje", [false, false, false]],
      ["estudiante", e.tokenAlumno, "aprendizaje", [false, false, false]],
    ]
    for (const [quien, token, bloque, banderas] of esperado) {
      expect(await permisos(token, bloque), `${quien} en ${bloque}`).toEqual(banderas)
    }
  })

  it("CL3-A10: los materiales con bloque nulo no salen en ningún bloque", async () => {
    const e = await escenario()
    await recurso(e, e.maestro.id)
    await recurso(e, adminId)
    expect(idsDe(await listar(e, "bloque=docente&tema=sin-tema"))).toEqual([])
    expect(idsDe(await listar(e, "bloque=aprendizaje&tema=sin-tema"))).toEqual([])
  })

  it("CL3-A10: bloque ausente, otro valor o repetido, y tema ausente, responden 400 VALIDACION", async () => {
    const e = await escenario()
    for (const consulta of [
      "tema=sin-tema",
      "bloque=otro&tema=sin-tema",
      "bloque=DOCENTE&tema=sin-tema",
      "bloque=docente&bloque=docente&tema=sin-tema",
      "bloque=docente",
    ]) {
      const respuesta = await pedir({
        method: "GET",
        url: urlRecursos(e.claseId, consulta),
        token: e.tokenMaestro,
      })
      expect(respuesta.statusCode, consulta).toBe(400)
      expect(codigoDe(respuesta), consulta).toBe("VALIDACION")
    }
  })

  it("CL3-A10: un tema de otra clase o inexistente responde 404 TEMA_NO_ENCONTRADO", async () => {
    const e = await escenario()
    const otra = await crearClaseDePrueba(idsClases, { maestroId: e.maestro.id })
    const ajeno = await crearTemaDePrueba({ claseId: otra.id, orden: 0 })
    for (const tema of [ajeno.id, randomUUID()]) {
      const respuesta = await pedir({
        method: "GET",
        url: urlRecursos(e.claseId, `bloque=docente&tema=${tema}`),
        token: e.tokenMaestro,
      })
      expect(respuesta.statusCode, tema).toBe(404)
      expect(codigoDe(respuesta), tema).toBe("TEMA_NO_ENCONTRADO")
    }
  })

  it("CL3-A10: un cursor de otro bloque, de otro tema, de otra clase o inexistente responde 400 con el mismo texto", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    await recurso(e, e.maestro.id, { bloque: "docente" })
    const deOtroBloque = await recurso(e, adminId, { bloque: "aprendizaje" })
    const deOtroTema = await recurso(e, e.maestro.id, { bloque: "docente", temaId: tema.id })
    const otra = await crearClaseDePrueba(idsClases, { maestroId: e.maestro.id })
    const deOtraClase = await crearMaterialConTemaDePrueba({
      claseId: otra.id,
      autorId: e.maestro.id,
      bloque: "docente",
    })
    const cuerpos: string[] = []
    for (const cursor of [deOtroBloque, deOtroTema, deOtraClase, randomUUID()]) {
      const respuesta = await pedir({
        method: "GET",
        url: urlRecursos(e.claseId, `bloque=docente&tema=sin-tema&cursor=${cursor}`),
        token: e.tokenMaestro,
      })
      expect(respuesta.statusCode, cursor).toBe(400)
      expect(mensajeDe(respuesta), cursor).toBe("cursor: no es válido")
      cuerpos.push(respuesta.body)
    }
    expect(new Set(cuerpos).size).toBe(1)
  })

  it("CL3-A10: un cursor que se borra entre su comprobación y la página no deja la página vacía (instantánea única)", async () => {
    const e = await escenario()
    const r1 = await recurso(e, e.maestro.id, { bloque: "docente", minuto: 3 })
    const r2 = await recurso(e, e.maestro.id, { bloque: "docente", minuto: 2 })
    const r3 = await recurso(e, e.maestro.id, { bloque: "docente", minuto: 1 })
    const actor = { id: e.maestro.id, rol: "maestro" as const }
    const parametros = {
      claseId: e.claseId,
      bloque: "docente" as const,
      tema: "sin-tema",
      cursor: r1,
      limite: 10,
      actor,
    }
    const previa = await listarRecursos(parametros)
    expect(idsDe(previa), "Precondición (control): sin carrera").toEqual([r2, r3])

    const { gancho, disparado } = unaVezDespuesDe("publicacion.findFirst", async () => {
      const { count } = await obtenerDb().publicacion.deleteMany({ where: { id: r1 } })
      expect(count, "Precondición: el gancho borró el recurso del cursor").toBe(1)
    })
    const { ejecutor } = ejecutorEspiado(gancho)
    const lista = await listarRecursos(parametros, ejecutor)
    expect(disparado(), "Precondición: el gancho corrió tras la comprobación del cursor").toBe(true)
    expect(idsDe(lista)).toEqual([r2, r3])
    expect(await obtenerDb().publicacion.count({ where: { id: r1 } })).toBe(0)
  }, 30_000)
})

describe("editar un recurso: versión (CL3-A13)", () => {
  // Retiene la fila de `publicaciones` con FOR UPDATE (choca con el FOR NO KEY UPDATE de
  // editarRecurso) y lanza las operaciones en orden fijo: cada una se da por formada solo cuando espera
  // esa fila (formadasDetrasDe, CHORE-02). La ayuda compartida conFilaRetenida no admite la tabla
  // `publicaciones`, así que el mismo método vive aquí. El timeout de la transacción (30 s) es mayor
  // que la espera más larga (10 s por operación).
  const conRecursoRetenido = async (
    recursoId: string,
    operaciones: readonly (() => Promise<LightMyRequestResponse>)[],
  ): Promise<LightMyRequestResponse[]> => {
    const lanzadas: Promise<LightMyRequestResponse>[] = []
    await obtenerDb().$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM publicaciones WHERE id = ${recursoId}::uuid FOR UPDATE`
        const [propio] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
        if (!propio)
          throw new Error("Precondición: no se obtuvo el pid de la transacción retenedora")
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
            `Precondición: la operación ${String(indice + 1)} no se formó detrás del recurso retenido en 10 s`,
          ).toBe(true)
        }
        await esperar(100)
      },
      { timeout: 30_000, maxWait: 5_000 },
    )
    return Promise.all(lanzadas)
  }

  it("CL3-A13: con una versión vieja responde 409 RECURSO_MODIFICADO sin escribir", async () => {
    const e = await escenario()
    const id = await recurso(e, e.maestro.id, { bloque: "docente" })
    const primera = await editar(e, id, cuerpoDeEdicion({ titulo: "Primero" }))
    expect(primera.statusCode, primera.body).toBe(200)
    expect(recursoRespuestaSchema.parse(primera.json()).recurso.version).toBe(1)
    const antes = { fila: await filaDe(id), archivos: await archivosDe(e.claseId) }
    const nuevo = await archivoSubido(e, e.maestro.id)

    const respuesta = await editar(
      e,
      id,
      cuerpoDeEdicion({ titulo: "Con la versión vieja", archivoIds: [nuevo.id] }),
    )

    expect(respuesta.statusCode).toBe(409)
    expect(codigoDe(respuesta)).toBe("RECURSO_MODIFICADO")
    expect(mensajeDe(respuesta)).toBe(
      "Otra persona guardó este recurso mientras lo editabas. Te mostramos la versión actual.",
    )
    expect(await filaDe(id)).toEqual(antes.fila)
    expect((await archivosDe(e.claseId)).filter((a) => a.id !== nuevo.id)).toEqual(antes.archivos)
    expect((await archivosDe(e.claseId)).find((a) => a.id === nuevo.id)?.estado).toBe("pendiente")
  })

  it(
    "CL3-A13: dos PUT simultáneos con la misma versión dan un 200 y un 409",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const id = await recurso(e, e.maestro.id, { bloque: "docente" })
      const respuestas = await conRecursoRetenido(id, [
        () => editar(e, id, cuerpoDeEdicion({ titulo: "Uno" })),
        () => editar(e, id, cuerpoDeEdicion({ titulo: "Dos" })),
      ])
      expect(respuestas.map((r) => r.statusCode).sort()).toEqual([200, 409])
      const fila = await filaDe(id)
      expect(fila?.version).toBe(1)
      const ganadora = respuestas.find((r) => r.statusCode === 200)
      if (ganadora === undefined) throw new Error("Precondición: una edición ganó")
      expect(fila?.titulo).toBe(recursoRespuestaSchema.parse(ganadora.json()).recurso.titulo)
    },
  )

  it("CL3-A13: tras mover el recurso de tema, el PUT con la versión anterior responde 409", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    const id = await recurso(e, e.maestro.id, { bloque: "docente" })
    const movido = await mover(e, id, tema.id, e.tokenOtroMaestro)
    expect(movido.statusCode, movido.body).toBe(200)
    expect((await filaDe(id))?.version).toBe(1)

    const respuesta = await editar(e, id, cuerpoDeEdicion({ temaId: tema.id, version: 0 }))

    expect(respuesta.statusCode).toBe(409)
    expect(codigoDe(respuesta)).toBe("RECURSO_MODIFICADO")
    expect(await filaDe(id)).toMatchObject({
      titulo: "Material de prueba",
      version: 1,
      temaId: tema.id,
    })
  })
})

describe("editar un recurso: contenido y archivos (CL3-A14)", () => {
  it("CL3-A14: cambia título, descripción (normalizada) y tema, y la versión sube 1", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad 3", orden: 0 })
    const id = await recurso(e, e.maestro.id, { bloque: "docente" })

    const respuesta = await editar(
      e,
      id,
      cuerpoDeEdicion({
        titulo: "  Título nuevo  ",
        texto: "  Línea 1\r\nLínea 2\rLínea 3  ",
        temaId: tema.id.toUpperCase(),
      }),
    )

    expect(respuesta.statusCode, respuesta.body).toBe(200)
    expect(recursoRespuestaSchema.parse(respuesta.json()).recurso).toMatchObject({
      titulo: "Título nuevo",
      texto: "Línea 1\nLínea 2\nLínea 3",
      version: 1,
      tema: { id: tema.id, nombre: "Unidad 3" },
    })
    expect(await filaDe(id)).toEqual({
      titulo: "Título nuevo",
      texto: "Línea 1\nLínea 2\nLínea 3",
      temaId: tema.id,
      version: 1,
      bloque: "docente",
    })
  })

  it("CL3-A14: un tema de otra clase o ya borrado responde 404 TEMA_NO_ENCONTRADO sin escribir", async () => {
    const e = await escenario()
    const id = await recurso(e, e.maestro.id, { bloque: "docente" })
    const otra = await crearClaseDePrueba(idsClases, { maestroId: e.maestro.id })
    const ajeno = await crearTemaDePrueba({ claseId: otra.id, orden: 0 })
    const borrado = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    await obtenerDb().tema.delete({ where: { id: borrado.id } })
    const antes = await filaDe(id)
    for (const temaId of [ajeno.id, borrado.id]) {
      const respuesta = await editar(e, id, cuerpoDeEdicion({ temaId }))
      expect(respuesta.statusCode, temaId).toBe(404)
      expect(codigoDe(respuesta), temaId).toBe("TEMA_NO_ENCONTRADO")
      expect(await filaDe(id), temaId).toEqual(antes)
    }
  })

  it("CL3-A14: archivos: conserva, quita (descartado sin publicación) y agrega (confirmado, comprobado en el almacén)", async () => {
    const e = await escenario()
    const id = await recurso(e, e.maestro.id, { bloque: "docente" })
    const queda = await crearArchivoDePrueba({
      claseId: e.claseId,
      subidoPor: e.maestro.id,
      estado: "confirmado",
      publicacionId: id,
    })
    const sale = await crearArchivoDePrueba({
      claseId: e.claseId,
      subidoPor: e.maestro.id,
      estado: "confirmado",
      publicacionId: id,
    })
    const nuevo = await archivoSubido(e, e.maestro.id, "nuevo.pdf")

    const respuesta = await editar(
      e,
      id,
      cuerpoDeEdicion({ archivoIds: [queda.id, nuevo.id.toUpperCase()] }),
    )

    expect(respuesta.statusCode, respuesta.body).toBe(200)
    const { recurso: editado } = recursoRespuestaSchema.parse(respuesta.json())
    expect(editado.adjuntos.map((a) => a.id).sort()).toEqual([queda.id, nuevo.id].sort())
    const porId = new Map((await archivosDe(e.claseId)).map((a) => [a.id, a]))
    expect(porId.get(queda.id)).toMatchObject({ estado: "confirmado", publicacionId: id })
    expect(porId.get(nuevo.id)).toMatchObject({ estado: "confirmado", publicacionId: id })
    expect(porId.get(sale.id)).toMatchObject({ estado: "descartado", publicacionId: null })
  })

  it("CL3-A14: un archivo ajeno o de otro recurso responde 400 ARCHIVO_INVALIDO sin escribir", async () => {
    const e = await escenario()
    const id = await recurso(e, e.maestro.id, { bloque: "docente" })
    const otro = await recurso(e, e.maestro.id, { bloque: "docente" })
    const deOtroRecurso = await crearArchivoDePrueba({
      claseId: e.claseId,
      subidoPor: e.maestro.id,
      estado: "confirmado",
      publicacionId: otro,
    })
    const deOtraPersona = await archivoSubido(e, e.otroMaestro.id)
    const propio = await archivoSubido(e, e.maestro.id)
    for (const ajeno of [deOtroRecurso.id, deOtraPersona.id]) {
      const antes = { fila: await filaDe(id), archivos: await archivosDe(e.claseId) }
      const respuesta = await editar(
        e,
        id,
        cuerpoDeEdicion({ titulo: "No debe quedar", archivoIds: [propio.id, ajeno] }),
      )
      expect(respuesta.statusCode, ajeno).toBe(400)
      expect(codigoDe(respuesta), ajeno).toBe("ARCHIVO_INVALIDO")
      expect({ fila: await filaDe(id), archivos: await archivosDe(e.claseId) }, ajeno).toEqual(
        antes,
      )
    }
  })

  it("CL3-A14: más de 5 archivos, título vacío, de invisibles o de 201, versión ausente o negativa y la clave temaId ausente responden 400 VALIDACION", async () => {
    const e = await escenario()
    const id = await recurso(e, e.maestro.id, { bloque: "docente" })
    const sinTemaId = cuerpoDeEdicion()
    delete sinTemaId.temaId
    const sinVersion = cuerpoDeEdicion()
    delete sinVersion.version
    const cuerpos: [string, Record<string, unknown>][] = [
      [
        "seis archivos",
        cuerpoDeEdicion({ archivoIds: Array.from({ length: 6 }, () => randomUUID()) }),
      ],
      ["título vacío", cuerpoDeEdicion({ titulo: "" })],
      ["título de invisibles", cuerpoDeEdicion({ titulo: "​⠀ ‍" })],
      ["título de 201", cuerpoDeEdicion({ titulo: "a".repeat(201) })],
      ["sin versión", sinVersion],
      ["versión negativa", cuerpoDeEdicion({ version: -1 })],
      ["sin temaId", sinTemaId],
    ]
    const antes = await filaDe(id)
    for (const [caso, cuerpo] of cuerpos) {
      const respuesta = await editar(e, id, cuerpo)
      expect(respuesta.statusCode, caso).toBe(400)
      expect(codigoDe(respuesta), caso).toBe("VALIDACION")
    }
    expect(await filaDe(id)).toEqual(antes)
    const conDoscientos = await editar(e, id, cuerpoDeEdicion({ titulo: "a".repeat(200) }))
    expect(conDoscientos.statusCode, conDoscientos.body).toBe(200)
  })
})

describe("borrar un recurso por la ruta de hoy (CL3-A15)", () => {
  const borrar = (e: Escenario, id: string, token: string) =>
    pedir({ method: "DELETE", url: `${urlPublicaciones(e.claseId)}/${id}`, token })

  const existe = async (id: string): Promise<boolean> =>
    (await obtenerDb().publicacion.count({ where: { id } })) === 1

  it("CL3-A15: el admin borra cualquiera y el autor maestro el suyo del docente", async () => {
    const e = await escenario()
    const delMaestro = await recurso(e, e.maestro.id, { bloque: "docente" })
    const otroDelMaestro = await recurso(e, e.maestro.id, { bloque: "docente" })
    const delAdmin = await recurso(e, adminId, { bloque: "aprendizaje" })
    for (const [id, token] of [
      [delMaestro, tokenAdmin],
      [delAdmin, tokenAdmin],
      [otroDelMaestro, e.tokenMaestro],
    ] as const) {
      const respuesta = await borrar(e, id, token)
      expect(respuesta.statusCode, respuesta.body).toBe(204)
      expect(await existe(id)).toBe(false)
    }
  })

  it("CL3-A15: un maestro sobre el de otro maestro o uno de aprendizaje (con bloque o nulo del admin) recibe 403 BORRADO_NO_PERMITIDO sin borrar", async () => {
    const e = await escenario()
    const delMaestro = await recurso(e, e.maestro.id, { bloque: "docente" })
    const delAdmin = await recurso(e, adminId, { bloque: "aprendizaje" })
    const nuloDelAdmin = await recurso(e, adminId)
    for (const [caso, id, token] of [
      ["otro maestro sobre docente", delMaestro, e.tokenOtroMaestro],
      ["autor maestro sobre aprendizaje", delAdmin, e.tokenMaestro],
      ["maestro sobre nulo del admin", nuloDelAdmin, e.tokenMaestro],
    ] as const) {
      const respuesta = await borrar(e, id, token)
      expect(respuesta.statusCode, caso).toBe(403)
      expect(codigoDe(respuesta), caso).toBe("BORRADO_NO_PERMITIDO")
      expect(await existe(id), caso).toBe(true)
    }
  })

  it("CL3-A15: un anuncio sigue la regla de hoy (otro maestro no; el admin sí)", async () => {
    const e = await escenario()
    const anuncio = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const negado = await borrar(e, anuncio, e.tokenOtroMaestro)
    expect(negado.statusCode).toBe(403)
    expect(codigoDe(negado)).toBe("BORRADO_NO_PERMITIDO")
    expect(await existe(anuncio)).toBe(true)
    const borrado = await borrar(e, anuncio, tokenAdmin)
    expect(borrado.statusCode).toBe(204)
    expect(await existe(anuncio)).toBe(false)
  })
})

describe("mover un recurso por la ruta de hoy (CL3-A16)", () => {
  it("CL3-A16: un maestro sobre un recurso de aprendizaje recibe 403 MOVER_NO_PERMITIDO sin cambiar el tema ni la versión", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    const delAdmin = await recurso(e, adminId, { bloque: "aprendizaje" })
    const nuloDelAdmin = await recurso(e, adminId)
    for (const id of [delAdmin, nuloDelAdmin]) {
      const respuesta = await mover(e, id, tema.id, e.tokenMaestro)
      expect(respuesta.statusCode, id).toBe(403)
      expect(codigoDe(respuesta), id).toBe("MOVER_NO_PERMITIDO")
      expect(mensajeDe(respuesta), id).toBe(
        "Solo la administración mueve los recursos de aprendizaje.",
      )
      expect(await filaDe(id), id).toMatchObject({ temaId: null, version: 0 })
    }
  })

  it("CL3-A16: el admin mueve uno de aprendizaje y otro maestro mueve el del docente de un maestro; la versión sube 1", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    const delAdmin = await recurso(e, adminId, { bloque: "aprendizaje" })
    const delMaestro = await recurso(e, e.maestro.id, { bloque: "docente" })
    for (const [id, token] of [
      [delAdmin, tokenAdmin],
      [delMaestro, e.tokenOtroMaestro],
    ] as const) {
      const respuesta = await mover(e, id, tema.id, token)
      expect(respuesta.statusCode, respuesta.body).toBe(200)
      expect(await filaDe(id), id).toMatchObject({ temaId: tema.id, version: 1 })
    }
    const deVuelta = await mover(e, delMaestro, null, tokenAdmin)
    expect(deVuelta.statusCode, deVuelta.body).toBe(200)
    expect(await filaDe(delMaestro)).toMatchObject({ temaId: null, version: 2 })
  })

  it("CL3-A16: una tarea sube tareas.version y no publicaciones.version; un anuncio responde 409 ANUNCIO_SIN_TEMA", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    const tarea = await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const respuesta = await mover(e, tarea, tema.id, e.tokenOtroMaestro)
    expect(respuesta.statusCode, respuesta.body).toBe(200)
    expect(await filaDe(tarea)).toMatchObject({ temaId: tema.id, version: 0 })
    const fila = await obtenerDb().tarea.findUnique({
      where: { id: tarea },
      select: { version: true },
    })
    expect(fila?.version).toBe(1)

    const anuncio = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const negado = await mover(e, anuncio, tema.id, e.tokenMaestro)
    expect(negado.statusCode).toBe(409)
    expect(codigoDe(negado)).toBe("ANUNCIO_SIN_TEMA")
  })
})

describe("comentarios de un recurso (CL3-A17)", () => {
  it("CL3-A17: en un recurso de cada bloque se listan, se comentan y se borran comentarios", async () => {
    const e = await escenario()
    const docente = await recurso(e, e.maestro.id, { bloque: "docente" })
    const aprendizaje = await recurso(e, adminId, { bloque: "aprendizaje" })
    for (const id of [docente, aprendizaje]) {
      const url = `${urlPublicaciones(e.claseId)}/${id}/comentarios`
      const creado = await pedir({
        method: "POST",
        url,
        token: e.tokenAlumno,
        payload: { texto: "Una pregunta" },
      })
      expect(creado.statusCode, creado.body).toBe(201)
      const lista = await pedir({ method: "GET", url, token: e.tokenMaestro })
      expect(lista.statusCode, lista.body).toBe(200)
      const { comentarios } = listaComentariosRespuestaSchema.parse(lista.json())
      expect(comentarios.map((c) => c.texto)).toEqual(["Una pregunta"])
      const comentarioId = comentarios[0]?.id ?? ""
      const borrado = await pedir({
        method: "DELETE",
        url: `${url}/${comentarioId}`,
        token: e.tokenAlumno,
      })
      expect(borrado.statusCode, borrado.body).toBe(204)
      expect(await obtenerDb().comentario.count({ where: { publicacionId: id } })).toBe(0)
    }
  })
})
