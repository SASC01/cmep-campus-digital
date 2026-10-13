import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { Link, MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { CrearTareaView } from "./crear-tarea-view"
import { DetalleTareaView } from "./detalle-tarea-view"
import { EditarTareaView } from "./editar-tarea-view"

// Ataque del Tester, TAREAS-01d, ronda 3 (última del tope): bordes de los remedios de T-10 a T-14 que no
// cubren los casos del programador, lo que quedaba de "Puntos de ataque → 01d" y la revisión estática
// final. Sin selectores de clase: rol, etiqueta y texto accesible.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const ORIGEN_ALMACEN = "https://almacen.ejemplo.mx"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

// ENTREGAS-01a ronda 0 (C-7, §D-R0 «01a»; §D-2.1, §D-2.2 y P-03 a / P-05 a′ del plan de ENTREGAS-01):
// tareaDetalleSchema exige `version` y `requiereAdjuntos`. El doble suma la versión de una tarea recién
// creada (0) y el valor por defecto de «Cómo se entrega» (true). Ninguna aserción cambia.
const tareaDetalle = (cambios: Record<string, unknown> = {}) => ({
  id: TAREA_ID,
  titulo: "Ensayo",
  instrucciones: "Dos páginas.",
  fechaLimite: "2030-01-15T16:00:00.000Z",
  puntos: 100,
  aceptaTardias: true,
  version: 0,
  requiereAdjuntos: true,
  categoria: null,
  tema: null,
  rubrica: [],
  adjuntos: [],
  autor: {
    id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
    nombre: "Luis Pérez",
    administracion: false,
  },
  creadoEn: "2026-10-06T15:30:00.000Z",
  actualizadoEn: "2026-10-06T15:30:00.000Z",
  puedeEditar: true,
  puedeBorrar: true,
  ...cambios,
})

interface Llamada {
  metodo: string
  url: string
  cuerpo: unknown
}

type Responder = (metodo: string, url: string) => Response | Promise<Response> | undefined

const stubApi = (responder: Responder) => {
  const llamadas: Llamada[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = String(entrada)
      const metodo = init?.method ?? "GET"
      const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : null
      llamadas.push({ metodo, url, cuerpo })
      return Promise.resolve(responder(metodo, url) ?? respuestaJson(500, {}))
    }),
  )
  return llamadas
}

const listasVacias: Responder = (_m, url) => {
  if (url.endsWith("/categorias")) return respuestaJson(200, { categorias: [] })
  if (url.endsWith("/temas")) return respuestaJson(200, { temas: [], sinTema: 0 })
  return undefined
}

const esGetDeLaTarea = (metodo: string, url: string) =>
  metodo === "GET" && url.endsWith(`/tareas/${TAREA_ID}`)

const nuevoCliente = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

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

const BASE = `/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}`

// Detalle, edición y una página fuera de la tarea, con la misma caché, como en la aplicación.
const renderTarea = (entrada: "detalle" | "editar") => {
  const cliente = nuevoCliente()
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[entrada === "detalle" ? BASE : `${BASE}/editar`]}>
        <Routes>
          <Route
            path="/maestro/clases/:claseId/tareas/:tareaId"
            element={
              <>
                <Link to="/maestro/otra">Ir a otra página</Link>
                <DetalleTareaView />
              </>
            }
          />
          <Route
            path="/maestro/clases/:claseId/tareas/:tareaId/editar"
            element={<EditarTareaView />}
          />
          <Route path="/maestro/otra" element={<Link to={BASE}>Volver a la tarea</Link>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return cliente
}

const recargar = async (cliente: QueryClient) => {
  // Una pausa breve para que dos fallos seguidos no caigan en el mismo milisegundo (en un navegador,
  // cada recarga tarda lo que tarda la red).
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 5))
  })
  await act(() => cliente.refetchQueries({ type: "active" }))
  await waitFor(() => expect(cliente.isFetching()).toBe(0))
}

