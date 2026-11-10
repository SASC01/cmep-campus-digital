import { randomBytes, randomUUID } from "node:crypto"

import type { Rol } from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { normalizarParaBusqueda } from "../src/core/auth/normalizacion.js"
import { DOMINIO_DE_PRUEBA } from "./ayudas-auth.js"

// ADMIN-01e: ayudas de las pruebas de la gestión de usuarios. obtenerDb() solo prepara y limpia
// datos, como en ayudas-auth.ts.

// Un prefijo propio por caso (E8-4, forma (a)): las búsquedas con `q` solo ven las cuentas del caso.
export const marcaDePrueba = (): string => `zq${randomBytes(5).toString("hex")}`

// Hash fijo (no es de ninguna contraseña real): sin argon2, para crear muchas cuentas rápido. Las
// pruebas que inician sesión usan crearUsuarioDePrueba.
const HASH_FIJO =
  "$argon2id$v=19$m=19456,t=2,p=1$aaaaaaaaaaaaaaaaaaaaaa$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

export interface CuentaDeGestion {
  id: string
  email: string
  nombre: string
}

export const crearCuentaDeGestion = async (
  registro: string[],
  {
    nombre,
    rol = "estudiante",
    activo = true,
    estadoPago = "al_corriente",
    accesoRestringido = false,
  }: {
    nombre: string
    rol?: Rol
    activo?: boolean
    estadoPago?: "al_corriente" | "deudor"
    accesoRestringido?: boolean
  },
): Promise<CuentaDeGestion> => {
  const email = `gu-${randomUUID()}${DOMINIO_DE_PRUEBA}`
  const { id } = await obtenerDb().usuario.create({
    data: {
      email,
      hashContrasena: HASH_FIJO,
      nombre,
      nombreBusqueda: normalizarParaBusqueda(nombre),
      rol,
      activo,
      estadoPago,
      accesoRestringido,
    },
    select: { id: true },
  })
  registro.push(id)
  return { id, email, nombre }
}

export const pedirConToken = (
  app: FastifyInstance,
  token: string,
  opciones: {
    method: "GET" | "HEAD" | "POST" | "PUT" | "DELETE"
    url: string
    payload?: InjectOptions["payload"]
  },
): Promise<LightMyRequestResponse> =>
  app.inject({
    method: opciones.method,
    url: opciones.url,
    ...(opciones.payload === undefined ? {} : { payload: opciones.payload }),
    headers: { authorization: `Bearer ${token}` },
  })

export const urlDeUsuarios = (consulta: Record<string, string>): string =>
  `/api/admin/usuarios?${new URLSearchParams(consulta).toString()}`

export interface FilaDePrueba {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  [clave: string]: unknown
}

export interface PaginaDeUsuarios {
  usuarios: FilaDePrueba[]
  siguienteCursor: string | null
  siguienteCursorNombre: string | null
}

export const leerFilaDb = (id: string) =>
  obtenerDb().usuario.findUnique({
    where: { id },
    select: {
      nombre: true,
      nombreBusqueda: true,
      activo: true,
      estadoPago: true,
      fechaEstadoPago: true,
      accesoRestringido: true,
      motivoRestriccion: true,
      fechaRestriccion: true,
      actualizadoEn: true,
      hashContrasena: true,
    },
  })

// Las claves que ninguna respuesta de 01e puede llevar (ADM-1E15).
export const CLAVES_PROHIBIDAS = [
  "hashContrasena",
  "nombreBusqueda",
  "debeCambiarContrasena",
  "enlaceRegistroId",
] as const
