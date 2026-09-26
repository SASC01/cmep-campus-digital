import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CuentasView } from "./cuentas-view"

// Ataques del Tester (AUTH-02b, ronda 1) contra DEC-19: la pantalla provisional de cuentas del
// admin. Temporal visible una sola vez y fuera de la caché, confirmación en línea, cuenta admin sin
// "Restablecer", portapapeles que falla, errores del servidor, doble clic y reglas de módulos.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const TEMPORAL = "Kp7mWq4Rt9Xz"
const TEMPORAL_2 = "Hn3vBc8Lq2Ps"

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

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const stubFetch = (manejador: (ruta: string, init?: RequestInit) => Response) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) =>
    Promise.resolve(manejador(String(entrada), init)),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const llamadasQueContienen = (fetchMock: ReturnType<typeof stubFetch>, fragmento: string) =>
  fetchMock.mock.calls.filter(([entrada]) => String(entrada).includes(fragmento)).length

const cuerpoDe = (init: RequestInit | undefined): unknown => JSON.parse(String(init?.body))

// Busca por correo: la respuesta depende del correo pedido.
const apiDeCuentas = (
  restablecer: () => Response = () => respuestaJson(200, { contrasenaTemporal: TEMPORAL }),
) =>
  stubFetch((ruta, init) => {
    if (ruta === "/api/admin/usuarios/buscar") {
      const { email } = cuerpoDe(init) as { email: string }
      const usuario = [carla, beto, admin].find((u) => u.email === email)
      if (!usuario) return errorJson(404, "USUARIO_NO_ENCONTRADO")
      return respuestaJson(200, { usuario })
    }
    if (ruta.endsWith("/restablecer-contrasena")) return restablecer()
    return errorJson(500, "ERROR_INTERNO")
  })

const renderVista = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const vista = render(
    <QueryClientProvider client={queryClient}>
      <CuentasView />
    </QueryClientProvider>,
  )
  return { queryClient, vista }
}

