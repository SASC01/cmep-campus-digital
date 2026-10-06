import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider, type RouteObject } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { ClaseLayout } from "./clase-layout"
import { MaestrosDeClaseView } from "./maestros-de-clase-view"
import { MuroView } from "./muro-view"

// Tester, CLASES-02c, ronda 5 (cerrada, solo T-06). useFocoAlPasarAError(esError, tieneDatos, clave,
// destino): al cambiar de clase con la vista montada (ConClaseDeLaRuta sin key), la memoria se
// reinicia con el estado de la consulta nueva y ese render no mueve el foco. En los tres usos con
// claseId: ClaseLayout, MaestrosDeClaseView sola y la lista del muro. Sin selectores de clases de
// estilo.

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const CLASES = {
  A: "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01",
  B: "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02",
  C: "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d03",
} as const
type Letra = keyof typeof CLASES
const LUIS = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const MARIA = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d10", nombre: "María Gómez" }
const GENERICO = "Algo salió mal. Inténtalo de nuevo."

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const error500 = () =>
  respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "mensaje del servidor" } })

const letraDe = (ruta: string): Letra | undefined =>
  (Object.keys(CLASES) as Letra[]).find((letra) => ruta.includes(CLASES[letra]))

// Estado del servidor por clase: sana (200) o no, y una compuerta opcional que retiene sus GET.
const servidor = {
  sanas: new Set<Letra>(),
  retenidas: new Map<Letra, Promise<void>>(),
}

const cuerpoDe = (ruta: string, letra: Letra) => {
  const claseId = CLASES[letra]
  if (ruta === `/api/clases/${claseId}`) {
    return {
      clase: {
        id: claseId,
        nombre: `Clase ${letra}`,
        descripcion: null,
        maestro: LUIS,
        maestros: [LUIS, MARIA],
      },
    }
  }
  if (ruta === `/api/clases/${claseId}/codigo`) return { codigo: "ABCDEFG" }
  return {
    publicaciones: [
      {
        id: `5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d1${String(Object.keys(CLASES).indexOf(letra))}`,
        tipo: "anuncio",
        titulo: null,
        texto: `Publicación de ${letra}`,
        autor: { ...LUIS, administracion: false },
        creadoEn: "2026-10-01T15:30:00.000Z",
        comentarios: 0,
        adjuntos: [],
        puedeBorrar: false,
      },
    ],
    siguienteCursor: null,
  }
}

const stubFetch = () =>
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (entrada) => {
      const ruta = String(entrada)
      const letra = letraDe(ruta)
      if (letra === undefined) return error500()
      const retenida = servidor.retenidas.get(letra)
      if (retenida && !ruta.endsWith("/codigo")) await retenida
      if (ruta.endsWith("/codigo")) return respuestaJson(200, cuerpoDe(ruta, letra))
      return servidor.sanas.has(letra) ? respuestaJson(200, cuerpoDe(ruta, letra)) : error500()
    }),
  )

interface Uso {
  nombre: string
  rutas: RouteObject[]
  ruta: (letra: Letra) => string
  // Texto que prueba que la vista muestra los datos de una clase.
  conDatos: (letra: Letra) => Promise<unknown>
  controlInterno: () => Promise<HTMLElement>
  destino: () => HTMLElement
  clave: (letra: Letra) => readonly unknown[]
}

const contenedorDelError = () => {
  const contenedor = screen.getByRole("alert").closest('[tabindex="-1"]')
  if (!(contenedor instanceof HTMLElement))
    throw new Error("Precondición: sin contenedor del error")
  return contenedor
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
    ruta: (letra) => `/admin/clases/${CLASES[letra]}`,
    conDatos: (letra) => screen.findByRole("heading", { level: 1, name: `Clase ${letra}` }),
    controlInterno: () => screen.findByRole("button", { name: "Copiar código" }),
    destino: contenedorDelError,
    clave: (letra) => ["clases", CLASES[letra]],
  },
  {
    nombre: "MaestrosDeClaseView sola",
    rutas: [{ path: "/admin/clases/:claseId/maestros", element: <MaestrosDeClaseView /> }],
    ruta: (letra) => `/admin/clases/${CLASES[letra]}/maestros`,
    conDatos: () => screen.findByRole("button", { name: "Quitar Luis Pérez" }),
    controlInterno: () => screen.findByRole("button", { name: "Quitar Luis Pérez" }),
    destino: contenedorDelError,
    clave: (letra) => ["clases", CLASES[letra]],
  },
  {
    nombre: "lista del muro",
    rutas: [{ path: "/estudiante/clases/:claseId", element: <MuroView /> }],
    ruta: (letra) => `/estudiante/clases/${CLASES[letra]}`,
    conDatos: (letra) => screen.findByText(`Publicación de ${letra}`),
    controlInterno: () => screen.findByRole("button", { name: "Ver comentarios (0)" }),
    destino: () => screen.getByRole("heading", { name: "Publicaciones" }),
    clave: (letra) => ["clases", CLASES[letra], "publicaciones"],
  },
]

