import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { claveClaseDetalle } from "./data"

// Tester, ADMIN-01d1, ronda 3 (sobre la corrección de T-02: la generación de solo lectura). Ataques a la clase archivada en solo lectura con
// el router real (`rutas` de app/router). Donde la prueba necesita la caché a mano (marcar viejo el
// detalle, leer el estado del reintento), el QueryClient es una copia exacta del de app/providers.tsx
// (retry: 1, refetchOnWindowFocus: false, staleTime: 30 s); en lo demás se monta <Providers>. Nunca se
// espera por tiempo: findBy, waitFor sobre el DOM, la caché o las peticiones, y respuestas retenidas con
// una promesa que la prueba suelta.

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

type Rol = "estudiante" | "maestro" | "admin"

const ESPERA = { timeout: 8000 }
const A = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const B = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02"
const NOMBRE: Record<string, string> = { [A]: "Historia", [B]: "Química" }
const ARCHIVADA_EN = "2026-10-05T12:00:00.000Z"
const TEMA_1 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0001"
const TEMA_2 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0002"
const TAREA_ID = "5a5b3c4d-1c1f-4b8e-9a1e-000000000001"
const MATERIAL_ID = "5a5b3c4d-1c1f-4b8e-9a1e-000000000002"
const PUBLICACION_ID = "5a5b3c4d-1c1f-4b8e-9a1e-000000000003"
const COMENTARIO_ID = "7a7b3c4d-1c1f-4b8e-9a1e-000000000001"
const RECURSO_ID = "6a6b3c4d-1c1f-4b8e-9a1e-000000000001"
const CATEGORIA_1 = "9b9b3c4d-1c1f-4b8e-9a1e-000000000001"
const CATEGORIA_2 = "9b9b3c4d-1c1f-4b8e-9a1e-000000000002"
const ARCHIVO_ID = "9a9b3c4d-1c1f-4b8e-9a1e-000000000001"
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const FIRMA = { ...MAESTRO, administracion: false }
const CREADO_EN = "2026-10-01T15:30:00.000Z"
const ARCHIVADA = "Esta clase está archivada: solo se puede consultar."
const SIN_ACCESO = "No tienes acceso a esta clase."

const base = (rol: Rol, id: string) => `/${rol}/clases/${id}`
const apiDe = (id: string) => `/api/clases/${id}`

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorJson = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })
const archivadaJson = () => errorJson(409, "CLASE_ARCHIVADA", ARCHIVADA)

interface Llamada {
  metodo: string
  url: URL
  cuerpo: unknown
}
type Manejador = (llamada: Llamada) => Response | Promise<Response> | undefined
const sinManejador: Manejador = () => undefined

const servidor = {
  rol: "maestro" as Rol,
  archivadas: new Set<string>(),
  borradas: new Set<string>(),
  manejador: sinManejador,
}
let llamadas: Llamada[] = []

const detalle = (id: string) => ({
  clase: {
    id,
    nombre: NOMBRE[id] ?? "Otra",
    descripcion: "Primer semestre",
    maestro: MAESTRO,
    maestros: [MAESTRO],
    archivadaEn: servidor.archivadas.has(id) ? ARCHIVADA_EN : null,
  },
})

const filaAdmin = (id: string) => ({
  id,
  nombre: NOMBRE[id] ?? "Otra",
  maestros: [MAESTRO],
  alumnos: 3,
  creadoEn: "2026-09-01T15:00:00.000Z",
  archivadaEn: servidor.archivadas.has(id) ? ARCHIVADA_EN : null,
})

const elementoDeTrabajo = (id: string, tipo: "tarea" | "material", titulo: string) => ({
  id,
  tipo,
  titulo,
  autor: FIRMA,
  creadoEn: CREADO_EN,
  material: tipo === "material" ? { texto: "Leer el capítulo 2.", adjuntos: [] } : null,
  tarea: tipo === "tarea" ? { fechaLimite: "2030-10-10T15:00:00.000Z", puntos: 10 } : null,
  puedeMover: true,
  entrega: null,
})

