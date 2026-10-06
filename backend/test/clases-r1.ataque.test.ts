import { randomUUID } from "node:crypto"

import { errorApiSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { crearClaseAdministrada, regenerarCodigo } from "../src/adapters/db/clases.js"
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

// Tester, CLASES-a, ronda 1. Ataques de integración contra el PostgreSQL desechable
// (Testcontainers). Ninguna prueba toca código de producción: todo por HTTP (inject) o llamando a
// los adaptadores con dobles de generador.

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

type Metodo = "GET" | "HEAD" | "POST" | "PUT"

const pedir = (
  method: Metodo,
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

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

// Recorre el JSON y devuelve las claves prohibidas que encuentre, con su ruta.
const clavesProhibidasEn = (cuerpo: string, prohibidas: readonly string[]): string[] => {
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

// CLASES-02a ronda 0 (C-1, C-2, §D-2A3): solo el admin crea y edita clases, por /api/admin/clases.
const tokenAdmin = async (): Promise<string> => tokenDe({ id: await idAdmin() })

// CLASES-02a ronda 0 (C-1, P-06): los maestros de una clase se leen de maestros_de_clase, en el
// orden de S-05; clases.maestro_id es solo de escritura doble.
const maestrosDeLaClase = async (claseId: string): Promise<string[]> => {
  const filas = await obtenerDb().$queryRaw<{ maestro_id: string }[]>`
    SELECT maestro_id::text AS maestro_id FROM maestros_de_clase
    WHERE clase_id = ${claseId}::uuid ORDER BY creado_en, maestro_id`
  return filas.map((fila) => fila.maestro_id)
}

const FORMA_CODIGO = /^[A-HJ-NP-Z2-9]{7}$/

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  await borrarClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

// CLASES-02a ronda 0 (C-1, C-2): POST /api/clases y PUT /api/clases/:claseId ya no existen; la
// misma normalización se exige a POST /api/admin/clases y PUT /api/admin/clases/:claseId.
describe("ataque CLASES-a r1: descripción con saltos de línea CRLF y CR (§D-C4, también en a)", () => {
  it("POST /admin/clases con CRLF y CR en la descripción responde 201 y guarda solo LF", async () => {
    const dueno = await maestro()
    const respuesta = await pedir("POST", "/api/admin/clases", await tokenAdmin(), {
      nombre: "Clase con saltos",
      descripcion: "línea 1\r\nlínea 2\rlínea 3",
      maestroIds: [dueno.id],
    })
    if (respuesta.statusCode === 201)
      idsClases.push(respuesta.json<{ clase: { id: string } }>().clase.id)

    expect(respuesta.statusCode, `respuesta: ${respuesta.body}`).toBe(201)
    const { clase } = respuesta.json<{ clase: { id: string; descripcion: string | null } }>()
    expect(clase.descripcion).toBe("línea 1\nlínea 2\nlínea 3")
    expect((await leerClaseDb(clase.id))?.descripcion).toBe("línea 1\nlínea 2\nlínea 3")
  })

  it("PUT /admin/clases/:claseId con CRLF en la descripción responde 200 y guarda solo LF", async () => {
    const dueno = await maestro()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const respuesta = await pedir("PUT", `/api/admin/clases/${clase.id}`, await tokenAdmin(), {
      nombre: "Clase editada",
      descripcion: "uno\r\ndos",
    })

    expect(respuesta.statusCode, `respuesta: ${respuesta.body}`).toBe(200)
    expect((await leerClaseDb(clase.id))?.descripcion).toBe("uno\ndos")
  })
})

describe("ataque CLASES-a r1: GET /clases/:claseId como maestro dueño y fugas en las respuestas del dueño", () => {
  // CLASES-02a ronda 0 (C-1, C-2): la clase la crea y la edita el admin con el dueño asignado; sus
  // respuestas (crear y editar) siguen sin ninguna clave prohibida ni el valor del código.
  it("el dueño recibe 200 y ninguna respuesta de sus rutas trae codigoInvitacion, estadoPago, accesoRestringido ni email", async () => {
    const dueno = await maestro()
    const alumno = await estudiante()
    const token = await tokenDe(dueno)
    const admin = await tokenAdmin()
    const creada = await pedir("POST", "/api/admin/clases", admin, {
      nombre: "Clase del dueño",
      descripcion: "algo",
      maestroIds: [dueno.id],
    })
    expect(creada.statusCode).toBe(201)
    const claseId = creada.json<{ clase: { id: string } }>().clase.id
    idsClases.push(claseId)
    await inscribirDePrueba(claseId, alumno.id)

    const detalle = await pedir("GET", `/api/clases/${claseId}`, token)
    expect(detalle.statusCode, detalle.body).toBe(200)

    const respuestas = [
      creada,
      detalle,
      await pedir("PUT", `/api/admin/clases/${claseId}`, admin, { nombre: "Clase del dueño 2" }),
      await pedir("GET", "/api/clases/impartidas", token),
    ]
    for (const r of respuestas) {
      expect(r.statusCode).toBeLessThan(300)
      expect(
        clavesProhibidasEn(r.body, [
          "codigoInvitacion",
          "codigo_invitacion",
          "estadoPago",
          "estado_pago",
          "accesoRestringido",
          "email",
          "hashContrasena",
        ]),
      ).toEqual([])
    }
    const codigoReal = (await leerClaseDb(claseId))?.codigoInvitacion
    expect(codigoReal).toMatch(FORMA_CODIGO)
    for (const r of respuestas) expect(r.body).not.toContain(String(codigoReal))
  })
})

describe("ataque CLASES-a r1: fugas hacia el estudiante (claves y valor del código)", () => {
  it("ninguna respuesta a un estudiante lleva el valor del código, estadoPago, accesoRestringido, email ni la clave codigo", async () => {
    const dueno = await maestro()
    const alumno = await estudiante()
    const companero = await crearUsuarioDePrueba(idsUsuarios, {
      rol: "estudiante",
      accesoRestringido: true,
    })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id, descripcion: "d" })
    await inscribirDePrueba(clase.id, companero.id)
    const token = await tokenDe(alumno)

    const respuestas = [
      await pedir("POST", "/api/clases/unirse", token, { codigo: clase.codigoInvitacion }),
      await pedir("POST", "/api/clases/unirse", token, { codigo: clase.codigoInvitacion }),
      await pedir("GET", `/api/clases/${clase.id}`, token),
      await pedir("GET", "/api/clases/inscritas", token),
      await pedir("GET", `/api/clases/${clase.id}/codigo`, token),
      await pedir("POST", `/api/clases/${clase.id}/codigo`, token),
      // CLASES-02a ronda 0 (C-2): la edición vive en la ruta del admin.
      await pedir("PUT", `/api/admin/clases/${clase.id}`, token, { nombre: "x x" }),
    ]
    expect(respuestas.slice(0, 4).map((r) => r.statusCode)).toEqual([200, 200, 200, 200])
    for (const r of respuestas) {
      expect(r.body, `${r.statusCode}`).not.toContain(clase.codigoInvitacion)
      // "$.error.codigo" es el código del error ({ error: { codigo, mensaje } }), no el de la clase.
      const fuera = clavesProhibidasEn(r.body, [
        "codigo",
        "codigoInvitacion",
        "estadoPago",
        "accesoRestringido",
        "email",
      ]).filter((ruta) => ruta !== "$.error.codigo")
      expect(fuera).toEqual([])
    }
  })
})

describe("ataque CLASES-a r1: HEAD de las rutas GET con :claseId y de /codigo", () => {
  it("HEAD sigue la misma cadena: 401 sin token, 403 ajeno o estudiante en /codigo, y nunca un cuerpo", async () => {
    const dueno = await maestro()
    const ajeno = await maestro()
    const alumno = await estudiante()
    const restringido = await crearUsuarioDePrueba(idsUsuarios, {
      rol: "estudiante",
      accesoRestringido: true,
    })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    await inscribirDePrueba(clase.id, alumno.id)
    await inscribirDePrueba(clase.id, restringido.id)
    const adminId = await idAdmin()

    const casos: {
      nombre: string
      url: string
      token?: string
      estado: number
      codigo?: string
    }[] = [
      { nombre: "detalle sin token", url: `/api/clases/${clase.id}`, estado: 401 },
      {
        nombre: "detalle maestro ajeno",
        url: `/api/clases/${clase.id}`,
        token: await tokenDe(ajeno),
        estado: 403,
        codigo: "SIN_ACCESO_A_LA_CLASE",
      },
      {
        nombre: "detalle restringido inscrito",
        url: `/api/clases/${clase.id}`,
        token: await tokenDe(restringido),
        estado: 403,
        codigo: "ACCESO_RESTRINGIDO",
      },
      // CLASES-02a ronda 0 (C-3): el admin pasa el sexto paso en el detalle (matriz de
      // "Autorización"); HEAD sigue sin cuerpo.
      {
        nombre: "detalle admin",
        url: `/api/clases/${clase.id}`,
        token: await tokenDe({ id: adminId }),
        estado: 200,
      },
      { nombre: "codigo sin token", url: `/api/clases/${clase.id}/codigo`, estado: 401 },
      {
        nombre: "codigo estudiante inscrito",
        url: `/api/clases/${clase.id}/codigo`,
        token: await tokenDe(alumno),
        estado: 403,
        codigo: "ROL_NO_PERMITIDO",
      },
      {
        nombre: "codigo maestro ajeno",
        url: `/api/clases/${clase.id}/codigo`,
        token: await tokenDe(ajeno),
        estado: 403,
        codigo: "SIN_ACCESO_A_LA_CLASE",
      },
      {
        nombre: "inscritas como maestro",
        url: "/api/clases/inscritas",
        token: await tokenDe(dueno),
        estado: 403,
      },
      {
        nombre: "impartidas como estudiante",
        url: "/api/clases/impartidas",
        token: await tokenDe(alumno),
        estado: 403,
      },
    ]

    for (const caso of casos) {
      const head = await pedir("HEAD", caso.url, caso.token)
      expect(head.statusCode, caso.nombre).toBe(caso.estado)
      expect(head.body, `${caso.nombre}: HEAD con cuerpo`).toBe("")
      // El GET equivalente responde lo mismo (la cadena de HEAD es la del GET).
      const get = await pedir("GET", caso.url, caso.token)
      expect(get.statusCode, `${caso.nombre} (GET)`).toBe(caso.estado)
      if (caso.codigo !== undefined) expect(codigoDe(get), caso.nombre).toBe(caso.codigo)
    }
  })

  it("HEAD /codigo como dueño: 200, Cache-Control no-store y sin cuerpo", async () => {
    const dueno = await maestro()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const head = await pedir("HEAD", `/api/clases/${clase.id}/codigo`, await tokenDe(dueno))

    expect(head.statusCode).toBe(200)
    expect(String(head.headers["cache-control"])).toContain("no-store")
    expect(head.body).toBe("")
    expect(head.body).not.toContain(clase.codigoInvitacion)
  })
})

describe("ataque CLASES-a r1: paginación de inscritas e impartidas", () => {
  it("limite 0, 101, negativo, decimal, vacío, no numérico o repetido responde 400 VALIDACION, nunca 500", async () => {
    const dueno = await maestro()
    const alumno = await estudiante()
    const tokens = { impartidas: await tokenDe(dueno), inscritas: await tokenDe(alumno) }
    const valores = ["0", "101", "-1", "1.5", "", "abc", "Infinity", "1e3", "10&limite=20"]
    for (const [ruta, token] of Object.entries(tokens)) {
      for (const valor of valores) {
        const r = await pedir("GET", `/api/clases/${ruta}?limite=${valor}`, token)
        expect(r.statusCode, `${ruta} limite=${valor}: ${r.body}`).toBe(400)
        expect(codigoDe(r)).toBe("VALIDACION")
      }
      const cursorMalo = await pedir(
        "GET",
        `/api/clases/${ruta}?cursor=${encodeURIComponent("' OR 1=1 --")}`,
        token,
      )
      expect(cursorMalo.statusCode, `${ruta} cursor inyectado`).toBe(400)
    }
  })

  it("un limite igual al número de filas da siguienteCursor null, y el cursor recorre sin repetir", async () => {
    const dueno = await maestro()
    const alumno = await estudiante()
    const clases = []
    for (let i = 0; i < 3; i++) {
      const c = await crearClaseDePrueba(idsClases, { maestroId: dueno.id, nombre: `P${i}` })
      await inscribirDePrueba(c.id, alumno.id)
      clases.push(c)
    }
    const tokenM = await tokenDe(dueno)
    const tokenE = await tokenDe(alumno)

    for (const [ruta, token] of [
      ["impartidas", tokenM],
      ["inscritas", tokenE],
    ] as const) {
      const exacta = await pedir("GET", `/api/clases/${ruta}?limite=3`, token)
      expect(exacta.statusCode).toBe(200)
      const cuerpo = exacta.json<{
        clases: { id: string }[]
        total: number
        siguienteCursor: string | null
      }>()
      expect(cuerpo.clases).toHaveLength(3)
      expect(cuerpo.total).toBe(3)
      expect(cuerpo.siguienteCursor, `${ruta}: limite = filas`).toBeNull()

      const p1 = (await pedir("GET", `/api/clases/${ruta}?limite=2`, token)).json<{
        clases: { id: string }[]
        siguienteCursor: string | null
      }>()
      expect(p1.siguienteCursor).not.toBeNull()
      const p2 = (
        await pedir(
          "GET",
          `/api/clases/${ruta}?limite=2&cursor=${String(p1.siguienteCursor)}`,
          token,
        )
      ).json<{ clases: { id: string }[]; siguienteCursor: string | null }>()
      expect(p2.siguienteCursor).toBeNull()
      const vistos = [...p1.clases, ...p2.clases].map((c) => c.id)
      expect(new Set(vistos).size).toBe(3)
      expect(new Set(vistos)).toEqual(new Set(clases.map((c) => c.id)))
    }
  })

  it("un cursor de una clase ajena no devuelve nada de la clase ajena ni de su dueño", async () => {
    const dueno = await maestro()
    const otro = await maestro()
    const alumno = await estudiante()
    const otroAlumno = await estudiante()
    const propia = await crearClaseDePrueba(idsClases, { maestroId: dueno.id, nombre: "Propia" })
    await inscribirDePrueba(propia.id, alumno.id)
    const ajena = await crearClaseDePrueba(idsClases, {
      maestroId: otro.id,
      nombre: "Ajena secreta",
    })
    await inscribirDePrueba(ajena.id, otroAlumno.id)

    const impartidas = await pedir(
      "GET",
      `/api/clases/impartidas?cursor=${ajena.id}`,
      await tokenDe(dueno),
    )
    const inscritas = await pedir(
      "GET",
      `/api/clases/inscritas?cursor=${ajena.id}`,
      await tokenDe(alumno),
    )
    for (const r of [impartidas, inscritas]) {
      expect([200, 400], r.body).toContain(r.statusCode)
      expect(r.body).not.toContain(ajena.id)
      expect(r.body).not.toContain("Ajena secreta")
      expect(r.body).not.toContain(otro.id)
    }
  })
})

// CLASES-02a ronda 0 (C-1, C-2): los mismos campos extra contra las rutas del admin. Los maestros
// solo salen de maestroIds (al crear) y nunca de maestroId ni maestro_id; editar no los cambia.
describe("ataque CLASES-a r1: campos extra del cuerpo no llegan a la base", () => {
  it("POST /admin/clases ignora maestroId, codigoInvitacion, activa, id y creadoEn", async () => {
    const dueno = await maestro()
    const otro = await maestro()
    const idForzado = randomUUID()
    const r = await pedir("POST", "/api/admin/clases", await tokenAdmin(), {
      nombre: "Clase con extras",
      maestroIds: [dueno.id],
      maestroId: otro.id,
      maestro_id: otro.id,
      codigoInvitacion: "HJKLMNP",
      codigo_invitacion: "HJKLMNP",
      activa: false,
      id: idForzado,
      creadoEn: "2000-01-01T00:00:00.000Z",
    })
    expect(r.statusCode, r.body).toBe(201)
    const claseId = r.json<{ clase: { id: string } }>().clase.id
    idsClases.push(claseId)
    const fila = await leerClaseDb(claseId)

    expect(claseId).not.toBe(idForzado)
    expect(fila?.maestroId).toBe(dueno.id)
    expect(await maestrosDeLaClase(claseId)).toEqual([dueno.id])
    expect(fila?.codigoInvitacion).not.toBe("HJKLMNP")
    expect(fila?.activa).toBe(true)
    expect(fila?.creadoEn.getUTCFullYear()).not.toBe(2000)
  })

  it("PUT /admin/clases/:claseId ignora maestroId, maestroIds, codigoInvitacion, activa e id", async () => {
    const dueno = await maestro()
    const otro = await maestro()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const r = await pedir("PUT", `/api/admin/clases/${clase.id}`, await tokenAdmin(), {
      nombre: "Nombre nuevo",
      maestroId: otro.id,
      maestroIds: [otro.id],
      codigoInvitacion: "HJKLMNP",
      activa: false,
      id: randomUUID(),
    })
    expect(r.statusCode, r.body).toBe(200)
    const fila = await leerClaseDb(clase.id)
    expect(fila?.maestroId).toBe(dueno.id)
    expect(await maestrosDeLaClase(clase.id)).toEqual([dueno.id])
    expect(fila?.codigoInvitacion).toBe(clase.codigoInvitacion)
    expect(fila?.activa).toBe(true)
    expect(fila?.nombre).toBe("Nombre nuevo")
  })
})

describe("ataque CLASES-a r1: pertenencia con claseId manipulado", () => {
  it("inscrito en A no ve B; el mismo UUID en mayúsculas da la misma respuesta; formatos raros dan 400", async () => {
    const dueno = await maestro()
    const alumno = await estudiante()
    const a = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const b = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    await inscribirDePrueba(a.id, alumno.id)
    const token = await tokenDe(alumno)

    const ajena = await pedir("GET", `/api/clases/${b.id}`, token)
    expect(ajena.statusCode).toBe(403)
    expect(codigoDe(ajena)).toBe("SIN_ACCESO_A_LA_CLASE")

    const mayusB = await pedir("GET", `/api/clases/${b.id.toUpperCase()}`, token)
    expect(mayusB.statusCode).toBe(403)
    expect(codigoDe(mayusB)).toBe("SIN_ACCESO_A_LA_CLASE")

    const mayusA = await pedir("GET", `/api/clases/${a.id.toUpperCase()}`, token)
    expect(mayusA.statusCode).toBe(200)

    const sinGuiones = b.id.replaceAll("-", "")
    for (const variante of [
      `%20${b.id}`,
      `${b.id}%20`,
      `${b.id}%00`,
      `%7B${b.id}%7D`,
      sinGuiones,
      `${b.id}'--`,
      "00000000-0000-0000-0000-000000000000",
    ]) {
      const r = await pedir("GET", `/api/clases/${variante}`, token)
      expect([400, 403, 404], `${variante}: ${r.statusCode}`).toContain(r.statusCode)
      expect(r.body).not.toContain(b.codigoInvitacion)
    }
  })

  it("un maestro no regenera ni edita la clase de otro maestro, ni con el UUID en mayúsculas", async () => {
    const dueno = await maestro()
    const ajeno = await maestro()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id, nombre: "Original" })
    const token = await tokenDe(ajeno)
    for (const id of [clase.id, clase.id.toUpperCase()]) {
      const regen = await pedir("POST", `/api/clases/${id}/codigo`, token)
      const ver = await pedir("GET", `/api/clases/${id}/codigo`, token)
      for (const r of [regen, ver]) {
        expect(r.statusCode).toBe(403)
        expect(codigoDe(r)).toBe("SIN_ACCESO_A_LA_CLASE")
      }
      // CLASES-02a ronda 0 (C-2): editar es del admin; un maestro (ajeno o no) se queda en el
      // paso 5 de la ruta nueva.
      const put = await pedir("PUT", `/api/admin/clases/${id}`, token, { nombre: "Robada" })
      expect(put.statusCode).toBe(403)
      expect(codigoDe(put)).toBe("ROL_NO_PERMITIDO")
    }
    const fila = await leerClaseDb(clase.id)
    expect(fila?.codigoInvitacion).toBe(clase.codigoInvitacion)
    expect(fila?.nombre).toBe("Original")
  })
})

