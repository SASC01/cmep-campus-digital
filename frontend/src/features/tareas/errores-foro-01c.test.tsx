// FORO-01c2 (§D-8.3; AGENTS.md, "Todo plan con un formulario nuevo inventaría los VALIDACION fuera de
// contrato"): los 400 VALIDACION que el formulario del foro no espera, al crear (FORO-1C06 a FORO-1C09) y
// al editar (FORO-1C11, con su recorrido de ENTRADAS_FUERA_DE_CONTRATO). En todos, la persona lee un
// solo mensaje legible, lo escrito se conserva y el botón sale de la espera.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { ENTRADAS_FUERA_DE_CONTRATO } from "@/lib/errores-de-api-fuera-de-contrato"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

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
    const foroId = deForo[1] ?? ""
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

const NUEVO = `${BASE}/foros/nuevo`
const editarDe = (foroId = FORO_A) => `${BASE}/foros/${foroId}/editar`
const escrituras = () =>
  estado.llamadas.filter(({ metodo }) => metodo === "POST" || metodo === "PUT")

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

const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const validacion = (mensaje: string) => errorApi(400, "VALIDACION", mensaje)
const marcados = () => document.querySelectorAll("[aria-invalid='true']")

const MODOS = [
  { modo: "crear", ruta: NUEVO, boton: "Publicar foro", metodo: "POST" },
  { modo: "editar", ruta: editarDe(), boton: "Guardar cambios", metodo: "PUT" },
] as const

const abrir = async (ruta: string) => {
  await montar([ruta])
  await screen.findByLabelText("Título", undefined, ESPERA)
  if (ruta === NUEVO) llenarNuevo()
  if (ruta !== NUEVO) {
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Debate nuevo" } })
  }
}

const responderCon = (metodo: string, respuesta: () => Response) => {
  estado.falla = (llamada) => (llamada.metodo === metodo ? respuesta() : undefined)
}

// Lo escrito sigue, ningún campo marcado y el botón fuera de la espera.
const sinCambiosEnElFormulario = (boton: string) => {
  expect(screen.getByLabelText("Título")).toHaveValue("Debate nuevo")
  expect(marcados()).toHaveLength(0)
  expect(screen.getByRole("button", { name: boton })).not.toHaveAttribute("aria-busy", "true")
}

