import { TEXTOS_DE_LA_CLASE } from "@/components/clase/data"
import { formatearPorcentaje } from "@/lib/format"

import type { AccionDeVentana, FiltroDeMisCalificaciones, OpcionDelFiltro } from "./types"

// CALIFICACIONES-01d (§D-13.2). Textos y constantes del gradebook, de "Mis calificaciones" y del modal
// de cálculo (tono de DESIGN.md §9).

// Los tamaños de cada petición, como el servidor (§D-6 y §D-7).
export const LIMITE_ALUMNOS_DEL_GRADEBOOK = 25
export const LIMITE_TAREAS_DEL_GRADEBOOK = 20
export const LIMITE_DE_MIS_CALIFICACIONES = 20

// S-04: el umbral del promedio que el servidor compara (constante de core/ en el backend).
const UMBRAL_PROMEDIO_EN_RIESGO = 70

const SIN_DATO = "—"

export const TEXTOS_GRADEBOOK = {
  titulo: "Calificaciones",
  caption: "Calificaciones por alumno y tarea",
  alumno: "Alumno",
  dePuntos: (puntos: string) => `de ${puntos} puntos`,
  sinCategoria: TEXTOS_DE_LA_CLASE.sinCategoria,
  promedio: "Promedio",
  riesgo: "Riesgo",
  enRiesgo: "En riesgo",
  motivoPromedio: `Promedio menor a ${formatearPorcentaje(UMBRAL_PROMEDIO_EN_RIESGO)}`,
  motivoVencidas: "3 o más tareas vencidas sin entregar",
  separadorDeMotivos: " · ",
  asignado: "Asignado",
  conRetraso: "con retraso",
  celdaDe: (alumno: string, tarea: string) => `${alumno}, ${tarea}`,
  alumnos: (n: number) => (n === 1 ? "1 alumno" : `${String(n)} alumnos`),
  promedioDeLaClase: (promedio: string) => `Promedio de la clase: ${promedio}`,
  enRiesgoConteo: (n: number) => `${String(n)} en riesgo`,
  sinDato: SIN_DATO,
  cargando: "Cargando las calificaciones…",
  sinAlumnos: "Aún no hay alumnos en esta clase.",
  sinTareas: "Aún no hay tareas en esta clase.",
} as const

// Los textos de los cuatro botones de las ventanas.
export const TEXTOS_DE_VENTANAS: Readonly<Record<AccionDeVentana, string>> = {
  "tareas-recientes": "Tareas más recientes",
  "tareas-antiguas": "Tareas más antiguas",
  "alumnos-anteriores": "Alumnos anteriores",
  "alumnos-siguientes": "Alumnos siguientes",
}

export const TEXTOS_MIS_CALIFICACIONES = {
  titulo: "Mis calificaciones",
  general: "Calificación general",
  sinGeneral: "Aún no tienes tareas calificadas que cuenten.",
  verCalculo: "Ver cálculo",
  mostrar: "Mostrar",
  calificacionDe: (puntos: string, sobre: string) => `${puntos} de ${sobre}`,
  sinCategoria: TEXTOS_DE_LA_CLASE.sinCategoria,
  verMas: "Ver más tareas",
  cargando: "Cargando tus calificaciones…",
} as const

export const OPCIONES_DEL_FILTRO: readonly OpcionDelFiltro[] = [
  { valor: "todas", texto: "Todas" },
  { valor: "asignadas", texto: "Asignadas" },
  { valor: "entregadas", texto: "Entregadas" },
  { valor: "calificadas", texto: "Calificadas" },
  { valor: "sin-entregar", texto: "Sin entregar" },
]

export const VACIOS_POR_FILTRO: Readonly<Record<FiltroDeMisCalificaciones, string>> = {
  todas: "Aún no hay tareas en esta clase.",
  asignadas: "No tienes tareas asignadas pendientes.",
  entregadas: "No tienes tareas entregadas sin calificar.",
  calificadas: "Aún no tienes tareas calificadas.",
  "sin-entregar": "No tienes tareas sin entregar.",
}

export const TEXTOS_CALCULO = {
  titulo: "Cálculo de tu calificación",
  modoPuntos:
    "Esta clase califica por puntos: se suman los puntos de tus tareas calificadas y se dividen entre los puntos posibles.",
  obtuviste: (obtenido: string, posible: string, porcentaje: string) =>
    `Obtuviste ${obtenido} de ${posible} puntos: ${porcentaje}.`,
  categoria: "Categoría",
  peso: "Peso",
  pesoQueCuenta: "Peso que cuenta",
  tuPorcentaje: "Tu porcentaje",
  tareasCalificadas: "Tareas calificadas",
  reparto: "Las categorías sin tareas calificadas no cuentan: su peso se reparte entre las demás.",
  sinCategoria: (n: number) =>
    n === 1
      ? "1 tarea sin categoría no cuenta en tu calificación general."
      : `${String(n)} tareas sin categoría no cuentan en tu calificación general.`,
  general: (porcentaje: string) => `Tu calificación general: ${porcentaje}.`,
  nada: "Todavía no tienes tareas calificadas que cuenten en tu calificación general.",
  sinDato: SIN_DATO,
  cerrar: "Cerrar",
} as const

// Enmienda 2 (S-21 y S-22): los textos de error de las consultas del módulo. Nunca se muestra el
// mensaje del servidor: en una consulta llega en inglés (los de forma de zod).
export const MENSAJES_ERROR_CALIFICACIONES = {
  sinAcceso: TEXTOS_DE_LA_CLASE.sinAcceso,
  gradebook: "No pudimos cargar las calificaciones. Inténtalo de nuevo.",
  misCalificaciones: "No pudimos cargar tus calificaciones. Inténtalo de nuevo.",
  verMasTareas: "No pudimos cargar más tareas. Inténtalo de nuevo.",
  cursorDelGradebook:
    "La clase cambió mientras veías las calificaciones. Vuelve a abrir Calificaciones para verlas completas.",
  cursorDeMisCalificaciones:
    "Tus tareas cambiaron mientras las veías. Vuelve a abrir Calificaciones para verlas completas.",
} as const

// Enmienda 2 (§D-13.2): los campos de cursor que cada vista reconoce en un 400.
export const CAMPOS_DE_CURSOR_DEL_GRADEBOOK: readonly string[] = ["cursor", "cursorTareas"]
export const CAMPOS_DE_CURSOR_DE_MIS_CALIFICACIONES: readonly string[] = ["cursor"]

// Los errores con que apiClient ya redirigió (la misma lista que features/tareas: un módulo no importa
// de otro, regla 9 de CLAUDE.md). Ante ellos no se avisa.
export const CODIGOS_QUE_REDIRIGE_EL_CLIENTE: readonly string[] = [
  "ACCESO_RESTRINGIDO",
  "CAMBIO_DE_CONTRASENA_REQUERIDO",
  "NO_AUTENTICADO",
]
