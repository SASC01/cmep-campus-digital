import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { DetalleTareaView } from "./detalle-tarea-view"
import { EntregaDeAlumnoView } from "./entrega-de-alumno-view"
import { EntregasView } from "./entregas-view"

// ENTREGAS-01e (PR-1E01 a PR-1E04 y PR-1E06 a PR-1E08): el panel "Entregas" del detalle, la vista
// "Entregas" de una tarea, la entrega de un alumno con su hilo y borrar una tarea con entregas, en las
// perspectivas de maestro y admin. Reloj fijo en todas (vi.useFakeTimers solo para Date). El servidor
// es un doble en memoria; el almacén, una URL de otro origen.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
const PASADA = "2030-01-05T16:00:00.000Z"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const ARCHIVO_ID = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02"
const ORIGEN_ALMACEN = "https://almacen.ejemplo.mx"
const RUTA_TAREA = `/api/clases/${CLASE_ID}/tareas/${TAREA_ID}`
const RUTA_ENTREGAS = `${RUTA_TAREA}/entregas`
const NO_EXISTE = "Esa tarea ya no existe."
const uuid = (n: number) => `9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c${String(n).padStart(4, "0")}`
const ALUMNO_ID = uuid(301)
const RUTA_ALUMNO = `${RUTA_ENTREGAS}/${ALUMNO_ID}`
const RUTA_HILO_ALUMNO = `${RUTA_ALUMNO}/comentarios`
const MENSAJE_MAESTRO =
  "Esta tarea tiene 2 alumnos con entrega o calificación y no se puede borrar. Si de verdad hay que borrarla, pídelo a administración."
const MENSAJE_ADMIN =
  "Esta tarea tiene 2 alumnos con entrega o calificación. Si la borras, también se borrarán sus entregas, sus calificaciones y los comentarios privados, y no se puede deshacer."

type Perspectiva = "estudiante" | "maestro" | "admin"

const tareaDoble = (extra: Record<string, unknown> = {}) => ({
  tarea: {
    id: TAREA_ID,
    titulo: "Ensayo final",
    instrucciones: "",
    fechaLimite: FUTURA,
    puntos: 80,
    aceptaTardias: true,
    requiereAdjuntos: true,
    version: 0,
    categoria: null,
    tema: null,
    rubrica: [],
    adjuntos: [],
    autor: { id: uuid(1), nombre: "Luis Pérez", administracion: false },
    creadoEn: "2030-01-01T15:30:00.000Z",
    actualizadoEn: "2030-01-01T15:30:00.000Z",
    puedeEditar: true,
    puedeBorrar: true,
    ...extra,
  },
})

const fila = (n: number, nombre: string, extra: Record<string, unknown> = {}) => ({
  alumno: { id: uuid(300 + n), nombre },
  estado: "asignado",
  fechaEntrega: null,
  conRetraso: false,
  ...extra,
})

const entregaDeAlumno = (extra: Record<string, unknown> = {}) => ({
  alumno: { id: ALUMNO_ID, nombre: "Ana Ruiz" },
  estado: "entregado",
  fechaEntrega: "2030-01-09T15:30:00.000Z",
  conRetraso: false,
  enlaces: ["https://ejemplo.com/mi-trabajo"],
  adjuntos: [
    {
      id: ARCHIVO_ID,
      nombre: "trabajo.pdf",
      tipo: "application/pdf",
      tamano: 2048,
      vistaPrevia: null,
    },
  ],
  version: 1,
  calificacion: null,
  ...extra,
})

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

interface Llamada {
  metodo: string
  url: string
}

type Manejador = (llamada: Llamada) => Response | Promise<Response> | undefined

interface Servidor {
  tarea: ReturnType<typeof tareaDoble>
  paginas: Record<string, unknown>[][]
  total: number
  entregadas: number
  entrega: Record<string, unknown>
  manejador: Manejador
}

let servidor: Servidor
let llamadas: Llamada[] = []
const asignar = vi.fn()

const instalarServidor = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = String(entrada)
      const metodo = init?.method ?? "GET"
      const llamada = { metodo, url }
      llamadas.push(llamada)
      const propia = servidor.manejador(llamada)
      if (propia !== undefined) return Promise.resolve(propia)
      if (metodo === "GET" && url === RUTA_TAREA) {
        return Promise.resolve(respuestaJson(200, servidor.tarea))
      }
      if (metodo === "DELETE" && url.startsWith(RUTA_TAREA) && !url.includes("/entregas")) {
        return Promise.resolve(new Response(null, { status: 204 }))
      }
      if (metodo === "GET" && url.startsWith(`${RUTA_ENTREGAS}?`)) {
        const cursor = new URL(url, "http://local").searchParams.get("cursor")
        const indice = cursor === null ? 0 : Number(cursor.slice(-1))
        const siguiente = indice + 1 < servidor.paginas.length ? uuid(900 + indice + 1) : null
        return Promise.resolve(
          respuestaJson(200, {
            entregas: servidor.paginas[indice] ?? [],
            total: servidor.total,
            entregadas: servidor.entregadas,
            siguienteCursor: siguiente,
          }),
        )
      }
      if (metodo === "GET" && url.startsWith(`${RUTA_HILO_ALUMNO}?`)) {
        return Promise.resolve(respuestaJson(200, { comentarios: [], siguienteCursor: null }))
      }
      if (metodo === "GET" && url === RUTA_ALUMNO) {
        return Promise.resolve(respuestaJson(200, { entrega: servidor.entrega }))
      }
      if (metodo === "POST" && url.includes("/archivos/") && url.endsWith("/descarga")) {
        return Promise.resolve(
          respuestaJson(200, {
            url: `${ORIGEN_ALMACEN}/descarga/x`,
            expiraEn: "2030-01-10T12:05:00.000Z",
          }),
        )
      }
      return Promise.resolve(errorApi(500, "ERROR_INTERNO", "no esperada"))
    }),
  )
}

