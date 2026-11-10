import { onlineManager, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { useEffect } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// Tester, ADMIN-01c, ronda 3 (la última). Ataque a la corrección de la ronda 2 (T-04: un solo mensaje,
// el del último envío; el conteo congelado; los errores con que apiClient redirige; el 403 del conteo con
// el borrado ya respondido) con el router real (`rutas` de app/router) y el QueryClient de
// app/providers.tsx (staleTime de 30 s, un reintento en las consultas): el orden de llegada de Escape,
// «Cancelar» y el segundo clic frente a cada respuesta del DELETE, el foco en el contenedor del diálogo,
// el conteo congelado con dos intentos y reconexiones, un error que redirige en el conteo sin datos y el
// 403 del conteo con varias páginas y con la lista que queda vacía. Sin tiempos fijos: se espera a que el
// QueryClient de la app quede sin consultas ni mutaciones en vuelo (asentado). Sin selectores de estilo.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
const navegacion = vi.hoisted(() => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin") }))
vi.mock("@/services/navegacion", () => navegacion)

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

// El QueryClient de app/providers.tsx, para esperar a que no quede nada en vuelo.
let cliente: QueryClient | null = null
function Sonda() {
  const actual = useQueryClient()
  useEffect(() => {
    cliente = actual
  }, [actual])
  return null
}

const montar = async (entrada: string) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [entrada] })
  const arbol = (
    <Providers>
      <RouterProvider router={router} />
      <Sonda />
    </Providers>
  )
  render(arbol)
  return router
}

// Sin consultas ni mutaciones en vuelo en la caché de la app (incluido el reintento de las consultas).
const asentado = () =>
  waitFor(() => {
    if (cliente === null) throw new Error("Precondición: la app no se montó")
    expect(cliente.isFetching()).toBe(0)
    expect(cliente.isMutating()).toBe(0)
  }, ESPERA)
// Solo las consultas, para cuando el DELETE sigue retenido a propósito.
const sinConsultasEnVuelo = () =>
  waitFor(() => {
    if (cliente === null) throw new Error("Precondición: la app no se montó")
    expect(cliente.isFetching()).toBe(0)
  }, ESPERA)
const pedidas = (metodo: string, filtro: (url: URL) => boolean) =>
  llamadas.filter((l) => l.metodo === metodo && filtro(l.url))
const deLaLista = (estado: "activas" | "archivadas") => (url: URL) =>
  url.pathname === "/api/admin/clases" && url.searchParams.get("estado") === estado

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
  navegacion.irA.mockClear()
  cliente = null
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

// Una respuesta retenida que la prueba suelta o rechaza (rechazar = sin conexión).
const retenida = () => {
  let soltar: (respuesta: Response) => void = () => {
    throw new Error("Precondición: la respuesta retenida no se creó")
  }
  let rechazar: (error: Error) => void = () => {
    throw new Error("Precondición: la respuesta retenida no se creó")
  }
  const promesa = new Promise<Response>((resolver, fallar) => {
    soltar = resolver
    rechazar = fallar
  })
  return { promesa, soltar: (r: Response) => soltar(r), rechazar: (e: Error) => rechazar(e) }
}

// Recuperar la conexión. El QueryClient vuelve a pedir lo que está viejo después de reanudar las
// mutaciones pausadas (un salto de microtareas): se espera a que salga la nueva petición del conteo, que es
// el control de que la reconexión ocurrió, antes de esperar a que todo se asiente.
const pedidasDelConteo = () =>
  llamadas.filter((l) => l.metodo === "GET" && l.url.pathname.endsWith("/conteo-de-borrado")).length
const reconectar = async () => {
  const antes = pedidasDelConteo()
  act(() => onlineManager.setOnline(false))
  act(() => onlineManager.setOnline(true))
  await waitFor(() => expect(pedidasDelConteo()).toBeGreaterThan(antes), ESPERA)
}

const alertasDe = (dialogo: HTMLElement) => within(dialogo).queryAllByRole("alert")
const botonBorrar = (dialogo: HTMLElement) =>
  within(dialogo).queryByRole("button", { name: "Sí, borrar definitivamente" })

type Respuesta = "500" | "403" | "409 copias" | "409 no archivada" | "red"

const RESPUESTAS: Record<Respuesta, () => Response | null> = {
  "500": () => errorJson(500, "ERROR_INTERNO", "Falló."),
  "403": () => sinAcceso(),
  "409 copias": () =>
    errorJson(
      409,
      "CLASE_CON_COPIAS_EN_CURSO",
      "Esta clase tiene archivos que todavía se están copiando. Inténtalo en unos minutos.",
    ),
  "409 no archivada": () => errorJson(409, "CLASE_NO_ARCHIVADA", "La clase no está archivada."),
  red: () => null,
}

