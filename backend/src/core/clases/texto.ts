// Normaliza un texto largo (descripción de clase, publicación o comentario) antes de guardarlo:
// CRLF y CR se convierten a LF y se recorta en los extremos, sin tocar el interior (§D-C4).
export const normalizarTextoLargo = (texto: string): string =>
  texto.replace(/\r\n|\r/g, "\n").trim()
