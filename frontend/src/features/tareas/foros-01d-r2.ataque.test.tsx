// FORO-01d, ronda 2 del tester: los remedios de T-01 (la unión por la última aparición) y de T-02 (el
// foco al encabezado si se pierde), y el aviso de O-01d-2. Router real (`rutas`) y el QueryClient de
// app/providers.tsx (staleTime de 30 s, un reintento). El doble del servidor es el de
// participar-01d.test.tsx, copiado. Ids desde ATQ-FORO-142.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

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

const conFoco = async <T,>(prueba: () => Promise<T>): Promise<T> => {
  const hasFocus = vi.spyOn(document, "hasFocus").mockReturnValue(true)
  try {
    return await prueba()
  } finally {
    hasFocus.mockRestore()
  }
}
const encabezado = () => screen.getByRole("heading", { level: 3, name: "Participaciones" })
const P = (n: number) => uuid("8a8b3c4d", n)

describe("ATQ-FORO-142 · los hermanos de T-02 al publicar: FORO_CERRADO y PARTICIPACION_CALIFICADA", () => {
  it.each([
    [
      "FORO_CERRADO",
      "Este foro ya no recibe participaciones.",
      { puedeParticipar: false, puedeReplicar: false },
    ],
    [
      "PARTICIPACION_CALIFICADA",
      "Tu participación ya está calificada.",
      { puedeParticipar: false, estado: "calificado" as const },
    ],
  ] as const)(
    "ATQ-FORO-142: un 409 %s que cambia el formulario lleva el foco al encabezado «Participaciones», nunca a <body>, con un solo aviso",
    async (codigo, mensaje, cambio) =>
      conFoco(async () => {
        estado.falla = ({ metodo, url }) => {
          if (metodo !== "POST" || url.pathname !== API_PARTICIPACIONES()) return undefined
          estado.mia = { ...estado.mia, ...cambio }
          return errorApi(409, codigo, mensaje)
        }
        await montar([del("estudiante")])
        await tituloDelForo()
        const lista = await seccionDeParticipaciones()
        await within(lista).findByText(
          "Aún no hay participaciones en este foro.",
          undefined,
          ESPERA,
        )
        fireEvent.change(within(lista).getByLabelText("Escribe tu participación"), {
          target: { value: "Mi aporte" },
        })
        const boton = within(lista).getByRole("button", { name: "Publicar participación" })
        boton.focus()
        fireEvent.click(boton)
        await waitFor(
          () =>
            expect(
              within(lista).queryByRole("button", { name: "Publicar participación" }),
            ).toBeNull(),
          ESPERA,
        )
        await reposar(300)
        expect(document.activeElement).not.toBe(document.body)
        expect(document.activeElement).toBe(encabezado())
        expect(aviso.error).toHaveBeenCalledTimes(1)
        expect(aviso.error).toHaveBeenCalledWith(mensaje)
      }),
  )
})

describe("ATQ-FORO-143 · el gancho de foco no roba el foco que la persona movió fuera del bloque", () => {
  it("ATQ-FORO-143: con el foco movido a «Editar foro», una recarga que quita la principal (y su bloque con el campo) no lo mueve", async () =>
    conFoco(async () => {
      estado.rol = "maestro"
      estado.participaciones[FORO_A] = [
        participacion(1, { replicas: [participacion(101, { texto: "Una réplica" })] }),
        participacion(2),
      ]
      const { queryClient } = await montar([del("maestro")])
      await tituloDelForo()
      const lista = await seccionDeParticipaciones()
      fireEvent.click(
        await within(lista).findByRole("button", { name: "Ver réplicas (1)" }, ESPERA),
      )
      await within(lista).findByText("Una réplica", undefined, ESPERA)
      const campo = within(lista).getByLabelText("Escribe tu réplica")
      campo.focus()
      expect(campo).toHaveFocus()
      const editar = screen.getByRole("link", { name: "Editar foro" })
      editar.focus()
      expect(editar).toHaveFocus()
      estado.participaciones[FORO_A] = (estado.participaciones[FORO_A] ?? []).slice(1)
      await act(() =>
        queryClient.invalidateQueries({
          queryKey: claveParticipaciones(CLASE, FORO_A),
          exact: true,
        }),
      )
      await waitFor(() => expect(within(lista).queryByText("Participación 1")).toBeNull(), ESPERA)
      await reposar(300)
      expect(editar).toHaveFocus()
    }))

  it("ATQ-FORO-143: con el foco en el «Ver réplicas» de otra principal, una recarga que quita la principal de arriba no lo mueve", async () =>
    conFoco(async () => {
      estado.rol = "maestro"
      estado.participaciones[FORO_A] = [
        participacion(1),
        participacion(2, { replicas: [participacion(102, { texto: "Otra réplica" })] }),
      ]
      const { queryClient } = await montar([del("maestro")])
      await tituloDelForo()
      const lista = await seccionDeParticipaciones()
      const control = await within(lista).findByRole("button", { name: "Ver réplicas (1)" }, ESPERA)
      control.focus()
      estado.participaciones[FORO_A] = (estado.participaciones[FORO_A] ?? []).slice(1)
      await act(() =>
        queryClient.invalidateQueries({
          queryKey: claveParticipaciones(CLASE, FORO_A),
          exact: true,
        }),
      )
      await waitFor(() => expect(within(lista).queryByText("Participación 1")).toBeNull(), ESPERA)
      await reposar(300)
      expect(control).toHaveFocus()
    }))
})

