import { randomUUID } from "node:crypto"

import {
  errorApiSchema,
  solicitarSubidaRespuestaSchema,
  tareaRespuestaSchema,
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
  desactivarUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
  leerArchivoDb,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { crearEntregaDePrueba } from "./ayudas-entregas.js"
import { cuerpoDeTarea } from "./ayudas-tareas.js"

// ENTREGAS-01b (S-06 modificada por el humano, §D-3.8; PR-1B22). Una tarea con entregas (entregado o
// calificado) no se borra sin ?confirmar=entregas, y solo el admin puede confirmarlo. En cada 409 se
// toma una foto antes y después (publicación, tarea, criterios, entregas, hilos, archivos y trabajos
// de la cola) y la foto no cambia.

let app: FastifyInstance | undefined
const almacen: AlmacenEnMemoria = crearAlmacenEnMemoria()
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const pedir = (
  token: string,
  method: "GET" | "POST" | "DELETE",
  url: string,
  payload?: InjectOptions["payload"],
): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method,
    url,
    ...(payload === undefined ? {} : { payload }),
    headers: { authorization: `Bearer ${token}` },
  })

const errorDe = (respuesta: LightMyRequestResponse) => errorApiSchema.parse(respuesta.json()).error

interface Alumno {
  usuario: UsuarioDePrueba
  token: string
}

interface Escenario {
  claseId: string
  tareaId: string
  maestro: UsuarioDePrueba
  otroMaestro: UsuarioDePrueba
  alumnos: Alumno[]
  tokens: { maestro: string; otroMaestro: string; admin: string }
  // Todos los archivos del escenario (de la publicación y de las entregas), para la foto.
  archivos: string[]
}

// La tarea se crea por la API (con dos criterios, un adjunto y sus trabajos TAREA_CREADA y
// RECORDATORIO_24H); el otro maestro también da la clase.
const escenario = async (cuantosAlumnos: number): Promise<Escenario> => {
  const ficha = randomUUID().slice(0, 6)
  const maestro = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Maestra Borra ${ficha}`,
    rol: "maestro",
  })
  const otroMaestro = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Maestro Otro ${ficha}`,
    rol: "maestro",
  })
  const clase = await crearClaseDePrueba(idsClases, {
    maestroId: maestro.id,
    maestroIds: [maestro.id, otroMaestro.id],
  })
  const alumnos: Alumno[] = []
  for (let i = 0; i < cuantosAlumnos; i += 1) {
    const usuario = await crearAlumnoDePrueba(idsUsuarios, {
      nombre: `Alumno ${String(i)} ${ficha}`,
    })
    await inscribirDePrueba(clase.id, usuario.id)
    alumnos.push({ usuario, token: await firmarTokenDePrueba({ usuarioId: usuario.id }) })
  }
  const tokenMaestro = await firmarTokenDePrueba({ usuarioId: maestro.id })
  const material = await pedir(tokenMaestro, "POST", `/api/clases/${clase.id}/archivos`, {
    nombre: "guia.pdf",
    tipo: "application/pdf",
    tamano: 100,
  })
  expect(material.statusCode, material.body).toBe(201)
  const adjunto = solicitarSubidaRespuestaSchema.parse(material.json()).archivo.id
  const filaAdjunto = await leerArchivoDb(adjunto)
  if (filaAdjunto === null) throw new Error("Precondición: existe el adjunto pendiente")
  almacen.subir(filaAdjunto.claveObjeto, { tamano: 100, tipo: "application/pdf" })
  const creada = await pedir(
    tokenMaestro,
    "POST",
    `/api/clases/${clase.id}/tareas`,
    cuerpoDeTarea({
      archivoIds: [adjunto],
      rubrica: [
        { criterio: "Contenido", puntosMax: 60 },
        { criterio: "Forma", puntosMax: 40 },
      ],
    }),
  )
  expect(creada.statusCode, creada.body).toBe(201)
  return {
    claseId: clase.id,
    tareaId: tareaRespuestaSchema.parse(creada.json()).tarea.id,
    maestro,
    otroMaestro,
    alumnos,
    tokens: {
      maestro: tokenMaestro,
      otroMaestro: await firmarTokenDePrueba({ usuarioId: otroMaestro.id }),
      admin: await tokenDelAdminDePrueba(),
    },
    archivos: [adjunto],
  }
}

