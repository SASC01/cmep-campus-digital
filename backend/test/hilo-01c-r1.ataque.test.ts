import { randomUUID } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import { join, sep } from "node:path"

import {
  comentarioPrivadoRespuestaSchema,
  errorApiSchema,
  listaComentariosPrivadosRespuestaSchema,
  listaPublicacionesRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  datosComentarioCreadoSchema,
  datosComentarioDelMuroSchema,
  datosComentarioPrivadoSchema,
} from "../src/core/eventos/avisos-de-clase.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  desactivarUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  crearPublicacionDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import {
  conFilaDeEntregasRetenida,
  crearEntregaDePrueba,
  leerEntregaDb,
} from "./ayudas-entregas.js"
import { crearTareaDePrueba } from "./ayudas-tareas.js"

// Ataques del Tester, ENTREGAS-01c ronda 1 (hilo privado, backend). Las fechas límite llevan horas de
// margen respecto de la hora real; ninguna prueba compara textos relativos al tiempo.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen: crearAlmacenEnMemoria() })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const HORA_MS = 3_600_000

interface Escenario {
  claseId: string
  otraClaseId: string
  maestro: UsuarioDePrueba
  ana: UsuarioDePrueba
  beto: UsuarioDePrueba
  ajena: UsuarioDePrueba
  t: { maestro: string; ana: string; beto: string; admin: string }
}

const escenario = async (): Promise<Escenario> => {
  const ficha = randomUUID().slice(0, 6)
  const maestro = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Maestra H ${ficha}`,
    rol: "maestro",
  })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  const otra = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  const ana = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Ana H ${ficha}` })
  const beto = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Beto H ${ficha}` })
  const ajena = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Carla H ${ficha}` })
  await inscribirDePrueba(clase.id, ana.id)
  await inscribirDePrueba(clase.id, beto.id)
  await inscribirDePrueba(otra.id, ajena.id)
  await obtenerDb().usuario.updateMany({
    where: { id: { in: [ana.id, beto.id] } },
    data: { estadoPago: "deudor", fechaEstadoPago: new Date() },
  })
  return {
    claseId: clase.id,
    otraClaseId: otra.id,
    maestro,
    ana,
    beto,
    ajena,
    t: {
      maestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
      ana: await firmarTokenDePrueba({ usuarioId: ana.id }),
      beto: await firmarTokenDePrueba({ usuarioId: beto.id }),
      admin: await tokenDelAdminDePrueba(),
    },
  }
}

const tarea = (e: Escenario, { horas = 48, aceptaTardias = true } = {}) =>
  crearTareaDePrueba({
    claseId: e.claseId,
    autorId: e.maestro.id,
    fechaLimite: new Date(Date.now() + horas * HORA_MS),
    aceptaTardias,
  })

const base = (claseId: string, tareaId: string) => `/api/clases/${claseId}/tareas/${tareaId}`

const pedir = (metodo: "GET" | "POST" | "DELETE", url: string, token: string, payload?: unknown) =>
  obtenerApp().inject({
    method: metodo,
    url,
    ...(payload === undefined ? {} : { payload: payload as object }),
    headers: {
      authorization: `Bearer ${token}`,
      ...(payload === undefined ? {} : { "content-type": "application/json" }),
    },
  })

const resultado = (r: LightMyRequestResponse): string =>
  r.statusCode < 400
    ? String(r.statusCode)
    : `${String(r.statusCode)} ${errorApiSchema.parse(r.json()).error.codigo}`

const comentarComoAlumno = (e: Escenario, tareaId: string, token: string, texto: unknown) =>
  pedir("POST", `${base(e.claseId, tareaId)}/entrega/comentarios`, token, { texto })
const comentarComoMaestro = (
  e: Escenario,
  tareaId: string,
  alumnoId: string,
  texto: unknown,
  token = e.t.maestro,
) => pedir("POST", `${base(e.claseId, tareaId)}/entregas/${alumnoId}/comentarios`, token, { texto })
const idDe = (r: LightMyRequestResponse): string => {
  expect(r.statusCode, `Precondición: comentar (${r.body})`).toBe(201)
  return comentarioPrivadoRespuestaSchema.parse(r.json()).comentario.id
}
const contarComentarios = (tareaId: string, alumnoId: string) =>
  obtenerDb().comentario.count({ where: { entrega: { tareaId, alumnoId } } })

