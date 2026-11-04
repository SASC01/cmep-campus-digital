import { randomUUID } from "node:crypto"

import {
  errorApiSchema,
  exportacionDeCalificacionesRespuestaSchema,
  type ExportacionDeCalificacionesRespuesta,
} from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { MENSAJE_SERVICIO_OCUPADO } from "../src/adapters/db/errores.js"
import { leerExportacionDeCalificaciones } from "../src/adapters/db/index.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { AppError } from "../src/core/errores.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba, type UsuarioDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  crearPublicacionDePrueba,
  idDelAdminDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { crearEntregaDePrueba } from "./ayudas-entregas.js"
import { ejecutorEspiado, unaVezDespuesDe } from "./ayudas-gradebook.js"
import { crearTareaDePrueba } from "./ayudas-tareas.js"

// Ataque del Tester, CALIFICACIONES-02a, ronda 1 (plan, "Puntos de ataque para el Tester" → 02a):
// lo que las pruebas requeridas no recorren. El 503 por P2028 en la exportación (adaptador y ruta),
// la instantánea sobre la cuarta sentencia (los correos), cursores de usuarios que existen pero no
// son alumnos de la clase, bordes de la consulta, `claseId` en mayúsculas, el maestro retirado entre
// dos ventanas y una clase de 101 × 101 que obliga a recorrer cuatro ventanas de 100.
// La app registra en nivel "error": los P2028 provocados a propósito (warn) no entran en el conteo de
// PA-07, y un 500 sí saldría ("Error no controlado" es nivel error). Las fechas límite son fijas.

const CONEXIONES_DEL_POOL = 10
const FECHA_BASE = Date.parse("2026-12-01T12:00:00.000Z")
const MINUTO_MS = 60_000

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))
const ficha = (): string => randomUUID().slice(0, 8)

const FUGA =
  /estadoPago|fechaEstadoPago|accesoRestringido|motivoRestriccion|"rol"|"version"|"activo"|hash|deudor|Deudor/

const urlDe = (claseId: string, consulta = ""): string =>
  `/api/clases/${claseId}/calificaciones/exportacion${consulta}`

const pedir = (
  token: string | null,
  url: string,
  metodo: "GET" | "HEAD" = "GET",
): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method: metodo,
    url,
    headers: token === null ? {} : { authorization: `Bearer ${token}` },
  })

const exportacionDe = (r: LightMyRequestResponse): ExportacionDeCalificacionesRespuesta => {
  expect(r.statusCode, r.body).toBe(200)
  expect(r.body, "fuga de P-13").not.toMatch(FUGA)
  return exportacionDeCalificacionesRespuestaSchema.parse(r.json())
}

const errorDe = (r: LightMyRequestResponse): string => {
  expect(r.body, "fuga de P-13 en un error").not.toMatch(FUGA)
  const { codigo, mensaje } = errorApiSchema.parse(r.json()).error
  return `${String(r.statusCode)} ${codigo} ${mensaje}`
}

const capturar = async <T>(
  promesa: Promise<T>,
): Promise<{ ok: true; valor: T } | { ok: false; error: unknown }> => {
  try {
    return { ok: true, valor: await promesa }
  } catch (error) {
    return { ok: false, error }
  }
}

const describirError = (error: unknown) => ({
  esAppError: error instanceof AppError,
  codigo: error instanceof AppError ? error.codigo : String(error),
  estado: error instanceof AppError ? error.estado : undefined,
  mensaje: error instanceof AppError ? error.message : undefined,
  causa: (error as { cause?: { code?: unknown } } | undefined)?.cause?.code,
})

const ESPERADO_503 = {
  esAppError: true,
  codigo: "SERVICIO_OCUPADO",
  estado: 503,
  mensaje: MENSAJE_SERVICIO_OCUPADO,
  causa: "P2028",
}

// Toma las n conexiones del pool de este archivo con transacciones que esperan una compuerta.
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
  expect(dentro, `Precondición: las ${String(n)} transacciones abrieron en 10 s`).toBe(n)
  const terminadas = Promise.all(transacciones)
  return {
    liberar: async () => {
      abrir()
      await terminadas
    },
  }
}

