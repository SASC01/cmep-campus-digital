import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { descargarArchivo } from "@/services/descargaService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import {
  claveClaseDetalle,
  claveClasesAnteriores,
  claveRespuestas,
  TEXTOS_CLASES_ANTERIORES,
} from "./data"

// Ataque ADMIN-01d2, ronda 2 (tester): T-02 con la lista en movimiento y con páginas sin cargar, T-03 con varios DELETE
// en vuelo y lo que llega al bloque, y Recursos con 409 y 5xx alternados. Router real; la caché a mano, con las opciones
// de app/providers.tsx. Las esperas son por estado; lo que debe quedar en vuelo se retiene con una promesa. El arnés es
// el de clase-archivada-01d2-vista.test.tsx.

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
const CATEGORIA = uuid(71)
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

const filaDeDuda = async (id: string) => {
  await waitFor(() => {
    if (document.querySelector(`[data-duda-id="${id}"]`) === null) throw new Error("sin la duda")
  }, ESPERA)
  const fila = document.querySelector<HTMLElement>(`[data-duda-id="${id}"]`)
  if (fila === null) throw new Error("Precondición: la duda está en pantalla")
  return fila
}

// ------------------------------------------------------------------------------------------------
// Lo de la ronda 2

const LISTAS = [
  {
    nombre: "alumno",
    rol: "estudiante" as Rol,
    ruta: "/estudiante/clases-anteriores",
    clase: (id: string) => `/estudiante/clases/${id}`,
    vacio: "No tienes clases anteriores",
    volver: TEXTOS_CLASES_ANTERIORES.volverAClasesAnteriores,
    error: TEXTOS_CLASES_ANTERIORES.anteriores.error,
  },
  {
    nombre: "maestro",
    rol: "maestro" as Rol,
    ruta: "/maestro/clases-archivadas",
    clase: (id: string) => `/maestro/clases/${id}`,
    vacio: "No tienes clases archivadas",
    volver: "Volver a mis clases",
    error: TEXTOS_CLASES_ANTERIORES.archivadas.error,
  },
]

const CARGAR_MAS = TEXTOS_CLASES_ANTERIORES.cargarMas
const delaLista = () => pedidas("GET", "/api/clases/anteriores")
const quinientos = () => errorJson(500, "ERROR_INTERNO", "falló")

const dejarCorrer = async (cliente: QueryClient) => {
  await waitFor(() => {
    expect(cliente.isFetching()).toBe(0)
    expect(cliente.isMutating()).toBe(0)
  }, ESPERA)
  await act(async () => {
    for (let turno = 0; turno < 50; turno += 1) await Promise.resolve()
  })
}

const dejarCorrerConLaListaEnVuelo = () =>
  act(async () => {
    for (let turno = 0; turno < 50; turno += 1) await Promise.resolve()
  })

const dejarCorrerConDeleteEnVuelo = async (cliente: QueryClient) => {
  await waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
  await act(async () => {
    for (let turno = 0; turno < 50; turno += 1) await Promise.resolve()
  })
}

// Una fila de la lista con el id de una clase de verdad.
const filaDeLaLista = (id: string) => ({
  id,
  nombre: id === CLASE_A ? "Historia" : "Geografía",
  maestros: [{ nombre: MAESTRO_1.nombre }],
  archivadaEn: ARCHIVADA_EN,
})

const paginaConLasArchivadas = () => ({
  clases: [...servidor.archivadas].map(filaDeLaLista),
  total: servidor.archivadas.size,
  siguienteCursor: null,
  siguienteCursorArchivadaEn: null,
})

const pulsarVolver = async (nombre: string) => {
  fireEvent.click(await screen.findByRole("link", { name: nombre }, ESPERA))
}

