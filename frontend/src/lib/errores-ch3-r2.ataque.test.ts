import { contarCaracteresVisibles } from "@campus/shared"
import { describe, expect, it } from "vitest"

import {
  CODIGOS_CON_MENSAJE_DEL_SERVIDOR,
  TRADUCCION_DE_ERRORES_TAREAS,
} from "@/features/tareas/data"
import {
  mensajeDeConsultaTareas,
  mensajeDeErrorTareas,
  mensajeDelAvisoDeCalificar,
} from "@/features/tareas/lib"
import { ApiError } from "@/services/apiClient"

import {
  mensajeDeErrorDeApi,
  mensajeDeErrorDeConsulta,
  quitarRutaDelMensaje,
  type TraduccionDeErrores,
} from "./errores-de-api"

// Ataque CHORE-03 03a, ronda 2 (tester): la regla nueva de quitarRutaDelMensaje (Enmienda 2, T-01):
// se quita la ruta y, solo si había ruta, un nombre en camelCase que la siga; nunca más de dos
// prefijos. Bordes que la prueba del programador no recorre, los códigos con mensaje del servidor
// (que siguen sin recortarse), las consultas (que dan el respaldo) y una regla estática que amarra el
// supuesto de la regla a las fuentes reales de `shared/src` y del backend: ningún texto para la persona
// que siga a una ruta empieza con "minúscula + letras + dos puntos" salvo los nombres del inventario.
// Todo carácter invisible va escrito como escape. Sin fechas.

const GENERICO = "Genérico del módulo."
const RESPALDO = "Respaldo del lugar."
const GENERICO_TAREAS = TRADUCCION_DE_ERRORES_TAREAS.generico

const TRADUCCION: TraduccionDeErrores = {
  generico: GENERICO,
  mensajesPorCodigo: {},
  codigosConMensajeDelServidor: ["DEL_SERVIDOR"],
  textosPorCampo: {},
}

const validacion = (mensaje: string) => new ApiError("VALIDACION", mensaje, 400)
const RUTA_TECNICA = /^[\p{L}\p{M}\p{N}_.-]+:/u

interface Borde {
  entrada: string
  resto: string
  porque: string
}

// La salida esperada sale de la regla escrita en S-05 y §D-1 (Enmienda 2), no del código.
const BORDES: readonly Borde[] = [
  { entrada: "a: b: c: d", resto: "c: d", porque: "tres prefijos: solo se quitan dos" },
  { entrada: "a: b: c", resto: "c", porque: "un solo carácter en los dos prefijos" },
  { entrada: "a:b:c:d", resto: "c:d", porque: "tres prefijos sin espacios" },
  {
    entrada: "archivoId: archivoId: archivoId: x",
    resto: "archivoId: x",
    porque: "el campo repetido tres veces (nunca más de dos prefijos)",
  },
  {
    entrada: "debe ser un identificador válido",
    resto: "debe ser un identificador válido",
    porque: "ya recortado: sin ruta no se toca nada",
  },
  {
    entrada: "archivoId: debe ser un identificador válido",
    resto: "debe ser un identificador válido",
    porque: "un solo prefijo: «debe» no va pegado a dos puntos",
  },
  { entrada: "temaIds.0: temaId: x", resto: "x", porque: "ruta con índice y el campo detrás" },
  { entrada: "temaIds.0:temaId:x", resto: "x", porque: "ruta con índice sin espacios" },
  { entrada: "temaIds.0:\ttemaId:\tx", resto: "x", porque: "con tabuladores" },
  { entrada: "temaIds.0:\ntemaId:\nx", resto: "x", porque: "con saltos de línea" },
  {
    entrada: "categorias.12.id: categoriaId: x",
    resto: "x",
    porque: "ruta de tres niveles con otro nombre detrás",
  },
  { entrada: "x: Nota: algo", resto: "Nota: algo", porque: "mayúscula inicial: se conserva" },
  { entrada: "x: 14:30 y", resto: "14:30 y", porque: "dígitos: se conservan" },
  { entrada: "x: campo_raro: y", resto: "campo_raro: y", porque: "guion bajo: no es camelCase" },
  { entrada: "x: a-b: c", resto: "a-b: c", porque: "guion: no es camelCase" },
  { entrada: "x: a.b: c", resto: "a.b: c", porque: "un segundo prefijo con puntos" },
  { entrada: "x: a: y", resto: "y", porque: "un solo carácter en minúscula" },
  { entrada: "x: aB9: c", resto: "c", porque: "camelCase con dígito" },
  { entrada: "x: 9abc: c", resto: "9abc: c", porque: "empieza con dígito" },
  { entrada: "x: ñame: c", resto: "ñame: c", porque: "minúscula fuera de ASCII" },
  { entrada: "x:  archivoId: y", resto: "y", porque: "dos espacios antes del segundo prefijo" },
  { entrada: "x:\t archivoId: y", resto: "y", porque: "tabulador y espacio antes del segundo" },
  {
    entrada: "x: archivoId : y",
    resto: "archivoId : y",
    porque: "espacio antes de los dos puntos: no es un nombre",
  },
  {
    entrada: "x: archivoId:archivoId: y",
    resto: "archivoId: y",
    porque: "dos nombres pegados tras la ruta: solo se quita uno",
  },
  {
    entrada: "x: \u{200B}archivoId: c",
    resto: "\u{200B}archivoId: c",
    porque: "invisible antes del segundo prefijo (decisión del plan: no es un nombre)",
  },
  { entrada: "x: archivoId:", resto: "", porque: "nada tras el nombre" },
  {
    entrada: "x: archivoId:\u{200B}",
    resto: "\u{200B}",
    porque: "solo un invisible tras el nombre",
  },
  { entrada: "parámetro: archivoId: x", resto: "x", porque: "el respaldo de validarParametros" },
  {
    entrada: " archivoId: archivoId: x",
    resto: " archivoId: archivoId: x",
    porque: "empieza con espacio: no es una ruta",
  },
  { entrada: "", resto: "", porque: "vacío" },
  { entrada: ":", resto: ":", porque: "solo dos puntos: no hay ruta" },
  { entrada: "x:", resto: "", porque: "solo la ruta" },
  {
    entrada: "x: ejemplo: algo",
    resto: "algo",
    porque: "palabra en minúscula pegada a dos puntos (decisión del plan: hoy no se alcanza)",
  },
]

