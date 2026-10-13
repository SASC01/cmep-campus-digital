import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { enlaceDeEntregaSchema } from "@campus/shared"

import { formatearFechaLarga } from "@/lib/format"
import { clavePrefijoDelTrabajo } from "@/services/trabajoService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { DetalleTareaView } from "./detalle-tarea-view"

// ENTREGAS-01d (PR-1D03 a PR-1D11 y PR-1D14): "Tu trabajo" y el hilo privado del alumno en el detalle
// de la tarea. Reloj fijo en todas (vi.useFakeTimers solo para Date). El servidor es un doble en
// memoria que responde la tarea, la entrega, sus archivos y el hilo; el almacén, una URL de otro
// origen.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
const PASADA = "2030-01-05T16:00:00.000Z"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const ARCHIVO_ID = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02"
const ORIGEN_ALMACEN = "https://almacen.ejemplo.mx"
const RUTA_ENTREGA = `/api/clases/${CLASE_ID}/tareas/${TAREA_ID}/entrega`
const uuid = (n: number) => `9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c${String(n).padStart(4, "0")}`

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
    puedeEditar: false,
    puedeBorrar: false,
    ...extra,
  },
})

const entregaAsignada = (extra: Record<string, unknown> = {}) => ({
  estado: "asignado",
  fechaEntrega: null,
  conRetraso: false,
  enlaces: [],
  adjuntos: [],
  puedeEntregar: true,
  puedeAnular: false,
  calificacion: null,
  ...extra,
})

const entregaRealizada = (extra: Record<string, unknown> = {}) => ({
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
  puedeEntregar: false,
  puedeAnular: true,
  calificacion: null,
  ...extra,
})

const comentarioDoble = (n: number, extra: Record<string, unknown> = {}) => ({
  id: uuid(100 + n),
  texto: `Comentario ${String(n)}`,
  autor: { id: uuid(2), nombre: "Ana Ruiz", administracion: false },
  creadoEn: `2030-01-0${String(Math.min(n, 9))}T10:00:00.000Z`,
  propio: true,
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
  cuerpo: unknown
  cabeceras: unknown
  credenciales: unknown
}

type Manejador = (llamada: Llamada) => Response | Promise<Response> | undefined

interface Servidor {
  tarea: ReturnType<typeof tareaDoble>
  entrega: Record<string, unknown>
  paginasDelHilo: Record<string, unknown>[][]
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
      const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : null
      const llamada = {
        metodo,
        url,
        cuerpo,
        cabeceras: init?.headers,
        credenciales: init?.credentials,
      }
      llamadas.push(llamada)
      const propia = servidor.manejador(llamada)
      if (propia !== undefined) return Promise.resolve(propia)
      if (url.startsWith(ORIGEN_ALMACEN))
        return Promise.resolve(new Response(null, { status: 200 }))
      if (metodo === "GET" && url.endsWith(`/tareas/${TAREA_ID}`)) {
        return Promise.resolve(respuestaJson(200, servidor.tarea))
      }
      if (metodo === "GET" && url === RUTA_ENTREGA) {
        return Promise.resolve(respuestaJson(200, { entrega: servidor.entrega }))
      }
      if (metodo === "POST" && url === `${RUTA_ENTREGA}/archivos`) {
        const solicitudes = llamadas.filter((l) => l.url === url).length
        return Promise.resolve(
          respuestaJson(201, {
            archivo: {
              id: uuid(500 + solicitudes),
              nombre: "x",
              tipo: "application/pdf",
              tamano: 1,
            },
            subida: {
              url: `${ORIGEN_ALMACEN}/subida/${String(solicitudes)}`,
              metodo: "PUT",
              cabeceras: { "Content-Type": "application/pdf" },
              expiraEn: "2030-01-10T12:05:00.000Z",
            },
          }),
        )
      }
      if (metodo === "POST" && url === RUTA_ENTREGA) {
        servidor.entrega = entregaRealizada({ fechaEntrega: AHORA.toISOString() })
        return Promise.resolve(respuestaJson(200, { entrega: servidor.entrega }))
      }
      if (metodo === "POST" && url === `${RUTA_ENTREGA}/anular`) {
        servidor.entrega = entregaAsignada()
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
      if (metodo === "GET" && url.startsWith(`${RUTA_ENTREGA}/comentarios`)) {
        const cursor = new URL(url, "http://local").searchParams.get("cursor")
        const indice = cursor === null ? 0 : Number(cursor.slice(-1))
        const pagina = servidor.paginasDelHilo[indice] ?? []
        const siguiente =
          indice + 1 < servidor.paginasDelHilo.length ? uuid(900 + indice + 1) : null
        return Promise.resolve(
          respuestaJson(200, { comentarios: pagina, siguienteCursor: siguiente }),
        )
      }
      if (metodo === "POST" && url === `${RUTA_ENTREGA}/comentarios`) {
        return Promise.resolve(respuestaJson(201, { comentario: comentarioDoble(9) }))
      }
      return Promise.resolve(errorApi(500, "ERROR_INTERNO", "no esperada"))
    }),
  )
}

