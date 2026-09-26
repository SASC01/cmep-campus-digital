import { describe, expect, it } from "vitest"

import { crearNotifier } from "../adapters/notifier/index.js"
import { crearCanalResend, type ClienteResend } from "../adapters/notifier/resend.js"
import { opcionesDeCorreo, validarEnvCorreo, type OpcionesCorreo } from "./correo.js"

// Ataques del Tester (AUTH-02a, ronda 1) contra la configuración del correo: remitente de ejemplo
// en production (N-05), valores que se cuelan en los mensajes, y cualquier camino que construya el
// canal resend fuera de production (regla 12, PA-10). Ninguna prueba construye un cliente real.

const produccionValida = {
  RESEND_API_KEY: "re_llave_de_ataque_1234567890",
  CORREO_REMITENTE: "CMEP Campus Digital <avisos@colegio-ataque.mx>",
  URL_PUBLICA_FRONTEND: "https://campus.colegio-ataque.mx",
}

const silencioso = { info: () => undefined, warn: () => undefined }

const clienteEspia = () => {
  const llamadas: unknown[] = []
  const cliente: ClienteResend = {
    emails: {
      send: async (payload) => {
        llamadas.push(payload)
        return { data: { id: "espia" }, error: null }
      },
    },
  }
  return { cliente, llamadas }
}

describe("ataque: remitente de ejemplo en production (N-05)", () => {
  it.each([
    ["Notificaciones <NOTIFICACIONES@CAMPUS.LOCAL>"],
    ["   notificaciones@campus.local   "],
    ["<notificaciones@Campus.Local>"],
    ["CMEP Campus Digital <  notificaciones@campus.local  >"],
    ['"Soporte" <soporte@campus.local>'],
  ])("%s → rechazado sin repetir el valor", (remitente) => {
    const resultado = validarEnvCorreo(
      { ...produccionValida, CORREO_REMITENTE: remitente },
      "production",
    )
    expect(resultado.ok).toBe(false)
    if (resultado.ok) throw new Error("se aceptó el remitente de ejemplo")
    expect(resultado.errores.join("\n")).toContain("CORREO_REMITENTE")
    expect(resultado.errores.join("\n").toLowerCase()).not.toContain("campus.local")
  })

  it("sin CORREO_REMITENTE en production se rechaza (el valor por defecto es el de ejemplo)", () => {
    const resultado = validarEnvCorreo(
      {
        RESEND_API_KEY: produccionValida.RESEND_API_KEY,
        URL_PUBLICA_FRONTEND: produccionValida.URL_PUBLICA_FRONTEND,
      },
      "production",
    )
    expect(resultado.ok).toBe(false)
  })

  it("una llave hecha solo de espacios cuenta como ausente en production", () => {
    const resultado = validarEnvCorreo(
      { ...produccionValida, RESEND_API_KEY: "   \t " },
      "production",
    )
    expect(resultado.ok).toBe(false)
    if (resultado.ok) throw new Error("se aceptó una llave en blanco")
    expect(resultado.errores.join("\n")).toContain("RESEND_API_KEY")
  })

  it("ningún mensaje de error repite la llave, el remitente ni la URL", () => {
    const resultado = validarEnvCorreo(
      {
        RESEND_API_KEY: "",
        CORREO_REMITENTE: "x".repeat(300),
        CORREO_RESPONDER_A: "no-es-correo-secreto-xyz",
        URL_PUBLICA_FRONTEND: "javascript:alert('secreto-url')",
      },
      "production",
    )
    expect(resultado.ok).toBe(false)
    if (resultado.ok) throw new Error("se aceptó una configuración inválida")
    const texto = resultado.errores.join("\n")
    expect(texto).not.toContain("xxxxxxxxxx")
    expect(texto).not.toContain("secreto")
  })

  it("una URL javascript: o file: no se acepta ni fuera de production", () => {
    for (const url of ["javascript:alert(1)", "file:///etc/passwd", "ftp://campus.local"]) {
      const resultado = validarEnvCorreo({ URL_PUBLICA_FRONTEND: url }, "development")
      expect(resultado.ok, url).toBe(false)
    }
  })
})

