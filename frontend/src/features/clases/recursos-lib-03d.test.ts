import { describe, expect, it } from "vitest"

import { ENTRADAS_FUERA_DE_CONTRATO } from "@/lib/errores-de-api-fuera-de-contrato"
import { ApiError } from "@/services/apiClient"

import { CAPACIDADES_POR_PERSPECTIVA, TEXTOS_EDITAR_RECURSO } from "./data"
import {
  anuncioValidado,
  avisoDeRecargaFallidaDelRecurso,
  claveDeLaMarcaDeRecursos,
  erroresDeLaPublicacionDeApi,
  erroresDelRecursoDeApi,
  errorQueReemplazaElRecurso,
  indiceDeSeccionActiva,
  marcaDeSeccionDeRecursos,
  mensajeDeErrorClases,
  recursoEditadoValidado,
  recursoNuevoValidado,
  seccionesDeRecursos,
  temaVigente,
} from "./lib"

// CLASES-03d (§D-8, §D-15): las funciones puras de "Recursos" y del formulario de Avisos.

const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const validacion = (mensaje: string) => new ApiError("VALIDACION", mensaje, 400)
const TEMA_1 = {
  id: "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01",
  nombre: "Unidad 1",
  orden: 0,
  elementos: 2,
}
const TEMA_2 = {
  id: "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02",
  nombre: "Unidad 2",
  orden: 1,
  elementos: 0,
}

describe("CL3-D18 · erroresDelRecursoDeApi", () => {
  it.each(["crear", "editar"] as const)(
    "CL3-D18: en modo %s recorre ENTRADAS_FUERA_DE_CONTRATO (null y un aviso legible) y pinta solo titulo y texto",
    (modo) => {
      expect(ENTRADAS_FUERA_DE_CONTRATO.length).toBeGreaterThan(0)
      for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
        const error = validacion(entrada.mensaje)
        expect(erroresDelRecursoDeApi(error, modo)).toBeNull()
        expect(mensajeDeErrorClases(error)).toBe(entrada.resto ?? GENERICO)
      }
      expect(erroresDelRecursoDeApi(validacion("titulo: Muy largo"), modo)).toEqual({
        titulo: "Muy largo",
      })
      expect(erroresDelRecursoDeApi(validacion("texto: Muy largo"), modo)).toEqual({
        texto: "Muy largo",
      })
      for (const campo of ["temaId", "version", "tipo", "archivoIds.0", "archivoIds.1"]) {
        expect(erroresDelRecursoDeApi(validacion(`${campo}: Revisa`), modo)).toBeNull()
      }
    },
  )
})

describe("CL3-D20 · erroresDeLaPublicacionDeApi (solo anuncios)", () => {
  it("CL3-D20: recorre ENTRADAS_FUERA_DE_CONTRATO y solo pinta texto; titulo y temaId se avisan", () => {
    for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
      expect(erroresDeLaPublicacionDeApi(validacion(entrada.mensaje), "anuncio")).toBeNull()
    }
    expect(erroresDeLaPublicacionDeApi(validacion("texto: Largo"), "anuncio")).toEqual({
      texto: "Largo",
    })
    expect(erroresDeLaPublicacionDeApi(validacion("titulo: Largo"), "anuncio")).toBeNull()
    expect(erroresDeLaPublicacionDeApi(validacion("temaId: Largo"), "anuncio")).toBeNull()
  })

  it("CL3-D19: el anuncio validado es { tipo: anuncio, texto normalizado, archivoIds: [] } sin título ni tema", () => {
    expect(anuncioValidado(" Hola \r\n")).toEqual({
      ok: true,
      datos: { tipo: "anuncio", texto: "Hola", archivoIds: [] },
    })
    expect(anuncioValidado("​")).toEqual({ ok: false, errores: { texto: "Escribe el anuncio" } })
  })
})

describe("CL3-D28 · el título del recurso en la validación local", () => {
  it.each(["", "   ", "ㅤ", "\u{FEFF}\u{3000} "])(
    "CL3-D28: con el título «%s» crear y editar dicen «Escribe el título del recurso», nunca el del material",
    (titulo) => {
      const nuevo = recursoNuevoValidado({ titulo, texto: "Algo", temaId: "" })
      expect(nuevo).toEqual({ ok: false, errores: { titulo: "Escribe el título del recurso" } })
      const editado = recursoEditadoValidado({ titulo, texto: "Algo", temaId: "" }, [], 0)
      expect(editado).toEqual({ ok: false, errores: { titulo: "Escribe el título del recurso" } })
    },
  )

  it("CL3-D08: el recurso nuevo es el data del esquema: archivoIds siempre, temaId solo si se eligió, sin bloque ni version", () => {
    expect(recursoNuevoValidado({ titulo: " Guía ", texto: "", temaId: "" })).toEqual({
      ok: true,
      datos: { tipo: "material", titulo: "Guía", texto: "", archivoIds: [] },
    })
    expect(recursoNuevoValidado({ titulo: "Guía", texto: "x", temaId: TEMA_1.id })).toEqual({
      ok: true,
      datos: { tipo: "material", titulo: "Guía", texto: "x", temaId: TEMA_1.id, archivoIds: [] },
    })
  })

  it("CL3-D11: el recurso editado lleva version, temaId (null con «Sin tema») y la lista de archivoIds", () => {
    expect(
      recursoEditadoValidado({ titulo: "Guía", texto: "", temaId: "" }, [TEMA_2.id], 4),
    ).toEqual({
      ok: true,
      datos: { titulo: "Guía", texto: "", temaId: null, archivoIds: [TEMA_2.id], version: 4 },
    })
  })
})