describe.each(MODOS)(
  "Errores fuera de contrato al $modo un foro",
  ({ modo, ruta, boton, metodo }) => {
    const id = (n: string) => (modo === "crear" ? n : `FORO-1C11 (${n})`)

    it(`${id("FORO-1C06")}: un VALIDACION de un campo que el formulario no pinta (foroId, y uno fuera de contrato) da un solo aviso legible y ningún ErrorDeCampo`, async () => {
      await abrir(ruta)
      responderCon(metodo, () => validacion("foroId: foroId: debe ser un identificador válido"))
      fireEvent.click(screen.getByRole("button", { name: boton }))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
      await reposar()
      expect(aviso.error).toHaveBeenCalledWith("Ese foro ya no existe.")
      sinCambiosEnElFormulario(boton)
      responderCon(metodo, () => validacion("campoFueraDeContrato: Revisa este valor."))
      fireEvent.click(screen.getByRole("button", { name: boton }))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2), ESPERA)
      await reposar()
      expect(aviso.error).toHaveBeenLastCalledWith("Revisa este valor.")
      sinCambiosEnElFormulario(boton)
    })

    it.each(["", "   "])(
      `${id("FORO-1C07")}: un VALIDACION con el mensaje «%s» da el genérico del módulo, un solo aviso`,
      async (mensaje) => {
        await abrir(ruta)
        responderCon(metodo, () => validacion(mensaje))
        fireEvent.click(screen.getByRole("button", { name: boton }))
        await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
        await reposar()
        expect(aviso.error).toHaveBeenCalledWith(GENERICO)
        sinCambiosEnElFormulario(boton)
      },
    )

    it(`${id("FORO-1C08")}: con prefijo de ruta «rubrica.1.criterio:», el ErrorDeCampo va en la fila 2, sin la ruta y sin aviso`, async () => {
      await abrir(ruta)
      for (const [fila, texto] of [
        [1, "Argumentos"],
        [2, "Fuentes"],
      ] as const) {
        fireEvent.click(screen.getByRole("button", { name: "Agregar criterio" }))
        fireEvent.change(screen.getByLabelText(`Criterio ${String(fila)}`), {
          target: { value: texto },
        })
        fireEvent.change(screen.getByLabelText(`Puntos máximos ${String(fila)}`), {
          target: { value: "5" },
        })
      }
      responderCon(metodo, () => validacion("rubrica.1.criterio: Ese criterio ya está."))
      fireEvent.click(screen.getByRole("button", { name: boton }))
      expect(
        await screen.findByText("Ese criterio ya está.", undefined, ESPERA),
      ).toBeInTheDocument()
      expect(screen.getByLabelText("Criterio 2")).toHaveAttribute("aria-invalid", "true")
      expect(screen.getByLabelText("Criterio 1")).toHaveAttribute("aria-invalid", "false")
      expect(screen.queryByText(/rubrica\.1/)).toBeNull()
      await reposar()
      expect(aviso.error).not.toHaveBeenCalled()
      expect(screen.getByLabelText("Criterio 2")).toHaveValue("Fuentes")
    })

    it.each([
      [
        "requiereAdjuntos",
        "requiereAdjuntos: Elige cómo se entrega la tarea",
        "Elige cómo se entrega la tarea",
      ],
      ["version", "version: Se requiere la versión.", "Se requiere la versión."],
    ])(
      `${id("FORO-1C08")}: «%s», un campo que el formulario del foro pinta solo en otro tipo o en ningún modo, cuenta como no pintado: un aviso y ningún ErrorDeCampo`,
      async (_campo, mensaje, texto) => {
        await abrir(ruta)
        responderCon(metodo, () => validacion(mensaje))
        fireEvent.click(screen.getByRole("button", { name: boton }))
        await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
        await reposar()
        expect(aviso.error).toHaveBeenCalledWith(texto)
        expect(screen.queryByText("Cómo se entrega")).toBeNull()
        sinCambiosEnElFormulario(boton)
      },
    )

    it(`${id("FORO-1C09")}: tras el ErrorDeCampo de «puntos:» del servidor, un envío que la validación local rechaza muestra solo «Escribe el planteamiento del foro»`, async () => {
      await abrir(ruta)
      responderCon(metodo, () => validacion("puntos: Los puntos no son válidos."))
      fireEvent.click(screen.getByRole("button", { name: boton }))
      expect(
        await screen.findByText("Los puntos no son válidos.", undefined, ESPERA),
      ).toBeInTheDocument()
      await reposar()
      const antes = escrituras().length
      fireEvent.change(screen.getByLabelText("Planteamiento"), { target: { value: "  " } })
      fireEvent.click(screen.getByRole("button", { name: boton }))
      expect(
        await screen.findByText("Escribe el planteamiento del foro", undefined, ESPERA),
      ).toBeInTheDocument()
      expect(screen.queryByText("Los puntos no son válidos.")).toBeNull()
      expect(marcados()).toHaveLength(1)
      expect(aviso.error).not.toHaveBeenCalled()
      expect(escrituras()).toHaveLength(antes)
    })
  },
)

describe("FORO-1C11 · editar un foro recorre ENTRADAS_FUERA_DE_CONTRATO", () => {
  it("FORO-1C11: cada entrada de la tabla da un solo aviso, con el resto sin la ruta o el genérico, ningún ErrorDeCampo, y lo escrito se conserva", async () => {
    await abrir(editarDe())
    let avisos = 0
    for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
      responderCon("PUT", () => validacion(entrada.mensaje))
      fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
      avisos += 1
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(avisos), ESPERA)
      expect(aviso.error).toHaveBeenLastCalledWith(entrada.resto ?? GENERICO)
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Guardar cambios" })).not.toHaveAttribute(
          "aria-busy",
          "true",
        ),
      )
      expect(marcados()).toHaveLength(0)
    }
    expect(avisos).toBe(ENTRADAS_FUERA_DE_CONTRATO.length)
    expect(screen.getByLabelText("Título")).toHaveValue("Debate nuevo")
  }, 60_000)
})
