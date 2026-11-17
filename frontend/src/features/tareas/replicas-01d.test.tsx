// FORO-01d (§D-8.4, §D-10): las réplicas, con el router real (`rutas`) y el QueryClient de
// app/providers.tsx. FORO-1D10 (FORO-1D05 a FORO-1D09 en el formulario de réplica), FORO-1D11, FORO-1D12 y
// las partes de las réplicas de FORO-1D50 y FORO-1D53.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import { ENTRADAS_FUERA_DE_CONTRATO } from "@/lib/errores-de-api-fuera-de-contrato"

import { claveReplicas } from "./lib"

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
  {
    nombre: "la réplica del alumno",
    id: "FORO-1D10",
    rol: "estudiante" as const,
    campo: "Escribe tu réplica",
    boton: "Publicar réplica",
    vacio: "Escribe tu réplica",
    generico: "No pudimos publicar tu réplica. Inténtalo de nuevo.",
    preparar: () => {
      estado.participaciones[FORO_A] = [participacion(1)]
      estado.mia = { ...miaInicial(), puedeReplicar: true }
    },
    abrir: async () => {
      const fila = await filaDe("Participación 1")
      fireEvent.click(await within(fila).findByRole("button", { name: "Replicar" }, ESPERA))
      return within(fila).findByLabelText("Escribe tu réplica", undefined, ESPERA)
    },
  },
].filter(({ id }) => id === "FORO-1D10")

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

describe("FORO-1D11 · el control de réplicas", () => {
  it("FORO-1D11: sin réplicas, quien puede replicar ve «Replicar»; al abrir dice «Ocultar réplicas», es el mismo botón y conserva el foco", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [participacion(1)]
    await montar([del("maestro")])
    const fila = await filaDe("Participación 1")
    const control = within(fila).getByRole("button", { name: "Replicar" })
    control.focus()
    fireEvent.click(control)
    await waitFor(() => expect(control).toHaveTextContent("Ocultar réplicas"))
    expect(control).toHaveFocus()
    expect(control).toHaveAttribute("aria-expanded", "true")
    fireEvent.click(control)
    await waitFor(() => expect(control).toHaveTextContent("Replicar"))
    expect(control).toHaveFocus()
  })

  it("FORO-1D11: con réplicas, «Ver réplicas (n)»; al abrir se ven y al plegar vuelve a decir «Ver réplicas (n)»", async () => {
    estado.rol = "estudiante"
    estado.participaciones[FORO_A] = [participacion(1, { replicas: [replica(1), replica(2)] })]
    await montar([del("estudiante")])
    const fila = await filaDe("Participación 1")
    const control = within(fila).getByRole("button", { name: "Ver réplicas (2)" })
    fireEvent.click(control)
    expect(await within(fila).findByText("Réplica 2", undefined, ESPERA)).toBeInTheDocument()
    expect(control).toHaveTextContent("Ocultar réplicas")
    fireEvent.click(control)
    await waitFor(() => expect(control).toHaveTextContent("Ver réplicas (2)"))
    expect(within(fila).queryByText("Réplica 2")).toBeNull()
  })

  it("FORO-1D11: con 0 en la lista y réplicas que llegan al abrir el bloque, al plegar dice «Ver réplicas (n)» con lo visto (O-r1-2)", async () => {
    estado.rol = "maestro"
    const principal = participacion(1)
    estado.participaciones[FORO_A] = [principal]
    await montar([del("maestro")])
    const fila = await filaDe("Participación 1")
    // Otra persona replicó después de cargar la lista.
    principal.replicas.push(replica(1))
    const control = within(fila).getByRole("button", { name: "Replicar" })
    fireEvent.click(control)
    expect(await within(fila).findByText("Réplica 1", undefined, ESPERA)).toBeInTheDocument()
    fireEvent.click(control)
    await waitFor(() => expect(control).toHaveTextContent("Ver réplicas (1)"))
  })

  it("FORO-1D11: el admin sin réplicas no ve el control; con réplicas, «Ver réplicas (n)»", async () => {
    estado.rol = "admin"
    estado.participaciones[FORO_A] = [
      participacion(1),
      participacion(2, { replicas: [replica(1)] }),
    ]
    await montar([del("admin")])
    const sin = await filaDe("Participación 1")
    const con = await filaDe("Participación 2")
    expect(within(sin).queryByRole("button", { name: /réplicas|Replicar/ })).toBeNull()
    expect(within(con).getByRole("button", { name: "Ver réplicas (1)" })).toBeInTheDocument()
  })

  it("FORO-1D11: el alumno que no puede replicar no ve «Replicar» ni el formulario; el que puede, sí", async () => {
    estado.participaciones[FORO_A] = [participacion(1)]
    await montar([del("estudiante")])
    const fila = await filaDe("Participación 1")
    await screen.findByText("Todavía no participas.", undefined, ESPERA)
    expect(within(fila).queryByRole("button", { name: "Replicar" })).toBeNull()
    cleanup()
    estado.mia = { ...miaInicial(), puedeReplicar: true }
    await montar([del("estudiante")])
    const otra = await filaDe("Participación 1")
    fireEvent.click(await within(otra).findByRole("button", { name: "Replicar" }, ESPERA))
    expect(
      await within(otra).findByLabelText("Escribe tu réplica", undefined, ESPERA),
    ).toBeInTheDocument()
  })
})

