import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { descargarArchivo } from "@/services/descargaService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { claveClaseDetalle, TEXTOS_CLASES_ANTERIORES } from "./data"

// Ataque ADMIN-01d2, ronda 1 (tester): las dos listas con 5xx y 400 alternados, N-05 y OA-2 con otras cosas abiertas,
// Mis calificaciones en error al restaurar y Dudas en una archivada. Router real y app/providers.tsx; la caché a mano,
// con sus mismas opciones. Las esperas son por estado; lo que debe quedar en vuelo se retiene con una promesa. El arnés
// es el de clase-archivada-01d2-vista.test.tsx.

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
const SIN_ACCESO = "No tienes acceso a esta clase."
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
// Lo de la ronda 1

const RUTA_ANTERIOR = `/estudiante/clases-anteriores/${CLASE_A}`
const CURSOR_DE_CLASE_ANTERIOR =
  "Tus tareas cambiaron mientras las veías. Vuelve a abrir esta clase para verlas completas."
const CURSOR_DE_HOY =
  "Tus tareas cambiaron mientras las veías. Vuelve a abrir Calificaciones para verlas completas."

const LISTAS = [
  {
    nombre: "alumno",
    rol: "estudiante" as Rol,
    ruta: "/estudiante/clases-anteriores",
    inicio: "/estudiante",
    error: TEXTOS_CLASES_ANTERIORES.anteriores.error,
    vacio: "No tienes clases anteriores",
    clase: BASES.estudiante,
  },
  {
    nombre: "maestro",
    rol: "maestro" as Rol,
    ruta: "/maestro/clases-archivadas",
    inicio: "/maestro",
    error: TEXTOS_CLASES_ANTERIORES.archivadas.error,
    vacio: "No tienes clases archivadas",
    clase: BASES.maestro,
  },
]

const CARGAR_MAS = TEXTOS_CLASES_ANTERIORES.cargarMas
const delaLista = () => pedidas("GET", "/api/clases/anteriores")
const delaPrimeraPagina = () =>
  delaLista().filter(({ url }) => url.searchParams.get("cursor") === null)
const quinientos = () => errorJson(500, "ERROR_INTERNO", "falló")
const cursorVencido = () => errorJson(400, "VALIDACION", CURSOR_NO_VALIDO)

const dejarCorrer = async (cliente: QueryClient) => {
  await waitFor(() => {
    expect(cliente.isFetching()).toBe(0)
    expect(cliente.isMutating()).toBe(0)
  }, ESPERA)
  await act(async () => {
    for (let turno = 0; turno < 50; turno += 1) await Promise.resolve()
  })
}

