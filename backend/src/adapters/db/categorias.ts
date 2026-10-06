import { AppError } from "../../core/errores.js"
import { planearReemplazoDeCategorias, type CategoriaNueva } from "../../core/tareas/categorias.js"
import { bloquearClase } from "./bloqueo-clase.js"
import { enTransaccion, obtenerDb, type Ejecutor } from "./cliente.js"
import type { Prisma } from "./generated/client.js"

// TAREAS-01a (§D-3). Categorías ponderadas de una clase (RF-32). Se guardan en bloque (S-06): la
// lista completa reemplaza a la actual dentro de una transacción con la fila de la clase bloqueada,
// así que la suma de 100 y el tope de 10 se deciden en core/ sobre una lista que nadie más puede
// cambiar a la vez.

export interface CategoriaDb {
  id: string
  nombre: string
  peso: number
  tareas: number
}

const SELECT_CATEGORIA = { id: true, nombre: true, peso: true } as const

// Orden (creado_en, id), hasta 10 (sin paginar). `tareas` sale de un solo groupBy de tareas por
// categoria_id (índice (categoria_id)).
export const listarCategorias = async (
  claseId: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<CategoriaDb[]> => {
  const categorias = await ejecutor.categoria.findMany({
    where: { claseId },
    select: SELECT_CATEGORIA,
    orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
  })
  if (categorias.length === 0) return []
  const conteos = await ejecutor.tarea.groupBy({
    by: ["categoriaId"],
    where: { categoriaId: { in: categorias.map((categoria) => categoria.id) } },
    _count: { _all: true },
  })
  const porCategoria = new Map(conteos.map((conteo) => [conteo.categoriaId, conteo._count._all]))
  return categorias.map((categoria) => ({
    ...categoria,
    tareas: porCategoria.get(categoria.id) ?? 0,
  }))
}

const mensajeConTareas = (nombre: string, tareas: number): string =>
  `«${nombre}» tiene ${tareas} ${tareas === 1 ? "tarea" : "tareas"}. Muévelas a otra categoría antes de quitarla.`

// Bloquea FOR UPDATE las categorías que se quitan ANTES de contar sus tareas (§D-3, §D-7): una tarea
// que se está creando con esa categoría la tiene bloqueada FOR KEY SHARE (referencias.ts), así que el
// guardado espera a que confirme y después la cuenta; si el guardado confirmó antes, la tarea no ve la
// categoría (404). Ninguna tarea se queda con una categoría borrada.
const rechazarSiTienenTareas = async (
  tx: Prisma.TransactionClient,
  claseId: string,
  quitar: readonly string[],
  nombres: ReadonlyMap<string, string>,
): Promise<void> => {
  if (quitar.length === 0) return
  const ids = [...quitar]
  await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM categorias
    WHERE id = ANY(${ids}::uuid[]) AND clase_id = ${claseId}::uuid
    FOR UPDATE`
  const conteos = await tx.tarea.groupBy({
    by: ["categoriaId"],
    where: { categoriaId: { in: ids } },
    _count: { _all: true },
  })
  const conTareas = conteos.find((conteo) => conteo._count._all > 0)
  if (conTareas === undefined || conTareas.categoriaId === null) return
  throw new AppError(
    "CATEGORIA_CON_TAREAS",
    mensajeConTareas(nombres.get(conTareas.categoriaId) ?? "", conTareas._count._all),
    409,
  )
}

export const reemplazarCategorias = (
  { claseId, categorias }: { claseId: string; categorias: readonly CategoriaNueva[] },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<CategoriaDb[]> =>
  enTransaccion(ejecutor, async (tx) => {
    await bloquearClase(tx, claseId)
    const actuales = await tx.categoria.findMany({
      where: { claseId },
      select: SELECT_CATEGORIA,
      orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
    })
    const plan = planearReemplazoDeCategorias(actuales, categorias)
    await rechazarSiTienenTareas(
      tx,
      claseId,
      plan.quitar,
      new Map(actuales.map((categoria) => [categoria.id, categoria.nombre])),
    )

    if (plan.quitar.length > 0) {
      await tx.categoria.deleteMany({ where: { id: { in: plan.quitar }, claseId } })
    }

    // Solo las que cambian, en una sola sentencia. El SQL crudo no activa @updatedAt, así que
    // actualizado_en se pone a mano. Etiquetado y parametrizado.
    const anteriores = new Map(actuales.map((categoria) => [categoria.id, categoria]))
    const cambian = plan.actualizar.filter((categoria) => {
      const anterior = anteriores.get(categoria.id)
      return anterior?.nombre !== categoria.nombre || anterior.peso !== categoria.peso
    })
    if (cambian.length > 0) {
      const ids = cambian.map((categoria) => categoria.id)
      const nombres = cambian.map((categoria) => categoria.nombre)
      const pesos = cambian.map((categoria) => categoria.peso)
      await tx.$executeRaw`
        UPDATE categorias
        SET nombre = v.nombre, peso = v.peso, actualizado_en = now()
        FROM unnest(${ids}::uuid[], ${nombres}::text[], ${pesos}::int[]) AS v(id, nombre, peso)
        WHERE categorias.id = v.id AND categorias.clase_id = ${claseId}::uuid`
    }

    // creado_en distinto por categoría (un milisegundo de diferencia): el orden de la lista es
    // (creado_en, id) y las nuevas deben quedar en el orden en que se capturaron, no por su id.
    if (plan.crear.length > 0) {
      const base = Date.now()
      await tx.categoria.createMany({
        data: plan.crear.map((categoria, posicion) => ({
          claseId,
          nombre: categoria.nombre,
          peso: categoria.peso,
          creadoEn: new Date(base + posicion),
        })),
      })
    }
    return listarCategorias(claseId, tx)
  })
