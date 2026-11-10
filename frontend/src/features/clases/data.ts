import {
  MENSAJES_ERROR_DE_ARCHIVOS,
  MENSAJES_POR_CODIGO_DE_ARCHIVO,
} from "@/components/adjuntos/data"
import { TEXTOS_DE_LA_CLASE } from "@/components/clase/data"
import type { TraduccionDeErrores } from "@/lib/errores-de-api"
import { BASES_POR_PERSPECTIVA } from "@/lib/ruta-de-clase"
import { claveTemas } from "@/services/trabajoService"

import type {
  BloqueDeRecurso,
  CapacidadesDePerspectiva,
  EstadoDeClases,
  Perspectiva,
  SeccionDeClase,
  SeccionDeTemas,
} from "./types"

// Claves de consulta de TanStack Query (CLASES-a). Se reutilizan tal cual en las invalidaciones y
// en la prueba de cambio de identidad (PR-A23a).
// A-6 de CLASES-02: las dos claves de las listas viven en services/clasesService.ts (las usa también
// la barra lateral) y se reexportan aquí para no cambiar a nadie.
export {
  CLAVE_CLASES_IMPARTIDAS,
  CLAVE_CLASES_INSCRITAS,
  claveClaseDetalle,
  claveClasesAnteriores,
  clavePublicaciones,
} from "@/services/clasesService"
// CLASES-02c: la lista institucional del administrador y el buscador de maestros.
export const CLAVE_CLASES_ADMIN = ["clases", "admin"] as const
// ADMIN-01c (§D-10): una lista por estado, colgada del prefijo (invalidarlo alcanza a las dos).
export const claveClasesAdmin = (estado: EstadoDeClases) => [...CLAVE_CLASES_ADMIN, estado] as const
// ADMIN-01c (§D-10): el conteo del diálogo de borrado definitivo.
export const claveConteoDeBorrado = (claseId: string) =>
  ["clases", claseId, "conteo-de-borrado"] as const
// ADMIN-01c, corrección de la ronda 1 (T-02): la clave de la mutación de archivar o restaurar una clase,
// para saber si sigue en vuelo aunque la fila que la lanzó ya se haya desmontado.
export const claveGestionDeClase = (accion: "archivar" | "restaurar", claseId: string) =>
  ["clases", "admin", "gestion", accion, claseId] as const
export const claveMaestrosCandidatos = (termino: string) =>
  ["clases", "maestros-candidatos", termino] as const
export const claveCodigoDeClase = (claseId: string) => ["clases", claseId, "codigo"] as const
// CLASES-b: las tres consultas de personas cuelgan de ["clases", claseId, …], así que invalidar el
// prefijo de una clase las alcanza a todas.
export const clavePersonas = (claseId: string) => ["clases", claseId, "personas"] as const
export const claveAlumnos = (claseId: string) => ["clases", claseId, "alumnos"] as const
export const claveCandidatos = (claseId: string) => ["clases", claseId, "candidatos"] as const
// CLASES-c: el muro y los comentarios de cada publicación. Los comentarios no cuelgan de la clave
// del muro, para que invalidar la lista no vuelva a pedir los comentarios de todas las abiertas.
export const claveComentarios = (claseId: string, publicacionId: string) =>
  ["clases", claseId, "comentarios", publicacionId] as const
// CLASES-03c2 (§D-7.6): los temas con los conteos de una sección. Cuelga de la clave de los temas
// (el total), así que toda invalidación de esa clave, no exacta, también la alcanza.
export const claveTemasDeLaSeccion = (claseId: string, seccion: SeccionDeTemas) =>
  [...claveTemas(claseId), seccion] as const
// CLASES-03d (§D-8.4): las listas de "Recursos" cuelgan de un prefijo (invalidarlo las alcanza a todas)
// y el recurso que se edita vive fuera de él: invalidar las listas no recarga la edición.
export const clavePrefijoDeRecursos = (claseId: string) => ["clases", claseId, "recursos"] as const
export const claveRecursos = (claseId: string, bloque: BloqueDeRecurso, tema: string) =>
  [...clavePrefijoDeRecursos(claseId), bloque, tema] as const
export const claveRecurso = (claseId: string, recursoId: string) =>
  ["clases", claseId, "recurso", recursoId] as const
// CLASES-03e (§D-9.4): la lista de "Dudas" y las respuestas de cada duda. Las respuestas no cuelgan de la
// lista (como los comentarios del muro): invalidar la lista no vuelve a pedir las respuestas abiertas.
export const claveDudas = (claseId: string) => ["clases", claseId, "dudas"] as const
export const claveRespuestas = (claseId: string, dudaId: string) =>
  ["clases", claseId, "respuestas", dudaId] as const

export const LIMITE_CLASES = 20
// §D-2C2: la lista de clases del administrador se pide de 50 en 50.
export const LIMITE_CLASES_ADMIN = 50
// ADMIN-01d2 (§D-9): "Clases anteriores" y "Clases archivadas" se piden de 20 en 20, como las clases.
export const LIMITE_CLASES_ANTERIORES = 20
// §D-B1: los compañeros y el roster se piden de 50 en 50.
export const LIMITE_PERSONAS = 50
// §D-B3: el buscador pide hasta 20 resultados, mínimo de 3 letras y 300 ms de espera (RN-04).
export const LIMITE_CANDIDATOS = 20
// §D-C2: el muro y los comentarios se piden de 20 en 20.
export const LIMITE_PUBLICACIONES = 20
export const LIMITE_COMENTARIOS = 20
// CLASES-03e (S-06): las dudas y sus respuestas se piden de 20 en 20.
export const LIMITE_DUDAS = 20
export const LIMITE_RESPUESTAS = 20
export const ESPERA_BUSQUEDA_MS = 300

// DESIGN.md §7.6: variantes de la tarjeta de clase, según la identidad de la clase (S-06), nunca un
// estado. Verde → --brand con metadatos --brand-soft; azul → --accent con metadatos --accent-soft;
// blanca → sin color con metadatos --muted-foreground. Foco interior blanco sobre las dos variantes
// de color (S-07, §6): -outline-offset-4 con el color del texto de esa superficie. La utilidad de
// vidrio de la tarjeta la agrega tarjeta-clase.tsx (V-07: la lista cerrada de archivos no cambia).
// Corregido en la ronda 1 del tester (T-07): antes, "verde" también usaba el fondo azul.
export const CLASES_POR_VARIANTE = {
  verde: {
    fondo:
      "bg-brand text-brand-foreground focus-visible:-outline-offset-4 focus-visible:outline-brand-foreground",
    metadatos: "text-brand-soft",
  },
  azul: {
    fondo:
      "bg-accent text-accent-foreground focus-visible:-outline-offset-4 focus-visible:outline-accent-foreground",
    metadatos: "text-accent-soft",
  },
  blanca: {
    fondo: "text-foreground",
    metadatos: "text-muted-foreground",
  },
} as const

