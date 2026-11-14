import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/services/apiClient"
import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { mensajeDeErrorClases } from "./lib"

// CHORE-06a (§D-3, DH-04; CH6-A15 y CH6-A16): quien recibe un error con que apiClient ya saca a la persona
// de la página (401 sin refresco, 403 ACCESO_RESTRINGIDO, 403 CAMBIO_DE_CONTRASENA_REQUERIDO) no avisa.
// Con el componente real de cada gancho, montado por `rutas` de app/router con las defaultOptions de
// app/providers.tsx. Un 500 en la misma tabla es el control: un solo aviso, el de hoy.

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
const PUBLICACION = uuid("5a5b3c4d", 1)
const COMENTARIO = uuid("7a7b3c4d", 1)
const ALUMNO = { id: uuid("6a6b3c4d", 1), nombre: "Pedro Paz" }
const CANDIDATO = { id: uuid("9a9b3c4d", 1), nombre: "Ana Uno" }
const TEMA_1 = uuid("4a4b3c4d", 1)
const TEMA_2 = uuid("4a4b3c4d", 2)
const RECURSO = uuid("8a8b3c4d", 1)
const CATEGORIA = uuid("1a1b3c4d", 1)
const MAESTRO_1 = { id: uuid("3a3b3c4d", 1), nombre: "Luis Pérez" }
const MAESTRO_2 = { id: uuid("3a3b3c4d", 2), nombre: "Marta Ruiz" }
const CANDIDATO_MAESTRO = { id: uuid("3a3b3c4d", 3), nombre: "Raúl Soto" }
const FIRMA = { ...MAESTRO_1, administracion: false }
const CREADO_EN = "2026-10-01T15:30:00.000Z"
const BASE = (rol: Rol) => `/${rol}/clases/${A}`
const API = `/api/clases/${A}`

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
  maestros: (typeof MAESTRO_1)[]
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