describe.each(LISTAS)(
  "ataque ADMIN-01d2 r2, punto 3: T-02 con la lista en movimiento ($nombre)",
  (lista) => {
    it("ADM-T2D201: «Cargar más» en vuelo al salir hacia la clase: al archivarse la lista sale de la caché; su respuesta tardía no vuelve a meter nada, y al regresar se pide una sola vez, desde la primera", async () => {
      const enVuelo = retener()
      servidor.rol = lista.rol
      servidor.manejador = ({ url }) => {
        if (url.pathname !== "/api/clases/anteriores") return undefined
        if (url.searchParams.get("cursor") === null) {
          return respuestaJson(200, paginaDeAnteriores([1], 1))
        }
        return enVuelo.promesa.then(() => respuestaJson(200, paginaDeAnteriores([2], null)))
      }
      const cliente = clienteComoElDeProviders()
      const router = await montar([lista.ruta], cliente)
      await screen.findByRole("link", { name: "Clase 1" }, ESPERA)
      fireEvent.click(await buscarBoton(CARGAR_MAS))
      await waitFor(() => expect(delaLista()).toHaveLength(2), ESPERA)
      await act(() => router.navigate(lista.clase(CLASE_A)))
      await screen.findByText("Primer aviso", {}, ESPERA)
      await cambiarDetalle(cliente, true)
      await waitFor(
        () => expect(cliente.getQueryState(claveClasesAnteriores())).toBeUndefined(),
        ESPERA,
      )
      enVuelo.soltar()
      await dejarCorrer(cliente)
      expect(cliente.getQueryState(claveClasesAnteriores())).toBeUndefined()
      await pulsarVolver(lista.volver)
      expect(await screen.findByRole("link", { name: "Clase 1" }, ESPERA)).toBeInTheDocument()
      await dejarCorrer(cliente)
      expect(delaLista()).toHaveLength(3)
      expect(screen.queryByRole("link", { name: "Clase 2" })).toBeNull()
      expect(errores()).toEqual([])
    })

    it("ADM-T2D202: la primera página de la lista sigue en vuelo cuando la sesión lee la clase archivada, y llega sin ella: al volver no se lee que no hay ninguna", async () => {
      const enVuelo = retener()
      servidor.rol = lista.rol
      const control = { retener: true }
      servidor.manejador = ({ url }) => {
        if (url.pathname !== "/api/clases/anteriores") return undefined
        if (!control.retener) return respuestaJson(200, paginaConLasArchivadas())
        control.retener = false
        return enVuelo.promesa.then(() =>
          respuestaJson(200, {
            clases: [],
            total: 0,
            siguienteCursor: null,
            siguienteCursorArchivadaEn: null,
          }),
        )
      }
      const cliente = clienteComoElDeProviders()
      const router = await montar([lista.ruta], cliente)
      await waitFor(() => expect(delaLista()).toHaveLength(1), ESPERA)
      await act(() => router.navigate(lista.clase(CLASE_A)))
      await screen.findByText("Primer aviso", {}, ESPERA)
      await cambiarDetalle(cliente, true)
      // Con la vista de la archivada ya pintada: el gancho ya vio que no había lista.
      await screen.findByText(/^Clase archivada el /, {}, ESPERA)
      await dejarCorrerConLaListaEnVuelo()
      enVuelo.soltar()
      await dejarCorrer(cliente)
      await pulsarVolver(lista.volver)
      await waitFor(() => expect(router.state.location.pathname).toBe(lista.ruta), ESPERA)
      expect(await screen.findByRole("link", { name: "Historia" }, ESPERA)).toBeInTheDocument()
      expect(screen.queryByText(lista.vacio)).toBeNull()
    })

    it("ADM-T2D203: la lista en error con filas en caché al salir: al volver se pide desde la primera, sin ningún texto de error", async () => {
      servidor.rol = lista.rol
      servidor.manejador = ({ url }) => {
        if (url.pathname !== "/api/clases/anteriores") return undefined
        if (url.searchParams.get("cursor") === null) {
          return respuestaJson(200, paginaDeAnteriores([1], 1))
        }
        return quinientos()
      }
      const cliente = clienteComoElDeProviders()
      const router = await montar([lista.ruta], cliente)
      await screen.findByRole("link", { name: "Clase 1" }, ESPERA)
      fireEvent.click(await buscarBoton(CARGAR_MAS))
      await screen.findByText(lista.error, {}, ESPERA)
      await dejarCorrer(cliente)
      await act(() => router.navigate(lista.clase(CLASE_A)))
      await screen.findByText("Primer aviso", {}, ESPERA)
      await cambiarDetalle(cliente, true)
      await pulsarVolver(lista.volver)
      expect(await screen.findByRole("link", { name: "Clase 1" }, ESPERA)).toBeInTheDocument()
      expect(screen.queryByText(lista.error)).toBeNull()
      expect(errores()).toEqual([])
    })

    it("ADM-T2D204: dos clases archivadas seguidas: cada una aparece al volver, con una lectura por cada vez", async () => {
      servidor.rol = lista.rol
      servidor.manejador = ({ url }) =>
        url.pathname === "/api/clases/anteriores"
          ? respuestaJson(200, paginaConLasArchivadas())
          : undefined
      const cliente = clienteComoElDeProviders()
      const router = await montar([lista.ruta], cliente)
      expect(await screen.findByText(lista.vacio, {}, ESPERA)).toBeInTheDocument()
      expect(delaLista()).toHaveLength(1)

      await act(() => router.navigate(lista.clase(CLASE_A)))
      await screen.findByText("Primer aviso", {}, ESPERA)
      await cambiarDetalle(cliente, true, CLASE_A)
      await pulsarVolver(lista.volver)
      expect(await screen.findByRole("link", { name: "Historia" }, ESPERA)).toBeInTheDocument()
      expect(delaLista()).toHaveLength(2)

      await act(() => router.navigate(lista.clase(CLASE_B)))
      await screen.findByRole("heading", { level: 1, name: "Geografía" }, ESPERA)
      await dejarCorrer(cliente)
      await cambiarDetalle(cliente, true, CLASE_B)
      await pulsarVolver(lista.volver)
      expect(await screen.findByRole("link", { name: "Geografía" }, ESPERA)).toBeInTheDocument()
      expect(screen.getByRole("link", { name: "Historia" })).toBeInTheDocument()
      await dejarCorrer(cliente)
      expect(delaLista()).toHaveLength(3)
      expect(screen.queryByText(lista.vacio)).toBeNull()
    })

    it("ADM-T2D205: atrás del historial, de la clase hacia la lista: no se lee el vacío falso y sale la clase", async () => {
      servidor.rol = lista.rol
      servidor.manejador = ({ url }) =>
        url.pathname === "/api/clases/anteriores"
          ? respuestaJson(200, paginaConLasArchivadas())
          : undefined
      const cliente = clienteComoElDeProviders()
      const router = await montar([lista.ruta], cliente)
      await screen.findByText(lista.vacio, {}, ESPERA)
      await act(() => router.navigate(lista.clase(CLASE_A)))
      await screen.findByText("Primer aviso", {}, ESPERA)
      await cambiarDetalle(cliente, true)
      await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
      await act(() => router.navigate(-1))
      await waitFor(() => expect(router.state.location.pathname).toBe(lista.ruta), ESPERA)
      expect(screen.queryByText(lista.vacio)).toBeNull()
      expect(await screen.findByRole("link", { name: "Historia" }, ESPERA)).toBeInTheDocument()
      expect(screen.queryByText(lista.vacio)).toBeNull()
    })
  },
)

