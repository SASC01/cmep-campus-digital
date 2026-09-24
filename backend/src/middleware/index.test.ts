import type { FastifyRequest } from "fastify"
import { describe, expect, it } from "vitest"

import { esAppError } from "../core/errores.js"
import { perfilDe, protegido } from "./index.js"
import { requireMembership } from "./require-membership.js"
import { requireOwnership } from "./require-ownership.js"

const nombresDe = (opciones?: Parameters<typeof protegido>[0]) =>
  protegido(opciones).preHandler.map((paso) => paso.name)

describe("protegido", () => {
  it("compone la cadena en el orden fijo de ESSENTIALS (cinco pasos por defecto)", () => {
    expect(nombresDe()).toEqual([
      "authenticate",
      "withProfile",
      "withPasswordGate",
      "withAccess",
      "requireRole",
    ])
    expect(nombresDe({ roles: ["admin"], permitirRestringido: true })).toEqual([
      "authenticate",
      "withProfile",
      "withPasswordGate",
      "withAccess",
      "requireRole",
    ])
  })

  it("con pertenencia añade el sexto paso al final, y solo entonces", () => {
    expect(nombresDe({ pertenencia: "inscripcion" }).at(-1)).toBe("requireMembership")
    expect(nombresDe({ pertenencia: "inscripcion" })).toHaveLength(6)
    expect(nombresDe({ pertenencia: "propiedad" }).at(-1)).toBe("requireOwnership")
    expect(nombresDe({ pertenencia: "propiedad" })).toHaveLength(6)
  })
})

describe("requireMembership / requireOwnership", () => {
  it("lanzan 501 NO_IMPLEMENTADO hasta el módulo de clases", async () => {
    for (const paso of [requireMembership(), requireOwnership()]) {
      const error = await paso.call({} as never, {} as never, {} as never).then(
        () => undefined,
        (e: unknown) => e,
      )
      expect(esAppError(error)).toBe(true)
      if (!esAppError(error)) continue
      expect(error.codigo).toBe("NO_IMPLEMENTADO")
      expect(error.estado).toBe(501)
    }
  })
})

describe("perfilDe", () => {
  it("lanza 500 PERFIL_AUSENTE cuando la petición no pasó por la cadena", () => {
    let capturado: unknown
    try {
      perfilDe({ perfil: null } as FastifyRequest)
    } catch (error) {
      capturado = error
    }
    expect(esAppError(capturado)).toBe(true)
    if (!esAppError(capturado)) return
    expect(capturado.codigo).toBe("PERFIL_AUSENTE")
    expect(capturado.estado).toBe(500)
  })
})
