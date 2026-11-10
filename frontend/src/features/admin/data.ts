import { DESTINOS_POR_ROL } from "@/components/layout/data"
import type { TraduccionDeErrores } from "@/lib/errores-de-api"

import type {
  CampoFormularioAdmin,
  EstadoPago,
  FiltroDeEstadoPago,
  FiltroDeRol,
  Rol,
} from "./types"

// DEC-19: invitar maestro y la ficha de una cuenta. ADMIN-01g (E-16): salen las claves que dejó sin uso
// 01f (el título, la nota provisional y la búsqueda por correo de /admin, y "Cuenta inactiva").
export const TEXTOS_CUENTAS = {
  invitar: {
    titulo: "Invitar a un maestro",
    nombre: "Nombre completo",
    correo: "Correo",
    boton: "Enviar invitación",
    exito: (nombre: string) =>
      `Invitación creada. ${nombre} recibirá un correo para elegir su contraseña; el enlace vence en 72 horas.`,
  },
  ficha: {
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

// Mensajes por código de error de la API. CUPO_DIARIO_INSUFICIENTE muestra el mensaje del servidor
// (§D-C7): no tiene un texto fijo, lleva el número de invitaciones que quedan hoy. Un VALIDACION
// muestra el mensaje del servidor sin su ruta (CHORE-03, lib/errores-de-api.ts).
export const MENSAJES_ERROR_ADMIN = {
  CORREO_EN_USO: "Ya existe una cuenta con ese correo.",
  OPERACION_NO_PERMITIDA: "La contraseña del administrador se restablece desde el servidor.",
  USUARIO_NO_ENCONTRADO: "No hay ninguna cuenta con ese correo.",
  ENLACE_NO_ENCONTRADO: "Ese enlace ya no existe.",
} as const

// Códigos de error cuyo mensaje lo trae el propio servidor, no una tabla fija (mensajeDeErrorAdmin).
// CHORE-03 (§D-4): VALIDACION ya no va aquí; el contrato lo trata antes que los mapas y le quita la
// ruta.
// ADMIN-01f (§D-12): los 409 de la baja y del acceso (MAESTRO_CON_CLASES lleva el número de clases
// activas) traen su texto del servidor (core/usuarios/textos.ts).
export const CODIGOS_CON_MENSAJE_DEL_SERVIDOR = [
  "CUPO_DIARIO_INSUFICIENTE",
  "MAESTRO_CON_CLASES",
  "NO_ES_ALUMNO",
  "CUENTA_DE_ADMINISTRACION",
] as const

export const MENSAJE_ERROR_ADMIN_GENERICO = "No pudimos completar la operación. Inténtalo de nuevo."

// CHORE-03 (§D-4): lo que features/admin le dice al contrato de lib/errores-de-api.ts.
// ADMIN-01f (§D-11, Enmienda 14, M-18): activo, restringido y estadoPago no los escribe ninguna
// persona y sus esquemas de shared/ responden en inglés; un VALIDACION de cualquiera de los tres da el
// genérico.
export const TRADUCCION_DE_ERRORES_ADMIN = {
  generico: MENSAJE_ERROR_ADMIN_GENERICO,
  mensajesPorCodigo: MENSAJES_ERROR_ADMIN,
  codigosConMensajeDelServidor: CODIGOS_CON_MENSAJE_DEL_SERVIDOR,
  textosPorCampo: {
    activo: MENSAJE_ERROR_ADMIN_GENERICO,
    restringido: MENSAJE_ERROR_ADMIN_GENERICO,
    estadoPago: MENSAJE_ERROR_ADMIN_GENERICO,
  },
} satisfies TraduccionDeErrores

export const CAMPOS_FORMULARIO_ADMIN = [
  "nombre",
  "email",
  "vigenciaDias",
  "motivo",
] as const satisfies readonly CampoFormularioAdmin[]

// ADMIN-01f (§D-11, Enmienda 14, P-E14-1 a): el texto de nombreSchema (shared/) cuando falta el nombre,
// escrito para quien pone el suyo. En los formularios donde el admin escribe el de otra persona (alta de
// alumno, "Editar nombre" e "Invitar maestro") se cambia por TEXTO_DEL_NOMBRE_DE_OTRA_PERSONA
// (textoParaTerceros, en lib.ts).
export const TEXTO_DEL_NOMBRE_PROPIO = "Escribe tu nombre completo"
export const TEXTO_DEL_NOMBRE_DE_OTRA_PERSONA = "Escribe el nombre completo"

// ADMIN-01f (§D-11, Enmienda 1 y DH-05 a): el dashboard de /admin. Los accesos son los destinos del
// admin de la barra (DESTINOS_POR_ROL, components/layout/data.ts) salvo «Inicio».
export const TEXTOS_INICIO_ADMIN = {
  titulo: "Inicio",
  cifras: {
    alumnos: "Alumnos con cuenta activa",
    maestros: "Maestros con cuenta activa",
    clasesActivas: "Clases activas",
  },
  error: "No pudimos cargar el resumen. Revisa tu conexión e inténtalo de nuevo.",
} as const

// Los accesos del dashboard: los destinos del admin de la barra salvo «Inicio», en su orden, con su
// etiqueta, su ruta y su icono (§D-11, Enmienda 14). Ninguno lleva a una ruta que todavía no existe.
export const ACCESOS_DEL_INICIO = DESTINOS_POR_ROL.admin.filter(
  (destino) => destino.ruta !== "/admin",
)

// ADMIN-01f (§D-11): /admin/usuarios, la tabla de cuentas con buscador, filtro por rol y alta de
// alumno.
export const TEXTOS_USUARIOS = {
  titulo: "Usuarios",
  buscar: "Buscar por nombre o correo",
  ayuda: "Escribe al menos 3 letras.",
  muyLargo: "La búsqueda no puede tener más de 120 caracteres",
  rol: "Rol",
  columnas: {
    nombre: "Nombre",
    correo: "Correo",
    rol: "Rol",
    cuenta: "Cuenta",
    acceso: "Acceso",
    ver: "Ver",
  },
  cuenta: {
    activa: "Activa",
    desactivada: "Desactivada",
  },
  acceso: {
    restringido: "Restringido",
    sinRestriccion: "Sin restricción",
    noAplica: "No aplica",
  },
  ver: "Ver",
  verA: (nombre: string) => `Ver ${nombre}`,
  vacioBusqueda: "No encontramos usuarios con esa búsqueda",
  vacioRol: "No hay cuentas con ese rol",
  error: "No pudimos cargar los usuarios. Revisa tu conexión e inténtalo de nuevo.",
  cambioMientrasLaVeias: "La lista cambió mientras la veías. Vuelve a abrirla para verla completa.",
  cargarMas: "Cargar más usuarios",
  darDeAlta: "Dar de alta un alumno",
} as const

// El filtro por rol (NativeSelect): "Todos" no manda rol.
export const OPCIONES_FILTRO_DE_ROL: readonly { valor: FiltroDeRol; texto: string }[] = [
  { valor: "todos", texto: "Todos" },
  { valor: "estudiante", texto: ETIQUETAS_ROL_ADMIN.estudiante },
  { valor: "maestro", texto: ETIQUETAS_ROL_ADMIN.maestro },
  { valor: "admin", texto: ETIQUETAS_ROL_ADMIN.admin },
]

export const ESPERA_BUSQUEDA_USUARIOS_MS = 300

export const IDS_FILTROS_DE_USUARIOS = {
  campo: "buscar-usuarios",
  ayuda: "buscar-usuarios-ayuda",
  error: "buscar-usuarios-error",
  rol: "filtro-rol-usuarios",
} as const

// ADMIN-01f (§D-11): el alta de un alumno, en línea en /admin/usuarios. La temporal se muestra con los
// textos de la ficha (TEXTOS_CUENTAS.ficha).
export const TEXTOS_ALTA_ALUMNO = {
  titulo: "Dar de alta un alumno",
  nombre: "Nombre completo",
  correo: "Correo",
  crear: "Crear cuenta",
  cancelar: "Cancelar",
  creada: (nombre: string) => `Cuenta creada para ${nombre}.`,
} as const

// ADMIN-01f (§D-11, T-E14): la ficha de una cuenta, /admin/usuarios/:usuarioId.
export const TEXTOS_USUARIO = {
  error: "No pudimos cargar la cuenta. Revisa tu conexión e inténtalo de nuevo.",
  noExiste: "Esa cuenta ya no existe.",
  volver: "Volver a Usuarios",
  datos: {
    correo: "Correo",
    rol: "Rol",
    cuenta: "Cuenta",
    alta: "Alta",
  },
  editarNombre: {
    titulo: "Editar nombre",
    nombre: "Nombre completo",
    guardar: "Guardar nombre",
    cancelar: "Cancelar",
    aviso: "Nombre actualizado",
  },
  baja: {
    boton: "Dar de baja",
    titulo: (nombre: string) => `Dar de baja a ${nombre}`,
    texto:
      "No podrá entrar y se cerrarán sus sesiones. Sus datos se conservan y puedes reactivar la cuenta cuando quieras.",
    confirmar: "Sí, dar de baja",
    cancelar: "Cancelar",
    aviso: "Cuenta dada de baja",
  },
  reactivar: {
    boton: "Reactivar",
    aviso: "Cuenta reactivada",
  },
  restringir: {
    boton: "Restringir acceso",
    titulo: (nombre: string) => `Restringir el acceso de ${nombre}`,
    texto:
      "No podrá usar la plataforma hasta que restablezcas su acceso, y se cerrarán sus sesiones.",
    motivo: "Motivo (opcional)",
    ayuda: "Hasta 300 caracteres.",
    confirmar: "Sí, restringir",
    cancelar: "Cancelar",
    aviso: "Acceso restringido",
  },
  restablecerAcceso: {
    boton: "Restablecer acceso",
    aviso: "Acceso restablecido",
  },
  estadoPago: {
    titulo: "Estado de pago",
    guardar: "Guardar",
    aviso: "Estado de pago actualizado",
  },
} as const

// El control segmentado de la ficha (§7.3), en el orden de T-E14.
export const OPCIONES_ESTADO_PAGO = [
  { valor: "al_corriente", texto: "Al corriente" },
  { valor: "deudor", texto: "Deudor" },
] as const

// Las claves de TanStack Query de las cuentas. La tabla de /admin/usuarios (y, en 01g, la de
// /admin/estado-pago) cuelga de CLAVE_LISTAS_DE_USUARIOS: renovar una cuenta las marca viejas a todas.
export const CLAVE_LISTAS_DE_USUARIOS = ["admin", "usuarios", "lista"] as const
export const claveTablaDeUsuarios = (q: string | undefined, rol: Rol | undefined) =>
  [...CLAVE_LISTAS_DE_USUARIOS, { q: q ?? null, rol: rol ?? null }] as const
export const claveUsuario = (id: string) => ["admin", "usuarios", "cuenta", id] as const
export const CLAVE_RESUMEN_ADMIN = ["admin", "resumen"] as const

// AUTH-03b, §D-B8: enlaces de registro de maestro, en /admin/maestros.
export const TEXTOS_MAESTROS = {
  titulo: "Maestros",
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
  enviar: "Enviar invitaciones",
  resumen: (enviadas: number, existentes: number, invalidas: number) =>
    `Invitaciones enviadas: ${enviadas} · Ya tenían cuenta: ${existentes} · No válidas: ${invalidas}`,
  grupos: {
    enviadas: "Invitaciones enviadas",
    existentes: "Ya tenían cuenta",
    invalidas: "No válidas",
  },
  notaEnviadas:
    "Cada uno recibirá un correo para elegir su contraseña; el enlace vence en 72 horas.",
  lineaEnviada: (correo: string, nombre: string | null) =>
    `${correo} — ${nombre ?? "Sin nombre: podrá escribirlo al activar su cuenta."}`,
  lineaExistente: (linea: number, correo: string) => `Línea ${linea} · ${correo}`,
  // T-15 (ronda 1): termina en "· " (con el espacio) porque el motivo se pinta aparte, en una
  // insignia; el separador tiene que quedar en el texto para que se lea "Línea N · texto · motivo"
  // (§D-C6), no "textoMotivo" pegados.
  // ADMIN-01g (E-17): las dos piezas fijas de la línea, para que el texto de la persona vaya en su propio
  // <bdi> entre ellas sin cambiar lo que se lee ("Línea 7 · no-es-correo · Correo no válido").
  lineaInvalida: (linea: number) => `Línea ${linea} · `,
  separadorDelMotivo: " · ",
  motivos: {
    correo_invalido: "Correo no válido",
    nombre_invalido: "Nombre no válido",
    repetido: "Repetido en la lista",
  },
} as const

// ADMIN-01g: el prefijo de las fichas, para renovarlas todas tras un cambio por lote.
export const CLAVE_FICHAS = ["admin", "usuarios", "cuenta"] as const

// ADMIN-01g (§D-11, Enmienda 15): la tabla de /admin/estado-pago cuelga de CLAVE_LISTAS_DE_USUARIOS (la
// renueva cualquier cambio de una cuenta) y lleva su propio segmento, para no chocar con la de usuarios
// filtrada por "Estudiante".
export const claveTablaDeEstadoPago = (q: string | undefined, estadoPago: EstadoPago | undefined) =>
  [
    ...CLAVE_LISTAS_DE_USUARIOS,
    "estado-pago",
    { q: q ?? null, estadoPago: estadoPago ?? null },
  ] as const

export const CLAVE_MOVIMIENTOS = ["admin", "movimientos"] as const

// ADMIN-01g, ronda 2 (T-05, T-06): las claves de las dos listas de /admin/maestros, para que sus
// componentes marquen viejas y vuelvan a pedir exactamente las claves de sus consultas.
export const CLAVE_ENLACES_REGISTRO = ["admin", "enlaces-registro"] as const
export const claveRegistradosDelEnlace = (enlaceId: string) =>
  [...CLAVE_ENLACES_REGISTRO, enlaceId, "registrados"] as const

// ADMIN-01g (§D-11, T-E14): /admin/estado-pago.
export const TEXTOS_ESTADO_PAGO = {
  titulo: "Estado de pago",
  filtro: "Estado de pago",
  columnas: {
    alumno: "Alumno",
    correo: "Correo",
    estadoPago: "Estado de pago",
    desde: "Desde",
    acceso: "Acceso",
    acciones: "Acciones",
  },
  sinCambios: "Sin cambios",
  seleccionarPagina: "Seleccionar los de esta página",
  seleccionarA: (nombre: string) => `Seleccionar a ${nombre}`,
  marcarDeudor: "Marcar como deudor",
  marcarAlCorriente: "Marcar al corriente",
  restringir: "Restringir",
  restablecer: "Restablecer",
  // El nombre accesible de un botón de fila: la acción y el alumno en un solo texto sr-only (§7.9).
  accionSobre: (accion: string, nombre: string) => `${accion} ${nombre}`,
  seleccionados: (cuantos: number) =>
    cuantos === 1 ? "1 seleccionado" : `${cuantos} seleccionados`,
  marcarDeudores: "Marcar como deudores",
  marcarAlCorrienteLote: "Marcar al corriente",
  vacios: {
    busqueda: "No encontramos alumnos con esa búsqueda",
    todos: "Aún no hay alumnos",
    deudores: "No hay alumnos deudores",
    alCorriente: "No hay alumnos al corriente",
  },
  error: "No pudimos cargar los alumnos. Revisa tu conexión e inténtalo de nuevo.",
  cambioMientrasLaVeias: "La lista cambió mientras la veías. Vuelve a abrirla para verla completa.",
  cargarMas: "Cargar más alumnos",
} as const

// El filtro (NativeSelect): "Todos" no manda estadoPago.
export const OPCIONES_FILTRO_DE_ESTADO_PAGO: readonly {
  valor: FiltroDeEstadoPago
  texto: string
}[] = [
  { valor: "todos", texto: "Todos" },
  { valor: "deudor", texto: "Deudores" },
  { valor: "al_corriente", texto: "Al corriente" },
]

export const IDS_FILTROS_DE_ESTADO_PAGO = {
  campo: "buscar-alumnos-estado-pago",
  ayuda: "buscar-alumnos-estado-pago-ayuda",
  error: "buscar-alumnos-estado-pago-error",
  filtro: "filtro-estado-pago",
} as const

// ADMIN-01g (§D-11, Enmienda 15; T-E14): el diálogo del lote. Los dos textos de la validación local son los
// de estadoPagoLoteSchema (shared/src/usuarios-admin.ts), copiados con el mismo literal (los amarra
// ADM-1G24): la vista los elige por la incidencia, sin leer el mensaje de zod.
export const TEXTOS_LOTE = {
  titulo: "Cambiar el estado de pago",
  texto: (cuantos: number, destino: EstadoPago) => {
    if (cuantos === 1 && destino === "deudor") return "Se marcará 1 alumno como deudor."
    if (cuantos === 1) return "Se marcará 1 alumno al corriente."
    if (destino === "deudor") return `Se marcarán ${cuantos} alumnos como deudores.`
    return `Se marcarán ${cuantos} alumnos al corriente.`
  },
  confirmar: "Sí, cambiar",
  cancelar: "Cancelar",
  eligeAlMenosUno: "Elige al menos un alumno",
  maximo: "No puedes cambiar más de 100 alumnos a la vez",
  aviso: (cuantos: number) =>
    cuantos === 1
      ? "Estado de pago actualizado"
      : `Estado de pago actualizado en ${cuantos} alumnos`,
} as const

// ADMIN-01g (§D-11, T-E14): /admin/movimientos.
export const TEXTOS_MOVIMIENTOS = {
  titulo: "Movimientos de inscripción",
  columnas: {
    fecha: "Fecha",
    clase: "Clase",
    alumno: "Alumno",
    movimiento: "Movimiento",
    hechoPor: "Hecho por",
  },
  tipos: {
    alta: "Alta",
    baja: "Baja",
  },
  vacio: "Aún no hay movimientos",
  error: "No pudimos cargar los movimientos. Revisa tu conexión e inténtalo de nuevo.",
  cambioMientrasLaVeias: "La lista cambió mientras la veías. Vuelve a abrirla para verla completa.",
  cargarMas: "Cargar más movimientos",
} as const
