import { act, render } from "@testing-library/react"
import { createMemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"

import { FondoDeLaApp } from "./fondo-de-la-app"

const rutasMinimas = [
  { path: "/login", element: <p>Login</p> },
  { path: "/registro", element: <p>Registro</p> },
  { path: "/estudiante", element: <p>Estudiante</p> },
  { path: "/admin", element: <p>Admin</p> },
]

describe("FondoDeLaApp", () => {
  it("sigue la navegación del router: si -> no -> si -> no", () => {
    const router = createMemoryRouter(rutasMinimas, { initialEntries: ["/login"] })
    const { container } = render(<FondoDeLaApp router={router} />)
    const fondo = () => container.querySelector("[data-fondo]")

    expect(fondo()).toHaveAttribute("data-movimiento", "si")

    act(() => {
      router.navigate("/registro")
    })
    expect(fondo()).toHaveAttribute("data-movimiento", "no")

    act(() => {
      router.navigate("/estudiante")
    })
    expect(fondo()).toHaveAttribute("data-movimiento", "si")

    act(() => {
      router.navigate("/admin")
    })
    expect(fondo()).toHaveAttribute("data-movimiento", "no")
  })
})
