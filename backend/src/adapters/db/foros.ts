import type { Rol } from "@campus/shared"

import {
  firmaDelAutor,
  puedeBorrarParticipacion,
  type ParticipanteDeAutoria,
} from "../../core/autoria.js"
import type { RelacionConClase } from "../../core/clases/pertenencia.js"
import type { EstadoEntrega } from "../../core/entregas/entregas.js"
import { AppError } from "../../core/errores.js"
import {
  accionesDelForo,
  decidirParticipacionPrincipal,
  decidirReplica,
  efectoDeBorrarPrincipal,
  participacionNoEncontrada,
  participacionYaPublicada,
  verRetrasoDe,
  type AccionesDelForo,
} from "../../core/foros/participacion.js"
import { paginar } from "../../core/paginacion.js"
import { esActividadDeTipo } from "./actividades.js"
import { enTransaccion, obtenerDb, type Ejecutor } from "./cliente.js"
import {
  alumnoInscrito,
  asegurarFilaDeEntrega,
  bloquearEntrega,
  bloquearTareaParaEntregar,
  calificacionDe,
  SELECT_ENTREGA,
  type CalificacionDb,
} from "./entregas.js"
import { traducirErrorPrisma } from "./errores.js"

// FORO-01a (§D-3.4, §D-4). Un foro es una publicación de tipo "foro" con su fila de tareas; lo que se
// escribe en él vive en participaciones_foro (la principal de cada alumno y las réplicas). Toda
// consulta filtra por el foro de la ruta, que se filtra por la clase: un id de otra clase, de otra
// actividad o de otro foro es "no encontrado", sin escribir ni revelar nada. Sin SQL propio: los
// bloqueos son los de entregas.ts (primero la fila de tareas, después la de entregas). Cada lista se
// pagina con paginar y comprueba su cursor contra la misma lista antes de la página. Ninguna consulta
// va en un ciclo y nada aquí encola: el handler no pasa trabajos (S-09). Ninguna función selecciona
// el correo, el estado de pago ni la restricción de acceso (RN-02).

export interface AutorFirmadoDb {
  id: string
  nombre: string
  administracion: boolean
}

export interface ElementoDeForoDb {
  id: string
  titulo: string
  autor: AutorFirmadoDb
  creadoEn: Date
  fechaLimite: Date
  puntos: number
  tema: { id: string; nombre: string } | null
  participaciones: number
  entrega: { estado: EstadoEntrega; conRetraso: boolean } | null
}

export interface ListaForosDb {
  foros: ElementoDeForoDb[]
  siguienteCursor: string | null
}

export interface MiParticipacionDb extends AccionesDelForo {
  estado: EstadoEntrega
  fechaEntrega: Date | null
  conRetraso: boolean
  calificacion: CalificacionDb | null
  principalId: string | null
}

export interface ParticipacionDb {
  id: string
  texto: string
  autor: AutorFirmadoDb
  creadoEn: Date
  // Solo si quien pide la lista ve la marca (DH-07): ausente, no false.
  conRetraso?: boolean
  replicas: number
  propia: boolean
  // FORO-01b (§D-11): lo decide core/ con el actor de la petición (solo el admin).
  puedeBorrar: boolean
}

export interface ReplicaDb {
  id: string
  texto: string
  autor: AutorFirmadoDb
  creadoEn: Date
  conRetraso?: boolean
  propia: boolean
  puedeBorrar: boolean
}

export interface ListaParticipacionesDb {
  participaciones: ParticipacionDb[]
  siguienteCursor: string | null
}

export interface ListaReplicasDb {
  replicas: ReplicaDb[]
  siguienteCursor: string | null
}

export interface ParticipacionDeAlumnoDb {
  id: string
  texto: string
  creadoEn: Date
  conRetraso: boolean
  enRespuestaA: { participacionId: string; autor: AutorFirmadoDb } | null
}

export interface ListaParticipacionesDeAlumnoDb {
  participaciones: ParticipacionDeAlumnoDb[]
  siguienteCursor: string | null
}

export interface ParticipacionPublicadaDb {
  participacion: ParticipacionDb
  miParticipacion: MiParticipacionDb
}

