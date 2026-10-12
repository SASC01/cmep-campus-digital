import { MENSAJES_ERROR_DE_ARCHIVOS } from "@/components/adjuntos/data"
import { TEXTOS_DE_LA_CLASE } from "@/components/clase/data"
import { BASES_POR_PERSPECTIVA } from "@/lib/ruta-de-clase"

import type { CapacidadesDePerspectiva, Perspectiva } from "./types"

// Claves de consulta de TanStack Query (CLASES-a). Se reutilizan tal cual en las invalidaciones y
// en la prueba de cambio de identidad (PR-A23a).
// A-6 de CLASES-02: las dos claves de las listas viven en services/clasesService.ts (las usa también
// la barra lateral) y se reexportan aquí para no cambiar a nadie.
export {
  CLAVE_CLASES_IMPARTIDAS,
  CLAVE_CLASES_INSCRITAS,
  clavePublicaciones,
} from "@/services/clasesService"
// CLASES-02c: la lista institucional del administrador y el buscador de maestros.
export const CLAVE_CLASES_ADMIN = ["clases", "admin"] as const
export const claveMaestrosCandidatos = (termino: string) =>
  ["clases", "maestros-candidatos", termino] as const
export const claveClaseDetalle = (claseId: string) => ["clases", claseId] as const
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

export const LIMITE_CLASES = 20
// §D-2C2: la lista de clases del administrador se pide de 50 en 50.
export const LIMITE_CLASES_ADMIN = 50
// §D-B1: los compañeros y el roster se piden de 50 en 50.
export const LIMITE_PERSONAS = 50
// §D-B3: el buscador pide hasta 20 resultados, mínimo de 3 letras y 300 ms de espera (RN-04).
export const LIMITE_CANDIDATOS = 20
// §D-C2: el muro y los comentarios se piden de 20 en 20.
export const LIMITE_PUBLICACIONES = 20
export const LIMITE_COMENTARIOS = 20
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
  consecuencia: "Dejará de ver la clase. Lo que publicó se queda en el muro.",
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
  // §D-D6: errores de los archivos adjuntos.
  // TAREAS-01c (§D-9): los textos de los archivos viven en components/adjuntos/data.ts.
  archivoNoSubido: MENSAJES_ERROR_DE_ARCHIVOS.archivoNoSubido,
  archivoInvalido: MENSAJES_ERROR_DE_ARCHIVOS.archivoInvalido,
  almacenNoDisponible: MENSAJES_ERROR_DE_ARCHIVOS.almacenNoDisponible,
  generico: "Algo salió mal. Inténtalo de nuevo.",
} as const

export const TEXTOS_CLASE = {
  volver: "Volver a mis clases",
  volverALaLista: "Volver a la lista de clases",
  maestro: (nombre: string) => `Maestro: ${nombre}`,
  maestros: (nombres: string) => `Maestros: ${nombres}`,
  muro: "Muro",
  // TAREAS-01e (§D-11): la sección nueva, segunda en las tres perspectivas.
  trabajo: "Trabajo de clase",
  personas: "Personas",
  alumnos: "Alumnos",
  maestrosDeLaClase: "Maestros",
  editar: "Editar clase",
  secciones: "Secciones de la clase",
  // TAREAS-01c (§D-9): el texto vive en components/clase/data.ts, junto a ConClaseDeLaRuta.
  sinAcceso: TEXTOS_DE_LA_CLASE.sinAcceso,
} as const

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
export const TEXTOS_MURO = {
  crearTarea: "Crear tarea",
  tituloLista: "Publicaciones",
  vacioEstudiante: "Tu maestro aún no ha publicado nada en esta clase.",
  vacioMaestro: "Publica el primer anuncio o material de tu clase.",
  vacioAdmin: "Aún no hay publicaciones en esta clase.",
  verMasPublicaciones: "Ver más publicaciones",
  avisoPublicacionBorrada: "Publicación borrada",
  cambioMientrasLoVeias: "El muro cambió mientras lo veías. Vuelve a abrirlo para verlo completo.",
} as const

