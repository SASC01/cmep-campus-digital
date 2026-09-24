import { AppError } from "../../core/errores.js"

export interface OpcionesArgon2 {
  memoryCost: number
  timeCost: number
  parallelism: number
}

export interface ConfiguracionAuth {
  jwtSecret: string
  argon2: OpcionesArgon2
}

export interface EstadoAuth extends ConfiguracionAuth {
  clave: Uint8Array
  hashDeRelleno: string
}

// Estado del adaptador: la clave del JWT, los parámetros de argon2 y el hash de relleno. Lo fija
// inicializarAuth (index.ts) con lo que le pasa config/auth.ts; adapters/ no lee process.env.
let estado: EstadoAuth | undefined

export const obtenerEstado = (): EstadoAuth => {
  if (!estado) {
    throw new AppError("AUTH_NO_INICIALIZADA", "La autenticación no está inicializada.", 500)
  }
  return estado
}

export const establecerEstado = (nuevo: EstadoAuth): void => {
  estado = nuevo
}

export const mismaConfiguracion = ({ jwtSecret, argon2 }: ConfiguracionAuth): boolean =>
  estado !== undefined &&
  estado.jwtSecret === jwtSecret &&
  estado.argon2.memoryCost === argon2.memoryCost &&
  estado.argon2.timeCost === argon2.timeCost &&
  estado.argon2.parallelism === argon2.parallelism
