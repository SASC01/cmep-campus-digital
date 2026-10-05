import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { ClaseLayout } from "./clase-layout"
import { ClasesAdminView } from "./clases-admin-view"
import { MaestrosDeClaseView } from "./maestros-de-clase-view"
import { MuroView } from "./muro-view"

// Tester, CLASES-02c, ronda 3 (la última). Ataque a la corrección de T-04 (useFocoAlPasarAError):
// el foco va a la rama de error solo cuando la consulta *pasa* a error y el foco se perdió. Se ataca
// que no se mueva si la persona ya lo puso en otro lado, ni en una vista que nace en error; que una
// segunda recarga fallida no lo vuelva a robar; que el contenedor del error no sea un tope de Tab
// extra; y que MensajeError conserve role="alert" y su texto. En ClaseLayout (los dos de maestros),
// MaestrosDeClaseView sola, la lista del muro (y su «Ver más publicaciones») y /admin/clases (y su
// «Cargar más clases»). Sin selectores de clases de estilo.

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const PUB_ID = "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11"
const LUIS = {
  id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
  nombre: "Luis Pérez",
  email: "luis@x.mx",
}
const MARIA = {
  id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d10",
  nombre: "María Gómez",
  email: "maria@x.mx",
}
const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const TABULABLES =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select, [tabindex]:not([tabindex="-1"])'

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const error500 = () =>
  respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "mensaje del servidor" } })

const detalle = (maestros: { id: string; nombre: string }[]) =>
  respuestaJson(200, {
    clase: { id: CLASE_ID, nombre: "Álgebra I", descripcion: null, maestro: maestros[0], maestros },
  })

const publicacion = (n: number) => ({
  id: n === 1 ? PUB_ID : `5a5b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`,
  tipo: "anuncio",
  titulo: null,
  texto: `Publicación ${String(n)}`,
  autor: { id: LUIS.id, nombre: LUIS.nombre, administracion: false },
  creadoEn: "2026-10-01T15:30:00.000Z",
  comentarios: 0,
  adjuntos: [],
  puedeBorrar: true,
})

const claseAdmin = (n: number) => ({
  id: `9a9b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`,
  nombre: `Clase ${String(n)}`,
  maestros: [{ id: LUIS.id, nombre: LUIS.nombre }],
  alumnos: n,
  creadoEn: "2026-10-01T15:00:00.000Z",
})

type Manejador = (ruta: string, metodo: string) => Response | Promise<Response>

const stubFetch = (manejador: Manejador) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) =>
    Promise.resolve(manejador(String(entrada), init?.method ?? "GET")),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

// Un botón fuera de la vista: el lugar donde la persona puso el foco por su cuenta.
const conProveedores = (ruta: string, rutas: ReactNode) => {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={cliente}>
      <button type="button">Fuera de la vista</button>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>{rutas}</Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return cliente
}

const esperar = (ms: number) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))
const fuera = () => screen.getByRole("button", { name: "Fuera de la vista" })

// La rama de error: el alerta con su texto, dentro del destino del foco, que no entra en el orden
// de Tab (tabIndex -1) ni duplica el rol del alerta.
const comprobarRamaDeError = (destino: Element | null) => {
  if (!(destino instanceof HTMLElement)) throw new Error("Precondición: no hay destino del foco")
  const alerta = screen.getByRole("alert")
  expect(alerta).toHaveTextContent(GENERICO)
  expect(destino.getAttribute("tabindex"), "el destino entra en el orden de Tab").toBe("-1")
  expect(destino.tabIndex).toBe(-1)
  expect(destino.getAttribute("role"), "el destino repite el rol del alerta").not.toBe("alert")
  expect(
    destino.contains(alerta) || destino.tagName.startsWith("H"),
    "el destino no lleva al alerta",
  ).toBe(true)
}

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

