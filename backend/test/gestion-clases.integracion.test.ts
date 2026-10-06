import { randomUUID } from "node:crypto"

import {
  claseAdminSchema,
  claseDetalleSchema,
  errorApiSchema,
  listaClasesAdminRespuestaSchema,
  maestrosDeClaseRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
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
import {
  borrarMovimientosYClasesDePrueba,
  contarPublicaciones,
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  crearPublicacionDePrueba,
  idDelAdminDePrueba,
  inscribirDePrueba,
  leerMovimientos,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

const peticion = (opciones: {
  method: "GET" | "POST" | "PUT" | "DELETE"
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

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

const ficha = (): string => randomUUID().slice(0, 8)

const maestroDePrueba = (nombre = `Maestro ${ficha()}`): Promise<UsuarioDePrueba> =>
  crearAlumnoDePrueba(idsUsuarios, { nombre, rol: "maestro" })
const estudianteDePrueba = (nombre = `Estudiante ${ficha()}`): Promise<UsuarioDePrueba> =>
  crearAlumnoDePrueba(idsUsuarios, { nombre })

const asignacionesDe = async (claseId: string): Promise<string[]> => {
  const filas = await obtenerDb().maestroDeClase.findMany({
    where: { claseId },
    orderBy: [{ creadoEn: "asc" }, { maestroId: "asc" }],
    select: { maestroId: true },
  })
  return filas.map((fila) => fila.maestroId)
}

const maestroIdDeLaColumna = async (claseId: string): Promise<string | undefined> =>
  (await obtenerDb().clase.findUnique({ where: { id: claseId }, select: { maestroId: true } }))
    ?.maestroId

const clasesConNombre = (nombre: string): Promise<number> =>
  obtenerDb().clase.count({ where: { nombre } })

const registrarClase = (respuesta: LightMyRequestResponse): string => {
  const id = respuesta.json<{ clase: { id: string } }>().clase.id
  idsClases.push(id)
  return id
}

let tokenAdmin = ""

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
  tokenAdmin = await tokenDelAdminDePrueba()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("migración y ayuda de pruebas (CLASES-02a)", () => {
  it("PR-2A09: crearClaseDePrueba crea la clase y sus asignaciones en un solo create anidado, con la misma creado_en que la clase y maestro_id = el primer maestro", async () => {
    const a = await maestroDePrueba()
    const b = await maestroDePrueba()

    const unica = await crearClaseDePrueba(idsClases, { maestroId: a.id })
    const doble = await crearClaseDePrueba(idsClases, { maestroId: a.id, maestroIds: [a.id, b.id] })

    for (const [clase, esperados] of [
      [unica, [a.id]],
      [doble, [a.id, b.id]],
    ] as const) {
      const fila = await obtenerDb().clase.findUnique({
        where: { id: clase.id },
        select: {
          creadoEn: true,
          maestroId: true,
          maestros: { select: { maestroId: true, creadoEn: true } },
        },
      })
      if (!fila) throw new Error("La clase de prueba no existe")
      expect(fila.maestroId).toBe(a.id)
      expect(fila.maestros.map((m) => m.maestroId).sort()).toEqual([...esperados].sort())
      for (const asignacion of fila.maestros) {
        expect(asignacion.creadoEn.getTime()).toBe(fila.creadoEn.getTime())
      }
    }
  })
})

describe("POST /api/admin/clases", () => {
  it("PR-2A10: con 1 y con 2 maestros responde 201, con maestros en el orden S-05, maestro = el primero, clases.maestro_id = el primero y un código de 7 caracteres", async () => {
    const a = await maestroDePrueba()
    const b = await maestroDePrueba()
    const orden = [a.id, b.id].sort()

    const uno = await peticion({
      method: "POST",
      url: "/api/admin/clases",
      token: tokenAdmin,
      payload: { nombre: `Una ${ficha()}`, maestroIds: [a.id] },
    })
    expect(uno.statusCode, uno.body).toBe(201)
    const claseUno = claseDetalleSchema.parse(uno.json<{ clase: unknown }>().clase)
    const idUno = registrarClase(uno)
    expect(claseUno.maestros.map((m) => m.id)).toEqual([a.id])
    expect(claseUno.maestro.id).toBe(a.id)
    expect(await maestroIdDeLaColumna(idUno)).toBe(a.id)

    const dos = await peticion({
      method: "POST",
      url: "/api/admin/clases",
      token: tokenAdmin,
      payload: { nombre: `Dos ${ficha()}`, maestroIds: [b.id, a.id] },
    })
    expect(dos.statusCode, dos.body).toBe(201)
    const claseDos = claseDetalleSchema.parse(dos.json<{ clase: unknown }>().clase)
    const idDos = registrarClase(dos)
    expect(claseDos.maestros.map((m) => m.id)).toEqual(orden)
    expect(claseDos.maestro.id).toBe(orden[0])
    expect(await maestroIdDeLaColumna(idDos)).toBe(orden[0])
    expect(await asignacionesDe(idDos)).toEqual(orden)
    const fila = await obtenerDb().clase.findUnique({
      where: { id: idDos },
      select: { codigoInvitacion: true },
    })
    expect(fila?.codigoInvitacion).toHaveLength(7)
  })

  it("PR-2A10: sin maestroIds, [], 3 ids, ids repetidos (también en mayúsculas y minúsculas) o un id que no es UUID responde 400 y no escribe nada", async () => {
    const a = await maestroDePrueba()
    const b = await maestroDePrueba()
    const c = await maestroDePrueba()
    const nombre = `Invalida ${ficha()}`
    const casos: { descripcion: string; maestroIds?: unknown }[] = [
      { descripcion: "ausente" },
      { descripcion: "vacío", maestroIds: [] },
      { descripcion: "tres", maestroIds: [a.id, b.id, c.id] },
      { descripcion: "repetidos", maestroIds: [a.id, a.id] },
      { descripcion: "repetido en mayúsculas", maestroIds: [a.id, a.id.toUpperCase()] },
      { descripcion: "no UUID", maestroIds: ["no-es-un-uuid"] },
      { descripcion: "como texto", maestroIds: a.id },
      { descripcion: "como objeto", maestroIds: { 0: a.id } },
    ]

    for (const caso of casos) {
      const respuesta = await peticion({
        method: "POST",
        url: "/api/admin/clases",
        token: tokenAdmin,
        payload: {
          nombre,
          ...(caso.maestroIds === undefined ? {} : { maestroIds: caso.maestroIds }),
        },
      })
      expect(respuesta.statusCode, caso.descripcion).toBe(400)
      expect(codigoDe(respuesta), caso.descripcion).toBe("VALIDACION")
    }
    expect(await clasesConNombre(nombre)).toBe(0)
    expect(
      await obtenerDb().maestroDeClase.count({ where: { maestroId: { in: [a.id, b.id, c.id] } } }),
    ).toBe(0)
  })

  it("PR-2A10: un id que es estudiante, el admin, un maestro inactivo o no existe responde 404 MAESTRO_NO_ENCONTRADO sin escribir ni la clase ni las asignaciones", async () => {
    const maestro = await maestroDePrueba()
    const estudiante = await estudianteDePrueba()
    const inactivo = await crearAlumnoDePrueba(idsUsuarios, {
      nombre: `Inactivo ${ficha()}`,
      rol: "maestro",
      activo: false,
    })
    const nombre = `Con intruso ${ficha()}`

    for (const intruso of [estudiante.id, await idDelAdminDePrueba(), inactivo.id, randomUUID()]) {
      const respuesta = await peticion({
        method: "POST",
        url: "/api/admin/clases",
        token: tokenAdmin,
        payload: { nombre, maestroIds: [maestro.id, intruso] },
      })
      expect(respuesta.statusCode, intruso).toBe(404)
      expect(codigoDe(respuesta), intruso).toBe("MAESTRO_NO_ENCONTRADO")
    }
    expect(await clasesConNombre(nombre)).toBe(0)
    expect(await obtenerDb().maestroDeClase.count({ where: { maestroId: maestro.id } })).toBe(0)
  })

  it("PR-2A10: nombre y descripción con las mismas reglas que tenía POST /api/clases (contenido visible, longitudes, CRLF normalizado antes de validar, descripción que no es texto)", async () => {
    const maestro = await maestroDePrueba()
    const crear = (payload: Record<string, unknown>) =>
      peticion({
        method: "POST",
        url: "/api/admin/clases",
        token: tokenAdmin,
        payload: { maestroIds: [maestro.id], ...payload },
      })

    const sinVisibles = await crear({ nombre: "​⁠" })
    expect(sinVisibles.statusCode).toBe(400)
    expect(errorApiSchema.parse(sinVisibles.json()).error.mensaje).toBe(
      "nombre: El nombre debe tener al menos 2 caracteres",
    )
    expect((await crear({ nombre: "x".repeat(121) })).statusCode).toBe(400)
    expect((await crear({ nombre: "Valida", descripcion: "y".repeat(2001) })).statusCode).toBe(400)

    const noTexto = await crear({ nombre: "Valida", descripcion: 5 })
    expect(noTexto.statusCode).toBe(400)
    expect(errorApiSchema.parse(noTexto.json()).error.mensaje).toBe(
      "descripcion: La descripción debe ser texto",
    )

    const conSaltos = await crear({
      nombre: `Con saltos ${ficha()}`,
      descripcion: "uno\r\ndos\rtres",
    })
    expect(conSaltos.statusCode, conSaltos.body).toBe(201)
    const id = registrarClase(conSaltos)
    const fila = await obtenerDb().clase.findUnique({
      where: { id },
      select: { descripcion: true },
    })
    expect(fila?.descripcion).toBe("uno\ndos\ntres")
  })
})

describe("PUT /api/admin/clases/:claseId", () => {
  it("PR-2A11: edita nombre y descripción y devuelve el detalle con maestros; una clase inexistente responde 403 SIN_ACCESO_A_LA_CLASE y un claseId que no es UUID, 400", async () => {
    const maestro = await maestroDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id, nombre: "Vieja" })

    const editada = await peticion({
      method: "PUT",
      url: `/api/admin/clases/${clase.id}`,
      token: tokenAdmin,
      payload: { nombre: "Nueva", descripcion: "Descripción nueva" },
    })
    expect(editada.statusCode, editada.body).toBe(200)
    const detalle = claseDetalleSchema.parse(editada.json<{ clase: unknown }>().clase)
    expect(detalle).toMatchObject({ nombre: "Nueva", descripcion: "Descripción nueva" })
    expect(detalle.maestros.map((m) => m.id)).toEqual([maestro.id])

    const inexistente = await peticion({
      method: "PUT",
      url: `/api/admin/clases/${randomUUID()}`,
      token: tokenAdmin,
      payload: { nombre: "Nada" },
    })
    expect(inexistente.statusCode).toBe(403)
    expect(codigoDe(inexistente)).toBe("SIN_ACCESO_A_LA_CLASE")

    const noUuid = await peticion({
      method: "PUT",
      url: "/api/admin/clases/no-es-uuid",
      token: tokenAdmin,
      payload: { nombre: "Nada" },
    })
    expect(noUuid.statusCode).toBe(400)
    expect(codigoDe(noUuid)).toBe("VALIDACION")
  })
})

describe("GET /api/admin/clases", () => {
  it("PR-2A12: ordena por creado_en DESC, id DESC, pagina sin repetidos ni huecos, trae maestros (1 o 2) y alumnos activos, y total", async () => {
    const a = await maestroDePrueba()
    const b = await maestroDePrueba()
    // Fechas lejanas: las clases de otros archivos de prueba, que corren en paralelo, quedan detrás.
    const t = (dia: number): Date => new Date(Date.UTC(2099, 0, dia))
    const clases = [
      await crearClaseDePrueba(idsClases, {
        maestroId: a.id,
        maestroIds: [a.id, b.id],
        creadoEn: t(5),
      }),
      await crearClaseDePrueba(idsClases, { maestroId: a.id, creadoEn: t(4) }),
      await crearClaseDePrueba(idsClases, { maestroId: b.id, creadoEn: t(3) }),
      await crearClaseDePrueba(idsClases, { maestroId: b.id, creadoEn: t(3) }),
      await crearClaseDePrueba(idsClases, { maestroId: a.id, creadoEn: t(2) }),
    ]
    const activo = await estudianteDePrueba()
    const inactivo = await crearUsuarioDePrueba(idsUsuarios, { activo: false })
    await inscribirDePrueba(clases[0]?.id ?? "", activo.id)
    await inscribirDePrueba(clases[0]?.id ?? "", inactivo.id)
    const esperado = clases
      .map((c, i) => ({ id: c.id, dia: i === 0 ? 5 : i === 1 ? 4 : i === 4 ? 2 : 3 }))
      .sort((x, y) => y.dia - x.dia || (x.id < y.id ? 1 : -1))
      .map((c) => c.id)

    const recorrido: string[] = []
    let cursor: string | undefined
    let paginas = 0
    while (recorrido.length < esperado.length && paginas < 5) {
      const respuesta = await peticion({
        method: "GET",
        url: `/api/admin/clases?limite=2${cursor === undefined ? "" : `&cursor=${cursor}`}`,
        token: tokenAdmin,
      })
      expect(respuesta.statusCode, respuesta.body).toBe(200)
      const cuerpo = listaClasesAdminRespuestaSchema.parse(respuesta.json())
      expect(cuerpo.clases.length).toBeLessThanOrEqual(2)
      recorrido.push(...cuerpo.clases.map((c) => c.id))
      cursor = cuerpo.siguienteCursor ?? undefined
      paginas += 1
      expect(cursor).toBeDefined()
    }
    expect(recorrido.slice(0, esperado.length)).toEqual(esperado)
    expect(new Set(recorrido).size).toBe(recorrido.length)

    const totalAntes = await obtenerDb().clase.count()
    const completa = await peticion({
      method: "GET",
      url: "/api/admin/clases?limite=50",
      token: tokenAdmin,
    })
    const cuerpo = listaClasesAdminRespuestaSchema.parse(completa.json())
    expect(cuerpo.clases.length).toBeLessThanOrEqual(50)
    expect(cuerpo.clases.slice(0, 5).map((c) => c.id)).toEqual(esperado)
    const totalDespues = await obtenerDb().clase.count()
    // Otros archivos crean y borran clases a la vez: total queda entre los dos conteos, pero otras
    // pruebas pueden mover la tabla en cualquier dirección, así que se acota por el mínimo y el máximo.
    expect(cuerpo.total).toBeGreaterThanOrEqual(Math.min(totalAntes, totalDespues))
    expect(cuerpo.total).toBeLessThanOrEqual(Math.max(totalAntes, totalDespues))
    expect(cuerpo.total).toBeGreaterThanOrEqual(5)
    const primera = cuerpo.clases.find((c) => c.id === clases[0]?.id)
    claseAdminSchema.parse(primera)
    expect(primera?.maestros.map((m) => m.id).sort()).toEqual([a.id, b.id].sort())
    expect(primera?.alumnos).toBe(1)
    expect(cuerpo.clases.find((c) => c.id === clases[1]?.id)?.maestros).toHaveLength(1)
  })

  it("PR-2A12: un cursor inexistente o que no es una clase responde 400 VALIDACION «cursor: no es válido»; un limite 0, negativo, mayor de 100 o no numérico, 400", async () => {
    const maestro = await maestroDePrueba()
    for (const cursor of [randomUUID(), maestro.id]) {
      const respuesta = await peticion({
        method: "GET",
        url: `/api/admin/clases?cursor=${cursor}`,
        token: tokenAdmin,
      })
      expect(respuesta.statusCode, cursor).toBe(400)
      expect(errorApiSchema.parse(respuesta.json()).error).toEqual({
        codigo: "VALIDACION",
        mensaje: "cursor: no es válido",
      })
    }
    for (const limite of ["0", "-1", "101", "abc"]) {
      const respuesta = await peticion({
        method: "GET",
        url: `/api/admin/clases?limite=${limite}`,
        token: tokenAdmin,
      })
      expect(respuesta.statusCode, limite).toBe(400)
      expect(codigoDe(respuesta), limite).toBe("VALIDACION")
    }
  })
})

describe("POST /api/admin/clases/:claseId/maestros", () => {
  const asignar = (claseId: string, maestroId: string, token = tokenAdmin) =>
    peticion({
      method: "POST",
      url: `/api/admin/clases/${claseId}/maestros`,
      token,
      payload: { maestroId },
    })

  it("PR-2A13: asigna el segundo con 200 y 2 maestros; repetir responde 200 igual sin escribir; un tercero responde 409 TOPE_DE_MAESTROS sin escribir", async () => {
    const a = await maestroDePrueba()
    const b = await maestroDePrueba()
    const c = await maestroDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: a.id })

    const segundo = await asignar(clase.id, b.id)
    expect(segundo.statusCode, segundo.body).toBe(200)
    const lista = maestrosDeClaseRespuestaSchema.parse(segundo.json())
    expect(lista.maestros.map((m) => m.id)).toEqual(await asignacionesDe(clase.id))
    expect(lista.maestros).toHaveLength(2)

    const repetido = await asignar(clase.id, b.id)
    expect(repetido.statusCode).toBe(200)
    expect(maestrosDeClaseRespuestaSchema.parse(repetido.json())).toEqual(lista)
    const enMayusculas = await asignar(clase.id, b.id.toUpperCase())
    expect(enMayusculas.statusCode).toBe(200)
    expect(await asignacionesDe(clase.id)).toHaveLength(2)

    const tercero = await asignar(clase.id, c.id)
    expect(tercero.statusCode).toBe(409)
    expect(errorApiSchema.parse(tercero.json()).error).toEqual({
      codigo: "TOPE_DE_MAESTROS",
      mensaje: "La clase ya tiene 2 maestros. Quita a uno antes de asignar a otro.",
    })
    expect(await asignacionesDe(clase.id)).toHaveLength(2)
  })

  it("PR-2A13: un estudiante, el admin, un maestro inactivo o un id inexistente responden 404 MAESTRO_NO_ENCONTRADO sin escribir", async () => {
    const a = await maestroDePrueba()
    const estudiante = await estudianteDePrueba()
    const inactivo = await crearAlumnoDePrueba(idsUsuarios, {
      nombre: `Inactivo ${ficha()}`,
      rol: "maestro",
      activo: false,
    })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: a.id })

    for (const id of [estudiante.id, await idDelAdminDePrueba(), inactivo.id, randomUUID()]) {
      const respuesta = await asignar(clase.id, id)
      expect(respuesta.statusCode, id).toBe(404)
      expect(codigoDe(respuesta), id).toBe("MAESTRO_NO_ENCONTRADO")
    }
    expect(await asignacionesDe(clase.id)).toEqual([a.id])
  })
})

