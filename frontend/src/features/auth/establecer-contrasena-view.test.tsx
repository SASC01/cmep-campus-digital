import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { EstablecerContrasenaView } from "./establecer-contrasena-view"

const TOKEN = "B".repeat(43)

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: cuerpo === undefined ? {} : { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string) =>
  respuestaJson(estado, { error: { codigo, mensaje: "mensaje del servidor" } })

// AUTH-03a: la pantalla pide primero POST /api/auth/invitacion; el manejador atiende esa ruta
// aparte y todo lo demás sigue su regla de siempre.
const stubFetch = (
  manejadorInvitacion: () => Response,
  manejadorResto: (ruta: string, init?: RequestInit) => Response,
) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
    if (String(entrada) === "/api/auth/invitacion") return Promise.resolve(manejadorInvitacion())
    return Promise.resolve(manejadorResto(String(entrada), init))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const renderVista = () => {
  const router = createMemoryRouter(
    [
      { path: "/establecer-contrasena", element: <EstablecerContrasenaView /> },
      { path: "/recuperar", element: <p>Pantalla de recuperar</p> },
      { path: "/login", element: <p>Pantalla de login</p> },
    ],
    { initialEntries: [{ pathname: "/establecer-contrasena", hash: `#token=${TOKEN}` }] },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, queryClient }
}

