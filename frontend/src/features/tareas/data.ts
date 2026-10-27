import { MAXIMO_CRITERIOS_RUBRICA } from "@campus/shared"

import { MENSAJES_POR_CODIGO_DE_ARCHIVO } from "@/components/adjuntos/data"
import { TEXTOS_DE_LA_CLASE } from "@/components/clase/data"
import type { TraduccionDeErrores } from "@/lib/errores-de-api"
import { formatearPuntos } from "@/lib/format"

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
  sinCategoria: TEXTOS_DE_LA_CLASE.sinCategoria,
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
  sinCategoria: TEXTOS_DE_LA_CLASE.sinCategoria,
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
  editar: "Editar tarea",
  borrar: "Borrar tarea",
  // ENTREGAS-01e (§D-10.5.1 y §D-10.5.7, Enmienda 2): las filas asignadas con hilo se borran con la tarea.
  confirmarBorrar:
    "Se borrará con su rúbrica, sus adjuntos y los comentarios privados de los alumnos.",
  siBorrar: "Sí, borrar tarea",
  borrarConEntregas: "Borrar con las entregas",
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
  // ENTREGAS-01e (§D-10.3).
  alumnoNoEncontrado: "No encontramos a ese alumno en esta clase.",
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
  ALUMNO_NO_ENCONTRADO: MENSAJES_ERROR_TAREAS.alumnoNoEncontrado,
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
  // ENTREGAS-01d (§D-9.3 y §D-9.4): los de la entrega ya vienen en español (§D-7 del plan).
  "ENTREGA_YA_REALIZADA",
  "ENTREGA_NO_REALIZADA",
  "ENTREGA_CALIFICADA",
  "ENTREGA_CERRADA",
  "ENTREGA_VACIA",
  // ENTREGAS-01e (§D-10.5.3, Enmienda 2): el mensaje trae el conteo y se muestra tal cual, en línea.
  "TAREA_CON_ENTREGAS",
  // CALIFICACIONES-01c (§D-12.3 y §D-12.9): los de calificar y el de editar una tarea calificada ya
  // vienen en español del servidor (§D-10).
  "ENTREGA_MODIFICADA",
  "RUBRICA_MODIFICADA",
  "ENTREGA_NO_CALIFICABLE",
  "TAREA_CON_CALIFICACIONES",
]

// CHORE-03 (§D-4): lo que el módulo le dice al contrato de lib/errores-de-api.ts. Un VALIDACION de
// claseId, tareaId o alumnoId dice lo mismo que un acceso, una tarea o un alumno inexistentes.
export const TRADUCCION_DE_ERRORES_TAREAS = {
  generico: MENSAJES_ERROR_TAREAS.generico,
  mensajesPorCodigo: MENSAJES_POR_CODIGO_DE_TAREAS,
  codigosConMensajeDelServidor: CODIGOS_CON_MENSAJE_DEL_SERVIDOR,
  textosPorCampo: {
    claseId: MENSAJES_ERROR_TAREAS.sinAccesoALaClase,
    tareaId: MENSAJES_ERROR_TAREAS.tareaNoEncontrada,
    alumnoId: MENSAJES_ERROR_TAREAS.alumnoNoEncontrado,
  },
} satisfies TraduccionDeErrores

// CALIFICACIONES-01c (§D-12.2; Enmienda 1, N-04): los 409 de calificar dicen que lo que se vio ya no
// es lo de ahora. Avisan con el mensaje del servidor, la vista recarga una sola vez y el panel se
// reinicia con lo actual.
export const CODIGOS_DE_CONFLICTO_DE_CALIFICACION: readonly string[] = [
  "ENTREGA_MODIFICADA",
  "RUBRICA_MODIFICADA",
  "ENTREGA_NO_CALIFICABLE",
]

// De esos, los que dependen de la tarea (la rúbrica o sus puntos; o su fecha límite y si acepta
// tardías, N-11): con ellos la recarga pide la tarea y la entrega a la vez.
export const CODIGOS_QUE_RECARGAN_LA_TAREA_AL_CALIFICAR: readonly string[] = [
  "RUBRICA_MODIFICADA",
  "ENTREGA_NO_CALIFICABLE",
]

// "de 5 puntos", o "de 1 punto" en singular.
const dePuntos = (n: number): string => (n === 1 ? "de 1 punto" : `de ${formatearPuntos(n)} puntos`)

