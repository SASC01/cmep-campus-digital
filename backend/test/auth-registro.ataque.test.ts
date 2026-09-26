import { createHash, randomUUID } from "node:crypto"

import { errorApiSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePruebaPorCorreo,
  CONTRASENA_DE_PRUEBA,
  correoDePrueba,
  leerUsuarioPorCorreo,
  valorCookieRefresco,
} from "./ayudas-auth.js"

// Ataques del Tester (AUTH-01, ronda 1) contra POST /api/auth/registro: asignación masiva de
// banderas, contaminación de prototipo, doble envío, entradas extremas y fugas en las respuestas.

let app: FastifyInstance | undefined
const correos: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const nuevoCorreo = (): string => {
  const correo = correoDePrueba("ataque")
  correos.push(correo)
  return correo
}

const registrar = (payload: unknown, url = "/api/auth/registro"): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method: "POST",
    url,
    headers: { "content-type": "application/json" },
    payload: typeof payload === "string" ? payload : JSON.stringify(payload),
  })

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

const FUGAS = /hash|argon2|\$argon|estadoPago|estado_pago|al_corriente|sesion|reemplazada/i

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  await borrarUsuariosDePruebaPorCorreo(correos)
  await app?.close()
})

describe("ataque: asignación masiva en el registro", () => {
  it.each([
    ["rol admin", { rol: "admin" }],
    ["rol maestro", { rol: "maestro" }],
    ["estadoPago deudor y accesoRestringido", { estadoPago: "deudor", accesoRestringido: true }],
    [
      "snake_case",
      { estado_pago: "deudor", acceso_restringido: true, debe_cambiar_contrasena: true },
    ],
    ["activo false y debeCambiarContrasena", { activo: false, debeCambiarContrasena: true }],
    ["hashContrasena propio", { hashContrasena: "$argon2id$v=19$m=1,t=1,p=1$AAAA$AAAA" }],
  ])(
    "ignora %s: la cuenta nace estudiante, al corriente, activa y sin banderas",
    async (_, extra) => {
      const email = nuevoCorreo()
      const respuesta = await registrar({
        nombre: "Ataque Registro",
        email,
        contrasena: CONTRASENA_DE_PRUEBA,
        ...extra,
      })

      expect(respuesta.statusCode).toBe(201)
      const fila = await leerUsuarioPorCorreo(email)
      expect(fila).toMatchObject({
        rol: "estudiante",
        estadoPago: "al_corriente",
        activo: true,
        accesoRestringido: false,
        debeCambiarContrasena: false,
      })
    },
  )

  it("ignora un id propio en el cuerpo: no se puede elegir (ni pisar) el uuid de la cuenta", async () => {
    const email = nuevoCorreo()
    const idElegido = randomUUID()
    const respuesta = await registrar({
      nombre: "Ataque Id",
      email,
      contrasena: CONTRASENA_DE_PRUEBA,
      id: idElegido,
    })
    expect(respuesta.statusCode).toBe(201)
    expect((await leerUsuarioPorCorreo(email))?.id).not.toBe(idElegido)
  })

  it("rol en la query string tampoco cambia nada", async () => {
    const email = nuevoCorreo()
    const respuesta = await registrar(
      { nombre: "Ataque Query", email, contrasena: CONTRASENA_DE_PRUEBA },
      "/api/auth/registro?rol=admin&estadoPago=deudor",
    )
    expect(respuesta.statusCode).toBe(201)
    expect((await leerUsuarioPorCorreo(email))?.rol).toBe("estudiante")
  })

  it("__proto__ y constructor.prototype en el cuerpo se rechazan sin crear la cuenta", async () => {
    const email = nuevoCorreo()
    const conProto = await registrar(
      `{"nombre":"Ataque Proto","email":"${email}","contrasena":"${CONTRASENA_DE_PRUEBA}","__proto__":{"rol":"admin"}}`,
    )
    const conConstructor = await registrar(
      `{"nombre":"Ataque Proto","email":"${email}","contrasena":"${CONTRASENA_DE_PRUEBA}","constructor":{"prototype":{"rol":"admin"}}}`,
    )

    expect(conProto.statusCode).toBe(400)
    expect(conConstructor.statusCode).toBe(400)
    expect(await leerUsuarioPorCorreo(email)).toBeNull()
    expect(({} as Record<string, unknown>).rol).toBeUndefined()
  })
})

