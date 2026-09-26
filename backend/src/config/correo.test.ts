import { describe, expect, it } from "vitest"

import { opcionesDeCorreo, validarEnvCorreo } from "./correo.js"

const vacio = {}

const produccionCompleta = {
  RESEND_API_KEY: "re_algo",
  CORREO_REMITENTE: "CMEP Campus Digital <notificaciones@campusdigital.mx>",
  URL_PUBLICA_FRONTEND: "https://campus.ejemplo.mx",
}

describe("opcionesDeCorreo", () => {
  it("development sin llave → canal registro", () => {
    const resultado = validarEnvCorreo(vacio, "development")
    if (!resultado.ok) throw new Error("se esperaba una configuración válida")
    expect(opcionesDeCorreo("development", resultado.env).canal).toBe("registro")
  })

  it("development con llave → sigue en registro (defensa doble, PA-10)", () => {
    const resultado = validarEnvCorreo({ RESEND_API_KEY: "re_algo" }, "development")
    if (!resultado.ok) throw new Error("se esperaba una configuración válida")
    expect(opcionesDeCorreo("development", resultado.env).canal).toBe("registro")
  })

  it("test con llave → sigue en registro", () => {
    const resultado = validarEnvCorreo({ RESEND_API_KEY: "re_algo" }, "test")
    if (!resultado.ok) throw new Error("se esperaba una configuración válida")
    expect(opcionesDeCorreo("test", resultado.env).canal).toBe("registro")
  })

  it("production con todo → canal resend", () => {
    const resultado = validarEnvCorreo(produccionCompleta, "production")
    if (!resultado.ok) throw new Error("se esperaba una configuración válida")
    expect(opcionesDeCorreo("production", resultado.env).canal).toBe("resend")
  })
})

describe("validarEnvCorreo en production", () => {
  it("sin llave → error con el nombre de la variable", () => {
    const resultado = validarEnvCorreo({ ...produccionCompleta, RESEND_API_KEY: "" }, "production")
    expect(resultado.ok).toBe(false)
    if (resultado.ok) return
    expect(resultado.errores.some((error) => error.startsWith("RESEND_API_KEY"))).toBe(true)
  })

  it("sin remitente → error con el nombre de la variable", () => {
    const resultado = validarEnvCorreo(
      { ...produccionCompleta, CORREO_REMITENTE: "" },
      "production",
    )
    expect(resultado.ok).toBe(false)
    if (resultado.ok) return
    expect(resultado.errores.some((error) => error.startsWith("CORREO_REMITENTE"))).toBe(true)
  })

  it("con URL http → error con el nombre de la variable", () => {
    const resultado = validarEnvCorreo(
      { ...produccionCompleta, URL_PUBLICA_FRONTEND: "http://campus.ejemplo.mx" },
      "production",
    )
    expect(resultado.ok).toBe(false)
    if (resultado.ok) return
    expect(resultado.errores.some((error) => error.startsWith("URL_PUBLICA_FRONTEND"))).toBe(true)
  })

  it("ningún mensaje de error repite un valor de la configuración", () => {
    const resultado = validarEnvCorreo({ ...produccionCompleta, RESEND_API_KEY: "" }, "production")
    expect(resultado.ok).toBe(false)
    if (resultado.ok) return
    for (const error of resultado.errores) {
      expect(error).not.toContain(produccionCompleta.CORREO_REMITENTE)
    }
  })

  it("vacíos fuera de production son válidos (valores por defecto)", () => {
    const resultado = validarEnvCorreo(vacio, "development")
    expect(resultado.ok).toBe(true)
  })

  it("production con el remitente literal de .env.example → rechazado", () => {
    const resultado = validarEnvCorreo(
      {
        ...produccionCompleta,
        CORREO_REMITENTE: "CMEP Campus Digital <notificaciones@campus.local>",
      },
      "production",
    )
    expect(resultado.ok).toBe(false)
    if (resultado.ok) return
    expect(
      resultado.errores.some((error) =>
        error.startsWith("CORREO_REMITENTE: en production debe usar un dominio propio"),
      ),
    ).toBe(true)
  })

  it("production con variantes del dominio de ejemplo → rechazado", () => {
    const variantes = [
      "Notificaciones@CAMPUS.local",
      " notificaciones@campus.local ",
      "<notificaciones@campus.local>",
    ]
    for (const remitente of variantes) {
      const resultado = validarEnvCorreo(
        { ...produccionCompleta, CORREO_REMITENTE: remitente },
        "production",
      )
      expect(resultado.ok).toBe(false)
    }
  })
})
