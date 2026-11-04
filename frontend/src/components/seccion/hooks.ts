import { useEffect, useRef } from "react"
import { useLocation } from "react-router"

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