const alumnoEn = (e: Escenario, i: number): Alumno => {
  const alumno = e.alumnos[i]
  if (alumno === undefined) throw new Error(`Precondición: existe el alumno ${String(i)}`)
  return alumno
}

const urlTarea = (e: Escenario, consulta = ""): string =>
  `/api/clases/${e.claseId}/tareas/${e.tareaId}${consulta}`

// El alumno entrega por la API un archivo y un enlace (deja su ENTREGA_REALIZADA en la cola).
const entregarComo = async (e: Escenario, alumno: Alumno): Promise<void> => {
  const subida = await pedir(alumno.token, "POST", `${urlTarea(e)}/entrega/archivos`, {
    nombre: "trabajo.pdf",
    tipo: "application/pdf",
    tamano: 700,
  })
  expect(subida.statusCode, subida.body).toBe(201)
  const { archivo } = solicitarSubidaRespuestaSchema.parse(subida.json())
  const fila = await leerArchivoDb(archivo.id)
  if (fila === null) throw new Error("Precondición: existe el archivo de la entrega")
  almacen.subir(fila.claveObjeto, { tamano: 700, tipo: "application/pdf" })
  e.archivos.push(archivo.id)
  const respuesta = await pedir(alumno.token, "POST", `${urlTarea(e)}/entrega`, {
    archivoIds: [archivo.id],
    enlaces: ["https://ejemplo.com/"],
  })
  expect(respuesta.statusCode, respuesta.body).toBe(200)
}

// Un comentario del hilo privado fabricado (el hilo llega en 01c) sobre la fila de entrega del alumno.
const comentarEnElHilo = async (e: Escenario, alumno: Alumno): Promise<string> => {
  const id = randomUUID()
  await obtenerDb().$executeRaw`
    INSERT INTO entregas (tarea_id, alumno_id)
    VALUES (${e.tareaId}::uuid, ${alumno.usuario.id}::uuid)
    ON CONFLICT (tarea_id, alumno_id) DO NOTHING`
  await obtenerDb().$executeRaw`
    INSERT INTO comentarios (id, entrega_id, autor_id, texto)
    SELECT ${id}::uuid, id, ${alumno.usuario.id}::uuid, 'Comentario privado'
    FROM entregas WHERE tarea_id = ${e.tareaId}::uuid AND alumno_id = ${alumno.usuario.id}::uuid`
  return id
}

const foto = async (e: Escenario) => {
  const db = obtenerDb()
  return {
    publicacion: await db.publicacion.findUnique({ where: { id: e.tareaId } }),
    tarea: await db.tarea.findUnique({ where: { id: e.tareaId } }),
    criterios: await db.criterioRubrica.findMany({
      where: { tareaId: e.tareaId },
      orderBy: { orden: "asc" },
    }),
    entregas: await db.entrega.findMany({
      where: { tareaId: e.tareaId },
      orderBy: { alumnoId: "asc" },
      select: { id: true, alumnoId: true, estado: true, version: true },
    }),
    comentarios: await db.comentario.findMany({
      where: { entrega: { tareaId: e.tareaId } },
      orderBy: { id: "asc" },
    }),
    archivos: await db.archivo.findMany({
      where: { id: { in: e.archivos } },
      orderBy: { id: "asc" },
      select: { id: true, estado: true, publicacionId: true, entregaId: true },
    }),
    trabajos: await db.$queryRaw<{ id: string; name: string; state: string }[]>`
      SELECT id::text AS id, name, state::text AS state
      FROM pgboss.job
      WHERE name IN ('RECORDATORIO_24H', 'TAREA_CREADA', 'ENTREGA_REALIZADA')
        AND data ->> 'tareaId' = ${e.tareaId}::text
      ORDER BY name ASC, id ASC`,
  }
}

