import type { z } from "zod"

import { AppError } from "../core/errores.js"

// Validación de cuerpos con safeParse (DEC-05): dato tipado o 400 VALIDACION con la primera
// incidencia como "<campo>: <mensaje>", sin el valor recibido. Sin fastify-type-provider-zod.
export const validarCuerpo = <T>(schema: z.ZodType<T>, cuerpo: unknown): T => {
  if (typeof cuerpo !== "object" || cuerpo === null) {
    throw new AppError("VALIDACION", "cuerpo: debe ser un objeto JSON", 400)
  }

  const resultado = schema.safeParse(cuerpo)
  if (resultado.success) return resultado.data

  const incidencia = resultado.error.issues[0]
  const campo = incidencia?.path.map(String).join(".") || "cuerpo"
  const mensaje = incidencia?.message ?? "valor inválido"
  throw new AppError("VALIDACION", `${campo}: ${mensaje}`, 400)
}

// Igual que validarCuerpo, para los parámetros de la URL (por ejemplo, :id).
export const validarParametros = <T>(schema: z.ZodType<T>, parametros: unknown): T => {
  const resultado = schema.safeParse(parametros)
  if (resultado.success) return resultado.data

  const incidencia = resultado.error.issues[0]
  const campo = incidencia?.path.map(String).join(".") || "parámetro"
  const mensaje = incidencia?.message ?? "valor inválido"
  throw new AppError("VALIDACION", `${campo}: ${mensaje}`, 400)
}
