import { randomUUID } from "node:crypto"

import { errorApiSchema, listaTrabajoRespuestaSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
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
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import {
  crearMaterialConTemaDePrueba,
  crearTareaDePrueba,
  crearTemaDePrueba,
} from "./ayudas-tareas.js"

// TAREAS-01b (PR-1B11): "Trabajo de clase", GET /api/clases/:claseId/trabajo.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
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

interface Escenario {
  claseId: string
  maestro: UsuarioDePrueba
  tokenMaestro: string
  tokenAlumno: string
}

const escenario = async (): Promise<Escenario> => {
  const maestro = await crearUsuarioDePrueba(idsUsuarios, {
    rol: "maestro",
    nombre: "Maestra Trabajo",
  })
  const alumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumno Trabajo" })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  await inscribirDePrueba(clase.id, alumno.id, "codigo")
  return {
    claseId: clase.id,
    maestro,
    tokenMaestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
    tokenAlumno: await firmarTokenDePrueba({ usuarioId: alumno.id }),
  }
}

const pedir = (
  e: Escenario,
  consulta: string,
  token = e.tokenMaestro,
): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method: "GET",
    url: `/api/clases/${e.claseId}/trabajo${consulta}`,
    headers: { authorization: `Bearer ${token}` },
  })

const lista = async (e: Escenario, consulta: string, token = e.tokenMaestro) => {
  const respuesta = await pedir(e, consulta, token)
  expect(respuesta.statusCode, respuesta.body).toBe(200)
  return listaTrabajoRespuestaSchema.parse(respuesta.json())
}

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

const ahora = Date.now()
const hace = (minutos: number): Date => new Date(ahora - minutos * 60_000)

// Una tarea con fecha de creación fija (el helper de la base no la recibe).
const tareaCreadaHace = async (
  e: Escenario,
  minutos: number,
  temaId: string | null,
  titulo: string,
): Promise<string> => {
  const id = await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id, temaId, titulo })
  await obtenerDb().publicacion.update({
    where: { id },
    data: { creadoEn: hace(minutos) },
    select: { id: true },
  })
  return id
}

const materialCreadoHace = (
  e: Escenario,
  minutos: number,
  temaId: string | null,
  titulo: string,
): Promise<string> =>
  crearMaterialConTemaDePrueba({
    claseId: e.claseId,
    autorId: e.maestro.id,
    temaId,
    titulo,
    creadoEn: hace(minutos),
  })

