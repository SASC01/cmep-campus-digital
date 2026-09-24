// Normalización de los datos de una cuenta. Todo puro: el correo se compara y guarda en minúsculas
// (§14: "email único (en minúsculas)") y nombre_busqueda se calcula aquí, no con unaccent() en SQL
// (DEC-02, C-07): el buscador futuro aplicará esta misma función al término.

export const normalizarCorreo = (correo: string): string => correo.trim().toLowerCase()

export const normalizarNombre = (nombre: string): string => nombre.trim().replace(/\s+/g, " ")

// NFD separa las marcas diacríticas; \p{M} las elimina. Después minúsculas y espacios colapsados.
export const normalizarParaBusqueda = (texto: string): string =>
  texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim()

export interface DatosDeCuenta {
  nombre: string
  email: string
}

export interface CuentaPreparada {
  nombre: string
  email: string
  nombreBusqueda: string
}

export const prepararRegistro = ({ nombre, email }: DatosDeCuenta): CuentaPreparada => {
  const nombreNormalizado = normalizarNombre(nombre)
  return {
    nombre: nombreNormalizado,
    email: normalizarCorreo(email),
    nombreBusqueda: normalizarParaBusqueda(nombreNormalizado),
  }
}
