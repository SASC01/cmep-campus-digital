import type { FiltroDeMisCalificaciones, GradebookQuery } from "@campus/shared"

// Tipos de la API: se infieren de los esquemas de shared/, nunca a mano (regla 7 de CLAUDE.md).
export type {
  CalificacionGeneral,
  CeldaDelGradebook,
  ColumnaDelGradebook,
  DesgloseDeCategoria,
  FilaDelGradebook,
  FiltroDeMisCalificaciones,
  GradebookRespuesta,
  MisCalificacionesRespuesta,
  MotivoDeRiesgo,
  ResumenDelGradebook,
  TareaDeMisCalificaciones,
} from "@campus/shared"

// Tipos exclusivos de la interfaz de CALIFICACIONES-01d (§D-13.2).

// La ventana del gradebook: el cursor de alumnos y el de tareas (null en la primera). N-30: se deriva
// de la consulta de shared/, no se escribe a mano.
export type VentanaDelGradebook = {
  [K in "cursor" | "cursorTareas"]: NonNullable<GradebookQuery[K]> | null
}

// Los tamaños de una ventana (alumnos y tareas), con los nombres de la consulta de shared/.
export type LimitesDelGradebook = Pick<GradebookQuery, "limite" | "limiteTareas">

// Las dos dimensiones que se recorren por ventanas.
export type DimensionDelGradebook = "alumnos" | "tareas"

// La ventana a la vista y las pilas de las anteriores de cada dimensión: "Alumnos anteriores" y "Tareas
// más recientes" regresan por su pila sin tocar la otra dimensión.
export interface VentanasDelGradebook {
  ventana: VentanaDelGradebook
  anterioresDeAlumnos: readonly (string | null)[]
  anterioresDeTareas: readonly (string | null)[]
}

// Los cuatro botones de las ventanas.
export type AccionDeVentana =
  "tareas-recientes" | "tareas-antiguas" | "alumnos-anteriores" | "alumnos-siguientes"

// Lo que dice una celda: el texto visible y, si hace falta, lo que oye el lector de pantalla en su
// lugar (la asignada sin vencer se ve "—" y se oye "Asignado").
export interface TextoDeCelda {
  visible: string
  soloLector: string | null
  conRetraso: boolean
}

// Una opción del selector "Mostrar".
export interface OpcionDelFiltro {
  valor: FiltroDeMisCalificaciones
  texto: string
}
