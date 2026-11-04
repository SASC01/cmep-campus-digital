import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "./providers"

// CLASES-03c1 (CL3-C05, CL3-C06, CL3-C07, CL3-C12, CL3-C13 y CL3-C18) con el router real (`rutas`) y
// el QueryClient de app/providers.tsx (staleTime de 30 s, un reintento): las rutas de "Personas" y sus
// redirecciones, "Personas" por perspectiva, "Avisos" sin "Crear tarea" y las frases R1 y R2 por cada
// camino (§D-10).

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
  Toaster: () => null,
}))

type Rol = "estudiante" | "maestro" | "admin"

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TEMA_1 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0001"
const TEMA_2 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0002"
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const OTRO_MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d10", nombre: "Marta Ruiz" }
const FIRMA = { ...MAESTRO, administracion: false }
const BASES: Record<Rol, string> = {
  estudiante: "/estudiante/clases",
  maestro: "/maestro/clases",
  admin: "/admin/clases",
}
const R1 = "Los avisos cambiaron mientras los veías. Vuelve a abrir Avisos para verlos completos."
const R2 =
  "Este tema cambió mientras lo veías. Vuelve a abrir Actividades de aprendizaje para verlo completo."
const ESPERA = { timeout: 5000 }

const idPublicacion = (n: number) => `5a5b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const idElemento = (tema: number, n: number) =>
  `6a6b3c4d-1c1f-4b8e-9a1e-${String(tema * 1000 + n).padStart(12, "0")}`
const idCandidato = (n: number) => `9a9b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const publicacion = (n: number) => ({
  id: idPublicacion(n),
  tipo: "anuncio",
  titulo: null,
  texto: `Aviso ${String(n)}`,
  autor: FIRMA,
  creadoEn: "2026-10-01T15:30:00.000Z",
  comentarios: 0,
  tarea: null,
  adjuntos: [],
  puedeBorrar: false,
})

const material = (tema: number, n: number) => ({
  id: idElemento(tema, n),
  tipo: "material",
  titulo: `Material ${String(tema)}.${String(n)}`,
  autor: FIRMA,
  creadoEn: "2026-10-01T15:30:00.000Z",
  material: { texto: "", adjuntos: [] },
  tarea: null,
  puedeMover: false,
  entrega: null,
})

// Paginación real (cursor = id de la última fila); un cursor que ya no está responde 400 VALIDACION
// "cursor: no es válido", como el adaptador.
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

const cursorInvalido = () =>
  respuestaJson(400, { error: { codigo: "VALIDACION", mensaje: "cursor: no es válido" } })

interface Estado {
  publicaciones: ReturnType<typeof publicacion>[]
  elementos: Record<string, ReturnType<typeof material>[]>
  maestros: (typeof MAESTRO)[]
  candidatos: { id: string; nombre: string; correoEnmascarado: string; yaInscrito: boolean }[]
  temasFallan: boolean
  // Promesa que retiene la página siguiente de los avisos (para ver el botón en espera).
  retenerPaginaDeAvisos: Promise<void> | null
}

