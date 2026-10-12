import { describe, expect, it } from "vitest"

import {
  datosComentarioCreadoSchema,
  datosComentarioDelMuroSchema,
  datosComentarioPrivadoSchema,
} from "./avisos-de-clase.js"

// ENTREGAS-01c (§D-5, PR-1C08): COMENTARIO_CREADO sirve al muro y al hilo privado con una unión de
// dos objetos estrictos de llaves distintas.

const COMENTARIO = "aaaaaaaa-1c1f-4b8e-9a1e-0f2a3b4c5d6e"
const PUBLICACION = "bbbbbbbb-1c1f-4b8e-9a1e-0f2a3b4c5d6e"
const ENTREGA = "cccccccc-1c1f-4b8e-9a1e-0f2a3b4c5d6e"
const CLASE = "dddddddd-1c1f-4b8e-9a1e-0f2a3b4c5d6e"

describe("datosComentarioCreadoSchema (PR-1C08)", () => {
  it("PR-1C08: acepta la forma del muro y la del hilo privado, y cada una solo encaja en su esquema", () => {
    const delMuro = { comentarioId: COMENTARIO, publicacionId: PUBLICACION, claseId: CLASE }
    const delHilo = { comentarioId: COMENTARIO, entregaId: ENTREGA, claseId: CLASE }
    expect(datosComentarioCreadoSchema.parse(delMuro)).toEqual(delMuro)
    expect(datosComentarioCreadoSchema.parse(delHilo)).toEqual(delHilo)
    expect(datosComentarioDelMuroSchema.safeParse(delHilo).success).toBe(false)
    expect(datosComentarioPrivadoSchema.safeParse(delMuro).success).toBe(false)
  })

  it("PR-1C08: rechaza una forma con publicacionId y entregaId a la vez, una sin ninguno y una con llaves de más", () => {
    const rechazados = [
      { comentarioId: COMENTARIO, publicacionId: PUBLICACION, entregaId: ENTREGA, claseId: CLASE },
      { comentarioId: COMENTARIO, claseId: CLASE },
      { comentarioId: COMENTARIO, entregaId: ENTREGA, claseId: CLASE, texto: "hola" },
      { comentarioId: COMENTARIO, entregaId: ENTREGA, claseId: CLASE, alumnoId: ENTREGA },
      { comentarioId: COMENTARIO, publicacionId: PUBLICACION, claseId: CLASE, correo: "a@b.mx" },
    ]
    for (const datos of rechazados) {
      expect(datosComentarioCreadoSchema.safeParse(datos).success, JSON.stringify(datos)).toBe(
        false,
      )
    }
  })

  it("PR-1C08: los ids deben ser uuid en las dos formas", () => {
    expect(
      datosComentarioCreadoSchema.safeParse({
        comentarioId: COMENTARIO,
        entregaId: "no-es-uuid",
        claseId: CLASE,
      }).success,
    ).toBe(false)
  })
})
