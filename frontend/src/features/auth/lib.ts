import type { Anuncio } from "./types"

// Copia ordenada por orden ascendente. Array.prototype.sort es estable; se copia para no mutar.
export const ordenarAnuncios = (anuncios: readonly Anuncio[]): Anuncio[] =>
  [...anuncios].sort((a, b) => a.orden - b.orden)