// §D-A7: textos de CLASES-a (propuesta).
export const TEXTOS_INICIO_ESTUDIANTE = {
  titularSinClases: "Aún no estás en ninguna clase",
  titularUnaClase: "Estás en 1 clase",
  titularVariasClases: (n: number) => `Estás en ${n} clases`,
  siguientePasoSinClases: "Pide a tu maestro el código de su clase y escríbelo aquí para unirte.",
  siguientePasoConClases:
    "Aquí verás tus próximas entregas en cuanto tus maestros publiquen tareas.",
  errorTitular: "No pudimos cargar tus clases",
} as const

export const TEXTOS_INICIO_MAESTRO = {
  titularSinClases: "Aún no tienes clases",
  titularUnaClase: "Tienes 1 clase",
  titularVariasClases: (n: number) => `Tienes ${n} clases`,
  // CLASES-02c (§D-2C3): el maestro ya no crea clases; la administración se las asigna.
  siguientePasoSinClases:
    "La administración te asigna tus clases. Cuando lo haga, aparecerán aquí.",
  siguientePasoConClases: "Comparte el código de cada clase para que tus alumnos se unan.",
  errorTitular: "No pudimos cargar tus clases",
} as const

export const TEXTOS_UNIRSE = {
  insignia: "Código de clase",
  titulo: "Únete a una clase",
  campoCodigo: "Código de la clase",
  boton: "Unirme a la clase",
  exitoso: (nombreClase: string) => `Te uniste a ${nombreClase}`,
  yaEstaba: (nombreClase: string) => `Ya estabas en ${nombreClase}`,
  codigoInvalido: "No encontramos una clase con ese código. Revisa que esté bien escrito.",
} as const

export const TEXTOS_PANEL = {
  titulo: "Mis clases",
  verMas: "Ver más clases",
  vacioTitulo: "Aún no tienes clases",
  accionEstudiante: "Únete con tu código de clase",
  // §D-2C3: el vacío del maestro dice quién le asigna las clases y no lleva botón.
  vacioDescripcionMaestro: "La administración te asigna tus clases.",
  // §D-2C5: el 400 del cursor de "Ver más clases".
  cambioMientrasLasVeias:
    "Tus clases cambiaron mientras las veías. Vuelve a entrar para verlas completas.",
  error: "No pudimos cargar tus clases. Revisa tu conexión e inténtalo de nuevo.",
} as const

export const TEXTOS_TARJETA = {
  sinAlumnos: "Sin alumnos",
  unAlumno: "1 alumno",
  variosAlumnos: (n: number) => `${n} alumnos`,
} as const

export const TEXTOS_FORMULARIO_CLASE = {
  tituloCrear: "Crear clase",
  tituloEditar: "Editar clase",
  campoNombre: "Nombre de la clase",
  campoDescripcion: "Descripción (opcional)",
  botonCrear: "Crear clase",
  botonGuardar: "Guardar cambios",
  cancelar: "Cancelar",
  avisoCreada: "Clase creada",
  avisoGuardada: "Cambios guardados",
} as const

// CLASES-02c (§D-2C2): la lista institucional del administrador.
export const TEXTOS_CLASES_ADMIN = {
  titulo: "Clases",
  crear: "Crear clase",
  columnas: {
    clase: "Clase",
    maestros: "Maestros",
    alumnos: "Alumnos",
    creada: "Creada",
    acciones: "Acciones",
  },
  abrir: "Abrir",
  verMas: "Cargar más clases",
  vacioTitulo: "Aún no hay clases",
  vacioAccion: "Crea la primera clase",
  error: "No pudimos cargar las clases. Revisa tu conexión e inténtalo de nuevo.",
  cambioMientrasLasVeias:
    "La lista cambió mientras la veías. Vuelve a abrirla para verla completa.",
  // ADMIN-01c (§D-10, §D-12; Enmienda 10, E10-5): el control segmentado y las acciones de cada fila.
  estadoDeLasClases: "Estado de las clases",
  activas: "Activas",
  archivadas: "Archivadas",
  archivada: "Archivada",
  duplicar: "Duplicar",
  archivar: "Archivar",
  restaurar: "Restaurar",
  borrar: "Borrar definitivamente",
  // El nombre accesible de un botón de la fila: la acción y la clase en un solo texto (sr-only).
  accionSobre: (accion: string, nombre: string) => `${accion} ${nombre}`,
  vacioArchivadas: "Aún no hay clases archivadas",
  confirmarArchivado:
    "La clase saldrá de las listas de sus maestros y alumnos. Podrás restaurarla.",
  siArchivar: "Sí, archivar",
  cancelar: "Cancelar",
  avisoArchivada: "Clase archivada",
  avisoRestaurada: "Clase restaurada",
} as const

// ADMIN-01c (§D-10): las dos pestañas de /admin/clases, en orden.
export const ESTADOS_DE_LA_LISTA: readonly { estado: EstadoDeClases; texto: string }[] = [
  { estado: "activas", texto: TEXTOS_CLASES_ADMIN.activas },
  { estado: "archivadas", texto: TEXTOS_CLASES_ADMIN.archivadas },
]

// ADMIN-01c (§D-10, §D-12; Enmienda 4, E4-3): el diálogo de borrado definitivo.
export const TEXTOS_BORRAR_CLASE = {
  titulo: (nombre: string) => `Borrar definitivamente «${nombre}»`,
  consecuencia: (partes: {
    alumnos: string
    actividades: string
    entregas: string
    calificaciones: string
    archivos: string
  }) =>
    `Se perderán las inscripciones de ${partes.alumnos}, ${partes.actividades}, ${partes.entregas}, ${partes.calificaciones} y ${partes.archivos}, y el registro de altas y bajas de la clase. No se puede deshacer.`,
  unidades: {
    alumnos: { una: "alumno", varias: "alumnos" },
    actividades: { una: "actividad", varias: "actividades" },
    entregas: { una: "entrega", varias: "entregas" },
    calificaciones: { una: "calificación", varias: "calificaciones" },
    archivos: { una: "archivo", varias: "archivos" },
  },
  siBorrar: "Sí, borrar definitivamente",
  cancelar: "Cancelar",
  errorConteo: "No pudimos contar lo que se borraría. Cierra y vuelve a intentarlo.",
  avisoBorrada: "Clase borrada",
} as const

