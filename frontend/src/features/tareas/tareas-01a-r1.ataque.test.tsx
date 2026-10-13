import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { EditarTareaView } from "./editar-tarea-view"

// Ataques del Tester, ENTREGAS-01a ronda 1, sobre el formulario de edición (§D-8, Enmienda 2):
// T-r1-4 (el tema elegido se borra mientras se edita), T-r1-6 ("Cómo se entrega" y el teclado durante
// la recarga tras el 409) y T-r1-2 (los textos declarados una sola vez, por texto fuente). Reloj fijo
// en todas: Date falso y avanzado a mano.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const AHORA = new Date("2026-10-11T12:00:00.000Z")
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const TEMA_ID = "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d51"
const URL_TAREA = `/api/clases/${CLASE_ID}/tareas/${TAREA_ID}`
const V = 4
const MENSAJE_409 =
  "Otra persona guardó cambios en esta tarea mientras la editabas. Tus cambios no se guardaron: vuelve a hacerlos sobre la versión actual."

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorDeApi = (estado: number, codigo: string, mensaje = "x") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const tareaEn = (version: number, extra: Record<string, unknown> = {}) => ({
  tarea: {
    id: TAREA_ID,
    titulo: version === V ? "Ensayo final" : `Versión ${String(version)}`,
    instrucciones: "Dos páginas",
    fechaLimite: "2030-01-15T16:00:00.000Z",
    puntos: 80,
    aceptaTardias: true,
    requiereAdjuntos: true,
    version,
    categoria: null,
    tema: { id: TEMA_ID, nombre: "Unidad 1" },
    rubrica: [],
    adjuntos: [],
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
})

interface Llamada {
  metodo: string
  url: string
  cuerpo: unknown
}

const stubApi = ({
  lecturas,
  guardados,
  temas,
}: {
  lecturas: (() => Response | Promise<Response>)[]
  guardados: (() => Response | Promise<Response>)[]
  temas: (() => Response)[]
}) => {
  const llamadas: Llamada[] = []
  const cuenta = { lecturas: 0, guardados: 0, temas: 0 }
  const siguiente = <T,>(lista: T[], n: number): T => {
    const elegido = lista[Math.min(n, lista.length - 1)]
    if (elegido === undefined) throw new Error("Precondición: el doble no tiene respuesta")
    return elegido
  }
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = String(entrada)
      const metodo = init?.method ?? "GET"
      const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : null
      llamadas.push({ metodo, url, cuerpo })
      if (url.endsWith("/categorias"))
        return Promise.resolve(respuestaJson(200, { categorias: [] }))
      if (url.endsWith("/temas")) return Promise.resolve(siguiente(temas, cuenta.temas++)())
      if (metodo === "PUT") return Promise.resolve(siguiente(guardados, cuenta.guardados++)())
      return Promise.resolve(siguiente(lecturas, cuenta.lecturas++)())
    }),
  )
  return llamadas
}

const conTema = () =>
  respuestaJson(200, {
    temas: [{ id: TEMA_ID, nombre: "Unidad 1", orden: 0, elementos: 1 }],
    sinTema: 0,
  })
const sinTemas = () => respuestaJson(200, { temas: [], sinTema: 1 })

const guardadosDe = (llamadas: Llamada[]) =>
  llamadas.filter(({ metodo, url }) => metodo === "PUT" && url === URL_TAREA)
const lecturasDe = (llamadas: Llamada[]) =>
  llamadas.filter(({ metodo, url }) => metodo === "GET" && url === URL_TAREA)
