import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { TrabajoView } from "./trabajo-view"

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

// TAREAS-01e (§D-11; PR-1E01, PR-1E02 y PR-1E07). Contrato de los dobles (Enmienda 5, corrección M-01):
// las respuestas retenidas son promesas controladas (sin temporizadores), el doble rechaza con un
// AbortError cuando su signal se aborta, cuenta sus peticiones en vuelo y cada caso que retiene
// respuestas las resuelve o desmonta la vista antes de terminar.

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorDeApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const uuid = (prefijo: string, n: number) =>
  `${prefijo}-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`

const CLASE_A = uuid("2a2b3c4d", 1)
const CLASE_B = uuid("2a2b3c4d", 2)
const idTema = (n: number) => uuid("7a7b3c4d", n)
const idElemento = (n: number) => uuid("5a5b3c4d", n)

const AUTOR = { id: uuid("3a3b3c4d", 9), nombre: "Luis Pérez", administracion: false }
const HORA = 60 * 60 * 1000

interface Elemento {
  id: string
  tipo: "material" | "tarea"
  titulo: string
  autor: typeof AUTOR
  creadoEn: string
  material: { texto: string; adjuntos: unknown[] } | null
  tarea: { fechaLimite: string; puntos: number } | null
  puedeMover: boolean
  // ENTREGAS-01b (S-07): la entrega del alumno; nula en materiales y para maestro y admin.
  entrega: null
}

const tarea = (n: number, titulo: string, fechaLimite: string, puedeMover = false): Elemento => ({
  id: idElemento(n),
  tipo: "tarea",
  titulo,
  autor: AUTOR,
  creadoEn: "2026-10-01T15:00:00.000Z",
  material: null,
  tarea: { fechaLimite, puntos: 10 },
  puedeMover,
  entrega: null,
})

const material = (
  n: number,
  titulo: string,
  puedeMover = false,
  contenido: Elemento["material"] = { texto: "", adjuntos: [] },
): Elemento => ({
  id: idElemento(n),
  tipo: "material",
  titulo,
  autor: AUTOR,
  creadoEn: "2026-10-01T15:00:00.000Z",
  material: contenido,
  tarea: null,
  puedeMover,
  entrega: null,
})

interface ClaseEnElServidor {
  temas: { id: string; nombre: string }[]
  // "sin-tema" o el id del tema → sus elementos, del más reciente al más antiguo.
  elementos: Record<string, Elemento[]>
}

interface PedidoDeTrabajo {
  claseId: string
  tema: string
  limite: string | null
  cursor: string | null
  responder: () => void
  fallar: (respuesta: Response) => void
}

interface Llamada {
  metodo: string
  ruta: string
  parametros: URLSearchParams
  cuerpo: unknown
}

type Manejador = (llamada: Llamada) => Response | Promise<Response> | undefined

const crearServidor = (
  clases: Record<string, ClaseEnElServidor>,
  {
    retenerTrabajo = false,
    manejar,
    temas: respuestaDeTemas,
  }: {
    retenerTrabajo?: boolean
    manejar?: Manejador
    temas?: (claseId: string) => Response | undefined
  } = {},
) => {
  const llamadas: Llamada[] = []
  const pendientes: PedidoDeTrabajo[] = []
  let enVuelo = 0
  let maximoEnVuelo = 0

  const listaDeTemas = (claseId: string) => {
    const clase = clases[claseId]
    if (clase === undefined) throw new Error(`clase ${claseId} sin datos en el doble`)
    return {
      temas: clase.temas.map((tema, orden) => ({
        ...tema,
        orden,
        elementos: clase.elementos[tema.id]?.length ?? 0,
      })),
      sinTema: clase.elementos["sin-tema"]?.length ?? 0,
    }
  }

  const pagina = (claseId: string, tema: string, limite: number, cursor: string | null) => {
    const lista = clases[claseId]?.elementos[tema] ?? []
    const desde = cursor === null ? 0 : lista.findIndex(({ id }) => id === cursor) + 1
    const elementos = lista.slice(desde, desde + limite)
    const ultimo = elementos.at(-1)
    const quedan = desde + limite < lista.length
    return { elementos, siguienteCursor: quedan && ultimo !== undefined ? ultimo.id : null }
  }

  const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
    const url = new URL(String(entrada), "http://localhost")
    const metodo = init?.method ?? "GET"
    const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined
    const llamada = { metodo, ruta: url.pathname, parametros: url.searchParams, cuerpo }
    llamadas.push(llamada)
    const propia = manejar?.(llamada)
    if (propia !== undefined) return Promise.resolve(propia)

    const temas = /^\/api\/clases\/([^/]+)\/temas$/.exec(url.pathname)
    if (temas && metodo === "GET") {
      const claseId = temas[1] ?? ""
      return Promise.resolve(
        respuestaDeTemas?.(claseId) ?? respuestaJson(200, listaDeTemas(claseId)),
      )
    }

    const trabajo = /^\/api\/clases\/([^/]+)\/trabajo$/.exec(url.pathname)
    if (trabajo && metodo === "GET") {
      const claseId = trabajo[1] ?? ""
      const tema = url.searchParams.get("tema") ?? ""
      const limite = url.searchParams.get("limite")
      const cursor = url.searchParams.get("cursor")
      const responder = () =>
        respuestaJson(200, pagina(claseId, tema, Number(limite ?? 20), cursor))
      if (!retenerTrabajo) return Promise.resolve(responder())
      enVuelo += 1
      maximoEnVuelo = Math.max(maximoEnVuelo, enVuelo)
      return new Promise<Response>((resolver, rechazar) => {
        let asentado = false
        const asentar = () => {
          if (asentado) return false
          asentado = true
          enVuelo -= 1
          const indice = pendientes.indexOf(pedido)
          if (indice >= 0) pendientes.splice(indice, 1)
          return true
        }
        const pedido: PedidoDeTrabajo = {
          claseId,
          tema,
          limite,
          cursor,
          responder: () => {
            if (asentar()) resolver(responder())
          },
          fallar: (respuesta) => {
            if (asentar()) resolver(respuesta)
          },
        }
        pendientes.push(pedido)
        init?.signal?.addEventListener("abort", () => {
          if (asentar()) rechazar(new DOMException("The operation was aborted.", "AbortError"))
        })
      })
    }

    return Promise.resolve(errorDeApi(500, "ERROR_INTERNO", "sin manejador en el doble"))
  })
  vi.stubGlobal("fetch", fetchMock)

  const pedidosDeTrabajo = () =>
    llamadas
      .filter(({ metodo, ruta }) => metodo === "GET" && ruta.endsWith("/trabajo"))
      .map(({ ruta, parametros }) => ({
        claseId: ruta.split("/")[3] ?? "",
        tema: parametros.get("tema"),
        limite: parametros.get("limite"),
        cursor: parametros.get("cursor"),
      }))

  return {
    llamadas,
    pendientes,
    pedidosDeTrabajo,
    enVuelo: () => enVuelo,
    maximoEnVuelo: () => maximoEnVuelo,
  }
}

const renderTrabajo = (ruta: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path: "/estudiante/clases/:claseId/trabajo", element: <TrabajoView /> },
      { path: "/maestro/clases/:claseId/trabajo", element: <TrabajoView /> },
      { path: "/admin/clases/:claseId/trabajo", element: <TrabajoView /> },
      { path: "/maestro/clases/:claseId", element: <p>Pantalla del muro</p> },
    ],
    { initialEntries: [ruta] },
  )
  const vista = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, queryClient, vista }
}

const navegar = async (router: ReturnType<typeof renderTrabajo>["router"], ruta: string) => {
  await act(async () => {
    await router.navigate(ruta)
  })
}

const encabezadoDe = (nombre: string) =>
  screen.getByRole("heading", { level: 2, name: new RegExp(`^${nombre} ·`) })

const seccionDe = (nombre: string): HTMLElement => {
  const seccion = encabezadoDe(nombre).closest("section")
  if (seccion === null) throw new Error(`sin sección para ${nombre}`)
  return seccion
}

