import { z } from "zod"

import { adjuntoSchema } from "./archivos.js"
import {
  archivoIdsSchema,
  autorDelMuroSchema,
  CARACTER_QUE_SE_VE_VACIO,
  normalizarTerminoDeBusqueda,
  resumenDeTareaSchema,
  textoConContenidoSchema,
  textoDeUnaLineaSchema,
  textoLargoSchema,
} from "./clases.js"
import { paginacionSchema } from "./enlaces-registro.js"

// TAREAS-01a (S-05, S-06). Temas y categorías ponderadas de una clase. Lo de las tareas y "Trabajo
// de clase" llega en 01b.
export const MAXIMO_TEMAS_POR_CLASE = 30
export const MAXIMO_CATEGORIAS_POR_CLASE = 10
// TAREAS-01b (S-02, S-03, S-04).
export const MAXIMO_CRITERIOS_RUBRICA = 20
export const PUNTOS_MAXIMOS = 1000
export const DIAS_MAXIMOS_FECHA_LIMITE = 365

const MENSAJE_PESO = "El peso debe ser un número entero de 1 a 100"
const MENSAJE_PESOS_SUMA = "Los pesos deben sumar 100 %"

// Los ids se comparan en minúsculas: un UUID es el mismo en mayúsculas y en minúsculas.
const enMinusculas = (ids: readonly string[]): string[] => ids.map((id) => id.toLowerCase())
const sinRepetidos = (ids: readonly string[]): boolean =>
  new Set(enMinusculas(ids)).size === ids.length

// Clave de comparación de los nombres de temas y de categorías (S-05, T-02, T-03 y T-05): NFKC (ancho
// completo, ligaduras, dígitos encerrados) y, de lo que la definición única de clases.ts llama «se ve
// vacío» (Default_Ignorable, U+2800 y U+1D159), los Default_Ignorable se quitan (forman parte de
// emojis y de otros alfabetos: «Uni», U+200B, «dad» es «Unidad») y lo demás cuenta como un espacio (el blanco
// braille se pone donde va un espacio: «Unidad», U+2800, «1» es «Unidad 1»). Después, la normalización de
// búsqueda (mayúsculas, acentos, espacios). Solo sirve para comparar: el nombre se guarda y se
// muestra tal como llega.
const SE_VE_VACIO_GLOBAL = new RegExp(CARACTER_QUE_SE_VE_VACIO.source, "gu")
const IGNORABLE = /\p{Default_Ignorable_Code_Point}/u

export const claveDeNombre = (nombre: string): string =>
  normalizarTerminoDeBusqueda(
    nombre
      .normalize("NFKC")
      .replace(SE_VE_VACIO_GLOBAL, (caracter) => (IGNORABLE.test(caracter) ? "" : " ")),
  )

// Temas (§D-2)
export const nombreTemaSchema = textoDeUnaLineaSchema(80, "Escribe el nombre del tema")

export const crearTemaSchema = z.object({ nombre: nombreTemaSchema })

export const renombrarTemaSchema = z.object({ nombre: nombreTemaSchema })

export const ordenTemasSchema = z.object({
  temaIds: z
    .array(z.uuid("temaId: debe ser un identificador válido"), {
      error: "Los temas deben ser una lista",
    })
    .min(1, "Elige al menos un tema")
    .max(MAXIMO_TEMAS_POR_CLASE, `Una clase puede tener hasta ${MAXIMO_TEMAS_POR_CLASE} temas`)
    .refine(sinRepetidos, { error: "No repitas un tema" })
    .transform(enMinusculas),
})

// Los ids de la ruta se pasan a minúsculas (como los del cuerpo): un UUID es el mismo en mayúsculas.
export const temaIdParamSchema = z.object({
  temaId: z.uuid("temaId: debe ser un identificador válido").transform((id) => id.toLowerCase()),
})

export const publicacionDeMoverParamSchema = z.object({
  publicacionId: z
    .uuid("publicacionId: debe ser un identificador válido")
    .transform((id) => id.toLowerCase()),
})

