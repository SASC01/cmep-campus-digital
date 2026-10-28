import {
  agregarAlumnoSchema,
  alumnoDeEntregaParamSchema,
  alumnoIdParamSchema,
  archivoDeEntregaDeAlumnoParamSchema,
  archivoDeEntregaParamSchema,
  archivoIdParamSchema,
  asignarMaestroSchema,
  borrarTareaQuerySchema,
  claseIdParamSchema,
  comentarioIdParamSchema,
  crearClaseAdminSchema,
  crearPublicacionSchema,
  maestroIdParamSchema,
  moverElementoSchema,
  ordenTemasSchema,
  publicacionDeMoverParamSchema,
  publicacionIdParamSchema,
  publicacionYComentarioParamSchema,
  reemplazarCategoriasSchema,
  tareaDeEntregaParamSchema,
  tareaIdParamSchema,
  temaIdParamSchema,
  trabajoQuerySchema,
} from "@campus/shared"
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
  CAMPO_FUERA_DE_CONTRATO,
  ENTRADAS_DE_FORMULARIO,
  ENTRADAS_FUERA_DE_CONTRATO,
  MENSAJE_DE_PRUEBA,
  RESTOS_SIN_TEXTO_VISIBLE,
  RUTAS_FUERA_DE_CONTRATO,
} from "./errores-de-api-fuera-de-contrato"

// CHORE-03 (03a): el contrato de lib/errores-de-api.ts contra la tabla común de entradas fuera de
// contrato.

const GENERICO = "Genérico de prueba."
const RESPALDO = "Respaldo del lugar."

const TRADUCCION: TraduccionDeErrores = {
  generico: GENERICO,
  mensajesPorCodigo: { CODIGO_FIJO: "Texto fijo del código." },
  codigosConMensajeDelServidor: ["DEL_SERVIDOR"],
  textosPorCampo: { claseId: "Sin acceso.", tareaId: "No existe." },
}

const validacion = (mensaje: string) => new ApiError("VALIDACION", mensaje, 400)

