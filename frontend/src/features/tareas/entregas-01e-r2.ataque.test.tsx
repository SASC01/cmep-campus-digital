import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AdjuntosDePublicacion } from "@/components/adjuntos/adjuntos-de-publicacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { DetalleTareaView } from "./detalle-tarea-view"
import { EntregaDeAlumnoView } from "./entrega-de-alumno-view"
import { EntregasView } from "./entregas-view"

// Ataque ENTREGAS-01e, ronda 2 (tester): el remedio de T-01 (alFallarLaDescarga) y sus vecinos. La
// descarga con un error que reemplaza la vista mientras otra petición responde lo mismo (T-r2-1), con la
// vista desmontada (T-r2-2), con ARCHIVO_NO_ENCONTRADO, 5xx o la sesión perdida (T-r2-3), dos descargas
// seguidas, en el detalle de cada perspectiva y en "Tu trabajo"; AdjuntosDePublicacion sin la prop como
// control de R-04 (T-r2-4). Reloj fijo; servidor en memoria (el arreglo de entregas-01e.test.tsx).

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

// C-6 de CALIFICACIONES-01a (§D-R0, A-5): EntregaDeAlumno y MiEntrega (doble en línea) suman calificacion: null.
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

const NO_ALUMNO = "No encontramos a ese alumno en esta clase."
const SIN_ACCESO = "No tienes acceso a esta clase."
const OCUPADO = "El servicio está ocupado."
const ARCHIVO_2 = uuid(777)
const RUTA_DESCARGA_ALUMNO = (id: string) => `${RUTA_ALUMNO}/archivos/${id}/descarga`
const RUTA_MI_ENTREGA = `${RUTA_TAREA}/entrega`
const avanzarReloj = () => vi.setSystemTime(new Date(Date.now() + 5000))
const focoFueraDeBody = () => {
  expect(document.activeElement).not.toBeNull()
  expect(document.activeElement).not.toBe(document.body)
}
const esDescarga = (url: string) => url.includes("/archivos/") && url.endsWith("/descarga")
const adjunto = (id: string, nombre: string) => ({
  id,
  nombre,
  tipo: "application/pdf",
  tamano: 2048,
  vistaPrevia: null,
})
const sesionPerdida = (l: Llamada) =>
  l.url === "/api/auth/refrescar" ? errorApi(401, "NO_AUTENTICADO", "Sin sesión.") : undefined
// La entrega y el hilo del alumno (para "Tu trabajo").
const miEntrega = (l: Llamada) => {
  if (l.metodo === "GET" && l.url === RUTA_MI_ENTREGA) {
    return respuestaJson(200, {
      entrega: {
        estado: "entregado",
        fechaEntrega: "2030-01-09T15:30:00.000Z",
        conRetraso: false,
        enlaces: [],
        adjuntos: [adjunto(ARCHIVO_ID, "trabajo.pdf")],
        puedeEntregar: false,
        puedeAnular: true,
        calificacion: null,
      },
    })
  }
  if (l.metodo === "GET" && l.url.startsWith(`${RUTA_MI_ENTREGA}/comentarios?`)) {
    return respuestaJson(200, { comentarios: [], siguienteCursor: null })
  }
  return undefined
}
const pulsarDescargar = async (nombre = "trabajo.pdf") => {
  const boton = await screen.findByRole("button", { name: new RegExp(`Descargar.*${nombre}`) })
  boton.focus()
  avanzarReloj()
  fireEvent.click(boton)
  return boton
}

