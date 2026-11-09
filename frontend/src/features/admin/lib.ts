import { estadoDeTerminoDeBusqueda } from "@campus/shared"

import { mensajeDeErrorDeApi, mensajeDeErrorDeConsulta } from "@/lib/errores-de-api"
import { CODIGOS_QUE_REDIRIGE_EL_CLIENTE, esApiError } from "@/services/apiClient"

import {
  CAMPOS_FORMULARIO_ADMIN,
  ETIQUETAS_ROL_ADMIN,
  TEXTO_DEL_NOMBRE_DE_OTRA_PERSONA,
  TEXTO_DEL_NOMBRE_PROPIO,
  TEXTOS_INVITACION_MASIVA,
  TEXTOS_MAESTROS,
  TRADUCCION_DE_ERRORES_ADMIN,
} from "./data"
import type {
  AccesoDeLaFila,
  BusquedaDeLaTabla,
  CampoFormularioAdmin,
  ErroresFormularioAdmin,
  EstadoEnlaceRegistro,
  FiltroDeRol,
  IncidenciaValidacion,
  ListaUsuariosRespuesta,
  MotivoLineaInvalida,
  PaginaDeUsuarios,
  Rol,
  UsuarioAdminFila,
} from "./types"

export const etiquetaDeRolAdmin = (rol: Rol): string => ETIQUETAS_ROL_ADMIN[rol]

// T-14: el foco solo se mueve por programa si nadie más lo tiene ya (o si está en <body>, es decir,
// nadie lo tiene). Se decide con el elemento activo en el momento de la respuesta, no con el
// historial de eventos blur/focus (DESIGN-01a, D-6).
export const focoDisponiblePara = (
  contenedor: Element | null,
  activo: Element | null,
  cuerpo: Element,
): boolean =>
  activo === null || activo === cuerpo || (contenedor !== null && contenedor.contains(activo))

// CHORE-03 (§D-4): el mensaje de un error de una acción, con el contrato de lib/errores-de-api.ts y la
// traducción del módulo (data.ts). Un VALIDACION da el mensaje del servidor sin su ruta o, sin texto
// visible, el genérico; CUPO_DIARIO_INSUFICIENTE (§D-C7), su mensaje en español.
export const mensajeDeErrorAdmin = (error: unknown): string =>
  mensajeDeErrorDeApi(error, TRADUCCION_DE_ERRORES_ADMIN)

// CHORE-03 (§D-4, S-01): el mensaje de un error de lo que se carga (la tabla de enlaces y los
// registrados de un enlace). Ante un VALIDACION, el genérico, nunca el texto del servidor.
export const mensajeDeConsultaAdmin = (error: unknown): string =>
  mensajeDeErrorDeConsulta(error, TRADUCCION_DE_ERRORES_ADMIN)

const esCampoFormularioAdmin = (valor: unknown): valor is CampoFormularioAdmin =>
  CAMPOS_FORMULARIO_ADMIN.some((campo) => campo === valor)

// Primer mensaje de cada campo a partir de las incidencias de safeParse de un esquema de shared/.
export const erroresPorCampoAdmin = (
  incidencias: readonly IncidenciaValidacion[],
): ErroresFormularioAdmin => {
  const errores: ErroresFormularioAdmin = {}
  for (const incidencia of incidencias) {
    const campo = incidencia.path[0]
    if (!esCampoFormularioAdmin(campo) || errores[campo] !== undefined) continue
    errores[campo] = incidencia.message
  }
  return errores
}

// AUTH-03b, §D-B3: el token va en el fragmento (DEC-14 de AUTH-02), nunca a un servidor ni a
// Referer.
export const construirUrlDeRegistro = (origen: string, token: string): string =>
  `${origen}/registro-maestro#token=${token}`

export const etiquetaDeEstadoEnlace = (estado: EstadoEnlaceRegistro): string =>
  TEXTOS_MAESTROS.estados[estado]

// AUTH-03b, Enmienda 6 (arbitraje de T-10): sustituye {fecha} en una plantilla de
// TEXTOS_MAESTROS.enlaces.ocultoDeFila por la fecha ya formateada (zona local, legible), para el
// texto sr-only que distingue una fila de otra en el nombre accesible de sus botones ("Revocar el
// enlace creado el 27 sept 2026, 10:00"). Nunca en aria-hidden ni en aria-label.
export const textoOcultoDeFila = (plantilla: string, fechaFormateada: string): string =>
  plantilla.replace("{fecha}", fechaFormateada)

// AUTH-03c, §D-C6: motivo de una línea inválida de la invitación masiva, en texto legible.
export const etiquetaDeMotivo = (motivo: MotivoLineaInvalida): string =>
  TEXTOS_INVITACION_MASIVA.motivos[motivo]

// ADMIN-01f (§D-11, "Avisos con la vista desmontada"): un error con que apiClient ya redirigió (o va a
// redirigir): no se avisa. Mismo nombre, firma y cuerpo que el de features/clases.
export const errorQueRedirigeElCliente = (error: unknown): boolean =>
  esApiError(error) && CODIGOS_QUE_REDIRIGE_EL_CLIENTE.includes(error.codigo)

