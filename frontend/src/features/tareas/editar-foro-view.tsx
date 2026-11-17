import { useRef, useState, type ReactNode } from "react"
import { Link, useNavigate, useParams } from "react-router"

import { Cargando } from "@/components/cargando"
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
import { MENSAJES_ERROR_FORO, TEXTOS_DETALLE_FORO, TEXTOS_FORMULARIO_FORO } from "./data"
import {
  useAvisoDeRecargaFallidaDelForo,
  useEditarForo,
  useFocoAlPerderseElControl,
  useForo,
  useRutaDeLaClase,
} from "./hooks"
import {
  avisoDeRecargaFallidaAlEditarElForo,
  claveDeFocoDeLaTarea,
  cuerpoDeForo,
  errorQueReemplazaLaVistaDelForo,
  idCanonicoDeLaRuta,
  mensajeDeConsultaForo,
} from "./lib"
import type { CrearTarea } from "./types"

interface EditarForoDeLaClaseProps {
  claseId: string
  foroId: string
}

interface EdicionDelForoProps {
  claseId: string
  foroId: string
}

// FORO-01c2 (§D-8.3, DESIGN.md §7.21): editar un foro, con la forma de la edición de la tarea (§E8.2,
// C-15): carga el foro (error → cargando → datos) y solo muestra el formulario si el servidor dice
// `puedeEditar`. Al guardar vuelve al detalle. El 409 TAREA_MODIFICADA recarga el foro una sola vez y
// reinicia el formulario con la versión actual; con la vista desmontada, el aviso y nada más (T-01).
// CHORE-06a (§D-1, Forma C): este es el contenido, montado con key por el foro debajo de la raíz.
function EdicionDelForo({ claseId, foroId }: EdicionDelForoProps) {
  const { base } = useRutaDeLaClase(claseId)
  const navigate = useNavigate()
  const consulta = useForo(claseId, foroId)
  const editar = useEditarForo(claseId, foroId)
  const detalle = `${base}/foros/${foroId}`
  const montado = useMontado()
  // Cuántas veces se reinició el formulario tras un 409: es su `key`, y solo recargarTrasConflicto la
  // cambia (ninguna otra recarga toca lo escrito ni la versión de apertura).
  const [reinicios, setReinicios] = useState(0)
  const soloLectura = useSoloLecturaDeLaClase()
  if (soloLectura && reinicios > 0) setReinicios(0)
  const { generacion, sigueVigente } = useGeneracionDeSoloLectura()
  const hayForo = consulta.data !== undefined
  // O-r1-2 de la tarea: si al abrir el foro en caché se está recargando, el formulario espera esa
  // primera lectura y nace con la versión fresca.
  const [esperaLaLecturaFresca, setEsperaLaLecturaFresca] = useState(
    () => hayForo && consulta.isFetching && consulta.isStale,
  )
  if (esperaLaLecturaFresca && !consulta.isFetching) setEsperaLaLecturaFresca(false)
  const esperando = esperaLaLecturaFresca && consulta.isFetching
  // Con el foro en caché, una recarga fallida que no reemplaza la vista se avisa, una vez por fallo.
  useAvisoDeRecargaFallidaDelForo(
    claseId,
    foroId,
    consulta.isError &&
      hayForo &&
      !errorQueReemplazaLaVistaDelForo(hayForo, consulta.error) &&
      !soloLectura,
    consulta,
    avisoDeRecargaFallidaAlEditarElForo(consulta.error),
  )

  const contenido = (): ReactNode => {
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

    if (consulta.isError && errorQueReemplazaLaVistaDelForo(hayForo, consulta.error)) {
      return <MensajeError mensaje={mensajeDeConsultaForo(consulta.error)} />
    }

    if (consulta.isLoading || !consulta.data || esperando) {
      return <Cargando texto={TEXTOS_DETALLE_FORO.cargando} />
    }

    const { foro } = consulta.data

    if (!foro.puedeEditar) {
      return <MensajeError mensaje={TEXTOS_DETALLE_FORO.sinPermisoParaEditar} />
    }

    // La versión es la de apertura que guarda el formulario, nunca la de consulta.data al enviar.
    const handleGuardar = async (datos: CrearTarea, version: number) => {
      await editar.mutateAsync({ ...cuerpoDeForo(datos), version })
      if (!montado.current || !sigueVigente(generacion)) return
      navigate(detalle)
    }

    // §7.21: una sola petición, esperada. Con éxito y con puedeEditar, el formulario se monta de nuevo con
    // la versión nueva. Con la vista ya desmontada, nada: el gancho dejó el foro viejo (T-01 y T-04).
    const recargarTrasConflicto = async () => {
      if (!montado.current) return
      if (!sigueVigente(generacion)) return
      const resultado = await consulta.refetch()
      if (!sigueVigente(generacion)) return
      if (!resultado.isSuccess || !resultado.data.foro.puedeEditar) return
      setReinicios((n) => n + 1)
    }

    return (
      <FormularioTarea
        key={reinicios}
        claseId={claseId}
        tarea={foro}
        tipo="foro"
        cancelarA={detalle}
        pendiente={editar.isPending}
        onGuardar={handleGuardar}
        version={foro.version}
        onConflicto={recargarTrasConflicto}
        enfocarAlMontar={reinicios > 0}
      />
    )
  }

  return contenido()
}

// CHORE-06a (§D-1, Forma C): el marco conserva la raíz de foco; el contenido va con key por el foro.
function EditarForoDeLaClase({ claseId, foroId }: EditarForoDeLaClaseProps) {
  const consulta = useForo(claseId, foroId)
  const raizRef = useRef<HTMLDivElement>(null)
  // Si una recarga quita `puedeEditar` (o el foro ya no existe) con el foco dentro del formulario, el foco
  // va a la raíz de la vista y no a <body>.
  useFocoAlPerderseElControl(raizRef, claveDeFocoDeLaTarea(foroId, consulta))

  return (
    <div ref={raizRef} tabIndex={-1}>
      <EdicionDelForo key={foroId} claseId={claseId} foroId={foroId} />
    </div>
  )
}

export function EditarForoView() {
  const { foroId } = useParams<{ foroId: string }>()

  return (
    <ConClaseDeLaRuta>
      {(claseId) => {
        if (foroId === undefined) {
          return <MensajeError mensaje={MENSAJES_ERROR_FORO.foroNoEncontrado} />
        }
        // T-02 (ronda 2): el id de la ruta, en su forma canónica, antes de la key, de la clave de foco,
        // de los ganchos y de los enlaces.
        return <EditarForoDeLaClase claseId={claseId} foroId={idCanonicoDeLaRuta(foroId)} />
      }}
    </ConClaseDeLaRuta>
  )
}