describe("ATQ-FORO-144 · el foco cuando una recarga de la lista quita la fila enfocada", () => {
  it("ATQ-FORO-144: con el foco en «Ver réplicas» de la principal que desaparece, el foco va al encabezado «Participaciones»", async () =>
    conFoco(async () => {
      estado.rol = "maestro"
      estado.participaciones[FORO_A] = [
        participacion(1, { replicas: [participacion(101, { texto: "Una réplica" })] }),
        participacion(2),
      ]
      const { queryClient } = await montar([del("maestro")])
      await tituloDelForo()
      const lista = await seccionDeParticipaciones()
      const control = await within(lista).findByRole("button", { name: "Ver réplicas (1)" }, ESPERA)
      control.focus()
      estado.participaciones[FORO_A] = (estado.participaciones[FORO_A] ?? []).slice(1)
      await act(() =>
        queryClient.invalidateQueries({
          queryKey: claveParticipaciones(CLASE, FORO_A),
          exact: true,
        }),
      )
      await waitFor(() => expect(within(lista).queryByText("Participación 1")).toBeNull(), ESPERA)
      await reposar(300)
      expect(document.activeElement).toBe(encabezado())
    }))

  it("ATQ-FORO-144: el admin con la confirmación de «Borrar» abierta en una principal que otra persona borró: el foco va al encabezado", async () =>
    conFoco(async () => {
      estado.rol = "admin"
      estado.participaciones[FORO_A] = [participacion(1), participacion(2)]
      const { queryClient } = await montar([del("admin")])
      await tituloDelForo()
      const fila = await filaDe("Participación 1")
      fireEvent.click(within(fila).getByRole("button", { name: /^Borrar/ }))
      await waitFor(() =>
        expect(within(fila).getByRole("button", { name: "Cancelar" })).toHaveFocus(),
      )
      estado.participaciones[FORO_A] = (estado.participaciones[FORO_A] ?? []).slice(1)
      await act(() =>
        queryClient.invalidateQueries({
          queryKey: claveParticipaciones(CLASE, FORO_A),
          exact: true,
        }),
      )
      const lista = await seccionDeParticipaciones()
      await waitFor(() => expect(within(lista).queryByText("Participación 1")).toBeNull(), ESPERA)
      await reposar(300)
      expect(document.activeElement).toBe(encabezado())
    }))
})

