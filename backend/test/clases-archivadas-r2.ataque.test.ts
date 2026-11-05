import { randomUUID } from "node:crypto"

import {
  errorApiSchema,
  listaClasesAdminRespuestaSchema,
  listaClasesAnterioresRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { editarClase } from "../src/adapters/db/index.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { AppError } from "../src/core/errores.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba, type UsuarioDePrueba } from "./ayudas-auth.js"
import {
  archivarClaseDePrueba,
  leerEstadoDeClase,
  pedirComo,
  type MetodoDePrueba,
} from "./ayudas-clases-archivadas.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { ejecutorEspiado, unaVezDespuesDe } from "./ayudas-gradebook.js"

// Ataque del Tester, ADMIN-01a, ronda 2: la corrección de T-01 (editarClase relee por id) y de T-02
// (cursor con posición, Enmienda 5). Posiciones manipuladas en las dos listas (largas, con
// caracteres de control, codificadas dos veces, repetidas, en una lista que no las admite), la clase
// del cursor que deja de ser del perfil entre dos páginas, empates de fecha, HEAD, dos vueltas de
// restaurar y archivar, el texto de cada 400, y los estados vecinos de la relectura de editarClase.
// R-19 (otra fila que se mueve) es riesgo aceptado y no se ataca aquí. N-18: ninguna clase queda
// confirmada con 0 o 3 maestros. Todas las fechas de archivo son fijas.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
let tokenAdmin = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const pedir = (
  method: MetodoDePrueba,
  url: string,
  token?: string,
): Promise<LightMyRequestResponse> =>
  pedirComo(obtenerApp(), { method, url, ...(token === undefined ? {} : { token }) })

const ficha = (): string => randomUUID().slice(0, 8)
const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })
const maestroDePrueba = () =>
  crearAlumnoDePrueba(idsUsuarios, { nombre: `Maestro ${ficha()}`, rol: "maestro" })
const estudianteDePrueba = () =>
  crearAlumnoDePrueba(idsUsuarios, { nombre: `Estudiante ${ficha()}` })

const CURSOR_INVALIDO = { error: { codigo: "VALIDACION", mensaje: "cursor: no es válido" } }
const enc = encodeURIComponent

// El 400 exacto de un cursor inválido, también en HEAD (sin cuerpo: el mismo estado que el GET).
const expectCursorInvalido = async (url: string, token: string, nota: string): Promise<void> => {
  const respuesta = await pedir("GET", url, token)
  expect(respuesta.statusCode, `${nota}: ${respuesta.body}`).toBe(400)
  expect(respuesta.json(), nota).toEqual(CURSOR_INVALIDO)
  const head = await pedir("HEAD", url, token)
  expect(head.statusCode, `HEAD ${nota}`).toBe(400)
  expect(head.body, `HEAD ${nota}`).toBe("")
}

const idsDe = (respuesta: LightMyRequestResponse, lista: "anteriores" | "admin"): string[] => {
  expect(respuesta.statusCode, respuesta.body).toBe(200)
  const cuerpo =
    lista === "anteriores"
      ? listaClasesAnterioresRespuestaSchema.parse(respuesta.json())
      : listaClasesAdminRespuestaSchema.parse(respuesta.json())
  return cuerpo.clases.map((clase) => clase.id)
}

const porIdDesc = (a: string, b: string): number => (a < b ? 1 : a > b ? -1 : 0)

