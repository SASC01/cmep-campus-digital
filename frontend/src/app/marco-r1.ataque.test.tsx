import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, matchRoutes, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Ataques del Tester (DESIGN-01b-1, ronda 1) contra el marco, el pie en las rutas reales, la
// condición de detención de /acceso-restringido (RN-03, M-01), la composición y el recorte de la
// sombra (plan-01b.md, puntos de ataque 2, 3, 5, 6 y 7). Los elementos se localizan por rol, texto
// o atributos de datos; las clases solo se leen como aserción sobre la estructura de un elemento
// ya localizado, nunca para encontrarlo (tester.md; el plan lo pide así en §D-1 y en el punto 6).

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/login") }))

const TOKEN_ENLACE = "a".repeat(43)

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: cuerpo === undefined ? {} : { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string) =>
  respuestaJson(estado, { error: { codigo, mensaje: "mensaje del servidor" } })

const meDe = (extra: Record<string, unknown>) => ({
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  email: "ana@ejemplo.mx",
  rol: "estudiante",
  debeCambiarContrasena: false,
  accesoRestringido: false,
  ...extra,
})

type Manejador = (ruta: string) => Response | Promise<Response>

const stubFetch = (manejador: Manejador) => {
  const fetchMock = vi.fn<typeof fetch>((entrada) => Promise.resolve(manejador(String(entrada))))
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const salud = () =>
  respuestaJson(200, { estado: "ok", baseDeDatos: "ok", marcaDeTiempo: "2026-09-27T18:00:00.000Z" })

const conMe =
  (me: () => Response): Manejador =>
  (ruta) => {
    if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
    if (ruta === "/api/auth/logout") return respuestaJson(204, undefined)
    if (ruta === "/api/me") return me()
    if (ruta === "/api/salud") return salud()
    return errorJson(500, "ERROR_INTERNO")
  }

const sinSesion: Manejador = (ruta) => {
  if (ruta === "/api/auth/refrescar") return errorJson(401, "SESION_INVALIDA")
  if (ruta === "/api/salud") return salud()
  return errorJson(401, "NO_AUTENTICADO")
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
  return { router, rutas }
}

const esperarUnMomento = () => act(() => new Promise((resolver) => setTimeout(resolver, 40)))

// Vigila el DOM durante todo el flujo: cuántos <footer> hubo a la vez como máximo y si alguna vez
// apareció el encabezado "Acceso restringido".
const vigilar = () => {
  const registro = { maxPies: 0, vioRestringido: false }
  const revisar = () => {
    registro.maxPies = Math.max(registro.maxPies, document.querySelectorAll("footer").length)
    for (const h of document.querySelectorAll("h1, h2, h3")) {
      if (h.textContent === "Acceso restringido") registro.vioRestringido = true
    }
  }
  const observador = new MutationObserver(revisar)
  observador.observe(document.body, { childList: true, subtree: true, characterData: true })
  return {
    registro,
    terminar: () => {
      revisar()
      observador.disconnect()
      return registro
    },
  }
}

const unicoPie = () => {
  const pies = screen.getAllByRole("contentinfo")
  expect(pies, "debe haber exactamente un contentinfo").toHaveLength(1)
  expect(document.querySelectorAll("footer")).toHaveLength(1)
  const [pie] = pies
  if (!pie) throw new Error("sin contentinfo")
  expect(pie).toHaveTextContent(
    `© ${new Date().getFullYear()} Colegio Mexicano de Estudios de Posgrado Jurídicos y Económicos`,
  )
  expect(pie.closest("main, nav, aside, article, section")).toBeNull()
  return pie
}

// Propiedades que convierten a un elemento en bloque contenedor de lo fijo, en su forma de clase
// de Tailwind (con o sin variante).
const CREA_BLOQUE_CONTENEDOR =
  /^-?(vidrio.*|transform.*|translate-.*|scale-.*|rotate-.*|skew-.*|filter|blur.*|backdrop-.*|will-change-.*|contain-.*|perspective-.*|drop-shadow.*|brightness-.*|contrast-.*|grayscale.*|invert.*|sepia.*|saturate-.*|hue-rotate-.*)$/

const clasesSinVariante = (elemento: Element) =>
  (elemento.getAttribute("class") ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((clase) => clase.slice(clase.lastIndexOf(":") + 1))

beforeAll(async () => {
  await import("./router")
}, 60_000)

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// CLASES-a ronda 0 (C-4, §D-R0): /estudiante y /maestro dejan de ser BienvenidaView; "Hola,
// <nombre>" pasa a ser un <span> de texto y el h1 es el titular con dato, así que la identidad del
// estudiante y del maestro se localiza con findByText("Hola, X"); la del admin sigue siendo el
// encabezado "Cuentas". Sigue protegiendo que cada rol llegue a su destino con su identidad a la
// vista, un solo pie y sin ver "Acceso restringido". El doble conMe responde 500 a
// /api/clases/inscritas e /impartidas: el inicio muestra su error y el saludo no depende de eso.
describe("ataque (DESIGN-01b-1 r1): /acceso-restringido con alguien NO restringido (M-01, RN-03)", () => {
  it.each([
    {
      rol: "estudiante",
      nombre: "Ana López",
      destino: "/estudiante",
      identidad: () => screen.findByText("Hola, Ana López"),
    },
    {
      rol: "maestro",
      nombre: "Luis Pérez",
      destino: "/maestro",
      identidad: () => screen.findByText("Hola, Luis Pérez"),
    },
    {
      rol: "admin",
      nombre: "Administración",
      destino: "/admin",
      identidad: () => screen.findByRole("heading", { name: "Cuentas" }),
    },
  ])(
    "un $rol termina en $destino con un solo pie (el del marco) y nunca ve 'Acceso restringido'",
    async ({ rol, nombre, destino, identidad }) => {
      stubFetch(conMe(() => respuestaJson(200, meDe({ rol, nombre }))))
      const vigia = vigilar()
      const { router } = await renderEn("/acceso-restringido")

      await waitFor(() => expect(router.state.location.pathname).toBe(destino))
      expect(await identidad()).toBeInTheDocument()
      await esperarUnMomento()
      const registro = vigia.terminar()

      expect(router.state.location.pathname).toBe(destino)
      expect(registro.vioRestringido, "se pintó 'Acceso restringido' en algún momento").toBe(false)
      expect(registro.maxPies, "hubo más de un pie a la vez").toBeLessThanOrEqual(1)
      expect(screen.queryByRole("heading", { name: "Acceso restringido" })).toBeNull()
      const pie = unicoPie()
      expect(pie.closest(`[data-rol="${rol}"]`), "el pie no es el del marco del rol").not.toBeNull()
      expect(screen.getAllByRole("navigation")).toHaveLength(1)
    },
  )
})

describe("ataque (DESIGN-01b-1 r1): /acceso-restringido con alguien restringido", () => {
  it.each([
    { rol: "estudiante", entrada: "/acceso-restringido" },
    { rol: "estudiante", entrada: "/estudiante" },
    { rol: "estudiante", entrada: "/admin" },
    { rol: "maestro", entrada: "/maestro" },
  ])(
    "un $rol restringido que entra por $entrada se queda en /acceso-restringido, con el pie y sin marco",
    async ({ rol, entrada }) => {
      stubFetch(conMe(() => respuestaJson(200, meDe({ rol, accesoRestringido: true }))))
      const vigia = vigilar()
      const { router } = await renderEn(entrada)

      expect(await screen.findByRole("heading", { name: "Acceso restringido" })).toBeVisible()
      await esperarUnMomento()
      const registro = vigia.terminar()

      expect(router.state.location.pathname).toBe("/acceso-restringido")
      expect(registro.maxPies).toBeLessThanOrEqual(1)
      const pie = unicoPie()
      expect(pie.closest("[data-rol], [data-material], [data-densidad]")).toBeNull()
      expect(screen.queryAllByRole("navigation")).toHaveLength(0)
      expect(screen.queryAllByRole("banner")).toHaveLength(0)
      expect(screen.getAllByRole("button", { name: "Cerrar sesión" })).toHaveLength(1)
      expect(screen.getAllByRole("main")).toHaveLength(1)
      // Sin destinos del marco: ningún enlace hacia un dashboard.
      for (const enlace of screen.queryAllByRole("link")) {
        expect(enlace.getAttribute("href")).not.toMatch(/^\/(estudiante|maestro|admin)/)
      }
    },
  )
})

describe("ataque (DESIGN-01b-1 r1): un solo pie al navegar entre pantallas", () => {
  it("login → estudiante tras iniciar sesión: nunca dos pies; al final, el del marco", async () => {
    let conSesion = false
    stubFetch((ruta) => {
      if (ruta === "/api/auth/login") {
        conSesion = true
        return respuestaJson(200, { tokenAcceso: "t" })
      }
      if (!conSesion) return sinSesion(ruta)
      return conMe(() => respuestaJson(200, meDe({})))(ruta)
    })
    const vigia = vigilar()
    const { router } = await renderEn("/login")
    await screen.findByRole("button", { name: "Iniciar sesión" })
    expect(unicoPie().closest("[data-rol]")).toBeNull()

    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "ana@ejemplo.mx" } })
    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "clave-de-prueba-1234" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }))
    await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"))
    // CLASES-a ronda 0 (C-4): la identidad es el <span> "Hola, <nombre>", no un encabezado.
    await screen.findByText("Hola, Ana López")
    await esperarUnMomento()

    expect(vigia.terminar().maxPies).toBeLessThanOrEqual(1)
    expect(unicoPie().closest('[data-rol="estudiante"]')).not.toBeNull()
  })

  it("cerrar sesión desde /admin: nunca dos pies; el de /login ya no es opaco", async () => {
    stubFetch(conMe(() => respuestaJson(200, meDe({ rol: "admin", nombre: "Administración" }))))
    const vigia = vigilar()
    const { router } = await renderEn("/admin")
    const cerrar = await screen.findByRole("button", { name: "Cerrar sesión" })
    expect(unicoPie().closest('[data-material="opaco"]')).not.toBeNull()
    fireEvent.click(cerrar)
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    await screen.findByRole("button", { name: "Iniciar sesión" })
    await esperarUnMomento()

    expect(vigia.terminar().maxPies).toBeLessThanOrEqual(1)
    expect(unicoPie().closest("[data-material], [data-densidad], [data-rol]")).toBeNull()
  })

  it("/cambiar-contrasena → /maestro tras cambiarla: nunca dos pies; al final, el del marco", async () => {
    let cambiada = false
    stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
      if (ruta === "/api/auth/cambiar-contrasena") {
        cambiada = true
        return respuestaJson(204, undefined)
      }
      if (!cambiada) return errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
      return respuestaJson(200, meDe({ rol: "maestro", nombre: "Luis Pérez" }))
    })
    const vigia = vigilar()
    const { router } = await renderEn("/cambiar-contrasena")
    await screen.findByRole("heading", { name: "Cambia tu contraseña" })
    expect(unicoPie().closest("[data-rol]")).toBeNull()

    // AUTH-03a ronda 0 (C-5): sin el campo de la temporal.
    fireEvent.change(screen.getByLabelText("Contraseña nueva"), {
      target: { value: "mi-clave-propia-1" },
    })
    fireEvent.change(screen.getByLabelText("Confirma la contraseña nueva"), {
      target: { value: "mi-clave-propia-1" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar y continuar" }))
    await waitFor(() => expect(router.state.location.pathname).toBe("/maestro"))
    // CLASES-a ronda 0 (C-4): la identidad es el <span> "Hola, <nombre>", no un encabezado.
    await screen.findByText("Hola, Luis Pérez")
    await esperarUnMomento()

    expect(vigia.terminar().maxPies).toBeLessThanOrEqual(1)
    expect(unicoPie().closest('[data-rol="maestro"]')).not.toBeNull()
  })
})

