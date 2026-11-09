import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { ListaMaestrosDeClase } from "./components/lista-maestros-de-clase"
import { TablaClasesAdmin } from "./components/tabla-clases-admin"
import { PersonasView } from "./personas-view"

// ADMIN-01f (ADM-1F16 y ADM-1F23; S-16, N-01e-2): la insignia «Cuenta desactivada» junto a un maestro
// dado de baja, con texto (nunca solo color), en "Personas" del alumno, en la lista de maestros de la
// clase y en /admin/clases. La marca se lee de `maestros`, nunca del campo de compatibilidad `maestro`.

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const LUIS = {
  id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
  nombre: "Luis Pérez",
  email: "luis@x.mx",
}
const ANA = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d10", nombre: "Ana Ruiz", email: "ana@x.mx" }
const INSIGNIA = "Cuenta desactivada"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const conConsultas = (hijo: ReactNode) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {hijo}
  </QueryClientProvider>
)

const personasConMaestro = (
  maestro: Record<string, unknown>,
  maestros: Record<string, unknown>[],
) => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada) => {
      if (String(entrada).startsWith(`/api/clases/${CLASE_ID}/personas`)) {
        return Promise.resolve(
          respuestaJson(200, {
            maestro,
            maestros,
            alumnos: [],
            totalAlumnos: 0,
            siguienteCursor: null,
          }),
        )
      }
      return Promise.resolve(
        respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "no esperada" } }),
      )
    }),
  )
  render(
    conConsultas(
      <MemoryRouter initialEntries={[`/estudiante/clases/${CLASE_ID}/personas`]}>
        <Routes>
          <Route path="/estudiante/clases/:claseId/personas" element={<PersonasView />} />
        </Routes>
      </MemoryRouter>,
    ),
  )
}

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
})

describe("ADMIN-01f · «Cuenta desactivada» en Personas del alumno (ADM-1F16, ADM-1F23)", () => {
  it("ADM-1F23: con maestros[0] marcado y `maestro` sin la marca, la insignia sale junto a ese maestro", async () => {
    personasConMaestro(LUIS, [{ ...LUIS, cuentaDesactivada: true }])
    const lista = await screen.findByRole("list", { name: "Maestro" })
    const fila = within(lista).getByText(LUIS.nombre).closest("li")
    expect(fila).not.toBeNull()
    expect(within(fila as HTMLElement).getByText(INSIGNIA)).toBeInTheDocument()
  })

  it("ADM-1F23: con `maestro` marcado y `maestros` sin la marca, no sale", async () => {
    personasConMaestro({ ...LUIS, cuentaDesactivada: true }, [LUIS])
    const lista = await screen.findByRole("list", { name: "Maestro" })
    expect(within(lista).getByText(LUIS.nombre)).toBeInTheDocument()
    expect(screen.queryByText(INSIGNIA)).toBeNull()
  })

  it("ADM-1F16: con dos maestros, solo el dado de baja lleva la insignia", async () => {
    personasConMaestro(LUIS, [LUIS, { ...ANA, cuentaDesactivada: true }])
    const lista = await screen.findByRole("list", { name: "Maestros" })
    const filaDeAna = within(lista).getByText(ANA.nombre).closest("li")
    const filaDeLuis = within(lista).getByText(LUIS.nombre).closest("li")
    expect(within(filaDeAna as HTMLElement).getByText(INSIGNIA)).toBeInTheDocument()
    expect(within(filaDeLuis as HTMLElement).queryByText(INSIGNIA)).toBeNull()
  })
})

describe("ADMIN-01f · «Cuenta desactivada» en la lista de maestros de la clase (ADM-1F16, ADM-1F23)", () => {
  const renderLista = (maestros: Parameters<typeof ListaMaestrosDeClase>[0]["maestros"]) =>
    render(
      <ListaMaestrosDeClase
        maestros={maestros}
        confirmar
        quitando={false}
        puedeQuitar={false}
        onQuitar={vi.fn()}
        alQuedarseSinDestino={vi.fn()}
        etiqueta="Maestros"
      />,
    )

  it("la insignia sale junto al maestro con la marca y no junto al activo", () => {
    renderLista([LUIS, { ...ANA, cuentaDesactivada: true }])
    const filaDeAna = screen.getByText(ANA.nombre).closest("li")
    const filaDeLuis = screen.getByText(LUIS.nombre).closest("li")
    expect(within(filaDeAna as HTMLElement).getByText(INSIGNIA)).toBeInTheDocument()
    expect(within(filaDeLuis as HTMLElement).queryByText(INSIGNIA)).toBeNull()
  })

  it("con todos activos, ninguna insignia", () => {
    renderLista([LUIS, ANA])
    expect(screen.queryByText(INSIGNIA)).toBeNull()
  })
})

