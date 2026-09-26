import { contrasenaSchema } from "@campus/shared"
import { describe, expect, it } from "vitest"

import { ALFABETO_CONTRASENA_TEMPORAL, formatearContrasenaTemporal } from "./contrasena-temporal.js"

// 64 bytes válidos y distintos (todos < 248, cubren índices repartidos por el alfabeto).
const bytesValidos = (n: number, inicio = 0): Uint8Array =>
  Uint8Array.from({ length: n }, (_, i) => (inicio + i) % 200)

describe("formatearContrasenaTemporal", () => {
  it("tiene el formato xxxx-xxxx-xxxx", () => {
    const resultado = formatearContrasenaTemporal(bytesValidos(64))
    expect(resultado).toMatch(/^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/)
  })

  it("solo usa caracteres del alfabeto permitido", () => {
    const resultado = formatearContrasenaTemporal(bytesValidos(64, 7))
    const sinGuiones = resultado.replace(/-/g, "")
    for (const caracter of sinGuiones) {
      expect(ALFABETO_CONTRASENA_TEMPORAL).toContain(caracter)
    }
  })

  it("cumple contrasenaSchema (mínimo 10 caracteres)", () => {
    const resultado = formatearContrasenaTemporal(bytesValidos(64, 3))
    expect(() => contrasenaSchema.parse(resultado)).not.toThrow()
  })

  it("descarta bytes >= 248 sin sesgar el resultado", () => {
    // Un prefijo de bytes inválidos (248..255) no debe aparecer en el resultado ni contarse.
    const bytes = Uint8Array.from([
      ...[248, 249, 250, 251, 252, 253, 254, 255],
      ...bytesValidos(56, 1),
    ])
    const resultado = formatearContrasenaTemporal(bytes)
    expect(resultado).toHaveLength(14)
  })

  it("lanza si no hay suficientes bytes válidos", () => {
    const bytes = Uint8Array.from(Array.from({ length: 64 }, () => 250))
    expect(() => formatearContrasenaTemporal(bytes)).toThrow()
  })
})