describe("ataque CLASES-a r1: concurrencia al unirse", () => {
  it("cinco POST /clases/unirse simultáneos del mismo alumno dejan una sola fila y un solo yaEstabas: false", async () => {
    const dueno = await maestro()
    const alumno = await estudiante()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const token = await tokenDe(alumno)

    const respuestas = await Promise.all(
      Array.from({ length: 5 }, () =>
        pedir("POST", "/api/clases/unirse", token, { codigo: clase.codigoInvitacion }),
      ),
    )
    expect(respuestas.map((r) => r.statusCode)).toEqual([200, 200, 200, 200, 200])
    const nuevas = respuestas.filter((r) => !r.json<{ yaEstabas: boolean }>().yaEstabas)
    expect(nuevas).toHaveLength(1)
    expect(
      await obtenerDb().inscripcion.count({ where: { claseId: clase.id, usuarioId: alumno.id } }),
    ).toBe(1)
  })

  it("unirse y regenerar a la vez nunca inscriben en una clase distinta de la del código buscado", async () => {
    const dueno = await maestro()
    const tokenDueno = await tokenDe(dueno)
    for (let i = 0; i < 8; i++) {
      const alumno = await estudiante()
      const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
      const [unirse, regenerar] = await Promise.all([
        pedir("POST", "/api/clases/unirse", await tokenDe(alumno), {
          codigo: clase.codigoInvitacion,
        }),
        pedir("POST", `/api/clases/${clase.id}/codigo`, tokenDueno),
      ])
      expect(regenerar.statusCode).toBe(200)
      expect([200, 404]).toContain(unirse.statusCode)
      if (unirse.statusCode === 200) {
        expect(unirse.json<{ clase: { id: string } }>().clase.id).toBe(clase.id)
      }
      const inscripciones = await obtenerDb().inscripcion.findMany({
        where: { usuarioId: alumno.id },
        select: { claseId: true },
      })
      expect(inscripciones.every((fila) => fila.claseId === clase.id)).toBe(true)
      expect(inscripciones).toHaveLength(unirse.statusCode === 200 ? 1 : 0)
    }
  })
})

