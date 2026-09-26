import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { rutas } from "@/app/router"
import { limpiarToken } from "@/services/tokenAcceso"

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/login") }))

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string) =>
  respuestaJson(estado, { error: { codigo, mensaje: "mensaje del servidor" } })

const meMaestro = {
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Luis Pérez",
  email: "luis@ejemplo.mx",
  rol: "maestro",
  debeCambiarContrasena: false,
  accesoRestringido: false,
}

const stubFetch = (manejador: (ruta: string) => Response | Promise<Response>) => {
  const fetchMock = vi.fn<typeof fetch>((entrada) => Promise.resolve(manejador(String(entrada))))
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const renderLogin = (state?: unknown) => {
  const router = createMemoryRouter(rutas, {
    initialEntries: [state === undefined ? "/login" : { pathname: "/login", state }],
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const llenarYEnviar = (correo: string, contrasena: string) => {
  fireEvent.change(screen.getByLabelText("Correo"), { target: { value: correo } })
  fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: contrasena } })
  fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }))
}

afterEach(() => {
  limpiarToken()
  vi.unstubAllGlobals()
})

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

  it("con campos vacíos no envía nada, marca los campos y sigue en /login", () => {
    const fetchMock = stubFetch(() => respuestaJson(200, {}))
    const router = renderLogin()

    fireEvent.submit(screen.getByRole("form", { name: "Iniciar sesión" }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(router.state.location.pathname).toBe("/login")
    expect(screen.getByLabelText("Correo")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText("Escribe un correo válido")).toBeInTheDocument()
  })

  it("envía POST /api/auth/login, consulta GET /api/me y lleva al maestro a /maestro", async () => {
    const fetchMock = stubFetch((ruta) => {
      if (ruta === "/api/auth/login") return respuestaJson(200, { tokenAcceso: "token-maestro" })
      return respuestaJson(200, meMaestro)
    })
    const router = renderLogin()

    llenarYEnviar("  Luis@Ejemplo.mx ", "clave-de-prueba-1234")

    await waitFor(() => expect(router.state.location.pathname).toBe("/maestro"))
    const [login, consultaMe] = fetchMock.mock.calls
    expect(String(login?.[0])).toBe("/api/auth/login")
    expect(login?.[1]?.method).toBe("POST")
    expect(JSON.parse(String(login?.[1]?.body))).toEqual({
      email: "Luis@Ejemplo.mx",
      contrasena: "clave-de-prueba-1234",
    })
    expect(String(consultaMe?.[0])).toBe("/api/me")
    expect(new Headers(consultaMe?.[1]?.headers).get("Authorization")).toBe("Bearer token-maestro")
    expect(await screen.findByRole("heading", { name: "Hola, Luis Pérez" })).toBeInTheDocument()
  })

  it("con CREDENCIALES_INVALIDAS muestra la alerta y sigue en /login", async () => {
    stubFetch(() => errorJson(401, "CREDENCIALES_INVALIDAS"))
    const router = renderLogin()

    llenarYEnviar("ana@ejemplo.mx", "equivocada")

    const alerta = await screen.findByRole("alert")
    expect(alerta).toHaveTextContent("Correo o contraseña incorrectos.")
    expect(router.state.location.pathname).toBe("/login")
  })

  it("con 429 muestra el mensaje de espera", async () => {
    stubFetch(() => errorJson(429, "DEMASIADOS_INTENTOS"))
    renderLogin()

    llenarYEnviar("ana@ejemplo.mx", "equivocada")

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.",
    )
  })

  it("deshabilita el botón durante el envío y un doble clic hace una sola petición", async () => {
    let responder: (respuesta: Response) => void = () => undefined
    const fetchMock = stubFetch(
      () =>
        new Promise<Response>((resolver) => {
          responder = resolver
        }),
    )
    renderLogin()

    llenarYEnviar("ana@ejemplo.mx", "clave-de-prueba-1234")
    const boton = screen.getByRole("button", { name: "Iniciar sesión" })
    await waitFor(() => expect(boton).toBeDisabled())
    fireEvent.click(boton)
    fireEvent.submit(screen.getByRole("form", { name: "Iniciar sesión" }))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    responder(errorJson(401, "CREDENCIALES_INVALIDAS"))
    await waitFor(() => expect(boton).toBeEnabled())
  })

  it("con state.aviso muestra el aviso con role=status", () => {
    renderLogin({ aviso: "contrasena-actualizada" })

    expect(screen.getByRole("status")).toHaveTextContent(
      "Tu contraseña se actualizó. Inicia sesión con la nueva.",
    )
  })
})
