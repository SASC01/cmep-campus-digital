import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { descargarArchivo } from "@/services/descargaService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { claveClaseDetalle, claveClasesAnteriores, TEXTOS_CLASES_ANTERIORES } from "./data"

// Ataque ADMIN-01d2, ronda 3 (tester): la lista sin red (onlineManager), sin datos y quieta, en la espera del reintento,
// T-04 cruzado con la limpieza de la lista, dos clases seguidas con la lista en vuelo, y el recorrido completo de cada
// rol. Router real; la caché a mano, con las opciones de app/providers.tsx. Las esperas son por estado; lo que debe
// quedar en vuelo se retiene con una promesa. El arnés es el de clase-archivada-01d2-vista.test.tsx.

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
// Lo de la ronda 3

const LISTAS = [
  {
    nombre: "alumno",
    rol: "estudiante" as Rol,
    ruta: "/estudiante/clases-anteriores",
    inicio: "/estudiante",
    enlace: "Clases anteriores",
    clase: (id: string) => `/estudiante/clases/${id}`,
    vacio: "No tienes clases anteriores",
    volver: TEXTOS_CLASES_ANTERIORES.volverAClasesAnteriores,
    error: TEXTOS_CLASES_ANTERIORES.anteriores.error,
  },
  {
    nombre: "maestro",
    rol: "maestro" as Rol,
    ruta: "/maestro/clases-archivadas",
    inicio: "/maestro",
    enlace: "Clases archivadas",
    clase: (id: string) => `/maestro/clases/${id}`,
    vacio: "No tienes clases archivadas",
    volver: "Volver a mis clases",
    error: TEXTOS_CLASES_ANTERIORES.archivadas.error,
  },
]

const CARGAR_MAS = TEXTOS_CLASES_ANTERIORES.cargarMas
const delaLista = () => pedidas("GET", "/api/clases/anteriores")
const delaPrimeraPagina = () =>
  delaLista().filter(({ url }) => url.searchParams.get("cursor") === null)
const conCursor = () => delaLista().filter(({ url }) => url.searchParams.get("cursor") !== null)
const quinientos = () => errorJson(500, "ERROR_INTERNO", "falló")
const cursorVencido = () => errorJson(400, "VALIDACION", "cursor: no es válido")
const LISTA_CAMBIO = "La lista cambió mientras la veías. Vuelve a abrirla para verla completa."

const dejarCorrer = async (cliente: QueryClient) => {
  await waitFor(() => {
    expect(cliente.isFetching()).toBe(0)
    expect(cliente.isMutating()).toBe(0)
  }, ESPERA)
  await act(async () => {
    for (let turno = 0; turno < 50; turno += 1) await Promise.resolve()
  })
}

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
const paginaVacia = {
  clases: [],
  total: 0,
  siguienteCursor: null,
  siguienteCursorArchivadaEn: null,
}

const pulsarVolver = async (nombre: string) => {
  fireEvent.click(await screen.findByRole("link", { name: nombre }, ESPERA))
}

// La clase ya se sabe archivada, sin pedir nada: el detalle fresco en la caché.
const conLaClaseArchivadaEnCache = (cliente: QueryClient, id = CLASE_A) => {
  servidor.archivadas.add(id)
  cliente.setQueryData(claveClaseDetalle(id), detalle(id))
}

const estadoDeLaLista = (cliente: QueryClient) => cliente.getQueryState(claveClasesAnteriores())

afterEach(() => {
  act(() => onlineManager.setOnline(true))
})

