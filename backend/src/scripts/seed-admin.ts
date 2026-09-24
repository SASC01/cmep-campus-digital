import { hashContrasena, inicializarAuth } from "../adapters/auth/index.js"
import { cerrarConexion, crearUsuario, existeAdmin, inicializarDb } from "../adapters/db/index.js"
import { opcionesDeAuth } from "../config/auth.js"
import { cargarEnv, cargarEnvAdmin } from "../config/env.js"
import { prepararRegistro } from "../core/auth/normalizacion.js"
import { esAppError } from "../core/errores.js"

// npm run seed:admin (DEC-11): crea la cuenta única de administrador con ADMIN_EMAIL,
// ADMIN_PASSWORD y ADMIN_NOMBRE. Si ya existe, falla con código 1. Jamás imprime la contraseña ni
// su hash; ante un error inesperado solo muestra su nombre y código.
const describirError = (error: unknown): string => {
  if (esAppError(error)) return error.message
  const { name, code } = error as { name?: unknown; code?: unknown }
  const nombre = typeof name === "string" ? name : "Error"
  const codigo = typeof code === "string" ? ` ${code}` : ""
  return `No se pudo crear la cuenta de administrador (${nombre}${codigo}).`
}

const principal = async (): Promise<number> => {
  const env = cargarEnv()
  const admin = cargarEnvAdmin()
  inicializarDb({ connectionString: env.DATABASE_URL })

  try {
    if (await existeAdmin()) {
      console.error(
        "Ya existe una cuenta de administrador. Usa npm run reset:admin para cambiar su contraseña.",
      )
      return 1
    }

    await inicializarAuth(opcionesDeAuth(env))
    const cuenta = prepararRegistro({ nombre: admin.ADMIN_NOMBRE, email: admin.ADMIN_EMAIL })
    await crearUsuario({
      ...cuenta,
      hashContrasena: await hashContrasena(admin.ADMIN_PASSWORD),
      rol: "admin",
    })
    console.log(`Administrador creado: ${cuenta.email}`)
    return 0
  } catch (error) {
    console.error(describirError(error))
    return 1
  } finally {
    await cerrarConexion()
  }
}

process.exitCode = await principal()
