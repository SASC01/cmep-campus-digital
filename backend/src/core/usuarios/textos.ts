// ADMIN-01e (§D-7, §D-8, §D-12). Los textos del servidor de la gestión de usuarios, en un solo lugar.

export const TEXTOS_USUARIOS = {
  busquedaMuyCorta: "Escribe al menos 3 letras para buscar.",
  usuarioNoEncontrado: "No hay ninguna cuenta con ese identificador.",
  cuentaDeAdministracion: "La cuenta de administración no se da de baja.",
  noEsAlumno: "Solo se restringe el acceso de un alumno.",
  loteConCuentasQueNoSonDeAlumnos: "alumnoIds: hay cuentas que no son de alumnos",
} as const

// 409 MAESTRO_CON_CLASES, con el singular y el plural de §D-12 (Enmienda 2).
export const mensajeMaestroConClases = (clasesActivas: number): string => {
  if (clasesActivas === 1) {
    return "Este maestro tiene 1 clase activa asignada. Asigna otro maestro a esa clase y quítalo de ella antes de darlo de baja."
  }
  return `Este maestro tiene ${clasesActivas} clases activas asignadas. Asigna otro maestro a esas clases y quítalo de ellas antes de darlo de baja.`
}