const nombresDeLasSecciones = () =>
  screen
    .getAllByRole("heading", { level: 2 })
    .filter((encabezado) => encabezado.closest("section") !== null)
    .map((encabezado) => encabezado.textContent.split(" · ")[0])

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("TrabajoView: el estudiante (PR-1E01)", () => {
  it("PR-1E01 · «Sin tema» va arriba solo si tiene elementos y después los temas en su orden", async () => {
    crearServidor({
      [CLASE_A]: {
        temas: [
          { id: idTema(2), nombre: "Unidad 2" },
          { id: idTema(1), nombre: "Unidad 1" },
        ],
        elementos: {
          "sin-tema": [material(1, "Reglamento")],
          [idTema(2)]: [material(2, "Lectura 2")],
        },
      },
      [CLASE_B]: {
        temas: [{ id: idTema(3), nombre: "Unidad 3" }],
        elementos: { [idTema(3)]: [material(3, "Lectura 3")] },
      },
    })
    const { router } = renderTrabajo(`/estudiante/clases/${CLASE_A}/trabajo`)
    expect(await screen.findByText("Reglamento")).toBeInTheDocument()
    expect(nombresDeLasSecciones()).toEqual(["Sin tema", "Unidad 2", "Unidad 1"])

    await navegar(router, `/estudiante/clases/${CLASE_B}/trabajo`)
    expect(await screen.findByText("Lectura 3")).toBeInTheDocument()
    expect(nombresDeLasSecciones()).toEqual(["Unidad 3"])
  })

  it("PR-1E01 · un tema vacío dice «Aún no hay nada en este tema.» sin pedir su trabajo", async () => {
    const servidor = crearServidor({
      [CLASE_A]: {
        temas: [
          { id: idTema(1), nombre: "Unidad 1" },
          { id: idTema(2), nombre: "Unidad 2" },
        ],
        elementos: { [idTema(1)]: [material(1, "Lectura 1")] },
      },
    })
    renderTrabajo(`/estudiante/clases/${CLASE_A}/trabajo`)
    expect(await screen.findByText("Lectura 1")).toBeInTheDocument()

    expect(within(seccionDe("Unidad 2")).getByText("Aún no hay nada en este tema.")).toBeVisible()
    expect(servidor.pedidosDeTrabajo().map(({ tema }) => tema)).toEqual([idTema(1)])
  })

  it("PR-1E01 · sin temas ni elementos, la vista dice que aún no hay tareas ni materiales", async () => {
    crearServidor({ [CLASE_A]: { temas: [], elementos: {} } })
    renderTrabajo(`/estudiante/clases/${CLASE_A}/trabajo`)
    expect(
      await screen.findByText("Aún no hay tareas ni materiales en esta clase."),
    ).toBeInTheDocument()
  })

  it("PR-1E01 · la fila de una tarea lleva el cuadro de fecha, enlaza a su detalle y dice su estado con texto (próxima, pendiente y vencida)", async () => {
    // T-20 (ronda 3 de 01e): el texto de vencimiento depende de la hora; el reloj se fija (solo Date,
    // los temporizadores siguen reales) a una hora de la mañana para que la prueba pase a cualquier hora.
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(2026, 9, 6, 9, 0))
    onTestFinished(() => {
      vi.useRealTimers()
    })
    const ahora = Date.now()
    const proxima = new Date(ahora + 30 * HORA).toISOString()
    const pendiente = new Date(ahora + 10 * 24 * HORA).toISOString()
    const vencida = new Date(ahora - 48 * HORA).toISOString()
    crearServidor({
      [CLASE_A]: {
        temas: [{ id: idTema(1), nombre: "Unidad 1" }],
        elementos: {
          [idTema(1)]: [
            tarea(1, "Ensayo", proxima),
            tarea(2, "Proyecto", pendiente),
            tarea(3, "Cuestionario", vencida),
          ],
        },
      },
    })
    renderTrabajo(`/estudiante/clases/${CLASE_A}/trabajo`)

    const ensayo = await screen.findByRole("link", { name: /^Tarea: Ensayo/ })
    expect(ensayo).toHaveAttribute("href", `/estudiante/clases/${CLASE_A}/tareas/${idElemento(1)}`)
    expect(ensayo).toHaveTextContent(/Vence (hoy|mañana) a las \d{2}:\d{2}/)
    expect(ensayo).toHaveTextContent(String(new Date(proxima).getDate()))

    const proyecto = screen.getByRole("link", { name: /^Tarea: Proyecto/ })
    expect(proyecto).toHaveTextContent(/Vence el /)
    const cuestionario = screen.getByRole("link", { name: /^Tarea: Cuestionario/ })
    expect(cuestionario).toHaveTextContent(/Venció el /)
  })

  it("PR-1E01 · un material se despliega con «Ver material» y muestra su texto y sus adjuntos", async () => {
    const adjunto = {
      id: uuid("9a9b3c4d", 1),
      nombre: "guia.pdf",
      tipo: "application/pdf",
      tamano: 2048,
      vistaPrevia: null,
    }
    crearServidor({
      [CLASE_A]: {
        temas: [],
        elementos: {
          "sin-tema": [
            material(1, "Guía", false, { texto: "Lean el capítulo 3.", adjuntos: [adjunto] }),
          ],
        },
      },
    })
    renderTrabajo(`/estudiante/clases/${CLASE_A}/trabajo`)

    const ver = await screen.findByRole("button", { name: "Ver material" })
    expect(ver).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByText("Material")).toBeInTheDocument()
    expect(screen.queryByText("Lean el capítulo 3.")).toBeNull()

    fireEvent.click(ver)

    expect(screen.getByRole("button", { name: "Ocultar material" })).toHaveAttribute(
      "aria-expanded",
      "true",
    )
    expect(screen.getByText("Lean el capítulo 3.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Descargar.*guia\.pdf/ })).toBeInTheDocument()
  })

  it("PR-1E01 · el estudiante no ve ningún control de gestión", async () => {
    crearServidor({
      [CLASE_A]: {
        temas: [
          { id: idTema(1), nombre: "Unidad 1" },
          { id: idTema(2), nombre: "Unidad 2" },
        ],
        elementos: {
          [idTema(1)]: [material(1, "Lectura 1"), tarea(2, "Ensayo", "2030-01-01T00:00:00.000Z")],
        },
      },
    })
    renderTrabajo(`/estudiante/clases/${CLASE_A}/trabajo`)
    expect(await screen.findByText("Lectura 1")).toBeInTheDocument()

    for (const nombre of [
      /Crear tarea/,
      /Nuevo tema/,
      /Categorías de calificación/,
      /Renombrar/,
      /Subir/,
      /Bajar/,
      /Borrar tema/,
      /^Mover$/,
    ]) {
      expect(screen.queryByRole("button", { name: nombre }), String(nombre)).toBeNull()
      expect(screen.queryByRole("link", { name: nombre }), String(nombre)).toBeNull()
    }
    expect(screen.queryByRole("combobox")).toBeNull()
  })
})

