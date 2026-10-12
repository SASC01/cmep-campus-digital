import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { vencimientoDe, varianteDeVencimiento, UMBRAL_FECHA_PROXIMA_MS } from "@/lib/vencimiento"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { CrearTareaView } from "./crear-tarea-view"
import { DetalleTareaView } from "./detalle-tarea-view"
import { EditarTareaView } from "./editar-tarea-view"
import { cuerpoDeTarea, fechaLocalAIso, isoAFechaLocal, estadoInicialDelFormulario } from "./lib"

// Ataque del Tester, TAREAS-01d, ronda 1 ("Puntos de ataque" → 01d y la lista "Frontend" de
// tester.md). Sin selectores de clase: rol, etiqueta y texto accesible.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const CATEGORIA_ID = "4a4b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d41"
const TEMA_ID = "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d51"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const tareaDetalle = (cambios: Record<string, unknown> = {}) => ({
  id: TAREA_ID,
  titulo: "Ensayo",
  instrucciones: "Dos páginas.",
  fechaLimite: "2030-01-15T16:00:00.000Z",
  puntos: 100,
  aceptaTardias: true,
  categoria: null,
  tema: null,
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
  ...cambios,
})

interface Llamada {
  metodo: string
  url: string
}

const stubApi = (responder: (metodo: string, url: string) => Response | undefined) => {
  const llamadas: Llamada[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = String(entrada)
      const metodo = init?.method ?? "GET"
      llamadas.push({ metodo, url })
      return Promise.resolve(responder(metodo, url) ?? respuestaJson(500, {}))
    }),
  )
  return llamadas
}

const nuevoCliente = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.success.mockReset()
  aviso.error.mockReset()
})

const renderCrear = () => {
  const cliente = nuevoCliente()
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[`/maestro/clases/${CLASE_ID}/tareas/nueva`]}>
        <Routes>
          <Route path="/maestro/clases/:claseId/tareas/nueva" element={<CrearTareaView />} />
          <Route path="/maestro/clases/:claseId/tareas/:tareaId" element={<p>Detalle</p>} />
          <Route path="/maestro/clases/:claseId" element={<p>Muro</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return cliente
}

const llenarLoMinimo = () => {
  fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Ensayo" } })
  fireEvent.change(screen.getByLabelText("Fecha límite"), { target: { value: "2030-01-15T10:00" } })
}
const enviar = () => fireEvent.click(screen.getByRole("button", { name: "Publicar tarea" }))
const campoCriterio = (n: number) => screen.getByLabelText(new RegExp(`^Criterio\\s+${String(n)}$`))
const campoPuntosMax = (n: number) =>
  screen.getByLabelText(new RegExp(`^Puntos máximos\\s+${String(n)}$`))

describe("ataque TAREAS-01d r1: los errores de la rúbrica siguen a su fila", () => {
  it("quitar la fila con error: el error no pasa a la fila que ocupa su lugar (que es válida)", async () => {
    stubApi((_m, url) => {
      if (url.endsWith("/categorias")) return respuestaJson(200, { categorias: [] })
      if (url.endsWith("/temas")) return respuestaJson(200, { temas: [], sinTema: 0 })
      return undefined
    })
    renderCrear()
    await screen.findByLabelText("Título")
    llenarLoMinimo()
    fireEvent.click(screen.getByRole("button", { name: "Agregar criterio" }))
    fireEvent.click(screen.getByRole("button", { name: "Agregar criterio" }))
    fireEvent.change(campoPuntosMax(1), { target: { value: "10" } })
    fireEvent.change(campoCriterio(2), { target: { value: "Ortografía" } })
    fireEvent.change(campoPuntosMax(2), { target: { value: "5" } })
    enviar()
    await waitFor(() => expect(campoCriterio(1)).toHaveAttribute("aria-invalid", "true"))
    expect(campoCriterio(2)).toHaveAttribute("aria-invalid", "false")

    fireEvent.click(screen.getByRole("button", { name: /^Quitar criterio\s+1$/ }))

    expect(campoCriterio(1)).toHaveValue("Ortografía")
    expect(campoCriterio(1)).toHaveAttribute("aria-invalid", "false")
    expect(screen.queryByText("Escribe el criterio")).toBeNull()
  })

  it("quitar una fila válida antes de la que tiene error: el error sigue en la fila inválida (ahora la primera)", async () => {
    stubApi((_m, url) => {
      if (url.endsWith("/categorias")) return respuestaJson(200, { categorias: [] })
      if (url.endsWith("/temas")) return respuestaJson(200, { temas: [], sinTema: 0 })
      return undefined
    })
    renderCrear()
    await screen.findByLabelText("Título")
    llenarLoMinimo()
    fireEvent.click(screen.getByRole("button", { name: "Agregar criterio" }))
    fireEvent.click(screen.getByRole("button", { name: "Agregar criterio" }))
    fireEvent.change(campoCriterio(1), { target: { value: "Claridad" } })
    fireEvent.change(campoPuntosMax(1), { target: { value: "10" } })
    fireEvent.change(campoPuntosMax(2), { target: { value: "5" } })
    enviar()
    await waitFor(() => expect(campoCriterio(2)).toHaveAttribute("aria-invalid", "true"))

    fireEvent.click(screen.getByRole("button", { name: /^Quitar criterio\s+1$/ }))

    expect(campoCriterio(1)).toHaveValue("")
    const marcado = campoCriterio(1).getAttribute("aria-invalid")
    const conMensaje = screen.queryByText("Escribe el criterio") !== null
    // Coherente: o la fila inválida conserva su error, o el error desaparece de todas; nunca queda en
    // otra fila ni sin fila.
    expect([marcado, conMensaje]).not.toEqual(["false", true])
  })
})

