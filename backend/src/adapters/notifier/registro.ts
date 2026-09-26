import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { construirUrlRecuperar } from "../../core/auth/enlaces.js"
import type { CorreoDeCuenta, Notifier, ResultadoEnvio } from "../../core/correo/notifier.js"
import { plantillaCorreoDeCuenta } from "../../core/correo/plantillas.js"

export interface OpcionesCanalRegistro {
  directorio: string
  urlPublicaFrontend: string
  log: { info: (obj: unknown, mensaje?: string) => void }
  reloj?: () => Date
}

// Reemplaza los caracteres que el sistema de archivos de Windows no admite en un nombre.
const nombreDeArchivo = (fecha: Date, idempotencia: string): string =>
  `${fecha.toISOString().replace(/[:.]/g, "-")}-${idempotencia}.html`

// Canal para dev y pruebas (regla 12, DEC-13): escribe el HTML completo (con el enlace) en un
// archivo, para que el desarrollador lo abra. El log NO lleva el enlace, el token ni la dirección.
export const crearCanalRegistro = ({
  directorio,
  urlPublicaFrontend,
  log,
  reloj = () => new Date(),
}: OpcionesCanalRegistro): Notifier => ({
  correoDeCuenta: async (correo: CorreoDeCuenta): Promise<ResultadoEnvio> => {
    const { html } = plantillaCorreoDeCuenta({
      tipo: correo.tipo,
      nombre: correo.nombre,
      enlace: correo.enlace,
      urlRecuperar: construirUrlRecuperar(urlPublicaFrontend),
    })

    await mkdir(directorio, { recursive: true })
    const archivo = nombreDeArchivo(reloj(), correo.idempotencia)
    await writeFile(join(directorio, archivo), html, "utf8")
    log.info({ evento: "correo_registrado", tipo: correo.tipo, archivo })

    return { estado: "enviado", id: archivo }
  },
})