describe.each(LISTAS)("ataque ADMIN-01d2 r1, punto 1: 5xx y 400 alternados ($nombre)", (lista) => {
  // La primera página tiene más; `siguiente` decide lo que responde cada página con cursor.
  const conLista = (siguiente: (cursor: string) => Response | Promise<Response>) => {
    servidor.rol = lista.rol
    servidor.manejador = ({ url }) => {
      if (url.pathname !== "/api/clases/anteriores") return undefined
      const cursor = url.searchParams.get("cursor")
      if (cursor === null) return respuestaJson(200, paginaDeAnteriores([1], 1))
      return siguiente(cursor)
    }
  }

  it("ADM-T1D216: 5xx, repetir y 400 en la siguiente: cada texto una vez, sin avisos, sin perder el botón, el foco nunca en body, y la lista se recupera completa", async () => {
    const respuestas = { siguiente: quinientos as () => Response }
    conLista(() => respuestas.siguiente())
    const router = await montar([lista.ruta])
    await screen.findByRole("link", { name: "Clase 1" }, ESPERA)
    const pulsar = async () => {
      const boton = await buscarBoton(CARGAR_MAS)
      act(() => boton.focus())
      fireEvent.click(boton)
    }

    await pulsar()
    expect(await screen.findByText(lista.error, {}, ESPERA)).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Clase 1" })).toBeNull()
    expect(await buscarBoton(CARGAR_MAS)).toHaveFocus()

    await pulsar()
    expect(await screen.findByRole("link", { name: "Clase 1" }, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText(lista.error)).toBeNull()
    fueraDeBody()

    respuestas.siguiente = cursorVencido
    await pulsar()
    expect(await screen.findByText(LISTA_CAMBIO, {}, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText(lista.error)).toBeNull()
    fueraDeBody()

    const primerasAntes = delaPrimeraPagina().length
    respuestas.siguiente = () => respuestaJson(200, paginaDeAnteriores([2], null))
    await pulsar()
    expect(await screen.findByRole("link", { name: "Clase 1" }, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText(LISTA_CAMBIO)).toBeNull()
    expect(delaPrimeraPagina()).toHaveLength(primerasAntes + 1)
    fueraDeBody()

    await pulsar()
    expect(await screen.findByRole("link", { name: "Clase 2" }, ESPERA)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Clase 1" })).toBeInTheDocument()
    expect(boton(CARGAR_MAS)).toBeNull()
    fueraDeBody()
    expect(errores()).toEqual([])
    expect(router.state.location.pathname).toBe(lista.ruta)
  })

  it("ADM-T1D217: con «Cargar más» en vuelo la persona pasa el foco a una fila; al llegar el 5xx la fila sale y el foco va al encabezado, nunca a body", async () => {
    const enVuelo = retener()
    conLista(() => enVuelo.promesa.then(quinientos))
    await montar([lista.ruta])
    const fila = await screen.findByRole("link", { name: "Clase 1" }, ESPERA)
    fireEvent.click(await buscarBoton(CARGAR_MAS))
    await waitFor(
      () =>
        expect(
          delaLista().filter(({ url }) => url.searchParams.get("cursor") !== null),
        ).toHaveLength(1),
      ESPERA,
    )
    act(() => fila.focus())
    enVuelo.soltar()
    expect(await screen.findByText(lista.error, {}, ESPERA)).toBeInTheDocument()
    await waitFor(() => expect(document.activeElement?.tagName).toBe("H1"), ESPERA)
  })

  it("ADM-T1D218: con el 5xx en pantalla, ir al inicio y volver pide solo la primera página y no queda ningún texto, aunque luego llegue una respuesta retenida", async () => {
    const enVuelo = retener()
    const respuestas = { siguiente: quinientos as () => Response | Promise<Response> }
    conLista(() => respuestas.siguiente())
    const cliente = clienteComoElDeProviders()
    const router = await montar([lista.ruta], cliente)
    await screen.findByRole("link", { name: "Clase 1" }, ESPERA)
    fireEvent.click(await buscarBoton(CARGAR_MAS))
    expect(await screen.findByText(lista.error, {}, ESPERA)).toBeInTheDocument()
    await waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
    respuestas.siguiente = () => enVuelo.promesa.then(cursorVencido)
    await act(() => router.navigate(lista.inicio))
    await screen.findByRole(
      "link",
      { name: lista.nombre === "alumno" ? "Clases anteriores" : "Clases archivadas" },
      ESPERA,
    )
    const primerasAntes = delaPrimeraPagina().length
    await act(() => router.navigate(lista.ruta))
    expect(await screen.findByRole("link", { name: "Clase 1" }, ESPERA)).toBeInTheDocument()
    enVuelo.soltar()
    await dejarCorrer(cliente)
    expect(screen.queryByText(lista.error)).toBeNull()
    expect(screen.queryByText(LISTA_CAMBIO)).toBeNull()
    expect(delaPrimeraPagina()).toHaveLength(primerasAntes + 1)
    expect(errores()).toEqual([])
  })

  it("ADM-T1D219: con dos páginas cargadas, 5xx en la tercera y al repetir la segunda da 400: dice la frase y otro «Cargar más» pide solo la primera página", async () => {
    const respuestas = {
      siguiente: ((cursor: string) =>
        cursor === uuid(101) ? respuestaJson(200, paginaDeAnteriores([2], 2)) : quinientos()) as (
        cursor: string,
      ) => Response,
    }
    conLista((cursor) => respuestas.siguiente(cursor))
    await montar([lista.ruta])
    await screen.findByRole("link", { name: "Clase 1" }, ESPERA)
    fireEvent.click(await buscarBoton(CARGAR_MAS))
    await screen.findByRole("link", { name: "Clase 2" }, ESPERA)
    fireEvent.click(await buscarBoton(CARGAR_MAS))
    expect(await screen.findByText(lista.error, {}, ESPERA)).toBeInTheDocument()
    respuestas.siguiente = cursorVencido
    fireEvent.click(await buscarBoton(CARGAR_MAS))
    expect(await screen.findByText(LISTA_CAMBIO, {}, ESPERA)).toBeInTheDocument()
    respuestas.siguiente = () => respuestaJson(200, paginaDeAnteriores([2], null))
    const conCursorAntes = delaLista().length - delaPrimeraPagina().length
    fireEvent.click(await buscarBoton(CARGAR_MAS))
    expect(await screen.findByRole("link", { name: "Clase 1" }, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText(LISTA_CAMBIO)).toBeNull()
    expect(screen.queryByRole("link", { name: "Clase 2" })).toBeNull()
    expect(delaLista().length - delaPrimeraPagina().length).toBe(conCursorAntes)
    expect(errores()).toEqual([])
  })

  it("ADM-T1D220: la clase que la persona acaba de ver archivada no falta de su lista: abrir la lista justo después de ver el aviso no dice que no hay ninguna", async () => {
    servidor.rol = lista.rol
    const hayArchivada = () => servidor.archivadas.has(CLASE_A)
    servidor.manejador = ({ url }) => {
      if (url.pathname !== "/api/clases/anteriores") return undefined
      return respuestaJson(200, paginaDeAnteriores(hayArchivada() ? [1] : [], null))
    }
    const cliente = clienteComoElDeProviders()
    const router = await montar([lista.ruta], cliente)
    expect(await screen.findByText(lista.vacio, {}, ESPERA)).toBeInTheDocument()
    await act(() => router.navigate(lista.clase))
    await screen.findByText("Primer aviso", {}, ESPERA)
    await cambiarDetalle(cliente, true)
    await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
    const volver = await screen.findByRole(
      "link",
      {
        name:
          lista.rol === "estudiante"
            ? TEXTOS_CLASES_ANTERIORES.volverAClasesAnteriores
            : "Volver a mis clases",
      },
      ESPERA,
    )
    fireEvent.click(volver)
    await waitFor(() => expect(router.state.location.pathname).toBe(lista.ruta), ESPERA)
    expect(await screen.findByRole("link", { name: "Clase 1" }, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText(lista.vacio)).toBeNull()
  })
})

describe("ataque ADMIN-01d2 r1, punto 2: N-05 y OA-2 con otras cosas abiertas", () => {
  const paginaUno = () =>
    respuestaJson(
      200,
      misCalificaciones([tareaDeMisCalificaciones(TAREA_1, "Ensayo final")], TAREA_1),
    )

  const conVerMas = (siguiente: () => Response | Promise<Response>) => {
    servidor.rol = "estudiante"
    servidor.manejador = ({ url }) => {
      if (url.pathname !== `${API}/mis-calificaciones`) return undefined
      if (url.searchParams.get("cursor") === null) return paginaUno()
      return siguiente()
    }
  }

  const pedidasDeVerMas = () =>
    pedidas("GET", `${API}/mis-calificaciones`).filter(
      ({ url }) => url.searchParams.get("cursor") !== null,
    )

  it.each([
    { nombre: "500", respuesta: quinientos },
    { nombre: "400 del cursor", respuesta: cursorVencido },
  ])(
    "ADM-T1D221 ($nombre): OA-2 con el filtro en otra opción y «Ver más tareas» en vuelo: redirige, sin avisos al llegar, y Calificaciones de la clase activa nace en Todas y con enlaces",
    async ({ respuesta }) => {
      const enVuelo = retener()
      conVerMas(() => enVuelo.promesa.then(respuesta))
      servidor.archivadas.add(CLASE_A)
      const cliente = clienteComoElDeProviders()
      const router = await montar([RUTA_ANTERIOR], cliente)
      await screen.findByText("Ensayo final", {}, ESPERA)
      fireEvent.change(screen.getByLabelText("Mostrar"), { target: { value: "asignadas" } })
      await waitFor(() => expect(screen.getByLabelText("Mostrar")).toHaveValue("asignadas"), ESPERA)
      fireEvent.click(await buscarBoton("Ver más tareas"))
      await waitFor(() => expect(pedidasDeVerMas()).toHaveLength(1), ESPERA)
      await cambiarDetalle(cliente, false)
      await waitFor(() => expect(router.state.location.pathname).toBe(BASES.estudiante), ESPERA)
      await screen.findByText("Primer aviso", {}, ESPERA)
      enVuelo.soltar()
      await dejarCorrer(cliente)
      expect(errores()).toEqual([])
      fireEvent.click(await screen.findByRole("link", { name: "Calificaciones" }, ESPERA))
      expect(await screen.findByRole("link", { name: "Ensayo final" }, ESPERA)).toBeInTheDocument()
      expect(screen.getByLabelText("Mostrar")).toHaveValue("todas")
      expect(screen.queryByText(CURSOR_DE_CLASE_ANTERIOR)).toBeNull()
      expect(errores()).toEqual([])
    },
  )

  it.each([
    { nombre: "500", respuesta: quinientos, filtro: "todas" },
    { nombre: "500", respuesta: quinientos, filtro: "asignadas" },
    { nombre: "400 del cursor", respuesta: cursorVencido, filtro: "asignadas" },
  ])(
    "ADM-T1D222 ($nombre, filtro $filtro): N-05 con «Ver más tareas» en vuelo: el alumno termina en la clase anterior, con el título como texto, sin avisos y con la lista a la vista",
    async ({ respuesta, filtro }) => {
      const enVuelo = retener()
      conVerMas(() => enVuelo.promesa.then(respuesta))
      const cliente = clienteComoElDeProviders()
      const router = await montar([`${BASES.estudiante}/calificaciones`], cliente)
      await screen.findByRole("link", { name: "Ensayo final" }, ESPERA)
      if (filtro !== "todas") {
        fireEvent.change(screen.getByLabelText("Mostrar"), { target: { value: filtro } })
        await waitFor(() => expect(screen.getByLabelText("Mostrar")).toHaveValue(filtro), ESPERA)
        await screen.findByRole("link", { name: "Ensayo final" }, ESPERA)
      }
      fireEvent.click(await buscarBoton("Ver más tareas"))
      await waitFor(() => expect(pedidasDeVerMas()).toHaveLength(1), ESPERA)
      await cambiarDetalle(cliente, true)
      await waitFor(() => expect(router.state.location.pathname).toBe(RUTA_ANTERIOR), ESPERA)
      await screen.findByText("Ensayo final", {}, ESPERA)
      expect(screen.queryByRole("link", { name: "Ensayo final" })).toBeNull()
      expect(screen.getByLabelText("Mostrar")).toHaveValue("todas")
      enVuelo.soltar()
      await dejarCorrer(cliente)
      expect(errores()).toEqual([])
      expect(screen.getByText("Ensayo final")).toBeInTheDocument()
      expect(screen.queryByText(CURSOR_DE_HOY)).toBeNull()
    },
  )

  it("ADM-T1D223: un 403 que llega después de N-05: el texto de sin acceso y Volver a clases anteriores, sin ir y venir entre las rutas", async () => {
    servidor.rol = "estudiante"
    const cliente = clienteComoElDeProviders()
    const router = await montar([BASES.estudiante], cliente)
    await screen.findByText("Primer aviso", {}, ESPERA)
    await cambiarDetalle(cliente, true)
    await waitFor(() => expect(router.state.location.pathname).toBe(RUTA_ANTERIOR), ESPERA)
    await screen.findByText("Ensayo final", {}, ESPERA)
    servidor.manejador = ({ url }) =>
      url.pathname === API ? errorJson(403, "SIN_ACCESO_A_LA_CLASE", SIN_ACCESO) : undefined
    await act(() =>
      cliente.invalidateQueries({ queryKey: claveClaseDetalle(CLASE_A), exact: true }),
    )
    expect(await screen.findByText(SIN_ACCESO, {}, ESPERA)).toBeInTheDocument()
    await dejarCorrer(cliente)
    expect(router.state.location.pathname).toBe(RUTA_ANTERIOR)
    expect(
      screen.getByRole("link", { name: TEXTOS_CLASES_ANTERIORES.volverAClasesAnteriores }),
    ).toBeInTheDocument()
    expect(errores()).toEqual([])
  })

  it("ADM-T1D224: un 403 que llega después de OA-2: el texto de sin acceso y Volver a mis clases, sin ir y venir entre las rutas", async () => {
    servidor.rol = "estudiante"
    servidor.archivadas.add(CLASE_A)
    const cliente = clienteComoElDeProviders()
    const router = await montar([RUTA_ANTERIOR], cliente)
    await screen.findByText("Ensayo final", {}, ESPERA)
    await cambiarDetalle(cliente, false)
    await waitFor(() => expect(router.state.location.pathname).toBe(BASES.estudiante), ESPERA)
    await screen.findByText("Primer aviso", {}, ESPERA)
    servidor.manejador = ({ url }) =>
      url.pathname === API ? errorJson(403, "SIN_ACCESO_A_LA_CLASE", SIN_ACCESO) : undefined
    await act(() =>
      cliente.invalidateQueries({ queryKey: claveClaseDetalle(CLASE_A), exact: true }),
    )
    expect(await screen.findByText(SIN_ACCESO, {}, ESPERA)).toBeInTheDocument()
    await dejarCorrer(cliente)
    expect(router.state.location.pathname).toBe(BASES.estudiante)
    expect(screen.getByRole("link", { name: "Volver a mis clases" })).toBeInTheDocument()
  })
})

describe("ataque ADMIN-01d2 r1, punto 6: restaurar y archivar con Mis calificaciones en error", () => {
  const conCursorVencido = () => {
    servidor.rol = "estudiante"
    servidor.manejador = ({ url }) => {
      if (url.pathname !== `${API}/mis-calificaciones`) return undefined
      if (url.searchParams.get("cursor") === null) {
        return respuestaJson(
          200,
          misCalificaciones([tareaDeMisCalificaciones(TAREA_1, "Ensayo final")], TAREA_1),
        )
      }
      return cursorVencido()
    }
  }

  it("ADM-T1D225: el 400 del cursor en la clase anterior y se restaura: el texto de la clase anterior no se ve en la clase activa, y Calificaciones se recupera", async () => {
    conCursorVencido()
    servidor.archivadas.add(CLASE_A)
    const cliente = clienteComoElDeProviders()
    const router = await montar([RUTA_ANTERIOR], cliente)
    await screen.findByText("Ensayo final", {}, ESPERA)
    fireEvent.click(await buscarBoton("Ver más tareas"))
    expect(await screen.findByText(CURSOR_DE_CLASE_ANTERIOR, {}, ESPERA)).toBeInTheDocument()
    await dejarCorrer(cliente)
    await cambiarDetalle(cliente, false)
    await waitFor(() => expect(router.state.location.pathname).toBe(BASES.estudiante), ESPERA)
    await screen.findByText("Primer aviso", {}, ESPERA)
    expect(screen.queryByText(CURSOR_DE_CLASE_ANTERIOR)).toBeNull()
    fireEvent.click(await screen.findByRole("link", { name: "Calificaciones" }, ESPERA))
    expect(screen.queryByText(CURSOR_DE_CLASE_ANTERIOR)).toBeNull()
    expect(await screen.findByRole("link", { name: "Ensayo final" }, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText(CURSOR_DE_CLASE_ANTERIOR)).toBeNull()
    expect(screen.queryByText(CURSOR_DE_HOY)).toBeNull()
  })

  it("ADM-T1D226: el 400 del cursor en la clase activa y se archiva: en la clase anterior no se lee «Vuelve a abrir Calificaciones»", async () => {
    conCursorVencido()
    const cliente = clienteComoElDeProviders()
    const router = await montar([`${BASES.estudiante}/calificaciones`], cliente)
    await screen.findByRole("link", { name: "Ensayo final" }, ESPERA)
    fireEvent.click(await buscarBoton("Ver más tareas"))
    expect(await screen.findByText(CURSOR_DE_HOY, {}, ESPERA)).toBeInTheDocument()
    await dejarCorrer(cliente)
    await cambiarDetalle(cliente, true)
    await waitFor(() => expect(router.state.location.pathname).toBe(RUTA_ANTERIOR), ESPERA)
    await waitFor(() => expect(screen.queryByText(/^Clase archivada el /)).not.toBeNull(), ESPERA)
    await dejarCorrer(cliente)
    expect(screen.queryByText(CURSOR_DE_HOY)).toBeNull()
  })
})

describe("ataque ADMIN-01d2 r1, punto 7: Dudas en una archivada", () => {
  it("ADM-T1D227: el bloque de una duda sin respuestas abierto al archivar: no queda el título «Respuestas» sin nada debajo, ni el formulario", async () => {
    const cliente = clienteComoElDeProviders()
    await montar([`${BASES.maestro}/dudas`], cliente)
    const fila = await filaDeDuda(DUDA_SIN_RESPUESTAS)
    fireEvent.click(within(fila).getByRole("button", { name: "Responder" }))
    const dentro = await within(fila).findByRole("textbox", {}, ESPERA)
    expect(dentro).toHaveFocus()
    expect(
      within(fila).getByRole("heading", { name: "Respuestas", hidden: true }),
    ).toBeInTheDocument()
    await archivar(cliente)
    await dejarCorrer(cliente)
    expect(within(fila).queryByRole("textbox")).toBeNull()
    fueraDeBody()
    expect(within(fila).queryByRole("heading", { name: "Respuestas", hidden: true })).toBeNull()
  })

  it("ADM-T1D228: con ese bloque abierto y vacío, plegarlo con el foco en el control: el control sale, el foco va a la fila y no queda en body, sin pedir nada más", async () => {
    const cliente = clienteComoElDeProviders()
    await montar([`${BASES.maestro}/dudas`], cliente)
    const fila = await filaDeDuda(DUDA_SIN_RESPUESTAS)
    fireEvent.click(within(fila).getByRole("button", { name: "Responder" }))
    await within(fila).findByRole("textbox", {}, ESPERA)
    await archivar(cliente)
    await dejarCorrer(cliente)
    const ocultar = within(fila).getByRole("button", { name: "Ocultar respuestas" })
    act(() => ocultar.focus())
    const antes = llamadas.length
    fireEvent.click(ocultar)
    await waitFor(
      () => expect(within(fila).queryByRole("button", { name: "Ocultar respuestas" })).toBeNull(),
      ESPERA,
    )
    await waitFor(() => expect(document.activeElement).toBe(fila), ESPERA)
    expect(within(fila).queryByRole("button", { name: "Responder" })).toBeNull()
    expect(llamadas.slice(antes).filter((l) => l.metodo !== "GET")).toEqual([])
  })

  it("ADM-T1D229: «Ver más respuestas» en vuelo al archivar: la página llega, sin formulario, sin avisos y el foco no cae en body", async () => {
    const enVuelo = retener()
    const respuesta = (id: string, texto: string) => ({
      id,
      texto,
      autor: FIRMA,
      creadoEn: CREADO_EN,
      propio: true,
      puedeBorrar: true,
    })
    servidor.manejador = ({ url }) => {
      if (url.pathname !== `${API}/dudas/${DUDA}/respuestas`) return undefined
      if (url.searchParams.get("cursor") === null) {
        return respuestaJson(200, {
          comentarios: [respuesta(RESPUESTA, "El viernes")],
          siguienteCursor: RESPUESTA,
        })
      }
      return enVuelo.promesa.then(() =>
        respuestaJson(200, {
          comentarios: [respuesta(uuid(24), "A las ocho")],
          siguienteCursor: null,
        }),
      )
    }
    const cliente = clienteComoElDeProviders()
    await montar([`${BASES.maestro}/dudas`], cliente)
    fireEvent.click(await buscarBoton("Ver respuestas (1)"))
    await screen.findByText("El viernes", {}, ESPERA)
    const verMas = await buscarBoton("Ver más respuestas")
    act(() => verMas.focus())
    fireEvent.click(verMas)
    await archivar(cliente)
    expect(screen.queryByRole("textbox", { name: "Escribe una respuesta" })).toBeNull()
    enVuelo.soltar()
    expect(await screen.findByText("A las ocho", {}, ESPERA)).toBeInTheDocument()
    await dejarCorrer(cliente)
    expect(errores()).toEqual([])
    expect(boton("Ver más respuestas")).toBeNull()
    fueraDeBody()
    expect(screen.queryByRole("button", { name: /^Borrar/ })).toBeNull()
  })

  it("ADM-T1D230: plegar y desplegar en una archivada: Ver respuestas sigue, las respuestas se leen, y al restaurar no aparece un formulario que se lleve el foco", async () => {
    const cliente = clienteComoElDeProviders()
    await montar([`${BASES.maestro}/dudas`], cliente)
    const fila = await filaDeDuda(DUDA)
    await archivar(cliente)
    fireEvent.click(within(fila).getByRole("button", { name: "Ver respuestas (1)" }))
    await within(fila).findByText("El viernes", {}, ESPERA)
    fireEvent.click(within(fila).getByRole("button", { name: "Ocultar respuestas" }))
    await waitFor(() => expect(within(fila).queryByText("El viernes")).toBeNull(), ESPERA)
    const ver = within(fila).getByRole("button", { name: "Ver respuestas (1)" })
    act(() => ver.focus())
    fireEvent.click(ver)
    await within(fila).findByText("El viernes", {}, ESPERA)
    const ocultar = within(fila).getByRole("button", { name: "Ocultar respuestas" })
    expect(ocultar).toHaveFocus()
    await restaurar(cliente)
    await dejarCorrer(cliente)
    expect(await within(fila).findByRole("textbox", {}, ESPERA)).not.toHaveFocus()
    expect(ocultar).toHaveFocus()
  })
})

describe.each(LISTAS)(
  "ataque ADMIN-01d2 r1: dos clics al repetir «Cargar más» ($nombre)",
  (lista) => {
    const conLaSiguiente = (siguiente: () => Response) => {
      servidor.rol = lista.rol
      servidor.manejador = ({ url }) => {
        if (url.pathname !== "/api/clases/anteriores") return undefined
        if (url.searchParams.get("cursor") === null) {
          return respuestaJson(200, paginaDeAnteriores([1], 1))
        }
        return siguiente()
      }
    }

    it("ADM-T1D231: con el 5xx en pantalla, dos clics piden la primera página una sola vez", async () => {
      conLaSiguiente(quinientos)
      const cliente = clienteDePrueba()
      await montar([lista.ruta], cliente)
      await screen.findByRole("link", { name: "Clase 1" }, ESPERA)
      fireEvent.click(await buscarBoton(CARGAR_MAS))
      await screen.findByText(lista.error, {}, ESPERA)
      await dejarCorrer(cliente)
      const antes = delaLista().length
      const repetir = await buscarBoton(CARGAR_MAS)
      fireEvent.click(repetir)
      fireEvent.click(repetir)
      await screen.findByRole("link", { name: "Clase 1" }, ESPERA)
      await dejarCorrer(cliente)
      expect(delaLista()).toHaveLength(antes + 1)
    })

    it("ADM-T1D232: con el 400 en pantalla, dos clics piden la primera página una sola vez y la lista vuelve", async () => {
      conLaSiguiente(cursorVencido)
      const cliente = clienteDePrueba()
      await montar([lista.ruta], cliente)
      await screen.findByRole("link", { name: "Clase 1" }, ESPERA)
      fireEvent.click(await buscarBoton(CARGAR_MAS))
      await screen.findByText(LISTA_CAMBIO, {}, ESPERA)
      await dejarCorrer(cliente)
      const antes = delaLista().length
      const repetir = await buscarBoton(CARGAR_MAS)
      fireEvent.click(repetir)
      fireEvent.click(repetir)
      await screen.findByRole("link", { name: "Clase 1" }, ESPERA)
      await dejarCorrer(cliente)
      expect(delaLista()).toHaveLength(antes + 1)
      expect(screen.queryByText(LISTA_CAMBIO)).toBeNull()
    })
  },
)

describe("ataque ADMIN-01d2 r1: la vista de una clase anterior con un identificador manipulado", () => {
  it("ADM-T1D233: con un id que no es un identificador, el texto de sin acceso y Volver a clases anteriores, sin pedir Mis calificaciones", async () => {
    servidor.rol = "estudiante"
    servidor.manejador = ({ url }) =>
      url.pathname === "/api/clases/no-es-un-id"
        ? errorJson(400, "VALIDACION", "claseId: claseId: debe ser un identificador válido")
        : undefined
    await montar(["/estudiante/clases-anteriores/no-es-un-id"])
    expect(await screen.findByText(SIN_ACCESO, {}, ESPERA)).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: TEXTOS_CLASES_ANTERIORES.volverAClasesAnteriores }),
    ).toBeInTheDocument()
    expect(llamadas.filter(({ url }) => url.pathname.endsWith("/mis-calificaciones"))).toEqual([])
    expect(errores()).toEqual([])
  })
})