describe("CHORE-03 · contrato de los errores de la API", () => {
  it("CH3-A01: quitarRutaDelMensaje quita la ruta una vez y el nombre de campo que el esquema repite detrás, y deja intacto lo que no empieza con una ruta", () => {
    for (const ruta of RUTAS_FUERA_DE_CONTRATO) {
      for (const separador of [": ", ":", ":\t"]) {
        expect(quitarRutaDelMensaje(`${ruta}${separador}${MENSAJE_DE_PRUEBA}`)).toBe(
          MENSAJE_DE_PRUEBA,
        )
      }
    }
    expect(quitarRutaDelMensaje("x: Nota: algo")).toBe("Nota: algo")
    expect(quitarRutaDelMensaje("parámetro: el cursor no es válido")).toBe("el cursor no es válido")
    expect(quitarRutaDelMensaje(MENSAJE_DE_PRUEBA)).toBe(MENSAJE_DE_PRUEBA)
    expect(quitarRutaDelMensaje(" cursor: no es válido")).toBe(" cursor: no es válido")
    expect(quitarRutaDelMensaje("Calificación de 0 a 10: revisa los puntos")).toBe(
      "Calificación de 0 a 10: revisa los puntos",
    )
    // Enmienda 2 (T-01): la ruta del servidor y, detrás, el nombre de campo que el esquema repite.
    for (const ruta of RUTAS_FUERA_DE_CONTRATO) {
      for (const antes of [": ", ":", ":\t"]) {
        for (const despues of [": ", ":", ":\t"]) {
          const mensaje = `${ruta}${antes}${CAMPO_FUERA_DE_CONTRATO}${despues}${MENSAJE_DE_PRUEBA}`
          expect(quitarRutaDelMensaje(mensaje)).toBe(MENSAJE_DE_PRUEBA)
        }
      }
    }
    expect(quitarRutaDelMensaje("archivoId: archivoId: debe ser un identificador válido")).toBe(
      "debe ser un identificador válido",
    )
    expect(quitarRutaDelMensaje("confirmar: confirmar: no es válido")).toBe("no es válido")
    expect(quitarRutaDelMensaje("temaIds.0: temaId: x")).toBe("x")
    // Nunca más de dos prefijos.
    expect(quitarRutaDelMensaje("a: b: c: d")).toBe("c: d")
    // Lo que sigue a la ruta no es un nombre en camelCase: queda intacto.
    expect(quitarRutaDelMensaje("x: a.b: c")).toBe("a.b: c")
    expect(quitarRutaDelMensaje("x: 14:30 y")).toBe("14:30 y")
    expect(quitarRutaDelMensaje("x: Valor: 10")).toBe("Valor: 10")
    expect(quitarRutaDelMensaje('x: "nota": y')).toBe('"nota": y')
    // Sin ruta, el nombre no se quita.
    expect(quitarRutaDelMensaje(" archivoId: archivoId: x")).toBe(" archivoId: archivoId: x")
  })

  it("CH3-A02: textoVisibleOGenerico da el genérico ante cada resto sin texto visible y deja el texto visible tal cual", () => {
    const queSeVenVacios = [
      "\u{2800}",
      "\u{1D159}",
      "\u{3164}",
      " \u{2800} ",
      "\u{1D159}\u{00A0}\u{3164}",
      "\t\u{2800}\n\u{1D159}",
    ]
    for (const resto of [...RESTOS_SIN_TEXTO_VISIBLE, ...queSeVenVacios]) {
      expect(textoVisibleOGenerico(resto, GENERICO)).toBe(GENERICO)
    }
    expect(textoVisibleOGenerico("Revisa", GENERICO)).toBe("Revisa")
    expect(textoVisibleOGenerico("...", GENERICO)).toBe("...")
  })

  it("CH3-A03: mensajeDeErrorDeApi recorre la tabla y respeta los ids, los códigos fijos, los del servidor y lo que no es ApiError", () => {
    expect(ENTRADAS_FUERA_DE_CONTRATO.length).toBeGreaterThan(50)
    for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
      expect(mensajeDeErrorDeApi(validacion(entrada.mensaje), TRADUCCION)).toBe(
        entrada.resto ?? GENERICO,
      )
    }
    expect(mensajeDeErrorDeApi(validacion("claseId: x"), TRADUCCION)).toBe("Sin acceso.")
    expect(mensajeDeErrorDeApi(validacion("tareaId:"), TRADUCCION)).toBe("No existe.")
    expect(mensajeDeErrorDeApi(new ApiError("CODIGO_FIJO", "otro", 409), TRADUCCION)).toBe(
      "Texto fijo del código.",
    )
    expect(mensajeDeErrorDeApi(new ApiError("DEL_SERVIDOR", "a.b: c", 409), TRADUCCION)).toBe(
      "a.b: c",
    )
    for (const resto of RESTOS_SIN_TEXTO_VISIBLE) {
      expect(mensajeDeErrorDeApi(new ApiError("DEL_SERVIDOR", resto, 409), TRADUCCION)).toBe(
        GENERICO,
      )
    }
    for (const nombre of ["constructor", "toString", "__proto__"]) {
      expect(mensajeDeErrorDeApi(new ApiError(nombre, "x", 400), TRADUCCION)).toBe(GENERICO)
      expect(mensajeDeErrorDeApi(validacion(`${nombre}: x`), TRADUCCION)).toBe("x")
      expect(mensajeDeErrorDeApi(validacion(`${nombre}:`), TRADUCCION)).toBe(GENERICO)
    }
    expect(mensajeDeErrorDeApi(new Error("claseId: x"), TRADUCCION)).toBe(GENERICO)
    expect(mensajeDeErrorDeApi(undefined, TRADUCCION)).toBe(GENERICO)
    expect(mensajeDeErrorDeApi("claseId: x", TRADUCCION)).toBe(GENERICO)
    const conValidacionDelServidor: TraduccionDeErrores = {
      ...TRADUCCION,
      codigosConMensajeDelServidor: ["VALIDACION", "DEL_SERVIDOR"],
    }
    expect(
      mensajeDeErrorDeApi(validacion("nombre: caracteres no permitidos"), conValidacionDelServidor),
    ).toBe("caracteres no permitidos")
    expect(mensajeDeErrorDeApi(validacion("nombre:   "), conValidacionDelServidor)).toBe(GENERICO)
  })

  it("CH3-A04: mensajeDeErrorDeConsulta da el respaldo ante toda la tabla y respeta los ids, los códigos fijos y los del servidor", () => {
    for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
      const error = validacion(entrada.mensaje)
      expect(mensajeDeErrorDeConsulta(error, TRADUCCION, RESPALDO)).toBe(RESPALDO)
      expect(mensajeDeErrorDeConsulta(error, TRADUCCION)).toBe(GENERICO)
    }
    expect(mensajeDeErrorDeConsulta(validacion("claseId: x"), TRADUCCION, RESPALDO)).toBe(
      "Sin acceso.",
    )
    expect(mensajeDeErrorDeConsulta(validacion("tareaId: x"), TRADUCCION)).toBe("No existe.")
    expect(
      mensajeDeErrorDeConsulta(new ApiError("CODIGO_FIJO", "x", 404), TRADUCCION, RESPALDO),
    ).toBe("Texto fijo del código.")
    expect(
      mensajeDeErrorDeConsulta(new ApiError("DEL_SERVIDOR", "a.b: c", 503), TRADUCCION, RESPALDO),
    ).toBe("a.b: c")
    for (const resto of RESTOS_SIN_TEXTO_VISIBLE) {
      expect(
        mensajeDeErrorDeConsulta(new ApiError("DEL_SERVIDOR", resto, 503), TRADUCCION, RESPALDO),
      ).toBe(RESPALDO)
    }
    expect(mensajeDeErrorDeConsulta(new ApiError("OTRO", "x", 500), TRADUCCION, RESPALDO)).toBe(
      RESPALDO,
    )
    expect(mensajeDeErrorDeConsulta(new Error("x"), TRADUCCION, RESPALDO)).toBe(RESPALDO)
    expect(mensajeDeErrorDeConsulta(undefined, TRADUCCION)).toBe(GENERICO)
  })

  it("CH3-A05: esErrorDeCursor da lo mismo que antes sin campos y reconoce la lista de campos que recibe", () => {
    const errores: unknown[] = [
      validacion("cursor: no es válido"),
      validacion("Cursor: no es válido"),
      validacion("cursor:no es válido"),
      validacion(" cursor: no es válido"),
      validacion("claseId: debe ser un identificador válido"),
      validacion("sin prefijo"),
      new ApiError("SIN_ACCESO_A_LA_CLASE", "cursor: no es válido", 403),
      new Error("cursor: no es válido"),
      "cursor: no es válido",
      null,
      undefined,
    ]
    expect(errores.map((e) => esErrorDeCursor(e))).toEqual(
      errores.map((e) => campoDeErrorDeApi(e) === "cursor"),
    )
    expect(errores.map((e) => esErrorDeCursor(e)).filter(Boolean)).toHaveLength(2)
    const campos = ["cursor", "cursorTareas"]
    expect(esErrorDeCursor(validacion("cursor: x"), campos)).toBe(true)
    expect(esErrorDeCursor(validacion("cursorTareas: x"), campos)).toBe(true)
    expect(esErrorDeCursor(validacion("cursorTareas: x"))).toBe(false)
    expect(esErrorDeCursor(validacion("cursor.0: x"), campos)).toBe(false)
    expect(esErrorDeCursor(validacion("Cursor: x"), campos)).toBe(false)
    expect(esErrorDeCursor(new ApiError("SIN_ACCESO_A_LA_CLASE", "cursor: x", 403), campos)).toBe(
      false,
    )
  })

  it("CH3-A06: la tabla trae cada clase requerida, ninguna ruta con texto fijo ni de cursor y ningún resto sin texto visible", () => {
    const clases = new Set(ENTRADAS_FUERA_DE_CONTRATO.map((entrada) => entrada.clase))
    for (const clase of ["campo-no-pintable", "sin-texto-visible", "ruta"] as const) {
      expect(clases.has(clase)).toBe(true)
    }
    for (const prohibida of ["claseId", "tareaId", "alumnoId", "cursor"]) {
      expect(RUTAS_FUERA_DE_CONTRATO).not.toContain(prohibida)
    }
    const conResto = ENTRADAS_FUERA_DE_CONTRATO.flatMap((entrada) =>
      entrada.resto === null ? [] : [entrada.resto],
    )
    expect(conResto.length).toBeGreaterThan(0)
    for (const resto of conResto) {
      expect(textoVisibleOGenerico(resto, GENERICO)).toBe(resto)
    }
    expect(Object.keys(ENTRADAS_DE_FORMULARIO).sort()).toEqual([
      "campo-no-pintable",
      "ruta",
      "sin-texto-visible",
    ])
    for (const [clase, entrada] of Object.entries(ENTRADAS_DE_FORMULARIO)) {
      expect(entrada.clase).toBe(clase)
    }
    expect(ENTRADAS_DE_FORMULARIO.ruta.mensaje).toBe(`archivoIds.0.id: ${MENSAJE_DE_PRUEBA}`)
  })

  it("CH3-A07: erroresDeFormularioDeApi con mensajeDeErrorDeApi da el genérico en el campo pintado sin texto visible y null en las rutas de la tabla", () => {
    const mensajeDeError = (error: unknown) => mensajeDeErrorDeApi(error, TRADUCCION)
    for (const resto of RESTOS_SIN_TEXTO_VISIBLE) {
      expect(
        erroresDeFormularioDeApi(validacion(`nombre:${resto}`), ["nombre"], mensajeDeError),
      ).toEqual({ nombre: GENERICO })
    }
    const conRuta = ENTRADAS_FUERA_DE_CONTRATO.filter(
      (entrada) => entrada.clase === "ruta" || entrada.clase === "campo-no-pintable",
    )
    expect(conRuta.length).toBeGreaterThan(0)
    for (const entrada of conRuta) {
      expect(
        erroresDeFormularioDeApi(validacion(entrada.mensaje), ["nombre"], mensajeDeError),
      ).toBeNull()
    }
  })
})

