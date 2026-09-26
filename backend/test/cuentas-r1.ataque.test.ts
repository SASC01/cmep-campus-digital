import { createHash, createHmac, randomUUID } from "node:crypto"

import { errorApiSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { derivarTokenDeCuenta, hashContrasena } from "../src/adapters/auth/index.js"
import { ejecutorSqlDe, obtenerDb } from "../src/adapters/db/cliente.js"
import { crearMaestroInvitado } from "../src/adapters/db/index.js"
import { encolar } from "../src/adapters/queue/index.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  contarSesionesVivas,
  correoDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  iniciarSesionDePrueba,
  NOMBRE_COOKIE,
} from "./ayudas-auth.js"
import { procesarCorreoDeCuenta } from "../src/workers/correo-de-cuenta.js"
import { buscarTrabajosPorCorreo, crearTokenDePrueba, leerTokens } from "./ayudas-cuentas.js"
import { crearNotifierEnMemoria } from "./notifier-en-memoria.js"

// Ataques del Tester (AUTH-02a, ronda 1) contra los endpoints de cuentas: enumeración por
// recuperar, tokens de enlace, cambio obligatorio, rutas del admin y encolado transaccional.

let app: FastifyInstance | undefined
const ids: string[] = []
const env = cargarEnv()

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env })
  await app.ready()
})

afterAll(async () => {
  await borrarUsuariosDePrueba(ids)
  await app?.close()
})

const esperar = (ms: number): Promise<"tiempo"> =>
  new Promise((resolver) => setTimeout(() => resolver("tiempo"), ms))

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

const sinFecha = (respuesta: LightMyRequestResponse): Record<string, unknown> => {
  const resto: Record<string, unknown> = { ...respuesta.headers }
  delete resto.date
  return resto
}

const post = (url: string, payload: unknown, token?: string, ip?: string) =>
  obtenerApp().inject({
    method: "POST",
    url,
    headers: {
      "content-type": "application/json",
      ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
    },
    payload: typeof payload === "string" ? payload : JSON.stringify(payload),
    ...(ip === undefined ? {} : { remoteAddress: ip }),
  })