describe("ataque (DESIGN-01b-1 r1): marco de cada rol", () => {
  // AUTH-03b ronda 0 (C-9): el admin pasa a tener dos destinos, "Cuentas" (/admin) y "Maestros"
  // (/admin/maestros). Sigue protegiendo que cada destino de la nav sea una ruta existente y
  // enfocable, en su orden, y que solo el de la ruta actual lleve aria-current (NavLink con `end`:
  // "Cuentas" no queda activa en /admin/maestros ni "Maestros" en /admin). Estudiante y maestro
  // conservan un solo destino.
  // CLASES-02 ronda 0 de 02c (C-14, §D-2C1 y Enmienda 1, M-04): el admin suma un tercer destino,
  // "Clases" (/admin/clases), después de "Maestros"; en /admin solo "Cuentas" lleva aria-current
  // ("Clases" es de coincidencia por prefijo, pero /admin no está bajo /admin/clases). Sigue
  // protegiendo lo mismo: cada destino es una ruta existente y enfocable, en su orden, y solo el de
  // la ruta actual queda activo.
  it.each([
    {
      rol: "estudiante",
      nombre: "Ana López",
      etiqueta: "Estudiante",
      destino: "/estudiante",
      destinos: ["/estudiante"],
      textos: ["Inicio"],
    },
    {
      rol: "maestro",
      nombre: "Luis Pérez",
      etiqueta: "Maestro",
      destino: "/maestro",
      destinos: ["/maestro"],
      textos: ["Inicio"],
    },
    {
      rol: "admin",
      nombre: "Administración",
      etiqueta: "Administrador",
      destino: "/admin",
      destinos: ["/admin", "/admin/maestros", "/admin/clases"],
      textos: ["Cuentas", "Maestros", "Clases"],
    },
  ])(
    "$rol: una nav con sus destinos existentes, solo el de la ruta actual activo, un banner, un pie, un 'Cerrar sesión'",
    async ({ rol, nombre, etiqueta, destino, destinos, textos }) => {
      stubFetch(conMe(() => respuestaJson(200, meDe({ rol, nombre }))))
      const { rutas } = await renderEn(destino)
      await screen.findByRole("button", { name: "Cerrar sesión" })
      await esperarUnMomento()

      const raiz = document.querySelector(`[data-rol="${rol}"]`)
      expect(raiz, "sin raíz del marco").not.toBeNull()
      if (!raiz) throw new Error("sin raíz del marco")

      const navs = screen.getAllByRole("navigation")
      expect(navs).toHaveLength(1)
      const [nav] = navs
      if (!nav) throw new Error("sin nav")
      expect(nav).toHaveAccessibleName("Navegación principal")
      // La nav fija es hija directa de la raíz (§D-1).
      expect(nav.parentElement).toBe(raiz)

      const enlaces = within(nav).getAllByRole("link")
      expect(enlaces.map((a) => a.getAttribute("href"))).toEqual(destinos)
      expect(enlaces.map((a) => a.textContent)).toEqual(textos)
      expect(
        enlaces.map((a) => a.getAttribute("aria-current")),
        "aria-current solo en el destino de la ruta actual",
      ).toEqual(destinos.map((d) => (d === destino ? "page" : null)))
      for (const enlace of enlaces) {
        const href = enlace.getAttribute("href") ?? ""
        const coincidencias = matchRoutes(rutas, href) ?? []
        const ultima = coincidencias.at(-1)
        expect(ultima?.route.path, `${href} no es una ruta existente`).not.toBe("*")
        expect(ultima?.route.path ?? ultima?.route.index, `${href} no coincide`).toBeTruthy()
        enlace.focus()
        expect(document.activeElement).toBe(enlace)
      }

      // Lo fijo nunca dentro de un bloque contenedor (M-03 de 01a).
      for (let ancestro = nav.parentElement; ancestro; ancestro = ancestro.parentElement) {
        const culpables = clasesSinVariante(ancestro).filter((c) => CREA_BLOQUE_CONTENEDOR.test(c))
        expect(culpables, `ancestro <${ancestro.tagName.toLowerCase()}> de la nav`).toEqual([])
        expect(ancestro.getAttribute("style") ?? "").not.toMatch(
          /transform|filter|perspective|contain|will-change/,
        )
      }

      const banners = screen.getAllByRole("banner")
      expect(banners).toHaveLength(1)
      expect(raiz.contains(banners[0] ?? null)).toBe(true)
      const pie = unicoPie()
      expect(raiz.contains(pie)).toBe(true)
      expect(screen.getAllByRole("button", { name: "Cerrar sesión" })).toHaveLength(1)
      expect(screen.getAllByText(nombre, { exact: true })).toHaveLength(1)
      expect(screen.getAllByText(etiqueta, { exact: true })).toHaveLength(1)
      // El nombre del producto de la barra no es un encabezado (R-08 de plan.md).
      expect(screen.queryByRole("heading", { name: /Campus Digital/ })).toBeNull()

      const contexto = document.querySelectorAll("[data-material], [data-densidad]")
      if (rol === "admin") {
        expect(contexto).toHaveLength(1)
        for (const pieza of [nav, ...banners, pie, ...within(pie).queryAllByRole("link")]) {
          expect(pieza.closest('[data-material="opaco"]')).not.toBeNull()
          expect(pieza.closest('[data-densidad="densa"]')).not.toBeNull()
        }
      } else {
        expect(contexto).toHaveLength(0)
      }
    },
  )

  it("'Cerrar sesión' del marco: en espera, otro clic no manda un segundo logout y el botón conserva el foco", async () => {
    let soltar: (r: Response) => void = () => undefined
    const fetchMock = stubFetch((ruta) => {
      if (ruta === "/api/auth/logout") {
        return new Promise<Response>((resolver) => {
          soltar = resolver
        })
      }
      return conMe(() => respuestaJson(200, meDe({})))(ruta)
    })
    await renderEn("/estudiante")
    const boton = await screen.findByRole("button", { name: "Cerrar sesión" })
    act(() => boton.focus())
    fireEvent.click(boton)
    // Segundo clic ya con el repintado (el caso "en el mismo instante" solo se exige a login y
    // registro desde 01a: en-espera-r1). Aquí se comprueba que el botón mudado a BarraSuperior
    // siga en espera y no mande un segundo logout.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Cerrar sesión" })).toHaveAttribute(
        "aria-busy",
        "true",
      ),
    )
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }))
    fireEvent.keyDown(screen.getByRole("button", { name: "Cerrar sesión" }), { key: "Enter" })
    await esperarUnMomento()

    expect(fetchMock.mock.calls.filter(([r]) => String(r) === "/api/auth/logout")).toHaveLength(1)
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toHaveAttribute(
      "aria-busy",
      "true",
    )
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cerrar sesión" }))
    act(() => soltar(respuestaJson(204, undefined)))
    await esperarUnMomento()
  })
})

