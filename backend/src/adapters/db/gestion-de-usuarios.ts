import type { EstadoPagoAlumno, Rol } from "@campus/shared"

import type { DecisionDeAcceso, PedidoDeAcceso } from "../../core/usuarios/acceso.js"
import type { CambioDeActivo } from "../../core/usuarios/baja.js"
import { TEXTOS_USUARIOS } from "../../core/usuarios/textos.js"
import { AppError } from "../../core/errores.js"
import { paginar } from "../../core/paginacion.js"
import { bloquearUsuarioParaEscribir } from "./bloqueo-usuario.js"
import { enTransaccion, obtenerDb, type Ejecutor } from "./cliente.js"
import { traducirErrorPrisma } from "./errores.js"
import { Prisma } from "./generated/client.js"

// ADMIN-01e (§D-7, §D-8). Gestión de usuarios del administrador: lista, ficha, nombre, baja y
// reactivación, alta de alumno, estado de pago por lote, acceso y resumen. Las escrituras sobre una
// cuenta siguen el protocolo de bloqueo por usuario (PB, adapters/README.md): primero la fila del
// usuario para escribir, después lecturas sin bloqueo.

export type EstadoPagoDb = EstadoPagoAlumno

// Una fila tal como se lee. El handler la convierte en la respuesta y solo pone los datos de pago y
// de acceso en las filas de estudiantes (RN-02).
export interface UsuarioGestionDb {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  creadoEn: Date
  estadoPago: EstadoPagoDb
  fechaEstadoPago: Date | null
  accesoRestringido: boolean
  motivoRestriccion: string | null
  fechaRestriccion: Date | null
}

export interface ListaUsuariosDb {
  usuarios: UsuarioGestionDb[]
  siguienteCursor: string | null
  // El nombre de la última fila cuando hay página siguiente (Enmienda 5); si no, null.
  siguienteCursorNombre: string | null
}

export interface ResumenAdminDb {
  alumnos: number
  maestros: number
  clasesActivas: number
}

const SELECT_USUARIO_GESTION = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  activo: true,
  creadoEn: true,
  estadoPago: true,
  fechaEstadoPago: true,
  accesoRestringido: true,
  motivoRestriccion: true,
  fechaRestriccion: true,
} as const

const errorCursorInvalido = (): AppError => new AppError("VALIDACION", "cursor: no es válido", 400)

// Las mismas columnas en el SQL crudo de la lista, con los nombres de UsuarioGestionDb.
const COLUMNAS_USUARIO_GESTION = Prisma.sql`
  id::text AS id, nombre, email, rol::text AS rol, activo, creado_en AS "creadoEn",
  estado_pago::text AS "estadoPago", fecha_estado_pago AS "fechaEstadoPago",
  acceso_restringido AS "accesoRestringido", motivo_restriccion AS "motivoRestriccion",
  fecha_restriccion AS "fechaRestriccion"`

interface FiltrosDeUsuarios {
  // Ya preparada por core/ (prepararBusquedaDeUsuarios): normalizada y con los comodines escapados.
  busqueda?: { nombre: string; email: string } | undefined
  rol?: Rol | undefined
  estadoPago?: EstadoPagoDb | undefined
}

// Los filtros de la página y los de la fila del cursor son los mismos (R-04). Todo valor va como
// parámetro; el término se busca a la vez en nombre_busqueda y en email (S-12), con el escape por
// defecto de LIKE (la barra invertida).
const condicionesDeUsuarios = ({ busqueda, rol, estadoPago }: FiltrosDeUsuarios): Prisma.Sql => {
  const condiciones: Prisma.Sql[] = [Prisma.sql`TRUE`]
  if (busqueda !== undefined) {
    condiciones.push(
      Prisma.sql`(nombre_busqueda LIKE '%' || ${busqueda.nombre} || '%' OR email LIKE '%' || ${busqueda.email} || '%')`,
    )
  }
  if (rol !== undefined) condiciones.push(Prisma.sql`rol = ${rol}::rol_usuario`)
  if (estadoPago !== undefined) {
    condiciones.push(Prisma.sql`estado_pago = ${estadoPago}::estado_pago`)
  }
  return Prisma.join(condiciones, " AND ")
}