const login = (email: string, contrasena: string) =>
  post(
    "/api/auth/login",
    { email, contrasena },
    undefined,
    `10.77.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
  )

const adminId = async (): Promise<string> => {
  const admin = await obtenerDb().usuario.findFirst({
    where: { rol: "admin" },
    select: { id: true },
  })
  expect(admin, "la base desechable debe tener el admin que crea seed:admin").not.toBeNull()
  if (!admin) throw new Error("Precondición: falta el admin de la base desechable")
  return admin.id
}

const tokenAdmin = async (): Promise<string> => firmarTokenDePrueba({ usuarioId: await adminId() })

const treintaMinutos = (): Date => new Date(Date.now() + 30 * 60_000)

describe("ataque: enumeración por /auth/recuperar", () => {
  it("existente, inexistente, inactiva, admin y maestro pendiente: mismo estado, cuerpo y encabezados", async () => {
    const existente = await crearUsuarioDePrueba(ids)
    const inactiva = await crearUsuarioDePrueba(ids, { activo: false })
    const maestro = await crearUsuarioDePrueba(ids, { rol: "maestro" })
    const correoAdmin = process.env.ADMIN_EMAIL ?? ""
    expect(correoAdmin.length, "setup.ts debe exponer ADMIN_EMAIL").toBeGreaterThan(0)

    const correos = [
      existente.email,
      correoDePrueba("no-existe"),
      inactiva.email,
      correoAdmin,
      maestro.email,
    ]
    const respuestas: LightMyRequestResponse[] = []
    for (const [indice, correo] of correos.entries()) {
      respuestas.push(
        await post("/api/auth/recuperar", { email: correo }, undefined, `10.61.0.${indice + 1}`),
      )
    }

    const referencia = respuestas[0]
    if (!referencia) throw new Error("sin respuestas")
    for (const respuesta of respuestas) {
      expect(respuesta.statusCode).toBe(204)
      expect(respuesta.body).toBe("")
      expect(sinFecha(respuesta)).toEqual(sinFecha(referencia))
    }
  })

  it("con la tabla usuarios bloqueada por otra transacción, recuperar responde igual y a tiempo", async () => {
    const existente = await crearUsuarioDePrueba(ids)
    let pendiente: Promise<LightMyRequestResponse> | undefined
    const resultado = await obtenerDb().$transaction(
      async (tx) => {
        await tx.$executeRaw`LOCK TABLE usuarios IN ACCESS EXCLUSIVE MODE`
        pendiente = post("/api/auth/recuperar", { email: existente.email }, undefined, "10.62.0.1")
        return Promise.race([pendiente, esperar(1500)])
      },
      { timeout: 10_000, maxWait: 5_000 },
    )
    const final = await pendiente
    expect(resultado, "recuperar esperó a la tabla usuarios").not.toBe("tiempo")
    expect(final?.statusCode).toBe(204)
  })

  it("el 429 es idéntico para un correo existente y uno inexistente", async () => {
    const existente = await crearUsuarioDePrueba(ids)
    const inexistente = correoDePrueba("no-existe-429")
    const cuartas: LightMyRequestResponse[] = []
    for (const correo of [existente.email, inexistente]) {
      let ultima: LightMyRequestResponse | undefined
      for (let intento = 0; intento < 4; intento += 1) {
        ultima = await post("/api/auth/recuperar", { email: correo }, undefined, "10.63.0.1")
      }
      if (!ultima) throw new Error("sin respuesta")
      cuartas.push(ultima)
    }
    const [a, b] = cuartas
    if (!a || !b) throw new Error("faltan respuestas")
    expect(a.statusCode).toBe(429)
    expect(b.statusCode).toBe(429)
    expect(a.body).toBe(b.body)
    expect(sinFecha(a)).toEqual(sinFecha(b))
    expect(a.body).not.toContain(existente.email)
  })

  it.each([
    ["arreglo", { email: ["a@pruebas.local", "b@pruebas.local"] }],
    ["10 KB", { email: `${"a".repeat(10_000)}@pruebas.local` }],
    ["null", { email: null }],
    ["objeto", { email: { $ne: "" } }],
    ["sin arroba", { email: "' OR 1=1 --" }],
  ])("email %s → 400 VALIDACION sin eco del valor", async (_nombre, cuerpo) => {
    const respuesta = await post("/api/auth/recuperar", cuerpo, undefined, "10.64.0.1")
    expect(respuesta.statusCode).toBe(400)
    expect(codigoDe(respuesta)).toBe("VALIDACION")
    expect(respuesta.body).not.toContain("OR 1=1")
    expect(respuesta.body).not.toContain("aaaaaaaaaa")
  })
})

describe("ataque: tokens de enlace", () => {
  it("el token de A con el id y el correo de B en el cuerpo solo cambia la contraseña de A", async () => {
    const a = await crearUsuarioDePrueba(ids)
    const b = await crearUsuarioDePrueba(ids)
    const { token } = await crearTokenDePrueba({
      usuarioId: a.id,
      tipo: "recuperacion",
      expiraEn: treintaMinutos(),
    })
    const nueva = "contrasena-de-a-nueva-1"
    const respuesta = await post("/api/auth/restablecer", {
      token,
      contrasena: nueva,
      usuarioId: b.id,
      id: b.id,
      email: b.email,
    })
    expect(respuesta.statusCode).toBe(204)
    expect((await login(b.email, b.contrasena)).statusCode).toBe(200)
    expect((await login(b.email, nueva)).statusCode).toBe(401)
    expect((await login(a.email, nueva)).statusCode).toBe(200)
  })

  it.each([
    ["vacío", ""],
    ["10 KB", "A".repeat(10_240)],
    ["fuera de base64url", "%%%%/+==$$$$<script>"],
    ["número", 12345],
    ["null", null],
    ["arreglo", ["a", "b"]],
    ["objeto", { $gt: "" }],
  ])("token %s → 400 sin 500 ni eco", async (_nombre, token) => {
    const respuesta = await post("/api/auth/restablecer", {
      token,
      contrasena: "contrasena-cualquiera-1",
    })
    expect(respuesta.statusCode).toBe(400)
    expect(["VALIDACION", "ENLACE_INVALIDO"]).toContain(codigoDe(respuesta))
    expect(respuesta.body).not.toContain("script")
  })

  it("un token válido con espacios alrededor no vale y no consume el token", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { token } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: treintaMinutos(),
    })
    const conEspacios = await post("/api/auth/restablecer", {
      token: ` ${token} `,
      contrasena: "contrasena-nueva-1234",
    })
    expect(conEspacios.statusCode).toBe(400)
    expect(codigoDe(conEspacios)).toBe("ENLACE_INVALIDO")
    const limpio = await post("/api/auth/restablecer", {
      token,
      contrasena: "contrasena-nueva-1234",
    })
    expect(limpio.statusCode).toBe(204)
  })

  it("un token vencido por 1 ms no vale; uno que vence en 5 s sí", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const vencido = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: new Date(Date.now() - 1),
    })
    const vivo = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: new Date(Date.now() + 5_000),
    })
    const r1 = await post("/api/auth/restablecer", {
      token: vencido.token,
      contrasena: "contrasena-nueva-1234",
    })
    expect(r1.statusCode).toBe(400)
    expect(codigoDe(r1)).toBe("ENLACE_INVALIDO")
    const r2 = await post("/api/auth/restablecer", {
      token: vivo.token,
      contrasena: "contrasena-nueva-1234",
    })
    expect(r2.statusCode).toBe(204)
  })

  it("la corrección de correo por el admin invalida el enlace vivo de punta a punta", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { token } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: treintaMinutos(),
    })
    const correccion = await obtenerApp().inject({
      method: "PUT",
      url: `/api/admin/usuarios/${usuario.id}/correo`,
      headers: { authorization: `Bearer ${await tokenAdmin()}` },
      payload: { email: correoDePrueba("corregido") },
    })
    expect(correccion.statusCode).toBe(200)
    const uso = await post("/api/auth/restablecer", { token, contrasena: "contrasena-nueva-1234" })
    expect(uso.statusCode).toBe(400)
    expect(codigoDe(uso)).toBe("ENLACE_INVALIDO")
  })

  it("el restablecimiento por el admin invalida el enlace de invitación de punta a punta", async () => {
    const maestro = await crearUsuarioDePrueba(ids, { rol: "maestro" })
    const { token } = await crearTokenDePrueba({
      usuarioId: maestro.id,
      tipo: "invitacion",
      expiraEn: new Date(Date.now() + 72 * 3_600_000),
    })
    const reset = await post(
      `/api/admin/usuarios/${maestro.id}/restablecer-contrasena`,
      {},
      await tokenAdmin(),
    )
    expect(reset.statusCode).toBe(200)
    const uso = await post("/api/auth/establecer-contrasena", {
      token,
      contrasena: "contrasena-nueva-1234",
    })
    expect(uso.statusCode).toBe(400)
    expect(codigoDe(uso)).toBe("ENLACE_INVALIDO")
  })

  it("invitación y recuperación vivas de un maestro pendiente usadas a la vez: un 204 y un 400, nunca un 500", async () => {
    // S-09: un maestro invitado puede pedir recuperación, así que ambos enlaces conviven vivos.
    const maestro = await crearUsuarioDePrueba(ids, { rol: "maestro" })
    const invitacion = await crearTokenDePrueba({
      usuarioId: maestro.id,
      tipo: "invitacion",
      expiraEn: new Date(Date.now() + 72 * 3_600_000),
    })
    const recuperacion = await crearTokenDePrueba({
      usuarioId: maestro.id,
      tipo: "recuperacion",
      expiraEn: treintaMinutos(),
    })

    // Se retiene la fila del usuario un momento para que las dos peticiones lleguen juntas a la
    // transacción de consumo (cada una ya marcó su propio token cuando espera por el usuario).
    let peticiones: Promise<LightMyRequestResponse[]> | undefined
    await obtenerDb().$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${maestro.id}::uuid FOR UPDATE`
        peticiones = Promise.all([
          post("/api/auth/establecer-contrasena", {
            token: invitacion.token,
            contrasena: "contrasena-por-invitacion-1",
          }),
          post("/api/auth/restablecer", {
            token: recuperacion.token,
            contrasena: "contrasena-por-recuperacion-1",
          }),
        ])
        await esperar(1500)
      },
      { timeout: 15_000, maxWait: 5_000 },
    )
    if (!peticiones) throw new Error("no se lanzaron las peticiones")
    const respuestas = await peticiones

    const estados = respuestas.map((respuesta) => respuesta.statusCode).sort()
    expect(estados).toEqual([204, 400])
    const vivos = (await leerTokens(maestro.id)).filter(
      (fila) => fila.usadoEn === null && fila.revocadoEn === null,
    )
    expect(vivos).toHaveLength(0)
  }, 30_000)

  it("ni tokens_cuenta ni pgboss.job guardan el token ni algo que lo reconstruya sin la clave", async () => {
    const correo = correoDePrueba("invitado-token")
    const respuesta = await post(
      "/api/admin/maestros",
      { nombre: "Invitado Token", email: correo },
      await tokenAdmin(),
    )
    expect(respuesta.statusCode).toBe(201)
    const { id: usuarioId } = respuesta.json<{ id: string }>()
    ids.push(usuarioId)

    const [fila] = await obtenerDb().$queryRaw<{ id: string; texto: string }[]>`
      SELECT id::text AS id, to_jsonb(t)::text AS texto FROM tokens_cuenta t WHERE usuario_id = ${usuarioId}::uuid
    `
    expect(fila, "la invitación debe crear un token").toBeDefined()
    if (!fila) throw new Error("sin token")
    const [trabajo] = await obtenerDb().$queryRaw<{ texto: string }[]>`
      SELECT to_jsonb(j)::text AS texto FROM pgboss.job j WHERE id = ${fila.id}::uuid
    `
    expect(trabajo, "la invitación debe encolar un trabajo con el id del token").toBeDefined()
    if (!trabajo) throw new Error("sin trabajo")

    const { token } = derivarTokenDeCuenta(fila.id)
    expect(fila.texto).not.toContain(token)
    expect(trabajo.texto).not.toContain(token)
    expect(trabajo.texto).not.toContain(correo)
    // El token no se obtiene del id sin la clave derivada (ni con JWT_SECRET directo, ni con SHA-256).
    expect(createHmac("sha256", env.JWT_SECRET).update(fila.id).digest("base64url")).not.toBe(token)
    expect(createHash("sha256").update(fila.id).digest("base64url")).not.toBe(token)
    expect(fila.texto).toContain(createHash("sha256").update(token).digest("hex"))
  })
})

