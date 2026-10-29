import { obtenerDb } from "../src/adapters/db/cliente.js"

// Ayudas de las pruebas de CLASES-03b: dudas y respuestas sembradas directo en la base desechable,
// sin pasar por la API. Su limpieza no necesita un paso nuevo: las dudas mueren en cascada con su
// clase y sus respuestas con su duda (borrarMovimientosYClasesDePrueba antes que los usuarios, N-10).

export interface OpcionesDudaDePrueba {
  claseId: string
  autorId: string
  texto?: string
  creadoEn?: Date
  // Con quien la marcó, la duda queda resuelta en `resueltaEn` (o en este momento).
  resueltaPor?: string
  resueltaEn?: Date
}

export const crearDudaDePrueba = async ({
  claseId,
  autorId,
  texto = "Duda de prueba",
  creadoEn,
  resueltaPor,
  resueltaEn,
}: OpcionesDudaDePrueba): Promise<string> => {
  const { id } = await obtenerDb().duda.create({
    data: {
      claseId,
      autorId,
      texto,
      ...(creadoEn === undefined ? {} : { creadoEn }),
      ...(resueltaPor === undefined ? {} : { resueltaPor, resueltaEn: resueltaEn ?? new Date() }),
    },
    select: { id: true },
  })
  return id
}

export const crearRespuestaDePrueba = async ({
  dudaId,
  autorId,
  texto = "Respuesta de prueba",
  creadoEn,
}: {
  dudaId: string
  autorId: string
  texto?: string
  creadoEn?: Date
}): Promise<string> => {
  const { id } = await obtenerDb().comentario.create({
    data: { dudaId, autorId, texto, ...(creadoEn === undefined ? {} : { creadoEn }) },
    select: { id: true },
  })
  return id
}

export const leerDudaDb = (id: string) => obtenerDb().duda.findUnique({ where: { id } })

export const contarRespuestas = (dudaId: string): Promise<number> =>
  obtenerDb().comentario.count({ where: { dudaId } })

// Trabajos de pg-boss cuyos datos mencionan el id dado (una clase, una duda o una respuesta).
export const trabajosQueMencionan = async (valor: string): Promise<number> => {
  const [fila] = await obtenerDb().$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM pgboss.job WHERE position(${valor}::text in data::text) > 0`
  return fila?.n ?? 0
}
