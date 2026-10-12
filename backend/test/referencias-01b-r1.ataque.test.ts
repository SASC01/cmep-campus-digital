import { randomUUID } from "node:crypto"

import {
  errorApiSchema,
  listaCategoriasRespuestaSchema,
  listaPublicacionesRespuestaSchema,
  listaTemasRespuestaSchema,
  listaTrabajoRespuestaSchema,
  tareaRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { COLA_RECORDATORIO_24H, COLA_TAREA_CREADA } from "../src/core/eventos/avisos-de-clase.js"
import { crearAlmacenEnMemoria, type AlmacenEnMemoria } from "./almacen-en-memoria.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  contarPublicaciones,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  crearPublicacionDePrueba,
  inscribirDePrueba,
  leerArchivoDb,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import {
  crearCategoriaDePrueba,
  crearMaterialConTemaDePrueba,
  crearTemaDePrueba,
  cuerpoDeTarea,
  diasDespues,
  leerTareaDb,
  trabajosDeLaClase,
  trabajosDeTarea,
} from "./ayudas-tareas.js"

// Ataque del Tester, TAREAS-01b, ronda 1: las tres referencias por id del cuerpo (categoría, tema,
// archivos) en las tres escrituras, los conteos de temas y categorías con tareas reales, los tres
// "Ver más" con tareas mezcladas y la cadena de autorización de las cinco rutas en los estados que
// la lista general pide (sin token, cambio de contraseña pendiente, restringido, HEAD, clase
// inexistente frente a ajena).

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
  otraClaseId: string
  maestro: UsuarioDePrueba
  token: string
  tokenAlumno: string
}

const escenario = async (): Promise<Escenario> => {
  const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Maestra R" })
  const alumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumno R" })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  const otra = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  await inscribirDePrueba(clase.id, alumno.id, "codigo")
  return {
    claseId: clase.id,
    otraClaseId: otra.id,
    maestro,
    token: await firmarTokenDePrueba({ usuarioId: maestro.id }),
    tokenAlumno: await firmarTokenDePrueba({ usuarioId: alumno.id }),
  }
}

type Metodo = "GET" | "HEAD" | "POST" | "PUT" | "DELETE"

const peticion = (opciones: {
  method: Metodo
  url: string
  token?: string
  payload?: InjectOptions["payload"]
}): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method: opciones.method,
    url: opciones.url,
    ...(opciones.payload === undefined ? {} : { payload: opciones.payload }),
    headers: {
      ...(opciones.token === undefined ? {} : { authorization: `Bearer ${opciones.token}` }),
      ...(opciones.payload === undefined ? {} : { "content-type": "application/json" }),
    },
  })

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

const urlTareas = (claseId: string): string => `/api/clases/${claseId}/tareas`
const urlTarea = (claseId: string, tareaId: string): string => `${urlTareas(claseId)}/${tareaId}`

const crear = (e: Escenario, cambios: Record<string, unknown> = {}) =>
  peticion({
    method: "POST",
    url: urlTareas(e.claseId),
    token: e.token,
    payload: cuerpoDeTarea(cambios),
  })

// ENTREGAS-01a ronda 0 (C-6, §D-R0 «01a»; §D-2.1 y P-05 a′ del plan de ENTREGAS-01): el PUT de una
// tarea exige la `version` con que se leyó. Las ediciones de este archivo que llegan al adaptador
// mandan la 0: cada tarea se edita con éxito a lo más una vez y los rechazos (404, 409 de
// categoría, 400 de archivo) no la suben. La de «la cadena en las cinco rutas» no cambia: la cadena
// responde antes de leer el cuerpo. Lo que verifica cada caso no cambia.
const editar = (e: Escenario, tareaId: string, cambios: Record<string, unknown>) =>
  peticion({
    method: "PUT",
    url: urlTarea(e.claseId, tareaId),
    token: e.token,
    payload: cuerpoDeTarea(cambios),
  })

const idDe = (r: LightMyRequestResponse): string => {
  expect(r.statusCode, r.body).toBe(201)
  return tareaRespuestaSchema.parse(r.json()).tarea.id
}

