import { randomBytes, randomUUID } from "node:crypto"

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
  desactivarUsuarioDePrueba,
  firmarTokenDePrueba,
  iniciarSesionDePrueba,
  NOMBRE_COOKIE,
  refrescarDePrueba,
} from "./ayudas-auth.js"
import { crearTokenDePrueba, leerTokens } from "./ayudas-cuentas.js"

// Ataques del Tester (AUTH-03a, ronda 1) contra el cambio obligatorio sin la temporal (B-03 B,
// M-02, M-03), POST /auth/invitacion y el nombre al establecer la contraseña (§D-A1, §D-A2 y
// "Puntos de ataque", AUTH-03a, 1 a 3).
//
// Método de las carreras (el de cuentas-r3, reescrito aquí: no se importa de ningún *.ataque): una
// transacción de la prueba retiene una fila con SELECT ... FOR UPDATE, lanza las operaciones en un
// orden fijo y espera con pg_blocking_pids a que cada una esté formada detrás de la fila. Con la
// fila del usuario retenida, cambiar-contrasena ya pasó el filtro previo (una lectura sin bloqueo)
// y espera el bloqueo de escritura; lo que la transacción retenedora haga en ese momento ocurre
// exactamente "entre el filtro previo y el bloqueo".

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
  return `10.131.${Math.floor(contadorIp / 250)}.${contadorIp % 250}`
}

const post = (url: string, payload: unknown, token?: string) =>
  obtenerApp().inject({
    method: "POST",
    url,
    headers: {
      "content-type": "application/json",
      ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
    },
    payload: typeof payload === "string" ? payload : JSON.stringify(payload),
  })

const login = (email: string, contrasena: string) =>
  obtenerApp().inject({
    method: "POST",
    url: "/api/auth/login",
    headers: { "content-type": "application/json" },
    payload: JSON.stringify({ email, contrasena }),
    remoteAddress: ipPropia(),
  })

const cambiar = ({
  tokenAcceso,
  cookie,
  cuerpo,
}: {
  tokenAcceso: string
  cookie?: string
  cuerpo: unknown
}) =>
  obtenerApp().inject({
    method: "POST",
    url: "/api/auth/cambiar-contrasena",
    headers: { "content-type": "application/json", authorization: `Bearer ${tokenAcceso}` },
    ...(cookie === undefined ? {} : { cookies: { [NOMBRE_COOKIE]: cookie } }),
    payload: JSON.stringify(cuerpo),
  })

const codigoDe = (respuesta: LightMyRequestResponse): string | undefined =>
  errorApiSchema.safeParse(respuesta.json()).data?.error.codigo

const sinFecha = (respuesta: LightMyRequestResponse): Record<string, unknown> => {
  const resto: Record<string, unknown> = { ...respuesta.headers }
  delete resto.date
  return resto
}

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

const leerUsuario = (id: string) =>
  obtenerDb().usuario.findUnique({
    where: { id },
    select: {
      nombre: true,
      nombreBusqueda: true,
      rol: true,
      debeCambiarContrasena: true,
      accesoRestringido: true,
      hashContrasena: true,
    },
  })

const sesionesVivas = async (usuarioId: string): Promise<string[]> =>
  (
    await obtenerDb().sesion.findMany({
      where: { usuarioId, revocadaEn: null },
      select: { id: true },
      orderBy: { creadoEn: "asc" },
    })
  )
    .map((sesion) => sesion.id)
    .sort()

const treintaDias = (): Date => new Date(Date.now() + 30 * 86_400_000)
const setentaYDosHoras = (): Date => new Date(Date.now() + 72 * 3_600_000)

// --- Carreras con una fila retenida -----------------------------------------------------------

type EjecutarSql = (sql: TemplateStringsArray, ...valores: unknown[]) => Promise<number>
type Operacion = () => Promise<LightMyRequestResponse>

