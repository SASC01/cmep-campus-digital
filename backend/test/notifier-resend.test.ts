import { randomUUID } from "node:crypto"

import { describe, expect, it, vi } from "vitest"

import { crearCanalResend, type ClienteResend } from "../src/adapters/notifier/resend.js"
import type { CorreoDeCuenta } from "../src/core/correo/notifier.js"

const log = { warn: vi.fn() }

const correoDePrueba: CorreoDeCuenta = {
  para: "ana@ejemplo.mx",
  nombre: "Ana",
  tipo: "recuperacion",
  enlace: "http://127.0.0.1:5173/restablecer#token=abc",
  idempotencia: randomUUID(),
}

const clienteDoble = (
  respuesta: Awaited<ReturnType<ClienteResend["emails"]["send"]>>,
): { cliente: ClienteResend; send: ReturnType<typeof vi.fn> } => {
  const send = vi.fn().mockResolvedValue(respuesta)
  return { cliente: { emails: { send } }, send }
}

describe("crearCanalResend", () => {
  it("envía from, to, subject, html, text, replyTo e idempotencyKey", async () => {
    const { cliente, send } = clienteDoble({ data: { id: "re_1" }, error: null })
    const canal = crearCanalResend({
      apiKey: "re_algo",
      remitente: "CMEP Campus Digital <notificaciones@ejemplo.mx>",
      responderA: "soporte@ejemplo.mx",
      urlPublicaFrontend: "http://127.0.0.1:5173",
      cliente,
      log,
    })
    await canal.correoDeCuenta(correoDePrueba)

    expect(send).toHaveBeenCalledTimes(1)
    const [payload, opciones] = send.mock.calls[0] as [
      Record<string, unknown>,
      { idempotencyKey: string },
    ]
    expect(payload.from).toBe("CMEP Campus Digital <notificaciones@ejemplo.mx>")
    expect(payload.to).toBe("ana@ejemplo.mx")
    expect(typeof payload.subject).toBe("string")
    expect(typeof payload.html).toBe("string")
    expect(typeof payload.text).toBe("string")
    expect(payload.replyTo).toBe("soporte@ejemplo.mx")
    expect(opciones.idempotencyKey).toBe(correoDePrueba.idempotencia)
  })

  it("data.id → enviado", async () => {
    const { cliente } = clienteDoble({ data: { id: "re_2" }, error: null })
    const canal = crearCanalResend({
      apiKey: "re_algo",
      remitente: "a@ejemplo.mx",
      urlPublicaFrontend: "http://127.0.0.1:5173",
      cliente,
      log,
    })
    await expect(canal.correoDeCuenta(correoDePrueba)).resolves.toEqual({
      estado: "enviado",
      id: "re_2",
    })
  })

  it("422 → rechazado sin lanzar, con un motivo que no contiene la dirección", async () => {
    const { cliente } = clienteDoble({
      data: null,
      error: { name: "invalid_parameter", message: "detalle con ana@ejemplo.mx", statusCode: 422 },
    })
    const canal = crearCanalResend({
      apiKey: "re_algo",
      remitente: "a@ejemplo.mx",
      urlPublicaFrontend: "http://127.0.0.1:5173",
      cliente,
      log,
    })
    const resultado = await canal.correoDeCuenta(correoDePrueba)
    expect(resultado.estado).toBe("rechazado")
    if (resultado.estado !== "rechazado") return
    expect(resultado.motivo).not.toContain("ana@ejemplo.mx")
    expect(resultado.motivo).toContain("422")
  })

  it("429 → lanza (transitorio)", async () => {
    const { cliente } = clienteDoble({
      data: null,
      error: { name: "rate_limit_exceeded", message: "demasiadas peticiones", statusCode: 429 },
    })
    const canal = crearCanalResend({
      apiKey: "re_algo",
      remitente: "a@ejemplo.mx",
      urlPublicaFrontend: "http://127.0.0.1:5173",
      cliente,
      log,
    })
    await expect(canal.correoDeCuenta(correoDePrueba)).rejects.toMatchObject({
      codigo: "CORREO_NO_ENVIADO",
    })
  })

  it("error de red devuelto por el doble ({ statusCode: null }) → lanza", async () => {
    const { cliente } = clienteDoble({
      data: null,
      error: {
        name: "application_error",
        message: "no se pudo resolver la petición",
        statusCode: null,
      },
    })
    const canal = crearCanalResend({
      apiKey: "re_algo",
      remitente: "a@ejemplo.mx",
      urlPublicaFrontend: "http://127.0.0.1:5173",
      cliente,
      log,
    })
    await expect(canal.correoDeCuenta(correoDePrueba)).rejects.toMatchObject({
      codigo: "CORREO_NO_ENVIADO",
    })
  })

  it("llave vacía o en blanco → lanza sin que el doble reciba ninguna llamada", () => {
    const { cliente, send } = clienteDoble({ data: { id: "re_1" }, error: null })
    expect(() =>
      crearCanalResend({
        apiKey: "   ",
        remitente: "a@ejemplo.mx",
        urlPublicaFrontend: "http://127.0.0.1:5173",
        cliente,
        log,
      }),
    ).toThrow()
    expect(send).not.toHaveBeenCalled()
  })
})