beforeAll(async () => {
  // warn: los P2028 (warn) y los 500 (error) de este archivo salen en la corrida (PA-07).
  app = await construirApp({ env: { ...cargarEnv(), LOG_LEVEL: "warn" } })
  await app.ready()
  tokenAdmin = await tokenDelAdminDePrueba()
}, 30_000)

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("posiciones manipuladas (ataque 01a-r2)", () => {
  it("ADM-T2A01: GET y HEAD de /clases/anteriores y de /admin/clases?estado=archivadas con posiciones largas, con caracteres de control, codificadas dos veces, con espacios o en otro formato → 400 con el cuerpo exacto «cursor: no es válido»; repetida → 400 VALIDACION; nunca 500", async () => {
    const maestro = await maestroDePrueba()
    const alumno = await estudianteDePrueba()
    const token = await tokenDe(alumno)
    const fecha = "2026-02-03T04:05:06.007Z"
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, alumno.id)
    await archivarClaseDePrueba(clase.id, new Date(fecha))

    const malas = [
      "x".repeat(10_000),
      `${fecha}${"0".repeat(5000)}`,
      `${fecha}\u0000`,
      `${fecha}\n`,
      `\u001f${fecha}`,
      `${fecha} `,
      ` ${fecha}`,
      fecha.toLowerCase(),
      fecha.replace("Z", "+00:00"),
      fecha.replace(".007Z", "Z"),
      fecha.replace("T", " "),
      String(Date.parse(fecha)),
      enc(fecha),
      `"${fecha}"`,
      "null",
      "undefined",
      "[object Object]",
      "‮2026",
      "２０２６-02-03T04:05:06.007Z",
    ]
    const bases = [
      { nombre: "anteriores", url: "/api/clases/anteriores?limite=1", token },
      { nombre: "admin", url: "/api/admin/clases?estado=archivadas&limite=1", token: tokenAdmin },
    ]
    for (const base of bases) {
      // Control: la posición exacta → 200.
      const buena = await pedir(
        "GET",
        `${base.url}&cursor=${clase.id}&cursorArchivadaEn=${enc(fecha)}`,
        base.token,
      )
      expect(buena.statusCode, `${base.nombre} control: ${buena.body}`).toBe(200)
      for (const mala of malas) {
        await expectCursorInvalido(
          `${base.url}&cursor=${clase.id}&cursorArchivadaEn=${enc(mala)}`,
          base.token,
          `${base.nombre} ${JSON.stringify(mala.slice(0, 40))}`,
        )
      }
      // Codificada dos veces: llega como "2026-02-03T04%3A05…".
      await expectCursorInvalido(
        `${base.url}&cursor=${clase.id}&cursorArchivadaEn=${enc(enc(fecha))}`,
        base.token,
        `${base.nombre} doble codificación`,
      )
      // "+" sin codificar se lee como espacio.
      await expectCursorInvalido(
        `${base.url}&cursor=${clase.id}&cursorArchivadaEn=2026-02-03T04:05:06.007+00:00`,
        base.token,
        `${base.nombre} + sin codificar`,
      )
      // Otra clave que no es la posición: el cursor queda sin posición.
      await expectCursorInvalido(
        `${base.url}&cursor=${clase.id}&cursorArchivadaEn%5B%5D=${enc(fecha)}`,
        base.token,
        `${base.nombre} cursorArchivadaEn[]`,
      )
      // Repetida: el 400 VALIDACION de validarParametros con su propio campo (plan, §D-2).
      const repetida = await pedir(
        "GET",
        `${base.url}&cursor=${clase.id}&cursorArchivadaEn=${enc(fecha)}&cursorArchivadaEn=${enc(fecha)}`,
        base.token,
      )
      expect(repetida.statusCode, `${base.nombre} repetida`).toBe(400)
      const error = errorApiSchema.parse(repetida.json()).error
      expect(error.codigo).toBe("VALIDACION")
      expect(error.mensaje.startsWith("cursorArchivadaEn: "), error.mensaje).toBe(true)
      expect(repetida.body).not.toContain(fecha)
    }
  }, 120_000)

  it("ADM-T2A02: en /admin/clases sin estado y con estado=activas, cualquier cursorArchivadaEn (con o sin cursor, válido o no) → 400 «cursor: no es válido»; en las dos listas con posición, la posición sin cursor también, y el cursor de una clase ajena, activa o inexistente con una posición bien formada", async () => {
    const maestro = await maestroDePrueba()
    const alumno = await estudianteDePrueba()
    const otro = await estudianteDePrueba()
    const token = await tokenDe(alumno)
    const fecha = "2026-02-04T04:05:06.007Z"
    const propia = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const ajena = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const activa = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(propia.id, alumno.id)
    await inscribirDePrueba(activa.id, alumno.id)
    await inscribirDePrueba(ajena.id, otro.id)
    await archivarClaseDePrueba(propia.id, new Date(fecha))
    await archivarClaseDePrueba(ajena.id, new Date(fecha))

    for (const estado of ["", "estado=activas&"]) {
      for (const sufijo of [
        `cursorArchivadaEn=${enc(fecha)}`,
        `cursor=${activa.id}&cursorArchivadaEn=${enc(fecha)}`,
        `cursor=${propia.id}&cursorArchivadaEn=${enc(fecha)}`,
        "cursorArchivadaEn=",
      ]) {
        await expectCursorInvalido(
          `/api/admin/clases?${estado}${sufijo}`,
          tokenAdmin,
          `${estado}${sufijo}`,
        )
      }
    }
    for (const [url, t] of [
      [`/api/clases/anteriores?cursorArchivadaEn=${enc(fecha)}`, token],
      [`/api/admin/clases?estado=archivadas&cursorArchivadaEn=${enc(fecha)}`, tokenAdmin],
      [`/api/clases/anteriores?cursor=${ajena.id}&cursorArchivadaEn=${enc(fecha)}`, token],
      [`/api/clases/anteriores?cursor=${activa.id}&cursorArchivadaEn=${enc(fecha)}`, token],
      [`/api/clases/anteriores?cursor=${randomUUID()}&cursorArchivadaEn=${enc(fecha)}`, token],
      [
        `/api/admin/clases?estado=archivadas&cursor=${activa.id}&cursorArchivadaEn=${enc(fecha)}`,
        tokenAdmin,
      ],
      [
        `/api/admin/clases?estado=archivadas&cursor=${randomUUID()}&cursorArchivadaEn=${enc(fecha)}`,
        tokenAdmin,
      ],
    ] as const) {
      await expectCursorInvalido(url, t, url)
    }
  }, 60_000)
})

