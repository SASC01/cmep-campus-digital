import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { StrictMode, type ReactNode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// Ataque del Tester (ADMIN-01f, ronda 2), puntos 1, 3, 4, 6 y 7 de la verificación de la corrección
// de la ronda 1 del manager: la raíz frente al botón sustituto (con incluirDialogos), los estados
// vecinos de T-01 (la elección propia del estado de pago) y de T-02 (Escape y el historial en el
// mismo turno; abrir y cerrar el diálogo varias veces), P-2 (el error de corregir el correo de A no
// aparece en B) y D-6 (un solo mensaje entre restablecer y corregir). Router real (rutas de
// app/router) y un QueryClient con la configuración de app/providers.tsx.

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

// La recarga de la ficha que llega tarde (después de «Guardar»): queda en vuelo hasta soltarla.
const recargaLenta: { activa: boolean; pendientes: (() => void)[]; soltar: () => void } = {
  activa: false,
  pendientes: [],
  soltar: () => {
    recargaLenta.activa = false
    for (const soltar of recargaLenta.pendientes.splice(0)) soltar()
  },
}
const correoConError = { activo: false }
const restablecerConError = { activo: false }

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
    if (metodo === "GET" && ficha && recargaLenta.activa) {
      const id = ficha[1]
      return new Promise<Response>((resolver) => {
        recargaLenta.pendientes.push(() => {
          const cuenta = [ANA, BETO].find((u) => u.id === id)
          resolver(
            cuenta ? respuestaJson(200, filaDe(cuenta)) : errorJson(404, "USUARIO_NO_ENCONTRADO"),
          )
        })
      })
    }
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
    const activo = /^\/api\/admin\/usuarios\/([^/]+)\/activo$/.exec(ruta)
    if (metodo === "PUT" && activo) {
      const cuenta = [ANA, BETO].find((u) => u.id === activo[1])
      if (!cuenta) return Promise.resolve(errorJson(404, "USUARIO_NO_ENCONTRADO"))
      const cuerpo = JSON.parse(String(init?.body)) as { activo: boolean }
      cuenta.activo = cuerpo.activo
      return Promise.resolve(respuestaJson(200, filaDe(cuenta)))
    }
    if (metodo === "PUT" && ruta === "/api/admin/alumnos/estado-pago") {
      const cuerpo = JSON.parse(String(init?.body)) as {
        alumnoIds: string[]
        estadoPago: "al_corriente" | "deudor"
      }
      for (const id of cuerpo.alumnoIds) {
        const estado = servidor[id] ?? { estadoPago: "al_corriente", accesoRestringido: false }
        servidor[id] = { ...estado, estadoPago: cuerpo.estadoPago }
      }
      return Promise.resolve(respuestaJson(200, { actualizados: cuerpo.alumnoIds.length }))
    }
    if (metodo === "PUT" && ruta.endsWith("/correo") && correoConError.activo) {
      return Promise.resolve(errorJson(409, "CORREO_EN_USO"))
    }
    if (metodo === "POST" && ruta.endsWith("/restablecer-contrasena")) {
      if (restablecerConError.activo) return Promise.resolve(errorJson(500, "ERROR_INTERNO"))
      return Promise.resolve(respuestaJson(200, { contrasenaTemporal: "Kp7mWq4Rt9Xz" }))
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
  ANA.activo = true
  BETO.activo = true
  recargaLenta.activa = false
  recargaLenta.pendientes.splice(0)
  correoConError.activo = false
  restablecerConError.activo = false
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("ataque ADMIN-01f r2: la raíz frente al botón sustituto (punto 1)", () => {
  it.each([
    ["sin StrictMode", (hijo: ReactNode) => hijo],
    ["con StrictMode", (hijo: ReactNode) => <StrictMode>{hijo}</StrictMode>],
  ] as const)(
    "ADM-T2F01: %s, dar de baja desde el diálogo con éxito: el foco termina en «Reactivar», nunca en la raíz ni en <body>",
    async (_modo, envolver) => {
      stubFetch()
      await montar([`/admin/usuarios/${ANA.id}`], envolver)
      await fichaDe(ANA)
      fireEvent.click(screen.getByRole("button", { name: "Dar de baja" }))
      const dialogo = await screen.findByRole("dialog")
      const confirmar = within(dialogo).getByRole("button", { name: "Sí, dar de baja" })
      act(() => confirmar.focus())
      fireEvent.click(confirmar)
      const reactivar = await screen.findByRole("button", { name: "Reactivar" })
      await esperarUnMomento()
      expect(screen.queryByRole("dialog")).toBeNull()
      expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(reactivar)
    },
  )

  it.each([
    ["sin StrictMode", (hijo: ReactNode) => hijo],
    ["con StrictMode", (hijo: ReactNode) => <StrictMode>{hijo}</StrictMode>],
  ] as const)(
    "ADM-T2F02: %s, restringir desde el diálogo con éxito y después restablecer: el foco termina en «Restablecer acceso» y luego en «Restringir acceso»",
    async (_modo, envolver) => {
      stubFetch()
      await montar([`/admin/usuarios/${ANA.id}`], envolver)
      await fichaDe(ANA)
      fireEvent.click(screen.getByRole("button", { name: "Restringir acceso" }))
      const dialogo = await screen.findByRole("dialog")
      const confirmar = within(dialogo).getByRole("button", { name: "Sí, restringir" })
      act(() => confirmar.focus())
      fireEvent.click(confirmar)
      const restablecer = await screen.findByRole("button", { name: "Restablecer acceso" })
      await esperarUnMomento()
      expect(document.activeElement, `tras restringir, el foco quedó en ${describirFoco()}`).toBe(
        restablecer,
      )

      fireEvent.click(restablecer)
      const restringir = await screen.findByRole("button", { name: "Restringir acceso" })
      await esperarUnMomento()
      expect(document.activeElement, `tras restablecer, el foco quedó en ${describirFoco()}`).toBe(
        restringir,
      )
    },
  )
})

describe("ataque ADMIN-01f r2: estados vecinos de T-01 (punto 6)", () => {
  it("ADM-T2F03: una elección propia sin guardar se conserva cuando otra respuesta trae el mismo estado del servidor, y se pierde cuando el servidor trae justo esa elección", async () => {
    stubFetch()
    await montar([`/admin/usuarios/${ANA.id}`])
    await fichaDe(ANA)
    const formulario = await screen.findByRole("form", { name: "Estado de pago" })
    fireEvent.click(within(formulario).getByRole("button", { name: "Deudor" }))
    expect(await pagoElegido()).toBe("Deudor")

    // Otra respuesta del servidor con el mismo estado (al corriente): la elección se conserva.
    fireEvent.click(screen.getByRole("button", { name: "Restringir acceso" }))
    const dialogo = await screen.findByRole("dialog")
    fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, restringir" }))
    await screen.findByRole("button", { name: "Restablecer acceso" })
    await esperarUnMomento()
    expect(await pagoElegido(), "la elección sin guardar se perdió con otra respuesta").toBe(
      "Deudor",
    )

    // El servidor pasa a deudor por fuera y otra respuesta lo trae: sigue "Deudor" (ya es el del
    // servidor); después el servidor vuelve a al corriente por fuera y otra respuesta lo trae: el
    // control lo sigue, porque la elección ya no cuenta.
    servidor[ANA.id] = { estadoPago: "deudor", accesoRestringido: true }
    fireEvent.click(screen.getByRole("button", { name: "Restablecer acceso" }))
    await screen.findByRole("button", { name: "Restringir acceso" })
    await esperarUnMomento()
    expect(await pagoElegido()).toBe("Deudor")
    servidor[ANA.id] = { estadoPago: "al_corriente", accesoRestringido: false }
    fireEvent.click(screen.getByRole("button", { name: "Restringir acceso" }))
    const otro = await screen.findByRole("dialog")
    fireEvent.click(within(otro).getByRole("button", { name: "Sí, restringir" }))
    await screen.findByRole("button", { name: "Restablecer acceso" })
    await esperarUnMomento()
    expect(
      await pagoElegido(),
      "el servidor volvió a «Al corriente» y el control se quedó con una elección vieja",
    ).toBe("Al corriente")
  })

  it("ADM-T2F04: «Guardar» con éxito muestra lo guardado en cuanto el servidor lo confirma, aunque la recarga de la ficha tarde", async () => {
    stubFetch()
    await montar([`/admin/usuarios/${ANA.id}`])
    await fichaDe(ANA)
    const formulario = await screen.findByRole("form", { name: "Estado de pago" })
    fireEvent.click(within(formulario).getByRole("button", { name: "Deudor" }))
    recargaLenta.activa = true
    fireEvent.click(within(formulario).getByRole("button", { name: "Guardar" }))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Estado de pago actualizado"))
    await esperarUnMomento()
    expect(await pagoElegido(), "tras «Guardar», antes de la recarga").toBe("Deudor")
    await act(async () => {
      recargaLenta.soltar()
      await Promise.resolve()
    })
    await esperarUnMomento()
    expect(await pagoElegido(), "tras la recarga").toBe("Deudor")
  })
})

describe("ataque ADMIN-01f r2: estados vecinos de T-02 (punto 7)", () => {
  it("ADM-T2F05: el diálogo cerrado con Escape y, en el mismo turno, atrás del historial: el foco va a la raíz, nunca a <body>", async () => {
    stubFetch()
    const { router } = await montar([`/admin/usuarios/${BETO.id}`, `/admin/usuarios/${ANA.id}`])
    await fichaDe(ANA)
    fireEvent.click(screen.getByRole("button", { name: "Dar de baja" }))
    const dialogo = await screen.findByRole("dialog")
    await waitFor(() => expect(dialogo.contains(document.activeElement)).toBe(true))

    await act(async () => {
      fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" })
      await router.navigate(-1)
    })
    await fichaDe(BETO)
    await esperarUnMomento()
    expect(focoEnLaRaizDeLaCuenta(), `el foco quedó en ${describirFoco()}`).toBe(true)
  })

  it("ADM-T2F06: abrir y cerrar el diálogo tres veces y cambiar de cuenta con el foco en «Restablecer contraseña»: el foco va a la raíz, nunca a <body>", async () => {
    stubFetch()
    const { router } = await montar([`/admin/usuarios/${BETO.id}`, `/admin/usuarios/${ANA.id}`])
    await fichaDe(ANA)
    for (let vez = 0; vez < 3; vez += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Dar de baja" }))
      const dialogo = await screen.findByRole("dialog")
      fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    }
    const restablecer = screen.getByRole("button", { name: "Restablecer contraseña" })
    act(() => restablecer.focus())
    await navegar(router, -1)
    await fichaDe(BETO)
    await esperarUnMomento()
    expect(focoEnLaRaizDeLaCuenta(), `el foco quedó en ${describirFoco()}`).toBe(true)
  })
})

describe("ataque ADMIN-01f r2: P-2 y D-6 (puntos 3 y 4)", () => {
  it("ADM-T2F07: el error de corregir el correo de A no aparece en B (por navigate y por el historial)", async () => {
    stubFetch()
    correoConError.activo = true
    const { router } = await montar([`/admin/usuarios/${BETO.id}`, `/admin/usuarios/${ANA.id}`])
    await fichaDe(ANA)
    fireEvent.change(screen.getByLabelText("Correo correcto"), {
      target: { value: "otra@ejemplo.mx" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar correo" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ya existe una cuenta con ese correo.",
    )

    await navegar(router, -1)
    await fichaDe(BETO)
    expect(screen.queryByText("Ya existe una cuenta con ese correo.")).toBeNull()
    await navegar(router, `/admin/usuarios/${ANA.id}`)
    await fichaDe(ANA)
    expect(screen.queryByText("Ya existe una cuenta con ese correo.")).toBeNull()
  })

  it("ADM-T2F08: con el error de «Sí, restablecer» a la vista, un envío local inválido de «Corregir correo» deja un solo mensaje, y reabrir la confirmación no trae el error viejo", async () => {
    stubFetch()
    restablecerConError.activo = true
    await montar([`/admin/usuarios/${ANA.id}`])
    await fichaDe(ANA)
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }))
    expect(await screen.findByRole("alert")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Correo correcto"), {
      target: { value: "no-es-correo" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar correo" }))
    await esperarUnMomento()
    const mensajes =
      screen.queryAllByRole("alert").length +
      document.querySelectorAll('[aria-invalid="true"]').length
    expect(mensajes, "con el envío local inválido debe leerse un solo mensaje").toBe(1)

    // Si la confirmación sigue abierta, se cierra; después se reabre.
    const cancelar = screen.queryByRole("button", { name: "Cancelar" })
    if (cancelar !== null) fireEvent.click(cancelar)
    fireEvent.click(await screen.findByRole("button", { name: "Restablecer contraseña" }))
    await esperarUnMomento()
    expect(
      screen.queryAllByRole("alert"),
      "al reabrir la confirmación volvió el error viejo",
    ).toHaveLength(0)
  })
})