// La clave es obligatoria: null es "Sin tema" y una clave ausente es un cuerpo mal formado.
export const moverElementoSchema = z.object({
  temaId: z
    .uuid("temaId: debe ser un identificador válido")
    .transform((id) => id.toLowerCase())
    .nullable(),
})

export const temaSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  orden: z.number().int().min(0),
  elementos: z.number().int().min(0),
})

export const listaTemasRespuestaSchema = z.object({
  temas: z.array(temaSchema),
  sinTema: z.number().int().min(0),
})

export const temaRespuestaSchema = z.object({ tema: temaSchema })

export const moverElementoRespuestaSchema = z.object({
  publicacionId: z.uuid(),
  temaId: z.uuid().nullable(),
})

// Categorías (§D-3)
export const nombreCategoriaSchema = textoDeUnaLineaSchema(60, "Escribe el nombre de la categoría")

export const pesoCategoriaSchema = z
  .number({ error: MENSAJE_PESO })
  .int(MENSAJE_PESO)
  .min(1, MENSAJE_PESO)
  .max(100, MENSAJE_PESO)

export const categoriaEntradaSchema = z.object({
  id: z.uuid("categoriaId: debe ser un identificador válido").optional(),
  nombre: nombreCategoriaSchema,
  peso: pesoCategoriaSchema,
})

// La lista se guarda en bloque (S-06): vacía es "sin categorías"; con al menos una, suman 100. El
// error de suma lleva el prefijo del campo ("categorias: ...") porque la incidencia cuelga del arreglo.
export const reemplazarCategoriasSchema = z.object({
  categorias: z
    .array(categoriaEntradaSchema, { error: "Las categorías deben ser una lista" })
    .max(
      MAXIMO_CATEGORIAS_POR_CLASE,
      `Una clase puede tener hasta ${MAXIMO_CATEGORIAS_POR_CLASE} categorías`,
    )
    .superRefine((categorias, contexto) => {
      const ids = categorias.flatMap(({ id }) => (id === undefined ? [] : [id]))
      if (!sinRepetidos(ids)) {
        contexto.addIssue({ code: "custom", message: "No repitas una categoría" })
        return
      }
      const nombres = categorias.map(({ nombre }) => claveDeNombre(nombre))
      if (new Set(nombres).size !== nombres.length) {
        contexto.addIssue({
          code: "custom",
          message: "No repitas el nombre de una categoría",
        })
        return
      }
      const suma = categorias.reduce((total, { peso }) => total + peso, 0)
      if (categorias.length > 0 && suma !== 100) {
        contexto.addIssue({ code: "custom", message: MENSAJE_PESOS_SUMA })
      }
    })
    .transform((categorias) =>
      categorias.map((categoria) =>
        categoria.id === undefined ? categoria : { ...categoria, id: categoria.id.toLowerCase() },
      ),
    ),
})

export const categoriaSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  peso: z.number().int().min(1).max(100),
  tareas: z.number().int().min(0),
})

export const listaCategoriasRespuestaSchema = z.object({ categorias: z.array(categoriaSchema) })

// Tareas (§D-4) y "Trabajo de clase" (§D-6)
const MENSAJE_PUNTOS = "Los puntos deben ser un número entero de 1 a 1000"
const MENSAJE_PUNTOS_MAX = "Los puntos máximos deben ser un número entero de 1 a 1000"

export const criterioEntradaSchema = z.object({
  criterio: textoConContenidoSchema(300, "Escribe el criterio"),
  puntosMax: z
    .number({ error: MENSAJE_PUNTOS_MAX })
    .int(MENSAJE_PUNTOS_MAX)
    .min(1, MENSAJE_PUNTOS_MAX)
    .max(PUNTOS_MAXIMOS, MENSAJE_PUNTOS_MAX),
})