// CLASES-02a ronda 0 (C-1, A-5): crearClase se retira; crearClaseAdministrada valida los maestros
// con una lectura antes del create (§D-2A4, punto 5). Lo que se protege no cambia: un maestro
// inexistente no se reintenta, no se disfraza de CODIGO_NO_DISPONIBLE y no deja fila; un texto
// que PostgreSQL rechaza sale como 400 sin reintento.
describe("ataque CLASES-a r1: reintento del código de invitación (adaptador)", () => {
  it("un maestro inexistente devuelve null sin pedir código, sin reintento, sin CODIGO_NO_DISPONIBLE y sin fila", async () => {
    let llamadas = 0
    const generar = () => {
      llamadas += 1
      return codigoDePrueba()
    }
    const maestroFantasma = randomUUID()
    const resultado = await crearClaseAdministrada(
      { maestroIds: [maestroFantasma], nombre: "Fantasma" },
      generar,
    ).then(
      (valor) => ({ valor, error: null }),
      (e: unknown) => ({ valor: undefined, error: e }),
    )

    expect(
      resultado.error,
      "crearClaseAdministrada con un maestro inexistente lanzó en vez de devolver null",
    ).toBeNull()
    expect(resultado.valor).toBeNull()
    expect(llamadas).toBe(0)
    expect(await obtenerDb().clase.count({ where: { maestroId: maestroFantasma } })).toBe(0)
  })

  it("un texto que PostgreSQL rechaza (22021) sale como 400 VALIDACION, sin reintento ni fila", async () => {
    const dueno = await maestro()
    let llamadas = 0
    const generar = () => {
      llamadas += 1
      return codigoDePrueba()
    }
    const error = await crearClaseAdministrada(
      { maestroIds: [dueno.id], nombre: "Nulo\u0000aquí" },
      generar,
    ).then(
      () => null,
      (e: unknown) => e,
    )

    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).codigo).toBe("VALIDACION")
    expect((error as AppError).estado).toBe(400)
    expect(llamadas).toBe(1)
    expect(await obtenerDb().clase.count({ where: { maestroId: dueno.id } })).toBe(0)
    expect(
      await obtenerDb().$queryRaw<{ n: number }[]>`
        SELECT count(*)::int AS n FROM maestros_de_clase WHERE maestro_id = ${dueno.id}::uuid`,
    ).toEqual([{ n: 0 }])
  })

  it("regenerarCodigo: si los dos intentos chocan, 500 CODIGO_NO_DISPONIBLE y el código no cambia; si solo choca el primero, usa el segundo", async () => {
    const dueno = await maestro()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const ocupada = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })

    // CLASES-02a ronda 0 (C-3, §D-2A6 y A-10): regenerarCodigo(claseId, generarCodigo) deja de
    // filtrar por maestro_id; el reintento que se protege es el mismo.
    const error = await regenerarCodigo(clase.id, () => ocupada.codigoInvitacion).then(
      () => null,
      (e: unknown) => e,
    )
    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).codigo).toBe("CODIGO_NO_DISPONIBLE")
    expect((error as AppError).estado).toBe(500)
    expect((await leerClaseDb(clase.id))?.codigoInvitacion).toBe(clase.codigoInvitacion)

    const libre = codigoDePrueba()
    const codigos = [ocupada.codigoInvitacion, libre]
    const nuevo = await regenerarCodigo(clase.id, () => {
      const siguiente = codigos.shift()
      if (siguiente === undefined) throw new Error("se pidió un tercer código")
      return siguiente
    })
    expect(nuevo).toBe(libre)
    expect((await leerClaseDb(clase.id))?.codigoInvitacion).toBe(libre)
  })
})

