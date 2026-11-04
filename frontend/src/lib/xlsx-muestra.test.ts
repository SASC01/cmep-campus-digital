/// <reference types="node" />
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { celdasDeLaHoja } from "./lector-xlsx-de-prueba"
import { armarLibroXlsx, type CeldaXlsx, type HojaXlsx } from "./xlsx"

// CALIFICACIONES-02b (CAL2-B17, DH-10). La muestra del control H-0: un libro con la forma de la
// exportación que el humano abre en Excel y en LibreOffice antes de construir la vista. Se escribe en
// la carpeta temporal del sistema en cada corrida; no afecta a nada más.

const RUTA_DE_LA_MUESTRA = join(tmpdir(), "cmep-calificaciones-muestra.xlsx")

const TAREAS = 30

const negrita = (valor: string): CeldaXlsx => ({ tipo: "texto", valor, negrita: true })
const texto = (valor: string): CeldaXlsx => ({ tipo: "texto", valor })
const numero = (valor: number): CeldaXlsx => ({ tipo: "numero", valor })
const VACIA: CeldaXlsx = { tipo: "vacia" }

const titulos = Array.from({ length: TAREAS }, (_, i) => {
  if (i === 0) return "Tarea_x0041_"
  if (i === 1) return "Ensayo de comprensión"
  return `Tarea ${String(i + 1)}`
})

const ESTADOS = ["Asignado", "Entregado", "Entregado con retraso", "Sin entregar"]

const celdaDelAlumno = (alumno: number, tarea: number): CeldaXlsx => {
  const vuelta = (alumno + tarea) % 6
  if (vuelta === 0) return numero(10)
  if (vuelta === 1) return numero(8.5)
  if (vuelta === 2) return numero(7.25)
  return texto(ESTADOS[vuelta - 2] ?? "Asignado")
}

const alumnos: [string, string, CeldaXlsx][] = [
  ["Ana Peña Núñez", "ana.pena@ejemplo.mx", numero(82.4)],
  ["José Ángel Muñoz \u{1F600}", "jose.munoz@ejemplo.mx", numero(90)],
  ["=SUMA(1;2)", "formula@ejemplo.mx", numero(75.25)],
  ["Óscar Íñiguez", "oscar@ejemplo.mx", texto("—")],
]

const HOJA: HojaXlsx = {
  nombre: "Calificaciones",
  filas: [
    [negrita("Alumno"), negrita("Correo"), ...titulos.map(negrita), negrita("Promedio (%)")],
    [
      negrita("Categoría"),
      VACIA,
      ...titulos.map((_, i) => negrita(i % 3 === 0 ? "Sin categoría" : "Exámenes")),
      VACIA,
    ],
    [
      negrita("Puntos"),
      VACIA,
      ...titulos.map((_, i) => ({ tipo: "numero" as const, valor: 10 + i, negrita: true })),
      VACIA,
    ],
    ...alumnos.map(([nombre, correo, promedio], a): CeldaXlsx[] => [
      texto(nombre),
      texto(correo),
      ...titulos.map((_, t) => celdaDelAlumno(a, t)),
      promedio,
    ]),
  ],
  anchos: [32, 36, ...titulos.map(() => 16), 14],
  inmovilizar: { filas: 3, columnas: 2 },
}

describe("muestra para el control H-0 (CAL2-B17)", () => {
  it("CAL2-B17: escribe cmep-calificaciones-muestra.xlsx en la carpeta temporal con 3 filas de encabezado en negrita, 4 alumnos y 30 tareas (de A a AG), y el archivo tiene los bytes de la salida", () => {
    const libro = armarLibroXlsx(HOJA)
    writeFileSync(RUTA_DE_LA_MUESTRA, libro)
    expect(existsSync(RUTA_DE_LA_MUESTRA)).toBe(true)
    expect(new Uint8Array(readFileSync(RUTA_DE_LA_MUESTRA))).toEqual(libro)

    const celdas = celdasDeLaHoja(libro)
    expect(celdas.get("A1")).toEqual({ tipo: "texto", valor: "Alumno", negrita: true })
    expect(celdas.get("C1")).toEqual({ tipo: "texto", valor: "Tarea_x005F_x0041_", negrita: true })
    expect(celdas.get("Z1")?.valor).toBe("Tarea 24")
    expect(celdas.get("AD1")?.valor).toBe("Tarea 28")
    expect(celdas.get("AG1")).toEqual({ tipo: "texto", valor: "Promedio (%)", negrita: true })
    expect(celdas.get("C3")).toEqual({ tipo: "numero", valor: "10", negrita: true })
    expect(celdas.get("A5")?.valor).toBe("José Ángel Muñoz \u{1F600}")
    expect(celdas.get("A6")).toEqual({ tipo: "texto", valor: "=SUMA(1;2)", negrita: false })
    expect(celdas.get("AG4")).toEqual({ tipo: "numero", valor: "82.4", negrita: false })
    expect(celdas.get("AG7")).toEqual({ tipo: "texto", valor: "—", negrita: false })
    expect(celdas.has("B2")).toBe(false)
    const valores = [...celdas.values()].map((c) => c.valor)
    for (const decimal of ["10", "8.5", "7.25"]) expect(valores).toContain(decimal)
  })
})