describe("ataque ADMIN-01c r3: el orden de llegada frente a cada respuesta del DELETE", () => {
  it.each(Object.keys(RESPUESTAS) as Respuesta[])(
    "ADM-T3C01 (%s): Escape, «Cancelar» y el segundo clic justo antes y justo después de la respuesta: un solo DELETE por intento, un solo mensaje, ningún aviso y el foco nunca en <body>",
    async (respuesta) => {
      servidor.archivadas = [archivada(5), archivada(6), archivada(7)]
      await montar("/admin/clases?estado=archivadas")
      const dialogo = await abrirElBorrado("Clase 6")
      const si = await within(dialogo).findByRole(
        "button",
        { name: "Sí, borrar definitivamente" },
        ESPERA,
      )
      const intentos: ReturnType<typeof retenida>[] = []
      manejador = ({ metodo }) => {
        if (metodo !== "DELETE") return undefined
        const otra = retenida()
        intentos.push(otra)
        return otra.promesa
      }
      act(() => si.focus())
      fireEvent.click(si)
      await waitFor(() => expect(si).toHaveAttribute("aria-busy", "true"))
      // Justo antes de la respuesta: con el DELETE en vuelo nada cierra el diálogo ni manda otro.
      fireEvent.keyDown(dialogo, { key: "Escape" })
      fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
      fireEvent.click(si)
      expect(screen.getByRole("dialog")).toBe(dialogo)
      expect(pedidas("DELETE", () => true)).toHaveLength(1)

      // Llega la respuesta y, en el mismo instante, Escape y «Cancelar» (todavía sin procesar).
      if (respuesta === "403") servidor.borradas.add(idClase(6))
      const primera = intentos[0]
      if (primera === undefined) throw new Error("Precondición: salió el primer DELETE")
      const cuerpo = RESPUESTAS[respuesta]()
      if (cuerpo === null) primera.rechazar(new TypeError("Failed to fetch"))
      else primera.soltar(cuerpo)
      fireEvent.keyDown(dialogo, { key: "Escape" })
      fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
      await asentado()

      // Escape y «Cancelar» llegaron con la respuesta todavía sin procesar (el DELETE seguía en vuelo):
      // no cierran. Ya procesada, el diálogo sigue abierto con un solo mensaje.
      expect(document.activeElement).not.toBe(document.body)
      expect(aviso.error).not.toHaveBeenCalled()
      expect(aviso.success).not.toHaveBeenCalled()
      expect(pedidas("DELETE", () => true)).toHaveLength(1)
      expect(screen.getByRole("dialog")).toBe(dialogo)
      expect(alertasDe(dialogo)).toHaveLength(1)
      expect(dialogo.contains(document.activeElement)).toBe(true)
      if (respuesta === "403") {
        await waitFor(
          () => expect(screen.queryByRole("link", { name: "Abrir Clase 6" })).toBeNull(),
          ESPERA,
        )
      }

      // Justo después: el segundo clic manda otro DELETE y, mientras vuela, el mensaje viejo no está.
      const otraVez = botonBorrar(dialogo)
      if (otraVez === null)
        throw new Error("Precondición: el botón sigue tras el error del borrado")
      fireEvent.click(otraVez)
      await waitFor(() => expect(otraVez).toHaveAttribute("aria-busy", "true"))
      expect(pedidas("DELETE", () => true)).toHaveLength(2)
      expect(alertasDe(dialogo)).toHaveLength(0)
      const segunda = intentos[1]
      if (segunda === undefined) throw new Error("Precondición: salió el segundo DELETE")
      segunda.soltar(errorJson(500, "ERROR_INTERNO", "Falló."))
      await asentado()
      expect(alertasDe(dialogo)).toHaveLength(1)
      fireEvent.keyDown(dialogo, { key: "Escape" })
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
      const destino = respuesta === "403" ? "Clase 7" : "Clase 6"
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: `Borrar definitivamente ${destino}` }),
        ).toHaveFocus(),
      )
      expect(aviso.error).not.toHaveBeenCalled()
      expect(aviso.success).not.toHaveBeenCalled()
    },
  )
})

