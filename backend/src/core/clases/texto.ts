// La definición vive en shared/ (T-31, Enmienda 8): el servidor y los formularios aplican la misma
// regla. Aquí solo se reexporta para el resto del backend.
import { normalizarTextoLargo } from "@campus/shared"

export { normalizarTextoLargo }

// §D-C4 (T-01 de a): normalizarTextoLargo corre ANTES de validar. Si se validara primero, el CR de
// un texto escrito en Windows haría fallar el refine de caracteres de control. Solo toca los campos
// que llegan como cadena; cualquier otra forma se deja intacta para que el esquema la rechace.
// No muta el objeto recibido.
export const conTextosNormalizados = (cuerpo: unknown, campos: readonly string[]): unknown => {
  // Un arreglo se deja intacto (M-09): validarCuerpo lo rechaza con su mensaje, en vez de volverlo objeto.
  if (typeof cuerpo !== "object" || cuerpo === null || Array.isArray(cuerpo)) return cuerpo
  const objeto: Record<string, unknown> = { ...(cuerpo as Record<string, unknown>) }
  for (const campo of campos) {
    const valor = objeto[campo]
    if (typeof valor === "string") objeto[campo] = normalizarTextoLargo(valor)
  }
  return objeto
}