const crearServidor = (rol: Rol) => {
  const estado: Estado = {
    publicaciones: Array.from({ length: 25 }, (_, i) => publicacion(i + 1)),
    elementos: {
      [TEMA_1]: Array.from({ length: 7 }, (_, i) => material(1, i + 1)),
      [TEMA_2]: Array.from({ length: 2 }, (_, i) => material(2, i + 1)),
    },
    maestros: [MAESTRO],
    candidatos: [
      { id: idCandidato(1), nombre: "Ana Uno", correoEnmascarado: "a***@x.mx", yaInscrito: false },
      { id: idCandidato(2), nombre: "Ana Dos", correoEnmascarado: "b***@x.mx", yaInscrito: false },
    ],
    temasFallan: false,
    retenerPaginaDeAvisos: null,
  }
  const fetchMock = vi.fn<typeof fetch>(async (entrada, init) => {
    const ruta = String(entrada)
    const url = new URL(ruta, "http://x")
    const metodo = init?.method ?? "GET"
    const base = `/api/clases/${CLASE_ID}`
    if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "restaurado" })
    if (ruta === "/api/me") {
      return respuestaJson(200, {
        id: "4a4b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
        nombre: "Ana López",
        email: "ana@ejemplo.mx",
        rol,
        debeCambiarContrasena: false,
        accesoRestringido: false,
      })
    }
    if (url.pathname === "/api/clases/inscritas" || url.pathname === "/api/clases/impartidas") {
      return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
    }
    if (url.pathname === base) {
      return respuestaJson(200, {
        clase: {
          id: CLASE_ID,
          nombre: "Historia",
          descripcion: null,
          maestro: estado.maestros[0],
          maestros: estado.maestros,
        },
      })
    }
    if (url.pathname === `${base}/codigo`) return respuestaJson(200, { codigo: "ABCDEFG" })
    if (url.pathname === `${base}/personas`) {
      const conCorreo = estado.maestros.map((m) => ({ ...m, email: "luis@ejemplo.mx" }))
      return respuestaJson(200, {
        maestro: conCorreo[0],
        maestros: conCorreo,
        alumnos: [{ id: idCandidato(9), nombre: "Pedro Paz", email: "pedro@ejemplo.mx" }],
        totalAlumnos: 1,
        siguienteCursor: null,
      })
    }
    if (url.pathname === `${base}/alumnos/candidatos`) {
      return respuestaJson(200, { candidatos: estado.candidatos, hayMas: false })
    }
    if (url.pathname === `${base}/alumnos` && metodo === "POST") {
      const { alumnoId } = JSON.parse(String(init?.body)) as { alumnoId: string }
      estado.candidatos = estado.candidatos.map((c) =>
        c.id === alumnoId ? { ...c, yaInscrito: true } : c,
      )
      const elegido = estado.candidatos.find((c) => c.id === alumnoId)
      return respuestaJson(201, {
        alumno: { id: alumnoId, nombre: elegido?.nombre ?? "Alumno" },
        yaEstaba: false,
      })
    }
    if (url.pathname === `${base}/alumnos`) {
      return respuestaJson(200, { alumnos: [], total: 0, siguienteCursor: null })
    }
    if (url.pathname === "/api/admin/maestros/candidatos") {
      return respuestaJson(200, {
        candidatos: [{ ...OTRO_MAESTRO, email: "marta@ejemplo.mx" }],
        hayMas: false,
      })
    }
    if (url.pathname === `/api/admin/clases/${CLASE_ID}/maestros` && metodo === "POST") {
      estado.maestros = [MAESTRO, OTRO_MAESTRO]
      return respuestaJson(201, { maestros: estado.maestros })
    }
    if (url.pathname === `${base}/publicaciones`) {
      if (url.searchParams.has("cursor") && estado.retenerPaginaDeAvisos !== null) {
        await estado.retenerPaginaDeAvisos
      }
      const r = paginar(estado.publicaciones, url)
      if (r === null) return cursorInvalido()
      return respuestaJson(200, { publicaciones: r.pagina, siguienteCursor: r.siguiente })
    }
    if (url.pathname === `${base}/temas`) {
      if (estado.temasFallan) {
        return respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "Falló." } })
      }
      return respuestaJson(200, {
        temas: [
          { id: TEMA_1, nombre: "Unidad 1", orden: 0, elementos: estado.elementos[TEMA_1]?.length },
          { id: TEMA_2, nombre: "Unidad 2", orden: 1, elementos: estado.elementos[TEMA_2]?.length },
        ],
        sinTema: 0,
      })
    }
    if (url.pathname === `${base}/trabajo`) {
      const r = paginar(estado.elementos[url.searchParams.get("tema") ?? ""] ?? [], url)
      if (r === null) return cursorInvalido()
      return respuestaJson(200, { elementos: r.pagina, siguienteCursor: r.siguiente })
    }
    return respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "no esperada" } })
  })
  vi.stubGlobal("fetch", fetchMock)
  return { estado, fetchMock }
}

const montar = async (entradas: string[], indice = entradas.length - 1) => {
  const { rutas } = await import("./router")
  const router = createMemoryRouter(rutas, { initialEntries: entradas, initialIndex: indice })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return router
}

type FetchMock = ReturnType<typeof crearServidor>["fetchMock"]

// Las peticiones GET cuya ruta (sin la consulta) es la dada, con su consulta.
const pedidas = (fetchMock: FetchMock, pathname: string) =>
  fetchMock.mock.calls
    .filter(([, init]) => (init?.method ?? "GET") === "GET")
    .map(([entrada]) => new URL(String(entrada), "http://x"))
    .filter((url) => url.pathname === pathname)

const reposar = () => act(() => new Promise((resolver) => setTimeout(resolver, 200)))
const enLasSecciones = (nombre: string) =>
  within(screen.getByRole("list", { name: "Secciones de la clase" })).getByRole("link", {
    name: nombre,
  })

