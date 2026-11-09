import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { StrictMode, type ReactNode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// Ataque del Tester (ADMIN-01f, ronda 1), puntos 1, 6, 8 y 9 de la verificación de la corrección
// del manager: el foco entre fichas con un diálogo abierto o en "Correo correcto" y el historial
// (M-20); 408 y 429 en la ficha (D-2, sin reintento); las peticiones de /admin (C-45 y C-46); y el
// estado de pago de la ficha cuando la cuenta cambia fuera de ella (M-22, "desde otra pestaña"). Router
// real (rutas de app/router) y un QueryClient con la configuración de app/providers.tsx.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin") }))

const ANA = {
  id: "a1a2b3c4-1111-4b8e-9a1e-0f2a3b4c5d01",
  nombre: "Ana Ruiz",
  email: "ana@ejemplo.mx",
  rol: "estudiante",
  activo: true,
}
const BETO = {
  id: "b1a2b3c4-2222-4b8e-9a1e-0f2a3b4c5d02",
  nombre: "Beto Díaz",
  email: "beto@ejemplo.mx",
  rol: "estudiante",
  activo: true,
}

type Cuenta = typeof ANA

// Lo que el servidor guarda hoy de cada alumno; un caso lo cambia "desde otra pestaña".
const servidor: Record<
  string,
  { estadoPago: "al_corriente" | "deudor"; accesoRestringido: boolean }
> = {}

const filaDe = (cuenta: Cuenta) => {
  const estado = servidor[cuenta.id] ?? { estadoPago: "al_corriente", accesoRestringido: false }
  return {
    ...cuenta,
    creadoEn: "2026-09-01T15:00:00.000Z",
    estadoPago: estado.estadoPago,
    fechaEstadoPago: null,
    accesoRestringido: estado.accesoRestringido,
    motivoRestriccion: null,
    fechaRestriccion: estado.accesoRestringido ? "2026-11-09T15:00:00.000Z" : null,
  }
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const ME_ADMIN = {
  id: "d9a8c3c2-3333-4da0-9c3a-2b4c5d6e7f80",
  nombre: "Administración",
  email: "admin@ejemplo.mx",
  rol: "admin",
  debeCambiarContrasena: false,
  accesoRestringido: false,
}

let llamadas: { metodo: string; ruta: string }[] = []
let fichaConError: { id: string; respuesta: () => Response } | null = null

const stubFetch = () => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
    const ruta = String(entrada)
    const metodo = init?.method ?? "GET"
    llamadas.push({ metodo, ruta })
    if (ruta === "/api/auth/refrescar")
      return Promise.resolve(respuestaJson(200, { tokenAcceso: "t" }))
    if (ruta === "/api/me") return Promise.resolve(respuestaJson(200, ME_ADMIN))
    if (metodo === "GET" && ruta === "/api/admin/resumen") {
      return Promise.resolve(respuestaJson(200, { alumnos: 2, maestros: 1, clasesActivas: 3 }))
    }
    if (metodo === "GET" && /^\/api\/admin\/usuarios(\?|$)/.test(ruta)) {
      return Promise.resolve(
        respuestaJson(200, {
          usuarios: [ANA, BETO].map(filaDe),
          siguienteCursor: null,
          siguienteCursorNombre: null,
        }),
      )
    }
    const ficha = /^\/api\/admin\/usuarios\/([^/?]+)$/.exec(ruta)
    if (metodo === "GET" && ficha) {
      const conError = fichaConError
      if (conError !== null && conError.id === ficha[1])
        return Promise.resolve(conError.respuesta())
      const cuenta = [ANA, BETO].find((u) => u.id === ficha[1])
      if (cuenta) return Promise.resolve(respuestaJson(200, filaDe(cuenta)))
      return Promise.resolve(errorJson(404, "USUARIO_NO_ENCONTRADO"))
    }
    const acceso = /^\/api\/admin\/alumnos\/([^/]+)\/acceso$/.exec(ruta)
    if (metodo === "PUT" && acceso) {
      const cuenta = [ANA, BETO].find((u) => u.id === acceso[1])
      if (!cuenta) return Promise.resolve(errorJson(404, "USUARIO_NO_ENCONTRADO"))
      const cuerpo = JSON.parse(String(init?.body)) as { restringido: boolean }
      const estado = servidor[cuenta.id] ?? { estadoPago: "al_corriente", accesoRestringido: false }
      servidor[cuenta.id] = { ...estado, accesoRestringido: cuerpo.restringido }
      return Promise.resolve(respuestaJson(200, filaDe(cuenta)))
    }
    return Promise.resolve(errorJson(500, "ERROR_INTERNO", "no esperada"))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const montar = async (
  entradas: string[],
  envolver: (hijo: ReactNode) => ReactNode = (hijo) => hijo,
) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, {
    initialEntries: entradas,
    initialIndex: entradas.length - 1,
  })
  // La configuración de app/providers.tsx (sin el Toaster, que el doble de sonner sustituye).
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })
  render(
    envolver(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  )
  return { router, queryClient }
}

