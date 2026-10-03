import { errorApiSchema } from "@campus/shared"
import Fastify, { type FastifyInstance, type LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { manejoDeErrores } from "../src/handlers/errores.js"
import { claseDe, protegido, registrarMiddleware } from "../src/middleware/index.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarClasesDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
  leerClaseDb,
} from "./ayudas-clases.js"

// Tester, CLASES-a, ronda 3 (la última). Pertenencia y claseDe con el mismo claseId, carreras de
// un maestro ajeno, guarda después de ready() y con prefix, código viejo y de 40 caracteres, último
// recorrido de fugas y paginación con un cursor que ya no existe.

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
  destino: FastifyInstance,
  method: "GET" | "HEAD" | "POST" | "PUT",
  url: string,
  token?: string,
  payload?: unknown,
): Promise<LightMyRequestResponse> =>
  destino.inject({
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

describe("ataque CLASES-a r3: el sexto paso y claseDe usan el mismo claseId", () => {
  it("con :claseId en el prefix del plugin, la ruta con pertenencia responde al miembro con esa clase y niega al ajeno", async () => {
    const dueno = await maestro()
    const alumno = await estudiante()
    const extrano = await estudiante()
    const a = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const b = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    await inscribirDePrueba(a.id, alumno.id)
    await inscribirDePrueba(b.id, extrano.id)

    const propia = Fastify({ logger: false })
    await propia.register(manejoDeErrores)
    registrarMiddleware(propia)
    await propia.register(
      async (hijo) => {
        hijo.get("/eco", protegido({ pertenencia: "inscripcion" }), async (request) => ({
          id: claseDe(request).id,
        }))
      },
      { prefix: "/api/eco/:claseId" },
    )
    await propia.ready()
    try {
      const miembro = await pedir(
        propia,
        "GET",
        `/api/eco/${a.id}/eco?claseId=${b.id}`,
        await tokenDe(alumno),
      )
      expect(miembro.statusCode, miembro.body).toBe(200)
      expect(miembro.json<{ id: string }>().id).toBe(a.id)

      // Miembro de B pidiendo A con ?claseId=B en la query: manda el parámetro de la ruta.
      const conQuery = await pedir(
        propia,
        "GET",
        `/api/eco/${a.id}/eco?claseId=${b.id}`,
        await tokenDe(extrano),
      )
      expect(conQuery.statusCode).toBe(403)
      expect(codigoDe(conQuery)).toBe("SIN_ACCESO_A_LA_CLASE")
    } finally {
      await propia.close()
    }
  })

  it("una ruta no se puede registrar después de ready(): no hay forma de saltarse la guarda así", async () => {
    const tarde = Fastify({ logger: false })
    registrarMiddleware(tarde)
    await tarde.ready()
    let error: unknown = null
    try {
      tarde.get("/api/x/:claseId", protegido(), async () => ({ ok: true }))
    } catch (e) {
      error = e
    }
    await tarde.close()
    expect(error, "se registró una ruta después de ready()").not.toBeNull()
  })

  // CLASES-02a ronda 0 (C-2): la edición es PUT /api/admin/clases/:claseId (solo el admin). El
  // maestro ajeno la intenta en la ruta nueva (403 ROL_NO_PERMITIDO, paso 5) y regenera en la de
  // siempre (403 SIN_ACCESO_A_LA_CLASE); el admin edita mientras el dueño regenera. Lo protegido no
  // cambia: el ajeno nunca escribe, y quedan el último nombre y el último código legítimos.
  it("con edición del admin y regeneración del dueño concurrentes con un maestro ajeno, el ajeno nunca escribe", async () => {
    const dueno = await maestro()
    const ajeno = await maestro()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id, nombre: "Original" })
    const tokenD = await tokenDe(dueno)
    const tokenA = await tokenDe(ajeno)
    const tokenAdmin = await tokenDe({ id: await idAdmin() })

    const codigosDelDueno: string[] = []
    for (let i = 0; i < 6; i++) {
      const respuestas = await Promise.all([
        pedir(obtenerApp(), "PUT", `/api/admin/clases/${clase.id}`, tokenA, {
          nombre: `Robada ${i}`,
        }),
        pedir(obtenerApp(), "POST", `/api/clases/${clase.id}/codigo`, tokenA),
        pedir(obtenerApp(), "PUT", `/api/admin/clases/${clase.id.toUpperCase()}`, tokenA, {
          nombre: `Robada M ${i}`,
        }),
        pedir(obtenerApp(), "PUT", `/api/admin/clases/${clase.id}`, tokenAdmin, {
          nombre: `Dueño ${i}`,
        }),
        pedir(obtenerApp(), "POST", `/api/clases/${clase.id}/codigo`, tokenD),
      ])
      const [putAjeno, regenAjeno, putAjenoMayus] = respuestas
      for (const r of [putAjeno, putAjenoMayus]) {
        expect(r?.statusCode).toBe(403)
        expect(r === undefined ? "" : codigoDe(r)).toBe("ROL_NO_PERMITIDO")
      }
      expect(regenAjeno?.statusCode).toBe(403)
      expect(regenAjeno === undefined ? "" : codigoDe(regenAjeno)).toBe("SIN_ACCESO_A_LA_CLASE")
      expect(respuestas[3]?.statusCode).toBe(200)
      expect(respuestas[4]?.statusCode).toBe(200)
      codigosDelDueno.push(respuestas[4]?.json<{ codigo: string }>().codigo ?? "")
    }
    const fila = await leerClaseDb(clase.id)
    expect(fila?.nombre).toBe("Dueño 5")
    expect(fila?.maestroId).toBe(dueno.id)
    expect(fila?.codigoInvitacion).toBe(codigosDelDueno.at(-1))
  })
})

