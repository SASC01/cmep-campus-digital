import { DIAS_MAXIMOS_FECHA_LIMITE } from "@campus/shared"

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
