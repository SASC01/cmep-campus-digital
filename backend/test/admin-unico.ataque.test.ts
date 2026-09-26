import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { hashContrasena, inicializarAuth } from "../src/adapters/auth/index.js"
import { cerrarConexion, inicializarDb, obtenerDb } from "../src/adapters/db/cliente.js"
import { crearUsuario, existeAdmin } from "../src/adapters/db/index.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { cargarEnv } from "../src/config/env.js"
import { correoDePrueba } from "./ayudas-auth.js"

// Ataque del Tester (AUTH-01, ronda 1; revisado en AUTH-02a, ronda 1): el índice parcial de un solo
// admin también debe impedir promover a admin una cuenta existente (UPDATE), no solo insertar un
// segundo admin. Desde CHORE-01 la base es desechable y global-setup crea el único admin con
// seed:admin: ya no hace falta la transacción revertida ni crear un admin propio. El admin de la base
// es una precondición: si falta, la prueba falla. El alumno propio se borra siempre.

let hash = ""

beforeAll(async () => {
  const env = cargarEnv()
  inicializarDb({ connectionString: env.DATABASE_URL })
  await inicializarAuth(opcionesDeAuth(env))
  hash = await hashContrasena("clave-de-prueba-1234")
})

afterAll(async () => {
  await cerrarConexion()
})

describe("ataque: un solo administrador", () => {
  it("promover un estudiante a admin con UPDATE choca con usuarios_un_solo_admin_idx", async () => {
    expect(await existeAdmin(), "la base desechable debe tener el admin de seed:admin").toBe(true)
    expect(await obtenerDb().usuario.count({ where: { rol: "admin" } })).toBe(1)

    const correoPromovido = correoDePrueba("ataque-promovido")
    const { id } = await crearUsuario({
      nombre: "Estudiante Ataque",
      nombreBusqueda: "estudiante ataque",
      email: correoPromovido,
      hashContrasena: hash,
      rol: "estudiante",
    })

    try {
      const resultado = await obtenerDb()
        .usuario.update({ where: { id }, data: { rol: "admin" }, select: { id: true } })
        .then(
          () => "promovido",
          // Solo cuenta como rechazo la violación de unicidad (P2002) del índice parcial.
          (error: unknown) =>
            typeof error === "object" && error !== null && "code" in error && error.code === "P2002"
              ? "rechazado"
              : `otro error: ${String(error)}`,
        )

      expect(resultado).toBe("rechazado")
      expect(await obtenerDb().usuario.count({ where: { rol: "admin" } })).toBe(1)
      const propio = await obtenerDb().usuario.findUnique({ where: { id }, select: { rol: true } })
      expect(propio?.rol).toBe("estudiante")
    } finally {
      await obtenerDb().usuario.deleteMany({ where: { id } })
    }
    expect(await obtenerDb().usuario.count({ where: { email: correoPromovido } })).toBe(0)
  })
})
