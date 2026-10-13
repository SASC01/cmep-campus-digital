import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { DetalleTareaView } from "./detalle-tarea-view"
import { EntregaDeAlumnoView } from "./entrega-de-alumno-view"
import { EntregasView } from "./entregas-view"

// Ataque ENTREGAS-01e, ronda 1 (tester). Vista "Entregas", entrega de un alumno con su hilo, borrar
// una tarea con entregas y el panel del detalle, en las perspectivas de maestro y admin: dobles con
// campos de más (estadoPago, accesoRestringido, email), ALUMNO_NO_ENCONTRADO en cada disparador
// (T-r1-1), la descarga con 404 y 403 (T-r1-2), "Ver más alumnos" desmontado o con redirección
// (T-r1-3), el admin con 409 y "Cancelar" (T-r1-4) y el conteo tras "Ver más" (T-r1-5). Reloj fijo; el
// servidor es un doble en memoria (mismo arreglo que entregas-01e.test.tsx); el almacén, otro origen.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
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
  "Esta tarea tiene 2 entregas y no se puede borrar. Si de verdad hay que borrarla, pídelo a administración."
const MENSAJE_ADMIN =
  "Esta tarea tiene 2 entregas. Si la borras, también se borrarán las entregas y los comentarios privados, y no se puede deshacer."

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

const NO_ALUMNO = "No encontramos a ese alumno en esta clase."
const SIN_ACCESO = "No tienes acceso a esta clase."
const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const RUTA_DESCARGA = `${RUTA_ALUMNO}/archivos/${ARCHIVO_ID}/descarga`
const esPaginaDeEntregas = (url: string) => url.startsWith(`${RUTA_ENTREGAS}?`)
const conCursor = (url: string) => esPaginaDeEntregas(url) && url.includes("cursor=")
const avanzarReloj = () => vi.setSystemTime(new Date(Date.now() + 5000))
const focoFueraDeBody = () => {
  expect(document.activeElement).not.toBeNull()
  expect(document.activeElement).not.toBe(document.body)
}
const veinte = (desdeN: number) =>
  Array.from({ length: 20 }, (_, i) => fila(desdeN + i, `Alumno ${String(desdeN + i)}`))

describe("ataque ENTREGAS-01e r1: dobles con campos de más (el esquema estricto los rechaza)", () => {
  it.each([
    { donde: "fila", extra: { estadoPago: "deudor" }, texto: "deudor" },
    { donde: "fila", extra: { accesoRestringido: true }, texto: "true" },
    { donde: "alumno", extra: { email: "ana@ejemplo.mx" }, texto: "ana@ejemplo.mx" },
  ])(
    "«Entregas» con $extra en la $donde: la vista pasa a error y no pinta la fila",
    async ({ donde, extra }) => {
      const base = fila(1, "Ana Ruiz")
      const mala =
        donde === "fila" ? { ...base, ...extra } : { ...base, alumno: { ...base.alumno, ...extra } }
      servidor.paginas = [[mala]]
      servidor.total = 1
      render01e(entregas("maestro"))
      expect(await screen.findByText(GENERICO)).toBeInTheDocument()
      expect(screen.queryByText("Ana Ruiz")).toBeNull()
      expect(screen.queryByRole("link", { name: /Ver entrega/ })).toBeNull()
      expect(screen.queryByText(/Deudor|ana@ejemplo\.mx/i)).toBeNull()
    },
  )

  it.each([{ estadoPago: "deudor" }, { accesoRestringido: false }, { email: "ana@ejemplo.mx" }])(
    "la entrega de un alumno con %o: la vista pasa a error y no pinta al alumno",
    async (extra) => {
      servidor.entrega = entregaDeAlumno({
        alumno: { id: ALUMNO_ID, nombre: "Ana Ruiz", ...extra },
      })
      render01e(deAlumno("maestro"))
      expect(await screen.findByText(GENERICO)).toBeInTheDocument()
      expect(screen.queryByRole("heading", { name: "Ana Ruiz" })).toBeNull()
      expect(screen.queryByText(/Deudor|ana@ejemplo\.mx/i)).toBeNull()
    },
  )
})

