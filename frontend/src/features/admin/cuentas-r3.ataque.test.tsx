import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { StrictMode, type ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CuentasView } from "./cuentas-view"

// Ataques del Tester (AUTH-02b, ronda 3) contra el rediseño del foco de la ronda 3: el useEffect
// sobre "confirmando" (T-09, T-10), el ref tieneFocoRef leído en el onSuccess (T-11) y el
// esPrimerRenderRef que evita mover el foco en el primer render.

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

const apiDeCuentas = (restablecer?: () => Response | Promise<Response>) =>
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
    return errorJson(500, "ERROR_INTERNO")
  })

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

// Como un admin que escribe el correo y pulsa Enter en el campo: el foco se queda en el campo.
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

// jsdom no ejecuta la acción por defecto de una tecla: en un navegador, Enter sobre un botón con el
// foco dispara su "click". Se emula así, sobre lo que tenga el foco en ese momento.
const pulsarEnter = () => {
  const conFoco = document.activeElement
  if (!(conFoco instanceof HTMLElement) || conFoco === document.body) {
    throw new Error("no hay ningún control con el foco al pulsar Enter")
  }
  fireEvent.click(conFoco)
}

// Orden secuencial del foco (Tab) de la página: controles habilitados, en orden del documento.
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

// Chromium (comprobado con Chrome 153 sin interfaz, ver el reporte): cuando el botón que tiene el
// foco pasa a `disabled`, en la siguiente actualización de la página el navegador dispara `blur` y
// `focusout` sobre él y deja el foco en <body> (la "corrección del foco" del HTML). jsdom no la
// implementa, y su blur() no hace nada sobre un control deshabilitado (no lo considera enfocable):
// se quita `disabled` un instante para que blur() dispare los mismos eventos que Chromium, y se
// vuelve a poner. El DOM queda igual que como lo dejó React.
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

