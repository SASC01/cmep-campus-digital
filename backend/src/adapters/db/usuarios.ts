import type { Rol } from "@campus/shared"

import type { PerfilAutenticado } from "../../core/auth/autorizacion.js"
import { AppError } from "../../core/errores.js"
import { bloquearUsuarioParaEscribir } from "./bloqueo-usuario.js"
import {
  ejecutorSqlDe,
  enTransaccion,
  obtenerDb,
  type Ejecutor,
  type EjecutorSql,
} from "./cliente.js"
import { traducirErrorPrisma } from "./errores.js"
import type { Rol as RolDb } from "./generated/enums.js"

// Comprobación en compilación de que los valores del enum de shared/ y los del enum de la base
// coinciden en ambos sentidos: si divergen, esta línea deja de compilar.
type Iguales<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const rolesCoinciden: Iguales<Rol, RolDb> = true
void rolesCoinciden

// Lo que withProfile lee en cada petición. Ni hashContrasena ni estadoPago (DEC-09, P-02).
const SELECT_PERFIL = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  activo: true,
  accesoRestringido: true,
  motivoRestriccion: true,
  debeCambiarContrasena: true,
} as const

export interface NuevoUsuario {
  nombre: string
  nombreBusqueda: string
  email: string
  hashContrasena: string
  rol: Rol
}

export interface NuevaSesionDeUsuario {
  hashToken: string
  expiraEn: Date
  ip: string | null
  agente: string | null
}

export interface CredencialesDeUsuario {
  id: string
  hashContrasena: string
  activo: boolean
}

// email único → CORREO_EN_USO. Cualquier otra unicidad en usuarios es el índice parcial de un solo
// admin (usuarios_un_solo_admin_idx), que Prisma no conoce → ADMIN_YA_EXISTE.
const errorDeDuplicado = (target: readonly string[]): AppError => {
  if (target.some((columna) => columna.includes("email"))) {
    return new AppError("CORREO_EN_USO", "Ya existe una cuenta con ese correo.", 409)
  }
  return new AppError("ADMIN_YA_EXISTE", "Ya existe una cuenta de administrador.", 409)
}

