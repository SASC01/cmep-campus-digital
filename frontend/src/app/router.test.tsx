import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const sesionInvalida = () =>
  respuestaJson(401, { error: { codigo: "SESION_INVALIDA", mensaje: "Tu sesión terminó." } })

const me = (extra: Record<string, unknown> = {}) => ({
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  email: "ana@ejemplo.mx",
  rol: "estudiante",
  debeCambiarContrasena: false,
  accesoRestringido: false,
  ...extra,
})

const stubFetch = (manejador: (ruta: string) => Response) => {
  const fetchMock = vi.fn<typeof fetch>((entrada) => Promise.resolve(manejador(String(entrada))))
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const llamadasA = (fetchMock: ReturnType<typeof stubFetch>, ruta: string) =>
  fetchMock.mock.calls.filter(([entrada]) => String(entrada) === ruta).length

// Módulos de la aplicación frescos en cada prueba: restaurarSesion memoiza su resultado por carga y
// el token vive en memoria del módulo.
const renderEn = async (ruta: string) => {
  const { rutas } = await import("./router")
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

// La primera importación transforma todo el árbol de la aplicación (varios segundos en frío); se
// hace una vez aquí para que cada prueba solo reevalúe módulos ya transformados.
beforeAll(async () => {
  await import("./router")
}, 60_000)

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("rutas", () => {
  it("la raíz redirige a /login", async () => {
    stubFetch(() => sesionInvalida())
    const router = await renderEn("/")
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
  })

  it("una ruta por rol sin sesión redirige a /login", async () => {
    stubFetch(() => sesionInvalida())
    const router = await renderEn("/maestro")
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
  })

  it("con /me de estudiante, /maestro termina en /estudiante con su bienvenida", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "restaurado" })
      return respuestaJson(200, me())
    })

    const router = await renderEn("/maestro")

    await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"))
    // CLASES-a ronda 0 (C-4): "Hola, <nombre>" es un <span> de texto, no un encabezado.
    expect(await screen.findByText("Hola, Ana López")).toBeInTheDocument()
    expect(screen.getByText("Estudiante")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument()
  })

  it("PR-A26a: /estudiante monta el inicio del estudiante", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "restaurado" })
      if (ruta.startsWith("/api/clases/inscritas")) {
        return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
      }
      return respuestaJson(200, me())
    })

    await renderEn("/estudiante")

    expect(await screen.findByRole("button", { name: "Unirme a la clase" })).toBeInTheDocument()
  })

  // CLASES-02c (C-12): crear clases es del administrador.
  it("PR-A26b: /admin/clases/nueva monta el formulario para el admin", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "restaurado" })
      return respuestaJson(200, me({ rol: "admin" }))
    })

    await renderEn("/admin/clases/nueva")

    expect(await screen.findByRole("heading", { name: "Crear clase" })).toBeInTheDocument()
    expect(screen.getByLabelText("Buscar maestro por nombre")).toBeInTheDocument()
  })

  it("PR-2C08: /maestro/clases/nueva no existe: el maestro termina en /login sin pedir una clase llamada nueva", async () => {
    const fetchMock = stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "restaurado" })
      return respuestaJson(200, me({ rol: "maestro" }))
    })

    const router = await renderEn("/maestro/clases/nueva")

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(fetchMock.mock.calls.some(([entrada]) => String(entrada).includes("/nueva"))).toBe(false)
  })

  it("PR-B15: personas y alumnos montan sus vistas", async () => {
    const claseId = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
    const clase = {
      id: claseId,
      nombre: "Álgebra I",
      descripcion: null,
      maestro: { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" },
      // CLASES-02a (C-7): el esquema ahora exige `maestros`; solo se agrega el campo.
      maestros: [{ id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }],
    }
    const respuestaDeLaClase = (ruta: string, rol: "estudiante" | "maestro") => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "restaurado" })
      if (ruta === "/api/me") return respuestaJson(200, me({ rol }))
      if (ruta === `/api/clases/${claseId}`) return respuestaJson(200, { clase })
      if (ruta.startsWith(`/api/clases/${claseId}/personas`)) {
        return respuestaJson(200, {
          // CLASES-02b (C-11): el esquema ahora exige `email` y `maestros`; solo se agregan.
          maestro: { ...clase.maestro, email: "luis@x.mx" },
          maestros: [{ ...clase.maestro, email: "luis@x.mx" }],
          alumnos: [],
          totalAlumnos: 0,
          siguienteCursor: null,
        })
      }
      if (ruta.startsWith(`/api/clases/${claseId}/alumnos`)) {
        return respuestaJson(200, { alumnos: [], total: 0, siguienteCursor: null })
      }
      return respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "no esperada" } })
    }

    stubFetch((ruta) => respuestaDeLaClase(ruta, "estudiante"))
    await renderEn(`/estudiante/clases/${claseId}/personas`)
    expect(await screen.findByRole("heading", { name: "Maestro" })).toBeInTheDocument()
    expect(screen.getByText("Aún no hay alumnos en esta clase")).toBeInTheDocument()
    cleanup()
    vi.unstubAllGlobals()
    vi.resetModules()

    stubFetch((ruta) => respuestaDeLaClase(ruta, "maestro"))
    await renderEn(`/maestro/clases/${claseId}/alumnos`)
    expect(await screen.findByRole("heading", { name: "Agregar alumnos" })).toBeInTheDocument()
    expect(await screen.findByText(/Aún no hay alumnos\./)).toBeInTheDocument()
  })

  it("PR-A26c: un estudiante en /maestro/... vuelve a /estudiante", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "restaurado" })
      if (ruta.startsWith("/api/clases/inscritas")) {
        return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
      }
      return respuestaJson(200, me())
    })

    const router = await renderEn("/maestro/clases/nueva")

    await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"))
  })

  it("con accesoRestringido, /estudiante termina en /acceso-restringido con el motivo", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "restaurado" })
      return respuestaJson(
        200,
        me({ accesoRestringido: true, motivoRestriccion: "Adeudo de colegiatura" }),
      )
    })

    const router = await renderEn("/estudiante")

    await waitFor(() => expect(router.state.location.pathname).toBe("/acceso-restringido"))
    expect(
      await screen.findByText("Tu acceso está restringido. Acude a administración."),
    ).toBeInTheDocument()
    expect(screen.getByText("Adeudo de colegiatura")).toBeInTheDocument()
  })

  it("sin token y /refrescar 401: /estudiante termina en /login con una llamada a /refrescar, ninguna a /me y sin irA", async () => {
    const fetchMock = stubFetch(() => sesionInvalida())

    const router = await renderEn("/estudiante")

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(llamadasA(fetchMock, "/api/auth/refrescar")).toBe(1)
    expect(llamadasA(fetchMock, "/api/me")).toBe(0)
    const { irA } = await import("@/services/navegacion")
    expect(irA).not.toHaveBeenCalled()
  })

  it("con /me 403 CAMBIO_DE_CONTRASENA_REQUERIDO, /estudiante termina en /cambiar-contrasena con el formulario", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "restaurado" })
      return respuestaJson(403, {
        error: {
          codigo: "CAMBIO_DE_CONTRASENA_REQUERIDO",
          mensaje: "Debes cambiar tu contraseña antes de continuar.",
        },
      })
    })

    const router = await renderEn("/estudiante")

    await waitFor(() => expect(router.state.location.pathname).toBe("/cambiar-contrasena"))
    expect(await screen.findByRole("heading", { name: "Cambia tu contraseña" })).toBeInTheDocument()
  })

  it("con /me 200, /cambiar-contrasena termina en el dashboard del rol", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "restaurado" })
      return respuestaJson(200, me())
    })

    const router = await renderEn("/cambiar-contrasena")

    await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"))
  })

  it("sin sesión, /cambiar-contrasena termina en /login", async () => {
    stubFetch(() => sesionInvalida())

    const router = await renderEn("/cambiar-contrasena")

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
  })
})