const buscar = async (correo: string, nombreEsperado?: string) => {
  fireEvent.change(screen.getByLabelText("Correo exacto de la cuenta"), {
    target: { value: correo },
  })
  fireEvent.click(screen.getByRole("button", { name: "Buscar" }))
  if (nombreEsperado) await screen.findByText(nombreEsperado)
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

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(window.navigator, "clipboard")
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("ataque (AUTH-02b r1): la temporal se ve una sola vez", () => {
  it("no hay ninguna consulta al montar", () => {
    const fetchMock = apiDeCuentas()
    renderVista()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("buscar la MISMA cuenta otra vez hace desaparecer la temporal", async () => {
    apiDeCuentas()
    renderVista()
    await buscar(carla.email, carla.nombre)
    await restablecerYVerTemporal()

    await buscar(carla.email, carla.nombre)

    await waitFor(() => expect(screen.queryByText(TEMPORAL)).not.toBeInTheDocument())
    expect(screen.getByRole("button", { name: "Restablecer contraseña" })).toBeInTheDocument()
  })

  it("buscar otra cuenta que no existe (404) hace desaparecer la temporal", async () => {
    apiDeCuentas()
    renderVista()
    await buscar(carla.email, carla.nombre)
    await restablecerYVerTemporal()

    await buscar("nadie@ejemplo.mx")

    expect(await screen.findByText("No hay ninguna cuenta con ese correo.")).toBeInTheDocument()
    expect(screen.queryByText(TEMPORAL)).not.toBeInTheDocument()
  })

  it("buscar otra cuenta con un correo mal escrito (rechazado en el cliente) hace desaparecer la temporal", async () => {
    const fetchMock = apiDeCuentas()
    renderVista()
    await buscar(carla.email, carla.nombre)
    await restablecerYVerTemporal()

    await buscar("beto@ejemplo")

    expect(await screen.findByText("Escribe un correo válido")).toBeInTheDocument()
    expect(llamadasQueContienen(fetchMock, "/buscar")).toBe(1)
    expect(
      screen.queryByText(TEMPORAL),
      "la temporal de Carla sigue en pantalla mientras el admin busca a otra persona",
    ).not.toBeInTheDocument()
  })

  it("al salir de la pantalla, la temporal no queda en la caché de mutaciones (gcTime 0)", async () => {
    apiDeCuentas()
    const { queryClient, vista } = renderVista()
    await buscar(carla.email, carla.nombre)
    await restablecerYVerTemporal()

    vista.unmount()
    await esperarUnMomento()

    expect(contenidoDeLaCache(queryClient)).not.toContain(TEMPORAL)
  })

  it("al buscar otra cuenta, la temporal tampoco queda en la caché de mutaciones", async () => {
    apiDeCuentas()
    const { queryClient } = renderVista()
    await buscar(carla.email, carla.nombre)
    await restablecerYVerTemporal()

    await buscar(beto.email, beto.nombre)
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
    renderVista()
    await buscar(carla.email, carla.nombre)
    await restablecerYVerTemporal()

    expect(screen.queryByRole("button", { name: "Sí, restablecer" })).not.toBeInTheDocument()
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(1)
  })
})

describe("ataque (AUTH-02b r1): confirmación en línea y cuenta admin", () => {
  it("la ficha de una cuenta admin no ofrece 'Restablecer' y explica por qué", async () => {
    const fetchMock = apiDeCuentas()
    renderVista()
    await buscar(admin.email, admin.nombre)

    expect(screen.queryByRole("button", { name: "Restablecer contraseña" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Sí, restablecer" })).not.toBeInTheDocument()
    expect(
      screen.getByText("La contraseña del administrador se restablece desde el servidor."),
    ).toBeInTheDocument()
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(0)
  })

  it("la confirmación es en línea: sin role=dialog, y 'Cancelar' no hace ninguna petición", async () => {
    const fetchMock = apiDeCuentas()
    renderVista()
    await buscar(carla.email, carla.nombre)

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
    renderVista()
    await buscar(carla.email, carla.nombre)

    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La contraseña del administrador se restablece desde el servidor.",
    )
    expect(screen.queryByText("Contraseña temporal")).not.toBeInTheDocument()
  })

  it("404 al restablecer (la cuenta ya no existe): mensaje, sin temporal", async () => {
    apiDeCuentas(() => errorJson(404, "USUARIO_NO_ENCONTRADO"))
    renderVista()
    await buscar(carla.email, carla.nombre)

    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No hay ninguna cuenta con ese correo.",
    )
    expect(screen.queryByText(TEMPORAL)).not.toBeInTheDocument()
  })

  it("dos clics en 'Sí, restablecer' en el mismo instante hacen una sola petición", async () => {
    const fetchMock = apiDeCuentas()
    renderVista()
    await buscar(carla.email, carla.nombre)
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))

    const confirmar = screen.getByRole("button", { name: "Sí, restablecer" })
    fireEvent.click(confirmar)
    fireEvent.click(confirmar)

    await screen.findByText(TEMPORAL)
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(1)
  })

  it("al pedir la confirmación, el foco no se pierde en el documento", async () => {
    apiDeCuentas()
    renderVista()
    await buscar(carla.email, carla.nombre)
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
    renderVista()
    await buscar(carla.email, carla.nombre)
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
    renderVista()
    await buscar(carla.email, carla.nombre)
    await restablecerYVerTemporal()

    fireEvent.click(screen.getByRole("button", { name: "Copiar" }))

    await waitFor(() =>
      expect(aviso.error).toHaveBeenCalledWith("No pudimos copiarla. Cópiala a mano."),
    )
    expect(aviso.success).not.toHaveBeenCalled()
    expect(screen.getByText(TEMPORAL)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Copiar" })).toBeEnabled()
  })

  it("con el permiso denegado (writeText rechaza): toast de error, sin rechazo sin manejar", async () => {
    const writeText = vi.fn(() => Promise.reject(new DOMException("denied", "NotAllowedError")))
    ponerPortapapeles({ writeText })
    apiDeCuentas()
    renderVista()
    await buscar(carla.email, carla.nombre)
    await restablecerYVerTemporal()

    fireEvent.click(screen.getByRole("button", { name: "Copiar" }))

    await waitFor(() =>
      expect(aviso.error).toHaveBeenCalledWith("No pudimos copiarla. Cópiala a mano."),
    )
    expect(writeText).toHaveBeenCalledWith(TEMPORAL)
    expect(screen.getByRole("button", { name: "Copiar" })).toBeEnabled()
  })

  it("con éxito: copia exactamente la temporal y avisa", async () => {
    const writeText = vi.fn(() => Promise.resolve())
    ponerPortapapeles({ writeText })
    apiDeCuentas()
    renderVista()
    await buscar(carla.email, carla.nombre)
    await restablecerYVerTemporal()

    fireEvent.click(screen.getByRole("button", { name: "Copiar" }))

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Contraseña copiada"))
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledWith(TEMPORAL)
  })
})

describe("ataque (AUTH-02b r1): ficha, invitación y corrección de correo", () => {
  it("'Cuenta inactiva' se muestra con icono y texto (plan, DEC-19)", async () => {
    apiDeCuentas()
    renderVista()
    await buscar(beto.email, beto.nombre)

    const etiqueta = screen.getByText("Cuenta inactiva")
    const tieneIcono =
      etiqueta.querySelector("svg") !== null ||
      etiqueta.parentElement?.querySelector(":scope > svg") !== null
    expect(tieneIcono, "'Cuenta inactiva' solo lleva texto y color, sin icono").toBe(true)
  })

  it("tras corregir el correo, la ficha muestra el correo nuevo y no el anterior", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/admin/usuarios/buscar") return respuestaJson(200, { usuario: carla })
      if (ruta.endsWith("/correo")) {
        return respuestaJson(200, { ...carla, email: "carla.ruiz@ejemplo.mx" })
      }
      return errorJson(500, "ERROR_INTERNO")
    })
    renderVista()
    await buscar(carla.email, carla.nombre)

    fireEvent.change(screen.getByLabelText("Correo correcto"), {
      target: { value: "carla.ruiz@ejemplo.mx" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar correo" }))

    expect(
      await screen.findByText(
        "Correo actualizado. Los enlaces enviados al correo anterior ya no funcionan.",
      ),
    ).toBeInTheDocument()
    const ficha = screen.getByText(carla.nombre).closest("div")
    if (!ficha) throw new Error("no se encontró el contenedor de la ficha")
    expect(within(ficha).queryByText("carla.ruiz@ejemplo.mx")).toBeInTheDocument()
    expect(
      within(ficha).queryByText(carla.email),
      "la ficha sigue mostrando el correo anterior tras corregirlo",
    ).not.toBeInTheDocument()
  })

  it("corregir a un correo en uso (409): mensaje propio", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/admin/usuarios/buscar") return respuestaJson(200, { usuario: carla })
      if (ruta.endsWith("/correo")) return errorJson(409, "CORREO_EN_USO")
      return errorJson(500, "ERROR_INTERNO")
    })
    renderVista()
    await buscar(carla.email, carla.nombre)

    fireEvent.change(screen.getByLabelText("Correo correcto"), {
      target: { value: "beto@ejemplo.mx" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar correo" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ya existe una cuenta con ese correo.",
    )
  })

  it("corregir usa el id de la ficha en la ruta y solo manda { email } normalizado por el esquema", async () => {
    const fetchMock = stubFetch((ruta) => {
      if (ruta === "/api/admin/usuarios/buscar") return respuestaJson(200, { usuario: carla })
      if (ruta.endsWith("/correo")) return respuestaJson(200, carla)
      return errorJson(500, "ERROR_INTERNO")
    })
    renderVista()
    await buscar(carla.email, carla.nombre)

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

  it("invitar: dos envíos en el mismo instante hacen una sola petición", async () => {
    const fetchMock = stubFetch(() => respuestaJson(201, carla))
    renderVista()
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Carla Ruiz" } })
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: carla.email } })

    const boton = screen.getByRole("button", { name: "Enviar invitación" })
    fireEvent.click(boton)
    fireEvent.click(boton)

    await screen.findByRole("status")
    expect(llamadasQueContienen(fetchMock, "/api/admin/maestros")).toBe(1)
  })

  it("invitar: 400 VALIDACION del servidor muestra su mensaje", async () => {
    stubFetch(() => errorJson(400, "VALIDACION", "nombre: caracteres no permitidos"))
    renderVista()
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Carla Ruiz" } })
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: carla.email } })
    fireEvent.click(screen.getByRole("button", { name: "Enviar invitación" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("nombre: caracteres no permitidos")
  })

  it("invitar: un nombre solo de espacios no se envía y el campo queda marcado y descrito", () => {
    const fetchMock = stubFetch(() => respuestaJson(201, carla))
    renderVista()
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "   " } })
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: carla.email } })
    fireEvent.click(screen.getByRole("button", { name: "Enviar invitación" }))

    const nombre = screen.getByLabelText("Nombre completo")
    expect(nombre).toHaveAttribute("aria-invalid", "true")
    expect(nombre).toHaveAccessibleDescription("Escribe tu nombre completo")
    expect(fetchMock).not.toHaveBeenCalled()
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

  it("sin modales: ningún archivo de admin usa components/ui/dialog", () => {
    expect(infractores(/components\/ui\/dialog/)).toEqual([])
  })
})