describe("ataque: cambio obligatorio de contraseña", () => {
  it("con la cookie de OTRO usuario: la sesión ajena no se conserva ni se revoca", async () => {
    const a = await crearUsuarioDePrueba(ids, { debeCambiarContrasena: true })
    const b = await crearUsuarioDePrueba(ids)
    const sesionA = await iniciarSesionDePrueba(obtenerApp(), a)
    const sesionB = await iniciarSesionDePrueba(obtenerApp(), b)

    const respuesta = await obtenerApp().inject({
      method: "POST",
      url: "/api/auth/cambiar-contrasena",
      headers: { authorization: `Bearer ${sesionA.tokenAcceso}` },
      cookies: { [NOMBRE_COOKIE]: sesionB.cookie },
      payload: { contrasenaActual: a.contrasena, contrasenaNueva: "contrasena-nueva-de-a-1" },
    })
    expect(respuesta.statusCode).toBe(204)
    expect(await contarSesionesVivas(a.id)).toBe(0)
    expect(await contarSesionesVivas(b.id)).toBe(1)
  })

  it("un restringido con bandera cambia la contraseña y después solo ve /me; un segundo cambio → 409", async () => {
    const usuario = await crearUsuarioDePrueba(ids, {
      accesoRestringido: true,
      debeCambiarContrasena: true,
    })
    const token = await firmarTokenDePrueba({ usuarioId: usuario.id })
    const cambio = await post(
      "/api/auth/cambiar-contrasena",
      { contrasenaActual: usuario.contrasena, contrasenaNueva: "contrasena-nueva-rest-1" },
      token,
    )
    expect(cambio.statusCode).toBe(204)

    const me = await obtenerApp().inject({
      method: "GET",
      url: "/api/me",
      headers: { authorization: `Bearer ${token}` },
    })
    expect(me.statusCode).toBe(200)
    const admin = await post("/api/admin/usuarios/buscar", { email: usuario.email }, token)
    expect(admin.statusCode).toBe(403)
    expect(codigoDe(admin)).toBe("ACCESO_RESTRINGIDO")
    const otraVez = await post(
      "/api/auth/cambiar-contrasena",
      { contrasenaActual: "contrasena-nueva-rest-1", contrasenaNueva: "contrasena-nueva-rest-2" },
      token,
    )
    expect(otraVez.statusCode).toBe(409)
    expect(codigoDe(otraVez)).toBe("CAMBIO_NO_REQUERIDO")
  })

  it("un restringido SIN bandera recibe 409 y nada cambia (contraseña ni sesiones)", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { accesoRestringido: true })
    const sesion = await iniciarSesionDePrueba(obtenerApp(), usuario)
    const respuesta = await post(
      "/api/auth/cambiar-contrasena",
      { contrasenaActual: usuario.contrasena, contrasenaNueva: "contrasena-nueva-409-1" },
      sesion.tokenAcceso,
    )
    expect(respuesta.statusCode).toBe(409)
    expect(await contarSesionesVivas(usuario.id)).toBe(1)
    expect((await login(usuario.email, usuario.contrasena)).statusCode).toBe(200)
  })

  it("tras 5 temporales incorrectas, la 6.ª con la temporal CORRECTA también es 429 y la bandera sigue", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { debeCambiarContrasena: true })
    const token = await firmarTokenDePrueba({ usuarioId: usuario.id })
    for (let intento = 0; intento < 5; intento += 1) {
      const fallo = await post(
        "/api/auth/cambiar-contrasena",
        { contrasenaActual: `incorrecta-${intento}`, contrasenaNueva: "contrasena-nueva-fb-1" },
        token,
      )
      expect(fallo.statusCode).toBe(400)
    }
    const sexta = await post(
      "/api/auth/cambiar-contrasena",
      { contrasenaActual: usuario.contrasena, contrasenaNueva: "contrasena-nueva-fb-1" },
      token,
    )
    expect(sexta.statusCode).toBe(429)
    const fila = await obtenerDb().usuario.findUnique({
      where: { id: usuario.id },
      select: { debeCambiarContrasena: true },
    })
    expect(fila?.debeCambiarContrasena).toBe(true)
  })

  it("con la bandera, GET /me y las 4 rutas de admin responden 403 CAMBIO_DE_CONTRASENA_REQUERIDO", async () => {
    const maestro = await crearUsuarioDePrueba(ids, { rol: "maestro", debeCambiarContrasena: true })
    const token = await firmarTokenDePrueba({ usuarioId: maestro.id })
    const id = randomUUID()
    const respuestas = [
      await obtenerApp().inject({
        method: "GET",
        url: "/api/me",
        headers: { authorization: `Bearer ${token}` },
      }),
      await post("/api/admin/maestros", { nombre: "X Y", email: correoDePrueba("x") }, token),
      await post("/api/admin/usuarios/buscar", { email: maestro.email }, token),
      await post(`/api/admin/usuarios/${id}/restablecer-contrasena`, {}, token),
      await obtenerApp().inject({
        method: "PUT",
        url: `/api/admin/usuarios/${id}/correo`,
        headers: { authorization: `Bearer ${token}` },
        payload: { email: correoDePrueba("y") },
      }),
    ]
    for (const respuesta of respuestas) {
      expect(respuesta.statusCode).toBe(403)
      expect(codigoDe(respuesta)).toBe("CAMBIO_DE_CONTRASENA_REQUERIDO")
    }
  })
})

