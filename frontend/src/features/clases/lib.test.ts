import { varianteDeClase as varianteDeClaseDeLib } from "@/lib/variante-de-clase"
import { ApiError } from "@/services/apiClient"
import { describe, expect, it } from "vitest"

import { CAPACIDADES_POR_PERSPECTIVA } from "./data"
import {
  avisoDeFalloAlSubir,
  crearLimiteDeConcurrencia,
  errorDeArchivoElegido,
  etiquetaDeMaestros,
  focoPerdido,
  indiceDeSeccionActiva,
  mensajeDeErrorClases,
  mensajeDeErrorDeLista,
  perspectivaDeRuta,
  siguientePasoInicio,
  terminoDeBusquedaMuyLargo,
  terminoDeBusquedaValido,
  textoConteoAlumnos,
  textoDeMaestros,
  tiempoFrescoDelMuro,
  tipoDeArchivo,
  titularInicio,
  unirNombres,
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

describe("varianteDeClase reexportada", () => {
  // CLASES-02d (A-6): features/clases/lib.ts reexporta la de lib/variante-de-clase.ts.
  it("PR-2D06: la de features/clases/lib es la misma función que la de lib/", () => {
    expect(varianteDeClase).toBe(varianteDeClaseDeLib)
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
    expect(siguientePasoInicio("maestro", 0)).toMatch(/La administración te asigna tus clases/)
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
    // TAREAS-01b (C-5): publicacionSchema gana la clave obligatoria tarea, null en anuncios y materiales.
    tarea: null,
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

// CLASES-02c (§D-2C1)
describe("perspectivaDeRuta y CAPACIDADES_POR_PERSPECTIVA", () => {
  it("PR-2C01: las tres perspectivas salen de su prefijo exacto", () => {
    expect(perspectivaDeRuta("/estudiante")).toBe("estudiante")
    expect(perspectivaDeRuta("/estudiante/clases/x")).toBe("estudiante")
    expect(perspectivaDeRuta("/maestro")).toBe("maestro")
    expect(perspectivaDeRuta("/maestro/clases/x/alumnos")).toBe("maestro")
    expect(perspectivaDeRuta("/admin")).toBe("admin")
    expect(perspectivaDeRuta("/admin/clases/x/maestros")).toBe("admin")
  })

  it("PR-2C01: un prefijo parecido o cualquier otra ruta da «estudiante», la perspectiva que menos muestra", () => {
    for (const ruta of [
      "/maestros",
      "/administrador",
      "/admin-x",
      "/maestro-x/clases",
      "/",
      "",
      "/login",
    ]) {
      expect(perspectivaDeRuta(ruta), ruta).toBe("estudiante")
    }
  })

  // CLASES-02d, O-06 (revisión de 02c): el router no distingue mayúsculas, así que la perspectiva
  // tampoco (antes "/Admin" daba «estudiante» aunque el router mostrara la vista del administrador).
  it("PR-2D07: la perspectiva no distingue mayúsculas, como el router, y un prefijo parecido sigue sin valer", () => {
    expect(perspectivaDeRuta("/Admin")).toBe("admin")
    expect(perspectivaDeRuta("/ADMIN/Clases/NUEVA")).toBe("admin")
    expect(perspectivaDeRuta("/Maestro/clases/x")).toBe("maestro")
    expect(perspectivaDeRuta("/ESTUDIANTE")).toBe("estudiante")
    expect(perspectivaDeRuta("/Maestros")).toBe("estudiante")
    expect(perspectivaDeRuta("/ADMINISTRADOR")).toBe("estudiante")
  })

  // TAREAS-01e (I-2 de la ronda 0, A-3; C-11, §D-11): "Trabajo de clase" es la segunda sección de las
  // tres perspectivas. Sigue protegiendo la tabla celda por celda.
  it("PR-2C01: la tabla de capacidades de §D-2C1, celda por celda", () => {
    const { estudiante, maestro, admin } = CAPACIDADES_POR_PERSPECTIVA
    expect([estudiante.base, maestro.base, admin.base]).toEqual([
      "/estudiante/clases",
      "/maestro/clases",
      "/admin/clases",
    ])
    expect([estudiante.volverDestino, maestro.volverDestino, admin.volverDestino]).toEqual([
      "/estudiante",
      "/maestro",
      "/admin/clases",
    ])
    expect([estudiante.volverTexto, maestro.volverTexto, admin.volverTexto]).toEqual([
      "Volver a mis clases",
      "Volver a mis clases",
      "Volver a la lista de clases",
    ])
    expect(estudiante.secciones.map((s) => s.texto)).toEqual([
      "Muro",
      "Trabajo de clase",
      "Personas",
      "Calificaciones",
    ])
    expect(maestro.secciones.map((s) => s.texto)).toEqual([
      "Muro",
      "Trabajo de clase",
      "Alumnos",
      "Calificaciones",
    ])
    expect(admin.secciones.map((s) => s.texto)).toEqual([
      "Muro",
      "Trabajo de clase",
      "Alumnos",
      "Maestros",
      "Calificaciones",
    ])
    expect([estudiante.verCodigo, maestro.verCodigo, admin.verCodigo]).toEqual([false, true, true])
    expect([estudiante.editar, maestro.editar, admin.editar]).toEqual([false, false, true])
    expect([
      estudiante.formularioPublicacion,
      maestro.formularioPublicacion,
      admin.formularioPublicacion,
    ]).toEqual([false, true, true])
    expect([
      estudiante.formularioComentario,
      maestro.formularioComentario,
      admin.formularioComentario,
    ]).toEqual([true, true, false])
  })

  // CLASES-02d, M-12: hermano de O-06. El router no distingue mayúsculas; el indicador tampoco.
  // TAREAS-01e (I-2, A-3; C-11): con "Trabajo de clase" segunda, Alumnos pasa a 2 y Maestros a 3.
  it("M-12: indiceDeSeccionActiva no distingue mayúsculas en la ruta ni en el id, y sigue sin activar nada en /editar", () => {
    const secciones = CAPACIDADES_POR_PERSPECTIVA.admin.secciones
    const base = "/admin/clases/2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
    const mayusculas = base.toUpperCase()
    expect(indiceDeSeccionActiva(mayusculas, base, secciones)).toBe(0)
    expect(indiceDeSeccionActiva(`${mayusculas}/ALUMNOS`, base, secciones)).toBe(2)
    expect(indiceDeSeccionActiva(`${mayusculas}/Maestros/`, base, secciones)).toBe(3)
    expect(indiceDeSeccionActiva(`${base}/ALUMNOS`, mayusculas, secciones)).toBe(2)
    expect(indiceDeSeccionActiva(`${mayusculas}/EDITAR`, base, secciones)).toBe(-1)
    expect(indiceDeSeccionActiva(`${mayusculas}X`, base, secciones)).toBe(-1)
  })

  // TAREAS-01e (I-2, A-3; C-11): con "Trabajo de clase" segunda, Alumnos pasa a 2 y Maestros a 3.
  it("indiceDeSeccionActiva: el muro solo en la base exacta, el resto también en sus subrutas, y ninguna en /editar", () => {
    const secciones = CAPACIDADES_POR_PERSPECTIVA.admin.secciones
    const base = "/admin/clases/abc"
    expect(indiceDeSeccionActiva(base, base, secciones)).toBe(0)
    expect(indiceDeSeccionActiva(`${base}/`, base, secciones)).toBe(0)
    expect(indiceDeSeccionActiva(`${base}/alumnos`, base, secciones)).toBe(2)
    expect(indiceDeSeccionActiva(`${base}/maestros`, base, secciones)).toBe(3)
    expect(indiceDeSeccionActiva(`${base}/editar`, base, secciones)).toBe(-1)
    expect(indiceDeSeccionActiva(`${base}/alumnosx`, base, secciones)).toBe(-1)
  })
})

describe("textoDeMaestros", () => {
  it("PR-2C02: uno y dos nombres", () => {
    expect(textoDeMaestros(["Luis Pérez"])).toBe("Maestro: Luis Pérez")
    expect(textoDeMaestros(["Dra. Márquez", "Mtro. Ruiz"])).toBe(
      "Maestros: Dra. Márquez y Mtro. Ruiz",
    )
    expect(unirNombres(["Dra. Márquez", "Mtro. Ruiz"])).toBe("Dra. Márquez y Mtro. Ruiz")
  })

  it("PR-2C02: nombres largos sin espacios se conservan enteros (el corte lo hace el estilo)", () => {
    const largo = "x".repeat(200)
    expect(textoDeMaestros([largo, largo])).toBe(`Maestros: ${largo} y ${largo}`)
  })
})

describe("mensajes de los errores de maestros y de autoría (§D-2C2)", () => {
  it("muestran el mensaje del servidor", () => {
    for (const codigo of [
      "TOPE_DE_MAESTROS",
      "CLASE_SIN_MAESTRO",
      "MAESTRO_NO_ENCONTRADO",
      "BORRADO_NO_PERMITIDO",
      // CLASES-02d, O-07 (revisión de 02c): el 503 del servidor ocupado también ya viene en español.
      "SERVICIO_OCUPADO",
    ]) {
      expect(mensajeDeErrorClases(new ApiError(codigo, "Mensaje del servidor", 409)), codigo).toBe(
        "Mensaje del servidor",
      )
    }
  })
})

// CLASES-02d (§D-2D2)
describe("etiquetaDeMaestros", () => {
  it("PR-2D04: «Maestro» con uno y «Maestros» con dos", () => {
    expect(etiquetaDeMaestros(1)).toBe("Maestro")
    expect(etiquetaDeMaestros(2)).toBe("Maestros")
  })
})

// TAREAS-01e (§D-11, Enmienda 5 y corrección M-01; PR-1E06): el limitador FIFO de las lecturas de
// "Trabajo de clase". Promesas controladas (sin temporizadores): cada tarea guarda su resolvedor y
// cada caso las asienta todas antes de terminar.
describe("crearLimiteDeConcurrencia (PR-1E06)", () => {
  interface Controlada {
    resolver: (valor: string) => void
    rechazar: (error: unknown) => void
  }

  // Vacía la cola de microtareas: el lugar se libera en el `finally` de la tarea, unas microtareas
  // después de asentarse su promesa.
  const vaciarMicrotareas = async () => {
    for (let vuelta = 0; vuelta < 10; vuelta += 1) await Promise.resolve()
  }

  const prepararTareas = (cuantas: number) => {
    const arrancadas: number[] = []
    const controladas = new Map<number, Controlada>()
    const tareas = Array.from(
      { length: cuantas },
      (_, indice) => () =>
        new Promise<string>((resolver, rechazar) => {
          arrancadas.push(indice)
          controladas.set(indice, { resolver, rechazar })
        }),
    )
    const controlDe = (indice: number): Controlada => {
      const control = controladas.get(indice)
      if (control === undefined) throw new Error(`la tarea ${String(indice)} no arrancó`)
      return control
    }
    return { arrancadas, tareas, controlDe }
  }

  it("PR-1E06 · con un tope de 6 y 31 tareas, solo 6 corren a la vez y las demás esperan en orden", async () => {
    const limite = crearLimiteDeConcurrencia(6)
    const { arrancadas, tareas, controlDe } = prepararTareas(31)
    const resultados = tareas.map((tarea) => limite.ejecutar(tarea))
    await vaciarMicrotareas()
    expect(arrancadas).toEqual([0, 1, 2, 3, 4, 5])

    for (let terminada = 0; terminada < 31; terminada += 1) {
      controlDe(terminada).resolver(`tarea ${String(terminada)}`)
      await vaciarMicrotareas()
      const esperadas = Math.min(31, terminada + 1 + 6)
      expect(arrancadas).toEqual(Array.from({ length: esperadas }, (_, i) => i))
      expect(arrancadas.length - (terminada + 1)).toBeLessThanOrEqual(6)
    }
    await expect(Promise.all(resultados)).resolves.toEqual(
      Array.from({ length: 31 }, (_, i) => `tarea ${String(i)}`),
    )
  })

  it("PR-1E06 · al terminar una tarea, con éxito o con error, entra la siguiente de la cola", async () => {
    const limite = crearLimiteDeConcurrencia(2)
    const { arrancadas, tareas, controlDe } = prepararTareas(4)
    const [primera, segunda, tercera, cuarta] = tareas.map((tarea) => limite.ejecutar(tarea))
    await vaciarMicrotareas()
    expect(arrancadas).toEqual([0, 1])

    const fallo = new Error("falló la lectura")
    controlDe(0).rechazar(fallo)
    await expect(primera).rejects.toBe(fallo)
    await vaciarMicrotareas()
    expect(arrancadas).toEqual([0, 1, 2])

    controlDe(1).resolver("bien")
    await expect(segunda).resolves.toBe("bien")
    await vaciarMicrotareas()
    expect(arrancadas).toEqual([0, 1, 2, 3])

    controlDe(2).resolver("tercera")
    controlDe(3).resolver("cuarta")
    await expect(Promise.all([tercera, cuarta])).resolves.toEqual(["tercera", "cuarta"])
  })

  it("PR-1E06 · una tarea en espera con su signal abortado sale de la cola sin correr y no ocupa lugar", async () => {
    const limite = crearLimiteDeConcurrencia(1)
    const { arrancadas, tareas, controlDe } = prepararTareas(3)
    const controlador = new AbortController()
    const [primera, segunda, tercera] = [
      limite.ejecutar(tareas[0] ?? (() => Promise.resolve(""))),
      limite.ejecutar(tareas[1] ?? (() => Promise.resolve("")), controlador.signal),
      limite.ejecutar(tareas[2] ?? (() => Promise.resolve(""))),
    ]
    await vaciarMicrotareas()
    expect(arrancadas).toEqual([0])

    controlador.abort()
    await expect(segunda).rejects.toMatchObject({ name: "AbortError" })

    controlDe(0).resolver("primera")
    await expect(primera).resolves.toBe("primera")
    await vaciarMicrotareas()
    // La segunda nunca corrió: la tercera ocupa el único lugar.
    expect(arrancadas).toEqual([0, 2])

    controlDe(2).resolver("tercera")
    await expect(tercera).resolves.toBe("tercera")
    expect(arrancadas).toEqual([0, 2])
  })

  it("PR-1E06 · un signal ya abortado al llamar a ejecutar rechaza enseguida sin correr la tarea ni ocupar lugar", async () => {
    const limite = crearLimiteDeConcurrencia(1)
    const { arrancadas, tareas, controlDe } = prepararTareas(2)
    const controlador = new AbortController()
    controlador.abort()

    await expect(
      limite.ejecutar(tareas[0] ?? (() => Promise.resolve("")), controlador.signal),
    ).rejects.toMatchObject({ name: "AbortError" })
    expect(arrancadas).toEqual([])

    // El único lugar sigue libre: la siguiente corre enseguida.
    const siguiente = limite.ejecutar(tareas[1] ?? (() => Promise.resolve("")))
    await vaciarMicrotareas()
    expect(arrancadas).toEqual([1])
    controlDe(1).resolver("siguiente")
    await expect(siguiente).resolves.toBe("siguiente")
  })
})
