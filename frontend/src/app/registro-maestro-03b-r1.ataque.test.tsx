import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Ataques del Tester (AUTH-03b, ronda 1) contra /registro-maestro (§D-B6: fragmento, envío, errores
// y caché), /admin/maestros dentro del marco del admin (dos destinos, contexto opaco) y las
// guardas de esa ruta para los demás roles. Router completo y API simulada con fetch; se localiza
// por rol, etiqueta y texto accesible.

const navegacion = vi.hoisted(() => ({ ruta: "/login" }))

vi.mock("@/services/navegacion", () => ({
  irA: vi.fn(),
  rutaActual: vi.fn(() => navegacion.ruta),
}))

const TOKEN = `Rm03bR1${"z".repeat(36)}`
const CONTRASENA = "clave-del-maestro-03b-r1"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: cuerpo === undefined ? {} : { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const meDe = (extra: Record<string, unknown> = {}) => ({
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Luis Pérez",
  email: "luis@ejemplo.mx",
  rol: "maestro",
  debeCambiarContrasena: false,
  accesoRestringido: false,
  ...extra,
})

type Manejador = (ruta: string, init: RequestInit | undefined) => Response | Promise<Response>

const stubFetch = (manejador: Manejador) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) =>
    Promise.resolve(manejador(String(entrada), init)),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const llamadasA = (fetchMock: ReturnType<typeof stubFetch>, fragmento: string) =>
  fetchMock.mock.calls.filter(([entrada]) => String(entrada).includes(fragmento))

const renderEn = async (ruta: string) => {
  navegacion.ruta = ruta
  const { rutas } = await import("./router")
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, queryClient }
}

const volcadoDeLaCache = (queryClient: QueryClient): string =>
  JSON.stringify({
    consultas: queryClient
      .getQueryCache()
      .getAll()
      .map((consulta) => ({ clave: consulta.queryKey, estado: consulta.state })),
    mutaciones: queryClient
      .getMutationCache()
      .getAll()
      .map((mutacion) => ({ clave: mutacion.options.mutationKey, estado: mutacion.state })),
  })

const esperarUnMomento = () => act(() => new Promise((resolver) => setTimeout(resolver, 50)))

const escribir = (etiqueta: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })

const sinSesion = (ruta: string) => {
  if (ruta === "/api/auth/refrescar") return errorJson(401, "SESION_INVALIDA")
  return errorJson(401, "NO_AUTENTICADO")
}

const llenarYEnviar = async () => {
  await screen.findByRole("button", { name: "Crear mi cuenta" })
  escribir("Nombre completo", "Luis Pérez")
  escribir("Correo", "luis@ejemplo.mx")
  escribir("Contraseña", CONTRASENA)
  fireEvent.click(screen.getByRole("button", { name: "Crear mi cuenta" }))
}

beforeAll(async () => {
  await import("./router")
}, 60_000)

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe("ataque (AUTH-03b r1): /registro-maestro", () => {
  it("limpia el fragmento del historial al montar y el token no se pinta", async () => {
    stubFetch(sinSesion)
    const { router } = await renderEn(`/registro-maestro#token=${TOKEN}`)
    await screen.findByRole("button", { name: "Crear mi cuenta" })
    await esperarUnMomento()

    expect(router.state.location.pathname).toBe("/registro-maestro")
    expect(router.state.location.hash).toBe("")
    expect(document.body.innerHTML).not.toContain(TOKEN)
  })

  it("sin token: el mensaje de enlace inválido, sin formulario ni petición de registro", async () => {
    const fetchMock = stubFetch(sinSesion)
    await renderEn("/registro-maestro")
    expect(
      await screen.findByText(
        "Este enlace de registro no es válido, ya venció o fue revocado. Pide uno nuevo a administración.",
      ),
    ).toBeVisible()
    expect(screen.queryByLabelText("Contraseña")).toBeNull()
    expect(llamadasA(fetchMock, "/api/auth/registro-maestro")).toHaveLength(0)
  })

  it("envío correcto: el cuerpo lleva exactamente nombre, email, contrasena y token; llega a /maestro y nada queda en la caché", async () => {
    let conSesion = false
    const fetchMock = stubFetch((ruta) => {
      if (ruta === "/api/auth/registro-maestro") {
        conSesion = true
        return respuestaJson(201, { tokenAcceso: "t" })
      }
      if (ruta === "/api/me" && conSesion) return respuestaJson(200, meDe())
      return sinSesion(ruta)
    })
    const { router, queryClient } = await renderEn(`/registro-maestro#token=${TOKEN}`)
    await llenarYEnviar()
    await waitFor(() => expect(router.state.location.pathname).toBe("/maestro"))
    await esperarUnMomento()

    const [llamada] = llamadasA(fetchMock, "/api/auth/registro-maestro")
    const cuerpo = JSON.parse(String(llamada?.[1]?.body ?? "{}")) as Record<string, unknown>
    expect(cuerpo).toEqual({
      nombre: "Luis Pérez",
      email: "luis@ejemplo.mx",
      contrasena: CONTRASENA,
      token: TOKEN,
    })
    const volcado = volcadoDeLaCache(queryClient)
    expect(volcado).not.toContain(CONTRASENA)
    expect(volcado).not.toContain(TOKEN)
    expect(window.localStorage.length + window.sessionStorage.length).toBe(0)
  })

  it("ENLACE_INVALIDO al enviar: el mensaje de enlace inválido, sin formulario, y ni la contraseña ni el token en la caché", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/auth/registro-maestro") return errorJson(400, "ENLACE_INVALIDO")
      return sinSesion(ruta)
    })
    const { queryClient } = await renderEn(`/registro-maestro#token=${TOKEN}`)
    await llenarYEnviar()
    expect(
      await screen.findByText(
        "Este enlace de registro no es válido, ya venció o fue revocado. Pide uno nuevo a administración.",
      ),
    ).toBeVisible()
    await esperarUnMomento()
    expect(screen.queryByLabelText("Contraseña")).toBeNull()
    const volcado = volcadoDeLaCache(queryClient)
    expect(volcado).not.toContain(CONTRASENA)
    expect(volcado).not.toContain(TOKEN)
  })

  it("CORREO_EN_USO: alerta, se queda en el formulario y la contraseña fuera de la caché", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/auth/registro-maestro") return errorJson(409, "CORREO_EN_USO")
      return sinSesion(ruta)
    })
    const { router, queryClient } = await renderEn(`/registro-maestro#token=${TOKEN}`)
    await llenarYEnviar()
    expect(await screen.findByRole("alert")).toBeVisible()
    await esperarUnMomento()
    expect(router.state.location.pathname).toBe("/registro-maestro")
    expect(screen.getByRole("button", { name: "Crear mi cuenta" })).toBeVisible()
    expect(volcadoDeLaCache(queryClient)).not.toContain(CONTRASENA)
  })

  it("clic triple y los dos envíos del formulario con la petición en vuelo: una sola petición", async () => {
    const fetchMock = stubFetch((ruta) => {
      if (ruta === "/api/auth/registro-maestro") return new Promise<Response>(() => undefined)
      return sinSesion(ruta)
    })
    await renderEn(`/registro-maestro#token=${TOKEN}`)
    await llenarYEnviar()
    const crear = screen.getByRole("button", { name: "Crear mi cuenta" })
    fireEvent.click(crear)
    fireEvent.click(crear)
    const formulario = crear.closest("form")
    if (!formulario) throw new Error("el botón no está en un formulario")
    fireEvent.submit(formulario)
    act(() => formulario.requestSubmit())
    await esperarUnMomento()
    expect(llamadasA(fetchMock, "/api/auth/registro-maestro")).toHaveLength(1)
    expect(crear).toHaveAttribute("aria-busy", "true")
  })
})

