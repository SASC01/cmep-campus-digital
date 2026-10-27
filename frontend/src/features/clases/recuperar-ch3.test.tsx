import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { EditorDeCategorias } from "./components/editor-de-categorias"
import { FormularioClase } from "./components/formulario-clase"
import { FormularioComentario } from "./components/formulario-comentario"
import { FormularioPublicacion } from "./components/formulario-publicacion"
import { FormularioTema } from "./components/formulario-tema"
import { FormularioUnirseClase } from "./components/formulario-unirse-clase"
import {
  TEXTOS_BUSCADOR_MAESTROS,
  TEXTOS_CATEGORIAS,
  TEXTOS_CLASE,
  TEXTOS_COMENTARIOS,
  TEXTOS_FORMULARIO_CLASE,
  TEXTOS_FORMULARIO_PUBLICACION,
  TEXTOS_TEMAS,
  TEXTOS_TRABAJO,
  TEXTOS_UNIRSE,
} from "./data"

// CHORE-03 (03b, S-06 a): la frase "Algo salió mal. Inténtalo de nuevo." en un ErrorDeCampo (un campo
// pintado con un VALIDACION sin texto visible) pide repetir el envío. Caminos: repetir el control en
// cada formulario de features/clases, e ir a otra sección y regresar antes del staleTime con el router
// real (rutas de app/router) y Providers, en el formulario de tema de "Trabajo de clase". "Pulsar la
// sección activa" no aplica a un error de envío (S-06). Reloj fijo (solo Date). El servidor es un doble
// en memoria.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const PUBLICACION_ID = "5a5b3c4d-1c1f-4b8e-9a1e-000000000001"
const TEMA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d31"
const CATEGORIA_ID = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d41"
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const AUTOR = { ...MAESTRO, administracion: false }
const RUTA_CLASE = `/api/clases/${CLASE_ID}`

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const validacion = (mensaje: string) =>
  respuestaJson(400, { error: { codigo: "VALIDACION", mensaje } })

const claseDoble = {
  clase: {
    id: CLASE_ID,
    nombre: "Álgebra I",
    descripcion: null,
    maestro: MAESTRO,
    maestros: [MAESTRO],
  },
}

const temaDoble = (nombre: string) => ({ tema: { id: TEMA_ID, nombre, orden: 0, elementos: 0 } })

const publicacionDoble = {
  publicacion: {
    id: PUBLICACION_ID,
    tipo: "anuncio",
    titulo: null,
    texto: "Mañana hay examen",
    autor: AUTOR,
    creadoEn: AHORA.toISOString(),
    comentarios: 0,
    tarea: null,
    adjuntos: [],
    puedeBorrar: true,
  },
}

interface Llamada {
  metodo: string
  url: string
  cuerpo: string | null
}

let esLaPeticion: (llamada: Llamada) => boolean = () => false
let respuestas: (() => Response)[] = []
let temas: { id: string; nombre: string; orden: number; elementos: number }[] = []
let llamadas: Llamada[] = []
let inesperadas: string[] = []
let rolDeSesion: "maestro" | "admin" = "maestro"