describe("ataque TAREAS-01b r1: referencias por id al editar (categoría, tema)", () => {
  it("editar con la categoría o el tema de otra clase o inexistentes: 404 y nada cambia, ni el recordatorio aunque la fecha cambie", async () => {
    const e = await escenario()
    const categoria = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "Tareas" })
    const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad" })
    const categoriaAjena = await crearCategoriaDePrueba({ claseId: e.otraClaseId, nombre: "Ajena" })
    const temaAjeno = await crearTemaDePrueba({ claseId: e.otraClaseId, nombre: "Ajeno" })
    const tareaId = idDe(await crear(e, { categoriaId: categoria.id, temaId: tema.id }))
    const antes = await leerTareaDb(tareaId)
    const recordatorio = antes?.trabajoId
    const nuevaFecha = diasDespues(9).toISOString()
    const casos: [string, Record<string, unknown>, string][] = [
      [
        "categoría ajena",
        { categoriaId: categoriaAjena.id, temaId: tema.id },
        "CATEGORIA_NO_ENCONTRADA",
      ],
      [
        "categoría inexistente",
        { categoriaId: randomUUID(), temaId: tema.id },
        "CATEGORIA_NO_ENCONTRADA",
      ],
      ["tema ajeno", { categoriaId: categoria.id, temaId: temaAjeno.id }, "TEMA_NO_ENCONTRADO"],
      [
        "tema inexistente",
        { categoriaId: categoria.id, temaId: randomUUID() },
        "TEMA_NO_ENCONTRADO",
      ],
    ]
    for (const [etiqueta, cambios, codigo] of casos) {
      const r = await editar(e, tareaId, {
        ...cambios,
        titulo: "Cambio",
        fechaLimite: nuevaFecha,
        version: 0,
      })
      expect([etiqueta, r.statusCode, codigoDe(r)]).toEqual([etiqueta, 404, codigo])
    }
    const sinCategoria = await editar(e, tareaId, {
      categoriaId: null,
      temaId: tema.id,
      version: 0,
    })
    expect([sinCategoria.statusCode, codigoDe(sinCategoria)]).toEqual([409, "CATEGORIA_REQUERIDA"])
    const despues = await leerTareaDb(tareaId)
    expect([despues?.categoriaId, despues?.fechaLimite.getTime(), despues?.trabajoId]).toEqual([
      categoria.id,
      antes?.fechaLimite.getTime(),
      recordatorio,
    ])
    const vivos = (await trabajosDeTarea(COLA_RECORDATORIO_24H, tareaId)).filter(
      (t) => t.state === "created",
    )
    expect(vivos.map(({ id }) => id)).toEqual([recordatorio])
  })

  it("los conteos de temas y categorías cuentan las tareas creadas, movidas y borradas por la API; quitar la categoría con tareas da 409 con su nombre", async () => {
    const e = await escenario()
    const categoria = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "Exámenes" })
    const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad" })
    const t1 = idDe(await crear(e, { categoriaId: categoria.id, temaId: tema.id }))
    const t2 = idDe(await crear(e, { categoriaId: categoria.id }))
    const temas = async () =>
      listaTemasRespuestaSchema.parse(
        (
          await peticion({ method: "GET", url: `/api/clases/${e.claseId}/temas`, token: e.token })
        ).json(),
      )
    const categorias = async () =>
      listaCategoriasRespuestaSchema.parse(
        (
          await peticion({
            method: "GET",
            url: `/api/clases/${e.claseId}/categorias`,
            token: e.token,
          })
        ).json(),
      ).categorias
    expect(await temas()).toEqual({
      temas: [expect.objectContaining({ id: tema.id, elementos: 1 })],
      sinTema: 1,
    })
    expect((await categorias()).map(({ tareas }) => tareas)).toEqual([2])
    const quitar = await peticion({
      method: "PUT",
      url: `/api/clases/${e.claseId}/categorias`,
      token: e.token,
      payload: { categorias: [] },
    })
    expect([quitar.statusCode, errorApiSchema.parse(quitar.json()).error.mensaje]).toEqual([
      409,
      "«Exámenes» tiene 2 tareas. Muévelas a otra categoría antes de quitarla.",
    ])
    expect(
      (await editar(e, t2, { categoriaId: categoria.id, temaId: tema.id, version: 0 })).statusCode,
    ).toBe(200)
    expect(await temas()).toEqual({
      temas: [expect.objectContaining({ elementos: 2 })],
      sinTema: 0,
    })
    for (const id of [t1, t2]) {
      expect(
        (await peticion({ method: "DELETE", url: urlTarea(e.claseId, id), token: e.token }))
          .statusCode,
      ).toBe(204)
    }
    expect((await categorias()).map(({ tareas }) => tareas)).toEqual([0])
    expect(await temas()).toEqual({
      temas: [expect.objectContaining({ elementos: 0 })],
      sinTema: 0,
    })
  })
})

