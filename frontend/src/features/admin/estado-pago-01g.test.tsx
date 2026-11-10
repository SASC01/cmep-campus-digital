import { accesoSchema, estadoPagoLoteSchema, listaUsuariosConsultaSchema } from "@campus/shared"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { MENSAJE_DE_PRUEBA } from "@/lib/errores-de-api-fuera-de-contrato"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// ADMIN-01g: /admin/estado-pago con el router real (rutas de app/router) y un QueryClient con la
// configuración de app/providers.tsx (staleTime de 30 s, un reintento salvo ante un 4xx en las consultas de
// admin, sin recarga al volver a la ventana). Se crea aquí, igual, para poder simular "la recarga pasado el
// staleTime" o "otro admin cambió la cuenta" con invalidateQueries. El servidor es un doble en memoria; lo
// que nadie responde es un 500 "no esperada". El carácter nulo se escribe con su código.

const navegacion = vi.hoisted(() => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin") }))
vi.mock("@/services/navegacion", () => navegacion)
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const NULO = String.fromCharCode(0)
const GENERICO = "No pudimos completar la operación. Inténtalo de nuevo."
const ERROR_TABLA = "No pudimos cargar los alumnos. Revisa tu conexión e inténtalo de nuevo."
const LISTA_CAMBIADA = "La lista cambió mientras la veías. Vuelve a abrirla para verla completa."
const ESPERA = { timeout: 4000 }
const RUTA_LOTE = "/api/admin/alumnos/estado-pago"

type Estado = "deudor" | "al_corriente"

interface Alumno {
  id: string
  nombre: string
  email: string
  rol: "estudiante"
  activo: boolean
  creadoEn: string
  estadoPago: Estado
  fechaEstadoPago: string | null
  accesoRestringido: boolean
  motivoRestriccion: string | null
  fechaRestriccion: string | null
}

const alumno = (n: number, estadoPago: Estado = "al_corriente", extra: Partial<Alumno> = {}) => ({
  id: `5a5b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`,
  nombre: `Alumno ${String(n).padStart(3, "0")}`,
  email: `a${String(n)}@ejemplo.mx`,
  rol: "estudiante" as const,
  activo: true,
  creadoEn: "2026-09-01T15:00:00.000Z",
  estadoPago,
  fechaEstadoPago: null,
  accesoRestringido: false,
  motivoRestriccion: null,
  fechaRestriccion: null,
  ...extra,
})

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const validacion = (mensaje: string) => errorJson(400, "VALIDACION", mensaje)

const pagina = (usuarios: Alumno[], siguiente: { cursor: string; nombre: string } | null = null) =>
  respuestaJson(200, {
    usuarios,
    siguienteCursor: siguiente?.cursor ?? null,
    siguienteCursorNombre: siguiente?.nombre ?? null,
  })

interface Llamada {
  metodo: string
  url: URL
  cuerpo: unknown
}

type Respuesta = Response | Promise<Response>

let llamadas: Llamada[] = []
let alumnos: Alumno[] = []
let tabla: (url: URL) => Respuesta = () => pagina([])
let accion: (metodo: string, ruta: string, cuerpo: unknown) => Respuesta | null = () => null
let refrescoFalla = false

// La tabla por omisión: los alumnos del doble, filtrados como el servidor (estadoPago y q).
const tablaDelDoble = (url: URL) => {
  const estado = url.searchParams.get("estadoPago")
  const q = url.searchParams.get("q")?.toLowerCase()
  return pagina(
    alumnos.filter(
      (a) =>
        (estado === null || a.estadoPago === estado) &&
        (q === undefined || a.nombre.toLowerCase().includes(q)),
    ),
  )
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  llamadas = []
  alumnos = [alumno(1, "deudor"), alumno(2, "al_corriente"), alumno(3, "deudor")]
  tabla = tablaDelDoble
  accion = () => null
  refrescoFalla = false
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = new URL(String(entrada), "http://local")
      const metodo = init?.method ?? "GET"
      const cuerpo = init?.body === undefined ? undefined : JSON.parse(String(init.body))
      llamadas.push({ metodo, url, cuerpo })
      if (url.pathname === "/api/auth/refrescar") {
        return Promise.resolve(
          refrescoFalla
            ? errorJson(401, "NO_AUTENTICADO")
            : respuestaJson(200, { tokenAcceso: "token-de-prueba" }),
        )
      }
      if (url.pathname === "/api/me") {
        return Promise.resolve(
          respuestaJson(200, {
            id: "d9a8c3c2-3333-4da0-9c3a-2b4c5d6e7f80",
            nombre: "Administración",
            email: "admin@ejemplo.mx",
            rol: "admin",
            debeCambiarContrasena: false,
            accesoRestringido: false,
          }),
        )
      }
      const propia = accion(metodo, url.pathname, cuerpo)
      if (propia !== null) return Promise.resolve(propia)
      if (metodo === "GET" && url.pathname === "/api/admin/usuarios") {
        return Promise.resolve(tabla(url))
      }
      if (metodo === "GET" && url.pathname === "/api/admin/resumen") {
        return Promise.resolve(respuestaJson(200, { alumnos: 3, maestros: 1, clasesActivas: 1 }))
      }
      if (metodo === "GET" && url.pathname === "/api/admin/movimientos-inscripcion") {
        return Promise.resolve(respuestaJson(200, { movimientos: [], siguienteCursor: null }))
      }
      if (metodo === "GET" && url.pathname === "/api/admin/enlaces-registro") {
        return Promise.resolve(respuestaJson(200, { enlaces: [], siguienteCursor: null }))
      }
      return Promise.resolve(errorJson(500, "ERROR_INTERNO", "no esperada"))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  aviso.success.mockClear()
  aviso.error.mockClear()
  navegacion.irA.mockClear()
})

const montar = async (ruta = "/admin/estado-pago") => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  await screen.findByRole("navigation", { name: "Navegación principal" })
  return { router, queryClient }
}

const montarConTabla = async () => {
  const montada = await montar()
  await screen.findByRole("table", {}, ESPERA)
  return montada
}

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

const recargar = async (queryClient: QueryClient) => {
  await act(async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "usuarios", "lista"] })
  })
  await reposar()
}

const diferida = () => {
  let resolver: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver: (respuesta: Response) => resolver(respuesta) }
}

const filaDe = (n: number) => {
  const fila = document.querySelector<HTMLElement>(`[data-alumno-id="${alumno(n).id}"]`)
  if (fila === null) throw new Error(`Precondición: la fila ${String(n)} está en la tabla`)
  return fila
}

const botonDeMarcar = (n: number) =>
  within(filaDe(n)).getByRole("button", { name: /^Marcar (como deudor|al corriente) / })
const botonDeAcceso = (n: number) =>
  within(filaDe(n)).getByRole("button", { name: /^(Restringir|Restablecer) / })
const casilla = (n: number) => within(filaDe(n)).getByRole("checkbox")
const casillaDeLaCabecera = () =>
  screen.getByRole("checkbox", { name: "Seleccionar los de esta página" })
const boton = (nombre: string) => screen.getByRole("button", { name: nombre })
const peticiones = (metodo: string, ruta: string) =>
  llamadas.filter((l) => l.metodo === metodo && l.url.pathname === ruta)
const pedidasDeLaTabla = () => peticiones("GET", "/api/admin/usuarios")
const esperarLaBusqueda = () => act(() => new Promise((r) => setTimeout(r, 450)))
const elegirFiltro = async (valor: string) => {
  fireEvent.change(screen.getByLabelText("Estado de pago"), { target: { value: valor } })
  await reposar()
}
const buscar = async (texto: string) => {
  fireEvent.change(screen.getByLabelText("Buscar por nombre o correo"), {
    target: { value: texto },
  })
  await esperarLaBusqueda()
}
const enLaBarra = async (seccion: string) => {
  const nav = screen.getByRole("navigation", { name: "Navegación principal" })
  fireEvent.click(within(nav).getByRole("link", { name: seccion }))
  await reposar()
}
const encabezado = () => screen.getByRole("heading", { level: 1, name: "Estado de pago" })
const raiz = () => {
  const contenedor = encabezado().parentElement?.closest('[tabindex="-1"]')
  if (contenedor === null || contenedor === undefined) throw new Error("Precondición: la raíz")
  return contenedor
}
const alertasAccesibles = () => screen.queryAllByRole("alert")
const alertasEnElDocumento = () => document.querySelectorAll('[role="alert"]')

