import { describe, expect, it } from "vitest"

import { TEXTOS_ADJUNTOS } from "@/components/adjuntos/data"
import * as contrato from "@/lib/errores-de-api"
import { RESTOS_SIN_TEXTO_VISIBLE } from "@/lib/errores-de-api-fuera-de-contrato"
import { ApiError } from "@/services/apiClient"

import { CODIGOS_CON_MENSAJE_DEL_SERVIDOR } from "./data"
import {
  avisoDeFalloAlSubir,
  errorDelCampoCodigo,
  erroresDeCategoriasDeApi,
  erroresDeFormularioClases,
  erroresDelTemaDeApi,
  mensajeDeConsultaClases,
  mensajeDeErrorClases,
  mensajeDeErrorDeLista,
} from "./lib"

// Tester, ronda 1 de CHORE-03 03b: ataque a la traducción de errores de features/clases (funciones de
// §D-4) y a las reglas estáticas del alcance de 03b (O-05). N-46 va en services/apiClient-ch3-r1. Sin fechas ni reloj: nada de lo que
// se prueba depende del tiempo. Todo carácter invisible va como escape.

const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const SIN_ACCESO = "No tienes acceso a esta clase."
const ID_INVALIDO = "debe ser un identificador válido"
const TEXTO_DEL_CURSOR = "El muro cambió mientras lo veías."
const NOMBRE = "guia.pdf"
const M = "Revisa este valor."

const validacion = (mensaje: string) => new ApiError("VALIDACION", mensaje, 400)

// Una ruta del servidor al inicio del texto (la misma forma de §D-1): nunca debe llegar a la persona.
const EMPIEZA_CON_RUTA = /^[\p{L}\p{M}\p{N}_.-]+:/u

const visible = (texto: string) => texto.replace(/[\s\p{Cf}\u{0085}]/gu, "").length > 0

const RUTA_LARGA = `${"a".repeat(4000)}.0`
const RUTA_DE_MUCHOS_NIVELES = Array.from({ length: 300 }, (_, i) => `n${String(i)}`).join(".")

interface EntradaDeAtaque {
  nombre: string
  mensaje: string
  // Lo que da una acción (mensajeDeErrorClases).
  accion: string
  // Lo que da una consulta (mensajeDeConsultaClases y, sin cursor, mensajeDeErrorDeLista).
  consulta: string
}

