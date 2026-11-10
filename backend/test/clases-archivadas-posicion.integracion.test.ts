import { randomUUID } from "node:crypto"

import {
  listaClasesAdminRespuestaSchema,
  listaClasesAnterioresRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba, type UsuarioDePrueba } from "./ayudas-auth.js"
import { archivarClaseDePrueba, pedirComo } from "./ayudas-clases-archivadas.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"

// ADMIN-01a, Enmienda 5 (§D-2, T-02): las dos listas ordenadas por archivada_en piden la página
// siguiente con el cursor y su posición (cursorArchivadaEn). La posición se compara como texto con
// la fecha de archivo actual de la fila del cursor; si no coincide, 400 "cursor: no es válido".

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
let tokenAdmin = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const pedir = (method: "GET" | "POST", url: string, token: string) =>
  pedirComo(obtenerApp(), { method, url, token })

const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

const ficha = (): string => randomUUID().slice(0, 8)

const CURSOR_INVALIDO = { error: { codigo: "VALIDACION", mensaje: "cursor: no es válido" } }

const esperarCursorInvalido = (respuesta: LightMyRequestResponse, caso: string): void => {
  expect(respuesta.statusCode, `${caso}: ${respuesta.body}`).toBe(400)
  expect(respuesta.json(), caso).toEqual(CURSOR_INVALIDO)
}

const conPosicion = (cursor: string, posicion: string): string =>
  `cursor=${cursor}&cursorArchivadaEn=${encodeURIComponent(posicion)}`

