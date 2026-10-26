import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { claveGradebook } from "@/services/calificacionesService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { GradebookView } from "./gradebook-view"

// Tester, ronda 2 de CALIFICACIONES-01d: ataques al remedio de T-06 (la ventana vacía con cursor) y a
// sus vecinos (N-50 y N-51): recargas de fondo en las dos direcciones, caché fresca y vieja,
// isPlaceholderData, la pila al regresar y volver a avanzar, contratos rotos del servidor y la
// instrucción del texto del cursor ("Vuelve a abrir Calificaciones"). El servidor es un doble en
// memoria (fetch) y los avisos, un doble de sonner. Reloj fijo en todas (vi.useFakeTimers solo para
// Date): la frescura de la caché de TanStack Query depende de Date.now().

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
const PASADA = "2030-01-05T16:00:00.000Z"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const uuid = (n: number) => `6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c${String(n).padStart(4, "0")}`
const RUTA_API = `/api/clases/${CLASE_ID}/gradebook`
const CURSOR_TAREAS = uuid(950)
const CURSOR_ALUMNOS = uuid(960)
const CURSOR_ALUMNOS_2 = uuid(962)
const OTRO_CURSOR_ALUMNOS = uuid(961)
const CURSOR_TEXTO =
  "La clase cambió mientras veías las calificaciones. Vuelve a abrir Calificaciones para verlas completas."
const SIN_ALUMNOS = "Aún no hay alumnos en esta clase."
const SIN_TAREAS = "Aún no hay tareas en esta clase."
const GENERICO = "No pudimos cargar las calificaciones. Inténtalo de nuevo."
// El staleTime de producción (app/providers.tsx): 30 s.
const STALE_DE_PRODUCCION = 30_000

const columna = (n: number, extra: Record<string, unknown> = {}) => ({
  id: uuid(100 + n),
  titulo: `Tarea ${String(n)}`,
  fechaLimite: FUTURA,
  puntos: 10,
  categoria: null,
  ...extra,
})

const COLUMNAS_A = [columna(1), columna(2, { fechaLimite: PASADA }), columna(3)]
const COLUMNAS_B = [columna(4, { fechaLimite: PASADA })]
const ALUMNOS_A = [
  { id: uuid(301), nombre: "Ana Ruiz" },
  { id: uuid(302), nombre: "Beto Díaz" },
]
const ALUMNOS_B = [{ id: uuid(303), nombre: "Carla Gómez" }]
const ALUMNOS_C = [{ id: uuid(304), nombre: "Dora Peña" }]

const fila = (alumno: { id: string; nombre: string }, columnas: { id: string }[]) => ({
  alumno,
  celdas: columnas.map((c) => ({
    tareaId: c.id,
    estado: "asignado",
    conRetraso: false,
    calificacion: null,
  })),
  porcentaje: null,
  vencidasSinEntregar: 0,
  motivosDeRiesgo: [],
})

interface Respuesta {
  tareas: ReturnType<typeof columna>[]
  siguienteCursorTareas: string | null
  alumnos: ReturnType<typeof fila>[]
  siguienteCursor: string | null
  resumen: {
    modo: string
    totalAlumnos: number
    promedioDeLaClase: number | null
    alumnosEnRiesgo: number
  }
}

const respuestaGradebook = (cursor: string | null, cursorTareas: string | null): Respuesta => {
  const columnas = cursorTareas === null ? COLUMNAS_A : COLUMNAS_B
  const alumnos = cursor === null ? ALUMNOS_A : ALUMNOS_B
  return {
    tareas: columnas,
    siguienteCursorTareas: cursorTareas === null ? CURSOR_TAREAS : null,
    alumnos: alumnos.map((a) => fila(a, columnas)),
    siguienteCursor: cursor === null ? CURSOR_ALUMNOS : null,
    resumen: { modo: "puntos", totalAlumnos: 3, promedioDeLaClase: 82.4, alumnosEnRiesgo: 0 },
  }
}

// La misma ventana con la dimensión vacía (el servidor manda el cursor siguiente nulo, §D-6.1).
const sinAlumnos = (r: Respuesta): Respuesta => ({ ...r, alumnos: [], siguienteCursor: null })
const sinTareas = (r: Respuesta): Respuesta => ({
  ...r,
  tareas: [],
  alumnos: r.alumnos.map((f) => ({ ...f, celdas: [] })),
  siguienteCursorTareas: null,
})

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

