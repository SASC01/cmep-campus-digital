import { useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { useLocation } from "react-router"

import type { ConsultaQueSeRecarga } from "./types"

// CLASES-03 (DH-06, §D-7.3): pulsar la sección activa (o cualquier enlace a la misma ruta) navega con
// otra location.key, pero la vista no se desmonta (T-35 del muro, T-08 de "Calificaciones"). Corre
// `alPulsar` una vez por cada location.key nueva con la vista montada; la primera no cuenta. Lo usan
// features/calificaciones y features/clases (regla 5 de CLAUDE.md).
export const useAlPulsarLaSeccionActiva = (alPulsar: () => void) => {
  const { key } = useLocation()
  const llaveRef = useRef(key)
  useEffect(() => {
    if (llaveRef.current === key) return
    llaveRef.current = key
    alPulsar()
  }, [key, alPulsar])
}

// CHORE-06b (§D-4, DH-03 b y DH-10): la política única de recarga. Al pulsar la sección en la que ya
// se está (también el salto del historial a la misma sección de otra clase, en las vistas que
// sobreviven al cambio de clase), cada consulta que está en error o vieja se vuelve a pedir; una sana y
// fresca, no. Lo que ya vuela no se cancela ni se duplica: la comprobación de isFetching y
// cancelRefetch: false, que une la llamada a la petición en vuelo. Sin memoria propia: lee las
// consultas del render en que llega la clave nueva, que en un salto de clase ya son las de la otra.
export const useRecargarAlPulsarLaSeccion = (...consultas: readonly ConsultaQueSeRecarga[]) => {
  useAlPulsarLaSeccionActiva(() => {
    for (const consulta of consultas) {
      if (consulta.isFetching) continue
      if (!consulta.isError && !consulta.isStale) continue
      void consulta.refetch({ cancelRefetch: false })
    }
  })
}

// ADMIN-01f (§D-11, Enmienda 1 y corrección M-17); desde CHORE-06b vive aquí (features/admin lo
// reexporta): una consulta que quedó en error se marca vieja, sin pedirla, al dejar su clave (otro
// filtro u otro término) y al desmontarse la vista. Así volver a ella antes de que venza el staleTime
// la vuelve a pedir y la frase "Revisa tu conexión e inténtalo de nuevo" se cumple. Una consulta sana no
// se toca. Con @tanstack/query-core 5.103.2 la acción `error` ya deja la consulta inválida: esto queda
// como garantía escrita.
const marcarViejaSiQuedoEnError = (queryClient: QueryClient, queryKey: QueryKey) => {
  if (queryClient.getQueryState(queryKey)?.status !== "error") return
  void queryClient.invalidateQueries({ queryKey, exact: true, refetchType: "none" })
}

export const useMarcarViejaSiQuedoEnError = (queryKey: QueryKey) => {
  const queryClient = useQueryClient()
  const huella = JSON.stringify(queryKey)
  const claveRef = useRef(queryKey)
  useEffect(() => {
    claveRef.current = queryKey
  })
  useEffect(() => {
    const clave = claveRef.current
    return () => marcarViejaSiQuedoEnError(queryClient, clave)
  }, [queryClient, huella])
}
