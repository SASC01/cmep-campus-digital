import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { miEntregaRespuestaSchema } from "@campus/shared"

import { clavePrefijoDelTrabajo } from "@/services/trabajoService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { DetalleTareaView } from "./detalle-tarea-view"

// Ataque ENTREGAS-01d, ronda 1 (tester). "Tu trabajo" y el hilo privado del alumno: la ruta de la
// subida, el token que nunca viaja al almacén (también tras un refresco silencioso, T-r1-3), una sola
// petición por acción con doble clic o envío repetido, el foco en los estados vecinos (409, subida
// fallida, quitar el último archivo, recarga que quita el botón enfocado; T-r1-1), los errores del
// servidor al entregar (T-r1-4), el javascript: en una respuesta mal formada, los enlaces de 2048
// caracteres (T-r1-2) y el hilo durante una recarga (T-r1-5). Reloj fijo en todas; el servidor es un
// doble en memoria y el almacén, otro origen.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
const PASADA = "2030-01-05T16:00:00.000Z"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const ORIGEN_ALMACEN = "https://almacen.ejemplo.mx"
const RUTA_TAREA = `/api/clases/${CLASE_ID}/tareas/${TAREA_ID}`
const RUTA_ENTREGA = `${RUTA_TAREA}/entrega`
const RUTA_HILO = `${RUTA_ENTREGA}/comentarios`
const RUTA_REFRESCO = "/api/auth/refrescar"
const PRIVACIDAD = "Solo tú, tus maestros y la administración pueden verlos."
const FRASE_CERRADA = "La fecha límite ya pasó y esta tarea no acepta entregas con retraso."
const VACIA = "Agrega al menos un archivo o un enlace para entregar."
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

