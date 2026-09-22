import { z } from "zod"

export const errorApiSchema = z.object({
  error: z.object({
    codigo: z.string().min(1),
    mensaje: z.string().min(1),
  }),
})

export type ErrorApi = z.infer<typeof errorApiSchema>
