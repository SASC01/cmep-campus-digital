import { randomUUID } from "node:crypto"

import {
  agregarAlumnoRespuestaSchema,
  candidatosRespuestaSchema,
  errorApiSchema,
  listaAlumnosRespuestaSchema,
  personasRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { enmascararCorreo } from "../src/core/clases/busqueda.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  desactivarUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
  leerInscripcion,
  leerMovimientos,
} from "./ayudas-clases.js"

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const maestroDePrueba = (nombre = "Maestro de prueba"): Promise<UsuarioDePrueba> =>
  crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre })
const alumno = (
  nombre: string,
  opciones: { estadoPago?: "al_corriente" | "deudor"; accesoRestringido?: boolean } = {},
): Promise<UsuarioDePrueba> => crearAlumnoDePrueba(idsUsuarios, { nombre, ...opciones })
const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

const peticion = (opciones: {
  method: "GET" | "POST" | "DELETE"
  url: string
  token: string
  payload?: unknown
}): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method: opciones.method,
    url: opciones.url,
    payload: opciones.payload,
    headers: { authorization: `Bearer ${opciones.token}` },
  })

// Claves de todos los objetos de un JSON, en cualquier profundidad.
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

// Recorre todas las páginas de una lista hasta que ya no hay cursor siguiente.
const recorrerPaginas = async (
  urlBase: string,
  token: string,
  limite: number,
  campo: "alumnos",
): Promise<{ id: string }[]> => {
  const encontrados: { id: string }[] = []
  let cursor: string | null = null
  for (let vuelta = 0; vuelta < 20; vuelta++) {
    const sufijo: string = cursor === null ? "" : `&cursor=${cursor}`
    const respuesta = await peticion({
      method: "GET",
      url: `${urlBase}?limite=${String(limite)}${sufijo}`,
      token,
    })
    expect(respuesta.statusCode).toBe(200)
    const cuerpo = respuesta.json<{ alumnos: { id: string }[]; siguienteCursor: string | null }>()
    expect(cuerpo[campo].length).toBeLessThanOrEqual(limite)
    encontrados.push(...cuerpo[campo])
    cursor = cuerpo.siguienteCursor
    if (cursor === null) return encontrados
  }
  throw new Error("La paginación no terminó en 20 páginas")
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  // N-10: movimientos y clases antes que los usuarios (ON DELETE RESTRICT).
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("GET /api/clases/:claseId/personas", () => {
  it("PR-B02a: personas: el estudiante inscrito ve al maestro y a los alumnos activos, ordenados por nombre", async () => {
    const maestro = await maestroDePrueba("Profe Ramírez")
    const zeta = await alumno("Zeta Zorro")
    const ana = await alumno("Ana Álvarez")
    const mario = await alumno("Mario Mora")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    for (const inscrito of [zeta, ana, mario]) await inscribirDePrueba(clase.id, inscrito.id)

    const respuesta = await peticion({
      method: "GET",
      url: `/api/clases/${clase.id}/personas`,
      token: await tokenDe(mario),
    })

    expect(respuesta.statusCode).toBe(200)
    const cuerpo = personasRespuestaSchema.parse(respuesta.json())
    expect(cuerpo.maestro).toEqual({ id: maestro.id, nombre: "Profe Ramírez" })
    expect(cuerpo.alumnos.map((a) => a.id)).toEqual([ana.id, mario.id, zeta.id])
    expect(cuerpo.alumnos.map((a) => a.nombre)).toEqual(["Ana Álvarez", "Mario Mora", "Zeta Zorro"])
    expect(cuerpo.siguienteCursor).toBeNull()
  })

  it("PR-B02b: personas: una cuenta inactiva no aparece ni cuenta en el total", async () => {
    const maestro = await maestroDePrueba()
    const activa = await alumno("Activa Uno")
    const inactiva = await alumno("Inactiva Dos")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, activa.id)
    await inscribirDePrueba(clase.id, inactiva.id)
    await desactivarUsuarioDePrueba(inactiva.id)

    const respuesta = await peticion({
      method: "GET",
      url: `/api/clases/${clase.id}/personas`,
      token: await tokenDe(activa),
    })

    const cuerpo = personasRespuestaSchema.parse(respuesta.json())
    expect(cuerpo.alumnos.map((a) => a.id)).toEqual([activa.id])
    expect(cuerpo.totalAlumnos).toBe(1)
  })

  it("PR-B02c: personas: paginación con cursor y totalAlumnos", async () => {
    const maestro = await maestroDePrueba()
    const alumnos = [
      await alumno("Beto Bravo"),
      await alumno("Cora Cruz"),
      await alumno("Dani Díaz"),
    ]
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    for (const inscrito of alumnos) await inscribirDePrueba(clase.id, inscrito.id)
    const token = await tokenDe(alumnos[0] as UsuarioDePrueba)

    const primera = personasRespuestaSchema.parse(
      (
        await peticion({
          method: "GET",
          url: `/api/clases/${clase.id}/personas?limite=2`,
          token,
        })
      ).json(),
    )
    expect(primera.alumnos.map((a) => a.id)).toEqual([alumnos[0]?.id, alumnos[1]?.id])
    expect(primera.totalAlumnos).toBe(3)
    expect(primera.siguienteCursor).toBe(alumnos[1]?.id)

    const segunda = personasRespuestaSchema.parse(
      (
        await peticion({
          method: "GET",
          url: `/api/clases/${clase.id}/personas?limite=2&cursor=${String(primera.siguienteCursor)}`,
          token,
        })
      ).json(),
    )
    expect(segunda.alumnos.map((a) => a.id)).toEqual([alumnos[2]?.id])
    expect(segunda.totalAlumnos).toBe(3)
    expect(segunda.siguienteCursor).toBeNull()
  })

  it("PR-B02d: personas: dos alumnos con el mismo nombre, partidos entre dos páginas (limite=1), salen los dos, sin repetirse ni perderse", async () => {
    const maestro = await maestroDePrueba()
    const antes = await alumno("Aaron Abad")
    const gemeloUno = await alumno("Gemelo Igual")
    const gemeloDos = await alumno("Gemelo Igual")
    const despues = await alumno("Zoe Zapata")
    const todos = [antes, gemeloUno, gemeloDos, despues]
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    for (const inscrito of todos) await inscribirDePrueba(clase.id, inscrito.id)

    const encontrados = await recorrerPaginas(
      `/api/clases/${clase.id}/personas`,
      await tokenDe(antes),
      1,
      "alumnos",
    )

    const esperados = [gemeloUno, gemeloDos].map((g) => g.id).sort((a, b) => (a < b ? -1 : 1))
    expect(encontrados.map((a) => a.id)).toEqual([antes.id, ...esperados, despues.id])
  })

  it("PR-B02e: personas: el recorrido recursivo no encuentra estadoPago, accesoRestringido ni email, con un compañero deudor y otro restringido", async () => {
    const maestro = await maestroDePrueba()
    const quienPide = await alumno("Quien Pide")
    const deudor = await alumno("Compañero Deudor", { estadoPago: "deudor" })
    const restringido = await alumno("Compañero Restringido", { accesoRestringido: true })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    for (const inscrito of [quienPide, deudor, restringido]) {
      await inscribirDePrueba(clase.id, inscrito.id)
    }

    const respuesta = await peticion({
      method: "GET",
      url: `/api/clases/${clase.id}/personas`,
      token: await tokenDe(quienPide),
    })

    expect(respuesta.statusCode).toBe(200)
    expect(personasRespuestaSchema.parse(respuesta.json()).alumnos).toHaveLength(3)
    const claves = clavesDe(respuesta.json())
    for (const prohibida of ["estadoPago", "estado_pago", "accesoRestringido", "email"]) {
      expect(claves).not.toContain(prohibida)
    }
    expect(respuesta.body).not.toContain(deudor.email)
    expect(respuesta.body).not.toContain("deudor")
  })

  it("PR-B02f: personas: si se quita de la clase al alumno del cursor, la página siguiente sale completa", async () => {
    const maestro = await maestroDePrueba()
    const [a, b, c, d] = [
      await alumno("Abel Aguirre"),
      await alumno("Beatriz Bravo"),
      await alumno("Carlos Cano"),
      await alumno("Diana Dávila"),
    ] as [UsuarioDePrueba, UsuarioDePrueba, UsuarioDePrueba, UsuarioDePrueba]
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    for (const inscrito of [a, b, c, d]) await inscribirDePrueba(clase.id, inscrito.id)
    const token = await tokenDe(a)

    const primera = personasRespuestaSchema.parse(
      (
        await peticion({
          method: "GET",
          url: `/api/clases/${clase.id}/personas?limite=2`,
          token,
        })
      ).json(),
    )
    expect(primera.siguienteCursor).toBe(b.id)
    await obtenerDb().inscripcion.delete({
      where: { claseId_usuarioId: { claseId: clase.id, usuarioId: b.id } },
    })

    const segunda = await peticion({
      method: "GET",
      url: `/api/clases/${clase.id}/personas?limite=2&cursor=${b.id}`,
      token,
    })

    expect(segunda.statusCode).toBe(200)
    const cuerpo = personasRespuestaSchema.parse(segunda.json())
    expect(cuerpo.alumnos.map((x) => x.id)).toEqual([c.id, d.id])
    expect(cuerpo.siguienteCursor).toBeNull()
  })
})