describe("ADMIN-01f · «Cuenta desactivada» en /admin/clases (ADM-1F16, ADM-1F23)", () => {
  const clase = (maestros: Record<string, unknown>[]) => ({
    id: CLASE_ID,
    nombre: "Derecho civil",
    maestros,
    alumnos: 3,
    creadoEn: "2026-09-01T15:00:00.000Z",
    archivadaEn: null,
  })

  const renderTabla = (maestros: Record<string, unknown>[]) =>
    render(
      conConsultas(
        <MemoryRouter>
          <TablaClasesAdmin
            clases={[clase(maestros) as Parameters<typeof TablaClasesAdmin>[0]["clases"][number]]}
            estado="activas"
            onBorrar={vi.fn()}
          />
        </MemoryRouter>,
      ),
    )

  it("la insignia sale junto al maestro dado de baja; los nombres siguen en su lista", () => {
    renderTabla([
      { id: LUIS.id, nombre: LUIS.nombre },
      { id: ANA.id, nombre: ANA.nombre, cuentaDesactivada: true },
    ])
    expect(screen.getByText("Luis Pérez, Ana Ruiz")).toBeInTheDocument()
    const insignia = screen.getByText(INSIGNIA)
    expect(insignia.parentElement?.textContent).toContain(ANA.nombre)
    expect(insignia.parentElement?.textContent).not.toContain(LUIS.nombre)
    expect(screen.getAllByText(INSIGNIA)).toHaveLength(1)
  })

  it("con un maestro activo, no sale", () => {
    renderTabla([{ id: LUIS.id, nombre: LUIS.nombre }])
    expect(screen.queryByText(INSIGNIA)).toBeNull()
  })
})

