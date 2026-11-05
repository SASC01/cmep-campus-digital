import { AppError } from "../errores.js"

// ADMIN-01b (§D-6). Puerto de las operaciones sobre objetos del almacén que hace el worker: copiar del
// lado del almacén (el objeto nunca pasa por Node) y borrar en lote. Es aparte de `Almacen`
// (almacen.ts), que solo firma URL y lee metadatos, para no tocar sus dobles. Lo implementa
// adapters/storage; las pruebas usan un doble en memoria.
export type ResultadoDeCopia = "copiado" | "origen_inexistente"

export interface AlmacenDeObjetos {
  // Sobrescribe el destino si ya existe: repetir una copia no daña. Un error del almacén que no sea
  // la falta del origen se lanza.
  copiar(origen: string, destino: string): Promise<ResultadoDeCopia>
  // Borrar una clave que no existe no falla.
  borrar(claves: readonly string[]): Promise<void>
}

// §D-5: mientras la copia de un archivo duplicado no termina, su objeto todavía no existe.
export const errorArchivoEnCopia = (): AppError =>
  new AppError(
    "ARCHIVO_EN_COPIA",
    "Este archivo todavía se está copiando. Inténtalo en unos minutos.",
    409,
  )

// §D-4: el worker sin almacén configurado (fuera de production) falla con este error controlado y el
// trabajo termina en su cola de fallidos tras los reintentos.
export const errorAlmacenDeObjetosNoConfigurado = (): AppError =>
  new AppError(
    "ALMACEN_NO_CONFIGURADO",
    "El almacén de archivos no está configurado en este worker.",
    503,
  )
