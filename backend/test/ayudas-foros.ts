import { randomUUID } from "node:crypto"

import { errorApiSchema } from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { crearUsuarioDePrueba, firmarTokenDePrueba, type UsuarioDePrueba } from "./ayudas-auth.js"
import { crearClaseDePrueba, inscribirDePrueba, tokenDelAdminDePrueba } from "./ayudas-clases.js"

// FORO-01a. Ayudas de las pruebas del foro: el escenario de una clase con su maestro, dos alumnos, el
// admin y personas ajenas; foros y participaciones sembrados directo en la base desechable (sin pasar
// por la API ni por la cola, para fechas límite ya vencidas); y las peticiones. Se limpian solas:
// foros, participaciones y entregas mueren en cascada con su clase (borrarMovimientosYClasesDePrueba
// antes que los usuarios, N-10).

export const HORA_MS = 3_600_000

export interface EscenarioDeForo {
  claseId: string
  maestro: UsuarioDePrueba
  alumno: UsuarioDePrueba
  otroAlumno: UsuarioDePrueba
  tokenMaestro: string
  tokenAlumno: string
  tokenOtroAlumno: string
  tokenAdmin: string
  // Un maestro de otra clase y un alumno que no está inscrito en esta.
  tokenMaestroAjeno: string
  tokenAlumnoAjeno: string
}

export const crearEscenarioDeForo = async (
  idsUsuarios: string[],
  idsClases: string[],
): Promise<EscenarioDeForo> => {
  const maestro = await crearUsuarioDePrueba(idsUsuarios, {
    rol: "maestro",
    nombre: "Maestra Foro",
  })
  const alumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumna Foro" })
  const otroAlumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumno Foro" })
  const maestroAjeno = await crearUsuarioDePrueba(idsUsuarios, {
    rol: "maestro",
    nombre: "Maestro Ajeno",
  })
  const alumnoAjeno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumno Ajeno" })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  await crearClaseDePrueba(idsClases, { maestroId: maestroAjeno.id })
  await inscribirDePrueba(clase.id, alumno.id, "codigo")
  await inscribirDePrueba(clase.id, otroAlumno.id, "codigo")
  return {
    claseId: clase.id,
    maestro,
    alumno,
    otroAlumno,
    tokenMaestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
    tokenAlumno: await firmarTokenDePrueba({ usuarioId: alumno.id }),
    tokenOtroAlumno: await firmarTokenDePrueba({ usuarioId: otroAlumno.id }),
    tokenAdmin: await tokenDelAdminDePrueba(),
    tokenMaestroAjeno: await firmarTokenDePrueba({ usuarioId: maestroAjeno.id }),
    tokenAlumnoAjeno: await firmarTokenDePrueba({ usuarioId: alumnoAjeno.id }),
  }
}

export interface OpcionesForoDePrueba {
  claseId: string
  autorId: string
  titulo?: string
  texto?: string
  fechaLimite?: Date
  puntos?: number
  aceptaTardias?: boolean
  categoriaId?: string | null
  temaId?: string | null
  creadoEn?: Date
}

// La publicación de tipo `foro` y su fila 1:1 en `tareas` (mismo id, sin adjuntos requeridos), juntas.
export const crearForoDePrueba = async ({
  claseId,
  autorId,
  titulo = "Foro de prueba",
  texto = "Planteamiento de prueba",
  fechaLimite = new Date(Date.now() + 7 * 24 * HORA_MS),
  puntos = 10,
  aceptaTardias = true,
  categoriaId = null,
  temaId = null,
  creadoEn,
}: OpcionesForoDePrueba): Promise<string> => {
  const id = randomUUID()
  await obtenerDb().$transaction(async (tx) => {
    await tx.publicacion.create({
      data: {
        id,
        claseId,
        autorId,
        tipo: "foro",
        titulo,
        texto,
        temaId,
        ...(creadoEn === undefined ? {} : { creadoEn }),
      },
      select: { id: true },
    })
    await tx.tarea.create({
      data: {
        id,
        claseId,
        categoriaId,
        fechaLimite,
        puntos,
        aceptaTardias,
        requiereAdjuntos: false,
      },
      select: { id: true },
    })
  })
  return id
}

export interface OpcionesParticipacionDePrueba {
  foroId: string
  autorId: string
  principalId?: string | null
  texto?: string
  conRetraso?: boolean
  creadoEn?: Date
}

