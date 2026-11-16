import { describe, expect, it } from "vitest"

import { puedeBorrarParticipacion } from "../autoria.js"
import { efectoDeBorrarPrincipal } from "./participacion.js"

// FORO-01b (§D-11; DH-05, PB-1 a y PB-2 a). Quién borra una participación y qué le pasa a la entrega
// del alumno cuando se borra su principal.

describe("FORO-1A60: puedeBorrarParticipacion", () => {
  it("FORO-1A60: solo el admin borra; el maestro, el alumno autor y otro alumno, no (PB-1 a)", () => {
    expect(puedeBorrarParticipacion({ id: "admin", rol: "admin" })).toBe(true)
    expect(puedeBorrarParticipacion({ id: "maestra", rol: "maestro" })).toBe(false)
    // El autor no borra lo suyo por serlo: la función no mira al autor.
    expect(puedeBorrarParticipacion({ id: "autora", rol: "estudiante" })).toBe(false)
    expect(puedeBorrarParticipacion({ id: "otro", rol: "estudiante" })).toBe(false)
  })
})

describe("FORO-1A61: efectoDeBorrarPrincipal", () => {
  it("FORO-1A61: calificado conserva la calificación y entregado vuelve a sin participar (PB-2 a)", () => {
    expect(efectoDeBorrarPrincipal({ estado: "calificado" })).toBe("conservar")
    expect(efectoDeBorrarPrincipal({ estado: "entregado" })).toBe("volver-a-sin-participar")
  })

  it("FORO-1A61: asignado es inalcanzable (la transacción relee la principal después de bloquear la entrega) y lanza ERROR_INTERNO", () => {
    expect(() => efectoDeBorrarPrincipal({ estado: "asignado" })).toThrowError(
      expect.objectContaining({ codigo: "ERROR_INTERNO", estado: 500 }),
    )
  })
})
