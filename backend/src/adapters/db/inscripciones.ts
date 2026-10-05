import { AppError } from "../../core/errores.js"
import { escaparComodinesLike } from "../../core/clases/busqueda.js"
import { paginar } from "../../core/paginacion.js"
import { ORDEN_DE_MAESTROS } from "./clases.js"
import { enTransaccion, obtenerDb, type Ejecutor } from "./cliente.js"
import { traducirErrorPrisma } from "./errores.js"
import type { Prisma } from "./generated/client.js"

export interface PersonaDb {
  id: string
  nombre: string
}

export interface PersonaConCorreoDb {
  id: string
  nombre: string
  email: string
}

export interface ListaPersonasDb {
  // El primero de `maestros` (compatibilidad, P-06 de CLASES-02).
  maestro: PersonaConCorreoDb
  maestros: PersonaConCorreoDb[]
  alumnos: PersonaConCorreoDb[]
  totalAlumnos: number
  siguienteCursor: string | null
}

export interface AlumnoDeClaseDb {
  id: string
  nombre: string
  email: string
  estadoPago: "al_corriente" | "deudor"
  accesoRestringido: boolean
  origen: "codigo" | "manual"
  inscritoEn: Date
}

export interface ListaAlumnosDeClaseDb {
  alumnos: AlumnoDeClaseDb[]
  total: number
  siguienteCursor: string | null
}

export interface CandidatoDb {
  id: string
  nombre: string
  email: string
  yaInscrito: boolean
}

export interface ListaCandidatosDb {
  candidatos: CandidatoDb[]
  hayMas: boolean
}

const errorCursorInvalido = (): AppError => new AppError("VALIDACION", "cursor: no es válido", 400)

const SOLO_CUENTAS_ACTIVAS = { usuario: { activo: true } } as const

// §D-B3 bis (N-02, O-01): la página se pide por conjunto de claves (nombre_busqueda, usuario_id),
// sin el `cursor` de Prisma. El cursor es un usuarioId; su nombre_busqueda se lee de `usuarios`
// por PK (una sola consulta, fuera de cualquier ciclo). Solo se rechaza si ese usuario no existe:
// un alumno quitado de la clase o desactivado sigue sirviendo, porque su clave de orden sobrevive.
const condicionesDePagina = async (
  { claseId, cursor, limite }: { claseId: string; cursor: string | undefined; limite: number },
  ejecutor: Ejecutor,
): Promise<{
  where: Prisma.InscripcionWhereInput
  orderBy: Prisma.InscripcionOrderByWithRelationInput[]
  take: number
}> => {
  const orderBy: Prisma.InscripcionOrderByWithRelationInput[] = [
    { usuario: { nombreBusqueda: "asc" } },
    { usuarioId: "asc" },
  ]
  const take = limite + 1
  if (cursor === undefined) return { where: { claseId, ...SOLO_CUENTAS_ACTIVAS }, orderBy, take }

  const delCursor = await ejecutor.usuario.findUnique({
    where: { id: cursor },
    select: { nombreBusqueda: true },
  })
  if (delCursor === null) throw errorCursorInvalido()

  const nombre = delCursor.nombreBusqueda
  return {
    where: {
      claseId,
      ...SOLO_CUENTAS_ACTIVAS,
      OR: [
        { usuario: { nombreBusqueda: { gt: nombre } } },
        { usuario: { nombreBusqueda: nombre }, usuarioId: { gt: cursor } },
      ],
    },
    orderBy,
    take,
  }
}

// "Personas" (RF-19, CLASES-02b): id, nombre y correo completo de los maestros de la clase y de los
// compañeros. Nunca selecciona el estado de pago ni la restricción de acceso. El orden de los
// maestros sale de ORDEN_DE_MAESTROS (db/clases.ts).
export const listarPersonas = async (
  { claseId, cursor, limite }: { claseId: string; cursor: string | undefined; limite: number },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaPersonasDb | null> => {
  const { where, orderBy, take } = await condicionesDePagina({ claseId, cursor, limite }, ejecutor)
  const [clase, filas, totalAlumnos] = await Promise.all([
    ejecutor.clase.findUnique({
      where: { id: claseId },
      select: {
        maestros: {
          select: { maestro: { select: { id: true, nombre: true, email: true } } },
          orderBy: ORDEN_DE_MAESTROS,
        },
      },
    }),
    ejecutor.inscripcion.findMany({
      where,
      orderBy,
      take,
      select: { usuarioId: true, usuario: { select: { nombre: true, email: true } } },
    }),
    ejecutor.inscripcion.count({ where: { claseId, ...SOLO_CUENTAS_ACTIVAS } }),
  ])
  if (clase === null) return null
  // Una clase siempre tiene de uno a dos maestros (RN-06); el principal es el primero (S-05).
  const maestros = clase.maestros.map((fila) => fila.maestro)
  const [maestro] = maestros
  if (maestro === undefined) return null

  const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.usuarioId)
  return {
    maestro,
    maestros,
    alumnos: pagina.map((fila) => ({
      id: fila.usuarioId,
      nombre: fila.usuario.nombre,
      email: fila.usuario.email,
    })),
    totalAlumnos,
    siguienteCursor,
  }
}