// CALIFICACIONES-01c (§D-12.5, "Textos de la interfaz"; P-03 c′; tono de DESIGN.md §9).
export const TEXTOS_CALIFICAR = {
  titulo: "Calificación",
  campoCriterio: (criterio: string, puntosMax: number) => `${criterio} (${dePuntos(puntosMax)})`,
  campoCalificacion: (puntos: number) => `Calificación (${dePuntos(puntos)})`,
  total: (suma: number, sumaDeMaximos: number, calificacion: number, puntos: number) =>
    `Suma de la rúbrica: ${formatearPuntos(suma)} de ${formatearPuntos(sumaDeMaximos)} · Calificación: ${formatearPuntos(calificacion)} de ${formatearPuntos(puntos)}`,
  campoComentario: "Comentario para el alumno (opcional)",
  ayudaComentario: "Se publica en los comentarios privados de esta entrega.",
  calificarYDevolver: "Calificar y devolver",
  actualizar: "Actualizar calificación",
  podrasCalificar: "Podrás calificar cuando el alumno entregue o cuando se cierre la entrega.",
  notaSinEntrega: "Este alumno no entregó la tarea y la entrega ya está cerrada.",
  escribeLosPuntos: "Escribe los puntos de este criterio.",
  fueraDeRango: (maximo: number) =>
    maximo === 1 ? "Escribe de 0 a 1 punto." : `Escribe de 0 a ${formatearPuntos(maximo)} puntos.`,
  hastaDosDecimales: "Usa hasta 2 decimales.",
  escribeLaCalificacion: "Escribe la calificación.",
  avisoPublicada: "Calificación publicada",
  avisoActualizada: "Calificación actualizada",
  avisoRecargaFallida:
    "No pudimos cargar la entrega actual. Revisa tu conexión e inténtalo de nuevo.",
  sinCalificar: "Sin calificar todavía.",
} as const

// CALIFICACIONES-01c (§D-12.6, S-13): la calificación publicada, en solo lectura.
export const TEXTOS_CALIFICACION = {
  calificacion: (puntos: number, sobre: number) =>
    `Calificación: ${formatearPuntos(puntos)} de ${formatearPuntos(sobre)}`,
  calificada: (fecha: string, hora: string) => `Calificada el ${fecha} a las ${hora}`,
  puntaje: (criterio: string, puntos: number, puntosMax: number) =>
    `${criterio}: ${formatearPuntos(puntos)} de ${formatearPuntos(puntosMax)}`,
  // P-03 (c′): la entrega quedó calificada sin que el alumno entregara.
  sinEntrega: "No entregaste esta tarea y ya está calificada.",
} as const

// ENTREGAS-01d (§D-9.3): los 409 de la entrega dicen que la que se ve ya no es la de ahora (se entregó
// en otra pestaña, se calificó o se cerró): avisan con el mensaje del servidor y se vuelve a pedir.
export const CODIGOS_DE_CONFLICTO_DE_ENTREGA: readonly string[] = [
  "ENTREGA_YA_REALIZADA",
  "ENTREGA_NO_REALIZADA",
  "ENTREGA_CALIFICADA",
  "ENTREGA_CERRADA",
]

// ENTREGAS-01d (§D-9, "Textos de la interfaz (01d)"; tono de DESIGN.md §9).
export const TEXTOS_TU_TRABAJO = {
  cargando: "Cargando tu entrega…",
  entregar: "Entregar tarea",
  marcarComoCompletada: "Marcar como completada",
  vacia: "Agrega al menos un archivo o un enlace para entregar.",
  campoEnlace: "Enlace",
  ayudaEnlaces: "Hasta 5 enlaces que empiecen con https:// o http://.",
  agregarEnlace: "Agregar enlace",
  topeDeEnlaces: "Ya agregaste 5 enlaces. Quita uno para agregar otro.",
  enlacesAgregados: "Enlaces agregados",
  enlacesDeLaEntrega: "Enlaces de la entrega",
  quitar: "Quitar",
  otraPestana: "(se abre en otra pestaña)",
  notaDeRetraso: "La fecha límite ya pasó. Tu entrega quedará marcada con retraso.",
  cerrada: "La fecha límite ya pasó y esta tarea no acepta entregas con retraso.",
  entregaste: (fecha: string, hora: string) => `Entregaste el ${fecha} a las ${hora}`,
  marcasteComoCompletada: (fecha: string, hora: string) =>
    `Marcaste como completada el ${fecha} a las ${hora}`,
  calificada: "Tu entrega ya está calificada.",
  anular: "Anular entrega",
  confirmarAnular: "Se quitarán tus archivos y enlaces. Podrás volver a entregar.",
  confirmarAnularConRetraso:
    "Se quitarán tus archivos y enlaces. Si vuelves a entregar, quedará marcada con retraso.",
  siAnular: "Sí, anular entrega",
  cancelar: "Cancelar",
  avisoEntregada: "Tarea entregada",
  avisoCompletada: "Marcaste la tarea como completada",
  avisoAnulada: "Entrega anulada",
  listaFija: "Mientras se entrega no puedes cambiar los archivos ni los enlaces.",
} as const

