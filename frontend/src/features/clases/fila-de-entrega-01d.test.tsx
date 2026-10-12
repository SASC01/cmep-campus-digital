import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { vencimientoDe } from "@/lib/vencimiento"

import { FilaDeEntrega } from "./components/fila-de-entrega"
import { CLASES_DEL_CUADRO_DE_ENTREGA, CLASES_DEL_CUADRO_DE_FECHA } from "./data"

// ENTREGAS-01d (PR-1D12, §D-9.8, DESIGN.md §7.7): la fila de "Trabajo de clase" del alumno dice el
// estado de su entrega con el color del cuadro; sin `entrega` (maestro y admin) la fila no cambia.
// Reloj fijo.

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const VENCIDA = "2030-01-05T16:00:00.000Z"
const PENDIENTE = "2030-01-25T16:00:00.000Z"
const PROXIMA = "2030-01-11T16:00:00.000Z"

const fila = (fechaLimite: string, entrega?: Parameters<typeof FilaDeEntrega>[0]["entrega"]) => {
  render(
    <MemoryRouter>
      <FilaDeEntrega
        titulo="Ensayo"
        fechaLimite={fechaLimite}
        destino="/estudiante/clases/x/tareas/y"
        {...(entrega === undefined ? {} : { entrega })}
      />
    </MemoryRouter>,
  )
  const enlace = screen.getByRole("link", { name: /^Tarea: Ensayo/ })
  const cuadro = enlace.querySelector("[aria-hidden='true']")
  if (cuadro === null) throw new Error("Precondición: la fila tiene su cuadro de fecha")
  return { enlace, cuadro }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("FilaDeEntrega del alumno (PR-1D12)", () => {
  it.each([
    {
      nombre: "entregada",
      entrega: { estado: "entregado", conRetraso: false },
      fecha: VENCIDA,
      texto: "Entregado",
      clave: "entregado",
    },
    {
      nombre: "con retraso",
      entrega: { estado: "entregado", conRetraso: true },
      fecha: VENCIDA,
      texto: "Entregado con retraso",
      clave: "entregado-con-retraso",
    },
    {
      nombre: "calificada",
      entrega: { estado: "calificado", conRetraso: false },
      fecha: PENDIENTE,
      texto: "Calificado",
      clave: "calificado",
    },
    {
      nombre: "vencida sin entrega",
      entrega: null,
      fecha: VENCIDA,
      texto: "Sin entregar",
      clave: "sin-entregar",
    },
    {
      nombre: "vencida y anulada",
      entrega: { estado: "asignado", conRetraso: false },
      fecha: VENCIDA,
      texto: "Sin entregar",
      clave: "sin-entregar",
    },
  ] as const)(
    "PR-1D12: $nombre dice «$texto» con el color del cuadro de §7.7",
    ({ entrega, fecha, texto, clave }) => {
      const { enlace, cuadro } = fila(fecha, entrega)
      expect(enlace).toHaveTextContent(texto)
      expect(cuadro.className).toContain(CLASES_DEL_CUADRO_DE_ENTREGA[clave].cuadro)
      expect(screen.getByText(texto).className).toContain(
        CLASES_DEL_CUADRO_DE_ENTREGA[clave].estado,
      )
    },
  )

  it("PR-1D12: una tarea pendiente sin entregar conserva el texto y el color de vencimientoDe", () => {
    for (const fecha of [PENDIENTE, PROXIMA]) {
      cleanup()
      const { enlace, cuadro } = fila(fecha, null)
      const vencimiento = vencimientoDe(fecha, AHORA)
      expect(enlace).toHaveTextContent(vencimiento.texto)
      expect(cuadro.className).toContain(CLASES_DEL_CUADRO_DE_FECHA[vencimiento.estado].cuadro)
    }
  })

  it("PR-1D12: sin entrega (maestro y admin) la fila no cambia: una vencida dice «Venció el …»", () => {
    const { enlace, cuadro } = fila(VENCIDA)
    expect(enlace).toHaveTextContent(/Venció el /)
    expect(enlace).not.toHaveTextContent("Sin entregar")
    expect(cuadro.className).toContain(CLASES_DEL_CUADRO_DE_FECHA.vencida.cuadro)
  })
})
