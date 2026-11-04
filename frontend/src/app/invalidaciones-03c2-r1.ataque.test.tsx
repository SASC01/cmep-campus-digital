import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  clavePrefijoDeRecursos,
  claveRecursos,
  claveTemasDeLaSeccion,
} from "@/features/clases/data"
import { useCrearRecurso } from "@/features/clases/hooks"
import { useBorrarTarea, useCrearTarea, useEditarTarea } from "@/features/tareas/hooks"
import { clavePublicaciones } from "@/services/clasesService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import { claveTemas } from "@/services/trabajoService"

// Ataque del Tester (CLASES-03c2, ronda 1): la lista de temas por sección de "Actividades de
// aprendizaje" se marca vieja cuando cambia lo que cuenta: al publicar un material desde Avisos
// (features/clases) y al crear, editar o borrar una tarea (features/tareas). Las invalidaciones de hoy
// usan la clave de los temas sin `exact`. Vive en app/ porque un módulo de features/ no importa de
// otro (regla 9). Sin reloj.
// CLASES-03d ronda 0, adenda 1 (C-23 ampliada por el arbitraje de la ronda 0 de 03d; §D-8.4): sale la
// fila "publicar un material" (4 → 3 casos), con su rama del act, su gancho, su doble material() y la
// importación de useCrearPublicacion. Avisos ya no publica materiales: la rama de material sale de
// useCrearPublicacion, y publicar un recurso vuelve con useCrearRecurso en la ronda 1 de 03d (hoy ese
// gancho no existe y su importación rompería el tsc). Las tres filas de tareas no cambian.
// CLASES-03d ronda 1 (indicación 1 de la verificación del resumen de 03d; arbitraje de la ronda 0,
// P-03d-4, C-23): vuelve CL3-2R1-19 "publicar un recurso" con useCrearRecurso, como caso propio porque
// lo que se afirma es otro: tras el 201 quedan viejas las listas de temas de "docente" y de
// "aprendizaje" y una lista de "Recursos", y no el muro (§D-8.4: "ya no el muro"). Las tres filas de
// tareas no cambian. El archivo pasa de 3 a 4 casos.

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "8a8b3c4d-1c1f-4b8e-9a1e-000000000001"
const AUTOR = {
  id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
  nombre: "Luis Pérez",
  administracion: false,
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const tarea = () => ({
  tarea: {
    id: TAREA_ID,
    titulo: "Ensayo",
    instrucciones: "",
    fechaLimite: "2030-01-10T15:00:00.000Z",
    puntos: 10,
    aceptaTardias: true,
    requiereAdjuntos: true,
    version: 1,
    categoria: null,
    tema: null,
    rubrica: [],
    adjuntos: [],
    autor: AUTOR,
    creadoEn: "2030-01-01T15:30:00.000Z",
    actualizadoEn: "2030-01-01T15:30:00.000Z",
    puedeEditar: true,
    puedeBorrar: true,
  },
})

const montar = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const lista = { temas: [], sinTema: 0 }
  queryClient.setQueryData(claveTemasDeLaSeccion(CLASE_ID, "actividades"), lista)
  queryClient.setQueryData(claveTemas(CLASE_ID), lista)
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, envoltorio }
}

const viejaLaSeccion = (queryClient: QueryClient) =>
  queryClient.getQueryState(claveTemasDeLaSeccion(CLASE_ID, "actividades"))?.isInvalidated

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("ataque CLASES-03c2 r1 · la lista por sección se marca vieja", () => {
  it.each([
    ["crear una tarea", () => respuestaJson(201, tarea())],
    ["editar una tarea", () => respuestaJson(200, tarea())],
    ["borrar una tarea", () => new Response(null, { status: 204 })],
  ] as const)(
    "CL3-2R1-19: %s marca vieja la lista de temas de Actividades",
    async (accion, respuesta) => {
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>(() => Promise.resolve(respuesta())),
      )
      const { queryClient, envoltorio } = montar()
      expect(viejaLaSeccion(queryClient)).toBe(false)
      const { result } = renderHook(
        () => ({
          crear: useCrearTarea(CLASE_ID),
          editar: useEditarTarea(CLASE_ID, TAREA_ID),
          borrar: useBorrarTarea(CLASE_ID, TAREA_ID),
        }),
        { wrapper: envoltorio },
      )
      act(() => {
        if (accion === "crear una tarea") {
          result.current.crear.mutate({} as Parameters<typeof result.current.crear.mutate>[0])
          return
        }
        if (accion === "editar una tarea") {
          result.current.editar.mutate({} as Parameters<typeof result.current.editar.mutate>[0])
          return
        }
        result.current.borrar.mutate(false)
      })
      await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
      await waitFor(() => expect(viejaLaSeccion(queryClient)).toBe(true))
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )
})

describe("ataque CLASES-03d r1 · publicar un recurso marca viejas sus listas y no el muro", () => {
  it("CL3-2R1-19: publicar un recurso: tras el 201 quedan viejas las listas de temas de «docente» y de «aprendizaje» y la lista de «Recursos», y el muro no", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() =>
        Promise.resolve(
          respuestaJson(201, {
            publicacion: {
              id: "6a6b3c4d-1c1f-4b8e-9a1e-000000000001",
              tipo: "material",
              titulo: "Lectura",
              texto: "Capítulo 3",
              autor: AUTOR,
              creadoEn: "2030-01-01T15:30:00.000Z",
              comentarios: 0,
              adjuntos: [],
              puedeBorrar: true,
              tarea: null,
            },
          }),
        ),
      ),
    )
    const { queryClient, envoltorio } = montar()
    const lista = { temas: [], sinTema: 0 }
    queryClient.setQueryData(claveTemasDeLaSeccion(CLASE_ID, "docente"), lista)
    queryClient.setQueryData(claveTemasDeLaSeccion(CLASE_ID, "aprendizaje"), lista)
    const deRecursos = claveRecursos(CLASE_ID, "docente", "sin-tema")
    queryClient.setQueryData(deRecursos, {
      pages: [{ recursos: [], siguienteCursor: null }],
      pageParams: [undefined],
    })
    queryClient.setQueryData(clavePublicaciones(CLASE_ID), {
      pages: [{ publicaciones: [], siguienteCursor: null }],
      pageParams: [undefined],
    })
    const vieja = (clave: readonly unknown[]) => queryClient.getQueryState(clave)?.isInvalidated
    expect(vieja(claveTemasDeLaSeccion(CLASE_ID, "docente"))).toBe(false)
    expect(vieja(deRecursos)).toBe(false)
    expect(deRecursos.slice(0, 3)).toEqual([...clavePrefijoDeRecursos(CLASE_ID)])
    const { result } = renderHook(() => useCrearRecurso(CLASE_ID), { wrapper: envoltorio })
    act(() => {
      result.current.mutate({
        tipo: "material",
        titulo: "Lectura",
        texto: "Capítulo 3",
        archivoIds: [],
      })
    })
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(vieja(claveTemasDeLaSeccion(CLASE_ID, "docente"))).toBe(true))
    expect(vieja(claveTemasDeLaSeccion(CLASE_ID, "aprendizaje"))).toBe(true)
    expect(vieja(deRecursos)).toBe(true)
    expect(vieja(clavePublicaciones(CLASE_ID))).toBe(false)
    expect(aviso.error).not.toHaveBeenCalled()
  })
})
