import { randomBytes, randomUUID } from "node:crypto"

import { errorApiSchema, listaClasesAnterioresRespuestaSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { enTransaccion, obtenerDb } from "../src/adapters/db/cliente.js"
import { listarClasesAnteriores } from "../src/adapters/db/index.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { normalizarParaBusqueda } from "../src/core/auth/normalizacion.js"
import {
  borrarUsuariosDePrueba,
  contarSesionesVivas,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  iniciarSesionDePrueba,
  NOMBRE_COOKIE,
} from "./ayudas-auth.js"
import { clavesDe } from "./ayudas-clases-archivadas.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearClaseDePrueba,
  idDelAdminDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"
import { crearTokenDePrueba, leerTokens } from "./ayudas-cuentas.js"

// Ataque del Tester (ADMIN-01e, ronda 1): la lista de usuarios con entradas raras (q, filtros,
// cursor), el motivo de la restricción sin tope crudo (decisión del humano, 2026-11-09), el alta de
// alumno, el lote de estado de pago, todo a la vez sobre un mismo alumno (protocolo de bloqueo),
// la marca «Cuenta desactivada» por cada respuesta con maestros, la baja frente a N-14, los
// movimientos y las cuentas raras. Puntos de ataque 1 a 10 de la verificación del manager.
// Los caracteres invisibles y de control se escriben como escapes, nunca literales.
// N-18: ninguna clase confirmada queda con 0 o con 3 maestros; la de 0 maestros (O-R1-1) vive
// solo dentro de una transacción que se deshace.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
let idAdmin = ""
let tokenAdmin = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const marca = (): string => `zt${randomBytes(5).toString("hex")}`

type Metodo = "GET" | "HEAD" | "POST" | "PUT" | "DELETE"

const pedir = (
  method: Metodo,
  url: string,
  token: string | undefined = tokenAdmin,
  payload?: unknown,
): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method,
    url,
    ...(payload === undefined ? {} : { payload: payload as Record<string, unknown> }),
    headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
  })

const errorDe = (r: LightMyRequestResponse): { codigo: string; mensaje: string } => {
  const analizado = errorApiSchema.safeParse(JSON.parse(r.body === "" ? "{}" : r.body))
  if (!analizado.success) return { codigo: "", mensaje: "" }
  return analizado.data.error
}

const EN_INGLES = /Invalid|expected|received|Required|Unrecognized|Too (big|small)/

interface Cuenta {
  id: string
  email: string
  nombre: string
}

const crearCuenta = async ({
  nombre,
  rol = "estudiante",
  activo = true,
  estadoPago = "al_corriente",
  accesoRestringido = false,
  email,
}: {
  nombre: string
  rol?: "estudiante" | "maestro"
  activo?: boolean
  estadoPago?: "al_corriente" | "deudor"
  accesoRestringido?: boolean
  email?: string
}): Promise<Cuenta> => {
  const correo = email ?? `t1e-${randomUUID()}@pruebas.local`
  const { id } = await obtenerDb().usuario.create({
    data: {
      email: correo,
      hashContrasena: "sin-uso-en-esta-prueba",
      nombre,
      nombreBusqueda: normalizarParaBusqueda(nombre),
      rol,
      activo,
      estadoPago,
      accesoRestringido,
    },
    select: { id: true },
  })
  idsUsuarios.push(id)
  return { id, email: correo, nombre }
}

const urlUsuarios = (consulta: Record<string, string>): string =>
  `/api/admin/usuarios?${new URLSearchParams(consulta).toString()}`

interface Fila {
  id: string
  nombre: string
  [clave: string]: unknown
}

const idsDe = (r: LightMyRequestResponse): string[] =>
  r.json<{ usuarios: Fila[] }>().usuarios.map((fila) => fila.id)

