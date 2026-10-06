import { randomBytes, randomUUID } from "node:crypto"

import { FIRMA_ADMINISTRACION, TAMANO_MAXIMO_ARCHIVO_BYTES } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { normalizarParaBusqueda } from "../src/core/auth/normalizacion.js"
import {
  COLA_MATERIAL_CREADO,
  COLA_PUBLICACION_CREADA,
} from "../src/core/eventos/avisos-de-clase.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  crearComentarioDePrueba,
  crearPublicacionDePrueba,
  idDelAdminDePrueba,
  inscribirDePrueba,
  leerTrabajosDeCola,
} from "./ayudas-clases.js"

// Ataque del Tester (CLASES-02b, ronda 1; "Puntos de ataque / 02b", puntos 2, 3, 4 y 6, y la lista
// del orquestador): la firma "Administración" en toda respuesta (y que nadie la finja), el admin que
// publica con adjuntos en cualquier clase y no comenta, sus archivos con los límites de siempre,
// "Personas" con correo y sin datos de pago, M-09 en las cinco rutas que normalizan, y el contenido
// visible y los máximos en lo que publica el admin. Cuentas creadas directamente (sin argon2).
// Cadenas con caracteres invisibles: siempre con escapes.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
const almacen = crearAlmacenEnMemoria()
let admin = { id: "", nombre: "", email: "" }
let tokenAdmin = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen })
  await app.ready()
  const id = await idDelAdminDePrueba()
  const fila = await obtenerDb().usuario.findUnique({
    where: { id },
    select: { id: true, nombre: true, email: true },
  })
  if (fila === null) throw new Error("Precondición: no se leyó el admin de la base desechable")
  expect(fila.nombre.length, "Precondición: el admin tiene nombre").toBeGreaterThan(2)
  admin = fila
  tokenAdmin = await firmarTokenDePrueba({ usuarioId: id })
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const ficha = (): string => `qb${randomBytes(5).toString("hex")}`

interface Cuenta {
  id: string
  email: string
  nombre: string
  token: string
}

const crearCuenta = async (
  nombre: string,
  rol: "estudiante" | "maestro",
  extra: { activo?: boolean; accesoRestringido?: boolean; estadoPago?: "deudor" } = {},
): Promise<Cuenta> => {
  const email = `b02b-r1-${randomUUID()}@pruebas.local`
  const { id } = await obtenerDb().usuario.create({
    data: {
      email,
      hashContrasena: "sin-uso-en-esta-prueba",
      nombre,
      nombreBusqueda: normalizarParaBusqueda(nombre),
      rol,
      ...extra,
    },
    select: { id: true },
  })
  idsUsuarios.push(id)
  return { id, email, nombre, token: await firmarTokenDePrueba({ usuarioId: id }) }
}

type Metodo = "GET" | "HEAD" | "POST" | "PUT" | "PATCH" | "DELETE"

const pedir = (
  method: Metodo,
  url: string,
  token: string,
  payload?: unknown,
): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method,
    url,
    ...(payload === undefined ? {} : { payload: payload as Record<string, unknown> }),
    headers: { authorization: `Bearer ${token}` },
  })

const pedirCrudo = (
  method: "POST" | "PUT",
  url: string,
  token: string,
  crudo: string,
): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method,
    url,
    payload: crudo,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  })

const errorDe = (r: LightMyRequestResponse): { codigo: string; mensaje: string } => {
  try {
    const cuerpo = JSON.parse(r.body) as { error?: { codigo?: string; mensaje?: string } }
    return { codigo: cuerpo.error?.codigo ?? "", mensaje: cuerpo.error?.mensaje ?? "" }
  } catch {
    return { codigo: "", mensaje: "" }
  }
}

const resultado = (r: LightMyRequestResponse): string =>
  r.statusCode < 300 ? String(r.statusCode) : `${String(r.statusCode)} ${errorDe(r).codigo}`

// Claves y valores de texto de todos los objetos de un JSON, en cualquier profundidad.
const clavesYValores = (valor: unknown): { claves: string[]; valores: string[] } => {
  const claves: string[] = []
  const valores: string[] = []
  const pila: unknown[] = [valor]
  while (pila.length > 0) {
    const actual = pila.pop()
    if (typeof actual === "string") valores.push(actual)
    if (actual === null || typeof actual !== "object") continue
    for (const [clave, hijo] of Object.entries(actual)) {
      claves.push(clave)
      pila.push(hijo)
    }
  }
  return { claves, valores }
}

const urlPublicaciones = (claseId: string) => `/api/clases/${claseId}/publicaciones`
const urlComentarios = (claseId: string, publicacionId: string) =>
  `${urlPublicaciones(claseId)}/${publicacionId}/comentarios`

const FIRMA = (): { id: string; nombre: string; administracion: boolean } => ({
  id: admin.id,
  nombre: FIRMA_ADMINISTRACION,
  administracion: true,
})