const llenarYEnviar = async () => {
  await screen.findByRole("button", { name: "Activar mi cuenta" })
  fireEvent.change(screen.getByLabelText("Contraseña nueva"), {
    target: { value: "clave-nueva-1234" },
  })
  fireEvent.change(screen.getByLabelText("Confirma la contraseña nueva"), {
    target: { value: "clave-nueva-1234" },
  })
  fireEvent.click(screen.getByRole("button", { name: "Activar mi cuenta" }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("EstablecerContrasenaView", () => {
  it("muestra el nombre de la invitación, prellenado en el campo", async () => {
    stubFetch(
      () => respuestaJson(200, { nombre: "Ana López" }),
      () => respuestaJson(204, undefined),
    )
    renderVista()

    await screen.findByRole("button", { name: "Activar mi cuenta" })
    expect(screen.getByLabelText("Nombre completo")).toHaveValue("Ana López")
  })

  it("al elegir la contraseña, llega a /login con el aviso de cuenta activada", async () => {
    stubFetch(
      () => respuestaJson(200, { nombre: "Ana López" }),
      () => respuestaJson(204, undefined),
    )
    const { router } = renderVista()

    await llenarYEnviar()

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(router.state.location.state).toEqual({ aviso: "cuenta-activada" })
  })

  it("con ENLACE_INVALIDO al enviar, muestra el mensaje de enlace vencido", async () => {
    stubFetch(
      () => respuestaJson(200, { nombre: "Ana López" }),
      () => errorJson(400, "ENLACE_INVALIDO"),
    )
    renderVista()

    await llenarYEnviar()

    expect(
      await screen.findByText(
        "El enlace no es válido o ya venció. Pide uno nuevo en ¿Olvidaste tu contraseña? o acude a administración.",
      ),
    ).toBeInTheDocument()
  })

  it("con ENLACE_INVALIDO en la invitación misma, muestra el mensaje sin formulario", async () => {
    stubFetch(
      () => errorJson(400, "ENLACE_INVALIDO"),
      () => respuestaJson(204, undefined),
    )
    renderVista()

    expect(
      await screen.findByText(
        "El enlace no es válido o ya venció. Pide uno nuevo en ¿Olvidaste tu contraseña? o acude a administración.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText("Contraseña nueva")).not.toBeInTheDocument()
  })

  it("envía la petición a /api/auth/establecer-contrasena, no a /api/auth/restablecer", async () => {
    const fetchMock = stubFetch(
      () => respuestaJson(200, { nombre: "Ana López" }),
      () => respuestaJson(204, undefined),
    )
    renderVista()

    await llenarYEnviar()

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([entrada]) => String(entrada) === "/api/auth/establecer-contrasena",
        ),
      ).toBe(true),
    )
    expect(
      fetchMock.mock.calls.some(([entrada]) => String(entrada) === "/api/auth/restablecer"),
    ).toBe(false)
  })

  // AUTH-03a, §D-A2: el nombre corregido va en el cuerpo del envío.
  it("el envío lleva el nombre corregido", async () => {
    const fetchMock = stubFetch(
      () => respuestaJson(200, { nombre: "Ana Lopez" }),
      () => respuestaJson(204, undefined),
    )
    renderVista()

    await screen.findByRole("button", { name: "Activar mi cuenta" })
    fireEvent.change(screen.getByLabelText("Nombre completo"), {
      target: { value: "Ana López" },
    })
    fireEvent.change(screen.getByLabelText("Contraseña nueva"), {
      target: { value: "clave-nueva-1234" },
    })
    fireEvent.change(screen.getByLabelText("Confirma la contraseña nueva"), {
      target: { value: "clave-nueva-1234" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Activar mi cuenta" }))

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([entrada]) => String(entrada) === "/api/auth/establecer-contrasena",
        ),
      ).toBe(true),
    )
    const llamada = fetchMock.mock.calls.find(
      ([entrada]) => String(entrada) === "/api/auth/establecer-contrasena",
    )
    expect(JSON.parse(String(llamada?.[1]?.body))).toEqual({
      token: TOKEN,
      contrasena: "clave-nueva-1234",
      nombre: "Ana López",
    })
  })

  it("un nombre inválido no envía nada y marca el campo con ErrorDeCampo", async () => {
    const fetchMock = stubFetch(
      () => respuestaJson(200, { nombre: "Ana López" }),
      () => respuestaJson(204, undefined),
    )
    renderVista()

    await screen.findByRole("button", { name: "Activar mi cuenta" })
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "a" } })
    fireEvent.change(screen.getByLabelText("Contraseña nueva"), {
      target: { value: "clave-nueva-1234" },
    })
    fireEvent.change(screen.getByLabelText("Confirma la contraseña nueva"), {
      target: { value: "clave-nueva-1234" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Activar mi cuenta" }))

    const campo = screen.getByLabelText("Nombre completo")
    expect(await screen.findByText("Escribe tu nombre completo")).toBeInTheDocument()
    expect(campo).toHaveAttribute("aria-invalid", "true")
    expect(
      fetchMock.mock.calls.some(
        ([entrada]) => String(entrada) === "/api/auth/establecer-contrasena",
      ),
    ).toBe(false)
  })

  it("con otro error en la invitación (500), muestra MensajeError sin formulario", async () => {
    stubFetch(
      () => errorJson(500, "ERROR_INTERNO"),
      () => respuestaJson(204, undefined),
    )
    renderVista()

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos completar la operación. Inténtalo de nuevo.",
    )
    expect(screen.queryByLabelText("Contraseña nueva")).not.toBeInTheDocument()
  })

  it("ni la clave, ni meta, ni data de la consulta de la invitación contienen el token", async () => {
    stubFetch(
      () => respuestaJson(200, { nombre: "Ana López" }),
      () => respuestaJson(204, undefined),
    )
    const { queryClient } = renderVista()

    await screen.findByRole("button", { name: "Activar mi cuenta" })
    const consultas = JSON.stringify(
      queryClient
        .getQueryCache()
        .getAll()
        .map((consulta) => ({
          llave: consulta.queryKey,
          meta: consulta.meta,
          estado: consulta.state,
        })),
    )
    expect(consultas).not.toContain(TOKEN)
  })

  it("al desmontar la pantalla, la consulta de la invitación desaparece (gcTime 0)", async () => {
    stubFetch(
      () => respuestaJson(200, { nombre: "Ana López" }),
      () => respuestaJson(204, undefined),
    )
    const { router, queryClient } = renderVista()
    await screen.findByRole("button", { name: "Activar mi cuenta" })
    expect(queryClient.getQueryCache().getAll()).not.toHaveLength(0)

    await act(() => router.navigate("/recuperar"))
    await screen.findByText("Pantalla de recuperar")

    await waitFor(() => expect(queryClient.getQueryCache().getAll()).toHaveLength(0))
  })
})