// CHORE-03 (Enmienda 2, T-01): las rutas dobles reales del servidor (inventario de §D-1). Cada fila
// parte del esquema real de shared/ con un valor inválido en su campo; el mensaje se arma como lo arma
// el servidor (`validarCuerpo` y `validarParametros` de backend/src/handlers/validacion.ts).
const UUID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const NO_ES_ID = "no-es-un-id"
const NO_ES_UN_ID_VALIDO = "debe ser un identificador válido"

const SIN_TEXTOS_POR_CAMPO: TraduccionDeErrores = { ...TRADUCCION, textosPorCampo: {} }
const CON_TEXTOS_POR_CAMPO: TraduccionDeErrores = {
  ...TRADUCCION,
  textosPorCampo: { claseId: "Sin acceso.", tareaId: "No existe.", alumnoId: "No está." },
}

interface IncidenciaDeZod {
  path: readonly PropertyKey[]
  message: string
}

interface EsquemaDelInventario {
  safeParse: (
    valor: unknown,
  ) => { success: true } | { success: false; error: { issues: readonly IncidenciaDeZod[] } }
}

interface FilaDelInventario {
  esquema: string
  validar: EsquemaDelInventario
  valor: unknown
  path: readonly (string | number)[]
  message: string
  resto: string
  ruta: string
}

