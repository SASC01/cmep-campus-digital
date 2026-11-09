import { ListaDeClasesAnteriores } from "./components/lista-de-clases-anteriores"
import { TEXTOS_CLASES_ANTERIORES } from "./data"
import { rutaDeClaseAnterior } from "./lib"

// ADMIN-01d2 (§D-9): las clases archivadas del alumno. Cada una abre sus calificaciones.
export function ClasesAnterioresView() {
  const { titulo, vacio, error } = TEXTOS_CLASES_ANTERIORES.anteriores

  return (
    <ListaDeClasesAnteriores
      titulo={titulo}
      vacio={vacio}
      error={error}
      destino={rutaDeClaseAnterior}
    />
  )
}
