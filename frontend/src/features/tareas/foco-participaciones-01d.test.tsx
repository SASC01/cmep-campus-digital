// FORO-01d, corrección de la ronda 1 (T-01 y T-02, arbitraje del manager): a dónde va el foco cuando
// desaparece el control que lo tenía dentro de «Participaciones» o de un bloque de réplicas, el aviso de
// O-01d-2 y las escrituras en una caché paginada. Arnés copiado de replicas-01d.test.tsx (router real,
// `rutas`, y el QueryClient de app/providers.tsx).
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { claveMiParticipacion, claveParticipaciones, claveReplicas } from "./lib"

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
  // vencido: la fecha límite ya pasó y el foro no acepta participaciones tardías (M-11).
  foros: Record<string, { titulo: string; existe: boolean; vencido?: boolean }>
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
    fechaLimite:
      estado.foros[foroId]?.vencido === true
        ? "2026-01-15T16:00:00.000Z"
        : "2030-01-15T16:00:00.000Z",
    puntos: 10,
    aceptaTardias: estado.foros[foroId]?.vencido !== true,
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

const del = (rol: Rol, foroId = FORO_A) => `${BASES[rol]}/foros/${foroId}`
const pedidas = (metodo: string, ruta: string) =>
  estado.llamadas.filter((l) => l.metodo === metodo && l.url.pathname === ruta)
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

const encabezado = () => screen.getByRole("heading", { name: "Participaciones", level: 3 })
const encabezadoDeReplicas = (fila: HTMLElement) =>
  within(fila).getByRole("heading", { name: "Réplicas", level: 4, hidden: true })
const veinticinco = () => Array.from({ length: 25 }, (_, i) => participacion(i + 1))
const veinticincoReplicas = () => Array.from({ length: 25 }, (_, i) => replica(i + 1))
const idsVisibles = (selector: "data-participacion-id" | "data-replica-id", dentro: ParentNode) =>
  Array.from(dentro.querySelectorAll(`[${selector}]`)).map((nodo) => nodo.getAttribute(selector))

let hasFocus: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  hasFocus = vi.spyOn(document, "hasFocus").mockReturnValue(true)
})
afterEach(() => {
  hasFocus.mockRestore()
})

