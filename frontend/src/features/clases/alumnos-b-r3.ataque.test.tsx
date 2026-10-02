import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  act,
  cleanup,
  configure,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { AlumnosView } from "./alumnos-view"

// Ataque del Tester (CLASES-b, ronda 3): el foco de TablaAlumnos con cualquier causa de desmontaje
// (cancelar, sesión que expira, focusin fuera de las filas, renders sin desmontaje), el foco de los
// demás controles de b que desaparecen tras su propia acción ("Agregar a la clase" y "Ver más
// alumnos"), y el aviso de longitud del buscador (T-24, D-8). DESIGN.md §7.14 y §7.17, WCAG 2.4.3.
// Sin selectores de clase.

// Con la suite completa en paralelo, montar 52 filas tarda: más margen para las esperas.
configure({ asyncUtilTimeout: 5000 })

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), neutro: vi.fn() }))
vi.mock("sonner", () => ({
  toast: Object.assign(aviso.neutro, { success: aviso.success, error: aviso.error }),
}))

const navegacion = vi.hoisted(() => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/maestro") }))
vi.mock("@/services/navegacion", () => navegacion)

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const idDe = (n: number) => `8a8b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const nombreDe = (n: number) => `Alumno ${String(n).padStart(3, "0")}`
const ID_CANDIDATO = 900

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const noAutenticado = () =>
  respuestaJson(401, { error: { codigo: "NO_AUTENTICADO", mensaje: "Inicia sesión." } })

interface Control {
  inscritos: string[]
  rosterSinSesion: boolean
  deleteSinSesion: boolean
}

// Servidor en memoria con paginación por cursor, el buscador con un candidato (Nadia, id 900) y la
// opción de responder 401 con el refresco fallido.
const crearServidor = (total: number) => {
  const control: Control = {
    inscritos: Array.from({ length: total }, (_, i) => idDe(i + 1)),
    rosterSinSesion: false,
    deleteSinSesion: false,
  }
  const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
    const url = new URL(String(entrada), "http://x")
    const metodo = init?.method ?? "GET"
    const base = `/api/clases/${CLASE_ID}/alumnos`
    if (url.pathname === "/api/auth/refrescar") return Promise.resolve(noAutenticado())
    if (url.pathname === `${base}/candidatos`) {
      return Promise.resolve(
        respuestaJson(200, {
          candidatos: [
            {
              id: idDe(ID_CANDIDATO),
              nombre: "Nadia Ruiz",
              correoEnmascarado: "na***@x.mx",
              yaInscrito: control.inscritos.includes(idDe(ID_CANDIDATO)),
            },
          ],
          hayMas: false,
        }),
      )
    }
    if (url.pathname === base && metodo === "POST") {
      const yaEstaba = control.inscritos.includes(idDe(ID_CANDIDATO))
      if (!yaEstaba) control.inscritos = [...control.inscritos, idDe(ID_CANDIDATO)]
      return Promise.resolve(
        respuestaJson(200, { alumno: { id: idDe(ID_CANDIDATO), nombre: "Nadia Ruiz" }, yaEstaba }),
      )
    }
    if (url.pathname.startsWith(`${base}/`) && metodo === "DELETE") {
      if (control.deleteSinSesion) return Promise.resolve(noAutenticado())
      const id = url.pathname.slice(base.length + 1)
      control.inscritos = control.inscritos.filter((x) => x !== id)
      return Promise.resolve(new Response(null, { status: 204 }))
    }
    if (url.pathname === base && metodo === "GET") {
      if (control.rosterSinSesion) return Promise.resolve(noAutenticado())
      const limite = Number(url.searchParams.get("limite") ?? "50")
      const cursor = url.searchParams.get("cursor")
      const desde = cursor === null ? 0 : control.inscritos.indexOf(cursor) + 1
      const pagina = control.inscritos.slice(desde, desde + limite)
      const hayMas = control.inscritos.length > desde + limite
      return Promise.resolve(
        respuestaJson(200, {
          alumnos: pagina.map((id) => {
            const n = Number(id.slice(-12))
            return {
              id,
              nombre: n === ID_CANDIDATO ? "Nadia Ruiz" : nombreDe(n),
              email: `a${String(n)}@x.mx`,
              estadoPago: "al_corriente",
              accesoRestringido: false,
              origen: "manual",
              inscritoEn: "2026-09-29T15:30:00.000Z",
            }
          }),
          total: control.inscritos.length,
          siguienteCursor: hayMas ? (pagina.at(-1) ?? null) : null,
        }),
      )
    }
    return Promise.resolve(respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "x" } }))
  })
  vi.stubGlobal("fetch", fetchMock)
  return { control, fetchMock }
}

const renderAlumnos = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/maestro/clases/${CLASE_ID}/alumnos`]}>
        <Routes>
          <Route path="/maestro/clases/:claseId/alumnos" element={<AlumnosView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { queryClient }
}

