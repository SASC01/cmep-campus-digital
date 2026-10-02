import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { InicioEstudianteView } from "./inicio-estudiante-view"

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string) =>
  respuestaJson(estado, { error: { codigo, mensaje: "mensaje del servidor" } })

const ME = {
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  email: "ana@ejemplo.mx",
  rol: "estudiante",
  debeCambiarContrasena: false,
  accesoRestringido: false,
}

const clase = (n: number, extra: Record<string, unknown> = {}) => ({
  id: `2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d0${String(n)}`,
  nombre: `Clase ${String(n)}`,
  maestro: { nombre: "Luis Pérez" },
  ...extra,
})

interface Api {
  me?: () => Response
  inscritas?: () => Response | Promise<Response>
  unirse?: () => Response | Promise<Response>
}

const stubApi = (api: Api) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
    const ruta = String(entrada)
    const metodo = init?.method ?? "GET"
    if (ruta === "/api/me") return Promise.resolve(api.me?.() ?? respuestaJson(200, ME))
    if (ruta.startsWith("/api/clases/inscritas")) {
      return Promise.resolve(
        api.inscritas?.() ?? respuestaJson(200, { clases: [], total: 0, siguienteCursor: null }),
      )
    }
    if (ruta === "/api/clases/unirse" && metodo === "POST") {
      return Promise.resolve(
        api.unirse?.() ??
          respuestaJson(200, { clase: { id: clase(1).id, nombre: "Clase 1" }, yaEstabas: false }),
      )
    }
    return Promise.resolve(errorJson(500, "ERROR_INTERNO"))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const renderVista = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <InicioEstudianteView />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { queryClient }
}

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("InicioEstudianteView", () => {
  it("PR-A18a: 'Hola, <nombre>' se ve también cuando falla /api/clases/inscritas", async () => {
    stubApi({ inscritas: () => errorJson(500, "ERROR_INTERNO") })
    renderVista()

    expect(await screen.findByText("Hola, Ana López")).toBeInTheDocument()
  })

  it("PR-A18b: el h1 lleva el dato", async () => {
    stubApi({
      inscritas: () => respuestaJson(200, { clases: [], total: 0, siguienteCursor: null }),
    })
    renderVista()

    expect(
      await screen.findByRole("heading", { level: 1, name: "Aún no estás en ninguna clase" }),
    ).toBeInTheDocument()
  })

  it("PR-A18c: exactamente un botón primary ('Unirme a la clase')", async () => {
    stubApi({})
    renderVista()
    await screen.findByRole("heading", { level: 1 })

    const primarios = screen
      .getAllByRole("button")
      .filter((boton) => boton.getAttribute("data-variant") === "primary")
    expect(primarios.map((boton) => boton.textContent)).toEqual(["Unirme a la clase"])
  })

  it("PR-A18d: unirse con éxito navega a la clase y muestra el toast", async () => {
    stubApi({
      unirse: () =>
        respuestaJson(200, { clase: { id: clase(1).id, nombre: "Clase 1" }, yaEstabas: false }),
    })
    renderVista()
    await screen.findByRole("heading", { level: 1 })

    fireEvent.change(screen.getByLabelText("Código de la clase"), {
      target: { value: "ABCDEFG" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Unirme a la clase" }))

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Te uniste a Clase 1"))
  })

  it("PR-A18e: CODIGO_INVALIDO muestra ErrorDeCampo asociado al campo", async () => {
    stubApi({ unirse: () => errorJson(404, "CODIGO_INVALIDO") })
    renderVista()
    await screen.findByRole("heading", { level: 1 })

    fireEvent.change(screen.getByLabelText("Código de la clase"), {
      target: { value: "ABCDEFG" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Unirme a la clase" }))

    const error = await screen.findByText(
      "No encontramos una clase con ese código. Revisa que esté bien escrito.",
    )
    expect(screen.getByLabelText("Código de la clase")).toHaveAttribute(
      "aria-describedby",
      error.id,
    )
  })

  it("PR-A18f: el campo del código lleva autoComplete='off'", async () => {
    stubApi({})
    renderVista()
    await screen.findByRole("heading", { level: 1 })

    expect(screen.getByLabelText("Código de la clase")).toHaveAttribute("autocomplete", "off")
  })

  it("PR-A18g: la acción del vacío lleva el foco al campo del código", async () => {
    stubApi({
      inscritas: () => respuestaJson(200, { clases: [], total: 0, siguienteCursor: null }),
    })
    renderVista()

    fireEvent.click(await screen.findByRole("button", { name: "Únete con tu código de clase" }))

    expect(document.activeElement).toBe(screen.getByLabelText("Código de la clase"))
  })

  it("PR-A18h: los estados del panel siguen el orden error → cargando → vacío → datos", async () => {
    stubApi({ inscritas: () => errorJson(500, "ERROR_INTERNO") })
    renderVista()
    expect(await screen.findByRole("alert")).toBeInTheDocument()
    expect(screen.queryByText("Aún no tienes clases")).not.toBeInTheDocument()
  })

  it("PR-A18i: 'Ver más clases' aparece solo si hay cursor", async () => {
    stubApi({
      inscritas: () => respuestaJson(200, { clases: [clase(1)], total: 1, siguienteCursor: null }),
    })
    renderVista()

    await screen.findByText("Clase 1")
    expect(screen.queryByRole("button", { name: "Ver más clases" })).not.toBeInTheDocument()
  })

  it("PR-A18j: cada tarjeta es un enlace con nombre accesible igual al nombre de la clase y destino /estudiante/clases/{id}", async () => {
    stubApi({
      inscritas: () => respuestaJson(200, { clases: [clase(1)], total: 1, siguienteCursor: null }),
    })
    renderVista()

    const enlace = await screen.findByRole("link", { name: "Clase 1" })
    expect(enlace).toHaveAttribute("href", `/estudiante/clases/${clase(1).id}`)
  })

  it("PR-B17: 'Unirme a la clase' (N-04): CODIGO_INVALIDO y un VALIDACION de codigo van bajo el campo; un 500 y 'sin conexión' avisan con toast, sin aria-invalid en el campo del código", async () => {
    const escenarios: {
      nombre: string
      respuesta: () => Response | Promise<Response>
      enElCampo: string | null
    }[] = [
      {
        nombre: "CODIGO_INVALIDO",
        respuesta: () => errorJson(404, "CODIGO_INVALIDO"),
        enElCampo: "No encontramos una clase con ese código. Revisa que esté bien escrito.",
      },
      {
        nombre: "VALIDACION de codigo",
        respuesta: () =>
          respuestaJson(400, {
            error: { codigo: "VALIDACION", mensaje: "codigo: Escribe los 7 caracteres del código" },
          }),
        enElCampo: "Escribe los 7 caracteres del código",
      },
      { nombre: "500", respuesta: () => errorJson(500, "ERROR_INTERNO"), enElCampo: null },
      {
        nombre: "sin conexión",
        respuesta: () => Promise.reject(new TypeError("Failed to fetch")),
        enElCampo: null,
      },
    ]

    for (const escenario of escenarios) {
      stubApi({ unirse: escenario.respuesta })
      renderVista()
      await screen.findByRole("heading", { level: 1 })
      const campo = screen.getByLabelText("Código de la clase")
      fireEvent.change(campo, { target: { value: "ABCDEFG" } })
      fireEvent.click(screen.getByRole("button", { name: "Unirme a la clase" }))

      if (escenario.enElCampo !== null) {
        expect(await screen.findByText(escenario.enElCampo), escenario.nombre).toBeInTheDocument()
        expect(campo, escenario.nombre).toHaveAttribute("aria-invalid", "true")
        expect(aviso.error, escenario.nombre).not.toHaveBeenCalled()
      } else {
        await waitFor(() => expect(aviso.error, escenario.nombre).toHaveBeenCalledTimes(1))
        expect(campo, escenario.nombre).toHaveAttribute("aria-invalid", "false")
        expect(screen.queryByText("mensaje del servidor"), escenario.nombre).not.toBeInTheDocument()
      }

      cleanup()
      aviso.error.mockClear()
      vi.unstubAllGlobals()
    }
  })
})

describe("InicioEstudianteView: foco de «Ver más clases» (§D-C5)", () => {
  it("PR-C11a: con teclado, «Ver más clases» desaparece al cargar la última página y el foco va a la primera tarjeta nueva o al encabezado «Mis clases»; nunca a <body>", async () => {
    const conPaginas = (segunda: ReturnType<typeof clase>[]) =>
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>((entrada) => {
          const ruta = String(entrada)
          if (ruta === "/api/me") return Promise.resolve(respuestaJson(200, ME))
          if (ruta.includes(`cursor=${clase(1).id}`)) {
            return Promise.resolve(
              respuestaJson(200, {
                clases: segunda,
                total: 1 + segunda.length,
                siguienteCursor: null,
              }),
            )
          }
          if (ruta.startsWith("/api/clases/inscritas")) {
            return Promise.resolve(
              respuestaJson(200, { clases: [clase(1)], total: 2, siguienteCursor: clase(1).id }),
            )
          }
          return Promise.resolve(errorJson(500, "ERROR_INTERNO"))
        }),
      )
    const cargarMas = async () => {
      const boton = await screen.findByRole("button", { name: "Ver más clases" })
      boton.focus()
      fireEvent.click(boton)
      await waitFor(() =>
        expect(screen.queryByRole("button", { name: "Ver más clases" })).toBeNull(),
      )
    }

    conPaginas([clase(2)])
    renderVista()
    await cargarMas()
    await waitFor(() => expect(screen.getByRole("link", { name: "Clase 2" })).toHaveFocus())
    cleanup()

    conPaginas([])
    renderVista()
    await cargarMas()
    await waitFor(() => expect(screen.getByRole("heading", { name: "Mis clases" })).toHaveFocus())
    expect(document.activeElement).not.toBe(document.body)
  })
})