describe("ataque: doble envío y duplicados", () => {
  it("dos registros concurrentes con el mismo correo: exactamente un 201 y un 409 CORREO_EN_USO", async () => {
    const email = nuevoCorreo()
    const cuerpo = { nombre: "Doble Envío", email, contrasena: CONTRASENA_DE_PRUEBA }

    const respuestas = await Promise.all([registrar(cuerpo), registrar(cuerpo), registrar(cuerpo)])
    const estados = respuestas.map((respuesta) => respuesta.statusCode).sort()

    expect(estados).toEqual([201, 409, 409])
    const conflicto = respuestas.find((respuesta) => respuesta.statusCode === 409)
    if (!conflicto) throw new Error("sin 409")
    expect(codigoDe(conflicto)).toBe("CORREO_EN_USO")
    expect(await obtenerDb().usuario.count({ where: { email } })).toBe(1)
  })

  it("variantes de mayúsculas y espacios del mismo correo chocan con 409 sin fugas", async () => {
    const email = nuevoCorreo()
    await registrar({ nombre: "Original", email, contrasena: CONTRASENA_DE_PRUEBA })

    for (const variante of [email.toUpperCase(), ` ${email}\t`, `\n${email.toUpperCase()} `]) {
      const respuesta = await registrar({
        nombre: "Copia",
        email: variante,
        contrasena: CONTRASENA_DE_PRUEBA,
      })
      expect(respuesta.statusCode).toBe(409)
      expect(codigoDe(respuesta)).toBe("CORREO_EN_USO")
      expect(respuesta.body).not.toMatch(FUGAS)
      expect(respuesta.headers["set-cookie"]).toBeUndefined()
    }
  })

  it("no se puede registrar el correo del administrador real (ni en mayúsculas)", async () => {
    const admin = await obtenerDb().usuario.findFirst({
      where: { rol: "admin" },
      select: { email: true },
    })
    // Precondición (CHORE-01): global-setup crea el único admin con seed:admin. Si falta, la prueba
    // falla aquí en vez de pasar sin probar nada.
    expect(admin, "la base desechable debe tener el admin que crea seed:admin").not.toBeNull()
    if (!admin) throw new Error("Precondición: falta el admin de la base desechable")
    const respuesta = await registrar({
      nombre: "Suplantador",
      email: admin.email.toUpperCase(),
      contrasena: CONTRASENA_DE_PRUEBA,
    })
    expect(respuesta.statusCode).toBe(409)
    expect(codigoDe(respuesta)).toBe("CORREO_EN_USO")
  })
})

