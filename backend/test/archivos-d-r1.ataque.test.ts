import { createHash, createHmac, randomUUID } from "node:crypto"

import {
  descargaRespuestaSchema,
  errorApiSchema,
  listaPublicacionesRespuestaSchema,
  publicacionRespuestaSchema,
  solicitarSubidaRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { crearAlmacen } from "../src/adapters/storage/index.js"
import { construirApp } from "../src/app.js"
import { cargarEnv, validarEnv } from "../src/config/env.js"
import type { Almacen } from "../src/core/archivos/almacen.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
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
  crearArchivoDePrueba,
  crearClaseDePrueba,
  crearPublicacionDePrueba,
  inscribirDePrueba,
  leerArchivoDb,
  listarArchivosDb,
} from "./ayudas-clases.js"

// Ataque del Tester (CLASES-d, ronda 1; puntos 1 a 5 del plan y 1 a 9 y 15 de la lista del
// manager). Las dos rutas de archivos y la confirmación al publicar, contra un almacén mixto: las
// URL las firma el adaptador real de minio contra un endpoint inalcanzable (127.0.0.1:9, sin red,
// como PR-D03a) y los metadatos salen del doble en memoria (el "objeto subido"). Cada firma se
// comprueba con una verificación SigV4 propia (node:crypto, sin librerías de AWS): lo que haría el
// almacén al recibir la URL. Nada toca MinIO, R2 ni la red.

const LLAVE = "llave-del-ataque-d-r1"
const SECRETO = "secreto-del-ataque-d-r1"
const MB = 1024 * 1024

const firmador = crearAlmacen({
  endPoint: "127.0.0.1",
  port: 9,
  useSSL: false,
  accessKey: LLAVE,
  secretKey: SECRETO,
  region: "us-east-1",
  bucket: "campus-privado",
})
const memoria = crearAlmacenEnMemoria()
const subidasFirmadas: { clave: string; tipo: string }[] = []
const descargasFirmadas: { clave: string; tipo: string; disposicion: string }[] = []
const almacen: Almacen = {
  urlDeSubida: (o) => {
    subidasFirmadas.push(o)
    return firmador.urlDeSubida(o)
  },
  urlDeDescarga: (o) => {
    descargasFirmadas.push(o)
    return firmador.urlDeDescarga(o)
  },
  metadatosDe: (clave) => memoria.metadatosDe(clave),
}

let app: FastifyInstance | undefined
let appSinAlmacen: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const obtenerAppSinAlmacen = (): FastifyInstance => {
  if (!appSinAlmacen) throw new Error("La aplicación sin almacén no se construyó en beforeAll")
  return appSinAlmacen
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen })
  await app.ready()
  appSinAlmacen = await construirApp({ env: cargarEnv(), almacen: null })
  await appSinAlmacen.ready()
})

afterAll(async () => {
  // N-10: clases (con sus publicaciones y archivos en cascada) antes que los usuarios.
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await appSinAlmacen?.close()
  await app?.close()
})

// --- Verificación SigV4 de una URL prefirmada (lo que hace el almacén al recibirla) ---

const codificarEstricto = (texto: string): string =>
  encodeURIComponent(texto).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  )

const hmac = (llave: string | Buffer, dato: string): Buffer =>
  createHmac("sha256", llave).update(dato).digest()

const firmaValida = (texto: string, metodo: string, ruta?: string): boolean => {
  const url = new URL(texto)
  const firma = url.searchParams.get("X-Amz-Signature")
  const credencial = url.searchParams.get("X-Amz-Credential")
  const fecha = url.searchParams.get("X-Amz-Date")
  const firmados = url.searchParams.get("X-Amz-SignedHeaders")
  if (!firma || !credencial || !fecha || !firmados) return false
  const consulta = [...url.searchParams.entries()]
    .filter(([clave]) => clave !== "X-Amz-Signature")
    .map(([clave, valor]) => [codificarEstricto(clave), codificarEstricto(valor)] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([clave, valor]) => `${clave}=${valor}`)
    .join("&")
  const camino = decodeURIComponent(ruta ?? url.pathname)
    .split("/")
    .map(codificarEstricto)
    .join("/")
  const canonica = [
    metodo,
    camino,
    consulta,
    `host:${url.host}\n`,
    firmados,
    "UNSIGNED-PAYLOAD",
  ].join("\n")
  const [, dia = "", region = "", servicio = "", terminal = ""] = credencial.split("/")
  const alcance = [dia, region, servicio, terminal].join("/")
  const aFirmar = [
    "AWS4-HMAC-SHA256",
    fecha,
    alcance,
    createHash("sha256").update(canonica).digest("hex"),
  ].join("\n")
  let llave = hmac(`AWS4${SECRETO}`, dia)
  for (const parte of [region, servicio, terminal]) llave = hmac(llave, parte)
  return createHmac("sha256", llave).update(aFirmar).digest("hex") === firma
}

// --- Datos ---

interface Escenario {
  maestro: UsuarioDePrueba
  claseA: string
  claseB: string
  alumno: UsuarioDePrueba
  tokenMaestro: string
  tokenAlumno: string
}

const tokenDe = (usuario: { id: string }): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

// Un maestro dueño de DOS clases (A y B) y un alumno inscrito solo en A: así "otra clase" también
// es una clase propia del mismo maestro.
const escenario = async (): Promise<Escenario> => {
  const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Maestra D" })
  const claseA = await crearClaseDePrueba(idsClases, { maestroId: maestro.id, nombre: "Clase A" })
  const claseB = await crearClaseDePrueba(idsClases, { maestroId: maestro.id, nombre: "Clase B" })
  const alumno = await crearAlumnoDePrueba(idsUsuarios, { nombre: "Alumno D" })
  await inscribirDePrueba(claseA.id, alumno.id, "codigo")
  return {
    maestro,
    claseA: claseA.id,
    claseB: claseB.id,
    alumno,
    tokenMaestro: await tokenDe(maestro),
    tokenAlumno: await tokenDe(alumno),
  }
}

const confirmadoEn = async (
  claseId: string,
  autorId: string,
  datos: { nombre?: string; tipo?: string; tamano?: number } = {},
): Promise<{ id: string; publicacionId: string; claveObjeto: string }> => {
  const publicacionId = await crearPublicacionDePrueba({ claseId, autorId, tipo: "material" })
  const archivo = await crearArchivoDePrueba({
    claseId,
    subidoPor: autorId,
    estado: "confirmado",
    publicacionId,
    ...datos,
  })
  return { ...archivo, publicacionId }
}

