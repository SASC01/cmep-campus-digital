import {
  borrarTareaQuerySchema,
  CONFIRMAR_BORRADO_CON_ENTREGAS,
  enlaceDeEntregaSchema,
  entregarSchema,
  LONGITUD_MAXIMA_ENLACE,
  miEntregaSchema,
} from "@campus/shared"
import { describe, expect, it } from "vitest"

// ENTREGAS-01b (PR-1B04 y PR-1B28; O-1 de la Enmienda 2: los esquemas de shared/ se prueban aquí,
// porque shared/ no tiene corredor de pruebas).

const MENSAJE_ENLACE = "Escribe un enlace que empiece con https:// o http://."

const ids = (n: number): string[] =>
  Array.from({ length: n }, (_, i) => `${String(i).padStart(8, "a")}-1c1f-4b8e-9a1e-0f2a3b4c5d6e`)

const primerMensaje = (resultado: {
  success: boolean
  error?: { issues: { message: string }[] }
}) => resultado.error?.issues[0]?.message

describe("enlaceDeEntregaSchema (PR-1B04)", () => {
  it("PR-1B04: acepta http y https y devuelve URL.href (recortado y normalizado)", () => {
    expect(enlaceDeEntregaSchema.parse("https://ejemplo.com")).toBe("https://ejemplo.com/")
    expect(enlaceDeEntregaSchema.parse("  HTTP://Ejemplo.COM/Ruta?q=1  ")).toBe(
      "http://ejemplo.com/Ruta?q=1",
    )
    expect(enlaceDeEntregaSchema.parse("https://ejemplo.com/a b")).toBe("https://ejemplo.com/a%20b")
  })

  it("PR-1B04: rechaza javascript:, data:, file:, ftp:, sin protocolo, con usuario o contraseña, vacío, solo espacios y solo https://", () => {
    const rechazados = [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "data:text/html,hola",
      "file:///etc/passwd",
      "ftp://ejemplo.com/archivo",
      "ejemplo.com",
      "https://usuario:clave@ejemplo.com",
      "https://usuario@ejemplo.com",
      "https://:clave@ejemplo.com",
      "",
      "   ",
      "https://",
    ]
    for (const valor of rechazados) {
      const resultado = enlaceDeEntregaSchema.safeParse(valor)
      expect(resultado.success, JSON.stringify(valor)).toBe(false)
      expect(primerMensaje(resultado), JSON.stringify(valor)).toBe(MENSAJE_ENLACE)
    }
  })

  it("PR-1B04: 2048 caracteres se aceptan y 2049 se rechazan", () => {
    const base = "https://ejemplo.com/"
    const de2048 = base + "a".repeat(LONGITUD_MAXIMA_ENLACE - base.length)
    expect(de2048).toHaveLength(2048)
    expect(enlaceDeEntregaSchema.safeParse(de2048).success).toBe(true)
    const resultado = enlaceDeEntregaSchema.safeParse(`${de2048}a`)
    expect(resultado.success).toBe(false)
    expect(primerMensaje(resultado)).toBe(MENSAJE_ENLACE)
  })

  it("PR-1B04: un inversor de dirección o un carácter de control queda codificado en el href", () => {
    const conInversor = enlaceDeEntregaSchema.parse("https://ejemplo.com/fdp.‮exe")
    expect(conInversor).toBe("https://ejemplo.com/fdp.%E2%80%AEexe")
    expect(conInversor).not.toMatch(/‮/)
    const conControl = enlaceDeEntregaSchema.parse("https://ejemplo.com/a\u0007b")
    expect(conControl).toBe("https://ejemplo.com/a%07b")
  })

  it("PR-1B04: la respuesta vuelve a exigir http o https: un enlace javascript: guardado hace fallar el parse", () => {
    const base = {
      estado: "entregado",
      fechaEntrega: "2026-10-12T10:00:00.000Z",
      conRetraso: false,
      adjuntos: [],
      puedeEntregar: false,
      puedeAnular: true,
      calificacion: null,
    }
    expect(miEntregaSchema.safeParse({ ...base, enlaces: ["https://ejemplo.com/"] }).success).toBe(
      true,
    )
    expect(miEntregaSchema.safeParse({ ...base, enlaces: ["javascript:alert(1)"] }).success).toBe(
      false,
    )
  })
})