// ADMIN-01f (§D-11, Enmienda 14, P-E14-1 a): en los formularios donde el admin escribe el nombre de otra
// persona, el texto de nombreSchema escrito para quien pone el suyo pasa a la forma impersonal. Cualquier
// otro texto vuelve tal cual (también el del nombre con caracteres no permitidos).
export const textoParaTerceros = (texto: string): string =>
  texto === TEXTO_DEL_NOMBRE_PROPIO ? TEXTO_DEL_NOMBRE_DE_OTRA_PERSONA : texto

// Los errores locales de un formulario con el nombre de otra persona: el del nombre, con
// textoParaTerceros; los demás, tal cual.
export const erroresDelNombreDeOtraPersona = (
  errores: ErroresFormularioAdmin,
): ErroresFormularioAdmin => {
  if (errores.nombre === undefined) return errores
  return { ...errores, nombre: textoParaTerceros(errores.nombre) }
}

// Se construye con su código para no escribir el carácter en el archivo.
const CARACTER_NULO = String.fromCharCode(0)

// ADMIN-01f (§D-11, Enmienda 14, N-01e-1): lo que la tabla manda con lo escrito, con el criterio del
// servidor (estadoDeTerminoDeBusqueda de shared/). Un término corto (también el vacío o de solo
// espacios) o largo no manda q: se ve la lista sin búsqueda, y el largo marca el campo. Uno válido con
// el carácter nulo no pide nada y la tabla muestra su vacío de búsqueda: ningún nombre ni correo
// guardado lo tiene (nombreSchema y correoSchema lo rechazan), así que es la respuesta verdadera, y la
// interfaz nunca provoca el 400 del servidor. Uno válido se manda tal cual; el servidor lo normaliza.
export const busquedaDeLaTabla = (escrito: string): BusquedaDeLaTabla => {
  const estado = estadoDeTerminoDeBusqueda(escrito)
  if (estado === "largo") return { q: undefined, vacioSinPedir: false, largo: true }
  if (estado === "corto") return { q: undefined, vacioSinPedir: false, largo: false }
  if (escrito.includes(CARACTER_NULO)) return { q: undefined, vacioSinPedir: true, largo: false }
  return { q: escrito, vacioSinPedir: false, largo: false }
}

// El rol que manda el filtro: "Todos" no lo manda.
export const rolDelFiltro = (filtro: FiltroDeRol): Rol | undefined =>
  filtro === "todos" ? undefined : filtro

// ADMIN-01f (§D-7.1, Enmienda 5): la consulta de una página de GET /admin/usuarios. La búsqueda y el rol
// van primero; en las páginas siguientes, el cursor y la posición de su fila, codificados.
export const consultaDeUsuarios = (
  q: string | undefined,
  rol: Rol | undefined,
  pagina: PaginaDeUsuarios | undefined,
): string => {
  const parametros = new URLSearchParams()
  if (q !== undefined) parametros.set("q", q)
  if (rol !== undefined) parametros.set("rol", rol)
  if (pagina !== undefined) {
    parametros.set("cursor", pagina.cursor)
    if (pagina.cursorNombre !== undefined) parametros.set("cursorNombre", pagina.cursorNombre)
  }
  return parametros.toString()
}

// La página siguiente sale de la última respuesta: sin cursor no hay más; la posición va solo si vino
// como texto, sin un valor inventado.
export const siguientePaginaDeUsuarios = (
  respuesta: ListaUsuariosRespuesta,
): PaginaDeUsuarios | undefined => {
  if (respuesta.siguienteCursor === null) return undefined
  if (typeof respuesta.siguienteCursorNombre !== "string") {
    return { cursor: respuesta.siguienteCursor }
  }
  return { cursor: respuesta.siguienteCursor, cursorNombre: respuesta.siguienteCursorNombre }
}

// La columna "Acceso": un alumno restringido o sin restricción; las demás cuentas no tienen acceso que
// restringir.
export const accesoDeLaFila = (fila: UsuarioAdminFila): AccesoDeLaFila => {
  if (fila.rol !== "estudiante") return "noAplica"
  if (fila.accesoRestringido === true) return "restringido"
  return "sinRestriccion"
}

// ADMIN-01f (§D-11, Enmienda 14, N-E14-1): la ficha trata igual la cuenta que no existe (404) y el id mal
// formado (400 VALIDACION: la única entrada de esa consulta es el id). Compara el código, nunca el texto.
export const esCuentaQueNoExiste = (error: unknown): boolean =>
  esApiError(error) && (error.codigo === "USUARIO_NO_ENCONTRADO" || error.codigo === "VALIDACION")

// ADMIN-01f: las consultas del dashboard, de la tabla y de la ficha se reintentan una vez (como el resto
// de la aplicación, app/providers.tsx) salvo ante un 4xx: una cuenta que no existe o una consulta que el
// servidor rechaza no cambian al repetirla, y la frase de error sale en cuanto se sabe.
export const reintentarConsultaAdmin = (fallos: number, error: unknown): boolean => {
  if (esApiError(error) && error.estado >= 400 && error.estado < 500) return false
  return fallos < 1
}

// ADM-1F06: en el alta, el correo en uso se dice junto al campo "Correo".
export const esCorreoEnUso = (error: unknown): boolean =>
  esApiError(error) && error.codigo === "CORREO_EN_USO"

// La fecha de alta de una cuenta, corta y en la zona local.
export const formatearFechaCorta = (iso: string): string => {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return iso
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(fecha)
}
