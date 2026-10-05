import { MAXIMO_MAESTROS_POR_CLASE } from "@campus/shared"
import { useEffect, useRef } from "react"

import { Cargando } from "@/components/cargando"
import { MensajeError } from "@/components/mensaje-error"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

import { BuscadorDeMaestros } from "./components/buscador-de-maestros"
import { ConClaseDeLaRuta } from "./components/con-clase-de-la-ruta"
import { ListaMaestrosDeClase } from "./components/lista-maestros-de-clase"
import { TEXTOS_MAESTROS_DE_CLASE } from "./data"
import { useClase, useFilaEnFoco, useFocoAlPasarAError, useRetirarMaestro } from "./hooks"
import { focoPerdido, mensajeDeErrorClases } from "./lib"

interface MaestrosDeLaClaseProps {
  claseId: string
}

// §D-2C2, DESIGN.md §7.14 y §7.17: los maestros de la clase (uno o dos) y el buscador para asignar a
// otro. "Reasignar" es retirar a uno y asignar a otro: con uno solo, "Quitar" no se muestra (una
// clase necesita al menos un maestro; el servidor lo niega de todas formas con 409); con dos, el
// buscador se oculta y una nota dice por qué. Estados en orden: error → cargando → datos. El foco no
// queda en <body>: al quitar, va al "Quitar" vecino o al encabezado del panel; si el buscador
// desaparece con el foco dentro (al llegar a dos maestros), va al encabezado.
function MaestrosDeLaClase({ claseId }: MaestrosDeLaClaseProps) {
  const clase = useClase(claseId)
  const retirar = useRetirarMaestro(claseId)
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  const filaDelBuscadorRef = useFilaEnFoco("data-candidato-id")
  const errorRef = useRef<HTMLDivElement>(null)
  useFocoAlPasarAError(clase.isError, clase.data !== undefined, claseId, errorRef)

  useEffect(() => {
    if (filaDelBuscadorRef.current === null || !focoPerdido(document)) return
    filaDelBuscadorRef.current = null
    encabezadoRef.current?.focus()
  })

  if (clase.isError) {
    return (
      <div ref={errorRef} tabIndex={-1}>
        <MensajeError mensaje={mensajeDeErrorClases(clase.error)} />
      </div>
    )
  }
  if (clase.isLoading || !clase.data) return <Cargando />

  const maestros = clase.data.maestros
  const completa = maestros.length >= MAXIMO_MAESTROS_POR_CLASE
  const unico = maestros.length <= 1

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <h2 ref={encabezadoRef} tabIndex={-1} className="text-h2">
            {TEXTOS_MAESTROS_DE_CLASE.titulo}
          </h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ListaMaestrosDeClase
            etiqueta={TEXTOS_MAESTROS_DE_CLASE.titulo}
            maestros={maestros}
            confirmar
            quitando={retirar.isPending}
            puedeQuitar={!unico}
            onQuitar={(maestro) => retirar.mutate({ id: maestro.id, nombre: maestro.nombre })}
            alQuedarseSinDestino={() => encabezadoRef.current?.focus()}
          />
          {unico && <p className="text-small">{TEXTOS_MAESTROS_DE_CLASE.minimo}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="text-h2">{TEXTOS_MAESTROS_DE_CLASE.asignarTitulo}</h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {completa && <p className="text-small">{TEXTOS_MAESTROS_DE_CLASE.tope}</p>}
          {!completa && (
            <BuscadorDeMaestros
              claseId={claseId}
              yaElegidos={maestros.map((maestro) => maestro.id)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function MaestrosDeClaseView() {
  return <ConClaseDeLaRuta>{(claseId) => <MaestrosDeLaClase claseId={claseId} />}</ConClaseDeLaRuta>
}
