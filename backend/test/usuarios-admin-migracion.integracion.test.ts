import { beforeAll, describe, expect, it } from "vitest"

import { inicializarDb, obtenerDb } from "../src/adapters/db/cliente.js"
import { cargarEnv } from "../src/config/env.js"

// ADMIN-01e (ADM-1E16): la migración admin_01_usuarios_y_movimientos. Los cuatro índices existen
// con su definición, y la búsqueda por parte del correo usa el GIN de trigramas (con enable_seqscan
// apagado solo en la transacción de la prueba, el plan no recorre usuarios entera).

beforeAll(() => {
  inicializarDb({ connectionString: cargarEnv().DATABASE_URL })
})

const definicionDe = async (nombre: string): Promise<string | undefined> => {
  const [fila] = await obtenerDb().$queryRaw<{ definicion: string }[]>`
    SELECT indexdef AS definicion FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = ${nombre}`
  return fila?.definicion
}

describe("migración admin_01_usuarios_y_movimientos (ADM-1E16)", () => {
  it("ADM-1E16: la migración está aplicada y los cuatro índices nuevos existen con su definición", async () => {
    const [aplicada] = await obtenerDb().$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM _prisma_migrations
      WHERE migration_name LIKE '%_admin_01_usuarios_y_movimientos' AND finished_at IS NOT NULL`
    expect(aplicada?.n).toBe(1)

    expect(await definicionDe("usuarios_email_idx")).toMatch(/USING gin \(email gin_trgm_ops\)/)
    expect(await definicionDe("usuarios_nombre_busqueda_id_idx")).toMatch(
      /USING btree \(nombre_busqueda, id\)/,
    )
    expect(await definicionDe("usuarios_rol_nombre_busqueda_id_idx")).toMatch(
      /USING btree \(rol, nombre_busqueda, id\)/,
    )
    expect(await definicionDe("movimientos_inscripcion_secuencia_idx")).toMatch(
      /USING btree \(secuencia DESC\)/,
    )
  })

  it("ADM-1E16: la búsqueda por parte del correo usa el índice GIN (EXPLAIN sin Seq Scan sobre usuarios con enable_seqscan = off)", async () => {
    const plan = await obtenerDb().$transaction(
      async (tx) => {
        await tx.$executeRaw`SET LOCAL enable_seqscan = off`
        return tx.$queryRaw<{ "QUERY PLAN": string }[]>`
          EXPLAIN SELECT id FROM usuarios
          WHERE nombre_busqueda LIKE '%' || ${"zqcorreo"} || '%'
             OR email LIKE '%' || ${"zqcorreo@"} || '%'`
      },
      { timeout: 10_000 },
    )
    const texto = plan.map((fila) => fila["QUERY PLAN"]).join("\n")
    expect(texto.length, "Precondición: EXPLAIN devolvió un plan").toBeGreaterThan(0)
    expect(texto).not.toMatch(/Seq Scan on usuarios/)
    expect(texto).toMatch(/usuarios_email_idx/)
  })
})
