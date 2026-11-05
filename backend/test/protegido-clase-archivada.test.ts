import Fastify from "fastify"
import { describe, expect, it } from "vitest"

import { protegido, registrarMiddleware } from "../src/middleware/index.js"

// ADMIN-01a (§D-1): protegido() rechaza al construir una política de clase archivada que no tendría
// efecto o que abriría la clase a otro rol. Ninguna de estas pruebas toca la base.
describe("protegido() con enClaseArchivada (ADM-1A03)", () => {
  it("ADM-1A03: enClaseArchivada sin pertenencia lanza al construir, con cualquiera de las tres políticas", () => {
    for (const politica of ["lectura", "lectura-del-alumno", "gestion"] as const) {
      expect(() => protegido({ roles: ["admin"], enClaseArchivada: politica }), politica).toThrow(
        /enClaseArchivada exige pertenencia/,
      )
    }
  })

  it('ADM-1A03: "gestion" con roles ["admin", "maestro"], ["maestro"] o sin roles lanza al construir', () => {
    const casos = [
      { roles: ["admin", "maestro"] as const },
      { roles: ["maestro"] as const },
      { roles: ["maestro", "admin"] as const },
      {},
    ]
    for (const caso of casos) {
      expect(
        () => protegido({ ...caso, pertenencia: "propiedad", enClaseArchivada: "gestion" }),
        JSON.stringify(caso),
      ).toThrow(/exige roles exactamente \["admin"\]/)
    }
  })

  it('ADM-1A03: "gestion" con roles ["admin"] no lanza y arma los seis pasos', () => {
    const { preHandler } = protegido({
      roles: ["admin"],
      pertenencia: "propiedad",
      enClaseArchivada: "gestion",
    })
    expect(preHandler).toHaveLength(6)
  })

  it("ADM-1A03: una ruta con pertenencia y sin enClaseArchivada arranca (la guarda la acepta)", async () => {
    const app = Fastify({ logger: false })
    registrarMiddleware(app)
    app.get(
      "/api/clases/:claseId/prueba-adm-1a03",
      protegido({ roles: ["maestro"], pertenencia: "propiedad" }),
      async () => ({ ok: true }),
    )
    app.get(
      "/api/clases/:claseId/prueba-adm-1a03-lectura",
      protegido({
        roles: ["maestro", "admin"],
        pertenencia: "propiedad",
        enClaseArchivada: "lectura",
      }),
      async () => ({ ok: true }),
    )
    await expect(app.ready()).resolves.toBeDefined()
    expect(app.hasRoute({ method: "GET", url: "/api/clases/:claseId/prueba-adm-1a03" })).toBe(true)
    await app.close()
  })
})
