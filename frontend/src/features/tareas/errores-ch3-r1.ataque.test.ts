import { describe, expect, it } from "vitest"

import {
  ENTRADAS_FUERA_DE_CONTRATO,
  MENSAJE_DE_PRUEBA,
  RESTOS_SIN_TEXTO_VISIBLE,
} from "@/lib/errores-de-api-fuera-de-contrato"
import { ApiError } from "@/services/apiClient"

import { CODIGOS_CON_MENSAJE_DEL_SERVIDOR } from "./data"
import {
  erroresDeCalificacionDeApi,
  erroresDeLaTareaDeApi,
  errorDeEnlacesDeApi,
  errorDeTextoDeApi,
  errorQueReemplazaLaVista,
  mensajeDeConsultaTareas,
  mensajeDeErrorTareas,
  mensajeDelAvisoDeCalificar,
  mensajeDelCampoDeCalificacion,
} from "./lib"

// Ataque CHORE-03 03a, ronda 1 (tester): las funciones de traducción de features/tareas con lo que la
// tabla común no trae: mezclas de restos, "Debe ser 0: 10" en cada camino de un campo, mensajes solo de
// puntuación, los ids con y sin texto, un código del servidor que empieza como una ruta y los mensajes
// que el servidor real arma para los ids de la ruta (T-01). Todo carácter invisible va como escape.

const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const SIN_ACCESO = "No tienes acceso a esta clase."
const TAREA_NO_EXISTE = "Esa tarea ya no existe."
const ALUMNO_NO_EXISTE = "No encontramos a ese alumno en esta clase."
const validacion = (mensaje: string) => new ApiError("VALIDACION", mensaje, 400)
const CRITERIOS = [{ id: "criterio-1" }, { id: "criterio-2" }]

const MEZCLAS: readonly string[] = [
  "\u{00A0}\u{200B}\n",
  "\n\u{00A0}\u{200B}\t\u{3000}",
  "\u{2028}\u{00AD}",
  "\u{180E}\u{034F}",
  "\u{200E}\u{200F}\u{FE0F}",
  "\u{115F}\u{1160}\u{FFA0}",
  "\u{0301}",
  "\u{3164}",
]
const RESTOS = [...RESTOS_SIN_TEXTO_VISIBLE, ...MEZCLAS]