// ADMIN-01c (§D-10, §D-12; Enmienda 10, E10-4): duplicar una clase. El aviso sale siempre.
export const TEXTOS_DUPLICAR_CLASE = {
  titulo: "Duplicar clase",
  campoNombre: "Nombre de la clase",
  boton: "Duplicar clase",
  cancelar: "Cancelar",
  avisoDuplicada:
    "Clase duplicada. Los archivos de los recursos pueden tardar unos minutos en estar disponibles.",
} as const

// El selector de maestros de "Crear clase" y el buscador de "Asignar maestro" (§D-2C2, §7.17).
export const TEXTOS_BUSCADOR_MAESTROS = {
  grupo: "Maestros de la clase",
  ayudaEleccion: "Elige uno o dos maestros.",
  campo: "Buscar maestro por nombre",
  ayuda: "Escribe al menos 3 letras.",
  muyLargo: "La búsqueda no puede tener más de 120 caracteres",
  resultados: "Resultados de la búsqueda",
  elegidos: "Maestros elegidos",
  elegir: "Elegir",
  yaElegido: "Ya elegido",
  quitar: "Quitar",
  topeAlElegir: "Ya elegiste 2 maestros. Quita a uno para elegir a otro.",
  errorSinMaestros: "Elige al menos un maestro",
  sinResultados: "No encontramos maestros con ese nombre. Solo aparecen maestros con cuenta.",
  hayMas: "Hay más resultados: escribe más del nombre.",
  asignar: "Asignar a la clase",
  yaDaLaClase: "Ya da esta clase",
} as const

export const TEXTOS_MAESTROS_DE_CLASE = {
  titulo: "Maestros de la clase",
  asignarTitulo: "Asignar maestro",
  quitar: "Quitar",
  // CLASES-03 (§D-13): "el muro" ya no es el nombre de una sección.
  consecuencia: "Dejará de ver la clase. Lo que publicó se queda en la clase.",
  siQuitar: "Sí, quitar",
  cancelar: "Cancelar",
  minimo: "Una clase necesita al menos un maestro. Asigna a otro antes de quitar a este.",
  tope: "La clase ya tiene 2 maestros. Quita a uno para asignar a otro.",
  asignado: (nombre: string) => `Asignaste a ${nombre}`,
  quitado: (nombre: string) => `Quitaste a ${nombre} de la clase`,
} as const

// Códigos del servidor cuyo mensaje ya está en español y se muestra tal cual (§D-2C2, lib.ts).
export const CODIGOS_CON_MENSAJE_DEL_SERVIDOR: readonly string[] = [
  "TOPE_DE_MAESTROS",
  "CLASE_SIN_MAESTRO",
  "MAESTRO_NO_ENCONTRADO",
  "BORRADO_NO_PERMITIDO",
  // O-07 (revisión de 02c): el servidor ya lo dice en español (503: el servidor está ocupado).
  "SERVICIO_OCUPADO",
  // TAREAS-01e (§D-11): los errores de temas y categorías ya llegan en español ("Ya hay un tema con
  // ese nombre.", "Los temas cambiaron mientras los ordenabas. Vuelve a intentarlo.", el nombre y el
  // conteo de la categoría con tareas…).
  "TEMA_NO_ENCONTRADO",
  "TEMA_REPETIDO",
  "TOPE_DE_TEMAS",
  "ORDEN_DESACTUALIZADO",
  "CATEGORIA_CON_TAREAS",
  "CATEGORIA_NO_ENCONTRADA",
  "ANUNCIO_SIN_TEMA",
  // CLASES-03d (§D-13): los errores de "Recursos" que ya llegan en español.
  "RECURSO_MODIFICADO",
  "MOVER_NO_PERMITIDO",
  "EDICION_NO_PERMITIDA",
  // ADMIN-01c (§D-10, §D-12): archivar, restaurar, borrar y duplicar, ya en español.
  "CLASE_YA_ARCHIVADA",
  "CLASE_NO_ARCHIVADA",
  "CLASE_CON_COPIAS_EN_CURSO",
  "CONFIRMACION_REQUERIDA",
  "CLASE_ARCHIVADA",
]

export const TEXTOS_CODIGO = {
  etiqueta: "Código de la clase",
  copiar: "Copiar código",
  avisoCopiado: "Código copiado",
  regenerar: "Regenerar código",
  confirmacion:
    "El código actual dejará de funcionar. Quienes ya están en la clase no se ven afectados.",
  siRegenerar: "Sí, regenerar",
  cancelar: "Cancelar",
  avisoRegenerado: "Código nuevo listo",
  avisoErrorRegenerar: "No pudimos regenerar el código. Inténtalo de nuevo.",
  errorCopiarSinCodigo: "No hay ningún código para copiar todavía.",
  // N-03 (ronda 4 del manager): texto fijo que vivía dentro del componente (regla 2 de CLAUDE.md).
  errorCopiarSinConexion: "No pudimos copiar el código. Cópialo a mano.",
} as const

// N-03 (ronda 4 del manager): textos fijos que vivían en lib.ts (regla 2 de CLAUDE.md).
export const MENSAJES_ERROR_CLASES_GENERALES = {
  sinAccesoALaClase: "No tienes acceso a esta clase.",
  alumnoNoEncontrado: "No encontramos a ese alumno.",
  // §D-C6: errores del muro.
  publicacionNoEncontrada: "Esa publicación ya no existe.",
  comentarioNoEncontrado: "Ese comentario ya no existe.",
  // CLASES-03d (§D-13): el recurso que se abre o se edita.
  recursoNoEncontrado: "Ese recurso ya no existe.",
  // CLASES-03e (§D-13): la duda o la respuesta que ya no está.
  dudaNoEncontrada: "Esa duda ya no existe.",
  respuestaNoEncontrada: "Esa respuesta ya no existe.",
  // §D-D6: errores de los archivos adjuntos.
  // TAREAS-01c (§D-9): los textos de los archivos viven en components/adjuntos/data.ts.
  archivoNoSubido: MENSAJES_ERROR_DE_ARCHIVOS.archivoNoSubido,
  archivoInvalido: MENSAJES_ERROR_DE_ARCHIVOS.archivoInvalido,
  almacenNoDisponible: MENSAJES_ERROR_DE_ARCHIVOS.almacenNoDisponible,
  generico: "Algo salió mal. Inténtalo de nuevo.",
} as const

