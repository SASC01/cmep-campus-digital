import { enTransaccion, obtenerDb, type Ejecutor } from "./cliente.js"
import type { NuevaSesionDeUsuario, NuevoUsuario } from "./usuarios.js"
import { crearUsuario } from "./usuarios.js"

export interface EnlaceRegistroDb {
  id: string
  creadoEn: Date
  expiraEn: Date
  revocadoEn: Date | null
}

export interface EnlaceRegistroConRegistrados extends EnlaceRegistroDb {
  registrados: number
}

const SELECT_ENLACE = {
  id: true,
  creadoEn: true,
  expiraEn: true,
  revocadoEn: true,
} as const

export const crearEnlaceRegistro = (
  { hashToken, expiraEn }: { hashToken: string; expiraEn: Date },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<EnlaceRegistroDb> =>
  ejecutor.enlaceRegistro.create({ data: { hashToken, expiraEn }, select: SELECT_ENLACE })

export interface ListaEnlacesDb {
  enlaces: EnlaceRegistroConRegistrados[]
  siguienteCursor: string | null
}

// §D-B4, "Acceso a datos": dos lecturas sin transacción (un conteo desfasado un instante es
// aceptable). El conteo de registrados es un solo groupBy sobre los ids de la página, no una
// consulta por fila (sin N+1).
export const listarEnlacesRegistro = async (
  { cursor, limite }: { cursor: string | undefined; limite: number },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaEnlacesDb> => {
  const filas = await ejecutor.enlaceRegistro.findMany({
    select: SELECT_ENLACE,
    orderBy: [{ creadoEn: "desc" }, { id: "desc" }],
    take: limite + 1,
    ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
  })

  const hayMas = filas.length > limite
  const pagina = hayMas ? filas.slice(0, limite) : filas
  const siguienteCursor = hayMas ? (pagina[pagina.length - 1]?.id ?? null) : null

  if (pagina.length === 0) return { enlaces: [], siguienteCursor: null }

  const conteos = await ejecutor.usuario.groupBy({
    by: ["enlaceRegistroId"],
    where: { enlaceRegistroId: { in: pagina.map((enlace) => enlace.id) } },
    _count: { _all: true },
  })
  const conteoPorId = new Map(conteos.map((fila) => [fila.enlaceRegistroId, fila._count._all]))

  return {
    enlaces: pagina.map((enlace) => ({ ...enlace, registrados: conteoPorId.get(enlace.id) ?? 0 })),
    siguienteCursor,
  }
}

export const buscarEnlacePorId = (
  id: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<EnlaceRegistroDb | null> =>
  ejecutor.enlaceRegistro.findUnique({ where: { id }, select: SELECT_ENLACE })

export const buscarEnlacePorHash = (
  hash: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<EnlaceRegistroDb | null> =>
  ejecutor.enlaceRegistro.findUnique({ where: { hashToken: hash }, select: SELECT_ENLACE })

// Idempotente (§D-B4): un id inexistente devuelve null (404); revocar un enlace ya revocado
// conserva su revocado_en original y responde 200 con el estado confirmado, en la misma
// transacción.
//
// T-07 (ronda 1) / Enmienda 6 (arbitraje del manager): la hora ya no la decide el handler antes de
// pedir el bloqueo. La función toma primero FOR NO KEY UPDATE (bloqueo explícito, `$queryRaw`
// etiquetado) y fija `new Date()` justo después de obtenerlo: el mismo reloj de pared (`Date`,
// Node) con el que se construye cualquier otra fecha del backend, incluida la que usa
// `registrarMaestroConEnlace` para su expira_en > ahora y la que Prisma usa para creado_en de
// usuarios (CURRENT_TIMESTAMP de PostgreSQL, tomado al inicio de la transacción de esa inserción,
// que ya terminó y confirmó para cuando esta consigue el bloqueo). Como `registrarMaestroConEnlace`
// también toma FOR NO KEY UPDATE (Enmienda 6) sobre esta misma fila, y ese modo choca consigo mismo,
// ningún registro nuevo puede tomar el bloqueo mientras esta transacción lo retiene, y la cola entre
// una revocación en espera y los registros que llegan después es justa (se forman detrás, no la
// saltan): así ninguna cuenta puede confirmar su INSERT con un creado_en posterior al revocado_en
// que se fija aquí, y la revocación no puede quedar esperando sin límite. Detalle completo en
// `adapters/README.md`, "enlace de registro frente a la revocación".
export const revocarEnlaceRegistro = (
  { id }: { id: string },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<EnlaceRegistroConRegistrados | null> =>
  enTransaccion(ejecutor, async (tx) => {
    const [bloqueada] = await tx.$queryRaw<{ revocadoEn: Date | null }[]>`
      SELECT revocado_en AS "revocadoEn" FROM enlaces_registro
      WHERE id = ${id}::uuid FOR NO KEY UPDATE`
    if (bloqueada === undefined) return null

    if (bloqueada.revocadoEn === null) {
      await tx.enlaceRegistro.update({
        where: { id },
        data: { revocadoEn: new Date() },
        select: { id: true },
      })
    }

    const enlace = await tx.enlaceRegistro.findUnique({ where: { id }, select: SELECT_ENLACE })
    if (enlace === null) return null
    const registrados = await tx.usuario.count({ where: { enlaceRegistroId: id } })
    return { ...enlace, registrados }
  })

export interface RegistradoDb {
  id: string
  nombre: string
  email: string
  creadoEn: Date
}

export interface ListaRegistradosDb {
  registrados: RegistradoDb[]
  siguienteCursor: string | null
}

// null si el enlace no existe (404, §D-B4). Sin estadoPago, rol ni activo.
export const listarRegistradosPorEnlace = async (
  { enlaceId, cursor, limite }: { enlaceId: string; cursor: string | undefined; limite: number },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaRegistradosDb | null> => {
  const enlace = await buscarEnlacePorId(enlaceId, ejecutor)
  if (enlace === null) return null

  const filas = await ejecutor.usuario.findMany({
    where: { enlaceRegistroId: enlaceId },
    select: { id: true, nombre: true, email: true, creadoEn: true },
    orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
    take: limite + 1,
    ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
  })

  const hayMas = filas.length > limite
  const pagina = hayMas ? filas.slice(0, limite) : filas
  const siguienteCursor = hayMas ? (pagina[pagina.length - 1]?.id ?? null) : null

  return { registrados: pagina, siguienteCursor }
}

// §D-B5 (Enmienda 6, arbitraje T-07): registro público de maestro con un enlace vivo. Toma
// FOR NO KEY UPDATE sobre la fila del enlace, no FOR SHARE: los dos modos chocan con el
// FOR NO KEY UPDATE explícito que toma revocarEnlaceRegistro, así que ningún registro confirma
// después de que una revocación obtuvo el bloqueo (§D-B5, "Revocación frente a registro"). Con
// FOR NO KEY UPDATE, además, la cola de esa fila vuelve a ser justa: un registro nuevo que la
// encuentra tomada se forma detrás de cualquier revocación que ya esperaba (el modo choca consigo
// mismo), así que la revocación ya no puede quedarse esperando sin límite mientras llegan registros
// nuevos (con FOR SHARE, un registro nuevo se concede de inmediato porque es compatible con el
// titular, sin formarse detrás del FOR NO KEY UPDATE en espera). Los registros del mismo enlace
// quedan en serie, pero la transacción solo hace dos INSERT (usuario y sesión) y argon2 corre fuera
// de ella, así que el tiempo acotado no acerca el riesgo de P2028 (5 s). El FOR KEY SHARE que toma
// la FK al insertar el usuario es más débil que este bloqueo, así que no hay subida de modo; no hay
// deadlock porque el registro solo toma esta fila y después inserta, y la revocación solo toma esta
// misma fila. crearUsuario traduce un P2002 de correo duplicado a 409 CORREO_EN_USO y lo relanza,
// sin atraparlo (E-02 de AUTH-02). La transacción crea al usuario, así que el protocolo de bloqueo
// por usuario no aplica.
export const registrarMaestroConEnlace = (
  {
    enlaceId,
    usuario,
    sesion,
    ahora,
  }: { enlaceId: string; usuario: NuevoUsuario; sesion: NuevaSesionDeUsuario; ahora: Date },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<{ usuarioId: string } | null> =>
  enTransaccion(ejecutor, async (tx) => {
    const filas = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM enlaces_registro
      WHERE id = ${enlaceId}::uuid AND revocado_en IS NULL AND expira_en > ${ahora}
      FOR NO KEY UPDATE`
    if (filas.length === 0) return null

    const { id: usuarioId } = await crearUsuario(usuario, tx)
    await tx.sesion.create({ data: { usuarioId, ...sesion }, select: { id: true } })
    return { usuarioId }
  })
