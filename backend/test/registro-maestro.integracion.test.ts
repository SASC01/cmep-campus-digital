import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { construirApp } from "../src/app.js"
import { generarTokenDeEnlace } from "../src/adapters/auth/index.js"
import { obtenerDb } from "../src/adapters/db/cliente.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  consultarMe,
  correoDePrueba,
  valorCookieRefresco,
} from "./ayudas-auth.js"
import { conFilaRetenida } from "./ayudas-concurrencia.js"
import { crearTokenDePrueba, pedirComoAdmin } from "./ayudas-cuentas.js"

let app: FastifyInstance
const ids: string[] = []
const enlacesCreados: string[] = []
let tokenAdmin: string

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
  const email = process.env.ADMIN_EMAIL
  const contrasena = process.env.ADMIN_PASSWORD
  if (!email || !contrasena) {
    throw new Error("Faltan ADMIN_EMAIL/ADMIN_PASSWORD en el entorno de pruebas")
  }
  const sesion = await pedirComoAdmin(app, { email, contrasena })
  tokenAdmin = sesion.tokenAcceso
})

afterAll(async () => {
  await obtenerDb().usuario.deleteMany({ where: { enlaceRegistroId: { in: enlacesCreados } } })
  await obtenerDb().enlaceRegistro.deleteMany({ where: { id: { in: enlacesCreados } } })
  await borrarUsuariosDePrueba(ids)
  await app.close()
})

const crearEnlaceDePrueba = async ({
  expiraEn = new Date(Date.now() + 7 * 86_400_000),
  revocadoEn = null,
}: { expiraEn?: Date; revocadoEn?: Date | null } = {}): Promise<{ id: string; token: string }> => {
  const { token, hash } = generarTokenDeEnlace()
  const { id } = await obtenerDb().enlaceRegistro.create({
    data: { hashToken: hash, expiraEn, revocadoEn },
    select: { id: true },
  })
  enlacesCreados.push(id)
  return { id, token }
}

const registrar = (payload: Record<string, unknown>) =>
  app.inject({ method: "POST", url: "/api/auth/registro-maestro", payload })

