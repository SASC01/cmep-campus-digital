import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { formatearFechaLarga } from "@/lib/format"
import { TEXTO_FECHA_NO_DISPONIBLE, vencimientoDe } from "@/lib/vencimiento"

import { FilaDeEntrega } from "./components/fila-de-entrega"

// Ataque ENTREGAS-01d, ronda 1 (tester): la fila de «Trabajo de clase» del alumno (§D-9.8) sigue al
// reloj de la vista y no a la hora real, en la frontera de la fecha límite y con cada estado; sin
// entrega (maestro y admin) dice el vencimiento de siempre. Reloj fijo en todas.

type Entrega = Parameters<typeof FilaDeEntrega>[0]["entrega"]

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const segundos = (s: number) => new Date(AHORA.getTime() + s * 1000).toISOString()

const textoDeLaFila = (fechaLimite: string, entrega?: Entrega) => {
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
  const texto = enlace.textContent
  cleanup()
  return texto
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("ataque ENTREGAS-01d r1: la fila del alumno en la frontera de la fecha límite", () => {
  it("sin entrega: un segundo antes del límite conserva el texto de vencimientoDe; en el límite exacto y un segundo después dice «Sin entregar» (R-08 aceptado)", () => {
    const antes = textoDeLaFila(segundos(1), null)
    expect(antes).toContain(vencimientoDe(segundos(1), AHORA).texto)
    expect(antes).toMatch(/Vence /)
    expect(antes).not.toContain("Sin entregar")
    expect(textoDeLaFila(segundos(0), null)).toContain("Sin entregar")
    expect(textoDeLaFila(segundos(-1), null)).toContain("Sin entregar")
  })

  it("la misma fila sigue al reloj de la prueba: con el reloj antes del límite dice «Vence…» y con el reloj después, «Sin entregar»", () => {
    const limite = "2031-06-01T10:00:00.000Z"
    vi.setSystemTime(new Date("2031-05-01T10:00:00.000Z"))
    expect(textoDeLaFila(limite, null)).toMatch(/Vence el /)
    vi.setSystemTime(new Date("2031-06-01T10:00:01.000Z"))
    expect(textoDeLaFila(limite, null)).toContain("Sin entregar")
  })

  it("maestro y admin (sin entrega): un segundo después del límite, «Venció el …» con la fecha larga y nunca «Sin entregar»", () => {
    const texto = textoDeLaFila(segundos(-1))
    expect(texto).toContain(`Venció el ${formatearFechaLarga(new Date(segundos(-1)))}`)
    expect(texto).not.toContain("Sin entregar")
  })

  it.each([
    {
      entrega: { estado: "entregado", conRetraso: false },
      fecha: segundos(3600),
      texto: "Entregado",
    },
    {
      entrega: { estado: "entregado", conRetraso: true },
      fecha: segundos(-1),
      texto: "Entregado con retraso",
    },
    {
      entrega: { estado: "calificado", conRetraso: true },
      fecha: segundos(-1),
      texto: "Calificado",
    },
    {
      entrega: { estado: "calificado", conRetraso: false },
      fecha: segundos(3600),
      texto: "Calificado",
    },
  ] as const)(
    "$entrega.estado (conRetraso $entrega.conRetraso) dice «$texto» y no el vencimiento",
    ({ entrega, fecha, texto }) => {
      const fila = textoDeLaFila(fecha, entrega)
      expect(fila).toContain(texto)
      expect(fila).not.toMatch(/Vence|Venció|Sin entregar/)
      if (texto === "Entregado") expect(fila).not.toContain("Entregado con retraso")
    },
  )

  it("anulada (asignado) y pendiente conserva el vencimiento; con una fecha ilegible, el texto de fecha no disponible y nunca «Sin entregar»", () => {
    const pendiente = textoDeLaFila(segundos(3600), { estado: "asignado", conRetraso: false })
    expect(pendiente).toContain(vencimientoDe(segundos(3600), AHORA).texto)
    const ilegible = textoDeLaFila("no-es-fecha", null)
    expect(ilegible).toContain(TEXTO_FECHA_NO_DISPONIBLE)
    expect(ilegible).not.toContain("Sin entregar")
  })
})
