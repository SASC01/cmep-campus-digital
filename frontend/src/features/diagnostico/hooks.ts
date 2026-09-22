import { saludRespuestaSchema } from "@campus/shared"
import { useQuery } from "@tanstack/react-query"

import { api } from "@/services/apiClient"

// retry: false porque un 503 no debe reintentarse tres veces mientras el humano mira la pantalla.
export const useSalud = () =>
  useQuery({
    queryKey: ["salud"],
    queryFn: () => api("/api/salud", { schema: saludRespuestaSchema }),
    retry: false,
  })
