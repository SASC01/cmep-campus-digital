import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatearFechaHora } from "@/lib/format"
import { varianteDeVencimiento, vencimientoDe } from "@/lib/vencimiento"

import { TEXTOS_DETALLE_TAREA } from "../data"
import type { TareaDetalle } from "../types"

interface DetallesDeLaTareaProps {
  tarea: TareaDetalle
}

// §D-10, DESIGN.md §7.20: el panel "Detalles" de la tarea. La fecha límite lleva su fecha y hora (en la
// zona del navegador) y, en una insignia, el texto de vencimientoDe: el estado lo dice el texto
// ("Vence mañana…", "Venció el…"), nunca solo el color. Categoría con su peso o "Sin categoría", tema
// o "Sin tema", la política de entregas tardías y cómo se entrega (ENTREGAS-01a).
export function DetallesDeLaTarea({ tarea }: DetallesDeLaTareaProps) {
  const vencimiento = vencimientoDe(tarea.fechaLimite, new Date())
  const categoria =
    tarea.categoria === null
      ? TEXTOS_DETALLE_TAREA.sinCategoria
      : TEXTOS_DETALLE_TAREA.categoriaConPeso(tarea.categoria.nombre, tarea.categoria.peso)
  const tema = tarea.tema === null ? TEXTOS_DETALLE_TAREA.sinTema : tarea.tema.nombre
  const tardias = tarea.aceptaTardias
    ? TEXTOS_DETALLE_TAREA.aceptaTardias
    : TEXTOS_DETALLE_TAREA.noAceptaTardias
  const entrega = tarea.requiereAdjuntos
    ? TEXTOS_DETALLE_TAREA.entregaConAdjuntos
    : TEXTOS_DETALLE_TAREA.entregaMarcandoCompletada

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <h3 className="text-h3">{TEXTOS_DETALLE_TAREA.detalles}</h3>
        <dl className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <dt className="text-small text-muted-foreground">{TEXTOS_DETALLE_TAREA.fechaLimite}</dt>
            <dd className="flex flex-col items-start gap-1 text-body text-foreground">
              <span>{formatearFechaHora(tarea.fechaLimite)}</span>
              <Badge variant={varianteDeVencimiento(vencimiento.estado)}>{vencimiento.texto}</Badge>
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-small text-muted-foreground">{TEXTOS_DETALLE_TAREA.puntos}</dt>
            <dd className="text-body text-foreground">{tarea.puntos}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-small text-muted-foreground">{TEXTOS_DETALLE_TAREA.categoria}</dt>
            <dd className="wrap-anywhere text-body text-foreground">{categoria}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-small text-muted-foreground">{TEXTOS_DETALLE_TAREA.tema}</dt>
            <dd className="wrap-anywhere text-body text-foreground">{tema}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-small text-muted-foreground">
              {TEXTOS_DETALLE_TAREA.entregasTardias}
            </dt>
            <dd className="text-body text-foreground">{tardias}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-small text-muted-foreground">{TEXTOS_DETALLE_TAREA.entrega}</dt>
            <dd className="text-body text-foreground">{entrega}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