// Sin zona horaria se rechaza: la fecha límite viaja en ISO 8601 con Z o con desfase (regla 7).
export const fechaLimiteSchema = z.iso.datetime({ offset: true, error: "Elige la fecha límite" })

const idOpcionalSchema = z
  .uuid("Elige una opción válida")
  .transform((id) => id.toLowerCase())
  .nullable()
  .default(null)

export const crearTareaSchema = z.object({
  titulo: textoDeUnaLineaSchema(200, "Escribe el título de la tarea"),
  instrucciones: textoLargoSchema(10000).optional(),
  fechaLimite: fechaLimiteSchema,
  puntos: z
    .number({ error: MENSAJE_PUNTOS })
    .int(MENSAJE_PUNTOS)
    .min(1, MENSAJE_PUNTOS)
    .max(PUNTOS_MAXIMOS, MENSAJE_PUNTOS),
  aceptaTardias: z.boolean({ error: "Elige si se aceptan entregas con retraso" }).default(true),
  // ENTREGAS-01a (P-03 a): "Cómo se entrega". Por defecto pide archivos o enlaces, así que no rompe
  // a quien no lo envía.
  requiereAdjuntos: z.boolean({ error: "Elige cómo se entrega la tarea" }).default(true),
  categoriaId: idOpcionalSchema,
  temaId: idOpcionalSchema,
  rubrica: z
    .array(criterioEntradaSchema, { error: "La rúbrica debe ser una lista" })
    .max(
      MAXIMO_CRITERIOS_RUBRICA,
      `La rúbrica puede tener hasta ${MAXIMO_CRITERIOS_RUBRICA} criterios`,
    )
    .default([]),
  // Los ids de archivo se comparan en minúsculas con los de la base (conservar un adjunto al editar).
  archivoIds: archivoIdsSchema.transform((ids) => ids.map((id) => id.toLowerCase())),
})

// ENTREGAS-01a (P-05 a′): editar exige la versión con que se abrió el formulario; si la fila ya
// tiene otra, el servidor responde 409 TAREA_MODIFICADA sin escribir nada. Crear no la lleva.
const MENSAJE_VERSION = "La versión de la tarea debe ser un número entero de 0 en adelante"

export const editarTareaSchema = crearTareaSchema.extend({
  version: z.number({ error: MENSAJE_VERSION }).int(MENSAJE_VERSION).min(0, MENSAJE_VERSION),
})

export const tareaIdParamSchema = z.object({
  tareaId: z.uuid("tareaId: debe ser un identificador válido").transform((id) => id.toLowerCase()),
})

export const criterioDeRubricaSchema = z.object({
  id: z.uuid(),
  criterio: z.string(),
  puntosMax: z.number().int().min(1).max(PUNTOS_MAXIMOS),
})

// Nunca lleva el id del trabajo de la cola, el rol del autor, correos ni estado de pago (§D-4, S-17).
export const tareaDetalleSchema = z.object({
  id: z.uuid(),
  titulo: z.string(),
  instrucciones: z.string(),
  fechaLimite: z.iso.datetime(),
  puntos: z.number().int().min(1).max(PUNTOS_MAXIMOS),
  aceptaTardias: z.boolean(),
  // ENTREGAS-01a: "Cómo se entrega" (P-03 a) y la versión que el formulario envía al guardar (P-05 a′).
  requiereAdjuntos: z.boolean(),
  version: z.number().int().min(0),
  categoria: z.object({ id: z.uuid(), nombre: z.string(), peso: z.number().int() }).nullable(),
  tema: z.object({ id: z.uuid(), nombre: z.string() }).nullable(),
  rubrica: z.array(criterioDeRubricaSchema),
  adjuntos: z.array(adjuntoSchema),
  autor: autorDelMuroSchema,
  creadoEn: z.iso.datetime(),
  actualizadoEn: z.iso.datetime(),
  puedeEditar: z.boolean(),
  puedeBorrar: z.boolean(),
})

export const tareaRespuestaSchema = z.object({ tarea: tareaDetalleSchema })