// --- Pie y composición en las 11 rutas -------------------------------------------------------

const PANTALLAS = [
  { ruta: "/login", manejador: sinSesion, espera: "Iniciar sesión" },
  { ruta: "/registro", manejador: sinSesion, espera: "Crear cuenta" },
  { ruta: "/recuperar", manejador: sinSesion, espera: "Enviar enlace" },
  {
    ruta: `/restablecer#token=${TOKEN_ENLACE}`,
    manejador: sinSesion,
    espera: "Guardar contraseña",
  },
  {
    ruta: `/establecer-contrasena#token=${TOKEN_ENLACE}`,
    // AUTH-03a ronda 0 (C-6): los datos de la invitación que la pantalla pide al montar.
    manejador: (ruta: string) =>
      ruta === "/api/auth/invitacion"
        ? respuestaJson(200, { nombre: "Ana López" })
        : sinSesion(ruta),
    espera: "Activar mi cuenta",
  },
  { ruta: "/diagnostico", manejador: sinSesion, espera: null },
  {
    ruta: "/cambiar-contrasena",
    manejador: conMe(() => errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")),
    espera: "Guardar y continuar",
  },
  {
    ruta: "/acceso-restringido",
    manejador: conMe(() => respuestaJson(200, meDe({ accesoRestringido: true }))),
    espera: "Cerrar sesión",
  },
  {
    ruta: "/estudiante",
    manejador: conMe(() => respuestaJson(200, meDe({}))),
    espera: "Cerrar sesión",
  },
  {
    ruta: "/maestro",
    manejador: conMe(() => respuestaJson(200, meDe({ rol: "maestro" }))),
    espera: "Cerrar sesión",
  },
  {
    ruta: "/admin",
    manejador: conMe(() => respuestaJson(200, meDe({ rol: "admin", nombre: "Administración" }))),
    espera: "Cerrar sesión",
  },
]

const esperarPantalla = async (espera: string | null) => {
  if (espera === null) {
    await screen.findByRole("heading", { name: "Diagnóstico de conexión" })
    return
  }
  await screen.findByRole("button", { name: espera })
}

// Un texto se lee sobre un panel: Card, vidrio (sin variante), o un fondo sólido de token.
const SUPERFICIES =
  /^(vidrio|vidrio-fuerte|vidrio-azul|bg-(surface|card|popover|primary|brand|accent|accent-soft|destructive|danger-soft|muted|success-soft|warning-soft))$/

const sobreSuperficie = (nodo: Node) => {
  for (let el = nodo.parentElement; el; el = el.parentElement) {
    if (el.getAttribute("data-slot") === "card") return true
    const clases = (el.getAttribute("class") ?? "").split(/\s+/)
    if (clases.some((c) => SUPERFICIES.test(c))) return true
  }
  return false
}

const textosSueltos = () => {
  const sueltos: string[] = []
  const caminante = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let nodo = caminante.nextNode(); nodo; nodo = caminante.nextNode()) {
    const texto = nodo.textContent?.trim() ?? ""
    if (!texto) continue
    if (!sobreSuperficie(nodo)) sueltos.push(texto)
  }
  return sueltos
}

