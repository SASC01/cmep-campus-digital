import { readFileSync } from "node:fs"
import { join } from "node:path"

import { listaTrabajoRespuestaSchema, tareaRespuestaSchema } from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb, type Ejecutor } from "../src/adapters/db/cliente.js"
import { listarPublicaciones } from "../src/adapters/db/publicaciones.js"
import { leerTarea, listarTrabajo } from "../src/adapters/db/tareas.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { AppError } from "../src/core/errores.js"
import { crearAlmacenEnMemoria, type AlmacenEnMemoria } from "./almacen-en-memoria.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"
import {
  crearMaterialConTemaDePrueba,
  crearTareaDePrueba,
  crearTemaDePrueba,
  cuerpoDeTarea,
} from "./ayudas-tareas.js"

// Ataque del Tester, TAREAS-01b, ronda 1: "Puntos de ataque para el Tester" → 01b, punto 7
// (instantánea única, Enmienda 2, §D-12). Un doble del ejecutor de Prisma corre una acción real (por
// la API) después de una sentencia concreta de la lectura; la lectura debe responder con un solo
// momento. Además, el pool lleno y la revisión estática de tareas.ts.

const almacen: AlmacenEnMemoria = crearAlmacenEnMemoria()
let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
const CONEXIONES_DEL_POOL = 10

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

interface Escenario {
  claseId: string
  maestroA: UsuarioDePrueba
  maestroB: UsuarioDePrueba
  tokenA: string
  tokenB: string
  tokenAlumno: string
}

const escenario = async (): Promise<Escenario> => {
  const maestroA = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Maestra A" })
  const maestroB = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Maestro B" })
  const alumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumna" })
  const clase = await crearClaseDePrueba(idsClases, {
    maestroId: maestroA.id,
    maestroIds: [maestroA.id, maestroB.id],
  })
  await inscribirDePrueba(clase.id, alumno.id, "codigo")
  return {
    claseId: clase.id,
    maestroA,
    maestroB,
    tokenA: await firmarTokenDePrueba({ usuarioId: maestroA.id }),
    tokenB: await firmarTokenDePrueba({ usuarioId: maestroB.id }),
    tokenAlumno: await firmarTokenDePrueba({ usuarioId: alumno.id }),
  }
}

const peticion = (opciones: {
  method: "GET" | "POST" | "PUT" | "DELETE"
  url: string
  token: string
  payload?: InjectOptions["payload"]
}): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method: opciones.method,
    url: opciones.url,
    ...(opciones.payload === undefined ? {} : { payload: opciones.payload }),
    headers: {
      authorization: `Bearer ${opciones.token}`,
      ...(opciones.payload === undefined ? {} : { "content-type": "application/json" }),
    },
  })

const urlTarea = (claseId: string, tareaId: string): string =>
  `/api/clases/${claseId}/tareas/${tareaId}`

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

// ---------------------------------------------------------------------------------------------
// Doble del ejecutor de Prisma (reescrito aquí: nunca se importa de otra *.ataque). Después de cada
// llamada a un modelo (`modelo.metodo`), dentro o fuera de la transacción, llama al gancho.

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
): { ejecutor: Ejecutor; disparado: () => boolean } => {
  let disparado = false
  const gancho: Gancho = async (hecha) => {
    if (disparado || hecha !== llamada) return
    disparado = true
    await accion()
  }
  return { ejecutor: conGancho(obtenerDb(), gancho), disparado: () => disparado }
}

// Una acción por la API que debe salir bien (si no, la precondición del ataque falla).
const porLaApi = async (pendiente: Promise<LightMyRequestResponse>, estado: number) => {
  const r = await pendiente
  expect(r.statusCode, `Precondición: la acción en medio respondió ${r.body}`).toBe(estado)
}