describe("ataque TAREAS-01d r3: T-13 y T-14, un fallo que no reemplaza la vista seguido de uno que sí", () => {
  it.each([
    [404, "TAREA_NO_ENCONTRADA", "Esa tarea ya no existe.", "Esa tarea ya no existe."],
    [
      403,
      "SIN_ACCESO_A_LA_CLASE",
      "No tienes acceso a esta clase.",
      "No tienes acceso a esta clase.",
    ],
  ])(
    "edición: un 500 conserva el formulario con el foco en «Título»; si la siguiente recarga da %i %s y reemplaza el formulario, el foco no cae en <body>",
    async (estado, codigo, mensaje, textoEnLaVista) => {
      let respuestas = 0
      stubApi((metodo, url) => {
        if (esGetDeLaTarea(metodo, url)) {
          respuestas += 1
          if (respuestas === 2) return errorApi(500, "ERROR_INTERNO", "Error interno")
          if (respuestas >= 3) return errorApi(estado, codigo, mensaje)
          return respuestaJson(200, { tarea: tareaDetalle() })
        }
        return listasVacias(metodo, url)
      })
      const cliente = renderTarea("editar")
      const titulo = await screen.findByLabelText("Título")
      act(() => titulo.focus())
      await recargar(cliente)
      expect(respuestas).toBe(2)
      expect(screen.getByLabelText("Título")).toHaveFocus()

      await recargar(cliente)
      expect(respuestas).toBe(3)
      expect(await screen.findByText(textoEnLaVista)).toBeInTheDocument()
      expect(screen.queryByLabelText("Título")).toBeNull()
      expect(document.activeElement).not.toBe(document.body)
    },
  )

  it("detalle: un 500 conserva el detalle con el foco en «Borrar tarea»; si la siguiente recarga da 403 SIN_ACCESO_A_LA_CLASE, el foco no cae en <body> (sin hallazgo esperado)", async () => {
    let respuestas = 0
    stubApi((metodo, url) => {
      if (esGetDeLaTarea(metodo, url)) {
        respuestas += 1
        if (respuestas === 2) return errorApi(500, "ERROR_INTERNO", "Error interno")
        if (respuestas >= 3)
          return errorApi(403, "SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase.")
        return respuestaJson(200, { tarea: tareaDetalle() })
      }
      return undefined
    })
    const cliente = renderTarea("detalle")
    const borrar = await screen.findByRole("button", { name: "Borrar tarea" })
    act(() => borrar.focus())
    await recargar(cliente)
    expect(screen.getByRole("button", { name: "Borrar tarea" })).toHaveFocus()
    await recargar(cliente)
    expect(await screen.findByText("No tienes acceso a esta clase.")).toBeInTheDocument()
    expect(document.activeElement).not.toBe(document.body)
  })
})

