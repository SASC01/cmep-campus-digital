import type { Rol } from "@campus/shared"
import type { FastifyInstance, FastifyRequest } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
} from "../../test/ayudas-auth.js"
import {
  borrarClasesDePrueba,
  crearClaseDePrueba,
  idDelAdminDePrueba,
  inscribirDePrueba,
} from "../../test/ayudas-clases.js"
import { construirApp } from "../app.js"
import { cargarEnv } from "../config/env.js"
import { esAppError } from "../core/errores.js"
import { perfilDe, protegido } from "./index.js"
import { marcaDeLaCadena } from "./guarda-de-rutas.js"

const nombresDe = (opciones?: Parameters<typeof protegido>[0]) =>
  protegido(opciones).preHandler.map((paso) => paso.name)

describe("protegido", () => {
  it("compone la cadena en el orden fijo de ESSENTIALS (cinco pasos por defecto)", () => {
    expect(nombresDe()).toEqual([
      "authenticate",
      "withProfile",
      "withPasswordGate",
      "withAccess",
      "requireRole",
    ])
    expect(nombresDe({ roles: ["admin"], permitirRestringido: true })).toEqual([
      "authenticate",
      "withProfile",
      "withPasswordGate",
      "withAccess",
      "requireRole",
    ])
  })

  it("con pertenencia añade el sexto paso al final, y solo entonces", () => {
    expect(nombresDe({ pertenencia: "inscripcion" }).at(-1)).toBe("requireMembership")
    expect(nombresDe({ pertenencia: "inscripcion" })).toHaveLength(6)
    expect(nombresDe({ pertenencia: "propiedad" }).at(-1)).toBe("requireOwnership")
    expect(nombresDe({ pertenencia: "propiedad" })).toHaveLength(6)
  })
})

describe("el sexto paso (CLASES-a)", () => {
  it("PR-A07d: el sexto paso lleva la marca requireMembership o requireOwnership", () => {
    const pasoInscripcion = protegido({ pertenencia: "inscripcion" }).preHandler.at(-1)
    const pasoPropiedad = protegido({ pertenencia: "propiedad" }).preHandler.at(-1)
    expect(marcaDeLaCadena(pasoInscripcion)).toBe("requireMembership")
    expect(marcaDeLaCadena(pasoPropiedad)).toBe("requireOwnership")
  })
})

describe("perfilDe", () => {
  it("lanza 500 PERFIL_AUSENTE cuando la petición no pasó por la cadena", () => {
    let capturado: unknown
    try {
      perfilDe({ perfil: null } as FastifyRequest)
    } catch (error) {
      capturado = error
    }
    expect(esAppError(capturado)).toBe(true)
    if (!esAppError(capturado)) return
    expect(capturado.codigo).toBe("PERFIL_AUSENTE")
    expect(capturado.estado).toBe(500)
  })
})

