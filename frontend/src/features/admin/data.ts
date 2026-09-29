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

// Mensajes por código de error de la API. VALIDACION y CUPO_DIARIO_INSUFICIENTE muestran el
// mensaje del servidor (§D-C7): CUPO_DIARIO_INSUFICIENTE no tiene un texto fijo, lleva el número de
// invitaciones que quedan hoy.
export const MENSAJES_ERROR_ADMIN = {
  CORREO_EN_USO: "Ya existe una cuenta con ese correo.",
  OPERACION_NO_PERMITIDA: "La contraseña del administrador se restablece desde el servidor.",
  USUARIO_NO_ENCONTRADO: "No hay ninguna cuenta con ese correo.",
  ENLACE_NO_ENCONTRADO: "Ese enlace ya no existe.",
} as const

// Códigos de error cuyo mensaje lo trae el propio servidor, no una tabla fija (mensajeDeErrorAdmin).
export const CODIGOS_CON_MENSAJE_DEL_SERVIDOR = ["VALIDACION", "CUPO_DIARIO_INSUFICIENTE"] as const

export const MENSAJE_ERROR_ADMIN_GENERICO = "No pudimos completar la operación. Inténtalo de nuevo."

export const CAMPOS_FORMULARIO_ADMIN = [
  "nombre",
  "email",
  "vigenciaDias",
] as const satisfies readonly CampoFormularioAdmin[]

// AUTH-03b, §D-B8: enlaces de registro de maestro, en /admin/maestros.
export const TEXTOS_MAESTROS = {
  titulo: "Maestros",
  notaProvisional: "Pantalla provisional: la gestión completa de usuarios llega después.",
  enlaces: {
    titulo: "Enlaces de registro",
    descripcion:
      "Quien tenga el enlace puede crear su cuenta de maestro hasta que venza o lo revoques.",
    vigencia: "Vigencia en días",
    generar: "Generar enlace",
    copiarEnlace: "Copiar enlace",
    copiada: "Enlace copiado",
    noCopiada: "No pudimos copiarlo. Cópialo a mano.",
    aviso: "Cópialo ahora: no se volverá a mostrar. Si lo pierdes, revócalo y genera otro.",
    vence: (fecha: string) => `Vence el ${fecha}`,
    columnas: {
      creado: "Creado",
      vence: "Vence",
      estado: "Estado",
      registrados: "Registrados",
      acciones: "Acciones",
    },
    verRegistrados: "Ver registrados",
    ocultarRegistrados: "Ocultar registrados",
    registrados: {
      nombre: "Nombre",
      correo: "Correo",
      registro: "Registro",
      cargarMas: "Cargar más",
      vacioTitulo: "Nadie se ha registrado con este enlace",
    },
    revocar: "Revocar",
    confirmarRevocar:
      "Quien tenga este enlace ya no podrá registrarse. Las cuentas ya creadas no cambian.",
    siRevocar: "Sí, revocar",
    cancelar: "Cancelar",
    cargarMasEnlaces: "Cargar más enlaces",
    vacioListaTitulo: "Aún no has generado enlaces de registro",
    vacioListaDescripcion: "Genera uno y compártelo con los maestros que quieras dar de alta.",
    generarElPrimero: "Generar el primer enlace",
    // AUTH-03b, Enmienda 6 (arbitraje de T-10): plantillas del texto sr-only de los botones de
    // fila, sin espacio inicial (el espacio va en el JSX); {fecha} se sustituye con la fecha ya
    // formateada (textoOcultoDeFila, en lib.ts). El texto visible de los botones no cambia.
    ocultoDeFila: {
      verRegistrados: "del enlace creado el {fecha}",
      ocultarRegistrados: "del enlace creado el {fecha}",
      revocar: "el enlace creado el {fecha}",
      confirmarRevocacion: "el enlace creado el {fecha}",
      cancelarRevocacion: "la revocación del enlace creado el {fecha}",
      // R-18 (para el manager, decidido por el manager): mismo patrón para "Cargar más" de
      // RegistradosDelEnlace, que también podría repetirse con dos filas expandidas.
      cargarMasRegistrados: "registrados del enlace creado el {fecha}",
    },
  },
  estados: {
    vigente: "Vigente",
    vencido: "Vencido",
    revocado: "Revocado",
  },
} as const

// AUTH-03c, §D-C6 y §D-C7: invitación masiva de maestros, en /admin/maestros.
export const TEXTOS_INVITACION_MASIVA = {
  titulo: "Invitar a varios maestros",
  etiquetaLista: "Lista de maestros",
  ayudaLista:
    "Un maestro por línea: su correo y, si quieres, su nombre, separados por coma, punto y coma o tabulador. Hasta 100 líneas.",
  ejemplo: "ana.lopez@colegio.mx, Ana López",
  contador: (lineas: number, limite: number) => `${lineas} de ${limite} líneas`,
  demasiadasLineas: (limite: number) => `No puedes enviar más de ${limite} líneas a la vez.`,
  enviar: "Enviar invitaciones",
  resumen: (enviadas: number, existentes: number, invalidas: number) =>
    `Invitaciones enviadas: ${enviadas} · Ya tenían cuenta: ${existentes} · No válidas: ${invalidas}`,
  grupos: {
    enviadas: "Invitaciones enviadas",
    existentes: "Ya tenían cuenta",
    invalidas: "No válidas",
  },
  sinNombre: "Sin nombre: podrá escribirlo al activar su cuenta.",
  notaEnviadas:
    "Cada uno recibirá un correo para elegir su contraseña; el enlace vence en 72 horas.",
  lineaEnviada: (correo: string, nombre: string | null) =>
    `${correo} — ${nombre ?? "Sin nombre: podrá escribirlo al activar su cuenta."}`,
  lineaExistente: (linea: number, correo: string) => `Línea ${linea} · ${correo}`,
  // T-15 (ronda 1): termina en "· " (con el espacio) porque el motivo se pinta aparte, en una
  // insignia; el separador tiene que quedar en el texto para que se lea "Línea N · texto · motivo"
  // (§D-C6), no "textoMotivo" pegados.
  lineaInvalida: (linea: number, texto: string) => `Línea ${linea} · ${texto} · `,
  motivos: {
    correo_invalido: "Correo no válido",
    nombre_invalido: "Nombre no válido",
    repetido: "Repetido en la lista",
  },
} as const
