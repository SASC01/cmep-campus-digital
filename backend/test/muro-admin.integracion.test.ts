import { randomUUID } from "node:crypto"

import {
  comentarioRespuestaSchema,
  errorApiSchema,
  FIRMA_ADMINISTRACION,
  listaComentariosRespuestaSchema,
  listaPublicacionesRespuestaSchema,
  personasRespuestaSchema,
  publicacionRespuestaSchema,
  solicitarSubidaRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { crearPublicacion } from "../src/adapters/db/index.js"
import { buscarTrabajo, encolar } from "../src/adapters/queue/index.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  COLA_MATERIAL_CREADO,
  COLA_PUBLICACION_CREADA,
} from "../src/core/eventos/avisos-de-clase.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import {
  borrarMovimientosYClasesDePrueba,
  contarComentarios,
  contarPublicaciones,
  crearAlumnoDePrueba,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  crearComentarioDePrueba,
  crearPublicacionDePrueba,
  idDelAdminDePrueba,
  inscribirDePrueba,
  leerArchivoDb,
  leerComentarioDb,
  leerPublicacionDb,
  leerTrabajosDeCola,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
const almacen = crearAlmacenEnMemoria()
let adminId = ""
let tokenAdmin = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen })
  await app.ready()
  adminId = await idDelAdminDePrueba()
  tokenAdmin = await tokenDelAdminDePrueba()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

const peticion = (opciones: {
  method: "GET" | "POST" | "DELETE"
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

const urlPublicaciones = (claseId: string): string => `/api/clases/${claseId}/publicaciones`
const urlPublicacion = (claseId: string, publicacionId: string): string =>
  `${urlPublicaciones(claseId)}/${publicacionId}`
const urlComentarios = (claseId: string, publicacionId: string): string =>
  `${urlPublicacion(claseId, publicacionId)}/comentarios`
const urlComentario = (claseId: string, publicacionId: string, comentarioId: string): string =>
  `${urlComentarios(claseId, publicacionId)}/${comentarioId}`

const maestroDePrueba = (nombre = `Maestro ${randomUUID().slice(0, 6)}`) =>
  crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre })

interface Escenario {
  claseId: string
  a: UsuarioDePrueba
  b: UsuarioDePrueba
  alumno1: UsuarioDePrueba
  alumno2: UsuarioDePrueba
  tokenA: string
  tokenB: string
  tokenAlumno1: string
  tokenAlumno2: string
}

// Una clase con dos maestros (A y B) y dos alumnos inscritos.
const escenario = async (): Promise<Escenario> => {
  const a = await maestroDePrueba()
  const b = await maestroDePrueba()
  const clase = await crearClaseDePrueba(idsClases, { maestroId: a.id, maestroIds: [a.id, b.id] })
  const alumno1 = await crearAlumnoDePrueba(idsUsuarios, { nombre: "Alumno Uno" })
  const alumno2 = await crearAlumnoDePrueba(idsUsuarios, { nombre: "Alumno Dos" })
  await inscribirDePrueba(clase.id, alumno1.id, "codigo")
  await inscribirDePrueba(clase.id, alumno2.id, "codigo")
  return {
    claseId: clase.id,
    a,
    b,
    alumno1,
    alumno2,
    tokenA: await tokenDe(a),
    tokenB: await tokenDe(b),
    tokenAlumno1: await tokenDe(alumno1),
    tokenAlumno2: await tokenDe(alumno2),
  }
}

const publicacionDe = (e: Escenario, autorId: string): Promise<string> =>
  crearPublicacionDePrueba({ claseId: e.claseId, autorId })

// Quién puede publicar por la API y cómo se firma lo que sale.
const claves = (valor: unknown): string[] => {
  const encontradas: string[] = []
  const pila: unknown[] = [valor]
  while (pila.length > 0) {
    const actual = pila.pop()
    if (actual === null || typeof actual !== "object") continue
    for (const [clave, hijo] of Object.entries(actual)) {
      encontradas.push(clave)
      pila.push(hijo)
    }
  }
  return encontradas
}

