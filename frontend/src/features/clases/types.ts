import type {
  ClaseDetalle,
  CrearPublicacion,
  EditarRecurso as RecursoEditado,
  ListaPublicacionesRespuesta,
  Tema,
} from "@campus/shared"

import type { ErroresFormulario as ErroresDelFormulario } from "@/lib/errores-de-api"

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
  // TAREAS-01e (§D-11): "Trabajo de clase", temas y categorías.
  Categoria,
  ElementoDeTrabajo,
  ListaCategoriasRespuesta,
  ListaTemasRespuesta,
  ListaTrabajoRespuesta,
  Tema,
  // CLASES-03c2 (§D-7.6): la sección cuyos conteos pide la lista de temas.
  SeccionDeTemas,
  // CLASES-03d (§D-8): "Recursos".
  BloqueDeRecurso,
  EditarRecurso,
  ListaRecursosRespuesta,
  Recurso,
  RecursoDetalle,
  // CLASES-03e (§D-9): "Dudas" (las respuestas tienen la forma de los comentarios).
  CrearDuda,
  CrearRespuesta,
  Duda,
  ListaDudasRespuesta,
  // ADMIN-01c (§D-10): las dos listas del administrador, el conteo de borrado y duplicar.
  ConteoDeBorradoRespuesta,
  DuplicarClase,
  EstadoDeClases,
} from "@campus/shared"

// ADMIN-01c (§D-2, Enmienda 5): la página siguiente de /admin/clases. En "Archivadas" lleva además la
// posición de la fila del cursor, tal como la emitió el servidor.
export interface CursorDeClasesAdmin {
  cursor: string
  cursorArchivadaEn?: string
}

// ADMIN-01c (DESIGN.md §7.14): el control de una fila que recibe el foco cuando otra fila sale.
export type AccionDeFilaDeClase = "archivar" | "restaurar" | "borrar"

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

// CLASES-03 (§D-7.2, DH-03): lo que se mide de una opción de las secciones y de su panel, y lo que
// lleva el indicador (en px).
export interface MedidaDeOpcion {
  offsetLeft: number
  offsetWidth: number
}

export interface MedidaDelPanel {
  scrollLeft: number
  clientWidth: number
}

export interface MedidaDelIndicador {
  x: number
  ancho: number
}

// CLASES-03c1 (T-02 de la ronda 1): dónde está el panel de las secciones en la ventana (el borde
// izquierdo de su rectángulo), el ancho de su borde y cuánto se ha desplazado, para llevar una opción
// a las coordenadas de su área desplazable.
export interface PosicionDelPanel {
  left: number
  clientLeft: number
  scrollLeft: number
}

// CLASES-03c1 (T-01 de la ronda 1): la medida del indicador con la clase y la perspectiva (la base de
// la ruta) en que se tomó; la de otra clase no se pinta.
export interface MedidaDelIndicadorDeLaClase extends MedidaDelIndicador {
  base: string
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
  // TAREAS-01e (§D-11): crear, renombrar, ordenar y borrar temas, "Crear tarea" como acción principal
  // de "Trabajo de clase" y "Categorías de calificación" (maestro y admin; P-02 b). Mover un elemento
  // no sale de aquí: lo decide `puedeMover` de cada elemento.
  gestionarTrabajo: boolean
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

// TAREAS-01e (§D-11, Enmienda 5): el limitador FIFO de las lecturas de "Trabajo de clase". `ejecutar`
// corre la tarea si hay lugar y, si no, la forma en una cola; con el `signal` abortado mientras espera,
// sale de la cola y rechaza con el aborto.
export interface LimiteDeConcurrencia {
  ejecutar: <T>(tarea: () => Promise<T>, signal?: AbortSignal) => Promise<T>
}

// La clave de una sección de "Trabajo de clase": el id del tema o "sin-tema" (el parámetro `tema` de
// GET …/trabajo).
export type ClaveDeSeccion = string

// Una sección de "Trabajo de clase" tal como la pinta la vista: "Sin tema" (sin `tema`) o un tema.
export interface SeccionDeTrabajo {
  clave: ClaveDeSeccion
  nombre: string
  elementos: number
  tema: Tema | null
}

// Cuál de los dos botones de orden de un tema se pulsó (el foco vuelve a él tras reordenar).
export type ControlDeOrden = "subir" | "bajar"

export interface OrdenEnVuelo {
  temaId: string
  control: ControlDeOrden
}

// El cuadro de fecha de una fila de entrega (DESIGN.md §7.7): el día y el mes abreviado, en la zona
// local.
export interface CuadroDeFecha {
  dia: string
  mes: string
}

// Una fila del editor de categorías: la llave es estable (el id de la categoría guardada o una local
// para las nuevas), así que los errores viajan con su fila (patrón T-06 de la rúbrica). El peso se
// guarda como lo escribió la persona y se convierte al validar.
export interface FilaDeCategoria {
  llave: string
  id?: string | undefined
  nombre: string
  peso: string
  tareas: number
}

// Hacia dónde va el foco después de quitar o agregar una fila del editor de categorías (§7.14): el
// "Quitar" de la fila que ocupa su lugar (o, si no lo tiene, su nombre), el nombre de la fila nueva o,
// con `llave` en null, "Agregar categoría". M-01 (revisión de 01e): vive aquí y no en el componente
// (regla 6 de CLAUDE.md).
// T-18 (ronda 1 de 01e): también conserva el foco de un campo cuando la lista se reemplaza con la
// respuesta del servidor (`soloSiSePerdio`: solo si ese reemplazo lo dejó en <body>).
export interface FocoPendiente {
  llave: string | null
  campo: CampoDeLaFila
  soloSiSePerdio?: boolean
}

// Los controles de una fila del editor de categorías a los que puede volver el foco.
export type CampoDeLaFila = "quitar" | "nombre" | "peso"

// ENTREGAS-01d (§D-9.8): la segunda línea de una fila de "Trabajo de clase" y los colores de la fila.
export interface SegundaLineaDeLaFila {
  texto: string
  colores: { cuadro: string; estado: string }
}

// CLASES-03d (§D-8.5, §D-8.7): lo que envía cada formulario, inferido del esquema de shared/
// (crearPublicacionSchema): el anuncio de Avisos y el recurso (un material) de "Nuevo recurso".
export type CrearAnuncio = Extract<CrearPublicacion, { tipo: "anuncio" }>
export type CrearRecurso = Extract<CrearPublicacion, { tipo: "material" }>

// El resultado de validar en local lo que se va a enviar: el cuerpo normalizado o los errores por campo.
export type ValidacionDelCuerpo<Cuerpo> =
  { ok: true; datos: Cuerpo } | { ok: false; errores: ErroresDelFormulario }

// Lo escrito en "Nuevo recurso" o "Editar recurso" (sin los archivos, que se suben después).
export interface CamposDelRecurso {
  titulo: string
  texto: string
  // "" es "Sin tema".
  temaId: string
}

// El modo del formulario del recurso (§D-8.5).
export type ModoDelRecurso = "crear" | "editar"

// Lo que "Nuevo recurso" o "Editar recurso" envía tras validarlo en local (los ids de los archivos
// nuevos se suman al subirlos).
export type EnvioDelRecurso =
  { modo: "crear"; datos: CrearRecurso } | { modo: "editar"; datos: RecursoEditado }
