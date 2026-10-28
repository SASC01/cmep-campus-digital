import { describe, expect, it } from "vitest"

import { campoDeErrorDeApi, esErrorDeCursor } from "@/lib/errores-de-api"
import { ENTRADAS_FUERA_DE_CONTRATO } from "@/lib/errores-de-api-fuera-de-contrato"
import { ApiError } from "@/services/apiClient"

import { CAMPOS_DE_CURSOR_DE_MIS_CALIFICACIONES, CAMPOS_DE_CURSOR_DEL_GRADEBOOK } from "./data"
import { esErrorDeCursorDeCalificaciones, esErrorDeSinAcceso } from "./lib"

// Tester, ronda 1 de CHORE-03 03b: el alias del cursor de features/calificaciones da exactamente lo
// que daba la función propia de 1f11d38e (copiada aquí tal cual, solo para comparar) ante cualquier
// entrada y cualquier lista de campos. Sin fechas ni reloj.

const esErrorDeCursorDeAntes = (error: unknown, campos: readonly string[]): boolean => {
  const campo = campoDeErrorDeApi(error)
  return campo !== null && campos.includes(campo)
}

const validacion = (mensaje: string) => new ApiError("VALIDACION", mensaje, 400)

const MENSAJES: readonly string[] = [
  "cursor: no es válido",
  "cursor:",
  "cursor:\u{200B}",
  "cursorTareas: no es válido",
  "cursorTareas:\u{00A0}",
  "cursor.0: x",
  "cursorTareas.0: x",
  "Cursor: x",
  "limite: Too big: expected number",
  "claseId: x",
  " cursor: x",
  "\u{200B}cursor: x",
  "cursor : x",
  "cursorTareas",
  ...ENTRADAS_FUERA_DE_CONTRATO.map((entrada) => entrada.mensaje),
]

const ERRORES: readonly unknown[] = [
  ...MENSAJES.map(validacion),
  new ApiError("SERVICIO_OCUPADO", "cursor: x", 503),
  new ApiError("SIN_ACCESO_A_LA_CLASE", "cursor: x", 403),
  new Error("cursor: x"),
  { codigo: "VALIDACION", message: "cursor: x" },
  null,
]

const LISTAS: readonly (readonly string[])[] = [
  CAMPOS_DE_CURSOR_DEL_GRADEBOOK,
  CAMPOS_DE_CURSOR_DE_MIS_CALIFICACIONES,
  [],
  ["cursorTareas"],
  ["constructor"],
]

describe("ataque CHORE-03 03b r1 · el cursor de calificaciones", () => {
  it("el alias es la misma función que esErrorDeCursor del contrato (identidad)", () => {
    expect(esErrorDeCursorDeCalificaciones).toBe(esErrorDeCursor)
  })

  it.each(LISTAS.map((campos) => [campos.join(", ") || "(lista vacía)", campos] as const))(
    "con los campos [%s], el alias da lo mismo que la función de antes ante toda la tabla, el cursor y lo que no es VALIDACION",
    (_nombre, campos) => {
      const ahora = ERRORES.map((error) => esErrorDeCursorDeCalificaciones(error, campos))
      const antes = ERRORES.map((error) => esErrorDeCursorDeAntes(error, campos))
      expect(ahora).toEqual(antes)
    },
  )

  it("el gradebook reconoce cursor y cursorTareas; «Mis calificaciones» solo cursor; ninguno confunde un VALIDACION de otro campo ni el de la clase", () => {
    expect(
      esErrorDeCursorDeCalificaciones(
        validacion("cursorTareas: x"),
        CAMPOS_DE_CURSOR_DEL_GRADEBOOK,
      ),
    ).toBe(true)
    expect(
      esErrorDeCursorDeCalificaciones(validacion("cursor: x"), CAMPOS_DE_CURSOR_DEL_GRADEBOOK),
    ).toBe(true)
    expect(
      esErrorDeCursorDeCalificaciones(
        validacion("cursorTareas: x"),
        CAMPOS_DE_CURSOR_DE_MIS_CALIFICACIONES,
      ),
    ).toBe(false)
    expect(
      esErrorDeCursorDeCalificaciones(validacion("limite: x"), CAMPOS_DE_CURSOR_DEL_GRADEBOOK),
    ).toBe(false)
    expect(
      esErrorDeCursorDeCalificaciones(validacion("claseId: x"), CAMPOS_DE_CURSOR_DEL_GRADEBOOK),
    ).toBe(false)
    expect(esErrorDeSinAcceso(validacion("claseId: x"))).toBe(true)
    expect(esErrorDeSinAcceso(validacion("cursor: x"))).toBe(false)
  })
})
