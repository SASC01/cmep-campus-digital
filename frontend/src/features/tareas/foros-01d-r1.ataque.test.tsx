// FORO-01d, ronda 1 del tester: ataques a las participaciones, las réplicas, «Tu participación» y
// «Borrar» del admin en ForoView, con el router real (`rutas`) y el QueryClient de app/providers.tsx
// (staleTime de 30 s, un reintento). El doble del servidor es el de participar-01d.test.tsx, copiado.
// Ids desde ATQ-FORO-135.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import { claveForo } from "@/services/trabajoService"

import { claveParticipaciones, claveReplicas } from "./lib"

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

const region = () => seccionDeParticipaciones()
const lecturasNoCanonicas = () =>
  estado.llamadas.filter(
    ({ url }) =>
      decodeURIComponent(url.pathname).startsWith(`${API}/foros/`) &&
      decodeURIComponent(url.pathname) !== decodeURIComponent(url.pathname).toLowerCase(),
  )

describe("ATQ-FORO-135 · publicar con más páginas por cargar conserva el orden de la más antigua a la más reciente", () => {
  it("ATQ-FORO-135: la principal nueva del alumno queda al final de la lista después de «Ver más participaciones»", async () => {
    estado.participaciones[FORO_A] = Array.from({ length: 25 }, (_, i) => participacion(i + 1))
    await montar([del("estudiante")])
    await tituloDelForo()
    const lista = await region()
    await within(lista).findByText("Participación 20", undefined, ESPERA)
    expect(within(lista).queryByText("Participación 21")).toBeNull()
    fireEvent.change(within(lista).getByLabelText("Escribe tu participación"), {
      target: { value: "Mi aporte" },
    })
    fireEvent.click(within(lista).getByRole("button", { name: "Publicar participación" }))
    await within(lista).findByText("Mi aporte", undefined, ESPERA)
    fireEvent.click(within(lista).getByRole("button", { name: "Ver más participaciones" }))
    await within(lista).findByText("Participación 25", undefined, ESPERA)
    await reposar(200)
    const orden = Array.from(lista.querySelectorAll<HTMLElement>("[data-participacion-id]")).map(
      (fila) => fila.getAttribute("data-participacion-id"),
    )
    const esperado = [...(estado.participaciones[FORO_A] ?? []).map(({ id }) => id)]
    expect(orden).toEqual(esperado)
    expect(orden.at(-1)).toBe(estado.mia.principalId)
  })

  it("ATQ-FORO-135: la réplica nueva del maestro queda al final del bloque después de «Ver más réplicas»", async () => {
    estado.rol = "maestro"
    const replicas = Array.from({ length: 25 }, (_, i) =>
      participacion(100 + i, { texto: `Réplica ${String(i + 1)}` }),
    )
    estado.participaciones[FORO_A] = [participacion(1, { replicas })]
    await montar([del("maestro")])
    await tituloDelForo()
    const lista = await region()
    fireEvent.click(await within(lista).findByRole("button", { name: "Ver réplicas (25)" }, ESPERA))
    await within(lista).findByText("Réplica 20", undefined, ESPERA)
    expect(within(lista).queryByText("Réplica 21")).toBeNull()
    fireEvent.change(within(lista).getByLabelText("Escribe tu réplica"), {
      target: { value: "Mi réplica" },
    })
    fireEvent.click(within(lista).getByRole("button", { name: "Publicar réplica" }))
    await within(lista).findByText("Mi réplica", undefined, ESPERA)
    fireEvent.click(within(lista).getByRole("button", { name: "Ver más réplicas" }))
    await within(lista).findByText("Réplica 25", undefined, ESPERA)
    await reposar(200)
    const orden = Array.from(lista.querySelectorAll<HTMLElement>("[data-replica-id]")).map((fila) =>
      fila.getAttribute("data-replica-id"),
    )
    const principal = estado.participaciones[FORO_A]?.[0]
    if (principal === undefined) throw new Error("Precondición: existe la principal")
    expect(orden).toEqual(principal.replicas.map(({ id }) => id))
  })
})

