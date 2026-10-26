import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useRef, useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useFocoAlPerderseElControl as useFocoDeTareas } from "@/features/tareas/hooks"
import { claveDeFocoDeLaTarea } from "@/features/tareas/lib"

import { useFocoAlPerderseElControl } from "./hooks"
import { claveDeFocoDeLaConsulta } from "./lib"
import type { MomentoDeLaConsulta } from "./types"

// CALIFICACIONES-01d (CAL-1D08, §D-13.1): el gancho de foco y su clave se movieron de features/tareas a
// components/foco sin cambiar. Las reexportaciones del origen son los mismos objetos y el gancho se
// comporta igual (además, las pruebas de foco de TAREAS y ENTREGAS siguen sin cambios). Reloj fijo.

const AHORA = new Date("2030-01-10T12:00:00.000Z")

function Prueba() {
  const raizRef = useRef<HTMLDivElement>(null)
  const [mostrar, setMostrar] = useState(true)
  useFocoAlPerderseElControl(raizRef, mostrar ? "con-boton" : "sin-boton")
  return (
    <div ref={raizRef} tabIndex={-1} data-testid="raiz">
      {mostrar && (
        <button type="button" onClick={() => setMostrar(false)}>
          Quitar
        </button>
      )}
    </div>
  )
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("components/foco (CAL-1D08)", () => {
  it("CAL-1D08: las reexportaciones de features/tareas son los mismos objetos que los de components/foco", () => {
    expect(useFocoDeTareas).toBe(useFocoAlPerderseElControl)
    expect(claveDeFocoDeLaTarea).toBe(claveDeFocoDeLaConsulta)
  })

  it("CAL-1D08: la clave cambia con cada respuesta y con cada fallo, como la de features/tareas", () => {
    const base: MomentoDeLaConsulta = {
      status: "success",
      dataUpdatedAt: 1,
      errorUpdatedAt: 0,
      errorUpdateCount: 0,
    }
    const fallo: MomentoDeLaConsulta = { ...base, status: "error", errorUpdateCount: 2 }
    expect(claveDeFocoDeLaConsulta("t", base)).toBe("t:success:1:0:0")
    expect(claveDeFocoDeLaConsulta("t", fallo)).toBe("t:error:1:0:2")
  })

  it("CAL-1D08: si el control con el foco desaparece al cambiar la clave, el foco va al contenedor y nunca a <body>", async () => {
    render(<Prueba />)
    const boton = screen.getByRole("button", { name: "Quitar" })
    act(() => boton.focus())
    expect(document.activeElement).toBe(boton)
    await act(async () => {
      fireEvent.click(boton)
      await Promise.resolve()
    })
    expect(screen.queryByRole("button", { name: "Quitar" })).toBeNull()
    expect(document.activeElement).toBe(screen.getByTestId("raiz"))
    expect(document.activeElement).not.toBe(document.body)
  })
})
