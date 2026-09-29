import type { QueryClient } from "@tanstack/react-query"

// AUTH-03a (DEC-18/T-01, ronda 2): el token y la contraseña no pueden depender de cuándo React
// desmonte el formulario para salir de la caché de mutaciones. Una navegación de React Router puede
// tardar más (transición de baja prioridad) que la propia espera de quien vigila la caché, así que
// se saca la mutación en cuanto se asienta (éxito o error), sin esperar al desmontaje. gcTime 0
// queda como defensa adicional para cualquier otra ruta de limpieza (por ejemplo, si el observador
// ya no existe). AUTH-03b: sube de features/auth/hooks.ts a lib/ porque ahora lo usan dos módulos
// (auth y admin; regla 5 de CLAUDE.md).
export const sacarDeLaCacheAlAsentar = (
  queryClient: QueryClient,
  mutationKey: readonly unknown[],
): void => {
  const cache = queryClient.getMutationCache()
  for (const mutacion of cache.findAll({ mutationKey })) cache.remove(mutacion)
}
