import { describe, expect, it } from "vitest"

import { ApiError } from "@/services/apiClient"

import {
  avisoDeRecargaFallidaAlEditar,
  claveDeFocoDeLaTarea,
  criterioVacio,
  erroresConLlavesDeFila,
  erroresSinFilasQuitadas,
  errorQueReemplazaLaVista,
  cuerpoDeTarea,
  estadoInicialDelFormulario,
  erroresDeLaTareaDeApi,
  fechaLocalAIso,
  isoAFechaLocal,
  mensajeDeErrorTareas,
  puntosDeLaTarea,
  totalDeRubrica,
} from "./lib"
import type { EstadoDelFormulario, TareaDetalle } from "./types"

const futuro = () => {
  const f = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
  f.setSeconds(0, 0)
  return isoAFechaLocal(f.toISOString())
}

const estadoValido = (cambios: Partial<EstadoDelFormulario> = {}): EstadoDelFormulario => ({
  titulo: "Ensayo",
  instrucciones: "",
  fechaLimite: futuro(),
  puntos: "100",
  categoriaId: "",
  temaId: "",
  aceptaTardias: true,
  rubrica: [],
  ...cambios,
})

describe("PR-1D02: fechas del formulario", () => {
  it("PR-1D02: fechaLocalAIso y isoAFechaLocal son inversas", () => {
    const local = "2026-10-06T14:30"
    expect(isoAFechaLocal(fechaLocalAIso(local))).toBe(local)
  })

  it("PR-1D02: una fecha vacía o inválida da cadena vacía", () => {
    expect(fechaLocalAIso("")).toBe("")
    expect(fechaLocalAIso("nada")).toBe("")
    expect(isoAFechaLocal("nada")).toBe("")
  })
})

describe("PR-1D02: suma de la rúbrica", () => {
  it("PR-1D02: suma solo los enteros válidos", () => {
    expect(totalDeRubrica([{ puntosMax: "10" }, { puntosMax: "x" }, { puntosMax: "5" }])).toBe(15)
  })

  it("PR-1D02: puntosDeLaTarea es null si no es un entero positivo", () => {
    expect(puntosDeLaTarea("0")).toBeNull()
    expect(puntosDeLaTarea("10,5")).toBeNull()
    expect(puntosDeLaTarea("20")).toBe(20)
  })
})

describe("PR-1D02: cuerpoDeTarea", () => {
  it("PR-1D02: arma el cuerpo válido con la fecha en UTC", () => {
    const resultado = cuerpoDeTarea(estadoValido(), 0)
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.datos.fechaLimite).toMatch(/Z$/)
    expect(resultado.datos.categoriaId).toBeNull()
  })

  it("PR-1D02: con categorías en la clase y ninguna elegida, error en categoriaId", () => {
    const resultado = cuerpoDeTarea(estadoValido(), 2)
    expect(resultado).toEqual({
      ok: false,
      errores: { categoriaId: "Elige la categoría de la tarea." },
    })
  })

  it("PR-1D02: sin título o con puntos no enteros marca esos campos", () => {
    const resultado = cuerpoDeTarea(estadoValido({ titulo: "  ", puntos: "10,5" }), 0)
    expect(resultado.ok).toBe(false)
    if (resultado.ok) return
    expect(resultado.errores.titulo).toBeDefined()
    expect(resultado.errores.puntos).toBeDefined()
  })

  it("PR-1D02: el error de un criterio lleva la ruta completa", () => {
    const resultado = cuerpoDeTarea(
      estadoValido({ rubrica: [{ llave: "a", criterio: "", puntosMax: "5" }] }),
      0,
    )
    expect(resultado.ok).toBe(false)
    if (resultado.ok) return
    expect(resultado.errores["rubrica.0.criterio"]).toBeDefined()
  })
})

