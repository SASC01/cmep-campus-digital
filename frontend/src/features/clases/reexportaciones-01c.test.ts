import { FIRMA_ADMINISTRACION } from "@campus/shared"
import { describe, expect, expectTypeOf, it } from "vitest"

import { ConClaseDeLaRuta as ConClaseNueva } from "@/components/clase/con-clase-de-la-ruta"
import { TEXTOS_DE_LA_CLASE } from "@/components/clase/data"
import { FirmaDelAutor as FirmaNueva } from "@/components/clase/firma-del-autor"
import { AdjuntosDePublicacion as AdjuntosNuevo } from "@/components/adjuntos/adjuntos-de-publicacion"
import {
  ACCEPT_DE_ADJUNTOS as ACCEPT_NUEVO,
  MARGEN_DE_VISTA_PREVIA_MS as MARGEN_NUEVO,
  MENSAJES_ERROR_DE_ARCHIVOS,
  MENSAJES_POR_CODIGO_DE_ARCHIVO,
  TEXTOS_ADJUNTOS as TEXTOS_ADJUNTOS_NUEVOS,
} from "@/components/adjuntos/data"
import {
  useSolicitarSubida as useSolicitarSubidaNuevo,
  useUrlDeDescarga as useUrlDeDescargaNuevo,
} from "@/components/adjuntos/hooks"
import {
  avisoDeFalloAlSubir as avisoCompartido,
  errorDeArchivoElegido as errorDeArchivoNuevo,
  tipoDeArchivo as tipoNuevo,
  tiempoFrescoDeAdjuntos,
} from "@/components/adjuntos/lib"
import { ListaDeAdjuntosElegidos as ListaNueva } from "@/components/adjuntos/lista-de-adjuntos-elegidos"
import type { ArchivoCandidato as ArchivoCandidatoNuevo } from "@/components/adjuntos/types"
import {
  campoDeErrorDeApi,
  erroresDeFormularioDeApi,
  erroresPorCampo as erroresPorCampoNuevo,
  esErrorDeCursor as esErrorDeCursorNuevo,
  type ErroresFormulario as ErroresFormularioNuevo,
  type IncidenciaValidacion as IncidenciaNueva,
} from "@/lib/errores-de-api"
import {
  baseDeClase as baseNueva,
  BASES_POR_PERSPECTIVA,
  perspectivaDeRuta as perspectivaNueva,
  type Perspectiva as PerspectivaNueva,
} from "@/lib/ruta-de-clase"
import { ApiError } from "@/services/apiClient"
import { clavePublicaciones as clavePublicacionesNueva } from "@/services/clasesService"

import { AdjuntosDePublicacion as AdjuntosViejo } from "./components/adjuntos-de-publicacion"
import { ConClaseDeLaRuta as ConClaseVieja } from "./components/con-clase-de-la-ruta"
import { FirmaDelAutor as FirmaVieja } from "./components/firma-del-autor"
import { ListaDeAdjuntosElegidos as ListaVieja } from "./components/lista-de-adjuntos-elegidos"
import {
  ACCEPT_DE_ADJUNTOS as ACCEPT_VIEJO,
  CAPACIDADES_POR_PERSPECTIVA,
  clavePublicaciones as clavePublicacionesVieja,
  MARGEN_DE_VISTA_PREVIA_MS as MARGEN_VIEJO,
  MENSAJES_ERROR_CLASES_GENERALES,
  MENSAJES_ERROR_DE_ARCHIVOS as MENSAJES_ERROR_DE_ARCHIVOS_VIEJOS,
  TEXTOS_ADJUNTOS as TEXTOS_ADJUNTOS_VIEJOS,
  TEXTOS_CLASE,
  TEXTOS_MURO,
  TIEMPO_FRESCO_DEL_MURO_MS,
} from "./data"
import { useSolicitarSubida, useUrlDeDescarga } from "./hooks"
import {
  avisoDeFalloAlSubir,
  baseDeClase,
  erroresDeFormularioClases,
  errorDeArchivoElegido,
  erroresPorCampo,
  esErrorDeCursor,
  mensajeDeErrorClases,
  perspectivaDeRuta,
  tiempoFrescoDelMuro,
  tipoDeArchivo,
} from "./lib"
import type {
  ArchivoCandidato,
  ErroresFormulario,
  IncidenciaValidacion,
  Perspectiva,
} from "./types"

// TAREAS-01c (PR-1C02, §D-9): lo que se movió a ubicaciones compartidas sigue importándose desde su
// lugar de antes. Donde hay una reexportación, la ruta vieja y la nueva dan el mismo objeto (`toBe`);
// donde §D-9 pide un envoltorio (lo que usaba mensajeDeErrorClases), el nombre y la salida son los
// mismos y se comprueban con un caso.