describe.each(LISTAS)(
  "ataque ADMIN-01d2 r3, punto 1: la lista en pausa, sin red ($nombre)",
  (lista) => {
    const irALaListaSinRed = async (cliente: QueryClient) => {
      const router = await montar([lista.inicio], cliente)
      const enlace = await screen.findByRole("link", { name: lista.enlace }, ESPERA)
      await dejarCorrer(cliente)
      act(() => onlineManager.setOnline(false))
      fireEvent.click(enlace)
      await waitFor(() => expect(router.state.location.pathname).toBe(lista.ruta), ESPERA)
      await waitFor(() => expect(estadoDeLaLista(cliente)?.fetchStatus).toBe("paused"), ESPERA)
      return router
    }

    const conLaLista = () => {
      servidor.rol = lista.rol
      servidor.manejador = ({ url }) =>
        url.pathname === "/api/clases/anteriores"
          ? respuestaJson(200, paginaConLasArchivadas())
          : undefined
    }

    it.each([
      { orden: "vuelve a la lista y regresa la red", redAntes: false },
      { orden: "regresa la red y vuelve a la lista", redAntes: true },
    ])(
      "ADM-T3D201 sin datos ($orden): nunca se lee el vacío, la petición sale una sola vez y trae la clase",
      async ({ redAntes }) => {
        conLaLista()
        const cliente = clienteComoElDeProviders()
        const router = await irALaListaSinRed(cliente)
        expect(delaLista()).toHaveLength(0)
        conLaClaseArchivadaEnCache(cliente)
        await act(() => router.navigate(lista.clase(CLASE_A)))
        await screen.findByText(/^Clase archivada el /, {}, ESPERA)
        // Sin observadores, la petición en pausa se revierte: la lista queda sin datos y sin nada en vuelo.
        expect(estadoDeLaLista(cliente)?.data).toBeUndefined()
        expect(delaLista()).toHaveLength(0)
        if (redAntes) {
          act(() => onlineManager.setOnline(true))
          await dejarCorrer(cliente)
        }
        await pulsarVolver(lista.volver)
        await waitFor(() => expect(router.state.location.pathname).toBe(lista.ruta), ESPERA)
        expect(screen.queryByText(lista.vacio)).toBeNull()
        if (!redAntes) act(() => onlineManager.setOnline(true))
        expect(await screen.findByRole("link", { name: "Historia" }, ESPERA)).toBeInTheDocument()
        expect(screen.queryByText(lista.vacio)).toBeNull()
        await dejarCorrer(cliente)
        expect(delaLista()).toHaveLength(1)
        expect(errores()).toEqual([])
      },
    )

    const conLaListaCargadaYSinRed = async (cliente: QueryClient) => {
      const router = await montar([lista.ruta], cliente)
      await waitFor(() => expect(delaLista()).toHaveLength(1), ESPERA)
      await dejarCorrer(cliente)
      act(() => onlineManager.setOnline(false))
      act(() => {
        void cliente.invalidateQueries({ queryKey: claveClasesAnteriores(), exact: true })
      })
      await waitFor(() => expect(estadoDeLaLista(cliente)?.fetchStatus).toBe("paused"), ESPERA)
      return router
    }

    it("ADM-T3D202 sin la clase: la lista se quita; al volver sin red no se lee el vacío, y al regresar la red sale la clase con una sola lectura", async () => {
      conLaLista()
      const cliente = clienteComoElDeProviders()
      const router = await conLaListaCargadaYSinRed(cliente)
      expect(screen.getByText(lista.vacio)).toBeInTheDocument()
      conLaClaseArchivadaEnCache(cliente)
      await act(() => router.navigate(lista.clase(CLASE_A)))
      await screen.findByText(/^Clase archivada el /, {}, ESPERA)
      expect(estadoDeLaLista(cliente)).toBeUndefined()
      await pulsarVolver(lista.volver)
      await waitFor(() => expect(router.state.location.pathname).toBe(lista.ruta), ESPERA)
      expect(screen.queryByText(lista.vacio)).toBeNull()
      act(() => onlineManager.setOnline(true))
      expect(await screen.findByRole("link", { name: "Historia" }, ESPERA)).toBeInTheDocument()
      await dejarCorrer(cliente)
      expect(delaLista()).toHaveLength(2)
      expect(screen.queryByText(lista.vacio)).toBeNull()
    })

    it("ADM-T3D203 con la clase: la lista se queda; al volver sin red se ve la clase, y al regresar la red sigue, con una lectura más", async () => {
      conLaLista()
      servidor.archivadas.add(CLASE_A)
      const cliente = clienteComoElDeProviders()
      const router = await conLaListaCargadaYSinRed(cliente)
      conLaClaseArchivadaEnCache(cliente)
      await act(() => router.navigate(lista.clase(CLASE_A)))
      await screen.findByText(/^Clase archivada el /, {}, ESPERA)
      expect(estadoDeLaLista(cliente)?.data).toBeDefined()
      await pulsarVolver(lista.volver)
      await waitFor(() => expect(router.state.location.pathname).toBe(lista.ruta), ESPERA)
      expect(await screen.findByRole("link", { name: "Historia" }, ESPERA)).toBeInTheDocument()
      act(() => onlineManager.setOnline(true))
      await waitFor(() => expect(delaLista()).toHaveLength(2), ESPERA)
      await dejarCorrer(cliente)
      expect(screen.getByRole("link", { name: "Historia" })).toBeInTheDocument()
      expect(errores()).toEqual([])
    })

    it("ADM-T3D204: «Cargar más» en pausa y se sale a la archivada: al regresar la red no sale la página vieja, y al volver se pide la primera", async () => {
      servidor.rol = lista.rol
      servidor.manejador = ({ url }) => {
        if (url.pathname !== "/api/clases/anteriores") return undefined
        if (url.searchParams.get("cursor") === null) {
          return respuestaJson(200, paginaDeAnteriores([1], 1))
        }
        return respuestaJson(200, paginaDeAnteriores([2], null))
      }
      const cliente = clienteComoElDeProviders()
      const router = await montar([lista.ruta], cliente)
      await screen.findByRole("link", { name: "Clase 1" }, ESPERA)
      await dejarCorrer(cliente)
      act(() => onlineManager.setOnline(false))
      fireEvent.click(await buscarBoton(CARGAR_MAS))
      await waitFor(() => expect(estadoDeLaLista(cliente)?.fetchStatus).toBe("paused"), ESPERA)
      conLaClaseArchivadaEnCache(cliente)
      await act(() => router.navigate(lista.clase(CLASE_A)))
      await screen.findByText(/^Clase archivada el /, {}, ESPERA)
      expect(estadoDeLaLista(cliente)).toBeUndefined()
      act(() => onlineManager.setOnline(true))
      await dejarCorrer(cliente)
      expect(conCursor()).toEqual([])
      await pulsarVolver(lista.volver)
      expect(await screen.findByRole("link", { name: "Clase 1" }, ESPERA)).toBeInTheDocument()
      await dejarCorrer(cliente)
      expect(delaPrimeraPagina()).toHaveLength(2)
      expect(conCursor()).toEqual([])
    })
  },
)