const mensajeReal = (
  resultado: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } },
  campo: string,
) => {
  const incidencia = resultado.error?.issues.find((i) => i.path[0] === campo)
  if (incidencia === undefined) throw new Error(`Precondición: el esquema rechaza ${campo}`)
  return `${incidencia.path.join(".")}: ${incidencia.message}`
}

const INGLES_ESTADO_PAGO = mensajeReal(
  estadoPagoLoteSchema.safeParse({ alumnoIds: [alumno(1).id], estadoPago: "x" }),
  "estadoPago",
)
const INGLES_RESTRINGIDO = mensajeReal(accesoSchema.safeParse({ restringido: "si" }), "restringido")
const INGLES_ESTADO_PAGO_DEL_FILTRO = mensajeReal(
  listaUsuariosConsultaSchema.safeParse({ estadoPago: "x" }),
  "estadoPago",
)

// La fila responde lo que diga `responder`, y deja en el doble el estado que mandó si sale bien.
const conLoteQueResponde = (
  responder: (cuerpo: { alumnoIds: string[]; estadoPago: Estado }) => Respuesta,
) => {
  accion = (metodo, ruta, cuerpo) => {
    if (metodo !== "PUT" || ruta !== RUTA_LOTE) return null
    return responder(cuerpo as { alumnoIds: string[]; estadoPago: Estado })
  }
}

const aplicarLote = (cuerpo: { alumnoIds: string[]; estadoPago: Estado }) => {
  alumnos = alumnos.map((a) =>
    cuerpo.alumnoIds.includes(a.id) ? { ...a, estadoPago: cuerpo.estadoPago } : a,
  )
  return respuestaJson(200, { actualizados: cuerpo.alumnoIds.length })
}

describe("ADMIN-01g · /admin/estado-pago: búsqueda, filtro, selección, lote y fila (ADM-1G01)", () => {
  it("ADM-1G01: la búsqueda manda q con rol=estudiante; el filtro manda estadoPago; la selección (de una en una y la de la cabecera), la barra, el diálogo con el conteo, una petición con los ids y el aviso con N", async () => {
    conLoteQueResponde(aplicarLote)
    await montarConTabla()
    expect(pedidasDeLaTabla()[0]?.url.searchParams.get("rol")).toBe("estudiante")

    fireEvent.click(casilla(1))
    expect(screen.getByText("1 seleccionado")).toBeInTheDocument()
    fireEvent.click(casillaDeLaCabecera())
    expect(screen.getByText("3 seleccionados")).toBeInTheDocument()
    fireEvent.click(boton("Marcar como deudores"))
    const dialogo = await screen.findByRole("dialog")
    expect(dialogo).toHaveAttribute("data-material", "opaco")
    expect(dialogo).toHaveAttribute("data-densidad", "densa")
    expect(within(dialogo).getByText("Se marcarán 3 alumnos como deudores.")).toBeInTheDocument()
    fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, cambiar" }))
    fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, cambiar" }))

    await waitFor(() =>
      expect(aviso.success).toHaveBeenCalledWith("Estado de pago actualizado en 3 alumnos"),
    )
    const lote = peticiones("PUT", RUTA_LOTE)
    expect(lote).toHaveLength(1)
    expect(lote[0]?.cuerpo).toEqual({
      alumnoIds: [alumno(1).id, alumno(2).id, alumno(3).id],
      estadoPago: "deudor",
    })
    await waitFor(() => expect(screen.queryByText(/seleccionad/)).toBeNull())

    await elegirFiltro("deudor")
    await waitFor(() =>
      expect(pedidasDeLaTabla().at(-1)?.url.searchParams.get("estadoPago")).toBe("deudor"),
    )
    await buscar("alumno 001")
    await waitFor(() =>
      expect(pedidasDeLaTabla().at(-1)?.url.searchParams.get("q")).toBe("alumno 001"),
    )
    expect(pedidasDeLaTabla().at(-1)?.url.searchParams.get("rol")).toBe("estudiante")
  })

  it("ADM-1G01: «Marcar…» de la fila va sin diálogo, con una petición por dos clics y el estado contrario", async () => {
    conLoteQueResponde(aplicarLote)
    await montarConTabla()
    fireEvent.click(botonDeMarcar(1))
    fireEvent.click(botonDeMarcar(1))
    expect(screen.queryByRole("dialog")).toBeNull()
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Estado de pago actualizado"))
    const lote = peticiones("PUT", RUTA_LOTE)
    expect(lote).toHaveLength(1)
    expect(lote[0]?.cuerpo).toEqual({ alumnoIds: [alumno(1).id], estadoPago: "al_corriente" })
    await waitFor(() => expect(botonDeMarcar(1)).toHaveAccessibleName(/^Marcar como deudor /))
  })

  it("la columna «Desde» dice la fecha o «Sin cambios»; vacíos según el filtro y la búsqueda", async () => {
    alumnos = [alumno(1, "deudor", { fechaEstadoPago: "2026-10-01T15:00:00.000Z" })]
    await montarConTabla()
    expect(within(filaDe(1)).queryByText("Sin cambios")).toBeNull()
    alumnos = [alumno(1, "deudor")]
    cleanup()
    await montarConTabla()
    expect(within(filaDe(1)).getByText("Sin cambios")).toBeInTheDocument()
    await elegirFiltro("al_corriente")
    expect(await screen.findByText("No hay alumnos al corriente")).toBeInTheDocument()
    await elegirFiltro("todos")
    await buscar("zzz")
    expect(await screen.findByText("No encontramos alumnos con esa búsqueda")).toBeInTheDocument()
    alumnos = []
    cleanup()
    await montar()
    expect(await screen.findByText("Aún no hay alumnos")).toBeInTheDocument()
    await elegirFiltro("deudor")
    expect(await screen.findByText("No hay alumnos deudores")).toBeInTheDocument()
  })
})

describe("ADMIN-01g · VALIDACION fuera de contrato del lote (ADM-1G02)", () => {
  const abrirLoteConUno = async () => {
    const montada = await montarConTabla()
    fireEvent.click(casilla(1))
    fireEvent.click(boton("Marcar al corriente"))
    const dialogo = await screen.findByRole("dialog")
    return { ...montada, dialogo }
  }

  it.each([
    ["(a) estadoPago: de prueba", `estadoPago: ${MENSAJE_DE_PRUEBA}`, GENERICO],
    ["(a) estadoPago: real en inglés", INGLES_ESTADO_PAGO, GENERICO],
    ["(b) vacío", "", GENERICO],
    ["(b) espacios", "   ", GENERICO],
    ["(c) alumnoIds.3:", `alumnoIds.3: ${MENSAJE_DE_PRUEBA}`, MENSAJE_DE_PRUEBA],
    [
      "(e) motivo: (pintado en el diálogo de restringir)",
      `motivo: ${MENSAJE_DE_PRUEBA}`,
      MENSAJE_DE_PRUEBA,
    ],
  ])(
    "ADM-1G02 %s: un solo MensajeError en el diálogo, sin aviso ni inglés; la selección se conserva y el botón sale de la espera",
    async (_caso, mensaje, esperado) => {
      conLoteQueResponde(() => validacion(mensaje))
      const { dialogo } = await abrirLoteConUno()
      fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, cambiar" }))
      await waitFor(() => expect(alertasAccesibles()).toHaveLength(1))
      expect(within(dialogo).getByRole("alert")).toHaveTextContent(esperado)
      expect(alertasEnElDocumento()).toHaveLength(1)
      expect(aviso.error).not.toHaveBeenCalled()
      expect(document.body.textContent).not.toMatch(/Invalid|expected|estadoPago:|alumnoIds/)
      expect(within(dialogo).getByText("Se marcará 1 alumno al corriente.")).toBeInTheDocument()
      await waitFor(() =>
        expect(within(dialogo).getByRole("button", { name: "Sí, cambiar" })).not.toHaveAttribute(
          "aria-busy",
          "true",
        ),
      )
    },
  )

  it("ADM-1G02 (d) y ADM-1G18 (c): un rechazo del servidor y después, con la fila elegida cambiada, «Sí, cambiar» da «Elige al menos un alumno», un solo mensaje y sin petición", async () => {
    conLoteQueResponde(() => validacion(`estadoPago: ${MENSAJE_DE_PRUEBA}`))
    const { dialogo, queryClient } = await abrirLoteConUno()
    fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, cambiar" }))
    await within(dialogo).findByRole("alert")

    alumnos = alumnos.map((a) => (a.id === alumno(1).id ? { ...a, estadoPago: "al_corriente" } : a))
    await recargar(queryClient)
    await waitFor(() =>
      expect(within(dialogo).getByText("Se marcarán 0 alumnos al corriente.")).toBeInTheDocument(),
    )
    fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, cambiar" }))

    await waitFor(() =>
      expect(within(dialogo).getByRole("alert")).toHaveTextContent("Elige al menos un alumno"),
    )
    expect(alertasEnElDocumento()).toHaveLength(1)
    expect(peticiones("PUT", RUTA_LOTE)).toHaveLength(1)
  })
})

