import { randomUUID } from "node:crypto"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { derivarTokenDeCuenta, inicializarAuth } from "../src/adapters/auth/index.js"
import {
  cerrarConexion,
  ejecutorSqlDe,
  enTransaccion,
  inicializarDb,
  obtenerDb,
} from "../src/adapters/db/cliente.js"
import {
  asegurarCola,
  buscarTrabajo,
  detenerCola,
  encolar,
  iniciarCola,
} from "../src/adapters/queue/index.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { opcionesDeCola } from "../src/config/cola.js"
import { cargarEnv } from "../src/config/env.js"
import { INTERVALO_MINIMO_ENTRE_CORREOS_MS } from "../src/core/correo/ritmo.js"
import { procesarCorreoDeCuenta } from "../src/workers/correo-de-cuenta.js"
import { registrarConsumidores } from "../src/workers/index.js"
import {
  borrarUsuariosDePrueba,
  correoDePrueba,
  crearUsuarioDePrueba,
  desactivarUsuarioDePrueba,
} from "./ayudas-auth.js"
import { crearTokenDePrueba, leerTokens, tokenDelEnlace } from "./ayudas-cuentas.js"
import { crearNotifierEnMemoria } from "./notifier-en-memoria.js"

// Solo tipos (CHORE-02): asegurarCola tipa sus opciones como QueueOptions de pg-boss, que no incluye
// deadLetter aunque createQueue sí lo recibe. La política de la cola no cambia.
type PoliticaConFallidos = NonNullable<Parameters<typeof asegurarCola>[1]> & { deadLetter: string }

const ids: string[] = []
const urlPublicaFrontend = "http://127.0.0.1:5173"
const logSilencioso = { info: () => undefined, warn: () => undefined, error: () => undefined }

beforeAll(async () => {
  const env = cargarEnv()
  inicializarDb({ connectionString: env.DATABASE_URL })
  await inicializarAuth(opcionesDeAuth(env))
})

afterAll(async () => {
  await borrarUsuariosDePrueba(ids)
  await cerrarConexion()
})

