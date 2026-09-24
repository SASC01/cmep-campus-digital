import { inject } from "vitest"

import { validarUrlDePruebas, variablesDeEntorno } from "./entorno-de-pruebas.js"

// Corre en cada proceso de prueba antes de cada archivo. Toma el entorno de test/global-setup.ts y lo
// escribe en process.env por encima de lo que venga de la terminal: config/env.ts y los procesos hijos
// (api-real, logs-r2, seed:admin) usan así la base desechable. backend/.env ya no se lee (CHORE-01).
const entorno = inject("entornoDePruebas")

if (!entorno) {
  throw new Error(
    "Falta la base de pruebas: corre las pruebas con npm test o npx vitest desde backend/, que la levantan con Testcontainers (test/global-setup.ts).",
  )
}

const problema = validarUrlDePruebas(entorno.databaseUrl)

if (problema !== null) {
  throw new Error(`Guarda de la base de pruebas: ${problema}. No se ejecutó ninguna prueba.`)
}

Object.assign(process.env, variablesDeEntorno(entorno))
