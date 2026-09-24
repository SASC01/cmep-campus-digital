import { randomUUID } from "node:crypto"

import { enTransaccion, obtenerDb, type Ejecutor } from "./cliente.js"

export interface DatosDeSesion {
  usuarioId: string
  hashToken: string
  expiraEn: Date
  ip: string | null
  agente: string | null
}

export interface SesionEncontrada {
  id: string
  usuarioId: string
  expiraEn: Date
  revocadaEn: Date | null
  reemplazadaPor: string | null
  usuario: { activo: boolean }
}

export const crearSesion = (
  datos: DatosDeSesion,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<{ id: string }> => ejecutor.sesion.create({ data: datos, select: { id: true } })

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

// Rotación con orden fijo (DEC-04, M-06): (1) id nuevo pregenerado; (2) revocación condicional
// de la sesión actual marcando reemplazada_por; (3) si no afectó ninguna fila, otra petición ganó
// la carrera o la sesión ya estaba rotada: no se inserta nada y se devuelve null; (4) si afectó
// una, se inserta la sesión nueva con ese id. Todo en una transacción.
export const rotarSesion = (
  { sesionId, ahora, nueva }: { sesionId: string; ahora: Date; nueva: DatosDeSesion },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<{ id: string } | null> =>
  enTransaccion(ejecutor, async (tx) => {
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
export const revocarTodasLasSesiones = async (
  usuarioId: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<number> => {
  const { count } = await ejecutor.sesion.updateMany({
    where: { usuarioId, revocadaEn: null },
    data: { revocadaEn: new Date() },
  })
  return count
}
