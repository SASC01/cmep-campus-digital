import { claseIdParamSchema } from "@campus/shared"
import type { FastifyRequest } from "fastify"

import { buscarDatosDePertenencia } from "../adapters/db/index.js"
import { evaluarClaseArchivada, type PoliticaDeClaseArchivada } from "../core/clases/archivada.js"
import {
  evaluarPertenencia,
  relacionConClase,
  type RelacionConClase,
} from "../core/clases/pertenencia.js"
import { AppError } from "../core/errores.js"
import { perfilDe } from "./tipos.js"

export interface ClaseDeLaRuta {
  id: string
  relacion: RelacionConClase
}

// Sexto paso de la cadena (§D-0.1): resuelve la clase de :claseId y la relación del perfil con
// ella, y la deja en request.clase para que el handler la lea con claseDe(request). ADMIN-01a
// (§D-1): después de la pertenencia decide la clase archivada con la política de la ruta; así una
// clase ajena o inexistente sigue respondiendo 403 antes de revelar que está archivada.
export const resolverClaseDeLaRuta = async (
  request: FastifyRequest,
  exigencia: "inscripcion" | "propiedad",
  admiteAdmin: boolean,
  enClaseArchivada?: PoliticaDeClaseArchivada,
): Promise<ClaseDeLaRuta> => {
  const claseId = (request.params as Record<string, unknown> | undefined)?.claseId
  if (claseId === undefined) {
    throw new AppError("CLASE_AUSENTE", "La ruta no tiene el parámetro :claseId.", 500)
  }

  const validado = claseIdParamSchema.safeParse({ claseId })
  if (!validado.success) {
    throw new AppError("VALIDACION", "claseId: debe ser un identificador válido", 400)
  }

  const perfil = perfilDe(request)
  const datos = await buscarDatosDePertenencia(validado.data.claseId, perfil.id)
  const relacion = relacionConClase(perfil, datos)
  const error = evaluarPertenencia(relacion, exigencia, admiteAdmin)
  if (error) throw error

  // evaluarPertenencia ya descartó null para ambas exigencias.
  const relacionConcedida = relacion as RelacionConClase
  // Con datos null la relación es null y evaluarPertenencia ya respondió 403.
  const archivada = datos !== null && datos.archivada
  const errorDeArchivada = evaluarClaseArchivada(relacionConcedida, archivada, enClaseArchivada)
  if (errorDeArchivada) throw errorDeArchivada

  return { id: validado.data.claseId, relacion: relacionConcedida }
}
