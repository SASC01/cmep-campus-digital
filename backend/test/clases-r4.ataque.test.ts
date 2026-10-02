import { randomUUID } from "node:crypto"

import { errorApiSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import { borrarClasesDePrueba, crearClaseDePrueba, inscribirDePrueba } from "./ayudas-clases.js"

// Tester, CLASES-a, ronda 4 (regresión final). T-18 con la regla aprobada por el humano: un cursor
// que no es una inscripción del alumno o una clase del maestro responde 400 VALIDACION
// "cursor: no es válido", igual para cualquier origen del cursor, y sin cambiar la paginación válida.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("Precondición: la aplicación no se construyó en beforeAll")
  return app
}

const maestro = (): Promise<UsuarioDePrueba> =>
  crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
const estudiante = (opciones: { accesoRestringido?: boolean } = {}): Promise<UsuarioDePrueba> =>
  crearUsuarioDePrueba(idsUsuarios, { rol: "estudiante", ...opciones })
const tokenDe = (usuario: { id: string }): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

const pedir = (
  method: "GET" | "HEAD",
  url: string,
  token?: string,
): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method,
    url,
    headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
  })

const errorDe = (r: LightMyRequestResponse) => errorApiSchema.parse(r.json()).error

interface Pagina {
  clases: { id: string }[]
  total: number
  siguienteCursor: string | null
}

const recorrer = async (ruta: string, token: string, limite: number): Promise<Pagina[]> => {
  const paginas: Pagina[] = []
  let cursor: string | null = null
  for (let i = 0; i < 10; i++) {
    const url: string =
      cursor === null
        ? `/api/clases/${ruta}?limite=${limite}`
        : `/api/clases/${ruta}?limite=${limite}&cursor=${cursor}`
    const r = await pedir("GET", url, token)
    expect(r.statusCode, `${url}: ${r.body}`).toBe(200)
    const pagina = r.json<Pagina>()
    paginas.push(pagina)
    cursor = pagina.siguienteCursor
    if (cursor === null) break
  }
  return paginas
}