describe("ataque (DESIGN-01b-1 r1): pie y composición en cada pantalla", () => {
  it.each(PANTALLAS)(
    "$ruta: un pie con 4 marcadores inertes, sin '#', y ningún texto suelto sobre los orbes",
    async ({ ruta, manejador, espera }) => {
      stubFetch(manejador)
      await renderEn(ruta)
      await esperarPantalla(espera)
      await esperarUnMomento()

      const pie = unicoPie()
      const marcadores = Array.from(pie.querySelectorAll<HTMLElement>("[data-marcador]"))
      expect(marcadores.map((m) => m.textContent)).toEqual([
        "Sitio web",
        "Facebook",
        "Contacto",
        "Aviso de privacidad",
      ])
      for (const marcador of marcadores) {
        expect(marcador.closest("a, button")).toBeNull()
        expect(marcador.getAttribute("tabindex")).toBeNull()
      }
      expect(within(pie).queryAllByRole("link")).toHaveLength(0)
      expect(
        document.querySelectorAll('[href="#"], [href^="#"], [href^="javascript:"]'),
      ).toHaveLength(0)
      expect(textosSueltos(), "texto directo sobre el fondo").toEqual([])
    },
  )

  it("el Cargando de las guardas también va sobre una superficie", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
      return new Promise<Response>(() => undefined)
    })
    await renderEn("/estudiante")
    expect(await screen.findByRole("status")).toHaveTextContent("Cargando")
    expect(textosSueltos()).toEqual([])
  })
})