// C-5 de CALIFICACIONES-01a (§D-R0, A-5): MiEntrega suma calificacion (obligatoria, puede ser null).
const entregaAsignada = (extra: Record<string, unknown> = {}) => ({
  estado: "asignado",
  fechaEntrega: null,
  conRetraso: false,
  enlaces: [],
  adjuntos: [],
  puedeEntregar: true,
  puedeAnular: false,
  calificacion: null,
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
  calificacion: null,
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

// Lee una cabecera de un Headers (apiClient) o de un objeto plano (subirArchivo), sin importar las
// mayúsculas del nombre.
const cabecera = (cabeceras: unknown, nombre: string): string | null => {
  if (cabeceras instanceof Headers) return cabeceras.get(nombre)
  if (cabeceras === undefined || cabeceras === null) return null
  const encontrada = Object.entries(cabeceras as Record<string, string>).find(
    ([clave]) => clave.toLowerCase() === nombre.toLowerCase(),
  )
  return encontrada === undefined ? null : encontrada[1]
}

const valoresDeCabeceras = (cabeceras: unknown): string[] => {
  if (cabeceras instanceof Headers) return [...cabeceras.values()]
  if (cabeceras === undefined || cabeceras === null) return []
  return Object.values(cabeceras as Record<string, string>)
}

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

const seccionTuTrabajo = () => {
  const seccion = screen.getByRole("heading", { name: "Tu trabajo" }).closest("section")
  if (seccion === null) throw new Error("Precondición: «Tu trabajo» es una sección")
  return seccion
}
const pedidasA = (metodo: string, url: string) =>
  llamadas.filter((l) => l.metodo === metodo && l.url === url)
const alAlmacen = () => llamadas.filter((l) => l.url.startsWith(ORIGEN_ALMACEN))
const paginasDelHiloPedidas = (conCursor: boolean) =>
  llamadas.filter(
    (l) =>
      l.metodo === "GET" &&
      l.url.startsWith(`${RUTA_HILO}?`) &&
      l.url.includes("cursor=") === conCursor,
  )

const elegirArchivos = (...nombres: string[]) => {
  const archivos = nombres.map(
    (nombre) => new File(["contenido"], nombre, { type: "application/pdf" }),
  )
  fireEvent.change(screen.getByLabelText("Adjuntar archivos"), { target: { files: archivos } })
}

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

describe("ataque ENTREGAS-01d r1: la subida y el token (T-r1-3)", () => {
  it("dos archivos con un 401 a medio camino: cada archivo se pide por la ruta de la entrega (nunca por la de la clase), los dos PUT van sin Authorization ni credenciales y sin el token en ninguna cabecera, y la entrega sale con el token renovado", async () => {
    let rechazada = false
    servidor.manejador = (l) => {
      const segunda = pedidasA("POST", `${RUTA_ENTREGA}/archivos`).length === 2
      if (l.metodo === "POST" && l.url === `${RUTA_ENTREGA}/archivos` && segunda && !rechazada) {
        rechazada = true
        return errorApi(401, "NO_AUTENTICADO", "El token venció.")
      }
      return undefined
    }
    renderDetalle()
    await screen.findByLabelText("Enlace")
    elegirArchivos("uno.pdf", "dos.pdf")
    fireEvent.click(screen.getByRole("button", { name: "Entregar tarea" }))
    await screen.findByText(/Entregaste el/)

    expect(rechazada).toBe(true)
    expect(pedidasA("POST", RUTA_REFRESCO)).toHaveLength(1)
    expect(llamadas.filter((l) => l.url.startsWith(`/api/clases/${CLASE_ID}/archivos`))).toEqual([])
    expect(pedidasA("POST", `${RUTA_ENTREGA}/archivos`)).toHaveLength(3)
    const subidas = alAlmacen()
    expect(subidas.map((l) => l.metodo)).toEqual(["PUT", "PUT"])
    for (const subida of subidas) {
      expect(cabecera(subida.cabeceras, "Authorization")).toBeNull()
      expect(subida.credenciales).toBe("omit")
      expect(valoresDeCabeceras(subida.cabeceras).join(" ")).not.toMatch(/token/i)
    }
    const [entrega] = pedidasA("POST", RUTA_ENTREGA)
    if (entrega === undefined) throw new Error("Precondición: hubo un POST de la entrega")
    expect(cabecera(entrega.cabeceras, "Authorization")).toBe("Bearer token-renovado")
    expect(entrega.cuerpo).toMatchObject({ enlaces: [] })
    expect((entrega.cuerpo as { archivoIds: string[] }).archivoIds).toHaveLength(2)
  })
})

describe("ataque ENTREGAS-01d r1: una sola petición por acción (enEspera y guarda con ref)", () => {
  it("«Marcar como completada»: doble clic y tres envíos del formulario (Enter repetido) hacen un solo POST; el botón queda en espera mientras vuela", async () => {
    servidor.tarea = tareaDoble({ requiereAdjuntos: false })
    const respuesta = diferido()
    servidor.manejador = (l) =>
      l.metodo === "POST" && l.url === RUTA_ENTREGA ? respuesta.promesa : undefined
    renderDetalle()
    const boton = await screen.findByRole("button", { name: "Marcar como completada" })
    const formulario = boton.closest("form")
    if (formulario === null) throw new Error("Precondición: el botón vive en un formulario")
    fireEvent.click(boton)
    fireEvent.click(boton)
    fireEvent.submit(formulario)
    fireEvent.submit(formulario)
    fireEvent.submit(formulario)
    await waitFor(() => expect(boton).toHaveAttribute("aria-busy", "true"))
    expect(pedidasA("POST", RUTA_ENTREGA)).toHaveLength(1)
    servidor.entrega = entregaRealizada({ enlaces: [], fechaEntrega: AHORA.toISOString() })
    respuesta.resolver(respuestaJson(200, { entrega: servidor.entrega }))
    await screen.findByText(/Marcaste como completada el/)
    expect(pedidasA("POST", RUTA_ENTREGA)).toHaveLength(1)
    expect(aviso.success).toHaveBeenCalledTimes(1)
    expect(aviso.success).toHaveBeenCalledWith("Marcaste la tarea como completada")
  })

  it("«Sí, anular entrega»: tres clics en vuelo hacen un solo POST …/anular y «Cancelar» no cierra mientras vuela", async () => {
    servidor.entrega = entregaRealizada()
    const respuesta = diferido()
    servidor.manejador = (l) =>
      l.metodo === "POST" && l.url === `${RUTA_ENTREGA}/anular` ? respuesta.promesa : undefined
    renderDetalle()
    fireEvent.click(await screen.findByRole("button", { name: "Anular entrega" }))
    const si = screen.getByRole("button", { name: "Sí, anular entrega" })
    fireEvent.click(si)
    fireEvent.click(si)
    fireEvent.click(si)
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(si).toHaveAttribute("aria-busy", "true"))
    expect(si).toBeInTheDocument()
    expect(pedidasA("POST", `${RUTA_ENTREGA}/anular`)).toHaveLength(1)
    servidor.entrega = entregaAsignada()
    respuesta.resolver(respuestaJson(200, { entrega: servidor.entrega }))
    await screen.findByRole("button", { name: "Entregar tarea" })
    expect(pedidasA("POST", `${RUTA_ENTREGA}/anular`)).toHaveLength(1)
    expect(aviso.success).toHaveBeenCalledTimes(1)
  })

  it("«Enviar comentario»: dos clics y dos envíos del formulario en vuelo hacen un solo POST; el comentario aparece una vez", async () => {
    const respuesta = diferido()
    servidor.manejador = (l) => {
      if (l.metodo !== "POST" || l.url !== RUTA_HILO) return undefined
      const nuevo = comentarioDoble(1, "Hola, maestro")
      servidor.hilo = [nuevo]
      return respuesta.promesa.then(() => respuestaJson(201, { comentario: nuevo }))
    }
    renderDetalle()
    const campo = await screen.findByLabelText("Comentario privado")
    fireEvent.change(campo, { target: { value: "Hola, maestro" } })
    const enviar = screen.getByRole("button", { name: "Enviar comentario" })
    const formulario = enviar.closest("form")
    if (formulario === null)
      throw new Error("Precondición: «Enviar comentario» vive en un formulario")
    fireEvent.click(enviar)
    fireEvent.click(enviar)
    fireEvent.submit(formulario)
    fireEvent.submit(formulario)
    await waitFor(() => expect(enviar).toHaveAttribute("aria-busy", "true"))
    expect(pedidasA("POST", RUTA_HILO)).toHaveLength(1)
    avanzarReloj()
    respuesta.resolver(new Response(null))
    const lista = await screen.findByRole("list", { name: "Comentarios privados" })
    expect(within(lista).getAllByText("Hola, maestro")).toHaveLength(1)
    expect(pedidasA("POST", RUTA_HILO)).toHaveLength(1)
  })

  it("«Ver más comentarios»: tres clics mientras se pide la página siguiente hacen un solo GET con cursor y no se repite ningún comentario", async () => {
    servidor.hilo = Array.from({ length: 25 }, (_, i) => comentarioDoble(i + 1))
    const respuesta = diferido()
    servidor.manejador = (l) =>
      l.metodo === "GET" && l.url.startsWith(`${RUTA_HILO}?`) && l.url.includes("cursor=")
        ? respuesta.promesa
        : undefined
    renderDetalle()
    const verMas = await screen.findByRole("button", { name: "Ver más comentarios" })
    fireEvent.click(verMas)
    fireEvent.click(verMas)
    fireEvent.click(verMas)
    await waitFor(() => expect(verMas).toHaveAttribute("aria-busy", "true"))
    expect(paginasDelHiloPedidas(true)).toHaveLength(1)
    const pedida = paginasDelHiloPedidas(true)[0]
    if (pedida === undefined) throw new Error("Precondición: se pidió la página siguiente")
    respuesta.resolver(respuestaJson(200, paginaDelHilo(pedida.url)))
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Ver más comentarios" })).toBeNull(),
    )
    const filas = within(screen.getByRole("list", { name: "Comentarios privados" })).getAllByRole(
      "listitem",
    )
    expect(filas).toHaveLength(25)
    expect(new Set(filas.map((f) => f.textContent)).size).toBe(25)
    expect(paginasDelHiloPedidas(true)).toHaveLength(1)
    focoFueraDeBody()
  })
})

