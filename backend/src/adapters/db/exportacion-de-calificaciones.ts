import { AppError } from "../../core/errores.js"
import {
  leerGradebookCon,
  type CeldaDelGradebookDb,
  type ColumnaDelGradebookDb,
} from "./calificaciones.js"
import { enTransaccion, obtenerDb, type Ejecutor } from "./cliente.js"
import type { Prisma } from "./generated/client.js"

// CALIFICACIONES-02a (§D-2). La exportación a Excel de una clase (maestros de la clase y admin): una
// ventana del gradebook, con la misma lectura (leerGradebookCon), más el nombre de la clase, el total
// de actividades y el correo de cada alumno de la página. Solo lecturas, una tras otra y en una sola
// instantánea: nada se escribe ni se bloquea. Es el único archivo de adapters/db que lee el correo
// para una respuesta de calificaciones; ninguna sentencia selecciona el estado de pago, la
// restricción ni el tipo de cuenta (P-13).

export interface AlumnoDeExportacionDb {
  id: string
  nombre: string
  email: string
}

export interface FilaDeExportacionDb {
  alumno: AlumnoDeExportacionDb
  celdas: CeldaDelGradebookDb[]
  porcentaje: number | null
}

export interface ExportacionDeCalificacionesDb {
  clase: { nombre: string }
  tareas: ColumnaDelGradebookDb[]
  siguienteCursorTareas: string | null
  totalTareas: number
  alumnos: FilaDeExportacionDb[]
  siguienteCursor: string | null
  totalAlumnos: number
}

interface ParametrosDeLaExportacion {
  claseId: string
  cursor: string | undefined
  limite: number
  cursorTareas: string | undefined
  limiteTareas: number
  ahora: Date
}

// Inalcanzable hoy: nadie borra clases y el sexto paso ya la encontró. La misma respuesta que da el
// sexto paso a una clase inexistente.
const errorSinAccesoALaClase = (): AppError =>
  new AppError("SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase.", 403)

// Inalcanzable: la misma instantánea leyó al alumno de sus inscripciones con cuenta activa. Nunca se
// inventa un correo vacío.
const errorAlumnoSinCuenta = (): AppError =>
  new AppError("ERROR_INTERNO", "Un alumno de la clase no tiene cuenta.", 500)

const leerExportacionCon = async (
  tx: Prisma.TransactionClient,
  params: ParametrosDeLaExportacion,
): Promise<ExportacionDeCalificacionesDb> => {
  const { claseId } = params

  // 1. La clase (PK).
  const clase = await tx.clase.findUnique({ where: { id: claseId }, select: { nombre: true } })
  if (!clase) throw errorSinAccesoALaClase()

  // 2. La ventana del gradebook: sus mismas sentencias, cursores y agregados.
  const gradebook = await leerGradebookCon(tx, params)

  // 3. El total de actividades, por el prefijo de tareas(clase_id, fecha_limite).
  const totalTareas = await tx.tarea.count({ where: { claseId } })

  // 4. Los correos de la página, en una sola consulta por la PK de usuarios.
  const ids = gradebook.alumnos.map((fila) => fila.alumno.id)
  const cuentas =
    ids.length === 0
      ? []
      : await tx.usuario.findMany({
          where: { id: { in: ids } },
          select: { id: true, email: true },
        })
  const correoDe = new Map(cuentas.map((cuenta) => [cuenta.id, cuenta.email]))

  const alumnos = gradebook.alumnos.map((fila): FilaDeExportacionDb => {
    const email = correoDe.get(fila.alumno.id)
    if (email === undefined) throw errorAlumnoSinCuenta()
    return {
      alumno: { id: fila.alumno.id, nombre: fila.alumno.nombre, email },
      celdas: fila.celdas,
      porcentaje: fila.porcentaje,
    }
  })

  return {
    clase: { nombre: clase.nombre },
    tareas: gradebook.tareas,
    siguienteCursorTareas: gradebook.siguienteCursorTareas,
    totalTareas,
    alumnos,
    siguienteCursor: gradebook.siguienteCursor,
    totalAlumnos: gradebook.resumen.totalAlumnos,
  }
}

export const leerExportacionDeCalificaciones = (
  params: ParametrosDeLaExportacion,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ExportacionDeCalificacionesDb> =>
  enTransaccion(ejecutor, (tx) => leerExportacionCon(tx, params), { instantaneaUnica: true })