const montar = (uso: Uso, inicio: Letra) => {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter([...uso.rutas, { path: "*", element: <p>otra</p> }], {
    initialEntries: [uso.ruta(inicio)],
  })
  render(
    <QueryClientProvider client={cliente}>
      <button type="button">Fuera de la vista</button>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  const ir = async (letra: Letra) => {
    await act(async () => {
      await router.navigate(uso.ruta(letra))
    })
  }
  return { cliente, ir }
}

const esperar = (ms: number) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))
const fuera = () => screen.getByRole("button", { name: "Fuera de la vista" })
const soltarFoco = () => act(() => (document.activeElement as HTMLElement | null)?.blur())

const retener = (letra: Letra) => {
  let soltar: () => void = () => undefined
  const compuerta = new Promise<void>((r) => {
    soltar = r
  })
  servidor.retenidas.set(letra, compuerta)
  return async () => {
    servidor.retenidas.delete(letra)
    await act(async () => {
      soltar()
      await compuerta
    })
  }
}

beforeEach(() => {
  establecerToken("token-de-prueba")
  servidor.sanas.clear()
  servidor.retenidas.clear()
  stubFetch()
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
})

describe.each(USOS)("ataque CLASES-02c r5: reinicio por claseId en $nombre", (uso) => {
  it("de A con datos a B cuya primera carga falla, con el foco en <body>: no se mueve", async () => {
    servidor.sanas.add("A")
    const { ir } = montar(uso, "A")
    await uso.conDatos("A")
    soltarFoco()
    await ir("B")
    await screen.findByText(GENERICO)
    await esperar(60)
    expect(document.activeElement).toBe(document.body)
  })

  it("de A con datos a B cuya primera carga falla, con el foco puesto fuera de la vista: no se mueve", async () => {
    servidor.sanas.add("A")
    const { ir } = montar(uso, "A")
    await uso.conDatos("A")
    act(() => fuera().focus())
    await ir("B")
    await screen.findByText(GENERICO)
    await esperar(60)
    expect(document.activeElement).toBe(fuera())
  })

  it("de A a B con datos en caché y luego una recarga fallida de B: el foco va al destino si se perdió, y no se mueve si la persona lo puso fuera", async () => {
    servidor.sanas.add("A").add("B")
    const { cliente, ir } = montar(uso, "A")
    await uso.conDatos("A")
    await ir("B")
    await uso.conDatos("B")
    await ir("A")
    await uso.conDatos("A")
    soltarFoco()
    await ir("B")
    await uso.conDatos("B")
    await esperar(30)
    expect(document.activeElement, "el cambio de clave movió el foco").toBe(document.body)
    const control = await uso.controlInterno()
    act(() => control.focus())
    servidor.sanas.delete("B")
    await act(async () => {
      await cliente.invalidateQueries({ queryKey: uso.clave("B") })
    })
    await screen.findByText(GENERICO)
    await esperar(30)
    expect(document.activeElement, "con el foco perdido").toBe(uso.destino())

    servidor.sanas.add("B")
    await act(async () => {
      await cliente.invalidateQueries({ queryKey: uso.clave("B") })
    })
    await uso.conDatos("B")
    act(() => fuera().focus())
    servidor.sanas.delete("B")
    await act(async () => {
      await cliente.invalidateQueries({ queryKey: uso.clave("B") })
    })
    await screen.findByText(GENERICO)
    await esperar(30)
    expect(document.activeElement, "con el foco puesto fuera").toBe(fuera())
  })

  it("de A en error a B en error: el foco no se mueve, ni desde <body> ni desde el destino del error de A", async () => {
    // A falla en su primera carga y se cambia a B, que también falla.
    const primera = montar(uso, "A")
    await screen.findByText(GENERICO)
    await primera.ir("B")
    await screen.findByText(GENERICO)
    await esperar(60)
    expect(document.activeElement, "de A en error a B en error, desde <body>").toBe(document.body)
    cleanup()

    // A tuvo datos y su recarga falló (el foco fue al destino); luego se cambia a B, que falla.
    servidor.sanas.add("A")
    const otra = montar(uso, "A")
    const control = await uso.controlInterno()
    act(() => control.focus())
    servidor.sanas.delete("A")
    await act(async () => {
      await otra.cliente.invalidateQueries({ queryKey: uso.clave("A") })
    })
    await screen.findByText(GENERICO)
    await esperar(30)
    expect(document.activeElement).toBe(uso.destino())
    await otra.ir("B")
    await esperar(60)
    expect(screen.getByText(GENERICO)).toBeInTheDocument()
    expect(
      document.activeElement === document.body || document.activeElement === uso.destino(),
    ).toBe(true)
    const antes = document.activeElement
    await esperar(60)
    expect(document.activeElement, "el error de B volvió a mover el foco").toBe(antes)
  })

  it("A → B → A con A en caché: la vuelta no mueve el foco, y la recarga fallida de A después sí, si el foco se perdió", async () => {
    servidor.sanas.add("A").add("B")
    const { cliente, ir } = montar(uso, "A")
    await uso.conDatos("A")
    soltarFoco()
    await ir("B")
    await uso.conDatos("B")
    await ir("A")
    await uso.conDatos("A")
    await esperar(30)
    expect(document.activeElement).toBe(document.body)
    const control = await uso.controlInterno()
    act(() => control.focus())
    servidor.sanas.delete("A")
    await act(async () => {
      await cliente.invalidateQueries({ queryKey: uso.clave("A") })
    })
    await screen.findByText(GENERICO)
    await esperar(30)
    expect(document.activeElement).toBe(uso.destino())
  })

  it("cambios rápidos de clase con peticiones en vuelo (A → B → C → A, B y C fallan al llegar): el foco no se mueve y A sigue con sus datos", async () => {
    servidor.sanas.add("A")
    const { ir } = montar(uso, "A")
    await uso.conDatos("A")
    soltarFoco()
    const soltarB = retener("B")
    const soltarC = retener("C")
    await ir("B")
    await ir("C")
    await ir("A")
    await soltarB()
    await soltarC()
    await uso.conDatos("A")
    await esperar(60)
    expect(document.activeElement).toBe(document.body)
    expect(screen.queryByText(GENERICO)).toBeNull()
  })

  it("el render del cambio de clave no mueve el foco aunque la clase nueva ya esté en error con datos en la caché", async () => {
    servidor.sanas.add("A").add("B")
    const { cliente, ir } = montar(uso, "A")
    await uso.conDatos("A")
    await ir("B")
    await uso.conDatos("B")
    await ir("A")
    await uso.conDatos("A")
    // B queda en error con sus datos viejos, sin estar montada.
    servidor.sanas.delete("B")
    await act(async () => {
      await cliente.refetchQueries({ queryKey: uso.clave("B"), type: "all" })
    })
    expect(cliente.getQueryState(uso.clave("B"))?.status).toBe("error")
    soltarFoco()
    await ir("B")
    await waitFor(() => expect(screen.queryByText(GENERICO)).not.toBeNull())
    await esperar(60)
    expect(document.activeElement).toBe(document.body)
  })
})

// En ClaseLayout y MaestrosDeClaseView, el control enfocado de A desaparece con el cambio (cargando de
// B) y el foco queda perdido: la primera carga fallida de B no debe moverlo. En el muro el foco lo
// mueve otra regla (la fila de publicación enfocada desaparece y §7.14 lleva el foco al encabezado),
// fuera del alcance de T-06; queda como observación del reporte.
describe.each(USOS.filter((uso) => uso.nombre !== "lista del muro"))(
  "ataque CLASES-02c r5: reinicio por claseId con el foco perdido al cambiar ($nombre)",
  (uso) => {
    it("de A con datos y el foco en un control de A, a B cuya primera carga falla: el foco no va al destino del error", async () => {
      servidor.sanas.add("A")
      const { ir } = montar(uso, "A")
      const control = await uso.controlInterno()
      act(() => control.focus())
      await ir("B")
      await screen.findByText(GENERICO)
      await esperar(60)
      expect(document.activeElement).not.toBe(uso.destino())
      expect(document.activeElement).toBe(document.body)
    })
  },
)