// Lo que el servidor responde bien, también a cada envío de los formularios.
const respuestaNormal = ({ metodo, url }: Llamada): Response | null => {
  const { pathname } = new URL(url, "http://local")
  if (pathname === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "restaurado" })
  if (pathname === "/api/me") {
    return respuestaJson(200, {
      id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
      nombre: "Luis Pérez",
      email: "luis@ejemplo.mx",
      rol: rolDeSesion,
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
  }
  if (metodo === "GET" && pathname === "/api/clases/impartidas") {
    return respuestaJson(200, {
      clases: [{ id: CLASE_ID, nombre: "Álgebra I", alumnos: 3 }],
      total: 1,
      siguienteCursor: null,
    })
  }
  if (metodo === "GET" && pathname === RUTA_CLASE) return respuestaJson(200, claseDoble)
  if (metodo === "GET" && pathname === `${RUTA_CLASE}/codigo`) {
    return respuestaJson(200, { codigo: "ABCD234" })
  }
  if (metodo === "GET" && pathname === `${RUTA_CLASE}/temas`) {
    return respuestaJson(200, { temas, sinTema: 0 })
  }
  if (metodo === "GET" && pathname === `${RUTA_CLASE}/trabajo`) {
    return respuestaJson(200, { elementos: [], siguienteCursor: null })
  }
  if (metodo === "GET" && pathname === `${RUTA_CLASE}/publicaciones`) {
    return respuestaJson(200, { publicaciones: [], siguienteCursor: null })
  }
  if (metodo === "GET" && pathname === "/api/admin/maestros/candidatos") {
    return respuestaJson(200, {
      candidatos: [{ id: MAESTRO.id, nombre: MAESTRO.nombre, email: "luis@x.mx" }],
      hayMas: false,
    })
  }
  if (metodo === "POST" && pathname === "/api/admin/clases") return respuestaJson(201, claseDoble)
  if (metodo === "PUT" && pathname === `/api/admin/clases/${CLASE_ID}`) {
    return respuestaJson(200, claseDoble)
  }
  if (metodo === "POST" && pathname === "/api/clases/unirse") {
    return respuestaJson(200, { clase: { id: CLASE_ID, nombre: "Álgebra I" }, yaEstabas: false })
  }
  if (metodo === "POST" && pathname === `${RUTA_CLASE}/publicaciones`) {
    return respuestaJson(201, publicacionDoble)
  }
  if (metodo === "POST" && pathname.endsWith("/comentarios")) {
    return respuestaJson(201, {
      comentario: {
        id: "6a6b3c4d-1c1f-4b8e-9a1e-000000000001",
        texto: "Tengo una duda",
        autor: AUTOR,
        creadoEn: AHORA.toISOString(),
        propio: true,
        puedeBorrar: true,
      },
    })
  }
  if (metodo === "POST" && pathname === `${RUTA_CLASE}/temas`) {
    temas = [{ id: TEMA_ID, nombre: "Unidad 1", orden: 0, elementos: 0 }]
    return respuestaJson(201, temaDoble("Unidad 1"))
  }
  if (metodo === "PUT" && pathname === `${RUTA_CLASE}/temas/${TEMA_ID}`) {
    return respuestaJson(200, temaDoble("Unidad 2"))
  }
  if (metodo === "PUT" && pathname === `${RUTA_CLASE}/categorias`) {
    return respuestaJson(200, {
      categorias: [{ id: CATEGORIA_ID, nombre: "Exámenes", peso: 100, tareas: 0 }],
    })
  }
  return null
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
  temas = []
  llamadas = []
  inesperadas = []
  rolDeSesion = "maestro"
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const llamada = {
        metodo: init?.method ?? "GET",
        url: String(entrada),
        cuerpo: typeof init?.body === "string" ? init.body : null,
      }
      llamadas.push(llamada)
      if (esLaPeticion(llamada)) {
        const siguiente = respuestas.shift()
        if (siguiente !== undefined) return Promise.resolve(siguiente())
      }
      const normal = respuestaNormal(llamada)
      if (normal !== null) return Promise.resolve(normal)
      inesperadas.push(`${llamada.metodo} ${llamada.url}`)
      return Promise.resolve(
        respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "no esperada" } }),
      )
    }),
  )
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

const escribir = (etiqueta: string, valor: string): void => {
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })
}

const erroresDeCampo = () =>
  Array.from(document.querySelectorAll("[id]"))
    .filter((elemento) => /-error$/.test(elemento.id))
    .map((elemento) => (elemento.textContent ?? "").trim())

const avisos = () => aviso.error.mock.calls.map((llamada) => String(llamada[0]))
const exitos = () => aviso.success.mock.calls.map((llamada) => String(llamada[0]))

// La única función de montaje sin el router de la app; el camino de las secciones usa `rutas`.
const montar = async (elemento: ReactNode) => {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter>{elemento}</MemoryRouter>
    </QueryClientProvider>,
  )
  await reposar()
}

interface Formulario {
  nombre: string
  elemento: () => ReactNode
  llenar: () => Promise<void>
  boton: string
  envio: (llamada: Llamada) => boolean
  prefijo: string
  bien: () => Promise<void>
}

const es = (metodo: string, ruta: string) => (llamada: Llamada) =>
  llamada.metodo === metodo && llamada.url === ruta

