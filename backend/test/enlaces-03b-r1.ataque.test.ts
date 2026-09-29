import { createHash, randomBytes, randomUUID } from "node:crypto"

import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { generarTokenDeEnlace } from "../src/adapters/auth/index.js"
import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  correoDePrueba,
  crearUsuarioDePrueba,
  encabezadoCookieRefresco,
  firmarTokenDePrueba,
  iniciarSesionDePrueba,
  valorCookieRefresco,
} from "./ayudas-auth.js"
import { crearTokenDePrueba } from "./ayudas-cuentas.js"

// Ataques del Tester (AUTH-03b, ronda 1) contra los enlaces de registro de maestro: el registro
// público con el enlace (§D-B5), las 4 rutas del admin (§D-B4) y su autorización (plan,
// "Autorización" y "Puntos de ataque" AUTH-03b, puntos 1 y 2).
//
// Carrera entre la revocación y un registro en curso: una transacción de la prueba toma
// SELECT ... FOR SHARE sobre la fila del enlace, el mismo bloqueo que toma registrarMaestroConEnlace,
// así que representa exactamente "un registro que ya tenía la fila" (§D-B5). La revocación queda
// formada detrás (pg_blocking_pids) y después llega otro registro.

let app: FastifyInstance | undefined
const ids: string[] = []
const enlaces: string[] = []
const env = cargarEnv()
let tokenAdmin = ""
let adminId = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env })
  await app.ready()
  const admin = await obtenerDb().usuario.findFirst({
    where: { rol: "admin" },
    select: { id: true },
  })
  if (!admin) throw new Error("Precondición: falta el admin único de la base desechable")
  adminId = admin.id
  tokenAdmin = await firmarTokenDePrueba({ usuarioId: admin.id })
})

afterAll(async () => {
  await obtenerDb().usuario.deleteMany({ where: { enlaceRegistroId: { in: enlaces } } })
  await borrarUsuariosDePrueba(ids)
  await obtenerDb().enlaceRegistro.deleteMany({ where: { id: { in: enlaces } } })
  await app?.close()
})

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

const DIA_MS = 86_400_000

const crearEnlace = async ({
  expiraEn = new Date(Date.now() + 7 * DIA_MS),
  revocadoEn = null,
  creadoEn,
}: { expiraEn?: Date; revocadoEn?: Date | null; creadoEn?: Date } = {}): Promise<{
  id: string
  token: string
  hash: string
}> => {
  const { token, hash } = generarTokenDeEnlace()
  const { id } = await obtenerDb().enlaceRegistro.create({
    data: { hashToken: hash, expiraEn, revocadoEn, ...(creadoEn ? { creadoEn } : {}) },
    select: { id: true },
  })
  enlaces.push(id)
  return { id, token, hash }
}

const registrar = (payload: Record<string, unknown>): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({ method: "POST", url: "/api/auth/registro-maestro", payload })

const datosDeRegistro = (token: string, extra: Record<string, unknown> = {}) => ({
  nombre: "Maestra Ataque",
  email: correoDePrueba("ataque-03b"),
  contrasena: `clave-${randomBytes(6).toString("hex")}`,
  token,
  ...extra,
})

const comoAdmin = (
  method: "GET" | "POST" | "HEAD",
  url: string,
  payload?: unknown,
  // null: sin encabezado Authorization (undefined tomaría el valor por defecto).
  token: string | null = tokenAdmin,
): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method,
    url,
    headers: token === null ? {} : { authorization: `Bearer ${token}` },
    ...(payload === undefined ? {} : { payload: payload as Record<string, unknown> }),
  })

const codigoDe = (respuesta: LightMyRequestResponse): string | undefined =>
  (respuesta.json<{ error?: { codigo?: string } }>().error ?? {}).codigo

const usuariosDelEnlace = (enlaceId: string) =>
  obtenerDb().usuario.findMany({
    where: { enlaceRegistroId: enlaceId },
    select: { id: true, email: true, creadoEn: true },
  })

