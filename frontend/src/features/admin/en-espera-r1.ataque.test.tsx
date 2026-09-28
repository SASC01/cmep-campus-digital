import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CuentasView } from "./cuentas-view"

// Ataques del Tester (DESIGN-01a, ronda 1) contra `enEspera` en los cinco botones de /admin
// ("Buscar", "Enviar invitación", "Guardar correo", "Sí, restablecer" y "Copiar"): con la petición
// en vuelo, aria-disabled y aria-busy sin `disabled`, el mismo nombre accesible, el foco conservado
// y el botón en el orden de tabulación; ninguna activación repetida (clic, Enter o Espacio, envío
// del formulario, requestSubmit) manda una segunda petición; y al asentarse, con éxito o con error,
// el botón sale de la espera (plan, §D-5 y "Puntos de ataque", punto 2).

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const TEMPORAL = "Kp7mWq4Rt9Xz"

const carla = {
  id: "b7e6a1a0-1111-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Carla Ruiz",
  email: "carla@ejemplo.mx",
  rol: "maestro",
  activo: true,
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const diferida = () => {
  let resolver: (respuesta: Response) => void = () => {
    throw new Error("la respuesta diferida se resolvió antes de crearse")
  }
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver: (respuesta: Response) => resolver(respuesta) }
}

type Diferida = ReturnType<typeof diferida>