describe("ataque ENTREGAS-01d r1: el foco en los estados vecinos (T-r1-1)", () => {
  it.each([
    {
      codigo: "ENTREGA_YA_REALIZADA",
      mensaje: "Ya entregaste esta tarea.",
      despues: () => entregaRealizada(),
      visible: /Entregaste el/,
    },
    {
      codigo: "ENTREGA_CALIFICADA",
      mensaje: "Tu entrega ya está calificada.",
      despues: () => entregaRealizada({ estado: "calificado", puedeAnular: false }),
      visible: /Tu entrega ya está calificada\./,
    },
    {
      codigo: "ENTREGA_CERRADA",
      mensaje: FRASE_CERRADA,
      despues: () => entregaAsignada({ puedeEntregar: false }),
      visible: FRASE_CERRADA,
    },
  ])(
    "409 $codigo al entregar con el foco en «Entregar tarea»: un aviso, un solo GET de la entrega, la vista cambia y el foco queda en «Tu trabajo», nunca en <body>",
    async ({ codigo, mensaje, despues, visible }) => {
      servidor.manejador = (l) => {
        if (l.metodo !== "POST" || l.url !== RUTA_ENTREGA) return undefined
        servidor.entrega = despues()
        return errorApi(409, codigo, mensaje)
      }
      renderDetalle()
      await screen.findByLabelText("Enlace")
      agregarEnlace("https://ejemplo.com/a")
      const boton = screen.getByRole("button", { name: "Entregar tarea" })
      boton.focus()
      const getsAntes = pedidasA("GET", RUTA_ENTREGA).length
      avanzarReloj()
      fireEvent.click(boton)
      await within(seccionTuTrabajo()).findByText(visible)
      await reposar()
      expect(screen.queryByRole("button", { name: "Entregar tarea" })).toBeNull()
      expect(aviso.error).toHaveBeenCalledTimes(1)
      expect(pedidasA("GET", RUTA_ENTREGA)).toHaveLength(getsAntes + 1)
      focoFueraDeBody()
      expect(seccionTuTrabajo().contains(document.activeElement)).toBe(true)
    },
  )

  it("409 ENTREGA_CALIFICADA al anular con el foco en «Sí, anular entrega»: la confirmación desaparece y el foco queda en «Tu trabajo»", async () => {
    servidor.entrega = entregaRealizada()
    servidor.manejador = (l) => {
      if (l.metodo !== "POST" || l.url !== `${RUTA_ENTREGA}/anular`) return undefined
      servidor.entrega = entregaRealizada({ estado: "calificado", puedeAnular: false })
      return errorApi(409, "ENTREGA_CALIFICADA", "Tu entrega ya está calificada.")
    }
    renderDetalle()
    fireEvent.click(await screen.findByRole("button", { name: "Anular entrega" }))
    const si = screen.getByRole("button", { name: "Sí, anular entrega" })
    si.focus()
    avanzarReloj()
    fireEvent.click(si)
    await within(seccionTuTrabajo()).findByText("Tu entrega ya está calificada.")
    await reposar()
    expect(screen.queryByRole("button", { name: "Sí, anular entrega" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Anular entrega" })).toBeNull()
    expect(aviso.error).toHaveBeenCalledTimes(1)
    focoFueraDeBody()
    expect(seccionTuTrabajo().contains(document.activeElement)).toBe(true)
  })

  it("una subida que falla con el foco en «Entregar tarea»: aviso con el nombre del archivo, ningún POST de la entrega, el archivo sigue elegido y el foco sigue en el botón", async () => {
    servidor.manejador = (l) =>
      l.url.startsWith(ORIGEN_ALMACEN) ? new Response(null, { status: 500 }) : undefined
    renderDetalle()
    await screen.findByLabelText("Enlace")
    elegirArchivos("capitulo-uno.pdf")
    const boton = screen.getByRole("button", { name: "Entregar tarea" })
    boton.focus()
    fireEvent.click(boton)
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(boton).not.toHaveAttribute("aria-busy", "true"))
    expect(String(aviso.error.mock.calls[0]?.[0])).toContain("capitulo-uno.pdf")
    expect(pedidasA("POST", RUTA_ENTREGA)).toEqual([])
    expect(
      within(screen.getByRole("list", { name: "Archivos elegidos" })).getByRole("button", {
        name: "Quitar capitulo-uno.pdf",
      }),
    ).toBeInTheDocument()
    expect(document.activeElement).toBe(boton)
  })

  it("quitar el último archivo elegido lleva el foco a «Adjuntar archivos»; con dos, quitar el segundo lo lleva al «Quitar» del primero", async () => {
    renderDetalle()
    await screen.findByLabelText("Enlace")
    elegirArchivos("uno.pdf", "dos.pdf")
    const quitarDos = screen.getByRole("button", { name: "Quitar dos.pdf" })
    quitarDos.focus()
    fireEvent.click(quitarDos)
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Quitar uno.pdf" })),
    )
    fireEvent.click(screen.getByRole("button", { name: "Quitar uno.pdf" }))
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Adjuntar archivos" }),
      ),
    )
    expect(screen.queryByRole("list", { name: "Archivos elegidos" })).toBeNull()
  })

  it("quitar el último enlace lleva el foco al campo «Enlace»", async () => {
    renderDetalle()
    await screen.findByLabelText("Enlace")
    agregarEnlace("https://ejemplo.com/a")
    const quitar = screen.getByRole("button", { name: "Quitar https://ejemplo.com/a" })
    quitar.focus()
    fireEvent.click(quitar)
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Enlace")))
  })

  it("una recarga que califica la entrega (otra pestaña) con el foco en «Anular entrega»: el botón desaparece y el foco va a «Tu trabajo»", async () => {
    servidor.entrega = entregaRealizada()
    const queryClient = renderDetalle()
    const anular = await screen.findByRole("button", { name: "Anular entrega" })
    anular.focus()
    servidor.entrega = entregaRealizada({ estado: "calificado", puedeAnular: false })
    avanzarReloj()
    await act(async () => {
      await queryClient.invalidateQueries()
    })
    await within(seccionTuTrabajo()).findByText("Tu entrega ya está calificada.")
    await reposar()
    expect(screen.queryByRole("button", { name: "Anular entrega" })).toBeNull()
    focoFueraDeBody()
    expect(seccionTuTrabajo().contains(document.activeElement)).toBe(true)
  })

  it("una recarga que trae una entrega hecha en otra pestaña con el foco en «Entregar tarea»: el formulario desaparece y el foco va a «Tu trabajo»", async () => {
    const queryClient = renderDetalle()
    const boton = await screen.findByRole("button", { name: "Entregar tarea" })
    boton.focus()
    servidor.entrega = entregaRealizada()
    avanzarReloj()
    await act(async () => {
      await queryClient.invalidateQueries()
    })
    await within(seccionTuTrabajo()).findByText(/Entregaste el/)
    await reposar()
    expect(screen.queryByRole("button", { name: "Entregar tarea" })).toBeNull()
    focoFueraDeBody()
    expect(seccionTuTrabajo().contains(document.activeElement)).toBe(true)
  })
})