// Procesos formados, directa o indirectamente, detrás del pid dado.
const bloqueadosPor = async (pid: number): Promise<number> => {
  const [fila] = await obtenerDb().$queryRaw<{ n: number }[]>`
    WITH RECURSIVE bloqueados(pid) AS (
      SELECT pid FROM pg_stat_activity WHERE ${pid}::int = ANY(pg_blocking_pids(pid))
      UNION
      SELECT a.pid FROM pg_stat_activity a
      JOIN bloqueados b ON b.pid = ANY(pg_blocking_pids(a.pid))
    )
    SELECT count(*)::int AS n FROM bloqueados`
  return fila?.n ?? 0
}

describe("ataque (AUTH-03b r1): registro de maestro con el enlace", () => {
  it("un enlace vencido hace 1 ms: 400 ENLACE_INVALIDO y nada creado", async () => {
    const enlace = await crearEnlace({ expiraEn: new Date(Date.now() - 1) })
    const datos = datosDeRegistro(enlace.token)
    const respuesta = await registrar(datos)
    expect(respuesta.statusCode).toBe(400)
    expect(codigoDe(respuesta)).toBe("ENLACE_INVALIDO")
    expect(await obtenerDb().usuario.count({ where: { email: datos.email } })).toBe(0)
  })

  it("inexistente, vencido, revocado, de invitación, de recuperación, de 42 o 44 caracteres, con espacios o el hash: el mismo 400, cuerpo y encabezados, sin crear nada", async () => {
    const vivo = await crearEnlace()
    const vencido = await crearEnlace({ expiraEn: new Date(Date.now() - DIA_MS) })
    const revocado = await crearEnlace({ revocadoEn: new Date() })
    const invitado = await crearUsuarioDePrueba(ids, { rol: "maestro" })
    const invitacion = await crearTokenDePrueba({
      usuarioId: invitado.id,
      tipo: "invitacion",
      expiraEn: new Date(Date.now() + DIA_MS),
    })
    const recuperacion = await crearTokenDePrueba({
      usuarioId: invitado.id,
      tipo: "recuperacion",
      expiraEn: new Date(Date.now() + DIA_MS),
    })
    const tokens: [string, string][] = [
      ["inexistente", randomBytes(32).toString("base64url")],
      ["vencido", vencido.token],
      ["revocado", revocado.token],
      ["invitación viva de tokens_cuenta", invitacion.token],
      ["recuperación viva de tokens_cuenta", recuperacion.token],
      ["42 caracteres", vivo.token.slice(0, 42)],
      ["44 caracteres", `${vivo.token}A`],
      ["con espacios", ` ${vivo.token} `],
      ["el hash en lugar del token", vivo.hash],
      ["un carácter cambiado", `${vivo.token.slice(0, 42)}${vivo.token.endsWith("A") ? "B" : "A"}`],
    ]
    const correos: string[] = []
    const vistas = new Set<string>()
    for (const [etiqueta, token] of tokens) {
      const datos = datosDeRegistro(token)
      correos.push(datos.email)
      const respuesta = await registrar(datos)
      const encabezados = { ...respuesta.headers }
      delete encabezados.date
      delete encabezados["content-length"]
      delete encabezados["x-request-id"]
      delete encabezados["request-id"]
      expect(respuesta.statusCode, etiqueta).toBe(400)
      expect(encabezadoCookieRefresco(respuesta), `${etiqueta}: puso una cookie`).toBeUndefined()
      vistas.add(JSON.stringify({ cuerpo: respuesta.json(), encabezados }))
    }
    expect([...vistas], "las respuestas se distinguen entre sí").toHaveLength(1)
    expect(await obtenerDb().usuario.count({ where: { email: { in: correos } } })).toBe(0)
    expect(await usuariosDelEnlace(vivo.id)).toEqual([])
  })

  it("rol, enlaceRegistroId, activo, estadoPago, accesoRestringido, debeCambiarContrasena, id y creadoEn en el cuerpo se ignoran", async () => {
    const enlace = await crearEnlace()
    const otro = await crearEnlace()
    const idInventado = randomUUID()
    const datos = datosDeRegistro(enlace.token, {
      rol: "admin",
      enlaceRegistroId: otro.id,
      activo: false,
      estadoPago: "deudor",
      accesoRestringido: true,
      motivoRestriccion: "inyectado",
      debeCambiarContrasena: true,
      id: idInventado,
      creadoEn: "2001-01-01T00:00:00.000Z",
    })
    const antes = Date.now()
    const respuesta = await registrar(datos)
    expect(respuesta.statusCode).toBe(201)
    const creado = await obtenerDb().usuario.findUnique({
      where: { email: datos.email },
      select: {
        id: true,
        rol: true,
        enlaceRegistroId: true,
        activo: true,
        estadoPago: true,
        accesoRestringido: true,
        motivoRestriccion: true,
        debeCambiarContrasena: true,
        creadoEn: true,
      },
    })
    if (!creado) throw new Error("no se creó la cuenta")
    ids.push(creado.id)
    expect({ ...creado, id: undefined, creadoEn: undefined }).toEqual({
      id: undefined,
      rol: "maestro",
      enlaceRegistroId: enlace.id,
      activo: true,
      estadoPago: "al_corriente",
      accesoRestringido: false,
      motivoRestriccion: null,
      debeCambiarContrasena: false,
      creadoEn: undefined,
    })
    expect(creado.id).not.toBe(idInventado)
    expect(creado.creadoEn.getTime()).toBeGreaterThanOrEqual(antes - 5_000)
    expect(await obtenerDb().usuario.count({ where: { rol: "admin" } })).toBe(1)
    expect(Object.keys(respuesta.json<Record<string, unknown>>())).toEqual(["tokenAcceso"])
  })

  it("el mismo correo en dos registros simultáneos (con otra capitalización): 201 y 409, nunca 5xx, una sola cuenta", async () => {
    const enlace = await crearEnlace()
    const correo = correoDePrueba("ataque-03b-doble")
    const [uno, dos] = await Promise.all([
      registrar(datosDeRegistro(enlace.token, { email: correo })),
      registrar(datosDeRegistro(enlace.token, { email: correo.toUpperCase() })),
    ])
    const creados = await usuariosDelEnlace(enlace.id)
    ids.push(...creados.map((u) => u.id))
    expect([uno?.statusCode, dos?.statusCode].sort()).toEqual([201, 409])
    const conflicto = [uno, dos].find((r) => r?.statusCode === 409)
    expect(conflicto && codigoDe(conflicto)).toBe("CORREO_EN_USO")
    expect(creados).toHaveLength(1)
  })

  it("el correo del admin o de un estudiante (con mayúsculas y espacios): 409 y la cuenta existente no cambia de rol", async () => {
    const enlace = await crearEnlace()
    const estudiante = await crearUsuarioDePrueba(ids)
    const admin = await obtenerDb().usuario.findUnique({
      where: { id: adminId },
      select: { email: true, hashContrasena: true },
    })
    if (!admin) throw new Error("Precondición: falta el admin")
    for (const correo of [admin.email, estudiante.email]) {
      const respuesta = await registrar(
        datosDeRegistro(enlace.token, { email: `  ${correo.toUpperCase()} ` }),
      )
      expect(respuesta.statusCode, correo).toBe(409)
      expect(codigoDe(respuesta)).toBe("CORREO_EN_USO")
    }
    const despues = await obtenerDb().usuario.findMany({
      where: { id: { in: [adminId, estudiante.id] } },
      select: { id: true, rol: true, enlaceRegistroId: true, hashContrasena: true },
    })
    expect(despues.find((u) => u.id === adminId)).toMatchObject({
      rol: "admin",
      enlaceRegistroId: null,
      hashContrasena: admin.hashContrasena,
    })
    expect(despues.find((u) => u.id === estudiante.id)).toMatchObject({
      rol: "estudiante",
      enlaceRegistroId: null,
    })
    expect(await usuariosDelEnlace(enlace.id)).toEqual([])
  })

  it("la cookie del registro es la de siempre (HttpOnly, SameSite=Strict, Path=/api/auth) y la respuesta es no-store o sin caché pública", async () => {
    const enlace = await crearEnlace()
    const datos = datosDeRegistro(enlace.token)
    const respuesta = await registrar(datos)
    const creado = await obtenerDb().usuario.findUnique({ where: { email: datos.email } })
    if (creado) ids.push(creado.id)
    expect(respuesta.statusCode).toBe(201)
    expect(encabezadoCookieRefresco(respuesta) ?? "").toMatch(
      /^campus_refresco=[A-Za-z0-9_-]{43}; Max-Age=\d+; Path=\/api\/auth; HttpOnly; SameSite=Strict/,
    )
    expect(String(respuesta.headers["cache-control"] ?? "")).not.toMatch(/public/)
  })

  it("revocar el enlace no toca las cuentas ya creadas: siguen entrando y refrescando", async () => {
    const enlace = await crearEnlace()
    const datos = datosDeRegistro(enlace.token)
    const alta = await registrar(datos)
    expect(alta.statusCode).toBe(201)
    const cookieDelRegistro = valorCookieRefresco(alta)
    const creado = await obtenerDb().usuario.findUnique({ where: { email: datos.email } })
    if (!creado) throw new Error("no se creó la cuenta")
    ids.push(creado.id)

    const revocada = await comoAdmin("POST", `/api/admin/enlaces-registro/${enlace.id}/revocar`)
    expect(revocada.statusCode).toBe(200)
    const login = await iniciarSesionDePrueba(obtenerApp(), {
      email: datos.email,
      contrasena: datos.contrasena,
    })
    expect(login.tokenAcceso.length).toBeGreaterThan(20)
    const refresco = await obtenerApp().inject({
      method: "POST",
      url: "/api/auth/refrescar",
      cookies: { campus_refresco: cookieDelRegistro ?? "" },
    })
    expect(refresco.statusCode).toBe(200)
    const nuevo = await registrar(datosDeRegistro(enlace.token))
    expect(nuevo.statusCode).toBe(400)
  })

  it("20 registros simultáneos con la revocación en medio: nunca 5xx, solo 201 o 400, tantas cuentas como 201 y después ninguna más", async () => {
    const enlace = await crearEnlace()
    const correos: string[] = []
    const lanzados: Promise<LightMyRequestResponse>[] = []
    let revocacion: Promise<LightMyRequestResponse> | undefined
    for (let i = 0; i < 20; i += 1) {
      const datos = datosDeRegistro(enlace.token)
      correos.push(datos.email)
      lanzados.push(registrar(datos))
      if (i === 9) {
        await esperar(30)
        revocacion = comoAdmin("POST", `/api/admin/enlaces-registro/${enlace.id}/revocar`)
      }
    }
    if (!revocacion) throw new Error("Precondición: no se lanzó la revocación")
    const [respuestaRevocacion, ...respuestas] = await Promise.all([revocacion, ...lanzados])
    const creados = await usuariosDelEnlace(enlace.id)
    ids.push(...creados.map((u) => u.id))
    expect(respuestaRevocacion?.statusCode).toBe(200)
    const estados = respuestas.map((r) => r.statusCode)
    expect(
      estados.every((e) => e === 201 || e === 400),
      estados.join(","),
    ).toBe(true)
    expect(creados).toHaveLength(estados.filter((e) => e === 201).length)
    const despues = await registrar(datosDeRegistro(enlace.token))
    expect(despues.statusCode).toBe(400)
    expect(await usuariosDelEnlace(enlace.id)).toHaveLength(creados.length)
  }, 60_000)

  it("revocación formada detrás de un registro en curso: ningún registrado queda con creado_en posterior a revocado_en, y ninguno confirma después de la respuesta de la revocación", async () => {
    const enlace = await crearEnlace()
    const datos = datosDeRegistro(enlace.token)
    let revocacion: Promise<LightMyRequestResponse> | undefined
    let registro: Promise<LightMyRequestResponse> | undefined
    let registroTerminoEn = Number.POSITIVE_INFINITY
    let revocacionTerminoEn = Number.POSITIVE_INFINITY

    await obtenerDb().$transaction(
      async (tx) => {
        // El mismo bloqueo que toma un registro en curso (registrarMaestroConEnlace).
        await tx.$queryRaw`SELECT id FROM enlaces_registro WHERE id = ${enlace.id}::uuid FOR SHARE`
        const [propio] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
        if (!propio) throw new Error("Precondición: sin pid de la transacción retenedora")

        revocacion = comoAdmin("POST", `/api/admin/enlaces-registro/${enlace.id}/revocar`)
        revocacion.then(
          () => (revocacionTerminoEn = Date.now()),
          () => undefined,
        )
        const limite = Date.now() + 10_000
        while ((await bloqueadosPor(propio.pid)) < 1 && Date.now() < limite) await esperar(20)
        expect(
          await bloqueadosPor(propio.pid),
          "Precondición: la revocación no quedó formada detrás del registro en curso",
        ).toBeGreaterThanOrEqual(1)

        // Un momento después, llega otro registro con el mismo enlace.
        await esperar(60)
        let terminado = false
        registro = registrar(datos)
        registro.then(
          () => {
            terminado = true
            registroTerminoEn = Date.now()
          },
          () => (terminado = true),
        )
        const limiteRegistro = Date.now() + 10_000
        while (!terminado && (await bloqueadosPor(propio.pid)) < 2 && Date.now() < limiteRegistro) {
          await esperar(20)
        }
        expect(
          terminado || (await bloqueadosPor(propio.pid)) >= 2,
          "Precondición: el segundo registro ni terminó ni quedó formado",
        ).toBe(true)
      },
      { timeout: 30_000, maxWait: 5_000 },
    )
    if (!revocacion || !registro) throw new Error("Precondición: no se lanzaron las peticiones")
    const [respuestaRevocacion, respuestaRegistro] = await Promise.all([revocacion, registro])
    const creado = await obtenerDb().usuario.findUnique({
      where: { email: datos.email },
      select: { id: true, creadoEn: true },
    })
    if (creado) ids.push(creado.id)
    const fila = await obtenerDb().enlaceRegistro.findUnique({
      where: { id: enlace.id },
      select: { revocadoEn: true },
    })

    expect(respuestaRevocacion.statusCode).toBe(200)
    expect([201, 400]).toContain(respuestaRegistro.statusCode)
    expect(fila?.revocadoEn, "el enlace no quedó revocado").toBeInstanceOf(Date)
    if (respuestaRegistro.statusCode === 201) {
      expect(creado, "201 sin cuenta").not.toBeNull()
      expect(registroTerminoEn).toBeLessThanOrEqual(revocacionTerminoEn)
      expect(
        creado?.creadoEn.getTime() ?? Number.POSITIVE_INFINITY,
        `registrado el ${creado?.creadoEn.toISOString()} con el enlace revocado el ${fila?.revocadoEn?.toISOString()}`,
      ).toBeLessThanOrEqual(fila?.revocadoEn?.getTime() ?? Number.NEGATIVE_INFINITY)
    } else {
      expect(creado).toBeNull()
    }
  }, 60_000)
})