describe("ataque CLASES-02c r3: ClaseLayout y «Maestros de la clase» cuando la recarga falla", () => {
  const rutasConLayout = (
    <Route path="/admin/clases/:claseId" element={<ClaseLayout />}>
      <Route path="maestros" element={<MaestrosDeClaseView />} />
    </Route>
  )

  // Asignar a María responde 200; la recarga de la clase responde según `recargas`.
  const montarAsignar = (rutas: ReactNode, recargas: (() => Response)[]) => {
    let detalles = 0
    let asignado = false
    stubFetch((r, m) => {
      if (r === `/api/clases/${CLASE_ID}` && m === "GET") {
        detalles += 1
        if (!asignado) return detalle([LUIS])
        const siguiente = recargas.shift()
        return siguiente ? siguiente() : error500()
      }
      if (r === `/api/clases/${CLASE_ID}/codigo`) return respuestaJson(200, { codigo: "ABCDEFG" })
      if (r.startsWith("/api/admin/maestros/candidatos")) {
        return respuestaJson(200, { candidatos: [MARIA], hayMas: false })
      }
      if (r === `/api/admin/clases/${CLASE_ID}/maestros` && m === "POST") {
        asignado = true
        return respuestaJson(200, { maestros: [LUIS, MARIA] })
      }
      return error500()
    })
    const cliente = conProveedores(`/admin/clases/${CLASE_ID}/maestros`, rutas)
    return { cliente, detalles: () => detalles }
  }

  const asignarConFoco = async () => {
    await screen.findByRole("heading", { name: "Maestros de la clase" })
    fireEvent.change(screen.getByLabelText("Buscar maestro por nombre"), {
      target: { value: "Mari" },
    })
    const boton = await screen.findByRole("button", { name: "Asignar a la clase María Gómez" })
    act(() => boton.focus())
    fireEvent.click(boton)
  }

  it("con el foco perdido, va al contenedor del error de ClaseLayout: tabIndex -1, el alerta dentro con su texto, y el único tope de Tab de la rama es «Volver a la lista de clases»", async () => {
    montarAsignar(rutasConLayout, [error500])
    await asignarConFoco()
    await screen.findByText(GENERICO)
    await esperar(30)
    const destino = document.activeElement
    expect(destino).not.toBe(document.body)
    comprobarRamaDeError(destino)
    const tabulables = Array.from((destino as HTMLElement).querySelectorAll(TABULABLES)).map(
      (nodo) => nodo.textContent,
    )
    expect(tabulables).toEqual(["Volver a la lista de clases"])
  })

  it("si la persona puso el foco en otro lado antes de que falle la recarga, el foco no se mueve", async () => {
    let soltar: () => void = () => undefined
    const compuerta = new Promise<void>((r) => {
      soltar = r
    })
    montarAsignar(rutasConLayout, [])
    // La recarga queda en vuelo hasta que la persona mueve el foco.
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (entrada, init) => {
        const ruta = String(entrada)
        const metodo = init?.method ?? "GET"
        if (ruta === `/api/clases/${CLASE_ID}` && metodo === "GET") {
          await compuerta
          return error500()
        }
        if (ruta === `/api/admin/clases/${CLASE_ID}/maestros`) {
          return respuestaJson(200, { maestros: [LUIS, MARIA] })
        }
        if (ruta.startsWith("/api/admin/maestros/candidatos")) {
          return respuestaJson(200, { candidatos: [MARIA], hayMas: false })
        }
        return respuestaJson(200, { codigo: "ABCDEFG" })
      }),
    )
    await asignarConFoco()
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Asignaste a María Gómez"))
    act(() => fuera().focus())
    await act(async () => {
      soltar()
      await compuerta
    })
    await screen.findByText(GENERICO)
    await esperar(30)
    expect(document.activeElement).toBe(fuera())
  })

  it("una segunda recarga fallida no roba el foco que la persona puso en «Volver a la lista de clases»", async () => {
    const { cliente } = montarAsignar(rutasConLayout, [error500, error500])
    await asignarConFoco()
    await screen.findByText(GENERICO)
    await esperar(30)
    const volver = screen.getByRole("link", { name: "Volver a la lista de clases" })
    act(() => volver.focus())
    await act(async () => {
      await cliente.invalidateQueries({ queryKey: ["clases", CLASE_ID] })
    })
    await esperar(30)
    expect(screen.getByText(GENERICO)).toBeInTheDocument()
    expect(document.activeElement).toBe(volver)
  })

  it("si la primera carga falla con el foco puesto fuera de la vista, el foco no se mueve", async () => {
    stubFetch(() => error500())
    conProveedores(`/admin/clases/${CLASE_ID}/maestros`, rutasConLayout)
    act(() => fuera().focus())
    await screen.findByText(GENERICO)
    await esperar(30)
    expect(document.activeElement).toBe(fuera())
  })

  // La vista que ya nace en error (la consulta está en error en la caché al montarla, como al volver
  // a una clase que falló): el foco no se mueve, ni con su nueva petición fallida.
  it("una vista que ya nace en error (error en la caché al montar) no mueve el foco desde <body>", async () => {
    stubFetch(() => error500())
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    await cliente.prefetchQuery({
      queryKey: ["clases", CLASE_ID],
      queryFn: () => Promise.reject(new Error("falló antes")),
    })
    expect(cliente.getQueryState(["clases", CLASE_ID])?.status).toBe("error")
    render(
      <QueryClientProvider client={cliente}>
        <MemoryRouter initialEntries={[`/admin/clases/${CLASE_ID}/maestros`]}>
          <Routes>{rutasConLayout}</Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await screen.findByText(GENERICO)
    await esperar(60)
    expect(document.activeElement).toBe(document.body)
  })

  it("MaestrosDeClaseView montada sola: con el foco perdido, va a su contenedor del error, con el alerta dentro y fuera del orden de Tab", async () => {
    montarAsignar(
      <Route path="/admin/clases/:claseId/maestros" element={<MaestrosDeClaseView />} />,
      [error500],
    )
    await asignarConFoco()
    await screen.findByText(GENERICO)
    await esperar(30)
    const destino = document.activeElement
    expect(destino).not.toBe(document.body)
    comprobarRamaDeError(destino)
    expect((destino as HTMLElement).querySelectorAll(TABULABLES)).toHaveLength(0)
  })
})

