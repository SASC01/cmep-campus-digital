import { randomUUID } from "node:crypto"

import { errorApiSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { crearClase } from "../src/adapters/db/clases.js"
import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { AppError } from "../src/core/errores.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarClasesDePrueba,
  codigoDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
  leerClaseDb,
} from "./ayudas-clases.js"

// Tester, CLASES-a, ronda 2. T-01 después de la corrección (normalización CRLF → LF de la
// descripción en el handler) y regresión rápida de lo atacado sin hallazgos en la ronda 1.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("Precondición: la aplicación no se construyó en beforeAll")
  return app
}

const maestro = (): Promise<UsuarioDePrueba> =>
  crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
const estudiante = (): Promise<UsuarioDePrueba> =>
  crearUsuarioDePrueba(idsUsuarios, { rol: "estudiante" })
const tokenDe = (usuario: { id: string }): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

const pedir = (
  method: "GET" | "HEAD" | "POST" | "PUT",
  url: string,
  token?: string,
  payload?: unknown,
): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method,
    url,
    ...(payload === undefined ? {} : { payload: payload as Record<string, unknown> }),
    headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
  })

const codigoDe = (r: LightMyRequestResponse): string => errorApiSchema.parse(r.json()).error.codigo

const clavesEn = (cuerpo: string, prohibidas: readonly string[]): string[] => {
  if (cuerpo.length === 0) return []
  const encontradas: string[] = []
  const pila: [unknown, string][] = [[JSON.parse(cuerpo) as unknown, "$"]]
  while (pila.length > 0) {
    const siguiente = pila.pop()
    if (siguiente === undefined) break
    const [actual, ruta] = siguiente
    if (actual === null || typeof actual !== "object") continue
    for (const [clave, valor] of Object.entries(actual as Record<string, unknown>)) {
      if (prohibidas.includes(clave)) encontradas.push(`${ruta}.${clave}`)
      pila.push([valor, `${ruta}.${clave}`])
    }
  }
  return encontradas
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  await borrarClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("ataque CLASES-a r2: T-01, límites de la normalización", () => {
  // Un CRLF solo en los extremos del nombre lo quita el trim del esquema (comportamiento aceptado):
  // aquí solo los saltos interiores.
  it("un nombre con CRLF, CR o LF interiores se rechaza con 400 y no crea fila", async () => {
    const dueno = await maestro()
    const token = await tokenDe(dueno)
    for (const nombre of ["Clase\r\nDos", "Clase\rDos", "Clase\nDos"]) {
      const r = await pedir("POST", "/api/clases", token, { nombre })
      expect(r.statusCode, JSON.stringify(nombre)).toBe(400)
      expect(codigoDe(r)).toBe("VALIDACION")
    }
    expect(await obtenerDb().clase.count({ where: { maestroId: dueno.id } })).toBe(0)
  })

  it("un nombre con separador de línea o de párrafo Unicode (U+2028, U+2029) se rechaza: debe ser de una sola línea", async () => {
    const dueno = await maestro()
    const token = await tokenDe(dueno)
    for (const nombre of ["Clase Dos", "Clase Dos"]) {
      const r = await pedir("POST", "/api/clases", token, { nombre })
      if (r.statusCode === 201) idsClases.push(r.json<{ clase: { id: string } }>().clase.id)
      expect(r.statusCode, `${JSON.stringify(nombre)}: ${r.body}`).toBe(400)
    }
  })

  it("CRLF junto con otros caracteres de control o inversores en la descripción sigue dando 400", async () => {
    const dueno = await maestro()
    const token = await tokenDe(dueno)
    for (const descripcion of [
      "uno\r\ndos\u0007",
      "uno\r\n\u0000dos",
      "uno\r\n‮dos",
      "uno\r\n\u0085dos",
      "\u001Buno\r\n",
    ]) {
      const r = await pedir("POST", "/api/clases", token, { nombre: "Clase", descripcion })
      expect(r.statusCode, JSON.stringify(descripcion)).toBe(400)
    }
    expect(await obtenerDb().clase.count({ where: { maestroId: dueno.id } })).toBe(0)
  })

  it("una descripción solo de saltos se guarda como null, y tipos no texto siguen dando 400", async () => {
    const dueno = await maestro()
    const token = await tokenDe(dueno)
    const vacia = await pedir("POST", "/api/clases", token, {
      nombre: "Clase",
      descripcion: "\r\n\r\n \r",
    })
    expect(vacia.statusCode, vacia.body).toBe(201)
    const id = vacia.json<{ clase: { id: string; descripcion: string | null } }>().clase.id
    idsClases.push(id)
    expect((await leerClaseDb(id))?.descripcion).toBeNull()

    for (const descripcion of [123, ["a"], { a: 1 }, true]) {
      const r = await pedir("PUT", `/api/clases/${id}`, token, { nombre: "Clase", descripcion })
      expect(r.statusCode, JSON.stringify(descripcion)).toBe(400)
    }
  })

  it("la normalización no altera el interior (tabuladores, emojis con U+200D, espacios internos)", async () => {
    const dueno = await maestro()
    const texto = "  a\tb  c\r\n👩‍💻 fin  "
    const r = await pedir("POST", "/api/clases", await tokenDe(dueno), {
      nombre: "Clase",
      descripcion: texto,
    })
    expect(r.statusCode, r.body).toBe(201)
    const id = r.json<{ clase: { id: string } }>().clase.id
    idsClases.push(id)
    expect((await leerClaseDb(id))?.descripcion).toBe("a\tb  c\n👩‍💻 fin")
  })
})

describe("ataque CLASES-a r2: regresión rápida", () => {
  it("reintento: P2003 sin reintentar ni traducir; 22021 → 400 sin reintentar", async () => {
    let llamadas = 0
    const generar = () => {
      llamadas += 1
      return codigoDePrueba()
    }
    const fantasma = randomUUID()
    const p2003 = await crearClase({ maestroId: fantasma, nombre: "Fantasma" }, generar).then(
      () => null,
      (e: unknown) => e,
    )
    expect(p2003).not.toBeNull()
    expect(p2003 instanceof AppError && p2003.estado < 500).toBe(false)
    expect(llamadas).toBe(1)

    const dueno = await maestro()
    llamadas = 0
    const nulo = await crearClase({ maestroId: dueno.id, nombre: "a\u0000b" }, generar).then(
      () => null,
      (e: unknown) => e,
    )
    expect(nulo).toBeInstanceOf(AppError)
    expect((nulo as AppError).estado).toBe(400)
    expect(llamadas).toBe(1)
  })

  it("HEAD, paginación, campos extra y fugas siguen como en la ronda 1", async () => {
    // CLASES-a ronda 4 (C-16): adaptación por la regla de T-18 aprobada por el humano; sigue
    // protegiendo que no haya fuga de la clase ajena.
    const dueno = await maestro()
    const ajeno = await maestro()
    const alumno = await estudiante()
    const otro = await maestro()
    const tokenD = await tokenDe(dueno)
    const tokenA = await tokenDe(alumno)

    const creada = await pedir("POST", "/api/clases", tokenD, {
      nombre: "Clase r2",
      maestroId: otro.id,
      codigoInvitacion: "HJKLMNP",
      activa: false,
      id: randomUUID(),
    })
    expect(creada.statusCode).toBe(201)
    const claseId = creada.json<{ clase: { id: string } }>().clase.id
    idsClases.push(claseId)
    const fila = await leerClaseDb(claseId)
    expect(fila?.maestroId).toBe(dueno.id)
    expect(fila?.codigoInvitacion).not.toBe("HJKLMNP")
    expect(fila?.activa).toBe(true)
    await inscribirDePrueba(claseId, alumno.id)

    const headDueno = await pedir("HEAD", `/api/clases/${claseId}/codigo`, tokenD)
    expect(headDueno.statusCode).toBe(200)
    expect(String(headDueno.headers["cache-control"])).toContain("no-store")
    expect(headDueno.body).toBe("")
    const headAjeno = await pedir("HEAD", `/api/clases/${claseId}`, await tokenDe(ajeno))
    expect(headAjeno.statusCode).toBe(403)
    expect(headAjeno.body).toBe("")

    for (const limite of ["0", "101", "abc"]) {
      const r = await pedir("GET", `/api/clases/impartidas?limite=${limite}`, tokenD)
      expect(r.statusCode, limite).toBe(400)
    }

    const ajena = await crearClaseDePrueba(idsClases, { maestroId: ajeno.id, nombre: "Ajena" })
    const respuestasAlumno = [
      await pedir("GET", `/api/clases/${claseId}`, tokenA),
      await pedir("GET", "/api/clases/inscritas", tokenA),
      await pedir("POST", "/api/clases/unirse", tokenA, { codigo: fila?.codigoInvitacion }),
    ]
    for (const r of respuestasAlumno) {
      expect(r.statusCode).toBeLessThan(300)
      expect(r.body).not.toContain(String(fila?.codigoInvitacion))
      expect(r.body).not.toContain(ajena.id)
      expect(
        clavesEn(r.body, [
          "codigo",
          "codigoInvitacion",
          "estadoPago",
          "accesoRestringido",
          "email",
        ]),
      ).toEqual([])
    }

    // Cursor de una clase ajena (T-18): 400 VALIDACION, sin fuga de la clase ajena.
    const cursorAjeno = await pedir("GET", `/api/clases/inscritas?cursor=${ajena.id}`, tokenA)
    expect(cursorAjeno.statusCode).toBe(400)
    const errorAjeno = errorApiSchema.parse(cursorAjeno.json()).error
    expect(errorAjeno.codigo).toBe("VALIDACION")
    expect(errorAjeno.mensaje).toBe("cursor: no es válido")
    expect(cursorAjeno.body).not.toContain(ajena.id)
    expect(cursorAjeno.body).not.toContain(ajeno.id)
    expect(cursorAjeno.body).not.toContain("Ajena")
    expect(cursorAjeno.body).not.toContain(ajena.codigoInvitacion)
    expect(cursorAjeno.body).not.toContain(String(fila?.codigoInvitacion))
    // Sin "codigo": el sobre de error { error: { codigo, mensaje } } la trae siempre, y su valor ya
    // quedó fijado en "VALIDACION".
    expect(
      clavesEn(cursorAjeno.body, ["codigoInvitacion", "estadoPago", "accesoRestringido", "email"]),
    ).toEqual([])

    // Sin oráculo de existencia: un id que no existe responde idéntico al cursor ajeno.
    const cursorInexistente = await pedir(
      "GET",
      `/api/clases/inscritas?cursor=${randomUUID()}`,
      tokenA,
    )
    expect(cursorInexistente.statusCode).toBe(cursorAjeno.statusCode)
    const errorInexistente = errorApiSchema.parse(cursorInexistente.json()).error
    expect(errorInexistente.codigo).toBe(errorAjeno.codigo)
    expect(errorInexistente.mensaje).toBe(errorAjeno.mensaje)

    const detalleDueno = await pedir("GET", `/api/clases/${claseId}`, tokenD)
    expect(detalleDueno.statusCode).toBe(200)
    expect(clavesEn(detalleDueno.body, ["codigoInvitacion", "estadoPago", "email"])).toEqual([])
  })
})