describe("ataque (AUTH-03b r1): el token del enlace", () => {
  it("se crea con 201 y no-store; la respuesta trae exactamente { enlace, token } y el token solo existe ahí", async () => {
    const respuesta = await comoAdmin("POST", "/api/admin/enlaces-registro", { vigenciaDias: 3 })
    expect(respuesta.statusCode).toBe(201)
    expect(String(respuesta.headers["cache-control"])).toMatch(/no-store/)
    const cuerpo = respuesta.json<{ enlace: Record<string, unknown>; token: string }>()
    expect(Object.keys(cuerpo).sort()).toEqual(["enlace", "token"])
    expect(Object.keys(cuerpo.enlace).sort()).toEqual(
      ["creadoEn", "estado", "expiraEn", "id", "registrados", "revocadoEn"].sort(),
    )
    const id = String(cuerpo.enlace.id)
    enlaces.push(id)
    expect(cuerpo.token).toMatch(/^[A-Za-z0-9_-]{43}$/)

    const fila = await obtenerDb().enlaceRegistro.findUnique({ where: { id } })
    if (!fila) throw new Error("no se guardó el enlace")
    expect(fila.hashToken).toBe(createHash("sha256").update(cuerpo.token).digest("hex"))
    expect(JSON.stringify(fila)).not.toContain(cuerpo.token)

    const lista = await comoAdmin("GET", "/api/admin/enlaces-registro?limite=100")
    const revocar = await comoAdmin("POST", `/api/admin/enlaces-registro/${id}/revocar`)
    const registrados = await comoAdmin("GET", `/api/admin/enlaces-registro/${id}/registrados`)
    for (const [etiqueta, otra] of [
      ["lista", lista],
      ["revocar", revocar],
      ["registrados", registrados],
    ] as const) {
      expect(otra.statusCode, etiqueta).toBe(200)
      expect(otra.body, `${etiqueta} trae el token`).not.toContain(cuerpo.token)
      expect(otra.body, `${etiqueta} trae el hash`).not.toContain(fila.hashToken)
      expect(otra.body, `${etiqueta} trae hashToken`).not.toMatch(/hash/i)
      expect(otra.body, `${etiqueta} trae estadoPago`).not.toMatch(/estadoPago/)
    }
  })

  it("dos enlaces seguidos tienen tokens distintos y cada hash es único", async () => {
    const tokens: string[] = []
    for (let i = 0; i < 2; i += 1) {
      const respuesta = await comoAdmin("POST", "/api/admin/enlaces-registro", {})
      expect(respuesta.statusCode).toBe(201)
      const cuerpo = respuesta.json<{ enlace: { id: string }; token: string }>()
      enlaces.push(cuerpo.enlace.id)
      tokens.push(cuerpo.token)
    }
    expect(new Set(tokens).size).toBe(2)
  })

  it("expiraEn, revocadoEn, hashToken e id en el cuerpo se ignoran: vigencia de 2 días, vigente y sin revocar", async () => {
    const idInventado = randomUUID()
    const antes = Date.now()
    const respuesta = await comoAdmin("POST", "/api/admin/enlaces-registro", {
      vigenciaDias: 2,
      expiraEn: "2099-01-01T00:00:00.000Z",
      revocadoEn: "2000-01-01T00:00:00.000Z",
      hashToken: "a".repeat(64),
      id: idInventado,
      estado: "revocado",
    })
    const despues = Date.now()
    expect(respuesta.statusCode).toBe(201)
    const { enlace } = respuesta.json<{
      enlace: { id: string; expiraEn: string; revocadoEn: string | null; estado: string }
    }>()
    enlaces.push(enlace.id)
    expect(enlace.id).not.toBe(idInventado)
    expect(enlace.revocadoEn).toBeNull()
    expect(enlace.estado).toBe("vigente")
    const expira = new Date(enlace.expiraEn).getTime()
    expect(expira).toBeGreaterThanOrEqual(antes + 2 * DIA_MS)
    expect(expira).toBeLessThanOrEqual(despues + 2 * DIA_MS)
    const fila = await obtenerDb().enlaceRegistro.findUnique({ where: { id: enlace.id } })
    expect(fila?.hashToken).not.toBe("a".repeat(64))
  })

  it.each([
    ["-1", -1],
    ["0", 0],
    ["31", 31],
    ["1.5", 1.5],
    ['"7" (texto)', "7"],
    ["null", null],
    ["true", true],
    ["[7]", [7]],
    ["1e308", 1e308],
  ])("vigenciaDias %s → 400 VALIDACION, sin token en la respuesta", async (_, vigenciaDias) => {
    const respuesta = await comoAdmin("POST", "/api/admin/enlaces-registro", { vigenciaDias })
    expect(respuesta.statusCode).toBe(400)
    expect(codigoDe(respuesta)).toBe("VALIDACION")
    expect(respuesta.body).not.toMatch(/"token"/)
  })
})

