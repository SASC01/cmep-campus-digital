import { randomUUID } from "node:crypto"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Writable } from "node:stream"

import { pino } from "pino"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { derivarTokenDeCuenta, inicializarAuth } from "../src/adapters/auth/index.js"
import {
  cerrarConexion,
  ejecutorSqlDe,
  enTransaccion,
  inicializarDb,
  obtenerDb,
} from "../src/adapters/db/cliente.js"
import { crearCanalRegistro } from "../src/adapters/notifier/registro.js"
import { asegurarCola, detenerCola, encolar, iniciarCola } from "../src/adapters/queue/index.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { opcionesDeCola } from "../src/config/cola.js"
import { cargarEnv } from "../src/config/env.js"
import { opcionesDeLogger } from "../src/config/logger.js"
import type { Notifier } from "../src/core/correo/notifier.js"
import { procesarCorreoDeCuenta } from "../src/workers/correo-de-cuenta.js"
import { registrarConsumidores } from "../src/workers/index.js"
import { borrarUsuariosDePrueba, correoDePrueba, crearUsuarioDePrueba } from "./ayudas-auth.js"
import { crearTokenDePrueba } from "./ayudas-cuentas.js"
import { crearNotifierEnMemoria } from "./notifier-en-memoria.js"

// Ataques del Tester (AUTH-02a, ronda 1) contra el worker de CORREO_DE_CUENTA: trazabilidad de la
// cola de fallidos, datos basura y lo que el log serializado (pino real con opcionesDeLogger) deja
// ver de direcciones, nombres, enlaces y tokens.

const env = cargarEnv()
const ids: string[] = []
const urlPublicaFrontend = "http://127.0.0.1:5173"
const sufijo = randomUUID().slice(0, 8)
const COLA = `ATAQUE_R1_CORREO_${sufijo}`
const COLA_FALLIDOS = `ATAQUE_R1_CORREO_FALLIDO_${sufijo}`
let directorioTemporal = ""

// Log real del worker (mismas opciones que worker.ts), a un búfer en memoria.
const crearLogCapturado = () => {
  let salida = ""
  const destino = new Writable({
    write(trozo: Buffer, _codificacion, listo) {
      salida += trozo.toString("utf8")
      listo()
    },
  })
  const log = pino({ ...opcionesDeLogger(env), level: "trace" }, destino)
  return { log, leer: () => salida }
}

const logDelConsumidor = crearLogCapturado()

const notifierQueSiempreFalla: Notifier = {
  correoDeCuenta: async () => {
    throw new Error("fallo transitorio de ataque")
  },
}

const esperarHasta = async (condicion: () => boolean | Promise<boolean>, limiteMs = 25_000) => {
  const limite = Date.now() + limiteMs
  while (Date.now() < limite) {
    if (await condicion()) return true
    await new Promise((resolver) => setTimeout(resolver, 200))
  }
  return false
}

beforeAll(async () => {
  inicializarDb({ connectionString: env.DATABASE_URL })
  await inicializarAuth(opcionesDeAuth(env))
  await iniciarCola({ ...opcionesDeCola(env, "worker"), log: pino({ level: "silent" }) })
  await asegurarCola(COLA_FALLIDOS, { retentionSeconds: 3600, deleteAfterSeconds: 3600 })
  await asegurarCola(COLA, {
    retryLimit: 0,
    expireInSeconds: 30,
    deadLetter: COLA_FALLIDOS,
    retentionSeconds: 3600,
    deleteAfterSeconds: 3600,
  })
  await registrarConsumidores(
    {
      notifier: notifierQueSiempreFalla,
      urlPublicaFrontend,
      reloj: () => new Date(),
      log: logDelConsumidor.log,
    },
    { correoDeCuenta: COLA, fallidos: COLA_FALLIDOS },
  )
  directorioTemporal = await mkdtemp(join(tmpdir(), "ataque-r1-correos-"))
}, 30_000)

afterAll(async () => {
  await borrarUsuariosDePrueba(ids)
  await detenerCola()
  await cerrarConexion()
  if (directorioTemporal) await rm(directorioTemporal, { recursive: true, force: true })
})

describe("ataque: cola de fallidos", () => {
  it("el log correo_de_cuenta_fallido identifica el trabajo original (su id es el del token), no la copia de la cola de fallidos", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const idOriginal = randomUUID()
    await enTransaccion(obtenerDb(), async (tx) => {
      await encolar(
        COLA,
        { tipo: "recuperacion", correo: usuario.email },
        { id: idOriginal, sql: ejecutorSqlDe(tx) },
      )
    })

    const lineasFallidas = () =>
      logDelConsumidor
        .leer()
        .split("\n")
        .filter((linea) => linea.includes('"correo_de_cuenta_fallido"'))
    const llego = await esperarHasta(() => lineasFallidas().length > 0)
    expect(llego, "el consumidor de fallidos debe registrar correo_de_cuenta_fallido").toBe(true)

    // El token de recuperación que creó el intento lleva el id del trabajo original (DEC-06): con
    // ese id el operador cruza el fallo con tokens_cuenta y con los demás logs del trabajo.
    const token = await obtenerDb().tokenCuenta.findUnique({
      where: { id: idOriginal },
      select: { id: true },
    })
    expect(token?.id).toBe(idOriginal)
    const registrados = lineasFallidas().map(
      (linea) => (JSON.parse(linea) as { trabajoId?: string }).trabajoId,
    )
    expect(registrados).toContain(idOriginal)
  }, 40_000)
})