beforeAll(async () => {
  app = await construirApp({
    env: { ...cargarEnv(), LOG_LEVEL: "error" },
    almacen: crearAlmacenEnMemoria(),
  })
  await app.ready()
}, 30_000)

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

interface Escenario {
  claseId: string
  maestro: UsuarioDePrueba
  comaestro: UsuarioDePrueba
  alumnos: UsuarioDePrueba[]
  tokens: { maestro: string; comaestro: string; admin: string }
}

// Una clase con dos maestros, una tarea calificada y tres alumnos con nombres que se ordenan
// "ana" < "carlos" < "elena" (los de fuera se intercalan entre ellos).
const escenario = async (f: string): Promise<Escenario> => {
  const maestro = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Maestra ${f}`, rol: "maestro" })
  const comaestro = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Comaestro ${f}`,
    rol: "maestro",
  })
  const clase = await crearClaseDePrueba(idsClases, {
    maestroId: maestro.id,
    maestroIds: [maestro.id, comaestro.id],
    nombre: `Exporta ${f}`,
  })
  const alumnos: UsuarioDePrueba[] = []
  for (const nombre of ["Ana", "Carlos", "Elena"]) {
    const a = await crearAlumnoDePrueba(idsUsuarios, { nombre: `${nombre} ${f}` })
    await inscribirDePrueba(clase.id, a.id)
    alumnos.push(a)
  }
  const tareaId = await crearTareaDePrueba({
    claseId: clase.id,
    autorId: maestro.id,
    puntos: 10,
    fechaLimite: new Date(FECHA_BASE),
  })
  const [ana] = alumnos
  if (ana === undefined) throw new Error("Precondición: tres alumnos")
  await crearEntregaDePrueba({ tareaId, alumnoId: ana.id, estado: "calificado", calificacion: 7 })
  return {
    claseId: clase.id,
    maestro,
    comaestro,
    alumnos,
    tokens: {
      maestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
      comaestro: await firmarTokenDePrueba({ usuarioId: comaestro.id }),
      admin: await tokenDelAdminDePrueba(),
    },
  }
}

describe("ataque CALIFICACIONES-02a r1: 503 SERVICIO_OCUPADO por P2028 en la exportación", () => {
  it("CAL2-T-01: con el pool lleno, leerExportacionDeCalificaciones rechaza con AppError 503 SERVICIO_OCUPADO (causa P2028) en menos de 4.5 s y, al soltarlo, responde", async () => {
    const e = await escenario(ficha())
    const parametros = {
      claseId: e.claseId,
      cursor: undefined,
      limite: 100,
      cursorTareas: undefined,
      limiteTareas: 100,
      ahora: new Date(FECHA_BASE),
    }
    const ocupado = await ocuparPool(CONEXIONES_DEL_POOL)
    const inicio = Date.now()
    const resultado = await capturar(leerExportacionDeCalificaciones(parametros))
    const tardo = Date.now() - inicio
    await ocupado.liberar()
    expect(resultado.ok, "con el pool lleno no debía resolver").toBe(false)
    expect(resultado.ok ? undefined : describirError(resultado.error)).toEqual(ESPERADO_503)
    expect(tardo, "rechaza por maxWait, sin colgarse").toBeLessThan(4_500)
    const despues = await leerExportacionDeCalificaciones(parametros)
    expect(despues.totalAlumnos).toBe(3)
  }, 60_000)

  it("CAL2-T-02: una lectura que pasa el timeout de su transacción entre dos sentencias rechaza con AppError 503 SERVICIO_OCUPADO (causa P2028), nunca con un 500 ni con una respuesta a medias", async () => {
    const e = await escenario(ficha())
    const { gancho, disparado } = unaVezDespuesDe("clase.findUnique", () => esperar(5_500))
    const { ejecutor } = ejecutorEspiado(gancho)
    const resultado = await capturar(
      leerExportacionDeCalificaciones(
        {
          claseId: e.claseId,
          cursor: undefined,
          limite: 100,
          cursorTareas: undefined,
          limiteTareas: 100,
          ahora: new Date(FECHA_BASE),
        },
        ejecutor,
      ),
    )
    expect(disparado(), "el gancho corrió").toBe(true)
    expect(resultado.ok, "la transacción vencida no debía resolver").toBe(false)
    expect(resultado.ok ? undefined : describirError(resultado.error)).toEqual(ESPERADO_503)
  }, 30_000)

  it("CAL2-T-03: GET y HEAD de la exportación lanzados con el pool lleno y liberados a los 2.5 s responden 200 o 503 SERVICIO_OCUPADO, nunca 500", async () => {
    const e = await escenario(ficha())
    for (const metodo of ["GET", "HEAD"] as const) {
      const ocupado = await ocuparPool(CONEXIONES_DEL_POOL)
      const pendiente = pedir(e.tokens.maestro, urlDe(e.claseId), metodo)
      await esperar(2_500)
      await ocupado.liberar()
      const r = await pendiente
      expect([200, 503], `${metodo}: ${String(r.statusCode)} ${r.body}`).toContain(r.statusCode)
      if (metodo === "GET" && r.statusCode === 200) exportacionDe(r)
      if (metodo === "GET" && r.statusCode === 503) {
        expect(errorDe(r)).toBe(`503 SERVICIO_OCUPADO ${MENSAJE_SERVICIO_OCUPADO}`)
      }
    }
  }, 60_000)
})

