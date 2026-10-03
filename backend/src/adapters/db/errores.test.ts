import { describe, expect, it } from "vitest"

import { AppError } from "../../core/errores.js"
import { MENSAJE_SERVICIO_OCUPADO, traducirErrorDeTransaccion } from "./errores.js"
import { Prisma } from "./generated/client.js"

// Único lugar de las pruebas donde se puede construir un error de Prisma: ESLint prohíbe importar
// el cliente generado fuera de adapters/db.
const errorDePrisma = (code: string): Prisma.PrismaClientKnownRequestError =>
  new Prisma.PrismaClientKnownRequestError("mensaje de prueba", { code, clientVersion: "prueba" })

const capturar = (error: unknown): unknown => {
  try {
    traducirErrorDeTransaccion(error)
  } catch (lanzado) {
    return lanzado
  }
  throw new Error("Precondición: traducirErrorDeTransaccion debía lanzar")
}

describe("traducirErrorDeTransaccion (CHORE-02)", () => {
  it("un P2028 se lanza como AppError SERVICIO_OCUPADO 503 con el error original como cause", () => {
    const original = errorDePrisma("P2028")
    const lanzado = capturar(original)

    expect(lanzado).toBeInstanceOf(AppError)
    const error = lanzado as AppError
    expect(error.codigo).toBe("SERVICIO_OCUPADO")
    expect(error.estado).toBe(503)
    expect(error.message).toBe(MENSAJE_SERVICIO_OCUPADO)
    expect(error.cause).toBe(original)
  })

  it.each([
    ["un P2002", errorDePrisma("P2002")],
    ["un error conocido de otro código", errorDePrisma("P2025")],
    ["un Error común", new Error("común")],
    ["un AppError a propósito", new AppError("CUPO_DIARIO_INSUFICIENTE", "Sin cupo", 409)],
  ])("relanza el mismo objeto con %s", (_nombre, original) => {
    expect(capturar(original)).toBe(original)
  })
})
