import { Archive } from "lucide-react"
import { useRef } from "react"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent } from "@/components/ui/card"
import { formatearFechaLargaConAno } from "@/lib/format"
import { baseDeClase } from "@/lib/ruta-de-clase"

import { TEXTOS_CLASE_ARCHIVADA, TEXTOS_CLASES_ADMIN } from "../data"
import { useGestionEnVuelo, useRestaurarClase } from "../hooks"
import type { Perspectiva } from "../types"

interface AvisoDeClaseArchivadaProps {
  claseId: string
  archivadaEn: string
  perspectiva: Perspectiva
}

interface AccionesDelAdminProps {
  claseId: string
}

// «Restaurar» (sin confirmación, DH-09) y el enlace «Duplicar». «Restaurar» usa la misma mutación por
// clase que la tabla de /admin/clases (useRestaurarClase con claveGestionDeClase): si esa clase ya se está
// restaurando, también desde la tabla o desde otra instancia de este aviso que se desmontó, este botón
// espera con ella y no manda otra petición. La guarda con ref cubre los dos clics seguidos del mismo
// render; guarda la clase y se suelta en el finally (CHORE-04, §D-4 bis: el aviso sobrevive al cambio de
// clase y la clave suelta al observador). El aviso de éxito o de error y la renovación viven en el gancho.
function AccionesDelAdmin({ claseId }: AccionesDelAdminProps) {
  const restaurar = useRestaurarClase(claseId)
  const restauracion = useGestionEnVuelo("restaurar", claseId)
  const restaurandoRef = useRef<string | null>(null)

  const handleRestaurar = async () => {
    if (restaurandoRef.current === claseId || restauracion.sigueEnVuelo()) return
    restaurandoRef.current = claseId
    try {
      await restaurar.mutateAsync()
    } catch {
      // El aviso y la renovación los da useRestaurarClase.
    } finally {
      if (restaurandoRef.current === claseId) restaurandoRef.current = null
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void handleRestaurar()}
        enEspera={restaurar.isPending || restauracion.enVuelo}
      >
        {TEXTOS_CLASES_ADMIN.restaurar}
      </Button>
      <Link
        to={`${baseDeClase("admin", claseId)}/duplicar`}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        {TEXTOS_CLASES_ADMIN.duplicar}
      </Link>
    </div>
  )
}

// ADMIN-01d1 (§D-9, §D-12, DESIGN.md §7.16): el aviso de una clase archivada, bajo su encabezado: texto
// con icono en un panel propio, sin superficie nueva. El maestro (y el alumno) leen "Solo puedes
// consultarla."; el admin, "Es de solo lectura.", con «Restaurar» y «Duplicar». La perspectiva llega por
// props desde ClaseLayout, que ya la calcula.
export function AvisoDeClaseArchivada({
  claseId,
  archivadaEn,
  perspectiva,
}: AvisoDeClaseArchivadaProps) {
  const fecha = formatearFechaLargaConAno(new Date(archivadaEn))
  const esAdmin = perspectiva === "admin"
  const texto = esAdmin
    ? TEXTOS_CLASE_ARCHIVADA.avisoAdmin(fecha)
    : TEXTOS_CLASE_ARCHIVADA.aviso(fecha)

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-body">
          <Archive aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>{texto}</span>
        </p>
        {esAdmin && <AccionesDelAdmin claseId={claseId} />}
      </CardContent>
    </Card>
  )
}
