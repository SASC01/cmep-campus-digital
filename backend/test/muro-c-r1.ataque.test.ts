import { randomUUID } from "node:crypto"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { crearComentarioSchema, crearPublicacionSchema, errorApiSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { crearComentario, crearPublicacion } from "../src/adapters/db/index.js"
import { obtenerDb } from "../src/adapters/db/cliente.js"
import { encolar } from "../src/adapters/queue/index.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { normalizarTextoLargo } from "../src/core/clases/texto.js"
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
  leerClaseDb,
  leerComentarioDb,
  leerPublicacionDb,
  leerTrabajosDeCola,
} from "./ayudas-clases.js"

// Ataque del Tester (CLASES-c, ronda 1): el muro. Cursor sin validar (N-C6 del manager; §D-A4,
// "Principio común"), concurrencia de comentar y borrar en el orden que PR-C04d no cubre, cola
// transaccional (§D-C3, PA-05), regla de contenido visible por la API (§D-C4, Enmienda 6), alcance
// de las 7 rutas con ids de otra clase y fugas en todas las respuestas (§D-C2, "Autorización").
// Cadenas con caracteres invisibles: siempre con escapes.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

interface Escenario {
  claseId: string
  otraClaseId: string
  maestro: UsuarioDePrueba
  alumno: UsuarioDePrueba
  otroAlumno: UsuarioDePrueba
  tokenMaestro: string
  tokenAlumno: string
  tokenOtroAlumno: string
}

// El maestro es dueño de las DOS clases y el alumno está inscrito en las dos: así el sexto paso
// deja pasar cualquiera de los dos claseId y solo el filtro por clase del adaptador separa los datos.
const escenario = async (): Promise<Escenario> => {
  const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Maestra R1" })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  const otra = await crearClaseDePrueba(idsClases, { maestroId: maestro.id, nombre: "Otra clase" })
  const alumno = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: "Alumna Deudora R1",
    estadoPago: "deudor",
  })
  const otroAlumno = await crearAlumnoDePrueba(idsUsuarios, { nombre: "Otro Alumno R1" })
  await inscribirDePrueba(clase.id, alumno.id, "codigo")
  await inscribirDePrueba(otra.id, alumno.id, "codigo")
  await inscribirDePrueba(clase.id, otroAlumno.id, "codigo")
  return {
    claseId: clase.id,
    otraClaseId: otra.id,
    maestro,
    alumno,
    otroAlumno,
    tokenMaestro: await tokenDe(maestro),
    tokenAlumno: await tokenDe(alumno),
    tokenOtroAlumno: await tokenDe(otroAlumno),
  }
}

const peticion = (opciones: {
  method: "GET" | "POST" | "DELETE" | "PUT"
  url: string
  token: string
  payload?: object
}): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method: opciones.method,
    url: opciones.url,
    ...(opciones.payload === undefined ? {} : { payload: opciones.payload }),
    headers: { authorization: `Bearer ${opciones.token}` },
  })

const codigoDe = (r: LightMyRequestResponse): string => errorApiSchema.parse(r.json()).error.codigo
const mensajeDe = (r: LightMyRequestResponse): string =>
  errorApiSchema.parse(r.json()).error.mensaje

const urlPublicaciones = (claseId: string): string => `/api/clases/${claseId}/publicaciones`
const urlComentarios = (claseId: string, publicacionId: string): string =>
  `/api/clases/${claseId}/publicaciones/${publicacionId}/comentarios`

const minutosAntes = (minutos: number): Date => new Date(Date.now() - minutos * 60_000)
const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