describe("ataque CLASES-a r3: código de invitación", () => {
  it("después de regenerar A, su código viejo no inscribe en A ni en ninguna otra clase", async () => {
    const dueno = await maestro()
    const alumno = await estudiante()
    const a = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const b = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const regen = await pedir(
      obtenerApp(),
      "POST",
      `/api/clases/${a.id}/codigo`,
      await tokenDe(dueno),
    )
    expect(regen.statusCode).toBe(200)
    expect(regen.json<{ codigo: string }>().codigo).not.toBe(a.codigoInvitacion)

    const viejo = await pedir(obtenerApp(), "POST", "/api/clases/unirse", await tokenDe(alumno), {
      codigo: a.codigoInvitacion,
    })
    expect(viejo.statusCode).toBe(404)
    expect(codigoDe(viejo)).toBe("CODIGO_INVALIDO")
    expect(await obtenerDb().inscripcion.count({ where: { usuarioId: alumno.id } })).toBe(0)

    const conB = await pedir(obtenerApp(), "POST", "/api/clases/unirse", await tokenDe(alumno), {
      codigo: b.codigoInvitacion,
    })
    expect(conB.statusCode).toBe(200)
    expect(conB.json<{ clase: { id: string } }>().clase.id).toBe(b.id)
  })

  it("un código de 40 caracteres con separadores que queda en 7 se acepta; con 41 se rechaza", async () => {
    const dueno = await maestro()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const letras = [...clase.codigoInvitacion.toLowerCase()]
    const separadores = [" ", "\t", "-", " ", " ", " ", "　", "‐", "‑"]
    let cuarenta = letras.map((l, i) => `${l}${separadores[i % separadores.length]}`).join("")
    cuarenta = cuarenta.padEnd(40, " ")
    expect(cuarenta).toHaveLength(40)

    const alumno = await estudiante()
    const token = await tokenDe(alumno)
    const ok = await pedir(obtenerApp(), "POST", "/api/clases/unirse", token, { codigo: cuarenta })
    expect(ok.statusCode, ok.body).toBe(200)
    expect(ok.json<{ clase: { id: string } }>().clase.id).toBe(clase.id)

    const otro = await estudiante()
    const largo = await pedir(obtenerApp(), "POST", "/api/clases/unirse", await tokenDe(otro), {
      codigo: `${cuarenta} `,
    })
    expect(largo.statusCode).toBe(400)
    expect(await obtenerDb().inscripcion.count({ where: { usuarioId: otro.id } })).toBe(0)
  })
})

