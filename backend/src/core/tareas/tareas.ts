import { DIAS_MAXIMOS_FECHA_LIMITE, type Rol } from "@campus/shared"

import { AppError } from "../errores.js"

// Puras (§D-4, S-02, P-01 a). El adaptador las llama dentro de la transacción de la tarea.

const MS_POR_DIA = 24 * 60 * 60 * 1000

const fechaInvalida = (): AppError =>
  new AppError(
    "FECHA_LIMITE_INVALIDA",
    "Elige una fecha límite futura, dentro del próximo año.",
    400,
  )

// S-02: al crear, futura (estrictamente posterior a ahora) y a no más de 365 días. Al editar, se puede
// conservar la fecha actual aunque ya pasó (mismo instante, en milisegundos); una fecha distinta
// cumple lo mismo que al crear.
export const validarFechaLimite = ({
  nueva,
  anterior,
  ahora,
}: {
  nueva: Date
  anterior: Date | null
  ahora: Date
}): void => {
  if (Number.isNaN(nueva.getTime())) throw fechaInvalida()
  if (anterior !== null && nueva.getTime() === anterior.getTime()) return
  if (nueva.getTime() <= ahora.getTime()) throw fechaInvalida()
  if (nueva.getTime() - ahora.getTime() > DIAS_MAXIMOS_FECHA_LIMITE * MS_POR_DIA) {
    throw fechaInvalida()
  }
}

// P-01 (a): opcional mientras la clase no tiene categorías; con al menos una, toda tarea nueva o
// editada lleva una.
export const validarCategoriaRequerida = ({
  categoriaId,
  categoriasEnLaClase,
}: {
  categoriaId: string | null
  categoriasEnLaClase: number
}): void => {
  if (categoriaId !== null || categoriasEnLaClase === 0) return
  throw new AppError("CATEGORIA_REQUERIDA", "Elige la categoría de la tarea.", 409)
}

// ENTREGAS-01b (S-06, modificada por el humano el 2026-10-11; §D-3.8). El mensaje del 409, en
// singular o plural, según quién lo recibe; la interfaz lo muestra tal cual.
// N-19 de CALIFICACIONES-01 (2026-10-26): con P-03 (c′) una calificada sin entrega cuenta, así que el texto cuenta alumnos con entrega o calificación.
export const mensajeTareaConEntregas = (entregas: number, rolDelActor: Rol): string => {
  const cuantos =
    entregas === 1
      ? "1 alumno con entrega o calificación"
      : `${String(entregas)} alumnos con entrega o calificación`
  if (rolDelActor === "admin") {
    const cuales =
      entregas === 1 ? "su entrega, su calificación" : "sus entregas, sus calificaciones"
    return `Esta tarea tiene ${cuantos}. Si la borras, también se borrarán ${cuales} y los comentarios privados, y no se puede deshacer.`
  }
  return `Esta tarea tiene ${cuantos} y no se puede borrar. Si de verdad hay que borrarla, pídelo a administración.`
}

// Una tarea con entregas (entregado o calificado) no se borra sin confirmarlo, y solo el admin puede
// confirmarlo. Con 0 entregas no lanza nunca. Mira el rol del actor igual que puedeBorrarTarea: es
// una regla de negocio de core/, no una verificación de permisos del handler.
export const exigirBorradoConEntregasPermitido = ({
  rolDelActor,
  entregas,
  confirmarEntregas,
}: {
  rolDelActor: Rol
  entregas: number
  confirmarEntregas: boolean
}): void => {
  if (entregas <= 0) return
  if (confirmarEntregas && rolDelActor === "admin") return
  throw new AppError("TAREA_CON_ENTREGAS", mensajeTareaConEntregas(entregas, rolDelActor), 409)
}

// ENTREGAS-01a (P-05 a′, §D-7): otra persona guardó o movió la tarea mientras se editaba. El
// formulario recarga solo, así que el texto no pide cargar nada y sigue siendo cierto si la recarga
// falla.
export const tareaModificada = (): AppError =>
  new AppError(
    "TAREA_MODIFICADA",
    "Otra persona guardó cambios en esta tarea mientras la editabas. Tus cambios no se guardaron: vuelve a hacerlos sobre la versión actual.",
    409,
  )
