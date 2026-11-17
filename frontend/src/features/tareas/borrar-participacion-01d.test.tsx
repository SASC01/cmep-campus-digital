// FORO-01d (§D-11, E3-3, §D-10): el admin borra participaciones y réplicas, con el router real (`rutas`)
// y el QueryClient de app/providers.tsx. FORO-1D35 a FORO-1D38 y las partes de borrar de FORO-1D50 y
// FORO-1D53.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import { clavePrefijoDeCalificaciones } from "@/services/calificacionesService"
import { claveListaDeForos } from "@/services/trabajoService"

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

const CONFIRMAR_PRINCIPAL =
  "Se borrará con sus réplicas. Si el alumno ya tiene calificación, se conserva."
const CONFIRMAR_REPLICA = "Se borrará esta réplica."

const borrarDe = (fila: HTMLElement) => within(fila).getByRole("button", { name: /^Borrar/ })
const borrados = () => estado.llamadas.filter(({ metodo }) => metodo === "DELETE")

const conTres = () => {
  estado.rol = "admin"
  estado.participaciones[FORO_A] = [participacion(1), participacion(2), participacion(3)]
}

describe("FORO-1D35 · «Borrar» solo para el admin, con su confirmación en línea", () => {
  it("FORO-1D35: el admin ve «Borrar» en cada principal y en cada réplica; el maestro y el alumno no", async () => {
    estado.rol = "admin"
    estado.participaciones[FORO_A] = [participacion(1, { replicas: [replica(1)] })]
    await montar([del("admin")])
    const fila = await filaDe("Participación 1")
    expect(borrarDe(fila)).toHaveAccessibleName("Borrar participación de Beto Ruiz")
    fireEvent.click(within(fila).getByRole("button", { name: "Ver réplicas (1)" }))
    const filaReplica = await filaDe("Réplica 1")
    expect(borrarDe(filaReplica)).toHaveAccessibleName("Borrar réplica de Luis Pérez")
    for (const rol of ["maestro", "estudiante"] as const) {
      cleanup()
      estado.rol = rol
      await montar([del(rol)])
      const otra = await filaDe("Participación 1")
      expect(within(otra).queryByRole("button", { name: /^Borrar/ })).toBeNull()
    }
  })

  it("FORO-1D35: en una clase archivada el admin no ve «Borrar»", async () => {
    estado.rol = "admin"
    estado.archivada = true
    estado.participaciones[FORO_A] = [participacion(1)]
    await montar([del("admin")])
    const fila = await filaDe("Participación 1")
    await reposar()
    expect(within(fila).queryByRole("button", { name: /^Borrar/ })).toBeNull()
  })

  it("FORO-1D35: la confirmación de una principal y la de una réplica, con sus textos; «Cancelar» la cierra y devuelve el foco a «Borrar»", async () => {
    estado.rol = "admin"
    estado.participaciones[FORO_A] = [participacion(1, { replicas: [replica(1)] })]
    await montar([del("admin")])
    const fila = await filaDe("Participación 1")
    fireEvent.click(borrarDe(fila))
    expect(within(fila).getByText(CONFIRMAR_PRINCIPAL)).toBeInTheDocument()
    await waitFor(() =>
      expect(within(fila).getByRole("button", { name: "Cancelar" })).toHaveFocus(),
    )
    fireEvent.click(within(fila).getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(borrarDe(fila)).toHaveFocus())
    fireEvent.click(within(fila).getByRole("button", { name: "Ver réplicas (1)" }))
    const filaReplica = await filaDe("Réplica 1")
    fireEvent.click(borrarDe(filaReplica))
    expect(within(filaReplica).getByText(CONFIRMAR_REPLICA)).toBeInTheDocument()
    expect(
      within(filaReplica).getByRole("button", { name: "Sí, borrar réplica" }),
    ).toBeInTheDocument()
    expect(borrados()).toHaveLength(0)
  })

  it.each([
    ["Sí, borrar participación", false],
    ["Sí, borrar réplica", true],
  ] as const)(
    "FORO-1D50: dos clics en el mismo render de «%s» mandan un solo DELETE",
    async (boton, esReplica) => {
      estado.rol = "admin"
      estado.participaciones[FORO_A] = [participacion(1, { replicas: [replica(1)] })]
      await montar([del("admin")])
      let fila = await filaDe("Participación 1")
      if (esReplica) {
        fireEvent.click(within(fila).getByRole("button", { name: "Ver réplicas (1)" }))
        fila = await filaDe("Réplica 1")
      }
      const pendiente = enVuelo()
      estado.falla = ({ metodo }) => (metodo === "DELETE" ? pendiente.promesa : undefined)
      fireEvent.click(borrarDe(fila))
      const si = within(fila).getByRole("button", { name: boton })
      act(() => {
        fireEvent.click(si)
        fireEvent.click(si)
      })
      await reposar()
      expect(borrados()).toHaveLength(1)
      pendiente.soltar(new Response(null, { status: 204 }))
      await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    },
  )
})

