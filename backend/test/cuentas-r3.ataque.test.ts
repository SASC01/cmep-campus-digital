import { randomUUID } from "node:crypto"

import { errorApiSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { derivarTokenDeCuenta, hashContrasena } from "../src/adapters/auth/index.js"
import { obtenerDb } from "../src/adapters/db/cliente.js"
import {
  actualizarContrasenaYRevocarSesiones,
  prepararTokenDeRecuperacion,
} from "../src/adapters/db/index.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  contarSesionesVivas,
  correoDePrueba,
  crearSesionDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  NOMBRE_COOKIE,
  refrescarDePrueba,
  valorCookieRefresco,
} from "./ayudas-auth.js"
import { crearTokenDePrueba, leerTokens } from "./ayudas-cuentas.js"

// Ataques del Tester (AUTH-02a, ronda 3): el protocolo de bloqueo por usuario de la Enmienda 2
// (PB-1 a PB-8) en las combinaciones que la tabla del plan no prueba o que la ronda 2 no cubrió:
// login frente a una desactivación y frente a los escritores en orden inverso, rotarSesion frente a
// reset:admin con el usuario retenido, dos refrescos de la misma sesión, refresco frente a logout,
// la rama de reutilización frente a los escritores, el worker frente a un enlace, corregirCorreo
// frente a las sesiones y frente a la unicidad del correo, y transacciones que Prisma cierra por
// tiempo (P2028) a mitad de una espera de bloqueo.
//
// Método (el de la ronda 2, reescrito aquí; no se importa de ningún otro archivo de pruebas): una
// transacción de la prueba retiene una fila con SELECT ... FOR UPDATE, lanza las operaciones en un
// orden fijo y, antes de lanzar la siguiente, espera con pg_blocking_pids (consultado fuera de la
// transacción retenedora) a que la anterior esté formada detrás de la fila o ya haya terminado.

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