describe("ataque TAREAS-01d r1: la categoría o el tema que desaparecen entre cargar y enviar", () => {
  it.each([
    [
      "categoría",
      "CATEGORIA_NO_ENCONTRADA",
      "Esa categoría ya no existe. Elige otra.",
      "/categorias",
    ],
    ["tema", "TEMA_NO_ENCONTRADO", "Ese tema ya no existe.", "/temas"],
  ])(
    "un 404 de %s se marca bajo su campo y la lista se vuelve a pedir, para no seguir ofreciendo lo que ya no existe",
    async (_etiqueta, codigo, mensaje, sufijo) => {
      const llamadas = stubApi((metodo, url) => {
        if (url.endsWith("/categorias"))
          return respuestaJson(200, {
            categorias: [{ id: CATEGORIA_ID, nombre: "Examen", peso: 100, tareas: 0 }],
          })
        if (url.endsWith("/temas"))
          return respuestaJson(200, {
            temas: [{ id: TEMA_ID, nombre: "Unidad 1", orden: 0, elementos: 0 }],
            sinTema: 0,
          })
        if (metodo === "POST" && url.endsWith("/tareas")) return errorApi(404, codigo, mensaje)
        return undefined
      })
      renderCrear()
      await screen.findByLabelText("Título")
      llenarLoMinimo()
      fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: CATEGORIA_ID } })
      fireEvent.change(screen.getByLabelText("Tema"), { target: { value: TEMA_ID } })
      const pedidasAntes = llamadas.filter((l) => l.url.endsWith(sufijo)).length
      enviar()
      expect(await screen.findByText(mensaje)).toBeInTheDocument()
      expect(aviso.error).not.toHaveBeenCalled()
      await waitFor(() =>
        expect(llamadas.filter((l) => l.url.endsWith(sufijo)).length).toBeGreaterThan(pedidasAntes),
      )
    },
  )
})

