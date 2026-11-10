import { sinContenidoSchema } from "@campus/shared"
import { MutationObserver, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { formatearFechaLargaConAno } from "@/lib/format"
import { descargarArchivo } from "@/services/descargaService"
import { api } from "@/services/apiClient"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import {
  claveClaseDetalle,
  claveClasesAnteriores,
  claveCodigoDeClase,
  TEXTOS_CLASES_ANTERIORES,
} from "./data"

// ADMIN-01d2 (§D-9): lo de features/clases y features/calificaciones de la clase archivada, con el router
// real (`rutas` de app/router). Donde el plan pide la configuración de app/providers.tsx se monta Providers;
// donde la prueba necesita la caché a mano, un QueryClient con sus mismas opciones y sin reintento. Las
// esperas son por estado (findBy, waitFor), nunca por tiempo; lo que debe quedar en vuelo se retiene con una
// promesa que la prueba suelta.

const aviso = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
)
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))
vi.mock("@/services/descargaService", () => ({ descargarArchivo: vi.fn() }))

type Rol = "estudiante" | "maestro" | "admin"

const ESPERA = { timeout: 8000 }
const uuid = (n: number) => `2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c${String(n).padStart(4, "0")}`
const CLASE_A = uuid(1)
const CLASE_B = uuid(2)
const API = `/api/clases/${CLASE_A}`
const ARCHIVADA_EN = "2026-10-05T12:00:00.000Z"
const CREADO_EN = "2026-10-01T15:30:00.000Z"
const ARCHIVADA = "Esta clase está archivada: solo se puede consultar."
const MAESTRO_1 = { id: uuid(11), nombre: "Luis Pérez" }
const MAESTRO_2 = { id: uuid(12), nombre: "Rosa Mena" }
const FIRMA = { ...MAESTRO_1, administracion: false }
const DUDA = uuid(21)
const DUDA_SIN_RESPUESTAS = uuid(22)
const RESPUESTA = uuid(23)
const ALUMNO = uuid(31)
const CANDIDATO = uuid(32)
const CANDIDATO_MAESTRO = uuid(33)
const RECURSO = uuid(41)
const ARCHIVO = uuid(42)
const PUBLICACION = uuid(51)
const COMENTARIO = uuid(52)
const TAREA_1 = uuid(61)
const TAREA_2 = uuid(62)
const CATEGORIA = uuid(71)
const SIN_ACCESO = "No tienes acceso a esta clase."
const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const LISTA_CAMBIO = "La lista cambió mientras la veías. Vuelve a abrirla para verla completa."
const CURSOR_NO_VALIDO = "cursor: no es válido"
const BASES: Record<Rol, string> = {
  estudiante: `/estudiante/clases/${CLASE_A}`,
  maestro: `/maestro/clases/${CLASE_A}`,
  admin: `/admin/clases/${CLASE_A}`,
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorJson = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })
const archivadaJson = () => errorJson(409, "CLASE_ARCHIVADA", ARCHIVADA)

interface Llamada {
  metodo: string
  url: URL
  cuerpo: unknown
}

type Manejador = (llamada: Llamada) => Response | Promise<Response> | undefined
const sinManejador: Manejador = () => undefined

const servidor = {
  rol: "maestro" as Rol,
  archivadas: new Set<string>(),
  maestros: [MAESTRO_1],
  alumnos: 1,
  avisos: 1,
  manejador: sinManejador,
}
let llamadas: Llamada[] = []

const detalle = (id: string) => ({
  clase: {
    id,
    nombre: id === CLASE_A ? "Historia" : "Geografía",
    descripcion: "",
    maestro: MAESTRO_1,
    maestros: servidor.maestros,
    archivadaEn: servidor.archivadas.has(id) ? ARCHIVADA_EN : null,
  },
})

const anterior = (n: number) => ({
  id: uuid(100 + n),
  nombre: `Clase ${String(n)}`,
  maestros: [{ nombre: MAESTRO_1.nombre }],
  archivadaEn: ARCHIVADA_EN,
})

const paginaDeAnteriores = (ns: number[], siguiente: number | null) => ({
  clases: ns.map(anterior),
  total: 3,
  siguienteCursor: siguiente === null ? null : uuid(100 + siguiente),
  siguienteCursorArchivadaEn: siguiente === null ? null : "2026-10-05T12:00:00.000Z",
})

const tareaDeMisCalificaciones = (id: string, titulo: string) => ({
  id,
  titulo,
  fechaLimite: "2030-10-10T15:00:00.000Z",
  puntos: 10,
  categoria: null,
  entrega: { estado: "asignado", conRetraso: false, calificacion: null },
})

const misCalificaciones = (tareas: unknown[], siguienteCursor: string | null = null) => ({
  general: {
    modo: "puntos",
    porcentaje: null,
    puntos: { obtenido: 0, posible: 0, tareas: 0 },
    categorias: [],
    sinCategoria: { tareas: 0 },
  },
  tareas,
  siguienteCursor,
})

const dudaDoble = (id: string, respuestas: number, resuelta: boolean) => ({
  id,
  texto: id === DUDA ? "¿Cuándo es el examen?" : "¿Hay tolerancia?",
  autor: FIRMA,
  creadoEn: CREADO_EN,
  resuelta,
  resueltaEn: resuelta ? CREADO_EN : null,
  respuestas,
  propia: true,
  puedeBorrar: true,
  puedeMarcar: true,
})

const recursoDoble = {
  id: RECURSO,
  titulo: "Guía de estudio",
  texto: "",
  autor: FIRMA,
  creadoEn: CREADO_EN,
  bloque: "docente",
  adjuntos: [
    { id: ARCHIVO, nombre: "guia.pdf", tipo: "application/pdf", tamano: 10, vistaPrevia: null },
  ],
  comentarios: 0,
  puedeEditar: true,
  puedeBorrar: true,
  puedeMover: true,
}

const responder = (llamada: Llamada): Response | Promise<Response> => {
  const { metodo, url } = llamada
  if (url.pathname === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "otra" })
  if (url.pathname === "/api/me") {
    return respuestaJson(200, {
      id: uuid(90),
      nombre: "Ana López",
      email: "ana@ejemplo.mx",
      rol: servidor.rol,
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
  }
  const propia = servidor.manejador(llamada)
  if (propia !== undefined) return propia
  if (url.pathname === "/api/clases/inscritas" || url.pathname === "/api/clases/impartidas") {
    return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
  }
  if (url.pathname === "/api/clases/anteriores") {
    return respuestaJson(200, paginaDeAnteriores([1], null))
  }
  for (const id of [CLASE_A, CLASE_B]) {
    const base = `/api/clases/${id}`
    if (url.pathname === base && metodo === "GET") return respuestaJson(200, detalle(id))
    if (url.pathname === `${base}/codigo`) {
      if (servidor.archivadas.has(id)) return archivadaJson()
      return respuestaJson(200, { codigo: "ABCDEFG" })
    }
    if (url.pathname === `${base}/mis-calificaciones`) {
      return respuestaJson(
        200,
        misCalificaciones([tareaDeMisCalificaciones(TAREA_1, "Ensayo final")]),
      )
    }
    if (url.pathname === `${base}/dudas` && metodo === "GET") {
      return respuestaJson(200, {
        dudas: [dudaDoble(DUDA, 1, true), dudaDoble(DUDA_SIN_RESPUESTAS, 0, false)],
        siguienteCursor: null,
      })
    }
  }
  if (metodo !== "GET" && servidor.archivadas.has(CLASE_A)) return archivadaJson()
  if (url.pathname === `${API}/dudas/${DUDA}/respuestas` && metodo === "GET") {
    return respuestaJson(200, {
      comentarios: [
        {
          id: RESPUESTA,
          texto: "El viernes",
          autor: FIRMA,
          creadoEn: CREADO_EN,
          propio: true,
          puedeBorrar: true,
        },
      ],
      siguienteCursor: null,
    })
  }
  if (url.pathname === `${API}/dudas/${DUDA_SIN_RESPUESTAS}/respuestas` && metodo === "GET") {
    return respuestaJson(200, { comentarios: [], siguienteCursor: null })
  }
  if (url.pathname === `${API}/alumnos` && metodo === "GET") {
    return respuestaJson(200, {
      alumnos:
        servidor.alumnos === 0
          ? []
          : [
              {
                id: ALUMNO,
                nombre: "Beto Díaz",
                email: "beto@ejemplo.mx",
                estadoPago: "al_corriente",
                accesoRestringido: false,
                origen: "manual",
                inscritoEn: CREADO_EN,
              },
            ],
      total: servidor.alumnos,
      siguienteCursor: null,
    })
  }
  if (url.pathname === `${API}/alumnos/candidatos`) {
    return respuestaJson(200, {
      candidatos: [
        {
          id: CANDIDATO,
          nombre: "Carla Gómez",
          correoEnmascarado: "ca***@ejemplo.mx",
          yaInscrito: false,
        },
      ],
      hayMas: false,
    })
  }
  if (url.pathname === "/api/admin/maestros/candidatos") {
    return respuestaJson(200, {
      candidatos: [{ id: CANDIDATO_MAESTRO, nombre: "Rita Solís", email: "rita@ejemplo.mx" }],
      hayMas: false,
    })
  }
  if (url.pathname === `${API}/publicaciones` && metodo === "GET") {
    return respuestaJson(200, {
      publicaciones:
        servidor.avisos === 0
          ? []
          : [
              {
                id: PUBLICACION,
                tipo: "anuncio",
                titulo: null,
                texto: "Primer aviso",
                autor: FIRMA,
                creadoEn: CREADO_EN,
                comentarios: 1,
                adjuntos: [],
                puedeBorrar: true,
                tarea: null,
              },
            ],
      siguienteCursor: null,
    })
  }
  if (url.pathname === `${API}/publicaciones/${PUBLICACION}/comentarios` && metodo === "GET") {
    return respuestaJson(200, {
      comentarios: [
        {
          id: COMENTARIO,
          texto: "Un comentario",
          autor: FIRMA,
          creadoEn: CREADO_EN,
          propio: true,
          puedeBorrar: true,
        },
      ],
      siguienteCursor: null,
    })
  }
  if (url.pathname === `${API}/temas`) return respuestaJson(200, { temas: [], sinTema: 1 })
  if (url.pathname === `${API}/categorias` && metodo === "GET") {
    return respuestaJson(200, {
      categorias: [{ id: CATEGORIA, nombre: "Tareas", peso: 100, tareas: 0 }],
    })
  }
  if (url.pathname === `${API}/recursos` && metodo === "GET") {
    const conRecurso =
      url.searchParams.get("bloque") === "docente" && url.searchParams.get("tema") === "sin-tema"
    return respuestaJson(200, { recursos: conRecurso ? [recursoDoble] : [], siguienteCursor: null })
  }
  if (url.pathname === `${API}/recursos/${RECURSO}` && metodo === "GET") {
    return respuestaJson(200, { recurso: { ...recursoDoble, version: 0, tema: null } })
  }
  return errorJson(500, "ERROR_INTERNO", "no esperada")
}

const retener = () => {
  let soltar: () => void = () => {
    throw new Error("Precondición: la respuesta retenida no se creó")
  }
  const promesa = new Promise<void>((resolver) => {
    soltar = resolver
  })
  return { promesa, soltar: () => soltar() }
}

const clienteDePrueba = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, staleTime: 30_000 },
      mutations: { retry: false },
    },
  })

// Las opciones de app/providers.tsx, para los casos que además necesitan la caché a mano.
const clienteComoElDeProviders = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })

const montar = async (entradas: string[], cliente?: QueryClient) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, {
    initialEntries: entradas,
    initialIndex: entradas.length - 1,
  })
  const arbol = <RouterProvider router={router} />
  render(
    cliente === undefined ? (
      <Providers>{arbol}</Providers>
    ) : (
      <QueryClientProvider client={cliente}>{arbol}</QueryClientProvider>
    ),
  )
  return router
}

const pedidas = (metodo: string, ruta: string) =>
  llamadas.filter((l) => l.metodo === metodo && l.url.pathname === ruta)
const escrituras = () =>
  llamadas.filter((l) => l.metodo !== "GET" && l.url.pathname !== "/api/auth/refrescar")
const errores = () => aviso.error.mock.calls.map(([texto]) => String(texto))
const avisoFijo = () => screen.queryByText(/^Clase archivada el /)
const boton = (nombre: string | RegExp) => screen.queryByRole("button", { name: nombre })
const buscarBoton = (nombre: string | RegExp) =>
  screen.findByRole("button", { name: nombre }, ESPERA)

const cambiarDetalle = async (cliente: QueryClient, archivada: boolean, id = CLASE_A) => {
  if (archivada) servidor.archivadas.add(id)
  if (!archivada) servidor.archivadas.delete(id)
  await act(() => cliente.invalidateQueries({ queryKey: claveClaseDetalle(id), exact: true }))
}

const archivar = async (cliente: QueryClient) => {
  await cambiarDetalle(cliente, true)
  await waitFor(() => expect(avisoFijo()).not.toBeNull(), ESPERA)
}

const restaurar = async (cliente: QueryClient) => {
  await cambiarDetalle(cliente, false)
  await waitFor(() => expect(avisoFijo()).toBeNull(), ESPERA)
}

const fueraDeBody = () => expect(document.activeElement).not.toBe(document.body)

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  servidor.rol = "maestro"
  servidor.archivadas = new Set()
  servidor.maestros = [MAESTRO_1]
  servidor.alumnos = 1
  servidor.avisos = 1
  servidor.manejador = sinManejador
  llamadas = []
  vi.mocked(descargarArchivo).mockReset()
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = new URL(String(entrada), "http://x")
      const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined
      const llamada = { metodo: init?.method ?? "GET", url, cuerpo }
      llamadas.push(llamada)
      return Promise.resolve(responder(llamada))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.mockClear()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

// Abre las respuestas de la duda que tiene una.
const abrirRespuestas = async () => {
  fireEvent.click(await buscarBoton("Ver respuestas (1)"))
  await screen.findByText("El viernes", {}, ESPERA)
}

const filaDeDuda = async (id: string) => {
  await waitFor(() => {
    if (document.querySelector(`[data-duda-id="${id}"]`) === null) throw new Error("sin la duda")
  }, ESPERA)
  const fila = document.querySelector<HTMLElement>(`[data-duda-id="${id}"]`)
  if (fila === null) throw new Error("Precondición: la duda está en pantalla")
  return fila
}

// ------------------------------------------------------------------------------------------------
// ADM-1D201 (filas 22 a 30; las 31 a 36 están en features/tareas, la 37 en ADM-1D202)