// Trabajos de cualquier cola de pg-boss cuyos datos mencionan un id (para "borrar no encola").
const trabajosQueMencionan = async (id: string): Promise<number> => {
  const [fila] = await obtenerDb().$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM pgboss.job WHERE data::text LIKE ${`%${id}%`}`
  return fila?.n ?? 0
}

// Cuántas sesiones esperan (directa o indirectamente) a la sesión `pid`.
const bloqueadosPor = async (pid: number): Promise<number> => {
  const [fila] = await obtenerDb().$queryRaw<{ n: number }[]>`
    WITH RECURSIVE bloqueados(pid) AS (
      SELECT pid FROM pg_stat_activity WHERE ${pid}::int = ANY(pg_blocking_pids(pid))
      UNION
      SELECT a.pid FROM pg_stat_activity a JOIN bloqueados b ON b.pid = ANY(pg_blocking_pids(a.pid))
    )
    SELECT count(*)::int AS n FROM bloqueados`
  return fila?.n ?? 0
}

// Retiene la fila de un comentario con FOR UPDATE, lanza las operaciones y suelta la fila cuando
// todas esperan detrás de ella (sondeo de pg_blocking_pids, sin tiempos fijos).
const conComentarioRetenido = async (
  comentarioId: string,
  operaciones: (() => Promise<LightMyRequestResponse>)[],
): Promise<LightMyRequestResponse[]> => {
  const lanzadas: Promise<LightMyRequestResponse>[] = []
  await obtenerDb().$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM comentarios WHERE id = ${comentarioId}::uuid FOR UPDATE`
      const [propio] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
      if (!propio) throw new Error("Precondición: no se obtuvo el pid de la transacción retenedora")
      for (const operacion of operaciones) lanzadas.push(operacion())
      const limite = Date.now() + 10_000
      let formadas = 0
      while (formadas < operaciones.length && Date.now() < limite) {
        formadas = await bloqueadosPor(propio.pid)
        if (formadas < operaciones.length) await esperar(25)
      }
      expect(formadas, "todas las operaciones debían esperar la fila retenida").toBe(
        operaciones.length,
      )
    },
    { timeout: 15_000 },
  )
  return Promise.all(lanzadas)
}

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

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("ataque CLASES-c r1: cursor del muro y de los comentarios (N-C6; §D-A4, principio común)", () => {
  it("publicaciones: el cursor de una publicación borrada entre dos páginas no oculta en silencio el resto del muro", async () => {
    const e = await escenario()
    const ids: string[] = []
    for (const m of [30, 20, 10]) {
      ids.push(
        await crearPublicacionDePrueba({
          claseId: e.claseId,
          autorId: e.maestro.id,
          creadoEn: minutosAntes(m),
        }),
      )
    }
    const reciente = ids[2] ?? ""
    const primera = await peticion({
      method: "GET",
      url: `${urlPublicaciones(e.claseId)}?limite=1`,
      token: e.tokenAlumno,
    })
    expect(primera.statusCode).toBe(200)
    const pagina = primera.json<{ publicaciones: { id: string }[]; siguienteCursor: string }>()
    expect(pagina.publicaciones.map((p) => p.id)).toEqual([reciente])
    expect(pagina.siguienteCursor).toBe(reciente)

    // El maestro borra la publicación que el alumno usa como cursor; el alumno pulsa "Ver más".
    await obtenerDb().publicacion.delete({ where: { id: reciente } })
    const segunda = await peticion({
      method: "GET",
      url: `${urlPublicaciones(e.claseId)}?limite=1&cursor=${reciente}`,
      token: e.tokenAlumno,
    })
    const cuerpo = segunda.json<{ publicaciones?: { id: string }[] }>()
    const vacioSilencioso = segunda.statusCode === 200 && (cuerpo.publicaciones ?? []).length === 0
    expect(
      vacioSilencioso,
      `con el cursor borrado respondió ${segunda.statusCode} ${segunda.body}, aunque siguen 2 publicaciones: "Ver más publicaciones" desaparece y el resto queda oculto (T-18 de a; §D-A4)`,
    ).toBe(false)
  })

  it("comentarios: el cursor de un comentario borrado entre dos páginas no oculta en silencio el resto", async () => {
    const e = await escenario()
    const publicacionId = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const ids: string[] = []
    for (const m of [30, 20, 10]) {
      ids.push(
        await crearComentarioDePrueba({
          publicacionId,
          autorId: e.alumno.id,
          creadoEn: minutosAntes(m),
        }),
      )
    }
    const primero = ids[0] ?? ""
    await obtenerDb().comentario.delete({ where: { id: primero } })
    const segunda = await peticion({
      method: "GET",
      url: `${urlComentarios(e.claseId, publicacionId)}?limite=1&cursor=${primero}`,
      token: e.tokenAlumno,
    })
    const cuerpo = segunda.json<{ comentarios?: { id: string }[] }>()
    const vacioSilencioso = segunda.statusCode === 200 && (cuerpo.comentarios ?? []).length === 0
    expect(
      vacioSilencioso,
      `con el cursor borrado respondió ${segunda.statusCode} ${segunda.body}, aunque quedan 2 comentarios`,
    ).toBe(false)
  })

  it("publicaciones: el id de una publicación de OTRA clase como cursor responde igual que un UUID inexistente (sin oráculo ni posición por una fila ajena)", async () => {
    const e = await escenario()
    for (const m of [30, 10]) {
      await crearPublicacionDePrueba({
        claseId: e.claseId,
        autorId: e.maestro.id,
        creadoEn: minutosAntes(m),
      })
    }
    // Clase de otro maestro, en la que nadie del escenario está.
    const ajeno = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Ajeno R1" })
    const claseAjena = await crearClaseDePrueba(idsClases, { maestroId: ajeno.id })
    const deOtraClase = await crearPublicacionDePrueba({
      claseId: claseAjena.id,
      autorId: ajeno.id,
      creadoEn: minutosAntes(20),
    })
    const conAjeno = await peticion({
      method: "GET",
      url: `${urlPublicaciones(e.claseId)}?cursor=${deOtraClase}`,
      token: e.tokenAlumno,
    })
    const conInexistente = await peticion({
      method: "GET",
      url: `${urlPublicaciones(e.claseId)}?cursor=${randomUUID()}`,
      token: e.tokenAlumno,
    })
    expect(
      { estado: conAjeno.statusCode, cuerpo: conAjeno.json<unknown>() },
      "un cursor de otra clase y uno inexistente deben responder idéntico (§D-A4: sin oráculo de existencia)",
    ).toEqual({ estado: conInexistente.statusCode, cuerpo: conInexistente.json<unknown>() })
  })

  it("comentarios: el id de un comentario de OTRA publicación como cursor responde igual que un UUID inexistente", async () => {
    const e = await escenario()
    const propia = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    for (const m of [30, 10]) {
      await crearComentarioDePrueba({
        publicacionId: propia,
        autorId: e.alumno.id,
        creadoEn: minutosAntes(m),
      })
    }
    const ajeno = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Ajeno R1" })
    const claseAjena = await crearClaseDePrueba(idsClases, { maestroId: ajeno.id })
    const deOtra = await crearPublicacionDePrueba({ claseId: claseAjena.id, autorId: ajeno.id })
    const comentarioAjeno = await crearComentarioDePrueba({
      publicacionId: deOtra,
      autorId: ajeno.id,
      creadoEn: minutosAntes(20),
    })
    const conAjeno = await peticion({
      method: "GET",
      url: `${urlComentarios(e.claseId, propia)}?cursor=${comentarioAjeno}`,
      token: e.tokenAlumno,
    })
    const conInexistente = await peticion({
      method: "GET",
      url: `${urlComentarios(e.claseId, propia)}?cursor=${randomUUID()}`,
      token: e.tokenAlumno,
    })
    expect(
      { estado: conAjeno.statusCode, cuerpo: conAjeno.json<unknown>() },
      "un cursor de un comentario ajeno y uno inexistente deben responder idéntico",
    ).toEqual({ estado: conInexistente.statusCode, cuerpo: conInexistente.json<unknown>() })
  })
})

