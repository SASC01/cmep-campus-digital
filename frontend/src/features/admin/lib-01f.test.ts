import { altaAlumnoSchema, editarNombreSchema } from "@campus/shared"
import { describe, expect, it } from "vitest"

import { ApiError } from "@/services/apiClient"

import { TEXTO_DEL_NOMBRE_PROPIO } from "./data"
import {
  accesoDeLaFila,
  busquedaDeLaTabla,
  consultaDeUsuarios,
  esCuentaQueNoExiste,
  reintentarConsultaAdmin,
  siguientePaginaDeUsuarios,
  textoParaTerceros,
} from "./lib"

// ADMIN-01f: las funciones puras de lib.ts que suma la subentrega. El carácter nulo se escribe con su
// código, nunca literal.
const NULO = String.fromCharCode(0)

describe("ADMIN-01f · textoParaTerceros (ADM-1F22, P-E14-1 a)", () => {
  it("ADM-1F22: el texto exacto de nombreSchema da «Escribe el nombre completo»; con un espacio de más, otro texto o el vacío vuelven tal cual", () => {
    expect(textoParaTerceros("Escribe tu nombre completo")).toBe("Escribe el nombre completo")
    expect(textoParaTerceros("Escribe tu nombre completo ")).toBe("Escribe tu nombre completo ")
    expect(textoParaTerceros("El nombre tiene caracteres no permitidos")).toBe(
      "El nombre tiene caracteres no permitidos",
    )
    expect(textoParaTerceros("")).toBe("")
  })

  it("ADM-1F22 (amarre): editarNombreSchema y altaAlumnoSchema con el nombre vacío dan TEXTO_DEL_NOMBRE_PROPIO en nombre", () => {
    const deEditar = editarNombreSchema.safeParse({ nombre: "" })
    const deAlta = altaAlumnoSchema.safeParse({ nombre: "", email: "a@b.mx" })
    if (deEditar.success || deAlta.success)
      throw new Error("Precondición: los esquemas rechazan el vacío")
    expect(deEditar.error.issues.find((i) => i.path[0] === "nombre")?.message).toBe(
      TEXTO_DEL_NOMBRE_PROPIO,
    )
    expect(deAlta.error.issues.find((i) => i.path[0] === "nombre")?.message).toBe(
      TEXTO_DEL_NOMBRE_PROPIO,
    )
  })
})

describe("ADMIN-01f · busquedaDeLaTabla (ADM-1F21, Enmienda 14)", () => {
  it.each(["", "   ", "a", "ab", NULO, `${NULO}${NULO}`])(
    "ADM-1F21 (b): «%j» es corto: no manda q ni muestra el vacío ni el tope",
    (escrito) => {
      expect(busquedaDeLaTabla(escrito)).toEqual({
        q: undefined,
        vacioSinPedir: false,
        largo: false,
      })
    },
  )

  it("ADM-1F21 (c): 121 normalizados y 1001 en crudo son largos; 120 normalizados se mandan", () => {
    expect(busquedaDeLaTabla("a".repeat(121))).toEqual({
      q: undefined,
      vacioSinPedir: false,
      largo: true,
    })
    expect(busquedaDeLaTabla(`ana${" ".repeat(998)}`).largo).toBe(true)
    expect(busquedaDeLaTabla("a".repeat(120)).q).toBe("a".repeat(120))
  })

  it.each([`ana${NULO}`, `${NULO}ana`, `an${NULO}a`, `ana${NULO}${NULO}${NULO}`])(
    "ADM-1F21 (d): un término válido con el carácter nulo no manda q y muestra el vacío sin pedir",
    (escrito) => {
      expect(busquedaDeLaTabla(escrito)).toEqual({
        q: undefined,
        vacioSinPedir: true,
        largo: false,
      })
    },
  )

  it("un término válido se manda tal cual (el servidor lo normaliza)", () => {
    expect(busquedaDeLaTabla("  Ána  ").q).toBe("  Ána  ")
  })
})

