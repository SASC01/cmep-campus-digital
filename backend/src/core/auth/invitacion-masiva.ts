// Invitación masiva de maestros (AUTH-03c, §D-C1). Puro: sin I/O. Analiza la lista que pega el
// admin, prepara el nombre provisional de una línea sin nombre y evalúa el cupo diario.

import { correoSchema, nombreSchema } from "@campus/shared"

import { AppError } from "../errores.js"
import { normalizarCorreo } from "./normalizacion.js"

export type MotivoLineaInvalida = "correo_invalido" | "nombre_invalido" | "repetido"

export interface CandidatoInvitacion {
  linea: number
  email: string
  nombre: string | null
}

export interface LineaInvalida {
  linea: number
  texto: string
  motivo: MotivoLineaInvalida
}

export interface AnalisisDeLista {
  candidatos: CandidatoInvitacion[]
  invalidas: LineaInvalida[]
}

const MAXIMO_CARACTERES_TEXTO_LINEA = 200

type Separador = "\t" | ";" | ","

const detectarSeparador = (linea: string): Separador | null => {
  if (linea.includes("\t")) return "\t"
  if (linea.includes(";")) return ";"
  if (linea.includes(",")) return ","
  return null
}

interface CandidatoExtraido {
  email: string
  nombre: string | null
}

// Sin separador, toda la línea es el correo. Con separador, primero se intenta el correo antes del
// primer separador (el caso normal) y, si no pasa, el correo después del último (nombre con comas).
const extraerCandidato = (lineaTrim: string): CandidatoExtraido | null => {
  const separador = detectarSeparador(lineaTrim)
  if (separador === null) {
    return correoSchema.safeParse(lineaTrim).success ? { email: lineaTrim, nombre: null } : null
  }

  const primero = lineaTrim.indexOf(separador)
  const antesPrimero = lineaTrim.slice(0, primero).trim()
  const despuesPrimero = lineaTrim.slice(primero + 1).trim()
  if (correoSchema.safeParse(antesPrimero).success) {
    return { email: antesPrimero, nombre: despuesPrimero.length > 0 ? despuesPrimero : null }
  }

  const ultimo = lineaTrim.lastIndexOf(separador)
  const antesUltimo = lineaTrim.slice(0, ultimo).trim()
  const despuesUltimo = lineaTrim.slice(ultimo + 1).trim()
  if (correoSchema.safeParse(despuesUltimo).success) {
    return { email: despuesUltimo, nombre: antesUltimo.length > 0 ? antesUltimo : null }
  }

  return null
}

export const analizarListaDeInvitaciones = (texto: string): AnalisisDeLista => {
  const lineas = texto.split(/\r\n|\r|\n/)
  const candidatos: CandidatoInvitacion[] = []
  const invalidas: LineaInvalida[] = []
  const correosVistos = new Set<string>()

  lineas.forEach((lineaOriginal, indice) => {
    const numero = indice + 1
    const lineaTrim = lineaOriginal.trim()
    if (lineaTrim.length === 0) return

    const textoLinea = lineaTrim.slice(0, MAXIMO_CARACTERES_TEXTO_LINEA)
    const candidato = extraerCandidato(lineaTrim)
    if (candidato === null) {
      invalidas.push({ linea: numero, texto: textoLinea, motivo: "correo_invalido" })
      return
    }

    if (candidato.nombre !== null && !nombreSchema.safeParse(candidato.nombre).success) {
      invalidas.push({ linea: numero, texto: textoLinea, motivo: "nombre_invalido" })
      return
    }

    const emailNormalizado = normalizarCorreo(candidato.email)
    if (correosVistos.has(emailNormalizado)) {
      invalidas.push({ linea: numero, texto: textoLinea, motivo: "repetido" })
      return
    }
    correosVistos.add(emailNormalizado)

    candidatos.push({ linea: numero, email: emailNormalizado, nombre: candidato.nombre })
  })

  return { candidatos, invalidas }
}

export const NOMBRE_PROVISIONAL_DE_RESPALDO = "Maestro invitado"

const MAXIMO_CARACTERES_NOMBRE_PROVISIONAL = 120

// B-02 A, M-07 y M-12: siempre devuelve el `data` de `nombreSchema.safeParse`, nunca el texto de
// entrada. Prueba en orden la parte local, el correo completo y, al final, el respaldo fijo.
export const nombreProvisionalDe = (email: string): string => {
  const [parteLocal = ""] = email.split("@")
  const candidatoParteLocal = nombreSchema.safeParse(
    parteLocal.slice(0, MAXIMO_CARACTERES_NOMBRE_PROVISIONAL),
  )
  if (candidatoParteLocal.success) return candidatoParteLocal.data

  const candidatoCorreoCompleto = nombreSchema.safeParse(
    email.slice(0, MAXIMO_CARACTERES_NOMBRE_PROVISIONAL),
  )
  if (candidatoCorreoCompleto.success) return candidatoCorreoCompleto.data

  return NOMBRE_PROVISIONAL_DE_RESPALDO
}

export const VENTANA_CUPO_MS = 24 * 3_600_000

export const evaluarCupo = ({
  limite,
  usadas,
  solicitadas,
}: {
  limite: number
  usadas: number
  solicitadas: number
}): AppError | null => {
  const restantes = Math.max(0, limite - usadas)
  if (solicitadas <= restantes) return null
  const sustantivo = restantes === 1 ? "invitación" : "invitaciones"
  return new AppError(
    "CUPO_DIARIO_INSUFICIENTE",
    `Hoy solo puedes enviar ${restantes} ${sustantivo} más. Quita líneas de la lista o inténtalo mañana.`,
    409,
  )
}