// Sube un archivo por la API como el admin (o quien sea) y deja el "objeto" en el doble.
const subir = async (claseId: string, token: string, nombre = "guia.pdf"): Promise<string> => {
  const r = await pedir("POST", `/api/clases/${claseId}/archivos`, token, {
    nombre,
    tipo: "application/pdf",
    tamano: 2000,
  })
  expect(r.statusCode, `Precondición: solicitar subida: ${r.body}`).toBe(201)
  const { archivo } = r.json<{ archivo: { id: string } }>()
  almacen.subir(`materiales/${claseId}/${archivo.id}`, { tamano: 2000, tipo: "application/pdf" })
  return archivo.id
}

describe("ataque CLASES-02b r1: la firma «Administración»", () => {
  it(
    "en dos clases, con anuncio y material con adjunto: crear, listar (alumno, maestro y admin), comentar debajo y negar el borrado traen la firma con el id real y nunca el nombre real, el correo ni el rol del admin",
    { timeout: 60_000 },
    async () => {
      const t = ficha()
      const maestraA = await crearCuenta(`Maestra A ${t}`, "maestro")
      const maestroB = await crearCuenta(`Maestro B ${t}`, "maestro")
      const alumna = await crearCuenta(`Alumna ${t}`, "estudiante")
      const claseA = await crearClaseDePrueba(idsClases, { maestroId: maestraA.id })
      const claseB = await crearClaseDePrueba(idsClases, { maestroId: maestroB.id })
      await inscribirDePrueba(claseA.id, alumna.id)
      await inscribirDePrueba(claseB.id, alumna.id)

      const cuerpos: LightMyRequestResponse[] = []
      const anuncio = await pedir("POST", urlPublicaciones(claseA.id), tokenAdmin, {
        tipo: "anuncio",
        texto: `Aviso ${t}`,
      })
      expect(anuncio.statusCode, anuncio.body).toBe(201)
      cuerpos.push(anuncio)
      const archivoId = await subir(claseB.id, tokenAdmin)
      const material = await pedir("POST", urlPublicaciones(claseB.id), tokenAdmin, {
        tipo: "material",
        titulo: `Material ${t}`,
        archivoIds: [archivoId],
      })
      expect(material.statusCode, material.body).toBe(201)
      cuerpos.push(material)
      const idAnuncio = anuncio.json<{ publicacion: { id: string } }>().publicacion.id
      const idMaterial = material.json<{ publicacion: { id: string } }>().publicacion.id
      for (const r of [anuncio, material]) {
        expect(
          r.json<{ publicacion: { autor: unknown; puedeBorrar: boolean } }>().publicacion,
        ).toMatchObject({
          autor: FIRMA(),
          puedeBorrar: true,
        })
      }
      expect(
        material
          .json<{ publicacion: { adjuntos: { id: string }[] } }>()
          .publicacion.adjuntos.map((a) => a.id),
      ).toEqual([archivoId])

      const comentario = await pedir("POST", urlComentarios(claseA.id, idAnuncio), alumna.token, {
        texto: "Gracias",
      })
      expect(comentario.statusCode).toBe(201)
      cuerpos.push(comentario)

      const perspectivas: [string, string, string, string, boolean][] = [
        ["alumna A", claseA.id, idAnuncio, alumna.token, false],
        ["maestra A", claseA.id, idAnuncio, maestraA.token, false],
        ["admin A", claseA.id, idAnuncio, tokenAdmin, true],
        ["alumna B", claseB.id, idMaterial, alumna.token, false],
        ["maestro B", claseB.id, idMaterial, maestroB.token, false],
        ["admin B", claseB.id, idMaterial, tokenAdmin, true],
      ]
      for (const [quien, claseId, publicacionId, token, puede] of perspectivas) {
        const lista = await pedir("GET", urlPublicaciones(claseId), token)
        expect(lista.statusCode, quien).toBe(200)
        cuerpos.push(lista)
        const suya = lista
          .json<{ publicaciones: { id: string; autor: unknown; puedeBorrar: boolean }[] }>()
          .publicaciones.find((p) => p.id === publicacionId)
        expect(suya, quien).toMatchObject({ autor: FIRMA(), puedeBorrar: puede })
        const comentarios = await pedir("GET", urlComentarios(claseId, publicacionId), token)
        expect(comentarios.statusCode, quien).toBe(200)
        cuerpos.push(comentarios)
      }
      // El maestro intenta borrar la del admin: 403 sin nombre ni correo.
      for (const [claseId, publicacionId, token] of [
        [claseA.id, idAnuncio, maestraA.token],
        [claseB.id, idMaterial, maestroB.token],
      ] as const) {
        const negado = await pedir("DELETE", `${urlPublicaciones(claseId)}/${publicacionId}`, token)
        expect(resultado(negado)).toBe("403 BORRADO_NO_PERMITIDO")
        cuerpos.push(negado)
      }
      expect(
        await obtenerDb().publicacion.count({ where: { id: { in: [idAnuncio, idMaterial] } } }),
      ).toBe(2)

      const fallas: string[] = []
      for (const r of cuerpos) {
        const { claves, valores } = clavesYValores(r.json())
        for (const prohibida of [
          "rol",
          "email",
          "correo",
          "subidoPor",
          "claveObjeto",
          "estadoPago",
        ])
          if (claves.includes(prohibida)) fallas.push(`${r.raw.req.url}: clave ${prohibida}`)
        if (valores.includes("admin")) fallas.push(`${r.raw.req.url}: valor "admin"`)
        if (r.body.includes(admin.nombre)) fallas.push(`${r.raw.req.url}: nombre real del admin`)
        if (r.body.toLowerCase().includes(admin.email.toLowerCase()))
          fallas.push(`${r.raw.req.url}: correo del admin`)
      }
      expect(fallas).toEqual([])
    },
  )

  it("nadie finge la firma: campos autor, administracion, autorId o rol en el cuerpo se ignoran; un maestro o una alumna llamados «Administración» firman con administracion: false", async () => {
    const t = ficha()
    const maestro = await crearCuenta(FIRMA_ADMINISTRACION, "maestro")
    const alumna = await crearCuenta(`Alumna ${t}`, "estudiante")
    const homonima = await crearCuenta(FIRMA_ADMINISTRACION, "estudiante")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, alumna.id)
    await inscribirDePrueba(clase.id, homonima.id)
    const fingido = {
      autor: { id: admin.id, nombre: FIRMA_ADMINISTRACION, administracion: true },
      administracion: true,
      autorId: admin.id,
      rol: "admin",
      puedeBorrar: true,
    }
    const publicada = await pedir("POST", urlPublicaciones(clase.id), maestro.token, {
      tipo: "anuncio",
      texto: "Hola",
      ...fingido,
    })
    expect(publicada.statusCode, publicada.body).toBe(201)
    const publicacion = publicada.json<{ publicacion: { id: string; autor: unknown } }>()
      .publicacion
    expect(publicacion.autor).toEqual({
      id: maestro.id,
      nombre: FIRMA_ADMINISTRACION,
      administracion: false,
    })
    const comentarios: [Cuenta, string][] = [
      [alumna, alumna.nombre],
      [homonima, FIRMA_ADMINISTRACION],
    ]
    for (const [cuenta, nombre] of comentarios) {
      const r = await pedir("POST", urlComentarios(clase.id, publicacion.id), cuenta.token, {
        texto: "Comentario",
        ...fingido,
      })
      expect(r.statusCode, r.body).toBe(201)
      expect(r.json<{ comentario: { autor: unknown } }>().comentario.autor).toEqual({
        id: cuenta.id,
        nombre,
        administracion: false,
      })
    }
    const lista = await pedir("GET", urlComentarios(clase.id, publicacion.id), alumna.token)
    expect(
      lista
        .json<{ comentarios: { autor: { administracion: boolean } }[] }>()
        .comentarios.map((c) => c.autor.administracion),
    ).toEqual([false, false])
    expect(
      await obtenerDb().publicacion.count({ where: { claseId: clase.id, autorId: admin.id } }),
    ).toBe(0)
    expect(
      await obtenerDb().comentario.count({
        where: { publicacionId: publicacion.id, autorId: admin.id },
      }),
    ).toBe(0)
  })
})

