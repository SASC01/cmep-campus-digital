import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ConClaseDeLaRuta } from "./components/con-clase-de-la-ruta"

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("ConClaseDeLaRuta", () => {
  it("PR-C13d: sin :claseId en la ruta muestra el error «No tienes acceso a esta clase.» y no llama a su hijo ni a fetch; con el parámetro, pasa el id tal cual", () => {
    const fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal("fetch", fetchMock)
    const hijo = vi.fn((claseId: string) => <p>Clase {claseId}</p>)

    render(
      <MemoryRouter initialEntries={["/sin-parametro"]}>
        <Routes>
          <Route path="/sin-parametro" element={<ConClaseDeLaRuta>{hijo}</ConClaseDeLaRuta>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole("alert")).toHaveTextContent("No tienes acceso a esta clase.")
    expect(hijo).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
    cleanup()

    render(
      <MemoryRouter initialEntries={[`/clases/${CLASE_ID}`]}>
        <Routes>
          <Route path="/clases/:claseId" element={<ConClaseDeLaRuta>{hijo}</ConClaseDeLaRuta>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText(`Clase ${CLASE_ID}`)).toBeInTheDocument()
    expect(hijo).toHaveBeenCalledWith(CLASE_ID)
    expect(screen.queryByRole("alert")).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