const describirFoco = () => {
  const conFoco = document.activeElement
  if (!conFoco || conFoco === document.body) return "<body>"
  return `${conFoco.tagName.toLowerCase()} "${conFoco.textContent || conFoco.getAttribute("aria-label") || conFoco.id}"`
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("ataque (AUTH-02b r3): la confirmación abierta y cerrada, y el teclado", () => {
  it("abrir y cerrar la confirmación cinco veces seguidas alterna el foco sin perderlo y sin peticiones", async () => {
    const fetchMock = apiDeCuentas()
    renderVista()
    await buscarConEnter(carla.email, carla.nombre)

    for (let vuelta = 1; vuelta <= 5; vuelta += 1) {
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

  it("Enter mantenido (nueve activaciones seguidas sobre lo que tenga el foco) nunca restablece", async () => {
    const fetchMock = apiDeCuentas()
    renderVista()
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
    expect(screen.queryByText(TEMPORAL)).not.toBeInTheDocument()
  })

  it("Shift+Tab desde 'Cancelar' llega a 'Sí, restablecer' y Enter ahí sí restablece, una vez", async () => {
    const fetchMock = apiDeCuentas()
    renderVista()
    await buscarConEnter(carla.email, carla.nombre)
    act(() => boton("Restablecer contraseña").focus())
    pulsarEnter()
    expect(document.activeElement).toBe(boton("Cancelar"))

    pulsarShiftTab()
    expect(document.activeElement).toBe(boton("Sí, restablecer"))
    pulsarEnter()

    expect(await screen.findByText(TEMPORAL)).toBeVisible()
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(1)
    await waitFor(() => expect(document.activeElement).toBe(boton("Copiar")))
  })

  it("Tab desde 'Cancelar' sale de la confirmación: el siguiente control no es 'Sí, restablecer'", async () => {
    apiDeCuentas()
    renderVista()
    await buscarConEnter(carla.email, carla.nombre)
    fireEvent.click(boton("Restablecer contraseña"))
    const lista = controlesEnfocables()
    const siguiente = lista[lista.indexOf(boton("Cancelar")) + 1]

    expect(siguiente, "no hay ningún control después de 'Cancelar'").toBeDefined()
    expect(siguiente).not.toBe(boton("Sí, restablecer"))
  })
})

describe("ataque (AUTH-02b r3): el primer render no roba el foco", () => {
  it("la ficha que aparece tras buscar con Enter deja el foco en el campo de búsqueda", async () => {
    apiDeCuentas()
    renderVista()

    await buscarConEnter(carla.email, carla.nombre)
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(campoBuscar())
  })

  it("buscar otra cuenta (la ficha se remonta) tampoco mueve el foco del campo de búsqueda", async () => {
    apiDeCuentas()
    renderVista()
    await buscarConEnter(carla.email, carla.nombre)

    await buscarConEnter(beto.email, beto.nombre)
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(campoBuscar())
  })

  // T-13. main.tsx monta la aplicación dentro de <StrictMode>: en desarrollo, React simula desmontar
  // y volver a montar cada componente nuevo y vuelve a ejecutar sus efectos, conservando los refs.
  it("con <StrictMode> (como en main.tsx), la ficha que aparece no le quita el foco al campo de búsqueda", async () => {
    apiDeCuentas()
    renderVista((hijo) => <StrictMode>{hijo}</StrictMode>)

    await buscarConEnter(carla.email, carla.nombre)
    await esperarUnMomento()

    expect(
      document.activeElement,
      `con <StrictMode>, el primer render de la ficha movió el foco a ${describirFoco()}`,
    ).toBe(campoBuscar())
  })
})

describe("ataque (AUTH-02b r3): la respuesta llega cuando la ficha ya cambió", () => {
  it("la temporal de Carla que llega con Beto en pantalla no aparece ni mueve el foco del buscador", async () => {
    const pendiente = diferida()
    apiDeCuentas(() => pendiente.promesa)
    renderVista()
    await buscarConEnter(carla.email, carla.nombre)
    fireEvent.click(boton("Restablecer contraseña"))
    const confirmar = boton("Sí, restablecer")
    act(() => confirmar.focus())
    fireEvent.click(confirmar)

    await buscarConEnter(beto.email, beto.nombre)
    await act(async () => {
      pendiente.resolver(respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
      await pendiente.promesa
    })
    await esperarUnMomento()

    expect(screen.queryByText(TEMPORAL)).not.toBeInTheDocument()
    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(campoBuscar())
  })

  it("la respuesta que llega tras una búsqueda rechazada en el cliente (ficha desmontada) no hace nada", async () => {
    const pendiente = diferida()
    apiDeCuentas(() => pendiente.promesa)
    renderVista()
    await buscarConEnter(carla.email, carla.nombre)
    fireEvent.click(boton("Restablecer contraseña"))
    fireEvent.click(boton("Sí, restablecer"))

    await buscarConEnter("beto@ejemplo")
    expect(screen.queryByText(carla.nombre)).not.toBeInTheDocument()
    await act(async () => {
      pendiente.resolver(respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
      await pendiente.promesa
    })
    await esperarUnMomento()

    expect(screen.queryByText(TEMPORAL)).not.toBeInTheDocument()
    expect(document.activeElement).toBe(campoBuscar())
  })

  it("la respuesta que llega con la vista ya desmontada no lanza ni escribe errores en la consola", async () => {
    const pendiente = diferida()
    apiDeCuentas(() => pendiente.promesa)
    const errorDeConsola = vi.spyOn(console, "error")
    const { unmount } = renderVista()
    await buscarConEnter(carla.email, carla.nombre)
    fireEvent.click(boton("Restablecer contraseña"))
    fireEvent.click(boton("Sí, restablecer"))

    unmount()
    await act(async () => {
      pendiente.resolver(respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
      await pendiente.promesa
    })
    await esperarUnMomento()

    expect(errorDeConsola).not.toHaveBeenCalled()
    expect(document.body.textContent).not.toContain(TEMPORAL)
  })

  it("la temporal que llega mientras el admin escribe en 'Correo correcto' de la misma ficha no le roba el foco", async () => {
    const pendiente = diferida()
    apiDeCuentas(() => pendiente.promesa)
    renderVista()
    await buscarConEnter(carla.email, carla.nombre)
    fireEvent.click(boton("Restablecer contraseña"))
    const confirmar = boton("Sí, restablecer")
    act(() => confirmar.focus())
    fireEvent.click(confirmar)

    const correo = screen.getByLabelText("Correo correcto")
    act(() => correo.focus())
    fireEvent.change(correo, { target: { value: "carla.r" } })
    await act(async () => {
      pendiente.resolver(respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
      await pendiente.promesa
    })
    await screen.findByText(TEMPORAL)
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(correo)
  })

  it("'Cancelar' con la petición en vuelo: la temporal aparece igual y el foco pasa de 'Restablecer contraseña' a 'Copiar'", async () => {
    const pendiente = diferida()
    const fetchMock = apiDeCuentas(() => pendiente.promesa)
    renderVista()
    await buscarConEnter(carla.email, carla.nombre)
    fireEvent.click(boton("Restablecer contraseña"))
    fireEvent.click(boton("Sí, restablecer"))
    fireEvent.click(boton("Cancelar"))
    expect(document.activeElement).toBe(boton("Restablecer contraseña"))

    await act(async () => {
      pendiente.resolver(respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
      await pendiente.promesa
    })

    expect(await screen.findByText(TEMPORAL)).toBeVisible()
    await waitFor(() => expect(document.activeElement).toBe(boton("Copiar")))
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(1)
  })
})

describe("ataque (AUTH-02b r3): error del servidor tras confirmar (jsdom)", () => {
  it("tras un 500 el foco no queda en <body>, la alerta aparece y 'Cancelar' lo devuelve a 'Restablecer contraseña'", async () => {
    apiDeCuentas(() => errorJson(500, "ERROR_INTERNO"))
    renderVista()
    await buscarConEnter(carla.email, carla.nombre)
    fireEvent.click(boton("Restablecer contraseña"))
    const confirmar = boton("Sí, restablecer")
    act(() => confirmar.focus())
    fireEvent.click(confirmar)

    expect(await screen.findByRole("alert")).toBeVisible()
    await waitFor(() => expect(boton("Sí, restablecer")).toBeEnabled())
    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).not.toBe(document.body)

    fireEvent.click(boton("Cancelar"))
    expect(document.activeElement).toBe(boton("Restablecer contraseña"))
    fireEvent.click(boton("Restablecer contraseña"))
    expect(document.activeElement).toBe(boton("Cancelar"))
  })
})

describe("ataque (AUTH-02b r3): sin fugas de estado entre cuentas", () => {
  it("con la confirmación abierta en Carla, la ficha de Beto empieza cerrada y el foco no salta a ella", async () => {
    apiDeCuentas()
    renderVista()
    await buscarConEnter(carla.email, carla.nombre)
    fireEvent.click(boton("Restablecer contraseña"))
    expect(boton("Sí, restablecer")).toBeVisible()

    await buscarConEnter(beto.email, beto.nombre)
    await esperarUnMomento()

    expect(screen.queryByRole("button", { name: "Sí, restablecer" })).not.toBeInTheDocument()
    expect(boton("Restablecer contraseña")).toBeVisible()
    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(campoBuscar())
  })

  it("el error de Carla no aparece en la ficha de Beto", async () => {
    apiDeCuentas(() => errorJson(500, "ERROR_INTERNO"))
    renderVista()
    await buscarConEnter(carla.email, carla.nombre)
    fireEvent.click(boton("Restablecer contraseña"))
    fireEvent.click(boton("Sí, restablecer"))
    expect(await screen.findByRole("alert")).toBeVisible()

    await buscarConEnter(beto.email, beto.nombre)

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("tras la temporal de Carla (con el foco en 'Copiar'), la ficha de Beto no la muestra y su confirmación enfoca su propio 'Cancelar'", async () => {
    const fetchMock = apiDeCuentas()
    renderVista()
    await buscarConEnter(carla.email, carla.nombre)
    fireEvent.click(boton("Restablecer contraseña"))
    const confirmar = boton("Sí, restablecer")
    act(() => confirmar.focus())
    fireEvent.click(confirmar)
    await screen.findByText(TEMPORAL)
    await waitFor(() => expect(document.activeElement).toBe(boton("Copiar")))

    await buscarConEnter(beto.email, beto.nombre)
    await esperarUnMomento()
    expect(screen.queryByText(TEMPORAL)).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Copiar" })).not.toBeInTheDocument()
    expect(document.activeElement).toBe(campoBuscar())

    const ficha = screen.getByText(beto.nombre).closest("div.rounded-lg")
    if (!(ficha instanceof HTMLElement)) throw new Error("no se encontró el contenedor de la ficha")
    fireEvent.click(within(ficha).getByRole("button", { name: "Restablecer contraseña" }))
    expect(document.activeElement).toBe(within(ficha).getByRole("button", { name: "Cancelar" }))
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(1)
  })
})

// T-12. Lo que hace un navegador Chromium con el botón deshabilitado que tiene el foco.
describe("ataque (AUTH-02b r3): en Chromium, 'Sí, restablecer' deshabilitado pierde el foco", () => {
  it("el admin confirma y no se mueve: al llegar la temporal, el foco llega a 'Copiar'", async () => {
    const pendiente = diferida()
    apiDeCuentas(() => pendiente.promesa)
    renderVista()
    await buscarConEnter(carla.email, carla.nombre)
    fireEvent.click(boton("Restablecer contraseña"))
    const confirmar = boton("Sí, restablecer")
    act(() => confirmar.focus())
    fireEvent.click(confirmar)
    await emularCorreccionDelFocoDeChromium(confirmar)

    await act(async () => {
      pendiente.resolver(respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
      await pendiente.promesa
    })
    await screen.findByText(TEMPORAL)
    await esperarUnMomento()

    expect(
      document.activeElement,
      `el admin no movió el foco a ningún lado y la temporal lo dejó en ${describirFoco()}`,
    ).toBe(boton("Copiar"))
  })

  it("el admin confirma y el servidor responde 500: el foco no queda en <body>", async () => {
    const pendiente = diferida()
    apiDeCuentas(() => pendiente.promesa)
    renderVista()
    await buscarConEnter(carla.email, carla.nombre)
    fireEvent.click(boton("Restablecer contraseña"))
    const confirmar = boton("Sí, restablecer")
    act(() => confirmar.focus())
    fireEvent.click(confirmar)
    await emularCorreccionDelFocoDeChromium(confirmar)

    await act(async () => {
      pendiente.resolver(errorJson(500, "ERROR_INTERNO"))
      await pendiente.promesa
    })
    expect(await screen.findByRole("alert")).toBeVisible()
    await esperarUnMomento()

    expect(document.activeElement, `tras el error, el foco quedó en ${describirFoco()}`).not.toBe(
      document.body,
    )
  })
})
