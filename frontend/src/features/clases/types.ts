import type { ClaseDetalle, ListaPublicacionesRespuesta } from "@campus/shared"

// Tipos de la API: se infieren de los esquemas de shared/, nunca a mano (regla 7 de CLAUDE.md).
export type {
  Adjunto,
  AlumnoDeClase,
  Candidato,
  CandidatoMaestro,
  CandidatosMaestroRespuesta,
  ClaseAdmin,
  ClaseDetalle,
  ClaseImpartida,
  ClaseInscrita,
  Comentario,
  CrearClase,
  CrearClaseAdmin,
  CrearPublicacion,
  EditarClase,
  ListaClasesAdminRespuesta,
  MaestrosDeClaseRespuesta,
  PersonaConCorreo,
  PersonaDeClase,
  Publicacion,
  SolicitarSubida,
  SolicitarSubidaRespuesta,
  TipoPublicacion,
  Unirse,
  UnirseRespuesta,
} from "@campus/shared"

// Tipos exclusivos de la interfaz de CLASES-a.
// A-6 de CLASES-02: se declara en lib/variante-de-clase.ts, que usan la tarjeta y la barra lateral.
export type { VarianteDeClase } from "@/lib/variante-de-clase"

export type RolDeClases = "estudiante" | "maestro"

// CLASES-02c (§D-2C1): desde dónde se mira una clase. TAREAS-01c (§D-9): se declara en
// lib/ruta-de-clase.ts, que usan también las tareas, y se reexporta aquí.
export type { Perspectiva } from "@/lib/ruta-de-clase"

// Una sección de la clase: `segmento` es la parte de la ruta bajo la base ("" es el muro).
export interface SeccionDeClase {
  segmento: string
  texto: string
}

// Lo que cada perspectiva ve de una clase (§D-2C1); es una fila de CAPACIDADES_POR_PERSPECTIVA.
export interface CapacidadesDePerspectiva {
  base: string
  volverDestino: string
  volverTexto: string
  secciones: readonly SeccionDeClase[]
  verCodigo: boolean
  editar: boolean
  formularioPublicacion: boolean
  formularioComentario: boolean
  // TAREAS-01d (§D-10): "Crear tarea" en el muro; solo quien publica (maestro y admin).
  crearTarea: boolean
}

// Un maestro de una clase, tal como lo devuelve el detalle (uno o dos por clase).
export type MaestroDeLaClase = ClaseDetalle["maestros"][number]

// Errores de validación en cliente por campo y las incidencias de safeParse. TAREAS-01c (§D-9): se
// declaran en lib/errores-de-api.ts, que usan también las tareas, y se reexportan aquí.
export type { ErroresFormulario, IncidenciaValidacion } from "@/lib/errores-de-api"

// N-03 (ronda 4 del manager): una fila del panel "Mis clases", no un tipo de Props de un
// componente (regla 6 de CLAUDE.md), así que vive aquí y no en panel-mis-clases.tsx.
export interface ClaseDelPanel {
  id: string
  nombre: string
  metadatos: string
  destino: string
}

// CLASES-d: lo que lib.ts necesita saber de un archivo elegido (un File lo cumple). TAREAS-01c
// (§D-9): se declara en components/adjuntos/types.ts y se reexporta aquí.
export type { ArchivoCandidato } from "@/components/adjuntos/types"

// T-40: una página del muro, tal como la devuelve la API.
export type PaginaDelMuro = ListaPublicacionesRespuesta

// Una fila de la lista de maestros: los de una clase (sin correo) o los elegidos al crearla (con
// el correo completo que el administrador ve en el buscador).
export interface MaestroDeLista {
  id: string
  nombre: string
  email?: string | undefined
}
