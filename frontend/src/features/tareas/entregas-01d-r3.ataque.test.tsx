import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { TEXTOS_DE_LA_CLASE } from "@/components/clase/data"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { DetalleTareaView } from "./detalle-tarea-view"

// Ataque ENTREGAS-01d, ronda 3 (tester): el remedio de T-04 y T-05 y sus vecinos. Un aviso por tarea
// perdida y por carga (T-r3-1); dos 404 a la vez (T-r3-2, N-02); un segundo rechazo del servidor en
// "Enlace" y en el hilo (T-r3-3); "Ver más", "Enviar comentario" y "Entregar tarea" con la sesión perdida
// y con un 503 justo antes de desmontar (T-r3-4); descartar el error del servidor; un 409 y un 404 a la
// vez. Arbitraje del manager: dos acciones distintas con el mismo error que no reemplaza la vista dan
// dos avisos. Reloj fijo; servidor en memoria.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const ORIGEN_ALMACEN = "https://almacen.ejemplo.mx"
const RUTA_TAREA = `/api/clases/${CLASE_ID}/tareas/${TAREA_ID}`
const RUTA_ENTREGA = `${RUTA_TAREA}/entrega`
const RUTA_HILO = `${RUTA_ENTREGA}/comentarios`
const RUTA_REFRESCO = "/api/auth/refrescar"
const FRASE_CERRADA = "La fecha límite ya pasó y esta tarea no acepta entregas con retraso."
const uuid = (n: number) => `9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c${String(n).padStart(4, "0")}`

const tareaDoble = (extra: Record<string, unknown> = {}) => ({
  tarea: {
    id: TAREA_ID,
    titulo: "Ensayo final",
    instrucciones: "",
    fechaLimite: FUTURA,
    puntos: 80,
    aceptaTardias: true,
    requiereAdjuntos: true,
    version: 0,
    categoria: null,
    tema: null,
    rubrica: [],
    adjuntos: [],
    autor: { id: uuid(1), nombre: "Luis Pérez", administracion: false },
    creadoEn: "2030-01-01T15:30:00.000Z",
    actualizadoEn: "2030-01-01T15:30:00.000Z",
    puedeEditar: false,
    puedeBorrar: false,
    ...extra,
  },
})

const entregaAsignada = (extra: Record<string, unknown> = {}) => ({
  estado: "asignado",
  fechaEntrega: null,
  conRetraso: false,
  enlaces: [],
  adjuntos: [],
  puedeEntregar: true,
  puedeAnular: false,
  ...extra,
})

const entregaRealizada = (extra: Record<string, unknown> = {}) => ({
  estado: "entregado",
  fechaEntrega: "2030-01-09T15:30:00.000Z",
  conRetraso: false,
  enlaces: ["https://ejemplo.com/mi-trabajo"],
  adjuntos: [],
  puedeEntregar: false,
  puedeAnular: true,
  ...extra,
})

const comentarioDoble = (n: number, texto = `Comentario ${String(n)}`) => ({
  id: uuid(100 + n),
  texto,
  autor: { id: uuid(2), nombre: "Ana Ruiz", administracion: false },
  creadoEn: new Date(Date.UTC(2030, 0, 1, 8, n)).toISOString(),
  propio: true,
})

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

interface Llamada {
  metodo: string
  url: string
  cuerpo: unknown
  cabeceras: unknown
  credenciales: unknown
  senal: AbortSignal | null
}

type Manejador = (llamada: Llamada) => Response | Promise<Response> | undefined

interface Servidor {
  tarea: ReturnType<typeof tareaDoble>
  entrega: Record<string, unknown>
  hilo: ReturnType<typeof comentarioDoble>[]
  manejador: Manejador
}

let servidor: Servidor
let llamadas: Llamada[] = []
const asignar = vi.fn()