const conExito = (texto: string) => async () => {
  await waitFor(() => expect(exitos()).toEqual([texto]))
}

const NOMBRE_DE_LA_FILA = `${TEXTOS_CATEGORIAS.nombre} ${TEXTOS_CATEGORIAS.deLaFila(1)}`

const FORMULARIOS: readonly Formulario[] = [
  {
    nombre: "crear clase",
    elemento: () => <FormularioClase modo="crear" />,
    llenar: async () => {
      escribir(TEXTOS_FORMULARIO_CLASE.campoNombre, "Álgebra")
      escribir(TEXTOS_BUSCADOR_MAESTROS.campo, "Luis")
      fireEvent.click(await screen.findByRole("button", { name: "Elegir Luis Pérez" }))
    },
    boton: TEXTOS_FORMULARIO_CLASE.botonCrear,
    envio: es("POST", "/api/admin/clases"),
    prefijo: "nombre",
    bien: conExito(TEXTOS_FORMULARIO_CLASE.avisoCreada),
  },
  {
    nombre: "editar clase",
    elemento: () => (
      <FormularioClase
        modo="editar"
        claseId={CLASE_ID}
        valoresIniciales={{ nombre: "Álgebra", descripcion: null }}
      />
    ),
    llenar: async () => escribir(TEXTOS_FORMULARIO_CLASE.campoNombre, "Álgebra II"),
    boton: TEXTOS_FORMULARIO_CLASE.botonGuardar,
    envio: es("PUT", `/api/admin/clases/${CLASE_ID}`),
    prefijo: "nombre",
    bien: conExito(TEXTOS_FORMULARIO_CLASE.avisoGuardada),
  },
  {
    nombre: "unirse a una clase",
    elemento: () => <FormularioUnirseClase />,
    llenar: async () => escribir(TEXTOS_UNIRSE.campoCodigo, "ABCD234"),
    boton: TEXTOS_UNIRSE.boton,
    envio: es("POST", "/api/clases/unirse"),
    prefijo: "codigo",
    bien: conExito(TEXTOS_UNIRSE.exitoso("Álgebra I")),
  },
  {
    nombre: "publicar un anuncio",
    elemento: () => <FormularioPublicacion claseId={CLASE_ID} />,
    llenar: async () => escribir(TEXTOS_FORMULARIO_PUBLICACION.campoAnuncio, "Mañana hay examen"),
    boton: TEXTOS_FORMULARIO_PUBLICACION.publicarAnuncio,
    envio: es("POST", `${RUTA_CLASE}/publicaciones`),
    prefijo: "texto",
    bien: conExito(TEXTOS_FORMULARIO_PUBLICACION.avisoPublicado),
  },
  {
    nombre: "publicar un material",
    elemento: () => <FormularioPublicacion claseId={CLASE_ID} />,
    llenar: async () => {
      fireEvent.click(screen.getByRole("button", { name: TEXTOS_FORMULARIO_PUBLICACION.material }))
      escribir(TEXTOS_FORMULARIO_PUBLICACION.campoTitulo, "Lectura")
      escribir(TEXTOS_FORMULARIO_PUBLICACION.campoDescripcion, "Capítulo 3")
      await reposar()
    },
    boton: TEXTOS_FORMULARIO_PUBLICACION.publicarMaterial,
    envio: es("POST", `${RUTA_CLASE}/publicaciones`),
    prefijo: "texto",
    bien: conExito(TEXTOS_FORMULARIO_PUBLICACION.avisoPublicado),
  },
  {
    nombre: "comentar en el muro",
    elemento: () => <FormularioComentario claseId={CLASE_ID} publicacionId={PUBLICACION_ID} />,
    llenar: async () => escribir(TEXTOS_COMENTARIOS.campo, "Tengo una duda"),
    boton: TEXTOS_COMENTARIOS.comentar,
    envio: es("POST", `${RUTA_CLASE}/publicaciones/${PUBLICACION_ID}/comentarios`),
    prefijo: "texto",
    bien: conExito(TEXTOS_COMENTARIOS.avisoComentado),
  },
  {
    nombre: "crear un tema",
    elemento: () => <FormularioTema claseId={CLASE_ID} onTerminar={() => undefined} />,
    llenar: async () => escribir(TEXTOS_TEMAS.campoNombre, "Unidad 1"),
    boton: TEXTOS_TEMAS.crear,
    envio: es("POST", `${RUTA_CLASE}/temas`),
    prefijo: "nombre",
    bien: conExito(TEXTOS_TEMAS.avisoCreado),
  },
  {
    nombre: "renombrar un tema",
    elemento: () => (
      <FormularioTema
        claseId={CLASE_ID}
        temaId={TEMA_ID}
        nombreInicial="Unidad 1"
        onTerminar={() => undefined}
      />
    ),
    llenar: async () => escribir(TEXTOS_TEMAS.campoNombre, "Unidad 2"),
    boton: TEXTOS_TEMAS.guardarNombre,
    envio: es("PUT", `${RUTA_CLASE}/temas/${TEMA_ID}`),
    prefijo: "nombre",
    bien: conExito(TEXTOS_TEMAS.avisoRenombrado),
  },
  {
    nombre: "el editor de categorías (fila)",
    elemento: () => (
      <EditorDeCategorias
        claseId={CLASE_ID}
        categorias={[{ id: CATEGORIA_ID, nombre: "Tareas", peso: 100, tareas: 0 }]}
      />
    ),
    llenar: async () => escribir(NOMBRE_DE_LA_FILA, "Exámenes"),
    boton: TEXTOS_CATEGORIAS.guardar,
    envio: es("PUT", `${RUTA_CLASE}/categorias`),
    prefijo: "categorias.0.nombre",
    bien: conExito(TEXTOS_CATEGORIAS.avisoGuardadas),
  },
  {
    nombre: "el editor de categorías (lista)",
    elemento: () => (
      <EditorDeCategorias
        claseId={CLASE_ID}
        categorias={[{ id: CATEGORIA_ID, nombre: "Tareas", peso: 100, tareas: 0 }]}
      />
    ),
    llenar: async () => escribir(NOMBRE_DE_LA_FILA, "Exámenes"),
    boton: TEXTOS_CATEGORIAS.guardar,
    envio: es("PUT", `${RUTA_CLASE}/categorias`),
    prefijo: "categorias",
    bien: conExito(TEXTOS_CATEGORIAS.avisoGuardadas),
  },
]