const releerRoster = (queryClient: QueryClient) =>
  act(async () => {
    await queryClient.invalidateQueries({ queryKey: ["clases", CLASE_ID, "alumnos"] })
  })

const filaDe = async (n: number): Promise<HTMLElement> => {
  const celda = await screen.findByRole("cell", { name: nombreDe(n) })
  const fila = celda.closest("tr")
  if (fila === null) throw new Error(`La fila de ${nombreDe(n)} no existe`)
  return fila
}

const botonQuitar = async (n: number) =>
  within(await filaDe(n)).getByRole("button", { name: `Quitar ${nombreDe(n)}` })

const esperar = (ms: number) =>
  act(async () => {
    await new Promise((resolver) => setTimeout(resolver, ms))
  })

const focoEn = () => document.activeElement

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.success.mockClear()
  aviso.error.mockClear()
  aviso.neutro.mockClear()
  navegacion.irA.mockClear()
})

describe("ataque CLASES-b r3: el foco del roster no se mueve de más", { timeout: 30000 }, () => {
  it("cancelar la confirmación devuelve el foco a «Quitar» de esa fila y la tabla no lo mueve después", async () => {
    crearServidor(3)
    renderAlumnos()
    const fila = await filaDe(2)
    const quitar = await botonQuitar(2)
    quitar.focus()
    fireEvent.click(quitar)
    const cancelar = within(fila).getByRole("button", { name: `Cancelar ${nombreDe(2)}` })
    await waitFor(() => expect(cancelar).toHaveFocus())
    fireEvent.click(cancelar)
    await waitFor(() =>
      expect(focoEn()).toBe(within(fila).getByRole("button", { name: `Quitar ${nombreDe(2)}` })),
    )
    await esperar(50)
    expect(focoEn()).toBe(within(fila).getByRole("button", { name: `Quitar ${nombreDe(2)}` }))
  })

  it("renders sin desmontaje (los mismos datos, u otra fila que sale) no mueven el foco de «Quitar» de la fila que lo tiene", async () => {
    const { control } = crearServidor(4)
    const { queryClient } = renderAlumnos()
    const quitar3 = await botonQuitar(3)
    quitar3.focus()
    await releerRoster(queryClient)
    expect(focoEn()).toBe(quitar3)
    control.inscritos = control.inscritos.filter((id) => id !== idDe(1))
    await releerRoster(queryClient)
    await waitFor(() => expect(screen.queryByRole("cell", { name: nombreDe(1) })).toBeNull())
    expect(focoEn()).toBe(quitar3)
  })

  it("con el foco en el buscador después de haber estado en una fila, que esa fila salga de los datos no le roba el foco al buscador", async () => {
    const { control } = crearServidor(3)
    const { queryClient } = renderAlumnos()
    ;(await botonQuitar(2)).focus()
    const campo = screen.getByLabelText("Buscar alumno por nombre")
    campo.focus()
    control.inscritos = control.inscritos.filter((id) => id !== idDe(2))
    await releerRoster(queryClient)
    await waitFor(() => expect(screen.queryByRole("cell", { name: nombreDe(2) })).toBeNull())
    await esperar(20)
    expect(focoEn()).toBe(campo)
  })

  it("con el foco en «Ver más alumnos» después de haber estado en una fila, que esa fila salga no le roba el foco", async () => {
    const { control } = crearServidor(52)
    const { queryClient } = renderAlumnos()
    ;(await botonQuitar(2)).focus()
    const verMas = await screen.findByRole("button", { name: "Ver más alumnos" })
    verMas.focus()
    control.inscritos = control.inscritos.filter((id) => id !== idDe(2))
    await releerRoster(queryClient)
    await waitFor(() => expect(screen.queryByRole("cell", { name: nombreDe(2) })).toBeNull())
    await esperar(20)
    expect(focoEn()).toBe(verMas)
  })

  it("si la persona dejó la tabla (clic en blanco) y después la fila sale de los datos, el foco no regresa solo a la tabla", async () => {
    const { control } = crearServidor(3)
    const { queryClient } = renderAlumnos()
    const quitar2 = await botonQuitar(2)
    quitar2.focus()
    quitar2.blur()
    await esperar(20)
    control.inscritos = control.inscritos.filter((id) => id !== idDe(2))
    await releerRoster(queryClient)
    await waitFor(() => expect(screen.queryByRole("cell", { name: nombreDe(2) })).toBeNull())
    await esperar(20)
    expect(focoEn()).toBe(document.body)
  })
})