const MENSAJE_MAESTRO_1 =
  "Esta tarea tiene 1 entrega y no se puede borrar. Si de verdad hay que borrarla, pídelo a administración."
const mensajeMaestro = (n: number): string =>
  `Esta tarea tiene ${String(n)} entregas y no se puede borrar. Si de verdad hay que borrarla, pídelo a administración.`
const MENSAJE_ADMIN_1 =
  "Esta tarea tiene 1 entrega. Si la borras, también se borrarán la entrega y los comentarios privados, y no se puede deshacer."
const mensajeAdmin = (n: number): string =>
  `Esta tarea tiene ${String(n)} entregas. Si la borras, también se borrarán las entregas y los comentarios privados, y no se puede deshacer.`

// Borra y exige el 409 con el mensaje dado, sin ningún cambio en la foto.
const rechazaSinCambios = async (
  e: Escenario,
  token: string,
  consulta: string,
  mensaje: string,
): Promise<void> => {
  const antes = await foto(e)
  expect(antes.tarea, "Precondición: la tarea existe").not.toBeNull()
  const respuesta = await pedir(token, "DELETE", urlTarea(e, consulta))
  expect(respuesta.statusCode, respuesta.body).toBe(409)
  expect(errorDe(respuesta)).toEqual({ codigo: "TAREA_CON_ENTREGAS", mensaje })
  expect(await foto(e)).toEqual(antes)
}