describe("CHORE-03 · la frase genérica en un ErrorDeCampo de clases: repetir el control", () => {
  it.each(FORMULARIOS)(
    "CH3-B10: $nombre tras F2: el mismo botón manda una petición nueva y, si responde bien, el ErrorDeCampo desaparece",
    async (formulario) => {
      esLaPeticion = formulario.envio
      respuestas = [() => validacion(`${formulario.prefijo}:   `)]
      await montar(formulario.elemento())
      await formulario.llenar()
      await reposar()

      fireEvent.click(screen.getByRole("button", { name: formulario.boton }))
      await waitFor(() => expect(erroresDeCampo()).toEqual([GENERICO]))
      await reposar()
      expect(avisos()).toEqual([])
      expect(llamadas.filter(formulario.envio)).toHaveLength(1)

      fireEvent.click(screen.getByRole("button", { name: formulario.boton }))
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

describe("CHORE-03 · la frase genérica en un ErrorDeCampo de clases: otra sección y regreso (rutas y Providers)", () => {
  it("CH3-B10: con el genérico bajo el nombre del tema en «Trabajo de clase», ir al muro y volver antes de 30 s quita el error y «Crear tema» manda un POST nuevo", async () => {
    const { rutas } = await import("@/app/router")
    const esCrearTema = es("POST", `${RUTA_CLASE}/temas`)
    esLaPeticion = esCrearTema
    respuestas = [() => validacion("nombre:\u{200B}")]
    const router = createMemoryRouter(rutas, {
      initialEntries: [`/maestro/clases/${CLASE_ID}/trabajo`],
    })
    render(
      <Providers>
        <RouterProvider router={router} />
      </Providers>,
    )
    fireEvent.click(await screen.findByRole("button", { name: TEXTOS_TRABAJO.nuevoTema }))
    escribir(TEXTOS_TEMAS.campoNombre, "Unidad 1")
    fireEvent.click(screen.getByRole("button", { name: TEXTOS_TEMAS.crear }))
    await waitFor(() => expect(erroresDeCampo()).toEqual([GENERICO]))
    await reposar()
    expect(avisos()).toEqual([])

    const secciones = await screen.findByRole("list", { name: TEXTOS_CLASE.secciones })
    fireEvent.click(within(secciones).getByRole("link", { name: new RegExp(TEXTOS_CLASE.muro) }))
    await waitFor(() => expect(router.state.location.pathname).toBe(`/maestro/clases/${CLASE_ID}`))
    await reposar()
    vi.setSystemTime(new Date(AHORA.getTime() + 10_000))
    await act(async () => {
      await router.navigate(-1)
    })
    await screen.findByRole("button", { name: TEXTOS_TRABAJO.nuevoTema })
    await reposar()

    expect(erroresDeCampo()).toEqual([])
    expect(screen.queryByText(GENERICO)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: TEXTOS_TRABAJO.nuevoTema }))
    escribir(TEXTOS_TEMAS.campoNombre, "Unidad 1")
    fireEvent.click(screen.getByRole("button", { name: TEXTOS_TEMAS.crear }))
    await waitFor(() => expect(llamadas.filter(esCrearTema)).toHaveLength(2))
    await waitFor(() => expect(exitos()).toEqual([TEXTOS_TEMAS.avisoCreado]))
    await reposar()
    expect(erroresDeCampo()).toEqual([])
    expect(avisos()).toEqual([])
    expect(inesperadas).toEqual([])
  })
})

// CHORE-03 (Enmienda 4, T-03 y T-04): el aviso genérico que da un VALIDACION sin texto visible de un
// campo que el modo enviado no pinta ("maestroIds:" al editar una clase, "titulo:" en un anuncio)
// pide repetir el envío.
interface EnvioConAviso {
  nombre: string
  ruta: string
  elemento: ReactNode
  llenar: () => Promise<void>
  boton: string
  envio: (llamada: Llamada) => boolean
  mensaje: string
  conservado: string
  bien: (router: ReturnType<typeof createMemoryRouter>) => Promise<void>
}

const ENVIOS_CON_AVISO: readonly EnvioConAviso[] = [
  {
    nombre: "editar clase con «maestroIds:» sin texto visible",
    ruta: `/admin/clases/${CLASE_ID}/editar`,
    elemento: (
      <FormularioClase
        modo="editar"
        claseId={CLASE_ID}
        valoresIniciales={{ nombre: "Álgebra", descripcion: null }}
      />
    ),
    llenar: async () => escribir(TEXTOS_FORMULARIO_CLASE.campoNombre, "Álgebra II"),
    boton: TEXTOS_FORMULARIO_CLASE.botonGuardar,
    envio: es("PUT", `/api/admin/clases/${CLASE_ID}`),
    mensaje: "maestroIds:\u{200B}",
    conservado: "Álgebra II",
    bien: async (router) => {
      await waitFor(() => expect(exitos()).toEqual([TEXTOS_FORMULARIO_CLASE.avisoGuardada]))
      await waitFor(() => expect(router.state.location.pathname).toBe(`/admin/clases/${CLASE_ID}`))
    },
  },
  {
    nombre: "publicar un anuncio con «titulo:» sin texto visible",
    ruta: `/maestro/clases/${CLASE_ID}`,
    elemento: <FormularioPublicacion claseId={CLASE_ID} />,
    llenar: async () => escribir(TEXTOS_FORMULARIO_PUBLICACION.campoAnuncio, "Mañana hay examen"),
    boton: TEXTOS_FORMULARIO_PUBLICACION.publicarAnuncio,
    envio: es("POST", `${RUTA_CLASE}/publicaciones`),
    mensaje: "titulo:\u{200B}",
    conservado: "Mañana hay examen",
    bien: async () => {
      await waitFor(() => expect(exitos()).toEqual([TEXTOS_FORMULARIO_PUBLICACION.avisoPublicado]))
      expect(screen.getByLabelText(TEXTOS_FORMULARIO_PUBLICACION.campoAnuncio)).toHaveValue("")
    },
  },
]

describe("CHORE-03 (Enmienda 4) · el aviso genérico de un campo que el modo no pinta: repetir el control", () => {
  it.each(ENVIOS_CON_AVISO)(
    "CH3-B17: $nombre da el aviso genérico; el mismo botón manda una petición nueva con lo conservado y, si responde bien, no hay un segundo aviso de error",
    async (formulario) => {
      esLaPeticion = formulario.envio
      respuestas = [() => validacion(formulario.mensaje)]
      const cliente = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })
      const router = createMemoryRouter(
        [
          { path: formulario.ruta, element: formulario.elemento },
          { path: "/admin/clases/:claseId", element: <p>La clase</p> },
        ],
        { initialEntries: [formulario.ruta] },
      )
      render(
        <QueryClientProvider client={cliente}>
          <RouterProvider router={router} />
        </QueryClientProvider>,
      )
      await reposar()
      await formulario.llenar()
      await reposar()

      fireEvent.click(screen.getByRole("button", { name: formulario.boton }))
      await waitFor(() => expect(avisos()).toEqual([GENERICO]))
      await reposar()
      expect(erroresDeCampo()).toEqual([])
      expect(llamadas.filter(formulario.envio)).toHaveLength(1)

      fireEvent.click(screen.getByRole("button", { name: formulario.boton }))
      await waitFor(() => expect(llamadas.filter(formulario.envio)).toHaveLength(2))
      expect(llamadas.filter(formulario.envio)[1]?.cuerpo).toContain(formulario.conservado)
      await formulario.bien(router)
      await reposar()

      expect(avisos()).toEqual([GENERICO])
      expect(erroresDeCampo()).toEqual([])
      expect(inesperadas).toEqual([])
    },
  )
})

