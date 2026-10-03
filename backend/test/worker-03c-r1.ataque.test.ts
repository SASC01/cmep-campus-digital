import { randomUUID } from "node:crypto"
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { pino } from "pino"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { inicializarAuth } from "../src/adapters/auth/index.js"
import {
  cerrarConexion,
  ejecutorSqlDe,
  enTransaccion,
  inicializarDb,
  obtenerDb,
} from "../src/adapters/db/cliente.js"
import { crearCanalRegistro } from "../src/adapters/notifier/registro.js"
import {
  asegurarCola,
  buscarTrabajo,
  detenerCola,
  encolarVarios,
  iniciarCola,
} from "../src/adapters/queue/index.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { opcionesDeCola } from "../src/config/cola.js"
import { cargarEnv } from "../src/config/env.js"
import type { Notifier } from "../src/core/correo/notifier.js"
import { INTERVALO_MINIMO_ENTRE_CORREOS_MS } from "../src/core/correo/ritmo.js"
import { registrarConsumidores } from "../src/workers/index.js"
import { borrarUsuariosDePrueba, crearUsuarioDePrueba } from "./ayudas-auth.js"
import { crearTokenDePrueba } from "./ayudas-cuentas.js"

// Ataque del Tester (AUTH-03c, ronda 1; plan, "Puntos de ataque" AUTH-03c, punto 2): un lote de 5
// invitaciones encolado con encolarVarios dentro de una transacción, como lo hace
// POST /admin/maestros/lote, pasa por el consumidor real (registrarConsumidores, sondeo real de
// pg-boss, reloj y espera reales) con el canal `registro` de dev y pruebas. Deben quedar
// exactamente 5 HTML, uno por token, y ninguno de más, con al menos 250 ms entre un intento y el
// siguiente. Cola propia para no competir con otros archivos.

const env = cargarEnv()
const ids: string[] = []
const sufijo = randomUUID().slice(0, 8)
const COLA = `ATAQUE_03C_LOTE_${sufijo}`
const COLA_FALLIDOS = `ATAQUE_03C_LOTE_FALLIDO_${sufijo}`
const urlPublicaFrontend = "http://127.0.0.1:5173"
let directorio = ""
const intentos: { inicio: number; fin: number; idempotencia: string }[] = []

// Solo tipos (CHORE-02, ronda 0, C-4): asegurarCola tipa sus opciones como QueueOptions de pg-boss,
// que no incluye deadLetter aunque createQueue sí lo recibe. La política de la cola no cambia.
type PoliticaConFallidos = NonNullable<Parameters<typeof asegurarCola>[1]> & { deadLetter: string }

beforeAll(async () => {
  inicializarDb({ connectionString: env.DATABASE_URL })
  await inicializarAuth(opcionesDeAuth(env))
  await iniciarCola({ ...opcionesDeCola(env, "worker"), log: pino({ level: "silent" }) })
  await asegurarCola(COLA_FALLIDOS, { retentionSeconds: 3600, deleteAfterSeconds: 3600 })
  const politica: PoliticaConFallidos = {
    retryLimit: 0,
    expireInSeconds: 30,
    deadLetter: COLA_FALLIDOS,
    retentionSeconds: 3600,
    deleteAfterSeconds: 3600,
  }
  await asegurarCola(COLA, politica)
  directorio = await mkdtemp(join(tmpdir(), "ataque-03c-correos-"))
  const log = pino({ level: "silent" })
  const canal = crearCanalRegistro({ directorio, urlPublicaFrontend, log })
  const canalQueMide: Notifier = {
    correoDeCuenta: async (correo) => {
      const intento = { inicio: Date.now(), fin: 0, idempotencia: correo.idempotencia }
      intentos.push(intento)
      try {
        return await canal.correoDeCuenta(correo)
      } finally {
        intento.fin = Date.now()
      }
    },
  }
  await registrarConsumidores(
    { notifier: canalQueMide, urlPublicaFrontend, reloj: () => new Date(), log },
    { correoDeCuenta: COLA, fallidos: COLA_FALLIDOS },
  )
}, 30_000)

afterAll(async () => {
  await borrarUsuariosDePrueba(ids)
  await detenerCola()
  await cerrarConexion()
  if (directorio) await rm(directorio, { recursive: true, force: true })
})

describe("ataque (AUTH-03c r1): un lote de 5 por el worker real con el canal registro", () => {
  it("5 invitaciones encoladas en una sola transacción → exactamente 5 HTML, uno por token, con al menos 250 ms entre intentos, y ninguno de más", async () => {
    const tokens: { id: string; token: string; nombre: string }[] = []
    for (let n = 0; n < 5; n += 1) {
      const maestro = await crearUsuarioDePrueba(ids, { rol: "maestro", nombre: `Maestro ${n}` })
      const token = await crearTokenDePrueba({
        usuarioId: maestro.id,
        tipo: "invitacion",
        expiraEn: new Date(Date.now() + 72 * 3_600_000),
      })
      tokens.push({ ...token, nombre: `Maestro ${n}` })
    }
    await enTransaccion(obtenerDb(), async (tx) => {
      await encolarVarios(
        COLA,
        tokens.map(({ id }) => ({ id, datos: { tipo: "invitacion" } })),
        { sql: ejecutorSqlDe(tx) },
      )
    })

    const limite = Date.now() + 45_000
    let completados = 0
    while (Date.now() < limite) {
      const estados = await Promise.all(tokens.map(({ id }) => buscarTrabajo(COLA, id)))
      completados = estados.filter((e) => e?.estado === "completed").length
      if (completados === 5) break
      await new Promise((resolver) => setTimeout(resolver, 200))
    }
    expect(completados, "los 5 trabajos debían completarse en 45 s").toBe(5)

    // Ninguno de más: se espera un sondeo completo más antes de contar.
    await new Promise((resolver) => setTimeout(resolver, 2_500))
    const archivos = (await readdir(directorio)).filter((a) => a.endsWith(".html"))
    expect(archivos).toHaveLength(5)
    for (const { id, token, nombre } of tokens) {
      const suyos = archivos.filter((archivo) => archivo.includes(id))
      expect(suyos, `archivos del token ${id}`).toHaveLength(1)
      const html = await readFile(join(directorio, suyos[0] ?? ""), "utf8")
      expect(html).toContain(token)
      expect(html).toContain(`Hola, ${nombre}.`)
    }

    expect(intentos.map((i) => i.idempotencia).sort()).toEqual(tokens.map((t) => t.id).sort())
    const huecos = intentos.slice(1).map((intento, i) => intento.inicio - (intentos[i]?.fin ?? 0))
    for (const hueco of huecos) {
      expect(hueco, JSON.stringify(huecos)).toBeGreaterThanOrEqual(
        INTERVALO_MINIMO_ENTRE_CORREOS_MS - 2,
      )
    }
    // Deja a la vista los huecos reales entre intentos (sondeo de pg-boss frente al ritmo).
    process.stdout.write(
      `ataque-03c huecos reales entre intentos (ms): ${JSON.stringify(huecos)}\n`,
    )
  }, 70_000)
})
