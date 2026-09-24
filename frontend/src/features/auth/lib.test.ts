import { describe, expect, it } from "vitest"

import { ApiError } from "@/services/apiClient"

import {
  erroresPorCampo,
  etiquetaDeRol,
  mensajeDeErrorAuth,
  ordenarAnuncios,
  rutaPorRol,
  rutaTrasLogin,
} from "./lib"
import type { Anuncio, MeRespuesta } from "./types"

const desordenados: Anuncio[] = [
  { anuncioId: "c", titulo: "Tercero", texto: "", orden: 3 },
  { anuncioId: "a", titulo: "Primero", texto: "", orden: 1 },
  { anuncioId: "b", titulo: "Segundo", texto: "", orden: 2 },
]

const me: MeRespuesta = {
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  email: "ana@ejemplo.mx",
  rol: "maestro",
  debeCambiarContrasena: false,
  accesoRestringido: false,
}

describe("ordenarAnuncios", () => {
  it("ordena por orden ascendente", () => {
    expect(ordenarAnuncios(desordenados).map((a) => a.anuncioId)).toEqual(["a", "b", "c"])
  })

  it("no muta el arreglo original", () => {
    const copia = [...desordenados]
    ordenarAnuncios(desordenados)
    expect(desordenados).toEqual(copia)
  })
})

describe("rutas y etiquetas por rol", () => {
  it("rutaPorRol y etiquetaDeRol cubren los tres roles", () => {
    expect(rutaPorRol("estudiante")).toBe("/estudiante")
    expect(rutaPorRol("maestro")).toBe("/maestro")
    expect(rutaPorRol("admin")).toBe("/admin")
    expect(etiquetaDeRol("admin")).toBe("Administrador")
  })

  it("rutaTrasLogin manda al restringido a /acceso-restringido y a los demás a su dashboard", () => {
    expect(rutaTrasLogin(me)).toBe("/maestro")
    expect(rutaTrasLogin({ ...me, rol: "estudiante", accesoRestringido: true })).toBe(
      "/acceso-restringido",
    )
  })
})

describe("mensajeDeErrorAuth", () => {
  it("traduce por código, usa el mensaje del servidor en VALIDACION y un genérico en lo demás", () => {
    expect(mensajeDeErrorAuth(new ApiError("CREDENCIALES_INVALIDAS", "x", 401))).toBe(
      "Correo o contraseña incorrectos.",
    )
    expect(mensajeDeErrorAuth(new ApiError("DEMASIADOS_INTENTOS", "x", 429))).toBe(
      "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.",
    )
    expect(
      mensajeDeErrorAuth(new ApiError("VALIDACION", "email: Escribe un correo válido", 400)),
    ).toBe("email: Escribe un correo válido")
    expect(mensajeDeErrorAuth(new ApiError("ERROR_INTERNO", "detalle", 500))).toBe(
      "No pudimos completar la operación. Inténtalo de nuevo.",
    )
    expect(mensajeDeErrorAuth(new Error("no es ApiError"))).toBe(
      "No pudimos completar la operación. Inténtalo de nuevo.",
    )
    expect(mensajeDeErrorAuth(new ApiError("toString", "x", 400))).toBe(
      "No pudimos completar la operación. Inténtalo de nuevo.",
    )
  })
})

describe("erroresPorCampo", () => {
  it("toma el primer mensaje de cada campo conocido e ignora rutas desconocidas", () => {
    expect(
      erroresPorCampo([
        { path: ["email"], message: "Escribe un correo válido" },
        { path: ["email"], message: "segundo mensaje" },
        { path: ["contrasena"], message: "Mínimo 10" },
        { path: ["otro"], message: "ignorado" },
        { path: [], message: "sin campo" },
      ]),
    ).toEqual({ email: "Escribe un correo válido", contrasena: "Mínimo 10" })
  })
})