let contadorIp = 0
const ipPropia = (): string => {
  contadorIp += 1
  return `10.93.${Math.floor(contadorIp / 250)}.${contadorIp % 250}`
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

const login = (email: string, contrasena: string, ip: string) =>
  post("/api/auth/login", { email, contrasena }, undefined, ip)

const logout = (cookie: string) =>
  obtenerApp().inject({
    method: "POST",
    url: "/api/auth/logout",
    cookies: { [NOMBRE_COOKIE]: cookie },
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

const restablecerComoAdmin = async (usuarioId: string) => {
  const tokenAdmin = await firmarTokenDePrueba({ usuarioId: await adminId() })
  return () =>
    obtenerApp().inject({
      method: "POST",
      url: `/api/admin/usuarios/${usuarioId}/restablecer-contrasena`,
      headers: { authorization: `Bearer ${tokenAdmin}` },
    })
}

const treintaMinutos = (): Date => new Date(Date.now() + 30 * 60_000)
const treintaDias = (): Date => new Date(Date.now() + 30 * 86_400_000)

interface FilaRetenida {
  tabla: "usuarios" | "sesiones"
  id: string
}

// Una operación que llama a un adaptador directamente devuelve un resumen propio en lugar de una
// respuesta HTTP.
type Resultado =
  LightMyRequestResponse | { adaptador: "ok" } | { adaptador: "error"; error: unknown }
type Operacion = () => Promise<Resultado>

const directo =
  (fn: () => Promise<unknown>): Operacion =>
  async () => {
    try {
      await fn()
      return { adaptador: "ok" }
    } catch (error) {
      return { adaptador: "error", error }
    }
  }

type EjecutarSql = (sql: TemplateStringsArray, ...valores: unknown[]) => Promise<number>

interface OpcionesDeRetencion {
  // Corre dentro de la transacción retenedora, justo después de retener la fila y antes de lanzar.
  alRetener?: (sql: EjecutarSql) => Promise<void>
  // Corre dentro de la transacción retenedora, con todas las operaciones ya formadas.
  antesDeSoltar?: (sql: EjecutarSql) => Promise<void>
  // Tiempo que la fila sigue retenida después de formar la última operación (por defecto 100 ms).
  retenerMs?: number
}

const conFilaRetenida = async (
  fila: FilaRetenida,
  operaciones: readonly Operacion[],
  { alRetener, antesDeSoltar, retenerMs = 100 }: OpcionesDeRetencion = {},
): Promise<Resultado[]> => {
  const lanzadas: Promise<Resultado>[] = []
  await obtenerDb().$transaction(
    async (tx) => {
      await (fila.tabla === "usuarios"
        ? tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${fila.id}::uuid FOR UPDATE`
        : tx.$queryRaw`SELECT id FROM sesiones WHERE id = ${fila.id}::uuid FOR UPDATE`)
      const sql: EjecutarSql = (texto, ...valores) => tx.$executeRaw(texto, ...valores)
      if (alRetener) await alRetener(sql)
      const [propio] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
      expect(propio, "Precondición: el pid de la transacción retenedora").toBeDefined()
      if (!propio) throw new Error("Precondición: sin pid de la transacción retenedora")

      const detrasDeLaFila = async (): Promise<number> => {
        const [cuenta] = await obtenerDb().$queryRaw<{ n: number }[]>`
          WITH RECURSIVE bloqueados(pid) AS (
            SELECT pid FROM pg_stat_activity WHERE ${propio.pid}::int = ANY(pg_blocking_pids(pid))
            UNION
            SELECT a.pid FROM pg_stat_activity a
            JOIN bloqueados b ON b.pid = ANY(pg_blocking_pids(a.pid))
          )
          SELECT count(*)::int AS n FROM bloqueados`
        return cuenta?.n ?? 0
      }

      for (const [indice, operacion] of operaciones.entries()) {
        let terminada = false
        const lanzada = operacion()
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
          `Precondición: la operación ${indice + 1} no llegó a la fila retenida en 10 s`,
        ).toBe(true)
      }
      if (antesDeSoltar) await antesDeSoltar(sql)
      await esperar(retenerMs)
    },
    { timeout: 40_000, maxWait: 5_000 },
  )
  return Promise.all(lanzadas)
}

const esRespuesta = (resultado: Resultado | undefined): resultado is LightMyRequestResponse =>
  resultado !== undefined && "statusCode" in resultado

const respuesta = (resultado: Resultado | undefined, nombre: string): LightMyRequestResponse => {
  expect(esRespuesta(resultado), `Precondición: ${nombre} debe ser una respuesta HTTP`).toBe(true)
  if (!esRespuesta(resultado)) throw new Error(`Precondición: ${nombre} no es una respuesta HTTP`)
  return resultado
}

const estado = (resultado: Resultado | undefined): string => {
  if (resultado === undefined) return "sin resultado"
  if (esRespuesta(resultado)) return String(resultado.statusCode)
  if (resultado.adaptador === "ok") return "ok"
  return `error: ${String((resultado.error as { code?: string })?.code ?? resultado.error)}`
}

const codigoDeError = (r: LightMyRequestResponse): string | undefined =>
  errorApiSchema.safeParse(r.json()).data?.error.codigo

describe("ataque: login frente a una desactivación y frente a los escritores (T-09, orden inverso)", () => {
  it("una cuenta desactivada entre la verificación y la sesión: 401 idéntico a credenciales inválidas, 0 sesiones y sin sumar un fallo", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const ip = ipPropia()

    const [resultadoLogin] = await conFilaRetenida(
      { tabla: "usuarios", id: usuario.id },
      [() => login(usuario.email, usuario.contrasena, ip)],
      {
        antesDeSoltar: async (sql) => {
          await sql`UPDATE usuarios SET activo = false WHERE id = ${usuario.id}::uuid`
        },
      },
    )

    const respuestaLogin = respuesta(resultadoLogin, "el login")
    const incorrecta = await login(usuario.email, "otra-clave-incorrecta-r3", ipPropia())
    expect(
      {
        estado: respuestaLogin.statusCode,
        cuerpo: respuestaLogin.json(),
        vivas: await contarSesionesVivas(usuario.id),
        cookie: valorCookieRefresco(respuestaLogin) ?? null,
      },
      "PB-4: crearSesion decide bajo el bloqueo; una cuenta inactiva no recibe sesión",
    ).toEqual({ estado: 401, cuerpo: incorrecta.json(), vivas: 0, cookie: null })

    // Q-E2-4: ese 401 no suma un fallo. Con la llave limpia, caben 5 fallos más y el 6.º es 429.
    const estados: number[] = []
    for (let i = 0; i < 6; i += 1) {
      estados.push((await login(usuario.email, `incorrecta-${i}-r3`, ip)).statusCode)
    }
    expect(estados, "Q-E2-4: el 401 de la carrera no cuenta como fallo").toEqual([
      401, 401, 401, 401, 401, 429,
    ])
  }, 40_000)

  it("login con la vieja frente a restablecer: el 401 de la carrera no suma un fallo (Q-E2-4)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const recuperacion = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: treintaMinutos(),
    })
    const ip = ipPropia()

    const [restablecer, resultadoLogin] = await conFilaRetenida(
      { tabla: "usuarios", id: usuario.id },
      [
        () =>
          post("/api/auth/restablecer", {
            token: recuperacion.token,
            contrasena: "contrasena-nueva-r3-1",
          }),
        () => login(usuario.email, usuario.contrasena, ip),
      ],
    )

    expect([estado(restablecer), estado(resultadoLogin)]).toEqual(["204", "401"])
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
    const estados: number[] = []
    for (let i = 0; i < 6; i += 1) {
      estados.push((await login(usuario.email, `incorrecta-${i}-r3`, ip)).statusCode)
    }
    expect(estados, "Q-E2-4: el 401 de la carrera no cuenta como fallo").toEqual([
      401, 401, 401, 401, 401, 429,
    ])
  }, 40_000)

  it("login que termina antes del restablecimiento del admin: 200, y después 0 sesiones vivas y la cookie no refresca", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const admin = await restablecerComoAdmin(usuario.id)

    // El usuario retenido deja al login formado en crearSesion (FOR SHARE) antes que el admin.
    const [resultadoLogin, resultadoAdmin] = await conFilaRetenida(
      { tabla: "usuarios", id: usuario.id },
      [() => login(usuario.email, usuario.contrasena, ipPropia()), admin],
    )

    const respuestaLogin = respuesta(resultadoLogin, "el login")
    expect([estado(resultadoLogin), estado(resultadoAdmin)]).toEqual(["200", "200"])
    const cookie = valorCookieRefresco(respuestaLogin)
    expect(cookie, "el login debe devolver cookie").toBeDefined()
    const refresco = await refrescarDePrueba(obtenerApp(), cookie)
    expect({ vivas: await contarSesionesVivas(usuario.id), refresco: refresco.statusCode }).toEqual(
      {
        vivas: 0,
        refresco: 401,
      },
    )
  }, 40_000)

  it("login con la temporal que termina antes de cambiar-contrasena (sin cookie): 200 y 204, y después 0 sesiones vivas", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { debeCambiarContrasena: true })
    const tokenAcceso = await firmarTokenDePrueba({ usuarioId: usuario.id })

    const [resultadoLogin, resultadoCambio] = await conFilaRetenida(
      { tabla: "usuarios", id: usuario.id },
      [
        () => login(usuario.email, usuario.contrasena, ipPropia()),
        () =>
          post(
            "/api/auth/cambiar-contrasena",
            { contrasenaActual: usuario.contrasena, contrasenaNueva: "contrasena-propia-r3-1" },
            tokenAcceso,
          ),
      ],
    )

    expect([estado(resultadoLogin), estado(resultadoCambio)]).toEqual(["200", "204"])
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
  }, 40_000)
})

describe("ataque: rotarSesion frente a reset:admin con el usuario retenido", () => {
  it("reset:admin primero y refrescar después: refrescar 401 y 0 sesiones vivas", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() })
    const hash = await hashContrasena("contrasena-reset-r3-1")

    const [reset, refresco] = await conFilaRetenida({ tabla: "usuarios", id: usuario.id }, [
      directo(() => actualizarContrasenaYRevocarSesiones(usuario.id, hash)),
      () => refrescarDePrueba(obtenerApp(), sesion.token),
    ])

    expect([estado(reset), estado(refresco)]).toEqual(["ok", "401"])
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
  }, 40_000)

  it("refrescar primero y reset:admin después: 0 sesiones vivas y la cookie rotada no refresca", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() })
    const hash = await hashContrasena("contrasena-reset-r3-2")

    const [refresco, reset] = await conFilaRetenida({ tabla: "usuarios", id: usuario.id }, [
      () => refrescarDePrueba(obtenerApp(), sesion.token),
      directo(() => actualizarContrasenaYRevocarSesiones(usuario.id, hash)),
    ])

    expect(estado(reset)).toBe("ok")
    expect(["200", "401"]).toContain(estado(refresco))
    const cookie = esRespuesta(refresco) ? valorCookieRefresco(refresco) : undefined
    const segundo = cookie === undefined ? undefined : await refrescarDePrueba(obtenerApp(), cookie)
    expect({
      vivas: await contarSesionesVivas(usuario.id),
      rotadaRefresca: segundo?.statusCode === 200,
    }).toEqual({ vivas: 0, rotadaRefresca: false })
  }, 40_000)
})

describe("ataque: refrescos, logout y reutilización entre sí y frente a los escritores", () => {
  it("dos refrescos simultáneos de la misma sesión: 200 y 401, nunca 5xx, y la ganadora queda revocada (DEC-04 de AUTH-01)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() })

    const resultados = await conFilaRetenida({ tabla: "sesiones", id: sesion.id }, [
      () => refrescarDePrueba(obtenerApp(), sesion.token),
      () => refrescarDePrueba(obtenerApp(), sesion.token),
    ])

    expect(resultados.map(estado).sort()).toEqual(["200", "401"])
    const ganadora = resultados.find((r) => esRespuesta(r) && r.statusCode === 200)
    const cookie = esRespuesta(ganadora) ? valorCookieRefresco(ganadora) : undefined
    expect(cookie, "la ganadora debe traer cookie").toBeDefined()
    expect((await refrescarDePrueba(obtenerApp(), cookie)).statusCode).toBe(401)
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
  }, 40_000)

  it("tres refrescos simultáneos de la misma sesión con el usuario retenido: ningún 5xx y 0 sesiones vivas", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() })

    const resultados = await conFilaRetenida({ tabla: "usuarios", id: usuario.id }, [
      () => refrescarDePrueba(obtenerApp(), sesion.token),
      () => refrescarDePrueba(obtenerApp(), sesion.token),
      () => refrescarDePrueba(obtenerApp(), sesion.token),
    ])

    const estados = resultados.map(estado)
    expect(
      estados.filter((e) => !["200", "401"].includes(e)),
      JSON.stringify(estados),
    ).toEqual([])
    expect(estados.filter((e) => e === "200").length).toBeLessThanOrEqual(1)
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
  }, 40_000)

  it("refrescar y logout de la misma cookie a la vez (refrescar primero): 200 y 204, sin 5xx; igual que en serie", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() })

    const [refresco, salida] = await conFilaRetenida({ tabla: "sesiones", id: sesion.id }, [
      () => refrescarDePrueba(obtenerApp(), sesion.token),
      () => logout(sesion.token),
    ])

    // En serie, AUTH-01 ya fija que logout con un token rotado no revoca la sesión nueva
    // (sesiones-y-cadena.ataque); la carrera no puede dar otro resultado ni un 5xx.
    expect([estado(refresco), estado(salida)]).toEqual(["200", "204"])
    expect(await contarSesionesVivas(usuario.id)).toBe(1)
  }, 40_000)

  it("logout y refrescar de la misma cookie a la vez (logout primero): 204 y 401, 0 sesiones vivas", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() })

    const [salida, refresco] = await conFilaRetenida({ tabla: "sesiones", id: sesion.id }, [
      () => logout(sesion.token),
      () => refrescarDePrueba(obtenerApp(), sesion.token),
    ])

    expect([estado(salida), estado(refresco)]).toEqual(["204", "401"])
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
  }, 40_000)

  it("reutilización (revocarTodasLasSesiones) y restablecimiento del admin a la vez: 401 y 200, 0 sesiones vivas", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const s0 = await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() })
    const r1 = await refrescarDePrueba(obtenerApp(), s0.token)
    expect(r1.statusCode, "Precondición: el primer refresco debe rotar").toBe(200)
    const admin = await restablecerComoAdmin(usuario.id)

    const [reutilizacion, resultadoAdmin] = await conFilaRetenida(
      { tabla: "usuarios", id: usuario.id },
      [() => refrescarDePrueba(obtenerApp(), s0.token), admin],
    )

    expect([estado(reutilizacion), estado(resultadoAdmin)]).toEqual(["401", "200"])
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
  }, 40_000)

  it("reutilización y cambiar-contrasena con la cookie vigente a la vez: 401 y 204, sin 5xx y 0 sesiones vivas", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { debeCambiarContrasena: true })
    const s0 = await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() })
    const r1 = await refrescarDePrueba(obtenerApp(), s0.token)
    const s1 = valorCookieRefresco(r1)
    expect(s1, "Precondición: el primer refresco debe rotar").toBeDefined()
    const tokenAcceso = await firmarTokenDePrueba({ usuarioId: usuario.id })

    const [reutilizacion, cambio] = await conFilaRetenida({ tabla: "usuarios", id: usuario.id }, [
      () => refrescarDePrueba(obtenerApp(), s0.token),
      () =>
        obtenerApp().inject({
          method: "POST",
          url: "/api/auth/cambiar-contrasena",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${tokenAcceso}`,
          },
          cookies: { [NOMBRE_COOKIE]: s1 ?? "" },
          payload: JSON.stringify({
            contrasenaActual: usuario.contrasena,
            contrasenaNueva: "contrasena-propia-r3-2",
          }),
        }),
    ])

    // La reutilización va primero: revoca S1 y el cambio ya no tiene sesión que conservar.
    expect([estado(reutilizacion), estado(cambio)]).toEqual(["401", "204"])
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
  }, 40_000)

  it("reutilización y un login a la vez: ningún 5xx", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const s0 = await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() })
    expect((await refrescarDePrueba(obtenerApp(), s0.token)).statusCode).toBe(200)

    const resultados = await conFilaRetenida({ tabla: "usuarios", id: usuario.id }, [
      () => login(usuario.email, usuario.contrasena, ipPropia()),
      () => refrescarDePrueba(obtenerApp(), s0.token),
      () => login(usuario.email, usuario.contrasena, ipPropia()),
    ])

    // Login formado antes de la reutilización: su sesión cae con ella. El que va después sobrevive.
    expect(resultados.map(estado)).toEqual(["200", "401", "200"])
    expect(await contarSesionesVivas(usuario.id)).toBe(1)
  }, 40_000)
})

