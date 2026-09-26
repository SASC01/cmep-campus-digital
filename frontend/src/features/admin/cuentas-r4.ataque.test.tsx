import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { StrictMode, type ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CuentasView } from "./cuentas-view"

// Ataques del Tester (AUTH-02b, ronda 4) contra el cambio de la ronda 4 en ficha-de-cuenta.tsx:
// manejarDesenfoque ya no apaga tieneFocoRef si el blur no tiene destino (relatedTarget nulo o
// <body>), onError devuelve el foco a "Cancelar" y confirmandoAnteriorRef sustituye a
// esPrimerRenderRef.

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

const diferida = () => {
  let resolver: (respuesta: Response) => void = () => {
    throw new Error("la respuesta diferida se resolvió antes de crearse")
  }
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver: (respuesta: Response) => resolver(respuesta) }
}

// Cada llamada a /restablecer-contrasena toma la siguiente respuesta de la lista, en orden.
const apiDeCuentas = (...respuestas: Array<() => Response | Promise<Response>>) => {
  let siguiente = 0
  return stubFetch((ruta, init) => {
    if (ruta === "/api/admin/usuarios/buscar") {
      const { email } = cuerpoDe(init) as { email: string }
      const usuario = [carla, beto].find((u) => u.email === email)
      if (!usuario) return errorJson(404, "USUARIO_NO_ENCONTRADO")
      return respuestaJson(200, { usuario })
    }
    if (ruta.endsWith("/restablecer-contrasena")) {
      const respuesta = respuestas[siguiente]
      siguiente += 1
      if (respuesta) return respuesta()
      return respuestaJson(200, { contrasenaTemporal: TEMPORAL })
    }
    return errorJson(500, "ERROR_INTERNO")
  })
}

const conStrictMode = (hijo: ReactNode) => <StrictMode>{hijo}</StrictMode>

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

const buscarConEnter = async (correo: string, nombreEsperado?: string) => {
  const campo = campoBuscar()
  act(() => campo.focus())
  fireEvent.change(campo, { target: { value: correo } })
  const formulario = campo.closest("form")
  if (!formulario) throw new Error("el campo de búsqueda no está dentro de un formulario")
  fireEvent.submit(formulario)
  if (nombreEsperado) await screen.findByText(nombreEsperado)
}

const boton = (nombre: string) => screen.getByRole("button", { name: nombre })

const esperarUnMomento = () => act(() => new Promise((resolver) => setTimeout(resolver, 30)))

const pulsarEnter = () => {
  const conFoco = document.activeElement
  if (!(conFoco instanceof HTMLElement) || conFoco === document.body) {
    throw new Error("no hay ningún control con el foco al pulsar Enter")
  }
  fireEvent.click(conFoco)
}

const controlesEnfocables = () =>
  Array.from(document.querySelectorAll<HTMLElement>("button, input, a[href], select, textarea"))
    .filter((control) => !control.hasAttribute("disabled"))
    .filter((control) => control.tabIndex >= 0)

const pulsarShiftTab = () => {
  const lista = controlesEnfocables()
  const conFoco = document.activeElement
  if (!(conFoco instanceof HTMLElement)) throw new Error("no hay ningún control con el foco")
  const indice = lista.indexOf(conFoco)
  if (indice <= 0) throw new Error("no hay un control anterior en el orden de tabulación")
  const anterior = lista[indice - 1]
  if (!anterior) throw new Error("no hay un control anterior en el orden de tabulación")
  act(() => anterior.focus())
}

// La misma emulación de la ronda 3 (T-12): Chromium saca el foco del botón que pasa a `disabled` y
// lo deja en <body>, con un blur/focusout sin destino (relatedTarget nulo). jsdom no lo hace.
const emularCorreccionDelFocoDeChromium = async (control: HTMLElement) => {
  await waitFor(() => expect(control).toBeDisabled())
  expect(document.activeElement, "el botón deshabilitado debía tener el foco").toBe(control)
  act(() => {
    control.removeAttribute("disabled")
    control.blur()
    control.setAttribute("disabled", "")
  })
  expect(control).toBeDisabled()
  expect(document.activeElement).toBe(document.body)
}

// Un clic sobre una zona no enfocable de la página (texto, fondo): el control con el foco lo pierde
// hacia <body> con un blur sin destino (relatedTarget nulo), en cualquier navegador.
const clicEnZonaNoEnfocable = () => {
  const conFoco = document.activeElement
  if (!(conFoco instanceof HTMLElement) || conFoco === document.body) {
    throw new Error("no hay ningún control con el foco antes del clic en la zona no enfocable")
  }
  act(() => conFoco.blur())
  expect(document.activeElement).toBe(document.body)
}