describe("ataque ENTREGAS-01d r1: la vista tras un 409 dice una sola cosa (PR-1D07, §D-9.3)", () => {
  // El maestro cerró la tarea mientras el alumno la tenía abierta (fecha límite movida al pasado y
  // sin tardías). El 409 vuelve a pedir la entrega, que ya dice "cerrada", pero la tarea en caché es
  // la vieja (refetchOnWindowFocus está apagado en providers.tsx): «Tu trabajo» no puede decir a la
  // vez "Asignado" en su insignia y "La fecha límite ya pasó…" en su texto.
  it("409 ENTREGA_CERRADA porque el maestro cerró la tarea: la tarea se vuelve a pedir y la insignia deja de decir «Asignado»", async () => {
    servidor.manejador = (l) => {
      if (l.metodo !== "POST" || l.url !== RUTA_ENTREGA) return undefined
      servidor.tarea = tareaDoble({ fechaLimite: PASADA, aceptaTardias: false, version: 1 })
      servidor.entrega = entregaAsignada({ puedeEntregar: false })
      return errorApi(409, "ENTREGA_CERRADA", FRASE_CERRADA)
    }
    renderDetalle()
    await screen.findByLabelText("Enlace")
    agregarEnlace("https://ejemplo.com/a")
    const getsDeLaTarea = pedidasA("GET", RUTA_TAREA).length
    avanzarReloj()
    fireEvent.click(screen.getByRole("button", { name: "Entregar tarea" }))
    await within(seccionTuTrabajo()).findByText(FRASE_CERRADA)
    await reposar()
    expect(within(seccionTuTrabajo()).queryByText("Asignado")).toBeNull()
    expect(pedidasA("GET", RUTA_TAREA).length).toBeGreaterThan(getsDeLaTarea)
  })
})