describe("ataque: decisiones que se toman antes del bloqueo (PB-4)", () => {
  it("cambiar-contrasena con la cookie S mientras la misma S se refresca: el resultado es el de DEC-09 evaluado al confirmar (S ya reemplazada: no se conserva nada)", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { debeCambiarContrasena: true })
    const sesion = await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() })
    const tokenAcceso = await firmarTokenDePrueba({ usuarioId: usuario.id })

    // El handler decide qué sesión conservar antes de la transacción; el refresco rota S a S' entre
    // esa lectura y el bloqueo de escritura.
    const [refresco, cambio] = await conFilaRetenida({ tabla: "sesiones", id: sesion.id }, [
      () => refrescarDePrueba(obtenerApp(), sesion.token),
      () =>
        obtenerApp().inject({
          method: "POST",
          url: "/api/auth/cambiar-contrasena",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${tokenAcceso}`,
          },
          cookies: { [NOMBRE_COOKIE]: sesion.token },
          payload: JSON.stringify({
            contrasenaActual: usuario.contrasena,
            contrasenaNueva: "contrasena-propia-r3-3",
          }),
        }),
    ])

    expect([estado(refresco), estado(cambio)]).toEqual(["200", "204"])
    // Nunca queda viva una sesión que no sea la conservada: aquí ninguna, porque al confirmar S ya
    // estaba reemplazada ("sin una cookie válida, se revocan todas").
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
  }, 40_000)

  it("una baja conforme a PB-8 (bloqueo, activo = false, revoca sesiones y enlaces) frente a restablecer, refrescar y login ya formados: 400, 401 y 401", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() })
    const recuperacion = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: treintaMinutos(),
    })

    // restablecer, refrescar y login leen "cuenta activa" y "enlace vivo" sin bloqueo; la baja
    // confirma antes de que ellos obtengan la fila del usuario.
    const resultados = await conFilaRetenida(
      { tabla: "usuarios", id: usuario.id },
      [
        () =>
          post("/api/auth/restablecer", {
            token: recuperacion.token,
            contrasena: "contrasena-baja-r3-1",
          }),
        () => refrescarDePrueba(obtenerApp(), sesion.token),
        () => login(usuario.email, usuario.contrasena, ipPropia()),
      ],
      {
        antesDeSoltar: async (sql) => {
          await sql`UPDATE usuarios SET activo = false WHERE id = ${usuario.id}::uuid`
          await sql`UPDATE sesiones SET revocada_en = now() WHERE usuario_id = ${usuario.id}::uuid AND revocada_en IS NULL`
          await sql`UPDATE tokens_cuenta SET revocado_en = now() WHERE usuario_id = ${usuario.id}::uuid AND usado_en IS NULL AND revocado_en IS NULL`
        },
      },
    )

    expect(resultados.map(estado)).toEqual(["400", "401", "401"])
    const vivos = (await leerTokens(usuario.id)).filter(
      (t) => t.usadoEn === null && t.revocadoEn === null,
    )
    expect({ vivas: await contarSesionesVivas(usuario.id), enlacesVivos: vivos.length }).toEqual({
      vivas: 0,
      enlacesVivos: 0,
    })
  }, 40_000)
})

describe("ataque: worker de recuperación frente a un enlace del mismo usuario", () => {
  it("prepararTokenDeRecuperacion formado antes de restablecer: sin 5xx y a lo más un enlace vivo", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const vieja = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: treintaMinutos(),
    })
    const idNuevo = randomUUID()
    const ahora = new Date()

    const [preparar, restablecer] = await conFilaRetenida({ tabla: "usuarios", id: usuario.id }, [
      directo(() =>
        prepararTokenDeRecuperacion({
          id: idNuevo,
          usuarioId: usuario.id,
          hashToken: derivarTokenDeCuenta(idNuevo).hash,
          expiraEn: treintaMinutos(),
          ahora,
        }),
      ),
      () => post("/api/auth/restablecer", { token: vieja.token, contrasena: "contrasena-r3-w-1" }),
    ])

    // El worker revoca el enlace viejo antes de que restablecer lo use: 400 ENLACE_INVALIDO.
    const respuestaRestablecer = respuesta(restablecer, "restablecer")
    expect([estado(preparar), respuestaRestablecer.statusCode]).toEqual(["ok", 400])
    expect(codigoDeError(respuestaRestablecer)).toBe("ENLACE_INVALIDO")
    const vivos = (await leerTokens(usuario.id)).filter(
      (t) => t.usadoEn === null && t.revocadoEn === null,
    )
    expect(vivos.map((t) => t.id)).toEqual([idNuevo])
  }, 40_000)
})

describe("ataque: corregirCorreo (FOR UPDATE) frente a las sesiones y a la unicidad del correo", () => {
  it("refrescar formado antes de corregir el correo del mismo usuario: 200 y 200, la sesión rotada sigue viva (S-06)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() })
    const tokenAdmin = await firmarTokenDePrueba({ usuarioId: await adminId() })

    const [refresco, correccion] = await conFilaRetenida({ tabla: "sesiones", id: sesion.id }, [
      () => refrescarDePrueba(obtenerApp(), sesion.token),
      () =>
        obtenerApp().inject({
          method: "PUT",
          url: `/api/admin/usuarios/${usuario.id}/correo`,
          headers: { authorization: `Bearer ${tokenAdmin}`, "content-type": "application/json" },
          payload: JSON.stringify({ email: correoDePrueba("corregido-r3") }),
        }),
    ])

    expect([estado(refresco), estado(correccion)]).toEqual(["200", "200"])
    expect(await contarSesionesVivas(usuario.id)).toBe(1)
  }, 40_000)

  it("login formado antes de corregir el correo del mismo usuario: 200 y 200", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const tokenAdmin = await firmarTokenDePrueba({ usuarioId: await adminId() })

    const [resultadoLogin, correccion] = await conFilaRetenida(
      { tabla: "usuarios", id: usuario.id },
      [
        () => login(usuario.email, usuario.contrasena, ipPropia()),
        () =>
          obtenerApp().inject({
            method: "PUT",
            url: `/api/admin/usuarios/${usuario.id}/correo`,
            headers: { authorization: `Bearer ${tokenAdmin}`, "content-type": "application/json" },
            payload: JSON.stringify({ email: correoDePrueba("corregido-r3") }),
          }),
      ],
    )

    expect([estado(resultadoLogin), estado(correccion)]).toEqual(["200", "200"])
    expect(await contarSesionesVivas(usuario.id)).toBe(1)
  }, 40_000)

  it("corregir A al correo de B mientras B tiene una escritura en curso: espera y responde 409, nunca 500", async () => {
    const a = await crearUsuarioDePrueba(ids)
    const b = await crearUsuarioDePrueba(ids)
    const tokenAdmin = await firmarTokenDePrueba({ usuarioId: await adminId() })

    // La retenedora actualiza la fila de B sin cambiar su correo (como cualquier escritor del
    // protocolo): la comprobación de unicidad de A tiene que esperar a esa transacción.
    const [correccion] = await conFilaRetenida(
      { tabla: "usuarios", id: b.id },
      [
        () =>
          obtenerApp().inject({
            method: "PUT",
            url: `/api/admin/usuarios/${a.id}/correo`,
            headers: { authorization: `Bearer ${tokenAdmin}`, "content-type": "application/json" },
            payload: JSON.stringify({ email: b.email }),
          }),
      ],
      {
        alRetener: async (sql) => {
          await sql`UPDATE usuarios SET debe_cambiar_contrasena = false WHERE id = ${b.id}::uuid`
        },
      },
    )

    const respuestaCorreccion = respuesta(correccion, "la corrección")
    expect({
      estado: respuestaCorreccion.statusCode,
      codigo: codigoDeError(respuestaCorreccion),
    }).toEqual({ estado: 409, codigo: "CORREO_EN_USO" })
  }, 40_000)
})

describe("ataque: transacciones que Prisma cierra por tiempo (P2028) a mitad de una espera de bloqueo", () => {
  it("login formado detrás de una fila retenida más de 5 s: responde con el formato de la API, no deja sesión y el pool sigue sano", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const otro = await crearUsuarioDePrueba(ids)

    let paralelas: LightMyRequestResponse[] = []
    const [resultadoLogin] = await conFilaRetenida(
      { tabla: "usuarios", id: usuario.id },
      [() => login(usuario.email, usuario.contrasena, ipPropia())],
      {
        antesDeSoltar: async () => {
          // Pasado el límite de 5 s de la transacción interactiva, con la consulta del login todavía
          // bloqueada, otras peticiones usan el pool (y quizá la conexión que el login dejó).
          await esperar(5_600)
          paralelas = await Promise.all(
            Array.from({ length: 12 }, () => login(otro.email, otro.contrasena, ipPropia())),
          )
        },
        retenerMs: 500,
      },
    )

    const respuestaLogin = respuesta(resultadoLogin, "el login")
    await esperar(300)
    // Observado en la ronda 3: 500 ERROR_INTERNO (P2028 en tx.sesion.create). Sin límite de espera
    // propio, es la única salida posible; lo que se exige es el formato, la atomicidad y el pool.
    expect({
      formato:
        respuestaLogin.statusCode === 200 ||
        errorApiSchema.safeParse(respuestaLogin.json()).success,
      paralelas: paralelas.map((r) => r.statusCode),
      vivasOtro: await contarSesionesVivas(otro.id),
    }).toEqual({
      formato: true,
      paralelas: Array.from({ length: 12 }, () => 200),
      vivasOtro: 12,
    })
    const vivas = await contarSesionesVivas(usuario.id)
    const cookie = valorCookieRefresco(respuestaLogin)
    expect(
      { estado: respuestaLogin.statusCode, vivas, conCookie: cookie !== undefined },
      "una sesión solo existe si la respuesta la entregó",
    ).toEqual(
      respuestaLogin.statusCode === 200
        ? { estado: 200, vivas: 1, conCookie: true }
        : { estado: respuestaLogin.statusCode, vivas: 0, conCookie: false },
    )
    expect((await login(usuario.email, usuario.contrasena, ipPropia())).statusCode).toBe(200)
  }, 40_000)

  it("restablecer formado detrás de una fila retenida más de 5 s: si no responde 204, el enlace sigue sin usar y la contraseña no cambió", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() })
    const recuperacion = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: treintaMinutos(),
    })

    const [resultado] = await conFilaRetenida(
      { tabla: "usuarios", id: usuario.id },
      [
        () =>
          post("/api/auth/restablecer", {
            token: recuperacion.token,
            contrasena: "contrasena-p2028-r3",
          }),
      ],
      { retenerMs: 6_000 },
    )

    const r = respuesta(resultado, "restablecer")
    await esperar(300)
    const [token] = (await leerTokens(usuario.id)).filter((t) => t.id === recuperacion.id)
    const loginVieja = await login(usuario.email, usuario.contrasena, ipPropia())
    const estadoFinal = {
      usado: token?.usadoEn !== null,
      vivas: await contarSesionesVivas(usuario.id),
      viejaEntra: loginVieja.statusCode === 200,
    }
    expect(
      { estado: r.statusCode, ...estadoFinal },
      "la transacción es atómica: o todo (204) o nada",
    ).toEqual(
      r.statusCode === 204
        ? { estado: 204, usado: true, vivas: 0, viejaEntra: false }
        : { estado: r.statusCode, usado: false, vivas: 2, viejaEntra: true },
    )
    expect(r.statusCode === 204 || errorApiSchema.safeParse(r.json()).success).toBe(true)
  }, 40_000)
})

describe("ataque: ráfaga mixta sin fila retenida sobre un mismo usuario", () => {
  it("logins, refrescos, logouts, restablecimientos del admin, reset:admin, correcciones de correo y el worker a la vez: ningún 5xx ni error de adaptador (3 rondas)", async () => {
    for (let ronda = 0; ronda < 3; ronda += 1) {
      const usuario = await crearUsuarioDePrueba(ids)
      const sesiones = await Promise.all(
        Array.from({ length: 6 }, () =>
          crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() }),
        ),
      )
      const admin = await restablecerComoAdmin(usuario.id)
      const tokenAdmin = await firmarTokenDePrueba({ usuarioId: await adminId() })
      const hash = await hashContrasena(`contrasena-rafaga-${ronda}-r3`)
      const recuperacion = await crearTokenDePrueba({
        usuarioId: usuario.id,
        tipo: "recuperacion",
        expiraEn: treintaMinutos(),
      })
      const idWorker = randomUUID()

      const operaciones: Operacion[] = [
        ...Array.from(
          { length: 8 },
          () => () => login(usuario.email, usuario.contrasena, ipPropia()),
        ),
        ...sesiones.slice(0, 4).map((s) => () => refrescarDePrueba(obtenerApp(), s.token)),
        ...sesiones.slice(4).map((s) => () => logout(s.token)),
        () => refrescarDePrueba(obtenerApp(), sesiones[0]?.token),
        admin,
        admin,
        directo(() => actualizarContrasenaYRevocarSesiones(usuario.id, hash)),
        () =>
          obtenerApp().inject({
            method: "PUT",
            url: `/api/admin/usuarios/${usuario.id}/correo`,
            headers: { authorization: `Bearer ${tokenAdmin}`, "content-type": "application/json" },
            payload: JSON.stringify({ email: correoDePrueba("rafaga-r3") }),
          }),
        directo(() =>
          prepararTokenDeRecuperacion({
            id: idWorker,
            usuarioId: usuario.id,
            hashToken: derivarTokenDeCuenta(idWorker).hash,
            expiraEn: treintaMinutos(),
            ahora: new Date(),
          }),
        ),
        () =>
          post("/api/auth/restablecer", {
            token: recuperacion.token,
            contrasena: `contrasena-rafaga-enlace-${ronda}`,
          }),
      ]

      const resultados = await Promise.all(operaciones.map((operacion) => operacion()))
      const estados = resultados.map(estado)
      expect(
        estados.filter((e) => e.startsWith("error") || Number(e) >= 500),
        `ronda ${ronda}: ${JSON.stringify(estados)}`,
      ).toEqual([])
    }
  }, 60_000)
})