describe("el admin publica en el muro (CLASES-02b)", () => {
  it("PR-2B03: el admin publica un anuncio y un material, con y sin adjuntos suyos: 201, autor firmado «Administración», puedeBorrar true y un aviso con solo ids", async () => {
    const e = await escenario()
    const admin = await obtenerDb().usuario.findUniqueOrThrow({ where: { id: adminId } })
    expect(admin.nombre, "Precondición: la cuenta del admin no se llama como la firma").not.toBe(
      FIRMA_ADMINISTRACION,
    )

    // El adjunto lo solicita el propio admin por la API y "sube" el objeto al almacén en memoria.
    const solicitud = await peticion({
      method: "POST",
      url: `/api/clases/${e.claseId}/archivos`,
      token: tokenAdmin,
      payload: { nombre: "guia.pdf", tipo: "application/pdf", tamano: 2000 },
    })
    expect(solicitud.statusCode, solicitud.body).toBe(201)
    const { archivo } = solicitarSubidaRespuestaSchema.parse(solicitud.json())
    almacen.subir(`materiales/${e.claseId}/${archivo.id}`, {
      tamano: 2000,
      tipo: "application/pdf",
    })

    const casos = [
      { payload: { tipo: "anuncio", texto: "Aviso institucional" }, cola: COLA_PUBLICACION_CREADA },
      {
        payload: { tipo: "material", titulo: "Reglamento", texto: "Léelo" },
        cola: COLA_MATERIAL_CREADO,
      },
      {
        payload: { tipo: "material", titulo: "Con guía", archivoIds: [archivo.id] },
        cola: COLA_MATERIAL_CREADO,
      },
    ] as const
    const ids: string[] = []
    for (const caso of casos) {
      const respuesta = await peticion({
        method: "POST",
        url: urlPublicaciones(e.claseId),
        token: tokenAdmin,
        payload: caso.payload,
      })
      expect(respuesta.statusCode, respuesta.body).toBe(201)
      const { publicacion } = publicacionRespuestaSchema.parse(respuesta.json())
      ids.push(publicacion.id)
      expect(publicacion.autor).toEqual({
        id: adminId,
        nombre: FIRMA_ADMINISTRACION,
        administracion: true,
      })
      expect(publicacion.puedeBorrar).toBe(true)
      expect(respuesta.body).not.toContain(admin.email)
      expect(respuesta.body).not.toContain(admin.nombre)
      expect(clavesProhibidasEn(respuesta.body)).toEqual([])

      // Un aviso por publicación, con solo ids, en la cola que le toca.
      const trabajos = await leerTrabajosDeCola(caso.cola, "publicacionId", publicacion.id)
      expect(trabajos).toHaveLength(1)
      expect(trabajos[0]?.id).toBe(publicacion.id)
      expect(JSON.stringify(trabajos[0]?.datos)).not.toContain(admin.nombre)
      expect(JSON.stringify(trabajos[0]?.datos)).not.toContain(admin.email)
    }
    expect((await leerArchivoDb(archivo.id))?.estado).toBe("confirmado")
    expect(await contarPublicaciones(e.claseId)).toBe(3)

    // El estudiante la ve con la misma firma y no la puede borrar; el maestro de la clase, tampoco.
    for (const [token, perspectiva] of [
      [e.tokenAlumno1, "estudiante"],
      [e.tokenA, "maestro de la clase"],
    ] as const) {
      const lista = await peticion({ method: "GET", url: urlPublicaciones(e.claseId), token })
      const { publicaciones } = listaPublicacionesRespuestaSchema.parse(lista.json())
      expect(publicaciones, perspectiva).toHaveLength(3)
      for (const publicacion of publicaciones) {
        expect(publicacion.autor, perspectiva).toEqual({
          id: adminId,
          nombre: FIRMA_ADMINISTRACION,
          administracion: true,
        })
        expect(publicacion.puedeBorrar, perspectiva).toBe(false)
      }
      expect(lista.body).not.toContain(admin.email)
    }
  })

  it("PR-2B03: una publicación del admin revertida no deja ni la publicación ni el trabajo", async () => {
    const e = await escenario()
    const id = randomUUID()

    await expect(
      crearPublicacion(
        {
          id,
          claseId: e.claseId,
          autorId: adminId,
          tipo: "anuncio",
          titulo: null,
          texto: "Se revierte",
        },
        async (sql) => {
          await encolar(
            COLA_PUBLICACION_CREADA,
            { publicacionId: id, claseId: e.claseId },
            { id, sql },
          )
          throw new Error("fallo deliberado después de encolar")
        },
      ),
    ).rejects.toThrow("fallo deliberado después de encolar")

    expect(await leerPublicacionDb(id)).toBeNull()
    expect(await buscarTrabajo(COLA_PUBLICACION_CREADA, id)).toBeNull()
  })
})

