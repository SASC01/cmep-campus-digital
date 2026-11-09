import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { claveClaseDetalle } from "./data"

// Tester, ADMIN-01d1, ronda 2 (sobre la corrección de T-01). Ataques a la clase archivada en solo lectura con
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

const textoEnPantalla = (contenido: string) => () => screen.findByText(contenido, {}, ESPERA)
const abrirComentarios = async () => {
  fireEvent.click(await screen.findByRole("button", { name: "Ver comentarios (1)" }, ESPERA))
  await screen.findByText("Un comentario", {}, ESPERA)
}
const borrarDelComentario = () => {
  const fila = document.querySelector<HTMLElement>(`[data-comentario-id="${COMENTARIO_ID}"]`)
  if (fila === null) throw new Error("Precondición: el comentario está en pantalla")
  return within(fila).queryByRole("button", { name: "Borrar" })
}
const restaurarYRenovar = async (cliente: QueryClient, id: string) => {
  servidor.archivadas.delete(id)
  await act(() => cliente.invalidateQueries({ queryKey: claveClaseDetalle(id), exact: true }))
}
// Un DELETE retenido (la petición sale con la clase activa en el servidor) que responde 204 al soltarlo.
const retenerLosDelete = () => {
  const enVuelo = retener()
  servidor.manejador = ({ metodo }) => {
    if (metodo !== "DELETE") return undefined
    return enVuelo.promesa.then(() => new Response(null, { status: 204 }))
  }
  return enVuelo
}
const deletes = () => llamadas.filter((l) => l.metodo === "DELETE")

interface ConfirmacionDeBorrar {
  nombre: string
  rol: Rol
  seccion: string
  ancla: () => Promise<unknown>
  preparar?: () => Promise<void>
  borrar: () => HTMLElement | null
  si: string
  exito: string
}

const BORRADOS: ConfirmacionDeBorrar[] = [
  {
    nombre: "publicación (admin)",
    rol: "admin",
    seccion: "",
    ancla: textoEnPantalla("Primer aviso"),
    borrar: () => screen.queryByRole("button", { name: "Borrar publicación" }),
    si: "Sí, borrar",
    exito: "Publicación borrada",
  },
  {
    nombre: "comentario (admin)",
    rol: "admin",
    seccion: "",
    ancla: textoEnPantalla("Primer aviso"),
    preparar: abrirComentarios,
    borrar: borrarDelComentario,
    si: "Sí, borrar comentario",
    exito: "Comentario borrado",
  },
  {
    // ADMIN-01d2 ronda 0 (C-41, §D-R0 01d2, Enmienda 12, P-01): del alumno al maestro. Con N-05, el alumno
    // sale de ClaseLayout en una archivada; lo suyo lo cubren ADM-1D208, ADM-1D213a y ADM-1D233. ABIERTOS
    // la hereda. Sigue protegiendo lo mismo: un borrado propio, con el formulario de comentar al lado.
    nombre: "comentario propio (maestro, fila 6)",
    rol: "maestro",
    seccion: "",
    ancla: textoEnPantalla("Primer aviso"),
    preparar: abrirComentarios,
    borrar: borrarDelComentario,
    si: "Sí, borrar comentario",
    exito: "Comentario borrado",
  },
  {
    nombre: "tema (admin)",
    rol: "admin",
    seccion: "/trabajo",
    ancla: textoEnPantalla("Ensayo final"),
    borrar: () => screen.queryByRole("button", { name: "Borrar tema tema Unidad 1" }),
    si: "Sí, borrar tema",
    exito: "Tema borrado",
  },
  {
    nombre: "recurso (admin)",
    rol: "admin",
    seccion: "/recursos",
    ancla: textoEnPantalla("Guía de estudio"),
    borrar: () => screen.queryByRole("button", { name: "Borrar recurso" }),
    si: "Sí, borrar recurso",
    exito: "Recurso borrado",
  },
]

