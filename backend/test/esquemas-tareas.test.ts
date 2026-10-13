import {
  claveDeNombre,
  crearPublicacionSchema,
  crearTareaSchema,
  editarTareaSchema,
  moverElementoSchema,
  nombreCategoriaSchema,
  nombreTemaSchema,
  ordenTemasSchema,
  pesoCategoriaSchema,
  publicacionDeMoverParamSchema,
  publicacionSchema,
  reemplazarCategoriasSchema,
  tareaIdParamSchema,
  temaIdParamSchema,
  textoDeUnaLineaSchema,
  trabajoQuerySchema,
} from "@campus/shared"
import { describe, expect, it } from "vitest"

// TAREAS-01a (PR-1A03): esquemas de temas, categorías y la rama `material` de crearPublicacionSchema.

const A = "aaaaaaaa-1c1f-4b8e-9a1e-0f2a3b4c5d6e"
const B = "bbbbbbbb-1c1f-4b8e-9a1e-0f2a3b4c5d6e"

const primerMensaje = (resultado: {
  success: boolean
  error?: { issues: { message: string }[] }
}) => resultado.error?.issues[0]?.message

describe("textoDeUnaLineaSchema", () => {
  const esquema = textoDeUnaLineaSchema(10, "Escribe algo")

  it("PR-1A03: un texto de una línea con contenido pasa", () => {
    expect(esquema.safeParse("Hola mundo").success).toBe(true)
  })

  it("PR-1A03: rechaza \\r, \\n, U+2028 y U+2029", () => {
    for (const texto of ["a\nb", "a\rb", "a\r\nb", "a b", "a b", "a\n"]) {
      const resultado = esquema.safeParse(texto)
      expect(resultado.success, JSON.stringify(texto)).toBe(false)
    }
  })

  it("PR-1A03: rechaza un texto de solo invisibles o espacios, con el mensaje del campo", () => {
    for (const texto of ["", "   ", "\u200B\u200B", "⠀", " "]) {
      const resultado = esquema.safeParse(texto)
      expect(resultado.success, JSON.stringify(texto)).toBe(false)
      expect(primerMensaje(resultado), JSON.stringify(texto)).toBe("Escribe algo")
    }
  })

  it("PR-1A03: rechaza los inversores de dirección y los caracteres de control", () => {
    for (const texto of ["‮abc", "abc⁦", "a\u0000b", "a\u0007b"]) {
      expect(esquema.safeParse(texto).success, JSON.stringify(texto)).toBe(false)
    }
  })

  it("PR-1A03: respeta el máximo (10 pasa, 11 rechaza)", () => {
    expect(esquema.safeParse("a".repeat(10)).success).toBe(true)
    expect(esquema.safeParse("a".repeat(11)).success).toBe(false)
  })

  it("PR-1A03: el máximo cuenta puntos de código: 10 emojis de 2 unidades de UTF-16 pasan y 11 rechazan", () => {
    expect(esquema.safeParse("\u{1F44D}".repeat(10)).success).toBe(true)
    expect(esquema.safeParse("\u{1F44D}".repeat(11)).success).toBe(false)
  })

  it("PR-1A03: un valor que no es texto responde con el mensaje del campo", () => {
    const resultado = esquema.safeParse(5)
    expect(resultado.success).toBe(false)
    expect(primerMensaje(resultado)).toBe("Escribe algo")
  })
})