export const TEXTOS_FORMULARIO_PUBLICACION = {
  grupoTipo: "Tipo de publicación",
  anuncio: "Anuncio",
  material: "Material",
  campoTitulo: "Título del material",
  campoAnuncio: "Anuncio",
  campoDescripcion: "Descripción (opcional)",
  publicarAnuncio: "Publicar anuncio",
  publicarMaterial: "Publicar material",
  avisoPublicado: "Publicado",
  // TAREAS-01e (§D-11, Enmienda 6): el tema de un material.
  campoTema: "Tema",
  sinTema: TEXTOS_DE_LA_CLASE.sinTema,
  temasNoCargados: "No pudimos cargar los temas. El material se publicará sin tema.",
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

// §D-2C1: lo que cada perspectiva ve de una clase. La interfaz solo decide qué mostrar; el backend
// ya decide qué se permite (§D-2.0). Ninguna capacidad sustituye una comprobación del backend. El
// botón de borrar no está aquí: sale de `puedeBorrar` de cada publicación y comentario.
export const CAPACIDADES_POR_PERSPECTIVA: Record<Perspectiva, CapacidadesDePerspectiva> = {
  estudiante: {
    base: BASES_POR_PERSPECTIVA.estudiante,
    volverDestino: "/estudiante",
    volverTexto: TEXTOS_CLASE.volver,
    secciones: [
      { segmento: "", texto: TEXTOS_CLASE.muro },
      { segmento: "trabajo", texto: TEXTOS_CLASE.trabajo },
      { segmento: "personas", texto: TEXTOS_CLASE.personas },
    ],
    verCodigo: false,
    editar: false,
    formularioPublicacion: false,
    formularioComentario: true,
    crearTarea: false,
    gestionarTrabajo: false,
  },
  maestro: {
    base: BASES_POR_PERSPECTIVA.maestro,
    volverDestino: "/maestro",
    volverTexto: TEXTOS_CLASE.volver,
    secciones: [
      { segmento: "", texto: TEXTOS_CLASE.muro },
      { segmento: "trabajo", texto: TEXTOS_CLASE.trabajo },
      { segmento: "alumnos", texto: TEXTOS_CLASE.alumnos },
    ],
    verCodigo: true,
    editar: false,
    formularioPublicacion: true,
    formularioComentario: true,
    crearTarea: true,
    gestionarTrabajo: true,
  },
  admin: {
    base: BASES_POR_PERSPECTIVA.admin,
    volverDestino: "/admin/clases",
    volverTexto: TEXTOS_CLASE.volverALaLista,
    secciones: [
      { segmento: "", texto: TEXTOS_CLASE.muro },
      { segmento: "trabajo", texto: TEXTOS_CLASE.trabajo },
      { segmento: "alumnos", texto: TEXTOS_CLASE.alumnos },
      { segmento: "maestros", texto: TEXTOS_CLASE.maestrosDeLaClase },
    ],
    verCodigo: true,
    editar: true,
    formularioPublicacion: true,
    formularioComentario: false,
    crearTarea: true,
    gestionarTrabajo: true,
  },
}

// §D-2C1: el indicador de las secciones mide 1/N y se traslada una posición por sección. Clases
// completas, escritas enteras para que Tailwind las encuentre. TAREAS-01e (§D-11): con "Trabajo de
// clase" son tres (estudiante y maestro) o cuatro (admin).
export const CLASES_DEL_INDICADOR_POR_SECCIONES: Record<number, string> = {
  2: "w-1/2",
  3: "w-1/3",
  4: "w-1/4",
}
export const CLASES_DE_LA_REJILLA_POR_SECCIONES: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
}
export const CLASES_DE_POSICION_DEL_INDICADOR = [
  "",
  "translate-x-full",
  "translate-x-[200%]",
  "translate-x-[300%]",
] as const

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
  vacio: "Aún no hay tareas ni materiales en esta clase.",
  cargandoTema: (nombre: string) => `Cargando ${nombre}`,
  conteo: (n: number) => (n === 1 ? "1 elemento" : `${n} elementos`),
  verMaterial: "Ver material",
  ocultarMaterial: "Ocultar material",
  verMasDe: (nombre: string) => `Ver más de ${nombre}`,
  crearTarea: TEXTOS_MURO.crearTarea,
  nuevoTema: "Nuevo tema",
  categorias: "Categorías de calificación",
  tarea: "Tarea:",
  // El cuadro de fecha de una fecha que no se puede leer (la fila dice "Fecha límite no disponible").
  diaNoDisponible: "—",
  insigniaMaterial: TEXTOS_PUBLICACION.insigniaMaterial,
  cambioMientrasLoVeias:
    "Este tema cambió mientras lo veías. Vuelve a abrir Trabajo de clase para verlo completo.",
  recargaFallida:
    "No pudimos actualizar Trabajo de clase. Mostramos la última versión que tenemos.",
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
