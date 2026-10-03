import {
  ALFABETO_CODIGO_CLASE,
  claseDetalleSchema,
  claseImpartidaSchema,
  claseInscritaSchema,
  codigoClaseRespuestaSchema,
  errorApiSchema,
  unirseRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { crearClaseAdministrada } from "../src/adapters/db/clases.js"
import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarClasesDePrueba,
  codigoDePrueba,
  contarInscripciones,
  crearClaseDePrueba,
  inscribirDePrueba,
  leerClaseDb,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const maestroDePrueba = (): Promise<UsuarioDePrueba> =>
  crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
const estudianteDePrueba = (): Promise<UsuarioDePrueba> => crearUsuarioDePrueba(idsUsuarios)

const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

const peticion = async (opciones: {
  method: "GET" | "POST" | "PUT"
  url: string
  token?: string
  payload?: InjectOptions["payload"]
}): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method: opciones.method,
    url: opciones.url,
    ...(opciones.payload === undefined ? {} : { payload: opciones.payload }),
    headers: opciones.token === undefined ? {} : { authorization: `Bearer ${opciones.token}` },
  })

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  await borrarClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

// CLASES-02a (C-1): POST /api/clases ya no existe; las clases las crea el administrador con
// POST /api/admin/clases y maestroIds. Cada caso conserva lo que protegía.
describe("POST /api/admin/clases (antes POST /api/clases)", () => {
  it("PR-A08a: crear responde 201 con un código de 7 caracteres del alfabeto", async () => {
    const maestro = await maestroDePrueba()
    const respuesta = await peticion({
      method: "POST",
      url: "/api/admin/clases",
      token: await tokenDelAdminDePrueba(),
      payload: { nombre: "Álgebra I", maestroIds: [maestro.id] },
    })

    expect(respuesta.statusCode).toBe(201)
    const { clase } = respuesta.json<{ clase: { id: string } }>()
    idsClases.push(clase.id)
    claseDetalleSchema.parse(clase)
    const fila = await leerClaseDb(clase.id)
    expect(fila?.codigoInvitacion).toHaveLength(7)
    for (const caracter of fila?.codigoInvitacion ?? "") {
      expect(ALFABETO_CODIGO_CLASE).toContain(caracter)
    }
  })

  it("PR-A08b: el maestro es el de maestroIds aunque el cuerpo traiga otro maestroId suelto", async () => {
    const maestro = await maestroDePrueba()
    const otro = await maestroDePrueba()
    const respuesta = await peticion({
      method: "POST",
      url: "/api/admin/clases",
      token: await tokenDelAdminDePrueba(),
      payload: { nombre: "Historia", maestroIds: [maestro.id], maestroId: otro.id },
    })

    const { clase } = respuesta.json<{ clase: { id: string; maestro: { id: string } } }>()
    idsClases.push(clase.id)
    expect(clase.maestro.id).toBe(maestro.id)
  })

  it("PR-A08c: una descripción vacía se guarda como null", async () => {
    const maestro = await maestroDePrueba()
    const respuesta = await peticion({
      method: "POST",
      url: "/api/admin/clases",
      token: await tokenDelAdminDePrueba(),
      payload: { nombre: "Geografía", descripcion: "   ", maestroIds: [maestro.id] },
    })

    const { clase } = respuesta.json<{ clase: { id: string; descripcion: string | null } }>()
    idsClases.push(clase.id)
    expect(clase.descripcion).toBeNull()
  })

  it("PR-A08d: un nombre con U+202E responde 400", async () => {
    const maestro = await maestroDePrueba()
    const respuesta = await peticion({
      method: "POST",
      url: "/api/admin/clases",
      token: await tokenDelAdminDePrueba(),
      payload: { nombre: "Clase\u202Emala", maestroIds: [maestro.id] },
    })

    expect(respuesta.statusCode).toBe(400)
    expect(errorApiSchema.parse(respuesta.json()).error.codigo).toBe("VALIDACION")
  })

  it("PR-A08e: un nombre con separador de línea (U+2028) o de párrafo (U+2029) responde 400 (ronda 2 del tester, T-16)", async () => {
    const maestro = await maestroDePrueba()
    const token = await tokenDelAdminDePrueba()
    // String.fromCharCode en vez del carácter literal: U+2028 y U+2029 son terminadores de línea
    // del propio ECMAScript y no pueden ir sueltos dentro de un literal de cadena del código fuente.
    for (const separador of [String.fromCharCode(0x2028), String.fromCharCode(0x2029)]) {
      const respuesta = await peticion({
        method: "POST",
        url: "/api/admin/clases",
        token,
        payload: { nombre: `Clase${separador}Dos`, maestroIds: [maestro.id] },
      })
      expect(respuesta.statusCode, separador.codePointAt(0)?.toString(16)).toBe(400)
      expect(errorApiSchema.parse(respuesta.json()).error.codigo).toBe("VALIDACION")
    }
  })
})

