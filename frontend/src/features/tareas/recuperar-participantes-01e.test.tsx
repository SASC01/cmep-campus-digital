// FORO-01e (§E13.8 y §E13.9): las frases de recuperación de «Participantes», de la participación de un
// alumno y de «Comentarios de tu maestro», un caso por camino (FORO-1E20 a FORO-1E35 y FORO-1E54), los
// avisos de recarga (FORO-1E49), la primera carga y la regla de R-01e-14 en cada bloque (FORO-1E48), el
// «Ver más» que falla (FORO-1E51) y la recarga tras un 409 que falla (FORO-1E55), con el router real y el
// QueryClient de app/providers.tsx. Reloj fijo (solo Date).
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import { claveForo } from "@/services/trabajoService"

import {
  claveDevoluciones,
  claveListaDeParticipantes,
  claveMisDevoluciones,
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
const API_MIA = (foro = FORO_A, clase = CLASE) => `${API_FORO(foro, clase)}/mi-participacion`
const API_MIS_DEVOLUCIONES = (foro = FORO_A, clase = CLASE) =>
  `${API_MIA(foro, clase)}/devoluciones`

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
const muchos = <T,>(hacer: (n: number) => T) => Array.from({ length: 25 }, (_, i) => hacer(i + 1))
const conCursorVencido = (ruta: string) => (llamada: Llamada) =>
  llamada.url.pathname === ruta && llamada.url.searchParams.has("cursor")
    ? errorApi(400, "VALIDACION", "cursor: no es válido")
    : undefined
const primeras = (ruta: string) =>
  pedidas("GET", ruta).filter(({ url }) => !url.searchParams.has("cursor")).length
const GENERICO = "Algo salió mal. Inténtalo de nuevo."

const FRASE_PARTICIPANTES =
  "La lista de alumnos cambió mientras la veías. Vuelve a abrir Participantes para verla completa."
const FRASE_ESCRITOS =
  "Las participaciones de este alumno cambiaron mientras las veías. Vuelve a abrir su participación para verlas completas."
const FRASE_DEVOLUCIONES =
  "Los comentarios de la devolución cambiaron mientras los veías. Vuelve a abrir su participación para verlos completos."
const FRASE_DE_TU_MAESTRO =
  "Los comentarios de tu maestro cambiaron mientras los veías. Vuelve a abrir el foro para verlos completos."

// «Participantes» con la frase del cursor a la vista (y sin «Ver más alumnos»).
const conLaFraseDeParticipantes = async (entradas: string[]) => {
  estado.alumnos[CLASE] = veinticinco()
  estado.falla = conCursorVencido(API_PARTICIPANTES())
  const montado = await montar(entradas)
  await filaDe("Alumno 20")
  fireEvent.click(screen.getByRole("button", { name: "Ver más alumnos" }))
  expect(await screen.findByText(FRASE_PARTICIPANTES, undefined, ESPERA)).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Ver más alumnos" })).toBeNull()
  estado.falla = () => undefined
  return { ...montado, antes: primeras(API_PARTICIPANTES()) }
}

const laFraseSeFue = async (frase: string, ruta: string, antes: number, boton: string) => {
  await waitFor(() => expect(primeras(ruta)).toBeGreaterThan(antes), ESPERA)
  await waitFor(() => expect(screen.queryByText(frase)).toBeNull(), ESPERA)
  expect(await screen.findByRole("button", { name: boton }, ESPERA)).toBeInTheDocument()
}

describe("FORO-1E20 a FORO-1E22 y FORO-1E54 · «La lista de alumnos cambió… Vuelve a abrir Participantes…», por cada camino", () => {
  it("FORO-1E20: «Ver participantes» desde el foro pide la primera página y la frase desaparece", async () => {
    const { router, antes } = await conLaFraseDeParticipantes([participantes()])
    await act(() => router.navigate(delForo("maestro")))
    fireEvent.click(await screen.findByRole("link", { name: "Ver participantes" }, ESPERA))
    await laFraseSeFue(FRASE_PARTICIPANTES, API_PARTICIPANTES(), antes, "Ver más alumnos")
  })

  it("FORO-1E21: atrás y adelante del historial piden la primera página y la frase desaparece", async () => {
    const { router, antes } = await conLaFraseDeParticipantes([delForo("maestro"), participantes()])
    await act(() => router.navigate(-1))
    await screen.findByRole("link", { name: "Ver participantes" }, ESPERA)
    await act(() => router.navigate(1))
    await laFraseSeFue(FRASE_PARTICIPANTES, API_PARTICIPANTES(), antes, "Ver más alumnos")
  })

  it("FORO-1E22: ir a «Foro» y volver antes de 30 s pide la primera página y la frase desaparece", async () => {
    const { router, antes } = await conLaFraseDeParticipantes([participantes()])
    await act(() => router.navigate(`${BASES.maestro()}/foro`))
    await reposar()
    await act(() => router.navigate(participantes()))
    await laFraseSeFue(FRASE_PARTICIPANTES, API_PARTICIPANTES(), antes, "Ver más alumnos")
  })

  it("FORO-1E54: «Ver participantes» de otro foro y de vuelta: la lista del primero se pide de nuevo y la frase desaparece", async () => {
    const { router, antes } = await conLaFraseDeParticipantes([participantes()])
    await act(() => router.navigate(delForo("maestro", FORO_B)))
    fireEvent.click(await screen.findByRole("link", { name: "Ver participantes" }, ESPERA))
    expect(await screen.findByText("Segundo debate", undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText(FRASE_PARTICIPANTES)).toBeNull()
    await act(() => router.navigate(delForo("maestro")))
    fireEvent.click(await screen.findByRole("link", { name: "Ver participantes" }, ESPERA))
    await laFraseSeFue(FRASE_PARTICIPANTES, API_PARTICIPANTES(), antes, "Ver más alumnos")
  })
})

// La participación del alumno 1 con la frase de su lista a la vista.
const conLaFraseDeLaParticipacion = async (
  entradas: string[],
  lista: "escritos" | "devoluciones",
) => {
  const a = alumno(1)
  estado.entregas[de(FORO_A, a.id)] = entregada()
  const ruta = lista === "escritos" ? API_ESCRITOS(a.id) : API_DEVOLUCIONES(a.id)
  if (lista === "escritos") estado.escritos[de(FORO_A, a.id)] = muchos(escrito)
  else estado.devoluciones[de(FORO_A, a.id)] = muchos(comentario)
  estado.falla = conCursorVencido(ruta)
  const montado = await montar(entradas)
  const boton = lista === "escritos" ? "Ver más participaciones" : "Ver más comentarios"
  fireEvent.click(await screen.findByRole("button", { name: boton }, ESPERA))
  const frase = lista === "escritos" ? FRASE_ESCRITOS : FRASE_DEVOLUCIONES
  expect(await screen.findByText(frase, undefined, ESPERA)).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: boton })).toBeNull()
  estado.falla = () => undefined
  return { ...montado, antes: primeras(ruta), ruta, frase, boton }
}