describe("ataque CHORE-03 03a r2 · T-01: la regla nueva de quitarRutaDelMensaje", () => {
  it.each(BORDES)("«$entrada» → «$resto» ($porque)", ({ entrada, resto }) => {
    expect(quitarRutaDelMensaje(entrada)).toBe(resto)
  })

  it.each(BORDES)(
    "«$entrada» en una acción da el resto o el genérico, y en una consulta el respaldo",
    ({ entrada, resto }) => {
      const esperado = contarCaracteresVisibles(resto) > 0 ? resto : GENERICO
      expect(mensajeDeErrorDeApi(validacion(entrada), TRADUCCION)).toBe(esperado)
      expect(mensajeDeErrorDeConsulta(validacion(entrada), TRADUCCION, RESPALDO)).toBe(RESPALDO)
    },
  )

  it("la regla no se aplica dos veces en el camino de una acción: un mensaje ya recortado no pierde nada más", () => {
    const real = "archivoId: archivoId: debe ser un identificador válido"
    const unaVez = mensajeDeErrorTareas(validacion(real))
    expect(unaVez).toBe("debe ser un identificador válido")
    expect(mensajeDeErrorTareas(validacion(unaVez))).toBe(unaVez)
    expect(mensajeDelAvisoDeCalificar(validacion(real))).toBe(unaVez)
  })

  it.each(CODIGOS_CON_MENSAJE_DEL_SERVIDOR.map((codigo) => ({ codigo })))(
    "$codigo con un mensaje que parece una ruta doble no se recorta (CAL-T-123), ni en la acción ni en la consulta",
    ({ codigo }) => {
      for (const mensaje of [
        "archivoId: archivoId: x",
        "a: b: c: d",
        "temaIds.0: temaId: x",
        "x: ejemplo: algo",
      ]) {
        const error = new ApiError(codigo, mensaje, 409)
        expect(mensajeDeErrorTareas(error)).toBe(mensaje)
        expect(mensajeDeConsultaTareas(error)).toBe(mensaje)
      }
    },
  )

  it("en features/tareas, toda ruta doble del inventario de §D-1 da el genérico en una consulta y, salvo los ids con texto fijo, un aviso sin ruta en una acción", () => {
    const fijos: Readonly<Record<string, string>> = TRADUCCION_DE_ERRORES_TAREAS.textosPorCampo
    const dobles = [
      "archivoId: archivoId: debe ser un identificador válido",
      "confirmar: confirmar: no es válido",
      "alumnoId: alumnoId: debe ser un identificador válido",
      "temaId: temaId: debe ser un identificador válido",
      "temaIds.3: temaId: debe ser un identificador válido",
      "publicacionId: publicacionId: debe ser un identificador válido",
      "comentarioId: comentarioId: debe ser un identificador válido",
      "maestroId: maestroId: debe ser un identificador válido",
      "maestroIds.0: maestroId: debe ser un identificador válido",
      "categorias.0.id: categoriaId: debe ser un identificador válido",
      "tema: tema: elige un tema válido",
      "id: id: debe ser un identificador válido",
      "tareaId: tareaId: debe ser un identificador válido",
      "claseId: claseId: debe ser un identificador válido",
    ]
    for (const mensaje of dobles) {
      const campo = mensaje.slice(0, mensaje.indexOf(":"))
      const fijo = Object.hasOwn(fijos, campo) ? fijos[campo] : undefined
      const accion = mensajeDeErrorTareas(validacion(mensaje))
      const consulta = mensajeDeConsultaTareas(validacion(mensaje))
      expect(accion, mensaje).not.toMatch(RUTA_TECNICA)
      expect(contarCaracteresVisibles(accion), mensaje).toBeGreaterThan(0)
      expect(consulta, mensaje).toBe(fijo ?? GENERICO_TAREAS)
      if (fijo !== undefined) expect(accion, mensaje).toBe(fijo)
    }
  })
})