const ENTRADAS: readonly EntradaDeAtaque[] = [
  {
    nombre: "mezcla de restos sin ruta",
    mensaje: "\u{00A0}\u{200B}\n",
    accion: GENERICO,
    consulta: GENERICO,
  },
  {
    nombre: "mezcla de restos tras una ruta",
    mensaje: "orden.3:\u{00A0}\u{200B}\n\u0085",
    accion: GENERICO,
    consulta: GENERICO,
  },
  {
    nombre: "ruta con marca combinante",
    mensaje: `pa\u{0301}rametro: ${M}`,
    accion: M,
    consulta: GENERICO,
  },
  {
    nombre: "ruta precompuesta fuera de ASCII",
    mensaje: `párametro: ${M}`,
    accion: M,
    consulta: GENERICO,
  },
  { nombre: "ruta solo de dígitos", mensaje: `0123456789: ${M}`, accion: M, consulta: GENERICO },
  { nombre: "ruta muy larga", mensaje: `${RUTA_LARGA}: ${M}`, accion: M, consulta: GENERICO },
  {
    nombre: "ruta de 300 niveles",
    mensaje: `${RUTA_DE_MUCHOS_NIVELES}: ${M}`,
    accion: M,
    consulta: GENERICO,
  },
  {
    nombre: "ruta de 300 niveles sin texto visible",
    mensaje: `${RUTA_DE_MUCHOS_NIVELES}:\u{2060}`,
    accion: GENERICO,
    consulta: GENERICO,
  },
  {
    nombre: "publicacionId doble",
    mensaje: `publicacionId: publicacionId: ${ID_INVALIDO}`,
    accion: ID_INVALIDO,
    consulta: GENERICO,
  },
  {
    nombre: "comentarioId doble sin espacios",
    mensaje: `comentarioId:comentarioId:${ID_INVALIDO}`,
    accion: ID_INVALIDO,
    consulta: GENERICO,
  },
  {
    nombre: "temaId doble con tabulador",
    mensaje: `temaId:\ttemaId:\t${ID_INVALIDO}`,
    accion: ID_INVALIDO,
    consulta: GENERICO,
  },
  {
    nombre: "temaIds.12 con temaId",
    mensaje: `temaIds.12: temaId: ${ID_INVALIDO}`,
    accion: ID_INVALIDO,
    consulta: GENERICO,
  },
  {
    nombre: "temaIds.0 con temaId sin texto visible",
    mensaje: "temaIds.0: temaId:\u{00A0}\u{200B}\n",
    accion: GENERICO,
    consulta: GENERICO,
  },
  {
    nombre: "maestroId doble",
    mensaje: `maestroId: maestroId: ${ID_INVALIDO}`,
    accion: ID_INVALIDO,
    consulta: GENERICO,
  },
  {
    nombre: "maestroIds.1 con maestroId",
    mensaje: `maestroIds.1: maestroId: ${ID_INVALIDO}`,
    accion: ID_INVALIDO,
    consulta: GENERICO,
  },
  {
    nombre: "maestroIds.0 con maestroId sin texto visible",
    mensaje: "maestroIds.0: maestroId:\u{FEFF}",
    accion: GENERICO,
    consulta: GENERICO,
  },
  {
    nombre: "categorias.3.id con categoriaId",
    mensaje: `categorias.3.id: categoriaId: ${ID_INVALIDO}`,
    accion: ID_INVALIDO,
    consulta: GENERICO,
  },
  {
    nombre: "alumnoId doble",
    mensaje: `alumnoId: alumnoId: ${ID_INVALIDO}`,
    accion: ID_INVALIDO,
    consulta: GENERICO,
  },
  {
    nombre: "archivoId doble sin texto visible",
    mensaje: "archivoId: archivoId:\u{3000}",
    accion: GENERICO,
    consulta: GENERICO,
  },
  {
    nombre: "tema doble",
    mensaje: "tema: tema: elige un tema válido",
    accion: "elige un tema válido",
    consulta: GENERICO,
  },
  {
    nombre: "tema doble sin espacios",
    mensaje: "tema:tema:elige un tema válido",
    accion: "elige un tema válido",
    consulta: GENERICO,
  },
  {
    nombre: "claseId doble",
    mensaje: `claseId: claseId: ${ID_INVALIDO}`,
    accion: SIN_ACCESO,
    consulta: SIN_ACCESO,
  },
  {
    nombre: "claseId doble sin espacios",
    mensaje: `claseId:claseId:${ID_INVALIDO}`,
    accion: SIN_ACCESO,
    consulta: SIN_ACCESO,
  },
  {
    nombre: "claseId sin texto visible",
    mensaje: "claseId:\u{00A0}\u{200B}\n",
    accion: SIN_ACCESO,
    consulta: SIN_ACCESO,
  },
  {
    nombre: "claseId con índice (no es el parámetro de la clase)",
    mensaje: `claseId.0: ${M}`,
    accion: M,
    consulta: GENERICO,
  },
  {
    nombre: "limite en inglés",
    mensaje: "limite: Too big: expected number to be <=50",
    accion: "Too big: expected number to be <=50",
    consulta: GENERICO,
  },
  {
    nombre: "cursor con índice (no es el cursor)",
    mensaje: "cursor.0: no es válido",
    accion: "no es válido",
    consulta: GENERICO,
  },
  {
    nombre: "Cursor con mayúscula (no es el cursor)",
    mensaje: "Cursor: no es válido",
    accion: "no es válido",
    consulta: GENERICO,
  },
  {
    nombre: "cuerpo con clave de más",
    mensaje: 'cuerpo: Unrecognized key: "rol"',
    accion: 'Unrecognized key: "rol"',
    consulta: GENERICO,
  },
  { nombre: "constructor como campo", mensaje: `constructor: ${M}`, accion: M, consulta: GENERICO },
  { nombre: "__proto__ como campo", mensaje: `__proto__: ${M}`, accion: M, consulta: GENERICO },
]