describe("ataque CLASES-02c r3: la lista del muro cuando la recarga o «Ver más publicaciones» fallan", () => {
  const rutasMuro = <Route path="/maestro/clases/:claseId" element={<MuroView />} />

  const montarMuro = (opciones: {
    primera: () => Response
    despues: (() => Response)[]
    borrar?: boolean
  }) => {
    let borrada = false
    stubFetch((r, m) => {
      if (m === "DELETE" && r === `/api/clases/${CLASE_ID}/publicaciones/${PUB_ID}`) {
        borrada = true
        return new Response(null, { status: 204 })
      }
      if (r.startsWith(`/api/clases/${CLASE_ID}/publicaciones`) && m === "GET") {
        if (r.includes("cursor=") || borrada) {
          const siguiente = opciones.despues.shift()
          return siguiente ? siguiente() : error500()
        }
        return opciones.primera()
      }
      return error500()
    })
    return conProveedores(`/maestro/clases/${CLASE_ID}`, rutasMuro)
  }

  const borrarConFoco = async () => {
    fireEvent.click(await screen.findByRole("button", { name: "Borrar publicación" }))
    const si = screen.getByRole("button", { name: "Sí, borrar" })
    act(() => si.focus())
    fireEvent.click(si)
  }

  const conUna = () =>
    respuestaJson(200, { publicaciones: [publicacion(1)], siguienteCursor: null })

  it("tras borrar, con la recarga en 500 y el foco perdido, el foco va al encabezado «Publicaciones», fuera del orden de Tab, y el alerta conserva su texto", async () => {
    montarMuro({ primera: conUna, despues: [error500] })
    await borrarConFoco()
    await screen.findByText(GENERICO)
    await esperar(30)
    const destino = document.activeElement
    expect(destino).toBe(screen.getByRole("heading", { name: "Publicaciones" }))
    comprobarRamaDeError(destino)
  })

  it("si la persona ya está escribiendo un anuncio cuando la recarga falla, el foco se queda en el campo", async () => {
    montarMuro({ primera: conUna, despues: [error500] })
    fireEvent.click(await screen.findByRole("button", { name: "Borrar publicación" }))
    const si = screen.getByRole("button", { name: "Sí, borrar" })
    act(() => si.focus())
    // El clic y, en el mismo turno, la persona pasa al campo del anuncio.
    fireEvent.click(si)
    const anuncio = screen.getByLabelText("Anuncio")
    act(() => anuncio.focus())
    await screen.findByText(GENERICO)
    await esperar(30)
    expect(document.activeElement).toBe(anuncio)
  })

  it("una segunda recarga fallida no roba el foco del campo del anuncio", async () => {
    const cliente = montarMuro({ primera: conUna, despues: [error500, error500] })
    await borrarConFoco()
    await screen.findByText(GENERICO)
    await esperar(30)
    const anuncio = screen.getByLabelText("Anuncio")
    act(() => anuncio.focus())
    await act(async () => {
      await cliente.invalidateQueries({ queryKey: ["clases", CLASE_ID, "publicaciones"] })
    })
    await esperar(30)
    expect(document.activeElement).toBe(anuncio)
  })

  it("un muro cuya primera carga falla con el foco puesto fuera de la vista no mueve el foco", async () => {
    montarMuro({ primera: error500, despues: [] })
    act(() => fuera().focus())
    await screen.findByText(GENERICO)
    await esperar(30)
    expect(document.activeElement).toBe(fuera())
  })

  it("un muro que nace en error (su primera carga falla) no mueve el foco desde <body>", async () => {
    montarMuro({ primera: error500, despues: [] })
    await screen.findByText(GENERICO)
    await esperar(60)
    expect(document.activeElement).toBe(document.body)
  })

  it("«Ver más publicaciones» que falla: con el foco en el botón, va al encabezado; si la persona se fue al campo del anuncio, se queda ahí", async () => {
    const conDos = () =>
      respuestaJson(200, {
        publicaciones: [publicacion(1), publicacion(2)],
        siguienteCursor: `5a5b3c4d-1c1f-4b8e-9a1e-${String(2).padStart(12, "0")}`,
      })
    montarMuro({ primera: conDos, despues: [error500] })
    const verMas = await screen.findByRole("button", { name: "Ver más publicaciones" })
    act(() => verMas.focus())
    fireEvent.click(verMas)
    await screen.findByText(GENERICO)
    await esperar(30)
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Publicaciones" }))
    cleanup()

    montarMuro({ primera: conDos, despues: [error500] })
    const otraVez = await screen.findByRole("button", { name: "Ver más publicaciones" })
    act(() => otraVez.focus())
    fireEvent.click(otraVez)
    const anuncio = screen.getByLabelText("Anuncio")
    act(() => anuncio.focus())
    await screen.findByText(GENERICO)
    await esperar(30)
    expect(document.activeElement).toBe(anuncio)
  })
})

