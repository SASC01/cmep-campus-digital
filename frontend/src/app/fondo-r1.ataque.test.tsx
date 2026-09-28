import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { StrictMode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { orbesEnMovimiento } from "@/components/layout/lib"
import tokens from "@/styles/tokens.css?raw"

import { FondoDeLaApp } from "./fondo-de-la-app"

// Ataques del Tester (DESIGN-01b-1, ronda 1) contra el fondo con orbes (plan-01b.md, §D-1, §D-2 y
// punto de ataque 4): montado como en main.tsx (hermano de RouterProvider), sigue las
// redirecciones de las guardas, no se vuelve a montar al navegar, no navega por su cuenta, se
// suscribe una sola vez y se da de baja al desmontarse. Y el texto de tokens.css: solo transform,
// movimiento reducido que de verdad gana, y nada en [data-fondo] que cree un bloque contenedor.
// Se localiza por rol, texto y atributos de datos, nunca por clases de estilo (tester.md).

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/login") }))

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

type Manejador = (ruta: string) => Response

const stubFetch = (manejador: Manejador) => {
  const fetchMock = vi.fn<typeof fetch>((entrada) => Promise.resolve(manejador(String(entrada))))
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const sesionCon = (me: () => Response): Manejador => {
  return (ruta) => {
    if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
    if (ruta === "/api/auth/logout") return respuestaJson(204, undefined)
    if (ruta === "/api/me") return me()
    return errorJson(500, "ERROR_INTERNO")
  }
}

const sinSesion: Manejador = (ruta) => {
  if (ruta === "/api/auth/refrescar") return errorJson(401, "SESION_INVALIDA")
  return errorJson(401, "NO_AUTENTICADO")
}

// Como main.tsx: el fondo es hermano de RouterProvider, dentro de los proveedores.
const montarComoMain = async (ruta: string) => {
  const { rutas } = await import("./router")
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <FondoDeLaApp router={router} />
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
  return router
}

const fondos = () => Array.from(document.querySelectorAll<HTMLElement>("[data-fondo]"))
const fondo = () => {
  const lista = fondos()
  expect(lista, "debe haber exactamente un [data-fondo]").toHaveLength(1)
  const [unico] = lista
  if (!unico) throw new Error("no hay [data-fondo]")
  return unico
}

const esperarUnMomento = () => act(() => new Promise((resolver) => setTimeout(resolver, 30)))

beforeAll(async () => {
  await import("./router")
}, 60_000)

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("ataque (DESIGN-01b-1 r1): orbesEnMovimiento con rutas raras", () => {
  it.each([
    "/login",
    "/LOGIN",
    "/Login/",
    "/login//",
    "/estudiante",
    "/ESTUDIANTE/",
    "/maestro",
    "/Maestro///",
  ])("%s se mueve", (ruta) => {
    expect(orbesEnMovimiento(ruta)).toBe(true)
  })

  it.each([
    "/",
    "",
    "/admin",
    "/ADMIN/",
    "/registro",
    "/recuperar",
    "/restablecer",
    "/establecer-contrasena",
    "/cambiar-contrasena",
    "/acceso-restringido",
    "/diagnostico",
    "/login/x",
    "/loginx",
    "/xlogin",
    "//login",
    "/estudiantes",
    "/estudiante/clases",
    "/maestro/admin",
    " /login",
    "/login ",
    "/login%2F",
  ])("%j queda quieto", (ruta) => {
    expect(orbesEnMovimiento(ruta)).toBe(false)
  })
})

describe("ataque (DESIGN-01b-1 r1): el fondo montado como en main.tsx sigue las guardas", () => {
  it.each([
    { ruta: "/", manejador: sinSesion, final: "/login", movimiento: "si" },
    { ruta: "/no-existe", manejador: sinSesion, final: "/login", movimiento: "si" },
    { ruta: "/LOGIN/", manejador: sinSesion, final: "/LOGIN/", movimiento: "si" },
    { ruta: "/registro", manejador: sinSesion, final: "/registro", movimiento: "no" },
    { ruta: "/diagnostico", manejador: sinSesion, final: "/diagnostico", movimiento: "no" },
    { ruta: "/estudiante", manejador: sinSesion, final: "/login", movimiento: "si" },
    {
      ruta: "/admin",
      manejador: sesionCon(() => respuestaJson(200, meDe({}))),
      final: "/estudiante",
      movimiento: "si",
    },
    {
      ruta: "/estudiante",
      manejador: sesionCon(() => respuestaJson(200, meDe({ rol: "admin" }))),
      final: "/admin",
      movimiento: "no",
    },
    {
      ruta: "/acceso-restringido",
      manejador: sesionCon(() => respuestaJson(200, meDe({ rol: "maestro" }))),
      final: "/maestro",
      movimiento: "si",
    },
    {
      ruta: "/estudiante",
      manejador: sesionCon(() => respuestaJson(200, meDe({ accesoRestringido: true }))),
      final: "/acceso-restringido",
      movimiento: "no",
    },
    {
      ruta: "/maestro",
      manejador: sesionCon(() => errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")),
      final: "/cambiar-contrasena",
      movimiento: "no",
    },
  ])(
    "$ruta termina en $final con data-movimiento=$movimiento",
    async ({ ruta, manejador, final, movimiento }) => {
      stubFetch(manejador)
      const router = await montarComoMain(ruta)
      await waitFor(() => expect(router.state.location.pathname).toBe(final))
      await esperarUnMomento()
      expect(router.state.location.pathname).toBe(final)
      expect(fondo()).toHaveAttribute("data-movimiento", movimiento)
    },
  )

  it("login → estudiante: el mismo nodo de fondo (no se vuelve a montar) pasa de quieto a en movimiento y de vuelta", async () => {
    let conSesion = false
    stubFetch((ruta) => {
      if (ruta === "/api/auth/login") {
        conSesion = true
        return respuestaJson(200, { tokenAcceso: "t" })
      }
      if (ruta === "/api/auth/logout") {
        conSesion = false
        return respuestaJson(204, undefined)
      }
      if (!conSesion) return sinSesion(ruta)
      return sesionCon(() => respuestaJson(200, meDe({})))(ruta)
    })
    const router = await montarComoMain("/registro")
    await screen.findByRole("button", { name: "Crear cuenta" })
    const nodo = fondo()
    expect(nodo).toHaveAttribute("data-movimiento", "no")

    await act(() => router.navigate("/login"))
    await screen.findByRole("button", { name: "Iniciar sesión" })
    expect(fondo()).toBe(nodo)
    expect(nodo).toHaveAttribute("data-movimiento", "si")

    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "ana@ejemplo.mx" } })
    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "clave-de-prueba-1234" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }))
    await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"))
    await screen.findByRole("button", { name: "Cerrar sesión" })
    expect(fondo()).toBe(nodo)
    expect(nodo).toHaveAttribute("data-movimiento", "si")

    await act(() => router.navigate("/diagnostico"))
    expect(fondo()).toBe(nodo)
    expect(nodo).toHaveAttribute("data-movimiento", "no")
  })

  it("el fondo no es parte del árbol accesible, no recibe el foco y no cuelga de nada con vidrio", async () => {
    stubFetch(sesionCon(() => respuestaJson(200, meDe({}))))
    await montarComoMain("/estudiante")
    await screen.findByRole("button", { name: "Cerrar sesión" })
    const nodo = fondo()

    expect(nodo).toHaveAttribute("aria-hidden", "true")
    expect(nodo.textContent).toBe("")
    expect(nodo.querySelectorAll("a, button, input, select, textarea, [tabindex]")).toHaveLength(0)
    expect(nodo.querySelectorAll("[data-orbe]")).toHaveLength(3)
    expect(nodo.querySelectorAll("[data-velo]")).toHaveLength(1)
    // Fuera de todo lo que pinta el router: ni dentro de main, nav, header, footer ni del marco.
    expect(nodo.closest("main, nav, header, footer, [data-rol], [data-slot]")).toBeNull()
    for (let ancestro = nodo.parentElement; ancestro; ancestro = ancestro.parentElement) {
      expect(ancestro.getAttribute("class") ?? "").not.toMatch(/(^|\s|:)vidrio/)
    }
    // El marco del rol no contiene el fondo.
    const marco = document.querySelector("[data-rol]")
    expect(marco, "no se pintó el marco del rol").not.toBeNull()
    expect(marco?.contains(nodo)).toBe(false)
  })
})