const navegar = async (
  router: Awaited<ReturnType<typeof montar>>["router"],
  destino: string | number,
) => {
  await act(async () => {
    if (typeof destino === "number") await router.navigate(destino)
    else await router.navigate(destino)
  })
}

const fichaDe = (cuenta: Cuenta) => screen.findByRole("region", { name: cuenta.nombre })

const esperarUnMomento = () => act(() => new Promise((resolver) => setTimeout(resolver, 60)))

const describirFoco = () => {
  const activo = document.activeElement
  if (activo === null || activo === document.body) return "<body>"
  return `${activo.tagName.toLowerCase()} "${(activo.textContent ?? "").slice(0, 40)}"`
}

// La raíz de la vista de la cuenta: el contenedor enfocable (tabIndex -1) que tiene el h1 "Usuarios".
const focoEnLaRaizDeLaCuenta = () => {
  const activo = document.activeElement
  if (!(activo instanceof HTMLElement) || activo === document.body) return false
  return (
    activo.tabIndex === -1 &&
    within(activo).queryByRole("heading", { level: 1, name: "Usuarios" }) !== null
  )
}

const pagoElegido = async (): Promise<string> => {
  const formulario = await screen.findByRole("form", { name: "Estado de pago" })
  const pulsado = within(formulario)
    .getAllByRole("button")
    .find((boton) => boton.getAttribute("aria-pressed") === "true")
  return pulsado?.textContent?.trim() ?? "(ninguno)"
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  llamadas = []
  fichaConError = null
  for (const clave of Object.keys(servidor)) Reflect.deleteProperty(servidor, clave)
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("ataque ADMIN-01f r1: el estado de pago de la ficha cuando la cuenta cambia fuera de ella (punto 9)", () => {
  it("ADM-T1F01: con la ficha abierta, la cuenta pasa a deudora en otra pestaña y la respuesta de «Restringir acceso» trae ese estado: el control lo muestra", async () => {
    stubFetch()
    await montar([`/admin/usuarios/${ANA.id}`])
    await fichaDe(ANA)
    expect(await pagoElegido()).toBe("Al corriente")

    // Otra pestaña (u otro admin) la marca deudora; esta ficha no se entera hasta la siguiente
    // respuesta del servidor sobre la cuenta.
    servidor[ANA.id] = { estadoPago: "deudor", accesoRestringido: false }
    fireEvent.click(screen.getByRole("button", { name: "Restringir acceso" }))
    const dialogo = await screen.findByRole("dialog")
    fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, restringir" }))
    await screen.findByRole("button", { name: "Restablecer acceso" })
    await esperarUnMomento()

    expect(
      await pagoElegido(),
      "la ficha ya tiene la cuenta deudora (respuesta del servidor) y el control sigue diciendo «Al corriente»",
    ).toBe("Deudor")
  })

  it("ADM-T1F02: la ficha vuelve a abrirse pasado el staleTime, la cuenta cambió entretanto y la recarga trae «Deudor»: el control lo muestra", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    stubFetch()
    const { router } = await montar([`/admin/usuarios/${ANA.id}`])
    await fichaDe(ANA)
    expect(await pagoElegido()).toBe("Al corriente")

    await navegar(router, "/admin/usuarios")
    await screen.findByRole("heading", { level: 1, name: "Usuarios" })
    servidor[ANA.id] = { estadoPago: "deudor", accesoRestringido: false }
    vi.setSystemTime(new Date(Date.now() + 31_000))
    const antes = llamadas.filter((l) => l.ruta === `/api/admin/usuarios/${ANA.id}`).length

    await navegar(router, `/admin/usuarios/${ANA.id}`)
    await fichaDe(ANA)
    await waitFor(() =>
      expect(llamadas.filter((l) => l.ruta === `/api/admin/usuarios/${ANA.id}`).length).toBe(
        antes + 1,
      ),
    )
    await esperarUnMomento()

    expect(
      await pagoElegido(),
      "la recarga trajo «Deudor» y el control se quedó en el estado de la caché",
    ).toBe("Deudor")
  })
})