describe("ataque: correo real fuera de production (regla 12, PA-10)", () => {
  it.each([["development"], ["test"]] as const)(
    "%s con llave y remitente propios → canal registro",
    (nodeEnv) => {
      const resultado = validarEnvCorreo(produccionValida, nodeEnv)
      expect(resultado.ok).toBe(true)
      if (!resultado.ok) throw new Error("configuración rechazada")
      expect(opcionesDeCorreo(nodeEnv, resultado.env).canal).toBe("registro")
    },
  )

  it.each([["development"], ["test"]] as const)(
    "crearNotifier con canal resend y NODE_ENV=%s lanza sin tocar el cliente",
    async (nodeEnv) => {
      const { cliente, llamadas } = clienteEspia()
      const opciones: OpcionesCorreo = {
        canal: "resend",
        remitente: produccionValida.CORREO_REMITENTE,
        apiKey: produccionValida.RESEND_API_KEY,
        urlPublicaFrontend: produccionValida.URL_PUBLICA_FRONTEND,
        directorioRegistro: "no-se-usa",
      }
      expect(() =>
        crearNotifier(opciones, { log: silencioso, nodeEnv, clienteResend: cliente }),
      ).toThrow()
      expect(llamadas).toHaveLength(0)
    },
  )

  it("crearNotifier en production con canal resend y apiKey ausente lanza sin tocar el cliente", () => {
    const { cliente, llamadas } = clienteEspia()
    const opciones: OpcionesCorreo = {
      canal: "resend",
      remitente: produccionValida.CORREO_REMITENTE,
      urlPublicaFrontend: produccionValida.URL_PUBLICA_FRONTEND,
      directorioRegistro: "no-se-usa",
    }
    expect(() =>
      crearNotifier(opciones, { log: silencioso, nodeEnv: "production", clienteResend: cliente }),
    ).toThrow()
    expect(llamadas).toHaveLength(0)
  })

  it("crearCanalResend con una llave de espacios y tabuladores lanza antes de usar el cliente", () => {
    const { cliente, llamadas } = clienteEspia()
    expect(() =>
      crearCanalResend({
        apiKey: " \t\n ",
        remitente: produccionValida.CORREO_REMITENTE,
        urlPublicaFrontend: produccionValida.URL_PUBLICA_FRONTEND,
        cliente,
        log: silencioso,
      }),
    ).toThrow()
    expect(llamadas).toHaveLength(0)
  })

  it("un rechazo 422 no deja la dirección, el enlace ni el mensaje del proveedor en el motivo", async () => {
    const avisos: unknown[] = []
    const cliente: ClienteResend = {
      emails: {
        send: async () => ({
          data: null,
          error: {
            name: "validation_error",
            message: "Invalid `to` field: victima@pruebas.local",
            statusCode: 422,
          },
        }),
      },
    }
    const canal = crearCanalResend({
      apiKey: "re_llave_de_ataque",
      remitente: produccionValida.CORREO_REMITENTE,
      urlPublicaFrontend: produccionValida.URL_PUBLICA_FRONTEND,
      cliente,
      log: { warn: (obj: unknown) => avisos.push(obj) },
    })
    const resultado = await canal.correoDeCuenta({
      para: "victima@pruebas.local",
      nombre: "Víctima",
      tipo: "recuperacion",
      enlace: "https://campus.colegio-ataque.mx/restablecer#token=secreto-del-enlace",
      idempotencia: "id-de-ataque",
    })
    expect(resultado.estado).toBe("rechazado")
    const texto = JSON.stringify([resultado, avisos])
    expect(texto).not.toContain("victima@")
    expect(texto).not.toContain("secreto-del-enlace")
    expect(texto).not.toContain("Invalid")
  })
})
