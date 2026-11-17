// FORO-01e (§D-8.5, §E13.4 a §E13.9): «Participantes» y la participación de un alumno, con el router
// real (`rutas`) y el QueryClient de app/providers.tsx. FORO-1E01 a FORO-1E04, FORO-1E42, FORO-1E44,
// FORO-1E46, FORO-1E47, FORO-1E50, FORO-1E52 y FORO-1E53. Reloj fijo (solo Date).
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { clavePrefijoDeCalificaciones } from "@/services/calificacionesService"
import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import {
  claveDevoluciones,
  claveListaDeParticipantes,
  claveParticipacionesDeAlumno,
  claveParticipante,
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
const API_ESCRITOS = (a: string, foro = FORO_A, clase = CLASE) =>
  `${API_PARTICIPANTE(a, foro, clase)}/participaciones`
const API_DEVOLUCIONES = (a: string, foro = FORO_A, clase = CLASE) =>
  `${API_PARTICIPANTE(a, foro, clase)}/devoluciones`
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

const enVuelo = () => {
  let soltar: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((resolver) => {
    soltar = resolver
  })
  return { promesa, soltar }
}

const pedidas = (metodo: string, ruta: string) =>
  estado.llamadas.filter((l) => l.metodo === metodo && l.url.pathname === ruta)
const lecturasNoCanonicas = () => estado.llamadas.filter((l) => /[A-F]/.test(l.url.pathname)).length
const participantes = (rol: Rol = "maestro", foro = FORO_A, clase = CLASE) =>
  `${BASES[rol](clase)}/foros/${foro}/participantes`
const participanteDe = (a: string, rol: Rol = "maestro", foro = FORO_A, clase = CLASE) =>
  `${participantes(rol, foro, clase)}/${a}`
const delForo = (rol: Rol = "estudiante", foro = FORO_A, clase = CLASE) =>
  `${BASES[rol](clase)}/foros/${foro}`
const filaDe = async (nombre: string) => {
  const celda = await screen.findByText(nombre, { selector: "td" }, ESPERA)
  const fila = celda.closest<HTMLElement>("tr")
  if (fila === null) throw new Error(`Precondición: «${nombre}» está en una fila`)
  return fila
}
const encabezadoDe = (nombre: string, level: number) =>
  screen.getByRole("heading", { name: nombre, level })
const bloqueDe = (titulo: string) => {
  const h = screen.getByRole("heading", { name: titulo })
  const bloque = h.closest("section")
  if (!(bloque instanceof HTMLElement)) throw new Error(`Precondición: «${titulo}» es un bloque`)
  return bloque
}
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

const veinticinco = () => Array.from({ length: 25 }, (_, i) => alumno(i + 1))

describe("FORO-1E01 · «Participantes»", () => {
  it("FORO-1E01: el conteo, la tabla con sus columnas y «Ver participación» con el nombre oculto, hacia la participación del alumno", async () => {
    estado.entregas[de(FORO_A, alumno(1).id)] = entregada()
    await montar([participantes()])
    expect(
      await screen.findByText("Participaron 1 de 2 alumnos.", undefined, ESPERA),
    ).toBeInTheDocument()
    expect(encabezadoDe("Participantes", 2)).toBeInTheDocument()
    for (const columna of ["Alumno", "Estado", "Participó", "Acciones"]) {
      expect(screen.getByRole("columnheader", { name: columna })).toBeInTheDocument()
    }
    const fila = await filaDe("Alumno 1")
    expect(within(fila).getByText("Entregado")).toBeInTheDocument()
    const enlace = within(fila).getByRole("link", { name: "Ver participación Alumno 1" })
    expect(enlace).toHaveAttribute("href", participanteDe(alumno(1).id))
    expect(screen.getByRole("link", { name: "Volver al foro" })).toHaveAttribute(
      "href",
      delForo("maestro"),
    )
    expect(document.body.textContent).not.toMatch(/estadoPago|Restringid|Deudor|correo/i)
  })

  it("FORO-1E01: con más de 20 alumnos, «Ver más alumnos» trae la página siguiente; con el cursor vencido, la frase y sin «Ver más alumnos»", async () => {
    estado.alumnos[CLASE] = veinticinco()
    await montar([participantes()])
    await filaDe("Alumno 20")
    fireEvent.click(screen.getByRole("button", { name: "Ver más alumnos" }))
    await filaDe("Alumno 25")
    expect(screen.queryByRole("button", { name: "Ver más alumnos" })).toBeNull()
    cleanup()
    estado.falla = ({ url }) =>
      url.pathname === API_PARTICIPANTES() && url.searchParams.has("cursor")
        ? errorApi(400, "VALIDACION", "cursor: no es válido")
        : undefined
    await montar([participantes()])
    await filaDe("Alumno 20")
    fireEvent.click(screen.getByRole("button", { name: "Ver más alumnos" }))
    expect(
      await screen.findByText(
        "La lista de alumnos cambió mientras la veías. Vuelve a abrir Participantes para verla completa.",
        undefined,
        ESPERA,
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Ver más alumnos" })).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

describe("FORO-1E02 · la participación de un alumno", () => {
  it("FORO-1E02: el maestro ve su nombre, su estado, lo que escribió (fecha, «Con retraso», «En respuesta a») y el panel; las devoluciones, en solo lectura", async () => {
    const a = alumno(1)
    estado.entregas[de(FORO_A, a.id)] = entregada({ conRetraso: true })
    estado.escritos[de(FORO_A, a.id)] = [
      escrito(1, { conRetraso: true }),
      escrito(2, { enRespuestaA: { participacionId: uuid("8a8b3c4d", 90), autor: alumno(2) } }),
    ]
    estado.devoluciones[de(FORO_A, a.id)] = [comentario(1)]
    await montar([participanteDe(a.id)])
    expect(
      await screen.findByRole("heading", { name: "Alumno 1", level: 2 }, ESPERA),
    ).toBeInTheDocument()
    expect(screen.getByText("Entregado con retraso")).toBeInTheDocument()
    expect(screen.getByText(/^Participó el /)).toBeInTheDocument()
    const escritos = bloqueDe("Sus participaciones")
    expect(await within(escritos).findByText("Escrito 1", undefined, ESPERA)).toBeInTheDocument()
    expect(within(escritos).getByText("Con retraso")).toBeInTheDocument()
    expect(within(escritos).getByText(/En respuesta a/)).toHaveTextContent(
      "En respuesta a Alumno 2",
    )
    expect(
      within(panel()).getByRole("button", { name: "Calificar y devolver" }),
    ).toBeInTheDocument()
    const devoluciones = bloqueDe("Comentarios de la devolución")
    expect(
      await within(devoluciones).findByText("Comentario 1", undefined, ESPERA),
    ).toBeInTheDocument()
    expect(within(devoluciones).queryByRole("textbox")).toBeNull()
    expect(screen.getByRole("link", { name: "Volver a los participantes" })).toHaveAttribute(
      "href",
      participantes(),
    )
  })

  it("FORO-1E02: el admin lee la calificación (o «Sin calificar todavía.»), sin formulario", async () => {
    estado.rol = "admin"
    const a = alumno(1)
    estado.entregas[de(FORO_A, a.id)] = entregada()
    await montar([participanteDe(a.id, "admin")])
    expect(await screen.findByText("Sin calificar todavía.", undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Calificar y devolver" })).toBeNull()
    cleanup()
    estado.entregas[de(FORO_A, a.id)] = entregada({
      estado: "calificado",
      calificacion: calificacion(8),
    })
    await montar([participanteDe(a.id, "admin")])
    expect(await screen.findByText("Calificación: 8 de 10", undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByRole("textbox")).toBeNull()
  })

  it("FORO-1E02: sin participar, «Todavía no participa.» y el panel dice cuándo se podrá calificar", async () => {
    await montar([participanteDe(alumno(2).id)])
    expect(await screen.findAllByText("Todavía no participa.", undefined, ESPERA)).toHaveLength(1)
    // DH-22: la lista vacía de «Sus participaciones» tiene su propio texto y no repite el de arriba.
    expect(
      await within(bloqueDe("Sus participaciones")).findByText(
        "Aún no hay participaciones de este alumno.",
        undefined,
        ESPERA,
      ),
    ).toBeInTheDocument()
    expect(
      await screen.findByText(
        "Podrás calificar cuando el alumno participe o cuando se cierre el foro.",
        undefined,
        ESPERA,
      ),
    ).toBeInTheDocument()
  })
})

const calificarConCampo = async (valor: string, comentarioEscrito = "") => {
  const campo = await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA)
  fireEvent.change(campo, { target: { value: valor } })
  if (comentarioEscrito !== "") {
    fireEvent.change(screen.getByLabelText(/^Comentario para el alumno/), {
      target: { value: comentarioEscrito },
    })
  }
  fireEvent.click(
    within(panel()).getByRole("button", {
      name: /^(Calificar y devolver|Actualizar calificación)$/,
    }),
  )
}

describe("DH-22 · los textos de la participación de un alumno", () => {
  it("DH-22: mientras carga, la participación de un alumno dice «Cargando la participación…»", async () => {
    const a = alumno(1)
    estado.entregas[de(FORO_A, a.id)] = entregada()
    const retenida = enVuelo()
    estado.falla = ({ url }) =>
      url.pathname === API_PARTICIPANTE(a.id) ? retenida.promesa : undefined
    await montar([participanteDe(a.id)])
    expect(
      await screen.findByText("Cargando la participación…", undefined, ESPERA),
    ).toBeInTheDocument()
    estado.falla = () => undefined
    retenida.soltar(respuestaJson(200, entregaJson(a, entregada())))
    expect(
      await screen.findByRole("heading", { name: "Alumno 1", level: 2 }, ESPERA),
    ).toBeInTheDocument()
  })
})

describe("FORO-1E03 · calificar una participación", () => {
  it("FORO-1E03: sin rúbrica, con comentario: avisa «Calificación publicada», manda la versión de apertura, escribe la participante y las devoluciones se vuelven a pedir", async () => {
    const a = alumno(1)
    estado.entregas[de(FORO_A, a.id)] = entregada({ version: 3 })
    const { queryClient } = await montar([participanteDe(a.id)])
    await calificarConCampo("8", "Buen trabajo.")
    await waitFor(
      () => expect(aviso.success).toHaveBeenCalledWith("Calificación publicada"),
      ESPERA,
    )
    const put = pedidas("PUT", API_CALIFICAR(a.id))
    expect(put).toHaveLength(1)
    expect(put[0]?.cuerpo).toMatchObject({
      version: 3,
      calificacion: 8,
      comentario: "Buen trabajo.",
    })
    expect(
      await within(bloqueDe("Comentarios de la devolución")).findByText(
        "Buen trabajo.",
        undefined,
        ESPERA,
      ),
    ).toBeInTheDocument()
    expect(queryClient.getQueryData(claveParticipante(CLASE, FORO_A, a.id))).toMatchObject({
      entrega: { version: 4, estado: "calificado" },
    })
    expect(await screen.findByText("Calificado", undefined, ESPERA)).toBeInTheDocument()
  })

  it("FORO-1E03: con rúbrica, los puntos de cada criterio; recalificar avisa «Calificación actualizada»", async () => {
    estado.foros[FORO_A] = {
      clase: CLASE,
      titulo: "Debate de la unidad",
      existe: true,
      conRubrica: true,
    }
    const a = alumno(1)
    estado.entregas[de(FORO_A, a.id)] = entregada({
      estado: "calificado",
      calificacion: calificacion(8, true),
      version: 2,
    })
    await montar([participanteDe(a.id)])
    const claridad = await screen.findByLabelText(/^Claridad/, undefined, ESPERA)
    fireEvent.change(claridad, { target: { value: "5" } })
    fireEvent.click(within(panel()).getByRole("button", { name: "Actualizar calificación" }))
    await waitFor(
      () => expect(aviso.success).toHaveBeenCalledWith("Calificación actualizada"),
      ESPERA,
    )
    expect(pedidas("PUT", API_CALIFICAR(a.id))[0]?.cuerpo).toMatchObject({
      version: 2,
      calificacion: null,
      puntajes: [
        { criterioId: CRITERIO_1, puntos: 5 },
        { criterioId: CRITERIO_2, puntos: 4 },
      ],
    })
  })
})

describe("FORO-1E04 · los 409 de calificar con los textos del foro", () => {
  it.each(["ENTREGA_MODIFICADA", "RUBRICA_MODIFICADA", "ENTREGA_NO_CALIFICABLE"])(
    "FORO-1E04: %s avisa con el texto del servidor, vuelve a pedir la participante (y el foro si depende de él) y reinicia el panel con el foco en «Calificación»",
    async (codigo) => {
      const a = alumno(1)
      estado.entregas[de(FORO_A, a.id)] = entregada({ version: 1 })
      let primera = true
      estado.falla = ({ metodo, url }) => {
        if (metodo !== "PUT" || url.pathname !== API_CALIFICAR(a.id) || !primera) return undefined
        primera = false
        estado.entregas[de(FORO_A, a.id)] = entregada({ version: 5 })
        return errorApi(409, codigo, "Otra versión del servidor.")
      }
      await montar([participanteDe(a.id)])
      await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA)
      await reposar()
      const foroAntes = pedidas("GET", API_FORO()).length
      const participanteAntes = pedidas("GET", API_PARTICIPANTE(a.id)).length
      await calificarConCampo("7")
      await waitFor(
        () => expect(aviso.error).toHaveBeenCalledWith("Otra versión del servidor."),
        ESPERA,
      )
      await waitFor(() => expect(encabezadoDe("Calificación", 3)).toHaveFocus(), ESPERA)
      expect(pedidas("GET", API_PARTICIPANTE(a.id))).toHaveLength(participanteAntes + 1)
      const conElForo = codigo !== "ENTREGA_MODIFICADA"
      expect(pedidas("GET", API_FORO())).toHaveLength(foroAntes + (conElForo ? 1 : 0))
      expect(screen.getByLabelText(/^Calificación \(/)).toHaveValue("")
      await calificarConCampo("7")
      await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
      expect(pedidas("PUT", API_CALIFICAR(a.id)).at(-1)?.cuerpo).toMatchObject({ version: 5 })
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
  )
})

describe("FORO-1E42 · borrar una principal deja viejos «Participantes» y la participación del alumno", () => {
  it("FORO-1E42: con las dos en caché y sin observador quedan con isInvalidated en true sin pedirlas; al volver antes de 30 s se piden y muestran lo nuevo", async () => {
    estado.rol = "admin"
    const a = alumno(1)
    estado.entregas[de(FORO_A, a.id)] = entregada()
    estado.escritos[de(FORO_A, a.id)] = [escrito(1)]
    const queryClient = cliente()
    const { router } = await montar([participanteDe(a.id, "admin")], queryClient)
    await screen.findByText("Escrito 1", undefined, ESPERA)
    await act(() => router.navigate(participantes("admin")))
    await filaDe("Alumno 1")
    await act(() => router.navigate(`${BASES.admin()}/foro`))
    await reposar()
    const antes = estado.llamadas.length
    estado.escritos[de(FORO_A, a.id)] = []
    estado.entregas[de(FORO_A, a.id)] = { ...entregada(), fechaEntrega: "2030-01-08T15:30:00.000Z" }
    const { useBorrarParticipacion } = await import("./hooks")
    const { result } = renderHook(() => useBorrarParticipacion(CLASE, FORO_A), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    })
    await act(async () => {
      await result.current.mutateAsync({ participacionId: escrito(1).id, principalId: null })
    })
    await reposar()
    for (const clave of [
      claveListaDeParticipantes(CLASE, FORO_A),
      claveParticipante(CLASE, FORO_A, a.id),
      claveParticipacionesDeAlumno(CLASE, FORO_A, a.id),
    ]) {
      expect(queryClient.getQueryState(clave)?.isInvalidated).toBe(true)
    }
    const nuevas = estado.llamadas.slice(antes).filter((l) => l.metodo === "GET")
    expect(nuevas.filter((l) => l.url.pathname.includes("/participantes"))).toHaveLength(0)
    await act(() => router.navigate(participanteDe(a.id, "admin")))
    await waitFor(
      () => expect(pedidas("GET", API_ESCRITOS(a.id)).length).toBeGreaterThan(1),
      ESPERA,
    )
    expect(
      await within(bloqueDe("Sus participaciones")).findByText(
        "Aún no hay participaciones de este alumno.",
        undefined,
        ESPERA,
      ),
    ).toBeInTheDocument()
  })
})

describe("FORO-1E44 · agregar o quitar un alumno (DH-21 a)", () => {
  it.each(["agregar", "quitar"] as const)(
    "FORO-1E44: al %s un alumno quedan viejos «Participantes», las entregas de una tarea y el prefijo de calificaciones, sin pedirlos; al volver se piden y el conteo es el nuevo",
    async (accion) => {
      const queryClient = cliente()
      const { router } = await montar([participantes()], queryClient)
      expect(
        await screen.findByText("Participaron 0 de 2 alumnos.", undefined, ESPERA),
      ).toBeInTheDocument()
      await act(() => router.navigate(`${BASES.maestro()}/foro`))
      await reposar()
      const entregasDeTarea = ["clases", CLASE, "tareas", uuid("5c5b3c4d", 1), "entregas", "lista"]
      queryClient.setQueryData(entregasDeTarea, { pages: [], pageParams: [] })
      queryClient.setQueryData([...clavePrefijoDeCalificaciones(CLASE), "gradebook"], {})
      const antes = pedidas("GET", API_PARTICIPANTES()).length
      if (accion === "agregar") estado.alumnos[CLASE] = [alumno(1), alumno(2), alumno(3)]
      else estado.alumnos[CLASE] = [alumno(1)]
      const { useAgregarAlumno, useQuitarAlumno } = await import("@/features/clases/hooks")
      estado.falla = ({ metodo, url }) => {
        if (url.pathname === `${API()}/alumnos` && metodo === "POST") {
          return respuestaJson(201, {
            alumno: { ...alumno(3), email: "a3@ejemplo.mx" },
            yaEstaba: false,
          })
        }
        if (url.pathname.startsWith(`${API()}/alumnos/`) && metodo === "DELETE") {
          return new Response(null, { status: 204 })
        }
        if (url.pathname.startsWith(`${API()}/alumnos`) || url.pathname.includes("/candidatos")) {
          return respuestaJson(200, { alumnos: [], total: 0, siguienteCursor: null })
        }
        return undefined
      }
      const envoltura = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
      if (accion === "agregar") {
        const { result } = renderHook(() => useAgregarAlumno(CLASE), { wrapper: envoltura })
        await act(async () => {
          await result.current.mutateAsync(alumno(3).id).catch(() => undefined)
        })
      } else {
        const { result } = renderHook(() => useQuitarAlumno(CLASE), { wrapper: envoltura })
        await act(async () => {
          await result.current
            .mutateAsync({ id: alumno(2).id, nombre: alumno(2).nombre })
            .catch(() => undefined)
        })
      }
      await reposar()
      for (const clave of [
        claveListaDeParticipantes(CLASE, FORO_A),
        entregasDeTarea,
        [...clavePrefijoDeCalificaciones(CLASE), "gradebook"],
      ]) {
        expect(queryClient.getQueryState(clave)?.isInvalidated).toBe(true)
      }
      expect(pedidas("GET", API_PARTICIPANTES())).toHaveLength(antes)
      estado.falla = () => undefined
      await act(() => router.navigate(participantes()))
      const conteo =
        accion === "agregar" ? "Participaron 0 de 3 alumnos." : "Participaron 0 de 1 alumno."
      expect(await screen.findByText(conteo, undefined, ESPERA)).toBeInTheDocument()
    },
  )
})

describe("FORO-1E46 · los ids de la URL en mayúsculas", () => {
  it("FORO-1E46: «Participantes» y la participación de un alumno piden en minúsculas, y calificar escribe en la clave que la vista lee: el panel nace con la respuesta sin otra lectura", async () => {
    const a = alumno(1)
    estado.entregas[de(FORO_A, a.id)] = entregada({ version: 1 })
    const { router } = await montar([participantes("maestro", FORO_A.toUpperCase())])
    await filaDe("Alumno 1")
    expect(lecturasNoCanonicas()).toBe(0)
    const enlace = screen.getAllByRole("link", { name: /^Ver participación/ })[0]
    expect(enlace).toHaveAttribute("href", participanteDe(a.id))
    await act(() =>
      router.navigate(participanteDe(a.id.toUpperCase(), "maestro", FORO_A.toUpperCase())),
    )
    await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA)
    await reposar()
    expect(lecturasNoCanonicas()).toBe(0)
    const lecturas = pedidas("GET", API_PARTICIPANTE(a.id)).length
    await calificarConCampo("9")
    await waitFor(
      () => expect(aviso.success).toHaveBeenCalledWith("Calificación publicada"),
      ESPERA,
    )
    expect(
      await screen.findByRole("button", { name: "Actualizar calificación" }, ESPERA),
    ).toBeInTheDocument()
    await reposar()
    expect(pedidas("GET", API_PARTICIPANTE(a.id))).toHaveLength(lecturas)
    expect(lecturasNoCanonicas()).toBe(0)
  })
})

describe("FORO-1E47 · el foco cuando desaparece un control (§E13.6)", () => {
  it("FORO-1E47: una recarga de «Participantes» que quita la fila con el foco en «Ver participación» lo lleva al h2", async () => {
    const { queryClient } = await montar([participantes()])
    const fila = await filaDe("Alumno 2")
    within(fila).getByRole("link").focus()
    estado.alumnos[CLASE] = [alumno(1)]
    await act(() =>
      queryClient.invalidateQueries({ queryKey: claveListaDeParticipantes(CLASE, FORO_A) }),
    )
    await waitFor(() => expect(screen.queryByText("Alumno 2")).toBeNull(), ESPERA)
    await waitFor(() => expect(encabezadoDe("Participantes", 2)).toHaveFocus(), ESPERA)
  })

  it("FORO-1E47: «Ver más alumnos» al cargar lo último lleva el foco a la primera fila nueva", async () => {
    estado.alumnos[CLASE] = veinticinco()
    await montar([participantes()])
    await filaDe("Alumno 20")
    const verMas = screen.getByRole("button", { name: "Ver más alumnos" })
    verMas.focus()
    fireEvent.click(verMas)
    const nueva = await filaDe("Alumno 21")
    await waitFor(() => expect(within(nueva).getByRole("link")).toHaveFocus(), ESPERA)
  })

  it("FORO-1E47: una recarga de lo que escribió el alumno que quita la fila enfocada lleva el foco al h3 «Sus participaciones»", async () => {
    const a = alumno(1)
    estado.entregas[de(FORO_A, a.id)] = entregada()
    estado.escritos[de(FORO_A, a.id)] = [escrito(1), escrito(2)]
    const { queryClient } = await montar([participanteDe(a.id)])
    const fila = await screen.findByText("Escrito 2", undefined, ESPERA)
    const li = fila.closest("li")
    if (!(li instanceof HTMLElement)) throw new Error("Precondición: la fila es un li")
    li.focus()
    estado.escritos[de(FORO_A, a.id)] = [escrito(1)]
    await act(() =>
      queryClient.invalidateQueries({
        queryKey: claveParticipacionesDeAlumno(CLASE, FORO_A, a.id),
      }),
    )
    await waitFor(() => expect(screen.queryByText("Escrito 2")).toBeNull(), ESPERA)
    await waitFor(() => expect(encabezadoDe("Sus participaciones", 3)).toHaveFocus(), ESPERA)
  })

  it("FORO-1E47: una recarga de las devoluciones que quita el comentario enfocado lleva el foco al h3 «Comentarios de la devolución»", async () => {
    const a = alumno(1)
    estado.entregas[de(FORO_A, a.id)] = entregada()
    estado.devoluciones[de(FORO_A, a.id)] = [comentario(1), comentario(2)]
    const { queryClient } = await montar([participanteDe(a.id)])
    const texto = await screen.findByText("Comentario 2", undefined, ESPERA)
    const li = texto.closest("li")
    if (!(li instanceof HTMLElement)) throw new Error("Precondición: la fila es un li")
    li.focus()
    estado.devoluciones[de(FORO_A, a.id)] = [comentario(1)]
    await act(() =>
      queryClient.invalidateQueries({ queryKey: claveDevoluciones(CLASE, FORO_A, a.id) }),
    )
    await waitFor(() => expect(screen.queryByText("Comentario 2")).toBeNull(), ESPERA)
    await waitFor(
      () => expect(encabezadoDe("Comentarios de la devolución", 3)).toHaveFocus(),
      ESPERA,
    )
  })

  it("FORO-1E47: la clase que pasa a solo lectura con el foco en el panel lo lleva al título de la clase (el h1, §7.32), nunca a <body>", async () => {
    const a = alumno(1)
    estado.entregas[de(FORO_A, a.id)] = entregada()
    estado.falla = ({ metodo }) => {
      if (metodo !== "PUT") return undefined
      estado.archivada = true
      return errorApi(409, "CLASE_ARCHIVADA", "La clase está archivada.")
    }
    await montar([participanteDe(a.id)])
    const campo = await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA)
    fireEvent.change(campo, { target: { value: "7" } })
    fireEvent.click(within(panel()).getByRole("button", { name: "Calificar y devolver" }))
    campo.focus()
    await waitFor(() => expect(screen.queryByLabelText(/^Calificación \(/)).toBeNull(), ESPERA)
    // D-5: el foco sigue §7.32, el h1 de la clase.
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveFocus(), ESPERA)
    expect(aviso.error).toHaveBeenCalledWith("La clase está archivada.")
    expect(screen.getByText("Sin calificar todavía.")).toBeInTheDocument()
  })

  it("FORO-1E47: un 404 ALUMNO_NO_ENCONTRADO al recargar la participante reemplaza la vista y lleva el foco a la raíz", async () => {
    const a = alumno(2)
    const { queryClient } = await montar([participanteDe(a.id)])
    const volver = await screen.findByRole("link", { name: "Volver a los participantes" }, ESPERA)
    volver.focus()
    estado.alumnos[CLASE] = [alumno(1)]
    await act(() =>
      queryClient.invalidateQueries({
        queryKey: claveParticipante(CLASE, FORO_A, a.id),
        exact: true,
      }),
    )
    expect(
      await screen.findByText("No encontramos a ese alumno en esta clase.", undefined, ESPERA),
    ).toBeInTheDocument()
    await waitFor(() => {
      const activo = document.activeElement
      expect(activo).toHaveAttribute("tabindex", "-1")
      expect(activo?.tagName).toBe("DIV")
    }, ESPERA)
  })
})

describe("FORO-1E50 · guardas de doble clic", () => {
  it("FORO-1E50: dos clics en el mismo render de «Calificar y devolver» mandan un solo PUT", async () => {
    const a = alumno(1)
    estado.entregas[de(FORO_A, a.id)] = entregada()
    const pendiente = enVuelo()
    estado.falla = ({ metodo }) => (metodo === "PUT" ? pendiente.promesa : undefined)
    await montar([participanteDe(a.id)])
    const campo = await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA)
    fireEvent.change(campo, { target: { value: "7" } })
    const boton = within(panel()).getByRole("button", { name: "Calificar y devolver" })
    act(() => {
      fireEvent.click(boton)
      fireEvent.click(boton)
    })
    await reposar()
    expect(pedidas("PUT", API_CALIFICAR(a.id))).toHaveLength(1)
    pendiente.soltar(errorApi(500, "ERROR_INTERNO"))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
  })

  it.each([
    ["Ver más alumnos", "participantes"],
    ["Ver más participaciones", "escritos"],
    ["Ver más comentarios", "devoluciones"],
  ] as const)(
    "FORO-1E50: dos clics en el mismo render de «%s» piden una sola página",
    async (boton, lista) => {
      const a = alumno(1)
      estado.entregas[de(FORO_A, a.id)] = entregada()
      if (lista === "participantes") estado.alumnos[CLASE] = veinticinco()
      if (lista === "escritos") {
        estado.escritos[de(FORO_A, a.id)] = Array.from({ length: 25 }, (_, i) => escrito(i + 1))
      }
      if (lista === "devoluciones") {
        estado.devoluciones[de(FORO_A, a.id)] = Array.from({ length: 25 }, (_, i) =>
          comentario(i + 1),
        )
      }
      await montar([lista === "participantes" ? participantes() : participanteDe(a.id)])
      const control = await screen.findByRole("button", { name: boton }, ESPERA)
      const ruta =
        lista === "participantes"
          ? API_PARTICIPANTES()
          : lista === "escritos"
            ? API_ESCRITOS(a.id)
            : API_DEVOLUCIONES(a.id)
      act(() => {
        fireEvent.click(control)
        fireEvent.click(control)
      })
      await waitFor(() => expect(screen.queryByRole("button", { name: boton })).toBeNull(), ESPERA)
      expect(pedidas("GET", ruta).filter(({ url }) => url.searchParams.has("cursor"))).toHaveLength(
        1,
      )
    },
  )
})

describe("FORO-1E52 · lo abierto es del id de la ruta", () => {
  it.each([
    ["el mismo alumno en otro foro", () => participanteDe(alumno(1).id, "maestro", FORO_B)],
    ["otro alumno del mismo foro", () => participanteDe(alumno(2).id)],
    [
      "el mismo alumno en un foro de otra clase",
      () => participanteDe(alumno(1).id, "maestro", FORO_C, CLASE_B),
    ],
  ])(
    "FORO-1E52: con el panel a medio llenar, saltar con el historial a %s y volver: lo escrito no se conserva ni se envía",
    async (_nombre, otra) => {
      const a = alumno(1)
      estado.entregas[de(FORO_A, a.id)] = entregada()
      estado.entregas[de(FORO_B, a.id)] = entregada()
      estado.entregas[de(FORO_A, alumno(2).id)] = entregada()
      estado.entregas[de(FORO_C, a.id)] = entregada()
      // La otra participación ya se vio (está en la caché): al volver a ella no hay carga que desmonte.
      const { router } = await montar([otra()])
      await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA)
      await reposar()
      await act(() => router.navigate(participanteDe(a.id)))
      await waitFor(() =>
        expect(screen.getByRole("heading", { level: 2, name: "Alumno 1" })).toBeInTheDocument(),
      )
      await reposar()
      const campo = await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA)
      fireEvent.change(campo, { target: { value: "9" } })
      await act(() => router.navigate(-1))
      const otroCampo = await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA)
      expect(otroCampo).toHaveValue("")
      await act(() => router.navigate(1))
      expect(await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA)).toHaveValue("")
      expect(estado.llamadas.filter(({ metodo }) => metodo === "PUT")).toHaveLength(0)
    },
  )
})

describe("FORO-1E53 · nada avisa ante un código con que apiClient redirige", () => {
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

  it.each(CODIGOS)("FORO-1E53: calificar con %s no avisa", async (nombre, destino) => {
    const a = alumno(1)
    estado.entregas[de(FORO_A, a.id)] = entregada()
    await montar([participanteDe(a.id)])
    const campo = await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA)
    if (nombre === "401 sin refresco") estado.refrescoFalla = true
    estado.falla = ({ metodo }) => (metodo === "PUT" ? respuesta(nombre) : undefined)
    fireEvent.change(campo, { target: { value: "7" } })
    fireEvent.click(within(panel()).getByRole("button", { name: "Calificar y devolver" }))
    await waitFor(() => expect(irA).toHaveBeenCalledWith(destino), ESPERA)
    await reposar(300)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it.each(CODIGOS)(
    "FORO-1E53: «Ver más alumnos» y las recargas de la participante, lo que escribió y las devoluciones con %s no avisan",
    async (nombre, destino) => {
      const a = alumno(1)
      estado.entregas[de(FORO_A, a.id)] = entregada()
      estado.alumnos[CLASE] = veinticinco()
      const { queryClient, router } = await montar([participantes()])
      await filaDe("Alumno 20")
      if (nombre === "401 sin refresco") estado.refrescoFalla = true
      estado.falla = ({ url }) =>
        url.pathname.startsWith(API_PARTICIPANTES()) && url.searchParams.has("cursor")
          ? respuesta(nombre)
          : undefined
      fireEvent.click(screen.getByRole("button", { name: "Ver más alumnos" }))
      await waitFor(() => expect(irA).toHaveBeenCalledWith(destino), ESPERA)
      estado.falla = () => undefined
      estado.refrescoFalla = false
      await act(() => router.navigate(participanteDe(a.id)))
      await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA)
      if (nombre === "401 sin refresco") estado.refrescoFalla = true
      estado.falla = ({ url }) =>
        url.pathname.startsWith(API_PARTICIPANTE(a.id)) ? respuesta(nombre) : undefined
      await act(() =>
        queryClient.invalidateQueries({ queryKey: claveParticipante(CLASE, FORO_A, a.id) }),
      )
      await reposar(500)
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )
})
