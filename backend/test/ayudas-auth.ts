import { createHmac, randomUUID } from "node:crypto"

import type { Rol } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"

import {
  firmarTokenAcceso,
  generarTokenRefresco,
  hashContrasena,
  hashTokenRefresco,
} from "../src/adapters/auth/index.js"
import { obtenerDb } from "../src/adapters/db/cliente.js"

// Ayudas compartidas por las pruebas de autenticación. Aislamiento en campus_dev (R-08): correos
// únicos @pruebas.local, ids o correos registrados por quien los crea y borrado en afterAll.
// obtenerDb() se usa aquí, y solo aquí fuera de adapters/db, para preparar y limpiar datos.

export const CONTRASENA_DE_PRUEBA = "clave-de-prueba-1234"

export const NOMBRE_COOKIE = "campus_refresco"

export const DOMINIO_DE_PRUEBA = "@pruebas.local"

export const correoDePrueba = (prefijo = "auth"): string =>
  `${prefijo}-${randomUUID()}${DOMINIO_DE_PRUEBA}`

export interface OpcionesUsuarioDePrueba {
  rol?: Rol
  activo?: boolean
  accesoRestringido?: boolean
  motivoRestriccion?: string | null
  debeCambiarContrasena?: boolean
  contrasena?: string
  nombre?: string
}

export interface UsuarioDePrueba {
  id: string
  email: string
  contrasena: string
}

export const crearUsuarioDePrueba = async (
  registro: string[],
  opciones: OpcionesUsuarioDePrueba = {},
): Promise<UsuarioDePrueba> => {
  const email = correoDePrueba()
  const contrasena = opciones.contrasena ?? CONTRASENA_DE_PRUEBA
  const nombre = opciones.nombre ?? "Prueba Auth"
  const { id } = await obtenerDb().usuario.create({
    data: {
      email,
      hashContrasena: await hashContrasena(contrasena),
      nombre,
      nombreBusqueda: nombre.toLowerCase(),
      rol: opciones.rol ?? "estudiante",
      activo: opciones.activo ?? true,
      accesoRestringido: opciones.accesoRestringido ?? false,
      motivoRestriccion: opciones.motivoRestriccion ?? null,
      debeCambiarContrasena: opciones.debeCambiarContrasena ?? false,
    },
    select: { id: true },
  })
  registro.push(id)
  return { id, email, contrasena }
}

// Sesión insertada directamente (para vencidas o revocadas a medida). Devuelve el token en claro,
// que es lo que viaja en la cookie.
export const crearSesionDePrueba = async ({
  usuarioId,
  expiraEn,
  revocadaEn = null,
}: {
  usuarioId: string
  expiraEn: Date
  revocadaEn?: Date | null
}): Promise<{ id: string; token: string }> => {
  const token = generarTokenRefresco()
  const { id } = await obtenerDb().sesion.create({
    data: { usuarioId, hashToken: hashTokenRefresco(token), expiraEn, revocadaEn },
    select: { id: true },
  })
  return { id, token }
}

export const desactivarUsuarioDePrueba = async (id: string): Promise<void> => {
  await obtenerDb().usuario.update({ where: { id }, data: { activo: false }, select: { id: true } })
}

// Solo borra lo que la propia prueba registró; las sesiones caen en cascada.
export const borrarUsuariosDePrueba = async (ids: readonly string[]): Promise<void> => {
  if (ids.length === 0) return
  await obtenerDb().usuario.deleteMany({ where: { id: { in: [...ids] } } })
}

export const borrarUsuariosDePruebaPorCorreo = async (
  correos: readonly string[],
): Promise<void> => {
  const propios = correos.filter((correo) => correo.endsWith(DOMINIO_DE_PRUEBA))
  if (propios.length === 0) return
  await obtenerDb().usuario.deleteMany({ where: { email: { in: propios } } })
}

export const contarSesionesVivas = async (usuarioId: string): Promise<number> =>
  obtenerDb().sesion.count({ where: { usuarioId, revocadaEn: null } })

export const leerSesiones = (usuarioId: string) =>
  obtenerDb().sesion.findMany({
    where: { usuarioId },
    select: { id: true, revocadaEn: true, reemplazadaPor: true, expiraEn: true, agente: true },
    orderBy: { creadoEn: "asc" },
  })

export const leerUsuarioPorCorreo = (email: string) =>
  obtenerDb().usuario.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      nombre: true,
      nombreBusqueda: true,
      rol: true,
      activo: true,
      estadoPago: true,
      accesoRestringido: true,
      debeCambiarContrasena: true,
    },
  })

