import { contarCaracteresVisibles } from "@campus/shared"
import { describe, expect, it } from "vitest"

import { ApiError } from "@/services/apiClient"

import {
  campoDeErrorDeApi,
  erroresDeFormularioDeApi,
  esErrorDeCursor,
  mensajeDeErrorDeApi,
  mensajeDeErrorDeConsulta,
  quitarRutaDelMensaje,
  textoVisibleOGenerico,
  type TraduccionDeErrores,
} from "./errores-de-api"
import {
  ENTRADAS_FUERA_DE_CONTRATO,
  MENSAJE_DE_PRUEBA,
  RESTOS_SIN_TEXTO_VISIBLE,
} from "./errores-de-api-fuera-de-contrato"

// Ataque CHORE-03 03a, ronda 1 (tester): el contrato de lib/errores-de-api.ts con entradas que la
// tabla común no trae (mezclas de restos, rutas muy largas, de solo dígitos, con marcas combinantes o
// de muchos niveles), los mensajes que el servidor real arma para los ids de la ruta y las reglas
// estáticas que la prueba del programador no mira (O-05, O-06). Todo carácter invisible va escrito como
// escape. Sin fechas.

const GENERICO = "Genérico del módulo."
const RESPALDO = "Respaldo del lugar."
const SIN_ACCESO = "Sin acceso."

const TRADUCCION: TraduccionDeErrores = {
  generico: GENERICO,
  mensajesPorCodigo: { CODIGO_FIJO: "Texto fijo." },
  codigosConMensajeDelServidor: ["DEL_SERVIDOR"],
  textosPorCampo: { claseId: SIN_ACCESO },
}

const validacion = (mensaje: string) => new ApiError("VALIDACION", mensaje, 400)

// Restos invisibles que la tabla común no trae: mezclas y caracteres de formato, de control, de
// relleno y separadores de línea.
const RESTOS_EXTRA: readonly string[] = [
  "\u{00A0}\u{200B}\n",
  "\n\u{00A0}\u{200B}\t\u{3000}",
  "\u{2028}",
  "\u{2029}",
  "\u{00AD}",
  "\u{180E}",
  "\u{034F}",
  "\u{200E}\u{200F}",
  "\u{FE0F}",
  "\u{E0020}",
  "\u{115F}\u{1160}",
  "\u{FFA0}",
  "\u{2062}",
  "\u{0301}",
  "\u{000B}\u{000C}",
  "\u{2800}",
  "\u{1D159}",
  "\u{3164}",
  "\u{200B}".repeat(500),
]

// Rutas que la tabla común no trae: muy larga, solo dígitos, letras con marca combinante (la "a" con
// U+0301 y la "á" precompuesta), de muchos niveles, de otros alfabetos y con índices negativos.
const RUTAS_EXTRA: readonly string[] = [
  "campo".repeat(2000),
  "1234567890",
  "pa\u{0301}rametro",
  "párametro",
  "\u{0301}",
  Array.from({ length: 200 }, (_, i) => `n${String(i)}`).join("."),
  Array.from({ length: 50 }, () => "0").join("."),
  "字段.0",
  "حقل",
  "puntajes.-1.puntos",
  "ÁRBOL_Ñ-9.Ü",
]

const SEPARADORES: readonly string[] = [": ", ":", ":\t", ":\n", ":\u{00A0}", ": \u{3000} "]

