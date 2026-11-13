import { Link, useNavigate } from "react-router"

import { ConClaseDeLaRuta } from "@/components/clase/con-clase-de-la-ruta"
import { TEXTOS_DE_LA_CLASE } from "@/components/clase/data"
import {
  useGeneracionDeSoloLectura,
  useMontado,
  useSoloLecturaDeLaClase,
} from "@/components/clase/hooks"
import { MensajeError } from "@/components/mensaje-error"
import { buttonVariants } from "@/components/ui/button-variants"

import { FormularioTarea } from "./components/formulario-tarea"
import { TEXTOS_FORMULARIO_TAREA } from "./data"
import { useCrearTarea, useRutaDeLaClase } from "./hooks"
import type { CrearTarea } from "./types"

interface CrearTareaDeLaClaseProps {
  claseId: string
}

// §D-10, DESIGN.md §7.21: crear una tarea. Al terminar navega al detalle de la tarea nueva (el aviso
// "Tarea publicada" lo da el hook); "Cancelar" vuelve al muro. El backend decide quién puede crear.
function CrearTareaDeLaClase({ claseId }: CrearTareaDeLaClaseProps) {
  const { base } = useRutaDeLaClase(claseId)
  const navigate = useNavigate()
  const crear = useCrearTarea(claseId)
  // ADMIN-01d2 (§D-9, fila 35; T-02 de 01d1): en una clase archivada la ruta lo dice, sin formulario. Un
  // guardado de un formulario de una generación anterior no navega: el aviso lo da el gancho.
  const soloLectura = useSoloLecturaDeLaClase()
  const { generacion, sigueVigente } = useGeneracionDeSoloLectura()
  // CHORE-06a (§D-1, Forma A): la vista lleva key por la clase. Un guardado de otra clase que llega con
  // esta vista ya desmontada no navega al detalle de su tarea; el aviso lo da el gancho.
  const montado = useMontado()

  const handleGuardar = async (datos: CrearTarea) => {
    const { tarea } = await crear.mutateAsync(datos)
    if (!montado.current || !sigueVigente(generacion)) return
    navigate(`${base}/tareas/${tarea.id}`)
  }

  if (soloLectura) {
    return (
      <div className="flex flex-col items-start gap-3">
        <MensajeError mensaje={TEXTOS_DE_LA_CLASE.archivada} />
        <Link to={`${base}/trabajo`} className={buttonVariants({ variant: "outline" })}>
          {TEXTOS_FORMULARIO_TAREA.volverAActividades}
        </Link>
      </div>
    )
  }

  return (
    <FormularioTarea
      claseId={claseId}
      tarea={null}
      cancelarA={base}
      pendiente={crear.isPending}
      onGuardar={handleGuardar}
      version={null}
    />
  )
}

export function CrearTareaView() {
  return (
    <ConClaseDeLaRuta>
      {(claseId) => <CrearTareaDeLaClase key={claseId} claseId={claseId} />}
    </ConClaseDeLaRuta>
  )
}
