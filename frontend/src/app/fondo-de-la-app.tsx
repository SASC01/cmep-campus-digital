import { useCallback, useSyncExternalStore } from "react"
import type { createBrowserRouter } from "react-router"

import { FondoAnimado } from "@/components/layout/fondo-animado"
import { orbesEnMovimiento } from "@/components/layout/lib"

interface FondoDeLaAppProps {
  router: ReturnType<typeof createBrowserRouter>
}

// Montado fuera de RouterProvider (§D-1, S-06): así no se reinicia al navegar y se ve también
// mientras las guardas cargan. Solo lee la ruta actual: no navega ni redirige.
export function FondoDeLaApp({ router }: FondoDeLaAppProps) {
  const suscribir = useCallback((notificar: () => void) => router.subscribe(notificar), [router])
  const obtenerInstantanea = useCallback(() => router.state.location.pathname, [router])
  const pathname = useSyncExternalStore(suscribir, obtenerInstantanea)

  return <FondoAnimado enMovimiento={orbesEnMovimiento(pathname)} />
}