const renderDetalle = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/estudiante/clases/${CLASE_ID}/tareas/${TAREA_ID}`]}>
        <Routes>
          <Route
            path="/estudiante/clases/:claseId/tareas/:tareaId"
            element={<DetalleTareaView />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return queryClient
}

const encabezadoTuTrabajo = () => screen.getByRole("heading", { name: "Tu trabajo" })
const seccionTuTrabajo = () => {
  const seccion = encabezadoTuTrabajo().closest("section")
  if (seccion === null) throw new Error("Precondición: «Tu trabajo» es una sección")
  return seccion
}
const pedidasA = (metodo: string, url: string) =>
  llamadas.filter((l) => l.metodo === metodo && l.url === url)

const elegirArchivo = (nombre = "ensayo.pdf") => {
  const archivo = new File(["contenido"], nombre, { type: "application/pdf" })
  fireEvent.change(screen.getByLabelText("Adjuntar archivos"), { target: { files: [archivo] } })
  return archivo
}

const agregarEnlace = (enlace: string) => {
  fireEvent.change(screen.getByLabelText("Enlace"), { target: { value: enlace } })
  fireEvent.click(screen.getByRole("button", { name: "Agregar enlace" }))
}

const diferido = () => {
  let resolver: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  llamadas = []
  servidor = {
    tarea: tareaDoble(),
    entrega: entregaAsignada(),
    paginasDelHilo: [[]],
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

describe("«Tu trabajo» (PR-1D03)", () => {
  it("PR-1D03: el encabezado se pinta mientras carga y tras un error; error → cargando → datos", async () => {
    const espera = diferido()
    servidor.manejador = ({ metodo, url }) =>
      metodo === "GET" && url === RUTA_ENTREGA ? espera.promesa : undefined
    renderDetalle()
    expect(await screen.findByRole("heading", { name: "Tu trabajo" })).toBeInTheDocument()
    expect(within(seccionTuTrabajo()).getByText("Cargando tu entrega…")).toBeInTheDocument()
    await act(async () => {
      espera.resolver(errorApi(500, "ERROR_INTERNO", "Algo salió mal"))
      await espera.promesa
    })
    await waitFor(() =>
      expect(
        within(seccionTuTrabajo()).getByText("Algo salió mal. Inténtalo de nuevo."),
      ).toBeInTheDocument(),
    )
    expect(encabezadoTuTrabajo()).toBeInTheDocument()
  })

  it("PR-1D03: abierta y sin entrega muestra el formulario; con adjuntos requeridos el botón dice «Entregar tarea»", async () => {
    renderDetalle()
    expect(await screen.findByRole("button", { name: "Entregar tarea" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Adjuntar archivos" })).toBeInTheDocument()
    expect(screen.getByLabelText("Enlace")).toBeInTheDocument()
    expect(within(seccionTuTrabajo()).getByText("Asignado")).toBeInTheDocument()
  })

  it("PR-1D03: sin adjuntos requeridos y vacío dice «Marcar como completada»; con un archivo o un enlace, «Entregar tarea»", async () => {
    servidor.tarea = tareaDoble({ requiereAdjuntos: false })
    renderDetalle()
    expect(
      await screen.findByRole("button", { name: "Marcar como completada" }),
    ).toBeInTheDocument()
    agregarEnlace("https://ejemplo.com/a")
    expect(screen.getByRole("button", { name: "Entregar tarea" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /^Quitar/ }))
    expect(screen.getByRole("button", { name: "Marcar como completada" })).toBeInTheDocument()
    elegirArchivo()
    expect(screen.getByRole("button", { name: "Entregar tarea" })).toBeInTheDocument()
  })
})

describe("entregar (PR-1D04)", () => {
  it("PR-1D04: cada archivo se pide por la ruta de la entrega, se sube sin el token y después se entrega con sus ids y los enlaces; al terminar, aviso, «Entregado», «Trabajo de clase» viejo y el foco en «Tu trabajo»", async () => {
    const queryClient = renderDetalle()
    queryClient.setQueryData([...clavePrefijoDelTrabajo(CLASE_ID), "sin-tema"], { pages: [] })
    await screen.findByRole("button", { name: "Entregar tarea" })
    elegirArchivo()
    agregarEnlace("  HTTPS://Ejemplo.com/Mi trabajo ")
    fireEvent.click(screen.getByRole("button", { name: "Entregar tarea" }))

    await waitFor(() => expect(encabezadoTuTrabajo()).toHaveFocus())
    const relevantes = llamadas
      .filter((l) => l.metodo !== "GET")
      .map((l) => `${l.metodo} ${l.url.replace(ORIGEN_ALMACEN, "almacen")}`)
    expect(relevantes).toEqual([
      `POST ${RUTA_ENTREGA}/archivos`,
      "PUT almacen/subida/1",
      `POST ${RUTA_ENTREGA}`,
    ])
    expect(llamadas.some((l) => l.url === `/api/clases/${CLASE_ID}/archivos`)).toBe(false)
    const put = llamadas.find((l) => l.metodo === "PUT")
    expect(put?.credenciales).toBe("omit")
    expect(JSON.stringify(put?.cabeceras)).not.toMatch(/authorization/i)
    expect(pedidasA("POST", RUTA_ENTREGA)[0]?.cuerpo).toEqual({
      archivoIds: [uuid(501)],
      enlaces: ["https://ejemplo.com/Mi%20trabajo"],
    })
    expect(aviso.success).toHaveBeenCalledWith("Tarea entregada")
    expect(within(seccionTuTrabajo()).getByText("Entregado")).toBeInTheDocument()
    expect(
      queryClient.getQueryState([...clavePrefijoDelTrabajo(CLASE_ID), "sin-tema"])?.isInvalidated,
    ).toBe(true)
  })

  it("PR-1D04: el botón está en espera desde la primera subida hasta la respuesta, y un doble clic o un Enter repetido hacen una sola entrega", async () => {
    const espera = diferido()
    servidor.manejador = ({ metodo, url }) =>
      metodo === "POST" && url === RUTA_ENTREGA ? espera.promesa : undefined
    renderDetalle()
    const boton = await screen.findByRole("button", { name: "Entregar tarea" })
    agregarEnlace("https://ejemplo.com/a")
    fireEvent.click(boton)
    fireEvent.click(boton)
    fireEvent.submit(boton.closest("form") as HTMLFormElement)
    await waitFor(() => expect(boton).toHaveAttribute("aria-busy", "true"))
    expect(boton).not.toHaveAttribute("disabled")
    expect(screen.getByRole("status")).toHaveTextContent(
      "Mientras se entrega no puedes cambiar los archivos ni los enlaces.",
    )
    await act(async () => {
      espera.resolver(respuestaJson(200, { entrega: entregaRealizada({ adjuntos: [] }) }))
      await espera.promesa
    })
    await waitFor(() =>
      expect(within(seccionTuTrabajo()).getByText("Entregado")).toBeInTheDocument(),
    )
    expect(pedidasA("POST", RUTA_ENTREGA)).toHaveLength(1)
  })

  it("PR-1D04: si falla una subida, el aviso nombra el archivo, no hay POST …/entrega y lo elegido se conserva", async () => {
    servidor.manejador = ({ url }) =>
      url.startsWith(ORIGEN_ALMACEN) ? new Response(null, { status: 500 }) : undefined
    renderDetalle()
    const boton = await screen.findByRole("button", { name: "Entregar tarea" })
    elegirArchivo("capitulo.pdf")
    boton.focus()
    fireEvent.click(boton)
    await waitFor(() =>
      expect(aviso.error).toHaveBeenCalledWith(
        "No pudimos subir «capitulo.pdf». Inténtalo de nuevo.",
      ),
    )
    expect(pedidasA("POST", RUTA_ENTREGA)).toHaveLength(0)
    expect(screen.getByRole("list", { name: "Archivos elegidos" })).toHaveTextContent(
      "capitulo.pdf",
    )
    await waitFor(() => expect(boton).not.toHaveAttribute("aria-busy", "true"))
    expect(boton).toHaveFocus()
  })
})

describe("enlaces (PR-1D05)", () => {
  it("PR-1D05: un javascript: muestra el error bajo el campo y no se agrega", async () => {
    renderDetalle()
    await screen.findByLabelText("Enlace")
    agregarEnlace("javascript:alert(1)")
    expect(
      screen.getByText("Escribe un enlace que empiece con https:// o http://."),
    ).toBeInTheDocument()
    expect(screen.queryByRole("list", { name: "Enlaces agregados" })).toBeNull()
  })

  it("PR-1D05: con 5 enlaces, «Agregar enlace» no agrega y la nota lo dice", async () => {
    renderDetalle()
    await screen.findByLabelText("Enlace")
    for (let i = 1; i <= 5; i += 1) agregarEnlace(`https://ejemplo.com/${String(i)}`)
    expect(
      screen.getByText("Ya agregaste 5 enlaces. Quita uno para agregar otro."),
    ).toBeInTheDocument()
    agregarEnlace("https://ejemplo.com/6")
    const lista = screen.getByRole("list", { name: "Enlaces agregados" })
    expect(within(lista).getAllByRole("listitem")).toHaveLength(5)
    expect(screen.getByRole("button", { name: "Agregar enlace" })).not.toHaveAttribute("disabled")
  })

  it("PR-1D05: «Quitar» lleva el foco al «Quitar» vecino y, sin enlaces, al campo", async () => {
    renderDetalle()
    await screen.findByLabelText("Enlace")
    agregarEnlace("https://ejemplo.com/1")
    agregarEnlace("https://ejemplo.com/2")
    fireEvent.click(screen.getByRole("button", { name: "Quitar https://ejemplo.com/2" }))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Quitar https://ejemplo.com/1" })).toHaveFocus(),
    )
    fireEvent.click(screen.getByRole("button", { name: "Quitar https://ejemplo.com/1" }))
    await waitFor(() => expect(screen.getByLabelText("Enlace")).toHaveFocus())
  })
})