// Roster del dueño (RF-39, S-10). Es la ÚNICA función que selecciona el estado de pago, la
// restricción de acceso y el correo completo de un alumno (RN-02); su única ruta es
// GET /clases/:claseId/alumnos.
export const listarAlumnosDeClase = async (
  { claseId, cursor, limite }: { claseId: string; cursor: string | undefined; limite: number },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaAlumnosDeClaseDb> => {
  const { where, orderBy, take } = await condicionesDePagina({ claseId, cursor, limite }, ejecutor)
  const [filas, total] = await Promise.all([
    ejecutor.inscripcion.findMany({
      where,
      orderBy,
      take,
      select: {
        usuarioId: true,
        origen: true,
        creadoEn: true,
        usuario: {
          select: { nombre: true, email: true, estadoPago: true, accesoRestringido: true },
        },
      },
    }),
    ejecutor.inscripcion.count({ where: { claseId, ...SOLO_CUENTAS_ACTIVAS } }),
  ])

  const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.usuarioId)
  return {
    alumnos: pagina.map((fila) => ({
      id: fila.usuarioId,
      nombre: fila.usuario.nombre,
      email: fila.usuario.email,
      estadoPago: fila.usuario.estadoPago,
      accesoRestringido: fila.usuario.accesoRestringido,
      origen: fila.origen,
      inscritoEn: fila.creadoEn,
    })),
    total,
    siguienteCursor,
  }
}

// Buscador (RF-38, C-07): `termino` llega normalizado por core/ (prepararTerminoDeBusqueda); aquí
// se escapan los comodines de LIKE, que Prisma no escapa en `contains` (R-16). Se selecciona el
// correo solo para que el handler lo enmascare antes de responder (P-05 f).
export const buscarCandidatos = async (
  { claseId, termino, limite }: { claseId: string; termino: string; limite: number },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaCandidatosDb> => {
  try {
    const filas = await ejecutor.usuario.findMany({
      where: {
        nombreBusqueda: { contains: escaparComodinesLike(termino) },
        rol: "estudiante",
        activo: true,
      },
      orderBy: [{ nombreBusqueda: "asc" }, { id: "asc" }],
      take: limite + 1,
      select: {
        id: true,
        nombre: true,
        email: true,
        inscripciones: { where: { claseId }, select: { usuarioId: true } },
      },
    })
    const hayMas = filas.length > limite
    return {
      candidatos: filas.slice(0, limite).map((fila) => ({
        id: fila.id,
        nombre: fila.nombre,
        email: fila.email,
        yaInscrito: fila.inscripciones.length > 0,
      })),
      hayMas,
    }
  } catch (error) {
    // Un término con el carácter nulo es entrada inválida (400), no un 500.
    return traducirErrorPrisma(error, {
      alDuplicar: () => new AppError("ERROR_INTERNO", "No se pudo completar la búsqueda.", 500),
    })
  }
}

// Alta manual (§D-B2, P-05 g, S-23). actorId: quien hizo el cambio, un maestro de la clase o el
// administrador (P-08 a; la columna sigue llamándose maestro_id). Una transacción: alumno válido → inscripción → movimiento.
// El INSERT del movimiento es SIEMPRE el último paso: así su `secuencia` se toma después de
// cualquier espera por otra transacción y respeta el orden real de los cambios (M-03). Solo un
// cambio efectivo deja movimiento: un alta con yaEstaba no escribe nada. null: el alumno no existe,
// no es estudiante o está inactivo.
export const agregarAlumnoManual = (
  { claseId, alumnoId, actorId }: { claseId: string; alumnoId: string; actorId: string },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<{ alumno: PersonaDb; yaEstaba: boolean } | null> =>
  enTransaccion(ejecutor, async (tx) => {
    const alumno = await tx.usuario.findFirst({
      where: { id: alumnoId, rol: "estudiante", activo: true },
      select: { id: true, nombre: true },
    })
    if (alumno === null) return null

    const { count } = await tx.inscripcion.createMany({
      data: [{ claseId, usuarioId: alumnoId, origen: "manual" }],
      skipDuplicates: true,
    })
    if (count === 0) return { alumno, yaEstaba: true }

    await tx.movimientoInscripcion.create({
      data: { claseId, alumnoId, actorId, tipo: "alta" },
      select: { id: true },
    })
    return { alumno, yaEstaba: false }
  })

// Baja (§D-B2): borra la inscripción por PK y, solo si borró una fila, registra la baja como último
// paso de la misma transacción. Quitar a quien no está inscrito no escribe nada.
export const quitarAlumno = (
  { claseId, alumnoId, actorId }: { claseId: string; alumnoId: string; actorId: string },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<void> =>
  enTransaccion(ejecutor, async (tx) => {
    const { count } = await tx.inscripcion.deleteMany({
      where: { claseId, usuarioId: alumnoId },
    })
    if (count === 0) return

    await tx.movimientoInscripcion.create({
      data: { claseId, alumnoId, actorId, tipo: "baja" },
      select: { id: true },
    })
  })