describe("ataque TAREAS-01d r3: T-13, cada código en la primera carga frente a la recarga (sin hallazgo esperado)", () => {
  const casos: [string, number, string, string, boolean][] = [
    ["404 TAREA_NO_ENCONTRADA", 404, "TAREA_NO_ENCONTRADA", "Esa tarea ya no existe.", true],
    ["403 SIN_ACCESO_A_LA_CLASE", 403, "SIN_ACCESO_A_LA_CLASE", "x", true],
    ["VALIDACION de tareaId", 400, "VALIDACION", "tareaId: Invalid uuid", true],
    ["VALIDACION de claseId", 400, "VALIDACION", "claseId: Invalid uuid", true],
    ["VALIDACION de un campo normal", 400, "VALIDACION", "titulo: Demasiado largo", false],
    ["500", 500, "ERROR_INTERNO", "Error interno", false],
    ["429", 429, "DEMASIADAS_PETICIONES", "Espera un momento", false],
  ]

  it.each(casos)(
    "primera carga con %s: no hay detalle ni acciones y no sale el aviso de recarga",
    async (_nombre, estado, codigo, mensaje) => {
      stubApi((metodo, url) => {
        if (esGetDeLaTarea(metodo, url)) return errorApi(estado, codigo, mensaje)
        return undefined
      })
      const cliente = renderTarea("detalle")
      await waitFor(() => expect(cliente.isFetching()).toBe(0))
      await waitFor(() => expect(screen.queryByText("Cargando la tarea…")).toBeNull())
      expect(screen.queryByRole("heading", { name: "Ensayo" })).toBeNull()
      expect(screen.queryByRole("button", { name: "Borrar tarea" })).toBeNull()
      expect(screen.getByRole("alert")).toBeInTheDocument()
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )

  it.each(casos)(
    "recarga con %s: reemplaza el detalle sin aviso solo si es de los que reemplazan; si no, conserva el detalle y avisa una vez",
    async (_nombre, estado, codigo, mensaje, reemplaza) => {
      let respuestas = 0
      stubApi((metodo, url) => {
        if (esGetDeLaTarea(metodo, url)) {
          respuestas += 1
          if (respuestas >= 2) return errorApi(estado, codigo, mensaje)
          return respuestaJson(200, { tarea: tareaDetalle() })
        }
        return undefined
      })
      const cliente = renderTarea("detalle")
      await screen.findByRole("heading", { name: "Ensayo" })
      await recargar(cliente)
      expect(respuestas).toBe(2)
      if (reemplaza) {
        expect(screen.queryByRole("heading", { name: "Ensayo" })).toBeNull()
        expect(screen.queryByRole("button", { name: "Borrar tarea" })).toBeNull()
        expect(aviso.error).not.toHaveBeenCalled()
        return
      }
      expect(screen.getByRole("heading", { name: "Ensayo" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Borrar tarea" })).toBeInTheDocument()
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
  )
})

describe("ataque TAREAS-01d r3: T-12, la consulta desmontada, invalidada y vuelta a montar (sin hallazgo esperado)", () => {
  it.each([
    ["la recarga al volver acierta", false, 1],
    ["la recarga al volver vuelve a fallar", true, 2],
  ] as const)(
    "fallo avisado, salir de la tarea, invalidar sin vista montada y volver: %s → %i aviso(s)",
    async (_nombre, fallaAlVolver, avisosEsperados) => {
      let respuestas = 0
      stubApi((metodo, url) => {
        if (esGetDeLaTarea(metodo, url)) {
          respuestas += 1
          if (respuestas === 2 || (fallaAlVolver && respuestas >= 3))
            return errorApi(500, "ERROR_INTERNO", "Error interno")
          return respuestaJson(200, { tarea: tareaDetalle() })
        }
        return undefined
      })
      const cliente = renderTarea("detalle")
      await screen.findByRole("heading", { name: "Ensayo" })
      await recargar(cliente)
      expect(aviso.error).toHaveBeenCalledTimes(1)

      fireEvent.click(screen.getByRole("link", { name: "Ir a otra página" }))
      await screen.findByRole("link", { name: "Volver a la tarea" })
      await act(() => cliente.invalidateQueries())
      expect(respuestas).toBe(2)
      await act(async () => {
        await new Promise((resolver) => setTimeout(resolver, 5))
      })
      fireEvent.click(screen.getByRole("link", { name: "Volver a la tarea" }))
      await screen.findByRole("heading", { name: "Ensayo" })
      await waitFor(() => expect(cliente.isFetching()).toBe(0))
      expect(respuestas).toBe(3)
      expect(aviso.error).toHaveBeenCalledTimes(avisosEsperados)
    },
  )
})

describe("ataque TAREAS-01d r3: T-14, el foco que sale a un iframe (sin hallazgo esperado)", () => {
  it("con el foco movido de «Borrar tarea» a un iframe fuera de la vista, una recarga que quita el botón no le roba el foco al iframe", async () => {
    let tarea = tareaDetalle({ puedeEditar: false })
    stubApi((metodo, url) => {
      if (esGetDeLaTarea(metodo, url)) return respuestaJson(200, { tarea })
      return undefined
    })
    const cliente = renderTarea("detalle")
    const borrar = await screen.findByRole("button", { name: "Borrar tarea" })
    act(() => borrar.focus())
    const marco = document.createElement("iframe")
    marco.title = "Contenido externo"
    document.body.appendChild(marco)
    try {
      act(() => marco.focus())
      expect(document.activeElement).toBe(marco)
      tarea = tareaDetalle({ puedeEditar: false, puedeBorrar: false })
      await recargar(cliente)
      expect(screen.queryByRole("button", { name: "Borrar tarea" })).toBeNull()
      expect(document.activeElement).toBe(marco)
    } finally {
      marco.remove()
    }
  })
})

describe("ataque TAREAS-01d r3: adjuntos con la publicación en vuelo (sin hallazgo esperado)", () => {
  it("durante la subida, «Quitar» no saca el archivo de lo que se envía, un segundo «Publicar tarea» no duplica nada y el POST lleva el id del archivo", async () => {
    let soltarSubida: (r: Response) => void = () => undefined
    const llamadas = stubApi((metodo, url) => {
      if (url.startsWith(ORIGEN_ALMACEN))
        return new Promise<Response>((resolver) => {
          soltarSubida = resolver
        })
      if (metodo === "POST" && url.endsWith("/archivos"))
        return respuestaJson(201, {
          archivo: {
            id: "9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11",
            nombre: "a.pdf",
            tipo: "application/pdf",
            tamano: 1,
          },
          subida: {
            url: `${ORIGEN_ALMACEN}/subida/1`,
            metodo: "PUT",
            cabeceras: { "Content-Type": "application/pdf" },
            expiraEn: "2026-10-06T15:35:00.000Z",
          },
        })
      if (metodo === "POST" && url.endsWith("/tareas"))
        return respuestaJson(201, { tarea: tareaDetalle() })
      return listasVacias(metodo, url)
    })
    const cliente = nuevoCliente()
    render(
      <QueryClientProvider client={cliente}>
        <MemoryRouter initialEntries={[`/maestro/clases/${CLASE_ID}/tareas/nueva`]}>
          <Routes>
            <Route path="/maestro/clases/:claseId/tareas/nueva" element={<CrearTareaView />} />
            <Route path="/maestro/clases/:claseId/tareas/:tareaId" element={<p>Detalle</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    fireEvent.change(await screen.findByLabelText("Título"), { target: { value: "Ensayo" } })
    fireEvent.change(screen.getByLabelText("Fecha límite"), {
      target: { value: "2030-01-15T10:00" },
    })
    fireEvent.change(screen.getByLabelText("Adjuntar archivos"), {
      target: { files: [new File(["x"], "a.pdf", { type: "application/pdf" })] },
    })
    const publicar = screen.getByRole("button", { name: "Publicar tarea" })
    fireEvent.click(publicar)
    await waitFor(() => expect(llamadas.some((l) => l.url.startsWith(ORIGEN_ALMACEN))).toBe(true))
    fireEvent.click(screen.getByRole("button", { name: /^Quitar\s+a\.pdf$/ }))
    fireEvent.click(screen.getByRole("button", { name: "Publicar tarea" }))
    await act(async () => {
      soltarSubida(new Response(null, { status: 200 }))
      await Promise.resolve()
    })
    expect(await screen.findByText("Detalle")).toBeInTheDocument()
    const posts = llamadas.filter((l) => l.metodo === "POST" && l.url.endsWith("/tareas"))
    expect(posts).toHaveLength(1)
    expect(llamadas.filter((l) => l.url.endsWith("/archivos"))).toHaveLength(1)
    expect((posts[0]?.cuerpo as { archivoIds?: unknown } | null)?.archivoIds).toEqual([
      "9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11",
    ])
  })
})

// Revisión estática final: tipos del módulo solo en types.ts (los componentes, solo sus Props).
const fuentes = import.meta.glob<string>("/src/features/tareas/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})

describe("ataque TAREAS-01d r3: revisión estática de tipos (sin hallazgo esperado)", () => {
  it("fuera de types.ts no hay declaraciones de tipos en features/tareas, salvo las interfaces Props de los componentes", () => {
    const archivos = Object.entries(fuentes).filter(
      ([ruta]) => !/\.test\.tsx?$/.test(ruta) && !ruta.endsWith("/types.ts"),
    )
    expect(archivos.length).toBeGreaterThan(10)
    const declaraciones = archivos.flatMap(([ruta, texto]) =>
      [...texto.matchAll(/^\s*(?:export\s+)?(?:interface|type)\s+(\w+)/gm)]
        .map((coincidencia) => ({ ruta, nombre: coincidencia[1] ?? "" }))
        .filter(({ ruta: r, nombre }) => !(r.endsWith(".tsx") && nombre.endsWith("Props"))),
    )
    expect(declaraciones).toEqual([])
  })
})