describe("ataque ADMIN-01f r1: el foco entre fichas con el historial (punto 1)", () => {
  it("ADM-T1F03: con el diálogo «Dar de baja» abierto, atrás del historial a otra ficha: el foco va a la raíz de la vista, nunca a <body>", async () => {
    stubFetch()
    const { router } = await montar([`/admin/usuarios/${BETO.id}`, `/admin/usuarios/${ANA.id}`])
    await fichaDe(ANA)
    fireEvent.click(screen.getByRole("button", { name: "Dar de baja" }))
    const dialogo = await screen.findByRole("dialog")
    await waitFor(() => expect(dialogo.contains(document.activeElement)).toBe(true))

    await navegar(router, -1)
    await fichaDe(BETO)
    await esperarUnMomento()

    expect(screen.queryByRole("dialog")).toBeNull()
    expect(focoEnLaRaizDeLaCuenta(), `el foco quedó en ${describirFoco()}`).toBe(true)
  })

  it("ADM-T1F04: con el diálogo «Restringir acceso» abierto y el motivo a medias, atrás del historial: el foco va a la raíz, nunca a <body>", async () => {
    stubFetch()
    const { router } = await montar([`/admin/usuarios/${BETO.id}`, `/admin/usuarios/${ANA.id}`])
    await fichaDe(ANA)
    fireEvent.click(screen.getByRole("button", { name: "Restringir acceso" }))
    const dialogo = await screen.findByRole("dialog")
    const motivo = within(dialogo).getByLabelText("Motivo (opcional)")
    act(() => motivo.focus())
    fireEvent.change(motivo, { target: { value: "Adeudo de" } })

    await navegar(router, -1)
    await fichaDe(BETO)
    await esperarUnMomento()

    expect(screen.queryByRole("dialog")).toBeNull()
    expect(focoEnLaRaizDeLaCuenta(), `el foco quedó en ${describirFoco()}`).toBe(true)
  })

  it("ADM-T1F05: con el foco en «Correo correcto», atrás y adelante del historial dos veces: el foco va a la raíz en cada cambio", async () => {
    stubFetch()
    const { router } = await montar([`/admin/usuarios/${BETO.id}`, `/admin/usuarios/${ANA.id}`])
    await fichaDe(ANA)
    for (const [paso, cuenta] of [
      [-1, BETO],
      [1, ANA],
      [-1, BETO],
      [1, ANA],
    ] as const) {
      const campo = screen.getByLabelText("Correo correcto")
      act(() => campo.focus())
      fireEvent.change(campo, { target: { value: "a@b" } })
      await navegar(router, paso)
      await fichaDe(cuenta)
      await esperarUnMomento()
      expect(
        focoEnLaRaizDeLaCuenta(),
        `tras ${String(paso)} el foco quedó en ${describirFoco()}`,
      ).toBe(true)
    }
  })

  it("ADM-T1F06: A → una cuenta que no existe (404) → atrás, con el foco en «Copiar» de la temporal... o en «Restablecer contraseña»: el foco nunca queda en <body>", async () => {
    stubFetch()
    const { router } = await montar([`/admin/usuarios/${ANA.id}`])
    await fichaDe(ANA)
    const restablecer = screen.getByRole("button", { name: "Restablecer contraseña" })
    act(() => restablecer.focus())

    await navegar(router, "/admin/usuarios/e1a2b3c4-4444-4eb1-8d4b-3c5d6e7f8091")
    expect(await screen.findByText("Esa cuenta ya no existe.")).toBeInTheDocument()
    await esperarUnMomento()
    expect(focoEnLaRaizDeLaCuenta(), `tras el 404 el foco quedó en ${describirFoco()}`).toBe(true)

    const volver = screen.getByRole("link", { name: "Volver a Usuarios" })
    act(() => volver.focus())
    await navegar(router, -1)
    await fichaDe(ANA)
    await esperarUnMomento()
    expect(focoEnLaRaizDeLaCuenta(), `tras atrás el foco quedó en ${describirFoco()}`).toBe(true)
  })
})