describe("ataque CLASES-02b r1: el admin no comenta (P-03 a)", () => {
  it("comentar en su publicación y en la de un maestro, mis-comentarios, y los métodos que no existen: ningún 2xx y nada se escribe; leer los comentarios (GET y HEAD) sí", async () => {
    const t = ficha()
    const maestro = await crearCuenta(`Maestro ${t}`, "maestro")
    const alumna = await crearCuenta(`Alumna ${t}`, "estudiante")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, alumna.id)
    const delMaestro = await crearPublicacionDePrueba({ claseId: clase.id, autorId: maestro.id })
    const delAdmin = await crearPublicacionDePrueba({ claseId: clase.id, autorId: admin.id })
    const deAlumna = await crearComentarioDePrueba({ publicacionId: delAdmin, autorId: alumna.id })
    const fallas: string[] = []
    for (const publicacionId of [delMaestro, delAdmin]) {
      for (const url of [
        urlComentarios(clase.id, publicacionId),
        urlComentarios(clase.id.toUpperCase(), publicacionId),
      ]) {
        const r = await pedir("POST", url, tokenAdmin, { texto: "Del admin" })
        if (resultado(r) !== "403 ROL_NO_PERMITIDO") fallas.push(`POST ${url}: ${resultado(r)}`)
      }
      // Con barra final la ruta no existe (la API no ignora la barra final): ningún 2xx.
      const conBarra = await pedir(
        "POST",
        `${urlComentarios(clase.id, publicacionId)}/`,
        tokenAdmin,
        {
          texto: "Del admin",
        },
      )
      if (conBarra.statusCode < 400) fallas.push(`POST con barra final: ${resultado(conBarra)}`)
      for (const metodo of ["PUT", "PATCH"] as const) {
        const r = await pedir(metodo, urlComentarios(clase.id, publicacionId), tokenAdmin, {
          texto: "Del admin",
        })
        if (r.statusCode < 400) fallas.push(`${metodo}: ${resultado(r)}`)
      }
      const head = await pedir("HEAD", urlComentarios(clase.id, publicacionId), tokenAdmin)
      if (head.statusCode !== 200 || head.body !== "")
        fallas.push(`HEAD: ${String(head.statusCode)}`)
      const get = await pedir("GET", urlComentarios(clase.id, publicacionId), tokenAdmin)
      if (get.statusCode !== 200) fallas.push(`GET: ${String(get.statusCode)}`)
    }
    const mis = await pedir(
      "DELETE",
      `/api/clases/${clase.id}/mis-comentarios/${deAlumna}`,
      tokenAdmin,
    )
    if (resultado(mis) !== "403 ROL_NO_PERMITIDO") fallas.push(`mis-comentarios: ${resultado(mis)}`)
    expect(fallas).toEqual([])
    // C-1 (FIX-CLASES, ronda 0): el admin es la cuenta única de la corrida y otros archivos
    // (muro-admin.integracion) siembran comentarios suyos en paralelo; contar en toda la base daba
    // rojos intermitentes. Todos los intentos de este caso van a `clase.id` y a estas dos
    // publicaciones, así que acotar el conteo a ellas no pierde ningún intento.
    expect(
      await obtenerDb().comentario.count({
        where: {
          autorId: admin.id,
          publicacion: { claseId: clase.id },
        },
      }),
    ).toBe(0)
    expect(
      await obtenerDb().comentario.count({
        where: { autorId: admin.id, publicacionId: { in: [delMaestro, delAdmin] } },
      }),
    ).toBe(0)
    expect(await obtenerDb().comentario.count({ where: { id: deAlumna } })).toBe(1)
  })
})

