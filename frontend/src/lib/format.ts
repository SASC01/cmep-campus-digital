// La API transporta fechas en UTC ISO 8601; aquí se muestran en la zona local del navegador (o en
// la indicada) en español de México y formato de 24 horas, que es el que usan los textos del PRD.
export const formatearFechaHora = (iso: string, zona?: string): string => {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return iso
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    hourCycle: "h23",
    ...(zona ? { timeZone: zona } : {}),
  }).format(fecha)
}

// Iniciales de un nombre para el avatar decorativo (§D-3): primer punto de código de las dos
// primeras palabras, en mayúsculas de es-MX; una sola palabra da una letra; ignora espacios de más.
export const inicialesDe = (nombre: string): string => {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean)
  const iniciales = palabras
    .slice(0, 2)
    .map((palabra) => [...palabra][0] ?? "")
    .join("")
  return iniciales.toLocaleUpperCase("es-MX")
}