describe("TrabajoView: maestro y admin (PR-1E02)", () => {
  const dosTemas = (): Record<string, ClaseEnElServidor> => ({
    [CLASE_A]: {
      temas: [
        { id: idTema(1), nombre: "Unidad 1" },
        { id: idTema(2), nombre: "Unidad 2" },
        { id: idTema(3), nombre: "Unidad 3" },
      ],
      elementos: {
        [idTema(1)]: [material(1, "Lectura 1", true), material(2, "Lectura 2", true)],
      },
    },
  })

  it.each([
    ["maestro", "/maestro/clases"],
    ["admin", "/admin/clases"],
  ])(
    "PR-1E02 · %s: «Crear tarea» es la única acción principal y lleva al formulario; «Nuevo tema» y «Categorías de calificación» no lo son",
    async (_perspectiva, base) => {
      crearServidor(dosTemas())
      renderTrabajo(`${base}/${CLASE_A}/trabajo`)
      expect(await screen.findByText("Lectura 1")).toBeInTheDocument()

      const crear = screen.getByRole("link", { name: "Crear tarea" })
      expect(crear).toHaveAttribute("href", `${base}/${CLASE_A}/tareas/nueva`)
      expect(crear).toHaveClass("bg-primary")
      expect(screen.getByRole("link", { name: "Categorías de calificación" })).toHaveAttribute(
        "href",
        `${base}/${CLASE_A}/categorias`,
      )
      expect(screen.getByRole("link", { name: "Categorías de calificación" })).not.toHaveClass(
        "bg-primary",
      )
      expect(screen.getByRole("button", { name: "Nuevo tema" })).toHaveAttribute(
        "data-variant",
        "outline",
      )
      expect(
        screen.getAllByRole("button").filter((boton) => boton.dataset.variant === "primary"),
      ).toEqual([])
    },
  )

  it("PR-1E02 · crear un tema en línea: el campo recibe el foco, el nombre vacío no se envía y, al crearlo, el foco vuelve a «Nuevo tema»", async () => {
    const datos = dosTemas()
    const servidor = crearServidor(datos, {
      manejar: ({ metodo, ruta, cuerpo }) => {
        if (metodo !== "POST" || ruta !== `/api/clases/${CLASE_A}/temas`) return undefined
        const { nombre } = cuerpo as { nombre: string }
        datos[CLASE_A]?.temas.push({ id: idTema(4), nombre })
        return respuestaJson(201, { tema: { id: idTema(4), nombre, orden: 3, elementos: 0 } })
      },
    })
    renderTrabajo(`/maestro/clases/${CLASE_A}/trabajo`)
    fireEvent.click(await screen.findByRole("button", { name: "Nuevo tema" }))

    const campo = screen.getByLabelText("Nombre del tema")
    expect(campo).toHaveFocus()
    expect(campo).toHaveAttribute("autocomplete", "off")
    fireEvent.click(screen.getByRole("button", { name: "Crear tema" }))
    expect(await screen.findByText("Escribe el nombre del tema")).toBeInTheDocument()
    expect(servidor.llamadas.filter(({ metodo }) => metodo === "POST")).toHaveLength(0)

    fireEvent.change(campo, { target: { value: "  Unidad 4 " } })
    fireEvent.click(screen.getByRole("button", { name: "Crear tema" }))

    await waitFor(() => expect(screen.getByRole("button", { name: "Nuevo tema" })).toHaveFocus())
    expect(servidor.llamadas.find(({ metodo }) => metodo === "POST")?.cuerpo).toEqual({
      nombre: "Unidad 4",
    })
    expect(aviso.success).toHaveBeenCalledWith("Tema creado")
    expect(encabezadoDe("Unidad 4")).toBeInTheDocument()
    expect(screen.queryByLabelText("Nombre del tema")).toBeNull()
  })

  it("PR-1E02 · renombrar en línea: un nombre repetido se muestra bajo el campo sin aviso; al guardar, el foco vuelve a «Renombrar»", async () => {
    const datos = dosTemas()
    let intentos = 0
    const servidor = crearServidor(datos, {
      manejar: ({ metodo, ruta, cuerpo }) => {
        if (metodo !== "PUT" || ruta !== `/api/clases/${CLASE_A}/temas/${idTema(2)}`)
          return undefined
        intentos += 1
        if (intentos === 1)
          return errorDeApi(409, "TEMA_REPETIDO", "Ya hay un tema con ese nombre.")
        const { nombre } = cuerpo as { nombre: string }
        const tema = datos[CLASE_A]?.temas.find(({ id }) => id === idTema(2))
        if (tema) tema.nombre = nombre
        return respuestaJson(200, { tema: { id: idTema(2), nombre, orden: 1, elementos: 0 } })
      },
    })
    renderTrabajo(`/maestro/clases/${CLASE_A}/trabajo`)
    await screen.findByText("Lectura 1")

    fireEvent.click(within(seccionDe("Unidad 2")).getByRole("button", { name: /^Renombrar/ }))
    const campo = screen.getByLabelText("Nombre del tema")
    expect(campo).toHaveValue("Unidad 2")
    fireEvent.change(campo, { target: { value: "Unidad 1" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar nombre" }))

    expect(await screen.findByText("Ya hay un tema con ese nombre.")).toBeInTheDocument()
    expect(campo).toHaveAttribute("aria-invalid", "true")
    expect(aviso.error).not.toHaveBeenCalled()

    fireEvent.change(campo, { target: { value: "Funciones" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar nombre" }))

    await waitFor(() =>
      expect(
        within(seccionDe("Funciones")).getByRole("button", { name: /^Renombrar/ }),
      ).toHaveFocus(),
    )
    expect(aviso.success).toHaveBeenCalledWith("Tema renombrado")
    expect(servidor.llamadas.filter(({ metodo }) => metodo === "PUT").at(-1)?.cuerpo).toEqual({
      nombre: "Funciones",
    })
  })

  it("PR-1E02 · «Subir» y «Bajar» envían el orden completo, no aparecen en el primero ni en el último, y el foco sigue en el botón del tema que se movió", async () => {
    const datos = dosTemas()
    const servidor = crearServidor(datos, {
      manejar: ({ metodo, ruta, cuerpo }) => {
        if (metodo !== "PUT" || ruta !== `/api/clases/${CLASE_A}/temas/orden`) return undefined
        const { temaIds } = cuerpo as { temaIds: string[] }
        const clase = datos[CLASE_A]
        if (clase === undefined) return undefined
        clase.temas = temaIds.map(
          (id) => clase.temas.find((tema) => tema.id === id) ?? { id, nombre: "" },
        )
        return respuestaJson(200, {
          temas: clase.temas.map((tema, orden) => ({
            ...tema,
            orden,
            elementos: clase.elementos[tema.id]?.length ?? 0,
          })),
          sinTema: 0,
        })
      },
    })
    renderTrabajo(`/maestro/clases/${CLASE_A}/trabajo`)
    await screen.findByText("Lectura 1")

    expect(within(seccionDe("Unidad 1")).queryByRole("button", { name: /^Subir/ })).toBeNull()
    expect(within(seccionDe("Unidad 3")).queryByRole("button", { name: /^Bajar/ })).toBeNull()
    expect(screen.getByRole("button", { name: "Bajar tema Unidad 1" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Bajar tema Unidad 1" }))
    await waitFor(() =>
      expect(nombresDeLasSecciones()).toEqual(["Unidad 2", "Unidad 1", "Unidad 3"]),
    )
    expect(servidor.llamadas.find(({ ruta }) => ruta.endsWith("/temas/orden"))?.cuerpo).toEqual({
      temaIds: [idTema(2), idTema(1), idTema(3)],
    })
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Bajar tema Unidad 1" })).toHaveFocus(),
    )

    // Al llegar arriba del todo, "Subir" ya no se muestra: el foco pasa a "Bajar" del mismo tema.
    fireEvent.click(screen.getByRole("button", { name: "Subir tema Unidad 1" }))
    await waitFor(() =>
      expect(nombresDeLasSecciones()).toEqual(["Unidad 1", "Unidad 2", "Unidad 3"]),
    )
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Bajar tema Unidad 1" })).toHaveFocus(),
    )
    expect(document.querySelector("[disabled]")).toBeNull()
  })

  it("PR-1E02 · con 409 ORDEN_DESACTUALIZADO la lista se vuelve a pedir y sale el aviso", async () => {
    const datos = dosTemas()
    const servidor = crearServidor(datos, {
      manejar: ({ metodo, ruta }) => {
        if (metodo !== "PUT" || !ruta.endsWith("/temas/orden")) return undefined
        datos[CLASE_A]?.temas.push({ id: idTema(4), nombre: "Unidad 4" })
        return errorDeApi(
          409,
          "ORDEN_DESACTUALIZADO",
          "Los temas cambiaron mientras los ordenabas. Vuelve a intentarlo.",
        )
      },
    })
    renderTrabajo(`/maestro/clases/${CLASE_A}/trabajo`)
    await screen.findByText("Lectura 1")
    const pedidasAntes = servidor.llamadas.filter(
      ({ metodo, ruta }) => metodo === "GET" && ruta.endsWith("/temas"),
    ).length

    fireEvent.click(screen.getByRole("button", { name: "Bajar tema Unidad 2" }))

    await waitFor(() =>
      expect(aviso.error).toHaveBeenCalledWith(
        "Los temas cambiaron mientras los ordenabas. Vuelve a intentarlo.",
      ),
    )
    expect(
      await screen.findByRole("heading", { level: 2, name: /^Unidad 4 ·/ }),
    ).toBeInTheDocument()
    expect(
      servidor.llamadas.filter(({ metodo, ruta }) => metodo === "GET" && ruta.endsWith("/temas"))
        .length,
    ).toBeGreaterThan(pedidasAntes)
  })

  it("PR-1E02 · borrar un tema pide confirmación en línea (foco a «Cancelar» y de vuelta al cancelar); al borrarlo, el foco va al «Borrar tema» del vecino y, sin temas, al encabezado de la vista", async () => {
    const datos: Record<string, ClaseEnElServidor> = {
      [CLASE_A]: {
        temas: [
          { id: idTema(1), nombre: "Unidad 1" },
          { id: idTema(2), nombre: "Unidad 2" },
        ],
        elementos: { [idTema(1)]: [material(1, "Lectura 1")] },
      },
    }
    crearServidor(datos, {
      manejar: ({ metodo, ruta }) => {
        const borrado = /\/temas\/([^/]+)$/.exec(ruta)
        if (metodo !== "DELETE" || borrado === null) return undefined
        const clase = datos[CLASE_A]
        if (clase === undefined) return undefined
        const id = borrado[1] ?? ""
        clase.elementos["sin-tema"] = [
          ...(clase.elementos["sin-tema"] ?? []),
          ...(clase.elementos[id] ?? []),
        ]
        clase.temas = clase.temas.filter((tema) => tema.id !== id)
        return new Response(null, { status: 204 })
      },
    })
    renderTrabajo(`/maestro/clases/${CLASE_A}/trabajo`)
    await screen.findByText("Lectura 1")

    const borrar = within(seccionDe("Unidad 1")).getByRole("button", { name: /^Borrar tema/ })
    fireEvent.click(borrar)
    expect(screen.getByText("Su elemento pasará a «Sin tema».")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus()
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    await waitFor(() =>
      expect(
        within(seccionDe("Unidad 1")).getByRole("button", { name: /^Borrar tema/ }),
      ).toHaveFocus(),
    )

    fireEvent.click(within(seccionDe("Unidad 1")).getByRole("button", { name: /^Borrar tema/ }))
    const si = screen.getByRole("button", { name: "Sí, borrar tema" })
    si.focus()
    fireEvent.click(si)

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Tema borrado"))
    await waitFor(() =>
      expect(
        within(seccionDe("Unidad 2")).getByRole("button", { name: /^Borrar tema/ }),
      ).toHaveFocus(),
    )
    // Sus elementos pasaron a "Sin tema".
    expect(await screen.findByText("Lectura 1")).toBeInTheDocument()
    expect(nombresDeLasSecciones()).toEqual(["Sin tema", "Unidad 2"])

    fireEvent.click(within(seccionDe("Unidad 2")).getByRole("button", { name: /^Borrar tema/ }))
    const otraVez = screen.getByRole("button", { name: "Sí, borrar tema" })
    otraVez.focus()
    fireEvent.click(otraVez)
    await waitFor(() => expect(nombresDeLasSecciones()).toEqual(["Sin tema"]))
    // El vecino ("Sin tema") no tiene "Borrar tema": el foco va a su encabezado.
    await waitFor(() => expect(encabezadoDe("Sin tema")).toHaveFocus())
    expect(document.activeElement).not.toBe(document.body)
  })

  it("PR-1E02 · mover un elemento: «Mover» espera la respuesta y, al salir el elemento de su sección, el foco va al «Mover» de la fila vecina y, sin vecinas, al encabezado de la sección", async () => {
    const datos = dosTemas()
    let soltar: () => void = () => undefined
    const servidor = crearServidor(datos, {
      manejar: ({ metodo, ruta, cuerpo }) => {
        const mover = /\/publicaciones\/([^/]+)\/tema$/.exec(ruta)
        if (metodo !== "PUT" || mover === null) return undefined
        const clase = datos[CLASE_A]
        if (clase === undefined) return undefined
        const id = mover[1] ?? ""
        const { temaId } = cuerpo as { temaId: string | null }
        const destino = temaId ?? "sin-tema"
        const elemento = Object.values(clase.elementos)
          .flat()
          .find((e) => e.id === id)
        if (elemento === undefined) return undefined
        for (const clave of Object.keys(clase.elementos)) {
          clase.elementos[clave] = (clase.elementos[clave] ?? []).filter((e) => e.id !== id)
        }
        clase.elementos[destino] = [elemento, ...(clase.elementos[destino] ?? [])]
        return undefined
      },
    })
    // La respuesta del primer PUT se retiene para ver "Mover" en espera.
    const fetchBase = globalThis.fetch
    let primera = true
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada, init) => {
        const ruta = new URL(String(entrada), "http://localhost").pathname
        if ((init?.method ?? "GET") === "PUT" && ruta.endsWith("/tema")) {
          void fetchBase(entrada, init)
          const cuerpo = JSON.parse(String(init?.body)) as { temaId: string | null }
          const respuesta = respuestaJson(200, {
            publicacionId: ruta.split("/")[5],
            temaId: cuerpo.temaId,
          })
          if (!primera) return Promise.resolve(respuesta)
          primera = false
          return new Promise<Response>((resolver) => {
            soltar = () => resolver(respuesta)
          })
        }
        return fetchBase(entrada, init)
      }),
    )
    renderTrabajo(`/maestro/clases/${CLASE_A}/trabajo`)
    await screen.findByText("Lectura 1")

    const select = screen.getByLabelText("Tema de «Lectura 1»")
    expect(select).toHaveValue(idTema(1))
    expect(select).toHaveAttribute("autocomplete", "off")
    fireEvent.change(select, { target: { value: idTema(2) } })
    const mover = within(select.closest("li") ?? document.body).getByRole("button", {
      name: "Mover",
    })
    mover.focus()
    fireEvent.click(mover)
    await waitFor(() => expect(mover).toHaveAttribute("aria-busy", "true"))
    expect(mover).not.toHaveAttribute("disabled")
    fireEvent.click(mover)
    soltar()

    await waitFor(() =>
      expect(aviso.success).toHaveBeenCalledWith("Moviste «Lectura 1» a «Unidad 2»"),
    )
    await waitFor(() =>
      expect(within(seccionDe("Unidad 2")).getByText("Lectura 1")).toBeInTheDocument(),
    )
    expect(
      servidor.llamadas.filter(({ metodo, ruta }) => metodo === "PUT" && ruta.endsWith("/tema")),
    ).toHaveLength(1)
    const vecina = within(
      screen.getByLabelText("Tema de «Lectura 2»").closest("li") ?? document.body,
    )
    await waitFor(() => expect(vecina.getByRole("button", { name: "Mover" })).toHaveFocus())

    // El último elemento de la sección: sin vecinas, el foco va al encabezado de la sección.
    fireEvent.change(screen.getByLabelText("Tema de «Lectura 2»"), {
      target: { value: idTema(3) },
    })
    fireEvent.click(vecina.getByRole("button", { name: "Mover" }))
    await waitFor(() =>
      expect(
        within(seccionDe("Unidad 1")).getByText("Aún no hay nada en este tema."),
      ).toBeVisible(),
    )
    await waitFor(() => expect(encabezadoDe("Unidad 1")).toHaveFocus())
  })

  it("PR-1E02 · «Ver más de <tema>» espera, y al cargar la última página el foco va al primer elemento nuevo", async () => {
    const elementos = Array.from({ length: 7 }, (_, i) =>
      material(i + 1, `Lectura ${String(i + 1)}`),
    )
    crearServidor({
      [CLASE_A]: {
        temas: [{ id: idTema(1), nombre: "Unidad 1" }],
        elementos: { [idTema(1)]: elementos },
      },
    })
    renderTrabajo(`/maestro/clases/${CLASE_A}/trabajo`)
    await screen.findByText("Lectura 5")
    expect(screen.queryByText("Lectura 6")).toBeNull()

    const verMas = screen.getByRole("button", { name: "Ver más de Unidad 1" })
    verMas.focus()
    fireEvent.click(verMas)

    expect(await screen.findByText("Lectura 6")).toBeInTheDocument()
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByText("Lectura 6").closest("li")),
    )
    expect(screen.queryByRole("button", { name: "Ver más de Unidad 1" })).toBeNull()
  })

  it("PR-1E02 · una recarga fallida de los temas conserva la vista y avisa una vez", async () => {
    let falla = false
    crearServidor(dosTemas(), {
      temas: () =>
        falla ? errorDeApi(503, "SERVICIO_OCUPADO", "El servidor está ocupado.") : undefined,
    })
    const { queryClient } = renderTrabajo(`/maestro/clases/${CLASE_A}/trabajo`)
    await screen.findByText("Lectura 1")

    falla = true
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: ["clases", CLASE_A, "temas"] })
    })

    await waitFor(() =>
      expect(aviso.error).toHaveBeenCalledWith(
        "No pudimos actualizar Trabajo de clase. Mostramos la última versión que tenemos.",
      ),
    )
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(screen.getByText("Lectura 1")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).toBeNull()
  })
})

