import { pino } from "pino"

import { detenerCola, iniciarCola } from "../src/adapters/queue/index.js"
import { cargarEnv } from "../src/config/env.js"
import { opcionesDeCola } from "../src/config/cola.js"
import { validarUrlDePruebas } from "./entorno-de-pruebas.js"

// Proceso aparte que global-setup.ts lanza una vez (como seed:admin): instala el esquema pgboss y
// las dos colas en la base desechable antes de que los archivos de prueba corran en paralelo. La
// guarda corre ANTES de conectarse (N-06 punto 3): correrlo a mano con el backend/.env del
// desarrollador nunca instala pgboss en campus_dev.
const env = cargarEnv()
const motivo = validarUrlDePruebas(env.DATABASE_URL)
if (motivo !== null) {
  throw new Error(`Guarda de la base de pruebas: ${motivo}`)
}

const log = pino({ level: "silent" })
await iniciarCola({ ...opcionesDeCola(env, "worker"), log })
await detenerCola()
