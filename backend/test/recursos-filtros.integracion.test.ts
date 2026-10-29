import {
  errorApiSchema,
  listaPublicacionesRespuestaSchema,
  listaTemasRespuestaSchema,
  listaTrabajoRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

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
  crearClaseDePrueba,
  crearPublicacionDePrueba,
  idDelAdminDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"
import { crearEntregaDePrueba } from "./ayudas-entregas.js"
import {
  crearMaterialConTemaDePrueba,
  crearTareaDePrueba,
  crearTemaDePrueba,
} from "./ayudas-tareas.js"

// CLASES-03a (CL3-A06 a CL3-A08): los filtros por sección de las rutas de hoy. Sin el parámetro nuevo,
// cada ruta responde lo de antes (DH-02 b y c). Las fechas de creación son instantes fijos, no
// relativos al reloj, para que el orden no dependa de cuándo corre la prueba.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
let adminId = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
  adminId = await idDelAdminDePrueba()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

const pedirGet = (url: string, token: string): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({ method: "GET", url, headers: { authorization: `Bearer ${token}` } })

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

const mensajeDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.mensaje

const instante = (minuto: number): Date => new Date(Date.UTC(2026, 9, 1, 12, minuto))

interface Escenario {
  claseId: string
  maestro: UsuarioDePrueba
  alumno: UsuarioDePrueba
  tokenMaestro: string
  tokenAlumno: string
}

const escenario = async (): Promise<Escenario> => {
  const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
  const alumno = await crearUsuarioDePrueba(idsUsuarios, { rol: "estudiante" })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  await inscribirDePrueba(clase.id, alumno.id, "codigo")
  return {
    claseId: clase.id,
    maestro,
    alumno,
    tokenMaestro: await tokenDe(maestro),
    tokenAlumno: await tokenDe(alumno),
  }
}

// Una tarea con su fecha de creación fija (la ayuda de tareas no la recibe).
const tareaEn = async (e: Escenario, minuto: number, temaId: string | null = null) => {
  const id = await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id, temaId })
  await obtenerDb().publicacion.update({
    where: { id },
    data: { creadoEn: instante(minuto) },
    select: { id: true },
  })
  return id
}

describe("Avisos: GET …/publicaciones?tipo=anuncio (CL3-A06)", () => {
  const sembrar = async (e: Escenario) => {
    const anuncioViejo = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      creadoEn: instante(1),
    })
    const material = await crearMaterialConTemaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      bloque: "docente",
      creadoEn: instante(2),
    })
    const tarea = await tareaEn(e, 3)
    const anuncioNuevo = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      creadoEn: instante(4),
    })
    return { anuncioViejo, material, tarea, anuncioNuevo }
  }

  it("CL3-A06: con tipo=anuncio solo salen los anuncios, del más reciente al más antiguo, también al estudiante", async () => {
    const e = await escenario()
    const s = await sembrar(e)
    for (const token of [e.tokenMaestro, e.tokenAlumno]) {
      const respuesta = await pedirGet(`/api/clases/${e.claseId}/publicaciones?tipo=anuncio`, token)
      expect(respuesta.statusCode, respuesta.body).toBe(200)
      const lista = listaPublicacionesRespuestaSchema.parse(respuesta.json())
      expect(lista.publicaciones.map((p) => p.id)).toEqual([s.anuncioNuevo, s.anuncioViejo])
      expect(lista.publicaciones.every((p) => p.tipo === "anuncio")).toBe(true)
      expect(lista.siguienteCursor).toBeNull()
    }
  })

  it("CL3-A06: con tipo=anuncio, la página sigue con el cursor de un anuncio", async () => {
    const e = await escenario()
    const s = await sembrar(e)
    const primera = listaPublicacionesRespuestaSchema.parse(
      (
        await pedirGet(
          `/api/clases/${e.claseId}/publicaciones?tipo=anuncio&limite=1`,
          e.tokenMaestro,
        )
      ).json(),
    )
    expect(primera.publicaciones.map((p) => p.id)).toEqual([s.anuncioNuevo])
    expect(primera.siguienteCursor).toBe(s.anuncioNuevo)
    const segunda = await pedirGet(
      `/api/clases/${e.claseId}/publicaciones?tipo=anuncio&limite=1&cursor=${s.anuncioNuevo}`,
      e.tokenMaestro,
    )
    expect(segunda.statusCode, segunda.body).toBe(200)
    expect(
      listaPublicacionesRespuestaSchema.parse(segunda.json()).publicaciones.map((p) => p.id),
    ).toEqual([s.anuncioViejo])
  })

  it("CL3-A06: un cursor que es un material o una tarea responde 400 «cursor: no es válido»", async () => {
    const e = await escenario()
    const s = await sembrar(e)
    for (const cursor of [s.material, s.tarea]) {
      const respuesta = await pedirGet(
        `/api/clases/${e.claseId}/publicaciones?tipo=anuncio&cursor=${cursor}`,
        e.tokenMaestro,
      )
      expect(respuesta.statusCode, cursor).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
      expect(mensajeDe(respuesta)).toBe("cursor: no es válido")
    }
  })

  it("CL3-A06: tipo=material, otro valor o el parámetro repetido responden 400 VALIDACION", async () => {
    const e = await escenario()
    for (const consulta of [
      "tipo=material",
      "tipo=tarea",
      "tipo=ANUNCIO",
      "tipo=anuncio&tipo=anuncio",
    ]) {
      const respuesta = await pedirGet(
        `/api/clases/${e.claseId}/publicaciones?${consulta}`,
        e.tokenMaestro,
      )
      expect(respuesta.statusCode, consulta).toBe(400)
      expect(codigoDe(respuesta), consulta).toBe("VALIDACION")
    }
  })

  it("CL3-A06: sin tipo, la lista de hoy: anuncios, materiales y tareas", async () => {
    const e = await escenario()
    const s = await sembrar(e)
    const respuesta = await pedirGet(`/api/clases/${e.claseId}/publicaciones`, e.tokenMaestro)
    expect(respuesta.statusCode, respuesta.body).toBe(200)
    expect(
      listaPublicacionesRespuestaSchema.parse(respuesta.json()).publicaciones.map((p) => p.id),
    ).toEqual([s.anuncioNuevo, s.tarea, s.material, s.anuncioViejo])
  })
})