describe.each(LISTAS)(
  "ataque ADMIN-01d2 r2, punto 4: T-02 con una clase en una página sin cargar ($nombre)",
  (lista) => {
    it("ADM-T2D206: abrirla tres veces cuesta una lectura por apertura, sin ciclo; y con su página ya cargada, ninguna, y no se pierde lo cargado", async () => {
      const filaDeA = filaDeLaLista(CLASE_A)
      servidor.rol = lista.rol
      servidor.archivadas.add(CLASE_A)
      servidor.manejador = ({ url }) => {
        if (url.pathname !== "/api/clases/anteriores") return undefined
        if (url.searchParams.get("cursor") === null) {
          return respuestaJson(200, paginaDeAnteriores([1], 1))
        }
        return respuestaJson(200, {
          clases: [filaDeA],
          total: 2,
          siguienteCursor: null,
          siguienteCursorArchivadaEn: null,
        })
      }
      const cliente = clienteComoElDeProviders()
      const router = await montar([lista.ruta], cliente)
      await screen.findByRole("link", { name: "Clase 1" }, ESPERA)
      const base = delaLista().length
      for (const vuelta of [1, 2, 3]) {
        await act(() => router.navigate(lista.clase(CLASE_A)))
        await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
        await waitFor(
          () => expect(cliente.getQueryState(claveClasesAnteriores())).toBeUndefined(),
          ESPERA,
        )
        await pulsarVolver(lista.volver)
        await screen.findByRole("link", { name: "Clase 1" }, ESPERA)
        await dejarCorrer(cliente)
        expect(delaLista()).toHaveLength(base + vuelta)
        expect(delaLista().filter(({ url }) => url.searchParams.get("cursor") !== null)).toEqual([])
      }
      fireEvent.click(await buscarBoton(CARGAR_MAS))
      await screen.findByRole("link", { name: "Historia" }, ESPERA)
      await dejarCorrer(cliente)
      const conTodo = delaLista().length
      await act(() => router.navigate(lista.clase(CLASE_A)))
      await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
      await dejarCorrer(cliente)
      await pulsarVolver(lista.volver)
      expect(await screen.findByRole("link", { name: "Clase 1" }, ESPERA)).toBeInTheDocument()
      expect(screen.getByRole("link", { name: "Historia" })).toBeInTheDocument()
      await dejarCorrer(cliente)
      expect(delaLista()).toHaveLength(conTodo)
    })
  },
)