describe("ATQ-FORO-145 · el cursor vencido en los dos «Ver más» con el foco en el botón", () => {
  it("ATQ-FORO-145: «Ver más participaciones» con el cursor vencido deja el foco en la vista, nunca en <body>", async () =>
    conFoco(async () => {
      estado.participaciones[FORO_A] = Array.from({ length: 25 }, (_, i) => participacion(i + 1))
      await montar([del("estudiante")])
      await tituloDelForo()
      const lista = await seccionDeParticipaciones()
      const verMas = await within(lista).findByRole(
        "button",
        { name: "Ver más participaciones" },
        ESPERA,
      )
      // El cursor (la participación 20) desaparece del servidor.
      estado.participaciones[FORO_A] = (estado.participaciones[FORO_A] ?? []).filter(
        (_, i) => i !== 19,
      )
      verMas.focus()
      fireEvent.click(verMas)
      await within(lista).findByText(
        "Las participaciones cambiaron mientras las veías. Vuelve a abrir el foro para verlas completas.",
        undefined,
        ESPERA,
      )
      await reposar(300)
      expect(document.activeElement).not.toBe(document.body)
    }))

  it("ATQ-FORO-145: «Ver más réplicas» con el cursor vencido deja el foco en la vista, nunca en <body>", async () =>
    conFoco(async () => {
      estado.rol = "maestro"
      const replicas = Array.from({ length: 25 }, (_, i) =>
        participacion(100 + i, { texto: `Réplica ${String(i + 1)}` }),
      )
      estado.participaciones[FORO_A] = [participacion(1, { replicas })]
      await montar([del("maestro")])
      await tituloDelForo()
      const lista = await seccionDeParticipaciones()
      fireEvent.click(
        await within(lista).findByRole("button", { name: "Ver réplicas (25)" }, ESPERA),
      )
      const verMas = await within(lista).findByRole("button", { name: "Ver más réplicas" }, ESPERA)
      const principal = estado.participaciones[FORO_A]?.[0]
      if (principal === undefined) throw new Error("Precondición: existe la principal")
      principal.replicas = principal.replicas.filter((_, i) => i !== 19)
      verMas.focus()
      fireEvent.click(verMas)
      await within(lista).findByText(
        "Las réplicas cambiaron mientras las veías. Vuelve a abrirlas para verlas completas.",
        undefined,
        ESPERA,
      )
      await reposar(300)
      expect(document.activeElement).not.toBe(document.body)
    }))
})

describe("ATQ-FORO-146 · la unión por la última aparición y el conteo de réplicas", () => {
  const veinticinco = () =>
    Array.from({ length: 25 }, (_, i) =>
      participacion(100 + i, { texto: `Réplica ${String(i + 1)}` }),
    )

  const publicarReplica = async (lista: HTMLElement, texto: string) => {
    fireEvent.change(within(lista).getByLabelText("Escribe tu réplica"), {
      target: { value: texto },
    })
    fireEvent.click(within(lista).getByRole("button", { name: "Publicar réplica" }))
    await within(lista).findByText(texto, undefined, ESPERA)
  }
  const ordenDeReplicas = (lista: HTMLElement) =>
    Array.from(lista.querySelectorAll<HTMLElement>("[data-replica-id]")).map((fila) =>
      fila.getAttribute("data-replica-id"),
    )

  it("ATQ-FORO-146: dos réplicas seguidas con páginas pendientes quedan al final, en su orden, tras «Ver más réplicas»; el conteo plegado es 27", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [participacion(1, { replicas: veinticinco() })]
    await montar([del("maestro")])
    await tituloDelForo()
    const lista = await seccionDeParticipaciones()
    fireEvent.click(await within(lista).findByRole("button", { name: "Ver réplicas (25)" }, ESPERA))
    await within(lista).findByText("Réplica 20", undefined, ESPERA)
    await publicarReplica(lista, "Primera mía")
    await publicarReplica(lista, "Segunda mía")
    fireEvent.click(within(lista).getByRole("button", { name: "Ver más réplicas" }))
    await within(lista).findByText("Réplica 25", undefined, ESPERA)
    await reposar(200)
    const principal = estado.participaciones[FORO_A]?.[0]
    if (principal === undefined) throw new Error("Precondición: existe la principal")
    expect(ordenDeReplicas(lista)).toEqual(principal.replicas.map(({ id }) => id))
    fireEvent.click(within(lista).getByRole("button", { name: "Ocultar réplicas" }))
    expect(
      await within(lista).findByRole("button", { name: "Ver réplicas (27)" }, ESPERA),
    ).toBeInTheDocument()
  })

  it("ATQ-FORO-146: una recarga del bloque antes de «Ver más réplicas» no duplica ni pierde la réplica nueva, y el conteo plegado es 26", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [participacion(1, { replicas: veinticinco() })]
    const { queryClient } = await montar([del("maestro")])
    await tituloDelForo()
    const lista = await seccionDeParticipaciones()
    fireEvent.click(await within(lista).findByRole("button", { name: "Ver réplicas (25)" }, ESPERA))
    await within(lista).findByText("Réplica 20", undefined, ESPERA)
    await publicarReplica(lista, "La mía")
    await act(() =>
      queryClient.invalidateQueries({ queryKey: claveReplicas(CLASE, FORO_A, P(1)), exact: true }),
    )
    await reposar(300)
    fireEvent.click(await within(lista).findByRole("button", { name: "Ver más réplicas" }, ESPERA))
    await within(lista).findByText("Réplica 25", undefined, ESPERA)
    await reposar(200)
    const principal = estado.participaciones[FORO_A]?.[0]
    if (principal === undefined) throw new Error("Precondición: existe la principal")
    expect(ordenDeReplicas(lista)).toEqual(principal.replicas.map(({ id }) => id))
    expect(within(lista).getAllByText("La mía")).toHaveLength(1)
    fireEvent.click(within(lista).getByRole("button", { name: "Ocultar réplicas" }))
    expect(
      await within(lista).findByRole("button", { name: "Ver réplicas (26)" }, ESPERA),
    ).toBeInTheDocument()
  })
})