interface Llamada {
  url: string
  cursor: string | null
  cursorTareas: string | null
}
type Manejador = (llamada: Llamada) => Response | Promise<Response> | undefined

let manejador: Manejador
let cuerpoDelServidor: (cursor: string | null, cursorTareas: string | null) => unknown
let llamadas: Llamada[] = []
const asignar = vi.fn()

const instalarServidor = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada) => {
      const url = String(entrada)
      const p = new URL(url, "http://local").searchParams
      const llamada = { url, cursor: p.get("cursor"), cursorTareas: p.get("cursorTareas") }
      llamadas.push(llamada)
      const propia = manejador(llamada)
      if (propia !== undefined) return Promise.resolve(propia)
      if (url.startsWith(`${RUTA_API}?`)) {
        return Promise.resolve(
          respuestaJson(200, cuerpoDelServidor(llamada.cursor, llamada.cursorTareas)),
        )
      }
      return Promise.resolve(errorApi(500, "ERROR_INTERNO", "no esperada"))
    }),
  )
}

const nuevoCliente = (staleTime = 0) =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime }, mutations: { retry: false } },
  })

const arbol = (cliente: QueryClient, entrada: string) => (
  <QueryClientProvider client={cliente}>
    <button type="button">Control fuera de la vista</button>
    <MemoryRouter initialEntries={[entrada]}>
      <Routes>
        <Route path="/maestro/clases/:claseId">
          <Route path="calificaciones" element={<GradebookView />} />
        </Route>
      </Routes>
    </MemoryRouter>
  </QueryClientProvider>
)

const montar = (
  cliente: QueryClient = nuevoCliente(),
  entrada = `/maestro/clases/${CLASE_ID}/calificaciones`,
) => ({ cliente, ...render(arbol(cliente, entrada)) })

const diferido = () => {
  let resolver: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver }
}

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

const raizDeLaVista = () => {
  const raiz = document.querySelector("[data-material='opaco']")
  if (!(raiz instanceof HTMLElement)) throw new Error("Precondición: la vista tiene su raíz")
  return raiz
}
const esperarTabla = () => screen.findByRole("table", { name: "Calificaciones por alumno y tarea" })
const encabezado = () => screen.getByRole("heading", { name: "Calificaciones", level: 2 })
const boton = (nombre: string) => screen.getByRole("button", { name: nombre })
const sinBoton = (nombre: string) => screen.queryByRole("button", { name: nombre })
const enfocar = (elemento: HTMLElement) => {
  act(() => elemento.focus())
  expect(document.activeElement).toBe(elemento)
}
const ventana = (cursor: string | null, cursorTareas: string | null) =>
  claveGradebook(CLASE_ID, { cursor, cursorTareas })

// La ventana vacía con cursor según el remedio de T-06: un solo alert con el texto del cursor, sin
// tabla, con el h2 y el resumen, sin los vacíos de la clase, sin aria-busy y sin avisos.
const comprobarVentanaVacia = async (resumen = "3 alumnos") => {
  await waitFor(() => expect(screen.getByText(CURSOR_TEXTO)).toBeInTheDocument())
  await reposar()
  expect(screen.getAllByText(CURSOR_TEXTO)).toHaveLength(1)
  expect(screen.getAllByRole("alert")).toHaveLength(1)
  expect(screen.queryByRole("table")).toBeNull()
  expect(encabezado()).toBeInTheDocument()
  expect(screen.getByText(resumen)).toBeInTheDocument()
  expect(screen.queryByText(SIN_ALUMNOS)).toBeNull()
  expect(screen.queryByText(SIN_TAREAS)).toBeNull()
  expect(document.querySelector("[aria-busy='true']")).toBeNull()
  expect(aviso.error).not.toHaveBeenCalled()
  expect(aviso.success).not.toHaveBeenCalled()
}

