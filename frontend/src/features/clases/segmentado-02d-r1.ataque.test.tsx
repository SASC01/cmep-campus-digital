import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { MuroView } from "./muro-view"

// Tester, CLASES-02d, ronda 1. "Tipo de publicación" como control segmentado (§D-2D3, DESIGN.md
// §7.3): aria-pressed y Check en el elegido, el indicador aria-hidden que se desliza sin movimiento
// con prefers-reduced-motion, el material del grupo, el contexto opaco del admin y el cambio de tipo
// con una publicación en vuelo. El indicador se localiza por aria-hidden dentro del grupo; sus clases
// solo se leen como aserción sobre el elemento ya localizado.
// CLASES-03d ronda 0 (C-10, §D-R0; §D-8.7): el formulario de Avisos queda solo para anuncios, sin el
// grupo "Tipo de publicación". El primer caso se lleva a la regla de DESIGN.md §7.3 sobre el control de
// dos botones que sí existe, "Entregas después de la fecha límite" de «Crear tarea», con el router real
// (un módulo de features no importa de otro, regla 9). El segundo pierde el cambio de tipo, que ya no
// existe, y sigue protegiendo un solo POST del anuncio en vuelo, con su cuerpo exacto, y un solo aviso.

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const LUIS = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const publicacion = (datos: { tipo: string; titulo?: string; texto: string }) => ({
  id: "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d99",
  tipo: datos.tipo,
  titulo: datos.titulo ?? null,
  texto: datos.texto,
  autor: { ...LUIS, administracion: false },
  creadoEn: "2026-10-05T15:30:00.000Z",
  comentarios: 0,
  // TAREAS-01b ronda 0 (C-5, §D-R0): publicacionSchema gana la clave obligatoria tarea, null en anuncios y materiales.
  tarea: null,
  adjuntos: [],
  puedeBorrar: true,
})

const stubMuro = () => {
  let soltar: () => void = () => undefined
  const retenido = new Promise<void>((r) => {
    soltar = r
  })
  const fetchMock = vi.fn<typeof fetch>(async (entrada, init) => {
    const ruta = String(entrada)
    if (init?.method === "POST" && ruta === `/api/clases/${CLASE_ID}/publicaciones`) {
      await retenido
      const cuerpo = JSON.parse(String(init.body)) as { tipo: string; texto: string }
      return respuestaJson(201, { publicacion: publicacion(cuerpo) })
    }
    if (ruta.startsWith(`/api/clases/${CLASE_ID}/publicaciones`)) {
      return respuestaJson(200, { publicaciones: [], siguienteCursor: null })
    }
    return respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "x" } })
  })
  vi.stubGlobal("fetch", fetchMock)
  const posts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")
  return { posts, soltar }
}

const renderMuro = (perspectiva: "maestro" | "admin") => {
  const contenido = (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[`/${perspectiva}/clases/${CLASE_ID}`]}>
        <Routes>
          <Route path={`/${perspectiva}/clases/:claseId`} element={<MuroView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
  // El contexto opaco del admin lo pone ContenedorRol con data-material en un ancestro.
  return render(
    perspectiva === "admin" ? (
      <div data-material="opaco" data-densidad="densa">
        {contenido}
      </div>
    ) : (
      contenido
    ),
  )
}

// CLASES-03d ronda 0 (C-10): «Crear tarea» con el router real; la API responde lo que pide el marco
// (sesión, clase, código y la barra del maestro) y las listas vacías de categorías y temas.
const ME = (rol: "maestro" | "admin") => ({
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Luis Pérez",
  email: "luis@ejemplo.mx",
  rol,
  debeCambiarContrasena: false,
  accesoRestringido: false,
})

const stubCrearTarea = (rol: "maestro" | "admin") => {
  const inesperadas: string[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const metodo = init?.method ?? "GET"
      const { pathname } = new URL(String(entrada), "http://local")
      const base = `/api/clases/${CLASE_ID}`
      if (pathname === "/api/auth/refrescar") {
        return Promise.resolve(respuestaJson(200, { tokenAcceso: "restaurado" }))
      }
      if (pathname === "/api/me") return Promise.resolve(respuestaJson(200, ME(rol)))
      if (metodo === "GET" && pathname === "/api/clases/impartidas") {
        return Promise.resolve(respuestaJson(200, { clases: [], total: 0, siguienteCursor: null }))
      }
      if (metodo === "GET" && pathname === base) {
        return Promise.resolve(
          respuestaJson(200, {
            clase: {
              id: CLASE_ID,
              nombre: "Álgebra I",
              descripcion: null,
              maestro: LUIS,
              maestros: [LUIS],
            },
          }),
        )
      }
      if (metodo === "GET" && pathname === `${base}/codigo`) {
        return Promise.resolve(respuestaJson(200, { codigo: "ABCD234" }))
      }
      if (metodo === "GET" && pathname === `${base}/categorias`) {
        return Promise.resolve(respuestaJson(200, { categorias: [] }))
      }
      if (metodo === "GET" && pathname === `${base}/temas`) {
        return Promise.resolve(respuestaJson(200, { temas: [], sinTema: 0 }))
      }
      inesperadas.push(`${metodo} ${pathname}`)
      return Promise.resolve(
        respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "x" } }),
      )
    }),
  )
  return inesperadas
}

