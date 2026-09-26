import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/services/apiClient"
import { establecerToken, limpiarToken } from "@/services/authService"

import { EstablecerContrasenaView } from "./establecer-contrasena-view"
import { avisoDeLogin, leerTokenDelFragmento, requiereCambioDeContrasena } from "./lib"
import { LoginView } from "./login-view"
import { RecuperarView } from "./recuperar-view"
import { RestablecerView } from "./restablecer-view"

// Ataques del Tester (AUTH-02b, ronda 1) contra DEC-18: el token del enlace se lee una vez del
// fragmento, se quita de la URL y del historial, y vive solo en el estado de React (nunca en
// localStorage, sessionStorage, la URL ni la caché de TanStack Query).

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/restablecer") }))

const TOKEN = "Zq3_-9aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789a"
const CONTRASENA = "clave-nueva-de-ataque-1"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: cuerpo === undefined ? {} : { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string) =>
  respuestaJson(estado, { error: { codigo, mensaje: "mensaje del servidor" } })

const stubFetch = (manejador: (ruta: string, init?: RequestInit) => Response) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) =>
    Promise.resolve(manejador(String(entrada), init)),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const llamadasA = (fetchMock: ReturnType<typeof stubFetch>, ruta: string) =>
  fetchMock.mock.calls.filter(([entrada]) => String(entrada) === ruta).length

interface OpcionesRender {
  pathname?: "/restablecer" | "/establecer-contrasena"
  hash: string
  search?: string
}

const renderEnlace = ({ pathname = "/restablecer", hash, search = "" }: OpcionesRender) => {
  const router = createMemoryRouter(
    [
      { path: "/restablecer", element: <RestablecerView /> },
      { path: "/establecer-contrasena", element: <EstablecerContrasenaView /> },
      { path: "/recuperar", element: <p>Pantalla de recuperar</p> },
      { path: "/login", element: <p>Pantalla de login</p> },
    ],
    { initialEntries: ["/login", { pathname, hash, search }], initialIndex: 1 },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const vista = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, queryClient, vista }
}

const llenarYEnviar = (boton: string, confirmacion = CONTRASENA) => {
  fireEvent.change(screen.getByLabelText("Contraseña nueva"), { target: { value: CONTRASENA } })
  fireEvent.change(screen.getByLabelText("Confirma la contraseña nueva"), {
    target: { value: confirmacion },
  })
  fireEvent.click(screen.getByRole("button", { name: boton }))
}

// Todo lo que TanStack Query conserva en memoria (consultas y mutaciones), serializado.
const contenidoDeLaCache = (queryClient: QueryClient): string =>
  JSON.stringify({
    consultas: queryClient
      .getQueryCache()
      .getAll()
      .map((consulta) => ({ llave: consulta.queryKey, estado: consulta.state })),
    mutaciones: queryClient
      .getMutationCache()
      .getAll()
      .map((mutacion) => mutacion.state),
  })