describe("ataque (DESIGN-01b-1 r1): suscripción al router", () => {
  const rutasMinimas = [
    { path: "/login", element: <p>Login</p> },
    { path: "/registro", element: <p>Registro</p> },
    { path: "/estudiante", element: <p>Estudiante</p> },
    { path: "/maestro", element: <p>Maestro</p> },
    { path: "/admin", element: <p>Admin</p> },
  ]

  it("se suscribe una sola vez aunque navegue muchas veces, y se da de baja al desmontarse", () => {
    const router = createMemoryRouter(rutasMinimas, { initialEntries: ["/login"] })
    const bajas = vi.fn()
    const original = router.subscribe.bind(router)
    const suscribir = vi.spyOn(router, "subscribe").mockImplementation((escuchador) => {
      const baja = original(escuchador)
      return () => {
        bajas()
        baja()
      }
    })

    const { unmount } = render(<FondoDeLaApp router={router} />)
    for (const destino of ["/registro", "/estudiante", "/admin", "/maestro", "/login", "/admin"]) {
      act(() => {
        void router.navigate(destino)
      })
    }
    expect(fondo()).toHaveAttribute("data-movimiento", "no")
    expect(suscribir).toHaveBeenCalledTimes(1)

    unmount()
    expect(bajas).toHaveBeenCalledTimes(1)
    expect(fondos()).toHaveLength(0)
    // Navegar después de desmontarlo no revive nada ni truena.
    act(() => {
      void router.navigate("/estudiante")
    })
    expect(fondos()).toHaveLength(0)
  })

  it("no navega por su cuenta: montarlo no cambia la ruta ni agrega entradas al historial", () => {
    const router = createMemoryRouter(rutasMinimas, { initialEntries: ["/registro"] })
    const navegar = vi.spyOn(router, "navigate")
    render(<FondoDeLaApp router={router} />)
    expect(router.state.location.pathname).toBe("/registro")
    expect(router.state.historyAction).toBe("POP")
    expect(navegar).not.toHaveBeenCalled()
  })
})

