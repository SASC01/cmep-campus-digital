import { randomUUID } from "node:crypto"

import {
  comentarioRespuestaSchema,
  errorApiSchema,
  listaComentariosRespuestaSchema,
  listaPublicacionesRespuestaSchema,
  publicacionRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { crearPublicacion } from "../src/adapters/db/index.js"
import { obtenerDb } from "../src/adapters/db/cliente.js"
import { buscarTrabajo, describirCola, encolar } from "../src/adapters/queue/index.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  COLA_AVISO_FALLIDO,
  COLA_COMENTARIO_CREADO,
  COLA_MATERIAL_CREADO,
  COLA_PUBLICACION_CREADA,
} from "../src/core/eventos/avisos-de-clase.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  contarComentarios,
  contarPublicaciones,
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  crearComentarioDePrueba,
  crearPublicacionDePrueba,
  inscribirDePrueba,
  leerComentarioDb,
  leerPublicacionDb,
  leerTrabajosDeCola,
} from "./ayudas-clases.js"

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const maestroDePrueba = (nombre = "Maestra Muro"): Promise<UsuarioDePrueba> =>
  crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre })
const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

const alumnoInscrito = async (
  claseId: string,
  nombre = "Alumno Muro",
  opciones: { estadoPago?: "al_corriente" | "deudor" } = {},
): Promise<UsuarioDePrueba> => {
  const alumno = await crearAlumnoDePrueba(idsUsuarios, { nombre, ...opciones })
  await inscribirDePrueba(claseId, alumno.id, "codigo")
  return alumno
}

interface Escenario {
  claseId: string
  maestro: UsuarioDePrueba
  alumno: UsuarioDePrueba
  tokenMaestro: string
  tokenAlumno: string
}

const escenario = async (): Promise<Escenario> => {
  const maestro = await maestroDePrueba()
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  const alumno = await alumnoInscrito(clase.id)
  return {
    claseId: clase.id,
    maestro,
    alumno,
    tokenMaestro: await tokenDe(maestro),
    tokenAlumno: await tokenDe(alumno),
  }
}

