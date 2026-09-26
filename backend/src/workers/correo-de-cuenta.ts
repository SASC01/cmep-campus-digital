import { derivarTokenDeCuenta } from "../adapters/auth/index.js"
import {
  buscarCuentaPorEmail,
  buscarTokenParaEnvio,
  contarRecuperacionesRecientes,
  prepararTokenDeRecuperacion,
} from "../adapters/db/index.js"
import { construirEnlaceDeCuenta } from "../core/auth/enlaces.js"
import { calcularExpiracionToken, estaVivo } from "../core/auth/tokens-cuenta.js"
import { decidirEnvioDeRecuperacion } from "../core/auth/recuperacion.js"
import type { Notifier } from "../core/correo/notifier.js"
import { datosCorreoDeCuentaSchema } from "../core/eventos/correo-de-cuenta.js"

export interface DependenciasCorreoDeCuenta {
  notifier: Notifier
  urlPublicaFrontend: string
  reloj: () => Date
  log: {
    info: (obj: unknown, mensaje?: string) => void
    warn: (obj: unknown, mensaje?: string) => void
    error: (obj: unknown, mensaje?: string) => void
  }
}

export type ResultadoCorreoDeCuenta = "enviado" | "rechazado" | "omitido"

const UNA_HORA_MS = 3_600_000

// DEC-15. Nunca atrapa un fallo transitorio del notifier: lo deja propagar para que pg-boss
// reintente. Nunca registra el correo, el enlace ni el token del trabajo.
export const procesarCorreoDeCuenta = async (
  { id, datos }: { id: string; datos: unknown },
  deps: DependenciasCorreoDeCuenta,
): Promise<ResultadoCorreoDeCuenta> => {
  const analisis = datosCorreoDeCuentaSchema.safeParse(datos)
  if (!analisis.success) {
    deps.log.error({ evento: "correo_de_cuenta_invalido", trabajoId: id }, "Datos inválidos")
    return "omitido"
  }

  const ahora = deps.reloj()
  let registro = await buscarTokenParaEnvio(id)

  if (registro === null && analisis.data.tipo === "recuperacion") {
    const cuenta = await buscarCuentaPorEmail(analisis.data.correo)
    const enviadasEnLaVentana = cuenta
      ? await contarRecuperacionesRecientes(cuenta.id, new Date(ahora.getTime() - UNA_HORA_MS))
      : 0
    const decision = decidirEnvioDeRecuperacion({ cuenta, enviadasEnLaVentana })
    if (!decision.enviar || cuenta === null) {
      const motivo = decision.enviar ? "inexistente" : decision.motivo
      deps.log.info(
        { evento: "recuperacion_omitida", motivo, trabajoId: id },
        "Recuperación omitida",
      )
      return "omitido"
    }

    await prepararTokenDeRecuperacion({
      id,
      usuarioId: cuenta.id,
      hashToken: derivarTokenDeCuenta(id).hash,
      expiraEn: calcularExpiracionToken("recuperacion", ahora),
      ahora,
    })
    registro = await buscarTokenParaEnvio(id)
  }

  if (registro === null) {
    deps.log.error({ evento: "correo_de_cuenta_sin_registro", trabajoId: id }, "Sin registro")
    return "omitido"
  }

  if (
    registro.tipo !== analisis.data.tipo ||
    !estaVivo(registro, ahora) ||
    !registro.usuario.activo
  ) {
    return "omitido"
  }

  const enlace = construirEnlaceDeCuenta({
    urlBase: deps.urlPublicaFrontend,
    tipo: registro.tipo,
    token: derivarTokenDeCuenta(id).token,
  })

  const resultado = await deps.notifier.correoDeCuenta({
    para: registro.usuario.email,
    nombre: registro.usuario.nombre,
    tipo: registro.tipo,
    enlace,
    idempotencia: id,
  })

  if (resultado.estado === "rechazado") {
    deps.log.warn({ evento: "correo_rechazado", motivo: resultado.motivo, trabajoId: id })
    return "rechazado"
  }

  deps.log.info({
    evento: "correo_de_cuenta_enviado",
    tipo: registro.tipo,
    trabajoId: id,
    proveedorId: resultado.id,
  })
  return "enviado"
}
