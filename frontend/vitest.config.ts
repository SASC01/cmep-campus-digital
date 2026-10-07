import { defineConfig, mergeConfig } from "vitest/config"

import viteConfig from "./vite.config"

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      globals: false,
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      // Los casos que montan el router o listas de 101 clases rozan los 5 s en la suite completa (A-13 de TAREAS-01, cierra M-02 de DESIGN-01b).
      testTimeout: 15_000,
      // Solo tokens.css?raw pasa sin vaciarse, para su prueba (DESIGN-01a, M-01). El resto del CSS sigue vacío.
      css: { include: [/[\\/]src[\\/]styles[\\/]tokens\.css\?raw$/] },
    },
  }),
)