const paginaDelHilo = (url: string) => {
  const parametros = new URL(url, "http://local").searchParams
  const limite = Number(parametros.get("limite") ?? "20")
  const cursor = parametros.get("cursor")
  const desde = cursor === null ? 0 : servidor.hilo.findIndex((c) => c.id === cursor) + 1
  const comentarios = servidor.hilo.slice(desde, desde + limite)
  const ultimo = comentarios.at(-1)
  const quedan = desde + limite < servidor.hilo.length
  return { comentarios, siguienteCursor: quedan && ultimo !== undefined ? ultimo.id : null }
}

const instalarServidor = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = String(entrada)
      const metodo = init?.method ?? "GET"
      const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : null
      const llamada = {
        metodo,
        url,
        cuerpo,
        cabeceras: init?.headers,
        credenciales: init?.credentials,
        senal: init?.signal ?? null,
      }
      llamadas.push(llamada)
      const propia = servidor.manejador(llamada)
      if (propia !== undefined) return Promise.resolve(propia)
      if (url.startsWith(ORIGEN_ALMACEN)) {
        return Promise.resolve(new Response(null, { status: 200 }))
      }
      if (metodo === "POST" && url === RUTA_REFRESCO) {
        return Promise.resolve(respuestaJson(200, { tokenAcceso: "token-renovado" }))
      }
      if (metodo === "GET" && url === RUTA_TAREA) {
        return Promise.resolve(respuestaJson(200, servidor.tarea))
      }
      if (metodo === "GET" && url === RUTA_ENTREGA) {
        return Promise.resolve(respuestaJson(200, { entrega: servidor.entrega }))
      }
      if (metodo === "POST" && url === `${RUTA_ENTREGA}/archivos`) {
        const solicitudes = llamadas.filter((l) => l.url === url).length
        return Promise.resolve(
          respuestaJson(201, {
            archivo: {
              id: uuid(500 + solicitudes),
              nombre: "x",
              tipo: "application/pdf",
              tamano: 1,
            },
            subida: {
              url: `${ORIGEN_ALMACEN}/subida/${String(solicitudes)}`,
              metodo: "PUT",
              cabeceras: { "Content-Type": "application/pdf" },
              expiraEn: "2030-01-10T12:05:00.000Z",
            },
          }),
        )
      }
      if (metodo === "POST" && url === RUTA_ENTREGA) {
        servidor.entrega = entregaRealizada({ fechaEntrega: new Date().toISOString() })
        return Promise.resolve(respuestaJson(200, { entrega: servidor.entrega }))
      }
      if (metodo === "POST" && url === `${RUTA_ENTREGA}/anular`) {
        servidor.entrega = entregaAsignada()
        return Promise.resolve(respuestaJson(200, { entrega: servidor.entrega }))
      }
      if (metodo === "GET" && url.startsWith(`${RUTA_HILO}?`)) {
        return Promise.resolve(respuestaJson(200, paginaDelHilo(url)))
      }
      if (metodo === "POST" && url === RUTA_HILO) {
        const texto = (cuerpo as { texto: string }).texto
        const nuevo = comentarioDoble(servidor.hilo.length + 1, texto)
        servidor.hilo = [...servidor.hilo, nuevo]
        return Promise.resolve(respuestaJson(201, { comentario: nuevo }))
      }
      return Promise.resolve(errorApi(500, "ERROR_INTERNO", "no esperada"))
    }),
  )
}

