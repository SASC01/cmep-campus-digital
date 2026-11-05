import { randomUUID } from "node:crypto"

import {
  claseRespuestaSchema,
  listaClasesAdminRespuestaSchema,
  listaClasesAnterioresRespuestaSchema,
  listaClasesImpartidasRespuestaSchema,
  listaClasesInscritasRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { enTransaccion, obtenerDb } from "../src/adapters/db/cliente.js"
import { editarClase, listarClasesAdmin } from "../src/adapters/db/index.js"
import { AppError } from "../src/core/errores.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba, type UsuarioDePrueba } from "./ayudas-auth.js"
import {
  archivarClaseDePrueba,
  clavesDe,
  codigoDeError,
  leerEstadoDeClase,
  pedirComo,
  type MetodoDePrueba,
} from "./ayudas-clases-archivadas.js"
import {
  borrarMovimientosYClasesDePrueba,
  contarInscripciones,
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
  leerInscripcion,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { formadasDetrasDe } from "./ayudas-concurrencia.js"

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
let tokenAdmin = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const pedir = (method: MetodoDePrueba, url: string, token?: string, payload?: object) =>
  pedirComo(obtenerApp(), {
    method,
    url,
    ...(token === undefined ? {} : { token }),
    ...(payload === undefined ? {} : { payload }),
  })

const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

const ficha = (): string => randomUUID().slice(0, 8)
const maestroDePrueba = () =>
  crearAlumnoDePrueba(idsUsuarios, { nombre: `Maestro ${ficha()}`, rol: "maestro" })
const estudianteDePrueba = (opciones: { accesoRestringido?: boolean } = {}) =>
  crearAlumnoDePrueba(idsUsuarios, { nombre: `Estudiante ${ficha()}`, ...opciones })

const MENSAJE_CURSOR = "cursor: no es válido"

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

describe("archivar y restaurar (ADM-1A04)", () => {
  it("ADM-1A04: archivar → 200 con archivadaEn ISO y activa = false; otra vez → 409 CLASE_YA_ARCHIVADA sin escribir; restaurar → 200 con archivadaEn null y activa = true; otra vez → 409 CLASE_NO_ARCHIVADA sin escribir", async () => {
    const maestro = await maestroDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const url = `/api/admin/clases/${clase.id}`

    const archivada = await pedir("POST", `${url}/archivar`, tokenAdmin)
    expect(archivada.statusCode).toBe(200)
    const cuerpo = claseRespuestaSchema.parse(archivada.json())
    expect(cuerpo.clase.id).toBe(clase.id)
    expect(cuerpo.clase.archivadaEn).toEqual(expect.any(String))
    const trasArchivar = await leerEstadoDeClase(clase.id)
    expect(trasArchivar.activa).toBe(false)
    expect(trasArchivar.archivadaEn?.toISOString()).toBe(cuerpo.clase.archivadaEn)

    const otraVez = await pedir("POST", `${url}/archivar`, tokenAdmin)
    expect(otraVez.statusCode).toBe(409)
    expect(otraVez.json()).toEqual({
      error: { codigo: "CLASE_YA_ARCHIVADA", mensaje: "Esta clase ya está archivada." },
    })
    const trasRepetir = await leerEstadoDeClase(clase.id)
    expect(trasRepetir.archivadaEn?.getTime()).toBe(trasArchivar.archivadaEn?.getTime())
    expect(trasRepetir.actualizadoEn.getTime()).toBe(trasArchivar.actualizadoEn.getTime())

    const restaurada = await pedir("POST", `${url}/restaurar`, tokenAdmin)
    expect(restaurada.statusCode).toBe(200)
    expect(claseRespuestaSchema.parse(restaurada.json()).clase.archivadaEn).toBeNull()
    const trasRestaurar = await leerEstadoDeClase(clase.id)
    expect(trasRestaurar.activa).toBe(true)
    expect(trasRestaurar.archivadaEn).toBeNull()

    const restaurarOtraVez = await pedir("POST", `${url}/restaurar`, tokenAdmin)
    expect(restaurarOtraVez.statusCode).toBe(409)
    expect(restaurarOtraVez.json()).toEqual({
      error: { codigo: "CLASE_NO_ARCHIVADA", mensaje: "Esta clase no está archivada." },
    })
    const trasRepetirRestaurar = await leerEstadoDeClase(clase.id)
    expect(trasRepetirRestaurar.actualizadoEn.getTime()).toBe(trasRestaurar.actualizadoEn.getTime())
    expect(trasRepetirRestaurar.activa).toBe(true)
  })
})

describe("archivadaEn en las respuestas de clase (ADM-1A05)", () => {
  it("ADM-1A05: GET /clases/:claseId trae archivadaEn (null en una activa, ISO en una archivada) para el alumno inscrito, el maestro y el admin", async () => {
    const maestro = await maestroDePrueba()
    const alumno = await estudianteDePrueba()
    const activa = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const archivada = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(activa.id, alumno.id)
    await inscribirDePrueba(archivada.id, alumno.id)
    const fecha = new Date("2026-11-01T12:00:00.000Z")
    await archivarClaseDePrueba(archivada.id, fecha)

    for (const token of [await tokenDe(alumno), await tokenDe(maestro), tokenAdmin]) {
      const deLaActiva = await pedir("GET", `/api/clases/${activa.id}`, token)
      expect(deLaActiva.statusCode).toBe(200)
      const claseActiva = deLaActiva.json<{ clase: Record<string, unknown> }>().clase
      expect(Object.keys(claseActiva)).toContain("archivadaEn")
      expect(claseActiva.archivadaEn).toBeNull()

      const deLaArchivada = await pedir("GET", `/api/clases/${archivada.id}`, token)
      expect(deLaArchivada.statusCode).toBe(200)
      expect(claseRespuestaSchema.parse(deLaArchivada.json()).clase.archivadaEn).toBe(
        fecha.toISOString(),
      )
    }
  })

  it("ADM-1A05: GET /admin/clases trae archivadaEn en cada fila; crear y editar responden archivadaEn: null", async () => {
    const maestro = await maestroDePrueba()
    const creada = await pedir("POST", "/api/admin/clases", tokenAdmin, {
      nombre: `Clase ${ficha()}`,
      maestroIds: [maestro.id],
    })
    expect(creada.statusCode).toBe(201)
    const claseCreada = creada.json<{ clase: Record<string, unknown> }>().clase
    idsClases.push(String(claseCreada.id))
    expect(Object.keys(claseCreada)).toContain("archivadaEn")
    expect(claseCreada.archivadaEn).toBeNull()

    const editada = await pedir("PUT", `/api/admin/clases/${String(claseCreada.id)}`, tokenAdmin, {
      nombre: `Editada ${ficha()}`,
    })
    expect(editada.statusCode).toBe(200)
    const claseEditada = editada.json<{ clase: Record<string, unknown> }>().clase
    expect(Object.keys(claseEditada)).toContain("archivadaEn")
    expect(claseEditada.archivadaEn).toBeNull()

    const lista = await pedir("GET", "/api/admin/clases?limite=100", tokenAdmin)
    expect(lista.statusCode).toBe(200)
    const filas = lista.json<{ clases: Record<string, unknown>[] }>().clases
    expect(filas.length).toBeGreaterThan(0)
    for (const fila of filas) expect(Object.keys(fila)).toContain("archivadaEn")
  })
})

describe("autorización de archivar y restaurar (ADM-1A06)", () => {
  it("ADM-1A06: sin token 401; estudiante y maestro de la clase 403 ROL_NO_PERMITIDO; restringido 403 ACCESO_RESTRINGIDO; clase inexistente 403 SIN_ACCESO_A_LA_CLASE; sin estado de pago en la respuesta del admin", async () => {
    const maestro = await maestroDePrueba()
    const alumno = await estudianteDePrueba()
    const restringido = await estudianteDePrueba({ accesoRestringido: true })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, alumno.id)
    await inscribirDePrueba(clase.id, restringido.id)

    for (const accion of ["archivar", "restaurar"] as const) {
      const url = `/api/admin/clases/${clase.id}/${accion}`
      const sinToken = await pedir("POST", url)
      expect(sinToken.statusCode, `${accion} sin token`).toBe(401)

      for (const usuario of [alumno, maestro]) {
        const respuesta = await pedir("POST", url, await tokenDe(usuario))
        expect(respuesta.statusCode, accion).toBe(403)
        expect(codigoDeError(respuesta), accion).toBe("ROL_NO_PERMITIDO")
      }

      const deRestringido = await pedir("POST", url, await tokenDe(restringido))
      expect(deRestringido.statusCode, accion).toBe(403)
      expect(codigoDeError(deRestringido), accion).toBe("ACCESO_RESTRINGIDO")

      const inexistente = await pedir(
        "POST",
        `/api/admin/clases/${randomUUID()}/${accion}`,
        tokenAdmin,
      )
      expect(inexistente.statusCode, accion).toBe(403)
      expect(codigoDeError(inexistente), accion).toBe("SIN_ACCESO_A_LA_CLASE")
    }
    expect((await leerEstadoDeClase(clase.id)).activa, "Nadie la archivó").toBe(true)

    const archivada = await pedir("POST", `/api/admin/clases/${clase.id}/archivar`, tokenAdmin)
    expect(archivada.statusCode).toBe(200)
    const claves = clavesDe(archivada.json())
    for (const prohibida of ["estadoPago", "accesoRestringido", "email", "codigoInvitacion"]) {
      expect(claves).not.toContain(prohibida)
    }
  })
})

describe("inscritas e impartidas sin archivadas (ADM-1A07)", () => {
  it("ADM-1A07: inscritas e impartidas no traen la archivada (tampoco en total) y al restaurar vuelve", async () => {
    const maestro = await maestroDePrueba()
    const alumno = await estudianteDePrueba()
    const a = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const b = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(a.id, alumno.id)
    await inscribirDePrueba(b.id, alumno.id)
    const tokenAlumno = await tokenDe(alumno)
    const tokenMaestro = await tokenDe(maestro)

    const leer = async () => {
      const inscritas = listaClasesInscritasRespuestaSchema.parse(
        (await pedir("GET", "/api/clases/inscritas?limite=100", tokenAlumno)).json(),
      )
      const impartidas = listaClasesImpartidasRespuestaSchema.parse(
        (await pedir("GET", "/api/clases/impartidas?limite=100", tokenMaestro)).json(),
      )
      return { inscritas, impartidas }
    }

    const antes = await leer()
    expect(antes.inscritas.total).toBe(2)
    expect(antes.impartidas.total).toBe(2)

    await pedir("POST", `/api/admin/clases/${a.id}/archivar`, tokenAdmin)
    const archivada = await leer()
    expect(archivada.inscritas.clases.map((c) => c.id)).toEqual([b.id])
    expect(archivada.inscritas.total).toBe(1)
    expect(archivada.impartidas.clases.map((c) => c.id)).toEqual([b.id])
    expect(archivada.impartidas.total).toBe(1)

    await pedir("POST", `/api/admin/clases/${a.id}/restaurar`, tokenAdmin)
    const restaurada = await leer()
    expect(restaurada.inscritas.clases.map((c) => c.id).sort()).toEqual([a.id, b.id].sort())
    expect(restaurada.inscritas.total).toBe(2)
    expect(restaurada.impartidas.clases.map((c) => c.id).sort()).toEqual([a.id, b.id].sort())
    expect(restaurada.impartidas.total).toBe(2)
  })

  it("ADM-1A07: una clase archivada entre dos páginas como cursor → 400 VALIDACION «cursor: no es válido» en las dos listas, y recorrer de nuevo no salta ninguna clase activa", async () => {
    const maestro = await maestroDePrueba()
    const alumno = await estudianteDePrueba()
    for (let i = 0; i < 4; i++) {
      const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
      await inscribirDePrueba(clase.id, alumno.id)
    }
    const listas = [
      { ruta: "/api/clases/inscritas", token: await tokenDe(alumno) },
      { ruta: "/api/clases/impartidas", token: await tokenDe(maestro) },
    ]

    const completa = async (ruta: string, token: string): Promise<string[]> =>
      (await pedir("GET", `${ruta}?limite=100`, token))
        .json<{ clases: { id: string }[] }>()
        .clases.map((c) => c.id)

    const recorrer = async (ruta: string, token: string): Promise<string[]> => {
      const ids: string[] = []
      let cursor: string | null = null
      for (let vuelta = 0; vuelta < 10; vuelta++) {
        const url: string =
          cursor === null ? `${ruta}?limite=1` : `${ruta}?limite=1&cursor=${cursor}`
        const pagina = (await pedir("GET", url, token)).json<{
          clases: { id: string }[]
          siguienteCursor: string | null
        }>()
        ids.push(...pagina.clases.map((c) => c.id))
        cursor = pagina.siguienteCursor
        if (cursor === null) return ids
      }
      throw new Error(`${ruta}: el recorrido no terminó en 10 páginas`)
    }

    // La primera página de inscritas da el cursor; esa clase se archiva antes de pedir la segunda.
    const primera = (
      await pedir("GET", "/api/clases/inscritas?limite=1", listas[0]?.token ?? "")
    ).json<{ clases: { id: string }[]; siguienteCursor: string | null }>()
    const delCursor = primera.siguienteCursor
    if (delCursor === null) throw new Error("Precondición: la primera página trae cursor")
    const esperadasAntes = await completa(listas[0]?.ruta ?? "", listas[0]?.token ?? "")
    expect(esperadasAntes).toHaveLength(4)
    await archivarClaseDePrueba(delCursor)

    for (const { ruta, token } of listas) {
      const conCursorArchivado = await pedir("GET", `${ruta}?limite=1&cursor=${delCursor}`, token)
      expect(conCursorArchivado.statusCode, ruta).toBe(400)
      expect(conCursorArchivado.json(), ruta).toEqual({
        error: { codigo: "VALIDACION", mensaje: MENSAJE_CURSOR },
      })

      const esperadas = await completa(ruta, token)
      expect(esperadas, ruta).toHaveLength(3)
      expect(esperadas, ruta).not.toContain(delCursor)
      expect(await recorrer(ruta, token), ruta).toEqual(esperadas)
    }
  })
})

describe("GET /clases/anteriores (ADM-1A08)", () => {
  it("ADM-1A08: el alumno ve solo sus archivadas y el maestro solo las suyas, por archivada_en DESC, id DESC, con total y paginación por cursor; sin estado de pago, restricción, correo ni versión", async () => {
    const maestro = await maestroDePrueba()
    const otroMaestro = await maestroDePrueba()
    const alumno = await estudianteDePrueba()
    const otroAlumno = await estudianteDePrueba()
    const activa = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const vieja = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const empateA = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const empateB = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const ajena = await crearClaseDePrueba(idsClases, { maestroId: otroMaestro.id })
    for (const clase of [activa, vieja, empateA, empateB]) {
      await inscribirDePrueba(clase.id, alumno.id)
    }
    await inscribirDePrueba(ajena.id, otroAlumno.id)
    const fechaVieja = new Date("2026-10-01T10:00:00.000Z")
    const fechaEmpate = new Date("2026-10-20T10:00:00.000Z")
    await archivarClaseDePrueba(vieja.id, fechaVieja)
    await archivarClaseDePrueba(empateA.id, fechaEmpate)
    await archivarClaseDePrueba(empateB.id, fechaEmpate)
    await archivarClaseDePrueba(ajena.id, fechaEmpate)

    const empatadas = [empateA.id, empateB.id].sort().reverse()
    const esperadas = [...empatadas, vieja.id]

    for (const usuario of [alumno, maestro]) {
      const token = await tokenDe(usuario)
      const completa = await pedir("GET", "/api/clases/anteriores?limite=100", token)
      expect(completa.statusCode).toBe(200)
      const cuerpo = listaClasesAnterioresRespuestaSchema.parse(completa.json())
      expect(cuerpo.clases.map((c) => c.id)).toEqual(esperadas)
      expect(cuerpo.total).toBe(3)
      expect(cuerpo.siguienteCursor).toBeNull()
      expect(cuerpo.clases[2]?.archivadaEn).toBe(fechaVieja.toISOString())
      expect(cuerpo.clases[0]?.maestros).toEqual([{ nombre: expect.any(String) }])
      const claves = clavesDe(completa.json())
      for (const prohibida of [
        "estadoPago",
        "accesoRestringido",
        "motivoRestriccion",
        "email",
        "version",
      ]) {
        expect(claves).not.toContain(prohibida)
      }

      // Enmienda 5: cada página siguiente se pide con el cursor y su posición.
      const recorridas: string[] = []
      let cursor: string | null = null
      let posicion: string | null = null
      for (let vuelta = 0; vuelta < 5; vuelta++) {
        const url: string =
          cursor === null
            ? "/api/clases/anteriores?limite=1"
            : `/api/clases/anteriores?limite=1&cursor=${cursor}&cursorArchivadaEn=${encodeURIComponent(posicion ?? "")}`
        const pagina = listaClasesAnterioresRespuestaSchema.parse(
          (await pedir("GET", url, token)).json(),
        )
        expect(pagina.total).toBe(3)
        recorridas.push(...pagina.clases.map((c) => c.id))
        if (pagina.siguienteCursor === null) {
          expect(pagina.siguienteCursorArchivadaEn).toBeNull()
        } else {
          expect(pagina.siguienteCursorArchivadaEn).toBe(pagina.clases.at(-1)?.archivadaEn)
        }
        cursor = pagina.siguienteCursor
        posicion = pagina.siguienteCursorArchivadaEn
        if (cursor === null) break
      }
      expect(recorridas).toEqual(esperadas)

      // Con una posición bien formada (la fecha real de la ajena), los cursores malos siguen en 400.
      const posicionBienFormada = encodeURIComponent(fechaEmpate.toISOString())
      for (const cursorMalo of [activa.id, ajena.id, randomUUID()]) {
        const respuesta = await pedir(
          "GET",
          `/api/clases/anteriores?limite=1&cursor=${cursorMalo}&cursorArchivadaEn=${posicionBienFormada}`,
          token,
        )
        expect(respuesta.statusCode, cursorMalo).toBe(400)
        expect(respuesta.json(), cursorMalo).toEqual({
          error: { codigo: "VALIDACION", mensaje: MENSAJE_CURSOR },
        })
      }
    }

    const delOtro = listaClasesAnterioresRespuestaSchema.parse(
      (await pedir("GET", "/api/clases/anteriores", await tokenDe(otroAlumno))).json(),
    )
    expect(delOtro.clases.map((c) => c.id)).toEqual([ajena.id])
  })

  it("ADM-1A08: admin → 403 ROL_NO_PERMITIDO; restringido → 403 ACCESO_RESTRINGIDO; sin token → 401", async () => {
    const restringido = await estudianteDePrueba({ accesoRestringido: true })
    const delAdmin = await pedir("GET", "/api/clases/anteriores", tokenAdmin)
    expect(delAdmin.statusCode).toBe(403)
    expect(codigoDeError(delAdmin)).toBe("ROL_NO_PERMITIDO")
    const deRestringido = await pedir("GET", "/api/clases/anteriores", await tokenDe(restringido))
    expect(deRestringido.statusCode).toBe(403)
    expect(codigoDeError(deRestringido)).toBe("ACCESO_RESTRINGIDO")
    expect((await pedir("GET", "/api/clases/anteriores")).statusCode).toBe(401)
  })
})

describe("exportación, gradebook y mis calificaciones de una archivada (ADM-1A10)", () => {
  it("ADM-1A10: gradebook y exportación de una archivada → 200 para el maestro de la clase y el admin; mis-calificaciones → 200 para el alumno inscrito", async () => {
    const maestro = await maestroDePrueba()
    const alumno = await estudianteDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, alumno.id)
    await archivarClaseDePrueba(clase.id)

    for (const token of [await tokenDe(maestro), tokenAdmin]) {
      for (const ruta of ["gradebook", "calificaciones/exportacion"]) {
        const respuesta = await pedir("GET", `/api/clases/${clase.id}/${ruta}`, token)
        expect(respuesta.statusCode, ruta).toBe(200)
      }
    }
    const propias = await pedir(
      "GET",
      `/api/clases/${clase.id}/mis-calificaciones`,
      await tokenDe(alumno),
    )
    expect(propias.statusCode).toBe(200)
  })
})