const clavesProhibidasEn = (cuerpo: string): string[] =>
  claves(JSON.parse(cuerpo)).filter((clave) =>
    ["rol", "email", "estadoPago", "estado_pago", "accesoRestringido"].includes(clave),
  )

describe("DELETE de publicaciones con autoría (CLASES-02b)", () => {
  it("PR-2B04: el maestro borra la suya; la del otro maestro y la del admin responden 403 BORRADO_NO_PERMITIDO sin tocar nada; el admin borra la de cualquier maestro y sus archivos quedan descartados; inexistente o de otra clase, 404", async () => {
    const e = await escenario()
    const otra = await escenario()
    const propia = await publicacionDe(e, e.a.id)
    const delOtroMaestro = await publicacionDe(e, e.b.id)
    const delAdmin = await publicacionDe(e, adminId)
    const comentarioDelAdmin = await crearComentarioDePrueba({
      publicacionId: delAdmin,
      autorId: e.alumno1.id,
    })
    const archivoDelAdmin = await crearArchivoDePrueba({
      claseId: e.claseId,
      subidoPor: adminId,
      estado: "confirmado",
      publicacionId: delAdmin,
    })
    const archivoDelOtro = await crearArchivoDePrueba({
      claseId: e.claseId,
      subidoPor: e.b.id,
      estado: "confirmado",
      publicacionId: delOtroMaestro,
    })
    const borrar = (token: string, claseId: string, publicacionId: string) =>
      peticion({ method: "DELETE", url: urlPublicacion(claseId, publicacionId), token })

    expect((await borrar(e.tokenA, e.claseId, propia)).statusCode).toBe(204)
    expect(await leerPublicacionDb(propia)).toBeNull()

    for (const ajena of [delOtroMaestro, delAdmin]) {
      const respuesta = await borrar(e.tokenA, e.claseId, ajena)
      expect(respuesta.statusCode, ajena).toBe(403)
      expect(codigoDe(respuesta), ajena).toBe("BORRADO_NO_PERMITIDO")
      expect(errorApiSchema.parse(respuesta.json()).error.mensaje).toBe(
        "No puedes borrar lo que publicó otra persona.",
      )
      expect(await leerPublicacionDb(ajena), ajena).not.toBeNull()
    }
    expect(await leerComentarioDb(comentarioDelAdmin)).not.toBeNull()
    for (const archivo of [archivoDelAdmin, archivoDelOtro]) {
      const fila = await leerArchivoDb(archivo.id)
      expect(fila?.estado).toBe("confirmado")
      expect(fila?.publicacionId).not.toBeNull()
    }

    expect((await borrar(tokenAdmin, e.claseId, delOtroMaestro)).statusCode).toBe(204)
    expect(await leerPublicacionDb(delOtroMaestro)).toBeNull()
    const descartado = await leerArchivoDb(archivoDelOtro.id)
    expect(descartado).toMatchObject({ estado: "descartado", publicacionId: null })
    expect((await borrar(tokenAdmin, e.claseId, delAdmin)).statusCode).toBe(204)
    expect(await leerComentarioDb(comentarioDelAdmin)).toBeNull()

    const inexistente = await borrar(e.tokenA, e.claseId, randomUUID())
    expect(inexistente.statusCode).toBe(404)
    expect(codigoDe(inexistente)).toBe("PUBLICACION_NO_ENCONTRADA")
    const deOtraClase = await publicacionDe(otra, otra.a.id)
    for (const token of [e.tokenA, tokenAdmin]) {
      const respuesta = await borrar(token, e.claseId, deOtraClase)
      expect(respuesta.statusCode).toBe(404)
      expect(codigoDe(respuesta)).toBe("PUBLICACION_NO_ENCONTRADA")
    }
    expect(await leerPublicacionDb(deOtraClase)).not.toBeNull()
  })

  it("PR-2B07: el admin y el maestro dueño borran la misma publicación a la vez: una 204 y una 404, ninguna 500, y los archivos quedan descartados una sola vez", async () => {
    for (let ronda = 0; ronda < 3; ronda++) {
      const e = await escenario()
      const publicacionId = await publicacionDe(e, e.a.id)
      const archivo = await crearArchivoDePrueba({
        claseId: e.claseId,
        subidoPor: e.a.id,
        estado: "confirmado",
        publicacionId,
      })

      const respuestas = await Promise.all(
        [e.tokenA, tokenAdmin].map((token) =>
          peticion({ method: "DELETE", url: urlPublicacion(e.claseId, publicacionId), token }),
        ),
      )

      expect(respuestas.map((r) => r.statusCode).sort(), `ronda ${String(ronda)}`).toEqual([
        204, 404,
      ])
      expect(await leerPublicacionDb(publicacionId)).toBeNull()
      const fila = await leerArchivoDb(archivo.id)
      expect(fila).toMatchObject({ estado: "descartado", publicacionId: null })
      const descartados = await obtenerDb().archivo.count({
        where: { claseId: e.claseId, estado: "descartado" },
      })
      expect(descartados).toBe(1)
    }
  })
})