describe("ataque ENTREGAS-01e r2: descarga con la tarea perdida y otra petición a la vez (T-r2-1)", () => {
  it("entrega de un alumno: la descarga y la recarga de la entrega responden 404 TAREA_NO_ENCONTRADA a la vez: un aviso, la vista dice «Esa tarea ya no existe.» y el foco va a la raíz", async () => {
    const descarga = diferido()
    let fallo = false
    servidor.manejador = (l) => {
      if (l.metodo === "POST" && esDescarga(l.url)) return descarga.promesa
      if (fallo && l.metodo === "GET" && (l.url === RUTA_TAREA || l.url === RUTA_ALUMNO)) {
        return errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE)
      }
      if (fallo && l.metodo === "GET" && l.url.startsWith(`${RUTA_HILO_ALUMNO}?`)) {
        return errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE)
      }
      return undefined
    }
    const queryClient = render01e(deAlumno("maestro"))
    await pulsarDescargar()
    await waitFor(() => expect(pedidas("POST", esDescarga)).toHaveLength(1))
    fallo = true
    avanzarReloj()
    act(() => {
      void queryClient.invalidateQueries()
    })
    descarga.resolver(errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE))
    expect(await screen.findByText(NO_EXISTE)).toBeInTheDocument()
    await reposar()
    expect(aviso.error.mock.calls).toEqual([[NO_EXISTE]])
    expect(screen.queryByRole("heading", { name: "Ana Ruiz" })).toBeNull()
    focoFueraDeBody()
  })

  it("entrega de un alumno: dos descargas en vuelo con el mismo 404 TAREA_NO_ENCONTRADA dan un solo aviso", async () => {
    servidor.entrega = entregaDeAlumno({
      adjuntos: [adjunto(ARCHIVO_ID, "trabajo.pdf"), adjunto(ARCHIVO_2, "anexo.pdf")],
    })
    const primera = diferido()
    const segunda = diferido()
    let fallo = false
    servidor.manejador = (l) => {
      if (l.metodo === "POST" && l.url === RUTA_DESCARGA_ALUMNO(ARCHIVO_ID)) return primera.promesa
      if (l.metodo === "POST" && l.url === RUTA_DESCARGA_ALUMNO(ARCHIVO_2)) return segunda.promesa
      if (fallo && l.metodo === "GET" && (l.url === RUTA_TAREA || l.url === RUTA_ALUMNO)) {
        return errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE)
      }
      return undefined
    }
    render01e(deAlumno("maestro"))
    await pulsarDescargar("trabajo.pdf")
    await pulsarDescargar("anexo.pdf")
    await waitFor(() => expect(pedidas("POST", esDescarga)).toHaveLength(2))
    fallo = true
    primera.resolver(errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE))
    segunda.resolver(errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE))
    expect(await screen.findByText(NO_EXISTE)).toBeInTheDocument()
    await reposar()
    expect(aviso.error.mock.calls).toEqual([[NO_EXISTE]])
    focoFueraDeBody()
  })

  it("entrega de un alumno: dos descargas seguidas con 404 ARCHIVO_NO_ENCONTRADO dan un aviso cada una y la vista se queda", async () => {
    servidor.entrega = entregaDeAlumno({
      adjuntos: [adjunto(ARCHIVO_ID, "trabajo.pdf"), adjunto(ARCHIVO_2, "anexo.pdf")],
    })
    servidor.manejador = (l) =>
      l.metodo === "POST" && esDescarga(l.url)
        ? errorApi(404, "ARCHIVO_NO_ENCONTRADO", "No encontramos ese archivo.")
        : undefined
    render01e(deAlumno("maestro"))
    await pulsarDescargar("trabajo.pdf")
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    const boton = await pulsarDescargar("anexo.pdf")
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2))
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(2)
    expect(screen.getByRole("heading", { name: "Ana Ruiz" })).toBeInTheDocument()
    expect(document.activeElement).toBe(boton)
    expect(llamadas.filter((l) => l.metodo === "GET" && l.url === RUTA_TAREA)).toHaveLength(1)
  })
})

describe("ataque ENTREGAS-01e r2: descarga con la vista desmontada (T-r2-2)", () => {
  it.each([
    { estado: 404, codigo: "TAREA_NO_ENCONTRADA", mensaje: NO_EXISTE },
    { estado: 503, codigo: "SERVICIO_OCUPADO", mensaje: OCUPADO },
  ])(
    "la descarga responde $estado $codigo después de desmontar: como mucho un aviso, ninguna petición más y nada en la consola",
    async ({ estado, codigo, mensaje }) => {
      const descarga = diferido()
      servidor.manejador = (l) =>
        l.metodo === "POST" && esDescarga(l.url) ? descarga.promesa : undefined
      const consola = vi.spyOn(console, "error").mockImplementation(() => undefined)
      try {
        render01e(deAlumno("maestro"))
        await pulsarDescargar()
        await waitFor(() => expect(pedidas("POST", esDescarga)).toHaveLength(1))
        cleanup()
        const indice = llamadas.length
        descarga.resolver(errorApi(estado, codigo, mensaje))
        await reposar()
        expect(aviso.error.mock.calls.length).toBeLessThanOrEqual(1)
        expect(llamadas.slice(indice)).toEqual([])
        expect(consola).not.toHaveBeenCalled()
        expect(asignar).not.toHaveBeenCalled()
      } finally {
        consola.mockRestore()
      }
    },
  )
})

