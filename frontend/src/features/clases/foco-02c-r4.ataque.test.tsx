import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { createMemoryRouter, RouterProvider, type RouteObject } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { ClaseLayout } from "./clase-layout"
import { ClasesAdminView } from "./clases-admin-view"
import { MaestrosDeClaseView } from "./maestros-de-clase-view"
import { MuroView } from "./muro-view"

// Tester, CLASES-02c, ronda 4 (cerrada, solo T-05). useFocoAlPasarAError(esError, tieneDatos,
// destino) en sus cuatro usos: ClaseLayout, MaestrosDeClaseView sola, la lista del muro y
// /admin/clases. El foco se mueve solo si la consulta pasa a error ahora, tuvo datos alguna vez y
// el foco se perdió. Casos: primera carga que falla (con y sin foco en la página), error en la caché
// al montar (con y sin datos), recarga que falla tras tener datos (foco en un control de la vista y
// foco ya movido por la persona), dos fallos seguidos, éxito-error-éxito-error y cambio de
// claseId con el gancho montado. Sin selectores de clases de estilo.

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const CLASE_A = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const CLASE_B = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02"
const LUIS = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const MARIA = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d10", nombre: "María Gómez" }
const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const ERROR_LISTA = "No pudimos cargar las clases. Revisa tu conexión e inténtalo de nuevo."

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const error500 = () =>
  respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "mensaje del servidor" } })

const cuerpoDetalle = (claseId: string, nombre: string) => ({
  clase: { id: claseId, nombre, descripcion: null, maestro: LUIS, maestros: [LUIS, MARIA] },
})
const cuerpoMuro = (claseId: string) => ({
  publicaciones: [
    {
      id:
        claseId === CLASE_A
          ? "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11"
          : "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d12",
      tipo: "anuncio",
      titulo: null,
      texto: `Publicación de ${claseId === CLASE_A ? "A" : "B"}`,
      autor: { ...LUIS, administracion: false },
      creadoEn: "2026-10-01T15:30:00.000Z",
      comentarios: 0,
      adjuntos: [],
      puedeBorrar: false,
    },
  ],
  siguienteCursor: null,
})
const cuerpoLista = {
  clases: [
    {
      id: "9a9b3c4d-1c1f-4b8e-9a1e-000000000001",
      nombre: "Clase 1",
      maestros: [LUIS],
      alumnos: 1,
      creadoEn: "2026-10-01T15:00:00.000Z",
    },
  ],
  total: 1,
  siguienteCursor: null,
}

// Qué responde cada clase, cambiable a mitad de la prueba.
const estado = { ok: new Set<string>() }

const stubFetch = () =>
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada) => {
      const ruta = String(entrada)
      for (const claseId of [CLASE_A, CLASE_B]) {
        const sana = estado.ok.has(claseId)
        if (ruta === `/api/clases/${claseId}`) {
          return Promise.resolve(
            sana
              ? respuestaJson(
                  200,
                  cuerpoDetalle(claseId, `Clase ${claseId === CLASE_A ? "A" : "B"}`),
                )
              : error500(),
          )
        }
        if (ruta === `/api/clases/${claseId}/codigo`) {
          return Promise.resolve(respuestaJson(200, { codigo: "ABCDEFG" }))
        }
        if (ruta.startsWith(`/api/clases/${claseId}/publicaciones`)) {
          return Promise.resolve(sana ? respuestaJson(200, cuerpoMuro(claseId)) : error500())
        }
      }
      if (ruta.startsWith("/api/admin/clases?")) {
        return Promise.resolve(
          estado.ok.has("lista") ? respuestaJson(200, cuerpoLista) : error500(),
        )
      }
      return Promise.resolve(error500())
    }),
  )

interface Uso {
  nombre: string
  rutas: RouteObject[]
  ruta: (claseId: string) => string
  // Algo de la vista con datos que desaparece cuando la vista pasa a error.
  controlInterno: () => Promise<HTMLElement>
  // El destino del foco en la rama de error.
  destino: () => HTMLElement
  textoDeError: string
  clave: (claseId: string) => readonly unknown[]
  sano: (claseId: string) => string
}