describe("ataque (AUTH-03b r1): autorización de las rutas del admin", () => {
  it("un maestro creado con un enlace, un estudiante y un JWT alterado no llegan a ninguna ruta (incluidos HEAD)", async () => {
    const enlace = await crearEnlace()
    const datos = datosDeRegistro(enlace.token)
    const alta = await registrar(datos)
    expect(alta.statusCode).toBe(201)
    const { tokenAcceso: tokenMaestro } = alta.json<{ tokenAcceso: string }>()
    const creado = await obtenerDb().usuario.findUnique({ where: { email: datos.email } })
    if (creado) ids.push(creado.id)
    const estudiante = await crearUsuarioDePrueba(ids)
    const tokenEstudiante = await firmarTokenDePrueba({ usuarioId: estudiante.id })
    const partes = tokenAdmin.split(".")
    const alterado = `${partes[0]}.${partes[1]}.${(partes[2] ?? "").split("").reverse().join("")}`

    const rutas: ["GET" | "POST" | "HEAD", string, unknown][] = [
      ["POST", "/api/admin/enlaces-registro", { vigenciaDias: 5 }],
      ["GET", "/api/admin/enlaces-registro", undefined],
      ["HEAD", "/api/admin/enlaces-registro", undefined],
      ["POST", `/api/admin/enlaces-registro/${enlace.id}/revocar`, undefined],
      ["GET", `/api/admin/enlaces-registro/${enlace.id}/registrados`, undefined],
      ["HEAD", `/api/admin/enlaces-registro/${enlace.id}/registrados`, undefined],
    ]
    const antes = await obtenerDb().enlaceRegistro.findUnique({ where: { id: enlace.id } })
    for (const [metodo, url, cuerpo] of rutas) {
      const sin = await comoAdmin(metodo, url, cuerpo, null)
      expect(sin.statusCode, `${metodo} ${url} sin token`).toBe(401)
      const conAlterado = await comoAdmin(metodo, url, cuerpo, alterado)
      expect(conAlterado.statusCode, `${metodo} ${url} con JWT alterado`).toBe(401)
      for (const [quien, token] of [
        ["maestro por enlace", tokenMaestro],
        ["estudiante", tokenEstudiante],
      ] as const) {
        const respuesta = await comoAdmin(metodo, url, cuerpo, token)
        expect(respuesta.statusCode, `${metodo} ${url} como ${quien}`).toBe(403)
        if (metodo !== "HEAD") expect(codigoDe(respuesta)).toBe("ROL_NO_PERMITIDO")
        expect(respuesta.body, `${metodo} ${url} como ${quien}`).not.toMatch(/"enlaces"|"token"/)
      }
    }
    const despues = await obtenerDb().enlaceRegistro.findUnique({ where: { id: enlace.id } })
    expect(despues?.revocadoEn).toEqual(antes?.revocadoEn)
    expect(despues?.revocadoEn).toBeNull()
  })
})