describe("DELETE /api/admin/clases/:claseId/maestros/:maestroId", () => {
  const retirar = (claseId: string, maestroId: string) =>
    peticion({
      method: "DELETE",
      url: `/api/admin/clases/${claseId}/maestros/${maestroId}`,
      token: tokenAdmin,
    })

  it("PR-2A14: de dos retira uno con 200 y 1; el único responde 409 CLASE_SIN_MAESTRO sin escribir; uno no asignado responde 200 igual", async () => {
    const a = await maestroDePrueba()
    const b = await maestroDePrueba()
    const otro = await maestroDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: a.id, maestroIds: [a.id, b.id] })

    const noAsignado = await retirar(clase.id, otro.id)
    expect(noAsignado.statusCode).toBe(200)
    expect(maestrosDeClaseRespuestaSchema.parse(noAsignado.json()).maestros).toHaveLength(2)

    const retirado = await retirar(clase.id, b.id)
    expect(retirado.statusCode, retirado.body).toBe(200)
    expect(maestrosDeClaseRespuestaSchema.parse(retirado.json()).maestros.map((m) => m.id)).toEqual(
      [a.id],
    )

    const unico = await retirar(clase.id, a.id)
    expect(unico.statusCode).toBe(409)
    expect(errorApiSchema.parse(unico.json()).error).toEqual({
      codigo: "CLASE_SIN_MAESTRO",
      mensaje: "Una clase necesita al menos un maestro. Asigna a otro antes de quitar a este.",
    })
    expect(await asignacionesDe(clase.id)).toEqual([a.id])
  })

  it("PR-2A14: retirar al que está en clases.maestro_id lo cambia al que queda; retirar al otro no lo cambia", async () => {
    const a = await maestroDePrueba()
    const b = await maestroDePrueba()
    const primera = await crearClaseDePrueba(idsClases, {
      maestroId: a.id,
      maestroIds: [a.id, b.id],
    })
    const segunda = await crearClaseDePrueba(idsClases, {
      maestroId: a.id,
      maestroIds: [a.id, b.id],
    })

    expect((await retirar(primera.id, a.id)).statusCode).toBe(200)
    expect(await maestroIdDeLaColumna(primera.id)).toBe(b.id)

    expect((await retirar(segunda.id, b.id)).statusCode).toBe(200)
    expect(await maestroIdDeLaColumna(segunda.id)).toBe(a.id)
  })
})

