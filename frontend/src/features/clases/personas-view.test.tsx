import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { useState } from "react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { useFocoAlCargarMas } from "./hooks"
import { PersonasView } from "./personas-view"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string) =>
  respuestaJson(estado, { error: { codigo, mensaje: "mensaje del servidor" } })

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
// CLASES-02b (C-11): el esquema ahora exige `email` en cada persona y `maestros`; solo se agregan.
const MAESTRO = {
  id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
  nombre: "Luis Pérez",
  email: "luis@x.mx",
}

const persona = (n: number, nombre = `Alumno ${String(n)}`) => ({
  id: `4a4b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d${String(10 + n)}`,
  nombre,
  email: `alumno${String(n)}@x.mx`,
})

const pagina = (
  alumnos: { id: string; nombre: string; [campo: string]: unknown }[],
  extra: { totalAlumnos?: number; siguienteCursor?: string | null } = {},
) => ({
  maestro: MAESTRO,
  maestros: [MAESTRO],
  alumnos,
  totalAlumnos: extra.totalAlumnos ?? alumnos.length,
  siguienteCursor: extra.siguienteCursor ?? null,
})

const stubApi = (personas: (ruta: string) => Response | Promise<Response>) => {
  const fetchMock = vi.fn<typeof fetch>((entrada) => {
    const ruta = String(entrada)
    if (ruta.startsWith(`/api/clases/${CLASE_ID}/personas`)) return Promise.resolve(personas(ruta))
    return Promise.resolve(errorJson(500, "ERROR_INTERNO"))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const renderVista = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/estudiante/clases/${CLASE_ID}/personas`]}>
        <Routes>
          <Route path="/estudiante/clases/:claseId/personas" element={<PersonasView />} />
        </Routes>
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
})

describe("PersonasView", () => {
  it("PR-B12a: el maestro va separado de los alumnos", async () => {
    stubApi(() => respuestaJson(200, pagina([persona(1, "Ana Díaz"), persona(2, "Beto Mora")])))
    renderVista()

    const listaMaestro = await screen.findByRole("list", { name: "Maestro" })
    const listaAlumnos = screen.getByRole("list", { name: "Alumnos" })
    expect(within(listaMaestro).getByText("Luis Pérez")).toBeInTheDocument()
    expect(within(listaMaestro).queryByText("Ana Díaz")).not.toBeInTheDocument()
    expect(within(listaAlumnos).getByText("Ana Díaz")).toBeInTheDocument()
    expect(within(listaAlumnos).getByText("Beto Mora")).toBeInTheDocument()
    expect(within(listaAlumnos).queryByText("Luis Pérez")).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Maestro" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Alumnos" })).toBeInTheDocument()
  })

  it("PR-B12b: el contador va en palabras", async () => {
    stubApi(() =>
      respuestaJson(
        200,
        pagina([persona(1), persona(2)], { totalAlumnos: 24, siguienteCursor: null }),
      ),
    )
    renderVista()

    expect(await screen.findByText("24 alumnos")).toBeInTheDocument()
    cleanup()

    stubApi(() => respuestaJson(200, pagina([persona(1)])))
    renderVista()

    expect(await screen.findByText("1 alumno")).toBeInTheDocument()
  })

  it("PR-B12c: no hay correos ni insignias de pago", async () => {
    // Aunque la API mandara de más, la vista solo muestra nombres: el esquema de shared/ descarta
    // cualquier campo que no sea de un compañero.
    const fetchMock = stubApi(() =>
      respuestaJson(
        200,
        pagina([
          { ...persona(1, "Ana Díaz"), email: "ana@ejemplo.mx", estadoPago: "deudor" },
          { ...persona(2, "Beto Mora"), email: "beto@ejemplo.mx", accesoRestringido: true },
        ]),
      ),
    )
    renderVista()

    await screen.findByText("Ana Díaz")
    expect(document.body.textContent).not.toContain("@")
    expect(screen.queryByText("Deudor")).not.toBeInTheDocument()
    expect(screen.queryByText("Al corriente")).not.toBeInTheDocument()
    expect(screen.queryByText("Acceso restringido")).not.toBeInTheDocument()
    // Solo pide los compañeros, nunca el roster del maestro.
    const rutas = fetchMock.mock.calls.map(([entrada]) => String(entrada))
    expect(rutas.every((ruta) => ruta.startsWith(`/api/clases/${CLASE_ID}/personas`))).toBe(true)
  })

  it("PR-B12d: los estados siguen su orden: error → cargando → vacío → datos", async () => {
    stubApi(() => errorJson(403, "SIN_ACCESO_A_LA_CLASE"))
    renderVista()
    expect(await screen.findByRole("alert")).toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(screen.queryByText("Aún no hay alumnos en esta clase")).not.toBeInTheDocument()
    cleanup()

    stubApi(() => new Promise<Response>(() => undefined))
    renderVista()
    expect(await screen.findByRole("status")).toHaveTextContent("Cargando")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Alumnos" })).not.toBeInTheDocument()
    cleanup()

    stubApi(() => respuestaJson(200, pagina([])))
    renderVista()
    expect(await screen.findByText("Aún no hay alumnos en esta clase")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.queryByRole("list", { name: "Alumnos" })).not.toBeInTheDocument()
    cleanup()

    stubApi(() => respuestaJson(200, pagina([persona(1, "Ana Díaz")])))
    renderVista()
    expect(await screen.findByText("Ana Díaz")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.queryByText("Aún no hay alumnos en esta clase")).not.toBeInTheDocument()
  })

  it("'Ver más alumnos' aparece solo con cursor y pide la página siguiente con ese cursor", async () => {
    const primera = persona(1, "Ana Díaz")
    const segunda = persona(2, "Beto Mora")
    const fetchMock = stubApi((ruta) => {
      if (ruta.includes(`cursor=${primera.id}`)) {
        return respuestaJson(200, pagina([segunda], { totalAlumnos: 2 }))
      }
      return respuestaJson(200, pagina([primera], { totalAlumnos: 2, siguienteCursor: primera.id }))
    })
    renderVista()

    fireEvent.click(await screen.findByRole("button", { name: "Ver más alumnos" }))

    expect(await screen.findByText("Beto Mora")).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Ver más alumnos" })).not.toBeInTheDocument(),
    )
    const rutas = fetchMock.mock.calls.map(([entrada]) => String(entrada))
    expect(rutas).toContain(`/api/clases/${CLASE_ID}/personas?limite=50`)
    expect(rutas).toContain(`/api/clases/${CLASE_ID}/personas?limite=50&cursor=${primera.id}`)
  })

  it("T-26 (ronda 4): al cargar la última página, «Ver más alumnos» desaparece y el foco va a la primera persona nueva o, si no llegó nadie, al encabezado «Alumnos»", async () => {
    const primera = persona(1, "Ana Díaz")
    const conSegunda = (alumnos: { id: string; nombre: string }[]) =>
      stubApi((ruta) => {
        if (ruta.includes(`cursor=${primera.id}`)) {
          return respuestaJson(200, pagina(alumnos, { totalAlumnos: 2 }))
        }
        return respuestaJson(
          200,
          pagina([primera], { totalAlumnos: 2, siguienteCursor: primera.id }),
        )
      })
    const cargarMas = async () => {
      const boton = await screen.findByRole("button", { name: "Ver más alumnos" })
      boton.focus()
      fireEvent.click(boton)
      await waitFor(() =>
        expect(screen.queryByRole("button", { name: "Ver más alumnos" })).toBeNull(),
      )
    }

    conSegunda([persona(2, "Beto Mora")])
    renderVista()
    await cargarMas()
    await waitFor(() => expect(document.activeElement?.textContent).toContain("Beto Mora"))
    expect(document.activeElement).not.toBe(document.body)
    cleanup()

    conSegunda([])
    renderVista()
    await cargarMas()
    await waitFor(() => expect(screen.getByRole("heading", { name: "Alumnos" })).toHaveFocus())
  })

  it("T-27 (ronda 5): si la consulta de la página siguiente falla, el foco queda en el encabezado «Alumnos» y no en <body>", async () => {
    const primera = persona(1, "Ana Díaz")
    stubApi((ruta) => {
      if (ruta.includes(`cursor=${primera.id}`)) return errorJson(500, "ERROR_INTERNO")
      return respuestaJson(200, pagina([primera], { totalAlumnos: 2, siguienteCursor: primera.id }))
    })
    renderVista()
    const boton = await screen.findByRole("button", { name: "Ver más alumnos" })
    boton.focus()
    fireEvent.click(boton)

    expect(await screen.findByRole("alert")).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole("heading", { name: "Alumnos" })).toHaveFocus())
    expect(document.activeElement).not.toBe(document.body)
  })

  it("T-28 (ronda 5): con ratón en «Ver más alumnos» y después un clic fuera, un render sin desmontaje no mueve el foco", async () => {
    const primera = persona(1, "Ana Díaz")
    const segunda = persona(2, "Beto Mora")
    let alumnos = [primera, segunda]
    stubApi(() =>
      respuestaJson(200, pagina(alumnos, { totalAlumnos: 3, siguienteCursor: segunda.id })),
    )
    const { queryClient } = renderVista()
    const boton = await screen.findByRole("button", { name: "Ver más alumnos" })
    boton.focus()
    boton.blur()
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 20))
    })
    expect(document.activeElement).toBe(document.body)

    alumnos = [primera]
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ["clases", CLASE_ID, "personas"] })
    })
    await waitFor(() => expect(screen.queryByText("Beto Mora")).toBeNull())

    expect(screen.getByRole("button", { name: "Ver más alumnos" })).toBeInTheDocument()
    expect(document.activeElement).toBe(document.body)
  })

  it("T-27 (ronda 5): si el destino del foco no está conectado, el foco va al primer elemento enfocable de la sección y, si no hay ninguno, no se mueve", async () => {
    let ocultarBoton: () => void = () => undefined
    function Arnes({ conOtroControl }: { conOtroControl: boolean }) {
      const [conBoton, setConBoton] = useState(true)
      ocultarBoton = () => setConBoton(false)
      // Los dos destinos preferidos están desconectados: la defensa es la que decide.
      const ref = useFocoAlCargarMas(
        undefined,
        () => false,
        () => document.createElement("h2").focus(),
      )
      return (
        <section>
          {conBoton && (
            <button ref={ref} type="button">
              más
            </button>
          )}
          {conOtroControl && <button type="button">otro</button>}
        </section>
      )
    }

    const { unmount } = render(<Arnes conOtroControl />)
    screen.getByRole("button", { name: "más" }).focus()
    act(() => ocultarBoton())
    await waitFor(() => expect(screen.getByRole("button", { name: "otro" })).toHaveFocus())
    unmount()

    render(<Arnes conOtroControl={false} />)
    screen.getByRole("button", { name: "más" }).focus()
    act(() => ocultarBoton())
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 20))
    })
    expect(document.activeElement).toBe(document.body)
  })
})