describe("ataque: rutas del admin", () => {
  it("restablecer al admin (id en mayúsculas) → 403 y su hash, bandera y rol no cambian", async () => {
    const id = await adminId()
    const antes = await obtenerDb().usuario.findUnique({
      where: { id },
      select: { hashContrasena: true, debeCambiarContrasena: true, rol: true },
    })
    const respuesta = await post(
      `/api/admin/usuarios/${id.toUpperCase()}/restablecer-contrasena`,
      {},
      await tokenAdmin(),
    )
    expect(respuesta.statusCode).toBe(403)
    expect(codigoDe(respuesta)).toBe("OPERACION_NO_PERMITIDA")
    expect(respuesta.body).not.toMatch(/contrasenaTemporal/)
    const despues = await obtenerDb().usuario.findUnique({
      where: { id },
      select: { hashContrasena: true, debeCambiarContrasena: true, rol: true },
    })
    expect(despues).toEqual(antes)
  })

  it("restablecer a un estudiante no lo promueve ni crea admins", async () => {
    const estudiante = await crearUsuarioDePrueba(ids)
    const respuesta = await post(
      `/api/admin/usuarios/${estudiante.id}/restablecer-contrasena`,
      { rol: "admin" },
      await tokenAdmin(),
    )
    expect(respuesta.statusCode).toBe(200)
    const fila = await obtenerDb().usuario.findUnique({
      where: { id: estudiante.id },
      select: { rol: true },
    })
    expect(fila?.rol).toBe("estudiante")
    expect(await obtenerDb().usuario.count({ where: { rol: "admin" } })).toBe(1)
  })

  it.each([
    ["inyección", "' OR '1'='1"],
    ["sentencia", "1; DROP TABLE usuarios"],
    ["uuid entre llaves", `{${randomUUID()}}`],
    ["uuid sin guiones", randomUUID().replace(/-/g, "")],
    ["90 caracteres", "a".repeat(90)],
  ])("id manipulado (%s) → 400 VALIDACION sin eco en las dos rutas con :id", async (_n, valor) => {
    const token = await tokenAdmin()
    const url = encodeURIComponent(valor)
    const reset = await post(`/api/admin/usuarios/${url}/restablecer-contrasena`, {}, token)
    const correo = await obtenerApp().inject({
      method: "PUT",
      url: `/api/admin/usuarios/${url}/correo`,
      headers: { authorization: `Bearer ${token}` },
      payload: { email: correoDePrueba("id-manipulado") },
    })
    for (const respuesta of [reset, correo]) {
      expect(respuesta.statusCode).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
      expect(respuesta.body).not.toContain("DROP")
      expect(respuesta.body).not.toContain("aaaaaaaaaa")
    }
  })

  // ESSENTIALS "Operación": todo error de la API es { error: { codigo, mensaje } }. Las rutas con :id
  // de AUTH-02a son las primeras paramétricas bajo /api: un :id demasiado largo (maxParamLength) o
  // mal codificado lo corta el enrutador de Fastify antes del handler.
  it.each([
    ["5 KB", "a".repeat(5_000)],
    ["codificación rota", "%E0%A4%A"],
  ])("un :id %s → 4xx con el formato de error de la API y sin eco del valor", async (_n, valor) => {
    const token = await tokenAdmin()
    const respuesta = await post(`/api/admin/usuarios/${valor}/restablecer-contrasena`, {}, token)
    expect(respuesta.statusCode).toBeGreaterThanOrEqual(400)
    expect(respuesta.statusCode).toBeLessThan(500)
    expect(errorApiSchema.safeParse(respuesta.json()).success).toBe(true)
    expect(respuesta.body).not.toContain("aaaaaaaaaa")
    expect(respuesta.body).not.toContain("%E0%A4%A")
  })

  it("corregir a un correo ya usado (mayúsculas y espacios) o al del admin → 409 sin cambiar nada", async () => {
    const x = await crearUsuarioDePrueba(ids)
    const y = await crearUsuarioDePrueba(ids)
    const token = await tokenAdmin()
    for (const destino of [
      `  ${y.email.toUpperCase()}  `,
      (process.env.ADMIN_EMAIL ?? "").toUpperCase(),
    ]) {
      const respuesta = await obtenerApp().inject({
        method: "PUT",
        url: `/api/admin/usuarios/${x.id}/correo`,
        headers: { authorization: `Bearer ${token}` },
        payload: { email: destino },
      })
      expect(respuesta.statusCode).toBe(409)
      expect(codigoDe(respuesta)).toBe("CORREO_EN_USO")
    }
    const fila = await obtenerDb().usuario.findUnique({
      where: { id: x.id },
      select: { email: true },
    })
    expect(fila?.email).toBe(x.email)
  })

  it("buscar a un alumno deudor y restringido devuelve solo id, nombre, email, rol y activo", async () => {
    const alumno = await crearUsuarioDePrueba(ids, {
      accesoRestringido: true,
      motivoRestriccion: "Adeudo de colegiatura",
    })
    await obtenerDb().usuario.update({
      where: { id: alumno.id },
      data: { estadoPago: "deudor" },
      select: { id: true },
    })
    const respuesta = await post(
      "/api/admin/usuarios/buscar",
      { email: alumno.email },
      await tokenAdmin(),
    )
    expect(respuesta.statusCode).toBe(200)
    const { usuario } = respuesta.json<{ usuario: Record<string, unknown> }>()
    expect(Object.keys(usuario).sort()).toEqual(["activo", "email", "id", "nombre", "rol"])
    expect(respuesta.body).not.toMatch(/deudor|estadoPago|estado_pago|Adeudo|restring|hash/i)
  })

  it("invitar con banderas en el cuerpo las ignora: maestro activo, al corriente, sin restricción ni cambio pendiente", async () => {
    const correo = correoDePrueba("invitado-banderas")
    const respuesta = await post(
      "/api/admin/maestros",
      {
        nombre: "Invitado Banderas",
        email: correo,
        rol: "admin",
        activo: false,
        estadoPago: "deudor",
        accesoRestringido: true,
        debeCambiarContrasena: true,
        hashContrasena: "$argon2id$v=19$m=19456,t=2,p=1$aaaa$bbbb",
      },
      await tokenAdmin(),
    )
    expect(respuesta.statusCode).toBe(201)
    const fila = await obtenerDb().usuario.findUnique({
      where: { email: correo },
      select: {
        id: true,
        rol: true,
        activo: true,
        estadoPago: true,
        accesoRestringido: true,
        debeCambiarContrasena: true,
        hashContrasena: true,
      },
    })
    if (fila) ids.push(fila.id)
    expect(fila).toMatchObject({
      rol: "maestro",
      activo: true,
      estadoPago: "al_corriente",
      accesoRestringido: false,
      debeCambiarContrasena: false,
    })
    expect(fila?.hashContrasena).not.toBe("$argon2id$v=19$m=19456,t=2,p=1$aaaa$bbbb")
    expect(respuesta.body).not.toMatch(/hash|estadoPago|token/i)
  })

  it("doble envío concurrente de la misma invitación: un 201, un 409, un usuario y un token", async () => {
    const correo = correoDePrueba("invitado-doble")
    const token = await tokenAdmin()
    const respuestas = await Promise.all([
      post("/api/admin/maestros", { nombre: "Doble Uno", email: correo }, token),
      post("/api/admin/maestros", { nombre: "Doble Dos", email: correo }, token),
    ])
    const usuarios = await obtenerDb().usuario.findMany({
      where: { email: correo },
      select: { id: true },
    })
    ids.push(...usuarios.map((u) => u.id))
    expect(respuestas.map((r) => r.statusCode).sort()).toEqual([201, 409])
    expect(usuarios).toHaveLength(1)
    const [unico] = usuarios
    if (!unico) throw new Error("sin usuario")
    expect(await leerTokens(unico.id)).toHaveLength(1)
  })
})

