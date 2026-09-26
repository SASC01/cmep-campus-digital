import { Resend } from "resend"

import { construirUrlRecuperar } from "../../core/auth/enlaces.js"
import { clasificarFalloDeCorreo } from "../../core/correo/fallos.js"
import { plantillaCorreoDeCuenta } from "../../core/correo/plantillas.js"
import type { CorreoDeCuenta, Notifier, ResultadoEnvio } from "../../core/correo/notifier.js"
import { AppError } from "../../core/errores.js"

// Único importador de resend del proyecto (regla 1, DEC-13).

// Forma mínima de emails.send que este adaptador necesita: permite inyectar un doble en pruebas sin
// construir un cliente real (ninguna prueba llama a Resend).
export interface ClienteResend {
  emails: {
    send(
      payload: {
        from: string
        to: string
        subject: string
        html: string
        text: string
        replyTo?: string
      },
      options: { idempotencyKey: string },
    ): Promise<{
      data: { id: string } | null
      error: { name: string; message: string; statusCode: number | null } | null
    }>
  }
}

export interface OpcionesCanalResend {
  apiKey: string
  remitente: string
  responderA?: string
  urlPublicaFrontend: string
  cliente?: ClienteResend
  log: { warn: (obj: unknown, mensaje?: string) => void }
}

const errorDeCorreoNoEnviado = (): AppError =>
  new AppError("CORREO_NO_ENVIADO", "No se pudo enviar el correo. Se reintentará.", 502)

// Lanza con una llave vacía o en blanco, ANTES de construir o usar cualquier cliente (DEC-13):
// new Resend("") tomaría process.env.RESEND_API_KEY (index.mjs:1278-1280), y aquí la producción ya
// decidió el canal resend porque creía tener una llave.
export const crearCanalResend = ({
  apiKey,
  remitente,
  responderA,
  urlPublicaFrontend,
  cliente,
  log,
}: OpcionesCanalResend): Notifier => {
  if (apiKey.trim() === "") {
    throw new AppError(
      "CORREO_MAL_CONFIGURADO",
      "RESEND_API_KEY está vacía: no se puede construir el canal resend.",
      500,
    )
  }

  const clienteResend: ClienteResend = cliente ?? new Resend(apiKey)

  return {
    correoDeCuenta: async (correo: CorreoDeCuenta): Promise<ResultadoEnvio> => {
      const { asunto, html, texto } = plantillaCorreoDeCuenta({
        tipo: correo.tipo,
        nombre: correo.nombre,
        enlace: correo.enlace,
        urlRecuperar: construirUrlRecuperar(urlPublicaFrontend),
      })

      let resultado: Awaited<ReturnType<ClienteResend["emails"]["send"]>>
      try {
        resultado = await clienteResend.emails.send(
          {
            from: remitente,
            to: correo.para,
            subject: asunto,
            html,
            text: texto,
            ...(responderA ? { replyTo: responderA } : {}),
          },
          { idempotencyKey: correo.idempotencia },
        )
      } catch {
        // Único try/catch permitido en este archivo (DEC-13): traduce un error del proveedor
        // que llegara a lanzar en vez de devolverse como { error }.
        throw errorDeCorreoNoEnviado()
      }

      if (resultado.data) return { estado: "enviado", id: resultado.data.id }

      const estado = resultado.error?.statusCode ?? null
      const clasificacion = clasificarFalloDeCorreo({ estado })
      if (clasificacion === "permanente") {
        const motivo = `${String(estado)} ${resultado.error?.name ?? "desconocido"}`
        log.warn({ evento: "correo_rechazado", motivo })
        return { estado: "rechazado", motivo }
      }

      throw errorDeCorreoNoEnviado()
    },
  }
}