describe("DELETE de comentarios con autoría (CLASES-02b)", () => {
  it("PR-2B05: el estudiante borra el suyo y no el de otro; el maestro borra el suyo y el de un estudiante, no el del otro maestro ni el del admin; el admin borra cualquiera; otra publicación u otra clase, 404; mis-comentarios sigue igual", async () => {
    const e = await escenario()
    const otra = await escenario()
    const publicacionId = await publicacionDe(e, e.a.id)
    const nuevo = (autorId: string) => crearComentarioDePrueba({ publicacionId, autorId })
    const borrar = (token: string, comentarioId: string, pub = publicacionId, clase = e.claseId) =>
      peticion({ method: "DELETE", url: urlComentario(clase, pub, comentarioId), token })
    const prohibido = async (token: string, comentarioId: string, descripcion: string) => {
      const respuesta = await borrar(token, comentarioId)
      expect(respuesta.statusCode, descripcion).toBe(403)
      expect(codigoDe(respuesta), descripcion).toBe("BORRADO_NO_PERMITIDO")
      expect(await leerComentarioDb(comentarioId), descripcion).not.toBeNull()
    }
    const permitido = async (token: string, comentarioId: string, descripcion: string) => {
      expect((await borrar(token, comentarioId)).statusCode, descripcion).toBe(204)
      expect(await leerComentarioDb(comentarioId), descripcion).toBeNull()
    }

    // Estudiante: lo suyo sí; lo de otro estudiante, del maestro, de otro maestro o del admin, no.
    await permitido(e.tokenAlumno1, await nuevo(e.alumno1.id), "estudiante, el suyo")
    await prohibido(e.tokenAlumno1, await nuevo(e.alumno2.id), "estudiante, de otro estudiante")
    await prohibido(e.tokenAlumno1, await nuevo(e.a.id), "estudiante, de un maestro")
    await prohibido(e.tokenAlumno1, await nuevo(adminId), "estudiante, del admin")

    // Maestro (A): lo suyo y lo de estudiantes; no lo del otro maestro ni lo del admin.
    await permitido(e.tokenA, await nuevo(e.a.id), "maestro, el suyo")
    await permitido(e.tokenA, await nuevo(e.alumno2.id), "maestro, de un estudiante")
    await prohibido(e.tokenA, await nuevo(e.b.id), "maestro, del otro maestro")
    await prohibido(e.tokenA, await nuevo(adminId), "maestro, del admin")

    // Admin: cualquiera.
    for (const [autorId, descripcion] of [
      [e.alumno1.id, "estudiante"],
      [e.a.id, "maestro"],
      [e.b.id, "otro maestro"],
      [adminId, "el suyo"],
    ] as const) {
      await permitido(tokenAdmin, await nuevo(autorId), `admin, de ${descripcion}`)
    }

    // Comentario de otra publicación de la misma clase y de otra clase, con el claseId propio: 404.
    const otraPublicacion = await publicacionDe(e, e.a.id)
    const deOtraPublicacion = await crearComentarioDePrueba({
      publicacionId: otraPublicacion,
      autorId: e.alumno1.id,
    })
    const pubAjena = await publicacionDe(otra, otra.a.id)
    const deOtraClase = await crearComentarioDePrueba({
      publicacionId: pubAjena,
      autorId: otra.alumno1.id,
    })
    for (const token of [e.tokenA, tokenAdmin, e.tokenAlumno1]) {
      const cruzado = await borrar(token, deOtraPublicacion)
      expect(cruzado.statusCode).toBe(404)
      expect(codigoDe(cruzado)).toBe("COMENTARIO_NO_ENCONTRADO")
      const ajeno = await borrar(token, deOtraClase, pubAjena)
      expect(ajeno.statusCode).toBe(404)
      expect(codigoDe(ajeno)).toBe("COMENTARIO_NO_ENCONTRADO")
    }
    expect(await leerComentarioDb(deOtraPublicacion)).not.toBeNull()
    expect(await leerComentarioDb(deOtraClase)).not.toBeNull()

    // mis-comentarios sigue igual: solo lo propio.
    const propio = await nuevo(e.alumno1.id)
    const ajeno = await nuevo(e.alumno2.id)
    const url = (id: string) => `/api/clases/${e.claseId}/mis-comentarios/${id}`
    expect(
      (await peticion({ method: "DELETE", url: url(ajeno), token: e.tokenAlumno1 })).statusCode,
    ).toBe(404)
    expect(
      (await peticion({ method: "DELETE", url: url(propio), token: e.tokenAlumno1 })).statusCode,
    ).toBe(204)
    expect(await contarComentarios(publicacionId)).toBeGreaterThan(0)
  })
})

