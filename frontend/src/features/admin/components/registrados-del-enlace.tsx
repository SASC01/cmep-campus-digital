import { Cargando } from "@/components/cargando"
import { EstadoVacio } from "@/components/estado-vacio"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatearFechaHora } from "@/lib/format"

import { TEXTOS_MAESTROS } from "../data"
import { useRegistradosDelEnlace } from "../hooks"
import { mensajeDeErrorAdmin, textoOcultoDeFila } from "../lib"

interface RegistradosDelEnlaceProps {
  enlaceId: string
  // R-18 (Enmienda 6, decidido por el manager): con dos filas expandidas, "Cargar más" repetiría su
  // nombre accesible. Mismo patrón que los botones de fila de TablaEnlaces (§D-B6): el texto visible
  // no cambia, el dato que distingue la fila va después, como texto sr-only.
  creadoEnDelEnlace: string
}

// AUTH-03b, §D-B6: tabla de registrados dentro de la fila expandida de un enlace. Su vacío no lleva
// acción (§7.10, excepción documentada): ahí no hay nada que hacer.
export function RegistradosDelEnlace({ enlaceId, creadoEnDelEnlace }: RegistradosDelEnlaceProps) {
  const registrados = useRegistradosDelEnlace(enlaceId)

  if (registrados.isError) {
    return <MensajeError mensaje={mensajeDeErrorAdmin(registrados.error)} />
  }

  if (registrados.isLoading || !registrados.data) {
    return <Cargando />
  }

  const filas = registrados.data.pages.flatMap((pagina) => pagina.registrados)

  if (filas.length === 0) {
    return <EstadoVacio titulo={TEXTOS_MAESTROS.enlaces.registrados.vacioTitulo} />
  }

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{TEXTOS_MAESTROS.enlaces.registrados.nombre}</TableHead>
            <TableHead>{TEXTOS_MAESTROS.enlaces.registrados.correo}</TableHead>
            <TableHead>{TEXTOS_MAESTROS.enlaces.registrados.registro}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map((registrado) => (
            <TableRow key={registrado.id}>
              <TableCell>{registrado.nombre}</TableCell>
              <TableCell>{registrado.email}</TableCell>
              <TableCell>{formatearFechaHora(registrado.creadoEn)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {registrados.hasNextPage && (
        <Button
          type="button"
          variant="outline"
          onClick={() => void registrados.fetchNextPage()}
          enEspera={registrados.isFetchingNextPage}
        >
          {TEXTOS_MAESTROS.enlaces.registrados.cargarMas}{" "}
          <span className="sr-only">
            {textoOcultoDeFila(
              TEXTOS_MAESTROS.enlaces.ocultoDeFila.cargarMasRegistrados,
              formatearFechaHora(creadoEnDelEnlace),
            )}
          </span>
        </Button>
      )}
    </div>
  )
}
