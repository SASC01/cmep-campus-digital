import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it, vi } from "vitest"

import { InicioMaestroView } from "./inicio-maestro-view"

// Tester, CLASES-02c, ronda 1 (O-03 de la ronda 0). Como inicio-sin-datos-r2 (CLASES-a, T-09 y
// T-10), pero con los textos nuevos del maestro sin clases (§D-2C3): con la consulta sin error, sin
// carga y sin datos, el inicio no afirma que no tiene clases ni que la administración se las asignará,
// y no ofrece ninguna acción de crear. Se doblan los hooks del módulo para producir ese estado.

const estado = vi.hoisted(() => ({
  consulta: {
    data: undefined as unknown,
    isError: false,
    isLoading: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: () => Promise.resolve(),
  },
}))

vi.mock("./hooks", () => ({
  useNombreDeSesion: () => ({ data: "Luis Pérez" }),
  useClasesImpartidas: () => estado.consulta,
  useFocoAlCargarMas: () => ({ current: null }),
}))

const TEXTOS_QUE_AFIRMAN_DATOS = [
  "Aún no tienes clases",
  /Tienes \d+ clases?/,
  "La administración te asigna tus clases.",
  "La administración te asigna tus clases. Cuando lo haga, aparecerán aquí.",
  /administración te asigna/i,
  "Comparte el código de cada clase para que tus alumnos se unan.",
]

describe("ataque CLASES-02c r1: inicio del maestro sin datos de la API (O-03)", () => {
  it("sin error, sin carga y sin datos: no afirma vacío, total ni la frase de la administración, y no ofrece crear", () => {
    render(
      <MemoryRouter>
        <InicioMaestroView />
      </MemoryRouter>,
    )
    expect(screen.getByText("Hola, Luis Pérez")).toBeInTheDocument()
    for (const texto of TEXTOS_QUE_AFIRMAN_DATOS) {
      expect(screen.queryByText(texto), String(texto)).toBeNull()
    }
    expect(screen.queryAllByRole("link", { name: /crear|nueva/i })).toEqual([])
    expect(screen.queryAllByRole("button", { name: /crear|nueva/i })).toEqual([])
  })
})