describe("puedeBorrar en las listas (CLASES-02b)", () => {
  it("PR-2B06: puedeBorrar de las publicaciones coincide, elemento por elemento, con lo que responde el DELETE, para el estudiante, el maestro y el admin con autores de los tres roles", async () => {
    const perspectivas = ["estudiante", "maestro", "admin"] as const
    for (const perspectiva of perspectivas) {
      const e = await escenario()
      const token = { estudiante: e.tokenAlumno1, maestro: e.tokenA, admin: tokenAdmin }[
        perspectiva
      ]
      const autores = { a: e.a.id, b: e.b.id, admin: adminId }
      const ids = new Map<string, string>()
      for (const [nombre, autorId] of Object.entries(autores)) {
        ids.set(await publicacionDe(e, autorId), nombre)
      }
      // Un estudiante no puede publicar por la API: su publicación solo existe sembrada, y solo se
      // compara donde la ruta no lo deja fuera por rol.
      if (perspectiva !== "estudiante") ids.set(await publicacionDe(e, e.alumno1.id), "estudiante")

      const lista = await peticion({ method: "GET", url: urlPublicaciones(e.claseId), token })
      const { publicaciones } = listaPublicacionesRespuestaSchema.parse(lista.json())
      expect(publicaciones, perspectiva).toHaveLength(ids.size)
      for (const publicacion of publicaciones) {
        const autor = ids.get(publicacion.id)
        const respuesta = await peticion({
          method: "DELETE",
          url: urlPublicacion(e.claseId, publicacion.id),
          token,
        })
        const etiqueta = `${perspectiva} frente a ${String(autor)}`
        if (publicacion.puedeBorrar) {
          expect(respuesta.statusCode, etiqueta).toBe(204)
          continue
        }
        expect(respuesta.statusCode, etiqueta).toBe(403)
        expect(codigoDe(respuesta), etiqueta).toBe(
          perspectiva === "estudiante" ? "ROL_NO_PERMITIDO" : "BORRADO_NO_PERMITIDO",
        )
      }
      const esperadoMaestro = ["a", "estudiante"]
      const permitidas = publicaciones.filter((p) => p.puedeBorrar).map((p) => ids.get(p.id))
      const esperado = {
        estudiante: [],
        maestro: esperadoMaestro,
        admin: ["a", "b", "admin", "estudiante"],
      }[perspectiva]
      expect(permitidas.sort(), perspectiva).toEqual([...esperado].sort())
    }
  })

  it("PR-2B06: puedeBorrar de los comentarios coincide, elemento por elemento, con lo que responde el DELETE, para las tres perspectivas con autores de los tres roles", async () => {
    for (const perspectiva of ["estudiante", "maestro", "admin"] as const) {
      const e = await escenario()
      const token = { estudiante: e.tokenAlumno1, maestro: e.tokenA, admin: tokenAdmin }[
        perspectiva
      ]
      const publicacionId = await publicacionDe(e, e.a.id)
      const autores = {
        alumno1: e.alumno1.id,
        alumno2: e.alumno2.id,
        a: e.a.id,
        b: e.b.id,
        admin: adminId,
      }
      const nombres = new Map<string, string>()
      for (const [nombre, autorId] of Object.entries(autores)) {
        const id = await crearComentarioDePrueba({ publicacionId, autorId })
        nombres.set(id, nombre)
      }

      const lista = await peticion({
        method: "GET",
        url: urlComentarios(e.claseId, publicacionId),
        token,
      })
      const { comentarios } = listaComentariosRespuestaSchema.parse(lista.json())
      expect(comentarios, perspectiva).toHaveLength(nombres.size)
      for (const comentario of comentarios) {
        const etiqueta = `${perspectiva} frente a ${String(nombres.get(comentario.id))}`
        const respuesta = await peticion({
          method: "DELETE",
          url: urlComentario(e.claseId, publicacionId, comentario.id),
          token,
        })
        if (comentario.puedeBorrar) {
          expect(respuesta.statusCode, etiqueta).toBe(204)
          continue
        }
        expect(respuesta.statusCode, etiqueta).toBe(403)
        expect(codigoDe(respuesta), etiqueta).toBe("BORRADO_NO_PERMITIDO")
      }
      const permitidos = comentarios.filter((c) => c.puedeBorrar).map((c) => nombres.get(c.id))
      const esperado = {
        estudiante: ["alumno1"],
        maestro: ["alumno1", "alumno2", "a"],
        admin: ["alumno1", "alumno2", "a", "b", "admin"],
      }[perspectiva]
      expect(permitidos.sort(), perspectiva).toEqual([...esperado].sort())
    }
  })
})

