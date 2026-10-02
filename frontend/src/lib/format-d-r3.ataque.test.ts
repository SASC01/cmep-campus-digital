import { describe, expect, it } from "vitest"

import { formatearTamano } from "./format"

// Ataque del Tester (CLASES-d, ronda 3; punto 2 de la lista del manager): T-44 por la razón
// correcta. El ciclo redondea en la unidad actual y sube al llegar a 1024: se revisan los vecinos de
// cada cambio de unidad, los decimales, el tope (GB es la última unidad) y un barrido con la forma
// que debe tener todo resultado.

const KB = 1024
const MB = KB * 1024
const GB = MB * 1024

describe("ataque d-r3: formatearTamano, vecinos de cada cambio de unidad", () => {
  it.each([
    [0, "0 B"],
    [1023, "1023 B"],
    [1024, "1 KB"],
    [1_048_064, "1 MB"],
    [1_048_575, "1 MB"],
    [1_048_576, "1 MB"],
    [1_073_689_395, "1023.9 MB"],
    [1_073_741_823, "1 GB"],
    [1_073_741_824, "1 GB"],
    [1.5 * GB, "1.5 GB"],
    [Math.round(1023.96 * MB), "1 GB"],
    [25 * MB, "25 MB"],
    [839_680, "820 KB"],
    [2_516_582, "2.4 MB"],
  ])("%d bytes → %s", (bytes, esperado) => {
    expect(formatearTamano(bytes)).toBe(esperado)
  })

  it("en GB, la última unidad, el número puede pasar de 1024 sin cambiar de unidad ni llevar «.0»", () => {
    expect(formatearTamano(Math.round(1023.95 * GB))).toBe("1024 GB")
    expect(formatearTamano(2048 * GB)).toBe("2048 GB")
  })

  it("barrido alrededor de cada cambio de unidad: forma «N U» o «N.D U», sin «.0», B y KB enteros y menos de 1024 salvo en GB", () => {
    const valores: number[] = []
    for (const base of [KB, MB, GB]) {
      for (let delta = -600; delta <= 600; delta += 1) valores.push(base + delta)
      for (const factor of [1023.4, 1023.5, 1023.94, 1023.95, 1023.96, 1.04, 1.05, 1.06]) {
        valores.push(Math.round(base * factor))
      }
    }
    for (let i = 1; i < 2000; i += 1) valores.push(Math.round((i * 7919 * 104_729) % (4 * GB)))
    const malos = valores
      .map((bytes) => [bytes, formatearTamano(bytes)] as const)
      .filter(([, texto]) => {
        const partes = /^(\d+(?:\.\d)?) (B|KB|MB|GB)$/.exec(texto)
        if (!partes) return true
        const [, numero = "", unidad = ""] = partes
        if (numero.endsWith(".0")) return true
        if ((unidad === "B" || unidad === "KB") && numero.includes(".")) return true
        return unidad !== "GB" && Number(numero) >= 1024
      })
    expect(malos).toEqual([])
  })
})