describe("ataque CLASES-c r1: concurrencia comentar y borrar (orden inverso a PR-C04d)", () => {
  it(
    "el FOR SHARE del comentario va primero y el DELETE de la publicación espera: comentario creado, borrado 204, sin 500 ni comentario huérfano",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const publicacionId = await crearPublicacionDePrueba({
        claseId: e.claseId,
        autorId: e.maestro.id,
      })
      const comentarioId = randomUUID()
      let soltar: (() => void) | undefined
      const puerta = new Promise<void>((resolver) => (soltar = resolver))
      let avisarDentro: (() => void) | undefined
      const dentro = new Promise<void>((resolver) => (avisarDentro = resolver))

      // El adaptador real: la transacción ya tomó el FOR SHARE e insertó; alGuardar se detiene
      // hasta que el DELETE de la publicación esté formado detrás de la fila.
      const comentando = crearComentario(
        {
          id: comentarioId,
          claseId: e.claseId,
          publicacionId,
          autorId: e.alumno.id,
          texto: "Llega antes del borrado",
        },
        async (sql) => {
          avisarDentro?.()
          await puerta
          await encolar(
            COLA_COMENTARIO_CREADO,
            { comentarioId, publicacionId, claseId: e.claseId },
            { id: comentarioId, sql },
          )
        },
      )
      await dentro
      const borrando = peticion({
        method: "DELETE",
        url: `${urlPublicaciones(e.claseId)}/${publicacionId}`,
        token: e.tokenMaestro,
      })
      let esperando = 0
      for (let intento = 0; intento < 120 && esperando === 0; intento++) {
        const [fila] = await obtenerDb().$queryRaw<{ n: number }[]>`
          SELECT count(*)::int AS n FROM pg_stat_activity
          WHERE wait_event_type = 'Lock' AND query ILIKE '%DELETE%' AND query ILIKE '%publicaciones%'
            AND pid <> pg_backend_pid()`
        esperando = fila?.n ?? 0
        if (esperando === 0) await esperar(25)
      }
      soltar?.()
      expect(esperando, "el DELETE debía esperar el FOR SHARE del comentario").toBeGreaterThan(0)

      const creado = await comentando
      const borrado = await borrando
      expect(creado?.id).toBe(comentarioId)
      expect(borrado.statusCode).toBe(204)
      expect(await leerPublicacionDb(publicacionId)).toBeNull()
      expect(await leerComentarioDb(comentarioId), "el comentario cae en cascada").toBeNull()
      // Anotado para NOTIFICACIONES: el trabajo queda apuntando a un comentario ya borrado.
      expect(
        await leerTrabajosDeCola(COLA_COMENTARIO_CREADO, "comentarioId", comentarioId),
      ).toHaveLength(1)
    },
  )

  it(
    "borrar un comentario y su publicación a la vez: ningún 5xx, la publicación 204, el comentario 204 o 404, y no queda nada",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const publicacionId = await crearPublicacionDePrueba({
        claseId: e.claseId,
        autorId: e.maestro.id,
      })
      const comentarioId = await crearComentarioDePrueba({ publicacionId, autorId: e.alumno.id })
      const [delComentario, deLaPublicacion] = await conComentarioRetenido(comentarioId, [
        () =>
          peticion({
            method: "DELETE",
            url: `${urlComentarios(e.claseId, publicacionId)}/${comentarioId}`,
            token: e.tokenMaestro,
          }),
        () =>
          peticion({
            method: "DELETE",
            url: `${urlPublicaciones(e.claseId)}/${publicacionId}`,
            token: e.tokenMaestro,
          }),
      ])
      expect(deLaPublicacion?.statusCode).toBe(204)
      expect([204, 404]).toContain(delComentario?.statusCode)
      expect(await leerComentarioDb(comentarioId)).toBeNull()
      expect(await leerPublicacionDb(publicacionId)).toBeNull()
    },
  )

  it(
    "dos DELETE …/mis-comentarios/:id simultáneos: uno 204 y otro 404 COMENTARIO_NO_ENCONTRADO",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const publicacionId = await crearPublicacionDePrueba({
        claseId: e.claseId,
        autorId: e.maestro.id,
      })
      const comentarioId = await crearComentarioDePrueba({ publicacionId, autorId: e.alumno.id })
      const borrar = () =>
        peticion({
          method: "DELETE",
          url: `/api/clases/${e.claseId}/mis-comentarios/${comentarioId}`,
          token: e.tokenAlumno,
        })
      const respuestas = await conComentarioRetenido(comentarioId, [borrar, borrar])
      const estados = respuestas.map((r) => r.statusCode).sort()
      expect(estados).toEqual([204, 404])
      const negada = respuestas.find((r) => r.statusCode === 404)
      if (!negada) throw new Error("Falta la respuesta 404")
      expect(codigoDe(negada)).toBe("COMENTARIO_NO_ENCONTRADO")
    },
  )
})

