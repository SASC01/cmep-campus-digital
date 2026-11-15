import { describe, expect, it } from "vitest"

import { TEXTOS_POR_ACTIVIDAD } from "./actividades.js"
import {
  decidirCalificacion,
  entregaModificada,
  entregaNoCalificable,
  exigirEntregaCalificable,
  exigirRubricaCongelada,
  rubricaModificada,
  tareaConCalificaciones,
} from "./calificaciones/calificar.js"
import {
  exigirBorradoConEntregasPermitido,
  mensajeTareaConEntregas,
  tareaModificada,
  validarCategoriaRequerida,
} from "./tareas/tareas.js"

// FORO-01a (§D-2.4). Los textos de hoy se escriben aquí letra por letra, no se leen de la tabla: así la
// prueba falla si la tabla cambia el texto de la tarea.
const HOY = {
  categoriaRequerida: "Elige la categoría de la tarea.",
  tareaModificada:
    "Otra persona guardó cambios en esta tarea mientras la editabas. Tus cambios no se guardaron: vuelve a hacerlos sobre la versión actual.",
  entregaModificada:
    "La entrega cambió mientras la calificabas: el alumno la anuló o la volvió a entregar, u otra persona la calificó. No se guardó tu calificación; revisa la entrega actual.",
  rubricaModificada:
    "La rúbrica o los puntos de la tarea cambiaron mientras calificabas. No se guardó tu calificación; vuelve a calificar con la versión actual.",
  entregaNoCalificable:
    "Este alumno todavía puede entregar. Podrás calificarlo cuando entregue o cuando se cierre la entrega.",
  tareaConCalificaciones:
    "Esta tarea ya tiene calificaciones: no puedes cambiar sus puntos ni su rúbrica. Lo demás sí se puede editar.",
  conEntregasAdmin1:
    "Esta tarea tiene 1 alumno con entrega o calificación. Si la borras, también se borrarán su entrega, su calificación y los comentarios privados, y no se puede deshacer.",
  conEntregasAdmin3:
    "Esta tarea tiene 3 alumnos con entrega o calificación. Si la borras, también se borrarán sus entregas, sus calificaciones y los comentarios privados, y no se puede deshacer.",
  conEntregasMaestro1:
    "Esta tarea tiene 1 alumno con entrega o calificación y no se puede borrar. Si de verdad hay que borrarla, pídelo a administración.",
  conEntregasMaestro3:
    "Esta tarea tiene 3 alumnos con entrega o calificación y no se puede borrar. Si de verdad hay que borrarla, pídelo a administración.",
}

const FORO = {
  categoriaRequerida: "Elige la categoría del foro.",
  tareaModificada:
    "Otra persona guardó cambios en este foro mientras lo editabas. Tus cambios no se guardaron: vuelve a hacerlos sobre la versión actual.",
  entregaModificada:
    "La participación cambió mientras la calificabas: el alumno la publicó u otra persona la calificó. No se guardó tu calificación; revisa la participación actual.",
  rubricaModificada:
    "La rúbrica o los puntos del foro cambiaron mientras calificabas. No se guardó tu calificación; vuelve a calificar con la versión actual.",
  entregaNoCalificable:
    "Este alumno todavía puede participar. Podrás calificarlo cuando participe o cuando se cierre el foro.",
  tareaConCalificaciones:
    "Este foro ya tiene calificaciones: no puedes cambiar sus puntos ni su rúbrica. Lo demás sí se puede editar.",
  conEntregasAdmin1:
    "Este foro tiene 1 alumno con participación o calificación. Si lo borras, también se borrarán sus participaciones, sus réplicas y sus calificaciones, y no se puede deshacer.",
  conEntregasAdmin3:
    "Este foro tiene 3 alumnos con participación o calificación. Si lo borras, también se borrarán sus participaciones, sus réplicas y sus calificaciones, y no se puede deshacer.",
  conEntregasMaestro1:
    "Este foro tiene 1 alumno con participación o calificación y no se puede borrar. Si de verdad hay que borrarlo, pídelo a administración.",
  conEntregasMaestro3:
    "Este foro tiene 3 alumnos con participación o calificación y no se puede borrar. Si de verdad hay que borrarlo, pídelo a administración.",
}