describe("ATQ-FORO-136 · el foco cuando el formulario de la principal desaparece", () => {
  it("ATQ-FORO-136: publicar con la lista de participaciones en error deja el foco en la vista, nunca en <body>", async () => {
    const hasFocus = vi.spyOn(document, "hasFocus").mockReturnValue(true)
    try {
      estado.falla = ({ metodo, url }) =>
        metodo === "GET" && url.pathname === API_PARTICIPACIONES()
          ? errorApi(503, "SERVICIO_OCUPADO")
          : undefined
      await montar([del("estudiante")])
      await tituloDelForo()
      const lista = await region()
      await within(lista).findByText("No pudimos cargar las participaciones.", undefined, {
        timeout: 6000,
      })
      fireEvent.change(within(lista).getByLabelText("Escribe tu participación"), {
        target: { value: "Mi aporte" },
      })
      const boton = within(lista).getByRole("button", { name: "Publicar participación" })
      boton.focus()
      expect(boton).toHaveFocus()
      fireEvent.click(boton)
      await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
      await waitFor(
        () =>
          expect(
            within(lista).queryByRole("button", { name: "Publicar participación" }),
          ).toBeNull(),
        ESPERA,
      )
      await reposar(200)
      expect(document.activeElement).not.toBe(document.body)
    } finally {
      hasFocus.mockRestore()
    }
  }, 15_000)

  it("ATQ-FORO-136: un 409 PARTICIPACION_YA_PUBLICADA que quita el formulario deja el foco en la vista, nunca en <body>, y avisa una vez", async () => {
    const hasFocus = vi.spyOn(document, "hasFocus").mockReturnValue(true)
    try {
      const otra = participacion(7, { autor: ALUMNA, texto: "Publicada en otra pestaña" })
      estado.falla = ({ metodo, url }) => {
        if (metodo !== "POST" || url.pathname !== API_PARTICIPACIONES()) return undefined
        ;(estado.participaciones[FORO_A] ??= []).push(otra)
        estado.mia = {
          ...estado.mia,
          estado: "entregado",
          fechaEntrega: otra.creadoEn,
          principalId: otra.id,
          puedeParticipar: false,
          puedeReplicar: true,
        }
        return errorApi(409, "PARTICIPACION_YA_PUBLICADA", "Ya publicaste tu participación.")
      }
      await montar([del("estudiante")])
      await tituloDelForo()
      const lista = await region()
      await within(lista).findByText("Aún no hay participaciones en este foro.", undefined, ESPERA)
      fireEvent.change(within(lista).getByLabelText("Escribe tu participación"), {
        target: { value: "Mi aporte" },
      })
      const boton = within(lista).getByRole("button", { name: "Publicar participación" })
      boton.focus()
      fireEvent.click(boton)
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
      await within(lista).findByText("Publicada en otra pestaña", undefined, ESPERA)
      await reposar(300)
      expect(aviso.error).toHaveBeenCalledWith("Ya publicaste tu participación.")
      expect(aviso.error).toHaveBeenCalledTimes(1)
      expect(document.activeElement).not.toBe(document.body)
    } finally {
      hasFocus.mockRestore()
    }
  })
})