describe("reexportaciones de 01c: el mismo objeto desde la ruta vieja y la nueva", () => {
  it("PR-1C02: adjuntos: ListaDeAdjuntosElegidos, los dos hooks, los textos, el accept y el margen", () => {
    expect(ListaVieja).toBe(ListaNueva)
    expect(useSolicitarSubida).toBe(useSolicitarSubidaNuevo)
    expect(useUrlDeDescarga).toBe(useUrlDeDescargaNuevo)
    expect(TEXTOS_ADJUNTOS_VIEJOS).toBe(TEXTOS_ADJUNTOS_NUEVOS)
    expect(ACCEPT_VIEJO).toBe(ACCEPT_NUEVO)
    expect(MARGEN_VIEJO).toBe(MARGEN_NUEVO)
  })

  it("PR-1C02: adjuntos: tipoDeArchivo y errorDeArchivoElegido", () => {
    expect(tipoDeArchivo).toBe(tipoNuevo)
    expect(errorDeArchivoElegido).toBe(errorDeArchivoNuevo)
  })

  it("PR-1C02: clase: ConClaseDeLaRuta y FirmaDelAutor", () => {
    expect(ConClaseVieja).toBe(ConClaseNueva)
    expect(FirmaVieja).toBe(FirmaNueva)
  })

  it("PR-1C02: clase: el texto de la firma y el de «sin acceso» viven en components/clase/data.ts", () => {
    expect(TEXTOS_DE_LA_CLASE.firmaAdministracion).toBe(FIRMA_ADMINISTRACION)
    expect(TEXTOS_CLASE.sinAcceso).toBe(TEXTOS_DE_LA_CLASE.sinAcceso)
    expect(Object.hasOwn(TEXTOS_MURO, "firmaAdministracion")).toBe(false)
  })

  it("PR-1C02: ruta de clase: perspectivaDeRuta, baseDeClase y las bases de CAPACIDADES_POR_PERSPECTIVA", () => {
    expect(perspectivaDeRuta).toBe(perspectivaNueva)
    expect(baseDeClase).toBe(baseNueva)
    for (const perspectiva of ["estudiante", "maestro", "admin"] as const) {
      expect(CAPACIDADES_POR_PERSPECTIVA[perspectiva].base).toBe(BASES_POR_PERSPECTIVA[perspectiva])
    }
  })

  it("PR-1C02: errores: erroresPorCampo y esErrorDeCursor", () => {
    expect(erroresPorCampo).toBe(erroresPorCampoNuevo)
    expect(esErrorDeCursor).toBe(esErrorDeCursorNuevo)
  })

  it("PR-1C02: clave del muro: clavePublicaciones", () => {
    expect(clavePublicacionesVieja).toBe(clavePublicacionesNueva)
  })

  it("PR-1C02: los mensajes de error de archivos y su mapa por código viven en components/adjuntos/data.ts y features/clases los usa igual", () => {
    expect(MENSAJES_ERROR_DE_ARCHIVOS_VIEJOS).toBe(MENSAJES_ERROR_DE_ARCHIVOS)
    expect(MENSAJES_ERROR_CLASES_GENERALES.archivoNoSubido).toBe(
      MENSAJES_ERROR_DE_ARCHIVOS.archivoNoSubido,
    )
    expect(MENSAJES_ERROR_CLASES_GENERALES.archivoInvalido).toBe(
      MENSAJES_ERROR_DE_ARCHIVOS.archivoInvalido,
    )
    expect(MENSAJES_ERROR_CLASES_GENERALES.almacenNoDisponible).toBe(
      MENSAJES_ERROR_DE_ARCHIVOS.almacenNoDisponible,
    )
    expect(Object.keys(MENSAJES_POR_CODIGO_DE_ARCHIVO).sort()).toEqual([
      "ALMACEN_NO_CONFIGURADO",
      "ALMACEN_NO_DISPONIBLE",
      "ARCHIVO_INVALIDO",
      "ARCHIVO_NO_SUBIDO",
    ])
    // mensajeDeErrorClases conserva la misma salida por cada uno de los cuatro códigos.
    for (const [codigo, mensaje] of Object.entries(MENSAJES_POR_CODIGO_DE_ARCHIVO)) {
      expect(mensajeDeErrorClases(new ApiError(codigo, "texto del servidor", 400)), codigo).toBe(
        mensaje,
      )
    }
    expect(MENSAJES_POR_CODIGO_DE_ARCHIVO.ARCHIVO_NO_SUBIDO).toBe(
      "Uno de los archivos no terminó de subir. Inténtalo de nuevo.",
    )
  })

  it("PR-1C02: los tipos movidos son los mismos (Perspectiva, ArchivoCandidato, ErroresFormulario, IncidenciaValidacion)", () => {
    expectTypeOf<Perspectiva>().toEqualTypeOf<PerspectivaNueva>()
    expectTypeOf<ArchivoCandidato>().toEqualTypeOf<ArchivoCandidatoNuevo>()
    expectTypeOf<ErroresFormulario>().toEqualTypeOf<ErroresFormularioNuevo>()
    expectTypeOf<IncidenciaValidacion>().toEqualTypeOf<IncidenciaNueva>()
    expect(true).toBe(true)
  })
})

