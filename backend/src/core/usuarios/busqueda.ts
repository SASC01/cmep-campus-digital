import { AppError } from "../errores.js"
import { escaparComodinesLike, prepararTerminoDeBusqueda } from "../clases/busqueda.js"
import { TEXTOS_USUARIOS } from "./textos.js"

export interface BusquedaDeUsuarios {
  // Para nombre_busqueda: la normalización de shared/ (la misma con que se guarda), con los comodines
  // de LIKE escapados.
  nombre: string
  // Para email (guardado en minúsculas): el término recortado y en minúsculas, con los comodines
  // escapados, para que "+" y "_" de un correo se busquen tal cual.
  email: string
}

export const errorBusquedaMuyCorta = (): AppError =>
  new AppError("BUSQUEDA_MUY_CORTA", TEXTOS_USUARIOS.busquedaMuyCorta, 400)

// Pura (S-12). null si el término normalizado tiene menos de 3 caracteres: el handler responde
// 400 BUSQUEDA_MUY_CORTA.
export const prepararBusquedaDeUsuarios = (q: string): BusquedaDeUsuarios | null => {
  const nombre = prepararTerminoDeBusqueda(q)
  if (nombre === null) return null
  return {
    nombre: escaparComodinesLike(nombre),
    email: escaparComodinesLike(q.trim().toLowerCase()),
  }
}