describe("ATQ-FORO-147 · O-01d-2: el aviso de la principal que desaparece", () => {
  it("ATQ-FORO-147: dos bloques abiertos cuyas principales desaparecen avisan una vez cada uno, solo «Esa participación ya no existe.»", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [
      participacion(1, { replicas: [participacion(101, { texto: "R1" })] }),
      participacion(2, { replicas: [participacion(102, { texto: "R2" })] }),
      participacion(3),
    ]
    const { queryClient } = await montar([del("maestro")])
    await tituloDelForo()
    const lista = await seccionDeParticipaciones()
    for (const boton of await within(lista).findAllByRole(
      "button",
      { name: "Ver réplicas (1)" },
      ESPERA,
    )) {
      fireEvent.click(boton)
    }
    await within(lista).findByText("R1", undefined, ESPERA)
    await within(lista).findByText("R2", undefined, ESPERA)
    estado.participaciones[FORO_A] = (estado.participaciones[FORO_A] ?? []).slice(2)
    await act(() =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: claveReplicas(CLASE, FORO_A, P(1)),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: claveReplicas(CLASE, FORO_A, P(2)),
          exact: true,
        }),
      ]),
    )
    await waitFor(() => expect(within(lista).queryByText("Participación 2")).toBeNull(), {
      timeout: 6000,
    })
    await reposar(300)
    expect(aviso.error).toHaveBeenCalledTimes(2)
    for (const [texto] of aviso.error.mock.calls) {
      expect(texto).toBe("Esa participación ya no existe.")
    }
  }, 15_000)

  it("ATQ-FORO-147: el 404 en la primera carga del bloque lo dice el bloque, sin aviso; volver a abrirlo no avisa", async () => {
    estado.rol = "maestro"
    estado.participaciones[FORO_A] = [
      participacion(1, { replicas: [participacion(101, { texto: "R1" })] }),
    ]
    estado.falla = ({ metodo, url }) =>
      metodo === "GET" && url.pathname === API_REPLICAS(P(1))
        ? errorApi(404, "PARTICIPACION_NO_ENCONTRADA", "Esa participación ya no existe.")
        : undefined
    await montar([del("maestro")])
    await tituloDelForo()
    const lista = await seccionDeParticipaciones()
    fireEvent.click(await within(lista).findByRole("button", { name: "Ver réplicas (1)" }, ESPERA))
    expect(
      await within(lista).findByText("Esa participación ya no existe.", undefined, {
        timeout: 6000,
      }),
    ).toBeInTheDocument()
    await reposar(300)
    expect(aviso.error).not.toHaveBeenCalled()
    fireEvent.click(within(lista).getByRole("button", { name: "Ocultar réplicas" }))
    fireEvent.click(within(lista).getByRole("button", { name: /^(Ver réplicas|Replicar)/ }))
    await reposar(2500)
    expect(aviso.error).not.toHaveBeenCalled()
  }, 15_000)
})
