import { describe, expect, it } from "vitest"

import { TEXTOS_ADJUNTOS } from "@/components/adjuntos/data"
import {
  ENTRADAS_FUERA_DE_CONTRATO,
  MENSAJE_DE_PRUEBA,
  RESTOS_SIN_TEXTO_VISIBLE,
} from "@/lib/errores-de-api-fuera-de-contrato"
import { ApiError } from "@/services/apiClient"

import {
  CAMPOS_PINTADOS_DE_LA_CLASE,
  CAMPOS_PINTADOS_DE_LA_PUBLICACION,
  CODIGOS_CON_MENSAJE_DEL_SERVIDOR,
  MENSAJES_POR_CODIGO_DE_CLASES,
} from "./data"
import {
  avisoDeFalloAlSubir,
  errorDelCampoCodigo,
  erroresDeCategoriasDeApi,
  erroresDeFormularioClases,
  erroresDeLaClaseDeApi,
  erroresDeLaPublicacionDeApi,
  erroresDelTemaDeApi,
  mensajeDeConsultaClases,
  mensajeDeErrorClases,
  mensajeDeErrorDeLista,
} from "./lib"
import type { ErroresFormulario } from "./types"

// CHORE-03 (03b): las funciones de traducción de features/clases recorren la tabla común de entradas
// fuera de contrato.

const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const SIN_ACCESO = "No tienes acceso a esta clase."
const NOMBRE = "guia.pdf"
const ID_INVALIDO = "debe ser un identificador válido"
const TEXTO_DEL_CURSOR = "El muro cambió mientras lo veías."

const validacion = (mensaje: string) => new ApiError("VALIDACION", mensaje, 400)

// Lo que cada código con texto fijo daba antes de CHORE-03 (MENSAJES_ERROR_CLASES de lib.ts).
const TEXTOS_FIJOS_DE_SIEMPRE: Readonly<Record<string, string>> = {
  CODIGO_INVALIDO: "No encontramos una clase con ese código. Revisa que esté bien escrito.",
  SIN_ACCESO_A_LA_CLASE: SIN_ACCESO,
  ALUMNO_NO_ENCONTRADO: "No encontramos a ese alumno.",
  PUBLICACION_NO_ENCONTRADA: "Esa publicación ya no existe.",
  COMENTARIO_NO_ENCONTRADO: "Ese comentario ya no existe.",
  ARCHIVO_NO_SUBIDO: "Uno de los archivos no terminó de subir. Inténtalo de nuevo.",
  ARCHIVO_INVALIDO: "Uno de los archivos no coincide con lo que elegiste. Vuelve a adjuntarlo.",
  ALMACEN_NO_CONFIGURADO: "Los archivos no están disponibles en este momento. Inténtalo más tarde.",
  ALMACEN_NO_DISPONIBLE: "Los archivos no están disponibles en este momento. Inténtalo más tarde.",
}

// Las rutas dobles de features/clases del inventario de §D-1 (Enmienda 2, T-01): el servidor arma
// `${ruta}: ${mensaje}` y el esquema de shared/ repite su campo al inicio de su mensaje.
const RUTAS_DOBLES_DE_CLASES: readonly string[] = [
  "publicacionId: publicacionId:",
  "comentarioId: comentarioId:",
  "temaId: temaId:",
  "temaIds.0: temaId:",
  "maestroId: maestroId:",
  "maestroIds.0: maestroId:",
  "categorias.0.id: categoriaId:",
  "alumnoId: alumnoId:",
  "archivoId: archivoId:",
]