// Registra si algún texto aparece en el documento en cualquier momento (también entre dos renders).
const vigilarTextos = (textos: readonly string[]) => {
  const vistos = new Set<string>()
  const revisar = () => {
    const texto = document.body.textContent
    for (const t of textos) if (texto.includes(t)) vistos.add(t)
  }
  const observador = new MutationObserver(revisar)
  observador.observe(document.body, { childList: true, subtree: true, characterData: true })
  return {
    vistos,
    parar: () => {
      revisar()
      observador.disconnect()
    },
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  llamadas = []
  manejador = () => undefined
  cuerpoDelServidor = respuestaGradebook
  instalarServidor()
  vi.stubGlobal("location", { ...window.location, assign: asignar })
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
  aviso.success.mockClear()
  aviso.error.mockClear()
  asignar.mockReset()
})

describe("N-50: los tres vecinos de T-06 que el manager comprobó sin prueba", () => {
  it("CAL-T-200: ventana vacía y luego una recarga de fondo que trae datos: la tabla vuelve sola, sin alert ni aviso, con «Alumnos anteriores» y el foco en el h2", async () => {
    let vacia = true
    cuerpoDelServidor = (c, t) => {
      const r = respuestaGradebook(c, t)
      return c !== null && vacia ? sinAlumnos(r) : r
    }
    const { cliente } = montar()
    await esperarTabla()
    const pulsado = boton("Alumnos siguientes")
    enfocar(pulsado)
    fireEvent.click(pulsado)
    await comprobarVentanaVacia()
    expect(document.activeElement).toBe(encabezado())
    vacia = false
    const desde = llamadas.length
    await act(async () => {
      await cliente.invalidateQueries({ queryKey: ventana(CURSOR_ALUMNOS, null) })
    })
    expect(await screen.findByRole("row", { name: /^Carla Gómez/ })).toBeInTheDocument()
    await reposar()
    expect(llamadas.slice(desde)).toHaveLength(1)
    expect(llamadas.at(-1)).toMatchObject({ cursor: CURSOR_ALUMNOS, cursorTareas: null })
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(boton("Alumnos anteriores")).toBeInTheDocument()
    expect(sinBoton("Alumnos siguientes")).toBeNull()
    expect(document.activeElement).toBe(encabezado())
    expect(document.querySelector("[aria-busy='true']")).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-T-201: con la caché fresca, regresar y volver a avanzar a la ventana vacía no pide nada: se ve el texto del cursor de la caché y el foco va al h2", async () => {
    cuerpoDelServidor = (c, t) => {
      const r = respuestaGradebook(c, t)
      return c !== null ? sinAlumnos(r) : r
    }
    montar(nuevoCliente(Number.POSITIVE_INFINITY))
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    await comprobarVentanaVacia()
    fireEvent.click(boton("Alumnos anteriores"))
    expect(await screen.findByRole("row", { name: /^Ana Ruiz/ })).toBeInTheDocument()
    await reposar()
    const desde = llamadas.length
    const otraVez = boton("Alumnos siguientes")
    enfocar(otraVez)
    fireEvent.click(otraVez)
    await comprobarVentanaVacia()
    expect(llamadas.slice(desde)).toHaveLength(0)
    expect(document.activeElement).toBe(encabezado())
    expect(boton("Alumnos anteriores")).toBeInTheDocument()
  })

  it("CAL-T-202: ventana vacía y luego una recarga de fondo que falla con 5xx: sigue el texto del cursor con el resumen y la navegación, sin el genérico ni aviso (S-19)", async () => {
    cuerpoDelServidor = (c, t) => {
      const r = respuestaGradebook(c, t)
      return c !== null ? sinAlumnos(r) : r
    }
    const { cliente } = montar()
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    await comprobarVentanaVacia()
    const alertaAntes = screen.getByRole("alert")
    manejador = (l) => (l.cursor !== null ? errorApi(503, "ERROR_INTERNO", "caído") : undefined)
    await act(async () => {
      await cliente.invalidateQueries({ queryKey: ventana(CURSOR_ALUMNOS, null) })
    })
    await reposar()
    await comprobarVentanaVacia()
    expect(screen.getByRole("alert")).toBe(alertaAntes)
    expect(screen.queryByText(GENERICO)).toBeNull()
    expect(screen.queryByText("caído")).toBeNull()
    expect(boton("Alumnos anteriores")).toBeInTheDocument()
  })

  it("CAL-T-203: una recarga de fondo que deja la ventana vacía como estaba no vuelve a montar el alert (no se anuncia dos veces)", async () => {
    cuerpoDelServidor = (c, t) => {
      const r = respuestaGradebook(c, t)
      return c !== null ? sinAlumnos(r) : r
    }
    const { cliente } = montar()
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    await comprobarVentanaVacia()
    const alertaAntes = screen.getByRole("alert")
    const desde = llamadas.length
    await act(async () => {
      await cliente.invalidateQueries({ queryKey: ventana(CURSOR_ALUMNOS, null) })
    })
    await reposar()
    expect(llamadas.slice(desde)).toHaveLength(1)
    await comprobarVentanaVacia()
    expect(screen.getByRole("alert")).toBe(alertaAntes)
  })
})

