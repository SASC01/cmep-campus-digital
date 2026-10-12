import { claveDeNombre, MAXIMO_TEMAS_POR_CLASE } from "@campus/shared"

import { AppError } from "../errores.js"
import type { RelacionConClase } from "../clases/pertenencia.js"

// Puras (§D-2, TAREAS-01a): reglas de los temas de una clase. El adaptador las llama dentro de la
// transacción, con la fila de la clase bloqueada (§D-7), así que dos peticiones simultáneas de la
// misma clase nunca deciden sobre la misma lista vieja.

export interface TemaExistente {
  id: string
  nombre: string
}

// Mismo criterio que las categorías (S-05): sin distinguir mayúsculas, acentos, espacios de más,
// invisibles ni formas de compatibilidad (claveDeNombre, de shared/).
const clave = claveDeNombre

const temaRepetido = (): AppError =>
  new AppError("TEMA_REPETIDO", "Ya hay un tema con ese nombre.", 409)

export const validarNuevoTema = (existentes: readonly TemaExistente[], nombre: string): void => {
  if (existentes.length >= MAXIMO_TEMAS_POR_CLASE) {
    throw new AppError(
      "TOPE_DE_TEMAS",
      `La clase ya tiene ${MAXIMO_TEMAS_POR_CLASE} temas. Borra uno antes de crear otro.`,
      409,
    )
  }
  const buscado = clave(nombre)
  if (existentes.some((tema) => clave(tema.nombre) === buscado)) throw temaRepetido()
}

// Renombrar un tema a su mismo nombre (aunque cambie la capitalización) pasa: no se cuenta a sí mismo.
export const validarRenombre = (
  existentes: readonly TemaExistente[],
  temaId: string,
  nombre: string,
): void => {
  const id = temaId.toLowerCase()
  if (!existentes.some((tema) => tema.id.toLowerCase() === id)) {
    throw new AppError("TEMA_NO_ENCONTRADO", "Ese tema ya no existe.", 404)
  }
  const buscado = clave(nombre)
  if (existentes.some((tema) => tema.id.toLowerCase() !== id && clave(tema.nombre) === buscado)) {
    throw temaRepetido()
  }
}

// Sin temas es 0; con huecos (se borró uno), el mayor más 1.
export const siguienteOrden = (ordenes: readonly number[]): number =>
  ordenes.length === 0 ? 0 : Math.max(...ordenes) + 1

// El orden nuevo debe ser exactamente el conjunto actual (mismos ids, sin repetir ni faltar): si un
// tema se creó o se borró mientras el maestro ordenaba, la lista está desactualizada.
export const validarOrdenDeTemas = (
  actuales: readonly string[],
  propuestos: readonly string[],
): void => {
  const esperados = new Set(actuales.map((id) => id.toLowerCase()))
  const recibidos = new Set(propuestos.map((id) => id.toLowerCase()))
  const igual =
    propuestos.length === actuales.length &&
    recibidos.size === propuestos.length &&
    esperados.size === recibidos.size &&
    [...recibidos].every((id) => esperados.has(id))
  if (igual) return
  throw new AppError(
    "ORDEN_DESACTUALIZADO",
    "Los temas cambiaron mientras los ordenabas. Vuelve a intentarlo.",
    409,
  )
}

// P-02 (b): mover un elemento de tema organiza la clase y no cuenta como editarlo; lo hacen los
// maestros de la clase y el admin. El estudiante nunca.
export const puedeMoverElemento = (relacion: RelacionConClase): boolean =>
  relacion === "maestro" || relacion === "admin"