// §D-7.1 y Enmienda 5. Orden (nombre_busqueda, id). El cursor es el id de la última fila y
// cursorNombre su nombre tal como lo entregó la respuesta: van juntos o ninguno. La fila del cursor
// se lee por PK con los mismos filtros, en la misma instantánea que la página; si no existe, ya no
// cumple los filtros o su nombre cambió, 400 "cursor: no es válido" (con el nombre de la fila y no
// solo el id, una cuenta renombrada entre dos páginas no salta ni repite filas en silencio).
export const listarUsuarios = (
  {
    busqueda,
    rol,
    estadoPago,
    cursor,
    cursorNombre,
    limite,
  }: FiltrosDeUsuarios & {
    cursor: string | undefined
    cursorNombre: string | undefined
    limite: number
  },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaUsuariosDb> => {
  if ((cursor === undefined) !== (cursorNombre === undefined)) throw errorCursorInvalido()
  const filtros = condicionesDeUsuarios({ busqueda, rol, estadoPago })

  return enTransaccion(
    ejecutor,
    async (tx) => {
      let despues = Prisma.empty
      if (cursor !== undefined) {
        const [fila] = await tx.$queryRaw<{ nombre: string; nombreBusqueda: string }[]>`
          SELECT nombre, nombre_busqueda AS "nombreBusqueda"
          FROM usuarios
          WHERE id = ${cursor}::uuid AND ${filtros}`
        if (fila === undefined || fila.nombre !== cursorNombre) throw errorCursorInvalido()
        despues = Prisma.sql`AND (nombre_busqueda, id) > (${fila.nombreBusqueda}, ${cursor}::uuid)`
      }
      const filas = await tx.$queryRaw<UsuarioGestionDb[]>`
        SELECT ${COLUMNAS_USUARIO_GESTION}
        FROM usuarios
        WHERE ${filtros} ${despues}
        ORDER BY nombre_busqueda, id
        LIMIT ${limite + 1}`
      const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.id)
      const ultima = pagina.at(-1)
      return {
        usuarios: pagina,
        siguienteCursor,
        siguienteCursorNombre:
          siguienteCursor === null || ultima === undefined ? null : ultima.nombre,
      }
    },
    { instantaneaUnica: true },
  )
}