describe("FORO-1D36 · los errores de borrar", () => {
  it("FORO-1D36: con 404 PARTICIPACION_NO_ENCONTRADA avisa «Esa participación ya no existe.», renueva la lista y la fila sale", async () => {
    conTres()
    await montar([del("admin")])
    const fila = await filaDe("Participación 2")
    // Otra persona ya la borró.
    estado.participaciones[FORO_A] = [participacion(1), participacion(3)]
    fireEvent.click(borrarDe(fila))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar participación" }))
    await waitFor(
      () => expect(aviso.error).toHaveBeenCalledWith("Esa participación ya no existe."),
      ESPERA,
    )
    await waitFor(() => expect(screen.queryByText("Participación 2")).toBeNull(), ESPERA)
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })

  it("FORO-1D36: con 403 BORRADO_NO_PERMITIDO avisa con el texto del servidor y renueva la lista", async () => {
    conTres()
    await montar([del("admin")])
    const fila = await filaDe("Participación 2")
    await reposar()
    const antes = pedidas("GET", API_PARTICIPACIONES()).length
    estado.falla = ({ metodo }) =>
      metodo === "DELETE"
        ? errorApi(403, "BORRADO_NO_PERMITIDO", "No puedes borrar esto.")
        : undefined
    fireEvent.click(borrarDe(fila))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar participación" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith("No puedes borrar esto."), ESPERA)
    await waitFor(
      () => expect(pedidas("GET", API_PARTICIPACIONES()).length).toBeGreaterThan(antes),
      ESPERA,
    )
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })

  it("FORO-1D36: con un 5xx, un solo aviso; la confirmación sigue abierta y el botón sale de la espera", async () => {
    conTres()
    await montar([del("admin")])
    const fila = await filaDe("Participación 2")
    estado.falla = ({ metodo }) =>
      metodo === "DELETE" ? errorApi(500, "ERROR_INTERNO") : undefined
    fireEvent.click(borrarDe(fila))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar participación" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await reposar()
    expect(aviso.error).toHaveBeenCalledWith("Algo salió mal. Inténtalo de nuevo.")
    const si = within(fila).getByRole("button", { name: "Sí, borrar participación" })
    expect(si).not.toHaveAttribute("aria-busy", "true")
  })

  it("FORO-1D36: con 409 CLASE_ARCHIVADA avisa con el texto del servidor, la clase se vuelve a pedir y «Borrar» desaparece", async () => {
    conTres()
    await montar([del("admin")])
    const fila = await filaDe("Participación 2")
    estado.falla = ({ metodo }) => {
      if (metodo !== "DELETE") return undefined
      estado.archivada = true
      return errorApi(409, "CLASE_ARCHIVADA", "Esta clase está archivada.")
    }
    fireEvent.click(borrarDe(fila))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar participación" }))
    await waitFor(
      () => expect(aviso.error).toHaveBeenCalledWith("Esta clase está archivada."),
      ESPERA,
    )
    await waitFor(
      () => expect(screen.queryAllByRole("button", { name: /^Borrar/ })).toHaveLength(0),
      ESPERA,
    )
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })
})

describe("FORO-1D37 · repetir «Sí, borrar …» tras un 5xx", () => {
  it("FORO-1D37: tras un 5xx, el mismo botón vuelve a pedir el borrado y con éxito avisa «Participación borrada»", async () => {
    conTres()
    await montar([del("admin")])
    const fila = await filaDe("Participación 2")
    let primera = true
    estado.falla = ({ metodo }) => {
      if (metodo !== "DELETE" || !primera) return undefined
      primera = false
      return errorApi(500, "ERROR_INTERNO")
    }
    fireEvent.click(borrarDe(fila))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar participación" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await waitFor(() =>
      expect(
        within(fila).getByRole("button", { name: "Sí, borrar participación" }),
      ).not.toHaveAttribute("aria-busy", "true"),
    )
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar participación" }))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Participación borrada"), ESPERA)
    expect(borrados()).toHaveLength(2)
    await waitFor(() => expect(screen.queryByText("Participación 2")).toBeNull(), ESPERA)
  })
})

describe("FORO-1D37 · lo que se renueva al borrar", () => {
  it("FORO-1D37: con éxito se marcan viejas la lista de «Foro» (el conteo) y las calificaciones de la clase, y la lista de principales se vuelve a pedir", async () => {
    conTres()
    const { queryClient } = await montar([del("admin")])
    const fila = await filaDe("Participación 2")
    queryClient.setQueryData(claveListaDeForos(CLASE), { pages: [], pageParams: [] })
    queryClient.setQueryData([...clavePrefijoDeCalificaciones(CLASE), "gradebook"], {})
    await reposar()
    const antes = pedidas("GET", API_PARTICIPACIONES()).length
    fireEvent.click(borrarDe(fila))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar participación" }))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Participación borrada"), ESPERA)
    await waitFor(
      () => expect(pedidas("GET", API_PARTICIPACIONES()).length).toBeGreaterThan(antes),
      ESPERA,
    )
    expect(queryClient.getQueryState(claveListaDeForos(CLASE))?.isInvalidated).toBe(true)
    expect(
      queryClient.getQueryState([...clavePrefijoDeCalificaciones(CLASE), "gradebook"])
        ?.isInvalidated,
    ).toBe(true)
  })

  it("FORO-1D37: borrar una principal saca de la caché el bloque de sus réplicas", async () => {
    estado.rol = "admin"
    estado.participaciones[FORO_A] = [
      participacion(1, { replicas: [replica(1)] }),
      participacion(2),
    ]
    const { queryClient } = await montar([del("admin")])
    const fila = await filaDe("Participación 1")
    fireEvent.click(within(fila).getByRole("button", { name: "Ver réplicas (1)" }))
    await filaDe("Réplica 1")
    fireEvent.click(within(fila).getByRole("button", { name: "Ocultar réplicas" }))
    expect(
      queryClient.getQueryState(claveReplicas(CLASE, FORO_A, participacion(1).id)),
    ).toBeDefined()
    fireEvent.click(borrarDe(fila))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar participación" }))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Participación borrada"), ESPERA)
    await waitFor(() =>
      expect(
        queryClient.getQueryState(claveReplicas(CLASE, FORO_A, participacion(1).id)),
      ).toBeUndefined(),
    )
  })
})

