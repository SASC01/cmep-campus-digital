import type { Rol } from "@campus/shared"

import { AppError } from "../../core/errores.js"
import { paginar } from "../../core/paginacion.js"
import { enTransaccion, obtenerDb, type Ejecutor } from "./cliente.js"

// ADMIN-01e (§D-7.7, S-09, RN-04). La consulta del registro de altas y bajas, sin filtros, de lo más
// reciente a lo más antiguo por secuencia (que solo se asigna al insertar y nunca cambia: el cursor
// no lleva posición, Enmienda 5). La escritura sigue siendo solo de inscripciones.ts.

export interface MovimientoDeInscripcionDb {
  id: string
  secuencia: bigint
  tipo: "alta" | "baja"
  creadoEn: Date
  clase: { id: string; nombre: string }
  alumno: { id: string; nombre: string; email: string }
  // El handler firma al admin como "Administración" (RN-07, firmaDelAutor).
  actor: { id: string; nombre: string; rol: Rol }
}

export interface ListaMovimientosDb {
  movimientos: MovimientoDeInscripcionDb[]
  siguienteCursor: string | null
}

const errorCursorInvalido = (): AppError => new AppError("VALIDACION", "cursor: no es válido", 400)

// El cursor es el id del último movimiento entregado, leído por PK antes de la página y en la misma
// instantánea; si ya no existe (se borró con su clase), 400. La página y sus relaciones (clase,
// alumno y actor, por PK) salen de esa misma instantánea.
export const listarMovimientosDeInscripcion = (
  { cursor, limite }: { cursor: string | undefined; limite: number },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaMovimientosDb> =>
  enTransaccion(
    ejecutor,
    async (tx) => {
      let antesDe: bigint | undefined
      if (cursor !== undefined) {
        const fila = await tx.movimientoInscripcion.findUnique({
          where: { id: cursor },
          select: { secuencia: true },
        })
        if (fila === null) throw errorCursorInvalido()
        antesDe = fila.secuencia
      }
      const filas = await tx.movimientoInscripcion.findMany({
        where: antesDe === undefined ? {} : { secuencia: { lt: antesDe } },
        orderBy: { secuencia: "desc" },
        take: limite + 1,
        select: {
          id: true,
          secuencia: true,
          tipo: true,
          creadoEn: true,
          clase: { select: { id: true, nombre: true } },
          alumno: { select: { id: true, nombre: true, email: true } },
          actor: { select: { id: true, nombre: true, rol: true } },
        },
      })
      const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.id)
      return { movimientos: pagina, siguienteCursor }
    },
    { instantaneaUnica: true },
  )
