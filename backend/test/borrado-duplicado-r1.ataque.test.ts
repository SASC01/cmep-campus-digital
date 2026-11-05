import { randomUUID } from "node:crypto"

import { claseRespuestaSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { pino } from "pino"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import type { AlmacenDeObjetos } from "../src/core/archivos/objetos.js"
import { COLA_RECORDATORIO_24H } from "../src/core/eventos/avisos-de-clase.js"
import {
  procesarBorradoDeObjetos,
  procesarCopiaDeObjetos,
  procesarCopiasFallidas,
} from "../src/workers/objetos.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba, type UsuarioDePrueba } from "./ayudas-auth.js"
import {
  fotoDeLaClase,
  terminarCopiasDePrueba,
  trabajosDeBorradoCon,
  trabajosDeCopiaCon,
} from "./ayudas-borrado-duplicado.js"
import {
  archivarClaseDePrueba,
  clavesDe,
  codigoDeError,
  pedirComo,
  type MetodoDePrueba,
} from "./ayudas-clases-archivadas.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  crearPublicacionDePrueba,
  idDelAdminDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { crearArchivoDeEntregaDePrueba, crearEntregaDePrueba } from "./ayudas-entregas.js"
import {
  crearMaterialConTemaDePrueba,
  crearTemaDePrueba,
  cuerpoDeTarea,
  trabajosDeTarea,
} from "./ayudas-tareas.js"
import { crearObjetosEnMemoria } from "./objetos-en-memoria.js"

// Ataque del Tester, ADMIN-01b, ronda 1. Lo que ADM-1B01 a ADM-1B24 no recorren (puntos del
// manager en "Verificación del resumen — ADMIN-01b"): `confirmar` manipulado, la autorización por
// HEAD y con ids raros, carreras sin retención (dos borrados, borrar contra restaurar y contra el
// conteo, dos duplicados), un borrado con claves de todos los contextos en más de dos lotes, lo que
// se cuela al duplicar por el cuerpo, la forma de los datos de los trabajos, el descarte en vuelo
// (R-14), datos fuera del esquema en los tres consumidores y la descarga del alumno que entra a la
// copia por código.
// El 503 del timeout de 30 s se atacó una vez, aislado, y no se conserva aquí: un borrado bloqueado
// 30 s retiene sus bloqueos sobre clases e inscripciones y choca con los LOCK TABLE … NOWAIT de
// lecturas-consistentes y lecturas-fx-r1 cuando corren a la vez (ver el reporte, ADM-T1B07).
// N-18: toda clase de este archivo tiene uno o dos maestros. N-29: los consumidores se llaman
// directo; ninguna prueba registra un consumidor en COPIAR_OBJETOS ni en BORRAR_OBJETOS.
// El log de la app va en "error": un 500 ("Error no controlado") sale en la corrida.

let app: FastifyInstance | undefined
const almacen = crearAlmacenEnMemoria()
const idsUsuarios: string[] = []
const idsClases: string[] = []
let tokenAdmin = ""
let idAdmin = ""
const log = pino({ level: "silent" })

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const ficha = (): string => randomUUID().slice(0, 8)
const maestroDePrueba = () =>
  crearAlumnoDePrueba(idsUsuarios, { nombre: `Maestro ${ficha()}`, rol: "maestro" })
const alumnoDePrueba = (opciones: { accesoRestringido?: boolean } = {}) =>
  crearAlumnoDePrueba(idsUsuarios, { nombre: `Alumno ${ficha()}`, ...opciones })
const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

const pedir = (method: MetodoDePrueba, url: string, token?: string, payload?: object) =>
  pedirComo(obtenerApp(), {
    method,
    url,
    ...(token === undefined ? {} : { token }),
    ...(payload === undefined ? {} : { payload }),
  })

const borrar = (claseId: string, consulta = "?confirmar=borrar") =>
  pedir("DELETE", `/api/admin/clases/${claseId}${consulta}`, tokenAdmin)

const resumen = (r: LightMyRequestResponse): string => {
  if (r.statusCode < 400 || r.body === "") return String(r.statusCode)
  return `${String(r.statusCode)} ${codigoDeError(r)}`
}

const idDeLaCopia = (respuesta: LightMyRequestResponse): string => {
  expect(respuesta.statusCode, respuesta.body).toBe(201)
  const { clase } = claseRespuestaSchema.parse(respuesta.json())
  idsClases.push(clase.id)
  return clase.id
}

beforeAll(async () => {
  app = await construirApp({ env: { ...cargarEnv(), LOG_LEVEL: "error" }, almacen })
  await app.ready()
  tokenAdmin = await tokenDelAdminDePrueba()
  idAdmin = await idDelAdminDePrueba()
}, 30_000)

afterAll(async () => {
  await terminarCopiasDePrueba(idsClases)
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

// Una archivada con un recurso de aprendizaje con su archivo confirmado.
const archivadaConRecurso = async () => {
  const maestro = await maestroDePrueba()
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  const recursoId = await crearMaterialConTemaDePrueba({
    claseId: clase.id,
    autorId: idAdmin,
    bloque: "aprendizaje",
  })
  const archivo = await crearArchivoDePrueba({
    claseId: clase.id,
    subidoPor: idAdmin,
    estado: "confirmado",
    publicacionId: recursoId,
  })
  await archivarClaseDePrueba(clase.id, new Date("2026-02-01T10:00:00.000Z"))
  return { maestro, clase, recursoId, archivo }
}

describe("confirmar manipulado (ataque 01b-r1)", () => {
  it("ADM-T1B03: confirmar repetido, vacío, en mayúsculas, con espacios, con NUL o con otro valor → 400 VALIDACION sin borrar; el parámetro con otro nombre (también confirmar[]) o en el cuerpo → 409 CONFIRMACION_REQUERIDA; nunca 500 ni 204; después, confirmar=borrar → 204", async () => {
    const { clase, archivo } = await archivadaConRecurso()
    const antes = await fotoDeLaClase(clase.id)
    const invalidas = [
      "?confirmar=borrar&confirmar=borrar",
      "?confirmar=borrar&confirmar=otra",
      "?confirmar=",
      "?confirmar=BORRAR",
      "?confirmar=Borrar",
      "?confirmar=%20borrar",
      "?confirmar=borrar%20",
      "?confirmar=borrar%00",
      "?confirmar=true",
      "?confirmar=1",
      `?confirmar=${"borrar".repeat(2000)}`,
      "?confirmar=b%C3%B3rrar",
    ]
    for (const consulta of invalidas) {
      const r = await borrar(clase.id, consulta)
      expect(resumen(r), consulta.slice(0, 40)).toBe("400 VALIDACION")
    }
    for (const consulta of [
      "",
      "?CONFIRMAR=borrar",
      "?Confirmar=borrar",
      "?confirma=borrar",
      "?confirmar[]=borrar",
      "?confirmar[0]=borrar",
    ]) {
      expect(resumen(await borrar(clase.id, consulta)), consulta).toBe("409 CONFIRMACION_REQUERIDA")
    }
    const conCuerpo = await pedir("DELETE", `/api/admin/clases/${clase.id}`, tokenAdmin, {
      confirmar: "borrar",
    })
    expect(resumen(conCuerpo)).toBe("409 CONFIRMACION_REQUERIDA")
    expect(await fotoDeLaClase(clase.id)).toEqual(antes)
    expect(await trabajosDeBorradoCon([archivo.claveObjeto])).toEqual([])

    expect(resumen(await borrar(clase.id, "?confirmar=borrar&otro=1"))).toBe("204")
    expect((await fotoDeLaClase(clase.id)).clase).toBe(0)
  }, 60_000)
})

describe("autorización por HEAD y con ids raros (ataque 01b-r1)", () => {
  it("ADM-T1B04: el maestro de la clase, su alumno inscrito y un alumno restringido reciben 403 en conteo (GET y HEAD), borrado y duplicado, sin borrar ni crear nada; un id que no es uuid → 400 o 403 sin 500; un id en MAYÚSCULAS borra la misma clase con todas sus claves", async () => {
    const { maestro, clase, archivo } = await archivadaConRecurso()
    const alumno = await alumnoDePrueba()
    const restringido = await alumnoDePrueba({ accesoRestringido: true })
    await inscribirDePrueba(clase.id, alumno.id)
    await inscribirDePrueba(clase.id, restringido.id)
    const antes = await fotoDeLaClase(clase.id)
    // Por el nombre del intento: otros archivos crean clases en paralelo.
    const intento = `Intento ${ficha()}`
    const deLosIntentos = () => obtenerDb().clase.count({ where: { nombre: intento } })
    const base = `/api/admin/clases/${clase.id}`
    const esperados: [UsuarioDePrueba, string][] = [
      [maestro, "403 ROL_NO_PERMITIDO"],
      [alumno, "403 ROL_NO_PERMITIDO"],
      [restringido, "403 ACCESO_RESTRINGIDO"],
    ]
    for (const [usuario, esperado] of esperados) {
      const token = await tokenDe(usuario)
      expect(resumen(await pedir("GET", `${base}/conteo-de-borrado`, token))).toBe(esperado)
      const head = await pedir("HEAD", `${base}/conteo-de-borrado`, token)
      expect(head.statusCode).toBe(403)
      expect(head.body).toBe("")
      expect(resumen(await pedir("DELETE", `${base}?confirmar=borrar`, token))).toBe(esperado)
      expect(
        resumen(
          await pedir("POST", `${base}/duplicar`, token, {
            nombre: intento,
            maestroIds: [maestro.id],
          }),
        ),
      ).toBe(esperado)
    }
    expect(await fotoDeLaClase(clase.id)).toEqual(antes)
    expect(await deLosIntentos()).toBe(0)

    for (const raro of [
      "no-es-uuid",
      "00000000-0000-0000-0000-000000000000",
      "%00",
      "..%2F..%2Fme",
    ]) {
      for (const [metodo, url] of [
        ["GET", `/api/admin/clases/${raro}/conteo-de-borrado`],
        ["DELETE", `/api/admin/clases/${raro}?confirmar=borrar`],
        ["POST", `/api/admin/clases/${raro}/duplicar`],
      ] as const) {
        const r = await pedir(
          metodo,
          url,
          tokenAdmin,
          metodo === "POST" ? { nombre: intento, maestroIds: [maestro.id] } : undefined,
        )
        expect([400, 403, 404], `${metodo} ${url}: ${r.body}`).toContain(r.statusCode)
      }
    }
    expect(await deLosIntentos()).toBe(0)

    const conteo = await pedir(
      "GET",
      `/api/admin/clases/${clase.id.toUpperCase()}/conteo-de-borrado`,
      tokenAdmin,
    )
    expect(conteo.statusCode, conteo.body).toBe(200)
    expect(conteo.json()).toEqual({
      alumnos: 2,
      actividades: 0,
      entregas: 0,
      calificaciones: 0,
      archivos: 1,
    })
    expect(resumen(await borrar(clase.id.toUpperCase()))).toBe("204")
    expect((await fotoDeLaClase(clase.id)).clase).toBe(0)
    const trabajos = await trabajosDeBorradoCon([archivo.claveObjeto])
    expect(trabajos.map((t) => t.datos)).toEqual([{ claves: [archivo.claveObjeto] }])
  }, 60_000)
})

describe("carreras sin retención (ataque 01b-r1)", () => {
  it("ADM-T1B05: dos borrados a la vez → [204, 403]; borrar y restaurar a la vez → (204 y 403) o (409 CLASE_NO_ARCHIVADA y 200); borrar y contar a la vez → 204 y (200 o 403); dos duplicados a la vez → dos 201 con códigos distintos; nunca 500", async () => {
    for (let vuelta = 0; vuelta < 3; vuelta++) {
      const a = await archivadaConRecurso()
      const dos = await Promise.all([borrar(a.clase.id), borrar(a.clase.id)])
      expect(dos.map(resumen).sort(), `vuelta ${String(vuelta)}`).toEqual([
        "204",
        "403 SIN_ACCESO_A_LA_CLASE",
      ])
      expect(await trabajosDeBorradoCon([a.archivo.claveObjeto])).toHaveLength(1)

      const b = await archivadaConRecurso()
      const [borrado, restaurado] = await Promise.all([
        borrar(b.clase.id),
        pedir("POST", `/api/admin/clases/${b.clase.id}/restaurar`, tokenAdmin),
      ])
      const par = `${resumen(borrado)} / ${resumen(restaurado)}`
      expect(["204 / 403 SIN_ACCESO_A_LA_CLASE", "409 CLASE_NO_ARCHIVADA / 200"], par).toContain(
        par,
      )
      const queda = (await fotoDeLaClase(b.clase.id)).clase
      expect(queda, par).toBe(borrado.statusCode === 204 ? 0 : 1)

      const c = await archivadaConRecurso()
      const [borradoC, conteo] = await Promise.all([
        borrar(c.clase.id),
        pedir("GET", `/api/admin/clases/${c.clase.id}/conteo-de-borrado`, tokenAdmin),
      ])
      expect(resumen(borradoC)).toBe("204")
      expect(["200", "403 SIN_ACCESO_A_LA_CLASE"]).toContain(resumen(conteo))

      const d = await archivadaConRecurso()
      const otro = await maestroDePrueba()
      const duplicados = await Promise.all(
        [d.maestro.id, otro.id].map((maestroId) =>
          pedir("POST", `/api/admin/clases/${d.clase.id}/duplicar`, tokenAdmin, {
            nombre: `Doble ${ficha()}`,
            maestroIds: [maestroId],
          }),
        ),
      )
      const copias = duplicados.map(idDeLaCopia)
      const filas = await obtenerDb().clase.findMany({
        where: { id: { in: copias } },
        select: { codigoInvitacion: true, _count: { select: { maestros: true } } },
      })
      expect(new Set(filas.map((f) => f.codigoInvitacion)).size).toBe(2)
      expect(filas.map((f) => f._count.maestros)).toEqual([1, 1])
    }
  }, 120_000)
})

describe("el borrado alcanza todo y sus trabajos solo llevan claves (ataque 01b-r1)", () => {
  it("ADM-T1B06: 2 503 archivos de todos los contextos y estados → tres trabajos de BORRAR_OBJETOS (1000, 1000 y 503) con cada clave una sola vez, datos {claves} y nada más; solo los recordatorios de la clase quedan cancelados; el de otra clase sigue vivo", async () => {
    const db = obtenerDb()
    const maestro = await maestroDePrueba()
    const alumno = await alumnoDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const otra = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, alumno.id)
    const tokenMaestro = await tokenDe(maestro)
    const crearTarea = async (claseId: string) => {
      const r = await pedir("POST", `/api/clases/${claseId}/tareas`, tokenMaestro, cuerpoDeTarea())
      expect(r.statusCode, r.body).toBe(201)
      return (r.json() as { tarea: { id: string } }).tarea.id
    }
    const tareaDeLaClase = await crearTarea(clase.id)
    const tareaDeOtra = await crearTarea(otra.id)

    const recurso = await crearPublicacionDePrueba({
      claseId: clase.id,
      autorId: maestro.id,
      tipo: "material",
    })
    const confirmado = await crearArchivoDePrueba({
      claseId: clase.id,
      subidoPor: maestro.id,
      estado: "confirmado",
      publicacionId: recurso,
    })
    const descartado = await crearArchivoDePrueba({
      claseId: clase.id,
      subidoPor: maestro.id,
      estado: "descartado",
    })
    const entregaId = await crearEntregaDePrueba({ tareaId: tareaDeLaClase, alumnoId: alumno.id })
    const deEntrega = await crearArchivoDeEntregaDePrueba({
      claseId: clase.id,
      tareaId: tareaDeLaClase,
      alumnoId: alumno.id,
      estado: "confirmado",
      entregaId,
    })
    const deEntregaPendiente = await crearArchivoDeEntregaDePrueba({
      claseId: clase.id,
      tareaId: tareaDeLaClase,
      alumnoId: alumno.id,
    })
    const pendientes = Array.from({ length: 2499 }, () => {
      const id = randomUUID()
      return { id, claveObjeto: `materiales/${clase.id}/${id}` }
    })
    await db.archivo.createMany({
      data: pendientes.map(({ id, claveObjeto }) => ({
        id,
        claveObjeto,
        nombre: "a.pdf",
        tipo: "application/pdf",
        tamano: 1,
        subidoPor: maestro.id,
        claseId: clase.id,
        estado: "pendiente" as const,
      })),
    })
    const deOtra = await crearArchivoDePrueba({ claseId: otra.id, subidoPor: maestro.id })
    const todas = [
      confirmado.claveObjeto,
      descartado.claveObjeto,
      deEntrega.claveObjeto,
      deEntregaPendiente.claveObjeto,
      ...pendientes.map((p) => p.claveObjeto),
    ]
    expect(todas).toHaveLength(2503)

    await archivarClaseDePrueba(clase.id)
    expect(resumen(await borrar(clase.id))).toBe("204")

    const trabajos = await trabajosDeBorradoCon([...todas, deOtra.claveObjeto])
    expect(trabajos.map((t) => (t.datos.claves as string[]).length).sort((x, y) => x - y)).toEqual([
      503, 1000, 1000,
    ])
    for (const trabajo of trabajos) {
      expect(Object.keys(trabajo.datos)).toEqual(["claves"])
      expect(trabajo.state).toBe("created")
    }
    const encoladas = trabajos.flatMap((t) => t.datos.claves as string[])
    expect(encoladas).toHaveLength(2503)
    expect(new Set(encoladas).size).toBe(2503)
    expect([...encoladas].sort()).toEqual([...todas].sort())
    for (const clave of encoladas) {
      expect(clave, "solo ids en la clave").toMatch(
        /^(materiales\/[0-9a-f-]{36}|entregas\/[0-9a-f-]{36}\/[0-9a-f-]{36})\/[0-9a-f-]{36}$/,
      )
    }

    expect(
      (await trabajosDeTarea(COLA_RECORDATORIO_24H, tareaDeLaClase)).map((t) => t.state),
    ).toEqual(["cancelled"])
    expect((await trabajosDeTarea(COLA_RECORDATORIO_24H, tareaDeOtra)).map((t) => t.state)).toEqual(
      ["created"],
    )
    expect((await fotoDeLaClase(otra.id)).archivos).toBe(1)

    // El consumidor, con esos datos, borra exactamente esas claves y deja la de la otra clase.
    const objetos = crearObjetosEnMemoria([...todas, deOtra.claveObjeto])
    for (const trabajo of trabajos) {
      await procesarBorradoDeObjetos(
        { id: trabajo.id, datos: trabajo.datos },
        { almacenDeObjetos: objetos, log },
      )
    }
    expect([...objetos.claves]).toEqual([deOtra.claveObjeto])
  }, 120_000)
})

describe("duplicar: el cuerpo, los datos de los trabajos y las claves (ataque 01b-r1)", () => {
  it("ADM-T1B08: campos de más en el cuerpo (descripción, código, activa, archivadaEn, claseId, maestros, estadoPago) no llegan a la copia; el nombre se recorta; los trabajos de COPIAR_OBJETOS llevan solo {archivoIds} de la copia; cada clave es materiales/{copia}/{su id}; un recurso con su tema borrado queda sin tema; la respuesta no lleva datos de cuentas", async () => {
    const db = obtenerDb()
    const maestro = await maestroDePrueba()
    const segundo = await maestroDePrueba()
    const clase = await crearClaseDePrueba(idsClases, {
      maestroId: maestro.id,
      descripcion: "Descripción original",
    })
    const tema = await crearTemaDePrueba({ claseId: clase.id, nombre: "Se borra", orden: 3 })
    const recurso = await crearMaterialConTemaDePrueba({
      claseId: clase.id,
      autorId: idAdmin,
      temaId: tema.id,
      bloque: "aprendizaje",
    })
    const archivos = []
    for (let i = 0; i < 3; i++) {
      archivos.push(
        await crearArchivoDePrueba({
          claseId: clase.id,
          subidoPor: idAdmin,
          estado: "confirmado",
          publicacionId: recurso,
        }),
      )
    }
    await db.tema.delete({ where: { id: tema.id } })
    await archivarClaseDePrueba(clase.id)

    const respuesta = await pedir("POST", `/api/admin/clases/${clase.id}/duplicar`, tokenAdmin, {
      nombre: "   Copia recortada   ",
      maestroIds: [segundo.id.toUpperCase(), maestro.id],
      descripcion: "Inyectada",
      codigoInvitacion: "ZZZZZZZZ",
      activa: false,
      archivadaEn: "2020-01-01T00:00:00.000Z",
      claseId: randomUUID(),
      maestros: [{ id: idAdmin }],
      estadoPago: "deudor",
    })
    const copiaId = idDeLaCopia(respuesta)
    const prohibidas = [
      "email",
      "estadoPago",
      "accesoRestringido",
      "hashContrasena",
      "rol",
      "activo",
    ]
    expect(clavesDe(respuesta.json()).filter((c) => prohibidas.includes(c))).toEqual([])
    const copia = await db.clase.findUniqueOrThrow({
      where: { id: copiaId },
      select: {
        nombre: true,
        descripcion: true,
        codigoInvitacion: true,
        activa: true,
        archivadaEn: true,
        maestros: { select: { maestroId: true } },
      },
    })
    expect(copia).toMatchObject({
      nombre: "Copia recortada",
      descripcion: "Descripción original",
      activa: true,
      archivadaEn: null,
    })
    expect(copia.codigoInvitacion).not.toBe("ZZZZZZZZ")
    expect(copia.maestros.map((m) => m.maestroId).sort()).toEqual([maestro.id, segundo.id].sort())

    const deLaCopia = await db.archivo.findMany({
      where: { claseId: copiaId },
      select: {
        id: true,
        claveObjeto: true,
        copiaDe: true,
        publicacion: { select: { temaId: true } },
      },
    })
    expect(deLaCopia).toHaveLength(3)
    for (const fila of deLaCopia) {
      expect(fila.claveObjeto).toBe(`materiales/${copiaId}/${fila.id}`)
      expect(fila.publicacion?.temaId).toBeNull()
    }
    expect(deLaCopia.map((f) => f.copiaDe).sort()).toEqual(archivos.map((a) => a.id).sort())
    const trabajos = await trabajosDeCopiaCon(deLaCopia.map((f) => f.id))
    expect(trabajos).toHaveLength(1)
    expect(trabajos[0]?.datos).toEqual({ archivoIds: expect.any(Array) })
    expect([...((trabajos[0]?.datos.archivoIds as string[] | undefined) ?? [])].sort()).toEqual(
      deLaCopia.map((f) => f.id).sort(),
    )
    expect(await db.tema.count({ where: { claseId: copiaId } })).toBe(0)
  }, 60_000)
})

describe("el worker de copias ante descartes en vuelo y datos fuera del esquema (ataque 01b-r1)", () => {
  const duplicarConUnArchivo = async () => {
    const maestro = await maestroDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const recurso = await crearMaterialConTemaDePrueba({
      claseId: clase.id,
      autorId: idAdmin,
      bloque: "aprendizaje",
    })
    const original = await crearArchivoDePrueba({
      claseId: clase.id,
      subidoPor: idAdmin,
      estado: "confirmado",
      publicacionId: recurso,
    })
    const copiaId = idDeLaCopia(
      await pedir("POST", `/api/admin/clases/${clase.id}/duplicar`, tokenAdmin, {
        nombre: `Copia ${ficha()}`,
        maestroIds: [maestro.id],
      }),
    )
    const copia = await obtenerDb().archivo.findFirstOrThrow({ where: { claseId: copiaId } })
    const [trabajo] = await trabajosDeCopiaCon([copia.id])
    if (trabajo === undefined) throw new Error("Precondición: el duplicado encoló su copia")
    return { maestro, clase, original, copiaId, copia, trabajo }
  }

  it("ADM-T1B09: R-14, el admin borra el recurso de la copia mientras su objeto se copia → el worker no lanza ni rompe el CHECK, la fila queda descartada sin publicación ni copia_de y el worker no la revive", async () => {
    const d = await duplicarConUnArchivo()
    const copias: string[] = []
    const almacenQueDescartaEnVuelo: AlmacenDeObjetos = {
      copiar: async (_origen, destino) => {
        const r = await pedir(
          "DELETE",
          `/api/clases/${d.copiaId}/publicaciones/${d.copia.publicacionId ?? ""}`,
          tokenAdmin,
        )
        expect(r.statusCode, r.body).toBe(204)
        copias.push(destino)
        return "copiado"
      },
      borrar: () => Promise.resolve(),
    }
    await procesarCopiaDeObjetos(
      { id: d.trabajo.id, datos: d.trabajo.datos },
      { almacenDeObjetos: almacenQueDescartaEnVuelo, log },
    )
    expect(copias).toEqual([d.copia.claveObjeto])
    expect(
      await obtenerDb().archivo.findUniqueOrThrow({
        where: { id: d.copia.id },
        select: { estado: true, publicacionId: true, copiaDe: true },
      }),
    ).toEqual({ estado: "descartado", publicacionId: null, copiaDe: null })
    await procesarCopiasFallidas(
      { id: randomUUID(), idOriginal: d.trabajo.id, datos: d.trabajo.datos },
      { almacenDeObjetos: crearObjetosEnMemoria(), log },
    )
    expect(
      await obtenerDb().archivo.findUniqueOrThrow({
        where: { id: d.copia.id },
        select: { estado: true, copiaDe: true },
      }),
    ).toEqual({ estado: "descartado", copiaDe: null })
  }, 60_000)

  it("ADM-T1B10: datos fuera del esquema en COPIAR_OBJETOS, BORRAR_OBJETOS y COPIAR_OBJETOS_FALLIDO → completan sin tocar la copia en curso ni llamar al almacén (campo de más, 101 ids, id no uuid, null, texto, 1001 claves, clave vacía)", async () => {
    const d = await duplicarConUnArchivo()
    const objetos = crearObjetosEnMemoria([d.original.claveObjeto, "materiales/x/y"])
    const deps = { almacenDeObjetos: objetos, log }
    const copiasMalas: unknown[] = [
      { archivoIds: [d.copia.id], extra: 1 },
      { archivoIds: [d.copia.id, ...Array.from({ length: 100 }, () => randomUUID())] },
      { archivoIds: [d.copia.id, "no-es-uuid"] },
      { archivoIds: [] },
      { archivoIds: d.copia.id },
      null,
      "texto",
      [d.copia.id],
    ]
    for (const datos of copiasMalas) {
      await procesarCopiaDeObjetos({ id: randomUUID(), datos }, deps)
      await procesarCopiasFallidas({ id: randomUUID(), idOriginal: null, datos }, deps)
    }
    const borradosMalos: unknown[] = [
      { claves: ["materiales/x/y"], extra: 1 },
      { claves: Array.from({ length: 1001 }, () => "materiales/x/y") },
      { claves: [""] },
      { claves: [] },
      { claves: "materiales/x/y" },
      null,
    ]
    for (const datos of borradosMalos) {
      await procesarBorradoDeObjetos({ id: randomUUID(), datos }, deps)
    }
    expect(objetos.copias).toEqual([])
    expect(objetos.borrados).toEqual([])
    expect(
      await obtenerDb().archivo.findUniqueOrThrow({
        where: { id: d.copia.id },
        select: { estado: true, copiaDe: true },
      }),
    ).toEqual({ estado: "confirmado", copiaDe: d.original.id })
  }, 60_000)

  it("ADM-T1B11: un alumno que entra a la copia por código mientras su archivo se copia recibe 409 ARCHIVO_EN_COPIA en la descarga, sin firma; la original sigue descargándose; terminada la copia, el alumno descarga su clave", async () => {
    const d = await duplicarConUnArchivo()
    const alumno = await alumnoDePrueba()
    const tokenAlumno = await tokenDe(alumno)
    const { codigoInvitacion } = await obtenerDb().clase.findUniqueOrThrow({
      where: { id: d.copiaId },
      select: { codigoInvitacion: true },
    })
    const unirse = await pedir("POST", "/api/clases/unirse", tokenAlumno, {
      codigo: codigoInvitacion,
    })
    expect(unirse.statusCode, unirse.body).toBe(200)

    const firmadasAntes = almacen.descargasFirmadas.length
    const enCopia = await pedir(
      "POST",
      `/api/clases/${d.copiaId}/archivos/${d.copia.id}/descarga`,
      tokenAlumno,
    )
    expect(resumen(enCopia)).toBe("409 ARCHIVO_EN_COPIA")
    expect(almacen.descargasFirmadas.length).toBe(firmadasAntes)
    const original = await pedir(
      "POST",
      `/api/clases/${d.clase.id}/archivos/${d.original.id}/descarga`,
      await tokenDe(d.maestro),
    )
    expect(original.statusCode, original.body).toBe(200)

    const objetos = crearObjetosEnMemoria([d.original.claveObjeto])
    await procesarCopiaDeObjetos(
      { id: d.trabajo.id, datos: d.trabajo.datos },
      { almacenDeObjetos: objetos, log },
    )
    const despues = almacen.descargasFirmadas.length
    const lista = await pedir(
      "POST",
      `/api/clases/${d.copiaId}/archivos/${d.copia.id}/descarga`,
      tokenAlumno,
    )
    expect(lista.statusCode, lista.body).toBe(200)
    expect(almacen.descargasFirmadas.slice(despues).map((x) => x.clave)).toEqual([
      d.copia.claveObjeto,
    ])
  }, 60_000)
})