// §D-7.2: la ficha. null si la cuenta no existe (404 en el handler).
export const leerUsuarioAdmin = (
  id: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<UsuarioGestionDb | null> =>
  ejecutor.usuario.findUnique({ where: { id }, select: SELECT_USUARIO_GESTION })

// §D-7.3: nombre y nombre_busqueda llegan preparados por core/ (prepararNombre). No toca sesiones ni
// tokens, así que no necesita el bloqueo del protocolo. null si la cuenta no existe.
export const editarNombre = (
  { id, nombre, nombreBusqueda }: { id: string; nombre: string; nombreBusqueda: string },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<UsuarioGestionDb | null> =>
  enTransaccion(ejecutor, async (tx) => {
    const { count } = await tx.usuario.updateMany({
      where: { id },
      data: { nombre, nombreBusqueda },
    })
    if (count === 0) return null
    return tx.usuario.findUnique({ where: { id }, select: SELECT_USUARIO_GESTION })
  })

const revocarSesionesYTokens = async (
  tx: Prisma.TransactionClient,
  usuarioId: string,
  ahora: Date,
): Promise<void> => {
  await tx.sesion.updateMany({
    where: { usuarioId, revocadaEn: null },
    data: { revocadaEn: ahora },
  })
  await tx.tokenCuenta.updateMany({
    where: { usuarioId, usadoEn: null, revocadoEn: null },
    data: { revocadoEn: ahora },
  })
}

// §D-7.4 (P-01 a′, PB-8). Bloqueo de escritura del usuario primero; después, sin bloqueo, su rol y,
// solo para la baja de un maestro, sus asignaciones en clases activas (las archivadas no cuentan).
// `decidir` es la decisión de core/ (decidirCambioDeActivo). La baja revoca sus sesiones y sus
// enlaces de cuenta vivos; reactivar no restaura nada. null si la cuenta no existe.
export const cambiarActivo = (
  {
    id,
    activo,
    ahora,
    decidir,
  }: {
    id: string
    activo: boolean
    ahora: Date
    decidir: (cambio: CambioDeActivo) => { escribir: boolean } | AppError
  },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<UsuarioGestionDb | null> =>
  enTransaccion(ejecutor, async (tx) => {
    const bloqueado = await bloquearUsuarioParaEscribir(tx, id)
    if (bloqueado === null) return null
    const cuenta = await tx.usuario.findUnique({ where: { id }, select: { rol: true } })
    if (cuenta === null) return null
    const clasesAsignadas =
      cuenta.rol === "maestro" && !activo
        ? await tx.maestroDeClase.count({ where: { maestroId: id, clase: { archivadaEn: null } } })
        : 0
    const decision = decidir({
      rol: cuenta.rol,
      activoActual: bloqueado.activo,
      activoPedido: activo,
      clasesAsignadas,
    })
    if (decision instanceof AppError) throw decision
    if (decision.escribir) {
      await tx.usuario.update({ where: { id }, data: { activo }, select: { id: true } })
      if (!activo) await revocarSesionesYTokens(tx, id, ahora)
    }
    return tx.usuario.findUnique({ where: { id }, select: SELECT_USUARIO_GESTION })
  })

// §D-7.5 (P-01 a): el alumno nace con la contraseña temporal (su hash llega hecho, fuera de la
// transacción) y el cambio obligatorio. El único índice único que un estudiante puede violar es el
// del correo.
export const crearAlumnoConTemporal = async (
  {
    nombre,
    nombreBusqueda,
    email,
    hashContrasena,
  }: { nombre: string; nombreBusqueda: string; email: string; hashContrasena: string },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<UsuarioGestionDb> => {
  try {
    return await ejecutor.usuario.create({
      data: {
        nombre,
        nombreBusqueda,
        email,
        hashContrasena,
        rol: "estudiante",
        debeCambiarContrasena: true,
      },
      select: SELECT_USUARIO_GESTION,
    })
  } catch (error) {
    return traducirErrorPrisma(error, {
      alDuplicar: () => new AppError("CORREO_EN_USO", "Ya existe una cuenta con ese correo.", 409),
    })
  }
}

// §D-8 (S-11, PB-3). Toma las filas de los ids en orden de id para escribir (dos lotes cruzados no
// se bloquean en ciclo); si falta alguna o alguna no es de un estudiante, 400 sin escribir. Solo
// cambian las filas cuyo estado cambia, y con ellas fecha_estado_pago. No revoca sesiones (RN-01).
// Los ids llegan sin repetidos (el esquema los compara en minúsculas).
export const cambiarEstadoPagoEnLote = (
  {
    alumnoIds,
    estadoPago,
    ahora,
  }: { alumnoIds: readonly string[]; estadoPago: EstadoPagoDb; ahora: Date },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<number> =>
  enTransaccion(ejecutor, async (tx) => {
    const ids = alumnoIds.map((id) => id.toLowerCase())
    const filas = await tx.$queryRaw<{ rol: string }[]>`
      SELECT rol::text AS rol
      FROM usuarios
      WHERE id = ANY(${ids}::uuid[])
      ORDER BY id
      FOR NO KEY UPDATE`
    if (filas.length !== ids.length || filas.some((fila) => fila.rol !== "estudiante")) {
      throw new AppError("VALIDACION", TEXTOS_USUARIOS.loteConCuentasQueNoSonDeAlumnos, 400)
    }
    const { count } = await tx.usuario.updateMany({
      where: { id: { in: ids }, estadoPago: { not: estadoPago } },
      data: { estadoPago, fechaEstadoPago: ahora },
    })
    return count
  })

// §D-8 (RF-55, PB-8). Bloqueo de escritura del usuario primero; `decidir` es la decisión de core/
// (decidirCambioDeAcceso). Restringir a quien no lo estaba fija la fecha y revoca sus sesiones
// (RF-04c); restringir de nuevo solo cambia el motivo y conserva la fecha; restablecer borra motivo
// y fecha. null si la cuenta no existe.
export const cambiarAcceso = (
  {
    id,
    pedido,
    ahora,
    decidir,
  }: {
    id: string
    pedido: PedidoDeAcceso
    ahora: Date
    decidir: (cambio: {
      rol: Rol
      restringidoActual: boolean
      motivoActual: string | null
      pedido: PedidoDeAcceso
    }) => DecisionDeAcceso | AppError
  },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<UsuarioGestionDb | null> =>
  enTransaccion(ejecutor, async (tx) => {
    const bloqueado = await bloquearUsuarioParaEscribir(tx, id)
    if (bloqueado === null) return null
    const cuenta = await tx.usuario.findUnique({
      where: { id },
      select: { rol: true, accesoRestringido: true, motivoRestriccion: true },
    })
    if (cuenta === null) return null
    const decision = decidir({
      rol: cuenta.rol,
      restringidoActual: cuenta.accesoRestringido,
      motivoActual: cuenta.motivoRestriccion,
      pedido,
    })
    if (decision instanceof AppError) throw decision
    if (decision.escribir) {
      const datos = pedido.restringido
        ? {
            accesoRestringido: true,
            motivoRestriccion: pedido.motivo ?? null,
            ...(cuenta.accesoRestringido ? {} : { fechaRestriccion: ahora }),
          }
        : { accesoRestringido: false, motivoRestriccion: null, fechaRestriccion: null }
      await tx.usuario.update({ where: { id }, data: datos, select: { id: true } })
    }
    if (decision.revocarSesiones) {
      await tx.sesion.updateMany({
        where: { usuarioId: id, revocadaEn: null },
        data: { revocadaEn: ahora },
      })
    }
    return tx.usuario.findUnique({ where: { id }, select: SELECT_USUARIO_GESTION })
  })

// §D-7.6 (S-13): tres conteos en serie dentro de la misma instantánea, para que las tres cifras sean
// del mismo momento.
export const leerResumenAdmin = (ejecutor: Ejecutor = obtenerDb()): Promise<ResumenAdminDb> =>
  enTransaccion(
    ejecutor,
    async (tx) => {
      const alumnos = await tx.usuario.count({ where: { rol: "estudiante", activo: true } })
      const maestros = await tx.usuario.count({ where: { rol: "maestro", activo: true } })
      const clasesActivas = await tx.clase.count({ where: { archivadaEn: null } })
      return { alumnos, maestros, clasesActivas }
    },
    { instantaneaUnica: true },
  )