describe("ataque CLASES-c r1: cola transaccional (§D-C3, PA-05)", () => {
  it("si encolar lanza de verdad (cola inexistente), ni la publicación ni el comentario quedan", async () => {
    const e = await escenario()
    const idPublicacion = randomUUID()
    await expect(
      crearPublicacion(
        {
          id: idPublicacion,
          claseId: e.claseId,
          autorId: e.maestro.id,
          tipo: "anuncio",
          titulo: null,
          texto: "No debe quedar",
        },
        (sql) =>
          encolar(
            `COLA_QUE_NO_EXISTE_${randomUUID()}`,
            { publicacionId: idPublicacion },
            { id: idPublicacion, sql },
          ),
      ),
    ).rejects.toBeDefined()
    expect(await leerPublicacionDb(idPublicacion)).toBeNull()

    const publicacionId = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const idComentario = randomUUID()
    await expect(
      crearComentario(
        {
          id: idComentario,
          claseId: e.claseId,
          publicacionId,
          autorId: e.alumno.id,
          texto: "No debe quedar",
        },
        (sql) =>
          encolar(
            `COLA_QUE_NO_EXISTE_${randomUUID()}`,
            { comentarioId: idComentario },
            { id: idComentario, sql },
          ),
      ),
    ).rejects.toBeDefined()
    expect(await leerComentarioDb(idComentario)).toBeNull()
    expect(await contarComentarios(publicacionId)).toBe(0)
  })

  it("un id de trabajo repetido no duplica el aviso en ninguna de las tres colas", async () => {
    for (const cola of [COLA_PUBLICACION_CREADA, COLA_MATERIAL_CREADO, COLA_COMENTARIO_CREADO]) {
      const id = randomUUID()
      const datos = { publicacionId: id, claseId: randomUUID() }
      await encolar(cola, datos, { id })
      await encolar(cola, datos, { id })
      expect(await leerTrabajosDeCola(cola, "publicacionId", id), cola).toHaveLength(1)
    }
  })

  it("cada trabajo hereda reintentos, deadLetter AVISO_FALLIDO y 7 días de retención; sus datos son exactamente los ids", async () => {
    const e = await escenario()
    const textoSecreto = `texto-secreto-${randomUUID()}`
    const anuncio = await peticion({
      method: "POST",
      url: urlPublicaciones(e.claseId),
      token: e.tokenMaestro,
      payload: { tipo: "anuncio", texto: textoSecreto },
    })
    const material = await peticion({
      method: "POST",
      url: urlPublicaciones(e.claseId),
      token: e.tokenMaestro,
      payload: { tipo: "material", titulo: `titulo-${textoSecreto}`, texto: textoSecreto },
    })
    expect([anuncio.statusCode, material.statusCode]).toEqual([201, 201])
    const idAnuncio = anuncio.json<{ publicacion: { id: string } }>().publicacion.id
    const idMaterial = material.json<{ publicacion: { id: string } }>().publicacion.id
    const comentario = await peticion({
      method: "POST",
      url: urlComentarios(e.claseId, idAnuncio),
      token: e.tokenAlumno,
      payload: { texto: textoSecreto },
    })
    expect(comentario.statusCode).toBe(201)
    const idComentario = comentario.json<{ comentario: { id: string } }>().comentario.id

    const casos = [
      {
        cola: COLA_PUBLICACION_CREADA,
        clave: "publicacionId",
        id: idAnuncio,
        datos: { publicacionId: idAnuncio, claseId: e.claseId },
      },
      {
        cola: COLA_MATERIAL_CREADO,
        clave: "publicacionId",
        id: idMaterial,
        datos: { publicacionId: idMaterial, claseId: e.claseId },
      },
      {
        cola: COLA_COMENTARIO_CREADO,
        clave: "comentarioId",
        id: idComentario,
        datos: { comentarioId: idComentario, publicacionId: idAnuncio, claseId: e.claseId },
      },
    ]
    for (const caso of casos) {
      const trabajos = await leerTrabajosDeCola(caso.cola, caso.clave, caso.id)
      expect(trabajos, caso.cola).toHaveLength(1)
      const [trabajo] = trabajos
      expect(trabajo?.id).toBe(caso.id)
      expect(trabajo?.retry_limit).toBe(3)
      expect(trabajo?.retry_backoff).toBe(true)
      expect(trabajo?.dead_letter).toBe(COLA_AVISO_FALLIDO)
      expect(trabajo?.retencion_s).toBe(604_800)
      expect(trabajo?.datos).toEqual(caso.datos)
      expect(JSON.stringify(trabajo?.datos)).not.toContain(textoSecreto)
      expect(JSON.stringify(trabajo?.datos)).not.toContain(e.alumno.email)
    }
    // El anuncio y el material no cruzan de cola.
    expect(await leerTrabajosDeCola(COLA_MATERIAL_CREADO, "publicacionId", idAnuncio)).toHaveLength(
      0,
    )
    expect(
      await leerTrabajosDeCola(COLA_PUBLICACION_CREADA, "publicacionId", idMaterial),
    ).toHaveLength(0)
  })

  it("borrar una publicación o un comentario no encola nada", async () => {
    const e = await escenario()
    const publicacionId = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const comentarioA = await crearComentarioDePrueba({ publicacionId, autorId: e.alumno.id })
    const comentarioB = await crearComentarioDePrueba({ publicacionId, autorId: e.alumno.id })
    const r1 = await peticion({
      method: "DELETE",
      url: `${urlComentarios(e.claseId, publicacionId)}/${comentarioA}`,
      token: e.tokenMaestro,
    })
    const r2 = await peticion({
      method: "DELETE",
      url: `/api/clases/${e.claseId}/mis-comentarios/${comentarioB}`,
      token: e.tokenAlumno,
    })
    const r3 = await peticion({
      method: "DELETE",
      url: `${urlPublicaciones(e.claseId)}/${publicacionId}`,
      token: e.tokenMaestro,
    })
    expect([r1.statusCode, r2.statusCode, r3.statusCode]).toEqual([204, 204, 204])
    for (const id of [publicacionId, comentarioA, comentarioB]) {
      expect(await trabajosQueMencionan(id), id).toBe(0)
    }
  })

  it("ningún consumidor: solo core/eventos, adapters/queue/colas.ts y handlers/clases/muro.ts nombran las colas de avisos (workers/ no)", () => {
    const raiz = fileURLToPath(new URL("../src", import.meta.url))
    const archivos: string[] = []
    const recorrer = (dir: string) => {
      for (const nombre of readdirSync(dir)) {
        const ruta = join(dir, nombre)
        if (statSync(ruta).isDirectory()) {
          if (nombre === "generated" || nombre === "node_modules") continue
          recorrer(ruta)
          continue
        }
        if (nombre.endsWith(".ts") && !nombre.endsWith(".test.ts")) archivos.push(ruta)
      }
    }
    recorrer(raiz)
    expect(archivos.length).toBeGreaterThan(20)
    const nombres =
      /COLA_(PUBLICACION_CREADA|MATERIAL_CREADO|COMENTARIO_CREADO|AVISO_FALLIDO)|colaDePublicacion|"(PUBLICACION_CREADA|MATERIAL_CREADO|COMENTARIO_CREADO|AVISO_FALLIDO)"/
    const queLasNombran = archivos
      .filter((ruta) => nombres.test(readFileSync(ruta, "utf8")))
      .map((ruta) => ruta.slice(raiz.length + 1).replaceAll("\\", "/"))
      .sort()
    expect(queLasNombran).toEqual([
      "adapters/queue/colas.ts",
      "core/eventos/avisos-de-clase.ts",
      "handlers/clases/muro.ts",
    ])
  })
})

