import { VIGENCIA_TOKEN_MS, type TipoTokenCuenta } from "../auth/tokens-cuenta.js"

const FIRMA = "CMEP Campus Digital"

export const escaparHtml = (texto: string): string =>
  texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

const minutosDeVigencia = (tipo: TipoTokenCuenta): number => VIGENCIA_TOKEN_MS[tipo] / 60_000
const horasDeVigencia = (tipo: TipoTokenCuenta): number => VIGENCIA_TOKEN_MS[tipo] / 3_600_000

interface CorreoRenderizado {
  asunto: string
  html: string
  texto: string
}

const parrafo = (texto: string): string => `<p>${texto}</p>`
const boton = (texto: string, enlace: string): string => `<p><a href="${enlace}">${texto}</a></p>`

// Puras (sin @react-email): DEC-14. El HTML es provisional (S-10): sin tokens de CLAUDE.md, que no
// se pueden usar dentro de un correo.
export const plantillaCorreoDeCuenta = ({
  tipo,
  nombre,
  enlace,
  urlRecuperar,
}: {
  tipo: TipoTokenCuenta
  nombre: string
  enlace: string
  urlRecuperar: string
}): CorreoRenderizado => {
  const nombreEscapado = escaparHtml(nombre)
  const enlaceEscapado = escaparHtml(enlace)

  if (tipo === "recuperacion") {
    const minutos = minutosDeVigencia("recuperacion")
    const asunto = "Restablece tu contraseña de CMEP Campus Digital"
    const html = [
      parrafo(`Hola, ${nombreEscapado}.`),
      parrafo(
        "Recibimos una solicitud para restablecer la contraseña de tu cuenta en CMEP Campus Digital.",
      ),
      boton("Elegir una contraseña nueva", enlaceEscapado),
      parrafo(`El enlace vence en ${minutos} minutos y solo funciona una vez.`),
      parrafo("Si no pediste este cambio, ignora este correo: tu contraseña sigue igual."),
      parrafo(FIRMA),
    ].join("\n")
    const texto = [
      `Hola, ${nombre}.`,
      "Recibimos una solicitud para restablecer la contraseña de tu cuenta en CMEP Campus Digital.",
      `Elegir una contraseña nueva: ${enlace}`,
      `El enlace vence en ${minutos} minutos y solo funciona una vez.`,
      "Si no pediste este cambio, ignora este correo: tu contraseña sigue igual.",
      FIRMA,
    ].join("\n")
    return { asunto, html, texto }
  }

  const horas = horasDeVigencia("invitacion")
  const asunto = "Activa tu cuenta de maestro en CMEP Campus Digital"
  const html = [
    parrafo(`Hola, ${nombreEscapado}.`),
    parrafo("Administración te dio de alta como maestro en CMEP Campus Digital."),
    boton("Elegir mi contraseña", enlaceEscapado),
    parrafo(`El enlace vence en ${horas} horas y solo funciona una vez.`),
    parrafo(`Si vence, pide uno nuevo en ${escaparHtml(urlRecuperar)} o acude a administración.`),
    parrafo(FIRMA),
  ].join("\n")
  const texto = [
    `Hola, ${nombre}.`,
    "Administración te dio de alta como maestro en CMEP Campus Digital.",
    `Elegir mi contraseña: ${enlace}`,
    `El enlace vence en ${horas} horas y solo funciona una vez.`,
    `Si vence, pide uno nuevo en ${urlRecuperar} o acude a administración.`,
    FIRMA,
  ].join("\n")
  return { asunto, html, texto }
}
