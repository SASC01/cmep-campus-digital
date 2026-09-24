import type { CookieSerializeOptions } from "@fastify/cookie"
import type { FastifyReply } from "fastify"

import { opcionesDeAuth } from "../../config/auth.js"
import type { Env } from "../../config/env.js"
import { DURACION_SESION_MS } from "../../core/auth/sesiones.js"

export const NOMBRE_COOKIE_REFRESCO = "campus_refresco"

// DEC-07. Path=/api/auth: el navegador solo la envía a /api/auth/*; ni GET /me ni ninguna ruta de
// negocio la reciben. SameSite=Strict impide que otro sitio dispare POST /api/auth/refrescar con
// ella. Secure solo en production (dev va por http://127.0.0.1).
export const opcionesCookieRefresco = (env: Env): CookieSerializeOptions => ({
  httpOnly: true,
  sameSite: "strict",
  path: "/api/auth",
  secure: opcionesDeAuth(env).cookieSegura,
  maxAge: DURACION_SESION_MS / 1000,
})

export const ponerCookieRefresco = (reply: FastifyReply, env: Env, token: string): void => {
  reply.setCookie(NOMBRE_COOKIE_REFRESCO, token, opcionesCookieRefresco(env))
}

// Mismos atributos y Max-Age=0 (clearCookie de @fastify/cookie fija expires=0 y maxAge=0).
export const limpiarCookieRefresco = (reply: FastifyReply, env: Env): void => {
  reply.clearCookie(NOMBRE_COOKIE_REFRESCO, opcionesCookieRefresco(env))
}