describe("ataque CHORE-03 03a r1 · traducción de features/tareas", () => {
  it("cada campo que el formulario pinta, con una mezcla de restos invisibles, da el genérico por su función y nunca un texto vacío", () => {
    for (const resto of RESTOS) {
      const etiqueta = JSON.stringify(resto)
      expect(erroresDeLaTareaDeApi(validacion(`titulo:${resto}`)), etiqueta).toEqual({
        titulo: GENERICO,
      })
      for (const campo of [
        "instrucciones",
        "fechaLimite",
        "puntos",
        "categoriaId",
        "temaId",
        "requiereAdjuntos",
        "rubrica",
      ]) {
        expect(erroresDeLaTareaDeApi(validacion(`${campo}:${resto}`)), campo).toEqual({
          [campo]: GENERICO,
        })
      }
      expect(erroresDeLaTareaDeApi(validacion(`rubrica.3.puntosMax:${resto}`))).toEqual({
        "rubrica.3.puntosMax": GENERICO,
      })
      expect(errorDeEnlacesDeApi(validacion(`enlaces.4:${resto}`)), etiqueta).toBe(GENERICO)
      expect(errorDeEnlacesDeApi(validacion(`enlaces:${resto}`)), etiqueta).toBe(GENERICO)
      expect(errorDeTextoDeApi(validacion(`texto:${resto}`)), etiqueta).toBe(GENERICO)
      expect(
        erroresDeCalificacionDeApi(validacion(`puntajes.1.puntos:${resto}`), CRITERIOS),
      ).toEqual({ "puntajes.criterio-2": GENERICO })
      expect(erroresDeCalificacionDeApi(validacion(`comentario:${resto}`), CRITERIOS)).toEqual({
        comentario: GENERICO,
      })
      expect(erroresDeCalificacionDeApi(validacion(`calificacion:${resto}`), [])).toEqual({
        calificacion: GENERICO,
      })
      expect(mensajeDelCampoDeCalificacion(validacion(`calificacion:${resto}`))).toBe(GENERICO)
      expect(mensajeDelCampoDeCalificacion(validacion(`puntajes.7.puntos:${resto}`))).toBe(GENERICO)
      expect(mensajeDelAvisoDeCalificar(validacion(`puntajes.0.criterioId:${resto}`))).toBe(
        GENERICO,
      )
      expect(mensajeDeErrorTareas(validacion(`archivoIds.0.id:${resto}`))).toBe(GENERICO)
      expect(mensajeDeConsultaTareas(validacion(`limite:${resto}`))).toBe(GENERICO)
    }
  })

  it("«Debe ser 0: 10» y «Nota: algo» se recortan una sola vez en cada camino de un campo (fila de la rúbrica, enlaces, texto, calificar y aviso)", () => {
    const resto = "Debe ser 0: 10"
    expect(erroresDeLaTareaDeApi(validacion(`titulo: ${resto}`))).toEqual({ titulo: resto })
    expect(erroresDeLaTareaDeApi(validacion(`rubrica.0.criterio: ${resto}`))).toEqual({
      "rubrica.0.criterio": resto,
    })
    expect(errorDeEnlacesDeApi(validacion(`enlaces.0: ${resto}`))).toBe(resto)
    expect(errorDeTextoDeApi(validacion("texto: Nota: algo"))).toBe("Nota: algo")
    expect(
      erroresDeCalificacionDeApi(validacion(`puntajes.0.puntos: ${resto}`), CRITERIOS),
    ).toEqual({ "puntajes.criterio-1": resto })
    expect(mensajeDelCampoDeCalificacion(validacion(`calificacion: ${resto}`))).toBe(resto)
    expect(mensajeDelAvisoDeCalificar(validacion("version: Nota: algo"))).toBe("Nota: algo")
    expect(mensajeDeErrorTareas(validacion(`archivoIds.0.id: ${resto}`))).toBe(resto)
  })

  it("un código del servidor nunca se recorta, aunque empiece como una ruta, y con un resto invisible da el genérico; en la consulta, lo mismo", () => {
    expect(CODIGOS_CON_MENSAJE_DEL_SERVIDOR.length).toBe(14)
    for (const codigo of CODIGOS_CON_MENSAJE_DEL_SERVIDOR) {
      for (const mensaje of ["fecha: La entrega cerró", "Debe ser 0: 10", "a.b.0: c", "..."]) {
        const error = new ApiError(codigo, mensaje, 409)
        expect(mensajeDeErrorTareas(error), codigo).toBe(mensaje)
        expect(mensajeDeConsultaTareas(error), codigo).toBe(mensaje)
        expect(mensajeDelAvisoDeCalificar(error), codigo).toBe(mensaje)
      }
      for (const resto of MEZCLAS) {
        const error = new ApiError(codigo, resto, 409)
        expect(mensajeDeErrorTareas(error), codigo).toBe(GENERICO)
        expect(mensajeDeConsultaTareas(error), codigo).toBe(GENERICO)
      }
    }
  })

  it("un mensaje solo de puntuación es visible: «...» en un VALIDACION sin ruta, tras una ruta y en un campo pintado", () => {
    expect(mensajeDeErrorTareas(validacion("..."))).toBe("...")
    expect(mensajeDeErrorTareas(validacion("archivoIds.0: ..."))).toBe("...")
    expect(erroresDeLaTareaDeApi(validacion("titulo: ..."))).toEqual({ titulo: "..." })
    expect(errorDeTextoDeApi(validacion("texto:..."))).toBe("...")
    expect(erroresDeCalificacionDeApi(validacion("comentario: ..."), CRITERIOS)).toEqual({
      comentario: "...",
    })
  })

  it("claseId, tareaId y alumnoId con y sin texto, con un resto invisible y con «Too big: …» dan su texto fijo en la acción y en la consulta, y reemplazan la vista", () => {
    const ids = [
      ["claseId", SIN_ACCESO],
      ["tareaId", TAREA_NO_EXISTE],
      ["alumnoId", ALUMNO_NO_EXISTE],
    ] as const
    for (const [campo, texto] of ids) {
      for (const resto of [
        "",
        " x",
        "\u{200B}",
        "\u{00A0}\u{200B}\n",
        " Too big: expected number",
      ]) {
        const error = validacion(`${campo}:${resto}`)
        expect(mensajeDeErrorTareas(error), `${campo}${resto}`).toBe(texto)
        expect(mensajeDeConsultaTareas(error)).toBe(texto)
        expect(mensajeDelAvisoDeCalificar(error)).toBe(texto)
        expect(errorQueReemplazaLaVista(true, error)).toBe(true)
        expect(erroresDeLaTareaDeApi(error)).toBeNull()
      }
    }
  })

  it("las rutas de la tabla común nunca marcan un campo de tareas ni de calificar y nunca dejan la ruta en el aviso", () => {
    for (const { clase, mensaje, resto } of ENTRADAS_FUERA_DE_CONTRATO) {
      if (clase === "sin-ruta") continue
      expect(erroresDeLaTareaDeApi(validacion(mensaje)), mensaje).toBeNull()
      expect(errorDeEnlacesDeApi(validacion(mensaje)), mensaje).toBeNull()
      expect(errorDeTextoDeApi(validacion(mensaje)), mensaje).toBeNull()
      expect(erroresDeCalificacionDeApi(validacion(mensaje), CRITERIOS), mensaje).toBeNull()
      expect(mensajeDelCampoDeCalificacion(validacion(mensaje)), mensaje).toBeNull()
      expect(mensajeDelAvisoDeCalificar(validacion(mensaje)), mensaje).toBe(resto ?? GENERICO)
    }
    expect(mensajeDeErrorTareas(validacion(`enlaces.0.url: ${MENSAJE_DE_PRUEBA}`))).toBe(
      MENSAJE_DE_PRUEBA,
    )
  })

  // Lo que el servidor real responde ante un id de la ruta que no es un UUID o un ?confirmar= que no
  // es "entregas" (validarParametros con idDeRuta, archivoIdParamSchema y borrarTareaQuerySchema de
  // shared/, comprobado con el backend en esta ronda): el campo va dos veces.
  it("T-01: «archivoId: archivoId: …» (descargar un adjunto de la tarea o de una entrega) y «confirmar: confirmar: no es válido» (borrar) dan un aviso sin ruta técnica", () => {
    const delServidor = [
      "archivoId: archivoId: debe ser un identificador válido",
      "confirmar: confirmar: no es válido",
    ]
    for (const mensaje of delServidor) {
      expect(mensajeDeErrorTareas(validacion(mensaje)), mensaje).not.toMatch(/^[\p{L}\p{N}_.-]+:/u)
    }
  })
})