describe("ataque: entradas extremas en el registro", () => {
  it.each([
    ["cuerpo vacío", ""],
    ["JSON null", "null"],
    ["arreglo", "[]"],
    ["cadena", '"hola"'],
    ["número", "42"],
    ["campos con tipos incorrectos", JSON.stringify({ nombre: 12, email: true, contrasena: [] })],
    ["nombre null", JSON.stringify({ nombre: null, email: "a@b.mx", contrasena: "x".repeat(12) })],
    [
      "solo espacios en el nombre",
      JSON.stringify({ nombre: "     ", email: "a@b.mx", contrasena: "x".repeat(12) }),
    ],
  ])("%s → 400 sin 500", async (_, cuerpo) => {
    const respuesta = await registrar(cuerpo)
    expect(respuesta.statusCode).toBe(400)
    expect(["VALIDACION", "SOLICITUD_INVALIDA"]).toContain(codigoDe(respuesta))
  })

  it("contraseña de 129 → 400 sin eco del valor; de 128 → 201", async () => {
    const larga = `L${"a".repeat(127)}Z`
    const rechazo = await registrar({ nombre: "Largo", email: nuevoCorreo(), contrasena: larga })
    expect(rechazo.statusCode).toBe(400)
    expect(rechazo.body).not.toContain(larga)

    const limite = await registrar({
      nombre: "Largo",
      email: nuevoCorreo(),
      contrasena: "b".repeat(128),
    })
    expect(limite.statusCode).toBe(201)
  })

  it("los errores de validación nunca hacen eco de la contraseña ni del correo recibido", async () => {
    const contrasena = "secreta-ECO-1"
    const casos = [
      { nombre: "x", email: "eco-marca@pruebas.local", contrasena },
      { nombre: "Eco", email: "no-es-correo-ECO", contrasena },
      { nombre: "Eco", email: "eco-marca@pruebas.local", contrasena: 12345678901 },
      { nombre: "Eco", email: "eco-marca@pruebas.local", contrasena: "corta-ECO" },
    ]
    for (const caso of casos) {
      const respuesta = await registrar(caso)
      expect(respuesta.statusCode).toBe(400)
      expect(respuesta.body).not.toMatch(/ECO|eco-marca|12345678901/)
    }
  })

  it("nombre de 121 caracteres → 400; con HTML se guarda tal cual, sin interpretarse", async () => {
    const largo = await registrar({
      nombre: "n".repeat(121),
      email: nuevoCorreo(),
      contrasena: CONTRASENA_DE_PRUEBA,
    })
    expect(largo.statusCode).toBe(400)

    const email = nuevoCorreo()
    const html = `<img src=x onerror=alert(1)>'; DROP TABLE usuarios; --`
    const conHtml = await registrar({ nombre: html, email, contrasena: CONTRASENA_DE_PRUEBA })
    expect(conHtml.statusCode).toBe(201)
    expect((await leerUsuarioPorCorreo(email))?.nombre).toBe(html)
  })

  it("un nombre con un carácter nulo se rechaza con 400, no con un 500", async () => {
    const respuesta = await registrar({
      nombre: "Ana\u0000López",
      email: nuevoCorreo(),
      contrasena: CONTRASENA_DE_PRUEBA,
    })
    expect(respuesta.statusCode).toBe(400)
    expect(codigoDe(respuesta)).toBe("VALIDACION")
  })

  it("un nombre formado solo por caracteres invisibles o de control se rechaza", async () => {
    for (const nombre of ["​​​", "‮‮", "\u0007\u0008\u001B"]) {
      const email = nuevoCorreo()
      const respuesta = await registrar({ nombre, email, contrasena: CONTRASENA_DE_PRUEBA })
      expect(respuesta.statusCode, JSON.stringify(nombre)).toBe(400)
    }
  })

  it("correos con caracteres no ASCII u homógrafos se rechazan o se normalizan sin crear duplicados", async () => {
    const email = nuevoCorreo()
    await registrar({ nombre: "Base", email, contrasena: CONTRASENA_DE_PRUEBA })
    const [local, dominio] = email.split("@")
    // K de Kelvin (U+212A) y la i turca sin punto: toLowerCase podría colapsarlas en ASCII.
    for (const variante of [`${local}@${dominio}`.replace("a", "K"), `${local}ı@${dominio}`]) {
      const respuesta = await registrar({
        nombre: "Homógrafo",
        email: variante,
        contrasena: CONTRASENA_DE_PRUEBA,
      })
      expect([400, 409]).toContain(respuesta.statusCode)
    }
  })

  it("un cuerpo de más de 1 MB → 413 SOLICITUD_INVALIDA", async () => {
    const respuesta = await registrar({
      nombre: "Grande",
      email: nuevoCorreo(),
      contrasena: CONTRASENA_DE_PRUEBA,
      relleno: "x".repeat(1_100_000),
    })
    expect(respuesta.statusCode).toBe(413)
    expect(codigoDe(respuesta)).toBe("SOLICITUD_INVALIDA")
  })
})

describe("ataque: lo que se guarda y lo que se responde", () => {
  it("la contraseña solo existe como argon2id y el token de refresco solo como SHA-256", async () => {
    const email = nuevoCorreo()
    const respuesta = await registrar({ nombre: "Hashes", email, contrasena: CONTRASENA_DE_PRUEBA })
    expect(respuesta.statusCode).toBe(201)
    const cookie = valorCookieRefresco(respuesta)
    if (!cookie) throw new Error("sin cookie")

    const fila = await obtenerDb().usuario.findUnique({
      where: { email },
      select: { id: true, hashContrasena: true },
    })
    expect(fila?.hashContrasena.startsWith("$argon2id$")).toBe(true)
    expect(fila?.hashContrasena).not.toContain(CONTRASENA_DE_PRUEBA)

    const sesiones = await obtenerDb().sesion.findMany({
      where: { usuarioId: fila?.id ?? "" },
      select: { hashToken: true },
    })
    expect(sesiones).toHaveLength(1)
    expect(sesiones[0]?.hashToken).not.toBe(cookie)
    expect(sesiones[0]?.hashToken).toBe(createHash("sha256").update(cookie).digest("hex"))
  })

  it("el cuerpo del 201 es exactamente { tokenAcceso } y el JWT solo lleva sub, iat, exp, iss y aud", async () => {
    const respuesta = await registrar({
      nombre: "Contrato",
      email: nuevoCorreo(),
      contrasena: CONTRASENA_DE_PRUEBA,
    })
    const cuerpo = respuesta.json<Record<string, unknown>>()
    expect(Object.keys(cuerpo)).toEqual(["tokenAcceso"])
    const [, carga] = String(cuerpo.tokenAcceso).split(".")
    const claims = JSON.parse(Buffer.from(carga ?? "", "base64url").toString("utf8")) as Record<
      string,
      unknown
    >
    expect(Object.keys(claims).sort()).toEqual(["aud", "exp", "iat", "iss", "sub"])
    expect(Number(claims.exp) - Number(claims.iat)).toBe(900)
  })
})