describe("PR-1D02: errores de la API", () => {
  it("PR-1D02: un código conocido da su mensaje fijo", () => {
    const error = new ApiError("TAREA_NO_ENCONTRADA", "x", 404)
    expect(mensajeDeErrorTareas(error)).toBe("Esa tarea ya no existe.")
  })

  it("PR-1D02: un código desconocido o un error ajeno da el aviso genérico", () => {
    expect(mensajeDeErrorTareas(new ApiError("OTRO", "x", 500))).toBe(
      "Algo salió mal. Inténtalo de nuevo.",
    )
    expect(mensajeDeErrorTareas(new Error("red"))).toBe("Algo salió mal. Inténtalo de nuevo.")
  })

  it("PR-1D02: un código heredado del prototipo no se toma por conocido", () => {
    expect(mensajeDeErrorTareas(new ApiError("constructor", "x", 400))).toBe(
      "Algo salió mal. Inténtalo de nuevo.",
    )
  })

  it("PR-1D02: un VALIDACION quita el prefijo del campo", () => {
    const error = new ApiError("VALIDACION", "titulo: Escribe un título", 400)
    expect(mensajeDeErrorTareas(error)).toBe("Escribe un título")
    expect(erroresDeLaTareaDeApi(error)).toEqual({ titulo: "Escribe un título" })
  })

  it("PR-1D02: FECHA_LIMITE_INVALIDA va al campo fechaLimite y un 500 a ninguno", () => {
    expect(erroresDeLaTareaDeApi(new ApiError("FECHA_LIMITE_INVALIDA", "x", 400))).toEqual({
      fechaLimite: "Elige una fecha límite futura, dentro del próximo año.",
    })
    expect(erroresDeLaTareaDeApi(new ApiError("ERROR_INTERNO", "x", 500))).toBeNull()
  })
})

const tareaDeEjemplo: TareaDetalle = {
  id: "11111111-1111-4111-8111-111111111111",
  titulo: "Ensayo",
  instrucciones: "Escribe dos páginas",
  fechaLimite: "2026-10-06T20:30:00.000Z",
  puntos: 80,
  aceptaTardias: false,
  categoria: { id: "22222222-2222-4222-8222-222222222222", nombre: "Examen", peso: 40 },
  tema: null,
  rubrica: [{ id: "33333333-3333-4333-8333-333333333333", criterio: "Claridad", puntosMax: 10 }],
  adjuntos: [],
  autor: { id: "44444444-4444-4444-8444-444444444444", nombre: "Ana", administracion: false },
  creadoEn: "2026-10-01T10:00:00.000Z",
  actualizadoEn: "2026-10-01T10:00:00.000Z",
  puedeEditar: true,
  puedeBorrar: true,
}

describe("PR-1D02: estado inicial del formulario", () => {
  it("PR-1D02: una tarea nueva propone 100 puntos y acepta entregas tardías", () => {
    const estado = estadoInicialDelFormulario(null)
    expect(estado.puntos).toBe("100")
    expect(estado.aceptaTardias).toBe(true)
    expect(estado.rubrica).toEqual([])
  })

  it("PR-1D02: una tarea existente carga sus valores y la fecha en hora local", () => {
    const estado = estadoInicialDelFormulario(tareaDeEjemplo)
    expect(estado.puntos).toBe("80")
    expect(estado.categoriaId).toBe("22222222-2222-4222-8222-222222222222")
    expect(estado.temaId).toBe("")
    expect(estado.aceptaTardias).toBe(false)
    expect(estado.rubrica).toHaveLength(1)
    expect(estado.rubrica[0]?.puntosMax).toBe("10")
    expect(fechaLocalAIso(estado.fechaLimite)).toBe("2026-10-06T20:30:00.000Z")
  })

  it("PR-1D02: cada criterio nuevo lleva una llave distinta", () => {
    expect(criterioVacio().llave).not.toBe(criterioVacio().llave)
  })
})

describe("PR-1D02: errores de la rúbrica por fila (T-06)", () => {
  const filas = [
    { llave: "a", criterio: "", puntosMax: "1" },
    { llave: "b", criterio: "x", puntosMax: "2" },
  ]

  it("PR-1D02: pasa la posición de un error de fila a la llave de esa fila", () => {
    expect(
      erroresConLlavesDeFila(
        { titulo: "T", "rubrica.1.criterio": "C", "rubrica.0.puntosMax": "P" },
        filas,
      ),
    ).toEqual({ titulo: "T", "rubrica.b.criterio": "C", "rubrica.a.puntosMax": "P" })
  })

  it("PR-1D02: una posición que no existe en el envío no se pierde: pasa a la rúbrica entera", () => {
    expect(erroresConLlavesDeFila({ "rubrica.7.criterio": "C" }, filas)).toEqual({ rubrica: "C" })
  })

  it("PR-1D02: un VALIDACION por fila da su campo por posición y el mensaje sin el prefijo", () => {
    const error = new ApiError(
      "VALIDACION",
      "rubrica.3.puntosMax: Los puntos máximos no valen",
      400,
    )
    expect(erroresDeLaTareaDeApi(error)).toEqual({
      "rubrica.3.puntosMax": "Los puntos máximos no valen",
    })
    expect(mensajeDeErrorTareas(error)).toBe("Los puntos máximos no valen")
  })
})