describe("FORO-1D38 · el foco tras borrar y el conteo de réplicas", () => {
  it("FORO-1D38: al borrar una principal de en medio, el foco va al «Borrar» de la que ocupa su lugar; la última, al de la anterior; sin vecinas, al h3", async () => {
    conTres()
    await montar([del("admin")])
    const segunda = await filaDe("Participación 2")
    fireEvent.click(borrarDe(segunda))
    fireEvent.click(within(segunda).getByRole("button", { name: "Sí, borrar participación" }))
    const tercera = await filaDe("Participación 3")
    await waitFor(() => expect(borrarDe(tercera)).toHaveFocus(), ESPERA)
    fireEvent.click(borrarDe(tercera))
    fireEvent.click(within(tercera).getByRole("button", { name: "Sí, borrar participación" }))
    const primera = await filaDe("Participación 1")
    await waitFor(() => expect(borrarDe(primera)).toHaveFocus(), ESPERA)
    fireEvent.click(borrarDe(primera))
    fireEvent.click(within(primera).getByRole("button", { name: "Sí, borrar participación" }))
    await waitFor(
      () =>
        expect(screen.getByRole("heading", { level: 3, name: "Participaciones" })).toHaveFocus(),
      ESPERA,
    )
    expect(document.activeElement).not.toBe(document.body)
  })

  it("FORO-1D38: al borrar una réplica, el foco va al «Borrar» de la vecina y el conteo de la principal baja; sin vecinas, al encabezado del bloque", async () => {
    estado.rol = "admin"
    estado.participaciones[FORO_A] = [participacion(1, { replicas: [replica(1), replica(2)] })]
    await montar([del("admin")])
    const fila = await filaDe("Participación 1")
    const control = within(fila).getByRole("button", { name: "Ver réplicas (2)" })
    fireEvent.click(control)
    const r1 = await filaDe("Réplica 1")
    fireEvent.click(borrarDe(r1))
    fireEvent.click(within(r1).getByRole("button", { name: "Sí, borrar réplica" }))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Réplica borrada"), ESPERA)
    const r2 = await filaDe("Réplica 2")
    await waitFor(() => expect(borrarDe(r2)).toHaveFocus(), ESPERA)
    // Al plegar, el conteo ya dice 1.
    fireEvent.click(control)
    await waitFor(() => expect(control).toHaveTextContent("Ver réplicas (1)"), ESPERA)
    fireEvent.click(control)
    const otraVez = await filaDe("Réplica 2")
    fireEvent.click(borrarDe(otraVez))
    fireEvent.click(within(otraVez).getByRole("button", { name: "Sí, borrar réplica" }))
    await waitFor(
      () => expect(within(fila).getByRole("heading", { level: 4, name: "Réplicas" })).toHaveFocus(),
      ESPERA,
    )
    expect(document.activeElement).not.toBe(document.body)
  })
})

describe("FORO-1D53 · borrar no avisa ante un código con que apiClient redirige", () => {
  it.each([
    ["401 sin refresco", "/login"],
    ["403 ACCESO_RESTRINGIDO", "/acceso-restringido"],
    ["403 CAMBIO_DE_CONTRASENA_REQUERIDO", "/cambiar-contrasena"],
  ] as const)("FORO-1D53: borrar una participación con %s no avisa", async (nombre, destino) => {
    conTres()
    await montar([del("admin")])
    const fila = await filaDe("Participación 2")
    if (nombre === "401 sin refresco") estado.refrescoFalla = true
    estado.falla = ({ metodo }) => {
      if (metodo !== "DELETE") return undefined
      if (nombre === "401 sin refresco") return errorApi(401, "NO_AUTENTICADO")
      if (nombre === "403 ACCESO_RESTRINGIDO") return errorApi(403, "ACCESO_RESTRINGIDO")
      return errorApi(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
    }
    fireEvent.click(borrarDe(fila))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar participación" }))
    await waitFor(() => expect(irA).toHaveBeenCalledWith(destino), ESPERA)
    await reposar(300)
    expect(aviso.error).not.toHaveBeenCalled()
  })
})