describe("ataque: encolado transaccional y ejecutor SQL", () => {
  it("si pg-boss falla al encolar la invitación, no quedan ni el usuario ni el token", async () => {
    const correo = correoDePrueba("invitado-cola-rota")
    const tokenId = randomUUID()
    const intento = crearMaestroInvitado(
      {
        usuario: {
          nombre: "Cola Rota",
          nombreBusqueda: "cola rota",
          email: correo,
          hashContrasena: await hashContrasena("contrasena-irrelevante-1"),
          rol: "maestro",
        },
        token: {
          id: tokenId,
          hashToken: derivarTokenDeCuenta(tokenId).hash,
          expiraEn: new Date(Date.now() + 72 * 3_600_000),
        },
      },
      (sql) =>
        encolar(
          `COLA_INEXISTENTE_${randomUUID().slice(0, 8)}`,
          { tipo: "invitacion" },
          { id: tokenId, sql },
        ),
    )
    await expect(intento).rejects.toBeDefined()
    expect(await obtenerDb().usuario.count({ where: { email: correo } })).toBe(0)
    expect(await obtenerDb().tokenCuenta.count({ where: { id: tokenId } })).toBe(0)
  })

  it("executeSql con dos sentencias y parámetros falla y la segunda no se ejecuta", async () => {
    const tabla = `ataque_r1_${randomUUID().replace(/-/g, "").slice(0, 12)}`
    const intento = obtenerDb().$transaction(async (tx) =>
      ejecutorSqlDe(tx).executeSql(`SELECT $1::int AS a; CREATE TABLE ${tabla} (id int)`, [1]),
    )
    await expect(intento).rejects.toBeDefined()
    const [fila] = await obtenerDb().$queryRaw<{ existe: string | null }[]>`
      SELECT to_regclass(${`public.${tabla}`})::text AS existe
    `
    expect(fila?.existe ?? null).toBeNull()
  })

  it("un valor malicioso como parámetro de executeSql viaja como dato", async () => {
    const valor = "'); DROP TABLE usuarios; --"
    const resultado = await obtenerDb().$transaction(async (tx) =>
      ejecutorSqlDe(tx).executeSql("SELECT $1::text AS v", [valor]),
    )
    expect(resultado.rows).toEqual([{ v: valor }])
    expect(await obtenerDb().usuario.count()).toBeGreaterThan(0)
  })
})

