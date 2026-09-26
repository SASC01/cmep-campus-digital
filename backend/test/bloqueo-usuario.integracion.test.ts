import { randomUUID } from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { errorApiSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  derivarTokenDeCuenta,
  generarTokenRefresco,
  hashContrasena,
  hashTokenRefresco,
} from "../src/adapters/auth/index.js"
import { obtenerDb } from "../src/adapters/db/cliente.js"
import {
  actualizarContrasenaYRevocarSesiones,
  buscarCredencialesPorId,
  cambiarContrasenaPropia,
  crearSesion,
  prepararTokenDeRecuperacion,
  revocarTodasLasSesiones,
} from "../src/adapters/db/index.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  contarSesionesVivas,
  crearSesionDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  refrescarDePrueba,
  valorCookieRefresco,
} from "./ayudas-auth.js"
import { crearTokenDePrueba, leerTokens } from "./ayudas-cuentas.js"
import { conFilaRetenida, type Operacion } from "./ayudas-concurrencia.js"

// Pruebas de integración del protocolo de bloqueo por usuario (AUTH-02, Enmienda 2, ronda 3): que
// las combinaciones de la ronda 2 (T-07, T-08, T-09) queden en serie sin 5xx y sin que sobreviva una
// sesión nacida antes de un cambio de contraseña confirmado, más las pruebas de adaptador sin
// concurrencia y las dos comprobaciones estáticas del protocolo (E6, E7).

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

const treintaMinutos = (): Date => new Date(Date.now() + 30 * 60_000)
const treintaDias = (): Date => new Date(Date.now() + 30 * 86_400_000)

const post = (
  url: string,
  payload: unknown,
  token?: string,
  ip?: string,
): Promise<LightMyRequestResponse> =>
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

const adminId = async (): Promise<string> => {
  const admin = await obtenerDb().usuario.findFirst({
    where: { rol: "admin" },
    select: { id: true },
  })
  expect(admin, "la base desechable debe tener el admin que crea seed:admin").not.toBeNull()
  if (!admin) throw new Error("Precondición: falta el admin de la base desechable")
  return admin.id
}

let contadorIp = 0
const ipDePrueba = (): string => {
  contadorIp += 1
  return `10.77.${Math.floor(contadorIp / 250)}.${contadorIp % 250}`
}

const par = (
  respuestas: readonly (LightMyRequestResponse | null)[],
): [LightMyRequestResponse | null, LightMyRequestResponse | null] => {
  const [a, b] = respuestas
  return [a ?? null, b ?? null]
}

