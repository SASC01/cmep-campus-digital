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
import { TEXTOS_FORMULARIO_FORO } from "./data"
import { useCrearForo, useRutaDeLaClase } from "./hooks"
import { cuerpoDeForo } from "./lib"
import type { CrearTarea } from "./types"

interface CrearForoDeLaClaseProps {
  claseId: string
}

// FORO-01c2 (§D-8.3, DESIGN.md §7.21): crear un foro, como crear una tarea. Al publicar navega al
// detalle del foro nuevo (el aviso "Foro publicado" lo da el gancho); "Cancelar" vuelve a "Foro". En una
// clase archivada la ruta lo dice, sin formulario, con "Volver a Foro". El backend decide quién crea.
function CrearForoDeLaClase({ claseId }: CrearForoDeLaClaseProps) {
  const { base } = useRutaDeLaClase(claseId)
  const navigate = useNavigate()
  const crear = useCrearForo(claseId)
  const soloLectura = useSoloLecturaDeLaClase()
  const { generacion, sigueVigente } = useGeneracionDeSoloLectura()
  // CHORE-06a (§D-1, Forma A): la vista lleva key por la clase. Un guardado que llega con esta vista ya
  // desmontada no navega; el aviso lo da el gancho.
  const montado = useMontado()

  const handleGuardar = async (datos: CrearTarea) => {
    const { foro } = await crear.mutateAsync(cuerpoDeForo(datos))
    if (!montado.current || !sigueVigente(generacion)) return
    navigate(`${base}/foros/${foro.id}`)
  }

  if (soloLectura) {
    return (
      <div className="flex flex-col items-start gap-3">
        <MensajeError mensaje={TEXTOS_DE_LA_CLASE.archivada} />
        <Link to={`${base}/foro`} className={buttonVariants({ variant: "outline" })}>
          {TEXTOS_FORMULARIO_FORO.volverAForo}
        </Link>
      </div>
    )
  }

  return (
    <FormularioTarea
      claseId={claseId}
      tarea={null}
      tipo="foro"
      cancelarA={`${base}/foro`}
      pendiente={crear.isPending}
      onGuardar={handleGuardar}
      version={null}
    />
  )
}

export function CrearForoView() {
  return (
    <ConClaseDeLaRuta>
      {(claseId) => <CrearForoDeLaClase key={claseId} claseId={claseId} />}
    </ConClaseDeLaRuta>
  )
}
