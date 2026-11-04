import { z } from "zod"

import { adjuntoSchema } from "./archivos.js"
import {
  archivoIdsSchema,
  autorDelMuroSchema,
  crearPublicacionSchema,
  textoConContenidoSchema,
} from "./clases.js"
import { paginacionSchema } from "./enlaces-registro.js"
import { trabajoQuerySchema } from "./tareas.js"

// CLASES-03a (§D-6, RN-09). Un recurso es una publicación de tipo material con su bloque: el admin
// publica en "aprendizaje" y un maestro en "docente" (S-01).
export const BLOQUES_DE_RECURSO = ["aprendizaje", "docente"] as const

export const bloqueDeRecursoSchema = z.enum(BLOQUES_DE_RECURSO)

// El tema se filtra igual que en "Actividades de aprendizaje": "sin-tema" o el id del tema.
export const recursosQuerySchema = paginacionSchema.extend({
  bloque: z.enum(BLOQUES_DE_RECURSO, { error: "bloque: elige un bloque válido" }),
  tema: trabajoQuerySchema.shape.tema,
})

// Los ids de la ruta se pasan a minúsculas: un UUID es el mismo en mayúsculas.
export const recursoIdParamSchema = z.object({
  recursoId: z
    .uuid("recursoId: debe ser un identificador válido")
    .transform((id) => id.toLowerCase()),
})

// Nunca lleva correo, estado de pago, restricción ni el rol del autor (§D-0.6); la versión solo en
// el detalle, que piden los maestros de la clase y el admin.
export const recursoSchema = z.object({
  id: z.uuid(),
  titulo: z.string(),
  texto: z.string(),
  autor: autorDelMuroSchema,
  creadoEn: z.iso.datetime(),
  bloque: bloqueDeRecursoSchema,
  adjuntos: z.array(adjuntoSchema),
  comentarios: z.number().int().min(0),
  // Los decide el servidor con core/recursos.ts; la interfaz solo los lee.
  puedeEditar: z.boolean(),
  puedeBorrar: z.boolean(),
  puedeMover: z.boolean(),
})

export const listaRecursosRespuestaSchema = z.object({
  recursos: z.array(recursoSchema),
  siguienteCursor: z.uuid().nullable(),
})

export const recursoDetalleSchema = recursoSchema.extend({
  version: z.number().int().min(0),
  tema: z.object({ id: z.uuid(), nombre: z.string() }).nullable(),
})

export const recursoRespuestaSchema = z.object({ recurso: recursoDetalleSchema })

// Editar exige la versión con que se abrió el formulario (409 RECURSO_MODIFICADO si la fila ya tiene
// otra). La descripción sigue la regla de la del material, que se reutiliza para no duplicarla.
const MENSAJE_VERSION = "La versión del recurso debe ser un número entero de 0 en adelante"
const descripcionDeMaterialSchema = crearPublicacionSchema.options[1].shape.texto

export const editarRecursoSchema = z.object({
  titulo: textoConContenidoSchema(200, "Escribe el título del recurso"),
  texto: descripcionDeMaterialSchema,
  // La clave es obligatoria: null es "Sin tema" y una clave ausente es un cuerpo mal formado.
  temaId: z
    .uuid("temaId: debe ser un identificador válido")
    .transform((id) => id.toLowerCase())
    .nullable(),
  // Los ids de archivo se comparan en minúsculas con los de la base (conservar un adjunto).
  archivoIds: archivoIdsSchema.transform((ids) => ids.map((id) => id.toLowerCase())),
  version: z.number({ error: MENSAJE_VERSION }).int(MENSAJE_VERSION).min(0, MENSAJE_VERSION),
})

export const CODIGOS_RECURSOS = {
  RECURSO_NO_ENCONTRADO: "RECURSO_NO_ENCONTRADO",
  RECURSO_MODIFICADO: "RECURSO_MODIFICADO",
  MOVER_NO_PERMITIDO: "MOVER_NO_PERMITIDO",
} as const

export type BloqueDeRecurso = z.infer<typeof bloqueDeRecursoSchema>
export type RecursosQuery = z.infer<typeof recursosQuerySchema>
export type RecursoIdParam = z.infer<typeof recursoIdParamSchema>
export type Recurso = z.infer<typeof recursoSchema>
export type ListaRecursosRespuesta = z.infer<typeof listaRecursosRespuestaSchema>
export type RecursoDetalle = z.infer<typeof recursoDetalleSchema>
export type RecursoRespuesta = z.infer<typeof recursoRespuestaSchema>
export type EditarRecurso = z.infer<typeof editarRecursoSchema>
export type CodigoRecursos = (typeof CODIGOS_RECURSOS)[keyof typeof CODIGOS_RECURSOS]
