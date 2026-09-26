import type { Prisma } from "./generated/client.js"

// Protocolo de bloqueo por usuario (AUTH-02, Enmienda 2; reglas completas en adapters/README.md).
// Toda transacción que cree, rote o revoque sesiones, cambie la contraseña o escriba tokens_cuenta
// de un usuario existente bloquea primero su fila de usuarios con una de estas dos funciones.
export interface UsuarioBloqueado {
  hashContrasena: string
  activo: boolean
}

// Escritores: FOR NO KEY UPDATE.
export const bloquearUsuarioParaEscribir = async (
  tx: Prisma.TransactionClient,
  usuarioId: string,
): Promise<UsuarioBloqueado | null> => {
  const [fila] = await tx.$queryRaw<UsuarioBloqueado[]>`
    SELECT hash_contrasena AS "hashContrasena", activo
    FROM usuarios WHERE id = ${usuarioId}::uuid
    FOR NO KEY UPDATE`
  return fila ?? null
}

// Crear o rotar una sesión propia: FOR SHARE.
export const bloquearUsuarioParaSesion = async (
  tx: Prisma.TransactionClient,
  usuarioId: string,
): Promise<UsuarioBloqueado | null> => {
  const [fila] = await tx.$queryRaw<UsuarioBloqueado[]>`
    SELECT hash_contrasena AS "hashContrasena", activo
    FROM usuarios WHERE id = ${usuarioId}::uuid
    FOR SHARE`
  return fila ?? null
}