describe("CHORE-03 · traducción de errores de features/clases", () => {
  it("CH3-B01: mensajeDeErrorClases recorre la tabla, da el genérico ante un código con mensaje del servidor sin texto visible, conserva los textos fijos y quita las rutas dobles; avisoDeFalloAlSubir de clases también recorre la tabla", () => {
    for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
      expect(mensajeDeErrorClases(validacion(entrada.mensaje))).toBe(entrada.resto ?? GENERICO)
      expect(avisoDeFalloAlSubir(validacion(entrada.mensaje), NOMBRE)).toBe(
        TEXTOS_ADJUNTOS.errorRechazado(NOMBRE, entrada.resto ?? GENERICO),
      )
    }
    expect(CODIGOS_CON_MENSAJE_DEL_SERVIDOR).toHaveLength(12)
    for (const codigo of CODIGOS_CON_MENSAJE_DEL_SERVIDOR) {
      for (const resto of RESTOS_SIN_TEXTO_VISIBLE) {
        expect(mensajeDeErrorClases(new ApiError(codigo, resto, 409))).toBe(GENERICO)
      }
      expect(mensajeDeErrorClases(new ApiError(codigo, "Mensaje.", 409))).toBe("Mensaje.")
    }
    expect(mensajeDeErrorClases(validacion("claseId:"))).toBe(SIN_ACCESO)
    expect(mensajeDeErrorClases(validacion("claseId: debe ser un identificador válido"))).toBe(
      SIN_ACCESO,
    )
    expect(Object.keys(MENSAJES_POR_CODIGO_DE_CLASES).sort()).toEqual(
      Object.keys(TEXTOS_FIJOS_DE_SIEMPRE).sort(),
    )
    for (const [codigo, texto] of Object.entries(TEXTOS_FIJOS_DE_SIEMPRE)) {
      expect(mensajeDeErrorClases(new ApiError(codigo, "x", 400))).toBe(texto)
    }
    for (const resto of RESTOS_SIN_TEXTO_VISIBLE) {
      expect(avisoDeFalloAlSubir(new ApiError("ARCHIVO_INVALIDO", resto, 400), NOMBRE)).toBe(
        TEXTOS_ADJUNTOS.errorRechazado(NOMBRE, TEXTOS_FIJOS_DE_SIEMPRE.ARCHIVO_INVALIDO ?? ""),
      )
    }
    // Enmienda 2 (T-01) y O-r2-4: las rutas dobles de clases dan el resto sin ningún prefijo.
    for (const prefijos of RUTAS_DOBLES_DE_CLASES) {
      expect(mensajeDeErrorClases(validacion(`${prefijos} ${ID_INVALIDO}`))).toBe(ID_INVALIDO)
    }
    expect(mensajeDeErrorClases(validacion(`claseId: claseId: ${ID_INVALIDO}`))).toBe(SIN_ACCESO)
    expect(mensajeDeConsultaClases(validacion("tema: tema: elige un tema válido"))).toBe(GENERICO)
    expect(
      erroresDeCategoriasDeApi(validacion(`categorias.0.id: categoriaId: ${ID_INVALIDO}`), ["a"]),
    ).toBeNull()
  })

  it("CH3-B02: mensajeDeConsultaClases da el genérico ante toda la tabla y conserva el texto fijo de claseId", () => {
    for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
      expect(mensajeDeConsultaClases(validacion(entrada.mensaje))).toBe(GENERICO)
    }
    expect(mensajeDeConsultaClases(validacion("limite: Too big: expected number"))).toBe(GENERICO)
    expect(mensajeDeConsultaClases(validacion("claseId:"))).toBe(SIN_ACCESO)
    expect(mensajeDeConsultaClases(validacion("claseId: x"))).toBe(SIN_ACCESO)
  })

  it("CH3-B03: mensajeDeErrorDeLista da el texto del cursor ante «cursor:» y el genérico ante toda la tabla", () => {
    expect(mensajeDeErrorDeLista(validacion("cursor: x"), TEXTO_DEL_CURSOR)).toBe(TEXTO_DEL_CURSOR)
    for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
      expect(mensajeDeErrorDeLista(validacion(entrada.mensaje), TEXTO_DEL_CURSOR)).toBe(GENERICO)
    }
  })

  it("CH3-B04: erroresDeFormularioClases, errorDelCampoCodigo y erroresDelTemaDeApi dan el genérico en su campo sin texto visible y null en las rutas de la tabla", () => {
    const campos = ["nombre", "descripcion", "maestroIds"] as const
    for (const resto of RESTOS_SIN_TEXTO_VISIBLE) {
      for (const campo of campos) {
        expect(erroresDeFormularioClases(validacion(`${campo}:${resto}`), campos)).toEqual({
          [campo]: GENERICO,
        })
      }
      expect(errorDelCampoCodigo(validacion(`codigo:${resto}`))).toEqual({ codigo: GENERICO })
      expect(erroresDelTemaDeApi(validacion(`nombre:${resto}`))).toEqual({ nombre: GENERICO })
    }
    expect(erroresDeFormularioClases(validacion("nombre: Mensaje."), campos)).toEqual({
      nombre: "Mensaje.",
    })
    for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
      const error = validacion(entrada.mensaje)
      expect(erroresDeFormularioClases(error, campos)).toBeNull()
      expect(errorDelCampoCodigo(error)).toBeNull()
      expect(erroresDelTemaDeApi(error)).toBeNull()
    }
  })

  it("CH3-B05: erroresDeCategoriasDeApi da el genérico en la fila y en la lista sin texto visible, y null en las rutas de la tabla y en una ruta más larga que la de la fila", () => {
    const llaves = ["fila-a", "fila-b"]
    for (const resto of RESTOS_SIN_TEXTO_VISIBLE) {
      expect(erroresDeCategoriasDeApi(validacion(`categorias.1.peso:${resto}`), llaves)).toEqual({
        "fila-b.peso": GENERICO,
      })
      expect(erroresDeCategoriasDeApi(validacion(`categorias:${resto}`), llaves)).toEqual({
        categorias: GENERICO,
      })
    }
    expect(erroresDeCategoriasDeApi(validacion("categorias.1.peso: Mensaje."), llaves)).toEqual({
      "fila-b.peso": "Mensaje.",
    })
    expect(erroresDeCategoriasDeApi(validacion("categorias.0.peso.x: y"), llaves)).toBeNull()
    for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
      expect(erroresDeCategoriasDeApi(validacion(entrada.mensaje), llaves)).toBeNull()
    }
  })
})

