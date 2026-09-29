// Superficie pública de adapters/db. El cliente (obtenerDb) no se reexporta a propósito; solo las
// pruebas lo importan directamente desde ./cliente.js para preparar y limpiar datos.
export {
  cerrarConexion,
  ejecutorSqlDe,
  inicializarDb,
  type Ejecutor,
  type EjecutorSql,
} from "./cliente.js"
export { verificarConexion } from "./salud.js"
export {
  actualizarContrasenaYRevocarSesiones,
  buscarAdmin,
  buscarCredencialesPorEmail,
  buscarCredencialesPorId,
  buscarCuentaPorEmail,
  buscarCuentaPorId,
  buscarPerfilPorId,
  cambiarContrasenaPropia,
  corregirCorreo,
  crearMaestroInvitado,
  crearUsuario,
  crearUsuarioConSesion,
  existeAdmin,
  restablecerConTemporal,
  type CredencialesDeUsuario,
  type NuevaSesionDeUsuario,
  type NuevoMaestroInvitado,
  type NuevoUsuario,
  type UsuarioAdmin,
} from "./usuarios.js"
export {
  buscarEnlacePorHash,
  buscarEnlacePorId,
  crearEnlaceRegistro,
  listarEnlacesRegistro,
  listarRegistradosPorEnlace,
  registrarMaestroConEnlace,
  revocarEnlaceRegistro,
  type EnlaceRegistroConRegistrados,
  type EnlaceRegistroDb,
  type ListaEnlacesDb,
  type ListaRegistradosDb,
  type RegistradoDb,
} from "./enlaces-registro.js"
export {
  buscarSesionPorHash,
  crearSesion,
  revocarSesion,
  revocarSesionPorHash,
  revocarTodasLasSesiones,
  rotarSesion,
  type DatosDeSesion,
  type SesionEncontrada,
} from "./sesiones.js"
export {
  buscarInvitacionPorHash,
  buscarTokenParaEnvio,
  buscarTokenPorHash,
  contarRecuperacionesRecientes,
  prepararTokenDeRecuperacion,
  usarTokenYCambiarContrasena,
  type InvitacionParaUso,
  type TokenParaEnvio,
  type TokenParaUso,
} from "./tokens-cuenta.js"
export {
  CLAVE_BLOQUEO_INVITACIONES_EN_LOTE,
  invitarMaestrosEnLote,
  type CandidatoParaInvitarEnLote,
  type ResultadoInvitacionEnLote,
} from "./invitaciones.js"