describe("FORO-1E23 a FORO-1E25 y FORO-1E30 a FORO-1E32 · las frases de la participación de un alumno, por cada camino", () => {
  it.each(["escritos", "devoluciones"] as const)(
    "FORO-1E23 y FORO-1E30 (%s): «Ver participación» desde «Participantes» pide la primera página y la frase desaparece",
    async (lista) => {
      const { router, antes, ruta, frase, boton } = await conLaFraseDeLaParticipacion(
        [participanteDe(alumno(1).id)],
        lista,
      )
      await act(() => router.navigate(participantes()))
      const fila = await filaDe("Alumno 1")
      fireEvent.click(within(fila).getByRole("link"))
      await laFraseSeFue(frase, ruta, antes, boton)
    },
  )

  it.each(["escritos", "devoluciones"] as const)(
    "FORO-1E24 y FORO-1E31 (%s): atrás y adelante del historial piden la primera página y la frase desaparece",
    async (lista) => {
      const { router, antes, ruta, frase, boton } = await conLaFraseDeLaParticipacion(
        [participantes(), participanteDe(alumno(1).id)],
        lista,
      )
      await act(() => router.navigate(-1))
      await filaDe("Alumno 1")
      await act(() => router.navigate(1))
      await laFraseSeFue(frase, ruta, antes, boton)
    },
  )

  it.each(["escritos", "devoluciones"] as const)(
    "FORO-1E25 y FORO-1E32 (%s): desde una celda del gradebook pide la primera página y la frase desaparece",
    async (lista) => {
      const { router, antes, ruta, frase, boton } = await conLaFraseDeLaParticipacion(
        [participanteDe(alumno(1).id)],
        lista,
      )
      await act(() => router.navigate(`${BASES.maestro()}/calificaciones`))
      const celda = await screen.findByRole(
        "link",
        { name: /Alumno 1, Debate de la unidad/ },
        ESPERA,
      )
      expect(celda).toHaveAttribute("href", participanteDe(alumno(1).id))
      fireEvent.click(celda)
      await laFraseSeFue(frase, ruta, antes, boton)
    },
  )
})

// «Tu participación» calificada, con «Comentarios de tu maestro» y la frase de su cursor a la vista.
const conLaFraseDeTuMaestro = async (entradas: string[]) => {
  estado.rol = "estudiante"
  estado.mia[FORO_A] = {
    ...miaInicial(),
    estado: "calificado",
    fechaEntrega: "2030-01-08T15:30:00.000Z",
    calificacion: calificacion(8),
    principalId: uuid("8a8b3c4d", 1),
    puedeParticipar: false,
  }
  estado.misDevoluciones[FORO_A] = muchos(comentario)
  estado.falla = conCursorVencido(API_MIS_DEVOLUCIONES())
  const montado = await montar(entradas)
  fireEvent.click(await screen.findByRole("button", { name: "Ver más comentarios" }, ESPERA))
  expect(await screen.findByText(FRASE_DE_TU_MAESTRO, undefined, ESPERA)).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Ver más comentarios" })).toBeNull()
  estado.falla = () => undefined
  return { ...montado, antes: primeras(API_MIS_DEVOLUCIONES()) }
}

describe("FORO-1E27 a FORO-1E29 · «Los comentarios de tu maestro cambiaron… Vuelve a abrir el foro…», por cada camino", () => {
  it("FORO-1E27: abrir el foro desde «Foro» antes de 30 s pide la primera página y la frase desaparece", async () => {
    const { router, antes } = await conLaFraseDeTuMaestro([delForo()])
    await act(() => router.navigate(`${BASES.estudiante()}/foro`))
    fireEvent.click(await screen.findByRole("link", { name: /Debate de la unidad/ }, ESPERA))
    await laFraseSeFue(FRASE_DE_TU_MAESTRO, API_MIS_DEVOLUCIONES(), antes, "Ver más comentarios")
  })

  it("FORO-1E28: abrirlo desde «Actividades de aprendizaje» pide la primera página y la frase desaparece", async () => {
    const { router, antes } = await conLaFraseDeTuMaestro([delForo()])
    await act(() => router.navigate(`${BASES.estudiante()}/trabajo`))
    fireEvent.click(await screen.findByRole("link", { name: /Debate de la unidad/ }, ESPERA))
    await laFraseSeFue(FRASE_DE_TU_MAESTRO, API_MIS_DEVOLUCIONES(), antes, "Ver más comentarios")
  })

  it("FORO-1E29: atrás y adelante del historial piden la primera página y la frase desaparece", async () => {
    const { router, antes } = await conLaFraseDeTuMaestro([`${BASES.estudiante()}/foro`, delForo()])
    await act(() => router.navigate(-1))
    await screen.findByRole("link", { name: /Debate de la unidad/ }, ESPERA)
    await act(() => router.navigate(1))
    await laFraseSeFue(FRASE_DE_TU_MAESTRO, API_MIS_DEVOLUCIONES(), antes, "Ver más comentarios")
  })
})