const idAdmin = async (): Promise<string> => {
  const admin = await obtenerDb().usuario.findFirst({
    where: { rol: "admin" },
    select: { id: true },
  })
  if (!admin) throw new Error("Precondición: la base desechable no tiene el admin de seed:admin")
  return admin.id
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

describe("ataque CLASES-a r4: T-18, cursores que no son del usuario", () => {
  it("inscritas: inscripción borrada, clase ajena y UUID inexistente responden idéntico (400, sin revelar nada)", async () => {
    const dueno = await maestro()
    const otroMaestro = await maestro()
    const alumno = await estudiante()
    const otroAlumno = await estudiante()
    const propia = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const borrada = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const ajena = await crearClaseDePrueba(idsClases, {
      maestroId: otroMaestro.id,
      nombre: "Ajena",
    })
    await inscribirDePrueba(propia.id, alumno.id)
    await inscribirDePrueba(borrada.id, alumno.id)
    await inscribirDePrueba(ajena.id, otroAlumno.id)
    await obtenerDb().inscripcion.delete({
      where: { claseId_usuarioId: { claseId: borrada.id, usuarioId: alumno.id } },
    })
    const token = await tokenDe(alumno)

    const respuestas = []
    for (const cursor of [borrada.id, ajena.id, randomUUID()]) {
      const r = await pedir("GET", `/api/clases/inscritas?cursor=${cursor}`, token)
      expect(r.statusCode, `${cursor}: ${r.body}`).toBe(400)
      expect(r.body).not.toContain(cursor)
      expect(r.body).not.toContain("Ajena")
      expect(r.body).not.toContain(otroMaestro.id)
      respuestas.push(r.body)
    }
    expect(new Set(respuestas).size, respuestas.join("\n")).toBe(1)
    const error = errorDe(await pedir("GET", `/api/clases/inscritas?cursor=${ajena.id}`, token))
    expect(error).toEqual({ codigo: "VALIDACION", mensaje: "cursor: no es válido" })
  })

  it("impartidas: clase propia borrada, clase de otro maestro, clase donde el maestro solo está inscrito y UUID inexistente responden idéntico", async () => {
    const dueno = await maestro()
    const otroMaestro = await maestro()
    const alumno = await estudiante()
    await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const idBorrada = (await crearClaseDePrueba(idsClases, { maestroId: dueno.id })).id
    await obtenerDb().clase.delete({ where: { id: idBorrada } })
    const deOtro = await crearClaseDePrueba(idsClases, { maestroId: otroMaestro.id })
    await inscribirDePrueba(deOtro.id, alumno.id)
    const token = await tokenDe(dueno)

    const cuerpos = []
    for (const cursor of [idBorrada, deOtro.id, randomUUID()]) {
      const r = await pedir("GET", `/api/clases/impartidas?cursor=${cursor}`, token)
      expect(r.statusCode, `${cursor}: ${r.body}`).toBe(400)
      expect(errorDe(r)).toEqual({ codigo: "VALIDACION", mensaje: "cursor: no es válido" })
      expect(r.body).not.toContain(cursor)
      cuerpos.push(r.body)
    }
    expect(new Set(cuerpos).size).toBe(1)

    const head = await pedir("HEAD", `/api/clases/impartidas?cursor=${deOtro.id}`, token)
    expect(head.statusCode).toBe(400)
    expect(head.body).toBe("")
  })

  it("con cursores válidos la paginación no cambia: 3 páginas, total constante y siguienteCursor null al final", async () => {
    const dueno = await maestro()
    const alumno = await estudiante()
    const ids: string[] = []
    for (let i = 0; i < 5; i++) {
      const c = await crearClaseDePrueba(idsClases, { maestroId: dueno.id, nombre: `V${i}` })
      await inscribirDePrueba(c.id, alumno.id)
      ids.push(c.id)
    }
    for (const [ruta, token] of [
      ["impartidas", await tokenDe(dueno)],
      ["inscritas", await tokenDe(alumno)],
    ] as const) {
      const paginas = await recorrer(ruta, token, 2)
      expect(paginas, ruta).toHaveLength(3)
      expect(paginas.map((p) => p.total)).toEqual([5, 5, 5])
      expect(paginas.map((p) => p.clases.length)).toEqual([2, 2, 1])
      expect(paginas.at(-1)?.siguienteCursor).toBeNull()
      const vistos = paginas.flatMap((p) => p.clases.map((c) => c.id))
      expect(new Set(vistos)).toEqual(new Set(ids))
      expect(vistos).toHaveLength(5)
    }
  })

  it("un cursor que no es UUID sigue dando 400 por el esquema", async () => {
    const dueno = await maestro()
    const alumno = await estudiante()
    for (const [ruta, token] of [
      ["impartidas", await tokenDe(dueno)],
      ["inscritas", await tokenDe(alumno)],
    ] as const) {
      for (const cursor of ["abc", "1", encodeURIComponent("' OR 1=1 --")]) {
        const r = await pedir("GET", `/api/clases/${ruta}?cursor=${cursor}`, token)
        expect(r.statusCode, `${ruta} ${cursor}`).toBe(400)
        expect(errorDe(r).codigo).toBe("VALIDACION")
      }
    }
  })

  it("sin token, restringido, admin y rol incorrecto se niegan antes de leer el cursor", async () => {
    const dueno = await maestro()
    const alumno = await estudiante()
    const restringido = await estudiante({ accesoRestringido: true })
    const admin = await tokenDe({ id: await idAdmin() })
    const cursor = randomUUID()
    const casos: [string, string | undefined, number, string | null][] = [
      [`/api/clases/inscritas?cursor=${cursor}`, undefined, 401, null],
      [
        `/api/clases/inscritas?cursor=${cursor}`,
        await tokenDe(restringido),
        403,
        "ACCESO_RESTRINGIDO",
      ],
      [`/api/clases/inscritas?cursor=${cursor}`, admin, 403, "ROL_NO_PERMITIDO"],
      [`/api/clases/inscritas?cursor=${cursor}`, await tokenDe(dueno), 403, "ROL_NO_PERMITIDO"],
      [`/api/clases/impartidas?cursor=${cursor}`, await tokenDe(alumno), 403, "ROL_NO_PERMITIDO"],
      [`/api/clases/impartidas?cursor=${cursor}`, admin, 403, "ROL_NO_PERMITIDO"],
    ]
    for (const [url, token, estado, codigo] of casos) {
      const r = await pedir("GET", url, token)
      expect(r.statusCode, url).toBe(estado)
      if (codigo !== null) expect(errorDe(r).codigo, url).toBe(codigo)
      const head = await pedir("HEAD", url, token)
      expect(head.statusCode, `HEAD ${url}`).toBe(estado)
      expect(head.body).toBe("")
    }
  })
})
