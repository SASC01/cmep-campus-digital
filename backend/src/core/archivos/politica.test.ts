import { urlDelAlmacenSchema } from "@campus/shared"
import { describe, expect, it } from "vitest"

import {
  claveDeMaterial,
  coincideConLoDeclarado,
  disposicionDeContenido,
  esImagenConVistaPrevia,
  validarArchivoDeclarado,
  VIGENCIA_URL_FIRMADA_S,
} from "./politica.js"

const MB = 1024 * 1024

describe("validarArchivoDeclarado", () => {
  it("PR-D01a: acepta un tipo permitido con extensión coincidente; foto.png como application/pdf da error", () => {
    expect(
      validarArchivoDeclarado({ nombre: "guia.pdf", tipo: "application/pdf", tamano: 10 }),
    ).toBeNull()
    expect(
      validarArchivoDeclarado({ nombre: "foto.JPEG", tipo: "image/jpeg", tamano: 10 }),
    ).toBeNull()
    const error = validarArchivoDeclarado({
      nombre: "foto.png",
      tipo: "application/pdf",
      tamano: 10,
    })
    expect(error?.codigo).toBe("ARCHIVO_INVALIDO")
    expect(error?.estado).toBe(400)
    expect(
      validarArchivoDeclarado({ nombre: "sin-extension", tipo: "application/pdf", tamano: 10 })
        ?.codigo,
    ).toBe("ARCHIVO_INVALIDO")
    expect(
      validarArchivoDeclarado({ nombre: "x.exe", tipo: "application/x-msdownload", tamano: 10 })
        ?.codigo,
    ).toBe("ARCHIVO_INVALIDO")
    expect(
      validarArchivoDeclarado({ nombre: "x.pdf", tipo: "constructor", tamano: 10 })?.codigo,
    ).toBe("ARCHIVO_INVALIDO")
  })

  it("PR-D01b: el tamaño 0 y 25 MB + 1 dan error; 25 MB exactos es válido", () => {
    const base = { nombre: "a.pdf", tipo: "application/pdf" }
    expect(validarArchivoDeclarado({ ...base, tamano: 0 })?.codigo).toBe("ARCHIVO_INVALIDO")
    expect(validarArchivoDeclarado({ ...base, tamano: 25 * MB + 1 })?.codigo).toBe(
      "ARCHIVO_INVALIDO",
    )
    expect(validarArchivoDeclarado({ ...base, tamano: 25 * MB })).toBeNull()
    expect(validarArchivoDeclarado({ ...base, tamano: 1.5 })?.codigo).toBe("ARCHIVO_INVALIDO")
    expect(validarArchivoDeclarado({ ...base, tamano: -1 })?.codigo).toBe("ARCHIVO_INVALIDO")
  })

  it("PR-D01c: un nombre con /, \\ o un carácter de control da error", () => {
    const tipo = "application/pdf"
    const nombres = ["a/b.pdf", "a\\b.pdf", "a\nb.pdf", "a\u0000b.pdf", "a\u202Eb.pdf", ""]
    for (const nombre of nombres) {
      expect(validarArchivoDeclarado({ nombre, tipo, tamano: 5 })?.codigo).toBe("ARCHIVO_INVALIDO")
    }
    expect(
      validarArchivoDeclarado({ nombre: `${"a".repeat(256)}.pdf`, tipo, tamano: 5 })?.codigo,
    ).toBe("ARCHIVO_INVALIDO")
    expect(validarArchivoDeclarado({ nombre: "Guía de estudio ñ.pdf", tipo, tamano: 5 })).toBeNull()
  })
})

describe("claveDeMaterial", () => {
  it("PR-D01d: la clave materiales/{claseId}/{archivoId} no contiene el nombre", () => {
    const clave = claveDeMaterial("clase-1", "archivo-2")
    expect(clave).toBe("materiales/clase-1/archivo-2")
    expect(clave).not.toContain("guia")
  })
})