describe('"Personas" con correo (CLASES-02b)', () => {
  it("PR-2B08: un alumno ve a los maestros (1 y 2) y a los compañeros con su correo completo, sin estadoPago ni accesoRestringido en ninguna parte, también con compañeros deudores y restringidos", async () => {
    const e = await escenario()
    const unica = await maestroDePrueba()
    const claseUnica = await crearClaseDePrueba(idsClases, { maestroId: unica.id })
    const deudor = await crearAlumnoDePrueba(idsUsuarios, {
      nombre: "Compañero Deudor",
      estadoPago: "deudor",
    })
    const restringido = await crearAlumnoDePrueba(idsUsuarios, {
      nombre: "Compañero Restringido",
      accesoRestringido: true,
    })
    for (const claseId of [e.claseId, claseUnica.id]) {
      for (const alumno of [deudor, restringido]) await inscribirDePrueba(claseId, alumno.id)
    }
    await inscribirDePrueba(claseUnica.id, e.alumno1.id)

    const dos = await peticion({
      method: "GET",
      url: `/api/clases/${e.claseId}/personas`,
      token: e.tokenAlumno1,
    })
    expect(dos.statusCode, dos.body).toBe(200)
    const cuerpoDos = personasRespuestaSchema.parse(dos.json())
    expect(cuerpoDos.maestros).toHaveLength(2)
    expect(cuerpoDos.maestros.map((m) => m.email).sort()).toEqual([e.a.email, e.b.email].sort())
    expect(cuerpoDos.maestro).toEqual(cuerpoDos.maestros[0])
    const correos = new Map(cuerpoDos.alumnos.map((a) => [a.id, a.email]))
    expect(correos.get(deudor.id)).toBe(deudor.email)
    expect(correos.get(restringido.id)).toBe(restringido.email)
    expect(correos.get(e.alumno2.id)).toBe(e.alumno2.email)

    const uno = await peticion({
      method: "GET",
      url: `/api/clases/${claseUnica.id}/personas`,
      token: e.tokenAlumno1,
    })
    const cuerpoUno = personasRespuestaSchema.parse(uno.json())
    expect(cuerpoUno.maestros).toEqual([
      { id: unica.id, nombre: expect.any(String), email: unica.email },
    ])

    for (const respuesta of [dos, uno]) {
      const encontradas = claves(respuesta.json())
      for (const prohibida of ["estadoPago", "estado_pago", "accesoRestringido", "rol"]) {
        expect(encontradas).not.toContain(prohibida)
      }
      expect(respuesta.body).not.toContain("deudor")
      expect(respuesta.body).not.toContain("al_corriente")
      // Solo los correos de esa clase.
    }
    expect(uno.body).not.toContain(e.a.email)
    expect(uno.body).not.toContain(e.alumno2.email)
  })
})

