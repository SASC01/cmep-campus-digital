import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// Ataques del Tester (AUTH-02b, ronda 1) contra DEC-19: la pantalla provisional de cuentas del
// admin. Temporal visible una sola vez y fuera de la caché, confirmación en línea, cuenta admin sin
// "Restablecer", portapapeles que falla, errores del servidor, doble clic y reglas de módulos.
// ADMIN-01f ronda 0 (C-13, C-13b y C-44; §D-R0 01f y §D-11): la pantalla provisional (CuentasView y
// POST /admin/usuarios/buscar) se borra. Cada caso monta ahora la ficha /admin/usuarios/:usuarioId
// con el router real (GET /admin/usuarios/:id) y la busca por su región con nombre (E-24); "buscar
// otra cuenta" pasa a abrir la ficha de otra cuenta, y "buscar con un correo rechazado" pasa a abrir
// /admin/usuarios/abc (400 VALIDACION, ADM-1F26). "Invitar maestro" vive en /admin/maestros. Lo que
// protege cada caso no cambia.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin") }))

const TEMPORAL = "Kp7mWq4Rt9Xz"
const TEMPORAL_2 = "Hn3vBc8Lq2Ps"
const NO_EXISTE = "Esa cuenta ya no existe."

const carla = {
  id: "b7e6a1a0-1111-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Carla Ruiz",
  email: "carla@ejemplo.mx",
  rol: "maestro",
  activo: true,
}

const beto = {
  id: "c8f7b2b1-2222-4c9f-8b2f-1a3b4c5d6e7f",
  nombre: "Beto Díaz",
  email: "beto@ejemplo.mx",
  rol: "estudiante",
  activo: false,
}

const admin = {
  id: "d9a8c3c2-3333-4da0-9c3a-2b4c5d6e7f80",
  nombre: "Administración",
  email: "admin@ejemplo.mx",
  rol: "admin",
  activo: true,
}

type Cuenta = typeof carla

const ID_INEXISTENTE = "e1a2b3c4-4444-4eb1-8d4b-3c5d6e7f8091"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

// La fila de GET /admin/usuarios/:id: los datos de alumno solo en estudiantes (RN-02).
const filaDe = (cuenta: Cuenta) => ({
  ...cuenta,
  creadoEn: "2026-09-01T15:00:00.000Z",
  ...(cuenta.rol === "estudiante"
    ? {
        estadoPago: "al_corriente",
        fechaEstadoPago: null,
        accesoRestringido: false,
        motivoRestriccion: null,
        fechaRestriccion: null,
      }
    : {}),
})

const ME_ADMIN = {
  id: admin.id,
  nombre: admin.nombre,
  email: admin.email,
  rol: "admin",
  debeCambiarContrasena: false,
  accesoRestringido: false,
}

type Manejador = (ruta: string, init?: RequestInit) => Response | null

// El marco del admin y la ficha: sesión, /me, la lista y la cuenta por id. Lo demás lo decide el
// caso; lo que nadie responde es un 500.
const stubFetch = (manejador: Manejador) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
    const ruta = String(entrada)
    const metodo = init?.method ?? "GET"
    if (ruta === "/api/auth/refrescar")
      return Promise.resolve(respuestaJson(200, { tokenAcceso: "t" }))
    if (ruta === "/api/me") return Promise.resolve(respuestaJson(200, ME_ADMIN))
    const propia = manejador(ruta, init)
    if (propia !== null) return Promise.resolve(propia)
    if (metodo === "GET" && /^\/api\/admin\/usuarios(\?|$)/.test(ruta)) {
      return Promise.resolve(
        respuestaJson(200, {
          usuarios: [carla, beto, admin].map(filaDe),
          siguienteCursor: null,
          siguienteCursorNombre: null,
        }),
      )
    }
    const ficha = /^\/api\/admin\/usuarios\/([^/?]+)$/.exec(ruta)
    if (metodo === "GET" && ficha) {
      const cuenta = [carla, beto, admin].find((u) => u.id === ficha[1])
      if (cuenta) return Promise.resolve(respuestaJson(200, filaDe(cuenta)))
      if (ficha[1] === "abc") {
        return Promise.resolve(
          errorJson(400, "VALIDACION", "id: id: debe ser un identificador válido"),
        )
      }
      return Promise.resolve(errorJson(404, "USUARIO_NO_ENCONTRADO"))
    }
    if (metodo === "GET" && ruta.startsWith("/api/admin/enlaces-registro")) {
      return Promise.resolve(respuestaJson(200, { enlaces: [], siguienteCursor: null }))
    }
    return Promise.resolve(errorJson(500, "ERROR_INTERNO"))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const llamadasQueContienen = (fetchMock: ReturnType<typeof stubFetch>, fragmento: string) =>
  fetchMock.mock.calls.filter(([entrada]) => String(entrada).includes(fragmento)).length

