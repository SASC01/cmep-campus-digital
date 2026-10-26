// CALIFICACIONES-01a (§D-2.4, RN-05, S-04). Alumno en riesgo: promedio menor que 70 % o 3 o más tareas
// vencidas sin entregar. Los umbrales son constantes hasta que exista la configuración (RF-56). El
// promedio que se compara es el redondeado que se muestra (69.99 sí; 70.00 no); un alumno sin tareas
// calificadas no está en riesgo por promedio.
export const UMBRAL_PROMEDIO_EN_RIESGO = 70
export const UMBRAL_VENCIDAS_SIN_ENTREGAR = 3

export type MotivoDeRiesgo = "promedio" | "vencidas"

// En ese orden; [] si ninguno.
export const motivosDeRiesgo = ({
  porcentaje,
  vencidasSinEntregar,
}: {
  porcentaje: number | null
  vencidasSinEntregar: number
}): MotivoDeRiesgo[] => {
  const motivos: MotivoDeRiesgo[] = []
  if (porcentaje !== null && porcentaje < UMBRAL_PROMEDIO_EN_RIESGO) motivos.push("promedio")
  if (vencidasSinEntregar >= UMBRAL_VENCIDAS_SIN_ENTREGAR) motivos.push("vencidas")
  return motivos
}
