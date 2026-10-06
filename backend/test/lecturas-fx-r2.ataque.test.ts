import { randomUUID } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import { join, sep } from "node:path"

import {
  errorApiSchema,
  listaComentariosRespuestaSchema,
  listaPublicacionesRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { generarTokenDeEnlace } from "../src/adapters/auth/index.js"
import { enTransaccion, obtenerDb, type Ejecutor } from "../src/adapters/db/cliente.js"
import {
  listarEnlacesRegistro,
  listarRegistradosPorEnlace,
} from "../src/adapters/db/enlaces-registro.js"
import { MENSAJE_SERVICIO_OCUPADO } from "../src/adapters/db/errores.js"
import { listarAlumnosDeClase, listarPersonas } from "../src/adapters/db/inscripciones.js"
import {
  borrarComentario,
  borrarPublicacion,
  crearComentario,
  crearPublicacion,
  listarComentarios,
  listarPublicaciones,
} from "../src/adapters/db/publicaciones.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { AppError } from "../src/core/errores.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba, type UsuarioDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  crearComentarioDePrueba,
  crearPublicacionDePrueba,
  idDelAdminDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"

// Ataque del Tester (FIX-CLASES, ronda 2; plan con la Enmienda 1, "Rondas de ataque", punto 8, y
// la lista del orquestador): las dos envolturas nuevas del muro (listarPublicaciones y
// listarComentarios) en cada frontera de sentencia, con los borrados hechos por las rutas reales
// (autor, maestro moderador, admin, mis-comentarios) en medio de la lectura; cursores manipulados;
// "Ver más" por HTTP con borrados concurrentes; el aislamiento de las escrituras del muro; el pool
// lleno; el ejecutor de una transacción de afuera; y las lecturas con cursor que quedan fuera.
// Método del gancho: un doble del ejecutor de Prisma que, después de una llamada concreta del
// adaptador, ejecuta una acción (aquí, casi siempre una petición DELETE real a la API) antes de
// dejar seguir a la siguiente sentencia. La app registra en nivel "error" (PA-07).

const MARCA = `lecturas-fx-r2-${randomUUID().slice(0, 8)}`
const CONEXIONES_DEL_POOL = 10

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
const idsEnlaces: string[] = []
let tokenAdmin = ""
let idAdmin = ""

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

beforeAll(async () => {
  const env = cargarEnv()
  const url = new URL(env.DATABASE_URL)
  url.searchParams.set("application_name", MARCA)
  app = await construirApp({ env: { ...env, DATABASE_URL: url.toString(), LOG_LEVEL: "error" } })
  await app.ready()
  const [fila] = await obtenerDb().$queryRaw<
    { marca: string }[]
  >`SELECT current_setting('application_name') AS marca`
  if (fila?.marca !== MARCA) {
    throw new Error("Precondición: el pool de este archivo no lleva la marca application_name")
  }
  idAdmin = await idDelAdminDePrueba()
  tokenAdmin = await tokenDelAdminDePrueba()
}, 30_000)

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  if (idsEnlaces.length > 0) {
    await obtenerDb().enlaceRegistro.deleteMany({ where: { id: { in: idsEnlaces } } })
  }
  await app?.close()
})

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const ficha = (): string => randomUUID().slice(0, 8)

interface Cuenta extends UsuarioDePrueba {
  token: string
}

const cuenta = async (etiqueta: string, rol: "estudiante" | "maestro"): Promise<Cuenta> => {
  const usuario = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `${rol === "maestro" ? "Maestro" : "Alumno"} ${etiqueta} ${ficha()}`,
    rol,
  })
  return { ...usuario, token: await firmarTokenDePrueba({ usuarioId: usuario.id }) }
}

const pedir = (
  method: "GET" | "DELETE" | "POST",
  url: string,
  token: string,
): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({ method, url, headers: { authorization: `Bearer ${token}` } })

const urlPublicaciones = (claseId: string): string => `/api/clases/${claseId}/publicaciones`
const urlComentarios = (claseId: string, publicacionId: string): string =>
  `${urlPublicaciones(claseId)}/${publicacionId}/comentarios`

type Resultado<T> = { ok: true; valor: T } | { ok: false; error: unknown }

const capturar = <T>(promesa: Promise<T>): Promise<Resultado<T>> =>
  promesa.then(
    (valor): Resultado<T> => ({ ok: true, valor }),
    (error: unknown): Resultado<T> => ({ ok: false, error }),
  )

const valorDe = <T>(resultado: Resultado<T>): T => {
  if (!resultado.ok) {
    throw new Error(`la lectura rechazó: ${String(resultado.error)}`, { cause: resultado.error })
  }
  return resultado.valor
}

// ---------------------------------------------------------------------------------------------
// Doble del ejecutor de Prisma (reescrito aquí: nunca se importa de otra *.ataque).

type Gancho = (llamada: string) => Promise<void>
type Funcion = (...argumentos: unknown[]) => unknown

