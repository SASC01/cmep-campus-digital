import { errorApiSchema } from "@campus/shared"

import { obtenerToken } from "./authService"

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

const MENSAJE_RESPUESTA_INVALIDA = "La respuesta del servidor no tiene el formato esperado."

const leerJson = async (respuesta: Response): Promise<unknown> => {
  try {
    return await respuesta.json()
  } catch {
    return undefined
  }
}

// Punto de extensión (CLAUDE.md > Casos especiales): aquí, y no en cada vista, se tratarán
// 401 -> refresco silencioso con authService.refrescar y reintento único;
// 403 ACCESO_RESTRINGIDO -> pantalla de acceso restringido;
// 403 CAMBIO_DE_CONTRASENA_REQUERIDO -> pantalla de cambio de contraseña.
// Llegan con el encargo de autenticación (carril sensible).
export const api = async <T>(ruta: string, opciones: OpcionesApi<T>): Promise<T> => {
  const headers = new Headers({ Accept: "application/json" })
  const token = obtenerToken()
  if (token) headers.set("Authorization", `Bearer ${token}`)
  if (opciones.body !== undefined) headers.set("Content-Type", "application/json")

  let respuesta: Response
  try {
    respuesta = await fetch(`${baseUrl}${ruta}`, {
      method: opciones.method ?? "GET",
      headers,
      credentials: "include",
      // Spreads condicionales por exactOptionalPropertyTypes: no se pasa body ni signal undefined.
      ...(opciones.body !== undefined ? { body: JSON.stringify(opciones.body) } : {}),
      ...(opciones.signal ? { signal: opciones.signal } : {}),
    })
  } catch {
    throw new ApiError("SIN_CONEXION", "No pudimos conectar con el servidor.", 0)
  }

  const cuerpo = respuesta.status === 204 ? undefined : await leerJson(respuesta)

  if (!respuesta.ok) {
    const error = errorApiSchema.safeParse(cuerpo)
    if (error.success) {
      throw new ApiError(error.data.error.codigo, error.data.error.mensaje, respuesta.status)
    }
    throw new ApiError("RESPUESTA_INVALIDA", MENSAJE_RESPUESTA_INVALIDA, respuesta.status)
  }

  try {
    return opciones.schema.parse(cuerpo)
  } catch {
    throw new ApiError("RESPUESTA_INVALIDA", MENSAJE_RESPUESTA_INVALIDA, respuesta.status)
  }
}