// El admin hace clic en un campo y empieza a escribir.
const escribirEn = (campo: HTMLElement, texto: string) => {
  act(() => campo.focus())
  fireEvent.change(campo, { target: { value: texto } })
  expect(document.activeElement, "el campo debía recibir el foco con el clic").toBe(campo)
}

const describirFoco = () => {
  const conFoco = document.activeElement
  if (!conFoco || conFoco === document.body) return "<body>"
  return `${conFoco.tagName.toLowerCase()} "${conFoco.textContent || conFoco.getAttribute("aria-label") || conFoco.id}"`
}

const confirmarConClic = () => {
  fireEvent.click(boton("Restablecer contraseña"))
  const confirmar = boton("Sí, restablecer")
  // Chromium enfoca el botón con el clic; jsdom no, así que se enfoca a mano antes del clic.
  act(() => confirmar.focus())
  fireEvent.click(confirmar)
  return confirmar
}

const resolverCon = async (pendiente: ReturnType<typeof diferida>, respuesta: Response) => {
  await act(async () => {
    pendiente.resolver(respuesta)
    await pendiente.promesa
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

// T-14. Tras la corrección del foco de Chromium (el caso que la ronda 4 dejó de contar como
// abandono), el foco ya está en <body>: cuando el admin hace clic en otro campo, ningún blur sale
// del contenedor de la confirmación, así que tieneFocoRef se queda en true y la llegada de la
// respuesta le quita el foco. Es la reproducción de T-11, ahora en el navegador real.
describe("ataque (AUTH-02b r4): en Chromium, el admin se va a otro campo con la petición en vuelo", () => {
  // Riesgo aceptado por el humano el 2026-09-26 (T-14): pasa al encargo del sistema de diseño
  it.fails(
    "la temporal que llega mientras escribe en 'Nombre completo' no le roba el foco",
    async () => {
      const pendiente = diferida()
      apiDeCuentas(() => pendiente.promesa)
      renderVista()
      await buscarConEnter(carla.email, carla.nombre)
      const confirmar = confirmarConClic()
      await emularCorreccionDelFocoDeChromium(confirmar)

      const nombreMaestro = screen.getByLabelText("Nombre completo")
      escribirEn(nombreMaestro, "Ana Lóp")
      await resolverCon(pendiente, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
      await screen.findByText(TEMPORAL)
      await esperarUnMomento()

      expect(
        document.activeElement,
        `el admin escribía en "Nombre completo" y la temporal le llevó el foco a ${describirFoco()}`,
      ).toBe(nombreMaestro)
    },
  )

  // Riesgo aceptado por el humano el 2026-09-26 (T-14): pasa al encargo del sistema de diseño
  it.fails(
    "la temporal que llega mientras escribe en 'Correo correcto' de la misma ficha no le roba el foco",
    async () => {
      const pendiente = diferida()
      apiDeCuentas(() => pendiente.promesa)
      renderVista()
      await buscarConEnter(carla.email, carla.nombre)
      const confirmar = confirmarConClic()
      await emularCorreccionDelFocoDeChromium(confirmar)

      const correo = screen.getByLabelText("Correo correcto")
      escribirEn(correo, "carla.r")
      await resolverCon(pendiente, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
      await screen.findByText(TEMPORAL)
      await esperarUnMomento()

      expect(
        document.activeElement,
        `el admin escribía en "Correo correcto" y la temporal le llevó el foco a ${describirFoco()}`,
      ).toBe(correo)
    },
  )

  // Riesgo aceptado por el humano el 2026-09-26 (T-14): pasa al encargo del sistema de diseño
  it.fails(
    "un 500 que llega mientras escribe en 'Nombre completo' no le lleva el foco a 'Cancelar'",
    async () => {
      const pendiente = diferida()
      apiDeCuentas(() => pendiente.promesa)
      renderVista()
      await buscarConEnter(carla.email, carla.nombre)
      const confirmar = confirmarConClic()
      await emularCorreccionDelFocoDeChromium(confirmar)

      const nombreMaestro = screen.getByLabelText("Nombre completo")
      escribirEn(nombreMaestro, "Ana Lóp")
      await resolverCon(pendiente, errorJson(500, "ERROR_INTERNO"))
      expect(await screen.findByRole("alert")).toBeVisible()
      await esperarUnMomento()

      expect(
        document.activeElement,
        `el admin escribía en "Nombre completo" y el error le llevó el foco a ${describirFoco()}`,
      ).toBe(nombreMaestro)
    },
  )
})

// T-14, en cualquier navegador: el blur sin destino también lo produce un clic en una zona no
// enfocable. Después, el admin se va a otro campo sin que el contenedor se entere.
describe("ataque (AUTH-02b r4): un clic en una zona no enfocable y después otro campo", () => {
  // Riesgo aceptado por el humano el 2026-09-26 (T-14): pasa al encargo del sistema de diseño
  it.fails(
    "'Cancelar' con la petición en vuelo, clic fuera y a escribir en 'Nombre completo': la temporal no le roba el foco",
    async () => {
      const pendiente = diferida()
      apiDeCuentas(() => pendiente.promesa)
      renderVista()
      await buscarConEnter(carla.email, carla.nombre)
      confirmarConClic()
      fireEvent.click(boton("Cancelar"))
      expect(document.activeElement).toBe(boton("Restablecer contraseña"))

      clicEnZonaNoEnfocable()
      const nombreMaestro = screen.getByLabelText("Nombre completo")
      escribirEn(nombreMaestro, "Ana Lóp")
      await resolverCon(pendiente, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
      await screen.findByText(TEMPORAL)
      await esperarUnMomento()

      expect(
        document.activeElement,
        `el admin escribía en "Nombre completo" y la temporal le llevó el foco a ${describirFoco()}`,
      ).toBe(nombreMaestro)
    },
  )
})

describe("ataque (AUTH-02b r4): lo que el cambio de la ronda 4 sí debe sostener", () => {
  it("jsdom, sin corrección: el admin pasa directo de 'Sí, restablecer' a 'Nombre completo' y un 500 no le quita el foco", async () => {
    const pendiente = diferida()
    apiDeCuentas(() => pendiente.promesa)
    renderVista()
    await buscarConEnter(carla.email, carla.nombre)
    confirmarConClic()

    const nombreMaestro = screen.getByLabelText("Nombre completo")
    escribirEn(nombreMaestro, "Ana Lóp")
    await resolverCon(pendiente, errorJson(500, "ERROR_INTERNO"))
    expect(await screen.findByRole("alert")).toBeVisible()
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(nombreMaestro)
  })

  it("'Cancelar' con la petición en vuelo y después un 500: el foco se queda en 'Restablecer contraseña'", async () => {
    const pendiente = diferida()
    apiDeCuentas(() => pendiente.promesa)
    renderVista()
    await buscarConEnter(carla.email, carla.nombre)
    confirmarConClic()
    fireEvent.click(boton("Cancelar"))
    expect(document.activeElement).toBe(boton("Restablecer contraseña"))

    await resolverCon(pendiente, errorJson(500, "ERROR_INTERNO"))
    expect(await screen.findByRole("alert")).toBeVisible()
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(
      boton("Restablecer contraseña"),
    )
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument()
  })

  it("en Chromium: 500, el foco vuelve a 'Cancelar', Shift+Tab y Enter reintentan y la temporal lleva el foco a 'Copiar'", async () => {
    const primera = diferida()
    const segunda = diferida()
    const fetchMock = apiDeCuentas(
      () => primera.promesa,
      () => segunda.promesa,
    )
    renderVista()
    await buscarConEnter(carla.email, carla.nombre)
    const confirmar = confirmarConClic()
    await emularCorreccionDelFocoDeChromium(confirmar)
    await resolverCon(primera, errorJson(500, "ERROR_INTERNO"))
    expect(await screen.findByRole("alert")).toBeVisible()
    await waitFor(() => expect(boton("Sí, restablecer")).toBeEnabled())
    expect(document.activeElement, `tras el 500, el foco quedó en ${describirFoco()}`).toBe(
      boton("Cancelar"),
    )

    pulsarShiftTab()
    expect(document.activeElement).toBe(boton("Sí, restablecer"))
    pulsarEnter()
    await emularCorreccionDelFocoDeChromium(boton("Sí, restablecer"))
    await resolverCon(segunda, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    await screen.findByText(TEMPORAL)
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(boton("Copiar"))
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(2)
  })

  it("en Chromium: tras la corrección, el admin vuelve a 'Cancelar' con Tab y la temporal lleva el foco a 'Copiar'", async () => {
    const pendiente = diferida()
    apiDeCuentas(() => pendiente.promesa)
    renderVista()
    await buscarConEnter(carla.email, carla.nombre)
    const confirmar = confirmarConClic()
    await emularCorreccionDelFocoDeChromium(confirmar)

    act(() => boton("Cancelar").focus())
    await resolverCon(pendiente, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    await screen.findByText(TEMPORAL)
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(boton("Copiar"))
  })
})

describe("ataque (AUTH-02b r4): confirmandoAnteriorRef con <StrictMode>, remontajes y cambios de cuenta", () => {
  it("con <StrictMode>: abrir y cancelar tres veces alterna el foco entre 'Cancelar' y 'Restablecer contraseña'", async () => {
    const fetchMock = apiDeCuentas()
    renderVista(conStrictMode)
    await buscarConEnter(carla.email, carla.nombre)
    await esperarUnMomento()
    expect(document.activeElement).toBe(campoBuscar())

    for (let vuelta = 1; vuelta <= 3; vuelta += 1) {
      fireEvent.click(boton("Restablecer contraseña"))
      expect(document.activeElement, `vuelta ${vuelta}: al abrir`).toBe(boton("Cancelar"))
      fireEvent.click(boton("Cancelar"))
      expect(document.activeElement, `vuelta ${vuelta}: al cancelar`).toBe(
        boton("Restablecer contraseña"),
      )
    }
    await esperarUnMomento()

    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(0)
  })

  it("con <StrictMode>: Enter mantenido (nueve activaciones) no restablece ni pasa por <body>", async () => {
    const fetchMock = apiDeCuentas()
    renderVista(conStrictMode)
    await buscarConEnter(carla.email, carla.nombre)
    act(() => boton("Restablecer contraseña").focus())

    const recorrido: string[] = []
    for (let pulsacion = 0; pulsacion < 9; pulsacion += 1) {
      pulsarEnter()
      recorrido.push(describirFoco())
    }
    await esperarUnMomento()

    expect(
      llamadasQueContienen(fetchMock, "/restablecer-contrasena"),
      `recorrido del foco: ${recorrido.join(" → ")}`,
    ).toBe(0)
    expect(recorrido).not.toContain("<body>")
  })

  it("con <StrictMode> y en Chromium: el admin confirma y no se mueve, y la temporal lleva el foco a 'Copiar'", async () => {
    const pendiente = diferida()
    apiDeCuentas(() => pendiente.promesa)
    renderVista(conStrictMode)
    await buscarConEnter(carla.email, carla.nombre)
    const confirmar = confirmarConClic()
    await emularCorreccionDelFocoDeChromium(confirmar)

    await resolverCon(pendiente, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    await screen.findByText(TEMPORAL)
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(boton("Copiar"))
  })

  it("con <StrictMode>: buscar a Beto con la confirmación abierta en Carla no mueve el foco del buscador, y su confirmación enfoca su 'Cancelar'", async () => {
    apiDeCuentas()
    renderVista(conStrictMode)
    await buscarConEnter(carla.email, carla.nombre)
    fireEvent.click(boton("Restablecer contraseña"))
    expect(document.activeElement).toBe(boton("Cancelar"))

    await buscarConEnter(beto.email, beto.nombre)
    await esperarUnMomento()
    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(campoBuscar())
    expect(screen.queryByRole("button", { name: "Sí, restablecer" })).not.toBeInTheDocument()

    const ficha = screen.getByText(beto.nombre).closest("div.rounded-lg")
    if (!(ficha instanceof HTMLElement)) throw new Error("no se encontró el contenedor de la ficha")
    fireEvent.click(within(ficha).getByRole("button", { name: "Restablecer contraseña" }))
    expect(document.activeElement).toBe(within(ficha).getByRole("button", { name: "Cancelar" }))
  })

  it("con <StrictMode>: desmontar y volver a montar la vista entera no mueve el foco al montar", async () => {
    apiDeCuentas()
    const { unmount } = renderVista(conStrictMode)
    await buscarConEnter(carla.email, carla.nombre)
    fireEvent.click(boton("Restablecer contraseña"))
    unmount()

    renderVista(conStrictMode)
    await buscarConEnter(carla.email, carla.nombre)
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(campoBuscar())
    expect(screen.queryByRole("button", { name: "Sí, restablecer" })).not.toBeInTheDocument()
  })
})
