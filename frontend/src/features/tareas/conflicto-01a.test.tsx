import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import { claveTarea } from "@/services/trabajoService"

import { EditarTareaView } from "./editar-tarea-view"

// ENTREGAS-01a (P-05 a′, §D-8.2 y §D-8.3; PR-1A12 a PR-1A14): la versión con que se abre el
// formulario de edición y lo que pasa ante 409 TAREA_MODIFICADA (avisar, descartar y recargar, como el
// editor de categorías). Reloj fijo en todas.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const AHORA = new Date("2026-10-11T12:00:00.000Z")
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const CATEGORIA_ID = "4a4b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d41"
const TEMA_ID = "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d51"
const ADJUNTO_V = "6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d61"
const ADJUNTO_OTRO = "6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d62"
const ARCHIVO_SUBIDO = "9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11"
const ORIGEN_ALMACEN = "http://almacen.local"
const URL_TAREA = `/api/clases/${CLASE_ID}/tareas/${TAREA_ID}`
const V = 3
const MENSAJE_409 =
  "Otra persona guardó cambios en esta tarea mientras la editabas. Tus cambios no se guardaron: vuelve a hacerlos sobre la versión actual."
const AVISO_RECARGA_FALLIDA =
  "No pudimos actualizar la tarea. Puedes seguir editando; revisa tu conexión."

const categoria = { id: CATEGORIA_ID, nombre: "Examen", peso: 40, tareas: 1 }
const tema = { id: TEMA_ID, nombre: "Unidad 1", orden: 0, elementos: 2 }

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorDeApi = (estado: number, codigo: string, mensaje = "x") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const conflicto = () => errorDeApi(409, "TAREA_MODIFICADA", MENSAJE_409)

// La tarea en la versión `version`: la de apertura (V) o la que guardó otra persona (V + n), con otro
// título, otras instrucciones, otra rúbrica y otro adjunto publicado.
const tareaEn = (version: number, extra: Record<string, unknown> = {}) => {
  const esLaDeApertura = version === V
  return {
    tarea: {
      id: TAREA_ID,
      titulo: esLaDeApertura ? "Ensayo final" : `Versión ${String(version)} de otra persona`,
      instrucciones: esLaDeApertura ? "Dos páginas" : `Instrucciones ${String(version)}`,
      fechaLimite: "2030-01-15T16:00:00.000Z",
      puntos: 80,
      aceptaTardias: false,
      requiereAdjuntos: true,
      version,
      categoria: { id: CATEGORIA_ID, nombre: "Examen", peso: 40 },
      tema: { id: TEMA_ID, nombre: "Unidad 1" },
      rubrica: [
        {
          id: "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d81",
          criterio: esLaDeApertura ? "Claridad" : `Criterio ${String(version)}`,
          puntosMax: 10,
        },
      ],
      adjuntos: [
        {
          id: esLaDeApertura ? ADJUNTO_V : ADJUNTO_OTRO,
          nombre: esLaDeApertura ? "guia.pdf" : "otro.pdf",
          tipo: "application/pdf",
          tamano: 2048,
          vistaPrevia: null,
        },
      ],
      autor: {
        id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
        nombre: "Luis Pérez",
        administracion: false,
      },
      creadoEn: "2026-10-06T15:30:00.000Z",
      actualizadoEn: "2026-10-06T15:30:00.000Z",
      puedeEditar: true,
      puedeBorrar: true,
      ...extra,
    },
  }
}

interface Llamada {
  metodo: string
  url: string
  cuerpo: unknown
}