const cuerpoDe = (init: RequestInit | undefined): unknown => JSON.parse(String(init?.body))

const apiDeCuentas = (
  restablecer: () => Response = () => respuestaJson(200, { contrasenaTemporal: TEMPORAL }),
) =>
  stubFetch((ruta) => {
    if (ruta.endsWith("/restablecer-contrasena")) return restablecer()
    return null
  })

const fichaDe = (nombre: string) => screen.findByRole("region", { name: nombre })

const montar = async (entrada: string) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [entrada] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const vista = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { queryClient, vista, router }
}

// Antes: montar CuentasView y buscar por correo. Ahora: abrir la ficha de la cuenta.
const renderVista = async (cuenta: Cuenta = carla) => {
  const montada = await montar(`/admin/usuarios/${cuenta.id}`)
  await fichaDe(cuenta.nombre)
  return montada
}

const irA = async (router: Awaited<ReturnType<typeof montar>>["router"], ruta: string) => {
  await act(async () => {
    await router.navigate(ruta)
  })
}

const abrirFicha = async (router: Awaited<ReturnType<typeof montar>>["router"], cuenta: Cuenta) => {
  await irA(router, `/admin/usuarios/${cuenta.id}`)
  return fichaDe(cuenta.nombre)
}

const restablecerYVerTemporal = async (temporal = TEMPORAL) => {
  fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))
  fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }))
  await screen.findByText(temporal)
}

const contenidoDeLaCache = (queryClient: QueryClient): string =>
  JSON.stringify({
    consultas: queryClient
      .getQueryCache()
      .getAll()
      .map((consulta) => consulta.state),
    mutaciones: queryClient
      .getMutationCache()
      .getAll()
      .map((mutacion) => mutacion.state),
  })

const esperarUnMomento = () => act(() => new Promise((resolver) => setTimeout(resolver, 30)))

