import { fileURLToPath } from "node:url"

import { z } from "zod"

import { salirPorConfiguracionInvalida, type Env } from "./env.js"

// Solo el worker lee estas variables (DEC-12): así la API no cambia su esquema de entorno y
// env.ataque.test.ts:15 sigue aceptando una configuración de production sin variables de correo.

export const REMITENTE_DE_DESARROLLO = "CMEP Campus Digital <notificaciones@campus.local>"
export const URL_FRONTEND_DE_DESARROLLO = "http://127.0.0.1:5173"
// Dominio del remitente de .env.example: en production nunca es válido (N-05), mismo criterio que
// JWT_SECRET_DE_EJEMPLO.
export const DOMINIO_REMITENTE_DE_EJEMPLO = "campus.local"
export const DIRECTORIO_CORREOS = fileURLToPath(new URL("../../tmp/correos/", import.meta.url))

// La dirección es el texto entre < y > si existe; si no, el texto completo. El dominio es lo que
// sigue a la última @, recortado y en minúsculas.
const dominioDelRemitente = (remitente: string): string => {
  const conAngulos = /<([^>]*)>/.exec(remitente)
  const direccion = (conAngulos?.[1] ?? remitente).trim().toLowerCase()
  const arroba = direccion.lastIndexOf("@")
  if (arroba === -1) return ""
  return direccion.slice(arroba + 1)
}

// Vacío = ausente (DEC-12): los cuatro valores por defecto son los de desarrollo. La validación de
// production (obligatoriedad y el dominio de ejemplo, N-05) va aparte en validarProduccion, porque
// necesita NODE_ENV, que no vive en estas variables.
const envCorreoSchema = z.object({
  RESEND_API_KEY: z.string().default(""),
  CORREO_REMITENTE: z
    .string()
    .refine((valor) => valor === "" || (valor.length >= 3 && valor.length <= 200), {
      message: "debe tener entre 3 y 200 caracteres",
    })
    .default(REMITENTE_DE_DESARROLLO),
  CORREO_RESPONDER_A: z
    .string()
    .refine((valor) => valor === "" || z.email().safeParse(valor).success, {
      message: "debe ser un correo válido",
    })
    .default(""),
  URL_PUBLICA_FRONTEND: z
    .string()
    .refine((valor) => valor === "" || z.url({ protocol: /^https?$/ }).safeParse(valor).success, {
      message: "debe ser una URL que empiece con http:// o https://",
    })
    .default(URL_FRONTEND_DE_DESARROLLO),
})

// El esquema de producción se valida por separado porque necesita NODE_ENV, que no vive en estas
// variables (viene de config/env.ts).
const validarProduccion = (
  valores: z.infer<typeof envCorreoSchema>,
  nodeEnv: Env["NODE_ENV"],
): string[] => {
  if (nodeEnv !== "production") return []
  const errores: string[] = []

  if (valores.RESEND_API_KEY.trim() === "") {
    errores.push("RESEND_API_KEY: obligatoria en production")
  }
  if (valores.CORREO_REMITENTE.trim() === "") {
    errores.push("CORREO_REMITENTE: obligatoria en production")
  } else if (dominioDelRemitente(valores.CORREO_REMITENTE) === DOMINIO_REMITENTE_DE_EJEMPLO) {
    errores.push(
      "CORREO_REMITENTE: en production debe usar un dominio propio verificado en Resend, distinto del de .env.example",
    )
  }
  if (valores.URL_PUBLICA_FRONTEND.trim() === "") {
    errores.push("URL_PUBLICA_FRONTEND: obligatoria en production")
  } else if (!valores.URL_PUBLICA_FRONTEND.startsWith("https://")) {
    errores.push("URL_PUBLICA_FRONTEND: en production debe empezar con https://")
  }

  return errores
}

export type EnvCorreo = z.infer<typeof envCorreoSchema>

export type ResultadoEnvCorreo = { ok: true; env: EnvCorreo } | { ok: false; errores: string[] }

// Pura: no toca process.env ni la salida (igual que validarEnv de config/env.ts).
export const validarEnvCorreo = (
  fuente: Record<string, string | undefined>,
  nodeEnv: Env["NODE_ENV"],
): ResultadoEnvCorreo => {
  const resultado = envCorreoSchema.safeParse(fuente)
  if (!resultado.success) {
    return {
      ok: false,
      errores: resultado.error.issues.map(
        (issue) => `${String(issue.path[0] ?? "(entorno)")}: ${issue.message}`,
      ),
    }
  }

  const erroresDeProduccion = validarProduccion(resultado.data, nodeEnv)
  if (erroresDeProduccion.length > 0) return { ok: false, errores: erroresDeProduccion }

  return { ok: true, env: resultado.data }
}

export const cargarEnvCorreo = (nodeEnv: Env["NODE_ENV"]): EnvCorreo => {
  const resultado = validarEnvCorreo({ ...process.env }, nodeEnv)
  if (resultado.ok) return resultado.env
  return salirPorConfiguracionInvalida(resultado.errores)
}

export type CanalCorreo = "resend" | "registro"

export interface OpcionesCorreo {
  canal: CanalCorreo
  remitente: string
  responderA?: string
  apiKey?: string
  urlPublicaFrontend: string
  directorioRegistro: string
}

// El canal lo decide la configuración, no el que lo llama (regla 12): Resend solo con
// NODE_ENV=production y llave presente; cualquier otro caso, registro, aunque exista la llave.
export const opcionesDeCorreo = (
  nodeEnv: Env["NODE_ENV"],
  envCorreo: EnvCorreo,
): OpcionesCorreo => {
  const tieneLlave = envCorreo.RESEND_API_KEY.trim() !== ""
  const canal: CanalCorreo = nodeEnv === "production" && tieneLlave ? "resend" : "registro"
  return {
    canal,
    remitente: envCorreo.CORREO_REMITENTE || REMITENTE_DE_DESARROLLO,
    ...(envCorreo.CORREO_RESPONDER_A ? { responderA: envCorreo.CORREO_RESPONDER_A } : {}),
    ...(envCorreo.RESEND_API_KEY ? { apiKey: envCorreo.RESEND_API_KEY } : {}),
    urlPublicaFrontend: envCorreo.URL_PUBLICA_FRONTEND || URL_FRONTEND_DE_DESARROLLO,
    directorioRegistro: DIRECTORIO_CORREOS,
  }
}