describe("nombreTemaSchema y nombreCategoriaSchema", () => {
  it("PR-1A03: el nombre de un tema admite 80 y rechaza 81, con su mensaje cuando falta", () => {
    expect(nombreTemaSchema.safeParse("t".repeat(80)).success).toBe(true)
    expect(nombreTemaSchema.safeParse("t".repeat(81)).success).toBe(false)
    expect(primerMensaje(nombreTemaSchema.safeParse(undefined))).toBe("Escribe el nombre del tema")
  })

  it("PR-1A03: el nombre de una categoría admite 60 y rechaza 61, con su mensaje cuando falta", () => {
    expect(nombreCategoriaSchema.safeParse("c".repeat(60)).success).toBe(true)
    expect(nombreCategoriaSchema.safeParse("c".repeat(61)).success).toBe(false)
    expect(primerMensaje(nombreCategoriaSchema.safeParse(undefined))).toBe(
      "Escribe el nombre de la categoría",
    )
  })

  it("PR-1A03: ninguno admite un salto de línea", () => {
    expect(nombreTemaSchema.safeParse("Uno\nDos").success).toBe(false)
    expect(nombreCategoriaSchema.safeParse("Uno Dos").success).toBe(false)
  })
})

describe("pesoCategoriaSchema", () => {
  it("PR-1A03: acepta enteros de 1 a 100", () => {
    for (const peso of [1, 50, 100]) {
      expect(pesoCategoriaSchema.safeParse(peso).success, String(peso)).toBe(true)
    }
  })

  it("PR-1A03: rechaza 0, 101, decimales, texto, NaN e infinito, con el mismo mensaje", () => {
    for (const peso of [0, 101, -1, 1.5, "40", Number.NaN, Number.POSITIVE_INFINITY, null]) {
      const resultado = pesoCategoriaSchema.safeParse(peso)
      expect(resultado.success, String(peso)).toBe(false)
      expect(primerMensaje(resultado), String(peso)).toBe(
        "El peso debe ser un número entero de 1 a 100",
      )
    }
  })
})

describe("reemplazarCategoriasSchema", () => {
  const dos = [
    { nombre: "Tareas", peso: 60 },
    { nombre: "Examen", peso: 40 },
  ]

  it("PR-1A03: pesos que suman 100 pasan", () => {
    expect(reemplazarCategoriasSchema.safeParse({ categorias: dos }).success).toBe(true)
  })

  it("PR-1A03: una lista vacía pasa (la clase queda sin categorías)", () => {
    expect(reemplazarCategoriasSchema.safeParse({ categorias: [] }).success).toBe(true)
  })

  it("PR-1A03: una suma distinta de 100 rechaza con el mensaje sobre el campo categorias", () => {
    for (const pesos of [[60, 39], [60, 41], [50]]) {
      const categorias = pesos.map((peso, i) => ({ nombre: `C${i}`, peso }))
      const resultado = reemplazarCategoriasSchema.safeParse({ categorias })
      expect(resultado.success, pesos.join("+")).toBe(false)
      expect(primerMensaje(resultado)).toBe("Los pesos deben sumar 100 %")
      expect(resultado.error?.issues[0]?.path).toEqual(["categorias"])
    }
  })

  it("PR-1A03: hasta 10 categorías pasan y 11 rechazan", () => {
    const hacer = (cantidad: number) =>
      Array.from({ length: cantidad }, (_, i) => ({ nombre: `C${i}`, peso: 10 }))
    expect(reemplazarCategoriasSchema.safeParse({ categorias: hacer(10) }).success).toBe(true)
    const once = Array.from({ length: 11 }, (_, i) => ({ nombre: `C${i}`, peso: i === 0 ? 10 : 9 }))
    const resultado = reemplazarCategoriasSchema.safeParse({ categorias: once })
    expect(resultado.success).toBe(false)
    expect(primerMensaje(resultado)).toBe("Una clase puede tener hasta 10 categorías")
  })

  it("PR-1A03: ids repetidos (también en otra capitalización) y nombres repetidos rechazan", () => {
    const idsRepetidos = reemplazarCategoriasSchema.safeParse({
      categorias: [
        { id: A, nombre: "Uno", peso: 50 },
        { id: A.toUpperCase(), nombre: "Dos", peso: 50 },
      ],
    })
    expect(idsRepetidos.success).toBe(false)
    expect(primerMensaje(idsRepetidos)).toBe("No repitas una categoría")

    const nombresRepetidos = reemplazarCategoriasSchema.safeParse({
      categorias: [
        { nombre: "Evaluación", peso: 50 },
        { nombre: "  EVALUACION ", peso: 50 },
      ],
    })
    expect(nombresRepetidos.success).toBe(false)
    expect(primerMensaje(nombresRepetidos)).toBe("No repitas el nombre de una categoría")
  })

  it("PR-1A03: los ids salen en minúsculas y una categoría nueva no lleva id", () => {
    const resultado = reemplazarCategoriasSchema.safeParse({
      categorias: [
        { id: A.toUpperCase(), nombre: "Uno", peso: 50 },
        { nombre: "Dos", peso: 50 },
      ],
    })
    expect(resultado.success).toBe(true)
    expect(resultado.data?.categorias).toEqual([
      { id: A, nombre: "Uno", peso: 50 },
      { nombre: "Dos", peso: 50 },
    ])
  })

  it("PR-1A03: un peso inválido o un cuerpo sin la lista rechazan", () => {
    expect(
      reemplazarCategoriasSchema.safeParse({ categorias: [{ nombre: "Uno", peso: 100.5 }] })
        .success,
    ).toBe(false)
    expect(reemplazarCategoriasSchema.safeParse({}).success).toBe(false)
    expect(reemplazarCategoriasSchema.safeParse({ categorias: "x" }).success).toBe(false)
  })
})

