import {
  listaClasesImpartidasRespuestaSchema,
  listaClasesInscritasRespuestaSchema,
} from "@campus/shared"
import { queryOptions } from "@tanstack/react-query"

import { api } from "@/services/apiClient"

// Claves de las listas de clases del usuario, compartidas por features/clases (que las invalida al
// unirse, dar de alta o de baja) y por components/layout (la lista de la barra lateral). Viven aquí
// para que components/layout no importe de features/ (A-6 de CLASES-02, regla 5 de CLAUDE.md).
export const CLAVE_CLASES_INSCRITAS = ["clases", "inscritas"] as const
export const CLAVE_CLASES_IMPARTIDAS = ["clases", "impartidas"] as const

// La barra pide una sola página de hasta 100 clases. Su clave cuelga de la de cada lista, así que
// toda invalidación por prefijo que ya hace features/clases la alcanza.
const LIMITE_CLASES_DE_LA_BARRA = 100

// Lo único que la barra pinta de una clase y si hay más de las que caben en la página.
const pedirClasesDeLaBarra = async (rol: "estudiante" | "maestro") => {
  if (rol === "estudiante") {
    const pagina = await api(`/api/clases/inscritas?limite=${LIMITE_CLASES_DE_LA_BARRA}`, {
      schema: listaClasesInscritasRespuestaSchema,
    })
    return {
      clases: pagina.clases.map(({ id, nombre }) => ({ id, nombre })),
      hayMas: pagina.siguienteCursor !== null,
    }
  }
  const pagina = await api(`/api/clases/impartidas?limite=${LIMITE_CLASES_DE_LA_BARRA}`, {
    schema: listaClasesImpartidasRespuestaSchema,
  })
  return {
    clases: pagina.clases.map(({ id, nombre }) => ({ id, nombre })),
    hayMas: pagina.siguienteCursor !== null,
  }
}

export const consultaClasesDeLaBarra = (rol: "estudiante" | "maestro") =>
  queryOptions({
    queryKey: [
      ...(rol === "estudiante" ? CLAVE_CLASES_INSCRITAS : CLAVE_CLASES_IMPARTIDAS),
      "barra",
    ],
    queryFn: () => pedirClasesDeLaBarra(rol),
  })