describe("ataque ADMIN-01c r3: el foco en el contenedor del diálogo", () => {
  it("ADM-T3C02: con el foco en el contenedor (un clic en el texto), el conteo que se vuelve a pedir falla: un solo mensaje, sin «Sí, borrar definitivamente», y el foco dentro del diálogo, nunca en <body>", async () => {
    servidor.archivadas = [archivada(5), archivada(6)]
    await montar("/admin/clases?estado=archivadas")
    const dialogo = await abrirElBorrado("Clase 5")
    await within(dialogo).findByRole("button", { name: "Sí, borrar definitivamente" }, ESPERA)
    act(() => dialogo.focus())
    expect(document.activeElement).toBe(dialogo)
    manejador = ({ url }) =>
      url.pathname.endsWith("/conteo-de-borrado")
        ? errorJson(500, "ERROR_INTERNO", "Falló.")
        : undefined
    await reconectar()
    await asentado()
    expect(alertasDe(dialogo)).toHaveLength(1)
    expect(within(dialogo).getByText(ERROR_CONTEO)).toBeInTheDocument()
    expect(botonBorrar(dialogo)).toBeNull()
    expect(document.activeElement).not.toBe(document.body)
    expect(dialogo.contains(document.activeElement)).toBe(true)
  })

  it("ADM-T3C03: con el foco en el contenedor tras un error del DELETE, el conteo responde 403 (otra pestaña la borró): la frase sustituye al mensaje y al botón, y el foco va a «Cancelar»", async () => {
    servidor.archivadas = [archivada(5), archivada(6)]
    await montar("/admin/clases?estado=archivadas")
    const dialogo = await abrirElBorrado("Clase 5")
    const si = await within(dialogo).findByRole(
      "button",
      { name: "Sí, borrar definitivamente" },
      ESPERA,
    )
    manejador = ({ metodo }) =>
      metodo === "DELETE" ? errorJson(500, "ERROR_INTERNO", "Falló.") : undefined
    fireEvent.click(si)
    await asentado()
    expect(alertasDe(dialogo)).toHaveLength(1)
    act(() => dialogo.focus())
    servidor.borradas.add(idClase(5))
    await reconectar()
    await asentado()
    expect(alertasDe(dialogo)).toHaveLength(1)
    expect(within(dialogo).getByText(ERROR_CONTEO)).toBeInTheDocument()
    expect(botonBorrar(dialogo)).toBeNull()
    expect(within(dialogo).getByRole("button", { name: "Cancelar" })).toHaveFocus()
  })
})