describe("A: sin deadlock (retenido: usuario)", () => {
  it("A1: establecer-contrasena (token de invitación) y luego refrescar: ningún 5xx, 0 sesiones vivas", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() })
    const invitacion = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "invitacion",
      expiraEn: treintaMinutos(),
    })

    const [establecer, refrescar] = par(
      await conFilaRetenida({ tabla: "usuarios", id: usuario.id }, [
        () =>
          post("/api/auth/establecer-contrasena", {
            token: invitacion.token,
            contrasena: "contrasena-nueva-a1",
          }),
        () => refrescarDePrueba(obtenerApp(), sesion.token),
      ]),
    )

    const estados = { establecer: establecer?.statusCode, refrescar: refrescar?.statusCode }
    expect(
      Object.values(estados).filter((estado) => (estado ?? 0) >= 500),
      `ninguna de las dos debe terminar en 500: ${JSON.stringify(estados)}`,
    ).toEqual([])
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
  }, 30_000)

  it("A2: prepararTokenDeRecuperacion (directo) y luego refrescar: sin error, refrescar responde 200, 1 token vivo", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() })
    const tokenId = randomUUID()
    const { hash } = derivarTokenDeCuenta(tokenId)

    const operaciones: Operacion[] = [
      async () => {
        await prepararTokenDeRecuperacion({
          id: tokenId,
          usuarioId: usuario.id,
          hashToken: hash,
          expiraEn: treintaMinutos(),
          ahora: new Date(),
        })
        return null
      },
      () => refrescarDePrueba(obtenerApp(), sesion.token),
    ]
    const [, refrescar] = par(
      await conFilaRetenida({ tabla: "usuarios", id: usuario.id }, operaciones),
    )

    expect(refrescar?.statusCode, "refrescar debe responder 200: sin choque con el worker").toBe(
      200,
    )
    const tokens = await leerTokens(usuario.id)
    const vivos = tokens.filter((t) => t.usadoEn === null && t.revocadoEn === null)
    expect(
      vivos.length,
      "debe quedar exactamente el token que insertó prepararTokenDeRecuperacion",
    ).toBe(1)
  }, 30_000)

  it("A3: cambiar-contrasena y luego el restablecimiento del admin: 204 y 200; debe_cambiar_contrasena termina en true", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { debeCambiarContrasena: true })
    const tokenAcceso = await firmarTokenDePrueba({ usuarioId: usuario.id })
    const tokenAdmin = await firmarTokenDePrueba({ usuarioId: await adminId() })

    const [cambiar, admin] = par(
      await conFilaRetenida({ tabla: "usuarios", id: usuario.id }, [
        () =>
          post(
            "/api/auth/cambiar-contrasena",
            { contrasenaActual: usuario.contrasena, contrasenaNueva: "contrasena-propia-a3" },
            tokenAcceso,
          ),
        () =>
          obtenerApp().inject({
            method: "POST",
            url: `/api/admin/usuarios/${usuario.id}/restablecer-contrasena`,
            headers: { authorization: `Bearer ${tokenAdmin}` },
          }),
      ]),
    )

    expect(cambiar?.statusCode, "cambiar-contrasena debe responder 204").toBe(204)
    expect(admin?.statusCode, "el restablecimiento del admin debe responder 200").toBe(200)
    const perfil = await obtenerDb().usuario.findUnique({
      where: { id: usuario.id },
      select: { debeCambiarContrasena: true },
    })
    expect(
      perfil?.debeCambiarContrasena,
      "el restablecimiento del admin corre después: la bandera queda en true",
    ).toBe(true)
  }, 30_000)

  it("A4: restablecer y luego refrescar con una cookie ya rotada (reutilización): 204 y 401; 0 sesiones vivas", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesionOriginal = await crearSesionDePrueba({
      usuarioId: usuario.id,
      expiraEn: treintaDias(),
    })
    // Rota la sesión fuera de la retención: la cookie original queda "usada" (reemplazadaPor).
    const primerRefresco = await refrescarDePrueba(obtenerApp(), sesionOriginal.token)
    expect(primerRefresco.statusCode, "precondición: el primer refresco debe rotar la sesión").toBe(
      200,
    )
    const recuperacion = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: treintaMinutos(),
    })

    const [restablecer, refrescarReutilizado] = par(
      await conFilaRetenida({ tabla: "usuarios", id: usuario.id }, [
        () =>
          post("/api/auth/restablecer", {
            token: recuperacion.token,
            contrasena: "contrasena-nueva-a4",
          }),
        () => refrescarDePrueba(obtenerApp(), sesionOriginal.token),
      ]),
    )

    expect(restablecer?.statusCode, "restablecer debe responder 204").toBe(204)
    expect(
      refrescarReutilizado?.statusCode,
      "la cookie ya rotada es una reutilización: debe responder 401",
    ).toBe(401)
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
  }, 30_000)
})