describe("ataque (AUTH-03b r1): /admin/maestros en el marco del admin", () => {
  const admin = () => respuestaJson(200, meDe({ rol: "admin", nombre: "Administración" }))

  it("'Maestros' activo y 'Cuentas' no; todo lo de la vista cuelga del contexto opaco y denso", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
      if (ruta === "/api/me") return admin()
      if (ruta.startsWith("/api/admin/enlaces-registro?")) {
        return respuestaJson(200, { enlaces: [], siguienteCursor: null })
      }
      return errorJson(500, "ERROR_INTERNO")
    })
    await renderEn("/admin/maestros")
    await screen.findByRole("button", { name: "Generar el primer enlace" })
    const nav = screen.getByRole("navigation", { name: "Navegación principal" })
    const enlaces = within(nav).getAllByRole("link")
    // CLASES-02 ronda 0 de 02c (C-14, Enmienda 1, M-04): el admin suma "Clases" (/admin/clases),
    // que no queda activo en /admin/maestros. Sigue protegiendo que en /admin/maestros solo
    // "Maestros" lleve aria-current.
    expect(enlaces.map((a) => [a.textContent, a.getAttribute("aria-current")])).toEqual([
      ["Cuentas", null],
      ["Maestros", "page"],
      ["Clases", null],
    ])
    expect(screen.getByRole("heading", { level: 1, name: "Maestros" })).toBeVisible()
    const controles = [
      ...screen.getAllByRole("button"),
      ...Array.from(document.querySelectorAll<HTMLElement>("input")),
      ...screen.getAllByRole("heading"),
    ]
    expect(controles.length).toBeGreaterThan(4)
    for (const control of controles) {
      expect(control.closest('[data-material="opaco"]'), control.textContent ?? "").not.toBeNull()
      expect(control.closest('[data-densidad="densa"]'), control.textContent ?? "").not.toBeNull()
    }
  })

  it.each([
    {
      quien: "un estudiante",
      me: () => respuestaJson(200, meDe({ rol: "estudiante" })),
      final: "/estudiante",
    },
    { quien: "un maestro", me: () => respuestaJson(200, meDe()), final: "/maestro" },
    {
      quien: "un estudiante restringido",
      me: () => respuestaJson(200, meDe({ rol: "estudiante", accesoRestringido: true })),
      final: "/acceso-restringido",
    },
    { quien: "alguien sin sesión", me: () => errorJson(401, "NO_AUTENTICADO"), final: "/login" },
  ])(
    "$quien que abre /admin/maestros termina en $final sin pedir los enlaces",
    async ({ me, final }) => {
      const fetchMock = stubFetch((ruta) => {
        if (ruta === "/api/auth/refrescar") {
          return final === "/login"
            ? errorJson(401, "SESION_INVALIDA")
            : respuestaJson(200, { tokenAcceso: "t" })
        }
        if (ruta === "/api/me") return me()
        return errorJson(500, "ERROR_INTERNO")
      })
      const { router } = await renderEn("/admin/maestros")
      await waitFor(() => expect(router.state.location.pathname).toBe(final))
      await esperarUnMomento()
      expect(llamadasA(fetchMock, "/api/admin/")).toHaveLength(0)
      expect(screen.queryByRole("button", { name: "Generar enlace" })).toBeNull()
    },
  )
})