const render01e = (ruta: string) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const rutas = (["estudiante", "maestro", "admin"] as const).flatMap((p: Perspectiva) => [
    { path: `/${p}/clases/:claseId/tareas/:tareaId`, element: <DetalleTareaView /> },
    { path: `/${p}/clases/:claseId/tareas/:tareaId/entregas`, element: <EntregasView /> },
    {
      path: `/${p}/clases/:claseId/tareas/:tareaId/entregas/:alumnoId`,
      element: <EntregaDeAlumnoView />,
    },
    { path: `/${p}/clases/:claseId/trabajo`, element: <p>Trabajo de clase de prueba</p> },
  ])
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          {rutas.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return queryClient
}

const detalle = (p: Perspectiva) => `/${p}/clases/${CLASE_ID}/tareas/${TAREA_ID}`
const entregas = (p: Perspectiva) => `${detalle(p)}/entregas`
const deAlumno = (p: Perspectiva) => `${entregas(p)}/${ALUMNO_ID}`

const pedidas = (metodo: string, filtro: (url: string) => boolean) =>
  llamadas.filter((l) => l.metodo === metodo && filtro(l.url))

const diferido = () => {
  let resolver: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver }
}

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  llamadas = []
  servidor = {
    tarea: tareaDoble(),
    paginas: [[]],
    total: 0,
    entregadas: 0,
    entrega: entregaDeAlumno(),
    manejador: () => undefined,
  }
  instalarServidor()
  vi.stubGlobal("location", { ...window.location, assign: asignar })
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  aviso.success.mockClear()
  aviso.error.mockClear()
  asignar.mockReset()
})