describe("B: T-08 (retenida: sesión)", () => {
  it("B1: refrescar y luego restablecer: 204, 0 sesiones vivas, la cookie rotada no refresca", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() })
    const recuperacion = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: treintaMinutos(),
    })

    const [refrescar, restablecer] = par(
      await conFilaRetenida({ tabla: "sesiones", id: sesion.id }, [
        () => refrescarDePrueba(obtenerApp(), sesion.token),
        () =>
          post("/api/auth/restablecer", {
            token: recuperacion.token,
            contrasena: "contrasena-nueva-b1",
          }),
      ]),
    )

    expect(restablecer?.statusCode, "restablecer debe responder 204").toBe(204)
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
    const cookieRotada = refrescar ? valorCookieRefresco(refrescar) : undefined
    const segundoRefresco =
      cookieRotada === undefined ? undefined : await refrescarDePrueba(obtenerApp(), cookieRotada)
    expect(
      segundoRefresco?.statusCode === 200,
      "la cookie rotada por el primer refresco no debe seguir refrescando",
    ).toBe(false)
  }, 30_000)

  it("B2: refrescar y luego actualizarContrasenaYRevocarSesiones (directo): 0 sesiones vivas, la cookie rotada no refresca", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() })
    const hashNuevo = await hashContrasena("contrasena-reset-admin-b2")

    const operaciones: Operacion[] = [
      () => refrescarDePrueba(obtenerApp(), sesion.token),
      async () => {
        await actualizarContrasenaYRevocarSesiones(usuario.id, hashNuevo)
        return null
      },
    ]
    const [refrescar] = par(
      await conFilaRetenida({ tabla: "sesiones", id: sesion.id }, operaciones),
    )

    expect(await contarSesionesVivas(usuario.id)).toBe(0)
    const cookieRotada = refrescar ? valorCookieRefresco(refrescar) : undefined
    const segundoRefresco =
      cookieRotada === undefined ? undefined : await refrescarDePrueba(obtenerApp(), cookieRotada)
    expect(
      segundoRefresco?.statusCode === 200,
      "la cookie rotada por el primer refresco no debe seguir refrescando",
    ).toBe(false)
  }, 30_000)

  it("B3: fuera de la retención S0 se refresca a S1; retenida S1: refrescar(S1) y luego refrescar(S0): 200 y 401, 0 sesiones vivas, S2 no refresca", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const s0 = await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() })
    const primerRefresco = await refrescarDePrueba(obtenerApp(), s0.token)
    expect(primerRefresco.statusCode, "precondición: S0 debe rotar a S1 antes de retener").toBe(200)
    const cookieS1 = valorCookieRefresco(primerRefresco)
    if (!cookieS1) throw new Error("Precondición: falta la cookie S1 tras el primer refresco")
    const s1 = await obtenerDb().sesion.findUnique({
      where: { hashToken: hashTokenRefresco(cookieS1) },
      select: { id: true },
    })
    if (!s1) throw new Error("Precondición: no se encontró la sesión S1 en la base")

    const [refrescarS1, refrescarS0] = par(
      await conFilaRetenida({ tabla: "sesiones", id: s1.id }, [
        () => refrescarDePrueba(obtenerApp(), cookieS1),
        () => refrescarDePrueba(obtenerApp(), s0.token),
      ]),
    )

    expect(refrescarS1?.statusCode, "refrescar(S1) debe responder 200").toBe(200)
    expect(
      refrescarS0?.statusCode,
      "refrescar(S0), ya rotada, es una reutilización: debe responder 401",
    ).toBe(401)
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
    const cookieS2 = refrescarS1 ? valorCookieRefresco(refrescarS1) : undefined
    const refrescarS2 =
      cookieS2 === undefined ? undefined : await refrescarDePrueba(obtenerApp(), cookieS2)
    expect(refrescarS2?.statusCode === 200, "S2 debió quedar revocada por la reutilización").toBe(
      false,
    )
  }, 30_000)
})

describe("C: T-09 (retenido: usuario)", () => {
  it("C1: restablecimiento del admin y luego login con la contraseña vieja: 200 y 401 idéntico a credenciales inválidas, 0 sesiones vivas", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const tokenAdmin = await firmarTokenDePrueba({ usuarioId: await adminId() })
    const ip = ipDePrueba()

    const [admin, login] = par(
      await conFilaRetenida({ tabla: "usuarios", id: usuario.id }, [
        () =>
          obtenerApp().inject({
            method: "POST",
            url: `/api/admin/usuarios/${usuario.id}/restablecer-contrasena`,
            headers: { authorization: `Bearer ${tokenAdmin}` },
          }),
        () =>
          post(
            "/api/auth/login",
            { email: usuario.email, contrasena: usuario.contrasena },
            undefined,
            ip,
          ),
      ]),
    )

    expect(admin?.statusCode, "el restablecimiento del admin debe responder 200").toBe(200)
    expect(login?.statusCode, "el login con la contraseña vieja debe responder 401").toBe(401)

    const loginInvalido = await post(
      "/api/auth/login",
      { email: usuario.email, contrasena: "una-contrasena-que-nunca-existio" },
      undefined,
      ipDePrueba(),
    )
    expect(
      login?.json(),
      "el cuerpo debe ser idéntico al de un login con contraseña incorrecta",
    ).toEqual(loginInvalido.json())
    expect(errorApiSchema.parse(login?.json()).error.codigo).toBe("CREDENCIALES_INVALIDAS")
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
  }, 30_000)

  it("C2: cambiar-contrasena sin cookie y luego login con la temporal: 204 y 401, 0 sesiones vivas", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { debeCambiarContrasena: true })
    const tokenAcceso = await firmarTokenDePrueba({ usuarioId: usuario.id })
    const ip = ipDePrueba()

    const [cambiar, login] = par(
      await conFilaRetenida({ tabla: "usuarios", id: usuario.id }, [
        () =>
          post(
            "/api/auth/cambiar-contrasena",
            { contrasenaActual: usuario.contrasena, contrasenaNueva: "contrasena-propia-c2" },
            tokenAcceso,
          ),
        () =>
          post(
            "/api/auth/login",
            { email: usuario.email, contrasena: usuario.contrasena },
            undefined,
            ip,
          ),
      ]),
    )

    expect(cambiar?.statusCode, "cambiar-contrasena debe responder 204").toBe(204)
    expect(login?.statusCode, "el login con la temporal ya cambiada debe responder 401").toBe(401)
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
  }, 30_000)

  it("C3: actualizarContrasenaYRevocarSesiones (directo) y luego login con la vieja: 401, 0 sesiones vivas", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const hashNuevo = await hashContrasena("contrasena-reset-admin-c3")
    const ip = ipDePrueba()

    const operaciones: Operacion[] = [
      async () => {
        await actualizarContrasenaYRevocarSesiones(usuario.id, hashNuevo)
        return null
      },
      () =>
        post(
          "/api/auth/login",
          { email: usuario.email, contrasena: usuario.contrasena },
          undefined,
          ip,
        ),
    ]
    const [, login] = par(await conFilaRetenida({ tabla: "usuarios", id: usuario.id }, operaciones))

    expect(login?.statusCode, "el login con la contraseña vieja debe responder 401").toBe(401)
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
  }, 30_000)

  it("C4: login con la vieja y luego restablecer (orden inverso): 200 y 204, 0 sesiones vivas, la cookie del login no refresca", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const recuperacion = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: treintaMinutos(),
    })
    const ip = ipDePrueba()

    const [login, restablecer] = par(
      await conFilaRetenida({ tabla: "usuarios", id: usuario.id }, [
        () =>
          post(
            "/api/auth/login",
            { email: usuario.email, contrasena: usuario.contrasena },
            undefined,
            ip,
          ),
        () =>
          post("/api/auth/restablecer", {
            token: recuperacion.token,
            contrasena: "contrasena-nueva-c4",
          }),
      ]),
    )

    expect(login?.statusCode, "el login debe responder 200: nada cambió todavía").toBe(200)
    expect(restablecer?.statusCode, "restablecer debe responder 204").toBe(204)
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
    const cookieLogin = login ? valorCookieRefresco(login) : undefined
    const segundoRefresco =
      cookieLogin === undefined ? undefined : await refrescarDePrueba(obtenerApp(), cookieLogin)
    expect(
      segundoRefresco?.statusCode === 200,
      "la sesión del login debió quedar revocada por restablecer",
    ).toBe(false)
  }, 30_000)
})

