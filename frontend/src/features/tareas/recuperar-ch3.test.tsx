import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { CrearTareaView } from "./crear-tarea-view"
import { DetalleTareaView } from "./detalle-tarea-view"
import { EditarTareaView } from "./editar-tarea-view"
import { EntregaDeAlumnoView } from "./entrega-de-alumno-view"

// CHORE-03 (03a, S-06 a): la frase "Algo salió mal. Inténtalo de nuevo." en un ErrorDeCampo (un campo
// pintado con un VALIDACION sin texto visible) pide repetir el envío. Caminos: repetir el control en
// cada formulario de tareas, e ir a otra sección y regresar antes del staleTime con el router real
// (rutas de app/router) y Providers. "Pulsar la sección activa" no aplica a un error de envío (S-06).
// Reloj fijo (solo Date). El servidor es un doble en memoria.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
const FECHA_LOCAL = "2030-01-15T10:00"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const ALUMNO_ID = "9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0301"
const CRITERIO_1 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d81"
const CRITERIO_2 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d82"
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const RUTA_CLASE = `/api/clases/${CLASE_ID}`
const RUTA_TAREA = `${RUTA_CLASE}/tareas/${TAREA_ID}`
const RUTA_MI_ENTREGA = `${RUTA_TAREA}/entrega`
const RUTA_ALUMNO = `${RUTA_TAREA}/entregas/${ALUMNO_ID}`
const RUTA_CALIFICACION = `${RUTA_ALUMNO}/calificacion`
const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const CLARIDAD = "Claridad (de 5 puntos)"
const ORTOGRAFIA = "Ortografía (de 4 puntos)"
const COMENTARIO = "Comentario para el alumno (opcional)"
const ENLACE = "https://ejemplo.com/mi-trabajo"
const uuid = (n: number) => `9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c${String(n).padStart(4, "0")}`

const tareaDoble = () => ({
  tarea: {
    id: TAREA_ID,
    titulo: "Ensayo final",
    instrucciones: "",
    fechaLimite: FUTURA,
    puntos: 10,
    aceptaTardias: true,
    requiereAdjuntos: true,
    version: 0,
    categoria: null,
    tema: null,
    rubrica: [
      { id: CRITERIO_1, criterio: "Claridad", puntosMax: 5 },
      { id: CRITERIO_2, criterio: "Ortografía", puntosMax: 4 },
    ],
    adjuntos: [],
    autor: { id: uuid(1), nombre: "Luis Pérez", administracion: false },
    creadoEn: "2030-01-01T15:30:00.000Z",
    actualizadoEn: "2030-01-01T15:30:00.000Z",
    puedeEditar: true,
    puedeBorrar: true,
  },
})

const miEntrega = (entregada: boolean) => ({
  estado: entregada ? "entregado" : "asignado",
  fechaEntrega: entregada ? AHORA.toISOString() : null,
  conRetraso: false,
  enlaces: entregada ? [ENLACE] : [],
  adjuntos: [],
  puedeEntregar: !entregada,
  puedeAnular: entregada,
  calificacion: null,
})

const entregaDeAlumno = (calificada: boolean) => ({
  alumno: { id: ALUMNO_ID, nombre: "Ana Ruiz" },
  estado: calificada ? "calificado" : "entregado",
  fechaEntrega: "2030-01-09T15:30:00.000Z",
  conRetraso: false,
  enlaces: [],
  adjuntos: [],
  version: calificada ? 3 : 2,
  calificacion: calificada
    ? {
        puntos: 7,
        sobre: 10,
        fecha: AHORA.toISOString(),
        puntajes: [
          { criterioId: CRITERIO_1, criterio: "Claridad", puntosMax: 5, puntos: 4 },
          { criterioId: CRITERIO_2, criterio: "Ortografía", puntosMax: 4, puntos: 3 },
        ],
      }
    : null,
})

const comentarioDoble = (texto: string) => ({
  comentario: {
    id: uuid(150),
    texto,
    autor: { id: uuid(2), nombre: "Ana Ruiz", administracion: false },
    creadoEn: AHORA.toISOString(),
    propio: true,
  },
})