// Las fuentes reales del texto de un VALIDACION: los esquemas de shared/ y lo que arma el backend.
const DE_SHARED = import.meta.glob<string>(["../../../shared/src/*.ts", "!**/*.test.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
})
const DEL_BACKEND = import.meta.glob<string>(
  [
    "../../../backend/src/{core,handlers,middleware,adapters}/**/*.ts",
    "!**/*.test.ts",
    "!**/generated/**",
  ],
  { query: "?raw", import: "default", eager: true },
)

interface Prefijado {
  archivo: string
  linea: number
  nombre: string
  resto: string
}

// Literales (comillas o plantilla) que empiezan con "<nombre>: <resto>", fuera de comentarios.
const prefijados = (fuentes: Readonly<Record<string, string>>): Prefijado[] =>
  Object.entries(fuentes).flatMap(([archivo, texto]) =>
    texto.split("\n").flatMap((linea, i) => {
      const limpia = linea.trim()
      if (limpia.startsWith("//") || limpia.startsWith("*")) return []
      return Array.from(linea.matchAll(/["'`]([\p{L}\p{N}_.${}()-]+?):[ \t]([^"'`\n]*)/gu)).map(
        (m) => ({ archivo, linea: i + 1, nombre: m[1] ?? "", resto: m[2] ?? "" }),
      )
    }),
  )

// Los nombres que la Enmienda 2 y la 3 inventariaron (§D-1, "Rutas dobles del servidor").
const INVENTARIO = new Set([
  "archivoId",
  "maestroId",
  "claseId",
  "alumnoId",
  "temaId",
  "publicacionId",
  "comentarioId",
  "categoriaId",
  "tareaId",
  "confirmar",
  "tema",
  "${campo}",
])
const NOMBRE_EN_CAMEL_CASE = /^[a-z][A-Za-z0-9]*:/

describe("ataque CHORE-03 03a r2 · T-01: el supuesto de la regla contra las fuentes reales", () => {
  it("en shared/src, todo mensaje que empieza con «palabra:» es un nombre del inventario, y lo que lo sigue no es otro nombre", () => {
    const encontrados = prefijados(DE_SHARED)
    expect(Object.keys(DE_SHARED).length).toBeGreaterThan(5)
    expect(encontrados.length).toBeGreaterThan(15)
    const fuera = encontrados.filter(({ nombre }) => !INVENTARIO.has(nombre))
    expect(fuera).toEqual([])
    const conTercero = encontrados.filter(({ resto }) => NOMBRE_EN_CAMEL_CASE.test(resto))
    expect(conTercero).toEqual([])
  })

  it("en el backend (core, handlers, middleware, adapters), ningún mensaje con prefijo sigue con un nombre en camelCase pegado a dos puntos (no hay texto legítimo que la regla se coma ni un tercer prefijo)", () => {
    const encontrados = prefijados(DEL_BACKEND)
    expect(Object.keys(DEL_BACKEND).length).toBeGreaterThan(30)
    expect(encontrados.map(({ nombre }) => nombre)).toEqual(
      expect.arrayContaining(["cuerpo", "claseId", "cursor", "categorias", "calificacion", "id"]),
    )
    const comidos = encontrados.filter(({ resto }) => NOMBRE_EN_CAMEL_CASE.test(resto))
    expect(comidos).toEqual([])
  })
})