describe("ataque CALIFICACIONES-02a r1: la instantánea cubre los correos", () => {
  it("CAL2-T-04: un correo cambiado y una cuenta desactivada por otra conexión después de leer la página no cambian esa respuesta (correo viejo, sin 500); la siguiente lectura ve el correo nuevo y ya no trae a la desactivada", async () => {
    const e = await escenario(ficha())
    const [ana, carlos] = e.alumnos
    if (ana === undefined || carlos === undefined) throw new Error("Precondición: alumnos")
    const correoNuevo = `nuevo-${ficha()}@pruebas.local`
    const { gancho, disparado } = unaVezDespuesDe("inscripcion.count", async () => {
      await obtenerDb().usuario.update({
        where: { id: ana.id },
        data: { email: correoNuevo },
        select: { id: true },
      })
      await obtenerDb().usuario.update({
        where: { id: carlos.id },
        data: { activo: false },
        select: { id: true },
      })
    })
    const { ejecutor, llamadas } = ejecutorEspiado(gancho)
    const parametros = {
      claseId: e.claseId,
      cursor: undefined,
      limite: 100,
      cursorTareas: undefined,
      limiteTareas: 100,
      ahora: new Date(FECHA_BASE),
    }
    const enCurso = await leerExportacionDeCalificaciones(parametros, ejecutor)
    expect(disparado(), "el gancho corrió").toBe(true)
    expect(llamadas.indexOf("inscripcion.count")).toBeLessThan(llamadas.indexOf("usuario.findMany"))
    expect(enCurso.alumnos.map((f) => [f.alumno.id, f.alumno.email])).toEqual(
      e.alumnos.map((a) => [a.id, a.email]),
    )
    expect(enCurso.totalAlumnos).toBe(3)
    const siguiente = await leerExportacionDeCalificaciones(parametros)
    expect(siguiente.alumnos.map((f) => f.alumno.email)).toEqual([correoNuevo, e.alumnos[2]?.email])
    expect(siguiente.totalAlumnos).toBe(2)
  }, 30_000)
})

