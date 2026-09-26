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
  buscarTokenParaEnvio,
  buscarTokenPorHash,
  contarRecuperacionesRecientes,
  prepararTokenDeRecuperacion,
  usarTokenYCambiarContrasena,
  type TokenParaEnvio,
  type TokenParaUso,
} from "./tokens-cuenta.js"