describe("concurrencia de asignaciones y retiros (§D-2A4)", () => {
  it("PR-2A15: (a) tres asignaciones simultáneas de tres maestros nuevos a una clase con 1 dejan exactamente 2: una 200 y dos 409, ninguna 500; (c) clases.maestro_id termina en un maestro asignado", async () => {
    const a = await maestroDePrueba()
    const nuevos = [await maestroDePrueba(), await maestroDePrueba(), await maestroDePrueba()]
    const clase = await crearClaseDePrueba(idsClases, { maestroId: a.id })

    const respuestas = await Promise.all(
      nuevos.map((m) =>
        peticion({
          method: "POST",
          url: `/api/admin/clases/${clase.id}/maestros`,
          token: tokenAdmin,
          payload: { maestroId: m.id },
        }),
      ),
    )

    expect(respuestas.map((r) => r.statusCode).sort()).toEqual([200, 409, 409])
    const finales = await asignacionesDe(clase.id)
    expect(finales).toHaveLength(2)
    expect(finales).toContain(a.id)
    expect(finales).toContain(await maestroIdDeLaColumna(clase.id))
  })

  it("PR-2A15: (b) dos retiros simultáneos de los dos maestros de una clase dejan 1, con una respuesta 409 y ninguna 500; (c) clases.maestro_id termina en un maestro asignado", async () => {
    const a = await maestroDePrueba()
    const b = await maestroDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: a.id, maestroIds: [a.id, b.id] })

    const respuestas = await Promise.all(
      [a, b].map((m) =>
        peticion({
          method: "DELETE",
          url: `/api/admin/clases/${clase.id}/maestros/${m.id}`,
          token: tokenAdmin,
        }),
      ),
    )

    expect(respuestas.map((r) => r.statusCode).sort()).toEqual([200, 409])
    const finales = await asignacionesDe(clase.id)
    expect(finales).toHaveLength(1)
    expect(finales).toContain(await maestroIdDeLaColumna(clase.id))
  })
})

