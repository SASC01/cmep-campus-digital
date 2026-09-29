import { Badge } from "@/components/ui/badge"

import { TEXTOS_INVITACION_MASIVA } from "../data"
import { etiquetaDeMotivo } from "../lib"
import type { InvitacionMasivaRespuesta } from "../types"

interface ResultadoInvitacionMasivaProps {
  resultado: InvitacionMasivaRespuesta
}

// AUTH-03c, §D-C6 (DESIGN.md §7.15): resumen en palabras en role="status", y un grupo por
// resultado (con su encabezado y conteo), sin grupos vacíos. El motivo de una línea inválida va en
// texto o en <Badge variant="danger">: el rojo de esa insignia vive dentro de badge.tsx, no como
// una clase de color suelta aquí (V-13, `styles/clases-r1.ataque.test.ts`).
export function ResultadoInvitacionMasiva({ resultado }: ResultadoInvitacionMasivaProps) {
  const { enviadas, yaExistentes, invalidas } = resultado

  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="text-small font-bold text-foreground">
        {TEXTOS_INVITACION_MASIVA.resumen(enviadas.length, yaExistentes.length, invalidas.length)}
      </p>
      {enviadas.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-small font-bold text-foreground">
            {TEXTOS_INVITACION_MASIVA.grupos.enviadas} ({enviadas.length})
          </h3>
          <ul className="flex flex-col gap-1 text-small text-foreground">
            {enviadas.map((enviada) => (
              <li key={enviada.email}>
                {TEXTOS_INVITACION_MASIVA.lineaEnviada(enviada.email, enviada.nombre)}
              </li>
            ))}
          </ul>
          <p className="text-small text-muted-foreground">
            {TEXTOS_INVITACION_MASIVA.notaEnviadas}
          </p>
        </div>
      )}
      {yaExistentes.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-small font-bold text-foreground">
            {TEXTOS_INVITACION_MASIVA.grupos.existentes} ({yaExistentes.length})
          </h3>
          <ul className="flex flex-col gap-1 text-small text-foreground">
            {yaExistentes.map((existente) => (
              <li key={`${String(existente.linea)}-${existente.email}`}>
                {TEXTOS_INVITACION_MASIVA.lineaExistente(existente.linea, existente.email)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {invalidas.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-small font-bold text-foreground">
            {TEXTOS_INVITACION_MASIVA.grupos.invalidas} ({invalidas.length})
          </h3>
          <ul className="flex flex-col gap-2 text-small text-foreground">
            {invalidas.map((invalida) => (
              <li
                key={`${String(invalida.linea)}-${invalida.texto}`}
                className="flex flex-wrap items-center gap-2"
              >
                <span>
                  {TEXTOS_INVITACION_MASIVA.lineaInvalida(invalida.linea, invalida.texto)}
                </span>
                <Badge variant="danger">{etiquetaDeMotivo(invalida.motivo)}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