// Mismo código y mensaje que los demás archivos de db: un cursor borrado, ajeno o de otra lista
// responde igual (sin oráculo).
const errorCursorInvalido = (): AppError => new AppError("VALIDACION", "cursor: no es válido", 400)

// Inalcanzables: un foro siempre tiene su fila de tareas y su título (CHECK
// publicaciones_titulo_segun_tipo), y la fila perezosa existe después de asegurarla. Si pasara, es un
// error explícito y no un dato inventado.
const errorForoMalFormado = (): AppError =>
  new AppError("ERROR_INTERNO", "Un foro guardado no tiene una forma válida.", 500)

const errorReplicaInalcanzable = (): AppError =>
  new AppError("ERROR_INTERNO", "La réplica chocó con otra participación.", 500)

const SELECT_AUTOR = { select: { id: true, nombre: true, rol: true } } as const

const SELECT_PARTICIPACION = {
  id: true,
  texto: true,
  creadoEn: true,
  conRetraso: true,
  autor: SELECT_AUTOR,
} as const

interface FilaDeParticipacion {
  id: string
  texto: string
  creadoEn: Date
  conRetraso: boolean
  autor: { id: string; nombre: string; rol: Rol }
}

// La marca solo sale si esa persona la ve (DH-07 a): la decide core/ con la relación del sexto paso.
const conRetrasoVisible = (
  fila: FilaDeParticipacion,
  { actor, relacion }: { actor: ParticipanteDeAutoria; relacion: RelacionConClase },
): { conRetraso?: boolean } =>
  verRetrasoDe({ relacion, esPropia: fila.autor.id === actor.id })
    ? { conRetraso: fila.conRetraso }
    : {}

const replicaDe = (
  fila: FilaDeParticipacion,
  quien: { actor: ParticipanteDeAutoria; relacion: RelacionConClase },
): ReplicaDb => ({
  id: fila.id,
  texto: fila.texto,
  autor: firmaDelAutor(fila.autor),
  creadoEn: fila.creadoEn,
  ...conRetrasoVisible(fila, quien),
  propia: fila.autor.id === quien.actor.id,
  puedeBorrar: puedeBorrarParticipacion(quien.actor),
})

const participacionDe = (
  fila: FilaDeParticipacion,
  replicas: number,
  quien: { actor: ParticipanteDeAutoria; relacion: RelacionConClase },
): ParticipacionDb => ({
  id: fila.id,
  texto: fila.texto,
  autor: firmaDelAutor(fila.autor),
  creadoEn: fila.creadoEn,
  ...conRetrasoVisible(fila, quien),
  replicas,
  propia: fila.autor.id === quien.actor.id,
  puedeBorrar: puedeBorrarParticipacion(quien.actor),
})

// Del más reciente al más antiguo, con cursor, por el índice de publicaciones (clase_id, tipo, …). En
// una sola instantánea: el cursor (un foro de la clase), la página, el conteo de principales de la
// página (un solo groupBy por foro_id) y, con alumnoId (el alumno que pide la lista), sus entregas en
// esos foros (una sola consulta por el único (tarea_id, alumno_id)).
export const listarForos = (
  {
    claseId,
    cursor,
    limite,
    alumnoId,
  }: { claseId: string; cursor: string | undefined; limite: number; alumnoId: string | null },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaForosDb> =>
  enTransaccion(
    ejecutor,
    async (tx) => {
      const donde = { claseId, tipo: "foro" as const }
      if (cursor !== undefined) {
        const delCursor = await tx.publicacion.findFirst({
          where: { ...donde, id: cursor },
          select: { id: true },
        })
        if (delCursor === null) throw errorCursorInvalido()
      }
      const filas = await tx.publicacion.findMany({
        where: donde,
        select: {
          id: true,
          titulo: true,
          creadoEn: true,
          autor: SELECT_AUTOR,
          tema: { select: { id: true, nombre: true } },
          tarea: { select: { fechaLimite: true, puntos: true } },
        },
        orderBy: [{ creadoEn: "desc" }, { id: "desc" }],
        take: limite + 1,
        ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
      })
      const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.id)
      if (pagina.length === 0) return { foros: [], siguienteCursor }
      const ids = pagina.map((fila) => fila.id)
      const conteos = await tx.participacionForo.groupBy({
        by: ["foroId"],
        where: { foroId: { in: ids }, principalId: null },
        _count: { _all: true },
      })
      const principalesPorForo = new Map(
        conteos.map((conteo) => [conteo.foroId, conteo._count._all]),
      )
      const entregas =
        alumnoId === null
          ? []
          : await tx.entrega.findMany({
              where: { tareaId: { in: ids }, alumnoId },
              select: { tareaId: true, estado: true, conRetraso: true },
            })
      const entregaPorForo = new Map(entregas.map((entrega) => [entrega.tareaId, entrega]))
      return {
        foros: pagina.map((fila): ElementoDeForoDb => {
          if (fila.tarea === null || fila.titulo === null) throw errorForoMalFormado()
          const entrega = entregaPorForo.get(fila.id)
          return {
            id: fila.id,
            titulo: fila.titulo,
            autor: firmaDelAutor(fila.autor),
            creadoEn: fila.creadoEn,
            fechaLimite: fila.tarea.fechaLimite,
            puntos: fila.tarea.puntos,
            tema: fila.tema,
            participaciones: principalesPorForo.get(fila.id) ?? 0,
            entrega:
              entrega === undefined
                ? null
                : { estado: entrega.estado, conRetraso: entrega.conRetraso },
          }
        }),
        siguienteCursor,
      }
    },
    { instantaneaUnica: true },
  )