describe("GET /api/clases/:claseId/alumnos (roster del dueño)", () => {
  it("PR-B03a: roster: estadoPago deudor y al_corriente correctos", async () => {
    const maestro = await maestroDePrueba()
    const alCorriente = await alumno("Al Corriente")
    const deudor = await alumno("Es Deudor", { estadoPago: "deudor" })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, alCorriente.id)
    await inscribirDePrueba(clase.id, deudor.id)

    const respuesta = await peticion({
      method: "GET",
      url: `/api/clases/${clase.id}/alumnos`,
      token: await tokenDe(maestro),
    })

    expect(respuesta.statusCode).toBe(200)
    const { alumnos, total } = listaAlumnosRespuestaSchema.parse(respuesta.json())
    expect(total).toBe(2)
    const porId = new Map(alumnos.map((a) => [a.id, a]))
    expect(porId.get(alCorriente.id)?.estadoPago).toBe("al_corriente")
    expect(porId.get(deudor.id)?.estadoPago).toBe("deudor")
  })

  it("PR-B03b: roster: accesoRestringido true para el restringido", async () => {
    const maestro = await maestroDePrueba()
    const libre = await alumno("Acceso Libre")
    const restringido = await alumno("Acceso Restringido", { accesoRestringido: true })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, libre.id)
    await inscribirDePrueba(clase.id, restringido.id)

    const respuesta = await peticion({
      method: "GET",
      url: `/api/clases/${clase.id}/alumnos`,
      token: await tokenDe(maestro),
    })

    const { alumnos } = listaAlumnosRespuestaSchema.parse(respuesta.json())
    const porId = new Map(alumnos.map((a) => [a.id, a]))
    expect(porId.get(libre.id)?.accesoRestringido).toBe(false)
    expect(porId.get(restringido.id)?.accesoRestringido).toBe(true)
  })

  it("PR-B03c: roster: origen y el correo completo correctos", async () => {
    const maestro = await maestroDePrueba()
    const porCodigo = await alumno("Entró Con Código")
    const manual = await alumno("Entró Manual")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, porCodigo.id, "codigo")
    await inscribirDePrueba(clase.id, manual.id, "manual")

    const respuesta = await peticion({
      method: "GET",
      url: `/api/clases/${clase.id}/alumnos`,
      token: await tokenDe(maestro),
    })

    const { alumnos } = listaAlumnosRespuestaSchema.parse(respuesta.json())
    const porId = new Map(alumnos.map((a) => [a.id, a]))
    expect(porId.get(porCodigo.id)).toMatchObject({ origen: "codigo", email: porCodigo.email })
    expect(porId.get(manual.id)).toMatchObject({ origen: "manual", email: manual.email })
    const inscripcion = await leerInscripcion(clase.id, manual.id)
    expect(porId.get(manual.id)?.inscritoEn).toBe(inscripcion?.creadoEn.toISOString())
  })

  it("PR-B03d: roster: dos alumnos con el mismo nombre partidos entre dos páginas", async () => {
    const maestro = await maestroDePrueba()
    const antes = await alumno("Alma Ayala")
    const gemeloUno = await alumno("Homónimo Exacto")
    const gemeloDos = await alumno("Homónimo Exacto")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    for (const inscrito of [antes, gemeloUno, gemeloDos]) {
      await inscribirDePrueba(clase.id, inscrito.id)
    }

    const encontrados = await recorrerPaginas(
      `/api/clases/${clase.id}/alumnos`,
      await tokenDe(maestro),
      2,
      "alumnos",
    )

    const gemelos = [gemeloUno.id, gemeloDos.id].sort((a, b) => (a < b ? -1 : 1))
    expect(encontrados.map((a) => a.id)).toEqual([antes.id, ...gemelos])
  })

  it("PR-B03e: roster: un cursor de un alumno desactivado después sigue sirviendo; un cursor de un usuario inexistente → 400", async () => {
    const maestro = await maestroDePrueba()
    const [a, b, c] = [
      await alumno("Ada Arce"),
      await alumno("Bruno Bello"),
      await alumno("Clara Cota"),
    ] as [UsuarioDePrueba, UsuarioDePrueba, UsuarioDePrueba]
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    for (const inscrito of [a, b, c]) await inscribirDePrueba(clase.id, inscrito.id)
    const token = await tokenDe(maestro)

    const primera = listaAlumnosRespuestaSchema.parse(
      (
        await peticion({
          method: "GET",
          url: `/api/clases/${clase.id}/alumnos?limite=1`,
          token,
        })
      ).json(),
    )
    expect(primera.siguienteCursor).toBe(a.id)
    await desactivarUsuarioDePrueba(a.id)

    const conCursorDesactivado = await peticion({
      method: "GET",
      url: `/api/clases/${clase.id}/alumnos?limite=5&cursor=${a.id}`,
      token,
    })
    expect(conCursorDesactivado.statusCode).toBe(200)
    expect(
      listaAlumnosRespuestaSchema.parse(conCursorDesactivado.json()).alumnos.map((x) => x.id),
    ).toEqual([b.id, c.id])

    const inexistente = await peticion({
      method: "GET",
      url: `/api/clases/${clase.id}/alumnos?cursor=${randomUUID()}`,
      token,
    })
    expect(inexistente.statusCode).toBe(400)
    expect(errorApiSchema.parse(inexistente.json()).error).toMatchObject({
      codigo: "VALIDACION",
      mensaje: "cursor: no es válido",
    })
  })
})

