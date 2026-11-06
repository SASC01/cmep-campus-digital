// ADMIN-01 (§D-2, corrección de la Enmienda 5, M-08 y R-19): la posición del cursor protege solo la
// fila del cursor; si otra fila se mueve entre dos páginas, el servidor puede repetirla. Al unir las
// páginas se queda la primera aparición de cada `id` (la que la persona ya vio), en su orden. No
// recupera una fila saltada: esa aparece al volver a abrir la lista. No muta la entrada.
export const unirPaginasSinRepetidas = <T extends { id: string }>(
  paginas: readonly (readonly T[])[],
): T[] => {
  const vistos = new Set<string>()
  const filas: T[] = []
  for (const pagina of paginas) {
    for (const fila of pagina) {
      if (vistos.has(fila.id)) continue
      vistos.add(fila.id)
      filas.push(fila)
    }
  }
  return filas
}
