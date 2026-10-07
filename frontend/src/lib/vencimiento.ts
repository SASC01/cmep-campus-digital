import { formatearFechaLarga } from "@/lib/format"

// TAREAS-01d (§D-10, S-10, DESIGN.md §7.7). El estado y el texto de la fecha límite de una tarea:
// los usan el muro y "Trabajo de clase" (features/clases) y el detalle (features/tareas). Puro: recibe
// `ahora`, y el día y la hora salen en la zona del navegador (RNF-07). Produce textos, como format.ts.

// S-10: una fecha límite es "próxima" a 72 h o menos (3 días dan margen para un fin de semana).
export const UMBRAL_FECHA_PROXIMA_MS = 72 * 60 * 60 * 1000

const MS_POR_DIA = 24 * 60 * 60 * 1000

export const TEXTO_FECHA_NO_DISPONIBLE = "Fecha límite no disponible"

export interface Vencimiento {
  estado: "pendiente" | "proxima" | "vencida"
  texto: string
}

const horaLocal = (fecha: Date): string =>
  new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
    fecha,
  )

// Días de calendario entre dos fechas, medidos en la zona local (no en bloques de 24 h): de las 23:00
// de hoy a las 01:00 de mañana hay 1.
const diasDeCalendario = (desde: Date, hasta: Date): number =>
  Math.round(
    (Date.UTC(hasta.getFullYear(), hasta.getMonth(), hasta.getDate()) -
      Date.UTC(desde.getFullYear(), desde.getMonth(), desde.getDate())) /
      MS_POR_DIA,
  )

const textoDeLaFecha = (limite: Date, ahora: Date): string => {
  const dias = diasDeCalendario(ahora, limite)
  if (dias === 0) return `Vence hoy a las ${horaLocal(limite)}`
  if (dias === 1) return `Vence mañana a las ${horaLocal(limite)}`
  if (dias === 2 || dias === 3) return `Vence en ${dias} días`
  return `Vence el ${formatearFechaLarga(limite)}`
}

// "vencida": ya pasó (hasta ENTREGAS no hay "Sin entregar": la fila dice "Venció el …", en tono muted);
// "proxima": faltan 72 h o menos; "pendiente": más. Una fecha que no se puede leer no devuelve el texto
// ISO: dice que no está disponible y no cuenta como próxima.
export const vencimientoDe = (fechaLimiteIso: string, ahora: Date): Vencimiento => {
  const limite = new Date(fechaLimiteIso)
  if (Number.isNaN(limite.getTime()))
    return { estado: "pendiente", texto: TEXTO_FECHA_NO_DISPONIBLE }
  const faltan = limite.getTime() - ahora.getTime()
  if (faltan <= 0) return { estado: "vencida", texto: `Venció el ${formatearFechaLarga(limite)}` }
  return {
    estado: faltan <= UMBRAL_FECHA_PROXIMA_MS ? "proxima" : "pendiente",
    texto: textoDeLaFecha(limite, ahora),
  }
}

// DESIGN.md §7.7: la variante de la insignia de una fecha límite. Solo la próxima llama la atención
// (warning, con su texto "Vence …"); pendiente y vencida van en tono muted, y el texto dice cuál es.
export const varianteDeVencimiento = (estado: Vencimiento["estado"]): "warning" | "muted" =>
  estado === "proxima" ? "warning" : "muted"
