import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { claveTemasDeLaSeccion } from "@/features/clases/data"
import { useCrearPublicacion } from "@/features/clases/hooks"
import { useBorrarTarea, useCrearTarea, useEditarTarea } from "@/features/tareas/hooks"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import { claveTemas } from "@/services/trabajoService"

// Ataque del Tester (CLASES-03c2, ronda 1): la lista de temas por sección de "Actividades de
// aprendizaje" se marca vieja cuando cambia lo que cuenta: al publicar un material desde Avisos
// (features/clases) y al crear, editar o borrar una tarea (features/tareas). Las invalidaciones de hoy
// usan la clave de los temas sin `exact`. Vive en app/ porque un módulo de features/ no importa de
// otro (regla 9). Sin reloj.

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

const material = () => ({
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
    ["publicar un material", () => respuestaJson(201, material())],
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
          publicar: useCrearPublicacion(CLASE_ID),
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
        if (accion === "borrar una tarea") {
          result.current.borrar.mutate(false)
          return
        }
        result.current.publicar.mutate({
          tipo: "material",
          titulo: "Lectura",
          texto: "Capítulo 3",
          temaId: null,
          archivoIds: [],
        } as Parameters<typeof result.current.publicar.mutate>[0])
      })
      await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
      await waitFor(() => expect(viejaLaSeccion(queryClient)).toBe(true))
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )
})