// CLASES-02a ronda 0 (C-1): las 1,000 las crea el admin con el mismo maestro; los códigos se leen
// por maestros_de_clase (cada clase con su asignación).
describe("ataque CLASES-a r1: 1,000 creaciones seguidas", () => {
  it(
    "1,000 POST /admin/clases dan 1,000 códigos distintos, todos del alfabeto sin confusables",
    { timeout: 180_000 },
    async () => {
      const dueno = await maestro()
      const token = await tokenAdmin()
      const codigos: string[] = []
      for (let lote = 0; lote < 40; lote++) {
        const respuestas = await Promise.all(
          Array.from({ length: 25 }, (_, i) =>
            pedir("POST", "/api/admin/clases", token, {
              nombre: `Masiva ${lote}-${i}`,
              maestroIds: [dueno.id],
            }),
          ),
        )
        for (const r of respuestas) {
          expect(r.statusCode, r.body).toBe(201)
          idsClases.push(r.json<{ clase: { id: string } }>().clase.id)
        }
      }
      const filas = await obtenerDb().$queryRaw<{ codigo_invitacion: string }[]>`
        SELECT c.codigo_invitacion FROM clases c
        JOIN maestros_de_clase m ON m.clase_id = c.id
        WHERE m.maestro_id = ${dueno.id}::uuid`
      for (const fila of filas) codigos.push(fila.codigo_invitacion)

      expect(codigos).toHaveLength(1000)
      expect(new Set(codigos).size).toBe(1000)
      for (const codigo of codigos) expect(codigo).toMatch(FORMA_CODIGO)
    },
  )
})
