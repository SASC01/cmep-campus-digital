import { errorApiSchema, tokenAccesoRespuestaSchema } from "@campus/shared"

import { irA, rutaActual } from "./navegacion"
import { establecerToken, limpiarToken, obtenerToken } from "./tokenAcceso"

export class ApiError extends Error {
  readonly codigo: string
  readonly estado: number
  constructor(codigo: string, mensaje: string, estado: number) {
    super(mensaje)
    this.name = "ApiError"
    this.codigo = codigo
    this.estado = estado
  }
}

export const esApiError = (error: unknown): error is ApiError => error instanceof ApiError

// Tipo estructural: apiClient no importa zod; el hook pasa el esquema que conoce el contrato.
interface Esquema<T> {
  parse: (dato: unknown) => T
}

export interface OpcionesApi<T> {
  schema: Esquema<T>
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  signal?: AbortSignal
}

// Vacío = mismo origen (proxy de Vite en desarrollo). En prod apunta a api.<dominio>.
const baseUrl = import.meta.env.VITE_API_URL ?? ""

const RUTA_REFRESCO = "/api/auth/refrescar"
const PREFIJO_AUTH = "/api/auth/"
// Única ruta protegida bajo /api/auth/: sí puede refrescar y reintentar ante un 401 (DEC-17).
const RUTA_CAMBIAR_CONTRASENA_API = "/api/auth/cambiar-contrasena"
const RUTA_ACCESO_RESTRINGIDO = "/acceso-restringido"
const RUTA_CAMBIO_DE_CONTRASENA = "/cambiar-contrasena"
const RUTAS_SIN_SESION = [
  "/login",
  "/registro",
  "/recuperar",
  "/restablecer",
  "/establecer-contrasena",
]
// La API responde JSON incluso en 500. Un 5xx sin JSON viene del proxy de Vite o de Caddy con la
// API caída: para la interfaz es "sin conexión", no una respuesta inválida (DEC-12).
const ESTADOS_SIN_CONEXION = [500, 502, 503, 504]

const MENSAJE_RESPUESTA_INVALIDA = "La respuesta del servidor no tiene el formato esperado."
const MENSAJE_SIN_CONEXION = "No pudimos conectar con el servidor."
const MENSAJE_SESION_TERMINADA = "Tu sesión terminó. Vuelve a iniciar sesión."

const leerJson = async (respuesta: Response): Promise<unknown> => {
  try {
    return await respuesta.json()
  } catch {
    return undefined
  }
}

// Refresco silencioso (DEC-12): una sola petición en vuelo por pestaña (single-flight) y, donde
// existe navigator.locks, serializado entre pestañas para que dos pestañas no presenten el mismo
// token de refresco (la API revocaría todas las sesiones, P-04). En jsdom no existe: solo la promesa.
const pedirRefresco = async (): Promise<boolean> => {
  let respuesta: Response
  try {
    respuesta = await fetch(`${baseUrl}${RUTA_REFRESCO}`, {
      method: "POST",
      headers: { Accept: "application/json" },
      credentials: "include",
    })
  } catch {
    limpiarToken()
    return false
  }

  const datos = respuesta.ok
    ? tokenAccesoRespuestaSchema.safeParse(await leerJson(respuesta))
    : undefined
  if (!datos?.success) {
    limpiarToken()
    return false
  }

  establecerToken(datos.data.tokenAcceso)
  return true
}

const conBloqueoEntrePestanas = async (): Promise<boolean> => {
  if (typeof navigator === "undefined" || !navigator.locks) return pedirRefresco()
  return await navigator.locks.request("campus-refresco", () => pedirRefresco())
}

let refrescoEnVuelo: Promise<boolean> | undefined

export const refrescarSesion = (): Promise<boolean> => {
  if (refrescoEnVuelo) return refrescoEnVuelo
  refrescoEnVuelo = conBloqueoEntrePestanas().finally(() => {
    refrescoEnVuelo = undefined
  })
  return refrescoEnVuelo
}