const AHORA = new Date("2026-11-14T12:00:00.000Z")
const FUTURA = new Date("2026-11-20T12:00:00.000Z")
const CRITERIOS = [{ id: "c1", criterio: "Claridad", puntosMax: 10 }]

const capturar = (accion: () => unknown): unknown => {
  try {
    accion()
  } catch (error) {
    return error
  }
  throw new Error("Precondición: la acción debía lanzar")
}

describe("FORO-1A07: los mismos códigos, con texto de foro (§D-2.4)", () => {
  it("FORO-1A07: con «foro», cada error de una sola llamada lleva el código de hoy y el texto del foro", () => {
    expect(tareaModificada("foro")).toMatchObject({
      codigo: "TAREA_MODIFICADA",
      estado: 409,
      message: FORO.tareaModificada,
    })
    expect(entregaModificada("foro")).toMatchObject({
      codigo: "ENTREGA_MODIFICADA",
      estado: 409,
      message: FORO.entregaModificada,
    })
    expect(rubricaModificada("foro")).toMatchObject({
      codigo: "RUBRICA_MODIFICADA",
      estado: 409,
      message: FORO.rubricaModificada,
    })
    expect(entregaNoCalificable("foro")).toMatchObject({
      codigo: "ENTREGA_NO_CALIFICABLE",
      estado: 409,
      message: FORO.entregaNoCalificable,
    })
    expect(tareaConCalificaciones("foro")).toMatchObject({
      codigo: "TAREA_CON_CALIFICACIONES",
      estado: 409,
      message: FORO.tareaConCalificaciones,
    })
    expect(TEXTOS_POR_ACTIVIDAD.foro.tareaNoEncontrada).toBe("Ese foro ya no existe.")
  })

  it("FORO-1A07: sin el parámetro (y con «tarea»), el texto de hoy, letra por letra", () => {
    for (const error of [tareaModificada(), tareaModificada("tarea")]) {
      expect(error).toMatchObject({ codigo: "TAREA_MODIFICADA", message: HOY.tareaModificada })
    }
    for (const error of [entregaModificada(), entregaModificada("tarea")]) {
      expect(error).toMatchObject({ codigo: "ENTREGA_MODIFICADA", message: HOY.entregaModificada })
    }
    for (const error of [rubricaModificada(), rubricaModificada("tarea")]) {
      expect(error).toMatchObject({ codigo: "RUBRICA_MODIFICADA", message: HOY.rubricaModificada })
    }
    for (const error of [entregaNoCalificable(), entregaNoCalificable("tarea")]) {
      expect(error).toMatchObject({
        codigo: "ENTREGA_NO_CALIFICABLE",
        message: HOY.entregaNoCalificable,
      })
    }
    for (const error of [tareaConCalificaciones(), tareaConCalificaciones("tarea")]) {
      expect(error).toMatchObject({
        codigo: "TAREA_CON_CALIFICACIONES",
        message: HOY.tareaConCalificaciones,
      })
    }
    expect(TEXTOS_POR_ACTIVIDAD.tarea.tareaNoEncontrada).toBe("Esa tarea ya no existe.")
  })

  it("FORO-1A07: CATEGORIA_REQUERIDA, con «foro» y sin el parámetro", () => {
    expect(
      capturar(() =>
        validarCategoriaRequerida({ categoriaId: null, categoriasEnLaClase: 2, actividad: "foro" }),
      ),
    ).toMatchObject({
      codigo: "CATEGORIA_REQUERIDA",
      estado: 409,
      message: FORO.categoriaRequerida,
    })
    expect(
      capturar(() => validarCategoriaRequerida({ categoriaId: null, categoriasEnLaClase: 2 })),
    ).toMatchObject({ codigo: "CATEGORIA_REQUERIDA", estado: 409, message: HOY.categoriaRequerida })
  })

  it("FORO-1A07: TAREA_CON_ENTREGAS en singular y plural, al admin y al maestro, con «foro» y sin el parámetro", () => {
    expect(mensajeTareaConEntregas(1, "admin", "foro")).toBe(FORO.conEntregasAdmin1)
    expect(mensajeTareaConEntregas(3, "admin", "foro")).toBe(FORO.conEntregasAdmin3)
    expect(mensajeTareaConEntregas(1, "maestro", "foro")).toBe(FORO.conEntregasMaestro1)
    expect(mensajeTareaConEntregas(3, "maestro", "foro")).toBe(FORO.conEntregasMaestro3)
    expect(mensajeTareaConEntregas(1, "admin")).toBe(HOY.conEntregasAdmin1)
    expect(mensajeTareaConEntregas(3, "admin")).toBe(HOY.conEntregasAdmin3)
    expect(mensajeTareaConEntregas(1, "maestro")).toBe(HOY.conEntregasMaestro1)
    expect(mensajeTareaConEntregas(3, "maestro")).toBe(HOY.conEntregasMaestro3)

    expect(
      capturar(() =>
        exigirBorradoConEntregasPermitido({
          rolDelActor: "maestro",
          entregas: 1,
          confirmarEntregas: false,
          actividad: "foro",
        }),
      ),
    ).toMatchObject({
      codigo: "TAREA_CON_ENTREGAS",
      estado: 409,
      message: FORO.conEntregasMaestro1,
    })
    expect(
      capturar(() =>
        exigirBorradoConEntregasPermitido({
          rolDelActor: "admin",
          entregas: 3,
          confirmarEntregas: false,
          actividad: "foro",
        }),
      ),
    ).toMatchObject({ codigo: "TAREA_CON_ENTREGAS", estado: 409, message: FORO.conEntregasAdmin3 })
    expect(
      capturar(() =>
        exigirBorradoConEntregasPermitido({
          rolDelActor: "admin",
          entregas: 3,
          confirmarEntregas: false,
        }),
      ),
    ).toMatchObject({ codigo: "TAREA_CON_ENTREGAS", message: HOY.conEntregasAdmin3 })
  })

  it("FORO-1A07: decidirCalificacion lanza RUBRICA_MODIFICADA con el texto de su actividad", () => {
    const base = {
      criterios: CRITERIOS,
      puntosDeLaTarea: 10,
      puntosVistos: 9,
      puntajes: [{ criterioId: "c1", puntos: 5 }],
      calificacionDirecta: null,
    }
    expect(capturar(() => decidirCalificacion({ ...base, actividad: "foro" }))).toMatchObject({
      codigo: "RUBRICA_MODIFICADA",
      message: FORO.rubricaModificada,
    })
    // La forma que no corresponde también es RUBRICA_MODIFICADA.
    expect(
      capturar(() =>
        decidirCalificacion({ ...base, puntosVistos: 10, puntajes: [], actividad: "foro" }),
      ),
    ).toMatchObject({ codigo: "RUBRICA_MODIFICADA", message: FORO.rubricaModificada })
    expect(capturar(() => decidirCalificacion(base))).toMatchObject({
      codigo: "RUBRICA_MODIFICADA",
      message: HOY.rubricaModificada,
    })
  })

  it("FORO-1A07: exigirEntregaCalificable lanza ENTREGA_NO_CALIFICABLE con el texto de su actividad", () => {
    const tarea = { fechaLimite: FUTURA, aceptaTardias: false }
    expect(
      capturar(() =>
        exigirEntregaCalificable({ estado: "asignado", tarea, ahora: AHORA, actividad: "foro" }),
      ),
    ).toMatchObject({ codigo: "ENTREGA_NO_CALIFICABLE", message: FORO.entregaNoCalificable })
    expect(
      capturar(() => exigirEntregaCalificable({ estado: "asignado", tarea, ahora: AHORA })),
    ).toMatchObject({ codigo: "ENTREGA_NO_CALIFICABLE", message: HOY.entregaNoCalificable })
  })

  it("FORO-1A07: exigirRubricaCongelada lanza TAREA_CON_CALIFICACIONES con el texto de su actividad", () => {
    const base = {
      calificadas: 1,
      puntosActuales: 10,
      puntosNuevos: 20,
      rubricaActual: [],
      rubricaNueva: [],
    }
    expect(capturar(() => exigirRubricaCongelada({ ...base, actividad: "foro" }))).toMatchObject({
      codigo: "TAREA_CON_CALIFICACIONES",
      message: FORO.tareaConCalificaciones,
    })
    expect(capturar(() => exigirRubricaCongelada(base))).toMatchObject({
      codigo: "TAREA_CON_CALIFICACIONES",
      message: HOY.tareaConCalificaciones,
    })
  })
})
