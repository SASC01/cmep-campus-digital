import { obtenerDb } from "../src/adapters/db/cliente.js"
import { COLA_BORRAR_OBJETOS, COLA_COPIAR_OBJETOS } from "../src/core/eventos/objetos.js"

// Ayudas de las pruebas de ADMIN-01b (borrar y duplicar clases). Como ayudas-clases.ts, usan
// obtenerDb() solo para preparar, leer y limpiar datos.

export interface TrabajoDeObjetos {
  id: string
  state: string
  start_after: Date
  created_on: Date
  datos: Record<string, unknown>
}

// Los trabajos de BORRAR_OBJETOS que llevan alguna de estas claves (lo que pg-boss guardó).
export const trabajosDeBorradoCon = (claves: readonly string[]) =>
  obtenerDb().$queryRaw<TrabajoDeObjetos[]>`
    SELECT id::text AS id, state::text AS state, start_after, created_on, data AS datos
    FROM pgboss.job
    WHERE name = ${COLA_BORRAR_OBJETOS} AND (data -> 'claves') ?| ${[...claves]}::text[]
    ORDER BY created_on ASC, id ASC`

// Los trabajos de COPIAR_OBJETOS que llevan alguno de estos ids de archivo.
export const trabajosDeCopiaCon = (archivoIds: readonly string[]) =>
  obtenerDb().$queryRaw<TrabajoDeObjetos[]>`
    SELECT id::text AS id, state::text AS state, start_after, created_on, data AS datos
    FROM pgboss.job
    WHERE name = ${COLA_COPIAR_OBJETOS} AND (data -> 'archivoIds') ?| ${[...archivoIds]}::text[]
    ORDER BY created_on ASC, id ASC`

export const estadosDeTrabajos = async (
  ids: readonly string[],
): Promise<Record<string, string>> => {
  if (ids.length === 0) return {}
  const filas = await obtenerDb().$queryRaw<{ id: string; state: string }[]>`
    SELECT id::text AS id, state::text AS state FROM pgboss.job
    WHERE id = ANY(${[...ids]}::uuid[])`
  return Object.fromEntries(filas.map((fila) => [fila.id, fila.state]))
}

// La limpieza termina las copias en curso que tocan estas clases antes de borrarlas: la FK copia_de
// es RESTRICT y un original con una copia en curso no se borra.
export const terminarCopiasDePrueba = async (claseIds: readonly string[]): Promise<void> => {
  if (claseIds.length === 0) return
  await obtenerDb().archivo.updateMany({
    where: {
      copiaDe: { not: null },
      OR: [{ claseId: { in: [...claseIds] } }, { original: { claseId: { in: [...claseIds] } } }],
    },
    data: { copiaDe: null },
  })
}

// La clase y todo lo que vive bajo ella, contado por tabla (para "nada borrado" y "todo borrado").
export const fotoDeLaClase = async (claseId: string) => {
  const db = obtenerDb()
  return {
    clase: await db.clase.count({ where: { id: claseId } }),
    maestros: await db.maestroDeClase.count({ where: { claseId } }),
    inscripciones: await db.inscripcion.count({ where: { claseId } }),
    movimientos: await db.movimientoInscripcion.count({ where: { claseId } }),
    temas: await db.tema.count({ where: { claseId } }),
    categorias: await db.categoria.count({ where: { claseId } }),
    publicaciones: await db.publicacion.count({ where: { claseId } }),
    tareas: await db.tarea.count({ where: { claseId } }),
    criterios: await db.criterioRubrica.count({ where: { tarea: { claseId } } }),
    entregas: await db.entrega.count({ where: { tarea: { claseId } } }),
    puntajes: await db.puntajeRubrica.count({ where: { entrega: { tarea: { claseId } } } }),
    comentarios: await db.comentario.count({
      where: {
        OR: [
          { publicacion: { claseId } },
          { entrega: { tarea: { claseId } } },
          { duda: { claseId } },
        ],
      },
    }),
    dudas: await db.duda.count({ where: { claseId } }),
    archivos: await db.archivo.count({ where: { claseId } }),
  }
}
