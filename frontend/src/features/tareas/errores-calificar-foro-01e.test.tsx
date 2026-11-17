// FORO-01e (§E13.8): VALIDACION fuera de contrato en el panel de calificar un foro (FORO-1E05 a
// FORO-1E09) y las formas literales de las claves de 01e (FORO-1E45), con el router real y el QueryClient
// de app/providers.tsx. En cada caso, un solo mensaje legible, lo escrito se conserva y el botón sale de la
// espera. Reloj fijo (solo Date).
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { ENTRADAS_FUERA_DE_CONTRATO } from "@/lib/errores-de-api-fuera-de-contrato"

import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import { claveListaDeForos } from "@/services/trabajoService"

import {
  claveDevoluciones,
  claveListaDeParticipantes,
  claveMiParticipacion,
  claveMisDevoluciones,
  claveParticipaciones,
  claveParticipacionesDeAlumno,
  claveParticipante,
  clavePrefijoDeParticipantes,
  claveReplicas,
} from "./lib"

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
const API_CALIFICAR = (a: string, foro = FORO_A, clase = CLASE) =>
  `${API_PARTICIPANTE(a, foro, clase)}/calificacion`
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
const panel = () => {
  const h = screen.getByRole("heading", { name: "Calificación", level: 3 })
  const tarjeta = h.closest("[data-slot='card']") ?? h.parentElement
  if (!(tarjeta instanceof HTMLElement)) throw new Error("Precondición: el panel tiene tarjeta")
  return tarjeta
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

const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const validacion = (mensaje: string) => errorApi(400, "VALIDACION", mensaje)
const marcados = () => document.querySelectorAll("[aria-invalid='true']")

// El panel de un foro abierto para el alumno 1 (entregó), con rúbrica o sin ella, con lo escrito.
const abrirElPanel = async (conRubrica: boolean) => {
  estado.foros[FORO_A] = { clase: CLASE, titulo: "Debate de la unidad", existe: true, conRubrica }
  estado.entregas[de(FORO_A, alumno(1).id)] = entregada()
  await montar([participanteDe(alumno(1).id)])
  if (conRubrica) {
    fireEvent.change(await screen.findByLabelText(/^Claridad/, undefined, ESPERA), {
      target: { value: "4" },
    })
    fireEvent.change(screen.getByLabelText(/^Argumentos/), { target: { value: "3" } })
  } else {
    fireEvent.change(await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA), {
      target: { value: "8" },
    })
  }
  fireEvent.change(screen.getByLabelText(/^Comentario para el alumno/), {
    target: { value: "Lo que escribí." },
  })
}

const enviarCon = async (respuesta: () => Response, avisos: number) => {
  estado.falla = ({ metodo }) => (metodo === "PUT" ? respuesta() : undefined)
  fireEvent.click(within(panel()).getByRole("button", { name: "Calificar y devolver" }))
  await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(avisos), ESPERA)
  await waitFor(() =>
    expect(
      within(panel()).getByRole("button", { name: "Calificar y devolver" }),
    ).not.toHaveAttribute("aria-busy", "true"),
  )
}

const loEscritoSigue = () =>
  expect(screen.getByLabelText(/^Comentario para el alumno/)).toHaveValue("Lo que escribí.")

