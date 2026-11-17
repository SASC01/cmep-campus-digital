// FORO-01c2 (§D-9, §D-10; AGENTS.md, "frases de recuperación"): las frases de las vistas del foro, por
// cada camino, con el router real (`rutas`) y el QueryClient de app/providers.tsx (staleTime de 30 s, un
// reintento). «No pudimos actualizar el foro. Mostramos la última versión que tenemos.»: FORO-1C24
// (volver a abrirlo antes de 30 s, por cada camino) y FORO-1C26 (el siguiente fallo vuelve a avisar y
// una lectura correcta lo deja atrás). «…Inténtalo de nuevo.» de publicar, guardar y borrar: FORO-1C27.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import { claveForo } from "@/services/trabajoService"

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
  if (ruta === `${deClase}/publicaciones`) {
    return respuestaJson(200, { publicaciones: [], siguienteCursor: null })
  }
  if (ruta === `${deClase}/temas`) return respuestaJson(200, { temas: [], sinTema: 0 })
  if (ruta === `${deClase}/categorias`) return respuestaJson(200, { categorias: [] })
  if (ruta === API_FOROS && metodo === "GET") {
    const foros = Object.entries(estado.foros).map(([id, foro]) => ({
      id,
      titulo: foro.titulo,
      autor: { ...MAESTRO, administracion: false },
      creadoEn: "2026-10-06T15:30:00.000Z",
      fechaLimite: "2030-01-15T16:00:00.000Z",
      puntos: 20,
      tema: null,
      participaciones: 0,
      entrega: null,
    }))
    return respuestaJson(200, { foros, siguienteCursor: null })
  }
  if (ruta === API_FOROS && metodo === "POST") {
    const cuerpo = llamada.cuerpo as { titulo: string }
    estado.foros[FORO_NUEVO] = { titulo: cuerpo.titulo, version: 0 }
    return respuestaJson(201, foroJson(FORO_NUEVO, { titulo: cuerpo.titulo, version: 0 }))
  }
  const deForo = /^\/api\/clases\/[^/]+\/foros\/([^/]+)$/.exec(ruta)
  if (deForo !== null) {
    const foroId = deForo[1] ?? ""
    const foro = estado.foros[foroId]
    if (foro === undefined) return errorApi(404, "TAREA_NO_ENCONTRADA")
    if (metodo === "GET") return respuestaJson(200, foroJson(foroId, foro))
    if (metodo === "DELETE") {
      delete estado.foros[foroId]
      return new Response(null, { status: 204 })
    }
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

const NUEVO = `${BASE}/foros/nuevo`
const editarDe = (foroId = FORO_A) => `${BASE}/foros/${foroId}/editar`
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

const AVISO_RECARGA = "No pudimos actualizar el foro. Mostramos la última versión que tenemos."
const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const del = (foroId = FORO_A) => `${BASE}/foros/${foroId}`
const tituloDe = (texto: string) => screen.findByRole("heading", { level: 2, name: texto }, ESPERA)

const enLasSecciones = (nombre: string) =>
  within(screen.getByRole("list", { name: "Secciones de la clase" })).getByRole("link", {
    name: nombre,
  })

// El foro A en pantalla y una recarga que falla con el foro en caché: un aviso.
const conLaRecargaFallida = async (entradas = [del()]) => {
  const montaje = await montar(entradas)
  await tituloDe("Debate de la unidad")
  estado.falla = ({ metodo, url }) =>
    metodo === "GET" && url.pathname === `${API_FOROS}/${FORO_A}`
      ? errorApi(503, "SERVICIO_OCUPADO")
      : undefined
  await act(() => montaje.queryClient.invalidateQueries({ queryKey: claveForo(CLASE, FORO_A) }))
  await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
  expect(aviso.error).toHaveBeenCalledWith(AVISO_RECARGA)
  await reposar()
  // El servidor ya responde, con otra versión.
  estado.falla = () => undefined
  const foroA = estado.foros[FORO_A]
  if (foroA === undefined) throw new Error("Precondición: existe el foro A")
  foroA.titulo = "Debate actualizado"
  return montaje
}

const pideYMuestraLaNueva = async (antes: number) => {
  expect(await tituloDe("Debate actualizado")).toBeInTheDocument()
  expect(lecturasDe().length).toBeGreaterThan(antes)
  await reposar()
  expect(aviso.error).toHaveBeenCalledTimes(1)
}

describe("FORO-1C24 · «No pudimos actualizar el foro…»: volver a abrirlo antes de 30 s lo pide de nuevo, por cada camino", () => {
  it("FORO-1C24: desde «Foro», pulsando su fila", async () => {
    await conLaRecargaFallida()
    const antes = lecturasDe().length
    fireEvent.click(enLasSecciones("Foro"))
    fireEvent.click(
      await screen.findByRole("link", { name: /^Foro: Debate actualizado(?!\d)/ }, ESPERA),
    )
    await pideYMuestraLaNueva(antes)
  })

  it("FORO-1C24: atrás y adelante del historial", async () => {
    const { router } = await conLaRecargaFallida([BASE, del()])
    const antes = lecturasDe().length
    await act(() => router.navigate(-1))
    await screen.findByText("Publica el primer aviso de tu clase.", undefined, ESPERA)
    await act(() => router.navigate(1))
    await pideYMuestraLaNueva(antes)
  })

  it("FORO-1C24: saltar al foro B y volver al A (con key por el foro, la vista se monta de nuevo)", async () => {
    const { router } = await conLaRecargaFallida([del(FORO_B), del()])
    const antes = lecturasDe().length
    await act(() => router.navigate(-1))
    await tituloDe("Segundo debate")
    await act(() => router.navigate(1))
    await pideYMuestraLaNueva(antes)
  })
})

describe("FORO-1C26 · el siguiente fallo vuelve a avisar y una lectura correcta lo deja atrás", () => {
  it("FORO-1C26: un segundo fallo da un segundo aviso; una lectura correcta muestra la versión nueva, sin otro aviso, y volver a abrir no repite ninguno", async () => {
    const { queryClient, router } = await conLaRecargaFallida([BASE, del()])
    estado.falla = ({ metodo, url }) =>
      metodo === "GET" && url.pathname === `${API_FOROS}/${FORO_A}`
        ? errorApi(503, "SERVICIO_OCUPADO")
        : undefined
    await act(() => queryClient.invalidateQueries({ queryKey: claveForo(CLASE, FORO_A) }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2), ESPERA)
    await reposar()
    estado.falla = () => undefined
    await act(() => queryClient.invalidateQueries({ queryKey: claveForo(CLASE, FORO_A) }))
    expect(await tituloDe("Debate actualizado")).toBeInTheDocument()
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(2)
    await act(() => router.navigate(-1))
    await screen.findByText("Publica el primer aviso de tu clase.", undefined, ESPERA)
    await act(() => router.navigate(1))
    await tituloDe("Debate actualizado")
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(2)
  })
})

describe("FORO-1C27 · «…Inténtalo de nuevo.»: repetir el control que falló lo hace", () => {
  it.each([
    ["Publicar foro", NUEVO, "POST"],
    ["Guardar cambios", editarDe(), "PUT"],
    ["Sí, borrar foro", del(), "DELETE"],
  ] as const)(
    "FORO-1C27: «%s» con un 5xx avisa «Algo salió mal. Inténtalo de nuevo.»; el mismo botón, sin recargar la vista, vuelve a pedir y con éxito no queda otro aviso de error",
    async (boton, ruta, metodo) => {
      await montar([ruta])
      if (metodo === "DELETE") {
        await tituloDe("Debate de la unidad")
        fireEvent.click(screen.getByRole("button", { name: "Borrar foro" }))
      }
      if (metodo !== "DELETE") await screen.findByLabelText("Título", undefined, ESPERA)
      if (metodo === "POST") llenarNuevo()
      let primera = true
      estado.falla = (llamada) => {
        if (llamada.metodo !== metodo || !primera) return undefined
        primera = false
        return errorApi(500, "ERROR_INTERNO")
      }
      fireEvent.click(screen.getByRole("button", { name: boton }))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(GENERICO), ESPERA)
      await waitFor(() =>
        expect(screen.getByRole("button", { name: boton })).not.toHaveAttribute(
          "aria-busy",
          "true",
        ),
      )
      const antes = estado.llamadas.filter((llamada) => llamada.metodo === metodo).length
      fireEvent.click(screen.getByRole("button", { name: boton }))
      await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
      expect(estado.llamadas.filter((llamada) => llamada.metodo === metodo)).toHaveLength(antes + 1)
      await reposar()
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
  )
})
