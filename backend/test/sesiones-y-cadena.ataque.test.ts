import { createHmac, randomUUID } from "node:crypto"

import { errorApiSchema } from "@campus/shared"
import Fastify, { type FastifyInstance, type LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { manejoDeErrores } from "../src/handlers/errores.js"
import { authenticate } from "../src/middleware/authenticate.js"
import { protegido, registrarMiddleware } from "../src/middleware/index.js"
import {
  alterarFirma,
  borrarUsuariosDePrueba,
  cargaDeTokenDePrueba,
  contarSesionesVivas,
  crearSesionDePrueba,
  crearUsuarioDePrueba,
  encabezadoCookieRefresco,
  firmarJwtDePrueba,
  firmarTokenDePrueba,
  iniciarSesionDePrueba,
  leerSesiones,
  NOMBRE_COOKIE,
  refrescarDePrueba,
  valorCookieRefresco,
} from "./ayudas-auth.js"

// Ataques del Tester (AUTH-01, ronda 1): JWT, sesiones de refresco, banderas leídas de la base en
// cada petición, rutas expuestas y guarda estructural de rutas (M-09).

let app: FastifyInstance | undefined
const ids: string[] = []
const env = cargarEnv()

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const pedir = (url: string, token?: string, extra: Record<string, string> = {}) =>
  obtenerApp().inject({
    method: "GET",
    url,
    headers: { ...(token === undefined ? {} : { authorization: `Bearer ${token}` }), ...extra },
  })

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

const refrescar = (cookie?: string) => refrescarDePrueba(obtenerApp(), cookie)

const logout = (cookie?: string) =>
  obtenerApp().inject({
    method: "POST",
    url: "/api/auth/logout",
    ...(cookie === undefined ? {} : { cookies: { [NOMBRE_COOKIE]: cookie } }),
  })

const base64url = (dato: string | Buffer): string => Buffer.from(dato).toString("base64url")

// JWT HS512 firmado con el secreto real: el verificador solo debe aceptar HS256.
const firmarHs512 = (payload: Record<string, unknown>): string => {
  const entrada = `${base64url(JSON.stringify({ alg: "HS512", typ: "JWT" }))}.${base64url(JSON.stringify(payload))}`
  return `${entrada}.${createHmac("sha512", env.JWT_SECRET).update(entrada).digest("base64url")}`
}

const conSecretoReal = (payload: Record<string, unknown>): string =>
  firmarJwtDePrueba({ payload, secreto: env.JWT_SECRET })

const actualizarPropio = async (
  id: string,
  data: {
    rol?: "estudiante" | "maestro"
    activo?: boolean
    accesoRestringido?: boolean
    debeCambiarContrasena?: boolean
  },
) => {
  if (!ids.includes(id)) throw new Error("solo se modifican usuarios creados por esta prueba")
  await obtenerDb().usuario.update({ where: { id }, data, select: { id: true } })
}

beforeAll(async () => {
  app = await construirApp({ env })
  // Fuera de /api (la guarda no aplica): rutas de prueba para la cadena completa.
  app.get("/prueba-ataque/solo-admin", protegido({ roles: ["admin"] }), async () => ({ ok: true }))
  app.get("/prueba-ataque/solo-maestro", protegido({ roles: ["maestro"] }), async () => ({
    ok: true,
  }))
  app.get("/prueba-ataque/cualquiera", protegido(), async () => ({ ok: true }))
  await app.ready()
})

afterAll(async () => {
  await borrarUsuariosDePrueba(ids)
  await app?.close()
})

describe("ataque: JWT manipulado", () => {
  it("rechaza HS512 firmado con el secreto real (solo HS256)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const token = firmarHs512(cargaDeTokenDePrueba({ usuarioId: usuario.id, ahora: new Date() }))
    const respuesta = await pedir("/api/me", token)
    expect(respuesta.statusCode).toBe(401)
    expect(codigoDe(respuesta)).toBe("NO_AUTENTICADO")
  })

  it.each(["none", "None", "NONE", "nOnE"])("rechaza alg %s con firma vacía", async (alg) => {
    const usuario = await crearUsuarioDePrueba(ids)
    const carga = base64url(
      JSON.stringify(cargaDeTokenDePrueba({ usuarioId: usuario.id, ahora: new Date() })),
    )
    const token = `${base64url(JSON.stringify({ alg, typ: "JWT" }))}.${carga}.`
    expect((await pedir("/api/me", token)).statusCode).toBe(401)
  })

  it("rechaza un token que reutiliza la firma de otro con la carga cambiada (sub de otro usuario)", async () => {
    const victima = await crearUsuarioDePrueba(ids)
    const atacante = await crearUsuarioDePrueba(ids)
    const propio = await firmarTokenDePrueba({ usuarioId: atacante.id })
    const [cabecera, carga, firma] = propio.split(".")
    const claims = JSON.parse(Buffer.from(carga ?? "", "base64url").toString("utf8")) as Record<
      string,
      unknown
    >
    const falsificado = `${cabecera}.${base64url(JSON.stringify({ ...claims, sub: victima.id }))}.${firma}`
    expect((await pedir("/api/me", falsificado)).statusCode).toBe(401)
  })

  it.each([
    ["sub vacío", ""],
    ["sub con SQL", "' OR '1'='1"],
    ["sub numérico", 42],
    ["sub con espacios", ` ${randomUUID()} `],
    ["sub nulo", null],
  ])("rechaza %s aunque la firma sea correcta", async (_, sub) => {
    const carga = { ...cargaDeTokenDePrueba({ usuarioId: "x", ahora: new Date() }), sub }
    expect((await pedir("/api/me", conSecretoReal(carga))).statusCode).toBe(401)
  })

  it("el rol dentro del token se ignora: un estudiante con rol admin en la carga no pasa una ruta de admin", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const carga = {
      ...cargaDeTokenDePrueba({ usuarioId: usuario.id, ahora: new Date() }),
      rol: "admin",
      accesoRestringido: false,
    }
    const respuesta = await pedir("/prueba-ataque/solo-admin", conSecretoReal(carga))
    expect(respuesta.statusCode).toBe(403)
    expect(codigoDe(respuesta)).toBe("ROL_NO_PERMITIDO")
  })

  it("el token no sirve fuera del encabezado Authorization (query, cookie, esquema distinto)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const token = await firmarTokenDePrueba({ usuarioId: usuario.id })
    const casos = [
      await pedir(`/api/me?token=${token}&access_token=${token}`),
      await pedir("/api/me", undefined, {
        cookie: `tokenAcceso=${token}; ${NOMBRE_COOKIE}=${token}`,
      }),
      await pedir("/api/me", undefined, { authorization: `Basic ${token}` }),
      await pedir("/api/me", undefined, { authorization: token }),
      await pedir("/api/me", undefined, { authorization: "Bearer " }),
    ]
    for (const respuesta of casos) expect(respuesta.statusCode).toBe(401)
  })

  it("el vencimiento es exacto: firmado hace 14:50 vale; hace 15:01 no", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const vigente = await firmarTokenDePrueba({
      usuarioId: usuario.id,
      ahora: new Date(Date.now() - (15 * 60 - 10) * 1000),
    })
    const vencido = await firmarTokenDePrueba({
      usuarioId: usuario.id,
      ahora: new Date(Date.now() - (15 * 60 + 1) * 1000),
    })
    expect((await pedir("/api/me", vigente)).statusCode).toBe(200)
    expect((await pedir("/api/me", vencido)).statusCode).toBe(401)
  })

  it("rechaza un JWT sin exp aunque la firma sea correcta (el acceso dura 15 min, no para siempre)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { exp: _exp, ...sinExp } = cargaDeTokenDePrueba({
      usuarioId: usuario.id,
      ahora: new Date(),
    })
    void _exp
    const respuesta = await pedir("/api/me", conSecretoReal(sinExp))
    expect(respuesta.statusCode).toBe(401)
  })

  it("rechaza un JWT con una vigencia mayor a 15 minutos (exp a un año)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const carga = cargaDeTokenDePrueba({
      usuarioId: usuario.id,
      ahora: new Date(),
      duracionS: 365 * 24 * 3600,
    })
    const respuesta = await pedir("/api/me", conSecretoReal(carga))
    expect(respuesta.statusCode).toBe(401)
  })

  it("alterarFirma (ayuda del programador) siempre invalida el token: si no, 'firma alterada → 401' es aleatoria", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    // La firma HS256 son 32 bytes = 43 caracteres base64url; el último solo aporta 4 bits útiles.
    // Si termina en "A", alterarFirma pone "B", que decodifica a los mismos bytes.
    let terminadoEnA: string | undefined
    for (let i = 0; i < 400 && !terminadoEnA; i += 1) {
      const token = await firmarTokenDePrueba({
        usuarioId: usuario.id,
        ahora: new Date(Date.now() - i * 1000),
      })
      if (token.endsWith("A")) terminadoEnA = token
    }
    if (!terminadoEnA) throw new Error("no apareció una firma terminada en A en 400 intentos")

    const alterado = alterarFirma(terminadoEnA)
    expect(alterado).not.toBe(terminadoEnA)
    expect((await pedir("/api/me", alterado)).statusCode).toBe(401)
  })

  it("un usuario borrado deja de autenticar aunque su token siga vigente", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const token = await firmarTokenDePrueba({ usuarioId: usuario.id })
    expect((await pedir("/api/me", token)).statusCode).toBe(200)
    await borrarUsuariosDePrueba([usuario.id])
    expect((await pedir("/api/me", token)).statusCode).toBe(401)
  })
})