describe("ataque CLASES-a r3: último recorrido de fugas y cabeceras", () => {
  // CLASES-02a ronda 0 (C-1, C-2 y C-3): POST /api/clases y PUT /api/clases/:claseId se cambian por
  // sus rutas del admin (el admin crea con el dueño en maestroIds), y el admin pasa el sexto paso en
  // el detalle y en /codigo (P-04 a): el código sale al dueño y al admin en /codigo, con no-store, y
  // a nadie más ni en ninguna otra ruta.
  it("dueño, estudiante, restringido y admin: ninguna respuesta lleva claves prohibidas; el código solo sale al dueño y al admin en /codigo, con no-store", async () => {
    const dueno = await maestro()
    const ajeno = await maestro()
    const alumno = await estudiante()
    const restringido = await estudiante({ accesoRestringido: true })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id, descripcion: "d" })
    await inscribirDePrueba(clase.id, alumno.id)
    await inscribirDePrueba(clase.id, restringido.id)
    const tokens = {
      dueno: await tokenDe(dueno),
      ajeno: await tokenDe(ajeno),
      alumno: await tokenDe(alumno),
      restringido: await tokenDe(restringido),
      admin: await tokenDe({ id: await idAdmin() }),
    }

    const rutas: { method: "GET" | "HEAD" | "POST" | "PUT"; url: string; payload?: unknown }[] = [
      {
        method: "POST",
        url: "/api/admin/clases",
        payload: { nombre: "Nueva", maestroIds: [dueno.id] },
      },
      { method: "GET", url: "/api/clases/inscritas" },
      { method: "GET", url: "/api/clases/impartidas" },
      { method: "POST", url: "/api/clases/unirse", payload: { codigo: clase.codigoInvitacion } },
      { method: "GET", url: `/api/clases/${clase.id}` },
      { method: "HEAD", url: `/api/clases/${clase.id}` },
      { method: "PUT", url: `/api/admin/clases/${clase.id}`, payload: { nombre: "Clase" } },
      { method: "GET", url: `/api/clases/${clase.id}/codigo` },
      { method: "HEAD", url: `/api/clases/${clase.id}/codigo` },
    ]
    const prohibidas = [
      "codigoInvitacion",
      "estadoPago",
      "accesoRestringido",
      "email",
      "hashContrasena",
    ]
    let respuestasDelDueno = 0

    for (const [quien, token] of Object.entries(tokens)) {
      for (const ruta of rutas) {
        const r = await pedir(obtenerApp(), ruta.method, ruta.url, token, ruta.payload)
        if (r.statusCode === 201) idsClases.push(r.json<{ clase: { id: string } }>().clase.id)
        const etiqueta = `${quien} ${ruta.method} ${ruta.url} → ${r.statusCode}`
        expect(r.statusCode, etiqueta).toBeLessThan(500)
        expect(clavesEn(r.body, prohibidas), etiqueta).toEqual([])
        const codigoActual = (await leerClaseDb(clase.id))?.codigoInvitacion ?? "precondición"
        const esCodigoDelDueno =
          (quien === "dueno" || quien === "admin") && ruta.url.endsWith("/codigo")
        if (esCodigoDelDueno) {
          respuestasDelDueno += 1
          expect(String(r.headers["cache-control"]), etiqueta).toContain("no-store")
        } else {
          expect(r.body, etiqueta).not.toContain(codigoActual)
        }
        const cabeceras = JSON.stringify(r.headers)
        expect(cabeceras, etiqueta).not.toContain(codigoActual)
      }
    }
    expect(respuestasDelDueno).toBe(4)
  })
})

describe("ataque CLASES-a r3: paginación con un cursor que ya no existe", () => {
  it("si el alumno deja la clase del cursor entre dos páginas, la siguiente no oculta en silencio las clases restantes", async () => {
    const dueno = await maestro()
    const alumno = await estudiante()
    const clases = []
    for (let i = 0; i < 4; i++) {
      const c = await crearClaseDePrueba(idsClases, { maestroId: dueno.id, nombre: `Pag ${i}` })
      await inscribirDePrueba(c.id, alumno.id)
      clases.push(c)
    }
    const token = await tokenDe(alumno)
    const p1 = await pedir(obtenerApp(), "GET", "/api/clases/inscritas?limite=2", token)
    const cuerpo1 = p1.json<{
      clases: { id: string }[]
      total: number
      siguienteCursor: string | null
    }>()
    expect(cuerpo1.clases).toHaveLength(2)
    const cursor = cuerpo1.siguienteCursor
    if (cursor === null) throw new Error("Precondición: la primera página debía traer cursor")

    // La baja de la clase del cursor (en CLASES-b la hará el maestro; aquí se simula en la base).
    await obtenerDb().inscripcion.delete({
      where: { claseId_usuarioId: { claseId: cursor, usuarioId: alumno.id } },
    })

    const p2 = await pedir(
      obtenerApp(),
      "GET",
      `/api/clases/inscritas?limite=2&cursor=${cursor}`,
      token,
    )
    expect([200, 400, 409], p2.body).toContain(p2.statusCode)
    if (p2.statusCode !== 200) {
      // Un error explícito también es aceptable: no es un vacío silencioso.
      expect(codigoDe(p2)).not.toBe("")
    }
    const vistos = new Set(cuerpo1.clases.map((c) => c.id))
    const restantes = clases.map((c) => c.id).filter((id) => !vistos.has(id))
    if (p2.statusCode === 200) {
      const cuerpo2 = p2.json<{ clases: { id: string }[] }>()
      expect(
        cuerpo2.clases.map((c) => c.id).sort(),
        `la página 2 respondió 200 con ${cuerpo2.clases.length} clases y ocultó ${restantes.length}`,
      ).toEqual(restantes.sort())
    }
  })
})