describe("POST /api/auth/registro-maestro", () => {
  it("201 con cookie; la cuenta queda como maestro y con enlaceRegistroId", async () => {
    const { id: enlaceId, token } = await crearEnlaceDePrueba()
    const email = correoDePrueba("registro-maestro")

    const respuesta = await registrar({
      nombre: "Nuevo Maestro",
      email,
      contrasena: "contrasena-nueva-1234",
      token,
    })

    expect(respuesta.statusCode).toBe(201)
    const cookie = valorCookieRefresco(respuesta)
    expect(cookie).toBeDefined()

    const creado = await obtenerDb().usuario.findUnique({ where: { email } })
    if (!creado) throw new Error("no se creó la cuenta")
    ids.push(creado.id)
    expect(creado.rol).toBe("maestro")
    expect(creado.enlaceRegistroId).toBe(enlaceId)
  })

  it("rol: admin en el cuerpo → sigue siendo maestro", async () => {
    const { token } = await crearEnlaceDePrueba()
    const email = correoDePrueba("registro-maestro")

    const respuesta = await registrar({
      nombre: "Intento Admin",
      email,
      contrasena: "contrasena-nueva-1234",
      token,
      rol: "admin",
    })

    expect(respuesta.statusCode).toBe(201)
    const creado = await obtenerDb().usuario.findUnique({ where: { email } })
    if (!creado) throw new Error("no se creó la cuenta")
    ids.push(creado.id)
    expect(creado.rol).toBe("maestro")
  })

  it("enlace vencido → 400 ENLACE_INVALIDO", async () => {
    const { token } = await crearEnlaceDePrueba({ expiraEn: new Date(Date.now() - 1000) })
    const respuesta = await registrar({
      nombre: "Xx",
      email: correoDePrueba("registro-maestro"),
      contrasena: "contrasena-nueva-1234",
      token,
    })
    expect(respuesta.statusCode).toBe(400)
    expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe("ENLACE_INVALIDO")
  })

  it("enlace revocado → 400 ENLACE_INVALIDO", async () => {
    const { token } = await crearEnlaceDePrueba({ revocadoEn: new Date() })
    const respuesta = await registrar({
      nombre: "Xx",
      email: correoDePrueba("registro-maestro"),
      contrasena: "contrasena-nueva-1234",
      token,
    })
    expect(respuesta.statusCode).toBe(400)
  })

  it("enlace inexistente → 400 ENLACE_INVALIDO", async () => {
    const { token } = generarTokenDeEnlace()
    const respuesta = await registrar({
      nombre: "Xx",
      email: correoDePrueba("registro-maestro"),
      contrasena: "contrasena-nueva-1234",
      token,
    })
    expect(respuesta.statusCode).toBe(400)
  })

  it("un token de invitación de tokens_cuenta no vale como enlace de registro → 400", async () => {
    const email = correoDePrueba("registro-maestro")
    const { id } = await obtenerDb().usuario.create({
      data: {
        email,
        hashContrasena:
          "$argon2id$v=19$m=19456,t=2,p=1$aaaaaaaaaaaaaaaaaaaaaa$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        nombre: "Provisional",
        nombreBusqueda: "provisional",
        rol: "maestro",
      },
      select: { id: true },
    })
    ids.push(id)
    const { token } = await crearTokenDePrueba({
      usuarioId: id,
      tipo: "invitacion",
      expiraEn: new Date(Date.now() + 72 * 3_600_000),
    })

    const respuesta = await registrar({
      nombre: "Otro",
      email: correoDePrueba("registro-maestro"),
      contrasena: "contrasena-nueva-1234",
      token,
    })
    expect(respuesta.statusCode).toBe(400)
  })

  it("correo existente → 409 y nada creado", async () => {
    const { token: token1 } = await crearEnlaceDePrueba()
    const email = correoDePrueba("registro-maestro")
    await registrar({
      nombre: "Primero",
      email,
      contrasena: "contrasena-nueva-1234",
      token: token1,
    })
    const creado = await obtenerDb().usuario.findUnique({ where: { email } })
    if (creado) ids.push(creado.id)

    const { token: token2 } = await crearEnlaceDePrueba()
    const duplicado = await registrar({
      nombre: "Segundo",
      email,
      contrasena: "otra-contrasena-1234",
      token: token2,
    })
    expect(duplicado.statusCode).toBe(409)
    const total = await obtenerDb().usuario.count({ where: { email } })
    expect(total).toBe(1)
  })

  it("la cookie de la sesión creada refresca", async () => {
    const { token } = await crearEnlaceDePrueba()
    const email = correoDePrueba("registro-maestro")
    const respuesta = await registrar({
      nombre: "Refrescable",
      email,
      contrasena: "contrasena-nueva-1234",
      token,
    })
    const creado = await obtenerDb().usuario.findUnique({ where: { email } })
    if (!creado) throw new Error("no se creó la cuenta")
    ids.push(creado.id)
    const cookie = valorCookieRefresco(respuesta)
    if (!cookie) throw new Error("no se recibió la cookie de refresco")

    const refresco = await app.inject({
      method: "POST",
      url: "/api/auth/refrescar",
      cookies: { campus_refresco: cookie },
    })
    expect(refresco.statusCode).toBe(200)
  })

  it("/me responde como maestro", async () => {
    const { token } = await crearEnlaceDePrueba()
    const email = correoDePrueba("registro-maestro")
    const respuesta = await registrar({
      nombre: "Consultable",
      email,
      contrasena: "contrasena-nueva-1234",
      token,
    })
    const creado = await obtenerDb().usuario.findUnique({ where: { email } })
    if (!creado) throw new Error("no se creó la cuenta")
    ids.push(creado.id)
    const { tokenAcceso } = respuesta.json<{ tokenAcceso: string }>()
    const me = await consultarMe(app, tokenAcceso)
    expect(me.json<{ rol: string }>().rol).toBe("maestro")
  })

  it("carrera: la revocación gana → el registro que llega detrás nunca crea la cuenta ni 5xx", async () => {
    const { id: enlaceId, token } = await crearEnlaceDePrueba()
    const email = correoDePrueba("registro-maestro")

    const [revocacion, registro] = await conFilaRetenida(
      { tabla: "enlaces_registro", id: enlaceId },
      [
        () =>
          app.inject({
            method: "POST",
            url: `/api/admin/enlaces-registro/${enlaceId}/revocar`,
            headers: { authorization: `Bearer ${tokenAdmin}` },
          }),
        () => registrar({ nombre: "Carrera", email, contrasena: "contrasena-nueva-1234", token }),
      ],
    )

    expect(revocacion?.statusCode).not.toBeGreaterThanOrEqual(500)
    expect(registro?.statusCode).not.toBeGreaterThanOrEqual(500)
    expect(registro?.statusCode).toBe(400)
    const creado = await obtenerDb().usuario.findUnique({ where: { email } })
    expect(creado).toBeNull()
  })

  it("carrera: el registro gana → la revocación posterior no impide la cuenta ya creada", async () => {
    const { id: enlaceId, token } = await crearEnlaceDePrueba()
    const email = correoDePrueba("registro-maestro")

    const [registro, revocacion] = await conFilaRetenida(
      { tabla: "enlaces_registro", id: enlaceId },
      [
        () => registrar({ nombre: "Carrera", email, contrasena: "contrasena-nueva-1234", token }),
        () =>
          app.inject({
            method: "POST",
            url: `/api/admin/enlaces-registro/${enlaceId}/revocar`,
            headers: { authorization: `Bearer ${tokenAdmin}` },
          }),
      ],
    )

    expect(registro?.statusCode).not.toBeGreaterThanOrEqual(500)
    expect(revocacion?.statusCode).not.toBeGreaterThanOrEqual(500)
    expect(registro?.statusCode).toBe(201)
    const creado = await obtenerDb().usuario.findUnique({ where: { email } })
    if (creado) ids.push(creado.id)
    expect(creado).not.toBeNull()
  })
})