describe("ataque CHORE-03 03a r1 · el contrato con entradas fuera de la tabla común", () => {
  it("una ruta muy larga, de solo dígitos, con marcas combinantes o de muchos niveles se quita una sola vez con cada separador", () => {
    for (const ruta of RUTAS_EXTRA) {
      for (const separador of SEPARADORES) {
        const mensaje = `${ruta}${separador}${MENSAJE_DE_PRUEBA}`
        expect(quitarRutaDelMensaje(mensaje), JSON.stringify(mensaje.slice(0, 60))).toBe(
          MENSAJE_DE_PRUEBA,
        )
        expect(mensajeDeErrorDeApi(validacion(mensaje), TRADUCCION)).toBe(MENSAJE_DE_PRUEBA)
        expect(mensajeDeErrorDeConsulta(validacion(mensaje), TRADUCCION, RESPALDO)).toBe(RESPALDO)
      }
    }
  })

  it("una ruta (de la tabla o extra) seguida de una mezcla de restos invisibles da el genérico en la acción y el respaldo en la consulta, nunca un texto invisible", () => {
    const rutas = [...RUTAS_EXTRA, "campoFueraDeContrato", "archivoIds.0.id", "0", ".", "-"]
    const restos = [...RESTOS_SIN_TEXTO_VISIBLE, ...RESTOS_EXTRA]
    for (const ruta of rutas) {
      for (const resto of restos) {
        const error = validacion(`${ruta}:${resto}`)
        const etiqueta = JSON.stringify(`${ruta.slice(0, 20)}:${resto.slice(0, 10)}`)
        expect(mensajeDeErrorDeApi(error, TRADUCCION), etiqueta).toBe(GENERICO)
        expect(mensajeDeErrorDeConsulta(error, TRADUCCION, RESPALDO), etiqueta).toBe(RESPALDO)
      }
    }
    for (const resto of RESTOS_EXTRA) {
      expect(mensajeDeErrorDeApi(validacion(resto), TRADUCCION)).toBe(GENERICO)
      expect(textoVisibleOGenerico(resto, GENERICO)).toBe(GENERICO)
      expect(mensajeDeErrorDeApi(new ApiError("DEL_SERVIDOR", resto, 409), TRADUCCION)).toBe(
        GENERICO,
      )
      expect(
        mensajeDeErrorDeConsulta(new ApiError("DEL_SERVIDOR", resto, 503), TRADUCCION, RESPALDO),
      ).toBe(RESPALDO)
    }
  })

  it("ninguna salida de la acción ni de la consulta queda sin caracteres visibles ni empieza con la ruta que traía, para toda la tabla y las entradas extra", () => {
    const entradas = [
      ...ENTRADAS_FUERA_DE_CONTRATO.map((entrada) => entrada.mensaje),
      ...RUTAS_EXTRA.flatMap((ruta) => [`${ruta}: ${MENSAJE_DE_PRUEBA}`, `${ruta}:\u{200B}`]),
      ...RESTOS_EXTRA,
    ]
    for (const mensaje of entradas) {
      for (const codigo of ["VALIDACION", "DEL_SERVIDOR", "CODIGO_FIJO", "OTRO"]) {
        const error = new ApiError(codigo, mensaje, 400)
        const accion = mensajeDeErrorDeApi(error, TRADUCCION)
        const consulta = mensajeDeErrorDeConsulta(error, TRADUCCION, RESPALDO)
        expect(
          contarCaracteresVisibles(accion),
          `${codigo} ${JSON.stringify(mensaje)}`,
        ).toBeGreaterThan(0)
        expect(contarCaracteresVisibles(consulta)).toBeGreaterThan(0)
      }
      const accion = mensajeDeErrorDeApi(validacion(mensaje), TRADUCCION)
      const ruta = /^([^:]+):/.exec(mensaje)?.[1]
      if (ruta !== undefined && /^[\p{L}\p{M}\p{N}_.-]+$/u.test(ruta) && ruta.length > 0) {
        expect(accion.startsWith(`${ruta}:`), JSON.stringify(mensaje.slice(0, 60))).toBe(false)
      }
    }
  })

  it("una ruta de 100 000 caracteres sin dos puntos, o con ellos, se resuelve sin quedarse pensando", () => {
    const larga = "a.".repeat(50_000)
    const inicio = performance.now()
    expect(quitarRutaDelMensaje(larga)).toBe(larga)
    expect(quitarRutaDelMensaje(`${larga}x: ${MENSAJE_DE_PRUEBA}`)).toBe(MENSAJE_DE_PRUEBA)
    expect(
      mensajeDeErrorDeApi(validacion(`${larga}x:${"\u{200B}".repeat(10_000)}`), TRADUCCION),
    ).toBe(GENERICO)
    expect(performance.now() - inicio).toBeLessThan(5_000)
  })

  it("un mensaje solo de puntuación es visible y se muestra, con ruta o sin ella; en un código del servidor también", () => {
    expect(mensajeDeErrorDeApi(validacion("..."), TRADUCCION)).toBe("...")
    expect(mensajeDeErrorDeApi(validacion("campo: ..."), TRADUCCION)).toBe("...")
    expect(mensajeDeErrorDeApi(validacion("a.b.0:¿?"), TRADUCCION)).toBe("¿?")
    expect(mensajeDeErrorDeApi(new ApiError("DEL_SERVIDOR", "...", 409), TRADUCCION)).toBe("...")
    expect(mensajeDeErrorDeConsulta(new ApiError("DEL_SERVIDOR", "...", 503), TRADUCCION)).toBe(
      "...",
    )
  })

  it("«Debe ser 0: 10» con ruta se recorta una vez; en un código del servidor no se recorta nada", () => {
    expect(mensajeDeErrorDeApi(validacion("a.b.0: Debe ser 0: 10"), TRADUCCION)).toBe(
      "Debe ser 0: 10",
    )
    expect(
      mensajeDeErrorDeApi(new ApiError("DEL_SERVIDOR", "Debe ser 0: 10", 409), TRADUCCION),
    ).toBe("Debe ser 0: 10")
    expect(mensajeDeErrorDeApi(new ApiError("DEL_SERVIDOR", "a.b: c", 409), TRADUCCION)).toBe(
      "a.b: c",
    )
    expect(mensajeDeErrorDeConsulta(new ApiError("DEL_SERVIDOR", "a.b: c", 503), TRADUCCION)).toBe(
      "a.b: c",
    )
  })

  it("un id con texto fijo da su texto con y sin mensaje, con un resto invisible y en la consulta; con una ruta compuesta («claseId.0:») ya no es el id", () => {
    for (const resto of [
      "",
      " x",
      ":",
      "\u{200B}",
      "\u{00A0}\u{200B}\n",
      " Too big: expected number",
    ]) {
      const error = validacion(`claseId:${resto}`)
      expect(mensajeDeErrorDeApi(error, TRADUCCION)).toBe(SIN_ACCESO)
      expect(mensajeDeErrorDeConsulta(error, TRADUCCION, RESPALDO)).toBe(SIN_ACCESO)
    }
    expect(mensajeDeErrorDeApi(validacion("claseId.0: x"), TRADUCCION)).toBe("x")
    expect(mensajeDeErrorDeConsulta(validacion("claseId.0: x"), TRADUCCION, RESPALDO)).toBe(
      RESPALDO,
    )
  })

  it("erroresDeFormularioDeApi con el contrato: un campo pintado con una mezcla de restos da el genérico; una ruta compuesta del mismo campo da null", () => {
    const mensajeDe = (error: unknown) => mensajeDeErrorDeApi(error, TRADUCCION)
    for (const resto of RESTOS_EXTRA) {
      expect(
        erroresDeFormularioDeApi(validacion(`nombre:${resto}`), ["nombre"], mensajeDe),
      ).toEqual({ nombre: GENERICO })
    }
    expect(erroresDeFormularioDeApi(validacion("nombre.0: x"), ["nombre"], mensajeDe)).toBeNull()
    expect(campoDeErrorDeApi(validacion("nombre.0: x"))).toBeNull()
  })

  // El servidor arma `${campo}: ${mensaje}` (handlers/validacion.ts) y varios esquemas de shared/ ya
  // traen el campo en su propio mensaje (`idDeRuta` de entregas.ts, archivoIdParamSchema,
  // borrarTareaQuerySchema): lo que llega es "archivoId: archivoId: debe ser un identificador
  // válido". Comprobado con validarParametros del backend en esta ronda.
  it("T-01: los mensajes reales del servidor para un id de la ruta o el ?confirmar= de borrar llegan a la persona sin ninguna ruta técnica", () => {
    const delServidor = [
      "archivoId: archivoId: debe ser un identificador válido",
      "confirmar: confirmar: no es válido",
    ]
    for (const mensaje of delServidor) {
      const texto = mensajeDeErrorDeApi(validacion(mensaje), TRADUCCION)
      expect(texto, mensaje).not.toMatch(/^[\p{L}\p{M}\p{N}_.-]+:/u)
    }
  })
})