// CHORE-03 (Enmienda 4, T-03 y T-04): "campo pintado" se decide por el modo de lo enviado.
type FuncionPorModo = (error: unknown) => ErroresFormulario | null

const CLASE_CREAR: FuncionPorModo = (error) => erroresDeLaClaseDeApi(error, "crear")
const CLASE_EDITAR: FuncionPorModo = (error) => erroresDeLaClaseDeApi(error, "editar")
const ANUNCIO: FuncionPorModo = (error) => erroresDeLaPublicacionDeApi(error, "anuncio")
const MATERIAL: FuncionPorModo = (error) => erroresDeLaPublicacionDeApi(error, "material")

const FILAS_POR_MODO = [
  ["erroresDeLaClaseDeApi", "crear", "nombre", true, CLASE_CREAR],
  ["erroresDeLaClaseDeApi", "crear", "descripcion", true, CLASE_CREAR],
  ["erroresDeLaClaseDeApi", "crear", "maestroIds", true, CLASE_CREAR],
  ["erroresDeLaClaseDeApi", "editar", "nombre", true, CLASE_EDITAR],
  ["erroresDeLaClaseDeApi", "editar", "descripcion", true, CLASE_EDITAR],
  ["erroresDeLaClaseDeApi", "editar", "maestroIds", false, CLASE_EDITAR],
  ["erroresDeLaPublicacionDeApi", "anuncio", "texto", true, ANUNCIO],
  ["erroresDeLaPublicacionDeApi", "anuncio", "titulo", false, ANUNCIO],
  ["erroresDeLaPublicacionDeApi", "material", "titulo", true, MATERIAL],
  ["erroresDeLaPublicacionDeApi", "material", "texto", true, MATERIAL],
] as const