describe("ataque CHORE-03 03b r1 · traducción de features/clases", () => {
  it.each(ENTRADAS)(
    "«$nombre»: la acción, la consulta, el «Ver más» y el aviso de subida dan un texto legible, sin ruta",
    ({ mensaje, accion, consulta }) => {
      const error = validacion(mensaje)
      const salidas = [
        mensajeDeErrorClases(error),
        mensajeDeConsultaClases(error),
        mensajeDeErrorDeLista(error, TEXTO_DEL_CURSOR),
      ]
      expect(salidas).toEqual([accion, consulta, consulta])
      expect(avisoDeFalloAlSubir(error, NOMBRE)).toBe(
        TEXTOS_ADJUNTOS.errorRechazado(NOMBRE, accion),
      )
      for (const salida of salidas) {
        expect(visible(salida)).toBe(true)
        expect(salida).not.toMatch(EMPIEZA_CON_RUTA)
        expect(salida.length).toBeLessThan(200)
      }
    },
  )

  it.each(["cursor: x", "cursor:", "cursor:\u{200B}", "cursor:\t\n x"])(
    "«Ver más» con «%s» da el texto del cursor; la consulta y la acción no lo confunden con otro campo",
    (mensaje) => {
      const error = validacion(mensaje)
      expect(mensajeDeErrorDeLista(error, TEXTO_DEL_CURSOR)).toBe(TEXTO_DEL_CURSOR)
      expect(mensajeDeConsultaClases(error)).toBe(GENERICO)
      expect(visible(mensajeDeErrorClases(error))).toBe(true)
      expect(mensajeDeErrorClases(error)).not.toMatch(EMPIEZA_CON_RUTA)
    },
  )

  it.each([
    "constructor",
    "toString",
    "__proto__",
    "hasOwnProperty",
    "valueOf",
    "",
    " VALIDACION",
    "validacion",
  ])(
    "un código «%s» que no está en las tablas da el genérico en la acción y en la consulta (Object.hasOwn)",
    (codigo) => {
      for (const mensaje of [M, "claseId: x", "", "\u{200B}"]) {
        const error = new ApiError(codigo, mensaje, 400)
        expect(mensajeDeErrorClases(error)).toBe(GENERICO)
        expect(mensajeDeConsultaClases(error)).toBe(GENERICO)
        expect(mensajeDeErrorDeLista(error, TEXTO_DEL_CURSOR)).toBe(GENERICO)
      }
    },
  )

  it.each(CODIGOS_CON_MENSAJE_DEL_SERVIDOR)(
    "%s: con texto se muestra tal cual en la acción y en la consulta (CAL-T-123), y sin texto visible (mezclas) da el genérico",
    (codigo) => {
      for (const mensaje of [
        "Ya hay un tema con ese nombre.",
        "nombre: Ya hay un tema",
        "x: y: z",
      ]) {
        expect(mensajeDeErrorClases(new ApiError(codigo, mensaje, 409))).toBe(mensaje)
        expect(mensajeDeConsultaClases(new ApiError(codigo, mensaje, 409))).toBe(mensaje)
      }
      for (const resto of ["\u{00A0}\u{200B}\n", "\u0085\u{3000}", "\u{2060}\u{FEFF}\t"]) {
        expect(mensajeDeErrorClases(new ApiError(codigo, resto, 409))).toBe(GENERICO)
        expect(mensajeDeConsultaClases(new ApiError(codigo, resto, 409))).toBe(GENERICO)
        expect(mensajeDeErrorDeLista(new ApiError(codigo, resto, 409), TEXTO_DEL_CURSOR)).toBe(
          GENERICO,
        )
      }
    },
  )

  it("lo que no es un ApiError (un Error con mensaje de ruta, un objeto con codigo, null) da el genérico en todas", () => {
    const falsos: unknown[] = [
      new Error(`claseId: ${M}`),
      { codigo: "VALIDACION", message: `nombre: ${M}` },
      { codigo: "SIN_ACCESO_A_LA_CLASE" },
      null,
      undefined,
      "VALIDACION",
    ]
    for (const falso of falsos) {
      expect(mensajeDeErrorClases(falso)).toBe(GENERICO)
      expect(mensajeDeConsultaClases(falso)).toBe(GENERICO)
      expect(mensajeDeErrorDeLista(falso, TEXTO_DEL_CURSOR)).toBe(GENERICO)
      expect(erroresDeFormularioClases(falso, ["nombre"])).toBeNull()
      expect(erroresDeCategoriasDeApi(falso, ["a"])).toBeNull()
    }
  })
})

// El formulario y su gancho deciden con la misma función: si uno dice "es de un campo" y el otro no,
// hay aviso y error a la vez, o ninguno. En categorías el gancho llama con llaves vacías y el editor
// con las de sus filas.
const ENTRADAS_DE_CATEGORIAS: readonly string[] = [
  `categorias.0.nombre: ${M}`,
  "categorias.0.nombre:\u{00A0}\u{200B}\n",
  `categorias.9.peso: ${M}`,
  `categorias.00.peso: ${M}`,
  `categorias: ${M}`,
  "categorias:\u0085",
  `categorias.0.id: categoriaId: ${ID_INVALIDO}`,
  `categorias.0.peso.x: ${M}`,
  `Categorias: ${M}`,
  `categorias.0.nombre.0: ${M}`,
  ...RESTOS_SIN_TEXTO_VISIBLE.map((resto) => `categorias.1.peso:${resto}`),
]