const peticion = (opciones: {
  method: "GET" | "POST" | "DELETE"
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

const urlPublicaciones = (claseId: string): string => `/api/clases/${claseId}/publicaciones`
const urlComentarios = (claseId: string, publicacionId: string): string =>
  `/api/clases/${claseId}/publicaciones/${publicacionId}/comentarios`

const publicar = (
  e: Escenario,
  payload: InjectOptions["payload"],
): Promise<LightMyRequestResponse> =>
  peticion({
    method: "POST",
    url: urlPublicaciones(e.claseId),
    token: e.tokenMaestro,
    payload,
  })

// Claves de todos los objetos de un JSON, en cualquier profundidad.
const clavesDe = (valor: unknown): string[] => {
  const claves: string[] = []
  const pila: unknown[] = [valor]
  while (pila.length > 0) {
    const actual = pila.pop()
    if (actual === null || typeof actual !== "object") continue
    for (const [clave, hijo] of Object.entries(actual)) {
      claves.push(clave)
      pila.push(hijo)
    }
  }
  return claves
}

const minutosAntes = (minutos: number): Date => new Date(Date.now() - minutos * 60_000)

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  // N-10: movimientos y clases (con sus publicaciones y comentarios en cascada) antes que los
  // usuarios (ON DELETE RESTRICT).
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("POST /api/clases/:claseId/publicaciones", () => {
  it("PR-C02a: crear un anuncio y un material responde 201", async () => {
    const e = await escenario()

    const anuncio = await publicar(e, { tipo: "anuncio", texto: "Mañana hay examen" })
    expect(anuncio.statusCode).toBe(201)
    const { publicacion } = publicacionRespuestaSchema.parse(anuncio.json())
    expect(publicacion.tipo).toBe("anuncio")
    expect(publicacion.titulo).toBeNull()
    expect(publicacion.texto).toBe("Mañana hay examen")
    expect(publicacion.autor).toEqual({
      id: e.maestro.id,
      nombre: "Maestra Muro",
      // CLASES-02b (C-10): la firma suma `administracion`.
      administracion: false,
    })
    expect(publicacion.comentarios).toBe(0)

    const material = await publicar(e, {
      tipo: "material",
      titulo: "Guía del tema 3",
      texto: "Lee las páginas 10 a 20",
    })
    expect(material.statusCode).toBe(201)
    const creado = publicacionRespuestaSchema.parse(material.json()).publicacion
    expect(creado.tipo).toBe("material")
    expect(creado.titulo).toBe("Guía del tema 3")

    const sinDescripcion = await publicar(e, { tipo: "material", titulo: "Solo el título" })
    expect(sinDescripcion.statusCode).toBe(201)
    expect(publicacionRespuestaSchema.parse(sinDescripcion.json()).publicacion.texto).toBe("")
    expect(await contarPublicaciones(e.claseId)).toBe(3)
  })

  it("PR-C02b: un material sin título responde 400 VALIDACION", async () => {
    const e = await escenario()

    const sinTitulo = await publicar(e, { tipo: "material", texto: "Sin título" })
    expect(sinTitulo.statusCode).toBe(400)
    expect(codigoDe(sinTitulo)).toBe("VALIDACION")

    const tituloVacio = await publicar(e, { tipo: "material", titulo: "   " })
    expect(tituloVacio.statusCode).toBe(400)
    expect(codigoDe(tituloVacio)).toBe("VALIDACION")
    expect(await contarPublicaciones(e.claseId)).toBe(0)
  })

  it("PR-C02c: un INSERT directo que viole publicaciones_titulo_segun_tipo falla", async () => {
    const e = await escenario()

    await expect(
      obtenerDb().publicacion.create({
        data: {
          claseId: e.claseId,
          autorId: e.maestro.id,
          tipo: "anuncio",
          titulo: "Un anuncio no lleva título",
          texto: "x",
        },
      }),
    ).rejects.toThrow(/publicaciones_titulo_segun_tipo/)
    await expect(
      obtenerDb().publicacion.create({
        data: { claseId: e.claseId, autorId: e.maestro.id, tipo: "material", texto: "x" },
      }),
    ).rejects.toThrow(/publicaciones_titulo_segun_tipo/)
    expect(await contarPublicaciones(e.claseId)).toBe(0)
  })

  it("PR-C02d: queda exactamente un trabajo en la cola que corresponde, con id = publicacionId y solo ids", async () => {
    const e = await escenario()

    const anuncio = publicacionRespuestaSchema.parse(
      (await publicar(e, { tipo: "anuncio", texto: "Aviso" })).json(),
    ).publicacion
    const material = publicacionRespuestaSchema.parse(
      (await publicar(e, { tipo: "material", titulo: "Lectura", texto: "Capítulo 2" })).json(),
    ).publicacion

    const trabajoAnuncio = await buscarTrabajo(COLA_PUBLICACION_CREADA, anuncio.id)
    expect(trabajoAnuncio?.datos).toEqual({ publicacionId: anuncio.id, claseId: e.claseId })
    expect(await buscarTrabajo(COLA_MATERIAL_CREADO, anuncio.id)).toBeNull()

    const trabajoMaterial = await buscarTrabajo(COLA_MATERIAL_CREADO, material.id)
    expect(trabajoMaterial?.datos).toEqual({ publicacionId: material.id, claseId: e.claseId })
    expect(await buscarTrabajo(COLA_PUBLICACION_CREADA, material.id)).toBeNull()

    // Exactamente uno por publicación, y los datos no llevan texto, nombres ni correos.
    const delAnuncio = await leerTrabajosDeCola(
      COLA_PUBLICACION_CREADA,
      "publicacionId",
      anuncio.id,
    )
    expect(delAnuncio).toHaveLength(1)
    expect(delAnuncio[0]?.id).toBe(anuncio.id)
    const texto = JSON.stringify(delAnuncio[0]?.datos)
    expect(texto).not.toContain("Aviso")
    expect(texto).not.toContain("Maestra Muro")
    expect(texto).not.toContain(e.maestro.email)
  })

  it("PR-C02e: con un alGuardar doble que lanza, no quedan ni la publicación ni el trabajo", async () => {
    const e = await escenario()
    const id = randomUUID()

    await expect(
      crearPublicacion(
        {
          id,
          claseId: e.claseId,
          autorId: e.maestro.id,
          tipo: "anuncio",
          titulo: null,
          texto: "Se revierte",
        },
        async (sql) => {
          await encolar(
            COLA_PUBLICACION_CREADA,
            { publicacionId: id, claseId: e.claseId },
            { id, sql },
          )
          throw new Error("fallo deliberado después de encolar")
        },
      ),
    ).rejects.toThrow("fallo deliberado después de encolar")

    expect(await leerPublicacionDb(id)).toBeNull()
    expect(await buscarTrabajo(COLA_PUBLICACION_CREADA, id)).toBeNull()
    expect(await contarPublicaciones(e.claseId)).toBe(0)
  })
})

describe("GET /api/clases/:claseId/publicaciones", () => {
  it("PR-C03a: el muro sale en orden descendente (la más reciente primero)", async () => {
    const e = await escenario()
    const antigua = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      texto: "Antigua",
      creadoEn: minutosAntes(30),
    })
    const media = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      texto: "Media",
      creadoEn: minutosAntes(20),
    })
    const reciente = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      tipo: "material",
      texto: "Reciente",
      creadoEn: minutosAntes(10),
    })

    const respuesta = await peticion({
      method: "GET",
      url: urlPublicaciones(e.claseId),
      token: e.tokenAlumno,
    })
    expect(respuesta.statusCode).toBe(200)
    const { publicaciones, siguienteCursor } = listaPublicacionesRespuestaSchema.parse(
      respuesta.json(),
    )
    expect(publicaciones.map((p) => p.id)).toEqual([reciente, media, antigua])
    expect(siguienteCursor).toBeNull()
  })

  it("PR-C03b: el recorrido recursivo del muro no encuentra estadoPago ni email", async () => {
    const e = await escenario()
    const deudor = await alumnoInscrito(e.claseId, "Alumno Deudor", { estadoPago: "deudor" })
    const publicacionId = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    await crearComentarioDePrueba({ publicacionId, autorId: deudor.id })
    await crearComentarioDePrueba({ publicacionId, autorId: e.maestro.id })

    const cuerpos: string[] = []
    for (const token of [e.tokenAlumno, e.tokenMaestro]) {
      for (const url of [urlPublicaciones(e.claseId), urlComentarios(e.claseId, publicacionId)]) {
        const respuesta = await peticion({ method: "GET", url, token })
        expect(respuesta.statusCode).toBe(200)
        cuerpos.push(respuesta.body)
      }
    }

    for (const cuerpo of cuerpos) {
      const claves = clavesDe(JSON.parse(cuerpo))
      expect(claves).not.toContain("estadoPago")
      expect(claves).not.toContain("email")
      expect(claves).not.toContain("accesoRestringido")
      expect(cuerpo).not.toContain("deudor")
      expect(cuerpo).not.toContain(e.maestro.email)
      expect(cuerpo).not.toContain(deudor.email)
    }
  })

  it("PR-C03c: el muro pagina con cursor", async () => {
    const e = await escenario()
    const creadas: string[] = []
    for (let i = 0; i < 5; i++) {
      creadas.push(
        await crearPublicacionDePrueba({
          claseId: e.claseId,
          autorId: e.maestro.id,
          texto: `Publicación ${String(i)}`,
          creadoEn: minutosAntes(50 - i * 10),
        }),
      )
    }

    const vistas: string[] = []
    let cursor: string | null = null
    let paginas = 0
    do {
      const sufijo: string = cursor === null ? "" : `&cursor=${cursor}`
      const respuesta = await peticion({
        method: "GET",
        url: `${urlPublicaciones(e.claseId)}?limite=2${sufijo}`,
        token: e.tokenMaestro,
      })
      expect(respuesta.statusCode).toBe(200)
      const pagina = listaPublicacionesRespuestaSchema.parse(respuesta.json())
      expect(pagina.publicaciones.length).toBeLessThanOrEqual(2)
      vistas.push(...pagina.publicaciones.map((p) => p.id))
      cursor = pagina.siguienteCursor
      paginas += 1
    } while (cursor !== null && paginas < 10)

    expect(paginas).toBe(3)
    expect(vistas).toEqual([...creadas].reverse())
  })

  it("PR-C03d: cada publicación trae el conteo correcto de comentarios", async () => {
    const e = await escenario()
    const conDos = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      creadoEn: minutosAntes(30),
    })
    const sinNinguno = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      creadoEn: minutosAntes(20),
    })
    const conUno = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      creadoEn: minutosAntes(10),
    })
    await crearComentarioDePrueba({ publicacionId: conDos, autorId: e.alumno.id })
    await crearComentarioDePrueba({ publicacionId: conDos, autorId: e.maestro.id })
    await crearComentarioDePrueba({ publicacionId: conUno, autorId: e.alumno.id })

    const respuesta = await peticion({
      method: "GET",
      url: urlPublicaciones(e.claseId),
      token: e.tokenAlumno,
    })
    const { publicaciones } = listaPublicacionesRespuestaSchema.parse(respuesta.json())
    const conteos = new Map(publicaciones.map((p) => [p.id, p.comentarios]))
    expect(conteos.get(conDos)).toBe(2)
    expect(conteos.get(sinNinguno)).toBe(0)
    expect(conteos.get(conUno)).toBe(1)
  })

  it("PR-C03e: cada publicación trae el nombre de su autor", async () => {
    const e = await escenario()
    await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })

    const respuesta = await peticion({
      method: "GET",
      url: urlPublicaciones(e.claseId),
      token: e.tokenAlumno,
    })
    const { publicaciones } = listaPublicacionesRespuestaSchema.parse(respuesta.json())
    expect(publicaciones).toHaveLength(1)
    expect(publicaciones[0]?.autor).toEqual({
      id: e.maestro.id,
      nombre: "Maestra Muro",
      // CLASES-02b (C-10): la firma suma `administracion`.
      administracion: false,
    })
  })
})

