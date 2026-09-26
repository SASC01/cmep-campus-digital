import type { Rol } from "@campus/shared"

import type { PoliticaIntentos } from "./intentos.js"

// Única fuente de la política (T-06): el límite en memoria por IP + correo de
// handlers/auth/cuentas.ts (`POST /auth/recuperar`) y el tope durable por cuenta del worker
// (contarRecuperacionesRecientes) usan esta misma constante, para que no puedan divergir.
export const POLITICA_SOLICITUDES_RECUPERACION: PoliticaIntentos = {
  maximo: 3,
  ventanaMs: 3_600_000,
}

export interface CuentaParaRecuperacion {
  rol: Rol
  activo: boolean
}

export type DecisionEnvioDeRecuperacion =
  | { enviar: true }
  | { enviar: false; motivo: "inexistente" | "inactiva" | "administrador" | "tope" }

// DEC-04: el admin no tiene recuperación pública (PRD §3). Los motivos son internos: el worker no
// responde nada al remitente (la API ya respondió 204 antes de que exista este trabajo).
export const decidirEnvioDeRecuperacion = ({
  cuenta,
  enviadasEnLaVentana,
}: {
  cuenta: CuentaParaRecuperacion | null
  enviadasEnLaVentana: number
}): DecisionEnvioDeRecuperacion => {
  if (cuenta === null) return { enviar: false, motivo: "inexistente" }
  if (!cuenta.activo) return { enviar: false, motivo: "inactiva" }
  if (cuenta.rol === "admin") return { enviar: false, motivo: "administrador" }
  if (enviadasEnLaVentana >= POLITICA_SOLICITUDES_RECUPERACION.maximo) {
    return { enviar: false, motivo: "tope" }
  }
  return { enviar: true }
}
