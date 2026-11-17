// FORO-01c2 (§D-8.3, §D-10; §E9.5): el detalle de un foro, borrarlo y la clase archivada, con el router
// real (`rutas`) y el QueryClient de app/providers.tsx (staleTime de 30 s, un reintento). FORO-1C01 (su
// parte del router real en foros/:foroId), FORO-1C12, FORO-1C13, FORO-1C14 (el detalle), FORO-1C37, y
// las partes del detalle de FORO-1C50, FORO-1C52 y FORO-1C53.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import { clavePrefijoDeCalificaciones } from "@/services/calificacionesService"
import {
  claveCategorias,
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

type Rol = "estudiante" | "maestro" | "admin"

const uuid = (prefijo: string, n: number) =>
  `${prefijo}-1c2f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const CLASE = uuid("2a2b3c4d", 1)
const FORO_A = uuid("5a5b3c4d", 1)
const FORO_B = uuid("5a5b3c4d", 2)
const ADJUNTO = uuid("6a6b3c4d", 1)
const MAESTRO = { id: uuid("3a3b3c4d", 1), nombre: "Luis Pérez" }
const ESPERA = { timeout: 5000 }
const BASES: Record<Rol, string> = {
  estudiante: `/estudiante/clases/${CLASE}`,
  maestro: `/maestro/clases/${CLASE}`,
  admin: `/admin/clases/${CLASE}`,
}
const API_FORO = (foroId = FORO_A) => `/api/clases/${CLASE}/foros/${foroId}`
const RUTA_DESCARGA = `/api/clases/${CLASE}/archivos/${ADJUNTO}/descarga`
const AVISO_RECARGA = "No pudimos actualizar el foro. Mostramos la última versión que tenemos."

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorApi = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

interface ForoDoble {
  titulo: string
  existe: boolean
  puedeEditar: boolean
  puedeBorrar: boolean
  aceptaTardias: boolean
}

interface Llamada {
  metodo: string
  url: URL
}

interface Estado {
  rol: Rol
  archivada: boolean
  refrescoFalla: boolean
  foros: Record<string, ForoDoble>
  falla: (llamada: Llamada) => Response | Promise<Response> | undefined
  llamadas: Llamada[]
}

let estado: Estado

const foroDoble = (titulo: string): ForoDoble => ({
  titulo,
  existe: true,
  puedeEditar: true,
  puedeBorrar: true,
  aceptaTardias: false,
})

const foroJson = (foroId: string, foro: ForoDoble) => ({
  foro: {
    id: foroId,
    titulo: foro.titulo,
    instrucciones: "Opina sobre la lectura.\n<b>Sin formato</b>",
    fechaLimite: "2030-01-15T16:00:00.000Z",
    puntos: 20,
    aceptaTardias: foro.aceptaTardias,
    version: 0,
    categoria: { id: uuid("4a4b3c4d", 1), nombre: "Participación", peso: 30 },
    tema: { id: uuid("4b4b3c4d", 1), nombre: "Unidad 1" },
    rubrica: [{ id: uuid("8a8b3c4d", 1), criterio: "Argumentos", puntosMax: 10 }],
    adjuntos: [
      { id: ADJUNTO, nombre: "guia.pdf", tipo: "application/pdf", tamano: 2048, vistaPrevia: null },
    ],
    autor: { ...MAESTRO, administracion: false },
    creadoEn: "2026-10-06T15:30:00.000Z",
    actualizadoEn: "2026-10-06T15:30:00.000Z",
    puedeEditar: estado.rol !== "estudiante" && foro.puedeEditar,
    puedeBorrar: estado.rol !== "estudiante" && foro.puedeBorrar,
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
  if (ruta === `${deClase}/foros`) {
    const foros = Object.entries(estado.foros)
      .filter(([, foro]) => foro.existe)
      .map(([id, foro]) => ({
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
  const deForo = /^\/api\/clases\/[^/]+\/foros\/([^/]+)$/.exec(ruta)
  if (deForo !== null) {
    const foroId = deForo[1] ?? ""
    // Como foroIdParamSchema de shared/src/foros.ts: un id que no es uuid es un VALIDACION de foroId.
    if (!/^[0-9a-f-]{36}$/i.test(foroId)) {
      return errorApi(400, "VALIDACION", "foroId: foroId: debe ser un identificador válido")
    }
    const foro = estado.foros[foroId]
    if (foro === undefined || !foro.existe) return errorApi(404, "TAREA_NO_ENCONTRADA")
    if (metodo === "GET") return respuestaJson(200, foroJson(foroId, foro))
    if (metodo === "DELETE") {
      foro.existe = false
      return new Response(null, { status: 204 })
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
const borrados = () => estado.llamadas.filter(({ metodo }) => metodo === "DELETE")
const lecturas = (foroId = FORO_A) =>
  estado.llamadas.filter(({ metodo, url }) => metodo === "GET" && url.pathname === API_FORO(foroId))
const descargas = () =>
  estado.llamadas.filter(({ metodo, url }) => metodo === "POST" && url.pathname === RUTA_DESCARGA)
const pedidasDeLaLista = () =>
  estado.llamadas.filter(
    ({ metodo, url }) => metodo === "GET" && url.pathname === `/api/clases/${CLASE}/foros`,
  )
const titulo = (texto = "Debate de la unidad") =>
  screen.findByRole("heading", { level: 2, name: texto }, ESPERA)

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  estado = {
    rol: "maestro",
    archivada: false,
    refrescoFalla: false,
    foros: { [FORO_A]: foroDoble("Debate de la unidad"), [FORO_B]: foroDoble("Segundo debate") },
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
      const llamada = { metodo: init?.method ?? "GET", url: new URL(String(entrada), "http://x") }
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

describe("FORO-1C01 · en foros/:foroId ninguna sección está activa (§E9.5)", () => {
  it.each(["estudiante", "maestro", "admin"] as const)(
    "FORO-1C01: %s en …/foros/:foroId ve las siete secciones sin aria-current y sin indicador, como en tareas/:id",
    async (rol) => {
      estado.rol = rol
      const { router } = await montar([del(rol)])
      await titulo()
      const lista = screen.getByRole("list", { name: "Secciones de la clase" })
      const enlaces = within(lista).getAllByRole("link")
      expect(enlaces).toHaveLength(7)
      expect(enlaces[2]).toHaveTextContent("Foro")
      for (const enlace of enlaces) expect(enlace).not.toHaveAttribute("aria-current")
      const indicador = () =>
        screen
          .getByRole("list", { name: "Secciones de la clase" })
          .parentElement?.querySelector(":scope > span[aria-hidden='true']") ?? null
      expect(indicador()).toBeNull()
      // Control: en …/foro sí hay sección activa e indicador.
      await act(() => router.navigate(`${BASES[rol]}/foro`))
      await screen.findByRole("heading", { level: 2, name: "Foro" }, ESPERA)
      await waitFor(() =>
        expect(within(lista).getByRole("link", { name: "Foro" })).toHaveAttribute(
          "aria-current",
          "page",
        ),
      )
      await waitFor(() => expect(indicador()).not.toBeNull())
    },
  )
})

describe("FORO-1C12 · el detalle por rol, sus estados y la recarga fallida", () => {
  it("FORO-1C12: el alumno ve la insignia «Foro», el título, el planteamiento en texto plano, el adjunto, la rúbrica y «Detalles» con la política, sin acciones", async () => {
    estado.rol = "estudiante"
    await montar([del("estudiante")])
    await titulo()
    expect(screen.getByText("Foro", { selector: "span *, span" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 3, name: "Planteamiento" })).toBeInTheDocument()
    expect(screen.getByText(/<b>Sin formato<\/b>/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Descargar guia.pdf" })).toBeInTheDocument()
    expect(screen.getByText(/Argumentos/)).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 3, name: "Detalles" })).toBeInTheDocument()
    expect(screen.getByText("Participaciones después de la fecha límite")).toBeInTheDocument()
    expect(
      screen.getByText("No se aceptan participaciones después de la fecha límite"),
    ).toBeInTheDocument()
    expect(screen.queryByText("Entrega")).toBeNull()
    expect(screen.queryByRole("link", { name: "Editar foro" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Borrar foro" })).toBeNull()
  })

  it("FORO-1C12: la política dice «Se aceptan participaciones con retraso» si el foro las acepta", async () => {
    const foroA = estado.foros[FORO_A]
    if (foroA === undefined) throw new Error("Precondición: existe el foro A")
    foroA.aceptaTardias = true
    await montar([del("maestro")])
    await titulo()
    expect(screen.getByText("Se aceptan participaciones con retraso")).toBeInTheDocument()
  })

  it.each([
    ["maestro", true, false],
    ["admin", true, true],
    ["maestro", false, true],
  ] as const)(
    "FORO-1C12: %s con puedeEditar=%s y puedeBorrar=%s ve solo las acciones que dice el servidor",
    async (rol, puedeEditar, puedeBorrar) => {
      estado.rol = rol
      const foroA = estado.foros[FORO_A]
      if (foroA === undefined) throw new Error("Precondición: existe el foro A")
      foroA.puedeEditar = puedeEditar
      foroA.puedeBorrar = puedeBorrar
      await montar([del(rol)])
      await titulo()
      const editar = screen.queryByRole("link", { name: "Editar foro" })
      expect(editar !== null).toBe(puedeEditar)
      if (editar !== null) expect(editar).toHaveAttribute("href", `${del(rol)}/editar`)
      expect(screen.queryByRole("button", { name: "Borrar foro" }) !== null).toBe(puedeBorrar)
    },
  )

  it("FORO-1C12: cargando y luego el foro; un 404 dice «Ese foro ya no existe.» y un 403 de la clase, «No tienes acceso a esta clase.», sin aviso", async () => {
    const lectura = enVuelo()
    estado.falla = ({ metodo, url }) =>
      metodo === "GET" && url.pathname === API_FORO() ? lectura.promesa : undefined
    const primero = await montar([del("maestro")])
    expect(await screen.findByText("Cargando el foro…", undefined, ESPERA)).toBeInTheDocument()
    lectura.soltar(respuestaJson(200, foroJson(FORO_A, foroDoble("Debate de la unidad"))))
    await titulo()
    cleanup()
    void primero
    estado.falla = () => undefined
    const foroA = estado.foros[FORO_A]
    if (foroA === undefined) throw new Error("Precondición: existe el foro A")
    foroA.existe = false
    await montar([del("maestro")])
    expect(await screen.findByText("Ese foro ya no existe.", undefined, ESPERA)).toBeInTheDocument()
    cleanup()
    estado.falla = ({ url }) =>
      url.pathname === API_FORO() ? errorApi(403, "SIN_ACCESO_A_LA_CLASE") : undefined
    await montar([del("maestro")])
    expect(
      await screen.findByText("No tienes acceso a esta clase.", undefined, ESPERA),
    ).toBeInTheDocument()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("FORO-1C12: una recarga fallida con el foro en caché conserva la vista y avisa una vez por fallo (T-12)", async () => {
    const { queryClient } = await montar([del("maestro")])
    await titulo()
    estado.falla = ({ url }) =>
      url.pathname === API_FORO() ? errorApi(503, "SERVICIO_OCUPADO") : undefined
    await act(() => queryClient.invalidateQueries({ queryKey: claveForo(CLASE, FORO_A) }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await reposar()
    expect(aviso.error).toHaveBeenCalledWith(AVISO_RECARGA)
    expect(
      screen.getByRole("heading", { level: 2, name: "Debate de la unidad" }),
    ).toBeInTheDocument()
    await act(() => queryClient.invalidateQueries({ queryKey: claveForo(CLASE, FORO_A) }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2), ESPERA)
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(2)
  })
})

describe("FORO-1C13 · borrar un foro", () => {
  it("FORO-1C13: la confirmación en línea lleva el foco a «Cancelar» y cancelar lo devuelve a «Borrar foro»", async () => {
    await montar([del("maestro")])
    fireEvent.click(await screen.findByRole("button", { name: "Borrar foro" }, ESPERA))
    expect(
      screen.getByText("Se borrará con su rúbrica, sus adjuntos y todas sus participaciones."),
    ).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus())
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.getByRole("button", { name: "Borrar foro" })).toHaveFocus())
    expect(borrados()).toHaveLength(0)
  })

  it("FORO-1C13: con éxito avisa «Foro borrado», saca el foro de la caché, marca viejas la lista de «Foro» (que se vuelve a pedir), las actividades, los temas, las categorías y las calificaciones, y navega a «Foro»", async () => {
    const { queryClient } = await montar([del("maestro")])
    // N-32: la lista de «Foro», fresca en caché, y las demás listas que el borrado deja viejas.
    queryClient.setQueryData(claveListaDeForos(CLASE), { pages: [], pageParams: [] })
    const otras = [
      [...clavePrefijoDelTrabajo(CLASE), "sin-tema"],
      claveTemas(CLASE),
      claveCategorias(CLASE),
      [...clavePrefijoDeCalificaciones(CLASE), "gradebook"],
    ]
    for (const clave of otras) queryClient.setQueryData(clave, {})
    const listaAntes = pedidasDeLaLista().length
    fireEvent.click(await screen.findByRole("button", { name: "Borrar foro" }, ESPERA))
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar foro" }))
    expect(
      await screen.findByRole("heading", { level: 2, name: "Foro" }, ESPERA),
    ).toBeInTheDocument()
    expect(aviso.success).toHaveBeenCalledWith("Foro borrado")
    expect(queryClient.getQueryState(claveForo(CLASE, FORO_A))).toBeUndefined()
    expect(borrados()[0]?.url.search).toBe("")
    // La lista estaba fresca: si se vuelve a pedir al llegar a «Foro» es porque quedó vieja.
    await waitFor(() => expect(pedidasDeLaLista().length).toBeGreaterThan(listaAntes), ESPERA)
    for (const clave of otras) expect(queryClient.getQueryState(clave)?.isInvalidated).toBe(true)
  })

  it.each([
    ["admin", true],
    ["maestro", false],
  ] as const)(
    "FORO-1C13: un 409 TAREA_CON_ENTREGAS abre el segundo paso con el mensaje del servidor, sin aviso; «Borrar con las participaciones» solo para el admin (%s: %s)",
    async (rol, conBoton) => {
      estado.rol = rol
      let primera = true
      estado.falla = ({ metodo }) => {
        if (metodo !== "DELETE" || !primera) return undefined
        primera = false
        return errorApi(409, "TAREA_CON_ENTREGAS", "Este foro tiene 3 participaciones.")
      }
      await montar([del(rol)])
      fireEvent.click(await screen.findByRole("button", { name: "Borrar foro" }, ESPERA))
      fireEvent.click(screen.getByRole("button", { name: "Sí, borrar foro" }))
      expect(await screen.findByRole("alert", undefined, ESPERA)).toHaveTextContent(
        "Este foro tiene 3 participaciones.",
      )
      expect(aviso.error).not.toHaveBeenCalled()
      await waitFor(() => expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus())
      const conParticipaciones = screen.queryByRole("button", {
        name: "Borrar con las participaciones",
      })
      expect(conParticipaciones !== null).toBe(conBoton)
      if (conParticipaciones === null) return
      fireEvent.click(conParticipaciones)
      await screen.findByRole("heading", { level: 2, name: "Foro" }, ESPERA)
      expect(borrados()[1]?.url.searchParams.get("confirmar")).toBe("entregas")
    },
  )
})

describe("FORO-1C14 · el detalle en una clase archivada", () => {
  it.each(["maestro", "admin"] as const)(
    "FORO-1C14: %s en una clase archivada ve el foro sin «Editar foro» ni «Borrar foro»",
    async (rol) => {
      estado.rol = rol
      estado.archivada = true
      await montar([del(rol)])
      await titulo()
      await reposar()
      expect(screen.queryByRole("link", { name: "Editar foro" })).toBeNull()
      expect(screen.queryByRole("button", { name: "Borrar foro" })).toBeNull()
    },
  )
})

describe("FORO-1C37 · descargar un adjunto del planteamiento (E1-11)", () => {
  it("FORO-1C37: con 404 ARCHIVO_NO_ENCONTRADO, un aviso; la vista sigue y el foco sigue en «Descargar»", async () => {
    estado.falla = ({ url }) =>
      url.pathname === RUTA_DESCARGA ? errorApi(404, "ARCHIVO_NO_ENCONTRADO", "x") : undefined
    await montar([del("maestro")])
    const boton = await screen.findByRole("button", { name: "Descargar guia.pdf" }, ESPERA)
    boton.focus()
    fireEvent.click(boton)
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(
      screen.getByRole("heading", { level: 2, name: "Debate de la unidad" }),
    ).toBeInTheDocument()
    expect(document.activeElement).toBe(boton)
  })

  it("FORO-1C37: con 403 SIN_ACCESO_A_LA_CLASE, un aviso y se vuelve a pedir el foro; su respuesta reemplaza la vista", async () => {
    let sinAcceso = false
    estado.falla = ({ url }) => {
      if (url.pathname === RUTA_DESCARGA) {
        sinAcceso = true
        return errorApi(403, "SIN_ACCESO_A_LA_CLASE")
      }
      if (sinAcceso && url.pathname === API_FORO()) return errorApi(403, "SIN_ACCESO_A_LA_CLASE")
      return undefined
    }
    await montar([del("maestro")])
    const antes = lecturas().length
    fireEvent.click(await screen.findByRole("button", { name: "Descargar guia.pdf" }, ESPERA))
    expect(
      await screen.findByText("No tienes acceso a esta clase.", undefined, ESPERA),
    ).toBeInTheDocument()
    expect(lecturas().length).toBeGreaterThan(antes)
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(aviso.error).toHaveBeenCalledWith("No tienes acceso a esta clase.")
  })

  it("FORO-1C37: con un 5xx, «Algo salió mal. Inténtalo de nuevo.»; repetir el botón vuelve a pedir la descarga", async () => {
    estado.falla = ({ url }) =>
      url.pathname === RUTA_DESCARGA ? errorApi(500, "ERROR_INTERNO") : undefined
    await montar([del("maestro")])
    const boton = await screen.findByRole("button", { name: "Descargar guia.pdf" }, ESPERA)
    fireEvent.click(boton)
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    expect(aviso.error).toHaveBeenCalledWith("Algo salió mal. Inténtalo de nuevo.")
    await reposar()
    fireEvent.click(screen.getByRole("button", { name: "Descargar guia.pdf" }))
    await waitFor(() => expect(descargas()).toHaveLength(2), ESPERA)
  })
})

describe("FORO-1C50 · guardas de borrar en el detalle", () => {
  it.each([
    ["Sí, borrar foro", false],
    ["Borrar con las participaciones", true],
  ] as const)(
    "FORO-1C50: dos clics en el mismo render de «%s» mandan un solo DELETE",
    async (boton, segundoPaso) => {
      estado.rol = "admin"
      let primera = true
      const borrado = enVuelo()
      estado.falla = ({ metodo }) => {
        if (metodo !== "DELETE") return undefined
        if (segundoPaso && primera) {
          primera = false
          return errorApi(409, "TAREA_CON_ENTREGAS", "Este foro tiene participaciones.")
        }
        return borrado.promesa
      }
      await montar([del("admin")])
      fireEvent.click(await screen.findByRole("button", { name: "Borrar foro" }, ESPERA))
      if (segundoPaso) {
        fireEvent.click(screen.getByRole("button", { name: "Sí, borrar foro" }))
        await screen.findByRole("button", { name: boton }, ESPERA)
      }
      const antes = borrados().length
      const control = screen.getByRole("button", { name: boton })
      // El mismo render: los dos clics dentro de un solo act, sin pintar entre ellos.
      act(() => {
        fireEvent.click(control)
        fireEvent.click(control)
      })
      await reposar()
      expect(borrados()).toHaveLength(antes + 1)
      borrado.soltar(new Response(null, { status: 204 }))
      await screen.findByRole("heading", { level: 2, name: "Foro" }, ESPERA)
    },
  )
})

describe("FORO-1C52 · lo abierto es del foro de la ruta", () => {
  it("FORO-1C52: con la confirmación de «Borrar foro» abierta en el foro A, saltar con el historial al foro B no la deja abierta y ningún clic borra B", async () => {
    // B ya está en caché: al volver a él no hay "Cargando" que desmonte la confirmación.
    const { router } = await montar([del("maestro", FORO_B)])
    await titulo("Segundo debate")
    await act(() => router.navigate(del("maestro", FORO_A)))
    await titulo()
    fireEvent.click(await screen.findByRole("button", { name: "Borrar foro" }, ESPERA))
    expect(screen.getByRole("button", { name: "Sí, borrar foro" })).toBeInTheDocument()
    await act(() => router.navigate(-1))
    await titulo("Segundo debate")
    expect(screen.queryByRole("button", { name: "Sí, borrar foro" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Borrar foro" }))
    await reposar()
    expect(borrados()).toHaveLength(0)
  })
})

describe("FORO-1C53 · el detalle no avisa ante un código con que apiClient redirige", () => {
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

  it.each(CODIGOS)("FORO-1C53: borrar con %s no avisa", async (nombre, destino) => {
    await montar([del("maestro")])
    fireEvent.click(await screen.findByRole("button", { name: "Borrar foro" }, ESPERA))
    if (nombre === "401 sin refresco") estado.refrescoFalla = true
    estado.falla = ({ metodo }) => (metodo === "DELETE" ? respuesta(nombre) : undefined)
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar foro" }))
    await waitFor(() => expect(irA).toHaveBeenCalledWith(destino), ESPERA)
    await reposar(300)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it.each(CODIGOS)("FORO-1C53: la recarga del foro con %s no avisa", async (nombre, destino) => {
    const { queryClient } = await montar([del("maestro")])
    await titulo()
    if (nombre === "401 sin refresco") estado.refrescoFalla = true
    estado.falla = ({ url }) => (url.pathname === API_FORO() ? respuesta(nombre) : undefined)
    await act(() => queryClient.invalidateQueries({ queryKey: claveForo(CLASE, FORO_A) }))
    await waitFor(() => expect(irA).toHaveBeenCalledWith(destino), ESPERA)
    await reposar(300)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it.each(CODIGOS)(
    "FORO-1C53: la descarga de un adjunto con %s no avisa",
    async (nombre, destino) => {
      await montar([del("maestro")])
      const boton = await screen.findByRole("button", { name: "Descargar guia.pdf" }, ESPERA)
      if (nombre === "401 sin refresco") estado.refrescoFalla = true
      estado.falla = ({ url }) => (url.pathname === RUTA_DESCARGA ? respuesta(nombre) : undefined)
      fireEvent.click(boton)
      await waitFor(() => expect(irA).toHaveBeenCalledWith(destino), ESPERA)
      await reposar(300)
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )
})

// Corrección de la ronda 1 (T-01): un :foroId igual a «lista» compartía la clave de la lista de «Foro».
// Con la lista en caché, la vista recibía sus páginas y se rompía la aplicación entera.
describe("T-01 (ronda 1 de 01c2) · el foro «lista» no recibe la lista de «Foro» de la caché", () => {
  const filaDeLaLista = () =>
    screen.findByRole("link", { name: /^Foro: Debate de la unidad(?!\d)/ }, ESPERA)

  it.each(["maestro", "estudiante"] as const)(
    "T-01: %s abre «Foro» y después …/foros/lista: dice «Ese foro ya no existe.» sin romperse, y al volver a «Foro» la lista sigue",
    async (rol) => {
      estado.rol = rol
      const { router } = await montar([`${BASES[rol]}/foro`])
      await filaDeLaLista()
      await act(() => router.navigate(`${BASES[rol]}/foros/lista`))
      expect(
        await screen.findByText("Ese foro ya no existe.", undefined, ESPERA),
      ).toBeInTheDocument()
      expect(screen.getByRole("list", { name: "Secciones de la clase" })).toBeInTheDocument()
      await act(() => router.navigate(`${BASES[rol]}/foro`))
      expect(await filaDeLaLista()).toBeInTheDocument()
    },
  )

  it("T-01: el maestro abre «Foro» y después …/foros/lista/editar: dice «Ese foro ya no existe.» sin romperse, y al volver a «Foro» la lista sigue", async () => {
    const { router } = await montar([`${BASES.maestro}/foro`])
    await filaDeLaLista()
    await act(() => router.navigate(`${BASES.maestro}/foros/lista/editar`))
    expect(await screen.findByText("Ese foro ya no existe.", undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByLabelText("Título")).toBeNull()
    await act(() => router.navigate(`${BASES.maestro}/foro`))
    expect(await filaDeLaLista()).toBeInTheDocument()
  })

  it("T-01: abrir primero …/foros/lista y después «Foro» no ensucia la lista: «Foro» muestra sus filas", async () => {
    const { router } = await montar([`${BASES.maestro}/foros/lista`])
    expect(await screen.findByText("Ese foro ya no existe.", undefined, ESPERA)).toBeInTheDocument()
    await act(() => router.navigate(`${BASES.maestro}/foro`))
    expect(await filaDeLaLista()).toBeInTheDocument()
  })
})