const inyectar = (opciones: {
  servidor?: FastifyInstance
  method: "GET" | "POST" | "DELETE"
  url: string
  token?: string
  payload?: unknown
}): Promise<LightMyRequestResponse> =>
  (opciones.servidor ?? obtenerApp()).inject({
    method: opciones.method,
    url: opciones.url,
    ...(opciones.payload === undefined ? {} : { payload: opciones.payload as object }),
    headers: opciones.token === undefined ? {} : { authorization: `Bearer ${opciones.token}` },
  })

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

const urlArchivos = (claseId: string): string => `/api/clases/${claseId}/archivos`
const urlPublicaciones = (claseId: string): string => `/api/clases/${claseId}/publicaciones`
const urlDescarga = (claseId: string, archivoId: string): string =>
  `/api/clases/${claseId}/archivos/${archivoId}/descarga`

const solicitar = (e: Escenario, payload: unknown, claseId = e.claseA) =>
  inyectar({ method: "POST", url: urlArchivos(claseId), token: e.tokenMaestro, payload })

// Pide la subida por la API y deja el "objeto" en el doble con lo declarado (o con `real`).
const subirListo = async (
  e: Escenario,
  {
    nombre = "guia.pdf",
    tipo = "application/pdf",
    tamano = 2000,
    real,
    claseId = e.claseA,
  }: {
    nombre?: string
    tipo?: string
    tamano?: number
    real?: { tamano: number; tipo: string }
    claseId?: string
  } = {},
): Promise<string> => {
  const respuesta = await solicitar(e, { nombre, tipo, tamano }, claseId)
  expect(respuesta.statusCode, respuesta.body).toBe(201)
  const { archivo } = solicitarSubidaRespuestaSchema.parse(respuesta.json())
  memoria.subir(`materiales/${claseId}/${archivo.id}`, real ?? { tamano, tipo })
  return archivo.id
}

const publicar = (e: Escenario, archivoIds: unknown, claseId = e.claseA) =>
  inyectar({
    method: "POST",
    url: urlPublicaciones(claseId),
    token: e.tokenMaestro,
    payload: { tipo: "material", titulo: "Con adjuntos", archivoIds },
  })

const contarTrabajos = async (claseId: string): Promise<number> => {
  const filas = await obtenerDb().$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM pgboss.job WHERE data ->> 'claseId' = ${claseId}::text`
  const fila = filas[0]
  if (!fila) throw new Error("Precondición: el conteo de trabajos no devolvió fila")
  return fila.n
}

// Retiene las filas de archivos con FOR UPDATE (transacción propia, con timeout explícito) hasta
// que todas las operaciones lanzadas están formadas detrás de ellas, directa o transitivamente
// (pg_blocking_pids recursivo, como ayudas-concurrencia.ts), y después las suelta.
const retenerArchivosYLanzar = async (
  ids: readonly string[],
  lanzar: () => Promise<LightMyRequestResponse>[],
): Promise<LightMyRequestResponse[]> => {
  let lanzadas: Promise<LightMyRequestResponse>[] = []
  await obtenerDb().$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM archivos WHERE id = ANY(${[...ids]}::uuid[]) FOR UPDATE`
      const [propio] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
      if (!propio) throw new Error("Precondición: sin pid de la transacción retenedora")
      lanzadas = lanzar()
      const limite = Date.now() + 4000
      let detras = 0
      while (Date.now() < limite) {
        const [fila] = await obtenerDb().$queryRaw<{ n: number }[]>`
          WITH RECURSIVE bloqueados(pid) AS (
            SELECT pid FROM pg_stat_activity WHERE ${propio.pid}::int = ANY(pg_blocking_pids(pid))
            UNION
            SELECT a.pid FROM pg_stat_activity a
            JOIN bloqueados b ON b.pid = ANY(pg_blocking_pids(a.pid))
          )
          SELECT count(*)::int AS n FROM bloqueados`
        detras = fila?.n ?? 0
        if (detras >= lanzadas.length) break
        await new Promise((resolver) => setTimeout(resolver, 25))
      }
      expect(detras, "Precondición: las operaciones deben quedar detrás de la fila retenida").toBe(
        lanzadas.length,
      )
    },
    { timeout: 15_000, maxWait: 5_000 },
  )
  return Promise.all(lanzadas)
}

const contarArchivos = async (claseId: string): Promise<number> =>
  (await listarArchivosDb(claseId)).length

const clavesDe = (valor: unknown): string[] => {
  const claves: string[] = []
  const pila: unknown[] = [valor]
  while (pila.length > 0) {
    const actual = pila.pop()
    if (actual === null || typeof actual !== "object") continue
    for (const [clave, hijo] of Object.entries(actual)) {
      claves.push(clave)
      pila.push(hijo)
    }
  }
  return claves
}

const adminId = async (): Promise<string> => {
  const admin = await obtenerDb().usuario.findFirst({
    where: { rol: "admin" },
    select: { id: true },
  })
  if (!admin) throw new Error("Precondición: no hay administrador sembrado en la base de pruebas")
  return admin.id
}

describe("ataque d-r1: alcance por archivoId en la descarga", () => {
  it("otra clase (aun del mismo maestro), pendiente, descartado e inexistente responden idéntico 404, sin firmar; un archivoId que no es UUID da 400", async () => {
    const e = await escenario()
    const deOtraClase = await confirmadoEn(e.claseB, e.maestro.id)
    const pendiente = await crearArchivoDePrueba({ claseId: e.claseA, subidoPor: e.maestro.id })
    const descartado = await crearArchivoDePrueba({
      claseId: e.claseA,
      subidoPor: e.maestro.id,
      estado: "descartado",
    })
    const firmasAntes = descargasFirmadas.length

    const cuerpos: string[] = []
    for (const token of [e.tokenAlumno, e.tokenMaestro]) {
      for (const archivoId of [deOtraClase.id, pendiente.id, descartado.id, randomUUID()]) {
        const respuesta = await inyectar({
          method: "POST",
          url: urlDescarga(e.claseA, archivoId),
          token,
        })
        expect(respuesta.statusCode, `${archivoId}: ${respuesta.body}`).toBe(404)
        cuerpos.push(respuesta.body)
      }
    }
    expect(new Set(cuerpos).size).toBe(1)
    expect(codigoDe({ json: () => JSON.parse(cuerpos[0] ?? "{}") } as LightMyRequestResponse)).toBe(
      "ARCHIVO_NO_ENCONTRADO",
    )
    expect(descargasFirmadas.length).toBe(firmasAntes)

    for (const malo of ["no-es-uuid", "1", `${randomUUID()}x`, "%20"]) {
      const respuesta = await inyectar({
        method: "POST",
        url: urlDescarga(e.claseA, malo),
        token: e.tokenAlumno,
      })
      expect(respuesta.statusCode, malo).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
    }
    expect(descargasFirmadas.length).toBe(firmasAntes)
  })
})