export const trabajoQuerySchema = paginacionSchema.extend({
  tema: z.union([z.literal("sin-tema"), z.uuid().transform((id) => id.toLowerCase())], {
    error: "tema: elige un tema válido",
  }),
})

export const elementoDeTrabajoSchema = z.object({
  id: z.uuid(),
  tipo: z.enum(["material", "tarea"]),
  titulo: z.string(),
  autor: autorDelMuroSchema,
  creadoEn: z.iso.datetime(),
  material: z.object({ texto: z.string(), adjuntos: z.array(adjuntoSchema) }).nullable(),
  tarea: resumenDeTareaSchema.nullable(),
  puedeMover: z.boolean(),
})

export const listaTrabajoRespuestaSchema = z.object({
  elementos: z.array(elementoDeTrabajoSchema),
  siguienteCursor: z.uuid().nullable(),
})

export const CODIGOS_TAREAS = {
  TAREA_NO_ENCONTRADA: "TAREA_NO_ENCONTRADA",
  CATEGORIA_REQUERIDA: "CATEGORIA_REQUERIDA",
  EDICION_NO_PERMITIDA: "EDICION_NO_PERMITIDA",
  FECHA_LIMITE_INVALIDA: "FECHA_LIMITE_INVALIDA",
  TEMA_NO_ENCONTRADO: "TEMA_NO_ENCONTRADO",
  CATEGORIA_NO_ENCONTRADA: "CATEGORIA_NO_ENCONTRADA",
  CATEGORIA_CON_TAREAS: "CATEGORIA_CON_TAREAS",
  TOPE_DE_TEMAS: "TOPE_DE_TEMAS",
  TEMA_REPETIDO: "TEMA_REPETIDO",
  ORDEN_DESACTUALIZADO: "ORDEN_DESACTUALIZADO",
  ANUNCIO_SIN_TEMA: "ANUNCIO_SIN_TEMA",
  // ENTREGAS-01a (P-05 a′).
  TAREA_MODIFICADA: "TAREA_MODIFICADA",
} as const

export type CodigoTareas = (typeof CODIGOS_TAREAS)[keyof typeof CODIGOS_TAREAS]
export type CrearTema = z.infer<typeof crearTemaSchema>
export type RenombrarTema = z.infer<typeof renombrarTemaSchema>
export type OrdenTemas = z.infer<typeof ordenTemasSchema>
export type TemaIdParam = z.infer<typeof temaIdParamSchema>
export type MoverElemento = z.infer<typeof moverElementoSchema>
export type Tema = z.infer<typeof temaSchema>
export type ListaTemasRespuesta = z.infer<typeof listaTemasRespuestaSchema>
export type TemaRespuesta = z.infer<typeof temaRespuestaSchema>
export type MoverElementoRespuesta = z.infer<typeof moverElementoRespuestaSchema>
export type CategoriaEntrada = z.infer<typeof categoriaEntradaSchema>
export type ReemplazarCategorias = z.infer<typeof reemplazarCategoriasSchema>
export type Categoria = z.infer<typeof categoriaSchema>
export type CriterioEntrada = z.infer<typeof criterioEntradaSchema>
export type CrearTarea = z.infer<typeof crearTareaSchema>
export type EditarTarea = z.infer<typeof editarTareaSchema>
export type TareaIdParam = z.infer<typeof tareaIdParamSchema>
export type CriterioDeRubrica = z.infer<typeof criterioDeRubricaSchema>
export type TareaDetalle = z.infer<typeof tareaDetalleSchema>
export type TareaRespuesta = z.infer<typeof tareaRespuestaSchema>
export type TrabajoQuery = z.infer<typeof trabajoQuerySchema>
export type ElementoDeTrabajo = z.infer<typeof elementoDeTrabajoSchema>
export type ListaTrabajoRespuesta = z.infer<typeof listaTrabajoRespuestaSchema>
export type ListaCategoriasRespuesta = z.infer<typeof listaCategoriasRespuestaSchema>
