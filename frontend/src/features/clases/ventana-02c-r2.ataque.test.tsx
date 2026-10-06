import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { AlumnosView } from "./alumnos-view"
import { ClaseLayout } from "./clase-layout"
import { InicioEstudianteView } from "./inicio-estudiante-view"
import { MaestrosDeClaseView } from "./maestros-de-clase-view"
import { MuroView } from "./muro-view"

// Tester, CLASES-02c, ronda 2. Ataque a la corrección de T-02: la ventana entre el 200 de la acción
// y la recarga del dato que la esconde, en los seis hermanos corregidos («Asignar a la clase» y
// «Sí, quitar» de maestros, «Agregar a la clase» y «Sí, quitar» del roster, «Sí, borrar» de una
// publicación y «Sí, borrar comentario»): doble clic a 0 ms, a 30 ms y un clic después del 200, con
// una sola petición, un solo aviso, el botón en espera (aria-busy, nunca disabled) y el foco fuera
// de <body> al terminar; la recarga que falla después del 200; y «Unirme a la clase» con la recarga
// lenta o fallida. La acción y la recarga quedan en vuelo por separado (compuertas).

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const PUB_ID = "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11"
const COM_ID = "6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11"
const ALUMNA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11"
const LUIS = {
  id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
  nombre: "Luis Pérez",
  email: "luis@x.mx",
}
const MARIA = {
  id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d10",
  nombre: "María Gómez",
  email: "maria@x.mx",
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const error500 = () =>
  respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "mensaje del servidor" } })
const sinContenido = () => new Response(null, { status: 204 })

interface Compuerta {
  abierta: Promise<void>
  abrir: () => void
}

const compuerta = (): Compuerta => {
  let abrir: () => void = () => undefined
  const abierta = new Promise<void>((r) => {
    abrir = r
  })
  return { abierta, abrir }
}

type Respuesta = () => Response

interface Escenario {
  nombre: string
  aviso: string
  montar: () => void
  // Lleva hasta el botón de la acción (el de confirmar, si lo hay) y lo devuelve.
  llegarAlBoton: () => Promise<HTMLElement>
  esAccion: (ruta: string, metodo: string) => boolean
  respuestaDeAccion: Respuesta
  // La consulta GET que, recargada, deja de ofrecer la acción.
  esRecarga: (ruta: string) => boolean
  // Lo que responde cada GET antes y después de la acción (undefined: lo que diga el otro).
  antes: (ruta: string) => Response | undefined
  despues: (ruta: string) => Response | undefined
  // La acción ya no se ofrece (el dato recargado llegó).
  yaNoSeOfrece: () => Promise<void>
}

interface Servidor {
  acciones: () => number
  accion: Compuerta
  recarga: Compuerta
  recargaFalla: { valor: boolean }
}

const montarServidor = (escenario: Escenario): Servidor => {
  const accion = compuerta()
  const recarga = compuerta()
  const recargaFalla = { valor: false }
  const estado = { fase: "antes" as "antes" | "despues", acciones: 0 }
  const fetchMock = vi.fn<typeof fetch>(async (entrada, init) => {
    const ruta = String(entrada)
    const metodo = init?.method ?? "GET"
    if (escenario.esAccion(ruta, metodo)) {
      estado.acciones += 1
      await accion.abierta
      estado.fase = "despues"
      return escenario.respuestaDeAccion()
    }
    if (metodo !== "GET") return error500()
    if (estado.fase === "despues" && escenario.esRecarga(ruta)) {
      await recarga.abierta
      if (recargaFalla.valor) return error500()
      return escenario.despues(ruta) ?? escenario.antes(ruta) ?? error500()
    }
    const propia = estado.fase === "despues" ? escenario.despues(ruta) : undefined
    return propia ?? escenario.antes(ruta) ?? error500()
  })
  vi.stubGlobal("fetch", fetchMock)
  return { acciones: () => estado.acciones, accion, recarga, recargaFalla }
}

