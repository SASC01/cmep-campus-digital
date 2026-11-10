import { randomBytes, randomUUID } from "node:crypto"

import { errorApiSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { normalizarParaBusqueda } from "../src/core/auth/normalizacion.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import { idDelAdminDePrueba } from "./ayudas-clases.js"

// Ataque del Tester (ADMIN-01e, ronda 2): el remedio de T-01 (el carácter nulo en q se rechaza en
// el esquema) y sus vecinos, puntos 1 a 3 de la verificación del manager. Todos los caracteres de
// control se construyen con String.fromCharCode: ninguno se escribe literal en el archivo.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
let tokenAdmin = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const NULO = String.fromCharCode(0)
const marca = (): string => `zu${randomBytes(5).toString("hex")}`
const MENSAJE_NULO = "q: Los datos enviados tienen caracteres no permitidos."
const MENSAJE_LARGO = "q: La búsqueda no puede tener más de 120 caracteres"

const pedir = (
  method: "GET" | "HEAD" | "POST" | "PUT",
  url: string,
  payload?: unknown,
): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method,
    url,
    ...(payload === undefined ? {} : { payload: payload as Record<string, unknown> }),
    headers: { authorization: `Bearer ${tokenAdmin}` },
  })

const errorDe = (r: LightMyRequestResponse): { codigo: string; mensaje: string } => {
  if (r.body === "") return { codigo: "", mensaje: "" }
  const analizado = errorApiSchema.safeParse(JSON.parse(r.body))
  return analizado.success ? analizado.data.error : { codigo: "", mensaje: "" }
}

const crearCuenta = async (nombre: string, rol: "estudiante" | "maestro" = "estudiante") => {
  const email = `t2e-${randomUUID()}@pruebas.local`
  const { id } = await obtenerDb().usuario.create({
    data: {
      email,
      hashContrasena: "sin-uso-en-esta-prueba",
      nombre,
      nombreBusqueda: normalizarParaBusqueda(nombre),
      rol,
    },
    select: { id: true },
  })
  idsUsuarios.push(id)
  return { id, email, nombre }
}

const leerFila = (id: string) =>
  obtenerDb().usuario.findUnique({
    where: { id },
    select: {
      nombre: true,
      email: true,
      activo: true,
      estadoPago: true,
      fechaEstadoPago: true,
      accesoRestringido: true,
      motivoRestriccion: true,
      fechaRestriccion: true,
      actualizadoEn: true,
    },
  })

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
  tokenAdmin = await firmarTokenDePrueba({ usuarioId: await idDelAdminDePrueba() })
}, 60_000)