describe("crearClaseAdministrada: reintento de código (PR-A09; C-1, A-5)", () => {
  it("PR-A09a: con un generador doble cuyo primer código choca, se crea con el segundo", async () => {
    const maestro = await maestroDePrueba()
    const existente = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    let llamadas = 0
    const generador = (): string => {
      llamadas += 1
      return llamadas === 1 ? existente.codigoInvitacion : codigoDePrueba()
    }

    const clase = await crearClaseAdministrada(
      { maestroIds: [maestro.id], nombre: "Con reintento" },
      generador,
    )
    if (clase === null) throw new Error("Se esperaba una clase creada")
    idsClases.push(clase.id)

    expect(llamadas).toBe(2)
    expect(clase.id).not.toBe(existente.id)
  })

  it("PR-A09b: si los dos chocan, 500 CODIGO_NO_DISPONIBLE y ninguna fila nueva", async () => {
    const maestro = await maestroDePrueba()
    const existente = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const antes = await obtenerDb().clase.count({ where: { maestroId: maestro.id } })

    await expect(
      crearClaseAdministrada(
        { maestroIds: [maestro.id], nombre: "Choca dos veces" },
        () => existente.codigoInvitacion,
      ),
    ).rejects.toMatchObject({ codigo: "CODIGO_NO_DISPONIBLE", estado: 500 })

    const despues = await obtenerDb().clase.count({ where: { maestroId: maestro.id } })
    expect(despues).toBe(antes)
  })
})

// CLASES-02a (C-2): PUT /api/clases/:claseId ya no existe; la edición es del administrador.
describe("PUT /api/admin/clases/:claseId (antes PUT /api/clases/:claseId)", () => {
  it("PR-A10a: editar como administrador responde 200 con los datos nuevos", async () => {
    const maestro = await maestroDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id, nombre: "Vieja" })

    const respuesta = await peticion({
      method: "PUT",
      url: `/api/admin/clases/${clase.id}`,
      token: await tokenDelAdminDePrueba(),
      payload: { nombre: "Nueva", descripcion: "Actualizada" },
    })

    expect(respuesta.statusCode).toBe(200)
    const { clase: actualizada } = respuesta.json<{
      clase: { nombre: string; descripcion: string }
    }>()
    expect(actualizada.nombre).toBe("Nueva")
    expect(actualizada.descripcion).toBe("Actualizada")
  })

  it("PR-A10b: un cuerpo inválido responde 400 sin cambios", async () => {
    const maestro = await maestroDePrueba()
    const clase = await crearClaseDePrueba(idsClases, {
      maestroId: maestro.id,
      nombre: "Sin tocar",
    })

    const respuesta = await peticion({
      method: "PUT",
      url: `/api/admin/clases/${clase.id}`,
      token: await tokenDelAdminDePrueba(),
      payload: { nombre: "" },
    })

    expect(respuesta.statusCode).toBe(400)
    const fila = await leerClaseDb(clase.id)
    expect(fila?.nombre).toBe("Sin tocar")
  })
})