describe("ataque: rol y banderas se leen de la base en cada petición (mismo JWT)", () => {
  it("rol, activo, acceso_restringido y debe_cambiar_contrasena tienen efecto inmediato y reversible", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const token = await firmarTokenDePrueba({ usuarioId: usuario.id })

    expect((await pedir("/prueba-ataque/solo-maestro", token)).statusCode).toBe(403)

    await actualizarPropio(usuario.id, { rol: "maestro" })
    expect((await pedir("/api/me", token)).json()).toMatchObject({ rol: "maestro" })
    expect((await pedir("/prueba-ataque/solo-maestro", token)).statusCode).toBe(200)
    expect((await pedir("/prueba-ataque/solo-admin", token)).statusCode).toBe(403)

    await actualizarPropio(usuario.id, { rol: "estudiante", activo: false })
    expect((await pedir("/api/me", token)).statusCode).toBe(401)
    expect((await pedir("/prueba-ataque/cualquiera", token)).statusCode).toBe(401)

    await actualizarPropio(usuario.id, { activo: true, accesoRestringido: true })
    const meRestringido = await pedir("/api/me", token)
    expect(meRestringido.statusCode).toBe(200)
    expect(meRestringido.json()).toMatchObject({ accesoRestringido: true })
    const bloqueada = await pedir("/prueba-ataque/cualquiera", token)
    expect(bloqueada.statusCode).toBe(403)
    expect(codigoDe(bloqueada)).toBe("ACCESO_RESTRINGIDO")

    await actualizarPropio(usuario.id, { accesoRestringido: false, debeCambiarContrasena: true })
    const meCambio = await pedir("/api/me", token)
    expect(meCambio.statusCode).toBe(403)
    expect(codigoDe(meCambio)).toBe("CAMBIO_DE_CONTRASENA_REQUERIDO")
    expect((await pedir("/prueba-ataque/cualquiera", token)).statusCode).toBe(403)

    await actualizarPropio(usuario.id, { debeCambiarContrasena: false })
    expect((await pedir("/prueba-ataque/cualquiera", token)).statusCode).toBe(200)
  })

  it("rama positiva de requireRole(['admin']) con el admin real (solo lectura, sin sesiones)", async () => {
    const admin = await obtenerDb().usuario.findFirst({
      where: { rol: "admin" },
      select: { id: true },
    })
    if (!admin) return
    const token = await firmarTokenDePrueba({ usuarioId: admin.id })
    expect((await pedir("/prueba-ataque/solo-admin", token)).statusCode).toBe(200)
    expect((await pedir("/prueba-ataque/solo-maestro", token)).statusCode).toBe(403)
  })

  it("un restringido solo pasa por GET /api/me; HEAD /api/me sin token también es 401", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { accesoRestringido: true })
    const token = await firmarTokenDePrueba({ usuarioId: usuario.id })
    expect((await pedir("/api/me", token)).statusCode).toBe(200)
    expect((await pedir("/prueba-ataque/cualquiera", token)).statusCode).toBe(403)
    const head = await obtenerApp().inject({ method: "HEAD", url: "/api/me" })
    expect(head.statusCode).toBe(401)
  })

  it("GET /api/me nunca trae estadoPago, aunque el alumno sea deudor", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    await obtenerDb().usuario.update({
      where: { id: usuario.id },
      data: { estadoPago: "deudor" },
      select: { id: true },
    })
    const token = await firmarTokenDePrueba({ usuarioId: usuario.id })
    const respuesta = await pedir("/api/me", token)
    expect(respuesta.statusCode).toBe(200)
    expect(respuesta.body).not.toMatch(/estadoPago|estado_pago|deudor|al_corriente|hash|activo/i)
    expect(Object.keys(respuesta.json<Record<string, unknown>>()).sort()).toEqual([
      "accesoRestringido",
      "debeCambiarContrasena",
      "email",
      "id",
      "nombre",
      "rol",
    ])
  })
})