const renderDetalle = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/estudiante/clases/${CLASE_ID}/tareas/${TAREA_ID}`]}>
        <Routes>
          <Route
            path="/estudiante/clases/:claseId/tareas/:tareaId"
            element={<DetalleTareaView />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return queryClient
}

const pedidasA = (metodo: string, url: string) =>
  llamadas.filter((l) => l.metodo === metodo && l.url === url)

const agregarEnlace = (enlace: string) => {
  fireEvent.change(screen.getByLabelText("Enlace"), { target: { value: enlace } })
  fireEvent.click(screen.getByRole("button", { name: "Agregar enlace" }))
}

const diferido = () => {
  let resolver: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver }
}

// Con Date congelado, una recarga deja el mismo dataUpdatedAt y la clave del foco no cambia (artefacto
// de las pruebas, arbitrado en T-r1-5 de 01a): se adelanta el reloj antes de cada acción que recarga.
const avanzarReloj = () => vi.setSystemTime(new Date(Date.now() + 5000))

const reposar = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 30))
  })
}

const focoFueraDeBody = () => {
  expect(document.activeElement).not.toBeNull()
  expect(document.activeElement).not.toBe(document.body)
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  llamadas = []
  servidor = {
    tarea: tareaDoble(),
    entrega: entregaAsignada(),
    hilo: [],
    manejador: () => undefined,
  }
  instalarServidor()
  vi.stubGlobal("location", { ...window.location, assign: asignar })
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  aviso.success.mockClear()
  aviso.error.mockClear()
  asignar.mockReset()
})

const MENSAJES: Record<string, string> = {
  ENTREGA_YA_REALIZADA: "Ya entregaste esta tarea. Si quieres cambiarla, anula tu entrega primero.",
  ENTREGA_NO_REALIZADA: "No tienes una entrega que anular.",
  ENTREGA_CALIFICADA: "Tu entrega ya está calificada y no se puede cambiar.",
  ENTREGA_CERRADA: FRASE_CERRADA,
}
const NO_EXISTE = "Esa tarea ya no existe."
const SIN_ACCESO = TEXTOS_DE_LA_CLASE.sinAcceso

// Las peticiones hechas desde el índice `desde` de `llamadas` (las que siguen a una acción).
const despuesDe = (desde: number, metodo: string, url: string) =>
  llamadas.slice(desde).filter((l) => l.metodo === metodo && l.url === url)

const escribirYEnviar = (texto: string) => {
  const campo = screen.getByLabelText("Comentario privado")
  fireEvent.change(campo, { target: { value: texto } })
  campo.focus()
  fireEvent.click(screen.getByRole("button", { name: "Enviar comentario" }))
}

const esPaginaSiguiente = (l: Llamada) =>
  l.metodo === "GET" && l.url.startsWith(`${RUTA_HILO}?`) && l.url.includes("cursor=")

const sesionPerdida = (l: Llamada) =>
  l.metodo === "POST" && l.url === RUTA_REFRESCO
    ? errorApi(401, "NO_AUTENTICADO", "Tu sesión terminó.")
    : undefined

describe("ataque ENTREGAS-01d r3: un aviso por tarea perdida y por carga (T-r3-1)", () => {
  it("comentar y entregar fallan a la vez con 404 TAREA_NO_ENCONTRADA: un solo aviso y la vista pasa a «Esa tarea ya no existe.»", async () => {
    const comentario = diferido()
    const entrega = diferido()
    let fallo = false
    servidor.manejador = (l) => {
      if (l.metodo === "POST" && l.url === RUTA_HILO) return comentario.promesa
      if (l.metodo === "POST" && l.url === RUTA_ENTREGA) return entrega.promesa
      if (fallo && l.metodo === "GET" && l.url === RUTA_TAREA) {
        return errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE)
      }
      return undefined
    }
    renderDetalle()
    await screen.findByText("Aún no hay comentarios privados.")
    agregarEnlace("https://ejemplo.com/a")
    fireEvent.click(screen.getByRole("button", { name: "Entregar tarea" }))
    escribirYEnviar("Hola")
    await waitFor(() => expect(pedidasA("POST", RUTA_HILO)).toHaveLength(1))
    await waitFor(() => expect(pedidasA("POST", RUTA_ENTREGA)).toHaveLength(1))
    fallo = true
    avanzarReloj()
    comentario.resolver(errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE))
    entrega.resolver(errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE))
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Tu trabajo" })).toBeNull())
    await reposar()
    expect(aviso.error.mock.calls).toEqual([[NO_EXISTE]])
    expect(screen.getByText(NO_EXISTE)).toBeInTheDocument()
    focoFueraDeBody()
  })

  it("otra carga de la misma tarea vuelve a avisar: un 403 al comentar con la tarea aún visible, la tarea recarga bien, y un segundo 403 avisa otra vez", async () => {
    servidor.manejador = (l) =>
      l.metodo === "POST" && l.url === RUTA_HILO
        ? errorApi(403, "SIN_ACCESO_A_LA_CLASE", SIN_ACCESO)
        : undefined
    renderDetalle()
    await screen.findByText("Aún no hay comentarios privados.")
    const desde = llamadas.length
    avanzarReloj()
    escribirYEnviar("Uno")
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(despuesDe(desde, "GET", RUTA_TAREA)).toHaveLength(1))
    await reposar()
    expect(screen.getByRole("heading", { name: "Tu trabajo" })).toBeInTheDocument()
    avanzarReloj()
    escribirYEnviar("Dos")
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2))
    await reposar()
    expect(aviso.error.mock.calls).toEqual([[SIN_ACCESO], [SIN_ACCESO]])
  })

  it("en la misma carga, un segundo 403 mientras la tarea aún se recarga no repite el aviso", async () => {
    const recarga = diferido()
    let posts = 0
    servidor.manejador = (l) => {
      if (l.metodo === "POST" && l.url === RUTA_HILO) {
        posts += 1
        return errorApi(403, "SIN_ACCESO_A_LA_CLASE", SIN_ACCESO)
      }
      if (posts > 0 && l.metodo === "GET" && l.url === RUTA_TAREA)
        return recarga.promesa.then(() => errorApi(403, "SIN_ACCESO_A_LA_CLASE", SIN_ACCESO))
      return undefined
    }
    renderDetalle()
    await screen.findByText("Aún no hay comentarios privados.")
    escribirYEnviar("Uno")
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Enviar comentario" })).not.toHaveAttribute(
        "aria-busy",
        "true",
      ),
    )
    escribirYEnviar("Dos")
    await waitFor(() => expect(posts).toBe(2))
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(1)
    recarga.resolver(new Response(null))
    await screen.findByText(SIN_ACCESO)
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })
})

describe("ataque ENTREGAS-01d r3: dos 404 a la vez (T-r3-2, N-02)", () => {
  it("«Entregar tarea» y «Ver más comentarios» responden 404 a la vez: un aviso, la vista dice «Esa tarea ya no existe.» y solo una recarga de la tarea queda viva", async () => {
    servidor.hilo = Array.from({ length: 25 }, (_, i) => comentarioDoble(i + 1))
    const pagina = diferido()
    const entrega = diferido()
    let fallo = false
    servidor.manejador = (l) => {
      if (esPaginaSiguiente(l)) return pagina.promesa
      if (l.metodo === "POST" && l.url === RUTA_ENTREGA) return entrega.promesa
      if (fallo && l.metodo === "GET" && l.url === RUTA_TAREA) {
        return errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE)
      }
      return undefined
    }
    renderDetalle()
    fireEvent.click(await screen.findByRole("button", { name: "Ver más comentarios" }))
    agregarEnlace("https://ejemplo.com/a")
    screen.getByRole("button", { name: "Entregar tarea" }).focus()
    fireEvent.click(screen.getByRole("button", { name: "Entregar tarea" }))
    await waitFor(() => expect(pedidasA("POST", RUTA_ENTREGA)).toHaveLength(1))
    fallo = true
    const desde = llamadas.length
    avanzarReloj()
    pagina.resolver(errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE))
    entrega.resolver(errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE))
    await screen.findByText(NO_EXISTE)
    await reposar()
    const recargas = despuesDe(desde, "GET", RUTA_TAREA)
    const vivas = recargas.filter((l) => l.senal === null || !l.senal.aborted)
    expect(aviso.error.mock.calls).toEqual([[NO_EXISTE]])
    expect(recargas.length).toBeGreaterThanOrEqual(1)
    expect(recargas.length).toBeLessThanOrEqual(2)
    expect(vivas.length).toBeGreaterThanOrEqual(1)
    focoFueraDeBody()
  })

  it("un 409 al entregar y un 404 al comentar a la vez: la vista termina en «Esa tarea ya no existe.», sin avisos repetidos", async () => {
    const comentario = diferido()
    const entrega = diferido()
    let fallo = false
    servidor.manejador = (l) => {
      if (l.metodo === "POST" && l.url === RUTA_HILO) return comentario.promesa
      if (l.metodo === "POST" && l.url === RUTA_ENTREGA) return entrega.promesa
      if (fallo && l.metodo === "GET" && l.url === RUTA_TAREA) {
        return errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE)
      }
      if (fallo && l.metodo === "GET" && l.url === RUTA_ENTREGA) {
        return errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE)
      }
      return undefined
    }
    renderDetalle()
    await screen.findByText("Aún no hay comentarios privados.")
    agregarEnlace("https://ejemplo.com/a")
    fireEvent.click(screen.getByRole("button", { name: "Entregar tarea" }))
    escribirYEnviar("Hola")
    await waitFor(() => expect(pedidasA("POST", RUTA_HILO)).toHaveLength(1))
    fallo = true
    avanzarReloj()
    entrega.resolver(errorApi(409, "ENTREGA_YA_REALIZADA", MENSAJES.ENTREGA_YA_REALIZADA ?? ""))
    comentario.resolver(errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE))
    await screen.findByText(NO_EXISTE)
    await reposar()
    const avisos = aviso.error.mock.calls.map((c) => String(c[0]))
    expect(new Set(avisos).size).toBe(avisos.length)
    expect(avisos).toContain(NO_EXISTE)
    expect(screen.queryByRole("heading", { name: "Tu trabajo" })).toBeNull()
    focoFueraDeBody()
  })
})

describe("ataque ENTREGAS-01d r3: un segundo rechazo del servidor (T-r3-3)", () => {
  it("«Enlace»: el segundo rechazo deja solo el mensaje nuevo, con un único id del servidor en aria-describedby", async () => {
    let posts = 0
    servidor.manejador = (l) => {
      if (l.metodo !== "POST" || l.url !== RUTA_ENTREGA) return undefined
      posts += 1
      return errorApi(400, "VALIDACION", `enlaces.0: Mensaje ${posts === 1 ? "uno" : "dos"}.`)
    }
    renderDetalle()
    await screen.findByLabelText("Enlace")
    agregarEnlace("https://ejemplo.com/a")
    fireEvent.click(screen.getByRole("button", { name: "Entregar tarea" }))
    await screen.findByText("Mensaje uno.")
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Entregar tarea" })).not.toHaveAttribute(
        "aria-busy",
        "true",
      ),
    )
    fireEvent.click(screen.getByRole("button", { name: "Entregar tarea" }))
    await screen.findByText("Mensaje dos.")
    await reposar()
    expect(screen.queryByText("Mensaje uno.")).toBeNull()
    expect(screen.getAllByText("Mensaje dos.")).toHaveLength(1)
    const campo = screen.getByLabelText("Enlace")
    const ids = (campo.getAttribute("aria-describedby") ?? "").split(" ").filter((id) => id !== "")
    expect(new Set(ids).size).toBe(ids.length)
    const descripcion = ids.map((id) => document.getElementById(id)?.textContent ?? "").join(" ")
    expect(descripcion).toContain("Mensaje dos.")
    expect(descripcion).not.toContain("Mensaje uno.")
    expect(campo).toHaveAttribute("aria-invalid", "true")
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("hilo: el segundo rechazo del texto deja solo el mensaje nuevo bajo el campo y lo describe", async () => {
    let posts = 0
    servidor.manejador = (l) => {
      if (l.metodo !== "POST" || l.url !== RUTA_HILO) return undefined
      posts += 1
      return errorApi(400, "VALIDACION", `texto: Texto ${posts === 1 ? "uno" : "dos"}.`)
    }
    renderDetalle()
    await screen.findByText("Aún no hay comentarios privados.")
    escribirYEnviar("Hola")
    await screen.findByText("Texto uno.")
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Enviar comentario" })).not.toHaveAttribute(
        "aria-busy",
        "true",
      ),
    )
    fireEvent.click(screen.getByRole("button", { name: "Enviar comentario" }))
    await screen.findByText("Texto dos.")
    await reposar()
    expect(screen.queryByText("Texto uno.")).toBeNull()
    const campo = screen.getByLabelText("Comentario privado")
    expect(campo).toHaveAttribute("aria-invalid", "true")
    expect(campo).toHaveAccessibleDescription("Texto dos.")
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("descartar el error del servidor: en «Enlace» al escribir, al agregar uno válido y al quitar; en el hilo al escribir", async () => {
    servidor.manejador = (l) => {
      if (l.metodo === "POST" && l.url === RUTA_ENTREGA) {
        return errorApi(400, "VALIDACION", "enlaces.0: Rechazado.")
      }
      if (l.metodo === "POST" && l.url === RUTA_HILO) {
        return errorApi(400, "VALIDACION", "texto: Texto rechazado.")
      }
      return undefined
    }
    renderDetalle()
    await screen.findByText("Aún no hay comentarios privados.")
    agregarEnlace("https://ejemplo.com/a")
    const entregarYEsperar = async () => {
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Entregar tarea" })).not.toHaveAttribute(
          "aria-busy",
          "true",
        ),
      )
      fireEvent.click(screen.getByRole("button", { name: "Entregar tarea" }))
      await screen.findByText("Rechazado.")
    }
    await entregarYEsperar()
    fireEvent.change(screen.getByLabelText("Enlace"), { target: { value: "h" } })
    await waitFor(() => expect(screen.queryByText("Rechazado.")).toBeNull())
    expect(screen.getByLabelText("Enlace")).toHaveAttribute("aria-invalid", "false")
    fireEvent.change(screen.getByLabelText("Enlace"), { target: { value: "" } })

    await entregarYEsperar()
    agregarEnlace("https://ejemplo.com/b")
    await waitFor(() => expect(screen.queryByText("Rechazado.")).toBeNull())

    await entregarYEsperar()
    fireEvent.click(screen.getByRole("button", { name: "Quitar https://ejemplo.com/b" }))
    await waitFor(() => expect(screen.queryByText("Rechazado.")).toBeNull())
    expect(screen.getByLabelText("Enlace")).toHaveAttribute("aria-invalid", "false")

    escribirYEnviar("Hola")
    await screen.findByText("Texto rechazado.")
    fireEvent.change(screen.getByLabelText("Comentario privado"), { target: { value: "Hola!" } })
    await waitFor(() => expect(screen.queryByText("Texto rechazado.")).toBeNull())
    expect(screen.getByLabelText("Comentario privado")).toHaveAttribute("aria-invalid", "false")
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

describe("ataque ENTREGAS-01d r3: sesión perdida y 503 justo antes de desmontar (T-r3-4)", () => {
  it("«Ver más comentarios» con la sesión perdida (401 y refresco rechazado): una redirección a /login y ningún aviso", async () => {
    servidor.hilo = Array.from({ length: 25 }, (_, i) => comentarioDoble(i + 1))
    servidor.manejador = (l) => {
      if (esPaginaSiguiente(l)) return errorApi(401, "NO_AUTENTICADO", "El token venció.")
      return sesionPerdida(l)
    }
    renderDetalle()
    fireEvent.click(await screen.findByRole("button", { name: "Ver más comentarios" }))
    await waitFor(() => expect(asignar).toHaveBeenCalledTimes(1))
    await reposar()
    expect(asignar).toHaveBeenCalledWith("/login")
    expect(aviso.error).not.toHaveBeenCalled()
    expect(pedidasA("POST", RUTA_REFRESCO)).toHaveLength(1)
  })

  it.each([
    { accion: "Enviar comentario", ruta: RUTA_HILO },
    { accion: "Entregar tarea", ruta: RUTA_ENTREGA },
  ])(
    "«$accion» con la sesión perdida: una sola redirección a /login, un solo refresco y como mucho un aviso",
    async ({ accion, ruta }) => {
      servidor.manejador = (l) => {
        if (l.metodo === "POST" && l.url === ruta) {
          return errorApi(401, "NO_AUTENTICADO", "El token venció.")
        }
        return sesionPerdida(l)
      }
      renderDetalle()
      await screen.findByText("Aún no hay comentarios privados.")
      if (accion === "Enviar comentario") escribirYEnviar("Hola")
      if (accion === "Entregar tarea") {
        agregarEnlace("https://ejemplo.com/a")
        fireEvent.click(screen.getByRole("button", { name: "Entregar tarea" }))
      }
      await waitFor(() => expect(asignar).toHaveBeenCalledTimes(1))
      await reposar()
      expect(asignar).toHaveBeenCalledWith("/login")
      expect(pedidasA("POST", RUTA_REFRESCO)).toHaveLength(1)
      expect(aviso.error.mock.calls.length).toBeLessThanOrEqual(1)
      expect(despuesDe(0, "GET", RUTA_TAREA)).toHaveLength(1)
    },
  )

  it("«Ver más comentarios» con un 503 que llega justo después de desmontar la vista: ningún aviso y nada en la consola", async () => {
    servidor.hilo = Array.from({ length: 25 }, (_, i) => comentarioDoble(i + 1))
    const pagina = diferido()
    servidor.manejador = (l) => (esPaginaSiguiente(l) ? pagina.promesa : undefined)
    const consola = vi.spyOn(console, "error").mockImplementation(() => undefined)
    try {
      renderDetalle()
      fireEvent.click(await screen.findByRole("button", { name: "Ver más comentarios" }))
      await waitFor(() => expect(llamadas.filter(esPaginaSiguiente)).toHaveLength(1))
      cleanup()
      pagina.resolver(errorApi(503, "SERVICIO_OCUPADO", "El servicio está ocupado."))
      await reposar()
      expect(aviso.error).not.toHaveBeenCalled()
      expect(consola).not.toHaveBeenCalled()
    } finally {
      consola.mockRestore()
    }
  })

  it.each([
    { accion: "Enviar comentario", ruta: RUTA_HILO },
    { accion: "Entregar tarea", ruta: RUTA_ENTREGA },
  ])(
    "«$accion» con un 503 que llega justo después de desmontar: un solo aviso (el del gancho), ninguna petición más y nada en la consola",
    async ({ accion, ruta }) => {
      const respuesta = diferido()
      servidor.manejador = (l) =>
        l.metodo === "POST" && l.url === ruta ? respuesta.promesa : undefined
      const consola = vi.spyOn(console, "error").mockImplementation(() => undefined)
      try {
        renderDetalle()
        await screen.findByText("Aún no hay comentarios privados.")
        if (accion === "Enviar comentario") escribirYEnviar("Hola")
        if (accion === "Entregar tarea") {
          agregarEnlace("https://ejemplo.com/a")
          fireEvent.click(screen.getByRole("button", { name: "Entregar tarea" }))
        }
        await waitFor(() => expect(pedidasA("POST", ruta)).toHaveLength(1))
        cleanup()
        const desde = llamadas.length
        respuesta.resolver(errorApi(503, "SERVICIO_OCUPADO", "El servicio está ocupado."))
        await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
        await reposar()
        expect(aviso.error).toHaveBeenCalledTimes(1)
        expect(llamadas.slice(desde)).toEqual([])
        expect(consola).not.toHaveBeenCalled()
      } finally {
        consola.mockRestore()
      }
    },
  )
})

// Revisión estática del cambio de la ronda 2 (sin hallazgo esperado).
const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})

describe("ataque ENTREGAS-01d r3: revisión estática del remedio", () => {
  it("CODIGOS_QUE_REDIRIGE_EL_CLIENTE son exactamente los que apiClient redirige; sin disabled, ?? [], fetch( ni importaciones de otros módulos en lo que cambió", () => {
    const datos = fuentes["/src/features/tareas/data.ts"] ?? ""
    const bloque = /CODIGOS_QUE_REDIRIGE_EL_CLIENTE[^=]*=\s*\[([^\]]*)\]/.exec(datos)?.[1] ?? ""
    const codigos = [...bloque.matchAll(/"([A-Z_]+)"/g)].map((m) => m[1]).sort()
    expect(codigos).toEqual([
      "ACCESO_RESTRINGIDO",
      "CAMBIO_DE_CONTRASENA_REQUERIDO",
      "NO_AUTENTICADO",
    ])
    const cliente = fuentes["/src/services/apiClient.ts"] ?? ""
    expect(cliente).toContain('error.codigo === "ACCESO_RESTRINGIDO"')
    expect(cliente).toContain('error.codigo === "CAMBIO_DE_CONTRASENA_REQUERIDO"')
    expect(cliente).toContain('new ApiError("NO_AUTENTICADO"')
    const cambiados = [
      "/src/features/tareas/hooks.ts",
      "/src/features/tareas/lib.ts",
      "/src/features/tareas/data.ts",
      "/src/features/tareas/components/campo-de-enlaces.tsx",
      "/src/features/tareas/components/formulario-de-entrega.tsx",
      "/src/features/tareas/components/hilo-privado.tsx",
      "/src/features/tareas/detalle-tarea-view.tsx",
    ]
    const malos = cambiados.flatMap((ruta) => {
      const texto = fuentes[ruta]
      if (texto === undefined) return [`${ruta}: no existe`]
      const lista: string[] = []
      if (/\sdisabled(=|\s|>|\})/.test(texto)) lista.push("disabled")
      if (/\?\?\s*\[\s*\]/.test(texto)) lista.push("?? []")
      if (/\bfetch\(/.test(texto)) lista.push("fetch(")
      if (/from\s+["']@\/features\/(?!tareas)/.test(texto)) lista.push("otro módulo")
      return lista.map((m) => `${ruta}: ${m}`)
    })
    expect(malos).toEqual([])
  })

  it("sin ganchos nuevos exportados en hooks.ts respecto a la ronda 1 (los del hilo y la entrega son los mismos)", () => {
    const hooks = fuentes["/src/features/tareas/hooks.ts"] ?? ""
    const exportados = [...hooks.matchAll(/^export const (use\w+)/gm)].map((m) => m[1])
    const deEntregas = exportados.filter((n) =>
      /Entrega|Hilo|Comentar|Entregar|Anular/.test(n ?? ""),
    )
    expect(deEntregas.sort()).toEqual(
      [
        "useAnularEntrega",
        "useComentarEnHilo",
        "useEntregar",
        "useHiloPrivado",
        "useMiEntrega",
      ].sort(),
    )
  })
})

describe("ataque ENTREGAS-01d r3: la recarga cancelada no termina después (T-r3-2, N-02)", () => {
  it("comentar y «Ver más comentarios» con 404 a la vez: salen dos GET de la tarea; la primera responde 200 al final y no revive la vista", async () => {
    servidor.hilo = Array.from({ length: 25 }, (_, i) => comentarioDoble(i + 1))
    const pagina = diferido()
    const comentario = diferido()
    const primeraRecarga = diferido()
    let fallo = false
    let recargas = 0
    servidor.manejador = (l) => {
      if (esPaginaSiguiente(l)) return pagina.promesa
      if (l.metodo === "POST" && l.url === RUTA_HILO) return comentario.promesa
      if (fallo && l.metodo === "GET" && l.url === RUTA_TAREA) {
        recargas += 1
        if (recargas === 1) return primeraRecarga.promesa
        return errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE)
      }
      return undefined
    }
    renderDetalle()
    fireEvent.click(await screen.findByRole("button", { name: "Ver más comentarios" }))
    escribirYEnviar("Hola")
    await waitFor(() => expect(pedidasA("POST", RUTA_HILO)).toHaveLength(1))
    fallo = true
    avanzarReloj()
    comentario.resolver(errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE))
    await waitFor(() => expect(recargas).toBe(1))
    pagina.resolver(errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE))
    await waitFor(() => expect(recargas).toBe(2))
    await screen.findByText(NO_EXISTE)
    avanzarReloj()
    primeraRecarga.resolver(respuestaJson(200, tareaDoble({ titulo: "Revivida" })))
    await reposar()
    expect(screen.queryByText("Revivida")).toBeNull()
    expect(screen.getByText(NO_EXISTE)).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Tu trabajo" })).toBeNull()
    expect(aviso.error.mock.calls).toEqual([[NO_EXISTE]])
  })
})
