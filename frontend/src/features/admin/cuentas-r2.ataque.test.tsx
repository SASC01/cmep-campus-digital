import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CuentasView } from "./cuentas-view"

// Ataques del Tester (AUTH-02b, ronda 2) contra las correcciones de T-03 (guarda con useRef),
// T-04 y T-05 (estados cruzados entre búsqueda, corrección y restablecimiento) y T-07 (foco con
// autoFocus en "Sí, restablecer" y en "Copiar").

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const TEMPORAL = "Kp7mWq4Rt9Xz"
const CORREO_CORREGIDO = "carla.ruiz@ejemplo.mx"

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
  activo: true,
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

type Manejador = (ruta: string, init?: RequestInit) => Response | Promise<Response>

const stubFetch = (manejador: Manejador) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) =>
    Promise.resolve(manejador(String(entrada), init)),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const llamadasQueContienen = (fetchMock: ReturnType<typeof stubFetch>, fragmento: string) =>
  fetchMock.mock.calls.filter(([entrada]) => String(entrada).includes(fragmento)).length

const cuerpoDe = (init: RequestInit | undefined): unknown => JSON.parse(String(init?.body))

// Respuesta que la prueba resuelve cuando quiere: sirve para dejar una petición "en vuelo".
const diferida = () => {
  let resolver: (respuesta: Response) => void = () => {
    throw new Error("la respuesta diferida se resolvió antes de crearse")
  }
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver: (respuesta: Response) => resolver(respuesta) }
}

interface ApiDeCuentas {
  restablecer?: () => Response | Promise<Response>
  corregir?: (init?: RequestInit) => Response | Promise<Response>
}

const apiDeCuentas = ({ restablecer, corregir }: ApiDeCuentas = {}) =>
  stubFetch((ruta, init) => {
    if (ruta === "/api/admin/usuarios/buscar") {
      const { email } = cuerpoDe(init) as { email: string }
      const usuario = [carla, beto].find((u) => u.email === email)
      if (!usuario) return errorJson(404, "USUARIO_NO_ENCONTRADO")
      return respuestaJson(200, { usuario })
    }
    if (ruta.endsWith("/restablecer-contrasena")) {
      if (restablecer) return restablecer()
      return respuestaJson(200, { contrasenaTemporal: TEMPORAL })
    }
    if (ruta.endsWith("/correo")) {
      if (corregir) return corregir(init)
      return respuestaJson(200, { ...carla, email: CORREO_CORREGIDO })
    }
    return errorJson(500, "ERROR_INTERNO")
  })

const renderVista = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <CuentasView />
    </QueryClientProvider>,
  )
  return queryClient
}

const buscar = async (correo: string, nombreEsperado?: string) => {
  fireEvent.change(screen.getByLabelText("Correo exacto de la cuenta"), {
    target: { value: correo },
  })
  fireEvent.click(screen.getByRole("button", { name: "Buscar" }))
  if (nombreEsperado) await screen.findByText(nombreEsperado)
}

const corregirCorreo = (correo: string) => {
  fireEvent.change(screen.getByLabelText("Correo correcto"), { target: { value: correo } })
  fireEvent.click(screen.getByRole("button", { name: "Guardar correo" }))
}

const esperarUnMomento = () => act(() => new Promise((resolver) => setTimeout(resolver, 30)))