beforeAll(async () => {
  await import("./router")
}, 60_000)

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("rutas de la clase (CL3-C05)", () => {
  it.each(["estudiante", "maestro", "admin"] as const)(
    "CL3-C05: %s en …/personas monta «Personas» con su sección activa",
    async (rol) => {
      crearServidor(rol)
      const router = await montar([`${BASES[rol]}/${CLASE_ID}/personas`])
      expect(await screen.findByRole("heading", { name: "Alumnos" }, ESPERA)).toBeInTheDocument()
      expect(router.state.location.pathname).toBe(`${BASES[rol]}/${CLASE_ID}/personas`)
      expect(enLasSecciones("Personas")).toHaveAttribute("aria-current", "page")
    },
  )

  it.each([
    ["maestro", "alumnos"],
    ["admin", "alumnos"],
    ["admin", "maestros"],
  ] as const)(
    "CL3-C05: %s en …/%s llega a …/personas con replace: atrás no vuelve a la ruta vieja",
    async (rol, vieja) => {
      crearServidor(rol)
      const avisos = `${BASES[rol]}/${CLASE_ID}`
      const router = await montar([avisos, `${avisos}/${vieja}`])
      await waitFor(() => expect(router.state.location.pathname).toBe(`${avisos}/personas`))
      expect(router.state.historyAction).toBe("REPLACE")
      expect(await screen.findByRole("heading", { name: "Alumnos" }, ESPERA)).toBeInTheDocument()
      await act(() => router.navigate(-1))
      expect(router.state.location.pathname).toBe(avisos)
      await act(() => router.navigate(1))
      expect(router.state.location.pathname).toBe(`${avisos}/personas`)
    },
  )

  it.each(["estudiante", "maestro", "admin"] as const)(
    "CL3-C05: %s en …/trabajo sigue montando «Actividades de aprendizaje»",
    async (rol) => {
      crearServidor(rol)
      await montar([`${BASES[rol]}/${CLASE_ID}/trabajo`])
      expect(
        await screen.findByRole("heading", { name: "Actividades de aprendizaje" }, ESPERA),
      ).toBeInTheDocument()
      expect(await screen.findByText("Material 1.1", undefined, ESPERA)).toBeInTheDocument()
      expect(enLasSecciones("Actividades de aprendizaje")).toHaveAttribute("aria-current", "page")
    },
  )
})