describe("ataque ENTREGAS-01e r2: cada clase de error al descargar, en cada vista (T-r2-3)", () => {
  type Vista =
    "alumno de maestro" | "alumno de admin" | "detalle maestro" | "detalle admin" | "tu trabajo"
  const preparar = (vista: Vista) => {
    if (vista === "detalle maestro" || vista === "detalle admin") {
      servidor.tarea = tareaDoble({ adjuntos: [adjunto(ARCHIVO_ID, "trabajo.pdf")] })
    }
    if (vista === "alumno de maestro") return render01e(deAlumno("maestro"))
    if (vista === "alumno de admin") return render01e(deAlumno("admin"))
    if (vista === "detalle maestro") return render01e(detalle("maestro"))
    if (vista === "detalle admin") return render01e(detalle("admin"))
    return render01e(detalle("estudiante"))
  }
  const vistas: Vista[] = [
    "alumno de maestro",
    "alumno de admin",
    "detalle maestro",
    "detalle admin",
    "tu trabajo",
  ]
  const reemplazan = [
    { estado: 404, codigo: "TAREA_NO_ENCONTRADA", mensaje: NO_EXISTE },
    { estado: 403, codigo: "SIN_ACCESO_A_LA_CLASE", mensaje: SIN_ACCESO },
  ]
  const casos = vistas.flatMap((vista) => [
    ...reemplazan.map((r) => ({ vista, ...r })),
    ...(vista.startsWith("alumno de")
      ? [{ vista, estado: 404, codigo: "ALUMNO_NO_ENCONTRADO", mensaje: NO_ALUMNO }]
      : []),
  ])

  it.each(casos)(
    "$vista: $estado $codigo al descargar: un aviso, la vista pasa a «$mensaje», sin redirección y el foco no cae en <body>",
    async ({ vista, estado, codigo, mensaje }) => {
      let fallo = false
      servidor.manejador = (l) => {
        if (l.metodo === "POST" && esDescarga(l.url)) {
          fallo = true
          return errorApi(estado, codigo, mensaje)
        }
        if (fallo && l.metodo === "GET" && !l.url.startsWith("/api/auth")) {
          return errorApi(estado, codigo, mensaje)
        }
        return miEntrega(l)
      }
      preparar(vista)
      await pulsarDescargar()
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
      expect(await screen.findByText(mensaje)).toBeInTheDocument()
      await reposar()
      expect(aviso.error.mock.calls).toEqual([[mensaje]])
      expect(screen.queryByRole("button", { name: /Descargar/ })).toBeNull()
      expect(asignar).not.toHaveBeenCalled()
      focoFueraDeBody()
    },
  )

  it.each(vistas)(
    "%s: ARCHIVO_NO_ENCONTRADO y 503 al descargar dan un aviso cada uno, nada se renueva y el foco sigue en «Descargar»",
    async (vista) => {
      let respuesta = errorApi(404, "ARCHIVO_NO_ENCONTRADO", "No encontramos ese archivo.")
      servidor.manejador = (l) => {
        if (l.metodo === "POST" && esDescarga(l.url)) return respuesta
        return miEntrega(l)
      }
      preparar(vista)
      const boton = await pulsarDescargar()
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
      const indice = llamadas.length
      respuesta = errorApi(503, "SERVICIO_OCUPADO", OCUPADO)
      fireEvent.click(boton)
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2))
      await reposar()
      expect(aviso.error).toHaveBeenCalledTimes(2)
      expect(llamadas.slice(indice).filter((l) => l.metodo === "GET")).toEqual([])
      expect(screen.getByRole("button", { name: /Descargar.*trabajo\.pdf/ })).toBe(boton)
      expect(document.activeElement).toBe(boton)
    },
  )

  it.each(vistas)(
    "%s: con la sesión perdida (401 y refresco rechazado) al descargar, una redirección a /login y ningún aviso",
    async (vista) => {
      servidor.manejador = (l) => {
        if (l.metodo === "POST" && esDescarga(l.url))
          return errorApi(401, "NO_AUTENTICADO", "Venció.")
        return sesionPerdida(l) ?? miEntrega(l)
      }
      preparar(vista)
      await pulsarDescargar()
      await waitFor(() => expect(asignar).toHaveBeenCalledTimes(1))
      await reposar()
      expect(asignar).toHaveBeenCalledWith("/login")
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )
})