describe("la clase del cursor entre dos páginas (ataque 01a-r2)", () => {
  it("ADM-T2A03: el alumno dado de baja de la clase del cursor y el maestro retirado de ella entre dos páginas → 400 «cursor: no es válido», nunca una página de otra persona", async () => {
    const principal = await maestroDePrueba()
    const retirado = await maestroDePrueba()
    const alumno = await estudianteDePrueba()
    const ids: string[] = []
    for (const dia of [14, 13, 12]) {
      const clase = await crearClaseDePrueba(idsClases, {
        maestroId: principal.id,
        maestroIds: [principal.id, retirado.id],
      })
      await inscribirDePrueba(clase.id, alumno.id)
      await archivarClaseDePrueba(clase.id, new Date(`2026-02-${String(dia)}T10:00:00.000Z`))
      ids.push(clase.id)
    }
    const [, cursor] = ids
    if (cursor === undefined) throw new Error("Precondición: tres clases")
    const posicion = "2026-02-13T10:00:00.000Z"
    const url = `/api/clases/anteriores?limite=1&cursor=${cursor}&cursorArchivadaEn=${enc(posicion)}`
    const tokenAlumno = await tokenDe(alumno)
    const tokenRetirado = await tokenDe(retirado)
    expect(idsDe(await pedir("GET", url, tokenAlumno), "anteriores")).toEqual([ids[2]])
    expect(idsDe(await pedir("GET", url, tokenRetirado), "anteriores")).toEqual([ids[2]])

    await obtenerDb().inscripcion.delete({
      where: { claseId_usuarioId: { claseId: cursor, usuarioId: alumno.id } },
      select: { claseId: true },
    })
    // La clase queda con un maestro (N-18: nunca 0).
    await obtenerDb().maestroDeClase.delete({
      where: { claseId_maestroId: { claseId: cursor, maestroId: retirado.id } },
      select: { claseId: true },
    })
    await expectCursorInvalido(url, tokenAlumno, "alumno dado de baja")
    await expectCursorInvalido(url, tokenRetirado, "maestro retirado")
    // Sin cursor, cada uno ve solo lo suyo.
    expect(idsDe(await pedir("GET", "/api/clases/anteriores", tokenAlumno), "anteriores")).toEqual([
      ids[0],
      ids[2],
    ])
    expect(
      idsDe(await pedir("GET", "/api/clases/anteriores", tokenRetirado), "anteriores"),
    ).toEqual([ids[0], ids[2]])
  }, 30_000)

  it("ADM-T2A04: empates de fecha → el cursor de cada clase empatada con la posición común trae exactamente las que siguen en (archivada_en DESC, id DESC), en las dos listas; con la posición desplazada un milisegundo → 400", async () => {
    const maestro = await maestroDePrueba()
    const alumno = await estudianteDePrueba()
    const token = await tokenDe(alumno)
    // Fechas de 2019, que ninguna otra prueba usa: la lista del admin se recorre desde un centinela.
    const empate = new Date("2019-05-09T08:00:00.000Z")
    const centinela = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await archivarClaseDePrueba(centinela.id, new Date(empate.getTime() + 1))
    const empatadas: string[] = []
    for (let i = 0; i < 4; i++) {
      const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
      await inscribirDePrueba(clase.id, alumno.id)
      await archivarClaseDePrueba(clase.id, empate)
      empatadas.push(clase.id)
    }
    const vieja = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(vieja.id, alumno.id)
    await archivarClaseDePrueba(vieja.id, new Date(empate.getTime() - 1))
    const orden = [...empatadas].sort(porIdDesc)
    const posicion = enc(empate.toISOString())

    // Admin: desde el centinela, las cuatro empatadas y luego la vieja.
    const desdeCentinela = await pedir(
      "GET",
      `/api/admin/clases?estado=archivadas&limite=5&cursor=${centinela.id}&cursorArchivadaEn=${enc(new Date(empate.getTime() + 1).toISOString())}`,
      tokenAdmin,
    )
    expect(
      idsDe(desdeCentinela, "admin"),
      "Precondición: nadie más archivó en esa ventana",
    ).toEqual([...orden, vieja.id])

    for (const [i, cursor] of orden.entries()) {
      const restantes = [...orden.slice(i + 1), vieja.id]
      const anteriores = await pedir(
        "GET",
        `/api/clases/anteriores?limite=10&cursor=${cursor}&cursorArchivadaEn=${posicion}`,
        token,
      )
      expect(idsDe(anteriores, "anteriores"), `anteriores tras ${String(i)}`).toEqual(restantes)
      const admin = await pedir(
        "GET",
        `/api/admin/clases?estado=archivadas&limite=${String(restantes.length)}&cursor=${cursor}&cursorArchivadaEn=${posicion}`,
        tokenAdmin,
      )
      expect(idsDe(admin, "admin"), `admin tras ${String(i)}`).toEqual(restantes)
      for (const delta of [-1, 1]) {
        const corrida = enc(new Date(empate.getTime() + delta).toISOString())
        await expectCursorInvalido(
          `/api/clases/anteriores?cursor=${cursor}&cursorArchivadaEn=${corrida}`,
          token,
          `anteriores ${String(delta)} ms`,
        )
        await expectCursorInvalido(
          `/api/admin/clases?estado=archivadas&cursor=${cursor}&cursorArchivadaEn=${corrida}`,
          tokenAdmin,
          `admin ${String(delta)} ms`,
        )
      }
    }
  }, 60_000)

  it("ADM-T2A05: dos vueltas de restaurar y archivar por la API la clase del cursor entre dos páginas → 400 con cada posición vieja y 200 con la actual, en las dos listas; HEAD responde lo mismo que GET", async () => {
    const maestro = await maestroDePrueba()
    const alumno = await estudianteDePrueba()
    const token = await tokenDe(alumno)
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, alumno.id)
    const original = "2026-02-20T10:00:00.000Z"
    await archivarClaseDePrueba(clase.id, new Date(original))
    const posiciones = [original]
    const urls = (posicion: string) => [
      {
        url: `/api/clases/anteriores?cursor=${clase.id}&cursorArchivadaEn=${enc(posicion)}`,
        t: token,
      },
      {
        url: `/api/admin/clases?estado=archivadas&limite=1&cursor=${clase.id}&cursorArchivadaEn=${enc(posicion)}`,
        t: tokenAdmin,
      },
    ]
    for (let vuelta = 0; vuelta < 2; vuelta++) {
      expect(
        (await pedir("POST", `/api/admin/clases/${clase.id}/restaurar`, tokenAdmin)).statusCode,
      ).toBe(200)
      const archivada = await pedir("POST", `/api/admin/clases/${clase.id}/archivar`, tokenAdmin)
      expect(archivada.statusCode).toBe(200)
      const actual = (await leerEstadoDeClase(clase.id)).archivadaEn?.toISOString() ?? ""
      expect(posiciones, "Precondición: la vuelta cambió la fecha").not.toContain(actual)
      for (const vieja of posiciones) {
        for (const { url, t } of urls(vieja)) {
          await expectCursorInvalido(url, t, `vuelta ${String(vuelta)} posición ${vieja}`)
        }
      }
      for (const { url, t } of urls(actual)) {
        expect((await pedir("GET", url, t)).statusCode, `GET ${url}`).toBe(200)
        const head = await pedir("HEAD", url, t)
        expect(head.statusCode, `HEAD ${url}`).toBe(200)
        expect(head.body).toBe("")
      }
      posiciones.push(actual)
    }
    // HEAD sin cursor ni posición, como GET.
    expect((await pedir("HEAD", "/api/clases/anteriores", token)).statusCode).toBe(200)
    expect(
      (await pedir("HEAD", "/api/admin/clases?estado=archivadas", tokenAdmin)).statusCode,
    ).toBe(200)
  }, 60_000)
})

