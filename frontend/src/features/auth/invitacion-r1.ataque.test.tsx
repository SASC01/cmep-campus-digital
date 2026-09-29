import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { EstablecerContrasenaView } from "./establecer-contrasena-view"

// Ataques del Tester (AUTH-03a, ronda 1) contra /establecer-contrasena con el nombre de la
// invitación (§D-A2): la consulta POST /api/auth/invitacion (clave fija sin el token, gcTime 0, sin
// reintentos), sus estados en el orden error → carga → datos, el campo "Nombre completo" y la
// mutación que manda el nombre. Se localiza por rol, etiqueta y texto accesible.

vi.mock("@/services/navegacion", () => ({
  irA: vi.fn(),
  rutaActual: vi.fn(() => "/establecer-contrasena"),
}))

const TOKEN = "Zq3_-9aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789b"
const CONTRASENA = "clave-de-invitacion-r1"
const MENSAJE_ENLACE_INVALIDO =
  "El enlace no es válido o ya venció. Pide uno nuevo en ¿Olvidaste tu contraseña? o acude a administración."

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: cuerpo === undefined ? {} : { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string) =>
  respuestaJson(estado, { error: { codigo, mensaje: "mensaje del servidor" } })

type Manejador = (ruta: string, init?: RequestInit) => Response | Promise<Response>

const stubFetch = (manejador: Manejador) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) =>
    Promise.resolve(manejador(String(entrada), init)),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const llamadasA = (fetchMock: ReturnType<typeof stubFetch>, ruta: string) =>
  fetchMock.mock.calls.filter(([entrada]) => String(entrada) === ruta)

const conInvitacion =
  (
    invitacion: () => Response | Promise<Response>,
    resto: Manejador = () => respuestaJson(204, undefined),
  ): Manejador =>
  (ruta, init) =>
    ruta === "/api/auth/invitacion" ? invitacion() : resto(ruta, init)

const renderVista = () => {
  const router = createMemoryRouter(
    [
      { path: "/establecer-contrasena", element: <EstablecerContrasenaView /> },
      { path: "/login", element: <p>Pantalla de login</p> },
    ],
    {
      initialEntries: ["/login", { pathname: "/establecer-contrasena", hash: `#token=${TOKEN}` }],
      initialIndex: 1,
    },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, queryClient }
}

const campoNombre = () => screen.getByLabelText("Nombre completo")

const llenarContrasena = () => {
  fireEvent.change(screen.getByLabelText("Contraseña nueva"), { target: { value: CONTRASENA } })
  fireEvent.change(screen.getByLabelText("Confirma la contraseña nueva"), {
    target: { value: CONTRASENA },
  })
}

const cuerpoDe = (llamada: Parameters<typeof fetch> | undefined): unknown =>
  JSON.parse(String(llamada?.[1]?.body))

const volcadoDeLaCache = (queryClient: QueryClient): string =>
  JSON.stringify({
    consultas: queryClient
      .getQueryCache()
      .getAll()
      .map((consulta) => ({
        clave: consulta.queryKey,
        meta: consulta.meta ?? null,
        estado: consulta.state,
      })),
    mutaciones: queryClient
      .getMutationCache()
      .getAll()
      .map((mutacion) => ({ clave: mutacion.options.mutationKey, estado: mutacion.state })),
  })

const esperarUnMomento = () => act(() => new Promise((resolver) => setTimeout(resolver, 30)))