const elementoDeLaTarea = {
  id: TAREA_ID,
  tipo: "tarea",
  titulo: "Ensayo final",
  autor: { id: uuid(1), nombre: "Luis Pérez", administracion: false },
  creadoEn: "2030-01-01T15:30:00.000Z",
  material: null,
  tarea: { fechaLimite: FUTURA, puntos: 10 },
  puedeMover: false,
  entrega: { estado: "asignado", conRetraso: false },
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const validacion = (mensaje: string) =>
  respuestaJson(400, { error: { codigo: "VALIDACION", mensaje } })

interface Llamada {
  metodo: string
  url: string
}

let esLaPeticion: (llamada: Llamada) => boolean = () => false
let respuestas: (() => Response)[] = []
let entregada = false
let calificada = false
let llamadas: Llamada[] = []
let inesperadas: string[] = []

const instalarServidor = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const ruta = String(entrada)
      const metodo = init?.method ?? "GET"
      const url = new URL(ruta, "http://local")
      llamadas.push({ metodo, url: ruta })
      if (esLaPeticion({ metodo, url: ruta })) {
        const siguiente = respuestas.shift()
        if (siguiente !== undefined) return Promise.resolve(siguiente())
      }
      if (ruta === "/api/auth/refrescar") {
        return Promise.resolve(respuestaJson(200, { tokenAcceso: "restaurado" }))
      }
      if (ruta === "/api/me") {
        return Promise.resolve(
          respuestaJson(200, {
            id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
            nombre: "Ana Ruiz",
            email: "ana@ejemplo.mx",
            rol: "estudiante",
            debeCambiarContrasena: false,
            accesoRestringido: false,
          }),
        )
      }
      if (url.pathname === "/api/clases/inscritas") {
        return Promise.resolve(
          respuestaJson(200, {
            clases: [{ id: CLASE_ID, nombre: "Álgebra I", maestro: MAESTRO, maestros: [MAESTRO] }],
            total: 1,
            siguienteCursor: null,
          }),
        )
      }
      if (metodo === "GET" && ruta === RUTA_CLASE) {
        return Promise.resolve(
          respuestaJson(200, {
            clase: {
              id: CLASE_ID,
              nombre: "Álgebra I",
              descripcion: null,
              maestro: MAESTRO,
              maestros: [MAESTRO],
            },
          }),
        )
      }
      if (metodo === "GET" && ruta === RUTA_TAREA) {
        return Promise.resolve(respuestaJson(200, tareaDoble()))
      }
      if (metodo === "GET" && ruta === `${RUTA_CLASE}/categorias`) {
        return Promise.resolve(respuestaJson(200, { categorias: [] }))
      }
      if (metodo === "GET" && ruta === `${RUTA_CLASE}/temas`) {
        return Promise.resolve(respuestaJson(200, { temas: [], sinTema: 1 }))
      }
      if (metodo === "GET" && url.pathname === `${RUTA_CLASE}/trabajo`) {
        return Promise.resolve(
          respuestaJson(200, { elementos: [elementoDeLaTarea], siguienteCursor: null }),
        )
      }
      if (metodo === "GET" && ruta === RUTA_MI_ENTREGA) {
        return Promise.resolve(respuestaJson(200, { entrega: miEntrega(entregada) }))
      }
      if (metodo === "GET" && ruta === RUTA_ALUMNO) {
        return Promise.resolve(respuestaJson(200, { entrega: entregaDeAlumno(calificada) }))
      }
      if (metodo === "GET" && ruta.includes("/comentarios?")) {
        return Promise.resolve(respuestaJson(200, { comentarios: [], siguienteCursor: null }))
      }
      if (metodo === "POST" && ruta === `${RUTA_CLASE}/tareas`) {
        return Promise.resolve(respuestaJson(201, tareaDoble()))
      }
      if (metodo === "PUT" && ruta === RUTA_TAREA) {
        return Promise.resolve(respuestaJson(200, tareaDoble()))
      }
      if (metodo === "POST" && ruta === RUTA_MI_ENTREGA) {
        entregada = true
        return Promise.resolve(respuestaJson(200, { entrega: miEntrega(true) }))
      }
      if (metodo === "POST" && ruta.endsWith("/comentarios")) {
        return Promise.resolve(respuestaJson(201, comentarioDoble("Tengo una duda")))
      }
      if (metodo === "PUT" && ruta === RUTA_CALIFICACION) {
        calificada = true
        return Promise.resolve(respuestaJson(200, { entrega: entregaDeAlumno(true) }))
      }
      inesperadas.push(`${metodo} ${ruta}`)
      return Promise.resolve(validacion("no esperada"))
    }),
  )
}

