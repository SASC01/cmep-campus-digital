import { describe, expect, it } from "vitest"

import {
  COLA_AVISO_FALLIDO,
  COLA_COMENTARIO_CREADO,
  COLA_MATERIAL_CREADO,
  COLA_PUBLICACION_CREADA,
  colaDePublicacion,
  datosComentarioCreadoSchema,
  datosPublicacionCreadaSchema,
} from "./avisos-de-clase.js"

const ID_A = "11111111-1111-4111-8111-111111111111"
const ID_B = "22222222-2222-4222-8222-222222222222"
const ID_C = "33333333-3333-4333-8333-333333333333"

describe("avisos de clase", () => {
  it("PR-C01a: colaDePublicacion elige la cola según el tipo", () => {
    expect(colaDePublicacion("anuncio")).toBe(COLA_PUBLICACION_CREADA)
    expect(colaDePublicacion("material")).toBe(COLA_MATERIAL_CREADO)
    expect(COLA_PUBLICACION_CREADA).toBe("PUBLICACION_CREADA")
    expect(COLA_MATERIAL_CREADO).toBe("MATERIAL_CREADO")
    expect(COLA_COMENTARIO_CREADO).toBe("COMENTARIO_CREADO")
    expect(COLA_AVISO_FALLIDO).toBe("AVISO_FALLIDO")
  })

  it("PR-C01b: los esquemas rechazan campos de texto extra", () => {
    const publicacion = { publicacionId: ID_A, claseId: ID_B }
    const comentario = { comentarioId: ID_A, publicacionId: ID_B, claseId: ID_C }

    expect(datosPublicacionCreadaSchema.safeParse(publicacion).success).toBe(true)
    expect(datosComentarioCreadoSchema.safeParse(comentario).success).toBe(true)

    expect(datosPublicacionCreadaSchema.safeParse({ ...publicacion, texto: "hola" }).success).toBe(
      false,
    )
    expect(datosPublicacionCreadaSchema.safeParse({ ...publicacion, autor: "Ana" }).success).toBe(
      false,
    )
    expect(datosComentarioCreadoSchema.safeParse({ ...comentario, texto: "hola" }).success).toBe(
      false,
    )
    expect(datosComentarioCreadoSchema.safeParse({ ...comentario, correo: "a@b.mx" }).success).toBe(
      false,
    )
  })
})