describe("GET /admin/clases?estado= (ADM-1A11)", () => {
  it("ADM-1A11: activas y archivadas filtran y ordenan como §D-2, con total por estado; un cursor del otro estado → 400; sin estado, todas como antes; estado=otra → 400", async () => {
    const maestro = await maestroDePrueba()
    const activa = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const archivadaA = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const archivadaB = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    // Fechas lejanas: estas dos van primero entre las archivadas aunque otras pruebas archiven.
    await archivarClaseDePrueba(archivadaA.id, new Date("2099-01-01T00:00:00.000Z"))
    await archivarClaseDePrueba(archivadaB.id, new Date("2099-01-02T00:00:00.000Z"))

    const listar = async (consulta: string) => {
      const respuesta = await pedir("GET", `/api/admin/clases?${consulta}`, tokenAdmin)
      expect(respuesta.statusCode, consulta).toBe(200)
      return { cuerpo: listaClasesAdminRespuestaSchema.parse(respuesta.json()) }
    }
    // Enmienda 8: otros archivos crean, archivan, restauran, duplican y borran clases a la vez, así
    // que el total no se compara con conteos hechos fuera de su instantánea. El de una primera página
    // sale de la misma que sus filas (FIX-CLASES): igual a ellas sin página siguiente, mayor con ella.
    const totalDeLaPrimeraPagina = (cuerpo: {
      clases: readonly unknown[]
      total: number
      siguienteCursor: string | null
    }) => {
      if (cuerpo.siguienteCursor === null) {
        expect(cuerpo.total).toBe(cuerpo.clases.length)
        return
      }
      expect(cuerpo.total).toBeGreaterThan(cuerpo.clases.length)
    }

    const fechaA = "2099-01-01T00:00:00.000Z"
    const fechaB = "2099-01-02T00:00:00.000Z"
    const archivadas = await listar("estado=archivadas&limite=100")
    expect(archivadas.cuerpo.clases.slice(0, 2).map((c) => c.id)).toEqual([
      archivadaB.id,
      archivadaA.id,
    ])
    for (const fila of archivadas.cuerpo.clases) expect(fila.archivadaEn).not.toBeNull()
    const ordenArchivadas = archivadas.cuerpo.clases.map((c) => `${c.archivadaEn ?? ""}|${c.id}`)
    expect(ordenArchivadas).toEqual([...ordenArchivadas].sort().reverse())
    totalDeLaPrimeraPagina(archivadas.cuerpo)

    // Enmienda 5: con "archivadas" y página siguiente, la posición es el archivadaEn de la última fila.
    const primeraArchivada = await listar("estado=archivadas&limite=1")
    expect(primeraArchivada.cuerpo.clases.map((c) => c.id)).toEqual([archivadaB.id])
    expect(primeraArchivada.cuerpo.siguienteCursor).toBe(archivadaB.id)
    expect(primeraArchivada.cuerpo.siguienteCursorArchivadaEn).toBe(fechaB)

    const activas = await listar("estado=activas&limite=100")
    for (const fila of activas.cuerpo.clases) expect(fila.archivadaEn).toBeNull()
    // En "activas" y sin estado, siguienteCursorArchivadaEn es null aunque haya página siguiente.
    for (const consulta of ["estado=activas&limite=1", "limite=1"]) {
      const pagina = await listar(consulta)
      expect(pagina.cuerpo.siguienteCursor, consulta).not.toBeNull()
      expect(pagina.cuerpo.siguienteCursorArchivadaEn, consulta).toBeNull()
    }
    const ordenActivas = activas.cuerpo.clases.map((c) => `${c.creadoEn}|${c.id}`)
    expect(ordenActivas).toEqual([...ordenActivas].sort().reverse())
    totalDeLaPrimeraPagina(activas.cuerpo)

    const siguienteArchivada = await listar(
      `estado=archivadas&limite=1&cursor=${archivadaB.id}&cursorArchivadaEn=${encodeURIComponent(fechaB)}`,
    )
    expect(siguienteArchivada.cuerpo.clases.map((c) => c.id)).toEqual([archivadaA.id])
    expect(siguienteArchivada.cuerpo.siguienteCursorArchivadaEn).toBe(
      siguienteArchivada.cuerpo.siguienteCursor === null ? null : fechaA,
    )

    // El cursor del otro estado sigue dando 400; en "archivadas" va con una posición bien formada.
    for (const [estado, cursor, posicion] of [
      ["archivadas", activa.id, `&cursorArchivadaEn=${encodeURIComponent(fechaA)}`],
      ["activas", archivadaA.id, ""],
    ] as const) {
      const respuesta = await pedir(
        "GET",
        `/api/admin/clases?estado=${estado}&cursor=${cursor}${posicion}`,
        tokenAdmin,
      )
      expect(respuesta.statusCode, estado).toBe(400)
      expect(respuesta.json(), estado).toEqual({
        error: { codigo: "VALIDACION", mensaje: MENSAJE_CURSOR },
      })
    }

    const todas = await listar("limite=100")
    totalDeLaPrimeraPagina(todas.cuerpo)
    // Enmienda 8: el total por estado (§D-2), contra conteos de la misma instantánea. La transacción
    // de la prueba va en REPEATABLE READ y la lectura de la lista corre sobre ella (un enTransaccion
    // anidado no abre otra): las seis sentencias, en serie, ven las mismas filas. Solo lee y no
    // espera nada; el timeout explícito queda muy por encima de lo que dura.
    const misma = await enTransaccion(
      obtenerDb(),
      async (tx) => {
        const primera = { cursor: undefined, limite: 1 }
        return {
          activas: (await listarClasesAdmin({ ...primera, estado: "activas" }, tx)).total,
          archivadas: (await listarClasesAdmin({ ...primera, estado: "archivadas" }, tx)).total,
          todas: (await listarClasesAdmin(primera, tx)).total,
          activasContadas: await tx.clase.count({ where: { archivadaEn: null } }),
          archivadasContadas: await tx.clase.count({ where: { archivadaEn: { not: null } } }),
          todasContadas: await tx.clase.count(),
        }
      },
      { instantaneaUnica: true, timeout: 10_000 },
    )
    expect(misma.activas).toBe(misma.activasContadas)
    expect(misma.archivadas).toBe(misma.archivadasContadas)
    expect(misma.todas).toBe(misma.todasContadas)
    expect(misma.activasContadas + misma.archivadasContadas).toBe(misma.todasContadas)
    // La activa y las dos archivadas del caso están en la instantánea: el filtro separa algo.
    expect(misma.activasContadas).toBeGreaterThanOrEqual(1)
    expect(misma.archivadasContadas).toBeGreaterThanOrEqual(2)
    const sinEstadoConCursorArchivado = await pedir(
      "GET",
      `/api/admin/clases?limite=1&cursor=${archivadaA.id}`,
      tokenAdmin,
    )
    expect(sinEstadoConCursorArchivado.statusCode).toBe(200)

    // Con "activas" y sin estado, una posición (con o sin cursor) → 400 "cursor: no es válido".
    for (const consulta of [
      `estado=activas&cursor=${activa.id}&cursorArchivadaEn=${encodeURIComponent(fechaA)}`,
      `estado=activas&cursorArchivadaEn=${encodeURIComponent(fechaA)}`,
      `cursor=${archivadaA.id}&cursorArchivadaEn=${encodeURIComponent(fechaA)}`,
      `cursorArchivadaEn=${encodeURIComponent(fechaA)}`,
    ]) {
      const respuesta = await pedir("GET", `/api/admin/clases?${consulta}`, tokenAdmin)
      expect(respuesta.statusCode, consulta).toBe(400)
      expect(respuesta.json(), consulta).toEqual({
        error: { codigo: "VALIDACION", mensaje: MENSAJE_CURSOR },
      })
    }

    const otra = await pedir("GET", "/api/admin/clases?estado=otra", tokenAdmin)
    expect(otra.statusCode).toBe(400)
    expect(codigoDeError(otra)).toBe("VALIDACION")
  })
})

