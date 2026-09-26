import js from "@eslint/js"
import { defineConfig } from "eslint/config"
import prettier from "eslint-config-prettier"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import globals from "globals"
import tseslint from "typescript-eslint"

// Regla 1 de AGENTS.md: solo backend/src/adapters/ importa librerias de infraestructura.
const libreriasDeInfraestructura = [
  "@prisma/client",
  "@prisma/adapter-pg",
  "pg",
  "pg-boss",
  "minio",
  "resend",
  "argon2",
  "jose",
  "livekit-server-sdk",
]

const soloEnAdapters = libreriasDeInfraestructura.map((name) => ({
  name,
  message: `"${name}" solo se importa dentro de backend/src/adapters/ (AGENTS.md, regla 1).`,
}))

// El cliente generado por Prisma vive en adapters/db/generated y solo adapters/db lo importa.
const clienteGenerado = {
  regex: "adapters/db/generated",
  message:
    "El cliente generado de Prisma solo se importa dentro de backend/src/adapters/db/ (AGENTS.md, regla 1).",
}

// Regla 9 de CLAUDE.md: un módulo de features/ no importa de otro módulo.
const otroModulo = (regex) => ({
  regex,
  message:
    "Un módulo de features/ no importa de otro módulo; lo compartido sube a components/, lib/ o services/ y entra por @/ (CLAUDE.md, regla 9).",
})

// N-01: executeSql solo se invoca dentro de backend/src/adapters/. handlers/ y workers/ reciben la
// capacidad en alGuardar(sql) y solo la pasan a encolar, nunca la invocan (AGENTS.md, reglas 1 y 4).
const sqlSoloEnAdapters =
  "executeSql solo se invoca dentro de backend/src/adapters/: handlers/ y workers/ reciben la capacidad en alGuardar(sql) y solo la pasan a encolar (AGENTS.md, reglas 1 y 4)."

// Los workspaces invocan este archivo con --config ../eslint.config.mjs (DEC-08). Con --config,
// ESLint resuelve files/ignores respecto al cwd, asi que se anclan a la raiz del repositorio.
const raiz = import.meta.dirname

export default defineConfig(
  {
    basePath: raiz,
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "backend/prisma/migrations/**",
      "backend/src/adapters/db/generated/**",
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    rules: { "no-console": "error" },
  },
  {
    basePath: raiz,
    files: ["backend/src/scripts/**", "backend/src/config/env.ts"],
    rules: { "no-console": "off" },
  },
  {
    basePath: raiz,
    files: ["**/*.{ts,mts,cts,js,mjs,cjs}"],
    ignores: ["backend/src/adapters/**"],
    rules: {
      "no-restricted-imports": ["error", { paths: soloEnAdapters, patterns: [clienteGenerado] }],
    },
  },
  {
    basePath: raiz,
    files: ["backend/src/core/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: soloEnAdapters,
          patterns: [
            {
              regex: "(/adapters|/handlers|/middleware|^fastify|^pino)",
              message:
                "core/ es logica pura: no importa adapters, handlers, middleware, fastify ni pino (AGENTS.md, regla 1).",
            },
          ],
        },
      ],
    },
  },
  {
    basePath: raiz,
    files: ["backend/src/handlers/**", "backend/src/middleware/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: soloEnAdapters,
          patterns: [
            clienteGenerado,
            {
              regex: "adapters/notifier",
              message:
                "Los handlers y el middleware no envían avisos ni correos: encolan el evento y el worker usa adapters/notifier (AGENTS.md, reglas 5 y 12).",
            },
          ],
        },
      ],
    },
  },
  {
    basePath: raiz,
    files: ["backend/src/**/*.{ts,mts,cts,js,mjs,cjs}"],
    ignores: ["backend/src/adapters/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: "MemberExpression[property.name='executeSql']", message: sqlSoloEnAdapters },
        { selector: "MemberExpression[property.value='executeSql']", message: sqlSoloEnAdapters },
      ],
    },
  },
  {
    basePath: raiz,
    files: ["frontend/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    basePath: raiz,
    files: ["frontend/src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: soloEnAdapters, patterns: [otroModulo("^@/features/")] },
      ],
    },
  },
  {
    basePath: raiz,
    files: ["frontend/src/features/*/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: soloEnAdapters, patterns: [otroModulo("^@/features/"), otroModulo("^\\.\\.")] },
      ],
    },
  },
  {
    basePath: raiz,
    files: ["frontend/src/features/*/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: soloEnAdapters,
          patterns: [otroModulo("^@/features/"), otroModulo("^\\.\\./\\.\\.")],
        },
      ],
    },
  },
  prettier,
)