// jsdom no ejecuta la acción por defecto de una tecla: en un navegador, Enter sobre un botón con el
// foco dispara su "click" (comportamiento de activación del HTML). Se emula así, sobre lo que tenga
// el foco en ese momento.
const pulsarEnter = () => {
  const conFoco = document.activeElement
  if (!(conFoco instanceof HTMLElement) || conFoco === document.body) {
    throw new Error("no hay ningún control con el foco al pulsar Enter")
  }
  fireEvent.click(conFoco)
}

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(window.navigator, "clipboard")
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("ataque (AUTH-02b r2): la guarda de T-03 se libera y no deja pasar un segundo envío", () => {
  it("tras un 500 al restablecer, 'Sí, restablecer' vuelve a funcionar y el reintento muestra la temporal", async () => {
    let intentos = 0
    const fetchMock = apiDeCuentas({
      restablecer: () => {
        intentos += 1
        if (intentos === 1) return errorJson(500, "ERROR_INTERNO")
        return respuestaJson(200, { contrasenaTemporal: TEMPORAL })
      },
    })
    renderVista()
    await buscar(carla.email, carla.nombre)
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }))
    expect(await screen.findByRole("alert")).toBeVisible()

    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }))

    expect(
      await screen.findByText(TEMPORAL),
      "la guarda quedó tomada tras el error y el reintento no salió",
    ).toBeVisible()
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(2)
  })

  it("tras un fallo de red al restablecer, el reintento sale y muestra la temporal", async () => {
    let intentos = 0
    const fetchMock = stubFetch((ruta, init) => {
      if (ruta === "/api/admin/usuarios/buscar") {
        const { email } = cuerpoDe(init) as { email: string }
        if (email === carla.email) return respuestaJson(200, { usuario: carla })
        return errorJson(404, "USUARIO_NO_ENCONTRADO")
      }
      intentos += 1
      if (intentos === 1) throw new TypeError("Failed to fetch")
      return respuestaJson(200, { contrasenaTemporal: TEMPORAL })
    })
    renderVista()
    await buscar(carla.email, carla.nombre)
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }))
    expect(await screen.findByRole("alert")).toBeVisible()

    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }))

    expect(await screen.findByText(TEMPORAL)).toBeVisible()
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(2)
  })

  it("con la primera petición en vuelo, 'Cancelar' y volver a confirmar no manda una segunda", async () => {
    const pendiente = diferida()
    const fetchMock = apiDeCuentas({ restablecer: () => pendiente.promesa })
    renderVista()
    await buscar(carla.email, carla.nombre)
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }))

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }))
    await esperarUnMomento()
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(1)

    await act(async () => {
      pendiente.resolver(respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
      await pendiente.promesa
    })
    expect(await screen.findByText(TEMPORAL)).toBeVisible()
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(1)
  })
})

describe("ataque (AUTH-02b r2): sin estados cruzados entre cuentas", () => {
  it("la temporal de Carla que llega después de buscar a Beto no aparece en la ficha de Beto", async () => {
    const pendiente = diferida()
    apiDeCuentas({ restablecer: () => pendiente.promesa })
    renderVista()
    await buscar(carla.email, carla.nombre)
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }))

    await buscar(beto.email, beto.nombre)
    await act(async () => {
      pendiente.resolver(respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
      await pendiente.promesa
    })
    await esperarUnMomento()

    expect(screen.getByText(beto.nombre)).toBeVisible()
    expect(
      screen.queryByText(TEMPORAL),
      "la temporal de Carla apareció en la ficha de Beto",
    ).not.toBeInTheDocument()
  })

  it("una corrección de Carla que termina después de buscar a Beto no cambia la ficha de Beto", async () => {
    const pendiente = diferida()
    apiDeCuentas({ corregir: () => pendiente.promesa })
    renderVista()
    await buscar(carla.email, carla.nombre)
    corregirCorreo(CORREO_CORREGIDO)

    await buscar(beto.email, beto.nombre)
    await act(async () => {
      pendiente.resolver(respuestaJson(200, { ...carla, email: CORREO_CORREGIDO }))
      await pendiente.promesa
    })
    await esperarUnMomento()

    expect(screen.getByText(beto.nombre)).toBeVisible()
    expect(screen.getByText(beto.email)).toBeVisible()
    expect(screen.queryByText(carla.nombre)).not.toBeInTheDocument()
    expect(screen.queryByText(CORREO_CORREGIDO)).not.toBeInTheDocument()
  })

  it("tras corregir el correo de Carla, buscar a Beto muestra los datos de Beto y no los de Carla", async () => {
    apiDeCuentas()
    renderVista()
    await buscar(carla.email, carla.nombre)
    corregirCorreo(CORREO_CORREGIDO)
    await screen.findByText(CORREO_CORREGIDO)

    await buscar(beto.email, beto.nombre)

    expect(screen.getByText(beto.email)).toBeVisible()
    expect(screen.queryByText(CORREO_CORREGIDO)).not.toBeInTheDocument()
    expect(screen.queryByText(/Correo actualizado/)).not.toBeInTheDocument()
  })

  it("tras corregir, una búsqueda rechazada en el cliente no deja la ficha corregida en pantalla", async () => {
    const fetchMock = apiDeCuentas()
    renderVista()
    await buscar(carla.email, carla.nombre)
    corregirCorreo(CORREO_CORREGIDO)
    await screen.findByText(CORREO_CORREGIDO)
    const busquedas = llamadasQueContienen(fetchMock, "/usuarios/buscar")

    await buscar("beto@ejemplo")

    expect(llamadasQueContienen(fetchMock, "/usuarios/buscar")).toBe(busquedas)
    expect(screen.queryByText(carla.nombre)).not.toBeInTheDocument()
    expect(screen.queryByText(CORREO_CORREGIDO)).not.toBeInTheDocument()
  })

  it("la temporal ya visible sigue en la ficha de Carla al corregir su correo, y con el correo nuevo", async () => {
    apiDeCuentas()
    renderVista()
    await buscar(carla.email, carla.nombre)
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }))
    await screen.findByText(TEMPORAL)

    corregirCorreo(CORREO_CORREGIDO)
    await screen.findByText(CORREO_CORREGIDO)

    const ficha = screen.getByText(carla.nombre).closest("div.rounded-lg")
    if (!(ficha instanceof HTMLElement)) throw new Error("no se encontró el contenedor de la ficha")
    expect(within(ficha).getByText(TEMPORAL)).toBeVisible()
    expect(within(ficha).queryByText(carla.email)).not.toBeInTheDocument()
  })
})