describe("TrabajoView: lecturas en paralelo (PR-1E07)", () => {
  const conTemas = (claseId: string, cuantos: number, sinTema = 0) => {
    const temas = Array.from({ length: cuantos }, (_, i) => ({
      id: idTema(i + 1 + (claseId === CLASE_B ? 100 : 0)),
      nombre: `${claseId === CLASE_B ? "Tema B" : "Tema"} ${String(i + 1)}`,
    }))
    const elementos: Record<string, Elemento[]> = {}
    temas.forEach((tema, i) => {
      elementos[tema.id] = [
        material(i + 1 + (claseId === CLASE_B ? 100 : 0), `Elemento de ${tema.nombre}`),
      ]
    })
    if (sinTema > 0) {
      elementos["sin-tema"] = Array.from({ length: sinTema }, (_, i) =>
        material(500 + i, `Sin tema ${String(i + 1)}`),
      )
    }
    return { temas, elementos }
  }

  const resolverTodos = async (servidor: ReturnType<typeof crearServidor>) => {
    while (servidor.pendientes.length > 0) {
      await act(async () => {
        servidor.pendientes[0]?.responder()
        await Promise.resolve()
      })
      await waitFor(() => expect(servidor.enVuelo()).toBeLessThanOrEqual(6))
    }
  }

  it("PR-1E07 · con 31 temas con elementos solo hay 6 peticiones de trabajo en vuelo y los temas que esperan muestran que se están cargando", async () => {
    const servidor = crearServidor(
      { [CLASE_A]: conTemas(CLASE_A, 30, 1) },
      { retenerTrabajo: true },
    )
    const { vista } = renderTrabajo(`/estudiante/clases/${CLASE_A}/trabajo`)

    await waitFor(() => expect(servidor.enVuelo()).toBe(6))
    await act(async () => {
      await Promise.resolve()
    })
    expect(servidor.pedidosDeTrabajo()).toHaveLength(6)
    const cargando = screen.getAllByRole("status").map((estado) => estado.textContent)
    expect(cargando).toHaveLength(31)
    expect(cargando).toContain("Cargando Sin tema")
    expect(cargando).toContain("Cargando Tema 30")
    expect(screen.queryByText("Aún no hay nada en este tema.")).toBeNull()

    await resolverTodos(servidor)
    await waitFor(() => expect(screen.getByText("Elemento de Tema 30")).toBeInTheDocument())
    expect(servidor.maximoEnVuelo()).toBe(6)
    expect(servidor.pedidosDeTrabajo()).toHaveLength(31)
    expect(screen.queryAllByRole("status")).toHaveLength(0)
    vista.unmount()
    expect(servidor.enVuelo()).toBe(0)
  })

  it("PR-1E07 · al resolverse una petición de trabajo entra la del siguiente tema, en el orden de la vista y con Sin tema primero", async () => {
    const servidor = crearServidor({ [CLASE_A]: conTemas(CLASE_A, 8, 2) }, { retenerTrabajo: true })
    const { vista } = renderTrabajo(`/estudiante/clases/${CLASE_A}/trabajo`)
    await waitFor(() => expect(servidor.enVuelo()).toBe(6))
    expect(servidor.pedidosDeTrabajo().map(({ tema }) => tema)).toEqual([
      "sin-tema",
      idTema(1),
      idTema(2),
      idTema(3),
      idTema(4),
      idTema(5),
    ])

    await act(async () => {
      servidor.pendientes.find(({ tema }) => tema === idTema(3))?.responder()
      await Promise.resolve()
    })
    await waitFor(() => expect(servidor.pedidosDeTrabajo()).toHaveLength(7))
    expect(servidor.pedidosDeTrabajo().at(-1)?.tema).toBe(idTema(6))

    await act(async () => {
      servidor.pendientes.find(({ tema }) => tema === "sin-tema")?.responder()
      await Promise.resolve()
    })
    await waitFor(() => expect(servidor.pedidosDeTrabajo()).toHaveLength(8))
    expect(servidor.pedidosDeTrabajo().at(-1)?.tema).toBe(idTema(7))

    await resolverTodos(servidor)
    expect(servidor.pedidosDeTrabajo().map(({ tema }) => tema)).toEqual([
      "sin-tema",
      ...Array.from({ length: 8 }, (_, i) => idTema(i + 1)),
    ])
    vista.unmount()
    expect(servidor.enVuelo()).toBe(0)
  })

  it("PR-1E07 · la primera página de cada tema pide limite=5 y Ver más pide limite=20", async () => {
    const elementos = Array.from({ length: 30 }, (_, i) =>
      material(i + 1, `Lectura ${String(i + 1)}`),
    )
    const servidor = crearServidor({
      [CLASE_A]: {
        temas: [{ id: idTema(1), nombre: "Unidad 1" }],
        elementos: { [idTema(1)]: elementos },
      },
    })
    renderTrabajo(`/estudiante/clases/${CLASE_A}/trabajo`)
    await screen.findByText("Lectura 5")
    expect(servidor.pedidosDeTrabajo()).toEqual([
      { claseId: CLASE_A, tema: idTema(1), limite: "5", cursor: null },
    ])

    fireEvent.click(screen.getByRole("button", { name: "Ver más de Unidad 1" }))
    await screen.findByText("Lectura 25")
    expect(servidor.pedidosDeTrabajo()[1]).toEqual({
      claseId: CLASE_A,
      tema: idTema(1),
      limite: "20",
      cursor: idElemento(5),
    })
    expect(screen.queryByText("Lectura 26")).toBeNull()
    // Contrato de los dobles (Enmienda 5, M-01): este caso no retiene respuestas, pero termina igual
    // sin ninguna petición de trabajo en vuelo.
    expect(servidor.enVuelo()).toBe(0)
  })

  it("PR-1E07 · un fallo en un tema no bloquea a los demás: solo esa sección muestra el error", async () => {
    const servidor = crearServidor({ [CLASE_A]: conTemas(CLASE_A, 8) }, { retenerTrabajo: true })
    const { vista } = renderTrabajo(`/estudiante/clases/${CLASE_A}/trabajo`)
    await waitFor(() => expect(servidor.enVuelo()).toBe(6))

    await act(async () => {
      servidor.pendientes
        .find(({ tema }) => tema === idTema(2))
        ?.fallar(
          errorDeApi(503, "SERVICIO_OCUPADO", "El servidor está ocupado. Inténtalo de nuevo."),
        )
      await Promise.resolve()
    })
    // El fallo libera su lugar: entra el séptimo tema.
    await waitFor(() => expect(servidor.pedidosDeTrabajo()).toHaveLength(7))
    expect(servidor.pedidosDeTrabajo().at(-1)?.tema).toBe(idTema(7))

    await resolverTodos(servidor)
    await waitFor(() => expect(screen.getByText("Elemento de Tema 8")).toBeInTheDocument())
    const alertas = screen.getAllByRole("alert")
    expect(alertas).toHaveLength(1)
    expect(seccionDe("Tema 2")).toContainElement(alertas[0] ?? null)
    expect(alertas[0]).toHaveTextContent("El servidor está ocupado. Inténtalo de nuevo.")
    for (const n of [1, 3, 4, 5, 6, 7, 8]) {
      expect(screen.getByText(`Elemento de Tema ${String(n)}`)).toBeInTheDocument()
    }
    vista.unmount()
    expect(servidor.enVuelo()).toBe(0)
  })

  it("PR-1E07 · al cambiar de clase con peticiones de trabajo en vuelo no se pintan datos de la clase anterior y las que esperaban no se piden", async () => {
    const servidor = crearServidor(
      { [CLASE_A]: conTemas(CLASE_A, 10), [CLASE_B]: conTemas(CLASE_B, 3) },
      { retenerTrabajo: true },
    )
    const { router, vista } = renderTrabajo(`/maestro/clases/${CLASE_A}/trabajo`)
    await waitFor(() => expect(servidor.enVuelo()).toBe(6))

    await navegar(router, `/maestro/clases/${CLASE_B}/trabajo`)
    await waitFor(() =>
      expect(servidor.pedidosDeTrabajo().filter(({ claseId }) => claseId === CLASE_B)).toHaveLength(
        3,
      ),
    )
    expect(servidor.pendientes.every(({ claseId }) => claseId === CLASE_B)).toBe(true)

    await resolverTodos(servidor)
    expect(await screen.findByText("Elemento de Tema B 3")).toBeInTheDocument()
    expect(screen.queryByText(/^Elemento de Tema \d/)).toBeNull()
    expect(screen.queryByRole("heading", { level: 2, name: /^Tema \d/ })).toBeNull()
    // Los temas 7 a 10 de la clase anterior esperaban su turno: nunca se pidieron.
    expect(
      servidor
        .pedidosDeTrabajo()
        .filter(({ claseId }) => claseId === CLASE_A)
        .map(({ tema }) => tema),
    ).toEqual([1, 2, 3, 4, 5, 6].map(idTema))
    vista.unmount()
    expect(servidor.enVuelo()).toBe(0)
  })

  it("PR-1E07 · al cambiar de clase o salir y volver con 6 peticiones de trabajo en vuelo y otras en espera, la clase nueva obtiene sus 6 lugares y las que esperaban nunca se piden", async () => {
    const servidor = crearServidor(
      { [CLASE_A]: conTemas(CLASE_A, 10), [CLASE_B]: conTemas(CLASE_B, 8) },
      { retenerTrabajo: true },
    )
    const { router, vista } = renderTrabajo(`/maestro/clases/${CLASE_A}/trabajo`)
    await waitFor(() => expect(servidor.enVuelo()).toBe(6))

    // Cambiar de clase: la nueva obtiene sus 6 lugares.
    await navegar(router, `/maestro/clases/${CLASE_B}/trabajo`)
    await waitFor(() =>
      expect(servidor.pendientes.filter(({ claseId }) => claseId === CLASE_B)).toHaveLength(6),
    )
    expect(servidor.enVuelo()).toBe(6)

    // Salir de la vista: no queda nada en vuelo.
    await navegar(router, `/maestro/clases/${CLASE_B}`)
    expect(await screen.findByText("Pantalla del muro")).toBeInTheDocument()
    await waitFor(() => expect(servidor.enVuelo()).toBe(0))

    // Volver: otra vez 6 lugares, sin ninguna petición de la clase anterior.
    await navegar(router, `/maestro/clases/${CLASE_B}/trabajo`)
    await waitFor(() => expect(servidor.enVuelo()).toBe(6))
    expect(servidor.pendientes.every(({ claseId }) => claseId === CLASE_B)).toBe(true)
    expect(
      servidor
        .pedidosDeTrabajo()
        .filter(({ claseId }) => claseId === CLASE_A)
        .map(({ tema }) => tema),
    ).toEqual([1, 2, 3, 4, 5, 6].map(idTema))
    expect(servidor.maximoEnVuelo()).toBe(6)

    await resolverTodos(servidor)
    expect(await screen.findByText("Elemento de Tema B 8")).toBeInTheDocument()
    vista.unmount()
    expect(servidor.enVuelo()).toBe(0)
  })
})