const recursoDoble = {
  id: RECURSO,
  titulo: "Guía uno",
  texto: "",
  autor: FIRMA,
  creadoEn: CREADO_EN,
  bloque: "docente",
  adjuntos: [],
  comentarios: 0,
  puedeEditar: true,
  puedeBorrar: true,
  puedeMover: true,
}

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
  if (ruta === "/api/admin/clases") {
    return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
  }
  if (ruta === "/api/admin/maestros/candidatos") {
    return respuestaJson(200, {
      candidatos: [{ ...CANDIDATO_MAESTRO, email: "raul@ejemplo.mx" }],
      hayMas: false,
    })
  }
  if (ruta === API && metodo === "GET") {
    return respuestaJson(200, {
      clase: {
        id: A,
        nombre: "Historia",
        descripcion: null,
        maestro: MAESTRO_1,
        maestros: servidor.maestros,
        archivadaEn: null,
      },
    })
  }
  if (ruta === `${API}/codigo`) return respuestaJson(200, { codigo: "ABCDEFG" })
  if (ruta === `${API}/publicaciones` && metodo === "GET") {
    return respuestaJson(200, {
      publicaciones: [
        {
          id: PUBLICACION,
          tipo: "anuncio",
          titulo: null,
          texto: "Primer aviso",
          autor: FIRMA,
          creadoEn: CREADO_EN,
          comentarios: 1,
          adjuntos: [],
          puedeBorrar: true,
          tarea: null,
        },
      ],
      siguienteCursor: null,
    })
  }
  if (ruta === `${API}/publicaciones/${PUBLICACION}/comentarios` && metodo === "GET") {
    return respuestaJson(200, {
      comentarios: [
        {
          id: COMENTARIO,
          texto: "Gracias",
          autor: FIRMA,
          creadoEn: CREADO_EN,
          propio: true,
          puedeBorrar: true,
        },
      ],
      siguienteCursor: null,
    })
  }
  if (ruta === `${API}/alumnos/candidatos`) {
    return respuestaJson(200, {
      candidatos: [{ ...CANDIDATO, correoEnmascarado: "a***@x.mx", yaInscrito: false }],
      hayMas: false,
    })
  }
  if (ruta === `${API}/alumnos` && metodo === "GET") {
    return respuestaJson(200, {
      alumnos: [
        {
          ...ALUMNO,
          email: "pedro@ejemplo.mx",
          estadoPago: "al_corriente",
          accesoRestringido: false,
          origen: "codigo",
          inscritoEn: CREADO_EN,
        },
      ],
      total: 1,
      siguienteCursor: null,
    })
  }
  if (ruta === `${API}/temas` && metodo === "GET") {
    const seccion = url.searchParams.get("seccion")
    if (seccion === "docente") return respuestaJson(200, { temas: [], sinTema: 1 })
    if (seccion === "aprendizaje") return respuestaJson(200, { temas: [], sinTema: 0 })
    return respuestaJson(200, {
      temas: [
        { id: TEMA_1, nombre: "Unidad 1", orden: 0, elementos: 0 },
        { id: TEMA_2, nombre: "Unidad 2", orden: 1, elementos: 0 },
      ],
      sinTema: 0,
    })
  }
  if (ruta === `${API}/trabajo`) return respuestaJson(200, { elementos: [], siguienteCursor: null })
  if (ruta === `${API}/categorias` && metodo === "GET") {
    return respuestaJson(200, {
      categorias: [{ id: CATEGORIA, nombre: "Tareas", peso: 100, tareas: 0 }],
    })
  }
  if (ruta === `${API}/recursos` && metodo === "GET") {
    const conRecurso =
      url.searchParams.get("bloque") === "docente" && url.searchParams.get("tema") === "sin-tema"
    return respuestaJson(200, { recursos: conRecurso ? [recursoDoble] : [], siguienteCursor: null })
  }
  if (ruta === `${API}/recursos/${RECURSO}` && metodo === "GET") {
    return respuestaJson(200, { recurso: { ...recursoDoble, version: 0, tema: null } })
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
    maestros: [MAESTRO_1],
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

interface Codigo {
  nombre: string
  respuesta: Respuesta
  destino: string | null
  antes: () => void
}

const CODIGOS_QUE_REDIRIGEN: readonly Codigo[] = [
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
]

const CONTROL_500: Codigo = {
  nombre: "500 (control)",
  respuesta: () => errorApi(500, "ERROR_INTERNO"),
  destino: null,
  antes: () => undefined,
}

const AVISO_DEL_500 = mensajeDeErrorClases(
  new ApiError("ERROR_INTERNO", "mensaje del servidor", 500),
)

// Cada gancho de §D-3 con el control que lo dispara en su vista.
interface Gancho {
  nombre: string
  rol: Rol
  ruta: string
  preparar?: () => void
  // Deja visible el control final.
  abrir: () => Promise<void>
  control: string | RegExp
  clave: string
}

const GANCHOS: readonly Gancho[] = [
  {
    nombre: "asignar maestro",
    rol: "admin",
    ruta: `${BASE("admin")}/personas`,
    abrir: () => escribir("Buscar maestro por nombre", "Raúl"),
    control: `Asignar a la clase ${CANDIDATO_MAESTRO.nombre}`,
    clave: `POST /api/admin/clases/${A}/maestros`,
  },
  {
    nombre: "retirar maestro",
    rol: "admin",
    ruta: `${BASE("admin")}/personas`,
    preparar: () => {
      servidor.maestros = [MAESTRO_1, MAESTRO_2]
    },
    abrir: () => pulsar(`Quitar ${MAESTRO_2.nombre}`),
    control: `Sí, quitar ${MAESTRO_2.nombre}`,
    clave: `DELETE /api/admin/clases/${A}/maestros/${MAESTRO_2.id}`,
  },
  {
    nombre: "agregar alumno",
    rol: "maestro",
    ruta: `${BASE("maestro")}/personas`,
    abrir: () => escribir("Buscar alumno por nombre", "Ana"),
    control: `Agregar a la clase ${CANDIDATO.nombre}`,
    clave: `POST ${API}/alumnos`,
  },
  {
    nombre: "quitar alumno",
    rol: "maestro",
    ruta: `${BASE("maestro")}/personas`,
    abrir: () => pulsar(`Quitar ${ALUMNO.nombre}`),
    control: `Sí, quitar ${ALUMNO.nombre}`,
    clave: `DELETE ${API}/alumnos/${ALUMNO.id}`,
  },
  {
    nombre: "crear anuncio",
    rol: "maestro",
    ruta: BASE("maestro"),
    abrir: () => escribir("Anuncio", "Hola, grupo"),
    control: "Publicar anuncio",
    clave: `POST ${API}/publicaciones`,
  },
  {
    nombre: "borrar publicación",
    rol: "maestro",
    ruta: BASE("maestro"),
    abrir: () => pulsar("Borrar publicación"),
    control: "Sí, borrar",
    clave: `DELETE ${API}/publicaciones/${PUBLICACION}`,
  },
  {
    nombre: "comentar",
    rol: "maestro",
    ruta: BASE("maestro"),
    abrir: async () => {
      await pulsar("Ver comentarios (1)")
      await escribir("Escribe un comentario", "Muy bien")
    },
    control: "Comentar",
    clave: `POST ${API}/publicaciones/${PUBLICACION}/comentarios`,
  },
  {
    nombre: "borrar comentario",
    rol: "maestro",
    ruta: BASE("maestro"),
    abrir: async () => {
      await pulsar("Ver comentarios (1)")
      await pulsar("Borrar")
    },
    control: "Sí, borrar comentario",
    clave: `DELETE ${API}/publicaciones/${PUBLICACION}/comentarios/${COMENTARIO}`,
  },
  {
    nombre: "crear tema",
    rol: "maestro",
    ruta: `${BASE("maestro")}/trabajo`,
    abrir: async () => {
      await pulsar("Nuevo tema")
      await escribir("Nombre del tema", "Unidad 3")
    },
    control: "Crear tema",
    clave: `POST ${API}/temas`,
  },
  {
    nombre: "renombrar tema",
    rol: "maestro",
    ruta: `${BASE("maestro")}/trabajo`,
    abrir: async () => {
      await pulsar("Renombrar tema Unidad 1")
      await escribir("Nombre del tema", "Unidad uno")
    },
    control: "Guardar nombre",
    clave: `PUT ${API}/temas/${TEMA_1}`,
  },
  {
    nombre: "borrar tema",
    rol: "maestro",
    ruta: `${BASE("maestro")}/trabajo`,
    abrir: () => pulsar("Borrar tema tema Unidad 1"),
    control: "Sí, borrar tema",
    clave: `DELETE ${API}/temas/${TEMA_1}`,
  },
  {
    nombre: "ordenar temas",
    rol: "maestro",
    ruta: `${BASE("maestro")}/trabajo`,
    abrir: async () => {
      await buscarBoton("Bajar tema Unidad 1")
    },
    control: "Bajar tema Unidad 1",
    clave: `PUT ${API}/temas/orden`,
  },
  {
    nombre: "guardar categorías",
    rol: "maestro",
    ruta: `${BASE("maestro")}/categorias`,
    abrir: async () => {
      await buscarBoton("Guardar categorías")
    },
    control: "Guardar categorías",
    clave: `PUT ${API}/categorias`,
  },
]

const montarGancho = async (gancho: Gancho, codigo: Codigo) => {
  servidor.rol = gancho.rol
  gancho.preparar?.()
  preparar(gancho.clave, codigo.respuesta)
  const montado = await montar(gancho.ruta)
  await gancho.abrir()
  const control = await buscarBoton(gancho.control)
  codigo.antes()
  return { ...montado, control }
}

// Tras la petición: ante un código que redirige, irA con su destino y ningún aviso de error; ante el 500,
// un solo aviso con el texto de hoy y ningún irA.
const despuesDe = async (clave: string, codigo: Codigo, avisoDelControl: string) => {
  await waitFor(() => expect(peticiones(clave)).toBe(1), ESPERA)
  if (codigo.destino === null) {
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await reposar(100)
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(aviso.error.mock.calls[0]?.[0]).toBe(avisoDelControl)
    expect(irA).not.toHaveBeenCalled()
    return
  }
  await waitFor(() => expect(irA).toHaveBeenCalledWith(codigo.destino), ESPERA)
  await reposar(100)
  expect(irA).toHaveBeenCalledTimes(1)
  expect(aviso.error).not.toHaveBeenCalled()
}

const CODIGOS_CON_CONTROL: readonly Codigo[] = [...CODIGOS_QUE_REDIRIGEN, CONTROL_500]

describe("CH6-A15 · los 13 ganchos de features/clases callan ante un código con que apiClient redirige", () => {
  it.each(
    GANCHOS.flatMap((gancho) =>
      CODIGOS_CON_CONTROL.map((codigo) => [gancho.nombre, codigo.nombre, gancho, codigo] as const),
    ),
  )(
    "CH6-A15: %s con %s: ningún aviso ante un código que redirige (irA con su destino); un solo aviso ante el 500",
    async (_g, _c, gancho, codigo) => {
      const { control } = await montarGancho(gancho, codigo)
      fireEvent.click(control)
      await despuesDe(gancho.clave, codigo, AVISO_DEL_500)
    },
  )
})

// (Enmienda 1, M-02) Crear y editar clase (FormularioClase, admin) y la subida de un archivo al publicar un
// anuncio y al crear un recurso (la solicitud de subida responde con el código).
interface SitioDeM02 {
  nombre: string
  rol: Rol
  ruta: string
  // Escribe lo que el formulario necesita y devuelve cómo leerlo después.
  llenar: () => Promise<() => Promise<unknown>>
  enviar: string
  clave: string
  // El aviso de hoy ante el 500 (control).
  avisoDel500: string
}

const archivo = () => new File(["x"], "guia.pdf", { type: "application/pdf" })
const elegirArchivo = async () => {
  fireEvent.change(await campo("Adjuntar archivos"), { target: { files: [archivo()] } })
  await waitFor(() => expect(screen.queryAllByText(/guia\.pdf/).length).toBeGreaterThan(0), ESPERA)
}
const elegidos = () => screen.queryAllByText(/guia\.pdf/).length > 0

const SITIOS_M02: readonly SitioDeM02[] = [
  {
    nombre: "crear clase",
    rol: "admin",
    ruta: "/admin/clases/nueva",
    llenar: async () => {
      await escribir("Nombre de la clase", "Química")
      await escribir("Buscar maestro por nombre", "Raúl")
      await pulsar(`Elegir ${CANDIDATO_MAESTRO.nombre}`)
      await buscarBoton(`Quitar ${CANDIDATO_MAESTRO.nombre}`)
      return () => valorDe("Nombre de la clase")
    },
    enviar: "Crear clase",
    clave: "POST /api/admin/clases",
    avisoDel500: AVISO_DEL_500,
  },
  {
    nombre: "editar clase",
    rol: "admin",
    ruta: `${BASE("admin")}/editar`,
    llenar: async () => {
      await waitFor(
        async () => expect(await valorDe("Nombre de la clase")).toBe("Historia"),
        ESPERA,
      )
      await escribir("Nombre de la clase", "Historia universal")
      return () => valorDe("Nombre de la clase")
    },
    enviar: "Guardar cambios",
    clave: `PUT /api/admin/clases/${A}`,
    avisoDel500: AVISO_DEL_500,
  },
  {
    nombre: "subida al publicar un anuncio",
    rol: "maestro",
    ruta: BASE("maestro"),
    llenar: async () => {
      await escribir("Anuncio", "Con adjunto")
      await elegirArchivo()
      return async () => [await valorDe("Anuncio"), elegidos()]
    },
    enviar: "Publicar anuncio",
    clave: `POST ${API}/archivos`,
    avisoDel500: "",
  },
  {
    nombre: "subida al crear un recurso",
    rol: "maestro",
    ruta: `${BASE("maestro")}/recursos`,
    llenar: async () => {
      await escribir("Título del recurso", "Guía con adjunto")
      await elegirArchivo()
      return async () => [await valorDe("Título del recurso"), elegidos()]
    },
    enviar: "Publicar recurso",
    clave: `POST ${API}/archivos`,
    avisoDel500: "",
  },
]

describe("CH6-A15 · crear y editar clase y las subidas de anuncio y recurso (Enmienda 1, M-02)", () => {
  it.each(
    SITIOS_M02.flatMap((sitio) =>
      CODIGOS_CON_CONTROL.map((codigo) => [sitio.nombre, codigo.nombre, sitio, codigo] as const),
    ),
  )(
    "CH6-A15: %s con %s: ningún aviso ante un código que redirige; lo escrito y lo elegido se conservan y el botón sale de la espera; un solo aviso ante el 500",
    async (_s, _c, sitio, codigo) => {
      servidor.rol = sitio.rol
      preparar(sitio.clave, codigo.respuesta)
      await montar(sitio.ruta)
      const leer = await sitio.llenar()
      const antes = await leer()
      const enviar = await buscarBoton(sitio.enviar)
      codigo.antes()
      fireEvent.click(enviar)
      await waitFor(() => expect(peticiones(sitio.clave)).toBe(1), ESPERA)
      if (codigo.destino === null) {
        await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
        await reposar(100)
        expect(aviso.error).toHaveBeenCalledTimes(1)
        if (sitio.avisoDel500 !== "") {
          expect(aviso.error.mock.calls[0]?.[0]).toBe(sitio.avisoDel500)
        }
      } else {
        await waitFor(() => expect(irA).toHaveBeenCalledWith(codigo.destino), ESPERA)
        await reposar(100)
        expect(aviso.error).not.toHaveBeenCalled()
      }
      await fueraDeEspera(await buscarBoton(sitio.enviar))
      expect(await leer()).toEqual(antes)
    },
  )
})

describe("CH6-A16 · «Unirme a la clase» y los avisos de recarga", () => {
  it.each(CODIGOS_CON_CONTROL.map((codigo) => [codigo.nombre, codigo] as const))(
    "CH6-A16: «Unirme a la clase» con %s: ningún aviso ante un código que redirige, el campo sin marcar e irA una vez; un aviso ante el 500",
    async (_nombre, codigo) => {
      servidor.rol = "estudiante"
      const clave = "POST /api/clases/unirse"
      preparar(clave, codigo.respuesta)
      await montar("/estudiante")
      await escribir("Código de la clase", "ABCDEFG")
      codigo.antes()
      await pulsar("Unirme a la clase")
      await despuesDe(clave, codigo, AVISO_DEL_500)
      expect(screen.getByLabelText("Código de la clase")).not.toHaveAttribute(
        "aria-invalid",
        "true",
      )
    },
  )

  // Las cinco vistas de §D-3 que avisan de una recarga fallida con datos en caché.
  interface VistaConRecarga {
    nombre: string
    ruta: string
    listo: () => Promise<unknown>
    // La lectura que falla en la recarga.
    falla: (llamada: Llamada) => boolean
  }

  const VISTAS: readonly VistaConRecarga[] = [
    {
      nombre: "categorías",
      ruta: `${BASE("maestro")}/categorias`,
      listo: () => buscarBoton("Guardar categorías"),
      falla: ({ metodo, url }) => metodo === "GET" && url.pathname === `${API}/categorias`,
    },
    {
      nombre: "Recursos",
      ruta: `${BASE("maestro")}/recursos`,
      listo: () => screen.findByText("Guía uno", {}, ESPERA),
      falla: ({ metodo, url }) =>
        metodo === "GET" &&
        url.pathname === `${API}/temas` &&
        url.searchParams.get("seccion") === "docente",
    },
    {
      nombre: "Actividades",
      ruta: `${BASE("maestro")}/trabajo`,
      listo: () => buscarBoton("Nuevo tema"),
      falla: ({ metodo, url }) =>
        metodo === "GET" &&
        url.pathname === `${API}/temas` &&
        url.searchParams.get("seccion") === "actividades",
    },
    {
      nombre: "editar recurso",
      ruta: `${BASE("maestro")}/recursos/${RECURSO}/editar`,
      listo: () =>
        waitFor(async () => expect(await valorDe("Título del recurso")).toBe("Guía uno"), ESPERA),
      falla: ({ metodo, url }) => metodo === "GET" && url.pathname === `${API}/recursos/${RECURSO}`,
    },
    {
      nombre: "un tema de Recursos",
      ruta: `${BASE("maestro")}/recursos`,
      listo: () => screen.findByText("Guía uno", {}, ESPERA),
      falla: ({ metodo, url }) =>
        metodo === "GET" &&
        url.pathname === `${API}/recursos` &&
        url.searchParams.get("bloque") === "docente",
    },
  ]

  const RECARGAS: readonly (readonly [string, Respuesta, boolean])[] = [
    ["401 sin refresco", () => errorApi(401, "NO_AUTENTICADO"), false],
    ["503", () => errorApi(503, "SERVICIO_OCUPADO", "El servidor está ocupado."), true],
  ]

  it.each(
    VISTAS.flatMap((vista) =>
      RECARGAS.map(
        ([caso, respuesta, avisa]) => [vista.nombre, caso, vista, respuesta, avisa] as const,
      ),
    ),
  )(
    "CH6-A16: %s con una recarga que responde %s: ningún aviso de recarga con el 401 (irA a /login); uno con el 503",
    async (_v, caso, vista, respuesta, avisa) => {
      servidor.rol = "maestro"
      const { cliente } = await montar(vista.ruta)
      await vista.listo()
      await reposar()
      let fallos = 0
      servidor.manejador = (llamada) => {
        if (!vista.falla(llamada)) return undefined
        fallos += 1
        return respuesta()
      }
      if (caso === "401 sin refresco") servidor.refrescoFalla = true
      aviso.error.mockClear()
      await act(() => cliente.invalidateQueries({ queryKey: ["clases", A] }))
      await waitFor(() => expect(fallos).toBeGreaterThanOrEqual(1), ESPERA)
      await reposar(1600)
      if (avisa) {
        await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
        expect(irA).not.toHaveBeenCalled()
        return
      }
      await waitFor(() => expect(irA).toHaveBeenCalledWith("/login"), ESPERA)
      expect(aviso.error).not.toHaveBeenCalled()
    },
    15_000,
  )
})
