import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useSoloLecturaDeLaClase } from "@/components/clase/hooks"
import { esClaseArchivada } from "@/components/clase/lib"
import { ApiError } from "@/services/apiClient"

import { estaArchivada } from "./lib"

// ADMIN-01d1 (§D-9, S-14, S-15, N-11): lo puro de la clase archivada. `estaArchivada` es el único lugar
// que lee `archivadaEn`; `esClaseArchivada`, la única clasificación del 409; y el contexto de solo
// lectura vale false sin proveedor.

describe("estaArchivada (ADM-1D101)", () => {
  it("ADM-1D101: con archivadaEn ISO es true", () => {
    expect(estaArchivada({ archivadaEn: "2026-10-05T12:00:00.000Z" })).toBe(true)
  })

  it("ADM-1D101: con archivadaEn null es false", () => {
    expect(estaArchivada({ archivadaEn: null })).toBe(false)
  })

  it("ADM-1D101: sin la clave (un backend anterior al despliegue) es false", () => {
    expect(estaArchivada({})).toBe(false)
  })
})

describe("esClaseArchivada (§D-9, Enmienda 3)", () => {
  it("ADM-1D109 (clasificación): solo el código CLASE_ARCHIVADA de la API cuenta, sin mirar el texto", () => {
    expect(esClaseArchivada(new ApiError("CLASE_ARCHIVADA", "", 409))).toBe(true)
    expect(esClaseArchivada(new ApiError("CLASE_ARCHIVADA", "otro texto", 409))).toBe(true)
    expect(esClaseArchivada(new ApiError("TAREA_MODIFICADA", "x", 409))).toBe(false)
    expect(esClaseArchivada(new ApiError("ERROR_INTERNO", "CLASE_ARCHIVADA", 500))).toBe(false)
    expect(esClaseArchivada(new Error("CLASE_ARCHIVADA"))).toBe(false)
    expect(esClaseArchivada({ codigo: "CLASE_ARCHIVADA" })).toBe(false)
    expect(esClaseArchivada(undefined)).toBe(false)
  })
})

describe("contexto de solo lectura sin proveedor (ADM-1D102, S-15)", () => {
  it("ADM-1D102: un componente montado sin proveedor lee false", () => {
    const { result } = renderHook(() => useSoloLecturaDeLaClase())
    expect(result.current).toBe(false)
  })
})