const cuerpoDe = (llamada: Llamada | undefined) =>
  (llamada?.cuerpo ?? {}) as {
    version?: unknown
    requiereAdjuntos?: unknown
    temaId?: unknown
    titulo?: unknown
  }

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
const guardar = () => {
  vi.setSystemTime(new Date(Date.now() + 5_000))
  botonGuardar().focus()
  fireEvent.click(botonGuardar())
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
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("ataque ENTREGAS-01a r1: el tema elegido se borra mientras se edita (T-r1-4)", () => {
  it("el 404 TEMA_NO_ENCONTRADO renueva los temas pero no la tarea: no reinicia el formulario, lo escrito sigue y el guardado siguiente lleva la misma versión de apertura", async () => {
    const llamadas = stubApi({
      lecturas: [() => respuestaJson(200, tareaEn(V))],
      guardados: [
        () => errorDeApi(404, "TEMA_NO_ENCONTRADO", "Ese tema ya no existe."),
        () => respuestaJson(200, tareaEn(V + 1)),
      ],
      temas: [conTema, sinTemas],
    })
    const cliente = renderEditar()
    await screen.findByLabelText("Título")
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Lo que escribí" } })

    guardar()
    await waitFor(() => expect(guardadosDe(llamadas)).toHaveLength(1))
    await sinPeticionesEnVuelo(cliente)

    expect(screen.getByLabelText("Título")).toHaveValue("Lo que escribí")
    expect(lecturasDe(llamadas)).toHaveLength(1)
    expect(llamadas.filter(({ url }) => url.endsWith("/temas"))).toHaveLength(2)

    guardar()
    await waitFor(() => expect(guardadosDe(llamadas)).toHaveLength(2))
    const [primero, segundo] = guardadosDe(llamadas)
    expect([cuerpoDe(primero).version, cuerpoDe(segundo).version]).toEqual([V, V])
    expect([cuerpoDe(primero).temaId, cuerpoDe(segundo).temaId]).toEqual([TEMA_ID, null])
    expect(cuerpoDe(segundo).titulo).toBe("Lo que escribí")
    expect(await screen.findByText("Pantalla del detalle")).toBeInTheDocument()
  })
})

describe("ataque ENTREGAS-01a r1: «Cómo se entrega» y el teclado durante la recarga tras el 409 (T-r1-6)", () => {
  it("con la recarga en vuelo, cambiar «Cómo se entrega», hacer clic en «Guardar cambios» y pulsar Enter en «Título» y en «Puntos» no envían otro PUT; al reiniciar, el control muestra lo guardado, el foco está en «Título» y el guardado siguiente lleva v + 1", async () => {
    const enVuelo = diferida()
    const llamadas = stubApi({
      lecturas: [() => respuestaJson(200, tareaEn(V)), () => enVuelo.promesa],
      guardados: [
        () => errorDeApi(409, "TAREA_MODIFICADA", MENSAJE_409),
        () => respuestaJson(200, tareaEn(V + 2)),
      ],
      temas: [conTema],
    })
    const cliente = renderEditar()
    await screen.findByLabelText("Título")

    guardar()
    await waitFor(() => expect(lecturasDe(llamadas)).toHaveLength(2))
    expect(botonGuardar()).toHaveAttribute("aria-busy", "true")

    fireEvent.click(screen.getByRole("button", { name: "Marcar como completada" }))
    fireEvent.click(botonGuardar())
    for (const campo of ["Título", "Puntos"]) {
      const entrada = screen.getByLabelText(campo)
      fireEvent.keyDown(entrada, { key: "Enter", code: "Enter" })
      const formulario = entrada.closest("form")
      if (formulario === null) throw new Error(`Precondición: «${campo}» vive en un formulario`)
      fireEvent.submit(formulario)
    }
    expect(guardadosDe(llamadas)).toHaveLength(1)

    enVuelo.resolver(respuestaJson(200, tareaEn(V + 1)))
    expect(await screen.findByDisplayValue(`Versión ${String(V + 1)}`)).toHaveFocus()
    expect(screen.getByRole("button", { name: "Con archivos o enlaces" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    expect(screen.getByRole("button", { name: "Marcar como completada" })).toHaveAttribute(
      "aria-pressed",
      "false",
    )
    await sinPeticionesEnVuelo(cliente)
    expect([
      guardadosDe(llamadas).length,
      lecturasDe(llamadas).length,
      aviso.error.mock.calls.length,
    ]).toEqual([1, 2, 1])

    guardar()
    await waitFor(() => expect(guardadosDe(llamadas)).toHaveLength(2))
    expect(cuerpoDe(guardadosDe(llamadas)[1])).toMatchObject({
      version: V + 1,
      requiereAdjuntos: true,
    })
  })

  it("«Marcar como completada» elegido antes de guardar con la versión vigente viaja como requiereAdjuntos: false junto con la versión de apertura, y un 409 no lo deja en el cuerpo del siguiente guardado", async () => {
    const llamadas = stubApi({
      lecturas: [() => respuestaJson(200, tareaEn(V)), () => respuestaJson(200, tareaEn(V + 1))],
      guardados: [
        () => errorDeApi(409, "TAREA_MODIFICADA", MENSAJE_409),
        () => respuestaJson(200, tareaEn(V + 2)),
      ],
      temas: [conTema],
    })
    renderEditar()
    await screen.findByLabelText("Título")
    fireEvent.click(screen.getByRole("button", { name: "Marcar como completada" }))
    guardar()
    expect(await screen.findByDisplayValue(`Versión ${String(V + 1)}`)).toHaveFocus()
    guardar()
    await waitFor(() => expect(guardadosDe(llamadas)).toHaveLength(2))
    expect(
      guardadosDe(llamadas).map((l) => [cuerpoDe(l).version, cuerpoDe(l).requiereAdjuntos]),
    ).toEqual([
      [V, false],
      [V + 1, true],
    ])
  })
})

// T-r1-2 (N-01 del manager): PR-1A17 compara valores con toBe; aquí se comprueba el origen, por texto
// fuente sin comentarios: cada texto se escribe una sola vez.
const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})
const sinComentarios = (texto: string): string =>
  texto
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1")
const codigo = Object.entries(fuentes)
  .filter(([ruta]) => !/\.test\.tsx?$/.test(ruta))
  .map(([ruta, texto]) => [ruta, sinComentarios(texto)] as const)
const archivosConLiteral = (literal: string) =>
  codigo
    .filter(
      ([, texto]) =>
        texto.includes(`"${literal}"`) ||
        texto.includes(`'${literal}'`) ||
        texto.includes(`\`${literal}\``),
    )
    .map(([ruta]) => ruta)

describe("ataque ENTREGAS-01a r1: textos declarados una sola vez, por texto fuente (T-r1-2)", () => {
  it("se leyó el código fuente", () => {
    expect(codigo.length).toBeGreaterThan(100)
  })

  it("el literal «Sin tema» vive solo en components/clase/data.ts", () => {
    expect(archivosConLiteral("Sin tema")).toEqual(["/src/components/clase/data.ts"])
  })

  it("«Elige la categoría de la tarea.» se escribe una sola vez en features/tareas, y «No tienes acceso a esta clase.» ninguna (lo toma de components/clase/data.ts)", () => {
    const enTareas = (literal: string) =>
      archivosConLiteral(literal).filter((ruta) => ruta.startsWith("/src/features/tareas/"))
    const datos = codigo.find(([ruta]) => ruta === "/src/features/tareas/data.ts")?.[1] ?? ""
    expect(datos.length, "Precondición: se leyó features/tareas/data.ts").toBeGreaterThan(0)
    expect(datos.split('"Elige la categoría de la tarea."').length - 1).toBe(1)
    expect(enTareas("Elige la categoría de la tarea.")).toEqual(["/src/features/tareas/data.ts"])
    expect(enTareas("No tienes acceso a esta clase.")).toEqual([])
  })
})