interface TrabajoDeComentario {
  id: string
  datos: Record<string, unknown>
}
const trabajosDeComentario = (comentarioId: string) =>
  obtenerDb().$queryRaw<TrabajoDeComentario[]>`
    SELECT id::text AS id, data AS datos FROM pgboss.job
    WHERE name = 'COMENTARIO_CREADO' AND data ->> 'comentarioId' = ${comentarioId}::text`
describe("ataque ENTREGAS-01c r1: el hilo de otro alumno por cualquier camino", () => {
  it("Ana no ve ni pagina el hilo de Beto: su lista no lo trae, un cursor de Beto o de otra tarea suya da 400, la ruta del maestro le da 403; el maestro con :alumnoId de otra clase, dado de baja, desactivado, un maestro o el admin recibe 404 ALUMNO_NO_ENCONTRADO al leer y al escribir, sin crear fila ni comentario", async () => {
    const e = await escenario()
    const t = await tarea(e)
    const otraTarea = await tarea(e)
    const deBeto = idDe(await comentarComoAlumno(e, t, e.t.beto, "Hola, soy Beto"))
    const deAnaEnOtra = idDe(await comentarComoAlumno(e, otraTarea, e.t.ana, "Otra tarea"))
    idDe(await comentarComoAlumno(e, t, e.t.ana, "Hola, soy Ana"))

    const suya = listaComentariosPrivadosRespuestaSchema.parse(
      (await pedir("GET", `${base(e.claseId, t)}/entrega/comentarios`, e.t.ana)).json(),
    )
    expect(suya.comentarios.map(({ texto }) => texto)).toEqual(["Hola, soy Ana"])
    for (const cursor of [deBeto, deAnaEnOtra, randomUUID()]) {
      expect(
        resultado(
          await pedir("GET", `${base(e.claseId, t)}/entrega/comentarios?cursor=${cursor}`, e.t.ana),
        ),
      ).toBe("400 VALIDACION")
    }
    expect(
      resultado(
        await pedir("GET", `${base(e.claseId, t)}/entregas/${e.beto.id}/comentarios`, e.t.ana),
      ),
    ).toBe("403 ROL_NO_PERMITIDO")
    expect(resultado(await comentarComoMaestro(e, t, e.beto.id, "Me meto", e.t.ana))).toBe(
      "403 ROL_NO_PERMITIDO",
    )

    const baja = await crearAlumnoDePrueba(idsUsuarios, {
      nombre: `Baja ${randomUUID().slice(0, 4)}`,
    })
    await inscribirDePrueba(e.claseId, baja.id)
    expect(
      resultado(await pedir("DELETE", `/api/clases/${e.claseId}/alumnos/${baja.id}`, e.t.maestro)),
    ).toBe("204")
    const desactivada = await crearAlumnoDePrueba(idsUsuarios, {
      nombre: `Desactivada ${randomUUID().slice(0, 4)}`,
    })
    await inscribirDePrueba(e.claseId, desactivada.id)
    await desactivarUsuarioDePrueba(desactivada.id)
    const admin = await obtenerDb().usuario.findFirst({
      where: { rol: "admin" },
      select: { id: true },
    })
    if (!admin) throw new Error("Precondición: existe el admin")
    const fallas: string[] = []
    for (const [etiqueta, alumnoId] of [
      ["de otra clase", e.ajena.id],
      ["dado de baja", baja.id],
      ["desactivada", desactivada.id],
      ["un maestro", e.maestro.id],
      ["el admin", admin.id],
      ["inexistente", randomUUID()],
    ] as const) {
      for (const [que, r] of [
        [
          "leer (maestro)",
          await pedir("GET", `${base(e.claseId, t)}/entregas/${alumnoId}/comentarios`, e.t.maestro),
        ],
        [
          "leer (admin)",
          await pedir("GET", `${base(e.claseId, t)}/entregas/${alumnoId}/comentarios`, e.t.admin),
        ],
        ["escribir", await comentarComoMaestro(e, t, alumnoId, "Hola")],
      ] as const)
        if (resultado(r) !== "404 ALUMNO_NO_ENCONTRADO")
          fallas.push(`${etiqueta} / ${que}: ${resultado(r)}`)
      if (await leerEntregaDb(t, alumnoId)) fallas.push(`${etiqueta}: se creó una fila de entrega`)
    }
    expect(fallas).toEqual([])
  })
})

