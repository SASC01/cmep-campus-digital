import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { claveTemasDeLaSeccion } from "./data"
import { MuroView } from "./muro-view"
import { TrabajoView } from "./trabajo-view"

// Ataque del Tester (CLASES-03c2, ronda 1): "Actividades de aprendizaje" con la lista por sección.
// "Subir" y "Bajar" esperan la recarga por sección (CL3-C10): la recarga que falla, la que ya estaba
// en vuelo, un TEMA_REPETIDO durante la espera, salir y volver con el PUT o la recarga en vuelo; el
// total de los temas (solo maestro y admin): no se vuelve a pedir tras ordenar, en caché con una
// recarga que falla, y el estudiante nunca lo pide (R2 e historial). Sin reloj (nada depende de la
// hora). Sin selectores de clase.

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const BASE = `/api/clases/${CLASE_ID}`
const idTema = (n: number) => `7a7b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const RECARGA_FALLIDA =
  "No pudimos actualizar Actividades de aprendizaje. Mostramos la última versión que tenemos."
const SIN_CONTEO = "Sus actividades y recursos pasarán a «Sin tema»."
const REPETIDO = "Ya hay un tema con ese nombre."

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorDeApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

interface TemaDelDoble {
  id: string
  nombre: string
  total: number
}

type Manejo = (() => Response | Promise<Response>) | undefined

interface Diferido {
  promesa: Promise<Response>
  soltar: (respuesta: Response) => void
}
const diferido = (): Diferido => {
  let soltar: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((resolver) => {
    soltar = resolver
  })
  return { promesa, soltar }
}

const crearServidor = (cuantos = 3) => {
  const estado = {
    temas: Array.from({ length: cuantos }, (_, i): TemaDelDoble => ({
      id: idTema(i + 1),
      nombre: `Unidad ${String(i + 1)}`,
      total: 3,
    })),
    // Respuestas propias en fila (una por petición); al acabarse, la del doble.
    seccion: [] as Manejo[],
    total: [] as Manejo[],
    orden: [] as Manejo[],
    renombrar: [] as Manejo[],
  }
  const lista = (cuenta: "seccion" | "total") => ({
    temas: estado.temas.map((tema, orden) => ({
      id: tema.id,
      nombre: tema.nombre,
      orden,
      elementos: cuenta === "total" ? tema.total : 0,
    })),
    sinTema: 0,
  })
  const llamadas: { metodo: string; url: URL; cuerpo: unknown }[] = []
  const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
    const url = new URL(String(entrada), "http://local")
    const metodo = init?.method ?? "GET"
    const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : null
    llamadas.push({ metodo, url, cuerpo })
    if (metodo === "GET" && url.pathname === `${BASE}/temas`) {
      const deSeccion = url.searchParams.get("seccion") === "actividades"
      const propia = (deSeccion ? estado.seccion : estado.total).shift()
      if (propia !== undefined) return Promise.resolve(propia())
      return Promise.resolve(respuestaJson(200, lista(deSeccion ? "seccion" : "total")))
    }
    if (metodo === "PUT" && url.pathname === `${BASE}/temas/orden`) {
      const { temaIds } = cuerpo as { temaIds: string[] }
      const aplicar = () => {
        estado.temas = temaIds.map((id) => {
          const tema = estado.temas.find((t) => t.id === id)
          if (tema === undefined) throw new Error(`tema ${id} no está en el doble`)
          return tema
        })
        return respuestaJson(200, lista("total"))
      }
      const propia = estado.orden.shift()
      if (propia !== undefined) {
        return Promise.resolve(propia()).then((r) => (r.status === 200 ? aplicar() : r))
      }
      return Promise.resolve(aplicar())
    }
    if (metodo === "PUT" && url.pathname.startsWith(`${BASE}/temas/`)) {
      const propia = estado.renombrar.shift()
      if (propia !== undefined) return Promise.resolve(propia())
      return Promise.resolve(errorDeApi(500, "ERROR_INTERNO", "sin manejador"))
    }
    if (metodo === "POST" && url.pathname === `${BASE}/temas`) {
      const { nombre } = cuerpo as { nombre: string }
      const tema = { id: idTema(estado.temas.length + 1), nombre, total: 0 }
      estado.temas = [...estado.temas, tema]
      return Promise.resolve(
        respuestaJson(201, {
          tema: { id: tema.id, nombre, orden: estado.temas.length - 1, elementos: 0 },
        }),
      )
    }
    if (metodo === "GET" && url.pathname === `${BASE}/trabajo`) {
      return Promise.resolve(respuestaJson(200, { elementos: [], siguienteCursor: null }))
    }
    if (metodo === "GET" && url.pathname === `${BASE}/publicaciones`) {
      return Promise.resolve(respuestaJson(200, { publicaciones: [], siguienteCursor: null }))
    }
    return Promise.resolve(errorDeApi(500, "ERROR_INTERNO", "sin manejador"))
  })
  vi.stubGlobal("fetch", fetchMock)
  const gets = (seccion: boolean) =>
    llamadas.filter(
      ({ metodo, url }) =>
        metodo === "GET" &&
        url.pathname === `${BASE}/temas` &&
        url.searchParams.has("seccion") === seccion,
    ).length
  const ordenes = () =>
    llamadas
      .filter(({ metodo, url }) => metodo === "PUT" && url.pathname === `${BASE}/temas/orden`)
      .map(({ cuerpo }) => (cuerpo as { temaIds: string[] }).temaIds)
  return { estado, llamadas, gets, ordenes }
}

const montar = (ruta: string) => {
  // La configuración de app/providers.tsx salvo el reintento (retry: false para que un 500 sea un
  // fallo de la recarga sin esperar el segundo intento).
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })
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

const nombres = () =>
  screen
    .getAllByRole("heading", { level: 2 })
    .filter((encabezado) => encabezado.closest("section") !== null)
    .map((encabezado) => encabezado.textContent.split(" · ")[0])

const boton = (accion: "Subir" | "Bajar", tema: string) =>
  screen.getByRole("button", { name: `${accion} tema ${tema}` })

const reposar = (ms = 50) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))

const TRABAJO = (rol: string) => `/${rol}/clases/${CLASE_ID}/trabajo`

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

describe("ataque CLASES-03c2 r1 · ordenar con la recarga por sección que falla", () => {
  it.each([
    ["Subir", "Unidad 2", "Subir", "Unidad 3"],
    ["Bajar", "Unidad 1", "Subir", "Unidad 3"],
  ] as const)(
    "CL3-2R1-01: «%s %s» sale bien y la recarga por sección falla; el siguiente «%s %s» no deshace el primer movimiento",
    async (primera, temaPrimero, segunda, temaSegundo) => {
      const servidor = crearServidor(3)
      montar(TRABAJO("maestro"))
      await screen.findByRole("heading", { level: 2, name: /^Unidad 3 ·/ })
      // La recarga por sección tras el primer orden falla.
      servidor.estado.seccion.push(() => errorDeApi(500, "ERROR_INTERNO", "caído"))
      fireEvent.click(boton(primera, temaPrimero))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(RECARGA_FALLIDA))
      await waitFor(() =>
        expect(boton(segunda, temaSegundo)).not.toHaveAttribute("aria-busy", "true"),
      )
      expect(servidor.ordenes()).toHaveLength(1)
      // Lo que ya confirmó el servidor tras el primer PUT: Unidad 2 antes que Unidad 1.
      expect(servidor.estado.temas.map(({ nombre }) => nombre)).toEqual([
        "Unidad 2",
        "Unidad 1",
        "Unidad 3",
      ])

      fireEvent.click(boton(segunda, temaSegundo))
      await waitFor(() => expect(servidor.ordenes()).toHaveLength(2))
      const segundo = servidor.ordenes()[1] ?? []
      // El segundo orden no puede devolver Unidad 1 delante de Unidad 2: eso deshace, sin aviso, el
      // movimiento que el servidor ya confirmó (y cuya respuesta la interfaz tiene).
      expect(segundo.indexOf(idTema(2))).toBeLessThan(segundo.indexOf(idTema(1)))
    },
  )

  it("CL3-2R1-01 (control): con la recarga sana, el segundo orden parte del primero", async () => {
    const servidor = crearServidor(3)
    montar(TRABAJO("maestro"))
    await screen.findByRole("heading", { level: 2, name: /^Unidad 3 ·/ })
    fireEvent.click(boton("Subir", "Unidad 2"))
    await waitFor(() => expect(nombres()).toEqual(["Unidad 2", "Unidad 1", "Unidad 3"]))
    await waitFor(() => expect(boton("Subir", "Unidad 3")).not.toHaveAttribute("aria-busy", "true"))
    fireEvent.click(boton("Subir", "Unidad 3"))
    await waitFor(() => expect(servidor.ordenes()).toHaveLength(2))
    expect(servidor.ordenes()[1]).toEqual([idTema(2), idTema(3), idTema(1)])
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

describe("ataque CLASES-03c2 r1 · ordenar con otras peticiones en vuelo", () => {
  it.each([["maestro"], ["admin"]] as const)(
    "CL3-2R1-02 (%s): ordenar no vuelve a pedir el total; pide una vez la lista por sección",
    async (rol) => {
      const servidor = crearServidor(2)
      montar(TRABAJO(rol))
      await screen.findByRole("heading", { level: 2, name: /^Unidad 2 ·/ })
      await waitFor(() => expect(servidor.gets(false)).toBe(1))
      const seccionAntes = servidor.gets(true)
      fireEvent.click(boton("Subir", "Unidad 2"))
      await waitFor(() => expect(nombres()).toEqual(["Unidad 2", "Unidad 1"]))
      await reposar()
      expect(servidor.gets(false)).toBe(1)
      expect(servidor.gets(true)).toBe(seccionAntes + 1)
    },
  )

  it("CL3-2R1-03: «Subir» con otra recarga por sección en vuelo: la respuesta vieja que llega tarde no pisa el orden nuevo y el botón espera la lista nueva", async () => {
    const servidor = crearServidor(2)
    const { queryClient } = montar(TRABAJO("maestro"))
    await screen.findByRole("heading", { level: 2, name: /^Unidad 2 ·/ })
    // Otra recarga por sección (cualquier invalidación) queda en vuelo con el orden de antes.
    const vieja = diferido()
    const ordenViejo = respuestaJson(200, {
      temas: [
        { id: idTema(1), nombre: "Unidad 1", orden: 0, elementos: 0 },
        { id: idTema(2), nombre: "Unidad 2", orden: 1, elementos: 0 },
      ],
      sinTema: 0,
    })
    servidor.estado.seccion.push(() => vieja.promesa)
    act(() => {
      void queryClient.invalidateQueries({
        queryKey: claveTemasDeLaSeccion(CLASE_ID, "actividades"),
      })
    })
    await waitFor(() => expect(servidor.gets(true)).toBe(2))
    // La recarga de "Subir" se retiene también, para ver la espera.
    const nueva = diferido()
    servidor.estado.seccion.push(() => nueva.promesa)
    fireEvent.click(boton("Subir", "Unidad 2"))
    await waitFor(() => expect(servidor.gets(true)).toBe(3))
    expect(boton("Bajar", "Unidad 1")).not.toHaveAttribute("aria-busy", "true")
    const subir = boton("Subir", "Unidad 2")
    expect(subir).toHaveAttribute("aria-busy", "true")
    // La vieja llega antes que la nueva: no se aplica ni libera la espera.
    await act(async () => {
      vieja.soltar(ordenViejo)
      await Promise.resolve()
    })
    await reposar()
    expect(subir).toHaveAttribute("aria-busy", "true")
    await act(async () => {
      nueva.soltar(
        respuestaJson(200, {
          temas: [
            { id: idTema(2), nombre: "Unidad 2", orden: 0, elementos: 0 },
            { id: idTema(1), nombre: "Unidad 1", orden: 1, elementos: 0 },
          ],
          sinTema: 0,
        }),
      )
      await Promise.resolve()
    })
    await waitFor(() => expect(nombres()).toEqual(["Unidad 2", "Unidad 1"]))
    await waitFor(() => expect(boton("Bajar", "Unidad 2")).not.toHaveAttribute("aria-busy", "true"))
    await reposar()
    expect(nombres()).toEqual(["Unidad 2", "Unidad 1"])
    expect(aviso.error).not.toHaveBeenCalled()
    expect(servidor.ordenes()).toHaveLength(1)
  })

  it("CL3-2R1-04: TEMA_REPETIDO al renombrar otro tema mientras «Subir» espera su recarga: un solo mensaje (el del campo), el botón espera la lista nueva y el orden queda bien", async () => {
    const servidor = crearServidor(3)
    montar(TRABAJO("maestro"))
    await screen.findByRole("heading", { level: 2, name: /^Unidad 3 ·/ })
    const retenida = diferido()
    servidor.estado.seccion.push(() => retenida.promesa)
    fireEvent.click(boton("Subir", "Unidad 3"))
    await waitFor(() => expect(servidor.ordenes()).toHaveLength(1))
    await waitFor(() => expect(servidor.gets(true)).toBe(2))
    expect(boton("Subir", "Unidad 3")).toHaveAttribute("aria-busy", "true")

    servidor.estado.renombrar.push(() => errorDeApi(409, "TEMA_REPETIDO", REPETIDO))
    fireEvent.click(screen.getByRole("button", { name: "Renombrar tema Unidad 1" }))
    const campo = screen.getByLabelText("Nombre del tema")
    fireEvent.change(campo, { target: { value: "Unidad 2" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar nombre" }))
    // La renovación de TEMA_REPETIDO vuelve a pedir la lista por sección (la del doble, ya ordenada).
    await waitFor(() =>
      expect(screen.getByLabelText("Nombre del tema")).toHaveAccessibleDescription(REPETIDO),
    )
    await waitFor(() => expect(nombres()).toEqual(["Unidad 1", "Unidad 3", "Unidad 2"]))
    await waitFor(() => expect(boton("Subir", "Unidad 3")).not.toHaveAttribute("aria-busy", "true"))
    // La respuesta retenida (cancelada) llega tarde con el orden viejo: no se aplica.
    await act(async () => {
      retenida.soltar(
        respuestaJson(200, {
          temas: [1, 2, 3].map((n, orden) => ({
            id: idTema(n),
            nombre: `Unidad ${String(n)}`,
            orden,
            elementos: 0,
          })),
          sinTema: 0,
        }),
      )
      await Promise.resolve()
    })
    await reposar()
    expect(nombres()).toEqual(["Unidad 1", "Unidad 3", "Unidad 2"])
    expect(aviso.error).not.toHaveBeenCalled()
    expect(screen.getAllByText(REPETIDO)).toHaveLength(1)
  })
})

describe("ataque CLASES-03c2 r1 · salir y volver con el orden en vuelo", () => {
  it("CL3-2R1-05: salir con el PUT en vuelo y volver: la vista nueva termina con el orden nuevo, sin aviso, sin otro PUT y sin pedir el total otra vez", async () => {
    const servidor = crearServidor(2)
    const { router } = montar(TRABAJO("maestro"))
    await screen.findByRole("heading", { level: 2, name: /^Unidad 2 ·/ })
    await waitFor(() => expect(servidor.gets(false)).toBe(1))
    const put = diferido()
    servidor.estado.orden.push(() => put.promesa)
    fireEvent.click(boton("Subir", "Unidad 2"))
    await waitFor(() => expect(servidor.ordenes()).toHaveLength(1))
    await act(async () => {
      await router.navigate("/otra")
    })
    await screen.findByText("Otra pantalla")
    await act(async () => {
      await router.navigate(-1)
    })
    await screen.findByRole("heading", { level: 2, name: /^Unidad 2 ·/ })
    await act(async () => {
      put.soltar(respuestaJson(200, {}))
      await Promise.resolve()
    })
    await waitFor(() => expect(nombres()).toEqual(["Unidad 2", "Unidad 1"]))
    await reposar()
    expect(servidor.ordenes()).toHaveLength(1)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(servidor.gets(false)).toBe(1)
    expect(screen.queryAllByRole("button", { busy: true })).toEqual([])
  })

  it("CL3-2R1-06: salir con la recarga por sección en vuelo y volver: la vista nueva muestra el orden nuevo y nada queda en espera", async () => {
    const servidor = crearServidor(2)
    const { router } = montar(TRABAJO("maestro"))
    await screen.findByRole("heading", { level: 2, name: /^Unidad 2 ·/ })
    const recarga = diferido()
    servidor.estado.seccion.push(() => recarga.promesa)
    fireEvent.click(boton("Subir", "Unidad 2"))
    await waitFor(() => expect(servidor.gets(true)).toBe(2))
    await act(async () => {
      await router.navigate("/otra")
    })
    await screen.findByText("Otra pantalla")
    await act(async () => {
      await router.navigate(-1)
    })
    await screen.findByRole("heading", { level: 2, name: /^Unidad 2 ·/ })
    await act(async () => {
      recarga.soltar(
        respuestaJson(200, {
          temas: [
            { id: idTema(2), nombre: "Unidad 2", orden: 0, elementos: 0 },
            { id: idTema(1), nombre: "Unidad 1", orden: 1, elementos: 0 },
          ],
          sinTema: 0,
        }),
      )
      await Promise.resolve()
    })
    await waitFor(() => expect(nombres()).toEqual(["Unidad 2", "Unidad 1"]))
    await reposar()
    expect(screen.queryAllByRole("button", { busy: true })).toEqual([])
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

describe("ataque CLASES-03c2 r1 · el total de los temas", () => {
  it("CL3-2R1-07: con el total en caché, una recarga posterior que falla deja la frase sin conteo y sin aviso", async () => {
    const servidor = crearServidor(2)
    montar(TRABAJO("maestro"))
    await screen.findByRole("heading", { level: 2, name: /^Unidad 2 ·/ })
    fireEvent.click(screen.getByRole("button", { name: "Borrar tema tema Unidad 1" }))
    await screen.findByText("Sus 3 elementos pasarán a «Sin tema».")
    // Crear un tema renueva la lista de temas (el total y la sección); el total falla.
    servidor.estado.total.push(() => errorDeApi(500, "ERROR_INTERNO", "caído"))
    fireEvent.click(screen.getByRole("button", { name: "Nuevo tema" }))
    fireEvent.change(screen.getByLabelText("Nombre del tema"), { target: { value: "Unidad 9" } })
    fireEvent.click(screen.getByRole("button", { name: "Crear tema" }))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Tema creado"))
    await waitFor(() => expect(servidor.gets(false)).toBe(2))
    await screen.findByText(SIN_CONTEO)
    await reposar()
    expect(screen.queryByText("Sus 3 elementos pasarán a «Sin tema».")).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CL3-2R1-08: el estudiante nunca pide el total: primera carga, R2 con la lista en error, otra sección y vuelta, atrás y adelante del historial", async () => {
    const servidor = crearServidor(2)
    servidor.estado.seccion.push(() => errorDeApi(500, "ERROR_INTERNO", "caído"))
    const { router } = montar(TRABAJO("estudiante"))
    await screen.findByRole("alert")
    // R2: pulsar la sección estando en ella (otra location.key, la misma ruta).
    await act(async () => {
      await router.navigate(TRABAJO("estudiante"))
    })
    await screen.findByRole("heading", { level: 2, name: /^Unidad 2 ·/ })
    await act(async () => {
      await router.navigate(`/estudiante/clases/${CLASE_ID}`)
    })
    await act(async () => {
      await router.navigate(TRABAJO("estudiante"))
    })
    await screen.findByRole("heading", { level: 2, name: /^Unidad 2 ·/ })
    for (const paso of [-1, 1, -1, 1]) {
      await act(async () => {
        await router.navigate(paso)
      })
      await reposar()
    }
    await screen.findByRole("heading", { level: 2, name: /^Unidad 2 ·/ })
    expect(servidor.gets(true)).toBeGreaterThanOrEqual(2)
    expect(servidor.gets(false)).toBe(0)
    expect(
      within(document.body).queryByRole("button", { name: /Subir|Bajar|Borrar tema/ }),
    ).toBeNull()
  })
})