describe("ataque ADMIN-01d2 r2, puntos 5 y 6: T-03, el foco y lo que llega al bloque", () => {
  const R1 = RESPUESTA
  const R2 = uuid(24)
  const RUTA_DE_RESPUESTAS = `${API}/dudas/${DUDA}/respuestas`

  const respuestaDoble = (id: string, texto: string) => ({
    id,
    texto,
    autor: FIRMA,
    creadoEn: CREADO_EN,
    propio: true,
    puedeBorrar: true,
  })

  const TEXTOS: Record<string, string> = { [R1]: "El viernes", [R2]: "A las ocho" }

  const fila = (id: string) => {
    const elemento = document.querySelector<HTMLElement>(`[data-respuesta-id="${id}"]`)
    if (elemento === null) throw new Error(`Precondición: la respuesta ${id} está en pantalla`)
    return elemento
  }

  const pedirBorrar = async (id: string) => {
    fireEvent.click(within(fila(id)).getByRole("button", { name: "Borrar" }))
    const si = await within(fila(id)).findByRole("button", { name: "Sí, borrar respuesta" }, ESPERA)
    act(() => si.focus())
    fireEvent.click(si)
  }

  const conDosRespuestas = () => {
    const quedan = new Set([R1, R2])
    const retenidos = new Map<string, ReturnType<typeof retener>>([
      [R1, retener()],
      [R2, retener()],
    ])
    servidor.manejador = ({ metodo, url }) => {
      if (metodo === "DELETE") {
        const id = url.pathname.split("/").pop() ?? ""
        return retenidos.get(id)?.promesa.then(() => {
          quedan.delete(id)
          return new Response(null, { status: 204 })
        })
      }
      if (url.pathname === RUTA_DE_RESPUESTAS && metodo === "GET") {
        return respuestaJson(200, {
          comentarios: [...quedan].map((id) => respuestaDoble(id, TEXTOS[id] ?? "")),
          siguienteCursor: null,
        })
      }
      return undefined
    }
    return retenidos
  }

  it.each([
    { orden: "primero la del foco", primera: R2, segunda: R1 },
    { orden: "primero la otra", primera: R1, segunda: R2 },
  ])(
    "ADM-T2D207 ($orden): dos DELETE en vuelo con la clase archivada: dos avisos, nunca en body, y al quedar sin ninguna el foco va a la fila de la duda",
    async ({ primera, segunda }) => {
      const retenidos = conDosRespuestas()
      const cliente = clienteComoElDeProviders()
      await montar([`${BASES.maestro}/dudas`], cliente)
      fireEvent.click(await buscarBoton("Ver respuestas (1)"))
      await screen.findByText("A las ocho", {}, ESPERA)
      await pedirBorrar(R1)
      await pedirBorrar(R2)
      await waitFor(
        () => expect(llamadas.filter((l) => l.metodo === "DELETE")).toHaveLength(2),
        ESPERA,
      )
      await archivar(cliente)
      await waitFor(() => expect(document.activeElement).toBe(fila(R2)), ESPERA)

      retenidos.get(primera)?.soltar()
      await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
      await dejarCorrerConDeleteEnVuelo(cliente)
      fueraDeBody()
      expect(document.activeElement).toBe(fila(segunda))

      retenidos.get(segunda)?.soltar()
      await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(2), ESPERA)
      await dejarCorrer(cliente)
      const duda = await filaDeDuda(DUDA)
      expect(document.activeElement).toBe(duda)
      expect(within(duda).queryByRole("heading", { name: "Respuestas", hidden: true })).toBeNull()
      expect(errores()).toEqual([])
    },
  )

  it("ADM-T2D208: «Ver más respuestas» con la última página vacía en una archivada: el botón sale y el foco va al título del bloque, nunca a body", async () => {
    servidor.manejador = ({ metodo, url }) => {
      if (url.pathname !== RUTA_DE_RESPUESTAS || metodo !== "GET") return undefined
      if (url.searchParams.get("cursor") === null) {
        return respuestaJson(200, {
          comentarios: [respuestaDoble(R1, "El viernes")],
          siguienteCursor: R1,
        })
      }
      return respuestaJson(200, { comentarios: [], siguienteCursor: null })
    }
    const cliente = clienteComoElDeProviders()
    await montar([`${BASES.maestro}/dudas`], cliente)
    await archivar(cliente)
    fireEvent.click(await buscarBoton("Ver respuestas (1)"))
    await screen.findByText("El viernes", {}, ESPERA)
    const verMas = await buscarBoton("Ver más respuestas")
    act(() => verMas.focus())
    fireEvent.click(verMas)
    await waitFor(() => expect(boton("Ver más respuestas")).toBeNull(), ESPERA)
    await dejarCorrer(cliente)
    fueraDeBody()
    expect(document.activeElement?.tagName).toBe("H3")
  })

  it("ADM-T2D209: con el foco en «Ver más respuestas», una recarga deja el bloque sin respuestas en una archivada: el bloque sale y el foco va a la fila de la duda, nunca a body", async () => {
    const respuestas = { hay: true }
    servidor.manejador = ({ metodo, url }) => {
      if (url.pathname !== RUTA_DE_RESPUESTAS || metodo !== "GET") return undefined
      return respuestaJson(
        200,
        respuestas.hay
          ? { comentarios: [respuestaDoble(R1, "El viernes")], siguienteCursor: R1 }
          : { comentarios: [], siguienteCursor: null },
      )
    }
    const cliente = clienteComoElDeProviders()
    await montar([`${BASES.maestro}/dudas`], cliente)
    fireEvent.click(await buscarBoton("Ver respuestas (1)"))
    await screen.findByText("El viernes", {}, ESPERA)
    await archivar(cliente)
    const verMas = await buscarBoton("Ver más respuestas")
    act(() => verMas.focus())
    expect(verMas).toHaveFocus()
    respuestas.hay = false
    await act(() => cliente.invalidateQueries({ queryKey: claveRespuestas(CLASE_A, DUDA) }))
    await waitFor(() => expect(screen.queryByText("El viernes")).toBeNull(), ESPERA)
    await dejarCorrer(cliente)
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement).toBe(await filaDeDuda(DUDA))
  })

  // El bloque de la duda con 0 respuestas, abierto antes de archivar: vacío en una archivada.
  const conElBloqueVacio = async () => {
    const lectura = {
      respuesta: () => respuestaJson(200, { comentarios: [], siguienteCursor: null }),
    }
    const ruta = `${API}/dudas/${DUDA_SIN_RESPUESTAS}/respuestas`
    servidor.manejador = ({ metodo, url }) =>
      url.pathname === ruta && metodo === "GET" ? lectura.respuesta() : undefined
    const cliente = clienteComoElDeProviders()
    await montar([`${BASES.maestro}/dudas`], cliente)
    const duda = await filaDeDuda(DUDA_SIN_RESPUESTAS)
    fireEvent.click(within(duda).getByRole("button", { name: "Responder" }))
    await within(duda).findByRole("textbox", {}, ESPERA)
    await archivar(cliente)
    await dejarCorrer(cliente)
    const ocultar = within(duda).getByRole("button", { name: "Ocultar respuestas" })
    act(() => ocultar.focus())
    return { cliente, duda, ocultar, lectura }
  }
  const recargarElBloque = (cliente: QueryClient) =>
    act(() =>
      cliente.invalidateQueries({ queryKey: claveRespuestas(CLASE_A, DUDA_SIN_RESPUESTAS) }),
    )

  it("ADM-T2D210: el bloque vacío recibe una respuesta por una recarga: reaparece con su título, sin formulario, sin «Borrar» y sin llevarse el foco", async () => {
    const { cliente, duda, ocultar, lectura } = await conElBloqueVacio()
    lectura.respuesta = () =>
      respuestaJson(200, {
        comentarios: [respuestaDoble(R2, "Sí hay")],
        siguienteCursor: null,
      })
    await recargarElBloque(cliente)
    expect(await within(duda).findByText("Sí hay", {}, ESPERA)).toBeInTheDocument()
    expect(
      within(duda).getByRole("heading", { name: "Respuestas", hidden: true }),
    ).toBeInTheDocument()
    expect(within(duda).queryByRole("textbox")).toBeNull()
    expect(within(duda).queryByRole("button", { name: "Borrar" })).toBeNull()
    expect(ocultar).toHaveFocus()
  })

  it("ADM-T2D211: una recarga con error y después sana: el error se ve una vez, sin avisos, y al sanar el bloque vuelve a no pintar nada, sin mover el foco", async () => {
    const { cliente, duda, ocultar, lectura } = await conElBloqueVacio()
    const sana = lectura.respuesta
    lectura.respuesta = quinientos
    await recargarElBloque(cliente)
    await dejarCorrer(cliente)
    expect(
      within(duda).getByRole("heading", { name: "Respuestas", hidden: true }),
    ).toBeInTheDocument()
    expect(within(duda).getAllByRole("alert").length).toBe(1)
    expect(ocultar).toHaveFocus()
    lectura.respuesta = sana
    await recargarElBloque(cliente)
    await dejarCorrer(cliente)
    expect(within(duda).queryByRole("alert")).toBeNull()
    expect(within(duda).queryByRole("heading", { name: "Respuestas", hidden: true })).toBeNull()
    expect(ocultar).toHaveFocus()
    expect(errores()).toEqual([])
  })

  it("ADM-T2D212: dos vueltas con el bloque vacío: al restaurar vuelven el título y el formulario sin llevarse el foco, y al archivar otra vez salen", async () => {
    const { cliente, duda, ocultar } = await conElBloqueVacio()
    await restaurar(cliente)
    const campo = await within(duda).findByRole("textbox", {}, ESPERA)
    expect(campo).not.toHaveFocus()
    expect(ocultar).toHaveFocus()
    expect(
      within(duda).getByRole("heading", { name: "Respuestas", hidden: true }),
    ).toBeInTheDocument()
    await archivar(cliente)
    await dejarCorrer(cliente)
    expect(within(duda).queryByRole("textbox")).toBeNull()
    expect(within(duda).queryByRole("heading", { name: "Respuestas", hidden: true })).toBeNull()
    expect(ocultar).toHaveFocus()
  })
})

