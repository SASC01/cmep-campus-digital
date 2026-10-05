import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// Tester, CLASES-02c, ronda 1. /admin/clases y las pantallas de una clase del admin, con el router de
// la aplicación: "Cargar más clases" (doble clic, última página con y sin clases, 400 del cursor y
// su foco), errores de la lista, nombres con HTML o sin espacios en la tabla y en el encabezado, y
// que todo control de las pantallas del admin cuelgue del contexto opaco y denso. Sin selectores de
// clases de estilo (las reglas de corte se comprueban sobre el elemento ya localizado por su texto).

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin/clases") }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const idClase = (n: number) => `9a9b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const REGLA_DE_CORTE = /(^|\s)(break-all|break-words|wrap-anywhere|wrap-break-word)(\s|$)/

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorJson = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const ME_ADMIN = {
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana Torres",
  email: "admin@ejemplo.mx",
  rol: "admin",
  debeCambiarContrasena: false,
  accesoRestringido: false,
}

const claseAdmin = (n: number, extra: Record<string, unknown> = {}) => ({
  id: idClase(n),
  nombre: `Clase ${String(n)}`,
  maestros: [MAESTRO],
  alumnos: n,
  creadoEn: "2026-10-01T15:00:00.000Z",
  ...extra,
})

const diferido = () => {
  let resolver: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver }
}

type Lista = (ruta: string) => Response | Promise<Response>

const stubApp = (
  lista: Lista,
  extra: (ruta: string, metodo: string) => Response | undefined = () => undefined,
) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
    const ruta = String(entrada)
    const metodo = init?.method ?? "GET"
    const propia = extra(ruta, metodo)
    if (propia) return Promise.resolve(propia)
    if (ruta === "/api/auth/refrescar")
      return Promise.resolve(respuestaJson(200, { tokenAcceso: "t" }))
    if (ruta === "/api/me") return Promise.resolve(respuestaJson(200, ME_ADMIN))
    if (ruta === "/api/admin/clases" || ruta.startsWith("/api/admin/clases?")) {
      return Promise.resolve(lista(ruta))
    }
    return Promise.resolve(errorJson(500, "ERROR_INTERNO", "mensaje del servidor"))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const renderEn = async (ruta: string) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const esperar = (ms: number) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))

const llamadasConCursor = (fetchMock: ReturnType<typeof stubApp>) =>
  fetchMock.mock.calls.filter(([entrada]) => String(entrada).includes("cursor="))

const primeraPagina = () =>
  respuestaJson(200, {
    clases: Array.from({ length: 50 }, (_, i) => claseAdmin(i + 1)),
    total: 51,
    siguienteCursor: idClase(50),
  })

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