describe("ataque CLASES-02b r1: el admin y una clase que no existe", () => {
  it("leer, publicar, borrar, comentar, solicitar y descargar en una clase inexistente: 403 SIN_ACCESO_A_LA_CLASE (o 403 ROL_NO_PERMITIDO donde el rol va primero) y nada se escribe ni se firma", async () => {
    const fantasma = randomUUID()
    const firmasAntes = almacen.subidasFirmadas.length + almacen.descargasFirmadas.length
    const casos: [Metodo, string, unknown, string][] = [
      ["GET", urlPublicaciones(fantasma), undefined, "403 SIN_ACCESO_A_LA_CLASE"],
      [
        "POST",
        urlPublicaciones(fantasma),
        { tipo: "anuncio", texto: "x" },
        "403 SIN_ACCESO_A_LA_CLASE",
      ],
      [
        "DELETE",
        `${urlPublicaciones(fantasma)}/${randomUUID()}`,
        undefined,
        "403 SIN_ACCESO_A_LA_CLASE",
      ],
      ["GET", urlComentarios(fantasma, randomUUID()), undefined, "403 SIN_ACCESO_A_LA_CLASE"],
      [
        "DELETE",
        `${urlComentarios(fantasma, randomUUID())}/${randomUUID()}`,
        undefined,
        "403 SIN_ACCESO_A_LA_CLASE",
      ],
      ["POST", urlComentarios(fantasma, randomUUID()), { texto: "x" }, "403 ROL_NO_PERMITIDO"],
      [
        "POST",
        `/api/clases/${fantasma}/archivos`,
        { nombre: "a.pdf", tipo: "application/pdf", tamano: 10 },
        "403 SIN_ACCESO_A_LA_CLASE",
      ],
      [
        "POST",
        `/api/clases/${fantasma}/archivos/${randomUUID()}/descarga`,
        undefined,
        "403 SIN_ACCESO_A_LA_CLASE",
      ],
    ]
    const fallas: string[] = []
    for (const [metodo, url, payload, esperado] of casos) {
      const r = await pedir(metodo, url, tokenAdmin, payload)
      if (resultado(r) !== esperado) fallas.push(`${metodo} ${url}: ${resultado(r)}`)
    }
    expect(fallas).toEqual([])
    expect(almacen.subidasFirmadas.length + almacen.descargasFirmadas.length).toBe(firmasAntes)
    expect(await obtenerDb().archivo.count({ where: { claseId: fantasma } })).toBe(0)
    expect(await obtenerDb().publicacion.count({ where: { claseId: fantasma } })).toBe(0)
  })
})