describe("acceso de los maestros tras un cambio de asignación", () => {
  it("PR-2A16: el maestro retirado pierde el acceso en la siguiente petición (detalle, muro y roster) y sus publicaciones se quedan; el asignado lo gana; impartidas refleja los dos cambios", async () => {
    const a = await maestroDePrueba()
    const b = await maestroDePrueba()
    const nuevo = await maestroDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: a.id, maestroIds: [a.id, b.id] })
    await crearPublicacionDePrueba({ claseId: clase.id, autorId: a.id, texto: "Anuncio de A" })
    const tokenA = await tokenDe(a)
    const tokenB = await tokenDe(b)
    const tokenNuevo = await tokenDe(nuevo)
    const rutas = [
      `/api/clases/${clase.id}`,
      `/api/clases/${clase.id}/publicaciones`,
      `/api/clases/${clase.id}/alumnos`,
    ]
    const impartidas = async (token: string): Promise<string[]> =>
      (await peticion({ method: "GET", url: "/api/clases/impartidas", token }))
        .json<{ clases: { id: string }[] }>()
        .clases.map((c) => c.id)

    for (const url of rutas) {
      expect((await peticion({ method: "GET", url, token: tokenA })).statusCode, url).toBe(200)
      expect((await peticion({ method: "GET", url, token: tokenNuevo })).statusCode, url).toBe(403)
    }
    expect(await impartidas(tokenA)).toContain(clase.id)
    expect(await impartidas(tokenNuevo)).not.toContain(clase.id)

    const retiro = await peticion({
      method: "DELETE",
      url: `/api/admin/clases/${clase.id}/maestros/${a.id}`,
      token: tokenAdmin,
    })
    expect(retiro.statusCode).toBe(200)
    const asignacion = await peticion({
      method: "POST",
      url: `/api/admin/clases/${clase.id}/maestros`,
      token: tokenAdmin,
      payload: { maestroId: nuevo.id },
    })
    expect(asignacion.statusCode).toBe(200)

    for (const url of rutas) {
      const retirado = await peticion({ method: "GET", url, token: tokenA })
      expect(retirado.statusCode, url).toBe(403)
      expect(codigoDe(retirado), url).toBe("SIN_ACCESO_A_LA_CLASE")
      expect((await peticion({ method: "GET", url, token: tokenNuevo })).statusCode, url).toBe(200)
    }
    expect(await impartidas(tokenA)).not.toContain(clase.id)
    expect(await impartidas(tokenNuevo)).toContain(clase.id)
    expect(await contarPublicaciones(clase.id)).toBe(1)
    const muro = await peticion({ method: "GET", url: rutas[1] ?? "", token: tokenB })
    expect(muro.body).toContain("Anuncio de A")
  })
})