describe("unirse con el código de una archivada (ADM-1A12)", () => {
  it("ADM-1A12: el código de una archivada → 404 CODIGO_INVALIDO con el mismo cuerpo que un código inexistente y sin inscripción; tras restaurar, unirse funciona", async () => {
    const maestro = await maestroDePrueba()
    const alumno = await estudianteDePrueba()
    const token = await tokenDe(alumno)
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await archivarClaseDePrueba(clase.id)

    const conArchivada = await pedir("POST", "/api/clases/unirse", token, {
      codigo: clase.codigoInvitacion,
    })
    const inexistente = await pedir("POST", "/api/clases/unirse", token, { codigo: "ZZZZZZZ" })
    expect(inexistente.statusCode).toBe(404)
    expect(conArchivada.statusCode).toBe(404)
    expect(conArchivada.json()).toEqual(inexistente.json())
    expect(codigoDeError(conArchivada)).toBe("CODIGO_INVALIDO")
    expect(await contarInscripciones(clase.id)).toBe(0)

    const restaurada = await pedir("POST", `/api/admin/clases/${clase.id}/restaurar`, tokenAdmin)
    expect(restaurada.statusCode).toBe(200)
    const unida = await pedir("POST", "/api/clases/unirse", token, {
      codigo: clase.codigoInvitacion,
    })
    expect(unida.statusCode).toBe(200)
    expect(unida.json()).toEqual({
      clase: { id: clase.id, nombre: expect.any(String) },
      yaEstabas: false,
    })
    expect(await leerInscripcion(clase.id, alumno.id)).not.toBeNull()
  })

  it("ADM-1A12: con el archivado retenido (UPDATE hecho, sin confirmar), unirse espera esa fila y, al confirmar el archivado, responde 404 sin inscribir", async () => {
    const maestro = await maestroDePrueba()
    const alumno = await estudianteDePrueba()
    const token = await tokenDe(alumno)
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })

    let respuesta: Awaited<ReturnType<typeof pedir>> | undefined
    let formadas = 0
    await obtenerDb().$transaction(
      async (tx) => {
        const actualizadas = await tx.$executeRaw`
          UPDATE clases SET activa = false, archivada_en = now()
          WHERE id = ${clase.id}::uuid AND archivada_en IS NULL`
        expect(actualizadas, "Precondición: el archivado retenido tomó la fila").toBe(1)
        const [{ pid } = { pid: -1 }] = await tx.$queryRaw<{ pid: number }[]>`
          SELECT pg_backend_pid() AS pid`
        const enVuelo = pedir("POST", "/api/clases/unirse", token, {
          codigo: clase.codigoInvitacion,
        }).then((r) => {
          respuesta = r
          return r
        })
        for (let intento = 0; intento < 100 && formadas === 0; intento++) {
          formadas = await formadasDetrasDe(pid)
          if (formadas === 0) await new Promise((resolver) => setTimeout(resolver, 50))
        }
        expect(respuesta, "unirse no debe responder mientras el archivado retiene la fila").toBe(
          undefined,
        )
        // El rechazo de la petición, si lo hay, se observa después de confirmar.
        void enVuelo.catch(() => undefined)
      },
      { timeout: 15_000, maxWait: 5_000 },
    )
    expect(formadas, "Precondición: unirse se formó detrás de la fila de la clase").toBeGreaterThan(
      0,
    )
    for (let intento = 0; intento < 100 && respuesta === undefined; intento++) {
      await new Promise((resolver) => setTimeout(resolver, 50))
    }
    expect(respuesta?.statusCode).toBe(404)
    expect(respuesta === undefined ? "" : codigoDeError(respuesta)).toBe("CODIGO_INVALIDO")
    expect(await contarInscripciones(clase.id)).toBe(0)
  }, 30_000)
})

