import { describe, expect, it } from "vitest"

import { errorQueRedirigeElCliente as redirigeEnCalificaciones } from "@/features/calificaciones/lib"
import { errorQueRedirigeElCliente as redirigeEnTareas } from "@/features/tareas/lib"

import { ApiError, CODIGOS_QUE_REDIRIGE_EL_CLIENTE } from "./apiClient"

// CHORE-03 (03b, N-46): la lista de los errores con que apiClient saca a la persona de la vista vive
// en services/apiClient.ts, una sola vez, y los módulos la importan de ahí. apiClient no importa nada
// de features/ ni de lib/ (sin ciclo).

const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})

const esPrueba = (ruta: string) => /\.test\.tsx?$/.test(ruta)
const CLIENTE = "/src/services/apiClient.ts"

const leer = (ruta: string): string => {
  const texto = fuentes[ruta]
  if (texto === undefined) throw new Error(`Precondición: existe ${ruta}`)
  return texto
}

const REDIRIGEN = ["ACCESO_RESTRINGIDO", "CAMBIO_DE_CONTRASENA_REQUERIDO", "NO_AUTENTICADO"]

describe("CHORE-03 · N-46: CODIGOS_QUE_REDIRIGE_EL_CLIENTE", () => {
  it("CH3-B11: la lista son exactamente los tres códigos; tareas y calificaciones dicen true solo ante ellos; solo apiClient.ts la declara", () => {
    expect([...CODIGOS_QUE_REDIRIGE_EL_CLIENTE].sort()).toEqual(REDIRIGEN)
    for (const redirige of [redirigeEnTareas, redirigeEnCalificaciones]) {
      for (const codigo of REDIRIGEN) {
        expect(redirige(new ApiError(codigo, "x", 403))).toBe(true)
      }
      expect(redirige(new ApiError("SIN_ACCESO_A_LA_CLASE", "x", 403))).toBe(false)
      expect(redirige(new ApiError("VALIDACION", "x", 400))).toBe(false)
      expect(redirige(new ApiError("constructor", "x", 400))).toBe(false)
      expect(redirige(new Error("ACCESO_RESTRINGIDO"))).toBe(false)
      expect(redirige("NO_AUTENTICADO")).toBe(false)
    }
    const declaran = Object.entries(fuentes)
      .filter(([ruta]) => !esPrueba(ruta))
      .filter(([, texto]) => /\b(const|let|var)\s+CODIGOS_QUE_REDIRIGE_EL_CLIENTE\b/.test(texto))
      .map(([ruta]) => ruta)
    expect(declaran).toEqual([CLIENTE])
  })

  it("CH3-B12: apiClient.ts solo importa de @campus/shared, ./navegacion y ./tokenAcceso", () => {
    const origenes = [...leer(CLIENTE).matchAll(/\bfrom\s+["']([^"']+)["']/g)].map((m) => m[1])
    expect(origenes.length).toBeGreaterThan(0)
    expect([...new Set(origenes)].sort()).toEqual([
      "./navegacion",
      "./tokenAcceso",
      "@campus/shared",
    ])
    expect(leer(CLIENTE)).not.toMatch(/\bimport\s*\(/)
  })
})
