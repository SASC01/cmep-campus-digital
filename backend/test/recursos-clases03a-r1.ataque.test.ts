import { randomUUID } from "node:crypto"

import {
  errorApiSchema,
  listaPublicacionesRespuestaSchema,
  listaRecursosRespuestaSchema,
  listaTemasRespuestaSchema,
  listaTrabajoRespuestaSchema,
  recursoRespuestaSchema,
} from "@campus/shared"
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

// Ataque del Tester, CLASES-03a, ronda 1 ("Puntos de ataque para el Tester › 03a" del plan):
// carreras de editar un recurso contra borrarlo, moverlo y comentarlo; permisos por bloque con datos
// raros (bloque nulo, maestro retirado); archivos al editar; filtros nuevos (?tipo=anuncio,
// ?seccion=actividades, ?seccion= de temas) recorridos página por página; y la bandera puedeMover de
// "Trabajo de clase" frente a la regla nueva de mover. Ninguna prueba compara fechas relativas al
// reloj: las fechas de orden son instantes fijos.

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

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

const resultado = (respuesta: LightMyRequestResponse): string =>
  respuesta.statusCode < 300
    ? String(respuesta.statusCode)
    : `${String(respuesta.statusCode)} ${codigoDe(respuesta)}`

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

const instante = (minuto: number): Date => new Date(Date.UTC(2026, 9, 1, 12, minuto))
const FECHA_LIMITE = new Date("2030-01-15T12:00:00.000Z")

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
  const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Maestra A" })
  const otroMaestro = await crearUsuarioDePrueba(idsUsuarios, {
    rol: "maestro",
    nombre: "Maestro B",
  })
  const alumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumna C" })
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

const urlRecurso = (claseId: string, id: string): string => `/api/clases/${claseId}/recursos/${id}`
const urlPublicacion = (claseId: string, id: string): string =>
  `/api/clases/${claseId}/publicaciones/${id}`

const recurso = (
  e: Escenario,
  autorId: string,
  opciones: { bloque?: "aprendizaje" | "docente"; minuto?: number; temaId?: string | null } = {},
): Promise<string> =>
  crearMaterialConTemaDePrueba({
    claseId: e.claseId,
    autorId,
    temaId: opciones.temaId ?? null,
    ...(opciones.bloque === undefined ? {} : { bloque: opciones.bloque }),
    ...(opciones.minuto === undefined ? {} : { creadoEn: instante(opciones.minuto) }),
  })

const cuerpo = (cambios: Record<string, unknown> = {}): Record<string, unknown> => ({
  titulo: "Editado en el ataque",
  texto: "",
  temaId: null,
  archivoIds: [],
  version: 0,
  ...cambios,
})

const editar = (e: Escenario, id: string, datos: Record<string, unknown>, token: string) =>
  pedir({ method: "PUT", url: urlRecurso(e.claseId, id), token, payload: datos })

const borrar = (e: Escenario, id: string, token: string) =>
  pedir({ method: "DELETE", url: urlPublicacion(e.claseId, id), token })

const mover = (e: Escenario, id: string, temaId: string | null, token: string) =>
  pedir({ method: "PUT", url: `${urlPublicacion(e.claseId, id)}/tema`, token, payload: { temaId } })

const comentar = (e: Escenario, id: string, token: string) =>
  pedir({
    method: "POST",
    url: `${urlPublicacion(e.claseId, id)}/comentarios`,
    token,
    payload: { texto: "Comentario durante la edición" },
  })

const filaDe = (id: string) =>
  obtenerDb().publicacion.findUnique({
    where: { id },
    select: { titulo: true, temaId: true, version: true, bloque: true },
  })

const archivosDe = (claseId: string) =>
  obtenerDb().archivo.findMany({
    where: { claseId },
    orderBy: { id: "asc" },
    select: { id: true, estado: true, publicacionId: true },
  })

// Un archivo confirmado en el recurso (como si se hubiera publicado con él).
const adjuntoConfirmado = (e: Escenario, publicacionId: string, subidoPor: string) =>
  crearArchivoDePrueba({ claseId: e.claseId, subidoPor, estado: "confirmado", publicacionId })

