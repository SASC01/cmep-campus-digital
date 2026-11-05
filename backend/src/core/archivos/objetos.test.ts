import { describe, expect, it } from "vitest"

import { AppError } from "../errores.js"
import { errorAlmacenDeObjetosNoConfigurado, errorArchivoEnCopia } from "./objetos.js"

describe("errores de los objetos del almacén (ADMIN-01b)", () => {
  it("ARCHIVO_EN_COPIA: 409 con el texto de §D-12", () => {
    const error = errorArchivoEnCopia()
    expect(error).toBeInstanceOf(AppError)
    expect(error.codigo).toBe("ARCHIVO_EN_COPIA")
    expect(error.estado).toBe(409)
    expect(error.message).toBe("Este archivo todavía se está copiando. Inténtalo en unos minutos.")
  })

  it("sin almacén en el worker: 503 ALMACEN_NO_CONFIGURADO", () => {
    const error = errorAlmacenDeObjetosNoConfigurado()
    expect(error.codigo).toBe("ALMACEN_NO_CONFIGURADO")
    expect(error.estado).toBe(503)
  })
})
