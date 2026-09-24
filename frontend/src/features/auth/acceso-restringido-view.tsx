import { Ban, CircleAlert, LogOut } from "lucide-react"
import { Navigate } from "react-router"

import { Cargando } from "@/components/cargando"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

import { TEXTOS_RESTRINGIDO, TEXTOS_SESION } from "./data"
import { useCerrarSesion, useMe } from "./hooks"
import { mensajeDeErrorAuth, rutaPorRol } from "./lib"

// RN-03: la única pantalla de un alumno restringido. El estado de pago llega con el módulo pagos
// (P-02). La seguridad está en withAccess del backend; esta vista solo informa.
export function AccesoRestringidoView() {
  const { data, isPending, isError, error } = useMe()
  const cerrarSesion = useCerrarSesion()

  if (isError) {
    return (
      <div className="p-6">
        <MensajeError titulo={TEXTOS_SESION.tituloError} mensaje={mensajeDeErrorAuth(error)} />
      </div>
    )
  }

  if (isPending) {
    return (
      <div className="p-6">
        <Cargando />
      </div>
    )
  }

  // Quien no está restringido no tiene nada que ver aquí: vuelve a su dashboard.
  if (!data.accesoRestringido) {
    return <Navigate to={rutaPorRol(data.rol)} replace />
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-8 text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {TEXTOS_RESTRINGIDO.titulo}
          </h1>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="flex items-start gap-2">
            <Ban aria-hidden="true" className="mt-1 size-4 shrink-0 text-danger" />
            <span>{TEXTOS_RESTRINGIDO.mensaje}</span>
          </p>
          {data.motivoRestriccion !== undefined && (
            <p className="flex items-start gap-2">
              <CircleAlert aria-hidden="true" className="mt-1 size-4 shrink-0 text-danger" />
              <span>
                <span className="font-medium">{TEXTOS_RESTRINGIDO.motivo}</span>{" "}
                {data.motivoRestriccion}
              </span>
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            className="self-start"
            onClick={() => cerrarSesion.mutate()}
            disabled={cerrarSesion.isPending}
            aria-busy={cerrarSesion.isPending}
          >
            <LogOut aria-hidden="true" />
            {TEXTOS_SESION.cerrarSesion}
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
