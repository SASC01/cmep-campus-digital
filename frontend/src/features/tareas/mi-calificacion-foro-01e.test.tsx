// FORO-01e (§D-8.5, R-01e-11): «Tu participación» del alumno con su calificación, su desglose y
// «Comentarios de tu maestro» (FORO-1E10), con el router real y el QueryClient de app/providers.tsx.
// Reloj fijo (solo Date).
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

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
const delForo = (rol: Rol = "estudiante", foro = FORO_A, clase = CLASE) =>
  `${BASES[rol](clase)}/foros/${foro}`
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

const tuParticipacion = () => {
  const h = screen.getByRole("heading", { name: "Tu participación", level: 3 })
  const region = h.closest("section")
  if (!(region instanceof HTMLElement))
    throw new Error("Precondición: «Tu participación» es una región")
  return region
}

describe("FORO-1E10 · «Tu participación» con la calificación", () => {
  it("FORO-1E10: calificada con rúbrica: la calificación, la fecha, su desglose y «Comentarios de tu maestro» con sus comentarios", async () => {
    estado.rol = "estudiante"
    estado.foros[FORO_A] = {
      clase: CLASE,
      titulo: "Debate de la unidad",
      existe: true,
      conRubrica: true,
    }
    estado.mia[FORO_A] = {
      ...miaInicial(),
      estado: "calificado",
      fechaEntrega: "2030-01-08T15:30:00.000Z",
      calificacion: calificacion(8, true),
      principalId: uuid("8a8b3c4d", 1),
      puedeParticipar: false,
    }
    estado.misDevoluciones[FORO_A] = [comentario(1, { texto: "Muy bien argumentado." })]
    await montar([delForo()])
    expect(await screen.findByText("Calificación: 8 de 10", undefined, ESPERA)).toBeInTheDocument()
    const region = tuParticipacion()
    expect(within(region).getByText(/^Calificada el /)).toBeInTheDocument()
    expect(within(region).getByText("Claridad: 4 de 5")).toBeInTheDocument()
    expect(within(region).getByText("Argumentos: 4 de 5")).toBeInTheDocument()
    expect(
      await within(region).findByText("Muy bien argumentado.", undefined, ESPERA),
    ).toBeInTheDocument()
    expect(
      within(region).getByRole("heading", { name: "Comentarios de tu maestro", level: 4 }),
    ).toBeInTheDocument()
    expect(
      within(region).queryByText("No participaste en este foro y ya está calificado."),
    ).toBeNull()
  })

  it("FORO-1E10: calificada sin comentarios: no se pinta «Comentarios de tu maestro» (sí se piden una vez)", async () => {
    estado.rol = "estudiante"
    estado.mia[FORO_A] = {
      ...miaInicial(),
      estado: "calificado",
      fechaEntrega: "2030-01-08T15:30:00.000Z",
      calificacion: calificacion(7),
      principalId: uuid("8a8b3c4d", 1),
      puedeParticipar: false,
    }
    await montar([delForo()])
    expect(await screen.findByText("Calificación: 7 de 10", undefined, ESPERA)).toBeInTheDocument()
    await waitFor(() => expect(pedidas("GET", API_MIS_DEVOLUCIONES())).toHaveLength(1), ESPERA)
    await reposar()
    expect(screen.queryByRole("heading", { name: "Comentarios de tu maestro" })).toBeNull()
  })

  it("FORO-1E10: sin calificación no se piden «Comentarios de tu maestro» (R-01e-11) ni se pinta la calificación", async () => {
    estado.rol = "estudiante"
    estado.mia[FORO_A] = {
      ...miaInicial(),
      estado: "entregado",
      fechaEntrega: "2030-01-08T15:30:00.000Z",
      principalId: uuid("8a8b3c4d", 1),
      puedeParticipar: false,
      puedeReplicar: true,
    }
    await montar([delForo()])
    expect(await screen.findByText(/^Participaste el /, undefined, ESPERA)).toBeInTheDocument()
    await reposar(300)
    expect(pedidas("GET", API_MIS_DEVOLUCIONES())).toHaveLength(0)
    expect(screen.queryByText(/^Calificación: /)).toBeNull()
  })

  it("FORO-1E10: calificada sin haber participado: «No participaste en este foro y ya está calificado.» con la calificación", async () => {
    estado.rol = "estudiante"
    estado.mia[FORO_A] = {
      ...miaInicial(),
      estado: "calificado",
      calificacion: calificacion(0),
      puedeParticipar: false,
    }
    await montar([delForo()])
    expect(
      await screen.findByText(
        "No participaste en este foro y ya está calificado.",
        undefined,
        ESPERA,
      ),
    ).toBeInTheDocument()
    expect(screen.getByText("Calificación: 0 de 10")).toBeInTheDocument()
  })
})