// ENTREGAS-01d (§D-9.6, "Textos de la interfaz (Hilo privado)"; P-01 a).
export const TEXTOS_HILO_PRIVADO = {
  titulo: "Comentarios privados",
  privacidadDelAlumno: "Solo tú, tus maestros y la administración pueden verlos.",
  // ENTREGAS-01e (§D-10.3; P-01 a): el hilo de un alumno visto por sus maestros y por el admin.
  privacidadDeLosMaestros:
    "Solo el alumno, los maestros de la clase y la administración pueden verlos.",
  soloLecturaDelAdmin: "La administración puede leer este hilo, pero no escribir en él.",
  vacio: "Aún no hay comentarios privados.",
  cargando: "Cargando los comentarios privados…",
  campo: "Comentario privado",
  enviar: "Enviar comentario",
  escribeTuComentario: "Escribe tu comentario",
  verMas: "Ver más comentarios",
  lista: "Comentarios privados",
} as const

// ENTREGAS-01d (§D-9.6): los comentarios del hilo se piden de 20 en 20 (como en el servidor).
export const LIMITE_DEL_HILO = 20

// ENTREGAS-01e (§D-10, "Textos de la interfaz (Maestro y admin, 01e)"; tono de DESIGN.md §9).
export const TEXTOS_ENTREGAS = {
  titulo: "Entregas",
  verEntregas: "Ver entregas",
  volverALaTarea: "Volver a la tarea",
  conteo: (entregadas: number, total: number) =>
    total === 1
      ? `Entregaron ${entregadas} de 1 alumno.`
      : `Entregaron ${entregadas} de ${total} alumnos.`,
  columnas: {
    alumno: "Alumno",
    estado: "Estado",
    entregada: "Entregada",
    acciones: "Acciones",
  },
  verEntrega: "Ver entrega",
  sinFecha: "—",
  vacio: "Aún no hay alumnos en esta clase.",
  verMas: "Ver más alumnos",
  cambioMientrasLaVeias:
    "La lista de alumnos cambió mientras la veías. Vuelve a abrir Entregas para verla completa.",
  cargando: "Cargando las entregas…",
  volverALasEntregas: "Volver a las entregas",
  cargandoEntrega: "Cargando la entrega…",
  entrego: (fecha: string, hora: string) => `Entregó el ${fecha} a las ${hora}`,
  marcoComoCompletada: (fecha: string, hora: string) =>
    `Marcó como completada el ${fecha} a las ${hora}`,
  todaviaNoEntrega: "Todavía no entrega.",
} as const

// ENTREGAS-01e (§D-10.2): la lista de entregas se pide de 20 en 20 (como el roster y el servidor).
export const LIMITE_DE_ENTREGAS = 20

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
// M-01, T-13 y ENTREGAS-01e (§D-10.3): los errores que reemplazan la vista de una tarea
// (errorQueReemplazaLaVista): la tarea o el alumno ya no existen, o se perdió el acceso a la clase; un
// VALIDACION de uno de esos ids dice lo mismo.
export const CODIGOS_QUE_REEMPLAZAN_LA_VISTA: readonly string[] = [
  "TAREA_NO_ENCONTRADA",
  "SIN_ACCESO_A_LA_CLASE",
  "ALUMNO_NO_ENCONTRADO",
]
export const PREFIJOS_QUE_REEMPLAZAN_LA_VISTA: readonly string[] = [
  "claseId:",
  "tareaId:",
  "alumnoId:",
]

export const CODIGOS_QUE_RENUEVAN_LA_TAREA: readonly string[] = [
  "TAREA_NO_ENCONTRADA",
  "EDICION_NO_PERMITIDA",
  "BORRADO_NO_PERMITIDO",
  "SIN_ACCESO_A_LA_CLASE",
]
