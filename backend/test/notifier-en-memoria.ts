import type { CorreoDeCuenta, Notifier } from "../src/core/correo/notifier.js"

export interface NotifierEnMemoria extends Notifier {
  enviados: CorreoDeCuenta[]
  fallarProximo(error: Error): void
  rechazarProximo(motivo: string): void
}

// Doble de Notifier para las pruebas de integración: registra lo que se habría enviado, sin llamar
// nunca a Resend (AGENTS.md > Pruebas). fallarProximo simula un fallo transitorio (lanza, como haría
// crearCanalResend con un 403/429/500/null); rechazarProximo simula un rechazo permanente (400/422).
// Cada llamada encola un evento: con retryLimit: 1, dos fallarProximo consecutivos agotan los
// reintentos (intento inicial + 1 reintento, ambos fallidos).
export const crearNotifierEnMemoria = (): NotifierEnMemoria => {
  const enviados: CorreoDeCuenta[] = []
  const pendientes: ({ tipo: "error"; error: Error } | { tipo: "rechazo"; motivo: string })[] = []

  return {
    enviados,
    fallarProximo: (error) => {
      pendientes.push({ tipo: "error", error })
    },
    rechazarProximo: (motivo) => {
      pendientes.push({ tipo: "rechazo", motivo })
    },
    correoDeCuenta: async (correo) => {
      const siguiente = pendientes.shift()
      if (siguiente?.tipo === "error") throw siguiente.error
      if (siguiente?.tipo === "rechazo") return { estado: "rechazado", motivo: siguiente.motivo }
      enviados.push(correo)
      return { estado: "enviado", id: `en-memoria-${String(enviados.length)}` }
    },
  }
}
