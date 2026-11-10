import { publicacionRespuestaSchema } from "@campus/shared"
import { MutationObserver, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { api } from "@/services/apiClient"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { claveClaseDetalle, claveCodigoDeClase } from "./data"

// Tester, ADMIN-01d1, ronda 1. Ataques a la clase archivada en solo lectura (§D-9, Enmienda 3, M-01) con
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
const detallesDe = (id: string) => pedidas("GET", apiDe(id)).length
const escrituras = () => llamadas.filter((l) => l.metodo !== "GET")
const errores = () => aviso.error.mock.calls.map(([texto]) => String(texto))
const exitos = () => aviso.success.mock.calls.map(([texto]) => String(texto))
const avisoFijo = () => screen.queryByText(/^Clase archivada el /)
const titulo = (id: string) =>
  screen.findByRole("heading", { level: 1, name: NOMBRE[id] ?? "" }, ESPERA)
// La raíz de la clase: el primer ancestro del título con tabIndex -1 (el título también lo lleva).
const raizDe = (h1: HTMLElement) => {
  const raiz = h1.parentElement?.closest<HTMLElement>('[tabindex="-1"]') ?? null
  if (raiz === null) throw new Error("Precondición: la raíz de la clase no tiene tabIndex -1")
  return raiz
}
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

// ---------------------------------------------------------------------------------------------------
// Punto 1: el useLayoutEffect de M-01 (a).

describe("ataque ADMIN-01d1 r1: la raíz enfocada y el foco al título (M-01 a)", () => {
  it("ADM-T1D101: la persona enfoca la raíz (clic en blanco) con el detalle nuevo ya pedido y retenido: al llegar archivada, el foco se queda en la raíz", async () => {
    await montar(base("maestro", A))
    const h1 = await titulo(A)
    const campo = await screen.findByRole("textbox", { name: "Anuncio" }, ESPERA)
    enfocar(campo)
    fireEvent.change(campo, { target: { value: "Lean esto" } })
    const detallesAntes = detallesDe(A)

    servidor.archivadas.add(A)
    const detalleNuevo = retener()
    servidor.manejador = ({ metodo, url }) => {
      if (metodo !== "GET" || url.pathname !== apiDe(A)) return undefined
      return detalleNuevo.promesa.then(() => respuestaJson(200, detalle(A)))
    }
    enfocarYPulsar(screen.getByRole("button", { name: "Publicar anuncio" }))
    await waitFor(() => expect(errores()).toEqual([ARCHIVADA]), ESPERA)
    await waitFor(() => expect(detallesDe(A)).toBe(detallesAntes + 1), ESPERA)

    // Clic en un espacio en blanco de la clase, justo antes de que llegue el detalle.
    const raiz = raizDe(h1)
    enfocar(raiz)
    detalleNuevo.soltar()

    expect(await screen.findByText(/^Clase archivada el /, {}, ESPERA)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Publicar anuncio" })).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(raiz), ESPERA)
    expect(errores()).toEqual([ARCHIVADA])
  })

  it("ADM-T1D102: clic en blanco (raíz) y navegar a Recursos: al archivarse, el foco se queda en la raíz; si después enfoca un campo y la clase se restaura y se archiva otra vez, el foco va al título, nunca a <body>", async () => {
    const cliente = clienteComoElDeLaApp()
    const router = await montar(base("maestro", A), cliente)
    const h1 = await titulo(A)
    await screen.findByText("Primer aviso", {}, ESPERA)
    const raiz = raizDe(h1)
    enfocar(raiz)
    await act(() => router.navigate(`${base("maestro", A)}/recursos`))
    await screen.findByText("Guía de estudio", {}, ESPERA)
    expect(document.activeElement).toBe(raiz)
    await quieto(cliente)

    await archivarYRenovar(cliente, A)
    expect(await screen.findByText(/^Clase archivada el /, {}, ESPERA)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Publicar recurso" })).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(raiz), ESPERA)

    // Se restaura en otra pestaña: vuelve el formulario; la persona enfoca su título y se archiva otra vez.
    servidor.archivadas.delete(A)
    await act(() => cliente.invalidateQueries({ queryKey: claveClaseDetalle(A), exact: true }))
    const campo = await screen.findByRole("textbox", { name: "Título del recurso" }, ESPERA)
    expect(avisoFijo()).toBeNull()
    enfocar(campo)
    await archivarYRenovar(cliente, A)
    expect(await screen.findByText(/^Clase archivada el /, {}, ESPERA)).toBeInTheDocument()
    await waitFor(() => expect(document.activeElement).toBe(h1), ESPERA)
  })
})

// ---------------------------------------------------------------------------------------------------
// Puntos 1 y 3: con el foco en cada control de las filas 1 a 20 (perspectiva del admin) y en la fila 5
// (perspectiva del maestro), la clase pasa a archivada: el control sale y el foco nunca cae en <body>.
// ADMIN-01d2 ronda 0 (C-40, §D-R0 01d2, Enmienda 12, P-01): la fila 5 pasa del alumno al maestro. Con N-05,
// el alumno sale de ClaseLayout antes del Outlet y ningún control suyo convive con una clase archivada;
// lo suyo lo cubren ADM-1D208, ADM-1D213a y ADM-1D233. Sigue protegiendo lo mismo con el mismo formulario.

interface ControlDeFila {
  fila: number
  rol: Rol
  seccion: string
  ancla: () => Promise<unknown>
  preparar?: () => Promise<void>
  control: () => HTMLElement
}

const porNombre = (rol: "button" | "link" | "textbox", nombre: string) => () =>
  screen.getByRole(rol, { name: nombre })
const enLaFila = (selector: string, nombre: string) => () => {
  const fila = document.querySelector<HTMLElement>(selector)
  if (fila === null) throw new Error(`Precondición: existe ${selector}`)
  return within(fila).getByRole("button", { name: nombre })
}
const textoEnPantalla = (contenido: string) => () => screen.findByText(contenido, {}, ESPERA)
const abrirComentarios = async () => {
  fireEvent.click(await screen.findByRole("button", { name: "Ver comentarios (1)" }, ESPERA))
  await screen.findByText("Un comentario", {}, ESPERA)
}
const abrirConfirmacionDePublicacion = async () => {
  fireEvent.click(await screen.findByRole("button", { name: "Borrar publicación" }, ESPERA))
  await screen.findByRole("button", { name: "Sí, borrar" }, ESPERA)
}

const CONTROLES: ControlDeFila[] = [
  {
    fila: 1,
    rol: "admin",
    seccion: "",
    ancla: textoEnPantalla("ABCDEFG"),
    control: porNombre("button", "Regenerar código"),
  },
  {
    fila: 2,
    rol: "admin",
    seccion: "",
    ancla: textoEnPantalla("Primer aviso"),
    control: porNombre("link", "Editar clase"),
  },
  {
    fila: 3,
    rol: "admin",
    seccion: "",
    ancla: textoEnPantalla("Primer aviso"),
    control: porNombre("textbox", "Anuncio"),
  },
  {
    fila: 4,
    rol: "admin",
    seccion: "",
    ancla: textoEnPantalla("Primer aviso"),
    control: porNombre("button", "Borrar publicación"),
  },
  {
    fila: 4,
    rol: "admin",
    seccion: "",
    ancla: textoEnPantalla("Primer aviso"),
    preparar: abrirConfirmacionDePublicacion,
    control: porNombre("button", "Sí, borrar"),
  },
  {
    fila: 5,
    rol: "maestro",
    seccion: "",
    ancla: textoEnPantalla("Primer aviso"),
    preparar: abrirComentarios,
    control: () => {
      const comentar = screen.getByRole("button", { name: "Comentar" })
      const formulario = comentar.closest("form")
      if (formulario === null) throw new Error("Precondición: «Comentar» está en un formulario")
      return within(formulario).getByRole("textbox")
    },
  },
  {
    fila: 6,
    rol: "admin",
    seccion: "",
    ancla: textoEnPantalla("Primer aviso"),
    preparar: abrirComentarios,
    control: enLaFila(`[data-comentario-id="${COMENTARIO_ID}"]`, "Borrar"),
  },
  {
    fila: 7,
    rol: "admin",
    seccion: "/trabajo",
    ancla: textoEnPantalla("Ensayo final"),
    control: porNombre("link", "Crear tarea"),
  },
  {
    fila: 8,
    rol: "admin",
    seccion: "/trabajo",
    ancla: textoEnPantalla("Ensayo final"),
    control: porNombre("button", "Nuevo tema"),
  },
  {
    fila: 9,
    rol: "admin",
    seccion: "/trabajo",
    ancla: textoEnPantalla("Ensayo final"),
    control: porNombre("button", "Subir tema Unidad 2"),
  },
  {
    fila: 10,
    rol: "admin",
    seccion: "/trabajo",
    ancla: textoEnPantalla("Ensayo final"),
    control: porNombre("button", "Bajar tema Unidad 1"),
  },
  {
    fila: 11,
    rol: "admin",
    seccion: "/trabajo",
    ancla: textoEnPantalla("Ensayo final"),
    control: porNombre("button", "Renombrar tema Unidad 1"),
  },
  {
    fila: 12,
    rol: "admin",
    seccion: "/trabajo",
    ancla: textoEnPantalla("Ensayo final"),
    control: porNombre("button", "Borrar tema tema Unidad 1"),
  },
  {
    fila: 13,
    rol: "admin",
    seccion: "/trabajo",
    ancla: textoEnPantalla("Ensayo final"),
    control: enLaFila(`[data-elemento-id="${TAREA_ID}"]`, "Mover"),
  },
  {
    fila: 14,
    rol: "admin",
    seccion: "/trabajo",
    ancla: textoEnPantalla("Lectura de apoyo"),
    control: enLaFila(`[data-elemento-id="${MATERIAL_ID}"]`, "Mover"),
  },
  {
    fila: 15,
    rol: "admin",
    seccion: "/categorias",
    ancla: () => screen.findByRole("button", { name: "Guardar categorías" }, ESPERA),
    control: () => {
      const campo = screen.getAllByRole("textbox")[0]
      if (campo === undefined) throw new Error("Precondición: el editor tiene campos")
      return campo
    },
  },
  {
    fila: 16,
    rol: "admin",
    seccion: "/recursos",
    ancla: textoEnPantalla("Guía de estudio"),
    control: porNombre("textbox", "Título del recurso"),
  },
  {
    fila: 17,
    rol: "admin",
    seccion: "/recursos",
    ancla: textoEnPantalla("Guía de estudio"),
    control: porNombre("link", "Editar recurso"),
  },
  {
    fila: 18,
    rol: "admin",
    seccion: "/recursos",
    ancla: textoEnPantalla("Guía de estudio"),
    control: porNombre("button", "Borrar recurso"),
  },
  {
    fila: 19,
    rol: "admin",
    seccion: "/recursos",
    ancla: textoEnPantalla("Guía de estudio"),
    control: enLaFila(`[data-recurso-id="${RECURSO_ID}"]`, "Mover"),
  },
  {
    fila: 20,
    rol: "admin",
    seccion: `/recursos/${RECURSO_ID}/editar`,
    ancla: () => screen.findByRole("button", { name: "Guardar cambios" }, ESPERA),
    control: porNombre("textbox", "Título del recurso"),
  },
]

describe("ataque ADMIN-01d1 r1: cada control de las filas 1 a 20 con el foco cuando la clase pasa a archivada", () => {
  it.each(CONTROLES.map((c, i) => [c.fila, c.rol, i, c] as const))(
    "ADM-T1D103 fila %i (%s, caso %i): el control sale, aparece el aviso y el foco queda dentro de la clase, nunca en <body>",
    async (_fila, _rol, _i, caso) => {
      servidor.rol = caso.rol
      const cliente = clienteComoElDeLaApp()
      await montar(`${base(caso.rol, A)}${caso.seccion}`, cliente)
      const h1 = await titulo(A)
      await caso.ancla()
      await caso.preparar?.()
      await quieto(cliente)
      const control = caso.control()
      enfocar(control)

      await archivarYRenovar(cliente, A)
      expect(await screen.findByText(/^Clase archivada el /, {}, ESPERA)).toBeInTheDocument()
      await waitFor(() => expect(control.isConnected).toBe(false), ESPERA)
      await waitFor(() => {
        const activo = document.activeElement
        expect(activo).not.toBeNull()
        expect(activo).not.toBe(document.body)
        expect(activo?.isConnected).toBe(true)
        expect(raizDe(h1).contains(activo)).toBe(true)
      }, ESPERA)
      expect(escrituras()).toEqual([])
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// Punto 2: cambio de clase y atrás y adelante entre una archivada (A) y una activa (B), con y sin caché.

interface SeccionDeIda {
  nombre: string
  seccion: string
  ancla: () => Promise<unknown>
  // El control de escritura de la sección: en A no está; en B, sí.
  escritura: () => HTMLElement | null
  // Lo que la sección pinta en A en su lugar (las rutas 20 y 21).
  enArchivada?: () => Promise<void>
}

const SECCIONES: SeccionDeIda[] = [
  {
    nombre: "Avisos",
    seccion: "",
    ancla: textoEnPantalla("Primer aviso"),
    escritura: () => screen.queryByRole("button", { name: "Publicar anuncio" }),
  },
  {
    nombre: "Actividades",
    seccion: "/trabajo",
    ancla: textoEnPantalla("Ensayo final"),
    escritura: () => screen.queryByRole("button", { name: "Nuevo tema" }),
  },
  {
    nombre: "Categorías",
    seccion: "/categorias",
    ancla: () => screen.findByRole("heading", { name: "Categorías de calificación" }, ESPERA),
    escritura: () => screen.queryByRole("button", { name: "Guardar categorías" }),
  },
  {
    nombre: "Recursos",
    seccion: "/recursos",
    ancla: textoEnPantalla("Guía de estudio"),
    escritura: () => screen.queryByRole("button", { name: "Publicar recurso" }),
  },
  {
    nombre: "ruta 20",
    seccion: `/recursos/${RECURSO_ID}/editar`,
    ancla: () => Promise.resolve(),
    escritura: () => screen.queryByRole("button", { name: "Guardar cambios" }),
    enArchivada: async () => {
      expect(await screen.findByText(ARCHIVADA, {}, ESPERA)).toBeInTheDocument()
      expect(screen.getByRole("link", { name: "Volver a Recursos" })).toBeInTheDocument()
    },
  },
  {
    nombre: "ruta 21",
    seccion: "/editar",
    ancla: () => Promise.resolve(),
    escritura: () => screen.queryByRole("button", { name: "Guardar cambios" }),
    enArchivada: async () => {
      expect(await screen.findByText(ARCHIVADA, {}, ESPERA)).toBeInTheDocument()
      expect(screen.getByRole("link", { name: "Volver a la clase" })).toHaveAttribute(
        "href",
        base("admin", A),
      )
    },
  },
]

const verArchivada = async (seccion: SeccionDeIda) => {
  await titulo(A)
  expect(await screen.findByText(/^Clase archivada el /, {}, ESPERA)).toBeInTheDocument()
  await seccion.ancla()
  await seccion.enArchivada?.()
  expect(seccion.escritura()).toBeNull()
  expect(screen.queryByRole("heading", { level: 1, name: "Química" })).toBeNull()
}

const verActiva = async (seccion: SeccionDeIda) => {
  await titulo(B)
  await seccion.ancla()
  await waitFor(() => expect(seccion.escritura()).not.toBeNull(), ESPERA)
  expect(avisoFijo()).toBeNull()
  expect(screen.queryByText(ARCHIVADA)).toBeNull()
  expect(screen.queryByRole("heading", { level: 1, name: "Historia" })).toBeNull()
}

describe("ataque ADMIN-01d1 r1: atrás y adelante entre una clase archivada y una activa", () => {
  it.each(SECCIONES.map((s) => [s.nombre, s] as const))(
    "ADM-T1D104 %s: A archivada sin caché, B activa sin caché, atrás a A con caché y adelante a B con caché: cada clase con su estado, sin restos de la otra",
    async (_nombre, seccion) => {
      servidor.rol = "admin"
      servidor.archivadas.add(A)
      const router = await montar(`${base("admin", A)}${seccion.seccion}`)
      await verArchivada(seccion)

      await act(() => router.navigate(`${base("admin", B)}${seccion.seccion}`))
      await verActiva(seccion)

      const detallesA = detallesDe(A)
      await act(() => router.navigate(-1))
      await verArchivada(seccion)
      // Con caché: el detalle de A no se vuelve a pedir dentro del staleTime.
      expect(detallesDe(A)).toBe(detallesA)

      await act(() => router.navigate(1))
      await verActiva(seccion)
      expect(escrituras()).toEqual([])
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// Punto 4: dos 409 CLASE_ARCHIVADA a la vez, y uno de otra clase en vuelo.

describe("ataque ADMIN-01d1 r1: varios 409 CLASE_ARCHIVADA a la vez", () => {
  it("ADM-T1D105: publicar, borrar la publicación y una escritura de otra clase reciben el 409 con el detalle retenido: una sola petición del detalle, un aviso por cada escritura de la clase y ninguno por la otra", async () => {
    const cliente = clienteComoElDeLaApp()
    await montar(base("maestro", A), cliente)
    await titulo(A)
    const campo = await screen.findByRole("textbox", { name: "Anuncio" }, ESPERA)
    fireEvent.change(campo, { target: { value: "Lean esto" } })
    await abrirConfirmacionDePublicacion()
    await quieto(cliente)
    const detallesAntes = detallesDe(A)

    servidor.archivadas.add(A)
    servidor.archivadas.add(B)
    const detalleNuevo = retener()
    servidor.manejador = ({ metodo, url }) => {
      if (metodo !== "GET" || url.pathname !== apiDe(A)) return undefined
      return detalleNuevo.promesa.then(() => respuestaJson(200, detalle(A)))
    }
    fireEvent.click(screen.getByRole("button", { name: "Publicar anuncio" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar" }))
    const ajena = new MutationObserver(cliente, {
      mutationFn: () =>
        api(`${apiDe(B)}/publicaciones`, {
          method: "POST",
          body: { texto: "Otra clase" },
          schema: publicacionRespuestaSchema,
        }),
    })
    await act(async () => {
      await ajena.mutate().catch(() => undefined)
    })

    await waitFor(() => expect(escrituras()).toHaveLength(3), ESPERA)
    await waitFor(() => expect(errores()).toEqual([ARCHIVADA, ARCHIVADA]), ESPERA)
    await waitFor(() => expect(detallesDe(A)).toBe(detallesAntes + 1), ESPERA)

    detalleNuevo.soltar()
    expect(await screen.findByText(/^Clase archivada el /, {}, ESPERA)).toBeInTheDocument()
    await quieto(cliente)
    expect(detallesDe(A)).toBe(detallesAntes + 1)
    expect(detallesDe(B)).toBe(0)
    expect(errores()).toEqual([ARCHIVADA, ARCHIVADA])
    expect(exitos()).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------------
// Punto 5: retry: 1 de app/providers.tsx en GET …/codigo.

describe("ataque ADMIN-01d1 r1: el reintento de GET …/codigo", () => {
  it("ADM-T1D106: el primer 409 del código (intento fallido, a la espera del reintento) no pide el detalle; el segundo, sí, una sola vez; sin avisos", async () => {
    const cliente = clienteComoElDeLaApp()
    await montar(base("maestro", A), cliente)
    expect(await screen.findByText("ABCDEFG", {}, ESPERA)).toBeInTheDocument()
    await quieto(cliente)
    const detallesAntes = detallesDe(A)
    const codigosAntes = pedidas("GET", `${apiDe(A)}/codigo`).length

    servidor.archivadas.add(A)
    act(() => {
      void cliente.invalidateQueries({ queryKey: claveCodigoDeClase(A) })
    })

    await waitFor(() => {
      expect(pedidas("GET", `${apiDe(A)}/codigo`)).toHaveLength(codigosAntes + 1)
      expect(cliente.getQueryState(claveCodigoDeClase(A))?.fetchFailureCount).toBe(1)
      expect(cliente.getQueryState(claveCodigoDeClase(A))?.fetchStatus).toBe("fetching")
    }, ESPERA)
    // Entre el intento fallido y el reintento: la escucha no reaccionó.
    expect(detallesDe(A)).toBe(detallesAntes)
    expect(avisoFijo()).toBeNull()

    await waitFor(
      () => expect(pedidas("GET", `${apiDe(A)}/codigo`)).toHaveLength(codigosAntes + 2),
      ESPERA,
    )
    expect(await screen.findByText(/^Clase archivada el /, {}, ESPERA)).toBeInTheDocument()
    await quieto(cliente)
    expect(detallesDe(A)).toBe(detallesAntes + 1)
    expect(pedidas("GET", `${apiDe(A)}/codigo`)).toHaveLength(codigosAntes + 2)
    expect(errores()).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------------
// Punto 6: «Restaurar» del aviso.

describe("ataque ADMIN-01d1 r1: «Restaurar» del aviso", () => {
  it("ADM-T1D107: con 403 SIN_ACCESO_A_LA_CLASE (otra pestaña la borró): una petición, un aviso, el detalle pasa a su error y el foco va a su contenedor, no a <body>", async () => {
    servidor.rol = "admin"
    servidor.archivadas.add(A)
    await montar(base("admin", A))
    await titulo(A)
    const restaurar = await screen.findByRole("button", { name: "Restaurar" }, ESPERA)

    servidor.borradas.add(A)
    enfocarYPulsar(restaurar)
    fireEvent.click(restaurar)

    const alerta = await screen.findByRole("alert", {}, ESPERA)
    expect(alerta).toHaveTextContent(SIN_ACCESO)
    expect(screen.queryByRole("heading", { level: 1, name: "Historia" })).toBeNull()
    expect(pedidas("POST", `/api/admin/clases/${A}/restaurar`)).toHaveLength(1)
    expect(errores()).toHaveLength(1)
    expect(exitos()).toEqual([])
    await waitFor(() => {
      const activo = document.activeElement
      expect(activo).not.toBe(document.body)
      expect(activo?.contains(alerta)).toBe(true)
    }, ESPERA)
  })

  it("ADM-T1D108: la restauración en vuelo desde la tabla: el aviso de la clase la espera, y al volver a montarlo también; una sola petición, un solo «Clase restaurada» y vuelven los controles", async () => {
    servidor.rol = "admin"
    servidor.archivadas.add(A)
    const enVuelo = retener()
    servidor.manejador = ({ metodo, url }) => {
      if (metodo !== "POST" || url.pathname !== `/api/admin/clases/${A}/restaurar`) return undefined
      return enVuelo.promesa.then(() => {
        servidor.archivadas.delete(A)
        return respuestaJson(200, detalle(A))
      })
    }
    const router = await montar("/admin/clases?estado=archivadas")
    fireEvent.click(await screen.findByRole("button", { name: "Restaurar Historia" }, ESPERA))
    await waitFor(
      () => expect(pedidas("POST", `/api/admin/clases/${A}/restaurar`)).toHaveLength(1),
      ESPERA,
    )

    await act(() => router.navigate(base("admin", A)))
    await titulo(A)
    let restaurar = await screen.findByRole("button", { name: "Restaurar" }, ESPERA)
    await waitFor(() => expect(restaurar).toHaveAttribute("aria-busy", "true"), ESPERA)
    enfocarYPulsar(restaurar)
    fireEvent.click(restaurar)

    // Sale de la clase y vuelve: el aviso se monta de nuevo con la petición todavía en vuelo.
    await act(() => router.navigate("/admin/clases?estado=archivadas"))
    await screen.findByRole("button", { name: "Restaurar Historia" }, ESPERA)
    await act(() => router.navigate(base("admin", A)))
    await titulo(A)
    restaurar = await screen.findByRole("button", { name: "Restaurar" }, ESPERA)
    await waitFor(() => expect(restaurar).toHaveAttribute("aria-busy", "true"), ESPERA)
    enfocarYPulsar(restaurar)
    expect(pedidas("POST", `/api/admin/clases/${A}/restaurar`)).toHaveLength(1)

    enVuelo.soltar()
    expect(
      await screen.findByRole("button", { name: "Publicar anuncio" }, ESPERA),
    ).toBeInTheDocument()
    await waitFor(() => expect(avisoFijo()).toBeNull(), ESPERA)
    await waitFor(() => expect(exitos()).toEqual(["Clase restaurada"]), ESPERA)
    expect(pedidas("POST", `/api/admin/clases/${A}/restaurar`)).toHaveLength(1)
    expect(errores()).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------------
// Punto 7: las rutas 20 y 21 con datos escritos cuando la clase pasa a archivada.

const RUTAS_DE_ESCRITURA = [
  {
    nombre: "ruta 21 (editar la clase)",
    rol: "admin" as Rol,
    seccion: "/editar",
    campo: "Nombre de la clase",
    escritura: `/api/admin/clases/${A}`,
  },
  {
    nombre: "ruta 20 (editar un recurso)",
    rol: "maestro" as Rol,
    seccion: `/recursos/${RECURSO_ID}/editar`,
    campo: "Título del recurso",
    escritura: `${apiDe(A)}/recursos/${RECURSO_ID}`,
  },
]

describe("ataque ADMIN-01d1 r1: las rutas de escritura cuando la clase pasa a archivada", () => {
  it.each(RUTAS_DE_ESCRITURA)(
    "ADM-T1D109 $nombre: guardar recibe el 409: una sola escritura y un solo aviso; después del texto de archivada no sale ninguna petición del formulario y el foco no cae en <body>",
    async (ruta) => {
      servidor.rol = ruta.rol
      const cliente = clienteComoElDeLaApp()
      await montar(`${base(ruta.rol, A)}${ruta.seccion}`, cliente)
      const h1 = await titulo(A)
      const campo = await screen.findByRole("textbox", { name: ruta.campo }, ESPERA)
      fireEvent.change(campo, { target: { value: "Nombre nuevo" } })
      await quieto(cliente)

      servidor.archivadas.add(A)
      const guardar = screen.getByRole("button", { name: "Guardar cambios" })
      enfocarYPulsar(guardar)
      fireEvent.click(guardar)

      expect(await screen.findByText(ARCHIVADA, {}, ESPERA)).toBeInTheDocument()
      expect(screen.queryByRole("textbox", { name: ruta.campo })).toBeNull()
      await quieto(cliente)
      expect(escrituras().map((l) => `${l.metodo} ${l.url.pathname}`)).toEqual([
        `PUT ${ruta.escritura}`,
      ])
      expect(errores()).toEqual([ARCHIVADA])
      await waitFor(() => {
        const activo = document.activeElement
        expect(activo).not.toBe(document.body)
        expect(raizDe(h1).contains(activo)).toBe(true)
      }, ESPERA)
    },
  )

  it.each(RUTAS_DE_ESCRITURA)(
    "ADM-T1D109b $nombre: con lo escrito y el foco en el campo, la clase pasa a archivada sin guardar: ninguna escritura, sin avisos, y el foco va al título",
    async (ruta) => {
      servidor.rol = ruta.rol
      const cliente = clienteComoElDeLaApp()
      await montar(`${base(ruta.rol, A)}${ruta.seccion}`, cliente)
      const h1 = await titulo(A)
      const campo = await screen.findByRole("textbox", { name: ruta.campo }, ESPERA)
      fireEvent.change(campo, { target: { value: "Nombre nuevo" } })
      await quieto(cliente)
      enfocar(campo)

      await archivarYRenovar(cliente, A)
      expect(await screen.findByText(ARCHIVADA, {}, ESPERA)).toBeInTheDocument()
      await quieto(cliente)
      expect(escrituras()).toEqual([])
      expect(errores()).toEqual([])
      await waitFor(() => expect(document.activeElement).toBe(h1), ESPERA)
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// Punto 8: N-01d1-1, el 409 de la subida con la vista desmontada.

describe("ataque ADMIN-01d1 r1: N-01d1-1, el 409 de la subida llega con la clase cerrada", () => {
  it("ADM-T1D110: un solo aviso; el detalle no se pide; al volver antes del staleTime la clase se ve activa (lo declarado) y la siguiente escritura lo corrige con una sola petición del detalle, sin avisos de más ni ciclo", async () => {
    const solicitud = retener()
    servidor.manejador = ({ metodo, url }) => {
      if (metodo !== "POST" || url.pathname !== `${apiDe(A)}/archivos`) return undefined
      return solicitud.promesa.then(() => archivadaJson())
    }
    const cliente = clienteComoElDeLaApp()
    const router = await montar(base("maestro", A), cliente)
    await titulo(A)
    const campo = await screen.findByRole("textbox", { name: "Anuncio" }, ESPERA)
    fireEvent.change(campo, { target: { value: "Lean esto" } })
    const archivo = new File(["contenido"], "lectura.pdf", { type: "application/pdf" })
    fireEvent.change(screen.getByLabelText("Adjuntar archivos"), { target: { files: [archivo] } })
    fireEvent.click(screen.getByRole("button", { name: "Publicar anuncio" }))
    await waitFor(() => expect(pedidas("POST", `${apiDe(A)}/archivos`)).toHaveLength(1), ESPERA)

    await act(() => router.navigate("/maestro"))
    await waitFor(
      () => expect(screen.queryByRole("heading", { level: 1, name: "Historia" })).toBeNull(),
      ESPERA,
    )
    const detallesAntes = detallesDe(A)
    servidor.archivadas.add(A)
    solicitud.soltar()
    await waitFor(
      () =>
        expect(errores()).toEqual([
          "No pudimos subir «lectura.pdf»: Esta clase está archivada: solo se puede consultar.",
        ]),
      ESPERA,
    )
    expect(pedidas("POST", `${apiDe(A)}/publicaciones`)).toEqual([])
    expect(llamadas.filter(({ metodo }) => metodo === "PUT")).toEqual([])

    // ADMIN-01d1 ronda 3 (C-n, revision.md, «ADM-T1D110: fragilidad de la prueba, no defecto del
    // código»): al volver con el detalle viejo, el encabezado pide GET …/codigo, que recibe 409; con
    // retry: 1, su error final llega cerca de 1 s después y la escucha pide el detalle otra vez (la
    // petición extra de la decisión 9). Antes, las dos precondiciones y la cuenta de abajo dependían de
    // mirar antes de ese segundo. Ahora la respuesta del código se retiene, de modo que cada momento lo
    // fija la prueba. Sigue protegiendo lo mismo, con la cuenta exacta en lugar de la que caía a mitad
    // de camino: lo declarado al volver, un aviso por disparador, ninguna solicitud de subida nueva,
    // ningún ciclo y la cuenta acotada.
    const rutaDelCodigo = `${apiDe(A)}/codigo`
    const codigosAntes = pedidas("GET", rutaDelCodigo).length
    const codigo = retener()
    servidor.manejador = ({ metodo, url }) => {
      if (metodo !== "GET" || url.pathname !== rutaDelCodigo) return undefined
      return codigo.promesa.then(() => archivadaJson())
    }
    await act(() => router.navigate(base("maestro", A)))
    await titulo(A)
    const otraVez = await screen.findByRole("textbox", { name: "Anuncio" }, ESPERA)
    await waitFor(
      () => expect(pedidas("GET", rutaDelCodigo)).toHaveLength(codigosAntes + 1),
      ESPERA,
    )
    expect(avisoFijo()).toBeNull()
    expect(detallesDe(A)).toBe(detallesAntes)

    fireEvent.change(otraVez, { target: { value: "Otra vez" } })
    fireEvent.click(screen.getByRole("button", { name: "Publicar anuncio" }))
    expect(await screen.findByText(/^Clase archivada el /, {}, ESPERA)).toBeInTheDocument()
    await waitFor(() => expect(errores()).toHaveLength(2), ESPERA)
    expect(errores()[1]).toBe(ARCHIVADA)
    expect(detallesDe(A)).toBe(detallesAntes + 1)

    // Se suelta el código: reintenta una vez, su error final pide el detalle una vez más y ahí termina.
    codigo.soltar()
    await waitFor(
      () => expect(pedidas("GET", rutaDelCodigo)).toHaveLength(codigosAntes + 2),
      ESPERA,
    )
    await waitFor(() => expect(detallesDe(A)).toBe(detallesAntes + 2), ESPERA)
    await quieto(cliente)
    expect(pedidas("GET", rutaDelCodigo)).toHaveLength(codigosAntes + 2)
    expect(detallesDe(A)).toBe(detallesAntes + 2)
    expect(errores()).toHaveLength(2)
    expect(pedidas("POST", `${apiDe(A)}/archivos`)).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------------------------------
// Un control a medio usar (una confirmación de borrar abierta) cuando la clase pasa a archivada, y
// después se restaura.

const CONFIRMACIONES = [
  {
    nombre: "borrar una publicación (fila 4)",
    seccion: "",
    abrir: () => screen.findByRole("button", { name: "Borrar publicación" }, ESPERA),
    confirmar: "Sí, borrar",
    ancla: textoEnPantalla("Primer aviso"),
  },
  {
    nombre: "borrar un tema (fila 12)",
    seccion: "/trabajo",
    abrir: () => screen.findByRole("button", { name: "Borrar tema tema Unidad 1" }, ESPERA),
    confirmar: "Sí, borrar tema",
    ancla: textoEnPantalla("Ensayo final"),
  },
  {
    nombre: "borrar un recurso (fila 18)",
    seccion: "/recursos",
    abrir: () => screen.findByRole("button", { name: "Borrar recurso" }, ESPERA),
    confirmar: "Sí, borrar recurso",
    ancla: textoEnPantalla("Guía de estudio"),
  },
]

describe("ataque ADMIN-01d1 r1: una confirmación de borrar abierta cuando la clase se archiva y se restaura", () => {
  it.each(CONFIRMACIONES)(
    "ADM-T1D111 $nombre: el «Sí, borrar» recibe el 409; tras «Restaurar» la confirmación no reaparece sola",
    async (caso) => {
      servidor.rol = "admin"
      await montar(`${base("admin", A)}${caso.seccion}`)
      await titulo(A)
      await caso.ancla()
      fireEvent.click(await caso.abrir())
      const si = await screen.findByRole("button", { name: caso.confirmar }, ESPERA)

      servidor.archivadas.add(A)
      enfocarYPulsar(si)
      expect(await screen.findByText(/^Clase archivada el /, {}, ESPERA)).toBeInTheDocument()
      await waitFor(
        () => expect(screen.queryByRole("button", { name: caso.confirmar })).toBeNull(),
        ESPERA,
      )
      expect(errores()).toEqual([ARCHIVADA])

      enfocarYPulsar(screen.getByRole("button", { name: "Restaurar" }))
      await waitFor(() => expect(exitos()).toEqual(["Clase restaurada"]), ESPERA)
      await waitFor(() => expect(avisoFijo()).toBeNull(), ESPERA)
      await caso.ancla()
      await waitFor(
        () => expect(screen.queryByRole("button", { name: caso.confirmar })).toBeNull(),
        ESPERA,
      )
      expect(await caso.abrir()).toBeInTheDocument()
    },
  )
})

// Hermanos de ADM-T1D111: lo abierto a medio usar sin que nadie lo mande (otra pestaña archiva y
// después restaura, y el detalle se renueva). Ningún control de escritura abierto antes del archivado
// reaparece abierto solo al restaurarse.
const ABIERTOS = [
  {
    nombre: "la confirmación de borrar una publicación",
    seccion: "",
    ancla: textoEnPantalla("Primer aviso"),
    abrir: () => screen.findByRole("button", { name: "Borrar publicación" }, ESPERA),
    abierto: () => screen.queryByRole("button", { name: "Sí, borrar" }),
  },
  {
    nombre: "el formulario de «Nuevo tema» (fila 8)",
    seccion: "/trabajo",
    ancla: textoEnPantalla("Ensayo final"),
    abrir: () => screen.findByRole("button", { name: "Nuevo tema" }, ESPERA),
    abierto: () => screen.queryByRole("button", { name: "Crear tema" }),
  },
  {
    nombre: "el formulario de renombrar un tema (fila 11)",
    seccion: "/trabajo",
    ancla: textoEnPantalla("Ensayo final"),
    abrir: () => screen.findByRole("button", { name: "Renombrar tema Unidad 1" }, ESPERA),
    abierto: () => screen.queryByRole("button", { name: "Guardar nombre" }),
  },
  {
    nombre: "la confirmación de borrar un comentario (fila 6)",
    seccion: "",
    ancla: textoEnPantalla("Primer aviso"),
    abrir: async () => {
      await abrirComentarios()
      return enLaFila(`[data-comentario-id="${COMENTARIO_ID}"]`, "Borrar")()
    },
    abierto: () => screen.queryByRole("button", { name: "Sí, borrar comentario" }),
  },
]

describe("ataque ADMIN-01d1 r1: lo abierto a medio usar cuando otra pestaña archiva y restaura", () => {
  it.each(ABIERTOS)(
    "ADM-T1D112 $nombre: al archivarse se oculta y, al restaurarse, no reaparece abierto",
    async (caso) => {
      servidor.rol = "admin"
      const cliente = clienteComoElDeLaApp()
      await montar(`${base("admin", A)}${caso.seccion}`, cliente)
      await titulo(A)
      await caso.ancla()
      fireEvent.click(await caso.abrir())
      await waitFor(() => expect(caso.abierto()).not.toBeNull(), ESPERA)
      await quieto(cliente)

      await archivarYRenovar(cliente, A)
      expect(await screen.findByText(/^Clase archivada el /, {}, ESPERA)).toBeInTheDocument()
      await waitFor(() => expect(caso.abierto()).toBeNull(), ESPERA)

      servidor.archivadas.delete(A)
      await act(() => cliente.invalidateQueries({ queryKey: claveClaseDetalle(A), exact: true }))
      await waitFor(() => expect(avisoFijo()).toBeNull(), ESPERA)
      await caso.ancla()
      await quieto(cliente)
      expect(caso.abierto()).toBeNull()
      expect(escrituras()).toEqual([])
    },
  )
})
