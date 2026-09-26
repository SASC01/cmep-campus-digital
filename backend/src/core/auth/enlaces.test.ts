import { describe, expect, it } from "vitest"

import { construirEnlaceDeCuenta, construirUrlRecuperar } from "./enlaces.js"

describe("construirEnlaceDeCuenta", () => {
  it("recuperación: /restablecer con el fragmento #token=", () => {
    expect(
      construirEnlaceDeCuenta({
        urlBase: "http://127.0.0.1:5173",
        tipo: "recuperacion",
        token: "abc123",
      }),
    ).toBe("http://127.0.0.1:5173/restablecer#token=abc123")
  })

  it("invitación: /establecer-contrasena", () => {
    expect(
      construirEnlaceDeCuenta({
        urlBase: "http://127.0.0.1:5173",
        tipo: "invitacion",
        token: "xyz789",
      }),
    ).toBe("http://127.0.0.1:5173/establecer-contrasena#token=xyz789")
  })

  it("urlBase con barra final no duplica la barra", () => {
    expect(
      construirEnlaceDeCuenta({
        urlBase: "http://127.0.0.1:5173/",
        tipo: "recuperacion",
        token: "abc123",
      }),
    ).toBe("http://127.0.0.1:5173/restablecer#token=abc123")
  })
})

describe("construirUrlRecuperar", () => {
  it("construye /recuperar sin duplicar la barra", () => {
    expect(construirUrlRecuperar("http://127.0.0.1:5173/")).toBe("http://127.0.0.1:5173/recuperar")
  })
})
