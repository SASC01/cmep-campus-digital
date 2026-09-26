import type {
  Anuncio,
  AvisoDeLogin,
  CampoFormularioAuth,
  Rol,
  TextosNuevaContrasena,
  TipoEnlace,
} from "./types"

export const TEXTOS_LOGIN = {
  titulo: "CMEP Campus Digital",
  subtitulo: "Entra con el correo y la contraseña de tu cuenta.",
  correo: "Correo",
  contrasena: "Contraseña",
  entrar: "Iniciar sesión",
  olvide: "¿Olvidaste tu contraseña?",
  notaAdministracion: "¿No te llega el correo? Acude a administración.",
  registro: "Regístrate como estudiante",
  tituloAnuncios: "Avisos del colegio",
  tituloError: "No pudimos iniciar sesión",
} as const

export const TEXTOS_REGISTRO = {
  titulo: "Crea tu cuenta de estudiante",
  subtitulo: "Escribe bien tu correo: con él vas a iniciar sesión.",
  nombre: "Nombre completo",
  correo: "Correo",
  contrasena: "Contraseña",
  ayudaContrasena: "Mínimo 10 caracteres",
  crear: "Crear cuenta",
  yaTienesCuenta: "¿Ya tienes cuenta? Inicia sesión",
  tituloError: "No pudimos crear tu cuenta",
} as const

export const ETIQUETAS_ROL = {
  estudiante: "Estudiante",
  maestro: "Maestro",
  admin: "Administrador",
} as const satisfies Record<Rol, string>

export const TEXTOS_SESION = {
  cerrarSesion: "Cerrar sesión",
  saludo: "Hola",
  proximamente: "Tu dashboard estará disponible pronto.",
  tituloError: "No pudimos cargar tu cuenta",
} as const

// RN-03. Sin estado de pago hasta el módulo pagos (P-02).
export const TEXTOS_RESTRINGIDO = {
  titulo: "Acceso restringido",
  mensaje: "Tu acceso está restringido. Acude a administración.",
  motivo: "Motivo:",
} as const

// Mensajes por código de error de la API (DEC-14). VALIDACION muestra el mensaje del servidor.
export const MENSAJES_ERROR_AUTH = {
  CREDENCIALES_INVALIDAS: "Correo o contraseña incorrectos.",
  DEMASIADOS_INTENTOS: "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.",
  CORREO_EN_USO: "Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.",
  SIN_CONEXION: "No pudimos conectar con el servidor. Revisa tu conexión.",
  ENLACE_INVALIDO: "El enlace no es válido o ya venció. Pide uno nuevo.",
  DEMASIADAS_SOLICITUDES:
    "Ya pediste varios enlaces para este correo. Espera una hora e inténtalo de nuevo.",
  CONTRASENA_ACTUAL_INCORRECTA: "La contraseña temporal no es correcta.",
  CONTRASENA_REPETIDA: "La contraseña nueva debe ser distinta de la temporal.",
  CAMBIO_DE_CONTRASENA_REQUERIDO: "Debes cambiar tu contraseña antes de continuar.",
  CAMBIO_NO_REQUERIDO: "Ya no tienes un cambio de contraseña pendiente.",
} as const

export const MENSAJE_ERROR_AUTH_GENERICO = "No pudimos completar la operación. Inténtalo de nuevo."

export const RUTA_POR_ROL = {
  estudiante: "/estudiante",
  maestro: "/maestro",
  admin: "/admin",
} as const satisfies Record<Rol, string>

export const RUTA_ACCESO_RESTRINGIDO = "/acceso-restringido"

export const CAMPOS_FORMULARIO_AUTH = [
  "nombre",
  "email",
  "contrasena",
  "contrasenaActual",
  "contrasenaNueva",
  "confirmacion",
] as const satisfies readonly CampoFormularioAuth[]