describe("FORO-1D12 · publicar una réplica", () => {
  it("FORO-1D12: la réplica se agrega al bloque sin pedirlo otra vez, el conteo sube, el campo se vacía y el foco vuelve al campo", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [participacion(1)]
    await montar([del("maestro")])
    const fila = await filaDe("Participación 1")
    const control = within(fila).getByRole("button", { name: "Replicar" })
    fireEvent.click(control)
    const campo = await within(fila).findByLabelText("Escribe tu réplica", undefined, ESPERA)
    await reposar()
    const lecturas = pedidas("GET", API_REPLICAS(participacion(1).id)).length
    fireEvent.change(campo, { target: { value: "Buena idea." } })
    fireEvent.click(within(fila).getByRole("button", { name: "Publicar réplica" }))
    expect(await within(fila).findByText("Buena idea.", undefined, ESPERA)).toBeInTheDocument()
    await waitFor(() => expect(campo).toHaveValue(""))
    await waitFor(() => expect(campo).toHaveFocus())
    await reposar()
    expect(pedidas("GET", API_REPLICAS(participacion(1).id))).toHaveLength(lecturas)
    fireEvent.click(control)
    await waitFor(() => expect(control).toHaveTextContent("Ver réplicas (1)"))
  })

  it("FORO-1D12: con 404 PARTICIPACION_NO_ENCONTRADA avisa «Esa participación ya no existe.» y renueva la lista", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [participacion(1)]
    await montar([del("maestro")])
    const fila = await filaDe("Participación 1")
    fireEvent.click(within(fila).getByRole("button", { name: "Replicar" }))
    const campo = await within(fila).findByLabelText("Escribe tu réplica", undefined, ESPERA)
    await reposar()
    const antes = pedidas("GET", API_PARTICIPACIONES()).length
    estado.participaciones[FORO_A] = []
    fireEvent.change(campo, { target: { value: "Tarde." } })
    fireEvent.click(within(fila).getByRole("button", { name: "Publicar réplica" }))
    await waitFor(
      () => expect(aviso.error).toHaveBeenCalledWith("Esa participación ya no existe."),
      ESPERA,
    )
    await waitFor(
      () => expect(pedidas("GET", API_PARTICIPACIONES()).length).toBeGreaterThan(antes),
      ESPERA,
    )
    await waitFor(() => expect(screen.queryByText("Participación 1")).toBeNull(), ESPERA)
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })

  it("FORO-1D12: abrir las réplicas de una principal que ya no existe (404 PARTICIPACION_NO_ENCONTRADA) dice «Esa participación ya no existe.» en el bloque, sin aviso, y renueva la lista una vez", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [participacion(1, { replicas: [replica(1)] })]
    await montar([del("maestro")])
    const fila = await filaDe("Participación 1")
    await reposar()
    const antes = pedidas("GET", API_PARTICIPACIONES()).length
    // Otra persona la borró: sus réplicas responden 404 y la lista renovada queda en vuelo.
    estado.participaciones[FORO_A] = []
    const lista = enVuelo()
    estado.falla = ({ url }) => (url.pathname === API_PARTICIPACIONES() ? lista.promesa : undefined)
    fireEvent.click(within(fila).getByRole("button", { name: "Ver réplicas (1)" }))
    expect(
      await within(fila).findByText("Esa participación ya no existe.", undefined, ESPERA),
    ).toBeInTheDocument()
    await waitFor(
      () => expect(pedidas("GET", API_PARTICIPACIONES())).toHaveLength(antes + 1),
      ESPERA,
    )
    lista.soltar(respuestaJson(200, { participaciones: [], siguienteCursor: null }))
    await waitFor(() => expect(screen.queryByText("Participación 1")).toBeNull(), ESPERA)
    await reposar(300)
    expect(pedidas("GET", API_PARTICIPACIONES())).toHaveLength(antes + 1)
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

describe("FORO-1D50 · guardas de las réplicas", () => {
  it("FORO-1D50: dos clics en el mismo render de «Publicar réplica» mandan una sola petición", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [participacion(1)]
    await montar([del("maestro")])
    const fila = await filaDe("Participación 1")
    fireEvent.click(within(fila).getByRole("button", { name: "Replicar" }))
    const campo = await within(fila).findByLabelText("Escribe tu réplica", undefined, ESPERA)
    const pendiente = enVuelo()
    estado.falla = ({ metodo }) => (metodo === "POST" ? pendiente.promesa : undefined)
    fireEvent.change(campo, { target: { value: "Una vez." } })
    const boton = within(fila).getByRole("button", { name: "Publicar réplica" })
    act(() => {
      fireEvent.click(boton)
      fireEvent.click(boton)
    })
    await reposar()
    expect(pedidas("POST", API_REPLICAS(participacion(1).id))).toHaveLength(1)
    pendiente.soltar(errorApi(500, "ERROR_INTERNO"))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
  })

  it("FORO-1D50: dos clics en el mismo render de «Ver más réplicas» piden una sola página, y la página siguiente lleva el foco a la primera réplica nueva", async () => {
    estado.rol = "maestro"
    const muchas = Array.from({ length: 25 }, (_, i) => replica(i + 1))
    estado.participaciones[FORO_A] = [participacion(1, { replicas: muchas })]
    await montar([del("maestro")])
    const fila = await filaDe("Participación 1")
    fireEvent.click(within(fila).getByRole("button", { name: "Ver réplicas (25)" }))
    const verMas = await within(fila).findByRole("button", { name: "Ver más réplicas" }, ESPERA)
    verMas.focus()
    act(() => {
      fireEvent.click(verMas)
      fireEvent.click(verMas)
    })
    const nueva = await filaDe("Réplica 21")
    const conCursor = pedidas("GET", API_REPLICAS(participacion(1).id)).filter(({ url }) =>
      url.searchParams.has("cursor"),
    )
    expect(conCursor).toHaveLength(1)
    await waitFor(() => expect(nueva).toHaveFocus(), ESPERA)
  })
})

