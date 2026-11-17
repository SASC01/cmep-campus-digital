// FORO-01e, ronda 2 del tester: DH-21 (a). Quitar a un alumno de una clase marca viejas, sin pedirlas, las
// entregas de sus tareas, sus foros (con «Participantes») y sus calificaciones; otra clase que tiene al
// mismo alumno no se toca. Llama al gancho de producción useQuitarAlumno. Id ATQ-FORO-157.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { clavePrefijoDeCalificaciones } from "@/services/calificacionesService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import { claveForo, clavePrefijoDeForos } from "@/services/trabajoService"

import { useQuitarAlumno } from "./hooks"

const aviso = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
)
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const uuid = (prefijo: string, n: number) =>
  `${prefijo}-1d0f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const CLASE_A = uuid("2a2b3c4d", 1)
const CLASE_B = uuid("2a2b3c4d", 2)
const ALUMNO = uuid("4a4b3c4d", 1)
const FORO_A = uuid("5a5b3c4d", 1)
const FORO_B = uuid("5a5b3c4d", 2)
const TAREA = uuid("5c5b3c4d", 1)

const llamadas: string[] = []

function Quitar() {
  const quitar = useQuitarAlumno(CLASE_A)
  return (
    <div>
      <button type="button" onClick={() => quitar.mutate({ id: ALUMNO, nombre: "Ana López" })}>
        Quitar a Ana
      </button>
      <p>{`Estado: ${quitar.status}`}</p>
    </div>
  )
}

const clavesDe = (claseId: string, foroId: string) => [
  [...clavePrefijoDeForos(claseId), "lista"],
  [...claveForo(claseId, foroId), "participantes", "lista"],
  [...claveForo(claseId, foroId), "participantes", "alumno", ALUMNO],
  ["clases", claseId, "tareas", TAREA, "entregas", "lista"],
  [...clavePrefijoDeCalificaciones(claseId), "gradebook"],
]

beforeEach(() => {
  establecerToken("token-de-prueba")
  llamadas.length = 0
  aviso.success.mockClear()
  aviso.error.mockClear()
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = new URL(String(entrada), "http://x")
      llamadas.push(`${init?.method ?? "GET"} ${url.pathname}`)
      return Promise.resolve(new Response(null, { status: 204 }))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
})

describe("ATQ-FORO-157 · DH-21: quitar a un alumno solo marca viejo lo de su clase", () => {
  it("ATQ-FORO-157: «Participantes», las entregas y las calificaciones de la clase A quedan viejas sin pedirse; las de la clase B, con el mismo alumno, no se tocan", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
    })
    const deA = clavesDe(CLASE_A, FORO_A)
    const deB = clavesDe(CLASE_B, FORO_B)
    for (const clave of [...deA, ...deB]) queryClient.setQueryData(clave, { semilla: true })
    render(
      <QueryClientProvider client={queryClient}>
        <Quitar />
      </QueryClientProvider>,
    )
    fireEvent.click(screen.getByRole("button", { name: "Quitar a Ana" }))
    await waitFor(() => expect(screen.getByText(/^Estado: /)).toHaveTextContent("success"))
    expect(llamadas).toEqual([`DELETE /api/clases/${CLASE_A}/alumnos/${ALUMNO}`])
    for (const clave of deA) {
      expect(queryClient.getQueryState(clave)?.isInvalidated, JSON.stringify(clave)).toBe(true)
    }
    for (const clave of deB) {
      expect(queryClient.getQueryState(clave)?.isInvalidated, JSON.stringify(clave)).toBe(false)
    }
  })
})