describe("ataque TAREAS-01b r1: los «Ver más» con tareas mezcladas", () => {
  it("recorrer el muro y «Trabajo de clase» de 1 en 1 trae cada elemento una sola vez, en orden, con tareas, materiales y anuncios mezclados", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad" })
    const esperadoMuro: string[] = []
    const esperadoTema: string[] = []
    for (let i = 0; i < 3; i++) {
      esperadoMuro.unshift(
        await crearPublicacionDePrueba({
          claseId: e.claseId,
          autorId: e.maestro.id,
          creadoEn: new Date(Date.now() - (10 - i) * 60_000),
        }),
      )
      const material = await crearMaterialConTemaDePrueba({
        claseId: e.claseId,
        autorId: e.maestro.id,
        temaId: tema.id,
        creadoEn: new Date(Date.now() - (5 - i) * 60_000),
      })
      esperadoTema.unshift(material)
    }
    for (let i = 0; i < 2; i++) esperadoTema.unshift(idDe(await crear(e, { temaId: tema.id })))
    const muroEsperado = [...esperadoTema.slice(0, 2), ...esperadoTema.slice(2), ...esperadoMuro]

    const recorrer = async (base: string, clave: "publicaciones" | "elementos") => {
      const vistos: string[] = []
      let cursor: string | null = null
      for (let paginas = 0; paginas < 20; paginas++) {
        const url: string = `${base}${base.includes("?") ? "&" : "?"}limite=1${cursor === null ? "" : `&cursor=${cursor}`}`
        const r = await peticion({ method: "GET", url, token: e.tokenAlumno })
        expect(r.statusCode, r.body).toBe(200)
        const cuerpo =
          clave === "publicaciones"
            ? listaPublicacionesRespuestaSchema.parse(r.json())
            : listaTrabajoRespuestaSchema.parse(r.json())
        const ids =
          "publicaciones" in cuerpo
            ? cuerpo.publicaciones.map(({ id }) => id)
            : cuerpo.elementos.map(({ id }) => id)
        vistos.push(...ids)
        cursor = cuerpo.siguienteCursor
        if (cursor === null) break
      }
      return vistos
    }
    expect(await recorrer(`/api/clases/${e.claseId}/publicaciones`, "publicaciones")).toEqual(
      muroEsperado,
    )
    expect(await recorrer(`/api/clases/${e.claseId}/trabajo?tema=${tema.id}`, "elementos")).toEqual(
      esperadoTema,
    )
    expect(await recorrer(`/api/clases/${e.claseId}/trabajo?tema=sin-tema`, "elementos")).toEqual(
      [],
    )
  })
})

describe("ataque TAREAS-01b r1: la cadena en las cinco rutas", () => {
  it("sin token 401; cambio de contraseña pendiente 403 CAMBIO_DE_CONTRASENA_REQUERIDO; restringido 403 ACCESO_RESTRINGIDO (también en HEAD); admin en clase inexistente igual que maestro en clase ajena; nada se escribe", async () => {
    const e = await escenario()
    const tareaId = idDe(await crear(e))
    const pendiente = await crearUsuarioDePrueba(idsUsuarios, {
      rol: "maestro",
      debeCambiarContrasena: true,
    })
    const restringido = await crearUsuarioDePrueba(idsUsuarios, { accesoRestringido: true })
    await inscribirDePrueba(e.claseId, restringido.id)
    const tokenPendiente = await firmarTokenDePrueba({ usuarioId: pendiente.id })
    const tokenRestringido = await firmarTokenDePrueba({ usuarioId: restringido.id })
    const rutas = (claseId: string): [Metodo, string, unknown][] => [
      ["POST", urlTareas(claseId), cuerpoDeTarea()],
      ["GET", urlTarea(claseId, tareaId), undefined],
      ["HEAD", urlTarea(claseId, tareaId), undefined],
      ["PUT", urlTarea(claseId, tareaId), cuerpoDeTarea({ titulo: "Intruso" })],
      ["DELETE", urlTarea(claseId, tareaId), undefined],
      ["GET", `/api/clases/${claseId}/trabajo?tema=sin-tema`, undefined],
      ["HEAD", `/api/clases/${claseId}/trabajo?tema=sin-tema`, undefined],
    ]
    const fallas: string[] = []
    for (const [method, url, payload] of rutas(e.claseId)) {
      const pedir = (token?: string) =>
        peticion({
          method,
          url,
          ...(token === undefined ? {} : { token }),
          ...(payload === undefined ? {} : { payload: payload as InjectOptions["payload"] }),
        })
      const sinToken = await pedir()
      const conPendiente = await pedir(tokenPendiente)
      const conRestriccion = await pedir(tokenRestringido)
      if (sinToken.statusCode !== 401)
        fallas.push(`${method} ${url} sin token: ${String(sinToken.statusCode)}`)
      if (conPendiente.statusCode !== 403)
        fallas.push(`${method} ${url} pendiente: ${String(conPendiente.statusCode)}`)
      if (conRestriccion.statusCode !== 403)
        fallas.push(`${method} ${url} restringido: ${String(conRestriccion.statusCode)}`)
      if (method !== "HEAD") {
        if (codigoDe(conPendiente) !== "CAMBIO_DE_CONTRASENA_REQUERIDO")
          fallas.push(`${method} ${url} pendiente: ${codigoDe(conPendiente)}`)
        if (codigoDe(conRestriccion) !== "ACCESO_RESTRINGIDO")
          fallas.push(`${method} ${url} restringido: ${codigoDe(conRestriccion)}`)
      }
    }
    const tokenAdmin = await tokenDelAdminDePrueba()
    const otroMaestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
    const tokenOtro = await firmarTokenDePrueba({ usuarioId: otroMaestro.id })
    const inexistente = randomUUID()
    for (const [[method, url, payload], [, urlAjena]] of rutas(inexistente).map(
      (ruta, i) => [ruta, rutas(e.claseId)[i] ?? ruta] as const,
    )) {
      if (method === "HEAD") continue
      const conPayload =
        payload === undefined ? {} : { payload: payload as InjectOptions["payload"] }
      const admin = await peticion({ method, url, token: tokenAdmin, ...conPayload })
      const ajena = await peticion({ method, url: urlAjena, token: tokenOtro, ...conPayload })
      if (admin.statusCode !== 403 || admin.body !== ajena.body) {
        fallas.push(
          `${method} ${url}: admin ${String(admin.statusCode)} ${admin.body} / ajena ${ajena.body}`,
        )
      }
    }
    expect(fallas).toEqual([])
    const fila = await leerTareaDb(tareaId)
    expect(fila).not.toBeNull()
    const vista = tareaRespuestaSchema.parse(
      (await peticion({ method: "GET", url: urlTarea(e.claseId, tareaId), token: e.token })).json(),
    )
    expect(vista.tarea.titulo).toBe("Ensayo del tema 3")
  })
})

