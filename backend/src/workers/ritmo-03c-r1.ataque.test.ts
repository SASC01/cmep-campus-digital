import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Notifier, ResultadoEnvio } from "../core/correo/notifier.js"
import { INTERVALO_MINIMO_ENTRE_CORREOS_MS } from "../core/correo/ritmo.js"
import { registrarConsumidores } from "./index.js"

// Ataques del Tester (AUTH-03c, ronda 1) contra el ritmo del worker (§D-C5, M-06 y M-09) con el
// reloj y la espera REALES (sin `esperar` inyectado). pg-boss sondea cada 2 s con batchSize 1, así
// que en la cola real dos trabajos nunca llegan a menos de 250 ms y el ritmo no se ve. Aquí se
// captura el manejador que registrarConsumidores le da a `trabajar` y se llama trabajo tras
// trabajo, sin sondeo: el ritmo es lo único que separa los intentos. procesarCorreoDeCuenta se
// sustituye por un doble mínimo que llama al notifier que recibe (el envoltorio del ritmo) o, si el
// trabajo lo pide, lo omite sin llamarlo.

type Manejador = (trabajo: { id: string; datos: unknown }) => Promise<void>

const capturados = vi.hoisted(() => ({ manejadores: new Map<string, Manejador>() }))

vi.mock("../adapters/queue/index.js", () => ({
  trabajar: vi.fn(async (nombre: string, manejador: Manejador) => {
    capturados.manejadores.set(nombre, manejador)
  }),
  trabajarFallidos: vi.fn(async () => undefined),
}))

vi.mock("./correo-de-cuenta.js", () => ({
  procesarCorreoDeCuenta: vi.fn(
    async (
      { id, datos }: { id: string; datos: unknown },
      deps: { notifier: Notifier },
    ): Promise<string> => {
      if ((datos as { omitir?: boolean }).omitir === true) return "omitido"
      const resultado = await deps.notifier.correoDeCuenta({
        tipo: "recuperacion",
        para: `${id}@pruebas.local`,
        nombre: "Prueba",
        enlace: "http://127.0.0.1:5173/restablecer#token=x",
      } as never)
      return resultado.estado
    },
  ),
}))

interface Intento {
  inicio: number
  fin: number
}

// Tolerancia de 2 ms abajo (resolución de Date.now y de los temporizadores de Node) y de 150 ms
// arriba (la espera es solo "lo que falta", no más). A-6 (CHORE-02, ronda 1): con 124 archivos en
// paralelo, setTimeout y el bucle de eventos se retrasan más de 60 ms (se midió 65 ms); con 150 ms
// arriba, un hueco sigue debiendo quedar por debajo de 400 ms, así que una espera doble (unos
// 500 ms) sigue fallando.
const TOLERANCIA_ABAJO = 2
const TOLERANCIA_ARRIBA = 150
// "Sin espera": lo que puede tardar en arrancar un intento que no debía esperar. Antes, 30 ms (se
// midió 30 con la suite cargada). 150 ms queda bien por debajo de los 250 ms de una espera
// indebida, que sigue fallando (A-6, CHORE-02, ronda 1).
const TOLERANCIA_SIN_ESPERA = 150

const logMudo = {
  error: () => undefined,
  warn: () => undefined,
  info: () => undefined,
  debug: () => undefined,
  trace: () => undefined,
  fatal: () => undefined,
  child: () => logMudo,
} as never

const crearNotifierQueMide = (
  comportamiento: (n: number) => "enviar" | "rechazar" | "lanzar" | { tardarMs: number },
) => {
  const intentos: Intento[] = []
  const notifier: Notifier = {
    correoDeCuenta: async (): Promise<ResultadoEnvio> => {
      const n = intentos.length
      const intento = { inicio: Date.now(), fin: 0 }
      intentos.push(intento)
      const accion = comportamiento(n)
      if (typeof accion === "object") {
        await new Promise((resolver) => setTimeout(resolver, accion.tardarMs))
      }
      intento.fin = Date.now()
      if (accion === "lanzar") throw new Error("429 de ataque")
      if (accion === "rechazar") return { estado: "rechazado", motivo: "422 de ataque" }
      return { estado: "enviado", id: `ataque-${String(n)}` }
    },
  }
  return { intentos, notifier }
}

const registrar = async (notifier: Notifier, reloj: () => Date = () => new Date()) => {
  capturados.manejadores.clear()
  await registrarConsumidores(
    { notifier, urlPublicaFrontend: "http://127.0.0.1:5173", reloj, log: logMudo },
    { correoDeCuenta: "COLA_RITMO_ATAQUE", fallidos: "COLA_RITMO_ATAQUE_FALLIDO" },
  )
  const manejador = capturados.manejadores.get("COLA_RITMO_ATAQUE")
  if (!manejador) throw new Error("Precondición: registrarConsumidores no registró el consumidor")
  return manejador
}

const trabajo = (n: number, extra: Record<string, unknown> = {}) => ({
  id: `00000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`,
  datos: { tipo: "recuperacion", ...extra },
})

beforeEach(() => {
  capturados.manejadores.clear()
})

