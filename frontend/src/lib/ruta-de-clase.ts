// TAREAS-01c (§D-9). La perspectiva desde la que se mira una clase y la base de su ruta, compartidas
// por features/clases y features/tareas. Movidas sin cambios desde features/clases (types.ts, lib.ts
// y data.ts), que las reexporta.

// CLASES-02c (§D-2C1): desde dónde se mira una clase. Sale de la ruta (perspectivaDeRuta); decide
// solo qué se muestra, el backend decide qué se permite.
export type Perspectiva = "estudiante" | "maestro" | "admin"

// La ruta base de las clases de cada perspectiva (CAPACIDADES_POR_PERSPECTIVA, en features/clases,
// la lee de aquí).
export const BASES_POR_PERSPECTIVA: Record<Perspectiva, string> = {
  estudiante: "/estudiante/clases",
  maestro: "/maestro/clases",
  admin: "/admin/clases",
}

// §D-2C1: la perspectiva sale del prefijo exacto de la ruta (/estudiante, /maestro o /admin, solo o
// seguido de "/"). Un prefijo parecido (/maestros, /administrador) o cualquier otra ruta da
// "estudiante", la perspectiva que menos muestra; el backend decide de todas formas. O-06 (revisión
// de 02c): sin distinguir mayúsculas, como el router (/Admin/clases es la ruta de /admin/clases).
export const perspectivaDeRuta = (pathname: string): Perspectiva => {
  const ruta = pathname.toLowerCase()
  for (const perspectiva of ["maestro", "admin"] as const) {
    const base = `/${perspectiva}`
    if (ruta === base || ruta.startsWith(`${base}/`)) return perspectiva
  }
  return "estudiante"
}

// La ruta base de las secciones de una clase para una perspectiva.
export const baseDeClase = (perspectiva: Perspectiva, claseId: string): string =>
  `${BASES_POR_PERSPECTIVA[perspectiva]}/${claseId}`
