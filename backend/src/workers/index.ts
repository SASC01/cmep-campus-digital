import { trabajar, trabajarFallidos } from "../adapters/queue/index.js"
import type { Notifier } from "../core/correo/notifier.js"
import { esperaAntesDelSiguiente } from "../core/correo/ritmo.js"
import {
  COLA_CORREO_DE_CUENTA,
  COLA_CORREO_DE_CUENTA_FALLIDO,
} from "../core/eventos/correo-de-cuenta.js"
import { procesarCorreoDeCuenta, type DependenciasCorreoDeCuenta } from "./correo-de-cuenta.js"

export interface ColasDeCorreoDeCuenta {
  correoDeCuenta: string
  fallidos: string
}

// AUTH-03c, §D-C5: `esperar` es una inyección explícita para las pruebas; por defecto espera de
// verdad. `workers/correo-de-cuenta.ts` no cambia: el ritmo vive solo aquí, en el envoltorio del
// notifier que ve `registrarConsumidores`.
export interface DependenciasCorreoDeCuentaConRitmo extends DependenciasCorreoDeCuenta {
  esperar?: (ms: number) => Promise<void>
}

const esperarDeVerdad = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

// Registra los dos consumidores. Las colas son un parámetro (N-06) para que la prueba del
// consumidor real use colas propias y no compita por los trabajos de otros archivos de prueba.
export const registrarConsumidores = async (
  deps: DependenciasCorreoDeCuentaConRitmo,
  colas: ColasDeCorreoDeCuenta = {
    correoDeCuenta: COLA_CORREO_DE_CUENTA,
    fallidos: COLA_CORREO_DE_CUENTA_FALLIDO,
  },
): Promise<void> => {
  let ultimoIntentoMs: number | null = null
  const esperar = deps.esperar ?? esperarDeVerdad

  // M-09: cuenta para el ritmo todo intento que llegó al notifier, enviado, rechazado o lanzado.
  // El `finally` registra la marca de tiempo y no atrapa el error: sigue propagándose para que
  // pg-boss reintente. Un trabajo omitido nunca llama al notifier y por eso no cuenta.
  const notifierConRitmo: Notifier = {
    correoDeCuenta: async (correo) => {
      try {
        return await deps.notifier.correoDeCuenta(correo)
      } finally {
        ultimoIntentoMs = deps.reloj().getTime()
      }
    },
  }

  await trabajar(colas.correoDeCuenta, async ({ id, datos }) => {
    // M-06: la espera va antes de procesar el trabajo siguiente, nunca después de enviar: no
    // alarga la ventana de reenvío si el worker cae justo tras un envío exitoso.
    await esperar(esperaAntesDelSiguiente(ultimoIntentoMs, deps.reloj().getTime()))
    await procesarCorreoDeCuenta({ id, datos }, { ...deps, notifier: notifierConRitmo })
  })

  // Cumple RNF-09: el fallo queda registrado; la alerta sobre este evento es de DEPLOY. T-02:
  // trabajoId es el id del trabajo original (idOriginal/sourceId), no el de la copia de esta cola.
  await trabajarFallidos(colas.fallidos, async ({ id, idOriginal }) => {
    deps.log.error({ evento: "correo_de_cuenta_fallido", trabajoId: idOriginal ?? id })
  })
}
