import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { rutas } from "@/app/router"
import { limpiarToken } from "@/services/tokenAcceso"

vi.mock("@/services/navegacion", () => ({
  irA: vi.fn(),
  rutaActual: vi.fn(() => "/registro-maestro"),
}))

const TOKEN = "M".repeat(43)

const meMaestro = {
  id: "6b6d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6f",
  nombre: "Nuevo Maestro",
  email: "maestro@ejemplo.mx",
  rol: "maestro",
  debeCambiarContrasena: false,
  accesoRestringido: false,
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const stubFetch = (manejador: (ruta: string) => Response) => {
  const fetchMock = vi.fn<typeof fetch>((entrada) => Promise.resolve(manejador(String(entrada))))
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const renderVista = (hash = `#token=${TOKEN}`) => {
  const router = createMemoryRouter(rutas, {
    initialEntries: [{ pathname: "/registro-maestro", hash }],
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, queryClient }
}

const mutacionesEnCache = (queryClient: QueryClient): string =>
  JSON.stringify(
    queryClient
      .getMutationCache()
      .getAll()
      .map((mutacion) => ({ opciones: mutacion.options.mutationKey, estado: mutacion.state })),
  )

const llenarYEnviar = (contrasena: string) => {
  fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Nuevo Maestro" } })
  fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "maestro@ejemplo.mx" } })
  fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: contrasena } })
  fireEvent.click(screen.getByRole("button", { name: "Crear mi cuenta" }))
}

afterEach(() => {
  limpiarToken()
  vi.unstubAllGlobals()
})

describe("RegistroMaestroView", () => {
  it("sin token, muestra el enlace inválido sin formulario", () => {
    renderVista("")

    expect(
      screen.getByText(
        "Este enlace de registro no es válido, ya venció o fue revocado. Pide uno nuevo a administración.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText("Correo")).not.toBeInTheDocument()
  })

  it("con envío correcto, queda con sesión y llega a /maestro", async () => {
    const fetchMock = stubFetch((ruta) => {
      if (ruta === "/api/auth/registro-maestro") {
        return respuestaJson(201, { tokenAcceso: "token-de-maestro" })
      }
      return respuestaJson(200, meMaestro)
    })
    const { router } = renderVista()

    llenarYEnviar("clave-de-prueba-1234")

    await waitFor(() => expect(router.state.location.pathname).toBe("/maestro"))
    const registro = fetchMock.mock.calls.find(
      ([entrada]) => String(entrada) === "/api/auth/registro-maestro",
    )
    expect(JSON.parse(String(registro?.[1]?.body))).toEqual({
      nombre: "Nuevo Maestro",
      email: "maestro@ejemplo.mx",
      contrasena: "clave-de-prueba-1234",
      token: TOKEN,
    })
  })

  it("con ENLACE_INVALIDO al enviar, muestra el mensaje de enlace inválido", async () => {
    stubFetch(() => errorJson(400, "ENLACE_INVALIDO"))
    const { router } = renderVista()

    llenarYEnviar("clave-de-prueba-1234")

    expect(
      await screen.findByText(
        "Este enlace de registro no es válido, ya venció o fue revocado. Pide uno nuevo a administración.",
      ),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/registro-maestro")
  })

  it("con CORREO_EN_USO muestra la alerta y sigue en /registro-maestro", async () => {
    stubFetch(() => errorJson(409, "CORREO_EN_USO"))
    const { router } = renderVista()

    llenarYEnviar("clave-de-prueba-1234")

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.",
    )
    expect(router.state.location.pathname).toBe("/registro-maestro")
  })

  it("tras un envío con éxito, ni la contraseña ni el token quedan en la caché de mutaciones", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/auth/registro-maestro") {
        return respuestaJson(201, { tokenAcceso: "token-de-maestro" })
      }
      return respuestaJson(200, meMaestro)
    })
    const { router, queryClient } = renderVista()

    llenarYEnviar("clave-de-prueba-1234")

    await waitFor(() => expect(router.state.location.pathname).toBe("/maestro"))
    const cache = mutacionesEnCache(queryClient)
    expect(cache).not.toContain("clave-de-prueba-1234")
    expect(cache).not.toContain(TOKEN)
  })

  it("tras un envío fallido, ni la contraseña ni el token quedan en la caché de mutaciones", async () => {
    stubFetch(() => errorJson(409, "CORREO_EN_USO"))
    const { queryClient } = renderVista()

    llenarYEnviar("clave-de-prueba-1234")

    await screen.findByRole("alert")
    const cache = mutacionesEnCache(queryClient)
    expect(cache).not.toContain("clave-de-prueba-1234")
    expect(cache).not.toContain(TOKEN)
  })
})
