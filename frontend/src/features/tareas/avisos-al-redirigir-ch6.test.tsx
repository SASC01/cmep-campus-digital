import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// CHORE-06a (§D-3, DH-04; Enmienda 1, M-02; CH6-A18): en features/tareas, quien recibe un error con que
// apiClient ya saca a la persona de la página (401 sin refresco, 403 ACCESO_RESTRINGIDO, 403
// CAMBIO_DE_CONTRASENA_REQUERIDO) no avisa: crear, editar y borrar una tarea; entregar, anular y comentar en
// el hilo; las subidas de la tarea y de la entrega; y la recarga de la tarea con datos en caché. Con el
// router real (`rutas` de app/router) y las defaultOptions de app/providers.tsx. Un 500 (y un 503 en la
// recarga) en la misma tabla es el control: un solo aviso, el de hoy.

const aviso = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
)
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

type Rol = "estudiante" | "maestro" | "admin"
type Respuesta = () => Response | Promise<Response>

const ESPERA = { timeout: 6000 }
const uuid = (prefijo: string, n: number) =>
  `${prefijo}-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const A = uuid("2a2b3c4d", 1)
const T1 = uuid("7a7b3c4d", 1)
const P1 = { id: uuid("6a6b3c4d", 1), nombre: "Pedro Paz" }
const MAESTRO = { id: uuid("3a3b3c4d", 1), nombre: "Luis Pérez" }
const FIRMA = { ...MAESTRO, administracion: false }
const CREADO_EN = "2026-10-01T15:30:00.000Z"
const FUTURA = "2030-01-15T16:00:00.000Z"
const API = `/api/clases/${A}`
const API_TAREA = `${API}/tareas/${T1}`
const BASE = (rol: Rol) => `/${rol}/clases/${A}`

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorApi = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

interface Llamada {
  metodo: string
  url: URL
}

type Manejador = (llamada: Llamada) => Response | Promise<Response> | undefined
const sinManejador: Manejador = () => undefined

interface Servidor {
  rol: Rol
  miEntrega: "asignado" | "entregado"
  refrescoFalla: boolean
  manejador: Manejador
}

let servidor: Servidor
let colas = new Map<string, Respuesta[]>()
let llamadas: Llamada[] = []

const preparar = (clave: string, ...respuestas: Respuesta[]) => {
  const cola = colas.get(clave)
  if (cola === undefined) {
    colas.set(clave, [...respuestas])
    return
  }
  cola.push(...respuestas)
}

const peticiones = (clave: string) =>
  llamadas.filter((l) => `${l.metodo} ${l.url.pathname}` === clave).length

const tareaDoble = (id = T1) => ({
  tarea: {
    id,
    titulo: "Ensayo uno",
    instrucciones: "",
    fechaLimite: FUTURA,
    puntos: 10,
    aceptaTardias: true,
    requiereAdjuntos: true,
    version: 0,
    categoria: null,
    tema: null,
    rubrica: [],
    adjuntos: [],
    autor: FIRMA,
    creadoEn: CREADO_EN,
    actualizadoEn: CREADO_EN,
    puedeEditar: true,
    puedeBorrar: true,
  },
})

const miEntregaDoble = () => {
  const entregado = servidor.miEntrega === "entregado"
  return {
    entrega: {
      estado: entregado ? "entregado" : "asignado",
      fechaEntrega: entregado ? "2026-10-09T15:30:00.000Z" : null,
      conRetraso: false,
      enlaces: entregado ? ["https://ejemplo.mx/trabajo"] : [],
      adjuntos: [],
      puedeEntregar: !entregado,
      puedeAnular: entregado,
      calificacion: null,
    },
  }
}

const entregaDeAlumnoDoble = () => ({
  entrega: {
    alumno: P1,
    estado: "entregado",
    fechaEntrega: "2026-10-09T15:30:00.000Z",
    conRetraso: false,
    enlaces: [],
    adjuntos: [],
    version: 2,
    calificacion: null,
  },
})

const responder = (llamada: Llamada): Response | Promise<Response> => {
  const { metodo, url } = llamada
  const ruta = url.pathname
  if (ruta === "/api/auth/refrescar") {
    if (servidor.refrescoFalla) return errorApi(401, "NO_AUTENTICADO")
    return respuestaJson(200, { tokenAcceso: "otra" })
  }
  if (ruta === "/api/me") {
    return respuestaJson(200, {
      id: uuid("4f4f3c4d", 1),
      nombre: "Ana López",
      email: "ana@ejemplo.mx",
      rol: servidor.rol,
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
  }
  const propia = servidor.manejador(llamada)
  if (propia !== undefined) return propia
  if (ruta === "/api/clases/inscritas" || ruta === "/api/clases/impartidas") {
    return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
  }
  if (ruta === "/api/clases/anteriores") {
    return respuestaJson(200, {
      clases: [],
      total: 0,
      siguienteCursor: null,
      siguienteCursorArchivadaEn: null,
    })
  }
  if (ruta === API && metodo === "GET") {
    return respuestaJson(200, {
      clase: {
        id: A,
        nombre: "Historia",
        descripcion: null,
        maestro: MAESTRO,
        maestros: [MAESTRO],
        archivadaEn: null,
      },
    })
  }
  if (ruta === `${API}/codigo`) return respuestaJson(200, { codigo: "ABCDEFG" })
  if (ruta === `${API}/categorias`) return respuestaJson(200, { categorias: [] })
  if (ruta === `${API}/temas`) return respuestaJson(200, { temas: [], sinTema: 0 })
  if (ruta === API_TAREA && metodo === "GET") return respuestaJson(200, tareaDoble())
  if (ruta === `${API_TAREA}/entrega` && metodo === "GET") {
    return respuestaJson(200, miEntregaDoble())
  }
  if (ruta === `${API_TAREA}/entrega/comentarios` && metodo === "GET") {
    return respuestaJson(200, { comentarios: [], siguienteCursor: null })
  }
  if (ruta === `${API_TAREA}/entregas` && metodo === "GET") {
    return respuestaJson(200, { entregas: [], total: 0, entregadas: 0, siguienteCursor: null })
  }
  if (ruta === `${API_TAREA}/entregas/${P1.id}` && metodo === "GET") {
    return respuestaJson(200, entregaDeAlumnoDoble())
  }
  if (ruta === `${API_TAREA}/entregas/${P1.id}/comentarios` && metodo === "GET") {
    return respuestaJson(200, { comentarios: [], siguienteCursor: null })
  }
  return errorApi(500, "ERROR_INTERNO", "no esperada")
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  servidor = {
    rol: "maestro",
    miEntrega: "asignado",
    refrescoFalla: false,
    manejador: sinManejador,
  }
  colas = new Map()
  llamadas = []
  vi.mocked(irA).mockClear()
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = new URL(String(entrada), "http://x")
      const metodo = init?.method ?? "GET"
      const llamada = { metodo, url }
      llamadas.push(llamada)
      const siguiente = colas.get(`${metodo} ${url.pathname}`)?.shift()
      if (siguiente !== undefined) return Promise.resolve().then(siguiente)
      return Promise.resolve().then(() => responder(llamada))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.mockClear()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

const montar = async (entrada: string) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [entrada] })
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })
  render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, cliente }
}

const reposar = (ms = 50) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))
const buscarBoton = (nombre: string | RegExp) =>
  screen.findByRole("button", { name: nombre }, ESPERA)
const pulsar = async (nombre: string | RegExp) => {
  fireEvent.click(await buscarBoton(nombre))
}
const campo = (etiqueta: string | RegExp) => screen.findByLabelText(etiqueta, {}, ESPERA)
const escribir = async (etiqueta: string | RegExp, valor: string) => {
  fireEvent.change(await campo(etiqueta), { target: { value: valor } })
}
const valorDe = async (etiqueta: string | RegExp) => {
  const elemento = await campo(etiqueta)
  if (!(elemento instanceof HTMLInputElement || elemento instanceof HTMLTextAreaElement)) {
    throw new Error(`Precondición: «${String(etiqueta)}» es un campo de texto`)
  }
  return elemento.value
}
const fueraDeEspera = async (elemento: HTMLElement) => {
  await waitFor(() => expect(elemento).not.toHaveAttribute("aria-busy", "true"), ESPERA)
}
const archivo = () => new File(["x"], "guia.pdf", { type: "application/pdf" })
const elegirArchivo = async () => {
  fireEvent.change(await campo("Adjuntar archivos"), { target: { files: [archivo()] } })
  await waitFor(() => expect(screen.queryAllByText(/guia\.pdf/).length).toBeGreaterThan(0), ESPERA)
}
const elegidos = () => screen.queryAllByText(/guia\.pdf/).length > 0

interface Codigo {
  nombre: string
  respuesta: Respuesta
  destino: string | null
  antes: () => void
}

const CODIGOS: readonly Codigo[] = [
  {
    nombre: "401 sin refresco",
    respuesta: () => errorApi(401, "NO_AUTENTICADO"),
    destino: "/login",
    antes: () => {
      servidor.refrescoFalla = true
    },
  },
  {
    nombre: "403 ACCESO_RESTRINGIDO",
    respuesta: () => errorApi(403, "ACCESO_RESTRINGIDO"),
    destino: "/acceso-restringido",
    antes: () => undefined,
  },
  {
    nombre: "403 CAMBIO_DE_CONTRASENA_REQUERIDO",
    respuesta: () => errorApi(403, "CAMBIO_DE_CONTRASENA_REQUERIDO"),
    destino: "/cambiar-contrasena",
    antes: () => undefined,
  },
  {
    nombre: "500 (control)",
    respuesta: () => errorApi(500, "ERROR_INTERNO"),
    destino: null,
    antes: () => undefined,
  },
]

// Cada acción de §D-3 con el control que la dispara en su vista.
interface Accion {
  nombre: string
  rol: Rol
  ruta: string
  preparar?: () => void
  // Llena lo necesario, deja visible el control final y devuelve cómo leer lo escrito.
  llenar: () => Promise<() => Promise<unknown>>
  control: string
  clave: string
  // Si el botón que lanza la acción sigue a la vista después del error.
  botonQueSigue: string | null
}

const sinEscrito = async () => () => Promise.resolve(null)

const ACCIONES: readonly Accion[] = [
  {
    nombre: "crear una tarea",
    rol: "maestro",
    ruta: `${BASE("maestro")}/tareas/nueva`,
    llenar: async () => {
      await escribir("Título", "Tarea nueva")
      await escribir("Fecha límite", "2030-01-15T10:00")
      return () => valorDe("Título")
    },
    control: "Publicar tarea",
    clave: `POST ${API}/tareas`,
    botonQueSigue: "Publicar tarea",
  },
  {
    nombre: "editar una tarea",
    rol: "maestro",
    ruta: `${BASE("maestro")}/tareas/${T1}/editar`,
    llenar: async () => {
      await waitFor(async () => expect(await valorDe("Título")).toBe("Ensayo uno"), ESPERA)
      await escribir("Título", "Ensayo uno corregido")
      return () => valorDe("Título")
    },
    control: "Guardar cambios",
    clave: `PUT ${API_TAREA}`,
    botonQueSigue: "Guardar cambios",
  },
  {
    nombre: "borrar una tarea",
    rol: "maestro",
    ruta: `${BASE("maestro")}/tareas/${T1}`,
    llenar: async () => {
      await pulsar("Borrar tarea")
      return sinEscrito()
    },
    control: "Sí, borrar tarea",
    clave: `DELETE ${API_TAREA}`,
    botonQueSigue: null,
  },
  {
    nombre: "entregar",
    rol: "estudiante",
    ruta: `${BASE("estudiante")}/tareas/${T1}`,
    llenar: async () => {
      await escribir("Enlace", "https://uno.ejemplo.mx/t1")
      await pulsar("Agregar enlace")
      await waitFor(
        () => expect(screen.queryAllByText("https://uno.ejemplo.mx/t1").length).toBeGreaterThan(0),
        ESPERA,
      )
      return async () => screen.queryAllByText("https://uno.ejemplo.mx/t1").length > 0
    },
    control: "Entregar tarea",
    clave: `POST ${API_TAREA}/entrega`,
    botonQueSigue: "Entregar tarea",
  },
  {
    nombre: "anular la entrega",
    rol: "estudiante",
    ruta: `${BASE("estudiante")}/tareas/${T1}`,
    preparar: () => {
      servidor.miEntrega = "entregado"
    },
    llenar: async () => {
      await pulsar("Anular entrega")
      return sinEscrito()
    },
    control: "Sí, anular entrega",
    clave: `POST ${API_TAREA}/entrega/anular`,
    botonQueSigue: null,
  },
  {
    nombre: "comentar en el hilo privado (alumno)",
    rol: "estudiante",
    ruta: `${BASE("estudiante")}/tareas/${T1}`,
    llenar: async () => {
      await escribir("Comentario privado", "Tengo una duda")
      return () => valorDe("Comentario privado")
    },
    control: "Enviar comentario",
    clave: `POST ${API_TAREA}/entrega/comentarios`,
    botonQueSigue: "Enviar comentario",
  },
  {
    nombre: "comentar en el hilo de un alumno (maestro)",
    rol: "maestro",
    ruta: `${BASE("maestro")}/tareas/${T1}/entregas/${P1.id}`,
    llenar: async () => {
      await escribir("Comentario privado", "Revisa la conclusión")
      return () => valorDe("Comentario privado")
    },
    control: "Enviar comentario",
    clave: `POST ${API_TAREA}/entregas/${P1.id}/comentarios`,
    botonQueSigue: "Enviar comentario",
  },
  {
    nombre: "la subida al crear una tarea",
    rol: "maestro",
    ruta: `${BASE("maestro")}/tareas/nueva`,
    llenar: async () => {
      await escribir("Título", "Tarea con adjunto")
      await escribir("Fecha límite", "2030-01-15T10:00")
      await elegirArchivo()
      return async () => [await valorDe("Título"), elegidos()]
    },
    control: "Publicar tarea",
    clave: `POST ${API}/archivos`,
    botonQueSigue: "Publicar tarea",
  },
  {
    nombre: "la subida al entregar",
    rol: "estudiante",
    ruta: `${BASE("estudiante")}/tareas/${T1}`,
    llenar: async () => {
      await elegirArchivo()
      return async () => elegidos()
    },
    control: "Entregar tarea",
    clave: `POST ${API_TAREA}/entrega/archivos`,
    botonQueSigue: "Entregar tarea",
  },
]

describe("CH6-A18 · las mutaciones y las subidas de features/tareas callan ante un código con que apiClient redirige", () => {
  it.each(
    ACCIONES.flatMap((accion) =>
      CODIGOS.map((codigo) => [accion.nombre, codigo.nombre, accion, codigo] as const),
    ),
  )(
    "CH6-A18: %s con %s: ningún aviso ante un código que redirige (irA con su destino), lo escrito se conserva y el botón sale de la espera; un solo aviso ante el 500",
    async (_a, _c, accion, codigo) => {
      servidor.rol = accion.rol
      accion.preparar?.()
      preparar(accion.clave, codigo.respuesta)
      await montar(accion.ruta)
      const leer = await accion.llenar()
      const antes = await leer()
      const control = await buscarBoton(accion.control)
      codigo.antes()
      fireEvent.click(control)
      await waitFor(() => expect(peticiones(accion.clave)).toBe(1), ESPERA)
      if (codigo.destino === null) {
        await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
        await reposar(100)
        expect(aviso.error).toHaveBeenCalledTimes(1)
        expect(String(aviso.error.mock.calls[0]?.[0]).trim()).not.toBe("")
      } else {
        await waitFor(() => expect(irA).toHaveBeenCalledWith(codigo.destino), ESPERA)
        await reposar(100)
        expect(aviso.error).not.toHaveBeenCalled()
      }
      if (accion.botonQueSigue !== null)
        await fueraDeEspera(await buscarBoton(accion.botonQueSigue))
      expect(await leer()).toEqual(antes)
    },
  )

  it.each(CODIGOS.slice(0, 3).map((codigo) => [codigo.nombre, codigo] as const))(
    "CH6-A18 (regresión CAL-1C06): calificar con %s sigue sin avisar",
    async (_nombre, codigo) => {
      servidor.rol = "maestro"
      const clave = `PUT ${API_TAREA}/entregas/${P1.id}/calificacion`
      preparar(clave, codigo.respuesta)
      await montar(`${BASE("maestro")}/tareas/${T1}/entregas/${P1.id}`)
      await escribir("Calificación (de 10 puntos)", "8")
      codigo.antes()
      await pulsar("Calificar y devolver")
      await waitFor(() => expect(peticiones(clave)).toBe(1), ESPERA)
      await waitFor(() => expect(irA).toHaveBeenCalledWith(codigo.destino), ESPERA)
      await reposar(100)
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )

  it("CH6-A18 (regresión, entregas-01d-r3:307): un 404 TAREA_NO_ENCONTRADA al entregar y comentar a la vez sigue dando un solo aviso", async () => {
    servidor.rol = "estudiante"
    const noExiste = () => errorApi(404, "TAREA_NO_ENCONTRADA", "Esa tarea ya no existe.")
    preparar(`POST ${API_TAREA}/entrega`, noExiste)
    preparar(`POST ${API_TAREA}/entrega/comentarios`, noExiste)
    await montar(`${BASE("estudiante")}/tareas/${T1}`)
    await escribir("Enlace", "https://uno.ejemplo.mx/t1")
    await pulsar("Agregar enlace")
    await escribir("Comentario privado", "Tengo una duda")
    const entregar = await buscarBoton("Entregar tarea")
    const enviar = await buscarBoton("Enviar comentario")
    act(() => {
      fireEvent.click(entregar)
      fireEvent.click(enviar)
    })
    await waitFor(() => expect(peticiones(`POST ${API_TAREA}/entrega`)).toBe(1), ESPERA)
    await waitFor(() => expect(peticiones(`POST ${API_TAREA}/entrega/comentarios`)).toBe(1), ESPERA)
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await reposar(200)
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })
})

// La recarga de la tarea con datos en caché, en las cuatro vistas que la avisan.
interface VistaDeLaTarea {
  nombre: string
  ruta: string
  listo: () => Promise<unknown>
}

const VISTAS: readonly VistaDeLaTarea[] = [
  {
    nombre: "el detalle",
    ruta: `${BASE("maestro")}/tareas/${T1}`,
    listo: () => buscarBoton("Borrar tarea"),
  },
  {
    nombre: "la edición",
    ruta: `${BASE("maestro")}/tareas/${T1}/editar`,
    listo: () => waitFor(async () => expect(await valorDe("Título")).toBe("Ensayo uno"), ESPERA),
  },
  {
    nombre: "las entregas",
    ruta: `${BASE("maestro")}/tareas/${T1}/entregas`,
    listo: () => screen.findByText(/Entregaron 0 de 0 alumnos/, {}, ESPERA),
  },
  {
    nombre: "la entrega de un alumno",
    ruta: `${BASE("maestro")}/tareas/${T1}/entregas/${P1.id}`,
    listo: () => campo("Calificación (de 10 puntos)"),
  },
]

const RECARGAS: readonly (readonly [string, Respuesta, string | null])[] = [
  ["401 sin refresco", () => errorApi(401, "NO_AUTENTICADO"), "/login"],
  ["403 ACCESO_RESTRINGIDO", () => errorApi(403, "ACCESO_RESTRINGIDO"), "/acceso-restringido"],
  [
    "403 CAMBIO_DE_CONTRASENA_REQUERIDO",
    () => errorApi(403, "CAMBIO_DE_CONTRASENA_REQUERIDO"),
    "/cambiar-contrasena",
  ],
  ["503 (control)", () => errorApi(503, "SERVICIO_OCUPADO", "El servidor está ocupado."), null],
]

describe("CH6-A18 · la recarga de la tarea con datos en caché", () => {
  it.each(
    VISTAS.flatMap((vista) =>
      RECARGAS.map(
        ([caso, respuesta, destino]) => [vista.nombre, caso, vista, respuesta, destino] as const,
      ),
    ),
  )(
    "CH6-A18: en %s, una recarga de la tarea con %s: ningún aviso ante un código que redirige (irA con su destino); uno ante el 503",
    async (_v, caso, vista, respuesta, destino) => {
      servidor.rol = "maestro"
      const { cliente } = await montar(vista.ruta)
      await vista.listo()
      await reposar()
      let fallos = 0
      servidor.manejador = ({ metodo, url }) => {
        if (metodo !== "GET" || url.pathname !== API_TAREA) return undefined
        fallos += 1
        return respuesta()
      }
      if (caso === "401 sin refresco") servidor.refrescoFalla = true
      aviso.error.mockClear()
      await act(() => cliente.invalidateQueries({ queryKey: ["clases", A] }))
      await waitFor(() => expect(fallos).toBeGreaterThanOrEqual(1), ESPERA)
      await reposar(1600)
      if (destino === null) {
        await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
        expect(irA).not.toHaveBeenCalled()
        return
      }
      await waitFor(() => expect(irA).toHaveBeenCalledWith(destino), ESPERA)
      expect(aviso.error).not.toHaveBeenCalled()
    },
    15_000,
  )
})