// `lecturas[n]` responde la n-ésima lectura de la tarea y `guardados[n]` el n-ésimo PUT; la última se
// repite si hay más peticiones que respuestas.
const stubApi = ({
  lecturas,
  guardados,
}: {
  lecturas: (() => Response | Promise<Response>)[]
  guardados: (() => Response | Promise<Response>)[]
}) => {
  const llamadas: Llamada[] = []
  let leidas = 0
  let guardadas = 0
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = String(entrada)
      const metodo = init?.method ?? "GET"
      const cuerpo =
        typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : init?.body
      llamadas.push({ metodo, url, cuerpo })
      if (url.startsWith(ORIGEN_ALMACEN))
        return Promise.resolve(new Response(null, { status: 200 }))
      if (url.endsWith("/categorias"))
        return Promise.resolve(respuestaJson(200, { categorias: [categoria] }))
      if (url.endsWith("/temas"))
        return Promise.resolve(respuestaJson(200, { temas: [tema], sinTema: 0 }))
      if (url.endsWith("/archivos")) {
        const { nombre, tipo, tamano } = cuerpo as { nombre: string; tipo: string; tamano: number }
        return Promise.resolve(
          respuestaJson(201, {
            archivo: { id: ARCHIVO_SUBIDO, nombre, tipo, tamano },
            subida: {
              url: `${ORIGEN_ALMACEN}/subida`,
              metodo: "PUT",
              cabeceras: { "Content-Type": tipo },
              expiraEn: "2026-10-11T12:05:00.000Z",
            },
          }),
        )
      }
      if (metodo === "PUT") {
        const responder = guardados[Math.min(guardadas, guardados.length - 1)]
        guardadas += 1
        if (!responder) throw new Error("Precondición: el doble no tiene respuesta para el PUT")
        return Promise.resolve(responder())
      }
      const responder = lecturas[Math.min(leidas, lecturas.length - 1)]
      leidas += 1
      if (!responder) throw new Error("Precondición: el doble no tiene respuesta para la lectura")
      return Promise.resolve(responder())
    }),
  )
  return { llamadas }
}

const guardadosDe = (llamadas: Llamada[]) =>
  llamadas.filter(({ metodo, url }) => metodo === "PUT" && url === URL_TAREA)
const lecturasDe = (llamadas: Llamada[]) =>
  llamadas.filter(({ metodo, url }) => metodo === "GET" && url === URL_TAREA)
const solicitudesDeSubida = (llamadas: Llamada[]) =>
  llamadas.filter(({ metodo, url }) => metodo === "POST" && url.endsWith("/archivos"))
const subidasAlAlmacen = (llamadas: Llamada[]) =>
  llamadas.filter(({ url }) => url.startsWith(ORIGEN_ALMACEN))
const versionDe = (llamada: Llamada | undefined) =>
  (llamada?.cuerpo as { version?: unknown } | undefined)?.version

// Una promesa que la prueba resuelve cuando quiere: la lectura queda en vuelo mientras tanto.
const diferida = () => {
  let resolver: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver: (respuesta: Response) => resolver(respuesta) }
}

const renderEditar = () => {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[`/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}/editar`]}>
        <Routes>
          <Route
            path="/maestro/clases/:claseId/tareas/:tareaId/editar"
            element={<EditarTareaView />}
          />
          <Route
            path="/maestro/clases/:claseId/tareas/:tareaId"
            element={<p>Pantalla del detalle</p>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return cliente
}

const botonGuardar = () => screen.getByRole("button", { name: "Guardar cambios" })

// Como una persona: pasan unos segundos desde la última lectura (con el reloj fijo, una recarga en el
// mismo milisegundo no cambiaría dataUpdatedAt, que la clave de foco de la vista usa para saber que la
// tarea cambió), el botón recibe el foco y después el clic (fireEvent.click no mueve el foco).
const guardar = () => {
  vi.setSystemTime(new Date(Date.now() + 5_000))
  const boton = botonGuardar()
  boton.focus()
  fireEvent.click(boton)
}

const escribirTitulo = (valor: string) =>
  fireEvent.change(screen.getByLabelText("Título"), { target: { value: valor } })

const elegirArchivo = (nombre: string) =>
  fireEvent.change(screen.getByLabelText("Adjuntar archivos"), {
    target: { files: [new File(["x"], nombre, { type: "application/pdf" })] },
  })

const enfocadoFueraDeBody = (): HTMLElement => {
  const activo = document.activeElement
  if (!(activo instanceof HTMLElement) || activo === document.body) {
    throw new Error("El foco quedó en <body>")
  }
  return activo
}

