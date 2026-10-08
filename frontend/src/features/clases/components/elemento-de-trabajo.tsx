import { BookOpen } from "lucide-react"
import { useId, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatearFechaHora } from "@/lib/format"

import { TEXTOS_TRABAJO } from "../data"
import type { ElementoDeTrabajo as Elemento } from "../types"
import { AdjuntosDePublicacion } from "./adjuntos-de-publicacion"
import { FirmaDelAutor } from "./firma-del-autor"

interface ElementoDeTrabajoProps {
  claseId: string
  elemento: Elemento
}

// §D-11: un material en "Trabajo de clase". La misma fila de vidrio fuerte que la de una tarea (§7.7),
// con la insignia "Material" (texto e icono), el título, la firma y la fecha; "Ver material" (ghost,
// aria-expanded) despliega el texto y los adjuntos. Es texto plano: nunca se interpreta como HTML.
export function ElementoDeTrabajo({ claseId, elemento }: ElementoDeTrabajoProps) {
  const [abierto, setAbierto] = useState(false)
  const idContenido = useId()
  const material = elemento.material

  return (
    <div className="vidrio-fuerte flex flex-col gap-2 rounded-row p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Badge variant="muted" icon={<BookOpen aria-hidden="true" />}>
          {TEXTOS_TRABAJO.insigniaMaterial}
        </Badge>
        <p className="text-small text-muted-foreground">
          <FirmaDelAutor autor={elemento.autor} /> · {formatearFechaHora(elemento.creadoEn)}
        </p>
      </div>
      <h3 className="font-bold wrap-anywhere">{elemento.titulo}</h3>
      {material !== null && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={abierto}
            aria-controls={idContenido}
            onClick={() => setAbierto((valor) => !valor)}
            className="self-start"
          >
            {abierto ? TEXTOS_TRABAJO.ocultarMaterial : TEXTOS_TRABAJO.verMaterial}
          </Button>
          {abierto && (
            <div id={idContenido} className="flex flex-col gap-3">
              {material.texto !== "" && (
                <p className="max-w-prose whitespace-pre-line wrap-anywhere">{material.texto}</p>
              )}
              <AdjuntosDePublicacion claseId={claseId} adjuntos={material.adjuntos} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
