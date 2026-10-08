import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { clavePrefijoDelTrabajo } from "@/services/trabajoService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { TrabajoView } from "./trabajo-view"

// Ataque del Tester, TAREAS-01e, ronda 2: los remedios de T-16 y de M-01/M-02 en "Trabajo de clase"
// (guardas síncronas que se liberan tras un error y permiten un segundo intento; "Cancelar" con el envío
// en vuelo) y "Ver más" durante una recarga en segundo plano. Sin selectores de clase. Ningún caso
// termina con lugares del limitador ocupados.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorDeApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const uuid = (prefijo: string, n: number) =>
  `${prefijo}-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const CLASE = uuid("2a2b3c4d", 1)
const idTema = (n: number) => uuid("7a7b3c4d", n)
const idElemento = (n: number) => uuid("5a5b3c4d", n)
const AUTOR = { id: uuid("3a3b3c4d", 9), nombre: "Luis Pérez", administracion: false }

const material = (n: number, puedeMover: boolean) => ({
  id: idElemento(n),
  tipo: "material" as const,
  titulo: `Lectura ${String(n)}`,
  autor: AUTOR,
  creadoEn: "2026-10-01T15:00:00.000Z",
  material: { texto: "", adjuntos: [] },
  tarea: null,
  puedeMover,
})

type Elemento = ReturnType<typeof material>

interface Servidor {
  temas: { id: string; nombre: string }[]
  elementos: Record<string, Elemento[]>
}

type Manejar = (metodo: string, ruta: string, cuerpo: unknown) => Response | undefined

const crearServidor = (datos: Servidor, manejar?: Manejar) => {
  const llamadas: { metodo: string; ruta: string; params: URLSearchParams }[] = []
  const retenidas: (() => void)[] = []
  let retener = false
  let enVuelo = 0
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = new URL(String(entrada), "http://localhost")
      const metodo = init?.method ?? "GET"
      llamadas.push({ metodo, ruta: url.pathname, params: url.searchParams })
      const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : null
      const propia = manejar?.(metodo, url.pathname, cuerpo)
      if (propia !== undefined) return Promise.resolve(propia)
      if (metodo === "GET" && url.pathname.endsWith("/temas")) {
        return Promise.resolve(
          respuestaJson(200, {
            temas: datos.temas.map((t, orden) => ({
              ...t,
              orden,
              elementos: datos.elementos[t.id]?.length ?? 0,
            })),
            sinTema: datos.elementos["sin-tema"]?.length ?? 0,
          }),
        )
      }
      if (metodo === "GET" && url.pathname.endsWith("/trabajo")) {
        const lista = datos.elementos[url.searchParams.get("tema") ?? ""] ?? []
        const limite = Number(url.searchParams.get("limite") ?? "20")
        const cursor = url.searchParams.get("cursor")
        const desde = cursor === null ? 0 : lista.findIndex(({ id }) => id === cursor) + 1
        const pagina = lista.slice(desde, desde + limite)
        const quedan = desde + limite < lista.length
        const respuesta = () =>
          respuestaJson(200, {
            elementos: pagina,
            siguienteCursor: quedan ? (pagina.at(-1)?.id ?? null) : null,
          })
        if (!retener) return Promise.resolve(respuesta())
        enVuelo += 1
        return new Promise<Response>((resolver, rechazar) => {
          let asentado = false
          const asentar = () => {
            if (asentado) return false
            asentado = true
            enVuelo -= 1
            return true
          }
          retenidas.push(() => {
            if (asentar()) resolver(respuesta())
          })
          init?.signal?.addEventListener("abort", () => {
            if (asentar()) rechazar(new DOMException("aborted", "AbortError"))
          })
        })
      }
      return Promise.resolve(errorDeApi(500, "ERROR_INTERNO", "sin manejador"))
    }),
  )
  return {
    llamadas,
    retenerTrabajo: (valor: boolean) => {
      retener = valor
    },
    soltar: () => {
      for (const soltar of retenidas.splice(0)) soltar()
    },
    enVuelo: () => enVuelo,
    de: (metodo: string) => llamadas.filter((l) => l.metodo === metodo),
  }
}

const renderTrabajo = (ruta: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path: "/estudiante/clases/:claseId/trabajo", element: <TrabajoView /> },
      { path: "/maestro/clases/:claseId/trabajo", element: <TrabajoView /> },
      { path: "/admin/clases/:claseId/trabajo", element: <TrabajoView /> },
    ],
    { initialEntries: [ruta] },
  )
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return queryClient
}

const esperar = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)))

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.success.mockReset()
  aviso.error.mockReset()
})

const dosTemas = (): Servidor => ({
  temas: [
    { id: idTema(1), nombre: "Unidad 1" },
    { id: idTema(2), nombre: "Unidad 2" },
  ],
  elementos: { [idTema(1)]: [material(1, true)] },
})

describe("ataque TAREAS-01e r2: las guardas síncronas se liberan tras un error (segundo intento posible)", () => {
  it("«Subir»: un 500 avisa y libera la guarda; el segundo «Subir» sí manda el PUT", async () => {
    let intentos = 0
    const servidor = crearServidor(dosTemas(), (metodo, ruta) => {
      if (metodo !== "PUT" || !ruta.endsWith("/temas/orden")) return undefined
      intentos += 1
      if (intentos === 1) return errorDeApi(500, "ERROR_INTERNO", "Error interno")
      return respuestaJson(200, {
        temas: [
          { id: idTema(2), nombre: "Unidad 2", orden: 0, elementos: 0 },
          { id: idTema(1), nombre: "Unidad 1", orden: 1, elementos: 1 },
        ],
        sinTema: 0,
      })
    })
    renderTrabajo(`/maestro/clases/${CLASE}/trabajo`)
    fireEvent.click(await screen.findByRole("button", { name: /Subir.*Unidad 2/ }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await esperar(10)
    fireEvent.click(screen.getByRole("button", { name: /Subir.*Unidad 2/ }))
    await waitFor(() => expect(servidor.de("PUT")).toHaveLength(2))
  })

  it("«Mover»: un 500 avisa y libera la guarda; el segundo «Mover» sí manda el PUT", async () => {
    const servidor = crearServidor(dosTemas(), (metodo, ruta) =>
      metodo === "PUT" && ruta.endsWith("/tema")
        ? errorDeApi(500, "ERROR_INTERNO", "Error interno")
        : undefined,
    )
    renderTrabajo(`/maestro/clases/${CLASE}/trabajo`)
    const select = await screen.findByLabelText("Tema de «Lectura 1»")
    fireEvent.change(select, { target: { value: idTema(2) } })
    const fila = select.closest("li")
    if (fila === null) throw new Error("el selector no está en una fila")
    fireEvent.click(within(fila).getByRole("button", { name: "Mover" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await esperar(10)
    fireEvent.click(within(fila).getByRole("button", { name: "Mover" }))
    await waitFor(() => expect(servidor.de("PUT")).toHaveLength(2))
  })

  it("«Sí, borrar tema»: un 500 avisa, la confirmación sigue, «Cancelar» vuelve a actuar y un segundo intento manda otro DELETE", async () => {
    const servidor = crearServidor(dosTemas(), (metodo) =>
      metodo === "DELETE" ? errorDeApi(500, "ERROR_INTERNO", "Error interno") : undefined,
    )
    renderTrabajo(`/maestro/clases/${CLASE}/trabajo`)
    fireEvent.click(await screen.findByRole("button", { name: /^Borrar tema.*Unidad 2/ }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar tema" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await esperar(10)
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar tema" }))
    await waitFor(() => expect(servidor.de("DELETE")).toHaveLength(2))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2))
    await esperar(10)
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^Borrar tema.*Unidad 2/ })).toHaveFocus(),
    )
  })

  it("M-02: «Crear tema» con nombre repetido, «Cancelar» en vuelo no cierra; al llegar el 409 el error queda bajo el campo, el formulario sigue abierto y después «Cancelar» sí cierra y devuelve el foco a «Nuevo tema»", async () => {
    let soltar: (r: Response) => void = () => undefined
    const servidor = crearServidor(dosTemas())
    const base = globalThis.fetch
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada, init) => {
        if ((init?.method ?? "GET") === "POST") {
          servidor.llamadas.push({
            metodo: "POST",
            ruta: String(entrada),
            params: new URLSearchParams(),
          })
          return new Promise<Response>((resolver) => {
            soltar = resolver
          })
        }
        return base(entrada, init)
      }),
    )
    renderTrabajo(`/maestro/clases/${CLASE}/trabajo`)
    fireEvent.click(await screen.findByRole("button", { name: "Nuevo tema" }))
    fireEvent.change(screen.getByLabelText("Nombre del tema"), { target: { value: "unidad 1" } })
    fireEvent.click(screen.getByRole("button", { name: "Crear tema" }))
    await waitFor(() => expect(servidor.de("POST")).toHaveLength(1))
    const cancelar = screen.getByRole("button", { name: "Cancelar" })
    fireEvent.click(cancelar)
    expect(screen.getByLabelText("Nombre del tema")).toBeInTheDocument()
    await act(async () => {
      soltar(errorDeApi(409, "TEMA_REPETIDO", "Ya hay un tema con ese nombre."))
      await Promise.resolve()
    })
    expect(await screen.findByText("Ya hay un tema con ese nombre.")).toBeInTheDocument()
    expect(screen.getByLabelText("Nombre del tema")).toHaveAttribute("aria-invalid", "true")
    expect(document.activeElement).not.toBe(document.body)
    await esperar(10)
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.getByRole("button", { name: "Nuevo tema" })).toHaveFocus())
    expect(servidor.de("POST")).toHaveLength(1)
  })
})

describe("ataque TAREAS-01e r2: T-16 en las perspectivas (sin hallazgo esperado)", () => {
  it.each([
    ["estudiante", true, false],
    ["maestro", false, false],
    ["maestro", true, true],
    ["admin", true, true],
  ] as const)(
    "%s con puedeMover %s: «Mover» visible = %s",
    async (perspectiva, puedeMover, visible) => {
      crearServidor({
        temas: [{ id: idTema(1), nombre: "Unidad 1" }],
        elementos: {
          [idTema(1)]: [material(1, puedeMover)],
          "sin-tema": [material(2, puedeMover)],
        },
      })
      renderTrabajo(`/${perspectiva}/clases/${CLASE}/trabajo`)
      await screen.findByText("Lectura 2")
      expect(screen.queryAllByRole("button", { name: "Mover" })).toHaveLength(visible ? 2 : 0)
    },
  )
})

describe("ataque TAREAS-01e r2: «Ver más» durante una recarga en segundo plano", () => {
  it("pulsar «Ver más de <tema>» mientras su lista se recarga no se pierde: o el botón queda en espera, o al terminar la recarga se pide la página siguiente", async () => {
    const lista = Array.from({ length: 7 }, (_, i) => material(i + 1, false))
    const servidor = crearServidor({
      temas: [{ id: idTema(1), nombre: "Unidad 1" }],
      elementos: { [idTema(1)]: lista },
    })
    const cliente = renderTrabajo(`/estudiante/clases/${CLASE}/trabajo`)
    await screen.findByText("Lectura 5")
    servidor.retenerTrabajo(true)
    await act(async () => {
      void cliente.invalidateQueries({ queryKey: clavePrefijoDelTrabajo(CLASE) })
      await Promise.resolve()
    })
    await waitFor(() => expect(servidor.enVuelo()).toBe(1))
    const verMas = screen.getByRole("button", { name: /^Ver más de Unidad 1/ })
    fireEvent.click(verMas)
    await esperar(10)
    const enEspera = verMas.getAttribute("aria-busy") === "true"
    servidor.retenerTrabajo(false)
    await act(async () => {
      servidor.soltar()
      await Promise.resolve()
    })
    await esperar(50)
    const conCursor = servidor
      .de("GET")
      .filter((l) => l.ruta.endsWith("/trabajo") && l.params.get("cursor") !== null)
    expect(servidor.enVuelo()).toBe(0)
    expect({ enEspera, paginaSiguiente: conCursor.length > 0 }).not.toEqual({
      enEspera: false,
      paginaSiguiente: false,
    })
  })
})
