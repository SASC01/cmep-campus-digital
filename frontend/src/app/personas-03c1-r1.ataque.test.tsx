import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "./providers"

// CLASES-03c1, ronda 1 del tester, con el router real (`rutas`) y el QueryClient de app/providers.tsx
// (staleTime de 30 s, un reintento): las redirecciones de …/alumnos y …/maestros con consulta, hash y
// barra final; "Personas" del admin y del maestro con las dos listas y los dos buscadores en la misma
// pantalla (ids, foco y "Ver más alumnos"); el estado de pago fuera de la vista del estudiante; y más
// caminos de R1 y R2 (§D-10): dos fallos seguidos, el enlace de la clase en la barra lateral y dos
// temas en error a la vez.

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
const ESPERA = { timeout: 8000 }

const id = (prefijo: string, n: number) =>
  `${prefijo}-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const idPublicacion = (n: number) => id("5a5b3c4d", n)
const idElemento = (tema: number, n: number) => id("6a6b3c4d", tema * 1000 + n)
const idCandidato = (n: number) => id("9a9b3c4d", n)
const idAlumno = (n: number) => id("7a7b3c4d", n)

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorInterno = () =>
  respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "Falló." } })
const cursorInvalido = () =>
  respuestaJson(400, { error: { codigo: "VALIDACION", mensaje: "cursor: no es válido" } })

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

const alumno = (n: number) => ({
  id: idAlumno(n),
  nombre: `Alumno ${String(n).padStart(2, "0")}`,
  email: `alumno${String(n)}@ejemplo.mx`,
  estadoPago: n % 2 === 0 ? "deudor" : "al_corriente",
  accesoRestringido: false,
  origen: "codigo",
  inscritoEn: "2026-09-01T15:30:00.000Z",
})

const paginar = <T extends { id: string }>(filas: readonly T[], url: URL, porDefecto = 20) => {
  const limite = Number(url.searchParams.get("limite") ?? String(porDefecto))
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

interface Estado {
  publicaciones: ReturnType<typeof publicacion>[]
  elementos: Record<string, ReturnType<typeof material>[]>
  maestros: (typeof MAESTRO)[]
  alumnos: ReturnType<typeof alumno>[]
  candidatos: { id: string; nombre: string; correoEnmascarado: string; yaInscrito: boolean }[]
  // Cuántas primeras páginas de avisos responden 500 (incluye el reintento de Providers).
  avisosFallan: number
  // Promesa que retiene las primeras páginas del roster (para verlo recargar).
  retenerRoster: Promise<void> | null
}

const crearServidor = (rol: Rol) => {
  const estado: Estado = {
    publicaciones: Array.from({ length: 25 }, (_, i) => publicacion(i + 1)),
    elementos: {
      [TEMA_1]: Array.from({ length: 7 }, (_, i) => material(1, i + 1)),
      [TEMA_2]: Array.from({ length: 7 }, (_, i) => material(2, i + 1)),
    },
    maestros: [MAESTRO],
    alumnos: [alumno(1)],
    candidatos: [
      { id: idCandidato(1), nombre: "Ana Uno", correoEnmascarado: "a***@x.mx", yaInscrito: false },
      { id: idCandidato(2), nombre: "Ana Dos", correoEnmascarado: "b***@x.mx", yaInscrito: false },
    ],
    avisosFallan: 0,
    retenerRoster: null,
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
    if (url.pathname === "/api/clases/inscritas") {
      return respuestaJson(200, {
        clases: [
          {
            id: CLASE_ID,
            nombre: "Historia",
            maestro: { nombre: MAESTRO.nombre },
            maestros: [{ nombre: MAESTRO.nombre }],
          },
        ],
        total: 1,
        siguienteCursor: null,
      })
    }
    if (url.pathname === "/api/clases/impartidas") {
      return respuestaJson(200, {
        clases: [{ id: CLASE_ID, nombre: "Historia", alumnos: estado.alumnos.length }],
        total: 1,
        siguienteCursor: null,
      })
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
      // Un servidor que filtrara datos de pago: la vista del estudiante no debe mostrarlos.
      const conCorreo = estado.maestros.map((m) => ({ ...m, email: "luis@ejemplo.mx" }))
      return respuestaJson(200, {
        maestro: conCorreo[0],
        maestros: conCorreo,
        alumnos: [
          {
            id: idCandidato(9),
            nombre: "Pedro Paz",
            email: "pedro@ejemplo.mx",
            estadoPago: "deudor",
            accesoRestringido: true,
          },
        ],
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
    if (url.pathname.startsWith(`${base}/alumnos/`) && metodo === "DELETE") {
      const quitado = url.pathname.split("/").at(-1)
      estado.alumnos = estado.alumnos.filter((a) => a.id !== quitado)
      return new Response(null, { status: 204 })
    }
    if (url.pathname === `${base}/alumnos`) {
      if (!url.searchParams.has("cursor") && estado.retenerRoster !== null) {
        await estado.retenerRoster
      }
      const r = paginar(estado.alumnos, url, 50)
      if (r === null) return cursorInvalido()
      return respuestaJson(200, {
        alumnos: r.pagina,
        total: estado.alumnos.length,
        siguienteCursor: r.siguiente,
      })
    }
    if (url.pathname === "/api/admin/maestros/candidatos") {
      return respuestaJson(200, {
        candidatos: [{ ...OTRO_MAESTRO, email: "marta@ejemplo.mx" }],
        hayMas: false,
      })
    }
    if (url.pathname === `${base}/publicaciones`) {
      if (!url.searchParams.has("cursor") && estado.avisosFallan > 0) {
        estado.avisosFallan -= 1
        return errorInterno()
      }
      const r = paginar(estado.publicaciones, url)
      if (r === null) return cursorInvalido()
      return respuestaJson(200, { publicaciones: r.pagina, siguienteCursor: r.siguiente })
    }
    if (url.pathname === `${base}/temas`) {
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

type FetchMock = ReturnType<typeof crearServidor>["fetchMock"]

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

const pedidas = (fetchMock: FetchMock, pathname: string) =>
  fetchMock.mock.calls
    .filter(([, init]) => (init?.method ?? "GET") === "GET")
    .map(([entrada]) => new URL(String(entrada), "http://x"))
    .filter((url) => url.pathname === pathname)

const reposar = (ms = 200) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))
const enLasSecciones = (nombre: string) =>
  within(screen.getByRole("list", { name: "Secciones de la clase" })).getByRole("link", {
    name: nombre,
  })
const buscar = (campo: string, texto: string) =>
  fireEvent.change(screen.getByRole("textbox", { name: campo }), { target: { value: texto } })

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

describe("redirecciones de las rutas viejas (CL3-R1-10, CL3-R1-11)", () => {
  it.each([
    ["maestro", "alumnos?vista=tabla#fila"],
    ["admin", "alumnos/"],
    ["admin", "maestros?orden=nombre"],
    ["admin", "maestros#asignar"],
  ] as const)(
    "CL3-R1-10: %s en …/%s llega a …/personas con replace y monta «Personas»",
    async (rol, vieja) => {
      crearServidor(rol)
      const avisos = `${BASES[rol]}/${CLASE_ID}`
      const router = await montar([avisos, `${avisos}/${vieja}`])
      await waitFor(() => expect(router.state.location.pathname).toBe(`${avisos}/personas`))
      expect(router.state.historyAction).toBe("REPLACE")
      expect(await screen.findByRole("heading", { name: "Alumnos" }, ESPERA)).toBeInTheDocument()
      expect(enLasSecciones("Personas")).toHaveAttribute("aria-current", "page")
      await act(() => router.navigate(-1))
      expect(router.state.location.pathname).toBe(avisos)
    },
  )

  it.each([
    ["estudiante", "alumnos"],
    ["estudiante", "maestros"],
    ["maestro", "maestros"],
  ] as const)(
    "CL3-R1-11: %s en …/%s no monta «Personas» de otra perspectiva",
    async (rol, vieja) => {
      crearServidor(rol)
      const router = await montar([`${BASES[rol]}/${CLASE_ID}/${vieja}`])
      await waitFor(() =>
        expect(router.state.location.pathname).not.toBe(`${BASES[rol]}/${CLASE_ID}/${vieja}`),
      )
      expect(router.state.location.pathname).not.toBe(`${BASES[rol]}/${CLASE_ID}/personas`)
      await reposar()
      expect(screen.queryByRole("heading", { name: "Agregar alumnos" })).toBeNull()
      expect(screen.queryByRole("heading", { name: "Maestros de la clase" })).toBeNull()
    },
  )
})

describe("«Personas» con dos listas y dos buscadores (CL3-R1-12 a CL3-R1-16)", () => {
  const idsRepetidos = () => {
    const vistos = new Map<string, number>()
    for (const elemento of Array.from(document.querySelectorAll("[id]"))) {
      vistos.set(elemento.id, (vistos.get(elemento.id) ?? 0) + 1)
    }
    return [...vistos.entries()].filter(([, n]) => n > 1).map(([valor]) => valor)
  }

  it("CL3-R1-12: en «Personas» del admin, con resultados en los dos buscadores, ningún id se repite y cada campo conserva su etiqueta", async () => {
    crearServidor("admin")
    await montar([`${BASES.admin}/${CLASE_ID}/personas`])
    await screen.findByRole("heading", { name: "Maestros de la clase" }, ESPERA)
    buscar("Buscar alumno por nombre", "Ana")
    buscar("Buscar maestro por nombre", "Marta")
    expect(
      await screen.findByRole("button", { name: "Agregar a la clase Ana Uno" }, ESPERA),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole("button", { name: "Asignar a la clase Marta Ruiz" }, ESPERA),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole("button", { name: "Quitar Alumno 01" }, ESPERA),
    ).toBeInTheDocument()
    expect(idsRepetidos()).toEqual([])
    expect(screen.getByRole("textbox", { name: "Buscar alumno por nombre" })).toHaveValue("Ana")
    expect(screen.getByRole("textbox", { name: "Buscar maestro por nombre" })).toHaveValue("Marta")
  })

  it("CL3-R1-12: en «Personas» del maestro, ningún id se repite y los maestros no traen controles", async () => {
    crearServidor("maestro")
    await montar([`${BASES.maestro}/${CLASE_ID}/personas`])
    await screen.findByRole("heading", { name: "Maestro" }, ESPERA)
    buscar("Buscar alumno por nombre", "Ana")
    expect(
      await screen.findByRole("button", { name: "Agregar a la clase Ana Uno" }, ESPERA),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole("button", { name: "Quitar Alumno 01" }, ESPERA),
    ).toBeInTheDocument()
    expect(idsRepetidos()).toEqual([])
    expect(screen.queryByRole("textbox", { name: "Buscar maestro por nombre" })).toBeNull()
  })

  it("CL3-R1-13: el estudiante no ve el estado de pago ni la restricción de otro alumno aunque la respuesta los traiga", async () => {
    crearServidor("estudiante")
    await montar([`${BASES.estudiante}/${CLASE_ID}/personas`])
    expect(await screen.findByText("Pedro Paz", undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText(/Deudor/i)).toBeNull()
    expect(screen.queryByText(/Al corriente/i)).toBeNull()
    expect(screen.queryByText(/Restringid/i)).toBeNull()
    expect(screen.queryByText("Estado de pago")).toBeNull()
  })

  it("CL3-R1-14: en «Personas» del admin, quitar al último alumno con el foco en «Sí, quitar» lleva el foco al encabezado «Alumnos», no a los maestros", async () => {
    crearServidor("admin")
    await montar([`${BASES.admin}/${CLASE_ID}/personas`])
    await screen.findByRole("heading", { name: "Maestros de la clase" }, ESPERA)
    const quitar = await screen.findByRole("button", { name: "Quitar Alumno 01" }, ESPERA)
    act(() => quitar.focus())
    fireEvent.click(quitar)
    const si = await screen.findByRole("button", { name: "Sí, quitar Alumno 01" }, ESPERA)
    act(() => si.focus())
    fireEvent.click(si)
    await waitFor(() => expect(screen.queryByText("Alumno 01")).toBeNull(), ESPERA)
    await reposar()
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement).not.toBe(
      screen.getByRole("heading", { name: "Maestros de la clase" }),
    )
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Alumnos" }))
  })

  it("CL3-R1-15: «Ver más alumnos» queda en espera mientras el roster se vuelve a pedir (enEspera={isFetching}, CLAUDE.md › Componentes)", async () => {
    const { estado, fetchMock } = crearServidor("admin")
    estado.alumnos = Array.from({ length: 51 }, (_, i) => alumno(i + 1))
    await montar([`${BASES.admin}/${CLASE_ID}/personas`])
    const verMas = await screen.findByRole("button", { name: "Ver más alumnos" }, ESPERA)
    expect(verMas).not.toHaveAttribute("aria-busy", "true")
    const antes = pedidas(fetchMock, `/api/clases/${CLASE_ID}/alumnos`).length
    let soltar: () => void = () => undefined
    estado.retenerRoster = new Promise<void>((resolver) => (soltar = resolver))
    // Agregar a un alumno invalida el roster: la recarga queda retenida.
    buscar("Buscar alumno por nombre", "Ana")
    fireEvent.click(
      await screen.findByRole("button", { name: "Agregar a la clase Ana Uno" }, ESPERA),
    )
    await waitFor(
      () =>
        expect(pedidas(fetchMock, `/api/clases/${CLASE_ID}/alumnos`).length).toBeGreaterThan(antes),
      ESPERA,
    )
    try {
      expect(screen.getByRole("button", { name: "Ver más alumnos" })).toHaveAttribute(
        "aria-busy",
        "true",
      )
    } finally {
      soltar()
    }
  })

  it("CL3-R1-16: en «Personas» del admin, si el roster falla en su primera carga, los maestros siguen a la vista y el error queda en su bloque", async () => {
    const { fetchMock } = crearServidor("admin")
    const original = fetchMock.getMockImplementation()
    if (original === undefined) throw new Error("Precondición: el servidor simulado")
    fetchMock.mockImplementation((entrada, init) => {
      const url = new URL(String(entrada), "http://x")
      if (url.pathname === `/api/clases/${CLASE_ID}/alumnos`) return Promise.resolve(errorInterno())
      return original(entrada, init)
    })
    await montar([`${BASES.admin}/${CLASE_ID}/personas`])
    const tituloAlumnos = await screen.findByRole("heading", { name: "Alumnos" }, ESPERA)
    const bloque = tituloAlumnos.closest<HTMLElement>('[data-slot="card"]')
    if (bloque === null) throw new Error("Precondición: el panel del roster")
    expect(await within(bloque).findByRole("alert", undefined, ESPERA)).toBeInTheDocument()
    const maestros = screen.getByRole("heading", { name: "Maestros de la clase" })
    const panelMaestros = maestros.closest<HTMLElement>('[data-slot="card"]')
    if (panelMaestros === null) throw new Error("Precondición: el panel de los maestros")
    expect(within(panelMaestros).getByText("Luis Pérez")).toBeInTheDocument()
    expect(within(panelMaestros).queryByRole("alert")).toBeNull()
  })
})

// Avisos con R1: la primera página (20) cargada y el aviso del cursor borrado antes de "Ver más".
const avisosConR1 = async (entradas = [`${BASES.estudiante}/${CLASE_ID}`]) => {
  const servidor = crearServidor("estudiante")
  const router = await montar(entradas)
  const verMas = await screen.findByRole("button", { name: "Ver más avisos" }, ESPERA)
  servidor.estado.publicaciones = servidor.estado.publicaciones.filter(
    (p) => p.id !== idPublicacion(20),
  )
  act(() => verMas.focus())
  fireEvent.click(verMas)
  expect(await screen.findByText(R1, undefined, ESPERA)).toBeInTheDocument()
  return { ...servidor, router }
}

const primerasPaginas = (fetchMock: FetchMock, pathname: string) =>
  pedidas(fetchMock, pathname).filter((url) => !url.searchParams.has("cursor")).length

describe("más caminos de R1 y R2 (CL3-R1-17 a CL3-R1-21)", () => {
  const AVISOS = `/api/clases/${CLASE_ID}/publicaciones`

  it("CL3-R1-17: R1 y dos fallos seguidos: pulsar «Avisos» con el servidor caído deja un error; pulsarlo otra vez con el servidor sano trae la lista", async () => {
    const { estado, fetchMock } = await avisosConR1()
    estado.avisosFallan = 2
    fireEvent.click(enLasSecciones("Avisos"))
    await waitFor(() => expect(screen.queryByText(R1)).toBeNull(), ESPERA)
    expect(await screen.findByRole("alert", undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText("Aviso 1")).toBeNull()
    const antes = primerasPaginas(fetchMock, AVISOS)
    fireEvent.click(enLasSecciones("Avisos"))
    expect(await screen.findByText("Aviso 21", undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(primerasPaginas(fetchMock, AVISOS)).toBeGreaterThan(antes)
  })

  it("CL3-R1-18: R1 por el enlace de la clase en la barra lateral (misma ruta, otra location.key): pide la lista y la frase desaparece", async () => {
    const { fetchMock } = await avisosConR1()
    const base = `${BASES.estudiante}/${CLASE_ID}`
    const enlaces = await waitFor(() => {
      const candidatos = screen
        .getAllByRole("link", { name: /Historia/ })
        .filter(
          (enlace) =>
            enlace.getAttribute("href") === base &&
            enlace.closest('[aria-label="Secciones de la clase"]') === null,
        )
      expect(candidatos.length).toBeGreaterThan(0)
      return candidatos
    }, ESPERA)
    const antes = primerasPaginas(fetchMock, AVISOS)
    const enlace = enlaces[0]
    if (enlace === undefined) throw new Error("Precondición: el enlace de la clase en la barra")
    fireEvent.click(enlace)
    expect(await screen.findByText("Aviso 21", undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText(R1)).toBeNull()
    expect(primerasPaginas(fetchMock, AVISOS)).toBeGreaterThan(antes)
  })

  it("CL3-R1-19: R2 en dos temas a la vez: pulsar «Actividades de aprendizaje» pide los dos sin cursor y las dos frases desaparecen", async () => {
    const servidor = crearServidor("estudiante")
    await montar([`${BASES.estudiante}/${CLASE_ID}/trabajo`])
    const verMas1 = await screen.findByRole("button", { name: "Ver más de Unidad 1" }, ESPERA)
    const verMas2 = await screen.findByRole("button", { name: "Ver más de Unidad 2" }, ESPERA)
    servidor.estado.elementos[TEMA_1] = (servidor.estado.elementos[TEMA_1] ?? []).filter(
      (e) => e.id !== idElemento(1, 5),
    )
    servidor.estado.elementos[TEMA_2] = (servidor.estado.elementos[TEMA_2] ?? []).filter(
      (e) => e.id !== idElemento(2, 5),
    )
    fireEvent.click(verMas1)
    fireEvent.click(verMas2)
    await waitFor(() => expect(screen.getAllByText(R2)).toHaveLength(2), ESPERA)
    const deTema = (tema: string) =>
      pedidas(servidor.fetchMock, `/api/clases/${CLASE_ID}/trabajo`).filter(
        (url) => url.searchParams.get("tema") === tema,
      )
    const antes1 = deTema(TEMA_1).length
    const antes2 = deTema(TEMA_2).length
    fireEvent.click(enLasSecciones("Actividades de aprendizaje"))
    await waitFor(() => expect(screen.queryAllByText(R2)).toHaveLength(0), ESPERA)
    expect(screen.getByText("Material 1.1")).toBeInTheDocument()
    expect(screen.getByText("Material 2.1")).toBeInTheDocument()
    const nuevas = [...deTema(TEMA_1).slice(antes1), ...deTema(TEMA_2).slice(antes2)]
    expect(deTema(TEMA_1).length).toBeGreaterThan(antes1)
    expect(deTema(TEMA_2).length).toBeGreaterThan(antes2)
    expect(nuevas.every((url) => !url.searchParams.has("cursor"))).toBe(true)
  })

  it("CL3-R1-20: con el foco en «Ver más avisos», R1 lo lleva al encabezado «Avisos» y pulsar «Avisos» no lo deja en <body>", async () => {
    await avisosConR1()
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Avisos" })),
    )
    fireEvent.click(enLasSecciones("Avisos"))
    expect(await screen.findByText("Aviso 21", undefined, ESPERA)).toBeInTheDocument()
    await reposar()
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement?.isConnected).toBe(true)
  })

  it("CL3-R1-21: pulsar «Personas» estando en «Personas» (sana) no vuelve a pedir el roster ni los maestros", async () => {
    const { fetchMock } = crearServidor("admin")
    await montar([`${BASES.admin}/${CLASE_ID}/personas`])
    expect(
      await screen.findByRole("button", { name: "Quitar Alumno 01" }, ESPERA),
    ).toBeInTheDocument()
    await reposar()
    const roster = pedidas(fetchMock, `/api/clases/${CLASE_ID}/alumnos`).length
    const clase = pedidas(fetchMock, `/api/clases/${CLASE_ID}`).length
    fireEvent.click(enLasSecciones("Personas"))
    await reposar()
    expect(pedidas(fetchMock, `/api/clases/${CLASE_ID}/alumnos`)).toHaveLength(roster)
    expect(pedidas(fetchMock, `/api/clases/${CLASE_ID}`)).toHaveLength(clase)
    expect(screen.getByRole("button", { name: "Quitar Alumno 01" })).toBeInTheDocument()
  })
})