interface FilaDeControl {
  fila: number
  rol: Rol
  seccion: string
  dos?: boolean
  preparar?: () => Promise<void>
  control: () => HTMLElement | null
  listo: () => Promise<unknown>
}

const listoDudas = () => filaDeDuda(DUDA)
const listoPersonas = () => screen.findByRole("heading", { name: "Alumnos" }, ESPERA)

const CONTROLES: FilaDeControl[] = [
  {
    fila: 22,
    rol: "maestro",
    seccion: "dudas",
    listo: listoDudas,
    control: () => screen.queryByLabelText("Escribe tu duda"),
  },
  {
    fila: 23,
    rol: "admin",
    seccion: "dudas",
    listo: listoDudas,
    control: () => boton("Marcar como resuelta") ?? boton("Quitar «Resuelta»"),
  },
  {
    fila: 24,
    rol: "admin",
    seccion: "dudas",
    listo: listoDudas,
    control: () => screen.queryAllByRole("button", { name: "Borrar duda" })[0] ?? null,
  },
  {
    fila: 25,
    rol: "maestro",
    seccion: "dudas",
    listo: listoDudas,
    preparar: abrirRespuestas,
    control: () => screen.queryByLabelText("Escribe una respuesta"),
  },
  {
    fila: 26,
    rol: "maestro",
    seccion: "dudas",
    listo: listoDudas,
    preparar: abrirRespuestas,
    control: () => boton("Borrar"),
  },
  {
    fila: 27,
    rol: "maestro",
    seccion: "personas",
    listo: listoPersonas,
    control: () => screen.queryByLabelText("Buscar alumno por nombre"),
  },
  {
    fila: 28,
    rol: "maestro",
    seccion: "personas",
    listo: () => screen.findByRole("cell", { name: "beto@ejemplo.mx" }, ESPERA),
    control: () => boton(/^Quitar Beto/),
  },
  {
    fila: 29,
    rol: "admin",
    seccion: "personas",
    dos: true,
    listo: () => screen.findByRole("heading", { name: "Maestros de la clase" }, ESPERA),
    control: () => boton(/^Quitar Rosa/),
  },
  {
    fila: 30,
    rol: "admin",
    seccion: "personas",
    listo: listoPersonas,
    control: () => screen.queryByLabelText("Buscar maestro por nombre"),
  },
]

describe("ADM-1D201: filas 22 a 30 del inventario", () => {
  it.each(CONTROLES)(
    "ADM-1D201 fila $fila: en una archivada el control no está; en una activa, sí",
    async ({ rol, seccion, dos, preparar, control, listo }) => {
      servidor.rol = rol
      if (dos === true) servidor.maestros = [MAESTRO_1, MAESTRO_2]
      await montar([`${BASES[rol]}/${seccion}`])
      await listo()
      await preparar?.()
      await waitFor(() => expect(control()).not.toBeNull(), ESPERA)
      cleanup()

      servidor.archivadas.add(CLASE_A)
      await montar([`${BASES[rol]}/${seccion}`])
      await listo()
      await preparar?.()
      expect(avisoFijo()).not.toBeNull()
      expect(control()).toBeNull()
    },
  )

  it("ADM-1D201 fila 23: la insignia «Resuelta» sí se pinta en una archivada", async () => {
    servidor.archivadas.add(CLASE_A)
    await montar([`${BASES.maestro}/dudas`])
    const fila = await filaDeDuda(DUDA)
    expect(within(fila).getByText("Resuelta")).toBeInTheDocument()
  })

  it("ADM-1D201 fila 25: «Ver respuestas» sí se pinta y una duda sin respuestas no ofrece «Responder»", async () => {
    servidor.archivadas.add(CLASE_A)
    await montar([`${BASES.maestro}/dudas`])
    await abrirRespuestas()
    expect(screen.getByRole("button", { name: "Ocultar respuestas" })).toBeInTheDocument()
    const sinRespuestas = await filaDeDuda(DUDA_SIN_RESPUESTAS)
    expect(within(sinRespuestas).queryByRole("button", { name: "Responder" })).toBeNull()
  })
})

// ------------------------------------------------------------------------------------------------
// ADM-1D203 y ADM-1D209

describe("ADM-1D203: Clases archivadas del maestro", () => {
  it("ADM-1D203: lista, abrir una en solo lectura; Volver a mis clases va a /maestro/clases-archivadas", async () => {
    servidor.archivadas.add(uuid(101))
    servidor.manejador = ({ url }) => {
      if (url.pathname !== `/api/clases/${uuid(101)}`) return undefined
      return respuestaJson(200, {
        clase: {
          ...detalle(CLASE_A).clase,
          id: uuid(101),
          nombre: "Clase 1",
          archivadaEn: ARCHIVADA_EN,
        },
      })
    }
    const router = await montar(["/maestro/clases-archivadas"])
    fireEvent.click(await screen.findByRole("link", { name: "Clase 1" }, ESPERA))
    await screen.findByRole("heading", { level: 1, name: "Clase 1" }, ESPERA)
    expect(router.state.location.pathname).toBe(`/maestro/clases/${uuid(101)}`)
    expect(avisoFijo()).not.toBeNull()
    expect(screen.getByRole("link", { name: "Volver a mis clases" })).toHaveAttribute(
      "href",
      "/maestro/clases-archivadas",
    )
  })

  it("ADM-1D203: vacío", async () => {
    servidor.manejador = ({ url }) =>
      url.pathname === "/api/clases/anteriores"
        ? respuestaJson(200, paginaDeAnteriores([], null))
        : undefined
    await montar(["/maestro/clases-archivadas"])
    expect(await screen.findByText("No tienes clases archivadas", {}, ESPERA)).toBeInTheDocument()
  })

  it("ADM-1D203: control: con la clase activa va a /maestro y, al restaurar con la vista abierta, el enlace vuelve a /maestro", async () => {
    const cliente = clienteDePrueba()
    await montar([BASES.maestro], cliente)
    const enlace = () => screen.getByRole("link", { name: "Volver a mis clases" })
    await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
    expect(enlace()).toHaveAttribute("href", "/maestro")
    await archivar(cliente)
    expect(enlace()).toHaveAttribute("href", "/maestro/clases-archivadas")
    await restaurar(cliente)
    expect(enlace()).toHaveAttribute("href", "/maestro")
  })

  it("ADM-1D203: el admin en una archivada va a /admin/clases", async () => {
    servidor.rol = "admin"
    servidor.archivadas.add(CLASE_A)
    await montar([BASES.admin])
    await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
    expect(screen.getByRole("link", { name: "Volver a la lista de clases" })).toHaveAttribute(
      "href",
      "/admin/clases",
    )
  })
})

describe("ADM-1D209: los enlaces del pie de los inicios", () => {
  it.each([
    ["estudiante" as Rol, "/estudiante", "Clases anteriores", "/estudiante/clases-anteriores"],
    ["maestro" as Rol, "/maestro", "Clases archivadas", "/maestro/clases-archivadas"],
  ])("ADM-1D209: %s lleva a su lista", async (rol, inicio, texto, destino) => {
    servidor.rol = rol
    await montar([inicio])
    expect(await screen.findByRole("link", { name: texto }, ESPERA)).toHaveAttribute(
      "href",
      destino,
    )
  })

  it("ADM-1D209: el inicio del administrador no los tiene", async () => {
    servidor.rol = "admin"
    await montar(["/admin"])
    await screen.findAllByRole("link", { name: "Clases" }, ESPERA)
    expect(screen.queryByRole("link", { name: "Clases anteriores" })).toBeNull()
    expect(screen.queryByRole("link", { name: "Clases archivadas" })).toBeNull()
  })
})

// ------------------------------------------------------------------------------------------------
// ADM-1D202, ADM-1D204, ADM-1D217 y ADM-1D218: las dos listas

const LISTAS = [
  {
    nombre: "alumno",
    rol: "estudiante" as Rol,
    ruta: "/estudiante/clases-anteriores",
    inicio: "/estudiante",
    enlace: "Clases anteriores",
    vacio: "No tienes clases anteriores",
    error: TEXTOS_CLASES_ANTERIORES.anteriores.error,
  },
  {
    nombre: "maestro",
    rol: "maestro" as Rol,
    ruta: "/maestro/clases-archivadas",
    inicio: "/maestro",
    enlace: "Clases archivadas",
    vacio: "No tienes clases archivadas",
    error: TEXTOS_CLASES_ANTERIORES.archivadas.error,
  },
]

const pedidasDeLaLista = () => pedidas("GET", "/api/clases/anteriores")

// Dos páginas: la segunda sale con lo que diga `segunda`.
const conSegundaPagina = (segunda: () => Response | Promise<Response>) => {
  servidor.manejador = ({ url }) => {
    if (url.pathname !== "/api/clases/anteriores") return undefined
    if (url.searchParams.get("cursor") === null) {
      return respuestaJson(200, paginaDeAnteriores([1], 1))
    }
    return segunda()
  }
}

describe("ADM-1D202: Clases anteriores del alumno", () => {
  it("ADM-1D202: lista con el nombre, los maestros y cada clase enlazada a su vista", async () => {
    servidor.rol = "estudiante"
    await montar(["/estudiante/clases-anteriores"])
    expect(await screen.findByRole("link", { name: "Clase 1" }, ESPERA)).toHaveAttribute(
      "href",
      `/estudiante/clases-anteriores/${uuid(101)}`,
    )
    expect(screen.getByRole("heading", { level: 1, name: "Clases anteriores" })).toBeInTheDocument()
    expect(screen.getByText(MAESTRO_1.nombre)).toBeInTheDocument()
  })

  it("ADM-1D202: vacío", async () => {
    servidor.rol = "estudiante"
    servidor.manejador = ({ url }) =>
      url.pathname === "/api/clases/anteriores"
        ? respuestaJson(200, paginaDeAnteriores([], null))
        : undefined
    await montar(["/estudiante/clases-anteriores"])
    expect(await screen.findByText("No tienes clases anteriores", {}, ESPERA)).toBeInTheDocument()
    expect(boton("Cargar más")).toBeNull()
  })

  it("ADM-1D202: Cargar más en espera con la petición en vuelo y el foco en la primera clase nueva al cargar la última página", async () => {
    servidor.rol = "estudiante"
    const enVuelo = retener()
    conSegundaPagina(() =>
      enVuelo.promesa.then(() => respuestaJson(200, paginaDeAnteriores([2], null))),
    )
    await montar(["/estudiante/clases-anteriores"])
    const cargar = await buscarBoton("Cargar más")
    act(() => cargar.focus())
    fireEvent.click(cargar)
    await waitFor(() => expect(cargar).toHaveAttribute("aria-busy", "true"), ESPERA)
    enVuelo.soltar()
    const nueva = await screen.findByRole("link", { name: "Clase 2" }, ESPERA)
    await waitFor(() => expect(nueva).toHaveFocus(), ESPERA)
    expect(boton("Cargar más")).toBeNull()
  })

  it("ADM-1D202: la vista de una clase anterior pinta Mis calificaciones sin secciones y el título de la actividad como texto (fila 37)", async () => {
    servidor.rol = "estudiante"
    servidor.archivadas.add(CLASE_A)
    await montar([`/estudiante/clases-anteriores/${CLASE_A}`])
    expect(await screen.findByText("Ensayo final", {}, ESPERA)).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Ensayo final" })).toBeNull()
    expect(screen.queryByRole("link", { name: "Avisos" })).toBeNull()
    expect(screen.queryByRole("link", { name: "Dudas" })).toBeNull()
    expect(screen.getByRole("link", { name: "Volver a clases anteriores" })).toHaveAttribute(
      "href",
      "/estudiante/clases-anteriores",
    )
    expect(avisoFijo()?.textContent).toMatch(/Solo puedes consultarla\.$/)
    expect(screen.getByRole("heading", { level: 1, name: "Historia" })).toBeInTheDocument()
  })

  it("ADM-1D202 fila 37: control: en una clase activa el título sigue siendo un enlace", async () => {
    servidor.rol = "estudiante"
    await montar([`${BASES.estudiante}/calificaciones`])
    expect(await screen.findByRole("link", { name: "Ensayo final" }, ESPERA)).toBeInTheDocument()
  })
})

describe.each(LISTAS)("ADM-1D217 y ADM-1D218 ($nombre)", ({ rol, ruta }) => {
  it("ADM-1D202 y ADM-1D203, texto aprobado: cada fila dice Archivada el {fecha}, no la fecha sola", async () => {
    servidor.rol = rol
    await montar([ruta])
    const enlace = await screen.findByRole("link", { name: "Clase 1" }, ESPERA)
    const fila = enlace.closest("li")
    if (fila === null) throw new Error("Precondición: la clase está en una fila")
    const fecha = formatearFechaLargaConAno(new Date(ARCHIVADA_EN))
    expect(within(fila).getByText(`Archivada el ${fecha}`)).toBeInTheDocument()
    expect(within(fila).queryByText(fecha)).toBeNull()
  })

  it("ADM-1D217 (a, b): la primera página sale sin cursor ni posición y Cargar más pide exactamente los dos, codificados", async () => {
    servidor.rol = rol
    conSegundaPagina(() => respuestaJson(200, paginaDeAnteriores([2], null)))
    await montar([ruta])
    fireEvent.click(await buscarBoton("Cargar más"))
    await screen.findByRole("link", { name: "Clase 2" }, ESPERA)
    const [primera, segunda] = pedidasDeLaLista()
    expect(primera?.url.search).toBe("?limite=20")
    expect(segunda?.url.search).toBe(
      `?limite=20&cursor=${uuid(101)}&cursorArchivadaEn=2026-10-05T12%3A00%3A00.000Z`,
    )
  })

  it("ADM-1D217 (d): dos clics, una petición", async () => {
    servidor.rol = rol
    conSegundaPagina(() => respuestaJson(200, paginaDeAnteriores([2], null)))
    await montar([ruta])
    const cargar = await buscarBoton("Cargar más")
    fireEvent.click(cargar)
    fireEvent.click(cargar)
    await screen.findByRole("link", { name: "Clase 2" }, ESPERA)
    expect(pedidasDeLaLista()).toHaveLength(2)
  })

  it("ADM-1D217 (c): el 400 del cursor dice la frase de lista cambiada una sola vez, sin aviso", async () => {
    servidor.rol = rol
    conSegundaPagina(() => errorJson(400, "VALIDACION", CURSOR_NO_VALIDO))
    await montar([ruta])
    fireEvent.click(await buscarBoton("Cargar más"))
    expect(await screen.findAllByText(LISTA_CAMBIO, {}, ESPERA)).toHaveLength(1)
    expect(errores()).toEqual([])
  })

  it("ADM-1D218: una clase repetida en la segunda página se pinta una vez, sin aviso de claves, y la tercera lleva el cursor de la segunda respuesta", async () => {
    servidor.rol = rol
    const consola = vi.spyOn(console, "error").mockImplementation(() => undefined)
    servidor.manejador = ({ url }) => {
      if (url.pathname !== "/api/clases/anteriores") return undefined
      const cursor = url.searchParams.get("cursor")
      if (cursor === null) return respuestaJson(200, paginaDeAnteriores([1], 1))
      if (cursor === uuid(101)) return respuestaJson(200, paginaDeAnteriores([1, 2], 7))
      return respuestaJson(200, paginaDeAnteriores([3], null))
    }
    await montar([ruta])
    fireEvent.click(await buscarBoton("Cargar más"))
    await screen.findByRole("link", { name: "Clase 2" }, ESPERA)
    expect(screen.getAllByRole("link", { name: "Clase 1" })).toHaveLength(1)
    await waitFor(
      () => expect(boton("Cargar más")).not.toHaveAttribute("aria-busy", "true"),
      ESPERA,
    )
    fireEvent.click(await buscarBoton("Cargar más"))
    await screen.findByRole("link", { name: "Clase 3" }, ESPERA)
    expect(pedidasDeLaLista().at(-1)?.url.searchParams.get("cursor")).toBe(uuid(107))
    expect(consola.mock.calls.filter(([texto]) => String(texto).includes("same key"))).toEqual([])
    consola.mockRestore()
  })
})

