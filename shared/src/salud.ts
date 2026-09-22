import { z } from "zod"

export const saludRespuestaSchema = z.object({
  estado: z.literal("ok"),
  baseDeDatos: z.literal("ok"),
  marcaDeTiempo: z.iso.datetime(),
})

export type SaludRespuesta = z.infer<typeof saludRespuestaSchema>
