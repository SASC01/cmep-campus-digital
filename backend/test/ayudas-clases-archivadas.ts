import { errorApiSchema } from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"

import { obtenerDb } from "../src/adapters/db/cliente.js"

// Ayudas de las pruebas de ADMIN-01a (clases archivadas). Como ayudas-clases.ts, usan obtenerDb()
// solo para preparar y leer datos.

// Archiva una clase sin pasar por la API (con una fecha a medida, para ordenar las listas). Escribe
// las dos columnas juntas: el CHECK clases_activa_segun_archivada las ata.
export const archivarClaseDePrueba = async (
  claseId: string,
  archivadaEn: Date = new Date(),
): Promise<void> => {
  const { count } = await obtenerDb().clase.updateMany({
    where: { id: claseId },
    data: { activa: false, archivadaEn },
  })
  if (count !== 1) throw new Error(`Precondición: la clase ${claseId} existe para archivarla`)
}

export const leerEstadoDeClase = async (claseId: string) => {
  const fila = await obtenerDb().clase.findUnique({
    where: { id: claseId },
    select: {
      nombre: true,
      activa: true,
      archivadaEn: true,
      actualizadoEn: true,
      codigoInvitacion: true,
    },
  })
  if (fila === null) throw new Error(`Precondición: la clase ${claseId} existe`)
  return fila
}

export type MetodoDePrueba = "GET" | "HEAD" | "POST" | "PUT" | "DELETE"

export const pedirComo = (
  app: FastifyInstance,
  opciones: {
    method: MetodoDePrueba
    url: string
    token?: string
    payload?: InjectOptions["payload"]
  },
): Promise<LightMyRequestResponse> =>
  app.inject({
    method: opciones.method,
    url: opciones.url,
    ...(opciones.payload === undefined ? {} : { payload: opciones.payload }),
    headers: opciones.token === undefined ? {} : { authorization: `Bearer ${opciones.token}` },
  })

export const codigoDeError = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

// Todas las claves de un JSON, a cualquier profundidad (para comprobar que no se filtra un campo).
export const clavesDe = (valor: unknown): string[] => {
  if (Array.isArray(valor)) return valor.flatMap(clavesDe)
  if (valor === null || typeof valor !== "object") return []
  return Object.entries(valor).flatMap(([clave, hijo]) => [clave, ...clavesDe(hijo)])
}

// Reconstruye las rutas de printRoutes({ commonPrefix: false }) por nivel de sangría (el mismo
// análisis de sesiones-y-cadena.ataque.test.ts). Devuelve también las líneas que no reconoce.
export const rutasDeLaApp = (
  app: FastifyInstance,
): { rutas: Set<string>; noReconocidas: string[] } => {
  const arbol = app.printRoutes({ commonPrefix: false })
  const rutas = new Set<string>()
  const noReconocidas: string[] = []
  const porNivel: string[] = []
  for (const linea of arbol.split("\n")) {
    if (linea.trim() === "") continue
    const coincidencia = /^((?:│ {3}| {4})*)(?:├── |└── )(\S+) \(([^)]+)\)$/.exec(linea)
    if (!coincidencia) {
      noReconocidas.push(linea)
      continue
    }
    const [, sangria, segmento, metodos] = coincidencia
    const nivel = (sangria ?? "").length / 4
    const padre = nivel === 0 ? "" : porNivel[nivel - 1]
    if (padre === undefined) {
      noReconocidas.push(linea)
      continue
    }
    const url = `${padre}${segmento ?? ""}`
    porNivel[nivel] = url
    porNivel.length = nivel + 1
    for (const metodo of (metodos ?? "").split(", ")) rutas.add(`${metodo} ${url}`)
  }
  return { rutas, noReconocidas }
}
