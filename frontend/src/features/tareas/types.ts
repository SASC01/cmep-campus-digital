import type { CrearTarea } from "@campus/shared"
import type { QueryObserverResult } from "@tanstack/react-query"

import type { ErroresFormulario } from "@/lib/errores-de-api"

// Tipos de la API: se infieren de los esquemas de shared/, nunca a mano (regla 7 de CLAUDE.md).
export type {
  Adjunto,
  Categoria,
  ComentarioPrivado,
  CrearComentario,
  CrearTarea,
  CriterioDeRubrica,
  EditarTarea,
  Entregar,
  EstadoEntrega,
  ListaComentariosPrivadosRespuesta,
  MiEntrega,
  ResumenDeTarea,
  TareaDetalle,
  Tema,
} from "@campus/shared"

export type { ErroresFormulario, IncidenciaValidacion } from "@/lib/errores-de-api"

// Tipos exclusivos de la interfaz de TAREAS-01d (§D-10).

// Un criterio de la rúbrica mientras se escribe: el texto crudo de los puntos y una llave local
// (estable aunque se quiten criterios de en medio), porque el servidor aún no le da id.
export interface CriterioDelFormulario {
  llave: string
  criterio: string
  puntosMax: string
}

// Lo que el formulario guarda mientras se escribe: todo es texto crudo (la fecha, tal como la da
// `datetime-local`; los puntos, tal como se tecleó) y se valida al enviar.
export interface EstadoDelFormulario {
  titulo: string
  instrucciones: string
  fechaLimite: string
  puntos: string
  categoriaId: string
  temaId: string
  aceptaTardias: boolean
  // ENTREGAS-01a (P-03 a): "Cómo se entrega".
  requiereAdjuntos: boolean
  rubrica: readonly CriterioDelFormulario[]
}

// El resultado de armar el cuerpo de una tarea con lo escrito: los datos validados (con
// `archivoIds` vacío: los archivos se suben después y sus ids se agregan) o los errores por campo. La
// clave de un error es el nombre del campo ("titulo", "fechaLimite", "categoriaId",
// "rubrica.0.criterio"…) y el valor, su primer mensaje.
export type ResultadoDelCuerpo =
  { ok: true; datos: CrearTarea } | { ok: false; errores: ErroresFormulario }

// T-12: lo que el aviso de recarga fallida lee de la consulta de la tarea para saber si un fallo es
// nuevo (inferido del resultado de TanStack Query, no declarado a mano).
// T-15: lo que la clave de foco de las vistas de la tarea lee de su consulta.
export type MomentoDeLaConsulta = Pick<
  QueryObserverResult,
  "status" | "dataUpdatedAt" | "errorUpdatedAt" | "errorUpdateCount"
>

export type FalloDeLaConsulta = Pick<QueryObserverResult, "errorUpdatedAt" | "errorUpdateCount">
