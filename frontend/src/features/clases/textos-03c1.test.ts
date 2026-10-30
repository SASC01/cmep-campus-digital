import { describe, expect, it } from "vitest"

import {
  CAPACIDADES_POR_PERSPECTIVA,
  TEXTOS_CLASE,
  TEXTOS_MAESTROS_DE_CLASE,
  TEXTOS_MURO,
  TEXTOS_TEMAS,
  TEXTOS_TRABAJO,
} from "./data"

// CLASES-03c1 (CL3-C17): los textos de §D-13 de 03c viven en data.ts, con su texto exacto (DH-12 y
// Enmienda 4).
describe("textos de 03c (CL3-C17)", () => {
  it("CL3-C17: los nombres de las secciones", () => {
    expect([
      TEXTOS_CLASE.avisos,
      TEXTOS_CLASE.trabajo,
      TEXTOS_CLASE.recursos,
      TEXTOS_CLASE.dudas,
      TEXTOS_CLASE.personas,
    ]).toEqual(["Avisos", "Actividades de aprendizaje", "Recursos", "Dudas", "Personas"])
    expect(TEXTOS_TRABAJO.titulo).toBe("Actividades de aprendizaje")
  })

  it("CL3-C17: los textos de Avisos, con los vacíos de cada perspectiva y la frase R1", () => {
    expect(TEXTOS_MURO.tituloLista).toBe("Avisos")
    expect([TEXTOS_MURO.vacioEstudiante, TEXTOS_MURO.vacioMaestro, TEXTOS_MURO.vacioAdmin]).toEqual(
      [
        "Aún no hay avisos en esta clase.",
        "Publica el primer aviso de tu clase.",
        "Publica el primer aviso de esta clase.",
      ],
    )
    expect(TEXTOS_MURO.verMasPublicaciones).toBe("Ver más avisos")
    expect(TEXTOS_MURO.cambioMientrasLoVeias).toBe(
      "Los avisos cambiaron mientras los veías. Vuelve a abrir Avisos para verlos completos.",
    )
  })

  it("CL3-C17: los textos de Actividades de aprendizaje, con la frase R2 y la recarga fallida", () => {
    expect(TEXTOS_TRABAJO.vacio).toBe("Aún no hay actividades en esta clase.")
    expect(TEXTOS_TRABAJO.cambioMientrasLoVeias).toBe(
      "Este tema cambió mientras lo veías. Vuelve a abrir Actividades de aprendizaje para verlo completo.",
    )
    expect(TEXTOS_TRABAJO.recargaFallida).toBe(
      "No pudimos actualizar Actividades de aprendizaje. Mostramos la última versión que tenemos.",
    )
    expect(TEXTOS_TEMAS.consecuenciaSinConteo).toBe(
      "Sus actividades y recursos pasarán a «Sin tema».",
    )
  })

  it("CL3-C17: la consecuencia de quitar un maestro ya no nombra el muro", () => {
    expect(TEXTOS_MAESTROS_DE_CLASE.consecuencia).toBe(
      "Dejará de ver la clase. Lo que publicó se queda en la clase.",
    )
  })

  it("CL3-C17: ninguna perspectiva tiene «Crear tarea» en Avisos (S-09): la capacidad ya no existe", () => {
    for (const capacidades of Object.values(CAPACIDADES_POR_PERSPECTIVA)) {
      expect(Object.keys(capacidades)).not.toContain("crearTarea")
    }
  })
})
