import type { CalificarEntrega, CriterioDeRubrica, CrearTarea } from "@campus/shared"
import type { QueryObserverResult } from "@tanstack/react-query"

import type { ErroresFormulario } from "@/lib/errores-de-api"

// Tipos de la API: se infieren de los esquemas de shared/, nunca a mano (regla 7 de CLAUDE.md).
export type {
  Adjunto,
  CalificacionDeEntrega,
  CalificarEntrega,
  Categoria,
  ComentarioPrivado,
  CrearComentario,
  CrearTarea,
  CriterioDeRubrica,
  EditarTarea,
  EntregaDeAlumno,
  Entregar,
  EstadoEntrega,
  FilaDeEntrega,
  ListaComentariosPrivadosRespuesta,
  ListaEntregasRespuesta,
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

// T-15 y CALIFICACIONES-01d (§D-13.1): lo que la clave de foco de las vistas de la tarea lee de su
// consulta vive en components/foco; se reexporta con su nombre.
export type { MomentoDeLaConsulta } from "@/components/foco/types"

// T-12: lo que el aviso de recarga fallida lee de la consulta de la tarea para saber si un fallo es
// nuevo (inferido del resultado de TanStack Query, no declarado a mano).
export type FalloDeLaConsulta = Pick<QueryObserverResult, "errorUpdatedAt" | "errorUpdateCount">

// CALIFICACIONES-01c (§D-12.2). Lo que el panel de calificación escribe: todo es texto crudo (los
// puntos tal como se teclearon, con punto o coma decimal) y se valida al enviar. Los puntos de la
// rúbrica van por id de criterio.
export interface EstadoDelPanel {
  puntajes: Readonly<Record<string, string>>
  calificacion: string
  comentario: string
}

// Enmienda 1 (M-02): los puntos y la rúbrica de la tarea con que se abrió el formulario. Viajan en el
// cuerpo y dicen las etiquetas aunque una recarga de fondo traiga otros.
export interface TareaDeApertura {
  puntos: number
  rubrica: readonly CriterioDeRubrica[]
}

// El cuerpo de calificar ya validado, o los errores por campo ("puntajes.<criterioId>",
// "calificacion", "comentario").
export type ResultadoDeCalificacion =
  { ok: true; datos: CalificarEntrega } | { ok: false; errores: ErroresFormulario }

// La suma de la rúbrica con lo que ya es válido, sobre la suma de los máximos, y la calificación
// escalada a los puntos de la tarea (solo para mostrar: decide el servidor).
export interface TotalDelPanel {
  suma: number
  sumaDeMaximos: number
  calificacion: number
}

// Las variables de la mutación de calificar: el cuerpo y si la entrega ya tenía calificación al abrir
// el formulario (decide el aviso de éxito).
export interface VariablesDeCalificar {
  cuerpo: CalificarEntrega
  habiaCalificacion: boolean
}
