// FORO-01d (§D-8.4, §D-10; §E11.2 y §E11.3): participar en un foro, con el router real (`rutas`) y el
// QueryClient de app/providers.tsx (staleTime de 30 s, un reintento). FORO-1D01 a FORO-1D04, FORO-1D04b,
// FORO-1D28, FORO-1D32, FORO-1D40 a FORO-1D42, y las partes de publicar de FORO-1D50, FORO-1D52 y
// FORO-1D53.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import { formatearFechaHora, formatearFechaLarga } from "@/lib/format"
import { clavePrefijoDeCalificaciones } from "@/services/calificacionesService"
import { claveForo, claveListaDeForos, clavePrefijoDelTrabajo } from "@/services/trabajoService"

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
const seccionDeParticipaciones = () =>
  screen.findByRole("region", { name: "Participaciones" }, ESPERA)
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

const NOTA_RETRASO = "La fecha límite ya pasó: tu participación quedará marcada con retraso."
const CERRADO = "La fecha límite ya pasó y este foro ya no recibe participaciones."
const NOTA_ADMIN = "La administración puede leer este foro, pero no participar en él."
const OTRAS_LISTAS = [
  claveListaDeForos(CLASE),
  [...clavePrefijoDelTrabajo(CLASE), "sin-tema"],
  [...clavePrefijoDeCalificaciones(CLASE), "gradebook"],
]
const FUENTES = import.meta.glob<string>("/src/features/tareas/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})

describe("FORO-1D01 · el formulario de la principal según «Tu participación» y el rol", () => {
  it("FORO-1D01: el alumno sin principal y con el foro abierto ve «Escribe tu participación» y «Publicar participación», sin la nota de retraso", async () => {
    await montar([del("estudiante")])
    const seccion = await seccionDeParticipaciones()
    expect(
      await within(seccion).findByLabelText("Escribe tu participación", undefined, ESPERA),
    ).toBeInTheDocument()
    expect(
      within(seccion).getByRole("button", { name: "Publicar participación" }),
    ).toBeInTheDocument()
    expect(
      within(seccion).getByText("Lo que publiques aquí lo ve toda la clase."),
    ).toBeInTheDocument()
    expect(within(seccion).queryByText(NOTA_RETRASO)).toBeNull()
  })

  it("FORO-1D01: con participarConRetraso, la nota de retraso antes del campo", async () => {
    estado.mia = { ...miaInicial(), participarConRetraso: true }
    await montar([del("estudiante")])
    expect(await screen.findByText(NOTA_RETRASO, undefined, ESPERA)).toBeInTheDocument()
    expect(screen.getByLabelText("Escribe tu participación")).toBeInTheDocument()
  })

  it("FORO-1D01: cerrado (sin poder participar, sin principal ni calificación), el texto de cerrado y ningún formulario", async () => {
    estado.mia = { ...miaInicial(), puedeParticipar: false }
    await montar([del("estudiante")])
    expect(await screen.findByText(CERRADO, undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByLabelText("Escribe tu participación")).toBeNull()
  })

  it("FORO-1D01: con su principal publicada, ni formulario ni texto de cerrado", async () => {
    const mia = participacion(1, { autor: ALUMNA, texto: "Mi participación" })
    estado.participaciones[FORO_A] = [mia]
    estado.mia = {
      ...miaInicial(),
      estado: "entregado",
      fechaEntrega: mia.creadoEn,
      principalId: mia.id,
      puedeParticipar: false,
      puedeReplicar: true,
    }
    await montar([del("estudiante")])
    await filaDe("Mi participación")
    await reposar()
    expect(screen.queryByLabelText("Escribe tu participación")).toBeNull()
    expect(screen.queryByText(CERRADO)).toBeNull()
  })

  it("FORO-1D01: el admin ve la nota de la administración y ningún formulario; el maestro, ningún formulario de principal; ninguno pide «mi-participacion»", async () => {
    estado.rol = "admin"
    await montar([del("admin")])
    const seccion = await seccionDeParticipaciones()
    expect(await within(seccion).findByText(NOTA_ADMIN, undefined, ESPERA)).toBeInTheDocument()
    expect(within(seccion).queryByLabelText("Escribe tu participación")).toBeNull()
    cleanup()
    estado.rol = "maestro"
    await montar([del("maestro")])
    await seccionDeParticipaciones()
    await reposar()
    expect(screen.queryByLabelText("Escribe tu participación")).toBeNull()
    expect(screen.queryByText(NOTA_ADMIN)).toBeNull()
    expect(pedidas("GET", API_MIA())).toHaveLength(0)
  })
})

describe("FORO-1D02 · publicar la principal", () => {
  it("FORO-1D02: avisa, escribe «Tu participación» y la lista con la respuesta sin pedirlas otra vez, marca viejas la lista de «Foro», las actividades y las calificaciones, y lleva el foco a la participación nueva", async () => {
    const { queryClient } = await montar([del("estudiante")])
    const campo = await screen.findByLabelText("Escribe tu participación", undefined, ESPERA)
    for (const clave of OTRAS_LISTAS) queryClient.setQueryData(clave, {})
    const listaAntes = pedidas("GET", API_PARTICIPACIONES()).length
    const miaAntes = pedidas("GET", API_MIA()).length
    fireEvent.change(campo, { target: { value: "Mi opinión sobre la lectura." } })
    fireEvent.click(screen.getByRole("button", { name: "Publicar participación" }))
    const fila = await filaDe("Mi opinión sobre la lectura.")
    expect(aviso.success).toHaveBeenCalledWith("Participación publicada")
    await waitFor(() => expect(fila).toHaveFocus(), ESPERA)
    expect(screen.queryByLabelText("Escribe tu participación")).toBeNull()
    expect(await screen.findByText(/^Participaste el /, undefined, ESPERA)).toBeInTheDocument()
    await reposar()
    expect(pedidas("GET", API_PARTICIPACIONES())).toHaveLength(listaAntes)
    expect(pedidas("GET", API_MIA())).toHaveLength(miaAntes)
    for (const clave of OTRAS_LISTAS) {
      expect(queryClient.getQueryState(clave)?.isInvalidated).toBe(true)
    }
  })

  it("FORO-1D50: dos clics en el mismo render de «Publicar participación» mandan una sola petición", async () => {
    const pendiente = enVuelo()
    await montar([del("estudiante")])
    const campo = await screen.findByLabelText("Escribe tu participación", undefined, ESPERA)
    estado.falla = ({ metodo }) => (metodo === "POST" ? pendiente.promesa : undefined)
    fireEvent.change(campo, { target: { value: "Una sola vez." } })
    const boton = screen.getByRole("button", { name: "Publicar participación" })
    act(() => {
      fireEvent.click(boton)
      fireEvent.click(boton)
    })
    await reposar()
    expect(pedidas("POST", API_PARTICIPACIONES())).toHaveLength(1)
    pendiente.soltar(errorApi(500, "ERROR_INTERNO"))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
  })
})

describe("FORO-1D03 · los 409 al publicar", () => {
  it.each(["PARTICIPACION_YA_PUBLICADA", "PARTICIPACION_CALIFICADA", "FORO_CERRADO"])(
    "FORO-1D03: %s avisa con el texto del servidor, conserva lo escrito y vuelve a pedir «Tu participación» y la lista",
    async (codigo) => {
      await montar([del("estudiante")])
      const campo = await screen.findByLabelText("Escribe tu participación", undefined, ESPERA)
      await reposar()
      const listaAntes = pedidas("GET", API_PARTICIPACIONES()).length
      const miaAntes = pedidas("GET", API_MIA()).length
      estado.falla = ({ metodo }) =>
        metodo === "POST" ? errorApi(409, codigo, "Texto del servidor.") : undefined
      fireEvent.change(campo, { target: { value: "Lo que escribí." } })
      fireEvent.click(screen.getByRole("button", { name: "Publicar participación" }))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledWith("Texto del servidor."), ESPERA)
      await waitFor(
        () => expect(pedidas("GET", API_MIA()).length).toBeGreaterThan(miaAntes),
        ESPERA,
      )
      await waitFor(
        () => expect(pedidas("GET", API_PARTICIPACIONES()).length).toBeGreaterThan(listaAntes),
        ESPERA,
      )
      expect(screen.getByLabelText("Escribe tu participación")).toHaveValue("Lo que escribí.")
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
  )
})

describe("FORO-1D04 · el retraso y las fechas los decide el servidor (E1-1)", () => {
  it("FORO-1D04: «Con retraso» sale solo con conRetraso, y cada participación muestra su fecha y hora", async () => {
    estado.rol = "maestro"
    const tarde = participacion(1, { conRetraso: true })
    const aTiempo = participacion(2, { conRetraso: false })
    estado.participaciones[FORO_A] = [tarde, aTiempo]
    await montar([del("maestro")])
    const filaTarde = await filaDe("Participación 1")
    const filaATiempo = await filaDe("Participación 2")
    expect(within(filaTarde).getByText("Con retraso")).toBeInTheDocument()
    expect(within(filaATiempo).queryByText("Con retraso")).toBeNull()
    expect(within(filaTarde).getByText(formatearFechaHora(tarde.creadoEn))).toBeInTheDocument()
    expect(within(filaATiempo).getByText(formatearFechaHora(aTiempo.creadoEn))).toBeInTheDocument()
  })

  it("FORO-1D04: la nota de retraso sale solo de participarConRetraso: en false no sale aunque el foro esté vencido; el cerrado, solo de puedeParticipar", async () => {
    estado.mia = { ...miaInicial(), participarConRetraso: false, puedeParticipar: true }
    await montar([del("estudiante")])
    await screen.findByLabelText("Escribe tu participación", undefined, ESPERA)
    expect(screen.queryByText(NOTA_RETRASO)).toBeNull()
    expect(screen.queryByText(CERRADO)).toBeNull()
  })
})

describe("FORO-1D04b · los componentes del foro no deciden el cierre ni el retraso con la hora (E1-1, estática)", () => {
  it("FORO-1D04b: los componentes de participación no leen la hora ni la fecha límite, y las funciones de la participación de lib.ts no comparan con la hora", () => {
    const componentes = Object.entries(FUENTES).filter(([ruta]) =>
      /components\/(participaciones-del-foro|participacion-del-foro|replicas-de-participacion|formulario-de-participacion|mi-participacion)\.tsx$/.test(
        ruta,
      ),
    )
    expect(componentes).toHaveLength(5)
    for (const [ruta, texto] of componentes) {
      expect(texto, ruta).not.toMatch(/Date\.now|new Date\(|getTime\(|fechaLimite/)
    }
    const lib = Object.entries(FUENTES).find(([ruta]) => ruta.endsWith("/features/tareas/lib.ts"))
    if (lib === undefined) throw new Error("Precondición: existe features/tareas/lib.ts")
    const funciones = lib[1]
      .split(/\n(?=export const )/)
      .filter((bloque) => /Participacion|Replica/.test(bloque.split("\n")[0] ?? ""))
    expect(funciones.length).toBeGreaterThan(0)
    for (const bloque of funciones) {
      expect(bloque).not.toMatch(/Date\.now|getTime\(|fechaLimite/)
    }
  })
})

describe("FORO-1D28 · «Tu participación»", () => {
  it("FORO-1D28: sin participar, «Asignado» y «Todavía no participas.»", async () => {
    await montar([del("estudiante")])
    const panel = await screen.findByRole("region", { name: "Tu participación" }, ESPERA)
    expect(
      await within(panel).findByText("Todavía no participas.", undefined, ESPERA),
    ).toBeInTheDocument()
    expect(within(panel).getByText("Asignado")).toBeInTheDocument()
  })

  it.each([
    [false, "Entregado", ""],
    [true, "Entregado con retraso", " con retraso"],
  ])(
    "FORO-1D28: con su principal (conRetraso %s), «%s» y «Participaste el … a las …%s»",
    async (conRetraso, insignia, sufijo) => {
      const fecha = "2026-11-03T20:30:00.000Z"
      estado.mia = {
        ...miaInicial(),
        estado: "entregado",
        fechaEntrega: fecha,
        conRetraso,
        principalId: uuid("8a8b3c4d", 1),
        puedeParticipar: false,
      }
      await montar([del("estudiante")])
      const panel = await screen.findByRole("region", { name: "Tu participación" }, ESPERA)
      const fechaLocal = new Date(fecha)
      const hora = new Intl.DateTimeFormat("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(fechaLocal)
      expect(
        await within(panel).findByText(
          `Participaste el ${formatearFechaLarga(fechaLocal)} a las ${hora}${sufijo}`,
          undefined,
          ESPERA,
        ),
      ).toBeInTheDocument()
      expect(within(panel).getByText(insignia)).toBeInTheDocument()
    },
  )

  it("FORO-1D28: el maestro y el admin no ven «Tu participación»", async () => {
    estado.rol = "maestro"
    await montar([del("maestro")])
    await seccionDeParticipaciones()
    await reposar()
    expect(screen.queryByRole("region", { name: "Tu participación" })).toBeNull()
  })
})

describe("FORO-1D32 · «Tu participación» que no carga (E1-11)", () => {
  it("FORO-1D32: la primera carga fallida dice «No pudimos cargar tu participación.», sin aviso y sin el formulario", async () => {
    estado.falla = ({ url }) =>
      url.pathname === API_MIA() ? errorApi(500, "ERROR_INTERNO") : undefined
    await montar([del("estudiante")])
    expect(
      await screen.findByText("No pudimos cargar tu participación.", undefined, ESPERA),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText("Escribe tu participación")).toBeNull()
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

describe("FORO-1D40 · el foro con su id en mayúsculas (§E11.2, R-01d-4)", () => {
  it("FORO-1D40: pide las participaciones y «Tu participación» en minúsculas, y publicar escribe en la clave que la vista lee: la nueva aparece sin otra lectura", async () => {
    await montar([del("estudiante", FORO_A.toUpperCase())])
    const campo = await screen.findByLabelText("Escribe tu participación", undefined, ESPERA)
    const bajoForos = estado.llamadas.filter(({ url }) => url.pathname.startsWith(`${API}/foros/`))
    const deParticipacion = bajoForos.filter(({ url }) => /participacion/.test(url.pathname))
    expect(deParticipacion.length).toBeGreaterThan(0)
    for (const { url } of deParticipacion) expect(url.pathname).toBe(url.pathname.toLowerCase())
    const listaAntes = pedidas("GET", API_PARTICIPACIONES()).length
    fireEvent.change(campo, { target: { value: "En minúsculas." } })
    fireEvent.click(screen.getByRole("button", { name: "Publicar participación" }))
    await filaDe("En minúsculas.")
    await reposar()
    expect(pedidas("GET", API_PARTICIPACIONES())).toHaveLength(listaAntes)
    expect(pedidas("POST", API_PARTICIPACIONES())).toHaveLength(1)
  })
})

describe("FORO-1D41 · las claves de 01d con su forma literal (§E11.3)", () => {
  const PREFIJO = ["clases", CLASE, "foros"]
  const esPrefijo = (corta: readonly unknown[], larga: readonly unknown[]) =>
    corta.length <= larga.length && corta.every((parte, i) => parte === larga[i])

  it("FORO-1D41: claveMiParticipacion, claveParticipaciones y claveReplicas cuelgan de claveForo con sus segmentos fijos", () => {
    expect(claveMiParticipacion(CLASE, FORO_A)).toEqual([...PREFIJO, "foro", FORO_A, "mia"])
    expect(claveParticipaciones(CLASE, FORO_A)).toEqual([
      ...PREFIJO,
      "foro",
      FORO_A,
      "participaciones",
    ])
    expect(claveReplicas(CLASE, FORO_A, "p1")).toEqual([
      ...PREFIJO,
      "foro",
      FORO_A,
      "replicas",
      "p1",
    ])
  })

  it.each(["mia", "participaciones", "replicas", "lista", "foro"])(
    "FORO-1D41: con participacionId «%s» ninguna clave coincide con otra del foro ni es prefijo de una que no sea suya, y ninguna es prefijo de la lista",
    (participacionId) => {
      const claves = [
        claveForo(CLASE, FORO_A),
        claveMiParticipacion(CLASE, FORO_A),
        claveParticipaciones(CLASE, FORO_A),
        claveReplicas(CLASE, FORO_A, participacionId),
      ]
      const lista = claveListaDeForos(CLASE)
      for (const [i, una] of claves.entries()) {
        expect(esPrefijo(una, lista)).toBe(false)
        expect(esPrefijo(lista, una)).toBe(false)
        for (const [j, otra] of claves.entries()) {
          if (i === j) continue
          expect(una).not.toEqual(otra)
          // Solo claveForo (la 0) es prefijo de las demás.
          expect(esPrefijo(una, otra)).toBe(i === 0)
        }
      }
    },
  )
})

describe("FORO-1D42 · sin ciclo de peticiones y un solo mensaje cuando el foro ya no está (§E11.2)", () => {
  it.each([
    [
      "404 TAREA_NO_ENCONTRADA",
      () => errorApi(404, "TAREA_NO_ENCONTRADA"),
      "Ese foro ya no existe.",
    ],
    [
      "403 SIN_ACCESO_A_LA_CLASE",
      () => errorApi(403, "SIN_ACCESO_A_LA_CLASE"),
      "No tienes acceso a esta clase.",
    ],
    [
      "400 VALIDACION de foroId",
      () => errorApi(400, "VALIDACION", "foroId: debe ser un identificador válido"),
      "Ese foro ya no existe.",
    ],
  ] as const)(
    "FORO-1D42: con el foro en %s no sale ninguna lectura de participaciones ni de «Tu participación»",
    async (_nombre, respuesta, texto) => {
      estado.falla = ({ url }) => (url.pathname === API_FORO() ? respuesta() : undefined)
      await montar([del("estudiante")])
      expect(await screen.findByText(texto, undefined, ESPERA)).toBeInTheDocument()
      await reposar(300)
      expect(pedidas("GET", API_PARTICIPACIONES())).toHaveLength(0)
      expect(pedidas("GET", API_MIA())).toHaveLength(0)
    },
  )

  it.each([
    [
      "404 TAREA_NO_ENCONTRADA",
      () => errorApi(404, "TAREA_NO_ENCONTRADA"),
      "Ese foro ya no existe.",
    ],
    [
      "403 SIN_ACCESO_A_LA_CLASE",
      () => errorApi(403, "SIN_ACCESO_A_LA_CLASE"),
      "No tienes acceso a esta clase.",
    ],
    [
      "400 VALIDACION de foroId",
      () => errorApi(400, "VALIDACION", "foroId: debe ser un identificador válido"),
      "Ese foro ya no existe.",
    ],
  ] as const)(
    "FORO-1D42: si la lista de participaciones recibe %s con el foro en caché, se pide una sola vez más el foro, su respuesta reemplaza la vista con un solo mensaje y la lista no se repite",
    async (_nombre, respuesta, texto) => {
      const foroAntes = () => pedidas("GET", API_FORO()).length
      const primerFallo = enVuelo()
      let vez = 0
      estado.falla = ({ url }) => {
        if (url.pathname === API_PARTICIPACIONES()) {
          vez += 1
          return vez === 1 ? primerFallo.promesa : respuesta()
        }
        if (url.pathname === API_FORO() && vez > 0) return respuesta()
        return undefined
      }
      await montar([del("estudiante")])
      await tituloDelForo()
      const lecturasDelForo = foroAntes()
      primerFallo.soltar(respuesta())
      expect(await screen.findByText(texto, undefined, ESPERA)).toBeInTheDocument()
      await reposar(1500)
      // Una sola lectura más del foro: su petición y su reintento (retry: 1 de app/providers.tsx).
      expect(pedidas("GET", API_FORO())).toHaveLength(lecturasDelForo + 2)
      // Una lectura de la lista y su reintento (retry: 1); ninguna más.
      expect(pedidas("GET", API_PARTICIPACIONES())).toHaveLength(2)
      expect(screen.getAllByText(texto)).toHaveLength(1)
    },
  )

  it("FORO-1D42: con un servidor inconsistente (el foro responde 200 y la lista otra vez 403), el bloque se queda con su texto genérico, sin ciclo", async () => {
    estado.falla = ({ url }) =>
      url.pathname === API_PARTICIPACIONES() ? errorApi(403, "SIN_ACCESO_A_LA_CLASE") : undefined
    await montar([del("estudiante")])
    expect(
      await screen.findByText("No pudimos cargar las participaciones.", undefined, ESPERA),
    ).toBeInTheDocument()
    await reposar(1500)
    const foro = pedidas("GET", API_FORO()).length
    const lista = pedidas("GET", API_PARTICIPACIONES()).length
    await reposar(1500)
    expect(pedidas("GET", API_FORO())).toHaveLength(foro)
    expect(pedidas("GET", API_PARTICIPACIONES())).toHaveLength(lista)
    expect(screen.queryByText("No tienes acceso a esta clase.")).toBeNull()
  })

  it("FORO-1D42: un 404 NO_ENCONTRADO de la lista se queda en el bloque y no vuelve a pedir el foro", async () => {
    estado.falla = ({ url }) =>
      url.pathname === API_PARTICIPACIONES() ? errorApi(404, "NO_ENCONTRADO") : undefined
    await montar([del("estudiante")])
    await tituloDelForo()
    const foro = pedidas("GET", API_FORO()).length
    expect(
      await screen.findByText("No pudimos cargar las participaciones.", undefined, ESPERA),
    ).toBeInTheDocument()
    await reposar(300)
    expect(pedidas("GET", API_FORO())).toHaveLength(foro)
  })
})

describe("FORO-1D52 · lo abierto es de la participación y del foro", () => {
  it("FORO-1D52: el maestro con el bloque de réplicas abierto y una réplica a medio escribir salta al foro B y vuelve: nada queda abierto, nada se envía y el foco no cae en <body>", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [participacion(1)]
    const { router } = await montar([del("maestro", FORO_B), del("maestro")])
    const fila = await filaDe("Participación 1")
    fireEvent.click(within(fila).getByRole("button", { name: "Replicar" }))
    const campo = await within(fila).findByLabelText("Escribe tu réplica", undefined, ESPERA)
    fireEvent.change(campo, { target: { value: "A medio escribir" } })
    campo.focus()
    await act(() => router.navigate(-1))
    await tituloDelForo("Segundo debate")
    expect(document.activeElement).not.toBe(document.body)
    // N-38: el foco va a la raíz de DetalleDelForo (el div con tabIndex={-1} que contiene el foro).
    await waitFor(() => {
      const enfocado = document.activeElement
      if (!(enfocado instanceof HTMLDivElement)) throw new Error("el foco no está en la raíz")
      expect(enfocado).toHaveAttribute("tabindex", "-1")
      expect(within(enfocado).getByRole("heading", { name: "Segundo debate" })).toBeInTheDocument()
      expect(within(enfocado).getByRole("heading", { name: "Participaciones" })).toBeInTheDocument()
    }, ESPERA)
    expect(screen.queryByLabelText("Escribe tu réplica")).toBeNull()
    await act(() => router.navigate(1))
    const otraVez = await filaDe("Participación 1")
    expect(within(otraVez).queryByLabelText("Escribe tu réplica")).toBeNull()
    expect(within(otraVez).getByRole("button", { name: "Replicar" })).toBeInTheDocument()
    expect(pedidas("POST", API_REPLICAS(participacion(1).id))).toHaveLength(0)
  })

  it("FORO-1D52: el admin con la confirmación de «Borrar» abierta salta al foro B y vuelve: no queda abierta y nada se borra", async () => {
    estado.rol = "admin"
    estado.participaciones[FORO_A] = [participacion(1)]
    estado.participaciones[FORO_B] = [participacion(2)]
    const { router } = await montar([del("admin", FORO_B), del("admin")])
    const fila = await filaDe("Participación 1")
    fireEvent.click(within(fila).getByRole("button", { name: /^Borrar/ }))
    expect(
      within(fila).getByRole("button", { name: "Sí, borrar participación" }),
    ).toBeInTheDocument()
    await act(() => router.navigate(-1))
    await filaDe("Participación 2")
    expect(screen.queryByRole("button", { name: "Sí, borrar participación" })).toBeNull()
    await act(() => router.navigate(1))
    await filaDe("Participación 1")
    expect(screen.queryByRole("button", { name: "Sí, borrar participación" })).toBeNull()
    expect(estado.llamadas.filter(({ metodo }) => metodo === "DELETE")).toHaveLength(0)
  })
})

describe("FORO-1D53 · publicar y las lecturas no avisan ante un código con que apiClient redirige", () => {
  const CODIGOS = [
    ["401 sin refresco", "/login"],
    ["403 ACCESO_RESTRINGIDO", "/acceso-restringido"],
    ["403 CAMBIO_DE_CONTRASENA_REQUERIDO", "/cambiar-contrasena"],
  ] as const
  const respuesta = (nombre: (typeof CODIGOS)[number][0]) => {
    if (nombre === "401 sin refresco") return errorApi(401, "NO_AUTENTICADO")
    if (nombre === "403 ACCESO_RESTRINGIDO") return errorApi(403, "ACCESO_RESTRINGIDO")
    return errorApi(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
  }

  it.each(CODIGOS)("FORO-1D53: publicar con %s no avisa", async (nombre, destino) => {
    await montar([del("estudiante")])
    const campo = await screen.findByLabelText("Escribe tu participación", undefined, ESPERA)
    if (nombre === "401 sin refresco") estado.refrescoFalla = true
    estado.falla = ({ metodo }) => (metodo === "POST" ? respuesta(nombre) : undefined)
    fireEvent.change(campo, { target: { value: "Algo." } })
    fireEvent.click(screen.getByRole("button", { name: "Publicar participación" }))
    await waitFor(() => expect(irA).toHaveBeenCalledWith(destino), ESPERA)
    await reposar(300)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it.each(CODIGOS)(
    "FORO-1D53: la recarga de la lista y de «Tu participación» con %s no avisa",
    async (nombre, destino) => {
      estado.participaciones[FORO_A] = [participacion(1)]
      const { queryClient } = await montar([del("estudiante")])
      await filaDe("Participación 1")
      await screen.findByText("Todavía no participas.", undefined, ESPERA)
      if (nombre === "401 sin refresco") estado.refrescoFalla = true
      estado.falla = ({ url }) =>
        url.pathname === API_PARTICIPACIONES() || url.pathname === API_MIA()
          ? respuesta(nombre)
          : undefined
      await act(() =>
        queryClient.invalidateQueries({ queryKey: claveParticipaciones(CLASE, FORO_A) }),
      )
      await act(() =>
        queryClient.invalidateQueries({ queryKey: claveMiParticipacion(CLASE, FORO_A) }),
      )
      await waitFor(() => expect(irA).toHaveBeenCalledWith(destino), ESPERA)
      await reposar(300)
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )
})
