import { Writable } from "node:stream"

import { type Logger, pino } from "pino"
import { describe, expect, it } from "vitest"

import { cargarEnv } from "./env.js"
import { opcionesDeLogger } from "./logger.js"

// ADMIN-01e (ADM-1E22, M-09, §D-7.11): el serializador `req` de opcionesDeLogger corta la consulta
// de la URL, conserva el camino y tolera un objeto sin url ni method, sin devolver el cuerpo.

const capturar = (registrar: (log: Logger) => void): string => {
  let salida = ""
  const destino = new Writable({
    write(trozo: Buffer, _codificacion, listo) {
      salida += trozo.toString("utf8")
      listo()
    },
  })
  const log = pino({ ...opcionesDeLogger(cargarEnv()), level: "trace" }, destino)
  registrar(log)
  log.flush()
  return salida
}

describe("opcionesDeLogger: la petición sin la consulta (ADM-1E22)", () => {
  it('ADM-1E22: registrar { req: { method: "GET", url: "/a/b?x=1&y=2" } } deja "url":"/a/b" y el método', () => {
    const salida = capturar((log) => log.info({ req: { method: "GET", url: "/a/b?x=1&y=2" } }))
    expect(salida).toContain('"url":"/a/b"')
    expect(salida).toContain('"method":"GET"')
    expect(salida).not.toContain("x=1")
    expect(salida).not.toContain("?")
  })

  it("ADM-1E22: el camino completo, con sus ids, se conserva; una URL sin consulta no cambia", () => {
    const salida = capturar((log) =>
      log.info({ req: { method: "PUT", url: "/api/admin/usuarios/123e4567/nombre" } }),
    )
    expect(salida).toContain('"url":"/api/admin/usuarios/123e4567/nombre"')
  })

  it("ADM-1E22: un objeto { req: { body } } sin url ni method no lanza y no deja el cuerpo (secreto distintivo, N-26)", () => {
    let salida = ""
    expect(() => {
      salida = capturar((log) =>
        log.info({ req: { body: { contrasena: "secreto-cuerpo-1e22", nota: "otro-1e22" } } }),
      )
    }).not.toThrow()
    expect(salida.length).toBeGreaterThan(0)
    expect(salida).not.toContain("secreto-cuerpo-1e22")
    expect(salida).not.toContain("otro-1e22")
  })
})