describe("ataque CLASES-02c r3: /admin/clases cuando «Cargar más clases» o una recarga fallan", () => {
  const rutasAdmin = <Route path="/admin/clases" element={<ClasesAdminView />} />
  const primera = () =>
    respuestaJson(200, {
      clases: [claseAdmin(1), claseAdmin(2)],
      total: 3,
      siguienteCursor: claseAdmin(2).id,
    })

  const montarAdmin = (lista: (ruta: string) => Response) => {
    stubFetch((r) => (r.startsWith("/api/admin/clases?") ? lista(r) : error500()))
    return conProveedores("/admin/clases", rutasAdmin)
  }

  it("«Cargar más clases» que falla con el foco en el botón: el foco va al h1 «Clases», fuera del orden de Tab, y el alerta conserva su texto", async () => {
    montarAdmin((r) => (r.includes("cursor=") ? error500() : primera()))
    const boton = await screen.findByRole("button", { name: "Cargar más clases" })
    act(() => boton.focus())
    fireEvent.click(boton)
    await screen.findByRole("alert")
    await esperar(30)
    const destino = document.activeElement
    expect(destino).toBe(screen.getByRole("heading", { level: 1, name: "Clases" }))
    expect(screen.getByRole("alert")).toHaveTextContent(
      "No pudimos cargar las clases. Revisa tu conexión e inténtalo de nuevo.",
    )
    expect(destino?.getAttribute("tabindex")).toBe("-1")
  })

  it("si la persona pasó a «Crear clase» antes de que falle la página, el foco se queda ahí", async () => {
    let soltar: () => void = () => undefined
    const compuerta = new Promise<void>((r) => {
      soltar = r
    })
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (entrada) => {
        const ruta = String(entrada)
        if (!ruta.startsWith("/api/admin/clases?")) return error500()
        if (!ruta.includes("cursor=")) return primera()
        await compuerta
        return error500()
      }),
    )
    conProveedores("/admin/clases", rutasAdmin)
    const boton = await screen.findByRole("button", { name: "Cargar más clases" })
    act(() => boton.focus())
    fireEvent.click(boton)
    const crear = screen.getByRole("link", { name: "Crear clase" })
    act(() => crear.focus())
    await act(async () => {
      soltar()
      await compuerta
    })
    await screen.findByRole("alert")
    await esperar(30)
    expect(document.activeElement).toBe(crear)
  })

  it("una lista que nace en error (su primera carga falla) no mueve el foco desde <body>", async () => {
    montarAdmin(() => error500())
    await screen.findByRole("alert")
    await esperar(60)
    expect(document.activeElement).toBe(document.body)
  })

  it("una lista cuya primera carga falla con el foco fuera no lo mueve; una segunda recarga fallida no roba el foco de «Crear clase»", async () => {
    const cliente = montarAdmin(() => error500())
    act(() => fuera().focus())
    await screen.findByRole("alert")
    await esperar(30)
    expect(document.activeElement).toBe(fuera())
    const crear = screen.getByRole("link", { name: "Crear clase" })
    act(() => crear.focus())
    await act(async () => {
      await cliente.invalidateQueries({ queryKey: ["clases", "admin"] })
    })
    await esperar(30)
    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(document.activeElement).toBe(crear)
  })
})