describe("ordenTemasSchema", () => {
  const ids = (cantidad: number) =>
    Array.from(
      { length: cantidad },
      (_, i) => `${i.toString(16).padStart(8, "0")}-1c1f-4b8e-9a1e-0f2a3b4c5d6e`,
    )

  it("PR-1A03: de 1 a 30 ids pasan; 0 y 31 rechazan", () => {
    expect(ordenTemasSchema.safeParse({ temaIds: ids(1) }).success).toBe(true)
    expect(ordenTemasSchema.safeParse({ temaIds: ids(30) }).success).toBe(true)
    expect(ordenTemasSchema.safeParse({ temaIds: ids(0) }).success).toBe(false)
    expect(ordenTemasSchema.safeParse({ temaIds: ids(31) }).success).toBe(false)
  })

  it("PR-1A03: un id repetido en mayúsculas y minúsculas rechaza", () => {
    const resultado = ordenTemasSchema.safeParse({ temaIds: [A, B, A.toUpperCase()] })
    expect(resultado.success).toBe(false)
    expect(primerMensaje(resultado)).toBe("No repitas un tema")
  })

  it("PR-1A03: los ids salen en minúsculas y uno que no es uuid rechaza", () => {
    const resultado = ordenTemasSchema.safeParse({ temaIds: [B.toUpperCase(), A] })
    expect(resultado.data?.temaIds).toEqual([B, A])
    expect(ordenTemasSchema.safeParse({ temaIds: ["orden"] }).success).toBe(false)
    expect(ordenTemasSchema.safeParse({ temaIds: "x" }).success).toBe(false)
  })
})

describe("moverElementoSchema", () => {
  it("PR-1A03: la clave ausente rechaza; null y un uuid pasan; otro texto rechaza", () => {
    expect(moverElementoSchema.safeParse({}).success).toBe(false)
    expect(moverElementoSchema.safeParse({ temaId: null }).success).toBe(true)
    expect(moverElementoSchema.safeParse({ temaId: A }).success).toBe(true)
    expect(moverElementoSchema.safeParse({ temaId: "sin-tema" }).success).toBe(false)
    expect(moverElementoSchema.safeParse({ temaId: "" }).success).toBe(false)
  })
})