// --- Panel de anuncios y recorte de la sombra ----------------------------------------------------

const DESPLAZABLE = /^(overflow|overflow-y|overflow-x)-(auto|scroll|hidden|clip)$/

describe("ataque (DESIGN-01b-1 r1): recorte de la sombra del panel de anuncios", () => {
  it.each(["/login", "/registro"])(
    "%s: la lista de avisos es la única que desplaza, sus filas no llevan sombra y el panel no está recortado",
    async (ruta) => {
      stubFetch(sinSesion)
      await renderEn(ruta)
      await screen.findByRole("button", {
        name: ruta === "/login" ? "Iniciar sesión" : "Crear cuenta",
      })

      const lista = screen.getByRole("list", { name: "Avisos del colegio" })
      expect(lista).toHaveAttribute("tabindex", "0")
      lista.focus()
      expect(document.activeElement).toBe(lista)
      expect(within(lista).getAllByRole("heading", { level: 3 }).length).toBe(
        within(lista).getAllByRole("listitem").length,
      )

      // Solo la lista tiene desplazamiento propio en toda la pantalla.
      const desplazables = Array.from(document.body.querySelectorAll("*")).filter((el) =>
        clasesSinVariante(el).some((c) => DESPLAZABLE.test(c)),
      )
      expect(desplazables).toEqual([lista])

      // Toda superficie de vidrio dentro de lo que desplaza tiene la sombra anulada.
      expect(clasesSinVariante(lista)).toContain("sin-sombra-de-vidrio")
      for (const fila of within(lista).getAllByRole("listitem")) {
        expect(fila.closest("ul")).toBe(lista)
      }

      // El panel que da la sombra no está dentro de nada que recorte, y ya no hay p-2 -m-2.
      const panel = lista.closest('[data-slot="card"]')
      expect(panel, "la lista no está dentro de un panel").not.toBeNull()
      for (let el = panel; el; el = el.parentElement) {
        const clases = clasesSinVariante(el)
        expect(
          clases.filter((c) => DESPLAZABLE.test(c)),
          `<${el.tagName}> recorta`,
        ).toEqual([])
        expect(clases).not.toContain("-m-2")
      }
      expect(screen.getByRole("complementary", { name: "Anuncios" }).contains(lista)).toBe(true)
    },
  )
})
