import { Cargando } from "@/components/cargando"
import { MensajeError } from "@/components/mensaje-error"

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
    <section className="flex flex-col gap-2">
      <h1 className="font-heading text-2xl font-bold tracking-tight">{`${TEXTOS_SESION.saludo}, ${data.nombre}`}</h1>
      <p className="text-muted-foreground">{TEXTOS_SESION.proximamente}</p>
    </section>
  )
}