const sinPeticionesEnVuelo = async (cliente: QueryClient) => {
  await waitFor(() => expect(cliente.isFetching()).toBe(0))
  await act(() => new Promise((r) => setTimeout(r, 0)))
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("versión de apertura (PR-1A12)", () => {
  it("PR-1A12: editar envía la version con que se abrió el formulario aunque una recarga posterior traiga otra", async () => {
    const { llamadas } = stubApi({
      lecturas: [() => respuestaJson(200, tareaEn(V)), () => respuestaJson(200, tareaEn(V + 1))],
      guardados: [() => respuestaJson(200, tareaEn(V + 2))],
    })
    const cliente = renderEditar()
    await screen.findByLabelText("Título")

    await act(() => cliente.invalidateQueries())
    await sinPeticionesEnVuelo(cliente)
    expect(lecturasDe(llamadas), "Precondición: la recarga de fondo llegó").toHaveLength(2)
    guardar()

    await waitFor(() => expect(guardadosDe(llamadas)).toHaveLength(1))
    expect(versionDe(guardadosDe(llamadas)[0])).toBe(V)
  })
})

describe("conflicto al guardar (PR-1A13)", () => {
  it("PR-1A13: ante 409 TAREA_MODIFICADA un solo aviso con el mensaje del servidor, un solo GET, «Guardar cambios» en espera sin disabled durante la recarga, reinicio con la versión nueva, foco en «Título» y el guardado siguiente con version + 1", async () => {
    const enVuelo = diferida()
    const { llamadas } = stubApi({
      lecturas: [() => respuestaJson(200, tareaEn(V)), () => enVuelo.promesa],
      guardados: [conflicto, () => respuestaJson(200, tareaEn(V + 2))],
    })
    const cliente = renderEditar()
    await screen.findByLabelText("Título")
    escribirTitulo("Lo que escribí")
    fireEvent.change(screen.getByLabelText("Instrucciones (opcional)"), {
      target: { value: "Mis instrucciones" },
    })
    elegirArchivo("mio.pdf")

    guardar()

    await waitFor(() => expect(lecturasDe(llamadas)).toHaveLength(2))
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(aviso.error).toHaveBeenCalledWith(MENSAJE_409)
    expect(aviso.success).not.toHaveBeenCalled()
    // Mientras la recarga está en vuelo: en espera, sin disabled, y ni un clic ni un Enter envían.
    expect(botonGuardar()).toHaveAttribute("aria-busy", "true")
    expect(botonGuardar()).not.toHaveAttribute("disabled")
    fireEvent.click(botonGuardar())
    const formulario = screen.getByLabelText("Título").closest("form")
    if (formulario === null) throw new Error("Precondición: el título vive en un formulario")
    fireEvent.submit(formulario)
    expect(guardadosDe(llamadas)).toHaveLength(1)

    enVuelo.resolver(respuestaJson(200, tareaEn(V + 1)))

    expect(await screen.findByDisplayValue(`Versión ${String(V + 1)} de otra persona`)).toBe(
      screen.getByLabelText("Título"),
    )
    expect(screen.getByLabelText("Instrucciones (opcional)")).toHaveValue(
      `Instrucciones ${String(V + 1)}`,
    )
    expect(screen.getByLabelText("Criterio 1")).toHaveValue(`Criterio ${String(V + 1)}`)
    expect(screen.getByRole("list", { name: "Archivos adjuntos" })).toHaveTextContent("otro.pdf")
    expect(screen.queryByText("guia.pdf")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Quitar mio.pdf" })).not.toBeInTheDocument()
    expect(screen.getByLabelText("Título")).toHaveFocus()
    await sinPeticionesEnVuelo(cliente)
    expect(lecturasDe(llamadas)).toHaveLength(2)
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("button", { name: "Cargar la versión actual" })).toBeNull()
    expect(
      screen
        .queryAllByRole("alert")
        .filter((alerta) => alerta.textContent?.includes("Otra persona")),
    ).toEqual([])

    guardar()

    await waitFor(() => expect(guardadosDe(llamadas)).toHaveLength(2))
    expect(versionDe(guardadosDe(llamadas)[1])).toBe(V + 1)
    expect(await screen.findByText("Pantalla del detalle")).toBeInTheDocument()
  })
})

describe("estados vecinos del conflicto (PR-1A14)", () => {
  it("PR-1A14 (a): un segundo 409 seguido vuelve a avisar, recarga una vez más, reinicia con v + 2, lleva el foco a «Título» y el guardado siguiente envía v + 2", async () => {
    const { llamadas } = stubApi({
      lecturas: [
        () => respuestaJson(200, tareaEn(V)),
        () => respuestaJson(200, tareaEn(V + 1)),
        () => respuestaJson(200, tareaEn(V + 2)),
      ],
      guardados: [conflicto, conflicto, () => respuestaJson(200, tareaEn(V + 3))],
    })
    const cliente = renderEditar()
    await screen.findByLabelText("Título")
    guardar()
    await screen.findByDisplayValue(`Versión ${String(V + 1)} de otra persona`)
    await sinPeticionesEnVuelo(cliente)
    escribirTitulo("Otra vez lo mío")

    guardar()

    expect(
      await screen.findByDisplayValue(`Versión ${String(V + 2)} de otra persona`),
    ).toHaveFocus()
    await sinPeticionesEnVuelo(cliente)
    expect(aviso.error).toHaveBeenCalledTimes(2)
    expect(lecturasDe(llamadas)).toHaveLength(3)
    expect(guardadosDe(llamadas).map(versionDe)).toEqual([V, V + 1])

    guardar()

    await waitFor(() => expect(guardadosDe(llamadas)).toHaveLength(3))
    expect(versionDe(guardadosDe(llamadas)[2])).toBe(V + 2)
  })

  it("PR-1A14 (b): una recarga de fondo con éxito y la versión de otra persona no reinicia, conserva lo escrito, no avisa y el guardado envía la de apertura", async () => {
    const { llamadas } = stubApi({
      lecturas: [() => respuestaJson(200, tareaEn(V)), () => respuestaJson(200, tareaEn(V + 1))],
      guardados: [() => respuestaJson(200, tareaEn(V + 2))],
    })
    const cliente = renderEditar()
    await screen.findByLabelText("Título")
    escribirTitulo("Lo que escribí")

    await act(() => cliente.invalidateQueries({ queryKey: claveTarea(CLASE_ID, TAREA_ID) }))
    await sinPeticionesEnVuelo(cliente)

    expect(lecturasDe(llamadas), "Precondición: la recarga de fondo llegó").toHaveLength(2)
    expect(screen.getByLabelText("Título")).toHaveValue("Lo que escribí")
    expect(screen.getByLabelText("Criterio 1")).toHaveValue("Claridad")
    expect(aviso.error).not.toHaveBeenCalled()
    expect(aviso.success).not.toHaveBeenCalled()
    guardar()
    await waitFor(() => expect(guardadosDe(llamadas)).toHaveLength(1))
    expect(versionDe(guardadosDe(llamadas)[0])).toBe(V)
  })

  it("PR-1A14 (c): si la recarga tras el 409 falla con 500, dos avisos en total, lo escrito y los elegidos siguen, «Guardar cambios» deja la espera, el foco no cae en <body> y un guardado nuevo envía otra vez v", async () => {
    const { llamadas } = stubApi({
      lecturas: [() => respuestaJson(200, tareaEn(V)), () => errorDeApi(500, "ERROR_INTERNO")],
      guardados: [conflicto, () => respuestaJson(200, tareaEn(V + 1))],
    })
    const cliente = renderEditar()
    await screen.findByLabelText("Título")
    escribirTitulo("Lo que escribí")
    elegirArchivo("mio.pdf")

    guardar()

    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2))
    await sinPeticionesEnVuelo(cliente)
    expect(aviso.error).toHaveBeenNthCalledWith(1, MENSAJE_409)
    expect(aviso.error).toHaveBeenNthCalledWith(2, AVISO_RECARGA_FALLIDA)
    expect(aviso.error).toHaveBeenCalledTimes(2)
    expect(screen.getByLabelText("Título")).toHaveValue("Lo que escribí")
    expect(screen.getByRole("button", { name: "Quitar mio.pdf" })).toBeInTheDocument()
    await waitFor(() => expect(botonGuardar()).not.toHaveAttribute("aria-busy", "true"))
    expect(enfocadoFueraDeBody()).toBe(botonGuardar())

    guardar()

    await waitFor(() => expect(guardadosDe(llamadas)).toHaveLength(2))
    expect(versionDe(guardadosDe(llamadas)[1])).toBe(V)
    expect(solicitudesDeSubida(llamadas)).toHaveLength(2)
  })

  it.each([
    {
      nombre: "404 TAREA_NO_ENCONTRADA",
      respuesta: () => errorDeApi(404, "TAREA_NO_ENCONTRADA"),
      texto: "Esa tarea ya no existe.",
    },
    {
      nombre: "403 SIN_ACCESO_A_LA_CLASE",
      respuesta: () => errorDeApi(403, "SIN_ACCESO_A_LA_CLASE"),
      texto: "No tienes acceso a esta clase.",
    },
  ])(
    "PR-1A14 (d): con $nombre en la recarga tras el 409, el mensaje reemplaza el formulario, el foco va a la raíz y no hay aviso de recarga fallida",
    async ({ respuesta, texto }) => {
      stubApi({
        lecturas: [() => respuestaJson(200, tareaEn(V)), respuesta],
        guardados: [conflicto],
      })
      const cliente = renderEditar()
      await screen.findByLabelText("Título")

      guardar()

      expect(await screen.findByText(texto)).toBeInTheDocument()
      await sinPeticionesEnVuelo(cliente)
      expect(screen.queryByLabelText("Título")).not.toBeInTheDocument()
      expect(enfocadoFueraDeBody()).toContainElement(screen.getByText(texto))
      expect(aviso.error).toHaveBeenCalledTimes(1)
      expect(aviso.error).toHaveBeenCalledWith(MENSAJE_409)
    },
  )

  it("PR-1A14 (e): si la recarga tras el 409 trae puedeEditar en false, dice «No puedes editar esta tarea.» y el foco va a la raíz", async () => {
    stubApi({
      lecturas: [
        () => respuestaJson(200, tareaEn(V)),
        () => respuestaJson(200, tareaEn(V + 1, { puedeEditar: false })),
      ],
      guardados: [conflicto],
    })
    const cliente = renderEditar()
    await screen.findByLabelText("Título")

    guardar()

    expect(await screen.findByText("No puedes editar esta tarea.")).toBeInTheDocument()
    await sinPeticionesEnVuelo(cliente)
    expect(screen.queryByLabelText("Título")).not.toBeInTheDocument()
    expect(enfocadoFueraDeBody()).toContainElement(screen.getByText("No puedes editar esta tarea."))
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })

  it("PR-1A14 (f): los archivos elegidos antes del 409 se piden y se suben una sola vez, ningún PUT posterior lleva su id y tras el reinicio la lista de elegidos está vacía", async () => {
    const { llamadas } = stubApi({
      lecturas: [() => respuestaJson(200, tareaEn(V)), () => respuestaJson(200, tareaEn(V + 1))],
      guardados: [conflicto, () => respuestaJson(200, tareaEn(V + 2))],
    })
    const cliente = renderEditar()
    await screen.findByLabelText("Título")
    elegirArchivo("mio.pdf")
    expect(screen.getByRole("button", { name: "Quitar mio.pdf" })).toBeInTheDocument()

    guardar()

    await screen.findByDisplayValue(`Versión ${String(V + 1)} de otra persona`)
    await sinPeticionesEnVuelo(cliente)
    expect(solicitudesDeSubida(llamadas)).toHaveLength(1)
    expect(subidasAlAlmacen(llamadas)).toHaveLength(1)
    expect(screen.queryByRole("button", { name: "Quitar mio.pdf" })).not.toBeInTheDocument()
    expect(
      (guardadosDe(llamadas)[0]?.cuerpo as { archivoIds: string[] } | undefined)?.archivoIds,
    ).toEqual([ADJUNTO_V, ARCHIVO_SUBIDO])

    guardar()

    await waitFor(() => expect(guardadosDe(llamadas)).toHaveLength(2))
    expect(
      (guardadosDe(llamadas)[1]?.cuerpo as { archivoIds: string[] } | undefined)?.archivoIds,
    ).toEqual([ADJUNTO_OTRO])
    expect(solicitudesDeSubida(llamadas)).toHaveLength(1)
    expect(subidasAlAlmacen(llamadas)).toHaveLength(1)
  })

  it("PR-1A14 (g): en la primera apertura el foco no se mueve a «Título»", async () => {
    stubApi({ lecturas: [() => respuestaJson(200, tareaEn(V))], guardados: [conflicto] })
    const cliente = renderEditar()

    const titulo = await screen.findByLabelText("Título")
    await sinPeticionesEnVuelo(cliente)

    expect(titulo).not.toHaveFocus()
    expect(document.activeElement).toBe(document.body)
  })

  it("PR-1A14 (h): «Cancelar» durante la recarga tras el 409 navega al detalle sin errores en la consola", async () => {
    const errores = vi.spyOn(console, "error")
    const enVuelo = diferida()
    stubApi({
      lecturas: [() => respuestaJson(200, tareaEn(V)), () => enVuelo.promesa],
      guardados: [conflicto],
    })
    const cliente = renderEditar()
    await screen.findByLabelText("Título")
    guardar()
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole("link", { name: "Cancelar" }))
    expect(await screen.findByText("Pantalla del detalle")).toBeInTheDocument()
    enVuelo.resolver(respuestaJson(200, tareaEn(V + 1)))
    await sinPeticionesEnVuelo(cliente)

    expect(screen.getByText("Pantalla del detalle")).toBeInTheDocument()
    expect(errores).not.toHaveBeenCalled()
  })
})
