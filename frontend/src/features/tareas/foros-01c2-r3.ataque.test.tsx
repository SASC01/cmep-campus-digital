// FORO-01c2, ronda 3 del tester: el remedio de T-02 (idCanonicoDeLaRuta a la entrada de ForoView y de
// EditarForoView) por todos los caminos con un :foroId en mayúsculas o mezclado: borrar, descargar,
// recargar, editar, el historial y el alumno. Router real (`rutas`) y el QueryClient de
// app/providers.tsx (staleTime de 30 s, un reintento). Ids desde ATQ-FORO-129.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import { claveForo, claveListaDeForos } from "@/services/trabajoService"

const aviso = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
)
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

type Rol = "estudiante" | "maestro" | "admin"

const uuid = (prefijo: string, n: number) =>
  `${prefijo}-1c2f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const CLASE = uuid("2a2b3c4d", 1)
const FORO_A = uuid("5a5b3c4d", 1)
const FORO_B = uuid("5a5b3c4d", 2)
const MAYUSCULAS = FORO_A.toUpperCase()
// Mezclado: las letras de los grupos impares en mayúsculas.
const MEZCLADO = FORO_A.split("-")
  .map((grupo, i) => (i % 2 === 0 ? grupo.toUpperCase() : grupo))
  .join("-")
const ADJUNTO = uuid("6a6b3c4d", 1)
const MAESTRO = { id: uuid("3a3b3c4d", 1), nombre: "Luis Pérez" }
const TEMA = { id: uuid("4b4b3c4d", 1), nombre: "Unidad 1", orden: 0, elementos: 1 }
const CATEGORIA = { id: uuid("4a4b3c4d", 1), nombre: "Participación", peso: 30, tareas: 1 }
const ESPERA = { timeout: 5000 }
const BASES: Record<Rol, string> = {
  estudiante: `/estudiante/clases/${CLASE}`,
  maestro: `/maestro/clases/${CLASE}`,
  admin: `/admin/clases/${CLASE}`,
}
const API_CLASE = `/api/clases/${CLASE}`
const API_FOROS = `${API_CLASE}/foros`
const RUTA_DESCARGA = `${API_CLASE}/archivos/${ADJUNTO}/descarga`
const NO_EXISTE = "Ese foro ya no existe."
const AVISO_RECARGA = "No pudimos actualizar el foro. Mostramos la última versión que tenemos."
const CONFLICTO = "Otra persona cambió este foro. Cargamos la versión actual."
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorApi = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

interface ForoDoble {
  titulo: string
  version: number
  existe: boolean
  puedeEditar: boolean
}

interface Llamada {
  metodo: string
  url: URL
  cuerpo: unknown
}

interface Estado {
  rol: Rol
  foros: Record<string, ForoDoble>
  falla: (llamada: Llamada) => Response | Promise<Response> | undefined
  llamadas: Llamada[]
}

let estado: Estado

const foroJson = (foroId: string, foro: ForoDoble) => ({
  foro: {
    id: foroId,
    titulo: foro.titulo,
    instrucciones: "Opina sobre la lectura.",
    fechaLimite: "2030-01-15T16:00:00.000Z",
    puntos: 20,
    aceptaTardias: false,
    version: foro.version,
    categoria: { id: CATEGORIA.id, nombre: CATEGORIA.nombre, peso: CATEGORIA.peso },
    tema: { id: TEMA.id, nombre: TEMA.nombre },
    rubrica: [],
    adjuntos: [
      { id: ADJUNTO, nombre: "guia.pdf", tipo: "application/pdf", tamano: 2048, vistaPrevia: null },
    ],
    autor: { ...MAESTRO, administracion: false },
    creadoEn: "2026-10-06T15:30:00.000Z",
    actualizadoEn: "2026-10-06T15:30:00.000Z",
    puedeEditar: estado.rol !== "estudiante" && foro.puedeEditar,
    puedeBorrar: estado.rol !== "estudiante",
  },
})

const filaDeLaLista = (foroId: string, foro: ForoDoble) => ({
  id: foroId,
  titulo: foro.titulo,
  autor: { ...MAESTRO, administracion: false },
  creadoEn: "2026-10-01T15:30:00.000Z",
  fechaLimite: "2030-01-15T16:00:00.000Z",
  puntos: 20,
  tema: null,
  participaciones: 0,
  entrega: null,
})

const responder = (llamada: Llamada): Response | Promise<Response> => {
  const { metodo, url } = llamada
  const ruta = url.pathname
  if (ruta === "/api/auth/refrescar") return errorApi(401, "NO_AUTENTICADO")
  if (ruta === "/api/me") {
    return respuestaJson(200, {
      id: uuid("4f4f3c4d", 1),
      nombre: "Ana López",
      email: "ana@ejemplo.mx",
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
  if (ruta === API_CLASE) {
    return respuestaJson(200, {
      clase: {
        id: CLASE,
        nombre: "Historia",
        descripcion: null,
        maestro: MAESTRO,
        maestros: [MAESTRO],
        archivadaEn: null,
      },
    })
  }
  if (ruta === `${API_CLASE}/codigo`) return respuestaJson(200, { codigo: "ABCDEFG" })
  if (ruta === `${API_CLASE}/temas`) return respuestaJson(200, { temas: [TEMA], sinTema: 0 })
  if (ruta === `${API_CLASE}/categorias`) {
    return respuestaJson(200, { categorias: [CATEGORIA] })
  }
  if (ruta === API_FOROS && metodo === "GET") {
    const filas = Object.entries(estado.foros)
      .filter(([, foro]) => foro.existe)
      .map(([id, foro]) => filaDeLaLista(id, foro))
    return respuestaJson(200, { foros: filas, siguienteCursor: null })
  }
  const deForo = /^\/api\/clases\/[^/]+\/foros\/([^/]+)$/.exec(ruta)
  if (deForo !== null) {
    const crudo = decodeURIComponent(deForo[1] ?? "")
    // Como el backend (foroIdSchema): un id que no es uuid es un VALIDACION; un uuid, a minúsculas.
    if (!UUID.test(crudo)) {
      return errorApi(400, "VALIDACION", "foroId: debe ser un identificador válido")
    }
    const foroId = crudo.toLowerCase()
    const foro = estado.foros[foroId]
    if (foro === undefined || !foro.existe) return errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE)
    if (metodo === "GET") return respuestaJson(200, foroJson(foroId, foro))
    if (metodo === "PUT") {
      const cuerpo = llamada.cuerpo as { version: number; titulo: string }
      if (cuerpo.version !== foro.version) return errorApi(409, "TAREA_MODIFICADA", CONFLICTO)
      foro.version += 1
      foro.titulo = cuerpo.titulo
      return respuestaJson(200, foroJson(foroId, foro))
    }
    if (metodo === "DELETE") {
      foro.existe = false
      return new Response(null, { status: 204 })
    }
  }
  return errorApi(404, "NO_ENCONTRADO", `Route ${metodo}:${ruta} not found`)
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

const delForo = (rol: Rol, foroId: string = FORO_A) => `${BASES[rol]}/foros/${foroId}`
const editarDe = (foroId: string = FORO_A) => `${delForo("maestro", foroId)}/editar`
// Las lecturas del foro A, con el id como lo mande la vista (en la forma canónica, minúsculas).
const lecturasDeA = () =>
  estado.llamadas.filter(
    ({ metodo, url }) =>
      metodo === "GET" &&
      decodeURIComponent(url.pathname).toLowerCase() === `${API_FOROS}/${FORO_A}`,
  )
const lecturasNoCanonicas = () =>
  estado.llamadas.filter(
    ({ url }) =>
      decodeURIComponent(url.pathname).startsWith(`${API_FOROS}/`) &&
      decodeURIComponent(url.pathname) !== decodeURIComponent(url.pathname).toLowerCase(),
  )
const tituloH2 = (texto: string) => screen.findByRole("heading", { level: 2, name: texto }, ESPERA)
const abrirEdicion = async (foroId: string, entradas?: string[]) => {
  const montaje = await montar(entradas ?? [editarDe(foroId)])
  await screen.findByRole("heading", { name: "Editar foro" }, ESPERA)
  await waitFor(
    () => expect(screen.getByLabelText("Título")).toHaveValue("Debate de la unidad"),
    ESPERA,
  )
  return montaje
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  estado = {
    rol: "maestro",
    foros: {
      [FORO_A]: { titulo: "Debate de la unidad", version: 3, existe: true, puedeEditar: true },
      [FORO_B]: { titulo: "Segundo debate", version: 7, existe: true, puedeEditar: true },
    },
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

const FORMAS = [
  ["mayúsculas", MAYUSCULAS],
  ["mezclado", MEZCLADO],
] as const

describe("ATQ-FORO-129 · borrar desde …/foros/<id en mayúsculas o mezclado>", () => {
  it.each(FORMAS)(
    "ATQ-FORO-129: en %s, borrar con éxito y volver «atrás» dice «Ese foro ya no existe.»; ningún GET sale con el id sin canonizar",
    async (_forma, id) => {
      const { router, queryClient } = await montar([
        `${BASES.maestro}/foro`,
        delForo("maestro", id),
      ])
      await tituloH2("Debate de la unidad")
      fireEvent.click(screen.getByRole("button", { name: "Borrar foro" }))
      fireEvent.click(screen.getByRole("button", { name: "Sí, borrar foro" }))
      await screen.findByRole("heading", { level: 2, name: "Foro" }, ESPERA)
      expect(queryClient.getQueryState(claveForo(CLASE, FORO_A))).toBeUndefined()
      expect(queryClient.getQueryState(claveForo(CLASE, id))).toBeUndefined()
      await act(() => router.navigate(-1))
      expect(await screen.findByText(NO_EXISTE, undefined, ESPERA)).toBeInTheDocument()
      expect(screen.queryByRole("heading", { level: 2, name: "Debate de la unidad" })).toBeNull()
      expect(lecturasNoCanonicas()).toHaveLength(0)
      expect(aviso.success).toHaveBeenCalledTimes(1)
    },
  )

  it.each(FORMAS)(
    "ATQ-FORO-129: en %s, borrar con un 403 BORRADO_NO_PERMITIDO con la vista montada vuelve a pedir el foro una vez, avisa una vez y la vista sigue",
    async (_forma, id) => {
      await montar([delForo("maestro", id)])
      await tituloH2("Debate de la unidad")
      estado.falla = ({ metodo }) =>
        metodo === "DELETE"
          ? errorApi(403, "BORRADO_NO_PERMITIDO", "Ya no puedes borrar este foro.")
          : undefined
      const antes = lecturasDeA().length
      fireEvent.click(screen.getByRole("button", { name: "Borrar foro" }))
      fireEvent.click(screen.getByRole("button", { name: "Sí, borrar foro" }))
      await waitFor(() => expect(lecturasDeA()).toHaveLength(antes + 1), ESPERA)
      await reposar(300)
      expect(lecturasDeA()).toHaveLength(antes + 1)
      expect(aviso.error).toHaveBeenCalledTimes(1)
      expect(aviso.error).toHaveBeenCalledWith("Ya no puedes borrar este foro.")
      expect(
        screen.getByRole("heading", { level: 2, name: "Debate de la unidad" }),
      ).toBeInTheDocument()
    },
  )

  it("ATQ-FORO-129: en mezclado, borrar con un 404 con la vista montada la reemplaza con «Ese foro ya no existe.»", async () => {
    await montar([delForo("maestro", MEZCLADO)])
    await tituloH2("Debate de la unidad")
    const foroA = estado.foros[FORO_A]
    if (foroA === undefined) throw new Error("Precondición: existe el foro A")
    foroA.existe = false
    fireEvent.click(screen.getByRole("button", { name: "Borrar foro" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar foro" }))
    expect(await screen.findByText(NO_EXISTE, { selector: "p" }, ESPERA)).toBeInTheDocument()
    await waitFor(
      () =>
        expect(screen.queryByRole("heading", { level: 2, name: "Debate de la unidad" })).toBeNull(),
      ESPERA,
    )
  })
})

describe("ATQ-FORO-130 · descargar y recargar desde …/foros/<MAYÚSCULAS>", () => {
  it("ATQ-FORO-130: la descarga con 403 SIN_ACCESO_A_LA_CLASE avisa una vez, vuelve a pedir el foro y su 403 reemplaza la vista", async () => {
    let sinAcceso = false
    estado.falla = ({ url }) => {
      if (url.pathname === RUTA_DESCARGA) {
        sinAcceso = true
        return errorApi(403, "SIN_ACCESO_A_LA_CLASE")
      }
      if (sinAcceso && url.pathname.startsWith(`${API_FOROS}/`)) {
        return errorApi(403, "SIN_ACCESO_A_LA_CLASE")
      }
      return undefined
    }
    await montar([delForo("maestro", MAYUSCULAS)])
    const antes = lecturasDeA().length
    fireEvent.click(await screen.findByRole("button", { name: "Descargar guia.pdf" }, ESPERA))
    expect(
      await screen.findByText("No tienes acceso a esta clase.", { selector: "p" }, ESPERA),
    ).toBeInTheDocument()
    expect(lecturasDeA().length).toBeGreaterThan(antes)
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(lecturasNoCanonicas()).toHaveLength(0)
  })

  it("ATQ-FORO-130: una recarga fallida en mayúsculas avisa una vez; pasar a la URL en minúsculas no repite el aviso ni pide otra vez; el siguiente fallo avisa otra vez", async () => {
    const { router, queryClient } = await montar([delForo("maestro", MAYUSCULAS)])
    await tituloH2("Debate de la unidad")
    estado.falla = ({ metodo, url }) =>
      metodo === "GET" && url.pathname.startsWith(`${API_FOROS}/`)
        ? errorApi(503, "SERVICIO_OCUPADO")
        : undefined
    await act(() => queryClient.invalidateQueries({ queryKey: claveForo(CLASE, FORO_A) }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    expect(aviso.error).toHaveBeenCalledWith(AVISO_RECARGA)
    const lecturas = lecturasDeA().length
    await act(() => router.navigate(delForo("maestro", FORO_A)))
    await reposar(300)
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(lecturasDeA()).toHaveLength(lecturas)
    expect(
      screen.getByRole("heading", { level: 2, name: "Debate de la unidad" }),
    ).toBeInTheDocument()
    await act(() => queryClient.invalidateQueries({ queryKey: claveForo(CLASE, FORO_A) }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2), ESPERA)
    await reposar(200)
    expect(aviso.error).toHaveBeenCalledTimes(2)
  })
})

describe("ATQ-FORO-131 · el historial entre …/foros/<A> y …/foros/<a> es el mismo foro", () => {
  it("ATQ-FORO-131: en el detalle, la confirmación de borrar abierta en mayúsculas sigue abierta en minúsculas, sin otra lectura", async () => {
    const { router } = await montar([delForo("maestro", MAYUSCULAS)])
    await tituloH2("Debate de la unidad")
    fireEvent.click(screen.getByRole("button", { name: "Borrar foro" }))
    expect(screen.getByRole("button", { name: "Sí, borrar foro" })).toBeInTheDocument()
    const lecturas = lecturasDeA().length
    await act(() => router.navigate(delForo("maestro", FORO_A)))
    await reposar(200)
    expect(screen.getByRole("button", { name: "Sí, borrar foro" })).toBeInTheDocument()
    expect(lecturasDeA()).toHaveLength(lecturas)
    await act(() => router.navigate(-1))
    await reposar(200)
    expect(screen.getByRole("button", { name: "Sí, borrar foro" })).toBeInTheDocument()
    expect(lecturasDeA()).toHaveLength(lecturas)
  })

  it("ATQ-FORO-131: en la edición, lo escrito en mayúsculas sigue en minúsculas, sin otra lectura, y guardar manda la versión de apertura una sola vez", async () => {
    const { router } = await abrirEdicion(MAYUSCULAS)
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Escrito arriba" } })
    const lecturas = lecturasDeA().length
    await act(() => router.navigate(editarDe(FORO_A)))
    await reposar(200)
    expect(screen.getByLabelText("Título")).toHaveValue("Escrito arriba")
    expect(lecturasDeA()).toHaveLength(lecturas)
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await tituloH2("Escrito arriba")
    const puts = estado.llamadas.filter(({ metodo }) => metodo === "PUT")
    expect(puts).toHaveLength(1)
    expect((puts[0]?.cuerpo as { version: number }).version).toBe(3)
    expect(router.state.location.pathname).toBe(delForo("maestro", FORO_A))
  })
})

describe("ATQ-FORO-132 · la edición desde …/foros/<MAYÚSCULAS>/editar", () => {
  it("ATQ-FORO-132: un 409 con la vista montada recarga el foro una vez y reinicia con la versión nueva; el siguiente guardado pasa", async () => {
    await abrirEdicion(MAYUSCULAS)
    const foroA = estado.foros[FORO_A]
    if (foroA === undefined) throw new Error("Precondición: existe el foro A")
    foroA.version = 4
    const lecturas = lecturasDeA().length
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(CONFLICTO), ESPERA)
    await waitFor(() => expect(lecturasDeA()).toHaveLength(lecturas + 1), ESPERA)
    await waitFor(() => expect(screen.getByLabelText("Título")).toHaveFocus(), ESPERA)
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await tituloH2("Debate de la unidad")
    const puts = estado.llamadas.filter(({ metodo }) => metodo === "PUT")
    expect(puts.map(({ cuerpo }) => (cuerpo as { version: number }).version)).toEqual([3, 4])
    expect(lecturasDeA()).toHaveLength(lecturas + 1)
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })

  it("ATQ-FORO-132: un 409 con la vista ya desmontada no pide nada, deja viejo el foro y volver en minúsculas nace con la versión nueva", async () => {
    const { router, queryClient } = await abrirEdicion(MAYUSCULAS)
    const put = enVuelo()
    estado.falla = ({ metodo }) => (metodo === "PUT" ? put.promesa : undefined)
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() =>
      expect(estado.llamadas.filter(({ metodo }) => metodo === "PUT")).toHaveLength(1),
    )
    await act(() => router.navigate(`${BASES.maestro}/foro`))
    await screen.findByRole("heading", { level: 2, name: "Foro" }, ESPERA)
    const lecturas = lecturasDeA().length
    const foroA = estado.foros[FORO_A]
    if (foroA === undefined) throw new Error("Precondición: existe el foro A")
    foroA.version = 4
    put.soltar(errorApi(409, "TAREA_MODIFICADA", CONFLICTO))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await reposar(300)
    expect(lecturasDeA()).toHaveLength(lecturas)
    expect(queryClient.getQueryState(claveForo(CLASE, FORO_A))?.isInvalidated).toBe(true)
    estado.falla = () => undefined
    await act(() => router.navigate(editarDe(FORO_A)))
    await waitFor(() => expect(lecturasDeA()).toHaveLength(lecturas + 1), ESPERA)
    await screen.findByRole("heading", { name: "Editar foro" }, ESPERA)
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await tituloH2("Debate de la unidad")
    const puts = estado.llamadas.filter(({ metodo }) => metodo === "PUT")
    expect((puts.at(-1)?.cuerpo as { version: number }).version).toBe(4)
  })

  it("ATQ-FORO-132: si una recarga quita puedeEditar con el foco en «Título», dice «No puedes editar este foro.» y el foco va a la raíz", async () => {
    const hasFocus = vi.spyOn(document, "hasFocus").mockReturnValue(true)
    try {
      const { queryClient } = await abrirEdicion(MEZCLADO)
      const titulo = screen.getByLabelText("Título")
      titulo.focus()
      const foroA = estado.foros[FORO_A]
      if (foroA === undefined) throw new Error("Precondición: existe el foro A")
      foroA.puedeEditar = false
      await act(() => queryClient.invalidateQueries({ queryKey: claveForo(CLASE, FORO_A) }))
      expect(
        await screen.findByText("No puedes editar este foro.", undefined, ESPERA),
      ).toBeInTheDocument()
      await reposar(100)
      expect(document.activeElement).not.toBe(document.body)
      expect(document.activeElement).toHaveAttribute("tabindex", "-1")
    } finally {
      hasFocus.mockRestore()
    }
  })

  it("ATQ-FORO-132: «Cancelar» lleva al detalle en la forma canónica, que se pinta de la caché sin otra lectura", async () => {
    const { router } = await abrirEdicion(MAYUSCULAS)
    const cancelar = screen.getByRole("link", { name: "Cancelar" })
    expect(cancelar).toHaveAttribute("href", delForo("maestro", FORO_A))
    const lecturas = lecturasDeA().length
    fireEvent.click(cancelar)
    await tituloH2("Debate de la unidad")
    expect(router.state.location.pathname).toBe(delForo("maestro", FORO_A))
    expect(lecturasDeA()).toHaveLength(lecturas)
  })

  it("ATQ-FORO-132 (hallazgo menor del manager): guardar desde mayúsculas con el detalle en minúsculas en caché no vuelve a pedir el foro al llegar al detalle", async () => {
    const { router } = await montar([delForo("maestro", FORO_A)])
    await tituloH2("Debate de la unidad")
    await act(() => router.navigate(editarDe(MAYUSCULAS)))
    await screen.findByRole("heading", { name: "Editar foro" }, ESPERA)
    const lecturas = lecturasDeA().length
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Título nuevo" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await tituloH2("Título nuevo")
    await reposar(300)
    expect(lecturasDeA()).toHaveLength(lecturas)
    expect(router.state.location.pathname).toBe(delForo("maestro", FORO_A))
  })
})

describe("ATQ-FORO-133 · el alumno y los vecinos 21 y 22", () => {
  it.each([MAYUSCULAS, MEZCLADO])(
    "ATQ-FORO-133: el alumno en …/foros/%s ve el foro sin acciones, con una sola lectura canónica",
    async (id) => {
      estado.rol = "estudiante"
      await montar([delForo("estudiante", id)])
      await tituloH2("Debate de la unidad")
      expect(screen.queryByRole("link", { name: "Editar foro" })).toBeNull()
      expect(screen.queryByRole("button", { name: "Borrar foro" })).toBeNull()
      expect(lecturasDeA()).toHaveLength(1)
      expect(lecturasNoCanonicas()).toHaveLength(0)
    },
  )

  it.each(["foros/LISTA", "foros/Lista/editar", "foros/NUEVO/editar"])(
    "ATQ-FORO-133: con «Foro» en caché, …/%s dice que el foro no existe y la lista sigue intacta",
    async (sufijo) => {
      const consola = vi.spyOn(console, "error").mockImplementation(() => undefined)
      try {
        const { router, queryClient } = await montar([`${BASES.maestro}/foro`])
        expect(
          await screen.findByText("Debate de la unidad", undefined, ESPERA),
        ).toBeInTheDocument()
        const lista = queryClient.getQueryData(claveListaDeForos(CLASE))
        await act(() => router.navigate(`${BASES.maestro}/${sufijo}`))
        expect(await screen.findByText(NO_EXISTE, undefined, ESPERA)).toBeInTheDocument()
        expect(screen.queryByText(/Unexpected Application Error/)).toBeNull()
        expect(queryClient.getQueryData(claveListaDeForos(CLASE))).toBe(lista)
        await act(() => router.navigate(`${BASES.maestro}/foro`))
        expect(
          await screen.findByText("Debate de la unidad", undefined, ESPERA),
        ).toBeInTheDocument()
      } finally {
        consola.mockRestore()
      }
    },
  )

  it("ATQ-FORO-133: la URL en mayúsculas que queda en el historial, al volver «atrás», pinta el mismo foro de la caché sin otra lectura", async () => {
    const { router } = await montar([delForo("maestro", MAYUSCULAS)])
    await tituloH2("Debate de la unidad")
    const lecturas = lecturasDeA().length
    await act(() => router.navigate(`${BASES.maestro}/foro`))
    await screen.findByRole("heading", { level: 2, name: "Foro" }, ESPERA)
    await act(() => router.navigate(-1))
    await tituloH2("Debate de la unidad")
    expect(router.state.location.pathname).toBe(delForo("maestro", MAYUSCULAS))
    await reposar(200)
    expect(lecturasDeA()).toHaveLength(lecturas)
  })
})