describe("«Personas» por perspectiva (CL3-C06)", () => {
  it("CL3-C06: el estudiante ve lo de antes: su maestro con correo y sus compañeros, sin buscador", async () => {
    crearServidor("estudiante")
    await montar([`${BASES.estudiante}/${CLASE_ID}/personas`])
    expect(await screen.findByRole("heading", { name: "Maestro" }, ESPERA)).toBeInTheDocument()
    expect(screen.getByText("luis@ejemplo.mx")).toBeInTheDocument()
    expect(screen.getByText("Pedro Paz")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Agregar alumnos" })).toBeNull()
    expect(screen.queryByRole("heading", { name: "Maestros de la clase" })).toBeNull()
  })

  it("CL3-C06: el maestro ve sus maestros de solo lectura (sin «Quitar») y el roster con el buscador, sin petición nueva para los maestros", async () => {
    const { fetchMock } = crearServidor("maestro")
    await montar([`${BASES.maestro}/${CLASE_ID}/personas`])
    const panelDeMaestros = (
      await screen.findByRole("heading", { name: "Maestro" }, ESPERA)
    ).closest<HTMLElement>('[data-slot="card"]')
    if (panelDeMaestros === null) throw new Error("Precondición: el panel de los maestros")
    expect(within(panelDeMaestros).getByText("Luis Pérez")).toBeInTheDocument()
    expect(within(panelDeMaestros).queryByRole("button")).toBeNull()
    expect(screen.queryByRole("button", { name: /Quitar/ })).toBeNull()
    expect(screen.getByRole("heading", { name: "Agregar alumnos" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Alumnos" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Asignar maestro" })).toBeNull()
    await reposar()
    expect(pedidas(fetchMock, `/api/clases/${CLASE_ID}`)).toHaveLength(1)
    expect(pedidas(fetchMock, `/api/clases/${CLASE_ID}/personas`)).toHaveLength(0)
  })

  it("CL3-C06: el admin ve la asignación de maestros y el roster con el buscador, maestros arriba", async () => {
    crearServidor("admin")
    await montar([`${BASES.admin}/${CLASE_ID}/personas`])
    const maestros = await screen.findByRole("heading", { name: "Maestros de la clase" }, ESPERA)
    const alumnos = await screen.findByRole("heading", { name: "Alumnos" }, ESPERA)
    expect(screen.getByRole("heading", { name: "Asignar maestro" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Agregar alumnos" })).toBeInTheDocument()
    expect(screen.getAllByRole("heading", { name: "Maestros de la clase" })).toHaveLength(1)
    expect(screen.getAllByRole("heading", { name: "Alumnos" })).toHaveLength(1)
    expect(
      maestros.compareDocumentPosition(alumnos) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})

describe("«Personas» del admin: el foco de los dos buscadores (CL3-C07)", () => {
  const buscar = (campo: string, texto: string) =>
    fireEvent.change(screen.getByRole("textbox", { name: campo }), { target: { value: texto } })

  it("CL3-C07: con el foco en una fila del buscador de alumnos que pierde su botón, el foco va al siguiente «Agregar», no al encabezado de los maestros", async () => {
    crearServidor("admin")
    await montar([`${BASES.admin}/${CLASE_ID}/personas`])
    await screen.findByRole("heading", { name: "Maestros de la clase" }, ESPERA)
    buscar("Buscar alumno por nombre", "Ana")
    const primero = await screen.findByRole(
      "button",
      { name: "Agregar a la clase Ana Uno" },
      ESPERA,
    )
    act(() => primero.focus())
    fireEvent.click(primero)
    expect(await screen.findByText("Ya está en la clase", undefined, ESPERA)).toBeInTheDocument()
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Agregar a la clase Ana Dos" }),
      ),
    )
    await reposar()
    expect(document.activeElement).not.toBe(
      screen.getByRole("heading", { name: "Maestros de la clase" }),
    )
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Agregar a la clase Ana Dos" }),
    )
  })

  it("CL3-C07: el buscador de maestros sigue su regla: al llegar a dos maestros desaparece y el foco va al encabezado de los maestros", async () => {
    crearServidor("admin")
    await montar([`${BASES.admin}/${CLASE_ID}/personas`])
    await screen.findByRole("heading", { name: "Maestros de la clase" }, ESPERA)
    buscar("Buscar maestro por nombre", "Marta")
    const asignar = await screen.findByRole(
      "button",
      { name: "Asignar a la clase Marta Ruiz" },
      ESPERA,
    )
    act(() => asignar.focus())
    fireEvent.click(asignar)
    await waitFor(
      () =>
        expect(document.activeElement).toBe(
          screen.getByRole("heading", { name: "Maestros de la clase" }),
        ),
      ESPERA,
    )
    expect(screen.queryByRole("textbox", { name: "Buscar maestro por nombre" })).toBeNull()
  })
})

describe("«Avisos» (CL3-C18)", () => {
  it.each(["estudiante", "maestro", "admin"] as const)(
    "CL3-C18: %s no ve «Crear tarea» en Avisos",
    async (rol) => {
      crearServidor(rol)
      await montar([`${BASES[rol]}/${CLASE_ID}`])
      expect(await screen.findByText("Aviso 1", undefined, ESPERA)).toBeInTheDocument()
      expect(screen.queryByRole("link", { name: /Crear tarea/ })).toBeNull()
      expect(screen.getByRole("heading", { name: "Avisos" })).toBeInTheDocument()
    },
  )

  it.each([
    ["estudiante", "Aún no hay avisos en esta clase."],
    ["maestro", "Publica el primer aviso de tu clase."],
    ["admin", "Publica el primer aviso de esta clase."],
  ] as const)("CL3-C18: el vacío de %s dice «%s»", async (rol, texto) => {
    const { estado } = crearServidor(rol)
    estado.publicaciones = []
    await montar([`${BASES[rol]}/${CLASE_ID}`])
    expect(await screen.findByText(texto, undefined, ESPERA)).toBeInTheDocument()
  })

  it("CL3-C18: «Ver más avisos» queda en espera mientras la lista se pide y vuelve a estar disponible al llegar", async () => {
    const { estado } = crearServidor("estudiante")
    let soltar: () => void = () => undefined
    estado.retenerPaginaDeAvisos = new Promise<void>((resolver) => (soltar = resolver))
    await montar([`${BASES.estudiante}/${CLASE_ID}`])
    const verMas = await screen.findByRole("button", { name: "Ver más avisos" }, ESPERA)
    expect(verMas).not.toHaveAttribute("aria-busy", "true")
    fireEvent.click(verMas)
    await waitFor(() => expect(verMas).toHaveAttribute("aria-busy", "true"))
    soltar()
    expect(await screen.findByText("Aviso 25", undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Ver más avisos" })).toBeNull()
  })
})

// Avisos con la frase R1: la primera página (20) cargada y el aviso del cursor borrado antes de
// "Ver más avisos".
const avisosConR1 = async (entradas = [`${BASES.estudiante}/${CLASE_ID}`]) => {
  const servidor = crearServidor("estudiante")
  const router = await montar(entradas)
  const verMas = await screen.findByRole("button", { name: "Ver más avisos" }, ESPERA)
  servidor.estado.publicaciones = servidor.estado.publicaciones.filter(
    (p) => p.id !== idPublicacion(20),
  )
  fireEvent.click(verMas)
  expect(await screen.findByText(R1, undefined, ESPERA)).toBeInTheDocument()
  return { ...servidor, router }
}

const primerasPaginas = (fetchMock: FetchMock, pathname: string) =>
  pedidas(fetchMock, pathname).filter((url) => !url.searchParams.has("cursor")).length

describe("R1, «Vuelve a abrir Avisos», por cada camino (CL3-C12)", () => {
  const AVISOS = `/api/clases/${CLASE_ID}/publicaciones`

  it("CL3-C12 (a): pulsar «Avisos» estando en Avisos pide la primera página sin cursor y la frase desaparece", async () => {
    const { fetchMock } = await avisosConR1()
    const antes = primerasPaginas(fetchMock, AVISOS)
    fireEvent.click(enLasSecciones("Avisos"))
    expect(await screen.findByText("Aviso 21", undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText(R1)).toBeNull()
    expect(primerasPaginas(fetchMock, AVISOS)).toBeGreaterThan(antes)
  })

  it("CL3-C12 (b): ir a «Personas» y volver a «Avisos» antes de 30 s pide la lista y la frase desaparece", async () => {
    const { fetchMock } = await avisosConR1()
    const antes = primerasPaginas(fetchMock, AVISOS)
    fireEvent.click(enLasSecciones("Personas"))
    await screen.findByRole("heading", { name: "Alumnos" }, ESPERA)
    fireEvent.click(enLasSecciones("Avisos"))
    expect(await screen.findByText("Aviso 21", undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText(R1)).toBeNull()
    expect(primerasPaginas(fetchMock, AVISOS)).toBeGreaterThan(antes)
  })

  it("CL3-C12 (c): atrás y adelante del historial piden la lista y la frase desaparece", async () => {
    const personas = `${BASES.estudiante}/${CLASE_ID}/personas`
    const { fetchMock, router } = await avisosConR1([personas, `${BASES.estudiante}/${CLASE_ID}`])
    const antes = primerasPaginas(fetchMock, AVISOS)
    await act(() => router.navigate(-1))
    await screen.findByRole("heading", { name: "Alumnos" }, ESPERA)
    await act(() => router.navigate(1))
    expect(await screen.findByText("Aviso 21", undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText(R1)).toBeNull()
    expect(primerasPaginas(fetchMock, AVISOS)).toBeGreaterThan(antes)
  })

  it("CL3-C12 (d): con la frase a la vista no hay «Ver más avisos»", async () => {
    await avisosConR1()
    expect(screen.queryByRole("button", { name: "Ver más avisos" })).toBeNull()
  })

  it("CL3-C12: con la lista sana, pulsar «Avisos» no pide nada", async () => {
    const { fetchMock } = crearServidor("estudiante")
    await montar([`${BASES.estudiante}/${CLASE_ID}`])
    await screen.findByText("Aviso 1", undefined, ESPERA)
    await reposar()
    const antes = pedidas(fetchMock, AVISOS).length
    fireEvent.click(enLasSecciones("Avisos"))
    await reposar()
    expect(pedidas(fetchMock, AVISOS)).toHaveLength(antes)
    expect(screen.getByText("Aviso 1")).toBeInTheDocument()
  })
})

// Actividades con la frase R2 en "Unidad 1": su primera página (5 de 7) cargada y el elemento del
// cursor borrado antes de "Ver más de Unidad 1". "Unidad 2" (2 elementos) queda sana.
const actividadesConR2 = async (entradas = [`${BASES.estudiante}/${CLASE_ID}/trabajo`]) => {
  const servidor = crearServidor("estudiante")
  const router = await montar(entradas)
  const verMas = await screen.findByRole("button", { name: "Ver más de Unidad 1" }, ESPERA)
  await screen.findByText("Material 2.2", undefined, ESPERA)
  const tema1 = servidor.estado.elementos[TEMA_1] ?? []
  servidor.estado.elementos[TEMA_1] = tema1.filter((e) => e.id !== idElemento(1, 5))
  fireEvent.click(verMas)
  expect(await screen.findByText(R2, undefined, ESPERA)).toBeInTheDocument()
  return { ...servidor, router }
}

const pedidasDelTema = (fetchMock: FetchMock, tema: string) =>
  pedidas(fetchMock, `/api/clases/${CLASE_ID}/trabajo`).filter(
    (url) => url.searchParams.get("tema") === tema,
  )

describe("R2, «Vuelve a abrir Actividades de aprendizaje», por cada camino (CL3-C13)", () => {
  it("CL3-C13 (a): pulsar «Actividades de aprendizaje» estando ahí pide la primera página del tema en error (sin cursor) y los temas sanos no piden nada", async () => {
    const { fetchMock } = await actividadesConR2()
    await reposar()
    const tema1Antes = pedidasDelTema(fetchMock, TEMA_1).length
    const tema2Antes = pedidasDelTema(fetchMock, TEMA_2).length
    const temasAntes = pedidas(fetchMock, `/api/clases/${CLASE_ID}/temas`).length
    fireEvent.click(enLasSecciones("Actividades de aprendizaje"))
    expect(await screen.findByText("Material 1.1", undefined, ESPERA)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText(R2)).toBeNull())
    const nuevas = pedidasDelTema(fetchMock, TEMA_1).slice(tema1Antes)
    expect(nuevas.length).toBeGreaterThan(0)
    expect(nuevas.every((url) => !url.searchParams.has("cursor"))).toBe(true)
    await reposar()
    expect(pedidasDelTema(fetchMock, TEMA_2)).toHaveLength(tema2Antes)
    expect(pedidas(fetchMock, `/api/clases/${CLASE_ID}/temas`)).toHaveLength(temasAntes)
  })

  it("CL3-C13 (a): con la lista de temas en error, pulsar «Actividades de aprendizaje» la vuelve a pedir", async () => {
    const { estado, fetchMock } = crearServidor("estudiante")
    estado.temasFallan = true
    await montar([`${BASES.estudiante}/${CLASE_ID}/trabajo`])
    expect(await screen.findByRole("alert", undefined, ESPERA)).toBeInTheDocument()
    const antes = pedidas(fetchMock, `/api/clases/${CLASE_ID}/temas`).length
    estado.temasFallan = false
    fireEvent.click(enLasSecciones("Actividades de aprendizaje"))
    expect(await screen.findByText("Material 1.1", undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(pedidas(fetchMock, `/api/clases/${CLASE_ID}/temas`).length).toBeGreaterThan(antes)
  })

  it("CL3-C13 (b): ir a «Personas» y volver antes de 30 s pide el tema y la frase desaparece", async () => {
    const { fetchMock } = await actividadesConR2()
    const antes = pedidasDelTema(fetchMock, TEMA_1).length
    fireEvent.click(enLasSecciones("Personas"))
    await screen.findByRole("heading", { name: "Alumnos" }, ESPERA)
    fireEvent.click(enLasSecciones("Actividades de aprendizaje"))
    expect(await screen.findByText("Material 1.1", undefined, ESPERA)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText(R2)).toBeNull())
    expect(pedidasDelTema(fetchMock, TEMA_1).length).toBeGreaterThan(antes)
  })

  it("CL3-C13 (c): atrás y adelante del historial piden el tema y la frase desaparece", async () => {
    const personas = `${BASES.estudiante}/${CLASE_ID}/personas`
    const { fetchMock, router } = await actividadesConR2([
      personas,
      `${BASES.estudiante}/${CLASE_ID}/trabajo`,
    ])
    const antes = pedidasDelTema(fetchMock, TEMA_1).length
    await act(() => router.navigate(-1))
    await screen.findByRole("heading", { name: "Alumnos" }, ESPERA)
    await act(() => router.navigate(1))
    expect(await screen.findByText("Material 1.1", undefined, ESPERA)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText(R2)).toBeNull())
    expect(pedidasDelTema(fetchMock, TEMA_1).length).toBeGreaterThan(antes)
  })

  it("CL3-C13 (d): con la frase a la vista no hay «Ver más de Unidad 1»", async () => {
    await actividadesConR2()
    expect(screen.queryByRole("button", { name: "Ver más de Unidad 1" })).toBeNull()
  })
})