describe("CL3-D01 · las secciones de un bloque", () => {
  it("CL3-D01: «Sin tema» si tiene recursos y después los temas con recursos, en su orden; un tema sin recursos no aparece", () => {
    expect(
      seccionesDeRecursos({ temas: [TEMA_1, TEMA_2], sinTema: 1 }).map(({ nombre }) => nombre),
    ).toEqual(["Sin tema", "Unidad 1"])
    expect(seccionesDeRecursos({ temas: [TEMA_2], sinTema: 0 })).toEqual([])
  })

  it("las marcas de sección distinguen el bloque", () => {
    const marca = marcaDeSeccionDeRecursos("docente", TEMA_1.id)
    expect(claveDeLaMarcaDeRecursos(marca, "docente")).toBe(TEMA_1.id)
    expect(claveDeLaMarcaDeRecursos(marca, "aprendizaje")).toBeNull()
  })

  it("temaVigente: sin lista conserva el elegido; con lista, el elegido si sigue o «Sin tema»", () => {
    expect(temaVigente(TEMA_1.id, undefined)).toBe(TEMA_1.id)
    expect(temaVigente(TEMA_1.id, [TEMA_1])).toBe(TEMA_1.id)
    expect(temaVigente(TEMA_2.id, [TEMA_1])).toBe("")
  })
})

describe("CL3-D13 y CL3-D14 · lo que reemplaza «Editar recurso» y el aviso de recarga", () => {
  it("CL3-D13: reemplazan la vista la primera carga, el 404, el 403 de la clase y un VALIDACION de claseId o recursoId", () => {
    expect(errorQueReemplazaElRecurso(false, new ApiError("SIN_CONEXION", "x", 0))).toBe(true)
    for (const codigo of ["RECURSO_NO_ENCONTRADO", "SIN_ACCESO_A_LA_CLASE"]) {
      expect(errorQueReemplazaElRecurso(true, new ApiError(codigo, "x", 404))).toBe(true)
    }
    expect(errorQueReemplazaElRecurso(true, validacion("recursoId: no"))).toBe(true)
    expect(errorQueReemplazaElRecurso(true, validacion("claseId: no"))).toBe(true)
    expect(errorQueReemplazaElRecurso(true, validacion("cursor: no"))).toBe(false)
    expect(errorQueReemplazaElRecurso(true, new ApiError("ERROR_INTERNO", "x", 500))).toBe(false)
    expect(mensajeDeErrorClases(validacion("recursoId: no"))).toBe("Ese recurso ya no existe.")
  })

  it("CL3-D14: sin conexión o con un 5xx, «revisa tu conexión»; con otra respuesta (429), «inténtalo de nuevo en un momento»", () => {
    expect(avisoDeRecargaFallidaDelRecurso(new ApiError("SIN_CONEXION", "x", 0))).toBe(
      TEXTOS_EDITAR_RECURSO.recargaRed,
    )
    expect(avisoDeRecargaFallidaDelRecurso(new ApiError("ERROR_INTERNO", "x", 500))).toBe(
      TEXTOS_EDITAR_RECURSO.recargaRed,
    )
    expect(avisoDeRecargaFallidaDelRecurso(new ApiError("DEMASIADAS", "x", 429))).toBe(
      TEXTOS_EDITAR_RECURSO.recargaServidor,
    )
  })
})

describe("CL3-D26 · «Recursos» como sección", () => {
  it("CL3-D26: «Recursos» es la tercera sección y queda activa en …/recursos y en su edición (S-11)", () => {
    const secciones = CAPACIDADES_POR_PERSPECTIVA.maestro.secciones
    const base = "/maestro/clases/abc"
    expect(indiceDeSeccionActiva(`${base}/recursos`, base, secciones)).toBe(2)
    expect(indiceDeSeccionActiva(`${base}/recursos/r1/editar`, base, secciones)).toBe(2)
  })
})
