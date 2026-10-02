import {
  TAMANO_MAXIMO_ARCHIVO_BYTES,
  TIPOS_CON_VISTA_PREVIA,
  TIPOS_DE_ARCHIVO_PERMITIDOS,
} from "@campus/shared"

import { AppError } from "../errores.js"

export const VIGENCIA_URL_FIRMADA_S = 300

const LONGITUD_MAXIMA_NOMBRE = 255

// Controles de C0 y C1, sustitutos sueltos (T-42; un par válido, como un emoji, no lo es),
// separadores de línea y párrafo, y los controles bidireccionales que sirven para disfrazar una
// extensión.
const CARACTER_PROHIBIDO_EN_NOMBRE = /[\p{Cc}\p{Cs}\u2028\u2029\u202A-\u202E\u2066-\u2069]|[/\\]/u

const archivoInvalido = (mensaje: string): AppError =>
  new AppError("ARCHIVO_INVALIDO", mensaje, 400)

export const almacenNoConfigurado = (): AppError =>
  new AppError(
    "ALMACEN_NO_CONFIGURADO",
    "Los archivos no están disponibles en este momento. Inténtalo más tarde.",
    503,
  )

export const archivoNoSubido = (): AppError =>
  new AppError(
    "ARCHIVO_NO_SUBIDO",
    "Uno de los archivos no terminó de subir. Inténtalo de nuevo.",
    400,
  )

export const archivoNoCoincide = (): AppError =>
  archivoInvalido("Uno de los archivos no coincide con lo que elegiste. Vuelve a adjuntarlo.")

const extensionDe = (nombre: string): string => {
  const punto = nombre.lastIndexOf(".")
  if (punto < 0) return ""
  return nombre.slice(punto + 1).toLowerCase()
}

export const validarArchivoDeclarado = ({
  nombre,
  tipo,
  tamano,
}: {
  nombre: string
  tipo: string
  tamano: number
}): AppError | null => {
  const longitud = Array.from(nombre).length
  if (longitud === 0 || longitud > LONGITUD_MAXIMA_NOMBRE) {
    return archivoInvalido("El nombre del archivo no es válido.")
  }
  if (CARACTER_PROHIBIDO_EN_NOMBRE.test(nombre)) {
    return archivoInvalido("El nombre del archivo no es válido.")
  }
  // hasOwn: "constructor" o "__proto__" no son tipos permitidos.
  if (!Object.hasOwn(TIPOS_DE_ARCHIVO_PERMITIDOS, tipo)) {
    return archivoInvalido("Ese tipo de archivo no está permitido.")
  }
  const extensiones = TIPOS_DE_ARCHIVO_PERMITIDOS[tipo] ?? []
  if (!extensiones.includes(extensionDe(nombre))) {
    return archivoInvalido("La extensión del archivo no corresponde a su tipo.")
  }
  if (!Number.isSafeInteger(tamano) || tamano <= 0 || tamano > TAMANO_MAXIMO_ARCHIVO_BYTES) {
    return archivoInvalido("El archivo está vacío o pesa más de 25 MB.")
  }
  return null
}

// El nombre del usuario nunca forma parte de la clave.
export const claveDeMaterial = (claseId: string, archivoId: string): string =>
  `materiales/${claseId}/${archivoId}`

export const esImagenConVistaPrevia = (tipo: string): boolean =>
  TIPOS_CON_VISTA_PREVIA.includes(tipo)

// RFC 5987: además de lo que deja pasar encodeURIComponent, se codifican ' ( ) y *.
const codificarRfc5987 = (texto: string): string =>
  encodeURIComponent(texto).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  )

// La alternativa de ASCII solo conserva letras, números y unos pocos signos: sin comillas, sin
// punto y coma, sin saltos de línea.
const alternativaAscii = (nombre: string): string => {
  const limpio = nombre.replace(/[^A-Za-z0-9._ -]/gu, "_")
  return limpio.length > 0 ? limpio : "archivo"
}

// encodeURIComponent lanza con un sustituto suelto: cada uno pasa a U+FFFD.
const sinSustitutosSueltos = (texto: string): string =>
  Array.from(texto, (c) => {
    const punto = c.codePointAt(0) ?? 0
    return punto >= 0xd800 && punto <= 0xdfff ? String.fromCodePoint(0xfffd) : c
  }).join("")

export const disposicionDeContenido = (nombre: string, modo: "inline" | "attachment"): string => {
  const seguro = sinSustitutosSueltos(nombre)
  return `${modo}; filename="${alternativaAscii(seguro)}"; filename*=UTF-8''${codificarRfc5987(seguro)}`
}

const tipoSinParametros = (tipo: string): string => (tipo.split(";")[0] ?? "").trim().toLowerCase()

export const coincideConLoDeclarado = (
  declarado: { tamano: number; tipo: string },
  real: { tamano: number; tipo: string } | null,
): "ok" | "falta" | "distinto" => {
  if (real === null) return "falta"
  if (real.tamano !== declarado.tamano) return "distinto"
  if (tipoSinParametros(real.tipo) !== tipoSinParametros(declarado.tipo)) return "distinto"
  return "ok"
}