describe("Actividades: GET …/trabajo?seccion=actividades (CL3-A07)", () => {
  const sembrar = async (e: Escenario) => {
    const tareaVieja = await tareaEn(e, 1)
    const material = await crearMaterialConTemaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      creadoEn: instante(2),
    })
    const tareaNueva = await tareaEn(e, 3)
    await crearEntregaDePrueba({ tareaId: tareaNueva, alumnoId: e.alumno.id, conRetraso: true })
    return { tareaVieja, material, tareaNueva }
  }

  const url = (claseId: string, consulta: string): string =>
    `/api/clases/${claseId}/trabajo?tema=sin-tema&${consulta}`

  it("CL3-A07: con seccion=actividades solo salen tareas, con la entrega del alumno", async () => {
    const e = await escenario()
    const s = await sembrar(e)
    const respuesta = await pedirGet(url(e.claseId, "seccion=actividades"), e.tokenAlumno)
    expect(respuesta.statusCode, respuesta.body).toBe(200)
    const { elementos } = listaTrabajoRespuestaSchema.parse(respuesta.json())
    expect(elementos.map((el) => [el.id, el.tipo, el.entrega])).toEqual([
      [s.tareaNueva, "tarea", { estado: "entregado", conRetraso: true }],
      [s.tareaVieja, "tarea", null],
    ])
    const delMaestro = listaTrabajoRespuestaSchema.parse(
      (await pedirGet(url(e.claseId, "seccion=actividades"), e.tokenMaestro)).json(),
    )
    expect(delMaestro.elementos.map((el) => el.id)).toEqual([s.tareaNueva, s.tareaVieja])
  })

  it("CL3-A07: un cursor que es un material responde 400 «cursor: no es válido»", async () => {
    const e = await escenario()
    const s = await sembrar(e)
    const respuesta = await pedirGet(
      url(e.claseId, `seccion=actividades&cursor=${s.material}`),
      e.tokenMaestro,
    )
    expect(respuesta.statusCode).toBe(400)
    expect(mensajeDe(respuesta)).toBe("cursor: no es válido")
    const conTarea = await pedirGet(
      url(e.claseId, `seccion=actividades&limite=1&cursor=${s.tareaNueva}`),
      e.tokenMaestro,
    )
    expect(conTarea.statusCode, conTarea.body).toBe(200)
    expect(listaTrabajoRespuestaSchema.parse(conTarea.json()).elementos.map((el) => el.id)).toEqual(
      [s.tareaVieja],
    )
  })

  it("CL3-A07: seccion=otra o repetida responde 400 VALIDACION", async () => {
    const e = await escenario()
    for (const consulta of [
      "seccion=otra",
      "seccion=recursos",
      "seccion=actividades&seccion=actividades",
    ]) {
      const respuesta = await pedirGet(url(e.claseId, consulta), e.tokenMaestro)
      expect(respuesta.statusCode, consulta).toBe(400)
      expect(codigoDe(respuesta), consulta).toBe("VALIDACION")
    }
  })

  it("CL3-A07: sin seccion, lo de hoy: materiales y tareas", async () => {
    const e = await escenario()
    const s = await sembrar(e)
    const respuesta = await pedirGet(
      `/api/clases/${e.claseId}/trabajo?tema=sin-tema`,
      e.tokenMaestro,
    )
    expect(respuesta.statusCode, respuesta.body).toBe(200)
    expect(
      listaTrabajoRespuestaSchema.parse(respuesta.json()).elementos.map((el) => el.id),
    ).toEqual([s.tareaNueva, s.material, s.tareaVieja])
  })
})