describe("ATQ-FORO-137 · la principal desaparece con el foco y una réplica a medio escribir en su bloque", () => {
  it("ATQ-FORO-137: con 404 PARTICIPACION_NO_ENCONTRADA al recargar las réplicas, el foco no cae en <body> y no hay avisos de más", async () => {
    const hasFocus = vi.spyOn(document, "hasFocus").mockReturnValue(true)
    try {
      estado.rol = "maestro"
      estado.participaciones[FORO_A] = [
        participacion(1, { replicas: [participacion(101, { texto: "Una réplica" })] }),
        participacion(2),
      ]
      const { queryClient } = await montar([del("maestro")])
      await tituloDelForo()
      const lista = await region()
      fireEvent.click(
        await within(lista).findByRole("button", { name: "Ver réplicas (1)" }, ESPERA),
      )
      await within(lista).findByText("Una réplica", undefined, ESPERA)
      const campo = within(lista).getByLabelText("Escribe tu réplica")
      fireEvent.change(campo, { target: { value: "Lo que estaba escribiendo" } })
      campo.focus()
      expect(campo).toHaveFocus()
      // Otra persona borró la principal 1.
      estado.participaciones[FORO_A] = (estado.participaciones[FORO_A] ?? []).slice(1)
      const principal = uuid("8a8b3c4d", 1)
      await act(() =>
        queryClient.invalidateQueries({
          queryKey: claveReplicas(CLASE, FORO_A, principal),
          exact: true,
        }),
      )
      await waitFor(() => expect(within(lista).queryByText("Participación 1")).toBeNull(), {
        timeout: 6000,
      })
      await reposar(300)
      expect(document.activeElement).not.toBe(document.body)
      // FORO-01d ronda 2 (arbitraje del manager, O-01d-2): la principal que desaparece avisa una sola vez
      // «Esa participación ya no existe.» (§D-9 y §D-10), nunca «No pudimos actualizar las réplicas…».
      // Sigue protegiendo el foco (arriba) y que no haya avisos de más.
      expect(aviso.error).toHaveBeenCalledTimes(1)
      expect(aviso.error).toHaveBeenCalledWith("Esa participación ya no existe.")
    } finally {
      hasFocus.mockRestore()
    }
  }, 15_000)
})

describe("ATQ-FORO-138 · controles de ATQ-FORO-136 y ATQ-FORO-137 (la conducta correcta, para comparar)", () => {
  it("ATQ-FORO-138 (control): publicar con la lista cargada lleva el foco a la participación nueva", async () => {
    const hasFocus = vi.spyOn(document, "hasFocus").mockReturnValue(true)
    try {
      await montar([del("estudiante")])
      await tituloDelForo()
      const lista = await region()
      await within(lista).findByText("Aún no hay participaciones en este foro.", undefined, ESPERA)
      fireEvent.change(within(lista).getByLabelText("Escribe tu participación"), {
        target: { value: "Mi aporte" },
      })
      const boton = within(lista).getByRole("button", { name: "Publicar participación" })
      boton.focus()
      fireEvent.click(boton)
      await within(lista).findByText("Mi aporte", undefined, ESPERA)
      await reposar(200)
      expect(document.activeElement).toHaveAttribute(
        "data-participacion-id",
        estado.mia.principalId,
      )
    } finally {
      hasFocus.mockRestore()
    }
  })

  it("ATQ-FORO-138 (control): una recarga correcta de las réplicas deja el foco y lo escrito en el campo", async () => {
    const hasFocus = vi.spyOn(document, "hasFocus").mockReturnValue(true)
    try {
      estado.rol = "maestro"
      estado.participaciones[FORO_A] = [
        participacion(1, { replicas: [participacion(101, { texto: "Una réplica" })] }),
      ]
      const { queryClient } = await montar([del("maestro")])
      await tituloDelForo()
      const lista = await region()
      fireEvent.click(
        await within(lista).findByRole("button", { name: "Ver réplicas (1)" }, ESPERA),
      )
      await within(lista).findByText("Una réplica", undefined, ESPERA)
      const campo = within(lista).getByLabelText("Escribe tu réplica")
      fireEvent.change(campo, { target: { value: "Lo que estaba escribiendo" } })
      campo.focus()
      const antes = pedidas("GET", API_REPLICAS(uuid("8a8b3c4d", 1))).length
      await act(() =>
        queryClient.invalidateQueries({
          queryKey: claveReplicas(CLASE, FORO_A, uuid("8a8b3c4d", 1)),
          exact: true,
        }),
      )
      await waitFor(() =>
        expect(pedidas("GET", API_REPLICAS(uuid("8a8b3c4d", 1))).length).toBeGreaterThan(antes),
      )
      await reposar(300)
      expect(campo).toHaveFocus()
      expect(campo).toHaveValue("Lo que estaba escribiendo")
    } finally {
      hasFocus.mockRestore()
    }
  })
})