// Un archivo pendiente del usuario con su objeto ya "subido" al almacén doble.
const archivoSubido = async (claseId: string, subidoPor: string) => {
  const archivo = await crearArchivoDePrueba({ claseId, subidoPor })
  almacen.subir(archivo.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
  return archivo
}

// Retiene la fila del recurso con FOR UPDATE (método de CHORE-02: cada operación se lanza cuando la
// anterior ya espera esa fila, con formadasDetrasDe y el pid propio) y la suelta al final. timeout
// explícito mayor que la espera más larga (10 s por operación).
const conRecursoRetenido = async (
  recursoId: string,
  operaciones: readonly (() => Promise<LightMyRequestResponse>)[],
): Promise<LightMyRequestResponse[]> => {
  const lanzadas: Promise<LightMyRequestResponse>[] = []
  await obtenerDb().$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM publicaciones WHERE id = ${recursoId}::uuid FOR UPDATE`
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
          `Precondición: la operación ${String(indice + 1)} no se formó detrás del recurso retenido`,
        ).toBe(true)
      }
      await esperar(100)
    },
    { timeout: 30_000, maxWait: 5_000 },
  )
  return Promise.all(lanzadas)
}

describe("ataque CLASES-03a r1: editar un recurso contra borrarlo (S-05 y bloqueos de «Acceso a datos»)", () => {
  it(
    "CL3a-r1-01: la edición que quita un adjunto y el borrado del recurso, formados en ese orden, quedan en serie: la edición responde 200 y el borrado 204 (ni 500 ni deadlock)",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const id = await recurso(e, e.maestro.id, { bloque: "docente" })
      const adjunto = await adjuntoConfirmado(e, id, e.maestro.id)
      const respuestas = await conRecursoRetenido(id, [
        () => editar(e, id, cuerpo({ archivoIds: [] }), e.tokenMaestro),
        () => borrar(e, id, tokenAdmin),
      ])
      expect(respuestas.map(resultado)).toEqual(["200", "204"])
      expect(await filaDe(id)).toBeNull()
      expect(await archivosDe(e.claseId)).toEqual([
        { id: adjunto.id, estado: "descartado", publicacionId: null },
      ])
    },
  )

  it(
    "CL3a-r1-02: la edición que agrega un adjunto y el borrado del recurso, formados en ese orden, quedan en serie: la edición responde 200 y el borrado 204 (ni 500 ni el recurso a medio borrar)",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const id = await recurso(e, e.maestro.id, { bloque: "docente" })
      const adjunto = await adjuntoConfirmado(e, id, e.maestro.id)
      const nuevo = await archivoSubido(e.claseId, e.maestro.id)
      const respuestas = await conRecursoRetenido(id, [
        () => editar(e, id, cuerpo({ archivoIds: [adjunto.id, nuevo.id] }), e.tokenMaestro),
        () => borrar(e, id, tokenAdmin),
      ])
      expect(respuestas.map(resultado)).toEqual(["200", "204"])
      expect(await filaDe(id)).toBeNull()
      expect((await archivosDe(e.claseId)).map(({ estado }) => estado)).toEqual([
        "descartado",
        "descartado",
      ])
    },
  )

  it(
    "CL3a-r1-03: control: la edición que conserva sus adjuntos y el borrado, formados en ese orden, dan 200 y 204",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const id = await recurso(e, e.maestro.id, { bloque: "docente" })
      const adjunto = await adjuntoConfirmado(e, id, e.maestro.id)
      const respuestas = await conRecursoRetenido(id, [
        () => editar(e, id, cuerpo({ archivoIds: [adjunto.id] }), e.tokenMaestro),
        () => borrar(e, id, tokenAdmin),
      ])
      expect(respuestas.map(resultado)).toEqual(["200", "204"])
      expect(await filaDe(id)).toBeNull()
    },
  )

  it(
    "CL3a-r1-04: el borrado formado antes que la edición: 204 y la edición 404 RECURSO_NO_ENCONTRADO",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const id = await recurso(e, e.maestro.id, { bloque: "docente" })
      await adjuntoConfirmado(e, id, e.maestro.id)
      const respuestas = await conRecursoRetenido(id, [
        () => borrar(e, id, tokenAdmin),
        () => editar(e, id, cuerpo({ archivoIds: [] }), e.tokenMaestro),
      ])
      expect(respuestas.map(resultado)).toEqual(["204", "404 RECURSO_NO_ENCONTRADO"])
    },
  )
})

describe("ataque CLASES-03a r1: editar contra mover y comentar; la versión que sube al mover", () => {
  it(
    "CL3a-r1-05: mover formado antes que editar con la versión 0: mover 200 y editar 409 RECURSO_MODIFICADO; la versión queda en 1 y el tema en el del movimiento",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
      const id = await recurso(e, e.maestro.id, { bloque: "docente" })
      const respuestas = await conRecursoRetenido(id, [
        () => mover(e, id, tema.id, e.tokenOtroMaestro),
        () => editar(e, id, cuerpo({ titulo: "Perdedora" }), e.tokenMaestro),
      ])
      expect(respuestas.map(resultado)).toEqual(["200", "409 RECURSO_MODIFICADO"])
      expect(await filaDe(id)).toMatchObject({ version: 1, temaId: tema.id })
    },
  )

  it(
    "CL3a-r1-06: editar formado antes que mover: los dos 200 y la versión sube dos veces; el tema final es el del movimiento",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
      const id = await recurso(e, e.maestro.id, { bloque: "docente" })
      const respuestas = await conRecursoRetenido(id, [
        () => editar(e, id, cuerpo({ titulo: "Primera" }), e.tokenMaestro),
        () => mover(e, id, tema.id, tokenAdmin),
      ])
      expect(respuestas.map(resultado)).toEqual(["200", "200"])
      expect(await filaDe(id)).toMatchObject({ version: 2, temaId: tema.id, titulo: "Primera" })
    },
  )

  it(
    "CL3a-r1-07: comentar mientras se edita: los dos responden su éxito y el comentario queda en el recurso",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const id = await recurso(e, e.maestro.id, { bloque: "docente" })
      const respuestas = await conRecursoRetenido(id, [
        () => editar(e, id, cuerpo(), e.tokenMaestro),
        () => comentar(e, id, e.tokenAlumno),
      ])
      expect(respuestas.map(resultado)).toEqual(["200", "201"])
      expect(await obtenerDb().comentario.count({ where: { publicacionId: id } })).toBe(1)
    },
  )

  it("CL3a-r1-08: mover un recurso a su mismo tema o a «Sin tema» sube la versión cada vez y un formulario abierto antes recibe 409", async () => {
    const e = await escenario()
    const id = await recurso(e, e.maestro.id, { bloque: "docente" })
    expect(resultado(await mover(e, id, null, e.tokenMaestro))).toBe("200")
    expect(resultado(await mover(e, id, null, e.tokenOtroMaestro))).toBe("200")
    expect((await filaDe(id))?.version).toBe(2)
    expect(resultado(await editar(e, id, cuerpo({ version: 1 }), e.tokenMaestro))).toBe(
      "409 RECURSO_MODIFICADO",
    )
  })
})

describe("ataque CLASES-03a r1: permisos por bloque con datos raros (DH-02 a, RN-07, S-02, S-03)", () => {
  it("CL3a-r1-09: un material del admin con bloque nulo es de aprendizaje: el maestro no lo edita, no lo mueve ni lo borra; el admin lo edita; la lista no lo muestra", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    const id = await recurso(e, adminId)
    expect((await filaDe(id))?.bloque, "Precondición: bloque nulo").toBeNull()

    const detalle = await pedir({
      method: "GET",
      url: urlRecurso(e.claseId, id),
      token: e.tokenMaestro,
    })
    expect(detalle.statusCode, detalle.body).toBe(200)
    expect(recursoRespuestaSchema.parse(detalle.json()).recurso).toMatchObject({
      bloque: "aprendizaje",
      puedeEditar: false,
      puedeBorrar: false,
      puedeMover: false,
    })
    expect([
      resultado(await editar(e, id, cuerpo(), e.tokenMaestro)),
      resultado(await mover(e, id, tema.id, e.tokenMaestro)),
      resultado(await borrar(e, id, e.tokenMaestro)),
    ]).toEqual(["403 EDICION_NO_PERMITIDA", "403 MOVER_NO_PERMITIDO", "403 BORRADO_NO_PERMITIDO"])
    expect(await filaDe(id)).toMatchObject({ version: 0, temaId: null })

    expect(resultado(await editar(e, id, cuerpo(), tokenAdmin))).toBe("200")
    for (const bloque of ["aprendizaje", "docente"]) {
      const lista = await pedir({
        method: "GET",
        url: `/api/clases/${e.claseId}/recursos?bloque=${bloque}&tema=sin-tema`,
        token: tokenAdmin,
      })
      expect(listaRecursosRespuestaSchema.parse(lista.json()).recursos.map((r) => r.id)).toEqual([])
    }
  })

  it("CL3a-r1-10: un material de un maestro con bloque nulo es del docente: su autor lo edita, otro maestro solo lo mueve y el admin solo lo borra", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    const id = await recurso(e, e.maestro.id)
    expect([
      resultado(await editar(e, id, cuerpo(), e.tokenOtroMaestro)),
      resultado(await editar(e, id, cuerpo(), tokenAdmin)),
      resultado(await borrar(e, id, e.tokenOtroMaestro)),
    ]).toEqual(["403 EDICION_NO_PERMITIDA", "403 EDICION_NO_PERMITIDA", "403 BORRADO_NO_PERMITIDO"])
    expect(resultado(await mover(e, id, tema.id, e.tokenOtroMaestro))).toBe("200")
    expect(
      resultado(await editar(e, id, cuerpo({ version: 1, temaId: tema.id }), e.tokenMaestro)),
    ).toBe("200")
    expect(resultado(await borrar(e, id, tokenAdmin))).toBe("204")
  })

  it("CL3a-r1-11: el recurso del docente de un maestro retirado: el otro maestro no lo edita ni lo borra pero sí lo mueve; el admin no lo edita pero sí lo borra; el retirado ya no entra", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    const id = await recurso(e, e.otroMaestro.id, { bloque: "docente" })
    await obtenerDb().maestroDeClase.delete({
      where: { claseId_maestroId: { claseId: e.claseId, maestroId: e.otroMaestro.id } },
    })

    const lista = await pedir({
      method: "GET",
      url: `/api/clases/${e.claseId}/recursos?bloque=docente&tema=sin-tema`,
      token: e.tokenMaestro,
    })
    expect(listaRecursosRespuestaSchema.parse(lista.json()).recursos).toMatchObject([
      { id, puedeEditar: false, puedeBorrar: false, puedeMover: true },
    ])
    expect([
      resultado(await editar(e, id, cuerpo(), e.tokenOtroMaestro)),
      resultado(await editar(e, id, cuerpo(), e.tokenMaestro)),
      resultado(await borrar(e, id, e.tokenMaestro)),
      resultado(await editar(e, id, cuerpo(), tokenAdmin)),
    ]).toEqual([
      "403 SIN_ACCESO_A_LA_CLASE",
      "403 EDICION_NO_PERMITIDA",
      "403 BORRADO_NO_PERMITIDO",
      "403 EDICION_NO_PERMITIDA",
    ])
    expect(resultado(await mover(e, id, tema.id, e.tokenMaestro))).toBe("200")
    expect(resultado(await borrar(e, id, tokenAdmin))).toBe("204")
  })

  it("CL3a-r1-12: «Trabajo de clase» (sin sección, DH-02 b) no ofrece mover al maestro un recurso de aprendizaje que la ruta de mover le niega", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    const id = await recurso(e, adminId, { bloque: "aprendizaje" })
    const trabajo = await pedir({
      method: "GET",
      url: `/api/clases/${e.claseId}/trabajo?tema=sin-tema`,
      token: e.tokenMaestro,
    })
    expect(trabajo.statusCode, trabajo.body).toBe(200)
    const elemento = listaTrabajoRespuestaSchema
      .parse(trabajo.json())
      .elementos.find((el) => el.id === id)
    expect(elemento, "Precondición: el recurso sale en «Trabajo de clase»").toBeDefined()
    const movido = await mover(e, id, tema.id, e.tokenMaestro)
    expect({ puedeMover: elemento?.puedeMover, mover: resultado(movido) }).toEqual({
      puedeMover: false,
      mover: "403 MOVER_NO_PERMITIDO",
    })
  })
})

describe("ataque CLASES-03a r1: archivos al editar (§D-3.7, paso 6)", () => {
  const sinCambios = async (e: Escenario, id: string, cambio: () => Promise<string>) => {
    const antes = { fila: await filaDe(id), archivos: await archivosDe(e.claseId) }
    const obtenido = await cambio()
    expect({ fila: await filaDe(id), archivos: await archivosDe(e.claseId) }).toEqual(antes)
    return obtenido
  }

  it("CL3a-r1-13: el adjunto de otro recurso, de una tarea, de una entrega, uno descartado, uno pendiente de otro usuario o de otra clase: 400 sin escribir nada", async () => {
    const e = await escenario()
    const id = await recurso(e, e.maestro.id, { bloque: "docente" })
    const otro = await recurso(e, e.maestro.id, { bloque: "docente" })
    const tarea = await crearTareaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      fechaLimite: FECHA_LIMITE,
    })
    const otraClase = await crearClaseDePrueba(idsClases, { maestroId: e.maestro.id })
    const deOtroRecurso = await adjuntoConfirmado(e, otro, e.maestro.id)
    const deLaTarea = await adjuntoConfirmado(e, tarea, e.maestro.id)
    const descartado = await crearArchivoDePrueba({
      claseId: e.claseId,
      subidoPor: e.maestro.id,
      estado: "descartado",
    })
    almacen.subir(descartado.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
    const deOtroUsuario = await archivoSubido(e.claseId, e.otroMaestro.id)
    const deOtraClase = await archivoSubido(otraClase.id, e.maestro.id)
    const idDeEntrega = randomUUID()
    const claveDeEntrega = `entregas/${tarea}/${e.maestro.id}/${idDeEntrega}`
    await obtenerDb().archivo.create({
      data: {
        id: idDeEntrega,
        claveObjeto: claveDeEntrega,
        claseId: e.claseId,
        subidoPor: e.maestro.id,
        estado: "pendiente",
        nombre: "entrega.pdf",
        tipo: "application/pdf",
        tamano: 1000,
      },
    })
    almacen.subir(claveDeEntrega, { tamano: 1000, tipo: "application/pdf" })

    const fallas: string[] = []
    for (const [nombre, archivoId] of [
      ["de otro recurso", deOtroRecurso.id],
      ["de una tarea", deLaTarea.id],
      ["de una entrega", idDeEntrega],
      ["descartado", descartado.id],
      ["pendiente de otro usuario", deOtroUsuario.id],
      ["pendiente de otra clase", deOtraClase.id],
    ] as const) {
      const obtenido = await sinCambios(e, id, async () =>
        resultado(await editar(e, id, cuerpo({ archivoIds: [archivoId] }), e.tokenMaestro)),
      )
      if (obtenido !== "400 ARCHIVO_INVALIDO") fallas.push(`${nombre}: ${obtenido}`)
    }
    expect(fallas).toEqual([])
  })

  it("CL3a-r1-14: un adjunto nuevo repetido (igual o con otra capitalización) responde 400 sin escribir; uno nuevo en mayúsculas se confirma", async () => {
    const e = await escenario()
    const id = await recurso(e, e.maestro.id, { bloque: "docente" })
    const nuevo = await archivoSubido(e.claseId, e.maestro.id)
    expect(
      await sinCambios(e, id, async () =>
        resultado(
          await editar(e, id, cuerpo({ archivoIds: [nuevo.id, nuevo.id] }), e.tokenMaestro),
        ),
      ),
    ).toBe("400 VALIDACION")
    expect(
      await sinCambios(e, id, async () =>
        resultado(
          await editar(
            e,
            id,
            cuerpo({ archivoIds: [nuevo.id, nuevo.id.toUpperCase()] }),
            e.tokenMaestro,
          ),
        ),
      ),
    ).toMatch(/^400 /)
    expect(
      resultado(
        await editar(e, id, cuerpo({ archivoIds: [nuevo.id.toUpperCase()] }), e.tokenMaestro),
      ),
    ).toBe("200")
    expect(await archivosDe(e.claseId)).toEqual([
      { id: nuevo.id, estado: "confirmado", publicacionId: id },
    ])
  })

  it("CL3a-r1-15: un adjunto que ya tiene, repetido con otra capitalización, responde 400 VALIDACION «No repitas un archivo adjunto» como cualquier otro repetido", async () => {
    const e = await escenario()
    const id = await recurso(e, e.maestro.id, { bloque: "docente" })
    const adjunto = await adjuntoConfirmado(e, id, e.maestro.id)
    const igual = await editar(
      e,
      id,
      cuerpo({ archivoIds: [adjunto.id, adjunto.id] }),
      e.tokenMaestro,
    )
    const otraCapitalizacion = await editar(
      e,
      id,
      cuerpo({ archivoIds: [adjunto.id, adjunto.id.toUpperCase()] }),
      e.tokenMaestro,
    )
    expect([resultado(igual), resultado(otraCapitalizacion)]).toEqual([
      "400 VALIDACION",
      "400 VALIDACION",
    ])
    expect((await filaDe(id))?.version).toBe(0)
  })
})

describe("ataque CLASES-03a r1: filtros nuevos recorridos página por página (§D-3.2 a §D-3.5)", () => {
  // Una clase con anuncios, materiales de los dos bloques, uno con bloque nulo y tareas, en uno y
  // otro tema, con fechas de creación fijas e intercaladas.
  const claseMezclada = async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    const anuncios: string[] = []
    const materiales: string[] = []
    for (let i = 0; i < 3; i += 1) {
      anuncios.push(
        await crearPublicacionDePrueba({
          claseId: e.claseId,
          autorId: i === 0 ? adminId : e.maestro.id,
          creadoEn: instante(10 * i),
        }),
      )
      materiales.push(
        await recurso(e, adminId, { bloque: "aprendizaje", minuto: 10 * i + 1 }),
        await recurso(e, e.maestro.id, { bloque: "docente", minuto: 10 * i + 2, temaId: tema.id }),
        await recurso(e, e.otroMaestro.id, { bloque: "docente", minuto: 10 * i + 3 }),
      )
    }
    const sinBloque = await recurso(e, e.maestro.id, { minuto: 50 })
    const tareas = [
      await crearTareaDePrueba({
        claseId: e.claseId,
        autorId: e.maestro.id,
        fechaLimite: FECHA_LIMITE,
      }),
      await crearTareaDePrueba({
        claseId: e.claseId,
        autorId: adminId,
        temaId: tema.id,
        fechaLimite: FECHA_LIMITE,
      }),
    ]
    return { e, tema, anuncios, materiales, sinBloque, tareas }
  }

  it("CL3a-r1-16: ?tipo=anuncio con limite=1 y cursores sucesivos solo devuelve anuncios, todos y una vez; un cursor que es material, tarea o anuncio de otra clase responde 400", async () => {
    const m = await claseMezclada()
    const vistos: string[] = []
    const tipos = new Set<string>()
    let cursor: string | null = null
    for (let pagina = 0; pagina < 10 && (pagina === 0 || cursor !== null); pagina += 1) {
      const consulta: string =
        cursor === null ? "limite=1" : `limite=1&cursor=${cursor.toUpperCase()}`
      const r = await pedir({
        method: "GET",
        url: `/api/clases/${m.e.claseId}/publicaciones?tipo=anuncio&${consulta}`,
        token: m.e.tokenAlumno,
      })
      expect(r.statusCode, r.body).toBe(200)
      const lista = listaPublicacionesRespuestaSchema.parse(r.json())
      for (const p of lista.publicaciones) {
        vistos.push(p.id)
        tipos.add(p.tipo)
      }
      cursor = lista.siguienteCursor
    }
    expect([...tipos]).toEqual(["anuncio"])
    expect([...vistos].sort()).toEqual([...m.anuncios].sort())

    const otra = await escenario()
    const anuncioAjeno = await crearPublicacionDePrueba({
      claseId: otra.claseId,
      autorId: otra.maestro.id,
    })
    const fallas: string[] = []
    for (const id of [m.materiales[0] ?? "", m.tareas[0] ?? "", m.sinBloque, anuncioAjeno]) {
      const r = await pedir({
        method: "GET",
        url: `/api/clases/${m.e.claseId}/publicaciones?tipo=anuncio&cursor=${id}`,
        token: m.e.tokenAlumno,
      })
      if (resultado(r) !== "400 VALIDACION") fallas.push(`${id}: ${resultado(r)}`)
    }
    expect(fallas).toEqual([])
  })

  it("CL3a-r1-17: ?seccion=actividades con limite=1 en cada tema solo devuelve tareas, todas; un material como cursor responde 400", async () => {
    const m = await claseMezclada()
    const vistos: string[] = []
    const tipos = new Set<string>()
    for (const tema of ["sin-tema", m.tema.id]) {
      let cursor: string | null = null
      for (let pagina = 0; pagina < 10 && (pagina === 0 || cursor !== null); pagina += 1) {
        const consulta: string = cursor === null ? "limite=1" : `limite=1&cursor=${cursor}`
        const r = await pedir({
          method: "GET",
          url: `/api/clases/${m.e.claseId}/trabajo?seccion=actividades&tema=${tema}&${consulta}`,
          token: m.e.tokenAlumno,
        })
        expect(r.statusCode, r.body).toBe(200)
        const lista = listaTrabajoRespuestaSchema.parse(r.json())
        for (const el of lista.elementos) {
          vistos.push(el.id)
          tipos.add(el.tipo)
        }
        cursor = lista.siguienteCursor
      }
    }
    expect([...tipos]).toEqual(["tarea"])
    expect([...vistos].sort()).toEqual([...m.tareas].sort())
    const conMaterial = await pedir({
      method: "GET",
      url: `/api/clases/${m.e.claseId}/trabajo?seccion=actividades&tema=sin-tema&cursor=${m.sinBloque}`,
      token: m.e.tokenAlumno,
    })
    expect(resultado(conMaterial)).toBe("400 VALIDACION")
  })

  it("CL3a-r1-18: los conteos de las tres secciones más los materiales sin bloque suman el total, tema por tema y en «Sin tema»", async () => {
    const m = await claseMezclada()
    const temas = async (consulta: string) => {
      const r = await pedir({
        method: "GET",
        url: `/api/clases/${m.e.claseId}/temas${consulta}`,
        token: m.e.tokenAlumno,
      })
      expect(r.statusCode, r.body).toBe(200)
      return listaTemasRespuestaSchema.parse(r.json())
    }
    const total = await temas("")
    const secciones = await Promise.all(
      ["actividades", "aprendizaje", "docente"].map((s) => temas(`?seccion=${s}`)),
    )
    const suma = (clave: (l: typeof total) => number) =>
      secciones.reduce((acumulado, lista) => acumulado + clave(lista), 0)
    const delTema = (l: typeof total) => l.temas.find((t) => t.id === m.tema.id)?.elementos ?? -1
    expect({
      sinTema: suma((l) => l.sinTema) + 1,
      tema: suma(delTema),
    }).toEqual({ sinTema: total.sinTema, tema: delTema(total) })
    expect({ sinTema: total.sinTema, tema: delTema(total) }).toEqual({ sinTema: 8, tema: 4 })
  })

  it("CL3a-r1-19: un cursor de recursos de otro bloque, de otro tema, de un anuncio, de una tarea, sin bloque o de otra clase responde 400 con el mismo texto; ?bloque= repetido o en mayúsculas responde 400", async () => {
    const m = await claseMezclada()
    const otra = await escenario()
    const ajeno = await recurso(otra, otra.maestro.id, { bloque: "docente" })
    const [aprendizaje, docenteConTema] = m.materiales
    const mensajes = new Set<string>()
    const fallas: string[] = []
    for (const [nombre, cursor] of [
      ["de otro bloque", aprendizaje ?? ""],
      ["de otro tema", docenteConTema ?? ""],
      ["anuncio", m.anuncios[0] ?? ""],
      ["tarea", m.tareas[0] ?? ""],
      ["sin bloque", m.sinBloque],
      ["de otra clase", ajeno],
      ["inexistente", randomUUID()],
    ] as const) {
      const r = await pedir({
        method: "GET",
        url: `/api/clases/${m.e.claseId}/recursos?bloque=docente&tema=sin-tema&cursor=${cursor}`,
        token: m.e.tokenAlumno,
      })
      if (resultado(r) !== "400 VALIDACION") fallas.push(`${nombre}: ${resultado(r)}`)
      else mensajes.add(errorApiSchema.parse(r.json()).error.mensaje)
    }
    expect(fallas).toEqual([])
    expect([...mensajes]).toEqual(["cursor: no es válido"])
    for (const consulta of [
      "bloque=docente&bloque=docente&tema=sin-tema",
      "bloque=DOCENTE&tema=sin-tema",
      "bloque=docente&bloque=aprendizaje&tema=sin-tema",
    ]) {
      const r = await pedir({
        method: "GET",
        url: `/api/clases/${m.e.claseId}/recursos?${consulta}`,
        token: m.e.tokenAlumno,
      })
      expect(resultado(r), consulta).toBe("400 VALIDACION")
    }
  })

  it("CL3a-r1-20: ninguna respuesta de recursos (lista y detalle, a los tres roles) lleva correo, estado de pago, restricción ni rol; la lista no lleva version y la firma del admin no lleva su nombre", async () => {
    const m = await claseMezclada()
    const deudor = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Deudor Z" })
    await obtenerDb().usuario.update({ where: { id: deudor.id }, data: { estadoPago: "deudor" } })
    await inscribirDePrueba(m.e.claseId, deudor.id)
    const admin = await obtenerDb().usuario.findUnique({
      where: { id: adminId },
      select: { nombre: true, email: true },
    })
    if (admin === null) throw new Error("Precondición: el admin existe")
    const cuerpos: string[] = []
    for (const token of [m.e.tokenAlumno, m.e.tokenMaestro, tokenAdmin]) {
      for (const bloque of ["aprendizaje", "docente"]) {
        const r = await pedir({
          method: "GET",
          url: `/api/clases/${m.e.claseId}/recursos?bloque=${bloque}&tema=sin-tema`,
          token,
        })
        expect(r.statusCode, r.body).toBe(200)
        expect(r.body).not.toMatch(/"version"/)
        cuerpos.push(r.body)
      }
    }
    for (const token of [m.e.tokenMaestro, tokenAdmin]) {
      const r = await pedir({
        method: "GET",
        url: urlRecurso(m.e.claseId, m.materiales[0] ?? ""),
        token,
      })
      expect(r.statusCode, r.body).toBe(200)
      cuerpos.push(r.body)
    }
    const prohibido = new RegExp(
      `"(email|correo|estadoPago|accesoRestringido|rol|motivoRestriccion)"|deudor|@|${admin.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
    )
    expect(cuerpos.filter((c) => prohibido.test(c))).toEqual([])
    if (admin.nombre !== "Administración") {
      expect(cuerpos.filter((c) => c.includes(`"${admin.nombre}"`))).toEqual([])
    }
  })
})