describe("ataque (AUTH-03c r1): ritmo del worker con reloj y espera reales", () => {
  it("cinco trabajos seguidos: el primero sin espera; entre el fin de un intento y el inicio del siguiente, al menos 250 ms y no mucho más; nada después del último", async () => {
    const { intentos, notifier } = crearNotifierQueMide(() => "enviar")
    const manejador = await registrar(notifier)
    const inicio = Date.now()
    for (let n = 0; n < 5; n += 1) await manejador(trabajo(n))
    const terminoElUltimo = Date.now()

    expect(intentos).toHaveLength(5)
    expect(intentos[0]?.inicio ?? Infinity).toBeLessThan(inicio + TOLERANCIA_SIN_ESPERA)
    const huecos = intentos.slice(1).map((intento, i) => intento.inicio - (intentos[i]?.fin ?? 0))
    for (const hueco of huecos) {
      expect(hueco, JSON.stringify(huecos)).toBeGreaterThanOrEqual(
        INTERVALO_MINIMO_ENTRE_CORREOS_MS - TOLERANCIA_ABAJO,
      )
      expect(hueco, JSON.stringify(huecos)).toBeLessThan(
        INTERVALO_MINIMO_ENTRE_CORREOS_MS + TOLERANCIA_ARRIBA,
      )
    }
    expect(terminoElUltimo - (intentos[4]?.fin ?? 0)).toBeLessThan(TOLERANCIA_SIN_ESPERA)
  }, 10_000)

  it("M-09: un intento que lanza propaga el error, y el trabajo siguiente espera 250 ms desde el fallo", async () => {
    const { intentos, notifier } = crearNotifierQueMide((n) => (n === 0 ? "lanzar" : "enviar"))
    const manejador = await registrar(notifier)
    await expect(manejador(trabajo(1))).rejects.toThrow("429 de ataque")
    await manejador(trabajo(2))
    expect(intentos).toHaveLength(2)
    const hueco = (intentos[1]?.inicio ?? 0) - (intentos[0]?.fin ?? 0)
    expect(hueco).toBeGreaterThanOrEqual(INTERVALO_MINIMO_ENTRE_CORREOS_MS - TOLERANCIA_ABAJO)
  }, 10_000)

  it("un intento rechazado por el proveedor también cuenta para el ritmo", async () => {
    const { intentos, notifier } = crearNotifierQueMide((n) => (n === 0 ? "rechazar" : "enviar"))
    const manejador = await registrar(notifier)
    await manejador(trabajo(1))
    await manejador(trabajo(2))
    const hueco = (intentos[1]?.inicio ?? 0) - (intentos[0]?.fin ?? 0)
    expect(hueco).toBeGreaterThanOrEqual(INTERVALO_MINIMO_ENTRE_CORREOS_MS - TOLERANCIA_ABAJO)
  }, 10_000)

  it("un omitido no cuenta: tras un envío, un omitido y otro envío, el segundo envío no espera más de lo que faltaba desde el primero", async () => {
    const { intentos, notifier } = crearNotifierQueMide(() => "enviar")
    const manejador = await registrar(notifier)
    await manejador(trabajo(1))
    await manejador(trabajo(2, { omitir: true }))
    const terminoElOmitido = Date.now()
    await manejador(trabajo(3))
    expect(intentos).toHaveLength(2)
    // El omitido esperó su turno (M-06), así que ya pasaron 250 ms desde el primer envío: el
    // siguiente envío arranca sin otra espera.
    expect((intentos[1]?.inicio ?? Infinity) - terminoElOmitido).toBeLessThan(TOLERANCIA_SIN_ESPERA)
    const hueco = (intentos[1]?.inicio ?? 0) - (intentos[0]?.fin ?? 0)
    expect(hueco).toBeGreaterThanOrEqual(INTERVALO_MINIMO_ENTRE_CORREOS_MS - TOLERANCIA_ABAJO)
    expect(hueco).toBeLessThan(INTERVALO_MINIMO_ENTRE_CORREOS_MS + TOLERANCIA_ARRIBA)
  }, 10_000)

  it("si ya pasaron más de 250 ms desde el último intento, el siguiente no espera", async () => {
    const { intentos, notifier } = crearNotifierQueMide(() => "enviar")
    const manejador = await registrar(notifier)
    await manejador(trabajo(1))
    await new Promise((resolver) => setTimeout(resolver, 320))
    const antes = Date.now()
    await manejador(trabajo(2))
    expect((intentos[1]?.inicio ?? Infinity) - antes).toBeLessThan(TOLERANCIA_SIN_ESPERA)
  }, 10_000)

  it("un reloj que salta 10 s hacia atrás nunca hace esperar más de 250 ms", async () => {
    let llamadas = 0
    const relojQueRetrocede = (): Date => {
      llamadas += 1
      return new Date(Date.now() - (llamadas > 1 ? 10_000 : 0))
    }
    const { intentos, notifier } = crearNotifierQueMide(() => "enviar")
    const manejador = await registrar(notifier, relojQueRetrocede)
    await manejador(trabajo(1))
    await manejador(trabajo(2))
    const hueco = (intentos[1]?.inicio ?? 0) - (intentos[0]?.fin ?? 0)
    expect(hueco).toBeLessThan(INTERVALO_MINIMO_ENTRE_CORREOS_MS + TOLERANCIA_ARRIBA)
  }, 10_000)
})