const MODOS = [
  ["crear", CLASE_CREAR],
  ["editar", CLASE_EDITAR],
  ["anuncio", ANUNCIO],
  ["material", MATERIAL],
] as const

const fuentesDeClases = import.meta.glob<string>(["./**/*.{ts,tsx}", "!./**/*.test.{ts,tsx}"], {
  query: "?raw",
  import: "default",
  eager: true,
})

const contarApariciones = (texto: string, buscado: string): number =>
  texto.split(buscado).length - 1

describe("CHORE-03 (Enmienda 4) · campo pintado por modo en features/clases", () => {
  it.each(FILAS_POR_MODO)(
    "CH3-B15 (1): %s en %s con «%s:» (lo pinta: %s) da el error del campo o null y el aviso legible, con mensaje, ruta doble y cada resto sin texto visible",
    (_funcion, _modo, campo, loPinta, traducir) => {
      const conMensaje = validacion(`${campo}: ${MENSAJE_DE_PRUEBA}`)
      const conRutaDoble = validacion(`${campo}: ${campo}: ${MENSAJE_DE_PRUEBA}`)
      for (const error of [conMensaje, conRutaDoble]) {
        if (loPinta) {
          expect(traducir(error)).toEqual({ [campo]: MENSAJE_DE_PRUEBA })
          continue
        }
        expect(traducir(error)).toBeNull()
        expect(mensajeDeErrorClases(error)).toBe(MENSAJE_DE_PRUEBA)
      }
      for (const resto of RESTOS_SIN_TEXTO_VISIBLE) {
        const sinTexto = validacion(`${campo}:${resto}`)
        if (loPinta) {
          expect(traducir(sinTexto)).toEqual({ [campo]: GENERICO })
          continue
        }
        expect(traducir(sinTexto)).toBeNull()
        expect(mensajeDeErrorClases(sinTexto)).toBe(GENERICO)
      }
    },
  )

  it.each(MODOS)(
    "CH3-B15 (2): toda la tabla fuera de contrato da null en el modo %s",
    (_modo, traducir) => {
      expect(ENTRADAS_FUERA_DE_CONTRATO.length).toBeGreaterThan(0)
      for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
        expect(traducir(validacion(entrada.mensaje))).toBeNull()
      }
    },
  )

  it("CH3-B15 (3): las listas de campos pintados por modo son exactamente las de hoy", () => {
    expect(CAMPOS_PINTADOS_DE_LA_CLASE).toEqual({
      crear: ["nombre", "descripcion", "maestroIds"],
      editar: ["nombre", "descripcion"],
    })
    expect(CAMPOS_PINTADOS_DE_LA_PUBLICACION).toEqual({
      anuncio: ["texto"],
      material: ["titulo", "texto"],
    })
  })

  it("CH3-B15 (4): erroresDeFormularioClases( solo se llama en lib.ts, formulario-comentario.tsx y una vez en hooks.ts; las listas de campos de la clase y del material solo se escriben en data.ts", () => {
    const llamada = "erroresDeFormularioClases("
    const archivos = Object.keys(fuentesDeClases)
    expect(archivos.length).toBeGreaterThan(10)
    const conLlamada = archivos
      .filter((archivo) => (fuentesDeClases[archivo] ?? "").includes(llamada))
      .sort()
    expect(conLlamada).toEqual(["./components/formulario-comentario.tsx", "./hooks.ts", "./lib.ts"])
    expect(contarApariciones(fuentesDeClases["./hooks.ts"] ?? "", llamada)).toBe(1)
    expect(fuentesDeClases["./hooks.ts"]).toContain('erroresDeFormularioClases(error, ["texto"])')
    expect(contarApariciones(fuentesDeClases["./lib.ts"] ?? "", llamada)).toBe(4)
    for (const lista of ['["nombre", "descripcion", "maestroIds"]', '["titulo", "texto"]']) {
      const conLista = archivos.filter((archivo) =>
        (fuentesDeClases[archivo] ?? "").includes(lista),
      )
      expect(conLista).toEqual(["./data.ts"])
    }
  })
})
