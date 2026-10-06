import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Tester, CLASES-02c, ronda 1. Con el router de la aplicación: las dos rutas retiradas del maestro
// (/maestro/clases/nueva y /maestro/clases/:claseId/editar) con sus variantes de escritura, para
// los tres roles; las rutas del admin abiertas por otro rol; "Clases" activo en todas sus subrutas
// y "Cuentas"/"Maestros" exactos; y que el maestro no tenga "Crear clase" ni "Editar clase" en
// ningún lugar. Se localiza por rol, nombre accesible y texto (nunca por clases de estilo).

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

type Rol = "estudiante" | "maestro" | "admin"

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const me = (rol: Rol) => ({
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  email: "ana@ejemplo.mx",
  rol,
  debeCambiarContrasena: false,
  accesoRestringido: false,
})

const responder = (ruta: string, rol: Rol, conClases: boolean): Response => {
  const vacia = { clases: [], total: 0, siguienteCursor: null }
  if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
  if (ruta === "/api/me") return respuestaJson(200, me(rol))
  if (ruta.startsWith("/api/clases/inscritas")) {
    const clases = conClases
      ? [{ id: CLASE_ID, nombre: "Álgebra I", maestro: MAESTRO, maestros: [MAESTRO] }]
      : []
    return respuestaJson(200, { ...vacia, clases, total: clases.length })
  }
  if (ruta.startsWith("/api/clases/impartidas")) {
    const clases = conClases ? [{ id: CLASE_ID, nombre: "Álgebra I", alumnos: 3 }] : []
    return respuestaJson(200, { ...vacia, clases, total: clases.length })
  }
  if (ruta === "/api/admin/clases" || ruta.startsWith("/api/admin/clases?")) {
    return respuestaJson(200, {
      clases: [
        {
          id: CLASE_ID,
          nombre: "Álgebra I",
          maestros: [MAESTRO],
          alumnos: 3,
          creadoEn: "2026-10-01T15:00:00.000Z",
        },
      ],
      total: 1,
      siguienteCursor: null,
    })
  }
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
  if (ruta === `/api/clases/${CLASE_ID}/codigo`) return respuestaJson(200, { codigo: "ABCDEFG" })
  if (ruta.startsWith(`/api/clases/${CLASE_ID}/publicaciones`)) {
    return respuestaJson(200, { publicaciones: [], siguienteCursor: null })
  }
  if (ruta.startsWith(`/api/clases/${CLASE_ID}/alumnos`)) {
    return respuestaJson(200, { alumnos: [], total: 0, siguienteCursor: null })
  }
  return respuestaJson(403, { error: { codigo: "SIN_ACCESO_A_LA_CLASE", mensaje: "No." } })
}

