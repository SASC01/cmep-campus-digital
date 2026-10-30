import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import { claveTemas } from "@/services/trabajoService"

import { TrabajoView } from "./trabajo-view"

// Ataque del Tester (CLASES-03c2, ronda 2): la corrección de T-01 y de M-01 (el orden del PUT se
// escribe en la lista por sección que no lo trajo, y queda marcada vieja). Las cinco indicaciones del
// manager, con la configuración de app/providers.tsx (staleTime 30 s, retry 1, sin recarga al volver
// a la ventana): cada error de la recarga tras un PUT 200; listas con la vista desmontada, volviendo
// antes y después de 30 s; el siguiente «Subir»/«Bajar» tras cada estado; la recarga que sí llega
// manda; y pulsar la sección activa tras escribir el orden. El servidor es un doble que valida el
// conjunto de ids como backend/src/core/tareas/temas.ts (409 ORDEN_DESACTUALIZADO). El reloj fija
// solo Date (la regla de los 30 s); los temporizadores son reales (la espera del reintento).

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const AHORA = new Date("2026-10-30T15:00:00.000Z")
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const BASE = `/api/clases/${CLASE_ID}`
const idTema = (n: number) => `7a7b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const RECARGA_FALLIDA =
  "No pudimos actualizar Actividades de aprendizaje. Mostramos la última versión que tenemos."
const SIN_ACCESO = "No tienes acceso a esta clase."
const DESACTUALIZADO = "Los temas cambiaron mientras los ordenabas. Vuelve a intentarlo."

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorDeApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

type Manejo = () => Response | Promise<Response>

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
    temas: Array.from({ length: cuantos }, (_, i) => ({
      id: idTema(i + 1),
      nombre: `Unidad ${String(i + 1)}`,
    })),
    seccion: [] as Manejo[],
    orden: [] as Manejo[],
  }
  const lista = () => ({
    temas: estado.temas.map((tema, orden) => ({ ...tema, orden, elementos: 0 })),
    sinTema: 0,
  })
  const llamadas: { metodo: string; url: URL; cuerpo: unknown }[] = []
  const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
    const url = new URL(String(entrada), "http://local")
    const metodo = init?.method ?? "GET"
    const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : null
    llamadas.push({ metodo, url, cuerpo })
    if (metodo === "GET" && url.pathname === `${BASE}/temas`) {
      if (url.searchParams.get("seccion") === "actividades") {
        const propia = estado.seccion.shift()
        if (propia !== undefined) return Promise.resolve(propia())
      }
      return Promise.resolve(respuestaJson(200, lista()))
    }
    if (metodo === "PUT" && url.pathname === `${BASE}/temas/orden`) {
      const { temaIds } = cuerpo as { temaIds: string[] }
      // El servidor aplica el orden al recibirlo (antes de que llegue la respuesta).
      const actuales = new Set(estado.temas.map(({ id }) => id))
      const igual =
        temaIds.length === actuales.size &&
        new Set(temaIds).size === temaIds.length &&
        temaIds.every((id) => actuales.has(id))
      if (!igual) {
        return Promise.resolve(errorDeApi(409, "ORDEN_DESACTUALIZADO", DESACTUALIZADO))
      }
      estado.temas = temaIds.map((id) => {
        const tema = estado.temas.find((t) => t.id === id)
        if (tema === undefined) throw new Error(`tema ${id} no está en el doble`)
        return tema
      })
      // Una respuesta propia puede retener el PUT o cambiar el servidor antes de responder; la
      // respuesta es la lista del servidor en ese momento.
      const propia = estado.orden.shift()
      if (propia !== undefined) {
        return Promise.resolve(propia()).then(() => respuestaJson(200, lista()))
      }
      return Promise.resolve(respuestaJson(200, lista()))
    }
    if (metodo === "GET" && url.pathname === `${BASE}/trabajo`) {
      return Promise.resolve(respuestaJson(200, { elementos: [], siguienteCursor: null }))
    }
    return Promise.resolve(errorDeApi(500, "ERROR_INTERNO", "sin manejador"))
  })
  vi.stubGlobal("fetch", fetchMock)
  const getsDeSeccion = () =>
    llamadas.filter(
      ({ metodo, url }) =>
        metodo === "GET" &&
        url.pathname === `${BASE}/temas` &&
        url.searchParams.get("seccion") === "actividades",
    ).length
  const ordenes = () =>
    llamadas
      .filter(({ metodo, url }) => metodo === "PUT" && url.pathname === `${BASE}/temas/orden`)
      .map(({ cuerpo }) => (cuerpo as { temaIds: string[] }).temaIds)
  const fallarDosVeces = (manejo: Manejo) => {
    estado.seccion.push(manejo, manejo)
  }
  return { estado, getsDeSeccion, ordenes, fallarDosVeces }
}

const TRABAJO = `/maestro/clases/${CLASE_ID}/trabajo`

const montar = () => {
  // La misma configuración que app/providers.tsx.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })
  const router = createMemoryRouter(
    [
      { path: "/maestro/clases/:claseId/trabajo", element: <TrabajoView /> },
      { path: "/otra", element: <p>Otra pantalla</p> },
    ],
    { initialEntries: [TRABAJO] },
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

const sinEspera = () => expect(screen.queryAllByRole("button", { busy: true })).toEqual([])

const reposar = (ms = 50) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))

const errores = () => aviso.error.mock.calls.map((llamada) => String(llamada[0]))

const ir = async (router: ReturnType<typeof createMemoryRouter>, destino: string | number) => {
  await act(async () => {
    if (typeof destino === "number") await router.navigate(destino)
    else await router.navigate(destino)
  })
  await reposar()
}

const listo = async () => {
  await screen.findByRole("heading", { level: 2, name: /^Unidad 3 ·/ }, { timeout: 4000 })
}

// El orden que el servidor tiene, por nombre.
const ordenDelServidor = (servidor: ReturnType<typeof crearServidor>) =>
  servidor.estado.temas.map(({ nombre }) => nombre)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  aviso.mockClear()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("ataque CLASES-03c2 r2 · (1) cada error de la recarga por sección tras un PUT 200", () => {
  it.each([
    ["500", () => errorDeApi(500, "ERROR_INTERNO", "caído")],
    ["la red", () => Promise.reject(new TypeError("Failed to fetch"))],
  ] as const)(
    "CL3-2R2-01 (%s, con su reintento): la vista se conserva con el orden del PUT, un aviso, y la lista queda vieja (otra sección y vuelta antes de 30 s la pide)",
    async (_caso, fallo) => {
      const servidor = crearServidor()
      const { router } = montar()
      await listo()
      servidor.fallarDosVeces(fallo as Manejo)
      fireEvent.click(boton("Subir", "Unidad 2"))
      await waitFor(() => expect(errores()).toEqual([RECARGA_FALLIDA]), { timeout: 4000 })
      await waitFor(() => expect(nombres()).toEqual(["Unidad 2", "Unidad 1", "Unidad 3"]))
      await waitFor(sinEspera)
      expect(nombres()).toEqual(ordenDelServidor(servidor))
      // Marcada vieja: ir a otra sección y volver antes de 30 s la vuelve a pedir.
      const antes = servidor.getsDeSeccion()
      await ir(router, "/otra")
      vi.setSystemTime(new Date(AHORA.getTime() + 5_000))
      await ir(router, -1)
      await waitFor(() => expect(servidor.getsDeSeccion()).toBe(antes + 1))
      await reposar()
      expect(nombres()).toEqual(["Unidad 2", "Unidad 1", "Unidad 3"])
      expect(errores()).toEqual([RECARGA_FALLIDA])
    },
  )

  it.each([
    ["403 SIN_ACCESO_A_LA_CLASE", () => errorDeApi(403, "SIN_ACCESO_A_LA_CLASE", "x")],
    [
      "VALIDACION de claseId",
      () => errorDeApi(400, "VALIDACION", "claseId: debe ser un identificador válido"),
    ],
  ] as const)(
    "CL3-2R2-02 (%s): la vista se reemplaza por el mensaje, sin temas ni acciones y sin aviso",
    async (_caso, fallo) => {
      const servidor = crearServidor()
      montar()
      await listo()
      servidor.fallarDosVeces(fallo as Manejo)
      fireEvent.click(boton("Subir", "Unidad 2"))
      expect(await screen.findByText(SIN_ACCESO, {}, { timeout: 4000 })).toBeInTheDocument()
      await reposar(200)
      expect(screen.queryByRole("button", { name: /Subir|Bajar|Renombrar|Borrar tema/ })).toBeNull()
      expect(screen.queryByRole("heading", { level: 2, name: /^Unidad/ })).toBeNull()
      expect(errores()).toEqual([])
    },
  )

  it("CL3-2R2-03: dos fallos seguidos: un aviso por fallo y cada orden parte del anterior; el servidor tiene los dos movimientos", async () => {
    const servidor = crearServidor()
    montar()
    await listo()
    const caido = () => errorDeApi(500, "ERROR_INTERNO", "caído")
    servidor.fallarDosVeces(caido)
    fireEvent.click(boton("Subir", "Unidad 2"))
    await waitFor(() => expect(errores()).toHaveLength(1), { timeout: 4000 })
    await waitFor(sinEspera)
    servidor.fallarDosVeces(caido)
    fireEvent.click(boton("Subir", "Unidad 3"))
    await waitFor(() => expect(errores()).toHaveLength(2), { timeout: 4000 })
    await waitFor(sinEspera)
    expect(errores()).toEqual([RECARGA_FALLIDA, RECARGA_FALLIDA])
    expect(servidor.ordenes()).toEqual([
      [idTema(2), idTema(1), idTema(3)],
      [idTema(2), idTema(3), idTema(1)],
    ])
    expect(nombres()).toEqual(ordenDelServidor(servidor))
  })
})

describe("ataque CLASES-03c2 r2 · (2) listas con la vista desmontada", () => {
  it.each([
    ["sin otra invalidación, antes de 30 s", false, 5_000],
    ["sin otra invalidación, después de 30 s", false, 31_000],
    ["con otra invalidación, antes de 30 s", true, 5_000],
    ["con otra invalidación, después de 30 s", true, 31_000],
  ] as const)(
    "CL3-2R2-04 (%s): al volver se pide la lista por sección; si responde, manda; el siguiente «Subir» parte del orden nuevo",
    async (_caso, otra, ms) => {
      const servidor = crearServidor()
      const { router, queryClient } = montar()
      await listo()
      const put = diferido()
      servidor.estado.orden.push(() => put.promesa)
      fireEvent.click(boton("Subir", "Unidad 2"))
      await waitFor(() => expect(servidor.ordenes()).toHaveLength(1))
      await ir(router, "/otra")
      if (otra) {
        await act(async () => {
          await queryClient.invalidateQueries({ queryKey: claveTemas(CLASE_ID) })
        })
      }
      await act(async () => {
        put.soltar(respuestaJson(200, {}))
        await Promise.resolve()
      })
      await reposar()
      const antes = servidor.getsDeSeccion()
      vi.setSystemTime(new Date(AHORA.getTime() + ms))
      await ir(router, -1)
      await waitFor(() => expect(servidor.getsDeSeccion()).toBe(antes + 1))
      await waitFor(() => expect(nombres()).toEqual(["Unidad 2", "Unidad 1", "Unidad 3"]))
      sinEspera()
      fireEvent.click(boton("Subir", "Unidad 3"))
      await waitFor(() => expect(servidor.ordenes()).toHaveLength(2))
      expect(servidor.ordenes()[1]).toEqual([idTema(2), idTema(3), idTema(1)])
      await waitFor(() => expect(nombres()).toEqual(["Unidad 2", "Unidad 3", "Unidad 1"]))
      expect(errores()).toEqual([])
    },
  )

  it.each([
    ["antes de 30 s", 5_000],
    ["después de 30 s", 31_000],
  ] as const)(
    "CL3-2R2-05 (%s): con la vista desmontada al responder el PUT y la petición al volver fallando: el orden del PUT, un aviso, y el siguiente «Subir» parte de él",
    async (_caso, ms) => {
      const servidor = crearServidor()
      const { router } = montar()
      await listo()
      const put = diferido()
      servidor.estado.orden.push(() => put.promesa)
      fireEvent.click(boton("Subir", "Unidad 2"))
      await waitFor(() => expect(servidor.ordenes()).toHaveLength(1))
      await ir(router, "/otra")
      await act(async () => {
        put.soltar(respuestaJson(200, {}))
        await Promise.resolve()
      })
      await reposar()
      servidor.fallarDosVeces(() => errorDeApi(500, "ERROR_INTERNO", "caído"))
      vi.setSystemTime(new Date(AHORA.getTime() + ms))
      await ir(router, -1)
      await waitFor(() => expect(errores()).toEqual([RECARGA_FALLIDA]), { timeout: 4000 })
      expect(nombres()).toEqual(["Unidad 2", "Unidad 1", "Unidad 3"])
      fireEvent.click(boton("Subir", "Unidad 3"))
      await waitFor(() => expect(servidor.ordenes()).toHaveLength(2))
      expect(servidor.ordenes()[1]).toEqual([idTema(2), idTema(3), idTema(1)])
    },
  )
})

describe("ataque CLASES-03c2 r2 · (3) un tema que cambió entre medias", () => {
  it.each([
    ["creado", "crear"],
    ["borrado", "borrar"],
  ] as const)(
    "CL3-2R2-06 (tema %s en otra pestaña tras escribir el orden sobre una recarga fallida): el siguiente «Subir» recibe 409, un aviso, y la lista se renueva",
    async (_caso, cambio) => {
      const servidor = crearServidor()
      montar()
      await listo()
      servidor.fallarDosVeces(() => errorDeApi(500, "ERROR_INTERNO", "caído"))
      fireEvent.click(boton("Subir", "Unidad 2"))
      await waitFor(() => expect(errores()).toEqual([RECARGA_FALLIDA]), { timeout: 4000 })
      await waitFor(sinEspera)
      if (cambio === "crear") {
        servidor.estado.temas = [...servidor.estado.temas, { id: idTema(9), nombre: "Unidad 9" }]
      } else {
        servidor.estado.temas = servidor.estado.temas.filter(({ id }) => id !== idTema(1))
      }
      const antes = ordenDelServidor(servidor)
      fireEvent.click(boton("Subir", "Unidad 3"))
      await waitFor(() => expect(errores()).toEqual([RECARGA_FALLIDA, DESACTUALIZADO]), {
        timeout: 4000,
      })
      await waitFor(() => expect(nombres()).toEqual(ordenDelServidor(servidor)))
      expect(ordenDelServidor(servidor)).toEqual(antes)
      await waitFor(sinEspera)
    },
  )

  it("CL3-2R2-07: la lista en error trae un tema que la respuesta del PUT no trae (borrado entre el GET y el PUT): el siguiente «Subir» no lo pierde en silencio", async () => {
    const servidor = crearServidor()
    montar()
    await listo()
    // La respuesta del PUT llega cuando el servidor ya borró Unidad 3 (otra pestaña, justo después de
    // aplicar el orden); la recarga falla.
    servidor.estado.orden.push(() => {
      servidor.estado.temas = servidor.estado.temas.filter(({ id }) => id !== idTema(3))
      return respuestaJson(200, {})
    })
    servidor.fallarDosVeces(() => errorDeApi(500, "ERROR_INTERNO", "caído"))
    fireEvent.click(boton("Subir", "Unidad 2"))
    await waitFor(() => expect(errores()).toEqual([RECARGA_FALLIDA]), { timeout: 4000 })
    await waitFor(sinEspera)
    // Unidad 3 sigue en la vista (la lista vieja la trae) y queda al final.
    expect(nombres()).toEqual(["Unidad 2", "Unidad 1", "Unidad 3"])
    fireEvent.click(boton("Bajar", "Unidad 2"))
    await waitFor(() => expect(errores()).toEqual([RECARGA_FALLIDA, DESACTUALIZADO]), {
      timeout: 4000,
    })
    await waitFor(() => expect(nombres()).toEqual(["Unidad 2", "Unidad 1"]))
  })
})

describe("ataque CLASES-03c2 r2 · (4) la recarga que sí llega manda", () => {
  it("CL3-2R2-08: otra pestaña reordena entre la respuesta del PUT y la recarga: se ve lo del servidor, no lo de la respuesta, y el siguiente «Subir» parte de ello", async () => {
    const servidor = crearServidor()
    montar()
    await listo()
    const recarga = diferido()
    servidor.estado.seccion.push(() => recarga.promesa)
    fireEvent.click(boton("Subir", "Unidad 2"))
    await waitFor(() => expect(servidor.getsDeSeccion()).toBe(2))
    // Otra pestaña pone Unidad 3 primero.
    servidor.estado.temas = [idTema(3), idTema(2), idTema(1)].map((id) => {
      const tema = servidor.estado.temas.find((t) => t.id === id)
      if (tema === undefined) throw new Error("tema")
      return tema
    })
    await act(async () => {
      recarga.soltar(
        respuestaJson(200, {
          temas: servidor.estado.temas.map((tema, orden) => ({ ...tema, orden, elementos: 0 })),
          sinTema: 0,
        }),
      )
      await Promise.resolve()
    })
    await waitFor(() => expect(nombres()).toEqual(["Unidad 3", "Unidad 2", "Unidad 1"]))
    await waitFor(sinEspera)
    await reposar()
    expect(nombres()).toEqual(["Unidad 3", "Unidad 2", "Unidad 1"])
    fireEvent.click(boton("Bajar", "Unidad 3"))
    await waitFor(() => expect(servidor.ordenes()).toHaveLength(2))
    expect(servidor.ordenes()[1]).toEqual([idTema(2), idTema(3), idTema(1)])
    expect(errores()).toEqual([])
  })

  it("CL3-2R2-09: otra invalidación cancela la recarga de «Subir» y la reemplaza; la nueva falla: queda el orden del PUT, un aviso, y la respuesta vieja tardía no lo pisa", async () => {
    const servidor = crearServidor()
    const { queryClient } = montar()
    await listo()
    const retenida = diferido()
    servidor.estado.seccion.push(() => retenida.promesa)
    fireEvent.click(boton("Subir", "Unidad 2"))
    await waitFor(() => expect(servidor.getsDeSeccion()).toBe(2))
    servidor.fallarDosVeces(() => errorDeApi(500, "ERROR_INTERNO", "caído"))
    act(() => {
      void queryClient.invalidateQueries({ queryKey: claveTemas(CLASE_ID) })
    })
    await waitFor(() => expect(errores()).toEqual([RECARGA_FALLIDA]), { timeout: 4000 })
    await waitFor(sinEspera)
    expect(nombres()).toEqual(["Unidad 2", "Unidad 1", "Unidad 3"])
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
    expect(nombres()).toEqual(["Unidad 2", "Unidad 1", "Unidad 3"])
  })
})

describe("ataque CLASES-03c2 r2 · (5) pulsar la sección activa tras escribir el orden", () => {
  it("CL3-2R2-10: tras escribir el orden sobre una recarga fallida, pulsar «Actividades de aprendizaje» estando ahí no pide nada y ninguna frase de la vista promete esa acción", async () => {
    const servidor = crearServidor()
    const { router } = montar()
    await listo()
    servidor.fallarDosVeces(() => errorDeApi(500, "ERROR_INTERNO", "caído"))
    fireEvent.click(boton("Subir", "Unidad 2"))
    await waitFor(() => expect(errores()).toEqual([RECARGA_FALLIDA]), { timeout: 4000 })
    await waitFor(sinEspera)
    const antes = servidor.getsDeSeccion()
    await ir(router, TRABAJO)
    await reposar(200)
    expect(servidor.getsDeSeccion()).toBe(antes)
    expect(document.body.textContent).not.toMatch(/Vuelve a abrir|Inténtalo de nuevo|Recarga/)
    expect(nombres()).toEqual(["Unidad 2", "Unidad 1", "Unidad 3"])
  })
})

describe("ataque CLASES-03c2 r2 · estados vecinos del reintento y del foco", () => {
  it("CL3-2R2-11: salir durante la espera del reintento de la recarga y volver antes de 30 s: se pide al volver y se ve el orden del PUT", async () => {
    const servidor = crearServidor()
    const { router } = montar()
    await listo()
    // El primer intento falla; el segundo nunca llega a salir porque la vista se va antes.
    servidor.fallarDosVeces(() => errorDeApi(500, "ERROR_INTERNO", "caído"))
    fireEvent.click(boton("Subir", "Unidad 2"))
    await waitFor(() => expect(servidor.getsDeSeccion()).toBe(2))
    await ir(router, "/otra")
    await reposar(1500)
    const antes = servidor.getsDeSeccion()
    servidor.estado.seccion.length = 0
    vi.setSystemTime(new Date(AHORA.getTime() + 5_000))
    await ir(router, -1)
    await waitFor(() => expect(servidor.getsDeSeccion()).toBeGreaterThan(antes))
    await waitFor(() => expect(nombres()).toEqual(["Unidad 2", "Unidad 1", "Unidad 3"]))
    sinEspera()
    expect(servidor.ordenes()).toHaveLength(1)
  })

  it.each([
    ["Subir", "Unidad 3"],
    ["Bajar", "Unidad 1"],
  ] as const)(
    "CL3-2R2-12: «%s %s» con la recarga fallida: el foco queda en un control del tema que se movió, nunca en <body>",
    async (accion, tema) => {
      const servidor = crearServidor()
      montar()
      await listo()
      servidor.fallarDosVeces(() => errorDeApi(500, "ERROR_INTERNO", "caído"))
      const control = boton(accion, tema)
      control.focus()
      fireEvent.click(control)
      await waitFor(() => expect(errores()).toEqual([RECARGA_FALLIDA]), { timeout: 4000 })
      await waitFor(sinEspera)
      await reposar()
      expect(document.activeElement).not.toBe(document.body)
      const seccion = (document.activeElement as HTMLElement | null)?.closest("section")
      expect(seccion?.getAttribute("aria-labelledby")).toBeTruthy()
      expect(seccion?.textContent).toContain(tema)
    },
  )
})
