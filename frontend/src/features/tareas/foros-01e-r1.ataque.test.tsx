// FORO-01e, ronda 1 del tester: «Participantes», la participación de un alumno, calificar un foro y
// «Comentarios de tu maestro», con el router real (`rutas`) y el QueryClient de app/providers.tsx. El
// doble del servidor es el de recuperar-participantes-01e.test.tsx, copiado. Reloj fijo (solo Date).
// Ids desde ATQ-FORO-148.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { claveClaseDetalle } from "@/services/clasesService"
import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { claveParticipacionesDeAlumno, claveParticipante } from "./lib"

const aviso = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
)
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

type Rol = "estudiante" | "maestro" | "admin"

// Reloj fijo (R-01e-8): la fecha límite y las fechas de la caché se comparan con esta hora.
const AHORA = new Date("2030-01-10T12:00:00.000Z")
const uuid = (prefijo: string, n: number) =>
  `${prefijo}-1d0f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const CLASE = uuid("2a2b3c4d", 1)
const CLASE_B = uuid("2a2b3c4d", 2)
const FORO_A = uuid("5a5b3c4d", 1)
const FORO_B = uuid("5a5b3c4d", 2)
const FORO_C = uuid("5a5b3c4d", 3)
const TAREA = uuid("5c5b3c4d", 1)
const MAESTRO = { id: uuid("3a3b3c4d", 1), nombre: "Luis Pérez" }
const ALUMNA = { id: uuid("4a4b3c4d", 1), nombre: "Ana López" }
const CRITERIO_1 = uuid("6a6b3c4d", 1)
const CRITERIO_2 = uuid("6a6b3c4d", 2)
const ESPERA = { timeout: 5000 }
const BASES: Record<Rol, (clase?: string) => string> = {
  estudiante: (clase = CLASE) => `/estudiante/clases/${clase}`,
  maestro: (clase = CLASE) => `/maestro/clases/${clase}`,
  admin: (clase = CLASE) => `/admin/clases/${clase}`,
}
const alumno = (n: number) => ({ id: uuid("4a4b3c4d", 100 + n), nombre: `Alumno ${String(n)}` })
const API = (clase = CLASE) => `/api/clases/${clase}`
const API_FORO = (foro = FORO_A, clase = CLASE) => `${API(clase)}/foros/${foro}`
const API_PARTICIPANTES = (foro = FORO_A, clase = CLASE) => `${API_FORO(foro, clase)}/participantes`
const API_PARTICIPANTE = (a: string, foro = FORO_A, clase = CLASE) =>
  `${API_PARTICIPANTES(foro, clase)}/${a}`
const API_ESCRITOS = (a: string, foro = FORO_A, clase = CLASE) =>
  `${API_PARTICIPANTE(a, foro, clase)}/participaciones`
const API_DEVOLUCIONES = (a: string, foro = FORO_A, clase = CLASE) =>
  `${API_PARTICIPANTE(a, foro, clase)}/devoluciones`

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

interface CalificacionDoble {
  puntos: number
  sobre: number
  fecha: string
  puntajes: { criterioId: string; criterio: string; puntosMax: number; puntos: number }[]
}

interface EntregaDoble {
  estado: "asignado" | "entregado" | "calificado"
  fechaEntrega: string | null
  conRetraso: boolean
  version: number
  calificacion: CalificacionDoble | null
}

interface EscritoDoble {
  id: string
  texto: string
  creadoEn: string
  conRetraso: boolean
  enRespuestaA: { participacionId: string; autor: Autor } | null
}

interface ComentarioDoble {
  id: string
  texto: string
  autor: Autor
  creadoEn: string
}

interface ForoDoble {
  clase: string
  titulo: string
  existe: boolean
  vencido?: boolean
  conRubrica?: boolean
}

interface MiaDoble {
  estado: "asignado" | "entregado" | "calificado"
  fechaEntrega: string | null
  conRetraso: boolean
  calificacion: CalificacionDoble | null
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
  foros: Record<string, ForoDoble>
  alumnos: Record<string, Autor[]>
  entregas: Record<string, EntregaDoble>
  escritos: Record<string, EscritoDoble[]>
  devoluciones: Record<string, ComentarioDoble[]>
  mia: Record<string, MiaDoble>
  misDevoluciones: Record<string, ComentarioDoble[]>
  falla: (llamada: Llamada) => Response | Promise<Response> | undefined
  llamadas: Llamada[]
}

let estado: Estado
let siguienteId = 0
const nuevoId = () => {
  siguienteId += 1
  return uuid("9a9b3c4d", siguienteId)
}

const de = (foro: string, a: string) => `${foro}:${a}`
const asignada = (): EntregaDoble => ({
  estado: "asignado",
  fechaEntrega: null,
  conRetraso: false,
  version: 0,
  calificacion: null,
})
const entregada = (extra: Partial<EntregaDoble> = {}): EntregaDoble => ({
  estado: "entregado",
  fechaEntrega: "2030-01-08T15:30:00.000Z",
  conRetraso: false,
  version: 1,
  calificacion: null,
  ...extra,
})
const calificacion = (puntos = 8, conRubrica = false): CalificacionDoble => ({
  puntos,
  sobre: 10,
  fecha: "2030-01-09T10:00:00.000Z",
  puntajes: conRubrica
    ? [
        { criterioId: CRITERIO_1, criterio: "Claridad", puntosMax: 5, puntos: 4 },
        { criterioId: CRITERIO_2, criterio: "Argumentos", puntosMax: 5, puntos: 4 },
      ]
    : [],
})
const escrito = (n: number, extra: Partial<EscritoDoble> = {}): EscritoDoble => ({
  id: uuid("8a8b3c4d", n),
  texto: `Escrito ${String(n)}`,
  creadoEn: new Date(Date.UTC(2030, 0, 8, 10, n)).toISOString(),
  conRetraso: false,
  enRespuestaA: null,
  ...extra,
})
const comentario = (n: number, extra: Partial<ComentarioDoble> = {}): ComentarioDoble => ({
  id: uuid("7a7b3c4d", n),
  texto: `Comentario ${String(n)}`,
  autor: MAESTRO,
  creadoEn: new Date(Date.UTC(2030, 0, 9, 10, n)).toISOString(),
  ...extra,
})
const miaInicial = (): MiaDoble => ({
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

const autorJson = (autor: Autor) => ({ ...autor, administracion: false })

const rubricaDe = (foro: ForoDoble) =>
  foro.conRubrica === true
    ? [
        { id: CRITERIO_1, criterio: "Claridad", puntosMax: 5 },
        { id: CRITERIO_2, criterio: "Argumentos", puntosMax: 5 },
      ]
    : []

const foroJson = (foroId: string, foro: ForoDoble) => ({
  foro: {
    id: foroId,
    titulo: foro.titulo,
    instrucciones: "Opina sobre la lectura.",
    fechaLimite: foro.vencido === true ? "2030-01-05T16:00:00.000Z" : "2030-01-15T16:00:00.000Z",
    puntos: 10,
    aceptaTardias: foro.vencido !== true,
    version: 0,
    categoria: null,
    tema: null,
    rubrica: rubricaDe(foro),
    adjuntos: [],
    autor: autorJson(MAESTRO),
    creadoEn: "2030-01-01T15:30:00.000Z",
    actualizadoEn: "2030-01-01T15:30:00.000Z",
    puedeEditar: estado.rol !== "estudiante",
    puedeBorrar: estado.rol !== "estudiante",
  },
})

const entregaJson = (a: Autor, e: EntregaDoble) => ({
  entrega: {
    alumno: a,
    estado: e.estado,
    fechaEntrega: e.fechaEntrega,
    conRetraso: e.conRetraso,
    enlaces: [],
    adjuntos: [],
    version: e.version,
    calificacion: e.calificacion,
  },
})

const paginar = <T,>(filas: readonly T[], url: URL, idDe: (fila: T) => string) => {
  const limite = Number(url.searchParams.get("limite") ?? "20")
  const cursor = url.searchParams.get("cursor")
  let inicio = 0
  if (cursor !== null) {
    const indice = filas.findIndex((fila) => idDe(fila) === cursor)
    if (indice === -1) return null
    inicio = indice + 1
  }
  const pagina = filas.slice(inicio, inicio + limite)
  const siguiente = filas.length > inicio + limite ? idDe(pagina.at(-1) as T) : null
  return { pagina, siguiente }
}

const comentariosJson = (lista: readonly ComentarioDoble[], url: URL) => {
  const r = paginar(lista, url, (c) => c.id)
  if (r === null) return errorApi(400, "VALIDACION", "cursor: no es válido")
  return respuestaJson(200, {
    comentarios: r.pagina.map((c) => ({
      ...c,
      autor: autorJson(c.autor),
      propio: c.autor.id === MAESTRO.id && estado.rol === "maestro",
    })),
    siguienteCursor: r.siguiente,
  })
}

const calificar = (llamada: Llamada, foro: ForoDoble, a: Autor, foroId: string) => {
  const cuerpo = llamada.cuerpo as {
    version: number
    puntajes: { criterioId: string; puntos: number }[]
    calificacion: number | null
    comentario?: string
  }
  const clave = de(foroId, a.id)
  const actual = estado.entregas[clave] ?? asignada()
  if (cuerpo.version !== actual.version) {
    return errorApi(409, "ENTREGA_MODIFICADA", "La participación cambió. Vuelve a calificarla.")
  }
  const conRubrica = foro.conRubrica === true
  const puntos = conRubrica
    ? cuerpo.puntajes.reduce((suma, p) => suma + p.puntos, 0)
    : (cuerpo.calificacion ?? 0)
  const nueva: EntregaDoble = {
    ...actual,
    estado: "calificado",
    version: actual.version + 1,
    calificacion: {
      puntos,
      sobre: 10,
      fecha: "2030-01-10T12:00:00.000Z",
      puntajes: conRubrica
        ? cuerpo.puntajes.map((p, i) => ({
            criterioId: p.criterioId,
            criterio: i === 0 ? "Claridad" : "Argumentos",
            puntosMax: 5,
            puntos: p.puntos,
          }))
        : [],
    },
  }
  estado.entregas[clave] = nueva
  if (cuerpo.comentario !== undefined) {
    ;(estado.devoluciones[clave] ??= []).push({
      id: nuevoId(),
      texto: cuerpo.comentario,
      autor: MAESTRO,
      creadoEn: "2030-01-10T12:00:00.000Z",
    })
  }
  return respuestaJson(200, entregaJson(a, nueva))
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
  const forosDeLaClase = Object.entries(estado.foros).filter(
    ([, foro]) => foro.existe && foro.clase === claseId,
  )
  if (resto === "" && metodo === "GET") {
    return respuestaJson(200, {
      clase: {
        id: claseId,
        nombre: claseId === CLASE ? "Historia" : "Química",
        descripcion: null,
        maestro: MAESTRO,
        maestros: [MAESTRO],
        archivadaEn: estado.archivada ? "2030-01-09T10:00:00.000Z" : null,
      },
    })
  }
  if (resto === "/codigo") return respuestaJson(200, { codigo: "ABCDEFG" })
  if (resto === "/publicaciones") {
    return respuestaJson(200, { publicaciones: [], siguienteCursor: null })
  }
  if (resto === "/foros" && metodo === "GET") {
    return respuestaJson(200, {
      foros: forosDeLaClase.map(([id, foro]) => ({
        id,
        titulo: foro.titulo,
        autor: autorJson(MAESTRO),
        creadoEn: "2030-01-01T15:30:00.000Z",
        fechaLimite: "2030-01-15T16:00:00.000Z",
        puntos: 10,
        tema: null,
        participaciones: 0,
        entrega: null,
      })),
      siguienteCursor: null,
    })
  }
  if (resto === "/temas") return respuestaJson(200, { temas: [], sinTema: forosDeLaClase.length })
  if (resto === "/trabajo") {
    return respuestaJson(200, {
      elementos: forosDeLaClase.map(([id, foro]) => ({
        id,
        tipo: "foro",
        titulo: foro.titulo,
        autor: autorJson(MAESTRO),
        creadoEn: "2030-01-01T15:30:00.000Z",
        material: null,
        tarea: { fechaLimite: "2030-01-15T16:00:00.000Z", puntos: 10 },
        puedeMover: false,
        entrega: null,
      })),
      siguienteCursor: null,
    })
  }
  if (resto === "/gradebook") {
    const alumnos = estado.alumnos[claseId] ?? []
    return respuestaJson(200, {
      tareas: forosDeLaClase.map(([id, foro]) => ({
        id,
        titulo: foro.titulo,
        fechaLimite: "2030-01-15T16:00:00.000Z",
        puntos: 10,
        categoria: null,
        ...(url.searchParams.get("conTipo") === "si" ? { tipo: "foro" } : {}),
      })),
      siguienteCursorTareas: null,
      alumnos: alumnos.map((a) => ({
        alumno: a,
        celdas: forosDeLaClase.map(([id]) => {
          const e = estado.entregas[de(id, a.id)] ?? asignada()
          return {
            tareaId: id,
            estado: e.estado,
            conRetraso: e.conRetraso,
            calificacion: e.calificacion?.puntos ?? null,
          }
        }),
        porcentaje: null,
        vencidasSinEntregar: 0,
        motivosDeRiesgo: [],
      })),
      siguienteCursor: null,
      resumen: {
        modo: "puntos",
        totalAlumnos: alumnos.length,
        promedioDeLaClase: null,
        alumnosEnRiesgo: 0,
      },
    })
  }
  const deTarea = /^\/tareas\/([^/]+)(\/.*)?$/.exec(resto)
  if (deTarea !== null && deTarea[1] === TAREA) {
    const sub = deTarea[2] ?? ""
    if (sub === "" && metodo === "GET") {
      return respuestaJson(200, {
        tarea: {
          id: TAREA,
          titulo: "Ensayo",
          instrucciones: "",
          fechaLimite: "2030-01-15T16:00:00.000Z",
          puntos: 10,
          aceptaTardias: true,
          requiereAdjuntos: true,
          version: 0,
          categoria: null,
          tema: null,
          rubrica: [],
          adjuntos: [],
          autor: autorJson(MAESTRO),
          creadoEn: "2030-01-01T15:30:00.000Z",
          actualizadoEn: "2030-01-01T15:30:00.000Z",
          puedeEditar: true,
          puedeBorrar: true,
        },
      })
    }
    const deEntrega = /^\/entregas\/([^/]+)(\/.*)?$/.exec(sub)
    const a = (estado.alumnos[claseId] ?? []).find(({ id }) => id === deEntrega?.[1])
    if (deEntrega !== null && a !== undefined) {
      const subE = deEntrega[2] ?? ""
      const clave = de(TAREA, a.id)
      if (subE === "")
        return respuestaJson(200, entregaJson(a, estado.entregas[clave] ?? asignada()))
      if (subE === "/comentarios") return comentariosJson(estado.devoluciones[clave] ?? [], url)
      if (subE === "/calificacion" && metodo === "PUT") {
        return calificar(llamada, { clase: claseId, titulo: "Ensayo", existe: true }, a, TAREA)
      }
    }
  }
  const deForo = /^\/foros\/([^/]+)(\/.*)?$/.exec(resto)
  if (deForo !== null) {
    const crudo = deForo[1] ?? ""
    if (!/^[0-9a-f-]{36}$/i.test(crudo)) {
      return errorApi(400, "VALIDACION", "foroId: foroId: debe ser un identificador válido")
    }
    const foroId = crudo.toLowerCase()
    const foro = estado.foros[foroId]
    if (foro === undefined || !foro.existe || foro.clase !== claseId) {
      return errorApi(404, "TAREA_NO_ENCONTRADA")
    }
    const sub = deForo[2] ?? ""
    if (sub === "" && metodo === "GET") return respuestaJson(200, foroJson(foroId, foro))
    if (sub === "/mi-participacion") return respuestaJson(200, estado.mia[foroId] ?? miaInicial())
    if (sub === "/mi-participacion/devoluciones") {
      return comentariosJson(estado.misDevoluciones[foroId] ?? [], url)
    }
    if (sub === "/participaciones" && metodo === "GET") {
      return respuestaJson(200, { participaciones: [], siguienteCursor: null })
    }
    if (/^\/participaciones\/[^/]+$/.test(sub) && metodo === "DELETE") {
      return new Response(null, { status: 204 })
    }
    const alumnos = estado.alumnos[claseId] ?? []
    if (sub === "/participantes") {
      const r = paginar(alumnos, url, (a) => a.id)
      if (r === null) return errorApi(400, "VALIDACION", "cursor: no es válido")
      const filas = alumnos.map((a) => estado.entregas[de(foroId, a.id)] ?? asignada())
      return respuestaJson(200, {
        entregas: r.pagina.map((a) => {
          const e = estado.entregas[de(foroId, a.id)] ?? asignada()
          return {
            alumno: a,
            estado: e.estado,
            fechaEntrega: e.fechaEntrega,
            conRetraso: e.conRetraso,
          }
        }),
        total: alumnos.length,
        entregadas: filas.filter((e) => e.fechaEntrega !== null).length,
        siguienteCursor: r.siguiente,
      })
    }
    const deAlumno = /^\/participantes\/([^/]+)(\/.*)?$/.exec(sub)
    if (deAlumno !== null) {
      const crudoA = deAlumno[1] ?? ""
      if (!/^[0-9a-f-]{36}$/i.test(crudoA)) {
        return errorApi(400, "VALIDACION", "alumnoId: alumnoId: debe ser un identificador válido")
      }
      const alumnoId = crudoA.toLowerCase()
      const a = alumnos.find(({ id }) => id === alumnoId)
      if (a === undefined) return errorApi(404, "ALUMNO_NO_ENCONTRADO")
      const subA = deAlumno[2] ?? ""
      const clave = de(foroId, alumnoId)
      if (subA === "") {
        return respuestaJson(200, entregaJson(a, estado.entregas[clave] ?? asignada()))
      }
      if (subA === "/participaciones") {
        const r = paginar(estado.escritos[clave] ?? [], url, (p) => p.id)
        if (r === null) return errorApi(400, "VALIDACION", "cursor: no es válido")
        return respuestaJson(200, {
          participaciones: r.pagina.map((p) => ({
            ...p,
            enRespuestaA:
              p.enRespuestaA === null
                ? null
                : { ...p.enRespuestaA, autor: autorJson(p.enRespuestaA.autor) },
          })),
          siguienteCursor: r.siguiente,
        })
      }
      if (subA === "/devoluciones") return comentariosJson(estado.devoluciones[clave] ?? [], url)
      if (subA === "/calificacion" && metodo === "PUT") return calificar(llamada, foro, a, foroId)
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

const pedidas = (metodo: string, ruta: string) =>
  estado.llamadas.filter((l) => l.metodo === metodo && l.url.pathname === ruta)
const participantes = (rol: Rol = "maestro", foro = FORO_A, clase = CLASE) =>
  `${BASES[rol](clase)}/foros/${foro}/participantes`
const participanteDe = (a: string, rol: Rol = "maestro", foro = FORO_A, clase = CLASE) =>
  `${participantes(rol, foro, clase)}/${a}`
const bloqueDe = (titulo: string) => {
  const h = screen.getByRole("heading", { name: titulo })
  const bloque = h.closest("section")
  if (!(bloque instanceof HTMLElement)) throw new Error(`Precondición: «${titulo}» es un bloque`)
  return bloque
}
beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  siguienteId = 0
  estado = {
    rol: "maestro",
    archivada: false,
    refrescoFalla: false,
    foros: {
      [FORO_A]: { clase: CLASE, titulo: "Debate de la unidad", existe: true },
      [FORO_B]: { clase: CLASE, titulo: "Segundo debate", existe: true },
      [FORO_C]: { clase: CLASE_B, titulo: "Debate de Química", existe: true },
    },
    alumnos: { [CLASE]: [alumno(1), alumno(2)], [CLASE_B]: [alumno(1)] },
    entregas: {},
    escritos: {},
    devoluciones: {},
    mia: {},
    misDevoluciones: {},
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
  vi.useRealTimers()
})

const RUBRICA = "La rúbrica cambió. Vuelve a calificar."
const avisosDeError = () => aviso.error.mock.calls.map(([texto]) => String(texto))

describe("ATQ-FORO-148 · la recarga tras un 409 de calificar con el foro y la participante fallando a la vez", () => {
  it("ATQ-FORO-148: un 409 RUBRICA_MODIFICADA cuya recarga falla en el foro y en la participante da el aviso del 409 y uno solo de la recarga", async () => {
    const a = alumno(1)
    estado.entregas[de(FORO_A, a.id)] = entregada({ version: 1 })
    let fallan = false
    estado.falla = ({ metodo, url }) => {
      if (metodo === "PUT") {
        fallan = true
        return errorApi(409, "RUBRICA_MODIFICADA", RUBRICA)
      }
      if (
        fallan &&
        metodo === "GET" &&
        (url.pathname === API_FORO() || url.pathname === API_PARTICIPANTE(a.id))
      ) {
        return errorApi(503, "SERVICIO_OCUPADO")
      }
      return undefined
    }
    await montar([participanteDe(a.id)])
    const campo = await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA)
    fireEvent.change(campo, { target: { value: "8" } })
    fireEvent.click(screen.getByRole("button", { name: "Calificar y devolver" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(RUBRICA), ESPERA)
    await waitFor(() => expect(aviso.error.mock.calls.length).toBeGreaterThanOrEqual(2), {
      timeout: 6000,
    })
    await reposar(1500)
    expect({ avisos: avisosDeError(), cuantos: aviso.error.mock.calls.length }).toEqual({
      avisos: expect.arrayContaining([RUBRICA]) as unknown as string[],
      cuantos: 2,
    })
    expect(campo).toHaveValue("8")
  }, 15_000)

  it("ATQ-FORO-148 (control): el mismo 409 con solo la participante fallando da el aviso del 409 y uno de la recarga", async () => {
    const a = alumno(1)
    estado.entregas[de(FORO_A, a.id)] = entregada({ version: 1 })
    let fallan = false
    estado.falla = ({ metodo, url }) => {
      if (metodo === "PUT") {
        fallan = true
        return errorApi(409, "RUBRICA_MODIFICADA", RUBRICA)
      }
      if (fallan && metodo === "GET" && url.pathname === API_PARTICIPANTE(a.id)) {
        return errorApi(503, "SERVICIO_OCUPADO")
      }
      return undefined
    }
    await montar([participanteDe(a.id)])
    const campo = await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA)
    fireEvent.change(campo, { target: { value: "8" } })
    fireEvent.click(screen.getByRole("button", { name: "Calificar y devolver" }))
    await waitFor(() => expect(aviso.error.mock.calls.length).toBeGreaterThanOrEqual(2), {
      timeout: 6000,
    })
    await reposar(1500)
    expect(aviso.error).toHaveBeenCalledTimes(2)
  }, 15_000)
})

describe("ATQ-FORO-148 (control en la tarea) · la misma recarga en la entrega de un alumno", () => {
  it("ATQ-FORO-148 (control en la tarea): un 409 RUBRICA_MODIFICADA cuya recarga falla en la tarea y en la entrega da el aviso del 409 y uno solo de la recarga", async () => {
    const a = alumno(1)
    estado.entregas[de(TAREA, a.id)] = entregada({ version: 1 })
    const API_ENTREGA = `${API()}/tareas/${TAREA}/entregas/${a.id}`
    let fallan = false
    estado.falla = ({ metodo, url }) => {
      if (metodo === "PUT") {
        fallan = true
        return errorApi(409, "RUBRICA_MODIFICADA", RUBRICA)
      }
      if (
        fallan &&
        metodo === "GET" &&
        (url.pathname === `${API()}/tareas/${TAREA}` || url.pathname === API_ENTREGA)
      ) {
        return errorApi(503, "SERVICIO_OCUPADO")
      }
      return undefined
    }
    await montar([`${BASES.maestro()}/tareas/${TAREA}/entregas/${a.id}`])
    const campo = await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA)
    fireEvent.change(campo, { target: { value: "8" } })
    fireEvent.click(screen.getByRole("button", { name: "Calificar y devolver" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(RUBRICA), ESPERA)
    await reposar(4000)
    // En la tarea, el fallo de la recarga lo avisa una sola vez (el de la tarea); la entrega calla.
    expect(avisosDeError()).toEqual([
      RUBRICA,
      "No pudimos actualizar la tarea. Mostramos la última versión que tenemos.",
    ])
  }, 15_000)
})

describe("ATQ-FORO-149 · R-01e-14 en los estados sin caso propio", () => {
  it("ATQ-FORO-149: los dos bloques de la participante con datos reciben a la vez un error que reemplaza la vista y la participante responde bien: una lectura lógica más, sin ciclo y sin avisos", async () => {
    const a = alumno(1)
    estado.entregas[de(FORO_A, a.id)] = entregada({ version: 1, calificacion: calificacion() })
    estado.escritos[de(FORO_A, a.id)] = [escrito(1)]
    estado.devoluciones[de(FORO_A, a.id)] = [comentario(1)]
    const { queryClient } = await montar([participanteDe(a.id)])
    await screen.findByText("Escrito 1", undefined, ESPERA)
    await screen.findByText("Comentario 1", undefined, ESPERA)
    estado.falla = ({ metodo, url }) =>
      metodo === "GET" &&
      (url.pathname === API_ESCRITOS(a.id) || url.pathname === API_DEVOLUCIONES(a.id))
        ? errorApi(404, "ALUMNO_NO_ENCONTRADO")
        : undefined
    const antes = pedidas("GET", API_PARTICIPANTE(a.id)).length
    await act(() =>
      queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          queryKey.length > claveParticipante(CLASE, FORO_A, a.id).length && queryKey[7] === a.id,
      }),
    )
    await reposar(4000)
    const a4 = pedidas("GET", API_PARTICIPANTE(a.id)).length
    await reposar(3000)
    expect(pedidas("GET", API_PARTICIPANTE(a.id)).length).toBe(a4)
    expect(a4 - antes).toBeGreaterThanOrEqual(1)
    expect(a4 - antes).toBeLessThanOrEqual(2)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(screen.getByRole("heading", { level: 2, name: a.nombre })).toBeInTheDocument()
  }, 15_000)

  it("ATQ-FORO-149: «Sus participaciones» con datos recibe un error que reemplaza la vista y la participante lo confirma: la vista se reemplaza con un solo mensaje", async () => {
    const a = alumno(1)
    estado.entregas[de(FORO_A, a.id)] = entregada({ version: 1 })
    estado.escritos[de(FORO_A, a.id)] = [escrito(1)]
    const { queryClient } = await montar([participanteDe(a.id)])
    await screen.findByText("Escrito 1", undefined, ESPERA)
    estado.alumnos[CLASE] = (estado.alumnos[CLASE] ?? []).filter(({ id }) => id !== a.id)
    await act(() =>
      queryClient.invalidateQueries({
        queryKey: claveParticipacionesDeAlumno(CLASE, FORO_A, a.id),
        exact: true,
      }),
    )
    expect(
      await screen.findByText("No encontramos a ese alumno en esta clase.", undefined, {
        timeout: 6000,
      }),
    ).toBeInTheDocument()
    await reposar(500)
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(aviso.error).not.toHaveBeenCalled()
  }, 15_000)
})

describe("ATQ-FORO-150 · la memoria de avisos entre alumnos y al volver", () => {
  it("ATQ-FORO-150: una recarga fallida de la participante del alumno 1 avisa una vez; el alumno 2 no la hereda; volver al 1 con el fallo en caché no la repite", async () => {
    const a1 = alumno(1)
    const a2 = alumno(2)
    estado.entregas[de(FORO_A, a1.id)] = entregada({ version: 1 })
    estado.entregas[de(FORO_A, a2.id)] = entregada({ version: 1 })
    const { router, queryClient } = await montar([participanteDe(a1.id)])
    await screen.findByRole("heading", { level: 2, name: a1.nombre }, ESPERA)
    estado.falla = ({ metodo, url }) =>
      metodo === "GET" && url.pathname === API_PARTICIPANTE(a1.id)
        ? errorApi(503, "SERVICIO_OCUPADO")
        : undefined
    await act(() =>
      queryClient.invalidateQueries({
        queryKey: claveParticipante(CLASE, FORO_A, a1.id),
        exact: true,
      }),
    )
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), { timeout: 6000 })
    await act(() => router.navigate(participanteDe(a2.id)))
    await screen.findByRole("heading", { level: 2, name: a2.nombre }, ESPERA)
    await reposar(500)
    expect(aviso.error).toHaveBeenCalledTimes(1)
    // Al volver, la relectura del alumno 1 queda en vuelo: el fallo de la caché sigue a la vista y no es
    // un fallo nuevo (O-01e-4: con la relectura fallando otra vez, el aviso nuevo es correcto).
    estado.falla = ({ metodo, url }) =>
      metodo === "GET" && url.pathname === API_PARTICIPANTE(a1.id)
        ? new Promise<Response>(() => undefined)
        : undefined
    await act(() => router.navigate(-1))
    await screen.findByRole("heading", { level: 2, name: a1.nombre }, ESPERA)
    await reposar(2500)
    expect(aviso.error).toHaveBeenCalledTimes(1)
  }, 15_000)
})

describe("ATQ-FORO-151 · ids en mayúsculas en la participación de un alumno", () => {
  it("ATQ-FORO-151: con :foroId y :alumnoId en mayúsculas, ninguna lectura sale sin canonizar, hay una sola clave de la participante y calificar escribe en ella sin otra lectura", async () => {
    const a = alumno(1)
    estado.entregas[de(FORO_A, a.id)] = entregada({ version: 1 })
    const { queryClient } = await montar([
      participanteDe(a.id.toUpperCase(), "maestro", FORO_A.toUpperCase()),
    ])
    const campo = await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA)
    const lecturas = pedidas("GET", API_PARTICIPANTE(a.id)).length
    fireEvent.change(campo, { target: { value: "8" } })
    fireEvent.click(screen.getByRole("button", { name: "Calificar y devolver" }))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    await reposar(300)
    expect(pedidas("GET", API_PARTICIPANTE(a.id))).toHaveLength(lecturas)
    const noCanonicas = estado.llamadas.filter(
      ({ url }) =>
        url.pathname.startsWith(`${API()}/foros/`) && url.pathname !== url.pathname.toLowerCase(),
    )
    expect(noCanonicas).toHaveLength(0)
    const claves = queryClient
      .getQueryCache()
      .findAll({ queryKey: ["clases", CLASE, "foros", "foro"] })
      .filter(({ queryKey }) => queryKey[6] === "alumno")
      .map(({ queryKey }) => `${String(queryKey[4])}:${String(queryKey[7])}`)
    expect(new Set(claves)).toEqual(new Set([`${FORO_A}:${a.id}`]))
  })
})

describe("ATQ-FORO-152 · el foco cuando la clase pasa a solo lectura con el foco en el panel", () => {
  it("ATQ-FORO-152: con el foco en «Calificar y devolver», archivar la clase quita el panel y el foco no cae en <body>", async () => {
    const hasFocus = vi.spyOn(document, "hasFocus").mockReturnValue(true)
    try {
      const a = alumno(1)
      estado.entregas[de(FORO_A, a.id)] = entregada({ version: 1 })
      const { queryClient } = await montar([participanteDe(a.id)])
      await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA)
      const boton = screen.getByRole("button", { name: "Calificar y devolver" })
      boton.focus()
      expect(boton).toHaveFocus()
      estado.archivada = true
      await act(() =>
        queryClient.invalidateQueries({ queryKey: claveClaseDetalle(CLASE), exact: true }),
      )
      await waitFor(
        () => expect(screen.queryByRole("button", { name: "Calificar y devolver" })).toBeNull(),
        ESPERA,
      )
      await reposar(300)
      expect(document.activeElement).not.toBe(document.body)
    } finally {
      hasFocus.mockRestore()
    }
  })

  it("ATQ-FORO-152: con el foco en «Ver más participaciones», una recarga que deja la lista en una página quita el botón y el foco no cae en <body>", async () => {
    const hasFocus = vi.spyOn(document, "hasFocus").mockReturnValue(true)
    try {
      const a = alumno(1)
      estado.entregas[de(FORO_A, a.id)] = entregada({ version: 1 })
      estado.escritos[de(FORO_A, a.id)] = Array.from({ length: 25 }, (_, i) => escrito(i + 1))
      const { queryClient } = await montar([participanteDe(a.id)])
      const bloque = await waitFor(() => bloqueDe("Sus participaciones"), ESPERA)
      const verMas = await within(bloque).findByRole(
        "button",
        { name: "Ver más participaciones" },
        ESPERA,
      )
      verMas.focus()
      estado.escritos[de(FORO_A, a.id)] = Array.from({ length: 5 }, (_, i) => escrito(i + 1))
      await act(() =>
        queryClient.invalidateQueries({
          queryKey: claveParticipacionesDeAlumno(CLASE, FORO_A, a.id),
          exact: true,
        }),
      )
      await waitFor(
        () =>
          expect(
            within(bloque).queryByRole("button", { name: "Ver más participaciones" }),
          ).toBeNull(),
        ESPERA,
      )
      await reposar(300)
      expect(document.activeElement).not.toBe(document.body)
    } finally {
      hasFocus.mockRestore()
    }
  })
})