describe("ataque CHORE-03 03a r1 · esErrorDeCursor", () => {
  it("con una lista vacía no reconoce ninguno; con «cursor» repetido sigue igual; no confunde «cursorTareas» con «cursor»", () => {
    expect(esErrorDeCursor(validacion("cursor: x"), [])).toBe(false)
    expect(esErrorDeCursor(validacion("cursor: x"), ["cursor", "cursor"])).toBe(true)
    expect(esErrorDeCursor(validacion("cursorTareas: x"))).toBe(false)
    expect(esErrorDeCursor(validacion("cursor:\u{200B}"))).toBe(true)
    expect(esErrorDeCursor(new ApiError("DEL_SERVIDOR", "cursor: x", 409))).toBe(false)
  })
})

// Reglas estáticas sobre el texto crudo (comentarios incluidos).
const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})
const esPrueba = (ruta: string) => /\.test\.tsx?$/.test(ruta)
const deProduccion = Object.entries(fuentes).filter(([ruta]) => !esPrueba(ruta))
const ALCANCE = ["/src/features/tareas/", "/src/components/adjuntos/"]
const enAlcance = deProduccion.filter(([ruta]) => ALCANCE.some((p) => ruta.startsWith(p)))
const CONTRATO = "/src/lib/errores-de-api.ts"

