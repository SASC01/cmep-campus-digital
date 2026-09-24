// Superficie pública de adapters/db. El cliente (obtenerDb) no se reexporta a propósito; solo las
// pruebas lo importan directamente desde ./cliente.js para preparar y limpiar datos.
export { cerrarConexion, inicializarDb, type Ejecutor } from "./cliente.js"
export { verificarConexion } from "./salud.js"
export {
  actualizarContrasenaYRevocarSesiones,
  buscarAdmin,
  buscarCredencialesPorEmail,
  buscarPerfilPorId,
  crearUsuario,
  crearUsuarioConSesion,
  existeAdmin,
  type CredencialesDeUsuario,
  type NuevaSesionDeUsuario,
  type NuevoUsuario,
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