// Cada ruta puede quedar en vuelo con su propia respuesta diferida; las demás responden al instante.
const apiDeCuentas = (
  enVuelo: Partial<Record<"buscar" | "invitar" | "correo" | "restablecer", Diferida>>,
) => {
  let busquedas = 0
  const fetchMock = vi.fn<typeof fetch>((entrada) => {
    const ruta = String(entrada)
    if (ruta === "/api/admin/usuarios/buscar") {
      busquedas += 1
      // Solo la segunda búsqueda queda en vuelo: la primera hace falta para tener ficha.
      if (enVuelo.buscar && busquedas > 1) return enVuelo.buscar.promesa
      return Promise.resolve(respuestaJson(200, { usuario: carla }))
    }
    if (ruta === "/api/admin/maestros" && enVuelo.invitar) return enVuelo.invitar.promesa
    if (ruta.endsWith("/correo") && enVuelo.correo) return enVuelo.correo.promesa
    if (ruta.endsWith("/restablecer-contrasena") && enVuelo.restablecer) {
      return enVuelo.restablecer.promesa
    }
    if (ruta.endsWith("/restablecer-contrasena")) {
      return Promise.resolve(respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    }
    return Promise.resolve(errorJson(500, "ERROR_INTERNO"))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const llamadasQueContienen = (fetchMock: ReturnType<typeof apiDeCuentas>, fragmento: string) =>
  fetchMock.mock.calls.filter(([entrada]) => String(entrada).includes(fragmento)).length

const renderVista = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <CuentasView />
    </QueryClientProvider>,
  )
}

const boton = (nombre: string) => screen.getByRole("button", { name: nombre })

const esperarUnMomento = () => act(() => new Promise((resolver) => setTimeout(resolver, 30)))

const resolverCon = async (pendiente: Diferida, respuesta: Response) => {
  await act(async () => {
    pendiente.resolver(respuesta)
    await pendiente.promesa
  })
}

// Clic con el foco puesto, como en Chromium (jsdom no enfoca el botón con el clic).
const pulsar = (nombre: string) => {
  const control = boton(nombre)
  act(() => control.focus())
  fireEvent.click(control)
  return control
}

const buscarCarla = async () => {
  fireEvent.change(screen.getByLabelText("Correo exacto de la cuenta"), {
    target: { value: carla.email },
  })
  fireEvent.click(boton("Buscar"))
  await screen.findByText(carla.nombre)
}

// F-1 aplicado a cualquier botón en vuelo (§D-5): en espera, sin `disabled`, con el mismo nombre,
// con el foco y dentro del orden de tabulación.
const comprobarEnEspera = async (control: HTMLElement, nombre: string) => {
  await waitFor(() => expect(control).toHaveAttribute("aria-disabled", "true"))
  expect(control).toHaveAttribute("aria-busy", "true")
  expect(control).not.toHaveAttribute("disabled")
  expect(control).not.toBeDisabled()
  expect(boton(nombre), "el nombre accesible cambió con la petición en vuelo").toBe(control)
  expect(document.activeElement, `"${nombre}" en espera perdió el foco`).toBe(control)
  expect(
    control.tabIndex,
    `"${nombre}" en espera salió del orden de tabulación`,
  ).toBeGreaterThanOrEqual(0)
}

// Enter y Espacio sobre un botón con el foco se convierten en "click" en el navegador; jsdom no lo
// hace, así que se emulan con el clic. Además, el envío del formulario por las dos vías que no pasan
// por el botón: el evento submit y requestSubmit().
const activarDeTodasLasFormas = (control: HTMLElement) => {
  fireEvent.click(control)
  fireEvent.click(control)
  fireEvent.click(control)
  const formulario = control.closest("form")
  if (formulario) {
    fireEvent.submit(formulario)
    act(() => formulario.requestSubmit())
  }
}

const comprobarFueraDeEspera = async (control: HTMLElement) => {
  await waitFor(() => expect(control).not.toHaveAttribute("aria-disabled"))
  expect(control).not.toHaveAttribute("aria-busy")
  expect(control).not.toHaveAttribute("data-en-espera")
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  Reflect.deleteProperty(window.navigator, "clipboard")
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("ataque (DESIGN-01a r1): 'Buscar' en espera", () => {
  it("en vuelo: en espera con el foco, y ninguna activación repetida busca otra vez; con error sale de la espera", async () => {
    const pendiente = diferida()
    const fetchMock = apiDeCuentas({ buscar: pendiente })
    renderVista()
    await buscarCarla()

    const control = pulsar("Buscar")
    await comprobarEnEspera(control, "Buscar")
    activarDeTodasLasFormas(control)
    await esperarUnMomento()
    expect(llamadasQueContienen(fetchMock, "/usuarios/buscar")).toBe(2)

    await resolverCon(pendiente, errorJson(500, "ERROR_INTERNO"))
    await comprobarFueraDeEspera(control)
    expect(document.activeElement).toBe(control)
  })

  it("con éxito sale de la espera y conserva el foco", async () => {
    const pendiente = diferida()
    apiDeCuentas({ buscar: pendiente })
    renderVista()
    await buscarCarla()

    const control = pulsar("Buscar")
    await comprobarEnEspera(control, "Buscar")
    await resolverCon(pendiente, respuestaJson(200, { usuario: carla }))
    await screen.findByText(carla.nombre)

    await comprobarFueraDeEspera(control)
    expect(document.activeElement).toBe(control)
  })
})

describe("ataque (DESIGN-01a r1): 'Enviar invitación' en espera", () => {
  const llenarInvitacion = () => {
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Ana López" } })
    fireEvent.change(screen.getByLabelText("Correo"), {
      target: { value: "ana@ejemplo.mx" },
    })
  }

  it("en vuelo: una sola invitación aunque se active de todas las formas; con error sale de la espera", async () => {
    const pendiente = diferida()
    const fetchMock = apiDeCuentas({ invitar: pendiente })
    renderVista()
    llenarInvitacion()

    const control = pulsar("Enviar invitación")
    await comprobarEnEspera(control, "Enviar invitación")
    activarDeTodasLasFormas(control)
    await esperarUnMomento()
    expect(llamadasQueContienen(fetchMock, "/api/admin/maestros")).toBe(1)

    await resolverCon(pendiente, errorJson(409, "CORREO_EN_USO"))
    await comprobarFueraDeEspera(control)
    expect(document.activeElement).toBe(control)
  })

  it("con éxito sale de la espera", async () => {
    const pendiente = diferida()
    apiDeCuentas({ invitar: pendiente })
    renderVista()
    llenarInvitacion()

    const control = pulsar("Enviar invitación")
    await comprobarEnEspera(control, "Enviar invitación")
    await resolverCon(
      pendiente,
      respuestaJson(201, {
        id: "e1b2c3d4-4444-4e5f-8a6b-7c8d9e0f1a2b",
        nombre: "Ana López",
        email: "ana@ejemplo.mx",
        rol: "maestro",
        activo: true,
      }),
    )
    expect(await screen.findByRole("status")).toBeVisible()

    await comprobarFueraDeEspera(control)
  })
})

describe("ataque (DESIGN-01a r1): 'Guardar correo' en espera", () => {
  it("en vuelo: una sola corrección; con error sale de la espera y conserva el foco", async () => {
    const pendiente = diferida()
    const fetchMock = apiDeCuentas({ correo: pendiente })
    renderVista()
    await buscarCarla()
    fireEvent.change(screen.getByLabelText("Correo correcto"), {
      target: { value: "carla.ruiz@ejemplo.mx" },
    })

    const control = pulsar("Guardar correo")
    await comprobarEnEspera(control, "Guardar correo")
    activarDeTodasLasFormas(control)
    await esperarUnMomento()
    expect(llamadasQueContienen(fetchMock, "/correo")).toBe(1)

    await resolverCon(pendiente, errorJson(409, "CORREO_EN_USO"))
    await comprobarFueraDeEspera(control)
    expect(document.activeElement).toBe(control)
  })

  it("con éxito sale de la espera", async () => {
    const pendiente = diferida()
    apiDeCuentas({ correo: pendiente })
    renderVista()
    await buscarCarla()
    fireEvent.change(screen.getByLabelText("Correo correcto"), {
      target: { value: "carla.ruiz@ejemplo.mx" },
    })

    const control = pulsar("Guardar correo")
    await comprobarEnEspera(control, "Guardar correo")
    await resolverCon(pendiente, respuestaJson(200, { ...carla, email: "carla.ruiz@ejemplo.mx" }))
    await screen.findByText("carla.ruiz@ejemplo.mx")

    await comprobarFueraDeEspera(control)
  })
})

describe("ataque (DESIGN-01a r1): 'Sí, restablecer' en espera", () => {
  it("en vuelo: clic, Enter y Espacio repetidos no generan una segunda temporal; con error sale de la espera", async () => {
    const pendiente = diferida()
    const fetchMock = apiDeCuentas({ restablecer: pendiente })
    renderVista()
    await buscarCarla()
    fireEvent.click(boton("Restablecer contraseña"))

    const control = pulsar("Sí, restablecer")
    await comprobarEnEspera(control, "Sí, restablecer")
    activarDeTodasLasFormas(control)
    await esperarUnMomento()
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(1)

    await resolverCon(pendiente, errorJson(500, "ERROR_INTERNO"))
    expect(await screen.findByRole("alert")).toBeVisible()
    await comprobarFueraDeEspera(boton("Sí, restablecer"))
  })

  it("con éxito aparece una sola temporal y 'Sí, restablecer' desaparece", async () => {
    const pendiente = diferida()
    const fetchMock = apiDeCuentas({ restablecer: pendiente })
    renderVista()
    await buscarCarla()
    fireEvent.click(boton("Restablecer contraseña"))

    const control = pulsar("Sí, restablecer")
    await comprobarEnEspera(control, "Sí, restablecer")
    activarDeTodasLasFormas(control)
    await resolverCon(pendiente, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))

    expect(await screen.findAllByText(TEMPORAL)).toHaveLength(1)
    expect(screen.queryByRole("button", { name: "Sí, restablecer" })).not.toBeInTheDocument()
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(1)
  })
})

describe("ataque (DESIGN-01a r1): 'Copiar' en espera con writeText lento", () => {
  const verTemporal = async () => {
    apiDeCuentas({})
    renderVista()
    await buscarCarla()
    fireEvent.click(boton("Restablecer contraseña"))
    fireEvent.click(boton("Sí, restablecer"))
    await screen.findByText(TEMPORAL)
  }

  const portapapelesLento = () => {
    let resolver: () => void = () => undefined
    let rechazar: (motivo: unknown) => void = () => undefined
    const writeText = vi.fn(
      () =>
        new Promise<void>((res, rej) => {
          resolver = res
          rechazar = rej
        }),
    )
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    })
    return {
      writeText,
      terminar: () => act(async () => resolver()),
      fallar: () => act(async () => rechazar(new DOMException("denied", "NotAllowedError"))),
    }
  }

  it("en vuelo: en espera con el foco y un solo writeText; al copiar sale de la espera con un solo aviso", async () => {
    const portapapeles = portapapelesLento()
    await verTemporal()

    const control = pulsar("Copiar")
    await comprobarEnEspera(control, "Copiar")
    activarDeTodasLasFormas(control)
    await esperarUnMomento()
    expect(portapapeles.writeText).toHaveBeenCalledTimes(1)

    await portapapeles.terminar()
    await comprobarFueraDeEspera(control)
    expect(aviso.success).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(control)
  })

  it("si writeText falla, sale de la espera con un solo aviso de error", async () => {
    const portapapeles = portapapelesLento()
    await verTemporal()

    const control = pulsar("Copiar")
    await comprobarEnEspera(control, "Copiar")
    await portapapeles.fallar()

    await comprobarFueraDeEspera(control)
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(aviso.success).not.toHaveBeenCalled()
  })
})
