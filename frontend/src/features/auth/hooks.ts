import { useMemo } from "react"

import { ANUNCIOS_DE_EJEMPLO } from "./data"
import { ordenarAnuncios } from "./lib"
import type { Anuncio } from "./types"

// Pasará a useQuery sobre el endpoint público de anuncios del login (RF-07) cuando exista.
export const useAnunciosLogin = (): { anuncios: Anuncio[] } => {
  const anuncios = useMemo(() => ordenarAnuncios(ANUNCIOS_DE_EJEMPLO), [])
  return { anuncios }
}