describe("crearPublicacionSchema, rama material", () => {
  const base = { tipo: "material", titulo: "Guía", archivoIds: [] }

  it("PR-1A03: sin temaId, la salida no tiene la clave (Enmienda 1, M-01)", () => {
    const resultado = crearPublicacionSchema.safeParse(base)
    expect(resultado.success).toBe(true)
    expect(resultado.data).toBeDefined()
    expect(Object.hasOwn(resultado.data ?? {}, "temaId")).toBe(false)
  })

  it("PR-1A03: con temaId uuid o null, la salida lo conserva", () => {
    const conTema = crearPublicacionSchema.safeParse({ ...base, temaId: A })
    expect(conTema.data).toMatchObject({ tipo: "material", temaId: A })
    const sinTema = crearPublicacionSchema.safeParse({ ...base, temaId: null })
    expect(sinTema.data).toMatchObject({ tipo: "material", temaId: null })
  })

  it("PR-1A03: un temaId que no es uuid rechaza", () => {
    expect(crearPublicacionSchema.safeParse({ ...base, temaId: "no-es-uuid" }).success).toBe(false)
    expect(crearPublicacionSchema.safeParse({ ...base, temaId: 5 }).success).toBe(false)
  })

  it("PR-1A03: un anuncio con temaId descarta la clave como cualquier campo extra", () => {
    const resultado = crearPublicacionSchema.safeParse({
      tipo: "anuncio",
      texto: "Aviso",
      archivoIds: [],
      temaId: A,
    })
    expect(resultado.success).toBe(true)
    expect(Object.hasOwn(resultado.data ?? {}, "temaId")).toBe(false)
  })
})

describe("ids de la ruta y clave de nombre (ronda 1)", () => {
  it("PR-1A03: los ids de la ruta salen en minúsculas y uno malformado rechaza", () => {
    expect(temaIdParamSchema.safeParse({ temaId: A.toUpperCase() }).data).toEqual({ temaId: A })
    expect(
      publicacionDeMoverParamSchema.safeParse({ publicacionId: B.toUpperCase() }).data,
    ).toEqual({ publicacionId: B })
    expect(temaIdParamSchema.safeParse({ temaId: "orden" }).success).toBe(false)
    expect(moverElementoSchema.safeParse({ temaId: A.toUpperCase() }).data).toEqual({ temaId: A })
  })

  it("PR-1A03: claveDeNombre iguala mayúsculas, acentos, espacios, invisibles y formas de compatibilidad, sin cambiar el nombre", () => {
    expect(claveDeNombre("  \uFF25X\u00C1menes\u200B  1 ")).toBe(claveDeNombre("examenes 1"))
    expect(claveDeNombre("\uFB01nal")).toBe(claveDeNombre("final"))
    expect(claveDeNombre("Unidad 1")).not.toBe(claveDeNombre("Unidad 2"))
  })
})

describe("claveDeNombre con lo que se ve vacío (ronda 2, T-05)", () => {
  it("PR-1A03: quita U+2800 y U+1D159, y un nombre solo de eso queda con clave vacía pero el esquema lo rechaza", () => {
    const braille = String.fromCodePoint(0x2800)
    const nota = String.fromCodePoint(0x1d159)
    expect(claveDeNombre(`Unidad${braille} 1${nota}`)).toBe(claveDeNombre("Unidad 1"))
    expect(claveDeNombre(`${braille}${nota}`)).toBe("")
    expect(nombreTemaSchema.safeParse(`${braille}${nota}`).success).toBe(false)
    expect(nombreCategoriaSchema.safeParse(`${braille}${nota}`).success).toBe(false)
  })

  it("PR-1A03: el relleno Hangul y los espacios Unicode: el relleno se quita y los espacios se colapsan", () => {
    const relleno = String.fromCodePoint(0x3164)
    expect(claveDeNombre(`Unidad${relleno}1`)).toBe("unidad1")
    for (const espacio of [0xa0, 0x3000, 0x09, 0x2003, 0x2009]) {
      expect(claveDeNombre(`Unidad${String.fromCodePoint(espacio)}1`)).toBe("unidad 1")
    }
  })
})