const leerUsuarioDb = (id: string) =>
  obtenerDb().usuario.findUnique({
    where: { id },
    select: {
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
  idAdmin = await idDelAdminDePrueba()
  tokenAdmin = await firmarTokenDePrueba({ usuarioId: idAdmin })
}, 60_000)

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("ataque ADMIN-01e r1: la lista de usuarios con entradas raras (punto 4)", () => {
  it("ADM-T1E01: q con el carácter nulo (en el nombre o en el correo) responde 400 legible, nunca 500, como el buscador de candidatos", async () => {
    const t = marca()
    await crearCuenta({ nombre: `Nulo ${t}` })
    const urls = [
      ...[`${t}\u0000`, `\u0000${t}`, `${t}\u0000x`].map((q) => urlUsuarios({ q })),
      ...[`${t}\u0000`].map((q) => urlUsuarios({ q, rol: "estudiante", estadoPago: "deudor" })),
      // Bytes que no son UTF-8 válido, escritos a mano en la URL.
      `/api/admin/usuarios?q=${t}%FF%FE`,
      `/api/admin/usuarios?q=%ED%A0%80${t}`,
    ]
    const resultados: string[] = []
    for (const url of urls) {
      const r = await pedir("GET", url)
      const { mensaje } = errorDe(r)
      const legible = mensaje.length > 0 && !EN_INGLES.test(mensaje)
      if (r.statusCode !== 200 && !(r.statusCode === 400 && legible)) {
        resultados.push(`${url.replace(t, "<t>")} → ${r.statusCode} ${mensaje}`)
      }
    }
    expect(resultados).toEqual([])
  })

  it("ADM-T1E02: comodines, barra invertida al final, '+', mayúsculas Unicode, inyección, bordes de 120 y 1000: 200 con lo literal o 400 legible, nunca 500", async () => {
    const t = marca()
    const porciento = await crearCuenta({ nombre: `Ana 50% ${t}` })
    const guion = await crearCuenta({ nombre: `Beto a_b ${t}` })
    const otra = await crearCuenta({ nombre: `Carla ab ${t}` })
    const barra = await crearCuenta({ nombre: `Dario c\\d ${t}` })
    const mas = await crearCuenta({ nombre: `Elena ${t}`, email: `t1e+${t}@pruebas.local` })
    const turca = await crearCuenta({ nombre: `İSMAİL ${t}` })
    const alemana = await crearCuenta({ nombre: `Straße ${t}` })
    const digrafo = await crearCuenta({ nombre: `ǅemal ${t}` })

    const buscar = async (q: string): Promise<string[]> => {
      const r = await pedir("GET", urlUsuarios({ q, limite: "100" }))
      expect(r.statusCode, `q ${JSON.stringify(q)}: ${r.body}`).toBe(200)
      return idsDe(r)
    }
    expect(await buscar(`50% ${t}`)).toEqual([porciento.id])
    expect(await buscar(`a_b ${t}`)).toEqual([guion.id])
    expect(await buscar(`c\\d ${t}`)).toEqual([barra.id])
    expect(await buscar(`t1e+${t}`)).toEqual([mas.id])
    expect(await buscar(`İsmail ${t}`)).toEqual([turca.id])
    expect(await buscar(`straße ${t}`)).toEqual([alemana.id])
    expect(await buscar(`ǅemal ${t}`)).toEqual([digrafo.id])
    expect(await buscar(`ǆEMAL ${t}`)).toEqual([digrafo.id])
    expect(await buscar(`' OR 1=1 -- ${t}`)).toEqual([])
    expect(await buscar(`${t}'); DROP TABLE usuarios; --`)).toEqual([])
    expect(await buscar(`%${t}`)).toEqual([])
    expect(await buscar(`_${t}`)).toEqual([])
    expect(otra.id).toBeTruthy()

    // Barra invertida al final y sola: el escape de LIKE nunca queda colgando.
    for (const q of [`${t}\\`, `${t}\\\\`, `\\\\\\`, `${t}%`, `${t}_`]) {
      const r = await pedir("GET", urlUsuarios({ q }))
      expect([200, 400], `q ${JSON.stringify(q)}: ${r.body}`).toContain(r.statusCode)
    }

    // 120 normalizados: 200; 121: 400. 1000 crudos que normalizan a 120: 200; 1001: 400.
    const de120 = `${t}${"a".repeat(120 - t.length)}`
    expect((await pedir("GET", urlUsuarios({ q: de120 }))).statusCode).toBe(200)
    const r121 = await pedir("GET", urlUsuarios({ q: `${de120}a` }))
    expect(r121.statusCode).toBe(400)
    expect(errorDe(r121).mensaje).toContain("120")
    const crudo1000 = `${de120}${" ".repeat(880)}`
    expect(Array.from(crudo1000)).toHaveLength(1000)
    expect((await pedir("GET", urlUsuarios({ q: crudo1000 }))).statusCode).toBe(200)
    expect((await pedir("GET", urlUsuarios({ q: `${crudo1000} ` }))).statusCode).toBe(400)

    // Vacío, solo espacios, repetido: 400 legible.
    for (const url of [
      urlUsuarios({ q: "" }),
      urlUsuarios({ q: "     " }),
      `/api/admin/usuarios?q=${t}&q=${t}`,
      `/api/admin/usuarios?rol=estudiante&rol=maestro`,
      `/api/admin/usuarios?rol=estudiante&estadoPago=deudor&estadoPago=al_corriente`,
      urlUsuarios({ rol: "Admin" }),
      urlUsuarios({ rol: "superadmin" }),
      urlUsuarios({ estadoPago: "deudor" }),
      urlUsuarios({ rol: "maestro", estadoPago: "deudor" }),
      urlUsuarios({ estadoPago: "moroso", rol: "estudiante" }),
      urlUsuarios({ limite: "0" }),
      urlUsuarios({ limite: "101" }),
      urlUsuarios({ limite: "-1" }),
      urlUsuarios({ limite: "1.5" }),
    ]) {
      const r = await pedir("GET", url)
      expect(r.statusCode, `${url}: ${r.body}`).toBe(400)
      expect(errorDe(r).mensaje.length, url).toBeGreaterThan(0)
    }
  })

  it("ADM-T1E03: cursorNombre con el carácter nulo, con 10 000 caracteres o sin cursor; cursor inventado, de otra tabla o en mayúsculas: 400 o la misma página, nunca 500", async () => {
    const t = marca()
    const a = await crearCuenta({ nombre: `Aa ${t}` })
    const b = await crearCuenta({ nombre: `Bb ${t}` })
    const c = await crearCuenta({ nombre: `Cc ${t}` })
    const primera = await pedir("GET", urlUsuarios({ q: t, limite: "1" }))
    expect(primera.statusCode).toBe(200)
    const pagina = primera.json<{ siguienteCursor: string; siguienteCursorNombre: string }>()
    expect(idsDe(primera)).toEqual([a.id])
    expect(pagina.siguienteCursorNombre).toBe(a.nombre)

    for (const consulta of [
      { q: t, limite: "1", cursor: pagina.siguienteCursor, cursorNombre: `${a.nombre}\u0000` },
      { q: t, limite: "1", cursor: pagina.siguienteCursor, cursorNombre: "x".repeat(10_000) },
      { q: t, limite: "1", cursorNombre: a.nombre },
      { q: t, limite: "1", cursor: pagina.siguienteCursor },
      { q: t, limite: "1", cursor: randomUUID(), cursorNombre: a.nombre },
      { q: t, limite: "1", cursor: idAdmin, cursorNombre: a.nombre },
      { q: t, limite: "1", cursor: "no-es-uuid", cursorNombre: a.nombre },
      { q: t, limite: "1", cursor: pagina.siguienteCursor, cursorNombre: "" },
    ]) {
      const r = await pedir("GET", urlUsuarios(consulta))
      expect(r.statusCode, `${JSON.stringify(consulta).slice(0, 200)}: ${r.body}`).toBe(400)
    }
    const mayusculas = await pedir(
      "GET",
      urlUsuarios({
        q: t,
        limite: "1",
        cursor: pagina.siguienteCursor.toUpperCase(),
        cursorNombre: a.nombre,
      }),
    )
    expect(mayusculas.statusCode).toBe(200)
    expect(idsDe(mayusculas)).toEqual([b.id])
    expect(c.id).toBeTruthy()
  })

  it("ADM-T1E04: la cuenta del cursor cambia de estado de pago entre dos páginas filtradas por deudor: 400; dada de baja sigue en la lista y su cursor sirve", async () => {
    const t = marca()
    const a = await crearCuenta({ nombre: `Aa ${t}`, estadoPago: "deudor" })
    const b = await crearCuenta({ nombre: `Bb ${t}`, estadoPago: "deudor" })
    const consulta = { q: t, rol: "estudiante", estadoPago: "deudor", limite: "1" }
    const primera = await pedir("GET", urlUsuarios(consulta))
    expect(idsDe(primera)).toEqual([a.id])
    const { siguienteCursor, siguienteCursorNombre } = primera.json<{
      siguienteCursor: string
      siguienteCursorNombre: string
    }>()
    const siguiente = { ...consulta, cursor: siguienteCursor, cursorNombre: siguienteCursorNombre }

    const baja = await pedir("PUT", `/api/admin/usuarios/${a.id}/activo`, tokenAdmin, {
      activo: false,
    })
    expect(baja.statusCode).toBe(200)
    const trasLaBaja = await pedir("GET", urlUsuarios(siguiente))
    expect(trasLaBaja.statusCode).toBe(200)
    expect(idsDe(trasLaBaja)).toEqual([b.id])

    const lote = await pedir("PUT", "/api/admin/alumnos/estado-pago", tokenAdmin, {
      alumnoIds: [a.id],
      estadoPago: "al_corriente",
    })
    expect(lote.json()).toEqual({ actualizados: 1 })
    const trasElPago = await pedir("GET", urlUsuarios(siguiente))
    expect(trasElPago.statusCode).toBe(400)
    expect(errorDe(trasElPago).mensaje).toBe("cursor: no es válido")
  })
})

describe("ataque ADMIN-01e r1: el motivo de la restricción sin tope crudo (punto 5)", () => {
  const acceso = (id: string, cuerpo: unknown) =>
    pedir("PUT", `/api/admin/alumnos/${id}/acceso`, tokenAdmin, cuerpo)

  it("ADM-T1E05: 300 visibles con relleno de espacios, saltos, tabuladores, ZWJ, selectores de variación y vacíos se guardan tal cual (normalizados); 301 dan 400; un motivo enorme dentro del cuerpo responde a tiempo", async () => {
    const t = marca()
    const alumno = await crearCuenta({ nombre: `Motivo ${t}` })
    const relleno = " \t\n\u200d\ufe0f\u2800\u3164\u200b"
    const de300 = Array.from({ length: 300 }, () => `a${relleno}`).join("")
    const r300 = await acceso(alumno.id, { restringido: true, motivo: de300 })
    expect(r300.statusCode, r300.body).toBe(200)
    expect((await leerUsuarioDb(alumno.id))?.motivoRestriccion).toBe(de300.trim())

    const r301 = await acceso(alumno.id, { restringido: true, motivo: `${de300}b` })
    expect(r301.statusCode).toBe(400)
    expect(errorDe(r301).mensaje).toBe("motivo: El motivo no puede tener más de 300 caracteres")

    // Emojis compuestos: una familia con ZWJ, una bandera y un tono de piel.
    const familia = "\u{1F468}\u200d\u{1F469}\u200d\u{1F467}"
    const bandera = "\u{1F1F2}\u{1F1FD}"
    const tono = "\u{1F44D}\u{1F3FD}"
    const emojis = `${familia}${bandera}${tono}`
    const conEmojis = await acceso(alumno.id, { restringido: true, motivo: `Por ${emojis} ${t}` })
    expect(conEmojis.statusCode, conEmojis.body).toBe(200)
    expect((await leerUsuarioDb(alumno.id))?.motivoRestriccion).toBe(`Por ${emojis} ${t}`)

    // Un motivo de ~900 000 unidades (cabe en el cuerpo de 1 MiB) con 300 visibles.
    const enorme = `${"x".repeat(150)}${" ".repeat(900_000)}${"y".repeat(150)}`
    const inicio = performance.now()
    const rEnorme = await acceso(alumno.id, { restringido: true, motivo: enorme })
    const duracion = performance.now() - inicio
    expect(rEnorme.statusCode, rEnorme.body.slice(0, 200)).toBe(200)
    expect(duracion, "tiempo de respuesta del motivo enorme (ms)").toBeLessThan(5_000)
    expect((await leerUsuarioDb(alumno.id))?.motivoRestriccion?.length).toBe(enorme.length)
  }, 30_000)

  it("ADM-T1E06: cada control C0 y C1 (salvo salto y tabulador) y cada inversor de dirección dan 400 con el texto de siempre, sin escribir y sin repetir el motivo; \\r\\n y \\r se normalizan; U+2028 y U+2029 se guardan", async () => {
    const t = marca()
    const alumno = await crearCuenta({ nombre: `Controles ${t}` })
    const antes = await leerUsuarioDb(alumno.id)
    const prohibidos: number[] = []
    for (let codigo = 0; codigo <= 0x1f; codigo += 1) {
      if (codigo !== 0x09 && codigo !== 0x0a && codigo !== 0x0d) prohibidos.push(codigo)
    }
    for (let codigo = 0x7f; codigo <= 0x9f; codigo += 1) prohibidos.push(codigo)
    for (let codigo = 0x202a; codigo <= 0x202e; codigo += 1) prohibidos.push(codigo)
    for (let codigo = 0x2066; codigo <= 0x2069; codigo += 1) prohibidos.push(codigo)
    const fallas: string[] = []
    for (const codigo of prohibidos) {
      const secreto = `secreto-${t}-${codigo.toString(16)}`
      const motivo = `${secreto}${String.fromCodePoint(codigo)}fin`
      const r = await acceso(alumno.id, { restringido: true, motivo })
      const { mensaje } = errorDe(r)
      if (r.statusCode !== 400 || mensaje !== "motivo: El texto tiene caracteres no permitidos") {
        fallas.push(`U+${codigo.toString(16)}: ${r.statusCode} ${mensaje}`)
      }
      if (r.body.includes(secreto)) fallas.push(`U+${codigo.toString(16)}: el 400 repite el motivo`)
    }
    expect(fallas).toEqual([])
    expect(await leerUsuarioDb(alumno.id)).toEqual(antes)

    const crlf = await acceso(alumno.id, { restringido: true, motivo: `  uno\r\ndos\rtres ${t}  ` })
    expect(crlf.statusCode).toBe(200)
    expect((await leerUsuarioDb(alumno.id))?.motivoRestriccion).toBe(`uno\ndos\ntres ${t}`)
    const separadores = `linea\u2028parrafo\u2029${t}`
    const rSep = await acceso(alumno.id, { restringido: true, motivo: separadores })
    expect(rSep.statusCode, rSep.body).toBe(200)
    expect((await leerUsuarioDb(alumno.id))?.motivoRestriccion).toBe(separadores)
  }, 30_000)

  it("ADM-T1E07: motivo que no es texto o restringido que no es booleano: 400 legible y sin escribir; mismo motivo con espacios externos o \\r\\n no escribe; solo invisibles es sin motivo; restablecer con motivo lo ignora", async () => {
    const t = marca()
    const alumno = await crearCuenta({ nombre: `Tipos ${t}` })
    const antes = await leerUsuarioDb(alumno.id)
    for (const cuerpo of [
      { restringido: true, motivo: null },
      { restringido: true, motivo: 7 },
      { restringido: true, motivo: { texto: "x" } },
      { restringido: true, motivo: ["x"] },
      { restringido: true, motivo: true },
      { restringido: "true", motivo: "x" },
      { restringido: null },
      {},
      [],
      { motivo: "x" },
    ]) {
      const r = await acceso(alumno.id, cuerpo)
      expect(r.statusCode, `${JSON.stringify(cuerpo)}: ${r.body}`).toBe(400)
      const { mensaje } = errorDe(r)
      expect(mensaje.length, JSON.stringify(cuerpo)).toBeGreaterThan(0)
    }
    expect(await leerUsuarioDb(alumno.id)).toEqual(antes)

    const motivo = `Adeudo de marzo ${t}\nsegunda línea`
    expect((await acceso(alumno.id, { restringido: true, motivo })).statusCode).toBe(200)
    const restringido = await leerUsuarioDb(alumno.id)
    for (const igual of [`  ${motivo}  `, motivo.replace("\n", "\r\n"), `\n${motivo}\r\n`]) {
      const r = await acceso(alumno.id, { restringido: true, motivo: igual })
      expect(r.statusCode).toBe(200)
      expect(await leerUsuarioDb(alumno.id), JSON.stringify(igual)).toEqual(restringido)
    }

    const invisibles = await acceso(alumno.id, {
      restringido: true,
      motivo: " \u200b\u200d\ufe0f\u2800\u3164 ",
    })
    expect(invisibles.statusCode).toBe(200)
    const sinMotivo = await leerUsuarioDb(alumno.id)
    expect(sinMotivo?.motivoRestriccion).toBeNull()
    expect(sinMotivo?.accesoRestringido).toBe(true)
    expect(sinMotivo?.fechaRestriccion).toEqual(restringido?.fechaRestriccion)

    const restablecer = await acceso(alumno.id, { restringido: false, motivo: `ignorar ${t}` })
    expect(restablecer.statusCode).toBe(200)
    const restablecido = await leerUsuarioDb(alumno.id)
    expect(restablecido?.accesoRestringido).toBe(false)
    expect(restablecido?.motivoRestriccion).toBeNull()
    expect(restablecido?.fechaRestriccion).toBeNull()
  }, 30_000)
})

describe("ataque ADMIN-01e r1: alta de alumno y lote de estado de pago (puntos 7 y 8)", () => {
  it("ADM-T1E08: dos altas a la vez con el mismo correo (con otra capitalización y espacios): una 201 y la otra 409, ninguna 500; el correo de una cuenta dada de baja da 409", async () => {
    const t = marca()
    const correo = `alta-${t}@pruebas.local`
    const respuestas = await Promise.all(
      [correo, `  ${correo.toUpperCase()}  `, correo, `ALTA-${t}@Pruebas.Local`].map((email) =>
        pedir("POST", "/api/admin/alumnos", tokenAdmin, { nombre: `Alta ${t}`, email }),
      ),
    )
    const creada = await obtenerDb().usuario.findMany({
      where: { email: { contains: t } },
      select: { id: true, email: true, rol: true },
    })
    for (const fila of creada) idsUsuarios.push(fila.id)
    expect(respuestas.map((r) => r.statusCode).sort()).toEqual([201, 409, 409, 409])
    expect(creada).toEqual([{ id: expect.any(String) as string, email: correo, rol: "estudiante" }])
    for (const r of respuestas.filter((x) => x.statusCode === 409)) {
      expect(errorDe(r).codigo).toBe("CORREO_EN_USO")
    }
    const ok = respuestas.find((r) => r.statusCode === 201)
    expect(ok?.headers["cache-control"]).toBe("no-store")

    const dadaDeBaja = await crearCuenta({ nombre: `Baja ${t}`, activo: false })
    const repetida = await pedir("POST", "/api/admin/alumnos", tokenAdmin, {
      nombre: `Otra ${t}`,
      email: dadaDeBaja.email.toUpperCase(),
    })
    expect(repetida.statusCode).toBe(409)
    expect(repetida.body).not.toContain("contrasenaTemporal")
  })

  it("ADM-T1E09: un lote de 100 con un admin, un maestro, un inexistente o un id repetido en otra capitalización: 400 sin escribir ninguna fila; dados de baja y restringidos sí cambian y la fecha solo en los que cambian", async () => {
    const t = marca()
    const alumnos: Cuenta[] = []
    for (let i = 0; i < 99; i += 1) alumnos.push(await crearCuenta({ nombre: `Lote ${i} ${t}` }))
    const maestro = await crearCuenta({ nombre: `Maestro ${t}`, rol: "maestro" })
    const ids = alumnos.map((a) => a.id)
    const contarDeudores = () =>
      obtenerDb().usuario.count({ where: { id: { in: ids }, estadoPago: "deudor" } })
    for (const intruso of [idAdmin, maestro.id, randomUUID()]) {
      const r = await pedir("PUT", "/api/admin/alumnos/estado-pago", tokenAdmin, {
        alumnoIds: [...ids, intruso],
        estadoPago: "deudor",
      })
      expect(r.statusCode, r.body).toBe(400)
      expect(errorDe(r).mensaje).toBe("alumnoIds: hay cuentas que no son de alumnos")
      expect(await contarDeudores()).toBe(0)
    }
    const conRepetido = await pedir("PUT", "/api/admin/alumnos/estado-pago", tokenAdmin, {
      alumnoIds: [...ids.slice(0, 50), (ids[0] ?? "").toUpperCase()],
      estadoPago: "deudor",
    })
    expect(conRepetido.statusCode).toBe(400)
    expect(await contarDeudores()).toBe(0)
    const de101 = await pedir("PUT", "/api/admin/alumnos/estado-pago", tokenAdmin, {
      alumnoIds: [...ids, maestro.id, randomUUID()],
      estadoPago: "deudor",
    })
    expect(de101.statusCode).toBe(400)

    const baja = await crearCuenta({ nombre: `Baja ${t}`, activo: false })
    const restringida = await crearCuenta({ nombre: `Restr ${t}`, accesoRestringido: true })
    const yaDeudora = await crearCuenta({ nombre: `Deudora ${t}`, estadoPago: "deudor" })
    const antesDeudora = await leerUsuarioDb(yaDeudora.id)
    const mixto = await pedir("PUT", "/api/admin/alumnos/estado-pago", tokenAdmin, {
      alumnoIds: [baja.id.toUpperCase(), restringida.id, yaDeudora.id],
      estadoPago: "deudor",
    })
    expect(mixto.statusCode, mixto.body).toBe(200)
    expect(mixto.json()).toEqual({ actualizados: 2 })
    expect((await leerUsuarioDb(baja.id))?.estadoPago).toBe("deudor")
    expect((await leerUsuarioDb(baja.id))?.fechaEstadoPago).not.toBeNull()
    expect((await leerUsuarioDb(restringida.id))?.estadoPago).toBe("deudor")
    expect((await leerUsuarioDb(yaDeudora.id))?.fechaEstadoPago).toEqual(
      antesDeudora?.fechaEstadoPago,
    )
  }, 60_000)

  it("ADM-T1E10: lotes cruzados en paralelo (los mismos alumnos en órdenes inversos y en mayúsculas): ningún 500 ni 503 y el estado final es el de algún lote", async () => {
    const t = marca()
    const alumnos: Cuenta[] = []
    for (let i = 0; i < 20; i += 1) alumnos.push(await crearCuenta({ nombre: `Cruce ${i} ${t}` }))
    const ids = alumnos.map((a) => a.id)
    const lotes = Array.from({ length: 12 }, (_, i) => {
      const orden = i % 2 === 0 ? ids : [...ids].reverse()
      return pedir("PUT", "/api/admin/alumnos/estado-pago", tokenAdmin, {
        alumnoIds: i % 3 === 0 ? orden.map((id) => id.toUpperCase()) : orden,
        estadoPago: i % 2 === 0 ? "deudor" : "al_corriente",
      })
    })
    const respuestas = await Promise.all(lotes)
    expect(respuestas.map((r) => r.statusCode)).toEqual(respuestas.map(() => 200))
    const estados = await obtenerDb().usuario.findMany({
      where: { id: { in: ids } },
      select: { estadoPago: true },
    })
    expect(new Set(estados.map((e) => e.estadoPago)).size).toBe(1)
  }, 60_000)
})

describe("ataque ADMIN-01e r1: todo a la vez sobre un mismo alumno (punto 1)", () => {
  it("ADM-T1E11: baja, restringir, lotes (mayúsculas y minúsculas), login, refresco, restablecer del admin y restablecer por enlace a la vez, cinco veces: ningún 500 ni 40P01; tras la baja no queda ninguna sesión viva ni enlace usable", async () => {
    const t = marca()
    for (let vuelta = 0; vuelta < 5; vuelta += 1) {
      const alumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: `Todo ${vuelta} ${t}` })
      const sesion = await iniciarSesionDePrueba(obtenerApp(), alumno)
      const enlace = await crearTokenDePrueba({
        usuarioId: alumno.id,
        tipo: "recuperacion",
        expiraEn: new Date(Date.now() + 10 * 60_000),
      })
      const laApp = obtenerApp()
      const peticiones: Promise<LightMyRequestResponse>[] = [
        pedir("PUT", `/api/admin/usuarios/${alumno.id}/activo`, tokenAdmin, { activo: false }),
        pedir("PUT", `/api/admin/alumnos/${alumno.id}/acceso`, tokenAdmin, {
          restringido: true,
          motivo: `Todo ${t}`,
        }),
        pedir("PUT", "/api/admin/alumnos/estado-pago", tokenAdmin, {
          alumnoIds: [alumno.id.toUpperCase()],
          estadoPago: "deudor",
        }),
        pedir("PUT", "/api/admin/alumnos/estado-pago", tokenAdmin, {
          alumnoIds: [alumno.id],
          estadoPago: "al_corriente",
        }),
        laApp.inject({
          method: "POST",
          url: "/api/auth/login",
          payload: { email: alumno.email, contrasena: alumno.contrasena },
        }),
        laApp.inject({
          method: "POST",
          url: "/api/auth/refrescar",
          cookies: { [NOMBRE_COOKIE]: sesion.cookie },
        }),
        pedir("POST", `/api/admin/usuarios/${alumno.id}/restablecer-contrasena`, tokenAdmin),
        laApp.inject({
          method: "POST",
          url: "/api/auth/restablecer",
          payload: { token: enlace.token, contrasena: `nueva-clave-${t}` },
        }),
      ]
      const respuestas = await Promise.all(peticiones)
      const estados = respuestas.map((r) => r.statusCode)
      expect(
        estados.filter((e) => e >= 500),
        `vuelta ${vuelta}: ${JSON.stringify(estados)} ${respuestas.map((r) => r.body.slice(0, 120)).join(" | ")}`,
      ).toEqual([])
      expect(estados.slice(0, 4), `vuelta ${vuelta}`).toEqual([200, 200, 200, 200])
      const fila = await leerUsuarioDb(alumno.id)
      expect(fila?.activo).toBe(false)
      expect(fila?.accesoRestringido).toBe(true)
      expect(await contarSesionesVivas(alumno.id), `vuelta ${vuelta}`).toBe(0)
      const vivos = (await leerTokens(alumno.id)).filter(
        (token) => token.usadoEn === null && token.revocadoEn === null,
      )
      expect(vivos, `vuelta ${vuelta}`).toEqual([])
      const login = await laApp.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: alumno.email, contrasena: alumno.contrasena },
      })
      expect(login.statusCode).toBe(401)
    }
  }, 120_000)
})