describe("PR-1D02: filas quitadas con el envío en vuelo (T-10)", () => {
  const vigentes = [
    { llave: "a", criterio: "", puntosMax: "1" },
    { llave: "c", criterio: "", puntosMax: "3" },
  ]

  it("PR-1D02: el error de una fila que ya no está pasa a la rúbrica entera y el de una que sigue se conserva", () => {
    expect(
      erroresSinFilasQuitadas(
        {
          titulo: "T",
          "rubrica.a.criterio": "A",
          "rubrica.b.criterio": "B",
          "rubrica.b.puntosMax": "B2",
          "rubrica.c.puntosMax": "C",
        },
        vigentes,
      ),
    ).toEqual({
      titulo: "T",
      "rubrica.a.criterio": "A",
      rubrica: "B",
      "rubrica.c.puntosMax": "C",
    })
  })

  it("PR-1D02: sin filas vigentes, todos los errores de fila pasan a la rúbrica; los que no son de fila no cambian", () => {
    expect(
      erroresSinFilasQuitadas({ rubrica: "R", "rubrica.a.criterio": "A", puntos: "P" }, []),
    ).toEqual({ rubrica: "R", puntos: "P" })
  })
})

describe("PR-1D02: errorQueReemplazaLaVista con la tarea en caché (T-13)", () => {
  it.each([
    [new ApiError("SIN_ACCESO_A_LA_CLASE", "x", 403), true],
    [new ApiError("VALIDACION", "claseId: no válido", 400), true],
    [new ApiError("VALIDACION", "tareaId: no válido", 400), true],
    [new ApiError("VALIDACION", "cursor: no válido", 400), false],
    [new ApiError("ACCESO_RESTRINGIDO", "x", 403), false],
    [new ApiError("CAMBIO_DE_CONTRASENA_REQUERIDO", "x", 403), false],
    [new ApiError("SIN_CONEXION", "x", 0), false],
  ])("PR-1D02: errorQueReemplazaLaVista(true, %s) = %s", (error, esperado) => {
    expect(errorQueReemplazaLaVista(true, error)).toBe(esperado)
  })
})

describe("PR-1D02: el aviso de una recarga fallida al editar (T-13)", () => {
  it.each([
    [new TypeError("Failed to fetch"), "revisa tu conexión"],
    [new ApiError("SIN_CONEXION", "x", 0), "revisa tu conexión"],
    [new ApiError("SIN_CONEXION", "x", 503), "revisa tu conexión"],
    [new ApiError("ERROR_INTERNO", "x", 500), "revisa tu conexión"],
    [new ApiError("DEMASIADAS_SOLICITUDES", "x", 429), "inténtalo de nuevo en un momento"],
    [new ApiError("RESPUESTA_INVALIDA", "x", 200), "inténtalo de nuevo en un momento"],
  ])("PR-1D02: %s dice «%s»", (error, fragmento) => {
    expect(avisoDeRecargaFallidaAlEditar(error)).toContain(fragmento)
  })

  it("PR-1D02: solo el aviso de conexión habla de conexión", () => {
    expect(
      avisoDeRecargaFallidaAlEditar(new ApiError("DEMASIADAS_SOLICITUDES", "x", 429)),
    ).not.toContain("conexión")
  })
})

describe("PR-1D02: la clave de foco de las vistas de la tarea (T-15)", () => {
  const momento = {
    status: "error" as const,
    dataUpdatedAt: 100,
    errorUpdatedAt: 200,
    errorUpdateCount: 1,
  }

  it("PR-1D02: cambia con un fallo nuevo aunque el estado siga en error y la fecha sea la misma", () => {
    expect(claveDeFocoDeLaTarea("t", { ...momento, errorUpdateCount: 2 })).not.toBe(
      claveDeFocoDeLaTarea("t", momento),
    )
  })

  it("PR-1D02: cambia con la tarea, con una respuesta nueva y con la fecha del fallo; sin cambios es la misma", () => {
    const base = claveDeFocoDeLaTarea("t", momento)
    expect(claveDeFocoDeLaTarea("t", { ...momento })).toBe(base)
    expect(claveDeFocoDeLaTarea("otra", momento)).not.toBe(base)
    expect(claveDeFocoDeLaTarea("t", { ...momento, dataUpdatedAt: 101 })).not.toBe(base)
    expect(claveDeFocoDeLaTarea("t", { ...momento, errorUpdatedAt: 201 })).not.toBe(base)
    expect(claveDeFocoDeLaTarea("t", { ...momento, status: "success" })).not.toBe(base)
  })
})
