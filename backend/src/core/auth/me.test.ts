import { meRespuestaSchema } from "@campus/shared"
import { describe, expect, it } from "vitest"

import type { PerfilAutenticado } from "./autorizacion.js"
import { construirRespuestaMe } from "./me.js"

const perfil: PerfilAutenticado = {
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  email: "ana@ejemplo.mx",
  rol: "estudiante",
  activo: true,
  accesoRestringido: false,
  motivoRestriccion: null,
  debeCambiarContrasena: false,
}

describe("construirRespuestaMe", () => {
  it("devuelve exactamente los campos del contrato y cumple meRespuestaSchema", () => {
    const respuesta = construirRespuestaMe(perfil)

    expect(respuesta).toEqual({
      id: perfil.id,
      nombre: "Ana López",
      email: "ana@ejemplo.mx",
      rol: "estudiante",
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
    expect(Object.keys(respuesta).sort()).toEqual(
      ["accesoRestringido", "debeCambiarContrasena", "email", "id", "nombre", "rol"].sort(),
    )
    expect(meRespuestaSchema.safeParse(respuesta).success).toBe(true)
  })

  it("nunca incluye estadoPago, activo ni hashes, aunque el perfil traiga más datos", () => {
    const perfilConExtras = {
      ...perfil,
      estadoPago: "deudor",
      hashContrasena: "$argon2id$secreto",
    } as PerfilAutenticado
    const respuesta = construirRespuestaMe(perfilConExtras)

    expect("estadoPago" in respuesta).toBe(false)
    expect("activo" in respuesta).toBe(false)
    expect("hashContrasena" in respuesta).toBe(false)
    expect(JSON.stringify(respuesta)).not.toMatch(/argon2|estadoPago|hash/)
  })

  it("incluye motivoRestriccion solo cuando el acceso está restringido", () => {
    const restringido = construirRespuestaMe({
      ...perfil,
      accesoRestringido: true,
      motivoRestriccion: "Adeudo de colegiatura",
    })
    expect(restringido.accesoRestringido).toBe(true)
    expect(restringido.motivoRestriccion).toBe("Adeudo de colegiatura")

    const noRestringidoConMotivo = construirRespuestaMe({
      ...perfil,
      accesoRestringido: false,
      motivoRestriccion: "Motivo viejo",
    })
    expect("motivoRestriccion" in noRestringidoConMotivo).toBe(false)

    const restringidoSinMotivo = construirRespuestaMe({
      ...perfil,
      accesoRestringido: true,
      motivoRestriccion: null,
    })
    expect("motivoRestriccion" in restringidoSinMotivo).toBe(false)
  })
})
