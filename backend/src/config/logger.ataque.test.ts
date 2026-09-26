import { Writable } from "node:stream"

import { pino } from "pino"
import { describe, expect, it } from "vitest"

import { cargarEnv } from "./env.js"
import { opcionesDeLogger } from "./logger.js"

// Ataque del Tester (AUTH-02a, ronda 1) contra el redact del logger (API y worker usan las mismas
// opciones). El plan (tabla backend/config/, fila config/logger.ts) fija estas rutas nuevas:
// req.body.contrasenaActual, req.body.contrasenaNueva, req.body.token, contrasenaTemporal, token,
// enlace, *.contrasenaTemporal, *.token y *.enlace. En pino, "*.token" solo alcanza un nivel de
// anidación: la clave en la raíz del objeto de log necesita su propia ruta.

const capturar = (registrar: (log: pino.Logger) => void): string => {
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

describe("ataque: redact del logger (AUTH-02a)", () => {
  it("token, contrasenaTemporal y enlace en la raíz del objeto de log se censuran", () => {
    const salida = capturar((log) =>
      log.info({
        token: "secreto-token-raiz",
        contrasenaTemporal: "secreto-temporal-raiz",
        enlace: "http://127.0.0.1:5173/restablecer#token=secreto-enlace-raiz",
      }),
    )
    expect(salida.length).toBeGreaterThan(0)
    expect(salida).not.toContain("secreto-token-raiz")
    expect(salida).not.toContain("secreto-temporal-raiz")
    expect(salida).not.toContain("secreto-enlace-raiz")
  })

  it("las mismas claves un nivel abajo se censuran", () => {
    const salida = capturar((log) =>
      log.info({
        correo: {
          token: "secreto-token-anidado",
          contrasenaTemporal: "secreto-temporal-anidado",
          enlace: "secreto-enlace-anidado",
        },
      }),
    )
    expect(salida.length).toBeGreaterThan(0)
    expect(salida).not.toContain("secreto-token-anidado")
    expect(salida).not.toContain("secreto-temporal-anidado")
    expect(salida).not.toContain("secreto-enlace-anidado")
  })

  it("contrasenaActual, contrasenaNueva y token del cuerpo de la petición se censuran", () => {
    const salida = capturar((log) =>
      log.info({
        req: {
          body: {
            contrasenaActual: "secreto-actual",
            contrasenaNueva: "secreto-nueva",
            token: "secreto-token-cuerpo",
            contrasena: "secreto-contrasena",
          },
        },
      }),
    )
    expect(salida.length).toBeGreaterThan(0)
    for (const secreto of [
      "secreto-actual",
      "secreto-nueva",
      "secreto-token-cuerpo",
      "secreto-contrasena",
    ]) {
      expect(salida).not.toContain(secreto)
    }
  })
})