describe("comentarios", () => {
  it("PR-C04a: comentan el alumno inscrito y el maestro (201) y se encola COMENTARIO_CREADO con id = comentarioId", async () => {
    const e = await escenario()
    const publicacionId = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })

    for (const [token, texto, nombre] of [
      [e.tokenAlumno, "Gracias, maestra", "Alumno Muro"],
      [e.tokenMaestro, "De nada", "Maestra Muro"],
    ] as const) {
      const respuesta = await peticion({
        method: "POST",
        url: urlComentarios(e.claseId, publicacionId),
        token,
        payload: { texto },
      })
      expect(respuesta.statusCode).toBe(201)
      const { comentario } = comentarioRespuestaSchema.parse(respuesta.json())
      expect(comentario.texto).toBe(texto)
      expect(comentario.autor.nombre).toBe(nombre)
      expect(comentario.propio).toBe(true)

      const trabajo = await buscarTrabajo(COLA_COMENTARIO_CREADO, comentario.id)
      expect(trabajo?.datos).toEqual({
        comentarioId: comentario.id,
        publicacionId,
        claseId: e.claseId,
      })
      const guardados = await leerTrabajosDeCola(
        COLA_COMENTARIO_CREADO,
        "comentarioId",
        comentario.id,
      )
      expect(guardados).toHaveLength(1)
      expect(guardados[0]?.id).toBe(comentario.id)
    }
    expect(await contarComentarios(publicacionId)).toBe(2)
  })

  it("PR-C04b: comentar una publicación de otra clase con el claseId propio responde 404, sin escribir ni encolar", async () => {
    const e = await escenario()
    const otraClase = await crearClaseDePrueba(idsClases, { maestroId: e.maestro.id })
    const ajena = await crearPublicacionDePrueba({
      claseId: otraClase.id,
      autorId: e.maestro.id,
    })

    const respuesta = await peticion({
      method: "POST",
      url: urlComentarios(e.claseId, ajena),
      token: e.tokenAlumno,
      payload: { texto: "No debería entrar" },
    })
    expect(respuesta.statusCode).toBe(404)
    expect(codigoDe(respuesta)).toBe("PUBLICACION_NO_ENCONTRADA")
    expect(mensajeDe(respuesta)).toBe("Esa publicación ya no existe.")
    expect(await contarComentarios(ajena)).toBe(0)
    expect(await leerTrabajosDeCola(COLA_COMENTARIO_CREADO, "publicacionId", ajena)).toHaveLength(0)

    // Una publicación que no existe responde igual.
    const inexistente = await peticion({
      method: "POST",
      url: urlComentarios(e.claseId, randomUUID()),
      token: e.tokenMaestro,
      payload: { texto: "Nada" },
    })
    expect(inexistente.statusCode).toBe(404)
    expect(codigoDe(inexistente)).toBe("PUBLICACION_NO_ENCONTRADA")
  })

  it("PR-C04c: la lista de comentarios es ascendente y paginada, con propio correcto", async () => {
    const e = await escenario()
    const publicacionId = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const primero = await crearComentarioDePrueba({
      publicacionId,
      autorId: e.alumno.id,
      texto: "Primero",
      creadoEn: minutosAntes(30),
    })
    const segundo = await crearComentarioDePrueba({
      publicacionId,
      autorId: e.maestro.id,
      texto: "Segundo",
      creadoEn: minutosAntes(20),
    })
    const tercero = await crearComentarioDePrueba({
      publicacionId,
      autorId: e.alumno.id,
      texto: "Tercero",
      creadoEn: minutosAntes(10),
    })

    const vistos: { id: string; propio: boolean }[] = []
    let cursor: string | null = null
    let paginas = 0
    do {
      const sufijo: string = cursor === null ? "" : `&cursor=${cursor}`
      const respuesta = await peticion({
        method: "GET",
        url: `${urlComentarios(e.claseId, publicacionId)}?limite=2${sufijo}`,
        token: e.tokenAlumno,
      })
      expect(respuesta.statusCode).toBe(200)
      const pagina = listaComentariosRespuestaSchema.parse(respuesta.json())
      vistos.push(...pagina.comentarios.map(({ id, propio }) => ({ id, propio })))
      cursor = pagina.siguienteCursor
      paginas += 1
    } while (cursor !== null && paginas < 10)

    expect(paginas).toBe(2)
    expect(vistos).toEqual([
      { id: primero, propio: true },
      { id: segundo, propio: false },
      { id: tercero, propio: true },
    ])
  })

  it(
    "PR-C04d: comentar mientras otra transacción borra la publicación responde 404, nunca 500, y no queda ningún comentario",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const publicacionId = await crearPublicacionDePrueba({
        claseId: e.claseId,
        autorId: e.maestro.id,
      })
      let comentando: Promise<LightMyRequestResponse> | undefined

      await obtenerDb().$transaction(
        async (tx) => {
          // La transacción que borra retiene la fila hasta que el comentario espere por ella.
          await tx.publicacion.delete({ where: { id: publicacionId } })
          comentando = peticion({
            method: "POST",
            url: urlComentarios(e.claseId, publicacionId),
            token: e.tokenAlumno,
            payload: { texto: "Llega mientras se borra" },
          })

          // Sin tiempos fijos: se confirma en cuanto la base muestra al comentario esperando el
          // FOR SHARE. El sondeo corre fuera de la transacción (otra conexión).
          let esperando = 0
          for (let intento = 0; intento < 400 && esperando === 0; intento++) {
            const [fila] = await obtenerDb().$queryRaw<{ n: number }[]>`
              SELECT count(*)::int AS n
              FROM pg_stat_activity
              WHERE wait_event_type = 'Lock'
                AND query LIKE '%FOR SHARE%'
                AND query LIKE '%publicaciones%'
                AND pid <> pg_backend_pid()`
            esperando = fila?.n ?? 0
            if (esperando === 0) await esperar(25)
          }
          expect(esperando, "el comentario debía quedar esperando el FOR SHARE").toBeGreaterThan(0)
        },
        { timeout: 15_000 },
      )

      if (comentando === undefined) throw new Error("La petición de comentar no se lanzó")
      const respuesta = await comentando
      expect(respuesta.statusCode).toBe(404)
      expect(codigoDe(respuesta)).toBe("PUBLICACION_NO_ENCONTRADA")
      expect(await leerPublicacionDb(publicacionId)).toBeNull()
      expect(await contarComentarios(publicacionId)).toBe(0)
      expect(
        await leerTrabajosDeCola(COLA_COMENTARIO_CREADO, "publicacionId", publicacionId),
      ).toHaveLength(0)
    },
  )
})