// Las frases de las dos listas: la causa es el 400 del cursor o un 500 de la primera página.
const CAUSAS = [
  {
    causa: "400 del cursor",
    texto: () => LISTA_CAMBIO,
    instalar: () => {
      let fallo = false
      servidor.manejador = ({ url }) => {
        if (url.pathname !== "/api/clases/anteriores") return undefined
        if (url.searchParams.get("cursor") === null) {
          return respuestaJson(200, paginaDeAnteriores([1], fallo ? null : 1))
        }
        fallo = true
        return errorJson(400, "VALIDACION", CURSOR_NO_VALIDO)
      }
    },
    provocar: async () => {
      fireEvent.click(await buscarBoton("Cargar más"))
    },
  },
  {
    causa: "error de la primera carga",
    texto: (error: string) => error,
    instalar: () => {
      let intentos = 0
      servidor.manejador = ({ url }) => {
        if (url.pathname !== "/api/clases/anteriores") return undefined
        intentos += 1
        // app/providers.tsx reintenta una vez: los dos primeros intentos fallan.
        if (intentos <= 2) return errorJson(500, "ERROR_INTERNO", "x")
        return respuestaJson(200, paginaDeAnteriores([1], null))
      }
    },
    provocar: () => Promise.resolve(),
  },
]

describe.each(LISTAS)("ADM-1D204 ($nombre)", ({ rol, ruta, inicio, enlace, error }) => {
  describe.each(CAUSAS)("$causa", ({ texto, instalar, provocar }) => {
    const hastaElTexto = async () => {
      servidor.rol = rol
      instalar()
      const router = await montar([inicio, ruta])
      await provocar()
      await screen.findByText(texto(error), {}, ESPERA)
      return router
    }

    const despuesDelCamino = async () => {
      await screen.findByRole("link", { name: "Clase 1" }, ESPERA)
      expect(screen.queryByText(texto(error))).toBeNull()
      expect(pedidasDeLaLista().at(-1)?.url.searchParams.get("cursor")).toBeNull()
    }

    it("ADM-1D204 (a): ir al inicio y volver a entrar antes del staleTime vuelve a pedir la primera página", async () => {
      const router = await hastaElTexto()
      const antes = pedidasDeLaLista().length
      await act(() => router.navigate(inicio))
      fireEvent.click(await screen.findByRole("link", { name: enlace }, ESPERA))
      await despuesDelCamino()
      expect(pedidasDeLaLista().length).toBeGreaterThan(antes)
    })

    it("ADM-1D204 (b): pulsar Inicio en la barra y regresar por el enlace vuelve a pedir la primera página", async () => {
      const router = await hastaElTexto()
      const antes = pedidasDeLaLista().length
      const [inicioEnLaBarra] = screen.getAllByRole("link", { name: "Inicio" })
      if (inicioEnLaBarra === undefined) throw new Error("Precondición: Inicio está en la barra")
      fireEvent.click(inicioEnLaBarra)
      await waitFor(() => expect(router.state.location.pathname).toBe(inicio), ESPERA)
      fireEvent.click(await screen.findByRole("link", { name: enlace }, ESPERA))
      await despuesDelCamino()
      expect(pedidasDeLaLista().length).toBeGreaterThan(antes)
    })

    it("ADM-1D204 (c): atrás y adelante del historial vuelve a pedir la primera página", async () => {
      const router = await hastaElTexto()
      const antes = pedidasDeLaLista().length
      await act(() => router.navigate(-1))
      await waitFor(() => expect(router.state.location.pathname).toBe(inicio), ESPERA)
      await act(() => router.navigate(1))
      await despuesDelCamino()
      expect(pedidasDeLaLista().length).toBeGreaterThan(antes)
    })
  })

  it("ADM-1D204 (a) con dos páginas ya cargadas: el 400 de la tercera y regresar pide solo la primera, sin los cursores viejos", async () => {
    servidor.rol = rol
    let vencidos = false
    servidor.manejador = ({ url }) => {
      if (url.pathname !== "/api/clases/anteriores") return undefined
      const cursor = url.searchParams.get("cursor")
      if (cursor === null) return respuestaJson(200, paginaDeAnteriores([1], 1))
      if (cursor === uuid(101) && !vencidos) return respuestaJson(200, paginaDeAnteriores([2], 7))
      vencidos = true
      return errorJson(400, "VALIDACION", CURSOR_NO_VALIDO)
    }
    const router = await montar([inicio, ruta])
    fireEvent.click(await buscarBoton("Cargar más"))
    await screen.findByRole("link", { name: "Clase 2" }, ESPERA)
    await waitFor(
      () => expect(boton("Cargar más")).not.toHaveAttribute("aria-busy", "true"),
      ESPERA,
    )
    fireEvent.click(await buscarBoton("Cargar más"))
    await screen.findByText(LISTA_CAMBIO, {}, ESPERA)
    await act(() => router.navigate(inicio))
    fireEvent.click(await screen.findByRole("link", { name: enlace }, ESPERA))
    await screen.findByRole("link", { name: "Clase 1" }, ESPERA)
    expect(screen.queryByText(LISTA_CAMBIO)).toBeNull()
    expect(screen.queryByRole("link", { name: "Clase 2" })).toBeNull()
  })

  it("ADM-1D204 (d) con el 400 del cursor y dos páginas cargadas: repetir Cargar más pide solo la primera, el texto desaparece y el foco nunca cae en body", async () => {
    servidor.rol = rol
    let vencidos = false
    servidor.manejador = ({ url }) => {
      if (url.pathname !== "/api/clases/anteriores") return undefined
      const cursor = url.searchParams.get("cursor")
      if (cursor === null) return respuestaJson(200, paginaDeAnteriores([1], 1))
      if (cursor === uuid(101) && !vencidos) return respuestaJson(200, paginaDeAnteriores([2], 7))
      vencidos = true
      return errorJson(400, "VALIDACION", CURSOR_NO_VALIDO)
    }
    await montar([ruta])
    fireEvent.click(await buscarBoton("Cargar más"))
    await screen.findByRole("link", { name: "Clase 2" }, ESPERA)
    await waitFor(
      () => expect(boton("Cargar más")).not.toHaveAttribute("aria-busy", "true"),
      ESPERA,
    )
    const cargar = await buscarBoton("Cargar más")
    act(() => cargar.focus())
    fireEvent.click(cargar)
    await screen.findByText(LISTA_CAMBIO, {}, ESPERA)
    await waitFor(
      () => expect(boton("Cargar más")).not.toHaveAttribute("aria-busy", "true"),
      ESPERA,
    )
    fireEvent.click(await buscarBoton("Cargar más"))
    await screen.findByRole("link", { name: "Clase 1" }, ESPERA)
    expect(screen.queryByText(LISTA_CAMBIO)).toBeNull()
    expect(screen.queryByRole("link", { name: "Clase 2" })).toBeNull()
    expect(document.activeElement).not.toBe(document.body)
  })

  it("ADM-1D204 (d): repetir Cargar más tras un error de la página siguiente vuelve a pedir la primera página y el texto desaparece; el foco se queda en el botón", async () => {
    servidor.rol = rol
    let intentos = 0
    servidor.manejador = ({ url }) => {
      if (url.pathname !== "/api/clases/anteriores") return undefined
      if (url.searchParams.get("cursor") === null) {
        return respuestaJson(200, paginaDeAnteriores([1], 1))
      }
      intentos += 1
      if (intentos <= 2) return errorJson(500, "ERROR_INTERNO", "x")
      return respuestaJson(200, paginaDeAnteriores([2], null))
    }
    await montar([ruta])
    const cargar = await buscarBoton("Cargar más")
    act(() => cargar.focus())
    fireEvent.click(cargar)
    await screen.findByText(error, {}, ESPERA)
    expect(screen.queryByRole("link", { name: "Clase 1" })).toBeNull()
    expect(boton("Cargar más")).toBe(cargar)
    expect(cargar).toHaveFocus()
    expect(errores()).toEqual([])
    const antes = pedidasDeLaLista().filter((l) => l.url.searchParams.get("cursor") === null).length
    await waitFor(() => expect(cargar).not.toHaveAttribute("aria-busy", "true"), ESPERA)
    fireEvent.click(cargar)
    await screen.findByRole("link", { name: "Clase 1" }, ESPERA)
    expect(screen.queryByText(error)).toBeNull()
    expect(pedidasDeLaLista().filter((l) => l.url.searchParams.get("cursor") === null).length).toBe(
      antes + 1,
    )
    expect(cargar).toHaveFocus()
  })
})

// ------------------------------------------------------------------------------------------------
// ADM-1D205 y ADM-1D206

describe("ADM-1D205: Exportar a Excel en una archivada", () => {
  it("ADM-1D205: en el gradebook de una archivada arma el archivo", async () => {
    servidor.archivadas.add(CLASE_A)
    const columna = {
      id: TAREA_1,
      titulo: "Tarea A",
      fechaLimite: "2030-01-15T16:00:00.000Z",
      puntos: 10,
      categoria: null,
    }
    const alumno = { id: ALUMNO, nombre: "Beto Díaz", email: "beto@ejemplo.mx" }
    const celda = { tareaId: TAREA_1, estado: "asignado", conRetraso: false, calificacion: null }
    servidor.manejador = ({ url }) => {
      if (url.pathname === `${API}/gradebook`) {
        return respuestaJson(200, {
          tareas: [columna],
          siguienteCursorTareas: null,
          alumnos: [
            {
              alumno: { id: alumno.id, nombre: alumno.nombre },
              celdas: [celda],
              porcentaje: null,
              vencidasSinEntregar: 0,
              motivosDeRiesgo: [],
            },
          ],
          siguienteCursor: null,
          resumen: { modo: "puntos", totalAlumnos: 1, promedioDeLaClase: null, alumnosEnRiesgo: 0 },
        })
      }
      if (url.pathname === `${API}/calificaciones/exportacion`) {
        return respuestaJson(200, {
          clase: { nombre: "Historia" },
          tareas: [columna],
          siguienteCursorTareas: null,
          totalTareas: 1,
          alumnos: [{ alumno, celdas: [celda], porcentaje: null }],
          siguienteCursor: null,
          totalAlumnos: 1,
        })
      }
      return undefined
    }
    await montar([`${BASES.maestro}/calificaciones`])
    fireEvent.click(await buscarBoton("Exportar a Excel"))
    await waitFor(() => expect(descargarArchivo).toHaveBeenCalledTimes(1), ESPERA)
  })
})

describe("ADM-1D206: key del Outlet", () => {
  it("ADM-1D206: al pasar de la clase anterior A a la B sin desmontar el marco, el filtro vuelve a Todas y B se pide una vez, nunca con el filtro de A", async () => {
    servidor.rol = "estudiante"
    servidor.archivadas.add(CLASE_A)
    servidor.archivadas.add(CLASE_B)
    // El detalle de B ya en caché: sin «Cargando» de por medio, solo la key reinicia el filtro.
    const cliente = clienteDePrueba()
    cliente.setQueryData(claveClaseDetalle(CLASE_B), detalle(CLASE_B))
    const router = await montar([`/estudiante/clases-anteriores/${CLASE_A}`], cliente)
    const filtro = await screen.findByLabelText("Mostrar", {}, ESPERA)
    await screen.findByText("Ensayo final", {}, ESPERA)
    fireEvent.change(filtro, { target: { value: "calificadas" } })
    await waitFor(
      () =>
        expect(
          pedidas("GET", `${API}/mis-calificaciones`).at(-1)?.url.searchParams.get("estado"),
        ).toBe("calificadas"),
      ESPERA,
    )
    await act(() => router.navigate(`/estudiante/clases-anteriores/${CLASE_B}`))
    await screen.findByRole("heading", { level: 1, name: "Geografía" }, ESPERA)
    await screen.findByText("Ensayo final", {}, ESPERA)
    expect(screen.getByLabelText("Mostrar")).toHaveValue("todas")
    const deB = pedidas("GET", `/api/clases/${CLASE_B}/mis-calificaciones`)
    expect(deB.map((l) => l.url.searchParams.get("estado"))).toEqual(["todas"])
  })
})

// ------------------------------------------------------------------------------------------------
// ADM-1D208, ADM-1D215, ADM-1D216, ADM-1D219 y ADM-1D233: el alumno y la suscripción

describe("ADM-1D208: N-05", () => {
  it.each([
    ["el muro", ""],
    ["trabajo", "/trabajo"],
    ["calificaciones", "/calificaciones"],
  ])(
    "ADM-1D208: el alumno en %s de una archivada termina en la clase anterior con replace, sin que ninguna sección pida su lista",
    async (_nombre, resto) => {
      servidor.rol = "estudiante"
      servidor.archivadas.add(CLASE_A)
      const router = await montar(["/estudiante", `${BASES.estudiante}${resto}`])
      await screen.findByText("Ensayo final", {}, ESPERA)
      expect(router.state.location.pathname).toBe(`/estudiante/clases-anteriores/${CLASE_A}`)
      expect(pedidas("GET", `${API}/publicaciones`)).toHaveLength(0)
      expect(pedidas("GET", `${API}/temas`)).toHaveLength(0)
      expect(pedidas("GET", `${API}/trabajo`)).toHaveLength(0)
      expect(pedidas("GET", `${API}/mis-calificaciones`)).toHaveLength(1)
      await act(() => router.navigate(-1))
      await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"), ESPERA)
    },
  )
})

