import type { EstadoPagoAlumno, Rol } from "@campus/shared"

// Lo que el adaptador lee de una cuenta para la gestión de usuarios.
export interface CuentaParaGestion {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  creadoEn: Date
  estadoPago: EstadoPagoAlumno
  fechaEstadoPago: Date | null
  accesoRestringido: boolean
  motivoRestriccion: string | null
  fechaRestriccion: Date | null
}

export interface FilaDeUsuarioAdmin {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  creadoEn: string
  estadoPago?: EstadoPagoAlumno
  fechaEstadoPago?: string | null
  accesoRestringido?: boolean
  motivoRestriccion?: string | null
  fechaRestriccion?: string | null
}

const isoONulo = (fecha: Date | null): string | null =>
  fecha === null ? null : fecha.toISOString()

// Pura (§D-7.1, RN-02). La fila que ve el admin: los datos de pago y de acceso solo en las filas de
// estudiantes; en las demás no viaja ni la clave.
export const filaDeUsuarioAdmin = (cuenta: CuentaParaGestion): FilaDeUsuarioAdmin => {
  const comun = {
    id: cuenta.id,
    nombre: cuenta.nombre,
    email: cuenta.email,
    rol: cuenta.rol,
    activo: cuenta.activo,
    creadoEn: cuenta.creadoEn.toISOString(),
  }
  if (cuenta.rol !== "estudiante") return comun
  return {
    ...comun,
    estadoPago: cuenta.estadoPago,
    fechaEstadoPago: isoONulo(cuenta.fechaEstadoPago),
    accesoRestringido: cuenta.accesoRestringido,
    motivoRestriccion: cuenta.motivoRestriccion,
    fechaRestriccion: isoONulo(cuenta.fechaRestriccion),
  }
}