describe("el panel «Entregas» del detalle (PR-1E01)", () => {
  it.each(["maestro", "admin"] as const)(
    "PR-1E01: %s ve el panel «Entregas» con «Ver entregas» a la vista de la tarea, sin pedir nada",
    async (perspectiva) => {
      render01e(detalle(perspectiva))
      const enlace = await screen.findByRole("link", { name: "Ver entregas" })
      expect(enlace).toHaveAttribute("href", entregas(perspectiva))
      expect(screen.getByRole("heading", { name: "Entregas", level: 3 })).toBeInTheDocument()
      expect(pedidas("GET", (url) => url.includes("/entregas"))).toEqual([])
    },
  )

  it("PR-1E01: el panel aparece también cuando AccionesDeLaTarea no pinta nada (sin puedeEditar ni puedeBorrar)", async () => {
    servidor.tarea = tareaDoble({ puedeEditar: false, puedeBorrar: false })
    render01e(detalle("maestro"))
    expect(await screen.findByRole("link", { name: "Ver entregas" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Editar tarea" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Borrar tarea" })).toBeNull()
  })

  it("PR-1E01: el alumno no ve el panel «Entregas»", async () => {
    servidor.manejador = ({ metodo, url }) => {
      if (metodo === "GET" && url === `${RUTA_TAREA}/entrega`) {
        return respuestaJson(200, {
          entrega: {
            estado: "asignado",
            fechaEntrega: null,
            conRetraso: false,
            enlaces: [],
            adjuntos: [],
            puedeEntregar: true,
            puedeAnular: false,
            calificacion: null,
          },
        })
      }
      if (metodo === "GET" && url.startsWith(`${RUTA_TAREA}/entrega/comentarios`)) {
        return respuestaJson(200, { comentarios: [], siguienteCursor: null })
      }
      return undefined
    }
    servidor.tarea = tareaDoble({ puedeEditar: false, puedeBorrar: false })
    render01e(detalle("estudiante"))
    expect(await screen.findByRole("heading", { name: "Tu trabajo" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Ver entregas" })).toBeNull()
    expect(screen.queryByRole("heading", { name: "Entregas" })).toBeNull()
  })
})

describe("la vista «Entregas» (PR-1E02 y PR-1E07)", () => {
  const alumnos = () => [
    fila(1, "Ana Ruiz", {
      estado: "entregado",
      fechaEntrega: "2030-01-04T15:30:00.000Z",
    }),
    fila(2, "Beto Gómez"),
    fila(3, "Carla Díaz", {
      estado: "entregado",
      fechaEntrega: "2030-01-06T15:30:00.000Z",
      conRetraso: true,
    }),
    fila(4, "Dani Mora", { estado: "calificado", fechaEntrega: "2030-01-04T10:00:00.000Z" }),
  ]

  it("PR-1E02: columnas, conteo, estado con texto («Sin entregar» si venció), fecha o «—» y «Ver entrega» con el nombre sr-only", async () => {
    servidor.tarea = tareaDoble({ fechaLimite: PASADA })
    servidor.paginas = [alumnos()]
    servidor.total = 4
    servidor.entregadas = 3
    render01e(entregas("maestro"))
    expect(await screen.findByRole("heading", { name: "Entregas", level: 2 })).toBeInTheDocument()
    expect(screen.getByText("Ensayo final")).toBeInTheDocument()
    expect(await screen.findByText("Entregaron 3 de 4 alumnos.")).toBeInTheDocument()
    const tabla = screen.getByRole("table")
    expect(
      within(tabla)
        .getAllByRole("columnheader")
        .map((c) => c.textContent),
    ).toEqual(["Alumno", "Estado", "Entregada", "Acciones"])
    const filas = within(tabla).getAllByRole("row").slice(1)
    expect(filas.map((f) => within(f).getAllByRole("cell")[1]?.textContent)).toEqual([
      "Entregado",
      "Sin entregar",
      "Entregado con retraso",
      "Calificado",
    ])
    expect(within(filas[1] as HTMLElement).getAllByRole("cell")[2]).toHaveTextContent("—")
    expect(within(filas[0] as HTMLElement).getAllByRole("cell")[2]).not.toHaveTextContent("—")
    const ver = screen.getByRole("link", { name: "Ver entrega Ana Ruiz" })
    expect(ver).toHaveAttribute("href", `${entregas("maestro")}/${uuid(301)}`)
    expect(screen.getByRole("link", { name: "Volver a la tarea" })).toHaveAttribute(
      "href",
      detalle("maestro"),
    )
  })

  it("PR-1E02: con la fecha límite futura, una fila sin entregar dice «Asignado»; un solo alumno va en singular", async () => {
    servidor.paginas = [[fila(2, "Beto Gómez")]]
    servidor.total = 1
    servidor.entregadas = 0
    render01e(entregas("admin"))
    expect(await screen.findByText("Entregaron 0 de 1 alumno.")).toBeInTheDocument()
    expect(within(screen.getByRole("table")).getByText("Asignado")).toBeInTheDocument()
  })

  it("PR-1E02: error → cargando → vacío", async () => {
    const espera = diferido()
    let respuesta: () => Response | Promise<Response> = () => espera.promesa
    servidor.manejador = ({ metodo, url }) =>
      metodo === "GET" && url.startsWith(`${RUTA_ENTREGAS}?`) ? respuesta() : undefined
    const queryClient = render01e(entregas("maestro"))
    expect(await screen.findByText("Cargando las entregas…")).toBeInTheDocument()
    espera.resolver(errorApi(500, "ERROR_INTERNO", "x"))
    expect(await screen.findByText("Algo salió mal. Inténtalo de nuevo.")).toBeInTheDocument()

    respuesta = () =>
      respuestaJson(200, { entregas: [], total: 0, entregadas: 0, siguienteCursor: null })
    await act(async () => {
      await queryClient.invalidateQueries()
    })
    expect(await screen.findByText("Aún no hay alumnos en esta clase.")).toBeInTheDocument()
  })

  it("PR-1E02: «Ver más alumnos» está en espera mientras pide la página y también durante una recarga (isFetching)", async () => {
    servidor.paginas = [[fila(1, "Ana Ruiz")], [fila(2, "Beto Gómez")]]
    const recarga = diferido()
    let retener = false
    servidor.manejador = ({ metodo, url }) =>
      retener && metodo === "GET" && url.startsWith(`${RUTA_ENTREGAS}?`)
        ? recarga.promesa
        : undefined
    const queryClient = render01e(entregas("maestro"))
    const verMas = await screen.findByRole("button", { name: "Ver más alumnos" })
    expect(verMas).not.toHaveAttribute("aria-busy", "true")
    retener = true
    act(() => {
      void queryClient.invalidateQueries()
    })
    await waitFor(() => expect(verMas).toHaveAttribute("aria-busy", "true"))
    fireEvent.click(verMas)
    expect(pedidas("GET", (url) => url.includes("cursor="))).toEqual([])
    retener = false
    await act(async () => {
      recarga.resolver(
        respuestaJson(200, {
          entregas: [fila(1, "Ana Ruiz")],
          total: 2,
          entregadas: 0,
          siguienteCursor: uuid(901),
        }),
      )
      await recarga.promesa
    })
    await waitFor(() => expect(verMas).not.toHaveAttribute("aria-busy", "true"))
  })

  it("PR-1E02: al cargar la última página, «Ver más alumnos» desaparece y el foco va al «Ver entrega» de la primera fila nueva", async () => {
    servidor.paginas = [[fila(1, "Ana Ruiz")], [fila(2, "Beto Gómez"), fila(3, "Carla Díaz")]]
    render01e(entregas("maestro"))
    const verMas = await screen.findByRole("button", { name: "Ver más alumnos" })
    verMas.focus()
    fireEvent.click(verMas)
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Ver más alumnos" })).toBeNull(),
    )
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("link", { name: "Ver entrega Beto Gómez" }),
      ),
    )
  })

  it("PR-1E02: si la última página no trae alumnos nuevos, el foco va al encabezado «Entregas»", async () => {
    servidor.paginas = [[fila(1, "Ana Ruiz")], []]
    render01e(entregas("maestro"))
    const verMas = await screen.findByRole("button", { name: "Ver más alumnos" })
    verMas.focus()
    fireEvent.click(verMas)
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("heading", { name: "Entregas", level: 2 }),
      ),
    )
  })

  it("PR-1E02: el 400 del cursor dice que la lista cambió, sin aviso", async () => {
    servidor.paginas = [[fila(1, "Ana Ruiz")], [fila(2, "Beto Gómez")]]
    servidor.manejador = ({ metodo, url }) =>
      metodo === "GET" && url.includes("cursor=")
        ? errorApi(400, "VALIDACION", "cursor: El cursor no es válido")
        : undefined
    render01e(entregas("maestro"))
    fireEvent.click(await screen.findByRole("button", { name: "Ver más alumnos" }))
    expect(
      await screen.findByText(
        "La lista de alumnos cambió mientras la veías. Vuelve a abrir Entregas para verla completa.",
      ),
    ).toBeInTheDocument()
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("PR-1E02: «Ver más alumnos» con un 503 avisa una vez y conserva las filas; con un 404 de la tarea, la vista dice «Esa tarea ya no existe.» sin aviso", async () => {
    servidor.paginas = [[fila(1, "Ana Ruiz")], [fila(2, "Beto Gómez")]]
    let respuesta = () => errorApi(503, "SERVICIO_OCUPADO", "El servicio está ocupado.")
    servidor.manejador = ({ metodo, url }) =>
      metodo === "GET" && url.includes("cursor=") ? respuesta() : undefined
    render01e(entregas("maestro"))
    fireEvent.click(await screen.findByRole("button", { name: "Ver más alumnos" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    expect(screen.getByRole("link", { name: "Ver entrega Ana Ruiz" })).toBeInTheDocument()
    respuesta = () => errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE)
    fireEvent.click(screen.getByRole("button", { name: "Ver más alumnos" }))
    expect(await screen.findByText(NO_EXISTE)).toBeInTheDocument()
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })

  it("PR-1E07: la lista no pinta estado de pago, restricción de acceso ni correos; un doble con estadoPago lo rechaza el esquema estricto", async () => {
    servidor.paginas = [alumnos()]
    render01e(entregas("maestro"))
    await screen.findByRole("link", { name: "Ver entrega Ana Ruiz" })
    expect(screen.queryByText(/Al corriente|Deudor|Acceso restringido|@/)).toBeNull()
    cleanup()

    servidor.paginas = [[{ ...fila(1, "Ana Ruiz"), estadoPago: "deudor" }]]
    render01e(entregas("maestro"))
    expect(await screen.findByText("Algo salió mal. Inténtalo de nuevo.")).toBeInTheDocument()
    expect(screen.queryByText("Ana Ruiz")).toBeNull()
    expect(screen.queryByText(/Deudor/)).toBeNull()
  })
})

describe("la entrega de un alumno (PR-1E03, PR-1E04 y PR-1E07)", () => {
  it("PR-1E03: nombre, estado, «Entregó el …», adjuntos descargados por la ruta de la entrega del alumno y enlaces", async () => {
    render01e(deAlumno("maestro"))
    expect(await screen.findByRole("heading", { name: "Ana Ruiz", level: 2 })).toBeInTheDocument()
    expect(screen.getByText("Entregado")).toBeInTheDocument()
    expect(screen.getByText(/^Entregó el .* a las \d{2}:\d{2}$/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /ejemplo\.com\/mi-trabajo/ })).toHaveAttribute(
      "href",
      "https://ejemplo.com/mi-trabajo",
    )
    expect(screen.getByRole("link", { name: "Volver a las entregas" })).toHaveAttribute(
      "href",
      entregas("maestro"),
    )
    fireEvent.click(screen.getByRole("button", { name: /Descargar/ }))
    await waitFor(() => expect(asignar).toHaveBeenCalledWith(`${ORIGEN_ALMACEN}/descarga/x`))
    expect(
      pedidas("POST", (url) => url === `${RUTA_ALUMNO}/archivos/${ARCHIVO_ID}/descarga`),
    ).toHaveLength(1)
    expect(pedidas("POST", (url) => url.startsWith(`/api/clases/${CLASE_ID}/archivos`))).toEqual([])
  })

  it("PR-1E03: sin entrega dice «Todavía no entrega.»; sin archivos ni enlaces, «Marcó como completada el …»", async () => {
    servidor.entrega = entregaDeAlumno({
      estado: "asignado",
      fechaEntrega: null,
      enlaces: [],
      adjuntos: [],
      version: 0,
    })
    render01e(deAlumno("maestro"))
    expect(await screen.findByText("Todavía no entrega.")).toBeInTheDocument()
    expect(screen.getByText("Asignado")).toBeInTheDocument()
    cleanup()

    servidor.entrega = entregaDeAlumno({ enlaces: [], adjuntos: [] })
    render01e(deAlumno("admin"))
    expect(
      await screen.findByText(/^Marcó como completada el .* a las \d{2}:\d{2}$/),
    ).toBeInTheDocument()
  })

  it.each([
    ["ALUMNO_NO_ENCONTRADO", "No encontramos a ese alumno en esta clase."],
    ["TAREA_NO_ENCONTRADA", NO_EXISTE],
  ])("PR-1E03: un 404 %s reemplaza la vista por «%s»", async (codigo, texto) => {
    servidor.manejador = ({ metodo, url }) =>
      metodo === "GET" && url === RUTA_ALUMNO ? errorApi(404, codigo, "x") : undefined
    render01e(deAlumno("maestro"))
    expect(await screen.findByText(texto)).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Comentarios privados" })).toBeNull()
  })

  it("PR-1E04: el maestro ve el hilo con su formulario y el texto de privacidad de los maestros", async () => {
    render01e(deAlumno("maestro"))
    expect(await screen.findByRole("heading", { name: "Comentarios privados" })).toBeInTheDocument()
    expect(
      screen.getByText(
        "Solo el alumno, los maestros de la clase y la administración pueden verlos.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Comentario privado")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Enviar comentario" })).toBeInTheDocument()
    expect(
      screen.queryByText("La administración puede leer este hilo, pero no escribir en él."),
    ).toBeNull()
    expect(pedidas("GET", (url) => url.startsWith(`${RUTA_HILO_ALUMNO}?`))).toHaveLength(1)
  })

  it("PR-1E04: el admin ve el hilo sin formulario, con el mismo texto de privacidad y la nota de solo lectura", async () => {
    render01e(deAlumno("admin"))
    expect(await screen.findByRole("heading", { name: "Comentarios privados" })).toBeInTheDocument()
    expect(
      screen.getByText(
        "Solo el alumno, los maestros de la clase y la administración pueden verlos.",
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText("La administración puede leer este hilo, pero no escribir en él."),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText("Comentario privado")).toBeNull()
    expect(screen.queryByRole("button", { name: "Enviar comentario" })).toBeNull()
  })

  it("PR-1E04: comentar con un 404 ALUMNO_NO_ENCONTRADO avisa una vez y la vista se reemplaza por su mensaje", async () => {
    let comentado = false
    servidor.manejador = ({ metodo, url }) => {
      if (metodo === "POST" && url === RUTA_HILO_ALUMNO) {
        comentado = true
        return errorApi(404, "ALUMNO_NO_ENCONTRADO", "x")
      }
      if (comentado && metodo === "GET" && url === RUTA_ALUMNO) {
        return errorApi(404, "ALUMNO_NO_ENCONTRADO", "x")
      }
      return undefined
    }
    render01e(deAlumno("maestro"))
    const campo = await screen.findByLabelText("Comentario privado")
    fireEvent.change(campo, { target: { value: "Hola" } })
    fireEvent.click(screen.getByRole("button", { name: "Enviar comentario" }))
    expect(
      await screen.findByText("No encontramos a ese alumno en esta clase."),
    ).toBeInTheDocument()
    await reposar()
    expect(aviso.error.mock.calls).toEqual([["No encontramos a ese alumno en esta clase."]])
  })

  it("PR-1E07: la entrega de un alumno no pinta estado de pago, restricción de acceso ni correos", async () => {
    render01e(deAlumno("maestro"))
    await screen.findByRole("heading", { name: "Ana Ruiz", level: 2 })
    expect(screen.queryByText(/Al corriente|Deudor|Acceso restringido|@/)).toBeNull()
  })
})

describe("borrar una tarea con entregas (PR-1E06 y PR-1E08)", () => {
  const RUTA_CONFIRMADA = `${RUTA_TAREA}?confirmar=entregas`
  const deletes = () => pedidas("DELETE", (url) => url.startsWith(RUTA_TAREA))

  const pedirBorrar = async () => {
    fireEvent.click(await screen.findByRole("button", { name: "Borrar tarea" }))
    expect(
      screen.getByText(
        "Se borrará con su rúbrica, sus adjuntos y los comentarios privados de los alumnos.",
      ),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar tarea" }))
  }

  it("PR-1E06: maestro: el 409 TAREA_CON_ENTREGAS va en role=alert, sin aviso, con el foco en «Cancelar» y sin más botones destructivos; «Cancelar» vuelve a «Borrar tarea» y reintentar da el mismo segundo paso; nunca envía confirmar", async () => {
    servidor.manejador = ({ metodo, url }) =>
      metodo === "DELETE" && url.startsWith(RUTA_TAREA)
        ? errorApi(409, "TAREA_CON_ENTREGAS", MENSAJE_MAESTRO)
        : undefined
    render01e(detalle("maestro"))
    await pedirBorrar()
    const alerta = await screen.findByRole("alert")
    expect(alerta).toHaveTextContent(MENSAJE_MAESTRO)
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancelar" })),
    )
    expect(screen.queryByRole("button", { name: "Sí, borrar tarea" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Borrar con las entregas" })).toBeNull()
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
    expect(aviso.success).not.toHaveBeenCalled()
    expect(deletes().map((l) => l.url)).toEqual([RUTA_TAREA])

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Borrar tarea" })),
    )
    expect(screen.queryByRole("alert")).toBeNull()

    await pedirBorrar()
    expect(await screen.findByRole("alert")).toHaveTextContent(MENSAJE_MAESTRO)
    expect(deletes().map((l) => l.url)).toEqual([RUTA_TAREA, RUTA_TAREA])
    expect(llamadas.some((l) => l.url.includes("confirmar"))).toBe(false)
  })

  it("PR-1E08 (a): admin sin entregas: un DELETE sin consulta, aviso «Tarea borrada» y navegación a «Trabajo de clase»", async () => {
    render01e(detalle("admin"))
    await pedirBorrar()
    expect(await screen.findByText("Trabajo de clase de prueba")).toBeInTheDocument()
    expect(deletes().map((l) => l.url)).toEqual([RUTA_TAREA])
    expect(aviso.success).toHaveBeenCalledWith("Tarea borrada")
  })

  it("PR-1E08 (b, c y d): admin con entregas: segundo paso con «Borrar con las entregas» y el foco en «Cancelar»; un doble clic manda un solo DELETE con confirmar, en espera, y «Cancelar» no cierra nada mientras vuela", async () => {
    const confirmado = diferido()
    servidor.manejador = ({ metodo, url }) => {
      if (metodo === "DELETE" && url === RUTA_TAREA) {
        return errorApi(409, "TAREA_CON_ENTREGAS", MENSAJE_ADMIN)
      }
      if (metodo === "DELETE" && url === RUTA_CONFIRMADA) return confirmado.promesa
      return undefined
    }
    render01e(detalle("admin"))
    await pedirBorrar()
    expect(await screen.findByRole("alert")).toHaveTextContent(MENSAJE_ADMIN)
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancelar" })),
    )
    expect(aviso.error).not.toHaveBeenCalled()
    const conEntregas = screen.getByRole("button", { name: "Borrar con las entregas" })
    fireEvent.click(conEntregas)
    fireEvent.click(conEntregas)
    await waitFor(() => expect(conEntregas).toHaveAttribute("aria-busy", "true"))
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(deletes().map((l) => l.url)).toEqual([RUTA_TAREA, RUTA_CONFIRMADA])

    confirmado.resolver(new Response(null, { status: 204 }))
    expect(await screen.findByText("Trabajo de clase de prueba")).toBeInTheDocument()
    expect(aviso.success).toHaveBeenCalledWith("Tarea borrada")
    expect(deletes()).toHaveLength(2)
  })

  it("PR-1E08 (e): 409 y después 404 al confirmar: el aviso «Esa tarea ya no existe.», el detalle se reemplaza y el foco queda en la raíz de la vista", async () => {
    let borrada = false
    servidor.manejador = ({ metodo, url }) => {
      if (metodo === "DELETE" && url === RUTA_TAREA) {
        return errorApi(409, "TAREA_CON_ENTREGAS", MENSAJE_ADMIN)
      }
      if (metodo === "DELETE" && url === RUTA_CONFIRMADA) {
        borrada = true
        return errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE)
      }
      if (borrada && metodo === "GET" && url === RUTA_TAREA) {
        return errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE)
      }
      return undefined
    }
    render01e(detalle("admin"))
    await pedirBorrar()
    const conEntregas = await screen.findByRole("button", { name: "Borrar con las entregas" })
    conEntregas.focus()
    fireEvent.click(conEntregas)
    expect(await screen.findByText(NO_EXISTE)).toBeInTheDocument()
    await waitFor(() => expect(document.activeElement).not.toBe(document.body))
    expect(document.activeElement?.contains(screen.getByText(NO_EXISTE))).toBe(true)
    expect(aviso.error.mock.calls).toEqual([[NO_EXISTE]])
  })

  it("PR-1E08 (f): 409 y después 500 al confirmar: un aviso, el segundo paso sigue y otro clic manda otro DELETE", async () => {
    servidor.manejador = ({ metodo, url }) => {
      if (metodo === "DELETE" && url === RUTA_TAREA) {
        return errorApi(409, "TAREA_CON_ENTREGAS", MENSAJE_ADMIN)
      }
      if (metodo === "DELETE" && url === RUTA_CONFIRMADA) {
        return errorApi(500, "ERROR_INTERNO", "x")
      }
      return undefined
    }
    render01e(detalle("admin"))
    await pedirBorrar()
    const conEntregas = await screen.findByRole("button", { name: "Borrar con las entregas" })
    fireEvent.click(conEntregas)
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(conEntregas).not.toHaveAttribute("aria-busy", "true"))
    expect(screen.getByRole("alert")).toHaveTextContent(MENSAJE_ADMIN)
    fireEvent.click(conEntregas)
    await waitFor(() =>
      expect(deletes().map((l) => l.url)).toEqual([RUTA_TAREA, RUTA_CONFIRMADA, RUTA_CONFIRMADA]),
    )
  })

  it("PR-1E08 (g): una recarga que trae puedeBorrar en false con el segundo paso a la vista lo quita y el foco va a la raíz", async () => {
    servidor.manejador = ({ metodo, url }) =>
      metodo === "DELETE" && url === RUTA_TAREA
        ? errorApi(409, "TAREA_CON_ENTREGAS", MENSAJE_ADMIN)
        : undefined
    const queryClient = render01e(detalle("admin"))
    await pedirBorrar()
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancelar" })),
    )
    // El reloj fijo no avanza solo: sin esto la recarga tendría la misma fecha de datos.
    vi.setSystemTime(new Date(AHORA.getTime() + 1000))
    servidor.tarea = tareaDoble({ puedeBorrar: false })
    await act(async () => {
      await queryClient.invalidateQueries()
    })
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull())
    expect(screen.queryByRole("button", { name: "Borrar con las entregas" })).toBeNull()
    await waitFor(() => expect(document.activeElement).not.toBe(document.body))
    expect(document.activeElement?.getAttribute("tabindex")).toBe("-1")
  })
})

