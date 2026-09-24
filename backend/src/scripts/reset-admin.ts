import { hashContrasena, inicializarAuth } from "../adapters/auth/index.js"
import {
  actualizarContrasenaYRevocarSesiones,
  buscarAdmin,
  cerrarConexion,
  inicializarDb,
} from "../adapters/db/index.js"
import { opcionesDeAuth } from "../config/auth.js"
import { cargarEnv, cargarEnvAdmin } from "../config/env.js"
import { esAppError } from "../core/errores.js"

// npm run reset:admin (DEC-11, S-10): fija ADMIN_PASSWORD como contraseña del administrador y cierra
// todas sus sesiones, en una transacción. No activa el cambio obligatorio: la contraseña la eligió
// el humano. Jamás imprime la contraseña ni su hash.
const describirError = (error: unknown): string => {
  if (esAppError(error)) return error.message
  const { name, code } = error as { name?: unknown; code?: unknown }
  const nombre = typeof name === "string" ? name : "Error"
  const codigo = typeof code === "string" ? ` ${code}` : ""
  return `No se pudo cambiar la contraseña del administrador (${nombre}${codigo}).`
}

const principal = async (): Promise<number> => {
  const env = cargarEnv()
  const admin = cargarEnvAdmin()
  inicializarDb({ connectionString: env.DATABASE_URL })

  try {
    const actual = await buscarAdmin()
    if (!actual) {
      console.error("No existe una cuenta de administrador. Créala con npm run seed:admin.")
      return 1
    }

    await inicializarAuth(opcionesDeAuth(env))
    await actualizarContrasenaYRevocarSesiones(
      actual.id,
      await hashContrasena(admin.ADMIN_PASSWORD),
    )
    console.log(`Contraseña del administrador actualizada y sesiones cerradas: ${actual.email}`)
    return 0
  } catch (error) {
    console.error(describirError(error))
    return 1
  } finally {
    await cerrarConexion()
  }
}

process.exitCode = await principal()
