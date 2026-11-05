import { descartarCopias, leerCopiasPendientes, terminarCopias } from "../adapters/db/index.js"
import { trabajar, trabajarFallidos } from "../adapters/queue/index.js"
import {
  errorAlmacenDeObjetosNoConfigurado,
  type AlmacenDeObjetos,
} from "../core/archivos/objetos.js"
import {
  COLA_BORRAR_OBJETOS,
  COLA_COPIAR_OBJETOS,
  COLA_COPIAR_OBJETOS_FALLIDO,
  datosBorrarObjetosSchema,
  datosCopiarObjetosSchema,
} from "../core/eventos/objetos.js"

// ADMIN-01b (§D-4, §D-5, §D-6). Consumidores de los objetos del almacén. Un error del almacén se deja
// propagar para que pg-boss reintente (3 veces, con espera exponencial) y después lo pase a la cola
// de fallidos; nunca se traga en silencio.

export interface DependenciasDeObjetos {
  // null: el worker no tiene STORAGE_* (fuera de production). Cada trabajo falla con un error
  // controlado y, tras los reintentos, queda en su cola de fallidos.
  almacenDeObjetos: AlmacenDeObjetos | null
  log: {
    info: (obj: unknown, mensaje?: string) => void
    warn: (obj: unknown, mensaje?: string) => void
    error: (obj: unknown, mensaje?: string) => void
  }
}

// Las tres funciones de adapters/db que usa la copia; las pruebas las envuelven para contar las
// sentencias (M-03: una lectura y, como máximo, dos escrituras por intento).
export interface RepositorioDeCopias {
  leerCopiasPendientes: typeof leerCopiasPendientes
  terminarCopias: typeof terminarCopias
  descartarCopias: typeof descartarCopias
}

const REPOSITORIO: RepositorioDeCopias = {
  leerCopiasPendientes: (ids) => leerCopiasPendientes(ids),
  terminarCopias: (ids) => terminarCopias(ids),
  descartarCopias: (ids) => descartarCopias(ids),
}

const almacenDe = (deps: DependenciasDeObjetos): AlmacenDeObjetos => {
  if (deps.almacenDeObjetos === null) throw errorAlmacenDeObjetosNoConfigurado()
  return deps.almacenDeObjetos
}

// COPIAR_OBJETOS (M-03). Una lectura; en el ciclo, solo el almacén; después, dos escrituras en lote.
// Si el almacén falla a mitad, lo ya hecho se escribe antes de relanzar (`finally`, sin atrapar el
// error), así el reintento solo copia lo que quedó pendiente.
export const procesarCopiaDeObjetos = async (
  { id, datos }: { id: string; datos: unknown },
  deps: DependenciasDeObjetos,
  repositorio: RepositorioDeCopias = REPOSITORIO,
): Promise<void> => {
  const analisis = datosCopiarObjetosSchema.safeParse(datos)
  if (!analisis.success) {
    deps.log.error({ evento: "copiar_objetos_invalido", trabajoId: id }, "Datos inválidos")
    return
  }
  const almacen = almacenDe(deps)

  const pendientes = await repositorio.leerCopiasPendientes(analisis.data.archivoIds)
  const copiados: string[] = []
  const sinOrigen: string[] = []
  try {
    for (const copia of pendientes) {
      if (copia.claveOriginal === null) {
        sinOrigen.push(copia.id)
        continue
      }
      const resultado = await almacen.copiar(copia.claveOriginal, copia.claveObjeto)
      if (resultado === "copiado") copiados.push(copia.id)
      else sinOrigen.push(copia.id)
    }
  } finally {
    if (copiados.length > 0) await repositorio.terminarCopias(copiados)
    if (sinOrigen.length > 0) await repositorio.descartarCopias(sinOrigen)
  }
  if (sinOrigen.length > 0) {
    deps.log.warn({
      evento: "copias_sin_origen",
      trabajoId: id,
      descartadas: sinOrigen.length,
    })
  }
}

// BORRAR_OBJETOS. Idempotente: borrar una clave que no existe no falla.
export const procesarBorradoDeObjetos = async (
  { id, datos }: { id: string; datos: unknown },
  deps: DependenciasDeObjetos,
): Promise<void> => {
  const analisis = datosBorrarObjetosSchema.safeParse(datos)
  if (!analisis.success) {
    deps.log.error({ evento: "borrar_objetos_invalido", trabajoId: id }, "Datos inválidos")
    return
  }
  await almacenDe(deps).borrar(analisis.data.claves)
}

// COPIAR_OBJETOS_FALLIDO (R-05, N-02): las copias de ese trabajo que siguen en curso pasan a
// descartado, para que la descarga no quede en 409 para siempre ni impidan borrar las dos clases.
// trabajoId es el id del trabajo original.
export const procesarCopiasFallidas = async (
  { id, idOriginal, datos }: { id: string; idOriginal: string | null; datos: unknown },
  deps: DependenciasDeObjetos,
  repositorio: Pick<RepositorioDeCopias, "descartarCopias"> = REPOSITORIO,
): Promise<void> => {
  const trabajoId = idOriginal ?? id
  const analisis = datosCopiarObjetosSchema.safeParse(datos)
  if (!analisis.success) {
    deps.log.warn({ evento: "copias_fallidas_datos_invalidos", trabajoId })
    return
  }
  const descartadas = await repositorio.descartarCopias(analisis.data.archivoIds)
  deps.log.warn({ evento: "copias_de_objetos_fallidas", trabajoId, descartadas })
}

export interface ColasDeObjetos {
  copiar: string
  borrar: string
  copiarFallidos: string
}

// Las colas son un parámetro, como en registrarConsumidores, para que las pruebas usen las suyas.
// La cola de fallidos del borrado no tiene consumidor: sus trabajos esperan con su retención.
export const registrarConsumidoresDeObjetos = async (
  deps: DependenciasDeObjetos,
  colas: ColasDeObjetos = {
    copiar: COLA_COPIAR_OBJETOS,
    borrar: COLA_BORRAR_OBJETOS,
    copiarFallidos: COLA_COPIAR_OBJETOS_FALLIDO,
  },
): Promise<void> => {
  await trabajar(colas.copiar, (trabajo) => procesarCopiaDeObjetos(trabajo, deps))
  await trabajar(colas.borrar, (trabajo) => procesarBorradoDeObjetos(trabajo, deps))
  await trabajarFallidos(colas.copiarFallidos, (trabajo) => procesarCopiasFallidas(trabajo, deps))
}