const fila = (
  esquema: string,
  validar: EsquemaDelInventario,
  valor: unknown,
  path: readonly (string | number)[],
  message: string,
  resto: string = NO_ES_UN_ID_VALIDO,
): FilaDelInventario => ({ esquema, validar, valor, path, message, resto, ruta: path.join(".") })

const doble = (campo: string) => `${campo}: ${NO_ES_UN_ID_VALIDO}`

const INVENTARIO: readonly FilaDelInventario[] = [
  fila(
    "archivoIdParamSchema",
    archivoIdParamSchema,
    { archivoId: NO_ES_ID },
    ["archivoId"],
    doble("archivoId"),
  ),
  fila(
    "archivoDeEntregaParamSchema",
    archivoDeEntregaParamSchema,
    { tareaId: UUID, archivoId: NO_ES_ID },
    ["archivoId"],
    doble("archivoId"),
  ),
  fila(
    "archivoDeEntregaDeAlumnoParamSchema",
    archivoDeEntregaDeAlumnoParamSchema,
    { tareaId: UUID, alumnoId: UUID, archivoId: NO_ES_ID },
    ["archivoId"],
    doble("archivoId"),
  ),
  fila(
    "borrarTareaQuerySchema",
    borrarTareaQuerySchema,
    { confirmar: "todas" },
    ["confirmar"],
    "confirmar: no es válido",
    "no es válido",
  ),
  fila(
    "tareaIdParamSchema",
    tareaIdParamSchema,
    { tareaId: NO_ES_ID },
    ["tareaId"],
    doble("tareaId"),
  ),
  fila(
    "tareaDeEntregaParamSchema",
    tareaDeEntregaParamSchema,
    { tareaId: NO_ES_ID },
    ["tareaId"],
    doble("tareaId"),
  ),
  fila(
    "alumnoDeEntregaParamSchema",
    alumnoDeEntregaParamSchema,
    { tareaId: UUID, alumnoId: NO_ES_ID },
    ["alumnoId"],
    doble("alumnoId"),
  ),
  fila(
    "claseIdParamSchema",
    claseIdParamSchema,
    { claseId: NO_ES_ID },
    ["claseId"],
    doble("claseId"),
  ),
  fila(
    "agregarAlumnoSchema",
    agregarAlumnoSchema,
    { alumnoId: NO_ES_ID },
    ["alumnoId"],
    doble("alumnoId"),
  ),
  fila(
    "alumnoIdParamSchema",
    alumnoIdParamSchema,
    { alumnoId: NO_ES_ID },
    ["alumnoId"],
    doble("alumnoId"),
  ),
  fila("temaIdParamSchema", temaIdParamSchema, { temaId: NO_ES_ID }, ["temaId"], doble("temaId")),
  fila(
    "moverElementoSchema",
    moverElementoSchema,
    { temaId: NO_ES_ID },
    ["temaId"],
    doble("temaId"),
  ),
  fila(
    "crearPublicacionSchema",
    crearPublicacionSchema,
    { tipo: "material", titulo: "Guía de estudio", temaId: NO_ES_ID },
    ["temaId"],
    doble("temaId"),
  ),
  fila(
    "ordenTemasSchema",
    ordenTemasSchema,
    { temaIds: [NO_ES_ID] },
    ["temaIds", 0],
    doble("temaId"),
  ),
  fila(
    "publicacionIdParamSchema",
    publicacionIdParamSchema,
    { publicacionId: NO_ES_ID },
    ["publicacionId"],
    doble("publicacionId"),
  ),
  fila(
    "publicacionDeMoverParamSchema",
    publicacionDeMoverParamSchema,
    { publicacionId: NO_ES_ID },
    ["publicacionId"],
    doble("publicacionId"),
  ),
  fila(
    "publicacionYComentarioParamSchema",
    publicacionYComentarioParamSchema,
    { publicacionId: NO_ES_ID, comentarioId: UUID },
    ["publicacionId"],
    doble("publicacionId"),
  ),
  fila(
    "publicacionYComentarioParamSchema",
    publicacionYComentarioParamSchema,
    { publicacionId: UUID, comentarioId: NO_ES_ID },
    ["comentarioId"],
    doble("comentarioId"),
  ),
  fila(
    "comentarioIdParamSchema",
    comentarioIdParamSchema,
    { comentarioId: NO_ES_ID },
    ["comentarioId"],
    doble("comentarioId"),
  ),
  fila(
    "asignarMaestroSchema",
    asignarMaestroSchema,
    { maestroId: NO_ES_ID },
    ["maestroId"],
    doble("maestroId"),
  ),
  fila(
    "maestroIdParamSchema",
    maestroIdParamSchema,
    { maestroId: NO_ES_ID },
    ["maestroId"],
    doble("maestroId"),
  ),
  fila(
    "crearClaseAdminSchema",
    crearClaseAdminSchema,
    { nombre: "Física", descripcion: "Primer semestre", maestroIds: [NO_ES_ID] },
    ["maestroIds", 0],
    doble("maestroId"),
  ),
  fila(
    "reemplazarCategoriasSchema",
    reemplazarCategoriasSchema,
    { categorias: [{ id: NO_ES_ID, nombre: "Tareas", peso: 100 }] },
    ["categorias", 0, "id"],
    doble("categoriaId"),
  ),
  fila(
    "trabajoQuerySchema",
    trabajoQuerySchema,
    { tema: NO_ES_ID },
    ["tema"],
    "tema: elige un tema válido",
    "elige un tema válido",
  ),
]