afterEach(() => {
  vi.unstubAllGlobals()
  limpiarToken()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe("ataque (AUTH-02b r1): fragmentos con otra forma", () => {
  const fragmentosInvalidos: [string, string][] = [
    ["42 caracteres", `#token=${TOKEN.slice(0, 42)}`],
    ["44 caracteres", `#token=${TOKEN}A`],
    ["con un parámetro extra detrás", `#token=${TOKEN}&x=1`],
    ["con un parámetro extra delante", `#x=1&token=${TOKEN}`],
    ["con #token= repetido", `#token=${TOKEN}#token=${TOKEN}`],
    ["con token= repetido por &", `#token=${TOKEN}&token=${TOKEN}`],
    ["con la llave en mayúsculas", `#TOKEN=${TOKEN}`],
    ["con base64 estándar (+ y /)", `#token=${TOKEN.slice(0, 41)}+/`],
    ["codificado en porcentaje", `#token=%5A${TOKEN.slice(1)}`],
    ["con espacio al final", `#token=${TOKEN}%20`],
    ["vacío", "#token="],
    ["solo el signo #", "#"],
    ["con ruta dentro del fragmento", `#/token=${TOKEN}`],
  ]

  it.each(fragmentosInvalidos)(
    "%s: estado de enlace inválido, ni una petición y el fragmento sale de la URL",
    async (_caso, hash) => {
      const fetchMock = stubFetch(() => respuestaJson(204, undefined))
      const { router } = renderEnlace({ hash })

      expect(
        await screen.findByText("El enlace no es válido o ya venció. Pide uno nuevo."),
      ).toBeInTheDocument()
      await waitFor(() => expect(router.state.location.hash).toBe(""))
      expect(screen.queryByLabelText("Contraseña nueva")).not.toBeInTheDocument()
      expect(fetchMock).not.toHaveBeenCalled()
    },
  )

  it("un token válido en la query (?token=) no se acepta: solo cuenta el fragmento", async () => {
    const fetchMock = stubFetch(() => respuestaJson(204, undefined))
    renderEnlace({ hash: "", search: `?token=${TOKEN}` })

    expect(
      await screen.findByText("El enlace no es válido o ya venció. Pide uno nuevo."),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe("ataque (AUTH-02b r1): el token después de leerlo", () => {
  it("sale de la URL y del historial: volver atrás y adelante no lo recupera", async () => {
    stubFetch(() => respuestaJson(204, undefined))
    const { router } = renderEnlace({ hash: `#token=${TOKEN}` })

    await waitFor(() => expect(router.state.location.hash).toBe(""))
    expect(router.state.historyAction).toBe("REPLACE")
    expect(JSON.stringify(router.state.location)).not.toContain(TOKEN)

    await act(() => router.navigate(-1))
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    await act(() => router.navigate(1))
    await waitFor(() => expect(router.state.location.pathname).toBe("/restablecer"))
    expect(router.state.location.hash).toBe("")
    expect(JSON.stringify(router.state.location)).not.toContain(TOKEN)
  })

  it("el formulario sigue enviando el token leído aunque la URL ya no lo tenga", async () => {
    const fetchMock = stubFetch(() => respuestaJson(204, undefined))
    const { router } = renderEnlace({ hash: `#token=${TOKEN}` })
    await waitFor(() => expect(router.state.location.hash).toBe(""))

    llenarYEnviar("Guardar contraseña")

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    const llamada = fetchMock.mock.calls.find(([r]) => String(r) === "/api/auth/restablecer")
    expect(llamada, "no hubo POST a /api/auth/restablecer").toBeDefined()
    expect(JSON.parse(String(llamada?.[1]?.body))).toEqual({ token: TOKEN, contrasena: CONTRASENA })
  })

  it("no queda en localStorage ni en sessionStorage, ni antes ni después de enviar", async () => {
    stubFetch(() => respuestaJson(204, undefined))
    const { router } = renderEnlace({ hash: `#token=${TOKEN}` })
    await waitFor(() => expect(router.state.location.hash).toBe(""))
    expect(window.localStorage.length + window.sessionStorage.length).toBe(0)

    llenarYEnviar("Guardar contraseña")

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(window.localStorage.length + window.sessionStorage.length).toBe(0)
  })

  it("el aviso de /login no arrastra el token en location.state", async () => {
    stubFetch(() => respuestaJson(204, undefined))
    const { router } = renderEnlace({ hash: `#token=${TOKEN}` })
    await waitFor(() => expect(router.state.location.hash).toBe(""))

    llenarYEnviar("Guardar contraseña")

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(router.state.location.state).toEqual({ aviso: "contrasena-actualizada" })
  })

  it("DEC-18: tras salir de /restablecer, ni el token ni la contraseña quedan en la caché de TanStack Query", async () => {
    stubFetch(() => respuestaJson(204, undefined))
    const { router, queryClient } = renderEnlace({ hash: `#token=${TOKEN}` })
    await waitFor(() => expect(router.state.location.hash).toBe(""))

    llenarYEnviar("Guardar contraseña")
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(await screen.findByText("Pantalla de login")).toBeInTheDocument()

    // Se deja pasar el ciclo de recolección más corto posible (gcTime 0 recolecta en un tick).
    await act(() => new Promise((resolver) => setTimeout(resolver, 20)))
    const cache = contenidoDeLaCache(queryClient)
    expect(cache, "el token del enlace sigue en la caché de TanStack Query").not.toContain(TOKEN)
    expect(cache, "la contraseña nueva sigue en la caché de TanStack Query").not.toContain(
      CONTRASENA,
    )
  })

  it("DEC-18: tras un fallo de red (el token sigue vigente) y salir de la pantalla, el token no queda en la caché", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() => Promise.reject(new TypeError("Failed to fetch"))),
    )
    const { router, queryClient } = renderEnlace({ hash: `#token=${TOKEN}` })
    await waitFor(() => expect(router.state.location.hash).toBe(""))

    llenarYEnviar("Guardar contraseña")
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos conectar")
    await act(() => router.navigate("/login"))
    expect(await screen.findByText("Pantalla de login")).toBeInTheDocument()

    await act(() => new Promise((resolver) => setTimeout(resolver, 20)))
    expect(
      contenidoDeLaCache(queryClient),
      "un token todavía válido sigue en la caché de mutaciones tras salir de la pantalla",
    ).not.toContain(TOKEN)
  })

  it("una sesión abierta en la pestaña no hace que /restablecer consulte /me ni refresque", async () => {
    establecerToken("token-de-otra-sesion")
    const fetchMock = stubFetch((ruta) => {
      if (ruta === "/api/auth/restablecer") return errorJson(401, "NO_AUTENTICADO")
      return errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
    })
    const { router } = renderEnlace({ hash: `#token=${TOKEN}` })
    await waitFor(() => expect(router.state.location.hash).toBe(""))

    llenarYEnviar("Guardar contraseña")

    expect(await screen.findByRole("alert")).toBeInTheDocument()
    expect(llamadasA(fetchMock, "/api/me")).toBe(0)
    expect(llamadasA(fetchMock, "/api/auth/refrescar")).toBe(0)
    expect(llamadasA(fetchMock, "/api/auth/restablecer")).toBe(1)
  })
})

describe("ataque (AUTH-02b r1): formularios de enlace", () => {
  it("dos envíos en el mismo instante hacen una sola petición", async () => {
    const fetchMock = stubFetch(() => respuestaJson(204, undefined))
    const { router } = renderEnlace({ hash: `#token=${TOKEN}` })
    await waitFor(() => expect(router.state.location.hash).toBe(""))

    fireEvent.change(screen.getByLabelText("Contraseña nueva"), { target: { value: CONTRASENA } })
    fireEvent.change(screen.getByLabelText("Confirma la contraseña nueva"), {
      target: { value: CONTRASENA },
    })
    const boton = screen.getByRole("button", { name: "Guardar contraseña" })
    fireEvent.click(boton)
    fireEvent.click(boton)

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(llamadasA(fetchMock, "/api/auth/restablecer")).toBe(1)
  })

  it("confirmación distinta: no envía, marca el campo y lo describe", async () => {
    const fetchMock = stubFetch(() => respuestaJson(204, undefined))
    const { router } = renderEnlace({ hash: `#token=${TOKEN}` })
    await waitFor(() => expect(router.state.location.hash).toBe(""))

    llenarYEnviar("Guardar contraseña", `${CONTRASENA}x`)

    const confirmacion = screen.getByLabelText("Confirma la contraseña nueva")
    expect(await screen.findByText("Las contraseñas no coinciden.")).toBeInTheDocument()
    expect(confirmacion).toHaveAttribute("aria-invalid", "true")
    expect(confirmacion).toHaveAccessibleDescription("Las contraseñas no coinciden.")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("contraseña corta: no envía, marca el campo y lo describe junto con la ayuda", async () => {
    const fetchMock = stubFetch(() => respuestaJson(204, undefined))
    const { router } = renderEnlace({ hash: `#token=${TOKEN}` })
    await waitFor(() => expect(router.state.location.hash).toBe(""))

    fireEvent.change(screen.getByLabelText("Contraseña nueva"), { target: { value: "corta" } })
    fireEvent.change(screen.getByLabelText("Confirma la contraseña nueva"), {
      target: { value: "corta" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }))

    const campo = screen.getByLabelText("Contraseña nueva")
    await waitFor(() => expect(campo).toHaveAttribute("aria-invalid", "true"))
    expect(campo).toHaveAccessibleDescription(/Mínimo 10 caracteres.*al menos 10 caracteres/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("ENLACE_INVALIDO en la invitación: mensaje propio, sin formulario y sin reintento", async () => {
    const fetchMock = stubFetch(() => errorJson(400, "ENLACE_INVALIDO"))
    const { router } = renderEnlace({
      pathname: "/establecer-contrasena",
      hash: `#token=${TOKEN}`,
    })
    await waitFor(() => expect(router.state.location.hash).toBe(""))

    llenarYEnviar("Activar mi cuenta")

    expect(
      await screen.findByText(
        "El enlace no es válido o ya venció. Pide uno nuevo en ¿Olvidaste tu contraseña? o acude a administración.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText("Contraseña nueva")).not.toBeInTheDocument()
    expect(llamadasA(fetchMock, "/api/auth/establecer-contrasena")).toBe(1)
    expect(llamadasA(fetchMock, "/api/auth/restablecer")).toBe(0)
  })

  it("400 VALIDACION del servidor: muestra su mensaje y conserva el formulario", async () => {
    stubFetch(() => errorJson(400, "VALIDACION"))
    const { router } = renderEnlace({ hash: `#token=${TOKEN}` })
    await waitFor(() => expect(router.state.location.hash).toBe(""))

    llenarYEnviar("Guardar contraseña")

    expect(await screen.findByRole("alert")).toHaveTextContent("mensaje del servidor")
    expect(screen.getByLabelText("Contraseña nueva")).toBeInTheDocument()
  })

  it("un 500 con el formato de error de la API no se confunde con un enlace inválido", async () => {
    stubFetch(() => errorJson(500, "ERROR_INTERNO"))
    const { router } = renderEnlace({ hash: `#token=${TOKEN}` })
    await waitFor(() => expect(router.state.location.hash).toBe(""))

    llenarYEnviar("Guardar contraseña")

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos completar la operación. Inténtalo de nuevo.",
    )
    expect(screen.getByLabelText("Contraseña nueva")).toBeInTheDocument()
  })
})

const CONFIRMACION_RECUPERAR =
  "Si hay una cuenta con ese correo, te enviamos un enlace. Revisa tu bandeja de entrada y la carpeta de spam. El enlace vence en 30 minutos."

const renderRecuperar = () => {
  const router = createMemoryRouter(
    [
      { path: "/recuperar", element: <RecuperarView /> },
      { path: "/login", element: <p>Pantalla de login</p> },
    ],
    { initialEntries: ["/recuperar"] },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const pedirEnlace = (correo: string) => {
  fireEvent.change(screen.getByLabelText("Correo"), { target: { value: correo } })
  fireEvent.click(screen.getByRole("button", { name: "Enviar enlace" }))
}

describe("ataque (AUTH-02b r1): /recuperar", () => {
  it("dos envíos en el mismo instante hacen una sola petición", async () => {
    const fetchMock = stubFetch(() => respuestaJson(204, undefined))
    renderRecuperar()

    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "ana@ejemplo.mx" } })
    const boton = screen.getByRole("button", { name: "Enviar enlace" })
    fireEvent.click(boton)
    fireEvent.click(boton)

    expect(await screen.findByRole("status")).toHaveTextContent(CONFIRMACION_RECUPERAR)
    expect(llamadasA(fetchMock, "/api/auth/recuperar")).toBe(1)
  })

  it("la confirmación es idéntica y no repite el correo, sea cual sea", async () => {
    stubFetch(() => respuestaJson(204, undefined))
    renderRecuperar()

    pedirEnlace("  Nadie.Existe@Ejemplo.MX ")

    const estado = await screen.findByRole("status")
    expect(estado.textContent).toBe(CONFIRMACION_RECUPERAR)
    expect(document.body.textContent).not.toMatch(/nadie\.existe/i)
  })

  it("manda el correo recortado por el esquema de shared/, sin campos extra", async () => {
    const fetchMock = stubFetch(() => respuestaJson(204, undefined))
    renderRecuperar()

    pedirEnlace("  ana@ejemplo.mx  ")

    await screen.findByRole("status")
    const llamada = fetchMock.mock.calls.find(([r]) => String(r) === "/api/auth/recuperar")
    expect(JSON.parse(String(llamada?.[1]?.body))).toEqual({ email: "ana@ejemplo.mx" })
  })

  it("429 DEMASIADAS_SOLICITUDES: mensaje de una hora y el formulario sigue ahí", async () => {
    stubFetch(() => errorJson(429, "DEMASIADAS_SOLICITUDES"))
    renderRecuperar()

    pedirEnlace("ana@ejemplo.mx")

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ya pediste varios enlaces para este correo. Espera una hora e inténtalo de nuevo.",
    )
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("sin conexión: mensaje de conexión y no la confirmación", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() => Promise.reject(new TypeError("Failed to fetch"))),
    )
    renderRecuperar()

    pedirEnlace("ana@ejemplo.mx")

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos conectar")
    expect(screen.queryByText(CONFIRMACION_RECUPERAR)).not.toBeInTheDocument()
  })

  it("correo inválido: no envía, marca el campo y lo describe", () => {
    const fetchMock = stubFetch(() => respuestaJson(204, undefined))
    renderRecuperar()

    pedirEnlace("ana@")

    const campo = screen.getByLabelText("Correo")
    expect(campo).toHaveAttribute("aria-invalid", "true")
    expect(campo).toHaveAccessibleDescription("Escribe un correo válido")
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe("ataque (AUTH-02b r1): funciones puras y aviso del login", () => {
  it.each([
    ["toString"],
    ["__proto__"],
    ["constructor"],
    ["hasOwnProperty"],
    ["CONTRASENA-ACTUALIZADA"],
  ])("avisoDeLogin con aviso '%s' no muestra nada", (aviso) => {
    expect(avisoDeLogin({ aviso })).toBeNull()
  })

  it("avisoDeLogin con formas raras de estado no muestra nada", () => {
    expect(avisoDeLogin({ aviso: ["contrasena-actualizada"] })).toBeNull()
    expect(avisoDeLogin(JSON.parse('{"__proto__": {"aviso": "cuenta-activada"}}'))).toBeNull()
    expect(avisoDeLogin("contrasena-actualizada")).toBeNull()
    expect(avisoDeLogin(null)).toBeNull()
  })

  it("leerTokenDelFragmento con 10 KB o con saltos de línea devuelve null", () => {
    expect(leerTokenDelFragmento(`#token=${"a".repeat(10_240)}`)).toBeNull()
    expect(leerTokenDelFragmento(`#token=${TOKEN}\n`)).toBeNull()
    expect(leerTokenDelFragmento(`\n#token=${TOKEN}`)).toBeNull()
    expect(leerTokenDelFragmento(`#token=${TOKEN}`)).toBe(TOKEN)
  })

  it("requiereCambioDeContrasena no se engaña con un objeto que imita el código", () => {
    expect(requiereCambioDeContrasena({ codigo: "CAMBIO_DE_CONTRASENA_REQUERIDO" })).toBe(false)
    expect(
      requiereCambioDeContrasena(new ApiError("CAMBIO_DE_CONTRASENA_REQUERIDO", "x", 403)),
    ).toBe(true)
  })

  it("el login con un aviso desconocido en location.state no muestra role=status", () => {
    const router = createMemoryRouter([{ path: "/login", element: <LoginView /> }], {
      initialEntries: [{ pathname: "/login", state: { aviso: "toString" } }],
    })
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    expect(screen.getByRole("heading", { name: "CMEP Campus Digital" })).toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })
})
