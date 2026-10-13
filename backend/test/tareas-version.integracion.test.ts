import { errorApiSchema, tareaDetalleSchema, tareaRespuestaSchema } from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { COLA_RECORDATORIO_24H } from "../src/core/eventos/avisos-de-clase.js"
import { crearAlmacenEnMemoria, type AlmacenEnMemoria } from "./almacen-en-memoria.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  crearPublicacionDePrueba,
  inscribirDePrueba,
  leerArchivoDb,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { formadasDetrasDe } from "./ayudas-concurrencia.js"
import {
  crearTemaDePrueba,
  cuerpoDeTarea,
  diasDespues,
  leerTareaDb,
  trabajosDeTarea,
} from "./ayudas-tareas.js"

// ENTREGAS-01a (PR-1A03 a PR-1A10): la versión de una tarea como precondición del PUT (P-05 a′,
// §D-2.1), mover de tema sube la versión (§D-2.3) y "Cómo se entrega" (requiereAdjuntos, P-03 a).

const almacen: AlmacenEnMemoria = crearAlmacenEnMemoria()
let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

interface Escenario {
  claseId: string
  maestro: UsuarioDePrueba
  tokenMaestro: string
  tokenOtroMaestro: string
  tokenAlumno: string
  tokenAdmin: string
}

// Una clase con dos maestros (el autor y otro que sigue en la clase) y un alumno inscrito.
const escenario = async (): Promise<Escenario> => {
  const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Maestra V" })
  const otro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Maestro W" })
  const alumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumno V" })
  const clase = await crearClaseDePrueba(idsClases, {
    maestroId: maestro.id,
    maestroIds: [maestro.id, otro.id],
  })
  await inscribirDePrueba(clase.id, alumno.id, "codigo")
  return {
    claseId: clase.id,
    maestro,
    tokenMaestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
    tokenOtroMaestro: await firmarTokenDePrueba({ usuarioId: otro.id }),
    tokenAlumno: await firmarTokenDePrueba({ usuarioId: alumno.id }),
    tokenAdmin: await tokenDelAdminDePrueba(),
  }
}

const peticion = (opciones: {
  method: "GET" | "POST" | "PUT"
  url: string
  token: string
  payload?: InjectOptions["payload"]
}): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method: opciones.method,
    url: opciones.url,
    ...(opciones.payload === undefined ? {} : { payload: opciones.payload }),
    headers: { authorization: `Bearer ${opciones.token}` },
  })

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

const urlTareas = (claseId: string): string => `/api/clases/${claseId}/tareas`
const urlTarea = (claseId: string, id: string): string => `${urlTareas(claseId)}/${id}`

const crear = (e: Escenario, cambios: Record<string, unknown> = {}, token = e.tokenMaestro) =>
  peticion({ method: "POST", url: urlTareas(e.claseId), token, payload: cuerpoDeTarea(cambios) })

const crearId = async (e: Escenario, cambios: Record<string, unknown> = {}): Promise<string> => {
  const respuesta = await crear(e, cambios)
  expect(respuesta.statusCode, respuesta.body).toBe(201)
  return tareaRespuestaSchema.parse(respuesta.json()).tarea.id
}

const editar = (
  e: Escenario,
  id: string,
  cuerpo: Record<string, unknown>,
  token = e.tokenMaestro,
) => peticion({ method: "PUT", url: urlTarea(e.claseId, id), token, payload: cuerpo })

const mover = (e: Escenario, publicacionId: string, temaId: string | null) =>
  peticion({
    method: "PUT",
    url: `/api/clases/${e.claseId}/publicaciones/${publicacionId}/tema`,
    token: e.tokenMaestro,
    payload: { temaId },
  })

const detalleDe = (respuesta: LightMyRequestResponse) =>
  tareaRespuestaSchema.parse(respuesta.json()).tarea