const RUTA_AL_INICIO = /^[\p{L}\p{M}\p{N}_.-]+:/u

describe("CHORE-03 · rutas dobles reales del servidor (Enmienda 2, T-01)", () => {
  it.each(INVENTARIO)(
    "CH3-A25: $esquema en $ruta da su ruta doble y el contrato la deja sin ningún prefijo",
    ({ esquema, validar, valor, path, message, resto }) => {
      const resultado = validar.safeParse(valor)
      if (resultado.success) {
        throw new Error(`${esquema} aceptó un valor que debía rechazar (PA-10)`)
      }
      const incidencia = resultado.error.issues[0]
      if (incidencia === undefined) throw new Error(`${esquema} no dio ninguna incidencia (PA-10)`)
      expect({ esquema, path: incidencia.path, message: incidencia.message }).toEqual({
        esquema,
        path,
        message,
      })

      // La forma del servidor: `${path.join(".")}: ${message}`.
      const ruta = incidencia.path.map(String).join(".")
      const delServidor = validacion(`${ruta}: ${incidencia.message}`)
      const campo = String(incidencia.path[0])
      const textoFijo = Object.hasOwn(CON_TEXTOS_POR_CAMPO.textosPorCampo, campo)
        ? CON_TEXTOS_POR_CAMPO.textosPorCampo[campo]
        : undefined
      const salidas = [
        mensajeDeErrorDeApi(delServidor, SIN_TEXTOS_POR_CAMPO),
        mensajeDeErrorDeApi(delServidor, CON_TEXTOS_POR_CAMPO),
        mensajeDeErrorDeConsulta(delServidor, SIN_TEXTOS_POR_CAMPO, RESPALDO),
        mensajeDeErrorDeConsulta(delServidor, CON_TEXTOS_POR_CAMPO, RESPALDO),
      ]
      expect(salidas).toEqual([resto, textoFijo ?? resto, RESPALDO, textoFijo ?? RESPALDO])
      for (const salida of salidas) {
        expect(salida).not.toMatch(RUTA_AL_INICIO)
        expect(textoVisibleOGenerico(salida, "")).not.toBe("")
      }
    },
  )
})