describe("ataque CLASES-02c r1: «Cargar más clases»", () => {
  it("doble clic humano (30 ms) con la página en vuelo: una sola petición con el cursor; al llegar la última, el foco va al «Abrir» de la primera clase nueva", async () => {
    const segunda = diferido()
    const fetchMock = stubApp((ruta) =>
      ruta.includes("cursor=") ? segunda.promesa : primeraPagina(),
    )
    await renderEn("/admin/clases")
    const boton = await screen.findByRole("button", { name: "Cargar más clases" })
    act(() => boton.focus())
    fireEvent.click(boton)
    await esperar(30)
    fireEvent.click(boton)
    await waitFor(() => expect(boton).toHaveAttribute("aria-busy", "true"))
    fireEvent.click(boton)
    expect(llamadasConCursor(fetchMock)).toHaveLength(1)
    expect(String(llamadasConCursor(fetchMock)[0]?.[0])).toContain(`cursor=${idClase(50)}`)
    expect(document.activeElement).toBe(boton)

    await act(async () => {
      segunda.resolver(
        respuestaJson(200, { clases: [claseAdmin(51)], total: 51, siguienteCursor: null }),
      )
      await segunda.promesa
    })
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Cargar más clases" })).toBeNull(),
    )
    await esperar(50)
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Abrir Clase 51" }))
    expect(screen.getAllByRole("link", { name: /^Abrir / })).toHaveLength(51)
  })

  it("dos clics en el mismo instante: la página siguiente no se duplica en la tabla (51 filas, ids únicos)", async () => {
    const pendientes: ReturnType<typeof diferido>[] = []
    stubApp((ruta) => {
      if (!ruta.includes("cursor=")) return primeraPagina()
      const otra = diferido()
      pendientes.push(otra)
      return otra.promesa
    })
    await renderEn("/admin/clases")
    const boton = await screen.findByRole("button", { name: "Cargar más clases" })
    fireEvent.click(boton)
    fireEvent.click(boton)
    await esperar(30)
    await act(async () => {
      for (const p of pendientes) {
        p.resolver(
          respuestaJson(200, { clases: [claseAdmin(51)], total: 51, siguienteCursor: null }),
        )
      }
      await Promise.all(pendientes.map((p) => p.promesa))
    })
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Cargar más clases" })).toBeNull(),
    )
    expect(screen.getAllByRole("link", { name: /^Abrir / })).toHaveLength(51)
    expect(screen.getAllByRole("link", { name: "Abrir Clase 51" })).toHaveLength(1)
  })

  it("si la última página llega vacía, el foco va al encabezado «Clases», nunca a <body>", async () => {
    stubApp((ruta) =>
      ruta.includes("cursor=")
        ? respuestaJson(200, { clases: [], total: 50, siguienteCursor: null })
        : primeraPagina(),
    )
    await renderEn("/admin/clases")
    const boton = await screen.findByRole("button", { name: "Cargar más clases" })
    act(() => boton.focus())
    fireEvent.click(boton)
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Cargar más clases" })).toBeNull(),
    )
    await esperar(50)
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 1, name: "Clases" }))
  })

  it("el 400 del cursor dice qué pasó y qué hacer, sin «no es válido»; el foco no cae en <body>", async () => {
    stubApp((ruta) =>
      ruta.includes("cursor=")
        ? errorJson(400, "VALIDACION", "cursor: no es válido")
        : primeraPagina(),
    )
    await renderEn("/admin/clases")
    const boton = await screen.findByRole("button", { name: "Cargar más clases" })
    act(() => boton.focus())
    fireEvent.click(boton)
    const alerta = await screen.findByRole("alert")
    expect(alerta).toHaveTextContent(
      "La lista cambió mientras la veías. Vuelve a abrirla para verla completa.",
    )
    expect(alerta.textContent ?? "").not.toMatch(/no es válido|cursor/)
    await esperar(50)
    expect(document.activeElement).not.toBe(document.body)
  })
})

describe("ataque CLASES-02c r1: errores de la lista del admin", () => {
  it.each([
    ["500", () => errorJson(500, "ERROR_INTERNO", "mensaje del servidor")],
    [
      "503 SERVICIO_OCUPADO",
      () =>
        errorJson(
          503,
          "SERVICIO_OCUPADO",
          "El servicio está ocupado en este momento. Inténtalo de nuevo en unos segundos.",
        ),
    ],
    ["sin conexión", () => Promise.reject(new TypeError("Failed to fetch"))],
    ["respuesta con otra forma", () => respuestaJson(200, { clases: "no", total: 1 })],
  ] as const)("%s: un error en español y sin tabla ni vacío", async (_caso, respuesta) => {
    stubApp(() => respuesta() as Response)
    await renderEn("/admin/clases")
    const alerta = await screen.findByRole("alert")
    expect(alerta.textContent ?? "").toMatch(/[áéíóúñ]|Inténtalo|conexión/)
    expect(alerta.textContent ?? "").not.toMatch(/mensaje del servidor|Failed to fetch|undefined/)
    expect(screen.queryByRole("table")).toBeNull()
    expect(screen.queryByText("Aún no hay clases")).toBeNull()
    expect(screen.getAllByRole("link", { name: "Crear clase" })).toHaveLength(1)
  })
})

