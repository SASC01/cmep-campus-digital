// FORO-01c2 (§D-8.3, §D-10): crear y editar un foro, con el router real (`rutas`) y el QueryClient de
// app/providers.tsx. FORO-1C05, FORO-1C14 (crear y editar) y las partes de crear y editar de FORO-1C50,
// FORO-1C52 y FORO-1C53.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { TEXTOS_DE_LA_CLASE } from "@/components/clase/data"
import { clavePrefijoDeCalificaciones } from "@/services/calificacionesService"
import { claveClaseDetalle } from "@/services/clasesService"
import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import {
  claveForo,
  claveListaDeForos,
  clavePrefijoDelTrabajo,
  claveTemas,
} from "@/services/trabajoService"

const aviso = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
)
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const uuid = (prefijo: string, n: number) =>
  `${prefijo}-1c2f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const CLASE = uuid("2a2b3c4d", 1)
const FORO_A = uuid("5a5b3c4d", 1)
const FORO_B = uuid("5a5b3c4d", 2)
const FORO_NUEVO = uuid("5a5b3c4d", 9)
const MAESTRO = { id: uuid("3a3b3c4d", 1), nombre: "Luis Pérez" }
const ESPERA = { timeout: 5000 }
const BASE = `/maestro/clases/${CLASE}`
const API_FOROS = `/api/clases/${CLASE}/foros`
const CONFLICTO = "Otra persona cambió este foro. Cargamos la versión actual."

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
}

interface Llamada {
  metodo: string
  url: URL
  cuerpo: unknown
}

interface Estado {
  archivada: boolean
  refrescoFalla: boolean
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
    aceptaTardias: true,
    version: foro.version,
    categoria: null,
    tema: null,
    rubrica: [],
    adjuntos: [],
    autor: { ...MAESTRO, administracion: false },
    creadoEn: "2026-10-06T15:30:00.000Z",
    actualizadoEn: "2026-10-06T15:30:00.000Z",
    puedeEditar: true,
    puedeBorrar: true,
  },
})

const responder = (llamada: Llamada): Response | Promise<Response> => {
  const { metodo, url } = llamada
  const ruta = url.pathname
  if (ruta === "/api/auth/refrescar") {
    if (estado.refrescoFalla) return errorApi(401, "NO_AUTENTICADO")
    return respuestaJson(200, { tokenAcceso: "otra" })
  }
  if (ruta === "/api/me") {
    return respuestaJson(200, {
      id: MAESTRO.id,
      nombre: MAESTRO.nombre,
      email: "luis@ejemplo.mx",
      rol: "maestro",
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
  }
  const propia = estado.falla(llamada)
  if (propia !== undefined) return propia
  if (ruta === "/api/clases/impartidas") {
    return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
  }
  const deClase = `/api/clases/${CLASE}`
  if (ruta === deClase) {
    return respuestaJson(200, {
      clase: {
        id: CLASE,
        nombre: "Historia",
        descripcion: null,
        maestro: MAESTRO,
        maestros: [MAESTRO],
        archivadaEn: estado.archivada ? "2026-10-20T10:00:00.000Z" : null,
      },
    })
  }
  if (ruta === `${deClase}/codigo`) return respuestaJson(200, { codigo: "ABCDEFG" })
  if (ruta === `${deClase}/temas`) return respuestaJson(200, { temas: [], sinTema: 0 })
  if (ruta === `${deClase}/categorias`) return respuestaJson(200, { categorias: [] })
  if (ruta === API_FOROS && metodo === "GET") {
    return respuestaJson(200, { foros: [], siguienteCursor: null })
  }
  if (ruta === API_FOROS && metodo === "POST") {
    const cuerpo = llamada.cuerpo as { titulo: string }
    estado.foros[FORO_NUEVO] = { titulo: cuerpo.titulo, version: 0 }
    return respuestaJson(201, foroJson(FORO_NUEVO, { titulo: cuerpo.titulo, version: 0 }))
  }
  const deForo = /^\/api\/clases\/[^/]+\/foros\/([^/]+)$/.exec(ruta)
  if (deForo !== null) {
    // Como foroIdParamSchema de shared: el servidor pasa el uuid a minúsculas.
    const foroId = (deForo[1] ?? "").toLowerCase()
    const foro = estado.foros[foroId]
    if (foro === undefined) return errorApi(404, "TAREA_NO_ENCONTRADA")
    if (metodo === "GET") return respuestaJson(200, foroJson(foroId, foro))
    if (metodo === "PUT") {
      const cuerpo = llamada.cuerpo as { version: number; titulo: string }
      if (cuerpo.version !== foro.version) return errorApi(409, "TAREA_MODIFICADA", CONFLICTO)
      foro.version += 1
      foro.titulo = cuerpo.titulo
      return respuestaJson(200, foroJson(foroId, foro))
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

const NUEVO = `${BASE}/foros/nuevo`
const pedidasDeTemas = () =>
  estado.llamadas.filter(
    ({ metodo, url }) => metodo === "GET" && url.pathname === `/api/clases/${CLASE}/temas`,
  )
const editarDe = (foroId = FORO_A) => `${BASE}/foros/${foroId}/editar`
const escrituras = () =>
  estado.llamadas.filter(({ metodo }) => metodo === "POST" || metodo === "PUT")
const lecturasDe = (foroId = FORO_A) =>
  estado.llamadas.filter(
    ({ metodo, url }) => metodo === "GET" && url.pathname === `${API_FOROS}/${foroId}`,
  )

const llenarNuevo = () => {
  fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Debate nuevo" } })
  fireEvent.change(screen.getByLabelText("Planteamiento"), { target: { value: "¿Qué opinas?" } })
  fireEvent.change(screen.getByLabelText("Fecha límite"), {
    target: { value: "2030-01-15T10:00" },
  })
}

const abrirNuevo = async () => {
  const montaje = await montar([NUEVO])
  await screen.findByRole("heading", { name: "Nuevo foro" }, ESPERA)
  llenarNuevo()
  return montaje
}

const abrirEdicion = async (entradas = [editarDe()]) => {
  const montaje = await montar(entradas)
  await screen.findByRole("heading", { name: "Editar foro" }, ESPERA)
  return montaje
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  estado = {
    archivada: false,
    refrescoFalla: false,
    foros: {
      [FORO_A]: { titulo: "Debate de la unidad", version: 3 },
      [FORO_B]: { titulo: "Segundo debate", version: 7 },
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

describe("FORO-1C05 · publicar y guardar un foro", () => {
  it("FORO-1C05: «Publicar foro» manda el cuerpo del foro (sin requiereAdjuntos), avisa «Foro publicado», marca viejas la lista de «Foro», las actividades y las calificaciones, vuelve a pedir los temas y navega al foro nuevo", async () => {
    const { queryClient } = await abrirNuevo()
    queryClient.setQueryData(claveListaDeForos(CLASE), { pages: [], pageParams: [] })
    queryClient.setQueryData([...clavePrefijoDelTrabajo(CLASE), "sin-tema"], { pages: [] })
    queryClient.setQueryData(claveTemas(CLASE), { temas: [], sinTema: 0 })
    queryClient.setQueryData([...clavePrefijoDeCalificaciones(CLASE), "x"], {})
    const temasAntes = pedidasDeTemas().length
    fireEvent.click(screen.getByRole("button", { name: "Publicar foro" }))
    expect(
      await screen.findByRole("heading", { level: 2, name: "Debate nuevo" }, ESPERA),
    ).toBeInTheDocument()
    expect(aviso.success).toHaveBeenCalledWith("Foro publicado")
    const [publicar] = escrituras()
    expect(publicar?.url.pathname).toBe(API_FOROS)
    expect(publicar?.cuerpo).toMatchObject({
      titulo: "Debate nuevo",
      instrucciones: "¿Qué opinas?",
      aceptaTardias: true,
    })
    expect(publicar?.cuerpo).not.toHaveProperty("requiereAdjuntos")
    expect(queryClient.getQueryState(claveListaDeForos(CLASE))?.isInvalidated).toBe(true)
    expect(
      queryClient.getQueryState([...clavePrefijoDelTrabajo(CLASE), "sin-tema"])?.isInvalidated,
    ).toBe(true)
    expect(
      queryClient.getQueryState([...clavePrefijoDeCalificaciones(CLASE), "x"])?.isInvalidated,
    ).toBe(true)
    // N-32: los temas los mira el formulario abierto: al quedar viejos se vuelven a pedir.
    await waitFor(() => expect(pedidasDeTemas().length).toBeGreaterThan(temasAntes), ESPERA)
  })

  it("FORO-1C05: «Guardar cambios» manda la versión de apertura, avisa «Cambios guardados», escribe el foro con la respuesta, marca vieja la lista y vuelve al detalle", async () => {
    const { queryClient } = await abrirEdicion()
    queryClient.setQueryData(claveListaDeForos(CLASE), { pages: [], pageParams: [] })
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Debate corregido" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    expect(
      await screen.findByRole("heading", { level: 2, name: "Debate corregido" }, ESPERA),
    ).toBeInTheDocument()
    expect(aviso.success).toHaveBeenCalledWith("Cambios guardados")
    const [guardar] = escrituras()
    expect(guardar?.cuerpo).toMatchObject({ version: 3, titulo: "Debate corregido" })
    expect(guardar?.cuerpo).not.toHaveProperty("requiereAdjuntos")
    expect(queryClient.getQueryData(claveForo(CLASE, FORO_A))).toMatchObject({
      foro: { version: 4, titulo: "Debate corregido" },
    })
    expect(queryClient.getQueryState(claveListaDeForos(CLASE))?.isInvalidated).toBe(true)
  })

  it("FORO-1C05: un 409 TAREA_MODIFICADA avisa con el texto del servidor, recarga el foro una vez, reinicia el formulario con la versión actual y el foco en «Título»; el siguiente guardado sale con esa versión", async () => {
    await abrirEdicion()
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Lo que escribí" } })
    // Otra persona guardó mientras se editaba.
    const foroA = estado.foros[FORO_A]
    if (foroA === undefined) throw new Error("Precondición: existe el foro A")
    foroA.version = 5
    foroA.titulo = "Versión de otra persona"
    const antes = lecturasDe().length
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(CONFLICTO), ESPERA)
    await waitFor(
      () => expect(screen.getByLabelText("Título")).toHaveValue("Versión de otra persona"),
      ESPERA,
    )
    expect(screen.getByLabelText("Título")).toHaveFocus()
    await reposar()
    expect(lecturasDe()).toHaveLength(antes + 1)
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Cambios guardados"), ESPERA)
    expect(escrituras()[1]?.cuerpo).toMatchObject({ version: 5 })
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })
})

describe("FORO-1C14 · crear y editar en una clase archivada", () => {
  it.each([
    ["crear", NUEVO],
    ["editar", editarDe()],
  ] as const)(
    "FORO-1C14: al %s en una clase archivada la ruta pinta el texto de archivada y «Volver a Foro», sin formulario",
    async (_accion, ruta) => {
      estado.archivada = true
      await montar([ruta])
      expect(
        await screen.findByText(TEXTOS_DE_LA_CLASE.archivada, undefined, ESPERA),
      ).toBeInTheDocument()
      expect(screen.getByRole("link", { name: "Volver a Foro" })).toHaveAttribute(
        "href",
        `${BASE}/foro`,
      )
      expect(screen.queryByLabelText("Título")).toBeNull()
    },
  )

  it("FORO-1C14: un 409 CLASE_ARCHIVADA al publicar avisa una vez, conserva lo escrito y marca vieja la clase (exact)", async () => {
    const { queryClient } = await abrirNuevo()
    const archivar = enVuelo()
    estado.falla = ({ metodo, url }) => {
      if (metodo === "POST" && url.pathname === API_FOROS) {
        return errorApi(409, "CLASE_ARCHIVADA", "Esta clase está archivada.")
      }
      if (url.pathname === `/api/clases/${CLASE}`) return archivar.promesa
      return undefined
    }
    fireEvent.click(screen.getByRole("button", { name: "Publicar foro" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    expect(aviso.error).toHaveBeenCalledWith("Esta clase está archivada.")
    expect(queryClient.getQueryState(claveClaseDetalle(CLASE))?.isInvalidated).toBe(true)
    expect(screen.getByLabelText("Título")).toHaveValue("Debate nuevo")
    expect(screen.getByLabelText("Planteamiento")).toHaveValue("¿Qué opinas?")
    archivar.soltar(errorApi(500, "ERROR_INTERNO"))
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })
})

describe("FORO-1C50 · guardas de publicar y guardar", () => {
  it.each([
    ["Publicar foro", NUEVO],
    ["Guardar cambios", editarDe()],
  ] as const)(
    "FORO-1C50: dos clics en el mismo render de «%s» mandan una sola petición",
    async (boton, ruta) => {
      const pendiente = enVuelo()
      estado.falla = ({ metodo }) =>
        metodo === "POST" || metodo === "PUT" ? pendiente.promesa : undefined
      await montar([ruta])
      await screen.findByLabelText("Título", undefined, ESPERA)
      if (ruta === NUEVO) llenarNuevo()
      const control = screen.getByRole("button", { name: boton })
      // El mismo render: los dos clics dentro de un solo act, sin pintar entre ellos.
      act(() => {
        fireEvent.click(control)
        fireEvent.click(control)
      })
      await reposar()
      expect(escrituras()).toHaveLength(1)
      pendiente.soltar(errorApi(500, "ERROR_INTERNO"))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    },
  )
})

describe("FORO-1C52 · la edición es del foro de la ruta", () => {
  it("FORO-1C52: la edición del foro A a medio escribir no pasa al foro B al saltar con el historial, y guardar en B lleva la versión de B", async () => {
    // B ya está en caché: al volver a él no hay "Cargando" que desmonte el formulario.
    const { router } = await abrirEdicion([editarDe(FORO_B)])
    await waitFor(
      () => expect(screen.getByLabelText("Título")).toHaveValue("Segundo debate"),
      ESPERA,
    )
    await act(() => router.navigate(editarDe(FORO_A)))
    await waitFor(
      () => expect(screen.getByLabelText("Título")).toHaveValue("Debate de la unidad"),
      ESPERA,
    )
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Escrito en A" } })
    await act(() => router.navigate(-1))
    await waitFor(
      () => expect(screen.getByLabelText("Título")).toHaveValue("Segundo debate"),
      ESPERA,
    )
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(escrituras()).toHaveLength(1), ESPERA)
    expect(escrituras()[0]?.url.pathname).toBe(`${API_FOROS}/${FORO_B}`)
    expect(escrituras()[0]?.cuerpo).toMatchObject({ version: 7, titulo: "Segundo debate" })
  })
})

describe("FORO-1C53 · crear y editar no avisan ante un código con que apiClient redirige", () => {
  const CODIGOS = [
    ["401 sin refresco", "/login"],
    ["403 ACCESO_RESTRINGIDO", "/acceso-restringido"],
    ["403 CAMBIO_DE_CONTRASENA_REQUERIDO", "/cambiar-contrasena"],
  ] as const
  const respuesta = (nombre: (typeof CODIGOS)[number][0]) => {
    if (nombre === "401 sin refresco") return errorApi(401, "NO_AUTENTICADO")
    if (nombre === "403 ACCESO_RESTRINGIDO") return errorApi(403, "ACCESO_RESTRINGIDO")
    return errorApi(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
  }

  it.each(
    CODIGOS.flatMap(
      ([nombre, destino]) =>
        [
          ["Publicar foro", nombre, destino],
          ["Guardar cambios", nombre, destino],
        ] as const,
    ),
  )("FORO-1C53: «%s» con %s no avisa", async (boton, nombre, destino) => {
    const ruta = boton === "Publicar foro" ? NUEVO : editarDe()
    await montar([ruta])
    await screen.findByLabelText("Título", undefined, ESPERA)
    if (ruta === NUEVO) llenarNuevo()
    if (nombre === "401 sin refresco") estado.refrescoFalla = true
    estado.falla = ({ metodo }) =>
      metodo === "POST" || metodo === "PUT" ? respuesta(nombre) : undefined
    fireEvent.click(screen.getByRole("button", { name: boton }))
    await waitFor(() => expect(irA).toHaveBeenCalledWith(destino), ESPERA)
    await reposar(300)
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

// Corrección de la ronda 2 (T-02): la edición con el id de la ruta en mayúsculas escribe el foro bajo su
// clave canónica: el detalle en minúsculas que ya estaba en caché muestra lo guardado sin pedirlo.
describe("T-02 (ronda 2 de 01c2) · editar con el id de la ruta en mayúsculas", () => {
  it("T-02: con el detalle en minúsculas en caché, guardar desde …/foros/<MAYÚSCULAS>/editar escribe en esa misma clave: el detalle muestra lo nuevo sin volver a pedirlo", async () => {
    const { router } = await montar([`${BASE}/foros/${FORO_A}`])
    await screen.findByRole("heading", { level: 2, name: "Debate de la unidad" }, ESPERA)
    await act(() => router.navigate(editarDe(FORO_A.toUpperCase())))
    await screen.findByRole("heading", { name: "Editar foro" }, ESPERA)
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Debate corregido" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Cambios guardados"), ESPERA)
    await act(() => router.navigate(`${BASE}/foros/${FORO_A}`))
    const lecturasAntes = lecturasDe().length
    expect(
      await screen.findByRole("heading", { level: 2, name: "Debate corregido" }, ESPERA),
    ).toBeInTheDocument()
    await reposar()
    expect(lecturasDe()).toHaveLength(lecturasAntes)
    expect(escrituras()[0]?.url.pathname).toBe(`${API_FOROS}/${FORO_A}`)
  })
})