describe("ataque ADMIN-01f r1: 408 y 429 en la ficha (punto 6, D-2)", () => {
  it.each([408, 429])(
    "ADM-T1F07: la ficha con %i: una sola petición, el texto fijo de carga, sin aviso ni «Esa cuenta ya no existe»; volver a abrirla la pide otra vez y con 200 se ve",
    async (estado) => {
      stubFetch()
      fichaConError = {
        id: ANA.id,
        respuesta: () =>
          errorJson(estado, estado === 429 ? "DEMASIADAS_SOLICITUDES" : "TIEMPO_AGOTADO"),
      }
      const { router } = await montar([`/admin/usuarios/${ANA.id}`])
      expect(
        await screen.findByText(
          "No pudimos cargar la cuenta. Revisa tu conexión e inténtalo de nuevo.",
        ),
      ).toBeInTheDocument()
      await esperarUnMomento()
      expect(llamadas.filter((l) => l.ruta === `/api/admin/usuarios/${ANA.id}`)).toHaveLength(1)
      expect(screen.queryByText("Esa cuenta ya no existe.")).toBeNull()
      expect(aviso.error).not.toHaveBeenCalled()

      fichaConError = null
      await navegar(router, "/admin/usuarios")
      await screen.findByRole("heading", { level: 1, name: "Usuarios" })
      await navegar(router, `/admin/usuarios/${ANA.id}`)
      await fichaDe(ANA)
      expect(
        screen.queryByText("No pudimos cargar la cuenta. Revisa tu conexión e inténtalo de nuevo."),
      ).toBeNull()
    },
  )
})

describe("ataque ADMIN-01f r1: /admin pide solo el resumen (punto 8, C-45 y C-46)", () => {
  it.each([
    ["sin StrictMode", (hijo: ReactNode) => hijo],
    ["con StrictMode", (hijo: ReactNode) => <StrictMode>{hijo}</StrictMode>],
  ] as const)(
    "ADM-T1F08: %s, /admin pide GET /api/admin/resumen una sola vez y nada más de /api/admin/",
    async (_nombre, envolver) => {
      stubFetch()
      await montar(["/admin"], envolver)
      expect(await screen.findByText("Clases activas")).toBeInTheDocument()
      await esperarUnMomento()
      const delAdmin = llamadas.filter((l) => l.ruta.startsWith("/api/admin/"))
      expect(delAdmin).toEqual([{ metodo: "GET", ruta: "/api/admin/resumen" }])
    },
  )
})