describe("ADMIN-01f · la consulta y la página siguiente de la tabla (ADM-1F18)", () => {
  const CURSOR = "b7e6a1a0-1111-4b8e-9a1e-0f2a3b4c5d6e"

  it("ADM-1F18 (a, b): la búsqueda y el rol van primero; la página siguiente suma cursor y cursorNombre, codificados", () => {
    expect(consultaDeUsuarios(undefined, undefined, undefined)).toBe("")
    const nombre = "Ña & Ó+%  pérez"
    const consulta = consultaDeUsuarios("ana", "maestro", { cursor: CURSOR, cursorNombre: nombre })
    expect([...new URLSearchParams(consulta).keys()]).toEqual([
      "q",
      "rol",
      "cursor",
      "cursorNombre",
    ])
    expect(new URLSearchParams(consulta).get("cursorNombre")).toBe(nombre)
  })

  it("la página siguiente sale de la última respuesta: sin cursor no hay; la posición solo si vino como texto", () => {
    expect(
      siguientePaginaDeUsuarios({
        usuarios: [],
        siguienteCursor: null,
        siguienteCursorNombre: null,
      }),
    ).toBeUndefined()
    expect(
      siguientePaginaDeUsuarios({
        usuarios: [],
        siguienteCursor: CURSOR,
        siguienteCursorNombre: "Ana",
      }),
    ).toEqual({ cursor: CURSOR, cursorNombre: "Ana" })
    expect(
      siguientePaginaDeUsuarios({
        usuarios: [],
        siguienteCursor: CURSOR,
        siguienteCursorNombre: null,
      }),
    ).toEqual({ cursor: CURSOR })
  })
})

describe("ADMIN-01f · lo demás de lib.ts", () => {
  const BASE = {
    id: "b7e6a1a0-1111-4b8e-9a1e-0f2a3b4c5d6e",
    nombre: "Ana",
    email: "ana@ejemplo.mx",
    activo: true,
    creadoEn: "2026-09-01T15:00:00.000Z",
  }

  it("accesoDeLaFila: restringido, sin restricción o no aplica", () => {
    expect(accesoDeLaFila({ ...BASE, rol: "estudiante", accesoRestringido: true })).toBe(
      "restringido",
    )
    expect(accesoDeLaFila({ ...BASE, rol: "estudiante", accesoRestringido: false })).toBe(
      "sinRestriccion",
    )
    expect(accesoDeLaFila({ ...BASE, rol: "maestro" })).toBe("noAplica")
    expect(accesoDeLaFila({ ...BASE, rol: "admin" })).toBe("noAplica")
  })

  it("ADM-1F26: la cuenta que no existe es el 404 o cualquier VALIDACION, por código", () => {
    expect(esCuentaQueNoExiste(new ApiError("USUARIO_NO_ENCONTRADO", "x", 404))).toBe(true)
    expect(esCuentaQueNoExiste(new ApiError("VALIDACION", "id: id: debe ser", 400))).toBe(true)
    expect(esCuentaQueNoExiste(new ApiError("SIN_CONEXION", "x", 0))).toBe(false)
    expect(esCuentaQueNoExiste(new Error("USUARIO_NO_ENCONTRADO"))).toBe(false)
  })

  it("reintentarConsultaAdmin: un 4xx no se reintenta; lo demás, una vez", () => {
    expect(reintentarConsultaAdmin(0, new ApiError("VALIDACION", "x", 400))).toBe(false)
    expect(reintentarConsultaAdmin(0, new ApiError("USUARIO_NO_ENCONTRADO", "x", 404))).toBe(false)
    expect(reintentarConsultaAdmin(0, new ApiError("ERROR_INTERNO", "x", 500))).toBe(true)
    expect(reintentarConsultaAdmin(1, new ApiError("ERROR_INTERNO", "x", 500))).toBe(false)
    expect(reintentarConsultaAdmin(0, new ApiError("SIN_CONEXION", "x", 0))).toBe(true)
  })
})