describe("ataque CLASES-02b r1: archivos del admin con los límites de siempre", () => {
  it("nombre, tipo, extensión y tamaño fuera de la regla: 400 ARCHIVO_INVALIDO sin fila ni firma; 25 MB exactos sí", async () => {
    const t = ficha()
    const maestro = await crearCuenta(`Maestro ${t}`, "maestro")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const url = `/api/clases/${clase.id}/archivos`
    const malos: Record<string, unknown>[] = [
      { nombre: "a.pdf", tipo: "application/pdf", tamano: 0 },
      { nombre: "a.pdf", tipo: "application/pdf", tamano: TAMANO_MAXIMO_ARCHIVO_BYTES + 1 },
      { nombre: "a.exe", tipo: "application/x-msdownload", tamano: 10 },
      { nombre: "a.png", tipo: "application/pdf", tamano: 10 },
      { nombre: "../../a.pdf", tipo: "application/pdf", tamano: 10 },
      { nombre: "a\u{202E}fdp.exe.pdf", tipo: "application/pdf", tamano: 10 },
      { nombre: `${"a".repeat(252)}.pdf`, tipo: "application/pdf", tamano: 10 },
      { nombre: "constructor", tipo: "constructor", tamano: 10 },
    ]
    const firmasAntes = almacen.subidasFirmadas.length
    const fallas: string[] = []
    for (const cuerpo of malos) {
      const r = await pedir("POST", url, tokenAdmin, cuerpo)
      if (r.statusCode !== 400)
        fallas.push(`${JSON.stringify(cuerpo).slice(0, 80)}: ${resultado(r)}`)
    }
    expect(fallas).toEqual([])
    expect(almacen.subidasFirmadas.length).toBe(firmasAntes)
    expect(await obtenerDb().archivo.count({ where: { claseId: clase.id } })).toBe(0)
    const justo = await pedir("POST", url, tokenAdmin, {
      nombre: "a.pdf",
      tipo: "application/pdf",
      tamano: TAMANO_MAXIMO_ARCHIVO_BYTES,
    })
    expect(justo.statusCode, justo.body).toBe(201)
  })

  it("el admin no publica con el archivo de un maestro, con uno suyo de otra clase, con uno suyo vencido o sin subir, y no descarga el de otra clase por la ruta de esta: 400 o 404 sin escribir", async () => {
    const t = ficha()
    const maestro = await crearCuenta(`Maestro ${t}`, "maestro")
    const claseA = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const claseB = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const delMaestro = await subir(claseA.id, maestro.token)
    const suyoEnB = await subir(claseB.id, tokenAdmin)
    const vencido = await crearArchivoDePrueba({
      claseId: claseA.id,
      subidoPor: admin.id,
      creadoEn: new Date(Date.now() - 25 * 60 * 60 * 1000),
    })
    almacen.subir(vencido.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
    const sinSubir = await pedir("POST", `/api/clases/${claseA.id}/archivos`, tokenAdmin, {
      nombre: "b.pdf",
      tipo: "application/pdf",
      tamano: 10,
    })
    const idSinSubir = sinSubir.json<{ archivo: { id: string } }>().archivo.id
    const fallas: string[] = []
    for (const [nombre, archivoId] of [
      ["del maestro", delMaestro],
      ["suyo de otra clase", suyoEnB],
      ["vencido", vencido.id],
      ["sin subir", idSinSubir],
    ] as const) {
      const r = await pedir("POST", urlPublicaciones(claseA.id), tokenAdmin, {
        tipo: "material",
        titulo: nombre,
        archivoIds: [archivoId],
      })
      if (r.statusCode !== 400) fallas.push(`${nombre}: ${resultado(r)}`)
    }
    expect(fallas).toEqual([])
    expect(await obtenerDb().publicacion.count({ where: { claseId: claseA.id } })).toBe(0)
    const estados = await obtenerDb().archivo.findMany({
      where: { id: { in: [delMaestro, suyoEnB, vencido.id, idSinSubir] } },
      select: { estado: true },
    })
    expect(estados.map((e) => e.estado)).toEqual([
      "pendiente",
      "pendiente",
      "pendiente",
      "pendiente",
    ])

    const publicadoEnB = await pedir("POST", urlPublicaciones(claseB.id), tokenAdmin, {
      tipo: "material",
      titulo: "En B",
      archivoIds: [suyoEnB],
    })
    expect(publicadoEnB.statusCode, publicadoEnB.body).toBe(201)
    const cruzada = await pedir(
      "POST",
      `/api/clases/${claseA.id}/archivos/${suyoEnB}/descarga`,
      tokenAdmin,
    )
    expect(resultado(cruzada)).toBe("404 ARCHIVO_NO_ENCONTRADO")
    const propia = await pedir(
      "POST",
      `/api/clases/${claseB.id}/archivos/${suyoEnB}/descarga`,
      tokenAdmin,
    )
    expect(propia.statusCode, propia.body).toBe(200)
  })
})

describe("ataque CLASES-02b r1: contenido visible y máximos en lo que publica el admin", () => {
  it("sin visibles, caracteres de control, 5,000/5,001 y 200/201 (con emojis): lo mismo que para el maestro", async () => {
    const t = ficha()
    const maestro = await crearCuenta(`Maestro ${t}`, "maestro")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const url = urlPublicaciones(clase.id)
    const emojis = (n: number) => "\u{1F44D}".repeat(n)
    const casos: [Record<string, unknown>, number, string?][] = [
      [{ tipo: "anuncio", texto: "\u{200B}\u{3000}\u{2800}" }, 400, "texto: Escribe el anuncio"],
      [
        { tipo: "material", titulo: "\u{AD}\u{180E}" },
        400,
        "titulo: Escribe el título del material",
      ],
      [
        { tipo: "anuncio", texto: "a\u{202E}b" },
        400,
        "texto: El texto tiene caracteres no permitidos",
      ],
      [
        { tipo: "anuncio", texto: "a\u{0}b" },
        400,
        "texto: El texto tiene caracteres no permitidos",
      ],
      [{ tipo: "anuncio", texto: "a".repeat(5000) }, 201],
      [
        { tipo: "anuncio", texto: "a".repeat(5001) },
        400,
        "texto: No puede tener más de 5000 caracteres",
      ],
      [{ tipo: "anuncio", texto: emojis(5000) }, 201],
      [
        { tipo: "anuncio", texto: `${emojis(5000)}a` },
        400,
        "texto: No puede tener más de 5000 caracteres",
      ],
      [{ tipo: "material", titulo: "t".repeat(200) }, 201],
      [
        { tipo: "material", titulo: emojis(201) },
        400,
        "titulo: No puede tener más de 200 caracteres",
      ],
      [{ tipo: "anuncio", texto: "\r\n  Hola\r\nadmin  \r\n" }, 201],
    ]
    const fallas: string[] = []
    let creadas = 0
    for (const [cuerpo, estado, mensaje] of casos) {
      const r = await pedir("POST", url, tokenAdmin, cuerpo)
      if (r.statusCode !== estado)
        fallas.push(`${JSON.stringify(cuerpo).slice(0, 60)}: ${resultado(r)}`)
      else if (mensaje !== undefined && errorDe(r).mensaje !== mensaje)
        fallas.push(`${JSON.stringify(cuerpo).slice(0, 60)}: «${errorDe(r).mensaje}»`)
      if (r.statusCode === 201) creadas += 1
    }
    expect(fallas).toEqual([])
    expect(await obtenerDb().publicacion.count({ where: { claseId: clase.id } })).toBe(creadas)
    const normalizada = await obtenerDb().publicacion.findFirst({
      where: { claseId: clase.id, texto: { startsWith: "Hola" } },
      select: { texto: true, autorId: true },
    })
    expect(normalizada).toEqual({ texto: "Hola\nadmin", autorId: admin.id })
  })
})

describe("ataque CLASES-02b r1: M-09 en las cinco rutas que normalizan", () => {
  it("un arreglo como cuerpo en publicar (maestro y admin), comentar, crear y editar clase: 400 «cuerpo: debe ser un objeto JSON»; un objeto anidado en el campo, 400 en español; nada se escribe", async () => {
    const t = ficha()
    const maestro = await crearCuenta(`Maestro ${t}`, "maestro")
    const alumna = await crearCuenta(`Alumna ${t}`, "estudiante")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id, nombre: `C ${t}` })
    await inscribirDePrueba(clase.id, alumna.id)
    const publicacionId = await crearPublicacionDePrueba({ claseId: clase.id, autorId: maestro.id })
    const rutas: ["POST" | "PUT", string, string, Record<string, unknown>][] = [
      ["POST", urlPublicaciones(clase.id), maestro.token, { tipo: "anuncio", texto: "Hola\r\n" }],
      ["POST", urlPublicaciones(clase.id), tokenAdmin, { tipo: "anuncio", texto: "Hola\r\n" }],
      ["POST", urlComentarios(clase.id, publicacionId), alumna.token, { texto: "Hola\r\n" }],
      [
        "POST",
        "/api/admin/clases",
        tokenAdmin,
        { nombre: `Nueva ${t}`, descripcion: "d\r\n", maestroIds: [maestro.id] },
      ],
      [
        "PUT",
        `/api/admin/clases/${clase.id}`,
        tokenAdmin,
        { nombre: `Editada ${t}`, descripcion: "d\r\n" },
      ],
    ]
    const EN_INGLES = /Invalid|expected|received|Required|discriminator|Unrecognized/
    const fallas: string[] = []
    for (const [metodo, url, token, valido] of rutas) {
      for (const crudo of [
        "[]",
        JSON.stringify([valido]),
        JSON.stringify([valido, valido]),
        '[["texto"]]',
      ]) {
        const r = await pedirCrudo(metodo, url, token, crudo)
        const { codigo, mensaje } = errorDe(r)
        if (
          r.statusCode !== 400 ||
          codigo !== "VALIDACION" ||
          mensaje !== "cuerpo: debe ser un objeto JSON"
        )
          fallas.push(
            `${metodo} ${url} ${crudo.slice(0, 30)}: ${String(r.statusCode)} ${codigo} «${mensaje}»`,
          )
      }
      const anidado = Object.fromEntries(
        Object.entries(valido).map(([clave, valor]) => [
          clave,
          typeof valor === "string" && clave !== "tipo" ? { valor } : valor,
        ]),
      )
      const r = await pedirCrudo(metodo, url, token, JSON.stringify(anidado))
      if (r.statusCode !== 400 || EN_INGLES.test(errorDe(r).mensaje))
        fallas.push(`${metodo} ${url} anidado: ${String(r.statusCode)} «${errorDe(r).mensaje}»`)
    }
    expect(fallas).toEqual([])
    expect(await obtenerDb().publicacion.count({ where: { claseId: clase.id } })).toBe(1)
    expect(await obtenerDb().comentario.count({ where: { publicacionId } })).toBe(0)
    expect(await obtenerDb().clase.count({ where: { nombre: `Nueva ${t}` } })).toBe(0)
    expect((await obtenerDb().clase.findUnique({ where: { id: clase.id } }))?.nombre).toBe(`C ${t}`)
  })
})

