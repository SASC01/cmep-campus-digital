import type { FastifyInstance, LightMyRequestResponse } from "fastify"

import { obtenerDb, type Ejecutor } from "../src/adapters/db/cliente.js"
import { firmarTokenDePrueba, type UsuarioDePrueba } from "./ayudas-auth.js"
import {
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { crearEntregaDePrueba } from "./ayudas-entregas.js"

// CALIFICACIONES-01b. Ayudas de las pruebas del gradebook y de "Mis calificaciones" (archivo nuevo: las
// compartidas no se tocan). Las filas de entregas se fabrican con SQL parametrizado (crearEntregaDePrueba);
// una calificada sin entrega (P-03 c′) se obtiene quitándole la fecha de entrega a una calificada. Todo
// muere en cascada con la clase (borrarMovimientosYClasesDePrueba antes que los usuarios).

export const HORA_MS = 60 * 60 * 1000

export interface ClaseDeGradebook {
  claseId: string
  maestro: UsuarioDePrueba
  tokens: { maestro: string; admin: string }
}

export const crearClaseDeGradebook = async (
  idsUsuarios: string[],
  idsClases: string[],
  ficha: string,
): Promise<ClaseDeGradebook> => {
  const maestro = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Maestra Gradebook ${ficha}`,
    rol: "maestro",
  })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  return {
    claseId: clase.id,
    maestro,
    tokens: {
      maestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
      admin: await tokenDelAdminDePrueba(),
    },
  }
}

export const inscribirAlumnoDePrueba = async (
  idsUsuarios: string[],
  claseId: string,
  nombre: string,
): Promise<UsuarioDePrueba & { token: string }> => {
  const alumno = await crearAlumnoDePrueba(idsUsuarios, { nombre })
  await inscribirDePrueba(claseId, alumno.id)
  return { ...alumno, token: await firmarTokenDePrueba({ usuarioId: alumno.id }) }
}

// Una entrega calificada sin fecha de entrega (P-03 c′): calificado, sin retraso ni enlaces.
export const crearCalificadaSinEntregaDePrueba = async ({
  tareaId,
  alumnoId,
  calificacion,
}: {
  tareaId: string
  alumnoId: string
  calificacion: number
}): Promise<string> => {
  const id = await crearEntregaDePrueba({ tareaId, alumnoId, estado: "calificado", calificacion })
  const quitadas = await obtenerDb().$executeRaw`
    UPDATE entregas SET fecha_entrega = NULL WHERE id = ${id}::uuid`
  if (quitadas !== 1) throw new Error("Precondición: se quitó la fecha de entrega")
  return id
}

export const pedirGet =
  (obtenerApp: () => FastifyInstance) =>
  (token: string | null, url: string): Promise<LightMyRequestResponse> =>
    obtenerApp().inject({
      method: "GET",
      url,
      headers: token === null ? {} : { authorization: `Bearer ${token}` },
    })

// Un doble del ejecutor: un Proxy sobre el cliente que, en $transaction, entrega a la función la
// transacción envuelta (con las mismas opciones, así que el aislamiento pedido se abre de verdad) y
// registra cada llamada que la lectura hace a la base: <modelo>.<operación> o $queryRaw. Después de
// que cada una resuelve, corre el gancho con su nombre (como el de PR-FX de
// lecturas-consistentes.integracion). Sirve para contar sentencias (CAL-1B04) y para meter una
// escritura de otra conexión entre dos sentencias de la lectura (CAL-1B03).
type Gancho = (llamada: string) => Promise<void>
type Funcion = (...argumentos: unknown[]) => unknown

const espiar = <T extends object>(objetivo: T, registrar: Gancho): T => {
  const envolverModelo = (modelo: string, delegado: object): object =>
    new Proxy(delegado, {
      get(destino, metodo) {
        const valor: unknown = Reflect.get(destino, metodo)
        if (typeof valor !== "function" || typeof metodo !== "string") return valor
        const original = valor as Funcion
        return async (...argumentos: unknown[]): Promise<unknown> => {
          const resultado: unknown = await original.apply(destino, argumentos)
          await registrar(`${modelo}.${metodo}`)
          return resultado
        }
      },
    })
  return new Proxy(objetivo, {
    get(destino, propiedad) {
      const valor: unknown = Reflect.get(destino, propiedad)
      if (propiedad === "$transaction" && typeof valor === "function") {
        const original = valor as Funcion
        return (fn: (tx: object) => Promise<unknown>, opciones?: unknown): unknown => {
          const envuelta = (tx: object): Promise<unknown> => fn(espiar(tx, registrar))
          return opciones === undefined
            ? original.call(destino, envuelta)
            : original.call(destino, envuelta, opciones)
        }
      }
      if (
        (propiedad === "$queryRaw" || propiedad === "$executeRaw") &&
        typeof valor === "function"
      ) {
        const original = valor as Funcion
        return async (...argumentos: unknown[]): Promise<unknown> => {
          const resultado: unknown = await original.apply(destino, argumentos)
          await registrar(propiedad)
          return resultado
        }
      }
      if (
        typeof propiedad === "string" &&
        !propiedad.startsWith("$") &&
        typeof valor === "object" &&
        valor !== null
      ) {
        return envolverModelo(propiedad, valor)
      }
      return valor
    },
  })
}

export const ejecutorEspiado = (
  gancho: Gancho = async () => {},
): { ejecutor: Ejecutor; llamadas: string[] } => {
  const llamadas: string[] = []
  const ejecutor = espiar(obtenerDb(), async (llamada) => {
    llamadas.push(llamada)
    await gancho(llamada)
  })
  return { ejecutor, llamadas }
}

// El gancho corre una sola vez, después de la llamada indicada.
export const unaVezDespuesDe = (
  llamada: string,
  accion: () => Promise<void>,
): { gancho: Gancho; disparado: () => boolean } => {
  let disparado = false
  return {
    gancho: async (hecha) => {
      if (disparado || hecha !== llamada) return
      disparado = true
      await accion()
    },
    disparado: () => disparado,
  }
}
