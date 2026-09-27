import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { StrictMode, type ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CuentasView } from "./cuentas-view"

// Ataques del Tester (DESIGN-01a, ronda 1) contra la corrección de T-14 en ficha-de-cuenta.tsx
// (§D-6): el foco se decide con el elemento activo en el momento de la respuesta. Contrato F-1 a
// F-4: el camino "foco en <body>" (clic en una zona no enfocable) seguido o no de otro campo, con
// éxito y con error; salir con Tab y volver antes de la respuesta; cambio de ventana; <StrictMode>;
// cancelar en vuelo y seguir en otro control; un 500 seguido de un reintento.

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

// Cada llamada a /restablecer-contrasena toma la siguiente respuesta diferida, en orden.
const apiDeCuentas = (...pendientes: Diferida[]) => {
  let siguiente = 0
  const fetchMock = vi.fn<typeof fetch>((entrada) => {
    const ruta = String(entrada)
    if (ruta === "/api/admin/usuarios/buscar") {
      return Promise.resolve(respuestaJson(200, { usuario: carla }))
    }
    if (ruta.endsWith("/restablecer-contrasena")) {
      const pendiente = pendientes[siguiente]
      siguiente += 1
      if (!pendiente) throw new Error("llegó una petición de restablecimiento que no se esperaba")
      return pendiente.promesa
    }
    return Promise.resolve(errorJson(500, "ERROR_INTERNO"))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const llamadasQueContienen = (fetchMock: ReturnType<typeof apiDeCuentas>, fragmento: string) =>
  fetchMock.mock.calls.filter(([entrada]) => String(entrada).includes(fragmento)).length

const renderVista = (envolver: (hijo: ReactNode) => ReactNode = (hijo) => hijo) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    envolver(
      <QueryClientProvider client={queryClient}>
        <CuentasView />
      </QueryClientProvider>,
    ),
  )
}

const campoBuscar = () => screen.getByLabelText("Correo exacto de la cuenta")
const boton = (nombre: string) => screen.getByRole("button", { name: nombre })

const buscarCarla = async () => {
  const campo = campoBuscar()
  act(() => campo.focus())
  fireEvent.change(campo, { target: { value: carla.email } })
  fireEvent.submit(screen.getByRole("form", { name: "Buscar" }))
  await screen.findByText(carla.nombre)
}

const esperarUnMomento = () => act(() => new Promise((resolver) => setTimeout(resolver, 30)))

const resolverCon = async (pendiente: Diferida, respuesta: Response) => {
  await act(async () => {
    pendiente.resolver(respuesta)
    await pendiente.promesa
  })
}

const describirFoco = () => {
  const conFoco = document.activeElement
  if (!conFoco || conFoco === document.body) return "<body>"
  return `${conFoco.tagName.toLowerCase()} "${conFoco.textContent || conFoco.getAttribute("aria-label") || conFoco.id}"`
}

// Abre la confirmación y confirma con el foco puesto en "Sí, restablecer" (Chromium lo enfoca con
// el clic; jsdom no). Comprueba F-1: en espera, sin `disabled` y con el foco.
const confirmarEnVuelo = async () => {
  fireEvent.click(boton("Restablecer contraseña"))
  const confirmar = boton("Sí, restablecer")
  act(() => confirmar.focus())
  fireEvent.click(confirmar)
  await waitFor(() => expect(confirmar).toHaveAttribute("aria-disabled", "true"))
  expect(confirmar).toHaveAttribute("aria-busy", "true")
  expect(confirmar).not.toHaveAttribute("disabled")
  expect(document.activeElement, "F-1: 'Sí, restablecer' en vuelo perdió el foco").toBe(confirmar)
  return confirmar
}

// Un clic sobre una zona no enfocable de la página: el control con el foco lo pierde hacia <body>.
const clicEnZonaNoEnfocable = () => {
  const conFoco = document.activeElement
  if (!(conFoco instanceof HTMLElement) || conFoco === document.body) {
    throw new Error("no hay ningún control con el foco antes del clic en la zona no enfocable")
  }
  act(() => conFoco.blur())
  expect(document.activeElement).toBe(document.body)
}

const escribirEn = (campo: HTMLElement, texto: string) => {
  act(() => campo.focus())
  fireEvent.change(campo, { target: { value: texto } })
  expect(document.activeElement, "el campo debía recibir el foco con el clic").toBe(campo)
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("ataque (DESIGN-01a r1): F-2 y F-3 tras un clic en una zona no enfocable", () => {
  it("clic fuera y a escribir en 'Nombre completo': la temporal no le roba el foco", async () => {
    const pendiente = diferida()
    apiDeCuentas(pendiente)
    renderVista()
    await buscarCarla()
    await confirmarEnVuelo()

    clicEnZonaNoEnfocable()
    const nombre = screen.getByLabelText("Nombre completo")
    escribirEn(nombre, "Ana Lóp")
    await resolverCon(pendiente, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    await screen.findByText(TEMPORAL)
    await esperarUnMomento()

    expect(document.activeElement, `la temporal llevó el foco a ${describirFoco()}`).toBe(nombre)
  })

  it("clic fuera y a escribir en 'Correo correcto' de la misma ficha: un 500 no le lleva el foco a 'Cancelar'", async () => {
    const pendiente = diferida()
    apiDeCuentas(pendiente)
    renderVista()
    await buscarCarla()
    await confirmarEnVuelo()

    clicEnZonaNoEnfocable()
    const correo = screen.getByLabelText("Correo correcto")
    escribirEn(correo, "carla.r")
    await resolverCon(pendiente, errorJson(500, "ERROR_INTERNO"))
    expect(await screen.findByRole("alert")).toBeVisible()
    await esperarUnMomento()

    expect(document.activeElement, `el error llevó el foco a ${describirFoco()}`).toBe(correo)
  })

  it("clic fuera sin ir a otro campo (nadie tiene el foco): la temporal lleva el foco a 'Copiar'", async () => {
    const pendiente = diferida()
    apiDeCuentas(pendiente)
    renderVista()
    await buscarCarla()
    await confirmarEnVuelo()

    clicEnZonaNoEnfocable()
    await resolverCon(pendiente, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    await screen.findByText(TEMPORAL)
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(boton("Copiar"))
  })

  it("clic fuera sin ir a otro campo: un 500 lleva el foco a 'Cancelar', nunca lo deja en <body>", async () => {
    const pendiente = diferida()
    apiDeCuentas(pendiente)
    renderVista()
    await buscarCarla()
    await confirmarEnVuelo()

    clicEnZonaNoEnfocable()
    await resolverCon(pendiente, errorJson(500, "ERROR_INTERNO"))
    expect(await screen.findByRole("alert")).toBeVisible()
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(boton("Cancelar"))
  })
})

describe("ataque (DESIGN-01a r1): salir y volver antes de la respuesta", () => {
  it("sale con Tab a 'Correo correcto' y vuelve a 'Sí, restablecer': la temporal lleva el foco a 'Copiar'", async () => {
    const pendiente = diferida()
    apiDeCuentas(pendiente)
    renderVista()
    await buscarCarla()
    const confirmar = await confirmarEnVuelo()

    act(() => screen.getByLabelText("Correo correcto").focus())
    act(() => confirmar.focus())
    await resolverCon(pendiente, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    await screen.findByText(TEMPORAL)
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(boton("Copiar"))
  })

  it("sale a 'Buscar' y se queda ahí: la temporal aparece y el foco no se mueve", async () => {
    const pendiente = diferida()
    apiDeCuentas(pendiente)
    renderVista()
    await buscarCarla()
    await confirmarEnVuelo()

    const buscar = boton("Buscar")
    act(() => buscar.focus())
    await resolverCon(pendiente, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    expect(await screen.findByText(TEMPORAL)).toBeVisible()
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(buscar)
  })

  it("cambio de ventana (el documento conserva su elemento activo): la temporal lleva el foco a 'Copiar'", async () => {
    const pendiente = diferida()
    apiDeCuentas(pendiente)
    renderVista()
    await buscarCarla()
    const confirmar = await confirmarEnVuelo()

    act(() => {
      window.dispatchEvent(new FocusEvent("blur"))
    })
    expect(document.activeElement).toBe(confirmar)
    await resolverCon(pendiente, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    await screen.findByText(TEMPORAL)
    act(() => {
      window.dispatchEvent(new FocusEvent("focus"))
    })
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(boton("Copiar"))
  })
})

describe("ataque (DESIGN-01a r1): cancelar en vuelo y seguir en otro control", () => {
  it("'Cancelar' en vuelo y a escribir en 'Correo exacto de la cuenta': la temporal no le roba el foco", async () => {
    const pendiente = diferida()
    apiDeCuentas(pendiente)
    renderVista()
    await buscarCarla()
    await confirmarEnVuelo()

    fireEvent.click(boton("Cancelar"))
    expect(document.activeElement).toBe(boton("Restablecer contraseña"))
    const campo = campoBuscar()
    escribirEn(campo, "beto@")
    await resolverCon(pendiente, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    expect(await screen.findByText(TEMPORAL)).toBeVisible()
    await esperarUnMomento()

    expect(document.activeElement, `la temporal llevó el foco a ${describirFoco()}`).toBe(campo)
  })

  it("'Cancelar' en vuelo, reabrir la confirmación y llega un 500: el foco va a 'Cancelar' y el reintento funciona", async () => {
    const primera = diferida()
    const segunda = diferida()
    const fetchMock = apiDeCuentas(primera, segunda)
    renderVista()
    await buscarCarla()
    await confirmarEnVuelo()

    fireEvent.click(boton("Cancelar"))
    fireEvent.click(boton("Restablecer contraseña"))
    expect(document.activeElement).toBe(boton("Cancelar"))
    expect(boton("Sí, restablecer")).toHaveAttribute("aria-disabled", "true")
    fireEvent.click(boton("Sí, restablecer"))
    await resolverCon(primera, errorJson(500, "ERROR_INTERNO"))
    expect(await screen.findByRole("alert")).toBeVisible()
    await esperarUnMomento()
    expect(document.activeElement, `tras el 500, el foco quedó en ${describirFoco()}`).toBe(
      boton("Cancelar"),
    )
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(1)

    const reintento = boton("Sí, restablecer")
    act(() => reintento.focus())
    fireEvent.click(reintento)
    await resolverCon(segunda, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    await screen.findByText(TEMPORAL)
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(boton("Copiar"))
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(2)
  })
})

describe("ataque (DESIGN-01a r1): un 500 mientras escribe en otro campo, y el reintento", () => {
  it("el 500 no le quita el foco; vuelve, reintenta, y la temporal sí lleva el foco a 'Copiar'", async () => {
    const primera = diferida()
    const segunda = diferida()
    const fetchMock = apiDeCuentas(primera, segunda)
    renderVista()
    await buscarCarla()
    await confirmarEnVuelo()

    const nombre = screen.getByLabelText("Nombre completo")
    escribirEn(nombre, "Ana")
    await resolverCon(primera, errorJson(500, "ERROR_INTERNO"))
    expect(await screen.findByRole("alert")).toBeVisible()
    await esperarUnMomento()
    expect(document.activeElement, `el 500 llevó el foco a ${describirFoco()}`).toBe(nombre)

    const reintento = boton("Sí, restablecer")
    await waitFor(() => expect(reintento).not.toHaveAttribute("aria-disabled"))
    act(() => reintento.focus())
    fireEvent.click(reintento)
    await waitFor(() => expect(reintento).toHaveAttribute("aria-disabled", "true"))
    expect(document.activeElement).toBe(reintento)
    await resolverCon(segunda, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    await screen.findByText(TEMPORAL)
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(boton("Copiar"))
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(2)
  })
})

describe("ataque (DESIGN-01a r1): F-2 y F-4 con <StrictMode>", () => {
  it("con <StrictMode>: clic fuera y a escribir en 'Nombre completo', la temporal no le roba el foco", async () => {
    const pendiente = diferida()
    apiDeCuentas(pendiente)
    renderVista((hijo) => <StrictMode>{hijo}</StrictMode>)
    await buscarCarla()
    await confirmarEnVuelo()

    clicEnZonaNoEnfocable()
    const nombre = screen.getByLabelText("Nombre completo")
    escribirEn(nombre, "Ana Lóp")
    await resolverCon(pendiente, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    await screen.findByText(TEMPORAL)
    await esperarUnMomento()

    expect(document.activeElement, `la temporal llevó el foco a ${describirFoco()}`).toBe(nombre)
  })

  it("con <StrictMode>: la ficha que aparece, abrir y cancelar no mueven el foco más que lo pactado", async () => {
    apiDeCuentas()
    renderVista((hijo) => <StrictMode>{hijo}</StrictMode>)
    await buscarCarla()
    await esperarUnMomento()
    expect(document.activeElement, `al montar, el foco quedó en ${describirFoco()}`).toBe(
      campoBuscar(),
    )

    fireEvent.click(boton("Restablecer contraseña"))
    expect(document.activeElement).toBe(boton("Cancelar"))
    fireEvent.click(boton("Cancelar"))
    expect(document.activeElement).toBe(boton("Restablecer contraseña"))
  })
})