describe("ataque ADMIN-01d2 r2, punto 2: Recursos del alumno con 409 y 5xx alternados", () => {
  const RUTA = `${BASES.estudiante}/recursos`
  const ULTIMA_VERSION = "Mostramos la última versión"
  const ARCHIVADA_409 = archivadaJson

  // Abre Recursos con sus dos bloques; desde ahí, cada lectura responde lo que diga `lectura`.
  const abrir = async () => {
    servidor.rol = "estudiante"
    const lectura: {
      temas: (() => Response | Promise<Response>) | undefined
      seccion: (() => Response | Promise<Response>) | undefined
    } = { temas: undefined, seccion: undefined }
    servidor.manejador = ({ url, metodo }) => {
      if (metodo !== "GET") return undefined
      if (url.pathname === `${API}/temas` && lectura.temas !== undefined) return lectura.temas()
      if (url.pathname === `${API}/recursos` && lectura.seccion !== undefined)
        return lectura.seccion()
      return undefined
    }
    const cliente = clienteDePrueba()
    const router = await montar([RUTA], cliente)
    await screen.findByText("Guía de estudio", {}, ESPERA)
    await dejarCorrer(cliente)
    return { cliente, router, lectura }
  }

  const recargarTodo = (cliente: QueryClient) =>
    act(() => {
      void cliente.invalidateQueries({ queryKey: ["clases", CLASE_A, "temas"] })
      void cliente.invalidateQueries({ queryKey: ["clases", CLASE_A, "recursos"] })
    })

  const llamadasDeAviso = () =>
    aviso.error.mock.calls.map(([texto, opciones]) => ({
      texto: String(texto),
      id: (opciones as { id?: string } | undefined)?.id,
    }))

  it.each([
    { nombre: "temas 409 y secciones 409", temas: ARCHIVADA_409, seccion: ARCHIVADA_409 },
    { nombre: "temas 409 y secciones 5xx", temas: ARCHIVADA_409, seccion: quinientos },
  ])(
    "ADM-T2D213 ($nombre): con los temas en 409 nunca se lee «última versión», y un solo aviso a la vista",
    async ({ temas, seccion }) => {
      const { cliente, router, lectura } = await abrir()
      const detalleRetenido = retener()
      servidor.archivadas.add(CLASE_A)
      const original = servidor.manejador
      servidor.manejador = (llamada) =>
        llamada.url.pathname === API && llamada.metodo === "GET"
          ? detalleRetenido.promesa.then(() => respuestaJson(200, detalle(CLASE_A)))
          : original(llamada)
      lectura.temas = temas
      lectura.seccion = seccion
      await recargarTodo(cliente)
      await waitFor(() => expect(cliente.isFetching()).toBeLessThanOrEqual(1), ESPERA)
      detalleRetenido.soltar()
      await waitFor(
        () =>
          expect(router.state.location.pathname).toBe(`/estudiante/clases-anteriores/${CLASE_A}`),
        ESPERA,
      )
      await dejarCorrer(cliente)
      const avisos = llamadasDeAviso()
      expect(avisos.filter(({ texto }) => texto.includes(ULTIMA_VERSION))).toEqual([])
      expect(new Set(avisos.map(({ id }) => id)).size).toBeLessThanOrEqual(1)
    },
  )

  it.each([
    { orden: "temas 5xx antes que secciones 409", temasPrimero: true },
    { orden: "secciones 409 antes que temas 5xx", temasPrimero: false },
  ])(
    "ADM-T2D214 ($orden): los dos avisos comparten id, así que se ve uno solo, y el alumno termina en la clase anterior",
    async ({ temasPrimero }) => {
      const { cliente, router, lectura } = await abrir()
      const paso = retener()
      lectura.temas = temasPrimero ? quinientos : () => paso.promesa.then(quinientos)
      lectura.seccion = temasPrimero ? () => paso.promesa.then(ARCHIVADA_409) : ARCHIVADA_409
      const detalleRetenido = retener()
      servidor.archivadas.add(CLASE_A)
      const original = servidor.manejador
      servidor.manejador = (llamada) =>
        llamada.url.pathname === API && llamada.metodo === "GET"
          ? detalleRetenido.promesa.then(() => respuestaJson(200, detalle(CLASE_A)))
          : original(llamada)
      await recargarTodo(cliente)
      await waitFor(() => expect(aviso.error).toHaveBeenCalled(), ESPERA)
      paso.soltar()
      await waitFor(() => {
        const textos = llamadasDeAviso().map(({ texto }) => texto)
        expect(textos.some((texto) => texto.includes(ARCHIVADA))).toBe(true)
        expect(textos.some((texto) => texto.includes(ULTIMA_VERSION))).toBe(true)
      }, ESPERA)
      detalleRetenido.soltar()
      await waitFor(
        () =>
          expect(router.state.location.pathname).toBe(`/estudiante/clases-anteriores/${CLASE_A}`),
        ESPERA,
      )
      await dejarCorrer(cliente)
      const avisos = llamadasDeAviso()
      expect(new Set(avisos.map(({ id }) => id)).size).toBe(1)
      expect(avisos.some(({ texto }) => texto.includes(ARCHIVADA))).toBe(true)
    },
  )

  it("ADM-T2D215: el 5xx de los temas después de un 409 suyo, y otro 409: el 5xx avisa una vez y los 409 no se comen ni repiten nada", async () => {
    const { cliente, lectura } = await abrir()
    lectura.seccion = () => respuestaJson(200, { recursos: [recursoDoble], siguienteCursor: null })
    lectura.temas = ARCHIVADA_409
    await recargarTodo(cliente)
    await dejarCorrer(cliente)
    expect(llamadasDeAviso()).toEqual([])
    lectura.temas = quinientos
    await recargarTodo(cliente)
    await dejarCorrer(cliente)
    const conEl5xx = llamadasDeAviso().filter(({ texto }) => texto.includes(ULTIMA_VERSION))
    expect(conEl5xx.length).toBeGreaterThan(0)
    expect(new Set(conEl5xx.map(({ id }) => id)).size).toBe(1)
    lectura.temas = ARCHIVADA_409
    await recargarTodo(cliente)
    await dejarCorrer(cliente)
    expect(llamadasDeAviso().filter(({ texto }) => texto.includes(ULTIMA_VERSION))).toHaveLength(
      conEl5xx.length,
    )
  })
})