// CHORE-03 (§D-4): código del servidor → su mensaje fijo en español. Vivía en lib.ts como
// MENSAJES_ERROR_CLASES, con el mismo contenido.
export const MENSAJES_POR_CODIGO_DE_CLASES: Readonly<Record<string, string>> = {
  CODIGO_INVALIDO: TEXTOS_UNIRSE.codigoInvalido,
  SIN_ACCESO_A_LA_CLASE: MENSAJES_ERROR_CLASES_GENERALES.sinAccesoALaClase,
  ALUMNO_NO_ENCONTRADO: MENSAJES_ERROR_CLASES_GENERALES.alumnoNoEncontrado,
  PUBLICACION_NO_ENCONTRADA: MENSAJES_ERROR_CLASES_GENERALES.publicacionNoEncontrada,
  COMENTARIO_NO_ENCONTRADO: MENSAJES_ERROR_CLASES_GENERALES.comentarioNoEncontrado,
  RECURSO_NO_ENCONTRADO: MENSAJES_ERROR_CLASES_GENERALES.recursoNoEncontrado,
  DUDA_NO_ENCONTRADA: MENSAJES_ERROR_CLASES_GENERALES.dudaNoEncontrada,
  RESPUESTA_NO_ENCONTRADA: MENSAJES_ERROR_CLASES_GENERALES.respuestaNoEncontrada,
  // TAREAS-01c (§D-9): los cuatro códigos de error de archivos vienen de components/adjuntos/data.ts.
  ...MENSAJES_POR_CODIGO_DE_ARCHIVO,
}

// CHORE-03 (§D-4): lo que features/clases le dice al contrato de lib/errores-de-api.ts. Un VALIDACION
// de claseId dice lo mismo que SIN_ACCESO_A_LA_CLASE (T-11, S-08).
export const TRADUCCION_DE_ERRORES_CLASES = {
  generico: MENSAJES_ERROR_CLASES_GENERALES.generico,
  mensajesPorCodigo: MENSAJES_POR_CODIGO_DE_CLASES,
  codigosConMensajeDelServidor: CODIGOS_CON_MENSAJE_DEL_SERVIDOR,
  textosPorCampo: {
    claseId: MENSAJES_ERROR_CLASES_GENERALES.sinAccesoALaClase,
    // CLASES-03d (§D-13): un VALIDACION de recursoId dice lo mismo que RECURSO_NO_ENCONTRADO.
    recursoId: MENSAJES_ERROR_CLASES_GENERALES.recursoNoEncontrado,
    // CLASES-03e (§D-13): los ids de la ruta de una duda y de una respuesta dicen lo mismo que su código.
    dudaId: MENSAJES_ERROR_CLASES_GENERALES.dudaNoEncontrada,
    respuestaId: MENSAJES_ERROR_CLASES_GENERALES.respuestaNoEncontrada,
    // Tras quitar la ruta queda "debe ser verdadero o falso", que no dice nada que la persona pueda hacer
    // (la interfaz siempre envía un booleano): el genérico.
    resuelta: MENSAJES_ERROR_CLASES_GENERALES.generico,
  },
} satisfies TraduccionDeErrores

// CHORE-03 (Enmienda 4, T-03 y T-04): los campos que pinta cada modo del formulario. Un VALIDACION de
// un campo que el modo enviado no pinta se avisa, en lugar de guardarse en un campo que no se ve.
export const CAMPOS_PINTADOS_DE_LA_CLASE = {
  crear: ["nombre", "descripcion", "maestroIds"],
  editar: ["nombre", "descripcion"],
  // ADMIN-01c (Enmienda 9): duplicar pinta el nombre y los maestros; la descripción se copia tal cual.
  duplicar: ["nombre", "maestroIds"],
} as const

// CLASES-03d (§D-8.7): el formulario de Avisos solo publica anuncios; el título de un recurso vive en
// "Nuevo recurso" (CAMPOS_PINTADOS_DEL_RECURSO).
export const CAMPOS_PINTADOS_DE_LA_PUBLICACION = {
  anuncio: ["texto"],
} as const satisfies Readonly<Record<"anuncio", readonly string[]>>

// CLASES-03e (§D-9.4, §D-15): la duda y la respuesta solo pintan su texto; cualquier otro campo se avisa.
export const CAMPOS_PINTADOS_DE_LA_DUDA = ["texto"] as const
export const CAMPOS_PINTADOS_DE_LA_RESPUESTA = ["texto"] as const

// CLASES-03d (§D-8.5, §D-15): los campos que pintan "Nuevo recurso" y "Editar recurso". Cualquier otro
// (temaId, archivoIds.<i>, tipo, version) se avisa.
export const CAMPOS_PINTADOS_DEL_RECURSO = {
  crear: ["titulo", "texto"],
  editar: ["titulo", "texto"],
} as const

export const TEXTOS_CLASE = {
  volver: "Volver a mis clases",
  volverALaLista: "Volver a la lista de clases",
  maestro: (nombre: string) => `Maestro: ${nombre}`,
  maestros: (nombres: string) => `Maestros: ${nombres}`,
  // CLASES-03 (§D-7.1, §D-13, RF-60 y RF-61): las secciones de la clase, iguales en las tres
  // perspectivas. "Recursos" y "Dudas" entran en la lista en 03d y 03e.
  avisos: "Avisos",
  trabajo: "Actividades de aprendizaje",
  recursos: "Recursos",
  dudas: "Dudas",
  personas: "Personas",
  // CALIFICACIONES-01d (§D-13.6, S-10): la sección nueva, última en las tres perspectivas.
  calificaciones: "Calificaciones",
  editar: "Editar clase",
  secciones: "Secciones de la clase",
  // TAREAS-01c (§D-9): el texto vive en components/clase/data.ts, junto a ConClaseDeLaRuta.
  sinAcceso: TEXTOS_DE_LA_CLASE.sinAcceso,
} as const

// ADMIN-01d1 (§D-9, §D-12): el aviso de una clase archivada bajo su encabezado (el del admin, junto a
// «Restaurar» y «Duplicar») y el enlace de vuelta de "Editar clase" en una archivada (fila 21). El texto
// de las rutas de escritura vive en components/clase/data.ts (TEXTOS_DE_LA_CLASE.archivada).
export const TEXTOS_CLASE_ARCHIVADA = {
  aviso: (fecha: string) => `Clase archivada el ${fecha}. Solo puedes consultarla.`,
  avisoAdmin: (fecha: string) => `Clase archivada el ${fecha}. Es de solo lectura.`,
  volverALaClase: "Volver a la clase",
} as const