describe("ataque CLASES-02b r1: «Personas»", () => {
  it(
    "con dos maestros, alumnos activos, deudores, restringidos e inactivos y alumnos de otra clase: correos completos solo de quien está en la clase, maestros en orden, sin datos de pago, recorrido con limite=1 sin repetir; a quién se le niega",
    { timeout: 60_000 },
    async () => {
      const t = ficha()
      const m1 = await crearCuenta(`Maestra Uno ${t}`, "maestro")
      const m2 = await crearCuenta(`Maestro Dos ${t}`, "maestro")
      const ajeno = await crearCuenta(`Maestro Ajeno ${t}`, "maestro")
      const yo = await crearCuenta(`Aaa Yo ${t}`, "estudiante")
      const deudor = await crearCuenta(`Bbb Deudor ${t}`, "estudiante", { estadoPago: "deudor" })
      const restringido = await crearCuenta(`Ccc Restringido ${t}`, "estudiante", {
        accesoRestringido: true,
        estadoPago: "deudor",
      })
      const inactivo = await crearCuenta(`Ddd Inactivo ${t}`, "estudiante", { activo: false })
      const quitado = await crearCuenta(`Eee Quitado ${t}`, "estudiante")
      const deOtra = await crearCuenta(`Fff Otra ${t}`, "estudiante")
      const clase = await crearClaseDePrueba(idsClases, {
        maestroId: m1.id,
        maestroIds: [m1.id, m2.id],
      })
      const otra = await crearClaseDePrueba(idsClases, { maestroId: ajeno.id })
      for (const c of [yo, deudor, restringido, inactivo, quitado])
        await inscribirDePrueba(clase.id, c.id)
      await inscribirDePrueba(otra.id, deOtra.id)
      expect(
        (await pedir("DELETE", `/api/clases/${clase.id}/alumnos/${quitado.id}`, m1.token))
          .statusCode,
      ).toBe(204)

      const persona = (c: Cuenta) => ({ id: c.id, nombre: c.nombre, email: c.email })
      const esperadosAlumnos = [yo, deudor, restringido].map(persona)
      // S-05: los maestros de la clase van por (creado_en, maestro_id); los dos se asignaron al crear
      // la clase (misma creado_en), así que desempata el id. El principal es el primero.
      const maestrosEnOrden = [m1, m2].sort((a, b) => (a.id < b.id ? -1 : 1)).map(persona)
      const fallas: string[] = []
      for (const [quien, token] of [
        ["alumno", yo.token],
        ["maestro", m2.token],
      ] as const) {
        const completa = await pedir("GET", `/api/clases/${clase.id}/personas?limite=100`, token)
        expect(completa.statusCode, quien).toBe(200)
        const cuerpo = completa.json<{
          maestro: unknown
          maestros: unknown[]
          alumnos: unknown[]
          totalAlumnos: number
        }>()
        expect(cuerpo.maestros, quien).toEqual(maestrosEnOrden)
        expect(cuerpo.maestro, quien).toEqual(maestrosEnOrden[0])
        expect(cuerpo.alumnos, quien).toEqual(esperadosAlumnos)
        expect(cuerpo.totalAlumnos, quien).toBe(3)
        const { claves, valores } = clavesYValores(completa.json())
        for (const prohibida of [
          "estadoPago",
          "accesoRestringido",
          "correoEnmascarado",
          "activo",
          "rol",
          "origen",
          "inscritoEn",
        ])
          if (claves.includes(prohibida)) fallas.push(`${quien}: clave ${prohibida}`)
        for (const texto of ["deudor", "al_corriente"])
          if (valores.includes(texto)) fallas.push(`${quien}: valor ${texto}`)
        for (const fuera of [inactivo, quitado, deOtra, ajeno])
          if (completa.body.includes(fuera.email) || completa.body.includes(fuera.id))
            fallas.push(`${quien}: aparece ${fuera.nombre}`)
        if (completa.body.toLowerCase().includes(admin.email.toLowerCase()))
          fallas.push(`${quien}: correo del admin`)

        // Recorrido de a uno: cada página trae los dos maestros y ningún alumno se repite.
        const vistos: unknown[] = []
        let cursor: string | null = null
        for (let vuelta = 0; vuelta < 6; vuelta++) {
          const sufijo: string = cursor === null ? "" : `&cursor=${cursor}`
          const pagina = await pedir(
            "GET",
            `/api/clases/${clase.id}/personas?limite=1${sufijo}`,
            token,
          )
          expect(pagina.statusCode).toBe(200)
          const p = pagina.json<{
            maestros: unknown[]
            alumnos: unknown[]
            siguienteCursor: string | null
          }>()
          expect(p.maestros).toEqual(maestrosEnOrden)
          vistos.push(...p.alumnos)
          cursor = p.siguienteCursor
          if (cursor === null) break
        }
        expect(vistos, quien).toEqual(esperadosAlumnos)
      }
      expect(fallas).toEqual([])

      const negados: [string, string, string][] = [
        ["admin", tokenAdmin, "403 ROL_NO_PERMITIDO"],
        ["maestro ajeno", ajeno.token, "403 SIN_ACCESO_A_LA_CLASE"],
        ["alumno de otra clase", deOtra.token, "403 SIN_ACCESO_A_LA_CLASE"],
        ["alumno quitado", quitado.token, "403 SIN_ACCESO_A_LA_CLASE"],
        ["alumno restringido", restringido.token, "403 ACCESO_RESTRINGIDO"],
        ["alumno inactivo", inactivo.token, "401 NO_AUTENTICADO"],
      ]
      for (const [quien, token, esperado] of negados) {
        const r = await pedir("GET", `/api/clases/${clase.id}/personas`, token)
        if (resultado(r) !== esperado) fallas.push(`${quien}: ${resultado(r)}`)
        if (r.body.includes("@")) fallas.push(`${quien}: la negación trae un correo`)
      }
      expect(fallas).toEqual([])

      // El maestro retirado por el admin tampoco.
      expect(
        (await pedir("DELETE", `/api/admin/clases/${clase.id}/maestros/${m2.id}`, tokenAdmin))
          .statusCode,
      ).toBe(200)
      expect(resultado(await pedir("GET", `/api/clases/${clase.id}/personas`, m2.token))).toBe(
        "403 SIN_ACCESO_A_LA_CLASE",
      )
      const sinM2 = await pedir("GET", `/api/clases/${clase.id}/personas`, yo.token)
      expect(sinM2.json<{ maestros: unknown[] }>().maestros).toEqual([persona(m1)])
      expect(sinM2.body).not.toContain(m2.email)
    },
  )
})