describe.each(LISTAS)(
  "ataque ADMIN-01d2 r3, punto 1, control: «Cargar más» en pausa con la vista abierta ($nombre)",
  (lista) => {
    it("ADM-T3D216: dos clics sin red no piden nada; al regresar la red sale una sola página, y el botón vuelve a servir", async () => {
      servidor.rol = lista.rol
      servidor.manejador = ({ url }) => {
        if (url.pathname !== "/api/clases/anteriores") return undefined
        const cursor = url.searchParams.get("cursor")
        if (cursor === null) return respuestaJson(200, paginaDeAnteriores([1], 1))
        if (cursor === uuid(101)) return respuestaJson(200, paginaDeAnteriores([2], 2))
        return respuestaJson(200, paginaDeAnteriores([3], null))
      }
      const cliente = clienteComoElDeProviders()
      await montar([lista.ruta], cliente)
      await screen.findByRole("link", { name: "Clase 1" }, ESPERA)
      await dejarCorrer(cliente)
      act(() => onlineManager.setOnline(false))
      const cargar = await buscarBoton(CARGAR_MAS)
      fireEvent.click(cargar)
      fireEvent.click(cargar)
      await waitFor(() => expect(estadoDeLaLista(cliente)?.fetchStatus).toBe("paused"), ESPERA)
      expect(conCursor()).toEqual([])
      act(() => onlineManager.setOnline(true))
      expect(await screen.findByRole("link", { name: "Clase 2" }, ESPERA)).toBeInTheDocument()
      await dejarCorrer(cliente)
      expect(conCursor()).toHaveLength(1)
      fireEvent.click(await buscarBoton(CARGAR_MAS))
      expect(await screen.findByRole("link", { name: "Clase 3" }, ESPERA)).toBeInTheDocument()
      await dejarCorrer(cliente)
      expect(conCursor()).toHaveLength(2)
      expect(screen.getByRole("link", { name: "Clase 1" })).toBeInTheDocument()
      expect(errores()).toEqual([])
    })
  },
)