describe("ADMIN-01g · VALIDACION fuera de contrato del cambio desde la fila (ADM-1G01b)", () => {
  it.each([
    ["(a) estadoPago: de prueba", `estadoPago: ${MENSAJE_DE_PRUEBA}`, GENERICO],
    ["(a) estadoPago: real en inglés", INGLES_ESTADO_PAGO, GENERICO],
    ["(b) vacío", "", GENERICO],
    ["(b) espacios", "   ", GENERICO],
    ["(c) alumnoIds.0:", `alumnoIds.0: ${MENSAJE_DE_PRUEBA}`, MENSAJE_DE_PRUEBA],
    ["(d) motivo:", `motivo: ${MENSAJE_DE_PRUEBA}`, MENSAJE_DE_PRUEBA],
  ])(
    "ADM-1G01b %s: un solo MensajeError en la fila, sin aviso ni inglés; la fila conserva su estado, su botón sale de la espera y la selección no cambia",
    async (_caso, mensaje, esperado) => {
      conLoteQueResponde(() => validacion(mensaje))
      await montarConTabla()
      fireEvent.click(casilla(2))
      fireEvent.click(botonDeMarcar(1))
      await waitFor(() => expect(within(filaDe(1)).getByRole("alert")).toHaveTextContent(esperado))
      expect(alertasEnElDocumento()).toHaveLength(1)
      expect(aviso.error).not.toHaveBeenCalled()
      expect(document.body.textContent).not.toMatch(/Invalid|expected|estadoPago:|alumnoIds/)
      expect(within(filaDe(1)).getByText("Deudor")).toBeInTheDocument()
      await waitFor(() => expect(botonDeMarcar(1)).not.toHaveAttribute("aria-busy", "true"))
      expect(screen.getByText("1 seleccionado")).toBeInTheDocument()
    },
  )

  it("ADM-1G01b (e): con el mensaje de la fila a la vista, abrir el diálogo del lote lo quita; con la única elegida fuera de la selección, «Sí, cambiar» deja exactamente un alert, el del diálogo; al cerrar, ninguno", async () => {
    let fallarFila = true
    conLoteQueResponde((cuerpo) => {
      if (fallarFila && cuerpo.alumnoIds[0] === alumno(1).id) return validacion(INGLES_ESTADO_PAGO)
      return aplicarLote(cuerpo)
    })
    const { queryClient } = await montarConTabla()
    fireEvent.click(casilla(3))
    fireEvent.click(botonDeMarcar(1))
    await within(filaDe(1)).findByRole("alert")
    fallarFila = false

    fireEvent.click(boton("Marcar al corriente"))
    const dialogo = await screen.findByRole("dialog")
    expect(alertasEnElDocumento()).toHaveLength(0)
    alumnos = alumnos.map((a) => (a.id === alumno(3).id ? { ...a, estadoPago: "al_corriente" } : a))
    await recargar(queryClient)
    fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, cambiar" }))
    await waitFor(() => expect(alertasEnElDocumento()).toHaveLength(1))
    expect(within(dialogo).getByRole("alert")).toHaveTextContent("Elige al menos un alumno")

    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(alertasEnElDocumento()).toHaveLength(0)
  })

  it("ADM-1G01b (e), hermano: con el mensaje de la fila a la vista, abrir el diálogo de restringir de otra fila lo quita y al cerrarlo no vuelve", async () => {
    conLoteQueResponde(() => validacion(`estadoPago: ${MENSAJE_DE_PRUEBA}`))
    await montarConTabla()
    fireEvent.click(botonDeMarcar(1))
    await within(filaDe(1)).findByRole("alert")
    fireEvent.click(botonDeAcceso(2))
    const dialogo = await screen.findByRole("dialog")
    expect(alertasEnElDocumento()).toHaveLength(0)
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(alertasEnElDocumento()).toHaveLength(0)
  })

  it("ADM-1G01b (M-25): con la tabla en error, un diálogo abierto cuya acción falla deja dos alert en el documento y uno accesible, el del diálogo; al cerrarlo queda el de carga", async () => {
    let tablaFalla = false
    tabla = (url) => (tablaFalla ? errorJson(500, "ERROR_INTERNO") : tablaDelDoble(url))
    accion = (metodo, ruta) =>
      metodo === "PUT" && ruta.endsWith("/acceso") ? errorJson(500, "ERROR_INTERNO") : null
    const { queryClient } = await montarConTabla()
    fireEvent.click(botonDeAcceso(2))
    const dialogo = await screen.findByRole("dialog")
    tablaFalla = true
    await recargar(queryClient)
    await waitFor(() => expect(screen.getByText(ERROR_TABLA)).toBeInTheDocument(), ESPERA)
    fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, restringir" }))
    await within(dialogo).findByRole("alert")
    expect(alertasEnElDocumento()).toHaveLength(2)
    expect(alertasAccesibles()).toHaveLength(1)
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(alertasEnElDocumento()).toHaveLength(1)
    expect(screen.getByRole("alert")).toHaveTextContent(ERROR_TABLA)
  })
})