describe("ataque ADMIN-01c r3: el conteo congelado con dos intentos y reconexiones", () => {
  it("ADM-T3C04: el conteo confirmado no cambia con reconexiones que traen otras cifras entre el primer y el segundo intento; un solo mensaje al final; al volver a abrir, el conteo nuevo y sin mensajes", async () => {
    servidor.archivadas = [archivada(5), archivada(6)]
    let alumnos = 1
    let fallaElBorrado = true
    const intentos: ReturnType<typeof retenida>[] = []
    manejador = ({ metodo, url }) => {
      if (url.pathname.endsWith("/conteo-de-borrado")) {
        return respuestaJson(200, {
          alumnos,
          actividades: 2,
          entregas: 3,
          calificaciones: 4,
          archivos: 5,
        })
      }
      if (metodo === "DELETE" && fallaElBorrado) {
        const otra = retenida()
        intentos.push(otra)
        return otra.promesa
      }
      return undefined
    }
    await montar("/admin/clases?estado=archivadas")
    const dialogo = await abrirElBorrado("Clase 5")
    const confirmado = "Se perderán las inscripciones de 1 alumno,"
    await within(dialogo).findByText((texto) => texto.startsWith(confirmado), {}, ESPERA)
    const si = within(dialogo).getByRole("button", { name: "Sí, borrar definitivamente" })
    fireEvent.click(si)
    await waitFor(() => expect(intentos).toHaveLength(1))
    intentos[0]?.soltar(errorJson(500, "ERROR_INTERNO", "Falló."))
    await asentado()
    alumnos = 9
    await reconectar()
    await asentado()
    expect(within(dialogo).getByText((texto) => texto.startsWith(confirmado))).toBeInTheDocument()
    expect(alertasDe(dialogo)).toHaveLength(1)

    fireEvent.click(si)
    await waitFor(() => expect(intentos).toHaveLength(2))
    alumnos = 7
    await reconectar()
    await sinConsultasEnVuelo()
    expect(within(dialogo).getByText((texto) => texto.startsWith(confirmado))).toBeInTheDocument()
    expect(alertasDe(dialogo)).toHaveLength(0)
    intentos[1]?.soltar(errorJson(500, "ERROR_INTERNO", "Falló."))
    await asentado()
    expect(within(dialogo).getByText((texto) => texto.startsWith(confirmado))).toBeInTheDocument()
    expect(alertasDe(dialogo)).toHaveLength(1)

    fireEvent.keyDown(dialogo, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    fallaElBorrado = false
    const otra = await abrirElBorrado("Clase 5")
    await within(otra).findByText(
      (texto) => texto.startsWith("Se perderán las inscripciones de 7 alumnos,"),
      {},
      ESPERA,
    )
    expect(alertasDe(otra)).toHaveLength(0)
    expect(botonBorrar(otra)).not.toBeNull()
  })
})

describe("ataque ADMIN-01c r3: un error que redirige en el conteo, sin datos", () => {
  it.each([
    ["403 ACCESO_RESTRINGIDO", 403, "ACCESO_RESTRINGIDO", "/acceso-restringido"],
    [
      "403 CAMBIO_DE_CONTRASENA_REQUERIDO",
      403,
      "CAMBIO_DE_CONTRASENA_REQUERIDO",
      "/cambiar-contrasena",
    ],
  ] as const)(
    "ADM-T3C05 (%s): el diálogo no anuncia ningún error, no hay aviso y la redirección ocurre",
    async (_caso, estado, codigo, destino) => {
      servidor.archivadas = [archivada(5)]
      await montar("/admin/clases?estado=archivadas")
      manejador = ({ url }) =>
        url.pathname.endsWith("/conteo-de-borrado")
          ? errorJson(estado, codigo, "La sesión no puede seguir aquí.")
          : undefined
      const dialogo = await abrirElBorrado("Clase 5")
      await waitFor(() => expect(navegacion.irA).toHaveBeenCalledWith(destino), ESPERA)
      await asentado()
      expect(alertasDe(dialogo)).toHaveLength(0)
      expect(within(dialogo).queryByText("La sesión no puede seguir aquí.")).toBeNull()
      expect(botonBorrar(dialogo)).toBeNull()
      expect(aviso.error).not.toHaveBeenCalled()
      expect(document.activeElement).not.toBe(document.body)
    },
  )
})

describe("ataque ADMIN-01c r3: el 403 del conteo con el borrado ya respondido (vecino 3)", () => {
  it("ADM-T3C06: con dos páginas cargadas y el diálogo de la fila de en medio: la frase, sin botón y el foco en «Cancelar»; al cerrar, el foco va a la siguiente", async () => {
    servidor.archivadas = [archivada(5), archivada(6), archivada(7)]
    const paginado = archivadasEnPaginasDeDos
    manejador = (llamada) => {
      if (llamada.metodo === "DELETE") return errorJson(500, "ERROR_INTERNO", "Falló.")
      return paginado(llamada)
    }
    await montar("/admin/clases?estado=archivadas")
    fireEvent.click(await screen.findByRole("button", { name: "Cargar más clases" }, ESPERA))
    await screen.findByRole("button", { name: "Borrar definitivamente Clase 7" }, ESPERA)
    const dialogo = await abrirElBorrado("Clase 6")
    fireEvent.click(
      await within(dialogo).findByRole("button", { name: "Sí, borrar definitivamente" }, ESPERA),
    )
    await asentado()
    expect(alertasDe(dialogo)).toHaveLength(1)
    servidor.borradas.add(idClase(6))
    await reconectar()
    await asentado()
    expect(alertasDe(dialogo)).toHaveLength(1)
    expect(within(dialogo).getByText(ERROR_CONTEO)).toBeInTheDocument()
    expect(botonBorrar(dialogo)).toBeNull()
    expect(within(dialogo).getByRole("button", { name: "Cancelar" })).toHaveFocus()
    await waitFor(
      () => expect(screen.queryByRole("link", { name: "Abrir Clase 6" })).toBeNull(),
      ESPERA,
    )
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Borrar definitivamente Clase 7" })).toHaveFocus(),
    )
  })

  it("ADM-T3C07: con la única clase de «Archivadas»: la lista queda vacía; al cerrar, el foco va al encabezado «Clases», nunca a <body>", async () => {
    servidor.archivadas = [archivada(5)]
    manejador = ({ metodo }) =>
      metodo === "DELETE" ? errorJson(500, "ERROR_INTERNO", "Falló.") : undefined
    await montar("/admin/clases?estado=archivadas")
    const dialogo = await abrirElBorrado("Clase 5")
    fireEvent.click(
      await within(dialogo).findByRole("button", { name: "Sí, borrar definitivamente" }, ESPERA),
    )
    await asentado()
    servidor.borradas.add(idClase(5))
    await reconectar()
    await asentado()
    expect(within(dialogo).getByText(ERROR_CONTEO)).toBeInTheDocument()
    expect(botonBorrar(dialogo)).toBeNull()
    await screen.findByText("Aún no hay clases archivadas", {}, ESPERA)
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1, name: "Clases" })).toHaveFocus(),
    )
  })
})