const tareaConAdjuntoYRubrica = async (e: Escenario) => {
  const archivo = await crearArchivoDePrueba({ claseId: e.claseId, subidoPor: e.maestroA.id })
  almacen.subir(archivo.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
  const r = await peticion({
    method: "POST",
    url: `/api/clases/${e.claseId}/tareas`,
    token: e.tokenA,
    payload: cuerpoDeTarea({
      titulo: "Original",
      archivoIds: [archivo.id],
      rubrica: [
        { criterio: "Original 1", puntosMax: 5 },
        { criterio: "Original 2", puntosMax: 5 },
      ],
    }),
  })
  expect(r.statusCode, r.body).toBe(201)
  return { tareaId: tareaRespuestaSchema.parse(r.json()).tarea.id, archivoId: archivo.id }
}

describe("ataque TAREAS-01b r1: leerTarea en una sola instantánea (punto 7)", () => {
  it.each(["tarea.findFirst", "archivo.findMany", "maestroDeClase.findMany"])(
    "con la tarea borrada por DELETE …/tareas/:tareaId después de %s: la tarea completa de ese momento (título, autor, rúbrica, adjunto y banderas del autor)",
    async (llamada) => {
      const e = await escenario()
      const { tareaId, archivoId } = await tareaConAdjuntoYRubrica(e)
      const { ejecutor, disparado } = unaVezDespuesDe(llamada, () =>
        porLaApi(
          peticion({ method: "DELETE", url: urlTarea(e.claseId, tareaId), token: e.tokenA }),
          204,
        ),
      )
      const tarea = await leerTarea(
        { claseId: e.claseId, tareaId, actor: { id: e.maestroA.id, rol: "maestro" } },
        ejecutor,
      )
      expect(disparado(), "el gancho corrió").toBe(true)
      expect(tarea).not.toBeNull()
      expect({
        titulo: tarea?.titulo,
        autor: tarea?.autor.id,
        rubrica: tarea?.rubrica.map(({ criterio }) => criterio),
        adjuntos: tarea?.adjuntos.map(({ id }) => id),
        banderas: [tarea?.puedeEditar, tarea?.puedeBorrar],
      }).toEqual({
        titulo: "Original",
        autor: e.maestroA.id,
        rubrica: ["Original 1", "Original 2"],
        adjuntos: [archivoId],
        banderas: [true, true],
      })
    },
  )

  // ENTREGAS-01a ronda 0 (C-6, §D-R0 «01a»; §D-2.1 y P-05 a′ del plan de ENTREGAS-01): el PUT de
  // una tarea exige la `version` con que se leyó; la tarea recién creada por la API está en la 0.
  // Lo que verifica el caso (la lectura entera de antes de la edición) no cambia.
  it("con una edición en medio que cambia el título, reemplaza la rúbrica y quita el adjunto: la tarea de antes, entera (nunca la rúbrica de antes con los adjuntos de después)", async () => {
    const e = await escenario()
    const { tareaId, archivoId } = await tareaConAdjuntoYRubrica(e)
    const { ejecutor, disparado } = unaVezDespuesDe("tarea.findFirst", () =>
      porLaApi(
        peticion({
          method: "PUT",
          url: urlTarea(e.claseId, tareaId),
          token: e.tokenA,
          payload: cuerpoDeTarea({
            titulo: "Editada",
            archivoIds: [],
            rubrica: [{ criterio: "Nueva", puntosMax: 10 }],
            version: 0,
          }),
        }),
        200,
      ),
    )
    const tarea = await leerTarea(
      { claseId: e.claseId, tareaId, actor: { id: e.maestroA.id, rol: "maestro" } },
      ejecutor,
    )
    expect(disparado()).toBe(true)
    expect([
      tarea?.titulo,
      tarea?.rubrica.map(({ criterio }) => criterio),
      tarea?.adjuntos.map(({ id }) => id),
    ]).toEqual(["Original", ["Original 1", "Original 2"], [archivoId]])
  })

  it("con el autor retirado de la clase después de leer los adjuntos: las banderas del otro maestro salen de la misma instantánea (false, false)", async () => {
    const e = await escenario()
    const { tareaId } = await tareaConAdjuntoYRubrica(e)
    const { ejecutor, disparado } = unaVezDespuesDe("archivo.findMany", async () => {
      await obtenerDb().maestroDeClase.delete({
        where: { claseId_maestroId: { claseId: e.claseId, maestroId: e.maestroA.id } },
      })
    })
    const tarea = await leerTarea(
      { claseId: e.claseId, tareaId, actor: { id: e.maestroB.id, rol: "maestro" } },
      ejecutor,
    )
    expect(disparado()).toBe(true)
    expect([tarea?.puedeEditar, tarea?.puedeBorrar]).toEqual([false, false])
  })
})

describe("ataque TAREAS-01b r1: listarTrabajo, frontera cursor→página (punto 7)", () => {
  // Cuatro elementos en el tema, del más reciente al más antiguo: e1 material, e2 (material o
  // tarea), e3 material, e4 tarea. El cursor es e2; después de comprobarlo, una acción real lo saca.
  const tema4 = async (e: Escenario, e2EsTarea: boolean) => {
    const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad" })
    const otro = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Otra", orden: 1 })
    const hace = (min: number) => new Date(Date.now() - min * 60_000)
    const conFecha = async (id: string, min: number) => {
      await obtenerDb().publicacion.update({ where: { id }, data: { creadoEn: hace(min) } })
      return id
    }
    const material = (min: number) =>
      crearMaterialConTemaDePrueba({
        claseId: e.claseId,
        autorId: e.maestroA.id,
        temaId: tema.id,
        creadoEn: hace(min),
      })
    const tarea = async (min: number) =>
      conFecha(
        await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestroA.id, temaId: tema.id }),
        min,
      )
    const e1 = await material(1)
    const e2 = e2EsTarea ? await tarea(2) : await material(2)
    const e3 = await material(3)
    const e4 = await tarea(4)
    return { temaId: tema.id, otroTemaId: otro.id, e1, e2, e3, e4 }
  }

  const casos: [
    string,
    boolean,
    (e: Escenario, t: Awaited<ReturnType<typeof tema4>>) => Promise<void>,
  ][] = [
    [
      "el material del cursor borrado por la ruta del muro",
      false,
      (e, t) =>
        porLaApi(
          peticion({
            method: "DELETE",
            url: `/api/clases/${e.claseId}/publicaciones/${t.e2}`,
            token: e.tokenA,
          }),
          204,
        ),
    ],
    [
      "la tarea del cursor borrada por DELETE …/tareas/:tareaId",
      true,
      (e, t) =>
        porLaApi(
          peticion({ method: "DELETE", url: urlTarea(e.claseId, t.e2), token: e.tokenA }),
          204,
        ),
    ],
    [
      "el elemento del cursor movido a otro tema",
      false,
      (e, t) =>
        porLaApi(
          peticion({
            method: "PUT",
            url: `/api/clases/${e.claseId}/publicaciones/${t.e2}/tema`,
            token: e.tokenB,
            payload: { temaId: t.otroTemaId },
          }),
          200,
        ),
    ],
    [
      "el cursor borrado y, a la vez, una tarea de la página movida a «Sin tema» y otra fila de la página borrada",
      false,
      async (e, t) => {
        await porLaApi(
          peticion({
            method: "DELETE",
            url: `/api/clases/${e.claseId}/publicaciones/${t.e2}`,
            token: e.tokenA,
          }),
          204,
        )
        await porLaApi(
          peticion({
            method: "PUT",
            url: `/api/clases/${e.claseId}/publicaciones/${t.e4}/tema`,
            token: e.tokenA,
            payload: { temaId: null },
          }),
          200,
        )
        await porLaApi(
          peticion({
            method: "DELETE",
            url: `/api/clases/${e.claseId}/publicaciones/${t.e3}`,
            token: e.tokenA,
          }),
          204,
        )
      },
    ],
  ]

  it.each(casos)(
    "con %s entre la comprobación del cursor y la página: la página de ese momento (e3 y e4, con el resumen de la tarea), nunca vacía",
    async (_etiqueta, e2EsTarea, accion) => {
      const e = await escenario()
      const t = await tema4(e, e2EsTarea)
      const { ejecutor, disparado } = unaVezDespuesDe("publicacion.findFirst", () => accion(e, t))
      const lista = await listarTrabajo(
        { claseId: e.claseId, tema: t.temaId, cursor: t.e2, limite: 10 },
        ejecutor,
      )
      expect(disparado(), "el gancho corrió después de comprobar el cursor").toBe(true)
      expect(lista.elementos.map(({ id }) => id)).toEqual([t.e3, t.e4])
      expect(lista.elementos[1]?.tarea).not.toBeNull()
    },
  )
})