// TAREAS-01e, corrección de la ronda 1 (T-16): la perspectiva decide qué se muestra; el alumno ve
// "Trabajo de clase" de solo lectura aunque el dato diga puedeMover.
describe("TrabajoView: «Mover» solo para maestro y admin (T-16)", () => {
  const conPuedeMover = (): Record<string, ClaseEnElServidor> => ({
    [CLASE_A]: {
      temas: [{ id: idTema(1), nombre: "Unidad 1" }],
      elementos: {
        "sin-tema": [material(1, "Reglamento", true)],
        [idTema(1)]: Array.from({ length: 6 }, (_, i) =>
          i === 0
            ? tarea(10, "Ensayo", "2030-01-01T00:00:00.000Z", true)
            : material(10 + i, `Lectura ${String(i)}`, true),
        ),
      },
    },
  })

  it("T-16 · el estudiante no ve «Mover» ni el selector de tema en ninguna sección (tampoco en «Sin tema») aunque el servidor diga puedeMover; «Ver más» sí", async () => {
    crearServidor(conPuedeMover())
    renderTrabajo(`/estudiante/clases/${CLASE_A}/trabajo`)
    await screen.findByText("Reglamento")
    await screen.findByText("Lectura 4")

    expect(screen.queryByRole("button", { name: "Mover" })).toBeNull()
    expect(screen.queryByRole("combobox")).toBeNull()
    expect(screen.queryByLabelText(/^Tema de «/)).toBeNull()
    expect(screen.getByRole("button", { name: "Ver más de Unidad 1" })).toBeInTheDocument()
    for (const seccion of ["Sin tema", "Unidad 1"]) {
      expect(
        within(seccionDe(seccion)).queryByRole("button", {
          name: /Renombrar|Borrar tema|Subir|Bajar/,
        }),
      ).toBeNull()
    }
  })

  it.each([
    ["maestro", "/maestro/clases"],
    ["admin", "/admin/clases"],
  ])(
    "T-16 · %s: con puedeMover ve «Mover» y su selector en «Sin tema» y en los temas",
    async (_perspectiva, base) => {
      crearServidor(conPuedeMover())
      renderTrabajo(`${base}/${CLASE_A}/trabajo`)
      await screen.findByText("Lectura 4")

      expect(
        within(seccionDe("Sin tema")).getByLabelText("Tema de «Reglamento»"),
      ).toBeInTheDocument()
      expect(
        within(seccionDe("Sin tema")).getByRole("button", { name: "Mover" }),
      ).toBeInTheDocument()
      expect(within(seccionDe("Unidad 1")).getByLabelText("Tema de «Ensayo»")).toBeInTheDocument()
      expect(within(seccionDe("Unidad 1")).getAllByRole("button", { name: "Mover" })).toHaveLength(
        5,
      )
    },
  )

  it("T-16 · sin puedeMover, el maestro tampoco ve «Mover» en ese elemento", async () => {
    crearServidor({
      [CLASE_A]: {
        temas: [],
        elementos: { "sin-tema": [material(1, "Reglamento", false), material(2, "Guía", true)] },
      },
    })
    renderTrabajo(`/maestro/clases/${CLASE_A}/trabajo`)
    await screen.findByText("Guía")

    expect(screen.queryByLabelText("Tema de «Reglamento»")).toBeNull()
    expect(screen.getByLabelText("Tema de «Guía»")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Mover" })).toHaveLength(1)
  })
})

// TAREAS-01e, corrección de M-01 y M-02 (revisión de la ronda 1): cada acción con petición se guarda de
// forma síncrona (un ref que se marca antes de `mutate`), porque `isPending` llega un render después; y
// "Cancelar" no actúa con el envío en vuelo.
describe("TrabajoView: guardas síncronas y «Cancelar» en vuelo (M-01 y M-02)", () => {
  const tresTemas = (): Record<string, ClaseEnElServidor> => ({
    [CLASE_A]: {
      temas: [
        { id: idTema(1), nombre: "Unidad 1" },
        { id: idTema(2), nombre: "Unidad 2" },
        { id: idTema(3), nombre: "Unidad 3" },
      ],
      elementos: { [idTema(1)]: [material(1, "Lectura 1", true)] },
    },
  })

  // Un manejador que retiene la respuesta hasta que la prueba la suelta.
  const retenida = () => {
    let soltar: (respuesta: Response) => void = () => undefined
    const promesa = new Promise<Response>((resolver) => {
      soltar = resolver
    })
    return { promesa, soltar: (respuesta: Response) => soltar(respuesta) }
  }

  const cuantas = (servidor: ReturnType<typeof crearServidor>, metodo: string, final: RegExp) =>
    servidor.llamadas.filter((l) => l.metodo === metodo && final.test(l.ruta)).length

  it("M-01 y M-02 · «Crear tema» dos veces en el mismo turno manda un solo POST; con el envío en vuelo, «Cancelar» no cierra el formulario y, al llegar la respuesta, el foco vuelve a «Nuevo tema»", async () => {
    const datos = tresTemas()
    const respuesta = retenida()
    const servidor = crearServidor(datos, {
      manejar: ({ metodo, ruta }) => {
        if (metodo !== "POST" || ruta !== `/api/clases/${CLASE_A}/temas`) return undefined
        return respuesta.promesa
      },
    })
    renderTrabajo(`/maestro/clases/${CLASE_A}/trabajo`)
    fireEvent.click(await screen.findByRole("button", { name: "Nuevo tema" }))
    fireEvent.change(screen.getByLabelText("Nombre del tema"), { target: { value: "Unidad 4" } })
    const formulario = screen.getByLabelText("Nombre del tema").closest("form") ?? document.body
    // El mismo turno: todo dentro de un solo act, sin un render de React en medio (isPending todavía
    // no llegó); solo la guarda síncrona lo detiene.
    const cancelar = screen.getByRole("button", { name: "Cancelar" })
    act(() => {
      fireEvent.submit(formulario)
      fireEvent.submit(formulario)
      fireEvent.click(cancelar)
    })

    expect(screen.getByLabelText("Nombre del tema")).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Crear tema" })).toHaveAttribute(
        "aria-busy",
        "true",
      ),
    )
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(screen.getByLabelText("Nombre del tema")).toBeInTheDocument()
    await waitFor(() => expect(cuantas(servidor, "POST", /\/temas$/)).toBe(1))

    datos[CLASE_A]?.temas.push({ id: idTema(4), nombre: "Unidad 4" })
    respuesta.soltar(
      respuestaJson(201, { tema: { id: idTema(4), nombre: "Unidad 4", orden: 3, elementos: 0 } }),
    )
    await waitFor(() => expect(screen.getByRole("button", { name: "Nuevo tema" })).toHaveFocus())
    expect(screen.queryByLabelText("Nombre del tema")).toBeNull()
    expect(cuantas(servidor, "POST", /\/temas$/)).toBe(1)
  })

  it("M-01 y M-02 · «Guardar nombre» dos veces en el mismo turno manda un solo PUT; con el envío en vuelo, «Cancelar» no cierra el formulario y, al llegar la respuesta, el foco vuelve a «Renombrar»", async () => {
    const datos = tresTemas()
    const respuesta = retenida()
    const servidor = crearServidor(datos, {
      manejar: ({ metodo, ruta }) => {
        if (metodo !== "PUT" || ruta !== `/api/clases/${CLASE_A}/temas/${idTema(2)}`)
          return undefined
        return respuesta.promesa
      },
    })
    renderTrabajo(`/maestro/clases/${CLASE_A}/trabajo`)
    await screen.findByText("Lectura 1")
    fireEvent.click(within(seccionDe("Unidad 2")).getByRole("button", { name: /^Renombrar/ }))
    fireEvent.change(screen.getByLabelText("Nombre del tema"), { target: { value: "Funciones" } })
    const formulario = screen.getByLabelText("Nombre del tema").closest("form") ?? document.body
    // El mismo turno: todo dentro de un solo act, sin un render de React en medio (isPending todavía
    // no llegó); solo la guarda síncrona lo detiene.
    const cancelar = screen.getByRole("button", { name: "Cancelar" })
    act(() => {
      fireEvent.submit(formulario)
      fireEvent.submit(formulario)
      fireEvent.click(cancelar)
    })

    expect(screen.getByLabelText("Nombre del tema")).toBeInTheDocument()
    await waitFor(() => expect(cuantas(servidor, "PUT", /\/temas\/[^/]+$/)).toBe(1))

    const tema = datos[CLASE_A]?.temas.find(({ id }) => id === idTema(2))
    if (tema) tema.nombre = "Funciones"
    respuesta.soltar(
      respuestaJson(200, { tema: { id: idTema(2), nombre: "Funciones", orden: 1, elementos: 0 } }),
    )
    await waitFor(() =>
      expect(
        within(seccionDe("Funciones")).getByRole("button", { name: /^Renombrar/ }),
      ).toHaveFocus(),
    )
    expect(cuantas(servidor, "PUT", /\/temas\/[^/]+$/)).toBe(1)
  })

  it("M-01 y M-02 · «Sí, borrar tema» dos veces en el mismo turno manda un solo DELETE y, en vuelo, «Cancelar» no cierra la confirmación", async () => {
    const datos = tresTemas()
    const respuesta = retenida()
    const servidor = crearServidor(datos, {
      manejar: ({ metodo, ruta }) => {
        if (metodo !== "DELETE" || !ruta.endsWith(`/temas/${idTema(3)}`)) return undefined
        return respuesta.promesa
      },
    })
    renderTrabajo(`/maestro/clases/${CLASE_A}/trabajo`)
    await screen.findByText("Lectura 1")
    fireEvent.click(within(seccionDe("Unidad 3")).getByRole("button", { name: /^Borrar tema/ }))
    const si = screen.getByRole("button", { name: "Sí, borrar tema" })
    // El mismo turno: todo dentro de un solo act, sin un render de React en medio (isPending todavía
    // no llegó); solo la guarda síncrona lo detiene.
    const cancelar = screen.getByRole("button", { name: "Cancelar" })
    act(() => {
      fireEvent.click(si)
      fireEvent.click(si)
      fireEvent.click(cancelar)
    })

    expect(screen.getByRole("button", { name: "Sí, borrar tema" })).toBeInTheDocument()
    await waitFor(() => expect(cuantas(servidor, "DELETE", /\/temas\/[^/]+$/)).toBe(1))

    const clase = datos[CLASE_A]
    if (clase) clase.temas = clase.temas.filter(({ id }) => id !== idTema(3))
    respuesta.soltar(new Response(null, { status: 204 }))
    await waitFor(() => expect(nombresDeLasSecciones()).toEqual(["Unidad 1", "Unidad 2"]))
    expect(cuantas(servidor, "DELETE", /\/temas\/[^/]+$/)).toBe(1)
  })

  it("M-01 · «Mover» dos veces en el mismo turno manda un solo PUT", async () => {
    const respuesta = retenida()
    const servidor = crearServidor(tresTemas(), {
      manejar: ({ metodo, ruta }) => {
        if (metodo !== "PUT" || !ruta.endsWith("/tema")) return undefined
        return respuesta.promesa
      },
    })
    renderTrabajo(`/maestro/clases/${CLASE_A}/trabajo`)
    await screen.findByText("Lectura 1")
    fireEvent.change(screen.getByLabelText("Tema de «Lectura 1»"), {
      target: { value: idTema(2) },
    })
    const mover = screen.getByRole("button", { name: "Mover" })
    // El mismo turno: todo dentro de un solo act, sin un render de React en medio (isPending todavía
    // no llegó); solo la guarda síncrona lo detiene.
    act(() => {
      fireEvent.click(mover)
      fireEvent.click(mover)
    })
    await waitFor(() => expect(cuantas(servidor, "PUT", /\/tema$/)).toBe(1))

    respuesta.soltar(respuestaJson(200, { publicacionId: idElemento(1), temaId: idTema(2) }))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
    expect(cuantas(servidor, "PUT", /\/tema$/)).toBe(1)
  })

  it("M-01 · «Bajar» de un tema y «Subir» de otro en el mismo turno mandan un solo PUT del orden", async () => {
    const respuesta = retenida()
    const servidor = crearServidor(tresTemas(), {
      manejar: ({ metodo, ruta }) => {
        if (metodo !== "PUT" || !ruta.endsWith("/temas/orden")) return undefined
        return respuesta.promesa
      },
    })
    renderTrabajo(`/maestro/clases/${CLASE_A}/trabajo`)
    await screen.findByText("Lectura 1")
    // El mismo turno: todo dentro de un solo act, sin un render de React en medio (isPending todavía
    // no llegó); solo la guarda síncrona lo detiene.
    const bajar = screen.getByRole("button", { name: "Bajar tema Unidad 1" })
    const subir = screen.getByRole("button", { name: "Subir tema Unidad 3" })
    act(() => {
      fireEvent.click(bajar)
      fireEvent.click(subir)
    })
    await waitFor(() => expect(cuantas(servidor, "PUT", /\/temas\/orden$/)).toBe(1))
    expect(servidor.llamadas.find(({ ruta }) => ruta.endsWith("/temas/orden"))?.cuerpo).toEqual({
      temaIds: [idTema(2), idTema(1), idTema(3)],
    })

    respuesta.soltar(
      respuestaJson(200, {
        temas: [
          { id: idTema(2), nombre: "Unidad 2", orden: 0, elementos: 0 },
          { id: idTema(1), nombre: "Unidad 1", orden: 1, elementos: 1 },
          { id: idTema(3), nombre: "Unidad 3", orden: 2, elementos: 0 },
        ],
        sinTema: 0,
      }),
    )
    await waitFor(() =>
      expect(nombresDeLasSecciones()).toEqual(["Unidad 2", "Unidad 1", "Unidad 3"]),
    )
    expect(cuantas(servidor, "PUT", /\/temas\/orden$/)).toBe(1)
  })
})

