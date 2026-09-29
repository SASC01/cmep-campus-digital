import { describe, expect, it } from "vitest"

import {
  analizarListaDeInvitaciones,
  evaluarCupo,
  nombreProvisionalDe,
  NOMBRE_PROVISIONAL_DE_RESPALDO,
} from "./invitacion-masiva.js"
import { nombreSchema } from "@campus/shared"

describe("analizarListaDeInvitaciones", () => {
  it("lista vacía → sin candidatos ni inválidas", () => {
    expect(analizarListaDeInvitaciones("")).toEqual({ candidatos: [], invalidas: [] })
  })

  it("solo líneas vacías → sin candidatos ni inválidas", () => {
    expect(analizarListaDeInvitaciones("\n\n   \n\t\n")).toEqual({
      candidatos: [],
      invalidas: [],
    })
  })

  it("CRLF entre líneas", () => {
    const analisis = analizarListaDeInvitaciones("ana@colegio.mx\r\nluis@colegio.mx")
    expect(analisis.candidatos).toEqual([
      { linea: 1, email: "ana@colegio.mx", nombre: null },
      { linea: 2, email: "luis@colegio.mx", nombre: null },
    ])
  })

  it("separador tabulador", () => {
    const analisis = analizarListaDeInvitaciones("ana@colegio.mx\tAna López")
    expect(analisis.candidatos).toEqual([
      { linea: 1, email: "ana@colegio.mx", nombre: "Ana López" },
    ])
  })

  it("separador punto y coma", () => {
    const analisis = analizarListaDeInvitaciones("ana@colegio.mx;Ana López")
    expect(analisis.candidatos).toEqual([
      { linea: 1, email: "ana@colegio.mx", nombre: "Ana López" },
    ])
  })

  it("separador coma", () => {
    const analisis = analizarListaDeInvitaciones("ana@colegio.mx,Ana López")
    expect(analisis.candidatos).toEqual([
      { linea: 1, email: "ana@colegio.mx", nombre: "Ana López" },
    ])
  })

  it("correo primero", () => {
    const analisis = analizarListaDeInvitaciones("juan@x.mx, Pérez, Juan")
    expect(analisis.candidatos).toEqual([{ linea: 1, email: "juan@x.mx", nombre: "Pérez, Juan" }])
  })

  it("correo último, con un nombre que trae comas", () => {
    const analisis = analizarListaDeInvitaciones("Pérez, Juan, juan@x.mx")
    expect(analisis.candidatos).toEqual([{ linea: 1, email: "juan@x.mx", nombre: "Pérez, Juan" }])
  })

  it("nombre vacío tras el separador → null", () => {
    const analisis = analizarListaDeInvitaciones("ana@colegio.mx,")
    expect(analisis.candidatos).toEqual([{ linea: 1, email: "ana@colegio.mx", nombre: null }])
  })

  it("correo inválido, sin separador → invalida", () => {
    const analisis = analizarListaDeInvitaciones("no-es-un-correo")
    expect(analisis.invalidas).toEqual([
      { linea: 1, texto: "no-es-un-correo", motivo: "correo_invalido" },
    ])
    expect(analisis.candidatos).toEqual([])
  })

  it("un nombre de 1 carácter → nombre_invalido", () => {
    const analisis = analizarListaDeInvitaciones("ana@colegio.mx,A")
    expect(analisis.invalidas).toEqual([
      { linea: 1, texto: "ana@colegio.mx,A", motivo: "nombre_invalido" },
    ])
  })

  it("un nombre con caracteres de control → nombre_invalido", () => {
    const analisis = analizarListaDeInvitaciones("ana@colegio.mx,Ana\u0000López")
    expect(analisis.invalidas).toEqual([
      { linea: 1, texto: "ana@colegio.mx,Ana\u0000López", motivo: "nombre_invalido" },
    ])
  })

  it("un nombre de 121 caracteres → nombre_invalido", () => {
    const nombreLargo = "A".repeat(121)
    const analisis = analizarListaDeInvitaciones(`ana@colegio.mx,${nombreLargo}`)
    expect(analisis.invalidas).toEqual([
      { linea: 1, texto: `ana@colegio.mx,${nombreLargo}`, motivo: "nombre_invalido" },
    ])
  })

  it("repetido con mayúsculas distintas → repetido", () => {
    const analisis = analizarListaDeInvitaciones("Ana@Colegio.mx\nana@colegio.mx")
    expect(analisis.candidatos).toEqual([{ linea: 1, email: "ana@colegio.mx", nombre: null }])
    expect(analisis.invalidas).toEqual([{ linea: 2, texto: "ana@colegio.mx", motivo: "repetido" }])
  })

  it("100 líneas → 100 candidatos", () => {
    const lineas = Array.from({ length: 100 }, (_, i) => `maestro${i}@colegio.mx`).join("\n")
    const analisis = analizarListaDeInvitaciones(lineas)
    expect(analisis.candidatos).toHaveLength(100)
    expect(analisis.invalidas).toHaveLength(0)
  })

  it("numeración cuenta también las líneas vacías intercaladas", () => {
    const analisis = analizarListaDeInvitaciones("ana@colegio.mx\n\nluis@colegio.mx")
    expect(analisis.candidatos).toEqual([
      { linea: 1, email: "ana@colegio.mx", nombre: null },
      { linea: 3, email: "luis@colegio.mx", nombre: null },
    ])
  })

  it("texto de más de 200 caracteres se recorta en la línea inválida", () => {
    const lineaLarga = "x".repeat(250)
    const analisis = analizarListaDeInvitaciones(lineaLarga)
    expect(analisis.invalidas).toEqual([
      { linea: 1, texto: "x".repeat(200), motivo: "correo_invalido" },
    ])
  })
})

