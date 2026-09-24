import type { Anuncio, CampoFormularioAuth, Rol } from "./types"

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
] as const satisfies readonly CampoFormularioAuth[]

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
