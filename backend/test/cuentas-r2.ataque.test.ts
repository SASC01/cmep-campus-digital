import { errorApiSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  contarSesionesVivas,
  crearSesionDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  NOMBRE_COOKIE,
  refrescarDePrueba,
  valorCookieRefresco,
} from "./ayudas-auth.js"
import { crearTokenDePrueba } from "./ayudas-cuentas.js"

// Ataques del Tester (AUTH-02a, ronda 2): el orden de bloqueo nuevo de T-01 frente a las
// transacciones de sesión de AUTH-01 (refresco y login), la revocación de sesiones de los
// restablecimientos frente a un refresco concurrente, y regresiones del manejador de
// frameworkErrors de T-05.
//
// Para que los cruces sean deterministas, una transacción externa retiene una fila (el usuario o la
// sesión) con SELECT ... FOR UPDATE mientras se lanzan las peticiones en un orden fijo. Eso solo
// alarga una ventana que en producción existe sola: rotarSesion retiene la fila de la sesión entre
// su UPDATE y su COMMIT, y el login retiene la verificación de la contraseña vieja durante argon2.

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

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

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

const adminId = async (): Promise<string> => {
  const admin = await obtenerDb().usuario.findFirst({
    where: { rol: "admin" },
    select: { id: true },
  })
  expect(admin, "la base desechable debe tener el admin que crea seed:admin").not.toBeNull()
  if (!admin) throw new Error("Precondición: falta el admin de la base desechable")
  return admin.id
}

const treintaMinutos = (): Date => new Date(Date.now() + 30 * 60_000)
const treintaDias = (): Date => new Date(Date.now() + 30 * 86_400_000)

interface FilaRetenida {
  tabla: "usuarios" | "sesiones"
  id: string
}

type Peticion = () => Promise<LightMyRequestResponse>