const USOS: Uso[] = [
  {
    nombre: "ClaseLayout",
    rutas: [
      {
        path: "/admin/clases/:claseId",
        element: <ClaseLayout />,
        children: [{ index: true, element: <p>contenido</p> }],
      },
    ],
    ruta: (claseId) => `/admin/clases/${claseId}`,
    controlInterno: () => screen.findByRole("button", { name: "Copiar código" }),
    destino: () => {
      const alerta = screen.getByRole("alert")
      const contenedor = alerta.closest('[tabindex="-1"]')
      if (!(contenedor instanceof HTMLElement))
        throw new Error("Precondición: sin contenedor del error")
      return contenedor
    },
    textoDeError: GENERICO,
    clave: (claseId) => ["clases", claseId],
    sano: (claseId) => claseId,
  },
  {
    nombre: "MaestrosDeClaseView sola",
    rutas: [{ path: "/admin/clases/:claseId/maestros", element: <MaestrosDeClaseView /> }],
    ruta: (claseId) => `/admin/clases/${claseId}/maestros`,
    controlInterno: () => screen.findByRole("button", { name: "Quitar Luis Pérez" }),
    destino: () => {
      const alerta = screen.getByRole("alert")
      const contenedor = alerta.closest('[tabindex="-1"]')
      if (!(contenedor instanceof HTMLElement))
        throw new Error("Precondición: sin contenedor del error")
      return contenedor
    },
    textoDeError: GENERICO,
    clave: (claseId) => ["clases", claseId],
    sano: (claseId) => claseId,
  },
  {
    nombre: "lista del muro",
    rutas: [{ path: "/estudiante/clases/:claseId", element: <MuroView /> }],
    ruta: (claseId) => `/estudiante/clases/${claseId}`,
    controlInterno: () => screen.findByRole("button", { name: "Ver comentarios (0)" }),
    destino: () => screen.getByRole("heading", { name: "Publicaciones" }),
    textoDeError: GENERICO,
    clave: (claseId) => ["clases", claseId, "publicaciones"],
    sano: (claseId) => claseId,
  },
  {
    nombre: "/admin/clases",
    rutas: [{ path: "/admin/clases", element: <ClasesAdminView /> }],
    ruta: () => "/admin/clases",
    controlInterno: () => screen.findByRole("link", { name: "Abrir Clase 1" }),
    destino: () => screen.getByRole("heading", { level: 1, name: "Clases" }),
    textoDeError: ERROR_LISTA,
    clave: () => ["clases", "admin"],
    sano: () => "lista",
  },
]

const montar = (
  uso: Uso,
  rutaInicial: string,
  cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) => {
  const router = createMemoryRouter([...uso.rutas, { path: "*", element: <p>otra</p> }], {
    initialEntries: [rutaInicial],
  })
  const envoltorio = (hijo: ReactNode) => (
    <QueryClientProvider client={cliente}>
      <button type="button">Fuera de la vista</button>
      {hijo}
    </QueryClientProvider>
  )
  render(envoltorio(<RouterProvider router={router} />))
  return { cliente, router }
}

const esperar = (ms: number) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))
const fuera = () => screen.getByRole("button", { name: "Fuera de la vista" })
const recargar = async (cliente: QueryClient, clave: readonly unknown[]) => {
  await act(async () => {
    await cliente.invalidateQueries({ queryKey: clave })
  })
  await esperar(40)
}

beforeEach(() => {
  establecerToken("token-de-prueba")
  estado.ok.clear()
  stubFetch()
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
})