describe("borrar publicaciones y comentarios", () => {
  it("PR-C05a: borrar una publicación responde 204 y sus comentarios desaparecen", async () => {
    const e = await escenario()
    const publicacionId = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const comentarioId = await crearComentarioDePrueba({ publicacionId, autorId: e.alumno.id })

    const respuesta = await peticion({
      method: "DELETE",
      url: `${urlPublicaciones(e.claseId)}/${publicacionId}`,
      token: e.tokenMaestro,
    })
    expect(respuesta.statusCode).toBe(204)
    expect(await leerPublicacionDb(publicacionId)).toBeNull()
    expect(await leerComentarioDb(comentarioId)).toBeNull()

    const otraVez = await peticion({
      method: "DELETE",
      url: `${urlPublicaciones(e.claseId)}/${publicacionId}`,
      token: e.tokenMaestro,
    })
    expect(otraVez.statusCode).toBe(404)
    expect(codigoDe(otraVez)).toBe("PUBLICACION_NO_ENCONTRADA")
  })

  it("PR-C05b: borrar una publicación de otra clase responde 404 y no la toca", async () => {
    const e = await escenario()
    const otraClase = await crearClaseDePrueba(idsClases, { maestroId: e.maestro.id })
    const ajena = await crearPublicacionDePrueba({ claseId: otraClase.id, autorId: e.maestro.id })

    const respuesta = await peticion({
      method: "DELETE",
      url: `${urlPublicaciones(e.claseId)}/${ajena}`,
      token: e.tokenMaestro,
    })
    expect(respuesta.statusCode).toBe(404)
    expect(codigoDe(respuesta)).toBe("PUBLICACION_NO_ENCONTRADA")
    expect(await leerPublicacionDb(ajena)).not.toBeNull()
  })

  it("PR-C05c: un estudiante que borra una publicación recibe 403 y no se borra", async () => {
    const e = await escenario()
    const publicacionId = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })

    const respuesta = await peticion({
      method: "DELETE",
      url: `${urlPublicaciones(e.claseId)}/${publicacionId}`,
      token: e.tokenAlumno,
    })
    expect(respuesta.statusCode).toBe(403)
    expect(codigoDe(respuesta)).toBe("ROL_NO_PERMITIDO")
    expect(await leerPublicacionDb(publicacionId)).not.toBeNull()
  })

  it("PR-C06a: el maestro borra cualquier comentario de su clase", async () => {
    const e = await escenario()
    const publicacionId = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const deAlumno = await crearComentarioDePrueba({ publicacionId, autorId: e.alumno.id })
    const url = `${urlComentarios(e.claseId, publicacionId)}/${deAlumno}`

    const respuesta = await peticion({ method: "DELETE", url, token: e.tokenMaestro })
    expect(respuesta.statusCode).toBe(204)
    expect(await leerComentarioDb(deAlumno)).toBeNull()

    // Con otra publicación en la ruta, el comentario no se encuentra.
    const otraPublicacion = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const otro = await crearComentarioDePrueba({ publicacionId, autorId: e.alumno.id })
    const cruzado = await peticion({
      method: "DELETE",
      url: `${urlComentarios(e.claseId, otraPublicacion)}/${otro}`,
      token: e.tokenMaestro,
    })
    expect(cruzado.statusCode).toBe(404)
    expect(codigoDe(cruzado)).toBe("COMENTARIO_NO_ENCONTRADO")
    expect(await leerComentarioDb(otro)).not.toBeNull()
  })

  it("PR-C06b: el alumno borra el suyo por «mis comentarios»", async () => {
    const e = await escenario()
    const publicacionId = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const suyo = await crearComentarioDePrueba({ publicacionId, autorId: e.alumno.id })

    const respuesta = await peticion({
      method: "DELETE",
      url: `/api/clases/${e.claseId}/mis-comentarios/${suyo}`,
      token: e.tokenAlumno,
    })
    expect(respuesta.statusCode).toBe(204)
    expect(await leerComentarioDb(suyo)).toBeNull()
  })

  it("PR-C06c: con el comentario de otro, «mis comentarios» responde 404 y el comentario sigue", async () => {
    const e = await escenario()
    const publicacionId = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const delMaestro = await crearComentarioDePrueba({ publicacionId, autorId: e.maestro.id })

    const respuesta = await peticion({
      method: "DELETE",
      url: `/api/clases/${e.claseId}/mis-comentarios/${delMaestro}`,
      token: e.tokenAlumno,
    })
    expect(respuesta.statusCode).toBe(404)
    expect(codigoDe(respuesta)).toBe("COMENTARIO_NO_ENCONTRADO")
    expect(mensajeDe(respuesta)).toBe("Ese comentario ya no existe.")
    expect(await leerComentarioDb(delMaestro)).not.toBeNull()
  })
})

