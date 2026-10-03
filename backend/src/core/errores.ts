export interface OpcionesDeAppError {
  causa?: unknown
}

export class AppError extends Error {
  readonly codigo: string
  readonly estado: number

  // causa: el error original cuando el AppError traduce uno de un proveedor (CHORE-02). Viaja como
  // Error.cause para que el envoltorio de handlers/ pueda registrarlo sin exponerlo en la respuesta.
  constructor(codigo: string, mensaje: string, estado = 400, opciones: OpcionesDeAppError = {}) {
    super(mensaje, opciones.causa === undefined ? undefined : { cause: opciones.causa })
    this.name = "AppError"
    this.codigo = codigo
    this.estado = estado
  }
}

export const esAppError = (error: unknown): error is AppError => error instanceof AppError
