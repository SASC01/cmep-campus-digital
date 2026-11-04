import { FileSpreadsheet } from "lucide-react"
import { useEffect, useRef } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import { ID_DEL_AVISO_DE_EXPORTACION, TEXTOS_EXPORTACION } from "../data"
import { useExportarCalificaciones } from "../hooks"
import {
  avisoDelResultadoDeExportacion,
  errorQueRedirigeElCliente,
  mensajeDeErrorDeExportacion,
} from "../lib"

interface ExportarAExcelProps {
  claseId: string
  pidiendoLaVentana: boolean
}

// CALIFICACIONES-02b (§D-7, DESIGN.md §7.28). «Exportar a Excel» del gradebook: exporta toda la clase,
// no la ventana. Espera mientras exporta y mientras el gradebook pide una ventana, con una guarda
// síncrona contra el doble clic. Un aviso a la vez (id fijo), nunca con el texto del servidor; el
// foco se queda en el botón. Si la vista se va con la exportación en vuelo, se aborta sin aviso ni
// descarga (DH-08 a).
export function ExportarAExcel({ claseId, pidiendoLaVentana }: ExportarAExcelProps) {
  const exportar = useExportarCalificaciones(claseId)
  const exportandoRef = useRef(false)
  const controladorRef = useRef<AbortController | null>(null)

  useEffect(
    () => () => {
      controladorRef.current?.abort()
    },
    [],
  )

  const handleExportar = async () => {
    if (exportandoRef.current || pidiendoLaVentana) return
    exportandoRef.current = true
    toast.dismiss(ID_DEL_AVISO_DE_EXPORTACION)
    const controlador = new AbortController()
    controladorRef.current = controlador
    try {
      const resultado = await exportar.mutateAsync({
        signal: controlador.signal,
        ahora: new Date(),
      })
      if (controlador.signal.aborted) return
      const aviso = avisoDelResultadoDeExportacion(resultado)
      if (aviso === null) return
      if (aviso.tipo === "exito") {
        toast.success(aviso.texto, { id: ID_DEL_AVISO_DE_EXPORTACION })
        return
      }
      toast.error(aviso.texto, { id: ID_DEL_AVISO_DE_EXPORTACION })
    } catch (error) {
      if (controlador.signal.aborted || errorQueRedirigeElCliente(error)) return
      toast.error(mensajeDeErrorDeExportacion(error), { id: ID_DEL_AVISO_DE_EXPORTACION })
    } finally {
      exportandoRef.current = false
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="self-start"
      enEspera={exportar.isPending || pidiendoLaVentana}
      onClick={() => {
        void handleExportar()
      }}
    >
      <FileSpreadsheet aria-hidden="true" />
      {TEXTOS_EXPORTACION.boton}
    </Button>
  )
}