describe("TrabajoView: «Ver más» en el mismo turno (hermano de M-01)", () => {
  it("M-01 · «Ver más de <tema>» dos veces en el mismo turno pide una sola página: TanStack Query no repite una página en curso", async () => {
    const elementos = Array.from({ length: 30 }, (_, i) =>
      material(i + 1, `Lectura ${String(i + 1)}`),
    )
    const servidor = crearServidor({
      [CLASE_A]: {
        temas: [{ id: idTema(1), nombre: "Unidad 1" }],
        elementos: { [idTema(1)]: elementos },
      },
    })
    renderTrabajo(`/estudiante/clases/${CLASE_A}/trabajo`)
    await screen.findByText("Lectura 5")
    const verMas = screen.getByRole("button", { name: "Ver más de Unidad 1" })
    // El mismo turno: sin un render en medio.
    act(() => {
      fireEvent.click(verMas)
      fireEvent.click(verMas)
    })

    await screen.findByText("Lectura 25")
    expect(servidor.pedidosDeTrabajo().map(({ cursor }) => cursor)).toEqual([null, idElemento(5)])
  })
})

// TAREAS-01e, corrección de la ronda 2 (T-19): "Ver más de <tema>" queda en espera mientras la lista
// del tema se recarga en segundo plano; el clic no se une a la recarga ni se pierde.
describe("TrabajoView: «Ver más» durante una recarga (T-19)", () => {
  const sieteElementos = (): Record<string, ClaseEnElServidor> => ({
    [CLASE_A]: {
      temas: [{ id: idTema(1), nombre: "Unidad 1" }],
      elementos: {
        [idTema(1)]: Array.from({ length: 7 }, (_, i) =>
          material(i + 1, `Lectura ${String(i + 1)}`),
        ),
      },
    },
  })

  const conCursor = (servidor: ReturnType<typeof crearServidor>) =>
    servidor.pedidosDeTrabajo().filter(({ cursor }) => cursor !== null)

  const cargarYRecargar = async () => {
    const servidor = crearServidor(sieteElementos(), { retenerTrabajo: true })
    const { queryClient, vista } = renderTrabajo(`/estudiante/clases/${CLASE_A}/trabajo`)
    await waitFor(() => expect(servidor.pendientes).toHaveLength(1))
    act(() => servidor.pendientes[0]?.responder())
    const verMas = await screen.findByRole("button", { name: "Ver más de Unidad 1" })
    expect(verMas).not.toHaveAttribute("aria-busy")
    act(() => verMas.focus())
    // La recarga en segundo plano que dejan mover, publicar, borrar o renombrar.
    void queryClient.invalidateQueries({ queryKey: ["clases", CLASE_A, "trabajo"] })
    await waitFor(() => expect(servidor.pendientes).toHaveLength(1))
    return { servidor, verMas, vista }
  }

  it("T-19 · con la lista del tema recargándose, «Ver más de <tema>» queda en espera, conserva el foco y el clic no pide nada; al terminar la recarga pide la página siguiente", async () => {
    const { servidor, verMas, vista } = await cargarYRecargar()

    await waitFor(() => expect(verMas).toHaveAttribute("aria-busy", "true"))
    fireEvent.click(verMas)
    fireEvent.click(verMas)
    expect(verMas).toHaveFocus()
    expect(conCursor(servidor)).toEqual([])

    act(() => servidor.pendientes[0]?.responder())
    await waitFor(() => expect(verMas).not.toHaveAttribute("aria-busy"))
    expect(verMas).toHaveFocus()
    fireEvent.click(verMas)
    await waitFor(() => expect(servidor.pendientes).toHaveLength(1))
    expect(verMas).toHaveAttribute("aria-busy", "true")
    act(() => servidor.pendientes[0]?.responder())

    expect(await screen.findByText("Lectura 7")).toBeInTheDocument()
    expect(conCursor(servidor)).toHaveLength(1)
    vista.unmount()
    expect(servidor.enVuelo()).toBe(0)
  })

  it("T-19 · si la recarga falla, la sección muestra el error en lugar de «Ver más» y el foco va a su encabezado, no a <body>", async () => {
    const { servidor, verMas, vista } = await cargarYRecargar()
    await waitFor(() => expect(verMas).toHaveAttribute("aria-busy", "true"))

    act(() =>
      servidor.pendientes[0]?.fallar(
        errorDeApi(503, "SERVICIO_OCUPADO", "El servidor está ocupado. Inténtalo de nuevo."),
      ),
    )
    expect(await within(seccionDe("Unidad 1")).findByRole("alert")).toHaveTextContent(
      "El servidor está ocupado. Inténtalo de nuevo.",
    )
    expect(screen.queryByRole("button", { name: "Ver más de Unidad 1" })).toBeNull()
    await waitFor(() => expect(encabezadoDe("Unidad 1")).toHaveFocus())
    expect(conCursor(servidor)).toEqual([])
    vista.unmount()
    expect(servidor.enVuelo()).toBe(0)
  })
})