describe("FORO-1D53 · replicar no avisa ante un código con que apiClient redirige", () => {
  it.each([
    ["401 sin refresco", "/login"],
    ["403 ACCESO_RESTRINGIDO", "/acceso-restringido"],
    ["403 CAMBIO_DE_CONTRASENA_REQUERIDO", "/cambiar-contrasena"],
  ] as const)("FORO-1D53: publicar una réplica con %s no avisa", async (nombre, destino) => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [participacion(1)]
    await montar([del("maestro")])
    const fila = await filaDe("Participación 1")
    fireEvent.click(within(fila).getByRole("button", { name: "Replicar" }))
    const campo = await within(fila).findByLabelText("Escribe tu réplica", undefined, ESPERA)
    if (nombre === "401 sin refresco") estado.refrescoFalla = true
    estado.falla = ({ metodo }) => {
      if (metodo !== "POST") return undefined
      if (nombre === "401 sin refresco") return errorApi(401, "NO_AUTENTICADO")
      if (nombre === "403 ACCESO_RESTRINGIDO") return errorApi(403, "ACCESO_RESTRINGIDO")
      return errorApi(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
    }
    fireEvent.change(campo, { target: { value: "Algo." } })
    fireEvent.click(within(fila).getByRole("button", { name: "Publicar réplica" }))
    await waitFor(() => expect(irA).toHaveBeenCalledWith(destino), ESPERA)
    await reposar(300)
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

// Corrección tras la verificación del manager (M-11, M-12 y el detalle de useReplicas).
describe("FORO-1D12 · el maestro replica con el foro vencido (M-11)", () => {
  it("FORO-1D12: con el foro vencido y sin tardías, el maestro ve «Escribe tu réplica», publica y la réplica entra al bloque", async () => {
    estado.rol = "maestro"
    estado.foros[FORO_A] = { titulo: "Debate de la unidad", existe: true, vencido: true }
    // Para el alumno, el foro ya cerró: no participa ni replica.
    estado.mia = { ...miaInicial(), puedeParticipar: false, puedeReplicar: false }
    estado.participaciones[FORO_A] = [participacion(1)]
    await montar([del("maestro")])
    const fila = await filaDe("Participación 1")
    fireEvent.click(within(fila).getByRole("button", { name: "Replicar" }))
    const campo = await within(fila).findByLabelText("Escribe tu réplica", undefined, ESPERA)
    fireEvent.change(campo, { target: { value: "Respondo después de la fecha." } })
    fireEvent.click(within(fila).getByRole("button", { name: "Publicar réplica" }))
    const nueva = await filaDe("Respondo después de la fecha.")
    expect(fila).toContainElement(nueva)
    expect(pedidas("POST", API_REPLICAS(participacion(1).id))).toHaveLength(1)
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

const TEXTO_RECARGA_REPLICAS =
  "No pudimos actualizar las réplicas. Mostramos la última versión que tenemos."
const veinticincoReplicas = () => Array.from({ length: 25 }, (_, i) => replica(i + 1))

describe("FORO-1D51 · las listas de réplicas (M-12)", () => {
  it("FORO-1D51: «Ver más réplicas» que falla (503) conserva las réplicas, avisa una vez, el botón sale de la espera y el foco se queda en él", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [participacion(1, { replicas: veinticincoReplicas() })]
    await montar([del("maestro")])
    const fila = await filaDe("Participación 1")
    fireEvent.click(within(fila).getByRole("button", { name: "Ver réplicas (25)" }))
    await filaDe("Réplica 20")
    estado.falla = ({ url }) =>
      url.pathname === API_REPLICAS(participacion(1).id) && url.searchParams.has("cursor")
        ? errorApi(503, "SERVICIO_OCUPADO")
        : undefined
    const verMas = within(fila).getByRole("button", { name: "Ver más réplicas" })
    verMas.focus()
    fireEvent.click(verMas)
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(within(fila).getByText("Réplica 20")).toBeInTheDocument()
    const otraVez = within(fila).getByRole("button", { name: "Ver más réplicas" })
    expect(otraVez).not.toHaveAttribute("aria-busy", "true")
    expect(otraVez).toHaveFocus()
  })

  it("FORO-1D51: una recarga fallida del bloque con réplicas a la vista las conserva y avisa una vez; el siguiente fallo avisa otra vez; una lectura correcta no avisa", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [participacion(1, { replicas: [replica(1)] })]
    const { queryClient } = await montar([del("maestro")])
    const fila = await filaDe("Participación 1")
    fireEvent.click(within(fila).getByRole("button", { name: "Ver réplicas (1)" }))
    await filaDe("Réplica 1")
    const clave = claveReplicas(CLASE, FORO_A, participacion(1).id)
    estado.falla = ({ url }) =>
      url.pathname === API_REPLICAS(participacion(1).id)
        ? errorApi(503, "SERVICIO_OCUPADO")
        : undefined
    await act(() => queryClient.invalidateQueries({ queryKey: clave }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(TEXTO_RECARGA_REPLICAS), ESPERA)
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(within(fila).getByText("Réplica 1")).toBeInTheDocument()
    await act(() => queryClient.invalidateQueries({ queryKey: clave }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2), ESPERA)
    estado.falla = () => undefined
    await act(() => queryClient.invalidateQueries({ queryKey: clave }))
    await reposar(300)
    expect(aviso.error).toHaveBeenCalledTimes(2)
    expect(within(fila).getByText("Réplica 1")).toBeInTheDocument()
  })

  it("FORO-1D51: cerrar y volver a abrir el bloque con un fallo ya avisado (y su recarga en vuelo) no lo repite (memoria por consulta)", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [participacion(1, { replicas: [replica(1)] })]
    const { queryClient } = await montar([del("maestro")])
    const fila = await filaDe("Participación 1")
    const control = within(fila).getByRole("button", { name: "Ver réplicas (1)" })
    fireEvent.click(control)
    await filaDe("Réplica 1")
    const clave = claveReplicas(CLASE, FORO_A, participacion(1).id)
    estado.falla = ({ url }) =>
      url.pathname === API_REPLICAS(participacion(1).id)
        ? errorApi(503, "SERVICIO_OCUPADO")
        : undefined
    await act(() => queryClient.invalidateQueries({ queryKey: clave }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await reposar()
    const pendiente = enVuelo()
    estado.falla = ({ url }) =>
      url.pathname === API_REPLICAS(participacion(1).id) ? pendiente.promesa : undefined
    fireEvent.click(control)
    await waitFor(() => expect(control).toHaveAttribute("aria-expanded", "false"))
    fireEvent.click(control)
    await filaDe("Réplica 1")
    await reposar(300)
    expect(aviso.error).toHaveBeenCalledTimes(1)
    pendiente.soltar(
      respuestaJson(200, {
        replicas: [participacionJson(replica(1), true)],
        siguienteCursor: null,
      }),
    )
    await reposar(300)
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["el cursor vencido", "cursor"],
    ["un 403 SIN_ACCESO_A_LA_CLASE (reemplaza la vista)", "sin-acceso"],
    ["un 409 CLASE_ARCHIVADA", "archivada"],
    ["un 403 ACCESO_RESTRINGIDO (apiClient redirige)", "redirige"],
    ["un 404 PARTICIPACION_NO_ENCONTRADA (la lista se renueva)", "no-encontrada"],
  ] as const)(
    "FORO-1D51: una recarga del bloque con réplicas a la vista que falla con %s no avisa «No pudimos actualizar las réplicas…»",
    async (_nombre, clase) => {
      estado.rol = "maestro"
      estado.participaciones[FORO_A] = [participacion(1, { replicas: veinticincoReplicas() })]
      const { queryClient } = await montar([del("maestro")])
      const fila = await filaDe("Participación 1")
      fireEvent.click(within(fila).getByRole("button", { name: "Ver réplicas (25)" }))
      await filaDe("Réplica 20")
      fireEvent.click(within(fila).getByRole("button", { name: "Ver más réplicas" }))
      await filaDe("Réplica 21")
      await reposar()
      const ruta = API_REPLICAS(participacion(1).id)
      estado.falla = ({ url }) => {
        if (url.pathname !== ruta) return undefined
        if (clase === "cursor") {
          return url.searchParams.has("cursor")
            ? errorApi(400, "VALIDACION", "cursor: no es válido")
            : undefined
        }
        if (clase === "sin-acceso") return errorApi(403, "SIN_ACCESO_A_LA_CLASE")
        if (clase === "archivada") {
          return errorApi(409, "CLASE_ARCHIVADA", "La clase está archivada.")
        }
        if (clase === "redirige") return errorApi(403, "ACCESO_RESTRINGIDO")
        return errorApi(404, "PARTICIPACION_NO_ENCONTRADA", "Esa participación ya no existe.")
      }
      await act(() =>
        queryClient.invalidateQueries({
          queryKey: claveReplicas(CLASE, FORO_A, participacion(1).id),
        }),
      )
      await reposar(1500)
      expect(aviso.error).not.toHaveBeenCalledWith(TEXTO_RECARGA_REPLICAS)
    },
  )

  it("FORO-1D51: dos bloques de principales distintas no heredan el aviso; si los dos fallan a la vez, sale un aviso por bloque", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [
      participacion(1, { replicas: [replica(1)] }),
      participacion(2, { replicas: [replica(2)] }),
    ]
    const { queryClient } = await montar([del("maestro")])
    const primera = await filaDe("Participación 1")
    const segunda = await filaDe("Participación 2")
    fireEvent.click(within(primera).getByRole("button", { name: "Ver réplicas (1)" }))
    fireEvent.click(within(segunda).getByRole("button", { name: "Ver réplicas (1)" }))
    await filaDe("Réplica 1")
    await filaDe("Réplica 2")
    const claveA = claveReplicas(CLASE, FORO_A, participacion(1).id)
    const claveB = claveReplicas(CLASE, FORO_A, participacion(2).id)
    const fallan = new Set<string>()
    estado.falla = ({ url }) =>
      fallan.has(url.pathname) ? errorApi(503, "SERVICIO_OCUPADO") : undefined
    // Falla solo A: un aviso. Después falla solo B: el aviso de A no lo calla.
    fallan.add(API_REPLICAS(participacion(1).id))
    await act(() => queryClient.invalidateQueries({ queryKey: claveA }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    fallan.clear()
    fallan.add(API_REPLICAS(participacion(2).id))
    await act(() => queryClient.invalidateQueries({ queryKey: claveB }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2), ESPERA)
    // Los dos a la vez: un aviso por bloque, cada uno de su propia lista.
    fallan.add(API_REPLICAS(participacion(1).id))
    await act(() =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: claveA }),
        queryClient.invalidateQueries({ queryKey: claveB }),
      ]),
    )
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(4), ESPERA)
    await reposar(300)
    expect(aviso.error).toHaveBeenCalledTimes(4)
    for (const llamada of aviso.error.mock.calls) expect(llamada[0]).toBe(TEXTO_RECARGA_REPLICAS)
  })
})

describe("FORO-1D42 · el bloque de réplicas que se vuelve a abrir con un fallo viejo (detalle de useReplicas)", () => {
  it("FORO-1D42: con un fallo de las réplicas que reemplazaría la vista en la caché, volver a abrir el bloque no pide el foro por el fallo viejo; solo la lectura nueva que falla lo pide una vez, sin ciclo", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [participacion(1, { replicas: [replica(1)] })]
    const ruta = API_REPLICAS(participacion(1).id)
    let pendiente: ReturnType<typeof enVuelo> | null = null
    // Servidor inconsistente: el foro responde 200 y las réplicas, 403 SIN_ACCESO_A_LA_CLASE.
    estado.falla = ({ url }) => {
      if (url.pathname !== ruta) return undefined
      if (pendiente !== null) return pendiente.promesa
      return errorApi(403, "SIN_ACCESO_A_LA_CLASE")
    }
    await montar([del("maestro")])
    const fila = await filaDe("Participación 1")
    const control = within(fila).getByRole("button", { name: "Ver réplicas (1)" })
    fireEvent.click(control)
    expect(
      await within(fila).findByText("No pudimos cargar las réplicas.", undefined, ESPERA),
    ).toBeInTheDocument()
    await reposar(1500)
    const foroTrasAbrir = pedidas("GET", API_FORO()).length
    // Cerrar y volver a abrir con la lectura nueva en vuelo: el fallo viejo no pide el foro.
    const retenida = enVuelo()
    pendiente = retenida
    fireEvent.click(control)
    await waitFor(() => expect(control).toHaveAttribute("aria-expanded", "false"))
    fireEvent.click(control)
    await waitFor(() => expect(control).toHaveAttribute("aria-expanded", "true"))
    await reposar(300)
    expect(pedidas("GET", API_FORO())).toHaveLength(foroTrasAbrir)
    // La lectura nueva falla (con su reintento): el foro se pide una sola vez más.
    pendiente = null
    retenida.soltar(errorApi(403, "SIN_ACCESO_A_LA_CLASE"))
    await reposar(1500)
    expect(pedidas("GET", API_FORO())).toHaveLength(foroTrasAbrir + 1)
    await reposar(1500)
    expect(pedidas("GET", API_FORO())).toHaveLength(foroTrasAbrir + 1)
  })

  it("FORO-1D42: con réplicas a la vista y una recarga que falló con un código que reemplazaría la vista, volver a abrir el bloque no pide el foro por ese fallo; solo la lectura nueva que falla lo pide una vez", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [participacion(1, { replicas: [replica(1)] })]
    const ruta = API_REPLICAS(participacion(1).id)
    const { queryClient } = await montar([del("maestro")])
    const fila = await filaDe("Participación 1")
    const control = within(fila).getByRole("button", { name: "Ver réplicas (1)" })
    fireEvent.click(control)
    await filaDe("Réplica 1")
    let pendiente: ReturnType<typeof enVuelo> | null = null
    // Servidor inconsistente: el foro responde 200 y las réplicas, 403 SIN_ACCESO_A_LA_CLASE.
    estado.falla = ({ url }) => {
      if (url.pathname !== ruta) return undefined
      if (pendiente !== null) return pendiente.promesa
      return errorApi(403, "SIN_ACCESO_A_LA_CLASE")
    }
    const foroAntes = pedidas("GET", API_FORO()).length
    await act(() =>
      queryClient.invalidateQueries({
        queryKey: claveReplicas(CLASE, FORO_A, participacion(1).id),
      }),
    )
    await reposar(1500)
    // El fallo de la recarga pide el foro una vez; el bloque conserva la réplica.
    const foroTrasElFallo = pedidas("GET", API_FORO()).length
    expect(foroTrasElFallo).toBe(foroAntes + 1)
    expect(within(fila).getByText("Réplica 1")).toBeInTheDocument()
    // Cerrar y volver a abrir con la lectura nueva en vuelo: el fallo viejo (con sus datos) no pide el
    // foro otra vez.
    const retenida = enVuelo()
    pendiente = retenida
    fireEvent.click(control)
    await waitFor(() => expect(control).toHaveAttribute("aria-expanded", "false"))
    fireEvent.click(control)
    await filaDe("Réplica 1")
    await reposar(300)
    expect(pedidas("GET", API_FORO())).toHaveLength(foroTrasElFallo)
    pendiente = null
    retenida.soltar(errorApi(403, "SIN_ACCESO_A_LA_CLASE"))
    await reposar(1500)
    expect(pedidas("GET", API_FORO())).toHaveLength(foroTrasElFallo + 1)
    await reposar(1500)
    expect(pedidas("GET", API_FORO())).toHaveLength(foroTrasElFallo + 1)
  })
})
