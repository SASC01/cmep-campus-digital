import { randomUUID } from "node:crypto"

import { bloquearUsuarioParaEscribir, bloquearUsuarioParaSesion } from "./bloqueo-usuario.js"
import { enTransaccion, obtenerDb, type Ejecutor } from "./cliente.js"

export interface DatosDeSesion {
  usuarioId: string
  hashToken: string
  expiraEn: Date
  ip: string | null
  agente: string | null
}

export interface DatosDeSesionConCredencial extends DatosDeSesion {
  // Hash que el handler verificó con argon2: la sesión solo nace si sigue siendo el vigente (T-09).
  hashVerificado: string
}

export interface SesionEncontrada {
  id: string
  usuarioId: string
  expiraEn: Date
  revocadaEn: Date | null
  reemplazadaPor: string | null
  usuario: { activo: boolean }
}

// Protocolo de bloqueo (Enmienda 2): FOR SHARE sobre el usuario y decisión bajo el bloqueo. null
// si la cuenta no existe, está inactiva o su contraseña cambió después de la verificación (T-09).
// La comparación no necesita tiempo constante: ninguno de los dos valores viene del cliente.
export const crearSesion = (
  { hashVerificado, ...datos }: DatosDeSesionConCredencial,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<{ id: string } | null> =>
  enTransaccion(ejecutor, async (tx) => {
    const usuario = await bloquearUsuarioParaSesion(tx, datos.usuarioId)
    if (usuario === null || !usuario.activo) return null
    if (usuario.hashContrasena !== hashVerificado) return null
    return tx.sesion.create({ data: datos, select: { id: true } })
  })

// Por hash_token (único) y con el activo del usuario (PK) para que refrescar corte a inactivos.
export const buscarSesionPorHash = (
  hashToken: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<SesionEncontrada | null> =>
  ejecutor.sesion.findUnique({
    where: { hashToken },
    select: {
      id: true,
      usuarioId: true,
      expiraEn: true,
      revocadaEn: true,
      reemplazadaPor: true,
      usuario: { select: { activo: true } },
    },
  })

// Rotación con orden fijo (DEC-04, M-06): (0) bloqueo de sesión del protocolo (Enmienda 2), en
// serie con las transacciones que revocan sesiones o cambian credenciales (T-08); (1) id nuevo
// pregenerado; (2) revocación condicional de la sesión actual marcando reemplazada_por; (3) si no
// afectó ninguna fila, otra petición ganó la carrera o la sesión ya estaba rotada: no se inserta
// nada y se devuelve null; (4) si afectó una, se inserta la sesión nueva con ese id. Todo en una
// transacción.
export const rotarSesion = (
  { sesionId, ahora, nueva }: { sesionId: string; ahora: Date; nueva: DatosDeSesion },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<{ id: string } | null> =>
  enTransaccion(ejecutor, async (tx) => {
    await bloquearUsuarioParaSesion(tx, nueva.usuarioId)
    const nuevoId = randomUUID()
    const { count } = await tx.sesion.updateMany({
      where: { id: sesionId, revocadaEn: null },
      data: { revocadaEn: ahora, reemplazadaPor: nuevoId },
    })
    if (count === 0) return null
    await tx.sesion.create({ data: { id: nuevoId, ...nueva }, select: { id: true } })
    return { id: nuevoId }
  })

export const revocarSesion = async (
  id: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<void> => {
  await ejecutor.sesion.updateMany({
    where: { id, revocadaEn: null },
    data: { revocadaEn: new Date() },
  })
}

export const revocarSesionPorHash = async (
  hashToken: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<void> => {
  await ejecutor.sesion.updateMany({
    where: { hashToken, revocadaEn: null },
    data: { revocadaEn: new Date() },
  })
}

// Reutilización de un token de refresco (P-04) y, en encargos posteriores, baja o restricción.
// Protocolo de bloqueo (Enmienda 2): bloqueo de escritura primero, en serie con las creaciones y
// rotaciones de sesión (T-08).
export const revocarTodasLasSesiones = (
  usuarioId: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<number> =>
  enTransaccion(ejecutor, async (tx) => {
    await bloquearUsuarioParaEscribir(tx, usuarioId)
    const { count } = await tx.sesion.updateMany({
      where: { usuarioId, revocadaEn: null },
      data: { revocadaEn: new Date() },
    })
    return count
  })
