import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { describe, expect, it } from "vitest"

import { rutas } from "./router"

const renderEn = (ruta: string) => {
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

describe("rutas", () => {
  it("la raíz redirige a /login", async () => {
    const router = renderEn("/")
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
  })

  it("una ruta por rol sin sesión redirige a /login", async () => {
    const router = renderEn("/maestro")
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
  })
})