describe("ataque (AUTH-03b r1): paginación y cursores", () => {
  it.each([
    ["limite=-1"],
    ["limite=0"],
    ["limite=101"],
    ["limite=1.5"],
    ["limite=abc"],
    ["limite=99999999999999999999"],
    ["limite=1&limite=2"],
    ["cursor=no-es-uuid"],
    ["cursor=%27%20OR%201%3D1%20--"],
    ["cursor=00000000-0000-0000-0000-000000000000&cursor=00000000-0000-0000-0000-000000000001"],
  ])("GET /enlaces-registro?%s → 400 VALIDACION", async (consulta) => {
    const respuesta = await comoAdmin("GET", `/api/admin/enlaces-registro?${consulta}`)
    expect(respuesta.statusCode).toBe(400)
    expect(codigoDe(respuesta)).toBe("VALIDACION")
  })

  it("un cursor inexistente o que es el id de un usuario: nunca 5xx y nada que no sea un enlace", async () => {
    for (const cursor of [randomUUID(), adminId]) {
      const respuesta = await comoAdmin("GET", `/api/admin/enlaces-registro?cursor=${cursor}`)
      expect(respuesta.statusCode, cursor).toBeLessThan(500)
      expect(respuesta.body).not.toMatch(/"email"|"nombre"|"rol"/)
    }
  })

  it("enlaces con el mismo creado_en: recorrer la lista de 2 en 2 los devuelve todos, una sola vez y en orden id DESC", async () => {
    const base = new Date("1990-01-01T00:00:00.000Z")
    const ancla = await crearEnlace({ creadoEn: new Date(base.getTime() + 1) })
    const empatados: string[] = []
    for (let i = 0; i < 6; i += 1) empatados.push((await crearEnlace({ creadoEn: base })).id)

    const vistos: string[] = []
    let cursor: string | null = ancla.id
    for (let vuelta = 0; cursor !== null && vuelta < 20; vuelta += 1) {
      const respuesta: LightMyRequestResponse = await comoAdmin(
        "GET",
        `/api/admin/enlaces-registro?limite=2&cursor=${cursor}`,
      )
      expect(respuesta.statusCode).toBe(200)
      const cuerpo: { enlaces: { id: string }[]; siguienteCursor: string | null } = respuesta.json()
      vistos.push(...cuerpo.enlaces.map((e) => e.id))
      cursor = cuerpo.siguienteCursor
    }
    expect(cursor, "la paginación no terminó en 20 vueltas").toBeNull()
    expect(vistos).toEqual([...empatados].sort().reverse())
  })

  it("registrados: de 1 en 1 con empates en creado_en, todos una vez y en orden; un cursor de otro enlace no mezcla usuarios", async () => {
    const a = await crearEnlace()
    const b = await crearEnlace()
    const momento = new Date(Date.now() - 60_000)
    const crear = async (enlaceId: string, n: number) => {
      const creados: string[] = []
      for (let i = 0; i < n; i += 1) {
        const { id } = await obtenerDb().usuario.create({
          data: {
            email: correoDePrueba("ataque-03b-reg"),
            hashContrasena: "x",
            nombre: "Registrado Ataque",
            nombreBusqueda: "registrado ataque",
            rol: "maestro",
            estadoPago: "deudor",
            enlaceRegistroId: enlaceId,
            creadoEn: momento,
          },
          select: { id: true },
        })
        ids.push(id)
        creados.push(id)
      }
      return creados
    }
    const deA = await crear(a.id, 4)
    const deB = await crear(b.id, 2)

    const vistos: string[] = []
    let cursor: string | null = null
    for (let vuelta = 0; vuelta < 20; vuelta += 1) {
      const consulta: string = cursor === null ? "limite=1" : `limite=1&cursor=${cursor}`
      const respuesta: LightMyRequestResponse = await comoAdmin(
        "GET",
        `/api/admin/enlaces-registro/${a.id}/registrados?${consulta}`,
      )
      expect(respuesta.statusCode).toBe(200)
      const cuerpo: {
        registrados: Record<string, unknown>[]
        siguienteCursor: string | null
      } = respuesta.json()
      for (const r of cuerpo.registrados) {
        expect(Object.keys(r).sort()).toEqual(["creadoEn", "email", "id", "nombre"])
        vistos.push(String(r.id))
      }
      cursor = cuerpo.siguienteCursor
      if (cursor === null) break
    }
    expect(vistos).toEqual([...deA].sort())

    const cruzado = await comoAdmin(
      "GET",
      `/api/admin/enlaces-registro/${a.id}/registrados?cursor=${deB[0] ?? ""}`,
    )
    expect(cruzado.statusCode).toBeLessThan(500)
    if (cruzado.statusCode === 200) {
      const { registrados } = cruzado.json<{ registrados: { id: string }[] }>()
      for (const r of registrados) expect(deA).toContain(r.id)
    }
    expect(cruzado.body).not.toMatch(/estadoPago|deudor/)
  })
})