describe("estados vecinos de la relectura de editarClase (ataque 01a-r2, T-01)", () => {
  const capturar = async (promesa: Promise<unknown>): Promise<unknown> => {
    try {
      return { valor: await promesa }
    } catch (error) {
      if (error instanceof AppError) return { estado: error.estado, codigo: error.codigo }
      return { otro: String(error) }
    }
  }

  it("ADM-T2A06: archivada antes del UPDATE y borrada entre el UPDATE y la relectura → null (403 en la ruta); archivada antes y restaurada entre los dos → 409 CLASE_ARCHIVADA sin escribir; activa y archivada después del UPDATE → la edición queda y se devuelve con su archivadaEn; nunca otro error", async () => {
    const maestro = await maestroDePrueba()

    const borrada = await crearClaseDePrueba(idsClases, { maestroId: maestro.id, nombre: "B" })
    await archivarClaseDePrueba(borrada.id, new Date("2026-02-21T10:00:00.000Z"))
    const borrar = unaVezDespuesDe("clase.updateMany", async () => {
      await obtenerDb().clase.delete({ where: { id: borrada.id }, select: { id: true } })
    })
    expect(
      await capturar(
        editarClase({ claseId: borrada.id, nombre: "X" }, ejecutorEspiado(borrar.gancho).ejecutor),
      ),
    ).toEqual({ valor: null })
    expect(borrar.disparado(), "Precondición: el gancho corrió tras el UPDATE").toBe(true)

    const restaurada = await crearClaseDePrueba(idsClases, { maestroId: maestro.id, nombre: "R" })
    await archivarClaseDePrueba(restaurada.id, new Date("2026-02-21T10:00:00.000Z"))
    const restaurar = unaVezDespuesDe("clase.updateMany", async () => {
      await obtenerDb().clase.update({
        where: { id: restaurada.id },
        data: { activa: true, archivadaEn: null },
        select: { id: true },
      })
    })
    expect(
      await capturar(
        editarClase(
          { claseId: restaurada.id, nombre: "X" },
          ejecutorEspiado(restaurar.gancho).ejecutor,
        ),
      ),
    ).toEqual({ estado: 409, codigo: "CLASE_ARCHIVADA" })
    expect(restaurar.disparado()).toBe(true)
    const trasRestaurar = await leerEstadoDeClase(restaurada.id)
    expect(trasRestaurar.nombre).toBe("R")
    expect(trasRestaurar.activa).toBe(true)

    const tardia = await crearClaseDePrueba(idsClases, { maestroId: maestro.id, nombre: "T" })
    const archivar = unaVezDespuesDe("clase.updateMany", async () => {
      await archivarClaseDePrueba(tardia.id, new Date("2026-02-22T10:00:00.000Z"))
    })
    const resultado = await capturar(
      editarClase(
        { claseId: tardia.id, nombre: "Nuevo" },
        ejecutorEspiado(archivar.gancho).ejecutor,
      ),
    )
    expect(archivar.disparado()).toBe(true)
    expect(resultado).toMatchObject({
      valor: { id: tardia.id, nombre: "Nuevo", archivadaEn: new Date("2026-02-22T10:00:00.000Z") },
    })
    const trasArchivar = await leerEstadoDeClase(tardia.id)
    expect(trasArchivar.nombre).toBe("Nuevo")
    expect(trasArchivar.activa).toBe(false)
  }, 30_000)
})