const conFilaRetenida = async (
  fila: { tabla: "usuarios" | "sesiones"; id: string },
  operaciones: readonly Operacion[],
  antesDeSoltar?: (sql: EjecutarSql) => Promise<void>,
): Promise<LightMyRequestResponse[]> => {
  const lanzadas: Promise<LightMyRequestResponse>[] = []
  await obtenerDb().$transaction(
    async (tx) => {
      await (fila.tabla === "usuarios"
        ? tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${fila.id}::uuid FOR UPDATE`
        : tx.$queryRaw`SELECT id FROM sesiones WHERE id = ${fila.id}::uuid FOR UPDATE`)
      const sql: EjecutarSql = (texto, ...valores) => tx.$executeRaw(texto, ...valores)
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
          formada,
          `Precondición: la operación ${indice + 1} debe quedar formada detrás de la fila retenida (terminó antes: ${String(terminada)})`,
        ).toBe(true)
      }
      if (antesDeSoltar) await antesDeSoltar(sql)
      await esperar(100)
    },
    { timeout: 40_000, maxWait: 5_000 },
  )
  return Promise.all(lanzadas)
}

// Un usuario con cambio pendiente que entró con su temporal: su JWT y la cookie de esa sesión.
const conTemporal = async (opciones: { contrasena?: string; accesoRestringido?: boolean } = {}) => {
  const usuario = await crearUsuarioDePrueba(ids, { debeCambiarContrasena: true, ...opciones })
  const sesion = await iniciarSesionDePrueba(obtenerApp(), usuario)
  const [sesionId] = await sesionesVivas(usuario.id)
  if (sesionId === undefined) throw new Error("Precondición: el login no dejó una sesión viva")
  return { usuario, sesion, sesionId }
}

describe("ataque (AUTH-03a r1): cambio obligatorio sin la temporal", () => {
  it("el JWT emitido antes del restablecimiento, sin cookie y con la cookie vieja: nunca 204, y nada cambia", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const antes = await iniciarSesionDePrueba(obtenerApp(), usuario)
    const reset = await (await restablecerComoAdmin(usuario.id))()
    expect(reset.statusCode, "Precondición: el restablecimiento del admin").toBe(200)
    const { contrasenaTemporal } = reset.json<{ contrasenaTemporal: string }>()
    const hashAntes = (await leerUsuario(usuario.id))?.hashContrasena

    const sinCookie = await cambiar({
      tokenAcceso: antes.tokenAcceso,
      cuerpo: { contrasenaNueva: "robada-sin-cookie-1" },
    })
    const conCookieVieja = await cambiar({
      tokenAcceso: antes.tokenAcceso,
      cookie: antes.cookie,
      cuerpo: { contrasenaNueva: "robada-con-cookie-1" },
    })

    expect([sinCookie.statusCode, conCookieVieja.statusCode]).toEqual([401, 401])
    expect([codigoDe(sinCookie), codigoDe(conCookieVieja)]).toEqual([
      "SESION_INVALIDA",
      "SESION_INVALIDA",
    ])
    const despues = await leerUsuario(usuario.id)
    expect(despues?.debeCambiarContrasena).toBe(true)
    expect(despues?.hashContrasena).toBe(hashAntes)
    expect((await login(usuario.email, contrasenaTemporal)).statusCode).toBe(200)
  })

  it("M-02: 10 peticiones sin sesión viva propia (sin cookie, basura, revocada, vencida y ajena) no gastan los intentos del usuario legítimo", async () => {
    const { usuario, sesion } = await conTemporal()
    const otro = await crearUsuarioDePrueba(ids)
    const ajena = await iniciarSesionDePrueba(obtenerApp(), otro)
    const revocada = await crearSesionDePrueba({
      usuarioId: usuario.id,
      expiraEn: treintaDias(),
      revocadaEn: new Date(),
    })
    const vencida = await crearSesionDePrueba({
      usuarioId: usuario.id,
      expiraEn: new Date(Date.now() - 1),
    })

    const cookiesSinSesion: (string | undefined)[] = [
      undefined,
      undefined,
      "",
      randomBytes(32).toString("base64url"),
      "x".repeat(4_000),
      revocada.token,
      revocada.token,
      vencida.token,
      ajena.cookie,
      ajena.cookie,
    ]
    const estados: (number | string | undefined)[] = []
    for (const cookie of cookiesSinSesion) {
      const respuesta = await cambiar({
        tokenAcceso: sesion.tokenAcceso,
        ...(cookie === undefined ? {} : { cookie }),
        cuerpo: { contrasenaNueva: usuario.contrasena },
      })
      estados.push(`${respuesta.statusCode} ${String(codigoDe(respuesta))}`)
    }
    expect(estados).toEqual(Array(10).fill("401 SESION_INVALIDA"))

    // Con su cookie: 4 repetidas cuentan (400) y la 5.ª, válida, entra. Si cualquiera de las 10
    // anteriores hubiera reservado un intento, esta ya sería 429.
    for (let intento = 0; intento < 4; intento += 1) {
      const repetida = await cambiar({
        tokenAcceso: sesion.tokenAcceso,
        cookie: sesion.cookie,
        cuerpo: { contrasenaNueva: usuario.contrasena },
      })
      expect(`${repetida.statusCode} ${String(codigoDe(repetida))}`).toBe("400 CONTRASENA_REPETIDA")
    }
    const valida = await cambiar({
      tokenAcceso: sesion.tokenAcceso,
      cookie: sesion.cookie,
      cuerpo: { contrasenaNueva: "propia-tras-el-ataque-1" },
    })
    expect(valida.statusCode, valida.body).toBe(204)
    expect(await contarSesionesVivas(otro.id)).toBe(1)
  })

  it("la cookie de la sesión con la temporal de A con el JWT de B (también con bandera): 401 y nada cambia en ninguno", async () => {
    const a = await conTemporal()
    const b = await conTemporal()
    const hashA = (await leerUsuario(a.usuario.id))?.hashContrasena
    const hashB = (await leerUsuario(b.usuario.id))?.hashContrasena

    const respuesta = await cambiar({
      tokenAcceso: b.sesion.tokenAcceso,
      cookie: a.sesion.cookie,
      cuerpo: { contrasenaNueva: "cruzada-a-con-b-1" },
    })

    expect(respuesta.statusCode).toBe(401)
    expect(codigoDe(respuesta)).toBe("SESION_INVALIDA")
    expect(await sesionesVivas(a.usuario.id)).toEqual([a.sesionId])
    expect(await sesionesVivas(b.usuario.id)).toEqual([b.sesionId])
    const despuesA = await leerUsuario(a.usuario.id)
    const despuesB = await leerUsuario(b.usuario.id)
    expect([despuesA?.hashContrasena, despuesB?.hashContrasena]).toEqual([hashA, hashB])
    expect([despuesA?.debeCambiarContrasena, despuesB?.debeCambiarContrasena]).toEqual([true, true])
  })

  it("una sesión propia vencida hace 1 ms: 401 aunque la cookie sea del mismo usuario", async () => {
    const { usuario, sesion } = await conTemporal()
    const vencida = await crearSesionDePrueba({
      usuarioId: usuario.id,
      expiraEn: new Date(Date.now() - 1),
    })
    const respuesta = await cambiar({
      tokenAcceso: sesion.tokenAcceso,
      cookie: vencida.token,
      cuerpo: { contrasenaNueva: "tras-vencida-1234" },
    })
    expect(respuesta.statusCode).toBe(401)
    expect((await leerUsuario(usuario.id))?.debeCambiarContrasena).toBe(true)
  })

  it("entre el filtro previo y el bloqueo, la sesión se revoca: 401 sin escribir (ni hash, ni bandera, ni otras sesiones)", async () => {
    const { usuario, sesion, sesionId } = await conTemporal()
    const otra = await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: treintaDias() })
    const hashAntes = (await leerUsuario(usuario.id))?.hashContrasena

    const [respuesta] = await conFilaRetenida(
      { tabla: "usuarios", id: usuario.id },
      [
        () =>
          cambiar({
            tokenAcceso: sesion.tokenAcceso,
            cookie: sesion.cookie,
            cuerpo: { contrasenaNueva: "entre-filtro-y-bloqueo-1" },
          }),
      ],
      async (sql) => {
        await sql`UPDATE sesiones SET revocada_en = now() WHERE id = ${sesionId}::uuid`
      },
    )

    expect(respuesta?.statusCode, respuesta?.body).toBe(401)
    expect(respuesta === undefined ? undefined : codigoDe(respuesta)).toBe("SESION_INVALIDA")
    const despues = await leerUsuario(usuario.id)
    expect(despues?.hashContrasena).toBe(hashAntes)
    expect(despues?.debeCambiarContrasena).toBe(true)
    expect(await sesionesVivas(usuario.id)).toEqual([otra.id])
  }, 45_000)

  it("entre el filtro previo y el bloqueo, la sesión rota a S2: 401 sin escribir y S2 sigue viva", async () => {
    const { usuario, sesion, sesionId } = await conTemporal()
    const hashAntes = (await leerUsuario(usuario.id))?.hashContrasena
    const s2 = randomUUID()

    const [respuesta] = await conFilaRetenida(
      { tabla: "usuarios", id: usuario.id },
      [
        () =>
          cambiar({
            tokenAcceso: sesion.tokenAcceso,
            cookie: sesion.cookie,
            cuerpo: { contrasenaNueva: "rotada-en-medio-1" },
          }),
      ],
      async (sql) => {
        const hash = randomBytes(32).toString("hex")
        await sql`INSERT INTO sesiones (id, usuario_id, hash_token, expira_en)
          VALUES (${s2}::uuid, ${usuario.id}::uuid, ${hash}, now() + interval '30 days')`
        await sql`UPDATE sesiones SET revocada_en = now(), reemplazada_por = ${s2}::uuid
          WHERE id = ${sesionId}::uuid`
      },
    )

    expect(respuesta?.statusCode, respuesta?.body).toBe(401)
    const despues = await leerUsuario(usuario.id)
    expect(despues?.hashContrasena).toBe(hashAntes)
    expect(despues?.debeCambiarContrasena).toBe(true)
    expect(await sesionesVivas(usuario.id)).toEqual([s2])
  }, 45_000)

  it("dos cambios simultáneos con la misma sesión: un 204 y un 401, nunca 5xx, y un solo hash final (el del 204)", async () => {
    const { usuario, sesion } = await conTemporal()
    const primera = "simultanea-uno-1234"
    const segunda = "simultanea-dos-1234"

    const respuestas = await conFilaRetenida({ tabla: "usuarios", id: usuario.id }, [
      () =>
        cambiar({
          tokenAcceso: sesion.tokenAcceso,
          cookie: sesion.cookie,
          cuerpo: { contrasenaNueva: primera },
        }),
      () =>
        cambiar({
          tokenAcceso: sesion.tokenAcceso,
          cookie: sesion.cookie,
          cuerpo: { contrasenaNueva: segunda },
        }),
    ])

    const estados = respuestas.map((r) => r.statusCode)
    expect([...estados].sort()).toEqual([204, 401])
    const ganadora = estados[0] === 204 ? primera : segunda
    const perdedora = ganadora === primera ? segunda : primera
    expect((await login(usuario.email, ganadora)).statusCode).toBe(200)
    expect((await login(usuario.email, perdedora)).statusCode).toBe(401)
    expect((await leerUsuario(usuario.id))?.debeCambiarContrasena).toBe(false)
  }, 45_000)

  it("cambio formado antes de un restablecimiento del admin: 204 y 200; al final manda la temporal nueva, con la bandera y sin sesiones", async () => {
    const { usuario, sesion } = await conTemporal()
    const admin = await restablecerComoAdmin(usuario.id)
    const propia = "propia-antes-del-admin-1"

    const [cambio, reset] = await conFilaRetenida({ tabla: "usuarios", id: usuario.id }, [
      () =>
        cambiar({
          tokenAcceso: sesion.tokenAcceso,
          cookie: sesion.cookie,
          cuerpo: { contrasenaNueva: propia },
        }),
      admin,
    ])

    expect([cambio?.statusCode, reset?.statusCode]).toEqual([204, 200])
    const temporalNueva = reset?.json<{ contrasenaTemporal: string }>().contrasenaTemporal ?? ""
    expect(temporalNueva.length).toBeGreaterThan(0)
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
    expect((await leerUsuario(usuario.id))?.debeCambiarContrasena).toBe(true)
    expect((await refrescarDePrueba(obtenerApp(), sesion.cookie)).statusCode).toBe(401)
    expect((await login(usuario.email, propia)).statusCode).toBe(401)
    expect((await login(usuario.email, temporalNueva)).statusCode).toBe(200)
  }, 45_000)

  it("un cuerpo con contrasenaActual y claves extra (rol, bandera, restricción, usuarioId, sesionId): solo cambia la contraseña propia", async () => {
    const { usuario, sesion, sesionId } = await conTemporal()
    const otro = await crearUsuarioDePrueba(ids)
    const hashOtro = (await leerUsuario(otro.id))?.hashContrasena
    const otraSesion = await crearSesionDePrueba({ usuarioId: otro.id, expiraEn: treintaDias() })

    const respuesta = await cambiar({
      tokenAcceso: sesion.tokenAcceso,
      cookie: sesion.cookie,
      cuerpo: {
        contrasenaActual: "no-es-la-temporal",
        contrasenaNueva: "propia-con-extras-1",
        rol: "admin",
        debeCambiarContrasena: true,
        accesoRestringido: true,
        estadoPago: "deudor",
        usuarioId: otro.id,
        id: otro.id,
        sesionId: otraSesion.id,
      },
    })

    expect(respuesta.statusCode, respuesta.body).toBe(204)
    const propio = await leerUsuario(usuario.id)
    expect(propio).toMatchObject({
      rol: "estudiante",
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
    expect(await sesionesVivas(usuario.id)).toEqual([sesionId])
    expect((await leerUsuario(otro.id))?.hashContrasena).toBe(hashOtro)
    expect(await sesionesVivas(otro.id)).toEqual([otraSesion.id])
    expect(await obtenerDb().usuario.count({ where: { rol: "admin" } })).toBe(1)
  })

  it("la nueva igual a la temporal con mayúsculas y minúsculas invertidas es otra contraseña: 204", async () => {
    const { usuario, sesion } = await conTemporal({ contrasena: "Temporal-Abc-9876" })
    const respuesta = await cambiar({
      tokenAcceso: sesion.tokenAcceso,
      cookie: sesion.cookie,
      cuerpo: { contrasenaNueva: "tEMPORAL-aBC-9876" },
    })
    expect(respuesta.statusCode, respuesta.body).toBe(204)
    expect((await login(usuario.email, "tEMPORAL-aBC-9876")).statusCode).toBe(200)
  })

  it("con la bandera ya apagada, la sesión viva no reabre el cambio: 409 y la contraseña no cambia", async () => {
    const { usuario, sesion } = await conTemporal()
    const primero = await cambiar({
      tokenAcceso: sesion.tokenAcceso,
      cookie: sesion.cookie,
      cuerpo: { contrasenaNueva: "primera-propia-1234" },
    })
    expect(primero.statusCode).toBe(204)
    const segundo = await cambiar({
      tokenAcceso: sesion.tokenAcceso,
      cookie: sesion.cookie,
      cuerpo: { contrasenaNueva: "segunda-propia-1234" },
    })
    expect(segundo.statusCode).toBe(409)
    expect((await login(usuario.email, "primera-propia-1234")).statusCode).toBe(200)
  })
})

// --- POST /auth/invitacion ----------------------------------------------------------------------

const maestroInvitado = async (nombre = "Maestra Invitada") => {
  const maestro = await crearUsuarioDePrueba(ids, { rol: "maestro", nombre })
  const invitacion = await crearTokenDePrueba({
    usuarioId: maestro.id,
    tipo: "invitacion",
    expiraEn: setentaYDosHoras(),
  })
  return { maestro, invitacion }
}

const pedirInvitacion = (token: unknown, autorizacion?: string) =>
  post("/api/auth/invitacion", { token }, autorizacion)

describe("ataque (AUTH-03a r1): POST /auth/invitacion", () => {
  it("con una invitación viva: 200 con exactamente { nombre }, no-store, sin correo, id ni rol, y sin consumir el enlace", async () => {
    const { maestro, invitacion } = await maestroInvitado("Lucía Pérez Invitada")

    const primera = await pedirInvitacion(invitacion.token)
    const segunda = await pedirInvitacion(invitacion.token)

    for (const respuesta of [primera, segunda]) {
      expect(respuesta.statusCode).toBe(200)
      expect(respuesta.json()).toEqual({ nombre: "Lucía Pérez Invitada" })
      expect(respuesta.headers["cache-control"]).toBe("no-store")
      expect(respuesta.body).not.toContain(maestro.email)
      expect(respuesta.body).not.toContain(maestro.id)
      expect(respuesta.body).not.toMatch(/maestro|rol|email|correo|activo|estadoPago/i)
    }
    const [token] = await leerTokens(maestro.id)
    expect(token).toMatchObject({ usadoEn: null, revocadoEn: null })
    const activar = await post("/api/auth/establecer-contrasena", {
      token: invitacion.token,
      contrasena: "activada-tras-leer-1",
    })
    expect(activar.statusCode).toBe(204)
  })

  it("inexistente, usado, revocado, vencido por 1 ms, de recuperación, de una cuenta inactiva y de otra forma: el mismo 400, cuerpo y encabezados", async () => {
    const usado = await maestroInvitado()
    const tokenUsado = await crearTokenDePrueba({
      usuarioId: usado.maestro.id,
      tipo: "invitacion",
      expiraEn: setentaYDosHoras(),
      usadoEn: new Date(),
    })
    const revocado = await crearTokenDePrueba({
      usuarioId: usado.maestro.id,
      tipo: "invitacion",
      expiraEn: setentaYDosHoras(),
      revocadoEn: new Date(),
    })
    const vencido = await crearTokenDePrueba({
      usuarioId: usado.maestro.id,
      tipo: "invitacion",
      expiraEn: new Date(Date.now() - 1),
    })
    const alumno = await crearUsuarioDePrueba(ids)
    const recuperacion = await crearTokenDePrueba({
      usuarioId: alumno.id,
      tipo: "recuperacion",
      expiraEn: new Date(Date.now() + 30 * 60_000),
    })
    const inactiva = await maestroInvitado("Cuenta Dada De Baja")
    await desactivarUsuarioDePrueba(inactiva.maestro.id)

    const casos: [string, string][] = [
      ["inexistente", randomBytes(32).toString("base64url")],
      ["usado", tokenUsado.token],
      ["revocado", revocado.token],
      ["vencido", vencido.token],
      ["de recuperación", recuperacion.token],
      ["de una cuenta inactiva", inactiva.invitacion.token],
      ["de 42 caracteres", usado.invitacion.token.slice(0, 42)],
      ["con espacios", ` ${usado.invitacion.token} `],
    ]
    const respuestas: [string, LightMyRequestResponse][] = []
    for (const [nombre, token] of casos) respuestas.push([nombre, await pedirInvitacion(token)])

    const [, referencia] = respuestas[0] ?? []
    if (!referencia) throw new Error("sin respuestas")
    expect(referencia.statusCode).toBe(400)
    expect(codigoDe(referencia)).toBe("ENLACE_INVALIDO")
    for (const [nombre, respuesta] of respuestas) {
      expect(respuesta.statusCode, nombre).toBe(400)
      expect(respuesta.body, nombre).toBe(referencia.body)
      expect(sinFecha(respuesta), nombre).toEqual(sinFecha(referencia))
      expect(respuesta.body, nombre).not.toContain("Cuenta Dada De Baja")
    }
    // El token de recuperación que se probó sigue sirviendo para lo suyo.
    const restablecer = await post("/api/auth/restablecer", {
      token: recuperacion.token,
      contrasena: "recuperada-intacta-1",
    })
    expect(restablecer.statusCode).toBe(204)
  })

  it.each([
    ["sin token", {}],
    ["token null", { token: null }],
    ["token número", { token: 12345 }],
    ["token arreglo", { token: ["a", "b"] }],
    ["token objeto", { token: { $ne: "" } }],
    ["token vacío", { token: "" }],
    ["token de 257 caracteres", { token: "A".repeat(257) }],
  ])("%s: 4xx con el formato de la API, sin eco y sin 5xx", async (_nombre, cuerpo) => {
    const respuesta = await post("/api/auth/invitacion", cuerpo)
    expect(respuesta.statusCode).toBe(400)
    expect(errorApiSchema.safeParse(respuesta.json()).success).toBe(true)
    expect(respuesta.body).not.toContain("AAAAAAAAAA")
    expect(respuesta.body).not.toContain("$ne")
  })

  it("un cuerpo de más de 1 MB, texto plano o JSON roto: 4xx con el formato de la API", async () => {
    const enorme = await post("/api/auth/invitacion", { token: "a".repeat(1_100_000) })
    const textoPlano = await obtenerApp().inject({
      method: "POST",
      url: "/api/auth/invitacion",
      headers: { "content-type": "text/plain" },
      payload: "token=abc",
    })
    const roto = await post("/api/auth/invitacion", '{"token": ')
    for (const respuesta of [enorme, textoPlano, roto]) {
      expect(respuesta.statusCode).toBeGreaterThanOrEqual(400)
      expect(respuesta.statusCode).toBeLessThan(500)
      expect(errorApiSchema.safeParse(respuesta.json()).success, respuesta.body).toBe(true)
    }
    expect(enorme.statusCode).toBe(413)
  })

  it("GET con el token en la query no existe (el token no viaja en la URL)", async () => {
    const { invitacion } = await maestroInvitado()
    const respuesta = await obtenerApp().inject({
      method: "GET",
      url: `/api/auth/invitacion?token=${invitacion.token}`,
    })
    expect(respuesta.statusCode).toBe(404)
    expect(respuesta.body).not.toContain(invitacion.token)
  })

  it("es pública: un Authorization ajeno (admin, estudiante restringido, basura) no cambia la respuesta", async () => {
    const { invitacion } = await maestroInvitado("Nombre Sin Cambios")
    const restringido = await crearUsuarioDePrueba(ids, { accesoRestringido: true })
    const autorizaciones = [
      undefined,
      await firmarTokenDePrueba({ usuarioId: await adminId() }),
      await firmarTokenDePrueba({ usuarioId: restringido.id }),
      "basura.basura.basura",
    ]
    for (const autorizacion of autorizaciones) {
      const respuesta = await pedirInvitacion(invitacion.token, autorizacion)
      expect(respuesta.statusCode).toBe(200)
      expect(respuesta.json()).toEqual({ nombre: "Nombre Sin Cambios" })
    }
  })
})

// --- Nombre al establecer la contraseña ---------------------------------------------------------

const establecer = (cuerpo: unknown) => post("/api/auth/establecer-contrasena", cuerpo)

describe("ataque (AUTH-03a r1): nombre al establecer la contraseña", () => {
  it.each([
    ["con U+202E (inversor de dirección, \\p{Cf})", "Ana ‮zepóL"],
    ["con un espacio de ancho cero (\\p{Cf})", "Ana​ López"],
    ["con un nulo (\\p{Cc})", "Ana\u0000López"],
    ["de puro relleno Hangul", "ㅤㅤㅤ"],
    ["de relleno Hangul con una letra", "Aㅤ"],
    ["de 121 caracteres", `A${"b".repeat(120)}`],
    ["de un solo carácter visible", "A"],
    ["de solo espacios", "     "],
    ["vacío", ""],
    ["null", null],
    ["número", 42],
    ["arreglo", ["Ana", "López"]],
  ])(
    "un nombre %s: 400 VALIDACION, el enlace sigue vivo y el nombre no cambia",
    async (_caso, nombre) => {
      const { maestro, invitacion } = await maestroInvitado("Nombre Original")
      const respuesta = await establecer({
        token: invitacion.token,
        contrasena: "contrasena-maestro-1",
        nombre,
      })
      expect(respuesta.statusCode).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
      const [token] = await leerTokens(maestro.id)
      expect(token).toMatchObject({ usadoEn: null, revocadoEn: null })
      expect((await leerUsuario(maestro.id))?.nombre).toBe("Nombre Original")

      const sinNombre = await establecer({
        token: invitacion.token,
        contrasena: "contrasena-maestro-1",
      })
      expect(sinNombre.statusCode).toBe(204)
      expect((await leerUsuario(maestro.id))?.nombre).toBe("Nombre Original")
    },
  )

  it("un nombre con espacios sobrantes y acentos se guarda normalizado, con nombre_busqueda coherente", async () => {
    const { maestro, invitacion } = await maestroInvitado("Nombre Provisional")
    const respuesta = await establecer({
      token: invitacion.token,
      contrasena: "contrasena-maestro-2",
      nombre: "   José   ÁNGEL   Núñez  ",
    })
    expect(respuesta.statusCode, respuesta.body).toBe(204)
    expect(await leerUsuario(maestro.id)).toMatchObject({
      nombre: "José ÁNGEL Núñez",
      nombreBusqueda: "jose angel nunez",
    })
  })

  it("un nombre de exactamente 120 caracteres entra completo", async () => {
    const { maestro, invitacion } = await maestroInvitado()
    const nombre = `Ñ${"a".repeat(119)}`
    const respuesta = await establecer({
      token: invitacion.token,
      contrasena: "contrasena-maestro-3",
      nombre,
    })
    expect(respuesta.statusCode, respuesta.body).toBe(204)
    expect((await leerUsuario(maestro.id))?.nombre).toBe(nombre)
  })

  it("/auth/restablecer con un nombre: la contraseña cambia y el nombre no", async () => {
    const alumno = await crearUsuarioDePrueba(ids, { nombre: "Alumno Intacto" })
    const recuperacion = await crearTokenDePrueba({
      usuarioId: alumno.id,
      tipo: "recuperacion",
      expiraEn: new Date(Date.now() + 30 * 60_000),
    })
    const respuesta = await post("/api/auth/restablecer", {
      token: recuperacion.token,
      contrasena: "restablecida-con-nombre-1",
      nombre: "Nombre Inyectado",
    })
    expect(respuesta.statusCode).toBe(204)
    expect((await leerUsuario(alumno.id))?.nombre).toBe("Alumno Intacto")
    expect((await login(alumno.email, "restablecida-con-nombre-1")).statusCode).toBe(200)
  })

  it("establecer con un nombre y un token de recuperación: 400 ENLACE_INVALIDO, sin cambiar el nombre ni consumir el token", async () => {
    const alumno = await crearUsuarioDePrueba(ids, { nombre: "Alumno Sin Invitacion" })
    const recuperacion = await crearTokenDePrueba({
      usuarioId: alumno.id,
      tipo: "recuperacion",
      expiraEn: new Date(Date.now() + 30 * 60_000),
    })
    const respuesta = await establecer({
      token: recuperacion.token,
      contrasena: "contrasena-cruzada-1",
      nombre: "Nombre Cruzado",
    })
    expect(respuesta.statusCode).toBe(400)
    expect(codigoDe(respuesta)).toBe("ENLACE_INVALIDO")
    expect((await leerUsuario(alumno.id))?.nombre).toBe("Alumno Sin Invitacion")
    const [token] = await leerTokens(alumno.id)
    expect(token).toMatchObject({ usadoEn: null, revocadoEn: null })
  })

  it("establecer con un nombre en la invitación de una cuenta inactiva: 400 y el nombre no cambia", async () => {
    const { maestro, invitacion } = await maestroInvitado("Inactivo Original")
    await desactivarUsuarioDePrueba(maestro.id)
    const respuesta = await establecer({
      token: invitacion.token,
      contrasena: "contrasena-inactiva-1",
      nombre: "Nombre Nuevo",
    })
    expect(respuesta.statusCode).toBe(400)
    expect((await leerUsuario(maestro.id))?.nombre).toBe("Inactivo Original")
  })

  it("dos establecer simultáneos con nombres y contraseñas distintos: un 204 y un 400, y gana uno entero", async () => {
    const { maestro, invitacion } = await maestroInvitado("Nombre Antes De La Carrera")
    const cuerpos = [
      { token: invitacion.token, contrasena: "carrera-uno-12345", nombre: "Ganador Uno" },
      { token: invitacion.token, contrasena: "carrera-dos-12345", nombre: "Ganador Dos" },
    ]

    const respuestas = await conFilaRetenida(
      { tabla: "usuarios", id: maestro.id },
      cuerpos.map((cuerpo) => () => establecer(cuerpo)),
    )

    const estados = respuestas.map((r) => r.statusCode)
    expect([...estados].sort()).toEqual([204, 400])
    const indiceGanador = estados.indexOf(204)
    const ganador = cuerpos[indiceGanador]
    const perdedor = cuerpos[1 - indiceGanador]
    if (!ganador || !perdedor) throw new Error("Precondición: sin ganador")
    expect((await leerUsuario(maestro.id))?.nombre).toBe(ganador.nombre)
    expect((await login(maestro.email, ganador.contrasena)).statusCode).toBe(200)
    expect((await login(maestro.email, perdedor.contrasena)).statusCode).toBe(401)
  }, 45_000)
})