describe("ataque ENTREGAS-01e r1: «Ver más alumnos» (T-r1-3) y el conteo (T-r1-5)", () => {
  it("tres clics en vuelo: un solo GET con cursor, filas sin repetir y el foco fuera de <body>", async () => {
    servidor.paginas = [veinte(1), [fila(21, "Alumno 21")]]
    servidor.total = 21
    const pagina = diferido()
    servidor.manejador = (l) =>
      l.metodo === "GET" && conCursor(l.url) ? pagina.promesa : undefined
    render01e(entregas("maestro"))
    const verMas = await screen.findByRole("button", { name: "Ver más alumnos" })
    fireEvent.click(verMas)
    fireEvent.click(verMas)
    fireEvent.click(verMas)
    await waitFor(() => expect(verMas).toHaveAttribute("aria-busy", "true"))
    expect(pedidas("GET", conCursor)).toHaveLength(1)
    pagina.resolver(
      respuestaJson(200, {
        entregas: [fila(21, "Alumno 21")],
        total: 21,
        entregadas: 0,
        siguienteCursor: null,
      }),
    )
    await screen.findByRole("link", { name: "Ver entrega Alumno 21" })
    const filas = screen.getAllByRole("link", { name: /^Ver entrega/ })
    expect(filas).toHaveLength(21)
    expect(new Set(filas.map((f) => f.getAttribute("href"))).size).toBe(21)
    focoFueraDeBody()
  })

  it("durante una recarga de la lista, «Ver más alumnos» está en espera y un clic no pide la página siguiente", async () => {
    servidor.paginas = [veinte(1), [fila(21, "Alumno 21")]]
    servidor.total = 21
    const recarga = diferido()
    let primeras = 0
    servidor.manejador = (l) => {
      if (l.metodo !== "GET" || !esPaginaDeEntregas(l.url) || conCursor(l.url)) return undefined
      primeras += 1
      return primeras === 2
        ? recarga.promesa.then(() =>
            respuestaJson(200, {
              entregas: veinte(1),
              total: 21,
              entregadas: 0,
              siguienteCursor: uuid(901),
            }),
          )
        : undefined
    }
    const queryClient = render01e(entregas("maestro"))
    const verMas = await screen.findByRole("button", { name: "Ver más alumnos" })
    avanzarReloj()
    act(() => {
      void queryClient.invalidateQueries()
    })
    await waitFor(() => expect(primeras).toBe(2))
    await waitFor(() => expect(verMas).toHaveAttribute("aria-busy", "true"))
    fireEvent.click(verMas)
    expect(pedidas("GET", conCursor)).toEqual([])
    recarga.resolver(new Response(null))
    await waitFor(() => expect(verMas).not.toHaveAttribute("aria-busy", "true"))
    expect(screen.getAllByRole("link", { name: /^Ver entrega/ })).toHaveLength(20)
  })

  it("con la vista desmontada, un 503 de «Ver más alumnos» no avisa ni escribe en la consola", async () => {
    servidor.paginas = [veinte(1), [fila(21, "Alumno 21")]]
    const pagina = diferido()
    servidor.manejador = (l) =>
      l.metodo === "GET" && conCursor(l.url) ? pagina.promesa : undefined
    const consola = vi.spyOn(console, "error").mockImplementation(() => undefined)
    try {
      render01e(entregas("maestro"))
      fireEvent.click(await screen.findByRole("button", { name: "Ver más alumnos" }))
      await waitFor(() => expect(pedidas("GET", conCursor)).toHaveLength(1))
      cleanup()
      pagina.resolver(errorApi(503, "SERVICIO_OCUPADO", "El servicio está ocupado."))
      await reposar()
      expect(aviso.error).not.toHaveBeenCalled()
      expect(consola).not.toHaveBeenCalled()
    } finally {
      consola.mockRestore()
    }
  })

  it("con la sesión perdida (401 y refresco rechazado), «Ver más alumnos» redirige una vez a /login y no avisa", async () => {
    servidor.paginas = [veinte(1), [fila(21, "Alumno 21")]]
    servidor.manejador = (l) => {
      if (l.metodo === "GET" && conCursor(l.url)) return errorApi(401, "NO_AUTENTICADO", "Venció.")
      if (l.url === "/api/auth/refrescar") return errorApi(401, "NO_AUTENTICADO", "Sin sesión.")
      return undefined
    }
    render01e(entregas("maestro"))
    fireEvent.click(await screen.findByRole("button", { name: "Ver más alumnos" }))
    await waitFor(() => expect(asignar).toHaveBeenCalledTimes(1))
    await reposar()
    expect(asignar).toHaveBeenCalledWith("/login")
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("el conteo sale de la página más reciente y no de contar filas; en singular, «1 alumno»", async () => {
    servidor.paginas = [
      veinte(1),
      [fila(21, "Alumno 21", { estado: "entregado", fechaEntrega: "2030-01-09T10:00:00.000Z" })],
    ]
    let pedidasPaginas = 0
    servidor.manejador = (l) => {
      if (l.metodo !== "GET" || !esPaginaDeEntregas(l.url)) return undefined
      pedidasPaginas += 1
      const segunda = conCursor(l.url)
      return respuestaJson(200, {
        entregas: segunda ? servidor.paginas[1] : servidor.paginas[0],
        total: segunda ? 26 : 25,
        entregadas: segunda ? 7 : 3,
        siguienteCursor: segunda ? null : uuid(901),
      })
    }
    render01e(entregas("maestro"))
    expect(await screen.findByText("Entregaron 3 de 25 alumnos.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Ver más alumnos" }))
    expect(await screen.findByText("Entregaron 7 de 26 alumnos.")).toBeInTheDocument()
    expect(screen.queryByText("Entregaron 3 de 25 alumnos.")).toBeNull()
    expect(screen.queryByText(/Entregaron 1 de 21/)).toBeNull()
    expect(pedidasPaginas).toBe(2)
    cleanup()
    servidor.manejador = () => undefined
    servidor.paginas = [[fila(1, "Ana Ruiz")]]
    servidor.total = 1
    servidor.entregadas = 0
    render01e(entregas("admin"))
    expect(await screen.findByText("Entregaron 0 de 1 alumno.")).toBeInTheDocument()
  })

  it("el 400 del cursor dice su texto, sin aviso, y no deja filas viejas a la vista", async () => {
    servidor.paginas = [veinte(1), [fila(21, "Alumno 21")]]
    servidor.manejador = (l) =>
      l.metodo === "GET" && conCursor(l.url)
        ? errorApi(400, "VALIDACION", "cursor: el cursor ya no es válido")
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
    expect(screen.queryByRole("button", { name: "Ver más alumnos" })).toBeNull()
    focoFueraDeBody()
  })
})

describe("ataque ENTREGAS-01e r1: la entrega de un alumno (T-r1-1 y T-r1-2)", () => {
  const descargar = async () => {
    const boton = await screen.findByRole("button", { name: /Descargar.*trabajo\.pdf/ })
    boton.focus()
    avanzarReloj()
    fireEvent.click(boton)
    return boton
  }

  it("la descarga va por la ruta de la entrega del alumno y nunca por la de la clase", async () => {
    render01e(deAlumno("maestro"))
    await descargar()
    await waitFor(() => expect(pedidas("POST", (u) => u === RUTA_DESCARGA)).toHaveLength(1))
    expect(pedidas("POST", (u) => u.startsWith(`/api/clases/${CLASE_ID}/archivos`))).toEqual([])
  })

  it("una recarga de la entrega que responde 404 ALUMNO_NO_ENCONTRADO con el foco en «Descargar»: la vista se reemplaza, sin aviso, y el foco va a la raíz", async () => {
    let fallo = false
    servidor.manejador = (l) =>
      fallo && l.metodo === "GET" && l.url === RUTA_ALUMNO
        ? errorApi(404, "ALUMNO_NO_ENCONTRADO", NO_ALUMNO)
        : undefined
    const queryClient = render01e(deAlumno("maestro"))
    const boton = await screen.findByRole("button", { name: /Descargar.*trabajo\.pdf/ })
    boton.focus()
    fallo = true
    avanzarReloj()
    await act(async () => {
      await queryClient.invalidateQueries()
    })
    expect(await screen.findByText(NO_ALUMNO)).toBeInTheDocument()
    await reposar()
    expect(screen.queryByRole("heading", { name: "Ana Ruiz" })).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
    focoFueraDeBody()
  })

  it.each([
    { estado: 404, codigo: "ALUMNO_NO_ENCONTRADO", mensaje: NO_ALUMNO },
    { estado: 403, codigo: "SIN_ACCESO_A_LA_CLASE", mensaje: SIN_ACCESO },
    { estado: 404, codigo: "TAREA_NO_ENCONTRADA", mensaje: NO_EXISTE },
  ])(
    "descargar un adjunto con $estado $codigo: un aviso como máximo, la vista se reemplaza por «$mensaje» y el foco no cae en <body>",
    async ({ estado, codigo, mensaje }) => {
      let fallo = false
      servidor.manejador = (l) => {
        if (l.metodo === "POST" && l.url === RUTA_DESCARGA) {
          fallo = true
          return errorApi(estado, codigo, mensaje)
        }
        if (fallo && l.metodo === "GET" && (l.url === RUTA_ALUMNO || l.url === RUTA_TAREA)) {
          return errorApi(estado, codigo, mensaje)
        }
        return undefined
      }
      render01e(deAlumno("maestro"))
      await descargar()
      await waitFor(() => expect(aviso.error.mock.calls.length).toBeGreaterThanOrEqual(1))
      await reposar()
      expect(aviso.error.mock.calls.length).toBeLessThanOrEqual(1)
      expect(screen.queryByRole("heading", { name: "Ana Ruiz" })).toBeNull()
      expect(screen.getAllByText(mensaje).length).toBeGreaterThanOrEqual(1)
      focoFueraDeBody()
    },
  )

  it("descargar un adjunto con 404 ARCHIVO_NO_ENCONTRADO: un aviso, la vista sigue y el foco sigue en «Descargar»", async () => {
    servidor.manejador = (l) =>
      l.metodo === "POST" && l.url === RUTA_DESCARGA
        ? errorApi(404, "ARCHIVO_NO_ENCONTRADO", "No encontramos ese archivo.")
        : undefined
    render01e(deAlumno("maestro"))
    const boton = await descargar()
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("heading", { name: "Ana Ruiz" })).toBeInTheDocument()
    expect(document.activeElement).toBe(boton)
  })

  it("«Enviar comentario» y «Ver más comentarios» con 404 ALUMNO_NO_ENCONTRADO a la vez: un solo aviso y la vista se reemplaza", async () => {
    const comentarios = Array.from({ length: 20 }, (_, i) => ({
      id: uuid(600 + i),
      texto: `Comentario ${String(i)}`,
      autor: { id: uuid(2), nombre: "Ana Ruiz", administracion: false },
      creadoEn: new Date(Date.UTC(2030, 0, 1, 8, i)).toISOString(),
      propio: false,
    }))
    const pagina = diferido()
    const envio = diferido()
    let fallo = false
    servidor.manejador = (l) => {
      if (l.metodo === "GET" && l.url.startsWith(`${RUTA_HILO_ALUMNO}?`)) {
        if (l.url.includes("cursor=")) return pagina.promesa
        return respuestaJson(200, { comentarios, siguienteCursor: uuid(699) })
      }
      if (l.metodo === "POST" && l.url === RUTA_HILO_ALUMNO) return envio.promesa
      if (fallo && l.metodo === "GET" && l.url === RUTA_ALUMNO) {
        return errorApi(404, "ALUMNO_NO_ENCONTRADO", NO_ALUMNO)
      }
      return undefined
    }
    render01e(deAlumno("maestro"))
    fireEvent.click(await screen.findByRole("button", { name: "Ver más comentarios" }))
    const campo = screen.getByLabelText("Comentario privado")
    fireEvent.change(campo, { target: { value: "Revisa el punto 2" } })
    campo.focus()
    fireEvent.click(screen.getByRole("button", { name: "Enviar comentario" }))
    await waitFor(() => expect(pedidas("POST", (u) => u === RUTA_HILO_ALUMNO)).toHaveLength(1))
    fallo = true
    avanzarReloj()
    envio.resolver(errorApi(404, "ALUMNO_NO_ENCONTRADO", NO_ALUMNO))
    pagina.resolver(errorApi(404, "ALUMNO_NO_ENCONTRADO", NO_ALUMNO))
    expect(await screen.findByText(NO_ALUMNO)).toBeInTheDocument()
    await reposar()
    expect(aviso.error.mock.calls.length).toBeLessThanOrEqual(1)
    expect(screen.queryByLabelText("Comentario privado")).toBeNull()
    focoFueraDeBody()
  })

  it("el maestro escribe en el hilo: dos clics y dos envíos en vuelo hacen un solo POST, en espera", async () => {
    const envio = diferido()
    servidor.manejador = (l) =>
      l.metodo === "POST" && l.url === RUTA_HILO_ALUMNO ? envio.promesa : undefined
    render01e(deAlumno("maestro"))
    const campo = await screen.findByLabelText("Comentario privado")
    fireEvent.change(campo, { target: { value: "Bien hecho" } })
    const enviar = screen.getByRole("button", { name: "Enviar comentario" })
    const formulario = enviar.closest("form")
    if (formulario === null)
      throw new Error("Precondición: «Enviar comentario» vive en un formulario")
    fireEvent.click(enviar)
    fireEvent.click(enviar)
    fireEvent.submit(formulario)
    fireEvent.submit(formulario)
    await waitFor(() => expect(enviar).toHaveAttribute("aria-busy", "true"))
    expect(pedidas("POST", (u) => u === RUTA_HILO_ALUMNO)).toHaveLength(1)
  })

  it("el admin no tiene formulario en el hilo, ve la nota de solo lectura y el texto de privacidad, también si el hilo falla", async () => {
    servidor.manejador = (l) =>
      l.metodo === "GET" && l.url.startsWith(`${RUTA_HILO_ALUMNO}?`)
        ? errorApi(503, "SERVICIO_OCUPADO", "El servicio está ocupado.")
        : undefined
    render01e(deAlumno("admin"))
    expect(await screen.findByRole("heading", { name: "Ana Ruiz" })).toBeInTheDocument()
    expect(
      screen.getByText("La administración puede leer este hilo, pero no escribir en él."),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "Solo el alumno, los maestros de la clase y la administración pueden verlos.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText("Comentario privado")).toBeNull()
    expect(screen.queryByRole("button", { name: "Enviar comentario" })).toBeNull()
    expect(screen.queryByRole("textbox")).toBeNull()
  })

  it("calificada con retraso dice «Calificado» y «Entregó el …»", async () => {
    servidor.entrega = entregaDeAlumno({ estado: "calificado", conRetraso: true })
    render01e(deAlumno("maestro"))
    expect(await screen.findByText("Calificado")).toBeInTheDocument()
    expect(screen.getByText(/^Entregó el /)).toBeInTheDocument()
  })
})

describe("ataque ENTREGAS-01e r1: borrar una tarea con entregas (T-r1-4)", () => {
  const MENSAJE = MENSAJE_ADMIN

  it("admin: 409, «Cancelar», vuelta a «Borrar tarea» con el foco y el mismo segundo paso; los DELETE sin confirmar hasta «Borrar con las entregas»", async () => {
    let borrados = 0
    servidor.manejador = (l) => {
      if (l.metodo !== "DELETE") return undefined
      borrados += 1
      if (l.url.includes("confirmar=")) return new Response(null, { status: 204 })
      return errorApi(409, "TAREA_CON_ENTREGAS", MENSAJE)
    }
    render01e(detalle("admin"))
    for (const vez of [1, 2]) {
      fireEvent.click(await screen.findByRole("button", { name: "Borrar tarea" }))
      fireEvent.click(screen.getByRole("button", { name: "Sí, borrar tarea" }))
      const alerta = await screen.findByRole("alert")
      expect(alerta).toHaveTextContent(MENSAJE)
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancelar" }))
      expect(screen.getByRole("button", { name: "Borrar con las entregas" })).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Sí, borrar tarea" })).toBeNull()
      expect(borrados).toBe(vez)
      if (vez === 1) {
        fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
        await waitFor(() =>
          expect(document.activeElement).toBe(screen.getByRole("button", { name: "Borrar tarea" })),
        )
        expect(screen.queryByRole("alert")).toBeNull()
      }
    }
    expect(pedidas("DELETE", (u) => u.includes("confirmar"))).toEqual([])
    fireEvent.click(screen.getByRole("button", { name: "Borrar con las entregas" }))
    expect(await screen.findByText("Trabajo de clase de prueba")).toBeInTheDocument()
    const conConfirmar = pedidas("DELETE", (u) => u.includes("confirmar"))
    expect(conConfirmar.map((l) => l.url)).toEqual([`${RUTA_TAREA}?confirmar=entregas`])
    expect(aviso.error).not.toHaveBeenCalled()
    expect(aviso.success).toHaveBeenCalledTimes(1)
  })

  it("«Cancelar» pulsado mientras vuela el primer DELETE no cierra: al llegar el 409 aparece el segundo paso con el foco en «Cancelar»", async () => {
    const respuesta = diferido()
    servidor.manejador = (l) => (l.metodo === "DELETE" ? respuesta.promesa : undefined)
    render01e(detalle("admin"))
    fireEvent.click(await screen.findByRole("button", { name: "Borrar tarea" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar tarea" }))
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(screen.getByRole("button", { name: "Sí, borrar tarea" })).toBeInTheDocument()
    respuesta.resolver(errorApi(409, "TAREA_CON_ENTREGAS", MENSAJE))
    expect(await screen.findByRole("alert")).toHaveTextContent(MENSAJE)
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancelar" }))
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("en la perspectiva de maestro (aunque quien mira fuera admin) nunca aparece «Borrar con las entregas» ni sale confirmar", async () => {
    servidor.manejador = (l) =>
      l.metodo === "DELETE" ? errorApi(409, "TAREA_CON_ENTREGAS", MENSAJE_MAESTRO) : undefined
    render01e(detalle("maestro"))
    fireEvent.click(await screen.findByRole("button", { name: "Borrar tarea" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar tarea" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(MENSAJE_MAESTRO)
    expect(screen.queryByRole("button", { name: "Borrar con las entregas" })).toBeNull()
    expect(screen.queryByRole("button", { name: /Borrar/ })).toBeNull()
    expect(pedidas("DELETE", (u) => u.includes("confirmar"))).toEqual([])
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

describe("ataque ENTREGAS-01e r1: el panel «Entregas» del detalle", () => {
  it.each(["maestro", "admin"] as const)(
    "%s: el enlace va a la vista de su perspectiva y el detalle no pide nada de entregas",
    async (p) => {
      render01e(detalle(p))
      const enlace = await screen.findByRole("link", { name: "Ver entregas" })
      expect(enlace).toHaveAttribute("href", `/${p}/clases/${CLASE_ID}/tareas/${TAREA_ID}/entregas`)
      await reposar()
      expect(llamadas.filter((l) => l.url.includes("/entregas")).map((l) => l.url)).toEqual([])
      expect(llamadas.filter((l) => l.url.includes("/entrega"))).toEqual([])
    },
  )

  it("estudiante: sin panel ni enlace a las entregas de la clase", async () => {
    servidor.manejador = (l) => {
      if (l.url.endsWith("/entrega")) {
        return respuestaJson(200, {
          entrega: {
            estado: "asignado",
            fechaEntrega: null,
            conRetraso: false,
            enlaces: [],
            adjuntos: [],
            puedeEntregar: true,
            puedeAnular: false,
          },
        })
      }
      if (l.url.includes("/entrega/comentarios")) {
        return respuestaJson(200, { comentarios: [], siguienteCursor: null })
      }
      return undefined
    }
    render01e(detalle("estudiante"))
    expect(await screen.findByRole("heading", { name: "Tu trabajo" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Ver entregas" })).toBeNull()
    expect(screen.queryByRole("heading", { name: "Entregas" })).toBeNull()
    expect(llamadas.filter((l) => l.url.includes("/entregas"))).toEqual([])
  })
})

// Revisión estática de lo nuevo de 01e.
const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})
const NUEVOS_01E = [
  "/src/features/tareas/entregas-view.tsx",
  "/src/features/tareas/entrega-de-alumno-view.tsx",
  "/src/features/tareas/components/panel-de-entregas.tsx",
  "/src/features/tareas/components/tabla-de-entregas.tsx",
  "/src/features/tareas/components/acciones-de-la-tarea.tsx",
  "/src/features/tareas/detalle-tarea-view.tsx",
  "/src/features/tareas/hooks.ts",
  "/src/features/tareas/lib.ts",
  "/src/features/tareas/data.ts",
  "/src/features/tareas/types.ts",
]

describe("ataque ENTREGAS-01e r1: revisión estática de lo nuevo", () => {
  it("sin disabled, ?? [], fetch(, console., valores por defecto en estadoPago, rol, accesoRestringido ni calificacion, vidrio, data-material, fixed ni animate-; sin estadoPago, correo ni perspectivaDeRuta( en las vistas nuevas", () => {
    const reglas: [string, RegExp][] = [
      ["disabled", /\sdisabled(=|\s|>|\})/],
      ["?? []", /\?\?\s*\[\s*\]/],
      ["fetch(", /\bfetch\(/],
      ["console.", /\bconsole\./],
      ["defecto", /\b(estadoPago|accesoRestringido|rol|calificacion)\s*(\?\?|\|\|)/],
      ["vidrio", /\bvidrio(-fuerte|-azul)?\b/],
      ["data-material", /data-material|data-densidad/],
      ["fixed", /\bfixed\b/],
      ["animate-", /\banimate-/],
      ["otro módulo", /from\s+["']@\/features\//],
    ]
    const violaciones = NUEVOS_01E.flatMap((ruta) => {
      const texto = fuentes[ruta]
      if (texto === undefined) return [`${ruta}: no existe`]
      return reglas.filter(([, r]) => r.test(texto)).map(([n]) => `${ruta}: ${n}`)
    })
    expect(violaciones).toEqual([])
    const vistas = NUEVOS_01E.slice(0, 4)
    const sensibles = vistas.filter((ruta) =>
      /estadoPago|accesoRestringido|\bemail\b|correo|perspectivaDeRuta\(/.test(fuentes[ruta] ?? ""),
    )
    expect(sensibles).toEqual([])
    const hooks = fuentes["/src/features/tareas/hooks.ts"] ?? ""
    expect(hooks.match(/renovarTrasErrorDeLaEntrega\(/g)).toHaveLength(3)
  })
})
