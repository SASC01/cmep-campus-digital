// S-06: variante de color de una clase, derivada de su id (UUID), sin guardarse ni elegirse. La
// usan la tarjeta de features/clases y la lista de la barra lateral (A-6 de CLASES-02, regla 5 de
// CLAUDE.md); features/clases/lib.ts y types.ts la reexportan.
export type VarianteDeClase = "verde" | "azul" | "blanca"

const VARIANTES: readonly VarianteDeClase[] = ["verde", "azul", "blanca"]

// La suma de los puntos de código módulo 3 reparte entre las tres variantes.
export const varianteDeClase = (claseId: string): VarianteDeClase => {
  let suma = 0
  for (const caracter of claseId) suma += caracter.codePointAt(0) ?? 0
  return VARIANTES[suma % 3] ?? "blanca"
}
