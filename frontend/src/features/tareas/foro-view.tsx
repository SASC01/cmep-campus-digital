import { MessagesSquare } from "lucide-react"
import { useRef, type ReactNode } from "react"
import { useParams } from "react-router"

import { AdjuntosDePublicacion } from "@/components/adjuntos/adjuntos-de-publicacion"
import { Cargando } from "@/components/cargando"
import { ConClaseDeLaRuta } from "@/components/clase/con-clase-de-la-ruta"
import { FirmaDelAutor } from "@/components/clase/firma-del-autor"
import { MensajeError } from "@/components/mensaje-error"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatearFechaHora } from "@/lib/format"

import { AccionesDeLaTarea } from "./components/acciones-de-la-tarea"
import { DetallesDeLaTarea } from "./components/detalles-de-la-tarea"
import { RubricaDeSoloLectura } from "./components/rubrica-de-solo-lectura"
import { MENSAJES_ERROR_FORO, POLITICA_DEL_FORO, TEXTOS_DETALLE_FORO } from "./data"
import {
  useAvisoDeRecargaFallidaDelForo,
  useFocoAlPerderseElControl,
  useForo,
  useRutaDeLaClase,
} from "./hooks"
import {
  claveDeFocoDeLaTarea,
  errorQueReemplazaLaVistaDelForo,
  idCanonicoDeLaRuta,
  mensajeDeConsultaForo,
  mensajeDeErrorForo,
} from "./lib"

interface DetalleDelForoProps {
  claseId: string
  foroId: string
}

// FORO-01c2 (§D-8.3, DESIGN.md §7.20): el detalle de un foro, con la composición del de la tarea. A la
// izquierda, la insignia "Foro", la firma y la fecha, el título, el planteamiento, sus adjuntos y la
// rúbrica de solo lectura; a la derecha, "Detalles" con la política del foro y, para el maestro y el
// admin, "Editar foro" y "Borrar foro" según lo que diga el servidor ("Borrar con las participaciones",
// solo el admin). En una clase archivada no se pinta ninguna acción (AccionesDeLaTarea lo lee). Estados en
// orden: error → cargando → datos (un 404 dice "Ese foro ya no existe."). Las participaciones llegan en
// 01d, debajo del planteamiento.
function DetalleDelForo({ claseId, foroId }: DetalleDelForoProps) {
  const { perspectiva, base } = useRutaDeLaClase(claseId)
  const consulta = useForo(claseId, foroId)
  const raizRef = useRef<HTMLDivElement>(null)
  const hayForo = consulta.data !== undefined
  // Con el foro en caché, una recarga fallida que no reemplaza la vista avisa una vez por fallo; el mismo
  // gancho da el manejo del error al descargar un adjunto del planteamiento.
  const alFallarLaDescarga = useAvisoDeRecargaFallidaDelForo(
    claseId,
    foroId,
    consulta.isError && hayForo && !errorQueReemplazaLaVistaDelForo(hayForo, consulta.error),
    consulta,
    TEXTOS_DETALLE_FORO.avisoRecargaFallida,
  )
  // Si una recarga quita el control con el foco (un permiso, el foro que ya no existe, un error, otro
  // foro), el foco va a la raíz de la vista y no a <body>.
  useFocoAlPerderseElControl(raizRef, claveDeFocoDeLaTarea(foroId, consulta))

  const contenido = (): ReactNode => {
    if (consulta.isError && errorQueReemplazaLaVistaDelForo(hayForo, consulta.error)) {
      return <MensajeError mensaje={mensajeDeConsultaForo(consulta.error)} />
    }

    if (consulta.isLoading || !consulta.data) {
      return <Cargando texto={TEXTOS_DETALLE_FORO.cargando} />
    }

    const { foro } = consulta.data

    // CHORE-06a (§D-1): lo de abajo (la confirmación de borrar) es de este foro; con otro, se monta de
    // nuevo.
    return (
      <div key={foro.id} className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Badge variant="muted" icon={<MessagesSquare aria-hidden="true" />}>
                {TEXTOS_DETALLE_FORO.insignia}
              </Badge>
              <p className="text-small text-muted-foreground">
                <FirmaDelAutor autor={foro.autor} /> · {formatearFechaHora(foro.creadoEn)}
              </p>
            </div>

            <h2 className="wrap-anywhere text-h2">{foro.titulo}</h2>

            <section className="flex flex-col gap-2">
              <h3 className="text-h3">{TEXTOS_DETALLE_FORO.planteamiento}</h3>
              <p className="max-w-prose wrap-anywhere whitespace-pre-line text-body">
                {foro.instrucciones}
              </p>
            </section>

            <AdjuntosDePublicacion
              claseId={claseId}
              adjuntos={foro.adjuntos}
              mensajeDeError={mensajeDeErrorForo}
              alFallarLaDescarga={alFallarLaDescarga}
            />

            <RubricaDeSoloLectura rubrica={foro.rubrica} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <DetallesDeLaTarea tarea={foro} politica={POLITICA_DEL_FORO} />
          {perspectiva !== "estudiante" && (
            <AccionesDeLaTarea
              claseId={claseId}
              tarea={foro}
              tipo="foro"
              base={base}
              puedeConfirmarEntregas={perspectiva === "admin"}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div ref={raizRef} tabIndex={-1}>
      {contenido()}
    </div>
  )
}

// El :claseId lo lee ConClaseDeLaRuta; el :foroId, esta vista. Sin él no pide nada y dice lo mismo que
// un foro que no existe.
export function ForoView() {
  const { foroId } = useParams<{ foroId: string }>()

  return (
    <ConClaseDeLaRuta>
      {(claseId) => {
        if (foroId === undefined) {
          return <MensajeError mensaje={MENSAJES_ERROR_FORO.foroNoEncontrado} />
        }
        // T-02 (ronda 2): el id de la ruta, en su forma canónica, antes de pedir y de los ganchos.
        return <DetalleDelForo claseId={claseId} foroId={idCanonicoDeLaRuta(foroId)} />
      }}
    </ConClaseDeLaRuta>
  )
}
