import { z } from "zod"

import { correoSchema, nombreSchema, rolSchema } from "./auth.js"
import {
  contarCaracteresVisibles,
  estadoPagoSchema,
  LONGITUD_MAXIMA_BUSQUEDA,
  LONGITUD_MAXIMA_BUSQUEDA_CRUDA,
  normalizarTerminoDeBusqueda,
  normalizarTextoLargo,
  textoLargoSchema,
} from "./clases.js"
import { paginacionSchema } from "./enlaces-registro.js"

// ADMIN-01e (§D-7, §D-8). Gestión de usuarios, estado de pago, acceso, resumen y movimientos.
// Ninguna respuesta lleva hashContrasena, nombreBusqueda, debeCambiarContrasena ni enlaceRegistroId
// (ADM-1E15): los esquemas de respuesta son z.object, que descarta cualquier clave que no declaran.

const MAXIMO_ALUMNOS_POR_LOTE = 100
const MAXIMO_VISIBLES_MOTIVO = 300
// Se construye con su código para no escribir el carácter en el archivo.
const CARACTER_NULO = String.fromCharCode(0)

// Las listas de usuarios y de movimientos paginan de 50 en 50 por defecto, hasta 100 (§D-7.1, §D-7.7).
const paginacionDe50Schema = paginacionSchema.extend({
  limite: z.coerce.number().int().min(1).max(100).optional().default(50),
})

// q (S-12): el máximo se valida aquí, como en el buscador de candidatos; un término que normaliza a
// menos de 3 lo responde core/ (prepararBusquedaDeUsuarios) como 400 BUSQUEDA_MUY_CORTA.
// cursorNombre (Enmienda 5): la posición del cursor, sin formato ni mensaje propio; el adaptador la
// compara literalmente con el nombre de la fila del cursor y decide las combinaciones inválidas.
// estadoPago solo filtra alumnos: sin rol=estudiante es un 400 VALIDACION.
export const listaUsuariosConsultaSchema = paginacionDe50Schema
  .extend({
    q: z
      .string({ error: "Escribe al menos 3 letras" })
      .superRefine((texto, contexto) => {
        const crudo = Array.from(texto).length
        const normalizado = Array.from(normalizarTerminoDeBusqueda(texto)).length
        if (crudo > LONGITUD_MAXIMA_BUSQUEDA_CRUDA || normalizado > LONGITUD_MAXIMA_BUSQUEDA) {
          contexto.addIssue({
            code: "custom",
            message: "La búsqueda no puede tener más de 120 caracteres",
          })
          return
        }
        // ADMIN-01e, T-01 de la ronda 1: el carácter nulo es lo único que PostgreSQL no puede
        // guardar ni comparar en un texto (22021). Se rechaza aquí, antes de llegar a la base, con
        // el mismo criterio y el mismo texto con que el buscador de candidatos lo traduce a 400
        // (traducirErrorPrisma de adapters/db/errores.ts).
        if (texto.includes(CARACTER_NULO)) {
          contexto.addIssue({
            code: "custom",
            message: "Los datos enviados tienen caracteres no permitidos.",
          })
        }
      })
      .optional(),
    rol: rolSchema.optional(),
    estadoPago: estadoPagoSchema.optional(),
    cursorNombre: z.string().optional(),
  })
  .superRefine((consulta, contexto) => {
    if (consulta.estadoPago === undefined || consulta.rol === "estudiante") return
    contexto.addIssue({
      code: "custom",
      path: ["estadoPago"],
      message: "Solo se filtra por estado de pago entre los alumnos",
    })
  })

const CAMPOS_DE_ALUMNO = [
  "estadoPago",
  "fechaEstadoPago",
  "accesoRestringido",
  "motivoRestriccion",
  "fechaRestriccion",
] as const

// Una fila de la lista (§D-7.1); la ficha, editar el nombre, la baja y el acceso responden la misma
// forma. Los datos de pago y de acceso van solo en las filas de estudiantes (RN-02: el admin los ve
// todos), y el superRefine lo exige en las dos direcciones.
export const usuarioAdminFilaSchema = z
  .object({
    id: z.uuid(),
    nombre: z.string(),
    email: z.string(),
    rol: rolSchema,
    activo: z.boolean(),
    creadoEn: z.iso.datetime(),
    estadoPago: estadoPagoSchema.optional(),
    fechaEstadoPago: z.iso.datetime().nullable().optional(),
    accesoRestringido: z.boolean().optional(),
    motivoRestriccion: z.string().nullable().optional(),
    fechaRestriccion: z.iso.datetime().nullable().optional(),
  })
  .superRefine((fila, contexto) => {
    const esEstudiante = fila.rol === "estudiante"
    for (const campo of CAMPOS_DE_ALUMNO) {
      const presente = fila[campo] !== undefined
      if (presente === esEstudiante) continue
      contexto.addIssue({
        code: "custom",
        path: [campo],
        message: esEstudiante
          ? "Falta un dato de la cuenta del alumno"
          : "Solo las cuentas de alumnos llevan este dato",
      })
    }
  })

// siguienteCursorNombre (Enmienda 5): el nombre de la última fila cuando hay página siguiente; si
// no, null (exactamente cuando siguienteCursor es null).
export const listaUsuariosRespuestaSchema = z.object({
  usuarios: z.array(usuarioAdminFilaSchema),
  siguienteCursor: z.uuid().nullable(),
  siguienteCursorNombre: z.string().nullable(),
})