describe.each(LISTAS)(
  "ataque ADMIN-01d2 r3, punto 2: sin datos, quieta, y el reintento ($nombre)",
  (lista) => {
    it("ADM-T3D205: en la espera del reintento de la primera carga (con retry: 1), al leer la archivada se quita y el reintento no sale; al volver, sin error ni vacío", async () => {
      servidor.rol = lista.rol
      const control = { falla: true }
      servidor.manejador = ({ url }) => {
        if (url.pathname !== "/api/clases/anteriores") return undefined
        return control.falla ? quinientos() : respuestaJson(200, paginaConLasArchivadas())
      }
      const cliente = clienteComoElDeProviders()
      conLaClaseArchivadaEnCache(cliente)
      const router = await montar([lista.ruta], cliente)
      await waitFor(() => expect(estadoDeLaLista(cliente)?.fetchFailureCount).toBe(1), ESPERA)
      expect(estadoDeLaLista(cliente)?.fetchStatus).toBe("fetching")
      expect(delaLista()).toHaveLength(1)
      await act(() => router.navigate(lista.clase(CLASE_A)))
      await screen.findByText(/^Clase archivada el /, {}, ESPERA)
      expect(estadoDeLaLista(cliente)).toBeUndefined()
      control.falla = false
      await pulsarVolver(lista.volver)
      expect(await screen.findByRole("link", { name: "Historia" }, ESPERA)).toBeInTheDocument()
      await dejarCorrer(cliente)
      expect(delaLista()).toHaveLength(2)
      expect(screen.queryByText(lista.error)).toBeNull()
      expect(screen.queryByText(lista.vacio)).toBeNull()
    })

    it("ADM-T3D206: la primera carga falla después de salir hacia una clase activa, y esa clase se archiva: la lista queda sin datos y quieta; al volver se pide, sin su error ni el vacío", async () => {
      servidor.rol = lista.rol
      const enVuelo = retener()
      const control = { retener: true }
      servidor.manejador = ({ url }) => {
        if (url.pathname !== "/api/clases/anteriores") return undefined
        if (!control.retener) return respuestaJson(200, paginaConLasArchivadas())
        control.retener = false
        return enVuelo.promesa.then(quinientos)
      }
      const cliente = clienteDePrueba()
      const router = await montar([lista.ruta], cliente)
      await waitFor(() => expect(delaLista()).toHaveLength(1), ESPERA)
      await act(() => router.navigate(lista.clase(CLASE_A)))
      await screen.findByText("Primer aviso", {}, ESPERA)
      enVuelo.soltar()
      await dejarCorrer(cliente)
      expect(estadoDeLaLista(cliente)?.status).toBe("error")
      expect(estadoDeLaLista(cliente)?.data).toBeUndefined()
      await cambiarDetalle(cliente, true)
      await screen.findByText(/^Clase archivada el /, {}, ESPERA)
      await pulsarVolver(lista.volver)
      await waitFor(() => expect(router.state.location.pathname).toBe(lista.ruta), ESPERA)
      expect(screen.queryByText(lista.error)).toBeNull()
      expect(screen.queryByText(lista.vacio)).toBeNull()
      expect(await screen.findByRole("link", { name: "Historia" }, ESPERA)).toBeInTheDocument()
      await dejarCorrer(cliente)
      expect(delaLista()).toHaveLength(2)
      expect(errores()).toEqual([])
    })
  },
)