describe("ADM-1D215: Descargar del alumno", () => {
  it("ADM-1D215 (recurso): un solo aviso, el detalle se marca viejo y termina en la redirección de N-05", async () => {
    servidor.rol = "estudiante"
    servidor.manejador = ({ url }) =>
      url.pathname === `${API}/archivos/${ARCHIVO}/descarga` ? archivadaJson() : undefined
    const cliente = clienteDePrueba()
    const router = await montar([`${BASES.estudiante}/recursos`], cliente)
    fireEvent.click(await buscarBoton(/^Ver recurso/))
    const descargar = await buscarBoton(/^Descargar/)
    servidor.archivadas.add(CLASE_A)
    fireEvent.click(descargar)
    await waitFor(
      () => expect(router.state.location.pathname).toBe(`/estudiante/clases-anteriores/${CLASE_A}`),
      ESPERA,
    )
    await waitFor(() => expect(errores()).toEqual([ARCHIVADA]), ESPERA)
    expect(pedidas("GET", API).length).toBe(2)
  })
})

describe("ADM-1D216: una lista del alumno recibe el 409", () => {
  it("ADM-1D216: la vista muestra su error una vez, el detalle se marca viejo y termina en la redirección de N-05", async () => {
    servidor.rol = "estudiante"
    const cliente = clienteDePrueba()
    const router = await montar([BASES.estudiante], cliente)
    await screen.findByText("Primer aviso", {}, ESPERA)
    const detalleRetenido = retener()
    servidor.manejador = ({ url, metodo }) => {
      if (url.pathname === `${API}/publicaciones` && metodo === "GET") return archivadaJson()
      if (url.pathname === API) {
        return detalleRetenido.promesa.then(() => {
          servidor.archivadas.add(CLASE_A)
          return respuestaJson(200, detalle(CLASE_A))
        })
      }
      return undefined
    }
    await act(() =>
      cliente.invalidateQueries({ queryKey: ["clases", CLASE_A, "publicaciones"], exact: true }),
    )
    expect(await screen.findAllByText(ARCHIVADA, {}, ESPERA)).toHaveLength(1)
    expect(errores()).toEqual([])
    detalleRetenido.soltar()
    await waitFor(
      () => expect(router.state.location.pathname).toBe(`/estudiante/clases-anteriores/${CLASE_A}`),
      ESPERA,
    )
  })
})

describe("ADM-1D219: N-16, ClaseLayout pasa de la clase A a la B sin desmontarse", () => {
  it.each(["consulta", "mutación"])(
    "ADM-1D219 (%s de B con 409): el detalle de B se pide una sola vez más y el de A, ninguna",
    async (origen) => {
      const cliente = clienteDePrueba()
      const router = await montar([BASES.maestro], cliente)
      await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
      await act(() => router.navigate(`/maestro/clases/${CLASE_B}`))
      await screen.findByRole("heading", { level: 1, name: "Geografía" }, ESPERA)
      const deA = pedidas("GET", API).length
      const deB = pedidas("GET", `/api/clases/${CLASE_B}`).length
      if (origen === "consulta") {
        servidor.archivadas.add(CLASE_B)
        await act(() => cliente.invalidateQueries({ queryKey: claveCodigoDeClase(CLASE_B) }))
      } else {
        servidor.manejador = ({ url }) =>
          url.pathname === `/api/clases/${CLASE_B}/prueba` ? archivadaJson() : undefined
        servidor.archivadas.add(CLASE_B)
        const observador = new MutationObserver(cliente, {
          mutationFn: () =>
            api(`/api/clases/${CLASE_B}/prueba`, { method: "POST", schema: sinContenidoSchema }),
        })
        await act(() => observador.mutate().catch(() => undefined))
      }
      await waitFor(() => expect(avisoFijo()).not.toBeNull(), ESPERA)
      expect(pedidas("GET", `/api/clases/${CLASE_B}`).length).toBe(deB + 1)
      expect(pedidas("GET", API).length).toBe(deA)
    },
  )
})

describe("ADM-1D233: el alumno con los comentarios abiertos y la clase se archiva", () => {
  const abrirComentariosDelAlumno = async () => {
    fireEvent.click(await buscarBoton("Ver comentarios (1)"))
    await screen.findByText("Un comentario", {}, ESPERA)
  }
  const irseAClaseAnterior = async (router: Awaited<ReturnType<typeof montar>>) => {
    await waitFor(
      () => expect(router.state.location.pathname).toBe(`/estudiante/clases-anteriores/${CLASE_A}`),
      ESPERA,
    )
  }

  it("ADM-1D233 (a): con texto escrito ninguna escritura sale y el formulario ya no está", async () => {
    servidor.rol = "estudiante"
    const cliente = clienteDePrueba()
    const router = await montar(["/estudiante", BASES.estudiante], cliente)
    await abrirComentariosDelAlumno()
    fireEvent.change(screen.getByLabelText("Escribe un comentario"), {
      target: { value: "Se queda" },
    })
    await cambiarDetalle(cliente, true)
    await irseAClaseAnterior(router)
    expect(screen.queryByLabelText("Escribe un comentario")).toBeNull()
    expect(escrituras()).toHaveLength(0)
    await act(() => router.navigate(-1))
    await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"), ESPERA)
  })

  it("ADM-1D233 (b): con el DELETE de su comentario en vuelo, al soltarlo un solo aviso y ningún otro DELETE", async () => {
    servidor.rol = "estudiante"
    const cliente = clienteDePrueba()
    const router = await montar([BASES.estudiante], cliente)
    await abrirComentariosDelAlumno()
    const enVuelo = retener()
    servidor.manejador = ({ metodo }) =>
      metodo === "DELETE"
        ? enVuelo.promesa.then(() => new Response(null, { status: 204 }))
        : undefined
    const fila = document.querySelector<HTMLElement>(`[data-comentario-id="${COMENTARIO}"]`)
    if (fila === null) throw new Error("Precondición: el comentario está en pantalla")
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar" }))
    fireEvent.click(await within(fila).findByRole("button", { name: /^Sí, borrar/ }, ESPERA))
    await waitFor(
      () => expect(llamadas.filter((l) => l.metodo === "DELETE")).toHaveLength(1),
      ESPERA,
    )
    await cambiarDetalle(cliente, true)
    await irseAClaseAnterior(router)
    enVuelo.soltar()
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    expect(errores()).toEqual([])
    expect(llamadas.filter((l) => l.metodo === "DELETE")).toHaveLength(1)
  })

  it("ADM-1D233 (c): con el POST de comentar en vuelo que recibe el 409, un solo aviso con el texto de archivada", async () => {
    servidor.rol = "estudiante"
    const cliente = clienteDePrueba()
    const router = await montar([BASES.estudiante], cliente)
    await abrirComentariosDelAlumno()
    const enVuelo = retener()
    servidor.manejador = ({ metodo, url }) =>
      metodo === "POST" && url.pathname.endsWith("/comentarios")
        ? enVuelo.promesa.then(() => archivadaJson())
        : undefined
    fireEvent.change(screen.getByLabelText("Escribe un comentario"), {
      target: { value: "Con la clase abierta" },
    })
    fireEvent.click(await buscarBoton("Comentar"))
    await waitFor(() => expect(escrituras()).toHaveLength(1), ESPERA)
    await cambiarDetalle(cliente, true)
    await irseAClaseAnterior(router)
    enVuelo.soltar()
    await waitFor(() => expect(errores()).toEqual([ARCHIVADA]), ESPERA)
  })
})

// ------------------------------------------------------------------------------------------------
// ADM-1D220 (filas 24, 25, 26, 28 y 29; las 32, 33 y 36 están en features/tareas)

