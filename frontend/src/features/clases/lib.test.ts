import { ApiError } from "@/services/apiClient"
import { describe, expect, it } from "vitest"

import {
  avisoDeFalloAlSubir,
  errorDeArchivoElegido,
  focoPerdido,
  mensajeDeErrorDeLista,
  siguientePasoInicio,
  terminoDeBusquedaMuyLargo,
  terminoDeBusquedaValido,
  textoConteoAlumnos,
  tiempoFrescoDelMuro,
  tipoDeArchivo,
  titularInicio,
  varianteDeClase,
  vecinaDeFila,
} from "./lib"

describe("varianteDeClase", () => {
  it("PR-A17a: es determinista y, con 30 ids aleatorios, usa las tres variantes", () => {
    const ids = Array.from({ length: 30 }, () => crypto.randomUUID())
    const variantes = new Set(ids.map((id) => varianteDeClase(id)))

    for (const id of ids) {
      expect(varianteDeClase(id)).toBe(varianteDeClase(id))
    }
    expect(variantes).toEqual(new Set(["verde", "azul", "blanca"]))
  })
})

describe("titularInicio y siguientePasoInicio", () => {
  it("PR-A17b: en 0, 1 y N, por rol", () => {
    expect(titularInicio("estudiante", 0)).toBe("Aún no estás en ninguna clase")
    expect(titularInicio("estudiante", 1)).toBe("Estás en 1 clase")
    expect(titularInicio("estudiante", 4)).toBe("Estás en 4 clases")
    expect(titularInicio("maestro", 0)).toBe("Aún no tienes clases")
    expect(titularInicio("maestro", 1)).toBe("Tienes 1 clase")
    expect(titularInicio("maestro", 4)).toBe("Tienes 4 clases")

    expect(siguientePasoInicio("estudiante", 0)).toMatch(/código de su clase/)
    expect(siguientePasoInicio("estudiante", 1)).toMatch(/próximas entregas/)
    expect(siguientePasoInicio("maestro", 0)).toMatch(/Crea tu primera clase/)
    expect(siguientePasoInicio("maestro", 1)).toMatch(/Comparte el código/)
  })
})

describe("textoConteoAlumnos", () => {
  it("PR-A17c: en 0, 1 y N", () => {
    expect(textoConteoAlumnos(0)).toBe("Sin alumnos")
    expect(textoConteoAlumnos(1)).toBe("1 alumno")
    expect(textoConteoAlumnos(5)).toBe("5 alumnos")
  })
})

describe("terminoDeBusquedaValido", () => {
  it("PR-B09: con espacios, acentos y 3 caracteres", () => {
    expect(terminoDeBusquedaValido("")).toBe(false)
    expect(terminoDeBusquedaValido("   ")).toBe(false)
    expect(terminoDeBusquedaValido("ab")).toBe(false)
    expect(terminoDeBusquedaValido("  ab  ")).toBe(false)
    expect(terminoDeBusquedaValido("a   ")).toBe(false)
    expect(terminoDeBusquedaValido("ÁÉ")).toBe(false)
    expect(terminoDeBusquedaValido("abc")).toBe(true)
    expect(terminoDeBusquedaValido("  abc  ")).toBe(true)
    expect(terminoDeBusquedaValido("ÁÉÍ")).toBe(true)
    expect(terminoDeBusquedaValido("José")).toBe(true)
    // Igual que el servidor (prepararTerminoDeBusqueda): "a b" normaliza a 3 caracteres.
    expect(terminoDeBusquedaValido("a  b")).toBe(true)
  })
})

describe("terminoDeBusquedaMuyLargo", () => {
  it("T-24 (ronda 2): decide con el criterio del servidor: más de 120 normalizados (41 sílabas hangul) o más de 1000 en crudo es muy largo y no es válido", () => {
    expect(terminoDeBusquedaMuyLargo("각".repeat(41))).toBe(true)
    expect(terminoDeBusquedaValido("각".repeat(41))).toBe(false)
    expect(terminoDeBusquedaMuyLargo("각".repeat(40))).toBe(false)
    expect(terminoDeBusquedaValido("각".repeat(40))).toBe(true)
    expect(terminoDeBusquedaMuyLargo("a".repeat(121))).toBe(true)
    expect(terminoDeBusquedaMuyLargo(`abc${" ".repeat(1200)}`)).toBe(true)
    expect(terminoDeBusquedaMuyLargo(`abc${" ".repeat(118)}`)).toBe(false)
    expect(terminoDeBusquedaValido(`abc${" ".repeat(118)}`)).toBe(true)
  })
})

