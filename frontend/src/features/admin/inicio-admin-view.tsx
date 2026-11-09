import type { ReactNode } from "react"
import { Link } from "react-router"

import { Cargando } from "@/components/cargando"
import { MensajeError } from "@/components/mensaje-error"
import { useAlPulsarLaSeccionActiva } from "@/components/seccion/hooks"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

import { ACCESOS_DEL_INICIO, CLAVE_RESUMEN_ADMIN, TEXTOS_INICIO_ADMIN } from "./data"
import { useMarcarViejaSiQuedoEnError, useResumenAdmin, useVolverAPedirSiFallo } from "./hooks"

// ADMIN-01f (§D-11, DH-05 a, RF-50): el dashboard de /admin, con las tres cifras (S-13) y los accesos a
// cada sección. Sin «Reintentar» (Enmienda 1): si el resumen falla, solo su panel pasa al MensajeError, y
// la frase se cumple pulsando «Inicio» estando aquí (otra location.key) o yendo a otra sección y
// regresando (la consulta en error se marca vieja al desmontarse). Los accesos no dependen del resumen.
// Sin diálogos ni "Administración" en el contenido: el nombre ya está en la barra superior.
export function InicioAdminView() {
  const resumen = useResumenAdmin()
  useMarcarViejaSiQuedoEnError(CLAVE_RESUMEN_ADMIN)
  useAlPulsarLaSeccionActiva(useVolverAPedirSiFallo(CLAVE_RESUMEN_ADMIN))

  const cifras = (): ReactNode => {
    if (resumen.isError) return <MensajeError mensaje={TEXTOS_INICIO_ADMIN.error} />
    if (resumen.isLoading || !resumen.data) return <Cargando />
    const valores = [
      [TEXTOS_INICIO_ADMIN.cifras.alumnos, resumen.data.alumnos],
      [TEXTOS_INICIO_ADMIN.cifras.maestros, resumen.data.maestros],
      [TEXTOS_INICIO_ADMIN.cifras.clasesActivas, resumen.data.clasesActivas],
    ] as const
    return (
      <dl className="grid gap-4 sm:grid-cols-3">
        {valores.map(([etiqueta, valor]) => (
          <div key={etiqueta} className="flex flex-col gap-1">
            <dt className="text-small text-muted-foreground">{etiqueta}</dt>
            <dd className="text-display tabular-nums">{valor}</dd>
          </div>
        ))}
      </dl>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <h1 className="text-h1">{TEXTOS_INICIO_ADMIN.titulo}</h1>
        </CardHeader>
        <CardContent>{cifras()}</CardContent>
      </Card>
      <Card>
        <CardContent>
          <ul className="flex flex-wrap gap-2">
            {ACCESOS_DEL_INICIO.map((destino) => (
              <li key={destino.ruta}>
                <Link to={destino.ruta} className={buttonVariants({ variant: "outline" })}>
                  <destino.icono aria-hidden="true" />
                  {destino.etiqueta}
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