describe("FORO-1E26 · «…Inténtalo de nuevo.» de calificar: repetir el botón", () => {
  it("FORO-1E26: con un 5xx avisa «Algo salió mal. Inténtalo de nuevo.»; lo escrito sigue y el mismo botón califica", async () => {
    const a = alumno(1)
    estado.entregas[de(FORO_A, a.id)] = entregada()
    let primera = true
    estado.falla = ({ metodo }) => {
      if (metodo !== "PUT" || !primera) return undefined
      primera = false
      return errorApi(500, "ERROR_INTERNO")
    }
    await montar([participanteDe(a.id)])
    const campo = await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA)
    fireEvent.change(campo, { target: { value: "8" } })
    fireEvent.click(screen.getByRole("button", { name: "Calificar y devolver" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(GENERICO), ESPERA)
    expect(campo).toHaveValue("8")
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Calificar y devolver" })).not.toHaveAttribute(
        "aria-busy",
        "true",
      ),
    )
    fireEvent.click(screen.getByRole("button", { name: "Calificar y devolver" }))
    await waitFor(
      () => expect(aviso.success).toHaveBeenCalledWith("Calificación publicada"),
      ESPERA,
    )
    expect(pedidas("PUT", API_CALIFICAR(a.id))).toHaveLength(2)
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })
})

describe("FORO-1E33 y FORO-1E34 · «No pudimos actualizar la participación de este alumno…»", () => {
  const TEXTO =
    "No pudimos actualizar la participación de este alumno. Mostramos la última versión que tenemos."

  it("FORO-1E33: una recarga fallida conserva la vista y avisa; el siguiente fallo vuelve a avisar", async () => {
    const a = alumno(1)
    estado.entregas[de(FORO_A, a.id)] = entregada()
    const { queryClient } = await montar([participanteDe(a.id)])
    await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA)
    estado.falla = ({ url }) =>
      url.pathname === API_PARTICIPANTE(a.id) ? errorApi(503, "SERVICIO_OCUPADO") : undefined
    const clave = claveParticipante(CLASE, FORO_A, a.id)
    await act(() => queryClient.invalidateQueries({ queryKey: clave, exact: true }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(TEXTO), ESPERA)
    expect(screen.getByLabelText(/^Calificación \(/)).toBeInTheDocument()
    await act(() => queryClient.invalidateQueries({ queryKey: clave, exact: true }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2), ESPERA)
  })

  it("FORO-1E34: volver a abrirla antes de 30 s la pide de nuevo; una lectura correcta no deja más avisos", async () => {
    const a = alumno(1)
    estado.entregas[de(FORO_A, a.id)] = entregada()
    const { queryClient, router } = await montar([participanteDe(a.id)])
    await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA)
    estado.falla = ({ url }) =>
      url.pathname === API_PARTICIPANTE(a.id) ? errorApi(503, "SERVICIO_OCUPADO") : undefined
    await act(() =>
      queryClient.invalidateQueries({
        queryKey: claveParticipante(CLASE, FORO_A, a.id),
        exact: true,
      }),
    )
    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(TEXTO), ESPERA)
    estado.falla = () => undefined
    estado.entregas[de(FORO_A, a.id)] = entregada({ conRetraso: true })
    const antes = pedidas("GET", API_PARTICIPANTE(a.id)).length
    await act(() => router.navigate(participantes()))
    await filaDe("Alumno 1")
    await act(() => router.navigate(participanteDe(a.id)))
    await waitFor(
      () => expect(pedidas("GET", API_PARTICIPANTE(a.id)).length).toBeGreaterThan(antes),
      ESPERA,
    )
    expect(await screen.findByText("Entregado con retraso", undefined, ESPERA)).toBeInTheDocument()
    await reposar(300)
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })
})

describe("FORO-1E35 y FORO-1E51 · «Ver más» que falla con 5xx en las listas de 01e", () => {
  it.each([
    ["Ver más alumnos", "participantes"],
    ["Ver más participaciones", "escritos"],
    ["Ver más comentarios", "devoluciones"],
  ] as const)(
    "FORO-1E35 y FORO-1E51: «%s» que falla con 503 conserva la lista, avisa una vez y el mismo botón vuelve a pedir la página",
    async (boton, lista) => {
      const a = alumno(1)
      estado.entregas[de(FORO_A, a.id)] = entregada()
      if (lista === "participantes") estado.alumnos[CLASE] = veinticinco()
      if (lista === "escritos") estado.escritos[de(FORO_A, a.id)] = muchos(escrito)
      if (lista === "devoluciones") estado.devoluciones[de(FORO_A, a.id)] = muchos(comentario)
      const ruta =
        lista === "participantes"
          ? API_PARTICIPANTES()
          : lista === "escritos"
            ? API_ESCRITOS(a.id)
            : API_DEVOLUCIONES(a.id)
      await montar([lista === "participantes" ? participantes() : participanteDe(a.id)])
      const control = await screen.findByRole("button", { name: boton }, ESPERA)
      estado.falla = ({ url }) =>
        url.pathname === ruta && url.searchParams.has("cursor")
          ? errorApi(503, "SERVICIO_OCUPADO")
          : undefined
      control.focus()
      fireEvent.click(control)
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
      await reposar()
      expect(aviso.error).toHaveBeenCalledTimes(1)
      const otraVez = screen.getByRole("button", { name: boton })
      expect(otraVez).not.toHaveAttribute("aria-busy", "true")
      expect(otraVez).toHaveFocus()
      estado.falla = () => undefined
      const conCursor = pedidas("GET", ruta).filter(({ url }) =>
        url.searchParams.has("cursor"),
      ).length
      fireEvent.click(otraVez)
      await waitFor(() => expect(screen.queryByRole("button", { name: boton })).toBeNull(), ESPERA)
      expect(
        pedidas("GET", ruta).filter(({ url }) => url.searchParams.has("cursor")).length,
      ).toBeGreaterThan(conCursor)
    },
  )
})

