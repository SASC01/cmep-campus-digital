import { CircleCheck } from "lucide-react"

import { Cargando } from "@/components/cargando"
import { MensajeError } from "@/components/mensaje-error"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { formatearFechaHora } from "@/lib/format"
import { esApiError } from "@/services/apiClient"

import { useSalud } from "./hooks"

// Vista temporal (P-02 del plan FRONT-01): se mueve a admin o se elimina cuando exista ese módulo.
export function DiagnosticoView() {
  const { data, isPending, isError, error } = useSalud()

  if (isError) {
    const detalle = esApiError(error)
      ? `${error.codigo}: ${error.message}`
      : "Error desconocido al consultar la API."
    return (
      <div className="p-6">
        <MensajeError titulo="No se pudo consultar /api/salud" mensaje={detalle} />
      </div>
    )
  }

  if (isPending) {
    return (
      <div className="p-6">
        <Cargando texto="Consultando /api/salud…" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <Card className="max-w-md">
        <CardHeader>
          <h1 className="font-heading text-xl font-bold tracking-tight">Diagnóstico de conexión</h1>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            <li className="flex items-center gap-2">
              <CircleCheck aria-hidden="true" className="size-4 text-success" />
              <span>{`API: ${data.estado}`}</span>
            </li>
            <li className="flex items-center gap-2">
              <CircleCheck aria-hidden="true" className="size-4 text-success" />
              <span>{`Base de datos: ${data.baseDeDatos}`}</span>
            </li>
            <li className="text-sm text-muted-foreground">
              {`Última respuesta: ${formatearFechaHora(data.marcaDeTiempo)}`}
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