const enviar = async <T>(
  ruta: string,
  opciones: OpcionesApi<T>,
  token: string | undefined,
): Promise<Response> => {
  const headers = new Headers({ Accept: "application/json" })
  if (token) headers.set("Authorization", `Bearer ${token}`)
  if (opciones.body !== undefined) headers.set("Content-Type", "application/json")

  try {
    return await fetch(`${baseUrl}${ruta}`, {
      method: opciones.method ?? "GET",
      headers,
      credentials: "include",
      // Spreads condicionales por exactOptionalPropertyTypes: no se pasa body ni signal undefined.
      ...(opciones.body !== undefined ? { body: JSON.stringify(opciones.body) } : {}),
      ...(opciones.signal ? { signal: opciones.signal } : {}),
    })
  } catch {
    throw new ApiError("SIN_CONEXION", MENSAJE_SIN_CONEXION, 0)
  }
}

const errorDeRespuesta = (respuesta: Response, cuerpo: unknown): ApiError => {
  const error = errorApiSchema.safeParse(cuerpo)
  if (error.success) {
    return new ApiError(error.data.error.codigo, error.data.error.mensaje, respuesta.status)
  }
  if (ESTADOS_SIN_CONEXION.includes(respuesta.status)) {
    return new ApiError("SIN_CONEXION", MENSAJE_SIN_CONEXION, respuesta.status)
  }
  return new ApiError("RESPUESTA_INVALIDA", MENSAJE_RESPUESTA_INVALIDA, respuesta.status)
}

// Casos especiales que se resuelven aquí y no en cada vista (CLAUDE.md > Casos especiales).
// 403 CAMBIO_DE_CONTRASENA_REQUERIDO: simétrico a ACCESO_RESTRINGIDO (DEC-17); el error se lanza
// igual para que la guarda o el llamador decidan.
const procesar = async <T>(respuesta: Response, opciones: OpcionesApi<T>): Promise<T> => {
  const cuerpo = respuesta.status === 204 ? undefined : await leerJson(respuesta)

  if (!respuesta.ok) {
    const error = errorDeRespuesta(respuesta, cuerpo)
    const restringido = respuesta.status === 403 && error.codigo === "ACCESO_RESTRINGIDO"
    const cambioRequerido =
      respuesta.status === 403 && error.codigo === "CAMBIO_DE_CONTRASENA_REQUERIDO"
    if (restringido && rutaActual() !== RUTA_ACCESO_RESTRINGIDO) irA(RUTA_ACCESO_RESTRINGIDO)
    if (cambioRequerido && rutaActual() !== RUTA_CAMBIO_DE_CONTRASENA)
      irA(RUTA_CAMBIO_DE_CONTRASENA)
    throw error
  }

  try {
    return opciones.schema.parse(cuerpo)
  } catch {
    throw new ApiError("RESPUESTA_INVALIDA", MENSAJE_RESPUESTA_INVALIDA, respuesta.status)
  }
}

// Pérdida de sesión en mitad del uso: recarga completa hacia /login salvo que ya se esté allí.
const perderSesion = (): ApiError => {
  limpiarToken()
  if (!RUTAS_SIN_SESION.includes(rutaActual())) irA("/login")
  return new ApiError("NO_AUTENTICADO", MENSAJE_SESION_TERMINADA, 401)
}

// Único fetch de la aplicación (CLAUDE.md, regla 8). Ante un 401 en una ruta que no es de
// /api/auth/ y SOLO si se envió un token (vencido), refresca y reintenta una vez. Sin token, el 401
// se lanza tal cual: la guarda de rutas decide (M-08). /api/auth/cambiar-contrasena es la única
// excepción bajo /api/auth/: sí refresca (DEC-17).
export const api = async <T>(ruta: string, opciones: OpcionesApi<T>): Promise<T> => {
  const tokenEnviado = obtenerToken()
  const respuesta = await enviar(ruta, opciones, tokenEnviado)

  const debeRefrescar =
    respuesta.status === 401 &&
    tokenEnviado !== undefined &&
    (!ruta.startsWith(PREFIJO_AUTH) || ruta === RUTA_CAMBIAR_CONTRASENA_API)
  if (!debeRefrescar) return procesar(respuesta, opciones)

  const refrescada = await refrescarSesion()
  if (!refrescada) throw perderSesion()

  return procesar(await enviar(ruta, opciones, obtenerToken()), opciones)
}