describe("ataque: recuperar de punta a punta con el worker", () => {
  const logSilencioso = { info: () => undefined, warn: () => undefined, error: () => undefined }

  it("4 solicitudes desde 4 IPs para la misma cuenta: la API acepta las 4 y el worker envía solo 3", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    for (let ip = 1; ip <= 4; ip += 1) {
      const respuesta = await post(
        "/api/auth/recuperar",
        { email: usuario.email },
        undefined,
        `10.65.${ip}.1`,
      )
      expect(respuesta.statusCode).toBe(204)
    }
    const trabajos = await buscarTrabajosPorCorreo(usuario.email)
    expect(trabajos).toHaveLength(4)
    const notifier = crearNotifierEnMemoria()
    const resultados: string[] = []
    for (const trabajo of trabajos) {
      resultados.push(
        await procesarCorreoDeCuenta(
          { id: trabajo.id, datos: { tipo: "recuperacion", correo: usuario.email } },
          {
            notifier,
            urlPublicaFrontend: "http://127.0.0.1:5173",
            reloj: () => new Date(),
            log: logSilencioso,
          },
        ),
      )
    }
    expect(resultados).toEqual(["enviado", "enviado", "enviado", "omitido"])
    expect(notifier.enviados).toHaveLength(3)
    const vivos = (await leerTokens(usuario.id)).filter(
      (fila) => fila.usadoEn === null && fila.revocadoEn === null,
    )
    expect(vivos).toHaveLength(1)
  })

  it("recuperar para el correo del admin (con mayúsculas y espacios) nunca produce enlace ni correo", async () => {
    const correoAdmin = process.env.ADMIN_EMAIL ?? ""
    expect(correoAdmin.length, "setup.ts debe exponer ADMIN_EMAIL").toBeGreaterThan(0)
    const respuesta = await post(
      "/api/auth/recuperar",
      { email: `  ${correoAdmin.toUpperCase()} ` },
      undefined,
      "10.66.0.1",
    )
    expect(respuesta.statusCode).toBe(204)
    const trabajos = await buscarTrabajosPorCorreo(correoAdmin)
    expect(trabajos.length).toBeGreaterThanOrEqual(1)
    const notifier = crearNotifierEnMemoria()
    for (const trabajo of trabajos) {
      const resultado = await procesarCorreoDeCuenta(
        { id: trabajo.id, datos: { tipo: "recuperacion", correo: correoAdmin } },
        {
          notifier,
          urlPublicaFrontend: "http://127.0.0.1:5173",
          reloj: () => new Date(),
          log: logSilencioso,
        },
      )
      expect(resultado).toBe("omitido")
    }
    expect(notifier.enviados).toHaveLength(0)
    expect(await leerTokens(await adminId())).toHaveLength(0)
  })

  it("una invitación cuyo correo corrigió el admin antes de procesarse no sale ni a la dirección vieja ni a la nueva", async () => {
    const correoViejo = correoDePrueba("invitado-viejo")
    const alta = await post(
      "/api/admin/maestros",
      { nombre: "Invitado Corregido", email: correoViejo },
      await tokenAdmin(),
    )
    expect(alta.statusCode).toBe(201)
    const { id } = alta.json<{ id: string }>()
    ids.push(id)
    const [token] = await leerTokens(id)
    if (!token) throw new Error("la invitación no creó token")
    const correccion = await obtenerApp().inject({
      method: "PUT",
      url: `/api/admin/usuarios/${id}/correo`,
      headers: { authorization: `Bearer ${await tokenAdmin()}` },
      payload: { email: correoDePrueba("invitado-nuevo") },
    })
    expect(correccion.statusCode).toBe(200)
    const notifier = crearNotifierEnMemoria()
    const resultado = await procesarCorreoDeCuenta(
      { id: token.id, datos: { tipo: "invitacion" } },
      {
        notifier,
        urlPublicaFrontend: "http://127.0.0.1:5173",
        reloj: () => new Date(),
        log: logSilencioso,
      },
    )
    expect(resultado).toBe("omitido")
    expect(notifier.enviados).toHaveLength(0)
  })
})