describe("ADMIN-01g · la columna «Acceso» (ADM-1G03, ADM-1G23)", () => {
  it("ADM-1G03: «Restringir» abre el diálogo (contexto opaco y denso, foco en «Cancelar»), manda el motivo y el botón pasa a «Restablecer», con el foco en él", async () => {
    accion = (metodo, ruta, cuerpo) => {
      if (metodo !== "PUT" || !ruta.endsWith("/acceso")) return null
      const datos = cuerpo as { restringido: boolean }
      alumnos = alumnos.map((a) =>
        a.id === alumno(2).id ? { ...a, accesoRestringido: datos.restringido } : a,
      )
      return respuestaJson(200, alumnos[1])
    }
    await montarConTabla()
    fireEvent.click(botonDeAcceso(2))
    const dialogo = await screen.findByRole("dialog")
    expect(dialogo).toHaveAttribute("data-material", "opaco")
    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(dialogo).getByRole("button", { name: "Cancelar" }),
      ),
    )
    fireEvent.change(within(dialogo).getByLabelText("Motivo (opcional)"), {
      target: { value: "Adeudo" },
    })
    fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, restringir" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(peticiones("PUT", `/api/admin/alumnos/${alumno(2).id}/acceso`)[0]?.cuerpo).toEqual({
      restringido: true,
      motivo: "Adeudo",
    })
    await waitFor(() => expect(botonDeAcceso(2)).toHaveAccessibleName(/^Restablecer /), ESPERA)
    expect(within(filaDe(2)).getByText("Restringido")).toBeInTheDocument()
    await waitFor(() => expect(document.activeElement).toBe(botonDeAcceso(2)))

    fireEvent.click(botonDeAcceso(2))
    fireEvent.click(botonDeAcceso(2))
    expect(screen.queryByRole("dialog")).toBeNull()
    await waitFor(() => expect(botonDeAcceso(2)).toHaveAccessibleName(/^Restringir /), ESPERA)
    expect(peticiones("PUT", `/api/admin/alumnos/${alumno(2).id}/acceso`)).toHaveLength(2)
    expect(aviso.success).toHaveBeenCalledWith("Acceso restablecido")
    expect(document.activeElement).toBe(botonDeAcceso(2))
  })

  it("ADM-1G03: «Cancelar» del diálogo de restringir devuelve el foco a «Restringir» de su fila", async () => {
    await montarConTabla()
    fireEvent.click(botonDeAcceso(2))
    const dialogo = await screen.findByRole("dialog")
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(document.activeElement).toBe(botonDeAcceso(2)))
  })

  const conRestringido = () => {
    alumnos = [alumno(1, "deudor", { accesoRestringido: true }), alumno(2), alumno(3, "deudor")]
  }

  it.each([
    ["(a) restringido: real en inglés", INGLES_RESTRINGIDO, GENERICO],
    ["(a) restringido: de prueba", `restringido: ${MENSAJE_DE_PRUEBA}`, GENERICO],
    ["(b) vacío", "", GENERICO],
    ["(b) espacios", "   ", GENERICO],
    ["(c) id.0:", `id.0: ${MENSAJE_DE_PRUEBA}`, MENSAJE_DE_PRUEBA],
    ["(d) motivo:", `motivo: ${MENSAJE_DE_PRUEBA}`, MENSAJE_DE_PRUEBA],
  ])(
    "ADM-1G23 %s: un solo MensajeError en la fila, sin aviso; la fila conserva su estado y el botón sale de la espera",
    async (_caso, mensaje, esperado) => {
      conRestringido()
      accion = (metodo, ruta) =>
        metodo === "PUT" && ruta.endsWith("/acceso") ? validacion(mensaje) : null
      await montarConTabla()
      fireEvent.click(botonDeAcceso(1))
      await waitFor(() => expect(within(filaDe(1)).getByRole("alert")).toHaveTextContent(esperado))
      expect(alertasEnElDocumento()).toHaveLength(1)
      expect(aviso.error).not.toHaveBeenCalled()
      expect(document.body.textContent).not.toMatch(/Invalid|expected|restringido:|id\.0/)
      expect(within(filaDe(1)).getByText("Restringido")).toBeInTheDocument()
      await waitFor(() => expect(botonDeAcceso(1)).not.toHaveAttribute("aria-busy", "true"))
    },
  )

  it("ADM-1G23 (e): un 400 y después abrir y cerrar el diálogo de restringir de esa fila (otra fila sin restricción): el mensaje viejo no vuelve", async () => {
    conRestringido()
    accion = (metodo, ruta) =>
      metodo === "PUT" && ruta.endsWith("/acceso") ? validacion(INGLES_RESTRINGIDO) : null
    await montarConTabla()
    fireEvent.click(botonDeAcceso(1))
    await within(filaDe(1)).findByRole("alert")
    fireEvent.click(botonDeAcceso(2))
    const dialogo = await screen.findByRole("dialog")
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(alertasEnElDocumento()).toHaveLength(0)
  })

  it("ADM-1G23 (f): repetir «Restablecer» tras un 5xx: con 200, el mensaje se va, la fila pasa a «Sin restricción» y «Acceso restablecido» sale una vez", async () => {
    conRestringido()
    let intentos = 0
    accion = (metodo, ruta) => {
      if (metodo !== "PUT" || !ruta.endsWith("/acceso")) return null
      intentos += 1
      if (intentos === 1) return errorJson(500, "ERROR_INTERNO")
      alumnos = alumnos.map((a) => (a.id === alumno(1).id ? { ...a, accesoRestringido: false } : a))
      return respuestaJson(200, alumnos[0])
    }
    await montarConTabla()
    fireEvent.click(botonDeAcceso(1))
    await within(filaDe(1)).findByRole("alert")
    fireEvent.click(botonDeAcceso(1))
    await waitFor(
      () => expect(within(filaDe(1)).getByText("Sin restricción")).toBeInTheDocument(),
      ESPERA,
    )
    expect(alertasEnElDocumento()).toHaveLength(0)
    expect(aviso.success.mock.calls.filter(([t]) => t === "Acceso restablecido")).toHaveLength(1)
  })
})