describe("FORO-1D61 · el foco cuando desaparece el control que lo tenía dentro del bloque (T-02)", () => {
  it("FORO-1D61 (A1): publicar con la lista en error lleva el foco al h3 «Participaciones»", async () => {
    estado.falla = ({ metodo, url }) =>
      metodo === "GET" && url.pathname === API_PARTICIPACIONES()
        ? errorApi(503, "SERVICIO_OCUPADO")
        : undefined
    await montar([del("estudiante")])
    await screen.findByText("No pudimos cargar las participaciones.", undefined, ESPERA)
    fireEvent.change(screen.getByLabelText("Escribe tu participación"), {
      target: { value: "Mi aporte" },
    })
    const boton = screen.getByRole("button", { name: "Publicar participación" })
    boton.focus()
    fireEvent.click(boton)
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    await waitFor(() => expect(encabezado()).toHaveFocus(), ESPERA)
    // B3: «Tu participación» se escribe con la respuesta aunque la lista no esté cargada.
    expect(await screen.findByText(/^Participaste el /, undefined, ESPERA)).toBeInTheDocument()
  })

  it.each([
    ["PARTICIPACION_YA_PUBLICADA", "Ya publicaste tu participación."],
    ["PARTICIPACION_CALIFICADA", "Tu participación ya está calificada."],
    ["FORO_CERRADO", "La fecha límite ya pasó."],
  ] as const)(
    "FORO-1D61 (A2): el 409 %s al publicar quita el formulario y lleva el foco al h3, con un solo aviso",
    async (codigo, mensaje) => {
      const otra = participacion(7, { autor: ALUMNA, texto: "Publicada en otra pestaña" })
      estado.falla = ({ metodo, url }) => {
        if (metodo !== "POST" || url.pathname !== API_PARTICIPACIONES()) return undefined
        if (codigo === "FORO_CERRADO") {
          estado.mia = { ...estado.mia, puedeParticipar: false, puedeReplicar: false }
        } else {
          ;(estado.participaciones[FORO_A] ??= []).push(otra)
          estado.mia = {
            ...estado.mia,
            estado: "entregado",
            fechaEntrega: otra.creadoEn,
            principalId: otra.id,
            puedeParticipar: false,
            puedeReplicar: true,
          }
        }
        return errorApi(409, codigo, mensaje)
      }
      await montar([del("estudiante")])
      const campo = await screen.findByLabelText("Escribe tu participación", undefined, ESPERA)
      fireEvent.change(campo, { target: { value: "Mi aporte" } })
      const boton = screen.getByRole("button", { name: "Publicar participación" })
      boton.focus()
      fireEvent.click(boton)
      await waitFor(
        () => expect(screen.queryByRole("button", { name: "Publicar participación" })).toBeNull(),
        ESPERA,
      )
      await waitFor(() => expect(encabezado()).toHaveFocus(), ESPERA)
      await reposar(300)
      expect(aviso.error).toHaveBeenCalledTimes(1)
      expect(aviso.error).toHaveBeenCalledWith(mensaje)
    },
  )

  it("FORO-1D61 (A3): publicar con un error que reemplaza la vista lleva el foco a la raíz de la vista, como hoy", async () => {
    estado.falla = ({ metodo, url }) => {
      if (metodo !== "POST" || url.pathname !== API_PARTICIPACIONES()) return undefined
      estado.foros[FORO_A] = { titulo: "Debate de la unidad", existe: false }
      return errorApi(404, "TAREA_NO_ENCONTRADA")
    }
    await montar([del("estudiante")])
    const campo = await screen.findByLabelText("Escribe tu participación", undefined, ESPERA)
    fireEvent.change(campo, { target: { value: "Mi aporte" } })
    const boton = screen.getByRole("button", { name: "Publicar participación" })
    boton.focus()
    fireEvent.click(boton)
    await screen.findByText("Ese foro ya no existe.", undefined, ESPERA)
    await waitFor(() => {
      const enfocado = document.activeElement
      if (!(enfocado instanceof HTMLDivElement)) throw new Error("el foco no está en la raíz")
      expect(enfocado).toHaveAttribute("tabindex", "-1")
      expect(within(enfocado).getByText("Ese foro ya no existe.")).toBeInTheDocument()
    }, ESPERA)
  })

  it("FORO-1D61 (A4): publicar una réplica con 404 PARTICIPACION_NO_ENCONTRADA saca la fila y lleva el foco al h3, con un solo aviso", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [participacion(1), participacion(2)]
    await montar([del("maestro")])
    const fila = await filaDe("Participación 1")
    fireEvent.click(within(fila).getByRole("button", { name: "Replicar" }))
    const campo = await within(fila).findByLabelText("Escribe tu réplica", undefined, ESPERA)
    fireEvent.change(campo, { target: { value: "Tarde." } })
    estado.participaciones[FORO_A] = [participacion(2)]
    const boton = within(fila).getByRole("button", { name: "Publicar réplica" })
    boton.focus()
    fireEvent.click(boton)
    await waitFor(() => expect(screen.queryByText("Participación 1")).toBeNull(), ESPERA)
    await waitFor(() => expect(encabezado()).toHaveFocus(), ESPERA)
    await reposar(300)
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(aviso.error).toHaveBeenCalledWith("Esa participación ya no existe.")
  })

  it("FORO-1D61 (A5): el alumno que publica una réplica con 409 FORO_CERRADO pierde el formulario y el foco va al h3", async () => {
    estado.mia = { ...miaInicial(), puedeReplicar: true }
    estado.participaciones[FORO_A] = [participacion(1)]
    estado.falla = ({ metodo }) => {
      if (metodo !== "POST") return undefined
      estado.mia = { ...estado.mia, puedeParticipar: false, puedeReplicar: false }
      return errorApi(409, "FORO_CERRADO", "La fecha límite ya pasó.")
    }
    await montar([del("estudiante")])
    const fila = await filaDe("Participación 1")
    fireEvent.click(await within(fila).findByRole("button", { name: "Replicar" }, ESPERA))
    const campo = await within(fila).findByLabelText("Escribe tu réplica", undefined, ESPERA)
    fireEvent.change(campo, { target: { value: "Ya no llego." } })
    const boton = within(fila).getByRole("button", { name: "Publicar réplica" })
    boton.focus()
    fireEvent.click(boton)
    await waitFor(
      () => expect(within(fila).queryByLabelText("Escribe tu réplica")).toBeNull(),
      ESPERA,
    )
    await waitFor(() => expect(encabezado()).toHaveFocus(), ESPERA)
    await reposar(300)
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })

  it("FORO-1D61 (A6, O-01d-2): la recarga de las réplicas con 404 saca la principal con una réplica a medio escribir; el foco va al h3 y avisa una vez «Esa participación ya no existe.»", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [
      participacion(1, { replicas: [replica(1)] }),
      participacion(2),
    ]
    const { queryClient } = await montar([del("maestro")])
    const fila = await filaDe("Participación 1")
    fireEvent.click(within(fila).getByRole("button", { name: "Ver réplicas (1)" }))
    await filaDe("Réplica 1")
    const campo = within(fila).getByLabelText("Escribe tu réplica")
    fireEvent.change(campo, { target: { value: "Lo que estaba escribiendo" } })
    campo.focus()
    estado.participaciones[FORO_A] = [participacion(2)]
    await act(() =>
      queryClient.invalidateQueries({
        queryKey: claveReplicas(CLASE, FORO_A, participacion(1).id),
        exact: true,
      }),
    )
    await waitFor(() => expect(screen.queryByText("Participación 1")).toBeNull(), ESPERA)
    await waitFor(() => expect(encabezado()).toHaveFocus(), ESPERA)
    await reposar(300)
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(aviso.error).toHaveBeenCalledWith("Esa participación ya no existe.")
  })

  it("FORO-1D61 (A6, O-01d-2): un segundo 404 de las réplicas de otra principal avisa otra vez; volver a abrir no repite el aviso", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [
      participacion(1, { replicas: [replica(1)] }),
      participacion(2, { replicas: [replica(2)] }),
      participacion(3),
    ]
    const { queryClient } = await montar([del("maestro")])
    const primera = await filaDe("Participación 1")
    const segunda = await filaDe("Participación 2")
    fireEvent.click(within(primera).getByRole("button", { name: "Ver réplicas (1)" }))
    fireEvent.click(within(segunda).getByRole("button", { name: "Ver réplicas (1)" }))
    await filaDe("Réplica 1")
    await filaDe("Réplica 2")
    estado.participaciones[FORO_A] = [
      participacion(2, { replicas: [replica(2)] }),
      participacion(3),
    ]
    await act(() =>
      queryClient.invalidateQueries({
        queryKey: claveReplicas(CLASE, FORO_A, participacion(1).id),
        exact: true,
      }),
    )
    await waitFor(() => expect(screen.queryByText("Participación 1")).toBeNull(), ESPERA)
    await reposar(300)
    expect(aviso.error).toHaveBeenCalledTimes(1)
    estado.participaciones[FORO_A] = [participacion(3)]
    await act(() =>
      queryClient.invalidateQueries({
        queryKey: claveReplicas(CLASE, FORO_A, participacion(2).id),
        exact: true,
      }),
    )
    await waitFor(() => expect(screen.queryByText("Participación 2")).toBeNull(), ESPERA)
    await reposar(300)
    expect(aviso.error).toHaveBeenCalledTimes(2)
    expect(aviso.error).toHaveBeenNthCalledWith(2, "Esa participación ya no existe.")
  })

  it("FORO-1D61 (A7): una recarga de la lista que quita la fila con el foco lo lleva al h3, sin aviso", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [participacion(1), participacion(2)]
    const { queryClient } = await montar([del("maestro")])
    const fila = await filaDe("Participación 1")
    within(fila).getByRole("button", { name: "Replicar" }).focus()
    estado.participaciones[FORO_A] = [participacion(2)]
    await act(() =>
      queryClient.invalidateQueries({ queryKey: claveParticipaciones(CLASE, FORO_A), exact: true }),
    )
    await waitFor(() => expect(screen.queryByText("Participación 1")).toBeNull(), ESPERA)
    await waitFor(() => expect(encabezado()).toHaveFocus(), ESPERA)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("FORO-1D61 (A8): una recarga del bloque que quita la réplica con el foco lo lleva al h4 «Réplicas» de su bloque", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [participacion(1, { replicas: [replica(1), replica(2)] })]
    const { queryClient } = await montar([del("maestro")])
    const fila = await filaDe("Participación 1")
    fireEvent.click(within(fila).getByRole("button", { name: "Ver réplicas (2)" }))
    const laReplica = await filaDe("Réplica 1")
    laReplica.focus()
    expect(laReplica).toHaveFocus()
    estado.participaciones[FORO_A] = [participacion(1, { replicas: [replica(2)] })]
    await act(() =>
      queryClient.invalidateQueries({
        queryKey: claveReplicas(CLASE, FORO_A, participacion(1).id),
        exact: true,
      }),
    )
    await waitFor(() => expect(screen.queryByText("Réplica 1")).toBeNull(), ESPERA)
    await waitFor(() => expect(encabezadoDeReplicas(fila)).toHaveFocus(), ESPERA)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("FORO-1D61 (A10): borrar con 404 PARTICIPACION_NO_ENCONTRADA saca la fila con «Sí, borrar …» enfocado y el foco va al h3", async () => {
    estado.rol = "admin"
    estado.participaciones[FORO_A] = [participacion(1), participacion(2), participacion(3)]
    await montar([del("admin")])
    const fila = await filaDe("Participación 2")
    estado.participaciones[FORO_A] = [participacion(1), participacion(3)]
    fireEvent.click(within(fila).getByRole("button", { name: /^Borrar/ }))
    const si = within(fila).getByRole("button", { name: "Sí, borrar participación" })
    si.focus()
    fireEvent.click(si)
    await waitFor(() => expect(screen.queryByText("Participación 2")).toBeNull(), ESPERA)
    await waitFor(() => expect(encabezado()).toHaveFocus(), ESPERA)
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })

  it("FORO-1D61 (A10): borrar con 403 BORRADO_NO_PERMITIDO deja la fila y el foco en «Sí, borrar …», aunque la lista renovada traiga otra fila", async () => {
    estado.rol = "admin"
    estado.participaciones[FORO_A] = [participacion(1), participacion(2)]
    estado.falla = ({ metodo }) => {
      if (metodo !== "DELETE") return undefined
      // Mientras tanto otra persona publicó: la lista renovada cambia y el bloque vuelve a pintarse.
      estado.participaciones[FORO_A] = [participacion(1), participacion(2), participacion(3)]
      return errorApi(403, "BORRADO_NO_PERMITIDO", "No puedes borrar esto.")
    }
    await montar([del("admin")])
    const fila = await filaDe("Participación 2")
    fireEvent.click(within(fila).getByRole("button", { name: /^Borrar/ }))
    const si = within(fila).getByRole("button", { name: "Sí, borrar participación" })
    si.focus()
    fireEvent.click(si)
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await filaDe("Participación 3")
    await reposar(300)
    expect(screen.getByText("Participación 2")).toBeInTheDocument()
    expect(within(fila).getByRole("button", { name: "Sí, borrar participación" })).toHaveFocus()
  })

  it("FORO-1D61 (A11): la clase que entra en solo lectura con el foco en «Escribe tu réplica» lleva el foco al h3", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [participacion(1)]
    estado.falla = ({ metodo }) => {
      if (metodo !== "POST") return undefined
      estado.archivada = true
      return errorApi(409, "CLASE_ARCHIVADA", "La clase está archivada.")
    }
    await montar([del("maestro")])
    const fila = await filaDe("Participación 1")
    fireEvent.click(within(fila).getByRole("button", { name: "Replicar" }))
    const campo = await within(fila).findByLabelText("Escribe tu réplica", undefined, ESPERA)
    fireEvent.change(campo, { target: { value: "Respuesta" } })
    fireEvent.click(within(fila).getByRole("button", { name: "Publicar réplica" }))
    campo.focus()
    await waitFor(
      () => expect(within(fila).queryByLabelText("Escribe tu réplica")).toBeNull(),
      ESPERA,
    )
    await waitFor(() => expect(encabezado()).toHaveFocus(), ESPERA)
  })

  it("FORO-1D61 (A14): «Tu participación» que pierde el formulario en una recarga (otra pestaña) lleva el foco al h3", async () => {
    const { queryClient } = await montar([del("estudiante")])
    const campo = await screen.findByLabelText("Escribe tu participación", undefined, ESPERA)
    campo.focus()
    const otra = participacion(7, { autor: ALUMNA, texto: "Publicada en otra pestaña" })
    estado.participaciones[FORO_A] = [otra]
    estado.mia = {
      ...estado.mia,
      estado: "entregado",
      fechaEntrega: otra.creadoEn,
      principalId: otra.id,
      puedeParticipar: false,
      puedeReplicar: true,
    }
    await act(() =>
      queryClient.invalidateQueries({ queryKey: claveMiParticipacion(CLASE, FORO_A) }),
    )
    await waitFor(
      () => expect(screen.queryByLabelText("Escribe tu participación")).toBeNull(),
      ESPERA,
    )
    await waitFor(() => expect(encabezado()).toHaveFocus(), ESPERA)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("FORO-1D61: soltar el foco con un clic en blanco y después perder el control en una recarga no se lleva el foco", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [participacion(1), participacion(2)]
    const { queryClient } = await montar([del("maestro")])
    const fila = await filaDe("Participación 1")
    const replicar = within(fila).getByRole("button", { name: "Replicar" })
    replicar.focus()
    // Un clic en blanco: el foco sale sin destino y el control sigue en el documento.
    act(() => {
      replicar.blur()
    })
    await reposar(50)
    estado.participaciones[FORO_A] = [participacion(2)]
    await act(() =>
      queryClient.invalidateQueries({ queryKey: claveParticipaciones(CLASE, FORO_A), exact: true }),
    )
    await waitFor(() => expect(screen.queryByText("Participación 1")).toBeNull(), ESPERA)
    await reposar(300)
    expect(encabezado()).not.toHaveFocus()
  })
})