// ENTREGAS-01e: estados vecinos del borrado y del hilo del maestro (hermanos de §D-10.5.6 y de la regla
// de 01d para ALUMNO_NO_ENCONTRADO).
describe("estados vecinos del borrado y del hilo del alumno (01e)", () => {
  it("borrar, primer paso: mientras «Sí, borrar tarea» vuela, un doble clic manda un solo DELETE y «Cancelar» no cierra la confirmación", async () => {
    const borrado = diferido()
    servidor.manejador = ({ metodo, url }) =>
      metodo === "DELETE" && url === RUTA_TAREA ? borrado.promesa : undefined
    render01e(detalle("maestro"))
    fireEvent.click(await screen.findByRole("button", { name: "Borrar tarea" }))
    const si = screen.getByRole("button", { name: "Sí, borrar tarea" })
    fireEvent.click(si)
    fireEvent.click(si)
    await waitFor(() => expect(si).toHaveAttribute("aria-busy", "true"))
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(screen.getByRole("button", { name: "Sí, borrar tarea" })).toBeInTheDocument()
    expect(pedidas("DELETE", (url) => url.startsWith(RUTA_TAREA))).toHaveLength(1)
    borrado.resolver(new Response(null, { status: 204 }))
    expect(await screen.findByText("Trabajo de clase de prueba")).toBeInTheDocument()
  })

  it("«Ver más comentarios» en la entrega de un alumno con un 404 ALUMNO_NO_ENCONTRADO: sin aviso, se renueva la entrega y la vista dice su mensaje", async () => {
    let pidioMas = false
    servidor.manejador = ({ metodo, url }) => {
      if (metodo === "GET" && url.startsWith(`${RUTA_HILO_ALUMNO}?`) && url.includes("cursor=")) {
        pidioMas = true
        return errorApi(404, "ALUMNO_NO_ENCONTRADO", "x")
      }
      if (metodo === "GET" && url.startsWith(`${RUTA_HILO_ALUMNO}?`)) {
        return respuestaJson(200, {
          comentarios: [
            {
              id: uuid(101),
              texto: "Hola",
              autor: { id: uuid(2), nombre: "Ana Ruiz", administracion: false },
              creadoEn: "2030-01-09T10:00:00.000Z",
              propio: false,
            },
          ],
          siguienteCursor: uuid(901),
        })
      }
      if (pidioMas && metodo === "GET" && url === RUTA_ALUMNO) {
        return errorApi(404, "ALUMNO_NO_ENCONTRADO", "x")
      }
      return undefined
    }
    render01e(deAlumno("maestro"))
    fireEvent.click(await screen.findByRole("button", { name: "Ver más comentarios" }))
    expect(
      await screen.findByText("No encontramos a ese alumno en esta clase."),
    ).toBeInTheDocument()
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
    expect(pedidas("GET", (url) => url === RUTA_ALUMNO)).toHaveLength(2)
  })
})