describe("ataque ENTREGAS-01c r1: aislamiento frente a las rutas del muro", () => {
  it("un comentario privado no se ve, no se cuenta ni se borra por el muro: listas y conteos de la tarea y de un anuncio, borrar por mis-comentarios y por la moderación del maestro y del admin; todos 404 y el comentario sigue", async () => {
    const e = await escenario()
    const t = await tarea(e)
    const anuncio = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const deAna = idDe(await comentarComoAlumno(e, t, e.t.ana, "Privado de Ana"))
    const delMaestro = idDe(await comentarComoMaestro(e, t, e.ana.id, "Privado del maestro"))

    const muro = await pedir("GET", `/api/clases/${e.claseId}/publicaciones?limite=50`, e.t.maestro)
    expect(muro.statusCode).toBe(200)
    expect(muro.body).not.toContain("Privado")
    const publicaciones = listaPublicacionesRespuestaSchema.parse(muro.json()).publicaciones
    expect(
      publicaciones
        .filter(({ id }) => id === t || id === anuncio)
        .map(({ comentarios }) => comentarios),
    ).toEqual([0, 0])
    for (const publicacion of [t, anuncio]) {
      const r = await pedir(
        "GET",
        `/api/clases/${e.claseId}/publicaciones/${publicacion}/comentarios`,
        e.t.maestro,
      )
      expect(r.statusCode).toBeLessThan(500)
      expect(r.body).not.toContain("Privado")
    }
    const fallas: string[] = []
    const borrados: [string, string, string][] = [
      ["mis-comentarios de Ana", `/api/clases/${e.claseId}/mis-comentarios/${deAna}`, e.t.ana],
      [
        "mis-comentarios del maestro",
        `/api/clases/${e.claseId}/mis-comentarios/${delMaestro}`,
        e.t.maestro,
      ],
      [
        "moderación por la tarea",
        `/api/clases/${e.claseId}/publicaciones/${t}/comentarios/${deAna}`,
        e.t.maestro,
      ],
      [
        "moderación por el anuncio",
        `/api/clases/${e.claseId}/publicaciones/${anuncio}/comentarios/${deAna}`,
        e.t.maestro,
      ],
      [
        "admin por la tarea",
        `/api/clases/${e.claseId}/publicaciones/${t}/comentarios/${delMaestro}`,
        e.t.admin,
      ],
      [
        "Ana por el anuncio",
        `/api/clases/${e.claseId}/publicaciones/${anuncio}/comentarios/${deAna}`,
        e.t.ana,
      ],
    ]
    for (const [etiqueta, url, token] of borrados) {
      const r = await pedir("DELETE", url, token)
      if (r.statusCode !== 404) fallas.push(`${etiqueta}: ${resultado(r)}`)
    }
    expect(fallas).toEqual([])
    expect(await contarComentarios(t, e.ana.id)).toBe(2)
  })
})