// --- tokens.css, bloque 7 ---------------------------------------------------------------------

const reglas = (() => {
  const lista: { selector: string; cuerpo: string; inicio: number; enMedia: string | null }[] = []
  const recorrer = (texto: string, desplazamiento: number, enMedia: string | null) => {
    let i = 0
    while (i < texto.length) {
      const abre = texto.indexOf("{", i)
      if (abre === -1) return
      const selector = texto
        .slice(i, abre)
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .trim()
      let profundidad = 0
      let cierra = abre
      for (; cierra < texto.length; cierra += 1) {
        if (texto[cierra] === "{") profundidad += 1
        if (texto[cierra] === "}") profundidad -= 1
        if (profundidad === 0) break
      }
      const cuerpo = texto.slice(abre + 1, cierra)
      if (/^@(media|keyframes)/.test(selector))
        recorrer(cuerpo, desplazamiento + abre + 1, selector)
      else lista.push({ selector, cuerpo, inicio: desplazamiento + abre, enMedia })
      i = cierra + 1
    }
  }
  recorrer(tokens, 0, null)
  return lista
})()

const propiedades = (cuerpo: string) =>
  [...cuerpo.matchAll(/(?:^|[;{\s])([a-z-]+)\s*:/g)].map(([, nombre]) => nombre)

describe("ataque (DESIGN-01b-1 r1): tokens.css del fondo", () => {
  it("se leyó el bloque del fondo", () => {
    expect(reglas.some((r) => r.selector === "[data-fondo]")).toBe(true)
  })

  it("cada paso de @keyframes orbe-* solo declara transform", () => {
    const pasos = reglas.filter((r) => /^(\d+%|from|to)$/.test(r.selector))
    const nombres = [...tokens.matchAll(/@keyframes\s+([\w-]+)/g)].map(([, n]) => n)
    expect(nombres).toEqual(["orbe-azul", "orbe-verde", "orbe-suave"])
    expect(pasos.length).toBeGreaterThanOrEqual(9)
    for (const paso of pasos) {
      expect(propiedades(paso.cuerpo), `paso ${paso.selector}: ${paso.cuerpo}`).toEqual([
        "transform",
      ])
    }
  })

  it("con movimiento reducido, animation: none gana a animation-name de cada orbe (va después y con la misma especificidad o mayor)", () => {
    const reducido = reglas.filter(
      (r) => r.enMedia?.includes("prefers-reduced-motion: reduce") && /data-orbe/.test(r.selector),
    )
    expect(reducido, "no hay regla de movimiento reducido para los orbes").toHaveLength(1)
    const [regla] = reducido
    if (!regla) throw new Error("sin regla de movimiento reducido")
    expect(regla.cuerpo).toMatch(/(^|[;\s])animation\s*:\s*none\s*;/)
    expect(regla.cuerpo).not.toMatch(/!important/)
    const conNombre = reglas.filter(
      (r) =>
        r.enMedia === null &&
        /animation(-name)?\s*:/.test(r.cuerpo) &&
        /data-orbe/.test(r.selector),
    )
    expect(conNombre.length).toBeGreaterThanOrEqual(3)
    for (const otra of conNombre) {
      expect(otra.cuerpo, `${otra.selector} usa !important`).not.toMatch(/!important/)
      // Mismo peso (un atributo): solo gana si la regla reducida va después.
      expect(regla.inicio, `${otra.selector} va después de la regla reducida`).toBeGreaterThan(
        otra.inicio,
      )
    }
    // Ninguna otra regla con más peso vuelve a poner una animación en los orbes.
    const reanima = reglas.filter(
      (r) =>
        r !== regla &&
        /data-orbe/.test(r.selector) &&
        /(^|[;\s])animation(-name)?\s*:/.test(r.cuerpo) &&
        !/^\[data-orbe(="(azul|verde|suave)")?\]$/.test(r.selector),
    )
    expect(reanima.map((r) => r.selector)).toEqual([])
  })

  it("las pantallas quietas pausan con más peso que las reglas de cada orbe", () => {
    const pausa = reglas.find((r) => /animation-play-state\s*:\s*paused/.test(r.cuerpo))
    expect(pausa?.selector).toBe('[data-fondo][data-movimiento="no"] [data-orbe]')
  })

  it("[data-fondo] es fijo, no recibe el puntero y no crea un bloque contenedor para lo fijo", () => {
    const regla = reglas.find((r) => r.selector === "[data-fondo]")
    if (!regla) throw new Error("sin [data-fondo]")
    expect(regla.cuerpo).toMatch(/position\s*:\s*fixed/)
    expect(regla.cuerpo).toMatch(/pointer-events\s*:\s*none/)
    expect(regla.cuerpo).toMatch(/z-index\s*:\s*-1/)
    for (const regla2 of reglas.filter((r) => /data-(fondo|orbe|velo)/.test(r.selector))) {
      expect(propiedades(regla2.cuerpo), regla2.selector).not.toEqual(
        expect.arrayContaining(["transition"]),
      )
    }
    expect(regla.cuerpo).not.toMatch(
      /(^|[;\s])(transform|filter|backdrop-filter|-webkit-backdrop-filter|perspective|contain|will-change)\s*:/,
    )
  })

  it("will-change aparece una sola vez en tokens.css, en [data-orbe], y solo sobre transform", () => {
    const conWillChange = reglas.filter((r) => /will-change/.test(r.cuerpo))
    expect(conWillChange.map((r) => r.selector)).toEqual(["[data-orbe]"])
    expect(tokens.match(/will-change/g)).toHaveLength(1)
    expect(conWillChange[0]?.cuerpo).toMatch(/will-change\s*:\s*transform\s*;/)
  })
})