describe("borrar una tarea con entregas (PR-1B22)", () => {
  it("PR-1B22 (a): el maestro autor con 2 entregas recibe 409 TAREA_CON_ENTREGAS con el mensaje en plural y nada cambia", async () => {
    const e = await escenario(3)
    await entregarComo(e, alumnoEn(e, 0))
    await entregarComo(e, alumnoEn(e, 1))
    await comentarEnElHilo(e, alumnoEn(e, 2))
    await rechazaSinCambios(e, e.tokens.maestro, "", mensajeMaestro(2))
  })

  it("PR-1B22 (b): el maestro con 1 entrega recibe el mensaje en singular y nada cambia", async () => {
    const e = await escenario(1)
    await entregarComo(e, alumnoEn(e, 0))
    await rechazaSinCambios(e, e.tokens.maestro, "", MENSAJE_MAESTRO_1)
  })

  it("PR-1B22 (c): el admin sin parámetro, con 1 y con 3 entregas, recibe 409 con su mensaje en singular y en plural, y nada cambia", async () => {
    const uno = await escenario(1)
    await entregarComo(uno, alumnoEn(uno, 0))
    await rechazaSinCambios(uno, uno.tokens.admin, "", MENSAJE_ADMIN_1)

    const tres = await escenario(3)
    for (const alumno of tres.alumnos) await entregarComo(tres, alumno)
    await rechazaSinCambios(tres, tres.tokens.admin, "", mensajeAdmin(3))
  })

  it("PR-1B22 (d): el admin con ?confirmar=entregas borra con 204: no quedan publicación, tarea, criterios, entregas (también las asignado) ni hilos; los archivos quedan descartado sin contexto y los trabajos de la tarea cancelados", async () => {
    const e = await escenario(3)
    await entregarComo(e, alumnoEn(e, 0))
    await entregarComo(e, alumnoEn(e, 1))
    const comentarioId = await comentarEnElHilo(e, alumnoEn(e, 2))
    const antes = await foto(e)
    expect(antes.entregas.map((f) => f.estado).sort()).toEqual([
      "asignado",
      "entregado",
      "entregado",
    ])

    const respuesta = await pedir(e.tokens.admin, "DELETE", urlTarea(e, "?confirmar=entregas"))

    expect(respuesta.statusCode, respuesta.body).toBe(204)
    const despues = await foto(e)
    expect(despues.publicacion).toBeNull()
    expect(despues.tarea).toBeNull()
    expect(despues.criterios).toEqual([])
    expect(despues.entregas).toEqual([])
    expect(despues.comentarios).toEqual([])
    expect(await obtenerDb().comentario.count({ where: { id: comentarioId } })).toBe(0)
    expect(despues.archivos).toHaveLength(3)
    for (const archivo of despues.archivos) {
      expect(archivo).toMatchObject({ estado: "descartado", publicacionId: null, entregaId: null })
    }
    const estados = Object.fromEntries(
      ["RECORDATORIO_24H", "TAREA_CREADA"].map((nombre) => [
        nombre,
        despues.trabajos.filter((t) => t.name === nombre).map((t) => t.state),
      ]),
    )
    expect(estados).toEqual({ RECORDATORIO_24H: ["cancelled"], TAREA_CREADA: ["cancelled"] })
  })

  it("PR-1B22 (e): el maestro con ?confirmar=entregas y entregas recibe el mismo 409 del maestro (nunca 403 ni 204); sin entregas, la misma petición borra con 204", async () => {
    const e = await escenario(2)
    await entregarComo(e, alumnoEn(e, 0))
    await entregarComo(e, alumnoEn(e, 1))
    await rechazaSinCambios(e, e.tokens.maestro, "?confirmar=entregas", mensajeMaestro(2))

    const sinEntregas = await escenario(1)
    const respuesta = await pedir(
      sinEntregas.tokens.maestro,
      "DELETE",
      urlTarea(sinEntregas, "?confirmar=entregas"),
    )
    expect(respuesta.statusCode, respuesta.body).toBe(204)
    expect((await foto(sinEntregas)).tarea).toBeNull()
  })

  it("PR-1B22 (f): con solo filas asignado (una con hilo privado y otra anulada, con su archivo ya descartado), el maestro autor borra con 204 sin parámetro y el hilo se va con la tarea", async () => {
    const e = await escenario(2)
    const comentarioId = await comentarEnElHilo(e, alumnoEn(e, 0))
    await entregarComo(e, alumnoEn(e, 1))
    const anulada = await pedir(alumnoEn(e, 1).token, "POST", `${urlTarea(e)}/entrega/anular`)
    expect(anulada.statusCode, anulada.body).toBe(200)
    const antes = await foto(e)
    expect(antes.entregas.map((f) => f.estado)).toEqual(["asignado", "asignado"])

    const respuesta = await pedir(e.tokens.maestro, "DELETE", urlTarea(e))

    expect(respuesta.statusCode, respuesta.body).toBe(204)
    const despues = await foto(e)
    expect(despues.tarea).toBeNull()
    expect(despues.entregas).toEqual([])
    expect(await obtenerDb().comentario.count({ where: { id: comentarioId } })).toBe(0)
    for (const archivo of despues.archivos) {
      expect(archivo).toMatchObject({ estado: "descartado", publicacionId: null, entregaId: null })
    }
  })

  it("PR-1B22 (g): cuentan una entrega calificada (puesta a mano), la de un alumno dado de baja y la de uno desactivado", async () => {
    const e = await escenario(3)
    const [calificado, deBaja, desactivado] = e.alumnos
    if (!calificado || !deBaja || !desactivado) throw new Error("Precondición: tres alumnos")
    await crearEntregaDePrueba({
      tareaId: e.tareaId,
      alumnoId: calificado.usuario.id,
      estado: "calificado",
    })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: deBaja.usuario.id })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: desactivado.usuario.id })
    await obtenerDb().inscripcion.delete({
      where: { claseId_usuarioId: { claseId: e.claseId, usuarioId: deBaja.usuario.id } },
    })
    await desactivarUsuarioDePrueba(desactivado.usuario.id)

    await rechazaSinCambios(e, e.tokens.maestro, "", mensajeMaestro(3))
    await rechazaSinCambios(e, e.tokens.admin, "", mensajeAdmin(3))
  })

  it("PR-1B22 (h): el maestro que no puede borrar (el autor sigue en la clase) recibe 403 BORRADO_NO_PERMITIDO sin el conteo, y una tarea de otra clase con entregas responde 404 TAREA_NO_ENCONTRADA", async () => {
    const e = await escenario(2)
    await entregarComo(e, alumnoEn(e, 0))
    await entregarComo(e, alumnoEn(e, 1))
    const antes = await foto(e)

    const ajeno = await pedir(e.tokens.otroMaestro, "DELETE", urlTarea(e))
    expect(ajeno.statusCode, ajeno.body).toBe(403)
    expect(errorDe(ajeno).codigo).toBe("BORRADO_NO_PERMITIDO")
    expect(ajeno.body).not.toMatch(/entrega|\b2\b/i)

    const otra = await escenario(0)
    const deOtraClase = await pedir(
      otra.tokens.maestro,
      "DELETE",
      `/api/clases/${otra.claseId}/tareas/${e.tareaId}`,
    )
    expect(deOtraClase.statusCode, deOtraClase.body).toBe(404)
    expect(errorDe(deOtraClase).codigo).toBe("TAREA_NO_ENCONTRADA")
    expect(await foto(e)).toEqual(antes)
  })

  it("PR-1B22 (i): una consulta inválida responde 400 VALIDACION sin escribir, para el maestro y el admin; sin consulta y sin entregas, 204 como siempre", async () => {
    const e = await escenario(1)
    await entregarComo(e, alumnoEn(e, 0))
    const antes = await foto(e)
    const consultas = [
      "?confirmar=true",
      "?confirmar=ENTREGAS",
      "?confirmar=",
      "?confirmar=entregas&confirmar=entregas",
      "?confirmarEntregas=true",
    ]
    for (const token of [e.tokens.maestro, e.tokens.admin]) {
      for (const consulta of consultas) {
        const respuesta = await pedir(token, "DELETE", urlTarea(e, consulta))
        expect(respuesta.statusCode, `${consulta}: ${respuesta.body}`).toBe(400)
        expect(errorDe(respuesta).codigo).toBe("VALIDACION")
      }
    }
    expect(await foto(e)).toEqual(antes)

    const sinEntregas = await escenario(0)
    const respuesta = await pedir(sinEntregas.tokens.maestro, "DELETE", urlTarea(sinEntregas))
    expect(respuesta.statusCode, respuesta.body).toBe(204)
  })

  it("PR-1B22 (j): un estudiante con ?confirmar=entregas recibe 403 ROL_NO_PERMITIDO y un alumno restringido 403 ACCESO_RESTRINGIDO; nada cambia", async () => {
    const e = await escenario(1)
    await entregarComo(e, alumnoEn(e, 0))
    const restringido = await crearUsuarioDePrueba(idsUsuarios, {
      rol: "estudiante",
      accesoRestringido: true,
    })
    await inscribirDePrueba(e.claseId, restringido.id)
    const antes = await foto(e)

    const estudiante = await pedir(
      alumnoEn(e, 0).token,
      "DELETE",
      urlTarea(e, "?confirmar=entregas"),
    )
    expect(estudiante.statusCode, estudiante.body).toBe(403)
    expect(errorDe(estudiante).codigo).toBe("ROL_NO_PERMITIDO")

    const conRestriccion = await pedir(
      await firmarTokenDePrueba({ usuarioId: restringido.id }),
      "DELETE",
      urlTarea(e, "?confirmar=entregas"),
    )
    expect(conRestriccion.statusCode, conRestriccion.body).toBe(403)
    expect(errorDe(conRestriccion).codigo).toBe("ACCESO_RESTRINGIDO")
    expect(await foto(e)).toEqual(antes)
  })
})