describe("GET /api/clases/:claseId/alumnos/candidatos", () => {
  const buscar = async (
    claseId: string,
    token: string,
    q: string,
    extra = "",
  ): Promise<LightMyRequestResponse> =>
    peticion({
      method: "GET",
      url: `/api/clases/${claseId}/alumnos/candidatos?q=${encodeURIComponent(q)}${extra}`,
      token,
    })

  it('PR-B04a: candidatos: "jose", "PÉREZ" y "rez" encuentran a "José Pérez"', async () => {
    const maestro = await maestroDePrueba()
    const jose = await alumno("José Pérez")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const token = await tokenDe(maestro)

    for (const termino of ["jose", "PÉREZ", "rez"]) {
      const respuesta = await buscar(clase.id, token, termino, "&limite=50")
      expect(respuesta.statusCode, termino).toBe(200)
      const { candidatos } = candidatosRespuestaSchema.parse(respuesta.json())
      expect(
        candidatos.some((c) => c.id === jose.id && c.nombre === "José Pérez"),
        termino,
      ).toBe(true)
    }
  })

  it("PR-B04b: candidatos: no devuelve maestros, al admin ni cuentas inactivas", async () => {
    const marca = `Qzx${randomUUID().slice(0, 6)}`
    const maestro = await maestroDePrueba(`${marca} Maestro`)
    const inactivo = await alumno(`${marca} Inactivo`)
    const activo = await alumno(`${marca} Activo`)
    await desactivarUsuarioDePrueba(inactivo.id)
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const token = await tokenDe(maestro)

    const respuesta = await buscar(clase.id, token, marca.toLowerCase())
    const { candidatos } = candidatosRespuestaSchema.parse(respuesta.json())
    expect(candidatos.map((c) => c.id)).toEqual([activo.id])

    const admin = await obtenerDb().usuario.findFirst({
      where: { rol: "admin" },
      select: { id: true, nombre: true },
    })
    if (admin === null) throw new Error("La base de pruebas no tiene el administrador sembrado")
    const porNombreDeAdmin = await buscar(clase.id, token, admin.nombre, "&limite=50")
    expect(porNombreDeAdmin.statusCode).toBe(200)
    expect(
      candidatosRespuestaSchema.parse(porNombreDeAdmin.json()).candidatos.map((c) => c.id),
    ).not.toContain(admin.id)
  })

  it("PR-B04c: candidatos: yaInscrito es correcto", async () => {
    const marca = `Qyc${randomUUID().slice(0, 6)}`
    const maestro = await maestroDePrueba()
    const dentro = await alumno(`${marca} Dentro`)
    const fuera = await alumno(`${marca} Fuera`)
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, dentro.id)

    const respuesta = await buscar(clase.id, await tokenDe(maestro), marca.toLowerCase())

    const { candidatos } = candidatosRespuestaSchema.parse(respuesta.json())
    const porId = new Map(candidatos.map((c) => [c.id, c]))
    expect(porId.get(dentro.id)?.yaInscrito).toBe(true)
    expect(porId.get(fuera.id)?.yaInscrito).toBe(false)
  })

  it('PR-B04d: candidatos: "%%%" y "___" no devuelven a todos los estudiantes', async () => {
    const marca = `Qpd${randomUUID().slice(0, 6)}`
    const maestro = await maestroDePrueba()
    const conPorcentaje = await alumno(`${marca} 100%`)
    const sinPorcentaje = await alumno(`${marca} 1000`)
    const conGuionBajo = await alumno(`${marca} a_b`)
    const sinGuionBajo = await alumno(`${marca} axb`)
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const token = await tokenDe(maestro)

    for (const comodines of ["%%%", "___"]) {
      const respuesta = await buscar(clase.id, token, comodines)
      expect(respuesta.statusCode, comodines).toBe(200)
      expect(candidatosRespuestaSchema.parse(respuesta.json()).candidatos, comodines).toEqual([])
    }

    const porcentaje = candidatosRespuestaSchema.parse(
      (await buscar(clase.id, token, `${marca.toLowerCase()} 100%`)).json(),
    )
    expect(porcentaje.candidatos.map((c) => c.id)).toEqual([conPorcentaje.id])
    expect(porcentaje.candidatos.map((c) => c.id)).not.toContain(sinPorcentaje.id)

    const guionBajo = candidatosRespuestaSchema.parse(
      (await buscar(clase.id, token, `${marca.toLowerCase()} a_b`)).json(),
    )
    expect(guionBajo.candidatos.map((c) => c.id)).toEqual([conGuionBajo.id])
    expect(guionBajo.candidatos.map((c) => c.id)).not.toContain(sinGuionBajo.id)
  })

  it('PR-B04e: candidatos: q de 2 → 400; "  ab  " → 400 BUSQUEDA_MUY_CORTA', async () => {
    const maestro = await maestroDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const token = await tokenDe(maestro)

    const dosCaracteres = await buscar(clase.id, token, "ab")
    expect(dosCaracteres.statusCode).toBe(400)
    expect(errorApiSchema.parse(dosCaracteres.json()).error.codigo).toBe("VALIDACION")

    const conEspacios = await buscar(clase.id, token, "  ab  ")
    expect(conEspacios.statusCode).toBe(400)
    expect(errorApiSchema.parse(conEspacios.json()).error.codigo).toBe("BUSQUEDA_MUY_CORTA")

    const sinQ = await peticion({
      method: "GET",
      url: `/api/clases/${clase.id}/alumnos/candidatos`,
      token,
    })
    expect(sinQ.statusCode).toBe(400)
  })

  it("T-20 (ronda 1): la longitud de q se mide después de normalizar: hangul (3 o más al descomponer) y 'abc' con espacios de sobra pasan; 121 normalizados o 2 en crudo y normalizados, no", async () => {
    const marca = `Qhg${randomUUID().slice(0, 6)}`
    const maestro = await maestroDePrueba()
    const coreana = await alumno(`가나 각 ${marca}`)
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const token = await tokenDe(maestro)

    for (const termino of ["각", "가나"]) {
      const respuesta = await buscar(clase.id, token, termino, "&limite=50")
      expect(respuesta.statusCode, termino).toBe(200)
      expect(
        candidatosRespuestaSchema.parse(respuesta.json()).candidatos.map((c) => c.id),
        termino,
      ).toContain(coreana.id)
    }
    const conEspacios = await buscar(clase.id, token, `${marca.toLowerCase()}${" ".repeat(118)}`)
    expect(conEspacios.statusCode).toBe(200)
    expect(candidatosRespuestaSchema.parse(conEspacios.json()).candidatos).toHaveLength(1)

    expect((await buscar(clase.id, token, "a".repeat(121))).statusCode).toBe(400)
    expect((await buscar(clase.id, token, "ab")).statusCode).toBe(400)
  })

  it("PR-B04f: candidatos: limite y hayMas", async () => {
    const marca = `Qlm${randomUUID().slice(0, 6)}`
    const maestro = await maestroDePrueba()
    for (const sufijo of ["Uno", "Dos", "Tres", "Cuatro"]) await alumno(`${marca} ${sufijo}`)
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const token = await tokenDe(maestro)

    const recortado = candidatosRespuestaSchema.parse(
      (await buscar(clase.id, token, marca.toLowerCase(), "&limite=2")).json(),
    )
    expect(recortado.candidatos).toHaveLength(2)
    expect(recortado.hayMas).toBe(true)

    const completo = candidatosRespuestaSchema.parse(
      (await buscar(clase.id, token, marca.toLowerCase(), "&limite=4")).json(),
    )
    expect(completo.candidatos).toHaveLength(4)
    expect(completo.hayMas).toBe(false)

    expect((await buscar(clase.id, token, marca.toLowerCase(), "&limite=51")).statusCode).toBe(400)
    expect((await buscar(clase.id, token, marca.toLowerCase(), "&limite=0")).statusCode).toBe(400)
  })

  it("PR-B04g: candidatos: el recorrido recursivo no encuentra estadoPago, accesoRestringido ni email", async () => {
    const marca = `Qrg${randomUUID().slice(0, 6)}`
    const maestro = await maestroDePrueba()
    await alumno(`${marca} Deudor`, { estadoPago: "deudor" })
    await alumno(`${marca} Restringido`, { accesoRestringido: true })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })

    const respuesta = await buscar(clase.id, await tokenDe(maestro), marca.toLowerCase())

    expect(candidatosRespuestaSchema.parse(respuesta.json()).candidatos).toHaveLength(2)
    const claves = clavesDe(respuesta.json())
    for (const prohibida of ["estadoPago", "estado_pago", "accesoRestringido", "email"]) {
      expect(claves).not.toContain(prohibida)
    }
  })

  it("PR-B04h: candidatos: cada correoEnmascarado es el de enmascararCorreo, y el correo completo de ningún candidato aparece en la respuesta, incluido un alumno ya inscrito", async () => {
    const marca = `Qrh${randomUUID().slice(0, 6)}`
    const maestro = await maestroDePrueba()
    const libre = await alumno(`${marca} Libre`)
    const inscrito = await alumno(`${marca} Inscrito`)
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, inscrito.id)

    const respuesta = await buscar(clase.id, await tokenDe(maestro), marca.toLowerCase())

    const { candidatos } = candidatosRespuestaSchema.parse(respuesta.json())
    expect(candidatos).toHaveLength(2)
    const correos = new Map([
      [libre.id, libre.email],
      [inscrito.id, inscrito.email],
    ])
    for (const candidato of candidatos) {
      const correo = correos.get(candidato.id)
      if (correo === undefined) throw new Error("Candidato inesperado en la respuesta")
      expect(candidato.correoEnmascarado).toBe(enmascararCorreo(correo))
      expect(candidato.correoEnmascarado).not.toBe(correo)
    }
    for (const correo of correos.values()) {
      expect(JSON.stringify(respuesta.json())).not.toContain(correo)
      expect(respuesta.body).not.toContain(correo)
    }
  })

  // Con la tabla casi vacía el planificador prefiere el índice de rol (no hay estadísticas que
  // hagan rentable el GIN), así que enable_seqscan = off solo no basta para ver el índice del
  // buscador. Dentro de la misma transacción, que se revierte siempre, se siembran filas de
  // estudiantes y se corre ANALYZE: es la forma de la tabla con datos, sin dejar nada. La
  // alternativa que gana con pocas filas es un Bitmap Index Scan sobre usuarios_rol_idx (plan leído
  // al fallar); no se puede apagar sin apagar también el bitmap scan del GIN, así que el caso se
  // hace determinista con margen: el umbral medido está entre 16,000 y 20,000 filas y se siembran
  // 40,000 (más del doble), medido en la suite completa (M-07).
  it("PR-B05: con SET LOCAL enable_seqscan = off, EXPLAIN de la consulta con la forma de Prisma menciona usuarios_nombre_busqueda_idx", async () => {
    const REVERTIR = new Error("revertir la transacción de PR-B05")
    const prefijo = randomUUID()
    let plan: unknown
    await obtenerDb()
      .$transaction(
        async (tx) => {
          await tx.$executeRaw`INSERT INTO "usuarios" ("email", "hash_contrasena", "nombre", "nombre_busqueda", "rol")
          SELECT ${prefijo} || '-' || g || '@pruebas.local', 'x', 'Explain ' || g, 'alumno ' || g, 'estudiante'
          FROM generate_series(1, 40000) AS g`
          await tx.$executeRaw`ANALYZE "usuarios"`
          await tx.$executeRaw`SET LOCAL enable_seqscan = off`
          plan =
            await tx.$queryRaw`EXPLAIN (FORMAT JSON) SELECT "id", "nombre", "email" FROM "usuarios" WHERE ("rol" = CAST(${"estudiante"}::text AS "rol_usuario") AND "activo" = ${true} AND "nombre_busqueda"::text LIKE ${"%jose%"}) ORDER BY "nombre_busqueda" ASC, "id" ASC LIMIT ${21} OFFSET ${0}`
          throw REVERTIR
        },
        { timeout: 15000, maxWait: 15000 },
      )
      .catch((error: unknown) => {
        if (error !== REVERTIR) throw error
      })

    // Si falla, el mensaje trae el plan elegido (M-07) para ver qué alternativa ganó.
    expect(JSON.stringify(plan), `plan elegido: ${JSON.stringify(plan)}`).toContain(
      "usuarios_nombre_busqueda_idx",
    )
  })
})