export const crearParticipacionDePrueba = async ({
  foroId,
  autorId,
  principalId = null,
  texto = "Participación de prueba",
  conRetraso = false,
  creadoEn,
}: OpcionesParticipacionDePrueba): Promise<string> => {
  const { id } = await obtenerDb().participacionForo.create({
    data: {
      foroId,
      autorId,
      principalId,
      texto,
      conRetraso,
      ...(creadoEn === undefined ? {} : { creadoEn }),
    },
    select: { id: true },
  })
  return id
}

export const contarParticipaciones = (foroId: string): Promise<number> =>
  obtenerDb().participacionForo.count({ where: { foroId } })

export const urlForos = (claseId: string): string => `/api/clases/${claseId}/foros`
export const urlForo = (claseId: string, foroId: string): string => `${urlForos(claseId)}/${foroId}`

export type Metodo = "GET" | "HEAD" | "POST" | "PUT" | "DELETE"

export const pedirForo =
  (app: () => FastifyInstance) =>
  (opciones: {
    method: Metodo
    url: string
    token?: string
    payload?: InjectOptions["payload"]
  }): Promise<LightMyRequestResponse> =>
    app().inject({
      method: opciones.method,
      url: opciones.url,
      ...(opciones.payload === undefined ? {} : { payload: opciones.payload }),
      headers: opciones.token === undefined ? {} : { authorization: `Bearer ${opciones.token}` },
    })

export const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

export const mensajeDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.mensaje

// Cuerpo válido de POST …/foros; cada prueba cambia solo lo que ejerce.
export const cuerpoDeForo = (cambios: Record<string, unknown> = {}): Record<string, unknown> => ({
  titulo: "Debate de la unidad 2",
  instrucciones: "¿Qué opinas del texto?",
  fechaLimite: new Date(Date.now() + 5 * 24 * HORA_MS).toISOString(),
  puntos: 10,
  ...cambios,
})

// Las 16 rutas del foro (§D-3.1), con el método, la URL y un cuerpo válido de forma (las pruebas de
// autorización comprueban que la cadena responde antes de mirarlo).
export interface RutaDelForo {
  numero: number
  method: Metodo
  url: string
  payload?: Record<string, unknown>
}

export const rutasDelForo = ({
  claseId,
  foroId,
  participacionId,
  alumnoId,
}: {
  claseId: string
  foroId: string
  participacionId: string
  alumnoId: string
}): RutaDelForo[] => {
  const foro = urlForo(claseId, foroId)
  return [
    { numero: 1, method: "POST", url: urlForos(claseId), payload: cuerpoDeForo() },
    { numero: 2, method: "GET", url: urlForos(claseId) },
    { numero: 3, method: "GET", url: foro },
    { numero: 4, method: "PUT", url: foro, payload: cuerpoDeForo({ version: 0 }) },
    { numero: 5, method: "DELETE", url: foro },
    { numero: 6, method: "GET", url: `${foro}/mi-participacion` },
    { numero: 7, method: "GET", url: `${foro}/mi-participacion/devoluciones` },
    { numero: 8, method: "GET", url: `${foro}/participaciones` },
    {
      numero: 9,
      method: "POST",
      url: `${foro}/participaciones`,
      payload: { texto: "Opino que sí" },
    },
    { numero: 10, method: "GET", url: `${foro}/participaciones/${participacionId}/replicas` },
    {
      numero: 11,
      method: "POST",
      url: `${foro}/participaciones/${participacionId}/replicas`,
      payload: { texto: "Coincido" },
    },
    { numero: 12, method: "GET", url: `${foro}/participantes` },
    { numero: 13, method: "GET", url: `${foro}/participantes/${alumnoId}` },
    { numero: 14, method: "GET", url: `${foro}/participantes/${alumnoId}/participaciones` },
    { numero: 15, method: "GET", url: `${foro}/participantes/${alumnoId}/devoluciones` },
    {
      numero: 16,
      method: "PUT",
      url: `${foro}/participantes/${alumnoId}/calificacion`,
      payload: { version: 0, puntosDeLaTarea: 10, puntajes: [], calificacion: 8 },
    },
  ]
}

// Todas las claves de un JSON, a cualquier profundidad.
export const clavesDe = (valor: unknown): string[] => {
  if (Array.isArray(valor)) return valor.flatMap(clavesDe)
  if (valor === null || typeof valor !== "object") return []
  return Object.entries(valor).flatMap(([clave, hijo]) => [clave, ...clavesDe(hijo)])
}

export const CLAVES_QUE_NUNCA_SALEN = [
  "estadoPago",
  "accesoRestringido",
  "email",
  "correo",
  "rol",
  "trabajoId",
  "requiereAdjuntos",
] as const
