import { baseDeClase } from "@/lib/ruta-de-clase"

import { ListaDeClasesAnteriores } from "./components/lista-de-clases-anteriores"
import { TEXTOS_CLASES_ANTERIORES } from "./data"

// ADMIN-01d2 (§D-9): las clases archivadas del maestro. Cada una se abre en su ruta normal, en solo lectura.
export function ClasesArchivadasView() {
  const { titulo, vacio, error } = TEXTOS_CLASES_ANTERIORES.archivadas

  return (
    <ListaDeClasesAnteriores
      titulo={titulo}
      vacio={vacio}
      error={error}
      destino={(claseId) => baseDeClase("maestro", claseId)}
    />
  )
}