describe("D: dos escrituras sucesivas del mismo usuario", () => {
  it("D1: el admin genera la temporal B y luego cambiar-contrasena se hace con la temporal anterior A", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { debeCambiarContrasena: true })
    const tokenAcceso = await firmarTokenDePrueba({ usuarioId: usuario.id })
    const tokenAdmin = await firmarTokenDePrueba({ usuarioId: await adminId() })
    const contrasenaA = usuario.contrasena

    const [admin, cambiar] = par(
      await conFilaRetenida({ tabla: "usuarios", id: usuario.id }, [
        () =>
          obtenerApp().inject({
            method: "POST",
            url: `/api/admin/usuarios/${usuario.id}/restablecer-contrasena`,
            headers: { authorization: `Bearer ${tokenAdmin}` },
          }),
        () =>
          post(
            "/api/auth/cambiar-contrasena",
            { contrasenaActual: contrasenaA, contrasenaNueva: "contrasena-propia-d1" },
            tokenAcceso,
          ),
      ]),
    )

    expect(admin?.statusCode, "el admin debe responder 200 con la temporal B").toBe(200)
    expect(
      cambiar?.statusCode,
      "cambiar-contrasena con la temporal anterior debe responder 400",
    ).toBe(400)
    expect(errorApiSchema.parse(cambiar?.json()).error.codigo).toBe("CONTRASENA_ACTUAL_INCORRECTA")

    const temporalB = admin?.json<{ contrasenaTemporal: string }>().contrasenaTemporal
    if (!temporalB) throw new Error("Precondición: el admin no devolvió la temporal B")
    const loginConB = await post(
      "/api/auth/login",
      { email: usuario.email, contrasena: temporalB },
      undefined,
      ipDePrueba(),
    )
    expect(loginConB.statusCode, "el login con la temporal B debe responder 200").toBe(200)

    const perfil = await obtenerDb().usuario.findUnique({
      where: { id: usuario.id },
      select: { debeCambiarContrasena: true },
    })
    expect(
      perfil?.debeCambiarContrasena,
      "el intento fallido con la temporal A no debe apagar la bandera",
    ).toBe(true)
  }, 30_000)
})