// TAREAS-01b (PR-1B06): esquemas de las tareas, "Trabajo de clase" y la clave `tarea` del muro.
describe("crearTareaSchema (PR-1B06)", () => {
  const SALTO = String.fromCharCode(10)
  const INVISIBLE = String.fromCodePoint(0x200b)
  const base = {
    titulo: "Ensayo",
    fechaLimite: "2030-05-01T10:00:00Z",
    puntos: 100,
  }
  const rechaza = (cambios: Record<string, unknown>) =>
    crearTareaSchema.safeParse({ ...base, ...cambios })

  it("PR-1B06: un cuerpo mínimo pasa y aplica los valores por defecto", () => {
    const resultado = crearTareaSchema.safeParse(base)
    expect(resultado.success).toBe(true)
    expect(resultado.data).toMatchObject({
      aceptaTardias: true,
      categoriaId: null,
      temaId: null,
      rubrica: [],
      archivoIds: [],
    })
    expect(resultado.data?.instrucciones).toBeUndefined()
  })

  it("PR-1B06: el título debe ser de una sola línea, con contenido y de hasta 200 caracteres", () => {
    expect(rechaza({ titulo: `Uno${SALTO}Dos` }).success).toBe(false)
    expect(rechaza({ titulo: "" }).success).toBe(false)
    expect(rechaza({ titulo: INVISIBLE }).success).toBe(false)
    expect(rechaza({ titulo: "t".repeat(200) }).success).toBe(true)
    expect(rechaza({ titulo: "t".repeat(201) }).success).toBe(false)
    expect(primerMensaje(rechaza({ titulo: undefined }))).toBe("Escribe el título de la tarea")
  })

  it("PR-1B06: las instrucciones admiten 10 000 caracteres y rechazan 10 001", () => {
    expect(rechaza({ instrucciones: "i".repeat(10_000) }).success).toBe(true)
    expect(rechaza({ instrucciones: "i".repeat(10_001) }).success).toBe(false)
    expect(rechaza({ instrucciones: `Línea 1${SALTO}Línea 2` }).success).toBe(true)
  })

  it("PR-1B06: la fecha con Z y con desfase pasa; sin zona o de otro tipo rechaza", () => {
    expect(rechaza({ fechaLimite: "2030-05-01T10:00:00Z" }).success).toBe(true)
    expect(rechaza({ fechaLimite: "2030-05-01T10:00:00-06:00" }).success).toBe(true)
    expect(rechaza({ fechaLimite: "2030-05-01T10:00:00.123Z" }).success).toBe(true)
    for (const fechaLimite of [
      "2030-05-01T10:00:00",
      "2030-05-01",
      "mañana",
      1893492000000,
      null,
    ]) {
      const resultado = rechaza({ fechaLimite })
      expect(resultado.success, String(fechaLimite)).toBe(false)
      expect(primerMensaje(resultado)).toBe("Elige la fecha límite")
    }
  })

  it("PR-1B06: los puntos son enteros de 1 a 1000 y no se coaccionan desde texto", () => {
    for (const puntos of [1, 100, 1000])
      expect(rechaza({ puntos }).success, String(puntos)).toBe(true)
    for (const puntos of [0, 1001, -1, 1.5, "100", null, Number.NaN]) {
      const resultado = rechaza({ puntos })
      expect(resultado.success, String(puntos)).toBe(false)
      expect(primerMensaje(resultado)).toBe("Los puntos deben ser un número entero de 1 a 1000")
    }
  })

  it("PR-1B06: aceptaTardias ausente es true; false se conserva; otro tipo rechaza", () => {
    expect(rechaza({}).data?.aceptaTardias).toBe(true)
    expect(rechaza({ aceptaTardias: false }).data?.aceptaTardias).toBe(false)
    expect(rechaza({ aceptaTardias: "no" }).success).toBe(false)
  })

  it("PR-1B06: la rúbrica admite 20 criterios y rechaza 21; el criterio vacío o de invisibles y los puntos inválidos rechazan", () => {
    const criterios = (n: number) =>
      Array.from({ length: n }, (_, k) => ({ criterio: `C${String(k)}`, puntosMax: 5 }))
    expect(rechaza({ rubrica: criterios(20) }).success).toBe(true)
    expect(rechaza({ rubrica: criterios(21) }).success).toBe(false)
    expect(rechaza({ rubrica: [{ criterio: "", puntosMax: 5 }] }).success).toBe(false)
    expect(rechaza({ rubrica: [{ criterio: INVISIBLE, puntosMax: 5 }] }).success).toBe(false)
    expect(rechaza({ rubrica: [{ criterio: "c".repeat(300), puntosMax: 5 }] }).success).toBe(true)
    expect(rechaza({ rubrica: [{ criterio: "c".repeat(301), puntosMax: 5 }] }).success).toBe(false)
    for (const puntosMax of [0, 1001, 2.5, "5", null]) {
      const resultado = rechaza({ rubrica: [{ criterio: "Claridad", puntosMax }] })
      expect(resultado.success, String(puntosMax)).toBe(false)
      expect(primerMensaje(resultado)).toBe(
        "Los puntos máximos deben ser un número entero de 1 a 1000",
      )
    }
    expect(rechaza({ rubrica: { criterio: "x" } }).success).toBe(false)
  })

  it("PR-1B06: archivoIds admite 5 y rechaza 6 o repetidos, y los pasa a minúsculas", () => {
    const ids = (n: number) =>
      Array.from(
        { length: n },
        (_, k) => `${String(k).padStart(8, "0")}-1c1f-4b8e-9a1e-0f2a3b4c5d6e`,
      )
    expect(rechaza({ archivoIds: ids(5) }).success).toBe(true)
    expect(rechaza({ archivoIds: ids(6) }).success).toBe(false)
    expect(rechaza({ archivoIds: [A, A] }).success).toBe(false)
    expect(rechaza({ archivoIds: ["no-es-uuid"] }).success).toBe(false)
    expect(rechaza({ archivoIds: [A.toUpperCase()] }).data?.archivoIds).toEqual([A])
  })

  it("PR-1B06: categoriaId y temaId son uuid o null, y se pasan a minúsculas", () => {
    const resultado = rechaza({ categoriaId: A.toUpperCase(), temaId: B })
    expect(resultado.data).toMatchObject({ categoriaId: A, temaId: B })
    expect(rechaza({ categoriaId: null, temaId: null }).success).toBe(true)
    expect(rechaza({ categoriaId: "" }).success).toBe(false)
    expect(rechaza({ temaId: "sin-tema" }).success).toBe(false)
  })

  it("PR-1B06: editarTareaSchema tiene los campos de crearTareaSchema con las mismas reglas más version obligatoria, y tareaIdParamSchema pasa el id a minúsculas", () => {
    // ENTREGAS-01a (lista cerrada (iii), Enmienda 3): editarTareaSchema = crearTareaSchema.extend({ version }).
    const llavesDeCrear = Object.keys(crearTareaSchema.shape)
    expect(Object.keys(editarTareaSchema.shape).sort()).toEqual(
      [...llavesDeCrear, "version"].sort(),
    )
    const camposDeCrear: Record<string, unknown> = crearTareaSchema.shape
    const camposDeEditar: Record<string, unknown> = editarTareaSchema.shape
    for (const llave of llavesDeCrear) {
      expect(camposDeEditar[llave], llave).toBe(camposDeCrear[llave])
    }
    expect(editarTareaSchema.safeParse(base).success).toBe(false)
    expect(editarTareaSchema.safeParse({ ...base, version: 0 }).success).toBe(true)
    expect(tareaIdParamSchema.safeParse({ tareaId: A.toUpperCase() }).data).toEqual({ tareaId: A })
    expect(tareaIdParamSchema.safeParse({ tareaId: "nueva" }).success).toBe(false)
  })
})