describe("FORO-1E49 · los avisos de recarga con datos (DH-19 y DH-20), con sus caminos", () => {
  const BLOQUES = [
    {
      nombre: "«Participantes» (DH-20)",
      texto: "No pudimos actualizar la lista de alumnos. Mostramos la última versión que tenemos.",
      entrada: () => participantes(),
      ruta: () => API_PARTICIPANTES(),
      clave: () => claveListaDeParticipantes(CLASE, FORO_A),
      espera: async () => {
        await filaDe("Alumno 1")
      },
    },
    {
      nombre: "lo que escribió el alumno (DH-19)",
      texto:
        "No pudimos actualizar las participaciones de este alumno. Mostramos la última versión que tenemos.",
      entrada: () => participanteDe(alumno(1).id),
      ruta: () => API_ESCRITOS(alumno(1).id),
      clave: () => claveParticipacionesDeAlumno(CLASE, FORO_A, alumno(1).id),
      espera: async () => {
        await screen.findByText("Escrito 1", undefined, ESPERA)
      },
    },
    {
      nombre: "los comentarios de la devolución (DH-19)",
      texto:
        "No pudimos actualizar los comentarios de la devolución. Mostramos la última versión que tenemos.",
      entrada: () => participanteDe(alumno(1).id),
      ruta: () => API_DEVOLUCIONES(alumno(1).id),
      clave: () => claveDevoluciones(CLASE, FORO_A, alumno(1).id),
      espera: async () => {
        await screen.findByText("Comentario 1", undefined, ESPERA)
      },
    },
  ] as const

  it.each(BLOQUES)(
    "FORO-1E49: $nombre: una recarga fallida conserva lo que se ve y avisa; el siguiente fallo avisa otra vez; volver a abrir antes de 30 s pide y una lectura correcta no avisa",
    async ({ texto, entrada, ruta, clave, espera }) => {
      const a = alumno(1)
      estado.entregas[de(FORO_A, a.id)] = entregada()
      estado.escritos[de(FORO_A, a.id)] = [escrito(1)]
      estado.devoluciones[de(FORO_A, a.id)] = [comentario(1)]
      const { queryClient, router } = await montar([entrada()])
      await espera()
      estado.falla = ({ url }) =>
        url.pathname === ruta() ? errorApi(503, "SERVICIO_OCUPADO") : undefined
      await act(() => queryClient.invalidateQueries({ queryKey: clave() }))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(texto), ESPERA)
      await espera()
      await act(() => queryClient.invalidateQueries({ queryKey: clave() }))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2), ESPERA)
      estado.falla = () => undefined
      const antes = pedidas("GET", ruta()).length
      await act(() => router.navigate(delForo("maestro")))
      await reposar()
      await act(() => router.navigate(entrada()))
      await waitFor(() => expect(pedidas("GET", ruta()).length).toBeGreaterThan(antes), ESPERA)
      await espera()
      await reposar(300)
      expect(aviso.error).toHaveBeenCalledTimes(2)
    },
  )

  it("FORO-1E49: «Comentarios de tu maestro» (DH-19): una recarga fallida avisa; el siguiente fallo avisa otra vez", async () => {
    estado.rol = "estudiante"
    estado.mia[FORO_A] = {
      ...miaInicial(),
      estado: "calificado",
      fechaEntrega: "2030-01-08T15:30:00.000Z",
      calificacion: calificacion(8),
      principalId: uuid("8a8b3c4d", 1),
      puedeParticipar: false,
    }
    estado.misDevoluciones[FORO_A] = [comentario(1)]
    const { queryClient } = await montar([delForo()])
    await screen.findByText("Comentario 1", undefined, ESPERA)
    estado.falla = ({ url }) =>
      url.pathname === API_MIS_DEVOLUCIONES() ? errorApi(503, "SERVICIO_OCUPADO") : undefined
    await act(() =>
      queryClient.invalidateQueries({ queryKey: claveMisDevoluciones(CLASE, FORO_A) }),
    )
    await waitFor(
      () =>
        expect(aviso.error).toHaveBeenCalledWith(
          "No pudimos actualizar los comentarios de tu maestro. Mostramos la última versión que tenemos.",
        ),
      ESPERA,
    )
    expect(screen.getByText("Comentario 1")).toBeInTheDocument()
    await act(() =>
      queryClient.invalidateQueries({ queryKey: claveMisDevoluciones(CLASE, FORO_A) }),
    )
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2), ESPERA)
  })
})

