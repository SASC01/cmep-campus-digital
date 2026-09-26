import { randomUUID } from "node:crypto"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { derivarTokenDeCuenta, inicializarAuth } from "../src/adapters/auth/index.js"
import { cerrarConexion, inicializarDb } from "../src/adapters/db/cliente.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { cargarEnv } from "../src/config/env.js"
import { procesarCorreoDeCuenta } from "../src/workers/correo-de-cuenta.js"
import {
  borrarUsuariosDePrueba,
  correoDePrueba,
  crearUsuarioDePrueba,
  desactivarUsuarioDePrueba,
} from "./ayudas-auth.js"
import { crearTokenDePrueba, leerTokens, tokenDelEnlace } from "./ayudas-cuentas.js"
import { crearNotifierEnMemoria } from "./notifier-en-memoria.js"

const ids: string[] = []
const urlPublicaFrontend = "http://127.0.0.1:5173"
const logSilencioso = { info: () => undefined, warn: () => undefined, error: () => undefined }

beforeAll(async () => {
  const env = cargarEnv()
  inicializarDb({ connectionString: env.DATABASE_URL })
  await inicializarAuth(opcionesDeAuth(env))
})

afterAll(async () => {
  await borrarUsuariosDePrueba(ids)
  await cerrarConexion()
})

