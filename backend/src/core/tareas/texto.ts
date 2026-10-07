import { normalizarTextoLargo } from "@campus/shared"

import { conTextosNormalizados } from "../clases/texto.js"

// §D-4: normaliza título e instrucciones y el criterio de cada elemento de la rúbrica ANTES de
// validar (CRLF y CR a LF, recorte en los extremos). Solo toca lo que llega como texto; cualquier
// otra forma se deja intacta para que el esquema la rechace. No muta lo recibido.
export const conTextosDeTareaNormalizados = (cuerpo: unknown): unknown => {
  const normalizado = conTextosNormalizados(cuerpo, ["titulo", "instrucciones"])
  if (typeof normalizado !== "object" || normalizado === null || Array.isArray(normalizado)) {
    return normalizado
  }
  const objeto = normalizado as Record<string, unknown>
  const { rubrica } = objeto
  if (!Array.isArray(rubrica)) return normalizado
  return {
    ...objeto,
    rubrica: rubrica.map((criterio: unknown) => {
      if (typeof criterio !== "object" || criterio === null || Array.isArray(criterio)) {
        return criterio
      }
      const entrada = criterio as Record<string, unknown>
      if (typeof entrada.criterio !== "string") return criterio
      return { ...entrada, criterio: normalizarTextoLargo(entrada.criterio) }
    }),
  }
}
