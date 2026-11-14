import type { UseQueryResult } from "@tanstack/react-query"

// CHORE-06b (§D-4): lo que useRecargarAlPulsarLaSeccion lee de cada consulta de la vista. Las de
// useInfiniteQuery también cumplen.
export type ConsultaQueSeRecarga = Pick<
  UseQueryResult,
  "isError" | "isStale" | "isFetching" | "refetch"
>