describe("ataque CHORE-03 03b r1 · el editor de categorías y su gancho deciden lo mismo", () => {
  it.each(ENTRADAS_DE_CATEGORIAS)(
    "«%s»: con las llaves de las filas y sin llaves, los dos dicen si es de la lista; el texto es legible y sin ruta",
    (mensaje) => {
      const error = validacion(mensaje)
      const delEditor = erroresDeCategoriasDeApi(error, ["fila-a", "fila-b"])
      const delGancho = erroresDeCategoriasDeApi(error, [])
      expect(delEditor === null).toBe(delGancho === null)
      const textos = [...Object.values(delEditor ?? {}), ...Object.values(delGancho ?? {})]
      for (const texto of textos) {
        expect(typeof texto).toBe("string")
        expect(visible(String(texto))).toBe(true)
        expect(String(texto)).not.toMatch(EMPIEZA_CON_RUTA)
      }
      if (delEditor === null) {
        expect(visible(mensajeDeErrorClases(error))).toBe(true)
        expect(mensajeDeErrorClases(error)).not.toMatch(EMPIEZA_CON_RUTA)
      } else {
        expect(Object.keys(delEditor)).toHaveLength(1)
      }
    },
  )

  it("una fila que ya no existe (índice fuera de las llaves) va a la lista, nunca se pierde", () => {
    expect(erroresDeCategoriasDeApi(validacion(`categorias.9.peso: ${M}`), ["fila-a"])).toEqual({
      categorias: M,
    })
    expect(
      erroresDeCategoriasDeApi(validacion("categorias.9.nombre:\u{200B}"), ["fila-a"]),
    ).toEqual({
      categorias: GENERICO,
    })
  })

  it.each([
    ["nombre", `nombre: ${M}`],
    ["nombre", "nombre:\u{00A0}\u{200B}\n"],
    ["codigo", `codigo: ${M}`],
    ["codigo", "codigo:\u0085"],
  ])(
    "el campo %s («%s») da un solo texto legible y sin ruta en el tema, en unirse y en el formulario de clase",
    (campo, mensaje) => {
      const error = validacion(mensaje)
      const salidas = [
        erroresDelTemaDeApi(error),
        errorDelCampoCodigo(error),
        erroresDeFormularioClases(error, ["nombre", "descripcion", "maestroIds"]),
      ].filter((salida) => salida !== null)
      expect(salidas.length).toBeGreaterThan(0)
      for (const salida of salidas) {
        expect(Object.keys(salida)).toEqual([campo])
        const texto = String(Object.values(salida)[0])
        expect(visible(texto)).toBe(true)
        expect(texto).not.toMatch(EMPIEZA_CON_RUTA)
      }
    },
  )

  it("TEMA_REPETIDO y CODIGO_INVALIDO sin texto visible dan un error de campo legible (el genérico o su texto fijo)", () => {
    expect(erroresDelTemaDeApi(new ApiError("TEMA_REPETIDO", "\u{200B}\u{00A0}", 409))).toEqual({
      nombre: GENERICO,
    })
    expect(errorDelCampoCodigo(new ApiError("CODIGO_INVALIDO", "\u{200B}", 404))).toEqual({
      codigo: "No encontramos una clase con ese código. Revisa que esté bien escrito.",
    })
  })
})

describe("ataque CHORE-03 03b r1 · el contrato después de 03b", () => {
  it("el contrato ya no exporta quitarPrefijoDeCampo ni PREFIJO_DE_RUTA", () => {
    expect(Object.keys(contrato)).not.toContain("quitarPrefijoDeCampo")
    expect(Object.keys(contrato)).not.toContain("PREFIJO_DE_RUTA")
    expect(Object.keys(contrato)).toContain("mensajeDeErrorDeConsulta")
  })
})

// Reglas estáticas sobre el texto crudo (comentarios incluidos), en el alcance de 03b (O-05).
const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})
const esPrueba = (ruta: string) => /\.test\.tsx?$/.test(ruta)
const deProduccion = Object.entries(fuentes).filter(([ruta]) => !esPrueba(ruta))
const ALCANCE_03B = ["/src/features/clases/", "/src/features/calificaciones/"]
const enAlcance = deProduccion.filter(([ruta]) => ALCANCE_03B.some((p) => ruta.startsWith(p)))