describe("POST y DELETE /api/clases/:claseId/alumnos", () => {
  const agregar = (claseId: string, token: string, alumnoId: string) =>
    peticion({
      method: "POST",
      url: `/api/clases/${claseId}/alumnos`,
      token,
      payload: { alumnoId },
    })
  const quitar = (claseId: string, token: string, alumnoId: string) =>
    peticion({ method: "DELETE", url: `/api/clases/${claseId}/alumnos/${alumnoId}`, token })

  it("PR-B06a: agregar → 200, yaEstaba false, origen = 'manual'", async () => {
    const maestro = await maestroDePrueba()
    const nuevo = await alumno("Alta Nueva")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })

    const respuesta = await agregar(clase.id, await tokenDe(maestro), nuevo.id)

    expect(respuesta.statusCode).toBe(200)
    expect(agregarAlumnoRespuestaSchema.parse(respuesta.json())).toEqual({
      alumno: { id: nuevo.id, nombre: "Alta Nueva" },
      yaEstaba: false,
    })
    expect((await leerInscripcion(clase.id, nuevo.id))?.origen).toBe("manual")
  })

  it("PR-B06b: agregar dos veces → 200, yaEstaba true, una sola fila", async () => {
    const maestro = await maestroDePrueba()
    const nuevo = await alumno("Alta Doble")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const token = await tokenDe(maestro)

    await agregar(clase.id, token, nuevo.id)
    const segunda = await agregar(clase.id, token, nuevo.id)

    expect(segunda.statusCode).toBe(200)
    expect(agregarAlumnoRespuestaSchema.parse(segunda.json()).yaEstaba).toBe(true)
    expect(
      await obtenerDb().inscripcion.count({
        where: { claseId: clase.id, usuarioId: nuevo.id },
      }),
    ).toBe(1)
  })

  it("PR-B06c: un maestro, el admin, una cuenta inactiva o un id inexistente como alumnoId → 404 ALUMNO_NO_ENCONTRADO sin escribir", async () => {
    const maestro = await maestroDePrueba()
    const otroMaestro = await maestroDePrueba()
    const inactivo = await alumno("Alumno Inactivo")
    await desactivarUsuarioDePrueba(inactivo.id)
    const admin = await obtenerDb().usuario.findFirst({
      where: { rol: "admin" },
      select: { id: true },
    })
    if (admin === null) throw new Error("La base de pruebas no tiene el administrador sembrado")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const token = await tokenDe(maestro)

    for (const objetivo of [otroMaestro.id, admin.id, inactivo.id, randomUUID()]) {
      const respuesta = await agregar(clase.id, token, objetivo)
      expect(respuesta.statusCode, objetivo).toBe(404)
      expect(errorApiSchema.parse(respuesta.json()).error.codigo, objetivo).toBe(
        "ALUMNO_NO_ENCONTRADO",
      )
    }
    expect(await obtenerDb().inscripcion.count({ where: { claseId: clase.id } })).toBe(0)
    expect(await leerMovimientos(clase.id)).toHaveLength(0)
  })

  it("PR-B06d: agregar a un alumno restringido → 200 (S-12)", async () => {
    const maestro = await maestroDePrueba()
    const restringido = await alumno("Alumno Restringido", { accesoRestringido: true })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })

    const respuesta = await agregar(clase.id, await tokenDe(maestro), restringido.id)

    expect(respuesta.statusCode).toBe(200)
    expect(await leerInscripcion(clase.id, restringido.id)).not.toBeNull()
  })

  it("PR-B06e: la respuesta de agregar tiene exactamente las claves alumno (id, nombre) y yaEstaba, sin estadoPago, accesoRestringido ni email en el recorrido recursivo, con un alumno deudor y restringido", async () => {
    const maestro = await maestroDePrueba()
    const sensible = await alumno("Deudor Restringido", {
      estadoPago: "deudor",
      accesoRestringido: true,
    })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })

    const respuesta = await agregar(clase.id, await tokenDe(maestro), sensible.id)

    expect(respuesta.statusCode).toBe(200)
    const cuerpo = respuesta.json<Record<string, unknown>>()
    expect(Object.keys(cuerpo).sort()).toEqual(["alumno", "yaEstaba"])
    expect(Object.keys(cuerpo.alumno as Record<string, unknown>).sort()).toEqual(["id", "nombre"])
    const claves = clavesDe(cuerpo)
    for (const prohibida of ["estadoPago", "estado_pago", "accesoRestringido", "email"]) {
      expect(claves).not.toContain(prohibida)
    }
    expect(respuesta.body).not.toContain(sensible.email)
  })

  it("PR-B07a: quitar → 204", async () => {
    const maestro = await maestroDePrueba()
    const inscrito = await alumno("Para Quitar")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, inscrito.id)

    const respuesta = await quitar(clase.id, await tokenDe(maestro), inscrito.id)

    expect(respuesta.statusCode).toBe(204)
    expect(await leerInscripcion(clase.id, inscrito.id)).toBeNull()
  })

  it("PR-B07b: quitar a quien no está inscrito → 204", async () => {
    const maestro = await maestroDePrueba()
    const ajeno = await alumno("Nunca Inscrito")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })

    const respuesta = await quitar(clase.id, await tokenDe(maestro), ajeno.id)

    expect(respuesta.statusCode).toBe(204)
    expect(respuesta.body).toBe("")
  })

  it("PR-B07c: después de quitarlo, el alumno recibe 403 en GET /clases/:claseId", async () => {
    const maestro = await maestroDePrueba()
    const inscrito = await alumno("Quitado Despues")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, inscrito.id)
    const tokenAlumno = await tokenDe(inscrito)
    const antes = await peticion({
      method: "GET",
      url: `/api/clases/${clase.id}`,
      token: tokenAlumno,
    })
    expect(antes.statusCode).toBe(200)

    await quitar(clase.id, await tokenDe(maestro), inscrito.id)
    const despues = await peticion({
      method: "GET",
      url: `/api/clases/${clase.id}`,
      token: tokenAlumno,
    })

    expect(despues.statusCode).toBe(403)
    expect(errorApiSchema.parse(despues.json()).error.codigo).toBe("SIN_ACCESO_A_LA_CLASE")
  })
})
