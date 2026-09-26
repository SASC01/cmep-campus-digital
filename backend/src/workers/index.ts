import { trabajar, trabajarFallidos } from "../adapters/queue/index.js"
import {
  COLA_CORREO_DE_CUENTA,
  COLA_CORREO_DE_CUENTA_FALLIDO,
} from "../core/eventos/correo-de-cuenta.js"
import { procesarCorreoDeCuenta, type DependenciasCorreoDeCuenta } from "./correo-de-cuenta.js"

export interface ColasDeCorreoDeCuenta {
  correoDeCuenta: string
  fallidos: string
}

// Registra los dos consumidores. Las colas son un parámetro (N-06) para que la prueba del
// consumidor real use colas propias y no compita por los trabajos de otros archivos de prueba.
export const registrarConsumidores = async (
  deps: DependenciasCorreoDeCuenta,
  colas: ColasDeCorreoDeCuenta = {
    correoDeCuenta: COLA_CORREO_DE_CUENTA,
    fallidos: COLA_CORREO_DE_CUENTA_FALLIDO,
  },
): Promise<void> => {
  await trabajar(colas.correoDeCuenta, async ({ id, datos }) => {
    await procesarCorreoDeCuenta({ id, datos }, deps)
  })

  // Cumple RNF-09: el fallo queda registrado; la alerta sobre este evento es de DEPLOY. T-02:
  // trabajoId es el id del trabajo original (idOriginal/sourceId), no el de la copia de esta cola.
  await trabajarFallidos(colas.fallidos, async ({ id, idOriginal }) => {
    deps.log.error({ evento: "correo_de_cuenta_fallido", trabajoId: idOriginal ?? id })
  })
}