describe("ataque CHORE-03 03b r1 · reglas estáticas (O-05)", () => {
  it("O-05: ninguna copia de la expresión de ruta escrita de otra forma (\\w, [^:], \\S, .+?, clase propia, new RegExp) ni un corte por «:» del mensaje en features/clases o features/calificaciones", () => {
    for (const prefijo of ALCANCE_03B) {
      expect(enAlcance.filter(([ruta]) => ruta.startsWith(prefijo)).length).toBeGreaterThan(10)
    }
    const copias: readonly [string, RegExp][] = [
      ["/^[…]+: con cualquier clase", /\/\^\(?\[[^\]\n]*\][+*]\)?:/],
      ["/^\\w+:", /\/\^\(?\\w[+*]\)?:/],
      ["/^\\S+:", /\/\^\(?\\S[+*]\??\)?:/],
      ["/^[^:]+:", /\/\^\(?\[\^:\][+*]\)?:/],
      ["/^.+?:", /\/\^\(?\.[+*]\??\)?:/],
      ["\\p{L} fuera del contrato", /\\p\{L\}/],
      ["new RegExp(", /new RegExp\(/],
      ['.split(":")', /\.split\(\s*["'`]:/],
      ['.indexOf(":")', /\.(last)?[iI]ndexOf\(\s*["'`]:/],
      ["quitarPrefijoDeCampo", /quitarPrefijoDeCampo/],
      ["PREFIJO_DE_RUTA", /\bPREFIJO_DE_RUTA\b/],
      [
        "MENSAJES_ERROR_CLASES declarada (el nombre de antes)",
        /(const|let|var)\s+MENSAJES_ERROR_CLASES\b/,
      ],
      [
        "CODIGOS_QUE_REDIRIGE_EL_CLIENTE declarada",
        /(const|let|var)\s+CODIGOS_QUE_REDIRIGE_EL_CLIENTE\b/,
      ],
    ]
    const fallas = enAlcance.flatMap(([ruta, texto]) =>
      copias.filter(([, regla]) => regla.test(texto)).map(([nombre]) => `${ruta}: ${nombre}`),
    )
    expect(fallas).toEqual([])
  })

  it("O-05: el mensaje del servidor solo se lee en las formas conocidas (la incidencia de zod y el exec de la fila de categorías); nunca se pinta ni se avisa crudo", () => {
    const permitidas = [
      /incidencia\.message$/,
      /PREFIJO_DE_FILA_DE_CATEGORIA\.exec\(error\.message$/,
    ]
    const fallas = enAlcance.flatMap(([ruta, texto]) =>
      Array.from(texto.matchAll(/\.message\b/g))
        .map((m) => texto.slice(Math.max(0, m.index - 70), m.index + ".message".length))
        .map((antes) => antes.replace(/\s+/g, " "))
        .filter((antes) => !permitidas.some((p) => p.test(antes)))
        .map((antes) => `${ruta}: ${antes.slice(-50)}`),
    )
    expect(fallas).toEqual([])
    const crudos = enAlcance.filter(([, texto]) =>
      /(toast\.(error|success|message)\(|mensaje=\{|errorMensaje=\{|\{)\s*[\w.]*\.message\b/.test(
        texto,
      ),
    )
    expect(crudos.map(([ruta]) => ruta)).toEqual([])
  })

  it("los archivos de ataque de esta ronda no tienen un carácter invisible literal", () => {
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
      "\u{2028}",
      "\u{2029}",
      "\u{0301}",
    ]
    // import.meta.glob no incluye el archivo que lo llama: este se revisa desde services/apiClient-ch3-r1.
    const mios = Object.keys(fuentes).filter(
      (ruta) =>
        /-ch3-r1\.ataque\.test\.tsx?$/.test(ruta) &&
        /\/(features\/clases|features\/calificaciones|services)\//.test(ruta),
    )
    expect(mios.length).toBe(4)
    const fallas = mios.flatMap((ruta) =>
      invisibles
        .filter((caracter) => (fuentes[ruta] ?? "").includes(caracter))
        .map(
          (caracter) => `${ruta}: U+${(caracter.codePointAt(0) ?? 0).toString(16).toUpperCase()}`,
        ),
    )
    expect(fallas).toEqual([])
  })
})