const stubFetch = (rol: Rol, conClases = true) => {
  const fetchMock = vi.fn<typeof fetch>((entrada) =>
    Promise.resolve(responder(String(entrada), rol, conClases)),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const renderEn = async (ruta: string) => {
  const { rutas } = await import("./router")
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

const esperarUnMomento = () => act(() => new Promise((resolver) => setTimeout(resolver, 60)))

const pedidas = (fetchMock: ReturnType<typeof stubFetch>) =>
  fetchMock.mock.calls.map(([entrada]) => String(entrada))

const nav = () => screen.getByRole("navigation", { name: "Navegación principal" })

const activos = () =>
  within(nav())
    .getAllByRole("link")
    .filter((enlace) => enlace.getAttribute("aria-current") === "page")
    .map((enlace) => enlace.textContent)

beforeAll(async () => {
  await import("./router")
}, 60_000)

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const VARIANTES_NUEVA = [
  "/maestro/clases/nueva",
  "/maestro/clases/nueva/",
  "/maestro/clases/NUEVA",
  "/MAESTRO/clases/nueva",
  "/maestro/clases/nueva?origen=inicio",
  "/maestro/clases/nueva#crear",
]

const VARIANTES_EDITAR = [
  `/maestro/clases/${CLASE_ID}/editar`,
  `/maestro/clases/${CLASE_ID}/editar/`,
  `/maestro/clases/${CLASE_ID}/EDITAR`,
  `/maestro/clases/${CLASE_ID}/editar?x=1`,
  `/maestro/clases/${CLASE_ID}/editar#datos`,
]

// "nueva" cuelga de RequireRol del maestro: el maestro llega a la redirección a /login y los demás
// roles vuelven a su inicio. "…/editar" ya no existe y cae en el `*` (R-07) para todos.
const FINAL_DE_NUEVA: Record<Rol, string> = {
  estudiante: "/estudiante",
  maestro: "/login",
  admin: "/admin",
}

const ROLES = ["maestro", "estudiante", "admin"] as const

describe("ataque CLASES-02c r1: las rutas retiradas del maestro, con sus variantes", () => {
  const casos: [Rol, string, string][] = [
    ...ROLES.flatMap((rol) =>
      VARIANTES_NUEVA.map((ruta): [Rol, string, string] => [rol, ruta, FINAL_DE_NUEVA[rol]]),
    ),
    ...ROLES.flatMap((rol) =>
      VARIANTES_EDITAR.map((ruta): [Rol, string, string] => [rol, ruta, "/login"]),
    ),
  ]

  it.each(casos)(
    "%s en %s termina en %s sin pedir la clase, /api/clases/nueva ni nada del admin, y sin formulario de clase",
    async (rol, ruta, final) => {
      const fetchMock = stubFetch(rol)
      const router = await renderEn(ruta)

      await waitFor(() => expect(router.state.location.pathname).toBe(final))
      await esperarUnMomento()
      const lista = pedidas(fetchMock)
      expect(lista.filter((r) => /\/api\/clases\/nueva/i.test(r))).toEqual([])
      expect(lista.filter((r) => r.includes(CLASE_ID))).toEqual([])
      expect(lista.filter((r) => r.startsWith("/api/admin/"))).toEqual([])
      expect(screen.queryByLabelText("Nombre de la clase")).toBeNull()
      expect(screen.queryByRole("button", { name: /Crear clase|Guardar cambios/ })).toBeNull()
    },
  )
})

describe("ataque CLASES-02c r1: las rutas del admin abiertas por otro rol", () => {
  const RUTAS_ADMIN = [
    "/admin/clases",
    "/admin/clases/nueva",
    `/admin/clases/${CLASE_ID}`,
    `/admin/clases/${CLASE_ID}/alumnos`,
    `/admin/clases/${CLASE_ID}/maestros`,
    `/admin/clases/${CLASE_ID}/editar`,
    "/ADMIN/Clases/NUEVA",
  ]
  const casos = (["maestro", "estudiante"] as const).flatMap((rol) =>
    RUTAS_ADMIN.map((ruta): [Rol, string] => [rol, ruta]),
  )

  it.each(casos)(
    "un %s en %s vuelve a su inicio sin pedir nada del admin ni de la clase",
    async (rol, ruta) => {
      const fetchMock = stubFetch(rol)
      const router = await renderEn(ruta)

      await waitFor(() => expect(router.state.location.pathname).toBe(`/${rol}`))
      await esperarUnMomento()
      const lista = pedidas(fetchMock)
      expect(lista.filter((r) => r.startsWith("/api/admin/"))).toEqual([])
      expect(lista.filter((r) => r.includes(CLASE_ID))).toEqual([])
      expect(screen.queryByLabelText("Buscar maestro por nombre")).toBeNull()
    },
  )
})

describe("ataque CLASES-02c r1: «Clases» activo en sus subrutas; «Cuentas» y «Maestros» exactos", () => {
  it.each([
    // "/admin/" (con barra final) no se incluye: "Cuentas" no queda activo ahí desde antes de 02c
    // (el `end` fijo de BarraNavegacion hacía lo mismo); queda como observación del reporte.
    ["/admin", ["Cuentas"]],
    ["/admin/maestros", ["Maestros"]],
    ["/admin/clases", ["Clases"]],
    ["/admin/clases/", ["Clases"]],
    ["/admin/clases/nueva", ["Clases"]],
    [`/admin/clases/${CLASE_ID}`, ["Clases"]],
    [`/admin/clases/${CLASE_ID}/alumnos`, ["Clases"]],
    [`/admin/clases/${CLASE_ID}/maestros`, ["Clases"]],
    [`/admin/clases/${CLASE_ID}/editar`, ["Clases"]],
  ])("en %s solo queda activo %j", async (ruta, esperados) => {
    stubFetch("admin")
    await renderEn(ruta)
    await screen.findByRole("navigation", { name: "Navegación principal" })
    await waitFor(() => expect(activos()).toEqual(esperados))
    expect(
      within(nav())
        .getAllByRole("link")
        .map((enlace) => [enlace.textContent, enlace.getAttribute("href")]),
    ).toEqual([
      ["Cuentas", "/admin"],
      ["Maestros", "/admin/maestros"],
      ["Clases", "/admin/clases"],
    ])
  })

  // CLASES-02 ronda 0 de 02d (C-16, §D-2D1): la nav del estudiante y del maestro suma la lista de
  // sus clases, y el enlace de la clase abierta (NavLink sin `end`) queda activo en su muro y en sus
  // subpáginas, nombrado con el nombre completo de la clase. Sigue protegiendo que «Inicio» no quede
  // activo dentro de una clase; ahora el único activo de la nav es el de esa clase.
  it.each([
    ["maestro", `/maestro/clases/${CLASE_ID}`],
    ["maestro", `/maestro/clases/${CLASE_ID}/alumnos`],
    ["estudiante", `/estudiante/clases/${CLASE_ID}`],
  ] as const)(
    "dentro de una clase, «Inicio» del %s no queda activo y solo lo está la clase abierta (%s)",
    async (rol, ruta) => {
      stubFetch(rol)
      await renderEn(ruta)
      await screen.findByRole("heading", { level: 1, name: "Álgebra I" })
      const enNav = within(nav())
      await waitFor(() => expect(enNav.getAllByRole("link", { current: "page" })).toHaveLength(1))
      expect(enNav.getByRole("link", { name: "Álgebra I", current: "page" })).toHaveAttribute(
        "href",
        `/${rol}/clases/${CLASE_ID}`,
      )
      expect(enNav.getByRole("link", { name: "Inicio" })).not.toHaveAttribute("aria-current")
    },
  )
})

describe("ataque CLASES-02c r1: el maestro no tiene «Crear clase» ni «Editar clase» en ningún lugar", () => {
  const sinCrearNiEditar = () => {
    expect(screen.queryAllByRole("link", { name: /crear|editar|nueva clase/i })).toEqual([])
    expect(screen.queryAllByRole("button", { name: /crear|editar|nueva clase/i })).toEqual([])
    const hrefs = Array.from(document.querySelectorAll("a")).map(
      (a) => a.getAttribute("href") ?? "",
    )
    expect(hrefs.filter((h) => /\/clases\/nueva|\/editar/i.test(h))).toEqual([])
    expect(document.body.textContent ?? "").not.toMatch(/Crea tu primera clase|Nueva clase/)
  }

  it("inicio sin clases: sin acción y con la frase de la administración", async () => {
    stubFetch("maestro", false)
    await renderEn("/maestro")
    expect(await screen.findByText("La administración te asigna tus clases.")).toBeInTheDocument()
    sinCrearNiEditar()
  })

  // CLASES-02 ronda 0 de 02d (C-16, §D-2D1): la clase también tiene su enlace en la nav (mismo
  // nombre accesible que su tarjeta), así que la tarjeta se busca dentro de <main> y se espera a que
  // la lista de la barra esté pintada antes de revisar. Sigue protegiendo lo mismo, ahora también
  // sobre los enlaces de la barra.
  it("inicio con clases, la tarjeta, el encabezado de la clase y sus alumnos", async () => {
    stubFetch("maestro")
    const router = await renderEn("/maestro")
    await within(await screen.findByRole("main")).findByRole("link", { name: "Álgebra I" })
    await within(nav()).findByRole("link", { name: "Álgebra I" })
    sinCrearNiEditar()
    await act(() => router.navigate(`/maestro/clases/${CLASE_ID}`))
    await screen.findByText("ABCDEFG")
    sinCrearNiEditar()
    await act(() => router.navigate(`/maestro/clases/${CLASE_ID}/alumnos`))
    await screen.findByRole("heading", { name: "Alumnos" })
    sinCrearNiEditar()
  })
})
