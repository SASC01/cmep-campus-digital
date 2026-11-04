import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { MuroView } from "./muro-view"
import { TrabajoView } from "./trabajo-view"

// CLASES-03c2 (§D-7.5 y §D-7.6; CL3-C08 a CL3-C11): Avisos pide solo los anuncios; "Actividades de
// aprendizaje" toma su estructura de la lista de temas de la sección, pide solo las actividades de cada
// tema, usa el total de los temas solo para la frase de borrar uno (maestro y admin) y "Subir"/"Bajar"
// siguen en espera hasta que llega la lista por sección.

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

type Rol = "estudiante" | "maestro" | "admin"

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const BASE = `/api/clases/${CLASE_ID}`
const idTema = (n: number) => `7a7b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const idElemento = (n: number) => `5a5b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const idPublicacion = (n: number) => `6a6b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const AUTOR = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const RECARGA_FALLIDA =
  "No pudimos actualizar Actividades de aprendizaje. Mostramos la última versión que tenemos."
const SIN_CONTEO = "Sus actividades y recursos pasarán a «Sin tema»."

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorDeApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const publicacion = (n: number) => ({
  id: idPublicacion(n),
  tipo: "anuncio",
  titulo: null,
  texto: `Aviso ${String(n)}`,
  autor: { ...AUTOR, administracion: false },
  creadoEn: "2026-10-01T15:30:00.000Z",
  comentarios: 0,
  tarea: null,
  adjuntos: [],
  puedeBorrar: false,
})

const tarea = (n: number) => ({
  id: idElemento(n),
  tipo: "tarea",
  titulo: `Tarea ${String(n)}`,
  autor: { ...AUTOR, administracion: false },
  creadoEn: "2026-10-01T15:30:00.000Z",
  material: null,
  tarea: { fechaLimite: "2026-12-01T15:00:00.000Z", puntos: 10 },
  puedeMover: false,
  entrega: null,
})

interface TemaDelDoble {
  id: string
  nombre: string
  // Actividades del tema (lo que cuenta la sección) y elementos en total (todas las secciones).
  actividades: number
  total: number
}

interface Doble {
  temas: TemaDelDoble[]
  sinTemaActividades: number
  sinTemaTotal: number
  // Respuesta propia del total o de la sección; undefined = la del doble.
  total: () => Response | undefined
  seccion: () => Response | Promise<Response> | undefined
  orden: (temaIds: string[]) => Response | Promise<Response> | undefined
}

interface Llamada {
  metodo: string
  url: URL
  texto: string
}

const crearServidor = (inicial: Partial<Doble> = {}) => {
  const doble: Doble = {
    temas: [
      { id: idTema(1), nombre: "Unidad 1", actividades: 1, total: 3 },
      { id: idTema(2), nombre: "Unidad 2", actividades: 0, total: 2 },
    ],
    sinTemaActividades: 0,
    sinTemaTotal: 4,
    total: () => undefined,
    seccion: () => undefined,
    orden: () => undefined,
    ...inicial,
  }
  const llamadas: Llamada[] = []
  const lista = (cuenta: "actividades" | "total") => ({
    temas: doble.temas.map((tema, orden) => ({
      id: tema.id,
      nombre: tema.nombre,
      orden,
      elementos: tema[cuenta],
    })),
    sinTema: cuenta === "actividades" ? doble.sinTemaActividades : doble.sinTemaTotal,
  })
  const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
    const texto = String(entrada)
    const url = new URL(texto, "http://local")
    const metodo = init?.method ?? "GET"
    llamadas.push({ metodo, url, texto })
    if (metodo === "GET" && url.pathname === `${BASE}/publicaciones`) {
      const cursor = url.searchParams.get("cursor")
      const todas = Array.from({ length: 25 }, (_, i) => publicacion(i + 1))
      const desde = cursor === null ? 0 : todas.findIndex(({ id }) => id === cursor) + 1
      const pagina = todas.slice(desde, desde + 20)
      const siguiente = desde + 20 < todas.length ? (pagina.at(-1)?.id ?? null) : null
      return Promise.resolve(
        respuestaJson(200, { publicaciones: pagina, siguienteCursor: siguiente }),
      )
    }
    if (metodo === "GET" && url.pathname === `${BASE}/temas`) {
      if (url.searchParams.get("seccion") === "actividades") {
        return Promise.resolve(doble.seccion() ?? respuestaJson(200, lista("actividades")))
      }
      return Promise.resolve(doble.total() ?? respuestaJson(200, lista("total")))
    }
    if (metodo === "PUT" && url.pathname === `${BASE}/temas/orden`) {
      const { temaIds } = JSON.parse(String(init?.body)) as { temaIds: string[] }
      const propia = doble.orden(temaIds)
      if (propia !== undefined) return Promise.resolve(propia)
      doble.temas = temaIds.map((id) => {
        const tema = doble.temas.find((t) => t.id === id)
        if (tema === undefined) throw new Error(`tema ${id} no está en el doble`)
        return tema
      })
      return Promise.resolve(respuestaJson(200, lista("total")))
    }
    if (metodo === "GET" && url.pathname === `${BASE}/trabajo`) {
      const tema = url.searchParams.get("tema")
      const tareas = tema === idTema(1) ? [tarea(1)] : []
      return Promise.resolve(respuestaJson(200, { elementos: tareas, siguienteCursor: null }))
    }
    return Promise.resolve(errorDeApi(500, "ERROR_INTERNO", "sin manejador en el doble"))
  })
  vi.stubGlobal("fetch", fetchMock)
  const pedidas = (metodo: string, pathname: string) =>
    llamadas.filter((llamada) => llamada.metodo === metodo && llamada.url.pathname === pathname)
  return { doble, llamadas, pedidas }
}

// `staleTime`: 0 por defecto; 30_000 es el de app/providers.tsx.
const montar = (ruta: string, staleTime = 0) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime } } })
  const router = createMemoryRouter(
    [
      { path: "/:rol/clases/:claseId", element: <MuroView /> },
      { path: "/:rol/clases/:claseId/trabajo", element: <TrabajoView /> },
      { path: "/otra", element: <p>Otra pantalla</p> },
    ],
    { initialEntries: [ruta] },
  )
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { queryClient, router }
}

const nombresDeLasSecciones = () =>
  screen
    .getAllByRole("heading", { level: 2 })
    .filter((encabezado) => encabezado.closest("section") !== null)
    .map((encabezado) => encabezado.textContent.split(" · ")[0])

const seccionDe = (nombre: string): HTMLElement => {
  const encabezado = screen.getByRole("heading", { level: 2, name: new RegExp(`^${nombre} ·`) })
  const seccion = encabezado.closest("section")
  if (seccion === null) throw new Error(`Precondición: la sección de ${nombre}`)
  return seccion
}

const reposar = () => act(() => new Promise((resolver) => setTimeout(resolver, 50)))

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

describe("Avisos pide solo los anuncios (CL3-C08)", () => {
  it.each(["estudiante", "maestro", "admin"] as const)(
    "CL3-C08: %s pide …/publicaciones?tipo=anuncio&limite=20 y «Ver más avisos» lleva tipo=anuncio y el cursor",
    async (rol: Rol) => {
      const { pedidas } = crearServidor()
      montar(`/${rol}/clases/${CLASE_ID}`)
      expect(await screen.findByText("Aviso 20")).toBeInTheDocument()

      const primera = pedidas("GET", `${BASE}/publicaciones`)
      expect(primera.map(({ texto }) => texto)).toEqual([
        `${BASE}/publicaciones?tipo=anuncio&limite=20`,
      ])

      fireEvent.click(screen.getByRole("button", { name: "Ver más avisos" }))
      expect(await screen.findByText("Aviso 25")).toBeInTheDocument()
      const todas = pedidas("GET", `${BASE}/publicaciones`)
      expect(todas).toHaveLength(2)
      const siguiente = todas[1]
      if (siguiente === undefined) throw new Error("Precondición: la segunda página")
      expect(siguiente.url.searchParams.get("tipo")).toBe("anuncio")
      expect(siguiente.url.searchParams.get("limite")).toBe("20")
      expect(siguiente.url.searchParams.get("cursor")).toBe(idPublicacion(20))
      expect(siguiente.texto).toBe(
        `${BASE}/publicaciones?tipo=anuncio&limite=20&cursor=${idPublicacion(20)}`,
      )
    },
  )
})

describe("Actividades de aprendizaje por sección (CL3-C09)", () => {
  it.each(["estudiante", "maestro", "admin"] as const)(
    "CL3-C09: %s pide …/temas?seccion=actividades y cada tema con seccion=actividades; los conteos son los de la sección y «Sin tema» no sale sin actividades",
    async (rol: Rol) => {
      const { pedidas } = crearServidor()
      montar(`/${rol}/clases/${CLASE_ID}/trabajo`)
      expect(await screen.findByText("Tarea 1")).toBeInTheDocument()

      const temas = pedidas("GET", `${BASE}/temas`)
      expect(temas.some(({ texto }) => texto === `${BASE}/temas?seccion=actividades`)).toBe(true)
      const trabajo = pedidas("GET", `${BASE}/trabajo`)
      expect(trabajo.length).toBeGreaterThan(0)
      for (const { url } of trabajo) expect(url.searchParams.get("seccion")).toBe("actividades")
      expect(trabajo.map(({ url }) => url.searchParams.get("tema"))).toEqual([idTema(1)])

      // Sin tema tiene 4 en total pero 0 actividades: no sale. Los conteos son los de la sección.
      expect(nombresDeLasSecciones()).toEqual(["Unidad 1", "Unidad 2"])
      expect(within(seccionDe("Unidad 1")).getByText("· 1 elemento")).toBeInTheDocument()
      expect(within(seccionDe("Unidad 2")).getByText("· 0 elementos")).toBeInTheDocument()
    },
  )

  it("CL3-C09: «Sin tema» sale primero cuando tiene actividades, con el conteo de la sección", async () => {
    crearServidor({ sinTemaActividades: 2, sinTemaTotal: 5 })
    montar(`/maestro/clases/${CLASE_ID}/trabajo`)
    expect(await screen.findByText("Tarea 1")).toBeInTheDocument()
    expect(nombresDeLasSecciones()).toEqual(["Sin tema", "Unidad 1", "Unidad 2"])
    expect(within(seccionDe("Sin tema")).getByText("· 2 elementos")).toBeInTheDocument()
  })

  it("CL3-C09: sin actividades en ningún tema, el vacío dice «Aún no hay actividades en esta clase.» aunque haya elementos en total", async () => {
    crearServidor({ temas: [], sinTemaActividades: 0, sinTemaTotal: 3 })
    montar(`/estudiante/clases/${CLASE_ID}/trabajo`)
    expect(await screen.findByText("Aún no hay actividades en esta clase.")).toBeInTheDocument()
  })

  it("CL3-C09: el estudiante no pide el total de los temas (GET …/temas sin seccion)", async () => {
    const { pedidas } = crearServidor()
    montar(`/estudiante/clases/${CLASE_ID}/trabajo`)
    expect(await screen.findByText("Tarea 1")).toBeInTheDocument()
    await reposar()
    const sinSeccion = pedidas("GET", `${BASE}/temas`).filter(
      ({ url }) => !url.searchParams.has("seccion"),
    )
    expect(sinSeccion).toHaveLength(0)
  })

  it.each(["maestro", "admin"] as const)(
    "CL3-C09: %s pide el total y la confirmación de borrar un tema dice el total, no el conteo de la sección",
    async (rol: Rol) => {
      const { pedidas } = crearServidor()
      montar(`/${rol}/clases/${CLASE_ID}/trabajo`)
      expect(await screen.findByText("Tarea 1")).toBeInTheDocument()
      fireEvent.click(screen.getByRole("button", { name: "Borrar tema tema Unidad 1" }))
      expect(await screen.findByText("Sus 3 elementos pasarán a «Sin tema».")).toBeInTheDocument()
      expect(screen.queryByText("Su elemento pasará a «Sin tema».")).toBeNull()
      const sinSeccion = pedidas("GET", `${BASE}/temas`).filter(
        ({ url }) => !url.searchParams.has("seccion"),
      )
      expect(sinSeccion.length).toBeGreaterThan(0)
    },
  )

  it("CL3-C09: si el total falla, la confirmación usa la frase sin conteo y no hay aviso", async () => {
    crearServidor({ total: () => errorDeApi(500, "ERROR_INTERNO", "Falló.") })
    montar(`/maestro/clases/${CLASE_ID}/trabajo`)
    expect(await screen.findByText("Tarea 1")).toBeInTheDocument()
    await reposar()
    fireEvent.click(screen.getByRole("button", { name: "Borrar tema tema Unidad 1" }))
    expect(screen.getByText(SIN_CONTEO)).toBeInTheDocument()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CL3-C09: si el total no tiene el tema, la confirmación de ese tema usa la frase sin conteo", async () => {
    crearServidor({
      total: () =>
        respuestaJson(200, {
          temas: [{ id: idTema(1), nombre: "Unidad 1", orden: 0, elementos: 3 }],
          sinTema: 4,
        }),
    })
    montar(`/maestro/clases/${CLASE_ID}/trabajo`)
    expect(await screen.findByText("Tarea 1")).toBeInTheDocument()
    await reposar()
    fireEvent.click(screen.getByRole("button", { name: "Borrar tema tema Unidad 2" }))
    expect(screen.getByText(SIN_CONTEO)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    fireEvent.click(screen.getByRole("button", { name: "Borrar tema tema Unidad 1" }))
    expect(screen.getByText("Sus 3 elementos pasarán a «Sin tema».")).toBeInTheDocument()
  })
})

describe("«Subir» y «Bajar» esperan la lista por sección (CL3-C10)", () => {
  const tresTemas = (): TemaDelDoble[] => [
    { id: idTema(1), nombre: "Unidad 1", actividades: 1, total: 1 },
    { id: idTema(2), nombre: "Unidad 2", actividades: 0, total: 0 },
    { id: idTema(3), nombre: "Unidad 3", actividades: 0, total: 0 },
  ]

  it("CL3-C10: «Bajar» sigue en espera hasta que llega la lista por sección, y el foco se queda en el botón del tema que se movió", async () => {
    let retener: Promise<Response> | null = null
    let soltar: () => void = () => undefined
    const { doble } = crearServidor({
      temas: tresTemas(),
      seccion: () => retener ?? undefined,
    })
    montar(`/maestro/clases/${CLASE_ID}/trabajo`)
    expect(await screen.findByText("Tarea 1")).toBeInTheDocument()
    // Desde aquí, la lista por sección queda retenida hasta que la prueba la suelta.
    retener = new Promise<Response>((resolver) => {
      soltar = () => {
        const temas = doble.temas.map((tema, orden) => ({
          id: tema.id,
          nombre: tema.nombre,
          orden,
          elementos: tema.actividades,
        }))
        resolver(respuestaJson(200, { temas, sinTema: 0 }))
      }
    })

    const bajar = screen.getByRole("button", { name: "Bajar tema Unidad 1" })
    bajar.focus()
    fireEvent.click(bajar)
    await waitFor(() => expect(bajar).toHaveAttribute("aria-busy", "true"))
    // El PUT ya respondió (el doble no lo retiene) y la vista sigue con el orden viejo y en espera.
    await reposar()
    expect(doble.temas.map(({ nombre }) => nombre)).toEqual(["Unidad 2", "Unidad 1", "Unidad 3"])
    expect(nombresDeLasSecciones()).toEqual(["Unidad 1", "Unidad 2", "Unidad 3"])
    expect(bajar).toHaveAttribute("aria-busy", "true")

    retener = null
    await act(async () => {
      soltar()
      await Promise.resolve()
    })
    await waitFor(() =>
      expect(nombresDeLasSecciones()).toEqual(["Unidad 2", "Unidad 1", "Unidad 3"]),
    )
    const despues = screen.getByRole("button", { name: "Bajar tema Unidad 1" })
    await waitFor(() => expect(despues).not.toHaveAttribute("aria-busy", "true"))
    expect(document.activeElement).toBe(despues)
  })

  it("CL3-C10: doble clic en «Subir» manda un solo PUT del orden", async () => {
    const { pedidas } = crearServidor({ temas: tresTemas() })
    montar(`/maestro/clases/${CLASE_ID}/trabajo`)
    expect(await screen.findByText("Tarea 1")).toBeInTheDocument()
    const subir = screen.getByRole("button", { name: "Subir tema Unidad 3" })
    act(() => {
      fireEvent.click(subir)
      fireEvent.click(subir)
    })
    await waitFor(() =>
      expect(nombresDeLasSecciones()).toEqual(["Unidad 1", "Unidad 3", "Unidad 2"]),
    )
    await reposar()
    expect(pedidas("PUT", `${BASE}/temas/orden`)).toHaveLength(1)
  })
})

describe("Recarga fallida de Actividades (CL3-C11)", () => {
  it("CL3-C11: cada recarga fallida de la lista por sección avisa una vez con el texto nuevo y conserva la vista", async () => {
    let falla = false
    crearServidor({
      seccion: () =>
        falla ? errorDeApi(503, "SERVICIO_OCUPADO", "El servidor está ocupado.") : undefined,
    })
    const { queryClient } = montar(`/maestro/clases/${CLASE_ID}/trabajo`)
    expect(await screen.findByText("Tarea 1")).toBeInTheDocument()

    falla = true
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: ["clases", CLASE_ID, "temas", "actividades"] })
    })
    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(RECARGA_FALLIDA))
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(screen.getByText("Tarea 1")).toBeInTheDocument()

    await act(async () => {
      await queryClient.refetchQueries({ queryKey: ["clases", CLASE_ID, "temas", "actividades"] })
    })
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2))
    expect(aviso.error).toHaveBeenLastCalledWith(RECARGA_FALLIDA)
  })

  it("CL3-C11: volver a montar la vista con un fallo ya ocurrido no avisa", async () => {
    let falla = false
    crearServidor({
      seccion: () =>
        falla ? errorDeApi(503, "SERVICIO_OCUPADO", "El servidor está ocupado.") : undefined,
    })
    const { queryClient, router } = montar(`/maestro/clases/${CLASE_ID}/trabajo`)
    expect(await screen.findByText("Tarea 1")).toBeInTheDocument()
    falla = true
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: ["clases", CLASE_ID, "temas", "actividades"] })
    })
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))

    await act(async () => {
      await router.navigate("/otra")
    })
    await screen.findByText("Otra pantalla")
    // La consulta en error sigue en la caché (errorUpdateCount 1); al volver se pide otra vez y responde.
    falla = false
    await act(async () => {
      await router.navigate(`/maestro/clases/${CLASE_ID}/trabajo`)
    })
    expect(await screen.findByText("Tarea 1")).toBeInTheDocument()
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })
})

describe("T-01 (ronda 1 de 03c2): el orden nuevo no se pierde si la lista por sección no llega", () => {
  const tresTemas = (): TemaDelDoble[] => [
    { id: idTema(1), nombre: "Unidad 1", actividades: 1, total: 1 },
    { id: idTema(2), nombre: "Unidad 2", actividades: 0, total: 0 },
    { id: idTema(3), nombre: "Unidad 3", actividades: 0, total: 0 },
  ]
  const nombresDelDoble = (doble: Doble) => doble.temas.map(({ nombre }) => nombre)

  it("CL3-C10 (T-01): «Subir» sale bien y la recarga por sección falla: la vista muestra el orden del PUT y el siguiente «Subir» parte de él", async () => {
    let falla = false
    const { doble } = crearServidor({
      temas: tresTemas(),
      seccion: () => (falla ? errorDeApi(500, "ERROR_INTERNO", "Falló.") : undefined),
    })
    montar(`/maestro/clases/${CLASE_ID}/trabajo`)
    expect(await screen.findByText("Tarea 1")).toBeInTheDocument()

    falla = true
    fireEvent.click(screen.getByRole("button", { name: "Subir tema Unidad 2" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(RECARGA_FALLIDA))
    expect(nombresDelDoble(doble)).toEqual(["Unidad 2", "Unidad 1", "Unidad 3"])
    await waitFor(() =>
      expect(nombresDeLasSecciones()).toEqual(["Unidad 2", "Unidad 1", "Unidad 3"]),
    )
    // Los conteos siguen siendo los de la sección, no los totales de la respuesta del PUT.
    expect(within(seccionDe("Unidad 1")).getByText("· 1 elemento")).toBeInTheDocument()
    const subir = screen.getByRole("button", { name: "Subir tema Unidad 3" })
    await waitFor(() => expect(subir).not.toHaveAttribute("aria-busy", "true"))

    fireEvent.click(subir)
    await waitFor(() =>
      expect(nombresDelDoble(doble)).toEqual(["Unidad 2", "Unidad 3", "Unidad 1"]),
    )
  })

  it("CL3-C10 (T-01, O-01): salir con el PUT en vuelo, que responde mientras no se ve, y volver con la recarga por sección fallando: la vista muestra el orden del PUT y el siguiente «Subir» parte de él", async () => {
    let falla = false
    let soltar: () => void = () => undefined
    let retener = true
    const { doble } = crearServidor({
      temas: tresTemas(),
      seccion: () => (falla ? errorDeApi(500, "ERROR_INTERNO", "Falló.") : undefined),
      orden: (temaIds) => {
        if (!retener) return undefined
        retener = false
        return new Promise<Response>((resolver) => {
          soltar = () => {
            doble.temas = temaIds.map((id) => {
              const tema = doble.temas.find((t) => t.id === id)
              if (tema === undefined) throw new Error(`tema ${id} no está en el doble`)
              return tema
            })
            resolver(
              respuestaJson(200, {
                temas: doble.temas.map((tema, orden) => ({
                  id: tema.id,
                  nombre: tema.nombre,
                  orden,
                  elementos: tema.total,
                })),
                sinTema: 0,
              }),
            )
          }
        })
      },
    })
    const { router } = montar(`/maestro/clases/${CLASE_ID}/trabajo`)
    expect(await screen.findByText("Tarea 1")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Subir tema Unidad 2" }))
    await act(async () => {
      await router.navigate("/otra")
    })
    await screen.findByText("Otra pantalla")
    falla = true
    await act(async () => {
      soltar()
      await Promise.resolve()
    })
    await reposar()
    expect(nombresDelDoble(doble)).toEqual(["Unidad 2", "Unidad 1", "Unidad 3"])

    await act(async () => {
      await router.navigate(`/maestro/clases/${CLASE_ID}/trabajo`)
    })
    expect(await screen.findByText("Tarea 1")).toBeInTheDocument()
    await reposar()
    expect(nombresDeLasSecciones()).toEqual(["Unidad 2", "Unidad 1", "Unidad 3"])

    fireEvent.click(screen.getByRole("button", { name: "Subir tema Unidad 3" }))
    await waitFor(() =>
      expect(nombresDelDoble(doble)).toEqual(["Unidad 2", "Unidad 3", "Unidad 1"]),
    )
  })
})

describe("M-01 de la ronda 1 de 03c2: la lista que toma el orden del PUT no tapa un error ni queda por fresca", () => {
  const tresTemas = (): TemaDelDoble[] => [
    { id: idTema(1), nombre: "Unidad 1", actividades: 1, total: 1 },
    { id: idTema(2), nombre: "Unidad 2", actividades: 0, total: 0 },
    { id: idTema(3), nombre: "Unidad 3", actividades: 0, total: 0 },
  ]

  it("CL3-C10 (M-01 ronda 1): «Subir» sale bien y la recarga por sección responde 403 SIN_ACCESO_A_LA_CLASE: la vista sigue diciendo que no hay acceso, sin «Subir», «Bajar», «Renombrar» ni «Borrar tema»", async () => {
    let sinAcceso = false
    crearServidor({
      temas: tresTemas(),
      seccion: () =>
        sinAcceso
          ? errorDeApi(403, "SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase.")
          : undefined,
    })
    montar(`/maestro/clases/${CLASE_ID}/trabajo`)
    expect(await screen.findByText("Tarea 1")).toBeInTheDocument()

    sinAcceso = true
    fireEvent.click(screen.getByRole("button", { name: "Subir tema Unidad 2" }))
    expect(await screen.findByText("No tienes acceso a esta clase.")).toBeInTheDocument()
    await reposar()
    await reposar()
    expect(screen.getByText("No tienes acceso a esta clase.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^Subir tema/ })).toBeNull()
    expect(screen.queryByRole("button", { name: /^Bajar tema/ })).toBeNull()
    expect(screen.queryByRole("button", { name: /^Renombrar/ })).toBeNull()
    expect(screen.queryByRole("button", { name: /^Borrar tema/ })).toBeNull()
    expect(screen.queryByText("Tarea 1")).toBeNull()
  })

  it("CL3-C10 (M-01 ronda 1): con staleTime de 30 s, salir con el PUT en vuelo, marcar vieja la lista por sección mientras no se ve y volver antes de 30 s: se vuelve a pedir y muestra los conteos nuevos en el orden del PUT", async () => {
    let soltar: () => void = () => undefined
    let retener = true
    const { doble, pedidas } = crearServidor({
      temas: tresTemas(),
      orden: (temaIds) => {
        if (!retener) return undefined
        retener = false
        return new Promise<Response>((resolver) => {
          soltar = () => {
            doble.temas = temaIds.map((id) => {
              const tema = doble.temas.find((t) => t.id === id)
              if (tema === undefined) throw new Error(`tema ${id} no está en el doble`)
              return tema
            })
            resolver(
              respuestaJson(200, {
                temas: doble.temas.map((tema, orden) => ({
                  id: tema.id,
                  nombre: tema.nombre,
                  orden,
                  elementos: tema.total,
                })),
                sinTema: 0,
              }),
            )
          }
        })
      },
    })
    const { router, queryClient } = montar(`/maestro/clases/${CLASE_ID}/trabajo`, 30_000)
    expect(await screen.findByText("Tarea 1")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Subir tema Unidad 2" }))
    await act(async () => {
      await router.navigate("/otra")
    })
    await screen.findByText("Otra pantalla")
    // Otra acción (por ejemplo, una tarea nueva en Unidad 2) marca vieja la lista mientras no se ve.
    const tema2 = doble.temas.find(({ id }) => id === idTema(2))
    if (tema2 === undefined) throw new Error("Precondición: Unidad 2 en el doble")
    tema2.actividades = 2
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ["clases", CLASE_ID, "temas"] })
    })
    await act(async () => {
      soltar()
      await Promise.resolve()
    })
    await reposar()
    const seccionAntes = pedidas("GET", `${BASE}/temas`).filter(
      ({ url }) => url.searchParams.get("seccion") === "actividades",
    ).length

    await act(async () => {
      await router.navigate(`/maestro/clases/${CLASE_ID}/trabajo`)
    })
    await waitFor(() =>
      expect(
        pedidas("GET", `${BASE}/temas`).filter(
          ({ url }) => url.searchParams.get("seccion") === "actividades",
        ).length,
      ).toBe(seccionAntes + 1),
    )
    await waitFor(() =>
      expect(within(seccionDe("Unidad 2")).getByText("· 2 elementos")).toBeInTheDocument(),
    )
    expect(nombresDeLasSecciones()).toEqual(["Unidad 2", "Unidad 1", "Unidad 3"])
  })
})