describe("GET /api/admin/maestros/candidatos", () => {
  const buscar = (q: string, extra = "") =>
    peticion({
      method: "GET",
      url: `/api/admin/maestros/candidatos?q=${encodeURIComponent(q)}${extra}`,
      token: tokenAdmin,
    })

  it("PR-2A17: solo salen maestros activos (nunca estudiantes ni el admin), con el correo completo, y hayMas", async () => {
    const marca = `zq${ficha()}`
    const m1 = await maestroDePrueba(`${marca} Uno`)
    await maestroDePrueba(`${marca} Dos`)
    await maestroDePrueba(`${marca} Tres`)
    await estudianteDePrueba(`${marca} Estudiante`)
    await crearAlumnoDePrueba(idsUsuarios, {
      nombre: `${marca} Inactivo`,
      rol: "maestro",
      activo: false,
    })

    const todos = await buscar(marca, "&limite=10")
    expect(todos.statusCode, todos.body).toBe(200)
    const cuerpo = todos.json<{
      candidatos: { id: string; nombre: string; email: string }[]
      hayMas: boolean
    }>()
    expect(cuerpo.candidatos.map((c) => c.nombre).sort()).toEqual([
      `${marca} Dos`,
      `${marca} Tres`,
      `${marca} Uno`,
    ])
    expect(cuerpo.hayMas).toBe(false)
    expect(cuerpo.candidatos.find((c) => c.id === m1.id)?.email).toBe(m1.email)

    const pagina = await buscar(marca, "&limite=2")
    const corta = pagina.json<{ candidatos: unknown[]; hayMas: boolean }>()
    expect(corta.candidatos).toHaveLength(2)
    expect(corta.hayMas).toBe(true)
    const exacta = await buscar(marca, "&limite=3")
    expect(exacta.json<{ hayMas: boolean }>().hayMas).toBe(false)
  })

  it("PR-2A17: mínimo y máximo de la búsqueda, comodines (%, _ y \\) escapados y carácter nulo con 400", async () => {
    const marca = `zq${ficha()}`
    await maestroDePrueba(`${marca}x%y`)
    await maestroDePrueba(`${marca}xAy`)
    await maestroDePrueba(`${marca}p_q`)
    await maestroDePrueba(`${marca}pXq`)
    await maestroDePrueba(`${marca}b\\c`)

    for (const [q, esperado] of [
      [`${marca}x%y`, [`${marca}x%y`]],
      [`${marca}p_q`, [`${marca}p_q`]],
      [`${marca}b\\c`, [`${marca}b\\c`]],
    ] as const) {
      const respuesta = await buscar(q)
      expect(respuesta.statusCode, q).toBe(200)
      expect(
        respuesta.json<{ candidatos: { nombre: string }[] }>().candidatos.map((c) => c.nombre),
        q,
      ).toEqual(esperado)
    }

    const corto = await buscar("ab")
    expect(corto.statusCode).toBe(400)
    expect(codigoDe(corto)).toBe("VALIDACION")
    const cortoConEspacios = await buscar("  ab  ")
    expect(cortoConEspacios.statusCode).toBe(400)
    expect(codigoDe(cortoConEspacios)).toBe("BUSQUEDA_MUY_CORTA")
    expect((await buscar("x".repeat(121))).statusCode).toBe(400)
    expect((await buscar("abc", "&limite=51")).statusCode).toBe(400)
    const nulo = await buscar(`${marca}\u0000`)
    expect(nulo.statusCode).toBe(400)
  })
})

