// FORO-01d (§D-9, §D-10; AGENTS.md, "frases de recuperación"): las frases de las participaciones, las
// réplicas y «Tu participación», un caso por camino, con el router real (`rutas`) y el QueryClient de
// app/providers.tsx. FORO-1D20 a FORO-1D27, FORO-1D33, y las partes de las listas de FORO-1D50 y FORO-1D51.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import { claveMiParticipacion, claveParticipaciones } from "./lib"

const aviso = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
)
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

type Rol = "estudiante" | "maestro" | "admin"

const uuid = (prefijo: string, n: number) =>
  `${prefijo}-1d0f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const CLASE = uuid("2a2b3c4d", 1)
const FORO_A = uuid("5a5b3c4d", 1)
const FORO_B = uuid("5a5b3c4d", 2)
const MAESTRO = { id: uuid("3a3b3c4d", 1), nombre: "Luis Pérez" }
const ALUMNA = { id: uuid("4a4b3c4d", 1), nombre: "Ana López" }
const ALUMNO = { id: uuid("4a4b3c4d", 2), nombre: "Beto Ruiz" }
const ESPERA = { timeout: 5000 }
const BASES: Record<Rol, string> = {
  estudiante: `/estudiante/clases/${CLASE}`,
  maestro: `/maestro/clases/${CLASE}`,
  admin: `/admin/clases/${CLASE}`,
}
const API = `/api/clases/${CLASE}`
const API_FORO = (foroId = FORO_A) => `${API}/foros/${foroId}`
const API_PARTICIPACIONES = (foroId = FORO_A) => `${API_FORO(foroId)}/participaciones`
const API_MIA = (foroId = FORO_A) => `${API_FORO(foroId)}/mi-participacion`
const API_REPLICAS = (participacionId: string, foroId = FORO_A) =>
  `${API_PARTICIPACIONES(foroId)}/${participacionId}/replicas`

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorApi = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

interface Autor {
  id: string
  nombre: string
}

interface ParticipacionDoble {
  id: string
  texto: string
  autor: Autor
  creadoEn: string
  conRetraso?: boolean
  replicas: ParticipacionDoble[]
}

interface MiParticipacionDoble {
  estado: "asignado" | "entregado" | "calificado"
  fechaEntrega: string | null
  conRetraso: boolean
  calificacion: null
  principalId: string | null
  puedeParticipar: boolean
  puedeReplicar: boolean
  participarConRetraso: boolean
  replicarConRetraso: boolean
}

interface Llamada {
  metodo: string
  url: URL
  cuerpo: unknown
}

interface Estado {
  rol: Rol
  archivada: boolean
  refrescoFalla: boolean
  foros: Record<string, { titulo: string; existe: boolean }>
  participaciones: Record<string, ParticipacionDoble[]>
  mia: MiParticipacionDoble
  falla: (llamada: Llamada) => Response | Promise<Response> | undefined
  llamadas: Llamada[]
}

let estado: Estado
let siguienteId = 0

const nuevoId = () => {
  siguienteId += 1
  return uuid("9a9b3c4d", siguienteId)
}

const participacion = (n: number, extra: Partial<ParticipacionDoble> = {}): ParticipacionDoble => ({
  id: uuid("8a8b3c4d", n),
  texto: `Participación ${String(n)}`,
  autor: ALUMNO,
  creadoEn: new Date(Date.UTC(2026, 10, 3, 14, n)).toISOString(),
  replicas: [],
  ...extra,
})

const replica = (n: number, extra: Partial<ParticipacionDoble> = {}): ParticipacionDoble => ({
  id: uuid("7a7b3c4d", n),
  texto: `Réplica ${String(n)}`,
  autor: MAESTRO,
  creadoEn: new Date(Date.UTC(2026, 10, 4, 9, n)).toISOString(),
  replicas: [],
  ...extra,
})

const miaInicial = (): MiParticipacionDoble => ({
  estado: "asignado",
  fechaEntrega: null,
  conRetraso: false,
  calificacion: null,
  principalId: null,
  puedeParticipar: true,
  puedeReplicar: false,
  participarConRetraso: false,
  replicarConRetraso: false,
})

const autorJson = (autor: Autor) => ({
  ...autor,
  administracion: false,
})

const participacionJson = (p: ParticipacionDoble, esReplica = false) => ({
  id: p.id,
  texto: p.texto,
  autor: autorJson(p.autor),
  creadoEn: p.creadoEn,
  ...(p.conRetraso === undefined ? {} : { conRetraso: p.conRetraso }),
  ...(esReplica ? {} : { replicas: p.replicas.length }),
  propia: estado.rol === "estudiante" && p.autor.id === ALUMNA.id,
  puedeBorrar: estado.rol === "admin",
})

const foroJson = (foroId: string) => ({
  foro: {
    id: foroId,
    titulo: estado.foros[foroId]?.titulo ?? "Foro",
    instrucciones: "Opina sobre la lectura.",
    fechaLimite: "2030-01-15T16:00:00.000Z",
    puntos: 10,
    aceptaTardias: true,
    version: 0,
    categoria: null,
    tema: null,
    rubrica: [],
    adjuntos: [],
    autor: autorJson(MAESTRO),
    creadoEn: "2026-10-06T15:30:00.000Z",
    actualizadoEn: "2026-10-06T15:30:00.000Z",
    puedeEditar: estado.rol !== "estudiante",
    puedeBorrar: estado.rol !== "estudiante",
  },
})

const paginar = <T extends { id: string }>(filas: readonly T[], url: URL) => {
  const limite = Number(url.searchParams.get("limite") ?? "20")
  const cursor = url.searchParams.get("cursor")
  let inicio = 0
  if (cursor !== null) {
    const indice = filas.findIndex((fila) => fila.id === cursor)
    if (indice === -1) return null
    inicio = indice + 1
  }
  const pagina = filas.slice(inicio, inicio + limite)
  const siguiente = filas.length > inicio + limite ? (pagina.at(-1)?.id ?? null) : null
  return { pagina, siguiente }
}

const responder = (llamada: Llamada): Response | Promise<Response> => {
  const { metodo, url } = llamada
  const ruta = url.pathname
  if (ruta === "/api/auth/refrescar") {
    if (estado.refrescoFalla) return errorApi(401, "NO_AUTENTICADO")
    return respuestaJson(200, { tokenAcceso: "otra" })
  }
  if (ruta === "/api/me") {
    const yo = estado.rol === "estudiante" ? ALUMNA : MAESTRO
    return respuestaJson(200, {
      id: yo.id,
      nombre: yo.nombre,
      email: "persona@ejemplo.mx",
      rol: estado.rol,
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
  }
  const propia = estado.falla(llamada)
  if (propia !== undefined) return propia
  if (ruta === "/api/clases/inscritas" || ruta === "/api/clases/impartidas") {
    return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
  }
  const deClase = /^\/api\/clases\/([^/]+)(\/.*)?$/.exec(ruta)
  const claseId = deClase?.[1] ?? ""
  const resto = deClase?.[2] ?? ""
  if (resto === "" && metodo === "GET") {
    return respuestaJson(200, {
      clase: {
        id: claseId,
        nombre: claseId === CLASE ? "Historia" : "Química",
        descripcion: null,
        maestro: MAESTRO,
        maestros: [MAESTRO],
        archivadaEn: estado.archivada ? "2026-10-20T10:00:00.000Z" : null,
      },
    })
  }
  if (resto === "/codigo") return respuestaJson(200, { codigo: "ABCDEFG" })
  if (resto === "/publicaciones") {
    return respuestaJson(200, { publicaciones: [], siguienteCursor: null })
  }
  if (resto === "/foros" && metodo === "GET") {
    const foros = Object.entries(estado.foros)
      .filter(([, foro]) => foro.existe)
      .map(([id, foro]) => ({
        id,
        titulo: foro.titulo,
        autor: autorJson(MAESTRO),
        creadoEn: "2026-10-06T15:30:00.000Z",
        fechaLimite: "2030-01-15T16:00:00.000Z",
        puntos: 10,
        tema: null,
        participaciones: (estado.participaciones[id] ?? []).length,
        entrega: null,
      }))
    return respuestaJson(200, { foros: claseId === CLASE ? foros : [], siguienteCursor: null })
  }
  if (resto === "/temas") {
    const conForos = Object.values(estado.foros).filter(({ existe }) => existe).length
    return respuestaJson(200, { temas: [], sinTema: conForos })
  }
  if (resto === "/trabajo") {
    const elementos = Object.entries(estado.foros)
      .filter(([, foro]) => foro.existe)
      .map(([id, foro]) => ({
        id,
        tipo: "foro",
        titulo: foro.titulo,
        autor: autorJson(MAESTRO),
        creadoEn: "2026-10-06T15:30:00.000Z",
        material: null,
        tarea: { fechaLimite: "2030-01-15T16:00:00.000Z", puntos: 10 },
        puedeMover: false,
        entrega: null,
      }))
    return respuestaJson(200, { elementos, siguienteCursor: null })
  }
  const deForo = /^\/foros\/([^/]+)(\/.*)?$/.exec(resto)
  if (deForo !== null) {
    // Como foroIdParamSchema de shared: un uuid pasa a minúsculas; lo demás es un VALIDACION.
    const crudo = deForo[1] ?? ""
    if (!/^[0-9a-f-]{36}$/i.test(crudo)) {
      return errorApi(400, "VALIDACION", "foroId: foroId: debe ser un identificador válido")
    }
    const foroId = crudo.toLowerCase()
    const foro = estado.foros[foroId]
    if (foro === undefined || !foro.existe) return errorApi(404, "TAREA_NO_ENCONTRADA")
    const sub = deForo[2] ?? ""
    const lista = (estado.participaciones[foroId] ??= [])
    if (sub === "" && metodo === "GET") return respuestaJson(200, foroJson(foroId))
    if (sub === "/mi-participacion") return respuestaJson(200, estado.mia)
    if (sub === "/participaciones" && metodo === "GET") {
      const r = paginar(lista, url)
      if (r === null) return errorApi(400, "VALIDACION", "cursor: no es válido")
      return respuestaJson(200, {
        participaciones: r.pagina.map((p) => participacionJson(p)),
        siguienteCursor: r.siguiente,
      })
    }
    if (sub === "/participaciones" && metodo === "POST") {
      const nueva: ParticipacionDoble = {
        id: nuevoId(),
        texto: (llamada.cuerpo as { texto: string }).texto,
        autor: ALUMNA,
        creadoEn: new Date().toISOString(),
        conRetraso: estado.mia.participarConRetraso,
        replicas: [],
      }
      lista.push(nueva)
      estado.mia = {
        ...estado.mia,
        estado: "entregado",
        fechaEntrega: nueva.creadoEn,
        conRetraso: estado.mia.participarConRetraso,
        principalId: nueva.id,
        puedeParticipar: false,
        puedeReplicar: true,
      }
      return respuestaJson(201, {
        participacion: participacionJson(nueva),
        miParticipacion: estado.mia,
      })
    }
    const deReplicas = /^\/participaciones\/([^/]+)\/replicas$/.exec(sub)
    if (deReplicas !== null) {
      const principal = lista.find(({ id }) => id === deReplicas[1])
      if (principal === undefined) {
        return errorApi(404, "PARTICIPACION_NO_ENCONTRADA", "Esa participación ya no existe.")
      }
      if (metodo === "GET") {
        const r = paginar(principal.replicas, url)
        if (r === null) return errorApi(400, "VALIDACION", "cursor: no es válido")
        return respuestaJson(200, {
          replicas: r.pagina.map((p) => participacionJson(p, true)),
          siguienteCursor: r.siguiente,
        })
      }
      const nueva: ParticipacionDoble = {
        id: nuevoId(),
        texto: (llamada.cuerpo as { texto: string }).texto,
        autor: estado.rol === "estudiante" ? ALUMNA : MAESTRO,
        creadoEn: new Date().toISOString(),
        replicas: [],
      }
      principal.replicas.push(nueva)
      return respuestaJson(201, { replica: participacionJson(nueva, true) })
    }
    const deBorrar = /^\/participaciones\/([^/]+)$/.exec(sub)
    if (deBorrar !== null && metodo === "DELETE") {
      const id = deBorrar[1]
      const indice = lista.findIndex((p) => p.id === id)
      if (indice >= 0) {
        lista.splice(indice, 1)
        return new Response(null, { status: 204 })
      }
      for (const principal of lista) {
        const deLaReplica = principal.replicas.findIndex((r) => r.id === id)
        if (deLaReplica >= 0) {
          principal.replicas.splice(deLaReplica, 1)
          return new Response(null, { status: 204 })
        }
      }
      return errorApi(404, "PARTICIPACION_NO_ENCONTRADA", "Esa participación ya no existe.")
    }
  }
  return errorApi(500, "ERROR_INTERNO", `no esperada: ${metodo} ${ruta}`)
}

const cliente = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })

const montar = async (entradas: string[], queryClient = cliente()) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: entradas })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, queryClient }
}

const reposar = (ms = 150) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))

const enVuelo = () => {
  let soltar: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((resolver) => {
    soltar = resolver
  })
  return { promesa, soltar }
}

const del = (rol: Rol, foroId = FORO_A) => `${BASES[rol]}/foros/${foroId}`
const pedidas = (metodo: string, ruta: string) =>
  estado.llamadas.filter((l) => l.metodo === metodo && l.url.pathname === ruta)
const tituloDelForo = (texto = "Debate de la unidad") =>
  screen.findByRole("heading", { level: 2, name: texto }, ESPERA)
// La fila de una participación (o de una réplica): el elemento con su id, que contiene su texto.
const filaDe = async (texto: string) => {
  const nodo = await screen.findByText(texto, { selector: "p" }, ESPERA)
  const fila = nodo.closest<HTMLElement>("[data-participacion-id], [data-replica-id]")
  if (fila === null) throw new Error(`Precondición: «${texto}» está dentro de su fila`)
  return fila
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  siguienteId = 0
  estado = {
    rol: "estudiante",
    archivada: false,
    refrescoFalla: false,
    foros: {
      [FORO_A]: { titulo: "Debate de la unidad", existe: true },
      [FORO_B]: { titulo: "Segundo debate", existe: true },
    },
    participaciones: { [FORO_A]: [], [FORO_B]: [] },
    mia: miaInicial(),
    falla: () => undefined,
    llamadas: [],
  }
  aviso.mockClear()
  aviso.success.mockClear()
  aviso.error.mockClear()
  vi.mocked(irA).mockClear()
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : null
      const llamada = {
        metodo: init?.method ?? "GET",
        url: new URL(String(entrada), "http://x"),
        cuerpo,
      }
      estado.llamadas.push(llamada)
      return Promise.resolve().then(() => responder(llamada))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
})

const CURSOR_PARTICIPACIONES =
  "Las participaciones cambiaron mientras las veías. Vuelve a abrir el foro para verlas completas."
const CURSOR_REPLICAS =
  "Las réplicas cambiaron mientras las veías. Vuelve a abrirlas para verlas completas."
const RECARGA_PARTICIPACIONES =
  "No pudimos actualizar las participaciones. Mostramos la última versión que tenemos."
const RECARGA_MIA =
  "No pudimos actualizar tu participación. Mostramos la última versión que tenemos."

const enLasSecciones = (nombre: string) =>
  within(screen.getByRole("list", { name: "Secciones de la clase" })).getByRole("link", {
    name: nombre,
  })
const veinticinco = () => Array.from({ length: 25 }, (_, i) => participacion(i + 1))

// 25 principales; al pedir «Ver más participaciones», la última de la primera página ya no está: el
// cursor vence y la lista dice su frase.
const conLaFraseDeLaLista = async (entradas = [del("maestro")]) => {
  estado.rol = "maestro"
  estado.participaciones[FORO_A] = veinticinco()
  const montaje = await montar(entradas)
  await filaDe("Participación 20")
  const verMas = screen.getByRole("button", { name: "Ver más participaciones" })
  estado.participaciones[FORO_A] = veinticinco().filter(({ texto }) => texto !== "Participación 20")
  fireEvent.click(verMas)
  expect(await screen.findByText(CURSOR_PARTICIPACIONES, undefined, ESPERA)).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Ver más participaciones" })).toBeNull()
  await reposar()
  return montaje
}

const sinLaFraseDeLaLista = async (antes: number) => {
  await waitFor(() => expect(screen.queryByText(CURSOR_PARTICIPACIONES)).toBeNull(), ESPERA)
  await filaDe("Participación 21")
  const nuevas = pedidas("GET", API_PARTICIPACIONES()).slice(antes)
  expect(nuevas.length).toBeGreaterThan(0)
  expect(nuevas[0]?.url.searchParams.has("cursor")).toBe(false)
}

describe("FORO-1D20 a FORO-1D23 · «Las participaciones cambiaron… Vuelve a abrir el foro…», por cada camino", () => {
  it("FORO-1D20: abrir el foro desde «Foro» antes de 30 s pide la primera página y la frase desaparece", async () => {
    await conLaFraseDeLaLista()
    const antes = pedidas("GET", API_PARTICIPACIONES()).length
    fireEvent.click(enLasSecciones("Foro"))
    fireEvent.click(await screen.findByRole("link", { name: /^Foro: Debate de la unidad/ }, ESPERA))
    await tituloDelForo()
    await sinLaFraseDeLaLista(antes)
  })

  it("FORO-1D21: abrirlo desde «Actividades de aprendizaje» pide la primera página y la frase desaparece", async () => {
    await conLaFraseDeLaLista()
    const antes = pedidas("GET", API_PARTICIPACIONES()).length
    fireEvent.click(enLasSecciones("Actividades de aprendizaje"))
    fireEvent.click(await screen.findByRole("link", { name: /^Foro: Debate de la unidad/ }, ESPERA))
    await tituloDelForo()
    await sinLaFraseDeLaLista(antes)
  })

  it("FORO-1D22: atrás y adelante del historial piden la primera página y la frase desaparece", async () => {
    const { router } = await conLaFraseDeLaLista([BASES.maestro, del("maestro")])
    const antes = pedidas("GET", API_PARTICIPACIONES()).length
    await act(() => router.navigate(-1))
    await screen.findByText("Publica el primer aviso de tu clase.", undefined, ESPERA)
    await act(() => router.navigate(1))
    await tituloDelForo()
    await sinLaFraseDeLaLista(antes)
  })

  it("FORO-1D23: pulsar «Foro» y volver al foro pide la primera página y la frase desaparece", async () => {
    const { router } = await conLaFraseDeLaLista()
    const antes = pedidas("GET", API_PARTICIPACIONES()).length
    fireEvent.click(enLasSecciones("Foro"))
    await screen.findByRole("heading", { level: 2, name: "Foro" }, ESPERA)
    await act(() => router.navigate(-1))
    await tituloDelForo()
    await sinLaFraseDeLaLista(antes)
  })

  it("FORO-1D23: saltar al foro B y volver al A pide la primera página de A y la frase desaparece", async () => {
    const { router } = await conLaFraseDeLaLista([del("maestro", FORO_B), del("maestro")])
    const antes = pedidas("GET", API_PARTICIPACIONES()).length
    await act(() => router.navigate(-1))
    await tituloDelForo("Segundo debate")
    await act(() => router.navigate(1))
    await tituloDelForo()
    await sinLaFraseDeLaLista(antes)
  })
})

// 25 réplicas; al pedir «Ver más réplicas», la última de la primera página ya no está.
const conLaFraseDelBloque = async (entradas = [del("maestro")]) => {
  estado.rol = "maestro"
  const muchas = () => Array.from({ length: 25 }, (_, i) => replica(i + 1))
  estado.participaciones[FORO_A] = [participacion(1, { replicas: muchas() })]
  const montaje = await montar(entradas)
  const fila = await filaDe("Participación 1")
  fireEvent.click(within(fila).getByRole("button", { name: "Ver réplicas (25)" }))
  const verMas = await within(fila).findByRole("button", { name: "Ver más réplicas" }, ESPERA)
  const principal = estado.participaciones[FORO_A]?.[0]
  if (principal === undefined) throw new Error("Precondición: existe la principal")
  principal.replicas = muchas().filter(({ texto }) => texto !== "Réplica 20")
  fireEvent.click(verMas)
  expect(await within(fila).findByText(CURSOR_REPLICAS, undefined, ESPERA)).toBeInTheDocument()
  expect(within(fila).queryByRole("button", { name: "Ver más réplicas" })).toBeNull()
  await reposar()
  return { ...montaje, fila }
}

const sinLaFraseDelBloque = async (antes: number) => {
  await waitFor(() => expect(screen.queryByText(CURSOR_REPLICAS)).toBeNull(), ESPERA)
  await filaDe("Réplica 1")
  const nuevas = pedidas("GET", API_REPLICAS(participacion(1).id)).slice(antes)
  expect(nuevas.length).toBeGreaterThan(0)
  expect(nuevas[0]?.url.searchParams.has("cursor")).toBe(false)
}

describe("FORO-1D24 y FORO-1D25 · «Las réplicas cambiaron… Vuelve a abrirlas…», por cada camino", () => {
  it("FORO-1D24: «Ocultar réplicas» y «Ver réplicas» vuelven a pedir la primera página, no la de la caché", async () => {
    const { fila } = await conLaFraseDelBloque()
    const antes = pedidas("GET", API_REPLICAS(participacion(1).id)).length
    const control = within(fila).getByRole("button", { name: "Ocultar réplicas" })
    fireEvent.click(control)
    await waitFor(() => expect(control).toHaveTextContent(/^Ver réplicas/))
    fireEvent.click(control)
    await sinLaFraseDelBloque(antes)
  })

  it("FORO-1D25: salir del foro y volver antes de 30 s, y abrir el bloque, pide la primera página", async () => {
    const { router } = await conLaFraseDelBloque([BASES.maestro, del("maestro")])
    const antes = pedidas("GET", API_REPLICAS(participacion(1).id)).length
    await act(() => router.navigate(-1))
    await screen.findByText("Publica el primer aviso de tu clase.", undefined, ESPERA)
    await act(() => router.navigate(1))
    const fila = await filaDe("Participación 1")
    fireEvent.click(within(fila).getByRole("button", { name: /^Ver réplicas/ }))
    await sinLaFraseDelBloque(antes)
  })

  it("FORO-1D25: saltar al foro B y volver al A, y abrir el bloque, pide la primera página", async () => {
    const { router } = await conLaFraseDelBloque([del("maestro", FORO_B), del("maestro")])
    const antes = pedidas("GET", API_REPLICAS(participacion(1).id)).length
    await act(() => router.navigate(-1))
    await tituloDelForo("Segundo debate")
    await act(() => router.navigate(1))
    const fila = await filaDe("Participación 1")
    fireEvent.click(within(fila).getByRole("button", { name: /^Ver réplicas/ }))
    await sinLaFraseDelBloque(antes)
  })
})

describe("FORO-1D26 y FORO-1D51 · la recarga fallida de la lista con datos en caché (patrón de Entregas)", () => {
  it("FORO-1D26: una recarga fallida conserva la lista y avisa una vez; el siguiente fallo avisa otra vez; una lectura correcta no avisa y volver a abrir no repite ninguno", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [participacion(1)]
    const { queryClient, router } = await montar([BASES.maestro, del("maestro")])
    await filaDe("Participación 1")
    const fallar = () => {
      estado.falla = ({ url }) =>
        url.pathname === API_PARTICIPACIONES() ? errorApi(503, "SERVICIO_OCUPADO") : undefined
    }
    fallar()
    await act(() =>
      queryClient.invalidateQueries({ queryKey: claveParticipaciones(CLASE, FORO_A) }),
    )
    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(RECARGA_PARTICIPACIONES), ESPERA)
    expect(screen.getByText("Participación 1")).toBeInTheDocument()
    await act(() =>
      queryClient.invalidateQueries({ queryKey: claveParticipaciones(CLASE, FORO_A) }),
    )
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2), ESPERA)
    estado.falla = () => undefined
    estado.participaciones[FORO_A] = [participacion(1), participacion(2)]
    await act(() =>
      queryClient.invalidateQueries({ queryKey: claveParticipaciones(CLASE, FORO_A) }),
    )
    await filaDe("Participación 2")
    await act(() => router.navigate(-1))
    await screen.findByText("Publica el primer aviso de tu clase.", undefined, ESPERA)
    await act(() => router.navigate(1))
    await filaDe("Participación 2")
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(2)
  })

  it("FORO-1D51: montar la vista con un fallo de recarga ya avisado (y su recarga en vuelo) no lo repite (memoria por consulta)", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [participacion(1)]
    const { queryClient, router } = await montar([BASES.maestro, del("maestro")])
    await filaDe("Participación 1")
    estado.falla = ({ url }) =>
      url.pathname === API_PARTICIPACIONES() ? errorApi(503, "SERVICIO_OCUPADO") : undefined
    await act(() =>
      queryClient.invalidateQueries({ queryKey: claveParticipaciones(CLASE, FORO_A) }),
    )
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await act(() => router.navigate(-1))
    await screen.findByText("Publica el primer aviso de tu clase.", undefined, ESPERA)
    // Volver: la vista se monta con el fallo ya avisado en caché y su recarga en vuelo; no lo repite.
    const recarga = enVuelo()
    estado.falla = ({ url }) =>
      url.pathname === API_PARTICIPACIONES() ? recarga.promesa : undefined
    await act(() => router.navigate(1))
    await filaDe("Participación 1")
    await reposar(300)
    expect(aviso.error).toHaveBeenCalledTimes(1)
    recarga.soltar(
      respuestaJson(200, {
        participaciones: [participacionJson(participacion(1))],
        siguienteCursor: null,
      }),
    )
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["503", () => errorApi(503, "SERVICIO_OCUPADO")],
    ["sin red", () => Promise.reject(new TypeError("Failed to fetch"))],
  ] as const)(
    "FORO-1D51: «Ver más participaciones» que falla (%s) conserva la lista, avisa una vez y el botón sigue a la vista",
    async (_nombre, falla) => {
      estado.rol = "maestro"
      estado.participaciones[FORO_A] = veinticinco()
      await montar([del("maestro")])
      await filaDe("Participación 20")
      estado.falla = ({ url }) =>
        url.pathname === API_PARTICIPACIONES() && url.searchParams.has("cursor")
          ? falla()
          : undefined
      const verMas = screen.getByRole("button", { name: "Ver más participaciones" })
      verMas.focus()
      fireEvent.click(verMas)
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
      await reposar()
      expect(aviso.error).toHaveBeenCalledTimes(1)
      expect(screen.getByText("Participación 20")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Ver más participaciones" })).toBeInTheDocument()
    },
  )

  it.each([
    ["401 sin refresco", "/login"],
    ["403 ACCESO_RESTRINGIDO", "/acceso-restringido"],
    ["403 CAMBIO_DE_CONTRASENA_REQUERIDO", "/cambiar-contrasena"],
  ] as const)("FORO-1D53: «Ver más participaciones» con %s no avisa", async (nombre, destino) => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = veinticinco()
    await montar([del("maestro")])
    await filaDe("Participación 20")
    if (nombre === "401 sin refresco") estado.refrescoFalla = true
    estado.falla = ({ url }) => {
      if (url.pathname !== API_PARTICIPACIONES() || !url.searchParams.has("cursor")) {
        return undefined
      }
      if (nombre === "401 sin refresco") return errorApi(401, "NO_AUTENTICADO")
      if (nombre === "403 ACCESO_RESTRINGIDO") return errorApi(403, "ACCESO_RESTRINGIDO")
      return errorApi(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
    }
    fireEvent.click(screen.getByRole("button", { name: "Ver más participaciones" }))
    await waitFor(() => expect(irA).toHaveBeenCalledWith(destino), ESPERA)
    await reposar(300)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("FORO-1D50: dos clics en el mismo render de «Ver más participaciones» piden una sola página, y el foco va a la primera nueva", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = veinticinco()
    await montar([del("maestro")])
    await filaDe("Participación 20")
    const verMas = screen.getByRole("button", { name: "Ver más participaciones" })
    verMas.focus()
    act(() => {
      fireEvent.click(verMas)
      fireEvent.click(verMas)
    })
    const nueva = await filaDe("Participación 21")
    const conCursor = pedidas("GET", API_PARTICIPACIONES()).filter(({ url }) =>
      url.searchParams.has("cursor"),
    )
    expect(conCursor).toHaveLength(1)
    await waitFor(() => expect(nueva).toHaveFocus(), ESPERA)
  })
})

describe("FORO-1D27 · «No pudimos publicar tu participación/réplica. Inténtalo de nuevo.»: repetir el botón publica", () => {
  it.each([
    [
      "estudiante",
      "Escribe tu participación",
      "Publicar participación",
      "No pudimos publicar tu participación. Inténtalo de nuevo.",
    ],
    [
      "maestro",
      "Escribe tu réplica",
      "Publicar réplica",
      "No pudimos publicar tu réplica. Inténtalo de nuevo.",
    ],
  ] as const)(
    "FORO-1D27: (%s) «%s» con un 5xx avisa; lo escrito sigue y el mismo botón publica",
    async (rol, campoTexto, boton, generico) => {
      estado.rol = rol
      estado.participaciones[FORO_A] = [participacion(1)]
      await montar([del(rol)])
      if (rol === "maestro") {
        const fila = await filaDe("Participación 1")
        fireEvent.click(within(fila).getByRole("button", { name: "Replicar" }))
      }
      const campo = await screen.findByLabelText(campoTexto, undefined, ESPERA)
      fireEvent.change(campo, { target: { value: "Lo que escribí." } })
      let primera = true
      estado.falla = ({ metodo }) => {
        if (metodo !== "POST" || !primera) return undefined
        primera = false
        return errorApi(500, "ERROR_INTERNO")
      }
      fireEvent.click(screen.getByRole("button", { name: boton }))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(generico), ESPERA)
      expect(campo).toHaveValue("Lo que escribí.")
      await waitFor(() =>
        expect(screen.getByRole("button", { name: boton })).not.toHaveAttribute(
          "aria-busy",
          "true",
        ),
      )
      fireEvent.click(screen.getByRole("button", { name: boton }))
      expect(
        await screen.findByText("Lo que escribí.", { selector: "p" }, ESPERA),
      ).toBeInTheDocument()
      await reposar()
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
  )
})

describe("FORO-1D33 · «No pudimos actualizar tu participación…» (E1-11), por cada camino", () => {
  const conLaRecargaFallida = async () => {
    const montaje = await montar([del("estudiante")])
    await screen.findByText("Todavía no participas.", undefined, ESPERA)
    estado.falla = ({ url }) =>
      url.pathname === API_MIA() ? errorApi(503, "SERVICIO_OCUPADO") : undefined
    await act(() =>
      montaje.queryClient.invalidateQueries({ queryKey: claveMiParticipacion(CLASE, FORO_A) }),
    )
    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(RECARGA_MIA), ESPERA)
    expect(screen.getByText("Todavía no participas.")).toBeInTheDocument()
    return montaje
  }

  it("FORO-1D33: volver a abrir el foro desde «Foro» antes de 30 s pide «Tu participación» de nuevo", async () => {
    await conLaRecargaFallida()
    estado.falla = () => undefined
    estado.mia = { ...miaInicial(), puedeParticipar: false }
    const antes = pedidas("GET", API_MIA()).length
    fireEvent.click(enLasSecciones("Foro"))
    fireEvent.click(await screen.findByRole("link", { name: /^Foro: Debate de la unidad/ }, ESPERA))
    await tituloDelForo()
    await waitFor(() => expect(pedidas("GET", API_MIA()).length).toBeGreaterThan(antes), ESPERA)
    expect(
      await screen.findByText(
        "La fecha límite ya pasó y este foro ya no recibe participaciones.",
        undefined,
        ESPERA,
      ),
    ).toBeInTheDocument()
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })

  it("FORO-1D33: el siguiente fallo avisa otra vez y una lectura correcta no deja más avisos", async () => {
    const { queryClient } = await conLaRecargaFallida()
    await act(() =>
      queryClient.invalidateQueries({ queryKey: claveMiParticipacion(CLASE, FORO_A) }),
    )
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2), ESPERA)
    estado.falla = () => undefined
    estado.mia = { ...miaInicial(), puedeParticipar: false }
    await act(() =>
      queryClient.invalidateQueries({ queryKey: claveMiParticipacion(CLASE, FORO_A) }),
    )
    expect(
      await screen.findByText(
        "La fecha límite ya pasó y este foro ya no recibe participaciones.",
        undefined,
        ESPERA,
      ),
    ).toBeInTheDocument()
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(2)
  })
})
