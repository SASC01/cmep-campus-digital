import type { CampoFormularioAdmin, Rol } from "./types"

// DEC-19. Pantalla provisional de admin: invitar maestro y buscar/gestionar una cuenta por correo.
export const TEXTOS_CUENTAS = {
  titulo: "Cuentas",
  notaProvisional: "Pantalla provisional: la gestión completa de usuarios llega después.",
  invitar: {
    titulo: "Invitar a un maestro",
    nombre: "Nombre completo",
    correo: "Correo",
    boton: "Enviar invitación",
    exito: (nombre: string) =>
      `Invitación creada. ${nombre} recibirá un correo para elegir su contraseña; el enlace vence en 72 horas.`,
  },
  buscar: {
    titulo: "Buscar una cuenta por correo",
    correo: "Correo exacto de la cuenta",
    boton: "Buscar",
  },
  ficha: {
    inactiva: "Cuenta inactiva",
    restablecer: "Restablecer contraseña",
    confirmarRestablecer:
      "Se cerrarán todas sus sesiones y tendrá que cambiar la contraseña al entrar.",
    siRestablecer: "Sí, restablecer",
    cancelar: "Cancelar",
    temporalAviso: "Cópiala ahora y entrégasela en persona: no se volverá a mostrar.",
    copiar: "Copiar",
    copiada: "Contraseña copiada",
    noCopiada: "No pudimos copiarla. Cópiala a mano.",
    corregirCorreo: "Corregir correo",
    correoCorrecto: "Correo correcto",
    guardarCorreo: "Guardar correo",
    correoActualizado:
      "Correo actualizado. Los enlaces enviados al correo anterior ya no funcionan.",
    notaCorregir:
      "Si es un maestro que aún no eligió su contraseña, pídele que use ¿Olvidaste tu contraseña? con el correo corregido.",
    noPermiteRestablecer: "La contraseña del administrador se restablece desde el servidor.",
  },
} as const

export const ETIQUETAS_ROL_ADMIN = {
  estudiante: "Estudiante",
  maestro: "Maestro",
  admin: "Administrador",
} as const satisfies Record<Rol, string>

// Mensajes por código de error de la API. VALIDACION muestra el mensaje del servidor.
export const MENSAJES_ERROR_ADMIN = {
  CORREO_EN_USO: "Ya existe una cuenta con ese correo.",
  OPERACION_NO_PERMITIDA: "La contraseña del administrador se restablece desde el servidor.",
  USUARIO_NO_ENCONTRADO: "No hay ninguna cuenta con ese correo.",
} as const

export const MENSAJE_ERROR_ADMIN_GENERICO = "No pudimos completar la operación. Inténtalo de nuevo."

export const CAMPOS_FORMULARIO_ADMIN = [
  "nombre",
  "email",
] as const satisfies readonly CampoFormularioAdmin[]
