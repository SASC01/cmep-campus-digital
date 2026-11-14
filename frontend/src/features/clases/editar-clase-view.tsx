import { Link } from "react-router"

import { Cargando } from "@/components/cargando"
import { TEXTOS_DE_LA_CLASE } from "@/components/clase/data"
import { useSoloLecturaDeLaClase } from "@/components/clase/hooks"
import { MensajeError } from "@/components/mensaje-error"
import { buttonVariants } from "@/components/ui/button-variants"
import { baseDeClase } from "@/lib/ruta-de-clase"

import { ConClaseDeLaRuta } from "./components/con-clase-de-la-ruta"
import { FormularioClase } from "./components/formulario-clase"
import { TEXTOS_CLASE_ARCHIVADA } from "./data"
import { useClase } from "./hooks"
import { mensajeDeConsultaClases } from "./lib"

interface EditarClaseDeLaRutaProps {
  claseId: string
}

// PR-A21d: precarga los datos con useClase antes de mostrar el formulario.
function EditarClaseDeLaRuta({ claseId }: EditarClaseDeLaRutaProps) {
  const { data, isError, error, isLoading } = useClase(claseId)
  const soloLectura = useSoloLecturaDeLaClase()

  // ADMIN-01d1 (§D-9, fila 21): una clase archivada no se edita (RN-10). La ruta lo dice, con "Volver
  // a la clase", sin formulario. Solo el admin tiene esta ruta.
  if (soloLectura) {
    return (
      <div className="flex flex-col items-start gap-3">
        <MensajeError mensaje={TEXTOS_DE_LA_CLASE.archivada} />
        <Link to={baseDeClase("admin", claseId)} className={buttonVariants({ variant: "outline" })}>
          {TEXTOS_CLASE_ARCHIVADA.volverALaClase}
        </Link>
      </div>
    )
  }

  if (isError) {
    return <MensajeError mensaje={mensajeDeConsultaClases(error)} />
  }

  if (isLoading || !data) {
    return <Cargando />
  }

  return (
    <FormularioClase
      modo="editar"
      claseId={data.id}
      valoresIniciales={{ nombre: data.nombre, descripcion: data.descripcion }}
    />
  )
}

export function EditarClaseView() {
  return (
    <ConClaseDeLaRuta>
      {(claseId) => <EditarClaseDeLaRuta key={claseId} claseId={claseId} />}
    </ConClaseDeLaRuta>
  )
}
