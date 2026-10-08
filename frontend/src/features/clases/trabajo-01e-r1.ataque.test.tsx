import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { crearLimiteDeConcurrencia } from "./lib"
import { TrabajoView } from "./trabajo-view"

// Ataque del Tester, TAREAS-01e, ronda 1: "Trabajo de clase" (§D-11, Enmiendas 5 y 6; DESIGN §7.22) y
// el limitador de lecturas. Sin selectores de clase. Contrato de los dobles (Enmienda 5): ningún caso
// termina con lugares del limitador ocupados; el doble rechaza con AbortError al abortarse su signal.

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

interface Opciones {
  retener?: boolean
  manejar?: (metodo: string, ruta: string, cuerpo: unknown) => Response | undefined
}

const crearServidor = (datos: Servidor, { retener = false, manejar }: Opciones = {}) => {
  const llamadas: { metodo: string; ruta: string; params: URLSearchParams }[] = []
  const pendientes: (() => void)[] = []
  let enVuelo = 0
  let maximo = 0
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
        maximo = Math.max(maximo, enVuelo)
        return new Promise<Response>((resolver, rechazar) => {
          let asentado = false
          const asentar = () => {
            if (asentado) return false
            asentado = true
            enVuelo -= 1
            return true
          }
          pendientes.push(() => {
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
    soltarTodo: () => {
      for (const soltar of pendientes.splice(0)) soltar()
    },
    enVuelo: () => enVuelo,
    maximo: () => maximo,
  }
}

const renderTrabajo = (ruta: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path: "/estudiante/clases/:claseId/trabajo", element: <TrabajoView /> },
      { path: "/maestro/clases/:claseId/trabajo", element: <TrabajoView /> },
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

describe("ataque TAREAS-01e r1: el estudiante y puedeMover", () => {
  it("el estudiante nunca ve «Mover» ni el selector de tema, aunque el servidor diga puedeMover: true", async () => {
    crearServidor({
      temas: [{ id: idTema(1), nombre: "Unidad 1" }],
      elementos: { [idTema(1)]: [material(1, true)] },
    })
    renderTrabajo(`/estudiante/clases/${CLASE}/trabajo`)
    expect(await screen.findByText("Lectura 1")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Mover" })).toBeNull()
    expect(screen.queryByRole("combobox")).toBeNull()
  })
})

describe("ataque TAREAS-01e r1: «Ver más» y el limitador (sin hallazgo esperado)", () => {
  it("«Ver más» tras la primera página de 5 trae 20 y luego el resto: 27 elementos, sin repetidos ni huecos y en orden", async () => {
    const lista = Array.from({ length: 27 }, (_, i) => material(i + 1, false))
    const servidor = crearServidor({
      temas: [{ id: idTema(1), nombre: "Unidad 1" }],
      elementos: { [idTema(1)]: lista },
    })
    renderTrabajo(`/estudiante/clases/${CLASE}/trabajo`)
    await screen.findByText("Lectura 5")
    const visibles = () => screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)
    expect(visibles()).toHaveLength(5)
    fireEvent.click(screen.getByRole("button", { name: /^Ver más de Unidad 1/ }))
    await screen.findByText("Lectura 25")
    fireEvent.click(screen.getByRole("button", { name: /^Ver más de Unidad 1/ }))
    await screen.findByText("Lectura 27")
    expect(visibles()).toEqual(lista.map((e) => e.titulo))
    expect(screen.queryByRole("button", { name: /^Ver más de/ })).toBeNull()
    const limites = servidor.llamadas
      .filter((l) => l.ruta.endsWith("/trabajo"))
      .map((l) => [l.params.get("limite"), l.params.get("cursor")])
    expect(limites).toEqual([
      ["5", null],
      ["20", idElemento(5)],
      ["20", idElemento(25)],
    ])
  })

  it("con 8 temas retenidos solo hay 6 en vuelo; al desmontar se liberan todos y otra vista obtiene sus 6 lugares", async () => {
    const temas = Array.from({ length: 8 }, (_, i) => ({
      id: idTema(i + 1),
      nombre: `U${String(i + 1)}`,
    }))
    const elementos = Object.fromEntries(temas.map((t, i) => [t.id, [material(i + 1, false)]]))
    let servidor = crearServidor({ temas, elementos }, { retener: true })
    renderTrabajo(`/estudiante/clases/${CLASE}/trabajo`)
    await waitFor(() => expect(servidor.enVuelo()).toBe(6))
    await act(() => new Promise((r) => setTimeout(r, 20)))
    expect(servidor.maximo()).toBe(6)
    cleanup()
    await waitFor(() => expect(servidor.enVuelo()).toBe(0))

    vi.unstubAllGlobals()
    servidor = crearServidor({ temas, elementos }, { retener: true })
    renderTrabajo(`/estudiante/clases/${CLASE}/trabajo`)
    await waitFor(() => expect(servidor.enVuelo()).toBe(6))
    await act(async () => {
      servidor.soltarTodo()
      await Promise.resolve()
    })
    await waitFor(() => expect(servidor.enVuelo()).toBe(2))
    await act(async () => {
      servidor.soltarTodo()
      await Promise.resolve()
    })
    await waitFor(() => expect(screen.getByText("Lectura 8")).toBeInTheDocument())
    expect(servidor.enVuelo()).toBe(0)
    expect(servidor.maximo()).toBe(6)
  })

  it("crearLimiteDeConcurrencia: signal ya abortado, aborto en espera, error y aborto en curso liberan su lugar; al final cabe otra tanda completa", async () => {
    const limite = crearLimiteDeConcurrencia(2)
    let corriendo = 0
    const sueltas: (() => void)[] = []
    const tarea =
      (falla = false) =>
      () =>
        new Promise<string>((resolver, rechazar) => {
          corriendo += 1
          sueltas.push(() => {
            corriendo -= 1
            if (falla) rechazar(new Error("x"))
            else resolver("ok")
          })
        })
    const yaAbortado = new AbortController()
    yaAbortado.abort()
    await expect(limite.ejecutar(tarea(), yaAbortado.signal)).rejects.toThrow()
    expect(corriendo).toBe(0)

    const a = limite.ejecutar(tarea(true))
    const b = limite.ejecutar(tarea())
    const enEspera = new AbortController()
    const c = limite.ejecutar(tarea(), enEspera.signal)
    const d = limite.ejecutar(tarea())
    expect(corriendo).toBe(2)
    enEspera.abort()
    await expect(c).rejects.toThrow()
    sueltas.shift()?.()
    await expect(a).rejects.toThrow("x")
    expect(corriendo).toBe(2)
    sueltas.shift()?.()
    sueltas.shift()?.()
    await expect(Promise.all([b, d])).resolves.toEqual(["ok", "ok"])
    expect(corriendo).toBe(0)

    const e = limite.ejecutar(tarea())
    const f = limite.ejecutar(tarea())
    expect(corriendo).toBe(2)
    sueltas.splice(0).forEach((soltar) => soltar())
    await expect(Promise.all([e, f])).resolves.toEqual(["ok", "ok"])
  })
})

describe("ataque TAREAS-01e r1: ordenar y mover (sin hallazgo esperado)", () => {
  it("doble clic humano (30 ms) en «Subir» manda un solo PUT del orden", async () => {
    let soltar: (r: Response) => void = () => undefined
    const datos = {
      temas: [
        { id: idTema(1), nombre: "Unidad 1" },
        { id: idTema(2), nombre: "Unidad 2" },
      ],
      elementos: {},
    }
    const servidor = crearServidor(datos)
    const base = globalThis.fetch
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada, init) => {
        if ((init?.method ?? "GET") === "PUT") {
          servidor.llamadas.push({
            metodo: "PUT",
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
    const subir = await screen.findByRole("button", { name: /Subir.*Unidad 2/ })
    fireEvent.click(subir)
    await act(() => new Promise((r) => setTimeout(r, 30)))
    fireEvent.click(subir)
    await act(() => new Promise((r) => setTimeout(r, 30)))
    expect(servidor.llamadas.filter((l) => l.metodo === "PUT")).toHaveLength(1)
    await act(async () => {
      soltar(
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
    await waitFor(() =>
      expect(
        screen
          .getAllByRole("heading", { level: 2 })
          .filter((h) => h.closest("section") !== null)
          .map((h) => h.textContent.split(" \u00B7 ")[0]),
      ).toEqual(["Unidad 2", "Unidad 1"]),
    )
  })

  it("mover a un tema que ya no existe (404 TEMA_NO_ENCONTRADO): avisa, vuelve a pedir los temas y el selector deja de ofrecerlo", async () => {
    const datos: Servidor = {
      temas: [
        { id: idTema(1), nombre: "Unidad 1" },
        { id: idTema(2), nombre: "Unidad 2" },
      ],
      elementos: { [idTema(1)]: [material(1, true)] },
    }
    const servidor = crearServidor(datos, {
      manejar: (metodo, ruta) => {
        if (metodo !== "PUT" || !ruta.endsWith("/tema")) return undefined
        datos.temas = datos.temas.filter((t) => t.id !== idTema(2))
        return errorDeApi(404, "TEMA_NO_ENCONTRADO", "Ese tema ya no existe.")
      },
    })
    renderTrabajo(`/maestro/clases/${CLASE}/trabajo`)
    const select = await screen.findByLabelText("Tema de «Lectura 1»")
    fireEvent.change(select, { target: { value: idTema(2) } })
    const fila = select.closest("li")
    if (fila === null) throw new Error("el selector no está en una fila")
    const pedidasAntes = servidor.llamadas.filter((l) => l.ruta.endsWith("/temas")).length
    fireEvent.click(within(fila).getByRole("button", { name: "Mover" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith("Ese tema ya no existe."))
    await waitFor(() =>
      expect(servidor.llamadas.filter((l) => l.ruta.endsWith("/temas")).length).toBeGreaterThan(
        pedidasAntes,
      ),
    )
    await waitFor(() =>
      expect(
        within(screen.getByLabelText("Tema de «Lectura 1»")).queryByText("Unidad 2"),
      ).toBeNull(),
    )
  })
})