afterAll(async () => {
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("ataque ADMIN-01e r2: el nulo en q y sus vecinos (punto 1)", () => {
  it("ADM-T2E01: el nulo en cada posición y codificación, con espacios, con los topes de 120 y 1000, repetido y en HEAD: 400 con un solo mensaje, nunca 500", async () => {
    const t = marca()
    const de120 = `${t}${"a".repeat(120 - t.length)}`
    const casos: { url: string; esperado: number; mensaje?: string }[] = [
      { url: `/api/admin/usuarios?q=${t}%00`, esperado: 400, mensaje: MENSAJE_NULO },
      { url: `/api/admin/usuarios?q=%00${t}`, esperado: 400, mensaje: MENSAJE_NULO },
      { url: `/api/admin/usuarios?q=${t}+%00`, esperado: 400, mensaje: MENSAJE_NULO },
      { url: `/api/admin/usuarios?q=%00+${t}+%00`, esperado: 400, mensaje: MENSAJE_NULO },
      { url: `/api/admin/usuarios?q=${t}%20%00%20`, esperado: 400, mensaje: MENSAJE_NULO },
      { url: `/api/admin/usuarios?q=%00%00%00`, esperado: 400, mensaje: MENSAJE_NULO },
      { url: `/api/admin/usuarios?q=%00`, esperado: 400, mensaje: MENSAJE_NULO },
      // 120 normalizados más un nulo: la normalización conserva el nulo, así que son 121 y sale
      // solo el mensaje de longitud (el esquema corta ahí).
      {
        url: `/api/admin/usuarios?q=${de120}%00`,
        esperado: 400,
        mensaje: MENSAJE_LARGO,
      },
      // 119 normalizados más un nulo: 120, dentro del tope; sale el del nulo.
      {
        url: `/api/admin/usuarios?q=${de120.slice(0, 119)}%00`,
        esperado: 400,
        mensaje: MENSAJE_NULO,
      },
      { url: `/api/admin/usuarios?q=${de120}a%00`, esperado: 400, mensaje: MENSAJE_LARGO },
      // 1000 puntos de código crudos con un nulo dentro (normalizan a menos de 120): el del nulo.
      {
        url: `/api/admin/usuarios?q=${t}%00${"+".repeat(1000 - t.length - 1)}`,
        esperado: 400,
        mensaje: MENSAJE_NULO,
      },
      // 1001 crudos con un nulo: solo el de longitud.
      {
        url: `/api/admin/usuarios?q=${t}%00${"+".repeat(1001 - t.length - 1)}`,
        esperado: 400,
        mensaje: MENSAJE_LARGO,
      },
      { url: `/api/admin/usuarios?q=${t}&q=${t}%00`, esperado: 400 },
      { url: `/api/admin/usuarios?q=${t}%00&q=${t}`, esperado: 400 },
      {
        url: `/api/admin/usuarios?q=${t}%00&rol=estudiante&estadoPago=deudor&limite=1`,
        esperado: 400,
        mensaje: MENSAJE_NULO,
      },
    ]
    const fallas: string[] = []
    for (const { url, esperado, mensaje } of casos) {
      const r = await pedir("GET", url)
      const error = errorDe(r)
      if (r.statusCode !== esperado) fallas.push(`${url.slice(0, 90)} → ${r.statusCode}`)
      if (mensaje !== undefined && error.mensaje !== mensaje) {
        fallas.push(`${url.slice(0, 90)} → ${error.mensaje}`)
      }
      if (error.mensaje.length === 0) fallas.push(`${url.slice(0, 90)} → sin mensaje`)
      if (error.mensaje.includes(NULO) || error.mensaje.includes(t)) {
        fallas.push(`${url.slice(0, 90)} → el mensaje repite el término`)
      }
      const head = await pedir("HEAD", url)
      if (head.statusCode !== esperado) fallas.push(`HEAD ${url.slice(0, 90)} → ${head.statusCode}`)
    }
    expect(fallas).toEqual([])
  })

  it("ADM-T2E02: la página 2 con cursor y cursorNombre válidos y el nulo en q: 400 sin leer la base; sin el nulo, la misma página responde 200", async () => {
    const t = marca()
    await crearCuenta(`Aa ${t}`)
    await crearCuenta(`Bb ${t}`)
    const primera = await pedir("GET", `/api/admin/usuarios?q=${t}&limite=1`)
    const { siguienteCursor, siguienteCursorNombre } = primera.json<{
      siguienteCursor: string
      siguienteCursorNombre: string
    }>()
    const consulta = (q: string) =>
      `/api/admin/usuarios?${new URLSearchParams({
        q,
        limite: "1",
        cursor: siguienteCursor,
        cursorNombre: siguienteCursorNombre,
      }).toString()}`
    const conNulo = await pedir("GET", consulta(`${t}${NULO}`))
    expect(conNulo.statusCode).toBe(400)
    expect(errorDe(conNulo).mensaje).toBe(MENSAJE_NULO)
    expect((await pedir("GET", consulta(t))).statusCode).toBe(200)
  })
})

describe("ataque ADMIN-01e r2: lo que el esquema deja pasar hacia la base (punto 2)", () => {
  it("ADM-T2E03: cada control C0 y C1 distinto del nulo, los inversores y los separadores dentro de q: 200 con su búsqueda literal o 400 legible, nunca 500", async () => {
    const t = marca()
    const codigos: number[] = []
    for (let c = 1; c <= 0x1f; c += 1) codigos.push(c)
    for (let c = 0x7f; c <= 0x9f; c += 1) codigos.push(c)
    for (const c of [0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069]) {
      codigos.push(c)
    }
    codigos.push(0x2028, 0x2029, 0x200b, 0x200d, 0xfeff, 0xfffd, 0xfffe, 0xffff)
    const cuenta = await crearCuenta(`Control ${t}`)
    const fallas: string[] = []
    for (const codigo of codigos) {
      const caracter = String.fromCharCode(codigo)
      for (const q of [`${t}${caracter}`, `${caracter}${t}`, `${t}${caracter}${caracter}x`]) {
        const r = await pedir("GET", `/api/admin/usuarios?${new URLSearchParams({ q }).toString()}`)
        if (r.statusCode === 200) continue
        const { mensaje } = errorDe(r)
        if (r.statusCode !== 400 || mensaje.length === 0) {
          fallas.push(`U+${codigo.toString(16)} → ${r.statusCode} ${mensaje}`)
        }
      }
    }
    expect(fallas).toEqual([])
    // Un control al final se recorta o no, pero la cuenta se sigue encontrando por su marca.
    const solo = await pedir("GET", `/api/admin/usuarios?q=${t}`)
    expect(solo.json<{ usuarios: { id: string }[] }>().usuarios.map((u) => u.id)).toEqual([
      cuenta.id,
    ])
  }, 60_000)

  it("ADM-T2E04: bytes que no son UTF-8 y sustitutos sueltos codificados en q y en cursorNombre: 200 o 400 legible, nunca 500", async () => {
    const t = marca()
    await crearCuenta(`Aa ${t}`)
    await crearCuenta(`Bb ${t}`)
    const primera = await pedir("GET", `/api/admin/usuarios?q=${t}&limite=1`)
    const { siguienteCursor } = primera.json<{ siguienteCursor: string }>()
    const raros = ["%ED%A0%80", "%C0%80", "%FF", "%E0%80%80", "%F4%90%80%80", "%C3", "%ED%BF%BF"]
    const fallas: string[] = []
    for (const raro of raros) {
      for (const url of [
        `/api/admin/usuarios?q=${t}${raro}`,
        `/api/admin/usuarios?q=${raro}${t}`,
        `/api/admin/usuarios?q=${t}&limite=1&cursor=${siguienteCursor}&cursorNombre=${raro}`,
        `/api/admin/usuarios?q=${t}&limite=1&cursor=${siguienteCursor}&cursorNombre=Aa+${t}${raro}`,
      ]) {
        const r = await pedir("GET", url)
        const { mensaje } = errorDe(r)
        if (r.statusCode !== 200 && !(r.statusCode === 400 && mensaje.length > 0)) {
          fallas.push(`${url.replace(t, "<t>")} → ${r.statusCode} ${mensaje}`)
        }
      }
    }
    expect(fallas).toEqual([])
  })
})

describe("ataque ADMIN-01e r2: el nulo en las demás entradas de 01e, en tormenta (punto 3)", () => {
  it("ADM-T2E05: el nulo en nombre (editar y alta), email, motivo, cursorNombre, ids de ruta, enums, alumnoIds y limite, todo a la vez: 400 legible, ningún 500 y nada escrito", async () => {
    const t = marca()
    const alumno = await crearCuenta(`Tormenta ${t}`)
    const antes = await leerFila(alumno.id)
    const primera = await pedir("GET", `/api/admin/usuarios?q=Tormenta+${t}&limite=1`)
    expect(primera.statusCode).toBe(200)
    const correoAlta = `alta-${t}@pruebas.local`
    const conNulo = (texto: string) => `${texto}${NULO}`
    const peticiones: { etiqueta: string; r: Promise<LightMyRequestResponse> }[] = [
      {
        etiqueta: "editar nombre",
        r: pedir("PUT", `/api/admin/usuarios/${alumno.id}/nombre`, {
          nombre: conNulo(`Otro ${t}`),
        }),
      },
      {
        etiqueta: "alta nombre",
        r: pedir("POST", "/api/admin/alumnos", { nombre: conNulo(`Alta ${t}`), email: correoAlta }),
      },
      {
        etiqueta: "alta email",
        r: pedir("POST", "/api/admin/alumnos", {
          nombre: `Alta ${t}`,
          email: `alta-${t}${NULO}@pruebas.local`,
        }),
      },
      {
        etiqueta: "motivo",
        r: pedir("PUT", `/api/admin/alumnos/${alumno.id}/acceso`, {
          restringido: true,
          motivo: conNulo(`Motivo ${t}`),
        }),
      },
      {
        etiqueta: "cursorNombre",
        r: pedir(
          "GET",
          `/api/admin/usuarios?${new URLSearchParams({
            q: `Tormenta ${t}`,
            limite: "1",
            cursor: alumno.id,
            cursorNombre: conNulo(`Tormenta ${t}`),
          }).toString()}`,
        ),
      },
      { etiqueta: "ficha id", r: pedir("GET", `/api/admin/usuarios/${alumno.id}%00`) },
      {
        etiqueta: "activo id",
        r: pedir("PUT", `/api/admin/usuarios/${alumno.id}%00/activo`, { activo: false }),
      },
      {
        etiqueta: "acceso id",
        r: pedir("PUT", `/api/admin/alumnos/%00${alumno.id}/acceso`, { restringido: true }),
      },
      { etiqueta: "rol", r: pedir("GET", "/api/admin/usuarios?rol=estudiante%00") },
      {
        etiqueta: "estadoPago",
        r: pedir("GET", "/api/admin/usuarios?rol=estudiante&estadoPago=deudor%00"),
      },
      { etiqueta: "limite", r: pedir("GET", "/api/admin/usuarios?limite=5%00") },
      {
        etiqueta: "cursor",
        r: pedir("GET", `/api/admin/usuarios?cursor=${alumno.id}%00&cursorNombre=x`),
      },
      {
        etiqueta: "movimientos cursor",
        r: pedir("GET", `/api/admin/movimientos-inscripcion?cursor=${alumno.id}%00`),
      },
      {
        etiqueta: "lote ids",
        r: pedir("PUT", "/api/admin/alumnos/estado-pago", {
          alumnoIds: [conNulo(alumno.id)],
          estadoPago: "deudor",
        }),
      },
      {
        etiqueta: "lote estado",
        r: pedir("PUT", "/api/admin/alumnos/estado-pago", {
          alumnoIds: [alumno.id],
          estadoPago: conNulo("deudor"),
        }),
      },
      {
        etiqueta: "activo texto",
        r: pedir("PUT", `/api/admin/usuarios/${alumno.id}/activo`, { activo: conNulo("false") }),
      },
    ]
    const respuestas = await Promise.all(peticiones.map((p) => p.r))
    const fallas: string[] = []
    respuestas.forEach((r, i) => {
      const etiqueta = peticiones[i]?.etiqueta ?? "?"
      const { mensaje } = errorDe(r)
      if (r.statusCode !== 400 || mensaje.length === 0) {
        fallas.push(`${etiqueta} → ${r.statusCode} ${mensaje}`)
      }
      if (r.body.includes(t) || r.body.includes("\\u0000")) {
        fallas.push(`${etiqueta} → el 400 repite lo enviado`)
      }
    })
    expect(fallas).toEqual([])
    const cursorNombre = respuestas[4]
    expect(cursorNombre === undefined ? "" : errorDe(cursorNombre).mensaje).toBe(
      "cursor: no es válido",
    )
    expect(await leerFila(alumno.id)).toEqual(antes)
    expect(await obtenerDb().usuario.count({ where: { email: { contains: t } } })).toBe(0)
  })

  it("ADM-T2E06: sustitutos sueltos en los cuerpos JSON (nombre, motivo, email): 200 o 400 legible, nunca 500; lo guardado no lleva un sustituto suelto", async () => {
    const t = marca()
    const alumno = await crearCuenta(`Sustituto ${t}`)
    const alto = String.fromCharCode(0xd800)
    const bajo = String.fromCharCode(0xdfff)
    const peticiones = [
      pedir("PUT", `/api/admin/usuarios/${alumno.id}/nombre`, { nombre: `Nombre ${t} ${alto}` }),
      pedir("PUT", `/api/admin/alumnos/${alumno.id}/acceso`, {
        restringido: true,
        motivo: `Motivo ${bajo} ${t}`,
      }),
      pedir("POST", "/api/admin/alumnos", {
        nombre: `Alta ${t}`,
        email: `sus-${t}${alto}@pruebas.local`,
      }),
    ]
    const fallas: string[] = []
    for (const r of await Promise.all(peticiones)) {
      const { mensaje } = errorDe(r)
      if (r.statusCode !== 200 && !(r.statusCode === 400 && mensaje.length > 0)) {
        fallas.push(`${r.statusCode} ${mensaje}`)
      }
    }
    const creadas = await obtenerDb().usuario.findMany({
      where: { email: { contains: t } },
      select: { id: true },
    })
    for (const fila of creadas) idsUsuarios.push(fila.id)
    expect(fallas).toEqual([])
    const fila = await leerFila(alumno.id)
    const sueltos = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/
    expect(sueltos.test(fila?.nombre ?? "")).toBe(false)
    expect(sueltos.test(fila?.motivoRestriccion ?? "")).toBe(false)
  })
})