describe("GET/POST /api/clases/:claseId/codigo", () => {
  it("PR-A11a: el dueño ve el código, con no-store", async () => {
    const maestro = await maestroDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })

    const respuesta = await peticion({
      method: "GET",
      url: `/api/clases/${clase.id}/codigo`,
      token: await tokenDe(maestro),
    })

    expect(respuesta.statusCode).toBe(200)
    expect(respuesta.headers["cache-control"]).toBe("no-store")
    expect(codigoClaseRespuestaSchema.parse(respuesta.json()).codigo).toBe(clase.codigoInvitacion)
  })

  it("PR-A11b: regenerar cambia el código, y el viejo responde 404 CODIGO_INVALIDO al unirse", async () => {
    const maestro = await maestroDePrueba()
    const estudiante = await estudianteDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const codigoViejo = clase.codigoInvitacion

    const regenerada = await peticion({
      method: "POST",
      url: `/api/clases/${clase.id}/codigo`,
      token: await tokenDe(maestro),
    })
    expect(regenerada.statusCode).toBe(200)
    const nuevo = codigoClaseRespuestaSchema.parse(regenerada.json()).codigo
    expect(nuevo).not.toBe(codigoViejo)

    const unirse = await peticion({
      method: "POST",
      url: "/api/clases/unirse",
      token: await tokenDe(estudiante),
      payload: { codigo: codigoViejo },
    })
    expect(unirse.statusCode).toBe(404)
    expect(errorApiSchema.parse(unirse.json()).error.codigo).toBe("CODIGO_INVALIDO")
  })

  it("PR-A11c: después de regenerar, los inscritos siguen inscritos", async () => {
    const maestro = await maestroDePrueba()
    const estudiante = await estudianteDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, estudiante.id, "codigo")

    await peticion({
      method: "POST",
      url: `/api/clases/${clase.id}/codigo`,
      token: await tokenDe(maestro),
    })

    expect(await contarInscripciones(clase.id)).toBe(1)
  })
})

describe("POST /api/clases/unirse", () => {
  it("PR-A12a: unirse con el código en minúsculas y con espacios → 200, yaEstabas: false, origen 'codigo'", async () => {
    const maestro = await maestroDePrueba()
    const estudiante = await estudianteDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const codigoConEspacios = ` ${clase.codigoInvitacion.slice(0, 3).toLowerCase()}-${clase.codigoInvitacion.slice(3).toLowerCase()} `

    const respuesta = await peticion({
      method: "POST",
      url: "/api/clases/unirse",
      token: await tokenDe(estudiante),
      payload: { codigo: codigoConEspacios },
    })

    expect(respuesta.statusCode).toBe(200)
    const cuerpo = unirseRespuestaSchema.parse(respuesta.json())
    expect(cuerpo.yaEstabas).toBe(false)
    const inscripcion = await obtenerDb().inscripcion.findUnique({
      where: { claseId_usuarioId: { claseId: clase.id, usuarioId: estudiante.id } },
    })
    expect(inscripcion?.origen).toBe("codigo")
  })

  it("PR-A12b: la segunda vez → 200, yaEstabas: true, una sola fila", async () => {
    const maestro = await maestroDePrueba()
    const estudiante = await estudianteDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })

    await peticion({
      method: "POST",
      url: "/api/clases/unirse",
      token: await tokenDe(estudiante),
      payload: { codigo: clase.codigoInvitacion },
    })
    const segunda = await peticion({
      method: "POST",
      url: "/api/clases/unirse",
      token: await tokenDe(estudiante),
      payload: { codigo: clase.codigoInvitacion },
    })

    expect(segunda.statusCode).toBe(200)
    expect(unirseRespuestaSchema.parse(segunda.json()).yaEstabas).toBe(true)
    expect(await contarInscripciones(clase.id)).toBe(1)
  })

  it("PR-A12c: un código inexistente → 404 sin escribir", async () => {
    const estudiante = await estudianteDePrueba()
    const antes = await obtenerDb().inscripcion.count({ where: { usuarioId: estudiante.id } })

    const respuesta = await peticion({
      method: "POST",
      url: "/api/clases/unirse",
      token: await tokenDe(estudiante),
      payload: { codigo: "ZZZZZZZ" },
    })

    expect(respuesta.statusCode).toBe(404)
    expect(errorApiSchema.parse(respuesta.json()).error.codigo).toBe("CODIGO_INVALIDO")
    expect(await obtenerDb().inscripcion.count({ where: { usuarioId: estudiante.id } })).toBe(antes)
  })
})

