import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { ClaseLayout } from "./clase-layout"
import { FormularioClase } from "./components/formulario-clase"
import { TarjetaClase } from "./components/tarjeta-clase"
import { InicioEstudianteView } from "./inicio-estudiante-view"

// Tester, CLASES-a, ronda 2. Regresión de T-05, T-06, T-08 y T-11 más allá de los casos de la
// ronda 1: nombres de maestro largos en las mismas superficies, avisos del código mientras carga,
// y mensajes VALIDACION del servidor en los formularios de CLASES-a.

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
const LARGO = "M".repeat(120)
const REGLA_DE_CORTE = /(^|\s)(break-all|break-words|wrap-anywhere|wrap-break-word)(\s|$)/

// CLASES-02a ronda 0 (C-7): claseDetalleSchema suma maestros (1 o 2) y conserva maestro.
const claseDetalle = (extra: Record<string, unknown> = {}) => ({
  id: CLASE_ID,
  nombre: "Álgebra I",
  descripcion: "Curso de álgebra",
  maestro: { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" },
  maestros: [{ id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }],
  ...extra,
})

type Manejador = (ruta: string, metodo: string) => Response | Promise<Response>

const stubFetch = (manejador: Manejador) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) =>
    Promise.resolve(manejador(String(entrada), init?.method ?? "GET")),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

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

describe("ataque CLASES-a r2: T-08 con nombres de 120 caracteres y con emojis", () => {
  it("el título de la tarjeta con 60 emojis conserva el corte y el límite de dos líneas", () => {
    const emojis = "👩‍💻".repeat(60)
    render(
      <MemoryRouter>
        <TarjetaClase claseId={CLASE_ID} nombre={emojis} metadatos="Luis" destino="/x" />
      </MemoryRouter>,
    )
    const titulo = screen.getByText(emojis)
    expect(titulo.className).toMatch(REGLA_DE_CORTE)
    expect(titulo.className).toMatch(/(^|\s)line-clamp-2(\s|$)/)
  })

  it("los metadatos de la tarjeta (nombre del maestro de 120 caracteres sin espacios) se cortan", () => {
    render(
      <MemoryRouter>
        <TarjetaClase claseId={CLASE_ID} nombre="Álgebra" metadatos={LARGO} destino="/x" />
      </MemoryRouter>,
    )
    const metadatos = screen.getByText(LARGO)
    expect(
      metadatos.className,
      "los metadatos no tienen regla de corte: la tarjeta es un elemento de rejilla y desborda",
    ).toMatch(REGLA_DE_CORTE)
  })

  it("'Maestro: <nombre>' del encabezado con un nombre de 120 caracteres sin espacios se corta", async () => {
    stubFetch((ruta) => {
      if (ruta === `/api/clases/${CLASE_ID}`) {
        return respuestaJson(200, {
          clase: claseDetalle({
            maestro: { id: CLASE_ID, nombre: LARGO },
            maestros: [{ id: CLASE_ID, nombre: LARGO }],
          }),
        })
      }
      return errorJson(500, "ERROR_INTERNO")
    })
    renderLayout(`/estudiante/clases/${CLASE_ID}`)
    const linea = await screen.findByText(`Maestro: ${LARGO}`)

    expect(
      linea.className,
      "la línea del maestro, hija directa de la rejilla de CardHeader, no tiene corte",
    ).toMatch(REGLA_DE_CORTE)
    expect(linea.className, "sin min-w-0 el elemento de rejilla no se encoge").toMatch(
      /(^|\s)min-w-0(\s|$)/,
    )
  })

  it("control: el h1 con 60 emojis conserva min-w-0 y la regla de corte", async () => {
    const emojis = "🧪".repeat(60)
    stubFetch((ruta) => {
      if (ruta === `/api/clases/${CLASE_ID}`) {
        return respuestaJson(200, { clase: claseDetalle({ nombre: emojis }) })
      }
      return errorJson(500, "ERROR_INTERNO")
    })
    renderLayout(`/estudiante/clases/${CLASE_ID}`)
    const h1 = await screen.findByRole("heading", { level: 1, name: emojis })
    expect(h1.className).toMatch(REGLA_DE_CORTE)
    expect(h1.className).toMatch(/(^|\s)min-w-0(\s|$)/)
  })
})