describe("ataque ENTREGAS-01d r1: errores del servidor al entregar (T-r1-4)", () => {
  it("400 ENTREGA_VACIA (la tarea pasó a requerir adjuntos): un solo aviso en la vista (el del grupo), ningún toast, un POST y ningún GET de la entrega después del error", async () => {
    servidor.tarea = tareaDoble({ requiereAdjuntos: false })
    servidor.manejador = (l) =>
      l.metodo === "POST" && l.url === RUTA_ENTREGA
        ? errorApi(400, "ENTREGA_VACIA", VACIA)
        : undefined
    renderDetalle()
    const boton = await screen.findByRole("button", { name: "Marcar como completada" })
    const getsAntes = pedidasA("GET", RUTA_ENTREGA).length
    fireEvent.click(boton)
    await screen.findByText(VACIA)
    await reposar()
    expect(screen.getAllByText(VACIA)).toHaveLength(1)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(aviso.success).not.toHaveBeenCalled()
    expect(pedidasA("POST", RUTA_ENTREGA)).toHaveLength(1)
    expect(pedidasA("GET", RUTA_ENTREGA)).toHaveLength(getsAntes)
    expect(boton).not.toHaveAttribute("aria-busy", "true")
  })

  it("400 VALIDACION de enlaces.0 con un archivo y un enlace: el mensaje sin prefijo una sola vez bajo los enlaces, ningún toast, una sola subida, un POST y ningún GET de la entrega después del error", async () => {
    const mensaje = "El enlace debe empezar con https:// o http://."
    servidor.manejador = (l) =>
      l.metodo === "POST" && l.url === RUTA_ENTREGA
        ? errorApi(400, "VALIDACION", `enlaces.0: ${mensaje}`)
        : undefined
    renderDetalle()
    await screen.findByLabelText("Enlace")
    elegirArchivos("uno.pdf")
    agregarEnlace("https://ejemplo.com/a")
    const getsAntes = pedidasA("GET", RUTA_ENTREGA).length
    fireEvent.click(screen.getByRole("button", { name: "Entregar tarea" }))
    await screen.findByText(mensaje)
    await reposar()
    expect(screen.getAllByText(mensaje)).toHaveLength(1)
    expect(screen.queryByText(/enlaces\.0/)).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
    expect(pedidasA("POST", `${RUTA_ENTREGA}/archivos`)).toHaveLength(1)
    expect(alAlmacen()).toHaveLength(1)
    expect(pedidasA("POST", RUTA_ENTREGA)).toHaveLength(1)
    expect(pedidasA("GET", RUTA_ENTREGA)).toHaveLength(getsAntes)
  })
})

describe("ataque ENTREGAS-01d r1: un enlace peligroso en una respuesta mal formada", () => {
  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    " javascript:alert(1)",
    "data:text/html,hola",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "//ejemplo.com/sin-protocolo",
  ])("el esquema de la respuesta rechaza %j", (enlace) => {
    const respuesta = { entrega: entregaRealizada({ enlaces: [enlace] }) }
    expect(miEntregaRespuestaSchema.safeParse(respuesta).success).toBe(false)
  })

  it("una respuesta con un enlace bueno y un javascript: no pinta ninguno: la vista muestra el error y no hay ningún href peligroso", async () => {
    servidor.entrega = entregaRealizada({
      enlaces: ["https://ejemplo.com/bueno", "JavaScript:alert(document.cookie)"],
    })
    renderDetalle()
    await within(await waitFor(seccionTuTrabajo)).findByText("Algo salió mal. Inténtalo de nuevo.")
    expect(screen.queryByRole("list", { name: "Enlaces de la entrega" })).toBeNull()
    const peligrosos = Array.from(document.querySelectorAll("a[href]")).filter((a) =>
      /^\s*(javascript|data|vbscript):/i.test(a.getAttribute("href") ?? ""),
    )
    expect(peligrosos).toEqual([])
    expect(screen.queryByRole("button", { name: "Anular entrega" })).toBeNull()
  })
})