describe("ataque CLASES-b r3: sesión que expira a mitad de quitar", { timeout: 30000 }, () => {
  it("el DELETE responde 401 y el refresco falla: apiClient manda al login, avisa y el foco sigue en la fila", async () => {
    const { control } = crearServidor(3)
    renderAlumnos()
    const fila = await filaDe(2)
    const quitar = await botonQuitar(2)
    quitar.focus()
    fireEvent.click(quitar)
    control.deleteSinSesion = true
    const si = within(fila).getByRole("button", { name: `Sí, quitar ${nombreDe(2)}` })
    si.focus()
    fireEvent.click(si)
    await waitFor(() => expect(navegacion.irA).toHaveBeenCalledWith("/login"))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    expect(focoEn(), "el foco quedó en <body>").not.toBe(document.body)
    expect(focoEn()?.isConnected).toBe(true)
  })

  it("el roster nuevo responde 401 después de quitar: el error reemplaza la tabla y el foco va al encabezado", async () => {
    const { control } = crearServidor(3)
    renderAlumnos()
    const fila = await filaDe(2)
    const quitar = await botonQuitar(2)
    quitar.focus()
    fireEvent.click(quitar)
    control.rosterSinSesion = true
    const si = within(fila).getByRole("button", { name: `Sí, quitar ${nombreDe(2)}` })
    si.focus()
    fireEvent.click(si)
    await waitFor(() => expect(navegacion.irA).toHaveBeenCalledWith("/login"))
    await waitFor(() => expect(screen.queryByRole("cell", { name: nombreDe(1) })).toBeNull())
    await waitFor(() => expect(focoEn()).toBe(screen.getByRole("heading", { name: "Alumnos" })))
  })
})

describe(
  "ataque CLASES-b r3: otros controles de b que desaparecen tras su propia acción",
  { timeout: 30000 },
  () => {
    it("T-25: con teclado, «Agregar a la clase» se convierte en «Ya está en la clase» y el foco no se pierde en <body>", async () => {
      crearServidor(1)
      renderAlumnos()
      await filaDe(1)
      fireEvent.change(screen.getByLabelText("Buscar alumno por nombre"), {
        target: { value: "nad" },
      })
      const agregar = await screen.findByRole("button", { name: "Agregar a la clase Nadia Ruiz" })
      agregar.focus()
      fireEvent.click(agregar)
      await screen.findByText("Ya está en la clase")
      await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
      await esperar(20)
      expect(focoEn(), "el foco quedó en <body>").not.toBe(document.body)
      expect(focoEn()?.isConnected).toBe(true)
    })

    it("T-26: con teclado, «Ver más alumnos» desaparece al cargar la última página y el foco no se pierde en <body>", async () => {
      crearServidor(52)
      renderAlumnos()
      await filaDe(1)
      const verMas = await screen.findByRole("button", { name: "Ver más alumnos" })
      verMas.focus()
      fireEvent.click(verMas)
      await filaDe(52)
      await waitFor(() =>
        expect(screen.queryByRole("button", { name: "Ver más alumnos" })).toBeNull(),
      )
      await esperar(20)
      expect(focoEn(), "el foco quedó en <body>").not.toBe(document.body)
      expect(focoEn()?.isConnected).toBe(true)
    })
  },
)

describe("ataque CLASES-b r3: aviso de longitud del buscador (T-24, D-8)", () => {
  it("el campo usa el tope de shared (maxLength 120); un término de más de 120 normalizados avisa una sola vez, marca el campo y no pregunta; al corregirlo se quita", async () => {
    const { fetchMock } = crearServidor(0)
    renderAlumnos()
    const campo = screen.getByLabelText("Buscar alumno por nombre")
    expect(campo).toHaveAttribute("maxLength", "120")

    fireEvent.change(campo, { target: { value: "각".repeat(41) } })
    expect(
      await screen.findAllByText("La búsqueda no puede tener más de 120 caracteres"),
    ).toHaveLength(1)
    expect(campo).toHaveAttribute("aria-invalid", "true")
    await esperar(400)
    expect(fetchMock.mock.calls.filter(([e]) => String(e).includes("/candidatos"))).toHaveLength(0)

    fireEvent.change(campo, { target: { value: "각".repeat(40) } })
    await waitFor(() =>
      expect(screen.queryByText("La búsqueda no puede tener más de 120 caracteres")).toBeNull(),
    )
    expect(campo).toHaveAttribute("aria-invalid", "false")
    await waitFor(() =>
      expect(fetchMock.mock.calls.filter(([e]) => String(e).includes("/candidatos"))).toHaveLength(
        1,
      ),
    )

    // Un término corto no muestra el aviso de longitud, solo la ayuda permanente.
    fireEvent.change(campo, { target: { value: "ab" } })
    expect(screen.queryByText("La búsqueda no puede tener más de 120 caracteres")).toBeNull()
    expect(screen.getAllByText("Escribe al menos 3 letras.")).toHaveLength(1)
  })
})
