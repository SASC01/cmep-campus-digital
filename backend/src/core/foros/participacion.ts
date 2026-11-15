import type { Rol } from "@campus/shared"

import type { RelacionConClase } from "../clases/pertenencia.js"
import { entregaCerrada, esTarde, type EstadoEntrega } from "../entregas/entregas.js"
import { AppError } from "../errores.js"

// FORO-01a (§D-2.1, §D-2.3). Reglas puras de participar en un foro. El adaptador las llama dentro de
// la transacción, con la fila de tareas del foro y la de la entrega del alumno ya bloqueadas; ninguna
// escribe.

export type TipoDeParticipacion = "principal" | "replica"

export interface ForoParaParticipar {
  fechaLimite: Date
  aceptaTardias: boolean
}

export interface ReglaDeParticipacion {
  // Si se puede publicar en este momento.
  abierta: boolean
  // Si lo que se publique queda marcado "con retraso".
  conRetraso: boolean
}

export interface AccionesDelForo {
  puedeParticipar: boolean
  puedeReplicar: boolean
  participarConRetraso: boolean
  replicarConRetraso: boolean
}

export const participacionYaPublicada = (): AppError =>
  new AppError("PARTICIPACION_YA_PUBLICADA", "Ya publicaste tu participación en este foro.", 409)

export const participacionCalificada = (): AppError =>
  new AppError("PARTICIPACION_CALIFICADA", "Tu participación en este foro ya está calificada.", 409)

export const foroCerrado = (): AppError =>
  new AppError(
    "FORO_CERRADO",
    "La fecha límite ya pasó y este foro no acepta participaciones con retraso.",
    409,
  )

export const participacionNoEncontrada = (): AppError =>
  new AppError("PARTICIPACION_NO_ENCONTRADA", "Esa participación ya no existe.", 404)

// DH-02 (pendiente con el cliente): ÚNICO lugar de la regla tardía del foro. Cambiar el valor por
// omisión es cambiar esta función y su prueba, nada más. Valor por omisión (DH-02 a, DH-03 a): sin
// penalización; el alumno, en la principal y en las réplicas, sigue la regla de la entrega (cerrada
// si el foro no acepta tardías y ya es tarde; con retraso después de la fecha límite, a tiempo hasta
// su milisegundo inclusive); el maestro replica siempre y sin marca; el admin no publica (las rutas
// no lo admiten: el caso existe aquí para que viva en un solo lugar). El tipo no cambia el resultado
// hoy (P-09), pero va en la firma por si el cliente distingue la principal de la réplica.
export const reglaDeParticipacion = ({
  rolDelAutor,
  foro,
  ahora,
}: {
  tipo: TipoDeParticipacion
  rolDelAutor: Rol
  foro: ForoParaParticipar
  ahora: Date
}): ReglaDeParticipacion => {
  if (rolDelAutor === "admin") return { abierta: false, conRetraso: false }
  if (rolDelAutor === "maestro") return { abierta: true, conRetraso: false }
  return {
    abierta: !entregaCerrada({ ...foro, requiereAdjuntos: false }, ahora),
    conRetraso: esTarde(foro.fechaLimite, ahora),
  }
}

// Lanza, en este orden: PARTICIPACION_YA_PUBLICADA si el alumno ya publicó su principal (tiene
// fechaEntrega, aunque ya esté calificada), PARTICIPACION_CALIFICADA si lo calificaron sin participar
// y FORO_CERRADO si la regla no deja publicar. Devuelve el conRetraso de la regla.
export const decidirParticipacionPrincipal = ({
  foro,
  estado,
  fechaEntrega,
  ahora,
}: {
  foro: ForoParaParticipar
  estado: EstadoEntrega
  fechaEntrega: Date | null
  ahora: Date
}): { conRetraso: boolean } => {
  if (fechaEntrega !== null) throw participacionYaPublicada()
  if (estado === "calificado") throw participacionCalificada()
  const regla = reglaDeParticipacion({
    tipo: "principal",
    rolDelAutor: "estudiante",
    foro,
    ahora,
  })
  if (!regla.abierta) throw foroCerrado()
  return { conRetraso: regla.conRetraso }
}

// DH-04 (a): cualquier inscrito replica en cualquier principal, sin haber publicado la suya.
export const decidirReplica = ({
  foro,
  rolDelAutor,
  ahora,
}: {
  foro: ForoParaParticipar
  rolDelAutor: Rol
  ahora: Date
}): { conRetraso: boolean } => {
  const regla = reglaDeParticipacion({ tipo: "replica", rolDelAutor, foro, ahora })
  if (!regla.abierta) throw foroCerrado()
  return { conRetraso: regla.conRetraso }
}

// Lo que la interfaz del alumno puede ofrecer en este momento, sin lanzar: las mismas reglas de
// decidirParticipacionPrincipal y decidirReplica, y el conRetraso que tendría lo publicado ahora.
export const accionesDelForo = ({
  foro,
  estado,
  fechaEntrega,
  ahora,
}: {
  foro: ForoParaParticipar
  estado: EstadoEntrega
  fechaEntrega: Date | null
  ahora: Date
}): AccionesDelForo => {
  const principal = reglaDeParticipacion({
    tipo: "principal",
    rolDelAutor: "estudiante",
    foro,
    ahora,
  })
  const replica = reglaDeParticipacion({ tipo: "replica", rolDelAutor: "estudiante", foro, ahora })
  return {
    puedeParticipar: fechaEntrega === null && estado !== "calificado" && principal.abierta,
    puedeReplicar: replica.abierta,
    participarConRetraso: principal.conRetraso,
    replicarConRetraso: replica.conRetraso,
  }
}

// DH-07 (a): el maestro y el admin ven la marca en todas las participaciones; el alumno, solo en las
// suyas. Es un dato de la respuesta (como alumnoDeLaRelacion), no un permiso.
export const verRetrasoDe = ({
  relacion,
  esPropia,
}: {
  relacion: RelacionConClase
  esPropia: boolean
}): boolean => {
  if (relacion === "estudiante") return esPropia
  return true
}