// Encabezado Set-Cookie crudo de campus_refresco (para comprobar atributos) y su valor.
export const encabezadoCookieRefresco = (respuesta: LightMyRequestResponse): string | undefined => {
  const crudo = respuesta.headers["set-cookie"]
  const lista = Array.isArray(crudo) ? crudo : crudo === undefined ? [] : [crudo]
  return lista.find((valor) => valor.startsWith(`${NOMBRE_COOKIE}=`))
}

export const valorCookieRefresco = (respuesta: LightMyRequestResponse): string | undefined =>
  respuesta.cookies.find((cookie) => cookie.name === NOMBRE_COOKIE)?.value

export const iniciarSesionDePrueba = async (
  app: FastifyInstance,
  { email, contrasena }: { email: string; contrasena: string },
): Promise<{ tokenAcceso: string; cookie: string; respuesta: LightMyRequestResponse }> => {
  const respuesta = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email, contrasena },
  })
  if (respuesta.statusCode !== 200) {
    throw new Error(`El login de prueba respondió ${respuesta.statusCode}: ${respuesta.body}`)
  }
  const cookie = valorCookieRefresco(respuesta)
  if (!cookie) throw new Error("El login de prueba no devolvió la cookie de refresco")
  const { tokenAcceso } = respuesta.json<{ tokenAcceso: string }>()
  return { tokenAcceso, cookie, respuesta }
}

export const refrescarDePrueba = (
  app: FastifyInstance,
  cookie?: string,
): Promise<LightMyRequestResponse> =>
  app.inject({
    method: "POST",
    url: "/api/auth/refrescar",
    ...(cookie === undefined ? {} : { cookies: { [NOMBRE_COOKIE]: cookie } }),
  })

export const consultarMe = (
  app: FastifyInstance,
  tokenAcceso?: string,
  cookie?: string,
): Promise<LightMyRequestResponse> =>
  app.inject({
    method: "GET",
    url: "/api/me",
    headers: tokenAcceso === undefined ? {} : { authorization: `Bearer ${tokenAcceso}` },
    ...(cookie === undefined ? {} : { cookies: { [NOMBRE_COOKIE]: cookie } }),
  })

export const firmarTokenDePrueba = ({
  usuarioId,
  ahora = new Date(),
}: {
  usuarioId: string
  ahora?: Date
}): Promise<string> => firmarTokenAcceso({ usuarioId, ahora })

const base64url = (dato: string | Buffer): string => Buffer.from(dato).toString("base64url")

// JWT construido a mano con node:crypto (las pruebas no importan jose, regla 1): permite firmar
// con otro secreto, cambiar iss/aud/sub o producir alg: none.
export const firmarJwtDePrueba = ({
  payload,
  secreto,
  alg = "HS256",
}: {
  payload: Record<string, unknown>
  secreto?: string
  alg?: "HS256" | "none"
}): string => {
  const cabecera = base64url(JSON.stringify({ alg, typ: "JWT" }))
  const cuerpo = base64url(JSON.stringify(payload))
  const entrada = `${cabecera}.${cuerpo}`
  if (alg === "none" || secreto === undefined) return `${entrada}.`
  const firma = createHmac("sha256", secreto).update(entrada).digest("base64url")
  return `${entrada}.${firma}`
}

export const cargaDeTokenDePrueba = ({
  usuarioId,
  ahora,
  duracionS = 15 * 60,
  iss = "campus-digital",
  aud = "campus-api",
}: {
  usuarioId: string
  ahora: Date
  duracionS?: number
  iss?: string
  aud?: string
}): Record<string, unknown> => {
  const iat = Math.floor(ahora.getTime() / 1000)
  return { sub: usuarioId, iat, exp: iat + duracionS, iss, aud }
}

// Cambia un carácter interior de la firma para invalidarla sin tocar la carga (T-10). No el último:
// en base64url una firma HS256 de 32 bytes son 43 caracteres y el último solo aporta 4 bits útiles,
// así que cambiar "A" por "B" al final puede decodificar a los mismos bytes. Un carácter interior
// aporta sus 6 bits completos: cualquier sustituto distinto cambia la firma.
export const alterarFirma = (token: string): string => {
  const [cabecera, carga, firma] = token.split(".")
  if (cabecera === undefined || carga === undefined || firma === undefined || firma.length < 3) {
    throw new Error("alterarFirma espera un JWT con firma")
  }
  const posicion = Math.floor(firma.length / 2)
  const sustituto = firma[posicion] === "A" ? "B" : "A"
  return `${cabecera}.${carga}.${firma.slice(0, posicion)}${sustituto}${firma.slice(posicion + 1)}`
}