describe("N-51 y G22: la recarga de fondo con datos que llega vacía", () => {
  it("CAL-T-204: ventana con datos y «Alumnos siguientes» con el foco; una recarga de fondo la vacía: texto del cursor, el resumen sigue, y el foco del botón quitado va a la raíz (nunca a <body>)", async () => {
    let vaciar = false
    cuerpoDelServidor = (c, t) => {
      const r = respuestaGradebook(c, t)
      if (c === CURSOR_ALUMNOS && !vaciar) return { ...r, siguienteCursor: CURSOR_ALUMNOS_2 }
      if (c === CURSOR_ALUMNOS) return sinAlumnos(r)
      return r
    }
    const { cliente } = montar()
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    expect(await screen.findByRole("row", { name: /^Carla Gómez/ })).toBeInTheDocument()
    await reposar()
    const siguientes = boton("Alumnos siguientes")
    enfocar(siguientes)
    vaciar = true
    // El reloj está fijo: se adelanta para que la recarga tenga su propia hora, como en la aplicación
    // (la clave del gancho de foco cambia con dataUpdatedAt).
    vi.setSystemTime(new Date(AHORA.getTime() + 1_000))
    await act(async () => {
      await cliente.invalidateQueries({ queryKey: ventana(CURSOR_ALUMNOS, null) })
    })
    await comprobarVentanaVacia()
    expect(sinBoton("Alumnos siguientes")).toBeNull()
    expect(boton("Alumnos anteriores")).toBeInTheDocument()
    expect(document.activeElement).toBe(raizDeLaVista())
    expect(document.activeElement).not.toBe(document.body)
  })

  it("CAL-T-205: alumnos vacíos con solo el cursor de tareas (la otra dimensión): una recarga de fondo de la ventana de tareas que deja sin alumnos dice el texto del cursor, no «Aún no hay alumnos», y ofrece «Tareas más recientes»", async () => {
    let vaciar = false
    cuerpoDelServidor = (c, t) => {
      const r = respuestaGradebook(c, t)
      return t !== null && vaciar ? sinAlumnos(r) : r
    }
    const { cliente } = montar()
    await esperarTabla()
    fireEvent.click(boton("Tareas más antiguas"))
    expect(await screen.findByRole("columnheader", { name: /^Tarea 4/ })).toBeInTheDocument()
    await reposar()
    vaciar = true
    await act(async () => {
      await cliente.invalidateQueries({ queryKey: ventana(null, CURSOR_TAREAS) })
    })
    await comprobarVentanaVacia()
    expect(boton("Tareas más recientes")).toBeInTheDocument()
    expect(sinBoton("Alumnos siguientes")).toBeNull()
    expect(sinBoton("Alumnos anteriores")).toBeNull()
  })
})