describe("rutas existentes con dos maestros (CLASES-02a)", () => {
  it("PR-2A18: impartidas lista la clase a los dos maestros, por fecha de asignación; el cursor de una clase que ya no es del maestro responde 400; total correcto", async () => {
    const a = await maestroDePrueba()
    const b = await maestroDePrueba()
    const primera = await crearClaseDePrueba(idsClases, {
      maestroId: a.id,
      maestroIds: [a.id, b.id],
    })
    const segunda = await crearClaseDePrueba(idsClases, {
      maestroId: a.id,
      maestroIds: [a.id, b.id],
    })
    const ahora = Date.now()
    for (const [clase, hace] of [
      [primera, 2],
      [segunda, 1],
    ] as const) {
      await obtenerDb().maestroDeClase.updateMany({
        where: { claseId: clase.id },
        data: { creadoEn: new Date(ahora - hace * 3_600_000) },
      })
    }

    for (const maestro of [a, b]) {
      const respuesta = await peticion({
        method: "GET",
        url: "/api/clases/impartidas",
        token: await tokenDe(maestro),
      })
      expect(respuesta.statusCode).toBe(200)
      const cuerpo = respuesta.json<{ clases: { id: string }[]; total: number }>()
      expect(cuerpo.clases.map((c) => c.id)).toEqual([segunda.id, primera.id])
      expect(cuerpo.total).toBe(2)
    }

    const retirar = await peticion({
      method: "DELETE",
      url: `/api/admin/clases/${segunda.id}/maestros/${a.id}`,
      token: tokenAdmin,
    })
    expect(retirar.statusCode).toBe(200)
    const conCursor = await peticion({
      method: "GET",
      url: `/api/clases/impartidas?limite=1&cursor=${segunda.id}`,
      token: await tokenDe(a),
    })
    expect(conCursor.statusCode).toBe(400)
    expect(errorApiSchema.parse(conCursor.json()).error.mensaje).toBe("cursor: no es válido")
    const sinLaRetirada = await peticion({
      method: "GET",
      url: "/api/clases/impartidas",
      token: await tokenDe(a),
    })
    expect(sinLaRetirada.json<{ clases: { id: string }[]; total: number }>()).toMatchObject({
      total: 1,
      clases: [{ id: primera.id }],
    })
  })

  it("PR-2A19: inscritas y el detalle traen maestros (1 y 2) en orden y maestro = el primero", async () => {
    const a = await maestroDePrueba(`Maestra ${ficha()}`)
    const b = await maestroDePrueba(`Maestro ${ficha()}`)
    const alumno = await estudianteDePrueba()
    const unica = await crearClaseDePrueba(idsClases, { maestroId: a.id })
    const doble = await crearClaseDePrueba(idsClases, { maestroId: a.id, maestroIds: [a.id, b.id] })
    await inscribirDePrueba(unica.id, alumno.id)
    await inscribirDePrueba(doble.id, alumno.id)
    const nombres = new Map([
      [a.id, (await obtenerDb().usuario.findUnique({ where: { id: a.id } }))?.nombre ?? ""],
      [b.id, (await obtenerDb().usuario.findUnique({ where: { id: b.id } }))?.nombre ?? ""],
    ])
    const ordenDoble = (await asignacionesDe(doble.id)).map((id) => nombres.get(id))

    const token = await tokenDe(alumno)
    const inscritas = await peticion({ method: "GET", url: "/api/clases/inscritas", token })
    const lista = inscritas.json<{
      clases: { id: string; maestro: { nombre: string }; maestros: { nombre: string }[] }[]
    }>().clases
    const deUnica = lista.find((c) => c.id === unica.id)
    const deDoble = lista.find((c) => c.id === doble.id)
    expect(deUnica?.maestros.map((m) => m.nombre)).toEqual([nombres.get(a.id)])
    expect(deDoble?.maestros.map((m) => m.nombre)).toEqual(ordenDoble)
    expect(deDoble?.maestro.nombre).toBe(ordenDoble[0])

    const detalle = await peticion({ method: "GET", url: `/api/clases/${doble.id}`, token })
    const clase = claseDetalleSchema.parse(detalle.json<{ clase: unknown }>().clase)
    expect(clase.maestros.map((m) => m.nombre)).toEqual(ordenDoble)
    expect(clase.maestro).toEqual(clase.maestros[0])
  })

  it("PR-2A20: el admin en el detalle, el código (ver y regenerar), el roster, el buscador, el alta y la baja recibe 200 o 204; el alta y la baja escriben un movimiento con actorId = el admin y secuencia en orden; el buscador devuelve el correo enmascarado", async () => {
    const maestro = await maestroDePrueba()
    const candidato = await estudianteDePrueba(`Candidato ${ficha()}`)
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const adminId = await idDelAdminDePrueba()
    const como = (
      method: "GET" | "POST" | "DELETE",
      url: string,
      payload?: InjectOptions["payload"],
    ) => peticion({ method, url, token: tokenAdmin, ...(payload === undefined ? {} : { payload }) })

    expect((await como("GET", `/api/clases/${clase.id}`)).statusCode).toBe(200)
    const codigo = await como("GET", `/api/clases/${clase.id}/codigo`)
    expect(codigo.statusCode).toBe(200)
    expect(codigo.headers["cache-control"]).toBe("no-store")
    expect(codigo.json<{ codigo: string }>().codigo).toBe(clase.codigoInvitacion)
    const regenerado = await como("POST", `/api/clases/${clase.id}/codigo`)
    expect(regenerado.statusCode).toBe(200)
    expect(regenerado.json<{ codigo: string }>().codigo).not.toBe(clase.codigoInvitacion)
    expect((await como("GET", `/api/clases/${clase.id}/alumnos`)).statusCode).toBe(200)

    const buscador = await como("GET", `/api/clases/${clase.id}/alumnos/candidatos?q=candidato`)
    expect(buscador.statusCode).toBe(200)
    expect(buscador.body).not.toContain(candidato.email)
    expect(buscador.body).toContain("correoEnmascarado")

    expect(
      (await como("POST", `/api/clases/${clase.id}/alumnos`, { alumnoId: candidato.id }))
        .statusCode,
    ).toBe(200)
    expect(
      (await como("DELETE", `/api/clases/${clase.id}/alumnos/${candidato.id}`)).statusCode,
    ).toBe(204)

    const movimientos = await leerMovimientos(clase.id)
    expect(movimientos.map((m) => [m.tipo, m.actorId, m.alumnoId])).toEqual([
      ["alta", adminId, candidato.id],
      ["baja", adminId, candidato.id],
    ])
    expect(movimientos[1]?.secuencia ?? 0n).toBeGreaterThan(movimientos[0]?.secuencia ?? 0n)
  })

  it("PR-2A21: POST /api/clases y PUT /api/clases/:claseId responden 404 (con token de maestro, de admin y sin token) y no escriben", async () => {
    const maestro = await maestroDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id, nombre: "Intacta" })
    const nombre = `Retirada ${ficha()}`
    const tokenMaestro = await tokenDe(maestro)

    for (const token of [tokenMaestro, tokenAdmin, undefined]) {
      const crear = await peticion({
        method: "POST",
        url: "/api/clases",
        ...(token === undefined ? {} : { token }),
        payload: { nombre, maestroIds: [maestro.id] },
      })
      expect(crear.statusCode).toBe(404)
      const editar = await peticion({
        method: "PUT",
        url: `/api/clases/${clase.id}`,
        ...(token === undefined ? {} : { token }),
        payload: { nombre },
      })
      expect(editar.statusCode).toBe(404)
    }
    expect(await clasesConNombre(nombre)).toBe(0)
    expect((await obtenerDb().clase.findUnique({ where: { id: clase.id } }))?.nombre).toBe(
      "Intacta",
    )
  })
})