const recursoDeLaLista = {
  id: RECURSO_ID,
  titulo: "Guía de estudio",
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
  if (url.pathname === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "otra" })
  if (url.pathname === "/api/me") {
    return respuestaJson(200, {
      id: "4a4b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
      nombre: "Ana López",
      email: "ana@ejemplo.mx",
      rol: servidor.rol,
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
  }
  const propia = servidor.manejador(llamada)
  if (propia !== undefined) return propia
  if (url.hostname === "almacen.ejemplo.mx") return new Response(null, { status: 200 })
  if (url.pathname === "/api/clases/inscritas" || url.pathname === "/api/clases/impartidas") {
    return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
  }
  if (metodo === "GET" && url.pathname === "/api/admin/clases") {
    const archivadas = url.searchParams.get("estado") === "archivadas"
    const clases = [A, B]
      .filter((id) => !servidor.borradas.has(id))
      .filter((id) => servidor.archivadas.has(id) === archivadas)
      .map(filaAdmin)
    return respuestaJson(200, {
      clases,
      total: clases.length,
      siguienteCursor: null,
      siguienteCursorArchivadaEn: null,
    })
  }
  const restaurar = /^\/api\/admin\/clases\/([^/]+)\/restaurar$/.exec(url.pathname)
  if (restaurar !== null && metodo === "POST") {
    const id = restaurar[1] ?? ""
    if (servidor.borradas.has(id)) return errorJson(403, "SIN_ACCESO_A_LA_CLASE", SIN_ACCESO)
    if (!servidor.archivadas.has(id)) {
      return errorJson(409, "CLASE_NO_ARCHIVADA", "La clase no está archivada.")
    }
    servidor.archivadas.delete(id)
    return respuestaJson(200, detalle(id))
  }
  const editarClase = /^\/api\/admin\/clases\/([^/]+)$/.exec(url.pathname)
  if (editarClase !== null && metodo === "PUT") {
    const id = editarClase[1] ?? ""
    if (servidor.archivadas.has(id)) return archivadaJson()
    return respuestaJson(200, detalle(id))
  }
  const deLaClase = /^\/api\/clases\/([^/]+)(\/.*)?$/.exec(url.pathname)
  if (deLaClase === null) return errorJson(500, "ERROR_INTERNO", "no esperada")
  const id = deLaClase[1] ?? ""
  const resto = deLaClase[2] ?? ""
  if (servidor.borradas.has(id)) return errorJson(403, "SIN_ACCESO_A_LA_CLASE", SIN_ACCESO)
  if (resto === "" && metodo === "GET") return respuestaJson(200, detalle(id))
  if (resto === "/codigo") {
    if (servidor.archivadas.has(id)) return archivadaJson()
    return respuestaJson(200, { codigo: "ABCDEFG" })
  }
  // Toda escritura en una clase archivada responde 409 CLASE_ARCHIVADA, como el sexto paso.
  if (metodo !== "GET" && servidor.archivadas.has(id)) return archivadaJson()
  if (resto === "/publicaciones" && metodo === "GET") {
    return respuestaJson(200, {
      publicaciones: [
        {
          id: PUBLICACION_ID,
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
  if (resto === "/publicaciones" && metodo === "POST") {
    const datos = llamada.cuerpo as { texto?: string }
    return respuestaJson(201, {
      publicacion: {
        id: "5a5b3c4d-1c1f-4b8e-9a1e-000000000099",
        tipo: "anuncio",
        titulo: null,
        texto: datos.texto ?? "",
        autor: FIRMA,
        creadoEn: CREADO_EN,
        comentarios: 0,
        adjuntos: [],
        puedeBorrar: true,
        tarea: null,
      },
    })
  }
  if (resto === `/publicaciones/${PUBLICACION_ID}/comentarios` && metodo === "GET") {
    return respuestaJson(200, {
      comentarios: [
        {
          id: COMENTARIO_ID,
          texto: "Un comentario",
          autor: FIRMA,
          creadoEn: CREADO_EN,
          propio: true,
          puedeBorrar: true,
        },
      ],
      siguienteCursor: null,
    })
  }
  if (resto === "/temas" && metodo === "GET") {
    const seccion = url.searchParams.get("seccion")
    return respuestaJson(200, {
      temas: [
        { id: TEMA_1, nombre: "Unidad 1", orden: 0, elementos: seccion === "actividades" ? 2 : 0 },
        { id: TEMA_2, nombre: "Unidad 2", orden: 1, elementos: 0 },
      ],
      sinTema: seccion === "docente" ? 1 : 0,
    })
  }
  if (resto === "/trabajo") {
    const delTema = url.searchParams.get("tema") === TEMA_1
    return respuestaJson(200, {
      elementos: delTema
        ? [
            elementoDeTrabajo(TAREA_ID, "tarea", "Ensayo final"),
            elementoDeTrabajo(MATERIAL_ID, "material", "Lectura de apoyo"),
          ]
        : [],
      siguienteCursor: null,
    })
  }
  if (resto === "/categorias" && metodo === "GET") {
    return respuestaJson(200, {
      categorias: [
        { id: CATEGORIA_1, nombre: "Tareas", peso: 60, tareas: 0 },
        { id: CATEGORIA_2, nombre: "Exámenes", peso: 40, tareas: 0 },
      ],
    })
  }
  if (resto === "/recursos" && metodo === "GET") {
    const delDocente =
      url.searchParams.get("bloque") === "docente" && url.searchParams.get("tema") === "sin-tema"
    return respuestaJson(200, {
      recursos: delDocente ? [recursoDeLaLista] : [],
      siguienteCursor: null,
    })
  }
  if (resto === `/recursos/${RECURSO_ID}` && metodo === "GET") {
    return respuestaJson(200, { recurso: { ...recursoDeLaLista, version: 0, tema: null } })
  }
  if (resto === "/archivos" && metodo === "POST") {
    const { nombre, tipo, tamano } = llamada.cuerpo as {
      nombre: string
      tipo: string
      tamano: number
    }
    return respuestaJson(201, {
      archivo: { id: ARCHIVO_ID, nombre, tipo, tamano },
      subida: {
        url: "https://almacen.ejemplo.mx/subida/1",
        metodo: "PUT",
        cabeceras: { "Content-Type": tipo },
        expiraEn: "2030-10-02T15:05:00.000Z",
      },
    })
  }
  return errorJson(500, "ERROR_INTERNO", "no esperada")
}

const retener = () => {
  let soltar: () => void = () => {
    throw new Error("Precondición: la respuesta retenida no se creó")
  }
  const promesa = new Promise<void>((resolver) => {
    soltar = resolver
  })
  return { promesa, soltar: () => soltar() }
}

// Copia exacta de las opciones de app/providers.tsx, para poder tocar la caché desde la prueba.
const clienteComoElDeLaApp = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })

const montar = async (entrada: string, cliente?: QueryClient) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [entrada] })
  const arbol = <RouterProvider router={router} />
  render(
    cliente === undefined ? (
      <Providers>{arbol}</Providers>
    ) : (
      <QueryClientProvider client={cliente}>{arbol}</QueryClientProvider>
    ),
  )
  return router
}

const pedidas = (metodo: string, ruta: string) =>
  llamadas.filter((l) => l.metodo === metodo && l.url.pathname === ruta)
const escrituras = () => llamadas.filter((l) => l.metodo !== "GET")
const errores = () => aviso.error.mock.calls.map(([texto]) => String(texto))
const exitos = () => aviso.success.mock.calls.map(([texto]) => String(texto))
const avisoFijo = () => screen.queryByText(/^Clase archivada el /)
const titulo = (id: string) =>
  screen.findByRole("heading", { level: 1, name: NOMBRE[id] ?? "" }, ESPERA)
const enfocar = (elemento: HTMLElement) => {
  act(() => elemento.focus())
  expect(document.activeElement, "Precondición: el elemento recibió el foco").toBe(elemento)
}
const enfocarYPulsar = (control: HTMLElement) => {
  enfocar(control)
  fireEvent.click(control)
}
const archivarYRenovar = async (cliente: QueryClient, id: string) => {
  servidor.archivadas.add(id)
  await act(() => cliente.invalidateQueries({ queryKey: claveClaseDetalle(id), exact: true }))
}
const quieto = (cliente: QueryClient) =>
  waitFor(() => {
    expect(cliente.isFetching()).toBe(0)
    expect(cliente.isMutating()).toBe(0)
  }, ESPERA)

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  servidor.rol = "maestro"
  servidor.archivadas = new Set()
  servidor.borradas = new Set()
  servidor.manejador = sinManejador
  llamadas = []
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = new URL(String(entrada), "http://x")
      const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined
      const llamada = { metodo: init?.method ?? "GET", url, cuerpo }
      llamadas.push(llamada)
      return Promise.resolve(responder(llamada))
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

const restaurarYRenovar = async (cliente: QueryClient, id: string) => {
  servidor.archivadas.delete(id)
  await act(() => cliente.invalidateQueries({ queryKey: claveClaseDetalle(id), exact: true }))
}
const verAviso = () => screen.findByText(/^Clase archivada el /, {}, ESPERA)
const sinAviso = () => waitFor(() => expect(avisoFijo()).toBeNull(), ESPERA)
const RUTA_DEL_RECURSO = (id: string) => `${apiDe(id)}/recursos/${RECURSO_ID}`
const TITULO_DEL_RECURSO = "Título del recurso"
const SUBIDO = "lectura.pdf"
const elegirArchivo = () => {
  const archivo = new File(["contenido"], SUBIDO, { type: "application/pdf" })
  fireEvent.change(screen.getByLabelText("Adjuntar archivos"), { target: { files: [archivo] } })
}
const subidasAlAlmacen = () => llamadas.filter((l) => l.url.hostname === "almacen.ejemplo.mx")
const respuestaDelRecurso = (titulo: string, version: number) => ({
  recurso: { ...recursoDeLaLista, titulo, version, tema: null },
})

// ---------------------------------------------------------------------------------------------------
// Punto 2: manejadores de varios pasos, con el archivo en subida (el PUT al almacén retenido), en las
// filas 3, 16 y 20. La instancia vieja del formulario sigue su camino sin tocar la nueva.

interface FormularioConSubida {
  nombre: string
  seccion: string
  campo: string
  enviar: string
  valorAlNacer: string
  // La escritura que sale después de subir el archivo.
  escritura: { metodo: string; ruta: string }
  exito: string
}

const FORMULARIOS: FormularioConSubida[] = [
  {
    nombre: "fila 3 (aviso)",
    seccion: "",
    campo: "Anuncio",
    enviar: "Publicar anuncio",
    valorAlNacer: "",
    escritura: { metodo: "POST", ruta: `${apiDe(A)}/publicaciones` },
    exito: "Publicado",
  },
  {
    nombre: "fila 16 (recurso nuevo)",
    seccion: "/recursos",
    campo: TITULO_DEL_RECURSO,
    enviar: "Publicar recurso",
    valorAlNacer: "",
    escritura: { metodo: "POST", ruta: `${apiDe(A)}/publicaciones` },
    exito: "Recurso publicado",
  },
  {
    nombre: "fila 20 (editar un recurso)",
    seccion: `/recursos/${RECURSO_ID}/editar`,
    campo: TITULO_DEL_RECURSO,
    enviar: "Guardar cambios",
    valorAlNacer: "Guía de estudio",
    escritura: { metodo: "PUT", ruta: RUTA_DEL_RECURSO(A) },
    exito: "Cambios guardados",
  },
]

const montarConLaSubidaEnVuelo = async (
  formulario: FormularioConSubida,
  respuesta: () => Response,
) => {
  const subida = retener()
  servidor.manejador = ({ metodo, url }) => {
    if (url.hostname === "almacen.ejemplo.mx") return subida.promesa.then(respuesta)
    if (metodo === "PUT" && url.pathname === RUTA_DEL_RECURSO(A) && !servidor.archivadas.has(A)) {
      return respuestaJson(200, respuestaDelRecurso("Lo enviado", 1))
    }
    return undefined
  }
  const cliente = clienteComoElDeLaApp()
  const router = await montar(`${base("maestro", A)}${formulario.seccion}`, cliente)
  const h1 = await titulo(A)
  const campo = await screen.findByRole("textbox", { name: formulario.campo }, ESPERA)
  fireEvent.change(campo, { target: { value: "Lo que se envía" } })
  elegirArchivo()
  await quieto(cliente)
  enfocarYPulsar(screen.getByRole("button", { name: formulario.enviar }))
  await waitFor(() => expect(subidasAlAlmacen()).toHaveLength(1), ESPERA)
  return { cliente, router, h1, subida }
}

describe("ataque ADMIN-01d1 r3: el archivo en subida cuando la clase se archiva y se restaura", () => {
  it.each(FORMULARIOS)(
    "ADM-T3D101 $nombre: la subida termina con la clase restaurada: una sola escritura, un aviso, sin navegar; el formulario nuevo conserva lo escrito y el foco",
    async (formulario) => {
      const { cliente, router, subida } = await montarConLaSubidaEnVuelo(
        formulario,
        () => new Response(null, { status: 200 }),
      )
      const rutaAntes = router.state.location.pathname
      await archivarYRenovar(cliente, A)
      await verAviso()
      await restaurarYRenovar(cliente, A)
      await sinAviso()

      const nuevo = await screen.findByRole("textbox", { name: formulario.campo }, ESPERA)
      expect(nuevo).toHaveValue(formulario.valorAlNacer)
      expect(screen.queryByText(SUBIDO)).toBeNull()
      fireEvent.change(nuevo, { target: { value: "Lo que escribo después" } })
      enfocar(nuevo)

      subida.soltar()
      await waitFor(() => expect(exitos()).toEqual([formulario.exito]), ESPERA)
      await quieto(cliente)
      expect(
        llamadas.filter(
          (l) =>
            l.metodo === formulario.escritura.metodo &&
            l.url.pathname === formulario.escritura.ruta,
        ),
      ).toHaveLength(1)
      expect(pedidas("POST", `${apiDe(A)}/archivos`)).toHaveLength(1)
      expect(subidasAlAlmacen()).toHaveLength(1)
      expect(errores()).toEqual([])
      expect(router.state.location.pathname).toBe(rutaAntes)
      const final = screen.getByRole("textbox", { name: formulario.campo })
      expect(final).toBe(nuevo)
      expect(final).toHaveValue("Lo que escribo después")
      expect(document.activeElement).toBe(final)
    },
  )

  it.each(FORMULARIOS)(
    "ADM-T3D102 $nombre: la subida termina con la clase archivada: la escritura recibe el 409, un solo aviso y nada navega; al restaurar, el formulario nace limpio y sin llevarse el foco",
    async (formulario) => {
      const { cliente, router, h1, subida } = await montarConLaSubidaEnVuelo(
        formulario,
        () => new Response(null, { status: 200 }),
      )
      const rutaAntes = router.state.location.pathname
      await archivarYRenovar(cliente, A)
      await verAviso()

      subida.soltar()
      await waitFor(() => expect(errores()).toEqual([ARCHIVADA]), ESPERA)
      await quieto(cliente)
      expect(exitos()).toEqual([])
      expect(router.state.location.pathname).toBe(rutaAntes)
      expect(avisoFijo()).not.toBeNull()
      enfocar(h1)

      await restaurarYRenovar(cliente, A)
      await sinAviso()
      const nuevo = await screen.findByRole("textbox", { name: formulario.campo }, ESPERA)
      await quieto(cliente)
      expect(nuevo).toHaveValue(formulario.valorAlNacer)
      expect(screen.queryByText(SUBIDO)).toBeNull()
      expect(document.activeElement).toBe(h1)
      expect(errores()).toEqual([ARCHIVADA])
    },
  )

  it.each(FORMULARIOS)(
    "ADM-T3D103 $nombre: el almacén rechaza el archivo con la clase restaurada: un solo aviso de la subida, sin escritura, y el formulario nuevo no cambia",
    async (formulario) => {
      const { cliente, router, subida } = await montarConLaSubidaEnVuelo(
        formulario,
        () => new Response(null, { status: 500 }),
      )
      const rutaAntes = router.state.location.pathname
      await archivarYRenovar(cliente, A)
      await verAviso()
      await restaurarYRenovar(cliente, A)
      await sinAviso()
      const nuevo = await screen.findByRole("textbox", { name: formulario.campo }, ESPERA)
      fireEvent.change(nuevo, { target: { value: "Lo que escribo después" } })
      enfocar(nuevo)

      subida.soltar()
      await waitFor(() => expect(errores()).toHaveLength(1), ESPERA)
      await quieto(cliente)
      expect(errores()[0]).toContain(SUBIDO)
      expect(exitos()).toEqual([])
      expect(
        llamadas.filter(
          (l) =>
            l.metodo === formulario.escritura.metodo &&
            l.url.pathname === formulario.escritura.ruta,
        ),
      ).toEqual([])
      expect(router.state.location.pathname).toBe(rutaAntes)
      expect(nuevo).toHaveValue("Lo que escribo después")
      expect(document.activeElement).toBe(nuevo)
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// Punto 3: cambio de clase con efectos en vuelo, con y sin caché. A activa, B archivada.

const ORDEN_NUEVO = {
  temas: [
    { id: TEMA_2, nombre: "Unidad 2", orden: 0, elementos: 0 },
    { id: TEMA_1, nombre: "Unidad 1", orden: 1, elementos: 2 },
  ],
  sinTema: 0,
}

const CAMBIOS_DE_CLASE = [
  { cache: "con B en caché", enCache: true, llega: "en B", enB: true },
  { cache: "con B en caché", enCache: true, llega: "de vuelta en A", enB: false },
  { cache: "sin B en caché", enCache: false, llega: "en B", enB: true },
  { cache: "sin B en caché", enCache: false, llega: "de vuelta en A", enB: false },
]

describe("ataque ADMIN-01d1 r3: cambio a una clase archivada con efectos en vuelo", () => {
  it.each(CAMBIOS_DE_CLASE)(
    "ADM-T3D104 «Subir» en A, $cache; el orden llega $llega: el foco de la persona no se mueve y sale un solo PUT",
    async ({ enCache, enB }) => {
      servidor.rol = "admin"
      servidor.archivadas.add(B)
      const orden = retener()
      servidor.manejador = ({ metodo, url }) => {
        if (metodo !== "PUT" || url.pathname !== `${apiDe(A)}/temas/orden`) return undefined
        return orden.promesa.then(() => respuestaJson(200, ORDEN_NUEVO))
      }
      const cliente = clienteComoElDeLaApp()
      const inicio = enCache ? B : A
      const router = await montar(`${base("admin", inicio)}/trabajo`, cliente)
      await titulo(inicio)
      await screen.findByText("Ensayo final", {}, ESPERA)
      if (enCache) {
        await quieto(cliente)
        await act(() => router.navigate(`${base("admin", A)}/trabajo`))
        await titulo(A)
        await sinAviso()
        await screen.findByText("Ensayo final", {}, ESPERA)
      }
      await quieto(cliente)
      const clave = claveClaseDetalle(B)
      expect(cliente.getQueryData(clave) !== undefined).toBe(enCache)

      enfocarYPulsar(screen.getByRole("button", { name: "Subir tema Unidad 2" }))
      await waitFor(() => expect(pedidas("PUT", `${apiDe(A)}/temas/orden`)).toHaveLength(1), ESPERA)
      await act(() => router.navigate(`${base("admin", B)}/trabajo`))
      await titulo(B)
      await verAviso()
      await screen.findByText("Ensayo final", {}, ESPERA)
      const recursos = screen.getByRole("link", { name: "Recursos" })
      enfocar(recursos)

      if (enB) {
        orden.soltar()
        await quieto(cliente)
        expect(document.activeElement).toBe(recursos)
      }
      await act(() => router.navigate(`${base("admin", A)}/trabajo`))
      await titulo(A)
      await sinAviso()
      const volver = screen.getByRole("link", { name: "Recursos" })
      enfocar(volver)
      if (!enB) orden.soltar()
      await quieto(cliente)
      expect(document.activeElement).toBe(volver)
      expect(pedidas("PUT", `${apiDe(A)}/temas/orden`)).toHaveLength(1)
      expect(errores()).toEqual([])
    },
  )

  it.each(CAMBIOS_DE_CLASE)(
    "ADM-T3D105 guardado de la ruta 20 en A, $cache; el 200 llega $llega: un solo aviso, no navega y lo escrito después sigue",
    async ({ enCache, enB }) => {
      servidor.rol = "admin"
      servidor.archivadas.add(B)
      const guardado = retener()
      servidor.manejador = ({ metodo, url }) => {
        if (metodo !== "PUT" || url.pathname !== RUTA_DEL_RECURSO(A)) return undefined
        return guardado.promesa.then(() => respuestaJson(200, respuestaDelRecurso("Lo enviado", 1)))
      }
      const cliente = clienteComoElDeLaApp()
      const inicio = enCache ? B : A
      const ruta = (id: string) => `${base("admin", id)}/recursos/${RECURSO_ID}/editar`
      const router = await montar(ruta(inicio), cliente)
      await titulo(inicio)
      if (enCache) {
        await screen.findByText(ARCHIVADA, {}, ESPERA)
        await quieto(cliente)
        await act(() => router.navigate(ruta(A)))
        await titulo(A)
        await sinAviso()
      }
      const campo = await screen.findByRole("textbox", { name: TITULO_DEL_RECURSO }, ESPERA)
      await quieto(cliente)
      expect(cliente.getQueryData(claveClaseDetalle(B)) !== undefined).toBe(enCache)
      fireEvent.change(campo, { target: { value: "Lo enviado" } })
      enfocarYPulsar(screen.getByRole("button", { name: "Guardar cambios" }))
      await waitFor(() => expect(pedidas("PUT", RUTA_DEL_RECURSO(A))).toHaveLength(1), ESPERA)

      await act(() => router.navigate(ruta(B)))
      await titulo(B)
      await screen.findByText(ARCHIVADA, {}, ESPERA)
      if (enB) {
        guardado.soltar()
        await waitFor(() => expect(exitos()).toEqual(["Cambios guardados"]), ESPERA)
        await quieto(cliente)
        expect(router.state.location.pathname).toBe(ruta(B))
      }
      await act(() => router.navigate(ruta(A)))
      await titulo(A)
      await sinAviso()
      const nuevo = await screen.findByRole("textbox", { name: TITULO_DEL_RECURSO }, ESPERA)
      fireEvent.change(nuevo, { target: { value: "Lo que escribo después" } })
      enfocar(nuevo)
      if (!enB) {
        guardado.soltar()
        await waitFor(() => expect(exitos()).toEqual(["Cambios guardados"]), ESPERA)
      }
      await quieto(cliente)
      expect(router.state.location.pathname).toBe(ruta(A))
      expect(exitos()).toEqual(["Cambios guardados"])
      expect(errores()).toEqual([])
      expect(pedidas("PUT", RUTA_DEL_RECURSO(A))).toHaveLength(1)
      const final = screen.getByRole("textbox", { name: TITULO_DEL_RECURSO })
      expect(final).toHaveValue("Lo que escribo después")
      expect(document.activeElement).toBe(final)
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// Puntos 4, 6 y 7: la ruta 20. Un guion del servidor por cada PUT y una versión que sube con cada 409.

interface GuionDelRecurso {
  version: number
  envios: { version: unknown; titulo: unknown }[]
  respuestas: ("200" | "409" | "500")[]
  retener: ReturnType<typeof retener> | null
}

const guionDelRecurso = (respuestas: GuionDelRecurso["respuestas"]) => {
  const guion: GuionDelRecurso = { version: 0, envios: [], respuestas, retener: null }
  servidor.manejador = ({ metodo, url, cuerpo }) => {
    if (url.pathname !== RUTA_DEL_RECURSO(A)) return undefined
    if (metodo === "GET") {
      return respuestaJson(
        200,
        respuestaDelRecurso(
          guion.version === 0 ? "Guía de estudio" : `Guía v${guion.version}`,
          guion.version,
        ),
      )
    }
    if (metodo !== "PUT") return undefined
    const datos = cuerpo as { version?: unknown; titulo?: unknown }
    guion.envios.push({ version: datos.version, titulo: datos.titulo })
    const siguiente = guion.respuestas.shift()
    if (siguiente === undefined) throw new Error("El guion no previó este PUT")
    const contestar = () => {
      if (siguiente === "500") return errorJson(500, "ERROR_INTERNO", "Falló.")
      if (siguiente === "409") {
        guion.version += 1
        return errorJson(409, "RECURSO_MODIFICADO", "Otra persona guardó este recurso.")
      }
      guion.version += 1
      return respuestaJson(200, respuestaDelRecurso(String(datos.titulo), guion.version))
    }
    return guion.retener === null ? contestar() : guion.retener.promesa.then(contestar)
  }
  return guion
}

const CONFLICTO = "Otra persona guardó este recurso."
const campoDelRecurso = () => screen.getByRole("textbox", { name: TITULO_DEL_RECURSO })
const pedidosDelRecurso = () => pedidas("GET", RUTA_DEL_RECURSO(A)).length

const abrirLaRuta20 = async (rol: Rol) => {
  servidor.rol = rol
  const cliente = clienteComoElDeLaApp()
  const router = await montar(`${base(rol, A)}/recursos/${RECURSO_ID}/editar`, cliente)
  const h1 = await titulo(A)
  const campo = await screen.findByRole("textbox", { name: TITULO_DEL_RECURSO }, ESPERA)
  await quieto(cliente)
  return { cliente, router, h1, campo }
}
const guardarConTexto = (valor: string) => {
  fireEvent.change(campoDelRecurso(), { target: { value: valor } })
  enfocarYPulsar(screen.getByRole("button", { name: "Guardar cambios" }))
}

describe("ataque ADMIN-01d1 r3: una segunda vuelta tras un reinicio legítimo en la ruta 20", () => {
  it("ADM-T3D106: 409, reinicio con foco; archivar y restaurar sin llevarse el foco; otro 409 y otro reinicio con foco; después guarda y navega: versiones y avisos correctos", async () => {
    const guion = guionDelRecurso(["409", "409", "200"])
    const { cliente, router, h1 } = await abrirLaRuta20("maestro")

    guardarConTexto("Primer intento")
    await waitFor(() => expect(campoDelRecurso()).toHaveValue("Guía v1"), ESPERA)
    await waitFor(() => expect(document.activeElement).toBe(campoDelRecurso()), ESPERA)
    await quieto(cliente)
    expect(errores()).toEqual([CONFLICTO])

    enfocar(h1)
    await archivarYRenovar(cliente, A)
    await screen.findByText(ARCHIVADA, {}, ESPERA)
    await restaurarYRenovar(cliente, A)
    await sinAviso()
    const restaurado = await screen.findByRole("textbox", { name: TITULO_DEL_RECURSO }, ESPERA)
    await quieto(cliente)
    expect(restaurado).toHaveValue("Guía v1")
    expect(document.activeElement).toBe(h1)

    const pedidosAntes = pedidosDelRecurso()
    guardarConTexto("Segundo intento")
    await waitFor(() => expect(campoDelRecurso()).toHaveValue("Guía v2"), ESPERA)
    await waitFor(() => expect(document.activeElement).toBe(campoDelRecurso()), ESPERA)
    await quieto(cliente)
    expect(pedidosDelRecurso()).toBeGreaterThan(pedidosAntes)
    expect(errores()).toEqual([CONFLICTO, CONFLICTO])

    guardarConTexto("Tercer intento")
    await waitFor(
      () => expect(router.state.location.pathname).toBe(`${base("maestro", A)}/recursos`),
      ESPERA,
    )
    expect(guion.envios).toEqual([
      expect.objectContaining({ version: 0, titulo: "Primer intento" }),
      expect.objectContaining({ version: 1, titulo: "Segundo intento" }),
      expect.objectContaining({ version: 2, titulo: "Tercer intento" }),
    ])
    expect(exitos()).toEqual(["Cambios guardados"])
    expect(errores()).toEqual([CONFLICTO, CONFLICTO])
  })
})

describe("ataque ADMIN-01d1 r3: los órdenes de la ruta 20 desde la perspectiva del admin", () => {
  it("ADM-T3D107 (a): la recarga del conflicto llega después de restaurar: no reinicia ni se lleva el foco y lo escrito sigue", async () => {
    const guion = guionDelRecurso(["409"])
    const recarga = retener()
    const delGuion = servidor.manejador
    servidor.manejador = (llamada) => {
      const esRecarga =
        llamada.metodo === "GET" &&
        llamada.url.pathname === RUTA_DEL_RECURSO(A) &&
        guion.version > 0
      if (!esRecarga) return delGuion(llamada)
      return recarga.promesa.then(() => respuestaJson(200, respuestaDelRecurso("Guía v1", 1)))
    }
    const { cliente, h1 } = await abrirLaRuta20("admin")
    const pedidosAntes = pedidosDelRecurso()
    guardarConTexto("Lo enviado")
    await waitFor(() => expect(pedidosDelRecurso()).toBe(pedidosAntes + 1), ESPERA)

    await archivarYRenovar(cliente, A)
    await screen.findByText(ARCHIVADA, {}, ESPERA)
    await restaurarYRenovar(cliente, A)
    await sinAviso()
    const nacido = await screen.findByRole("textbox", { name: TITULO_DEL_RECURSO }, ESPERA)
    fireEvent.change(nacido, { target: { value: "Lo que escribo después" } })
    enfocar(h1)

    recarga.soltar()
    await quieto(cliente)
    expect(campoDelRecurso()).toBe(nacido)
    expect(nacido).toHaveValue("Lo que escribo después")
    expect(document.activeElement).toBe(h1)
    expect(errores()).toEqual([CONFLICTO])
  })

  it.each([
    ["llega después de restaurar", true],
    ["llega con la clase archivada", false],
  ] as const)(
    "ADM-T3D107 (b): el 200 %s: un aviso y no navega; lo escrito después sigue",
    async (_nombre, restaurarAntes) => {
      const guion = guionDelRecurso(["200"])
      const respuesta = retener()
      guion.retener = respuesta
      const { cliente, router } = await abrirLaRuta20("admin")
      const rutaAntes = router.state.location.pathname
      guardarConTexto("Lo enviado")
      await waitFor(() => expect(guion.envios).toHaveLength(1), ESPERA)

      await archivarYRenovar(cliente, A)
      await screen.findByText(ARCHIVADA, {}, ESPERA)
      if (restaurarAntes) {
        await restaurarYRenovar(cliente, A)
        await sinAviso()
      }
      respuesta.soltar()
      await waitFor(() => expect(exitos()).toEqual(["Cambios guardados"]), ESPERA)
      await quieto(cliente)
      expect(router.state.location.pathname).toBe(rutaAntes)
      if (!restaurarAntes) {
        expect(screen.getByText(ARCHIVADA)).toBeInTheDocument()
        await restaurarYRenovar(cliente, A)
        await sinAviso()
      }
      const nuevo = await screen.findByRole("textbox", { name: TITULO_DEL_RECURSO }, ESPERA)
      fireEvent.change(nuevo, { target: { value: "Lo que escribo después" } })
      enfocar(nuevo)
      await quieto(cliente)
      expect(router.state.location.pathname).toBe(rutaAntes)
      expect(nuevo).toHaveValue("Lo que escribo después")
      expect(document.activeElement).toBe(nuevo)
      expect(errores()).toEqual([])
    },
  )

  it("ADM-T3D107 (c): el 409 RECURSO_MODIFICADO llega después de restaurar: un aviso, sin pedir el recurso, sin reiniciar y sin llevarse el foco", async () => {
    const guion = guionDelRecurso(["409"])
    const respuesta = retener()
    guion.retener = respuesta
    const { cliente, h1 } = await abrirLaRuta20("admin")
    guardarConTexto("Lo enviado")
    await waitFor(() => expect(guion.envios).toHaveLength(1), ESPERA)
    await archivarYRenovar(cliente, A)
    await screen.findByText(ARCHIVADA, {}, ESPERA)
    await restaurarYRenovar(cliente, A)
    await sinAviso()
    const nacido = await screen.findByRole("textbox", { name: TITULO_DEL_RECURSO }, ESPERA)
    fireEvent.change(nacido, { target: { value: "Lo que escribo después" } })
    enfocar(h1)
    // El PUT sigue retenido: solo las consultas están quietas.
    await waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
    const pedidosAntes = pedidosDelRecurso()

    respuesta.soltar()
    await waitFor(() => expect(errores()).toEqual([CONFLICTO]), ESPERA)
    await quieto(cliente)
    expect(pedidosDelRecurso()).toBe(pedidosAntes)
    expect(campoDelRecurso()).toBe(nacido)
    expect(nacido).toHaveValue("Lo que escribo después")
    expect(document.activeElement).toBe(h1)
  })

  it("ADM-T3D107 (d): el 500 del guardado llega después de restaurar: un aviso, no navega, no reinicia y lo escrito sigue", async () => {
    const guion = guionDelRecurso(["500"])
    const respuesta = retener()
    guion.retener = respuesta
    const { cliente, router } = await abrirLaRuta20("admin")
    const rutaAntes = router.state.location.pathname
    guardarConTexto("Lo enviado")
    await waitFor(() => expect(guion.envios).toHaveLength(1), ESPERA)
    await archivarYRenovar(cliente, A)
    await screen.findByText(ARCHIVADA, {}, ESPERA)
    await restaurarYRenovar(cliente, A)
    await sinAviso()
    const nacido = await screen.findByRole("textbox", { name: TITULO_DEL_RECURSO }, ESPERA)
    fireEvent.change(nacido, { target: { value: "Lo que escribo después" } })
    enfocar(nacido)

    respuesta.soltar()
    await waitFor(() => expect(errores()).toHaveLength(1), ESPERA)
    await quieto(cliente)
    expect(router.state.location.pathname).toBe(rutaAntes)
    expect(campoDelRecurso()).toBe(nacido)
    expect(nacido).toHaveValue("Lo que escribo después")
    expect(document.activeElement).toBe(nacido)
  })

  it("ADM-T3D107 (e): el primer guardado justo después de restaurar, con dos clics: un solo PUT, un aviso y navega a los Recursos del admin", async () => {
    const guion = guionDelRecurso(["200"])
    const { cliente, router } = await abrirLaRuta20("admin")
    await archivarYRenovar(cliente, A)
    await screen.findByText(ARCHIVADA, {}, ESPERA)
    await restaurarYRenovar(cliente, A)
    await sinAviso()
    await screen.findByRole("textbox", { name: TITULO_DEL_RECURSO }, ESPERA)

    guardarConTexto("Primer guardado")
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(
      () => expect(router.state.location.pathname).toBe(`${base("admin", A)}/recursos`),
      ESPERA,
    )
    expect(guion.envios).toEqual([
      expect.objectContaining({ version: 0, titulo: "Primer guardado" }),
    ])
    expect(exitos()).toEqual(["Cambios guardados"])
    expect(errores()).toEqual([])
  })

  it("ADM-T3D107 (f): el primer guardado justo después de restaurar recibe 409: sí pide el recurso, reinicia y se lleva el foco (el conflicto es de este formulario)", async () => {
    guionDelRecurso(["409"])
    const { cliente } = await abrirLaRuta20("admin")
    await archivarYRenovar(cliente, A)
    await screen.findByText(ARCHIVADA, {}, ESPERA)
    await restaurarYRenovar(cliente, A)
    await sinAviso()
    await screen.findByRole("textbox", { name: TITULO_DEL_RECURSO }, ESPERA)

    guardarConTexto("Primer guardado")
    await waitFor(() => expect(campoDelRecurso()).toHaveValue("Guía v1"), ESPERA)
    await waitFor(() => expect(document.activeElement).toBe(campoDelRecurso()), ESPERA)
    await quieto(cliente)
    expect(errores()).toEqual([CONFLICTO])
  })

  it.each(["maestro", "admin"] as const)(
    "ADM-T3D108 (N-01d1-4, %s): el 409 llega con la clase archivada; al restaurar, el formulario nace de la caché; su segundo 409 deja un aviso por envío y el foco en el campo, con la versión del servidor",
    async (rol) => {
      const guion = guionDelRecurso(["409", "409"])
      const respuesta = retener()
      guion.retener = respuesta
      const { cliente } = await abrirLaRuta20(rol)
      guardarConTexto("Lo enviado")
      await waitFor(() => expect(guion.envios).toHaveLength(1), ESPERA)
      await archivarYRenovar(cliente, A)
      await screen.findByText(ARCHIVADA, {}, ESPERA)

      respuesta.soltar()
      await waitFor(() => expect(errores()).toEqual([CONFLICTO]), ESPERA)
      await quieto(cliente)
      guion.retener = null
      await restaurarYRenovar(cliente, A)
      await sinAviso()
      await screen.findByRole("textbox", { name: TITULO_DEL_RECURSO }, ESPERA)
      await quieto(cliente)

      guardarConTexto("Lo que escribo después")
      await waitFor(() => expect(errores()).toEqual([CONFLICTO, CONFLICTO]), ESPERA)
      await waitFor(() => expect(campoDelRecurso()).toHaveValue("Guía v2"), ESPERA)
      await waitFor(() => expect(document.activeElement).toBe(campoDelRecurso()), ESPERA)
      await quieto(cliente)
      expect(guion.envios).toHaveLength(2)
      expect(errores()).toEqual([CONFLICTO, CONFLICTO])
      expect(exitos()).toEqual([])
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// Punto 5: «Subir» o «Bajar» que se asienta con la clase todavía archivada, y se restaura después.

describe("ataque ADMIN-01d1 r3: el orden que se asienta con la clase archivada", () => {
  const ordenRetenido = () => {
    const orden = retener()
    servidor.manejador = ({ metodo, url }) => {
      if (metodo !== "PUT" || url.pathname !== `${apiDe(A)}/temas/orden`) return undefined
      return orden.promesa.then(() => respuestaJson(200, ORDEN_NUEVO))
    }
    return orden
  }
  const seccionDelTema = (id: string) => {
    const seccion = document.querySelector<HTMLElement>(`[data-tema-id="${id}"]`)
    if (seccion === null) throw new Error(`Precondición: el tema ${id} está en pantalla`)
    return seccion
  }

  it.each([
    [
      "en «Ver material» del mismo tema",
      () => within(seccionDelTema(TEMA_1)).getByRole("button", { name: "Ver material" }),
    ],
    ["en el título de la clase", () => screen.getByRole("heading", { level: 1, name: "Historia" })],
    [
      "en «Recursos» de la barra de secciones",
      () => screen.getByRole("link", { name: "Recursos" }),
    ],
  ] as const)(
    "ADM-T3D109 «Bajar» en vuelo, la persona deja el foco %s; el orden se asienta con la clase archivada: al asentarse y al restaurar, el foco no salta",
    async (_nombre, destino) => {
      servidor.rol = "maestro"
      const orden = ordenRetenido()
      const cliente = clienteComoElDeLaApp()
      await montar(`${base("maestro", A)}/trabajo`, cliente)
      await titulo(A)
      await screen.findByText("Lectura de apoyo", {}, ESPERA)
      await quieto(cliente)
      enfocarYPulsar(screen.getByRole("button", { name: "Bajar tema Unidad 1" }))
      await waitFor(() => expect(pedidas("PUT", `${apiDe(A)}/temas/orden`)).toHaveLength(1), ESPERA)

      await archivarYRenovar(cliente, A)
      await verAviso()
      await waitFor(
        () => expect(screen.queryByRole("button", { name: "Bajar tema Unidad 1" })).toBeNull(),
        ESPERA,
      )
      const elegido = destino()
      enfocar(elegido)

      orden.soltar()
      await quieto(cliente)
      expect(document.activeElement).toBe(elegido)

      await restaurarYRenovar(cliente, A)
      await sinAviso()
      await waitFor(
        () =>
          expect(
            screen.getByRole("button", { name: /^(Subir|Bajar) tema Unidad 1$/ }),
          ).toBeInTheDocument(),
        ESPERA,
      )
      await quieto(cliente)
      expect(document.activeElement).toBe(elegido)
    },
  )

  it("ADM-T3D109b: con el foco soltado en <body>, el orden se asienta con la clase archivada: el foco no vuelve solo al restaurar", async () => {
    servidor.rol = "maestro"
    const orden = ordenRetenido()
    const cliente = clienteComoElDeLaApp()
    await montar(`${base("maestro", A)}/trabajo`, cliente)
    await titulo(A)
    await screen.findByText("Lectura de apoyo", {}, ESPERA)
    await quieto(cliente)
    enfocarYPulsar(screen.getByRole("button", { name: "Bajar tema Unidad 1" }))
    await waitFor(() => expect(pedidas("PUT", `${apiDe(A)}/temas/orden`)).toHaveLength(1), ESPERA)

    await archivarYRenovar(cliente, A)
    await verAviso()
    const activo = document.activeElement
    if (!(activo instanceof HTMLElement)) throw new Error("Precondición: hay un elemento activo")
    act(() => activo.blur())
    expect(document.activeElement).toBe(document.body)

    orden.soltar()
    await quieto(cliente)
    expect(document.activeElement).toBe(document.body)
    await restaurarYRenovar(cliente, A)
    await sinAviso()
    await quieto(cliente)
    expect(document.activeElement).toBe(document.body)
  })
})

// ---------------------------------------------------------------------------------------------------
// El único control de las rutas 20 y 21 en una archivada (el enlace de vuelta) con el foco al restaurar,
// y «Restaurar» desde esas rutas: el foco no cae en <body> y el formulario no se lo lleva.

describe("ataque ADMIN-01d1 r3: restaurar desde las rutas 20 y 21", () => {
  const RUTAS = [
    {
      nombre: "ruta 20, foco en «Volver a Recursos»",
      seccion: `/recursos/${RECURSO_ID}/editar`,
      control: () => screen.getByRole("link", { name: "Volver a Recursos" }),
    },
    {
      nombre: "ruta 21, foco en «Volver a la clase»",
      seccion: "/editar",
      control: () => screen.getByRole("link", { name: "Volver a la clase" }),
    },
    {
      nombre: "ruta 20, foco en «Restaurar» del aviso",
      seccion: `/recursos/${RECURSO_ID}/editar`,
      control: () => screen.getByRole("button", { name: "Restaurar" }),
    },
    {
      nombre: "ruta 21, foco en «Restaurar» del aviso",
      seccion: "/editar",
      control: () => screen.getByRole("button", { name: "Restaurar" }),
    },
  ]

  it.each(RUTAS)(
    "ADM-T3D110 $nombre: la clase pasa a activa: el formulario vuelve y el foco va al título",
    async (ruta) => {
      servidor.rol = "admin"
      servidor.archivadas.add(A)
      const cliente = clienteComoElDeLaApp()
      await montar(`${base("admin", A)}${ruta.seccion}`, cliente)
      const h1 = await titulo(A)
      await screen.findByText(ARCHIVADA, {}, ESPERA)
      await quieto(cliente)
      const control = ruta.control()
      enfocar(control)

      await restaurarYRenovar(cliente, A)
      await sinAviso()
      await screen.findByRole("button", { name: "Guardar cambios" }, ESPERA)
      await quieto(cliente)
      expect(control.isConnected).toBe(false)
      expect(document.activeElement).toBe(h1)
      expect(escrituras()).toEqual([])
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// Tabla de efectos de la corrección de T-02, fila 1: «Regenerar código» avisa en los callbacks de
// `mutate`, que TanStack Query no llama con el componente desmontado (en una archivada lo está).

const REGENERADO = "Código nuevo listo"
const NO_REGENERADO = "No pudimos regenerar el código. Inténtalo de nuevo."

describe("ataque ADMIN-01d1 r3: «Regenerar código» en vuelo cuando la clase se archiva", () => {
  const regenerarEnVuelo = async (respuesta: () => Response) => {
    const regenerado = retener()
    servidor.manejador = ({ metodo, url }) => {
      if (metodo !== "POST" || url.pathname !== `${apiDe(A)}/codigo`) return undefined
      return regenerado.promesa.then(respuesta)
    }
    const cliente = clienteComoElDeLaApp()
    await montar(base("maestro", A), cliente)
    await titulo(A)
    await screen.findByText("ABCDEFG", {}, ESPERA)
    await quieto(cliente)
    fireEvent.click(screen.getByRole("button", { name: "Regenerar código" }))
    fireEvent.click(await screen.findByRole("button", { name: "Sí, regenerar" }, ESPERA))
    await waitFor(() => expect(pedidas("POST", `${apiDe(A)}/codigo`)).toHaveLength(1), ESPERA)
    await archivarYRenovar(cliente, A)
    await verAviso()
    await waitFor(
      () => expect(screen.queryByRole("button", { name: "Sí, regenerar" })).toBeNull(),
      ESPERA,
    )
    return { cliente, regenerado }
  }

  it.each([
    ["500", () => errorJson(500, "ERROR_INTERNO", "Falló."), [NO_REGENERADO], []],
    ["200", () => respuestaJson(200, { codigo: "NUEVO12" }), [], [REGENERADO]],
  ] as const)(
    "ADM-T3D111 (control): sin archivar, la respuesta %s da su aviso",
    async (_nombre, respuesta, conError, conExito) => {
      const regenerado = retener()
      servidor.manejador = ({ metodo, url }) => {
        if (metodo !== "POST" || url.pathname !== `${apiDe(A)}/codigo`) return undefined
        return regenerado.promesa.then(respuesta)
      }
      const cliente = clienteComoElDeLaApp()
      await montar(base("maestro", A), cliente)
      await screen.findByText("ABCDEFG", {}, ESPERA)
      await quieto(cliente)
      fireEvent.click(screen.getByRole("button", { name: "Regenerar código" }))
      fireEvent.click(await screen.findByRole("button", { name: "Sí, regenerar" }, ESPERA))
      await waitFor(() => expect(pedidas("POST", `${apiDe(A)}/codigo`)).toHaveLength(1), ESPERA)
      regenerado.soltar()
      await waitFor(() => expect(cliente.isMutating()).toBe(0), ESPERA)
      await quieto(cliente)
      expect(errores()).toEqual([...conError])
      expect(exitos()).toEqual([...conExito])
    },
  )

  it("ADM-T3D111 (a): la respuesta es 409 CLASE_ARCHIVADA con la clase ya archivada: un aviso (matriz de 01d1)", async () => {
    const { cliente, regenerado } = await regenerarEnVuelo(() => archivadaJson())
    regenerado.soltar()
    await waitFor(() => expect(cliente.isMutating()).toBe(0), ESPERA)
    await quieto(cliente)
    expect(errores()).toHaveLength(1)
  })

  it("ADM-T3D111 (b): la respuesta es 500 con la clase ya restaurada: un aviso (T-06: que el maestro no crea que regeneró)", async () => {
    const { cliente, regenerado } = await regenerarEnVuelo(() =>
      errorJson(500, "ERROR_INTERNO", "Falló."),
    )
    await restaurarYRenovar(cliente, A)
    await sinAviso()
    await screen.findByText("ABCDEFG", {}, ESPERA)
    regenerado.soltar()
    await waitFor(() => expect(cliente.isMutating()).toBe(0), ESPERA)
    await quieto(cliente)
    expect(errores()).toEqual([NO_REGENERADO])
    expect(screen.getByText("ABCDEFG")).toBeInTheDocument()
  })

  it("ADM-T3D111 (c): la respuesta es 200 con la clase ya restaurada: el código nuevo se ve y lo dice un aviso", async () => {
    const { cliente, regenerado } = await regenerarEnVuelo(() =>
      respuestaJson(200, { codigo: "NUEVO12" }),
    )
    await restaurarYRenovar(cliente, A)
    await sinAviso()
    await screen.findByText("ABCDEFG", {}, ESPERA)
    regenerado.soltar()
    await screen.findByText("NUEVO12", {}, ESPERA)
    await quieto(cliente)
    expect(exitos()).toEqual([REGENERADO])
  })
})

// ---------------------------------------------------------------------------------------------------
// Tabla de efectos, filas 5, 8, 11 y 15: la escritura en vuelo se asienta con la clase restaurada. Sus
// callbacks de `mutate` no corren: un solo aviso, sin reabrir ni mover el foco de la persona.

const ESCRITURAS_EN_VUELO = [
  {
    nombre: "guardar categorías (fila 15)",
    rol: "maestro" as Rol,
    seccion: "/categorias",
    ancla: () => screen.findByRole("button", { name: "Guardar categorías" }, ESPERA),
    lanzar: async () => {
      fireEvent.click(screen.getByRole("button", { name: "Guardar categorías" }))
    },
    escritura: { metodo: "PUT", ruta: `${apiDe(A)}/categorias` },
    respuesta: () =>
      respuestaJson(200, {
        categorias: [
          { id: CATEGORIA_1, nombre: "Tareas", peso: 50, tareas: 0 },
          { id: CATEGORIA_2, nombre: "Exámenes", peso: 50, tareas: 0 },
        ],
      }),
    exito: "Categorías guardadas",
  },
  {
    nombre: "crear un tema (fila 8)",
    rol: "maestro" as Rol,
    seccion: "/trabajo",
    ancla: () => screen.findByText("Ensayo final", {}, ESPERA),
    lanzar: async () => {
      fireEvent.click(screen.getByRole("button", { name: "Nuevo tema" }))
      fireEvent.change(await screen.findByRole("textbox", { name: "Nombre del tema" }, ESPERA), {
        target: { value: "Unidad 3" },
      })
      fireEvent.click(screen.getByRole("button", { name: "Crear tema" }))
    },
    escritura: { metodo: "POST", ruta: `${apiDe(A)}/temas` },
    respuesta: () =>
      respuestaJson(201, {
        tema: {
          id: "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0003",
          nombre: "Unidad 3",
          orden: 2,
          elementos: 0,
        },
      }),
    exito: "Tema creado",
  },
  {
    nombre: "renombrar un tema (fila 11)",
    rol: "maestro" as Rol,
    seccion: "/trabajo",
    ancla: () => screen.findByText("Ensayo final", {}, ESPERA),
    lanzar: async () => {
      fireEvent.click(screen.getByRole("button", { name: "Renombrar tema Unidad 1" }))
      fireEvent.change(await screen.findByRole("textbox", { name: "Nombre del tema" }, ESPERA), {
        target: { value: "Unidad uno" },
      })
      fireEvent.click(screen.getByRole("button", { name: "Guardar nombre" }))
    },
    escritura: { metodo: "PUT", ruta: `${apiDe(A)}/temas/${TEMA_1}` },
    respuesta: () =>
      respuestaJson(200, { tema: { id: TEMA_1, nombre: "Unidad uno", orden: 0, elementos: 2 } }),
    exito: "Tema renombrado",
  },
]

describe("ataque ADMIN-01d1 r3: una escritura en vuelo que se asienta con la clase restaurada", () => {
  it.each(ESCRITURAS_EN_VUELO)(
    "ADM-T3D112 $nombre: un solo aviso, nada se reabre y el foco de la persona no se mueve",
    async (caso) => {
      servidor.rol = caso.rol
      const respuesta = retener()
      servidor.manejador = ({ metodo, url }) => {
        if (metodo !== caso.escritura.metodo || url.pathname !== caso.escritura.ruta)
          return undefined
        return respuesta.promesa.then(caso.respuesta)
      }
      const cliente = clienteComoElDeLaApp()
      await montar(`${base(caso.rol, A)}${caso.seccion}`, cliente)
      const h1 = await titulo(A)
      await caso.ancla()
      await quieto(cliente)
      await caso.lanzar()
      await waitFor(
        () => expect(pedidas(caso.escritura.metodo, caso.escritura.ruta)).toHaveLength(1),
        ESPERA,
      )

      await archivarYRenovar(cliente, A)
      await verAviso()
      await restaurarYRenovar(cliente, A)
      await sinAviso()
      await caso.ancla()
      enfocar(h1)

      respuesta.soltar()
      await waitFor(() => expect(exitos()).toEqual([caso.exito]), ESPERA)
      await quieto(cliente)
      expect(errores()).toEqual([])
      expect(document.activeElement).toBe(h1)
      expect(screen.queryByRole("button", { name: "Crear tema" })).toBeNull()
      expect(screen.queryByRole("button", { name: "Guardar nombre" })).toBeNull()
      expect(pedidas(caso.escritura.metodo, caso.escritura.ruta)).toHaveLength(1)
    },
  )
})