describe("E: adaptadores, sin concurrencia", () => {
  it("E1: crearSesion con otro hashVerificado devuelve null y no crea sesión", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const creada = await crearSesion({
      usuarioId: usuario.id,
      hashVerificado: "un-hash-que-no-es-el-vigente",
      hashToken: hashTokenRefresco(generarTokenRefresco()),
      expiraEn: treintaDias(),
      ip: null,
      agente: null,
    })
    expect(creada).toBeNull()
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
  })

  it("E2: crearSesion de un usuario inactivo devuelve null", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { activo: false })
    const credenciales = await buscarCredencialesPorId(usuario.id)
    if (!credenciales) throw new Error("Precondición: no se encontraron las credenciales creadas")
    const creada = await crearSesion({
      usuarioId: usuario.id,
      hashVerificado: credenciales.hashContrasena,
      hashToken: hashTokenRefresco(generarTokenRefresco()),
      expiraEn: treintaDias(),
      ip: null,
      agente: null,
    })
    expect(creada).toBeNull()
  })

  it("E3: crearSesion con un usuarioId inexistente devuelve null sin lanzar", async () => {
    const inexistente = randomUUID()
    const creada = await crearSesion({
      usuarioId: inexistente,
      hashVerificado: "cualquier-hash",
      hashToken: hashTokenRefresco(generarTokenRefresco()),
      expiraEn: treintaDias(),
      ip: null,
      agente: null,
    })
    expect(creada).toBeNull()
  })

  it("E4: cambiarContrasenaPropia con otro hashVerificado devuelve false y no cambia nada", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() })
    const recuperacion = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: treintaMinutos(),
    })
    const antes = await buscarCredencialesPorId(usuario.id)
    if (!antes) throw new Error("Precondición: no se encontraron las credenciales creadas")

    const cambiada = await cambiarContrasenaPropia({
      usuarioId: usuario.id,
      hashContrasena: await hashContrasena("contrasena-que-no-debe-quedar"),
      hashVerificado: "un-hash-que-no-es-el-vigente",
      conservarSesionId: null,
      ahora: new Date(),
    })
    expect(cambiada).toBe(false)

    const despues = await buscarCredencialesPorId(usuario.id)
    expect(despues?.hashContrasena, "el hash no debe cambiar").toBe(antes.hashContrasena)
    expect(await contarSesionesVivas(usuario.id), "la sesión no debe revocarse").toBe(1)
    const tokens = await leerTokens(usuario.id)
    const vivos = tokens.filter((t) => t.id === recuperacion.id && t.revocadoEn === null)
    expect(vivos.length, "el token no debe revocarse").toBe(1)
  })

  it("E5: revocarTodasLasSesiones con 2 sesiones vivas devuelve 2", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() })
    await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() })
    const revocadas = await revocarTodasLasSesiones(usuario.id)
    expect(revocadas).toBe(2)
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
  })

  it("E6: solo salud.ts y bloqueo-usuario.ts usan $queryRaw etiquetado en adapters/db", async () => {
    const raizDb = fileURLToPath(new URL("../src/adapters/db/", import.meta.url))
    const archivos = (await readdir(raizDb)).filter(
      (nombre) => nombre.endsWith(".ts") && nombre !== "generated",
    )
    const patron = /\$queryRaw(?!Unsafe)/
    const conCoincidencia: string[] = []
    for (const archivo of archivos) {
      if (archivo.toLowerCase() === "readme.md") continue
      const ruta = path.join(raizDb, archivo)
      const contenido = await readFile(ruta, "utf-8")
      if (patron.test(contenido)) conCoincidencia.push(archivo)
    }
    expect(conCoincidencia.sort()).toEqual(["bloqueo-usuario.ts", "salud.ts"])
  })

  it("E7: bloqueo-usuario solo se importa desde adapters/db", async () => {
    const raizSrc = fileURLToPath(new URL("../src/", import.meta.url))
    const patron = /bloqueo-usuario\.js/
    const infractores: string[] = []

    const recorrer = async (directorio: string): Promise<void> => {
      const entradas = await readdir(directorio, { withFileTypes: true })
      for (const entrada of entradas) {
        if (entrada.name === "generated") continue
        const ruta = path.join(directorio, entrada.name)
        if (entrada.isDirectory()) {
          await recorrer(ruta)
          continue
        }
        if (!entrada.name.endsWith(".ts") || entrada.name.toLowerCase() === "readme.md") continue
        const contenido = await readFile(ruta, "utf-8")
        if (!patron.test(contenido)) continue
        const relativa = path.relative(raizSrc, ruta).split(path.sep).join("/")
        if (!relativa.startsWith("adapters/db/")) infractores.push(relativa)
      }
    }
    await recorrer(raizSrc)
    expect(infractores).toEqual([])
  })
})