describe("FORO-1E05 a FORO-1E09 · VALIDACION fuera de contrato en el panel de un foro", () => {
  it.each([
    [
      "foroId (sin rúbrica)",
      false,
      "foroId: debe ser un identificador válido",
      "Ese foro ya no existe.",
    ],
    [
      "puntajes en un foro sin rúbrica",
      false,
      "puntajes.0.puntos: Escribe de 0 a 5 puntos.",
      "Escribe de 0 a 5 puntos.",
    ],
    [
      "calificacion en un foro con rúbrica",
      true,
      "calificacion: Escribe de 0 a 10 puntos.",
      "Escribe de 0 a 10 puntos.",
    ],
  ] as const)(
    "FORO-1E05: un VALIDACION de %s (un campo que el panel no pinta en este modo) da un solo aviso legible y ningún ErrorDeCampo",
    async (_nombre, conRubrica, mensaje, esperado) => {
      await abrirElPanel(conRubrica)
      await enviarCon(() => validacion(mensaje), 1)
      expect(aviso.error).toHaveBeenCalledWith(esperado)
      expect(marcados()).toHaveLength(0)
      loEscritoSigue()
    },
  )

  it.each(["", "   "])(
    "FORO-1E06: un VALIDACION con el mensaje «%s» da un solo aviso con el genérico",
    async (mensaje) => {
      await abrirElPanel(false)
      await enviarCon(() => validacion(mensaje), 1)
      expect(aviso.error).toHaveBeenCalledWith(GENERICO)
      expect(marcados()).toHaveLength(0)
      loEscritoSigue()
    },
  )

  it("FORO-1E07: con prefijo de ruta «puntajes.1.puntos:», el ErrorDeCampo va bajo el criterio 2, sin la ruta y sin aviso", async () => {
    await abrirElPanel(true)
    estado.falla = ({ metodo }) =>
      metodo === "PUT" ? validacion("puntajes.1.puntos: Escribe de 0 a 5 puntos.") : undefined
    fireEvent.click(within(panel()).getByRole("button", { name: "Calificar y devolver" }))
    const argumentos = screen.getByLabelText(/^Argumentos/)
    await waitFor(() => expect(argumentos).toHaveAttribute("aria-invalid", "true"), ESPERA)
    expect(screen.getByText("Escribe de 0 a 5 puntos.")).toBeInTheDocument()
    expect(document.body.textContent).not.toContain("puntajes.1.puntos")
    expect(screen.getByLabelText(/^Claridad/)).not.toHaveAttribute("aria-invalid", "true")
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
    loEscritoSigue()
  })

  it("FORO-1E08: tras el ErrorDeCampo de «calificacion:» del servidor, un envío que la validación local rechaza muestra solo «Escribe la calificación.» y no pide nada", async () => {
    await abrirElPanel(false)
    estado.falla = ({ metodo }) =>
      metodo === "PUT" ? validacion("calificacion: Escribe de 0 a 10 puntos.") : undefined
    fireEvent.click(within(panel()).getByRole("button", { name: "Calificar y devolver" }))
    expect(
      await screen.findByText("Escribe de 0 a 10 puntos.", undefined, ESPERA),
    ).toBeInTheDocument()
    const puts = pedidas("PUT", API_CALIFICAR(alumno(1).id)).length
    fireEvent.change(screen.getByLabelText(/^Calificación \(/), { target: { value: "" } })
    fireEvent.click(within(panel()).getByRole("button", { name: "Calificar y devolver" }))
    expect(
      await screen.findByText("Escribe la calificación.", undefined, ESPERA),
    ).toBeInTheDocument()
    expect(screen.queryByText("Escribe de 0 a 10 puntos.")).toBeNull()
    await reposar()
    expect(pedidas("PUT", API_CALIFICAR(alumno(1).id))).toHaveLength(puts)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("FORO-1E09: cada entrada de ENTRADAS_FUERA_DE_CONTRATO da un solo aviso (mensajeDeErrorForo; los campos, erroresDeCalificacionDeApi, la de la tarea), con el resto sin la ruta o el genérico, ningún ErrorDeCampo, y lo escrito se conserva", async () => {
    await abrirElPanel(false)
    let avisos = 0
    for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
      avisos += 1
      await enviarCon(() => validacion(entrada.mensaje), avisos)
      expect(aviso.error).toHaveBeenLastCalledWith(entrada.resto ?? GENERICO)
      expect(marcados()).toHaveLength(0)
    }
    loEscritoSigue()
  }, 60_000)
})

describe("FORO-1E45 · las claves de 01e con su forma literal (§E13.5)", () => {
  it("FORO-1E45: cuelgan de claveForo con sus segmentos fijos", () => {
    expect(claveListaDeParticipantes(CLASE, FORO_A)).toEqual([
      "clases",
      CLASE,
      "foros",
      "foro",
      FORO_A,
      "participantes",
      "lista",
    ])
    expect(claveParticipante(CLASE, FORO_A, ALUMNA.id)).toEqual([
      "clases",
      CLASE,
      "foros",
      "foro",
      FORO_A,
      "participantes",
      "alumno",
      ALUMNA.id,
    ])
    expect(claveParticipacionesDeAlumno(CLASE, FORO_A, ALUMNA.id)).toEqual([
      ...claveParticipante(CLASE, FORO_A, ALUMNA.id),
      "participaciones",
    ])
    expect(claveDevoluciones(CLASE, FORO_A, ALUMNA.id)).toEqual([
      ...claveParticipante(CLASE, FORO_A, ALUMNA.id),
      "devoluciones",
    ])
    expect(claveMisDevoluciones(CLASE, FORO_A)).toEqual([
      "clases",
      CLASE,
      "foros",
      "foro",
      FORO_A,
      "mia",
      "devoluciones",
    ])
    expect(clavePrefijoDeParticipantes(CLASE, FORO_A)).toEqual([
      "clases",
      CLASE,
      "foros",
      "foro",
      FORO_A,
      "participantes",
    ])
  })

  const esPrefijo = (corta: readonly unknown[], larga: readonly unknown[]) =>
    corta.length <= larga.length && corta.every((parte, i) => parte === larga[i])

  it.each(["lista", "alumno", "participaciones", "devoluciones", "mia", "foro"])(
    "FORO-1E45: con alumnoId «%s» ninguna clave coincide con otra del foro ni es prefijo de una que no sea suya",
    (alumnoId) => {
      const suyas = [
        claveParticipante(CLASE, FORO_A, alumnoId),
        claveParticipacionesDeAlumno(CLASE, FORO_A, alumnoId),
        claveDevoluciones(CLASE, FORO_A, alumnoId),
      ]
      const ajenas = [
        claveListaDeParticipantes(CLASE, FORO_A),
        claveMisDevoluciones(CLASE, FORO_A),
        claveMiParticipacion(CLASE, FORO_A),
        claveParticipaciones(CLASE, FORO_A),
        claveReplicas(CLASE, FORO_A, alumnoId),
        claveListaDeForos(CLASE),
        claveParticipante(CLASE, FORO_A, "otro"),
      ]
      for (const suya of suyas) {
        for (const ajena of ajenas) {
          expect(esPrefijo(suya, ajena)).toBe(false)
          expect(esPrefijo(ajena, suya)).toBe(false)
        }
      }
      expect(esPrefijo(claveParticipante(CLASE, FORO_A, alumnoId), suyas[1] ?? [])).toBe(true)
    },
  )
})