describe("procesarCorreoDeCuenta (recuperación)", () => {
  it("cuenta existente: un correo con /restablecer#token=, y ese token vale en restablecer", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const trabajoId = randomUUID()
    const notifier = crearNotifierEnMemoria()

    const resultado = await procesarCorreoDeCuenta(
      { id: trabajoId, datos: { tipo: "recuperacion", correo: usuario.email } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
    )

    expect(resultado).toBe("enviado")
    expect(notifier.enviados[0]?.enlace).toContain("/restablecer#token=")
    const token = tokenDelEnlace(notifier.enviados[0]?.enlace ?? "")
    expect(token).not.toBeNull()
    expect(token).toBe(derivarTokenDeCuenta(trabajoId).token)
  })

  it("correo inexistente → 0 correos y 0 tokens", async () => {
    const notifier = crearNotifierEnMemoria()
    const resultado = await procesarCorreoDeCuenta(
      { id: randomUUID(), datos: { tipo: "recuperacion", correo: correoDePrueba("no-existe") } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
    )
    expect(resultado).toBe("omitido")
    expect(notifier.enviados).toHaveLength(0)
  })

  it("cuenta admin → 0 (no se envía)", async () => {
    const email = process.env.ADMIN_EMAIL
    if (!email) throw new Error("Falta ADMIN_EMAIL")
    const notifier = crearNotifierEnMemoria()
    const resultado = await procesarCorreoDeCuenta(
      { id: randomUUID(), datos: { tipo: "recuperacion", correo: email } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
    )
    expect(resultado).toBe("omitido")
    expect(notifier.enviados).toHaveLength(0)
  })

  it("cuenta inactiva → 0", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    await desactivarUsuarioDePrueba(usuario.id)
    const notifier = crearNotifierEnMemoria()
    const resultado = await procesarCorreoDeCuenta(
      { id: randomUUID(), datos: { tipo: "recuperacion", correo: usuario.email } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
    )
    expect(resultado).toBe("omitido")
  })

  it("una cuarta solicitud en una hora → 0 (tope durable por cuenta)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const notifier = crearNotifierEnMemoria()
    for (let n = 0; n < 3; n += 1) {
      await procesarCorreoDeCuenta(
        { id: randomUUID(), datos: { tipo: "recuperacion", correo: usuario.email } },
        { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
      )
    }
    const cuarta = await procesarCorreoDeCuenta(
      { id: randomUUID(), datos: { tipo: "recuperacion", correo: usuario.email } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
    )
    expect(cuarta).toBe("omitido")
    expect(notifier.enviados).toHaveLength(3)
  })

  it("un reintento del mismo trabajo produce el mismo enlace y no crea un token nuevo", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const trabajoId = randomUUID()
    const notifier = crearNotifierEnMemoria()
    await procesarCorreoDeCuenta(
      { id: trabajoId, datos: { tipo: "recuperacion", correo: usuario.email } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
    )
    await procesarCorreoDeCuenta(
      { id: trabajoId, datos: { tipo: "recuperacion", correo: usuario.email } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
    )
    expect(notifier.enviados).toHaveLength(2)
    expect(notifier.enviados[0]?.enlace).toBe(notifier.enviados[1]?.enlace)
    const filas = await leerTokens(usuario.id)
    expect(filas).toHaveLength(1)
  })

  it("un trabajo viejo tras uno nuevo no envía (el viejo quedó revocado)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const notifier = crearNotifierEnMemoria()
    const trabajoViejo = randomUUID()
    await procesarCorreoDeCuenta(
      { id: trabajoViejo, datos: { tipo: "recuperacion", correo: usuario.email } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
    )
    await procesarCorreoDeCuenta(
      { id: randomUUID(), datos: { tipo: "recuperacion", correo: usuario.email } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
    )
    notifier.enviados.length = 0
    const resultado = await procesarCorreoDeCuenta(
      { id: trabajoViejo, datos: { tipo: "recuperacion", correo: usuario.email } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
    )
    expect(resultado).toBe("omitido")
    expect(notifier.enviados).toHaveLength(0)
  })
})

describe("procesarCorreoDeCuenta (invitación)", () => {
  it("invitación válida: un correo con /establecer-contrasena#token=", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { id: tokenId, token: tokenEsperado } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "invitacion",
      expiraEn: new Date(Date.now() + 60_000),
    })
    const notifier = crearNotifierEnMemoria()
    const resultado = await procesarCorreoDeCuenta(
      { id: tokenId, datos: { tipo: "invitacion" } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
    )
    expect(resultado).toBe("enviado")
    expect(notifier.enviados[0]?.enlace).toContain("/establecer-contrasena#token=")
    expect(tokenDelEnlace(notifier.enviados[0]?.enlace ?? "")).toBe(tokenEsperado)
  })

  it("invitación ya usada → no envía", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { id: tokenId } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "invitacion",
      expiraEn: new Date(Date.now() + 60_000),
      usadoEn: new Date(),
    })
    const notifier = crearNotifierEnMemoria()
    const resultado = await procesarCorreoDeCuenta(
      { id: tokenId, datos: { tipo: "invitacion" } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
    )
    expect(resultado).toBe("omitido")
  })
})

describe("procesarCorreoDeCuenta (fallos del notifier)", () => {
  it("un fallo transitorio del notifier se propaga (lanza)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const notifier = crearNotifierEnMemoria()
    notifier.fallarProximo(new Error("fallo transitorio simulado"))
    await expect(
      procesarCorreoDeCuenta(
        { id: randomUUID(), datos: { tipo: "recuperacion", correo: usuario.email } },
        { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
      ),
    ).rejects.toThrow("fallo transitorio simulado")
  })

  it("un rechazo permanente no lanza y devuelve 'rechazado'", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const notifier = crearNotifierEnMemoria()
    notifier.rechazarProximo("422 invalid_parameter")
    const resultado = await procesarCorreoDeCuenta(
      { id: randomUUID(), datos: { tipo: "recuperacion", correo: usuario.email } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
    )
    expect(resultado).toBe("rechazado")
  })

  it("dos prepararTokenDeRecuperacion concurrentes con el mismo id no fallan y dejan una sola fila viva (N-04)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const trabajoId = randomUUID()
    const notifierA = crearNotifierEnMemoria()
    const notifierB = crearNotifierEnMemoria()

    await Promise.all([
      procesarCorreoDeCuenta(
        { id: trabajoId, datos: { tipo: "recuperacion", correo: usuario.email } },
        { notifier: notifierA, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
      ),
      procesarCorreoDeCuenta(
        { id: trabajoId, datos: { tipo: "recuperacion", correo: usuario.email } },
        { notifier: notifierB, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
      ),
    ])

    const filas = await leerTokens(usuario.id)
    expect(filas).toHaveLength(1)
    expect(filas[0]?.revocadoEn).toBeNull()
  })
})