describe("ataque: sesiones de refresco", () => {
  it("reutilizar un token rotado revoca las sesiones de TODOS los dispositivos del usuario (P-04)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const telefono = await iniciarSesionDePrueba(obtenerApp(), usuario)
    const laptop = await iniciarSesionDePrueba(obtenerApp(), usuario)

    const rotada = await refrescar(telefono.cookie)
    expect(rotada.statusCode).toBe(200)
    expect(await contarSesionesVivas(usuario.id)).toBe(2)

    const repetida = await refrescar(telefono.cookie)
    expect(repetida.statusCode).toBe(401)
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
    expect((await refrescar(laptop.cookie)).statusCode).toBe(401)
  })

  it("10 refrescos concurrentes con el mismo token: a lo sumo uno 200 y ninguna sesión viva al final (M-06)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await iniciarSesionDePrueba(obtenerApp(), usuario)

    const respuestas = await Promise.all(Array.from({ length: 10 }, () => refrescar(sesion.cookie)))
    const exitos = respuestas.filter((respuesta) => respuesta.statusCode === 200)
    expect(exitos.length).toBeLessThanOrEqual(1)
    expect(respuestas.every((r) => r.statusCode === 200 || r.statusCode === 401)).toBe(true)
    expect(await contarSesionesVivas(usuario.id)).toBe(0)

    // Ninguna sesión huérfana: como mucho la original más la del único ganador.
    const sesiones = await leerSesiones(usuario.id)
    expect(sesiones.length).toBeLessThanOrEqual(2)
    for (const exito of exitos) {
      const cookieGanadora = valorCookieRefresco(exito)
      expect((await refrescar(cookieGanadora)).statusCode).toBe(401)
    }
  })

  it("logout con el token viejo (ya rotado) no reabre nada ni revoca la sesión nueva", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await iniciarSesionDePrueba(obtenerApp(), usuario)
    const rotada = await refrescar(sesion.cookie)
    const nueva = valorCookieRefresco(rotada)

    expect((await logout(sesion.cookie)).statusCode).toBe(204)
    expect(await contarSesionesVivas(usuario.id)).toBe(1)
    expect((await refrescar(nueva)).statusCode).toBe(200)
  })

  it("logout dos veces, con cookie basura o sin cookie: siempre 204 sin cuerpo", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await iniciarSesionDePrueba(obtenerApp(), usuario)
    for (const cookie of [sesion.cookie, sesion.cookie, "basura", undefined, "x".repeat(4000)]) {
      const respuesta = await logout(cookie)
      expect(respuesta.statusCode).toBe(204)
      expect(respuesta.body).toBe("")
    }
    expect((await refrescar(sesion.cookie)).statusCode).toBe(401)
  })

  it("una sesión vencida hace 1 ms no rota; una que vence en 1 minuto sí", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const vencida = await crearSesionDePrueba({
      usuarioId: usuario.id,
      expiraEn: new Date(Date.now() - 1),
    })
    const casi = await crearSesionDePrueba({
      usuarioId: usuario.id,
      expiraEn: new Date(Date.now() + 60_000),
    })
    expect((await refrescar(vencida.token)).statusCode).toBe(401)
    expect((await refrescar(casi.token)).statusCode).toBe(200)
  })

  it("restringido o con cambio pendiente puede refrescar (RN-03 permite iniciar sesión)", async () => {
    const restringido = await crearUsuarioDePrueba(ids, { accesoRestringido: true })
    const cambio = await crearUsuarioDePrueba(ids, { debeCambiarContrasena: true })
    const a = await iniciarSesionDePrueba(obtenerApp(), restringido)
    const b = await iniciarSesionDePrueba(obtenerApp(), cambio)
    expect((await refrescar(a.cookie)).statusCode).toBe(200)
    expect((await refrescar(b.cookie)).statusCode).toBe(200)
  })

  it("la cookie del refresco tiene exactamente los atributos de DEC-07 (sin Secure ni Domain en dev)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await iniciarSesionDePrueba(obtenerApp(), usuario)
    const rotada = await refrescar(sesion.cookie)
    const crudo = encabezadoCookieRefresco(rotada) ?? ""
    expect(crudo).toMatch(
      /^campus_refresco=[A-Za-z0-9_-]{43}; Max-Age=2592000; Path=\/api\/auth; HttpOnly; SameSite=Strict$/,
    )
    const deLogin = encabezadoCookieRefresco(sesion.respuesta) ?? ""
    expect(deLogin).toMatch(
      /^campus_refresco=[A-Za-z0-9_-]{43}; Max-Age=2592000; Path=\/api\/auth; HttpOnly; SameSite=Strict$/,
    )
  })

  it("refrescar por GET no existe y la cookie no autentica en /api/me", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await iniciarSesionDePrueba(obtenerApp(), usuario)
    const porGet = await obtenerApp().inject({
      method: "GET",
      url: "/api/auth/refrescar",
      cookies: { [NOMBRE_COOKIE]: sesion.cookie },
    })
    expect(porGet.statusCode).toBe(404)
    const me = await obtenerApp().inject({
      method: "GET",
      url: "/api/me",
      cookies: { [NOMBRE_COOKIE]: sesion.cookie },
    })
    expect(me.statusCode).toBe(401)
  })
})