describe("ADMIN-01g · la fila sigue al servidor (ADM-1G17)", () => {
  it("ADM-1G17 (a, b): la fila pinta el estado del servidor y su botón el contrario; una recarga o la respuesta de restringir con otro estado los cambian", async () => {
    accion = (metodo, ruta) => {
      if (metodo !== "PUT" || !ruta.endsWith("/acceso")) return null
      alumnos = alumnos.map((a) =>
        a.id === alumno(2).id ? { ...a, accesoRestringido: true, estadoPago: "deudor" } : a,
      )
      return respuestaJson(200, alumnos[1])
    }
    const { queryClient } = await montarConTabla()
    expect(within(filaDe(1)).getByText("Deudor")).toBeInTheDocument()
    expect(botonDeMarcar(1)).toHaveAccessibleName(/^Marcar al corriente /)

    alumnos = alumnos.map((a) => (a.id === alumno(1).id ? { ...a, estadoPago: "al_corriente" } : a))
    await recargar(queryClient)
    await waitFor(() => expect(botonDeMarcar(1)).toHaveAccessibleName(/^Marcar como deudor /))
    expect(within(filaDe(1)).getByText("Al corriente")).toBeInTheDocument()

    fireEvent.click(botonDeAcceso(2))
    const dialogo = await screen.findByRole("dialog")
    fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, restringir" }))
    await waitFor(
      () => expect(botonDeMarcar(2)).toHaveAccessibleName(/^Marcar al corriente /),
      ESPERA,
    )
  })

  it("ADM-1G17 (c): «Marcar…» en vuelo y una recarga con el otro estado: lo enviado es el contrario al de antes; al asentarse, la fila muestra la última respuesta", async () => {
    const pendiente = diferida()
    conLoteQueResponde(() => pendiente.promesa)
    const { queryClient } = await montarConTabla()
    fireEvent.click(botonDeMarcar(1))
    alumnos = alumnos.map((a) => (a.id === alumno(1).id ? { ...a, estadoPago: "al_corriente" } : a))
    await recargar(queryClient)
    await waitFor(() => expect(botonDeMarcar(1)).toHaveAccessibleName(/^Marcar como deudor /))
    expect(peticiones("PUT", RUTA_LOTE)[0]?.cuerpo).toEqual({
      alumnoIds: [alumno(1).id],
      estadoPago: "al_corriente",
    })
    await act(async () => {
      pendiente.resolver(respuestaJson(200, { actualizados: 1 }))
    })
    await reposar()
    expect(within(filaDe(1)).getByText("Al corriente")).toBeInTheDocument()
  })

  it.each([
    ["5xx", () => errorJson(500, "ERROR_INTERNO"), GENERICO],
    [
      "red",
      () => {
        throw new TypeError("Failed to fetch")
      },
      GENERICO,
    ],
    ["400 en inglés", () => validacion(INGLES_ESTADO_PAGO), GENERICO],
  ])(
    "ADM-1G17 (e) con %s: un solo MensajeError en la fila, sin aviso; repetir el mismo «Marcar…» con 200 lo quita y avisa una vez",
    async (_caso, falla, esperado) => {
      let intentos = 0
      conLoteQueResponde((cuerpo) => {
        intentos += 1
        if (intentos === 1) return falla()
        return aplicarLote(cuerpo)
      })
      await montarConTabla()
      fireEvent.click(botonDeMarcar(1))
      await waitFor(() => expect(within(filaDe(1)).getByRole("alert")).toHaveTextContent(esperado))
      expect(aviso.error).not.toHaveBeenCalled()
      expect(within(filaDe(1)).getByText("Deudor")).toBeInTheDocument()
      await waitFor(() => expect(botonDeMarcar(1)).not.toHaveAttribute("aria-busy", "true"))
      fireEvent.click(botonDeMarcar(1))
      await waitFor(
        () => expect(within(filaDe(1)).getByText("Al corriente")).toBeInTheDocument(),
        ESPERA,
      )
      expect(alertasEnElDocumento()).toHaveLength(0)
      expect(
        aviso.success.mock.calls.filter(([t]) => t === "Estado de pago actualizado"),
      ).toHaveLength(1)
    },
  )

  it("ADM-1G17 (e): un error en una fila y después «Marcar…» en otra: solo el de la segunda si falla, ninguno si sale bien; y «Restablecer» en la misma fila deja solo su mensaje", async () => {
    alumnos = [
      alumno(1, "deudor"),
      alumno(2, "al_corriente", { accesoRestringido: true }),
      alumno(3),
    ]
    let fallaLote = true
    conLoteQueResponde((cuerpo) =>
      fallaLote ? errorJson(500, "ERROR_INTERNO") : aplicarLote(cuerpo),
    )
    accion = ((anterior) => (metodo: string, ruta: string, cuerpo: unknown) =>
      metodo === "PUT" && ruta.endsWith("/acceso")
        ? validacion(`id.0: ${MENSAJE_DE_PRUEBA}`)
        : anterior(metodo, ruta, cuerpo))(accion)
    await montarConTabla()
    fireEvent.click(botonDeMarcar(1))
    await within(filaDe(1)).findByRole("alert")
    fireEvent.click(botonDeMarcar(3))
    await within(filaDe(3)).findByRole("alert", {}, ESPERA)
    expect(alertasEnElDocumento()).toHaveLength(1)
    fallaLote = false
    fireEvent.click(botonDeMarcar(1))
    await waitFor(() => expect(alertasEnElDocumento()).toHaveLength(0), ESPERA)

    fireEvent.click(botonDeMarcar(2))
    await reposar()
    fireEvent.click(botonDeAcceso(2))
    await waitFor(() =>
      expect(within(filaDe(2)).getByRole("alert")).toHaveTextContent(MENSAJE_DE_PRUEBA),
    )
    expect(alertasEnElDocumento()).toHaveLength(1)
  })

  it("ADM-1G17 (f): con la fila desmontada en vuelo (otra sección), un error avisa una vez; sin errores en la consola", async () => {
    const errorDeConsola = vi.spyOn(console, "error")
    const pendiente = diferida()
    conLoteQueResponde(() => pendiente.promesa)
    await montarConTabla()
    fireEvent.click(botonDeMarcar(1))
    await enLaBarra("Movimientos")
    await act(async () => {
      pendiente.resolver(errorJson(500, "ERROR_INTERNO"))
    })
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(aviso.error).toHaveBeenCalledWith(GENERICO)
    expect(errorDeConsola).not.toHaveBeenCalled()
  })

  it("ADM-1G17 (f): con éxito y la fila desmontada (otro filtro que la saca), el aviso de éxito sale una vez", async () => {
    const pendiente = diferida()
    conLoteQueResponde(() => pendiente.promesa)
    await montarConTabla()
    fireEvent.click(botonDeMarcar(2))
    await elegirFiltro("deudor")
    await act(async () => {
      pendiente.resolver(respuestaJson(200, { actualizados: 1 }))
    })
    await reposar()
    expect(
      aviso.success.mock.calls.filter(([t]) => t === "Estado de pago actualizado"),
    ).toHaveLength(1)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("ADM-1G17 (g): dos filas en vuelo a la vez, cada una con su espera", async () => {
    const pendientes = [diferida(), diferida()]
    let n = 0
    conLoteQueResponde(() => {
      const actual = pendientes[n]
      n += 1
      if (actual === undefined) throw new Error("Precondición: dos respuestas")
      return actual.promesa
    })
    await montarConTabla()
    fireEvent.click(botonDeMarcar(1))
    fireEvent.click(botonDeMarcar(2))
    await waitFor(() => expect(botonDeMarcar(1)).toHaveAttribute("aria-busy", "true"))
    expect(botonDeMarcar(2)).toHaveAttribute("aria-busy", "true")
    expect(botonDeMarcar(3)).not.toHaveAttribute("aria-busy", "true")
    expect(peticiones("PUT", RUTA_LOTE)).toHaveLength(2)
    await act(async () => {
      pendientes[0]?.resolver(respuestaJson(200, { actualizados: 1 }))
      pendientes[1]?.resolver(respuestaJson(200, { actualizados: 1 }))
    })
  })
})

describe("ADMIN-01g · la selección y el lote siguen al servidor (ADM-1G18)", () => {
  it("ADM-1G18 (a): una recarga con otro estado saca la fila elegida de la selección y no vuelve aunque la fila regrese a su estado", async () => {
    const { queryClient } = await montarConTabla()
    fireEvent.click(casilla(1))
    fireEvent.click(casilla(3))
    expect(screen.getByText("2 seleccionados")).toBeInTheDocument()
    fireEvent.click(boton("Marcar al corriente"))
    const dialogo = await screen.findByRole("dialog")
    alumnos = alumnos.map((a) => (a.id === alumno(1).id ? { ...a, estadoPago: "al_corriente" } : a))
    await recargar(queryClient)
    await waitFor(() =>
      expect(within(dialogo).getByText("Se marcará 1 alumno al corriente.")).toBeInTheDocument(),
    )
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
    alumnos = alumnos.map((a) => (a.id === alumno(1).id ? { ...a, estadoPago: "deudor" } : a))
    await recargar(queryClient)
    expect(screen.getByText("1 seleccionado")).toBeInTheDocument()
    expect(casilla(1)).not.toBeChecked()
  })

  it("ADM-1G18 (b) y (e): una fila elegida que sale de la lista sale de la selección; cambiar el filtro o la búsqueda la vacía y volver no la recupera", async () => {
    const { queryClient } = await montarConTabla()
    fireEvent.click(casilla(1))
    fireEvent.click(casilla(2))
    alumnos = alumnos.filter((a) => a.id !== alumno(2).id)
    await recargar(queryClient)
    await waitFor(() => expect(screen.getByText("1 seleccionado")).toBeInTheDocument())
    await elegirFiltro("deudor")
    await screen.findByRole("table", {}, ESPERA)
    expect(screen.queryByText(/seleccionad/)).toBeNull()
    await elegirFiltro("todos")
    await screen.findByRole("table", {}, ESPERA)
    expect(screen.queryByText(/seleccionad/)).toBeNull()
    fireEvent.click(casilla(1))
    await buscar("alumno")
    expect(screen.queryByText(/seleccionad/)).toBeNull()
  })

  it("ADM-1G18 (d): «Seleccionar los de esta página» con más de 100 filas: «No puedes cambiar más de 100 alumnos a la vez», sin petición", async () => {
    alumnos = Array.from({ length: 101 }, (_, i) => alumno(i + 1, "deudor"))
    await montarConTabla()
    fireEvent.click(casillaDeLaCabecera())
    expect(screen.getByText("101 seleccionados")).toBeInTheDocument()
    fireEvent.click(boton("Marcar al corriente"))
    const dialogo = await screen.findByRole("dialog")
    fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, cambiar" }))
    expect(await within(dialogo).findByRole("alert")).toHaveTextContent(
      "No puedes cambiar más de 100 alumnos a la vez",
    )
    expect(peticiones("PUT", RUTA_LOTE)).toHaveLength(0)
  })

  it("ADM-1G18 (f): con un elegido, el aviso es «Estado de pago actualizado», la selección se vacía y el foco va al h1 (la barra ya no se pinta)", async () => {
    conLoteQueResponde(aplicarLote)
    await montarConTabla()
    fireEvent.click(casilla(1))
    fireEvent.click(boton("Marcar al corriente"))
    const dialogo = await screen.findByRole("dialog")
    fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, cambiar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(aviso.success).toHaveBeenCalledWith("Estado de pago actualizado")
    expect(screen.queryByText(/seleccionad/)).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(encabezado()))
  })

  it("ADM-1G18 (f): un error deja el diálogo abierto con un mensaje y la selección y el destino; repetir con 200 lo quita, cierra y avisa una vez, con los mismos ids", async () => {
    let intentos = 0
    conLoteQueResponde((cuerpo) => {
      intentos += 1
      return intentos === 1 ? errorJson(500, "ERROR_INTERNO") : aplicarLote(cuerpo)
    })
    await montarConTabla()
    fireEvent.click(casilla(1))
    fireEvent.click(casilla(3))
    fireEvent.click(boton("Marcar al corriente"))
    const dialogo = await screen.findByRole("dialog")
    fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, cambiar" }))
    expect(await within(dialogo).findByRole("alert")).toHaveTextContent(GENERICO)
    expect(within(dialogo).getByText("Se marcarán 2 alumnos al corriente.")).toBeInTheDocument()
    fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, cambiar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    const lote = peticiones("PUT", RUTA_LOTE)
    expect(lote.map((l) => l.cuerpo)).toEqual([lote[0]?.cuerpo, lote[0]?.cuerpo])
    expect(
      aviso.success.mock.calls.filter(([t]) => String(t).startsWith("Estado de pago")),
    ).toHaveLength(1)
  })

  it("ADM-1G18 (f): «Cancelar» del lote devuelve el foco a su botón de la barra", async () => {
    await montarConTabla()
    fireEvent.click(casilla(1))
    fireEvent.click(boton("Marcar como deudores"))
    const dialogo = await screen.findByRole("dialog")
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(document.activeElement).toBe(boton("Marcar como deudores")))
  })

  it("ADM-1G18 (g): con la tabla en error, la barra no se pinta; cuando la recarga responde, la selección vigente vuelve a verse", async () => {
    let falla = false
    tabla = (url) => (falla ? errorJson(500, "ERROR_INTERNO") : tablaDelDoble(url))
    const { queryClient } = await montarConTabla()
    fireEvent.click(casilla(1))
    falla = true
    await recargar(queryClient)
    expect(await screen.findByText(ERROR_TABLA, {}, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText(/seleccionad/)).toBeNull()
    falla = false
    await recargar(queryClient)
    expect(await screen.findByText("1 seleccionado", {}, ESPERA)).toBeInTheDocument()
  })
})

describe("ADMIN-01g · los diálogos montados por la vista y el foco (ADM-1G19)", () => {
  it.each([["Cancelar"], ["Motivo (opcional)"]])(
    "ADM-1G19 (a): restringir abierto con el foco en «%s»; una recarga 200 saca la fila: el diálogo se cierra y el foco va a la raíz",
    async (control) => {
      const { queryClient } = await montarConTabla()
      fireEvent.click(botonDeAcceso(2))
      const dialogo = await screen.findByRole("dialog")
      const elemento =
        control === "Cancelar"
          ? within(dialogo).getByRole("button", { name: "Cancelar" })
          : within(dialogo).getByLabelText(control)
      act(() => elemento.focus())
      if (control !== "Cancelar") fireEvent.change(elemento, { target: { value: "Adeu" } })
      alumnos = alumnos.filter((a) => a.id !== alumno(2).id)
      await recargar(queryClient)
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
      await reposar()
      expect(document.activeElement).not.toBe(document.body)
      expect(document.activeElement).toBe(raiz())
    },
  )

  it("ADM-1G19 (b): con una recarga 5xx el diálogo de restringir sigue con el foco y el motivo; al cerrarlo con Escape, el foco va al h1", async () => {
    let falla = false
    tabla = (url) => (falla ? errorJson(500, "ERROR_INTERNO") : tablaDelDoble(url))
    const { queryClient } = await montarConTabla()
    fireEvent.click(botonDeAcceso(2))
    const dialogo = await screen.findByRole("dialog")
    const motivo = within(dialogo).getByLabelText("Motivo (opcional)")
    act(() => motivo.focus())
    fireEvent.change(motivo, { target: { value: "Adeu" } })
    falla = true
    await recargar(queryClient)
    await screen.findByText(ERROR_TABLA, {}, ESPERA)
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(document.activeElement).toBe(motivo)
    expect(motivo).toHaveValue("Adeu")
    fireEvent.keyDown(motivo, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(encabezado()))
  })

  it("ADM-1G19 (c) y ADM-1G20 (d): el lote o restringir abiertos con una recarga 5xx: el diálogo sigue; al cerrarlo con «Cancelar», el foco va al h1", async () => {
    let falla = false
    tabla = (url) => (falla ? errorJson(500, "ERROR_INTERNO") : tablaDelDoble(url))
    const { queryClient } = await montarConTabla()
    fireEvent.click(casilla(1))
    fireEvent.click(boton("Marcar como deudores"))
    let dialogo = await screen.findByRole("dialog")
    falla = true
    await recargar(queryClient)
    await screen.findByText(ERROR_TABLA, {}, ESPERA)
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(document.activeElement).toBe(encabezado()))

    falla = false
    await recargar(queryClient)
    await screen.findByRole("table", {}, ESPERA)
    fireEvent.click(botonDeAcceso(2))
    dialogo = await screen.findByRole("dialog")
    falla = true
    await recargar(queryClient)
    await screen.findByText(ERROR_TABLA, {}, ESPERA)
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(document.activeElement).toBe(encabezado()))
  })

  it("ADM-1G19 (d): atrás y adelante del historial con cada diálogo abierto: la vista se desmonta sin errores en la consola ni avisos; al volver, sin diálogo ni selección", async () => {
    const errorDeConsola = vi.spyOn(console, "error")
    const { router } = await montar("/admin/movimientos")
    await act(async () => {
      await router.navigate("/admin/estado-pago")
    })
    await screen.findByRole("table", {}, ESPERA)
    for (const abrir of ["lote", "restringir"] as const) {
      fireEvent.click(casilla(1))
      if (abrir === "lote") fireEvent.click(boton("Marcar como deudores"))
      if (abrir === "restringir") fireEvent.click(botonDeAcceso(2))
      await screen.findByRole("dialog")
      await act(async () => {
        await router.navigate(-1)
      })
      await waitFor(() => expect(router.state.location.pathname).toBe("/admin/movimientos"))
      expect(screen.queryByRole("dialog")).toBeNull()
      await act(async () => {
        await router.navigate(1)
      })
      await screen.findByRole("table", {}, ESPERA)
      expect(screen.queryByRole("dialog")).toBeNull()
      expect(screen.queryByText(/seleccionad/)).toBeNull()
    }
    expect(errorDeConsola).not.toHaveBeenCalled()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("ADM-1G19 (e): abrir y cerrar cada diálogo varias veces y después cambiar el filtro con el foco en un botón de la vista: el foco no salta a un control de un diálogo cerrado", async () => {
    await montarConTabla()
    for (let vuelta = 0; vuelta < 3; vuelta += 1) {
      fireEvent.click(casilla(1))
      fireEvent.click(boton("Marcar como deudores"))
      let dialogo = await screen.findByRole("dialog")
      fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
      fireEvent.click(casilla(1))
      fireEvent.click(botonDeAcceso(2))
      dialogo = await screen.findByRole("dialog")
      fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    }
    const filtro = screen.getByLabelText("Estado de pago")
    act(() => filtro.focus())
    await elegirFiltro("deudor")
    await screen.findByRole("table", {}, ESPERA)
    await reposar()
    expect(document.activeElement).toBe(filtro)
  })
})

describe("ADMIN-01g · los casos integrados del riesgo de 01f, en esta tabla (ADM-1G20)", () => {
  it.each([["marcar"], ["acceso"], ["casilla"]])(
    "ADM-1G20 (a): con el foco en «%s» de una fila, la búsqueda diferida la saca: el foco va a la raíz",
    async (control) => {
      await montarConTabla()
      const elemento = (() => {
        if (control === "marcar") return botonDeMarcar(2)
        if (control === "acceso") return botonDeAcceso(2)
        return casilla(2)
      })()
      act(() => elemento.focus())
      fireEvent.change(screen.getByLabelText("Buscar por nombre o correo"), {
        target: { value: "alumno 001" },
      })
      expect(document.activeElement).toBe(elemento)
      await esperarLaBusqueda()
      await screen.findByRole("table", {}, ESPERA)
      await reposar()
      expect(document.activeElement).toBe(raiz())
    },
  )

  it("ADM-1G15 y ADM-1G20 (b): la segunda página trae solo una fila repetida: se pinta una vez, con una casilla; la cabecera y la barra la cuentan una vez; el lote no la repite; sin aviso de claves; el foco va al h1", async () => {
    const errorDeConsola = vi.spyOn(console, "error")
    const primera = [alumno(1, "deudor"), alumno(2, "deudor")]
    tabla = (url) =>
      url.searchParams.has("cursor")
        ? pagina([primera[0] as Alumno])
        : pagina(primera, { cursor: alumno(2).id, nombre: "Alumno 002" })
    conLoteQueResponde(aplicarLote)
    await montarConTabla()
    const cargarMas = boton("Cargar más alumnos")
    act(() => cargarMas.focus())
    fireEvent.click(cargarMas)
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Cargar más alumnos" })).toBeNull(),
    )
    await reposar()
    expect(document.activeElement).toBe(encabezado())
    expect(document.querySelectorAll(`[data-alumno-id="${alumno(1).id}"]`)).toHaveLength(1)
    fireEvent.click(casillaDeLaCabecera())
    expect(screen.getByText("2 seleccionados")).toBeInTheDocument()
    fireEvent.click(boton("Marcar al corriente"))
    const dialogo = await screen.findByRole("dialog")
    fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, cambiar" }))
    await waitFor(() => expect(peticiones("PUT", RUTA_LOTE)).toHaveLength(1))
    const ids = (peticiones("PUT", RUTA_LOTE)[0]?.cuerpo as { alumnoIds: string[] }).alumnoIds
    expect(new Set(ids).size).toBe(ids.length)
    expect(errorDeConsola.mock.calls.filter((a) => String(a[0]).includes("same key"))).toEqual([])
  })

  it.each([["la fila"], ["el lote"], ["restringir"], ["«Restablecer»"], ["«Cargar más alumnos»"]])(
    "ADM-1G20 (c): un 401 con el refresco fallido en %s: apiClient lleva al login; ningún mensaje ni aviso y ningún botón en espera",
    async (donde) => {
      alumnos = [alumno(1, "deudor", { accesoRestringido: true }), alumno(2), alumno(3, "deudor")]
      tabla = (url) =>
        url.searchParams.has("cursor")
          ? errorJson(401, "NO_AUTENTICADO")
          : pagina(alumnos, { cursor: alumno(3).id, nombre: "Alumno 003" })
      accion = (metodo) => (metodo === "PUT" ? errorJson(401, "NO_AUTENTICADO") : null)
      await montarConTabla()
      refrescoFalla = true
      if (donde === "la fila") fireEvent.click(botonDeMarcar(3))
      if (donde === "«Restablecer»") fireEvent.click(botonDeAcceso(1))
      if (donde === "«Cargar más alumnos»") fireEvent.click(boton("Cargar más alumnos"))
      if (donde === "el lote") {
        fireEvent.click(casilla(3))
        fireEvent.click(boton("Marcar al corriente"))
        fireEvent.click(
          within(await screen.findByRole("dialog")).getByRole("button", { name: "Sí, cambiar" }),
        )
      }
      if (donde === "restringir") {
        fireEvent.click(botonDeAcceso(2))
        fireEvent.click(
          within(await screen.findByRole("dialog")).getByRole("button", { name: "Sí, restringir" }),
        )
      }
      await waitFor(() => expect(navegacion.irA).toHaveBeenCalled(), ESPERA)
      await reposar()
      expect(document.querySelectorAll('[role="alert"]')).toHaveLength(0)
      expect(aviso.error).not.toHaveBeenCalled()
      expect(document.querySelectorAll('[aria-busy="true"]')).toHaveLength(0)
    },
  )
})

