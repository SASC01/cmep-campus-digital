import { describe, expect, it } from "vitest"

import { escaparHtml, plantillaCorreoDeCuenta } from "./plantillas.js"

const base = {
  nombre: "Ana",
  enlace: "http://127.0.0.1:5173/restablecer#token=abc",
  urlRecuperar: "http://127.0.0.1:5173/recuperar",
}

describe("plantillaCorreoDeCuenta", () => {
  it("recuperación: asunto y '30 minutos' en el cuerpo", () => {
    const { asunto, html, texto } = plantillaCorreoDeCuenta({ tipo: "recuperacion", ...base })
    expect(asunto).toBe("Restablece tu contraseña de CMEP Campus Digital")
    expect(html).toContain("30 minutos")
    expect(texto).toContain("30 minutos")
  })

  it("invitación: '72 horas' y urlRecuperar en el cuerpo", () => {
    const { html } = plantillaCorreoDeCuenta({ tipo: "invitacion", ...base })
    expect(html).toContain("72 horas")
    expect(html).toContain(base.urlRecuperar)
  })

  it("el enlace aparece en el HTML y en el texto", () => {
    const { html, texto } = plantillaCorreoDeCuenta({ tipo: "recuperacion", ...base })
    expect(html).toContain(base.enlace)
    expect(texto).toContain(base.enlace)
  })

  it("nombre con <script> queda escapado en el HTML", () => {
    const { html } = plantillaCorreoDeCuenta({
      ...base,
      tipo: "recuperacion",
      nombre: "<script>alert(1)</script>",
    })
    expect(html).not.toContain("<script>alert(1)</script>")
    expect(html).toContain("&lt;script&gt;")
  })

  it("el texto plano no contiene etiquetas HTML", () => {
    const { texto } = plantillaCorreoDeCuenta({ tipo: "invitacion", ...base })
    expect(texto).not.toMatch(/<[a-z]/i)
  })

  it("ambos formatos llevan la firma 'CMEP Campus Digital'", () => {
    const { html, texto } = plantillaCorreoDeCuenta({ tipo: "recuperacion", ...base })
    expect(html).toContain("CMEP Campus Digital")
    expect(texto).toContain("CMEP Campus Digital")
  })
})

describe("escaparHtml", () => {
  it("escapa &, <, >, comillas", () => {
    expect(escaparHtml(`<a href="x">&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;",
    )
  })
})
