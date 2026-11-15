import { foroRespuestaSchema } from "@campus/shared"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria, type AlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba, crearUsuarioDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  crearPublicacionDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"
import {
  codigoDe,
  crearEscenarioDeForo,
  cuerpoDeForo,
  pedirForo,
  urlForo,
  urlForos,
  type EscenarioDeForo,
} from "./ayudas-foros.js"

// Ataque FORO-01a, ronda 1 (tester). Los adjuntos del planteamiento (§D-3.1: el foro reutiliza la
// subida y la descarga de la clase), que las pruebas del programador no recorren con un foro: crear
// con un archivo subido, verlo y descargarlo como alumno, los archivos que no se pueden adjuntar
// (de otra clase, de otra persona, ya publicados en otra publicación) y lo que pasa con el archivo al
// quitarlo en la edición y al borrar el foro.

let app: FastifyInstance | undefined
let almacen: AlmacenEnMemoria | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}
const obtenerAlmacen = (): AlmacenEnMemoria => {
  if (!almacen) throw new Error("El almacén no se creó en beforeAll")
  return almacen
}
const pedir = pedirForo(obtenerApp)

beforeAll(async () => {
  almacen = crearAlmacenEnMemoria()
  app = await construirApp({ env: cargarEnv(), almacen })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

// Un archivo pendiente con su objeto "subido" al almacén en memoria.
const archivoSubido = async (claseId: string, subidoPor: string) => {
  const archivo = await crearArchivoDePrueba({ claseId, subidoPor })
  obtenerAlmacen().subir(archivo.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
  return archivo
}

const descargar = (e: EscenarioDeForo, archivoId: string, token: string) =>
  pedir({
    method: "POST",
    url: `/api/clases/${e.claseId}/archivos/${archivoId}/descarga`,
    token,
  })

const estadoDelArchivo = (id: string) =>
  obtenerDb().archivo.findUnique({ where: { id }, select: { estado: true, publicacionId: true } })

describe("ataque FORO-01a r1: los adjuntos del planteamiento", () => {
  it("ATQ-FORO-50: un foro creado con un archivo subido lo confirma en su publicación; el alumno lo ve en el detalle y lo descarga; el restringido y el de otra clase no; quitarlo en la edición lo descarta y deja de descargarse", async () => {
    const e = await crearEscenarioDeForo(idsUsuarios, idsClases)
    const archivo = await archivoSubido(e.claseId, e.maestro.id)
    const creado = await pedir({
      method: "POST",
      url: urlForos(e.claseId),
      token: e.tokenMaestro,
      payload: cuerpoDeForo({ archivoIds: [archivo.id] }),
    })
    expect(creado.statusCode, creado.body).toBe(201)
    const foro = foroRespuestaSchema.parse(creado.json()).foro
    expect(foro.adjuntos.map(({ id }) => id)).toEqual([archivo.id])
    expect(await estadoDelArchivo(archivo.id)).toEqual({
      estado: "confirmado",
      publicacionId: foro.id,
    })

    const detalle = foroRespuestaSchema.parse(
      (
        await pedir({ method: "GET", url: urlForo(e.claseId, foro.id), token: e.tokenAlumno })
      ).json(),
    )
    expect(detalle.foro.adjuntos.map(({ id }) => id)).toEqual([archivo.id])
    expect(JSON.stringify(detalle)).not.toContain("materiales/")
    const descarga = await descargar(e, archivo.id, e.tokenAlumno)
    expect(descarga.statusCode, descarga.body).toBe(200)

    const restringido = await crearUsuarioDePrueba(idsUsuarios, {
      nombre: "Alumna Restringida Adjunto",
      accesoRestringido: true,
      motivoRestriccion: "Pago pendiente",
    })
    await inscribirDePrueba(e.claseId, restringido.id)
    const negada = await descargar(
      e,
      archivo.id,
      await firmarTokenDePrueba({ usuarioId: restringido.id }),
    )
    expect(negada.statusCode).toBe(403)
    expect(codigoDe(negada)).toBe("ACCESO_RESTRINGIDO")
    const ajena = await descargar(e, archivo.id, e.tokenAlumnoAjeno)
    expect(ajena.statusCode).toBe(403)
    expect(codigoDe(ajena)).toBe("SIN_ACCESO_A_LA_CLASE")

    const editado = await pedir({
      method: "PUT",
      url: urlForo(e.claseId, foro.id),
      token: e.tokenMaestro,
      payload: cuerpoDeForo({ archivoIds: [], version: 0 }),
    })
    expect(editado.statusCode, editado.body).toBe(200)
    expect(foroRespuestaSchema.parse(editado.json()).foro.adjuntos).toEqual([])
    expect((await estadoDelArchivo(archivo.id))?.estado).toBe("descartado")
    const yaNo = await descargar(e, archivo.id, e.tokenAlumno)
    expect(yaNo.statusCode, yaNo.body).toBe(404)
  }, 60_000)

  it("ATQ-FORO-51: no se adjunta al foro un archivo de otra clase, uno subido por otra persona ni uno ya publicado en un material: 400 sin crear ni editar el foro y sin mover el archivo", async () => {
    const e = await crearEscenarioDeForo(idsUsuarios, idsClases)
    const otra = await crearClaseDePrueba(idsClases, { maestroId: e.maestro.id })
    const deOtraClase = await archivoSubido(otra.id, e.maestro.id)
    const deOtraPersona = await archivoSubido(e.claseId, e.alumno.id)
    const material = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      tipo: "material",
    })
    const publicado = await crearArchivoDePrueba({
      claseId: e.claseId,
      subidoPor: e.maestro.id,
      estado: "confirmado",
      publicacionId: material,
    })
    obtenerAlmacen().subir(publicado.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
    const publicacionesAntes = await obtenerDb().publicacion.count({
      where: { claseId: e.claseId },
    })

    const creado = await pedir({
      method: "POST",
      url: urlForos(e.claseId),
      token: e.tokenMaestro,
      payload: cuerpoDeForo(),
    })
    expect(creado.statusCode).toBe(201)
    const foroId = foroRespuestaSchema.parse(creado.json()).foro.id

    for (const archivo of [deOtraClase, deOtraPersona, publicado]) {
      const crear = await pedir({
        method: "POST",
        url: urlForos(e.claseId),
        token: e.tokenMaestro,
        payload: cuerpoDeForo({ archivoIds: [archivo.id] }),
      })
      expect(crear.statusCode, crear.body).toBe(400)
      const editar = await pedir({
        method: "PUT",
        url: urlForo(e.claseId, foroId),
        token: e.tokenMaestro,
        payload: cuerpoDeForo({ archivoIds: [archivo.id], version: 0, titulo: "No debe quedar" }),
      })
      expect(editar.statusCode, editar.body).toBe(400)
    }
    expect(await obtenerDb().publicacion.count({ where: { claseId: e.claseId } })).toBe(
      publicacionesAntes + 1,
    )
    expect(
      await obtenerDb().publicacion.findUnique({ where: { id: foroId }, select: { titulo: true } }),
    ).toEqual({ titulo: "Debate de la unidad 2" })
    expect(await estadoDelArchivo(deOtraClase.id)).toEqual({
      estado: "pendiente",
      publicacionId: null,
    })
    expect(await estadoDelArchivo(deOtraPersona.id)).toEqual({
      estado: "pendiente",
      publicacionId: null,
    })
    expect(await estadoDelArchivo(publicado.id)).toEqual({
      estado: "confirmado",
      publicacionId: material,
    })
  }, 60_000)

  it("ATQ-FORO-52: borrar un foro con su adjunto descarta el archivo y deja de servirlo", async () => {
    const e = await crearEscenarioDeForo(idsUsuarios, idsClases)
    const archivo = await archivoSubido(e.claseId, e.maestro.id)
    const creado = await pedir({
      method: "POST",
      url: urlForos(e.claseId),
      token: e.tokenMaestro,
      payload: cuerpoDeForo({ archivoIds: [archivo.id] }),
    })
    expect(creado.statusCode, creado.body).toBe(201)
    const foroId = foroRespuestaSchema.parse(creado.json()).foro.id
    const borrado = await pedir({
      method: "DELETE",
      url: urlForo(e.claseId, foroId),
      token: e.tokenMaestro,
    })
    expect(borrado.statusCode, borrado.body).toBe(204)
    expect(await estadoDelArchivo(archivo.id)).toEqual({
      estado: "descartado",
      publicacionId: null,
    })
    const descarga = await descargar(e, archivo.id, e.tokenAlumno)
    expect(descarga.statusCode, descarga.body).toBe(404)
  }, 60_000)
})
