import type { SaludRespuesta } from "@campus/shared"

import { AppError } from "./errores.js"

export const evaluarSalud = ({
  baseDeDatos,
  ahora,
}: {
  baseDeDatos: boolean
  ahora: Date
}): SaludRespuesta => {
  if (!baseDeDatos) {
    throw new AppError("BASE_DE_DATOS_NO_DISPONIBLE", "La base de datos no responde.", 503)
  }

  return { estado: "ok", baseDeDatos: "ok", marcaDeTiempo: ahora.toISOString() }
}