describe("archivos del admin (CLASES-02b)", () => {
  it("PR-2B09: el admin solicita la subida y la descarga (200), publica con sus archivos, y un maestro no puede confirmar el archivo que subió el admin (400 ARCHIVO_INVALIDO)", async () => {
    const e = await escenario()
    const solicitud = await peticion({
      method: "POST",
      url: `/api/clases/${e.claseId}/archivos`,
      token: tokenAdmin,
      payload: { nombre: "plan.pdf", tipo: "application/pdf", tamano: 3000 },
    })
    expect(solicitud.statusCode, solicitud.body).toBe(201)
    const { archivo } = solicitarSubidaRespuestaSchema.parse(solicitud.json())
    expect(await leerArchivoDb(archivo.id)).toMatchObject({
      estado: "pendiente",
      subidoPor: adminId,
      claseId: e.claseId,
    })
    almacen.subir(`materiales/${e.claseId}/${archivo.id}`, {
      tamano: 3000,
      tipo: "application/pdf",
    })

    // Un maestro de la clase no puede confirmar el archivo del admin en su publicación.
    const delMaestro = await peticion({
      method: "POST",
      url: urlPublicaciones(e.claseId),
      token: e.tokenA,
      payload: { tipo: "anuncio", texto: "Con archivo ajeno", archivoIds: [archivo.id] },
    })
    expect(delMaestro.statusCode).toBe(400)
    expect(codigoDe(delMaestro)).toBe("ARCHIVO_INVALIDO")
    expect((await leerArchivoDb(archivo.id))?.estado).toBe("pendiente")

    // El admin sí: publica y el archivo queda confirmado.
    const publicada = await peticion({
      method: "POST",
      url: urlPublicaciones(e.claseId),
      token: tokenAdmin,
      payload: { tipo: "material", titulo: "Plan", archivoIds: [archivo.id] },
    })
    expect(publicada.statusCode, publicada.body).toBe(201)
    expect(publicacionRespuestaSchema.parse(publicada.json()).publicacion.adjuntos).toHaveLength(1)
    expect((await leerArchivoDb(archivo.id))?.estado).toBe("confirmado")

    // La descarga: el admin (y los miembros) pide la URL firmada.
    const descarga = await peticion({
      method: "POST",
      url: `/api/clases/${e.claseId}/archivos/${archivo.id}/descarga`,
      token: tokenAdmin,
    })
    expect(descarga.statusCode, descarga.body).toBe(200)
    expect(descarga.json<{ url: string }>().url).toContain(archivo.id)
    expect(almacen.descargasFirmadas.some(({ clave }) => clave.endsWith(archivo.id))).toBe(true)
  })
})