describe("editar una archivada (ADM-1A13)", () => {
  it("ADM-1A13: PUT /admin/clases/:claseId sobre una archivada → 409 CLASE_ARCHIVADA sin cambiar el nombre; editarClase directo → lanza el mismo 409 sin escribir (T-01) y, con la clase inexistente, null", async () => {
    const maestro = await maestroDePrueba()
    const nombre = `Archivada ${ficha()}`
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id, nombre })
    await archivarClaseDePrueba(clase.id)
    const antes = await leerEstadoDeClase(clase.id)

    const respuesta = await pedir("PUT", `/api/admin/clases/${clase.id}`, tokenAdmin, {
      nombre: "Otro nombre",
    })
    expect(respuesta.statusCode).toBe(409)
    expect(respuesta.json()).toEqual({
      error: {
        codigo: "CLASE_ARCHIVADA",
        mensaje: "Esta clase está archivada: solo se puede consultar.",
      },
    })
    expect((await leerEstadoDeClase(clase.id)).nombre).toBe(nombre)

    const directo = await editarClase({ claseId: clase.id, nombre: "Directo" }).then(
      () => null,
      (error: unknown) => error,
    )
    expect(directo).toBeInstanceOf(AppError)
    expect((directo as AppError).codigo).toBe("CLASE_ARCHIVADA")
    expect((directo as AppError).estado).toBe(409)
    expect(await editarClase({ claseId: randomUUID(), nombre: "Inexistente" })).toBeNull()
    const despues = await leerEstadoDeClase(clase.id)
    expect(despues.nombre).toBe(nombre)
    expect(despues.actualizadoEn.getTime()).toBe(antes.actualizadoEn.getTime())
  })
})

describe("HEAD en una archivada (ADM-1A15)", () => {
  it("ADM-1A15: HEAD /clases/:claseId/publicaciones en una archivada → 409 al alumno inscrito y 200 al maestro", async () => {
    const maestro = await maestroDePrueba()
    const alumno = await estudianteDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, alumno.id)
    await archivarClaseDePrueba(clase.id)
    const url = `/api/clases/${clase.id}/publicaciones`

    expect((await pedir("HEAD", url, await tokenDe(alumno))).statusCode).toBe(409)
    expect((await pedir("HEAD", url, await tokenDe(maestro))).statusCode).toBe(200)
  })
})
