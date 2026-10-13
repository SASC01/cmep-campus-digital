import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { enlaceDeEntregaSchema } from "@campus/shared"

import { TEXTOS_DE_LA_CLASE } from "@/components/clase/data"
import { clavePrefijoDelTrabajo, claveTarea } from "@/services/trabajoService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { DetalleTareaView } from "./detalle-tarea-view"

// Ataque ENTREGAS-01d, ronda 2 (tester): el remedio de T-01 a T-03 y sus vecinos. Qué renueva, qué
// anuncia (uno solo) y adónde va el foco ante cada código de §D-7 al entregar, anular y comentar; un 409
// con recargas ya en vuelo (T-r2-1); la confirmación de anular abierta (T-r2-2); errores de enlaces del
// cliente y del servidor a la vez (T-r2-3); comentar sin acceso (T-r2-4); un 409 tras otro; un 409 con
// la vista ya desmontada; TAREA_NO_ENCONTRADA con el hilo a media carga. Reloj fijo; servidor en memoria.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
const PASADA = "2030-01-05T16:00:00.000Z"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const ORIGEN_ALMACEN = "https://almacen.ejemplo.mx"
const RUTA_TAREA = `/api/clases/${CLASE_ID}/tareas/${TAREA_ID}`
const RUTA_ENTREGA = `${RUTA_TAREA}/entrega`
const RUTA_HILO = `${RUTA_ENTREGA}/comentarios`
const RUTA_REFRESCO = "/api/auth/refrescar"
const FRASE_CERRADA = "La fecha límite ya pasó y esta tarea no acepta entregas con retraso."
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

// C-5 de CALIFICACIONES-01a (§D-R0, A-5): MiEntrega suma calificacion (obligatoria, puede ser null).
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
  adjuntos: [],
  puedeEntregar: false,
  puedeAnular: true,
  calificacion: null,
  ...extra,
})

const comentarioDoble = (n: number, texto = `Comentario ${String(n)}`) => ({
  id: uuid(100 + n),
  texto,
  autor: { id: uuid(2), nombre: "Ana Ruiz", administracion: false },
  creadoEn: new Date(Date.UTC(2030, 0, 1, 8, n)).toISOString(),
  propio: true,
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
  hilo: ReturnType<typeof comentarioDoble>[]
  manejador: Manejador
}

let servidor: Servidor
let llamadas: Llamada[] = []
const asignar = vi.fn()

const paginaDelHilo = (url: string) => {
  const parametros = new URL(url, "http://local").searchParams
  const limite = Number(parametros.get("limite") ?? "20")
  const cursor = parametros.get("cursor")
  const desde = cursor === null ? 0 : servidor.hilo.findIndex((c) => c.id === cursor) + 1
  const comentarios = servidor.hilo.slice(desde, desde + limite)
  const ultimo = comentarios.at(-1)
  const quedan = desde + limite < servidor.hilo.length
  return { comentarios, siguienteCursor: quedan && ultimo !== undefined ? ultimo.id : null }
}

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
      if (url.startsWith(ORIGEN_ALMACEN)) {
        return Promise.resolve(new Response(null, { status: 200 }))
      }
      if (metodo === "POST" && url === RUTA_REFRESCO) {
        return Promise.resolve(respuestaJson(200, { tokenAcceso: "token-renovado" }))
      }
      if (metodo === "GET" && url === RUTA_TAREA) {
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
        servidor.entrega = entregaRealizada({ fechaEntrega: new Date().toISOString() })
        return Promise.resolve(respuestaJson(200, { entrega: servidor.entrega }))
      }
      if (metodo === "POST" && url === `${RUTA_ENTREGA}/anular`) {
        servidor.entrega = entregaAsignada()
        return Promise.resolve(respuestaJson(200, { entrega: servidor.entrega }))
      }
      if (metodo === "GET" && url.startsWith(`${RUTA_HILO}?`)) {
        return Promise.resolve(respuestaJson(200, paginaDelHilo(url)))
      }
      if (metodo === "POST" && url === RUTA_HILO) {
        const texto = (cuerpo as { texto: string }).texto
        const nuevo = comentarioDoble(servidor.hilo.length + 1, texto)
        servidor.hilo = [...servidor.hilo, nuevo]
        return Promise.resolve(respuestaJson(201, { comentario: nuevo }))
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

const seccionTuTrabajo = () => {
  const seccion = screen.getByRole("heading", { name: "Tu trabajo" }).closest("section")
  if (seccion === null) throw new Error("Precondición: «Tu trabajo» es una sección")
  return seccion
}
const pedidasA = (metodo: string, url: string) =>
  llamadas.filter((l) => l.metodo === metodo && l.url === url)
const paginasDelHiloPedidas = (conCursor: boolean) =>
  llamadas.filter(
    (l) =>
      l.metodo === "GET" &&
      l.url.startsWith(`${RUTA_HILO}?`) &&
      l.url.includes("cursor=") === conCursor,
  )

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

// Con Date congelado, una recarga deja el mismo dataUpdatedAt y la clave del foco no cambia (artefacto
// de las pruebas, arbitrado en T-r1-5 de 01a): se adelanta el reloj antes de cada acción que recarga.
const avanzarReloj = () => vi.setSystemTime(new Date(Date.now() + 5000))

const reposar = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 30))
  })
}

