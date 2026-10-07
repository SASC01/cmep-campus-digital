// CLASES-d: lo que components/adjuntos/lib.ts necesita saber de un archivo elegido (un File lo cumple).
// TAREAS-01c (§D-9): movido desde features/clases/types.ts, que lo reexporta.
export interface ArchivoCandidato {
  name: string
  type: string
  size: number
}
