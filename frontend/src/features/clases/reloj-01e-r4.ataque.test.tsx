import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { FilaDeEntrega } from "./components/fila-de-entrega"

// Ataque del Tester, TAREAS-01e, ronda 4 cerrada: solo T-20 y la regla nueva de tester.md ("Toda
// prueba que compare fechas o textos relativos al tiempo fija el reloj; una prueba que depende de la
// hora real es hallazgo"). Sin selectores de clase.

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const HORA = 60 * 60 * 1000

describe("ataque TAREAS-01e r4: T-20, el reloj fijo", () => {
  it("la fila de una tarea a 30 h dice su día de calendario: a las 00:30 «Vence mañana a las 06:30»; a las 23:30 «Vence en 2 días»", () => {
    const decir = (ahora: Date) => {
      vi.useFakeTimers({ toFake: ["Date"] })
      vi.setSystemTime(ahora)
      const limite = new Date(ahora.getTime() + 30 * HORA).toISOString()
      render(
        <MemoryRouter>
          <FilaDeEntrega titulo="Ensayo" fechaLimite={limite} destino="/x" />
        </MemoryRouter>,
      )
      const texto = screen.getByRole("link", { name: /^Tarea: Ensayo/ }).textContent
      cleanup()
      vi.useRealTimers()
      return texto
    }
    expect(decir(new Date(2030, 0, 15, 0, 30))).toMatch(/Vence mañana a las 06:30/)
    expect(decir(new Date(2030, 0, 15, 23, 30))).toMatch(/Vence en 2 días/)
  })

  it("ninguna prueba del frontend compara textos relativos al día («Vence hoy», «Vence mañana», «Vence en N días») sin fijar el reloj o pasar un «ahora» explícito", () => {
    const pruebas = import.meta.glob<string>("/src/**/*.test.{ts,tsx}", {
      query: "?raw",
      import: "default",
      eager: true,
    })
    const relativos = /Vence (hoy|mañana|en)|hoy\|mañana/
    const conReloj = /useFakeTimers|setSystemTime/
    const propias = "/src/features/clases/reloj-01e-r4.ataque.test.tsx"
    const candidatas = Object.entries(pruebas).filter(
      ([ruta, texto]) => ruta !== propias && relativos.test(texto),
    )
    expect(candidatas.length, "no se encontró ninguna prueba con textos relativos").toBeGreaterThan(
      0,
    )
    const sinReloj = candidatas
      .filter(([, texto]) => {
        if (conReloj.test(texto)) return false
        // Un «ahora» explícito: toda llamada a vencimientoDe lleva su segundo argumento.
        const llamadas = [...texto.matchAll(/vencimientoDe\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g)]
        return llamadas.length === 0 || llamadas.some(([, args]) => !(args ?? "").includes(","))
      })
      .map(([ruta]) => ruta)
    expect(sinReloj).toEqual([])
  })
})