describe("FORO-1E48 · la primera carga de cada bloque y la regla de R-01e-14", () => {
  const BLOQUES = [
    {
      nombre: "Sus participaciones",
      texto: "No pudimos cargar las participaciones de este alumno.",
      ruta: () => API_ESCRITOS(alumno(1).id),
      principal: () => API_PARTICIPANTE(alumno(1).id),
    },
    {
      nombre: "Comentarios de la devolución",
      texto: "No pudimos cargar los comentarios de la devolución.",
      ruta: () => API_DEVOLUCIONES(alumno(1).id),
      principal: () => API_PARTICIPANTE(alumno(1).id),
    },
  ] as const

  it.each(BLOQUES)(
    "FORO-1E48: «$nombre»: la primera carga fallida (503) lo dice en su bloque, sin aviso, y no pide la participante",
    async ({ nombre, texto, ruta, principal }) => {
      estado.entregas[de(FORO_A, alumno(1).id)] = entregada()
      estado.falla = ({ url }) =>
        url.pathname === ruta() ? errorApi(503, "SERVICIO_OCUPADO") : undefined
      await montar([participanteDe(alumno(1).id)])
      await screen.findByRole("heading", { name: nombre }, ESPERA)
      const bloque = bloqueDe(nombre)
      expect(await within(bloque).findByText(texto, undefined, ESPERA)).toBeInTheDocument()
      expect(within(bloque).getByRole("alert")).toHaveTextContent(texto)
      await reposar(300)
      expect(aviso.error).not.toHaveBeenCalled()
      expect(pedidas("GET", principal())).toHaveLength(1)
    },
  )

  it("FORO-1E48: «Comentarios de tu maestro»: la primera carga fallida lo dice en el bloque, sin aviso; con calificación en null no se pide", async () => {
    estado.rol = "estudiante"
    estado.mia[FORO_A] = {
      ...miaInicial(),
      estado: "calificado",
      fechaEntrega: "2030-01-08T15:30:00.000Z",
      calificacion: calificacion(8),
      principalId: uuid("8a8b3c4d", 1),
      puedeParticipar: false,
    }
    estado.falla = ({ url }) =>
      url.pathname === API_MIS_DEVOLUCIONES() ? errorApi(503, "SERVICIO_OCUPADO") : undefined
    await montar([delForo()])
    const texto = "No pudimos cargar los comentarios de tu maestro."
    expect(await screen.findByText(texto, undefined, ESPERA)).toBeInTheDocument()
    expect(bloqueDe("Comentarios de tu maestro")).toContainElement(screen.getByText(texto))
    await reposar(300)
    expect(aviso.error).not.toHaveBeenCalled()
    cleanup()
    estado.mia[FORO_A] = { ...miaInicial(), calificacion: null }
    estado.llamadas = []
    await montar([delForo()])
    await screen.findByText("Todavía no participas.", undefined, ESPERA)
    await reposar(300)
    expect(pedidas("GET", API_MIS_DEVOLUCIONES())).toHaveLength(0)
  })

  const ERRORES = [
    [
      "404 TAREA_NO_ENCONTRADA",
      () => errorApi(404, "TAREA_NO_ENCONTRADA"),
      "Ese foro ya no existe.",
    ],
    [
      "404 ALUMNO_NO_ENCONTRADO",
      () => errorApi(404, "ALUMNO_NO_ENCONTRADO"),
      "No encontramos a ese alumno en esta clase.",
    ],
    [
      "403 SIN_ACCESO_A_LA_CLASE",
      () => errorApi(403, "SIN_ACCESO_A_LA_CLASE"),
      "No tienes acceso a esta clase.",
    ],
    [
      "400 VALIDACION de alumnoId",
      () => errorApi(400, "VALIDACION", "alumnoId: debe ser un identificador válido"),
      "No encontramos a ese alumno en esta clase.",
    ],
    // M-13: el VALIDACION de foroId: también reemplaza la vista.
    [
      "400 VALIDACION de foroId",
      () => errorApi(400, "VALIDACION", "foroId: debe ser un identificador válido"),
      "Ese foro ya no existe.",
    ],
  ] as const

  it.each(
    BLOQUES.flatMap((bloque) =>
      ERRORES.map((error) => [bloque.nombre, error[0], bloque, error] as const),
    ),
  )(
    "FORO-1E48: «%s» con %s: una sola lectura lógica más de la participante, sin repetir el bloque; si la participante responde lo mismo, la vista se reemplaza con un solo mensaje",
    async (_bloque, _error, { ruta, principal }, [, respuesta, mensaje]) => {
      estado.entregas[de(FORO_A, alumno(1).id)] = entregada()
      const retenida = enVuelo()
      let fallo = false
      estado.falla = ({ url }) => {
        if (url.pathname === ruta()) {
          if (!fallo) return retenida.promesa
          return respuesta()
        }
        if (url.pathname === principal() && fallo) return respuesta()
        return undefined
      }
      await montar([participanteDe(alumno(1).id)])
      await screen.findByRole("heading", { name: "Alumno 1", level: 2 }, ESPERA)
      await reposar()
      const principalAntes = pedidas("GET", principal()).length
      fallo = true
      retenida.soltar(respuesta())
      expect(await screen.findByText(mensaje, undefined, ESPERA)).toBeInTheDocument()
      await reposar(1500)
      expect(pedidas("GET", principal()).length - principalAntes).toBeGreaterThanOrEqual(1)
      expect(pedidas("GET", principal()).length - principalAntes).toBeLessThanOrEqual(2)
      expect(pedidas("GET", ruta())).toHaveLength(2)
      expect(screen.getAllByText(mensaje)).toHaveLength(1)
    },
  )

  it.each(BLOQUES)(
    "FORO-1E48: «$nombre» con un servidor inconsistente (la participante responde bien y el bloque otra vez 403) se queda con su texto, sin ciclo",
    async ({ nombre, texto, ruta, principal }) => {
      estado.entregas[de(FORO_A, alumno(1).id)] = entregada()
      estado.falla = ({ url }) =>
        url.pathname === ruta() ? errorApi(403, "SIN_ACCESO_A_LA_CLASE") : undefined
      await montar([participanteDe(alumno(1).id)])
      await screen.findByRole("heading", { name: nombre }, ESPERA)
      expect(
        await within(bloqueDe(nombre)).findByText(texto, undefined, ESPERA),
      ).toBeInTheDocument()
      await reposar(1500)
      const participante = pedidas("GET", principal()).length
      const bloque = pedidas("GET", ruta()).length
      await reposar(1500)
      expect(pedidas("GET", principal())).toHaveLength(participante)
      expect(pedidas("GET", ruta())).toHaveLength(bloque)
      expect(screen.queryByText("No tienes acceso a esta clase.")).toBeNull()
    },
  )

  it.each(BLOQUES)(
    "FORO-1E48: «$nombre» con un 404 NO_ENCONTRADO se queda en el bloque y no vuelve a pedir la participante",
    async ({ nombre, texto, ruta, principal }) => {
      estado.entregas[de(FORO_A, alumno(1).id)] = entregada()
      estado.falla = ({ url }) =>
        url.pathname === ruta() ? errorApi(404, "NO_ENCONTRADO") : undefined
      await montar([participanteDe(alumno(1).id)])
      await screen.findByRole("heading", { name: nombre }, ESPERA)
      expect(
        await within(bloqueDe(nombre)).findByText(texto, undefined, ESPERA),
      ).toBeInTheDocument()
      await reposar(300)
      expect(pedidas("GET", principal())).toHaveLength(1)
    },
  )

  it("FORO-1E48: «Comentarios de tu maestro» con un servidor inconsistente (el foro responde bien y el bloque 403) se queda con su texto, sin ciclo", async () => {
    estado.rol = "estudiante"
    estado.mia[FORO_A] = {
      ...miaInicial(),
      estado: "calificado",
      fechaEntrega: "2030-01-08T15:30:00.000Z",
      calificacion: calificacion(8),
      principalId: uuid("8a8b3c4d", 1),
      puedeParticipar: false,
    }
    estado.falla = ({ url }) =>
      url.pathname === API_MIS_DEVOLUCIONES() ? errorApi(403, "SIN_ACCESO_A_LA_CLASE") : undefined
    await montar([delForo()])
    expect(
      await screen.findByText(
        "No pudimos cargar los comentarios de tu maestro.",
        undefined,
        ESPERA,
      ),
    ).toBeInTheDocument()
    await reposar(1500)
    const foro = pedidas("GET", API_FORO()).length
    const bloque = pedidas("GET", API_MIS_DEVOLUCIONES()).length
    // M-13: el fallo del bloque pidió el foro una vez más (la carga inicial lo pidió una vez).
    expect(foro).toBe(2)
    await reposar(1500)
    expect(pedidas("GET", API_FORO())).toHaveLength(foro)
    expect(pedidas("GET", API_MIS_DEVOLUCIONES())).toHaveLength(bloque)
  })

  const conTuCalificacion = () => {
    estado.rol = "estudiante"
    estado.mia[FORO_A] = {
      ...miaInicial(),
      estado: "calificado",
      fechaEntrega: "2030-01-08T15:30:00.000Z",
      calificacion: calificacion(8),
      principalId: uuid("8a8b3c4d", 1),
      puedeParticipar: false,
    }
  }

  const ERRORES_DEL_FORO = [
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
  ] as const

  it.each(ERRORES_DEL_FORO)(
    "FORO-1E48: «Comentarios de tu maestro» con %s: una sola lectura lógica más del foro, sin repetir el bloque; si el foro responde lo mismo, la vista se reemplaza con un solo mensaje (M-13)",
    async (_nombre, respuesta, mensaje) => {
      conTuCalificacion()
      const retenida = enVuelo()
      let fallo = false
      estado.falla = ({ url }) => {
        if (url.pathname === API_MIS_DEVOLUCIONES()) {
          if (!fallo) return retenida.promesa
          return respuesta()
        }
        if (url.pathname === API_FORO() && fallo) return respuesta()
        return undefined
      }
      await montar([delForo()])
      await screen.findByText("Calificación: 8 de 10", undefined, ESPERA)
      await reposar()
      const foroAntes = pedidas("GET", API_FORO()).length
      fallo = true
      retenida.soltar(respuesta())
      expect(await screen.findByText(mensaje, undefined, ESPERA)).toBeInTheDocument()
      await reposar(1500)
      const masDelForo = pedidas("GET", API_FORO()).length - foroAntes
      expect(masDelForo).toBeGreaterThanOrEqual(1)
      expect(masDelForo).toBeLessThanOrEqual(2)
      expect(pedidas("GET", API_MIS_DEVOLUCIONES())).toHaveLength(2)
      expect(screen.getAllByText(mensaje)).toHaveLength(1)
      expect(screen.queryByText("No pudimos cargar los comentarios de tu maestro.")).toBeNull()
    },
  )

  it("FORO-1E48: «Comentarios de tu maestro» con un 404 NO_ENCONTRADO se queda en el bloque y no vuelve a pedir el foro (M-13)", async () => {
    conTuCalificacion()
    estado.falla = ({ url }) =>
      url.pathname === API_MIS_DEVOLUCIONES() ? errorApi(404, "NO_ENCONTRADO") : undefined
    await montar([delForo()])
    expect(
      await screen.findByText(
        "No pudimos cargar los comentarios de tu maestro.",
        undefined,
        ESPERA,
      ),
    ).toBeInTheDocument()
    await reposar(300)
    expect(pedidas("GET", API_FORO())).toHaveLength(1)
  })
})

