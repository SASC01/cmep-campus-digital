import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    // Un PostgreSQL desechable por corrida (Testcontainers): lo levanta y lo destruye
    // test/global-setup.ts; test/setup.ts lo entrega a cada archivo (CHORE-01).
    globalSetup: ["./test/global-setup.ts"],
    setupFiles: ["./test/setup.ts"],
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    testTimeout: 15000,
    // beforeAll(construirApp) excedió los 10 s por omisión con el equipo cargado en la suite completa (CLASES-03a y el cierre de FORO-01a).
    hookTimeout: 30_000,
  },
})