describe("ataque CLASES-02c r1: nombres hostiles en la tabla y en el encabezado", () => {
  const html = '<img src="x" onerror="alert(1)">'
  const largo = "W".repeat(120)

  it("la tabla pinta como texto el HTML de la clase y de los maestros, y corta los nombres sin espacios", async () => {
    stubApp(() =>
      respuestaJson(200, {
        clases: [
          claseAdmin(1, {
            nombre: html,
            maestros: [
              { id: MAESTRO.id, nombre: "<script>alert(2)</script>" },
              { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d10", nombre: largo },
            ],
          }),
          claseAdmin(2, { nombre: largo }),
        ],
        total: 2,
        siguienteCursor: null,
      }),
    )
    await renderEn("/admin/clases")
    const tabla = await screen.findByRole("table")
    // Cada nombre de clase aparece en su celda y en el texto sr-only de «Abrir».
    const fueraDeEnlaces = (nodos: HTMLElement[]) => nodos.filter((n) => n.closest("a") === null)
    expect(fueraDeEnlaces(within(tabla).getAllByText(html))).toHaveLength(1)
    expect(within(tabla).getByText(`<script>alert(2)</script>, ${largo}`)).toBeInTheDocument()
    expect(tabla.querySelectorAll("img, script")).toHaveLength(0)
    expect(screen.getByRole("link", { name: `Abrir ${html}` })).toHaveAttribute(
      "href",
      `/admin/clases/${idClase(1)}`,
    )
    const celdasLargas = fueraDeEnlaces(within(tabla).getAllByText(largo))
    expect(celdasLargas).toHaveLength(1)
    for (const celda of celdasLargas) {
      expect(
        celda.className,
        "una celda con un nombre de 120 letras sin espacios no se corta",
      ).toMatch(REGLA_DE_CORTE)
    }
  })

  it("el encabezado de la clase del admin pinta como texto el HTML de la clase y de sus dos maestros", async () => {
    stubApp(
      () => respuestaJson(200, { clases: [], total: 0, siguienteCursor: null }),
      (ruta) => {
        if (ruta === `/api/clases/${CLASE_ID}`) {
          return respuestaJson(200, {
            clase: {
              id: CLASE_ID,
              nombre: html,
              descripcion: "<b>negrita</b>",
              maestro: { id: MAESTRO.id, nombre: "<i>Uno</i>" },
              maestros: [
                { id: MAESTRO.id, nombre: "<i>Uno</i>" },
                { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d10", nombre: "<u>Dos</u>" },
              ],
            },
          })
        }
        if (ruta === `/api/clases/${CLASE_ID}/codigo`)
          return respuestaJson(200, { codigo: "ABCDEFG" })
        if (ruta.startsWith(`/api/clases/${CLASE_ID}/publicaciones`)) {
          return respuestaJson(200, { publicaciones: [], siguienteCursor: null })
        }
        return undefined
      },
    )
    await renderEn(`/admin/clases/${CLASE_ID}`)
    expect(await screen.findByRole("heading", { level: 1, name: html })).toBeInTheDocument()
    expect(screen.getByText("Maestros: <i>Uno</i> y <u>Dos</u>")).toBeInTheDocument()
    expect(screen.getByText("<b>negrita</b>")).toBeInTheDocument()
    expect(document.querySelectorAll("main img, main script, main b, main i, main u")).toHaveLength(
      0,
    )
  })
})

describe("ataque CLASES-02c r1: cambiar de sección en la clase del admin", () => {
  it("Muro → Alumnos → Maestros → Editar clase: aria-current sigue a la sección, el foco queda en el enlace pulsado y en «Editar clase» ninguna sección está activa", async () => {
    stubApp(
      () => respuestaJson(200, { clases: [], total: 0, siguienteCursor: null }),
      (ruta) => {
        if (ruta === `/api/clases/${CLASE_ID}`) {
          return respuestaJson(200, {
            clase: {
              id: CLASE_ID,
              nombre: "Álgebra I",
              descripcion: null,
              maestro: MAESTRO,
              maestros: [MAESTRO],
            },
          })
        }
        if (ruta === `/api/clases/${CLASE_ID}/codigo`)
          return respuestaJson(200, { codigo: "ABCDEFG" })
        if (ruta.startsWith(`/api/clases/${CLASE_ID}/publicaciones`)) {
          return respuestaJson(200, { publicaciones: [], siguienteCursor: null })
        }
        if (ruta.startsWith(`/api/clases/${CLASE_ID}/alumnos`)) {
          return respuestaJson(200, { alumnos: [], total: 0, siguienteCursor: null })
        }
        return undefined
      },
    )
    const router = await renderEn(`/admin/clases/${CLASE_ID}`)
    const secciones = await screen.findByRole("list", { name: "Secciones de la clase" })
    const actual = () =>
      within(secciones)
        .getAllByRole("link")
        .filter((enlace) => enlace.getAttribute("aria-current") === "page")
        .map((enlace) => enlace.textContent)
    expect(
      within(secciones)
        .getAllByRole("link")
        .map((e) => e.textContent),
    ).toEqual(["Muro", "Alumnos", "Maestros"])
    expect(actual()).toEqual(["Muro"])
    for (const [nombre, ruta, encabezado] of [
      ["Alumnos", `/admin/clases/${CLASE_ID}/alumnos`, "Alumnos"],
      ["Maestros", `/admin/clases/${CLASE_ID}/maestros`, "Maestros de la clase"],
    ] as const) {
      const enlace = within(secciones).getByRole("link", { name: nombre })
      act(() => enlace.focus())
      fireEvent.click(enlace)
      await waitFor(() => expect(router.state.location.pathname).toBe(ruta))
      await screen.findByRole("heading", { name: encabezado })
      expect(actual()).toEqual([nombre])
      expect(document.activeElement).toBe(within(secciones).getByRole("link", { name: nombre }))
    }
    fireEvent.click(screen.getByRole("link", { name: "Editar clase" }))
    await screen.findByLabelText("Nombre de la clase")
    expect(actual()).toEqual([])
    expect(screen.getByRole("link", { name: "Volver a la lista de clases" })).toHaveAttribute(
      "href",
      "/admin/clases",
    )
  })
})

describe("ataque CLASES-02c r1: las pantallas del admin cuelgan del contexto opaco y denso", () => {
  const extra = (ruta: string): Response | undefined => {
    if (ruta === `/api/clases/${CLASE_ID}`) {
      return respuestaJson(200, {
        clase: {
          id: CLASE_ID,
          nombre: "Álgebra I",
          descripcion: "Curso",
          maestro: MAESTRO,
          maestros: [MAESTRO],
        },
      })
    }
    if (ruta === `/api/clases/${CLASE_ID}/codigo`) return respuestaJson(200, { codigo: "ABCDEFG" })
    if (ruta.startsWith(`/api/clases/${CLASE_ID}/publicaciones`)) {
      return respuestaJson(200, { publicaciones: [], siguienteCursor: null })
    }
    if (ruta.startsWith(`/api/clases/${CLASE_ID}/alumnos`)) {
      return respuestaJson(200, { alumnos: [], total: 0, siguienteCursor: null })
    }
    return undefined
  }

  it.each([
    ["/admin/clases", "Clases"],
    ["/admin/clases/nueva", "Crear clase"],
    [`/admin/clases/${CLASE_ID}`, "Álgebra I"],
    [`/admin/clases/${CLASE_ID}/alumnos`, "Alumnos"],
    [`/admin/clases/${CLASE_ID}/maestros`, "Maestros de la clase"],
    [`/admin/clases/${CLASE_ID}/editar`, "Editar clase"],
  ])(
    "%s: cada botón, enlace, campo y encabezado está en un único contexto opaco y denso",
    async (ruta, encabezado) => {
      stubApp(() => primeraPagina(), extra)
      await renderEn(ruta)
      await screen.findByRole("heading", { name: encabezado })
      await esperar(60)
      const controles = [
        ...screen.getAllByRole("button"),
        ...screen.getAllByRole("link"),
        ...screen.getAllByRole("heading"),
        ...Array.from(document.querySelectorAll<HTMLElement>("input, textarea")),
      ]
      expect(controles.length).toBeGreaterThan(4)
      for (const control of controles) {
        const nombre = control.textContent || control.getAttribute("id") || control.tagName
        expect(
          control.closest('[data-material="opaco"]'),
          `«${nombre}» fuera del contexto opaco`,
        ).not.toBeNull()
        expect(
          control.closest('[data-densidad="densa"]'),
          `«${nombre}» fuera de la densidad`,
        ).not.toBeNull()
      }
      expect(document.querySelectorAll("[data-material], [data-densidad]")).toHaveLength(1)
    },
  )
})
