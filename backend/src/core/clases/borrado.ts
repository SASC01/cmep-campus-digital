import { AppError } from "../errores.js"

// ADMIN-01b (§D-4, DH-04). Borrado definitivo de una clase archivada: solo de una archivada, nunca
// con copias de archivos en curso (las suyas o las de otra clase que apuntan a las suyas) y solo con
// la confirmación explícita.

export const errorClaseNoArchivadaParaBorrar = (): AppError =>
  new AppError("CLASE_NO_ARCHIVADA", "Solo se borra una clase archivada. Archívala primero.", 409)

// También lo usa duplicar (§D-5, paso 2b): el mismo texto en las dos rutas.
export const errorClaseConCopiasEnCurso = (): AppError =>
  new AppError(
    "CLASE_CON_COPIAS_EN_CURSO",
    "Esta clase tiene archivos que todavía se están copiando. Inténtalo en unos minutos.",
    409,
  )

export const errorConfirmacionRequerida = (): AppError =>
  new AppError("CONFIRMACION_REQUERIDA", "Confirma el borrado definitivo de la clase.", 409)

// El orden es parte de la regla: una clase activa responde que no se borra aunque falte confirmar
// (la confirmación no la haría borrable), y las copias en curso se dicen antes de pedir confirmación.
export const decidirBorrado = ({
  archivadaEn,
  hayCopiasEnCurso,
  confirmado,
}: {
  archivadaEn: Date | null
  hayCopiasEnCurso: boolean
  confirmado: boolean
}): AppError | null => {
  if (archivadaEn === null) return errorClaseNoArchivadaParaBorrar()
  if (hayCopiasEnCurso) return errorClaseConCopiasEnCurso()
  if (!confirmado) return errorConfirmacionRequerida()
  return null
}

// Lotes de hasta `tamano` elementos, en el orden recibido. Sin lotes vacíos: una lista vacía da cero.
export const partirEnLotes = <T>(elementos: readonly T[], tamano: number): T[][] => {
  if (!Number.isInteger(tamano) || tamano < 1) {
    throw new AppError("ERROR_INTERNO", "El tamaño de un lote debe ser un entero positivo.", 500)
  }
  const lotes: T[][] = []
  for (let inicio = 0; inicio < elementos.length; inicio += tamano) {
    lotes.push(elementos.slice(inicio, inicio + tamano))
  }
  return lotes
}