describe("ataque CLASES-c r1: contenido visible por la API (§D-C4, Enmienda 6)", () => {
  // Solo invisibles: Cf variados, etiquetas, rellenos Hangul, Braille en blanco, U+1D159, marcas
  // combinantes sueltas, CGJ, selectores de variante, espacios Unicode y marcas de dirección.
  const SIN_VISIBLES = [
    "\u{AD}",
    "\u{180E}",
    "\u{2061}\u{2062}\u{2063}\u{2064}",
    "\u{E0041}\u{E0042}\u{E007F}",
    "\u{3164}",
    "\u{115F}\u{1160}",
    "\u{FFA0}",
    "\u{2800}\u{2800}",
    "\u{1D159}",
    "\u{301}\u{302}",
    "\u{34F}",
    "\u{FE0F}\u{E0100}",
    "\u{3000}\u{A0}\u{2003}\u{205F}",
    "\u{200E}\u{200F}",
    "\u{1D173}\u{1BCA0}",
  ]

  it(
    "anuncio, título de material y comentario sin contenido visible: 400 con el mensaje del campo vacío, sin escribir ni encolar",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const publicacionId = await crearPublicacionDePrueba({
        claseId: e.claseId,
        autorId: e.maestro.id,
      })
      const antes = await contarPublicaciones(e.claseId)
      const fallas: string[] = []
      for (const texto of SIN_VISIBLES) {
        const etiqueta = JSON.stringify(texto)
        const anuncio = await peticion({
          method: "POST",
          url: urlPublicaciones(e.claseId),
          token: e.tokenMaestro,
          payload: { tipo: "anuncio", texto },
        })
        if (anuncio.statusCode !== 400 || mensajeDe(anuncio) !== "texto: Escribe el anuncio")
          fallas.push(`anuncio ${etiqueta}: ${anuncio.statusCode} ${anuncio.body}`)
        const material = await peticion({
          method: "POST",
          url: urlPublicaciones(e.claseId),
          token: e.tokenMaestro,
          payload: { tipo: "material", titulo: texto, texto: "Descripción" },
        })
        if (
          material.statusCode !== 400 ||
          mensajeDe(material) !== "titulo: Escribe el título del material"
        )
          fallas.push(`título ${etiqueta}: ${material.statusCode} ${material.body}`)
        const comentario = await peticion({
          method: "POST",
          url: urlComentarios(e.claseId, publicacionId),
          token: e.tokenAlumno,
          payload: { texto },
        })
        if (
          comentario.statusCode !== 400 ||
          mensajeDe(comentario) !== "texto: Escribe tu comentario"
        )
          fallas.push(`comentario ${etiqueta}: ${comentario.statusCode} ${comentario.body}`)
      }
      expect(fallas).toEqual([])
      expect(await contarPublicaciones(e.claseId)).toBe(antes)
      expect(await contarComentarios(publicacionId)).toBe(0)
    },
  )

  it(
    "nombre de clase en POST y PUT: sin visibles o con uno solo, 400 «El nombre debe tener al menos 2 caracteres», sin crear ni cambiar",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const antes = await leerClaseDb(e.claseId)
      const nombres = [
        ...SIN_VISIBLES.map((s) => `${s}${s}`),
        "a\u{1D159}",
        "\u{2800}a\u{2800}",
        "\u{3164}a",
        "a\u{301}\u{301}",
        "\u{200B}a\u{200B}",
        "\u{1F44D}",
        "\u{2764}\u{FE0F}",
        "#\u{FE0F}\u{20E3}",
      ]
      const fallas: string[] = []
      for (const nombre of nombres) {
        for (const metodo of ["POST", "PUT"] as const) {
          const r = await peticion({
            method: metodo,
            url: metodo === "POST" ? "/api/clases" : `/api/clases/${e.claseId}`,
            token: e.tokenMaestro,
            payload: { nombre },
          })
          if (
            r.statusCode !== 400 ||
            mensajeDe(r) !== "nombre: El nombre debe tener al menos 2 caracteres"
          )
            fallas.push(`${metodo} ${JSON.stringify(nombre)}: ${r.statusCode} ${r.body}`)
          if (r.statusCode === 201) idsClases.push(r.json<{ clase: { id: string } }>().clase.id)
        }
      }
      expect(fallas).toEqual([])
      expect((await leerClaseDb(e.claseId))?.nombre).toBe(antes?.nombre)
    },
  )

  it(
    "emojis compuestos y otros alfabetos se aceptan en el nombre, el título, el anuncio y el comentario",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const publicacionId = await crearPublicacionDePrueba({
        claseId: e.claseId,
        autorId: e.maestro.id,
      })
      const validos = [
        "\u{1F469}\u{200D}\u{1F4BB} Programación",
        "\u{1F44D}\u{1F3FD}",
        "\u{1F1F2}\u{1F1FD}",
        "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F} Escocia",
        "#\u{FE0F}\u{20E3} 1\u{FE0F}\u{20E3}",
        "\u{200F}\u{5E9}\u{5DC}\u{5D5}\u{5DD}\u{200F}",
        "\u{645}\u{631}\u{62D}\u{628}\u{627}",
        "\u{645}\u{6CC}\u{200C}\u{62E}\u{648}\u{627}\u{647}\u{645}",
        "\u{928}\u{92E}\u{938}\u{94D}\u{924}\u{947}",
        "\u{6570}\u{5B66}",
        "\u{D55C}\u{AD6D}\u{C5B4}",
      ]
      const fallas: string[] = []
      for (const texto of validos) {
        const etiqueta = JSON.stringify(texto)
        const clase = await peticion({
          method: "POST",
          url: "/api/clases",
          token: e.tokenMaestro,
          payload: { nombre: texto },
        })
        if (clase.statusCode === 201)
          idsClases.push(clase.json<{ clase: { id: string } }>().clase.id)
        else fallas.push(`nombre ${etiqueta}: ${clase.statusCode} ${clase.body}`)
        const material = await peticion({
          method: "POST",
          url: urlPublicaciones(e.claseId),
          token: e.tokenMaestro,
          payload: { tipo: "material", titulo: texto },
        })
        if (material.statusCode !== 201)
          fallas.push(`título ${etiqueta}: ${material.statusCode} ${material.body}`)
        const anuncio = await peticion({
          method: "POST",
          url: urlPublicaciones(e.claseId),
          token: e.tokenMaestro,
          payload: { tipo: "anuncio", texto },
        })
        if (anuncio.statusCode !== 201)
          fallas.push(`anuncio ${etiqueta}: ${anuncio.statusCode} ${anuncio.body}`)
        const comentario = await peticion({
          method: "POST",
          url: urlComentarios(e.claseId, publicacionId),
          token: e.tokenAlumno,
          payload: { texto },
        })
        if (comentario.statusCode !== 201)
          fallas.push(`comentario ${etiqueta}: ${comentario.statusCode} ${comentario.body}`)
      }
      expect(fallas).toEqual([])
    },
  )

  it("CRLF y CR se normalizan antes de validar: sin visibles responde el mensaje del campo vacío (no «caracteres no permitidos») y lo válido se guarda con LF y recortado", async () => {
    const e = await escenario()
    const publicacionId = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const vacio = await peticion({
      method: "POST",
      url: urlComentarios(e.claseId, publicacionId),
      token: e.tokenAlumno,
      payload: { texto: "\r\n\u{200B}\r\n\r" },
    })
    expect(vacio.statusCode).toBe(400)
    expect(mensajeDe(vacio)).toBe("texto: Escribe tu comentario")
    const valido = await peticion({
      method: "POST",
      url: urlComentarios(e.claseId, publicacionId),
      token: e.tokenAlumno,
      payload: { texto: "\r\n  uno\r\ndos\rtres  \r\n" },
    })
    expect(valido.statusCode).toBe(201)
    const id = valido.json<{ comentario: { id: string } }>().comentario.id
    expect((await leerComentarioDb(id))?.texto).toBe("uno\ndos\ntres")
    const material = await peticion({
      method: "POST",
      url: urlPublicaciones(e.claseId),
      token: e.tokenMaestro,
      payload: { tipo: "material", titulo: "\r\nTítulo\r\n", texto: "\r\nlinea 1\r\nlinea 2\r\n" },
    })
    expect(material.statusCode).toBe(201)
    const guardada = await leerPublicacionDb(
      material.json<{ publicacion: { id: string } }>().publicacion.id,
    )
    expect(guardada?.titulo).toBe("Título")
    expect(guardada?.texto).toBe("linea 1\nlinea 2")
  })

  // C-20 (arbitraje del manager sobre T-32): la unidad de los max de cadena de shared/ es el punto
  // de código (zod 4), medido después de normalizar. Cada caso compara además la respuesta de la API
  // con el veredicto del mismo esquema de shared/ sobre el texto ya normalizado (el que usa el
  // frontend), para que los dos lados midan igual.
  it(
    "C-20: máximos en puntos de código, contados después de normalizar: 5,000/5,001; 200/201; 1,000/1,001 (con emojis de 2 unidades de UTF-16), igual que el esquema de shared/",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const publicacionId = await crearPublicacionDePrueba({
        claseId: e.claseId,
        autorId: e.maestro.id,
      })
      const emojis = (n: number) => "\u{1F44D}".repeat(n)
      const muro = urlPublicaciones(e.claseId)
      const coms = urlComentarios(e.claseId, publicacionId)
      const maestro = e.tokenMaestro
      const alumno = e.tokenAlumno
      const max5000 = "texto: No puede tener más de 5000 caracteres"
      const max200 = "titulo: No puede tener más de 200 caracteres"
      const max1000 = "texto: No puede tener más de 1000 caracteres"
      type Caso = [string, "publicacion" | "comentario", Record<string, string>, number, string?]
      const casos: Caso[] = [
        ["anuncio 5000", "publicacion", { tipo: "anuncio", texto: "a".repeat(5000) }, 201],
        ["anuncio 5001", "publicacion", { tipo: "anuncio", texto: "a".repeat(5001) }, 400, max5000],
        // 2,501 puntos de código (5,001 unidades de UTF-16): cabe.
        [
          "anuncio 2500 emojis + a",
          "publicacion",
          { tipo: "anuncio", texto: `${emojis(2500)}a` },
          201,
        ],
        // 5,000 puntos de código (10,000 unidades): cabe; uno más, no.
        ["anuncio 5000 emojis", "publicacion", { tipo: "anuncio", texto: emojis(5000) }, 201],
        [
          "anuncio 5000 emojis + a",
          "publicacion",
          { tipo: "anuncio", texto: `${emojis(5000)}a` },
          400,
          max5000,
        ],
        // Normalizar antes de medir: los CRLF de los extremos no cuentan.
        [
          "anuncio 5000 entre CRLF",
          "publicacion",
          { tipo: "anuncio", texto: `\r\n${"a".repeat(5000)}\r\n` },
          201,
        ],
        [
          "anuncio 5000 emojis entre CRLF",
          "publicacion",
          { tipo: "anuncio", texto: `\r\n${emojis(5000)}\r\n` },
          201,
        ],
        [
          "anuncio 5001 entre CRLF",
          "publicacion",
          { tipo: "anuncio", texto: `\r\n${"a".repeat(5001)}\r\n` },
          400,
          max5000,
        ],
        ["título 200", "publicacion", { tipo: "material", titulo: "t".repeat(200) }, 201],
        ["título 201", "publicacion", { tipo: "material", titulo: "t".repeat(201) }, 400, max200],
        ["título 200 emojis", "publicacion", { tipo: "material", titulo: emojis(200) }, 201],
        [
          "título 201 emojis",
          "publicacion",
          { tipo: "material", titulo: emojis(201) },
          400,
          max200,
        ],
        [
          "descripción 5000",
          "publicacion",
          { tipo: "material", titulo: "t", texto: "d".repeat(5000) },
          201,
        ],
        [
          "descripción 5001",
          "publicacion",
          { tipo: "material", titulo: "t", texto: "d".repeat(5001) },
          400,
          max5000,
        ],
        [
          "descripción 5000 emojis + d",
          "publicacion",
          { tipo: "material", titulo: "t", texto: `${emojis(5000)}d` },
          400,
          max5000,
        ],
        ["comentario 1000", "comentario", { texto: "c".repeat(1000) }, 201],
        ["comentario 1001", "comentario", { texto: "c".repeat(1001) }, 400, max1000],
        // 501 puntos de código (1,001 unidades): cabe.
        ["comentario 500 emojis + c", "comentario", { texto: `${emojis(500)}c` }, 201],
        ["comentario 1000 emojis", "comentario", { texto: emojis(1000) }, 201],
        ["comentario 1000 emojis + c", "comentario", { texto: `${emojis(1000)}c` }, 400, max1000],
      ]
      const normalizado = (payload: Record<string, string>): Record<string, string> =>
        Object.fromEntries(
          Object.entries(payload).map(([clave, valor]) => [
            clave,
            clave === "tipo" ? valor : normalizarTextoLargo(valor),
          ]),
        )
      const fallas: string[] = []
      for (const [nombre, destino, payload, estado, mensaje] of casos) {
        const r = await peticion({
          method: "POST",
          url: destino === "publicacion" ? muro : coms,
          token: destino === "publicacion" ? maestro : alumno,
          payload,
        })
        if (r.statusCode !== estado)
          fallas.push(`${nombre}: ${r.statusCode} ${r.body.slice(0, 200)}`)
        else if (mensaje !== undefined && mensajeDe(r) !== mensaje)
          fallas.push(`${nombre}: ${mensajeDe(r)}`)
        const esquema = destino === "publicacion" ? crearPublicacionSchema : crearComentarioSchema
        const aceptaShared = esquema.safeParse(normalizado(payload)).success
        if (aceptaShared !== (estado === 201))
          fallas.push(`${nombre}: el esquema de shared/ ${aceptaShared ? "acepta" : "rechaza"}`)
      }
      expect(fallas).toEqual([])
    },
  )

  it(
    "caracteres de control (salvo \\n y \\t) e inversores de dirección: 400 «El texto tiene caracteres no permitidos»",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const publicacionId = await crearPublicacionDePrueba({
        claseId: e.claseId,
        autorId: e.maestro.id,
      })
      const malos = [
        "hola\u{7}",
        "a\u{0}b",
        "a\u{1B}b",
        "a\u{7F}b",
        "a\u{85}b",
        "a\u{202E}b",
        "a\u{2066}b",
        "a\u{2069}b",
        "a\u{202A}b",
      ]
      const fallas: string[] = []
      for (const texto of malos) {
        const casos: [string, string, string, object, string][] = [
          [
            "anuncio",
            urlPublicaciones(e.claseId),
            e.tokenMaestro,
            { tipo: "anuncio", texto },
            "texto",
          ],
          [
            "título",
            urlPublicaciones(e.claseId),
            e.tokenMaestro,
            { tipo: "material", titulo: texto },
            "titulo",
          ],
          [
            "descripción",
            urlPublicaciones(e.claseId),
            e.tokenMaestro,
            { tipo: "material", titulo: "t", texto },
            "texto",
          ],
          [
            "comentario",
            urlComentarios(e.claseId, publicacionId),
            e.tokenAlumno,
            { texto },
            "texto",
          ],
        ]
        for (const [nombre, url, token, payload, campo] of casos) {
          const r = await peticion({ method: "POST", url, token, payload })
          if (
            r.statusCode !== 400 ||
            mensajeDe(r) !== `${campo}: El texto tiene caracteres no permitidos`
          )
            fallas.push(`${nombre} ${JSON.stringify(texto)}: ${r.statusCode} ${r.body}`)
        }
      }
      const conTab = await peticion({
        method: "POST",
        url: urlComentarios(e.claseId, publicacionId),
        token: e.tokenAlumno,
        payload: { texto: "a\tb\nc" },
      })
      expect(conTab.statusCode).toBe(201)
      expect(fallas).toEqual([])
    },
  )

  it(
    "campos ausentes o que no son texto responden en español (N-C3 y punto 4 del manager), también el tipo y la descripción del material",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const publicacionId = await crearPublicacionDePrueba({
        claseId: e.claseId,
        autorId: e.maestro.id,
      })
      const muro = urlPublicaciones(e.claseId)
      const coms = urlComentarios(e.claseId, publicacionId)
      const casos: [string, string, string, object][] = [
        ["anuncio sin texto", muro, e.tokenMaestro, { tipo: "anuncio" }],
        ["anuncio texto número", muro, e.tokenMaestro, { tipo: "anuncio", texto: 5 }],
        ["material sin título", muro, e.tokenMaestro, { tipo: "material" }],
        ["material título nulo", muro, e.tokenMaestro, { tipo: "material", titulo: null }],
        [
          "material descripción número",
          muro,
          e.tokenMaestro,
          { tipo: "material", titulo: "t", texto: 5 },
        ],
        [
          "material descripción nula",
          muro,
          e.tokenMaestro,
          { tipo: "material", titulo: "t", texto: null },
        ],
        ["sin tipo", muro, e.tokenMaestro, { texto: "hola" }],
        ["tipo desconocido", muro, e.tokenMaestro, { tipo: "tarea", texto: "hola" }],
        ["comentario sin texto", coms, e.tokenAlumno, {}],
        ["comentario texto arreglo", coms, e.tokenAlumno, { texto: ["a"] }],
      ]
      // Mensajes de zod por defecto (en inglés) que no deben llegar a la API.
      const enIngles = /Invalid|expected|received|discriminator|Required/
      const fallas: string[] = []
      for (const [nombre, url, token, payload] of casos) {
        const r = await peticion({ method: "POST", url, token, payload })
        if (r.statusCode !== 400) {
          fallas.push(`${nombre}: ${r.statusCode}`)
          continue
        }
        if (enIngles.test(mensajeDe(r))) fallas.push(`${nombre}: «${mensajeDe(r)}»`)
      }
      expect(fallas).toEqual([])
    },
  )

  it("ninguna copia de la regla fuera de shared/: Default_Ignorable_Code_Point, U+2800 y U+1D159 no aparecen en el código de backend/src ni de frontend/src", () => {
    const raices = [
      fileURLToPath(new URL("../src", import.meta.url)),
      fileURLToPath(new URL("../../frontend/src", import.meta.url)),
    ]
    const encontrados: string[] = []
    const patron =
      /Default_Ignorable_Code_Point|\\u2800|\\u\{2800\}|\\u\{1D159\}|\\u\{1d159\}|contarCaracteresVisibles\s*=|CARACTER_VISIBLE/
    const recorrer = (dir: string) => {
      for (const nombre of readdirSync(dir)) {
        const ruta = join(dir, nombre)
        if (statSync(ruta).isDirectory()) {
          if (nombre === "generated" || nombre === "node_modules") continue
          recorrer(ruta)
          continue
        }
        if (!/\.(ts|tsx)$/.test(nombre) || /\.test\.tsx?$/.test(nombre)) continue
        const contenido = readFileSync(ruta, "utf8")
        if (
          patron.test(contenido) ||
          contenido.includes("\u{2800}") ||
          contenido.includes("\u{1D159}")
        )
          encontrados.push(ruta)
      }
    }
    for (const raiz of raices) recorrer(raiz)
    expect(raices.every((raiz) => statSync(raiz).isDirectory())).toBe(true)
    expect(encontrados).toEqual([])
  })
})