export const crearUsuario = async (
  usuario: NuevoUsuario,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<{ id: string }> => {
  try {
    return await ejecutor.usuario.create({ data: usuario, select: { id: true } })
  } catch (error) {
    return traducirErrorPrisma(error, { alDuplicar: errorDeDuplicado })
  }
}

// Registro (P-01): usuario y su primera sesión en la misma transacción.
export const crearUsuarioConSesion = (
  { usuario, sesion }: { usuario: NuevoUsuario; sesion: NuevaSesionDeUsuario },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<{ usuarioId: string; sesionId: string }> =>
  enTransaccion(ejecutor, async (tx) => {
    const { id: usuarioId } = await crearUsuario(usuario, tx)
    const { id: sesionId } = await tx.sesion.create({
      data: { usuarioId, ...sesion },
      select: { id: true },
    })
    return { usuarioId, sesionId }
  })

// Única consulta del backend que devuelve hashContrasena; solo la usa handlers/auth para login.
export const buscarCredencialesPorEmail = (
  email: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<CredencialesDeUsuario | null> =>
  ejecutor.usuario.findUnique({
    where: { email },
    select: { id: true, hashContrasena: true, activo: true },
  })

export const buscarPerfilPorId = (
  id: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<PerfilAutenticado | null> =>
  ejecutor.usuario.findUnique({ where: { id }, select: SELECT_PERFIL })

export const existeAdmin = async (ejecutor: Ejecutor = obtenerDb()): Promise<boolean> => {
  const admin = await ejecutor.usuario.findFirst({ where: { rol: "admin" }, select: { id: true } })
  return admin !== null
}

export const buscarAdmin = (
  ejecutor: Ejecutor = obtenerDb(),
): Promise<{ id: string; email: string } | null> =>
  ejecutor.usuario.findFirst({ where: { rol: "admin" }, select: { id: true, email: true } })

// reset:admin (S-10): cambia la contraseña y cierra las sesiones vivas, en una transacción.
// Enmienda 2: bloqueo de escritura del protocolo primero, por uniformidad y para poder auditarlo
// (T-08 ya se cierra por el FOR SHARE de rotarSesion, y T-09 por el cambio del login).
export const actualizarContrasenaYRevocarSesiones = (
  id: string,
  hashContrasena: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<void> =>
  enTransaccion(ejecutor, async (tx) => {
    await bloquearUsuarioParaEscribir(tx, id)
    await tx.usuario.update({ where: { id }, data: { hashContrasena }, select: { id: true } })
    await tx.sesion.updateMany({
      where: { usuarioId: id, revocadaEn: null },
      data: { revocadaEn: new Date() },
    })
  })

export interface UsuarioAdmin {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
}

const SELECT_USUARIO_ADMIN = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  activo: true,
} as const

export interface NuevoMaestroInvitado {
  usuario: {
    nombre: string
    nombreBusqueda: string
    email: string
    hashContrasena: string
    rol: Rol
  }
  token: { id: string; hashToken: string; expiraEn: Date }
}

// DEC-11: usuario + token de invitación + encolado, en una sola transacción (DEC-07). Un P2002
// (correo duplicado) se traduce y se relanza dentro de la transacción (E-02): Prisma revierte, como
// crearUsuario. alGuardar corre al final, con el ejecutor SQL de esta misma transacción: si lanza,
// también revierte.
export const crearMaestroInvitado = (
  { usuario, token }: NuevoMaestroInvitado,
  alGuardar: (sql: EjecutorSql) => Promise<void>,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<UsuarioAdmin> =>
  enTransaccion(ejecutor, async (tx) => {
    let creado: UsuarioAdmin
    try {
      creado = await tx.usuario.create({ data: usuario, select: SELECT_USUARIO_ADMIN })
    } catch (error) {
      return traducirErrorPrisma(error, { alDuplicar: errorDeDuplicado })
    }
    await tx.tokenCuenta.create({
      data: {
        id: token.id,
        usuarioId: creado.id,
        tipo: "invitacion",
        hashToken: token.hashToken,
        expiraEn: token.expiraEn,
      },
      select: { id: true },
    })
    await alGuardar(ejecutorSqlDe(tx))
    return creado
  })

export const buscarCuentaPorEmail = (
  email: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<UsuarioAdmin | null> =>
  ejecutor.usuario.findUnique({ where: { email }, select: SELECT_USUARIO_ADMIN })

export const buscarCuentaPorId = (
  id: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<UsuarioAdmin | null> =>
  ejecutor.usuario.findUnique({ where: { id }, select: SELECT_USUARIO_ADMIN })

export const buscarCredencialesPorId = (
  id: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<CredencialesDeUsuario | null> =>
  ejecutor.usuario.findUnique({
    where: { id },
    select: { id: true, hashContrasena: true, activo: true },
  })

// DEC-10: restablecimiento por el admin. Transacción: bloqueo de escritura del protocolo primero
// (Enmienda 2; null si el usuario no existe, entonces 404), hash nuevo, debe_cambiar_contrasena =
// true, revoca todas las sesiones y todos los tokens vivos.
export const restablecerConTemporal = (
  { id, hashContrasena, ahora }: { id: string; hashContrasena: string; ahora: Date },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<UsuarioAdmin | null> =>
  enTransaccion(ejecutor, async (tx) => {
    const usuario = await bloquearUsuarioParaEscribir(tx, id)
    if (usuario === null) return null
    const { count } = await tx.usuario.updateMany({
      where: { id },
      data: { hashContrasena, debeCambiarContrasena: true },
    })
    if (count === 0) return null
    await tx.sesion.updateMany({
      where: { usuarioId: id, revocadaEn: null },
      data: { revocadaEn: ahora },
    })
    await tx.tokenCuenta.updateMany({
      where: { usuarioId: id, usadoEn: null, revocadoEn: null },
      data: { revocadoEn: ahora },
    })
    return tx.usuario.findUnique({ where: { id }, select: SELECT_USUARIO_ADMIN })
  })

// DEC-10: corrección de correo por el admin. No revoca sesiones (S-06); revoca los tokens vivos
// del usuario (se enviaron a la dirección equivocada). Un P2002 se traduce y se relanza (E-02).
export const corregirCorreo = (
  { id, email, ahora }: { id: string; email: string; ahora: Date },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<UsuarioAdmin | null> =>
  enTransaccion(ejecutor, async (tx) => {
    const actualizar = async (): Promise<{ count: number }> => {
      try {
        return await tx.usuario.updateMany({ where: { id }, data: { email } })
      } catch (error) {
        return traducirErrorPrisma(error, { alDuplicar: errorDeDuplicado })
      }
    }
    const { count } = await actualizar()
    if (count === 0) return null
    await tx.tokenCuenta.updateMany({
      where: { usuarioId: id, usadoEn: null, revocadoEn: null },
      data: { revocadoEn: ahora },
    })
    return tx.usuario.findUnique({ where: { id }, select: SELECT_USUARIO_ADMIN })
  })

// DEC-09: cambio de contraseña propio (cambiar-contrasena). Enmienda 2: bloqueo de escritura del
// protocolo primero; si la cuenta no existe o el hash vigente ya no es el verificado por el
// handler (por ejemplo, el admin generó otra temporal entretanto), devuelve false sin escribir
// nada. Si coincide, conserva la sesión identificada por conservarSesionId (si existe, es del
// usuario y sigue viva); revoca las demás y todos los tokens vivos del usuario, y devuelve true.
export const cambiarContrasenaPropia = (
  {
    usuarioId,
    hashContrasena,
    hashVerificado,
    conservarSesionId,
    ahora,
  }: {
    usuarioId: string
    hashContrasena: string
    hashVerificado: string
    conservarSesionId: string | null
    ahora: Date
  },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<boolean> =>
  enTransaccion(ejecutor, async (tx) => {
    const usuario = await bloquearUsuarioParaEscribir(tx, usuarioId)
    if (usuario === null || usuario.hashContrasena !== hashVerificado) return false

    await tx.usuario.update({
      where: { id: usuarioId },
      data: { hashContrasena, debeCambiarContrasena: false },
      select: { id: true },
    })
    await tx.sesion.updateMany({
      where: {
        usuarioId,
        revocadaEn: null,
        ...(conservarSesionId === null ? {} : { id: { not: conservarSesionId } }),
      },
      data: { revocadaEn: ahora },
    })
    await tx.tokenCuenta.updateMany({
      where: { usuarioId, usadoEn: null, revocadoEn: null },
      data: { revocadoEn: ahora },
    })
    return true
  })
