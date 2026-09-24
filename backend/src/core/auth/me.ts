import type { MeRespuesta } from "@campus/shared"

import type { PerfilAutenticado } from "./autorizacion.js"

// Campos exactos de GET /me. Nunca estadoPago (P-02), activo ni hashes. motivoRestriccion solo
// existe cuando el acceso está restringido: se omite la clave (spread condicional), no se pone
// undefined ni null.
export const construirRespuestaMe = (perfil: PerfilAutenticado): MeRespuesta => ({
  id: perfil.id,
  nombre: perfil.nombre,
  email: perfil.email,
  rol: perfil.rol,
  debeCambiarContrasena: perfil.debeCambiarContrasena,
  accesoRestringido: perfil.accesoRestringido,
  ...(perfil.accesoRestringido && perfil.motivoRestriccion !== null
    ? { motivoRestriccion: perfil.motivoRestriccion }
    : {}),
})
