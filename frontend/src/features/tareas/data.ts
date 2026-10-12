import { MAXIMO_CRITERIOS_RUBRICA } from "@campus/shared"

import { MENSAJES_POR_CODIGO_DE_ARCHIVO } from "@/components/adjuntos/data"
import { TEXTOS_DE_LA_CLASE } from "@/components/clase/data"

// §D-10, "Textos de la interfaz" (propuesta, tono de DESIGN.md §9).

// S-03: el formulario propone 100 puntos.
export const PUNTOS_PROPUESTOS = 100
export const LIMITE_CRITERIOS = MAXIMO_CRITERIOS_RUBRICA

// El indicador del control segmentado de dos botones se traslada una posición (DESIGN.md §7.3).
export const CLASES_DE_POSICION_DEL_INDICADOR = ["", "translate-x-full"] as const

// Los campos con nombre en el servidor: el prefijo "campo: mensaje" de un VALIDACION se asocia a ellos.
export const CAMPOS_DEL_FORMULARIO: readonly string[] = [
  "titulo",
  "instrucciones",
  "fechaLimite",
  "puntos",
  "categoriaId",
  "temaId",
  "requiereAdjuntos",
  "rubrica",
]

// Código del servidor → campo del formulario al que pertenece su error.
export const CAMPO_DE_CADA_CODIGO: Readonly<Record<string, string>> = {
  FECHA_LIMITE_INVALIDA: "fechaLimite",
  CATEGORIA_REQUERIDA: "categoriaId",
  CATEGORIA_NO_ENCONTRADA: "categoriaId",
  TEMA_NO_ENCONTRADO: "temaId",
}

export const TEXTOS_FORMULARIO_TAREA = {
  tituloCrear: "Nueva tarea",
  tituloEditar: "Editar tarea",
  campoTitulo: "Título",
  campoInstrucciones: "Instrucciones (opcional)",
  campoFecha: "Fecha límite",
  ayudaFecha: "Hora de tu zona horaria.",
  campoPuntos: "Puntos",
  campoCategoria: "Categoría",
  sinCategoria: "Sin categoría",
  eligeCategoria: "Elige una categoría",
  categoriaRequerida: "Elige la categoría de la tarea.",
  opcionDeCategoria: (nombre: string, peso: number) => `${nombre} (${peso} %)`,
  campoTema: "Tema",
  sinTema: TEXTOS_DE_LA_CLASE.sinTema,
  // ENTREGAS-01a (P-03 a): "Cómo se entrega", control segmentado antes del de entregas tardías.
  grupoComoSeEntrega: "Cómo se entrega",
  conArchivosOEnlaces: "Con archivos o enlaces",
  marcarComoCompletada: "Marcar como completada",
  grupoEntregasTardias: "Entregas después de la fecha límite",
  aceptarConRetraso: "Aceptar con retraso",
  noAceptar: "No aceptar",
  publicar: "Publicar tarea",
  guardar: "Guardar cambios",
  cancelar: "Cancelar",
  avisoPublicada: "Tarea publicada",
  avisoGuardada: "Cambios guardados",
  tope: (maximo: number) => `La rúbrica puede tener hasta ${maximo} criterios.`,
  cargandoOpciones: "Cargando las categorías y los temas…",
  // M-01 y T-13: una recarga de la tarea falló con el formulario abierto; lo escrito no se toca. El
  // texto depende de qué falló: sin conexión o una respuesta del servidor.
  avisoRecargaFallida:
    "No pudimos actualizar la tarea. Puedes seguir editando; revisa tu conexión.",
  avisoRecargaFallidaDelServidor:
    "No pudimos actualizar la tarea. Puedes seguir editando; inténtalo de nuevo en un momento.",
  errorOpciones:
    "No pudimos cargar las categorías y los temas. Revisa tu conexión e inténtalo de nuevo.",
} as const

export const TEXTOS_RUBRICA = {
  titulo: "Rúbrica (opcional)",
  criterio: "Criterio",
  puntosMaximos: "Puntos máximos",
  agregar: "Agregar criterio",
  quitar: "Quitar criterio",
  total: (suma: number, puntosDeLaTarea: number | null) => {
    const puntos = suma === 1 ? "1 punto" : `${suma} puntos`
    const escala =
      puntosDeLaTarea === null
        ? "La calificación se escala a los puntos de la tarea."
        : `La calificación se escala a los ${puntosDeLaTarea} puntos de la tarea.`
    return `La rúbrica suma ${puntos}. ${escala}`
  },
} as const