// ENTREGAS-01e, ronda 1 (T-01 y sus hermanos): descargar un adjunto con un error que reemplaza la vista
// la reemplaza (un solo aviso y el foco fuera de <body>), en la entrega de un alumno, en el detalle de
// la tarea y en "Tu trabajo"; si apiClient redirige, sin aviso; los demás errores, el aviso de siempre.
describe("descargar un adjunto con errores (ronda 1, T-01)", () => {
  const SIN_ACCESO = "No tienes acceso a esta clase."
  const NO_ALUMNO = "No encontramos a ese alumno en esta clase."
  const DESCARGA_ALUMNO = `${RUTA_ALUMNO}/archivos/${ARCHIVO_ID}/descarga`
  const DESCARGA_CLASE = `/api/clases/${CLASE_ID}/archivos/${ARCHIVO_ID}/descarga`
  const DESCARGA_PROPIA = `${RUTA_TAREA}/entrega/archivos/${ARCHIVO_ID}/descarga`
  const ADJUNTO = {
    id: ARCHIVO_ID,
    nombre: "trabajo.pdf",
    tipo: "application/pdf",
    tamano: 2048,
    vistaPrevia: null,
  }

  // La ruta de descarga responde el error y, desde entonces, la tarea y la entrega del alumno también.
  const conFalloAlDescargar = (ruta: string, estado: number, codigo: string, mensaje: string) => {
    let fallo = false
    return ({ metodo, url }: Llamada) => {
      if (metodo === "POST" && url === ruta) {
        fallo = true
        return errorApi(estado, codigo, mensaje)
      }
      if (fallo && metodo === "GET" && (url === RUTA_TAREA || url === RUTA_ALUMNO)) {
        return errorApi(estado, codigo, mensaje)
      }
      return undefined
    }
  }

  const descargar = async () => {
    const boton = await screen.findByRole("button", { name: /Descargar.*trabajo\.pdf/ })
    boton.focus()
    fireEvent.click(boton)
    return boton
  }

  // "Tu trabajo" del alumno con una entrega hecha que lleva el archivo.
  const alumnoConEntrega = (siguiente: (l: Llamada) => Response | undefined) => (l: Llamada) => {
    if (l.metodo === "GET" && l.url === `${RUTA_TAREA}/entrega`) {
      return respuestaJson(200, {
        entrega: {
          estado: "entregado",
          fechaEntrega: "2030-01-09T15:30:00.000Z",
          conRetraso: false,
          enlaces: [],
          adjuntos: [ADJUNTO],
          puedeEntregar: false,
          puedeAnular: true,
          calificacion: null,
        },
      })
    }
    if (l.metodo === "GET" && l.url.startsWith(`${RUTA_TAREA}/entrega/comentarios`)) {
      return respuestaJson(200, { comentarios: [], siguienteCursor: null })
    }
    return siguiente(l)
  }

  it.each([
    { estado: 404, codigo: "ALUMNO_NO_ENCONTRADO", mensaje: NO_ALUMNO },
    { estado: 403, codigo: "SIN_ACCESO_A_LA_CLASE", mensaje: SIN_ACCESO },
    { estado: 404, codigo: "TAREA_NO_ENCONTRADA", mensaje: NO_EXISTE },
  ])(
    "Ronda 1 (T-01): en la entrega de un alumno, descargar con $estado $codigo da un aviso, la vista dice «$mensaje» y el foco no cae en <body>",
    async ({ estado, codigo, mensaje }) => {
      servidor.manejador = conFalloAlDescargar(DESCARGA_ALUMNO, estado, codigo, mensaje)
      render01e(deAlumno("maestro"))
      await descargar()
      expect(await screen.findByText(mensaje)).toBeInTheDocument()
      await reposar()
      expect(screen.queryByRole("heading", { name: "Ana Ruiz" })).toBeNull()
      expect(screen.queryByLabelText("Comentario privado")).toBeNull()
      expect(aviso.error.mock.calls).toEqual([[mensaje]])
      expect(document.activeElement).not.toBe(document.body)
    },
  )

  it("Ronda 1 (T-01): en la entrega de un alumno, descargar con 403 ACCESO_RESTRINGIDO: apiClient redirige y no hay aviso", async () => {
    servidor.manejador = ({ metodo, url }) =>
      metodo === "POST" && url === DESCARGA_ALUMNO
        ? errorApi(403, "ACCESO_RESTRINGIDO", "Tu acceso está restringido.")
        : undefined
    render01e(deAlumno("maestro"))
    await descargar()
    await waitFor(() => expect(asignar).toHaveBeenCalledWith("/acceso-restringido"))
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
    expect(pedidas("GET", (url) => url === RUTA_ALUMNO)).toHaveLength(1)
  })

  it("Ronda 1 (T-01): en la entrega de un alumno, descargar con 503 da el aviso de siempre y no renueva nada", async () => {
    servidor.manejador = ({ metodo, url }) =>
      metodo === "POST" && url === DESCARGA_ALUMNO
        ? errorApi(503, "SERVICIO_OCUPADO", "El servicio está ocupado.")
        : undefined
    render01e(deAlumno("maestro"))
    const boton = await descargar()
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await reposar()
    expect(aviso.error.mock.calls).toEqual([["El servicio está ocupado."]])
    expect(screen.getByRole("heading", { name: "Ana Ruiz" })).toBeInTheDocument()
    expect(document.activeElement).toBe(boton)
    expect(pedidas("GET", (url) => url === RUTA_ALUMNO)).toHaveLength(1)
    expect(pedidas("GET", (url) => url === RUTA_TAREA)).toHaveLength(1)
  })

  it("Ronda 1 (T-01, hermano): descargar y comentar a la vez con el mismo 404 ALUMNO_NO_ENCONTRADO dan un solo aviso", async () => {
    const descarga = diferido()
    const envio = diferido()
    let fallo = false
    servidor.manejador = ({ metodo, url }) => {
      if (metodo === "POST" && url === DESCARGA_ALUMNO) return descarga.promesa
      if (metodo === "POST" && url === RUTA_HILO_ALUMNO) return envio.promesa
      if (fallo && metodo === "GET" && url === RUTA_ALUMNO) {
        return errorApi(404, "ALUMNO_NO_ENCONTRADO", NO_ALUMNO)
      }
      return undefined
    }
    render01e(deAlumno("maestro"))
    await descargar()
    fireEvent.change(screen.getByLabelText("Comentario privado"), { target: { value: "Hola" } })
    fireEvent.click(screen.getByRole("button", { name: "Enviar comentario" }))
    await waitFor(() => expect(pedidas("POST", (url) => url === RUTA_HILO_ALUMNO)).toHaveLength(1))
    fallo = true
    descarga.resolver(errorApi(404, "ALUMNO_NO_ENCONTRADO", NO_ALUMNO))
    envio.resolver(errorApi(404, "ALUMNO_NO_ENCONTRADO", NO_ALUMNO))
    expect(await screen.findByText(NO_ALUMNO)).toBeInTheDocument()
    await reposar()
    expect(aviso.error.mock.calls).toEqual([[NO_ALUMNO]])
  })

  it("Ronda 1 (T-01, estado vecino): una descarga que falla con la vista ya desmontada avisa una vez y no lanza", async () => {
    const descarga = diferido()
    servidor.manejador = ({ metodo, url }) =>
      metodo === "POST" && url === DESCARGA_ALUMNO ? descarga.promesa : undefined
    const errores = vi.spyOn(console, "error").mockImplementation(() => undefined)
    render01e(deAlumno("maestro"))
    await descargar()
    await waitFor(() => expect(pedidas("POST", (url) => url === DESCARGA_ALUMNO)).toHaveLength(1))
    cleanup()
    descarga.resolver(errorApi(503, "SERVICIO_OCUPADO", "El servicio está ocupado."))
    await reposar()
    expect(aviso.error.mock.calls).toEqual([["El servicio está ocupado."]])
    expect(asignar).not.toHaveBeenCalled()
    expect(errores).not.toHaveBeenCalled()
    errores.mockRestore()
  })

  it.each([
    { perspectiva: "maestro", estado: 404, codigo: "TAREA_NO_ENCONTRADA", mensaje: NO_EXISTE },
    { perspectiva: "admin", estado: 403, codigo: "SIN_ACCESO_A_LA_CLASE", mensaje: SIN_ACCESO },
  ] as const)(
    "Ronda 1 (T-01, hermano): en el detalle ($perspectiva), descargar un adjunto de la tarea con $estado $codigo da un aviso y la vista dice «$mensaje»",
    async ({ perspectiva, estado, codigo, mensaje }) => {
      servidor.tarea = tareaDoble({ adjuntos: [ADJUNTO] })
      servidor.manejador = conFalloAlDescargar(DESCARGA_CLASE, estado, codigo, mensaje)
      render01e(detalle(perspectiva))
      await descargar()
      expect(await screen.findByText(mensaje)).toBeInTheDocument()
      await reposar()
      expect(screen.queryByRole("heading", { name: "Ensayo final" })).toBeNull()
      expect(aviso.error.mock.calls).toEqual([[mensaje]])
      expect(document.activeElement).not.toBe(document.body)
    },
  )

  it("Ronda 1 (T-01, hermano): en el detalle del alumno, descargar un adjunto de la tarea con 404 TAREA_NO_ENCONTRADA da un aviso y la vista se reemplaza", async () => {
    servidor.tarea = tareaDoble({ adjuntos: [ADJUNTO], puedeEditar: false, puedeBorrar: false })
    servidor.manejador = alumnoConEntrega(
      conFalloAlDescargar(DESCARGA_CLASE, 404, "TAREA_NO_ENCONTRADA", NO_EXISTE),
    )
    render01e(detalle("estudiante"))
    await screen.findByRole("heading", { name: "Tu trabajo" })
    const botones = await screen.findAllByRole("button", { name: /Descargar.*trabajo\.pdf/ })
    const deLaTarea = botones[0]
    if (deLaTarea === undefined) throw new Error("Precondición: la tarea tiene un adjunto")
    deLaTarea.focus()
    fireEvent.click(deLaTarea)
    expect(await screen.findByText(NO_EXISTE)).toBeInTheDocument()
    await reposar()
    expect(screen.queryByRole("heading", { name: "Tu trabajo" })).toBeNull()
    expect(aviso.error.mock.calls).toEqual([[NO_EXISTE]])
    expect(pedidas("POST", (url) => url === DESCARGA_CLASE)).toHaveLength(1)
  })

  it("Ronda 1 (T-01, hermano): en «Tu trabajo», descargar un archivo de la entrega propia con 404 TAREA_NO_ENCONTRADA da un aviso y la vista se reemplaza; con ARCHIVO_NO_ENCONTRADO, solo el aviso", async () => {
    servidor.tarea = tareaDoble({ puedeEditar: false, puedeBorrar: false })
    servidor.manejador = alumnoConEntrega(
      conFalloAlDescargar(DESCARGA_PROPIA, 404, "TAREA_NO_ENCONTRADA", NO_EXISTE),
    )
    render01e(detalle("estudiante"))
    await descargar()
    expect(await screen.findByText(NO_EXISTE)).toBeInTheDocument()
    await reposar()
    expect(aviso.error.mock.calls).toEqual([[NO_EXISTE]])
    expect(document.activeElement).not.toBe(document.body)
    cleanup()
    aviso.error.mockClear()

    servidor.manejador = alumnoConEntrega(({ metodo, url }) =>
      metodo === "POST" && url === DESCARGA_PROPIA
        ? errorApi(404, "ARCHIVO_NO_ENCONTRADO", "x")
        : undefined,
    )
    render01e(detalle("estudiante"))
    const boton = await descargar()
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("heading", { name: "Tu trabajo" })).toBeInTheDocument()
    expect(document.activeElement).toBe(boton)
  })
})