// Sentencias una tras otra: el foro (null si no existe en la clase), la entrega del alumno (sin fila,
// asignado), su calificación, su principal (por el índice único parcial) y lo que la regla del foro
// decide para una publicación de ahora (core/). No escribe nada.
const leerMiParticipacionCon = async (
  db: Ejecutor,
  {
    claseId,
    foroId,
    alumnoId,
    ahora,
  }: { claseId: string; foroId: string; alumnoId: string; ahora: Date },
): Promise<MiParticipacionDb | null> => {
  const foro = await db.tarea.findFirst({
    where: { id: foroId, claseId, publicacion: { tipo: "foro" } },
    select: { fechaLimite: true, aceptaTardias: true, puntos: true },
  })
  if (foro === null) return null
  const entrega = await db.entrega.findUnique({
    where: { tareaId_alumnoId: { tareaId: foroId, alumnoId } },
    select: SELECT_ENTREGA,
  })
  const principal = await db.participacionForo.findFirst({
    where: { foroId, autorId: alumnoId, principalId: null },
    select: { id: true },
  })
  const estado = entrega === null ? "asignado" : entrega.estado
  const fechaEntrega = entrega === null ? null : entrega.fechaEntrega
  return {
    estado,
    fechaEntrega,
    conRetraso: entrega === null ? false : entrega.conRetraso,
    calificacion:
      entrega === null ? null : await calificacionDe(db, { entrega, sobre: foro.puntos }),
    principalId: principal === null ? null : principal.id,
    ...accionesDelForo({ foro, estado, fechaEntrega, ahora }),
  }
}