describe("ataque (AUTH-03b r1): revocar", () => {
  it("un enlace ya vencido se revoca: 200, estado revocado y revocado_en guardado", async () => {
    const enlace = await crearEnlace({ expiraEn: new Date(Date.now() - DIA_MS) })
    const respuesta = await comoAdmin("POST", `/api/admin/enlaces-registro/${enlace.id}/revocar`)
    expect(respuesta.statusCode).toBe(200)
    const { enlace: vista } = respuesta.json<{ enlace: { estado: string; revocadoEn: string } }>()
    expect(vista.estado).toBe("revocado")
    const fila = await obtenerDb().enlaceRegistro.findUnique({ where: { id: enlace.id } })
    expect(fila?.revocadoEn?.toISOString()).toBe(vista.revocadoEn)
  })

  it("dos revocaciones simultáneas: 200 y 200 con el mismo revocado_en", async () => {
    const enlace = await crearEnlace()
    const [uno, dos] = await Promise.all([
      comoAdmin("POST", `/api/admin/enlaces-registro/${enlace.id}/revocar`),
      comoAdmin("POST", `/api/admin/enlaces-registro/${enlace.id}/revocar`),
    ])
    expect([uno.statusCode, dos.statusCode]).toEqual([200, 200])
    const fechas = [uno, dos].map(
      (r) => r.json<{ enlace: { revocadoEn: string } }>().enlace.revocadoEn,
    )
    expect(fechas[0]).toBe(fechas[1])
  })

  it("un :id que no es uuid o es el de un usuario: 400 o 404, nunca 5xx ni un usuario revocado", async () => {
    const noUuid = await comoAdmin("POST", "/api/admin/enlaces-registro/1%20OR%201=1/revocar")
    expect(noUuid.statusCode).toBe(400)
    const deUsuario = await comoAdmin("POST", `/api/admin/enlaces-registro/${adminId}/revocar`)
    expect(deUsuario.statusCode).toBe(404)
    expect(codigoDe(deUsuario)).toBe("ENLACE_NO_ENCONTRADO")
  })
})