describe("nombreProvisionalDe", () => {
  it("parte local de 1 carácter cae al correo completo", () => {
    expect(nombreProvisionalDe("a@colegio.mx")).toBe("a@colegio.mx")
  })

  it("parte local normal", () => {
    expect(nombreProvisionalDe("juan.perez@colegio.mx")).toBe("juan.perez")
  })

  it("parte local de 64 o más caracteres", () => {
    const parteLocal = "j".repeat(64)
    expect(nombreProvisionalDe(`${parteLocal}@colegio.mx`)).toBe(parteLocal)
  })

  // Zero-width space (U+200B, categoría Unicode Cf): CARACTERES_NO_PERMITIDOS_EN_NOMBRE lo rechaza
  // tanto en la parte local como en el correo completo, así que ninguno de los dos pasa
  // nombreSchema y el resultado cae al respaldo.
  const correoConSoloInvisibles = `${String.fromCodePoint(0x200b)}${String.fromCodePoint(0x200b)}@a.mx`

  it("ni la parte local ni el correo recortado pasan → respaldo", () => {
    expect(nombreProvisionalDe(correoConSoloInvisibles)).toBe(NOMBRE_PROVISIONAL_DE_RESPALDO)
  })

  it("el resultado siempre pasa nombreSchema y es igual a su data", () => {
    const casos = [
      "a@colegio.mx",
      "juan.perez@colegio.mx",
      `${"j".repeat(64)}@colegio.mx`,
      correoConSoloInvisibles,
    ]
    for (const email of casos) {
      const resultado = nombreProvisionalDe(email)
      const analizado = nombreSchema.safeParse(resultado)
      expect(analizado.success).toBe(true)
      expect(analizado.success && analizado.data).toBe(resultado)
    }
  })
})

describe("evaluarCupo", () => {
  it("solicitadas == restantes → pasa", () => {
    expect(evaluarCupo({ limite: 80, usadas: 70, solicitadas: 10 })).toBeNull()
  })

  it("solicitadas == restantes + 1 → 409 con N en el mensaje", () => {
    const error = evaluarCupo({ limite: 80, usadas: 70, solicitadas: 11 })
    expect(error).not.toBeNull()
    expect(error?.codigo).toBe("CUPO_DIARIO_INSUFICIENTE")
    expect(error?.estado).toBe(409)
    expect(error?.message).toContain("10")
  })

  it("usadas > limite → N = 0", () => {
    const error = evaluarCupo({ limite: 80, usadas: 90, solicitadas: 1 })
    expect(error).not.toBeNull()
    expect(error?.message).toContain("0")
  })

  it("restantes == 1 → singular exacto", () => {
    const error = evaluarCupo({ limite: 80, usadas: 79, solicitadas: 2 })
    expect(error).not.toBeNull()
    expect(error?.message).toBe(
      "Hoy solo puedes enviar 1 invitación más. Quita líneas de la lista o inténtalo mañana.",
    )
  })
})