describe("FORO-1D62 · escrituras en una caché paginada (T-01 y sus vecinos)", () => {
  it("FORO-1D62 (B1): con páginas por cargar, la principal publicada se ve al final de lo cargado, con el foco y sin otra lectura; al cargar más queda al final", async () => {
    estado.participaciones[FORO_A] = veinticinco()
    await montar([del("estudiante")])
    await filaDe("Participación 20")
    await reposar()
    const lecturas = pedidas("GET", API_PARTICIPACIONES()).length
    fireEvent.change(screen.getByLabelText("Escribe tu participación"), {
      target: { value: "Mi aporte" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Publicar participación" }))
    const nueva = await filaDe("Mi aporte")
    await waitFor(() => expect(nueva).toHaveFocus(), ESPERA)
    const lista = screen.getByRole("region", { name: "Participaciones" })
    expect(idsVisibles("data-participacion-id", lista).at(-1)).toBe(
      nueva.getAttribute("data-participacion-id"),
    )
    expect(idsVisibles("data-participacion-id", lista).at(-2)).toBe(participacion(20).id)
    await reposar()
    expect(pedidas("GET", API_PARTICIPACIONES())).toHaveLength(lecturas)
    fireEvent.click(screen.getByRole("button", { name: "Ver más participaciones" }))
    await filaDe("Participación 25")
    const ids = idsVisibles("data-participacion-id", lista)
    expect(ids).toHaveLength(26)
    expect(ids.at(-1)).toBe(nueva.getAttribute("data-participacion-id"))
    expect(ids.at(-2)).toBe(participacion(25).id)
  })

  it("FORO-1D62 (B2): con réplicas por cargar, la réplica publicada se ve al final de lo cargado, el campo se vacía, el foco vuelve al campo y no hay otra lectura; al cargar más queda al final", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [participacion(1, { replicas: veinticincoReplicas() })]
    await montar([del("maestro")])
    const fila = await filaDe("Participación 1")
    fireEvent.click(within(fila).getByRole("button", { name: "Ver réplicas (25)" }))
    await filaDe("Réplica 20")
    await reposar()
    const ruta = API_REPLICAS(participacion(1).id)
    const lecturas = pedidas("GET", ruta).length
    const campo = within(fila).getByLabelText("Escribe tu réplica")
    fireEvent.change(campo, { target: { value: "Mi réplica" } })
    fireEvent.click(within(fila).getByRole("button", { name: "Publicar réplica" }))
    const nueva = await filaDe("Mi réplica")
    await waitFor(() => expect(campo).toHaveFocus(), ESPERA)
    expect(campo).toHaveValue("")
    expect(idsVisibles("data-replica-id", fila).at(-1)).toBe(nueva.getAttribute("data-replica-id"))
    expect(idsVisibles("data-replica-id", fila).at(-2)).toBe(replica(20).id)
    await reposar()
    expect(pedidas("GET", ruta)).toHaveLength(lecturas)
    fireEvent.click(within(fila).getByRole("button", { name: "Ver más réplicas" }))
    await filaDe("Réplica 25")
    const ids = idsVisibles("data-replica-id", fila)
    expect(ids).toHaveLength(26)
    expect(ids.at(-1)).toBe(nueva.getAttribute("data-replica-id"))
  })

  it("FORO-1D62 (B4): borrar la última principal de la primera página con la siguiente cargada lleva el foco al «Borrar» de la vecina, que venía de la otra página", async () => {
    estado.rol = "admin"
    estado.participaciones[FORO_A] = veinticinco()
    await montar([del("admin")])
    await filaDe("Participación 20")
    fireEvent.click(screen.getByRole("button", { name: "Ver más participaciones" }))
    await filaDe("Participación 25")
    const fila = await filaDe("Participación 20")
    fireEvent.click(within(fila).getByRole("button", { name: /^Borrar/ }))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar participación" }))
    await waitFor(() => expect(screen.queryByText("Participación 20")).toBeNull(), ESPERA)
    const vecina = await filaDe("Participación 21")
    await waitFor(
      () => expect(within(vecina).getByRole("button", { name: /^Borrar/ })).toHaveFocus(),
      ESPERA,
    )
    expect(screen.getByText("Participación 25")).toBeInTheDocument()
  })

  it("FORO-1D62 (B5): con réplicas por cargar, publicar sube el conteo plegado una vez, y al cargar más no cuenta dos veces la nueva", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [participacion(1, { replicas: veinticincoReplicas() })]
    await montar([del("maestro")])
    const fila = await filaDe("Participación 1")
    const control = within(fila).getByRole("button", { name: "Ver réplicas (25)" })
    fireEvent.click(control)
    await filaDe("Réplica 20")
    fireEvent.change(within(fila).getByLabelText("Escribe tu réplica"), {
      target: { value: "Mi réplica" },
    })
    fireEvent.click(within(fila).getByRole("button", { name: "Publicar réplica" }))
    await filaDe("Mi réplica")
    fireEvent.click(control)
    await waitFor(() => expect(control).toHaveTextContent("Ver réplicas (26)"))
    fireEvent.click(control)
    await filaDe("Réplica 20")
    fireEvent.click(within(fila).getByRole("button", { name: "Ver más réplicas" }))
    await filaDe("Réplica 25")
    fireEvent.click(control)
    await waitFor(() => expect(control).toHaveTextContent("Ver réplicas (26)"))
  })
})
