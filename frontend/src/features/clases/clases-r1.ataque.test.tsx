import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { ClaseLayout } from "./clase-layout"
import { FormularioClase } from "./components/formulario-clase"
import { TarjetaClase } from "./components/tarjeta-clase"
import { InicioEstudianteView } from "./inicio-estudiante-view"
import { InicioMaestroView } from "./inicio-maestro-view"
import { varianteDeClase } from "./lib"

// Tester, CLASES-a, ronda 1. Ataques a la interfaz de CLASES-a: estados de error del código,
// avisos de fallo, tarjetas de color, nombres largos y doble activación de las acciones.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

interface Diferida {
  promesa: Promise<Response>
  resolver: (respuesta: Response) => void
}

const diferida = (): Diferida => {
  let resolver: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver }
}

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"

// CLASES-02a ronda 0 (C-7): claseDetalleSchema suma maestros (1 o 2) y conserva maestro.
const claseDetalle = (extra: Record<string, unknown> = {}) => ({
  id: CLASE_ID,
  nombre: "Álgebra I",
  descripcion: "Curso de álgebra",
  maestro: { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" },
  maestros: [{ id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }],
  ...extra,
})

const ME_ESTUDIANTE = {
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  email: "ana@ejemplo.mx",
  rol: "estudiante",
  debeCambiarContrasena: false,
  accesoRestringido: false,
}

type Manejador = (ruta: string, metodo: string) => Response | Promise<Response>

const stubFetch = (manejador: Manejador) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) =>
    Promise.resolve(manejador(String(entrada), init?.method ?? "GET")),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const llamadas = (fetchMock: ReturnType<typeof stubFetch>, ruta: string, metodo: string) =>
  fetchMock.mock.calls.filter(
    ([entrada, init]) => String(entrada) === ruta && (init?.method ?? "GET") === metodo,
  ).length

const nuevoCliente = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

const renderLayout = (ruta: string) =>
  render(
    <QueryClientProvider client={nuevoCliente()}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/estudiante/clases/:claseId" element={<ClaseLayout />}>
            <Route index element={<p>muro</p>} />
          </Route>
          <Route path="/maestro/clases/:claseId" element={<ClaseLayout />}>
            <Route index element={<p>muro</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const esperarUnMomento = () => act(() => new Promise((r) => setTimeout(r, 30)))

// Clic con el foco puesto, como en un navegador.
const pulsar = (control: HTMLElement) => {
  act(() => control.focus())
  fireEvent.click(control)
}

// Clics repetidos más el envío del formulario por las vías que no pasan por el clic.
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

beforeEach(() => {
  establecerToken("token-de-prueba")
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn(() => Promise.resolve()) },
    configurable: true,
  })
})