describe("ataque CLASES-02b r1: encolado de lo que publica el admin", () => {
  it("anuncio y material del admin: un trabajo cada uno en su cola, con exactamente publicacionId y claseId; ni su id, ni su nombre, ni su correo, ni el texto", async () => {
    const t = ficha()
    const maestro = await crearCuenta(`Maestro ${t}`, "maestro")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const texto = `privado-${t}`
    const ids: Record<string, string> = {}
    for (const [cola, cuerpo] of [
      [COLA_PUBLICACION_CREADA, { tipo: "anuncio", texto }],
      [COLA_MATERIAL_CREADO, { tipo: "material", titulo: texto }],
    ] as const) {
      const r = await pedir("POST", urlPublicaciones(clase.id), tokenAdmin, cuerpo)
      expect(r.statusCode, r.body).toBe(201)
      ids[cola] = r.json<{ publicacion: { id: string } }>().publicacion.id
    }
    for (const [cola, publicacionId] of Object.entries(ids)) {
      const trabajos = await leerTrabajosDeCola(cola, "publicacionId", publicacionId)
      expect(trabajos, cola).toHaveLength(1)
      expect(trabajos[0]?.datos).toEqual({ publicacionId, claseId: clase.id })
      const crudo = JSON.stringify(trabajos[0]?.datos)
      for (const prohibido of [admin.id, admin.nombre, admin.email, texto, FIRMA_ADMINISTRACION])
        expect(crudo).not.toContain(prohibido)
    }
  })
})
