import { Cargando } from "@/components/cargando"
import { MensajeError } from "@/components/mensaje-error"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

import { TEXTOS_SESION } from "./data"
import { useMe } from "./hooks"
import { mensajeDeErrorAuth } from "./lib"

// Marcador post-login de /estudiante, /maestro y /admin hasta que llegue el dashboard de cada rol.
export function BienvenidaView() {
  const { data, isPending, isError, error } = useMe()

  if (isError) {
    return <MensajeError titulo={TEXTOS_SESION.tituloError} mensaje={mensajeDeErrorAuth(error)} />
  }

  if (isPending) {
    return <Cargando />
  }

  return (
    <Card>
      <CardHeader>
        <h1 className="text-h1">{`${TEXTOS_SESION.saludo}, ${data.nombre}`}</h1>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{TEXTOS_SESION.proximamente}</p>
      </CardContent>
    </Card>
  )
}