describe("ataque ENTREGAS-01d r1: enlaces de 2048 caracteres (T-r1-2)", () => {
  const LARGO = `https://ejemplo.com/${"a".repeat(2048 - 20)}`

  it("en la entrega hecha: el enlace conserva su href completo, parte con wrap-anywhere en el propio <a> y el texto «(se abre en otra pestaña)» vive dentro del enlace", async () => {
    expect(LARGO).toHaveLength(2048)
    servidor.entrega = entregaRealizada({ enlaces: [LARGO] })
    renderDetalle()
    const lista = await screen.findByRole("list", { name: "Enlaces de la entrega" })
    const enlace = within(lista).getByRole("link", { name: `${LARGO} (se abre en otra pestaña)` })
    expect(enlace).toHaveAttribute("href", LARGO)
    expect(enlace).toHaveAttribute("target", "_blank")
    expect(enlace).toHaveAttribute("rel", "noopener noreferrer")
    expect(enlace.classList.contains("wrap-anywhere")).toBe(true)
    expect(within(enlace).getByText("(se abre en otra pestaña)")).toBeInTheDocument()
  })

  it("en el campo: 2048 se agrega y su ficha parte con wrap-anywhere y min-w-0; 2049 no se agrega y el campo queda inválido", async () => {
    renderDetalle()
    await screen.findByLabelText("Enlace")
    agregarEnlace(`${LARGO}b`)
    expect(screen.queryByRole("list", { name: "Enlaces agregados" })).toBeNull()
    expect(screen.getByLabelText("Enlace")).toHaveAttribute("aria-invalid", "true")
    agregarEnlace(LARGO)
    const lista = await screen.findByRole("list", { name: "Enlaces agregados" })
    const ficha = within(lista)
      .getAllByText(LARGO)
      .find((elemento) => elemento.closest("button") === null)
    if (ficha === undefined) throw new Error("Precondición: la ficha del enlace muestra su texto")
    expect(ficha.classList.contains("wrap-anywhere")).toBe(true)
    expect(ficha.classList.contains("min-w-0")).toBe(true)
    expect(within(lista).getByRole("button", { name: `Quitar ${LARGO}` })).toBeInTheDocument()
  })
})