describe.each(USOS)("ataque CLASES-02c r4: useFocoAlPasarAError en $nombre", (uso) => {
  it("primera carga que falla, sin foco en la página: el foco se queda en <body>", async () => {
    montar(uso, uso.ruta(CLASE_A))
    await screen.findByText(uso.textoDeError)
    await esperar(60)
    expect(document.activeElement).toBe(document.body)
  })

  it("primera carga que falla, con el foco fuera de la vista: no se mueve", async () => {
    montar(uso, uso.ruta(CLASE_A))
    act(() => fuera().focus())
    await screen.findByText(uso.textoDeError)
    await esperar(60)
    expect(document.activeElement).toBe(fuera())
  })

  it("error ya en la caché al montar, sin datos: el foco se queda en <body>", async () => {
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    await cliente.prefetchQuery({
      queryKey: uso.clave(CLASE_A),
      queryFn: () => Promise.reject(new Error("antes")),
    })
    montar(uso, uso.ruta(CLASE_A), cliente)
    await screen.findByText(uso.textoDeError)
    await esperar(60)
    expect(document.activeElement).toBe(document.body)
  })

  it("recarga que falla tras tener datos, con el foco en un control de la vista: el foco va al destino del error; con el foco movido por la persona, no se mueve", async () => {
    estado.ok.add(uso.sano(CLASE_A))
    const { cliente } = montar(uso, uso.ruta(CLASE_A))
    const control = await uso.controlInterno()
    act(() => control.focus())
    estado.ok.clear()
    await recargar(cliente, uso.clave(CLASE_A))
    await screen.findByText(uso.textoDeError)
    await esperar(30)
    expect(document.activeElement, "con el foco en la vista").toBe(uso.destino())
    cleanup()

    estado.ok.add(uso.sano(CLASE_A))
    const otra = montar(uso, uso.ruta(CLASE_A))
    await uso.controlInterno()
    act(() => fuera().focus())
    estado.ok.clear()
    await recargar(otra.cliente, uso.clave(CLASE_A))
    await screen.findByText(uso.textoDeError)
    await esperar(30)
    expect(document.activeElement, "con el foco movido por la persona").toBe(fuera())
  })

  it("dos fallos seguidos: el segundo no mueve el foco, ni desde el destino ni desde <body>", async () => {
    estado.ok.add(uso.sano(CLASE_A))
    const { cliente } = montar(uso, uso.ruta(CLASE_A))
    const control = await uso.controlInterno()
    act(() => control.focus())
    estado.ok.clear()
    await recargar(cliente, uso.clave(CLASE_A))
    await screen.findByText(uso.textoDeError)
    await esperar(30)
    const destino = uso.destino()
    expect(document.activeElement).toBe(destino)
    await recargar(cliente, uso.clave(CLASE_A))
    expect(document.activeElement, "segundo fallo desde el destino").toBe(destino)
    act(() => (document.activeElement as HTMLElement).blur())
    expect(document.activeElement).toBe(document.body)
    await recargar(cliente, uso.clave(CLASE_A))
    expect(document.activeElement, "tercer fallo desde <body>").toBe(document.body)
  })

  it("éxito, error, éxito, error: cada paso a error con el foco en un control de la vista lleva el foco al destino", async () => {
    estado.ok.add(uso.sano(CLASE_A))
    const { cliente } = montar(uso, uso.ruta(CLASE_A))
    for (const vuelta of [1, 2]) {
      const control = await uso.controlInterno()
      act(() => control.focus())
      estado.ok.clear()
      await recargar(cliente, uso.clave(CLASE_A))
      await screen.findByText(uso.textoDeError)
      await esperar(30)
      expect(document.activeElement, `paso a error número ${String(vuelta)}`).toBe(uso.destino())
      estado.ok.add(uso.sano(CLASE_A))
      await recargar(cliente, uso.clave(CLASE_A))
      await waitFor(() => expect(screen.queryByText(uso.textoDeError)).toBeNull())
    }
  })
})

// La misma instancia de ClaseLayout y de MuroView sirve a dos clases (ConClaseDeLaRuta no cambia de
// key): la clase A tuvo datos; la B falla en su primera carga. Para B es una primera carga, así que
// el foco no debería moverse por la memoria de que A tuvo datos.
describe.each(USOS.filter((uso) => uso.nombre !== "/admin/clases"))(
  "ataque CLASES-02c r4: cambio de claseId con el gancho montado ($nombre)",
  (uso) => {
    it("A con datos, navegar a B que falla en su primera carga con el foco en <body>: el foco se queda en <body>", async () => {
      estado.ok.add(CLASE_A)
      const { router } = montar(uso, uso.ruta(CLASE_A))
      await uso.controlInterno()
      act(() => (document.activeElement as HTMLElement | null)?.blur())
      expect(document.activeElement).toBe(document.body)
      await act(async () => {
        await router.navigate(uso.ruta(CLASE_B))
      })
      await screen.findByText(uso.textoDeError)
      await esperar(60)
      expect(document.activeElement).toBe(document.body)
    })

    it("A con datos, navegar a B que falla en su primera carga con el foco fuera de la vista: no se mueve", async () => {
      estado.ok.add(CLASE_A)
      const { router } = montar(uso, uso.ruta(CLASE_A))
      await uso.controlInterno()
      act(() => fuera().focus())
      await act(async () => {
        await router.navigate(uso.ruta(CLASE_B))
      })
      await screen.findByText(uso.textoDeError)
      await esperar(60)
      expect(document.activeElement).toBe(fuera())
    })
  },
)