beforeAll(async () => {
  await import("@/app/router")
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  esLaPeticion = () => false
  respuestas = []
  entregada = false
  calificada = false
  llamadas = []
  inesperadas = []
  instalarServidor()
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

const escribir = (etiqueta: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })

const erroresDeCampo = () =>
  Array.from(document.querySelectorAll("[id]"))
    .filter((elemento) => /-(error|vacia)(-servidor)?$/.test(elemento.id))
    .map((elemento) => (elemento.textContent ?? "").trim())

const avisos = () => aviso.error.mock.calls.map((llamada) => String(llamada[0]))
const exitos = () => aviso.success.mock.calls.map((llamada) => String(llamada[0]))

// La única función de montaje con rutas de prueba; el camino de las secciones usa `rutas`.
const montar = (ruta: string) => {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/maestro/clases/:claseId/tareas/nueva" element={<CrearTareaView />} />
          <Route
            path="/maestro/clases/:claseId/tareas/:tareaId/editar"
            element={<EditarTareaView />}
          />
          <Route
            path="/maestro/clases/:claseId/tareas/:tareaId"
            element={<p>Pantalla del detalle</p>}
          />
          <Route
            path="/maestro/clases/:claseId/tareas/:tareaId/entregas/:alumnoId"
            element={<EntregaDeAlumnoView />}
          />
          <Route
            path="/estudiante/clases/:claseId/tareas/:tareaId"
            element={<DetalleTareaView />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

interface Formulario {
  nombre: string
  ruta: string
  listo: () => Promise<unknown>
  llenar: () => void
  boton: () => HTMLElement
  envio: (llamada: Llamada) => boolean
  prefijo: string
  // Lo que se ve cuando el segundo envío responde bien.
  bien: () => Promise<void>
}

const FORMULARIOS: readonly Formulario[] = [
  {
    nombre: "crear tarea",
    ruta: `/maestro/clases/${CLASE_ID}/tareas/nueva`,
    listo: () => screen.findByLabelText("Título"),
    llenar: () => {
      escribir("Título", "Ensayo")
      escribir("Fecha límite", FECHA_LOCAL)
    },
    boton: () => screen.getByRole("button", { name: "Publicar tarea" }),
    envio: ({ metodo, url }) => metodo === "POST" && url === `${RUTA_CLASE}/tareas`,
    prefijo: "titulo",
    bien: async () => {
      expect(await screen.findByText("Pantalla del detalle")).toBeInTheDocument()
      expect(exitos()).toEqual(["Tarea publicada"])
    },
  },
  {
    nombre: "editar tarea",
    ruta: `/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}/editar`,
    listo: () => screen.findByDisplayValue("Ensayo final"),
    llenar: () => escribir("Título", "Ensayo corregido"),
    boton: () => screen.getByRole("button", { name: "Guardar cambios" }),
    envio: ({ metodo, url }) => metodo === "PUT" && url === RUTA_TAREA,
    prefijo: "titulo",
    bien: async () => {
      expect(await screen.findByText("Pantalla del detalle")).toBeInTheDocument()
      expect(exitos()).toEqual(["Cambios guardados"])
    },
  },
  {
    nombre: "entregar",
    ruta: `/estudiante/clases/${CLASE_ID}/tareas/${TAREA_ID}`,
    listo: () => screen.findByRole("button", { name: "Entregar tarea" }),
    llenar: () => {
      escribir("Enlace", ENLACE)
      fireEvent.click(screen.getByRole("button", { name: "Agregar enlace" }))
    },
    boton: () => screen.getByRole("button", { name: "Entregar tarea" }),
    envio: ({ metodo, url }) => metodo === "POST" && url === RUTA_MI_ENTREGA,
    prefijo: "enlaces.0",
    bien: async () => {
      await waitFor(() => expect(exitos()).toEqual(["Tarea entregada"]))
      expect(await screen.findByRole("button", { name: "Anular entrega" })).toBeInTheDocument()
    },
  },
  {
    nombre: "comentario privado del alumno",
    ruta: `/estudiante/clases/${CLASE_ID}/tareas/${TAREA_ID}`,
    listo: () => screen.findByLabelText("Comentario privado"),
    llenar: () => escribir("Comentario privado", "Tengo una duda"),
    boton: () => screen.getByRole("button", { name: "Enviar comentario" }),
    envio: ({ metodo, url }) => metodo === "POST" && url === `${RUTA_MI_ENTREGA}/comentarios`,
    prefijo: "texto",
    // Comentar no tiene aviso de éxito: el campo se vacía.
    bien: async () => {
      await waitFor(() => expect(screen.getByLabelText("Comentario privado")).toHaveValue(""))
      expect(exitos()).toEqual([])
    },
  },
  {
    nombre: "comentario privado del maestro",
    ruta: `/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}/entregas/${ALUMNO_ID}`,
    listo: () => screen.findByLabelText("Comentario privado"),
    llenar: () => escribir("Comentario privado", "Revisa la conclusión"),
    boton: () => screen.getByRole("button", { name: "Enviar comentario" }),
    envio: ({ metodo, url }) => metodo === "POST" && url === `${RUTA_ALUMNO}/comentarios`,
    prefijo: "texto",
    bien: async () => {
      await waitFor(() => expect(screen.getByLabelText("Comentario privado")).toHaveValue(""))
      expect(exitos()).toEqual([])
    },
  },
  {
    nombre: "panel de calificación",
    ruta: `/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}/entregas/${ALUMNO_ID}`,
    listo: () => screen.findByLabelText(COMENTARIO),
    llenar: () => {
      escribir(CLARIDAD, "4")
      escribir(ORTOGRAFIA, "3")
      escribir(COMENTARIO, "Buen trabajo")
    },
    boton: () => screen.getByRole("button", { name: "Calificar y devolver" }),
    envio: ({ metodo, url }) => metodo === "PUT" && url === RUTA_CALIFICACION,
    prefijo: "comentario",
    bien: async () => {
      await waitFor(() => expect(exitos()).toEqual(["Calificación publicada"]))
    },
  },
]

describe("CHORE-03 · la frase genérica en un ErrorDeCampo: repetir el control", () => {
  it.each(FORMULARIOS)(
    "CH3-A18: $nombre tras F2: el mismo botón manda una petición nueva y, si responde bien, el ErrorDeCampo desaparece",
    async (formulario) => {
      esLaPeticion = formulario.envio
      respuestas = [() => validacion(`${formulario.prefijo}:   `)]
      montar(formulario.ruta)
      await formulario.listo()
      await reposar()
      formulario.llenar()

      fireEvent.click(formulario.boton())
      await waitFor(() => expect(erroresDeCampo()).toEqual([GENERICO]))
      await reposar()
      expect(avisos()).toEqual([])
      expect(llamadas.filter(formulario.envio)).toHaveLength(1)

      fireEvent.click(formulario.boton())
      await waitFor(() => expect(llamadas.filter(formulario.envio)).toHaveLength(2))
      await formulario.bien()
      await reposar()

      expect(erroresDeCampo()).toEqual([])
      expect(screen.queryByText(GENERICO)).not.toBeInTheDocument()
      expect(avisos()).toEqual([])
      expect(inesperadas).toEqual([])
    },
  )
})

describe("CHORE-03 · la frase genérica en un ErrorDeCampo: otra sección y regreso (rutas y Providers)", () => {
  it("CH3-A19: con el genérico bajo el comentario del alumno, ir a «Trabajo de clase» y volver al detalle antes de 30 s quita el error y «Enviar comentario» manda un POST nuevo", async () => {
    const { rutas } = await import("@/app/router")
    const esElComentario = ({ metodo, url }: Llamada) =>
      metodo === "POST" && url === `${RUTA_MI_ENTREGA}/comentarios`
    esLaPeticion = esElComentario
    respuestas = [() => validacion("texto:\u{200B}")]
    const router = createMemoryRouter(rutas, {
      initialEntries: [`/estudiante/clases/${CLASE_ID}/tareas/${TAREA_ID}`],
    })
    render(
      <Providers>
        <RouterProvider router={router} />
      </Providers>,
    )
    await screen.findByLabelText("Comentario privado")
    await reposar()
    escribir("Comentario privado", "Tengo una duda")
    fireEvent.click(screen.getByRole("button", { name: "Enviar comentario" }))
    await waitFor(() => expect(erroresDeCampo()).toEqual([GENERICO]))

    const secciones = await screen.findByRole("list", { name: "Secciones de la clase" })
    fireEvent.click(within(secciones).getByRole("link", { name: /Trabajo de clase/ }))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/\/trabajo$/))
    expect(await screen.findByText("Ensayo final")).toBeInTheDocument()
    vi.setSystemTime(new Date(AHORA.getTime() + 10_000))
    await act(async () => {
      await router.navigate(-1)
    })
    await screen.findByLabelText("Comentario privado")
    await reposar()

    expect(erroresDeCampo()).toEqual([])
    expect(screen.queryByText(GENERICO)).not.toBeInTheDocument()
    escribir("Comentario privado", "Tengo una duda")
    fireEvent.click(screen.getByRole("button", { name: "Enviar comentario" }))
    await waitFor(() => expect(llamadas.filter(esElComentario)).toHaveLength(2))
    await waitFor(() => expect(screen.getByLabelText("Comentario privado")).toHaveValue(""))
    await reposar()
    expect(erroresDeCampo()).toEqual([])
    expect(avisos()).toEqual([])
    expect(inesperadas).toEqual([])
  })
})
