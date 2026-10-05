import type { LucideIcon } from "lucide-react"

// El rol es contrato de la API: se infiere del esquema zod de shared/ (CLAUDE.md, regla 7).
export type { Rol } from "@campus/shared"

// Un destino de la barra de navegación (§D-3): una ruta por rol, sin destinos nuevos (S-14 y R-01).
export interface Destino {
  etiqueta: string
  ruta: string
  icono: LucideIcon
  // CLASES-02c (M-04): el enlace queda activo solo en su ruta exacta o también en sus subrutas. Es
  // obligatorio y sin valor por defecto: cada destino lo dice.
  coincidencia: "exacta" | "prefijo"
}

// Contexto de material y densidad por rol (§D-3 y §D-4): solo el administrador es denso y opaco.
export interface ContextoDeRol {
  material?: "opaco"
  densidad?: "densa"
}

// Un enlace del pie (§D-5): sin URL, el enlace no se publica (S-07).
export interface EnlaceDelColegio {
  texto: string
  url: string | null
}

// Lo que PieDePagina realmente pinta: un enlace con URL publicable, o un marcador sin ella.
export type EnlaceVisible = { texto: string; url: string } | { texto: string; url: null }