// ADMIN-01d2 (§D-9, §D-12): a dónde llevan las dos listas y sus textos; los enlaces del pie de los
// inicios dicen lo mismo que el título de su lista.
export const RUTA_CLASES_ANTERIORES_DEL_ALUMNO = "/estudiante/clases-anteriores"
export const RUTA_CLASES_ARCHIVADAS_DEL_MAESTRO = "/maestro/clases-archivadas"

export const TEXTOS_CLASES_ANTERIORES = {
  anteriores: {
    titulo: "Clases anteriores",
    vacio: "No tienes clases anteriores",
    error: "No pudimos cargar tus clases anteriores. Revisa tu conexión e inténtalo de nuevo.",
  },
  archivadas: {
    titulo: "Clases archivadas",
    vacio: "No tienes clases archivadas",
    error: "No pudimos cargar tus clases archivadas. Revisa tu conexión e inténtalo de nuevo.",
  },
  // Decisión del humano (2026-11-06): la fecha de cada fila dice de qué es.
  archivadaEl: (fecha: string) => `Archivada el ${fecha}`,
  cargarMas: "Cargar más",
  cambioMientrasLasVeias: TEXTOS_CLASES_ADMIN.cambioMientrasLasVeias,
  volverAClasesAnteriores: "Volver a clases anteriores",
} as const

// ADMIN-01f (§D-11, S-16, corrección M-16): la insignia de un maestro dado de baja en "Personas", en la
// lista de maestros de la clase y en /admin/clases. Una sola constante para los tres componentes.
export const TEXTO_CUENTA_DESACTIVADA = "Cuenta desactivada"

// §D-B6: textos de CLASES-b (propuesta).
export const TEXTOS_PERSONAS = {
  maestro: "Maestro",
  maestros: "Maestros",
  alumnos: "Alumnos",
  verMas: "Ver más alumnos",
  vacio: "Aún no hay alumnos en esta clase",
} as const

export const TEXTOS_BUSCADOR_ALUMNOS = {
  titulo: "Agregar alumnos",
  campo: "Buscar alumno por nombre",
  ayuda: "Escribe al menos 3 letras.",
  // T-24: el mismo aviso de longitud que da el servidor.
  muyLargo: "La búsqueda no puede tener más de 120 caracteres",
  resultados: "Resultados de la búsqueda",
  agregar: "Agregar a la clase",
  yaEstaEnLaClase: "Ya está en la clase",
  sinResultados: "No encontramos alumnos con ese nombre. Solo aparecen alumnos con cuenta.",
  hayMas: "Hay más resultados: escribe más del nombre.",
  agregado: (nombre: string) => `Agregaste a ${nombre}`,
  // D-4: con yaEstaba: true no se agregó a nadie; el aviso es neutro, ni éxito ni error.
  yaEstaba: (nombre: string) => `${nombre} ya estaba en la clase`,
} as const

export const TEXTOS_TABLA_ALUMNOS = {
  titulo: "Alumnos",
  columnas: {
    nombre: "Nombre",
    correo: "Correo",
    estadoPago: "Estado de pago",
    acceso: "Acceso",
    seUnio: "Se unió",
    acciones: "Acciones",
  },
  sinRestriccion: "—",
  quitar: "Quitar",
  confirmarQuitar: "Dejará de ver la clase. Sus datos no se borran.",
  siQuitar: "Sí, quitar",
  cancelar: "Cancelar",
  quitado: (nombre: string) => `Quitaste a ${nombre} de la clase`,
  verMas: "Ver más alumnos",
  vacio: "Aún no hay alumnos. Comparte el código de la clase o búscalos arriba.",
} as const

// §D-C6: textos de CLASES-c (propuesta).
// CLASES-03 (§D-7.5, §D-13): la sección se llama "Avisos" (el archivo y la clave siguen siendo del
// muro, DH-09). Sin "Crear tarea" (S-09): las tareas se crean en "Actividades de aprendizaje".
export const TEXTOS_MURO = {
  tituloLista: "Avisos",
  vacioEstudiante: "Aún no hay avisos en esta clase.",
  vacioMaestro: "Publica el primer aviso de tu clase.",
  vacioAdmin: "Publica el primer aviso de esta clase.",
  verMasPublicaciones: "Ver más avisos",
  avisoPublicacionBorrada: "Publicación borrada",
  // R1 (§D-10): la acción que pide se cumple al pulsar "Avisos" estando en Avisos, al ir a otra
  // sección y regresar, y con atrás y adelante del historial.
  cambioMientrasLoVeias:
    "Los avisos cambiaron mientras los veías. Vuelve a abrir Avisos para verlos completos.",
} as const

// CLASES-03d (§D-8.7): el formulario de Avisos solo publica anuncios (sin tipo, título ni tema).
export const TEXTOS_FORMULARIO_PUBLICACION = {
  campoAnuncio: "Anuncio",
  publicarAnuncio: "Publicar anuncio",
  avisoPublicado: "Publicado",
  // La lee PR-1A17 de features/tareas (como-se-entrega-01a.test.tsx); sale cuando esa prueba apunte a
  // TEXTOS_FORMULARIO_RECURSO.
  sinTema: TEXTOS_DE_LA_CLASE.sinTema,
} as const

// TAREAS-01d (§D-10, S-10): la tarjeta de una tarea en el muro.
export const TEXTOS_TARJETA_DE_TAREA = {
  insignia: "Tarea",
  puntos: (n: number) => (n === 1 ? "1 punto" : `${n} puntos`),
} as const

export const TEXTOS_PUBLICACION = {
  insigniaAnuncio: "Anuncio",
  insigniaMaterial: "Material",
  verComentarios: (n: number) => `Ver comentarios (${n})`,
  // Texto del botón que pliega los comentarios. Vive aquí y no en el componente: ninguna palabra de
  // la interfaz se escribe dentro de un .tsx (regla 2 de CLAUDE.md).
  ocultarComentarios: "Ocultar comentarios",
  borrarPublicacion: "Borrar publicación",
  confirmarBorrarPublicacion: "Se borrará con sus comentarios.",
  // §D-D6: con archivos adjuntos, la frase de consecuencia también los nombra.
  confirmarBorrarPublicacionConAdjuntos: "Se borrará con sus comentarios y adjuntos.",
  siBorrar: "Sí, borrar",
  cancelar: "Cancelar",
} as const

