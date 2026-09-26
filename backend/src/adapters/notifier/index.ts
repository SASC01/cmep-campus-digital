import type { OpcionesCorreo } from "../../config/correo.js"
import { AppError } from "../../core/errores.js"
import type { Notifier } from "../../core/correo/notifier.js"
import { crearCanalRegistro } from "./registro.js"
import { crearCanalResend, type ClienteResend } from "./resend.js"

export interface OpcionesCrearNotifier {
  log: {
    info: (obj: unknown, mensaje?: string) => void
    warn: (obj: unknown, mensaje?: string) => void
  }
  nodeEnv: "development" | "test" | "production"
  clienteResend?: ClienteResend
}

// DEC-13. Defensa doble contra un correo real fuera de prod (PA-10): además de que opcionesDeCorreo
// solo eligiera resend con NODE_ENV=production, crearNotifier también lo exige aquí.
export const crearNotifier = (
  opciones: OpcionesCorreo,
  { log, nodeEnv, clienteResend }: OpcionesCrearNotifier,
): Notifier => {
  if (opciones.canal === "resend") {
    if (nodeEnv !== "production") {
      throw new AppError(
        "CORREO_MAL_CONFIGURADO",
        "El canal resend solo puede construirse con NODE_ENV=production.",
        500,
      )
    }
    return crearCanalResend({
      apiKey: opciones.apiKey ?? "",
      remitente: opciones.remitente,
      urlPublicaFrontend: opciones.urlPublicaFrontend,
      ...(opciones.responderA ? { responderA: opciones.responderA } : {}),
      ...(clienteResend ? { cliente: clienteResend } : {}),
      log,
    })
  }

  return crearCanalRegistro({
    directorio: opciones.directorioRegistro,
    urlPublicaFrontend: opciones.urlPublicaFrontend,
    log,
  })
}
