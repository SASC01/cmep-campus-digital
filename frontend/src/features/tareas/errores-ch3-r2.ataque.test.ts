import { contarCaracteresVisibles } from "@campus/shared"
import { describe, expect, it } from "vitest"

import { CAMPO_FUERA_DE_CONTRATO, MENSAJE_DE_PRUEBA } from "@/lib/errores-de-api-fuera-de-contrato"
import { ApiError } from "@/services/apiClient"

import { TRADUCCION_DE_ERRORES_TAREAS } from "./data"
import {
  errorDeEnlacesDeApi,
  errorDeTextoDeApi,
  erroresDeCalificacionDeApi,
  erroresDeLaTareaDeApi,
  mensajeDelAvisoDeCalificar,
  mensajeDelCampoDeCalificacion,
} from "./lib"

// Ataque CHORE-03 03a, ronda 2 (tester), punto de ataque de la Enmienda 2 (T-01): la ruta doble en
// cada camino de un campo pintado y no pintado de features/tareas (el formulario de la tarea, su fila
// de rúbrica, los enlaces, el texto del hilo, los campos de calificar y el aviso de calificar), con
// separadores raros entre los dos prefijos, con un resto sin texto visible tras el nombre y con un
// tercer prefijo, que nada debe quitar. Todo carácter invisible va escrito como escape. Sin fechas.

const GENERICO = TRADUCCION_DE_ERRORES_TAREAS.generico
const validacion = (mensaje: string) => new ApiError("VALIDACION", mensaje, 400)
const CRITERIOS = [{ id: "c-uno" }, { id: "c-dos" }]

interface Camino {
  camino: string
  prefijo: string
  // El texto que ese camino le da a la persona (en su campo o en su aviso), o null si no lo toma.
  leer: (error: unknown) => string | null
}

const unico = (errores: Readonly<Record<string, string | undefined>> | null, llave: string) => {
  if (errores === null) return null
  expect(Object.keys(errores)).toEqual([llave])
  return errores[llave] ?? null
}

const CAMINOS: readonly Camino[] = [
  {
    camino: "título de la tarea",
    prefijo: "titulo",
    leer: (e) => unico(erroresDeLaTareaDeApi(e), "titulo"),
  },
  {
    camino: "fila de la rúbrica",
    prefijo: "rubrica.1.puntosMax",
    leer: (e) => unico(erroresDeLaTareaDeApi(e), "rubrica.1.puntosMax"),
  },
  { camino: "un enlace de la entrega", prefijo: "enlaces.0", leer: errorDeEnlacesDeApi },
  { camino: "los enlaces de la entrega", prefijo: "enlaces", leer: errorDeEnlacesDeApi },
  { camino: "texto del hilo", prefijo: "texto", leer: errorDeTextoDeApi },
  {
    camino: "comentario de calificar (panel)",
    prefijo: "comentario",
    leer: (e) => unico(erroresDeCalificacionDeApi(e, CRITERIOS), "comentario"),
  },
  {
    camino: "un puntaje de calificar (panel)",
    prefijo: "puntajes.1.puntos",
    leer: (e) => unico(erroresDeCalificacionDeApi(e, CRITERIOS), "puntajes.c-dos"),
  },
  {
    camino: "calificación sin rúbrica (panel)",
    prefijo: "calificacion",
    leer: (e) => unico(erroresDeCalificacionDeApi(e, []), "calificacion"),
  },
  {
    camino: "campo de calificar sin lugar en el panel (aviso)",
    prefijo: "puntajes.7.puntos",
    leer: mensajeDelCampoDeCalificacion,
  },
  {
    camino: "aviso de calificar (campo no pintado)",
    prefijo: "version",
    leer: mensajeDelAvisoDeCalificar,
  },
  {
    camino: "formulario de la tarea, campo no pintado (aviso)",
    prefijo: "archivoIds.0.id",
    leer: mensajeDelAvisoDeCalificar,
  },
]

// Separadores raros entre la ruta y el nombre, y entre el nombre y el mensaje.
const SEPARADORES = [": ", ":", ":\t", ":\n", ":  ", ": \t"] as const
const RESTOS_INVISIBLES = ["", "\u{200B}", "\u{00A0}\u{200B}\n", "\u{0085}", "\u{3000}"] as const

const casos = CAMINOS.flatMap((camino) =>
  SEPARADORES.map((separador) => ({
    ...camino,
    separador: JSON.stringify(separador),
    crudo: separador,
  })),
)

describe("ataque CHORE-03 03a r2 · T-01: la ruta doble en cada camino de features/tareas", () => {
  it.each(casos)(
    "$camino: «$prefijo + <nombre> + <mensaje>» con el separador $separador da el mensaje, sin ruta ni nombre",
    ({ prefijo, crudo, leer }) => {
      const texto = leer(
        validacion(`${prefijo}${crudo}${CAMPO_FUERA_DE_CONTRATO}${crudo}${MENSAJE_DE_PRUEBA}`),
      )
      expect(texto).toBe(MENSAJE_DE_PRUEBA)
    },
  )

  it.each(CAMINOS)(
    "$camino: «$prefijo: <nombre>:» con un resto sin texto visible da el genérico, nunca un texto vacío",
    ({ prefijo, leer }) => {
      for (const resto of RESTOS_INVISIBLES) {
        const texto = leer(validacion(`${prefijo}: ${CAMPO_FUERA_DE_CONTRATO}:${resto}`))
        expect(texto, JSON.stringify(resto)).toBe(GENERICO)
      }
    },
  )

  it.each(CAMINOS)(
    "$camino: un tercer prefijo no se quita («$prefijo: a: b: Mensaje» → «b: Mensaje») y la salida sigue teniendo texto visible",
    ({ prefijo, leer }) => {
      const texto = leer(validacion(`${prefijo}: a: b: ${MENSAJE_DE_PRUEBA}`))
      expect(texto).toBe(`b: ${MENSAJE_DE_PRUEBA}`)
      expect(contarCaracteresVisibles(texto ?? "")).toBeGreaterThan(0)
    },
  )

  it.each(CAMINOS)(
    "$camino: lo que sigue a la ruta y empieza con mayúscula, dígito o comillas no se toca",
    ({ prefijo, leer }) => {
      for (const resto of ["Nota: algo", "14:30 no es válido", '"nota": y', "Debe ser 0: 10"]) {
        expect(leer(validacion(`${prefijo}: ${resto}`)), resto).toBe(resto)
      }
    },
  )
})