describe("ataque: superficie de rutas", () => {
  it("bajo /api solo existen las 6 rutas de AUTH-01: ninguna crea admins ni maestros", () => {
    const arbol = obtenerApp().printRoutes({ commonPrefix: false })
    const rutas = new Set<string>()
    for (const linea of arbol.split("\n")) {
      const coincidencia = /(\/\S*) \(([^)]+)\)/.exec(linea)
      if (!coincidencia) continue
      const [, url, metodos] = coincidencia
      if (!url?.startsWith("/api")) continue
      for (const metodo of (metodos ?? "").split(", ")) rutas.add(`${metodo} ${url}`)
    }
    expect([...rutas].sort()).toEqual([
      "GET /api/me",
      "GET /api/salud",
      "HEAD /api/me",
      "HEAD /api/salud",
      "POST /api/auth/login",
      "POST /api/auth/logout",
      "POST /api/auth/refrescar",
      "POST /api/auth/registro",
    ])
  })
})

describe("ataque: guarda estructural de rutas (M-09)", () => {
  it("una ruta /api con authenticate pero sin el resto de la cadena debe impedir el arranque", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { accesoRestringido: true, activo: false })
    const token = await firmarTokenDePrueba({ usuarioId: usuario.id })

    const suelta = Fastify({ logger: false })
    await suelta.register(manejoDeErrores)
    registrarMiddleware(suelta)
    let arranco = true
    try {
      await suelta.register(
        async (hijo) => {
          hijo.get("/parcial", { preHandler: [authenticate] }, async () => ({ datos: "privados" }))
        },
        { prefix: "/api/prueba" },
      )
      await suelta.ready()
    } catch {
      arranco = false
    }
    const alcanzada = arranco
      ? (
          await suelta.inject({
            method: "GET",
            url: "/api/prueba/parcial",
            headers: { authorization: `Bearer ${token}` },
          })
        ).statusCode
      : "no aplica"
    await suelta.close()

    // Con la cadena completa, un usuario inactivo y restringido recibiría 401; aquí llega al handler.
    expect({ arranco, alcanzada }).toEqual({ arranco: false, alcanzada: "no aplica" })
  })

  it("una ruta paramétrica que atrapa /api/* sin protegido() debe impedir el arranque", async () => {
    const suelta = Fastify({ logger: false })
    await suelta.register(manejoDeErrores)
    registrarMiddleware(suelta)
    let arranco = true
    try {
      await suelta.register(async (hijo) => {
        hijo.get("/:seccion/secreto", async () => ({ datos: "privados" }))
      })
      await suelta.ready()
    } catch {
      arranco = false
    }
    const alcanzada = arranco
      ? (await suelta.inject({ method: "GET", url: "/api/secreto" })).statusCode
      : "no aplica"
    await suelta.close()

    expect({ arranco, alcanzada }).toEqual({ arranco: false, alcanzada: "no aplica" })
  })
})
