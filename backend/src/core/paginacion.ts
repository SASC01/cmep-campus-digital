// Paginación por cursor genérica (§D-A4): los repositorios piden `take: limite + 1` filas y esta
// función corta la página y calcula el cursor siguiente, sin tocar la base.
export const paginar = <T>(
  filas: T[],
  limite: number,
  cursorDe: (fila: T) => string,
): { pagina: T[]; siguienteCursor: string | null } => {
  const hayMas = filas.length > limite
  const pagina = hayMas ? filas.slice(0, limite) : filas
  const ultima = pagina.at(-1)
  const siguienteCursor = hayMas && ultima !== undefined ? cursorDe(ultima) : null
  return { pagina, siguienteCursor }
}
