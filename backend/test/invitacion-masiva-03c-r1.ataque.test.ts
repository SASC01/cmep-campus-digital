import { randomBytes } from "node:crypto"

import { nombreSchema } from "@campus/shared"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { construirApp } from "../src/app.js"
import { obtenerDb } from "../src/adapters/db/cliente.js"
import { cargarEnv } from "../src/config/env.js"
import {
  COLA_CORREO_DE_CUENTA,
  COLA_CORREO_DE_CUENTA_FALLIDO,
} from "../src/core/eventos/correo-de-cuenta.js"
import { correoDePrueba, crearUsuarioDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import { crearTokenDePrueba } from "./ayudas-cuentas.js"

// Ataques del Tester (AUTH-03c, ronda 1) contra POST /api/admin/maestros/lote (§D-C1, §D-C3, §D-C4;
// plan, "Puntos de ataque" AUTH-03c, punto 1, y "Autorización"). Todo por HTTP con construirApp.
//
// Determinismo con la base compartida (observación 2 de la ronda 0): ningún caso depende del límite
// por defecto (80) ni de cuántas invitaciones creen en paralelo los demás archivos. Los casos sin
// cupo usan una app con un límite de 10,000. Los casos de cupo usan una app con un límite fijado
// antes de enviar y solo afirman lo que no puede cambiar con lo que hagan los demás archivos. Ojo:
// "usadas" no solo crece; también baja cuando el afterAll de otro archivo borra sus usuarios (los
// tokens se borran en cascada). Por eso el cupo en 0 se ancla con un token propio que vive hasta el
// afterAll de este archivo, y la carrera de cupo no afirma cuántos lotes pasan.

const env = cargarEnv()
const ids: string[] = []
const correos: string[] = []
let app: FastifyInstance
let appAmplia: FastifyInstance
let tokenAdmin = ""
let adminId = ""

const DOMINIO = "pruebas.local"

// Una app de más con otro límite. Nunca se cierra: su onClose desconectaría el cliente y la cola
// que comparte con `app` (mismo patrón que invitacion-masiva.integracion).
const appConLimite = async (limite: number): Promise<FastifyInstance> => {
  const otra = await construirApp({ env: { ...env, INVITACIONES_LIMITE_DIARIO: limite } })
  await otra.ready()
  return otra
}

const nuevoCorreo = (prefijo: string): string => {
  const correo = correoDePrueba(`ataque-03c-${prefijo}`)
  correos.push(correo)
  return correo
}

interface RespuestaLote {
  enviadas: { email: string; nombre: string | null }[]
  yaExistentes: { linea: number; email: string }[]
  invalidas: { linea: number; texto: string; motivo: string }[]
}

const enviarLote = (destino: FastifyInstance, cuerpo: unknown, token: string = tokenAdmin) =>
  destino.inject({
    method: "POST",
    url: "/api/admin/maestros/lote",
    headers: token === "" ? {} : { authorization: `Bearer ${token}` },
    payload: cuerpo as Record<string, unknown>,
  })

const cuentasDe = (emails: string[]) =>
  obtenerDb().usuario.findMany({
    where: { email: { in: emails } },
    select: {
      id: true,
      email: true,
      rol: true,
      nombre: true,
      activo: true,
      accesoRestringido: true,
      debeCambiarContrasena: true,
      estadoPago: true,
      hashContrasena: true,
    },
  })

const tokensDe = (usuarioIds: string[]) =>
  obtenerDb().tokenCuenta.findMany({
    where: { usuarioId: { in: usuarioIds } },
    select: { id: true, usuarioId: true, tipo: true, expiraEn: true, creadoEn: true },
  })

const usadasEnVentana = (): Promise<number> =>
  obtenerDb().tokenCuenta.count({
    where: { tipo: "invitacion", creadoEn: { gte: new Date(Date.now() - 24 * 3_600_000) } },
  })

interface TrabajoLeido {
  id: string
  name: string
  data: unknown
  priority: number
  retry_limit: number
  retry_delay: number
  retry_backoff: boolean
  retry_delay_max: number | null
  expire_seconds: number
  deletion_seconds: number
  dead_letter: string | null
  policy: string | null
  retencion: number
}

const trabajosPorId = async (idsDeTrabajo: string[]): Promise<TrabajoLeido[]> => {
  if (idsDeTrabajo.length === 0) return []
  return obtenerDb().$queryRaw<TrabajoLeido[]>`
    SELECT id::text AS id, name, data, priority, retry_limit, retry_delay, retry_backoff,
      retry_delay_max, expire_seconds, deletion_seconds, dead_letter, policy,
      round(extract(epoch FROM (keep_until - created_on)))::int AS retencion
    FROM pgboss.job
    WHERE name = ${COLA_CORREO_DE_CUENTA} AND id = ANY(${idsDeTrabajo}::uuid[])
  `
}

beforeAll(async () => {
  app = await construirApp({ env })
  await app.ready()
  appAmplia = await appConLimite(10_000)
  const admin = await obtenerDb().usuario.findFirst({
    where: { rol: "admin" },
    select: { id: true },
  })
  if (!admin) throw new Error("Precondición: la base desechable debe tener el admin de seed:admin")
  adminId = admin.id
  tokenAdmin = await firmarTokenDePrueba({ usuarioId: admin.id })
}, 30_000)

afterAll(async () => {
  await obtenerDb().usuario.deleteMany({ where: { email: { in: correos } } })
  await obtenerDb().usuario.deleteMany({ where: { id: { in: ids } } })
  await app.close()
})

describe("ataque (AUTH-03c r1): tamaño de la lista", () => {
  it("100 líneas justas, con CRLF y 50 líneas vacías o de espacios intercaladas → 200: 100 maestros, 100 tokens y 100 trabajos con el id de su token y la política de la cola", async () => {
    const lista = Array.from({ length: 100 }, (_, i) => nuevoCorreo(`cien-${String(i)}`))
    const lineas: string[] = []
    lista.forEach((correo, i) => {
      lineas.push(correo)
      if (i % 2 === 0) lineas.push(i % 4 === 0 ? "" : "   \t ")
    })
    const respuesta = await enviarLote(appAmplia, { lista: lineas.join("\r\n") })
    expect(respuesta.statusCode, respuesta.body).toBe(200)
    const cuerpo = respuesta.json<RespuestaLote>()
    expect(cuerpo.enviadas.map((e) => e.email)).toEqual(lista)
    expect(cuerpo.enviadas.every((e) => e.nombre === null)).toBe(true)
    expect(cuerpo.yaExistentes).toEqual([])
    expect(cuerpo.invalidas).toEqual([])

    const cuentas = await cuentasDe(lista)
    expect(cuentas).toHaveLength(100)
    expect(new Set(cuentas.map((c) => c.rol))).toEqual(new Set(["maestro"]))
    expect(new Set(cuentas.map((c) => c.hashContrasena)).size).toBe(1)
    const tokens = await tokensDe(cuentas.map((c) => c.id))
    expect(tokens).toHaveLength(100)
    expect(new Set(tokens.map((t) => t.usuarioId)).size).toBe(100)
    for (const token of tokens) {
      expect(token.tipo).toBe("invitacion")
      const horas = (token.expiraEn.getTime() - token.creadoEn.getTime()) / 3_600_000
      expect(Math.round(horas)).toBe(72)
    }

    // Un trabajo por token, con su mismo id, sin datos personales en `data`, y con la misma política
    // que un trabajo de la invitación suelta (POST /api/admin/maestros, encolar de siempre).
    const trabajos = await trabajosPorId(tokens.map((t) => t.id))
    expect(trabajos).toHaveLength(100)
    const suelto = nuevoCorreo("suelto-referencia")
    const alta = await app.inject({
      method: "POST",
      url: "/api/admin/maestros",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: { nombre: "Referencia Suelta", email: suelto },
    })
    expect(alta.statusCode).toBe(201)
    const [cuentaSuelta] = await cuentasDe([suelto])
    if (!cuentaSuelta) throw new Error("Precondición: la invitación suelta no creó la cuenta")
    const [tokenSuelto] = await tokensDe([cuentaSuelta.id])
    if (!tokenSuelto) throw new Error("Precondición: la invitación suelta no creó su token")
    const [referencia] = await trabajosPorId([tokenSuelto.id])
    if (!referencia) throw new Error("Precondición: la invitación suelta no encoló su trabajo")
    const politica = (t: TrabajoLeido) => ({
      name: t.name,
      data: t.data,
      priority: t.priority,
      retry_limit: t.retry_limit,
      retry_delay: t.retry_delay,
      retry_backoff: t.retry_backoff,
      retry_delay_max: t.retry_delay_max,
      expire_seconds: t.expire_seconds,
      deletion_seconds: t.deletion_seconds,
      dead_letter: t.dead_letter,
      policy: t.policy,
    })
    expect(referencia.retry_limit).toBe(3)
    expect(referencia.dead_letter).toBe(COLA_CORREO_DE_CUENTA_FALLIDO)
    for (const trabajo of trabajos) {
      expect(politica(trabajo)).toEqual(politica(referencia))
      expect(Math.abs(trabajo.retencion - referencia.retencion)).toBeLessThanOrEqual(5)
      expect(trabajo.data).toEqual({ tipo: "invitacion" })
    }
  }, 60_000)

  it("101 líneas con contenido (aunque 1 sea inválida) → 400 VALIDACION y nada creado", async () => {
    const lista = Array.from({ length: 100 }, (_, i) => nuevoCorreo(`cientouno-${String(i)}`))
    const respuesta = await enviarLote(appAmplia, {
      lista: [...lista, "no-es-correo"].join("\n"),
    })
    expect(respuesta.statusCode).toBe(400)
    expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe("VALIDACION")
    expect(await cuentasDe(lista)).toHaveLength(0)
  })

  it("40,001 caracteres → 400 y nada creado; 40,000 justos → 200", async () => {
    const correoLargo = nuevoCorreo("cuarenta-mil-uno")
    const deMas = `${correoLargo}${" ".repeat(40_001 - correoLargo.length)}`
    expect(deMas).toHaveLength(40_001)
    const rechazada = await enviarLote(appAmplia, { lista: deMas })
    expect(rechazada.statusCode).toBe(400)
    expect(await cuentasDe([correoLargo])).toHaveLength(0)

    const correoJusto = nuevoCorreo("cuarenta-mil")
    const justa = `${correoJusto}${" ".repeat(40_000 - correoJusto.length)}`
    expect(justa).toHaveLength(40_000)
    const aceptada = await enviarLote(appAmplia, { lista: justa })
    expect(aceptada.statusCode, aceptada.body).toBe(200)
    expect(aceptada.json<RespuestaLote>().enviadas.map((e) => e.email)).toEqual([correoJusto])
  })

  it.each([
    ["sin lista", {}],
    ["lista null", { lista: null }],
    ["lista número", { lista: 5 }],
    ["lista arreglo", { lista: ["a@pruebas.local"] }],
    ["lista objeto", { lista: { a: 1 } }],
    ["lista vacía", { lista: "" }],
    ["solo espacios y saltos", { lista: " \r\n\t\n  " }],
  ])("cuerpo %s → 400 VALIDACION, sin 5xx", async (_nombre, cuerpo) => {
    const respuesta = await enviarLote(appAmplia, cuerpo)
    expect(respuesta.statusCode).toBe(400)
    expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe("VALIDACION")
  })
})

describe("ataque (AUTH-03c r1): líneas raras", () => {
  it("líneas de solo separadores → correo_invalido cada una, con su número de línea, y nada creado", async () => {
    const lineas = [",", ";;;", ",;,", " ; ", "\t,\t", ",,@,,"]
    const respuesta = await enviarLote(appAmplia, { lista: lineas.join("\n") })
    expect(respuesta.statusCode).toBe(200)
    const cuerpo = respuesta.json<RespuestaLote>()
    expect(cuerpo.enviadas).toEqual([])
    expect(cuerpo.yaExistentes).toEqual([])
    expect(cuerpo.invalidas.map((i) => [i.linea, i.motivo])).toEqual(
      lineas.map((_, i) => [i + 1, "correo_invalido"]),
    )
  })

  it("el mismo correo con mayúsculas y espacios en tres líneas → una sola cuenta en minúsculas; las otras dos, repetido", async () => {
    const correo = nuevoCorreo("mayusculas")
    const lineas = [`  ${correo.toUpperCase()}  , Ana Mayúsculas`, correo, `\t${correo}`]
    const respuesta = await enviarLote(appAmplia, { lista: lineas.join("\n") })
    expect(respuesta.statusCode).toBe(200)
    const cuerpo = respuesta.json<RespuestaLote>()
    expect(cuerpo.enviadas).toEqual([{ email: correo, nombre: "Ana Mayúsculas" }])
    expect(cuerpo.invalidas.map((i) => [i.linea, i.motivo])).toEqual([
      [2, "repetido"],
      [3, "repetido"],
    ])
    const cuentas = await cuentasDe([correo])
    expect(cuentas).toHaveLength(1)
    expect(await tokensDe(cuentas.map((c) => c.id))).toHaveLength(1)
  })

  it("el correo del admin, con mayúsculas y un nombre, en medio de la lista → ya tenía cuenta; sigue siendo el único admin, con su hash, su nombre y sin tokens nuevos", async () => {
    const admin = await obtenerDb().usuario.findUnique({
      where: { id: adminId },
      select: { email: true, nombre: true, hashContrasena: true, rol: true },
    })
    if (!admin) throw new Error("Precondición: no se leyó el admin")
    const tokensAntes = (await tokensDe([adminId])).length
    const nuevo = nuevoCorreo("junto-al-admin")
    const lineas = [nuevo, `${admin.email.toUpperCase()}, Admin Impostor`]
    const respuesta = await enviarLote(appAmplia, { lista: lineas.join("\n") })
    expect(respuesta.statusCode).toBe(200)
    const cuerpo = respuesta.json<RespuestaLote>()
    expect(cuerpo.enviadas.map((e) => e.email)).toEqual([nuevo])
    expect(cuerpo.yaExistentes).toEqual([{ linea: 2, email: admin.email }])
    const despues = await obtenerDb().usuario.findUnique({
      where: { id: adminId },
      select: { email: true, nombre: true, hashContrasena: true, rol: true },
    })
    expect(despues).toEqual(admin)
    expect(await obtenerDb().usuario.count({ where: { rol: "admin" } })).toBe(1)
    expect((await tokensDe([adminId])).length).toBe(tokensAntes)
  })

  it("un alumno deudor y restringido en la lista → ya tenía cuenta, sin cambiar su rol ni sus banderas, y ninguna respuesta lleva estado de pago ni ids", async () => {
    const alumno = await crearUsuarioDePrueba(ids, {
      accesoRestringido: true,
      motivoRestriccion: "Adeudo de colegiatura",
    })
    await obtenerDb().usuario.update({
      where: { id: alumno.id },
      data: { estadoPago: "deudor" },
      select: { id: true },
    })
    const nuevo = nuevoCorreo("junto-al-alumno")
    const respuesta = await enviarLote(appAmplia, {
      lista: `${alumno.email}, Alumno Cambiado\n${nuevo}, Maestra Nueva`,
    })
    expect(respuesta.statusCode).toBe(200)
    const cuerpo = respuesta.json<Record<string, unknown>>()
    expect(Object.keys(cuerpo).sort()).toEqual(["enviadas", "invalidas", "yaExistentes"])
    expect(respuesta.body).not.toMatch(/deudor|estadoPago|estado_pago|Adeudo|restring|hash/i)
    const [cuentaAlumno] = await cuentasDe([alumno.email])
    expect(cuentaAlumno).toMatchObject({
      rol: "estudiante",
      nombre: "Prueba Auth",
      accesoRestringido: true,
      estadoPago: "deudor",
    })
    const [cuentaNueva] = await cuentasDe([nuevo])
    if (!cuentaNueva) throw new Error("Precondición: no se creó la cuenta nueva")
    const [tokenNuevo] = await tokensDe([cuentaNueva.id])
    for (const id of [alumno.id, cuentaNueva.id, tokenNuevo?.id ?? "falta-el-token"]) {
      expect(respuesta.body.includes(id), `la respuesta contiene el id ${id}`).toBe(false)
    }
  })

  it("banderas en el cuerpo (rol admin, estadoPago, accesoRestringido, activo…) se ignoran: maestros activos, al corriente y sin restricción", async () => {
    const correo = nuevoCorreo("banderas")
    const respuesta = await enviarLote(appAmplia, {
      lista: correo,
      rol: "admin",
      estadoPago: "deudor",
      accesoRestringido: true,
      activo: false,
      debeCambiarContrasena: true,
      limite: 1,
    })
    expect(respuesta.statusCode).toBe(200)
    const [cuenta] = await cuentasDe([correo])
    expect(cuenta).toMatchObject({
      rol: "maestro",
      activo: true,
      accesoRestringido: false,
      debeCambiarContrasena: false,
      estadoPago: "al_corriente",
    })
    expect(await obtenerDb().usuario.count({ where: { rol: "admin" } })).toBe(1)
  })

  it("U+202E en el correo o en el nombre y <script> en el nombre: el inversor nunca se guarda; el <script> se guarda como texto tal cual", async () => {
    const conInversorEnNombre = nuevoCorreo("inversor-nombre")
    const conInversorEnCorreo = nuevoCorreo("inversor-correo")
    const conScript = nuevoCorreo("script")
    const script = "<script>alert(1)</script> López"
    const lineas = [
      `${conInversorEnNombre}, Ana ‮zepóL`,
      `${conInversorEnCorreo.replace("@", "‮@")}, Beto`,
      `${conScript}, ${script}`,
    ]
    const respuesta = await enviarLote(appAmplia, { lista: lineas.join("\n") })
    expect(respuesta.statusCode).toBe(200)
    const cuerpo = respuesta.json<RespuestaLote>()
    expect(cuerpo.invalidas.map((i) => [i.linea, i.motivo])).toEqual([
      [1, "nombre_invalido"],
      [2, "correo_invalido"],
    ])
    expect(cuerpo.enviadas).toEqual([{ email: conScript, nombre: script }])
    expect(await cuentasDe([conInversorEnNombre, conInversorEnCorreo])).toHaveLength(0)
    const [cuenta] = await cuentasDe([conScript])
    expect(cuenta?.nombre).toBe(script)
    const todas = await obtenerDb().usuario.findMany({
      where: { email: { in: correos } },
      select: { nombre: true, email: true },
    })
    for (const fila of todas) {
      expect(fila.nombre.includes("‮"), fila.email).toBe(false)
      expect(fila.email.includes("‮"), fila.email).toBe(false)
    }
  })

  it("líneas sin nombre con partes locales raras (1 carácter, solo símbolos, 64 caracteres, correo de 254): el nombre guardado siempre pasa nombreSchema y es su propio `data`", async () => {
    const sufijo = randomBytes(5).toString("hex")
    const dominio = `r${sufijo}.${DOMINIO}`
    const largo = `${"x".repeat(64)}@${"d".repeat(60)}.${"e".repeat(60)}.${"f".repeat(60)}.${dominio}`
    const raros = [
      `_@${dominio}`,
      `-@${dominio}`,
      `+@${dominio}`,
      `_+@${dominio}`,
      `a@${dominio}`,
      `a.b@${dominio}`,
      `${"q".repeat(64)}@${dominio}`,
      largo.slice(0, 254),
    ]
    correos.push(...raros)
    const respuesta = await enviarLote(appAmplia, { lista: raros.join("\n") })
    expect(respuesta.statusCode, respuesta.body).toBe(200)
    const cuerpo = respuesta.json<RespuestaLote>()
    // Los que correoSchema acepte deben crearse; ninguno cae en 5xx ni en nombre_invalido.
    expect(cuerpo.invalidas.filter((i) => i.motivo !== "correo_invalido")).toEqual([])
    expect(cuerpo.enviadas.length).toBeGreaterThanOrEqual(5)
    const cuentas = await cuentasDe(cuerpo.enviadas.map((e) => e.email))
    expect(cuentas).toHaveLength(cuerpo.enviadas.length)
    for (const cuenta of cuentas) {
      const analizado = nombreSchema.safeParse(cuenta.nombre)
      expect(analizado.success, `${cuenta.email} → "${cuenta.nombre}"`).toBe(true)
      expect(analizado.data, cuenta.email).toBe(cuenta.nombre)
      expect(cuenta.nombre.length).toBeLessThanOrEqual(120)
    }
  })
})

describe("ataque (AUTH-03c r1): cupo diario (deterministas con la base compartida)", () => {
  it("cupo en 0: dos correos nuevos → 409 CUPO_DIARIO_INSUFICIENTE con N = 0 y nada creado; solo existentes e inválidas → 200", async () => {
    // Garantiza al menos una invitación en la ventana: con límite 1, el cupo que queda es 0 y solo
    // puede seguir en 0 aunque otros archivos agreguen más.
    const ancla = await crearUsuarioDePrueba(ids, { rol: "maestro" })
    await crearTokenDePrueba({
      usuarioId: ancla.id,
      tipo: "invitacion",
      expiraEn: new Date(Date.now() + 3_600_000),
    })
    const appCero = await appConLimite(1)
    const existente = await crearUsuarioDePrueba(ids, { rol: "maestro" })
    const nuevos = [nuevoCorreo("cupo-cero-a"), nuevoCorreo("cupo-cero-b")]
    const rechazada = await enviarLote(appCero, {
      lista: [nuevos[0], existente.email, "no-es-correo", nuevos[1]].join("\n"),
    })
    expect(rechazada.statusCode).toBe(409)
    const error = rechazada.json<{ error: { codigo: string; mensaje: string } }>().error
    expect(error.codigo).toBe("CUPO_DIARIO_INSUFICIENTE")
    expect(error.mensaje).toBe(
      "Hoy solo puedes enviar 0 invitaciones más. Quita líneas de la lista o inténtalo mañana.",
    )
    expect(await cuentasDe(nuevos)).toHaveLength(0)

    const soloExistentes = await enviarLote(appCero, {
      lista: `${existente.email}\nno-es-correo`,
    })
    expect(soloExistentes.statusCode).toBe(200)
    expect(soloExistentes.json<RespuestaLote>().yaExistentes).toEqual([
      { linea: 1, email: existente.email },
    ])
  })

  it("cuatro lotes simultáneos de 3 correos nuevos con poco cupo: cada lote es todo o nada (200 con sus 3 cuentas o 409 sin ninguna); nunca un 5xx", async () => {
    const limite = (await usadasEnVentana()) + 5
    const appCinco = await appConLimite(limite)
    const lotes = Array.from({ length: 4 }, (_, l) =>
      Array.from({ length: 3 }, (_, i) => nuevoCorreo(`carrera-cupo-${String(l)}-${String(i)}`)),
    )
    const respuestas = await Promise.all(
      lotes.map((lote) => enviarLote(appCinco, { lista: lote.join("\n") })),
    )
    const estados = respuestas.map((r) => r.statusCode)
    expect(
      estados.every((e) => e === 200 || e === 409),
      JSON.stringify(estados),
    ).toBe(true)

    for (const [indice, lote] of lotes.entries()) {
      const creadas = (await cuentasDe(lote)).length
      expect(creadas, `lote ${String(indice)} (${String(estados[indice])})`).toBe(
        estados[indice] === 200 ? 3 : 0,
      )
    }
  }, 30_000)

  it("tres lotes simultáneos que comparten 5 correos: cada correo compartido se crea una sola vez, con un token, y sale como enviado en un solo lote y como ya existente en los otros dos", async () => {
    const compartidos = Array.from({ length: 5 }, (_, i) => nuevoCorreo(`compartido-${String(i)}`))
    const lotes = Array.from({ length: 3 }, (_, l) => [
      ...Array.from({ length: 10 }, (_, i) => nuevoCorreo(`propio-${String(l)}-${String(i)}`)),
      ...compartidos,
    ])
    const respuestas = await Promise.all(
      lotes.map((lote) => enviarLote(appAmplia, { lista: lote.join("\n") })),
    )
    expect(respuestas.map((r) => r.statusCode)).toEqual([200, 200, 200])
    const cuerpos = respuestas.map((r) => r.json<RespuestaLote>())
    for (const correo of compartidos) {
      const enviadoEn = cuerpos.filter((c) => c.enviadas.some((e) => e.email === correo)).length
      const existenteEn = cuerpos.filter((c) =>
        c.yaExistentes.some((e) => e.email === correo),
      ).length
      expect([enviadoEn, existenteEn], correo).toEqual([1, 2])
    }
    const cuentas = await cuentasDe(lotes.flat())
    expect(cuentas).toHaveLength(35)
    const tokens = await tokensDe(cuentas.map((c) => c.id))
    expect(tokens).toHaveLength(35)
    expect(await trabajosPorId(tokens.map((t) => t.id))).toHaveLength(35)
  }, 30_000)
})

describe("ataque (AUTH-03c r1): autorización", () => {
  it.each([
    ["sin token", async () => "", 401, "NO_AUTENTICADO"],
    [
      "un estudiante",
      async () => firmarTokenDePrueba({ usuarioId: (await crearUsuarioDePrueba(ids)).id }),
      403,
      "ROL_NO_PERMITIDO",
    ],
    [
      "un maestro",
      async () =>
        firmarTokenDePrueba({
          usuarioId: (await crearUsuarioDePrueba(ids, { rol: "maestro" })).id,
        }),
      403,
      "ROL_NO_PERMITIDO",
    ],
    [
      "un estudiante restringido",
      async () =>
        firmarTokenDePrueba({
          usuarioId: (await crearUsuarioDePrueba(ids, { accesoRestringido: true })).id,
        }),
      403,
      "ACCESO_RESTRINGIDO",
    ],
    [
      "un maestro con cambio de contraseña pendiente",
      async () =>
        firmarTokenDePrueba({
          usuarioId: (
            await crearUsuarioDePrueba(ids, { rol: "maestro", debeCambiarContrasena: true })
          ).id,
        }),
      403,
      "CAMBIO_DE_CONTRASENA_REQUERIDO",
    ],
    [
      "un maestro dado de baja",
      async () =>
        firmarTokenDePrueba({
          usuarioId: (await crearUsuarioDePrueba(ids, { rol: "maestro", activo: false })).id,
        }),
      401,
      null,
    ],
  ] as const)("%s → %i y nada creado", async (_quien, obtenerToken, estado, codigo) => {
    const token = await obtenerToken()
    const correo = nuevoCorreo("autorizacion")
    const respuesta = await enviarLote(appAmplia, { lista: correo }, token)
    expect(respuesta.statusCode).toBe(estado)
    if (codigo !== null) {
      expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe(codigo)
    }
    expect(await cuentasDe([correo])).toHaveLength(0)
  })
})

describe("ataque (AUTH-03c r1): identificadores del lote", () => {
  it("cada cuenta del lote tiene su propio id y su propio token; el id de cada trabajo es el de su token y ninguno coincide con el de una cuenta", async () => {
    const lista = Array.from({ length: 4 }, (_, i) => nuevoCorreo(`ids-${String(i)}`))
    const respuesta = await enviarLote(appAmplia, { lista: lista.join("\n") })
    expect(respuesta.statusCode).toBe(200)
    const cuentas = await cuentasDe(lista)
    const tokens = await tokensDe(cuentas.map((c) => c.id))
    const trabajos = await trabajosPorId(tokens.map((t) => t.id))
    expect(new Set(cuentas.map((c) => c.id)).size).toBe(4)
    expect(new Set(tokens.map((t) => t.id)).size).toBe(4)
    expect(new Set(trabajos.map((t) => t.id))).toEqual(new Set(tokens.map((t) => t.id)))
    const idsDeCuenta = new Set(cuentas.map((c) => c.id))
    expect(tokens.some((t) => idsDeCuenta.has(t.id))).toBe(false)
  })
})