describe("autorización del muro con el admin (CLASES-02b)", () => {
  it("PR-2B10: el admin no comenta (403 ROL_NO_PERMITIDO), el maestro ajeno recibe 403 SIN_ACCESO_A_LA_CLASE al borrar y ninguna respuesta del muro lleva el rol del autor, el correo ni el nombre real del admin", async () => {
    const e = await escenario()
    const ajeno = await maestroDePrueba()
    const tokenAjeno = await tokenDe(ajeno)
    const admin = await obtenerDb().usuario.findUniqueOrThrow({ where: { id: adminId } })
    const publicacionId = await publicacionDe(e, adminId)
    const comentarioId = await crearComentarioDePrueba({ publicacionId, autorId: e.alumno1.id })
    await crearComentarioDePrueba({ publicacionId, autorId: adminId })

    const comentar = await peticion({
      method: "POST",
      url: urlComentarios(e.claseId, publicacionId),
      token: tokenAdmin,
      payload: { texto: "El admin no comenta" },
    })
    expect(comentar.statusCode).toBe(403)
    expect(codigoDe(comentar)).toBe("ROL_NO_PERMITIDO")
    expect(await contarComentarios(publicacionId)).toBe(2)

    for (const [url, descripcion] of [
      [urlPublicacion(e.claseId, publicacionId), "publicación"],
      [urlComentario(e.claseId, publicacionId, comentarioId), "comentario"],
    ] as const) {
      const respuesta = await peticion({ method: "DELETE", url, token: tokenAjeno })
      expect(respuesta.statusCode, descripcion).toBe(403)
      expect(codigoDe(respuesta), descripcion).toBe("SIN_ACCESO_A_LA_CLASE")
    }
    expect(await leerPublicacionDb(publicacionId)).not.toBeNull()

    const respuestas: LightMyRequestResponse[] = []
    for (const token of [e.tokenAlumno1, e.tokenA, tokenAdmin]) {
      respuestas.push(
        await peticion({ method: "GET", url: urlPublicaciones(e.claseId), token }),
        await peticion({ method: "GET", url: urlComentarios(e.claseId, publicacionId), token }),
      )
    }
    for (const respuesta of respuestas) {
      expect(respuesta.statusCode).toBe(200)
      expect(respuesta.body).toContain(FIRMA_ADMINISTRACION)
      expect(respuesta.body).not.toContain(admin.email)
      expect(respuesta.body).not.toContain(admin.nombre)
      expect(clavesProhibidasEn(respuesta.body)).toEqual([])
    }
    // El comentario del admin sale firmado igual y el estudiante lo ve sin poder borrarlo.
    const comentarios = listaComentariosRespuestaSchema.parse(respuestas[1]?.json())
    expect(comentarios.comentarios.filter((c) => c.autor.administracion)).toHaveLength(1)
    expect(
      comentarioRespuestaSchema.safeParse({ comentario: comentarios.comentarios[0] }).success,
    ).toBe(true)
  })
})