describe("CHORE-03 (Enmienda 4) · el aviso genérico al editar una clase: otra sección y regreso (rutas y Providers)", () => {
  it("CH3-B17: tras el aviso genérico de «maestroIds:» en «Editar clase», salir por «Cancelar» a la clase y volver por «Editar clase» antes de 30 s monta el formulario sin error y «Guardar cambios» manda un PUT nuevo", async () => {
    const { rutas } = await import("@/app/router")
    rolDeSesion = "admin"
    const esGuardar = es("PUT", `/api/admin/clases/${CLASE_ID}`)
    esLaPeticion = esGuardar
    respuestas = [() => validacion("maestroIds:\u{200B}")]
    const router = createMemoryRouter(rutas, {
      initialEntries: [`/admin/clases/${CLASE_ID}/editar`],
    })
    render(
      <Providers>
        <RouterProvider router={router} />
      </Providers>,
    )
    const campoNombre = await screen.findByLabelText(TEXTOS_FORMULARIO_CLASE.campoNombre)
    expect(campoNombre).toHaveValue("Álgebra I")
    escribir(TEXTOS_FORMULARIO_CLASE.campoNombre, "Álgebra II")
    fireEvent.click(screen.getByRole("button", { name: TEXTOS_FORMULARIO_CLASE.botonGuardar }))
    await waitFor(() => expect(avisos()).toEqual([GENERICO]))
    await reposar()
    expect(erroresDeCampo()).toEqual([])

    fireEvent.click(screen.getByRole("link", { name: TEXTOS_FORMULARIO_CLASE.cancelar }))
    await waitFor(() => expect(router.state.location.pathname).toBe(`/admin/clases/${CLASE_ID}`))
    await reposar()
    vi.setSystemTime(new Date(AHORA.getTime() + 10_000))
    fireEvent.click(await screen.findByRole("link", { name: TEXTOS_CLASE.editar }))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/admin/clases/${CLASE_ID}/editar`),
    )
    expect(await screen.findByLabelText(TEXTOS_FORMULARIO_CLASE.campoNombre)).toHaveValue(
      "Álgebra I",
    )
    await reposar()

    expect(erroresDeCampo()).toEqual([])
    expect(screen.queryByText(GENERICO)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: TEXTOS_FORMULARIO_CLASE.botonGuardar }))
    await waitFor(() => expect(llamadas.filter(esGuardar)).toHaveLength(2))
    await waitFor(() => expect(exitos()).toEqual([TEXTOS_FORMULARIO_CLASE.avisoGuardada]))
    await reposar()
    expect(avisos()).toEqual([GENERICO])
    expect(inesperadas).toEqual([])
  })
})
