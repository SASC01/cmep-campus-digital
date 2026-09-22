export class AppError extends Error {
  readonly codigo: string
  readonly estado: number

  constructor(codigo: string, mensaje: string, estado = 400) {
    super(mensaje)
    this.name = "AppError"
    this.codigo = codigo
    this.estado = estado
  }
}

export const esAppError = (error: unknown): error is AppError => error instanceof AppError