describe("FORO-1E54 · el control que falló no se ofrece mientras se ve la frase del cursor", () => {
  it.each(["escritos", "devoluciones"] as const)(
    "FORO-1E54 (%s): con la frase a la vista no hay «Ver más»",
    async (lista) => {
      const { boton } = await conLaFraseDeLaParticipacion([participanteDe(alumno(1).id)], lista)
      expect(screen.queryByRole("button", { name: boton })).toBeNull()
    },
  )
})

describe("FORO-1E55 · la recarga tras un 409 de calificar que falla", () => {
  it("FORO-1E55: avisa «No pudimos cargar la participación actual…» una sola vez (no el de recarga fallida); repetir manda la versión de apertura, recibe el 409 y la recarga reinicia el panel; volver a abrirla antes de 30 s la pide", async () => {
    const a = alumno(1)
    estado.entregas[de(FORO_A, a.id)] = entregada({ version: 1 })
    let fallaLaLectura = false
    estado.falla = ({ metodo, url }) => {
      if (metodo === "PUT") {
        estado.entregas[de(FORO_A, a.id)] = entregada({ version: 7 })
        fallaLaLectura = true
        return errorApi(409, "ENTREGA_MODIFICADA", "La participación cambió.")
      }
      if (url.pathname === API_PARTICIPANTE(a.id) && fallaLaLectura) {
        return errorApi(503, "SERVICIO_OCUPADO")
      }
      return undefined
    }
    await montar([participanteDe(a.id)])
    const campo = await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA)
    fireEvent.change(campo, { target: { value: "8" } })
    fireEvent.click(screen.getByRole("button", { name: "Calificar y devolver" }))
    await waitFor(
      () =>
        expect(aviso.error).toHaveBeenCalledWith(
          "No pudimos cargar la participación actual. Revisa tu conexión e inténtalo de nuevo.",
        ),
      ESPERA,
    )
    await reposar(300)
    expect(aviso.error).toHaveBeenCalledTimes(2)
    expect(aviso.error).toHaveBeenNthCalledWith(1, "La participación cambió.")
    expect(campo).toHaveValue("8")
    fallaLaLectura = false
    estado.falla = ({ metodo }) => {
      if (metodo !== "PUT") return undefined
      return errorApi(409, "ENTREGA_MODIFICADA", "La participación cambió.")
    }
    fireEvent.click(screen.getByRole("button", { name: "Calificar y devolver" }))
    await waitFor(() => expect(encabezadoDe("Calificación", 3)).toHaveFocus(), ESPERA)
    expect(pedidas("PUT", API_CALIFICAR(a.id)).at(-1)?.cuerpo).toMatchObject({ version: 1 })
    expect(screen.getByLabelText(/^Calificación \(/)).toHaveValue("")
  })

  it("FORO-1E55: tras la recarga fallida, volver a abrir la participación antes de 30 s la pide", async () => {
    const a = alumno(1)
    estado.entregas[de(FORO_A, a.id)] = entregada({ version: 1 })
    let fallaLaLectura = false
    estado.falla = ({ metodo, url }) => {
      if (metodo === "PUT") {
        estado.entregas[de(FORO_A, a.id)] = entregada({ version: 7 })
        fallaLaLectura = true
        return errorApi(409, "ENTREGA_MODIFICADA", "La participación cambió.")
      }
      if (url.pathname === API_PARTICIPANTE(a.id) && fallaLaLectura) {
        return errorApi(503, "SERVICIO_OCUPADO")
      }
      return undefined
    }
    const { router } = await montar([participanteDe(a.id)])
    fireEvent.change(await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA), {
      target: { value: "8" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Calificar y devolver" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2), ESPERA)
    estado.falla = () => undefined
    const antes = pedidas("GET", API_PARTICIPANTE(a.id)).length
    await act(() => router.navigate(participantes()))
    await filaDe("Alumno 1")
    await act(() => router.navigate(participanteDe(a.id)))
    await waitFor(
      () => expect(pedidas("GET", API_PARTICIPANTE(a.id)).length).toBeGreaterThan(antes),
      ESPERA,
    )
    expect(await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA)).toBeInTheDocument()
  })
})

describe("T-01 (ronda 1) · la recarga tras un 409 de calificar con el foro y la participante", () => {
  const RECARGA_DEL_FORO = "No pudimos actualizar el foro. Mostramos la última versión que tenemos."
  const RECARGA_DE_LA_PARTICIPANTE =
    "No pudimos actualizar la participación de este alumno. Mostramos la última versión que tenemos."
  const DH19 = "No pudimos cargar la participación actual. Revisa tu conexión e inténtalo de nuevo."

  // Califica con 8; el PUT responde el 409 y, desde ahí, las lecturas del foro y de la participante
  // responden lo que diga `lecturas` (undefined: bien).
  const calificarCon409 = async (
    codigo: string,
    lecturas: {
      foro?: () => Response | Promise<Response>
      participante?: () => Response | Promise<Response>
    },
  ) => {
    const a = alumno(1)
    estado.entregas[de(FORO_A, a.id)] = entregada({ version: 1 })
    let tras409 = false
    estado.falla = ({ metodo, url }) => {
      if (metodo === "PUT") {
        tras409 = true
        return errorApi(409, codigo, "Otra versión del servidor.")
      }
      if (!tras409 || metodo !== "GET") return undefined
      if (url.pathname === API_FORO() && lecturas.foro !== undefined) return lecturas.foro()
      if (url.pathname === API_PARTICIPANTE(a.id) && lecturas.participante !== undefined) {
        return lecturas.participante()
      }
      return undefined
    }
    const montado = await montar([participanteDe(a.id)])
    const campo = await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA)
    fireEvent.change(campo, { target: { value: "8" } })
    fireEvent.click(screen.getByRole("button", { name: "Calificar y devolver" }))
    await waitFor(
      () => expect(aviso.error).toHaveBeenCalledWith("Otra versión del servidor."),
      ESPERA,
    )
    return { ...montado, a }
  }

  const avisos = () => aviso.error.mock.calls.map(([texto]) => String(texto))

  it.each(["RUBRICA_MODIFICADA", "ENTREGA_NO_CALIFICABLE"])(
    "T-01: %s con el foro y la participante fallando da el aviso del 409 y uno solo de la recarga (el del foro, como la tarea); salir y volver con la relectura en vuelo no lo repite",
    async (codigo) => {
      const servicio = () => errorApi(503, "SERVICIO_OCUPADO")
      const { router, a } = await calificarCon409(codigo, {
        foro: servicio,
        participante: servicio,
      })
      await waitFor(() => expect(avisos()).toContain(RECARGA_DEL_FORO), ESPERA)
      await reposar(1500)
      expect(avisos()).toEqual(["Otra versión del servidor.", RECARGA_DEL_FORO])
      // Salir y volver con las relecturas en vuelo: el fallo ya avisado no se repite.
      const retenida = enVuelo()
      estado.falla = ({ metodo, url }) =>
        metodo === "GET" && (url.pathname === API_FORO() || url.pathname === API_PARTICIPANTE(a.id))
          ? retenida.promesa
          : undefined
      await act(() => router.navigate(participantes()))
      await filaDe("Alumno 1")
      await act(() => router.navigate(participanteDe(a.id)))
      await reposar(500)
      expect(avisos()).toHaveLength(2)
    },
  )

  it("T-01: con solo el foro fallando, el aviso del 409 y el de la recarga del foro", async () => {
    await calificarCon409("RUBRICA_MODIFICADA", { foro: () => errorApi(503, "SERVICIO_OCUPADO") })
    await waitFor(() => expect(avisos()).toContain(RECARGA_DEL_FORO), ESPERA)
    await reposar(1500)
    expect(avisos()).toEqual(["Otra versión del servidor.", RECARGA_DEL_FORO])
  })

  it("T-01: con solo la participante fallando, el aviso del 409 y el de DH-19", async () => {
    await calificarCon409("RUBRICA_MODIFICADA", {
      participante: () => errorApi(503, "SERVICIO_OCUPADO"),
    })
    await waitFor(() => expect(avisos()).toContain(DH19), ESPERA)
    await reposar(1500)
    expect(avisos()).toEqual(["Otra versión del servidor.", DH19])
  })

  it("T-01: sin fallos, un solo aviso y el panel se reinicia con el foco en «Calificación»", async () => {
    await calificarCon409("RUBRICA_MODIFICADA", {})
    await waitFor(() => expect(encabezadoDe("Calificación", 3)).toHaveFocus(), ESPERA)
    await reposar(500)
    expect(avisos()).toEqual(["Otra versión del servidor."])
  })

  it("T-01: si el foro responde 404 en la recarga (la vista se reemplaza) y la participante 503, solo queda el aviso del 409 y el mensaje de la vista", async () => {
    await calificarCon409("RUBRICA_MODIFICADA", {
      foro: () => errorApi(404, "TAREA_NO_ENCONTRADA"),
      participante: () => errorApi(503, "SERVICIO_OCUPADO"),
    })
    expect(await screen.findByText("Ese foro ya no existe.", undefined, ESPERA)).toBeInTheDocument()
    await reposar(1500)
    expect(avisos()).toEqual(["Otra versión del servidor."])
    expect(screen.queryByText(RECARGA_DE_LA_PARTICIPANTE)).toBeNull()
  })

  it("T-01: si la participante responde 404 ALUMNO_NO_ENCONTRADO y el foro 503, la vista se reemplaza y solo queda el aviso del 409", async () => {
    await calificarCon409("RUBRICA_MODIFICADA", {
      foro: () => errorApi(503, "SERVICIO_OCUPADO"),
      participante: () => errorApi(404, "ALUMNO_NO_ENCONTRADO"),
    })
    expect(
      await screen.findByText("No encontramos a ese alumno en esta clase.", undefined, ESPERA),
    ).toBeInTheDocument()
    await reposar(1500)
    expect(avisos()).toEqual(["Otra versión del servidor."])
  })

  it("T-01: con un código que redirige en la lectura del foro y la participante 503, ningún aviso de recarga", async () => {
    await calificarCon409("RUBRICA_MODIFICADA", {
      foro: () => errorApi(403, "ACCESO_RESTRINGIDO"),
      participante: () => errorApi(503, "SERVICIO_OCUPADO"),
    })
    await waitFor(() => expect(irA).toHaveBeenCalledWith("/acceso-restringido"), ESPERA)
    await reposar(1500)
    expect(avisos()).toEqual(["Otra versión del servidor."])
  })

  it("T-01: con la vista desmontada durante la recarga, las dos lecturas fallan y al volver (con la relectura en vuelo) no sale ningún aviso de recarga", async () => {
    const a = alumno(1)
    estado.entregas[de(FORO_A, a.id)] = entregada({ version: 1 })
    const foro = enVuelo()
    const participante = enVuelo()
    let tras409 = false
    estado.falla = ({ metodo, url }) => {
      if (metodo === "PUT") {
        tras409 = true
        return errorApi(409, "RUBRICA_MODIFICADA", "Otra versión del servidor.")
      }
      if (!tras409 || metodo !== "GET") return undefined
      if (url.pathname === API_FORO()) return foro.promesa
      if (url.pathname === API_PARTICIPANTE(a.id)) return participante.promesa
      return undefined
    }
    const { router } = await montar([participanteDe(a.id)])
    fireEvent.change(await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA), {
      target: { value: "8" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Calificar y devolver" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await act(() => router.navigate(participantes()))
    await filaDe("Alumno 1")
    foro.soltar(errorApi(503, "SERVICIO_OCUPADO"))
    participante.soltar(errorApi(503, "SERVICIO_OCUPADO"))
    await reposar(1500)
    const retenida = enVuelo()
    estado.falla = ({ metodo, url }) =>
      metodo === "GET" && (url.pathname === API_FORO() || url.pathname === API_PARTICIPANTE(a.id))
        ? retenida.promesa
        : undefined
    await act(() => router.navigate(participanteDe(a.id)))
    await reposar(500)
    expect(avisos()).toEqual(["Otra versión del servidor."])
  })

  it("T-01: con la vista desmontada durante la recarga y solo la participante fallando, al volver (con la relectura en vuelo) no sale ningún aviso de recarga", async () => {
    const a = alumno(1)
    estado.entregas[de(FORO_A, a.id)] = entregada({ version: 1 })
    const participante = enVuelo()
    let tras409 = false
    estado.falla = ({ metodo, url }) => {
      if (metodo === "PUT") {
        tras409 = true
        return errorApi(409, "RUBRICA_MODIFICADA", "Otra versión del servidor.")
      }
      if (!tras409 || metodo !== "GET") return undefined
      if (url.pathname === API_PARTICIPANTE(a.id)) return participante.promesa
      return undefined
    }
    const { router } = await montar([participanteDe(a.id)])
    fireEvent.change(await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA), {
      target: { value: "8" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Calificar y devolver" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await act(() => router.navigate(participantes()))
    await filaDe("Alumno 1")
    participante.soltar(errorApi(503, "SERVICIO_OCUPADO"))
    await reposar(1500)
    const retenida = enVuelo()
    estado.falla = ({ metodo, url }) =>
      metodo === "GET" && url.pathname === API_PARTICIPANTE(a.id) ? retenida.promesa : undefined
    await act(() => router.navigate(participanteDe(a.id)))
    await reposar(500)
    expect(avisos()).toEqual(["Otra versión del servidor."])
  })

  it("T-01: una recarga de fondo en que el foro responde 404 (la vista se reemplaza) y después la participante 503 no da el aviso de la participante", async () => {
    const a = alumno(1)
    estado.entregas[de(FORO_A, a.id)] = entregada()
    const { queryClient } = await montar([participanteDe(a.id)])
    await screen.findByLabelText(/^Calificación \(/, undefined, ESPERA)
    const participante = enVuelo()
    estado.falla = ({ metodo, url }) => {
      if (metodo !== "GET") return undefined
      if (url.pathname === API_FORO()) return errorApi(404, "TAREA_NO_ENCONTRADA")
      if (url.pathname === API_PARTICIPANTE(a.id)) return participante.promesa
      return undefined
    }
    await act(() => {
      void queryClient.invalidateQueries({ queryKey: claveForo(CLASE, FORO_A), exact: true })
      void queryClient.invalidateQueries({
        queryKey: claveParticipante(CLASE, FORO_A, a.id),
        exact: true,
      })
    })
    expect(await screen.findByText("Ese foro ya no existe.", undefined, ESPERA)).toBeInTheDocument()
    participante.soltar(errorApi(503, "SERVICIO_OCUPADO"))
    await reposar(1500)
    expect(avisos()).toEqual([])
  })
})