describe("ataque CHORE-03 03a r1 · reglas estáticas", () => {
  it("O-05: ninguna copia de la expresión de ruta escrita de otra forma (\\w, [^:], \\S, .+?, grupo, sin \\s*, new RegExp) ni un corte por «:» del mensaje en features/tareas o components/adjuntos", () => {
    expect(enAlcance.length).toBeGreaterThan(30)
    const copias: readonly [string, RegExp][] = [
      ["/^[…]+: con cualquier clase", /\/\^\(?\[[^\]\n]*\][+*]\)?:/],
      ["/^\\w+:", /\/\^\(?\\w[+*]\)?:/],
      ["/^\\S+:", /\/\^\(?\\S[+*]\??\)?:/],
      ["/^[^:]+:", /\/\^\(?\[\^:\][+*]\)?:/],
      ["/^.+?:", /\/\^\(?\.[+*]\??\)?:/],
      ["new RegExp(", /new RegExp\(/],
      ['.split(":")', /\.split\(\s*["'`]:/],
      ['.indexOf(":")', /\.(last)?[iI]ndexOf\(\s*["'`]:/],
      ["quitarPrefijoDeCampo", /quitarPrefijoDeCampo/],
    ]
    const fallas = enAlcance.flatMap(([ruta, texto]) =>
      copias.filter(([, regla]) => regla.test(texto)).map(([nombre]) => `${ruta}: ${nombre}`),
    )
    expect(fallas).toEqual([])
    expect(/\/\^\[\\p\{L\}\\p\{M\}\\p\{N\}_\.-\]\+:\\s\*\/u/.test(fuentes[CONTRATO] ?? "")).toBe(
      true,
    )
  })

  it("O-05: el mensaje del servidor solo se lee en las formas conocidas (exec, test, startsWith y textoVisibleOGenerico); nunca se pinta ni se avisa crudo", () => {
    // Lo que va antes de cada ".message" (espacios y saltos juntados en uno).
    const permitidas = [
      /incidencia\.message$/,
      /issues\[0\]\?\.message$/,
      /\.(exec|test)\(error\.message$/,
      /PREFIJOS_QUE_REEMPLAZAN_LA_VISTA\.some\(\(prefijo\) => error\.message$/,
      /textoVisibleOGenerico\(error\.message$/,
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
      /(toast\.(error|success|message)\(|mensaje=\{|\{)\s*[\w.]*\.message\b/.test(texto),
    )
    expect(crudos.map(([ruta]) => ruta)).toEqual([])
  })

  it("esErrorDeCursor nunca se pasa como referencia (map, filter, some, every, find, flatMap, forEach, ni como callback) en código de producción", () => {
    const fallas = deProduccion
      .filter(([, texto]) =>
        /(\.(map|filter|some|every|find|findIndex|findLast|flatMap|forEach|reduce)\(\s*esErrorDeCursor\w*\s*[,)])|([:=]\s*esErrorDeCursor\s*[,}\n])|(\(\s*esErrorDeCursor\s*\))/.test(
          texto.replace(/export const esErrorDeCursorDeCalificaciones = esErrorDeCursor\n/, ""),
        ),
      )
      .map(([ruta]) => ruta)
    expect(fallas).toEqual([])
  })

  it("O-06: ni la prueba estática del chore ni las pruebas de ataque de esta ronda tienen un carácter invisible literal (esta se revisa desde las otras dos)", () => {
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
    const revisados = Object.keys(fuentes).filter(
      (ruta) =>
        ruta === "/src/lib/errores-de-api-estatico.test.ts" ||
        /-ch3(-r\d+)?(\.ataque)?\.test\.tsx?$/.test(ruta),
    )
    expect(revisados).toContain("/src/lib/errores-de-api-estatico.test.ts")
    expect(
      revisados.filter((ruta) => ruta.includes("-ch3-r1.ataque")).length,
    ).toBeGreaterThanOrEqual(2)
    const fallas = revisados.flatMap((ruta) => {
      const texto = fuentes[ruta] ?? ""
      return invisibles
        .filter((c) => texto.includes(c))
        .map((c) => `${ruta}: U+${(c.codePointAt(0) ?? 0).toString(16).toUpperCase()}`)
    })
    expect(fallas).toEqual([])
  })
})