const nuevoCliente = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

const conRutas = (ruta: string, hijos: React.ReactNode) =>
  render(
    <QueryClientProvider client={nuevoCliente()}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>{hijos}</Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const esperar = (ms: number) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))

const abrir = async (c: Compuerta) => {
  await act(async () => {
    c.abrir()
    await c.abierta
  })
}

const detalle = (maestros: { id: string; nombre: string }[]) =>
  respuestaJson(200, {
    clase: { id: CLASE_ID, nombre: "Álgebra I", descripcion: null, maestro: maestros[0], maestros },
  })

const alumnoDeClase = {
  id: ALUMNA_ID,
  nombre: "Ana López",
  email: "ana@x.mx",
  estadoPago: "al_corriente",
  accesoRestringido: false,
  origen: "manual",
  inscritoEn: "2026-10-01T15:00:00.000Z",
}

const publicacion = (comentarios: number) => ({
  id: PUB_ID,
  tipo: "anuncio",
  titulo: null,
  texto: "Texto de la publicación",
  autor: { id: LUIS.id, nombre: LUIS.nombre, administracion: false },
  creadoEn: "2026-10-01T15:30:00.000Z",
  comentarios,
  adjuntos: [],
  puedeBorrar: true,
})

const comentario = {
  id: COM_ID,
  texto: "Texto del comentario",
  autor: { id: ALUMNA_ID, nombre: "Ana López", administracion: false },
  creadoEn: "2026-10-01T16:30:00.000Z",
  propio: false,
  puedeBorrar: true,
}

const esDetalle = (ruta: string) => ruta === `/api/clases/${CLASE_ID}`
const esCodigo = (ruta: string) => ruta === `/api/clases/${CLASE_ID}/codigo`
const esCandidatosDeMaestros = (ruta: string) => ruta.startsWith("/api/admin/maestros/candidatos")
const esRoster = (ruta: string) =>
  ruta.startsWith(`/api/clases/${CLASE_ID}/alumnos?`) || ruta === `/api/clases/${CLASE_ID}/alumnos`
const esCandidatosDeAlumnos = (ruta: string) =>
  ruta.startsWith(`/api/clases/${CLASE_ID}/alumnos/candidatos`)
const esMuro = (ruta: string) =>
  ruta.startsWith(`/api/clases/${CLASE_ID}/publicaciones`) && !ruta.includes("/comentarios")
const esComentarios = (ruta: string) => ruta.includes(`/publicaciones/${PUB_ID}/comentarios`)