const archivoSubido = async (e: Escenario, nombre: string) => {
  const archivo = await crearArchivoDePrueba({
    claseId: e.claseId,
    subidoPor: e.maestro.id,
    nombre,
  })
  almacen.subir(archivo.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
  return archivo
}

const sinErrorDeServidor = (respuestas: readonly (LightMyRequestResponse | null)[]): void => {
  for (const respuesta of respuestas) {
    expect(respuesta, "Precondición: toda operación responde por la API").not.toBeNull()
    expect(respuesta?.statusCode, respuesta?.body).toBeLessThan(500)
  }
}

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

// Retiene la fila de `tareas` con FOR UPDATE (choca con el FOR NO KEY UPDATE de editarTarea y con el
// UPDATE de versión de moverATema) y lanza las operaciones en orden fijo: cada una se da por formada
// solo cuando espera esa fila (formadasDetrasDe, CHORE-02). La ayuda compartida conFilaRetenida no
// admite la tabla `tareas` y está en "No se toca", así que el mismo método vive aquí. El timeout de la
// transacción (30 s) es mayor que la espera más larga (10 s por operación).
const conTareaRetenida = async (
  tareaId: string,
  operaciones: readonly (() => Promise<LightMyRequestResponse>)[],
): Promise<LightMyRequestResponse[]> => {
  const lanzadas: Promise<LightMyRequestResponse>[] = []
  await obtenerDb().$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM tareas WHERE id = ${tareaId}::uuid FOR UPDATE`
      const [propio] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
      if (!propio) throw new Error("Precondición: no se obtuvo el pid de la transacción retenedora")
      for (const [indice, operacion] of operaciones.entries()) {
        let terminada = false
        const lanzada = operacion()
        lanzada.then(
          () => (terminada = true),
          () => (terminada = true),
        )
        lanzadas.push(lanzada)
        const limite = Date.now() + 10_000
        let formada = false
        while (!formada && !terminada && Date.now() < limite) {
          formada = (await formadasDetrasDe(propio.pid)) >= indice + 1
          if (!formada) await esperar(25)
        }
        expect(
          formada,
          `Precondición: la operación ${String(indice + 1)} no se formó detrás de la tarea retenida en 10 s`,
        ).toBe(true)
      }
      await esperar(100)
    },
    { timeout: 30_000, maxWait: 5_000 },
  )
  return Promise.all(lanzadas)
}

describe("versión de una tarea (PR-1A03 a PR-1A06)", () => {
  it("PR-1A03: con la versión vigente el PUT responde 200, la versión sube en 1 y los cambios quedan", async () => {
    const e = await escenario()
    const id = await crearId(e)

    const respuesta = await editar(
      e,
      id,
      cuerpoDeTarea({ titulo: "Nuevo título", instrucciones: "Otras", version: 0 }),
    )

    expect(respuesta.statusCode, respuesta.body).toBe(200)
    expect(detalleDe(respuesta)).toMatchObject({ titulo: "Nuevo título", version: 1 })
    const fila = await leerTareaDb(id)
    expect(fila?.version).toBe(1)
    const segunda = await editar(e, id, cuerpoDeTarea({ titulo: "Tercero", version: 1 }))
    expect(segunda.statusCode, segunda.body).toBe(200)
    expect(detalleDe(segunda).version).toBe(2)
  })

  it("PR-1A03: con una versión vieja responde 409 TAREA_MODIFICADA y no cambia título, instrucciones, fecha, criterios, archivos, tema, trabajo_id ni el RECORDATORIO_24H", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    const otroTema = await crearTemaDePrueba({ claseId: e.claseId, orden: 1 })
    const publicado = await archivoSubido(e, "publicado.pdf")
    const fecha = diasDespues(5).toISOString()
    const id = await crearId(e, {
      titulo: "Original",
      instrucciones: "Originales",
      fechaLimite: fecha,
      temaId: tema.id,
      rubrica: [{ criterio: "Claridad", puntosMax: 10 }],
      archivoIds: [publicado.id],
    })
    // Otra persona guarda primero: la versión pasa a 1.
    const primera = await editar(
      e,
      id,
      cuerpoDeTarea({
        titulo: "Guardado primero",
        instrucciones: "Originales",
        fechaLimite: fecha,
        temaId: tema.id,
        rubrica: [{ criterio: "Claridad", puntosMax: 10 }],
        archivoIds: [publicado.id],
        version: 0,
      }),
    )
    expect(primera.statusCode, primera.body).toBe(200)
    const antes = await leerTareaDb(id)
    const criteriosAntes = await obtenerDb().criterioRubrica.findMany({
      where: { tareaId: id },
      orderBy: { orden: "asc" },
    })
    const recordatoriosAntes = await trabajosDeTarea(COLA_RECORDATORIO_24H, id)
    const nuevo = await archivoSubido(e, "nuevo.pdf")

    const respuesta = await editar(
      e,
      id,
      cuerpoDeTarea({
        titulo: "Con la versión vieja",
        instrucciones: "Pisadas",
        fechaLimite: diasDespues(9).toISOString(),
        temaId: otroTema.id,
        rubrica: [{ criterio: "Otro", puntosMax: 30 }],
        archivoIds: [nuevo.id],
        version: 0,
      }),
    )

    expect(respuesta.statusCode, respuesta.body).toBe(409)
    expect(codigoDe(respuesta)).toBe("TAREA_MODIFICADA")
    expect(errorApiSchema.parse(respuesta.json()).error.mensaje).toBe(
      "Otra persona guardó cambios en esta tarea mientras la editabas. Tus cambios no se guardaron: vuelve a hacerlos sobre la versión actual.",
    )
    expect(await leerTareaDb(id)).toEqual(antes)
    const publicacion = await obtenerDb().publicacion.findUnique({
      where: { id },
      select: { titulo: true, texto: true, temaId: true },
    })
    expect(publicacion).toEqual({
      titulo: "Guardado primero",
      texto: "Originales",
      temaId: tema.id,
    })
    expect(
      await obtenerDb().criterioRubrica.findMany({
        where: { tareaId: id },
        orderBy: { orden: "asc" },
      }),
    ).toEqual(criteriosAntes)
    expect(await leerArchivoDb(publicado.id)).toMatchObject({
      estado: "confirmado",
      publicacionId: id,
    })
    expect(await leerArchivoDb(nuevo.id)).toMatchObject({
      estado: "pendiente",
      publicacionId: null,
    })
    expect(await trabajosDeTarea(COLA_RECORDATORIO_24H, id)).toEqual(recordatoriosAntes)
    expect(recordatoriosAntes.filter((t) => t.state === "created").map((t) => t.id)).toEqual([
      antes?.trabajoId,
    ])
  })

  it("PR-1A04: dos PUT simultáneos con la misma versión (fila de tareas retenida) dan exactamente un 200 y un 409; la versión final es la de partida + 1", async () => {
    const e = await escenario()
    const id = await crearId(e)

    const respuestas = await conTareaRetenida(id, [
      () => editar(e, id, cuerpoDeTarea({ titulo: "Pestaña A", version: 0 })),
      () => editar(e, id, cuerpoDeTarea({ titulo: "Pestaña B", version: 0 })),
    ])

    sinErrorDeServidor(respuestas)
    expect(respuestas.map((r) => r.statusCode)).toEqual([200, 409])
    expect(codigoDe(respuestas[1] as LightMyRequestResponse)).toBe("TAREA_MODIFICADA")
    expect(await leerTareaDb(id)).toMatchObject({ version: 1 })
    const publicacion = await obtenerDb().publicacion.findUnique({
      where: { id },
      select: { titulo: true },
    })
    expect(publicacion?.titulo).toBe("Pestaña A")
  })

  it("PR-1A05: una tarea de otra clase responde 404 aunque la versión sea vieja", async () => {
    const e = await escenario()
    const otra = await escenario()
    const ajena = await crearId(otra)
    await editar(otra, ajena, cuerpoDeTarea({ version: 0 }), otra.tokenMaestro)

    const respuesta = await editar(e, ajena, cuerpoDeTarea({ version: 0 }))

    expect(respuesta.statusCode, respuesta.body).toBe(404)
    expect(codigoDe(respuesta)).toBe("TAREA_NO_ENCONTRADA")
  })

  it("PR-1A05: el maestro que no puede editar recibe 403 EDICION_NO_PERMITIDA aunque la versión sea vieja", async () => {
    const e = await escenario()
    const id = await crearId(e)
    await editar(e, id, cuerpoDeTarea({ version: 0 }))

    const respuesta = await editar(e, id, cuerpoDeTarea({ version: 0 }), e.tokenOtroMaestro)

    expect(respuesta.statusCode, respuesta.body).toBe(403)
    expect(codigoDe(respuesta)).toBe("EDICION_NO_PERMITIDA")
    expect(await leerTareaDb(id)).toMatchObject({ version: 1 })
  })

  it("PR-1A05: con una versión vieja y una fecha límite inválida responde 409 (la versión se mira antes)", async () => {
    const e = await escenario()
    const id = await crearId(e)
    await editar(e, id, cuerpoDeTarea({ version: 0 }))

    const respuesta = await editar(
      e,
      id,
      cuerpoDeTarea({ fechaLimite: new Date(Date.now() - 3_600_000).toISOString(), version: 0 }),
    )

    expect(respuesta.statusCode, respuesta.body).toBe(409)
    expect(codigoDe(respuesta)).toBe("TAREA_MODIFICADA")
  })

  it("PR-1A06: version ausente, null, negativa, decimal, cadena o mayor que MAX_SAFE_INTEGER responde 400 VALIDACION sin escribir", async () => {
    const e = await escenario()
    const id = await crearId(e, { titulo: "Sin tocar" })
    const antes = await leerTareaDb(id)
    const invalidas: Record<string, unknown>[] = [
      {},
      { version: null },
      { version: -1 },
      { version: 0.5 },
      { version: "0" },
      { version: Number.MAX_SAFE_INTEGER + 1 },
    ]

    for (const cambios of invalidas) {
      const respuesta = await editar(e, id, cuerpoDeTarea({ titulo: "Cambiado", ...cambios }))
      expect(respuesta.statusCode, JSON.stringify(cambios)).toBe(400)
      expect(codigoDe(respuesta), JSON.stringify(cambios)).toBe("VALIDACION")
    }
    expect(await leerTareaDb(id)).toEqual(antes)
    const publicacion = await obtenerDb().publicacion.findUnique({
      where: { id },
      select: { titulo: true },
    })
    expect(publicacion?.titulo).toBe("Sin tocar")
  })

  it("PR-1A06: una version enviada al crear se descarta y la tarea nace con version 0", async () => {
    const e = await escenario()

    const respuesta = await crear(e, { version: 7 })

    expect(respuesta.statusCode, respuesta.body).toBe(201)
    expect(detalleDe(respuesta).version).toBe(0)
    expect(await leerTareaDb(detalleDe(respuesta).id)).toMatchObject({ version: 0 })
  })
})

describe("mover de tema sube la versión (PR-1A07 y PR-1A08)", () => {
  it("PR-1A07: mover una tarea de tema sube su versión en 1 y un PUT con la versión de antes responde 409", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    const id = await crearId(e)

    const movida = await mover(e, id, tema.id)

    expect(movida.statusCode, movida.body).toBe(200)
    expect(await leerTareaDb(id)).toMatchObject({ version: 1 })
    const respuesta = await editar(e, id, cuerpoDeTarea({ titulo: "Sin el tema", version: 0 }))
    expect(respuesta.statusCode, respuesta.body).toBe(409)
    expect(codigoDe(respuesta)).toBe("TAREA_MODIFICADA")
    const publicacion = await obtenerDb().publicacion.findUnique({
      where: { id },
      select: { temaId: true },
    })
    expect(publicacion?.temaId).toBe(tema.id)
    const conLaNueva = await editar(
      e,
      id,
      cuerpoDeTarea({ titulo: "Con el tema", temaId: tema.id, version: 1 }),
    )
    expect(conLaNueva.statusCode, conLaNueva.body).toBe(200)
  })

  it("PR-1A07: mover un material no toca ninguna fila de tareas", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    await crearId(e)
    await crearId(e)
    const material = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      tipo: "material",
    })
    const antes = await obtenerDb().tarea.findMany({
      where: { claseId: e.claseId },
      orderBy: { id: "asc" },
    })
    expect(antes, "Precondición: la clase tiene dos tareas").toHaveLength(2)

    const movida = await mover(e, material, tema.id)

    expect(movida.statusCode, movida.body).toBe(200)
    expect(
      await obtenerDb().tarea.findMany({ where: { claseId: e.claseId }, orderBy: { id: "asc" } }),
    ).toEqual(antes)
  })

  it("PR-1A08: edición y movimiento simultáneos: con la edición primero, los dos responden 200 y la versión final es 2, sin deadlock ni 500", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    const id = await crearId(e)

    const [edicion, movimiento] = await conTareaRetenida(id, [
      () => editar(e, id, cuerpoDeTarea({ titulo: "Editada", version: 0 })),
      () => mover(e, id, tema.id),
    ])

    sinErrorDeServidor([edicion ?? null, movimiento ?? null])
    expect(edicion?.statusCode, edicion?.body).toBe(200)
    expect(movimiento?.statusCode, movimiento?.body).toBe(200)
    expect(await leerTareaDb(id)).toMatchObject({ version: 2 })
  })

  it("PR-1A08: edición y movimiento simultáneos: con el movimiento primero, la edición posterior recibe 409, sin deadlock ni 500", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    const id = await crearId(e)

    const [movimiento, edicion] = await conTareaRetenida(id, [
      () => mover(e, id, tema.id),
      () => editar(e, id, cuerpoDeTarea({ titulo: "Editada tarde", version: 0 })),
    ])

    sinErrorDeServidor([movimiento ?? null, edicion ?? null])
    expect(movimiento?.statusCode, movimiento?.body).toBe(200)
    expect(edicion?.statusCode, edicion?.body).toBe(409)
    expect(codigoDe(edicion as LightMyRequestResponse)).toBe("TAREA_MODIFICADA")
    expect(await leerTareaDb(id)).toMatchObject({ version: 1 })
    const publicacion = await obtenerDb().publicacion.findUnique({
      where: { id },
      select: { titulo: true, temaId: true },
    })
    expect(publicacion?.temaId).toBe(tema.id)
    expect(publicacion?.titulo).not.toBe("Editada tarde")
  })
})

describe("cómo se entrega y llaves de la respuesta (PR-1A09 y PR-1A10)", () => {
  it("PR-1A09: crear sin requiereAdjuntos da true; false se guarda y se devuelve; editar lo cambia", async () => {
    const e = await escenario()

    const porDefecto = await crear(e)
    const sinAdjuntos = await crear(e, { requiereAdjuntos: false })

    expect(porDefecto.statusCode, porDefecto.body).toBe(201)
    expect(detalleDe(porDefecto).requiereAdjuntos).toBe(true)
    expect(sinAdjuntos.statusCode, sinAdjuntos.body).toBe(201)
    expect(detalleDe(sinAdjuntos).requiereAdjuntos).toBe(false)
    expect(await leerTareaDb(detalleDe(sinAdjuntos).id)).toMatchObject({ requiereAdjuntos: false })

    const id = detalleDe(porDefecto).id
    const editada = await editar(e, id, cuerpoDeTarea({ requiereAdjuntos: false, version: 0 }))
    expect(editada.statusCode, editada.body).toBe(200)
    expect(detalleDe(editada).requiereAdjuntos).toBe(false)
    const deVuelta = await editar(e, id, cuerpoDeTarea({ requiereAdjuntos: true, version: 1 }))
    expect(detalleDe(deVuelta).requiereAdjuntos).toBe(true)
    expect(await leerTareaDb(id)).toMatchObject({ requiereAdjuntos: true, version: 2 })
  })

  it("PR-1A09: el GET del alumno, del maestro y del admin devuelve requiereAdjuntos", async () => {
    const e = await escenario()
    const id = await crearId(e, { requiereAdjuntos: false })

    for (const token of [e.tokenAlumno, e.tokenMaestro, e.tokenAdmin]) {
      const respuesta = await peticion({ method: "GET", url: urlTarea(e.claseId, id), token })
      expect(respuesta.statusCode, respuesta.body).toBe(200)
      expect(detalleDe(respuesta).requiereAdjuntos).toBe(false)
    }
  })

  it("PR-1A09: un requiereAdjuntos que no es booleano responde 400 al crear y al editar, sin escribir", async () => {
    const e = await escenario()
    const id = await crearId(e)
    const antes = await obtenerDb().tarea.count({ where: { claseId: e.claseId } })

    for (const valor of ["no", 0, null, "false"]) {
      const creada = await crear(e, { requiereAdjuntos: valor })
      expect(creada.statusCode, JSON.stringify(valor)).toBe(400)
      expect(codigoDe(creada)).toBe("VALIDACION")
      const editada = await editar(e, id, cuerpoDeTarea({ requiereAdjuntos: valor, version: 0 }))
      expect(editada.statusCode, JSON.stringify(valor)).toBe(400)
      expect(codigoDe(editada)).toBe("VALIDACION")
    }
    expect(await obtenerDb().tarea.count({ where: { claseId: e.claseId } })).toBe(antes)
    expect(await leerTareaDb(id)).toMatchObject({ requiereAdjuntos: true, version: 0 })
  })

  it("PR-1A10: crear, ver y editar responden exactamente las llaves de tareaDetalleSchema, sin estado de pago, correo, rol ni trabajo_id, para el alumno, el maestro y el admin", async () => {
    const e = await escenario()
    const llaves = Object.keys(tareaDetalleSchema.shape).sort()
    const prohibidas = ["estadoPago", "accesoRestringido", "email", "rol", "trabajoId"]
    const revisar = (respuesta: LightMyRequestResponse, etiqueta: string): void => {
      expect(respuesta.statusCode, `${etiqueta}: ${respuesta.body}`).toBeLessThan(300)
      const { tarea } = respuesta.json() as { tarea: Record<string, unknown> }
      expect(Object.keys(tarea).sort(), etiqueta).toEqual(llaves)
      for (const prohibida of prohibidas) {
        expect(respuesta.body, `${etiqueta}: ${prohibida}`).not.toContain(`"${prohibida}"`)
      }
      expect(respuesta.body, etiqueta).not.toContain("@")
    }

    const delMaestro = await crear(e)
    revisar(delMaestro, "crear (maestro)")
    const idMaestro = detalleDe(delMaestro).id
    const delAdmin = await crear(e, {}, e.tokenAdmin)
    revisar(delAdmin, "crear (admin)")
    const idAdmin = detalleDe(delAdmin).id

    for (const [token, etiqueta] of [
      [e.tokenAlumno, "ver (alumno)"],
      [e.tokenMaestro, "ver (maestro)"],
      [e.tokenAdmin, "ver (admin)"],
    ] as const) {
      revisar(
        await peticion({ method: "GET", url: urlTarea(e.claseId, idMaestro), token }),
        etiqueta,
      )
    }
    revisar(await editar(e, idMaestro, cuerpoDeTarea({ version: 0 })), "editar (maestro)")
    revisar(await editar(e, idAdmin, cuerpoDeTarea({ version: 0 }), e.tokenAdmin), "editar (admin)")
  })
})