describe("ataque: datos basura en el trabajo", () => {
  it.each([
    ["null", null],
    ["cadena", "recuperacion"],
    ["arreglo", [{ tipo: "recuperacion" }]],
    ["tipo desconocido", { tipo: "admin", correo: "x@pruebas.local" }],
    ["correo numérico", { tipo: "recuperacion", correo: 12345 }],
    ["correo de 10 KB", { tipo: "recuperacion", correo: `${"a".repeat(10_000)}@pruebas.local` }],
    ["prototipo", JSON.parse('{"tipo":"recuperacion","__proto__":{"correo":"x@pruebas.local"}}')],
  ])("datos %s → omitido, sin lanzar y sin enviar", async (_nombre, datos) => {
    const notifier = crearNotifierEnMemoria()
    const { log, leer } = crearLogCapturado()
    const resultado = await procesarCorreoDeCuenta(
      { id: randomUUID(), datos },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log },
    )
    expect(resultado).toBe("omitido")
    expect(notifier.enviados).toHaveLength(0)
    expect(leer()).not.toContain("aaaaaaaaaa")
    expect(leer()).not.toContain("x@pruebas.local")
  })

  it("un trabajo de recuperación cuyo id es el de una invitación viva no envía nada", async () => {
    const maestro = await crearUsuarioDePrueba(ids, { rol: "maestro" })
    const invitacion = await crearTokenDePrueba({
      usuarioId: maestro.id,
      tipo: "invitacion",
      expiraEn: new Date(Date.now() + 3_600_000),
    })
    const notifier = crearNotifierEnMemoria()
    const { log } = crearLogCapturado()
    const resultado = await procesarCorreoDeCuenta(
      { id: invitacion.id, datos: { tipo: "recuperacion", correo: maestro.email } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log },
    )
    expect(resultado).toBe("omitido")
    expect(notifier.enviados).toHaveLength(0)
  })
})

describe("ataque: lo que el log serializado del worker deja ver", () => {
  it("enviado (canal registro real), rechazado y omitido: el log no lleva direcciones, nombres, enlaces ni tokens", async () => {
    const nombre = "Nombre Muy Reconocible"
    const alumno = await crearUsuarioDePrueba(ids, { nombre })
    const rechazado = await crearUsuarioDePrueba(ids, { nombre })
    const inactivo = await crearUsuarioDePrueba(ids, { nombre, activo: false })
    const maestro = await crearUsuarioDePrueba(ids, { rol: "maestro", nombre })
    const invitacion = await crearTokenDePrueba({
      usuarioId: maestro.id,
      tipo: "invitacion",
      expiraEn: new Date(Date.now() + 3_600_000),
    })
    const inexistente = correoDePrueba("no-existe-log")
    const { log, leer } = crearLogCapturado()
    const canal = crearCanalRegistro({ directorio: directorioTemporal, urlPublicaFrontend, log })
    const conRechazo = crearNotifierEnMemoria()
    conRechazo.rechazarProximo("422 validation_error")
    const deps = (notifier: Notifier) => ({
      notifier,
      urlPublicaFrontend,
      reloj: () => new Date(),
      log,
    })

    const idAlumno = randomUUID()
    const idRechazado = randomUUID()
    const resultados = [
      await procesarCorreoDeCuenta(
        { id: idAlumno, datos: { tipo: "recuperacion", correo: alumno.email } },
        deps(canal),
      ),
      await procesarCorreoDeCuenta(
        { id: idRechazado, datos: { tipo: "recuperacion", correo: rechazado.email } },
        deps(conRechazo),
      ),
      await procesarCorreoDeCuenta(
        { id: randomUUID(), datos: { tipo: "recuperacion", correo: inactivo.email } },
        deps(canal),
      ),
      await procesarCorreoDeCuenta(
        { id: randomUUID(), datos: { tipo: "recuperacion", correo: inexistente } },
        deps(canal),
      ),
      await procesarCorreoDeCuenta(
        { id: invitacion.id, datos: { tipo: "invitacion" } },
        deps(canal),
      ),
    ]
    expect(resultados).toEqual(["enviado", "rechazado", "omitido", "omitido", "enviado"])

    const salida = leer()
    expect(salida.length).toBeGreaterThan(0)
    const prohibidos: [string, string][] = [
      ["correo del alumno", alumno.email],
      ["correo rechazado", rechazado.email],
      ["correo inactivo", inactivo.email],
      ["correo del maestro", maestro.email],
      ["correo inexistente", inexistente],
      ["nombre", nombre],
      ["fragmento #token=", "#token="],
      ["token del alumno", derivarTokenDeCuenta(idAlumno).token],
      ["token rechazado", derivarTokenDeCuenta(idRechazado).token],
      ["token de invitación", invitacion.token],
      ["ruta /restablecer", "/restablecer"],
      ["ruta /establecer-contrasena", "/establecer-contrasena"],
    ]
    for (const [etiqueta, secreto] of prohibidos) {
      expect(salida.includes(secreto), `el log contiene: ${etiqueta}`).toBe(false)
    }
  })
})
