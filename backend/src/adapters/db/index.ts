// Superficie pública de adapters/db. El cliente (obtenerDb) no se reexporta a propósito.
export { cerrarConexion, inicializarDb } from "./cliente.js"
export { verificarConexion } from "./salud.js"