afterEach(() => {
  vi.unstubAllGlobals()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe("ataque (AUTH-03a r1): la consulta de la invitación", () => {
  it("manda el token solo en el cuerpo de un POST, una sola vez, y la clave, meta y data no lo contienen", async () => {
    const fetchMock = stubFetch(conInvitacion(() => respuestaJson(200, { nombre: "Ana López" })))
    const { queryClient } = renderVista()
    await screen.findByRole("button", { name: "Activar mi cuenta" })
    await esperarUnMomento()

    const llamadas = llamadasA(fetchMock, "/api/auth/invitacion")
    expect(llamadas).toHaveLength(1)
    expect(llamadas[0]?.[1]?.method).toBe("POST")
    expect(cuerpoDe(llamadas[0])).toEqual({ token: TOKEN })
    for (const [ruta] of fetchMock.mock.calls) expect(String(ruta)).not.toContain(TOKEN)

    const consultas = queryClient.getQueryCache().getAll()
    expect(consultas.map((c) => c.queryKey)).toEqual([["datos-de-invitacion"]])
    expect(volcadoDeLaCache(queryClient)).not.toContain(TOKEN)
    expect(consultas[0]?.state.data).toEqual({ nombre: "Ana López" })
    expect(window.localStorage.length + window.sessionStorage.length).toBe(0)
  })

  it("mientras llega, muestra Cargando y ningún campo; ni el botón de envío", async () => {
    let soltar: (respuesta: Response) => void = () => undefined
    stubFetch(
      conInvitacion(
        () =>
          new Promise<Response>((resolver) => {
            soltar = resolver
          }),
      ),
    )
    renderVista()

    expect(await screen.findByRole("status")).toHaveTextContent("Cargando")
    expect(screen.queryByLabelText("Nombre completo")).toBeNull()
    expect(screen.queryByLabelText("Contraseña nueva")).toBeNull()
    expect(screen.queryByRole("button", { name: "Activar mi cuenta" })).toBeNull()
    act(() => soltar(respuestaJson(200, { nombre: "Ana López" })))
    expect(await screen.findByRole("button", { name: "Activar mi cuenta" })).toBeVisible()
  })

  it("ENLACE_INVALIDO en la consulta: enlace inválido, sin formulario, sin reintentos y sin llamar a establecer", async () => {
    const fetchMock = stubFetch(conInvitacion(() => errorJson(400, "ENLACE_INVALIDO")))
    const { router } = renderVista()

    expect(await screen.findByText(MENSAJE_ENLACE_INVALIDO)).toBeInTheDocument()
    await esperarUnMomento()
    expect(screen.queryByLabelText("Nombre completo")).toBeNull()
    expect(screen.queryByLabelText("Contraseña nueva")).toBeNull()
    expect(llamadasA(fetchMock, "/api/auth/invitacion")).toHaveLength(1)
    expect(llamadasA(fetchMock, "/api/auth/establecer-contrasena")).toHaveLength(0)
    expect(router.state.location.hash).toBe("")
  })

  it.each([
    ["un 500 con el formato de la API", () => errorJson(500, "ERROR_INTERNO")],
    ["un 429", () => errorJson(429, "DEMASIADAS_SOLICITUDES")],
    [
      "una red caída",
      (): Response => {
        throw new TypeError("Failed to fetch")
      },
    ],
  ])(
    "%s en la consulta: un mensaje de error, sin formulario, sin enlace inválido y sin reintentos",
    async (_caso, respuesta) => {
      const fetchMock = stubFetch(conInvitacion(respuesta))
      renderVista()

      expect(await screen.findByRole("alert")).toBeVisible()
      await esperarUnMomento()
      expect(screen.queryByText(MENSAJE_ENLACE_INVALIDO)).toBeNull()
      expect(screen.queryByLabelText("Contraseña nueva")).toBeNull()
      expect(llamadasA(fetchMock, "/api/auth/invitacion")).toHaveLength(1)
    },
  )

  it("si el servidor filtra correo, id y rol en la respuesta, no se muestran ni quedan en la caché", async () => {
    stubFetch(
      conInvitacion(() =>
        respuestaJson(200, {
          nombre: "Ana López",
          email: "ana.filtrada@ejemplo.mx",
          id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
          rol: "maestro",
        }),
      ),
    )
    const { queryClient } = renderVista()
    await screen.findByRole("button", { name: "Activar mi cuenta" })

    expect(document.body.textContent).not.toContain("ana.filtrada@ejemplo.mx")
    const volcado = volcadoDeLaCache(queryClient)
    expect(volcado).not.toContain("ana.filtrada@ejemplo.mx")
    expect(volcado).not.toContain("5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e")
  })

  it("una respuesta sin el formato esperado ({ nombre: 123 }) muestra un error y no el formulario", async () => {
    stubFetch(conInvitacion(() => respuestaJson(200, { nombre: 123 })))
    renderVista()

    expect(await screen.findByRole("alert")).toBeVisible()
    expect(screen.queryByLabelText("Contraseña nueva")).toBeNull()
  })
})

describe("ataque (AUTH-03a r1): el nombre en /establecer-contrasena", () => {
  it("el campo lo escribe la propia persona: autoComplete name, prellenado y corregible; el envío lleva el nombre corregido", async () => {
    const fetchMock = stubFetch(
      conInvitacion(() => respuestaJson(200, { nombre: "Nombre Provisional" })),
    )
    const { router } = renderVista()
    await screen.findByRole("button", { name: "Activar mi cuenta" })

    expect(campoNombre()).toHaveValue("Nombre Provisional")
    expect(campoNombre()).toHaveAttribute("autocomplete", "name")
    expect(campoNombre()).toHaveAccessibleDescription(
      "Así te verán tus alumnos. Corrígelo si hace falta.",
    )
    fireEvent.change(campoNombre(), { target: { value: "  Ana María López  " } })
    llenarContrasena()
    fireEvent.click(screen.getByRole("button", { name: "Activar mi cuenta" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    const [envio] = llamadasA(fetchMock, "/api/auth/establecer-contrasena")
    expect(cuerpoDe(envio)).toEqual({
      token: TOKEN,
      contrasena: CONTRASENA,
      nombre: "Ana María López",
    })
  })

  it.each([
    ["vacío", ""],
    ["de solo espacios", "    "],
    ["con un espacio de ancho cero", "Ana​ López"],
    ["con U+202E", "Ana ‮zepóL"],
    ["de relleno Hangul", "ㅤㅤㅤ"],
    ["de 121 caracteres", `A${"b".repeat(120)}`],
  ])(
    "un nombre %s: ErrorDeCampo descrito por el campo y ninguna petición a establecer",
    async (_caso, nombre) => {
      const fetchMock = stubFetch(conInvitacion(() => respuestaJson(200, { nombre: "Ana López" })))
      renderVista()
      await screen.findByRole("button", { name: "Activar mi cuenta" })

      fireEvent.change(campoNombre(), { target: { value: nombre } })
      llenarContrasena()
      fireEvent.click(screen.getByRole("button", { name: "Activar mi cuenta" }))

      await waitFor(() => expect(campoNombre()).toHaveAttribute("aria-invalid", "true"))
      const descripcion = campoNombre().getAttribute("aria-describedby") ?? ""
      const idError = descripcion.split(/\s+/).find((id) => id.endsWith("-error"))
      expect(idError, "el campo no apunta a su error").toBeDefined()
      const error = document.getElementById(idError ?? "")
      expect(error?.textContent?.trim().length ?? 0).toBeGreaterThan(0)
      await esperarUnMomento()
      expect(llamadasA(fetchMock, "/api/auth/establecer-contrasena")).toHaveLength(0)
    },
  )

  it("dos clics en el mismo instante: una sola petición a establecer", async () => {
    const fetchMock = stubFetch(conInvitacion(() => respuestaJson(200, { nombre: "Ana López" })))
    const { router } = renderVista()
    await screen.findByRole("button", { name: "Activar mi cuenta" })
    llenarContrasena()
    const boton = screen.getByRole("button", { name: "Activar mi cuenta" })
    fireEvent.click(boton)
    fireEvent.click(boton)

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(llamadasA(fetchMock, "/api/auth/establecer-contrasena")).toHaveLength(1)
  })

  it("tras activar la cuenta y salir, ni el token, ni la contraseña, ni el nombre quedan en ninguna caché, y la consulta desaparece", async () => {
    stubFetch(conInvitacion(() => respuestaJson(200, { nombre: "Nombre Provisional" })))
    const { router, queryClient } = renderVista()
    await screen.findByRole("button", { name: "Activar mi cuenta" })
    fireEvent.change(campoNombre(), { target: { value: "Nombre Corregido Secreto" } })
    llenarContrasena()
    fireEvent.click(screen.getByRole("button", { name: "Activar mi cuenta" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(await screen.findByText("Pantalla de login")).toBeInTheDocument()
    await esperarUnMomento()

    expect(queryClient.getQueryCache().find({ queryKey: ["datos-de-invitacion"] })).toBeUndefined()
    const volcado = volcadoDeLaCache(queryClient)
    expect(volcado).not.toContain(TOKEN)
    expect(volcado).not.toContain(CONTRASENA)
    expect(volcado).not.toContain("Nombre Corregido Secreto")
    expect(JSON.stringify(router.state.location)).not.toContain(TOKEN)
  })

  it("con ENLACE_INVALIDO al enviar (la invitación se usó en otra pestaña): enlace inválido y ni el token ni el nombre quedan en la caché de mutaciones", async () => {
    const fetchMock = stubFetch(
      conInvitacion(
        () => respuestaJson(200, { nombre: "Ana López" }),
        () => errorJson(400, "ENLACE_INVALIDO"),
      ),
    )
    const { queryClient } = renderVista()
    await screen.findByRole("button", { name: "Activar mi cuenta" })
    fireEvent.change(campoNombre(), { target: { value: "Nombre En Carrera" } })
    llenarContrasena()
    fireEvent.click(screen.getByRole("button", { name: "Activar mi cuenta" }))

    expect(await screen.findByText(MENSAJE_ENLACE_INVALIDO)).toBeInTheDocument()
    await esperarUnMomento()
    const mutaciones = JSON.stringify(
      queryClient
        .getMutationCache()
        .getAll()
        .map((m) => m.state),
    )
    expect(mutaciones).not.toContain(TOKEN)
    expect(mutaciones).not.toContain("Nombre En Carrera")
    expect(llamadasA(fetchMock, "/api/auth/establecer-contrasena")).toHaveLength(1)
  })
})