describe("conteos de temas por sección: GET …/temas?seccion= (CL3-A08)", () => {
  // Tema 1: una tarea, un recurso del docente, dos de aprendizaje y un material sin bloque.
  // Tema 2: vacío. Sin tema: una tarea, un recurso del docente y un anuncio (que no cuenta).
  const sembrar = async (e: Escenario) => {
    const tema1 = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad 1", orden: 0 })
    const tema2 = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad 2", orden: 1 })
    const material = (autorId: string, temaId: string | null, bloque?: "aprendizaje" | "docente") =>
      crearMaterialConTemaDePrueba({
        claseId: e.claseId,
        autorId,
        temaId,
        ...(bloque === undefined ? {} : { bloque }),
      })
    await tareaEn(e, 1, tema1.id)
    await material(e.maestro.id, tema1.id, "docente")
    await material(adminId, tema1.id, "aprendizaje")
    await material(adminId, tema1.id, "aprendizaje")
    await material(e.maestro.id, tema1.id)
    await tareaEn(e, 2)
    await material(e.maestro.id, null, "docente")
    await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    return { tema1, tema2 }
  }

  const conteos = async (e: Escenario, consulta: string, token = e.tokenMaestro) => {
    const respuesta = await pedirGet(`/api/clases/${e.claseId}/temas${consulta}`, token)
    expect(respuesta.statusCode, `${consulta}: ${respuesta.body}`).toBe(200)
    const lista = listaTemasRespuestaSchema.parse(respuesta.json())
    return {
      temas: lista.temas.map((tema) => [tema.nombre, tema.orden, tema.elementos]),
      sinTema: lista.sinTema,
    }
  }

  it("CL3-A08: con cada sección salen los mismos temas en el mismo orden y los conteos cuentan solo lo de la sección", async () => {
    const e = await escenario()
    await sembrar(e)
    expect(await conteos(e, "?seccion=actividades")).toEqual({
      temas: [
        ["Unidad 1", 0, 1],
        ["Unidad 2", 1, 0],
      ],
      sinTema: 1,
    })
    expect(await conteos(e, "?seccion=aprendizaje")).toEqual({
      temas: [
        ["Unidad 1", 0, 2],
        ["Unidad 2", 1, 0],
      ],
      sinTema: 0,
    })
    expect(await conteos(e, "?seccion=docente", e.tokenAlumno)).toEqual({
      temas: [
        ["Unidad 1", 0, 1],
        ["Unidad 2", 1, 0],
      ],
      sinTema: 1,
    })
  })

  it("CL3-A08: un material con bloque nulo no cuenta en ninguna sección de recursos y sí en el total; sin seccion, el total de hoy", async () => {
    const e = await escenario()
    await sembrar(e)
    expect(await conteos(e, "")).toEqual({
      temas: [
        ["Unidad 1", 0, 5],
        ["Unidad 2", 1, 0],
      ],
      sinTema: 2,
    })
    const porSeccion = await Promise.all(
      ["actividades", "aprendizaje", "docente"].map((seccion) => conteos(e, `?seccion=${seccion}`)),
    )
    const tema1PorSeccion = porSeccion.map((lista) => Number(lista.temas[0]?.[2] ?? -1))
    expect(tema1PorSeccion).toEqual([1, 2, 1])
    expect(tema1PorSeccion.reduce((a, b) => a + b, 0)).toBe(4)
  })

  it("CL3-A08: seccion=otra o repetida responde 400 VALIDACION", async () => {
    const e = await escenario()
    for (const consulta of [
      "?seccion=otra",
      "?seccion=recursos",
      "?seccion=docente&seccion=docente",
    ]) {
      const respuesta = await pedirGet(`/api/clases/${e.claseId}/temas${consulta}`, e.tokenMaestro)
      expect(respuesta.statusCode, consulta).toBe(400)
      expect(codigoDe(respuesta), consulta).toBe("VALIDACION")
    }
  })
})