describe.each(LISTAS)(
  "ataque ADMIN-01d2 r3, punto 3: T-04 cruzado con la limpieza de la lista ($nombre)",
  (lista) => {
    it.each([
      { orden: "la clase ya estaba archivada al llegar", yaArchivada: true },
      { orden: "la clase se archiva con la vista abierta", yaArchivada: false },
    ])(
      "ADM-T3D207 ($orden): la lista en error y la recarga en vuelo al salir: al volver, una sola lectura de más, desde la primera, y sin texto de error",
      async ({ yaArchivada }) => {
        servidor.rol = lista.rol
        const enVuelo = retener()
        const control = { retener: false }
        servidor.manejador = ({ url }) => {
          if (url.pathname !== "/api/clases/anteriores") return undefined
          if (url.searchParams.get("cursor") !== null) return quinientos()
          if (control.retener) {
            control.retener = false
            return enVuelo.promesa.then(() => respuestaJson(200, paginaDeAnteriores([1], 1)))
          }
          return respuestaJson(200, paginaDeAnteriores([1], 1))
        }
        const cliente = clienteComoElDeProviders()
        const router = await montar([lista.ruta], cliente)
        await screen.findByRole("link", { name: "Clase 1" }, ESPERA)
        fireEvent.click(await buscarBoton(CARGAR_MAS))
        expect(await screen.findByText(lista.error, {}, ESPERA)).toBeInTheDocument()
        await dejarCorrer(cliente)
        control.retener = true
        fireEvent.click(await buscarBoton(CARGAR_MAS))
        await waitFor(() => expect(delaPrimeraPagina()).toHaveLength(2), ESPERA)
        expect(estadoDeLaLista(cliente)?.status).toBe("error")
        expect(estadoDeLaLista(cliente)?.fetchStatus).toBe("fetching")
        if (yaArchivada) conLaClaseArchivadaEnCache(cliente)
        await act(() => router.navigate(lista.clase(CLASE_A)))
        if (!yaArchivada) {
          await screen.findByText("Primer aviso", {}, ESPERA)
          await cambiarDetalle(cliente, true)
        }
        await screen.findByText(/^Clase archivada el /, {}, ESPERA)
        expect(estadoDeLaLista(cliente)).toBeUndefined()
        enVuelo.soltar()
        await dejarCorrer(cliente)
        expect(estadoDeLaLista(cliente)).toBeUndefined()
        await pulsarVolver(lista.volver)
        expect(await screen.findByRole("link", { name: "Clase 1" }, ESPERA)).toBeInTheDocument()
        await dejarCorrer(cliente)
        expect(delaPrimeraPagina()).toHaveLength(3)
        expect(screen.queryByText(lista.error)).toBeNull()
        expect(errores()).toEqual([])
      },
    )

    it("ADM-T3D208: una recarga con la clase en la lista falla después de salir, y la clase se archiva: la lista se queda; al volver termina con la clase, sin el vacío ni el error", async () => {
      servidor.rol = lista.rol
      servidor.archivadas.add(CLASE_A)
      const enVuelo = retener()
      const control = { retener: false }
      servidor.manejador = ({ url }) => {
        if (url.pathname !== "/api/clases/anteriores") return undefined
        if (control.retener) {
          control.retener = false
          return enVuelo.promesa.then(quinientos)
        }
        return respuestaJson(200, paginaConLasArchivadas())
      }
      const cliente = clienteDePrueba()
      const router = await montar([lista.ruta], cliente)
      await screen.findByRole("link", { name: "Historia" }, ESPERA)
      await dejarCorrer(cliente)
      control.retener = true
      act(() => {
        void cliente.invalidateQueries({ queryKey: claveClasesAnteriores(), exact: true })
      })
      await waitFor(() => expect(delaLista()).toHaveLength(2), ESPERA)
      await act(() => router.navigate(lista.clase(CLASE_B)))
      await screen.findByRole("heading", { level: 1, name: "Geografía" }, ESPERA)
      enVuelo.soltar()
      await dejarCorrer(cliente)
      expect(estadoDeLaLista(cliente)?.status).toBe("error")
      await act(() => router.navigate(lista.clase(CLASE_A)))
      await screen.findByText(/^Clase archivada el /, {}, ESPERA)
      expect(estadoDeLaLista(cliente)?.data).toBeDefined()
      await pulsarVolver(lista.volver)
      await waitFor(() => expect(router.state.location.pathname).toBe(lista.ruta), ESPERA)
      expect(screen.queryByText(lista.vacio)).toBeNull()
      expect(await screen.findByRole("link", { name: "Historia" }, ESPERA)).toBeInTheDocument()
      await dejarCorrer(cliente)
      expect(screen.queryByText(lista.error)).toBeNull()
      expect(screen.queryByText(lista.vacio)).toBeNull()
      expect(errores()).toEqual([])
    })

    it("ADM-T3D209: el 400 de «Cargar más» llega después de salir hacia una clase activa: al volver la lista se cura sola, sin la frase de lista cambiada", async () => {
      servidor.rol = lista.rol
      const enVuelo = retener()
      servidor.manejador = ({ url }) => {
        if (url.pathname !== "/api/clases/anteriores") return undefined
        if (url.searchParams.get("cursor") === null) {
          return respuestaJson(200, paginaDeAnteriores([1], 1))
        }
        return enVuelo.promesa.then(cursorVencido)
      }
      const cliente = clienteDePrueba()
      const router = await montar([lista.ruta], cliente)
      await screen.findByRole("link", { name: "Clase 1" }, ESPERA)
      fireEvent.click(await buscarBoton(CARGAR_MAS))
      await waitFor(() => expect(conCursor()).toHaveLength(1), ESPERA)
      await act(() => router.navigate(lista.clase(CLASE_A)))
      await screen.findByText("Primer aviso", {}, ESPERA)
      enVuelo.soltar()
      await dejarCorrer(cliente)
      await act(() => router.navigate(lista.ruta))
      await waitFor(() => expect(router.state.location.pathname).toBe(lista.ruta), ESPERA)
      expect(await screen.findByRole("link", { name: "Clase 1" }, ESPERA)).toBeInTheDocument()
      await dejarCorrer(cliente)
      expect(screen.queryByText(LISTA_CAMBIO)).toBeNull()
      expect(errores()).toEqual([])
    })
  },
)

