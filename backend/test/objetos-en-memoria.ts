import type { AlmacenDeObjetos } from "../src/core/archivos/objetos.js"

// ADMIN-01b. Doble en memoria del almacén de objetos (copiar y borrar). Ninguna prueba toca MinIO,
// R2 ni la red: el doble guarda las claves que la prueba declara presentes y registra cada llamada.
export interface ObjetosEnMemoria extends AlmacenDeObjetos {
  readonly claves: Set<string>
  readonly copias: { origen: string; destino: string }[]
  readonly borrados: string[][]
  // Hace que la llamada número `n` (desde 1) a copiar lance un error transitorio, una sola vez.
  fallarEnLaCopia(n: number): void
  // Hace que todas las llamadas a borrar lancen.
  fallarAlBorrar(fallar: boolean): void
}

export const crearObjetosEnMemoria = (presentes: readonly string[] = []): ObjetosEnMemoria => {
  const claves = new Set(presentes)
  const copias: { origen: string; destino: string }[] = []
  const borrados: string[][] = []
  let copiaQueFalla: number | null = null
  let llamadasACopiar = 0
  let borrarFalla = false

  return {
    claves,
    copias,
    borrados,
    fallarEnLaCopia: (n) => {
      copiaQueFalla = n
    },
    fallarAlBorrar: (fallar) => {
      borrarFalla = fallar
    },
    copiar: (origen, destino) => {
      llamadasACopiar += 1
      if (copiaQueFalla === llamadasACopiar) {
        copiaQueFalla = null
        return Promise.reject(new Error("fallo transitorio simulado del almacén"))
      }
      copias.push({ origen, destino })
      if (!claves.has(origen)) return Promise.resolve("origen_inexistente")
      claves.add(destino)
      return Promise.resolve("copiado")
    },
    borrar: (lista) => {
      if (borrarFalla) return Promise.reject(new Error("fallo simulado del almacén al borrar"))
      borrados.push([...lista])
      for (const clave of lista) claves.delete(clave)
      return Promise.resolve()
    },
  }
}