const focoFueraDeBody = () => {
  expect(document.activeElement).not.toBeNull()
  expect(document.activeElement).not.toBe(document.body)
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  llamadas = []
  servidor = {
    tarea: tareaDoble(),
    entrega: entregaAsignada(),
    hilo: [],
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

const MENSAJES: Record<string, string> = {
  ENTREGA_YA_REALIZADA: "Ya entregaste esta tarea. Si quieres cambiarla, anula tu entrega primero.",
  ENTREGA_NO_REALIZADA: "No tienes una entrega que anular.",
  ENTREGA_CALIFICADA: "Tu entrega ya está calificada y no se puede cambiar.",
  ENTREGA_CERRADA: FRASE_CERRADA,
}
const NO_EXISTE = "Esa tarea ya no existe."
const SIN_ACCESO = TEXTOS_DE_LA_CLASE.sinAcceso

// Las peticiones hechas desde el índice `desde` de `llamadas` (las que siguen a una acción).
const despuesDe = (desde: number, metodo: string, url: string) =>
  llamadas.slice(desde).filter((l) => l.metodo === metodo && l.url === url)

describe("ataque ENTREGAS-01d r2: un 409 con recargas ya en vuelo (T-r2-1, N-01)", () => {
  it("409 ENTREGA_YA_REALIZADA con la tarea y la entrega recargándose: una sola petición nueva por clave, un aviso, la recarga vieja se descarta y la vista dice la entrega vigente", async () => {
    const tareaVieja = diferido()
    const entregaVieja = diferido()
    let enVuelo = false
    servidor.manejador = (l) => {
      if (enVuelo && l.metodo === "GET" && l.url === RUTA_TAREA) return tareaVieja.promesa
      if (enVuelo && l.metodo === "GET" && l.url === RUTA_ENTREGA) return entregaVieja.promesa
      if (l.metodo !== "POST" || l.url !== RUTA_ENTREGA) return undefined
      enVuelo = false
      servidor.entrega = entregaRealizada()
      return errorApi(409, "ENTREGA_YA_REALIZADA", MENSAJES.ENTREGA_YA_REALIZADA ?? "")
    }
    const queryClient = renderDetalle()
    await screen.findByLabelText("Enlace")
    agregarEnlace("https://ejemplo.com/a")
    enVuelo = true
    avanzarReloj()
    act(() => {
      void queryClient.invalidateQueries({ queryKey: claveTarea(CLASE_ID, TAREA_ID) })
    })
    await waitFor(() => {
      expect(llamadas.filter((l) => l.metodo === "GET" && l.url === RUTA_ENTREGA)).toHaveLength(2)
    })
    const desde = llamadas.length
    avanzarReloj()
    fireEvent.click(screen.getByRole("button", { name: "Entregar tarea" }))
    await within(seccionTuTrabajo()).findByText(/Entregaste el/)
    tareaVieja.resolver(respuestaJson(200, tareaDoble({ titulo: "Título viejo" })))
    entregaVieja.resolver(respuestaJson(200, { entrega: entregaAsignada() }))
    await reposar()
    expect(despuesDe(desde, "GET", RUTA_TAREA)).toHaveLength(1)
    expect(despuesDe(desde, "GET", RUTA_ENTREGA)).toHaveLength(1)
    expect(despuesDe(desde, "POST", RUTA_ENTREGA)).toHaveLength(1)
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(screen.queryByText("Título viejo")).toBeNull()
    expect(within(seccionTuTrabajo()).getByText("Entregado")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Entregar tarea" })).toBeNull()
  })
})

describe("ataque ENTREGAS-01d r2: cada código al entregar (qué renueva, qué anuncia, foco)", () => {
  it.each([
    {
      codigo: "ENTREGA_YA_REALIZADA",
      estado: 409,
      despues: () => {
        servidor.entrega = entregaRealizada()
      },
      renueva: true,
      toasts: 1,
      visible: /Entregaste el/,
    },
    {
      codigo: "ENTREGA_CALIFICADA",
      estado: 409,
      despues: () => {
        servidor.entrega = entregaRealizada({ estado: "calificado", puedeAnular: false })
      },
      renueva: true,
      toasts: 1,
      visible: "Tu entrega ya está calificada.",
    },
    {
      codigo: "ENTREGA_CERRADA",
      estado: 409,
      despues: () => {
        servidor.tarea = tareaDoble({ fechaLimite: PASADA, aceptaTardias: false, version: 1 })
        servidor.entrega = entregaAsignada({ puedeEntregar: false })
      },
      renueva: true,
      toasts: 1,
      visible: FRASE_CERRADA,
    },
    {
      codigo: "SERVICIO_OCUPADO",
      estado: 503,
      despues: () => undefined,
      renueva: false,
      toasts: 1,
      visible: null,
    },
    {
      codigo: "ARCHIVO_NO_ENCONTRADO",
      estado: 404,
      despues: () => undefined,
      renueva: false,
      toasts: 1,
      visible: null,
    },
  ])(
    "$estado $codigo: renueva tarea y entrega una vez ($renueva), $toasts aviso, foco fuera de <body>",
    async ({ codigo, estado, despues, renueva, toasts, visible }) => {
      servidor.manejador = (l) => {
        if (l.metodo !== "POST" || l.url !== RUTA_ENTREGA) return undefined
        despues()
        return errorApi(estado, codigo, MENSAJES[codigo] ?? "El servicio está ocupado.")
      }
      renderDetalle()
      await screen.findByLabelText("Enlace")
      agregarEnlace("https://ejemplo.com/a")
      const boton = screen.getByRole("button", { name: "Entregar tarea" })
      boton.focus()
      const desde = llamadas.length
      avanzarReloj()
      fireEvent.click(boton)
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(toasts))
      if (visible !== null) await within(seccionTuTrabajo()).findByText(visible)
      await reposar()
      expect(aviso.error).toHaveBeenCalledTimes(toasts)
      expect(despuesDe(desde, "GET", RUTA_TAREA)).toHaveLength(renueva ? 1 : 0)
      expect(despuesDe(desde, "GET", RUTA_ENTREGA)).toHaveLength(renueva ? 1 : 0)
      if (renueva) expect(within(seccionTuTrabajo()).queryByText("Asignado")).toBeNull()
      focoFueraDeBody()
    },
  )

  it.each([
    { codigo: "TAREA_NO_ENCONTRADA", estado: 404, texto: NO_EXISTE },
    { codigo: "SIN_ACCESO_A_LA_CLASE", estado: 403, texto: SIN_ACCESO },
  ])(
    "$estado $codigo: un aviso, la tarea se pide una vez, la vista pasa a «$texto» y el foco va a la raíz",
    async ({ codigo, estado, texto }) => {
      servidor.manejador = (l) => {
        if (l.metodo === "GET" && l.url === RUTA_TAREA && llamadas.some((x) => x.metodo === "POST"))
          return errorApi(estado, codigo, texto)
        if (l.metodo === "POST" && l.url === RUTA_ENTREGA) return errorApi(estado, codigo, texto)
        return undefined
      }
      renderDetalle()
      await screen.findByLabelText("Enlace")
      agregarEnlace("https://ejemplo.com/a")
      const boton = screen.getByRole("button", { name: "Entregar tarea" })
      boton.focus()
      const desde = llamadas.length
      avanzarReloj()
      fireEvent.click(boton)
      await waitFor(() => expect(screen.queryByRole("heading", { name: "Tu trabajo" })).toBeNull())
      await reposar()
      expect(screen.getAllByText(texto).length).toBeGreaterThanOrEqual(1)
      expect(aviso.error).toHaveBeenCalledTimes(1)
      expect(despuesDe(desde, "GET", RUTA_TAREA)).toHaveLength(1)
      expect(asignar).not.toHaveBeenCalled()
      focoFueraDeBody()
    },
  )

  it("ENTREGA_VACIA y VALIDACION de enlaces no renuevan nada ni avisan con toast", async () => {
    servidor.manejador = (l) =>
      l.metodo === "POST" && l.url === RUTA_ENTREGA
        ? errorApi(400, "VALIDACION", "enlaces.0: Escribe un enlace válido.")
        : undefined
    renderDetalle()
    await screen.findByLabelText("Enlace")
    agregarEnlace("https://ejemplo.com/a")
    const desde = llamadas.length
    fireEvent.click(screen.getByRole("button", { name: "Entregar tarea" }))
    await screen.findByText("Escribe un enlace válido.")
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
    expect(despuesDe(desde, "GET", RUTA_TAREA)).toEqual([])
    expect(despuesDe(desde, "GET", RUTA_ENTREGA)).toEqual([])
  })
})

describe("ataque ENTREGAS-01d r2: cada código al anular (T-r2-2)", () => {
  it.each([
    {
      codigo: "ENTREGA_CALIFICADA",
      despues: () => entregaRealizada({ estado: "calificado", puedeAnular: false }),
      visible: "Tu entrega ya está calificada.",
    },
    {
      codigo: "ENTREGA_NO_REALIZADA",
      despues: () => entregaAsignada(),
      visible: null,
    },
    {
      codigo: "ENTREGA_CERRADA",
      despues: () => entregaRealizada({ puedeAnular: false }),
      visible: FRASE_CERRADA,
    },
  ])(
    "409 $codigo con la confirmación abierta y el foco en «Sí, anular entrega»: se cierra, un aviso, tarea y entrega una vez, foco en «Tu trabajo»",
    async ({ codigo, despues, visible }) => {
      servidor.entrega = entregaRealizada()
      servidor.manejador = (l) => {
        if (l.metodo !== "POST" || l.url !== `${RUTA_ENTREGA}/anular`) return undefined
        servidor.entrega = despues()
        if (codigo === "ENTREGA_CERRADA") {
          servidor.tarea = tareaDoble({ fechaLimite: PASADA, aceptaTardias: false, version: 1 })
        }
        return errorApi(409, codigo, MENSAJES[codigo] ?? "")
      }
      renderDetalle()
      fireEvent.click(await screen.findByRole("button", { name: "Anular entrega" }))
      const si = screen.getByRole("button", { name: "Sí, anular entrega" })
      si.focus()
      const desde = llamadas.length
      avanzarReloj()
      fireEvent.click(si)
      await waitFor(() =>
        expect(screen.queryByRole("button", { name: "Sí, anular entrega" })).toBeNull(),
      )
      if (visible !== null) await within(seccionTuTrabajo()).findByText(visible)
      await reposar()
      expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull()
      expect(screen.queryByText(/Se quitarán tus archivos y enlaces/)).toBeNull()
      expect(aviso.error).toHaveBeenCalledTimes(1)
      expect(despuesDe(desde, "GET", RUTA_TAREA)).toHaveLength(1)
      expect(despuesDe(desde, "GET", RUTA_ENTREGA)).toHaveLength(1)
      focoFueraDeBody()
      expect(seccionTuTrabajo().contains(document.activeElement)).toBe(true)
    },
  )
})

describe("ataque ENTREGAS-01d r2: un 409 tras otro y un 409 con la vista desmontada", () => {
  it("dos 409 ENTREGA_CERRADA seguidos con el servidor aún ofreciendo entregar: un aviso por clic, una recarga por clave por 409, el botón sigue y el foco nunca en <body>", async () => {
    servidor.manejador = (l) =>
      l.metodo === "POST" && l.url === RUTA_ENTREGA
        ? errorApi(409, "ENTREGA_CERRADA", FRASE_CERRADA)
        : undefined
    renderDetalle()
    await screen.findByLabelText("Enlace")
    agregarEnlace("https://ejemplo.com/a")
    for (const vez of [1, 2]) {
      const boton = screen.getByRole("button", { name: "Entregar tarea" })
      boton.focus()
      const desde = llamadas.length
      avanzarReloj()
      fireEvent.click(boton)
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(vez))
      await waitFor(() => expect(despuesDe(desde, "GET", RUTA_ENTREGA)).toHaveLength(1))
      await reposar()
      expect(despuesDe(desde, "GET", RUTA_TAREA)).toHaveLength(1)
      expect(despuesDe(desde, "GET", RUTA_ENTREGA)).toHaveLength(1)
      focoFueraDeBody()
    }
    expect(pedidasA("POST", RUTA_ENTREGA)).toHaveLength(2)
  })

  it("un 409 que llega con la vista ya desmontada: un solo aviso, ninguna petición más y nada en la consola", async () => {
    const respuesta = diferido()
    servidor.manejador = (l) =>
      l.metodo === "POST" && l.url === RUTA_ENTREGA ? respuesta.promesa : undefined
    const consola = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const aviso2 = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    try {
      const queryClient = renderDetalle()
      queryClient.setQueryData([...clavePrefijoDelTrabajo(CLASE_ID), "sin-tema"], { pages: [] })
      await screen.findByLabelText("Enlace")
      agregarEnlace("https://ejemplo.com/a")
      fireEvent.click(screen.getByRole("button", { name: "Entregar tarea" }))
      await waitFor(() => expect(pedidasA("POST", RUTA_ENTREGA)).toHaveLength(1))
      cleanup()
      const desde = llamadas.length
      servidor.entrega = entregaRealizada()
      respuesta.resolver(errorApi(409, "ENTREGA_YA_REALIZADA", MENSAJES.ENTREGA_YA_REALIZADA ?? ""))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
      await reposar()
      expect(aviso.error).toHaveBeenCalledWith(MENSAJES.ENTREGA_YA_REALIZADA)
      expect(llamadas.slice(desde)).toEqual([])
      expect(
        queryClient.getQueryState([...clavePrefijoDelTrabajo(CLASE_ID), "sin-tema"])?.isInvalidated,
      ).toBe(true)
      expect(consola).not.toHaveBeenCalled()
      expect(aviso2).not.toHaveBeenCalled()
    } finally {
      consola.mockRestore()
      aviso2.mockRestore()
    }
  })
})

describe("ataque ENTREGAS-01d r2: errores de enlaces del cliente y del servidor a la vez (T-r2-3)", () => {
  it("con el error del servidor puesto, un enlace inválido escrito a mano: el mismo texto no aparece dos veces y aria-describedby no repite ids", async () => {
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
    fireEvent.click(screen.getByRole("button", { name: "Entregar tarea" }))
    await screen.findByText(mensaje)
    await reposar()
    agregarEnlace("javascript:alert(1)")
    await reposar()
    const campo = screen.getByLabelText("Enlace")
    const ids = (campo.getAttribute("aria-describedby") ?? "").split(" ").filter((id) => id !== "")
    expect(new Set(ids).size).toBe(ids.length)
    expect(campo).toHaveAttribute("aria-invalid", "true")
    expect(screen.getAllByText(mensaje)).toHaveLength(1)
  })

  it("quitar el enlace que rechazó el servidor borra su error y el campo deja de estar inválido", async () => {
    servidor.manejador = (l) =>
      l.metodo === "POST" && l.url === RUTA_ENTREGA
        ? errorApi(400, "VALIDACION", "enlaces.0: Escribe un enlace válido.")
        : undefined
    renderDetalle()
    await screen.findByLabelText("Enlace")
    agregarEnlace("https://ejemplo.com/a")
    fireEvent.click(screen.getByRole("button", { name: "Entregar tarea" }))
    await screen.findByText("Escribe un enlace válido.")
    fireEvent.click(screen.getByRole("button", { name: "Quitar https://ejemplo.com/a" }))
    await waitFor(() => expect(screen.queryByText("Escribe un enlace válido.")).toBeNull())
    expect(screen.getByLabelText("Enlace")).toHaveAttribute("aria-invalid", "false")
  })
})

describe("ataque ENTREGAS-01d r2: comentar con errores (T-r2-4)", () => {
  const escribirYEnviar = (texto: string) => {
    const campo = screen.getByLabelText("Comentario privado")
    fireEvent.change(campo, { target: { value: texto } })
    campo.focus()
    fireEvent.click(screen.getByRole("button", { name: "Enviar comentario" }))
  }

  it.each([
    { codigo: "SIN_ACCESO_A_LA_CLASE", estado: 403, texto: SIN_ACCESO },
    { codigo: "TAREA_NO_ENCONTRADA", estado: 404, texto: NO_EXISTE },
  ])(
    "$estado $codigo: sin redirección, un aviso, la tarea se pide una vez, la vista pasa a «$texto» y el foco no cae en <body>",
    async ({ codigo, estado, texto }) => {
      let posteado = false
      servidor.manejador = (l) => {
        if (l.metodo === "POST" && l.url === RUTA_HILO) {
          posteado = true
          return errorApi(estado, codigo, texto)
        }
        if (posteado && l.metodo === "GET" && l.url === RUTA_TAREA) {
          return errorApi(estado, codigo, texto)
        }
        return undefined
      }
      renderDetalle()
      await screen.findByText("Aún no hay comentarios privados.")
      const desde = llamadas.length
      avanzarReloj()
      escribirYEnviar("Hola")
      await waitFor(() =>
        expect(screen.queryByRole("heading", { name: "Comentarios privados" })).toBeNull(),
      )
      await reposar()
      expect(screen.getAllByText(texto).length).toBeGreaterThanOrEqual(1)
      expect(asignar).not.toHaveBeenCalled()
      expect(aviso.error).toHaveBeenCalledTimes(1)
      expect(despuesDe(desde, "GET", RUTA_TAREA)).toHaveLength(1)
      focoFueraDeBody()
    },
  )

  it("403 ACCESO_RESTRINGIDO al comentar: apiClient redirige una sola vez y no se renueva la tarea", async () => {
    servidor.manejador = (l) =>
      l.metodo === "POST" && l.url === RUTA_HILO
        ? errorApi(403, "ACCESO_RESTRINGIDO", "Tu acceso está restringido.")
        : undefined
    renderDetalle()
    await screen.findByText("Aún no hay comentarios privados.")
    const desde = llamadas.length
    escribirYEnviar("Hola")
    await waitFor(() => expect(asignar).toHaveBeenCalledTimes(1))
    await reposar()
    expect(asignar).toHaveBeenCalledWith("/acceso-restringido")
    expect(despuesDe(desde, "GET", RUTA_TAREA)).toEqual([])
  })

  it("SERVICIO_OCUPADO al comentar: un aviso, nada se renueva, lo escrito se conserva y el foco sigue en el campo", async () => {
    servidor.manejador = (l) =>
      l.metodo === "POST" && l.url === RUTA_HILO
        ? errorApi(503, "SERVICIO_OCUPADO", "El servicio está ocupado.")
        : undefined
    renderDetalle()
    await screen.findByText("Aún no hay comentarios privados.")
    const desde = llamadas.length
    escribirYEnviar("Mi duda")
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await reposar()
    expect(llamadas.slice(desde).filter((l) => l.metodo === "GET")).toEqual([])
    expect(screen.getByLabelText("Comentario privado")).toHaveValue("Mi duda")
    expect(document.activeElement).toBe(screen.getByLabelText("Comentario privado"))
  })

  it("TAREA_NO_ENCONTRADA al comentar con «Ver más comentarios» en vuelo que también responde 404: un solo aviso", async () => {
    servidor.hilo = Array.from({ length: 25 }, (_, i) => comentarioDoble(i + 1))
    const pagina = diferido()
    let posteado = false
    servidor.manejador = (l) => {
      if (l.metodo === "GET" && l.url.startsWith(`${RUTA_HILO}?`) && l.url.includes("cursor=")) {
        return pagina.promesa
      }
      if (l.metodo === "POST" && l.url === RUTA_HILO) {
        posteado = true
        return errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE)
      }
      if (posteado && l.metodo === "GET" && l.url === RUTA_TAREA) {
        return errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE)
      }
      return undefined
    }
    renderDetalle()
    fireEvent.click(await screen.findByRole("button", { name: "Ver más comentarios" }))
    await waitFor(() => expect(paginasDelHiloPedidas(true)).toHaveLength(1))
    avanzarReloj()
    escribirYEnviar("Hola")
    await screen.findByText(NO_EXISTE)
    pagina.resolver(errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE))
    await reposar()
    expect(aviso.error.mock.calls).toEqual([[NO_EXISTE]])
    focoFueraDeBody()
  })
})

