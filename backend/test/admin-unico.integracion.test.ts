import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { hashContrasena, inicializarAuth } from "../src/adapters/auth/index.js"
import { cerrarConexion, inicializarDb, obtenerDb } from "../src/adapters/db/cliente.js"
import { crearUsuario, existeAdmin } from "../src/adapters/db/index.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { cargarEnv } from "../src/config/env.js"
import { type NuevoUsuario } from "../src/adapters/db/usuarios.js"
import { correoDePrueba, DOMINIO_DE_PRUEBA } from "./ayudas-auth.js"

// Índice único parcial de un solo admin (DEC-01) demostrado por la vía de Prisma dentro de una
// transacción que SIEMPRE se revierte (M-05): determinista haya o no admin real y sin residuos.
class RollbackDePrueba extends Error {
  constructor() {
    super("reversión deliberada de la prueba")
    this.name = "RollbackDePrueba"
  }
}

let primerAdmin: NuevoUsuario | undefined
let segundoAdmin: NuevoUsuario | undefined
let habiaAdmin = false

const adminDePrueba = async (): Promise<NuevoUsuario> => ({
  nombre: "Admin de prueba",
  nombreBusqueda: "admin de prueba",
  email: correoDePrueba("admin"),
  hashContrasena: await hashContrasena("clave-de-prueba-1234"),
  rol: "admin",
})

beforeAll(async () => {
  const env = cargarEnv()
  inicializarDb({ connectionString: env.DATABASE_URL })
  await inicializarAuth(opcionesDeAuth(env))
  // Los hashes se calculan ANTES de abrir la transacción (timeout por defecto de 5 s).
  primerAdmin = await adminDePrueba()
  segundoAdmin = await adminDePrueba()
  habiaAdmin = await existeAdmin()
})

afterAll(async () => {
  await cerrarConexion()
})

describe("un solo administrador (usuarios_un_solo_admin_idx)", () => {
  it("un segundo admin falla con 409 ADMIN_YA_EXISTE dentro de una transacción revertida", async () => {
    if (!primerAdmin || !segundoAdmin) throw new Error("beforeAll no preparó los datos")
    const primero = primerAdmin
    const segundo = segundoAdmin

    await expect(
      obtenerDb().$transaction(async (tx) => {
        if (!(await existeAdmin(tx))) await crearUsuario(primero, tx)
        await crearUsuario(segundo, tx)
        throw new RollbackDePrueba()
      }),
    ).rejects.toMatchObject({ codigo: "ADMIN_YA_EXISTE", estado: 409 })
  })

  it("fuera de la transacción nada quedó insertado: existeAdmin() conserva su valor previo", async () => {
    expect(await existeAdmin()).toBe(habiaAdmin)
    const residuos = await obtenerDb().usuario.count({
      where: { rol: "admin", email: { endsWith: DOMINIO_DE_PRUEBA } },
    })
    expect(residuos).toBe(0)
  })
})