describe("colas de los avisos", () => {
  it("PR-C07: describirCola de las tres colas: reintentos, backoff, deadLetter y retención de 7 días; AVISO_FALLIDO existe", async () => {
    for (const nombre of [COLA_PUBLICACION_CREADA, COLA_MATERIAL_CREADO, COLA_COMENTARIO_CREADO]) {
      const cola = await describirCola(nombre)
      expect(cola, nombre).toEqual({
        retryLimit: 3,
        retryDelay: 30,
        retryBackoff: true,
        expireInSeconds: 300,
        deadLetter: COLA_AVISO_FALLIDO,
        retentionSeconds: 604_800,
        deleteAfterSeconds: 604_800,
      })
    }
    const fallidos = await describirCola(COLA_AVISO_FALLIDO)
    expect(fallidos).not.toBeNull()
    expect(fallidos?.retentionSeconds).toBe(604_800)
    expect(fallidos?.deleteAfterSeconds).toBe(604_800)

    // PA-05: los trabajos heredan la política de su cola (lo que quedó guardado en pgboss.job).
    const e = await escenario()
    const anuncio = publicacionRespuestaSchema.parse(
      (await publicar(e, { tipo: "anuncio", texto: "Para la política" })).json(),
    ).publicacion
    const [trabajo] = await leerTrabajosDeCola(COLA_PUBLICACION_CREADA, "publicacionId", anuncio.id)
    expect(trabajo?.retry_limit).toBe(3)
    expect(trabajo?.retry_backoff).toBe(true)
    expect(trabajo?.dead_letter).toBe(COLA_AVISO_FALLIDO)
    expect(trabajo?.retencion_s).toBe(604_800)
  })
})

