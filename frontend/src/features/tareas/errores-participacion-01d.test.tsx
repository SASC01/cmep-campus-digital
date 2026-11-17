// FORO-01d (§D-8.4, §D-10; AGENTS.md, "VALIDACION fuera de contrato"): los errores que el formulario de la
// participación no espera, con el router real (`rutas`) y el QueryClient de app/providers.tsx.
// FORO-1D05 a FORO-1D09. En cada caso, un solo mensaje, lo escrito se conserva y el botón sale de la
// espera.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import { ENTRADAS_FUERA_DE_CONTRATO } from "@/lib/errores-de-api-fuera-de-contrato"

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

const del = (rol: Rol, foroId = FORO_A) => `${BASES[rol]}/foros/${foroId}`
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

const validacion = (mensaje: string) => errorApi(400, "VALIDACION", mensaje)
const marcados = () => document.querySelectorAll("[aria-invalid='true']")

// La participación del alumno (principal) y la réplica del maestro, con su campo y su botón.
const FORMULARIOS = [
  {
    nombre: "la participación",
    id: "FORO-1D",
    rol: "estudiante" as const,
    campo: "Escribe tu participación",
    boton: "Publicar participación",
    vacio: "Escribe tu participación",
    generico: "No pudimos publicar tu participación. Inténtalo de nuevo.",
    preparar: () => undefined,
    abrir: async () => screen.findByLabelText("Escribe tu participación", undefined, ESPERA),
  },
  {
    nombre: "la réplica",
    id: "FORO-1D10",
    rol: "maestro" as const,
    campo: "Escribe tu réplica",
    boton: "Publicar réplica",
    vacio: "Escribe tu réplica",
    generico: "No pudimos publicar tu réplica. Inténtalo de nuevo.",
    preparar: () => {
      estado.participaciones[FORO_A] = [participacion(1)]
    },
    abrir: async () => {
      const fila = await filaDe("Participación 1")
      fireEvent.click(within(fila).getByRole("button", { name: "Replicar" }))
      return within(fila).findByLabelText("Escribe tu réplica", undefined, ESPERA)
    },
  },
].filter(({ id }) => id === "FORO-1D")

describe.each(FORMULARIOS)(
  "Errores fuera de contrato al publicar $nombre",
  ({ id, rol, campo, boton, vacio, generico, preparar, abrir }) => {
    const titulo = (caso: string) => (id === "FORO-1D" ? caso : `FORO-1D10 (${caso})`)

    const conLoEscrito = async () => {
      estado.rol = rol
      preparar()
      await montar([del(rol)])
      const elCampo = await abrir()
      fireEvent.change(elCampo, { target: { value: "Lo que escribí." } })
      return elCampo
    }

    const publicarCon = async (respuesta: () => Response, avisos: number) => {
      estado.falla = ({ metodo }) => (metodo === "POST" ? respuesta() : undefined)
      fireEvent.click(screen.getByRole("button", { name: boton }))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(avisos), ESPERA)
      await waitFor(() =>
        expect(screen.getByRole("button", { name: boton })).not.toHaveAttribute(
          "aria-busy",
          "true",
        ),
      )
    }

    it(`${titulo("FORO-1D05")}: un VALIDACION de un campo que el formulario no pinta (foroId) da un solo aviso legible y ningún ErrorDeCampo`, async () => {
      const elCampo = await conLoEscrito()
      await publicarCon(() => validacion("foroId: foroId: debe ser un identificador válido"), 1)
      await reposar()
      expect(aviso.error).toHaveBeenCalledTimes(1)
      expect(aviso.error).toHaveBeenCalledWith("Ese foro ya no existe.")
      expect(marcados()).toHaveLength(0)
      expect(elCampo).toHaveValue("Lo que escribí.")
    })

    it.each(["", "   "])(
      `${titulo("FORO-1D06")}: un VALIDACION con el mensaje «%s» da un solo aviso con el genérico de publicar`,
      async (mensaje) => {
        const elCampo = await conLoEscrito()
        await publicarCon(() => validacion(mensaje), 1)
        await reposar()
        // El genérico de esta acción (§D-9): «No pudimos publicar tu …».
        expect(aviso.error).toHaveBeenCalledWith(generico)
        expect(marcados()).toHaveLength(0)
        expect(elCampo).toHaveValue("Lo que escribí.")
      },
    )

    it(`${titulo("FORO-1D07")}: con prefijo de ruta «texto.0:», el ErrorDeCampo de «${campo}» sin la ruta y sin aviso`, async () => {
      const elCampo = await conLoEscrito()
      estado.falla = ({ metodo }) =>
        metodo === "POST" ? validacion("texto.0: El texto no es válido.") : undefined
      fireEvent.click(screen.getByRole("button", { name: boton }))
      expect(
        await screen.findByText("El texto no es válido.", undefined, ESPERA),
      ).toBeInTheDocument()
      expect(screen.queryByText(/texto\.0/)).toBeNull()
      expect(elCampo).toHaveAttribute("aria-invalid", "true")
      await reposar()
      expect(aviso.error).not.toHaveBeenCalled()
      expect(elCampo).toHaveValue("Lo que escribí.")
    })

    it(`${titulo("FORO-1D08")}: tras el ErrorDeCampo de «texto:» del servidor, un envío vacío muestra solo «${vacio}» y no pide nada`, async () => {
      const elCampo = await conLoEscrito()
      estado.falla = ({ metodo }) =>
        metodo === "POST" ? validacion("texto: El servidor lo rechazó.") : undefined
      fireEvent.click(screen.getByRole("button", { name: boton }))
      expect(
        await screen.findByText("El servidor lo rechazó.", undefined, ESPERA),
      ).toBeInTheDocument()
      const escrituras = estado.llamadas.filter((l) => l.metodo === "POST").length
      fireEvent.change(elCampo, { target: { value: "  " } })
      fireEvent.click(screen.getByRole("button", { name: boton }))
      expect(await screen.findByText(vacio, { selector: "p" }, ESPERA)).toBeInTheDocument()
      expect(screen.queryByText("El servidor lo rechazó.")).toBeNull()
      expect(marcados()).toHaveLength(1)
      expect(estado.llamadas.filter((l) => l.metodo === "POST")).toHaveLength(escrituras)
      expect(aviso.error).not.toHaveBeenCalled()
    })

    it(`${titulo("FORO-1D09")}: cada entrada de ENTRADAS_FUERA_DE_CONTRATO da un solo aviso, con el resto sin la ruta o el genérico, ningún ErrorDeCampo, y lo escrito se conserva`, async () => {
      const elCampo = await conLoEscrito()
      let avisos = 0
      for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
        avisos += 1
        await publicarCon(() => validacion(entrada.mensaje), avisos)
        expect(aviso.error).toHaveBeenLastCalledWith(entrada.resto ?? generico)
        expect(marcados()).toHaveLength(0)
      }
      expect(elCampo).toHaveValue("Lo que escribí.")
    }, 60_000)
  },
)