// T-01 (ronda 1 de 01b; N-02 del manager): el tope de 2048 se mide también sobre el enlace ya
// normalizado, que es el que se guarda y se devuelve.
describe("enlaceDeEntregaSchema mide el enlace normalizado (T-01)", () => {
  const PREFIJO = "https://ejemplo.mx/"
  // Cada ñ normalizada ocupa 6 caracteres (%C3%B1).
  const conEnes = (enes: number, aes: number): string =>
    `${PREFIJO}${"ñ".repeat(enes)}${"a".repeat(aes)}`

  it("T-01: un enlace crudo de 2048 caracteres que al normalizar pasa de 2048 se rechaza con el mensaje de enlaces (ñ, espacios e inversores)", () => {
    const resto = LONGITUD_MAXIMA_ENLACE - PREFIJO.length
    const crudos = [
      `${PREFIJO}${"ñ".repeat(resto)}`,
      `${PREFIJO}a${" ".repeat(resto - 2)}b`,
      `${PREFIJO}${"‮".repeat(resto)}`,
    ]
    for (const crudo of crudos) {
      expect(crudo).toHaveLength(2048)
      const resultado = enlaceDeEntregaSchema.safeParse(crudo)
      expect(resultado.success).toBe(false)
      expect(primerMensaje(resultado)).toBe(MENSAJE_ENLACE)
    }
  })

  it("T-01: un enlace crudo corto que normaliza a 2048 o menos se acepta y queda normalizado", () => {
    const corto = enlaceDeEntregaSchema.parse(conEnes(100, 0))
    expect(corto).toBe(`${PREFIJO}${"%C3%B1".repeat(100)}`)
    expect(corto.length).toBeLessThanOrEqual(LONGITUD_MAXIMA_ENLACE)
  })

  it("T-01: exactamente 2048 caracteres normalizados se aceptan y 2049 se rechazan", () => {
    // 19 del prefijo + 300 × 6 de las ñ + 229 a = 2048.
    const exacto = enlaceDeEntregaSchema.parse(conEnes(300, 229))
    expect(exacto).toHaveLength(2048)
    const resultado = enlaceDeEntregaSchema.safeParse(conEnes(300, 230))
    expect(resultado.success).toBe(false)
    expect(primerMensaje(resultado)).toBe(MENSAJE_ENLACE)
  })

  it("T-01: dentro de entregarSchema, el enlace que se alarga de más se rechaza en su posición", () => {
    const resultado = entregarSchema.safeParse({
      enlaces: ["https://ejemplo.com/", conEnes(300, 230)],
    })
    expect(resultado.success).toBe(false)
    expect(resultado.error?.issues[0]?.path).toEqual(["enlaces", 1])
    expect(primerMensaje(resultado)).toBe(MENSAJE_ENLACE)
  })
})

describe("entregarSchema (PR-1B04)", () => {
  it("PR-1B04: sin campos es una entrega vacía ({ archivoIds: [], enlaces: [] }) y los ids pasan a minúsculas", () => {
    expect(entregarSchema.parse({})).toEqual({ archivoIds: [], enlaces: [] })
    const [id] = ids(1)
    expect(entregarSchema.parse({ archivoIds: [id?.toUpperCase()] }).archivoIds).toEqual([id])
  })

  it("PR-1B04: rechaza 6 enlaces, 6 archivos, ids repetidos (también en mayúsculas) y llaves de más", () => {
    const seisEnlaces = entregarSchema.safeParse({
      enlaces: Array.from({ length: 6 }, (_, i) => `https://ejemplo.com/${String(i)}`),
    })
    expect(seisEnlaces.success).toBe(false)
    expect(primerMensaje(seisEnlaces)).toBe("Puedes agregar hasta 5 enlaces")

    const seisArchivos = entregarSchema.safeParse({ archivoIds: ids(6) })
    expect(seisArchivos.success).toBe(false)
    expect(primerMensaje(seisArchivos)).toBe("Puedes adjuntar hasta 5 archivos")

    const [id] = ids(1)
    if (id === undefined) throw new Error("Precondición: hay un id")
    for (const repetidos of [
      [id, id],
      [id, id.toUpperCase()],
    ]) {
      const resultado = entregarSchema.safeParse({ archivoIds: repetidos })
      expect(resultado.success).toBe(false)
      expect(primerMensaje(resultado)).toBe("No repitas un archivo adjunto")
    }

    expect(entregarSchema.safeParse({ enlaces: [], comentario: "x" }).success).toBe(false)
    expect(entregarSchema.safeParse({ version: 1 }).success).toBe(false)
  })

  it("PR-1B04: un enlace inválido dentro de la lista se rechaza con el mensaje del enlace y su posición", () => {
    const resultado = entregarSchema.safeParse({
      enlaces: ["https://ejemplo.com/", "javascript:alert(1)"],
    })
    expect(resultado.success).toBe(false)
    expect(resultado.error?.issues[0]?.path).toEqual(["enlaces", 1])
    expect(primerMensaje(resultado)).toBe(MENSAJE_ENLACE)
  })
})

describe("borrarTareaQuerySchema (PR-1B28)", () => {
  it("PR-1B28: acepta {} y { confirmar: 'entregas' }", () => {
    expect(CONFIRMAR_BORRADO_CON_ENTREGAS).toBe("entregas")
    expect(borrarTareaQuerySchema.parse({})).toEqual({})
    expect(borrarTareaQuerySchema.parse({ confirmar: "entregas" })).toEqual({
      confirmar: "entregas",
    })
  })

  it("PR-1B28: rechaza 'true', 'ENTREGAS', '', un arreglo y una llave de más", () => {
    for (const consulta of [
      { confirmar: "true" },
      { confirmar: "ENTREGAS" },
      { confirmar: "" },
      { confirmar: ["entregas", "entregas"] },
      { confirmarEntregas: "true" },
      { confirmar: "entregas", otra: "x" },
    ]) {
      expect(borrarTareaQuerySchema.safeParse(consulta).success, JSON.stringify(consulta)).toBe(
        false,
      )
    }
    expect(primerMensaje(borrarTareaQuerySchema.safeParse({ confirmar: "true" }))).toBe(
      "confirmar: no es válido",
    )
  })
})