describe("ataque TAREAS-01b r1: el muro con tareas en su instantánea (punto 7)", () => {
  it("con la tarea borrada y su autor retirado justo después de la página: la tarea sale con su resumen y puedeBorrar del otro maestro sale de ese momento (false)", async () => {
    const e = await escenario()
    const tareaId = await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestroA.id })
    const { ejecutor, disparado } = unaVezDespuesDe("publicacion.findMany", async () => {
      await porLaApi(
        peticion({ method: "DELETE", url: urlTarea(e.claseId, tareaId), token: e.tokenA }),
        204,
      )
      await obtenerDb().maestroDeClase.delete({
        where: { claseId_maestroId: { claseId: e.claseId, maestroId: e.maestroA.id } },
      })
    })
    const lista = await listarPublicaciones(
      {
        claseId: e.claseId,
        cursor: undefined,
        limite: 10,
        actor: { id: e.maestroB.id, rol: "maestro" },
      },
      ejecutor,
    )
    expect(disparado()).toBe(true)
    const tarea = lista.publicaciones.find(({ id }) => id === tareaId)
    expect(tarea?.tipo).toBe("tarea")
    expect(tarea?.tarea).not.toBeNull()
    expect(tarea?.puedeBorrar).toBe(false)
  })
})

describe("ataque TAREAS-01b r1: pool lleno (punto 7)", () => {
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

  it(
    "leerTarea y listarTrabajo con las 10 conexiones ocupadas rechazan con AppError 503 SERVICIO_OCUPADO (nunca otro error) y, liberadas, responden",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad" })
      const tareaId = await crearTareaDePrueba({
        claseId: e.claseId,
        autorId: e.maestroA.id,
        temaId: tema.id,
      })
      const actor = { id: e.maestroA.id, rol: "maestro" } as const
      const ocupado = await ocuparPool(CONEXIONES_DEL_POOL)
      const resultados = await Promise.allSettled([
        leerTarea({ claseId: e.claseId, tareaId, actor }),
        listarTrabajo({ claseId: e.claseId, tema: tema.id, cursor: undefined, limite: 10 }),
      ])
      await ocupado.liberar()
      for (const resultado of resultados) {
        expect(resultado.status).toBe("rejected")
        if (resultado.status !== "rejected") continue
        const error: unknown = resultado.reason
        expect(error).toBeInstanceOf(AppError)
        expect([(error as AppError).codigo, (error as AppError).estado]).toEqual([
          "SERVICIO_OCUPADO",
          503,
        ])
      }
      expect((await leerTarea({ claseId: e.claseId, tareaId, actor }))?.id).toBe(tareaId)
      const lista = await listarTrabajo({
        claseId: e.claseId,
        tema: tema.id,
        cursor: undefined,
        limite: 10,
      })
      expect(lista.elementos.map(({ id }) => id)).toEqual([tareaId])
    },
  )

  it(
    "GET …/tareas/:tareaId y GET …/trabajo lanzadas con el pool lleno y liberado a los 2.5 s: 200 o 503, nunca 500",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const tareaId = await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestroA.id })
      const ocupado = await ocuparPool(CONEXIONES_DEL_POOL)
      const pendientes = [
        peticion({ method: "GET", url: urlTarea(e.claseId, tareaId), token: e.tokenAlumno }),
        peticion({
          method: "GET",
          url: `/api/clases/${e.claseId}/trabajo?tema=sin-tema`,
          token: e.tokenAlumno,
        }),
      ]
      await esperar(2_500)
      await ocupado.liberar()
      const [detalle, trabajo] = await Promise.all(pendientes)
      expect([200, 503]).toContain(detalle?.statusCode)
      expect([200, 503]).toContain(trabajo?.statusCode)
      if (detalle?.statusCode === 200) tareaRespuestaSchema.parse(detalle.json())
      if (trabajo?.statusCode === 200) listaTrabajoRespuestaSchema.parse(trabajo.json())
    },
  )
})

