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
      // Solo tokens.css?raw pasa sin vaciarse, para su prueba (DESIGN-01a, M-01). El resto del CSS sigue vacío.
      css: { include: [/[\\/]src[\\/]styles[\\/]tokens\.css\?raw$/] },
    },
  }),
)