describe("ADM-1D220: al restaurar nada reaparece abierto", () => {
  const dosVueltas = async (cliente: QueryClient) => {
    await archivar(cliente)
    fueraDeBody()
    await restaurar(cliente)
    await archivar(cliente)
    await restaurar(cliente)
  }

  it("ADM-1D220 fila 24: «Sí, borrar duda» no reaparece, tampoco tras dos vueltas, sin escrituras y con el foco donde quedó", async () => {
    servidor.rol = "admin"
    const cliente = clienteDePrueba()
    await montar([`${BASES.admin}/dudas`], cliente)
    const fila = await filaDeDuda(DUDA)
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar duda" }))
    await within(fila).findByRole("button", { name: "Sí, borrar duda" }, ESPERA)
    await archivar(cliente)
    fueraDeBody()
    const foco = document.activeElement
    await restaurar(cliente)
    expect(boton("Sí, borrar duda")).toBeNull()
    expect(document.activeElement).toBe(foco)
    await dosVueltas(cliente)
    expect(boton("Sí, borrar duda")).toBeNull()
    expect(escrituras()).toHaveLength(0)
  })

  it("ADM-1D220 fila 25: el formulario de responder renace sin llevarse el foco (enfocarCampo)", async () => {
    const cliente = clienteDePrueba()
    await montar([`${BASES.maestro}/dudas`], cliente)
    const fila = await filaDeDuda(DUDA_SIN_RESPUESTAS)
    fireEvent.click(within(fila).getByRole("button", { name: "Responder" }))
    const campo = await within(fila).findByLabelText("Escribe una respuesta", {}, ESPERA)
    await waitFor(() => expect(campo).toHaveFocus(), ESPERA)
    await archivar(cliente)
    const ocultar = within(fila).getByRole("button", { name: "Ocultar respuestas" })
    act(() => ocultar.focus())
    await restaurar(cliente)
    await within(fila).findByLabelText("Escribe una respuesta", {}, ESPERA)
    expect(ocultar).toHaveFocus()
    await archivar(cliente)
    await restaurar(cliente)
    expect(ocultar).toHaveFocus()
    expect(escrituras()).toHaveLength(0)
  })

  it("ADM-1D220 control: Ver respuestas abierto sigue abierto (lectura)", async () => {
    const cliente = clienteDePrueba()
    await montar([`${BASES.maestro}/dudas`], cliente)
    await abrirRespuestas()
    await archivar(cliente)
    expect(screen.getByText("El viernes")).toBeInTheDocument()
    await restaurar(cliente)
    expect(screen.getByText("El viernes")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Ocultar respuestas" })).toBeInTheDocument()
  })

  it("ADM-1D220 fila 26: «Sí, borrar respuesta» no reaparece", async () => {
    const cliente = clienteDePrueba()
    await montar([`${BASES.maestro}/dudas`], cliente)
    await abrirRespuestas()
    fireEvent.click(await buscarBoton("Borrar"))
    await buscarBoton("Sí, borrar respuesta")
    await archivar(cliente)
    fueraDeBody()
    await restaurar(cliente)
    expect(boton("Sí, borrar respuesta")).toBeNull()
    await dosVueltas(cliente)
    expect(boton("Sí, borrar respuesta")).toBeNull()
    expect(escrituras()).toHaveLength(0)
  })

  it("ADM-1D220 fila 28: «Sí, quitar» del alumno no reaparece y el foco va al encabezado Alumnos", async () => {
    const cliente = clienteDePrueba()
    await montar([`${BASES.maestro}/personas`], cliente)
    fireEvent.click(await buscarBoton(/^Quitar Beto/))
    await buscarBoton(/^Sí, quitar Beto/)
    await archivar(cliente)
    await waitFor(
      () => expect(screen.getByRole("heading", { name: "Alumnos" })).toHaveFocus(),
      ESPERA,
    )
    await restaurar(cliente)
    expect(boton(/^Sí, quitar Beto/)).toBeNull()
    await dosVueltas(cliente)
    expect(boton(/^Sí, quitar Beto/)).toBeNull()
    expect(escrituras()).toHaveLength(0)
  })

  it("ADM-1D220 fila 29: «Sí, quitar» del maestro no reaparece y con el foco en «Quitar» va al h1", async () => {
    servidor.rol = "admin"
    servidor.maestros = [MAESTRO_1, MAESTRO_2]
    const cliente = clienteDePrueba()
    await montar([`${BASES.admin}/personas`], cliente)
    const quitar = await buscarBoton(/^Quitar Rosa/)
    fireEvent.click(quitar)
    await buscarBoton(/^Sí, quitar Rosa/)
    await archivar(cliente)
    fueraDeBody()
    await restaurar(cliente)
    expect(boton(/^Sí, quitar Rosa/)).toBeNull()
    await dosVueltas(cliente)
    expect(boton(/^Sí, quitar Rosa/)).toBeNull()
    const otraVez = await buscarBoton(/^Quitar Rosa/)
    act(() => otraVez.focus())
    await archivar(cliente)
    await waitFor(
      () => expect(screen.getByRole("heading", { level: 1, name: "Historia" })).toHaveFocus(),
      ESPERA,
    )
    expect(escrituras()).toHaveLength(0)
  })

  it("ADM-1D220 fila 23: «Marcar como resuelta» en vuelo al archivar no deja la guarda marcada al restaurar", async () => {
    servidor.rol = "admin"
    const enVuelo = retener()
    servidor.manejador = ({ metodo }) =>
      metodo === "PUT" ? enVuelo.promesa.then(() => archivadaJson()) : undefined
    const cliente = clienteDePrueba()
    await montar([`${BASES.admin}/dudas`], cliente)
    const fila = await filaDeDuda(DUDA_SIN_RESPUESTAS)
    fireEvent.click(within(fila).getByRole("button", { name: "Marcar como resuelta" }))
    await waitFor(() => expect(escrituras()).toHaveLength(1), ESPERA)
    await archivar(cliente)
    enVuelo.soltar()
    await waitFor(() => expect(errores()).toEqual([ARCHIVADA]), ESPERA)
    servidor.manejador = sinManejador
    await restaurar(cliente)
    const deNuevo = within(fila).getByRole("button", { name: "Marcar como resuelta" })
    await waitFor(() => expect(deNuevo).not.toHaveAttribute("aria-busy", "true"), ESPERA)
  })
})

// ------------------------------------------------------------------------------------------------
// ADM-1D223: filas con "Ya estaba" (22 a 30): un 409 con el control oculto da un solo aviso

interface EnvioConElControlOculto {
  fila: number
  rol: Rol
  seccion: string
  dos?: boolean
  enviar: () => Promise<void>
}

const ENVIOS: EnvioConElControlOculto[] = [
  {
    fila: 22,
    rol: "maestro",
    seccion: "dudas",
    enviar: async () => {
      fireEvent.change(await screen.findByLabelText("Escribe tu duda", {}, ESPERA), {
        target: { value: "Una duda" },
      })
      fireEvent.click(await buscarBoton("Publicar duda"))
    },
  },
  {
    fila: 23,
    rol: "admin",
    seccion: "dudas",
    enviar: async () => {
      fireEvent.click(await buscarBoton("Marcar como resuelta"))
    },
  },
  {
    fila: 24,
    rol: "admin",
    seccion: "dudas",
    enviar: async () => {
      const fila = await filaDeDuda(DUDA)
      fireEvent.click(within(fila).getByRole("button", { name: "Borrar duda" }))
      fireEvent.click(await within(fila).findByRole("button", { name: "Sí, borrar duda" }, ESPERA))
    },
  },
  {
    fila: 25,
    rol: "maestro",
    seccion: "dudas",
    enviar: async () => {
      await abrirRespuestas()
      fireEvent.change(screen.getByLabelText("Escribe una respuesta"), {
        target: { value: "Una respuesta" },
      })
      const formulario = screen.getByLabelText("Escribe una respuesta").closest("form")
      if (formulario === null) throw new Error("Precondición: el campo está en un formulario")
      fireEvent.click(within(formulario).getByRole("button", { name: "Responder" }))
    },
  },
  {
    fila: 26,
    rol: "maestro",
    seccion: "dudas",
    enviar: async () => {
      await abrirRespuestas()
      fireEvent.click(await buscarBoton("Borrar"))
      fireEvent.click(await buscarBoton("Sí, borrar respuesta"))
    },
  },
  {
    fila: 27,
    rol: "maestro",
    seccion: "personas",
    enviar: async () => {
      fireEvent.change(await screen.findByLabelText("Buscar alumno por nombre", {}, ESPERA), {
        target: { value: "Carla" },
      })
      fireEvent.click(await buscarBoton(/^Agregar a la clase/))
    },
  },
  {
    fila: 28,
    rol: "maestro",
    seccion: "personas",
    enviar: async () => {
      fireEvent.click(await buscarBoton(/^Quitar Beto/))
      fireEvent.click(await buscarBoton(/^Sí, quitar Beto/))
    },
  },
  {
    fila: 29,
    rol: "admin",
    seccion: "personas",
    dos: true,
    enviar: async () => {
      fireEvent.click(await buscarBoton(/^Quitar Rosa/))
      fireEvent.click(await buscarBoton(/^Sí, quitar Rosa/))
    },
  },
  {
    fila: 30,
    rol: "admin",
    seccion: "personas",
    enviar: async () => {
      fireEvent.change(await screen.findByLabelText("Buscar maestro por nombre", {}, ESPERA), {
        target: { value: "Rita" },
      })
      fireEvent.click(await buscarBoton(/^Asignar a la clase/))
    },
  },
]

describe("ADM-1D223: las filas con Ya estaba", () => {
  it.each(ENVIOS)(
    "ADM-1D223 fila $fila: el 409 con el control oculto da un solo aviso",
    async ({ rol, seccion, dos, enviar }) => {
      servidor.rol = rol
      if (dos === true) servidor.maestros = [MAESTRO_1, MAESTRO_2]
      const enVuelo = retener()
      servidor.manejador = ({ metodo }) =>
        metodo !== "GET" ? enVuelo.promesa.then(() => archivadaJson()) : undefined
      const cliente = clienteDePrueba()
      await montar([`${BASES[rol]}/${seccion}`], cliente)
      await enviar()
      await waitFor(() => expect(escrituras()).toHaveLength(1), ESPERA)
      await archivar(cliente)
      enVuelo.soltar()
      await waitFor(() => expect(errores()).toEqual([ARCHIVADA]), ESPERA)
      expect(escrituras()).toHaveLength(1)
    },
  )
})

// ------------------------------------------------------------------------------------------------
// ADM-1D224 a ADM-1D232: la tabla D

const MINIMO = /Una clase necesita al menos un maestro/
const TOPE = /La clase ya tiene 2 maestros/
const VACIO_CON_CODIGO = /Comparte el código/
const VACIO_DE_LA_CLASE = "Aún no hay alumnos en esta clase"

describe("ADM-1D224 a ADM-1D226: maestros de la clase", () => {
  it("ADM-1D224: con un maestro, minimo no se pinta en una archivada, sí en una activa, y vuelve al restaurar", async () => {
    servidor.rol = "admin"
    const cliente = clienteDePrueba()
    await montar([`${BASES.admin}/personas`], cliente)
    expect(await screen.findByText(MINIMO, {}, ESPERA)).toBeInTheDocument()
    await archivar(cliente)
    expect(screen.queryByText(MINIMO)).toBeNull()
    await restaurar(cliente)
    expect(await screen.findByText(MINIMO, {}, ESPERA)).toBeInTheDocument()
  })

  it("ADM-1D225: con dos maestros, tope no se pinta en una archivada, sí en una activa, y vuelve al restaurar", async () => {
    servidor.rol = "admin"
    servidor.maestros = [MAESTRO_1, MAESTRO_2]
    const cliente = clienteDePrueba()
    await montar([`${BASES.admin}/personas`], cliente)
    expect(await screen.findByText(TOPE, {}, ESPERA)).toBeInTheDocument()
    await archivar(cliente)
    expect(screen.queryByText(TOPE)).toBeNull()
    await restaurar(cliente)
    expect(await screen.findByText(TOPE, {}, ESPERA)).toBeInTheDocument()
  })

  it.each([
    ["un maestro", [MAESTRO_1]],
    ["dos maestros", [MAESTRO_1, MAESTRO_2]],
  ])(
    "ADM-1D226 (%s): la tarjeta Asignar maestro y su título no se pintan en una archivada y vuelven al restaurar",
    async (_nombre, maestros) => {
      servidor.rol = "admin"
      servidor.maestros = maestros
      const titulo = () => screen.queryByRole("heading", { name: "Asignar maestro" })
      const cliente = clienteDePrueba()
      await montar([`${BASES.admin}/personas`], cliente)
      await screen.findByRole("heading", { name: "Asignar maestro" }, ESPERA)
      await archivar(cliente)
      expect(titulo()).toBeNull()
      expect(screen.getByRole("heading", { name: "Maestros de la clase" })).toBeInTheDocument()
      await restaurar(cliente)
      expect(titulo()).not.toBeNull()
    },
  )

  it("ADM-1D226: en el formulario de duplicar de una archivada, el buscador sigue", async () => {
    servidor.rol = "admin"
    servidor.archivadas.add(CLASE_A)
    await montar([`${BASES.admin}/duplicar`])
    expect(
      await screen.findByLabelText("Buscar maestro por nombre", {}, ESPERA),
    ).toBeInTheDocument()
  })
})

describe("ADM-1D227 y ADM-1D228: la tabla de alumnos", () => {
  it("ADM-1D227: no pinta el encabezado Acciones ni su celda en una archivada, las demás columnas siguen y vuelven al restaurar", async () => {
    const cliente = clienteDePrueba()
    await montar([`${BASES.maestro}/personas`], cliente)
    await screen.findByRole("cell", { name: "beto@ejemplo.mx" }, ESPERA)
    expect(screen.getByRole("columnheader", { name: "Acciones" })).toBeInTheDocument()
    expect(screen.getAllByRole("cell")).toHaveLength(6)
    await archivar(cliente)
    expect(screen.queryByRole("columnheader", { name: "Acciones" })).toBeNull()
    expect(screen.getAllByRole("columnheader")).toHaveLength(5)
    expect(screen.getAllByRole("cell")).toHaveLength(5)
    await restaurar(cliente)
    expect(screen.getByRole("columnheader", { name: "Acciones" })).toBeInTheDocument()
  })

  it("ADM-1D228: sin alumnos se lee el vacío de la clase y no Comparte el código; al restaurar vuelve el de la activa", async () => {
    servidor.alumnos = 0
    const cliente = clienteDePrueba()
    await montar([`${BASES.maestro}/personas`], cliente)
    expect(await screen.findByText(VACIO_CON_CODIGO, {}, ESPERA)).toBeInTheDocument()
    await archivar(cliente)
    expect(screen.getByText(VACIO_DE_LA_CLASE)).toBeInTheDocument()
    expect(screen.queryByText(VACIO_CON_CODIGO)).toBeNull()
    await restaurar(cliente)
    expect(screen.getByText(VACIO_CON_CODIGO)).toBeInTheDocument()
  })
})

describe("ADM-1D229 a ADM-1D231: Avisos, Dudas y Categorías", () => {
  it.each([
    ["maestro" as Rol, "Publica el primer aviso de tu clase."],
    ["admin" as Rol, "Publica el primer aviso de esta clase."],
  ])(
    "ADM-1D229 (%s): sin avisos se lee el vacío neutro en una archivada y el suyo en una activa",
    async (rol, suyo) => {
      servidor.rol = rol
      servidor.avisos = 0
      const cliente = clienteDePrueba()
      await montar([BASES[rol]], cliente)
      expect(await screen.findByText(suyo, {}, ESPERA)).toBeInTheDocument()
      await archivar(cliente)
      expect(screen.getByText("Aún no hay avisos en esta clase.")).toBeInTheDocument()
      expect(screen.queryByText(suyo)).toBeNull()
      await restaurar(cliente)
      expect(screen.getByText(suyo)).toBeInTheDocument()
    },
  )

  it("ADM-1D230: en Dudas no se lee la frase en una archivada; el título y la lista siguen; al restaurar vuelve", async () => {
    const frase = "Lo que escribas aquí lo ve toda la clase."
    const cliente = clienteDePrueba()
    await montar([`${BASES.maestro}/dudas`], cliente)
    expect(await screen.findByText(frase, {}, ESPERA)).toBeInTheDocument()
    await filaDeDuda(DUDA)
    await archivar(cliente)
    expect(screen.queryByText(frase)).toBeNull()
    expect(screen.getByRole("heading", { name: "Dudas" })).toBeInTheDocument()
    expect(screen.getByText("¿Cuándo es el examen?")).toBeInTheDocument()
    await restaurar(cliente)
    expect(screen.getByText(frase)).toBeInTheDocument()
  })

  it("ADM-1D231: en Categorías no se lee la frase de los pesos en una archivada; las categorías siguen; al restaurar vuelve", async () => {
    const frase = /Los pesos deben sumar 100/
    const cliente = clienteDePrueba()
    await montar([`${BASES.maestro}/categorias`], cliente)
    expect(await screen.findByText(frase, {}, ESPERA)).toBeInTheDocument()
    await archivar(cliente)
    expect(screen.queryByText(frase)).toBeNull()
    expect(await screen.findByText("Tareas", {}, ESPERA)).toBeInTheDocument()
    await restaurar(cliente)
    expect(screen.getByText(frase)).toBeInTheDocument()
  })

  it("ADM-1D232 fila 20: una recarga que falla en una archivada no avisa Puedes seguir editando; al restaurar, sin aviso", async () => {
    const cliente = clienteDePrueba()
    await montar([`${BASES.maestro}/recursos/${RECURSO}/editar`], cliente)
    await screen.findByDisplayValue("Guía de estudio", {}, ESPERA)
    await archivar(cliente)
    expect(screen.getByText(ARCHIVADA)).toBeInTheDocument()
    servidor.manejador = ({ url, metodo }) =>
      url.pathname === `${API}/recursos/${RECURSO}` && metodo === "GET"
        ? errorJson(500, "ERROR_INTERNO", "x")
        : undefined
    await act(() =>
      cliente
        .refetchQueries({ queryKey: ["clases", CLASE_A, "recurso", RECURSO], exact: true })
        .catch(() => undefined),
    )
    await waitFor(
      () =>
        expect(cliente.getQueryState(["clases", CLASE_A, "recurso", RECURSO])?.status).toBe(
          "error",
        ),
      ESPERA,
    )
    expect(errores()).toEqual([])
    expect(screen.getByText(ARCHIVADA)).toBeInTheDocument()
    await restaurar(cliente)
    await screen.findByDisplayValue("Guía de estudio", {}, ESPERA)
    expect(errores()).toEqual([])
  })
})

// ------------------------------------------------------------------------------------------------
// ADM-1D234, ADM-1D235 y ADM-1D236: la vista de una clase anterior

const RUTA_ANTERIOR = `/estudiante/clases-anteriores/${CLASE_A}`

describe("ADM-1D234: la clase activa en la vista de una clase anterior", () => {
  it("ADM-1D234 (a): termina en la clase con replace, sin pedir Mis calificaciones de esa ruta", async () => {
    servidor.rol = "estudiante"
    const router = await montar(["/estudiante", RUTA_ANTERIOR])
    await screen.findByText("Primer aviso", {}, ESPERA)
    expect(router.state.location.pathname).toBe(BASES.estudiante)
    expect(pedidas("GET", `${API}/mis-calificaciones`)).toHaveLength(0)
    await act(() => router.navigate(-1))
    await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"), ESPERA)
  })

  it("ADM-1D234 (b): con la vista abierta y la clase ya restaurada, la misma redirección, sin aviso", async () => {
    servidor.rol = "estudiante"
    servidor.archivadas.add(CLASE_A)
    const cliente = clienteDePrueba()
    const router = await montar([RUTA_ANTERIOR], cliente)
    await screen.findByText("Ensayo final", {}, ESPERA)
    await cambiarDetalle(cliente, false)
    await waitFor(() => expect(router.state.location.pathname).toBe(BASES.estudiante), ESPERA)
    expect(errores()).toEqual([])
    expect(aviso.success).not.toHaveBeenCalled()
  })

  it("ADM-1D234 (c): sin ciclo: caché archivada y servidor activa, y al revés; el detalle se pide una vez por transición", async () => {
    servidor.rol = "estudiante"
    servidor.archivadas.add(CLASE_A)
    const cliente = clienteDePrueba()
    const router = await montar([RUTA_ANTERIOR], cliente)
    await screen.findByText("Ensayo final", {}, ESPERA)
    expect(pedidas("GET", API)).toHaveLength(1)
    await cambiarDetalle(cliente, false)
    await waitFor(() => expect(router.state.location.pathname).toBe(BASES.estudiante), ESPERA)
    await screen.findByText("Primer aviso", {}, ESPERA)
    expect(pedidas("GET", API)).toHaveLength(2)
    await cambiarDetalle(cliente, true)
    await waitFor(() => expect(router.state.location.pathname).toBe(RUTA_ANTERIOR), ESPERA)
    await screen.findByText("Ensayo final", {}, ESPERA)
    expect(pedidas("GET", API)).toHaveLength(3)
    expect(router.state.location.pathname).toBe(RUTA_ANTERIOR)
  })

  it("ADM-1D234 (d): con 403 el texto de sin acceso y Volver a clases anteriores, sin redirigir", async () => {
    servidor.rol = "estudiante"
    servidor.manejador = ({ url }) =>
      url.pathname === API ? errorJson(403, "SIN_ACCESO_A_LA_CLASE", SIN_ACCESO) : undefined
    const router = await montar([RUTA_ANTERIOR])
    expect(await screen.findByText(SIN_ACCESO, {}, ESPERA)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Volver a clases anteriores" })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(RUTA_ANTERIOR)
  })
})

const CURSOR_DE_CLASE_ANTERIOR =
  "Tus tareas cambiaron mientras las veías. Vuelve a abrir esta clase para verlas completas."
const CURSOR_DE_HOY =
  "Tus tareas cambiaron mientras las veías. Vuelve a abrir Calificaciones para verlas completas."
const CARGA_FALLIDA = "No pudimos cargar tus calificaciones. Inténtalo de nuevo."
const MAS_FALLIDO = "No pudimos cargar más tareas. Inténtalo de nuevo."

// El servidor de "Mis calificaciones" de la clase archivada: la primera página tiene más; la siguiente
// responde lo que diga `siguiente`.
const conMisCalificaciones = (siguiente: () => Response) => {
  servidor.archivadas.add(CLASE_A)
  servidor.manejador = ({ url }) => {
    if (url.pathname !== `${API}/mis-calificaciones`) return undefined
    if (url.searchParams.get("cursor") === null) {
      return respuestaJson(
        200,
        misCalificaciones([tareaDeMisCalificaciones(TAREA_1, "Ensayo final")], TAREA_1),
      )
    }
    return siguiente()
  }
}

const delPrimerPaso = () =>
  pedidas("GET", `${API}/mis-calificaciones`).filter(
    (l) => l.url.searchParams.get("cursor") === null,
  ).length

interface CaminoDeLaVista {
  camino: string
  recorrer: (router: Awaited<ReturnType<typeof montar>>) => Promise<void>
}

const volverYAbrir: CaminoDeLaVista = {
  camino: "(a) Volver a clases anteriores y abrir la misma clase antes del staleTime",
  recorrer: async () => {
    fireEvent.click(screen.getByRole("link", { name: "Volver a clases anteriores" }))
    fireEvent.click(await screen.findByRole("link", { name: "Clase A" }, ESPERA))
  },
}
const atrasYAdelante: CaminoDeLaVista = {
  camino: "(b) atrás y adelante del historial",
  recorrer: async (router) => {
    await act(() => router.navigate(-1))
    await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"), ESPERA)
    await act(() => router.navigate(1))
  },
}
const otroFiltro: CaminoDeLaVista = {
  camino: "(c) otra opción de Mostrar y regresar a la que falló",
  recorrer: async () => {
    const filtro = screen.getByLabelText("Mostrar")
    fireEvent.change(filtro, { target: { value: "calificadas" } })
    await waitFor(
      () =>
        expect(
          pedidas("GET", `${API}/mis-calificaciones`).at(-1)?.url.searchParams.get("estado"),
        ).toBe("calificadas"),
      ESPERA,
    )
    fireEvent.change(screen.getByLabelText("Mostrar"), { target: { value: "todas" } })
  },
}

// La lista de anteriores ofrece esta clase, para el camino (a).
const envolverConLaLista = () => {
  const propio = servidor.manejador
  servidor.manejador = (llamada) => {
    if (llamada.url.pathname === "/api/clases/anteriores") {
      return respuestaJson(200, {
        clases: [{ ...anterior(1), id: CLASE_A, nombre: "Clase A" }],
        total: 1,
        siguienteCursor: null,
        siguienteCursorArchivadaEn: null,
      })
    }
    return propio(llamada)
  }
}

describe("ADM-1D235: las frases de la vista de una clase anterior", () => {
  describe.each([volverYAbrir, atrasYAdelante, otroFiltro])("$camino", ({ recorrer }) => {
    it("ADM-1D235 texto del cursor: vuelve a pedir la primera página, sin cursor, y el texto desaparece", async () => {
      servidor.rol = "estudiante"
      let sana = false
      conMisCalificaciones(() => errorJson(400, "VALIDACION", CURSOR_NO_VALIDO))
      const propio = servidor.manejador
      servidor.manejador = (llamada) => {
        if (sana && llamada.url.pathname === `${API}/mis-calificaciones`) {
          return respuestaJson(
            200,
            misCalificaciones([tareaDeMisCalificaciones(TAREA_2, "Reporte nuevo")]),
          )
        }
        return propio(llamada)
      }
      envolverConLaLista()
      const router = await montar(["/estudiante", RUTA_ANTERIOR])
      fireEvent.click(await buscarBoton("Ver más tareas"))
      await screen.findByText(CURSOR_DE_CLASE_ANTERIOR, {}, ESPERA)
      const antes = delPrimerPaso()
      sana = true
      await recorrer(router)
      await screen.findByText("Reporte nuevo", {}, ESPERA)
      expect(screen.queryByText(CURSOR_DE_CLASE_ANTERIOR)).toBeNull()
      expect(delPrimerPaso()).toBeGreaterThan(antes)
    })

    it("ADM-1D235 falla la primera carga: vuelve a pedir y el texto desaparece", async () => {
      servidor.rol = "estudiante"
      servidor.archivadas.add(CLASE_A)
      let sana = false
      servidor.manejador = ({ url }) => {
        if (url.pathname !== `${API}/mis-calificaciones`) return undefined
        if (sana) {
          return respuestaJson(
            200,
            misCalificaciones([tareaDeMisCalificaciones(TAREA_1, "Ensayo final")]),
          )
        }
        return errorJson(500, "ERROR_INTERNO", "x")
      }
      envolverConLaLista()
      const router = await montar(["/estudiante", RUTA_ANTERIOR])
      await screen.findByText(CARGA_FALLIDA, {}, ESPERA)
      sana = true
      await recorrer(router)
      await screen.findByText("Ensayo final", {}, ESPERA)
      expect(screen.queryByText(CARGA_FALLIDA)).toBeNull()
    })
  })

  it("ADM-1D235 (d): dice Vuelve a abrir esta clase; control: el alumno en una clase activa lee el de hoy", async () => {
    servidor.rol = "estudiante"
    conMisCalificaciones(() => errorJson(400, "VALIDACION", CURSOR_NO_VALIDO))
    await montar([RUTA_ANTERIOR])
    fireEvent.click(await buscarBoton("Ver más tareas"))
    expect(await screen.findByText(/Vuelve a abrir esta clase/, {}, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText(/Vuelve a abrir Calificaciones/)).toBeNull()
    cleanup()

    servidor.archivadas.delete(CLASE_A)
    await montar([`${BASES.estudiante}/calificaciones`])
    fireEvent.click(await buscarBoton("Ver más tareas"))
    expect(await screen.findByText(CURSOR_DE_HOY, {}, ESPERA)).toBeInTheDocument()
  })

  it("ADM-1D235 no pudimos cargar más tareas: repetir Ver más tareas vuelve a pedir esa página", async () => {
    servidor.rol = "estudiante"
    let intentos = 0
    conMisCalificaciones(() => {
      intentos += 1
      if (intentos <= 2) return errorJson(500, "ERROR_INTERNO", "x")
      return respuestaJson(
        200,
        misCalificaciones([tareaDeMisCalificaciones(TAREA_2, "Reporte nuevo")]),
      )
    })
    await montar([RUTA_ANTERIOR])
    const verMas = await buscarBoton("Ver más tareas")
    fireEvent.click(verMas)
    await waitFor(() => expect(errores()).toEqual([MAS_FALLIDO]), ESPERA)
    await waitFor(() => expect(verMas).not.toHaveAttribute("aria-busy", "true"), ESPERA)
    fireEvent.click(verMas)
    expect(await screen.findByText("Reporte nuevo", {}, ESPERA)).toBeInTheDocument()
  })

  const FALLOS_DEL_DETALLE: [string, () => Response | Promise<Response>][] = [
    ["5xx", () => errorJson(500, "ERROR_INTERNO", "x")],
    ["fallo de red", () => Promise.reject(new TypeError("Failed to fetch"))],
  ]

  describe.each(FALLOS_DEL_DETALLE)("Algo salió mal con %s", (_nombre, fallo) => {
    const instalarFalla = () => {
      let falla = true
      servidor.manejador = ({ url }) => {
        if (url.pathname === "/api/clases/anteriores") {
          return respuestaJson(200, {
            clases: [{ ...anterior(1), id: CLASE_A, nombre: "Clase A" }],
            total: 1,
            siguienteCursor: null,
            siguienteCursorArchivadaEn: null,
          })
        }
        if (url.pathname === API && falla) return fallo()
        return undefined
      }
      return {
        sanar: () => {
          falla = false
        },
        activar: () => {
          falla = true
        },
      }
    }
    const conCache = async (cliente: QueryClient) => {
      await screen.findByText("Ensayo final", {}, ESPERA)
      await act(() =>
        cliente.invalidateQueries({ queryKey: claveClaseDetalle(CLASE_A), exact: true }),
      )
      await screen.findByText(GENERICO, {}, ESPERA)
    }

    it.each(["primera carga", "recarga con el detalle en caché"])(
      "ADM-1D235 (e) %s: Volver y abrir la misma clase vuelve a pedir el detalle y el texto desaparece",
      async (estado) => {
        servidor.rol = "estudiante"
        servidor.archivadas.add(CLASE_A)
        const falla = instalarFalla()
        const cliente = clienteComoElDeProviders()
        if (estado !== "primera carga") falla.sanar()
        await montar([RUTA_ANTERIOR], cliente)
        if (estado !== "primera carga") {
          await screen.findByText("Ensayo final", {}, ESPERA)
          falla.activar()
          await conCache(cliente)
        }
        await screen.findByText(GENERICO, {}, ESPERA)
        falla.sanar()
        const antes = pedidas("GET", API).length
        fireEvent.click(screen.getByRole("link", { name: "Volver a clases anteriores" }))
        fireEvent.click(await screen.findByRole("link", { name: "Clase A" }, ESPERA))
        await screen.findByText("Ensayo final", {}, ESPERA)
        expect(screen.queryByText(GENERICO)).toBeNull()
        expect(pedidas("GET", API).length).toBeGreaterThan(antes)
      },
    )

    it.each(["primera carga", "recarga con el detalle en caché"])(
      "ADM-1D235 (f) %s: atrás y adelante vuelve a pedir el detalle y, si sigue fallando, el texto sigue sin ciclo",
      async (estado) => {
        servidor.rol = "estudiante"
        servidor.archivadas.add(CLASE_A)
        const falla = instalarFalla()
        const cliente = clienteComoElDeProviders()
        if (estado !== "primera carga") falla.sanar()
        const router = await montar(["/estudiante", RUTA_ANTERIOR], cliente)
        if (estado !== "primera carga") {
          await screen.findByText("Ensayo final", {}, ESPERA)
          falla.activar()
          await conCache(cliente)
        }
        await screen.findByText(GENERICO, {}, ESPERA)
        const antes = pedidas("GET", API).length
        await act(() => router.navigate(-1))
        await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"), ESPERA)
        await act(() => router.navigate(1))
        // Por la transición, la petición y el único reintento de app/providers.tsx; sin ciclo.
        await waitFor(() => expect(pedidas("GET", API).length).toBe(antes + 2), ESPERA)
        await waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
        expect(screen.getByText(GENERICO)).toBeInTheDocument()
        expect(pedidas("GET", API).length).toBe(antes + 2)
        await act(() => router.navigate(-1))
        await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"), ESPERA)
        falla.sanar()
        await act(() => router.navigate(1))
        await screen.findByText("Ensayo final", {}, ESPERA)
        expect(screen.queryByText(GENERICO)).toBeNull()
      },
    )
  })
})

describe("ADM-1D236: el foco del error del detalle", () => {
  const contenedorDelError = () => screen.getByText(GENERICO).closest("[tabindex='-1']")

  const alFallarLaRecarga = async (cliente: QueryClient) => {
    servidor.manejador = ({ url }) =>
      url.pathname === API ? errorJson(500, "ERROR_INTERNO", "x") : undefined
    await act(() =>
      cliente.invalidateQueries({ queryKey: claveClaseDetalle(CLASE_A), exact: true }),
    )
    await screen.findByText(GENERICO, {}, ESPERA)
  }

  const CONTROLES_ENFOCADOS: [string, () => Promise<HTMLElement>][] = [
    ["el filtro Mostrar", () => screen.findByLabelText("Mostrar", {}, ESPERA)],
    ["Ver más tareas", () => buscarBoton("Ver más tareas")],
  ]

  it.each(CONTROLES_ENFOCADOS)(
    "ADM-1D236: con el foco en %s, el mensaje reemplaza la vista y el foco va a su contenedor",
    async (_nombre, control) => {
      servidor.rol = "estudiante"
      conMisCalificaciones(() => errorJson(500, "ERROR_INTERNO", "x"))
      const cliente = clienteDePrueba()
      await montar([RUTA_ANTERIOR], cliente)
      const enfocado = await control()
      act(() => enfocado.focus())
      expect(enfocado).toHaveFocus()
      await alFallarLaRecarga(cliente)
      await waitFor(() => expect(document.activeElement).toBe(contenedorDelError()), ESPERA)
    },
  )

  it("ADM-1D236 control: una primera carga que falla no mueve el foco", async () => {
    servidor.rol = "estudiante"
    servidor.archivadas.add(CLASE_A)
    servidor.manejador = ({ url }) =>
      url.pathname === API ? errorJson(500, "ERROR_INTERNO", "x") : undefined
    await montar([RUTA_ANTERIOR], clienteDePrueba())
    await screen.findByText(GENERICO, {}, ESPERA)
    expect(document.activeElement).toBe(document.body)
  })

  it("ADM-1D236 control: un segundo fallo seguido no mueve el foco", async () => {
    servidor.rol = "estudiante"
    conMisCalificaciones(() => errorJson(500, "ERROR_INTERNO", "x"))
    const cliente = clienteDePrueba()
    await montar([RUTA_ANTERIOR], cliente)
    const filtro = await screen.findByLabelText("Mostrar", {}, ESPERA)
    act(() => filtro.focus())
    await alFallarLaRecarga(cliente)
    await waitFor(() => expect(document.activeElement).toBe(contenedorDelError()), ESPERA)
    const enlace = screen.getByRole("link", { name: "Volver a clases anteriores" })
    act(() => enlace.focus())
    await act(() =>
      cliente.invalidateQueries({ queryKey: claveClaseDetalle(CLASE_A), exact: true }),
    )
    await waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
    expect(enlace).toHaveFocus()
  })

  it("ADM-1D236 control: con el foco en un control fuera de la vista, se queda ahí", async () => {
    servidor.rol = "estudiante"
    conMisCalificaciones(() => errorJson(500, "ERROR_INTERNO", "x"))
    const cliente = clienteDePrueba()
    await montar([RUTA_ANTERIOR], cliente)
    await screen.findByLabelText("Mostrar", {}, ESPERA)
    const [enLaBarra] = screen.getAllByRole("link", { name: "Inicio" })
    if (enLaBarra === undefined) throw new Error("Precondición: Inicio está en la barra")
    act(() => enLaBarra.focus())
    await alFallarLaRecarga(cliente)
    expect(enLaBarra).toHaveFocus()
  })

  it("ADM-1D236 control: al pasar a otra clase anterior sin desmontar, la memoria del gancho empieza de cero", async () => {
    servidor.rol = "estudiante"
    conMisCalificaciones(() => errorJson(500, "ERROR_INTERNO", "x"))
    servidor.archivadas.add(CLASE_B)
    const cliente = clienteDePrueba()
    const router = await montar([RUTA_ANTERIOR], cliente)
    await screen.findByLabelText("Mostrar", {}, ESPERA)
    const propio = servidor.manejador
    servidor.manejador = (llamada) =>
      llamada.url.pathname === `/api/clases/${CLASE_B}`
        ? errorJson(500, "ERROR_INTERNO", "x")
        : propio(llamada)
    await act(() => router.navigate(`/estudiante/clases-anteriores/${CLASE_B}`))
    await screen.findByText(GENERICO, {}, ESPERA)
    expect(document.activeElement).toBe(document.body)
  })
})

describe("T-03 (ronda 1): el bloque de respuestas sin nada debajo en una archivada", () => {
  const abrirBloqueVacio = async () => {
    const fila = await filaDeDuda(DUDA_SIN_RESPUESTAS)
    fireEvent.click(within(fila).getByRole("button", { name: "Responder" }))
    await within(fila).findByLabelText("Escribe una respuesta", {}, ESPERA)
    return fila
  }
  const titulo = (fila: HTMLElement) =>
    within(fila).queryByRole("heading", { name: "Respuestas", hidden: true })

  it("T-03: al restaurar vuelven el título y el formulario, sin llevarse el foco", async () => {
    const cliente = clienteDePrueba()
    await montar([`${BASES.maestro}/dudas`], cliente)
    const fila = await abrirBloqueVacio()
    await archivar(cliente)
    expect(titulo(fila)).toBeNull()
    const ocultar = within(fila).getByRole("button", { name: "Ocultar respuestas" })
    act(() => ocultar.focus())
    await restaurar(cliente)
    await within(fila).findByLabelText("Escribe una respuesta", {}, ESPERA)
    expect(titulo(fila)).not.toBeNull()
    expect(ocultar).toHaveFocus()
  })

  it("T-03 control: con respuestas, el título sigue en una archivada", async () => {
    servidor.archivadas.add(CLASE_A)
    await montar([`${BASES.maestro}/dudas`])
    await abrirRespuestas()
    const fila = await filaDeDuda(DUDA)
    expect(titulo(fila)).not.toBeNull()
  })

  it("T-03 control: en una clase activa, el admin con el bloque vacío conserva el título: el foco tiene a dónde ir", async () => {
    servidor.rol = "admin"
    await montar([`${BASES.admin}/dudas`])
    await abrirRespuestas()
    const fila = await filaDeDuda(DUDA)
    expect(titulo(fila)).not.toBeNull()
  })

  it("T-03 vecino: la última respuesta se borra con la clase ya archivada: el título sale y el foco no cae en body", async () => {
    const cliente = clienteDePrueba()
    await montar([`${BASES.maestro}/dudas`], cliente)
    await abrirRespuestas()
    const enVuelo = retener()
    let borrada = false
    servidor.manejador = ({ metodo, url }) => {
      if (metodo === "DELETE") {
        return enVuelo.promesa.then(() => {
          borrada = true
          return new Response(null, { status: 204 })
        })
      }
      if (borrada && metodo === "GET" && url.pathname === `${API}/dudas/${DUDA}/respuestas`) {
        return respuestaJson(200, { comentarios: [], siguienteCursor: null })
      }
      return undefined
    }
    fireEvent.click(await buscarBoton("Borrar"))
    const confirmar = await buscarBoton("Sí, borrar respuesta")
    act(() => confirmar.focus())
    fireEvent.click(confirmar)
    await waitFor(
      () => expect(llamadas.filter((l) => l.metodo === "DELETE")).toHaveLength(1),
      ESPERA,
    )
    await archivar(cliente)
    fueraDeBody()
    enVuelo.soltar()
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    const fila = await filaDeDuda(DUDA)
    await waitFor(() => expect(titulo(fila)).toBeNull(), ESPERA)
    await waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
    fueraDeBody()
  })
})

describe("T-02 (ronda 1): la clase que la sesión lee archivada y su lista en caché", () => {
  const FILA_DE_A = { ...anterior(1), id: CLASE_A, nombre: "Clase A" }
  const FILA_DE_B = { ...anterior(2), id: CLASE_B, nombre: "Clase B" }
  const pagina = (clases: unknown[], siguiente: string | null = null) => ({
    clases,
    total: clases.length,
    siguienteCursor: siguiente,
    siguienteCursorArchivadaEn: siguiente === null ? null : ARCHIVADA_EN,
  })

  const ROLES = [
    {
      nombre: "alumno",
      rol: "estudiante" as Rol,
      lista: "/estudiante/clases-anteriores",
      vacio: "No tienes clases anteriores",
      entrada: (id: string) => `/estudiante/clases/${id}`,
      archivada: (id: string) => `/estudiante/clases-anteriores/${id}`,
    },
    {
      nombre: "maestro",
      rol: "maestro" as Rol,
      lista: "/maestro/clases-archivadas",
      vacio: "No tienes clases archivadas",
      entrada: (id: string) => `/maestro/clases/${id}`,
      archivada: (id: string) => `/maestro/clases/${id}`,
    },
  ]

  // La lista responde lo que diga `responderLista`; la primera página de la caché es la que ya se pidió.
  const conLista = (responderLista: (llamada: Llamada) => Response | Promise<Response>) => {
    servidor.manejador = (llamada) =>
      llamada.url.pathname === "/api/clases/anteriores" ? responderLista(llamada) : undefined
  }
  const reposo = (cliente: QueryClient) =>
    waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
  const listasPedidas = () => pedidas("GET", "/api/clases/anteriores").length

  describe.each(ROLES)("$nombre", ({ rol, lista, vacio, entrada, archivada }) => {
    it("T-02: pasa a archivada con la vista abierta y la lista no la trae: al volver no se lee el vacío mientras se pide, y sale la clase", async () => {
      servidor.rol = rol
      const retenida = retener()
      let vacia = true
      conLista(() =>
        vacia
          ? respuestaJson(200, pagina([]))
          : retenida.promesa.then(() => respuestaJson(200, pagina([FILA_DE_A]))),
      )
      const cliente = clienteComoElDeProviders()
      const router = await montar([lista], cliente)
      await screen.findByText(vacio, {}, ESPERA)
      await act(() => router.navigate(entrada(CLASE_A)))
      await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
      vacia = false
      await cambiarDetalle(cliente, true)
      await waitFor(
        () => expect(cliente.getQueryState(claveClasesAnteriores())).toBeUndefined(),
        ESPERA,
      )
      await act(() => router.navigate(lista))
      await waitFor(() => expect(pedidas("GET", "/api/clases/anteriores")).toHaveLength(2), ESPERA)
      expect(screen.queryByText(vacio)).toBeNull()
      retenida.soltar()
      expect(await screen.findByRole("link", { name: "Clase A" }, ESPERA)).toBeInTheDocument()
      expect(screen.queryByText(vacio)).toBeNull()
    })

    it("T-02: nace archivada (el detalle no estaba en caché) y la lista no la trae: la lista sale de la caché", async () => {
      servidor.rol = rol
      servidor.archivadas.add(CLASE_A)
      conLista(() => respuestaJson(200, pagina([])))
      const cliente = clienteDePrueba()
      const router = await montar([lista], cliente)
      await screen.findByText(vacio, {}, ESPERA)
      await act(() => router.navigate(entrada(CLASE_A)))
      await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
      await waitFor(
        () => expect(cliente.getQueryState(claveClasesAnteriores())).toBeUndefined(),
        ESPERA,
      )
    })

    it("T-02: la lista ya trae la clase: al volver, 0 peticiones", async () => {
      servidor.rol = rol
      servidor.archivadas.add(CLASE_A)
      conLista(() => respuestaJson(200, pagina([FILA_DE_A])))
      const cliente = clienteDePrueba()
      const router = await montar([lista], cliente)
      fireEvent.click(await screen.findByRole("link", { name: "Clase A" }, ESPERA))
      await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
      await reposo(cliente)
      await act(() => router.navigate(lista))
      await screen.findByRole("link", { name: "Clase A" }, ESPERA)
      await reposo(cliente)
      expect(listasPedidas()).toBe(1)
    })

    it("T-02: varias páginas, la clase en la segunda ya cargada: al volver, 0 peticiones y las dos páginas siguen", async () => {
      servidor.rol = rol
      servidor.archivadas.add(CLASE_A)
      conLista(({ url }) =>
        url.searchParams.get("cursor") === null
          ? respuestaJson(200, pagina([FILA_DE_B], CLASE_B))
          : respuestaJson(200, pagina([FILA_DE_A])),
      )
      const cliente = clienteDePrueba()
      const router = await montar([lista], cliente)
      fireEvent.click(await buscarBoton("Cargar más"))
      fireEvent.click(await screen.findByRole("link", { name: "Clase A" }, ESPERA))
      await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
      await reposo(cliente)
      await act(() => router.navigate(lista))
      await screen.findByRole("link", { name: "Clase A" }, ESPERA)
      expect(screen.getByRole("link", { name: "Clase B" })).toBeInTheDocument()
      await reposo(cliente)
      expect(listasPedidas()).toBe(2)
    })

    it("T-02: la clase en una página sin cargar: se quita la lista y solo cuesta una lectura, desde la primera", async () => {
      servidor.rol = rol
      servidor.archivadas.add(CLASE_A)
      conLista(() => respuestaJson(200, pagina([FILA_DE_B], CLASE_B)))
      const cliente = clienteDePrueba()
      const router = await montar([lista], cliente)
      await screen.findByRole("link", { name: "Clase B" }, ESPERA)
      await act(() => router.navigate(entrada(CLASE_A)))
      await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
      await reposo(cliente)
      await act(() => router.navigate(lista))
      await screen.findByRole("link", { name: "Clase B" }, ESPERA)
      await reposo(cliente)
      expect(listasPedidas()).toBe(2)
      expect(pedidas("GET", "/api/clases/anteriores").at(-1)?.url.search).toBe("?limite=20")
    })

    it("T-02: sin lista en caché no pasa nada: ninguna petición de la lista", async () => {
      servidor.rol = rol
      servidor.archivadas.add(CLASE_A)
      conLista(() => respuestaJson(200, pagina([])))
      const cliente = clienteDePrueba()
      await montar([archivada(CLASE_A)], cliente)
      await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
      await reposo(cliente)
      expect(listasPedidas()).toBe(0)
      expect(cliente.getQueryState(claveClasesAnteriores())).toBeUndefined()
    })

    it("T-02: una clase restaurada que sigue en la lista: no se marca nada y al volver, 0 peticiones", async () => {
      servidor.rol = rol
      servidor.archivadas.add(CLASE_A)
      conLista(() => respuestaJson(200, pagina([FILA_DE_A])))
      const cliente = clienteDePrueba()
      const router = await montar([lista], cliente)
      fireEvent.click(await screen.findByRole("link", { name: "Clase A" }, ESPERA))
      await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
      await cambiarDetalle(cliente, false)
      await waitFor(() => expect(avisoFijo()).toBeNull(), ESPERA)
      await reposo(cliente)
      expect(cliente.getQueryState(claveClasesAnteriores())?.isInvalidated).toBe(false)
      await act(() => router.navigate(lista))
      await screen.findByRole("link", { name: "Clase A" }, ESPERA)
      await reposo(cliente)
      expect(listasPedidas()).toBe(1)
    })

    it("T-02: archivar, restaurar y volver a archivar: una sola lectura al volver, y sale la clase", async () => {
      servidor.rol = rol
      let trae = false
      conLista(() => respuestaJson(200, pagina(trae ? [FILA_DE_A] : [])))
      const cliente = clienteDePrueba()
      const router = await montar([lista], cliente)
      await screen.findByText(vacio, {}, ESPERA)
      await act(() => router.navigate(entrada(CLASE_A)))
      await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
      trae = true
      await cambiarDetalle(cliente, true)
      await reposo(cliente)
      await cambiarDetalle(cliente, false)
      await reposo(cliente)
      await cambiarDetalle(cliente, true)
      await reposo(cliente)
      await act(() => router.navigate(lista))
      await screen.findByRole("link", { name: "Clase A" }, ESPERA)
      await reposo(cliente)
      expect(listasPedidas()).toBe(2)
    })

    it("T-02: otra clase archivada sin desmontar la vista: la lista trae la primera y no la segunda: sale de la caché", async () => {
      servidor.rol = rol
      servidor.archivadas.add(CLASE_A)
      servidor.archivadas.add(CLASE_B)
      conLista(() => respuestaJson(200, pagina([FILA_DE_A])))
      const cliente = clienteDePrueba()
      // El detalle de B ya en caché: la vista pasa de A a B sin pasar por «no archivada» de por medio.
      cliente.setQueryData(claveClaseDetalle(CLASE_B), detalle(CLASE_B))
      const router = await montar([lista], cliente)
      fireEvent.click(await screen.findByRole("link", { name: "Clase A" }, ESPERA))
      await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
      await reposo(cliente)
      expect(cliente.getQueryState(claveClasesAnteriores())).toBeDefined()
      await act(() => router.navigate(archivada(CLASE_B)))
      await screen.findByRole("heading", { level: 1, name: "Geografía" }, ESPERA)
      await waitFor(
        () => expect(cliente.getQueryState(claveClasesAnteriores())).toBeUndefined(),
        ESPERA,
      )
    })

    // T-04 (ronda 2): lo que está en vuelo al leer la clase archivada se pidió antes de saberlo.
    const dejarCorrerSinEsperarLaLectura = () =>
      act(async () => {
        for (let turno = 0; turno < 50; turno += 1) await Promise.resolve()
      })

    it("T-04: la primera página en vuelo llega sin la clase antes de volver: sin vacío, y sale la clase", async () => {
      servidor.rol = rol
      const primera = retener()
      let lecturas = 0
      conLista(() => {
        lecturas += 1
        return lecturas === 1
          ? primera.promesa.then(() => respuestaJson(200, pagina([])))
          : respuestaJson(200, pagina([FILA_DE_A]))
      })
      const cliente = clienteDePrueba()
      const router = await montar([lista], cliente)
      await waitFor(() => expect(listasPedidas()).toBe(1), ESPERA)
      await act(() => router.navigate(entrada(CLASE_A)))
      await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
      await cambiarDetalle(cliente, true)
      await waitFor(
        () => expect(cliente.getQueryState(claveClasesAnteriores())).toBeUndefined(),
        ESPERA,
      )
      primera.soltar()
      await reposo(cliente)
      expect(cliente.getQueryState(claveClasesAnteriores())).toBeUndefined()
      await act(() => router.navigate(lista))
      expect(await screen.findByRole("link", { name: "Clase A" }, ESPERA)).toBeInTheDocument()
      expect(screen.queryByText(vacio)).toBeNull()
      expect(listasPedidas()).toBe(2)
    })

    it("T-04: la primera página en vuelo llega después de volver: sin vacío en medio ni al final, y sale la clase", async () => {
      servidor.rol = rol
      const primera = retener()
      const segunda = retener()
      let lecturas = 0
      conLista(() => {
        lecturas += 1
        return lecturas === 1
          ? primera.promesa.then(() => respuestaJson(200, pagina([])))
          : segunda.promesa.then(() => respuestaJson(200, pagina([FILA_DE_A])))
      })
      const cliente = clienteDePrueba()
      const router = await montar([lista], cliente)
      await waitFor(() => expect(listasPedidas()).toBe(1), ESPERA)
      await act(() => router.navigate(entrada(CLASE_A)))
      await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
      await cambiarDetalle(cliente, true)
      await waitFor(
        () => expect(cliente.getQueryState(claveClasesAnteriores())).toBeUndefined(),
        ESPERA,
      )
      await act(() => router.navigate(lista))
      await waitFor(() => expect(listasPedidas()).toBe(2), ESPERA)
      primera.soltar()
      await dejarCorrerSinEsperarLaLectura()
      expect(screen.queryByText(vacio)).toBeNull()
      segunda.soltar()
      expect(await screen.findByRole("link", { name: "Clase A" }, ESPERA)).toBeInTheDocument()
      expect(screen.queryByText(vacio)).toBeNull()
      expect(listasPedidas()).toBe(2)
    })

    it("T-04: la primera página en vuelo falla después: sin su error ni el vacío, y al volver sale la clase", async () => {
      servidor.rol = rol
      const primera = retener()
      let lecturas = 0
      conLista(() => {
        lecturas += 1
        return lecturas === 1
          ? primera.promesa.then(() => errorJson(500, "ERROR_INTERNO", "x"))
          : respuestaJson(200, pagina([FILA_DE_A]))
      })
      const cliente = clienteDePrueba()
      const router = await montar([lista], cliente)
      await waitFor(() => expect(listasPedidas()).toBe(1), ESPERA)
      await act(() => router.navigate(entrada(CLASE_A)))
      await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
      await cambiarDetalle(cliente, true)
      primera.soltar()
      await reposo(cliente)
      await act(() => router.navigate(lista))
      expect(await screen.findByRole("link", { name: "Clase A" }, ESPERA)).toBeInTheDocument()
      expect(screen.queryByText(vacio)).toBeNull()
      expect(screen.queryByText(/^No pudimos cargar/)).toBeNull()
      expect(errores()).toEqual([])
      expect(listasPedidas()).toBe(2)
    })

    it("T-04: la lista salió en vuelo hacia una clase que ya estaba archivada: una lectura más, sin vacío", async () => {
      servidor.rol = rol
      servidor.archivadas.add(CLASE_A)
      const primera = retener()
      let lecturas = 0
      conLista(() => {
        lecturas += 1
        return lecturas === 1
          ? primera.promesa.then(() => respuestaJson(200, pagina([FILA_DE_A])))
          : respuestaJson(200, pagina([FILA_DE_A]))
      })
      const cliente = clienteDePrueba()
      const router = await montar([lista], cliente)
      await waitFor(() => expect(listasPedidas()).toBe(1), ESPERA)
      await act(() => router.navigate(archivada(CLASE_A)))
      await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
      await waitFor(
        () => expect(cliente.getQueryState(claveClasesAnteriores())).toBeUndefined(),
        ESPERA,
      )
      primera.soltar()
      await reposo(cliente)
      await act(() => router.navigate(lista))
      expect(await screen.findByRole("link", { name: "Clase A" }, ESPERA)).toBeInTheDocument()
      expect(listasPedidas()).toBe(2)
    })

    it("T-04: con la clase en la lista y una recarga en vuelo que no la trae: sale de la caché y al volver sale la clase", async () => {
      servidor.rol = rol
      const recarga = retener()
      let lecturas = 0
      conLista(() => {
        lecturas += 1
        if (lecturas === 2) return recarga.promesa.then(() => respuestaJson(200, pagina([])))
        return respuestaJson(200, pagina([FILA_DE_A]))
      })
      const cliente = clienteDePrueba()
      const router = await montar([lista], cliente)
      await screen.findByRole("link", { name: "Clase A" }, ESPERA)
      await act(() => router.navigate(entrada(CLASE_A)))
      await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
      act(() => {
        void cliente.refetchQueries({ queryKey: claveClasesAnteriores(), exact: true })
      })
      await waitFor(() => expect(listasPedidas()).toBe(2), ESPERA)
      await cambiarDetalle(cliente, true)
      await waitFor(
        () => expect(cliente.getQueryState(claveClasesAnteriores())).toBeUndefined(),
        ESPERA,
      )
      recarga.soltar()
      await reposo(cliente)
      expect(cliente.getQueryState(claveClasesAnteriores())).toBeUndefined()
      await act(() => router.navigate(lista))
      expect(await screen.findByRole("link", { name: "Clase A" }, ESPERA)).toBeInTheDocument()
      expect(screen.queryByText(vacio)).toBeNull()
      expect(listasPedidas()).toBe(3)
    })

    it("T-04 control: la lista quieta que ya trae la clase se queda cuando la clase pasa a archivada: al volver, 0 peticiones", async () => {
      servidor.rol = rol
      conLista(() => respuestaJson(200, pagina([FILA_DE_A])))
      const cliente = clienteDePrueba()
      const router = await montar([lista], cliente)
      await screen.findByRole("link", { name: "Clase A" }, ESPERA)
      await act(() => router.navigate(entrada(CLASE_A)))
      await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
      await cambiarDetalle(cliente, true)
      await reposo(cliente)
      expect(cliente.getQueryState(claveClasesAnteriores())).toBeDefined()
      await act(() => router.navigate(lista))
      await screen.findByRole("link", { name: "Clase A" }, ESPERA)
      await reposo(cliente)
      expect(listasPedidas()).toBe(1)
    })

    it("T-02 control: una clase activa que no está en la lista no la toca: al volver, 0 peticiones", async () => {
      servidor.rol = rol
      conLista(() => respuestaJson(200, pagina([])))
      const cliente = clienteDePrueba()
      const router = await montar([lista], cliente)
      await screen.findByText(vacio, {}, ESPERA)
      await act(() => router.navigate(entrada(CLASE_A)))
      await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
      await reposo(cliente)
      expect(cliente.getQueryState(claveClasesAnteriores())).toBeDefined()
      await act(() => router.navigate(lista))
      await screen.findByText(vacio, {}, ESPERA)
      await reposo(cliente)
      expect(listasPedidas()).toBe(1)
    })

    it("T-02: no toca las listas del inicio: no se vuelven a pedir", async () => {
      servidor.rol = rol
      conLista(() => respuestaJson(200, pagina([])))
      const cliente = clienteDePrueba()
      await montar([entrada(CLASE_A)], cliente)
      await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
      await reposo(cliente)
      const propia = rol === "estudiante" ? "/api/clases/inscritas" : "/api/clases/impartidas"
      const antes = pedidas("GET", propia).length
      await cambiarDetalle(cliente, true)
      await reposo(cliente)
      expect(pedidas("GET", propia).length).toBe(antes)
    })
  })

  it("T-02: el alumno por un enlace guardado a la clase anterior, con la lista sin ella: la lista sale de la caché", async () => {
    servidor.rol = "estudiante"
    servidor.archivadas.add(CLASE_A)
    conLista(() => respuestaJson(200, pagina([])))
    const cliente = clienteDePrueba()
    const router = await montar(["/estudiante/clases-anteriores"], cliente)
    await screen.findByText("No tienes clases anteriores", {}, ESPERA)
    await act(() => router.navigate(`/estudiante/clases-anteriores/${CLASE_A}`))
    await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
    await waitFor(
      () => expect(cliente.getQueryState(claveClasesAnteriores())).toBeUndefined(),
      ESPERA,
    )
  })

  it("T-02: la sesión del admin en una archivada: no hay lista, no pide nada y no la crea", async () => {
    servidor.rol = "admin"
    servidor.archivadas.add(CLASE_A)
    conLista(() => respuestaJson(200, pagina([])))
    const cliente = clienteDePrueba()
    await montar([BASES.admin], cliente)
    await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
    await reposo(cliente)
    expect(listasPedidas()).toBe(0)
    expect(cliente.getQueryState(claveClasesAnteriores())).toBeUndefined()
  })
})

describe("Hermanos autorizados de T-01: la recarga de los temas del alumno", () => {
  const RUTA_ANTERIOR_DEL_ALUMNO = `/estudiante/clases-anteriores/${CLASE_A}`
  const VISTAS = [
    {
      vista: "Actividades de aprendizaje",
      resto: "/trabajo",
      aviso:
        "No pudimos actualizar Actividades de aprendizaje. Mostramos la última versión que tenemos.",
    },
    {
      vista: "Recursos",
      resto: "/recursos",
      aviso: "No pudimos actualizar Recursos. Mostramos la última versión que tenemos.",
    },
  ]
  const reposo = (cliente: QueryClient) =>
    waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)

  const abrir = async (resto: string) => {
    servidor.rol = "estudiante"
    const lectura: { temas: (() => Response) | undefined; todo: (() => Response) | undefined } = {
      temas: undefined,
      todo: undefined,
    }
    servidor.manejador = ({ url, metodo }) => {
      if (metodo !== "GET") return undefined
      if (url.pathname === `${API}/temas` && lectura.temas !== undefined) return lectura.temas()
      const deLaSeccion = url.pathname === `${API}/trabajo` || url.pathname === `${API}/recursos`
      if (deLaSeccion && lectura.todo !== undefined) return lectura.todo()
      if (url.pathname === `${API}/trabajo`) {
        return respuestaJson(200, { elementos: [], siguienteCursor: null })
      }
      return undefined
    }
    const cliente = clienteDePrueba()
    const router = await montar([`${BASES.estudiante}${resto}`], cliente)
    await waitFor(() => expect(pedidas("GET", `${API}/temas`).length).toBeGreaterThan(0), ESPERA)
    await reposo(cliente)
    return { cliente, router, lectura }
  }
  const recargarLosTemas = async (cliente: QueryClient) => {
    await act(() => cliente.invalidateQueries({ queryKey: ["clases", CLASE_A, "temas"] }))
    await reposo(cliente)
  }

  describe.each(VISTAS)("$vista", ({ resto, aviso: avisoDeSiempre }) => {
    it("T-01 hermano: la recarga de los temas con 409 no da el aviso falso y el alumno termina en la clase anterior", async () => {
      const { cliente, router, lectura } = await abrir(resto)
      servidor.archivadas.add(CLASE_A)
      lectura.temas = archivadaJson
      await recargarLosTemas(cliente)
      await waitFor(
        () => expect(router.state.location.pathname).toBe(RUTA_ANTERIOR_DEL_ALUMNO),
        ESPERA,
      )
      await reposo(cliente)
      expect(errores()).toEqual([])
    })

    it("T-01 hermano, control: con un 5xx el aviso de siempre sigue saliendo y el alumno se queda", async () => {
      const { cliente, router, lectura } = await abrir(resto)
      lectura.temas = () => errorJson(500, "ERROR_INTERNO", "x")
      await recargarLosTemas(cliente)
      await waitFor(() => expect(new Set(errores())).toEqual(new Set([avisoDeSiempre])), ESPERA)
      expect(router.state.location.pathname).toBe(`${BASES.estudiante}${resto}`)
    })

    it("T-01 hermano, fallos seguidos: el 409 no avisa y un 5xx después sí", async () => {
      const { cliente, lectura } = await abrir(resto)
      // El detalle sigue activa: el alumno se queda en la vista y se ven los dos fallos.
      lectura.temas = archivadaJson
      await recargarLosTemas(cliente)
      await waitFor(() => expect(pedidas("GET", API).length).toBeGreaterThan(1), ESPERA)
      await reposo(cliente)
      expect(errores()).toEqual([])
      lectura.temas = () => errorJson(500, "ERROR_INTERNO", "x")
      await recargarLosTemas(cliente)
      await waitFor(() => expect(new Set(errores())).toEqual(new Set([avisoDeSiempre])), ESPERA)
    })

    it("T-01 hermano, toda la sección a la vez: temas y listas con 409: ningún aviso de última versión y termina en la clase anterior", async () => {
      const { cliente, router, lectura } = await abrir(resto)
      servidor.archivadas.add(CLASE_A)
      lectura.temas = archivadaJson
      lectura.todo = archivadaJson
      await act(() => cliente.invalidateQueries({ queryKey: ["clases", CLASE_A] }))
      await waitFor(
        () => expect(router.state.location.pathname).toBe(RUTA_ANTERIOR_DEL_ALUMNO),
        ESPERA,
      )
      await reposo(cliente)
      expect(errores().filter((texto) => texto.includes("última versión"))).toEqual([])
      expect(new Set(errores()).size).toBeLessThanOrEqual(1)
    })
  })
})
