import type { TipoTokenCuenta } from "../auth/tokens-cuenta.js"

// Puerto de salida de correo (DEC-13, regla 12): solo adapters/notifier lo implementa; solo el
// worker lo llama. Ningún handler ni middleware importa adapters/notifier (bloque de ESLint).
export interface CorreoDeCuenta {
  para: string
  nombre: string
  tipo: TipoTokenCuenta
  enlace: string
  // eventId del trabajo de pg-boss: también sirve como idempotencyKey de Resend (C-02).
  idempotencia: string
}

export type ResultadoEnvio =
  { estado: "enviado"; id: string } | { estado: "rechazado"; motivo: string }

export interface Notifier {
  correoDeCuenta(correo: CorreoDeCuenta): Promise<ResultadoEnvio>
}
