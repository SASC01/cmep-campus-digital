import type { Rol } from "@campus/shared"

import type { PerfilAutenticado } from "../../core/auth/autorizacion.js"
import { AppError } from "../../core/errores.js"
import { enTransaccion, obtenerDb, type Ejecutor } from "./cliente.js"
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
export const actualizarContrasenaYRevocarSesiones = (
  id: string,
  hashContrasena: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<void> =>
  enTransaccion(ejecutor, async (tx) => {
    await tx.usuario.update({ where: { id }, data: { hashContrasena }, select: { id: true } })
    await tx.sesion.updateMany({
      where: { usuarioId: id, revocadaEn: null },
      data: { revocadaEn: new Date() },
    })
  })