describe("ataque ENTREGAS-01d r2: HiloPrivado con sus props nuevas", () => {
  it("tras enviar, el campo se vacía y conserva el foco; «Ver más comentarios» queda en espera durante la recarga que sigue al envío", async () => {
    servidor.hilo = Array.from({ length: 25 }, (_, i) => comentarioDoble(i + 1))
    const recarga = diferido()
    let posteado = false
    let retenida = false
    servidor.manejador = (l) => {
      if (l.metodo === "POST" && l.url === RUTA_HILO) posteado = true
      const primera =
        l.metodo === "GET" && l.url.startsWith(`${RUTA_HILO}?`) && !l.url.includes("cursor=")
      if (posteado && primera && !retenida) {
        retenida = true
        return recarga.promesa
      }
      return undefined
    }
    renderDetalle()
    const verMas = await screen.findByRole("button", { name: "Ver más comentarios" })
    const campo = screen.getByLabelText("Comentario privado")
    fireEvent.change(campo, { target: { value: "Nueva" } })
    campo.focus()
    avanzarReloj()
    fireEvent.click(screen.getByRole("button", { name: "Enviar comentario" }))
    await waitFor(() => expect(retenida).toBe(true))
    await waitFor(() => expect(campo).toHaveValue(""))
    expect(document.activeElement).toBe(campo)
    expect(verMas).toHaveAttribute("aria-busy", "true")
    recarga.resolver(respuestaJson(200, paginaDelHilo(`${RUTA_HILO}?limite=20`)))
    await waitFor(() => expect(verMas).not.toHaveAttribute("aria-busy", "true"))
    expect(document.activeElement).toBe(campo)
  })
})

