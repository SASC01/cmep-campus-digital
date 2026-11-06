import { onlineManager } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// Tester, ADMIN-01c, ronda 2. Ataque a la corrección de la ronda 1 (T-01, T-02, T-03 y M-02 del
// manager) con el router real (`rutas` de app/router) y el QueryClient de app/providers.tsx (staleTime
// de 30 s, un reintento en las consultas): el foco al cerrar el diálogo cuando su fila ya salió en
// estados que las pruebas del programador no cubren (dos filas a la vez, la lista que vuelve a una sola
// página, después de cambiar de pestaña), la reconexión con el borrado en vuelo, dos acciones sobre la
// misma clase, el conteo con 403 y su reintento, y la espera de archivar después de un 5xx. Las ayudas
// son las de clases-admin-01c-r1.ataque.test.tsx. Sin selectores de clases de estilo y sin reloj.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin") }))

const ESPERA = { timeout: 6000 }
const idClase = (n: number) => `7a7b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const LUIS = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const MARTA = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d10", nombre: "Marta Ruiz" }
const SOFIA = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11", nombre: "Sofía Gil" }
const ERROR_CONTEO = "No pudimos contar lo que se borraría. Cierra y vuelve a intentarlo."
const SIN_ACCESO = "No tienes acceso a esta clase."

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

const montar = async (entrada: string) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [entrada] })
  const arbol = (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  )
  render(arbol)
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

// La lista de «Archivadas» en páginas de dos, con el cursor y la posición del servidor.
const archivadasEnPaginasDeDos = ({ metodo, url }: Llamada): Response | undefined => {
  if (metodo !== "GET" || !deLaLista("archivadas")(url)) return undefined
  const todas = servidor.archivadas.filter((c) => !servidor.borradas.has(c.id))
  const cursor = url.searchParams.get("cursor")
  const desde = cursor === null ? 0 : todas.findIndex((c) => c.id === cursor) + 1
  const pagina = todas.slice(desde, desde + 2)
  const hayMas = desde + 2 < todas.length
  const ultima = pagina.at(-1)
  return respuestaJson(200, {
    clases: pagina,
    total: todas.length,
    siguienteCursor: hayMas && ultima !== undefined ? ultima.id : null,
    siguienteCursorArchivadaEn: hayMas && ultima !== undefined ? ultima.archivadaEn : null,
  })
}

describe("ataque ADMIN-01c r2: el foco al cerrar el diálogo cuando su fila ya salió (M-02), en estados vecinos", () => {
  it("ADM-T2C01: con el diálogo abierto salen dos filas a la vez, la del diálogo y la anterior: al cerrar, el foco va a un «Borrar definitivamente» de las que quedan, nunca a <body>", async () => {
    servidor.archivadas = [archivada(5), archivada(6), archivada(7), archivada(8)]
    await montar("/admin/clases?estado=archivadas")
    await screen.findByRole("button", { name: "Borrar definitivamente Clase 8" }, ESPERA)
    // Otra pestaña borró la 5 y la 6; el conteo de la 6 responde 403 y renueva la lista.
    servidor.borradas.add(idClase(5))
    servidor.borradas.add(idClase(6))
    const dialogo = await abrirElBorrado("Clase 6")
    await within(dialogo).findByText(ERROR_CONTEO, {}, ESPERA)
    await waitFor(
      () => expect(screen.queryByRole("link", { name: "Abrir Clase 5" })).toBeNull(),
      ESPERA,
    )
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await reposar()
    const activo = document.activeElement
    expect(activo).not.toBe(document.body)
    const candidatas = [7, 8].map((n) =>
      screen.getByRole("button", { name: `Borrar definitivamente Clase ${String(n)}` }),
    )
    expect(candidatas).toContain(activo)
  })

  it("ADM-T2C02: con dos páginas cargadas y el diálogo de la última fila abierto, la lista renovada vuelve a una sola página: al cerrar, el foco va a la fila anterior", async () => {
    servidor.archivadas = [archivada(5), archivada(6), archivada(7)]
    manejador = archivadasEnPaginasDeDos
    await montar("/admin/clases?estado=archivadas")
    fireEvent.click(await screen.findByRole("button", { name: "Cargar más clases" }, ESPERA))
    await screen.findByRole("button", { name: "Borrar definitivamente Clase 7" }, ESPERA)
    expect(screen.queryByRole("button", { name: "Cargar más clases" })).toBeNull()
    servidor.borradas.add(idClase(7))
    const dialogo = await abrirElBorrado("Clase 7")
    await within(dialogo).findByText(ERROR_CONTEO, {}, ESPERA)
    await waitFor(
      () => expect(screen.queryByRole("link", { name: "Abrir Clase 7" })).toBeNull(),
      ESPERA,
    )
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await reposar()
    expect(screen.getByRole("button", { name: "Borrar definitivamente Clase 6" })).toHaveFocus()
  })

  it("ADM-T2C03: abrir y cerrar el diálogo, ir a «Activas», archivar ahí una clase y regresar: al quitar otra fila, el foco no usa un lugar de antes y va a la siguiente de la lista nueva", async () => {
    servidor.activas = [clase(1), clase(2)]
    servidor.archivadas = [archivada(5), archivada(6), archivada(7)]
    await montar("/admin/clases?estado=archivadas")
    let dialogo = await abrirElBorrado("Clase 7")
    await within(dialogo).findByRole("button", { name: "Sí, borrar definitivamente" }, ESPERA)
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    fireEvent.click(screen.getByRole("button", { name: "Activas" }))
    fireEvent.click(await screen.findByRole("button", { name: "Archivar Clase 1" }, ESPERA))
    fireEvent.click(await screen.findByRole("button", { name: "Sí, archivar Clase 1" }))
    await waitFor(
      () => expect(screen.queryByRole("link", { name: "Abrir Clase 1" })).toBeNull(),
      ESPERA,
    )
    fireEvent.click(screen.getByRole("button", { name: "Archivadas" }))
    // La lista nueva: 1, 5, 6, 7. La 6 ocupa ahora el tercer lugar.
    await screen.findByRole("button", { name: "Borrar definitivamente Clase 1" }, ESPERA)
    servidor.borradas.add(idClase(6))
    dialogo = await abrirElBorrado("Clase 6")
    await within(dialogo).findByText(ERROR_CONTEO, {}, ESPERA)
    await waitFor(
      () => expect(screen.queryByRole("link", { name: "Abrir Clase 6" })).toBeNull(),
      ESPERA,
    )
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await reposar()
    expect(screen.getByRole("button", { name: "Borrar definitivamente Clase 7" })).toHaveFocus()
  })
})

describe("ataque ADMIN-01c r2: reconexión con el borrado en vuelo (estado vecino de T-03)", () => {
  it("ADM-T2C04: el conteo que se vuelve a pedir al reconectar falla y después el DELETE falla con 500: el diálogo muestra un solo mensaje de error y el foco no cae en <body>", async () => {
    servidor.archivadas = [archivada(5), archivada(6)]
    await montar("/admin/clases?estado=archivadas")
    const dialogo = await abrirElBorrado("Clase 5")
    const si = await within(dialogo).findByRole(
      "button",
      { name: "Sí, borrar definitivamente" },
      ESPERA,
    )
    const borrado = diferido()
    manejador = ({ metodo, url }) => {
      if (metodo === "DELETE") return borrado.promesa
      if (url.pathname.endsWith("/conteo-de-borrado")) {
        return errorJson(500, "ERROR_INTERNO", "Falló.")
      }
      return undefined
    }
    act(() => si.focus())
    fireEvent.click(si)
    await waitFor(() => expect(si).toHaveAttribute("aria-busy", "true"))
    const antes = pedidas("GET", terminaEn("/conteo-de-borrado")).length
    act(() => onlineManager.setOnline(false))
    act(() => onlineManager.setOnline(true))
    await waitFor(
      () =>
        expect(pedidas("GET", terminaEn("/conteo-de-borrado")).length).toBeGreaterThan(antes + 1),
      ESPERA,
    )
    await reposar(300)
    await act(async () => {
      borrado.resolver(errorJson(500, "ERROR_INTERNO", "Falló."))
      await borrado.promesa
    })
    await reposar(300)
    expect(screen.getByRole("dialog")).toBe(dialogo)
    expect(document.activeElement).not.toBe(document.body)
    expect(dialogo.contains(document.activeElement)).toBe(true)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(
      within(dialogo).getAllByRole("alert"),
      "el diálogo muestra a la vez el error del conteo y el del borrado",
    ).toHaveLength(1)
  })
})

describe("ataque ADMIN-01c r2: dos acciones sobre la misma clase", () => {
  it("ADM-T2C05: «Restaurar» en vuelo y, a la vez, el borrado de esa clase: el DELETE de una clase ya activa no borra nada, el diálogo lo dice y al cerrar el foco va a la fila vecina; un solo aviso, el de restaurar", async () => {
    servidor.archivadas = [archivada(5), archivada(6)]
    await montar("/admin/clases?estado=archivadas")
    const restauracion = diferido()
    manejador = ({ metodo, url }) => {
      if (url.pathname.endsWith("/restaurar")) return restauracion.promesa
      const borrar = /^\/api\/admin\/clases\/([^/]+)$/.exec(url.pathname)
      if (metodo === "DELETE" && borrar !== null) {
        const sigueArchivada = servidor.archivadas.some((c) => c.id === borrar[1])
        if (!sigueArchivada) {
          return errorJson(409, "CLASE_NO_ARCHIVADA", "La clase no está archivada.")
        }
      }
      return undefined
    }
    fireEvent.click(await screen.findByRole("button", { name: "Restaurar Clase 5" }, ESPERA))
    await waitFor(() => expect(pedidas("POST", terminaEn("/restaurar"))).toHaveLength(1))
    const dialogo = await abrirElBorrado("Clase 5")
    const si = await within(dialogo).findByRole(
      "button",
      { name: "Sí, borrar definitivamente" },
      ESPERA,
    )
    await act(async () => {
      const fila = servidor.archivadas.find((c) => c.id === idClase(5))
      servidor.archivadas = servidor.archivadas.filter((c) => c.id !== idClase(5))
      if (fila !== undefined) servidor.activas.unshift({ ...fila, archivadaEn: null })
      restauracion.resolver(respuestaJson(200, detalle(archivada(5))))
      await restauracion.promesa
    })
    await waitFor(
      () => expect(screen.queryByRole("link", { name: "Abrir Clase 5" })).toBeNull(),
      ESPERA,
    )
    fireEvent.click(si)
    expect(
      await within(dialogo).findByText("La clase no está archivada.", {}, ESPERA),
    ).toBeInTheDocument()
    expect(servidor.activas.map((c) => c.id)).toContain(idClase(5))
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await reposar()
    expect(screen.getByRole("button", { name: "Borrar definitivamente Clase 6" })).toHaveFocus()
    expect(aviso.success).toHaveBeenCalledTimes(1)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("ADM-T2C06: «Sí, archivar» en vuelo, ir a «Archivadas» y regresar: la confirmación vuelta a abrir está en espera, sale un solo POST y un solo aviso, y cuando la fila sale el foco no cae en <body>", async () => {
    servidor.activas = [clase(1), clase(2)]
    servidor.archivadas = [archivada(5)]
    await montar("/admin/clases")
    const archivado = diferido()
    manejador = ({ url }) => (url.pathname.endsWith("/archivar") ? archivado.promesa : undefined)
    fireEvent.click(await screen.findByRole("button", { name: "Archivar Clase 1" }, ESPERA))
    fireEvent.click(await screen.findByRole("button", { name: "Sí, archivar Clase 1" }))
    await waitFor(() => expect(pedidas("POST", terminaEn("/archivar"))).toHaveLength(1))
    fireEvent.click(screen.getByRole("button", { name: "Archivadas" }))
    await screen.findByRole("button", { name: "Restaurar Clase 5" }, ESPERA)
    fireEvent.click(screen.getByRole("button", { name: "Activas" }))
    fireEvent.click(await screen.findByRole("button", { name: "Archivar Clase 1" }, ESPERA))
    const si = await screen.findByRole("button", { name: "Sí, archivar Clase 1" })
    expect(si).toHaveAttribute("aria-busy", "true")
    act(() => si.focus())
    fireEvent.click(si)
    await reposar()
    expect(pedidas("POST", terminaEn("/archivar"))).toHaveLength(1)
    await act(async () => {
      const fila = servidor.activas.find((c) => c.id === idClase(1))
      servidor.activas = servidor.activas.filter((c) => c.id !== idClase(1))
      if (fila !== undefined) servidor.archivadas.unshift(fila)
      archivado.resolver(respuestaJson(200, detalle(clase(1))))
      await archivado.promesa
    })
    await waitFor(
      () => expect(screen.queryByRole("link", { name: "Abrir Clase 1" })).toBeNull(),
      ESPERA,
    )
    await reposar()
    expect(document.activeElement).not.toBe(document.body)
    expect(screen.getByRole("button", { name: "Archivar Clase 2" })).toHaveFocus()
    expect(aviso.success).toHaveBeenCalledTimes(1)
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

describe("ataque ADMIN-01c r2: el conteo con 403 y el reintento de la app (retry: 1)", () => {
  it("ADM-T2C07: mientras el conteo de una clase ya borrada se reintenta y las listas se renuevan, el diálogo muestra a lo sumo un mensaje en cada momento, el único es la frase, y el foco no se mueve de «Cancelar»", async () => {
    servidor.archivadas = [archivada(5), archivada(6)]
    await montar("/admin/clases?estado=archivadas")
    await screen.findByRole("button", { name: "Borrar definitivamente Clase 5" }, ESPERA)
    servidor.borradas.add(idClase(5))
    const dialogo = await abrirElBorrado("Clase 5")
    const cancelar = within(dialogo).getByRole("button", { name: "Cancelar" })
    await waitFor(() => expect(cancelar).toHaveFocus())
    let maximo = 0
    let focoFuera = false
    let mensajes: string[] = []
    const observar = () => {
      const alertas = within(dialogo).queryAllByRole("alert")
      maximo = Math.max(maximo, alertas.length)
      if (document.activeElement !== cancelar) focoFuera = true
      const texto = alertas.map((a) => a.textContent).join(" | ")
      if (texto !== "" && mensajes.at(-1) !== texto) mensajes = [...mensajes, texto]
    }
    const observador = new MutationObserver(observar)
    observador.observe(document.body, { childList: true, subtree: true, characterData: true })
    await waitFor(
      () => expect(pedidas("GET", terminaEn("/conteo-de-borrado"))).toHaveLength(2),
      ESPERA,
    )
    await within(dialogo).findByText(ERROR_CONTEO, {}, ESPERA)
    await reposar(800)
    observar()
    observador.disconnect()
    expect(maximo).toBeLessThanOrEqual(1)
    // MensajeError antepone su título «Error» al texto.
    expect(mensajes).toEqual([`Error${ERROR_CONTEO}`])
    expect(focoFuera, "el foco salió de «Cancelar» durante el reintento").toBe(false)
    expect(screen.queryByRole("link", { name: "Abrir Clase 5" })).toBeNull()
  })
})

describe("ataque ADMIN-01c r2: la espera de archivar después de un error (useGestionEnVuelo)", () => {
  it("ADM-T2C08: archivar responde 500: un aviso, y después «Cancelar» vuelve a cerrar la confirmación y «Sí, archivar» vuelve a mandar", async () => {
    servidor.activas = [clase(1), clase(2)]
    let fallos = 0
    manejador = ({ url }) => {
      if (!url.pathname.endsWith("/archivar") || fallos > 0) return undefined
      fallos += 1
      return errorJson(500, "ERROR_INTERNO", "Falló.")
    }
    await montar("/admin/clases")
    fireEvent.click(await screen.findByRole("button", { name: "Archivar Clase 1" }, ESPERA))
    const si = await screen.findByRole("button", { name: "Sí, archivar Clase 1" })
    fireEvent.click(si)
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await waitFor(() => expect(si).not.toHaveAttribute("aria-busy", "true"))
    fireEvent.click(screen.getByRole("button", { name: "Cancelar Clase 1" }))
    const archivar = await screen.findByRole("button", { name: "Archivar Clase 1" })
    await waitFor(() => expect(archivar).toHaveFocus())
    fireEvent.click(archivar)
    fireEvent.click(await screen.findByRole("button", { name: "Sí, archivar Clase 1" }))
    await waitFor(() => expect(pedidas("POST", terminaEn("/archivar"))).toHaveLength(2), ESPERA)
    await waitFor(
      () => expect(screen.queryByRole("link", { name: "Abrir Clase 1" })).toBeNull(),
      ESPERA,
    )
    expect(aviso.success).toHaveBeenCalledTimes(1)
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })
})