describe("disposicionDeContenido", () => {
  it("PR-D01e: con acentos, comillas, punto y coma y saltos da filename* en UTF-8 y una alternativa ASCII sin comillas ni saltos", () => {
    const valor = disposicionDeContenido('Guía "final"; año\r\n2.pdf', "attachment")
    expect(valor.startsWith("attachment; ")).toBe(true)
    expect(valor).toContain("filename*=UTF-8''Gu%C3%ADa%20%22final%22%3B%20a%C3%B1o%0D%0A2.pdf")
    const alternativa = /filename="([^"]*)"/.exec(valor)?.[1]
    expect(alternativa).toBeDefined()
    expect(alternativa).toMatch(/^[\x20-\x7E]+$/)
    expect(alternativa).not.toMatch(/["\r\n;\\]/)
    expect(valor).not.toMatch(/[\r\n]/)
    expect(disposicionDeContenido("a(b)*'.png", "inline")).toContain("a%28b%29%2A%27.png")
    expect(disposicionDeContenido("\uD800.pdf", "inline")).toContain("%EF%BF%BD.pdf")
  })
})

describe("esImagenConVistaPrevia", () => {
  it('PR-D01f: esImagenConVistaPrevia("image/svg+xml") es false y las cuatro imágenes son true', () => {
    expect(esImagenConVistaPrevia("image/svg+xml")).toBe(false)
    expect(esImagenConVistaPrevia("application/pdf")).toBe(false)
    for (const tipo of ["image/png", "image/jpeg", "image/webp", "image/gif"]) {
      expect(esImagenConVistaPrevia(tipo)).toBe(true)
    }
  })
})

describe("coincideConLoDeclarado", () => {
  it("PR-D01g: devuelve ok, falta y distinto", () => {
    const declarado = { tamano: 100, tipo: "image/png" }
    expect(coincideConLoDeclarado(declarado, { tamano: 100, tipo: "image/png" })).toBe("ok")
    expect(coincideConLoDeclarado(declarado, { tamano: 100, tipo: "Image/PNG; x=1" })).toBe("ok")
    expect(coincideConLoDeclarado(declarado, null)).toBe("falta")
    expect(coincideConLoDeclarado(declarado, { tamano: 101, tipo: "image/png" })).toBe("distinto")
    expect(coincideConLoDeclarado(declarado, { tamano: 100, tipo: "image/gif" })).toBe("distinto")
  })

  it("la vigencia de una URL firmada es de 300 segundos", () => {
    expect(VIGENCIA_URL_FIRMADA_S).toBe(300)
  })
})

describe("urlDelAlmacenSchema (T-39)", () => {
  it("PR-D17b: acepta http:// y https://, y rechaza javascript:, data:, vbscript:, file: y ftp:", () => {
    expect(
      urlDelAlmacenSchema.safeParse("http://127.0.0.1:9000/campus-privado/a?X=1").success,
    ).toBe(true)
    expect(urlDelAlmacenSchema.safeParse("https://almacen.ejemplo.mx/a").success).toBe(true)
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
      "ftp://almacen.ejemplo.mx/a",
      "/relativa/a",
      "",
    ]) {
      expect(urlDelAlmacenSchema.safeParse(url).success, url).toBe(false)
    }
  })
})

describe("un sustituto suelto en el nombre (T-42)", () => {
  it("PR-D20: validarArchivoDeclarado con un sustituto alto suelto y con uno bajo suelto da ARCHIVO_INVALIDO; un emoji (un par válido) se acepta", () => {
    const tipo = "application/pdf"
    // Los sustitutos se arman con códigos numéricos: no se escriben como literales.
    const alto = String.fromCharCode(0xd800)
    const bajo = String.fromCharCode(0xdc00)
    for (const nombre of [`${alto}.pdf`, `${bajo}.pdf`, `a${alto}b.pdf`, `a${bajo}b${alto}.pdf`]) {
      expect(validarArchivoDeclarado({ nombre, tipo, tamano: 5 })?.codigo, nombre).toBe(
        "ARCHIVO_INVALIDO",
      )
    }
    // Un par válido en orden inverso son dos sustitutos sueltos.
    expect(validarArchivoDeclarado({ nombre: `${bajo}${alto}.pdf`, tipo, tamano: 5 })?.codigo).toBe(
      "ARCHIVO_INVALIDO",
    )
    expect(validarArchivoDeclarado({ nombre: `${alto}${bajo}.pdf`, tipo, tamano: 5 })).toBeNull()
    expect(validarArchivoDeclarado({ nombre: "Examen 😀.pdf", tipo, tamano: 5 })).toBeNull()
  })
})
