import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { limpiarToken } from "@/services/authService"

import { EstablecerContrasenaView } from "./establecer-contrasena-view"
import { RestablecerView } from "./restablecer-view"

// Ataques del Tester (AUTH-02b, ronda 2) contra la corrección de T-01 (DEC-18): el token del
// enlace y la contraseña nueva salen de la caché de mutaciones en cuanto la mutación se asienta.
// Se prueba el éxito, el error, el reintento, el enlace rechazado y el desmontaje con la petición
// todavía en vuelo.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/restablecer") }))

const TOKEN = "Zq3_-9aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789a"
const CONTRASENA = "clave-nueva-de-ataque-2"

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

const diferida = () => {
  let resolver: (respuesta: Response) => void = () => {
    throw new Error("la respuesta diferida se resolvió antes de crearse")
  }
  let rechazar: (motivo: unknown) => void = () => {
    throw new Error("la respuesta diferida se rechazó antes de crearse")
  }
  const promesa = new Promise<Response>((r, x) => {
    resolver = r
    rechazar = x
  })
  return {
    promesa,
    resolver: (respuesta: Response) => resolver(respuesta),
    rechazar: (motivo: unknown) => rechazar(motivo),
  }
}

const renderEnlace = (pathname: "/restablecer" | "/establecer-contrasena" = "/restablecer") => {
  const router = createMemoryRouter(
    [
      { path: "/restablecer", element: <RestablecerView /> },
      { path: "/establecer-contrasena", element: <EstablecerContrasenaView /> },
      { path: "/recuperar", element: <p>Pantalla de recuperar</p> },
      { path: "/login", element: <p>Pantalla de login</p> },
    ],
    { initialEntries: ["/login", { pathname, hash: `#token=${TOKEN}` }], initialIndex: 1 },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, queryClient }
}

const llenarYEnviar = (boton: string) => {
  fireEvent.change(screen.getByLabelText("Contraseña nueva"), { target: { value: CONTRASENA } })
  fireEvent.change(screen.getByLabelText("Confirma la contraseña nueva"), {
    target: { value: CONTRASENA },
  })
  fireEvent.click(screen.getByRole("button", { name: boton }))
}

const mutacionesEnCache = (queryClient: QueryClient): string =>
  JSON.stringify(
    queryClient
      .getMutationCache()
      .getAll()
      .map((mutacion) => ({ opciones: mutacion.options.mutationKey, estado: mutacion.state })),
  )

const esperarUnMomento = () => act(() => new Promise((resolver) => setTimeout(resolver, 30)))

afterEach(() => {
  vi.unstubAllGlobals()
  limpiarToken()
})

describe("ataque (AUTH-02b r2): T-01, el token sale de la caché al asentarse la mutación", () => {
  it("tras un fallo de red, sin salir de la pantalla, el token ya no está en la caché de mutaciones", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() => Promise.reject(new TypeError("Failed to fetch"))),
    )
    const { router, queryClient } = renderEnlace()
    await waitFor(() => expect(router.state.location.hash).toBe(""))

    llenarYEnviar("Guardar contraseña")
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos conectar")

    const cache = mutacionesEnCache(queryClient)
    expect(cache, "el token vigente sigue en la caché tras el error").not.toContain(TOKEN)
    expect(cache).not.toContain(CONTRASENA)
  })

  it("reintento tras un fallo de red: la segunda mutación sale con el mismo token y tampoco se queda", async () => {
    let intentos = 0
    const fetchMock = stubFetch(() => {
      intentos += 1
      if (intentos === 1) throw new TypeError("Failed to fetch")
      return respuestaJson(204, undefined)
    })
    const { router, queryClient } = renderEnlace()
    await waitFor(() => expect(router.state.location.hash).toBe(""))

    llenarYEnviar("Guardar contraseña")
    await screen.findByRole("alert")
    fireEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      token: TOKEN,
      contrasena: CONTRASENA,
    })
    await esperarUnMomento()
    expect(mutacionesEnCache(queryClient)).not.toContain(TOKEN)
  })

  it.each([
    ["/restablecer", "Guardar contraseña"],
    ["/establecer-contrasena", "Activar mi cuenta"],
  ] as const)(
    "%s: ENLACE_INVALIDO deja la pantalla de enlace inválido y el token fuera de la caché",
    async (ruta, boton) => {
      stubFetch(() => errorJson(400, "ENLACE_INVALIDO"))
      const { router, queryClient } = renderEnlace(ruta)
      await waitFor(() => expect(router.state.location.hash).toBe(""))

      llenarYEnviar(boton)

      expect(await screen.findByRole("alert")).toBeVisible()
      expect(screen.queryByLabelText("Contraseña nueva")).not.toBeInTheDocument()
      expect(mutacionesEnCache(queryClient)).not.toContain(TOKEN)
    },
  )

  it("salir de la pantalla con la petición en vuelo: al resolverse con éxito, el token no se queda", async () => {
    const pendiente = diferida()
    stubFetch(() => pendiente.promesa)
    const { router, queryClient } = renderEnlace()
    await waitFor(() => expect(router.state.location.hash).toBe(""))
    llenarYEnviar("Guardar contraseña")

    await act(() => router.navigate("/recuperar"))
    expect(await screen.findByText("Pantalla de recuperar")).toBeInTheDocument()
    await act(async () => {
      pendiente.resolver(respuestaJson(204, undefined))
      await pendiente.promesa
    })
    await esperarUnMomento()

    const cache = mutacionesEnCache(queryClient)
    expect(cache, "la mutación desmontada dejó el token en la caché").not.toContain(TOKEN)
    expect(cache).not.toContain(CONTRASENA)
  })

  it("salir de la pantalla con la petición en vuelo: al fallar por red, el token vigente no se queda", async () => {
    const pendiente = diferida()
    stubFetch(() => pendiente.promesa)
    const { router, queryClient } = renderEnlace()
    await waitFor(() => expect(router.state.location.hash).toBe(""))
    llenarYEnviar("Guardar contraseña")

    await act(() => router.navigate("/recuperar"))
    expect(await screen.findByText("Pantalla de recuperar")).toBeInTheDocument()
    await act(async () => {
      pendiente.rechazar(new TypeError("Failed to fetch"))
      await pendiente.promesa.catch(() => undefined)
    })
    await esperarUnMomento()

    expect(mutacionesEnCache(queryClient)).not.toContain(TOKEN)
    expect(router.state.location.pathname).toBe("/recuperar")
  })

  it("en ningún momento el token pasa a la caché de consultas", async () => {
    stubFetch(() => respuestaJson(204, undefined))
    const { router, queryClient } = renderEnlace("/establecer-contrasena")
    await waitFor(() => expect(router.state.location.hash).toBe(""))

    llenarYEnviar("Activar mi cuenta")
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))

    const consultas = JSON.stringify(
      queryClient
        .getQueryCache()
        .getAll()
        .map((consulta) => consulta.state),
    )
    expect(consultas).not.toContain(TOKEN)
    expect(router.state.location.state).toEqual({ aviso: "cuenta-activada" })
  })
})