export const leerMiParticipacion = (
  params: { claseId: string; foroId: string; alumnoId: string; ahora: Date },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<MiParticipacionDb | null> =>
  enTransaccion(ejecutor, (tx) => leerMiParticipacionCon(tx, params), { instantaneaUnica: true })

// Las principales de un foro, de la más antigua a la más reciente, con cursor. En una sola
// instantánea: el foro (null si no existe en la clase), el cursor (una principal de ese foro), la
// página por el índice (foro_id, principal_id, creado_en, id) y el conteo de réplicas de la página (un
// solo groupBy, por el índice (principal_id, creado_en, id)).
export const listarParticipaciones = (
  {
    claseId,
    foroId,
    cursor,
    limite,
    actor,
    relacion,
  }: {
    claseId: string
    foroId: string
    cursor: string | undefined
    limite: number
    actor: ParticipanteDeAutoria
    relacion: RelacionConClase
  },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaParticipacionesDb | null> =>
  enTransaccion(
    ejecutor,
    async (tx) => {
      if (!(await esActividadDeTipo(tx, { id: foroId, claseId, tipo: "foro" }))) return null
      const donde = { foroId, principalId: null }
      if (cursor !== undefined) {
        const delCursor = await tx.participacionForo.findFirst({
          where: { ...donde, id: cursor },
          select: { id: true },
        })
        if (delCursor === null) throw errorCursorInvalido()
      }
      const filas = await tx.participacionForo.findMany({
        where: donde,
        select: SELECT_PARTICIPACION,
        orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
        take: limite + 1,
        ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
      })
      const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.id)
      if (pagina.length === 0) return { participaciones: [], siguienteCursor }
      const conteos = await tx.participacionForo.groupBy({
        by: ["principalId"],
        where: { foroId, principalId: { in: pagina.map((fila) => fila.id) } },
        _count: { _all: true },
      })
      const replicasPorPrincipal = new Map(
        conteos.map((conteo) => [conteo.principalId, conteo._count._all]),
      )
      return {
        participaciones: pagina.map((fila) =>
          participacionDe(fila, replicasPorPrincipal.get(fila.id) ?? 0, { actor, relacion }),
        ),
        siguienteCursor,
      }
    },
    { instantaneaUnica: true },
  )

// La principal de un foro, o 404 PARTICIPACION_NO_ENCONTRADA: una inexistente, de otro foro o que es
// una réplica responden igual.
const exigirPrincipal = async (
  db: Ejecutor,
  { foroId, participacionId }: { foroId: string; participacionId: string },
): Promise<void> => {
  const principal = await db.participacionForo.findFirst({
    where: { id: participacionId, foroId, principalId: null },
    select: { id: true },
  })
  if (principal === null) throw participacionNoEncontrada()
}

// Las réplicas de una principal, de la más antigua a la más reciente, con cursor. En una sola
// instantánea: el foro (null si no existe en la clase), la principal (404), el cursor (una réplica de
// esa principal) y la página por el índice (principal_id, creado_en, id).
export const listarReplicas = (
  {
    claseId,
    foroId,
    participacionId,
    cursor,
    limite,
    actor,
    relacion,
  }: {
    claseId: string
    foroId: string
    participacionId: string
    cursor: string | undefined
    limite: number
    actor: ParticipanteDeAutoria
    relacion: RelacionConClase
  },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaReplicasDb | null> =>
  enTransaccion(
    ejecutor,
    async (tx) => {
      if (!(await esActividadDeTipo(tx, { id: foroId, claseId, tipo: "foro" }))) return null
      await exigirPrincipal(tx, { foroId, participacionId })
      const donde = { foroId, principalId: participacionId }
      if (cursor !== undefined) {
        const delCursor = await tx.participacionForo.findFirst({
          where: { ...donde, id: cursor },
          select: { id: true },
        })
        if (delCursor === null) throw errorCursorInvalido()
      }
      const filas = await tx.participacionForo.findMany({
        where: donde,
        select: SELECT_PARTICIPACION,
        orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
        take: limite + 1,
        ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
      })
      const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.id)
      return {
        replicas: pagina.map((fila) => replicaDe(fila, { actor, relacion })),
        siguienteCursor,
      }
    },
    { instantaneaUnica: true },
  )

// Publicar la principal (§D-3.4, §D-4), en READ COMMITTED y en este orden: la fila de tareas del foro
// bloqueada (null si no existe en la clase o si un borrado confirmó antes), el tipo (null si el id es
// de otra actividad), la fila perezosa de la entrega, esa fila bloqueada (dos principales del mismo
// alumno quedan en serie aquí y la segunda ve la fecha de la primera), la decisión de core/ (si lanza,
// se revierte todo, también la fila perezosa), la participación, la entrega (entregado, con la fecha,
// el retraso y la versión siguiente, con la misma hora que la participación; los enlaces no cambian)
// y la respuesta leída en la misma transacción. El índice único parcial es la red de seguridad: su
// choque responde lo mismo que la decisión. No encola nada (S-09).
export const publicarParticipacion = (
  {
    id,
    claseId,
    foroId,
    alumnoId,
    texto,
    ahora,
  }: { id: string; claseId: string; foroId: string; alumnoId: string; texto: string; ahora: Date },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ParticipacionPublicadaDb | null> =>
  enTransaccion(ejecutor, async (tx) => {
    const foro = await bloquearTareaParaEntregar(tx, { tareaId: foroId, claseId })
    if (foro === null) return null
    if (!(await esActividadDeTipo(tx, { id: foroId, claseId, tipo: "foro" }))) return null
    await asegurarFilaDeEntrega(tx, { tareaId: foroId, alumnoId })
    const fila = await bloquearEntrega(tx, { tareaId: foroId, alumnoId })
    if (fila === null) throw errorForoMalFormado()
    const releida = await tx.entrega.findUnique({
      where: { id: fila.id },
      select: { fechaEntrega: true },
    })
    if (releida === null) throw errorForoMalFormado()
    const { conRetraso } = decidirParticipacionPrincipal({
      foro,
      estado: fila.estado,
      fechaEntrega: releida.fechaEntrega,
      ahora,
    })
    const creada = await tx.participacionForo
      .create({
        data: {
          id,
          foroId,
          autorId: alumnoId,
          principalId: null,
          texto,
          conRetraso,
          creadoEn: ahora,
        },
        select: SELECT_PARTICIPACION,
      })
      .catch((error: unknown) =>
        traducirErrorPrisma(error, { alDuplicar: () => participacionYaPublicada() }),
      )
    await tx.entrega.update({
      where: { id: fila.id },
      data: { estado: "entregado", fechaEntrega: ahora, conRetraso, version: { increment: 1 } },
      select: { id: true },
    })
    const miParticipacion = await leerMiParticipacionCon(tx, { claseId, foroId, alumnoId, ahora })
    if (miParticipacion === null) throw errorForoMalFormado()
    return {
      participacion: participacionDe(creada, 0, {
        actor: { id: alumnoId, rol: "estudiante" },
        relacion: "estudiante",
      }),
      miParticipacion,
    }
  })

// Publicar una réplica (§D-3.4, §D-4), en READ COMMITTED: la fila de tareas del foro bloqueada (null
// si no existe o si un borrado confirmó antes: nunca un P2003), el tipo, la principal (404), la
// decisión de core/ con el rol de quien replica (la ruta solo admite alumnos y maestros) y la réplica.
// No toca entregas ni encola nada.
export const publicarReplica = (
  {
    id,
    claseId,
    foroId,
    participacionId,
    autor,
    texto,
    ahora,
  }: {
    id: string
    claseId: string
    foroId: string
    participacionId: string
    autor: { id: string; rol: Rol }
    texto: string
    ahora: Date
  },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ReplicaDb | null> =>
  enTransaccion(ejecutor, async (tx) => {
    const foro = await bloquearTareaParaEntregar(tx, { tareaId: foroId, claseId })
    if (foro === null) return null
    if (!(await esActividadDeTipo(tx, { id: foroId, claseId, tipo: "foro" }))) return null
    await exigirPrincipal(tx, { foroId, participacionId })
    const { conRetraso } = decidirReplica({ foro, rolDelAutor: autor.rol, ahora })
    const creada = await tx.participacionForo
      .create({
        data: {
          id,
          foroId,
          autorId: autor.id,
          principalId: participacionId,
          texto,
          conRetraso,
          creadoEn: ahora,
        },
        select: SELECT_PARTICIPACION,
      })
      .catch((error: unknown) =>
        // FORO-01b (§D-11): si el admin borró la principal entre la lectura y el INSERT, la llave
        // foránea ya no la encuentra: 404, nunca un 500.
        traducirErrorPrisma(error, {
          alDuplicar: () => errorReplicaInalcanzable(),
          alFaltarReferencia: () => participacionNoEncontrada(),
        }),
      )
    // Quien replica ve la marca de lo suyo con cualquier relación (DH-07 a): es propia.
    return replicaDe(creada, { actor: autor, relacion: "estudiante" })
  })

// Lo que escribió un alumno en un foro (su principal y sus réplicas), del más antiguo al más reciente,
// con cursor, para quien califica. En una sola instantánea: el foro (null si no existe en la clase), el
// alumno de la ruta (inscrito con cuenta activa, ALUMNO_NO_ENCONTRADO), el cursor (una participación
// de ese alumno en ese foro) y la página por el índice (foro_id, autor_id, creado_en, id), con la
// principal a la que responde cada réplica.
export const listarParticipacionesDeAlumno = (
  {
    claseId,
    foroId,
    alumnoId,
    cursor,
    limite,
  }: {
    claseId: string
    foroId: string
    alumnoId: string
    cursor: string | undefined
    limite: number
  },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaParticipacionesDeAlumnoDb | null> =>
  enTransaccion(
    ejecutor,
    async (tx) => {
      if (!(await esActividadDeTipo(tx, { id: foroId, claseId, tipo: "foro" }))) return null
      await alumnoInscrito(tx, { claseId, alumnoId })
      const donde = { foroId, autorId: alumnoId }
      if (cursor !== undefined) {
        const delCursor = await tx.participacionForo.findFirst({
          where: { ...donde, id: cursor },
          select: { id: true },
        })
        if (delCursor === null) throw errorCursorInvalido()
      }
      const filas = await tx.participacionForo.findMany({
        where: donde,
        select: {
          id: true,
          texto: true,
          creadoEn: true,
          conRetraso: true,
          principal: { select: { id: true, autor: SELECT_AUTOR } },
        },
        orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
        take: limite + 1,
        ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
      })
      const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.id)
      return {
        participaciones: pagina.map((fila) => ({
          id: fila.id,
          texto: fila.texto,
          creadoEn: fila.creadoEn,
          conRetraso: fila.conRetraso,
          enRespuestaA:
            fila.principal === null
              ? null
              : { participacionId: fila.principal.id, autor: firmaDelAutor(fila.principal.autor) },
        })),
        siguienteCursor,
      }
    },
    { instantaneaUnica: true },
  )

const errorBorradoNoPermitido = (): AppError =>
  new AppError("BORRADO_NO_PERMITIDO", "No puedes borrar lo que publicó otra persona.", 403)

// FORO-01b (§D-11; DH-05, PB-1 a, PB-2 a, E5-1 y E5-4). Borrar una participación principal o una
// réplica, en READ COMMITTED y con el orden del proyecto (tareas, entregas, participaciones_foro):
// 1. la fila de tareas del foro (en serie con borrar el foro; false si no existe en la clase) y su tipo;
// 2. la participación de ese foro (404 PARTICIPACION_NO_ENCONTRADA) y la regla de core/ (403);
// 3. si es una principal, la fila de la entrega de su autor bloqueada (en serie con calificar, con otra
//    principal de ese alumno y con otro borrado de la misma principal), la relectura de la principal
//    después del bloqueo (si otro borrado confirmó mientras este esperaba, 404 sin escribir nada) y el
//    efecto de core/: conservar una calificada; devolver una entregada a sin participar, con la versión
//    siguiente;
// 4. el borrado (las réplicas de una principal caen en cascada); si ya no estaba, 404, para revertir.
// No encola nada (P-11).
export const borrarParticipacion = (
  {
    claseId,
    foroId,
    participacionId,
    actor,
  }: { claseId: string; foroId: string; participacionId: string; actor: ParticipanteDeAutoria },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<boolean> =>
  enTransaccion(ejecutor, async (tx) => {
    const foro = await bloquearTareaParaEntregar(tx, { tareaId: foroId, claseId })
    if (foro === null) return false
    if (!(await esActividadDeTipo(tx, { id: foroId, claseId, tipo: "foro" }))) return false
    const participacion = await tx.participacionForo.findFirst({
      where: { id: participacionId, foroId },
      select: { id: true, autorId: true, principalId: true },
    })
    if (participacion === null) throw participacionNoEncontrada()
    if (!puedeBorrarParticipacion(actor)) throw errorBorradoNoPermitido()

    if (participacion.principalId === null) {
      const entrega = await bloquearEntrega(tx, {
        tareaId: foroId,
        alumnoId: participacion.autorId,
      })
      const sigue = await tx.participacionForo.findFirst({
        where: { id: participacionId, foroId, principalId: null },
        select: { id: true },
      })
      if (sigue === null) throw participacionNoEncontrada()
      if (entrega === null) throw errorForoMalFormado()
      if (efectoDeBorrarPrincipal({ estado: entrega.estado }) === "volver-a-sin-participar") {
        await tx.entrega.update({
          where: { id: entrega.id },
          data: {
            estado: "asignado",
            fechaEntrega: null,
            conRetraso: false,
            version: { increment: 1 },
          },
          select: { id: true },
        })
      }
    }

    const { count } = await tx.participacionForo.deleteMany({
      where: { id: participacionId, foroId },
    })
    if (count === 0) throw participacionNoEncontrada()
    return true
  })