describe.each(LISTAS)(
  "ataque ADMIN-01d2 r3, punto 4: dos clases seguidas con la lista en vuelo ($nombre)",
  (lista) => {
    const conLaPrimeraEnVuelo = () => {
      servidor.rol = lista.rol
      const enVuelo = retener()
      const control = { retener: true }
      servidor.manejador = ({ url }) => {
        if (url.pathname !== "/api/clases/anteriores") return undefined
        if (!control.retener) return respuestaJson(200, paginaConLasArchivadas())
        control.retener = false
        return enVuelo.promesa.then(() => respuestaJson(200, paginaVacia))
      }
      return enVuelo
    }

    it("ADM-T3D210: primero una activa, que no toca la lista, y después una archivada, que la quita: la respuesta tardía no entra y al volver sale la clase, con dos lecturas", async () => {
      const enVuelo = conLaPrimeraEnVuelo()
      const cliente = clienteComoElDeProviders()
      const router = await montar([lista.ruta], cliente)
      await waitFor(() => expect(delaLista()).toHaveLength(1), ESPERA)
      await act(() => router.navigate(lista.clase(CLASE_B)))
      await screen.findByRole("heading", { level: 1, name: "Geografía" }, ESPERA)
      expect(estadoDeLaLista(cliente)?.fetchStatus).toBe("fetching")
      servidor.archivadas.add(CLASE_A)
      await act(() => router.navigate(lista.clase(CLASE_A)))
      await screen.findByText(/^Clase archivada el /, {}, ESPERA)
      expect(estadoDeLaLista(cliente)).toBeUndefined()
      enVuelo.soltar()
      await dejarCorrer(cliente)
      await pulsarVolver(lista.volver)
      expect(await screen.findByRole("link", { name: "Historia" }, ESPERA)).toBeInTheDocument()
      await dejarCorrer(cliente)
      expect(delaLista()).toHaveLength(2)
      expect(screen.queryByText(lista.vacio)).toBeNull()
    })

    it("ADM-T3D211: primero la archivada y después una activa: la lista no se vuelve a crear, y al volver sale la clase, con dos lecturas", async () => {
      const enVuelo = conLaPrimeraEnVuelo()
      const cliente = clienteComoElDeProviders()
      const router = await montar([lista.ruta], cliente)
      await waitFor(() => expect(delaLista()).toHaveLength(1), ESPERA)
      servidor.archivadas.add(CLASE_A)
      await act(() => router.navigate(lista.clase(CLASE_A)))
      await screen.findByText(/^Clase archivada el /, {}, ESPERA)
      expect(estadoDeLaLista(cliente)).toBeUndefined()
      await act(() => router.navigate(lista.clase(CLASE_B)))
      await screen.findByRole("heading", { level: 1, name: "Geografía" }, ESPERA)
      enVuelo.soltar()
      await dejarCorrer(cliente)
      expect(estadoDeLaLista(cliente)).toBeUndefined()
      await act(() => router.navigate(lista.ruta))
      expect(await screen.findByRole("link", { name: "Historia" }, ESPERA)).toBeInTheDocument()
      await dejarCorrer(cliente)
      expect(delaLista()).toHaveLength(2)
      expect(screen.queryByText(lista.vacio)).toBeNull()
    })

    it("ADM-T3D212: dos archivadas seguidas con la primera lectura en vuelo (para el alumno, con N-05 en medio): las dos salen al volver, con dos lecturas", async () => {
      const enVuelo = conLaPrimeraEnVuelo()
      const cliente = clienteComoElDeProviders()
      const router = await montar([lista.ruta], cliente)
      await waitFor(() => expect(delaLista()).toHaveLength(1), ESPERA)
      servidor.archivadas.add(CLASE_A)
      servidor.archivadas.add(CLASE_B)
      await act(() => router.navigate(lista.clase(CLASE_A)))
      await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
      await screen.findByText(/^Clase archivada el /, {}, ESPERA)
      await act(() => router.navigate(lista.clase(CLASE_B)))
      await screen.findByRole("heading", { level: 1, name: "Geografía" }, ESPERA)
      if (lista.rol === "estudiante") {
        await waitFor(
          () =>
            expect(router.state.location.pathname).toBe(`/estudiante/clases-anteriores/${CLASE_B}`),
          ESPERA,
        )
      }
      enVuelo.soltar()
      await dejarCorrer(cliente)
      await pulsarVolver(lista.volver)
      expect(await screen.findByRole("link", { name: "Historia" }, ESPERA)).toBeInTheDocument()
      expect(screen.getByRole("link", { name: "Geografía" })).toBeInTheDocument()
      await dejarCorrer(cliente)
      expect(delaLista()).toHaveLength(2)
    })
  },
)

