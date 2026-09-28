import { NOMBRE_DEL_COLEGIO, RUTAS_CON_ORBES_EN_MOVIMIENTO } from "./data"
import type { EnlaceDelColegio, EnlaceVisible } from "./types"

// S-03: movimiento solo en /login, /estudiante y /maestro exactos, sin distinguir mayúsculas y sin
// la barra final (salvo "/", que no aparece en la lista).
export const orbesEnMovimiento = (pathname: string): boolean => {
  const normalizada = pathname.toLowerCase().replace(/\/+$/, "") || "/"
  return (RUTAS_CON_ORBES_EN_MOVIMIENTO as readonly string[]).includes(normalizada)
}

// Protocolos publicables (S-07): https, mailto y tel. Nunca "#", rutas relativas, http ni
// javascript:. Retornos tempranos, en el orden que pide §D-5.
export const esUrlPublicable = (url: string | null): boolean => {
  if (!url) return false
  let analizada: URL
  try {
    analizada = new URL(url)
  } catch {
    return false
  }
  // Se publica solo lo que el analizador deja exactamente igual (M-03, T-01 y T-03 de las rondas 1
  // y 2): la única diferencia admitida es la barra que agrega a un dominio sin ruta. Así queda como
  // marcador todo lo que el analizador quita o transforma en silencio, sin enumerar caracteres:
  // controles en cualquier posición, espacios en los extremos, tabuladores y saltos de línea en
  // medio, y los caracteres invisibles del dominio (guion suave, espacio de ancho cero…). Sin
  // expresiones regulares.
  if (analizada.href !== url && analizada.href !== `${url}/`) return false
  return (
    analizada.protocol === "https:" ||
    analizada.protocol === "mailto:" ||
    analizada.protocol === "tel:"
  )
}

// Con URL publicable, el enlace real; sin ella, un marcador solo en desarrollo (S-07). Conserva
// el orden de la lista.
export const enlacesVisibles = (
  enlaces: readonly EnlaceDelColegio[],
  esProduccion: boolean,
): EnlaceVisible[] => {
  const visibles: EnlaceVisible[] = []
  for (const enlace of enlaces) {
    if (esUrlPublicable(enlace.url)) {
      visibles.push({ texto: enlace.texto, url: enlace.url as string })
      continue
    }
    if (!esProduccion) visibles.push({ texto: enlace.texto, url: null })
  }
  return visibles
}

// Año local del navegador en el momento de pintar (S-07: "© <año actual> …").
export const textoDeDerechos = (ahora: Date): string =>
  `© ${ahora.getFullYear()} ${NOMBRE_DEL_COLEGIO}`
