import { useRef } from "react"

import { Card, CardHeader } from "@/components/ui/card"

import { FormularioGenerarEnlace } from "./components/formulario-generar-enlace"
import { FormularioInvitacionMasiva } from "./components/formulario-invitacion-masiva"
import { FormularioInvitarMaestro } from "./components/formulario-invitar-maestro"
import { TablaEnlaces } from "./components/tabla-enlaces"
import { TEXTOS_MAESTROS } from "./data"

// AUTH-03b (§D-B6) y AUTH-03c (§D-C6): /admin/maestros, con el panel "Invitar a varios maestros"
// arriba del de "Enlaces de registro". Densidad de admin (CLAUDE.md). Una sola acción principal en
// la vista: "Enviar invitaciones" (primary); "Generar enlace" es outline. ADMIN-01f (§D-11, Enmienda 1):
// "Invitar a un maestro" sale de /admin y va arriba de la invitación masiva, con su botón en outline.
export function MaestrosView() {
  const vigenciaInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <h1 className="text-h1">{TEXTOS_MAESTROS.titulo}</h1>
          <p className="text-small text-muted-foreground">{TEXTOS_MAESTROS.notaProvisional}</p>
        </CardHeader>
      </Card>
      <FormularioInvitarMaestro />
      <FormularioInvitacionMasiva />
      <FormularioGenerarEnlace vigenciaInputRef={vigenciaInputRef} />
      <TablaEnlaces onGenerarPrimero={() => vigenciaInputRef.current?.focus()} />
    </div>
  )
}