const fuentes = import.meta.glob<string>("/src/**/*-ch3-r1.ataque.test.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})

describe("ataque CHORE-03 03a r1 · sin invisibles literales en las otras pruebas de esta ronda", () => {
  it("O-06: las pruebas de ataque de esta ronda (salvo esta, que revisan las otras) no tienen un carácter invisible literal", () => {
    const invisibles = [
      "\u{00A0}",
      "\u{3000}",
      "\u{200B}",
      "\u{200C}",
      "\u{200D}",
      "\u{2060}",
      "\u{FEFF}",
      "\u{0085}",
      "\u{2800}",
      "\u{3164}",
      "\u{1D159}",
      "\u{00AD}",
      "\u{180E}",
      "\u{2028}",
      "\u{2029}",
      "\u{FE0F}",
      "\u{200E}",
      "\u{200F}",
      "\u{115F}",
      "\u{1160}",
      "\u{FFA0}",
      "\u{2062}",
      "\u{034F}",
    ]
    const rutas = Object.keys(fuentes)
    expect(rutas).toContain("/src/lib/errores-ch3-r1.ataque.test.ts")
    const fallas = rutas.flatMap((ruta) =>
      invisibles
        .filter((c) => (fuentes[ruta] ?? "").includes(c))
        .map((c) => `${ruta}: U+${(c.codePointAt(0) ?? 0).toString(16).toUpperCase()}`),
    )
    expect(fallas).toEqual([])
  })
})