// Retiene una fila con FOR UPDATE y lanza las peticiones en orden. Antes de lanzar la siguiente (y
// antes de soltar la fila) espera a que la anterior esté formada detrás de la fila retenida
// (directa o indirectamente, según pg_blocking_pids) o a que ya haya terminado. Así el orden de
// llegada no depende de cuánto tarde argon2 bajo la carga de la suite.
const conFilaRetenida = async (
  fila: FilaRetenida,
  peticiones: readonly Peticion[],
): Promise<LightMyRequestResponse[]> => {
  const lanzadas: Promise<LightMyRequestResponse>[] = []
  await obtenerDb().$transaction(
    async (tx) => {
      await (fila.tabla === "usuarios"
        ? tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${fila.id}::uuid FOR UPDATE`
        : tx.$queryRaw`SELECT id FROM sesiones WHERE id = ${fila.id}::uuid FOR UPDATE`)
      const [propio] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
      if (!propio) throw new Error("Precondición: no se obtuvo el pid de la transacción retenedora")

      const detrasDeLaFila = async (): Promise<number> => {
        // Fuera de la transacción retenedora: dentro de ella, pg_stat_activity conserva la
        // instantánea de su primera lectura hasta el final de la transacción.
        const [fila] = await obtenerDb().$queryRaw<{ n: number }[]>`
          WITH RECURSIVE bloqueados(pid) AS (
            SELECT pid FROM pg_stat_activity WHERE ${propio.pid}::int = ANY(pg_blocking_pids(pid))
            UNION
            SELECT a.pid FROM pg_stat_activity a
            JOIN bloqueados b ON b.pid = ANY(pg_blocking_pids(a.pid))
          )
          SELECT count(*)::int AS n FROM bloqueados`
        return fila?.n ?? 0
      }

      for (const [indice, peticion] of peticiones.entries()) {
        let terminada = false
        const lanzada = peticion()
        lanzada.then(
          () => (terminada = true),
          () => (terminada = true),
        )
        lanzadas.push(lanzada)
        const limite = Date.now() + 10_000
        let formada = false
        while (!formada && !terminada && Date.now() < limite) {
          formada = (await detrasDeLaFila()) >= indice + 1
          if (!formada) await esperar(25)
        }
        expect(
          formada || terminada,
          `Precondición: la petición ${indice + 1} no llegó a la fila retenida en 10 s`,
        ).toBe(true)
      }
      // Margen para que la última petición termine de formarse antes de soltar la fila.
      await esperar(100)
    },
    { timeout: 30_000, maxWait: 5_000 },
  )
  return Promise.all(lanzadas)
}

const par = (
  respuestas: LightMyRequestResponse[],
): [LightMyRequestResponse, LightMyRequestResponse] => {
  const [a, b] = respuestas
  if (!a || !b) throw new Error("Precondición: faltan respuestas")
  return [a, b]
}

describe("ataque: orden de bloqueo de T-01 frente a las transacciones de sesión de AUTH-01", () => {
  it("/auth/restablecer y /auth/refrescar del mismo usuario a la vez: nunca un 500", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() })
    const recuperacion = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: treintaMinutos(),
    })

    // Orden: restablecer queda primero en la fila del usuario; refrescar actualiza su sesión y
    // espera el KEY SHARE del usuario (la FK de la sesión nueva). Al soltar la fila, restablecer
    // toma el usuario y va por las sesiones, que refrescar ya tiene.
    const [respuestaRestablecer, respuestaRefrescar] = par(
      await conFilaRetenida({ tabla: "usuarios", id: usuario.id }, [
        () =>
          post("/api/auth/restablecer", {
            token: recuperacion.token,
            contrasena: "contrasena-nueva-r2-1",
          }),
        () => refrescarDePrueba(obtenerApp(), sesion.token),
      ]),
    )

    const estados = {
      restablecer: respuestaRestablecer.statusCode,
      refrescar: respuestaRefrescar.statusCode,
    }
    expect(
      Object.values(estados).filter((estado) => estado >= 500),
      `ninguna de las dos debe terminar en 500 por un deadlock: ${JSON.stringify(estados)}`,
    ).toEqual([])
  }, 30_000)
})

describe("ataque: revocación de sesiones frente a un refresco concurrente", () => {
  it("el restablecimiento del admin no deja viva la sesión que un refresco concurrente acaba de crear", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() })
    const tokenAdmin = await firmarTokenDePrueba({ usuarioId: await adminId() })

    // Orden: refrescar entra primero a la fila de la sesión; el restablecimiento actualiza el
    // usuario (NO KEY UPDATE, compatible con el KEY SHARE de la FK) y espera la misma sesión.
    const [respuestaRefrescar, respuestaAdmin] = par(
      await conFilaRetenida({ tabla: "sesiones", id: sesion.id }, [
        () => refrescarDePrueba(obtenerApp(), sesion.token),
        () =>
          obtenerApp().inject({
            method: "POST",
            url: `/api/admin/usuarios/${usuario.id}/restablecer-contrasena`,
            headers: { authorization: `Bearer ${tokenAdmin}` },
          }),
      ]),
    )

    expect(respuestaAdmin.statusCode, "el restablecimiento del admin debe responder 200").toBe(200)
    const vivas = await contarSesionesVivas(usuario.id)
    const cookieNueva = valorCookieRefresco(respuestaRefrescar)
    const segundoRefresco =
      cookieNueva === undefined ? undefined : await refrescarDePrueba(obtenerApp(), cookieNueva)

    expect(
      { vivas, laSesionRotadaSigueRefrescando: segundoRefresco?.statusCode === 200 },
      "DEC-10: tras el restablecimiento no queda ninguna sesión viva del usuario",
    ).toEqual({ vivas: 0, laSesionRotadaSigueRefrescando: false })
  }, 30_000)

  it("el cambio obligatorio de contraseña no deja viva la sesión ajena que un refresco concurrente acaba de rotar", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { debeCambiarContrasena: true })
    // La sesión "ajena" (otro dispositivo, o quien robó la cookie) que el cambio debe cerrar.
    const ajena = await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() })
    const tokenAcceso = await firmarTokenDePrueba({ usuarioId: usuario.id })

    const [respuestaRefrescar, respuestaCambio] = par(
      await conFilaRetenida({ tabla: "sesiones", id: ajena.id }, [
        () => refrescarDePrueba(obtenerApp(), ajena.token),
        () =>
          post(
            "/api/auth/cambiar-contrasena",
            { contrasenaActual: usuario.contrasena, contrasenaNueva: "contrasena-propia-r2-1" },
            tokenAcceso,
          ),
      ]),
    )

    expect(respuestaCambio.statusCode, "el cambio de contraseña debe responder 204").toBe(204)
    const vivas = await contarSesionesVivas(usuario.id)
    const cookieNueva = valorCookieRefresco(respuestaRefrescar)
    const segundoRefresco =
      cookieNueva === undefined ? undefined : await refrescarDePrueba(obtenerApp(), cookieNueva)

    // Sin cookie en la petición de cambio, no hay sesión que conservar: no debe quedar ninguna.
    expect(
      { vivas, laSesionAjenaSigueRefrescando: segundoRefresco?.statusCode === 200 },
      "DEC-09: el cambio revoca todas las sesiones salvo la de quien cambia",
    ).toEqual({ vivas: 0, laSesionAjenaSigueRefrescando: false })
  }, 30_000)

  it("un login con la contraseña vieja que termina después de /auth/restablecer no deja una sesión viva", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const recuperacion = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: treintaMinutos(),
    })

    // Orden: restablecer queda primero en la fila del usuario; el login lee y verifica la
    // contraseña vieja (lecturas sin bloqueo) y espera para insertar su sesión. restablecer cambia
    // la contraseña, revoca las sesiones que existen y confirma; después entra la del login.
    const [respuestaRestablecer, respuestaLogin] = par(
      await conFilaRetenida({ tabla: "usuarios", id: usuario.id }, [
        () =>
          post("/api/auth/restablecer", {
            token: recuperacion.token,
            contrasena: "contrasena-nueva-r2-2",
          }),
        () =>
          post(
            "/api/auth/login",
            { email: usuario.email, contrasena: usuario.contrasena },
            undefined,
            "10.88.0.1",
          ),
      ]),
    )

    expect(respuestaRestablecer.statusCode, "restablecer debe responder 204").toBe(204)
    const vivas = await contarSesionesVivas(usuario.id)
    expect(
      vivas,
      `tras restablecer no debe quedar una sesión autenticada con la contraseña anterior (login respondió ${respuestaLogin.statusCode})`,
    ).toBe(0)
  }, 30_000)
})

describe("ataque: regresiones del manejador de frameworkErrors (T-05)", () => {
  const formatoSinEco = (respuesta: LightMyRequestResponse, eco: string) => {
    expect(errorApiSchema.safeParse(respuesta.json()).success, respuesta.body).toBe(true)
    expect(respuesta.body).not.toContain(eco)
  }

  it("una ruta inexistente bajo /api/admin/usuarios/:id sigue respondiendo 404 NO_ENCONTRADO", async () => {
    const tokenAdmin = await firmarTokenDePrueba({ usuarioId: await adminId() })
    const respuesta = await obtenerApp().inject({
      method: "POST",
      url: "/api/admin/usuarios/00000000-0000-4000-8000-000000000000/borrar",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    })
    expect(respuesta.statusCode).toBe(404)
    expect(errorApiSchema.parse(respuesta.json()).error.codigo).toBe("NO_ENCONTRADO")
  })

  it("una ruta estática con codificación rota responde 4xx con el formato de la API y sin eco", async () => {
    const respuesta = await obtenerApp().inject({ method: "GET", url: "/api/me%E0%A4%Azz" })
    expect(respuesta.statusCode).toBeGreaterThanOrEqual(400)
    expect(respuesta.statusCode).toBeLessThan(500)
    formatoSinEco(respuesta, "%E0%A4%Azz")
  })

  it("PUT /admin/usuarios/:id/correo con un :id de 5 KB → 414 sin eco, sin pasar por el handler", async () => {
    const tokenAdmin = await firmarTokenDePrueba({ usuarioId: await adminId() })
    const largo = "b".repeat(5_000)
    const respuesta = await obtenerApp().inject({
      method: "PUT",
      url: `/api/admin/usuarios/${largo}/correo`,
      headers: { authorization: `Bearer ${tokenAdmin}`, "content-type": "application/json" },
      payload: JSON.stringify({ email: "x@pruebas.local" }),
    })
    expect(respuesta.statusCode).toBe(414)
    formatoSinEco(respuesta, "bbbbbbbbbb")
  })

  it("un cuerpo JSON mal formado en /auth/restablecer → 400 con el formato de la API y sin eco", async () => {
    const respuesta = await post("/api/auth/restablecer", '{"token": "eco-del-cuerpo-roto", ')
    expect(respuesta.statusCode).toBe(400)
    formatoSinEco(respuesta, "eco-del-cuerpo-roto")
  })

  it("un cuerpo de más de 1 MB en /auth/establecer-contrasena → 413 con el formato de la API", async () => {
    const respuesta = await post("/api/auth/establecer-contrasena", {
      token: "a".repeat(1_100_000),
      contrasena: "contrasena-larga-1",
    })
    expect(respuesta.statusCode).toBe(413)
    formatoSinEco(respuesta, "aaaaaaaaaa")
  })

  it("un tipo de contenido no admitido en /auth/cambiar-contrasena → 415 con el formato de la API", async () => {
    const respuesta = await obtenerApp().inject({
      method: "POST",
      url: "/api/auth/cambiar-contrasena",
      headers: { "content-type": "application/xml" },
      payload: "<a>eco-xml</a>",
    })
    // Sin token: 401 del middleware o 415 del analizador; en ambos casos, formato de la API.
    expect([401, 415]).toContain(respuesta.statusCode)
    formatoSinEco(respuesta, "eco-xml")
  })

  it("la cookie de refresco no se acepta en una ruta con :id mal codificado (no hay efectos laterales)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() })
    const respuesta = await obtenerApp().inject({
      method: "POST",
      url: "/api/admin/usuarios/%E0%A4%A/restablecer-contrasena",
      cookies: { [NOMBRE_COOKIE]: sesion.token },
    })
    expect(respuesta.statusCode).toBe(400)
    formatoSinEco(respuesta, "%E0%A4%A")
    expect(await contarSesionesVivas(usuario.id)).toBe(1)
  })
})
