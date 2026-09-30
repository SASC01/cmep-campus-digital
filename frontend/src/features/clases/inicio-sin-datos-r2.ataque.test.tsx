import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it, vi } from "vitest"

import { InicioEstudianteView } from "./inicio-estudiante-view"
import { InicioMaestroView } from "./inicio-maestro-view"

// Tester, CLASES-a, ronda 2 (T-09, T-10). Los inicios con la consulta de clases sin error, sin
// carga y sin datos (por ejemplo, una consulta desactivada o todavía sin respuesta): nunca deben
// afirmar "Aún no tienes clases" ni un titular con dato que la API no dio. Se doblan los hooks del
// módulo para producir exactamente ese estado.

const estado = vi.hoisted(() => ({
  consulta: {
    data: undefined as unknown,
    isError: false,
    isLoading: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: () => Promise.resolve(),
  },
}))

vi.mock("./hooks", () => ({
  useNombreDeSesion: () => ({ data: "Ana López" }),
  useClasesInscritas: () => estado.consulta,
  useClasesImpartidas: () => estado.consulta,
  useUnirseAClase: () => ({ isPending: false, mutate: vi.fn() }),
}))

const TEXTOS_QUE_AFIRMAN_DATOS = [
  "Aún no tienes clases",
  "Aún no estás en ninguna clase",
  /Estás en \d+ clases?/,
  /Tienes \d+ clases?/,
]

describe("ataque CLASES-a r2: inicios sin datos de la API", () => {
  for (const [rol, Vista] of [
    ["estudiante", InicioEstudianteView],
    ["maestro", InicioMaestroView],
  ] as const) {
    it(`inicio del ${rol}: sin error, sin carga y sin datos, no afirma vacío ni total`, () => {
      render(
        <MemoryRouter>
          <Vista />
        </MemoryRouter>,
      )
      expect(screen.getByText("Hola, Ana López")).toBeInTheDocument()
      for (const texto of TEXTOS_QUE_AFIRMAN_DATOS) {
        expect(screen.queryByText(texto), String(texto)).toBe(null)
      }
    })
  }
})