describe("ataque CALIFICACIONES-02a r1: cursores, consulta y ruta", () => {
  it("CAL2-T-05: un cursor de alguien que existe pero no es alumno de la clase (alumno de otra clase, la maestra, el comaestro, el admin) responde 200 solo con alumnos de la clase, en su orden y desde la clave del cursor, sin correos de maestros ni del admin", async () => {
    const f = ficha()
    const e = await escenario(f)
    const otro = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Beto ${f}` })
    const otraClase = await crearClaseDePrueba(idsClases, { maestroId: e.maestro.id })
    await inscribirDePrueba(otraClase.id, otro.id)
    const [ana, carlos, elena] = e.alumnos
    if (ana === undefined || carlos === undefined || elena === undefined)
      throw new Error("Precondición: alumnos")
    const idAdmin = await idDelAdminDePrueba()
    const deLaClase = new Set(e.alumnos.map((a) => a.id))
    const vistos: Record<string, unknown> = {}
    for (const [nombre, cursor] of [
      ["alumno de otra clase", otro.id],
      ["maestra", e.maestro.id],
      ["comaestro", e.comaestro.id],
      ["admin", idAdmin],
    ] as const) {
      const r = await pedir(e.tokens.maestro, urlDe(e.claseId, `?cursor=${cursor}`))
      const cuerpo = exportacionDe(r)
      expect(r.body).not.toContain(e.maestro.email)
      expect(r.body).not.toContain(e.comaestro.email)
      expect(r.body).not.toContain(otro.email)
      expect(
        cuerpo.alumnos.filter((fila) => !deLaClase.has(fila.alumno.id)).map((x) => x.alumno.id),
        nombre,
      ).toEqual([])
      expect(cuerpo.totalAlumnos, nombre).toBe(3)
      vistos[nombre] = cuerpo.alumnos.map((fila) => fila.alumno.id)
    }
    // "beto" va entre "ana" y "carlos": la página sigue desde "carlos".
    expect(vistos["alumno de otra clase"]).toEqual([carlos.id, elena.id])
  }, 30_000)

  it("CAL2-T-06: bordes de la consulta: 100.5, -1, Infinity, repetidos, vacío y 101 en las dos dimensiones, un cursor que es una tarea, un cursorTareas que es un material o un usuario, y un cursor que no es uuid responden 400 VALIDACION (HEAD sin cuerpo); un campo extra no cambia la respuesta", async () => {
    const e = await escenario(ficha())
    const materialId = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      tipo: "material",
    })
    const [{ id: tareaId } = { id: "" }] = await obtenerDb().tarea.findMany({
      where: { claseId: e.claseId },
      select: { id: true },
    })
    expect(tareaId, "Precondición: la clase tiene una tarea").not.toBe("")
    const malas = [
      "?limite=100.5",
      "?limite=-1",
      "?limite=Infinity",
      "?limite=1&limite=2",
      "?limite=",
      "?limite=101",
      "?limiteTareas=100.5",
      "?limiteTareas=-1",
      "?limiteTareas=Infinity",
      "?limiteTareas=1&limiteTareas=2",
      "?limiteTareas=",
      "?limiteTareas=101",
      `?cursor=${tareaId}`,
      `?cursorTareas=${materialId}`,
      `?cursorTareas=${e.maestro.id}`,
      "?cursor=no-es-uuid",
      "?cursorTareas=no-es-uuid",
    ]
    const vistos: Record<string, string> = {}
    for (const consulta of malas) {
      const r = await pedir(e.tokens.maestro, urlDe(e.claseId, consulta))
      vistos[consulta] = `${String(r.statusCode)} ${errorApiSchema.parse(r.json()).error.codigo}`
      const h = await pedir(e.tokens.maestro, urlDe(e.claseId, consulta), "HEAD")
      expect([h.statusCode, h.body], `HEAD ${consulta}`).toEqual([400, ""])
    }
    expect(vistos).toEqual(Object.fromEntries(malas.map((c) => [c, "400 VALIDACION"])))
    const base = exportacionDe(await pedir(e.tokens.maestro, urlDe(e.claseId)))
    const conExtra = exportacionDe(
      await pedir(e.tokens.maestro, urlDe(e.claseId, "?estadoPago=deudor&rol=admin&limite=100")),
    )
    expect(conExtra).toEqual(base)
  }, 60_000)

  it("CAL2-T-07: el claseId en mayúsculas responde lo mismo que en minúsculas, para el maestro y para el admin, en GET y en HEAD", async () => {
    const e = await escenario(ficha())
    for (const token of [e.tokens.maestro, e.tokens.admin]) {
      const minusculas = await pedir(token, urlDe(e.claseId))
      const mayusculas = await pedir(token, urlDe(e.claseId.toUpperCase()))
      expect(exportacionDe(mayusculas)).toEqual(exportacionDe(minusculas))
      const head = await pedir(token, urlDe(e.claseId.toUpperCase()), "HEAD")
      expect([head.statusCode, head.body]).toEqual([200, ""])
    }
  })

  it("CAL2-T-08: el comaestro retirado entre dos ventanas recibe 403 SIN_ACCESO_A_LA_CLASE en la segunda (GET y HEAD), sin datos; una maestra desactivada recibe 401", async () => {
    const e = await escenario(ficha())
    const primera = exportacionDe(await pedir(e.tokens.comaestro, urlDe(e.claseId, "?limite=1")))
    expect(primera.siguienteCursor, "Precondición: hay una segunda ventana").not.toBeNull()
    await obtenerDb().maestroDeClase.deleteMany({
      where: { claseId: e.claseId, maestroId: e.comaestro.id },
    })
    const segunda = await pedir(
      e.tokens.comaestro,
      urlDe(e.claseId, `?limite=1&cursor=${String(primera.siguienteCursor)}`),
    )
    expect(errorDe(segunda)).toMatch(/^403 SIN_ACCESO_A_LA_CLASE /)
    for (const a of e.alumnos) expect(segunda.body).not.toContain(a.email)
    const head = await pedir(e.tokens.comaestro, urlDe(e.claseId), "HEAD")
    expect([head.statusCode, head.body]).toEqual([403, ""])
    await obtenerDb().usuario.update({
      where: { id: e.maestro.id },
      data: { activo: false },
      select: { id: true },
    })
    const desactivada = await pedir(e.tokens.maestro, urlDe(e.claseId))
    expect(desactivada.statusCode, desactivada.body).toBe(401)
    for (const a of e.alumnos) expect(desactivada.body).not.toContain(a.email)
  })

  it("CAL2-T-10: la autorización va antes que la consulta: con límites y cursores inválidos, el maestro ajeno y una clase inexistente responden 403 SIN_ACCESO_A_LA_CLASE y el alumno inscrito 403 ROL_NO_PERMITIDO, nunca 400", async () => {
    const f = ficha()
    const e = await escenario(f)
    const ajeno = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Ajeno ${f}`, rol: "maestro" })
    await crearClaseDePrueba(idsClases, { maestroId: ajeno.id })
    const [ana] = e.alumnos
    if (ana === undefined) throw new Error("Precondición: alumnos")
    const tokenAjeno = await firmarTokenDePrueba({ usuarioId: ajeno.id })
    const tokenAlumna = await firmarTokenDePrueba({ usuarioId: ana.id })
    const consulta = "?limite=0&limiteTareas=abc&cursor=no-es-uuid&cursorTareas=x"
    const vistos = {
      ajeno: errorDe(await pedir(tokenAjeno, urlDe(e.claseId, consulta))),
      alumna: errorDe(await pedir(tokenAlumna, urlDe(e.claseId, consulta))),
      inexistenteMaestro: errorDe(await pedir(e.tokens.maestro, urlDe(randomUUID(), consulta))),
      inexistenteAdmin: errorDe(await pedir(e.tokens.admin, urlDe(randomUUID(), consulta))),
    }
    expect({
      ajeno: vistos.ajeno.split(" ").slice(0, 2).join(" "),
      alumna: vistos.alumna.split(" ").slice(0, 2).join(" "),
      inexistenteMaestro: vistos.inexistenteMaestro.split(" ").slice(0, 2).join(" "),
      inexistenteAdmin: vistos.inexistenteAdmin.split(" ").slice(0, 2).join(" "),
    }).toEqual({
      ajeno: "403 SIN_ACCESO_A_LA_CLASE",
      alumna: "403 ROL_NO_PERMITIDO",
      inexistenteMaestro: "403 SIN_ACCESO_A_LA_CLASE",
      inexistenteAdmin: "403 SIN_ACCESO_A_LA_CLASE",
    })
    expect(vistos.ajeno).toBe(vistos.inexistenteMaestro)
  })
})