describe("ataque ADMIN-01e r1: la marca «Cuenta desactivada» y N-14 (puntos 2 y 3)", () => {
  it("ADM-T1E12: con un maestro dado de baja en una clase restaurada, la marca sale en detalle, lista del admin, editar, quitar, asignar y Personas, solo en él y siempre true; nunca en inscritas, anteriores ni candidatos; activo nunca sale; repetir la baja no escribe y reactivar la quita", async () => {
    const t = marca()
    const a = await crearCuenta({ nombre: `Activa ${t}`, rol: "maestro" })
    const b = await crearCuenta({ nombre: `Baja ${t}`, rol: "maestro" })
    const c = await crearCuenta({ nombre: `Tercera ${t}`, rol: "maestro" })
    const alumno = await crearCuenta({ nombre: `Alumno ${t}` })
    const tokenAlumno = await firmarTokenDePrueba({ usuarioId: alumno.id })
    const clase = await crearClaseDePrueba(idsClases, {
      maestroId: a.id,
      maestroIds: [a.id, b.id],
      nombre: `Clase ${t}`,
    })
    const anterior = await crearClaseDePrueba(idsClases, {
      maestroId: b.id,
      nombre: `Anterior ${t}`,
    })
    await inscribirDePrueba(clase.id, alumno.id)
    await inscribirDePrueba(anterior.id, alumno.id)
    for (const id of [clase.id, anterior.id]) {
      const r = await pedir("POST", `/api/admin/clases/${id}/archivar`)
      expect(r.statusCode, r.body).toBe(200)
    }
    const baja = await pedir("PUT", `/api/admin/usuarios/${b.id}/activo`, tokenAdmin, {
      activo: false,
    })
    expect(baja.statusCode, baja.body).toBe(200)
    expect((await pedir("POST", `/api/admin/clases/${clase.id}/restaurar`)).statusCode).toBe(200)

    const fallas: string[] = []
    const revisar = (donde: string, maestros: { id?: string; [k: string]: unknown }[]) => {
      for (const m of maestros) {
        const esperaMarca = m.id === b.id
        const claves = Object.keys(m).sort()
        if ("activo" in m) fallas.push(`${donde}: trae activo`)
        if (esperaMarca && m.cuentaDesactivada !== true) fallas.push(`${donde}: b sin la marca`)
        if (!esperaMarca && "cuentaDesactivada" in m) {
          fallas.push(`${donde}: ${String(m.id)} con la marca ${JSON.stringify(claves)}`)
        }
      }
    }
    const detalle = await pedir("GET", `/api/clases/${clase.id}`)
    expect(detalle.statusCode).toBe(200)
    const delDetalle = detalle.json<{ clase: { maestros: Fila[]; maestro: Fila } }>().clase
    revisar("detalle", delDetalle.maestros)
    revisar("detalle.maestro", [delDetalle.maestro])

    let encontrada: Fila[] | undefined
    let cursor: string | null = null
    for (let pagina = 0; pagina < 40 && encontrada === undefined; pagina += 1) {
      const url: string =
        cursor === null
          ? "/api/admin/clases?limite=100"
          : `/api/admin/clases?limite=100&cursor=${cursor}`
      const lista = await pedir("GET", url)
      expect(lista.statusCode, lista.body.slice(0, 200)).toBe(200)
      const cuerpo = lista.json<{
        clases: { id: string; maestros: Fila[] }[]
        siguienteCursor: string | null
      }>()
      encontrada = cuerpo.clases.find((fila) => fila.id === clase.id)?.maestros
      cursor = cuerpo.siguienteCursor
      if (cursor === null) break
    }
    expect(encontrada, "la clase restaurada no aparece en la lista del admin").toBeDefined()
    revisar("lista del admin", encontrada ?? [])

    const editar = await pedir("PUT", `/api/admin/clases/${clase.id}`, tokenAdmin, {
      nombre: `Clase editada ${t}`,
    })
    expect(editar.statusCode, editar.body).toBe(200)
    revisar("editar", editar.json<{ clase: { maestros: Fila[] } }>().clase.maestros)

    const personas = await pedir("GET", `/api/clases/${clase.id}/personas`, tokenAlumno)
    expect(personas.statusCode, personas.body).toBe(200)
    revisar("personas", personas.json<{ maestros: Fila[] }>().maestros)
    expect(clavesDe(personas.json())).not.toContain("activo")

    const inscritas = await pedir("GET", "/api/clases/inscritas?limite=100", tokenAlumno)
    const anteriores = await pedir("GET", "/api/clases/anteriores?limite=100", tokenAlumno)
    const candidatos = await pedir(
      "GET",
      `/api/admin/maestros/candidatos?q=${encodeURIComponent(t)}`,
    )
    for (const [donde, r] of [
      ["inscritas", inscritas],
      ["anteriores", anteriores],
      ["candidatos", candidatos],
    ] as const) {
      expect(r.statusCode, `${donde}: ${r.body.slice(0, 200)}`).toBe(200)
      const claves = clavesDe(r.json())
      if (claves.includes("cuentaDesactivada")) fallas.push(`${donde}: trae la marca`)
      if (claves.includes("activo")) fallas.push(`${donde}: trae activo`)
    }
    expect(anteriores.body).toContain(anterior.id)
    expect(candidatos.body).not.toContain(b.id)

    // Repetir la baja (clase activa con b): 200 sin escribir.
    const antesDeRepetir = await leerUsuarioDb(b.id)
    const repetida = await pedir("PUT", `/api/admin/usuarios/${b.id}/activo`, tokenAdmin, {
      activo: false,
    })
    expect(repetida.statusCode).toBe(200)
    expect(await leerUsuarioDb(b.id)).toEqual(antesDeRepetir)

    // Quitar a la activa deja la clase solo con la dada de baja (N-14, ver OA-01e-r1-1).
    const quitar = await pedir("DELETE", `/api/admin/clases/${clase.id}/maestros/${a.id}`)
    expect(quitar.statusCode, quitar.body).toBe(200)
    revisar("quitar", quitar.json<{ maestros: Fila[] }>().maestros)
    // N-01e-2: con el principal dado de baja, «Personas» responde 200; la marca va en maestros[0]
    // y el campo de compatibilidad `maestro` sale sin ella (el parse la quita), sin 500.
    const conPrincipalDeBaja = await pedir("GET", `/api/clases/${clase.id}/personas`, tokenAlumno)
    expect(conPrincipalDeBaja.statusCode, conPrincipalDeBaja.body).toBe(200)
    const principal = conPrincipalDeBaja.json<{ maestro: Fila; maestros: Fila[] }>()
    revisar("personas con el principal de baja", principal.maestros)
    expect(principal.maestros.map((m) => m.id)).toEqual([b.id])
    expect(principal.maestro.id).toBe(b.id)
    expect(Object.keys(principal.maestro).sort()).toEqual(["email", "id", "nombre"])
    const asignar = await pedir("POST", `/api/admin/clases/${clase.id}/maestros`, tokenAdmin, {
      maestroId: c.id,
    })
    expect(asignar.statusCode, asignar.body).toBe(200)
    revisar("asignar", asignar.json<{ maestros: Fila[] }>().maestros)

    const reactivar = await pedir("PUT", `/api/admin/usuarios/${b.id}/activo`, tokenAdmin, {
      activo: true,
    })
    expect(reactivar.statusCode).toBe(200)
    const trasReactivar = await pedir("GET", `/api/clases/${clase.id}`)
    expect(clavesDe(trasReactivar.json())).not.toContain("cuentaDesactivada")
    expect(fallas).toEqual([])
  }, 60_000)

  it("ADM-T1E13: duplicar o crear con un maestro dado de baja responde 404 y no crea nada; la baja del único maestro activo de una clase activa da 409", async () => {
    const t = marca()
    const a = await crearCuenta({ nombre: `Activa ${t}`, rol: "maestro" })
    const b = await crearCuenta({ nombre: `Baja ${t}`, rol: "maestro", activo: false })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: a.id, nombre: `Origen ${t}` })
    const duplicar = await pedir("POST", `/api/admin/clases/${clase.id}/duplicar`, tokenAdmin, {
      nombre: `Copia ${t}`,
      maestroIds: [b.id],
    })
    expect(duplicar.statusCode, duplicar.body).toBe(404)
    const crear = await pedir("POST", "/api/admin/clases", tokenAdmin, {
      nombre: `Nueva ${t}`,
      maestroIds: [a.id, b.id],
    })
    expect(crear.statusCode, crear.body).toBe(404)
    expect(await obtenerDb().clase.count({ where: { nombre: { contains: t } } })).toBe(1)
    const bajaA = await pedir("PUT", `/api/admin/usuarios/${a.id}/activo`, tokenAdmin, {
      activo: false,
    })
    expect(bajaA.statusCode).toBe(409)
    expect(errorDe(bajaA)).toEqual({
      codigo: "MAESTRO_CON_CLASES",
      mensaje:
        "Este maestro tiene 1 clase activa asignada. Asigna otro maestro a esa clase y quítalo de ella antes de darlo de baja.",
    })
  })

  it("ADM-T1E14 (O-R1-1): una clase archivada con 0 maestros (solo en una transacción que se deshace; no se alcanza por la API) sale del adaptador sin maestros, y el esquema de la respuesta la rechazaría", async () => {
    const t = marca()
    const m = await crearCuenta({ nombre: `Maestro ${t}`, rol: "maestro" })
    const alumno = await crearCuenta({ nombre: `Alumno ${t}` })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: m.id, nombre: `Sin ${t}` })
    await inscribirDePrueba(clase.id, alumno.id)
    expect((await pedir("POST", `/api/admin/clases/${clase.id}/archivar`)).statusCode).toBe(200)
    const CENTINELA = new Error("deshacer")
    let maestrosEnElAdaptador = -1
    let esquemaAcepta = true
    await expect(
      enTransaccion(
        obtenerDb(),
        async (tx) => {
          await tx.maestroDeClase.deleteMany({ where: { claseId: clase.id } })
          const lista = await listarClasesAnteriores(
            {
              usuarioId: alumno.id,
              rol: "estudiante",
              cursor: undefined,
              cursorArchivadaEn: undefined,
              limite: 100,
            },
            tx,
          )
          const fila = lista.clases.find((x) => x.id === clase.id)
          maestrosEnElAdaptador = fila?.maestros.length ?? -1
          esquemaAcepta = listaClasesAnterioresRespuestaSchema.safeParse({
            ...lista,
            clases: lista.clases.map((x) => ({ ...x, archivadaEn: x.archivadaEn.toISOString() })),
            siguienteCursorArchivadaEn: null,
          }).success
          throw CENTINELA
        },
        { timeout: 10_000 },
      ),
    ).rejects.toBe(CENTINELA)
    expect(maestrosEnElAdaptador).toBe(0)
    expect(esquemaAcepta).toBe(false)
    expect(await obtenerDb().maestroDeClase.count({ where: { claseId: clase.id } })).toBe(1)
  })
})