// Corrección M-21 (ADM-1F23, plan :1216): las tres vistas montadas con el router real (rutas de
// app/router) y el doble de su consulta. El maestro y el admin leen los maestros del detalle de la clase
// (GET /api/clases/:claseId), que trae también `maestro` (compatibilidad): se prueba con el doble al
// revés. GET /api/admin/clases no tiene campo de compatibilidad (claseAdminSchema solo trae `maestros`):
// basta el maestro marcado y el activo.
describe("ADMIN-01f · «Cuenta desactivada» en las vistas con su doble (ADM-1F23, corrección M-21)", () => {
  const ME = {
    maestro: {
      id: "6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01",
      nombre: "Marta Sol",
      email: "marta@x.mx",
      rol: "maestro",
      debeCambiarContrasena: false,
      accesoRestringido: false,
    },
    admin: {
      id: "6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02",
      nombre: "Administración",
      email: "admin@x.mx",
      rol: "admin",
      debeCambiarContrasena: false,
      accesoRestringido: false,
    },
  } as const

  const detalle = (maestro: Record<string, unknown>, maestros: Record<string, unknown>[]) => ({
    id: CLASE_ID,
    nombre: "Derecho civil",
    descripcion: null,
    maestro,
    maestros,
    archivadaEn: null,
  })

  const montar = async (
    rol: keyof typeof ME,
    ruta: string,
    responder: (url: URL) => Response | null,
  ) => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada) => {
        const url = new URL(String(entrada), "http://local")
        if (url.pathname === "/api/auth/refrescar") {
          return Promise.resolve(respuestaJson(200, { tokenAcceso: "t" }))
        }
        if (url.pathname === "/api/me") return Promise.resolve(respuestaJson(200, ME[rol]))
        const propia = responder(url)
        if (propia !== null) return Promise.resolve(propia)
        return Promise.resolve(
          respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "no esperada" } }),
        )
      }),
    )
    const { rutas } = await import("@/app/router")
    render(
      conConsultas(
        <RouterProvider router={createMemoryRouter(rutas, { initialEntries: [ruta] })} />,
      ),
    )
  }

  const conDetalle =
    (maestro: Record<string, unknown>, maestros: Record<string, unknown>[]) => (url: URL) =>
      url.pathname === `/api/clases/${CLASE_ID}`
        ? respuestaJson(200, { clase: detalle(maestro, maestros) })
        : null

  const filaDe = async (nombre: string) => {
    const lista = await screen.findByRole("list", { name: /Maestro/ }, { timeout: 4000 })
    const fila = within(lista).getAllByText(nombre)[0]?.closest("li") ?? null
    if (fila === null) throw new Error(`Precondición: ${nombre} tiene su fila`)
    return fila
  }

  it("ADM-1F23, maestro (/maestro/clases/:claseId/personas): con maestros[1] marcado y `maestro` sin la marca, la insignia sale junto a ese maestro y no junto al activo", async () => {
    await montar(
      "maestro",
      `/maestro/clases/${CLASE_ID}/personas`,
      conDetalle(LUIS, [LUIS, { ...ANA, cuentaDesactivada: true }]),
    )
    expect(within(await filaDe(ANA.nombre)).getByText(INSIGNIA)).toBeInTheDocument()
    expect(within(await filaDe(LUIS.nombre)).queryByText(INSIGNIA)).toBeNull()
  })

  it("ADM-1F23, maestro: con `maestro` marcado y `maestros` sin la marca, no sale", async () => {
    await montar(
      "maestro",
      `/maestro/clases/${CLASE_ID}/personas`,
      conDetalle({ ...LUIS, cuentaDesactivada: true }, [LUIS, ANA]),
    )
    await filaDe(LUIS.nombre)
    expect(screen.queryByText(INSIGNIA)).toBeNull()
  })

  it("ADM-1F23, admin (/admin/clases/:claseId/personas): con maestros[1] marcado y `maestro` sin la marca, la insignia sale junto a ese maestro y no junto al activo", async () => {
    await montar(
      "admin",
      `/admin/clases/${CLASE_ID}/personas`,
      conDetalle(LUIS, [LUIS, { ...ANA, cuentaDesactivada: true }]),
    )
    expect(within(await filaDe(ANA.nombre)).getByText(INSIGNIA)).toBeInTheDocument()
    expect(within(await filaDe(LUIS.nombre)).queryByText(INSIGNIA)).toBeNull()
  })

  it("ADM-1F23, admin: con `maestro` marcado y `maestros` sin la marca, no sale", async () => {
    await montar(
      "admin",
      `/admin/clases/${CLASE_ID}/personas`,
      conDetalle({ ...LUIS, cuentaDesactivada: true }, [LUIS, ANA]),
    )
    await filaDe(LUIS.nombre)
    expect(screen.queryByText(INSIGNIA)).toBeNull()
  })

  it("ADM-1F23, /admin/clases con el doble de GET /api/admin/clases: la insignia sale junto al maestro dado de baja y no junto al activo", async () => {
    await montar("admin", "/admin/clases", (url) =>
      url.pathname === "/api/admin/clases"
        ? respuestaJson(200, {
            clases: [
              {
                id: CLASE_ID,
                nombre: "Derecho civil",
                maestros: [
                  { id: LUIS.id, nombre: LUIS.nombre },
                  { id: ANA.id, nombre: ANA.nombre, cuentaDesactivada: true },
                ],
                alumnos: 3,
                creadoEn: "2026-09-01T15:00:00.000Z",
                archivadaEn: null,
              },
            ],
            total: 1,
            siguienteCursor: null,
            siguienteCursorArchivadaEn: null,
          })
        : null,
    )
    const insignia = await screen.findByText(INSIGNIA, {}, { timeout: 4000 })
    expect(insignia.parentElement?.textContent).toContain(ANA.nombre)
    expect(insignia.parentElement?.textContent).not.toContain(LUIS.nombre)
    expect(screen.getAllByText(INSIGNIA)).toHaveLength(1)
  })
})
