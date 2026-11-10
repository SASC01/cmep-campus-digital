import { estadoPagoLoteSchema } from "@campus/shared"
import { describe, expect, it } from "vitest"

import * as datos from "./data"
import {
  consultaDeAlumnos,
  consultaDeMovimientos,
  errorLocalDelLote,
  estadoContrario,
  estadoDelFiltro,
  seleccionVigente,
} from "./lib"

// ADMIN-01g: las funciones puras de lib.ts que suma la subentrega, el amarre de los textos del lote con
// shared/ (ADM-1G24) y E-16 (ADM-1G21).

const id = (n: number) => `5a5b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`

const fila = (n: number, estadoPago: "deudor" | "al_corriente") => ({
  id: id(n),
  nombre: `Alumno ${String(n)}`,
  email: `a${String(n)}@ejemplo.mx`,
  rol: "estudiante" as const,
  activo: true,
  creadoEn: "2026-09-01T15:00:00.000Z",
  estadoPago,
  fechaEstadoPago: null,
  accesoRestringido: false,
  motivoRestriccion: null,
  fechaRestriccion: null,
})

const mensajeDeAlumnos = (alumnoIds: string[]) => {
  const resultado = estadoPagoLoteSchema.safeParse({ alumnoIds, estadoPago: "deudor" })
  if (resultado.success) throw new Error("Precondición: el esquema rechaza la lista")
  const incidencia = resultado.error.issues.find((i) => i.path[0] === "alumnoIds")
  if (incidencia === undefined) throw new Error("Precondición: la incidencia es de alumnoIds")
  return { mensaje: incidencia.message, incidencias: resultado.error.issues }
}

describe("ADMIN-01g · el lote (ADM-1G24 y la validación local)", () => {
  it("ADM-1G24: sin ids, estadoPagoLoteSchema da exactamente TEXTOS_LOTE.eligeAlMenosUno; con 101 ids distintos, exactamente TEXTOS_LOTE.maximo", () => {
    expect(mensajeDeAlumnos([]).mensaje).toBe(datos.TEXTOS_LOTE.eligeAlMenosUno)
    const ciento1 = Array.from({ length: 101 }, (_, i) => id(i + 1))
    expect(new Set(ciento1).size).toBe(101)
    expect(mensajeDeAlumnos(ciento1).mensaje).toBe(datos.TEXTOS_LOTE.maximo)
  })

  it("errorLocalDelLote elige el texto por la incidencia, sin leer el mensaje", () => {
    expect(errorLocalDelLote(mensajeDeAlumnos([]).incidencias)).toBe("minimo")
    expect(
      errorLocalDelLote(
        mensajeDeAlumnos(Array.from({ length: 101 }, (_, i) => id(i + 1))).incidencias,
      ),
    ).toBe("maximo")
    expect(errorLocalDelLote([{ path: ["estadoPago"], code: "invalid_value" }])).toBeNull()
  })

  it("el texto del diálogo y el aviso dicen el número con su singular y su destino", () => {
    expect(datos.TEXTOS_LOTE.texto(1, "deudor")).toBe("Se marcará 1 alumno como deudor.")
    expect(datos.TEXTOS_LOTE.texto(1, "al_corriente")).toBe("Se marcará 1 alumno al corriente.")
    expect(datos.TEXTOS_LOTE.texto(3, "deudor")).toBe("Se marcarán 3 alumnos como deudores.")
    expect(datos.TEXTOS_LOTE.texto(0, "al_corriente")).toBe("Se marcarán 0 alumnos al corriente.")
    expect(datos.TEXTOS_LOTE.aviso(1)).toBe("Estado de pago actualizado")
    expect(datos.TEXTOS_LOTE.aviso(4)).toBe("Estado de pago actualizado en 4 alumnos")
  })
})

describe("ADMIN-01g · la selección y la consulta", () => {
  it("seleccionVigente: solo los ids cuya fila está en la lista con el estado que tenía al elegirla; sin lista, ninguno", () => {
    const seleccion = { [id(1)]: "deudor", [id(2)]: "deudor", [id(3)]: "al_corriente" } as const
    expect(seleccionVigente(seleccion, [fila(1, "deudor"), fila(2, "al_corriente")])).toEqual({
      [id(1)]: "deudor",
    })
    expect(seleccionVigente(seleccion, undefined)).toEqual({})
  })

  it("consultaDeAlumnos: siempre rol=estudiante; estadoPago solo con un filtro; después, cursor y cursorNombre", () => {
    expect(consultaDeAlumnos(undefined, undefined, undefined)).toBe("rol=estudiante")
    const consulta = new URLSearchParams(
      consultaDeAlumnos("ana", "deudor", { cursor: id(9), cursorNombre: "Ña & Ó+%" }),
    )
    expect([...consulta.keys()]).toEqual(["q", "rol", "estadoPago", "cursor", "cursorNombre"])
    expect(consulta.get("cursorNombre")).toBe("Ña & Ó+%")
    expect(estadoDelFiltro("todos")).toBeUndefined()
    expect(estadoDelFiltro("al_corriente")).toBe("al_corriente")
  })

  it("estadoContrario y la consulta de movimientos (ADM-1G14 c: solo cursor)", () => {
    expect(estadoContrario("deudor")).toBe("al_corriente")
    expect(estadoContrario("al_corriente")).toBe("deudor")
    expect(consultaDeMovimientos(undefined)).toBe("")
    expect([...new URLSearchParams(consultaDeMovimientos(id(4))).keys()]).toEqual(["cursor"])
  })
})

describe("ADMIN-01g · E-16 (ADM-1G21)", () => {
  it("ADM-1G21: las claves sin uso ya no están en data.ts y TEXTOS_MAESTROS.notaProvisional sigue", () => {
    const cuentas: Record<string, unknown> = datos.TEXTOS_CUENTAS
    expect(Object.hasOwn(cuentas, "titulo")).toBe(false)
    expect(Object.hasOwn(cuentas, "notaProvisional")).toBe(false)
    expect(Object.hasOwn(cuentas, "buscar")).toBe(false)
    const ficha: Record<string, unknown> = datos.TEXTOS_CUENTAS.ficha
    expect(Object.hasOwn(ficha, "inactiva")).toBe(false)
    const masiva: Record<string, unknown> = datos.TEXTOS_INVITACION_MASIVA
    expect(Object.hasOwn(masiva, "sinNombre")).toBe(false)
    expect(datos.TEXTOS_MAESTROS.notaProvisional.length).toBeGreaterThan(0)
  })
})
