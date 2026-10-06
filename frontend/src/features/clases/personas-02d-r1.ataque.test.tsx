import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AlumnosView } from "./alumnos-view"
import { PersonasView } from "./personas-view"

// Tester, CLASES-02d, ronda 1. "Personas" del alumno (§D-2D2): uno o dos maestros, el correo de
// cada persona como texto plano, correos largos u hostiles, ningún dato de pago ni de restricción en
// el DOM aunque la API los mandara, y «Ver más alumnos» con dos clics en el mismo instante en
// "Personas" y en el roster (`fetchNextPage({ cancelRefetch: false })`). Por rol, nombre y texto.

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const idDe = (n: number) => `6a6b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const DE_MAS = {
  estadoPago: "deudor",
  accesoRestringido: true,
  motivoRestriccion: "Adeudo de colegiatura",
  correoEnmascarado: "zz***@ejemplo.mx",
}

interface Persona {
  id: string
  nombre: string
  email: string
}

const stubPersonas = (maestros: Persona[], alumnos: Persona[]) => {
  const fetchMock = vi.fn<typeof fetch>(() =>
    Promise.resolve(
      respuestaJson(200, {
        maestro: { ...maestros[0], ...DE_MAS },
        maestros: maestros.map((m) => ({ ...m, ...DE_MAS })),
        alumnos: alumnos.map((a) => ({ ...a, ...DE_MAS })),
        totalAlumnos: alumnos.length,
        siguienteCursor: null,
        ...DE_MAS,
      }),
    ),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const conRutas = (ruta: string, elemento: ReactNode, patron: string) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path={patron} element={elemento} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const renderPersonas = () =>
  conRutas(
    `/estudiante/clases/${CLASE_ID}/personas`,
    <PersonasView />,
    "/estudiante/clases/:claseId/personas",
  )

const esperar = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("ataque CLASES-02d r1: «Personas» con correos", () => {
  it("dos maestros: encabezado y lista «Maestros», cada uno con su correo en su fila", async () => {
    stubPersonas(
      [
        { id: idDe(1), nombre: "Luis Pérez", email: "luis@ejemplo.mx" },
        { id: idDe(2), nombre: "María Gómez", email: "maria@ejemplo.mx" },
      ],
      [{ id: idDe(3), nombre: "Sol Ruiz", email: "sol@ejemplo.mx" }],
    )
    renderPersonas()
    const lista = await screen.findByRole("list", { name: "Maestros" })
    expect(screen.getByRole("heading", { name: "Maestros" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Maestro" })).toBeNull()
    const filas = within(lista).getAllByRole("listitem")
    expect(filas).toHaveLength(2)
    expect(filas[0]).toHaveTextContent("Luis Pérez")
    expect(filas[0]).toHaveTextContent("luis@ejemplo.mx")
    expect(filas[1]).toHaveTextContent("María Gómez")
    expect(filas[1]).toHaveTextContent("maria@ejemplo.mx")
  })

  it("un maestro: «Maestro» en singular", async () => {
    stubPersonas([{ id: idDe(1), nombre: "Luis Pérez", email: "luis@ejemplo.mx" }], [])
    renderPersonas()
    expect(await screen.findByRole("list", { name: "Maestro" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Maestro" })).toBeInTheDocument()
    expect(screen.queryByRole("list", { name: "Maestros" })).toBeNull()
  })

  it("correos de 250 caracteres sin espacios y con HTML: texto plano completo, que rompe en cualquier punto, sin enlace mailto", async () => {
    const largo = `${"a".repeat(240)}@ejemplo.mx`
    const html = '"><img src=x onerror=alert(1)>@x.mx'
    stubPersonas(
      [{ id: idDe(1), nombre: "Luis Pérez", email: largo }],
      [{ id: idDe(3), nombre: "Sol Ruiz", email: html }],
    )
    const vista = renderPersonas()
    const correoLargo = await screen.findByText(largo)
    expect(correoLargo.className.split(/\s+/)).toContain("wrap-anywhere")
    expect(correoLargo.parentElement?.className.split(/\s+/)).toContain("min-w-0")
    expect(screen.getByText(html)).toBeInTheDocument()
    expect(vista.container.querySelectorAll("img, script, a")).toHaveLength(0)
    expect(screen.queryAllByRole("link")).toHaveLength(0)
  })

  it("ningún dato de pago ni de restricción llega al DOM (texto, atributos ni el correo enmascarado)", async () => {
    stubPersonas(
      [{ id: idDe(1), nombre: "Luis Pérez", email: "luis@ejemplo.mx" }],
      [
        { id: idDe(3), nombre: "Sol Ruiz", email: "sol@ejemplo.mx" },
        { id: idDe(4), nombre: "Beto Ruiz", email: "beto@ejemplo.mx" },
      ],
    )
    const vista = renderPersonas()
    await screen.findByText("beto@ejemplo.mx")
    const html = vista.container.innerHTML
    for (const prohibido of [
      "deudor",
      "Deudor",
      "al_corriente",
      "Al corriente",
      "estadoPago",
      "accesoRestringido",
      "Acceso restringido",
      "Adeudo",
      "zz***",
      "***",
    ]) {
      expect(html, prohibido).not.toContain(prohibido)
    }
  })
})

// Dos páginas: la primera con cursor y la segunda sin él. La segunda se retiene para que los dos
// clics caigan con la petición en vuelo.
const stubPaginado = (vista: "personas" | "alumnos") => {
  let soltar: () => void = () => undefined
  const retenida = new Promise<void>((r) => {
    soltar = r
  })
  const alumno = (n: number) => ({
    id: idDe(n),
    nombre: `Alumno ${String(n).padStart(3, "0")}`,
    email: `a${String(n)}@x.mx`,
    estadoPago: "al_corriente",
    accesoRestringido: false,
    origen: "manual",
    inscritoEn: "2026-09-29T15:30:00.000Z",
  })
  const fetchMock = vi.fn<typeof fetch>(async (entrada) => {
    const url = new URL(String(entrada), "http://x")
    if (url.pathname.endsWith("/candidatos")) {
      return respuestaJson(200, { candidatos: [], hayMas: false })
    }
    const conCursor = url.searchParams.get("cursor") !== null
    if (conCursor) await retenida
    const ns = conCursor
      ? Array.from({ length: 5 }, (_, i) => 51 + i)
      : Array.from({ length: 50 }, (_, i) => 1 + i)
    const filas = ns.map(alumno)
    const siguienteCursor = conCursor ? null : idDe(50)
    if (vista === "personas") {
      const maestro = { id: idDe(900), nombre: "Luis Pérez", email: "luis@x.mx" }
      return respuestaJson(200, {
        maestro,
        maestros: [maestro],
        alumnos: filas.map(({ id, nombre, email }) => ({ id, nombre, email })),
        totalAlumnos: 55,
        siguienteCursor,
      })
    }
    return respuestaJson(200, { alumnos: filas, total: 55, siguienteCursor })
  })
  vi.stubGlobal("fetch", fetchMock)
  const conCursor = () =>
    fetchMock.mock.calls.filter(([e]) => new URL(String(e), "http://x").searchParams.has("cursor"))
  return { conCursor, soltar }
}

describe("ataque CLASES-02d r1: «Ver más alumnos» con dos clics en el mismo instante", () => {
  it.each([
    ["personas", `/estudiante/clases/${CLASE_ID}/personas`, "/estudiante/clases/:claseId/personas"],
    ["alumnos", `/maestro/clases/${CLASE_ID}/alumnos`, "/maestro/clases/:claseId/alumnos"],
  ] as const)(
    "%s: una sola petición de la página siguiente y las 55 filas al terminar",
    async (vista, ruta, patron) => {
      const { conCursor, soltar } = stubPaginado(vista)
      conRutas(ruta, vista === "personas" ? <PersonasView /> : <AlumnosView />, patron)
      const boton = await screen.findByRole("button", { name: "Ver más alumnos" })
      // Los dos clics dentro de un mismo act: el segundo llega antes de que React vuelva a pintar el
      // botón en espera, así que solo la consulta (cancelRefetch: false) puede evitar el duplicado.
      act(() => {
        boton.click()
        boton.click()
      })
      await esperar(30)
      expect(conCursor(), "dos peticiones de la página siguiente").toHaveLength(1)
      soltar()
      await waitFor(() => expect(screen.getAllByText("Alumno 055").length).toBeGreaterThan(0))
      await esperar(30)
      expect(conCursor()).toHaveLength(1)
      // En el roster, las filas de la tabla menos la del encabezado.
      const filas =
        vista === "personas"
          ? within(screen.getByRole("list", { name: "Alumnos" })).getAllByRole("listitem").length
          : screen.getAllByRole("row").length - 1
      expect(filas).toBe(55)
    },
  )
})
