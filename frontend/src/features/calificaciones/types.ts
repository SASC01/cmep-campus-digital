import type {
  AlumnoDeExportacion,
  CeldaDelGradebook,
  ColumnaDelGradebook,
  ExportacionDeCalificacionesRespuesta,
  FiltroDeMisCalificaciones,
  GradebookQuery,
} from "@campus/shared"

// Tipos de la API: se infieren de los esquemas de shared/, nunca a mano (regla 7 de CLAUDE.md).
export type {
  AlumnoDeExportacion,
  ExportacionDeCalificacionesRespuesta,
  FilaDeExportacion,
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

// CALIFICACIONES-02b (§D-4 y §D-7). Tipos exclusivos de la interfaz de la exportación a Excel.

// Una respuesta de la exportación y el índice de su ventana de tareas (0 la primera).
export interface VentanaDeExportacion {
  ventanaDeTareas: number
  respuesta: ExportacionDeCalificacionesRespuesta
}

// Un alumno con sus celdas en el orden de las columnas de la matriz.
export interface FilaDeLaMatriz {
  alumno: AlumnoDeExportacion
  celdas: CeldaDelGradebook[]
  porcentaje: number | null
}

// Toda la clase, ya combinada: las columnas de la más antigua a la más reciente.
export interface MatrizDeExportacion {
  clase: string
  columnas: ColumnaDelGradebook[]
  filas: FilaDeLaMatriz[]
}

export type CombinacionDeExportacion =
  { tipo: "matriz"; matriz: MatrizDeExportacion } | { tipo: "cambio" } | { tipo: "vacio" }

// Lo que deja el recorrido de las ventanas antes de combinarlas.
export type RecorridoDeExportacion =
  | { tipo: "ventanas"; ventanas: VentanaDeExportacion[] }
  | { tipo: "cambio" }
  | { tipo: "demasiado" }

// Lo que recibe la mutación: la señal para abortar y el reloj del clic.
export interface PeticionDeExportacion {
  signal: AbortSignal
  ahora: Date
}

// El resultado de la mutación: solo el nombre del archivo, nunca sus datos.
export type ResultadoDeLaExportacion =
  | { tipo: "descargado"; nombre: string }
  | { tipo: "cambio" }
  | { tipo: "vacio" }
  | { tipo: "demasiado" }
  | { tipo: "cancelado" }

// El aviso que corresponde a un resultado.
export interface AvisoDeLaExportacion {
  tipo: "exito" | "error"
  texto: string
}
