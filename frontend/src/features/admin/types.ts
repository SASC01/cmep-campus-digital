// Tipos de datos de la API: se infieren de los esquemas zod de shared/ (CLAUDE.md, regla 7).
import type {
  Acceso,
  CorregirCorreo,
  EditarNombre,
  EstadoPagoLote,
  Rol as RolDeCuenta,
} from "@campus/shared"

export type {
  Acceso,
  AltaAlumno,
  AltaAlumnoRespuesta,
  BuscarUsuario,
  ContrasenaTemporalRespuesta,
  CorregirCorreo,
  CrearEnlaceRegistro,
  EditarNombre,
  EnlaceRegistroAdmin,
  EstadoEnlaceRegistro,
  InvitacionMasiva,
  InvitacionMasivaRespuesta,
  InvitarMaestro,
  ListaMovimientosRespuesta,
  ListaUsuariosRespuesta,
  MotivoLineaInvalida,
  MovimientoInscripcion,
  RegistradoPorEnlace,
  ResumenAdminRespuesta,
  Rol,
  UsuarioAdmin,
  UsuarioAdminFila,
} from "@campus/shared"

// Campos de los formularios provisionales de cuentas (DEC-19). AUTH-03b: "vigenciaDias" para el
// formulario de generar un enlace de registro.
// ADMIN-01f: "motivo" para el diálogo de restringir el acceso.
export type CampoFormularioAdmin = "nombre" | "email" | "vigenciaDias" | "motivo"

// AUTH-03b, §D-B6: el enlace generado vive solo en el estado del componente (M-05, R-09), nunca en
// la caché de TanStack Query (gcTime 0, sale al asentarse).
export interface EnlaceGenerado {
  url: string
  expiraEn: string
}

export type ErroresFormularioAdmin = Partial<Record<CampoFormularioAdmin, string>>

// Forma mínima de una incidencia de zod (path y message): el frontend valida con los esquemas de
// shared/ sin importar zod directamente. Duplicado de features/auth/types.ts a propósito: un
// módulo no importa de otro (regla 9).
export interface IncidenciaValidacion {
  path: readonly PropertyKey[]
  message: string
}

// Variables de useCorregirCorreo (T-08, AUTH-02b ronda 2): los tipos van en types.ts, no en hooks.ts.
export interface CorregirCorreoVariables {
  id: string
  datos: CorregirCorreo
}

// El estado de pago de un alumno, inferido del esquema del lote de shared/ (regla 7): shared/ no exporta
// el tipo suelto.
export type EstadoPago = EstadoPagoLote["estadoPago"]

// ADMIN-01f (§D-11): el filtro por rol de /admin/usuarios; "todos" no manda rol.
export type FiltroDeRol = RolDeCuenta | "todos"

// ADMIN-01f (§D-11, Enmienda 14): lo que la tabla hace con lo escrito en el buscador. `q` es lo que se
// manda (undefined: la lista sin búsqueda); `vacioSinPedir`, que la tabla muestra su vacío de búsqueda
// sin preguntar (un término con el carácter nulo); `largo`, que el campo muestra su tope.
export interface BusquedaDeLaTabla {
  q: string | undefined
  vacioSinPedir: boolean
  largo: boolean
}

// ADMIN-01f (§D-7.1, Enmienda 5): la página siguiente de la tabla de usuarios lleva el cursor y la
// posición de la fila del cursor (su nombre), tal como vinieron en la respuesta anterior.
export interface PaginaDeUsuarios {
  cursor: string
  cursorNombre?: string
}

// La columna "Acceso" de una fila: solo los alumnos tienen acceso que restringir.
export type AccesoDeLaFila = "restringido" | "sinRestriccion" | "noAplica"

// Variables de las mutaciones de la ficha (tipos en types.ts, no en hooks.ts).
export interface EditarNombreVariables {
  id: string
  datos: EditarNombre
}

export interface CambiarActivoVariables {
  id: string
  activo: boolean
}

export interface CambiarAccesoVariables {
  id: string
  datos: Acceso
}

export interface CambiarEstadoPagoVariables {
  id: string
  estadoPago: EstadoPago
}

// ADMIN-01f (§7.13): la cuenta recién dada de alta y su temporal, solo en el estado del formulario (nunca en
// la caché de TanStack Query). `enfocar`: el foco seguía en el formulario cuando llegó la respuesta.
export interface CuentaCreada {
  nombre: string
  contrasena: string
  enfocar: boolean
}

// ADMIN-01f: los dos pares de acciones de la ficha («Dar de baja» o «Reactivar»; «Restringir acceso» o
// «Restablecer acceso»): qué diálogo está abierto y a qué par vuelve el foco.
export type ParDeAcciones = "actividad" | "acceso"

// ADMIN-01f: a qué par vuelve el foco y con qué estado de la cuenta: tras una acción que salió bien, se
// espera a que la ficha ya traiga el cambio (el botón de su par ya es el sustituto); al cancelar, el
// estado de hoy.
export interface FocoPendiente {
  par: ParDeAcciones
  activo: boolean
  accesoRestringido: boolean | undefined
}

// ADMIN-01g (§D-11): el filtro de /admin/estado-pago; "todos" no manda estadoPago.
export type FiltroDeEstadoPago = EstadoPago | "todos"

// ADMIN-01g (§D-11, Enmienda 15, criterio de T-01): la selección es una elección de la persona: los ids
// elegidos y, de cada uno, el estado que tenía su fila al elegirla (solo para saber si cambió).
export type SeleccionDeAlumnos = Readonly<Record<string, EstadoPago>>

// ADMIN-01g (§D-11, T-02): el diálogo abierto en /admin/estado-pago; la vista guarda solo su tipo y su
// destino o el id del alumno, nunca una copia de la fila.
export type DialogoDeEstadoPago =
  { tipo: "lote"; destino: EstadoPago } | { tipo: "restringir"; alumnoId: string } | null

// ADMIN-01g: a dónde vuelve el foco al cerrarse un diálogo de /admin/estado-pago.
export type FocoPendienteDeEstadoPago =
  { tipo: "lote"; destino: EstadoPago } | { tipo: "restringir"; alumnoId: string; exito: boolean }

// ADMIN-01g: el rechazo local del lote (los textos de estadoPagoLoteSchema, elegidos por la incidencia).
export type ErrorLocalDelLote = "minimo" | "maximo"

// ADMIN-01g (§D-11, M-23): la acción vigente de la vista: la última de la persona (una acción de una
// fila, o abrir el diálogo del lote o el de restringir). Solo su mensaje se pinta.
export type AccionVigente =
  { tipo: "fila"; alumnoId: string; accion: "marcar" | "restablecer" } | { tipo: "dialogo" } | null