describe("ataque TAREAS-01b r1: el mismo archivo pendiente en dos escrituras a la vez", () => {
  it(
    "dos creaciones y, aparte, dos ediciones que reclaman el mismo pendiente: una gana, la otra responde 400, y la que pierde no deja tarea, trabajos ni cambios",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const subido = async () => {
        const archivo = await crearArchivoDePrueba({ claseId: e.claseId, subidoPor: e.maestro.id })
        almacen.subir(archivo.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
        return archivo.id
      }
      const x = await subido()
      const creaciones = await Promise.all([
        crear(e, { titulo: "Primera", archivoIds: [x] }),
        crear(e, { titulo: "Segunda", archivoIds: [x] }),
      ])
      expect(creaciones.map((r) => r.statusCode).sort()).toEqual([201, 400])
      expect(await contarPublicaciones(e.claseId)).toBe(1)
      const creada = creaciones.find((r) => r.statusCode === 201) ?? creaciones[0]!
      const ganadora = idDe(creada)
      // PA-09 (ronda 1): cuál de las dos creaciones gana no está definido; el título esperado es el de
      // la que respondió 201, sea "Primera" o "Segunda".
      const tituloGanador = tareaRespuestaSchema.parse(creada.json()).tarea.titulo
      expect(["Primera", "Segunda"]).toContain(tituloGanador)
      expect((await leerArchivoDb(x))?.publicacionId).toBe(ganadora)
      expect((await trabajosDeLaClase(COLA_TAREA_CREADA, e.claseId)).length).toBe(1)

      const otra = idDe(await crear(e, { titulo: "Otra" }))
      const y = await subido()
      const ediciones = await Promise.all([
        editar(e, ganadora, { titulo: "Edita 1", archivoIds: [x, y], version: 0 }),
        editar(e, otra, { titulo: "Edita 2", archivoIds: [y], version: 0 }),
      ])
      expect(ediciones.map((r) => r.statusCode).sort()).toEqual([200, 400])
      const dueña = (await leerArchivoDb(y))?.publicacionId
      expect([ganadora, otra]).toContain(dueña)
      const perdedora = dueña === ganadora ? otra : ganadora
      const vista = tareaRespuestaSchema.parse(
        (
          await peticion({ method: "GET", url: urlTarea(e.claseId, perdedora), token: e.token })
        ).json(),
      ).tarea
      expect(vista.titulo).toBe(perdedora === ganadora ? tituloGanador : "Otra")
    },
  )
})
