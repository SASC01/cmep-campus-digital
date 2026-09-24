import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { hashContrasena, inicializarAuth } from "../src/adapters/auth/index.js"
import { cerrarConexion, inicializarDb, obtenerDb } from "../src/adapters/db/cliente.js"
import { crearUsuario, existeAdmin } from "../src/adapters/db/index.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { cargarEnv } from "../src/config/env.js"
import { correoDePrueba } from "./ayudas-auth.js"

// Ataque del Tester (AUTH-01, ronda 1): el índice parcial de un solo admin también debe impedir
// promover a admin una cuenta existente (UPDATE), no solo insertar un segundo admin. Todo dentro
// de una transacción que SIEMPRE se revierte (M-05): no toca al admin real ni deja filas.

class ReversionDeAtaque extends Error {
  constructor() {
    super("reversión deliberada del ataque")
    this.name = "ReversionDeAtaque"
  }
}

let hash = ""
let habiaAdmin = false

beforeAll(async () => {
  const env = cargarEnv()
  inicializarDb({ connectionString: env.DATABASE_URL })
  await inicializarAuth(opcionesDeAuth(env))
  hash = await hashContrasena("clave-de-prueba-1234")
  habiaAdmin = await existeAdmin()
})

afterAll(async () => {
  await cerrarConexion()
})

describe("ataque: un solo administrador", () => {
  it("promover un estudiante a admin con UPDATE choca con usuarios_un_solo_admin_idx", async () => {
    const correoAdmin = correoDePrueba("ataque-admin")
    const correoPromovido = correoDePrueba("ataque-promovido")
    const resultado = await obtenerDb()
      .$transaction(async (tx) => {
        if (!(await existeAdmin(tx))) {
          await crearUsuario(
            {
              nombre: "Admin Ataque",
              nombreBusqueda: "admin ataque",
              email: correoAdmin,
              hashContrasena: hash,
              rol: "admin",
            },
            tx,
          )
        }
        const { id } = await crearUsuario(
          {
            nombre: "Estudiante Ataque",
            nombreBusqueda: "estudiante ataque",
            email: correoPromovido,
            hashContrasena: hash,
            rol: "estudiante",
          },
          tx,
        )
        await tx.usuario.update({ where: { id }, data: { rol: "admin" }, select: { id: true } })
        throw new ReversionDeAtaque()
      })
      .then(
        () => "sin error",
        (error: unknown) => (error instanceof ReversionDeAtaque ? "promovido" : "rechazado"),
      )

    expect(resultado).toBe("rechazado")
    expect(await existeAdmin()).toBe(habiaAdmin)
    // Solo las filas de esta prueba: otros archivos corren en paralelo con sus propias filas.
    expect(
      await obtenerDb().usuario.count({ where: { email: { in: [correoAdmin, correoPromovido] } } }),
    ).toBe(0)
  })
})