// PR-2A06 (Enmienda 1, M-01): el sexto paso es cerrado por defecto. El admin solo lo pasa si `roles`
// lo nombra de forma explícita al construir la cadena; protegido() nunca lanza.
describe("el admin y el sexto paso (CLASES-02a, M-01)", () => {
  let app: FastifyInstance | undefined
  const idsUsuarios: string[] = []
  const idsClases: string[] = []
  const rolesMutados: Rol[] = ["maestro"]

  const obtenerApp = (): FastifyInstance => {
    if (!app) throw new Error("La aplicación no se construyó en beforeAll")
    return app
  }

  beforeAll(async () => {
    app = await construirApp({ env: cargarEnv() })
    const ok = async () => ({ ok: true })
    // Fuera de /api, con la cadena real: la guarda onRoute revisa toda ruta igual.
    app.get(
      "/prueba/m01/sin-roles-inscripcion/:claseId",
      protegido({ pertenencia: "inscripcion" }),
      ok,
    )
    app.get("/prueba/m01/sin-roles-propiedad/:claseId", protegido({ pertenencia: "propiedad" }), ok)
    app.get(
      "/prueba/m01/admin-inscripcion/:claseId",
      protegido({ roles: ["admin"], pertenencia: "inscripcion" }),
      ok,
    )
    app.get(
      "/prueba/m01/admin-propiedad/:claseId",
      protegido({ roles: ["admin"], pertenencia: "propiedad" }),
      ok,
    )
    app.get(
      "/prueba/m01/varios-propiedad/:claseId",
      protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
      ok,
    )
    app.get(
      "/prueba/m01/sin-admin-inscripcion/:claseId",
      protegido({ roles: ["estudiante", "maestro"], pertenencia: "inscripcion" }),
      ok,
    )
    // Un arreglo mutado después de construir la cadena no abre nada.
    app.get(
      "/prueba/m01/mutado/:claseId",
      protegido({ roles: rolesMutados, pertenencia: "propiedad" }),
      ok,
    )
    rolesMutados.push("admin")
    await app.ready()
  })

  afterAll(async () => {
    await borrarClasesDePrueba(idsClases)
    await borrarUsuariosDePrueba(idsUsuarios)
    await app?.close()
  })

  const escenario = async () => {
    const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
    const estudiante = await crearUsuarioDePrueba(idsUsuarios)
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, estudiante.id, "codigo")
    return {
      claseId: clase.id,
      tokenMaestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
      tokenEstudiante: await firmarTokenDePrueba({ usuarioId: estudiante.id }),
      tokenAdmin: await firmarTokenDePrueba({ usuarioId: await idDelAdminDePrueba() }),
    }
  }

  const pedir = async (ruta: string, claseId: string, token: string) => {
    const respuesta = await obtenerApp().inject({
      method: "GET",
      url: `/prueba/m01/${ruta}/${claseId}`,
      headers: { authorization: `Bearer ${token}` },
    })
    const cuerpo = respuesta.body === "" ? null : respuesta.json<{ error?: { codigo: string } }>()
    return { estado: respuesta.statusCode, codigo: cuerpo?.error?.codigo }
  }

  it("PR-2A06: sin roles, el admin recibe 403 SIN_ACCESO_A_LA_CLASE sobre una clase que existe y el estudiante inscrito y el maestro de la clase pasan como hoy", async () => {
    const e = await escenario()

    for (const ruta of ["sin-roles-inscripcion", "sin-roles-propiedad"]) {
      expect(await pedir(ruta, e.claseId, e.tokenAdmin), ruta).toEqual({
        estado: 403,
        codigo: "SIN_ACCESO_A_LA_CLASE",
      })
      expect((await pedir(ruta, e.claseId, e.tokenMaestro)).estado, ruta).toBe(200)
    }
    expect((await pedir("sin-roles-inscripcion", e.claseId, e.tokenEstudiante)).estado).toBe(200)
    expect(await pedir("sin-roles-propiedad", e.claseId, e.tokenEstudiante)).toEqual({
      estado: 403,
      codigo: "SIN_ACCESO_A_LA_CLASE",
    })
  })

  it("PR-2A06: con roles que nombran a admin (solo o entre otros), el admin pasa con 200; con roles sin admin, 403 ROL_NO_PERMITIDO en el paso 5", async () => {
    const e = await escenario()

    for (const ruta of ["admin-inscripcion", "admin-propiedad", "varios-propiedad"]) {
      expect((await pedir(ruta, e.claseId, e.tokenAdmin)).estado, ruta).toBe(200)
    }
    expect(await pedir("sin-admin-inscripcion", e.claseId, e.tokenAdmin)).toEqual({
      estado: 403,
      codigo: "ROL_NO_PERMITIDO",
    })
    // Con roles solo de admin, el paso 5 deja fuera al maestro.
    expect(await pedir("admin-propiedad", e.claseId, e.tokenMaestro)).toEqual({
      estado: 403,
      codigo: "ROL_NO_PERMITIDO",
    })
  })

  it("PR-2A06: una clase inexistente da 403 SIN_ACCESO_A_LA_CLASE también al admin, y un arreglo de roles mutado después de construir la cadena no abre el sexto paso al admin", async () => {
    const e = await escenario()

    expect(
      await pedir("admin-propiedad", "00000000-0000-4000-8000-000000000000", e.tokenAdmin),
    ).toEqual({ estado: 403, codigo: "SIN_ACCESO_A_LA_CLASE" })
    expect(rolesMutados).toContain("admin")
    expect((await pedir("mutado", e.claseId, e.tokenAdmin)).codigo).toBe("SIN_ACCESO_A_LA_CLASE")
    expect((await pedir("mutado", e.claseId, e.tokenMaestro)).estado).toBe(200)
  })

  it("PR-2A06: protegido() no lanza con pertenencia y roles ausentes, vacíos o congelados, y la cadena sigue con seis pasos en orden", () => {
    const variantes: (readonly Rol[] | undefined)[] = [
      undefined,
      [],
      Object.freeze(["admin"] as Rol[]),
    ]
    for (const roles of variantes) {
      for (const pertenencia of ["inscripcion", "propiedad"] as const) {
        const nombres = protegido({
          ...(roles === undefined ? {} : { roles }),
          pertenencia,
        }).preHandler.map((paso) => paso.name)
        expect(nombres).toHaveLength(6)
        expect(nombres.slice(0, 5)).toEqual([
          "authenticate",
          "withProfile",
          "withPasswordGate",
          "withAccess",
          "requireRole",
        ])
        expect(nombres[5]).toBe(
          pertenencia === "inscripcion" ? "requireMembership" : "requireOwnership",
        )
      }
    }
  })
})