const ESCENARIOS: Escenario[] = [
  {
    nombre: "«Asignar a la clase» (maestros)",
    aviso: "Asignaste a María Gómez",
    montar: () =>
      conRutas(
        `/admin/clases/${CLASE_ID}/maestros`,
        <Route path="/admin/clases/:claseId" element={<ClaseLayout />}>
          <Route path="maestros" element={<MaestrosDeClaseView />} />
        </Route>,
      ),
    llegarAlBoton: async () => {
      await screen.findByRole("heading", { name: "Maestros de la clase" })
      fireEvent.change(screen.getByLabelText("Buscar maestro por nombre"), {
        target: { value: "Mari" },
      })
      return screen.findByRole("button", { name: "Asignar a la clase María Gómez" })
    },
    esAccion: (r, m) => r === `/api/admin/clases/${CLASE_ID}/maestros` && m === "POST",
    respuestaDeAccion: () => respuestaJson(200, { maestros: [LUIS, MARIA] }),
    esRecarga: esDetalle,
    antes: (r) => {
      if (esDetalle(r)) return detalle([LUIS])
      if (esCodigo(r)) return respuestaJson(200, { codigo: "ABCDEFG" })
      if (esCandidatosDeMaestros(r))
        return respuestaJson(200, { candidatos: [MARIA], hayMas: false })
      return undefined
    },
    despues: (r) => (esDetalle(r) ? detalle([LUIS, MARIA]) : undefined),
    yaNoSeOfrece: async () => {
      await screen.findByText("La clase ya tiene 2 maestros. Quita a uno para asignar a otro.")
    },
  },
  {
    nombre: "«Sí, quitar» (maestros)",
    aviso: "Quitaste a Luis Pérez de la clase",
    montar: () =>
      conRutas(
        `/admin/clases/${CLASE_ID}/maestros`,
        <Route path="/admin/clases/:claseId" element={<ClaseLayout />}>
          <Route path="maestros" element={<MaestrosDeClaseView />} />
        </Route>,
      ),
    llegarAlBoton: async () => {
      fireEvent.click(await screen.findByRole("button", { name: "Quitar Luis Pérez" }))
      return screen.getByRole("button", { name: "Sí, quitar Luis Pérez" })
    },
    esAccion: (r, m) => r === `/api/admin/clases/${CLASE_ID}/maestros/${LUIS.id}` && m === "DELETE",
    respuestaDeAccion: () => respuestaJson(200, { maestros: [MARIA] }),
    esRecarga: esDetalle,
    antes: (r) => {
      if (esDetalle(r)) return detalle([LUIS, MARIA])
      if (esCodigo(r)) return respuestaJson(200, { codigo: "ABCDEFG" })
      return undefined
    },
    despues: (r) => (esDetalle(r) ? detalle([MARIA]) : undefined),
    yaNoSeOfrece: async () => {
      await screen.findByText(
        "Una clase necesita al menos un maestro. Asigna a otro antes de quitar a este.",
      )
    },
  },
  {
    nombre: "«Agregar a la clase» (roster)",
    aviso: "Agregaste a Ana López",
    montar: () =>
      conRutas(
        `/maestro/clases/${CLASE_ID}/alumnos`,
        <Route path="/maestro/clases/:claseId/alumnos" element={<AlumnosView />} />,
      ),
    llegarAlBoton: async () => {
      fireEvent.change(await screen.findByLabelText("Buscar alumno por nombre"), {
        target: { value: "ana" },
      })
      return screen.findByRole("button", { name: "Agregar a la clase Ana López" })
    },
    esAccion: (r, m) => r === `/api/clases/${CLASE_ID}/alumnos` && m === "POST",
    respuestaDeAccion: () =>
      respuestaJson(200, { alumno: { id: ALUMNA_ID, nombre: "Ana López" }, yaEstaba: false }),
    esRecarga: esCandidatosDeAlumnos,
    antes: (r) => {
      if (esCandidatosDeAlumnos(r)) {
        return respuestaJson(200, {
          candidatos: [
            {
              id: ALUMNA_ID,
              nombre: "Ana López",
              correoEnmascarado: "an***@x.mx",
              yaInscrito: false,
            },
          ],
          hayMas: false,
        })
      }
      if (esRoster(r)) return respuestaJson(200, { alumnos: [], total: 0, siguienteCursor: null })
      return undefined
    },
    despues: (r) => {
      if (esCandidatosDeAlumnos(r)) {
        return respuestaJson(200, {
          candidatos: [
            {
              id: ALUMNA_ID,
              nombre: "Ana López",
              correoEnmascarado: "an***@x.mx",
              yaInscrito: true,
            },
          ],
          hayMas: false,
        })
      }
      if (esRoster(r)) {
        return respuestaJson(200, { alumnos: [alumnoDeClase], total: 1, siguienteCursor: null })
      }
      return undefined
    },
    yaNoSeOfrece: async () => {
      await screen.findByText("Ya está en la clase")
    },
  },
  {
    nombre: "«Sí, quitar» (roster)",
    aviso: "Quitaste a Ana López de la clase",
    montar: () =>
      conRutas(
        `/maestro/clases/${CLASE_ID}/alumnos`,
        <Route path="/maestro/clases/:claseId/alumnos" element={<AlumnosView />} />,
      ),
    llegarAlBoton: async () => {
      fireEvent.click(await screen.findByRole("button", { name: "Quitar Ana López" }))
      return screen.getByRole("button", { name: "Sí, quitar Ana López" })
    },
    esAccion: (r, m) => r === `/api/clases/${CLASE_ID}/alumnos/${ALUMNA_ID}` && m === "DELETE",
    respuestaDeAccion: sinContenido,
    esRecarga: esRoster,
    antes: (r) =>
      esRoster(r)
        ? respuestaJson(200, { alumnos: [alumnoDeClase], total: 1, siguienteCursor: null })
        : undefined,
    despues: (r) =>
      esRoster(r)
        ? respuestaJson(200, { alumnos: [], total: 0, siguienteCursor: null })
        : undefined,
    yaNoSeOfrece: async () => {
      await screen.findByText(
        "Aún no hay alumnos. Comparte el código de la clase o búscalos arriba.",
      )
    },
  },
  {
    nombre: "«Sí, borrar» (publicación)",
    aviso: "Publicación borrada",
    montar: () =>
      conRutas(
        `/maestro/clases/${CLASE_ID}`,
        <Route path="/maestro/clases/:claseId" element={<MuroView />} />,
      ),
    llegarAlBoton: async () => {
      fireEvent.click(await screen.findByRole("button", { name: "Borrar publicación" }))
      return screen.getByRole("button", { name: "Sí, borrar" })
    },
    esAccion: (r, m) => r === `/api/clases/${CLASE_ID}/publicaciones/${PUB_ID}` && m === "DELETE",
    respuestaDeAccion: sinContenido,
    esRecarga: esMuro,
    antes: (r) =>
      esMuro(r)
        ? respuestaJson(200, { publicaciones: [publicacion(0)], siguienteCursor: null })
        : undefined,
    despues: (r) =>
      esMuro(r) ? respuestaJson(200, { publicaciones: [], siguienteCursor: null }) : undefined,
    yaNoSeOfrece: async () => {
      await waitFor(() => expect(screen.queryByText("Texto de la publicación")).toBeNull())
    },
  },
  {
    nombre: "«Sí, borrar comentario»",
    aviso: "Comentario borrado",
    montar: () =>
      conRutas(
        `/maestro/clases/${CLASE_ID}`,
        <Route path="/maestro/clases/:claseId" element={<MuroView />} />,
      ),
    llegarAlBoton: async () => {
      fireEvent.click(await screen.findByRole("button", { name: "Ver comentarios (1)" }))
      const fila = (await screen.findByText("Texto del comentario")).closest("li")
      if (!fila) throw new Error("Precondición: el comentario no está en un <li>")
      fireEvent.click(within(fila).getByRole("button", { name: "Borrar" }))
      return within(fila).getByRole("button", { name: "Sí, borrar comentario" })
    },
    esAccion: (r, m) =>
      r === `/api/clases/${CLASE_ID}/publicaciones/${PUB_ID}/comentarios/${COM_ID}` &&
      m === "DELETE",
    respuestaDeAccion: sinContenido,
    esRecarga: esComentarios,
    antes: (r) => {
      if (esComentarios(r))
        return respuestaJson(200, { comentarios: [comentario], siguienteCursor: null })
      if (esMuro(r))
        return respuestaJson(200, { publicaciones: [publicacion(1)], siguienteCursor: null })
      return undefined
    },
    despues: (r) => {
      if (esComentarios(r)) return respuestaJson(200, { comentarios: [], siguienteCursor: null })
      if (esMuro(r))
        return respuestaJson(200, { publicaciones: [publicacion(0)], siguienteCursor: null })
      return undefined
    },
    yaNoSeOfrece: async () => {
      await waitFor(() => expect(screen.queryByText("Texto del comentario")).toBeNull())
    },
  },
]

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.mockClear()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

