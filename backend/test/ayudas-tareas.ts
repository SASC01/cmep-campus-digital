import { randomUUID } from "node:crypto"

import { obtenerDb } from "../src/adapters/db/cliente.js"

// Ayudas de las pruebas de TAREAS-01 (01a): temas, categorías y filas de tarea sembrados directo en
// la base desechable, sin pasar por la API ni por la cola. Mismo patrón que ayudas-clases.ts. Su
// limpieza no necesita un paso nuevo: temas, categorías y tareas mueren en cascada con su clase
// (borrarMovimientosYClasesDePrueba antes que los usuarios, N-10).

export interface OpcionesTemaDePrueba {
  claseId: string
  nombre?: string
  orden?: number
}

export const crearTemaDePrueba = async ({
  claseId,
  nombre = `Tema ${randomUUID().slice(0, 8)}`,
  orden,
}: OpcionesTemaDePrueba): Promise<{ id: string; nombre: string; orden: number }> => {
  const db = obtenerDb()
  const siguiente = orden ?? (await db.tema.count({ where: { claseId } })) // sin huecos en las pruebas que no los piden
  const { id } = await db.tema.create({
    data: { claseId, nombre, orden: siguiente },
    select: { id: true },
  })
  return { id, nombre, orden: siguiente }
}

export interface OpcionesCategoriaDePrueba {
  claseId: string
  nombre?: string
  peso?: number
  creadoEn?: Date
}

export const crearCategoriaDePrueba = async ({
  claseId,
  nombre = `Categoría ${randomUUID().slice(0, 8)}`,
  peso = 100,
  creadoEn,
}: OpcionesCategoriaDePrueba): Promise<{ id: string; nombre: string; peso: number }> => {
  const { id } = await obtenerDb().categoria.create({
    data: { claseId, nombre, peso, ...(creadoEn === undefined ? {} : { creadoEn }) },
    select: { id: true },
  })
  return { id, nombre, peso }
}

export interface OpcionesMaterialConTema {
  claseId: string
  autorId: string
  temaId?: string | null
  titulo?: string
  texto?: string
  creadoEn?: Date
}

// Un material (o, con tipo "tarea", la publicación de una tarea sin su fila de `tareas`) con tema.
export const crearMaterialConTemaDePrueba = async ({
  claseId,
  autorId,
  temaId = null,
  titulo = "Material de prueba",
  texto = "Texto de prueba",
  creadoEn,
}: OpcionesMaterialConTema): Promise<string> => {
  const { id } = await obtenerDb().publicacion.create({
    data: {
      claseId,
      autorId,
      tipo: "material",
      titulo,
      texto,
      temaId,
      ...(creadoEn === undefined ? {} : { creadoEn }),
    },
    select: { id: true },
  })
  return id
}

export interface OpcionesTareaDePrueba {
  claseId: string
  autorId: string
  categoriaId?: string | null
  temaId?: string | null
  titulo?: string
  texto?: string
  fechaLimite?: Date
  puntos?: number
  aceptaTardias?: boolean
}

// La publicación de tipo `tarea` y su fila 1:1 en `tareas` (mismo id), juntas en una transacción:
// la única forma de sembrar una tarea hasta que 01b traiga la ruta.
export const crearTareaDePrueba = async ({
  claseId,
  autorId,
  categoriaId = null,
  temaId = null,
  titulo = "Tarea de prueba",
  texto = "",
  fechaLimite = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  puntos = 100,
  aceptaTardias = true,
}: OpcionesTareaDePrueba): Promise<string> => {
  const id = randomUUID()
  await obtenerDb().$transaction(async (tx) => {
    await tx.publicacion.create({
      data: { id, claseId, autorId, tipo: "tarea", titulo, texto, temaId },
      select: { id: true },
    })
    await tx.tarea.create({
      data: { id, claseId, categoriaId, fechaLimite, puntos, aceptaTardias },
      select: { id: true },
    })
  })
  return id
}

export const leerTemaDb = (id: string) => obtenerDb().tema.findUnique({ where: { id } })

export const listarTemasDb = (claseId: string) =>
  obtenerDb().tema.findMany({ where: { claseId }, orderBy: [{ orden: "asc" }, { id: "asc" }] })

export const listarCategoriasDb = (claseId: string) =>
  obtenerDb().categoria.findMany({
    where: { claseId },
    orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
  })

export const leerTareaDb = (id: string) => obtenerDb().tarea.findUnique({ where: { id } })

// Criterios de rúbrica sembrados directo en la base ("Criterio 1", "Criterio 2", … con 10 puntos
// máximos), para las pruebas que necesitan una tarea con rúbrica sin pasar por la API.
export const crearCriteriosDePrueba = async (tareaId: string, cantidad: number): Promise<void> => {
  await obtenerDb().criterioRubrica.createMany({
    data: Array.from({ length: cantidad }, (_, orden) => ({
      tareaId,
      criterio: `Criterio ${String(orden + 1)}`,
      puntosMax: 10,
      orden,
    })),
  })
}

// TAREAS-01b. Trabajos de las colas de tareas (pgboss.job), por el id de la tarea en sus datos: lo
// que pg-boss guardó, no lo que dice la cola. `state` es created, cancelled, completed…
export interface TrabajoDeTarea {
  id: string
  state: string
  start_after: Date
  datos: Record<string, unknown>
}

export const trabajosDeTarea = (cola: string, tareaId: string) =>
  obtenerDb().$queryRaw<TrabajoDeTarea[]>`
    SELECT id::text AS id, state::text AS state, start_after, data AS datos
    FROM pgboss.job
    WHERE name = ${cola} AND data ->> 'tareaId' = ${tareaId}::text
    ORDER BY created_on ASC, id ASC`

export const trabajosDeLaClase = (cola: string, claseId: string) =>
  obtenerDb().$queryRaw<TrabajoDeTarea[]>`
    SELECT id::text AS id, state::text AS state, start_after, data AS datos
    FROM pgboss.job
    WHERE name = ${cola} AND data ->> 'claseId' = ${claseId}::text
    ORDER BY created_on ASC, id ASC`

export const diasDespues = (dias: number): Date => new Date(Date.now() + dias * 86_400_000)

// Cuerpo válido de POST …/tareas; cada prueba cambia solo lo que ejerce.
export const cuerpoDeTarea = (cambios: Record<string, unknown> = {}): Record<string, unknown> => ({
  titulo: "Ensayo del tema 3",
  instrucciones: "Escribe dos páginas.",
  fechaLimite: diasDespues(5).toISOString(),
  puntos: 100,
  ...cambios,
})