describe("Trabajo de clase (PR-1B11)", () => {
  it("PR-1B11: por tema, del más reciente al más antiguo, con materiales y tareas y sin anuncios", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    const otro = await crearTemaDePrueba({ claseId: e.claseId, orden: 1 })
    const m1 = await materialCreadoHace(e, 4, tema.id, "Material 1")
    const t1 = await tareaCreadaHace(e, 3, tema.id, "Tarea 1")
    const m2 = await materialCreadoHace(e, 2, tema.id, "Material 2")
    await materialCreadoHace(e, 1, otro.id, "De otro tema")
    await materialCreadoHace(e, 1, null, "Sin tema")
    await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })

    const respuesta = await lista(e, `?tema=${tema.id}`)

    expect(respuesta.elementos.map((x) => [x.id, x.tipo, x.titulo])).toEqual([
      [m2, "material", "Material 2"],
      [t1, "tarea", "Tarea 1"],
      [m1, "material", "Material 1"],
    ])
    expect(respuesta.siguienteCursor).toBeNull()
  })

  it("PR-1B11: sin-tema trae solo lo que no tiene tema, también del más reciente al más antiguo y sin anuncios", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    const t1 = await tareaCreadaHace(e, 3, null, "Tarea suelta")
    const m1 = await materialCreadoHace(e, 5, null, "Material suelto")
    await materialCreadoHace(e, 1, tema.id, "Con tema")
    await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })

    const respuesta = await lista(e, "?tema=sin-tema")

    expect(respuesta.elementos.map((x) => x.id)).toEqual([t1, m1])
  })

  it("PR-1B11: los materiales traen texto y adjuntos y las tareas su resumen, sin la clave del objeto", async () => {
    const e = await escenario()
    const material = await materialCreadoHace(e, 2, null, "Con archivo")
    const archivo = await crearArchivoDePrueba({
      claseId: e.claseId,
      subidoPor: e.maestro.id,
      estado: "confirmado",
      publicacionId: material,
      nombre: "guia.pdf",
    })
    const tarea = await tareaCreadaHace(e, 1, null, "Con resumen")

    const respuesta = await pedir(e, "?tema=sin-tema")

    expect(respuesta.statusCode).toBe(200)
    const { elementos } = listaTrabajoRespuestaSchema.parse(respuesta.json())
    const deTarea = elementos.find((x) => x.id === tarea)
    const deMaterial = elementos.find((x) => x.id === material)
    expect(deTarea?.material).toBeNull()
    expect(deTarea?.tarea?.puntos).toBe(100)
    expect(deMaterial?.tarea).toBeNull()
    expect(deMaterial?.material?.texto).toBe("Texto de prueba")
    expect(deMaterial?.material?.adjuntos.map((a) => [a.id, a.nombre])).toEqual([
      [archivo.id, "guia.pdf"],
    ])
    expect(respuesta.body).not.toContain(archivo.claveObjeto)
    expect(respuesta.body).not.toMatch(/estadoPago|accesoRestringido|@|"rol"/)
  })

  it("PR-1B11: pagina por cursor sin repetir ni saltar elementos y respeta el límite", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    const ids: string[] = []
    for (let k = 1; k <= 5; k += 1) {
      ids.push(await materialCreadoHace(e, k, tema.id, `M${String(k)}`))
    }

    const primera = await lista(e, `?tema=${tema.id}&limite=2`)
    const segunda = await lista(e, `?tema=${tema.id}&limite=2&cursor=${primera.siguienteCursor}`)
    const tercera = await lista(e, `?tema=${tema.id}&limite=2&cursor=${segunda.siguienteCursor}`)

    expect(primera.elementos.map((x) => x.id)).toEqual(ids.slice(0, 2))
    expect(primera.siguienteCursor).toBe(ids[1])
    expect(segunda.elementos.map((x) => x.id)).toEqual(ids.slice(2, 4))
    expect(tercera.elementos.map((x) => x.id)).toEqual(ids.slice(4))
    expect(tercera.siguienteCursor).toBeNull()
    const demasiado = await pedir(e, `?tema=${tema.id}&limite=101`)
    expect(demasiado.statusCode).toBe(400)
    expect(codigoDe(demasiado)).toBe("VALIDACION")
  })

  it("PR-1B11: un cursor de otro tema, de otra clase, de un anuncio o borrado responde 400 «cursor: no es válido»", async () => {
    const e = await escenario()
    const otraClase = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    const otro = await crearTemaDePrueba({ claseId: e.claseId, orden: 1 })
    await materialCreadoHace(e, 5, tema.id, "Propio")
    const deOtroTema = await materialCreadoHace(e, 4, otro.id, "De otro tema")
    const deOtraClase = await materialCreadoHace(otraClase, 4, null, "De otra clase")
    const anuncio = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const borrado = await materialCreadoHace(e, 3, tema.id, "Borrado")
    await obtenerDb().publicacion.delete({ where: { id: borrado }, select: { id: true } })

    for (const cursor of [deOtroTema, deOtraClase, anuncio, borrado, randomUUID()]) {
      const respuesta = await pedir(e, `?tema=${tema.id}&cursor=${cursor}`)
      expect(respuesta.statusCode, cursor).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
      expect(errorApiSchema.parse(respuesta.json()).error.mensaje).toBe("cursor: no es válido")
    }
    const sinTema = await pedir(e, `?tema=sin-tema&cursor=${deOtroTema}`)
    expect(sinTema.statusCode).toBe(400)
  })

  it("PR-1B11: un tema de otra clase o inexistente responde 404 TEMA_NO_ENCONTRADO", async () => {
    const e = await escenario()
    const otraClase = await escenario()
    const ajeno = await crearTemaDePrueba({ claseId: otraClase.claseId, orden: 0 })

    for (const tema of [ajeno.id, randomUUID()]) {
      const respuesta = await pedir(e, `?tema=${tema}`)
      expect(respuesta.statusCode, tema).toBe(404)
      expect(codigoDe(respuesta)).toBe("TEMA_NO_ENCONTRADO")
    }
  })

  it("PR-1B11: sin tema, con otro texto o con un tema mal formado responde 400 VALIDACION", async () => {
    const e = await escenario()

    for (const consulta of ["", "?tema=", "?tema=todos", "?tema=SIN-TEMA", "?tema=123"]) {
      const respuesta = await pedir(e, consulta)
      expect(respuesta.statusCode, consulta).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
    }
  })

  it("PR-1B11: el id del tema en mayúsculas funciona igual", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    const m = await materialCreadoHace(e, 1, tema.id, "M")

    const respuesta = await lista(e, `?tema=${tema.id.toUpperCase()}`)

    expect(respuesta.elementos.map((x) => x.id)).toEqual([m])
  })

  it("PR-1B11: puedeMover es true para el maestro y el admin y false para el estudiante", async () => {
    const e = await escenario()
    await materialCreadoHace(e, 2, null, "M")
    await tareaCreadaHace(e, 1, null, "T")

    const comoMaestro = await lista(e, "?tema=sin-tema")
    const comoAdmin = await lista(e, "?tema=sin-tema", await tokenDelAdminDePrueba())
    const comoAlumno = await lista(e, "?tema=sin-tema", e.tokenAlumno)

    for (const [quien, respuesta, esperado] of [
      ["maestro", comoMaestro, true],
      ["admin", comoAdmin, true],
      ["alumno", comoAlumno, false],
    ] as const) {
      expect(respuesta.elementos, quien).toHaveLength(2)
      expect(
        respuesta.elementos.map((x) => x.puedeMover),
        quien,
      ).toEqual([esperado, esperado])
    }
  })
})