describe("ataque CALIFICACIONES-02a r1: una clase de 101 alumnos y 101 tareas", () => {
  it("CAL2-T-09: con los límites por omisión, la primera respuesta trae 100 × 100 con los dos cursores; recorrer las cuatro ventanas da cada alumno, cada tarea y cada celda una sola vez, con los totales 101 en todas y las calificadas en su lugar", async () => {
    const f = ficha()
    const maestro = await crearAlumnoDePrueba(idsUsuarios, {
      nombre: `Maestra Grande ${f}`,
      rol: "maestro",
    })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const alumnos: string[] = []
    for (let i = 0; i < 101; i += 1) {
      const a = await crearAlumnoDePrueba(idsUsuarios, {
        nombre: `Grande ${f} ${String(i).padStart(3, "0")}`,
      })
      await inscribirDePrueba(clase.id, a.id)
      alumnos.push(a.id)
    }
    const tareas: string[] = []
    for (let i = 0; i < 101; i += 1) {
      tareas.push(
        await crearTareaDePrueba({
          claseId: clase.id,
          autorId: maestro.id,
          puntos: 10,
          fechaLimite: new Date(FECHA_BASE + i * MINUTO_MS),
        }),
      )
    }
    const primerAlumno = alumnos[0] ?? ""
    const ultimoAlumno = alumnos[100] ?? ""
    const primeraTarea = tareas[0] ?? ""
    const ultimaTarea = tareas[100] ?? ""
    await crearEntregaDePrueba({
      tareaId: primeraTarea,
      alumnoId: ultimoAlumno,
      estado: "calificado",
      calificacion: 9,
    })
    await crearEntregaDePrueba({
      tareaId: ultimaTarea,
      alumnoId: primerAlumno,
      estado: "calificado",
      calificacion: 4,
    })
    const token = await firmarTokenDePrueba({ usuarioId: maestro.id })

    const inicio = Date.now()
    const primera = exportacionDe(await pedir(token, urlDe(clase.id)))
    const tardo = Date.now() - inicio
    expect([primera.alumnos.length, primera.tareas.length]).toEqual([100, 100])
    expect(primera.siguienteCursor).not.toBeNull()
    expect(primera.siguienteCursorTareas).not.toBeNull()
    expect(tardo, "una ventana de 100 × 100 responde en menos de 15 s").toBeLessThan(15_000)

    const celdas = new Map<string, string>()
    const alumnosVistos = new Set<string>()
    const tareasVistas = new Set<string>()
    let respuestas = 0
    let cursorTareas: string | null = null
    do {
      let cursor: string | null = null
      do {
        const consulta = [
          cursor === null ? "" : `cursor=${cursor}`,
          cursorTareas === null ? "" : `cursorTareas=${cursorTareas}`,
        ]
          .filter((p) => p !== "")
          .join("&")
        const r = exportacionDe(await pedir(token, urlDe(clase.id, consulta ? `?${consulta}` : "")))
        respuestas += 1
        expect([r.totalAlumnos, r.totalTareas]).toEqual([101, 101])
        for (const t of r.tareas) tareasVistas.add(t.id)
        for (const fila of r.alumnos) {
          alumnosVistos.add(fila.alumno.id)
          expect(fila.celdas.map((c) => c.tareaId)).toEqual(r.tareas.map((t) => t.id))
          for (const c of fila.celdas) {
            const clave = `${fila.alumno.id}:${c.tareaId}`
            expect(celdas.has(clave), `celda repetida ${clave}`).toBe(false)
            celdas.set(clave, c.estado === "calificado" ? String(c.calificacion) : c.estado)
          }
        }
        cursor = r.siguienteCursor
        if (cursor === null) cursorTareas = r.siguienteCursorTareas
      } while (cursor !== null)
      expect(respuestas, "el recorrido termina").toBeLessThanOrEqual(4)
    } while (cursorTareas !== null)
    expect(respuestas).toBe(4)
    expect([alumnosVistos.size, tareasVistas.size, celdas.size]).toEqual([101, 101, 101 * 101])
    expect(celdas.get(`${ultimoAlumno}:${primeraTarea}`)).toBe("9")
    expect(celdas.get(`${primerAlumno}:${ultimaTarea}`)).toBe("4")
  }, 120_000)
})
