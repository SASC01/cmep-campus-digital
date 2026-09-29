// AUTH-03c, §D-C3 y §D-C4: invitación masiva de maestros. Una sola transacción: bloqueo consultivo
// (dos lotes simultáneos quedan en serie), cupo diario, altas con createMany y un solo encolado de
// pg-boss con la conexión de la transacción. La transacción crea a los usuarios, así que el
// protocolo de bloqueo por usuario (adapters/README.md) no aplica.

import type { AppError } from "../../core/errores.js"
import {
  ejecutorSqlDe,
  enTransaccion,
  obtenerDb,
  type Ejecutor,
  type EjecutorSql,
} from "./cliente.js"
import type { NuevoUsuario } from "./usuarios.js"

// Constante bigint de uso único en el proyecto para el bloqueo consultivo de pg_advisory_xact_lock.
export const CLAVE_BLOQUEO_INVITACIONES_EN_LOTE = 837_465_291_003n

export interface CandidatoParaInvitarEnLote {
  usuario: NuevoUsuario & { id: string }
  token: { id: string; hashToken: string; expiraEn: Date }
}

export interface ResultadoInvitacionEnLote {
  // En el orden de la lista original, solo las que sí se insertaron en esta llamada.
  insertados: { id: string; email: string }[]
  // Correos que ya tenían cuenta antes de esta llamada, o que otra transacción creó entre la
  // lectura y la inserción (N-04 de AUTH-02: no se atrapa ningún P2002).
  existentes: string[]
}

export const invitarMaestrosEnLote = (
  { candidatos, desde }: { candidatos: CandidatoParaInvitarEnLote[]; desde: Date },
  evaluarCupoDelLote: (usadas: number, solicitadas: number) => AppError | null,
  alGuardar: (sql: EjecutorSql, idsDeTokens: string[]) => Promise<void>,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ResultadoInvitacionEnLote> =>
  enTransaccion(ejecutor, async (tx) => {
    // M-04: $executeRaw porque pg_advisory_xact_lock devuelve void, no una fila que $queryRaw
    // intentaría leer. Deja en serie dos lotes simultáneos: el segundo espera hasta que el primero
    // confirme o revierta.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CLAVE_BLOQUEO_INVITACIONES_EN_LOTE})`

    const usadas = await tx.tokenCuenta.count({
      where: { tipo: "invitacion", creadoEn: { gte: desde } },
    })

    const emails = candidatos.map((candidato) => candidato.usuario.email)
    const filasExistentes = await tx.usuario.findMany({
      where: { email: { in: emails } },
      select: { email: true },
    })
    const emailsYaExistentes = new Set(filasExistentes.map((fila) => fila.email))

    const nuevos = candidatos.filter(
      (candidato) => !emailsYaExistentes.has(candidato.usuario.email),
    )

    const errorDeCupo = evaluarCupoDelLote(usadas, nuevos.length)
    if (errorDeCupo) throw errorDeCupo

    if (nuevos.length === 0) {
      return { insertados: [], existentes: [...emailsYaExistentes] }
    }

    await tx.usuario.createMany({
      data: nuevos.map((candidato) => candidato.usuario),
      skipDuplicates: true,
    })

    const idsNuevos = nuevos.map((candidato) => candidato.usuario.id)
    const filasInsertadas = await tx.usuario.findMany({
      where: { id: { in: idsNuevos } },
      select: { id: true },
    })
    const idsInsertados = new Set(filasInsertadas.map((fila) => fila.id))

    const candidatosInsertados = nuevos.filter((candidato) =>
      idsInsertados.has(candidato.usuario.id),
    )
    // Un correo que otra transacción creó entre la lectura de arriba y este createMany no se
    // inserta (skipDuplicates) y se reporta como ya existente, sin atrapar ningún P2002.
    const candidatosNoInsertados = nuevos.filter(
      (candidato) => !idsInsertados.has(candidato.usuario.id),
    )

    if (candidatosInsertados.length > 0) {
      await tx.tokenCuenta.createMany({
        data: candidatosInsertados.map((candidato) => ({
          id: candidato.token.id,
          usuarioId: candidato.usuario.id,
          tipo: "invitacion",
          hashToken: candidato.token.hashToken,
          expiraEn: candidato.token.expiraEn,
        })),
      })
      await alGuardar(
        ejecutorSqlDe(tx),
        candidatosInsertados.map((candidato) => candidato.token.id),
      )
    }

    return {
      insertados: candidatosInsertados.map((candidato) => ({
        id: candidato.usuario.id,
        email: candidato.usuario.email,
      })),
      existentes: [
        ...emailsYaExistentes,
        ...candidatosNoInsertados.map((candidato) => candidato.usuario.email),
      ],
    }
  })