describe("entrega vacía (PR-1D06)", () => {
  it("PR-1D06: en una tarea que requiere adjuntos, entregar sin nada muestra el error del grupo y no pide nada", async () => {
    renderDetalle()
    fireEvent.click(await screen.findByRole("button", { name: "Entregar tarea" }))
    expect(
      screen.getByText("Agrega al menos un archivo o un enlace para entregar."),
    ).toBeInTheDocument()
    expect(llamadas.filter((l) => l.metodo !== "GET")).toEqual([])
  })
})

describe("errores del servidor al entregar (PR-1D07)", () => {
  it.each([
    [
      "ENTREGA_YA_REALIZADA",
      "Ya entregaste esta tarea. Si quieres cambiarla, anula tu entrega primero.",
    ],
    ["ENTREGA_CERRADA", "La fecha límite ya pasó y esta tarea no acepta entregas con retraso."],
    ["ENTREGA_CALIFICADA", "Tu entrega ya está calificada y no se puede cambiar."],
  ])(
    "PR-1D07: %s avisa con el mensaje del servidor y vuelve a pedir la entrega",
    async (codigo, mensaje) => {
      servidor.manejador = ({ metodo, url }) =>
        metodo === "POST" && url === RUTA_ENTREGA ? errorApi(409, codigo, mensaje) : undefined
      renderDetalle()
      await screen.findByRole("button", { name: "Entregar tarea" })
      const lecturasAntes = pedidasA("GET", RUTA_ENTREGA).length
      agregarEnlace("https://ejemplo.com/a")
      fireEvent.click(screen.getByRole("button", { name: "Entregar tarea" }))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(mensaje))
      await waitFor(() =>
        expect(pedidasA("GET", RUTA_ENTREGA).length).toBeGreaterThan(lecturasAntes),
      )
    },
  )

  it("PR-1D07: ENTREGA_VACIA marca el grupo y un VALIDACION de enlaces.1 marca la lista, sin aviso", async () => {
    let respuesta = errorApi(
      400,
      "ENTREGA_VACIA",
      "Agrega al menos un archivo o un enlace para entregar.",
    )
    servidor.manejador = ({ metodo, url }) =>
      metodo === "POST" && url === RUTA_ENTREGA ? respuesta : undefined
    servidor.tarea = tareaDoble({ requiereAdjuntos: false })
    renderDetalle()
    fireEvent.click(await screen.findByRole("button", { name: "Marcar como completada" }))
    expect(
      await screen.findByText("Agrega al menos un archivo o un enlace para entregar."),
    ).toBeInTheDocument()

    respuesta = errorApi(
      400,
      "VALIDACION",
      "enlaces.1: Escribe un enlace que empiece con https:// o http://.",
    )
    agregarEnlace("https://ejemplo.com/a")
    fireEvent.click(screen.getByRole("button", { name: "Entregar tarea" }))
    expect(
      await screen.findByText("Escribe un enlace que empiece con https:// o http://."),
    ).toBeInTheDocument()
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

describe("cierre y retraso (PR-1D08)", () => {
  it("PR-1D08: vencida y con tardías, la nota de retraso", async () => {
    servidor.tarea = tareaDoble({ fechaLimite: PASADA, aceptaTardias: true })
    renderDetalle()
    expect(
      await screen.findByText("La fecha límite ya pasó. Tu entrega quedará marcada con retraso."),
    ).toBeInTheDocument()
    expect(within(seccionTuTrabajo()).getByText("Sin entregar")).toBeInTheDocument()
  })

  it("PR-1D08: cerrada sin entrega, la frase y ningún botón ni campo", async () => {
    servidor.tarea = tareaDoble({ fechaLimite: PASADA, aceptaTardias: false })
    servidor.entrega = entregaAsignada({ puedeEntregar: false })
    renderDetalle()
    expect(
      await within(await waitFor(seccionTuTrabajo)).findByText(
        "La fecha límite ya pasó y esta tarea no acepta entregas con retraso.",
      ),
    ).toBeInTheDocument()
    expect(within(seccionTuTrabajo()).queryAllByRole("button")).toEqual([])
    expect(within(seccionTuTrabajo()).queryByRole("textbox")).toBeNull()
  })

  it("PR-1D08: cerrada con entrega, la entrega sin «Anular entrega»", async () => {
    servidor.tarea = tareaDoble({ fechaLimite: PASADA, aceptaTardias: false })
    servidor.entrega = entregaRealizada({ puedeAnular: false })
    renderDetalle()
    expect(await screen.findByText(/^Entregaste el /)).toBeInTheDocument()
    expect(
      screen.getByText("La fecha límite ya pasó y esta tarea no acepta entregas con retraso."),
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Anular entrega" })).toBeNull()
  })
})

describe("la entrega realizada (PR-1D09)", () => {
  it("PR-1D09: la fecha en la zona local, los adjuntos descargados por la ruta de la entrega y los enlaces con su href exacto en otra pestaña", async () => {
    servidor.entrega = entregaRealizada()
    renderDetalle()
    const frase = await screen.findByText(/^Entregaste el /)
    const fecha = new Date("2030-01-09T15:30:00.000Z")
    const hora = new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(fecha)
    expect(frase).toHaveTextContent(`Entregaste el ${formatearFechaLarga(fecha)} a las ${hora}`)

    fireEvent.click(screen.getByRole("button", { name: /Descargar/ }))
    await waitFor(() => expect(asignar).toHaveBeenCalledWith(`${ORIGEN_ALMACEN}/descarga/x`))
    expect(pedidasA("POST", `${RUTA_ENTREGA}/archivos/${ARCHIVO_ID}/descarga`)).toHaveLength(1)

    const enlace = screen.getByRole("link", { name: /https:\/\/ejemplo\.com\/mi-trabajo/ })
    expect(enlace).toHaveAttribute("href", "https://ejemplo.com/mi-trabajo")
    expect(enlace).toHaveAttribute("target", "_blank")
    expect(enlace).toHaveAttribute("rel", "noopener noreferrer")
    expect(enlace).toHaveTextContent("(se abre en otra pestaña)")
  })

  it("PR-1D09: sin archivos ni enlaces dice «Marcaste como completada el …»", async () => {
    servidor.entrega = entregaRealizada({ adjuntos: [], enlaces: [] })
    renderDetalle()
    expect(await screen.findByText(/^Marcaste como completada el /)).toBeInTheDocument()
  })

  it("PR-1D09: una respuesta con un enlace javascript: hace fallar el parse y la vista muestra el error (el enlace nunca se pinta)", async () => {
    servidor.entrega = entregaRealizada({ enlaces: ["javascript:alert(1)"] })
    renderDetalle()
    expect(
      await within(await waitFor(seccionTuTrabajo)).findByText(
        "Algo salió mal. Inténtalo de nuevo.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /javascript/ })).toBeNull()
    expect(document.querySelector('a[href^="javascript"]')).toBeNull()
  })
})

describe("anular (PR-1D10)", () => {
  it("PR-1D10: la confirmación en línea lleva el foco a «Cancelar»; «Cancelar» lo regresa a «Anular entrega»", async () => {
    servidor.entrega = entregaRealizada()
    renderDetalle()
    fireEvent.click(await screen.findByRole("button", { name: "Anular entrega" }))
    expect(
      screen.getByText("Se quitarán tus archivos y enlaces. Podrás volver a entregar."),
    ).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus())
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Anular entrega" })).toHaveFocus(),
    )
  })

  it("PR-1D10: ya vencida y con tardías, la frase avisa que volver a entregar quedará con retraso", async () => {
    servidor.tarea = tareaDoble({ fechaLimite: PASADA, aceptaTardias: true })
    servidor.entrega = entregaRealizada({ conRetraso: true })
    renderDetalle()
    fireEvent.click(await screen.findByRole("button", { name: "Anular entrega" }))
    expect(
      screen.getByText(
        "Se quitarán tus archivos y enlaces. Si vuelves a entregar, quedará marcada con retraso.",
      ),
    ).toBeInTheDocument()
  })

  it("PR-1D10: «Sí, anular entrega» en espera y una sola petición con doble clic; al terminar, aviso, formulario vacío y foco en «Tu trabajo»", async () => {
    servidor.entrega = entregaRealizada()
    const espera = diferido()
    servidor.manejador = ({ metodo, url }) =>
      metodo === "POST" && url === `${RUTA_ENTREGA}/anular` ? espera.promesa : undefined
    renderDetalle()
    fireEvent.click(await screen.findByRole("button", { name: "Anular entrega" }))
    const si = screen.getByRole("button", { name: "Sí, anular entrega" })
    fireEvent.click(si)
    fireEvent.click(si)
    await waitFor(() => expect(si).toHaveAttribute("aria-busy", "true"))
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(screen.getByRole("button", { name: "Sí, anular entrega" })).toBeInTheDocument()
    await act(async () => {
      espera.resolver(respuestaJson(200, { entrega: entregaAsignada() }))
      await espera.promesa
    })
    await waitFor(() => expect(encabezadoTuTrabajo()).toHaveFocus())
    expect(pedidasA("POST", `${RUTA_ENTREGA}/anular`)).toHaveLength(1)
    expect(aviso.success).toHaveBeenCalledWith("Entrega anulada")
    expect(screen.getByRole("button", { name: "Entregar tarea" })).toBeInTheDocument()
    expect(screen.queryByRole("list", { name: "Enlaces agregados" })).toBeNull()
  })

  it("PR-1D10: con puedeAnular falso no hay «Anular entrega»", async () => {
    servidor.entrega = entregaRealizada({ estado: "calificado", puedeAnular: false })
    renderDetalle()
    expect(await screen.findByText("Tu entrega ya está calificada.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Anular entrega" })).toBeNull()
  })
})

describe("el hilo privado del alumno (PR-1D11)", () => {
  const hiloSeccion = async () => {
    const titulo = await screen.findByRole("heading", { name: "Comentarios privados" })
    const tarjeta = titulo.closest("[data-slot='card']")
    if (!(tarjeta instanceof HTMLElement)) throw new Error("Precondición: el hilo es un panel")
    return tarjeta
  }

  it("PR-1D11: vacío dice «Aún no hay comentarios privados.»", async () => {
    renderDetalle()
    expect(
      await within(await hiloSeccion()).findByText("Aún no hay comentarios privados."),
    ).toBeInTheDocument()
  })

  it("PR-1D11: la lista va en orden ascendente, con la firma del autor y la insignia «Administración» si la da el servidor", async () => {
    servidor.paginasDelHilo = [
      [
        comentarioDoble(1),
        comentarioDoble(2, {
          autor: { id: uuid(3), nombre: "Administración", administracion: true },
          propio: false,
        }),
      ],
    ]
    renderDetalle()
    const hilo = await hiloSeccion()
    const lista = await within(hilo).findByRole("list", { name: "Comentarios privados" })
    const elementos = within(lista).getAllByRole("listitem")
    expect(elementos.map((e) => e.textContent)).toEqual([
      expect.stringContaining("Comentario 1"),
      expect.stringContaining("Comentario 2"),
    ])
    expect(within(elementos[0] as HTMLElement).getByText("Ana Ruiz")).toBeInTheDocument()
    expect(within(elementos[1] as HTMLElement).getByText("Administración")).toBeInTheDocument()
  })

  it("PR-1D11: «Ver más comentarios» está en espera también durante una recarga (isFetching)", async () => {
    servidor.paginasDelHilo = [[comentarioDoble(1)], [comentarioDoble(2)]]
    const queryClient = renderDetalle()
    const verMas = await screen.findByRole("button", { name: "Ver más comentarios" })
    const espera = diferido()
    servidor.manejador = ({ metodo, url }) =>
      metodo === "GET" && url.startsWith(`${RUTA_ENTREGA}/comentarios`) ? espera.promesa : undefined
    act(() => {
      void queryClient.invalidateQueries({ queryKey: ["hilo-privado"] })
    })
    await waitFor(() => expect(verMas).toHaveAttribute("aria-busy", "true"))
    const pedidasAntes = llamadas.length
    fireEvent.click(verMas)
    expect(llamadas.length).toBe(pedidasAntes)
    await act(async () => {
      espera.resolver(
        respuestaJson(200, { comentarios: [comentarioDoble(1)], siguienteCursor: uuid(901) }),
      )
      await espera.promesa
    })
  })

  it("PR-1D11: al cargar lo último, el foco va al primer comentario nuevo", async () => {
    servidor.paginasDelHilo = [[comentarioDoble(1)], [comentarioDoble(2)]]
    renderDetalle()
    const verMas = await screen.findByRole("button", { name: "Ver más comentarios" })
    verMas.focus()
    fireEvent.click(verMas)
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Ver más comentarios" })).toBeNull(),
    )
    await waitFor(() =>
      expect(document.querySelector(`[data-comentario-privado="${uuid(102)}"]`)).toHaveFocus(),
    )
  })

  it("PR-1D11: enviar hace una sola petición con doble clic; vacío da el error de campo; al enviar, el campo se vacía y recibe el foco", async () => {
    const espera = diferido()
    servidor.manejador = ({ metodo, url }) =>
      metodo === "POST" && url === `${RUTA_ENTREGA}/comentarios` ? espera.promesa : undefined
    renderDetalle()
    const hilo = await hiloSeccion()
    const enviar = within(hilo).getByRole("button", { name: "Enviar comentario" })
    fireEvent.click(enviar)
    expect(within(hilo).getByText("Escribe tu comentario")).toBeInTheDocument()
    expect(pedidasA("POST", `${RUTA_ENTREGA}/comentarios`)).toHaveLength(0)

    const campo = within(hilo).getByLabelText("Comentario privado")
    fireEvent.change(campo, { target: { value: "¿Puedo entregar en PDF?" } })
    fireEvent.click(enviar)
    fireEvent.click(enviar)
    await waitFor(() => expect(enviar).toHaveAttribute("aria-busy", "true"))
    await act(async () => {
      espera.resolver(respuestaJson(201, { comentario: comentarioDoble(9) }))
      await espera.promesa
    })
    await waitFor(() => expect(campo).toHaveValue(""))
    expect(campo).toHaveFocus()
    expect(pedidasA("POST", `${RUTA_ENTREGA}/comentarios`)).toHaveLength(1)
    expect(pedidasA("POST", `${RUTA_ENTREGA}/comentarios`)[0]?.cuerpo).toEqual({
      texto: "¿Puedo entregar en PDF?",
    })
  })
})

describe("la columna derecha del alumno (PR-1D14)", () => {
  it("PR-1D14: «Detalles», «Tu trabajo» y «Comentarios privados», en ese orden, con el texto de privacidad de P-01", async () => {
    renderDetalle()
    await screen.findByRole("heading", { name: "Comentarios privados" })
    const nombres = screen
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent)
      .filter((t) => t === "Detalles" || t === "Tu trabajo" || t === "Comentarios privados")
    expect(nombres).toEqual(["Detalles", "Tu trabajo", "Comentarios privados"])
    expect(
      screen.getByText("Solo tú, tus maestros y la administración pueden verlos."),
    ).toBeInTheDocument()
  })
})

// ENTREGAS-01d, ronda 1 (T-01 a T-03 y sus hermanos): qué se renueva y qué se anuncia tras cada error
// del servidor al entregar, al anular y al comentar en el hilo. Una sola regla en hooks.ts.
describe("lo que se renueva tras un error de la entrega (ronda 1, T-01 a T-03)", () => {
  const RUTA_TAREA = `/api/clases/${CLASE_ID}/tareas/${TAREA_ID}`
  const claveDelTrabajo = [...clavePrefijoDelTrabajo(CLASE_ID), "sin-tema"]

  const entregarConUnEnlace = async () => {
    await screen.findByLabelText("Enlace")
    agregarEnlace("https://ejemplo.com/a")
    fireEvent.click(screen.getByRole("button", { name: "Entregar tarea" }))
  }

  it("Ronda 1: un 409 ENTREGA_CERRADA al entregar vuelve a pedir la tarea y la entrega (una vez cada una) y marca viejo «Trabajo de clase»; la insignia y «Detalles» dicen la tarea vigente", async () => {
    servidor.manejador = (l) => {
      if (l.metodo !== "POST" || l.url !== RUTA_ENTREGA) return undefined
      servidor.tarea = tareaDoble({ fechaLimite: PASADA, aceptaTardias: false, version: 1 })
      servidor.entrega = entregaAsignada({ puedeEntregar: false })
      return errorApi(
        409,
        "ENTREGA_CERRADA",
        "La fecha límite ya pasó y esta tarea no acepta entregas con retraso.",
      )
    }
    const queryClient = renderDetalle()
    queryClient.setQueryData(claveDelTrabajo, { pages: [] })
    await entregarConUnEnlace()
    await waitFor(() =>
      expect(within(seccionTuTrabajo()).getByText("Sin entregar")).toBeInTheDocument(),
    )
    expect(pedidasA("GET", RUTA_TAREA)).toHaveLength(2)
    expect(pedidasA("GET", RUTA_ENTREGA)).toHaveLength(2)
    expect(queryClient.getQueryState(claveDelTrabajo)?.isInvalidated).toBe(true)
    expect(
      screen.getByText("No se aceptan entregas después de la fecha límite"),
    ).toBeInTheDocument()
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })

  it("Ronda 1: un 409 al anular (ENTREGA_CERRADA y ENTREGA_NO_REALIZADA) vuelve a pedir la tarea y la entrega y marca viejo «Trabajo de clase», con un solo aviso", async () => {
    for (const codigo of ["ENTREGA_CERRADA", "ENTREGA_NO_REALIZADA"]) {
      cleanup()
      llamadas = []
      aviso.error.mockClear()
      servidor.tarea = tareaDoble()
      servidor.entrega = entregaRealizada()
      servidor.manejador = (l) => {
        if (l.metodo !== "POST" || l.url !== `${RUTA_ENTREGA}/anular`) return undefined
        servidor.entrega = entregaAsignada()
        return errorApi(409, codigo, "La entrega cambió.")
      }
      const queryClient = renderDetalle()
      queryClient.setQueryData(claveDelTrabajo, { pages: [] })
      fireEvent.click(await screen.findByRole("button", { name: "Anular entrega" }))
      fireEvent.click(screen.getByRole("button", { name: "Sí, anular entrega" }))
      await screen.findByRole("button", { name: "Entregar tarea" })
      await waitFor(() => expect(pedidasA("GET", RUTA_TAREA)).toHaveLength(2))
      expect(pedidasA("GET", RUTA_ENTREGA)).toHaveLength(2)
      expect(queryClient.getQueryState(claveDelTrabajo)?.isInvalidated).toBe(true)
      expect(aviso.error).toHaveBeenCalledTimes(1)
    }
  })

  it.each([
    [
      "400 ENTREGA_VACIA",
      () => errorApi(400, "ENTREGA_VACIA", "Agrega al menos un archivo o un enlace para entregar."),
    ],
    [
      "400 VALIDACION de enlaces.0",
      () =>
        errorApi(
          400,
          "VALIDACION",
          "enlaces.0: Escribe un enlace que empiece con https:// o http://.",
        ),
    ],
    [
      "400 VALIDACION de archivoIds",
      () => errorApi(400, "VALIDACION", "archivoIds: Puedes adjuntar hasta 5 archivos"),
    ],
    [
      "400 ARCHIVO_INVALIDO",
      () =>
        errorApi(
          400,
          "ARCHIVO_INVALIDO",
          "Uno de los archivos no coincide con lo que elegiste. Vuelve a adjuntarlo.",
        ),
    ],
    ["503 ALMACEN_NO_CONFIGURADO", () => errorApi(503, "ALMACEN_NO_CONFIGURADO", "x")],
    ["500", () => errorApi(500, "ERROR_INTERNO", "x")],
  ])(
    "Ronda 1: %s al entregar no renueva nada: ni la tarea, ni la entrega, ni «Trabajo de clase»",
    async (_nombre, respuesta) => {
      servidor.manejador = (l) =>
        l.metodo === "POST" && l.url === RUTA_ENTREGA ? respuesta() : undefined
      const queryClient = renderDetalle()
      queryClient.setQueryData(claveDelTrabajo, { pages: [] })
      await entregarConUnEnlace()
      const boton = screen.getByRole("button", { name: "Entregar tarea" })
      await waitFor(() => expect(boton).not.toHaveAttribute("aria-busy", "true"))
      expect(pedidasA("POST", RUTA_ENTREGA)).toHaveLength(1)
      expect(pedidasA("GET", RUTA_TAREA)).toHaveLength(1)
      expect(pedidasA("GET", RUTA_ENTREGA)).toHaveLength(1)
      expect(queryClient.getQueryState(claveDelTrabajo)?.isInvalidated).toBe(false)
    },
  )

  it("Ronda 1: un 404 TAREA_NO_ENCONTRADA al entregar avisa una vez y renueva la tarea: el detalle dice «Esa tarea ya no existe.» y el foco no queda en <body>", async () => {
    servidor.manejador = (l) => {
      if (l.metodo === "GET" && l.url === RUTA_TAREA && pedidasA("POST", RUTA_ENTREGA).length > 0) {
        return errorApi(404, "TAREA_NO_ENCONTRADA", "Esa tarea ya no existe.")
      }
      if (l.metodo === "POST" && l.url === RUTA_ENTREGA) {
        return errorApi(404, "TAREA_NO_ENCONTRADA", "Esa tarea ya no existe.")
      }
      return undefined
    }
    const queryClient = renderDetalle()
    queryClient.setQueryData(claveDelTrabajo, { pages: [] })
    await screen.findByLabelText("Enlace")
    agregarEnlace("https://ejemplo.com/a")
    const boton = screen.getByRole("button", { name: "Entregar tarea" })
    boton.focus()
    fireEvent.click(boton)
    expect(await screen.findByText("Esa tarea ya no existe.")).toBeInTheDocument()
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryState(claveDelTrabajo)?.isInvalidated).toBe(true)
    await waitFor(() => expect(document.activeElement).not.toBe(document.body))
  })

  it("Ronda 1: un 404 TAREA_NO_ENCONTRADA al comentar en el hilo avisa una vez y renueva la tarea (el detalle dice «Esa tarea ya no existe.»); un VALIDACION del texto se marca bajo el campo, sin aviso ni renovación", async () => {
    let respuesta = errorApi(400, "VALIDACION", "texto: Escribe tu comentario")
    servidor.manejador = (l) => {
      if (l.metodo === "POST" && l.url === `${RUTA_ENTREGA}/comentarios`) return respuesta
      if (l.metodo === "GET" && l.url === RUTA_TAREA && respuesta.status === 404) {
        return errorApi(404, "TAREA_NO_ENCONTRADA", "Esa tarea ya no existe.")
      }
      return undefined
    }
    renderDetalle()
    const campo = await screen.findByLabelText("Comentario privado")
    fireEvent.change(campo, { target: { value: "Hola" } })
    fireEvent.click(screen.getByRole("button", { name: "Enviar comentario" }))
    expect(await screen.findByText("Escribe tu comentario")).toBeInTheDocument()
    expect(aviso.error).not.toHaveBeenCalled()
    expect(pedidasA("GET", RUTA_TAREA)).toHaveLength(1)

    respuesta = errorApi(404, "TAREA_NO_ENCONTRADA", "Esa tarea ya no existe.")
    fireEvent.click(screen.getByRole("button", { name: "Enviar comentario" }))
    expect(await screen.findByText("Esa tarea ya no existe.")).toBeInTheDocument()
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })

  it("Ronda 1 (T-03): el error de enlaces del servidor describe el campo «Enlace» y lo marca inválido; al cambiar los enlaces se quita", async () => {
    const mensaje = "Escribe un enlace que empiece con https:// o http://."
    servidor.manejador = (l) =>
      l.metodo === "POST" && l.url === RUTA_ENTREGA
        ? errorApi(400, "VALIDACION", `enlaces.0: ${mensaje}`)
        : undefined
    renderDetalle()
    await entregarConUnEnlace()
    const error = await screen.findByText(mensaje)
    const campo = screen.getByLabelText("Enlace")
    const idDelError = error.closest("p")?.id ?? ""
    expect(idDelError).not.toBe("")
    expect(campo.getAttribute("aria-describedby")?.split(" ")).toContain(idDelError)
    expect(campo).toHaveAttribute("aria-invalid", "true")
    expect(aviso.error).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: /^Quitar https/ }))
    await waitFor(() => expect(screen.queryByText(mensaje)).toBeNull())
    expect(screen.getByLabelText("Enlace")).toHaveAttribute("aria-invalid", "false")
  })
})