describe("trabajoQuerySchema (PR-1B06)", () => {
  it("PR-1B06: sin-tema y un uuid pasan; otro texto o la ausencia rechazan", () => {
    expect(trabajoQuerySchema.safeParse({ tema: "sin-tema" }).data).toMatchObject({
      tema: "sin-tema",
      limite: 20,
    })
    expect(trabajoQuerySchema.safeParse({ tema: A.toUpperCase() }).data?.tema).toBe(A)
    for (const consulta of [
      {},
      { tema: "" },
      { tema: "SIN-TEMA" },
      { tema: "todos" },
      { tema: 5 },
    ]) {
      const resultado = trabajoQuerySchema.safeParse(consulta)
      expect(resultado.success, JSON.stringify(consulta)).toBe(false)
      expect(primerMensaje(resultado)).toBe("tema: elige un tema válido")
    }
  })

  it("PR-1B06: el cursor y el límite siguen la paginación general (de 1 a 100)", () => {
    expect(
      trabajoQuerySchema.safeParse({ tema: "sin-tema", cursor: A, limite: "100" }).success,
    ).toBe(true)
    expect(trabajoQuerySchema.safeParse({ tema: "sin-tema", limite: "101" }).success).toBe(false)
    expect(trabajoQuerySchema.safeParse({ tema: "sin-tema", cursor: "x" }).success).toBe(false)
  })
})

