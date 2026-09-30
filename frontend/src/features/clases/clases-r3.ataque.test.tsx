import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { buttonVariants } from "@/components/ui/button-variants"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { ClaseLayout } from "./clase-layout"
import { FormularioClase } from "./components/formulario-clase"
import { CrearClaseView } from "./crear-clase-view"
import { EditarClaseView } from "./editar-clase-view"
import { InicioEstudianteView } from "./inicio-estudiante-view"
import { InicioMaestroView } from "./inicio-maestro-view"
import { MuroView } from "./muro-view"

// Tester, CLASES-a, ronda 3. Errores del formulario de clase que no son de un campo (observación
// de T-17 del manager) y una sola acción principal por vista.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"

const ME = (rol: "estudiante" | "maestro") => ({
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  email: "ana@ejemplo.mx",
  rol,
  debeCambiarContrasena: false,
  accesoRestringido: false,
})

const claseDetalle = {
  id: CLASE_ID,
  nombre: "Álgebra I",
  descripcion: "Curso",
  maestro: { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" },
}

type Manejador = (ruta: string, metodo: string) => Response | Promise<Response>

const stubFetch = (manejador: Manejador) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) =>
    Promise.resolve(manejador(String(entrada), init?.method ?? "GET")),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const nuevoCliente = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("ataque CLASES-a r3: errores del formulario de clase que no son de un campo", () => {
  const renderEditar = () =>
    render(
      <QueryClientProvider client={nuevoCliente()}>
        <MemoryRouter>
          <FormularioClase
            modo="editar"
            claseId={CLASE_ID}
            valoresIniciales={{ nombre: "Álgebra I", descripcion: "Curso" }}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )

  for (const [caso, respuesta] of [
    ["500 ERROR_INTERNO", () => errorJson(500, "ERROR_INTERNO")],
    ["403 SIN_ACCESO_A_LA_CLASE", () => errorJson(403, "SIN_ACCESO_A_LA_CLASE")],
    ["sin conexión", () => Promise.reject(new TypeError("Failed to fetch"))],
  ] as const) {
    it(`con ${caso} al guardar, el campo "Nombre de la clase" no queda marcado como inválido`, async () => {
      stubFetch((ruta, metodo) => {
        if (ruta === `/api/clases/${CLASE_ID}` && metodo === "PUT") return respuesta()
        return errorJson(500, "ERROR_INTERNO")
      })
      renderEditar()
      const nombre = screen.getByLabelText("Nombre de la clase")
      fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))

      // Precondición: el fallo llegó a la interfaz (aviso, alerta o texto de error).
      await waitFor(() =>
        expect(
          aviso.error.mock.calls.length +
            screen.queryAllByRole("alert").length +
            (nombre.getAttribute("aria-invalid") === "true" ? 1 : 0),
        ).toBeGreaterThan(0),
      )
      expect(
        nombre,
        `un ${caso} (no es un error del nombre) quedó como error del campo "Nombre de la clase"`,
      ).not.toHaveAttribute("aria-invalid", "true")
    })
  }
})

describe("ataque CLASES-a r3: una sola acción principal por vista", () => {
  const clasePrimaria = buttonVariants({ variant: "primary" })

  const contarPrimarias = () => {
    const botones = screen
      .queryAllByRole("button")
      .filter((b) => b.getAttribute("data-variant") === "primary")
    const enlaces = screen.queryAllByRole("link").filter((l) => l.className === clasePrimaria)
    return botones.length + enlaces.length
  }

  const stubVistas = (conClases: boolean, rol: "estudiante" | "maestro") =>
    stubFetch((ruta) => {
      if (ruta === "/api/me") return respuestaJson(200, ME(rol))
      if (ruta.startsWith("/api/clases/inscritas")) {
        return respuestaJson(200, {
          clases: conClases
            ? [{ id: CLASE_ID, nombre: "Álgebra I", maestro: { nombre: "L" } }]
            : [],
          total: conClases ? 1 : 0,
          siguienteCursor: null,
        })
      }
      if (ruta.startsWith("/api/clases/impartidas")) {
        return respuestaJson(200, {
          clases: conClases ? [{ id: CLASE_ID, nombre: "Álgebra I", alumnos: 2 }] : [],
          total: conClases ? 1 : 0,
          siguienteCursor: null,
        })
      }
      if (ruta === `/api/clases/${CLASE_ID}/codigo`)
        return respuestaJson(200, { codigo: "ABCDEFG" })
      if (ruta === `/api/clases/${CLASE_ID}`) return respuestaJson(200, { clase: claseDetalle })
      return errorJson(500, "ERROR_INTERNO")
    })

  const renderRuta = (ruta: string) =>
    render(
      <QueryClientProvider client={nuevoCliente()}>
        <MemoryRouter initialEntries={[ruta]}>
          <Routes>
            <Route path="/estudiante" element={<InicioEstudianteView />} />
            <Route path="/maestro" element={<InicioMaestroView />} />
            <Route path="/maestro/clases/nueva" element={<CrearClaseView />} />
            <Route path="/maestro/clases/:claseId" element={<ClaseLayout />}>
              <Route index element={<MuroView />} />
              <Route path="editar" element={<EditarClaseView />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

  it("control: la clase primaria de los enlaces se reconoce (el inicio del maestro tiene 'Crear clase')", async () => {
    stubVistas(true, "maestro")
    renderRuta("/maestro")
    await screen.findByRole("link", { name: "Álgebra I" })
    expect(screen.getByRole("link", { name: "Crear clase" }).className).toBe(clasePrimaria)
  })

  for (const [ruta, rol, conClases, esperar] of [
    ["/estudiante", "estudiante", false, "Aún no tienes clases"],
    ["/estudiante", "estudiante", true, "Álgebra I"],
    ["/maestro", "maestro", false, "Aún no tienes clases"],
    ["/maestro", "maestro", true, "Álgebra I"],
    ["/maestro/clases/nueva", "maestro", false, "Nombre de la clase"],
    [`/maestro/clases/${CLASE_ID}`, "maestro", true, "ABCDEFG"],
    [`/maestro/clases/${CLASE_ID}/editar`, "maestro", true, "Guardar cambios"],
  ] as const) {
    it(`${ruta} (${conClases ? "con" : "sin"} clases): a lo sumo una acción principal`, async () => {
      stubVistas(conClases, rol)
      renderRuta(ruta)
      await screen.findAllByText(esperar)
      expect(contarPrimarias()).toBeLessThanOrEqual(1)
    })
  }
})
