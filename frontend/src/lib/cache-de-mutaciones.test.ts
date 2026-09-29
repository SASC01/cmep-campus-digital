import { MutationCache, QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import { sacarDeLaCacheAlAsentar } from "./cache-de-mutaciones"

describe("sacarDeLaCacheAlAsentar", () => {
  it("quita solo las mutaciones con la mutationKey indicada", () => {
    const queryClient = new QueryClient({ mutationCache: new MutationCache() })
    const clave = ["login"] as const
    queryClient.setMutationDefaults(clave, { mutationFn: async () => "ok" })
    queryClient.getMutationCache().build(queryClient, { mutationKey: clave })
    queryClient.getMutationCache().build(queryClient, { mutationKey: ["otra"] })

    expect(queryClient.getMutationCache().findAll({ mutationKey: clave })).toHaveLength(1)

    sacarDeLaCacheAlAsentar(queryClient, clave)

    expect(queryClient.getMutationCache().findAll({ mutationKey: clave })).toHaveLength(0)
    expect(queryClient.getMutationCache().findAll({ mutationKey: ["otra"] })).toHaveLength(1)
  })

  it("sin mutaciones con esa clave, no lanza", () => {
    const queryClient = new QueryClient({ mutationCache: new MutationCache() })
    expect(() => sacarDeLaCacheAlAsentar(queryClient, ["inexistente"])).not.toThrow()
  })
})
