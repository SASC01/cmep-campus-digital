import { randomUUID } from "node:crypto"

import { describe, expect, it } from "vitest"

import {
  COLA_BORRAR_OBJETOS,
  COLA_BORRAR_OBJETOS_FALLIDO,
  COLA_COPIAR_OBJETOS,
  COLA_COPIAR_OBJETOS_FALLIDO,
  datosBorrarObjetosSchema,
  datosCopiarObjetosSchema,
  MAXIMO_CLAVES_POR_TRABAJO,
  MAXIMO_COPIAS_POR_TRABAJO,
  RETRASO_BORRADO_DE_OBJETOS_MS,
} from "./objetos.js"

describe("colas de objetos del almacén (ADMIN-01b, §D-6)", () => {
  it("nombres de las colas, topes por trabajo y el retraso de 10 min del borrado", () => {
    expect([
      COLA_BORRAR_OBJETOS,
      COLA_BORRAR_OBJETOS_FALLIDO,
      COLA_COPIAR_OBJETOS,
      COLA_COPIAR_OBJETOS_FALLIDO,
    ]).toEqual([
      "BORRAR_OBJETOS",
      "BORRAR_OBJETOS_FALLIDO",
      "COPIAR_OBJETOS",
      "COPIAR_OBJETOS_FALLIDO",
    ])
    expect(MAXIMO_CLAVES_POR_TRABAJO).toBe(1000)
    expect(MAXIMO_COPIAS_POR_TRABAJO).toBe(100)
    expect(RETRASO_BORRADO_DE_OBJETOS_MS).toBe(600_000)
  })

  it("datos de BORRAR_OBJETOS: de 1 a 1000 claves no vacías, sin llaves de más", () => {
    expect(datosBorrarObjetosSchema.safeParse({ claves: ["materiales/c/a"] }).success).toBe(true)
    const mil = Array.from({ length: 1000 }, (_, i) => `k${String(i)}`)
    expect(datosBorrarObjetosSchema.safeParse({ claves: mil }).success).toBe(true)
    for (const invalido of [
      { claves: [] },
      { claves: [...mil, "otra"] },
      { claves: [""] },
      { claves: ["a"], extra: 1 },
      {},
      null,
    ]) {
      expect(datosBorrarObjetosSchema.safeParse(invalido).success, JSON.stringify(invalido)).toBe(
        false,
      )
    }
  })

  it("datos de COPIAR_OBJETOS: de 1 a 100 uuid, sin llaves de más", () => {
    expect(datosCopiarObjetosSchema.safeParse({ archivoIds: [randomUUID()] }).success).toBe(true)
    const cien = Array.from({ length: 100 }, () => randomUUID())
    expect(datosCopiarObjetosSchema.safeParse({ archivoIds: cien }).success).toBe(true)
    for (const invalido of [
      { archivoIds: [] },
      { archivoIds: [...cien, randomUUID()] },
      { archivoIds: ["no-es-uuid"] },
      { archivoIds: [randomUUID()], claves: [] },
      {},
    ]) {
      expect(datosCopiarObjetosSchema.safeParse(invalido).success, JSON.stringify(invalido)).toBe(
        false,
      )
    }
  })
})