describe("ataque CLASES-03a r1: compatibilidad de DH-02 (b) sin parámetros", () => {
  it("CL3a-r1-23: sin tipo ni seccion, el muro y «Trabajo de clase» siguen dando materiales con y sin bloque y tareas, sin claves nuevas (bloque, version); los temas cuentan el total", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    const conBloque = await recurso(e, e.maestro.id, { bloque: "docente", temaId: tema.id })
    const sinBloque = await recurso(e, adminId, { temaId: tema.id })
    const tarea = await crearTareaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      temaId: tema.id,
      fechaLimite: FECHA_LIMITE,
    })
    const muro = await pedir({
      method: "GET",
      url: `/api/clases/${e.claseId}/publicaciones`,
      token: e.tokenAlumno,
    })
    const trabajo = await pedir({
      method: "GET",
      url: `/api/clases/${e.claseId}/trabajo?tema=${tema.id}`,
      token: e.tokenAlumno,
    })
    const temas = await pedir({
      method: "GET",
      url: `/api/clases/${e.claseId}/temas?otro=1`,
      token: e.tokenAlumno,
    })
    expect([muro.statusCode, trabajo.statusCode, temas.statusCode]).toEqual([200, 200, 200])
    const ids = (lista: { id: string }[]) => lista.map(({ id }) => id).sort()
    expect(ids(listaPublicacionesRespuestaSchema.parse(muro.json()).publicaciones)).toEqual(
      [conBloque, sinBloque, tarea].sort(),
    )
    expect(ids(listaTrabajoRespuestaSchema.parse(trabajo.json()).elementos)).toEqual(
      [conBloque, sinBloque, tarea].sort(),
    )
    expect(
      listaTemasRespuestaSchema.parse(temas.json()).temas.find(({ id }) => id === tema.id)
        ?.elementos,
    ).toBe(3)
    for (const r of [muro, trabajo, temas]) expect(r.body).not.toMatch(/"(bloque|version)"/)
  })
})