// /recuperar (RF-04, DEC-04): misma confirmación exista o no la cuenta.
export const TEXTOS_RECUPERAR = {
  titulo: "Recupera tu contraseña",
  descripcion:
    "Escribe el correo con el que entras a Campus Digital y te enviaremos un enlace para elegir una contraseña nueva.",
  correo: "Correo",
  enviar: "Enviar enlace",
  confirmacion:
    "Si hay una cuenta con ese correo, te enviamos un enlace. Revisa tu bandeja de entrada y la carpeta de spam. El enlace vence en 30 minutos.",
  notaAdministracion: "¿No te llega el correo? Acude a administración.",
  volver: "Volver a iniciar sesión",
} as const

// /restablecer y /establecer-contrasena, por tipo de enlace (DEC-17, DEC-19).
export const TEXTOS_NUEVA_CONTRASENA: Record<TipoEnlace, TextosNuevaContrasena> = {
  recuperacion: {
    titulo: "Elige una contraseña nueva",
    contrasenaNueva: "Contraseña nueva",
    ayudaContrasena: "Mínimo 10 caracteres",
    confirmacion: "Confirma la contraseña nueva",
    boton: "Guardar contraseña",
    enlaceInvalido: "El enlace no es válido o ya venció. Pide uno nuevo.",
    pedirOtroEnlace: "Pedir otro enlace",
    avisoLogin: "contrasena-actualizada",
  },
  invitacion: {
    titulo: "Elige tu contraseña",
    descripcion: "Con ella vas a entrar a Campus Digital con tu correo.",
    contrasenaNueva: "Contraseña nueva",
    ayudaContrasena: "Mínimo 10 caracteres",
    confirmacion: "Confirma la contraseña nueva",
    boton: "Activar mi cuenta",
    enlaceInvalido:
      "El enlace no es válido o ya venció. Pide uno nuevo en ¿Olvidaste tu contraseña? o acude a administración.",
    avisoLogin: "cuenta-activada",
  },
}

// /cambiar-contrasena (RF-04d, DEC-09).
export const TEXTOS_CAMBIAR = {
  titulo: "Cambia tu contraseña",
  descripcion: "Entraste con una contraseña temporal. Elige una propia para continuar.",
  contrasenaActual: "Contraseña temporal",
  contrasenaNueva: "Contraseña nueva",
  ayudaContrasena: "Mínimo 10 caracteres",
  confirmacion: "Confirma la contraseña nueva",
  guardar: "Guardar y continuar",
  cerrarSesion: "Cerrar sesión",
} as const

// Confirmación distinta a la contraseña: validación solo en cliente, no viene del servidor.
export const MENSAJE_CONFIRMACION_NO_COINCIDE = "Las contraseñas no coinciden."

export const RUTA_CAMBIAR_CONTRASENA = "/cambiar-contrasena"

export const AVISOS_LOGIN = {
  "contrasena-actualizada": "Tu contraseña se actualizó. Inicia sesión con la nueva.",
  "cuenta-activada": "Tu contraseña quedó lista. Inicia sesión con tu correo.",
} as const satisfies Record<AvisoDeLogin, string>

// Anuncios de muestra hasta que exista el endpoint público de anuncios del login (RF-07).
export const ANUNCIOS_DE_EJEMPLO: Anuncio[] = [
  {
    anuncioId: "ejemplo-1",
    titulo: "Inscripciones al taller de robótica",
    texto:
      "Regístrate con tu maestro titular antes del viernes 3 de octubre. Cupo: 20 alumnos por turno.",
    orden: 1,
  },
  {
    anuncioId: "ejemplo-2",
    titulo: "Entrega de boletas del primer parcial",
    texto:
      "Las boletas se entregan en la dirección del lunes 6 al miércoles 8 de octubre, de 8:00 a 14:00.",
    orden: 2,
  },
  {
    anuncioId: "ejemplo-3",
    titulo: "Suspensión de clases",
    texto:
      "El viernes 10 de octubre no hay clases por consejo técnico. Las tareas con fecha límite ese día se mueven al lunes.",
    orden: 3,
  },
]