describe("ataque d-r1: confirmar al publicar", () => {
  it("rechaza con 400 sin publicar, sin encolar y sin tocar la fila: pendiente de otra clase del mismo maestro, de otro maestro, de 24 h + 1 min, confirmado, descartado, repetido, 6 ids y sin objeto", async () => {
    const e = await escenario()
    const otroMaestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
    const claseAjena = await crearClaseDePrueba(idsClases, { maestroId: otroMaestro.id })

    const deClaseB = await crearArchivoDePrueba({ claseId: e.claseB, subidoPor: e.maestro.id })
    memoria.subir(deClaseB.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
    const deOtroMaestro = await crearArchivoDePrueba({
      claseId: claseAjena.id,
      subidoPor: otroMaestro.id,
    })
    memoria.subir(deOtroMaestro.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
    // Un pendiente de otro usuario dentro de la clase A (sembrado: un maestro ajeno nunca podría
    // solicitarlo por la API, pero la confirmación no debe aceptarlo).
    const ajenoEnA = await crearArchivoDePrueba({ claseId: e.claseA, subidoPor: otroMaestro.id })
    memoria.subir(ajenoEnA.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
    const viejo = await crearArchivoDePrueba({
      claseId: e.claseA,
      subidoPor: e.maestro.id,
      creadoEn: new Date(Date.now() - 24 * 60 * 60 * 1000 - 60_000),
    })
    memoria.subir(viejo.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
    const yaConfirmado = await confirmadoEn(e.claseA, e.maestro.id)
    memoria.subir(yaConfirmado.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
    const descartado = await crearArchivoDePrueba({
      claseId: e.claseA,
      subidoPor: e.maestro.id,
      estado: "descartado",
    })
    memoria.subir(descartado.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
    const sinObjeto = await subirListo(e)
    memoria.objetos.delete(`materiales/${e.claseA}/${sinObjeto}`)
    const bueno = await subirListo(e)
    const seis = await Promise.all([1, 2, 3, 4, 5, 6].map(() => subirListo(e)))

    const casos: { descripcion: string; ids: unknown; codigo: string }[] = [
      { descripcion: "de la clase B", ids: [deClaseB.id], codigo: "ARCHIVO_INVALIDO" },
      { descripcion: "de otro maestro", ids: [deOtroMaestro.id], codigo: "ARCHIVO_INVALIDO" },
      { descripcion: "de otro usuario en A", ids: [ajenoEnA.id], codigo: "ARCHIVO_INVALIDO" },
      { descripcion: "de hace 24 h + 1 min", ids: [viejo.id], codigo: "ARCHIVO_INVALIDO" },
      { descripcion: "ya confirmado", ids: [yaConfirmado.id], codigo: "ARCHIVO_INVALIDO" },
      { descripcion: "descartado", ids: [descartado.id], codigo: "ARCHIVO_INVALIDO" },
      {
        descripcion: "uno bueno y uno ajeno",
        ids: [bueno, deClaseB.id],
        codigo: "ARCHIVO_INVALIDO",
      },
      { descripcion: "repetido", ids: [bueno, bueno], codigo: "VALIDACION" },
      { descripcion: "seis", ids: seis, codigo: "VALIDACION" },
      { descripcion: "sin objeto", ids: [sinObjeto], codigo: "ARCHIVO_NO_SUBIDO" },
      { descripcion: "inexistente", ids: [randomUUID()], codigo: "ARCHIVO_INVALIDO" },
    ]
    const publicacionesAntes = await contarPublicaciones(e.claseA)
    const trabajosAntes = await contarTrabajos(e.claseA)
    const filasAntes = await listarArchivosDb(e.claseA)

    for (const caso of casos) {
      const respuesta = await publicar(e, caso.ids)
      expect(respuesta.statusCode, `${caso.descripcion}: ${respuesta.body}`).toBe(400)
      expect(codigoDe(respuesta), caso.descripcion).toBe(caso.codigo)
    }

    expect(await contarPublicaciones(e.claseA)).toBe(publicacionesAntes)
    expect(await contarTrabajos(e.claseA)).toBe(trabajosAntes)
    expect(await listarArchivosDb(e.claseA)).toEqual(filasAntes)
    expect((await leerArchivoDb(deClaseB.id))?.estado).toBe("pendiente")
    expect((await leerArchivoDb(deOtroMaestro.id))?.estado).toBe("pendiente")

    // Control: el bueno, solo, sí se confirma (los rechazos de arriba no lo consumieron).
    const control = await publicar(e, [bueno])
    expect(control.statusCode, control.body).toBe(201)
  })

  it(
    "dos publicaciones simultáneas que reclaman el mismo archivo: una gana, la otra responde 400 y no queda publicación ni trabajo de más",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const archivoId = await subirListo(e)
      const publicacionesAntes = await contarPublicaciones(e.claseA)
      const trabajosAntes = await contarTrabajos(e.claseA)

      // La fila del archivo queda retenida hasta que las dos transacciones están formadas detrás de
      // ella (directa o transitivamente): las dos ya pasaron la lectura previa y el almacén, y compiten
      // en el UPDATE.
      const respuestas = await retenerArchivosYLanzar([archivoId], () => [
        publicar(e, [archivoId]),
        publicar(e, [archivoId]),
      ])

      const estados = respuestas.map((r) => r.statusCode).sort()
      expect(estados, respuestas.map((r) => r.body).join(" | ")).toEqual([201, 400])
      const perdedora = respuestas.find((r) => r.statusCode === 400)
      if (!perdedora) throw new Error("Falta la respuesta 400")
      expect(codigoDe(perdedora)).toBe("ARCHIVO_INVALIDO")
      const ganadora = respuestas.find((r) => r.statusCode === 201)
      if (!ganadora) throw new Error("Falta la respuesta 201")
      const { publicacion } = publicacionRespuestaSchema.parse(ganadora.json())
      expect(publicacion.adjuntos.map((a) => a.id)).toEqual([archivoId])
      expect(await contarPublicaciones(e.claseA)).toBe(publicacionesAntes + 1)
      expect(await contarTrabajos(e.claseA)).toBe(trabajosAntes + 1)
      expect(await leerArchivoDb(archivoId)).toMatchObject({
        estado: "confirmado",
        publicacionId: publicacion.id,
      })
    },
  )

  it(
    "[A, B] y [B, A] a la vez, retenidas detrás de las dos filas: una gana con los dos, la otra 400, sin bloqueo mutuo ni 500",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const a = await subirListo(e)
      const b = await subirListo(e, { nombre: "b.png", tipo: "image/png" })
      const respuestas = await retenerArchivosYLanzar([a, b], () => [
        publicar(e, [a, b]),
        publicar(e, [b, a]),
      ])
      expect(
        respuestas.map((r) => r.statusCode).sort(),
        respuestas.map((r) => r.body).join(" | "),
      ).toEqual([201, 400])
      const filas = await Promise.all([leerArchivoDb(a), leerArchivoDb(b)])
      expect(filas.map((f) => f?.estado)).toEqual(["confirmado", "confirmado"])
      expect(filas[0]?.publicacionId).toBe(filas[1]?.publicacionId)
    },
  )
})

describe("ataque d-r1: lo declarado contra lo real", () => {
  it("solicitar: extensión cruzada, doble extensión, sin extensión, SVG, HTML, tipos con mayúsculas o parámetros, tamaños límite y tipos del prototipo; ningún 400 escribe ni firma", async () => {
    const e = await escenario()
    const casos: { payload: unknown; estado: number; codigo?: string }[] = [
      {
        payload: { nombre: "foto.png.html", tipo: "image/png", tamano: 10 },
        estado: 400,
        codigo: "ARCHIVO_INVALIDO",
      },
      {
        payload: { nombre: "foto", tipo: "image/png", tamano: 10 },
        estado: 400,
        codigo: "ARCHIVO_INVALIDO",
      },
      {
        payload: { nombre: "foto.png.", tipo: "image/png", tamano: 10 },
        estado: 400,
        codigo: "ARCHIVO_INVALIDO",
      },
      {
        payload: { nombre: "foto.png ", tipo: "image/png", tamano: 10 },
        estado: 400,
        codigo: "ARCHIVO_INVALIDO",
      },
      {
        payload: { nombre: "x.svg", tipo: "image/svg+xml", tamano: 10 },
        estado: 400,
        codigo: "ARCHIVO_INVALIDO",
      },
      {
        payload: { nombre: "x.html", tipo: "text/html", tamano: 10 },
        estado: 400,
        codigo: "ARCHIVO_INVALIDO",
      },
      {
        payload: { nombre: "x.png", tipo: "IMAGE/PNG", tamano: 10 },
        estado: 400,
        codigo: "ARCHIVO_INVALIDO",
      },
      {
        payload: { nombre: "x.png", tipo: "image/png; charset=utf-8", tamano: 10 },
        estado: 400,
        codigo: "ARCHIVO_INVALIDO",
      },
      {
        payload: { nombre: "x.pdf", tipo: "application/pdf", tamano: 0 },
        estado: 400,
        codigo: "ARCHIVO_INVALIDO",
      },
      {
        payload: { nombre: "x.pdf", tipo: "application/pdf", tamano: -1 },
        estado: 400,
        codigo: "ARCHIVO_INVALIDO",
      },
      {
        payload: { nombre: "x.pdf", tipo: "application/pdf", tamano: 25 * MB + 1 },
        estado: 400,
        codigo: "ARCHIVO_INVALIDO",
      },
      {
        payload: { nombre: "x.pdf", tipo: "application/pdf", tamano: 1.5 },
        estado: 400,
        codigo: "VALIDACION",
      },
      {
        payload: { nombre: "x.pdf", tipo: "application/pdf", tamano: 2 ** 53 },
        estado: 400,
        codigo: "VALIDACION",
      },
      {
        payload: { nombre: "x.pdf", tipo: "application/pdf", tamano: "10" },
        estado: 400,
        codigo: "VALIDACION",
      },
      {
        payload: { nombre: "x.pdf", tipo: "application/pdf", tamano: null },
        estado: 400,
        codigo: "VALIDACION",
      },
      { payload: { nombre: "x.pdf", tipo: "application/pdf" }, estado: 400, codigo: "VALIDACION" },
      {
        payload: { nombre: "", tipo: "application/pdf", tamano: 10 },
        estado: 400,
        codigo: "VALIDACION",
      },
      { payload: [], estado: 400, codigo: "VALIDACION" },
      {
        payload: { nombre: "x.pdf", tipo: "__proto__", tamano: 10 },
        estado: 400,
        codigo: "ARCHIVO_INVALIDO",
      },
      {
        payload: { nombre: "x.pdf", tipo: "constructor", tamano: 10 },
        estado: 400,
        codigo: "ARCHIVO_INVALIDO",
      },
      {
        payload: { nombre: "x.pdf", tipo: "toString", tamano: 10 },
        estado: 400,
        codigo: "ARCHIVO_INVALIDO",
      },
      {
        payload: { nombre: "x.pdf", tipo: "hasOwnProperty", tamano: 10 },
        estado: 400,
        codigo: "ARCHIVO_INVALIDO",
      },
    ]
    const filasAntes = await contarArchivos(e.claseA)
    const firmasAntes = subidasFirmadas.length
    for (const caso of casos) {
      const respuesta = await solicitar(e, caso.payload)
      const etiqueta = `${JSON.stringify(caso.payload)}: ${respuesta.body}`
      expect(respuesta.statusCode, etiqueta).toBe(caso.estado)
      expect(codigoDe(respuesta), etiqueta).toBe(caso.codigo)
    }
    expect(await contarArchivos(e.claseA)).toBe(filasAntes)
    expect(subidasFirmadas.length).toBe(firmasAntes)

    // Lo que sí pasa: 25 MB exactos y la doble extensión que termina en la extensión correcta. Los
    // campos de más no cambian la clave.
    const justo = await solicitar(e, { nombre: "x.pdf", tipo: "application/pdf", tamano: 25 * MB })
    expect(justo.statusCode, justo.body).toBe(201)
    const doble = await solicitar(e, {
      nombre: "foto.html.png",
      tipo: "image/png",
      tamano: 10,
      claveObjeto: "../../otra",
      id: "00000000-0000-4000-8000-000000000000",
      claseId: e.claseB,
    })
    expect(doble.statusCode, doble.body).toBe(201)
    const { archivo } = solicitarSubidaRespuestaSchema.parse(doble.json())
    expect(archivo.id).not.toBe("00000000-0000-4000-8000-000000000000")
    expect((await leerArchivoDb(archivo.id))?.claveObjeto).toBe(
      `materiales/${e.claseA}/${archivo.id}`,
    )
  })

  it("confirmar: 1 byte de más o de menos, otro tipo real o ninguno dan 400; el mismo tipo con parámetros o en mayúsculas se acepta", async () => {
    const e = await escenario()
    const rechazos: { real: { tamano: number; tipo: string }; codigo: string }[] = [
      { real: { tamano: 2001, tipo: "image/png" }, codigo: "ARCHIVO_INVALIDO" },
      { real: { tamano: 1999, tipo: "image/png" }, codigo: "ARCHIVO_INVALIDO" },
      { real: { tamano: 2000, tipo: "text/html" }, codigo: "ARCHIVO_INVALIDO" },
      { real: { tamano: 2000, tipo: "image/svg+xml" }, codigo: "ARCHIVO_INVALIDO" },
      { real: { tamano: 2000, tipo: "" }, codigo: "ARCHIVO_INVALIDO" },
    ]
    for (const { real, codigo } of rechazos) {
      const id = await subirListo(e, { nombre: "f.png", tipo: "image/png", tamano: 2000, real })
      const respuesta = await publicar(e, [id])
      expect(respuesta.statusCode, JSON.stringify(real)).toBe(400)
      expect(codigoDe(respuesta)).toBe(codigo)
      expect((await leerArchivoDb(id))?.estado).toBe("pendiente")
    }
    for (const tipoReal of ["image/png; charset=binary", "IMAGE/PNG"]) {
      const id = await subirListo(e, {
        nombre: "f.png",
        tipo: "image/png",
        tamano: 2000,
        real: { tamano: 2000, tipo: tipoReal },
      })
      const respuesta = await publicar(e, [id])
      expect(respuesta.statusCode, `${tipoReal}: ${respuesta.body}`).toBe(201)
    }
  })
})

describe("ataque d-r1: el nombre", () => {
  it("255 puntos de código (con emojis) se aceptan y 256 no; separadores, controles C0 y C1, saltos y bidireccionales se rechazan sin escribir", async () => {
    const e = await escenario()
    const emoji = "\u{1F4D8}"
    const de255 = `${emoji.repeat(251)}.pdf`
    const de256 = `${emoji.repeat(252)}.pdf`
    expect(Array.from(de255)).toHaveLength(255)
    const aceptado = await solicitar(e, { nombre: de255, tipo: "application/pdf", tamano: 10 })
    expect(aceptado.statusCode, aceptado.body).toBe(201)
    expect(solicitarSubidaRespuestaSchema.parse(aceptado.json()).archivo.nombre).toBe(de255)

    const filasAntes = await contarArchivos(e.claseA)
    const malos = [
      de256,
      "a/b.pdf",
      "a\\b.pdf",
      "../../a.pdf",
      "a\u0000.pdf",
      "a\u0007.pdf",
      "a\u007F.pdf",
      "a\u0085.pdf",
      "a\r\nX-Inyectada: 1.pdf",
      "a\n.pdf",
      "a\u2028.pdf",
      "a\u2029.pdf",
      "tarea\u202Efdp.pdf",
      "tarea\u202Dfdp.pdf",
      "tarea\u2066fdp.pdf",
      "tarea\u2069fdp.pdf",
    ]
    for (const nombre of malos) {
      const respuesta = await solicitar(e, { nombre, tipo: "application/pdf", tamano: 10 })
      expect(respuesta.statusCode, JSON.stringify(nombre)).toBe(400)
    }
    expect(await contarArchivos(e.claseA)).toBe(filasAntes)
  })

  it("un sustituto suelto: o se rechaza, o lo que responde 201 es lo mismo que se guarda", async () => {
    const e = await escenario()
    const nombre = "tema\uD800 uno.pdf"
    const respuesta = await solicitar(e, { nombre, tipo: "application/pdf", tamano: 10 })
    expect([201, 400], respuesta.body).toContain(respuesta.statusCode)
    const respondido =
      respuesta.statusCode === 201
        ? solicitarSubidaRespuestaSchema.parse(respuesta.json()).archivo
        : null
    const guardado = respondido === null ? null : await leerArchivoDb(respondido.id)
    // Rechazarlo es válido; aceptarlo solo si lo guardado es lo que se respondió (y lo que el
    // maestro eligió), no un U+FFFD puesto en silencio por la codificación.
    expect(guardado?.nombre ?? null).toBe(respondido?.nombre ?? null)
  })

  it("Content-Disposition firmado: comillas, punto y coma, %, apóstrofo, paréntesis, emojis y acentos sin inyección; filename ASCII no vacío; filename* decodifica al nombre; firma válida", async () => {
    const e = await escenario()
    const nombres = [
      'Guía "final"; v2 %20 (1)*.pdf',
      "\u{1F600}\u{1F600}.pdf",
      ";;;.txt",
      "a'b'c.pdf",
      "ñandú\u00A0azul.pdf",
      "=?utf-8?b?QQ==?=.pdf",
    ]
    for (const nombre of nombres) {
      const tipo = nombre.endsWith(".txt") ? "text/plain" : "application/pdf"
      const archivo = await confirmadoEn(e.claseA, e.maestro.id, { nombre, tipo })
      const respuesta = await inyectar({
        method: "POST",
        url: urlDescarga(e.claseA, archivo.id),
        token: e.tokenAlumno,
      })
      expect(respuesta.statusCode, respuesta.body).toBe(200)
      expect(respuesta.headers["cache-control"]).toBe("no-store")
      const { url } = descargaRespuestaSchema.parse(respuesta.json())
      expect(firmaValida(url, "GET"), nombre).toBe(true)
      const parametros = new URL(url).searchParams
      expect(parametros.get("response-content-type")).toBe(tipo)
      const disposicion = parametros.get("response-content-disposition") ?? ""
      expect(disposicion, nombre).toMatch(
        /^attachment; filename="[A-Za-z0-9._ -]+"; filename\*=UTF-8''[A-Za-z0-9%!._~-]+$/,
      )
      expect(disposicion).not.toMatch(/[\r\n]/)
      const codificado = disposicion.slice(disposicion.indexOf("UTF-8''") + "UTF-8''".length)
      expect(decodeURIComponent(codificado)).toBe(nombre)
    }
  })
})

describe("ataque d-r1: la URL prefirmada", () => {
  it("subida: firmada para PUT y para su clave; no sirve como GET ni para otra clave; 300 s y solo host firmado", async () => {
    const e = await escenario()
    const respuesta = await solicitar(e, { nombre: "a.pdf", tipo: "application/pdf", tamano: 10 })
    expect(respuesta.statusCode, respuesta.body).toBe(201)
    expect(respuesta.headers["cache-control"]).toBe("no-store")
    const { archivo, subida } = solicitarSubidaRespuestaSchema.parse(respuesta.json())
    const url = new URL(subida.url)
    const clave = `materiales/${e.claseA}/${archivo.id}`
    expect(url.pathname).toBe(`/campus-privado/${clave}`)
    expect(url.searchParams.get("X-Amz-Expires")).toBe("300")
    expect(url.searchParams.get("X-Amz-SignedHeaders")).toBe("host")
    expect(firmaValida(subida.url, "PUT")).toBe(true)
    expect(firmaValida(subida.url, "GET")).toBe(false)
    expect(
      firmaValida(subida.url, "PUT", `/campus-privado/materiales/${e.claseA}/${randomUUID()}`),
    ).toBe(false)
    expect(
      firmaValida(subida.url, "PUT", `/campus-privado/materiales/${e.claseB}/${archivo.id}`),
    ).toBe(false)
    // La vigencia que anuncia la API no supera en más de un segundo la de la firma.
    const fecha = url.searchParams.get("X-Amz-Date") ?? ""
    const firmadaEn = Date.parse(
      `${fecha.slice(0, 4)}-${fecha.slice(4, 6)}-${fecha.slice(6, 8)}T${fecha.slice(9, 11)}:${fecha.slice(11, 13)}:${fecha.slice(13, 15)}Z`,
    )
    expect(Date.parse(subida.expiraEn) - (firmadaEn + 300_000)).toBeLessThan(1000)
    expect(subida.cabeceras).toEqual({ "Content-Type": "application/pdf" })
  })

  it("muro: vista previa inline solo para PNG, JPEG, WebP y GIF, con su tipo y firma válida; descarga attachment; ninguna respuesta lleva la clave como campo", async () => {
    const e = await escenario()
    const tipos: [string, string][] = [
      ["a.png", "image/png"],
      ["b.jpg", "image/jpeg"],
      ["c.webp", "image/webp"],
      ["d.gif", "image/gif"],
      ["e.pdf", "application/pdf"],
      ["f.txt", "text/plain"],
      ["g.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      ["h.svg", "image/svg+xml"],
    ]
    const ids: Record<string, string> = {}
    for (const [nombre, tipo] of tipos) {
      ids[nombre] = (await confirmadoEn(e.claseA, e.maestro.id, { nombre, tipo })).id
    }
    for (const token of [e.tokenAlumno, e.tokenMaestro]) {
      const respuesta = await inyectar({
        method: "GET",
        url: `${urlPublicaciones(e.claseA)}?limite=50`,
        token,
      })
      expect(respuesta.statusCode, respuesta.body).toBe(200)
      const cuerpo: unknown = respuesta.json()
      const claves = clavesDe(cuerpo)
      for (const prohibida of ["claveObjeto", "clave_objeto", "clave", "subidoPor", "estadoPago"]) {
        expect(claves).not.toContain(prohibida)
      }
      const lista = listaPublicacionesRespuestaSchema.parse(cuerpo)
      const adjuntos = lista.publicaciones.flatMap((p) => p.adjuntos)
      expect(adjuntos).toHaveLength(tipos.length)
      for (const adjunto of adjuntos) {
        const esImagen = ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
          adjunto.tipo,
        )
        if (!esImagen) {
          expect(adjunto.vistaPrevia, adjunto.nombre).toBeNull()
          continue
        }
        const url = adjunto.vistaPrevia?.url ?? ""
        expect(firmaValida(url, "GET"), adjunto.nombre).toBe(true)
        const parametros = new URL(url).searchParams
        expect(parametros.get("response-content-type")).toBe(adjunto.tipo)
        expect(parametros.get("response-content-disposition") ?? "").toMatch(/^inline; /)
        expect(parametros.get("X-Amz-Expires")).toBe("300")
      }
    }
    const descarga = await inyectar({
      method: "POST",
      url: urlDescarga(e.claseA, ids["a.png"] ?? ""),
      token: e.tokenAlumno,
    })
    expect(descarga.statusCode, descarga.body).toBe(200)
    expect(clavesDe(descarga.json())).toEqual(["url", "expiraEn"])
    const parametros = new URL(descargaRespuestaSchema.parse(descarga.json()).url).searchParams
    expect(parametros.get("response-content-disposition") ?? "").toMatch(/^attachment; /)
  })
})

describe("ataque d-r1: alumno restringido, roles y sesión", () => {
  it("restringido inscrito: muro, descarga, solicitar y publicar responden 403 ACCESO_RESTRINGIDO sin firmar nada", async () => {
    const e = await escenario()
    const restringido = await crearAlumnoDePrueba(idsUsuarios, {
      nombre: "Restringido D",
      accesoRestringido: true,
    })
    await inscribirDePrueba(e.claseA, restringido.id, "manual")
    const archivo = await confirmadoEn(e.claseA, e.maestro.id, {
      nombre: "f.png",
      tipo: "image/png",
    })
    const token = await tokenDe(restringido)
    const subidas = subidasFirmadas.length
    const descargas = descargasFirmadas.length
    const peticiones = [
      inyectar({ method: "GET", url: urlPublicaciones(e.claseA), token }),
      inyectar({ method: "POST", url: urlDescarga(e.claseA, archivo.id), token }),
      inyectar({
        method: "POST",
        url: urlArchivos(e.claseA),
        token,
        payload: { nombre: "a.pdf", tipo: "application/pdf", tamano: 10 },
      }),
    ]
    for (const respuesta of await Promise.all(peticiones)) {
      expect(respuesta.statusCode, respuesta.body).toBe(403)
      expect(codigoDe(respuesta)).toBe("ACCESO_RESTRINGIDO")
      expect(respuesta.body).not.toContain("X-Amz")
    }
    expect(subidasFirmadas.length).toBe(subidas)
    expect(descargasFirmadas.length).toBe(descargas)
  })

  it("estudiante inscrito no solicita ni publica; admin no entra a ninguna; maestro ajeno 403; con cambio de contraseña pendiente, 403; dado de baja, 401. Nada se escribe ni se firma", async () => {
    const e = await escenario()
    const archivo = await confirmadoEn(e.claseA, e.maestro.id)
    const ajeno = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
    const conCambio = await crearUsuarioDePrueba(idsUsuarios, {
      rol: "maestro",
      debeCambiarContrasena: true,
    })
    const claseConCambio = await crearClaseDePrueba(idsClases, { maestroId: conCambio.id })
    const deBaja = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", activo: false })
    const claseDeBaja = await crearClaseDePrueba(idsClases, { maestroId: deBaja.id })
    const pendienteConCambio = await crearArchivoDePrueba({
      claseId: claseConCambio.id,
      subidoPor: conCambio.id,
    })
    memoria.subir(pendienteConCambio.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
    const confirmadoConCambio = await confirmadoEn(claseConCambio.id, conCambio.id)
    const admin = await adminId()
    const cuerpo = { nombre: "a.pdf", tipo: "application/pdf", tamano: 10 }
    // C-23 (PA-12 de la ronda 2): el conteo se acota a lo que este caso podría escribir, porque otros
    // archivos de pruebas insertan en `archivos` en paralelo. Toda clase que aparece en una URL del
    // caso, o todo usuario que hace una petición: una escritura indebida con otro claseId también
    // cuenta.
    const filasDelCaso = {
      OR: [
        { claseId: { in: [e.claseA, claseConCambio.id, claseDeBaja.id] } },
        { subidoPor: { in: [e.alumno.id, admin, ajeno.id, conCambio.id, deBaja.id] } },
      ],
    }
    const filasAntes = await obtenerDb().archivo.count({ where: filasDelCaso })
    const subidas = subidasFirmadas.length
    const descargas = descargasFirmadas.length

    const casos: {
      descripcion: string
      token: string
      method: "POST"
      url: string
      payload?: unknown
      estado: number
      codigo: string
    }[] = [
      {
        descripcion: "estudiante solicita",
        token: e.tokenAlumno,
        method: "POST",
        url: urlArchivos(e.claseA),
        payload: cuerpo,
        estado: 403,
        codigo: "ROL_NO_PERMITIDO",
      },
      {
        descripcion: "estudiante publica con archivoIds",
        token: e.tokenAlumno,
        method: "POST",
        url: urlPublicaciones(e.claseA),
        payload: { tipo: "anuncio", texto: "x", archivoIds: [archivo.id] },
        estado: 403,
        codigo: "ROL_NO_PERMITIDO",
      },
      {
        descripcion: "admin solicita",
        token: await tokenDe({ id: admin }),
        method: "POST",
        url: urlArchivos(e.claseA),
        payload: cuerpo,
        estado: 403,
        codigo: "ROL_NO_PERMITIDO",
      },
      {
        descripcion: "admin descarga",
        token: await tokenDe({ id: admin }),
        method: "POST",
        url: urlDescarga(e.claseA, archivo.id),
        estado: 403,
        codigo: "ROL_NO_PERMITIDO",
      },
      {
        descripcion: "maestro ajeno solicita",
        token: await tokenDe(ajeno),
        method: "POST",
        url: urlArchivos(e.claseA),
        payload: cuerpo,
        estado: 403,
        codigo: "SIN_ACCESO_A_LA_CLASE",
      },
      {
        descripcion: "maestro ajeno descarga",
        token: await tokenDe(ajeno),
        method: "POST",
        url: urlDescarga(e.claseA, archivo.id),
        estado: 403,
        codigo: "SIN_ACCESO_A_LA_CLASE",
      },
      {
        descripcion: "con cambio pendiente solicita",
        token: await tokenDe(conCambio),
        method: "POST",
        url: urlArchivos(claseConCambio.id),
        payload: cuerpo,
        estado: 403,
        codigo: "CAMBIO_DE_CONTRASENA_REQUERIDO",
      },
      {
        descripcion: "con cambio pendiente publica",
        token: await tokenDe(conCambio),
        method: "POST",
        url: urlPublicaciones(claseConCambio.id),
        payload: { tipo: "anuncio", texto: "x", archivoIds: [pendienteConCambio.id] },
        estado: 403,
        codigo: "CAMBIO_DE_CONTRASENA_REQUERIDO",
      },
      {
        descripcion: "con cambio pendiente descarga",
        token: await tokenDe(conCambio),
        method: "POST",
        url: urlDescarga(claseConCambio.id, confirmadoConCambio.id),
        estado: 403,
        codigo: "CAMBIO_DE_CONTRASENA_REQUERIDO",
      },
      {
        descripcion: "dado de baja solicita",
        token: await tokenDe(deBaja),
        method: "POST",
        url: urlArchivos(claseDeBaja.id),
        payload: cuerpo,
        estado: 401,
        codigo: "NO_AUTENTICADO",
      },
      {
        descripcion: "sin token",
        token: "",
        method: "POST",
        url: urlDescarga(e.claseA, archivo.id),
        estado: 401,
        codigo: "NO_AUTENTICADO",
      },
    ]
    for (const caso of casos) {
      const respuesta = await inyectar({
        method: caso.method,
        url: caso.url,
        ...(caso.token === "" ? {} : { token: caso.token }),
        ...(caso.payload === undefined ? {} : { payload: caso.payload }),
      })
      expect(respuesta.statusCode, `${caso.descripcion}: ${respuesta.body}`).toBe(caso.estado)
      expect(codigoDe(respuesta), caso.descripcion).toBe(caso.codigo)
    }
    expect(await obtenerDb().archivo.count({ where: filasDelCaso })).toBe(filasAntes)
    expect((await leerArchivoDb(pendienteConCambio.id))?.estado).toBe("pendiente")
    expect(subidasFirmadas.length).toBe(subidas)
    expect(descargasFirmadas.length).toBe(descargas)
  })
})

describe("ataque d-r1: borrar con adjuntos", () => {
  it("tras borrar la publicación, su archivo da 404 al descargar y no puede volver a confirmarse", async () => {
    const e = await escenario()
    const id = await subirListo(e)
    const creada = await publicar(e, [id])
    expect(creada.statusCode, creada.body).toBe(201)
    const { publicacion } = publicacionRespuestaSchema.parse(creada.json())

    const borrada = await inyectar({
      method: "DELETE",
      url: `${urlPublicaciones(e.claseA)}/${publicacion.id}`,
      token: e.tokenMaestro,
    })
    expect(borrada.statusCode, borrada.body).toBe(204)
    expect(await leerArchivoDb(id)).toMatchObject({ estado: "descartado", publicacionId: null })

    const descarga = await inyectar({
      method: "POST",
      url: urlDescarga(e.claseA, id),
      token: e.tokenAlumno,
    })
    expect(descarga.statusCode).toBe(404)
    const otraVez = await publicar(e, [id])
    expect(otraVez.statusCode, otraVez.body).toBe(400)
    expect((await leerArchivoDb(id))?.estado).toBe("descartado")
  })

  it("borrar una clase con archivos confirmados, pendientes y descartados en cascada no viola el CHECK ni el NO ACTION", async () => {
    const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
    const clase = await crearClaseDePrueba([], { maestroId: maestro.id })
    await confirmadoEn(clase.id, maestro.id)
    await confirmadoEn(clase.id, maestro.id, { nombre: "b.png", tipo: "image/png" })
    await crearArchivoDePrueba({ claseId: clase.id, subidoPor: maestro.id })
    await crearArchivoDePrueba({ claseId: clase.id, subidoPor: maestro.id, estado: "descartado" })
    expect(await contarArchivos(clase.id)).toBe(4)

    await obtenerDb().clase.delete({ where: { id: clase.id } })

    expect(await contarArchivos(clase.id)).toBe(0)
    expect(await contarPublicaciones(clase.id)).toBe(0)
  })
})

describe("ataque d-r1: adjuntos en todas las respuestas (C-21) y sin almacén", () => {
  it("la API acepta el cuerpo sin archivoIds y responde adjuntos: []; archivoIds null, texto u objeto dan 400", async () => {
    const e = await escenario()
    const sinClave = await inyectar({
      method: "POST",
      url: urlPublicaciones(e.claseA),
      token: e.tokenMaestro,
      payload: { tipo: "anuncio", texto: "Sin la clave" },
    })
    expect(sinClave.statusCode, sinClave.body).toBe(201)
    expect(publicacionRespuestaSchema.parse(sinClave.json()).publicacion.adjuntos).toEqual([])
    for (const archivoIds of [null, "x", {}, [1], [""]]) {
      const respuesta = await publicar(e, archivoIds)
      expect(respuesta.statusCode, JSON.stringify(archivoIds)).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
    }
  })

  it("sin almacén: el muro con una imagen sale 200 con vistaPrevia null; solicitar, descargar y publicar con archivoIds dan 503 sin escribir", async () => {
    const e = await escenario()
    const archivo = await confirmadoEn(e.claseA, e.maestro.id, {
      nombre: "f.png",
      tipo: "image/png",
    })
    const pendiente = await crearArchivoDePrueba({ claseId: e.claseA, subidoPor: e.maestro.id })
    const servidor = obtenerAppSinAlmacen()

    const muro = await inyectar({
      servidor,
      method: "GET",
      url: urlPublicaciones(e.claseA),
      token: e.tokenAlumno,
    })
    expect(muro.statusCode, muro.body).toBe(200)
    const adjuntos = listaPublicacionesRespuestaSchema
      .parse(muro.json())
      .publicaciones.flatMap((p) => p.adjuntos)
    expect(adjuntos).toEqual([
      { id: archivo.id, nombre: "f.png", tipo: "image/png", tamano: 1000, vistaPrevia: null },
    ])

    const publicacionesAntes = await contarPublicaciones(e.claseA)
    const filasAntes = await contarArchivos(e.claseA)
    const respuestas = [
      await inyectar({
        servidor,
        method: "POST",
        url: urlArchivos(e.claseA),
        token: e.tokenMaestro,
        payload: { nombre: "a.pdf", tipo: "application/pdf", tamano: 10 },
      }),
      await inyectar({
        servidor,
        method: "POST",
        url: urlDescarga(e.claseA, archivo.id),
        token: e.tokenAlumno,
      }),
      await inyectar({
        servidor,
        method: "POST",
        url: urlPublicaciones(e.claseA),
        token: e.tokenMaestro,
        payload: { tipo: "anuncio", texto: "x", archivoIds: [pendiente.id] },
      }),
    ]
    for (const respuesta of respuestas) {
      expect(respuesta.statusCode, respuesta.body).toBe(503)
      expect(codigoDe(respuesta)).toBe("ALMACEN_NO_CONFIGURADO")
    }
    expect(await contarPublicaciones(e.claseA)).toBe(publicacionesAntes)
    expect(await contarArchivos(e.claseA)).toBe(filasAntes)
    expect((await leerArchivoDb(pendiente.id))?.estado).toBe("pendiente")
  })
})

describe("ataque d-r1: configuración STORAGE_*", () => {
  const base = {
    DATABASE_URL: "postgresql://u:p@127.0.0.1:5432/x",
    JWT_SECRET: "j".repeat(40),
  }
  const SECRETO_UNICO = "secreto-unico-que-no-debe-salir-d-r1"

  it("parciales, con endpoint que no es http(s) o en production sin ellas: no arranca y ningún mensaje repite un valor", () => {
    const entradas: Record<string, string>[] = [
      { STORAGE_SECRET_KEY: SECRETO_UNICO },
      { STORAGE_ACCESS_KEY: "llave", STORAGE_SECRET_KEY: SECRETO_UNICO },
      {
        STORAGE_ENDPOINT: "ftp://127.0.0.1:21",
        STORAGE_ACCESS_KEY: "llave",
        STORAGE_SECRET_KEY: SECRETO_UNICO,
      },
      {
        STORAGE_ENDPOINT: `javascript:${SECRETO_UNICO}`,
        STORAGE_ACCESS_KEY: "llave",
        STORAGE_SECRET_KEY: SECRETO_UNICO,
      },
      { NODE_ENV: "production", STORAGE_SECRET_KEY: SECRETO_UNICO },
      { NODE_ENV: "production" },
    ]
    for (const entrada of entradas) {
      const resultado = validarEnv({ ...base, ...entrada })
      expect(resultado.ok, JSON.stringify(entrada)).toBe(false)
      if (resultado.ok) throw new Error("Precondición: debía rechazarse")
      const texto = resultado.errores.join("\n")
      expect(texto).toMatch(/STORAGE_/)
      expect(texto).not.toContain(SECRETO_UNICO)
      expect(texto).not.toContain("llave")
    }
  })

  it("vacías o solo con espacios cuentan como ausentes; con las tres, el almacén existe", () => {
    const vacias = validarEnv({
      ...base,
      STORAGE_ENDPOINT: "",
      STORAGE_ACCESS_KEY: "   ",
      STORAGE_SECRET_KEY: "\t",
    })
    expect(vacias.ok).toBe(true)
    if (!vacias.ok) throw new Error("Precondición: debía aceptarse")
    expect(vacias.env.STORAGE_ENDPOINT).toBeUndefined()
    expect(vacias.env.STORAGE_ACCESS_KEY).toBeUndefined()
    expect(vacias.env.STORAGE_SECRET_KEY).toBeUndefined()
    const completas = validarEnv({
      ...base,
      NODE_ENV: "production",
      STORAGE_ENDPOINT: "https://cuenta.r2.cloudflarestorage.com",
      STORAGE_ACCESS_KEY: "llave",
      STORAGE_SECRET_KEY: SECRETO_UNICO,
      STORAGE_REGION: "auto",
    })
    expect(completas.ok).toBe(true)
  })
})