export const editarNombreSchema = z.object({ nombre: nombreSchema })

export const cambiarActivoSchema = z.object({ activo: z.boolean() })

// Alta de alumno (P-01 a): los campos de registro, sin contraseña (nace con una temporal).
export const altaAlumnoSchema = z.object({ nombre: nombreSchema, email: correoSchema })

export const altaAlumnoRespuestaSchema = z.object({
  usuario: usuarioAdminFilaSchema,
  contrasenaTemporal: z.string().min(10),
})

// S-11: de 1 a 100 alumnos, sin repetidos; un UUID es el mismo en mayúsculas y en minúsculas.
export const estadoPagoLoteSchema = z.object({
  alumnoIds: z
    .array(z.uuid({ error: "Un alumno no es válido" }), {
      error: "Los alumnos deben ser una lista",
    })
    .min(1, "Elige al menos un alumno")
    .max(MAXIMO_ALUMNOS_POR_LOTE, "No puedes cambiar más de 100 alumnos a la vez")
    .refine(
      (ids) => new Set(ids.map((id) => id.toLowerCase())).size === ids.length,
      "Hay alumnos repetidos",
    ),
  estadoPago: estadoPagoSchema,
})

export const estadoPagoLoteRespuestaSchema = z.object({
  actualizados: z.number().int().min(0),
})

// S-10: el motivo se normaliza con normalizarTextoLargo y mide hasta 300 caracteres visibles; un
// motivo sin caracteres visibles equivale a no mandarlo. Sin tope de longitud cruda (decisión del
// humano, 2026-11-09): la única medida es la de los visibles. textoLargoSchema se usa solo por su
// rechazo de los caracteres de control (el carácter nulo no llega a PostgreSQL) y de los
// inversores de dirección, con su texto de siempre; por eso su máximo es infinito y no se alcanza.
const motivoRestriccionSchema = z
  .string({ error: "El motivo debe ser texto" })
  .transform(normalizarTextoLargo)
  .pipe(textoLargoSchema(Number.POSITIVE_INFINITY))
  .refine(
    (texto) => contarCaracteresVisibles(texto) <= MAXIMO_VISIBLES_MOTIVO,
    "El motivo no puede tener más de 300 caracteres",
  )
  .transform((texto) => (contarCaracteresVisibles(texto) === 0 ? undefined : texto))

export const accesoSchema = z.object({
  restringido: z.boolean(),
  motivo: motivoRestriccionSchema.optional(),
})

// S-13: alumnos y maestros con cuenta activa y clases activas (no archivadas).
export const resumenAdminRespuestaSchema = z.object({
  alumnos: z.number().int().min(0),
  maestros: z.number().int().min(0),
  clasesActivas: z.number().int().min(0),
})

// S-09 (Enmienda 1): sin filtros; un claseId o alumnoId en la consulta se ignora.
export const listaMovimientosConsultaSchema = paginacionDe50Schema

export const tipoMovimientoInscripcionSchema = z.enum(["alta", "baja"])

// El actor admin sale con la firma de RN-07 (`administracion: true`, nombre "Administración").
export const movimientoInscripcionSchema = z.object({
  id: z.uuid(),
  // BIGINT: viaja como texto para no perder precisión en JavaScript.
  secuencia: z.string(),
  tipo: tipoMovimientoInscripcionSchema,
  creadoEn: z.iso.datetime(),
  clase: z.object({ id: z.uuid(), nombre: z.string() }),
  alumno: z.object({ id: z.uuid(), nombre: z.string(), email: z.string() }),
  actor: z.object({ id: z.uuid(), nombre: z.string(), administracion: z.boolean() }),
})

export const listaMovimientosRespuestaSchema = z.object({
  movimientos: z.array(movimientoInscripcionSchema),
  siguienteCursor: z.uuid().nullable(),
})

export type ListaUsuariosConsulta = z.infer<typeof listaUsuariosConsultaSchema>
export type UsuarioAdminFila = z.infer<typeof usuarioAdminFilaSchema>
export type ListaUsuariosRespuesta = z.infer<typeof listaUsuariosRespuestaSchema>
export type EditarNombre = z.infer<typeof editarNombreSchema>
export type CambiarActivo = z.infer<typeof cambiarActivoSchema>
export type AltaAlumno = z.infer<typeof altaAlumnoSchema>
export type AltaAlumnoRespuesta = z.infer<typeof altaAlumnoRespuestaSchema>
export type EstadoPagoLote = z.infer<typeof estadoPagoLoteSchema>
export type EstadoPagoLoteRespuesta = z.infer<typeof estadoPagoLoteRespuestaSchema>
export type Acceso = z.infer<typeof accesoSchema>
export type ResumenAdminRespuesta = z.infer<typeof resumenAdminRespuestaSchema>
export type ListaMovimientosConsulta = z.infer<typeof listaMovimientosConsultaSchema>
export type TipoMovimientoInscripcion = z.infer<typeof tipoMovimientoInscripcionSchema>
export type MovimientoInscripcion = z.infer<typeof movimientoInscripcionSchema>
export type ListaMovimientosRespuesta = z.infer<typeof listaMovimientosRespuestaSchema>
