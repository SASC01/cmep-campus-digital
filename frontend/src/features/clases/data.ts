// Claves de consulta de TanStack Query (CLASES-a). Se reutilizan tal cual en las invalidaciones y
// en la prueba de cambio de identidad (PR-A23a).
export const CLAVE_CLASES_INSCRITAS = ["clases", "inscritas"] as const
export const CLAVE_CLASES_IMPARTIDAS = ["clases", "impartidas"] as const
export const claveClaseDetalle = (claseId: string) => ["clases", claseId] as const
export const claveCodigoDeClase = (claseId: string) => ["clases", claseId, "codigo"] as const
// CLASES-b: las tres consultas de personas cuelgan de ["clases", claseId, …], así que invalidar el
// prefijo de una clase las alcanza a todas.
export const clavePersonas = (claseId: string) => ["clases", claseId, "personas"] as const
export const claveAlumnos = (claseId: string) => ["clases", claseId, "alumnos"] as const
export const claveCandidatos = (claseId: string) => ["clases", claseId, "candidatos"] as const
// CLASES-c: el muro y los comentarios de cada publicación. Los comentarios no cuelgan de la clave
// del muro, para que invalidar la lista no vuelva a pedir los comentarios de todas las abiertas.
export const clavePublicaciones = (claseId: string) => ["clases", claseId, "publicaciones"] as const
export const claveComentarios = (claseId: string, publicacionId: string) =>
  ["clases", claseId, "comentarios", publicacionId] as const

export const LIMITE_CLASES = 20
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
  siguientePasoSinClases: "Crea tu primera clase y comparte su código con tus alumnos.",
  siguientePasoConClases: "Comparte el código de cada clase para que tus alumnos se unan.",
  errorTitular: "No pudimos cargar tus clases",
  // §D-B4 bis: textos fijos que vivían dentro de inicio-maestro-view.tsx (regla 2 de CLAUDE.md).
  insignia: "Nueva clase",
  crearClase: "Crear clase",
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
  alumnoNoEncontrado: "No encontramos a ese alumno.",
  // §D-C6: errores del muro.
  publicacionNoEncontrada: "Esa publicación ya no existe.",
  comentarioNoEncontrado: "Ese comentario ya no existe.",
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

// §D-B6: textos de CLASES-b (propuesta).
export const TEXTOS_PERSONAS = {
  maestro: "Maestro",
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
  tituloLista: "Publicaciones",
  vacioEstudiante: "Tu maestro aún no ha publicado nada en esta clase.",
  vacioMaestro: "Publica el primer anuncio o material de tu clase.",
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
