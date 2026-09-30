// Claves de consulta de TanStack Query (CLASES-a). Se reutilizan tal cual en las invalidaciones y
// en la prueba de cambio de identidad (PR-A23a).
export const CLAVE_CLASES_INSCRITAS = ["clases", "inscritas"] as const
export const CLAVE_CLASES_IMPARTIDAS = ["clases", "impartidas"] as const
export const claveClaseDetalle = (claseId: string) => ["clases", claseId] as const
export const claveCodigoDeClase = (claseId: string) => ["clases", claseId, "codigo"] as const

export const LIMITE_CLASES = 20

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
  siguientePasoSinClases: "Crea tu primera clase y comparte su código con tus alumnos.",
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
  accionMaestro: "Crea tu primera clase",
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
  generico: "Algo salió mal. Inténtalo de nuevo.",
} as const

export const TEXTOS_CLASE = {
  volver: "Volver a mis clases",
  maestro: (nombre: string) => `Maestro: ${nombre}`,
  muro: "Muro",
  personas: "Personas",
  alumnos: "Alumnos",
  editar: "Editar clase",
  secciones: "Secciones de la clase",
  sinAcceso: "No tienes acceso a esta clase.",
} as const

export const TEXTOS_MURO_PROVISIONAL = {
  aviso: "Pronto podrás ver aquí los anuncios y materiales de la clase.",
} as const
