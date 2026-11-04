import { useRef, useState, type ReactNode } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router"

import { Cargando } from "@/components/cargando"
import { claveDeFocoDeLaConsulta } from "@/components/foco/lib"
import { useFocoAlPerderseElControl } from "@/components/foco/hooks"
import { MensajeError } from "@/components/mensaje-error"
import { buttonVariants } from "@/components/ui/button-variants"
import { baseDeClase } from "@/lib/ruta-de-clase"

import { ConClaseDeLaRuta } from "./components/con-clase-de-la-ruta"
import { FormularioRecurso } from "./components/formulario-recurso"
import { MENSAJES_ERROR_CLASES_GENERALES, TEXTOS_EDITAR_RECURSO } from "./data"
import { useAvisoDeRecargaFallida, useMontado, useRecurso } from "./hooks"
import {
  avisoDeRecargaFallidaDelRecurso,
  errorQueReemplazaElRecurso,
  mensajeDeConsultaClases,
  perspectivaDeRuta,
} from "./lib"

interface MensajeConVolverProps {
  mensaje: string
  volverA: string
}

// Un mensaje que reemplaza la vista, con el enlace "Volver a Recursos" (§D-8.6).
function MensajeConVolver({ mensaje, volverA }: MensajeConVolverProps) {
  return (
    <div className="flex flex-col items-start gap-3">
      <MensajeError mensaje={mensaje} />
      <Link to={volverA} className={buttonVariants({ variant: "outline" })}>
        {TEXTOS_EDITAR_RECURSO.volver}
      </Link>
    </div>
  )
}

interface EditarRecursoDeLaClaseProps {
  claseId: string
  recursoId: string
}

// CLASES-03d (§D-8.6, DESIGN.md §7.21 y §7.30): "Editar recurso", para los maestros de la clase y el
// admin. Carga el recurso (error → cargando → datos) y solo muestra el formulario si el servidor dice
// `puedeEditar`. Reemplazan la vista, con "Volver a Recursos": la primera carga fallida, el recurso que ya
// no existe, la clase sin acceso (o un VALIDACION de esos ids) y `puedeEditar: false`. Una recarga que
// falla con el recurso en caché conserva el formulario y avisa una vez por fallo. Al guardar, vuelve a
// "Recursos".
function EditarRecursoDeLaClase({ claseId, recursoId }: EditarRecursoDeLaClaseProps) {
  const { pathname } = useLocation()
  const base = baseDeClase(perspectivaDeRuta(pathname), claseId)
  const destino = `${base}/recursos`
  const navigate = useNavigate()
  const montado = useMontado()
  const consulta = useRecurso(claseId, recursoId)
  const raizRef = useRef<HTMLDivElement>(null)
  // §7.21 (P-05 a′ de ENTREGAS-01a): cuántas veces se reinició el formulario tras un 409
  // RECURSO_MODIFICADO. Es la `key` del formulario: solo la recarga tras el conflicto la cambia, así que
  // ninguna otra recarga toca lo escrito ni la versión de apertura.
  const [reinicios, setReinicios] = useState(0)
  const hayRecurso = consulta.data !== undefined
  // §7.21, "Lectura fresca al abrir": si al abrir la edición el recurso en caché se está recargando (por
  // ejemplo, alguien lo movió de tema y subió su versión), el formulario espera esa primera lectura y nace
  // con la versión fresca. Solo la primera: las recargas posteriores no desmontan ni reinician nada.
  const [esperaLaLecturaFresca, setEsperaLaLecturaFresca] = useState(
    () => hayRecurso && consulta.isFetching && consulta.isStale,
  )
  if (esperaLaLecturaFresca && !consulta.isFetching) setEsperaLaLecturaFresca(false)
  const esperando = esperaLaLecturaFresca && consulta.isFetching
  const reemplaza = consulta.isError && errorQueReemplazaElRecurso(hayRecurso, consulta.error)

  // R8 (§D-10): con el recurso en caché, una recarga fallida que no reemplaza la vista avisa una vez por
  // fallo; volver a montar la vista con el fallo ya ocurrido no lo repite.
  useAvisoDeRecargaFallida(
    consulta.errorUpdateCount,
    hayRecurso && !errorQueReemplazaElRecurso(hayRecurso, consulta.error),
    avisoDeRecargaFallidaDelRecurso(consulta.error),
  )
  // §7.14: si una recarga quita el formulario (el recurso ya no existe, se perdió el acceso o
  // `puedeEditar`) con el foco dentro, el foco va a la raíz de la vista y no a <body>.
  useFocoAlPerderseElControl(raizRef, claveDeFocoDeLaConsulta(recursoId, consulta))

  const contenido = (): ReactNode => {
    if (reemplaza) {
      return (
        <MensajeConVolver mensaje={mensajeDeConsultaClases(consulta.error)} volverA={destino} />
      )
    }

    if (consulta.isLoading || !consulta.data || esperando) {
      return <Cargando texto={TEXTOS_EDITAR_RECURSO.cargando} />
    }

    const { recurso } = consulta.data

    if (!recurso.puedeEditar) {
      return <MensajeConVolver mensaje={TEXTOS_EDITAR_RECURSO.noPuedes} volverA={destino} />
    }

    // Con la vista desmontada (la persona ya está en otra pantalla) el gancho avisa y no se navega.
    const alGuardar = () => {
      if (!montado.current) return
      navigate(destino)
    }

    // §7.21: una sola petición, esperada. Con éxito y con `puedeEditar`, el formulario se remonta con la
    // versión nueva (lo escrito y los elegidos se descartan). Si falla, o el recurso ya no existe, o se
    // perdió el acceso o `puedeEditar`, no se reinicia: la vista reacciona como en cualquier recarga.
    // T-01 (ronda 1 de 03d): con la vista desmontada, el 409 solo avisa (lo da el gancho) y no vuelve a
    // pedir el recurso (§D-14, "El aviso sale; sin recarga"), como alGuardar no navega.
    const recargarTrasConflicto = async () => {
      if (!montado.current) return
      const resultado = await consulta.refetch()
      if (!resultado.isSuccess || !resultado.data.recurso.puedeEditar) return
      setReinicios((n) => n + 1)
    }

    return (
      <FormularioRecurso
        key={reinicios}
        modo="editar"
        claseId={claseId}
        recurso={recurso}
        cancelarA={destino}
        onGuardado={alGuardar}
        onConflicto={recargarTrasConflicto}
        enfocarAlMontar={reinicios > 0}
      />
    )
  }

  return (
    <div ref={raizRef} tabIndex={-1}>
      {contenido()}
    </div>
  )
}

export function EditarRecursoView() {
  const { recursoId } = useParams<{ recursoId: string }>()

  return (
    <ConClaseDeLaRuta>
      {(claseId) => {
        if (recursoId === undefined) {
          return <MensajeError mensaje={MENSAJES_ERROR_CLASES_GENERALES.recursoNoEncontrado} />
        }
        return <EditarRecursoDeLaClase claseId={claseId} recursoId={recursoId} />
      }}
    </ConClaseDeLaRuta>
  )
}
