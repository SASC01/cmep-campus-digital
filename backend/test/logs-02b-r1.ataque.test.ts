import fs from "node:fs"
import { randomBytes, randomUUID } from "node:crypto"

import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { inicializarAuth } from "../src/adapters/auth/index.js"
import { inicializarDb, obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { cargarEnv, type Env } from "../src/config/env.js"
import { normalizarParaBusqueda } from "../src/core/auth/normalizacion.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearClaseDePrueba,
  crearComentarioDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"

// Ataque del Tester (CLASES-02b, ronda 1; PA-10 y "Puntos de ataque / 02b", punto 2): con
// LOG_LEVEL=trace, el admin publica (con un adjunto), lee y borra; un maestro intenta borrar lo del
// admin (403 BORRADO_NO_PERMITIDO) y lo del otro maestro; un alumno pide "Personas" (correos
// completos) y comenta. Ni el nombre real ni el correo del admin, ni los correos de "Personas", ni
// los textos, ni los tokens aparecen en el log. Captura en memoria de los descriptores 1 y 2, como
// logs-archivos-d-r3 (reescrita aquí: no se importa de ningún *.ataque).

const idsUsuarios: string[] = []
const idsClases: string[] = []
const secretos: [string, string][] = []
const estados: Record<string, number> = {}
let capturado = ""
let app: FastifyInstance | undefined

const writeSyncOriginal = fs.writeSync
const writeOriginal = fs.write
const stdoutOriginal = process.stdout.write.bind(process.stdout)
const stderrOriginal = process.stderr.write.bind(process.stderr)

const aTexto = (dato: unknown): string => {
  if (typeof dato === "string") return dato
  if (dato instanceof Uint8Array) return Buffer.from(dato).toString("utf8")
  return ""
}

const capturar = (): void => {
  const writeSyncCapturado = (fd: number, dato: unknown, ...resto: unknown[]): number => {
    if (fd === 1 || fd === 2) {
      const texto = aTexto(dato)
      capturado += texto
      return Buffer.byteLength(texto)
    }
    return (writeSyncOriginal as (...a: unknown[]) => number)(fd, dato, ...resto)
  }
  const writeCapturado = (fd: number, dato: unknown, ...resto: unknown[]): void => {
    const retrollamada = resto.at(-1)
    if ((fd === 1 || fd === 2) && typeof retrollamada === "function") {
      const texto = aTexto(dato)
      capturado += texto
      ;(retrollamada as (e: null, n: number) => void)(null, Buffer.byteLength(texto))
      return
    }
    ;(writeOriginal as (...a: unknown[]) => void)(fd, dato, ...resto)
  }
  Object.assign(fs, { writeSync: writeSyncCapturado, write: writeCapturado })
  process.stdout.write = ((dato: unknown) => {
    capturado += aTexto(dato)
    return true
  }) as typeof process.stdout.write
  process.stderr.write = ((dato: unknown) => {
    capturado += aTexto(dato)
    return true
  }) as typeof process.stderr.write
}

const soltar = (): void => {
  Object.assign(fs, { writeSync: writeSyncOriginal, write: writeOriginal })
  process.stdout.write = stdoutOriginal
  process.stderr.write = stderrOriginal
}

const crearCuenta = async (nombre: string, rol: "estudiante" | "maestro") => {
  const email = `l02b-r1-${randomUUID()}@pruebas.local`
  const { id } = await obtenerDb().usuario.create({
    data: {
      email,
      hashContrasena: "sin-uso-en-esta-prueba",
      nombre,
      nombreBusqueda: normalizarParaBusqueda(nombre),
      rol,
    },
    select: { id: true },
  })
  idsUsuarios.push(id)
  return { id, email, nombre, token: await firmarTokenDePrueba({ usuarioId: id }) }
}

beforeAll(async () => {
  const base = cargarEnv()
  inicializarDb({ connectionString: base.DATABASE_URL })
  await inicializarAuth(opcionesDeAuth(base))
  const env: Env = { ...base, LOG_LEVEL: "trace" }
  const marca = randomBytes(6).toString("hex")
  const admin = await obtenerDb().usuario.findFirst({
    where: { rol: "admin" },
    select: { id: true, nombre: true, email: true },
  })
  if (admin === null) throw new Error("Precondición: la base desechable no tiene el admin")
  const tokenAdmin = await firmarTokenDePrueba({ usuarioId: admin.id })
  const m1 = await crearCuenta(`Maestra Log ${marca}`, "maestro")
  const m2 = await crearCuenta(`Maestro Log ${marca}`, "maestro")
  const alumna = await crearCuenta(`Alumna Log ${marca}`, "estudiante")
  const clase = await crearClaseDePrueba(idsClases, {
    maestroId: m1.id,
    maestroIds: [m1.id, m2.id],
  })
  await inscribirDePrueba(clase.id, alumna.id)
  secretos.push(
    ["nombre real del admin", admin.nombre],
    ["correo del admin", admin.email],
    ["token del admin", tokenAdmin],
    ["correo de la maestra", m1.email],
    ["correo del maestro", m2.email],
    ["correo de la alumna", alumna.email],
    ["token de la alumna", alumna.token],
  )
  const textoAdmin = `anuncio-admin-${marca}-privado`
  const tituloAdmin = `material-admin-${marca}-privado`
  const textoComentario = `comentario-${marca}-privado`
  secretos.push(
    ["texto del admin", textoAdmin],
    ["título del admin", tituloAdmin],
    ["texto del comentario", textoComentario],
  )
  const almacen = crearAlmacenEnMemoria()
  const muro = `/api/clases/${clase.id}/publicaciones`
  const con = (token: string) => ({ authorization: `Bearer ${token}` })

  capturar()
  try {
    app = await construirApp({ env, almacen })
    await app.ready()
    const pedir = async (
      nombre: string,
      method: "GET" | "POST" | "DELETE",
      url: string,
      token: string,
      payload?: Record<string, unknown>,
    ) => {
      const r = await (app as FastifyInstance).inject({
        method,
        url,
        headers: con(token),
        ...(payload === undefined ? {} : { payload }),
      })
      estados[nombre] = r.statusCode
      return r
    }
    const anuncio = await pedir("admin publica", "POST", muro, tokenAdmin, {
      tipo: "anuncio",
      texto: textoAdmin,
    })
    const idAnuncio = anuncio.json<{ publicacion: { id: string } }>().publicacion.id
    const subida = await pedir(
      "admin solicita",
      "POST",
      `/api/clases/${clase.id}/archivos`,
      tokenAdmin,
      {
        nombre: "guia.pdf",
        tipo: "application/pdf",
        tamano: 1000,
      },
    )
    const archivoId = subida.json<{ archivo: { id: string } }>().archivo.id
    almacen.subir(`materiales/${clase.id}/${archivoId}`, { tamano: 1000, tipo: "application/pdf" })
    const material = await pedir("admin publica material", "POST", muro, tokenAdmin, {
      tipo: "material",
      titulo: tituloAdmin,
      archivoIds: [archivoId],
    })
    const idMaterial = material.json<{ publicacion: { id: string } }>().publicacion.id
    await pedir(
      "admin descarga",
      "POST",
      `/api/clases/${clase.id}/archivos/${archivoId}/descarga`,
      tokenAdmin,
    )
    await pedir("alumna comenta", "POST", `${muro}/${idAnuncio}/comentarios`, alumna.token, {
      texto: textoComentario,
    })
    await pedir("alumna lee el muro", "GET", muro, alumna.token)
    await pedir("alumna lee comentarios", "GET", `${muro}/${idAnuncio}/comentarios`, alumna.token)
    await pedir("alumna lee personas", "GET", `/api/clases/${clase.id}/personas`, alumna.token)
    await pedir("maestra borra lo del admin", "DELETE", `${muro}/${idAnuncio}`, m1.token)
    const delOtro = await crearComentarioDePrueba({ publicacionId: idMaterial, autorId: m2.id })
    await pedir(
      "maestra borra lo del otro maestro",
      "DELETE",
      `${muro}/${idMaterial}/comentarios/${delOtro}`,
      m1.token,
    )
    await pedir("admin comenta", "POST", `${muro}/${idAnuncio}/comentarios`, tokenAdmin, {
      texto: textoComentario,
    })
    await pedir("admin borra", "DELETE", `${muro}/${idMaterial}`, tokenAdmin)

    const total = Object.keys(estados).length
    const limite = Date.now() + 5000
    while ((capturado.match(/"request completed"/g)?.length ?? 0) < total && Date.now() < limite) {
      await new Promise((resolver) => setTimeout(resolver, 10))
    }
  } finally {
    soltar()
  }
}, 60_000)

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("ataque CLASES-02b r1: el muro del admin en el log con trace (PA-10)", () => {
  it("precondición: el recorrido respondió lo esperado y el log tiene un cierre por petición", () => {
    expect(estados).toEqual({
      "admin publica": 201,
      "admin solicita": 201,
      "admin publica material": 201,
      "admin descarga": 200,
      "alumna comenta": 201,
      "alumna lee el muro": 200,
      "alumna lee comentarios": 200,
      "alumna lee personas": 200,
      "maestra borra lo del admin": 403,
      "maestra borra lo del otro maestro": 403,
      "admin comenta": 403,
      "admin borra": 204,
    })
    expect(app?.log.level).toBe("trace")
    expect(capturado.match(/"request completed"/g)?.length).toBe(Object.keys(estados).length)
  })

  it("ni el nombre real ni el correo del admin, ni los correos de «Personas», ni los textos, ni los tokens aparecen en el log; tampoco la firma ni puedeBorrar (los cuerpos no se registran)", () => {
    expect(secretos.length).toBe(10)
    for (const [etiqueta, valor] of secretos) {
      expect(valor.length, `valor vacío: ${etiqueta}`).toBeGreaterThan(8)
      expect(capturado.includes(valor), `el log contiene: ${etiqueta}`).toBe(false)
    }
    expect(capturado).not.toContain("Administración")
    expect(capturado).not.toContain("puedeBorrar")
    expect(capturado).not.toContain("@pruebas.local")
    expect(capturado).not.toContain("@contenedor-de-pruebas.local")
    expect(/authorization|Bearer /i.test(capturado)).toBe(false)
  })
})
