import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Tester, CLASES-02d, ronda 1. La lista de clases de la barra lateral con el router de la
// aplicación (RequireSesion, RequireRol y ContenedorRol): los estados de «Reintentar» con el foco,
// 0, 1, 15 y 101 clases, nombres hostiles, aria-current en subpáginas y con la ruta en mayúsculas,
// el admin sin lista, cuántas veces se pide al navegar, el refresco al unirse, el cambio de cuenta
// y las cuentas que no llegan al marco. Se localiza por rol, nombre accesible y texto.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

type Rol = "estudiante" | "maestro" | "admin"

interface Clase {
  id: string
  nombre: string
}

interface Cuenta {
  id: string
  nombre: string
  rol: Rol
  correo: string
  accesoRestringido?: boolean
  clases: Clase[]
}

const idDe = (n: number) => `2a2b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(estado === 204 ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: estado === 204 ? {} : { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string) =>
  respuestaJson(estado, { error: { codigo, mensaje: "mensaje del servidor" } })

interface Diferido {
  promesa: Promise<Response>
  resolver: (respuesta: Response) => void
}

const diferido = (): Diferido => {
  let resolver: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver }
}

const esBarra = (ruta: string) =>
  /^\/api\/clases\/(inscritas|impartidas)\?/.test(ruta) && ruta.includes("limite=100")

// Servidor en memoria. `barra` es una cola: cada petición de la barra toma la siguiente respuesta
// (si la cola se vacía, responde la lista de la cuenta actual).
const crearServidor = (cuentas: Record<string, Cuenta>, inicial: string | null) => {
  const estado = {
    actual: inicial,
    barra: [] as (() => Response | Promise<Response>)[],
    unirse: null as Clase | null,
  }
  const cuenta = () => (estado.actual === null ? undefined : cuentas[estado.actual])
  const lista = (clases: Clase[], conMaestros: boolean, siguienteCursor: string | null = null) =>
    respuestaJson(200, {
      clases: clases.map((c) =>
        conMaestros ? { ...c, maestro: MAESTRO, maestros: [MAESTRO] } : { ...c, alumnos: 3 },
      ),
      total: clases.length,
      siguienteCursor,
    })
  const listaDe = (c: Cuenta, ruta: string): Response => {
    const limite = Number(new URL(ruta, "http://x").searchParams.get("limite") ?? "20")
    const pagina = c.clases.slice(0, limite)
    const cursor = c.clases.length > limite ? (pagina.at(-1)?.id ?? null) : null
    return lista(pagina, c.rol === "estudiante", cursor)
  }
  const fetchMock = vi.fn<typeof fetch>(async (entrada, init) => {
    const ruta = String(entrada)
    const metodo = init?.method ?? "GET"
    const c = cuenta()
    if (ruta === "/api/auth/refrescar") {
      return c ? respuestaJson(200, { tokenAcceso: "t" }) : errorJson(401, "SESION_INVALIDA")
    }
    if (ruta === "/api/auth/logout") {
      estado.actual = null
      return respuestaJson(204, undefined)
    }
    if (ruta === "/api/auth/login" && metodo === "POST") {
      const cuerpo = JSON.parse(String(init?.body)) as { email: string }
      const clave = Object.keys(cuentas).find((k) => cuentas[k]?.correo === cuerpo.email)
      if (clave === undefined) return errorJson(401, "CREDENCIALES_INVALIDAS")
      estado.actual = clave
      return respuestaJson(200, { tokenAcceso: "t" })
    }
    if (!c) return errorJson(401, "NO_AUTENTICADO")
    if (ruta === "/api/me") {
      return respuestaJson(200, {
        id: c.id,
        nombre: c.nombre,
        email: c.correo,
        rol: c.rol,
        debeCambiarContrasena: false,
        accesoRestringido: c.accesoRestringido ?? false,
      })
    }
    if (esBarra(ruta)) {
      const siguiente = estado.barra.shift()
      if (siguiente) return siguiente()
      return listaDe(c, ruta)
    }
    if (ruta.startsWith("/api/clases/inscritas") || ruta.startsWith("/api/clases/impartidas")) {
      return listaDe(c, ruta)
    }
    if (ruta === "/api/clases/unirse" && metodo === "POST" && estado.unirse) {
      c.clases = [...c.clases, estado.unirse]
      return respuestaJson(200, { clase: estado.unirse, yaEstabas: false })
    }
    const deClase = /^\/api\/clases\/([0-9a-fA-F-]{36})(\/[^?]*)?/.exec(ruta)
    if (deClase) {
      const clase = c.clases.find((x) => x.id.toLowerCase() === deClase[1]?.toLowerCase())
      if (!clase) return errorJson(403, "SIN_ACCESO_A_LA_CLASE")
      const resto = deClase[2] ?? ""
      if (resto === "") {
        return respuestaJson(200, {
          clase: { ...clase, descripcion: null, maestro: MAESTRO, maestros: [MAESTRO] },
        })
      }
      if (resto === "/codigo") return respuestaJson(200, { codigo: "ABCDEFG" })
      if (resto === "/publicaciones") {
        return respuestaJson(200, { publicaciones: [], siguienteCursor: null })
      }
      if (resto === "/personas") {
        const maestro = { ...MAESTRO, email: "luis@ejemplo.mx" }
        return respuestaJson(200, {
          maestro,
          maestros: [maestro],
          alumnos: [],
          totalAlumnos: 0,
          siguienteCursor: null,
        })
      }
      if (resto === "/alumnos") {
        return respuestaJson(200, { alumnos: [], total: 0, siguienteCursor: null })
      }
    }
    if (ruta.startsWith("/api/admin/")) {
      return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
    }
    return errorJson(500, "ERROR_INTERNO")
  })
  vi.stubGlobal("fetch", fetchMock)
  const pedidas = () => fetchMock.mock.calls.map(([e]) => String(e))
  return { estado, fetchMock, pedidas, barra: () => pedidas().filter(esBarra) }
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
  return { router, queryClient }
}

const esperar = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)))

const nav = () => screen.getByRole("navigation", { name: "Navegación principal" })
const navMontada = () => screen.findByRole("navigation", { name: "Navegación principal" })
const lista = async () => within(await navMontada()).findByRole("list", { name: "Mis clases" })
const reintentar = async () =>
  within(await navMontada()).findByRole("button", { name: /Reintentar/ })

const estudiante = (clases: Clase[], extra: Partial<Cuenta> = {}): Cuenta => ({
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  rol: "estudiante",
  correo: "ana@ejemplo.mx",
  clases,
  ...extra,
})

const ALGEBRA = { id: idDe(1), nombre: "Álgebra I" }
const HISTORIA = { id: idDe(2), nombre: "Historia" }

beforeAll(async () => {
  await import("./router")
}, 60_000)

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("ataque CLASES-02d r1: «Reintentar» de la barra en sus estados", () => {
  it("primera carga: solo el status «Cargando tus clases»; ni lista ni «Reintentar»", async () => {
    const servidor = crearServidor({ ana: estudiante([ALGEBRA]) }, "ana")
    const pendiente = diferido()
    servidor.estado.barra.push(() => pendiente.promesa)
    await renderEn("/estudiante")
    await screen.findByText("Hola, Ana López")
    expect(within(nav()).getByRole("status")).toHaveTextContent("Cargando tus clases")
    expect(within(nav()).queryByRole("list", { name: "Mis clases" })).toBeNull()
    expect(within(nav()).queryByRole("button", { name: /Reintentar/ })).toBeNull()
    pendiente.resolver(errorJson(500, "ERROR_INTERNO"))
    expect(await reintentar()).toBeInTheDocument()
  })

  it("error → reintento en vuelo (enEspera, foco conservado, sin otra petición) → reintento que falla → reintento que funciona: el foco nunca cae en <body>", async () => {
    const servidor = crearServidor({ ana: estudiante([ALGEBRA, HISTORIA]) }, "ana")
    servidor.estado.barra.push(() => errorJson(500, "ERROR_INTERNO"))
    await renderEn("/estudiante")
    const boton = await reintentar()
    expect(boton).toHaveAccessibleName(/^No pudimos cargar tus clases\.\s+Reintentar$/)
    act(() => boton.focus())

    // Reintento en vuelo.
    const enVuelo = diferido()
    servidor.estado.barra.push(() => enVuelo.promesa)
    fireEvent.click(boton)
    await waitFor(() => expect(boton).toHaveAttribute("aria-busy", "true"))
    expect(boton).not.toHaveAttribute("disabled")
    expect(boton.isConnected, "«Reintentar» se desmontó durante el reintento").toBe(true)
    expect(document.activeElement).toBe(boton)
    fireEvent.click(boton)
    await esperar(30)
    expect(servidor.barra(), "un clic en espera pidió otra vez").toHaveLength(2)

    // El reintento falla: el mismo botón, sin espera y con el foco.
    enVuelo.resolver(errorJson(500, "ERROR_INTERNO"))
    await waitFor(() => expect(boton).not.toHaveAttribute("aria-busy", "true"))
    expect(boton.isConnected).toBe(true)
    expect(document.activeElement).toBe(boton)
    expect(within(nav()).queryByRole("list", { name: "Mis clases" })).toBeNull()

    // El reintento funciona: la lista aparece y el foco no se pierde.
    fireEvent.click(boton)
    const ul = await lista()
    expect(within(ul).getAllByRole("link")).toHaveLength(2)
    await esperar(30)
    expect(
      document.activeElement,
      "al llegar la lista, el foco de «Reintentar» cayó en <body>",
    ).not.toBe(document.body)
    expect(nav().contains(document.activeElement)).toBe(true)
  })

  it("reintento que funciona con 0 clases: no queda nada en la barra y el foco no cae en <body>", async () => {
    const servidor = crearServidor({ ana: estudiante([]) }, "ana")
    servidor.estado.barra.push(() => errorJson(500, "ERROR_INTERNO"))
    await renderEn("/estudiante")
    const boton = await reintentar()
    act(() => boton.focus())
    fireEvent.click(boton)
    await waitFor(() => expect(boton.isConnected).toBe(false))
    await esperar(30)
    expect(within(nav()).queryByRole("list", { name: "Mis clases" })).toBeNull()
    expect(document.activeElement, "sin clases, el foco de «Reintentar» cayó en <body>").not.toBe(
      document.body,
    )
  })

  it("una recarga con datos en vuelo (alta o baja del maestro, que invalida impartidas) conserva la lista, sin «Cargando» ni «Reintentar»", async () => {
    const servidor = crearServidor({ luis: { ...estudiante([ALGEBRA]), rol: "maestro" } }, "luis")
    const { queryClient } = await renderEn("/maestro")
    const ul = await lista()
    const enVuelo = diferido()
    servidor.estado.barra.push(() => enVuelo.promesa)
    act(() => {
      void queryClient.invalidateQueries({ queryKey: ["clases", "impartidas"] })
    })
    await waitFor(() => expect(servidor.barra()).toHaveLength(2))
    expect(ul.isConnected).toBe(true)
    expect(within(ul).getByRole("link", { name: "Álgebra I" })).toBeInTheDocument()
    expect(within(nav()).queryByRole("status")).toBeNull()
    expect(within(nav()).queryByRole("button", { name: /Reintentar/ })).toBeNull()
    enVuelo.resolver(
      respuestaJson(200, {
        clases: [
          { ...ALGEBRA, alumnos: 4 },
          { ...HISTORIA, alumnos: 1 },
        ],
        total: 2,
        siguienteCursor: null,
      }),
    )
    expect(await within(ul).findByRole("link", { name: "Historia" })).toBeInTheDocument()
  })

  it("una recarga fallida con datos conserva la lista, sin «Reintentar» ni «Cargando»", async () => {
    const servidor = crearServidor({ ana: estudiante([ALGEBRA]) }, "ana")
    const { queryClient } = await renderEn("/estudiante")
    const ul = await lista()
    servidor.estado.barra.push(() => errorJson(500, "ERROR_INTERNO"))
    await act(() => queryClient.invalidateQueries({ queryKey: ["clases", "inscritas", "barra"] }))
    await esperar(30)
    expect(servidor.barra()).toHaveLength(2)
    expect(ul.isConnected).toBe(true)
    expect(within(ul).getByRole("link", { name: "Álgebra I" })).toBeInTheDocument()
    expect(within(nav()).queryByRole("button", { name: /Reintentar/ })).toBeNull()
    expect(within(nav()).queryByRole("status")).toBeNull()
  })
})

describe("ataque CLASES-02d r1: cuántas clases y cuáles", () => {
  it("con 0 clases: ni título ni lista; la nav solo tiene «Inicio»; una sola petición", async () => {
    const servidor = crearServidor({ ana: estudiante([]) }, "ana")
    await renderEn("/estudiante")
    await screen.findByText("Hola, Ana López")
    await waitFor(() => expect(servidor.barra()).toHaveLength(1))
    await esperar(30)
    expect(within(nav()).queryByRole("list", { name: "Mis clases" })).toBeNull()
    expect(within(nav()).queryByRole("status")).toBeNull()
    expect(nav()).not.toHaveTextContent("Mis clases")
    expect(
      within(nav())
        .getAllByRole("link")
        .map((a) => a.textContent),
    ).toEqual(["Inicio"])
  })

  it.each([1, 15])(
    "con %i clases: un enlace por clase, en el orden de la respuesta, enfocable, con su title y su ruta",
    async (n) => {
      const clases = Array.from({ length: n }, (_, i) => ({
        id: idDe(i + 1),
        nombre: `Clase ${String(i + 1)}`,
      }))
      const servidor = crearServidor({ ana: estudiante(clases) }, "ana")
      await renderEn("/estudiante")
      await screen.findByText("Hola, Ana López")
      await waitFor(() => expect(servidor.barra()).toHaveLength(1))
      await esperar(30)
      const enlaces = within(await lista()).getAllByRole("link")
      expect(enlaces.map((a) => a.getAttribute("title"))).toEqual(clases.map((c) => c.nombre))
      expect(enlaces.map((a) => a.getAttribute("href"))).toEqual(
        clases.map((c) => `/estudiante/clases/${c.id}`),
      )
      for (const [i, enlace] of enlaces.entries()) {
        expect(enlace).toHaveAccessibleName(clases[i]?.nombre ?? "")
        expect(enlace).not.toHaveAttribute("aria-current")
        act(() => enlace.focus())
        expect(document.activeElement).toBe(enlace)
      }
      expect(servidor.barra()).toEqual(["/api/clases/inscritas?limite=100"])
    },
  )

  it("con 101 clases pide una sola página de 100 (sin cursor) y termina en «Ver todas» hacia el inicio", async () => {
    const clases = Array.from({ length: 101 }, (_, i) => ({
      id: idDe(i + 1),
      nombre: `Clase ${String(i + 1)}`,
    }))
    const servidor = crearServidor({ ana: estudiante(clases) }, "ana")
    await renderEn("/estudiante")
    const ul = await lista()
    const enlaces = within(ul).getAllByRole("link")
    expect(enlaces).toHaveLength(101)
    expect(enlaces.at(-1)).toHaveAccessibleName("Ver todas")
    expect(enlaces.at(-1)).toHaveAttribute("href", "/estudiante")
    expect(enlaces.at(-2)).toHaveAccessibleName("Clase 100")
    expect(within(ul).queryByRole("link", { name: "Clase 101" })).toBeNull()
    await esperar(50)
    expect(servidor.barra()).toEqual(["/api/clases/inscritas?limite=100"])
  })

  it("nombres hostiles: 120 caracteres sin espacios, emojis, iniciales iguales y HTML: nombre accesible y title completos, sin HTML interpretado", async () => {
    const largo = "W".repeat(120)
    const html = '"><img src=x onerror=alert(1)>'
    const clases = [
      { id: idDe(1), nombre: largo },
      { id: idDe(2), nombre: "👩‍💻 Programación 🚀" },
      { id: idDe(3), nombre: "Derecho Penal I" },
      { id: idDe(4), nombre: "Derecho Penal II" },
      { id: idDe(5), nombre: html },
    ]
    crearServidor({ ana: estudiante(clases) }, "ana")
    await renderEn("/estudiante")
    const ul = await lista()
    for (const clase of clases) {
      const enlace = within(ul).getByRole("link", { name: clase.nombre })
      expect(enlace).toHaveAttribute("title", clase.nombre)
    }
    expect(nav().querySelectorAll("img, script, iframe")).toHaveLength(0)
    const penales = within(ul)
      .getAllByRole("link")
      .filter((a) => (a.getAttribute("title") ?? "").startsWith("Derecho Penal"))
    expect(penales.map((a) => a.getAttribute("href"))).toEqual([
      `/estudiante/clases/${idDe(3)}`,
      `/estudiante/clases/${idDe(4)}`,
    ])
  })
})

describe("ataque CLASES-02d r1: aria-current en subpáginas y con mayúsculas", () => {
  it.each([
    ["estudiante", `/estudiante/clases/${idDe(1)}`],
    ["estudiante", `/estudiante/clases/${idDe(1)}/personas`],
    ["estudiante", `/ESTUDIANTE/clases/${idDe(1)}`],
    ["estudiante", `/Estudiante/Clases/${idDe(1).toUpperCase()}/PERSONAS`],
    ["maestro", `/maestro/clases/${idDe(1)}/alumnos`],
    ["maestro", `/MAESTRO/CLASES/${idDe(1).toUpperCase()}`],
  ] as const)("%s en %s: solo «Álgebra I» activa en la nav", async (rol, ruta) => {
    crearServidor({ x: { ...estudiante([ALGEBRA, HISTORIA]), rol } }, "x")
    await renderEn(ruta)
    const ul = await lista()
    await waitFor(() =>
      expect(within(ul).getByRole("link", { name: "Álgebra I" })).toHaveAttribute(
        "aria-current",
        "page",
      ),
    )
    expect(within(nav()).getAllByRole("link", { current: "page" })).toHaveLength(1)
    expect(within(ul).getByRole("link", { name: "Historia" })).not.toHaveAttribute("aria-current")
  })
})

describe("ataque CLASES-02d r1: quién tiene lista", () => {
  it.each(["/admin", "/admin/clases", `/admin/clases/${idDe(1)}`])(
    "el admin en %s: sin lista de clases y sin pedir inscritas ni impartidas",
    async (ruta) => {
      const servidor = crearServidor(
        { admin: { ...estudiante([ALGEBRA]), nombre: "Administración", rol: "admin" } },
        "admin",
      )
      await renderEn(ruta)
      await screen.findByRole("navigation", { name: "Navegación principal" })
      await esperar(80)
      expect(within(nav()).queryByRole("list", { name: "Mis clases" })).toBeNull()
      expect(within(nav()).queryByRole("button", { name: /Reintentar/ })).toBeNull()
      expect(
        servidor.pedidas().filter((r) => /\/api\/clases\/(inscritas|impartidas)/.test(r)),
      ).toEqual([])
    },
  )

  it("un estudiante restringido no llega al marco ni pide la lista de la barra", async () => {
    const servidor = crearServidor(
      { ana: estudiante([ALGEBRA], { accesoRestringido: true }) },
      "ana",
    )
    const { router } = await renderEn("/estudiante")
    await waitFor(() => expect(router.state.location.pathname).toBe("/acceso-restringido"))
    await esperar(80)
    expect(servidor.barra()).toEqual([])
  })
})

describe("ataque CLASES-02d r1: la barra al navegar, al unirse y al cambiar de cuenta", () => {
  it("inicio → clase (por la tarjeta) → Personas → Muro → otra clase (por la barra) → Inicio: una sola petición de la barra", async () => {
    const servidor = crearServidor({ ana: estudiante([ALGEBRA, HISTORIA]) }, "ana")
    const { router } = await renderEn("/estudiante")
    const ul = await lista()
    const principal = screen.getByRole("main")
    fireEvent.click(await within(principal).findByRole("link", { name: "Álgebra I" }))
    await screen.findByRole("heading", { level: 1, name: "Álgebra I" })
    fireEvent.click(screen.getByRole("link", { name: "Personas" }))
    await screen.findByRole("heading", { name: "Alumnos" })
    fireEvent.click(screen.getByRole("link", { name: "Muro" }))
    await screen.findByRole("heading", { name: "Publicaciones" })
    const historia = within(ul).getByRole("link", { name: "Historia" })
    act(() => historia.focus())
    fireEvent.click(historia)
    await screen.findByRole("heading", { level: 1, name: "Historia" })
    await esperar(50)
    expect(document.activeElement, "el cambio de clase por la barra movió el foco").toBe(historia)
    expect(historia).toHaveAttribute("aria-current", "page")
    fireEvent.click(within(nav()).getByRole("link", { name: "Inicio" }))
    await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"))
    await screen.findByLabelText("Código de la clase")
    await esperar(50)
    expect(servidor.barra()).toHaveLength(1)
  })

  it("al unirse a una clase, la clase nueva aparece en la barra y queda activa", async () => {
    const servidor = crearServidor({ ana: estudiante([ALGEBRA]) }, "ana")
    servidor.estado.unirse = HISTORIA
    await renderEn("/estudiante")
    const ul = await lista()
    expect(within(ul).queryByRole("link", { name: "Historia" })).toBeNull()
    fireEvent.change(screen.getByLabelText("Código de la clase"), {
      target: { value: "ABCDEFG" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Unirme a la clase" }))
    const nueva = await within(ul).findByRole("link", { name: "Historia" })
    await waitFor(() => expect(nueva).toHaveAttribute("aria-current", "page"))
    expect(servidor.barra()).toHaveLength(2)
  })

  it("al salir y entrar con otra cuenta, la barra solo muestra las clases de la cuenta nueva (aunque la petición de la anterior llegue tarde)", async () => {
    const beto: Cuenta = {
      id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d7f",
      nombre: "Beto Ruiz",
      rol: "estudiante",
      correo: "beto@ejemplo.mx",
      clases: [{ id: idDe(9), nombre: "Clase de Beto" }],
    }
    const servidor = crearServidor(
      { ana: estudiante([{ id: idDe(8), nombre: "Clase de Ana" }]), beto },
      "ana",
    )
    const tarde = diferido()
    servidor.estado.barra.push(() => tarde.promesa)
    const { router } = await renderEn("/estudiante")
    await screen.findByText("Hola, Ana López")
    await waitFor(() => expect(servidor.barra()).toHaveLength(1))

    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }))
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    fireEvent.change(await screen.findByLabelText("Correo"), {
      target: { value: "beto@ejemplo.mx" },
    })
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "clave-de-beto" } })
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }))
    await screen.findByText("Hola, Beto Ruiz")
    const ul = await lista()
    expect(within(ul).getByRole("link", { name: "Clase de Beto" })).toBeInTheDocument()

    tarde.resolver(
      respuestaJson(200, {
        clases: [{ id: idDe(8), nombre: "Clase de Ana", maestro: MAESTRO, maestros: [MAESTRO] }],
        total: 1,
        siguienteCursor: null,
      }),
    )
    await esperar(80)
    expect(screen.queryByText("Clase de Ana")).toBeNull()
    expect(
      within(nav())
        .getAllByRole("link")
        .map((a) => a.getAttribute("title") ?? a.textContent),
    ).toEqual(["Inicio", "Clase de Beto"])
  })
})