const avisosDe = (texto: string) =>
  [...aviso.success.mock.calls, ...aviso.mock.calls].filter(([t]) => t === texto).length

describe("ataque CLASES-02c r2: la ventana entre el 200 y la recarga, en los hermanos de T-02", () => {
  // CLASES-02c ronda 3 (arbitraje del manager de la ronda 2, T-03 decisión (b), revision.md): el
  // patrón «0 ms» sin repintado entre los dos clics no se exige a estas acciones idempotentes
  // (DESIGN.md §6, punto 4: el candado síncrono es para efectos que no se repiten sin daño). Se
  // reescribe como el segundo clic inmediato después del repintado, con el botón ya en espera
  // (aria-busy): una sola petición y un solo aviso.
  const PATRONES = [
    "0 ms tras el repintado (botón ya en espera)",
    "30 ms",
    "después del 200",
  ] as const
  const casos = ESCENARIOS.flatMap((escenario) =>
    PATRONES.map((patron) => [escenario.nombre, patron, escenario] as const),
  )

  it.each(casos)(
    "%s, segundo clic a %s: una sola petición, un solo aviso, el botón en espera (aria-busy, sin disabled) y el foco fuera de <body>",
    async (_nombre, patron, escenario) => {
      const servidor = montarServidor(escenario)
      escenario.montar()
      const boton = await escenario.llegarAlBoton()
      act(() => boton.focus())

      fireEvent.click(boton)
      if (patron === "0 ms tras el repintado (botón ya en espera)") {
        await waitFor(() => expect(boton).toHaveAttribute("aria-busy", "true"))
        expect(boton).not.toHaveAttribute("disabled")
        fireEvent.click(boton)
      }
      if (patron === "30 ms") {
        await esperar(30)
        fireEvent.click(boton)
      }
      await abrir(servidor.accion)
      if (patron === "después del 200") {
        // CLASES-02 ronda 0 de 02d (O-10, "Arbitraje — ronda 2 de 02c" en revision.md): el aviso de
        // «Sí, quitar» del roster pasa al onSuccess de useQuitarAlumno, antes de esperar la recarga,
        // como en sus cinco hermanos; ya no hay un escenario con el aviso al terminar la recarga.
        await waitFor(() => expect(avisosDe(escenario.aviso)).toBe(1))
        await esperar(30)
        expect(boton.isConnected, "el botón desapareció antes de la recarga").toBe(true)
        expect(boton).toHaveAttribute("aria-busy", "true")
        expect(boton).not.toHaveAttribute("disabled")
        fireEvent.click(boton)
        await esperar(30)
      }
      await abrir(servidor.recarga)
      await escenario.yaNoSeOfrece()
      await esperar(60)

      expect({
        peticiones: servidor.acciones(),
        avisos: avisosDe(escenario.aviso),
        errores: aviso.error.mock.calls.length,
      }).toEqual({ peticiones: 1, avisos: 1, errores: 0 })
      expect(document.activeElement, "el foco quedó en <body>").not.toBe(document.body)
    },
  )
})

