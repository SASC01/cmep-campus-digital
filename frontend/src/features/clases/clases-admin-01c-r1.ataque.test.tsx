import { onlineManager } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { StrictMode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// Tester, ADMIN-01c, ronda 1. /admin/clases y /admin/clases/:claseId/duplicar con el router real
// (`rutas` de app/router) y el QueryClient de app/providers.tsx (staleTime de 30 s, un reintento en
// las consultas): la clase que otra pestaña ya borró en el diálogo de borrado (N-01c-1), el foco tras
// borrar en estados vecinos, una acción en vuelo mientras la fila se desmonta y se vuelve a montar
// (cambio de pestaña, «Cancelar» de la confirmación), la recuperación de las listas, el control
// segmentado, duplicar y los nombres accesibles con nombres hostiles. Sin selectores de clases de
// estilo y sin reloj: nada compara fechas ni textos relativos al tiempo.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin") }))

const ESPERA = { timeout: 6000 }
const idClase = (n: number) => `7a7b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const ID_COPIA = idClase(90)
const LUIS = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const MARTA = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d10", nombre: "Marta Ruiz" }
const SOFIA = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11", nombre: "Sofía Gil" }
const ERROR_CONTEO = "No pudimos contar lo que se borraría. Cierra y vuelve a intentarlo."
const SIN_ACCESO = "No tienes acceso a esta clase."
const AVISO_DUPLICADA =
  "Clase duplicada. Los archivos de los recursos pueden tardar unos minutos en estar disponibles."

interface ClaseDoble {
  id: string
  nombre: string
  maestros: { id: string; nombre: string }[]
  alumnos: number
  creadoEn: string
  archivadaEn: string | null
}

const clase = (n: number, extra: Partial<ClaseDoble> = {}): ClaseDoble => ({
  id: idClase(n),
  nombre: `Clase ${String(n)}`,
  maestros: [LUIS],
  alumnos: n,
  creadoEn: "2026-09-01T15:00:00.000Z",
  archivadaEn: null,
  ...extra,
})
const archivada = (n: number, extra: Partial<ClaseDoble> = {}) =>
  clase(n, { archivadaEn: `2026-10-${String(n).padStart(2, "0")}T12:00:00.000Z`, ...extra })

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorJson = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })
const sinAcceso = () => errorJson(403, "SIN_ACCESO_A_LA_CLASE", SIN_ACCESO)

const detalle = (c: ClaseDoble) => ({
  clase: {
    id: c.id,
    nombre: c.nombre,
    descripcion: null,
    maestro: LUIS,
    maestros: [LUIS],
    archivadaEn: c.archivadaEn,
  },
})

const diferido = () => {
  let resolver: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver }
}

interface Llamada {
  metodo: string
  url: URL
}

// El servidor de la prueba: las dos listas son su estado, y cada caso puede contestar antes que él.
const servidor = {
  activas: [] as ClaseDoble[],
  archivadas: [] as ClaseDoble[],
  // Clases que ya no existen para el servidor (otra pestaña las borró): 403 en todo lo de la clase.
  borradas: new Set<string>(),
  listaEnError: { activas: false, archivadas: false },
}
let llamadas: Llamada[] = []
let manejador: (llamada: Llamada) => Response | Promise<Response> | undefined = () => undefined

const porDefecto = (llamada: Llamada): Response => {
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
    const lista = url.searchParams.get("estado") === "archivadas" ? "archivadas" : "activas"
    if (servidor.listaEnError[lista]) return errorJson(500, "ERROR_INTERNO", "Falló.")
    const clases = servidor[lista].filter((c) => !servidor.borradas.has(c.id))
    return respuestaJson(200, {
      clases,
      total: clases.length,
      siguienteCursor: null,
      siguienteCursorArchivadaEn: null,
    })
  }
  const accion =
    /^\/api\/admin\/clases\/([^/]+)\/(archivar|restaurar|conteo-de-borrado|duplicar)$/.exec(
      url.pathname,
    )
  const id = accion?.[1] ?? ""
  if (accion !== null && servidor.borradas.has(id)) return sinAcceso()
  if (accion?.[2] === "archivar") {
    const fila = servidor.activas.find((c) => c.id === id)
    if (fila === undefined)
      return errorJson(409, "CLASE_YA_ARCHIVADA", "La clase ya está archivada.")
    servidor.activas = servidor.activas.filter((c) => c.id !== id)
    servidor.archivadas.unshift({ ...fila, archivadaEn: "2026-10-28T12:00:00.000Z" })
    return respuestaJson(200, detalle(fila))
  }
  if (accion?.[2] === "restaurar") {
    const fila = servidor.archivadas.find((c) => c.id === id)
    if (fila === undefined)
      return errorJson(409, "CLASE_NO_ARCHIVADA", "La clase no está archivada.")
    servidor.archivadas = servidor.archivadas.filter((c) => c.id !== id)
    servidor.activas.unshift({ ...fila, archivadaEn: null })
    return respuestaJson(200, detalle(fila))
  }
  if (accion?.[2] === "conteo-de-borrado") {
    return respuestaJson(200, {
      alumnos: 1,
      actividades: 2,
      entregas: 3,
      calificaciones: 4,
      archivos: 5,
    })
  }
  if (accion?.[2] === "duplicar") {
    return respuestaJson(201, detalle(clase(90, { nombre: "Copia" })))
  }
  const borrar = /^\/api\/admin\/clases\/([^/]+)$/.exec(url.pathname)
  if (metodo === "DELETE" && borrar !== null) {
    const objetivo = borrar[1] ?? ""
    if (servidor.borradas.has(objetivo)) return sinAcceso()
    servidor.archivadas = servidor.archivadas.filter((c) => c.id !== objetivo)
    servidor.borradas.add(objetivo)
    return new Response(null, { status: 204 })
  }
  if (url.pathname === "/api/admin/maestros/candidatos") {
    const q = (url.searchParams.get("q") ?? "").toLowerCase()
    const candidatos = [MARTA, SOFIA]
      .filter((m) => m.nombre.toLowerCase().includes(q))
      .map((m) => ({ ...m, email: `${m.nombre.split(" ")[0]?.toLowerCase() ?? "x"}@ejemplo.mx` }))
    return respuestaJson(200, { candidatos, hayMas: false })
  }
  const deLaClase = /^\/api\/clases\/([^/]+)(\/[^?]*)?$/.exec(url.pathname)
  if (metodo === "GET" && deLaClase !== null) {
    const idDeLaClase = deLaClase[1] ?? ""
    if (servidor.borradas.has(idDeLaClase)) return sinAcceso()
    const resto = deLaClase[2] ?? ""
    if (resto === "") {
      const fila = [...servidor.activas, ...servidor.archivadas].find((c) => c.id === idDeLaClase)
      return respuestaJson(200, detalle(fila ?? clase(90, { id: idDeLaClase, nombre: "Copia" })))
    }
    if (resto === "/codigo") return respuestaJson(200, { codigo: "ABCDEFG" })
    if (resto === "/publicaciones") {
      return respuestaJson(200, { publicaciones: [], siguienteCursor: null })
    }
  }
  return errorJson(500, "ERROR_INTERNO", "no esperada")
}

const montar = async (entrada: string, estricto = false) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [entrada] })
  const arbol = (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  )
  render(estricto ? <StrictMode>{arbol}</StrictMode> : arbol)
  return router
}

const reposar = (ms = 150) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))
const pedidas = (metodo: string, filtro: (url: URL) => boolean) =>
  llamadas.filter((l) => l.metodo === metodo && filtro(l.url))
const deLaLista = (estado: "activas" | "archivadas") => (url: URL) =>
  url.pathname === "/api/admin/clases" && url.searchParams.get("estado") === estado
const terminaEn = (sufijo: string) => (url: URL) => url.pathname.endsWith(sufijo)

const abrirElBorrado = async (nombre: string) => {
  fireEvent.click(
    await screen.findByRole("button", { name: `Borrar definitivamente ${nombre}` }, ESPERA),
  )
  return screen.findByRole("dialog", { name: `Borrar definitivamente «${nombre}»` }, ESPERA)
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  servidor.activas = []
  servidor.archivadas = []
  servidor.borradas = new Set()
  servidor.listaEnError = { activas: false, archivadas: false }
  llamadas = []
  manejador = () => undefined
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = new URL(String(entrada), "http://localhost")
      const llamada = { metodo: init?.method ?? "GET", url }
      llamadas.push(llamada)
      return Promise.resolve(manejador(llamada) ?? porDefecto(llamada))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("ataque ADMIN-01c r1: la clase que otra pestaña ya borró, en el diálogo de borrado (N-01c-1)", () => {
  it("ADM-T1C01: el conteo responde 403 SIN_ACCESO_A_LA_CLASE: la frase «Cierra y vuelve a intentarlo» se cumple, al cerrar la clase ya no se ofrece para borrar", async () => {
    servidor.archivadas = [archivada(5), archivada(6)]
    await montar("/admin/clases?estado=archivadas")
    await screen.findByRole("button", { name: "Borrar definitivamente Clase 5" }, ESPERA)
    // Otra pestaña la borró: desde ahora el servidor no la tiene.
    servidor.borradas.add(idClase(5))
    const dialogo = await abrirElBorrado("Clase 5")
    expect(await within(dialogo).findByText(ERROR_CONTEO, {}, ESPERA)).toBeInTheDocument()
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    // Cerrar y volver a intentar solo se cumple si la fila de una clase que ya no existe sale:
    // si se queda, volver a abrir da el mismo 403 y la misma frase, para siempre.
    await waitFor(
      () =>
        expect(
          screen.queryByRole("button", { name: "Borrar definitivamente Clase 5" }),
          "la fila de la clase que ya no existe sigue ofreciendo «Borrar definitivamente»",
        ).toBeNull(),
      ESPERA,
    )
    expect(
      screen.getByRole("button", { name: "Borrar definitivamente Clase 6" }),
    ).toBeInTheDocument()
  })

  it("ADM-T1C02: «Sí, borrar definitivamente» responde 403 SIN_ACCESO_A_LA_CLASE (otra pestaña ya la borró): la fila no se queda en la lista", async () => {
    servidor.archivadas = [archivada(5), archivada(6)]
    await montar("/admin/clases?estado=archivadas")
    const dialogo = await abrirElBorrado("Clase 5")
    const si = await within(dialogo).findByRole(
      "button",
      { name: "Sí, borrar definitivamente" },
      ESPERA,
    )
    servidor.borradas.add(idClase(5))
    fireEvent.click(si)
    await waitFor(
      () => expect(pedidas("DELETE", terminaEn(`/clases/${idClase(5)}`))).toHaveLength(1),
      ESPERA,
    )
    await reposar(300)
    const sigueAbierto = screen.queryByRole("dialog")
    if (sigueAbierto !== null) {
      fireEvent.click(within(sigueAbierto).getByRole("button", { name: "Cancelar" }))
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    }
    await waitFor(
      () =>
        expect(
          screen.queryByRole("button", { name: "Borrar definitivamente Clase 5" }),
          "la fila de la clase que ya no existe se queda en «Archivadas»",
        ).toBeNull(),
      ESPERA,
    )
  })
})

describe("ataque ADMIN-01c r1: el foco tras borrar y al cerrar el diálogo, en estados vecinos", () => {
  it("ADM-T1C03: al borrar la única clase de «Archivadas», el foco va al encabezado «Clases», nunca a <body>", async () => {
    servidor.archivadas = [archivada(5)]
    await montar("/admin/clases?estado=archivadas")
    const dialogo = await abrirElBorrado("Clase 5")
    fireEvent.click(
      await within(dialogo).findByRole("button", { name: "Sí, borrar definitivamente" }, ESPERA),
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), ESPERA)
    await screen.findByText("Aún no hay clases archivadas", {}, ESPERA)
    await reposar()
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 1, name: "Clases" }))
    expect(aviso.success).toHaveBeenCalledTimes(1)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("ADM-T1C04: Escape cierra el diálogo y el foco vuelve al «Borrar definitivamente» que lo abrió; con el borrado en vuelo, ni Escape ni «Cancelar» lo cierran y el foco no cae en <body>", async () => {
    servidor.archivadas = [archivada(5), archivada(6)]
    await montar("/admin/clases?estado=archivadas")
    let dialogo = await abrirElBorrado("Clase 6")
    await within(dialogo).findByRole("button", { name: "Sí, borrar definitivamente" }, ESPERA)
    fireEvent.keyDown(dialogo, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Borrar definitivamente Clase 6" })).toHaveFocus(),
    )

    const pendiente = diferido()
    manejador = ({ metodo }) => (metodo === "DELETE" ? pendiente.promesa : undefined)
    dialogo = await abrirElBorrado("Clase 6")
    const si = await within(dialogo).findByRole(
      "button",
      { name: "Sí, borrar definitivamente" },
      ESPERA,
    )
    act(() => si.focus())
    fireEvent.click(si)
    await waitFor(() => expect(si).toHaveAttribute("aria-busy", "true"))
    fireEvent.keyDown(dialogo, { key: "Escape" })
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
    await reposar()
    expect(screen.getByRole("dialog")).toBe(dialogo)
    expect(document.activeElement).not.toBe(document.body)
    expect(dialogo.contains(document.activeElement)).toBe(true)
    await act(async () => {
      servidor.archivadas = servidor.archivadas.filter((c) => c.id !== idClase(6))
      pendiente.resolver(new Response(null, { status: 204 }))
      await pendiente.promesa
    })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), ESPERA)
    await reposar()
    expect(screen.getByRole("button", { name: "Borrar definitivamente Clase 5" })).toHaveFocus()
    expect(pedidas("DELETE", () => true)).toHaveLength(1)
  })

  it("ADM-T1C05: con el DELETE en vuelo la persona sale de la vista: al responder, un solo aviso de éxito, ninguno de error, y al volver la fila ya no está", async () => {
    servidor.archivadas = [archivada(5), archivada(6)]
    const router = await montar("/admin/clases?estado=archivadas")
    const pendiente = diferido()
    manejador = ({ metodo }) => (metodo === "DELETE" ? pendiente.promesa : undefined)
    const dialogo = await abrirElBorrado("Clase 5")
    fireEvent.click(
      await within(dialogo).findByRole("button", { name: "Sí, borrar definitivamente" }, ESPERA),
    )
    await waitFor(() => expect(pedidas("DELETE", () => true)).toHaveLength(1))
    await act(async () => {
      await router.navigate("/admin/clases/nueva")
    })
    await screen.findByLabelText("Nombre de la clase", {}, ESPERA)
    await act(async () => {
      servidor.archivadas = servidor.archivadas.filter((c) => c.id !== idClase(5))
      pendiente.resolver(new Response(null, { status: 204 }))
      await pendiente.promesa
    })
    await reposar(300)
    expect(aviso.success).toHaveBeenCalledTimes(1)
    expect(aviso.error).not.toHaveBeenCalled()
    await act(async () => {
      await router.navigate("/admin/clases?estado=archivadas")
    })
    await screen.findByRole("button", { name: "Borrar definitivamente Clase 6" }, ESPERA)
    expect(screen.queryByRole("button", { name: "Borrar definitivamente Clase 5" })).toBeNull()
  })
})

describe("ataque ADMIN-01c r1: una acción en vuelo mientras su fila se desmonta y se vuelve a montar", () => {
  it("ADM-T1C06: «Restaurar» en vuelo, la persona va a «Activas» y regresa a «Archivadas»: el «Restaurar» de esa fila no manda otra petición y sale un solo aviso", async () => {
    servidor.archivadas = [archivada(5), archivada(6)]
    servidor.activas = [clase(1)]
    await montar("/admin/clases?estado=archivadas")
    const pendiente = diferido()
    manejador = ({ url }) => (url.pathname.endsWith("/restaurar") ? pendiente.promesa : undefined)
    fireEvent.click(await screen.findByRole("button", { name: "Restaurar Clase 5" }, ESPERA))
    await waitFor(() => expect(pedidas("POST", terminaEn("/restaurar"))).toHaveLength(1))
    fireEvent.click(screen.getByRole("button", { name: "Activas" }))
    await screen.findByRole("link", { name: "Abrir Clase 1" }, ESPERA)
    fireEvent.click(screen.getByRole("button", { name: "Archivadas" }))
    const otraVez = await screen.findByRole("button", { name: "Restaurar Clase 5" }, ESPERA)
    fireEvent.click(otraVez)
    await reposar()
    expect(
      pedidas("POST", terminaEn("/restaurar")),
      "la fila vuelta a montar mandó otro POST de restaurar con el primero en vuelo",
    ).toHaveLength(1)
    await act(async () => {
      pendiente.resolver(respuestaJson(200, detalle(archivada(5))))
      await pendiente.promesa
    })
    await reposar(300)
    expect(aviso.success).toHaveBeenCalledTimes(1)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("ADM-T1C07: «Sí, archivar» en vuelo y «Cancelar»: la confirmación no se puede volver a abrir y mandar otro POST mientras el primero sigue en vuelo", async () => {
    servidor.activas = [clase(1), clase(2)]
    await montar("/admin/clases")
    const pendiente = diferido()
    manejador = ({ url }) => (url.pathname.endsWith("/archivar") ? pendiente.promesa : undefined)
    fireEvent.click(await screen.findByRole("button", { name: "Archivar Clase 1" }, ESPERA))
    fireEvent.click(await screen.findByRole("button", { name: "Sí, archivar Clase 1" }))
    await waitFor(() => expect(pedidas("POST", terminaEn("/archivar"))).toHaveLength(1))
    fireEvent.click(screen.getByRole("button", { name: "Cancelar Clase 1" }))
    const archivar = screen.queryByRole("button", { name: "Archivar Clase 1" })
    if (archivar !== null) {
      fireEvent.click(archivar)
      const si = screen.queryByRole("button", { name: "Sí, archivar Clase 1" })
      if (si !== null) fireEvent.click(si)
    }
    await reposar()
    expect(
      pedidas("POST", terminaEn("/archivar")),
      "«Cancelar» con el archivado en vuelo permite confirmarlo otra vez y manda un segundo POST",
    ).toHaveLength(1)
    await act(async () => {
      pendiente.resolver(respuestaJson(200, detalle(clase(1))))
      await pendiente.promesa
    })
    await reposar(300)
    expect(aviso.success).toHaveBeenCalledTimes(1)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("ADM-T1C08: «Sí, archivar» en vuelo, la persona va a «Archivadas» y regresa a «Activas»: no se puede confirmar otra vez y mandar otro POST", async () => {
    servidor.activas = [clase(1), clase(2)]
    servidor.archivadas = [archivada(5)]
    await montar("/admin/clases")
    const pendiente = diferido()
    manejador = ({ url }) => (url.pathname.endsWith("/archivar") ? pendiente.promesa : undefined)
    fireEvent.click(await screen.findByRole("button", { name: "Archivar Clase 1" }, ESPERA))
    fireEvent.click(await screen.findByRole("button", { name: "Sí, archivar Clase 1" }))
    await waitFor(() => expect(pedidas("POST", terminaEn("/archivar"))).toHaveLength(1))
    fireEvent.click(screen.getByRole("button", { name: "Archivadas" }))
    await screen.findByRole("button", { name: "Restaurar Clase 5" }, ESPERA)
    fireEvent.click(screen.getByRole("button", { name: "Activas" }))
    const archivar = await screen.findByRole("button", { name: "Archivar Clase 1" }, ESPERA)
    fireEvent.click(archivar)
    const si = screen.queryByRole("button", { name: "Sí, archivar Clase 1" })
    if (si !== null) fireEvent.click(si)
    await reposar()
    expect(
      pedidas("POST", terminaEn("/archivar")),
      "la fila vuelta a montar mandó otro POST de archivar con el primero en vuelo",
    ).toHaveLength(1)
    await act(async () => {
      pendiente.resolver(respuestaJson(200, detalle(clase(1))))
      await pendiente.promesa
    })
    await reposar(300)
    expect(aviso.success).toHaveBeenCalledTimes(1)
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

describe("ataque ADMIN-01c r1: recuperar las listas (useRecuperarListaDeClasesAdmin)", () => {
  it("ADM-T1C09: con las dos pestañas en error, salir y volver antes del staleTime pide otra vez las dos y, si responden, el texto de error desaparece", async () => {
    servidor.activas = [clase(1)]
    servidor.archivadas = [archivada(5)]
    servidor.listaEnError = { activas: true, archivadas: true }
    const router = await montar("/admin/clases")
    await screen.findByText(
      "No pudimos cargar las clases. Revisa tu conexión e inténtalo de nuevo.",
      {},
      ESPERA,
    )
    fireEvent.click(screen.getByRole("button", { name: "Archivadas" }))
    await waitFor(
      () => expect(pedidas("GET", deLaLista("archivadas")).length).toBeGreaterThanOrEqual(2),
      ESPERA,
    )
    await screen.findByText(
      "No pudimos cargar las clases. Revisa tu conexión e inténtalo de nuevo.",
      {},
      ESPERA,
    )
    servidor.listaEnError = { activas: false, archivadas: false }
    await act(async () => {
      await router.navigate("/admin/clases/nueva")
    })
    await screen.findByLabelText("Nombre de la clase", {}, ESPERA)
    const antesActivas = pedidas("GET", deLaLista("activas")).length
    const antesArchivadas = pedidas("GET", deLaLista("archivadas")).length
    await act(async () => {
      await router.navigate("/admin/clases")
    })
    await screen.findByRole("link", { name: "Abrir Clase 1" }, ESPERA)
    expect(pedidas("GET", deLaLista("activas")).length).toBe(antesActivas + 1)
    fireEvent.click(screen.getByRole("button", { name: "Archivadas" }))
    await screen.findByRole("button", { name: "Restaurar Clase 5" }, ESPERA)
    expect(pedidas("GET", deLaLista("archivadas")).length).toBe(antesArchivadas + 1)
    expect(
      screen.queryByText("No pudimos cargar las clases. Revisa tu conexión e inténtalo de nuevo."),
    ).toBeNull()
  })

  it("ADM-T1C10: con StrictMode (doble montaje), una lista sana se pide una sola vez y no sale de la caché: ir y volver antes del staleTime no la vuelve a pedir", async () => {
    servidor.activas = [clase(1)]
    const router = await montar("/admin/clases", true)
    await screen.findByRole("link", { name: "Abrir Clase 1" }, ESPERA)
    await reposar()
    expect(pedidas("GET", deLaLista("activas"))).toHaveLength(1)
    await act(async () => {
      await router.navigate("/admin/clases/nueva")
    })
    await screen.findByLabelText("Nombre de la clase", {}, ESPERA)
    await act(async () => {
      await router.navigate("/admin/clases")
    })
    await screen.findByRole("link", { name: "Abrir Clase 1" }, ESPERA)
    await reposar()
    expect(pedidas("GET", deLaLista("activas"))).toHaveLength(1)
  })
})

describe("ataque ADMIN-01c r1: el control segmentado «Estado de las clases»", () => {
  it("ADM-T1C11: pulsar la pestaña activa no escribe en el historial ni pide nada; el estado se dice con aria-pressed y un icono, no solo con color", async () => {
    servidor.activas = [clase(1)]
    const router = await montar("/admin/clases")
    await screen.findByRole("link", { name: "Abrir Clase 1" }, ESPERA)
    const grupo = screen.getByRole("group", { name: "Estado de las clases" })
    const activas = within(grupo).getByRole("button", { name: "Activas" })
    const archivadas = within(grupo).getByRole("button", { name: "Archivadas" })
    expect(activas).toHaveAttribute("aria-pressed", "true")
    expect(archivadas).toHaveAttribute("aria-pressed", "false")
    expect(activas.querySelector("svg")).not.toBeNull()
    expect(archivadas.querySelector("svg")).toBeNull()
    const clave = router.state.location.key
    const peticiones = llamadas.length
    fireEvent.click(activas)
    fireEvent.click(activas)
    await reposar()
    expect(router.state.location.key).toBe(clave)
    expect(router.state.location.search).toBe("")
    expect(llamadas.length).toBe(peticiones)
  })

  it.each(["?estado=otra", "?estado=ARCHIVADAS", "?estado=", "?estado=archivadas%00"])(
    "ADM-T1C12: con %s la vista abre en «Activas», pide estado=activas y no reescribe la URL",
    async (consulta) => {
      servidor.activas = [clase(1)]
      servidor.archivadas = [archivada(5)]
      const router = await montar(`/admin/clases${consulta}`)
      await screen.findByRole("link", { name: "Abrir Clase 1" }, ESPERA)
      expect(screen.getByRole("button", { name: "Activas" })).toHaveAttribute(
        "aria-pressed",
        "true",
      )
      expect(pedidas("GET", deLaLista("archivadas"))).toHaveLength(0)
      expect(pedidas("GET", (u) => u.pathname === "/api/admin/clases")).toHaveLength(1)
      expect(router.state.location.search).toBe(consulta)
    },
  )
})

describe("ataque ADMIN-01c r1: duplicar", () => {
  const elegir = async (maestro: { nombre: string }) => {
    const campo = await screen.findByLabelText("Buscar maestro por nombre", {}, ESPERA)
    fireEvent.change(campo, { target: { value: maestro.nombre.slice(0, 5) } })
    fireEvent.click(await screen.findByRole("button", { name: `Elegir ${maestro.nombre}` }, ESPERA))
    await screen.findByRole("button", { name: `Quitar ${maestro.nombre}` })
    fireEvent.change(campo, { target: { value: "" } })
  }

  it("ADM-T1C13: dos Enter seguidos en «Nombre de la clase» mandan un solo POST; al terminar, un solo aviso y la ruta de la copia", async () => {
    servidor.activas = [clase(1)]
    const router = await montar(`/admin/clases/${idClase(1)}/duplicar`)
    const nombre = await screen.findByLabelText("Nombre de la clase", {}, ESPERA)
    expect(nombre).toHaveValue("Clase 1")
    await elegir(MARTA)
    const formulario = nombre.closest("form")
    if (formulario === null) throw new Error("Precondición: el campo vive en un formulario")
    fireEvent.submit(formulario)
    fireEvent.submit(formulario)
    await waitFor(
      () => expect(router.state.location.pathname).toBe(`/admin/clases/${ID_COPIA}`),
      ESPERA,
    )
    expect(pedidas("POST", terminaEn("/duplicar"))).toHaveLength(1)
    expect(aviso.success).toHaveBeenCalledTimes(1)
    expect(aviso.success).toHaveBeenCalledWith(AVISO_DUPLICADA)
  })

  it("ADM-T1C14: 404 MAESTRO_NO_ENCONTRADO y después quitar a ese maestro y elegir a otro: el error del selector se va y el siguiente envío lleva solo al maestro nuevo", async () => {
    servidor.activas = [clase(1)]
    let primera = true
    manejador = ({ metodo, url }) => {
      if (metodo !== "POST" || !url.pathname.endsWith("/duplicar") || !primera) return undefined
      primera = false
      return errorJson(404, "MAESTRO_NO_ENCONTRADO", "No encontramos a ese maestro.")
    }
    const router = await montar(`/admin/clases/${idClase(1)}/duplicar`)
    await screen.findByLabelText("Nombre de la clase", {}, ESPERA)
    await elegir(MARTA)
    fireEvent.click(screen.getByRole("button", { name: "Duplicar clase" }))
    const grupo = screen.getByRole("group", { name: "Maestros de la clase" })
    await within(grupo).findByText("No encontramos a ese maestro.", {}, ESPERA)
    fireEvent.click(screen.getByRole("button", { name: "Quitar Marta Ruiz" }))
    await elegir(SOFIA)
    expect(within(grupo).queryByText("No encontramos a ese maestro.")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Duplicar clase" }))
    await waitFor(
      () => expect(router.state.location.pathname).toBe(`/admin/clases/${ID_COPIA}`),
      ESPERA,
    )
    expect(aviso.error).not.toHaveBeenCalled()
    expect(aviso.success).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["201", () => respuestaJson(201, detalle(clase(90, { nombre: "Copia" }))), "success"],
    [
      "409 CLASE_CON_COPIAS_EN_CURSO",
      () =>
        errorJson(
          409,
          "CLASE_CON_COPIAS_EN_CURSO",
          "Esta clase tiene archivos que todavía se están copiando. Inténtalo en unos minutos.",
        ),
      "error",
    ],
  ] as const)(
    "ADM-T1C15: con el POST en vuelo la persona sale de la vista; al responder %s, un solo aviso y nadie la lleva a otra ruta",
    async (_caso, respuesta, tipo) => {
      servidor.activas = [clase(1)]
      const pendiente = diferido()
      manejador = ({ metodo, url }) =>
        metodo === "POST" && url.pathname.endsWith("/duplicar") ? pendiente.promesa : undefined
      const router = await montar(`/admin/clases/${idClase(1)}/duplicar`)
      await screen.findByLabelText("Nombre de la clase", {}, ESPERA)
      await elegir(MARTA)
      fireEvent.click(screen.getByRole("button", { name: "Duplicar clase" }))
      await waitFor(() => expect(pedidas("POST", terminaEn("/duplicar"))).toHaveLength(1))
      await act(async () => {
        await router.navigate("/admin/clases")
      })
      await screen.findByRole("group", { name: "Estado de las clases" }, ESPERA)
      await act(async () => {
        pendiente.resolver(respuesta())
        await pendiente.promesa
      })
      await reposar(300)
      expect(router.state.location.pathname).toBe("/admin/clases")
      const avisos = aviso.success.mock.calls.length + aviso.error.mock.calls.length
      expect(avisos).toBe(1)
      expect(aviso[tipo]).toHaveBeenCalledTimes(1)
    },
  )

  it("ADM-T1C16: duplicar una clase archivada abre el formulario con su nombre y manda el POST; una clase que ya no existe no muestra el formulario ni manda nada", async () => {
    servidor.archivadas = [archivada(5)]
    await montar(`/admin/clases/${idClase(5)}/duplicar`)
    expect(await screen.findByLabelText("Nombre de la clase", {}, ESPERA)).toHaveValue("Clase 5")
    await elegir(MARTA)
    fireEvent.click(screen.getByRole("button", { name: "Duplicar clase" }))
    await waitFor(() => expect(pedidas("POST", terminaEn("/duplicar"))).toHaveLength(1), ESPERA)
    cleanup()

    servidor.borradas.add(idClase(7))
    llamadas = []
    await montar(`/admin/clases/${idClase(7)}/duplicar`)
    await waitFor(
      () =>
        expect(
          pedidas("GET", (u) => u.pathname === `/api/clases/${idClase(7)}`).length,
        ).toBeGreaterThan(0),
      ESPERA,
    )
    await reposar(1500)
    expect(screen.queryByLabelText("Nombre de la clase")).toBeNull()
    expect(screen.queryByRole("button", { name: "Duplicar clase" })).toBeNull()
    expect(pedidas("POST", () => true)).toHaveLength(0)
  })
})

describe("ataque ADMIN-01c r1: nombres accesibles con nombres hostiles (N-01c-3)", () => {
  const html = '<img src="x" onerror="alert(1)">'
  const largo = "W".repeat(120)

  it("ADM-T1C17: cada botón y enlace de la fila, la confirmación y el diálogo se encuentran por su nombre completo, que empieza con el texto visible; ningún HTML se interpreta", async () => {
    servidor.activas = [clase(1, { nombre: html }), clase(2, { nombre: largo })]
    servidor.archivadas = [archivada(5, { nombre: html })]
    await montar("/admin/clases")
    const tabla = await screen.findByRole("table", {}, ESPERA)
    for (const nombre of [html, largo]) {
      expect(within(tabla).getByRole("link", { name: `Abrir ${nombre}` })).toBeInTheDocument()
      expect(within(tabla).getByRole("link", { name: `Duplicar ${nombre}` })).toBeInTheDocument()
      const archivar = within(tabla).getByRole("button", { name: `Archivar ${nombre}` })
      expect(archivar.textContent?.startsWith("Archivar")).toBe(true)
    }
    fireEvent.click(within(tabla).getByRole("button", { name: `Archivar ${html}` }))
    expect(await screen.findByRole("button", { name: `Sí, archivar ${html}` })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: `Cancelar ${html}` })).toHaveFocus()
    expect(tabla.querySelectorAll("img, script")).toHaveLength(0)
    fireEvent.click(screen.getByRole("button", { name: `Cancelar ${html}` }))

    fireEvent.click(screen.getByRole("button", { name: "Archivadas" }))
    await screen.findByRole("button", { name: `Restaurar ${html}` }, ESPERA)
    const dialogo = await abrirElBorrado(html)
    expect(dialogo.querySelectorAll("img, script")).toHaveLength(0)
    expect(document.querySelectorAll("main img, main script")).toHaveLength(0)
  })
})

describe("ataque ADMIN-01c r1: el conteo se vuelve a pedir con el diálogo abierto (N-01c-2)", () => {
  it("ADM-T1C18: volver a la ventana (focus y visibilitychange) con el diálogo abierto no vuelve a pedir el conteo", async () => {
    servidor.archivadas = [archivada(5)]
    await montar("/admin/clases?estado=archivadas")
    const dialogo = await abrirElBorrado("Clase 5")
    await within(dialogo).findByRole("button", { name: "Sí, borrar definitivamente" }, ESPERA)
    const antes = pedidas("GET", terminaEn("/conteo-de-borrado")).length
    act(() => {
      window.dispatchEvent(new Event("focus"))
      document.dispatchEvent(new Event("visibilitychange"))
    })
    await reposar(300)
    expect(pedidas("GET", terminaEn("/conteo-de-borrado"))).toHaveLength(antes)
  })

  it("ADM-T1C19: al recuperar la conexión con el diálogo abierto, si el conteo que se vuelve a pedir falla, el diálogo no dice a la vez «Cierra y vuelve a intentarlo» y ofrece «Sí, borrar definitivamente»", async () => {
    servidor.archivadas = [archivada(5)]
    await montar("/admin/clases?estado=archivadas")
    const dialogo = await abrirElBorrado("Clase 5")
    await within(dialogo).findByRole("button", { name: "Sí, borrar definitivamente" }, ESPERA)
    manejador = ({ url }) =>
      url.pathname.endsWith("/conteo-de-borrado")
        ? errorJson(500, "ERROR_INTERNO", "Falló.")
        : undefined
    const antes = pedidas("GET", terminaEn("/conteo-de-borrado")).length
    act(() => onlineManager.setOnline(false))
    act(() => onlineManager.setOnline(true))
    await waitFor(
      () => expect(pedidas("GET", terminaEn("/conteo-de-borrado")).length).toBeGreaterThan(antes),
      ESPERA,
    )
    await reposar(2500)
    const frase = within(dialogo).queryByText(ERROR_CONTEO)
    const boton = within(dialogo).queryByRole("button", { name: "Sí, borrar definitivamente" })
    expect(
      frase !== null && boton !== null,
      "el diálogo pide cerrar y volver a intentar y, a la vez, ofrece borrar",
    ).toBe(false)
  })
})