describe("ataque ADMIN-01e r1: movimientos, resumen y cuentas raras (puntos 9 y 10)", () => {
  it("ADM-T1E15: el cursor de un movimiento borrado con su clase da 400; un actor maestro y un alumno dados de baja salen sin marcas ni datos de pago; HEAD del resumen y de los movimientos sin cuerpo", async () => {
    const t = marca()
    const maestro = await crearCuenta({ nombre: `Actor ${t}`, rol: "maestro" })
    const alumno = await crearCuenta({ nombre: `Movido ${t}`, estadoPago: "deudor" })
    const efimera = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const fija = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const borrado = await obtenerDb().movimientoInscripcion.create({
      data: { claseId: efimera.id, alumnoId: alumno.id, actorId: maestro.id, tipo: "alta" },
      select: { id: true },
    })
    const vivo = await obtenerDb().movimientoInscripcion.create({
      data: { claseId: fija.id, alumnoId: alumno.id, actorId: maestro.id, tipo: "alta" },
      select: { id: true },
    })
    await obtenerDb().movimientoInscripcion.deleteMany({ where: { claseId: efimera.id } })
    await obtenerDb().clase.delete({ where: { id: efimera.id } })
    const conBorrado = await pedir("GET", `/api/admin/movimientos-inscripcion?cursor=${borrado.id}`)
    expect(conBorrado.statusCode).toBe(400)
    expect(errorDe(conBorrado).mensaje).toBe("cursor: no es válido")

    await obtenerDb().usuario.updateMany({
      where: { id: { in: [maestro.id, alumno.id] } },
      data: { activo: false },
    })
    let fila: Record<string, unknown> | undefined
    let cursor: string | null = null
    for (let pagina = 0; pagina < 40 && fila === undefined; pagina += 1) {
      const url: string =
        cursor === null
          ? "/api/admin/movimientos-inscripcion?limite=100"
          : `/api/admin/movimientos-inscripcion?limite=100&cursor=${cursor}`
      const r = await pedir("GET", url)
      expect(r.statusCode).toBe(200)
      const cuerpo = r.json<{
        movimientos: (Record<string, unknown> & { id: string })[]
        siguienteCursor: string | null
      }>()
      fila = cuerpo.movimientos.find((m) => m.id === vivo.id)
      cursor = cuerpo.siguienteCursor
      if (cursor === null) break
    }
    expect(fila, "el movimiento no aparece").toBeDefined()
    expect(fila?.actor).toEqual({ id: maestro.id, nombre: maestro.nombre, administracion: false })
    expect(fila?.alumno).toEqual({ id: alumno.id, nombre: alumno.nombre, email: alumno.email })
    const claves = clavesDe(fila)
    for (const prohibida of [
      "estadoPago",
      "accesoRestringido",
      "activo",
      "cuentaDesactivada",
      "rol",
    ]) {
      expect(claves).not.toContain(prohibida)
    }
    for (const url of ["/api/admin/resumen", "/api/admin/movimientos-inscripcion"]) {
      const head = await pedir("HEAD", url)
      expect(head.statusCode, url).toBe(200)
      expect(head.body, url).toBe("")
    }
  })

  it("ADM-T1E16: un maestro con acceso restringido en la base, una cuenta inactiva con token vivo y el admin sobre sí mismo: 403, 401 y 409 sin escribir; el admin no se restringe ni se da de baja", async () => {
    const t = marca()
    const maestroRaro = await crearCuenta({
      nombre: `Raro ${t}`,
      rol: "maestro",
      accesoRestringido: true,
    })
    const inactiva = await crearCuenta({ nombre: `Inactiva ${t}`, activo: false })
    const tokenRaro = await firmarTokenDePrueba({ usuarioId: maestroRaro.id })
    const tokenInactiva = await firmarTokenDePrueba({ usuarioId: inactiva.id })
    for (const url of ["/api/admin/usuarios?rol=maestro", `/api/admin/usuarios/${inactiva.id}`]) {
      expect((await pedir("GET", url, tokenRaro)).statusCode, url).toBe(403)
      expect((await pedir("GET", url, tokenInactiva)).statusCode, url).toBe(401)
    }
    const antes = await obtenerDb().usuario.findUnique({ where: { id: idAdmin } })
    const acceso = await pedir("PUT", `/api/admin/alumnos/${idAdmin}/acceso`, tokenAdmin, {
      restringido: true,
      motivo: `yo ${t}`,
    })
    expect(acceso.statusCode).toBe(409)
    expect(errorDe(acceso).codigo).toBe("NO_ES_ALUMNO")
    for (const activo of [false, true]) {
      const r = await pedir("PUT", `/api/admin/usuarios/${idAdmin}/activo`, tokenAdmin, { activo })
      expect(r.statusCode).toBe(409)
      expect(errorDe(r).codigo).toBe("CUENTA_DE_ADMINISTRACION")
    }
    const accesoMaestro = await pedir(
      "PUT",
      `/api/admin/alumnos/${maestroRaro.id}/acceso`,
      tokenAdmin,
      { restringido: false },
    )
    expect(accesoMaestro.statusCode).toBe(409)
    expect(await obtenerDb().usuario.findUnique({ where: { id: idAdmin } })).toEqual(antes)
    expect(await obtenerDb().usuario.count({ where: { rol: "admin" } })).toBe(1)
  })
})
