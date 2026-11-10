import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Ataques del Tester (DESIGN-01a, ronda 1) contra ErrorDeCampo (§D-7): al sustituir el <p> rojo
// por el componente con icono, cada campo inválido debe seguir describiéndose con su mensaje (el
// icono aria-hidden no entra en la descripción), el mensaje sigue siendo un solo nodo de texto y
// no se envía nada al servidor.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/login") }))

const TOKEN_ENLACE = "a".repeat(43)

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string) =>
  respuestaJson(estado, { error: { codigo, mensaje: "mensaje del servidor" } })

const meAdmin = {
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Administración",
  email: "admin@ejemplo.mx",
  rol: "admin",
  debeCambiarContrasena: false,
  accesoRestringido: false,
}

const stubApi = (me: () => Response) => {
  const fetchMock = vi.fn<typeof fetch>((entrada) => {
    const ruta = String(entrada)
    if (ruta === "/api/auth/refrescar") {
      return Promise.resolve(respuestaJson(200, { tokenAcceso: "token" }))
    }
    if (ruta === "/api/me") return Promise.resolve(me())
    return Promise.resolve(errorJson(500, "ERROR_INTERNO"))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const renderEn = async (ruta: string) => {
  const { rutas } = await import("./router")
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

const sinSesion = () => errorJson(401, "NO_AUTENTICADO")

beforeAll(async () => {
  await import("./router")
}, 60_000)

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("ataque (DESIGN-01a r1): el error de cada campo sigue siendo su descripción accesible", () => {
  it.each([
    { ruta: "/login", me: sinSesion, formulario: "Iniciar sesión", campos: 2, llamadas: 0 },
    { ruta: "/registro", me: sinSesion, formulario: "Crear cuenta", campos: 3, llamadas: 0 },
    { ruta: "/recuperar", me: sinSesion, formulario: "Enviar enlace", campos: 1, llamadas: 0 },
    {
      ruta: `/restablecer#token=${TOKEN_ENLACE}`,
      me: sinSesion,
      formulario: "Guardar contraseña",
      campos: 1,
      llamadas: 0,
    },
    {
      // AUTH-03a ronda 0 (C-5): sin el campo de la temporal, el envío vacío deja un solo campo
      // inválido (la nueva), como /restablecer; la confirmación se compara solo con una nueva válida.
      ruta: "/cambiar-contrasena",
      me: () => errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO"),
      formulario: "Guardar y continuar",
      campos: 1,
      llamadas: 2,
    },
    // ADMIN-01f ronda 0 (C-16, §D-11 y Enmienda 1): "Invitar maestro" pasa a /admin/maestros, que
    // al montarse pide además la lista de enlaces (GET /api/admin/enlaces-registro): tres llamadas,
    // ninguna del formulario. "Buscar" de /admin sale; su búsqueda pasa a /admin/usuarios, que no se
    // envía: el campo inválido de esa búsqueda (el tope de 120) va en el caso nuevo de abajo.
    {
      ruta: "/admin/maestros",
      me: () => respuestaJson(200, meAdmin),
      formulario: "Enviar invitación",
      campos: 2,
      llamadas: 3,
    },
  ])(
    "$ruta, formulario '$formulario' enviado vacío: $campos campos inválidos, cada uno descrito por su mensaje",
    async ({ ruta, me, formulario, campos, llamadas }) => {
      const fetchMock = stubApi(me)
      await renderEn(ruta)
      const form = await screen.findByRole("form", { name: formulario })

      fireEvent.submit(form)

      const invalidos = Array.from(
        form.querySelectorAll<HTMLInputElement>('input[aria-invalid="true"]'),
      )
      expect(invalidos, "campos marcados como inválidos").toHaveLength(campos)
      for (const campo of invalidos) {
        const ids = (campo.getAttribute("aria-describedby") ?? "").split(/\s+/)
        const idError = ids.find((id) => id.endsWith("-error"))
        expect(idError, `${campo.id} no apunta a su error`).toBeDefined()
        const error = document.getElementById(idError ?? "")
        expect(error, `no existe #${idError}`).not.toBeNull()
        const mensaje = error?.textContent?.trim() ?? ""
        expect(mensaje.length, `#${idError} está vacío`).toBeGreaterThan(0)
        expect(campo).toHaveAccessibleDescription(expect.stringContaining(mensaje))
        expect(screen.getAllByText(mensaje), "el mensaje no es un solo nodo de texto").toContain(
          error,
        )
        expect(error?.querySelector('svg[aria-hidden="true"]'), "sin icono").not.toBeNull()
      }
      expect(fetchMock.mock.calls.length, "el formulario inválido llamó a la API").toBe(llamadas)
    },
  )
})

// ADMIN-01f ronda 0 (C-16): la búsqueda de /admin pasa al buscador de /admin/usuarios (§D-11,
// "Enmienda 14"). Un término de más de 120 caracteres normalizados no se manda y marca el campo con
// su ErrorDeCampo: el campo inválido sigue describiéndose con su mensaje, que es un solo nodo de
// texto con su icono, y no sale ninguna petición con q.
describe("ataque (DESIGN-01a r1, ADMIN-01f): el buscador de /admin/usuarios con el término largo", () => {
  it("el campo queda inválido y descrito por su mensaje, con icono, y no se pide nada con q", async () => {
    const fetchMock = stubApi(() => respuestaJson(200, meAdmin))
    await renderEn("/admin/usuarios")
    const campo = await screen.findByLabelText("Buscar por nombre o correo")

    fireEvent.change(campo, { target: { value: "a".repeat(121) } })

    await waitFor(() => expect(campo).toHaveAttribute("aria-invalid", "true"), { timeout: 3000 })
    const ids = (campo.getAttribute("aria-describedby") ?? "").split(/\s+/)
    const error = ids
      .map((id) => document.getElementById(id))
      .find(
        (nodo) => nodo?.textContent?.trim() === "La búsqueda no puede tener más de 120 caracteres",
      )
    expect(error, "el campo no apunta a su error").toBeDefined()
    expect(campo).toHaveAccessibleDescription(
      expect.stringContaining("La búsqueda no puede tener más de 120 caracteres"),
    )
    expect(error?.querySelector('svg[aria-hidden="true"]'), "sin icono").not.toBeNull()
    const conQ = fetchMock.mock.calls.filter(([entrada]) =>
      new URL(String(entrada), "http://local").searchParams.has("q"),
    )
    expect(conQ, "salió una petición con q").toEqual([])
  })
})
