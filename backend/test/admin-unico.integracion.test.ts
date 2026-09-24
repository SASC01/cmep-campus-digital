import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { hashContrasena, inicializarAuth } from "../src/adapters/auth/index.js"
import { cerrarConexion, inicializarDb, obtenerDb } from "../src/adapters/db/cliente.js"
import { buscarAdmin, crearUsuario, type NuevoUsuario } from "../src/adapters/db/index.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { cargarEnv } from "../src/config/env.js"
import { correoDePrueba } from "./ayudas-auth.js"

// Índice único parcial de un solo admin (DEC-01 de AUTH-01). La base desechable de la corrida ya trae
// su único administrador (test/global-setup.ts lo crea con seed:admin), así que el segundo falla
// contra él y no hace falta la transacción revertida de AUTH-01 (CHORE-01, DEC-07).
let segundoAdmin: NuevoUsuario | undefined
let adminPrevio: { id: string; email: string } | null = null

beforeAll(async () => {
  const env = cargarEnv()
  inicializarDb({ connectionString: env.DATABASE_URL })
  await inicializarAuth(opcionesDeAuth(env))
  segundoAdmin = {
    nombre: "Admin de prueba",
    nombreBusqueda: "admin de prueba",
    email: correoDePrueba("admin"),
    hashContrasena: await hashContrasena("clave-de-prueba-1234"),
    rol: "admin",
  }
  adminPrevio = await buscarAdmin()
})

afterAll(async () => {
  await cerrarConexion()
})

describe("un solo administrador (usuarios_un_solo_admin_idx)", () => {
  it("con el administrador de la base ya creado, un segundo admin falla con 409 ADMIN_YA_EXISTE", async () => {
    if (!segundoAdmin) throw new Error("beforeAll no preparó los datos")
    // Precondición antes de insertar: sin un admin previo, el insert crearía el primero.
    expect(
      adminPrevio,
      "La base de pruebas no trae su administrador (test/global-setup.ts lo crea con seed:admin)",
    ).not.toBeNull()
    await expect(crearUsuario(segundoAdmin)).rejects.toMatchObject({
      codigo: "ADMIN_YA_EXISTE",
      estado: 409,
    })
  })

  it("el intento no deja filas: sigue habiendo un solo admin y es el mismo", async () => {
    if (!segundoAdmin) throw new Error("beforeAll no preparó los datos")
    expect(await obtenerDb().usuario.count({ where: { rol: "admin" } })).toBe(1)
    expect(await buscarAdmin()).toEqual(adminPrevio)
    expect(await obtenerDb().usuario.count({ where: { email: segundoAdmin.email } })).toBe(0)
  })
})