// Revisión estática del cambio de la ronda 1 (sin hallazgo esperado).
const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})
const CAMBIADOS = [
  "/src/features/tareas/hooks.ts",
  "/src/features/tareas/components/campo-de-enlaces.tsx",
  "/src/features/tareas/components/hilo-privado.tsx",
  "/src/features/tareas/components/tu-trabajo.tsx",
  "/src/features/tareas/detalle-tarea-view.tsx",
]

describe("ataque ENTREGAS-01d r2: revisión estática del remedio", () => {
  it("sin disabled, sin ?? [], sin fetch( ni importaciones de otros módulos de features; una sola regla de renovación para las tres mutaciones", () => {
    const hallados = CAMBIADOS.flatMap((ruta) => {
      const texto = fuentes[ruta]
      if (texto === undefined) return [`${ruta}: no existe`]
      const malos: string[] = []
      if (/\sdisabled(=|\s|>|\})/.test(texto)) malos.push("disabled")
      if (/\?\?\s*\[\s*\]/.test(texto)) malos.push("?? []")
      if (/\bfetch\(/.test(texto)) malos.push("fetch(")
      if (/from\s+["']@\/features\/(?!tareas)/.test(texto)) malos.push("importa otro módulo")
      if (/from\s+["']\.\.\/\.\.\/(clases|admin|calificaciones)/.test(texto)) malos.push("relativa")
      return malos.map((m) => `${ruta}: ${m}`)
    })
    expect(hallados).toEqual([])
    const hooks = fuentes["/src/features/tareas/hooks.ts"] ?? ""
    expect(hooks.match(/renovarTrasErrorDeLaEntrega\(/g)).toHaveLength(3)
    expect(hooks).not.toMatch(/reaccionarAlErrorDeLaEntrega/)
  })
})