describe("ataque CLASES-02c r2: la recarga falla después del 200", () => {
  it.each(ESCENARIOS.map((escenario) => [escenario.nombre, escenario] as const))(
    "%s: la mutación termina (el botón no queda en espera), un solo aviso de éxito, ninguno de error repetido, y la consulta recargada muestra su error",
    async (_nombre, escenario) => {
      const servidor = montarServidor(escenario)
      servidor.recargaFalla.valor = true
      escenario.montar()
      const boton = await escenario.llegarAlBoton()
      act(() => boton.focus())
      fireEvent.click(boton)
      await abrir(servidor.accion)
      await abrir(servidor.recarga)
      expect(await screen.findByText("Algo salió mal. Inténtalo de nuevo.")).toBeInTheDocument()
      await esperar(60)
      expect(
        boton.isConnected && boton.getAttribute("aria-busy") === "true",
        "la mutación quedó colgada",
      ).toBe(false)
      expect({
        peticiones: servidor.acciones(),
        avisos: avisosDe(escenario.aviso),
        errores: aviso.error.mock.calls.length,
      }).toEqual({ peticiones: 1, avisos: 1, errores: 0 })
      expect(document.activeElement, "el foco quedó en <body>").not.toBe(document.body)
    },
  )
})

describe("ataque CLASES-02c r2: «Unirme a la clase» con la recarga lenta o fallida", () => {
  const ME = {
    id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
    nombre: "Ana López",
    email: "ana@ejemplo.mx",
    rol: "estudiante",
    debeCambiarContrasena: false,
    accesoRestringido: false,
  }

  const montar = (recargaFalla: boolean) => {
    const accion = compuerta()
    const recarga = compuerta()
    const estado = { fase: "antes" as "antes" | "despues", posts: 0 }
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (entrada, init) => {
        const ruta = String(entrada)
        if (ruta === "/api/me") return respuestaJson(200, ME)
        if (ruta === "/api/clases/unirse" && init?.method === "POST") {
          estado.posts += 1
          await accion.abierta
          estado.fase = "despues"
          return respuestaJson(200, {
            clase: { id: CLASE_ID, nombre: "Álgebra I" },
            yaEstabas: false,
          })
        }
        if (ruta.startsWith("/api/clases/inscritas")) {
          if (estado.fase === "antes") {
            return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
          }
          await recarga.abierta
          if (recargaFalla) return error500()
          return respuestaJson(200, {
            clases: [
              {
                id: CLASE_ID,
                nombre: "Álgebra I",
                maestro: { nombre: "L" },
                maestros: [{ nombre: "L" }],
              },
            ],
            total: 1,
            siguienteCursor: null,
          })
        }
        return error500()
      }),
    )
    const router = createMemoryRouter(
      [
        { path: "/estudiante", element: <InicioEstudianteView /> },
        { path: "/estudiante/clases/:claseId", element: <p>dentro de la clase</p> },
      ],
      { initialEntries: ["/estudiante"] },
    )
    const navegaciones: string[] = []
    router.subscribe((estadoRouter) => {
      if (estadoRouter.navigation.state === "idle")
        navegaciones.push(estadoRouter.location.pathname)
    })
    render(
      <QueryClientProvider client={nuevoCliente()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    return { accion, recarga, estado, router, navegaciones }
  }

  it.each([
    ["lenta", false],
    ["que falla", true],
  ] as const)(
    "con la recarga %s: navega una sola vez y solo al terminar; el botón espera y un clic más no manda otro POST; un solo aviso",
    async (_caso, falla) => {
      const { accion, recarga, estado, router, navegaciones } = montar(falla)
      fireEvent.change(await screen.findByLabelText("Código de la clase"), {
        target: { value: "abcd-efg" },
      })
      const boton = screen.getByRole("button", { name: "Unirme a la clase" })
      act(() => boton.focus())
      fireEvent.click(boton)
      await esperar(30)
      fireEvent.click(boton)
      await abrir(accion)
      await esperar(50)
      expect(router.state.location.pathname, "navegó antes de terminar la recarga").toBe(
        "/estudiante",
      )
      expect(boton).toHaveAttribute("aria-busy", "true")
      expect(boton).not.toHaveAttribute("disabled")
      fireEvent.click(boton)
      await abrir(recarga)
      await waitFor(() =>
        expect(router.state.location.pathname).toBe(`/estudiante/clases/${CLASE_ID}`),
      )
      await esperar(50)
      expect({
        posts: estado.posts,
        navegaciones: navegaciones.filter((p) => p === `/estudiante/clases/${CLASE_ID}`).length,
        avisos: avisosDe("Te uniste a Álgebra I"),
        errores: aviso.error.mock.calls.length,
      }).toEqual({ posts: 1, navegaciones: 1, avisos: 1, errores: 0 })
    },
  )
})
