import type { TipoTokenCuenta } from "../../core/auth/tokens-cuenta.js"
import { bloquearUsuarioParaEscribir } from "./bloqueo-usuario.js"
import { enTransaccion, obtenerDb, type Ejecutor } from "./cliente.js"
import type { TipoTokenCuenta as TipoTokenCuentaDb } from "./generated/enums.js"

// Comprobación en compilación de que los valores del enum de core/ y los del enum generado por
// Prisma coinciden en ambos sentidos (como rolesCoinciden en usuarios.ts): si divergen, esta línea
// deja de compilar.
type Iguales<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const tiposDeTokenCoinciden: Iguales<TipoTokenCuenta, TipoTokenCuentaDb> = true
void tiposDeTokenCoinciden

export interface TokenParaUso {
  id: string
  usuarioId: string
  tipo: TipoTokenCuenta
  expiraEn: Date
  usadoEn: Date | null
  revocadoEn: Date | null
  usuario: { activo: boolean }
}

export interface TokenParaEnvio extends TokenParaUso {
  usuario: { activo: boolean; email: string; nombre: string }
}

const SELECT_PARA_USO = {
  id: true,
  usuarioId: true,
  tipo: true,
  expiraEn: true,
  usadoEn: true,
  revocadoEn: true,
  usuario: { select: { activo: true } },
} as const

export const buscarTokenPorHash = (
  hash: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<TokenParaUso | null> =>
  ejecutor.tokenCuenta.findUnique({ where: { hashToken: hash }, select: SELECT_PARA_USO })

export const buscarTokenParaEnvio = (
  id: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<TokenParaEnvio | null> =>
  ejecutor.tokenCuenta.findUnique({
    where: { id },
    select: {
      id: true,
      usuarioId: true,
      tipo: true,
      expiraEn: true,
      usadoEn: true,
      revocadoEn: true,
      usuario: { select: { activo: true, email: true, nombre: true } },
    },
  })

// T-01 (ronda 2) / Enmienda 2: las transacciones compuestas que tocan usuarios, tokens_cuenta y
// sesiones de un mismo usuario deben bloquear sus filas en un orden único: primero el usuario, con
// el bloqueo de escritura del protocolo (bloquearUsuarioParaEscribir, adapters/db/bloqueo-usuario.ts).
// Sin esto, dos consumos concurrentes de tokens distintos del mismo usuario bloquean en órdenes
// cruzados (uno su propio token y después el usuario; el otro, sus otros tokens tras ya tener el
// usuario) y PostgreSQL aborta una de las dos transacciones con un deadlock (500), en vez del 400
// tipado que exige DEC-08. El bloqueo de escritura no escribe nada: si el token resulta inválido
// (el perdedor de la carrera), la transacción no modificó ningún dato. La ronda 2 usaba aquí
// FOR UPDATE (una función privada bloquearUsuario); la Enmienda 2 lo baja a FOR NO KEY UPDATE
// porque chocaba con el KEY SHARE que pide rotarSesion al insertar la sesión nueva (T-07).

// DEC-08: consumo de un solo uso resistente a carreras. (0) bloqueo de escritura del protocolo
// sobre la fila del usuario (orden fijo, T-01/Enmienda 2); (1) updateMany marca usado_en solo si
// el token seguía vivo; (2) count === 0 → otra petición ganó, no se toca nada más; (3) count === 1
// → se guarda la contraseña, se revocan todas las sesiones y todos los demás tokens vivos.
export const usarTokenYCambiarContrasena = (
  {
    tokenId,
    usuarioId,
    hashContrasena,
    ahora,
  }: {
    tokenId: string
    usuarioId: string
    hashContrasena: string
    ahora: Date
  },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<boolean> =>
  enTransaccion(ejecutor, async (tx) => {
    await bloquearUsuarioParaEscribir(tx, usuarioId)
    const { count } = await tx.tokenCuenta.updateMany({
      where: { id: tokenId, usadoEn: null, revocadoEn: null, expiraEn: { gt: ahora } },
      data: { usadoEn: ahora },
    })
    if (count === 0) return false

    await tx.usuario.update({
      where: { id: usuarioId },
      data: { hashContrasena, debeCambiarContrasena: false },
      select: { id: true },
    })
    await tx.sesion.updateMany({
      where: { usuarioId, revocadaEn: null },
      data: { revocadaEn: ahora },
    })
    await tx.tokenCuenta.updateMany({
      where: { usuarioId, usadoEn: null, revocadoEn: null, id: { not: tokenId } },
      data: { revocadoEn: ahora },
    })
    return true
  })

// N-04: idempotente por id, sin try/catch dentro de la transacción. (0) bloqueo de escritura del
// protocolo sobre la fila del usuario (orden fijo, T-01/Enmienda 2): sin esto, esta revocación y
// las de usarTokenYCambiarContrasena pueden bloquear varias filas de tokens_cuenta en órdenes
// cruzados y producir un deadlock. (1)
// revoca los tokens de recuperación vivos del usuario con id distinto del de este trabajo (un
// reintento concurrente del mismo trabajo no revoca el token que otro intento acaba de insertar);
// (2) createMany con skipDuplicates no aborta si otro intento ya insertó la fila (ON CONFLICT DO
// NOTHING).
export const prepararTokenDeRecuperacion = (
  {
    id,
    usuarioId,
    hashToken,
    expiraEn,
    ahora,
  }: {
    id: string
    usuarioId: string
    hashToken: string
    expiraEn: Date
    ahora: Date
  },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<void> =>
  enTransaccion(ejecutor, async (tx) => {
    await bloquearUsuarioParaEscribir(tx, usuarioId)
    await tx.tokenCuenta.updateMany({
      where: {
        usuarioId,
        tipo: "recuperacion",
        id: { not: id },
        usadoEn: null,
        revocadoEn: null,
        expiraEn: { gt: ahora },
      },
      data: { revocadoEn: ahora },
    })
    await tx.tokenCuenta.createMany({
      data: [{ id, usuarioId, tipo: "recuperacion", hashToken, expiraEn }],
      skipDuplicates: true,
    })
  })

export const contarRecuperacionesRecientes = (
  usuarioId: string,
  desde: Date,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<number> =>
  ejecutor.tokenCuenta.count({
    where: { usuarioId, tipo: "recuperacion", creadoEn: { gte: desde } },
  })