describe("ataque ENTREGAS-01d r1: el hilo (T-r1-5)", () => {
  it("el texto de privacidad está mientras carga, tras un error de carga y con el hilo vacío", async () => {
    const primera = diferido()
    let pedidas = 0
    servidor.manejador = (l) => {
      if (l.metodo !== "GET" || !l.url.startsWith(`${RUTA_HILO}?`)) return undefined
      pedidas += 1
      if (pedidas === 1) return primera.promesa
      return undefined
    }
    const queryClient = renderDetalle()
    await screen.findByText("Cargando los comentarios privados…")
    expect(screen.getByText(PRIVACIDAD)).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Comentarios privados" })).toBeInTheDocument()

    primera.resolver(errorApi(500, "ERROR_INTERNO", "Algo falló."))
    await waitFor(() => expect(screen.queryByText("Cargando los comentarios privados…")).toBeNull())
    expect(screen.queryByRole("list", { name: "Comentarios privados" })).toBeNull()
    expect(screen.getByText(PRIVACIDAD)).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Comentarios privados" })).toBeInTheDocument()

    avanzarReloj()
    await act(async () => {
      await queryClient.invalidateQueries()
    })
    await screen.findByText("Aún no hay comentarios privados.")
    expect(screen.getByText(PRIVACIDAD)).toBeInTheDocument()
  })

  it("un comentario enviado mientras el hilo se recarga aparece una sola vez, también cuando la recarga vieja termina después", async () => {
    servidor.hilo = [comentarioDoble(1), comentarioDoble(2), comentarioDoble(3)]
    const vieja = diferido()
    let pedidas = 0
    servidor.manejador = (l) => {
      if (l.metodo !== "GET" || !l.url.startsWith(`${RUTA_HILO}?`)) return undefined
      pedidas += 1
      if (pedidas === 2) return vieja.promesa
      return undefined
    }
    const queryClient = renderDetalle()
    await screen.findByText("Comentario 3")
    const pagina = paginaDelHilo(`${RUTA_HILO}?limite=20`)
    avanzarReloj()
    act(() => {
      void queryClient.invalidateQueries()
    })
    await waitFor(() => expect(pedidas).toBe(2))
    fireEvent.change(screen.getByLabelText("Comentario privado"), {
      target: { value: "Llegó a la mitad" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Enviar comentario" }))
    await screen.findByText("Llegó a la mitad")
    vieja.resolver(respuestaJson(200, pagina))
    await reposar()
    const lista = screen.getByRole("list", { name: "Comentarios privados" })
    expect(within(lista).getAllByText("Llegó a la mitad")).toHaveLength(1)
    const filas = within(lista).getAllByRole("listitem")
    expect(filas).toHaveLength(4)
    expect(new Set(filas.map((f) => f.textContent)).size).toBe(4)
  })

  it("«Ver más comentarios» durante la recarga que sigue a un envío propio no pide la página siguiente; después, las páginas no se duplican", async () => {
    servidor.hilo = Array.from({ length: 25 }, (_, i) => comentarioDoble(i + 1))
    const recarga = diferido()
    let enviado = false
    let recargaPedida = false
    servidor.manejador = (l) => {
      if (l.metodo === "POST" && l.url === RUTA_HILO) enviado = true
      const primeraPagina =
        l.metodo === "GET" && l.url.startsWith(`${RUTA_HILO}?`) && !l.url.includes("cursor=")
      if (enviado && primeraPagina && !recargaPedida) {
        recargaPedida = true
        return recarga.promesa
      }
      return undefined
    }
    renderDetalle()
    const verMas = await screen.findByRole("button", { name: "Ver más comentarios" })
    fireEvent.change(screen.getByLabelText("Comentario privado"), {
      target: { value: "Mi duda nueva" },
    })
    avanzarReloj()
    fireEvent.click(screen.getByRole("button", { name: "Enviar comentario" }))
    await waitFor(() => expect(recargaPedida).toBe(true))
    fireEvent.click(verMas)
    fireEvent.click(verMas)
    expect(paginasDelHiloPedidas(true)).toEqual([])
    recarga.resolver(respuestaJson(200, paginaDelHilo(`${RUTA_HILO}?limite=20`)))
    await waitFor(() => expect(verMas).not.toHaveAttribute("aria-busy", "true"))
    fireEvent.click(screen.getByRole("button", { name: "Ver más comentarios" }))
    await screen.findByText("Mi duda nueva")
    await reposar()
    expect(paginasDelHiloPedidas(true)).toHaveLength(1)
    const filas = within(screen.getByRole("list", { name: "Comentarios privados" })).getAllByRole(
      "listitem",
    )
    expect(filas).toHaveLength(26)
    expect(new Set(filas.map((f) => f.textContent)).size).toBe(26)
    expect(screen.getAllByText("Mi duda nueva")).toHaveLength(1)
  })
})

// Revisión estática de lo nuevo de 01d (sin hallazgo esperado).
const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})
const RUTAS_01D = [
  "/src/features/tareas/components/tu-trabajo.tsx",
  "/src/features/tareas/components/formulario-de-entrega.tsx",
  "/src/features/tareas/components/entrega-realizada.tsx",
  "/src/features/tareas/components/hilo-privado.tsx",
  "/src/features/tareas/components/campo-de-enlaces.tsx",
  "/src/features/tareas/components/lista-de-enlaces.tsx",
  "/src/features/tareas/detalle-tarea-view.tsx",
  "/src/features/tareas/hooks.ts",
  "/src/features/tareas/lib.ts",
  "/src/features/tareas/data.ts",
  "/src/features/tareas/types.ts",
  "/src/features/clases/components/fila-de-entrega.tsx",
  "/src/features/clases/components/seccion-de-tema.tsx",
  "/src/features/clases/lib.ts",
  "/src/features/clases/data.ts",
  "/src/features/clases/types.ts",
  "/src/components/estado-entrega-badge.tsx",
  "/src/components/adjuntos/adjuntos-de-publicacion.tsx",
  "/src/components/adjuntos/hooks.ts",
  "/src/components/adjuntos/lib.ts",
  "/src/lib/estado-de-entrega.ts",
]
const fuente = (ruta: string): string => {
  const texto = fuentes[ruta]
  if (texto === undefined) throw new Error(`Precondición: existe ${ruta}`)
  return texto
}

describe("ataque ENTREGAS-01d r1: revisión estática de lo nuevo", () => {
  it("sin ?? [], sin disabled en JSX, sin valores por defecto en estadoPago, rol, accesoRestringido ni calificacion, sin almacenamiento del navegador ni console.", () => {
    const prohibidos: [string, RegExp][] = [
      ["?? []", /\?\?\s*\[\s*\]/],
      ["disabled", /\sdisabled(=|\s|>|\})/],
      ["defecto", /\b(estadoPago|accesoRestringido|rol|calificacion)\s*(\?\?|\|\|)/],
      ["almacenamiento", /localStorage|sessionStorage/],
      ["console", /console\./],
    ]
    const hallados = RUTAS_01D.flatMap((ruta) =>
      prohibidos.filter(([, patron]) => patron.test(fuente(ruta))).map(([n]) => `${ruta}: ${n}`),
    )
    expect(hallados).toEqual([])
  })

  it("fetch( solo en services/apiClient.ts y services/almacenService.ts; target=_blank solo en lista-de-enlaces.tsx, en todo src/", () => {
    const deProduccion = Object.entries(fuentes).filter(([ruta]) => !/\.test\.tsx?$/.test(ruta))
    expect(deProduccion.length).toBeGreaterThan(100)
    expect(
      deProduccion
        .filter(([, texto]) => /\bfetch\(/.test(texto))
        .map(([ruta]) => ruta)
        .sort(),
    ).toEqual(["/src/services/almacenService.ts", "/src/services/apiClient.ts"])
    expect(deProduccion.filter(([, texto]) => /_blank/.test(texto)).map(([ruta]) => ruta)).toEqual([
      "/src/features/tareas/components/lista-de-enlaces.tsx",
    ])
  })

  it("features/tareas no importa de features/clases y viceversa; los componentes nuevos solo declaran interfaces de Props", () => {
    const cruzadas = RUTAS_01D.filter((ruta) => {
      const texto = fuente(ruta)
      if (ruta.startsWith("/src/features/tareas/"))
        return /from\s+["'](@\/features\/clases|\.\.\/\.\.\/clases)/.test(texto)
      if (ruta.startsWith("/src/features/clases/"))
        return /from\s+["'](@\/features\/tareas|\.\.\/\.\.\/tareas)/.test(texto)
      return /from\s+["']@\/features\//.test(texto)
    })
    expect(cruzadas).toEqual([])
    const tiposFuera = RUTAS_01D.filter((ruta) => ruta.endsWith(".tsx")).flatMap((ruta) =>
      [...fuente(ruta).matchAll(/^\s*(?:export\s+)?(?:type|interface)\s+(\w+)/gm)]
        .map((m) => m[1] ?? "")
        .filter((nombre) => !nombre.endsWith("Props"))
        .map((nombre) => `${ruta}: ${nombre}`),
    )
    expect(tiposFuera).toEqual([])
  })
})

describe("ataque ENTREGAS-01d r1: «Trabajo de clase» tras un 409 de la entrega (hermano de T-01)", () => {
  // Un 409 dice que la entrega cambió en otra pestaña (o la calificó el maestro). La fila del alumno en
  // «Trabajo de clase» dice el estado de su entrega (§D-9.8): si la caché del trabajo no se marca vieja,
  // al volver dentro de los 30 s de staleTime la fila sigue diciendo el estado de antes.
  it.each([
    { codigo: "ENTREGA_YA_REALIZADA", despues: () => entregaRealizada() },
    {
      codigo: "ENTREGA_CALIFICADA",
      despues: () => entregaRealizada({ estado: "calificado", puedeAnular: false }),
    },
  ])("409 $codigo al entregar marca viejo «Trabajo de clase»", async ({ codigo, despues }) => {
    servidor.manejador = (l) => {
      if (l.metodo !== "POST" || l.url !== RUTA_ENTREGA) return undefined
      servidor.entrega = despues()
      return errorApi(409, codigo, "La entrega cambió.")
    }
    const queryClient = renderDetalle()
    const claveDelTrabajo = [...clavePrefijoDelTrabajo(CLASE_ID), "sin-tema"]
    queryClient.setQueryData(claveDelTrabajo, { pages: [] })
    await screen.findByLabelText("Enlace")
    agregarEnlace("https://ejemplo.com/a")
    avanzarReloj()
    fireEvent.click(screen.getByRole("button", { name: "Entregar tarea" }))
    await waitFor(() => expect(screen.queryByRole("button", { name: "Entregar tarea" })).toBeNull())
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryState(claveDelTrabajo)?.isInvalidated).toBe(true)
  })
})

describe("ataque ENTREGAS-01d r1: el error del servidor se asocia a un control (hermano de ENTREGA_VACIA)", () => {
  // ENTREGA_VACIA queda en aria-describedby de «Entregar tarea» (el foco sigue ahí y no hay aviso). El
  // error de enlaces del servidor, su hermano en §7.24 ("se marcan bajo su grupo, sin aviso"), no se
  // asocia a ningún control: quien usa lector de pantalla no recibe nada tras pulsar el botón.
  const descripcionDe = (elemento: HTMLElement) =>
    (elemento.getAttribute("aria-describedby") ?? "")
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ")

  it("ENTREGA_VACIA del servidor describe «Entregar tarea» (control positivo)", async () => {
    servidor.tarea = tareaDoble({ requiereAdjuntos: false })
    servidor.manejador = (l) =>
      l.metodo === "POST" && l.url === RUTA_ENTREGA
        ? errorApi(400, "ENTREGA_VACIA", VACIA)
        : undefined
    renderDetalle()
    fireEvent.click(await screen.findByRole("button", { name: "Marcar como completada" }))
    await screen.findByText(VACIA)
    expect(descripcionDe(screen.getByRole("button", { name: "Marcar como completada" }))).toContain(
      VACIA,
    )
  })

  it("VALIDACION de enlaces.0 del servidor describe «Entregar tarea» o el campo «Enlace»", async () => {
    const mensaje = "El enlace debe empezar con https:// o http://."
    servidor.manejador = (l) =>
      l.metodo === "POST" && l.url === RUTA_ENTREGA
        ? errorApi(400, "VALIDACION", `enlaces.0: ${mensaje}`)
        : undefined
    renderDetalle()
    await screen.findByLabelText("Enlace")
    agregarEnlace("https://ejemplo.com/a")
    fireEvent.click(screen.getByRole("button", { name: "Entregar tarea" }))
    await screen.findByText(mensaje)
    const descripciones = [
      descripcionDe(screen.getByRole("button", { name: "Entregar tarea" })),
      descripcionDe(screen.getByLabelText("Enlace")),
    ]
    expect(descripciones.some((d) => d.includes(mensaje))).toBe(true)
  })
})