afterEach(() => {
  limpiarToken()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(window.navigator, "clipboard")
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("ataque CLASES-a r1: el código de la clase del dueño cuando falla su consulta", () => {
  it("si GET /codigo falla, la página del dueño muestra un error (no un '…' indefinido)", async () => {
    const fetchMock = stubFetch((ruta) => {
      if (ruta === `/api/clases/${CLASE_ID}/codigo`) return errorJson(500, "ERROR_INTERNO")
      if (ruta === `/api/clases/${CLASE_ID}`) return respuestaJson(200, { clase: claseDetalle() })
      return errorJson(500, "ERROR_INTERNO")
    })
    renderLayout(`/maestro/clases/${CLASE_ID}`)

    await screen.findByRole("heading", { level: 1, name: "Álgebra I" })
    await waitFor(() =>
      expect(llamadas(fetchMock, `/api/clases/${CLASE_ID}/codigo`, "GET")).toBeGreaterThan(0),
    )
    await esperarUnMomento()

    expect(
      screen.queryAllByRole("alert"),
      "la consulta del código falló y la vista no muestra ningún error",
    ).not.toHaveLength(0)
  })

  it("con la consulta del código en error, 'Copiar código' da un aviso en lugar de no hacer nada", async () => {
    stubFetch((ruta) => {
      if (ruta === `/api/clases/${CLASE_ID}/codigo`) return errorJson(500, "ERROR_INTERNO")
      if (ruta === `/api/clases/${CLASE_ID}`) return respuestaJson(200, { clase: claseDetalle() })
      return errorJson(500, "ERROR_INTERNO")
    })
    renderLayout(`/maestro/clases/${CLASE_ID}`)
    await screen.findByRole("heading", { level: 1, name: "Álgebra I" })
    await esperarUnMomento()

    fireEvent.click(screen.getByRole("button", { name: "Copiar código" }))
    await esperarUnMomento()

    expect(
      aviso.error.mock.calls.length + aviso.success.mock.calls.length,
      "'Copiar código' no dio ningún aviso",
    ).toBeGreaterThan(0)
  })
})

describe("ataque CLASES-a r1: regenerar el código cuando falla", () => {
  it("un POST /codigo que falla da un aviso de error", async () => {
    stubFetch((ruta, metodo) => {
      if (ruta === `/api/clases/${CLASE_ID}/codigo` && metodo === "POST") {
        return errorJson(500, "ERROR_INTERNO")
      }
      if (ruta === `/api/clases/${CLASE_ID}/codigo`)
        return respuestaJson(200, { codigo: "ABCDEFG" })
      if (ruta === `/api/clases/${CLASE_ID}`) return respuestaJson(200, { clase: claseDetalle() })
      return errorJson(500, "ERROR_INTERNO")
    })
    renderLayout(`/maestro/clases/${CLASE_ID}`)
    await screen.findByText("ABCDEFG")

    fireEvent.click(screen.getByRole("button", { name: "Regenerar código" }))
    fireEvent.click(await screen.findByRole("button", { name: "Sí, regenerar" }))
    await screen.findByRole("button", { name: "Regenerar código" })
    await esperarUnMomento()

    expect(screen.getByText("ABCDEFG")).toBeInTheDocument()
    expect(aviso.error, "regenerar falló sin ningún aviso").toHaveBeenCalled()
  })
})

describe("ataque CLASES-a r1: doble activación", () => {
  it("'Sí, regenerar' en espera no manda un segundo POST /codigo", async () => {
    const pendiente = diferida()
    const fetchMock = stubFetch((ruta, metodo) => {
      if (ruta === `/api/clases/${CLASE_ID}/codigo` && metodo === "POST") return pendiente.promesa
      if (ruta === `/api/clases/${CLASE_ID}/codigo`)
        return respuestaJson(200, { codigo: "ABCDEFG" })
      if (ruta === `/api/clases/${CLASE_ID}`) return respuestaJson(200, { clase: claseDetalle() })
      return errorJson(500, "ERROR_INTERNO")
    })
    renderLayout(`/maestro/clases/${CLASE_ID}`)
    await screen.findByText("ABCDEFG")
    fireEvent.click(screen.getByRole("button", { name: "Regenerar código" }))
    const si = await screen.findByRole("button", { name: "Sí, regenerar" })

    pulsar(si)
    await waitFor(() => expect(si).toHaveAttribute("aria-disabled", "true"))
    activarDeTodasLasFormas(si)
    await esperarUnMomento()

    expect(llamadas(fetchMock, `/api/clases/${CLASE_ID}/codigo`, "POST")).toBe(1)
    await act(async () => {
      pendiente.resolver(respuestaJson(200, { codigo: "HJKLMNP" }))
      await pendiente.promesa
    })
    expect(await screen.findByText("HJKLMNP")).toBeInTheDocument()
  })

  it("'Unirme a la clase' en espera no manda un segundo POST /clases/unirse", async () => {
    const pendiente = diferida()
    const fetchMock = stubFetch((ruta, metodo) => {
      if (ruta === "/api/me") return respuestaJson(200, ME_ESTUDIANTE)
      if (ruta.startsWith("/api/clases/inscritas")) {
        return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
      }
      if (ruta === "/api/clases/unirse" && metodo === "POST") return pendiente.promesa
      return errorJson(500, "ERROR_INTERNO")
    })
    render(
      <QueryClientProvider client={nuevoCliente()}>
        <MemoryRouter>
          <InicioEstudianteView />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    fireEvent.change(await screen.findByLabelText("Código de la clase"), {
      target: { value: "abcd-efg" },
    })
    const boton = screen.getByRole("button", { name: "Unirme a la clase" })

    pulsar(boton)
    await waitFor(() => expect(boton).toHaveAttribute("aria-disabled", "true"))
    activarDeTodasLasFormas(boton)
    await esperarUnMomento()

    expect(llamadas(fetchMock, "/api/clases/unirse", "POST")).toBe(1)
  })

  it("'Crear clase' en espera no manda un segundo POST /clases", async () => {
    const pendiente = diferida()
    const fetchMock = stubFetch((ruta, metodo) => {
      if (ruta === "/api/clases" && metodo === "POST") return pendiente.promesa
      return errorJson(500, "ERROR_INTERNO")
    })
    render(
      <QueryClientProvider client={nuevoCliente()}>
        <MemoryRouter>
          <FormularioClase modo="crear" />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    fireEvent.change(screen.getByLabelText("Nombre de la clase"), {
      target: { value: "Historia" },
    })
    const boton = screen.getByRole("button", { name: "Crear clase" })

    pulsar(boton)
    await waitFor(() => expect(boton).toHaveAttribute("aria-disabled", "true"))
    activarDeTodasLasFormas(boton)
    await esperarUnMomento()

    expect(llamadas(fetchMock, "/api/clases", "POST")).toBe(1)
  })

  it("'Ver más clases' en espera no pide la misma página dos veces", async () => {
    const pendiente = diferida()
    const cursor = "9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
    const fetchMock = stubFetch((ruta) => {
      if (ruta === "/api/me") return respuestaJson(200, { ...ME_ESTUDIANTE, rol: "maestro" })
      if (ruta.startsWith("/api/clases/impartidas") && ruta.includes("cursor=")) {
        return pendiente.promesa
      }
      if (ruta.startsWith("/api/clases/impartidas")) {
        return respuestaJson(200, {
          clases: [{ id: cursor, nombre: "Primera", alumnos: 3 }],
          total: 2,
          siguienteCursor: cursor,
        })
      }
      return errorJson(500, "ERROR_INTERNO")
    })
    render(
      <QueryClientProvider client={nuevoCliente()}>
        <MemoryRouter>
          <InicioMaestroView />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    const boton = await screen.findByRole("button", { name: "Ver más clases" })

    pulsar(boton)
    await waitFor(() => expect(boton).toHaveAttribute("aria-disabled", "true"))
    activarDeTodasLasFormas(boton)
    await esperarUnMomento()

    const conCursor = fetchMock.mock.calls.filter(([entrada]) =>
      String(entrada).includes(`cursor=${cursor}`),
    ).length
    expect(conCursor).toBe(1)
  })
})

describe("ataque CLASES-a r1: tarjeta de clase (DESIGN.md §7.6)", () => {
  const idDeVariante = (buscada: "verde" | "azul" | "blanca"): string => {
    for (let i = 0; i < 1000; i++) {
      const id = `2a2b3c4d-1c1f-4b8e-9a1e-${String(i).padStart(12, "0")}`
      if (varianteDeClase(id) === buscada) return id
    }
    throw new Error(`Precondición: no se encontró un id con variante ${buscada}`)
  }

  const renderTarjeta = (claseId: string, nombre: string) =>
    render(
      <MemoryRouter>
        <TarjetaClase
          claseId={claseId}
          nombre={nombre}
          metadatos="Luis Pérez"
          destino={`/estudiante/clases/${claseId}`}
        />
      </MemoryRouter>,
    )

  it("la variante verde lleva el fondo --brand (verde pino), no el azul", () => {
    renderTarjeta(idDeVariante("verde"), "Biología")
    const tarjeta = screen.getByRole("link", { name: "Biología" })

    expect(tarjeta.className, "la tarjeta 'verde' no usa bg-brand").toMatch(/(^|\s)bg-brand(\s|$)/)
  })

  it("las variantes verde y azul no comparten color de fondo", () => {
    renderTarjeta(idDeVariante("verde"), "Verde")
    renderTarjeta(idDeVariante("azul"), "Azul")
    const fondo = (nombre: string) =>
      screen
        .getByRole("link", { name: nombre })
        .className.split(/\s+/)
        .filter((c) => /^bg-/.test(c))
    const colores: Record<string, string> = {
      "bg-accent": "#22409a",
      "bg-primary": "#22409a",
      "bg-brand": "#1d5b4b",
    }
    const colorDe = (nombre: string) => fondo(nombre).map((c) => colores[c] ?? c)

    expect(colorDe("Verde")).not.toEqual(colorDe("Azul"))
  })

  it("un nombre de 120 caracteres sin espacios se corta (a 360 px no desborda) y el título se limita a dos líneas", () => {
    const largo = "A".repeat(120)
    renderTarjeta(idDeVariante("blanca"), largo)
    const titulo = screen.getByText(largo)

    expect(
      titulo.className,
      "el título de la tarjeta no tiene ninguna regla de corte de palabras",
    ).toMatch(/(^|\s)(break-all|break-words|wrap-anywhere|wrap-break-word)(\s|$)/)
    expect(titulo.className, "el título no se limita a dos líneas (§7.6)").toMatch(
      /(^|\s)line-clamp-2(\s|$)/,
    )
  })

  it("el h1 de la clase con un nombre de 120 caracteres sin espacios se corta", async () => {
    const largo = "B".repeat(120)
    stubFetch((ruta) => {
      if (ruta === `/api/clases/${CLASE_ID}`) {
        return respuestaJson(200, { clase: claseDetalle({ nombre: largo }) })
      }
      return errorJson(500, "ERROR_INTERNO")
    })
    renderLayout(`/estudiante/clases/${CLASE_ID}`)
    const h1 = await screen.findByRole("heading", { level: 1, name: largo })

    expect(h1.className, "el h1 de la clase no tiene ninguna regla de corte de palabras").toMatch(
      /(^|\s)(break-all|break-words|wrap-anywhere|wrap-break-word)(\s|$)/,
    )
  })
})

describe("ataque CLASES-a r1: mensajes de error de la página de clase", () => {
  it("una URL con un claseId que no es UUID no muestra el nombre técnico del parámetro", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/clases/no-es-uuid") {
        return errorJson(400, "VALIDACION", "claseId: debe ser un identificador válido")
      }
      return errorJson(500, "ERROR_INTERNO")
    })
    renderLayout("/estudiante/clases/no-es-uuid")
    const alerta = await screen.findByRole("alert")

    expect(alerta.textContent ?? "").not.toMatch(/claseId/)
  })
})