const conGancho = <T extends object>(objetivo: T, gancho: Gancho): T => {
  const envolverModelo = (modelo: string, delegado: object): object =>
    new Proxy(delegado, {
      get(destino, metodo) {
        const valor: unknown = Reflect.get(destino, metodo)
        if (typeof valor !== "function" || typeof metodo !== "string") return valor
        const original = valor as Funcion
        return async (...argumentos: unknown[]): Promise<unknown> => {
          const resultado: unknown = await original.apply(destino, argumentos)
          await gancho(`${modelo}.${metodo}`)
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
          const envuelta = (tx: object): Promise<unknown> => fn(conGancho(tx, gancho))
          return opciones === undefined
            ? original.call(destino, envuelta)
            : original.call(destino, envuelta, opciones)
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

const unaVezDespuesDe = (
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

const ejecutorConGancho = (gancho: Gancho): Ejecutor => conGancho(obtenerDb(), gancho)

// Espía del aislamiento: cada transacción que el adaptador abre por este ejecutor lee primero su
// nivel de aislamiento y lo anota.
const ejecutorEspia = (): { ejecutor: Ejecutor; niveles: string[] } => {
  const niveles: string[] = []
  const cliente = obtenerDb()
  const ejecutor = new Proxy(cliente, {
    get(destino, propiedad) {
      const valor: unknown = Reflect.get(destino, propiedad)
      if (propiedad !== "$transaction" || typeof valor !== "function") return valor
      const original = valor as Funcion
      return (
        fn: (tx: Parameters<Parameters<typeof cliente.$transaction>[0]>[0]) => Promise<unknown>,
        opciones?: unknown,
      ): unknown => {
        const envuelta = async (
          tx: Parameters<Parameters<typeof cliente.$transaction>[0]>[0],
        ): Promise<unknown> => {
          const [fila] = await tx.$queryRaw<
            { nivel: string }[]
          >`SELECT current_setting('transaction_isolation') AS nivel`
          niveles.push(fila?.nivel ?? "sin nivel")
          return fn(tx)
        }
        return opciones === undefined
          ? original.call(destino, envuelta)
          : original.call(destino, envuelta, opciones)
      }
    },
  })
  return { ejecutor, niveles }
}

// ---------------------------------------------------------------------------------------------
// Escenarios.

interface Muro {
  claseId: string
  maestro: Cuenta
  moderado: Cuenta
  alumna: Cuenta
  // De la más reciente a la más antigua (el orden de la lista).
  publicaciones: string[]
}

const muroConPublicaciones = async (n: number): Promise<Muro> => {
  const maestro = await cuenta("muro", "maestro")
  const alumna = await cuenta("muro", "estudiante")
  const clase = await crearClaseDePrueba(idsClases, {
    maestroId: maestro.id,
    nombre: `M ${ficha()}`,
  })
  await inscribirDePrueba(clase.id, alumna.id)
  const ahora = Date.now()
  const publicaciones: string[] = []
  for (let i = 0; i < n; i += 1) {
    publicaciones.push(
      await crearPublicacionDePrueba({
        claseId: clase.id,
        autorId: maestro.id,
        texto: `P${String(i)}`,
        creadoEn: new Date(ahora - (i + 1) * 1_000),
      }),
    )
  }
  return { claseId: clase.id, maestro, moderado: maestro, alumna, publicaciones }
}

// Comentarios de la alumna en una publicación, del más antiguo al más reciente (el orden del hilo).
const hiloConComentarios = async (
  muro: Muro,
  publicacionId: string,
  n: number,
): Promise<string[]> => {
  const ahora = Date.now()
  const ids: string[] = []
  for (let i = 0; i < n; i += 1) {
    ids.push(
      await crearComentarioDePrueba({
        publicacionId,
        autorId: muro.alumna.id,
        texto: `K${String(i)}`,
        creadoEn: new Date(ahora - (n - i) * 1_000),
      }),
    )
  }
  return ids
}

const actorAdmin = (): { id: string; rol: "admin" } => ({ id: idAdmin, rol: "admin" })

const borradoPorRuta =
  (descripcion: string, hacer: () => Promise<LightMyRequestResponse>) =>
  async (): Promise<void> => {
    const respuesta = await hacer()
    expect(respuesta.statusCode, `${descripcion}: ${respuesta.body}`).toBe(204)
  }

const idDe = (lista: readonly string[], i: number): string => {
  const id = lista[i]
  if (id === undefined) throw new Error(`Precondición: no existe el elemento ${String(i)}`)
  return id
}

// ---------------------------------------------------------------------------------------------

describe("ataque FIX-CLASES r2: listarPublicaciones con borrados por las rutas reales en cada frontera", () => {
  it("la publicación del cursor borrada tras su comprobación por el autor (maestro) y por el admin, con DELETE real: la página trae las que siguen y el DELETE no espera a la lectura", async () => {
    for (const quien of ["autor", "admin"] as const) {
      const muro = await muroConPublicaciones(4)
      const [, p1, p2, p3] = muro.publicaciones
      if (p1 === undefined || p2 === undefined || p3 === undefined)
        throw new Error("Precondición: cuatro publicaciones")
      const token = quien === "autor" ? muro.maestro.token : tokenAdmin
      const { gancho, disparado } = unaVezDespuesDe(
        "publicacion.findFirst",
        borradoPorRuta(quien, () =>
          pedir("DELETE", `${urlPublicaciones(muro.claseId)}/${p1}`, token),
        ),
      )
      const lista = valorDe(
        await capturar(
          listarPublicaciones(
            { claseId: muro.claseId, cursor: p1, limite: 10, actor: actorAdmin() },
            ejecutorConGancho(gancho),
          ),
        ),
      )
      expect(disparado(), `${quien}: el gancho corrió`).toBe(true)
      expect(
        lista.publicaciones.map((p) => p.id),
        quien,
      ).toEqual([p2, p3])
      expect(await obtenerDb().publicacion.count({ where: { id: p1 } })).toBe(0)
    }
  }, 60_000)

  it("una publicación de la página borrada por el admin tras el conteo de comentarios (conteo→adjuntos): sale con sus 2 comentarios y su adjunto, los de la instantánea", async () => {
    const muro = await muroConPublicaciones(2)
    const objetivo = idDe(muro.publicaciones, 0)
    await hiloConComentarios(muro, objetivo, 2)
    const archivo = await crearArchivoDePrueba({
      claseId: muro.claseId,
      subidoPor: muro.maestro.id,
      estado: "confirmado",
      publicacionId: objetivo,
    })
    const { gancho, disparado } = unaVezDespuesDe(
      "comentario.groupBy",
      borradoPorRuta("admin", () =>
        pedir("DELETE", `${urlPublicaciones(muro.claseId)}/${objetivo}`, tokenAdmin),
      ),
    )
    const lista = valorDe(
      await capturar(
        listarPublicaciones(
          { claseId: muro.claseId, cursor: undefined, limite: 10, actor: actorAdmin() },
          ejecutorConGancho(gancho),
        ),
      ),
    )
    expect(disparado(), "el gancho corrió tras el conteo").toBe(true)
    const leida = lista.publicaciones.find((p) => p.id === objetivo)
    expect(leida?.comentarios).toBe(2)
    expect(leida?.adjuntos.map((a) => a.id)).toEqual([archivo.id])
    expect(await obtenerDb().archivo.findUnique({ where: { id: archivo.id } })).toMatchObject({
      estado: "descartado",
      publicacionId: null,
    })
  }, 30_000)

  it("la clase borrada después de cada sentencia (cursor, página, conteo): la página, los conteos y los adjuntos salen de la instantánea, sin lanzar", async () => {
    for (const llamada of ["publicacion.findFirst", "publicacion.findMany", "comentario.groupBy"]) {
      const muro = await muroConPublicaciones(3)
      const [p0, p1, p2] = muro.publicaciones
      if (p0 === undefined || p1 === undefined || p2 === undefined)
        throw new Error("Precondición: tres publicaciones")
      await hiloConComentarios(muro, p1, 1)
      const archivo = await crearArchivoDePrueba({
        claseId: muro.claseId,
        subidoPor: muro.maestro.id,
        estado: "confirmado",
        publicacionId: p2,
      })
      const { gancho, disparado } = unaVezDespuesDe(llamada, async () => {
        const { count } = await obtenerDb().clase.deleteMany({ where: { id: muro.claseId } })
        expect(count, `${llamada}: el gancho borró la clase`).toBe(1)
      })
      const lista = valorDe(
        await capturar(
          listarPublicaciones(
            { claseId: muro.claseId, cursor: p0, limite: 10, actor: actorAdmin() },
            ejecutorConGancho(gancho),
          ),
        ),
      )
      expect(disparado(), `${llamada}: el gancho corrió`).toBe(true)
      expect(
        lista.publicaciones.map((p) => ({ id: p.id, c: p.comentarios, a: p.adjuntos.length })),
        llamada,
      ).toEqual([
        { id: p1, c: 1, a: 0 },
        { id: p2, c: 0, a: 1 },
      ])
      expect(lista.publicaciones[1]?.adjuntos[0]?.id).toBe(archivo.id)
    }
  }, 60_000)
})

describe("ataque FIX-CLASES r2: listarComentarios con borrados por las rutas reales en cada frontera", () => {
  it("el comentario del cursor borrado tras su comprobación por cada camino (autora, maestro moderador, admin, mis-comentarios): la página trae los que siguen", async () => {
    const caminos = ["autora", "moderador", "admin", "mis-comentarios"] as const
    for (const camino of caminos) {
      const muro = await muroConPublicaciones(1)
      const publicacion = idDe(muro.publicaciones, 0)
      const [, k1, k2, k3] = await hiloConComentarios(muro, publicacion, 4)
      if (k1 === undefined || k2 === undefined || k3 === undefined)
        throw new Error("Precondición: cuatro comentarios")
      const url =
        camino === "mis-comentarios"
          ? `/api/clases/${muro.claseId}/mis-comentarios/${k1}`
          : `${urlComentarios(muro.claseId, publicacion)}/${k1}`
      const token = {
        autora: muro.alumna.token,
        moderador: muro.moderado.token,
        admin: tokenAdmin,
        "mis-comentarios": muro.alumna.token,
      }[camino]
      const { gancho, disparado } = unaVezDespuesDe(
        "comentario.findFirst",
        borradoPorRuta(camino, () => pedir("DELETE", url, token)),
      )
      const lista = valorDe(
        await capturar(
          listarComentarios(
            {
              claseId: muro.claseId,
              publicacionId: publicacion,
              cursor: k1,
              limite: 10,
              actor: actorAdmin(),
            },
            ejecutorConGancho(gancho),
          ),
        ),
      )
      expect(disparado(), `${camino}: el gancho corrió`).toBe(true)
      expect(
        lista?.comentarios.map((c) => c.id),
        camino,
      ).toEqual([k2, k3])
      expect(await obtenerDb().comentario.count({ where: { id: k1 } })).toBe(0)
    }
  }, 90_000)

  it("con cursor, la publicación entera borrada por su autor tras comprobarla (publicación→cursor→página): el cursor sigue valiendo y salen los que siguen", async () => {
    const muro = await muroConPublicaciones(1)
    const publicacion = idDe(muro.publicaciones, 0)
    const [, k1, k2, k3] = await hiloConComentarios(muro, publicacion, 4)
    const { gancho, disparado } = unaVezDespuesDe(
      "publicacion.findFirst",
      borradoPorRuta("autor", () =>
        pedir("DELETE", `${urlPublicaciones(muro.claseId)}/${publicacion}`, muro.maestro.token),
      ),
    )
    const resultado = await capturar(
      listarComentarios(
        {
          claseId: muro.claseId,
          publicacionId: publicacion,
          cursor: k1 ?? "",
          limite: 10,
          actor: actorAdmin(),
        },
        ejecutorConGancho(gancho),
      ),
    )
    expect(disparado(), "el gancho corrió").toBe(true)
    expect(valorDe(resultado)?.comentarios.map((c) => c.id)).toEqual([k2, k3])
  }, 30_000)

  it("un comentario de la página y luego la clase entera borrados tras la comprobación del cursor: salen de la instantánea, sin lanzar", async () => {
    for (const quePasa of ["fila de la página", "clase"] as const) {
      const muro = await muroConPublicaciones(1)
      const publicacion = idDe(muro.publicaciones, 0)
      const [, k1, k2, k3] = await hiloConComentarios(muro, publicacion, 4)
      if (k1 === undefined || k2 === undefined || k3 === undefined)
        throw new Error("Precondición: cuatro comentarios")
      const { gancho, disparado } = unaVezDespuesDe("comentario.findFirst", async () => {
        if (quePasa === "clase") {
          await obtenerDb().clase.deleteMany({ where: { id: muro.claseId } })
          return
        }
        const r = await pedir(
          "DELETE",
          `${urlComentarios(muro.claseId, publicacion)}/${k2}`,
          muro.alumna.token,
        )
        expect(r.statusCode, r.body).toBe(204)
      })
      const lista = valorDe(
        await capturar(
          listarComentarios(
            {
              claseId: muro.claseId,
              publicacionId: publicacion,
              cursor: k1,
              limite: 10,
              actor: actorAdmin(),
            },
            ejecutorConGancho(gancho),
          ),
        ),
      )
      expect(disparado(), `${quePasa}: el gancho corrió`).toBe(true)
      expect(
        lista?.comentarios.map((c) => c.id),
        quePasa,
      ).toEqual([k2, k3])
    }
  }, 60_000)
})

describe("ataque FIX-CLASES r2: cursores manipulados por HTTP", () => {
  const codigoDe = (r: LightMyRequestResponse): string =>
    errorApiSchema.parse(r.json()).error.codigo

  it("GET …/publicaciones: cursor inexistente, de otra clase o que es un comentario → 400 VALIDACION; en mayúsculas → 200 con las que siguen", async () => {
    const muro = await muroConPublicaciones(3)
    const otro = await muroConPublicaciones(1)
    const [p0, p1, p2] = muro.publicaciones
    const comentario = (await hiloConComentarios(muro, p0 ?? "", 1))[0]
    const base = urlPublicaciones(muro.claseId)
    const malos: Record<string, string> = {
      inexistente: randomUUID(),
      "de otra clase": idDe(otro.publicaciones, 0),
      "un comentario": comentario ?? "",
    }
    const vistos: Record<string, string> = {}
    for (const [caso, cursor] of Object.entries(malos)) {
      const r = await pedir("GET", `${base}?cursor=${cursor}&limite=10`, muro.alumna.token)
      vistos[caso] = `${String(r.statusCode)} ${r.statusCode === 200 ? "" : codigoDe(r)}`
    }
    expect(vistos).toEqual({
      inexistente: "400 VALIDACION",
      "de otra clase": "400 VALIDACION",
      "un comentario": "400 VALIDACION",
    })
    const mayusculas = await pedir(
      "GET",
      `${base}?cursor=${(p0 ?? "").toUpperCase()}&limite=10`,
      muro.alumna.token,
    )
    expect(mayusculas.statusCode, mayusculas.body).toBe(200)
    expect(
      listaPublicacionesRespuestaSchema.parse(mayusculas.json()).publicaciones.map((p) => p.id),
    ).toEqual([p1, p2])
  }, 30_000)

  it("GET …/comentarios: cursor inexistente, de otra publicación de la misma clase o que es una publicación → 400 VALIDACION; en mayúsculas → 200 con los que siguen", async () => {
    const muro = await muroConPublicaciones(2)
    const [pa, pb] = muro.publicaciones
    const [k0, k1, k2] = await hiloConComentarios(muro, pa ?? "", 3)
    const [ajeno] = await hiloConComentarios(muro, pb ?? "", 1)
    const base = urlComentarios(muro.claseId, pa ?? "")
    const malos: Record<string, string> = {
      inexistente: randomUUID(),
      "de otra publicación": ajeno ?? "",
      "una publicación": pb ?? "",
    }
    const vistos: Record<string, string> = {}
    for (const [caso, cursor] of Object.entries(malos)) {
      const r = await pedir("GET", `${base}?cursor=${cursor}&limite=10`, muro.alumna.token)
      vistos[caso] = `${String(r.statusCode)} ${r.statusCode === 200 ? "" : codigoDe(r)}`
    }
    expect(vistos).toEqual({
      inexistente: "400 VALIDACION",
      "de otra publicación": "400 VALIDACION",
      "una publicación": "400 VALIDACION",
    })
    const mayusculas = await pedir(
      "GET",
      `${base}?cursor=${(k0 ?? "").toUpperCase()}&limite=10`,
      muro.alumna.token,
    )
    expect(mayusculas.statusCode, mayusculas.body).toBe(200)
    expect(
      listaComentariosRespuestaSchema.parse(mayusculas.json()).comentarios.map((c) => c.id),
    ).toEqual([k1, k2])
  }, 30_000)
})

describe('ataque FIX-CLASES r2: "Ver más" por HTTP con borrados concurrentes', () => {
  // 41 filas (4 por ronda más una); las de índice impar nunca se borran. En la ronda r, a la vez: la página con cursor
  // en la fila 4r, el borrado de esa fila (el cursor) y el de la fila 4r+2 (una de la página).
  // Las filas anteriores ya se borraron en rondas anteriores y quedan antes del cursor, así que la
  // página solo puede ser [4r+1, 4r+2, 4r+3] (antes del borrado) o [4r+1, 4r+3, 4r+4] (después);
  // si el cursor ya no existía al empezar, 400 VALIDACION. Nunca vacía, nunca 500.
  const RONDAS = 10

  const comprobarRonda = (
    respuesta: LightMyRequestResponse,
    ids: readonly string[],
    r: number,
    extraer: (cuerpo: unknown) => { ids: string[]; siguiente: string | null },
  ): string => {
    if (respuesta.statusCode === 400) {
      expect(errorApiSchema.parse(respuesta.json()).error.codigo).toBe("VALIDACION")
      return "400"
    }
    expect(respuesta.statusCode, respuesta.body).toBe(200)
    const { ids: pagina, siguiente } = extraer(respuesta.json())
    const antes = [4 * r + 1, 4 * r + 2, 4 * r + 3].map((i) => idDe(ids, i))
    const despues = [4 * r + 1, 4 * r + 3, 4 * r + 4].map((i) => idDe(ids, i))
    expect([antes, despues], `ronda ${String(r)}: ${JSON.stringify(pagina)}`).toContainEqual(pagina)
    expect(siguiente, "siguienteCursor es la última de la página").toBe(pagina[2])
    return pagina[1] === antes[1] ? "200 antes" : "200 después"
  }

  it("GET …/publicaciones?cursor con el cursor y una fila de la página borrados a la vez por el autor y el admin: 200 con una página coherente o 400, nunca vacía ni 500", async () => {
    const muro = await muroConPublicaciones(4 * RONDAS + 1)
    const ids = muro.publicaciones
    const resultados: string[] = []
    for (let r = 0; r < RONDAS; r += 1) {
      const cursor = idDe(ids, 4 * r)
      const [lectura, borradoCursor, borradoPagina] = await Promise.all([
        pedir(
          "GET",
          `${urlPublicaciones(muro.claseId)}?cursor=${cursor}&limite=3`,
          muro.alumna.token,
        ),
        pedir("DELETE", `${urlPublicaciones(muro.claseId)}/${cursor}`, muro.maestro.token),
        pedir("DELETE", `${urlPublicaciones(muro.claseId)}/${idDe(ids, 4 * r + 2)}`, tokenAdmin),
      ])
      expect([borradoCursor.statusCode, borradoPagina.statusCode]).toEqual([204, 204])
      resultados.push(
        comprobarRonda(lectura, ids, r, (cuerpo) => {
          const lista = listaPublicacionesRespuestaSchema.parse(cuerpo)
          return { ids: lista.publicaciones.map((p) => p.id), siguiente: lista.siguienteCursor }
        }),
      )
    }
    // Deja a la vista quién ganó cada carrera (la lectura, el borrado o el 400).
    process.stdout.write(`ataque-fx-r2 Ver más, publicaciones: ${resultados.join(", ")}\n`)
    expect(resultados).toHaveLength(RONDAS)
  }, 90_000)

  it("GET …/comentarios?cursor con el cursor borrado por mis-comentarios y una fila de la página por el moderador, a la vez: 200 con una página coherente o 400, nunca vacía ni 500", async () => {
    const muro = await muroConPublicaciones(1)
    const publicacion = idDe(muro.publicaciones, 0)
    const ids = await hiloConComentarios(muro, publicacion, 4 * RONDAS + 1)
    const resultados: string[] = []
    for (let r = 0; r < RONDAS; r += 1) {
      const cursor = idDe(ids, 4 * r)
      const [lectura, borradoCursor, borradoPagina] = await Promise.all([
        pedir(
          "GET",
          `${urlComentarios(muro.claseId, publicacion)}?cursor=${cursor}&limite=3`,
          muro.alumna.token,
        ),
        pedir("DELETE", `/api/clases/${muro.claseId}/mis-comentarios/${cursor}`, muro.alumna.token),
        pedir(
          "DELETE",
          `${urlComentarios(muro.claseId, publicacion)}/${idDe(ids, 4 * r + 2)}`,
          muro.moderado.token,
        ),
      ])
      expect([borradoCursor.statusCode, borradoPagina.statusCode]).toEqual([204, 204])
      resultados.push(
        comprobarRonda(lectura, ids, r, (cuerpo) => {
          const lista = listaComentariosRespuestaSchema.parse(cuerpo)
          return { ids: lista.comentarios.map((c) => c.id), siguiente: lista.siguienteCursor }
        }),
      )
    }
    process.stdout.write(`ataque-fx-r2 Ver más, comentarios: ${resultados.join(", ")}\n`)
    expect(resultados).toHaveLength(RONDAS)
  }, 90_000)
})

describe("ataque FIX-CLASES r2: aislamiento, bloqueos y pool", () => {
  it("las escrituras del muro (crear y borrar publicación y comentario) abren sus transacciones en read committed; las dos lecturas, en repeatable read", async () => {
    const muro = await muroConPublicaciones(1)
    const espia = ejecutorEspia()
    const sinEncolar = async (): Promise<void> => undefined
    const publicacionId = randomUUID()
    await crearPublicacion(
      {
        id: publicacionId,
        claseId: muro.claseId,
        autorId: muro.maestro.id,
        tipo: "anuncio",
        titulo: null,
        texto: "Espía",
      },
      sinEncolar,
      espia.ejecutor,
    )
    const comentarioId = randomUUID()
    const creado = await crearComentario(
      {
        id: comentarioId,
        claseId: muro.claseId,
        publicacionId,
        autorId: muro.alumna.id,
        texto: "Espía",
      },
      sinEncolar,
      espia.ejecutor,
    )
    expect(creado, "Precondición: el comentario se creó").not.toBeNull()
    await listarPublicaciones(
      { claseId: muro.claseId, cursor: undefined, limite: 10, actor: actorAdmin() },
      espia.ejecutor,
    )
    await listarComentarios(
      { claseId: muro.claseId, publicacionId, cursor: undefined, limite: 10, actor: actorAdmin() },
      espia.ejecutor,
    )
    expect(
      await borrarComentario(
        { claseId: muro.claseId, publicacionId, comentarioId, actor: actorAdmin() },
        espia.ejecutor,
      ),
    ).toBe(true)
    expect(
      await borrarPublicacion(
        { claseId: muro.claseId, publicacionId, actor: actorAdmin() },
        espia.ejecutor,
      ),
    ).toBe(true)
    expect(espia.niveles).toEqual([
      "read committed",
      "read committed",
      "repeatable read",
      "repeatable read",
      "read committed",
      "read committed",
    ])
  }, 30_000)

  it("una lectura del muro no espera a un DELETE sin confirmar (con la fila bloqueada) y ve las filas todavía vivas", async () => {
    const muro = await muroConPublicaciones(2)
    const publicacion = idDe(muro.publicaciones, 0)
    const [k0, k1] = await hiloConComentarios(muro, publicacion, 2)
    let soltar: () => void = () => undefined
    const compuerta = new Promise<void>((resolver) => {
      soltar = resolver
    })
    let borrado = false
    const deshacer = new Error("deshacer a propósito")
    const retenedora = obtenerDb()
      .$transaction(
        async (tx) => {
          await tx.comentario.deleteMany({ where: { id: k0 ?? "" } })
          await tx.publicacion.updateMany({ where: { id: publicacion }, data: { texto: "x" } })
          borrado = true
          await compuerta
          throw deshacer
        },
        { timeout: 15_000, maxWait: 5_000 },
      )
      .catch((error: unknown) => {
        if (error !== deshacer) throw error
      })
    const limite = Date.now() + 5_000
    while (!borrado && Date.now() < limite) await esperar(10)
    expect(borrado, "Precondición: el DELETE quedó sin confirmar").toBe(true)
    try {
      const inicio = Date.now()
      const [comentarios, publicaciones] = await Promise.all([
        listarComentarios({
          claseId: muro.claseId,
          publicacionId: publicacion,
          cursor: undefined,
          limite: 10,
          actor: actorAdmin(),
        }),
        listarPublicaciones({
          claseId: muro.claseId,
          cursor: undefined,
          limite: 10,
          actor: actorAdmin(),
        }),
      ])
      const tardo = Date.now() - inicio
      expect(tardo, "la lectura no esperó al DELETE").toBeLessThan(2_000)
      expect(comentarios?.comentarios.map((c) => c.id)).toEqual([k0, k1])
      expect(publicaciones.publicaciones.find((p) => p.id === publicacion)?.comentarios).toBe(2)
    } finally {
      soltar()
      await retenedora
    }
    expect(await obtenerDb().comentario.count({ where: { id: k0 ?? "" } })).toBe(1)
  }, 30_000)

  const ocuparPool = async (n: number): Promise<{ liberar: () => Promise<void> }> => {
    let abrir: () => void = () => undefined
    const compuerta = new Promise<void>((resolver) => {
      abrir = resolver
    })
    let dentro = 0
    const transacciones = Array.from({ length: n }, () =>
      obtenerDb().$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT 1`
          dentro += 1
          await compuerta
        },
        { maxWait: 10_000, timeout: 30_000 },
      ),
    )
    const limite = Date.now() + 10_000
    while (dentro < n && Date.now() < limite) await esperar(20)
    expect(dentro, `Precondición: las ${String(n)} transacciones no abrieron en 10 s`).toBe(n)
    return {
      liberar: async () => {
        abrir()
        await Promise.all(transacciones)
      },
    }
  }

  const poolCompleto = async (n: number): Promise<boolean> => {
    let dentro = 0
    let abrir: () => void = () => undefined
    const barrera = new Promise<void>((resolver) => {
      abrir = resolver
    })
    const resultados = await Promise.allSettled(
      Array.from({ length: n }, () =>
        obtenerDb().$transaction(
          async (tx) => {
            await tx.$queryRaw`SELECT 1`
            dentro += 1
            if (dentro === n) abrir()
            await Promise.race([barrera, esperar(4_000)])
            return dentro === n
          },
          { maxWait: 4_000, timeout: 10_000 },
        ),
      ),
    )
    return resultados.every((r) => r.status === "fulfilled" && r.value === true)
  }

  it("con el pool lleno, listarPublicaciones y listarComentarios rechazan con AppError 503 SERVICIO_OCUPADO (causa P2028) en menos de 4.5 s; el pool conserva sus 10 conexiones y después responden", async () => {
    const muro = await muroConPublicaciones(1)
    const publicacion = idDe(muro.publicaciones, 0)
    const lecturas: [string, () => Promise<unknown>][] = [
      [
        "listarPublicaciones",
        () =>
          listarPublicaciones({
            claseId: muro.claseId,
            cursor: undefined,
            limite: 1,
            actor: actorAdmin(),
          }),
      ],
      [
        "listarComentarios",
        () =>
          listarComentarios({
            claseId: muro.claseId,
            publicacionId: publicacion,
            cursor: undefined,
            limite: 1,
            actor: actorAdmin(),
          }),
      ],
    ]
    const vistos: Record<string, unknown> = {}
    for (const [nombre, leer] of lecturas) {
      const ocupado = await ocuparPool(CONEXIONES_DEL_POOL)
      const inicio = Date.now()
      const resultado = await capturar(leer())
      const tardo = Date.now() - inicio
      await ocupado.liberar()
      const error = resultado.ok ? undefined : resultado.error
      vistos[nombre] = {
        codigo: error instanceof AppError ? error.codigo : String(error),
        estado: error instanceof AppError ? error.estado : undefined,
        mensaje: error instanceof AppError ? error.message : undefined,
        causa: (error as { cause?: { code?: unknown } } | undefined)?.cause?.code,
        rapido: tardo < 4_500,
      }
      expect(await poolCompleto(CONEXIONES_DEL_POOL), `${nombre}: se perdió una conexión`).toBe(
        true,
      )
      expect((await capturar(leer())).ok, `${nombre}: después responde`).toBe(true)
    }
    const esperado = {
      codigo: "SERVICIO_OCUPADO",
      estado: 503,
      mensaje: MENSAJE_SERVICIO_OCUPADO,
      causa: "P2028",
      rapido: true,
    }
    expect(vistos).toEqual({ listarPublicaciones: esperado, listarComentarios: esperado })
  }, 60_000)
})

describe("ataque FIX-CLASES r2: el ejecutor de una transacción de afuera", () => {
  it("control: dentro de una transacción read committed de afuera manda la de afuera; con el cursor borrado tras comprobarlo, la página queda vacía (la protección queda a cargo de quien abrió la transacción, §D-5)", async () => {
    const muro = await muroConPublicaciones(3)
    const [p0] = muro.publicaciones
    const { gancho, disparado } = unaVezDespuesDe("publicacion.findFirst", async () => {
      await obtenerDb().publicacion.deleteMany({ where: { id: p0 ?? "" } })
    })
    const lista = await enTransaccion(ejecutorConGancho(gancho), (tx) =>
      listarPublicaciones(
        { claseId: muro.claseId, cursor: p0, limite: 10, actor: actorAdmin() },
        tx,
      ),
    )
    expect(disparado(), "el gancho corrió").toBe(true)
    expect(lista.publicaciones).toEqual([])
  }, 30_000)

  it("ningún camino de producción les pasa un ejecutor: solo handlers/clases/muro.ts las llama, con un único argumento", () => {
    const raiz = join(import.meta.dirname, "..", "src")
    const archivos = readdirSync(raiz, { recursive: true, encoding: "utf8" })
      .map((ruta) => ruta.split(sep).join("/"))
      .filter((ruta) => /\.(ts|mts|cts|js|mjs)$/.test(ruta) && !ruta.endsWith(".test.ts"))
      .filter((ruta) => !ruta.startsWith("adapters/db/generated/"))
    const llamadas: string[] = []
    for (const ruta of archivos) {
      if (ruta === "adapters/db/publicaciones.ts") continue
      const texto = readFileSync(join(raiz, ruta), "utf8")
      for (const nombre of ["listarPublicaciones", "listarComentarios"]) {
        let desde = texto.indexOf(`${nombre}(`)
        while (desde !== -1) {
          // Cuenta los argumentos de primer nivel de la llamada (comas fuera de llaves y paréntesis).
          let profundidad = 0
          let argumentos = 1
          let i = desde + nombre.length
          for (; i < texto.length; i += 1) {
            const c = texto[i]
            if (c === "(" || c === "{" || c === "[") profundidad += 1
            else if (c === ")" || c === "}" || c === "]") profundidad -= 1
            else if (c === "," && profundidad === 1) {
              const resto = texto.slice(i + 1).trimStart()
              if (!resto.startsWith(")")) argumentos += 1
            }
            if (profundidad === 0) break
          }
          llamadas.push(`${ruta}:${nombre}:${String(argumentos)}`)
          desde = texto.indexOf(`${nombre}(`, i)
        }
      }
    }
    expect(llamadas.sort()).toEqual([
      "handlers/clases/muro.ts:listarComentarios:1",
      "handlers/clases/muro.ts:listarPublicaciones:1",
    ])
  })
})

describe("ataque FIX-CLASES r2: las lecturas con cursor que quedan fuera (O-4 y conjunto de claves)", () => {
  it("O-4: en backend/src solo se borran inscripciones, asignaciones de maestro, publicaciones y comentarios; nada borra enlaces_registro ni usuarios", () => {
    const raiz = join(import.meta.dirname, "..", "src")
    const borrados = new Set<string>()
    const crudos: string[] = []
    for (const ruta of readdirSync(raiz, { recursive: true, encoding: "utf8" })
      .map((r) => r.split(sep).join("/"))
      .filter((r) => r.endsWith(".ts") && !r.endsWith(".test.ts"))
      .filter((r) => !r.startsWith("adapters/db/generated/"))) {
      const texto = readFileSync(join(raiz, ruta), "utf8")
      for (const m of texto.matchAll(/\.(\w+)\.(delete|deleteMany)\(/g)) borrados.add(m[1] ?? "")
      if (/DELETE\s+FROM|TRUNCATE/i.test(texto)) crudos.push(ruta)
    }
    expect([...borrados].sort()).toEqual([
      "comentario",
      "inscripcion",
      "maestroDeClase",
      "publicacion",
    ])
    expect(crudos).toEqual([])
  })

  it("conjunto de claves: listarAlumnosDeClase y listarPersonas, con el alumno del cursor dado de baja por DELETE real tras leer su clave, traen los que siguen", async () => {
    for (const lectura of ["listarAlumnosDeClase", "listarPersonas"] as const) {
      const maestro = await cuenta("claves", "maestro")
      const clase = await crearClaseDePrueba(idsClases, {
        maestroId: maestro.id,
        nombre: `CK ${ficha()}`,
      })
      const t = ficha()
      const alumnos: UsuarioDePrueba[] = []
      for (const letra of ["a", "b", "c", "d"]) {
        const a = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Zz ${t} ${letra}` })
        await inscribirDePrueba(clase.id, a.id)
        alumnos.push(a)
      }
      const [, b, c, d] = alumnos
      if (b === undefined || c === undefined || d === undefined)
        throw new Error("Precondición: cuatro alumnos")
      const { gancho, disparado } = unaVezDespuesDe(
        "usuario.findUnique",
        borradoPorRuta("baja", () =>
          pedir("DELETE", `/api/clases/${clase.id}/alumnos/${b.id}`, maestro.token),
        ),
      )
      const ejecutor = ejecutorConGancho(gancho)
      const parametros = { claseId: clase.id, cursor: b.id, limite: 10 }
      const ids =
        lectura === "listarAlumnosDeClase"
          ? (await listarAlumnosDeClase(parametros, ejecutor)).alumnos.map((x) => x.id)
          : ((await listarPersonas(parametros, ejecutor))?.alumnos.map((x) => x.id) ?? ["null"])
      expect(disparado(), `${lectura}: el gancho corrió`).toBe(true)
      expect(ids, lectura).toEqual([c.id, d.id])
    }
  }, 60_000)

  it("O-4: listarRegistradosPorEnlace y listarEnlacesRegistro con el enlace revocado por la ruta real en medio (la única operación que existe sobre un enlace): resuelven sin lanzar y sin vaciar la página", async () => {
    const { hash } = generarTokenDeEnlace()
    const { id: enlaceId } = await obtenerDb().enlaceRegistro.create({
      data: { hashToken: hash, expiraEn: new Date(Date.now() + 7 * 86_400_000) },
      select: { id: true },
    })
    idsEnlaces.push(enlaceId)
    const registrados: string[] = []
    for (let i = 0; i < 3; i += 1) {
      const m = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Reg ${ficha()}`, rol: "maestro" })
      await obtenerDb().usuario.update({
        where: { id: m.id },
        data: { enlaceRegistroId: enlaceId, creadoEn: new Date(Date.now() - (3 - i) * 1_000) },
        select: { id: true },
      })
      registrados.push(m.id)
    }
    const revocar = async (): Promise<void> => {
      const r = await pedir("POST", `/api/admin/enlaces-registro/${enlaceId}/revocar`, tokenAdmin)
      expect(r.statusCode, r.body).toBe(200)
    }
    const conRegistrados = unaVezDespuesDe("enlaceRegistro.findUnique", revocar)
    const pagina = await listarRegistradosPorEnlace(
      { enlaceId, cursor: registrados[0], limite: 10 },
      ejecutorConGancho(conRegistrados.gancho),
    )
    expect(conRegistrados.disparado(), "el gancho corrió").toBe(true)
    expect(pagina?.registrados.map((x) => x.id)).toEqual(registrados.slice(1))

    const conEnlaces = unaVezDespuesDe("enlaceRegistro.findMany", async () => {
      await obtenerDb().enlaceRegistro.updateMany({
        where: { id: enlaceId },
        data: { revocadoEn: new Date() },
      })
    })
    const enlaces = await listarEnlacesRegistro(
      { cursor: undefined, limite: 100 },
      ejecutorConGancho(conEnlaces.gancho),
    )
    expect(conEnlaces.disparado(), "el gancho corrió").toBe(true)
    expect(enlaces.enlaces.find((e) => e.id === enlaceId)?.registrados).toBe(3)
  }, 60_000)
})

describe("ataque FIX-CLASES r2: estático de publicaciones.ts", () => {
  it("las dos lecturas del muro usan instantaneaUnica y no escriben; las cuatro escrituras del muro no la usan", () => {
    const texto = readFileSync(
      join(import.meta.dirname, "..", "src", "adapters", "db", "publicaciones.ts"),
      "utf8",
    )
    const cuerpoDe = (nombre: string): string => {
      const inicio = texto.indexOf(`export const ${nombre} =`)
      expect(inicio, `Precondición: ${nombre} existe`).toBeGreaterThanOrEqual(0)
      const siguiente = texto.indexOf("\nexport ", inicio + 1)
      // Sin las líneas de comentario: el comentario que antecede a la función siguiente queda
      // dentro del corte y nombra su FOR SHARE.
      return texto
        .slice(inicio, siguiente === -1 ? undefined : siguiente)
        .split("\n")
        .filter((linea) => !linea.trimStart().startsWith("//"))
        .join("\n")
    }
    const hallazgos: string[] = []
    for (const nombre of ["listarPublicaciones", "listarComentarios"]) {
      const cuerpo = cuerpoDe(nombre)
      if (!cuerpo.includes("instantaneaUnica: true")) hallazgos.push(`${nombre}: sin la opción`)
      const escritura = cuerpo.match(
        /\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\(|\$executeRaw|\$queryRaw|FOR (UPDATE|SHARE|NO KEY)/,
      )
      if (escritura) hallazgos.push(`${nombre}: ${escritura[0]}`)
    }
    for (const nombre of [
      "crearPublicacion",
      "borrarPublicacion",
      "crearComentario",
      "borrarComentario",
    ]) {
      if (cuerpoDe(nombre).includes("instantaneaUnica")) hallazgos.push(`${nombre}: usa la opción`)
    }
    expect(hallazgos).toEqual([])
  })
})