// ENTREGAS-01d, ronda 2 (T-04 y T-05 y sus hermanos): un solo mensaje por campo (el error del servidor se
// descarta en cuanto el campo cambia) y un solo aviso por error aunque haya varias peticiones en vuelo o
// el hilo ya se haya desmontado.
describe("un mensaje por campo y un aviso por error (ronda 2, T-04 y T-05)", () => {
  const RUTA_TAREA = `/api/clases/${CLASE_ID}/tareas/${TAREA_ID}`
  const RUTA_HILO = `${RUTA_ENTREGA}/comentarios`
  const NO_EXISTE = "Esa tarea ya no existe."
  const reposar = async () => {
    await act(async () => {
      for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0))
    })
  }
  const esPaginaSiguiente = (l: Llamada) =>
    l.metodo === "GET" && l.url.startsWith(`${RUTA_HILO}?`) && l.url.includes("cursor=")
  const paginasSiguientesPedidas = () => llamadas.filter(esPaginaSiguiente)

  it("Ronda 2 (T-04): con el error de enlaces del servidor puesto, escribir en «Enlace» lo descarta: el campo deja de estar inválido y su descripción ya no lo nombra", async () => {
    const mensaje = "Escribe un enlace que empiece con https:// o http://."
    servidor.manejador = (l) =>
      l.metodo === "POST" && l.url === RUTA_ENTREGA
        ? errorApi(400, "VALIDACION", `enlaces.0: ${mensaje}`)
        : undefined
    renderDetalle()
    await screen.findByLabelText("Enlace")
    agregarEnlace("https://ejemplo.com/a")
    fireEvent.click(screen.getByRole("button", { name: "Entregar tarea" }))
    const error = await screen.findByText(mensaje)
    const idDelError = error.closest("p")?.id ?? ""
    expect(idDelError).not.toBe("")
    fireEvent.change(screen.getByLabelText("Enlace"), { target: { value: "h" } })
    await waitFor(() => expect(screen.queryByText(mensaje)).toBeNull())
    const campo = screen.getByLabelText("Enlace")
    expect(campo).toHaveAttribute("aria-invalid", "false")
    expect(campo.getAttribute("aria-describedby")?.split(" ")).not.toContain(idDelError)
    expect(screen.getByRole("button", { name: "Quitar https://ejemplo.com/a" })).toBeInTheDocument()
  })

  it("Ronda 2 (T-04): si el error local y el del servidor dicen lo mismo, el texto aparece una sola vez y la descripción del campo no repite ids", async () => {
    const resultado = enlaceDeEntregaSchema.safeParse("javascript:alert(1)")
    if (resultado.success) throw new Error("Precondición: el esquema rechaza javascript:")
    const mensaje = resultado.error.issues[0]?.message ?? ""
    expect(mensaje).not.toBe("")
    servidor.manejador = (l) =>
      l.metodo === "POST" && l.url === RUTA_ENTREGA
        ? errorApi(400, "VALIDACION", `enlaces.0: ${mensaje}`)
        : undefined
    renderDetalle()
    await screen.findByLabelText("Enlace")
    agregarEnlace("https://ejemplo.com/a")
    agregarEnlace("javascript:alert(1)")
    expect(screen.getAllByText(mensaje)).toHaveLength(1)
    const boton = screen.getByRole("button", { name: "Entregar tarea" })
    fireEvent.click(boton)
    await waitFor(() => expect(pedidasA("POST", RUTA_ENTREGA)).toHaveLength(1))
    await waitFor(() => expect(boton).not.toHaveAttribute("aria-busy", "true"))
    await reposar()
    expect(screen.getAllByText(mensaje)).toHaveLength(1)
    const campo = screen.getByLabelText("Enlace")
    const ids = (campo.getAttribute("aria-describedby") ?? "").split(" ").filter((id) => id !== "")
    expect(new Set(ids).size).toBe(ids.length)
    expect(campo).toHaveAttribute("aria-invalid", "true")
  })

  it("Ronda 2 (T-04, hermano): el error del texto que da el servidor al comentar se descarta al escribir; queda un solo mensaje bajo el campo", async () => {
    const mensaje = "El comentario no puede pasar de 1000 caracteres"
    servidor.manejador = (l) =>
      l.metodo === "POST" && l.url === RUTA_HILO
        ? errorApi(400, "VALIDACION", `texto: ${mensaje}`)
        : undefined
    renderDetalle()
    const campo = await screen.findByLabelText("Comentario privado")
    fireEvent.change(campo, { target: { value: "Hola" } })
    fireEvent.click(screen.getByRole("button", { name: "Enviar comentario" }))
    expect(await screen.findByText(mensaje)).toBeInTheDocument()
    expect(screen.getAllByText(mensaje)).toHaveLength(1)
    expect(campo).toHaveAttribute("aria-invalid", "true")
    fireEvent.change(campo, { target: { value: "Hola de nuevo" } })
    await waitFor(() => expect(screen.queryByText(mensaje)).toBeNull())
    expect(campo).toHaveAttribute("aria-invalid", "false")
    expect(campo).not.toHaveAttribute("aria-describedby")
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("Ronda 2 (T-05): «Ver más comentarios» con un 404 TAREA_NO_ENCONTRADA no avisa: la tarea se renueva y el detalle dice «Esa tarea ya no existe.»", async () => {
    servidor.paginasDelHilo = [[comentarioDoble(1)], [comentarioDoble(2)]]
    servidor.manejador = (l) => {
      if (esPaginaSiguiente(l)) return errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE)
      if (l.metodo === "GET" && l.url === RUTA_TAREA && paginasSiguientesPedidas().length > 0) {
        return errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE)
      }
      return undefined
    }
    renderDetalle()
    fireEvent.click(await screen.findByRole("button", { name: "Ver más comentarios" }))
    expect(await screen.findByText(NO_EXISTE)).toBeInTheDocument()
    await reposar()
    expect(pedidasA("GET", RUTA_TAREA)).toHaveLength(2)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("Ronda 2 (T-05): «Ver más comentarios» con un 503 y el hilo montado avisa una vez y no renueva la tarea", async () => {
    servidor.paginasDelHilo = [[comentarioDoble(1)], [comentarioDoble(2)]]
    servidor.manejador = (l) =>
      esPaginaSiguiente(l)
        ? errorApi(503, "SERVICIO_OCUPADO", "El servicio está ocupado.")
        : undefined
    renderDetalle()
    fireEvent.click(await screen.findByRole("button", { name: "Ver más comentarios" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(pedidasA("GET", RUTA_TAREA)).toHaveLength(1)
    expect(screen.getByRole("button", { name: "Ver más comentarios" })).toBeInTheDocument()
  })

  it("Ronda 2 (T-05): «Ver más comentarios» que responde un 503 después de que el hilo se desmontó no avisa", async () => {
    servidor.paginasDelHilo = [[comentarioDoble(1)], [comentarioDoble(2)]]
    const pagina = diferido()
    servidor.manejador = (l) => (esPaginaSiguiente(l) ? pagina.promesa : undefined)
    renderDetalle()
    fireEvent.click(await screen.findByRole("button", { name: "Ver más comentarios" }))
    await waitFor(() => expect(paginasSiguientesPedidas()).toHaveLength(1))
    cleanup()
    pagina.resolver(errorApi(503, "SERVICIO_OCUPADO", "El servicio está ocupado."))
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("Ronda 2 (T-05): «Ver más comentarios» con un 403 ACCESO_RESTRINGIDO: apiClient redirige y no hay aviso", async () => {
    servidor.paginasDelHilo = [[comentarioDoble(1)], [comentarioDoble(2)]]
    servidor.manejador = (l) =>
      esPaginaSiguiente(l)
        ? errorApi(403, "ACCESO_RESTRINGIDO", "Tu acceso está restringido.")
        : undefined
    renderDetalle()
    fireEvent.click(await screen.findByRole("button", { name: "Ver más comentarios" }))
    await waitFor(() => expect(asignar).toHaveBeenCalledWith("/acceso-restringido"))
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("Ronda 2 (T-05, hermano): entregar y comentar a la vez con el mismo 404 dan un solo aviso y el detalle dice «Esa tarea ya no existe.»", async () => {
    const entrega = diferido()
    const comentario = diferido()
    servidor.manejador = (l) => {
      if (l.metodo === "POST" && l.url === RUTA_ENTREGA) return entrega.promesa
      if (l.metodo === "POST" && l.url === RUTA_HILO) return comentario.promesa
      if (l.metodo === "GET" && l.url === RUTA_TAREA && pedidasA("POST", RUTA_HILO).length > 0) {
        return errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE)
      }
      return undefined
    }
    renderDetalle()
    await screen.findByLabelText("Enlace")
    agregarEnlace("https://ejemplo.com/a")
    fireEvent.click(screen.getByRole("button", { name: "Entregar tarea" }))
    fireEvent.change(screen.getByLabelText("Comentario privado"), { target: { value: "Hola" } })
    fireEvent.click(screen.getByRole("button", { name: "Enviar comentario" }))
    await waitFor(() => expect(pedidasA("POST", RUTA_HILO)).toHaveLength(1))
    expect(pedidasA("POST", RUTA_ENTREGA)).toHaveLength(1)
    comentario.resolver(errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE))
    entrega.resolver(errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE))
    expect(await screen.findByText(NO_EXISTE)).toBeInTheDocument()
    await reposar()
    expect(aviso.error.mock.calls).toEqual([[NO_EXISTE]])
  })

  it("Ronda 2 (T-05, hermano): anular con «Ver más comentarios» en vuelo, los dos con 404, da un solo aviso", async () => {
    servidor.entrega = entregaRealizada()
    servidor.paginasDelHilo = [[comentarioDoble(1)], [comentarioDoble(2)]]
    const pagina = diferido()
    servidor.manejador = (l) => {
      if (esPaginaSiguiente(l)) return pagina.promesa
      if (l.metodo === "POST" && l.url === `${RUTA_ENTREGA}/anular`) {
        return errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE)
      }
      if (
        l.metodo === "GET" &&
        l.url === RUTA_TAREA &&
        pedidasA("POST", `${RUTA_ENTREGA}/anular`).length > 0
      ) {
        return errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE)
      }
      return undefined
    }
    renderDetalle()
    fireEvent.click(await screen.findByRole("button", { name: "Ver más comentarios" }))
    await waitFor(() => expect(paginasSiguientesPedidas()).toHaveLength(1))
    fireEvent.click(screen.getByRole("button", { name: "Anular entrega" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, anular entrega" }))
    expect(await screen.findByText(NO_EXISTE)).toBeInTheDocument()
    pagina.resolver(errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE))
    await reposar()
    expect(aviso.error.mock.calls).toEqual([[NO_EXISTE]])
  })

  it("Ronda 2 (T-05, hermano): «Ver más comentarios» con un 503 mientras un 409 al entregar renueva la entrega: un aviso por cada error", async () => {
    servidor.paginasDelHilo = [[comentarioDoble(1)], [comentarioDoble(2)]]
    const pagina = diferido()
    servidor.manejador = (l) => {
      if (esPaginaSiguiente(l)) return pagina.promesa
      if (l.metodo === "POST" && l.url === RUTA_ENTREGA) {
        return errorApi(409, "ENTREGA_YA_REALIZADA", "Ya entregaste esta tarea.")
      }
      return undefined
    }
    renderDetalle()
    fireEvent.click(await screen.findByRole("button", { name: "Ver más comentarios" }))
    await waitFor(() => expect(paginasSiguientesPedidas()).toHaveLength(1))
    await screen.findByLabelText("Enlace")
    agregarEnlace("https://ejemplo.com/a")
    fireEvent.click(screen.getByRole("button", { name: "Entregar tarea" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    pagina.resolver(errorApi(503, "SERVICIO_OCUPADO", "El servicio está ocupado."))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2))
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(2)
    expect(screen.getByRole("heading", { name: "Comentarios privados" })).toBeInTheDocument()
  })
})