export const TEXTOS_COMENTARIOS = {
  titulo: "Comentarios",
  campo: "Escribe un comentario",
  comentar: "Comentar",
  avisoComentado: "Comentario publicado",
  cambioMientrasLosVeias:
    "Los comentarios cambiaron mientras los veías. Vuelve a abrirlos para verlos completos.",
  borrar: "Borrar",
  siBorrarComentario: "Sí, borrar comentario",
  cancelar: "Cancelar",
  avisoComentarioBorrado: "Comentario borrado",
  verMas: "Ver más comentarios",
} as const

// TAREAS-01c (§D-9): los textos de los adjuntos, el accept y el margen de las vistas previas viven en
// components/adjuntos/data.ts; se reexportan aquí para no cambiar a nadie.
export {
  ACCEPT_DE_ADJUNTOS,
  MARGEN_DE_VISTA_PREVIA_MS,
  MENSAJES_ERROR_DE_ARCHIVOS,
  TEXTOS_ADJUNTOS,
} from "@/components/adjuntos/data"

// Sin vistas previas, el muro se considera fresco 4 minutos. Con ellas, ver tiempoFrescoDelMuro (lib.ts):
// son URL firmadas que vencen a los 5 minutos de firmarse.
export const TIEMPO_FRESCO_DEL_MURO_MS = 240_000

// CLASES-03 (§D-7.1, RF-60, S-08): las secciones de la clase, en este orden y las mismas en las tres
// perspectivas; "Personas" junta a los maestros y el roster (§D-7.7). Sin "Foro" (FORO-01).
const SECCIONES_DE_LA_CLASE: readonly SeccionDeClase[] = [
  { segmento: "", texto: TEXTOS_CLASE.avisos },
  { segmento: "trabajo", texto: TEXTOS_CLASE.trabajo },
  // CLASES-03d (§D-7.1): "Recursos", entre "Actividades de aprendizaje" y "Personas".
  { segmento: "recursos", texto: TEXTOS_CLASE.recursos },
  // CLASES-03e (§D-7.1): "Dudas", entre "Recursos" y "Personas".
  { segmento: "dudas", texto: TEXTOS_CLASE.dudas },
  { segmento: "personas", texto: TEXTOS_CLASE.personas },
  { segmento: "calificaciones", texto: TEXTOS_CLASE.calificaciones },
]

// §D-2C1: lo que cada perspectiva ve de una clase. La interfaz solo decide qué mostrar; el backend
// ya decide qué se permite (§D-2.0). Ninguna capacidad sustituye una comprobación del backend. El
// botón de borrar no está aquí: sale de `puedeBorrar` de cada publicación y comentario.
export const CAPACIDADES_POR_PERSPECTIVA: Record<Perspectiva, CapacidadesDePerspectiva> = {
  estudiante: {
    base: BASES_POR_PERSPECTIVA.estudiante,
    volverDestino: "/estudiante",
    volverTexto: TEXTOS_CLASE.volver,
    secciones: SECCIONES_DE_LA_CLASE,
    verCodigo: false,
    editar: false,
    formularioPublicacion: false,
    formularioComentario: true,
    gestionarTrabajo: false,
  },
  maestro: {
    base: BASES_POR_PERSPECTIVA.maestro,
    volverDestino: "/maestro",
    volverTexto: TEXTOS_CLASE.volver,
    secciones: SECCIONES_DE_LA_CLASE,
    verCodigo: true,
    editar: false,
    formularioPublicacion: true,
    formularioComentario: true,
    gestionarTrabajo: true,
  },
  admin: {
    base: BASES_POR_PERSPECTIVA.admin,
    volverDestino: "/admin/clases",
    volverTexto: TEXTOS_CLASE.volverALaLista,
    secciones: SECCIONES_DE_LA_CLASE,
    verCodigo: true,
    editar: true,
    formularioPublicacion: true,
    formularioComentario: false,
    gestionarTrabajo: true,
  },
}

// TAREAS-01e (§D-11, Enmienda 5): "Trabajo de clase" pide la primera página de cada tema de 5 en 5,
// "Ver más" de 20 en 20, y como máximo 6 lecturas a la vez (el limitador de hooks.ts).
export const LIMITE_PRIMERA_PAGINA_TRABAJO = 5
export const LIMITE_PAGINAS_TRABAJO = 20
export const MAXIMO_LECTURAS_DE_TRABAJO_EN_VUELO = 6
// El valor de `tema` de GET …/trabajo para los elementos sin tema.
export const CLAVE_SIN_TEMA = "sin-tema"

// §D-11: textos de "Trabajo de clase" (propuesta).
export const TEXTOS_TRABAJO = {
  titulo: TEXTOS_CLASE.trabajo,
  sinTema: TEXTOS_FORMULARIO_PUBLICACION.sinTema,
  temaVacio: "Aún no hay nada en este tema.",
  vacio: "Aún no hay actividades en esta clase.",
  cargandoTema: (nombre: string) => `Cargando ${nombre}`,
  conteo: (n: number) => (n === 1 ? "1 elemento" : `${n} elementos`),
  verMaterial: "Ver material",
  ocultarMaterial: "Ocultar material",
  verMasDe: (nombre: string) => `Ver más de ${nombre}`,
  crearTarea: "Crear tarea",
  nuevoTema: "Nuevo tema",
  categorias: "Categorías de calificación",
  tarea: "Tarea:",
  // El cuadro de fecha de una fecha que no se puede leer (la fila dice "Fecha límite no disponible").
  diaNoDisponible: "—",
  insigniaMaterial: TEXTOS_PUBLICACION.insigniaMaterial,
  // R2 (§D-10): la acción que pide se cumple al pulsar "Actividades de aprendizaje" estando ahí, al ir
  // a otra sección y regresar, y con atrás y adelante del historial.
  cambioMientrasLoVeias:
    "Este tema cambió mientras lo veías. Vuelve a abrir Actividades de aprendizaje para verlo completo.",
  recargaFallida:
    "No pudimos actualizar Actividades de aprendizaje. Mostramos la última versión que tenemos.",
} as const

export const TEXTOS_TEMAS = {
  campoNombre: "Nombre del tema",
  crear: "Crear tema",
  renombrar: "Renombrar",
  guardarNombre: "Guardar nombre",
  cancelar: "Cancelar",
  subir: "Subir",
  bajar: "Bajar",
  delTema: (nombre: string) => `tema ${nombre}`,
  borrar: "Borrar tema",
  consecuencia: (n: number) => {
    if (n === 0) return "El tema no tiene elementos."
    if (n === 1) return "Su elemento pasará a «Sin tema»."
    return `Sus ${n} elementos pasarán a «Sin tema».`
  },
  // CLASES-03 (§D-7.6, §D-13): sin el conteo total del tema (no llegó o no tiene el tema).
  consecuenciaSinConteo: "Sus actividades y recursos pasarán a «Sin tema».",
  siBorrar: "Sí, borrar tema",
  temaDe: (titulo: string) => `Tema de «${titulo}»`,
  mover: "Mover",
  avisoCreado: "Tema creado",
  avisoRenombrado: "Tema renombrado",
  avisoBorrado: "Tema borrado",
  avisoMovido: (titulo: string, tema: string) => `Moviste «${titulo}» a «${tema}»`,
} as const

