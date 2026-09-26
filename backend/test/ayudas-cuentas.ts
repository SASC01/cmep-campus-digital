import { randomUUID } from "node:crypto"

import type { Rol } from "@campus/shared"
import type { FastifyInstance } from "fastify"

import { derivarTokenDeCuenta } from "../src/adapters/auth/index.js"
import { obtenerDb } from "../src/adapters/db/cliente.js"
import { COLA_CORREO_DE_CUENTA } from "../src/core/eventos/correo-de-cuenta.js"
import type { TipoTokenCuenta } from "../src/core/auth/tokens-cuenta.js"
import { correoDePrueba, iniciarSesionDePrueba } from "./ayudas-auth.js"

export const crearTokenDePrueba = async ({
  usuarioId,
  tipo,
  expiraEn,
  usadoEn = null,
  revocadoEn = null,
}: {
  usuarioId: string
  tipo: TipoTokenCuenta
  expiraEn: Date
  usadoEn?: Date | null
  revocadoEn?: Date | null
}): Promise<{ id: string; token: string }> => {
  const id = randomUUID()
  const { token, hash } = derivarTokenDeCuenta(id)
  await obtenerDb().tokenCuenta.create({
    data: { id, usuarioId, tipo, hashToken: hash, expiraEn, usadoEn, revocadoEn },
    select: { id: true },
  })
  return { id, token }
}

export const leerTokens = (usuarioId: string) =>
  obtenerDb().tokenCuenta.findMany({
    where: { usuarioId },
    select: { id: true, tipo: true, usadoEn: true, revocadoEn: true, expiraEn: true },
    orderBy: { creadoEn: "asc" },
  })

export const tokenDelEnlace = (enlace: string): string | null => {
  const coincidencia = /#token=([A-Za-z0-9_-]{43})/.exec(enlace)
  return coincidencia?.[1] ?? null
}

export const pedirComoAdmin = (
  app: FastifyInstance,
  { email, contrasena }: { email: string; contrasena: string },
) => iniciarSesionDePrueba(app, { email, contrasena })

export interface CuentaDePruebaParaAdmin {
  id: string
  email: string
}

export const crearCuentaDePrueba = async (
  registro: string[],
  {
    rol = "estudiante",
    activo = true,
    debeCambiarContrasena = false,
  }: { rol?: Rol; activo?: boolean; debeCambiarContrasena?: boolean } = {},
): Promise<CuentaDePruebaParaAdmin> => {
  const email = correoDePrueba("cuenta")
  const { id } = await obtenerDb().usuario.create({
    data: {
      email,
      hashContrasena:
        "$argon2id$v=19$m=19456,t=2,p=1$aaaaaaaaaaaaaaaaaaaaaa$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      nombre: "Cuenta de prueba",
      nombreBusqueda: "cuenta de prueba",
      rol,
      activo,
      debeCambiarContrasena,
    },
    select: { id: true },
  })
  registro.push(id)
  return { id, email }
}

// Solo de pruebas: filtra por name y por data->>'correo' sobre pgboss.job (los nombres de columna se
// confirman en V-05) para conocer el id del trabajo que dejó /auth/recuperar, ya que el handler no lo
// devuelve. No pasa por un índice propio.
export const buscarTrabajosPorCorreo = async (
  correo: string,
): Promise<{ id: string; estado: string }[]> => {
  const filas = await obtenerDb().$queryRaw<{ id: string; estado: string }[]>`
    SELECT id, state AS estado
    FROM pgboss.job
    WHERE name = ${COLA_CORREO_DE_CUENTA} AND data->>'correo' = ${correo}
    ORDER BY created_on ASC
  `
  return filas
}