describe("focoPerdido", () => {
  it("PR-C13c: con un documento doble, un activeElement nulo, igual a body o desconectado da true; un elemento conectado, false", () => {
    const body = document.createElement("body")
    const conectado = document.createElement("button")
    document.body.append(conectado)
    const desconectado = document.createElement("button")

    expect(focoPerdido({ activeElement: null, body })).toBe(true)
    expect(focoPerdido({ activeElement: body, body })).toBe(true)
    expect(focoPerdido({ activeElement: desconectado, body })).toBe(true)
    expect(focoPerdido({ activeElement: conectado, body })).toBe(false)
    conectado.remove()
  })
})

describe("vecinaDeFila", () => {
  it("la fila que ocupa el lugar de la que salió es la siguiente o, si era la última, la anterior; sin filas no hay vecina", () => {
    expect(vecinaDeFila(["a", "b", "c"], ["a", "c"], "b")).toBe("c")
    expect(vecinaDeFila(["a", "b", "c"], ["a", "b"], "c")).toBe("b")
    expect(vecinaDeFila(["a"], [], "a")).toBeUndefined()
    expect(vecinaDeFila(undefined, ["x", "y"], "z")).toBe("x")
  })
})

describe("mensajeDeErrorDeLista", () => {
  it("PR-C17: un VALIDACION del campo cursor da el texto dado; cualquier otro error sigue el camino de siempre", () => {
    const texto = "El muro cambió mientras lo veías."
    expect(
      mensajeDeErrorDeLista(new ApiError("VALIDACION", "cursor: no es válido", 400), texto),
    ).toBe(texto)
    expect(
      mensajeDeErrorDeLista(new ApiError("VALIDACION", "limite: debe ser un número", 400), texto),
    ).toBe("debe ser un número")
    expect(mensajeDeErrorDeLista(new ApiError("PUBLICACION_NO_ENCONTRADA", "x", 404), texto)).toBe(
      "Esa publicación ya no existe.",
    )
    expect(mensajeDeErrorDeLista(new Error("red"), texto)).not.toBe(texto)
  })
})

describe("errorDeArchivoElegido y tipoDeArchivo", () => {
  const MB = 1024 * 1024
  const pdf = { name: "guia.pdf", type: "application/pdf", size: 1000 }

  it("PR-D15: da un mensaje para el tipo, el tamaño y la cantidad, y null si el archivo se puede agregar", () => {
    expect(errorDeArchivoElegido(pdf, 0)).toBeNull()
    expect(errorDeArchivoElegido({ ...pdf, size: 25 * MB }, 4)).toBeNull()

    expect(errorDeArchivoElegido({ ...pdf, size: 25 * MB + 1 }, 0)).toBe(
      "«guia.pdf» pesa más de 25 MB.",
    )
    expect(
      errorDeArchivoElegido({ name: "x.exe", type: "application/x-msdownload", size: 5 }, 0),
    ).toBe("«x.exe» no es de un tipo permitido.")
    // La extensión debe corresponder al tipo, igual que en el servidor.
    expect(errorDeArchivoElegido({ name: "foto.png", type: "application/pdf", size: 5 }, 0)).toBe(
      "«foto.png» no es de un tipo permitido.",
    )
    expect(errorDeArchivoElegido({ name: "constructor", type: "constructor", size: 5 }, 0)).toBe(
      "«constructor» no es de un tipo permitido.",
    )
    expect(errorDeArchivoElegido(pdf, 5)).toBe("Puedes adjuntar hasta 5 archivos.")
  })

  it("tipoDeArchivo respeta File.type y, si viene vacío, lo infiere por la extensión", () => {
    expect(tipoDeArchivo({ name: "a.pdf", type: "application/pdf" })).toBe("application/pdf")
    expect(tipoDeArchivo({ name: "A.JPG", type: "" })).toBe("image/jpeg")
    expect(tipoDeArchivo({ name: "nota.txt", type: "" })).toBe("text/plain")
    expect(tipoDeArchivo({ name: "sin-extension", type: "" })).toBe("")
    expect(errorDeArchivoElegido({ name: "reporte.docx", type: "", size: 5 }, 0)).toBeNull()
  })
})