// Errores que dicen que la lista de temas que se ve ya no es la del servidor: tras ellos se vuelve a
// pedir, junto con "Trabajo de clase" (un elemento puede ya no estar donde se veía).
export const CODIGOS_QUE_RENUEVAN_LOS_TEMAS: readonly string[] = [
  "TEMA_NO_ENCONTRADO",
  "TEMA_REPETIDO",
  "TOPE_DE_TEMAS",
  "ORDEN_DESACTUALIZADO",
  "PUBLICACION_NO_ENCONTRADA",
  "ANUNCIO_SIN_TEMA",
  // CLASES-03d (§D-8.4): un recurso de aprendizaje que el maestro no puede mover. Al renovar las listas,
  // su `puedeMover` pasa a false y el control desaparece.
  "MOVER_NO_PERMITIDO",
]

// CLASES-03d (§D-8.2): "Recursos" pide la primera página de cada tema de 5 en 5, "Ver más" de 20 en 20,
// y como máximo 6 lecturas a la vez (su propio limitador, otra instancia que el de "Actividades").
export const LIMITE_PRIMERA_PAGINA_RECURSOS = 5
export const LIMITE_PAGINAS_RECURSOS = 20
export const MAXIMO_LECTURAS_DE_RECURSOS_EN_VUELO = 6
// §D-8.1: las recargas fallidas de los dos bloques avisan con el mismo id de sonner, así dos fallos
// seguidos o simultáneos dejan un solo aviso a la vista.
export const ID_DEL_AVISO_DE_RECARGA_DE_RECURSOS = "recarga-fallida-de-recursos"

// CLASES-03d (§D-13): textos de "Recursos".
export const TEXTOS_RECURSOS = {
  aprendizaje: "Recursos de aprendizaje",
  docente: "Recursos del docente",
  vacioAprendizaje: "Aún no hay recursos de aprendizaje.",
  vacioDocente: "Aún no hay recursos del docente.",
  insignia: "Recurso",
  conteo: (n: number) => (n === 1 ? "1 recurso" : `${n} recursos`),
  verRecurso: "Ver recurso",
  ocultarRecurso: "Ocultar recurso",
  verMasDe: (nombre: string) => `Ver más de ${nombre}`,
  cargandoTema: TEXTOS_TRABAJO.cargandoTema,
  // R3 (§D-10): la acción que pide se cumple al pulsar "Recursos" estando ahí, al ir a otra sección y
  // regresar, y con atrás y adelante del historial.
  cambioMientrasLoVeias:
    "Este tema cambió mientras lo veías. Vuelve a abrir Recursos para verlo completo.",
  recargaFallida: "No pudimos actualizar Recursos. Mostramos la última versión que tenemos.",
  editar: "Editar recurso",
  borrar: "Borrar recurso",
  siBorrar: "Sí, borrar recurso",
  cancelar: "Cancelar",
  consecuencia: "Se borrará con sus comentarios.",
  consecuenciaConAdjuntos: "Se borrará con sus comentarios y adjuntos.",
  avisoBorrado: "Recurso borrado",
} as const

// El título y el vacío de cada bloque, en el orden de la vista (BLOQUES_DE_RECURSO de shared/).
export const TEXTOS_DE_LOS_BLOQUES: Record<BloqueDeRecurso, { titulo: string; vacio: string }> = {
  aprendizaje: { titulo: TEXTOS_RECURSOS.aprendizaje, vacio: TEXTOS_RECURSOS.vacioAprendizaje },
  docente: { titulo: TEXTOS_RECURSOS.docente, vacio: TEXTOS_RECURSOS.vacioDocente },
}

export const TEXTOS_FORMULARIO_RECURSO = {
  tituloCrear: "Nuevo recurso",
  tituloEditar: "Editar recurso",
  destinoDocente: "Se publicará en Recursos del docente.",
  destinoAprendizaje: "Se publicará en Recursos de aprendizaje.",
  campoTitulo: "Título del recurso",
  campoTema: "Tema",
  sinTema: TEXTOS_DE_LA_CLASE.sinTema,
  campoDescripcion: "Descripción (opcional)",
  publicar: "Publicar recurso",
  guardar: "Guardar cambios",
  cancelar: "Cancelar",
  avisoPublicado: "Recurso publicado",
  avisoGuardado: "Cambios guardados",
  temasNoCargados: "No pudimos cargar los temas. El recurso se publicará sin tema.",
  // Enmienda 13 (decisión (1) del humano): al editar, con la lectura de temas fallida y sin lista vigente.
  temasNoCargadosAlEditar: "No pudimos cargar los temas. El recurso conserva su tema.",
} as const

export const TEXTOS_EDITAR_RECURSO = {
  cargando: "Cargando el recurso…",
  volver: "Volver a Recursos",
  noPuedes: "No puedes editar este recurso.",
  // R8 (§D-10) y DESIGN.md §7.21: sin conexión o con un 5xx, "revisa tu conexión"; con cualquier otra
  // respuesta del servidor (por ejemplo, un 429), "inténtalo de nuevo en un momento".
  recargaRed: "No pudimos actualizar el recurso. Puedes seguir editando; revisa tu conexión.",
  recargaServidor:
    "No pudimos actualizar el recurso. Puedes seguir editando; inténtalo de nuevo en un momento.",
} as const

// Errores que reemplazan "Editar recurso" con su mensaje (§D-8.6): el recurso ya no existe o se perdió
// el acceso a la clase; un VALIDACION de uno de estos ids dice lo mismo.
export const CODIGOS_QUE_REEMPLAZAN_EL_RECURSO: readonly string[] = [
  "RECURSO_NO_ENCONTRADO",
  "SIN_ACCESO_A_LA_CLASE",
]
export const CAMPOS_QUE_REEMPLAZAN_EL_RECURSO: readonly string[] = ["claseId", "recursoId"]