// Las cuatro variantes de una posición que no coincide con la de la fila del cursor (ADM-1A16 c).
// `+00:00` va ya codificado (%2B): un `+` sin codificar llegaría como espacio.
const posicionesQueNoCoinciden = (real: Date, otra: Date): [string, string][] => {
  const iso = real.toISOString()
  return [
    ["otra fecha válida", `cursorArchivadaEn=${encodeURIComponent(otra.toISOString())}`],
    ["sin milisegundos", `cursorArchivadaEn=${encodeURIComponent(iso.replace(".000Z", "Z"))}`],
    ["con +00:00", `cursorArchivadaEn=${encodeURIComponent(iso.replace("Z", ""))}%2B00:00`],
    ["texto vacío", "cursorArchivadaEn="],
  ]
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
  tokenAdmin = await tokenDelAdminDePrueba()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("GET /clases/anteriores con la posición del cursor (ADM-1A16)", () => {
  for (const perfil of ["alumno", "maestro"] as const) {
    it(`ADM-1A16 (${perfil}): la página siguiente con la posición → 200; con la clase del cursor restaurada y vuelta a archivar, una posición que no coincide, el cursor sin posición o la posición sin cursor → 400 "cursor: no es válido"`, async () => {
      const maestro = await crearAlumnoDePrueba(idsUsuarios, {
        nombre: `Maestro ${ficha()}`,
        rol: "maestro",
      })
      const alumno = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Alumna ${ficha()}` })
      const token = await tokenDe(perfil === "alumno" ? alumno : maestro)
      const fechas = [14, 13, 12, 11].map((dia) => new Date(`2026-02-${String(dia)}T10:00:00.000Z`))
      const ids: string[] = []
      for (const fecha of fechas) {
        const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
        await inscribirDePrueba(clase.id, alumno.id)
        await archivarClaseDePrueba(clase.id, fecha)
        ids.push(clase.id)
      }
      const [a, b, c, d] = ids
      const [, fechaB, fechaC] = fechas
      if (!a || !b || !c || !d || !fechaB || !fechaC) throw new Error("Precondición: 4 clases")

      const primera = await pedir("GET", "/api/clases/anteriores?limite=2", token)
      const pagina1 = listaClasesAnterioresRespuestaSchema.parse(primera.json())
      expect(pagina1.clases.map((clase) => clase.id)).toEqual([a, b])
      expect(pagina1.siguienteCursor).toBe(b)
      expect(pagina1.siguienteCursorArchivadaEn).toBe(fechaB.toISOString())
      const siguiente = `/api/clases/anteriores?limite=2&${conPosicion(b, fechaB.toISOString())}`

      // (a) Control: con la posición recibida, la página siguiente.
      const control = await pedir("GET", siguiente, token)
      expect(control.statusCode, control.body).toBe(200)
      const pagina2 = listaClasesAnterioresRespuestaSchema.parse(control.json())
      expect(pagina2.clases.map((clase) => clase.id)).toEqual([c, d])
      expect(pagina2.siguienteCursor).toBeNull()
      expect(pagina2.siguienteCursorArchivadaEn).toBeNull()

      // (c) Una posición que no coincide, cada una por separado.
      for (const [caso, posicion] of posicionesQueNoCoinciden(fechaB, fechaC)) {
        const respuesta = await pedir(
          "GET",
          `/api/clases/anteriores?limite=2&cursor=${b}&${posicion}`,
          token,
        )
        esperarCursorInvalido(respuesta, caso)
      }
      // (d) Cursor sin posición; (e) posición sin cursor.
      esperarCursorInvalido(
        await pedir("GET", `/api/clases/anteriores?limite=2&cursor=${b}`, token),
        "cursor sin posición",
      )
      esperarCursorInvalido(
        await pedir(
          "GET",
          `/api/clases/anteriores?limite=2&cursorArchivadaEn=${encodeURIComponent(fechaB.toISOString())}`,
          token,
        ),
        "posición sin cursor",
      )

      // (b) La clase del cursor restaurada y vuelta a archivar por la API: la misma petición → 400.
      expect((await pedir("POST", `/api/admin/clases/${b}/restaurar`, tokenAdmin)).statusCode).toBe(
        200,
      )
      expect((await pedir("POST", `/api/admin/clases/${b}/archivar`, tokenAdmin)).statusCode).toBe(
        200,
      )
      esperarCursorInvalido(await pedir("GET", siguiente, token), "vuelta a archivar")
    }, 30_000)
  }
})

describe("GET /admin/clases?estado=archivadas con la posición del cursor (ADM-1A17)", () => {
  // Un tramo propio de archivadas, con fechas que ninguna otra prueba usa: el recorrido arranca con
  // un cursor real (el centinela) y su posición, así que las archivadas de otros archivos no entran.
  const crearTramo = async (base: string, segundos: readonly number[]) => {
    const maestro = await crearAlumnoDePrueba(idsUsuarios, {
      nombre: `Maestro ${ficha()}`,
      rol: "maestro",
    })
    const filas: { id: string; fecha: Date }[] = []
    for (const segundo of segundos) {
      const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
      const fecha = new Date(`${base}${String(segundo).padStart(2, "0")}.000Z`)
      await archivarClaseDePrueba(clase.id, fecha)
      filas.push({ id: clase.id, fecha })
    }
    return filas
  }

  const url = (consulta: string) => `/api/admin/clases?estado=archivadas&${consulta}`

  it('ADM-1A17: la página siguiente con la posición → 200; vuelta a archivar por la API o directo en la base, una posición que no coincide, el cursor sin posición o la posición sin cursor → 400 "cursor: no es válido"', async () => {
    const [centinela, a, b, c, d] = await crearTramo("2019-05-04T08:00:", [9, 8, 7, 6, 5])
    if (!centinela || !a || !b || !c || !d) throw new Error("Precondición: 5 clases")

    const primera = await pedir(
      "GET",
      url(`limite=2&${conPosicion(centinela.id, centinela.fecha.toISOString())}`),
      tokenAdmin,
    )
    expect(primera.statusCode, primera.body).toBe(200)
    const pagina1 = listaClasesAdminRespuestaSchema.parse(primera.json())
    expect(pagina1.clases.map((clase) => clase.id)).toEqual([a.id, b.id])
    expect(pagina1.siguienteCursor).toBe(b.id)
    expect(pagina1.siguienteCursorArchivadaEn).toBe(b.fecha.toISOString())
    const siguiente = url(`limite=2&${conPosicion(b.id, b.fecha.toISOString())}`)

    // (a) Control.
    const control = await pedir("GET", siguiente, tokenAdmin)
    expect(control.statusCode, control.body).toBe(200)
    const pagina2 = listaClasesAdminRespuestaSchema.parse(control.json())
    expect(pagina2.clases.map((clase) => clase.id)).toEqual([c.id, d.id])

    // (c) Posiciones que no coinciden; (d) cursor sin posición; (e) posición sin cursor.
    for (const [caso, posicion] of posicionesQueNoCoinciden(b.fecha, c.fecha)) {
      esperarCursorInvalido(
        await pedir("GET", url(`limite=2&cursor=${b.id}&${posicion}`), tokenAdmin),
        caso,
      )
    }
    esperarCursorInvalido(
      await pedir("GET", url(`limite=2&cursor=${b.id}`), tokenAdmin),
      "cursor sin posición",
    )
    esperarCursorInvalido(
      await pedir(
        "GET",
        url(`limite=2&cursorArchivadaEn=${encodeURIComponent(b.fecha.toISOString())}`),
        tokenAdmin,
      ),
      "posición sin cursor",
    )

    // (b) Restaurada y vuelta a archivar por la API.
    expect(
      (await pedir("POST", `/api/admin/clases/${b.id}/restaurar`, tokenAdmin)).statusCode,
    ).toBe(200)
    expect((await pedir("POST", `/api/admin/clases/${b.id}/archivar`, tokenAdmin)).statusCode).toBe(
      200,
    )
    esperarCursorInvalido(await pedir("GET", siguiente, tokenAdmin), "vuelta a archivar (API)")

    // (f) Vuelta a archivar directo en la base, con una fecha posterior.
    const desdeC = url(`limite=1&${conPosicion(c.id, c.fecha.toISOString())}`)
    const antesDeMover = await pedir("GET", desdeC, tokenAdmin)
    expect(antesDeMover.statusCode, antesDeMover.body).toBe(200)
    expect(
      listaClasesAdminRespuestaSchema.parse(antesDeMover.json()).clases.map((clase) => clase.id),
    ).toEqual([d.id])
    await archivarClaseDePrueba(c.id, new Date("2019-05-04T08:00:59.000Z"))
    esperarCursorInvalido(await pedir("GET", desdeC, tokenAdmin), "vuelta a archivar (base)")
  }, 30_000)

  it("ADM-1A17 (g): el recorrido completo de un tramo propio con limite 1, 2 y 3 entrega cada clase una sola vez, en (archivada_en DESC, id DESC)", async () => {
    const tramo = await crearTramo("2019-06-01T08:00:", [9, 8, 7, 7, 7, 6, 5])
    const [centinela, ...resto] = tramo
    if (!centinela) throw new Error("Precondición: el centinela")
    const esperadas = [...resto]
      .sort((x, y) => {
        const porFecha = y.fecha.getTime() - x.fecha.getTime()
        if (porFecha !== 0) return porFecha
        return y.id < x.id ? -1 : 1
      })
      .map((fila) => fila.id)
    const propias = new Set(esperadas)
    const ultima = esperadas.at(-1)
    if (ultima === undefined)
      throw new Error("Precondición: el tramo esperado tiene al menos una clase")

    for (const limite of [1, 2, 3]) {
      const recorridas: string[] = []
      let cursor = centinela.id
      let posicion = centinela.fecha.toISOString()
      for (let vuelta = 0; vuelta < 20; vuelta++) {
        const respuesta = await pedir(
          "GET",
          url(`limite=${String(limite)}&${conPosicion(cursor, posicion)}`),
          tokenAdmin,
        )
        expect(respuesta.statusCode, respuesta.body).toBe(200)
        const pagina = listaClasesAdminRespuestaSchema.parse(respuesta.json())
        for (const clase of pagina.clases) {
          if (recorridas.includes(ultima)) break
          recorridas.push(clase.id)
        }
        if (recorridas.includes(ultima)) break
        if (pagina.siguienteCursor === null || !pagina.siguienteCursorArchivadaEn) {
          throw new Error(`limite ${String(limite)}: la lista terminó antes del tramo`)
        }
        cursor = pagina.siguienteCursor
        posicion = pagina.siguienteCursorArchivadaEn
      }
      expect(recorridas, `limite ${String(limite)}`).toEqual(esperadas)
      expect(recorridas.every((id) => propias.has(id))).toBe(true)
    }
  }, 30_000)
})