describe("tiempoFrescoDelMuro (T-40)", () => {
  const ADJUNTO_BASE = { id: "a", nombre: "a.png", tipo: "image/png", tamano: 1 }
  const publicacion = (expiraEn: string | null) => ({
    id: "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11",
    tipo: "anuncio" as const,
    titulo: null,
    texto: "x",
    autor: { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis", administracion: false },
    creadoEn: "2026-10-02T14:00:00.000Z",
    comentarios: 0,
    // CLASES-02b (C-10): el esquema ahora exige `administracion` y `puedeBorrar`; solo se agregan los campos.
    puedeBorrar: true,
    adjuntos: [
      {
        ...ADJUNTO_BASE,
        vistaPrevia: expiraEn === null ? null : { url: "https://almacen.ejemplo.mx/a", expiraEn },
      },
    ],
  })
  const pagina = (...expiraciones: (string | null)[]) => ({
    publicaciones: expiraciones.map(publicacion),
    siguienteCursor: null,
  })
  const hora = (texto: string) => Date.parse(`2026-10-02T${texto}.000Z`)

  it("PR-D18a: sin vistas previas da el valor de siempre; con ellas, 60 s antes del vencimiento más temprano; con un vencimiento ya pasado, 0", () => {
    expect(tiempoFrescoDelMuro([pagina(null)], hora("15:00:00"))).toBe(240_000)
    expect(tiempoFrescoDelMuro([], hora("15:00:00"))).toBe(240_000)

    // Dos páginas firmadas en momentos distintos: la primera vence a las 15:05, la segunda a las 15:07.
    const paginas = [pagina("2026-10-02T15:05:00.000Z"), pagina("2026-10-02T15:07:00.000Z")]
    // dataUpdatedAt es el de la última página (15:02): gana el vencimiento más temprano.
    expect(tiempoFrescoDelMuro(paginas, hora("15:02:00"))).toBe(120_000)
    expect(tiempoFrescoDelMuro([...paginas].reverse(), hora("15:02:00"))).toBe(120_000)
    // Una sola página pedida a las 15:01: vence a las 15:05, menos el margen de 60 s.
    expect(tiempoFrescoDelMuro([pagina("2026-10-02T15:05:00.000Z")], hora("15:01:00"))).toBe(
      180_000,
    )
    // Ya dentro del margen o vencido: se vuelve a pedir de inmediato.
    expect(tiempoFrescoDelMuro(paginas, hora("15:04:30"))).toBe(0)
    expect(tiempoFrescoDelMuro(paginas, hora("15:10:00"))).toBe(0)
  })
})

describe("avisoDeFalloAlSubir (T-41)", () => {
  it("un ApiError ARCHIVO_INVALIDO usa el mensaje del servidor, otro código usa el de mensajeDeErrorClases y un fallo que no es ApiError conserva el texto de siempre", () => {
    expect(
      avisoDeFalloAlSubir(
        new ApiError("ARCHIVO_INVALIDO", "El nombre del archivo no es válido.", 400),
        "a.pdf",
      ),
    ).toBe("No pudimos subir «a.pdf»: El nombre del archivo no es válido.")
    expect(avisoDeFalloAlSubir(new ApiError("ALMACEN_NO_DISPONIBLE", "x", 503), "a.pdf")).toBe(
      "No pudimos subir «a.pdf»: Los archivos no están disponibles en este momento. Inténtalo más tarde.",
    )
    expect(avisoDeFalloAlSubir(new TypeError("Failed to fetch"), "a.pdf")).toBe(
      "No pudimos subir «a.pdf». Inténtalo de nuevo.",
    )
  })
})