describe("publicacionSchema con la clave tarea (PR-1B06)", () => {
  const autor = { id: A, nombre: "Ana", administracion: false }
  const publicacion = {
    id: B,
    tipo: "tarea",
    titulo: "Ensayo",
    texto: "",
    autor,
    creadoEn: "2030-05-01T10:00:00.000Z",
    comentarios: 0,
    adjuntos: [],
    puedeBorrar: true,
    tarea: { fechaLimite: "2030-05-08T10:00:00.000Z", puntos: 50 },
  }

  it("PR-1B06: una tarea con su resumen pasa; sin la clave tarea rechaza; en un anuncio o material va null", () => {
    expect(publicacionSchema.safeParse(publicacion).success).toBe(true)
    const sinClave: Record<string, unknown> = { ...publicacion }
    delete sinClave.tarea
    expect(publicacionSchema.safeParse(sinClave).success).toBe(false)
    expect(
      publicacionSchema.safeParse({ ...publicacion, tipo: "anuncio", titulo: null, tarea: null })
        .success,
    ).toBe(true)
    expect(
      publicacionSchema.safeParse({ ...publicacion, tipo: "material", tarea: null }).success,
    ).toBe(true)
  })

  it("PR-1B06: el resumen exige fecha ISO y puntos enteros de 1 a 1000, y el tipo desconocido rechaza", () => {
    for (const tarea of [
      { fechaLimite: "mañana", puntos: 5 },
      { fechaLimite: "2030-05-08T10:00:00.000Z", puntos: 0 },
      { fechaLimite: "2030-05-08T10:00:00.000Z", puntos: 1001 },
      { fechaLimite: "2030-05-08T10:00:00.000Z", puntos: 1.5 },
    ]) {
      expect(publicacionSchema.safeParse({ ...publicacion, tarea }).success).toBe(false)
    }
    expect(publicacionSchema.safeParse({ ...publicacion, tipo: "examen" }).success).toBe(false)
  })

  it("PR-1B06: lo que se puede publicar sigue siendo anuncio o material: crearPublicacionSchema rechaza una tarea", () => {
    expect(
      crearPublicacionSchema.safeParse({ tipo: "tarea", titulo: "x", archivoIds: [] }).success,
    ).toBe(false)
  })
})