describe("GET /api/clases/inscritas e /impartidas", () => {
  it("PR-A13a: inscritas devuelve solo las del alumno, en orden, en 3 páginas con cursor y con total", async () => {
    const maestro = await maestroDePrueba()
    const estudiante = await estudianteDePrueba()
    const otroEstudiante = await estudianteDePrueba()
    const clases = []
    for (let i = 0; i < 3; i += 1) {
      const clase = await crearClaseDePrueba(idsClases, {
        maestroId: maestro.id,
        nombre: `Clase ${i}`,
      })
      clases.push(clase)
      await inscribirDePrueba(clase.id, estudiante.id, "codigo")
    }
    const ajena = await crearClaseDePrueba(idsClases, { maestroId: maestro.id, nombre: "Ajena" })
    await inscribirDePrueba(ajena.id, otroEstudiante.id, "codigo")

    const token = await tokenDe(estudiante)
    const ids: string[] = []
    let cursor: string | undefined
    let total = 0
    for (let pagina = 0; pagina < 3; pagina += 1) {
      const url = cursor
        ? `/api/clases/inscritas?limite=1&cursor=${cursor}`
        : "/api/clases/inscritas?limite=1"
      const respuesta = await peticion({ method: "GET", url, token })
      expect(respuesta.statusCode).toBe(200)
      const cuerpo = respuesta.json<{
        clases: { id: string }[]
        total: number
        siguienteCursor: string | null
      }>()
      for (const item of cuerpo.clases) claseInscritaSchema.parse(item)
      total = cuerpo.total
      ids.push(...cuerpo.clases.map((c) => c.id))
      cursor = cuerpo.siguienteCursor ?? undefined
      if (!cuerpo.siguienteCursor) break
    }

    expect(total).toBe(3)
    expect(ids).toHaveLength(3)
    expect(new Set(ids)).toEqual(new Set(clases.map((c) => c.id)))
    expect(ids).not.toContain(ajena.id)
  })

  it("PR-A13b: impartidas devuelve solo las del maestro, con el conteo de alumnos activos", async () => {
    const maestro = await maestroDePrueba()
    const otroMaestro = await maestroDePrueba()
    const activo = await estudianteDePrueba()
    const inactivo = await crearUsuarioDePrueba(idsUsuarios, { activo: false })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, activo.id, "codigo")
    await inscribirDePrueba(clase.id, inactivo.id, "codigo")
    const ajena = await crearClaseDePrueba(idsClases, { maestroId: otroMaestro.id })

    const respuesta = await peticion({
      method: "GET",
      url: "/api/clases/impartidas",
      token: await tokenDe(maestro),
    })

    expect(respuesta.statusCode).toBe(200)
    const cuerpo = respuesta.json<{ clases: { id: string; alumnos: number }[] }>()
    claseImpartidaSchema.parse(cuerpo.clases[0])
    const propia = cuerpo.clases.find((c) => c.id === clase.id)
    expect(propia?.alumnos).toBe(1)
    expect(cuerpo.clases.some((c) => c.id === ajena.id)).toBe(false)
  })

  it("PR-A13c: inscritas con un cursor que ya no es una inscripción del alumno responde 400 VALIDACION (T-18, ronda 3 del tester)", async () => {
    const alumno = await estudianteDePrueba()
    const ajena = await crearClaseDePrueba(idsClases, { maestroId: (await maestroDePrueba()).id })

    const respuesta = await peticion({
      method: "GET",
      url: `/api/clases/inscritas?limite=1&cursor=${ajena.id}`,
      token: await tokenDe(alumno),
    })

    expect(respuesta.statusCode, respuesta.body).toBe(400)
    const error = errorApiSchema.parse(respuesta.json()).error
    expect(error.codigo).toBe("VALIDACION")
    expect(error.mensaje).toBe("cursor: no es válido")
  })

  it("PR-A13d: impartidas con un cursor que es una clase de otro maestro responde 400 VALIDACION (T-18, ronda 3 del tester)", async () => {
    const maestro = await maestroDePrueba()
    const ajena = await crearClaseDePrueba(idsClases, { maestroId: (await maestroDePrueba()).id })

    const respuesta = await peticion({
      method: "GET",
      url: `/api/clases/impartidas?limite=1&cursor=${ajena.id}`,
      token: await tokenDe(maestro),
    })

    expect(respuesta.statusCode, respuesta.body).toBe(400)
    const error = errorApiSchema.parse(respuesta.json()).error
    expect(error.codigo).toBe("VALIDACION")
    expect(error.mensaje).toBe("cursor: no es válido")
  })
})

