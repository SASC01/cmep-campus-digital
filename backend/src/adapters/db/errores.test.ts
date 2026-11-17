import { describe, expect, it } from "vitest"

import { AppError } from "../../core/errores.js"
import {
  MENSAJE_SERVICIO_OCUPADO,
  traducirErrorDeTransaccion,
  traducirErrorPrisma,
} from "./errores.js"
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

// FORO-01b (§D-11, FORO-1A69): alFaltarReferencia de traducirErrorPrisma.
describe("traducirErrorPrisma con alFaltarReferencia (FORO-1A69)", () => {
  const faltante = (): AppError =>
    new AppError("PARTICIPACION_NO_ENCONTRADA", "Esa participación ya no existe.", 404)
  const duplicado = (): AppError => new AppError("DUPLICADO", "Duplicado", 409)

  const lanzadoPor = (accion: () => unknown): unknown => {
    try {
      accion()
    } catch (lanzado) {
      return lanzado
    }
    throw new Error("Precondición: traducirErrorPrisma debía lanzar")
  }

  it("FORO-1A69: con la opción, un P2003 (llave foránea sin fila) se lanza como el AppError de alFaltarReferencia", () => {
    const lanzado = lanzadoPor(() =>
      traducirErrorPrisma(errorDePrisma("P2003"), {
        alDuplicar: duplicado,
        alFaltarReferencia: faltante,
      }),
    )
    expect(lanzado).toMatchObject({ codigo: "PARTICIPACION_NO_ENCONTRADA", estado: 404 })
  })

  it("FORO-1A69: con la opción, un error del driver adapter con el código 23503 de PostgreSQL también se traduce", () => {
    const original = new Prisma.PrismaClientKnownRequestError("fk", {
      code: "P2004",
      clientVersion: "prueba",
      meta: { driverAdapterError: { cause: { originalCode: "23503" } } },
    })
    const lanzado = lanzadoPor(() =>
      traducirErrorPrisma(original, { alDuplicar: duplicado, alFaltarReferencia: faltante }),
    )
    expect(lanzado).toMatchObject({ codigo: "PARTICIPACION_NO_ENCONTRADA" })
  })

  it("FORO-1A69: sin la opción, un P2003 se relanza tal cual, como hasta ahora", () => {
    const original = errorDePrisma("P2003")
    expect(lanzadoPor(() => traducirErrorPrisma(original, { alDuplicar: duplicado }))).toBe(
      original,
    )
  })

  it("FORO-1A69: con la opción, un P2002 sigue yendo a alDuplicar y otro código se relanza", () => {
    expect(
      lanzadoPor(() =>
        traducirErrorPrisma(errorDePrisma("P2002"), {
          alDuplicar: duplicado,
          alFaltarReferencia: faltante,
        }),
      ),
    ).toMatchObject({ codigo: "DUPLICADO" })
    const otro = errorDePrisma("P2025")
    expect(
      lanzadoPor(() =>
        traducirErrorPrisma(otro, { alDuplicar: duplicado, alFaltarReferencia: faltante }),
      ),
    ).toBe(otro)
  })
})