const abrirConfirmacion = async (caso: ConfirmacionDeBorrar) => {
  await waitFor(() => expect(caso.borrar()).not.toBeNull(), ESPERA)
  const boton = caso.borrar()
  if (boton === null) throw new Error("Precondición: el botón de borrar está en pantalla")
  fireEvent.click(boton)
  return screen.findByRole("button", { name: caso.si }, ESPERA)
}

// ---------------------------------------------------------------------------------------------------
// Puntos 1 y 6: el DELETE en vuelo al archivar y restaurar; volver a pulsar «Sí, borrar».

describe("ataque ADMIN-01d1 r2: un borrado en vuelo cuando la clase se archiva y se restaura", () => {
  it.each(BORRADOS)(
    "ADM-T2D101 $nombre: con el DELETE en vuelo, la clase se archiva (la confirmación se cierra) y se restaura; al volver a abrir la confirmación y pulsar «Sí, borrar» dos veces no sale otro DELETE; al soltarlo, un solo aviso",
    async (caso) => {
      servidor.rol = caso.rol
      const cliente = clienteComoElDeLaApp()
      await montar(`${base(caso.rol, A)}${caso.seccion}`, cliente)
      await titulo(A)
      await caso.ancla()
      await caso.preparar?.()
      await quieto(cliente)
      const enVuelo = retenerLosDelete()
      enfocarYPulsar(await abrirConfirmacion(caso))
      await waitFor(() => expect(deletes()).toHaveLength(1), ESPERA)

      await archivarYRenovar(cliente, A)
      expect(await screen.findByText(/^Clase archivada el /, {}, ESPERA)).toBeInTheDocument()
      await waitFor(
        () => expect(screen.queryByRole("button", { name: caso.si })).toBeNull(),
        ESPERA,
      )

      await restaurarYRenovar(cliente, A)
      await waitFor(() => expect(avisoFijo()).toBeNull(), ESPERA)
      expect(screen.queryByRole("button", { name: caso.si })).toBeNull()

      const otraVez = await abrirConfirmacion(caso)
      enfocarYPulsar(otraVez)
      fireEvent.click(otraVez)
      expect(deletes()).toHaveLength(1)

      enVuelo.soltar()
      await waitFor(() => expect(exitos()).toEqual([caso.exito]), ESPERA)
      await quieto(cliente)
      expect(deletes()).toHaveLength(1)
      expect(errores()).toEqual([])
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// Punto 2: archivar y restaurar dos veces seguidas, con la recarga del detalle en vuelo, sin que se
// confirme ningún render con el control abierto y el aviso fijo a la vez.

interface Abierto {
  nombre: string
  rol: Rol
  seccion: string
  ancla: () => Promise<unknown>
  abrir: () => Promise<void>
  abierto: () => HTMLElement | null
}

const ABIERTOS: Abierto[] = [
  ...BORRADOS.map((caso) => ({
    nombre: `la confirmación de borrar ${caso.nombre}`,
    rol: caso.rol,
    seccion: caso.seccion,
    ancla: caso.ancla,
    abrir: async () => {
      await caso.preparar?.()
      await abrirConfirmacion(caso)
    },
    abierto: () => screen.queryByRole("button", { name: caso.si }),
  })),
  {
    nombre: "el formulario de «Nuevo tema»",
    rol: "admin",
    seccion: "/trabajo",
    ancla: textoEnPantalla("Ensayo final"),
    abrir: async () => {
      fireEvent.click(await screen.findByRole("button", { name: "Nuevo tema" }, ESPERA))
    },
    abierto: () => screen.queryByRole("button", { name: "Crear tema" }),
  },
  {
    nombre: "el formulario de renombrar un tema",
    rol: "admin",
    seccion: "/trabajo",
    ancla: textoEnPantalla("Ensayo final"),
    abrir: async () => {
      fireEvent.click(
        await screen.findByRole("button", { name: "Renombrar tema Unidad 1" }, ESPERA),
      )
    },
    abierto: () => screen.queryByRole("button", { name: "Guardar nombre" }),
  },
]

describe("ataque ADMIN-01d1 r2: archivar y restaurar dos veces seguidas con la recarga en vuelo", () => {
  it.each(ABIERTOS)(
    "ADM-T2D102 $nombre: cuatro cambios seguidos con cada recarga retenida, y la que restaura sin cancelar mientras otra marca viejo el detalle; ningún render tiene a la vez el aviso fijo y el control abierto, y al final está cerrado",
    async (caso) => {
      servidor.rol = caso.rol
      const cliente = clienteComoElDeLaApp()
      await montar(`${base(caso.rol, A)}${caso.seccion}`, cliente)
      await titulo(A)
      await caso.ancla()
      await caso.abrir()
      await waitFor(() => expect(caso.abierto()).not.toBeNull(), ESPERA)
      await quieto(cliente)

      // Un observador del DOM anota cualquier cambio en que el aviso fijo y el control abierto
      // conviven: eso sería un render confirmado con el control abierto en una archivada.
      let juntos = 0
      let cambiosVistos = 0
      const observador = new window.MutationObserver(() => {
        cambiosVistos += 1
        if (avisoFijo() !== null && caso.abierto() !== null) juntos += 1
      })
      observador.observe(document.body, { childList: true, subtree: true, characterData: true })

      // Cada recarga del detalle queda retenida y responde con el estado que tenía el servidor al
      // pedirla. La segunda se pide sin cancelar la primera (como la escucha, cancelRefetch: false).
      const retenidas: { soltar: () => void }[] = []
      servidor.manejador = ({ metodo, url }) => {
        if (metodo !== "GET" || url.pathname !== apiDe(A)) return undefined
        const cuerpo = detalle(A)
        const retenida = retener()
        retenidas.push(retenida)
        return retenida.promesa.then(() => respuestaJson(200, cuerpo))
      }
      for (const vuelta of [1, 2]) {
        servidor.archivadas.add(A)
        act(() => {
          void cliente.invalidateQueries({ queryKey: claveClaseDetalle(A), exact: true })
        })
        await waitFor(() => expect(retenidas).toHaveLength(vuelta * 2 - 1), ESPERA)
        retenidas[vuelta * 2 - 2]?.soltar()
        expect(await screen.findByText(/^Clase archivada el /, {}, ESPERA)).toBeInTheDocument()
        expect(caso.abierto()).toBeNull()

        servidor.archivadas.delete(A)
        act(() => {
          void cliente.invalidateQueries({ queryKey: claveClaseDetalle(A), exact: true })
        })
        await waitFor(() => expect(retenidas).toHaveLength(vuelta * 2), ESPERA)
        // Mientras la recarga que restaura sigue en vuelo, otra marca viejo el detalle sin cancelarla.
        act(() => {
          void cliente.invalidateQueries(
            { queryKey: claveClaseDetalle(A), exact: true },
            { cancelRefetch: false },
          )
        })
        retenidas[vuelta * 2 - 1]?.soltar()
        await waitFor(() => expect(avisoFijo()).toBeNull(), ESPERA)
        await caso.ancla()
        expect(caso.abierto()).toBeNull()
      }
      await quieto(cliente)
      observador.disconnect()
      expect(cambiosVistos, "Precondición: el observador vio los cambios").toBeGreaterThan(0)
      expect(juntos).toBe(0)
      expect(caso.abierto()).toBeNull()
      expect(retenidas).toHaveLength(4)
      expect(escrituras()).toEqual([])
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// Punto 3: ruta 20, la recarga tras un conflicto en vuelo cuando la clase se archiva.

describe("ataque ADMIN-01d1 r2: la recarga tras un conflicto en la ruta 20 cuando la clase se archiva", () => {
  const prepararConflicto = () => {
    let version = 0
    const recarga = retener()
    let recargasPedidas = 0
    servidor.manejador = ({ metodo, url }) => {
      if (url.pathname !== `${apiDe(A)}/recursos/${RECURSO_ID}`) return undefined
      if (metodo === "PUT") {
        if (servidor.archivadas.has(A)) return archivadaJson()
        version = 1
        return errorJson(409, "RECURSO_MODIFICADO", "Otra persona guardó este recurso.")
      }
      if (version === 0) {
        return respuestaJson(200, { recurso: { ...recursoDeLaLista, version: 0, tema: null } })
      }
      recargasPedidas += 1
      return recarga.promesa.then(() =>
        respuestaJson(200, {
          recurso: { ...recursoDeLaLista, titulo: "Guía actualizada", version: 1, tema: null },
        }),
      )
    }
    return { recarga, recargasPedidas: () => recargasPedidas }
  }

  it("ADM-T2D103: la recarga llega con la clase archivada; al restaurar, el formulario nace con la versión de la caché y sin quitarle el foco a la persona", async () => {
    const { recarga, recargasPedidas } = prepararConflicto()
    const cliente = clienteComoElDeLaApp()
    await montar(`${base("maestro", A)}/recursos/${RECURSO_ID}/editar`, cliente)
    const h1 = await titulo(A)
    const campo = await screen.findByRole("textbox", { name: "Título del recurso" }, ESPERA)
    fireEvent.change(campo, { target: { value: "Guía nueva" } })
    enfocarYPulsar(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(recargasPedidas()).toBe(1), ESPERA)

    await archivarYRenovar(cliente, A)
    expect(await screen.findByText(ARCHIVADA, {}, ESPERA)).toBeInTheDocument()
    recarga.soltar()
    await waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
    expect(screen.queryByRole("textbox", { name: "Título del recurso" })).toBeNull()
    enfocar(h1)

    await restaurarYRenovar(cliente, A)
    const otraVez = await screen.findByRole("textbox", { name: "Título del recurso" }, ESPERA)
    expect(otraVez).toHaveValue("Guía actualizada")
    await quieto(cliente)
    expect(document.activeElement).toBe(h1)
  })

  it("ADM-T2D103b: la recarga sigue en vuelo cuando la clase se restaura y llega después: el formulario no se reinicia ni se lleva el foco de la persona", async () => {
    const { recarga, recargasPedidas } = prepararConflicto()
    const cliente = clienteComoElDeLaApp()
    await montar(`${base("maestro", A)}/recursos/${RECURSO_ID}/editar`, cliente)
    const h1 = await titulo(A)
    const campo = await screen.findByRole("textbox", { name: "Título del recurso" }, ESPERA)
    fireEvent.change(campo, { target: { value: "Guía nueva" } })
    enfocarYPulsar(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(recargasPedidas()).toBe(1), ESPERA)

    await archivarYRenovar(cliente, A)
    expect(await screen.findByText(ARCHIVADA, {}, ESPERA)).toBeInTheDocument()
    await restaurarYRenovar(cliente, A)
    const nacido = await screen.findByRole("textbox", { name: "Título del recurso" }, ESPERA)
    // La persona ya está en la clase restaurada y escribe otra cosa; el foco lo deja en el título.
    fireEvent.change(nacido, { target: { value: "Lo que escribo después" } })
    enfocar(h1)

    recarga.soltar()
    await quieto(cliente)
    const campoFinal = screen.getByRole("textbox", { name: "Título del recurso" })
    expect.soft(document.activeElement).toBe(h1)
    expect.soft(campoFinal).toHaveValue("Lo que escribo después")
  })
})

// ---------------------------------------------------------------------------------------------------
// Punto 4: los estados de lectura se conservan al archivar y restaurar, con el foco dentro.

const LECTURAS = [
  {
    nombre: "«Ver comentarios» de una publicación",
    seccion: "",
    ancla: textoEnPantalla("Primer aviso"),
    ver: "Ver comentarios (1)",
    ocultar: "Ocultar comentarios",
    contenido: "Un comentario",
  },
  {
    nombre: "«Ver material» en Actividades",
    seccion: "/trabajo",
    ancla: textoEnPantalla("Lectura de apoyo"),
    ver: "Ver material",
    ocultar: "Ocultar material",
    contenido: "Leer el capítulo 2.",
  },
  {
    nombre: "«Ver recurso» en Recursos",
    seccion: "/recursos",
    ancla: textoEnPantalla("Guía de estudio"),
    ver: "Ver recurso",
    ocultar: "Ocultar recurso",
    contenido: null,
  },
]

describe("ataque ADMIN-01d1 r2: lo que se lee sigue abierto al archivar y restaurar", () => {
  it.each(LECTURAS)(
    "ADM-T2D104 $nombre: abierto y con el foco en «Ocultar», sigue abierto y con el foco al archivar y al restaurar",
    async (caso) => {
      servidor.rol = "maestro"
      const cliente = clienteComoElDeLaApp()
      await montar(`${base("maestro", A)}${caso.seccion}`, cliente)
      await titulo(A)
      await caso.ancla()
      fireEvent.click(await screen.findByRole("button", { name: caso.ver }, ESPERA))
      const ocultar = await screen.findByRole("button", { name: caso.ocultar }, ESPERA)
      if (caso.contenido !== null) {
        expect(await screen.findByText(caso.contenido, {}, ESPERA)).toBeInTheDocument()
      }
      await quieto(cliente)
      enfocar(ocultar)

      await archivarYRenovar(cliente, A)
      expect(await screen.findByText(/^Clase archivada el /, {}, ESPERA)).toBeInTheDocument()
      await quieto(cliente)
      expect(ocultar.isConnected).toBe(true)
      expect(document.activeElement).toBe(ocultar)
      if (caso.contenido !== null) expect(screen.getByText(caso.contenido)).toBeInTheDocument()

      await restaurarYRenovar(cliente, A)
      await waitFor(() => expect(avisoFijo()).toBeNull(), ESPERA)
      await quieto(cliente)
      expect(ocultar.isConnected).toBe(true)
      expect(document.activeElement).toBe(ocultar)
      if (caso.contenido !== null) expect(screen.getByText(caso.contenido)).toBeInTheDocument()
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// Punto 5: «Subir» o «Bajar» en vuelo al archivar y restaurar, con el foco ya en otra sección.

describe("ataque ADMIN-01d1 r2: el orden de los temas en vuelo cuando la clase se archiva y se restaura", () => {
  it.each([
    ["se asienta con la clase restaurada", true],
    ["se asienta con la clase todavía archivada", false],
  ] as const)(
    "ADM-T2D105 «Subir» en vuelo, la persona lleva el foco a «Recursos» y la clase se archiva; %s: el foco no se mueve",
    async (_nombre, restaurarAntes) => {
      servidor.rol = "admin"
      const orden = retener()
      servidor.manejador = ({ metodo, url }) => {
        if (metodo !== "PUT" || url.pathname !== `${apiDe(A)}/temas/orden`) return undefined
        return orden.promesa.then(() =>
          respuestaJson(200, {
            temas: [
              { id: TEMA_2, nombre: "Unidad 2", orden: 0, elementos: 0 },
              { id: TEMA_1, nombre: "Unidad 1", orden: 1, elementos: 2 },
            ],
            sinTema: 0,
          }),
        )
      }
      const cliente = clienteComoElDeLaApp()
      await montar(`${base("admin", A)}/trabajo`, cliente)
      await titulo(A)
      await screen.findByText("Ensayo final", {}, ESPERA)
      await quieto(cliente)
      enfocarYPulsar(screen.getByRole("button", { name: "Subir tema Unidad 2" }))
      await waitFor(() => expect(pedidas("PUT", `${apiDe(A)}/temas/orden`)).toHaveLength(1), ESPERA)

      await archivarYRenovar(cliente, A)
      expect(await screen.findByText(/^Clase archivada el /, {}, ESPERA)).toBeInTheDocument()
      const recursos = screen.getByRole("link", { name: "Recursos" })
      enfocar(recursos)
      if (restaurarAntes) {
        await restaurarYRenovar(cliente, A)
        await waitFor(() => expect(avisoFijo()).toBeNull(), ESPERA)
      }

      orden.soltar()
      await quieto(cliente)
      expect(document.activeElement).toBe(recursos)
      if (!restaurarAntes) {
        await restaurarYRenovar(cliente, A)
        await waitFor(() => expect(avisoFijo()).toBeNull(), ESPERA)
        await quieto(cliente)
        expect(document.activeElement).toBe(recursos)
      }
      expect(pedidas("PUT", `${apiDe(A)}/temas/orden`)).toHaveLength(1)
    },
  )
})
