import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { describe, expect, it } from "vitest"

import { rutas } from "@/app/router"

const renderLogin = () => {
  const router = createMemoryRouter(rutas, { initialEntries: ["/login"] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

describe("LoginView", () => {
  it("muestra el título de la plataforma", () => {
    renderLogin()
    expect(
      screen.getByRole("heading", { level: 1, name: "CMEP Campus Digital" }),
    ).toBeInTheDocument()
  })

  it("expone los controles y enlaces por su nombre accesible", () => {
    renderLogin()
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeInTheDocument()
    expect(screen.getByLabelText("Correo")).toBeInTheDocument()
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "¿Olvidaste tu contraseña?" })).toHaveAttribute(
      "href",
      "/recuperar",
    )
    expect(screen.getByRole("link", { name: "Regístrate como estudiante" })).toHaveAttribute(
      "href",
      "/registro",
    )
    expect(screen.getByText(/Acude a administración/)).toBeInTheDocument()
  })

  it("al enviar no navega y la vista sigue en pantalla", () => {
    const router = renderLogin()
    fireEvent.submit(screen.getByRole("form", { name: "Iniciar sesión" }))
    expect(router.state.location.pathname).toBe("/login")
    expect(
      screen.getByRole("heading", { level: 1, name: "CMEP Campus Digital" }),
    ).toBeInTheDocument()
  })
})
