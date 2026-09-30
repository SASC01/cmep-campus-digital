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

// CLASES-a (§D-A6): fecha larga en palabras para el saludo del bloque destacado del inicio, por
// ejemplo "martes 29 de septiembre". Recibe un Date (no un ISO), porque siempre es "hoy". El ICU
// de es-MX intercala una coma entre el día de la semana y la fecha ("martes, 29 de..."); se quita
// para dar el texto exacto del diseño.
export const formatearFechaLarga = (fecha: Date, zona?: string): string =>
  new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(zona ? { timeZone: zona } : {}),
  })
    .format(fecha)
    .replace(",", "")

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