describe("ADMIN-01g · cursor con posición y frases de recuperación (ADM-1G11, ADM-1G12, ADM-1G14, ADM-1G16)", () => {
  const PRIMERA = [alumno(1, "deudor"), alumno(2, "deudor")]

  const conCursorVencido = async () => {
    let vencido = true
    tabla = (url) => {
      if (url.searchParams.has("cursor") && vencido) {
        vencido = false
        return validacion("cursor: no es válido")
      }
      if (url.searchParams.has("cursor")) return pagina([alumno(3, "deudor")])
      return pagina(PRIMERA, { cursor: alumno(2).id, nombre: "Ña & Ó+% Pérez" })
    }
    const montada = await montarConTabla()
    await elegirFiltro("deudor")
    await screen.findByRole("table", {}, ESPERA)
    fireEvent.click(casilla(1))
    fireEvent.click(boton("Cargar más alumnos"))
    expect(await screen.findByText(LISTA_CAMBIADA)).toBeInTheDocument()
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(aviso.error).not.toHaveBeenCalled()
    return montada
  }

  const primerasDelFiltro = () =>
    pedidasDeLaTabla().filter(
      (l) => !l.url.searchParams.has("cursor") && l.url.searchParams.get("estadoPago") === "deudor",
    )

  it("ADM-1G14 (a): «Cargar más alumnos» pide la página siguiente con el filtro, rol, cursor y cursorNombre codificado", async () => {
    tabla = (url) =>
      url.searchParams.has("cursor")
        ? pagina([alumno(3, "deudor")])
        : pagina(PRIMERA, { cursor: alumno(2).id, nombre: "Ña & Ó+% Pérez" })
    await montarConTabla()
    await elegirFiltro("deudor")
    await screen.findByRole("table", {}, ESPERA)
    fireEvent.click(boton("Cargar más alumnos"))
    fireEvent.click(boton("Cargar más alumnos"))
    await screen.findByText(alumno(3).nombre)
    const siguientes = pedidasDeLaTabla().filter((l) => l.url.searchParams.has("cursor"))
    expect(siguientes).toHaveLength(1)
    const url = siguientes[0]?.url
    expect([...(url?.searchParams.keys() ?? [])]).toEqual([
      "rol",
      "estadoPago",
      "cursor",
      "cursorNombre",
    ])
    expect(url?.searchParams.get("cursorNombre")).toBe("Ña & Ó+% Pérez")
  })

  it("ADM-1G11 (a) y ADM-1G14 (b): pulsar «Estado de pago» estando aquí pide la primera página del filtro sin cursor; el texto desaparece y la selección se vacía", async () => {
    const { router } = await conCursorVencido()
    const antes = primerasDelFiltro().length
    const clave = router.state.location.key
    await enLaBarra("Estado de pago")
    expect(router.state.location.key).not.toBe(clave)
    await waitFor(() => expect(primerasDelFiltro().length).toBe(antes + 1))
    await waitFor(() => expect(screen.queryByText(LISTA_CAMBIADA)).toBeNull())
    expect(await screen.findByRole("table")).toBeInTheDocument()
    expect(screen.queryByText(/seleccionad/)).toBeNull()
  })

  it("ADM-1G11 (b): ir a otra sección y regresar antes del staleTime pide la primera página y el texto desaparece", async () => {
    await conCursorVencido()
    await enLaBarra("Movimientos")
    await enLaBarra("Estado de pago")
    expect(await screen.findByRole("table", {}, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText(LISTA_CAMBIADA)).toBeNull()
    expect(screen.queryByText(/seleccionad/)).toBeNull()
  })

  it("ADM-1G11 (c): cambiar el filtro y volver al de antes pide la primera página del filtro y el texto desaparece", async () => {
    await conCursorVencido()
    const antes = primerasDelFiltro().length
    await elegirFiltro("todos")
    await screen.findByRole("table", {}, ESPERA)
    await elegirFiltro("deudor")
    await waitFor(() => expect(primerasDelFiltro().length).toBe(antes + 1))
    expect(await screen.findByRole("table", {}, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText(LISTA_CAMBIADA)).toBeNull()
  })

  it("ADM-1G11 (d): atrás y adelante del historial dejan la tabla sin el texto ni selección", async () => {
    const { router } = await conCursorVencido()
    await enLaBarra("Movimientos")
    for (const [paso, destino] of [
      [-1, "/admin/estado-pago"],
      [1, "/admin/movimientos"],
      [-1, "/admin/estado-pago"],
    ] as const) {
      await act(async () => {
        await router.navigate(paso)
      })
      await waitFor(() => expect(router.state.location.pathname).toBe(destino))
      await reposar()
    }
    expect(await screen.findByRole("table", {}, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText(LISTA_CAMBIADA)).toBeNull()
    expect(screen.queryByText(/seleccionad/)).toBeNull()
  })

  const conLaTablaEnError = async () => {
    let fallos = 2
    tabla = (url) => {
      if (fallos > 0) {
        fallos -= 1
        return errorJson(500, "ERROR_INTERNO")
      }
      return tablaDelDoble(url)
    }
    const montada = await montar()
    expect(await screen.findByText(ERROR_TABLA, {}, ESPERA)).toBeInTheDocument()
    return montada
  }

  it("ADM-1G12 (a): pulsar «Estado de pago» con la tabla en error la vuelve a pedir y el texto desaparece", async () => {
    await conLaTablaEnError()
    await enLaBarra("Estado de pago")
    expect(await screen.findByRole("table", {}, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText(ERROR_TABLA)).toBeNull()
  })

  it("ADM-1G12 (b): ir a otra sección y regresar antes del staleTime la vuelve a pedir", async () => {
    await conLaTablaEnError()
    await enLaBarra("Inicio")
    await enLaBarra("Estado de pago")
    expect(await screen.findByRole("table", {}, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText(ERROR_TABLA)).toBeNull()
  })

  it("ADM-1G12 (d): atrás, adelante y atrás del historial la vuelven a pedir", async () => {
    const { router } = await conLaTablaEnError()
    await enLaBarra("Maestros")
    for (const paso of [-1, 1, -1] as const) {
      await act(async () => {
        await router.navigate(paso)
      })
      await reposar()
    }
    await waitFor(() => expect(router.state.location.pathname).toBe("/admin/estado-pago"))
    expect(await screen.findByRole("table", {}, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText(ERROR_TABLA)).toBeNull()
  })

  it.each([
    // Un 5xx se reintenta una vez (dos fallos para quedar en error); un 4xx, no (uno).
    ["5xx en su primera carga", () => errorJson(500, "ERROR_INTERNO"), false, 2],
    [
      "400 de estadoPago en inglés en su primera carga",
      () => validacion(INGLES_ESTADO_PAGO_DEL_FILTRO),
      false,
      1,
    ],
    [
      "400 fuera de contrato en una recarga con datos",
      () => validacion("limite: Too big"),
      true,
      1,
    ],
  ])(
    "ADM-1G12 (c) y ADM-1G16 (e): con la clave de «Deudores» en error (%s), cambiar el filtro y volver la vuelve a pedir y, con 200, el texto desaparece",
    async (_caso, falla, enRecarga, cuantos) => {
      let fallos = cuantos
      tabla = (url) => {
        const esDeudores = url.searchParams.get("estadoPago") === "deudor"
        const toca = enRecarga ? url.searchParams.has("cursor") : true
        if (esDeudores && toca && fallos > 0) {
          fallos -= 1
          return falla()
        }
        if (esDeudores && enRecarga && !url.searchParams.has("cursor")) {
          return pagina([alumno(1, "deudor")], { cursor: alumno(1).id, nombre: "A" })
        }
        return tablaDelDoble(url)
      }
      await montarConTabla()
      await elegirFiltro("deudor")
      if (enRecarga)
        fireEvent.click(await screen.findByRole("button", { name: "Cargar más alumnos" }, ESPERA))
      expect(await screen.findByText(ERROR_TABLA, {}, ESPERA)).toBeInTheDocument()
      expect(document.body.textContent).not.toMatch(/Invalid|Too big|estadoPago:/)
      await elegirFiltro("al_corriente")
      await screen.findByRole("table", {}, ESPERA)
      await elegirFiltro("deudor")
      expect(await screen.findByRole("table", {}, ESPERA)).toBeInTheDocument()
      expect(screen.queryByText(ERROR_TABLA)).toBeNull()
    },
  )

  it("ADM-1G16 (a, b, c, d): la primera carga sin q; corto, largo y con el nulo no mandan q; el largo marca el campo; el nulo muestra el vacío sin pedir; «Todos» no manda estadoPago", async () => {
    await montarConTabla()
    expect(pedidasDeLaTabla()[0]?.url.searchParams.has("q")).toBe(false)
    expect(pedidasDeLaTabla()[0]?.url.searchParams.has("estadoPago")).toBe(false)
    const antes = pedidasDeLaTabla().length
    for (const texto of ["a", "ab", "   ", ""]) await buscar(texto)
    expect(pedidasDeLaTabla().length).toBe(antes)
    await buscar("a".repeat(121))
    const campo = screen.getByLabelText("Buscar por nombre o correo")
    expect(campo).toHaveAttribute("aria-invalid", "true")
    expect(campo).toHaveAccessibleDescription(
      expect.stringContaining("La búsqueda no puede tener más de 120 caracteres"),
    )
    await buscar(`ana${NULO}`)
    expect(await screen.findByText("No encontramos alumnos con esa búsqueda")).toBeInTheDocument()
    expect(pedidasDeLaTabla().filter((l) => l.url.searchParams.has("q"))).toEqual([])
    for (const l of pedidasDeLaTabla()) expect(l.url.searchParams.get("rol")).toBe("estudiante")
  })

  it.each([
    ["q con el nulo", () => validacion("q: Los datos enviados tienen caracteres no permitidos.")],
    [
      "BUSQUEDA_MUY_CORTA",
      () => errorJson(400, "BUSQUEDA_MUY_CORTA", "Escribe al menos 3 letras para buscar."),
    ],
    [
      "estadoPago solo alumnos",
      () => validacion("estadoPago: Solo se filtra por estado de pago entre los alumnos"),
    ],
  ])(
    "ADM-1G16 (e) con %s: el texto fijo de la tabla, sin aviso ni texto del servidor; editar la búsqueda vuelve a pedir y, con 200, el texto desaparece",
    async (_caso, respuesta) => {
      tabla = (url) => (url.searchParams.get("q") === "ana" ? respuesta() : tablaDelDoble(url))
      await montarConTabla()
      await buscar("ana")
      expect(await screen.findByText(ERROR_TABLA, {}, ESPERA)).toBeInTheDocument()
      expect(aviso.error).not.toHaveBeenCalled()
      expect(document.body.textContent).not.toMatch(/q:|para buscar|Solo se filtra/)
      await buscar("alumno")
      expect(await screen.findByRole("table", {}, ESPERA)).toBeInTheDocument()
      expect(screen.queryByText(ERROR_TABLA)).toBeNull()
    },
  )
})

// Corrección M-26 (DESIGN.md §6): el área pulsable de las casillas es la etiqueta que las envuelve, del
// tamaño de un control (--control-height: 44 px; 36 px desde 768 px en el contexto denso); los botones de
// la fila y de la barra de lote llevan el tamaño de un control. El nombre accesible no cambia (sr-only).
describe("ADMIN-01g · el tamaño de los objetivos (corrección M-26)", () => {
  it("M-26: la etiqueta de cada casilla (la de la fila y la de la cabecera) mide un control; el nombre sigue saliendo del texto sr-only, sin aria-label", async () => {
    await montarConTabla()
    for (const caja of [casilla(1), casillaDeLaCabecera()]) {
      const etiqueta = caja.closest("label")
      expect(etiqueta).not.toBeNull()
      expect(etiqueta?.className).toContain("size-(--control-height)")
      expect(caja).not.toHaveAttribute("aria-label")
    }
    expect(casilla(1)).toHaveAccessibleName(`Seleccionar a ${alumno(1).nombre}`)
  })

  it("M-26: los botones de la fila y de la barra de lote tienen el tamaño de un control (no el pequeño)", async () => {
    await montarConTabla()
    fireEvent.click(casilla(1))
    for (const control of [
      botonDeMarcar(1),
      botonDeAcceso(1),
      boton("Marcar como deudores"),
      boton("Marcar al corriente"),
    ]) {
      expect(control).toHaveAttribute("data-size", "default")
    }
  })
})

// ADMIN-01g, ronda 1 (O-01g-r1-2, decisión del programador): con «Restablecer» en vuelo, una recarga que ya
// trae la fila sin restricción cambia el texto del botón a «Restringir» (el estado del servidor, criterio
// de T-01), pero el botón sigue en espera hasta que el PUT se asiente: no abre el diálogo de restringir.
describe("ADMIN-01g, ronda 1 · «Restablecer» en vuelo con una recarga que trae la fila sin restricción", () => {
  it("O-01g-r1-2: el botón pasa a «Restringir» en espera; pulsarlo no abre el diálogo hasta que el PUT responde", async () => {
    alumnos = [alumno(1, "deudor", { accesoRestringido: true }), alumno(2), alumno(3, "deudor")]
    const pendiente = diferida()
    accion = (metodo, ruta) =>
      metodo === "PUT" && ruta.endsWith("/acceso") ? pendiente.promesa : null
    const { queryClient } = await montarConTabla()
    fireEvent.click(botonDeAcceso(1))
    alumnos = alumnos.map((a) => (a.id === alumno(1).id ? { ...a, accesoRestringido: false } : a))
    await recargar(queryClient)
    await waitFor(() => expect(botonDeAcceso(1)).toHaveAccessibleName(/^Restringir /))
    expect(botonDeAcceso(1)).toHaveAttribute("aria-busy", "true")
    fireEvent.click(botonDeAcceso(1))
    expect(screen.queryByRole("dialog")).toBeNull()
    await act(async () => {
      pendiente.resolver(respuestaJson(200, alumnos[0]))
    })
    await waitFor(() => expect(botonDeAcceso(1)).not.toHaveAttribute("aria-busy", "true"))
    fireEvent.click(botonDeAcceso(1))
    expect(await screen.findByRole("dialog")).toBeInTheDocument()
  })
})