describe("ataque ADMIN-01d2 r3, punto 5: el recorrido completo de cada rol, con app/providers.tsx", () => {
  const TAREA_DOBLE = {
    tarea: {
      id: TAREA_1,
      titulo: "Ensayo final",
      instrucciones: "",
      fechaLimite: "2030-01-15T16:00:00.000Z",
      puntos: 10,
      aceptaTardias: true,
      requiereAdjuntos: true,
      version: 3,
      categoria: null,
      tema: null,
      rubrica: [],
      adjuntos: [],
      autor: FIRMA,
      creadoEn: CREADO_EN,
      actualizadoEn: CREADO_EN,
      puedeEditar: true,
      puedeBorrar: true,
    },
  }
  const API_TAREA = `${API}/tareas/${TAREA_1}`
  const API_ALUMNO = `${API_TAREA}/entregas/${ALUMNO}`
  const seccion = (nombre: string) => screen.findByRole("link", { name: nombre }, ESPERA)
  const soloLecturas = () =>
    llamadas.filter((l) => l.metodo !== "GET" && l.url.pathname !== "/api/auth/refrescar")

  it("ADM-T3D213 alumno: inicio → Clases anteriores → Cargar más → una clase → Ver más tareas y el filtro → volver → otra clase: sin secciones, sin enlaces a tareas, sin escrituras ni avisos", async () => {
    servidor.rol = "estudiante"
    servidor.archivadas.add(CLASE_A)
    servidor.archivadas.add(CLASE_B)
    servidor.manejador = ({ url }) => {
      if (url.pathname === "/api/clases/anteriores") {
        return url.searchParams.get("cursor") === null
          ? respuestaJson(200, {
              clases: [filaDeLaLista(CLASE_A)],
              total: 2,
              siguienteCursor: CLASE_A,
              siguienteCursorArchivadaEn: ARCHIVADA_EN,
            })
          : respuestaJson(200, {
              clases: [filaDeLaLista(CLASE_B)],
              total: 2,
              siguienteCursor: null,
              siguienteCursorArchivadaEn: null,
            })
      }
      if (url.pathname === `${API}/mis-calificaciones`) {
        return url.searchParams.get("cursor") === null
          ? respuestaJson(
              200,
              misCalificaciones([tareaDeMisCalificaciones(TAREA_1, "Ensayo final")], TAREA_1),
            )
          : respuestaJson(
              200,
              misCalificaciones([tareaDeMisCalificaciones(uuid(62), "Reseña corta")]),
            )
      }
      return undefined
    }
    const router = await montar(["/estudiante"])
    fireEvent.click(await seccion("Clases anteriores"))
    fireEvent.click(await buscarBoton(CARGAR_MAS))
    fireEvent.click(await seccion("Geografía"))
    await screen.findByRole("heading", { level: 1, name: "Geografía" }, ESPERA)
    expect(router.state.location.pathname).toBe(`/estudiante/clases-anteriores/${CLASE_B}`)
    fireEvent.click(await seccion(TEXTOS_CLASES_ANTERIORES.volverAClasesAnteriores))
    const lecturasDeLaLista = delaLista().length
    fireEvent.click(await seccion("Historia"))
    await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
    expect(screen.getByText(/^Clase archivada el /)).toBeInTheDocument()
    expect(screen.queryByRole("list", { name: "Secciones de la clase" })).toBeNull()
    expect(await screen.findByText("Ensayo final", {}, ESPERA)).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Ensayo final" })).toBeNull()
    fireEvent.click(await buscarBoton("Ver más tareas"))
    expect(await screen.findByText("Reseña corta", {}, ESPERA)).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Reseña corta" })).toBeNull()
    fireEvent.change(screen.getByLabelText("Mostrar"), { target: { value: "asignadas" } })
    await waitFor(() => expect(screen.getByLabelText("Mostrar")).toHaveValue("asignadas"), ESPERA)
    expect(await screen.findByText("Ensayo final", {}, ESPERA)).toBeInTheDocument()
    fireEvent.click(await seccion(TEXTOS_CLASES_ANTERIORES.volverAClasesAnteriores))
    expect(await seccion("Historia")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Geografía" })).toBeInTheDocument()
    expect(delaLista()).toHaveLength(lecturasDeLaLista)
    expect(soloLecturas()).toEqual([])
    expect(errores()).toEqual([])
  })

  it("ADM-T3D214 maestro: inicio → Clases archivadas → una clase → Personas, Dudas, Actividades, una tarea y la entrega de un alumno → volver: ningún control de escritura, sin escrituras ni avisos", async () => {
    servidor.rol = "maestro"
    servidor.archivadas.add(CLASE_A)
    servidor.manejador = ({ metodo, url }) => {
      if (metodo !== "GET") return undefined
      if (url.pathname === "/api/clases/anteriores") {
        return respuestaJson(200, paginaConLasArchivadas())
      }
      if (url.pathname === `${API}/trabajo`) {
        return respuestaJson(200, {
          elementos: [
            {
              id: TAREA_1,
              tipo: "tarea",
              titulo: "Ensayo final",
              autor: FIRMA,
              creadoEn: CREADO_EN,
              material: null,
              tarea: { fechaLimite: "2030-10-10T15:00:00.000Z", puntos: 10 },
              puedeMover: true,
              entrega: null,
            },
          ],
          siguienteCursor: null,
        })
      }
      if (url.pathname === API_TAREA) return respuestaJson(200, TAREA_DOBLE)
      if (url.pathname === `${API_TAREA}/entregas`) {
        return respuestaJson(200, { entregas: [], total: 0, entregadas: 0, siguienteCursor: null })
      }
      if (url.pathname === API_ALUMNO) {
        return respuestaJson(200, {
          entrega: {
            alumno: { id: ALUMNO, nombre: "Ana Ruiz" },
            estado: "entregado",
            fechaEntrega: CREADO_EN,
            conRetraso: false,
            enlaces: [],
            adjuntos: [],
            version: 2,
            calificacion: null,
          },
        })
      }
      if (url.pathname === `${API_ALUMNO}/comentarios`) {
        return respuestaJson(200, { comentarios: [], siguienteCursor: null })
      }
      return undefined
    }
    const router = await montar(["/maestro"])
    fireEvent.click(await seccion("Clases archivadas"))
    fireEvent.click(await seccion("Historia"))
    await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
    expect(screen.getByText(/^Clase archivada el /)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Volver a mis clases" })).toHaveAttribute(
      "href",
      "/maestro/clases-archivadas",
    )
    expect(boton("Regenerar código")).toBeNull()
    expect(pedidas("GET", `${API}/codigo`)).toEqual([])

    fireEvent.click(await seccion("Personas"))
    await screen.findByText("Beto Díaz", {}, ESPERA)
    expect(screen.queryByRole("columnheader", { name: "Acciones" })).toBeNull()
    expect(screen.queryByRole("button", { name: /^Quitar/ })).toBeNull()
    expect(screen.queryByRole("heading", { name: "Agregar alumnos" })).toBeNull()

    fireEvent.click(await seccion("Dudas"))
    await filaDeDuda(DUDA)
    expect(boton("Publicar duda")).toBeNull()
    expect(boton("Marcar como resuelta")).toBeNull()
    expect(boton("Borrar duda")).toBeNull()
    expect(boton("Responder")).toBeNull()

    fireEvent.click(await seccion("Actividades de aprendizaje"))
    const tarea = await screen.findByRole("link", { name: /Ensayo final/ }, ESPERA)
    expect(screen.queryByRole("link", { name: "Crear tarea" })).toBeNull()
    fireEvent.click(tarea)
    await screen.findByRole("heading", { name: "Ensayo final" }, ESPERA)
    expect(screen.queryByRole("link", { name: "Editar tarea" })).toBeNull()
    expect(boton("Borrar tarea")).toBeNull()

    await act(() => router.navigate(`${BASES.maestro}/tareas/${TAREA_1}/entregas/${ALUMNO}`))
    await screen.findByRole("heading", { name: "Ana Ruiz" }, ESPERA)
    expect(boton("Calificar y devolver")).toBeNull()
    expect(screen.queryByLabelText("Comentario privado")).toBeNull()

    const lecturasDeLaLista = delaLista().length
    fireEvent.click(await seccion("Volver a mis clases"))
    expect(await seccion("Historia")).toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/maestro/clases-archivadas")
    expect(delaLista()).toHaveLength(lecturasDeLaLista)
    expect(soloLecturas()).toEqual([])
    expect(errores()).toEqual([])
  })

  it("ADM-T3D215 admin: una archivada → Personas → «Restaurar» con dos clics: una petición, un aviso, vuelven los controles, y la sesión no crea la lista", async () => {
    servidor.rol = "admin"
    servidor.archivadas.add(CLASE_A)
    servidor.manejador = ({ metodo, url }) => {
      if (url.pathname === `/api/admin/clases/${CLASE_A}/restaurar` && metodo === "POST") {
        servidor.archivadas.delete(CLASE_A)
        return respuestaJson(200, detalle(CLASE_A))
      }
      if (url.pathname === "/api/admin/clases" && metodo === "GET") {
        return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
      }
      return undefined
    }
    await montar([BASES.admin])
    await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
    fireEvent.click(await seccion("Personas"))
    await screen.findByText("Beto Díaz", {}, ESPERA)
    expect(screen.queryByRole("button", { name: /^Quitar/ })).toBeNull()
    expect(screen.getByRole("link", { name: "Duplicar" })).toBeInTheDocument()
    const restaurarBoton = await buscarBoton("Restaurar")
    act(() => restaurarBoton.focus())
    fireEvent.click(restaurarBoton)
    fireEvent.click(restaurarBoton)
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Clase restaurada"), ESPERA)
    await waitFor(() => expect(avisoFijo()).toBeNull(), ESPERA)
    expect(await screen.findByRole("button", { name: /^Quitar/ }, ESPERA)).toBeInTheDocument()
    expect(
      llamadas.filter((l) => l.metodo === "POST" && l.url.pathname.endsWith("/restaurar")),
    ).toHaveLength(1)
    expect(aviso.success).toHaveBeenCalledTimes(1)
    expect(document.activeElement?.tagName).toBe("H1")
    expect(delaLista()).toEqual([])
    expect(errores()).toEqual([])
  })
})