describe("ATQ-FORO-139 · servidores inconsistentes: ningún ciclo de lecturas del foro", () => {
  it("ATQ-FORO-139: con la lista, «Tu participación» y un bloque de réplicas respondiendo un error que reemplaza la vista y el foro respondiendo bien, las lecturas del foro paran", async () => {
    estado.participaciones[FORO_A] = [
      participacion(1, { replicas: [participacion(101, { texto: "Una réplica" })] }),
    ]
    const { queryClient } = await montar([del("estudiante")])
    await tituloDelForo()
    const lista = await region()
    fireEvent.click(await within(lista).findByRole("button", { name: "Ver réplicas (1)" }, ESPERA))
    await within(lista).findByText("Una réplica", undefined, ESPERA)
    estado.falla = ({ metodo, url }) => {
      if (metodo !== "GET") return undefined
      if (url.pathname === API_PARTICIPACIONES()) return errorApi(404, "TAREA_NO_ENCONTRADA")
      if (url.pathname === API_MIA()) return errorApi(403, "SIN_ACCESO_A_LA_CLASE")
      if (url.pathname === API_REPLICAS(uuid("8a8b3c4d", 1))) {
        return errorApi(400, "VALIDACION", "foroId: debe ser un identificador válido")
      }
      return undefined
    }
    // Una recarga de todo lo del foro por su prefijo (como pedirDeNuevoElForo al borrar o descargar
    // con 403): las tres lecturas abiertas responden su error y el foro responde bien.
    const antesForo = pedidas("GET", API_FORO()).length
    const antesLecturas = [API_PARTICIPACIONES(), API_MIA(), API_REPLICAS(uuid("8a8b3c4d", 1))].map(
      (ruta) => pedidas("GET", ruta).length,
    )
    await act(() => queryClient.invalidateQueries({ queryKey: claveForo(CLASE, FORO_A) }))
    await reposar(4000)
    const aLos4 = pedidas("GET", API_FORO()).length
    await reposar(3000)
    expect(pedidas("GET", API_FORO()).length).toBe(aLos4)
    expect(aLos4 - antesForo).toBeLessThanOrEqual(4)
    // Precondición: las tres lecturas sí se volvieron a pedir y fallaron.
    const despuesLecturas = [
      API_PARTICIPACIONES(),
      API_MIA(),
      API_REPLICAS(uuid("8a8b3c4d", 1)),
    ].map((ruta) => pedidas("GET", ruta).length)
    despuesLecturas.forEach((n, i) => expect(n).toBeGreaterThan(antesLecturas[i] ?? 0))
    expect(aLos4).toBeGreaterThan(antesForo)
    expect(
      screen.getByRole("heading", { level: 2, name: "Debate de la unidad" }),
    ).toBeInTheDocument()
  }, 15_000)

  it("ATQ-FORO-139: «Borrar foro» con 403 con la lista y un bloque abiertos vuelve a pedir el foro, la lista y el bloque una vez cada uno, y nada más", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [
      participacion(1, { replicas: [participacion(101, { texto: "Una réplica" })] }),
    ]
    estado.falla = ({ metodo, url }) =>
      metodo === "DELETE" && url.pathname === API_FORO()
        ? errorApi(403, "BORRADO_NO_PERMITIDO", "Ya no puedes borrar este foro.")
        : undefined
    await montar([del("maestro")])
    await tituloDelForo()
    const lista = await region()
    fireEvent.click(await within(lista).findByRole("button", { name: "Ver réplicas (1)" }, ESPERA))
    await within(lista).findByText("Una réplica", undefined, ESPERA)
    const foro = pedidas("GET", API_FORO()).length
    const participaciones = pedidas("GET", API_PARTICIPACIONES()).length
    const replicas = pedidas("GET", API_REPLICAS(uuid("8a8b3c4d", 1))).length
    fireEvent.click(screen.getByRole("button", { name: "Borrar foro" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar foro" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await reposar(1500)
    expect(pedidas("GET", API_FORO()).length - foro).toBe(1)
    expect(pedidas("GET", API_PARTICIPACIONES()).length - participaciones).toBe(1)
    expect(pedidas("GET", API_REPLICAS(uuid("8a8b3c4d", 1))).length - replicas).toBe(1)
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })
})

describe("ATQ-FORO-140 · mayúsculas en el :foroId al publicar, replicar y borrar", () => {
  it("ATQ-FORO-140: el alumno publica y replica desde …/foros/<MAYÚSCULAS>; todo sale con el id canónico y una sola clave", async () => {
    const { queryClient } = await montar([del("estudiante", FORO_A.toUpperCase())])
    await tituloDelForo()
    const lista = await region()
    await within(lista).findByText("Aún no hay participaciones en este foro.", undefined, ESPERA)
    fireEvent.change(within(lista).getByLabelText("Escribe tu participación"), {
      target: { value: "Mi aporte" },
    })
    fireEvent.click(within(lista).getByRole("button", { name: "Publicar participación" }))
    await within(lista).findByText("Mi aporte", undefined, ESPERA)
    fireEvent.click(await within(lista).findByRole("button", { name: "Replicar" }, ESPERA))
    fireEvent.change(within(lista).getByLabelText("Escribe tu réplica"), {
      target: { value: "Mi réplica" },
    })
    fireEvent.click(within(lista).getByRole("button", { name: "Publicar réplica" }))
    await within(lista).findByText("Mi réplica", undefined, ESPERA)
    expect(lecturasNoCanonicas()).toHaveLength(0)
    const claves = queryClient
      .getQueryCache()
      .findAll({ queryKey: ["clases", CLASE, "foros", "foro"] })
      .map(({ queryKey }) => String(queryKey[4]))
    expect(new Set(claves)).toEqual(new Set([FORO_A]))
    expect(queryClient.getQueryData(claveParticipaciones(CLASE, FORO_A))).toBeDefined()
  })

  it("ATQ-FORO-140: el admin borra una principal desde …/foros/<MAYÚSCULAS> y la fila sale; ninguna petición con el id sin canonizar", async () => {
    estado.rol = "admin"
    estado.participaciones[FORO_A] = [participacion(1), participacion(2)]
    await montar([del("admin", FORO_A.toUpperCase())])
    await tituloDelForo()
    const lista = await region()
    const fila = await filaDe("Participación 1")
    fireEvent.click(within(fila).getByRole("button", { name: /^Borrar/ }))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar participación" }))
    await waitFor(() => expect(within(lista).queryByText("Participación 1")).toBeNull(), ESPERA)
    expect(lecturasNoCanonicas()).toHaveLength(0)
    expect(pedidas("DELETE", `${API_PARTICIPACIONES()}/${uuid("8a8b3c4d", 1)}`)).toHaveLength(1)
  })
})

describe("ATQ-FORO-141 · «Borrar» lo decide el dato, sea cual sea el rol, y nunca en una clase archivada", () => {
  const conPuedeBorrar = (valor: boolean) => () => {
    estado.falla = ({ metodo, url }) => {
      if (metodo !== "GET" || url.pathname !== API_PARTICIPACIONES()) return undefined
      return respuestaJson(200, {
        participaciones: (estado.participaciones[FORO_A] ?? []).map((p) => ({
          ...participacionJson(p),
          puedeBorrar: valor,
        })),
        siguienteCursor: null,
      })
    }
  }

  it.each([
    ["admin", false, false, false],
    ["estudiante", true, false, true],
    ["maestro", true, false, true],
    ["admin", true, true, false],
  ] as const)(
    "ATQ-FORO-141: %s con puedeBorrar=%s y archivada=%s ve «Borrar»: %s",
    async (rol, puedeBorrar, archivada, seVe) => {
      estado.rol = rol
      estado.archivada = archivada
      estado.participaciones[FORO_A] = [participacion(1)]
      conPuedeBorrar(puedeBorrar)()
      await montar([del(rol)])
      await tituloDelForo()
      const fila = await filaDe("Participación 1")
      await reposar(200)
      expect(within(fila).queryByRole("button", { name: /^Borrar/ }) !== null).toBe(seVe)
    },
  )
})
