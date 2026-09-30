import { randomBytes } from "node:crypto"

import { LONGITUD_CODIGO_CLASE } from "@campus/shared"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { codigoDesdeBytes } from "../src/core/clases/codigo.js"

// Ayudas compartidas por las pruebas de clases (CLASES-a). Mismo patrón que ayudas-auth.ts:
// obtenerDb() se usa aquí, y solo aquí fuera de adapters/db, para preparar y limpiar datos.

export const codigoDePrueba = (): string => codigoDesdeBytes(randomBytes(LONGITUD_CODIGO_CLASE))

export interface OpcionesClaseDePrueba {
  maestroId: string
  nombre?: string
  descripcion?: string | null
  codigoInvitacion?: string
  activa?: boolean
}

export interface ClaseDePrueba {
  id: string
  codigoInvitacion: string
}

export const crearClaseDePrueba = async (
  registro: string[],
  {
    maestroId,
    nombre = "Clase de prueba",
    descripcion = null,
    codigoInvitacion,
    activa = true,
  }: OpcionesClaseDePrueba,
): Promise<ClaseDePrueba> => {
  const codigo = codigoInvitacion ?? codigoDePrueba()
  const { id } = await obtenerDb().clase.create({
    data: { maestroId, nombre, descripcion, codigoInvitacion: codigo, activa },
    select: { id: true },
  })
  registro.push(id)
  return { id, codigoInvitacion: codigo }
}

export const inscribirDePrueba = async (
  claseId: string,
  usuarioId: string,
  origen: "codigo" | "manual" = "manual",
): Promise<void> => {
  await obtenerDb().inscripcion.create({
    data: { claseId, usuarioId, origen },
    select: { claseId: true },
  })
}

export const leerClaseDb = (id: string) => obtenerDb().clase.findUnique({ where: { id } })

export const contarInscripciones = (claseId: string): Promise<number> =>
  obtenerDb().inscripcion.count({ where: { claseId } })

// N-10 (regla de b, c y d; aquí solo se limpian clases porque movimientos_inscripcion llega en b):
// las clases de prueba se borran ANTES que los usuarios (clases.maestro_id es ON DELETE RESTRICT).
// Las inscripciones caen en cascada con la clase.
export const borrarClasesDePrueba = async (ids: readonly string[]): Promise<void> => {
  if (ids.length === 0) return
  await obtenerDb().clase.deleteMany({ where: { id: { in: [...ids] } } })
}
