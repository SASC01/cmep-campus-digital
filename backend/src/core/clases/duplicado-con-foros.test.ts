import { describe, expect, it } from "vitest"

import {
  esRecursoDeAprendizaje,
  planDeDuplicado,
  type BloqueOriginal,
  type OriginalParaDuplicar,
} from "./duplicado.js"

// FORO-01a (§E8.1, §E9.6). Un foro es una actividad: al duplicar una clase nunca se copia (P-10), como
// ninguna tarea. Los tipos de core/ reflejan los de la base, que desde FORO-01 incluyen "foro".

const CLASE_NUEVA = "99999999-9999-4999-8999-999999999999"
const AHORA = new Date("2026-11-14T12:00:00.000Z")
const ADMIN = "aaaaaaaa-0000-4000-8000-000000000001"
const MAESTRO = "aaaaaaaa-0000-4000-8000-000000000002"

const generador = () => {
  let i = 0
  return () => {
    i += 1
    return `n-${String(i).padStart(3, "0")}`
  }
}

const BLOQUES: readonly BloqueOriginal[] = ["aprendizaje", "docente", null]

describe("FORO-1A08: el duplicado de una clase no copia foros", () => {
  it("FORO-1A08: esRecursoDeAprendizaje de un foro da false con cualquier bloque y autor", () => {
    let casos = 0
    for (const bloque of BLOQUES) {
      for (const autorEsAdmin of [true, false]) {
        expect(
          esRecursoDeAprendizaje({ tipo: "foro", bloque, autorEsAdmin }),
          `bloque ${String(bloque)}, admin ${String(autorEsAdmin)}`,
        ).toBe(false)
        casos += 1
      }
    }
    expect(casos).toBe(6)
  })

  it("FORO-1A08: planDeDuplicado con un foro entre los recursos no lo copia, ni sus archivos, y sí copia el material de aprendizaje", () => {
    const original: OriginalParaDuplicar = {
      temas: [{ id: "t-1", nombre: "Unidad 1", orden: 0 }],
      categorias: [],
      recursos: [
        {
          id: "foro-1",
          tipo: "foro",
          bloque: "aprendizaje",
          autorId: ADMIN,
          autorEsAdmin: true,
          titulo: "Debate",
          texto: "Planteamiento",
          temaId: "t-1",
          creadoEn: new Date("2026-11-01T00:00:00.000Z"),
        },
        {
          id: "foro-2",
          tipo: "foro",
          bloque: null,
          autorId: MAESTRO,
          autorEsAdmin: false,
          titulo: "Otro debate",
          texto: "Planteamiento",
          temaId: null,
          creadoEn: new Date("2026-11-02T00:00:00.000Z"),
        },
        {
          id: "material-1",
          tipo: "material",
          bloque: "aprendizaje",
          autorId: ADMIN,
          autorEsAdmin: true,
          titulo: "Lectura",
          texto: "Texto",
          temaId: "t-1",
          creadoEn: new Date("2026-11-03T00:00:00.000Z"),
        },
      ],
      archivos: [
        {
          id: "a-foro",
          publicacionId: "foro-1",
          estado: "confirmado",
          nombre: "planteamiento.pdf",
          tipo: "application/pdf",
          tamano: 100,
          subidoPor: ADMIN,
          creadoEn: new Date("2026-11-01T00:00:00.000Z"),
        },
        {
          id: "a-material",
          publicacionId: "material-1",
          estado: "confirmado",
          nombre: "lectura.pdf",
          tipo: "application/pdf",
          tamano: 100,
          subidoPor: ADMIN,
          creadoEn: new Date("2026-11-03T00:00:00.000Z"),
        },
      ],
    }

    const plan = planDeDuplicado(original, {
      claseId: CLASE_NUEVA,
      ahora: AHORA,
      generarId: generador(),
    })

    expect(plan.recursos).toHaveLength(1)
    expect(plan.recursos[0]).toMatchObject({ tipo: "material", titulo: "Lectura" })
    expect(plan.archivos.map((archivo) => archivo.copiaDe)).toEqual(["a-material"])
    expect(plan.recursos.some((recurso) => recurso.titulo === "Debate")).toBe(false)
  })
})