describe("ataque CLASES-a r2: avisos del código (T-05, T-06)", () => {
  it("'Copiar código' mientras el código aún carga da un aviso, no copia nada", async () => {
    stubFetch((ruta) => {
      if (ruta === `/api/clases/${CLASE_ID}/codigo`) return new Promise<Response>(() => undefined)
      if (ruta === `/api/clases/${CLASE_ID}`) return respuestaJson(200, { clase: claseDetalle() })
      return errorJson(500, "ERROR_INTERNO")
    })
    renderLayout(`/maestro/clases/${CLASE_ID}`)
    await screen.findByRole("heading", { level: 1, name: "Álgebra I" })

    fireEvent.click(screen.getByRole("button", { name: "Copiar código" }))
    await esperarUnMomento()

    expect(navigator.clipboard.writeText).not.toHaveBeenCalled()
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })

  it("con /codigo en 403 el mensaje es el de la clase, sin texto técnico", async () => {
    stubFetch((ruta) => {
      if (ruta === `/api/clases/${CLASE_ID}/codigo`) {
        return errorJson(403, "SIN_ACCESO_A_LA_CLASE", "texto interno del servidor")
      }
      if (ruta === `/api/clases/${CLASE_ID}`) return respuestaJson(200, { clase: claseDetalle() })
      return errorJson(500, "ERROR_INTERNO")
    })
    renderLayout(`/maestro/clases/${CLASE_ID}`)
    const alerta = await screen.findByRole("alert")
    expect(alerta.textContent).toContain("No tienes acceso a esta clase.")
    expect(alerta.textContent).not.toContain("texto interno")
  })

  it("regenerar con éxito después de un error de carga reemplaza el error por el código nuevo", async () => {
    stubFetch((ruta, metodo) => {
      if (ruta === `/api/clases/${CLASE_ID}/codigo` && metodo === "POST") {
        return respuestaJson(200, { codigo: "HJKLMNP" })
      }
      if (ruta === `/api/clases/${CLASE_ID}/codigo`) return errorJson(500, "ERROR_INTERNO")
      if (ruta === `/api/clases/${CLASE_ID}`) return respuestaJson(200, { clase: claseDetalle() })
      return errorJson(500, "ERROR_INTERNO")
    })
    renderLayout(`/maestro/clases/${CLASE_ID}`)
    await screen.findByRole("alert")

    fireEvent.click(screen.getByRole("button", { name: "Regenerar código" }))
    fireEvent.click(await screen.findByRole("button", { name: "Sí, regenerar" }))

    expect(await screen.findByText("HJKLMNP")).toBeInTheDocument()
    await waitFor(() => expect(aviso.success).toHaveBeenCalled())
  })
})

describe("ataque CLASES-a r2: VALIDACION del servidor en los formularios (T-11)", () => {
  // CLASES-02 ronda 0 de 02c (C-12, §D-2C2): editar la clase pasa al admin; useEditarClase hace
  // PUT /api/admin/clases/:claseId (PUT /api/clases/:claseId ya no existe, C-2 de 02a). Sigue
  // protegiendo que el VALIDACION de la descripción quede en su campo, sin el nombre técnico.
  it("al editar, un VALIDACION de la descripción se muestra en su campo y sin el nombre técnico del campo", async () => {
    stubFetch((ruta, metodo) => {
      if (ruta === `/api/admin/clases/${CLASE_ID}` && metodo === "PUT") {
        return errorJson(400, "VALIDACION", "descripcion: No puede tener más de 2000 caracteres")
      }
      return errorJson(500, "ERROR_INTERNO")
    })
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
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await screen.findByText(/No puede tener más de 2000 caracteres/)

    expect(screen.queryByText(/descripcion:/), "texto técnico 'descripcion:' en la interfaz").toBe(
      null,
    )
    expect(
      screen.getByLabelText("Descripción (opcional)"),
      "el error del servidor sobre la descripción no quedó asociado a su campo",
    ).toHaveAttribute("aria-invalid", "true")
  })

  it("al unirse, un VALIDACION del servidor se muestra sin el nombre técnico del campo", async () => {
    stubFetch((ruta, metodo) => {
      if (ruta === "/api/me") {
        return respuestaJson(200, {
          id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
          nombre: "Ana López",
          email: "ana@ejemplo.mx",
          rol: "estudiante",
          debeCambiarContrasena: false,
          accesoRestringido: false,
        })
      }
      if (ruta.startsWith("/api/clases/inscritas")) {
        return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
      }
      if (ruta === "/api/clases/unirse" && metodo === "POST") {
        return errorJson(400, "VALIDACION", "codigo: Escribe los 7 caracteres del código")
      }
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
      target: { value: "abcdefg" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Unirme a la clase" }))
    await screen.findByText(/Escribe los 7 caracteres del código/)

    expect(screen.queryByText(/codigo:/), "texto técnico 'codigo:' en la interfaz").toBe(null)
  })
})