describe("ataque CLASES-c r1: alcance de las 7 rutas con ids de otra clase y fugas (§D-C2, «Autorización»)", () => {
  it(
    "con el claseId propio y la publicación o el comentario de OTRA clase del mismo maestro: 404 en las rutas con id, sin escribir, borrar ni encolar",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const propia = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
      const ajena = await crearPublicacionDePrueba({
        claseId: e.otraClaseId,
        autorId: e.maestro.id,
      })
      const comentarioAjeno = await crearComentarioDePrueba({
        publicacionId: ajena,
        autorId: e.alumno.id,
      })
      const delAlumnoEnLaOtra = await crearComentarioDePrueba({
        publicacionId: ajena,
        autorId: e.alumno.id,
      })
      const muro = urlPublicaciones(e.claseId)
      const respuestas: Record<string, LightMyRequestResponse> = {
        borrarPublicacion: await peticion({
          method: "DELETE",
          url: `${muro}/${ajena}`,
          token: e.tokenMaestro,
        }),
        listarComentarios: await peticion({
          method: "GET",
          url: urlComentarios(e.claseId, ajena),
          token: e.tokenAlumno,
        }),
        comentarComoAlumno: await peticion({
          method: "POST",
          url: urlComentarios(e.claseId, ajena),
          token: e.tokenAlumno,
          payload: { texto: "No debe entrar" },
        }),
        comentarComoMaestro: await peticion({
          method: "POST",
          url: urlComentarios(e.claseId, ajena),
          token: e.tokenMaestro,
          payload: { texto: "No debe entrar" },
        }),
        borrarComentarioConPublicacionPropia: await peticion({
          method: "DELETE",
          url: `${urlComentarios(e.claseId, propia)}/${comentarioAjeno}`,
          token: e.tokenMaestro,
        }),
        borrarComentarioConPublicacionAjena: await peticion({
          method: "DELETE",
          url: `${urlComentarios(e.claseId, ajena)}/${comentarioAjeno}`,
          token: e.tokenMaestro,
        }),
        misComentariosDeLaOtraClase: await peticion({
          method: "DELETE",
          url: `/api/clases/${e.claseId}/mis-comentarios/${delAlumnoEnLaOtra}`,
          token: e.tokenAlumno,
        }),
      }
      const estados = Object.fromEntries(
        Object.entries(respuestas).map(([clave, r]) => [
          clave,
          `${r.statusCode} ${r.statusCode === 404 ? codigoDe(r) : r.body}`,
        ]),
      )
      expect(estados).toEqual({
        borrarPublicacion: "404 PUBLICACION_NO_ENCONTRADA",
        listarComentarios: "404 PUBLICACION_NO_ENCONTRADA",
        comentarComoAlumno: "404 PUBLICACION_NO_ENCONTRADA",
        comentarComoMaestro: "404 PUBLICACION_NO_ENCONTRADA",
        borrarComentarioConPublicacionPropia: "404 COMENTARIO_NO_ENCONTRADO",
        borrarComentarioConPublicacionAjena: "404 COMENTARIO_NO_ENCONTRADO",
        misComentariosDeLaOtraClase: "404 COMENTARIO_NO_ENCONTRADO",
      })
      expect(await leerPublicacionDb(ajena)).not.toBeNull()
      expect(await contarComentarios(ajena)).toBe(2)
      expect(await leerComentarioDb(comentarioAjeno)).not.toBeNull()
      expect(await leerComentarioDb(delAlumnoEnLaOtra)).not.toBeNull()
      expect(await trabajosQueMencionan(ajena)).toBe(0)
      // El GET del muro con el claseId propio no trae la publicación de la otra clase.
      const lista = await peticion({ method: "GET", url: muro, token: e.tokenAlumno })
      expect(
        lista.json<{ publicaciones: { id: string }[] }>().publicaciones.map((p) => p.id),
      ).toEqual([propia])
    },
  )

  it("un comentario de otra publicación de la MISMA clase en DELETE …/publicaciones/:publicacionId/comentarios/:comentarioId: 404 y sigue", async () => {
    const e = await escenario()
    const p1 = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const p2 = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const deP2 = await crearComentarioDePrueba({ publicacionId: p2, autorId: e.alumno.id })
    const r = await peticion({
      method: "DELETE",
      url: `${urlComentarios(e.claseId, p1)}/${deP2}`,
      token: e.tokenMaestro,
    })
    expect(r.statusCode).toBe(404)
    expect(codigoDe(r)).toBe("COMENTARIO_NO_ENCONTRADO")
    expect(await leerComentarioDb(deP2)).not.toBeNull()
  })

  it("«mis comentarios» con el comentario del maestro o de otro alumno: 404 y sigue; el maestro tampoco borra por ahí el de un alumno", async () => {
    const e = await escenario()
    const p = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const delMaestro = await crearComentarioDePrueba({ publicacionId: p, autorId: e.maestro.id })
    const delOtro = await crearComentarioDePrueba({ publicacionId: p, autorId: e.otroAlumno.id })
    const mis = (id: string) => `/api/clases/${e.claseId}/mis-comentarios/${id}`
    const r1 = await peticion({ method: "DELETE", url: mis(delMaestro), token: e.tokenAlumno })
    const r2 = await peticion({ method: "DELETE", url: mis(delOtro), token: e.tokenAlumno })
    const r3 = await peticion({ method: "DELETE", url: mis(delOtro), token: e.tokenMaestro })
    expect([r1.statusCode, r2.statusCode, r3.statusCode]).toEqual([404, 404, 404])
    expect(await leerComentarioDb(delMaestro)).not.toBeNull()
    expect(await leerComentarioDb(delOtro)).not.toBeNull()
  })

  it(
    "ninguna respuesta del muro (listas, creación, autor) trae estadoPago, accesoRestringido, email ni el correo; «propio» correcto para alumno, compañero y maestro",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const publicada = await peticion({
        method: "POST",
        url: urlPublicaciones(e.claseId),
        token: e.tokenMaestro,
        payload: { tipo: "anuncio", texto: "Hola" },
      })
      const publicacionId = publicada.json<{ publicacion: { id: string } }>().publicacion.id
      const coms = urlComentarios(e.claseId, publicacionId)
      const delAlumno = await peticion({
        method: "POST",
        url: coms,
        token: e.tokenAlumno,
        payload: { texto: "Soy la alumna" },
      })
      const delMaestro = await peticion({
        method: "POST",
        url: coms,
        token: e.tokenMaestro,
        payload: { texto: "Soy la maestra" },
      })
      const muro = urlPublicaciones(e.claseId)
      const comentariosAlumno = await peticion({ method: "GET", url: coms, token: e.tokenAlumno })
      const comentariosOtro = await peticion({ method: "GET", url: coms, token: e.tokenOtroAlumno })
      const comentariosMaestro = await peticion({ method: "GET", url: coms, token: e.tokenMaestro })
      const todas = [
        publicada,
        delAlumno,
        delMaestro,
        await peticion({ method: "GET", url: muro, token: e.tokenAlumno }),
        await peticion({ method: "GET", url: muro, token: e.tokenOtroAlumno }),
        await peticion({ method: "GET", url: muro, token: e.tokenMaestro }),
        comentariosAlumno,
        comentariosOtro,
        comentariosMaestro,
      ]
      const prohibidas = [
        "estadoPago",
        "accesoRestringido",
        "email",
        "correo",
        "correoEnmascarado",
        "rol",
        "motivoRestriccion",
        "hashContrasena",
      ]
      for (const r of todas) {
        expect(r.statusCode).toBeLessThan(300)
        const claves = clavesDe(r.json())
        for (const prohibida of prohibidas) expect(claves).not.toContain(prohibida)
        expect(r.body).not.toContain(e.alumno.email)
        expect(r.body).not.toContain(e.maestro.email)
        expect(r.body).not.toContain("deudor")
      }
      const propios = (r: LightMyRequestResponse) =>
        r
          .json<{ comentarios: { texto: string; propio: boolean }[] }>()
          .comentarios.map((c) => [c.texto, c.propio])
      expect(propios(comentariosAlumno)).toEqual([
        ["Soy la alumna", true],
        ["Soy la maestra", false],
      ])
      expect(propios(comentariosOtro)).toEqual([
        ["Soy la alumna", false],
        ["Soy la maestra", false],
      ])
      expect(propios(comentariosMaestro)).toEqual([
        ["Soy la alumna", false],
        ["Soy la maestra", true],
      ])
      expect(delAlumno.json<{ comentario: { propio: boolean } }>().comentario.propio).toBe(true)
    },
  )

  it("rol por la API (punto 11 del manager): un estudiante inscrito no publica, ni borra publicaciones o el comentario de otro por la ruta del maestro (403 ROL_NO_PERMITIDO)", async () => {
    const e = await escenario()
    const p = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const c = await crearComentarioDePrueba({ publicacionId: p, autorId: e.otroAlumno.id })
    const rs = [
      await peticion({
        method: "POST",
        url: urlPublicaciones(e.claseId),
        token: e.tokenAlumno,
        payload: { tipo: "anuncio", texto: "x" },
      }),
      await peticion({
        method: "DELETE",
        url: `${urlPublicaciones(e.claseId)}/${p}`,
        token: e.tokenAlumno,
      }),
      await peticion({
        method: "DELETE",
        url: `${urlComentarios(e.claseId, p)}/${c}`,
        token: e.tokenAlumno,
      }),
    ]
    expect(rs.map((r) => `${r.statusCode} ${codigoDe(r)}`)).toEqual([
      "403 ROL_NO_PERMITIDO",
      "403 ROL_NO_PERMITIDO",
      "403 ROL_NO_PERMITIDO",
    ])
    expect(await contarPublicaciones(e.claseId)).toBe(1)
    expect(await leerComentarioDb(c)).not.toBeNull()
  })
})