// Errores al guardar que dicen que el recurso abierto ya no es el del servidor: se vuelve a pedir (la
// vista se reemplaza o pierde `puedeEditar`).
export const CODIGOS_QUE_RENUEVAN_EL_RECURSO: readonly string[] = [
  "RECURSO_NO_ENCONTRADO",
  "EDICION_NO_PERMITIDA",
  "SIN_ACCESO_A_LA_CLASE",
]

// §D-14: un borrado que el servidor niega (otro autor, otro bloque) o que ya no encuentra el recurso
// renueva las listas: la fila que ya no está desaparece y `puedeBorrar` se actualiza.
export const CODIGOS_QUE_RENUEVAN_LOS_RECURSOS: readonly string[] = [
  "BORRADO_NO_PERMITIDO",
  "PUBLICACION_NO_ENCONTRADA",
]

// CLASES-03e (§D-13, Enmienda 4): textos de "Dudas".
export const TEXTOS_DUDAS = {
  titulo: TEXTOS_CLASE.dudas,
  frase: "Lo que escribas aquí lo ve toda la clase.",
  campo: "Escribe tu duda",
  publicar: "Publicar duda",
  avisoPublicada: "Duda publicada",
  vacio: "Aún no hay dudas en esta clase.",
  verMas: "Ver más dudas",
  resuelta: "Resuelta",
  marcar: "Marcar como resuelta",
  quitarMarca: "Quitar «Resuelta»",
  avisoMarcada: "Marcada como resuelta",
  avisoDesmarcada: "Ya no está marcada como resuelta",
  // Solo con n ≥ 1; plegado con 0 respuestas el control dice "Responder" (estudiante y maestro) y,
  // desplegado, "Ocultar respuestas" con cualquier número (S-14, S-15).
  verRespuestas: (n: number) => `Ver respuestas (${n})`,
  responder: "Responder",
  ocultarRespuestas: "Ocultar respuestas",
  borrar: "Borrar duda",
  consecuencia: "Se borrará con sus respuestas.",
  siBorrar: "Sí, borrar duda",
  cancelar: "Cancelar",
  avisoBorrada: "Duda borrada",
  // R4 (§D-10): la acción que pide se cumple al pulsar "Dudas" estando ahí, al ir a otra sección y
  // regresar, y con atrás y adelante del historial.
  cambioMientrasLasVeias:
    "Las dudas cambiaron mientras las veías. Vuelve a abrir Dudas para verlas completas.",
} as const

export const TEXTOS_RESPUESTAS = {
  titulo: "Respuestas",
  campo: "Escribe una respuesta",
  responder: "Responder",
  avisoPublicada: "Respuesta publicada",
  borrar: "Borrar",
  siBorrar: "Sí, borrar respuesta",
  cancelar: "Cancelar",
  avisoBorrada: "Respuesta borrada",
  verMas: "Ver más respuestas",
  // R5 (§D-10): se cumple con "Ocultar respuestas" y "Ver respuestas", al pulsar "Dudas" estando ahí y
  // al ir a otra sección, volver y reabrirlas.
  cambioMientrasLasVeias:
    "Las respuestas cambiaron mientras las veías. Vuelve a abrirlas para verlas completas.",
} as const

// §D-9.4: un error que dice que lo que se ve de "Dudas" ya no es lo del servidor (la duda o la respuesta
// ya no está, o `puedeBorrar` cambió) renueva la lista y las respuestas abiertas.
export const CODIGOS_QUE_RENUEVAN_LAS_DUDAS: readonly string[] = [
  "DUDA_NO_ENCONTRADA",
  "RESPUESTA_NO_ENCONTRADA",
  "BORRADO_NO_PERMITIDO",
]

// §D-11: textos de "Categorías de calificación" (propuesta).
export const TEXTOS_CATEGORIAS = {
  titulo: TEXTOS_TRABAJO.categorias,
  frase:
    "Los pesos deben sumar 100 %. Cada categoría cuenta según su peso en la calificación general.",
  nombre: "Nombre",
  peso: "Peso",
  sufijoPeso: "%",
  deLaFila: (n: number) => `de la categoría ${n}`,
  tareas: (n: number) => (n === 1 ? "1 tarea" : `${n} tareas`),
  quitar: "Quitar",
  tieneTareas: (n: number) => (n === 1 ? "Tiene 1 tarea." : `Tiene ${n} tareas.`),
  agregar: "Agregar categoría",
  totalExacto: "Total: 100 %",
  totalFaltan: (total: number, faltan: number) => `Total: ${total} %. Faltan ${faltan} %.`,
  totalSobran: (total: number, sobran: number) => `Total: ${total} %. Sobran ${sobran} %.`,
  guardar: "Guardar categorías",
  avisoGuardadas: "Categorías guardadas",
  vacio: "Esta clase no tiene categorías. Sus tareas se califican por puntos.",
} as const

export const TEXTOS_CATEGORIAS_RECARGA =
  "No pudimos actualizar las categorías. Mostramos la última versión que tenemos."

// Errores al guardar que dicen que las categorías que se editaban ya no son las del servidor: la
// lista se vuelve a pedir y el editor parte de ella.
export const CODIGOS_QUE_RENUEVAN_LAS_CATEGORIAS: readonly string[] = [
  "CATEGORIA_CON_TAREAS",
  "CATEGORIA_NO_ENCONTRADA",
]

// DESIGN.md §7.7 con la variante de TAREAS-01 (S-10): el cuadro de fecha y el texto del estado. Solo la
// fecha próxima usa warning; una pendiente o una vencida van en muted (hasta ENTREGAS no hay "Sin
// entregar"), y el texto dice cuál es.
export const CLASES_DEL_CUADRO_DE_FECHA = {
  pendiente: { cuadro: "bg-muted text-muted-foreground", estado: "text-muted-foreground" },
  proxima: { cuadro: "bg-warning-soft text-warning", estado: "text-warning" },
  vencida: { cuadro: "bg-muted text-muted-foreground", estado: "text-muted-foreground" },
} as const

// ENTREGAS-01d (§D-9.8, DESIGN.md §7.7): la fila del alumno según el estado de su entrega. "Asignado"
// no tiene colores propios: usa los del vencimiento (CLASES_DEL_CUADRO_DE_FECHA).
export const CLASES_DEL_CUADRO_DE_ENTREGA = {
  entregado: { cuadro: "bg-success-soft text-success", estado: "text-success" },
  calificado: { cuadro: "bg-success-soft text-success", estado: "text-success" },
  "entregado-con-retraso": { cuadro: "bg-warning-soft text-warning", estado: "text-warning" },
  "sin-entregar": { cuadro: "bg-danger-soft text-danger", estado: "text-danger" },
} as const