describe("ataque ENTREGAS-01c r1: quién escribe y qué cambia (P-01 a, S-15)", () => {
  it("el admin lee el hilo (200) y al escribir recibe 403 ROL_NO_PERMITIDO (no 404), sin fila, comentario ni trabajo", async () => {
    const e = await escenario()
    const t = await tarea(e)
    expect(
      resultado(
        await pedir("GET", `${base(e.claseId, t)}/entregas/${e.ana.id}/comentarios`, e.t.admin),
      ),
    ).toBe("200")
    for (const alumnoId of [e.ana.id, randomUUID()]) {
      expect(resultado(await comentarComoMaestro(e, t, alumnoId, "Del admin", e.t.admin))).toBe(
        "403 ROL_NO_PERMITIDO",
      )
    }
    expect(await leerEntregaDb(t, e.ana.id)).toBeNull()
    const trabajos = await obtenerDb().$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM pgboss.job j
      JOIN comentarios c ON c.id::text = j.data ->> 'comentarioId'
      JOIN entregas en ON en.id = c.entrega_id WHERE en.tarea_id = ${t}::uuid`
    expect(trabajos[0]?.n).toBe(0)
  })

  it("comentar (alumna y maestro) no cambia estado, versión, fecha, enlaces ni actualizado_en de la entrega en asignado, entregado, calificado ni con la entrega cerrada; sin fila, la crea en asignado con versión 0", async () => {
    const e = await escenario()
    const sinFila = await tarea(e)
    idDe(await comentarComoMaestro(e, sinFila, e.ana.id, "Primero el maestro"))
    const nueva = await leerEntregaDb(sinFila, e.ana.id)
    expect([nueva?.estado, nueva?.version, nueva?.fechaEntrega, nueva?.enlaces]).toEqual([
      "asignado",
      0,
      null,
      [],
    ])

    const casos: [string, Promise<string>][] = [
      [
        "asignado",
        tarea(e).then(
          async (id) => (
            await crearEntregaDePrueba({
              tareaId: id,
              alumnoId: e.ana.id,
              estado: "asignado",
              version: 3,
            }),
            id
          ),
        ),
      ],
      [
        "entregado",
        tarea(e).then(
          async (id) => (
            await crearEntregaDePrueba({
              tareaId: id,
              alumnoId: e.ana.id,
              estado: "entregado",
              version: 1,
              enlaces: ["https://ejemplo.mx"],
            }),
            id
          ),
        ),
      ],
      [
        "calificado",
        tarea(e).then(
          async (id) => (
            await crearEntregaDePrueba({
              tareaId: id,
              alumnoId: e.ana.id,
              estado: "calificado",
              version: 4,
            }),
            id
          ),
        ),
      ],
      [
        "cerrada",
        tarea(e, { horas: -3, aceptaTardias: false }).then(
          async (id) => (
            await crearEntregaDePrueba({
              tareaId: id,
              alumnoId: e.ana.id,
              estado: "entregado",
              version: 2,
              fechaEntrega: new Date(Date.now() - 4 * HORA_MS),
            }),
            id
          ),
        ),
      ],
    ]
    const fallas: string[] = []
    for (const [etiqueta, pendiente] of casos) {
      const t = await pendiente
      const antes = await leerEntregaDb(t, e.ana.id)
      for (const r of [
        await comentarComoAlumno(e, t, e.t.ana, "De la alumna"),
        await comentarComoMaestro(e, t, e.ana.id, "Del maestro"),
      ])
        if (r.statusCode !== 201) fallas.push(`${etiqueta}: ${resultado(r)}`)
      const despues = await leerEntregaDb(t, e.ana.id)
      if (JSON.stringify(despues) !== JSON.stringify(antes))
        fallas.push(`${etiqueta}: la entrega cambió`)
    }
    expect(fallas).toEqual([])
  })
})

describe("ataque ENTREGAS-01c r1: COMENTARIO_CREADO", () => {
  it("el trabajo del hilo lleva id = id del comentario y solo { comentarioId, entregaId, claseId }; encaja solo en la forma privada; el del muro, solo en la del muro; la unión rechaza las dos llaves, ninguna, texto y llaves de más", async () => {
    const e = await escenario()
    const t = await tarea(e)
    const privado = idDe(await comentarComoAlumno(e, t, e.t.ana, "Texto secreto del hilo"))
    const entrega = await leerEntregaDb(t, e.ana.id)
    if (!entrega) throw new Error("Precondición: la entrega existe")
    const [delHilo, ...demas] = await trabajosDeComentario(privado)
    expect(demas).toEqual([])
    expect(delHilo?.id).toBe(privado)
    expect(delHilo?.datos).toStrictEqual({
      comentarioId: privado,
      entregaId: entrega.id,
      claseId: e.claseId,
    })
    expect(JSON.stringify(delHilo?.datos)).not.toContain("secreto")

    const anuncio = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const delMuro = await pedir(
      "POST",
      `/api/clases/${e.claseId}/publicaciones/${anuncio}/comentarios`,
      e.t.ana,
      { texto: "Del muro" },
    )
    expect(delMuro.statusCode, delMuro.body).toBe(201)
    const idMuro = delMuro.json<{ comentario: { id: string } }>().comentario.id
    const [trabajoMuro] = await trabajosDeComentario(idMuro)

    const encaja = (datos: unknown) => [
      datosComentarioDelMuroSchema.safeParse(datos).success,
      datosComentarioPrivadoSchema.safeParse(datos).success,
      datosComentarioCreadoSchema.safeParse(datos).success,
    ]
    expect(encaja(delHilo?.datos)).toEqual([false, true, true])
    expect(encaja(trabajoMuro?.datos)).toEqual([true, false, true])
    const ambas = {
      comentarioId: privado,
      entregaId: entrega.id,
      publicacionId: anuncio,
      claseId: e.claseId,
    }
    expect(encaja(ambas)).toEqual([false, false, false])
    expect(encaja({ comentarioId: privado, claseId: e.claseId })).toEqual([false, false, false])
    expect(
      encaja({ comentarioId: privado, entregaId: entrega.id, claseId: e.claseId, texto: "x" }),
    ).toEqual([false, false, false])
    expect(
      encaja({ comentarioId: privado, entregaId: entrega.id, claseId: e.claseId, tareaId: t }),
    ).toEqual([false, false, false])
  })
})

describe("ataque ENTREGAS-01c r1: texto del comentario", () => {
  it("vacío, solo espacios, solo invisibles, 1001 visibles, con un inversor de dirección, no texto o null: 400 sin comentario ni fila; 1 y 1000 visibles y con espacios a los lados, 201 normalizado", async () => {
    const e = await escenario()
    const t = await tarea(e)
    const malos: unknown[] = [
      "",
      "    ",
      "​​﻿",
      "­",
      "a".repeat(1001),
      "\u202Eolleh",
      42,
      null,
      ["x"],
      { t: 1 },
    ]
    const fallas: string[] = []
    for (const texto of malos) {
      for (const [quien, r] of [
        ["alumna", await comentarComoAlumno(e, t, e.t.ana, texto)],
        ["maestro", await comentarComoMaestro(e, t, e.ana.id, texto)],
      ] as const)
        if (resultado(r) !== "400 VALIDACION")
          fallas.push(`${quien} ${JSON.stringify(texto).slice(0, 20)}: ${resultado(r)}`)
    }
    expect(fallas).toEqual([])
    expect(await leerEntregaDb(t, e.ana.id)).toBeNull()
    for (const texto of ["a", "b".repeat(1000), "  con espacios  "]) {
      const r = await comentarComoAlumno(e, t, e.t.ana, texto)
      expect([JSON.stringify(texto).slice(0, 20), r.statusCode]).toEqual([
        JSON.stringify(texto).slice(0, 20),
        201,
      ])
    }
    const textos = listaComentariosPrivadosRespuestaSchema
      .parse((await pedir("GET", `${base(e.claseId, t)}/entrega/comentarios`, e.t.ana)).json())
      .comentarios.map(({ texto }) => texto)
    expect(textos.slice(0, 3)).toEqual(["a", "b".repeat(1000), "con espacios"])
  })
})

describe("ataque ENTREGAS-01c r1: restricción y fugas", () => {
  it("la alumna restringida recibe 403 ACCESO_RESTRINGIDO en las cuatro rutas del hilo, sin comentario, fila ni trabajo", async () => {
    const e = await escenario()
    const t = await tarea(e)
    const restringida = await crearUsuarioDePrueba(idsUsuarios, {
      accesoRestringido: true,
      motivoRestriccion: "Adeudo",
    })
    await inscribirDePrueba(e.claseId, restringida.id)
    const token = await firmarTokenDePrueba({ usuarioId: restringida.id })
    const rutas: ["GET" | "POST", string][] = [
      ["GET", `${base(e.claseId, t)}/entrega/comentarios`],
      ["POST", `${base(e.claseId, t)}/entrega/comentarios`],
      ["GET", `${base(e.claseId, t)}/entregas/${restringida.id}/comentarios`],
      ["POST", `${base(e.claseId, t)}/entregas/${restringida.id}/comentarios`],
    ]
    const fallas: string[] = []
    for (const [metodo, url] of rutas) {
      const r = await pedir(metodo, url, token, metodo === "POST" ? { texto: "hola" } : undefined)
      if (resultado(r) !== "403 ACCESO_RESTRINGIDO" || /Adeudo/.test(r.body))
        fallas.push(`${metodo} ${url}: ${resultado(r)}`)
    }
    expect(fallas).toEqual([])
    expect(await leerEntregaDb(t, restringida.id)).toBeNull()
  })

  it("ninguna respuesta del hilo (alumna, maestro y admin; éxito y error) lleva estadoPago, accesoRestringido, email, rol ni «deudor»; el autor trae exactamente id, nombre y administracion", async () => {
    const e = await escenario()
    const t = await tarea(e)
    const respuestas = [
      await comentarComoAlumno(e, t, e.t.ana, "Hola"),
      await comentarComoMaestro(e, t, e.ana.id, "Respuesta"),
      await pedir("GET", `${base(e.claseId, t)}/entrega/comentarios`, e.t.ana),
      await pedir("GET", `${base(e.claseId, t)}/entregas/${e.ana.id}/comentarios`, e.t.maestro),
      await pedir("GET", `${base(e.claseId, t)}/entregas/${e.ana.id}/comentarios`, e.t.admin),
      await pedir("GET", `${base(e.claseId, t)}/entregas/${e.ajena.id}/comentarios`, e.t.admin),
      await comentarComoMaestro(e, t, e.ana.id, "", e.t.maestro),
      await comentarComoMaestro(e, t, e.ana.id, "Admin", e.t.admin),
    ]
    const prohibidas =
      /estadoPago|fechaEstadoPago|accesoRestringido|motivoRestriccion|"email"|"rol"|deudor|al_corriente|hashContrasena|@/i
    expect(
      respuestas.filter((r) => prohibidas.test(r.body)).map((r) => r.body.slice(0, 120)),
    ).toEqual([])
    const lista = listaComentariosPrivadosRespuestaSchema.parse(respuestas[3]?.json())
    for (const comentario of lista.comentarios)
      expect(Object.keys(comentario.autor).sort()).toEqual(["administracion", "id", "nombre"])
    expect(lista.comentarios.map(({ propio }) => propio)).toEqual([false, true])
  })
})

describe("ataque ENTREGAS-01c r1: carreras", () => {
  it(
    "T-r1-1: el primer comentario de la alumna y el del maestro a la vez, sin fila (cinco vueltas): dos 201, una sola fila asignado, dos comentarios, sin P2002 ni 500",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const fallas: string[] = []
      for (let vuelta = 0; vuelta < 5; vuelta += 1) {
        const t = await tarea(e)
        const [a, m] = await Promise.all([
          comentarComoAlumno(e, t, e.t.ana, `Alumna ${String(vuelta)}`),
          comentarComoMaestro(e, t, e.ana.id, `Maestro ${String(vuelta)}`),
        ])
        if (a.statusCode !== 201 || m.statusCode !== 201)
          fallas.push(`vuelta ${String(vuelta)}: ${resultado(a)} / ${resultado(m)}`)
        const filas = await obtenerDb().entrega.findMany({ where: { tareaId: t } })
        if (filas.length !== 1 || filas[0]?.estado !== "asignado" || filas[0]?.version !== 0)
          fallas.push(
            `vuelta ${String(vuelta)}: filas ${JSON.stringify(filas.map(({ estado, version }) => [estado, version]))}`,
          )
        if ((await contarComentarios(t, e.ana.id)) !== 2)
          fallas.push(`vuelta ${String(vuelta)}: comentarios`)
      }
      expect(fallas).toEqual([])
    },
  )

  it(
    "T-r1-2: con la fila de la entrega retenida, entregar y comentar llegan en los dos órdenes: entregar 200 con versión +1 y el comentario 201, sin cambiar lo que dejó la entrega",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      for (const orden of ["entregar primero", "comentar primero"] as const) {
        const t = await tarea(e)
        const id = await crearEntregaDePrueba({
          tareaId: t,
          alumnoId: e.ana.id,
          estado: "asignado",
          version: 5,
        })
        const entregar = () =>
          pedir("POST", `${base(e.claseId, t)}/entrega`, e.t.ana, {
            archivoIds: [],
            enlaces: ["https://ejemplo.mx"],
          })
        const comentar = () => comentarComoMaestro(e, t, e.ana.id, `Durante (${orden})`)
        const operaciones =
          orden === "entregar primero" ? [entregar, comentar] : [comentar, entregar]
        const resultados = await conFilaDeEntregasRetenida({ tabla: "entregas", id }, operaciones)
        const codigos = resultados.map((r) => (r.ok ? resultado(r.valor) : "lanzó"))
        expect([orden, ...codigos]).toEqual([
          orden,
          ...(orden === "entregar primero" ? ["200", "201"] : ["201", "200"]),
        ])
        const fila = await leerEntregaDb(t, e.ana.id)
        expect([orden, fila?.estado, fila?.version]).toEqual([orden, "entregado", 6])
        expect(await contarComentarios(t, e.ana.id)).toBe(1)
      }
    },
  )

  it(
    "comentar y borrar la tarea a la vez, con la fila de la tarea retenida, en los dos órdenes: borrado primero → 204 y 404 sin comentario ni fila; comentario primero → 201 y 204, y el hilo se va con la tarea",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      for (const orden of ["borrar primero", "comentar primero"] as const) {
        const t = await tarea(e)
        const borrar = () => pedir("DELETE", base(e.claseId, t), e.t.maestro)
        const comentar = () => comentarComoAlumno(e, t, e.t.ana, `Durante (${orden})`)
        const operaciones = orden === "borrar primero" ? [borrar, comentar] : [comentar, borrar]
        const resultados = await conFilaDeEntregasRetenida({ tabla: "tareas", id: t }, operaciones)
        const codigos = resultados.map((r) => (r.ok ? resultado(r.valor) : "lanzó"))
        expect([orden, ...codigos]).toEqual([
          orden,
          ...(orden === "borrar primero" ? ["204", "404 TAREA_NO_ENCONTRADA"] : ["201", "204"]),
        ])
        expect(await obtenerDb().entrega.count({ where: { tareaId: t } })).toBe(0)
        expect(
          await obtenerDb().comentario.count({
            where: { autorId: e.ana.id, texto: `Durante (${orden})` },
          }),
        ).toBe(0)
      }
    },
  )

  it("T-r1-4: un cursor sigue sirviendo tras la baja y la reinscripción de la alumna; mientras está de baja, la ruta del maestro responde 404", async () => {
    const e = await escenario()
    const t = await tarea(e)
    for (let i = 0; i < 3; i += 1)
      idDe(await comentarComoAlumno(e, t, e.t.ana, `Comentario ${String(i)}`))
    const url = `${base(e.claseId, t)}/entregas/${e.ana.id}/comentarios`
    const primera = listaComentariosPrivadosRespuestaSchema.parse(
      (await pedir("GET", `${url}?limite=1`, e.t.maestro)).json(),
    )
    expect(primera.siguienteCursor).not.toBeNull()
    expect(
      resultado(await pedir("DELETE", `/api/clases/${e.claseId}/alumnos/${e.ana.id}`, e.t.maestro)),
    ).toBe("204")
    expect(
      resultado(await pedir("GET", `${url}?cursor=${primera.siguienteCursor ?? ""}`, e.t.maestro)),
    ).toBe("404 ALUMNO_NO_ENCONTRADO")
    await inscribirDePrueba(e.claseId, e.ana.id)
    const resto = listaComentariosPrivadosRespuestaSchema.parse(
      (await pedir("GET", `${url}?cursor=${primera.siguienteCursor ?? ""}`, e.t.maestro)).json(),
    )
    expect(resto.comentarios.map(({ texto }) => texto)).toEqual(["Comentario 1", "Comentario 2"])
  })
})

describe("ataque ENTREGAS-01c r1: paginación del hilo", () => {
  it("límite 0, negativo, 101, decimal o texto y un cursor que no es uuid: 400 VALIDACION; 100 y el cursor en mayúsculas pasan; las páginas no repiten ni saltan", async () => {
    const e = await escenario()
    const t = await tarea(e)
    for (let i = 0; i < 5; i += 1) idDe(await comentarComoAlumno(e, t, e.t.ana, `C${String(i)}`))
    const url = `${base(e.claseId, t)}/entrega/comentarios`
    const fallas: string[] = []
    for (const consulta of [
      "limite=0",
      "limite=-1",
      "limite=101",
      "limite=2.5",
      "limite=muchos",
      "cursor=abc",
    ]) {
      const r = await pedir("GET", `${url}?${consulta}`, e.t.ana)
      if (resultado(r) !== "400 VALIDACION") fallas.push(`${consulta}: ${resultado(r)}`)
    }
    expect(fallas).toEqual([])
    expect(resultado(await pedir("GET", `${url}?limite=100`, e.t.ana))).toBe("200")
    const vistos: string[] = []
    let cursor: string | null = null
    for (let pagina = 0; pagina < 5 && (pagina === 0 || cursor !== null); pagina += 1) {
      const consulta: string =
        cursor === null ? "limite=2" : `limite=2&cursor=${cursor.toUpperCase()}`
      const lista = listaComentariosPrivadosRespuestaSchema.parse(
        (await pedir("GET", `${url}?${consulta}`, e.t.ana)).json(),
      )
      vistos.push(...lista.comentarios.map(({ texto }) => texto))
      cursor = lista.siguienteCursor
    }
    expect(vistos).toEqual(["C0", "C1", "C2", "C3", "C4"])
  })
})

describe("ataque ENTREGAS-01c r1: revisión estática de 01c", () => {
  const SRC = join(import.meta.dirname, "..", "src")
  const SHARED = join(import.meta.dirname, "..", "..", "shared", "src")
  const sinComentarios = (texto: string): string =>
    texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1")
  const fuentes = readdirSync(SRC, { recursive: true, encoding: "utf8" })
    .map((ruta) => ruta.split(sep).join("/"))
    .filter(
      (ruta) =>
        ruta.endsWith(".ts") &&
        !ruta.endsWith(".test.ts") &&
        !ruta.startsWith("adapters/db/generated/"),
    )
    .map((ruta) => ({ ruta, codigo: sinComentarios(readFileSync(join(SRC, ruta), "utf8")) }))

  it("FOR KEY SHARE: una sola vez en entregas.ts (bloquearTareaParaEntregar, que comentarEnHiloPrivado reutiliza) y solo en entregas.ts y referencias.ts; instantaneaUnica: true exactamente 4 veces en el texto de entregas.ts", () => {
    expect(fuentes.length).toBeGreaterThan(50)
    expect(
      fuentes
        .filter(({ codigo }) => /FOR\s+KEY\s+SHARE/i.test(codigo))
        .map(({ ruta }) => ruta)
        .sort(),
    ).toEqual(["adapters/db/entregas.ts", "adapters/db/referencias.ts"])
    const entregas = fuentes.find(({ ruta }) => ruta === "adapters/db/entregas.ts")?.codigo ?? ""
    expect(entregas.match(/FOR\s+KEY\s+SHARE/gi)?.length).toBe(1)
    const desde = entregas.indexOf("export const comentarEnHiloPrivado =")
    expect(desde, "Precondición: comentarEnHiloPrivado existe").toBeGreaterThanOrEqual(0)
    expect(entregas.slice(desde)).toContain("bloquearTareaParaEntregar(tx")
    const crudo = readFileSync(join(SRC, "adapters", "db", "entregas.ts"), "utf8")
    expect(crudo.match(/instantaneaUnica: true/g)?.length).toBe(4)
  })

  it("el handler del hilo no compara relación ni rol, no toca Prisma ni SQL y solo encola COMENTARIO_CREADO; adapters/db no importa adapters/queue; los esquemas de respuesta del hilo son z.strictObject (T-r1-3)", () => {
    const handler =
      fuentes.find(({ ruta }) => ruta === "handlers/tareas/hilo-privado.ts")?.codigo ?? ""
    expect(handler.length, "Precondición: existe el handler del hilo").toBeGreaterThan(0)
    expect(handler).not.toMatch(
      /relacion\s*===|\.rol\b|===\s*"(admin|maestro|estudiante)"|\$queryRaw|\$executeRaw|obtenerDb|@prisma|cancelar\(/,
    )
    expect([...handler.matchAll(/encolar\(\s*(\w+)/g)].map((m) => m[1])).toEqual([
      "COLA_COMENTARIO_CREADO",
      "COLA_COMENTARIO_CREADO",
    ])
    expect(
      fuentes
        .filter(
          ({ ruta, codigo }) =>
            ruta.startsWith("adapters/db/") && /adapters\/queue|\.\.\/queue/.test(codigo),
        )
        .map(({ ruta }) => ruta),
    ).toEqual([])
    const shared = sinComentarios(readFileSync(join(SHARED, "entregas.ts"), "utf8"))
    const delHilo = [
      ...shared.matchAll(/export const (\w*[Cc]omentario\w*Schema) = (z\.\w+)\(/g),
    ].map(([, nombre, constructor]) => `${nombre ?? ""}: ${constructor ?? ""}`)
    expect(delHilo.length).toBe(3)
    expect(delHilo.filter((d) => !d.endsWith("z.strictObject"))).toEqual([])
  })
})