export const TEXTOS_DETALLE_TAREA = {
  // M-01: una recarga del detalle falló y se sigue mostrando la tarea que ya se tenía.
  avisoRecargaFallida: "No pudimos actualizar la tarea. Mostramos la última versión que tenemos.",
  insignia: "Tarea",
  instrucciones: "Instrucciones",
  rubrica: "Rúbrica",
  total: (puntos: number) => (puntos === 1 ? "Total: 1 punto" : `Total: ${puntos} puntos`),
  detalles: "Detalles",
  fechaLimite: "Fecha límite",
  puntos: "Puntos",
  categoria: "Categoría",
  categoriaConPeso: (nombre: string, peso: number) => `${nombre} (${peso} %)`,
  sinCategoria: "Sin categoría",
  tema: "Tema",
  sinTema: TEXTOS_DE_LA_CLASE.sinTema,
  entregasTardias: "Entregas tardías",
  aceptaTardias: "Se aceptan entregas con retraso",
  noAceptaTardias: "No se aceptan entregas después de la fecha límite",
  // ENTREGAS-01a (P-03 a): la fila "Entrega" de "Detalles".
  entrega: "Entrega",
  entregaConAdjuntos: "Con archivos o enlaces",
  entregaMarcandoCompletada: "Se marca como completada (los archivos son opcionales)",
  tuTrabajo: "Tu trabajo",
  tuTrabajoTexto:
    "Todavía no puedes entregar desde Campus Digital. Sigue las indicaciones de tu maestro para entregar esta tarea.",
  editar: "Editar tarea",
  borrar: "Borrar tarea",
  confirmarBorrar: "Se borrará con su rúbrica y sus adjuntos.",
  siBorrar: "Sí, borrar tarea",
  cancelar: "Cancelar",
  avisoBorrada: "Tarea borrada",
  sinPermisoParaEditar: "No puedes editar esta tarea.",
  noExiste: "Esa tarea ya no existe.",
  cargando: "Cargando la tarea…",
  puntosDeLaFila: (n: number) => (n === 1 ? "1 punto" : `${n} puntos`),
} as const

// Mensajes de los códigos de error de TAREAS (§D-8) y de los que ya vienen en español del servidor.
export const MENSAJES_ERROR_TAREAS = {
  tareaNoEncontrada: "Esa tarea ya no existe.",
  temaNoEncontrado: "Ese tema ya no existe.",
  categoriaNoEncontrada: "Esa categoría ya no existe. Elige otra.",
  // O-2 de TAREAS-01d: el mismo texto del formulario, declarado una sola vez.
  categoriaRequerida: TEXTOS_FORMULARIO_TAREA.categoriaRequerida,
  fechaLimiteInvalida: "Elige una fecha límite futura, dentro del próximo año.",
  sinAccesoALaClase: TEXTOS_DE_LA_CLASE.sinAcceso,
  generico: "Algo salió mal. Inténtalo de nuevo.",
} as const

// Código del servidor → su mensaje fijo en español (§D-8 y los de archivos, de components/adjuntos).
export const MENSAJES_POR_CODIGO_DE_TAREAS: Readonly<Record<string, string>> = {
  TAREA_NO_ENCONTRADA: MENSAJES_ERROR_TAREAS.tareaNoEncontrada,
  TEMA_NO_ENCONTRADO: MENSAJES_ERROR_TAREAS.temaNoEncontrado,
  CATEGORIA_NO_ENCONTRADA: MENSAJES_ERROR_TAREAS.categoriaNoEncontrada,
  CATEGORIA_REQUERIDA: MENSAJES_ERROR_TAREAS.categoriaRequerida,
  FECHA_LIMITE_INVALIDA: MENSAJES_ERROR_TAREAS.fechaLimiteInvalida,
  SIN_ACCESO_A_LA_CLASE: MENSAJES_ERROR_TAREAS.sinAccesoALaClase,
  ...MENSAJES_POR_CODIGO_DE_ARCHIVO,
}

// Códigos cuyo mensaje del servidor ya está en español y se muestra tal cual.
export const CODIGOS_CON_MENSAJE_DEL_SERVIDOR: readonly string[] = [
  "EDICION_NO_PERMITIDA",
  "BORRADO_NO_PERMITIDO",
  "SERVICIO_OCUPADO",
  // ENTREGAS-01a (P-05 a′, §D-8.3.1): el único aviso del 409 es el toast de useEditarTarea.onError,
  // con el mensaje del servidor. No renueva la tarea desde el hook: la recarga la hace la vista.
  "TAREA_MODIFICADA",
]

// T-08: los códigos que dicen que las opciones que el formulario ofrecía ya no son las de la clase
// (se borró la categoría o el tema, o la clase ganó categorías): qué lista se vuelve a pedir.
export const OPCIONES_QUE_CAMBIARON_POR_CODIGO: Readonly<Record<string, "categorias" | "temas">> = {
  CATEGORIA_NO_ENCONTRADA: "categorias",
  CATEGORIA_REQUERIDA: "categorias",
  TEMA_NO_ENCONTRADO: "temas",
}

// T-11: los códigos con los que el servidor dice que la tarea que se tiene en caché ya no es la de
// ahora (se borró, cambió un permiso o se perdió el acceso): al borrar o guardar, la consulta de la
// tarea se vuelve a pedir para que la vista reaccione. Solo TAREA_NO_ENCONTRADA toca además el muro, el
// trabajo de clase, los temas y las categorías (la tarea ya no está en ninguna lista).
export const CODIGOS_QUE_RENUEVAN_LA_TAREA: readonly string[] = [
  "TAREA_NO_ENCONTRADA",
  "EDICION_NO_PERMITIDA",
  "BORRADO_NO_PERMITIDO",
  "SIN_ACCESO_A_LA_CLASE",
]