describe("GET /api/clases/:claseId", () => {
  it("PR-A14a: el detalle responde 200 al miembro, sin codigoInvitacion", async () => {
    const maestro = await maestroDePrueba()
    const estudiante = await estudianteDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, estudiante.id, "codigo")

    const respuesta = await peticion({
      method: "GET",
      url: `/api/clases/${clase.id}`,
      token: await tokenDe(estudiante),
    })

    expect(respuesta.statusCode).toBe(200)
    const cuerpo = respuesta.json<{ clase: Record<string, unknown> }>()
    expect(Object.keys(cuerpo.clase)).not.toContain("codigoInvitacion")
    expect(JSON.stringify(cuerpo)).not.toContain(clase.codigoInvitacion)
  })

  it("PR-A14b: un claseId inexistente y uno ajeno reciben el mismo 403 (código y mensaje)", async () => {
    const maestro = await maestroDePrueba()
    const otroMaestro = await maestroDePrueba()
    const ajena = await crearClaseDePrueba(idsClases, { maestroId: otroMaestro.id })
    const inexistente = "00000000-0000-4000-8000-000000000000"

    const respuestaAjena = await peticion({
      method: "GET",
      url: `/api/clases/${ajena.id}`,
      token: await tokenDe(maestro),
    })
    const respuestaInexistente = await peticion({
      method: "GET",
      url: `/api/clases/${inexistente}`,
      token: await tokenDe(maestro),
    })

    expect(respuestaAjena.statusCode).toBe(403)
    expect(respuestaInexistente.statusCode).toBe(403)
    const errorAjena = errorApiSchema.parse(respuestaAjena.json()).error
    const errorInexistente = errorApiSchema.parse(respuestaInexistente.json()).error
    expect(errorAjena).toEqual(errorInexistente)
    expect(errorAjena.codigo).toBe("SIN_ACCESO_A_LA_CLASE")
  })
})

describe("contenido visible en el nombre de la clase (Enmienda 6, §D-C4)", () => {
  it("PR-C12f (C-1, C-2: rutas del administrador): POST y PUT con un nombre sin contenido visible o de un solo emoji responden 400 VALIDACION, sin crear ni cambiar filas; un emoji compuesto con texto se acepta", async () => {
    const maestro = await maestroDePrueba()
    const token = await tokenDelAdminDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id, nombre: "Original" })
    const mensaje = "nombre: El nombre debe tener al menos 2 caracteres"

    for (const nombre of ["\u200B\u2060", "\u{1F44D}"]) {
      const antes = await obtenerDb().clase.count({ where: { maestroId: maestro.id } })
      const crear = await peticion({
        method: "POST",
        url: "/api/admin/clases",
        token,
        payload: { nombre, maestroIds: [maestro.id] },
      })
      expect(crear.statusCode, `POST ${nombre}`).toBe(400)
      expect(errorApiSchema.parse(crear.json()).error).toEqual({
        codigo: "VALIDACION",
        mensaje,
      })
      expect(await obtenerDb().clase.count({ where: { maestroId: maestro.id } })).toBe(antes)

      const editar = await peticion({
        method: "PUT",
        url: `/api/admin/clases/${clase.id}`,
        token,
        payload: { nombre },
      })
      expect(editar.statusCode, `PUT ${nombre}`).toBe(400)
      expect(errorApiSchema.parse(editar.json()).error).toEqual({
        codigo: "VALIDACION",
        mensaje,
      })
      expect((await leerClaseDb(clase.id))?.nombre).toBe("Original")
    }

    const compuesto = await peticion({
      method: "POST",
      url: "/api/admin/clases",
      token,
      payload: { nombre: "\u{1F469}\u200D\u{1F4BB} Programación", maestroIds: [maestro.id] },
    })
    expect(compuesto.statusCode).toBe(201)
    idsClases.push(compuesto.json<{ clase: { id: string } }>().clase.id)
  })
})
