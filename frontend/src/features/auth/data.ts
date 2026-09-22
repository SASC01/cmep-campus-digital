import type { Anuncio } from "./types"

export const TEXTOS_LOGIN = {
  titulo: "CMEP Campus Digital",
  subtitulo: "Entra con el correo y la contraseña de tu cuenta.",
  correo: "Correo",
  contrasena: "Contraseña",
  entrar: "Iniciar sesión",
  olvide: "¿Olvidaste tu contraseña?",
  notaAdministracion: "¿No te llega el correo? Acude a administración.",
  registro: "Regístrate como estudiante",
  avisoPendiente: "El inicio de sesión aún no está disponible.",
  tituloAnuncios: "Avisos del colegio",
} as const

// Anuncios de muestra hasta que exista el endpoint público de anuncios del login (RF-07).
export const ANUNCIOS_DE_EJEMPLO: Anuncio[] = [
  {
    anuncioId: "ejemplo-1",
    titulo: "Inscripciones al taller de robótica",
    texto:
      "Regístrate con tu maestro titular antes del viernes 3 de octubre. Cupo: 20 alumnos por turno.",
    orden: 1,
  },
  {
    anuncioId: "ejemplo-2",
    titulo: "Entrega de boletas del primer parcial",
    texto:
      "Las boletas se entregan en la dirección del lunes 6 al miércoles 8 de octubre, de 8:00 a 14:00.",
    orden: 2,
  },
  {
    anuncioId: "ejemplo-3",
    titulo: "Suspensión de clases",
    texto:
      "El viernes 10 de octubre no hay clases por consejo técnico. Las tareas con fecha límite ese día se mueven al lunes.",
    orden: 3,
  },
]