const ponerPortapapeles = (valor: unknown) => {
  Object.defineProperty(window.navigator, "clipboard", { value: valor, configurable: true })
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(window.navigator, "clipboard")
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("ataque (AUTH-02b r1): la temporal se ve una sola vez", () => {
  // ADMIN-01f (C-13): la ficha sí consulta la cuenta al montarse; lo que se protege es que no salga
  // ningún restablecimiento ni corrección sin un gesto del admin.
  it("al montar la ficha solo se pide la cuenta: ninguna petición de restablecer ni de corregir", async () => {
    const fetchMock = apiDeCuentas()
    await renderVista()
    await esperarUnMomento()
    expect(llamadasQueContienen(fetchMock, `/api/admin/usuarios/${carla.id}`)).toBeGreaterThan(0)
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(0)
    expect(llamadasQueContienen(fetchMock, "/correo")).toBe(0)
  })

  it("salir a la tabla y volver a abrir la MISMA cuenta hace desaparecer la temporal", async () => {
    apiDeCuentas()
    const { router } = await renderVista()
    await restablecerYVerTemporal()

    await irA(router, "/admin/usuarios")
    await abrirFicha(router, carla)

    await waitFor(() => expect(screen.queryByText(TEMPORAL)).not.toBeInTheDocument())
    expect(screen.getByRole("button", { name: "Restablecer contraseña" })).toBeInTheDocument()
  })

  it("abrir una cuenta que no existe (404) hace desaparecer la temporal", async () => {
    apiDeCuentas()
    const { router } = await renderVista()
    await restablecerYVerTemporal()

    await irA(router, `/admin/usuarios/${ID_INEXISTENTE}`)

    expect(await screen.findByText(NO_EXISTE)).toBeInTheDocument()
    expect(screen.queryByText(TEMPORAL)).not.toBeInTheDocument()
  })

  it("abrir /admin/usuarios/abc (id mal formado, 400 VALIDACION) hace desaparecer la temporal", async () => {
    const fetchMock = apiDeCuentas()
    const { router } = await renderVista()
    await restablecerYVerTemporal()

    await irA(router, "/admin/usuarios/abc")

    expect(await screen.findByText(NO_EXISTE)).toBeInTheDocument()
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(1)
    expect(
      screen.queryByText(TEMPORAL),
      "la temporal de Carla sigue en pantalla mientras el admin abre otra cuenta",
    ).not.toBeInTheDocument()
  })

  it("al salir de la pantalla, la temporal no queda en la caché de mutaciones (gcTime 0)", async () => {
    apiDeCuentas()
    const { queryClient, vista } = await renderVista()
    await restablecerYVerTemporal()

    vista.unmount()
    await esperarUnMomento()

    expect(contenidoDeLaCache(queryClient)).not.toContain(TEMPORAL)
  })

  it("al abrir otra cuenta, la temporal tampoco queda en la caché de mutaciones", async () => {
    apiDeCuentas()
    const { queryClient, router } = await renderVista()
    await restablecerYVerTemporal()

    await abrirFicha(router, beto)
    await esperarUnMomento()

    expect(screen.queryByText(TEMPORAL)).not.toBeInTheDocument()
    expect(contenidoDeLaCache(queryClient)).not.toContain(TEMPORAL)
  })

  it("restablecer dos veces seguidas en la misma ficha exige una confirmación nueva", async () => {
    let n = 0
    const fetchMock = apiDeCuentas(() => {
      n += 1
      return respuestaJson(200, { contrasenaTemporal: n === 1 ? TEMPORAL : TEMPORAL_2 })
    })
    await renderVista()
    await restablecerYVerTemporal()

    expect(screen.queryByRole("button", { name: "Sí, restablecer" })).not.toBeInTheDocument()
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(1)
  })
})

describe("ataque (AUTH-02b r1): confirmación en línea y cuenta admin", () => {
  it("la ficha de una cuenta admin no ofrece 'Restablecer' y explica por qué", async () => {
    const fetchMock = apiDeCuentas()
    await renderVista(admin)

    expect(screen.queryByRole("button", { name: "Restablecer contraseña" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Sí, restablecer" })).not.toBeInTheDocument()
    expect(
      screen.getByText("La contraseña del administrador se restablece desde el servidor."),
    ).toBeInTheDocument()
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(0)
  })

  it("la confirmación es en línea: sin role=dialog, y 'Cancelar' no hace ninguna petición", async () => {
    const fetchMock = apiDeCuentas()
    await renderVista()

    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))

    expect(
      screen.getByText(
        "Se cerrarán todas sus sesiones y tendrá que cambiar la contraseña al entrar.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(screen.getByRole("button", { name: "Restablecer contraseña" })).toBeInTheDocument()
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(0)
  })

  it("403 OPERACION_NO_PERMITIDA: mensaje propio, sin temporal y sin navegar", async () => {
    apiDeCuentas(() =>
      errorJson(403, "OPERACION_NO_PERMITIDA", "La contraseña del administrador se restablece…"),
    )
    const { router } = await renderVista()

    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La contraseña del administrador se restablece desde el servidor.",
    )
    expect(screen.queryByText("Contraseña temporal")).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/admin/usuarios/${carla.id}`)
  })

  it("404 al restablecer (la cuenta ya no existe): mensaje, sin temporal", async () => {
    apiDeCuentas(() => errorJson(404, "USUARIO_NO_ENCONTRADO"))
    await renderVista()

    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No hay ninguna cuenta con ese correo.",
    )
    expect(screen.queryByText(TEMPORAL)).not.toBeInTheDocument()
  })

  it("dos clics en 'Sí, restablecer' en el mismo instante hacen una sola petición", async () => {
    const fetchMock = apiDeCuentas()
    await renderVista()
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))

    const confirmar = screen.getByRole("button", { name: "Sí, restablecer" })
    fireEvent.click(confirmar)
    fireEvent.click(confirmar)

    await screen.findByText(TEMPORAL)
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(1)
  })

  it("al pedir la confirmación, el foco no se pierde en el documento", async () => {
    apiDeCuentas()
    await renderVista()
    const boton = screen.getByRole("button", { name: "Restablecer contraseña" })
    boton.focus()
    expect(document.activeElement).toBe(boton)

    fireEvent.click(boton)

    expect(
      document.activeElement,
      "el botón que tenía el foco desapareció y el foco quedó en <body>",
    ).not.toBe(document.body)
  })

  it("la temporal se anuncia a los lectores de pantalla (role=status o aria-live)", async () => {
    apiDeCuentas()
    await renderVista()
    await restablecerYVerTemporal()

    const temporal = screen.getByText(TEMPORAL)
    const region = temporal.closest('[role="status"], [aria-live]')
    expect(
      region,
      "la temporal aparece sin región viva: un lector de pantalla no la anuncia",
    ).not.toBeNull()
  })
})

describe("ataque (AUTH-02b r1): Copiar", () => {
  it("sin navigator.clipboard (contexto no seguro): toast de error y la temporal sigue visible", async () => {
    ponerPortapapeles(undefined)
    apiDeCuentas()
    await renderVista()
    await restablecerYVerTemporal()

    fireEvent.click(screen.getByRole("button", { name: "Copiar" }))

    await waitFor(() =>
      expect(aviso.error).toHaveBeenCalledWith("No pudimos copiarla. Cópiala a mano."),
    )
    expect(aviso.success).not.toHaveBeenCalled()
    expect(screen.getByText(TEMPORAL)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Copiar" })).toBeEnabled()
    // N-01 (DESIGN-01a): toBeEnabled ya no distingue un botón en espera; aria-disabled sí.
    expect(screen.getByRole("button", { name: "Copiar" })).not.toHaveAttribute("aria-disabled")
  })

  it("con el permiso denegado (writeText rechaza): toast de error, sin rechazo sin manejar", async () => {
    const writeText = vi.fn(() => Promise.reject(new DOMException("denied", "NotAllowedError")))
    ponerPortapapeles({ writeText })
    apiDeCuentas()
    await renderVista()
    await restablecerYVerTemporal()

    fireEvent.click(screen.getByRole("button", { name: "Copiar" }))

    await waitFor(() =>
      expect(aviso.error).toHaveBeenCalledWith("No pudimos copiarla. Cópiala a mano."),
    )
    expect(writeText).toHaveBeenCalledWith(TEMPORAL)
    expect(screen.getByRole("button", { name: "Copiar" })).toBeEnabled()
    // N-01 (DESIGN-01a): toBeEnabled ya no distingue un botón en espera; aria-disabled sí.
    expect(screen.getByRole("button", { name: "Copiar" })).not.toHaveAttribute("aria-disabled")
  })

  it("con éxito: copia exactamente la temporal y avisa", async () => {
    const writeText = vi.fn(() => Promise.resolve())
    ponerPortapapeles({ writeText })
    apiDeCuentas()
    await renderVista()
    await restablecerYVerTemporal()

    fireEvent.click(screen.getByRole("button", { name: "Copiar" }))

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Contraseña copiada"))
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledWith(TEMPORAL)
  })
})

describe("ataque (AUTH-02b r1): ficha, invitación y corrección de correo", () => {
  // ADMIN-01f (C-13): el estado de la cuenta es el dato "Cuenta" de la ficha, "Desactivada" (T-E14),
  // con texto (nunca solo color).
  it("una cuenta dada de baja se dice con texto en su ficha («Desactivada»)", async () => {
    apiDeCuentas()
    const ficha = await renderVista(beto).then(() => fichaDe(beto.nombre))

    expect(within(ficha).getByText("Desactivada")).toBeInTheDocument()
    expect(within(ficha).queryByText("Activa")).not.toBeInTheDocument()
  })

  it("tras corregir el correo, la ficha muestra el correo nuevo y no el anterior", async () => {
    stubFetch((ruta) => {
      if (ruta.endsWith("/correo")) {
        return respuestaJson(200, { ...carla, email: "carla.ruiz@ejemplo.mx" })
      }
      return null
    })
    await renderVista()

    fireEvent.change(screen.getByLabelText("Correo correcto"), {
      target: { value: "carla.ruiz@ejemplo.mx" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar correo" }))

    expect(
      await screen.findByText(
        "Correo actualizado. Los enlaces enviados al correo anterior ya no funcionan.",
      ),
    ).toBeInTheDocument()
    const ficha = await fichaDe(carla.nombre)
    await waitFor(() =>
      expect(within(ficha).queryAllByText("carla.ruiz@ejemplo.mx").length).toBeGreaterThan(0),
    )
    expect(
      within(ficha).queryByText(carla.email),
      "la ficha sigue mostrando el correo anterior tras corregirlo",
    ).not.toBeInTheDocument()
  })

  it("corregir a un correo en uso (409): mensaje propio", async () => {
    stubFetch((ruta) => (ruta.endsWith("/correo") ? errorJson(409, "CORREO_EN_USO") : null))
    await renderVista()

    fireEvent.change(screen.getByLabelText("Correo correcto"), {
      target: { value: "beto@ejemplo.mx" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar correo" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ya existe una cuenta con ese correo.",
    )
  })

  it("corregir usa el id de la ficha en la ruta y solo manda { email } normalizado por el esquema", async () => {
    const fetchMock = stubFetch((ruta) =>
      ruta.endsWith("/correo") ? respuestaJson(200, carla) : null,
    )
    await renderVista()

    fireEvent.change(screen.getByLabelText("Correo correcto"), {
      target: { value: "  Carla.Ruiz@Ejemplo.MX  " },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar correo" }))

    await waitFor(() => expect(llamadasQueContienen(fetchMock, "/correo")).toBe(1))
    const llamada = fetchMock.mock.calls.find(([r]) => String(r).endsWith("/correo"))
    expect(String(llamada?.[0])).toBe(`/api/admin/usuarios/${carla.id}/correo`)
    expect(llamada?.[1]?.method).toBe("PUT")
    expect(cuerpoDe(llamada?.[1])).toEqual({ email: "Carla.Ruiz@Ejemplo.MX" })
  })

  // ADMIN-01f (C-13 y C-44): "Invitar maestro" vive en /admin/maestros (§D-11, Enmienda 1).
  const montarMaestros = async () => {
    await montar("/admin/maestros")
    await screen.findByRole("button", { name: "Enviar invitación" })
  }

  it("invitar: dos envíos en el mismo instante hacen una sola petición", async () => {
    const fetchMock = stubFetch((ruta, init) =>
      ruta === "/api/admin/maestros" && init?.method === "POST" ? respuestaJson(201, carla) : null,
    )
    await montarMaestros()
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Carla Ruiz" } })
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: carla.email } })

    const boton = screen.getByRole("button", { name: "Enviar invitación" })
    fireEvent.click(boton)
    fireEvent.click(boton)

    await screen.findByText(/^Invitación creada\./)
    expect(
      fetchMock.mock.calls.filter(
        ([r, init]) => String(r) === "/api/admin/maestros" && init?.method === "POST",
      ),
    ).toHaveLength(1)
  })

  it("invitar: 400 VALIDACION del servidor muestra su mensaje", async () => {
    stubFetch((ruta, init) =>
      ruta === "/api/admin/maestros" && init?.method === "POST"
        ? errorJson(400, "VALIDACION", "nombre: caracteres no permitidos")
        : null,
    )
    await montarMaestros()
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Carla Ruiz" } })
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: carla.email } })
    fireEvent.click(screen.getByRole("button", { name: "Enviar invitación" }))

    const alerta = await screen.findByRole("alert")
    expect(alerta).toHaveTextContent("caracteres no permitidos")
    expect(alerta).not.toHaveTextContent("nombre:")
  })

  // ADMIN-01f ronda 0 (C-44, Enmienda 14, P-E14-1 (a)): el admin escribe el nombre de otra persona,
  // así que la descripción es "Escribe el nombre completo", no "Escribe tu nombre completo". Sigue
  // protegiendo que el campo quede marcado y descrito y que no salga ninguna petición.
  it("invitar: un nombre solo de espacios no se envía y el campo queda marcado y descrito", async () => {
    const fetchMock = stubFetch(() => null)
    await montarMaestros()
    const antes = fetchMock.mock.calls.length
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "   " } })
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: carla.email } })
    fireEvent.click(screen.getByRole("button", { name: "Enviar invitación" }))

    const nombre = screen.getByLabelText("Nombre completo")
    expect(nombre).toHaveAttribute("aria-invalid", "true")
    expect(nombre).toHaveAccessibleDescription("Escribe el nombre completo")
    await esperarUnMomento()
    expect(fetchMock.mock.calls.length).toBe(antes)
  })
})

describe("ataque (AUTH-02b r1): reglas de módulos (revisión estática)", () => {
  // Fuente de todos los archivos del módulo, leída por Vite en crudo (sin tipos de Node).
  const fuentes = import.meta.glob<string>("./**/*.{ts,tsx}", {
    query: "?raw",
    import: "default",
    eager: true,
  })
  const produccion = Object.entries(fuentes).filter(([ruta]) => !/\.test\.(ts|tsx)$/.test(ruta))
  const infractores = (patron: RegExp) =>
    produccion.filter(([, fuente]) => patron.test(fuente)).map(([ruta]) => ruta)

  it("hay archivos de producción que revisar, incluido hooks.ts", () => {
    expect(produccion.length).toBeGreaterThan(5)
    expect(Object.keys(fuentes)).toContain("./hooks.ts")
  })

  it("features/admin no importa de features/auth (regla 9)", () => {
    expect(infractores(/from\s+["'](@\/features\/auth|\.\.\/(\.\.\/)?auth)/)).toEqual([])
  })

  it("ningún fetch fuera de services/apiClient (regla 8)", () => {
    expect(infractores(/\bfetch\(/)).toEqual([])
  })

  it("hooks.ts no declara tipos: van en types.ts (CLAUDE.md, reglas 1 y 4; 'Lo que no se hace')", () => {
    const hooks = fuentes["./hooks.ts"]
    if (hooks === undefined) throw new Error("no se pudo leer features/admin/hooks.ts")
    // Declaraciones de nivel superior (no los "type X" dentro de un import).
    const declaraciones = hooks.match(/^(export\s+)?(interface\s+\w+|type\s+\w+(<[^>]*>)?\s*=)/gm)
    expect(declaraciones, "hooks.ts declara tipos").toBeNull()
  })

  // ADMIN-01f ronda 0 (C-13b, Enmienda 9; §D-11): "sin modales" pasa a "solo las confirmaciones de
  // dar de baja y de restringir acceso", las excepciones de CLAUDE.md. Sigue protegiendo que ningún
  // otro archivo de admin use components/ui/dialog.
  it("solo los diálogos de dar de baja, de restringir acceso y del cambio masivo de estado de pago usan components/ui/dialog (excepciones de CLAUDE.md)", () => {
    // ADMIN-01g ronda 0 (C-19c, Enmienda 9 y Enmienda 15): suma el diálogo del cambio masivo de estado
    // de pago, la tercera excepción de CLAUDE.md.
    expect(infractores(/components\/ui\/dialog/).sort()).toEqual([
      "./components/dialogo-dar-de-baja.tsx",
      "./components/dialogo-estado-pago-lote.tsx",
      "./components/dialogo-restringir-acceso.tsx",
    ])
  })
})