describe("ataque ENTREGAS-01e r2: AdjuntosDePublicacion sin la prop, como en el muro (T-r2-4, R-04)", () => {
  it.each([
    { estado: 404, codigo: "TAREA_NO_ENCONTRADA" },
    { estado: 403, codigo: "SIN_ACCESO_A_LA_CLASE" },
    { estado: 503, codigo: "SERVICIO_OCUPADO" },
  ])(
    "$estado $codigo: un aviso con el mensaje del módulo, la descarga por la ruta de la clase y ninguna otra petición",
    async ({ estado, codigo }) => {
      servidor.manejador = (l) =>
        l.metodo === "POST" && esDescarga(l.url) ? errorApi(estado, codigo, "x") : undefined
      const mensajeDeError = vi.fn(() => "Mensaje del módulo")
      render(
        <QueryClientProvider client={new QueryClient()}>
          <AdjuntosDePublicacion
            claseId={CLASE_ID}
            adjuntos={[adjunto(ARCHIVO_ID, "trabajo.pdf")]}
            mensajeDeError={mensajeDeError}
          />
        </QueryClientProvider>,
      )
      await pulsarDescargar()
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
      await reposar()
      expect(aviso.error.mock.calls).toEqual([["Mensaje del módulo"]])
      expect(llamadas.map((l) => `${l.metodo} ${l.url}`)).toEqual([
        `POST /api/clases/${CLASE_ID}/archivos/${ARCHIVO_ID}/descarga`,
      ])
    },
  )
})

// Revisión estática del remedio.
const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})

describe("ataque ENTREGAS-01e r2: revisión estática del remedio", () => {
  it("una sola prop nueva en components/adjuntos (alFallarLaDescarga), sin ganchos nuevos ahí; renovarTrasErrorDeLaEntrega en 3; sin disabled, ?? [], fetch( ni importaciones de features en lo que cambió", () => {
    const adjuntos = fuentes["/src/components/adjuntos/adjuntos-de-publicacion.tsx"] ?? ""
    expect(adjuntos).toMatch(/alFallarLaDescarga\?: \(error: unknown\) => void/)
    expect(adjuntos).not.toMatch(/from\s+["']@\/features\//)
    const ganchos = fuentes["/src/components/adjuntos/hooks.ts"] ?? ""
    expect([...ganchos.matchAll(/^export const (use\w+)/gm)].map((m) => m[1]).sort()).toEqual([
      "useSolicitarSubida",
      "useSolicitarSubidaEn",
      "useUrlDeDescarga",
      "useUrlDeDescargaEn",
    ])
    const hooks = fuentes["/src/features/tareas/hooks.ts"] ?? ""
    expect(hooks.match(/renovarTrasErrorDeLaEntrega\(/g)).toHaveLength(3)
    const cambiados = [
      "/src/components/adjuntos/adjuntos-de-publicacion.tsx",
      "/src/features/tareas/hooks.ts",
      "/src/features/tareas/detalle-tarea-view.tsx",
      "/src/features/tareas/entrega-de-alumno-view.tsx",
      "/src/features/tareas/components/tu-trabajo.tsx",
      "/src/features/tareas/components/entrega-realizada.tsx",
    ]
    const malos = cambiados.flatMap((ruta) => {
      const texto = fuentes[ruta]
      if (texto === undefined) return [`${ruta}: no existe`]
      const lista: string[] = []
      if (/\sdisabled(=|\s|>|\})/.test(texto)) lista.push("disabled")
      if (/\?\?\s*\[\s*\]/.test(texto)) lista.push("?? []")
      if (/\bfetch\(/.test(texto)) lista.push("fetch(")
      if (/from\s+["']@\/features\//.test(texto)) lista.push("importa de features")
      return lista.map((m) => `${ruta}: ${m}`)
    })
    expect(malos).toEqual([])
  })
})
