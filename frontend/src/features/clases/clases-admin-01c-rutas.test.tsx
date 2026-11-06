import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// ADMIN-01c, las frases de recuperación por cada camino, con el router real (`rutas` de app/router) y el
// QueryClient de app/providers.tsx (staleTime de 30 s, un reintento): el texto de error de la lista
// (ADM-1C12), el de lista cambiada (ADM-1C07; en "Archivadas", con la posición vieja, ADM-1C16 c), el del
// conteo de borrado (ADM-1C06), el de CLASE_CON_COPIAS_EN_CURSO en el diálogo (ADM-1C11) y el de
// ARCHIVO_EN_COPIA en «Descargar» de un recurso (ADM-1C10). Un error se reintenta una vez (~1 s): las
// esperas lo toleran.

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin") }))

const ESPERA = { timeout: 6000 }
const idClase = (n: number) => `2a2b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const CLASE_ID = idClase(1)
const LUIS = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const FIRMA_ADMIN = {
  id: "1a1b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01",
  nombre: "Dirección",
  administracion: true,
}
const ADJUNTO = {
  id: "9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11",
  nombre: "lectura.pdf",
  tipo: "application/pdf",
  tamano: 2048,
  vistaPrevia: null,
}
const RECURSO_ID = "6a6b3c4d-1c1f-4b8e-9a1e-000000000001"
const ERROR_LISTA = "No pudimos cargar las clases. Revisa tu conexión e inténtalo de nuevo."
const LISTA_CAMBIADA = "La lista cambió mientras la veías. Vuelve a abrirla para verla completa."
const ERROR_CONTEO = "No pudimos contar lo que se borraría. Cierra y vuelve a intentarlo."
const COPIAS_EN_CURSO =
  "Esta clase tiene archivos que todavía se están copiando. Inténtalo en unos minutos."
const EN_COPIA = "Este archivo todavía se está copiando. Inténtalo en unos minutos."
const POSICION = "2026-10-05T12:00:00.000Z"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorJson = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const fila = (n: number, archivada: boolean) => ({
  id: idClase(n),
  nombre: `Clase ${String(n)}`,
  maestros: [LUIS],
  alumnos: 3,
  creadoEn: "2026-09-01T15:00:00.000Z",
  archivadaEn: archivada ? `2026-10-${String(n).padStart(2, "0")}T12:00:00.000Z` : null,
})

type Estado = "activas" | "archivadas"

interface Llamada {
  metodo: string
  ruta: string
  url: URL
}

const servidor = {
  // Por estado: "ok" (una página), "500", o "cursor" (la primera página con siguiente; la segunda,
  // 400 del cursor).
  lista: { activas: "ok", archivadas: "ok" } as Record<Estado, "ok" | "500" | "cursor">,
  conteo: "ok" as "ok" | "500",
  borrado: "ok" as "ok" | "copias",
  descarga: "ok" as "ok" | "en-copia",
  archivadas: [fila(5, true), fila(6, true)],
}
let llamadas: Llamada[] = []
const asignar = vi.fn()

const responder = (llamada: Llamada): Response => {
  const { metodo, url } = llamada
  if (url.pathname === "/api/me") {
    return respuestaJson(200, {
      id: "4a4b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
      nombre: "Ana López",
      email: "ana@ejemplo.mx",
      rol: "admin",
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
  }
  if (url.pathname === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "otra" })
  if (metodo === "GET" && url.pathname === "/api/admin/clases") {
    const estado: Estado =
      url.searchParams.get("estado") === "archivadas" ? "archivadas" : "activas"
    const modo = servidor.lista[estado]
    if (modo === "500") return errorJson(500, "ERROR_INTERNO", "Falló.")
    const clases = estado === "activas" ? [fila(1, false), fila(2, false)] : servidor.archivadas
    if (modo === "cursor" && url.searchParams.has("cursor")) {
      return errorJson(400, "VALIDACION", "cursor: no es válido")
    }
    const conSiguiente = modo === "cursor"
    return respuestaJson(200, {
      clases,
      total: clases.length,
      siguienteCursor: conSiguiente ? (clases.at(-1)?.id ?? null) : null,
      siguienteCursorArchivadaEn: conSiguiente && estado === "archivadas" ? POSICION : null,
    })
  }
  if (url.pathname.endsWith("/conteo-de-borrado")) {
    if (servidor.conteo === "500") return errorJson(500, "ERROR_INTERNO", "Falló.")
    return respuestaJson(200, {
      alumnos: 2,
      actividades: 2,
      entregas: 2,
      calificaciones: 2,
      archivos: 2,
    })
  }
  const borrar = /^\/api\/admin\/clases\/([^/]+)$/.exec(url.pathname)
  if (metodo === "DELETE" && borrar !== null) {
    if (servidor.borrado === "copias") {
      return errorJson(409, "CLASE_CON_COPIAS_EN_CURSO", COPIAS_EN_CURSO)
    }
    servidor.archivadas = servidor.archivadas.filter((c) => c.id !== borrar[1])
    return new Response(null, { status: 204 })
  }
  const base = `/api/clases/${CLASE_ID}`
  if (url.pathname === base) {
    return respuestaJson(200, {
      clase: {
        id: CLASE_ID,
        nombre: "Historia",
        descripcion: null,
        maestro: LUIS,
        maestros: [LUIS],
        archivadaEn: null,
      },
    })
  }
  if (url.pathname === `${base}/codigo`) return respuestaJson(200, { codigo: "ABCDEFG" })
  if (url.pathname === `${base}/publicaciones`) {
    return respuestaJson(200, { publicaciones: [], siguienteCursor: null })
  }
  if (url.pathname === `${base}/temas`) {
    const deAprendizaje = url.searchParams.get("seccion") === "aprendizaje"
    return respuestaJson(200, { temas: [], sinTema: deAprendizaje ? 1 : 0 })
  }
  if (url.pathname === `${base}/recursos`) {
    const deAprendizaje = url.searchParams.get("bloque") === "aprendizaje"
    return respuestaJson(200, {
      recursos: deAprendizaje
        ? [
            {
              id: RECURSO_ID,
              titulo: "Lectura copiada",
              texto: "",
              autor: FIRMA_ADMIN,
              creadoEn: "2026-10-01T15:30:00.000Z",
              bloque: "aprendizaje",
              adjuntos: [ADJUNTO],
              comentarios: 0,
              puedeEditar: true,
              puedeBorrar: true,
              puedeMover: true,
            },
          ]
        : [],
      siguienteCursor: null,
    })
  }
  if (metodo === "POST" && url.pathname === `${base}/archivos/${ADJUNTO.id}/descarga`) {
    if (servidor.descarga === "en-copia") {
      return errorJson(409, "ARCHIVO_EN_COPIA", "texto del servidor que no se muestra")
    }
    return respuestaJson(200, {
      url: "https://almacen.ejemplo.mx/descarga/x",
      expiraEn: "2030-01-10T12:05:00.000Z",
    })
  }
  return errorJson(500, "ERROR_INTERNO", "no esperada")
}

const montar = async (entrada: string) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [entrada] })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return router
}

const reposar = (ms = 150) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))
const pedidas = (metodo: string, filtro: (url: URL) => boolean) =>
  llamadas.filter((l) => l.metodo === metodo && filtro(l.url))
const deLaLista = (estado: Estado) => (url: URL) =>
  url.pathname === "/api/admin/clases" && url.searchParams.get("estado") === estado
const enLaBarra = (nombre: string) => {
  const enlace = screen
    .getAllByRole("link", { name: nombre })
    .find((candidato) => candidato.closest("nav") !== null)
  if (enlace === undefined) throw new Error(`Precondición: el enlace «${nombre}» de la barra`)
  return enlace
}
const pestana = (nombre: string) =>
  within(screen.getByRole("group", { name: "Estado de las clases" })).getByRole("button", {
    name: nombre,
  })
// M-03: el siguiente clic depende de que el cambio de pestaña ya se aplicó; se espera por su estado.
const enLaPestana = (nombre: string) =>
  waitFor(() => expect(pestana(nombre)).toHaveAttribute("aria-pressed", "true"))
const errores = () => aviso.error.mock.calls.map(([texto]) => String(texto))

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  servidor.lista = { activas: "ok", archivadas: "ok" }
  servidor.conteo = "ok"
  servidor.borrado = "ok"
  servidor.descarga = "ok"
  servidor.archivadas = [fila(5, true), fila(6, true)]
  llamadas = []
  vi.stubGlobal("location", { ...window.location, assign: asignar })
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const ruta = String(entrada)
      const llamada = { metodo: init?.method ?? "GET", ruta, url: new URL(ruta, "http://x") }
      llamadas.push(llamada)
      return Promise.resolve(responder(llamada))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.mockClear()
  aviso.success.mockClear()
  aviso.error.mockClear()
  asignar.mockReset()
})

type Router = Awaited<ReturnType<typeof montar>>

// Los caminos con que la persona vuelve a abrir la lista estando en «estado» (ADM-1C07, ADM-1C12).
const CAMINOS_DE_LA_LISTA: [string, (router: Router, estado: Estado) => Promise<void>][] = [
  [
    "(a) pulsar «Clases» en la barra estando ahí",
    async (_router, estado) => {
      fireEvent.click(enLaBarra("Clases"))
      // "Clases" de la barra abre la lista en «Activas»; desde «Archivadas», la persona vuelve a su
      // pestaña.
      if (estado === "activas") return
      await enLaPestana("Activas")
      fireEvent.click(pestana("Archivadas"))
    },
  ],
  [
    "(b) ir a otra sección y regresar antes del staleTime",
    async (router, estado) => {
      fireEvent.click(enLaBarra("Cuentas"))
      await waitFor(() => expect(router.state.location.pathname).toBe("/admin"))
      await reposar()
      await act(() => router.navigate(`/admin/clases?estado=${estado}`))
    },
  ],
  [
    "(c) cambiar de pestaña y volver",
    async (_router, estado) => {
      fireEvent.click(pestana(estado === "activas" ? "Archivadas" : "Activas"))
      await enLaPestana(estado === "activas" ? "Archivadas" : "Activas")
      fireEvent.click(pestana(estado === "activas" ? "Activas" : "Archivadas"))
    },
  ],
  [
    "(d) atrás y adelante del historial",
    async (router) => {
      await act(() => router.navigate("/admin"))
      await reposar()
      await act(() => router.navigate(-1))
      await reposar()
      await act(() => router.navigate(1))
      await reposar()
      await act(() => router.navigate(-1))
    },
  ],
]

describe("ADM-1C12: «No pudimos cargar las clases…» por cada camino", () => {
  it.each(CAMINOS_DE_LA_LISTA)(
    "ADM-1C12 %s: vuelve a pedir la primera página de la lista visible y, si responde, el texto desaparece",
    async (_camino, recorrer) => {
      servidor.lista.activas = "500"
      const router = await montar("/admin/clases")
      expect(await screen.findByText(ERROR_LISTA, {}, ESPERA)).toBeInTheDocument()
      const antes = pedidas("GET", deLaLista("activas")).length
      servidor.lista.activas = "ok"
      await recorrer(router, "activas")
      expect(await screen.findByRole("link", { name: "Abrir Clase 1" }, ESPERA)).toBeInTheDocument()
      expect(screen.queryByText(ERROR_LISTA)).toBeNull()
      const despues = pedidas("GET", deLaLista("activas"))
      expect(despues.length).toBeGreaterThan(antes)
      expect(despues.at(-1)?.url.searchParams.has("cursor")).toBe(false)
    },
  )
})

describe("ADM-1C07 y ADM-1C16 (c): «La lista cambió mientras la veías…» por cada camino", () => {
  const CASOS = (["activas", "archivadas"] as const).flatMap((estado) =>
    CAMINOS_DE_LA_LISTA.map(([camino, recorrer]) => [estado, camino, recorrer] as const),
  )

  it.each(CASOS)(
    "en «%s», %s: la primera página vuelve a pedirse sin cursor ni posición, responde y el texto desaparece",
    async (estado, _camino, recorrer) => {
      servidor.lista[estado] = "cursor"
      const router = await montar(
        estado === "activas" ? "/admin/clases" : "/admin/clases?estado=archivadas",
      )
      fireEvent.click(await screen.findByRole("button", { name: "Cargar más clases" }, ESPERA))
      expect(await screen.findByText(LISTA_CAMBIADA, {}, ESPERA)).toBeInTheDocument()
      expect(screen.getAllByRole("alert")).toHaveLength(1)
      expect(errores()).toEqual([])
      const conCursor = pedidas("GET", (u) => deLaLista(estado)(u) && u.searchParams.has("cursor"))
      expect(conCursor.length).toBeGreaterThan(0)
      if (estado === "archivadas") {
        expect(conCursor[0]?.url.searchParams.get("cursorArchivadaEn")).toBe(POSICION)
      }
      const antes = pedidas("GET", deLaLista(estado)).length
      servidor.lista[estado] = "ok"
      await recorrer(router, estado)
      const primera = estado === "activas" ? "Abrir Clase 1" : "Abrir Clase 5"
      expect(await screen.findByRole("link", { name: primera }, ESPERA)).toBeInTheDocument()
      expect(screen.queryByText(LISTA_CAMBIADA)).toBeNull()
      const nuevas = pedidas("GET", deLaLista(estado)).slice(antes)
      expect(nuevas.length).toBeGreaterThan(0)
      for (const llamada of nuevas) {
        expect(llamada.url.searchParams.has("cursor")).toBe(false)
        expect(llamada.url.searchParams.has("cursorArchivadaEn")).toBe(false)
      }
    },
  )
})

const abrirElBorrado = async (nombre: string) => {
  const boton = await screen.findByRole(
    "button",
    { name: `Borrar definitivamente ${nombre}` },
    ESPERA,
  )
  act(() => boton.focus())
  fireEvent.click(boton)
  return screen.findByRole("dialog")
}
const pedidasDelConteo = () => pedidas("GET", (u) => u.pathname.endsWith("/conteo-de-borrado"))
const cerrarElDialogo = async (dialogo: HTMLElement) => {
  fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
}

// Los caminos con que la persona cierra el diálogo y vuelve a abrirlo (ADM-1C06, ADM-1C11).
const CAMINOS_DEL_DIALOGO: [string, (router: Router, dialogo: HTMLElement) => Promise<void>][] = [
  [
    "(a) cerrar y volver a abrir",
    async (_router, dialogo) => {
      await cerrarElDialogo(dialogo)
    },
  ],
  [
    "(b) pulsar «Clases» en la barra estando ahí",
    async (_router, dialogo) => {
      await cerrarElDialogo(dialogo)
      fireEvent.click(enLaBarra("Clases"))
      await enLaPestana("Activas")
      fireEvent.click(pestana("Archivadas"))
    },
  ],
  [
    "(c) ir a otra sección y regresar antes del staleTime",
    async (router, dialogo) => {
      await cerrarElDialogo(dialogo)
      fireEvent.click(enLaBarra("Cuentas"))
      await waitFor(() => expect(router.state.location.pathname).toBe("/admin"))
      await reposar()
      await act(() => router.navigate("/admin/clases?estado=archivadas"))
    },
  ],
  [
    "(d) cambiar a «Activas» y volver",
    async (_router, dialogo) => {
      await cerrarElDialogo(dialogo)
      fireEvent.click(pestana("Activas"))
      await enLaPestana("Activas")
      fireEvent.click(pestana("Archivadas"))
    },
  ],
]

describe("ADM-1C06: «No pudimos contar lo que se borraría…» por cada camino", () => {
  it.each(CAMINOS_DEL_DIALOGO)(
    "ADM-1C06 %s: al volver a abrir el diálogo pide otra vez el conteo (no lo sirve de la caché) y el texto desaparece",
    async (_camino, recorrer) => {
      servidor.conteo = "500"
      const router = await montar("/admin/clases?estado=archivadas")
      const dialogo = await abrirElBorrado("Clase 5")
      expect(await within(dialogo).findByText(ERROR_CONTEO, {}, ESPERA)).toBeInTheDocument()
      expect(
        within(dialogo).queryByRole("button", { name: "Sí, borrar definitivamente" }),
        "sin conteo no se ofrece borrar",
      ).toBeNull()
      const antes = pedidasDelConteo().length
      servidor.conteo = "ok"
      await recorrer(router, dialogo)
      const otra = await abrirElBorrado("Clase 5")
      expect(
        await within(otra).findByRole("button", { name: "Sí, borrar definitivamente" }, ESPERA),
      ).toBeInTheDocument()
      expect(within(otra).queryByText(ERROR_CONTEO)).toBeNull()
      expect(pedidasDelConteo().length).toBe(antes + 1)
    },
  )
})

describe("ADM-1C11: CLASE_CON_COPIAS_EN_CURSO en el diálogo, por cada camino", () => {
  const pedirElBorrado = async (dialogo: HTMLElement) => {
    const borrar = await within(dialogo).findByRole(
      "button",
      { name: "Sí, borrar definitivamente" },
      ESPERA,
    )
    act(() => borrar.focus())
    fireEvent.click(borrar)
    return borrar
  }

  it("ADM-1C11 (a): repetir «Sí, borrar definitivamente» pide otro DELETE; con 204 la fila sale y el texto desaparece", async () => {
    servidor.borrado = "copias"
    await montar("/admin/clases?estado=archivadas")
    const dialogo = await abrirElBorrado("Clase 5")
    const borrar = await pedirElBorrado(dialogo)
    expect(await within(dialogo).findByText(COPIAS_EN_CURSO, {}, ESPERA)).toBeInTheDocument()
    servidor.borrado = "ok"
    await waitFor(() => expect(borrar).not.toHaveAttribute("aria-busy"))
    fireEvent.click(borrar)
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), ESPERA)
    expect(pedidas("DELETE", () => true)).toHaveLength(2)
    await waitFor(() => expect(screen.queryByRole("link", { name: "Abrir Clase 5" })).toBeNull())
    expect(screen.queryByText(COPIAS_EN_CURSO)).toBeNull()
    expect(errores()).toEqual([])
  })

  // Las letras de ADM-1C11: (b) cerrar y volver a abrir; (c) pulsar «Clases» y volver a abrir.
  const CAMINOS_DE_1C11 = [
    ["(b) cerrar y volver a abrir", CAMINOS_DEL_DIALOGO[0]?.[1]],
    ["(c) pulsar «Clases» en la barra estando ahí", CAMINOS_DEL_DIALOGO[1]?.[1]],
  ] as const

  it.each(CAMINOS_DE_1C11)(
    "ADM-1C11 %s: al volver a abrir, el error ya no está, se vuelve a pedir el conteo y el botón está disponible",
    async (_camino, recorrer) => {
      if (recorrer === undefined) throw new Error("Precondición: el camino del diálogo")
      servidor.borrado = "copias"
      const router = await montar("/admin/clases?estado=archivadas")
      const dialogo = await abrirElBorrado("Clase 5")
      await pedirElBorrado(dialogo)
      expect(await within(dialogo).findByText(COPIAS_EN_CURSO, {}, ESPERA)).toBeInTheDocument()
      const antes = pedidasDelConteo().length
      await recorrer(router, dialogo)
      const otra = await abrirElBorrado("Clase 5")
      const boton = await within(otra).findByRole(
        "button",
        { name: "Sí, borrar definitivamente" },
        ESPERA,
      )
      expect(boton).not.toHaveAttribute("aria-busy")
      expect(within(otra).queryByText(COPIAS_EN_CURSO)).toBeNull()
      expect(within(otra).queryAllByRole("alert")).toHaveLength(0)
      expect(pedidasDelConteo().length).toBe(antes + 1)
    },
  )
})

describe("ADM-1C10: ARCHIVO_EN_COPIA en «Descargar» de un recurso, por cada camino", () => {
  const RUTA_RECURSOS = `/admin/clases/${CLASE_ID}/recursos`
  const pedidasDeDescarga = () => pedidas("POST", (u) => u.pathname.endsWith("/descarga"))
  const descargar = async () => {
    const ver = await screen.findByRole("button", { name: /^(Ver|Ocultar) recurso$/ }, ESPERA)
    if (ver.getAttribute("aria-expanded") !== "true") fireEvent.click(ver)
    const boton = await screen.findByRole("button", { name: "Descargar lectura.pdf" }, ESPERA)
    act(() => boton.focus())
    fireEvent.click(boton)
    return boton
  }
  const enLasSecciones = (nombre: string) =>
    within(screen.getByRole("list", { name: "Secciones de la clase" })).getByRole("link", {
      name: nombre,
    })

  const CAMINOS: [string, (router: Router) => Promise<void>][] = [
    ["(a) repetir «Descargar»", async () => undefined],
    [
      "(b) pulsar «Recursos» estando en la sección",
      async () => {
        fireEvent.click(enLasSecciones("Recursos"))
        await reposar()
      },
    ],
    [
      "(c) ir a «Avisos» y regresar antes del staleTime",
      async (router) => {
        fireEvent.click(enLasSecciones("Avisos"))
        await waitFor(() =>
          expect(router.state.location.pathname).toBe(`/admin/clases/${CLASE_ID}`),
        )
        await reposar()
        fireEvent.click(enLasSecciones("Recursos"))
        await reposar()
      },
    ],
  ]

  it.each(CAMINOS)(
    "ADM-1C10 %s: sale otra petición de la URL; un solo aviso por intento fallido y, con 200, el aviso no vuelve y la descarga sigue",
    async (_camino, recorrer) => {
      servidor.descarga = "en-copia"
      const router = await montar(RUTA_RECURSOS)
      await descargar()
      await waitFor(() => expect(errores()).toEqual([EN_COPIA]), ESPERA)
      expect(pedidasDeDescarga()).toHaveLength(1)

      await recorrer(router)
      await descargar()
      await waitFor(() => expect(pedidasDeDescarga()).toHaveLength(2), ESPERA)
      await waitFor(() => expect(errores()).toEqual([EN_COPIA, EN_COPIA]))

      servidor.descarga = "ok"
      await descargar()
      await waitFor(() =>
        expect(asignar).toHaveBeenCalledWith("https://almacen.ejemplo.mx/descarga/x"),
      )
      expect(pedidasDeDescarga()).toHaveLength(3)
      expect(errores()).toEqual([EN_COPIA, EN_COPIA])
    },
  )
})