describe("ataque (AUTH-02b r2): foco tras la corrección de T-07", () => {
  it("Enter dos veces sobre 'Restablecer contraseña' no restablece sin que el admin confirme", async () => {
    const fetchMock = apiDeCuentas()
    renderVista()
    await buscar(carla.email, carla.nombre)
    screen.getByRole("button", { name: "Restablecer contraseña" }).focus()

    pulsarEnter()
    const conFocoTrasPedirConfirmacion = document.activeElement?.textContent
    pulsarEnter()
    await esperarUnMomento()

    expect(
      llamadasQueContienen(fetchMock, "/restablecer-contrasena"),
      `un segundo Enter (o la repetición de la tecla) confirmó el restablecimiento; tras el primero el foco estaba en "${conFocoTrasPedirConfirmacion ?? ""}"`,
    ).toBe(0)
    expect(screen.queryByText(TEMPORAL)).not.toBeInTheDocument()
  })

  it("'Cancelar' no deja el foco en <body>", async () => {
    apiDeCuentas()
    renderVista()
    await buscar(carla.email, carla.nombre)
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))
    const cancelar = screen.getByRole("button", { name: "Cancelar" })
    cancelar.focus()
    expect(document.activeElement).toBe(cancelar)

    fireEvent.click(cancelar)

    expect(screen.getByRole("button", { name: "Restablecer contraseña" })).toBeVisible()
    expect(document.activeElement, "'Cancelar' desapareció y el foco quedó en <body>").not.toBe(
      document.body,
    )
  })

  it("la temporal que llega mientras el admin escribe en otro campo no le roba el foco", async () => {
    const pendiente = diferida()
    apiDeCuentas({ restablecer: () => pendiente.promesa })
    renderVista()
    await buscar(carla.email, carla.nombre)
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }))

    const nombreMaestro = screen.getByLabelText("Nombre completo")
    nombreMaestro.focus()
    fireEvent.change(nombreMaestro, { target: { value: "Dora" } })
    expect(document.activeElement).toBe(nombreMaestro)

    await act(async () => {
      pendiente.resolver(respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
      await pendiente.promesa
    })
    await screen.findByText(TEMPORAL)

    expect(
      document.activeElement,
      "la temporal movió el foco a 'Copiar' mientras el admin escribía en otro formulario",
    ).toBe(nombreMaestro)
  })

  it("cuando el admin sigue en la confirmación, el foco llega a 'Copiar' (no a <body>)", async () => {
    apiDeCuentas()
    renderVista()
    await buscar(carla.email, carla.nombre)
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))
    const confirmar = screen.getByRole("button", { name: "Sí, restablecer" })
    confirmar.focus()
    fireEvent.click(confirmar)
    await screen.findByText(TEMPORAL)

    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Copiar" })),
    )
  })
})