const renderCrearTarea = async (perspectiva: "maestro" | "admin") => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, {
    initialEntries: [`/${perspectiva}/clases/${CLASE_ID}/tareas/nueva`],
  })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

const clasesDe = (elemento: Element) => (elemento.getAttribute("class") ?? "").split(/\s+/)

const indicadorDe = (grupo: HTMLElement) => {
  const ocultos = Array.from(grupo.querySelectorAll('[aria-hidden="true"]')).filter(
    (e) => e.tagName.toLowerCase() !== "svg" && e.closest("button") === null,
  )
  expect(ocultos, "el grupo no tiene exactamente un indicador aria-hidden").toHaveLength(1)
  const [indicador] = ocultos
  if (!indicador) throw new Error("sin indicador")
  return indicador
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.mockClear()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("ataque CLASES-02d r1: el control segmentado del tipo", () => {
  // CLASES-03d ronda 0 (C-10): el grupo "Tipo de publicación" ya no existe; el caso se lleva al
  // control segmentado "Entregas después de la fecha límite" de «Crear tarea» (maestro y admin, con el
  // contexto opaco real del admin). Sigue protegiendo DESIGN.md §7.3: dos botones type="button" en
  // vidrio fuerte, aria-pressed, Check e indicador que cambian juntos, pulsar el elegido no lo cambia,
  // y el indicador sin transición con movimiento reducido. El botón principal no cambia con este
  // control, así que esa parte del caso de antes no tiene equivalente.
  it.each(["maestro", "admin"] as const)(
    "%s: aria-pressed, Check e indicador cambian juntos; el indicador no tiene transición con movimiento reducido",
    async (perspectiva) => {
      const inesperadas = stubCrearTarea(perspectiva)
      await renderCrearTarea(perspectiva)
      const grupo = await screen.findByRole(
        "group",
        { name: "Entregas después de la fecha límite" },
        { timeout: 3000 },
      )
      const aceptar = within(grupo).getByRole("button", { name: "Aceptar con retraso" })
      const noAceptar = within(grupo).getByRole("button", { name: "No aceptar" })
      expect(within(grupo).getAllByRole("button")).toHaveLength(2)
      for (const boton of [aceptar, noAceptar]) {
        expect(boton).toHaveAttribute("type", "button")
        expect(boton).not.toHaveAttribute("tabindex", "-1")
        expect(boton).not.toHaveAttribute("disabled")
      }
      expect(clasesDe(grupo)).toContain("vidrio-fuerte")
      expect(clasesDe(grupo)).not.toContain("vidrio")
      // El contexto opaco lo pone ContenedorRol solo en la perspectiva del admin.
      expect(grupo.closest('[data-material="opaco"]') !== null).toBe(perspectiva === "admin")

      const indicador = indicadorDe(grupo)
      for (const clase of [
        "rounded-row",
        "transition-transform",
        "duration-200",
        "motion-reduce:transition-none",
      ]) {
        expect(clasesDe(indicador), clase).toContain(clase)
      }
      expect(clasesDe(indicador)).toContain("in-data-[material=opaco]:bg-accent-soft")

      const estado = () => ({
        aceptar: aceptar.getAttribute("aria-pressed"),
        noAceptar: noAceptar.getAttribute("aria-pressed"),
        checkEnAceptar: aceptar.querySelector("svg") !== null,
        checkEnNoAceptar: noAceptar.querySelector("svg") !== null,
        trasladado: clasesDe(indicadorDe(grupo)).includes("translate-x-full"),
      })
      expect(estado()).toEqual({
        aceptar: "true",
        noAceptar: "false",
        checkEnAceptar: true,
        checkEnNoAceptar: false,
        trasladado: false,
      })
      fireEvent.click(noAceptar)
      expect(estado()).toEqual({
        aceptar: "false",
        noAceptar: "true",
        checkEnAceptar: false,
        checkEnNoAceptar: true,
        trasladado: true,
      })
      fireEvent.click(noAceptar)
      expect(estado().noAceptar).toBe("true")
      fireEvent.click(aceptar)
      expect(estado()).toEqual({
        aceptar: "true",
        noAceptar: "false",
        checkEnAceptar: true,
        checkEnNoAceptar: false,
        trasladado: false,
      })
      expect(inesperadas).toEqual([])
    },
  )

  // TAREAS-01e ronda 0 (C-12, §D-R0; §D-11, O-18 de CLASES-02d): con una publicación en vuelo, los
  // dos botones del tipo no actúan y el botón principal conserva el texto del tipo que se envió. El
  // clic en «Material» ya no cambia el tipo ni muestra «Título del material»: el caso lo comprueba en
  // lugar de escribir el título. Sigue protegiendo lo mismo: un solo POST, el del anuncio, con su
  // cuerpo exacto, y un solo aviso, aunque se intente cambiar de tipo y volver a publicar en vuelo.
  // CLASES-03d ronda 0 (C-10, §D-8.7): sin el grupo "Tipo de publicación" ya no hay tipo que cambiar en
  // vuelo; el caso comprueba que el formulario no tiene ese grupo, ni un campo de título, ni un botón
  // "Material", antes y durante el envío. Sigue protegiendo lo mismo: un solo POST, el del anuncio, con
  // su cuerpo exacto, y un solo aviso, aunque se intente volver a publicar en vuelo.
  it("sin tipo que cambiar: con un anuncio en vuelo no se manda otra publicación: un solo POST, el del anuncio, y un solo aviso", async () => {
    const { posts, soltar } = stubMuro()
    renderMuro("maestro")
    const campo = await screen.findByLabelText("Anuncio")
    const sinRastroDelTipo = () => {
      expect(screen.queryByRole("group", { name: "Tipo de publicación" })).toBeNull()
      expect(screen.queryByRole("button", { name: "Material" })).toBeNull()
      expect(screen.queryByLabelText(/^Título/)).toBeNull()
    }
    sinRastroDelTipo()
    fireEvent.change(campo, { target: { value: "Aviso importante" } })
    const publicar = screen.getByRole("button", { name: "Publicar anuncio" })
    fireEvent.click(publicar)
    await waitFor(() => expect(posts()).toHaveLength(1))
    await waitFor(() => expect(publicar).toHaveAttribute("aria-busy", "true"))

    sinRastroDelTipo()
    expect(screen.getByRole("button", { name: /^Publicar / })).toHaveTextContent("Publicar anuncio")
    fireEvent.click(screen.getByRole("button", { name: /^Publicar / }))
    fireEvent.submit(publicar.closest("form") ?? publicar)
    await act(() => new Promise((r) => setTimeout(r, 30)))
    expect(posts()).toHaveLength(1)

    soltar()
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
    await act(() => new Promise((r) => setTimeout(r, 30)))
    expect(posts()).toHaveLength(1)
    expect(JSON.parse(String(posts()[0]?.[1]?.body))).toEqual({
      tipo: "anuncio",
      texto: "Aviso importante",
      archivoIds: [],
    })
    expect(aviso.error).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: /^Publicar / })).not.toHaveAttribute(
      "aria-busy",
      "true",
    )
  })
})
