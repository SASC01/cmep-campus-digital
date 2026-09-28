import { House, Users } from "lucide-react"

import type { ContextoDeRol, Destino, EnlaceDelColegio, Rol } from "./types"

// Nombre del producto, en dos colores (§D-3). Duplica TEXTOS_LOGIN.titulo de features/auth: un
// módulo de components/layout no puede importar de features/ (CLAUDE.md, regla 9; S-14).
export const NOMBRE_PRODUCTO = {
  sigla: "CMEP",
  nombre: "Campus Digital",
  monograma: "cm",
} as const

export const TEXTOS_MARCO = {
  navegacion: "Navegación principal",
  cerrarSesion: "Cerrar sesión",
  enlacesDelColegio: "Enlaces del colegio",
} as const

// Espaciado entre barra superior, contenido y pie (§D-3, DESIGN.md §5): 20 px para estudiante y
// maestro, 16 px en el administrador. Propuesta: el maestro pasa de 24 a 20 px.
export const ESPACIADO_POR_ROL: Record<Rol, string> = {
  estudiante: "gap-5",
  maestro: "gap-5",
  admin: "gap-4",
}

// Contexto de material y densidad por rol (§D-3 y §D-4): solo el administrador es denso y opaco.
export const CONTEXTO_POR_ROL: Record<Rol, ContextoDeRol> = {
  estudiante: {},
  maestro: {},
  admin: { material: "opaco", densidad: "densa" },
}

// Un solo destino por rol (respuesta 1 de plan.md; recordatorio en la hoja, H-12). Duplica las
// rutas de RUTA_POR_ROL de features/auth/data.ts (S-14).
export const DESTINOS_POR_ROL: Record<Rol, readonly Destino[]> = {
  estudiante: [{ etiqueta: "Inicio", ruta: "/estudiante", icono: House }],
  maestro: [{ etiqueta: "Inicio", ruta: "/maestro", icono: House }],
  admin: [{ etiqueta: "Cuentas", ruta: "/admin", icono: Users }],
}

// Rutas con los orbes en movimiento (S-03); orbesEnMovimiento normaliza antes de comparar.
export const RUTAS_CON_ORBES_EN_MOVIMIENTO = ["/login", "/estudiante", "/maestro"] as const

export const NOMBRE_DEL_COLEGIO = "Colegio Mexicano de Estudios de Posgrado Jurídicos y Económicos"

// Enlaces del pie (decisión del humano, 2026-09-27). Para publicar uno, escribe su URL completa,
// sin espacios alrededor (https://…, mailto:… o tel:…). Sin URL válida: en desarrollo se ve como
// marcador y en el build de producción no se muestra. Nunca uses "#".
export const ENLACES_DEL_COLEGIO: readonly EnlaceDelColegio[] = [
  { texto: "Sitio web", url: null },
  { texto: "Facebook", url: null },
  { texto: "Contacto", url: null },
  { texto: "Aviso de privacidad", url: null },
]