describe("ataque TAREAS-01b r1: revisión estática de tareas.ts (punto 7)", () => {
  it("las tres escrituras no usan la opción; las dos lecturas no escriben, no bloquean ni usan SQL crudo; la opción está exactamente en leerTarea y listarTrabajo", () => {
    const texto = readFileSync(
      join(import.meta.dirname, "..", "src", "adapters", "db", "tareas.ts"),
      "utf8",
    )
    const cuerpoDe = (inicioDe: string): string => {
      const inicio = texto.indexOf(inicioDe)
      expect(inicio, `Precondición: ${inicioDe} existe`).toBeGreaterThanOrEqual(0)
      const siguiente = texto.slice(inicio + 1).search(/\n(export )?const /)
      return texto
        .slice(inicio, siguiente === -1 ? undefined : inicio + 1 + siguiente)
        .split("\n")
        .filter((linea) => !linea.trimStart().startsWith("//"))
        .join("\n")
    }
    const hallazgos: string[] = []
    for (const nombre of ["crearTarea", "editarTarea", "borrarTarea"]) {
      if (cuerpoDe(`export const ${nombre} =`).includes("instantaneaUnica")) {
        hallazgos.push(`${nombre}: usa la opción`)
      }
    }
    for (const nombre of ["leerTareaCon", "listarTrabajoCon"]) {
      const escritura = cuerpoDe(`const ${nombre} =`).match(
        /\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\(|\$executeRaw|\$queryRaw|FOR (UPDATE|SHARE|NO KEY|KEY)/,
      )
      if (escritura) hallazgos.push(`${nombre}: ${escritura[0]}`)
    }
    for (const nombre of ["leerTarea", "listarTrabajo"]) {
      if (!cuerpoDe(`export const ${nombre} =`).includes("instantaneaUnica: true")) {
        hallazgos.push(`${nombre}: sin la opción`)
      }
    }
    expect(hallazgos).toEqual([])
  })
})
