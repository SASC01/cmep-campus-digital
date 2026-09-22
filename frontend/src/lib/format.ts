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
