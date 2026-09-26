import { randomBytes } from "node:crypto"

import {
  BYTES_PARA_CONTRASENA_TEMPORAL,
  formatearContrasenaTemporal,
} from "../../core/auth/contrasena-temporal.js"

export const generarContrasenaTemporal = (): string =>
  formatearContrasenaTemporal(randomBytes(BYTES_PARA_CONTRASENA_TEMPORAL))