describe("isPlaceholderData: regresar desde la ventana vacía a una que ya no está en caché", () => {
  it.each([
    {
      dimension: "alumnos",
      avanzar: "Alumnos siguientes",
      regresar: "Alumnos anteriores",
      vaciar: (r: Respuesta, c: string | null, t: string | null) =>
        c !== null && t === null ? sinAlumnos(r) : r,
      llegada: /^Ana Ruiz/,
      rol: "row" as const,
    },
    {
      dimension: "tareas",
      avanzar: "Tareas más antiguas",
      regresar: "Tareas más recientes",
      vaciar: (r: Respuesta, c: string | null, t: string | null) =>
        t !== null && c === null ? sinTareas(r) : r,
      llegada: /^Tarea 1/,
      rol: "columnheader" as const,
    },
  ])(
    "CAL-T-206 ($dimension): mientras llega nunca se ve el vacío de la clase ni una tabla vieja; se ve el texto del cursor y los botones en espera; al llegar, la tabla",
    async ({ avanzar, regresar, vaciar, llegada, rol }) => {
      cuerpoDelServidor = (c, t) => vaciar(respuestaGradebook(c, t), c, t)
      const { cliente } = montar()
      await esperarTabla()
      fireEvent.click(boton(avanzar))
      await comprobarVentanaVacia()
      cliente.removeQueries({ queryKey: ventana(null, null), exact: true })
      const retenida = diferido()
      manejador = (l) =>
        l.cursor === null && l.cursorTareas === null ? retenida.promesa : undefined
      const vigia = vigilarTextos([SIN_ALUMNOS, SIN_TAREAS])
      fireEvent.click(boton(regresar))
      await waitFor(() =>
        expect(llamadas.at(-1)).toMatchObject({ cursor: null, cursorTareas: null }),
      )
      await reposar()
      expect(screen.getByText(CURSOR_TEXTO)).toBeInTheDocument()
      expect(screen.queryByRole("table")).toBeNull()
      expect(screen.getAllByRole("alert")).toHaveLength(1)
      for (const b of screen.queryAllByRole("button", { name: /Alumnos|Tareas/ })) {
        expect(b).toHaveAttribute("aria-busy", "true")
      }
      await act(async () => {
        retenida.resolver(respuestaJson(200, respuestaGradebook(null, null)))
        await retenida.promesa
      })
      expect(await screen.findByRole(rol, { name: llegada })).toBeInTheDocument()
      await reposar()
      vigia.parar()
      expect([...vigia.vistos]).toEqual([])
      expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
      expect(sinBoton(regresar)).toBeNull()
      expect(document.activeElement).toBe(encabezado())
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )

  it("CAL-T-207: si la primera ventana a la que se regresa llega vacía de verdad (todos salieron), entonces sí dice «Aún no hay alumnos en esta clase.», sin botones ni el texto del cursor", async () => {
    let todosSalieron = false
    cuerpoDelServidor = (c, t) => {
      const r = respuestaGradebook(c, t)
      if (c !== null || todosSalieron) return sinAlumnos(r)
      return r
    }
    const { cliente } = montar()
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    await comprobarVentanaVacia()
    cliente.removeQueries({ queryKey: ventana(null, null), exact: true })
    todosSalieron = true
    fireEvent.click(boton("Alumnos anteriores"))
    expect(await screen.findByText(SIN_ALUMNOS)).toBeInTheDocument()
    await reposar()
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
    expect(screen.queryByRole("button", { name: /Alumnos|Tareas/ })).toBeNull()
    expect(document.activeElement).not.toBe(document.body)
  })
})

describe("La pila al regresar y volver a avanzar", () => {
  it("CAL-T-208: si la ventana anterior se recargó con otro siguienteCursor, volver a avanzar pide el nuevo y nunca el cursor muerto", async () => {
    let cambio = false
    cuerpoDelServidor = (c, t) => {
      const r = respuestaGradebook(c, t)
      if (c === null) return cambio ? { ...r, siguienteCursor: OTRO_CURSOR_ALUMNOS } : r
      if (c === CURSOR_ALUMNOS) return sinAlumnos(r)
      return { ...r, alumnos: ALUMNOS_C.map((a) => fila(a, r.tareas)) }
    }
    montar()
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    await comprobarVentanaVacia()
    cambio = true
    const desde = llamadas.length
    fireEvent.click(boton("Alumnos anteriores"))
    expect(await screen.findByRole("row", { name: /^Ana Ruiz/ })).toBeInTheDocument()
    await waitFor(() => expect(llamadas.slice(desde).some((l) => l.cursor === null)).toBe(true))
    await reposar()
    fireEvent.click(boton("Alumnos siguientes"))
    expect(await screen.findByRole("row", { name: /^Dora Peña/ })).toBeInTheDocument()
    await reposar()
    expect(llamadas.at(-1)).toMatchObject({ cursor: OTRO_CURSOR_ALUMNOS })
    expect(llamadas.slice(desde).some((l) => l.cursor === CURSOR_ALUMNOS)).toBe(false)
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
  })

  it("CAL-T-209: durante la recarga de la ventana anterior, «Alumnos siguientes» está en espera y un clic no pide el cursor muerto", async () => {
    let cambio = false
    cuerpoDelServidor = (c, t) => {
      const r = respuestaGradebook(c, t)
      if (c === null) return cambio ? { ...r, siguienteCursor: OTRO_CURSOR_ALUMNOS } : r
      if (c === CURSOR_ALUMNOS) return sinAlumnos(r)
      return { ...r, alumnos: ALUMNOS_C.map((a) => fila(a, r.tareas)) }
    }
    montar()
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    await comprobarVentanaVacia()
    cambio = true
    const retenida = diferido()
    manejador = (l) => (l.cursor === null ? retenida.promesa : undefined)
    const desde = llamadas.length
    fireEvent.click(boton("Alumnos anteriores"))
    expect(await screen.findByRole("row", { name: /^Ana Ruiz/ })).toBeInTheDocument()
    const siguientes = boton("Alumnos siguientes")
    expect(siguientes).toHaveAttribute("aria-busy", "true")
    fireEvent.click(siguientes)
    fireEvent.click(siguientes)
    await reposar()
    expect(llamadas.slice(desde).some((l) => l.cursor === CURSOR_ALUMNOS)).toBe(false)
    await act(async () => {
      retenida.resolver(
        respuestaJson(200, {
          ...respuestaGradebook(null, null),
          siguienteCursor: OTRO_CURSOR_ALUMNOS,
        }),
      )
      await retenida.promesa
    })
    await reposar()
    manejador = () => undefined
    fireEvent.click(boton("Alumnos siguientes"))
    expect(await screen.findByRole("row", { name: /^Dora Peña/ })).toBeInTheDocument()
    expect(llamadas.slice(desde).some((l) => l.cursor === CURSOR_ALUMNOS)).toBe(false)
  })
})

describe("Contratos rotos e incoherencias del servidor", () => {
  it("CAL-T-210: siguienteCursor no nulo con la lista de alumnos vacía en una ventana con cursor: un solo texto, «Alumnos anteriores» y «Alumnos siguientes» (que pide ese cursor) y ninguna caída", async () => {
    cuerpoDelServidor = (c, t) => {
      const r = respuestaGradebook(c, t)
      if (c === CURSOR_ALUMNOS) return { ...r, alumnos: [], siguienteCursor: CURSOR_ALUMNOS_2 }
      return r
    }
    montar()
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    await comprobarVentanaVacia()
    expect(boton("Alumnos anteriores")).toBeInTheDocument()
    const siguientes = boton("Alumnos siguientes")
    enfocar(siguientes)
    fireEvent.click(siguientes)
    expect(await screen.findByRole("row", { name: /^Carla Gómez/ })).toBeInTheDocument()
    await reposar()
    expect(llamadas.at(-1)).toMatchObject({ cursor: CURSOR_ALUMNOS_2 })
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
  })

  it("CAL-T-211: la primera ventana con alumnos vacíos y siguienteCursor no nulo (contrato roto): el vacío de la clase, sin botones, sin alert y sin caída", async () => {
    cuerpoDelServidor = (c, t) => ({ ...respuestaGradebook(c, t), alumnos: [] })
    montar()
    expect(await screen.findByText(SIN_ALUMNOS)).toBeInTheDocument()
    await reposar()
    expect(screen.queryByRole("button", { name: /Alumnos|Tareas/ })).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(llamadas).toHaveLength(1)
  })

  it("CAL-T-212: el resumen dice 0 alumnos y la ventana con cursor llega vacía (incoherencia): «0 alumnos», el texto del cursor y el regreso, nunca «Aún no hay alumnos»", async () => {
    cuerpoDelServidor = (c, t) => {
      const r = respuestaGradebook(c, t)
      if (c === null) return r
      return {
        ...sinAlumnos(r),
        resumen: { ...r.resumen, totalAlumnos: 0, promedioDeLaClase: null },
      }
    }
    montar()
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    await comprobarVentanaVacia("0 alumnos")
    expect(screen.getByText("Promedio de la clase: —")).toBeInTheDocument()
    expect(boton("Alumnos anteriores")).toBeInTheDocument()
  })

  it("CAL-T-213: la ventana no vive en la URL: con ?cursor y ?cursorTareas en la dirección, la primera carga no los manda y una clase vacía dice su vacío", async () => {
    cuerpoDelServidor = (c, t) => sinAlumnos(respuestaGradebook(c, t))
    montar(
      nuevoCliente(),
      `/maestro/clases/${CLASE_ID}/calificaciones?cursor=${CURSOR_ALUMNOS}&cursorTareas=${CURSOR_TAREAS}`,
    )
    expect(await screen.findByText(SIN_ALUMNOS)).toBeInTheDocument()
    await reposar()
    expect(llamadas).toHaveLength(1)
    expect(llamadas[0]).toMatchObject({ cursor: null, cursorTareas: null })
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
  })
})

describe("El texto del cursor, la vista desmontada y el foco", () => {
  it("CAL-T-214: el 400 de cursorTareas y la ventana de tareas vacía dicen exactamente el mismo texto; el 400 reemplaza la vista (sin h2) y la vacía conserva h2, resumen y regreso", async () => {
    let modo: "vacia" | "400" = "vacia"
    manejador = (l) =>
      l.cursorTareas !== null && modo === "400"
        ? errorApi(400, "VALIDACION", "cursorTareas: no es válido")
        : undefined
    cuerpoDelServidor = (c, t) => {
      const r = respuestaGradebook(c, t)
      return t !== null ? sinTareas(r) : r
    }
    const primera = montar()
    await esperarTabla()
    fireEvent.click(boton("Tareas más antiguas"))
    await comprobarVentanaVacia()
    expect(boton("Tareas más recientes")).toBeInTheDocument()
    const textoVacia = screen.getByRole("alert").textContent
    primera.unmount()
    modo = "400"
    montar()
    await esperarTabla()
    fireEvent.click(boton("Tareas más antiguas"))
    expect(await screen.findByText(CURSOR_TEXTO)).toBeInTheDocument()
    await reposar()
    expect(screen.getByRole("alert").textContent).toBe(textoVacia)
    expect(screen.queryByRole("heading", { name: "Calificaciones", level: 2 })).toBeNull()
    expect(document.body.textContent).not.toContain("cursorTareas")
  })

  it("CAL-T-215: en la ventana vacía, pulsar el botón de avanzar de la otra dimensión que sigue a la vista pide los dos cursores; el foco va al h2 al desaparecer ese botón", async () => {
    cuerpoDelServidor = (c, t) => {
      const r = respuestaGradebook(c, t)
      return c !== null ? sinAlumnos(r) : r
    }
    montar()
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    await comprobarVentanaVacia()
    const antiguas = boton("Tareas más antiguas")
    enfocar(antiguas)
    fireEvent.click(antiguas)
    await waitFor(() =>
      expect(llamadas.at(-1)).toMatchObject({
        cursor: CURSOR_ALUMNOS,
        cursorTareas: CURSOR_TAREAS,
      }),
    )
    await waitFor(() => expect(sinBoton("Tareas más antiguas")).toBeNull())
    await comprobarVentanaVacia()
    expect(boton("Tareas más recientes")).toBeInTheDocument()
    expect(boton("Alumnos anteriores")).toBeInTheDocument()
    expect(document.activeElement).toBe(encabezado())
  })

  it("CAL-T-216: con la vista desmontada mientras se regresa desde la ventana vacía (respuesta en vuelo), ni aviso ni console.error; al volver a montar, la primera ventana", async () => {
    const consola = vi.spyOn(console, "error")
    cuerpoDelServidor = (c, t) => {
      const r = respuestaGradebook(c, t)
      return c !== null ? sinAlumnos(r) : r
    }
    const cliente = nuevoCliente()
    const primera = montar(cliente)
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    await comprobarVentanaVacia()
    cliente.removeQueries({ queryKey: ventana(null, null), exact: true })
    const retenida = diferido()
    manejador = (l) => (l.cursor === null ? retenida.promesa : undefined)
    fireEvent.click(boton("Alumnos anteriores"))
    await waitFor(() => expect(llamadas.at(-1)).toMatchObject({ cursor: null }))
    primera.unmount()
    await act(async () => {
      retenida.resolver(respuestaJson(200, respuestaGradebook(null, null)))
      await retenida.promesa
    })
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
    expect(consola).not.toHaveBeenCalled()
    manejador = () => undefined
    montar(cliente)
    expect(await screen.findByRole("row", { name: /^Ana Ruiz/ })).toBeInTheDocument()
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
  })
})

describe("La instrucción del texto del cursor: «Vuelve a abrir Calificaciones para verlas completas»", () => {
  // La persona sigue la instrucción: sale de Calificaciones y vuelve a entrar (la vista se desmonta y
  // se vuelve a montar con la QueryClient de la app, staleTime de 30 s). Para entonces el servidor ya
  // no tiene al alumno 3: la primera ventana trae 2 alumnos y ningún cursor siguiente. Lo que se ve al
  // volver a abrir debe ser eso, no la ventana de la caché con el cursor muerto.
  it("CAL-T-217: tras la ventana vacía, volver a abrir Calificaciones (antes de 30 s) muestra la clase como está: «2 alumnos» y sin «Alumnos siguientes»", async () => {
    let salio = false
    cuerpoDelServidor = (c, t) => {
      const r = respuestaGradebook(c, t)
      if (c !== null) return sinAlumnos({ ...r, resumen: { ...r.resumen, totalAlumnos: 2 } })
      if (salio) return { ...r, siguienteCursor: null, resumen: { ...r.resumen, totalAlumnos: 2 } }
      return r
    }
    const cliente = nuevoCliente(STALE_DE_PRODUCCION)
    const primera = montar(cliente)
    await esperarTabla()
    salio = true
    fireEvent.click(boton("Alumnos siguientes"))
    await comprobarVentanaVacia("2 alumnos")
    primera.unmount()
    montar(cliente)
    await esperarTabla()
    await reposar()
    expect(screen.getByText("2 alumnos")).toBeInTheDocument()
    expect(sinBoton("Alumnos siguientes")).toBeNull()
  })

  it("CAL-T-218: tras el 400 del cursor, volver a abrir Calificaciones (antes de 30 s) muestra la clase como está: sin el «Alumnos siguientes» que lleva al cursor muerto", async () => {
    let salio = false
    manejador = (l) =>
      l.cursor !== null ? errorApi(400, "VALIDACION", "cursor: no es válido") : undefined
    cuerpoDelServidor = (c, t) => {
      const r = respuestaGradebook(c, t)
      if (salio) return { ...r, siguienteCursor: null, resumen: { ...r.resumen, totalAlumnos: 2 } }
      return r
    }
    const cliente = nuevoCliente(STALE_DE_PRODUCCION)
    const primera = montar(cliente)
    await esperarTabla()
    salio = true
    fireEvent.click(boton("Alumnos siguientes"))
    expect(await screen.findByText(CURSOR_TEXTO)).toBeInTheDocument()
    primera.unmount()
    montar(cliente)
    await esperarTabla()
    await reposar()
    expect(screen.getByText("2 alumnos")).toBeInTheDocument()
    expect(sinBoton("Alumnos siguientes")).toBeNull()
  })

  it("CAL-T-219 (control): pasado el staleTime, volver a abrir sí muestra la clase como está (la instrucción funciona cuando la caché ya es vieja)", async () => {
    let salio = false
    cuerpoDelServidor = (c, t) => {
      const r = respuestaGradebook(c, t)
      if (c !== null) return sinAlumnos({ ...r, resumen: { ...r.resumen, totalAlumnos: 2 } })
      if (salio) return { ...r, siguienteCursor: null, resumen: { ...r.resumen, totalAlumnos: 2 } }
      return r
    }
    const cliente = nuevoCliente(STALE_DE_PRODUCCION)
    const primera = montar(cliente)
    await esperarTabla()
    salio = true
    fireEvent.click(boton("Alumnos siguientes"))
    await comprobarVentanaVacia("2 alumnos")
    primera.unmount()
    vi.setSystemTime(new Date(AHORA.getTime() + STALE_DE_PRODUCCION + 1_000))
    montar(cliente)
    await waitFor(() => expect(screen.getByText("2 alumnos")).toBeInTheDocument())
    await reposar()
    expect(sinBoton("Alumnos siguientes")).toBeNull()
  })
})
