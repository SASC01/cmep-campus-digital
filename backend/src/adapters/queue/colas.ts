import {
  COLA_CORREO_DE_CUENTA,
  COLA_CORREO_DE_CUENTA_FALLIDO,
} from "../../core/eventos/correo-de-cuenta.js"

// N-02: retención corta (1 día) en las dos colas de correos de cuenta, frente a los 14/7 días por
// defecto de pg-boss (QUEUE_DEFAULTS). Acota el crecimiento de pgboss.job ante un abuso de
// /auth/recuperar y el tiempo que el correo (dato personal, S-14) vive en la cola.
export const RETENCION_COLAS_DE_CORREO_S = 86_400

export interface OpcionDeCola {
  nombre: string
  opciones: {
    retryLimit?: number
    retryDelay?: number
    retryBackoff?: boolean
    expireInSeconds?: number
    deadLetter?: string
    retentionSeconds: number
    deleteAfterSeconds: number
  }
}

// La cola de fallidos va primero: createQueue exige que exista antes que CORREO_DE_CUENTA (su
// deadLetter). Sin reintentos ni deadLetter propio.
export const OPCIONES_DE_COLAS: readonly OpcionDeCola[] = [
  {
    nombre: COLA_CORREO_DE_CUENTA_FALLIDO,
    opciones: {
      retentionSeconds: RETENCION_COLAS_DE_CORREO_S,
      deleteAfterSeconds: RETENCION_COLAS_DE_CORREO_S,
    },
  },
  {
    nombre: COLA_CORREO_DE_CUENTA,
    opciones: {
      retryLimit: 3,
      retryDelay: 30,
      retryBackoff: true,
      expireInSeconds: 300,
      deadLetter: COLA_CORREO_DE_CUENTA_FALLIDO,
      retentionSeconds: RETENCION_COLAS_DE_CORREO_S,
      deleteAfterSeconds: RETENCION_COLAS_DE_CORREO_S,
    },
  },
]