describe("procesarCorreoDeCuenta (recuperación)", () => {
  it("cuenta existente: un correo con /restablecer#token=, y ese token vale en restablecer", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const trabajoId = randomUUID()
    const notifier = crearNotifierEnMemoria()

    const resultado = await procesarCorreoDeCuenta(
      { id: trabajoId, datos: { tipo: "recuperacion", correo: usuario.email } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
    )

    expect(resultado).toBe("enviado")
    expect(notifier.enviados[0]?.enlace).toContain("/restablecer#token=")
    const token = tokenDelEnlace(notifier.enviados[0]?.enlace ?? "")
    expect(token).not.toBeNull()
    expect(token).toBe(derivarTokenDeCuenta(trabajoId).token)
  })

  it("correo inexistente → 0 correos y 0 tokens", async () => {
    const notifier = crearNotifierEnMemoria()
    const resultado = await procesarCorreoDeCuenta(
      { id: randomUUID(), datos: { tipo: "recuperacion", correo: correoDePrueba("no-existe") } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
    )
    expect(resultado).toBe("omitido")
    expect(notifier.enviados).toHaveLength(0)
  })

  it("cuenta admin → 0 (no se envía)", async () => {
    const email = process.env.ADMIN_EMAIL
    if (!email) throw new Error("Falta ADMIN_EMAIL")
    const notifier = crearNotifierEnMemoria()
    const resultado = await procesarCorreoDeCuenta(
      { id: randomUUID(), datos: { tipo: "recuperacion", correo: email } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
    )
    expect(resultado).toBe("omitido")
    expect(notifier.enviados).toHaveLength(0)
  })

  it("cuenta inactiva → 0", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    await desactivarUsuarioDePrueba(usuario.id)
    const notifier = crearNotifierEnMemoria()
    const resultado = await procesarCorreoDeCuenta(
      { id: randomUUID(), datos: { tipo: "recuperacion", correo: usuario.email } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
    )
    expect(resultado).toBe("omitido")
  })

  it("una cuarta solicitud en una hora → 0 (tope durable por cuenta)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const notifier = crearNotifierEnMemoria()
    for (let n = 0; n < 3; n += 1) {
      await procesarCorreoDeCuenta(
        { id: randomUUID(), datos: { tipo: "recuperacion", correo: usuario.email } },
        { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
      )
    }
    const cuarta = await procesarCorreoDeCuenta(
      { id: randomUUID(), datos: { tipo: "recuperacion", correo: usuario.email } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
    )
    expect(cuarta).toBe("omitido")
    expect(notifier.enviados).toHaveLength(3)
  })

  it("un reintento del mismo trabajo produce el mismo enlace y no crea un token nuevo", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const trabajoId = randomUUID()
    const notifier = crearNotifierEnMemoria()
    await procesarCorreoDeCuenta(
      { id: trabajoId, datos: { tipo: "recuperacion", correo: usuario.email } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
    )
    await procesarCorreoDeCuenta(
      { id: trabajoId, datos: { tipo: "recuperacion", correo: usuario.email } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
    )
    expect(notifier.enviados).toHaveLength(2)
    expect(notifier.enviados[0]?.enlace).toBe(notifier.enviados[1]?.enlace)
    const filas = await leerTokens(usuario.id)
    expect(filas).toHaveLength(1)
  })

  it("un trabajo viejo tras uno nuevo no envía (el viejo quedó revocado)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const notifier = crearNotifierEnMemoria()
    const trabajoViejo = randomUUID()
    await procesarCorreoDeCuenta(
      { id: trabajoViejo, datos: { tipo: "recuperacion", correo: usuario.email } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
    )
    await procesarCorreoDeCuenta(
      { id: randomUUID(), datos: { tipo: "recuperacion", correo: usuario.email } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
    )
    notifier.enviados.length = 0
    const resultado = await procesarCorreoDeCuenta(
      { id: trabajoViejo, datos: { tipo: "recuperacion", correo: usuario.email } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
    )
    expect(resultado).toBe("omitido")
    expect(notifier.enviados).toHaveLength(0)
  })
})

describe("procesarCorreoDeCuenta (invitación)", () => {
  it("invitación válida: un correo con /establecer-contrasena#token=", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { id: tokenId, token: tokenEsperado } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "invitacion",
      expiraEn: new Date(Date.now() + 60_000),
    })
    const notifier = crearNotifierEnMemoria()
    const resultado = await procesarCorreoDeCuenta(
      { id: tokenId, datos: { tipo: "invitacion" } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
    )
    expect(resultado).toBe("enviado")
    expect(notifier.enviados[0]?.enlace).toContain("/establecer-contrasena#token=")
    expect(tokenDelEnlace(notifier.enviados[0]?.enlace ?? "")).toBe(tokenEsperado)
  })

  it("invitación ya usada → no envía", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { id: tokenId } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "invitacion",
      expiraEn: new Date(Date.now() + 60_000),
      usadoEn: new Date(),
    })
    const notifier = crearNotifierEnMemoria()
    const resultado = await procesarCorreoDeCuenta(
      { id: tokenId, datos: { tipo: "invitacion" } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
    )
    expect(resultado).toBe("omitido")
  })
})

describe("procesarCorreoDeCuenta (fallos del notifier)", () => {
  it("un fallo transitorio del notifier se propaga (lanza)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const notifier = crearNotifierEnMemoria()
    notifier.fallarProximo(new Error("fallo transitorio simulado"))
    await expect(
      procesarCorreoDeCuenta(
        { id: randomUUID(), datos: { tipo: "recuperacion", correo: usuario.email } },
        { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
      ),
    ).rejects.toThrow("fallo transitorio simulado")
  })

  it("un rechazo permanente no lanza y devuelve 'rechazado'", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const notifier = crearNotifierEnMemoria()
    notifier.rechazarProximo("422 invalid_parameter")
    const resultado = await procesarCorreoDeCuenta(
      { id: randomUUID(), datos: { tipo: "recuperacion", correo: usuario.email } },
      { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
    )
    expect(resultado).toBe("rechazado")
  })

  it("dos prepararTokenDeRecuperacion concurrentes con el mismo id no fallan y dejan una sola fila viva (N-04)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const trabajoId = randomUUID()
    const notifierA = crearNotifierEnMemoria()
    const notifierB = crearNotifierEnMemoria()

    await Promise.all([
      procesarCorreoDeCuenta(
        { id: trabajoId, datos: { tipo: "recuperacion", correo: usuario.email } },
        { notifier: notifierA, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
      ),
      procesarCorreoDeCuenta(
        { id: trabajoId, datos: { tipo: "recuperacion", correo: usuario.email } },
        { notifier: notifierB, urlPublicaFrontend, reloj: () => new Date(), log: logSilencioso },
      ),
    ])

    const filas = await leerTokens(usuario.id)
    expect(filas).toHaveLength(1)
    expect(filas[0]?.revocadoEn).toBeNull()
  })
})

// AUTH-03c, §D-C5 (M-06 y M-09): ritmo mínimo entre dos intentos de envío que llegan al notifier,
// incluidos los que lanzan. A diferencia de los describe de arriba (que llaman a
// procesarCorreoDeCuenta directamente, sin cola ni ritmo), este bloque pasa por
// registrarConsumidores con una cola propia, ajena a la de producción, para no competir por los
// trabajos de otros archivos. Setup y cierre propios de este describe.
describe("ritmo del worker (M-06 y M-09)", () => {
  // El sondeo real de pg-boss (2 s por defecto entre lotes de batchSize: 1, muy por encima de los
  // 250 ms del ritmo) haría que cualquier segundo trabajo real siempre encontrara el intervalo ya
  // cumplido, sin importar el ritmo. Por eso el reloj es falso: avanza un tique fijo (1 ms) por
  // llamada, nunca el tiempo real transcurrido entre lotes de sondeo, así que el hueco entre el fin
  // de un intento y el siguiente lo decide únicamente el número de llamadas al reloj entre ambos
  // (unas pocas, del propio código), no cuánto tarda pg-boss en volver a preguntar. El valor sigue
  // siendo una fecha real (arranca en Date.now()), así que las comparaciones de vigencia del token
  // de recuperación (30 min) no se ven afectadas por una deriva de unos pocos milisegundos.
  let relojMs = Date.now()
  const relojFalso = (): Date => new Date(relojMs++)

  const COLA = "PRUEBA_WORKER_RITMO"
  const COLA_FALLIDOS = "PRUEBA_WORKER_RITMO_FALLIDO"
  const notifierDeRitmo = crearNotifierEnMemoria()
  const esperas: number[] = []
  const esperarFalso = async (ms: number): Promise<void> => {
    esperas.push(ms)
  }

  const esperarHasta = async (
    condicion: () => Promise<boolean>,
    limiteMs = 20_000,
  ): Promise<void> => {
    const limite = Date.now() + limiteMs
    while (Date.now() < limite) {
      if (await condicion()) return
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    throw new Error("esperarHasta agotó el tiempo límite")
  }

  const encolarEnColaDePrueba = async (datos: object): Promise<string> => {
    const id = randomUUID()
    await enTransaccion(obtenerDb(), async (tx) => {
      await encolar(COLA, datos, { id, sql: ejecutorSqlDe(tx) })
    })
    return id
  }

  const estaEnFallidosPorOrigen = async (idOriginal: string): Promise<boolean> => {
    const filas = await obtenerDb().$queryRaw<{ id: string }[]>`
      SELECT id FROM pgboss.job WHERE name = ${COLA_FALLIDOS} AND source_id = ${idOriginal}::uuid
    `
    return filas.length > 0
  }

  beforeAll(async () => {
    const env = cargarEnv()
    await iniciarCola({ ...opcionesDeCola(env, "worker"), log: logSilencioso })
    await asegurarCola(COLA_FALLIDOS, { retentionSeconds: 3600, deleteAfterSeconds: 3600 })
    const politica: PoliticaConFallidos = {
      retryLimit: 0,
      expireInSeconds: 30,
      deadLetter: COLA_FALLIDOS,
      retentionSeconds: 3600,
      deleteAfterSeconds: 3600,
    }
    await asegurarCola(COLA, politica)
    await registrarConsumidores(
      {
        notifier: notifierDeRitmo,
        urlPublicaFrontend,
        reloj: relojFalso,
        log: logSilencioso,
        esperar: esperarFalso,
      },
      { correoDeCuenta: COLA, fallidos: COLA_FALLIDOS },
    )
  }, 30_000)

  afterAll(async () => {
    await detenerCola()
  })

  it("el primer trabajo no espera; el segundo, tras uno enviado, espera antes de procesarse", async () => {
    const usuarioA = await crearUsuarioDePrueba(ids)
    const idA = await encolarEnColaDePrueba({ tipo: "recuperacion", correo: usuarioA.email })
    await esperarHasta(async () => (await buscarTrabajo(COLA, idA))?.estado === "completed")
    expect(esperas[0]).toBe(0)

    const usuarioB = await crearUsuarioDePrueba(ids)
    const idB = await encolarEnColaDePrueba({ tipo: "recuperacion", correo: usuarioB.email })
    await esperarHasta(async () => (await buscarTrabajo(COLA, idB))?.estado === "completed")
    expect(esperas[1]).toBeGreaterThan(0)
    expect(esperas[1]).toBeLessThanOrEqual(INTERVALO_MINIMO_ENTRE_CORREOS_MS)
  }, 30_000)

  it("un intento que lanza también cuenta para el ritmo (M-09) y el error se propaga (a la cola de fallidos)", async () => {
    const usuarioC = await crearUsuarioDePrueba(ids)
    notifierDeRitmo.fallarProximo(new Error("fallo transitorio de prueba"))
    const idC = await encolarEnColaDePrueba({ tipo: "recuperacion", correo: usuarioC.email })
    await esperarHasta(() => estaEnFallidosPorOrigen(idC))
    const esperaTrasElFallo = esperas.at(-1)
    expect(esperaTrasElFallo).toBeGreaterThan(0)

    // El siguiente trabajo también espera: el intento que lanzó sí actualizó el último intento.
    const usuarioD = await crearUsuarioDePrueba(ids)
    const idD = await encolarEnColaDePrueba({ tipo: "recuperacion", correo: usuarioD.email })
    await esperarHasta(async () => (await buscarTrabajo(COLA, idD))?.estado === "completed")
    expect(esperas.at(-1)).toBeGreaterThan(0)
  }, 30_000)

  it("un trabajo omitido siempre pasa por la espera de su turno, pero nunca llama al notifier ni cambia el ritmo del siguiente", async () => {
    // datosCorreoDeCuentaSchema rechaza este tipo: procesarCorreoDeCuenta omite antes de llamar al
    // notifier (M-09: un omitido nunca actualiza el último intento).
    const enviadosAntes = notifierDeRitmo.enviados.length
    const cantidadDeEsperasAntes = esperas.length
    const idOmitido = await encolarEnColaDePrueba({ tipo: "tipo-que-no-existe" })
    await esperarHasta(async () => (await buscarTrabajo(COLA, idOmitido))?.estado === "completed")
    // La espera de su turno sí ocurrió (todo trabajo pasa por ella antes de procesarse)...
    expect(esperas.length).toBe(cantidadDeEsperasAntes + 1)
    // ...pero nunca llegó al notifier.
    expect(notifierDeRitmo.enviados.length).toBe(enviadosAntes)

    // El siguiente trabajo real sigue esperando con normalidad: el omitido no rompió el ritmo.
    const usuario = await crearUsuarioDePrueba(ids)
    const id = await encolarEnColaDePrueba({ tipo: "recuperacion", correo: usuario.email })
    await esperarHasta(async () => (await buscarTrabajo(COLA, id))?.estado === "completed")
    expect(esperas.at(-1)).toBeGreaterThan(0)
    expect(esperas.at(-1)).toBeLessThanOrEqual(INTERVALO_MINIMO_ENTRE_CORREOS_MS)
  }, 30_000)

  it("ninguna espera ocurre después del último envío", async () => {
    const cantidadAntes = esperas.length
    const usuario = await crearUsuarioDePrueba(ids)
    const id = await encolarEnColaDePrueba({ tipo: "recuperacion", correo: usuario.email })
    await esperarHasta(async () => (await buscarTrabajo(COLA, id))?.estado === "completed")
    expect(esperas.length).toBe(cantidadAntes + 1)

    // Sin encolar nada más, ninguna espera nueva aparece: la espera solo se dispara al procesar un
    // trabajo, nunca después de terminar de enviarlo.
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(esperas.length).toBe(cantidadAntes + 1)
  }, 30_000)
})