describe("ataque TAREAS-01d r1: el foco de la confirmación de borrar en sus estados vecinos", () => {
  it("si una recarga del detalle quita puedeBorrar mientras se confirma, el foco no cae en <body>", async () => {
    let tarea = tareaDetalle({ puedeEditar: false, puedeBorrar: true })
    stubApi((metodo, url) => {
      if (metodo === "GET" && url.endsWith(`/tareas/${TAREA_ID}`))
        return respuestaJson(200, { tarea })
      return undefined
    })
    const cliente = nuevoCliente()
    render(
      <QueryClientProvider client={cliente}>
        <MemoryRouter initialEntries={[`/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}`]}>
          <Routes>
            <Route path="/maestro/clases/:claseId/tareas/:tareaId" element={<DetalleTareaView />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    fireEvent.click(await screen.findByRole("button", { name: "Borrar tarea" }))
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancelar" })),
    )
    tarea = tareaDetalle({ puedeEditar: false, puedeBorrar: false })
    await act(() => cliente.invalidateQueries())
    await waitFor(() => expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull())
    expect(document.activeElement).not.toBe(document.body)
  })
})

describe("ataque TAREAS-01d r1: fechas en zonas extremas y en las fronteras (sin hallazgo esperado)", () => {
  // process no está tipado en el frontend (sin @types/node); Node sí aplica TZ al cambiarla en caliente.
  const entorno = (
    globalThis as unknown as { process: { env: Record<string, string | undefined> } }
  ).process.env
  const conZona = <T,>(zona: string, fn: () => T): T => {
    const antes = entorno.TZ
    entorno.TZ = zona
    try {
      return fn()
    } finally {
      if (antes === undefined) delete entorno.TZ
      else entorno.TZ = antes
    }
  }

  it.each(["Pacific/Kiritimati", "Pacific/Pago_Pago", "America/Mexico_City", "Asia/Kathmandu"])(
    "en %s, fechaLocalAIso e isoAFechaLocal son inversas en la medianoche y en el cambio de día, y una cadena vacía o inválida da cadena vacía",
    (zona) => {
      conZona(zona, () => {
        for (const local of [
          "2030-01-15T00:00",
          "2030-01-14T23:59",
          "2030-12-31T23:30",
          "2030-03-01T00:01",
        ]) {
          expect(isoAFechaLocal(fechaLocalAIso(local))).toBe(local)
        }
        expect([fechaLocalAIso(""), fechaLocalAIso("  "), fechaLocalAIso("no es fecha")]).toEqual([
          "",
          "",
          "",
        ])
        expect([isoAFechaLocal(""), isoAFechaLocal("x")]).toEqual(["", ""])
      })
    },
  )

  it("el umbral de 72 h a \u00B11 minuto y la variante: la próxima avisa con texto, la vencida y la pendiente dicen cuál son (nunca solo color)", () => {
    const ahora = new Date("2030-01-10T12:00:00.000Z")
    const en = (ms: number) => new Date(ahora.getTime() + ms).toISOString()
    const antes = vencimientoDe(en(UMBRAL_FECHA_PROXIMA_MS - 60_000), ahora)
    const despues = vencimientoDe(en(UMBRAL_FECHA_PROXIMA_MS + 60_000), ahora)
    const vencida = vencimientoDe(en(-60_000), ahora)
    expect([antes.estado, despues.estado, vencida.estado]).toEqual([
      "proxima",
      "pendiente",
      "vencida",
    ])
    expect(varianteDeVencimiento(antes.estado)).toBe("warning")
    for (const v of [antes, despues, vencida]) expect(v.texto).toMatch(/^(Vence|Venció)/)
    expect(vencimientoDe("no es fecha", ahora).texto).not.toMatch(/Invalid|NaN|no es fecha/)
  })

  it('cuerpoDeTarea contra el esquema de shared/: puntos "100" (texto del campo) vale 100; 1e3, -0, 10,5 y vacío dan error de puntos; sin categorías ni tema, null', () => {
    const base = {
      ...estadoInicialDelFormulario(null),
      titulo: "Ensayo",
      fechaLimite: "2030-01-15T10:00",
    }
    const valido = cuerpoDeTarea({ ...base, puntos: "100" }, 0)
    expect(
      valido.ok && [valido.datos.puntos, valido.datos.categoriaId, valido.datos.temaId],
    ).toEqual([100, null, null])
    for (const puntos of ["1e3", "-0", "10,5", "", "1001", "0"]) {
      const r = cuerpoDeTarea({ ...base, puntos }, 0)
      expect([puntos, r.ok, r.ok ? null : Object.keys(r.errores)]).toEqual([
        puntos,
        false,
        ["puntos"],
      ])
    }
    const conCategorias = cuerpoDeTarea({ ...base, puntos: "100" }, 2)
    expect(conCategorias.ok ? null : conCategorias.errores.categoriaId).toBe(
      "Elige la categoría de la tarea.",
    )
  })
})

describe("ataque TAREAS-01d r1: el detalle en las tres perspectivas (sin hallazgo esperado)", () => {
  it.each([
    ["maestro", "/maestro/clases", true],
    ["admin", "/admin/clases", true],
    ["estudiante", "/estudiante/clases", false],
  ] as const)(
    "%s: «Editar tarea» apunta a su perspectiva solo con puedeEditar del servidor; el alumno ve «Tu trabajo» aunque el servidor diga true",
    async (_rol, prefijo, conAcciones) => {
      stubApi((metodo, url) => {
        if (metodo === "GET" && url.endsWith(`/tareas/${TAREA_ID}`))
          return respuestaJson(200, {
            tarea: tareaDetalle({ instrucciones: "<b>hola</b> https://x.mx" }),
          })
        return undefined
      })
      render(
        <QueryClientProvider client={nuevoCliente()}>
          <MemoryRouter initialEntries={[`${prefijo}/${CLASE_ID}/tareas/${TAREA_ID}`]}>
            <Routes>
              <Route path={`${prefijo}/:claseId/tareas/:tareaId`} element={<DetalleTareaView />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      )
      await screen.findByRole("heading", { level: 2, name: "Ensayo" })
      expect(screen.getByText("<b>hola</b> https://x.mx")).toBeInTheDocument()
      expect(screen.queryByRole("link", { name: "https://x.mx" })).toBeNull()
      const insignia = screen.getByText("Tarea")
      expect(within(insignia.closest("span") ?? insignia).queryByText("Tarea")).not.toBeNull()
      const editar = screen.queryByRole("link", { name: "Editar tarea" })
      if (conAcciones) {
        expect(editar).toHaveAttribute("href", `${prefijo}/${CLASE_ID}/tareas/${TAREA_ID}/editar`)
        expect(screen.queryByText("Tu trabajo")).toBeNull()
        return
      }
      expect(editar).toBeNull()
      expect(screen.queryByRole("button", { name: "Borrar tarea" })).toBeNull()
      expect(screen.getByText("Tu trabajo")).toBeInTheDocument()
    },
  )
})

describe("ataque TAREAS-01d r1: doble envío, tope de la rúbrica y edición sin permiso (sin hallazgo esperado)", () => {
  it("doble clic humano (30 ms) en «Sí, borrar tarea» manda un solo DELETE", async () => {
    let soltar: (r: Response) => void = () => undefined
    const llamadas = stubApi((metodo, url) => {
      if (metodo === "GET" && url.endsWith(`/tareas/${TAREA_ID}`))
        return respuestaJson(200, { tarea: tareaDetalle() })
      return undefined
    })
    const original = globalThis.fetch
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada, init) => {
        if ((init?.method ?? "GET") === "DELETE") {
          llamadas.push({ metodo: "DELETE", url: String(entrada) })
          return new Promise<Response>((resolver) => {
            soltar = resolver
          })
        }
        return original(entrada, init)
      }),
    )
    render(
      <QueryClientProvider client={nuevoCliente()}>
        <MemoryRouter initialEntries={[`/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}`]}>
          <Routes>
            <Route path="/maestro/clases/:claseId/tareas/:tareaId" element={<DetalleTareaView />} />
            <Route path="/maestro/clases/:claseId" element={<p>Muro</p>} />
            {/* C-15, §D-10 (destino tras borrar desde 01e): tras borrar, la vista lleva a "Trabajo de
            clase" y ya no al muro. */}
            <Route
              path="/maestro/clases/:claseId/trabajo"
              element={<p>Destino: trabajo de clase</p>}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    fireEvent.click(await screen.findByRole("button", { name: "Borrar tarea" }))
    const si = await screen.findByRole("button", { name: "Sí, borrar tarea" })
    fireEvent.click(si)
    // Un doble clic humano deja decenas de milisegundos entre clics (aquí, 30 ms; precedente de
    // alumnos-b-r1). Tres clics en el mismo instante no son un gesto humano.
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30))
    })
    fireEvent.click(si)
    await waitFor(() => expect(llamadas.filter((l) => l.metodo === "DELETE")).toHaveLength(1))
    soltar(new Response(null, { status: 204 }))
    // C-15, §D-10 (destino tras borrar desde 01e; el caso más cercano del inventario es C-12): el
    // destino tras el éxito pasa del muro a "Trabajo de clase". Sigue protegiendo lo mismo: un solo
    // DELETE con el doble clic humano y la navegación tras el éxito.
    expect(await screen.findByText("Destino: trabajo de clase")).toBeInTheDocument()
    expect(llamadas.filter((l) => l.metodo === "DELETE")).toHaveLength(1)
  })

  it("con 20 criterios, «Agregar criterio» no agrega, no usa disabled y la nota dice el tope; el envío lleva los 20", async () => {
    let cuerpo: unknown = null
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada, init) => {
        const url = String(entrada)
        if (url.endsWith("/categorias"))
          return Promise.resolve(respuestaJson(200, { categorias: [] }))
        if (url.endsWith("/temas"))
          return Promise.resolve(respuestaJson(200, { temas: [], sinTema: 0 }))
        if (init?.method === "POST") {
          cuerpo = JSON.parse(String(init.body))
          return Promise.resolve(respuestaJson(201, { tarea: tareaDetalle() }))
        }
        return Promise.resolve(respuestaJson(500, {}))
      }),
    )
    renderCrear()
    await screen.findByLabelText("Título")
    llenarLoMinimo()
    const agregar = screen.getByRole("button", { name: "Agregar criterio" })
    for (let i = 0; i < 21; i += 1) fireEvent.click(agregar)
    expect(screen.getAllByLabelText(/^Criterio\s+\d+$/)).toHaveLength(20)
    expect(agregar).not.toBeDisabled()
    expect(screen.getByText("La rúbrica puede tener hasta 20 criterios.")).toBeInTheDocument()
    for (let n = 1; n <= 20; n += 1) {
      fireEvent.change(campoCriterio(n), { target: { value: `C${String(n)}` } })
      fireEvent.change(campoPuntosMax(n), { target: { value: "5" } })
    }
    enviar()
    expect(await screen.findByText("Detalle")).toBeInTheDocument()
    expect((cuerpo as { rubrica: unknown[] } | null)?.rubrica).toHaveLength(20)
  })

  it("maestro en …/editar de una tarea con puedeEditar false: el mensaje, sin formulario ni petición de guardado", async () => {
    const llamadas = stubApi((metodo, url) => {
      if (metodo === "GET" && url.endsWith(`/tareas/${TAREA_ID}`))
        return respuestaJson(200, { tarea: tareaDetalle({ puedeEditar: false }) })
      if (url.endsWith("/categorias")) return respuestaJson(200, { categorias: [] })
      if (url.endsWith("/temas")) return respuestaJson(200, { temas: [], sinTema: 0 })
      return undefined
    })
    render(
      <QueryClientProvider client={nuevoCliente()}>
        <MemoryRouter initialEntries={[`/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}/editar`]}>
          <Routes>
            <Route
              path="/maestro/clases/:claseId/tareas/:tareaId/editar"
              element={<EditarTareaView />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByText("No puedes editar esta tarea.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).toBeNull()
    expect(llamadas.filter((l) => l.metodo !== "GET")).toEqual([])
  })
})

// Revisión estática de lo nuevo de 01d.
const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})
const NUEVOS = Object.entries(fuentes).filter(
  ([ruta]) =>
    !/\.test\.tsx?$/.test(ruta) &&
    (ruta.startsWith("/src/features/tareas/") ||
      [
        "/src/components/ui/native-select.tsx",
        "/src/lib/vencimiento.ts",
        "/src/services/trabajoService.ts",
        "/src/features/clases/components/tarjeta-de-tarea.tsx",
      ].includes(ruta)),
)

describe("ataque TAREAS-01d r1: revisión estática de lo nuevo (sin hallazgo esperado)", () => {
  it("sin fetch(, console., ?? [], dangerouslySetInnerHTML, target=_blank ni emojis; features/tareas no importa de features/clases y viceversa", () => {
    expect(NUEVOS.length).toBeGreaterThan(15)
    const prohibido =
      /\bfetch\(|console\.|\?\?\s*\[\s*\]|dangerouslySetInnerHTML|target=["']_blank|\p{Extended_Pictographic}/u
    expect(NUEVOS.filter(([, texto]) => prohibido.test(texto)).map(([ruta]) => ruta)).toEqual([])
    const cruzadas = Object.entries(fuentes)
      .filter(([ruta]) => !/\.test\.tsx?$/.test(ruta))
      .filter(
        ([ruta, texto]) =>
          (ruta.startsWith("/src/features/tareas/") &&
            /from\s+["']@\/features\/clases/.test(texto)) ||
          (ruta.startsWith("/src/features/clases/") &&
            /from\s+["']@\/features\/tareas/.test(texto)),
      )
      .map(([ruta]) => ruta)
    expect(cruzadas).toEqual([])
  })
})