describe("envoltorios de 01c: el mismo nombre, la misma firma y la misma salida", () => {
  const apiError = (codigo: string, mensaje: string) => new ApiError(codigo, mensaje, 400)

  it("PR-1C02: avisoDeFalloAlSubir da lo mismo que la versión compartida con mensajeDeErrorClases", () => {
    const casos: unknown[] = [
      apiError("ARCHIVO_INVALIDO", "El archivo no coincide"),
      apiError("ALMACEN_NO_DISPONIBLE", "x"),
      apiError("SIN_ACCESO_A_LA_CLASE", "x"),
      apiError("VALIDACION", "claseId: debe ser un identificador válido"),
      new Error("PUT fallido"),
      "texto",
    ]
    for (const error of casos) {
      expect(avisoDeFalloAlSubir(error, "guia.pdf")).toBe(
        avisoCompartido(error, "guia.pdf", mensajeDeErrorClases),
      )
    }
    expect(avisoDeFalloAlSubir(apiError("ARCHIVO_INVALIDO", "Motivo"), "a.pdf")).toBe(
      TEXTOS_ADJUNTOS_VIEJOS.errorRechazado("a.pdf", "Motivo"),
    )
  })

  it("PR-1C02: erroresDeFormularioClases da lo mismo que la versión compartida con mensajeDeErrorClases", () => {
    const casos: unknown[] = [
      apiError("VALIDACION", "nombre: El nombre debe tener al menos 2 caracteres"),
      apiError("VALIDACION", "campo_raro: x"),
      apiError("VALIDACION", "sin prefijo"),
      apiError("CODIGO_INVALIDO", "x"),
      new Error("sin conexión"),
    ]
    for (const error of casos) {
      expect(erroresDeFormularioClases(error, ["nombre", "descripcion"])).toEqual(
        erroresDeFormularioDeApi(error, ["nombre", "descripcion"], mensajeDeErrorClases),
      )
    }
    expect(
      erroresDeFormularioClases(apiError("VALIDACION", "nombre: Muy corto"), ["nombre"]),
    ).toEqual({ nombre: "Muy corto" })
    expect(campoDeErrorDeApi(apiError("VALIDACION", "cursor: no es válido"))).toBe("cursor")
  })

  it("PR-1C02: tiempoFrescoDelMuro da lo mismo que tiempoFrescoDeAdjuntos sobre los adjuntos de todas las páginas", () => {
    const vencimiento = new Date(Date.now() + 300_000).toISOString()
    const adjunto = (vistaPrevia: { url: string; expiraEn: string } | null) => ({
      id: "11111111-1111-4111-8111-111111111111",
      nombre: "a.png",
      tipo: "image/png",
      tamano: 1,
      vistaPrevia,
    })
    const publicacion = (adjuntos: ReturnType<typeof adjunto>[]) => ({
      id: "22222222-2222-4222-8222-222222222222",
      tipo: "anuncio" as const,
      titulo: null,
      texto: "x",
      autor: { id: "33333333-3333-4333-8333-333333333333", nombre: "A", administracion: false },
      creadoEn: "2026-09-29T15:30:00.000Z",
      comentarios: 0,
      adjuntos,
      puedeBorrar: false,
      tarea: null,
    })
    const conVista = adjunto({ url: "https://almacen.test/a", expiraEn: vencimiento })
    const paginas = [
      { publicaciones: [publicacion([adjunto(null)])], siguienteCursor: null },
      { publicaciones: [publicacion([conVista])], siguienteCursor: null },
    ]
    expect(tiempoFrescoDelMuro(paginas, 1000)).toBe(
      tiempoFrescoDeAdjuntos([adjunto(null), conVista], 1000, TIEMPO_FRESCO_DEL_MURO_MS),
    )
    expect(tiempoFrescoDelMuro([], 1000)).toBe(TIEMPO_FRESCO_DEL_MURO_MS)
  })

  it("PR-1C02: AdjuntosDePublicacion conserva el nombre y sigue siendo un componente distinto del compartido", () => {
    expect(typeof AdjuntosViejo).toBe("function")
    expect(AdjuntosViejo.name).toBe("AdjuntosDePublicacion")
    expect(typeof AdjuntosNuevo).toBe("function")
    expect(AdjuntosViejo).not.toBe(AdjuntosNuevo)
  })
})