describe("contenido visible en el muro (Enmienda 6, §D-C4)", () => {
  it("PR-C12e: sin contenido visible, cada texto obligatorio responde 400 VALIDACION sin escribir ni encolar", async () => {
    const e = await escenario()
    const publicacionId = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    for (const vacio of ["\u200B\u2060", "\u3164", "   \r\n  "]) {
      const anuncio = await publicar(e, { tipo: "anuncio", texto: vacio })
      expect(anuncio.statusCode).toBe(400)
      expect(codigoDe(anuncio)).toBe("VALIDACION")
      expect(mensajeDe(anuncio)).toBe("texto: Escribe el anuncio")

      const material = await publicar(e, { tipo: "material", titulo: vacio })
      expect(material.statusCode).toBe(400)
      expect(mensajeDe(material)).toBe("titulo: Escribe el título del material")

      const comentario = await peticion({
        method: "POST",
        url: urlComentarios(e.claseId, publicacionId),
        token: e.tokenAlumno,
        payload: { texto: vacio },
      })
      expect(comentario.statusCode).toBe(400)
      expect(mensajeDe(comentario)).toBe("texto: Escribe tu comentario")
    }

    // Un campo ausente responde en español, no con el mensaje por defecto de zod.
    const sinTexto = await publicar(e, { tipo: "anuncio" })
    expect(sinTexto.statusCode).toBe(400)
    expect(mensajeDe(sinTexto)).toBe("texto: Escribe el anuncio")

    expect(await contarPublicaciones(e.claseId)).toBe(1)
    expect(await contarComentarios(publicacionId)).toBe(0)
    // Ningún trabajo de esta clase: las pruebas de otros archivos comparten la cola.
    const trabajos = await obtenerDb().$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM pgboss.job
      WHERE name IN (${COLA_PUBLICACION_CREADA}, ${COLA_MATERIAL_CREADO}, ${COLA_COMENTARIO_CREADO})
        AND data ->> 'claseId' = ${e.claseId}`
    expect(trabajos[0]?.n).toBe(0)

    const pulgar = await peticion({
      method: "POST",
      url: urlComentarios(e.claseId, publicacionId),
      token: e.tokenAlumno,
      payload: { texto: "\u{1F44D}" },
    })
    expect(pulgar.statusCode).toBe(201)
  })
})

describe("cursor que ya no existe (Enmienda 8, T-29)", () => {
  const CURSOR_INVALIDO = "cursor: no es válido"

  it("PR-C03f: un cursor borrado, de otra clase o inexistente responde 400 VALIDACION igual; uno válido sigue paginando", async () => {
    const e = await escenario()
    const ajeno = await escenario()
    const ids: string[] = []
    for (let i = 0; i < 3; i++) {
      ids.push(
        await crearPublicacionDePrueba({
          claseId: e.claseId,
          autorId: e.maestro.id,
          texto: `Publicación ${String(i)}`,
          creadoEn: minutosAntes(30 - i * 10),
        }),
      )
    }
    const deOtraClase = await crearPublicacionDePrueba({
      claseId: ajeno.claseId,
      autorId: ajeno.maestro.id,
    })
    const [antigua, intermedia, reciente] = ids
    if (antigua === undefined || intermedia === undefined || reciente === undefined) {
      throw new Error("Faltan publicaciones de la prueba")
    }

    const pedir = (cursor: string): Promise<LightMyRequestResponse> =>
      peticion({
        method: "GET",
        url: `${urlPublicaciones(e.claseId)}?limite=1&cursor=${cursor}`,
        token: e.tokenMaestro,
      })

    // Válido: pagina como siempre.
    const valido = await pedir(reciente)
    expect(valido.statusCode).toBe(200)
    expect(listaPublicacionesRespuestaSchema.parse(valido.json()).publicaciones[0]?.id).toBe(
      intermedia,
    )

    // Borrado: la clave de orden desapareció con la fila.
    const borrado = await peticion({
      method: "DELETE",
      url: `${urlPublicaciones(e.claseId)}/${intermedia}`,
      token: e.tokenMaestro,
    })
    expect(borrado.statusCode).toBe(204)

    const respuestas = [
      await pedir(intermedia),
      await pedir(deOtraClase),
      await pedir(randomUUID()),
    ]
    for (const respuesta of respuestas) {
      expect(respuesta.statusCode).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
      expect(mensajeDe(respuesta)).toBe(CURSOR_INVALIDO)
    }
    expect(respuestas.map((r) => r.body)).toEqual([
      respuestas[0]?.body,
      respuestas[0]?.body,
      respuestas[0]?.body,
    ])
  })

  it("PR-C04e: lo mismo con el cursor de un comentario; una publicación de otra clase responde 404 aunque haya cursor", async () => {
    const e = await escenario()
    const ajeno = await escenario()
    const publicacionId = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const otraPublicacion = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const primero = await crearComentarioDePrueba({
      publicacionId,
      autorId: e.alumno.id,
      texto: "Primero",
      creadoEn: minutosAntes(30),
    })
    const segundo = await crearComentarioDePrueba({
      publicacionId,
      autorId: e.alumno.id,
      texto: "Segundo",
      creadoEn: minutosAntes(20),
    })
    const aBorrar = await crearComentarioDePrueba({
      publicacionId,
      autorId: e.alumno.id,
      texto: "Tercero",
      creadoEn: minutosAntes(10),
    })
    const deOtraPublicacion = await crearComentarioDePrueba({
      publicacionId: otraPublicacion,
      autorId: e.alumno.id,
    })

    const pedir = (publicacion: string, cursor: string, claseId = e.claseId) =>
      peticion({
        method: "GET",
        url: `${urlComentarios(claseId, publicacion)}?limite=1&cursor=${cursor}`,
        token: e.tokenAlumno,
      })

    const valido = await pedir(publicacionId, primero)
    expect(valido.statusCode).toBe(200)
    expect(listaComentariosRespuestaSchema.parse(valido.json()).comentarios[0]?.id).toBe(segundo)

    const borrado = await peticion({
      method: "DELETE",
      url: `${urlComentarios(e.claseId, publicacionId)}/${aBorrar}`,
      token: e.tokenMaestro,
    })
    expect(borrado.statusCode).toBe(204)

    const respuestas = [
      await pedir(publicacionId, aBorrar),
      await pedir(publicacionId, deOtraPublicacion),
      await pedir(publicacionId, randomUUID()),
    ]
    for (const respuesta of respuestas) {
      expect(respuesta.statusCode).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
      expect(mensajeDe(respuesta)).toBe(CURSOR_INVALIDO)
    }
    expect(respuestas[1]?.body).toBe(respuestas[0]?.body)
    expect(respuestas[2]?.body).toBe(respuestas[0]?.body)

    // La publicación se comprueba antes que el cursor: la de otra clase es 404, con o sin cursor.
    const publicacionAjena = await crearPublicacionDePrueba({
      claseId: ajeno.claseId,
      autorId: ajeno.maestro.id,
    })
    const enOtraClase = await pedir(publicacionAjena, primero)
    expect(enOtraClase.statusCode).toBe(404)
    expect(codigoDe(enOtraClase)).toBe("PUBLICACION_NO_ENCONTRADA")
    const inexistente = await pedir(randomUUID(), randomUUID())
    expect(inexistente.statusCode).toBe(404)
    expect(codigoDe(inexistente)).toBe("PUBLICACION_NO_ENCONTRADA")
  })
})

describe("mensajes en español del tipo y de la descripción (Enmienda 8, T-33)", () => {
  it("PR-C16: tipo ausente o desconocido y descripción que no es texto responden en español", async () => {
    const e = await escenario()
    const ingles = /\b(Invalid|expected|Expected|input|received)\b/

    for (const payload of [{ texto: "Hola" }, { tipo: "tarea", texto: "Hola" }]) {
      const respuesta = await publicar(e, payload)
      expect(respuesta.statusCode).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
      expect(mensajeDe(respuesta)).toBe("tipo: Elige si es un anuncio o un material")
    }

    for (const texto of [5, null]) {
      const respuesta = await publicar(e, { tipo: "material", titulo: "Guía", texto })
      expect(respuesta.statusCode).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
      expect(mensajeDe(respuesta)).toBe("texto: La descripción debe ser texto")
      expect(mensajeDe(respuesta)).not.toMatch(ingles)
    }

    // La descripción sigue siendo opcional.
    const sinDescripcion = await publicar(e, { tipo: "material", titulo: "Guía" })
    expect(sinDescripcion.statusCode).toBe(201)
    expect(await contarPublicaciones(e.claseId)).toBe(1)
  })
})
