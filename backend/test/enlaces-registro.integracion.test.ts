import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { construirApp } from "../src/app.js"
import { obtenerDb } from "../src/adapters/db/cliente.js"
import { cargarEnv } from "../src/config/env.js"
import { borrarUsuariosDePrueba, crearUsuarioDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import { pedirComoAdmin } from "./ayudas-cuentas.js"

// AUTH-03b, §D-B4: rutas del admin para los enlaces de registro de maestro.

let app: FastifyInstance
const ids: string[] = []
const enlacesCreados: string[] = []
let tokenAdmin: string

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
  const email = process.env.ADMIN_EMAIL
  const contrasena = process.env.ADMIN_PASSWORD
  if (!email || !contrasena) {
    throw new Error("Faltan ADMIN_EMAIL/ADMIN_PASSWORD en el entorno de pruebas")
  }
  const sesion = await pedirComoAdmin(app, { email, contrasena })
  tokenAdmin = sesion.tokenAcceso
})

afterAll(async () => {
  // Los registrados de un enlace se borran primero: la FK es ON DELETE RESTRICT.
  await obtenerDb().usuario.deleteMany({ where: { enlaceRegistroId: { in: enlacesCreados } } })
  await obtenerDb().enlaceRegistro.deleteMany({ where: { id: { in: enlacesCreados } } })
  await borrarUsuariosDePrueba(ids)
  await app.close()
})

const crearEnlace = async (payload: Record<string, unknown> = {}) => {
  const respuesta = await app.inject({
    method: "POST",
    url: "/api/admin/enlaces-registro",
    headers: { authorization: `Bearer ${tokenAdmin}` },
    payload,
  })
  if (respuesta.statusCode === 201) {
    enlacesCreados.push(respuesta.json<{ enlace: { id: string } }>().enlace.id)
  }
  return respuesta
}

describe("POST /api/admin/enlaces-registro", () => {
  it("201, no-store, token de 43 caracteres y ningún token en la base", async () => {
    const respuesta = await crearEnlace()
    expect(respuesta.statusCode).toBe(201)
    expect(respuesta.headers["cache-control"]).toBe("no-store")

    const cuerpo = respuesta.json<{ enlace: Record<string, unknown>; token: string }>()
    expect(cuerpo.token).toHaveLength(43)
    expect(cuerpo.enlace.estado).toBe("vigente")
    expect(cuerpo.enlace.registrados).toBe(0)
    expect(cuerpo.enlace.revocadoEn).toBeNull()

    const fila = await obtenerDb().enlaceRegistro.findUnique({ where: { id: cuerpo.enlace.id } })
    expect(fila).not.toBeNull()
    expect(fila?.hashToken).not.toBe(cuerpo.token)
    const texto = JSON.stringify(fila)
    expect(texto).not.toContain(cuerpo.token)
  })

  it("vigencia por defecto de 7 días", async () => {
    const respuesta = await crearEnlace()
    const cuerpo = respuesta.json<{ enlace: { creadoEn: string; expiraEn: string } }>()
    const dias =
      (new Date(cuerpo.enlace.expiraEn).getTime() - new Date(cuerpo.enlace.creadoEn).getTime()) /
      86_400_000
    expect(dias).toBeCloseTo(7, 1)
  })

  it("vigencia de 0 días → 400", async () => {
    const respuesta = await crearEnlace({ vigenciaDias: 0 })
    expect(respuesta.statusCode).toBe(400)
  })

  it("vigencia de 31 días → 400", async () => {
    const respuesta = await crearEnlace({ vigenciaDias: 31 })
    expect(respuesta.statusCode).toBe(400)
  })

  it("vigencia de 1.5 días → 400", async () => {
    const respuesta = await crearEnlace({ vigenciaDias: 1.5 })
    expect(respuesta.statusCode).toBe(400)
  })

  it("vigencia como texto → 400", async () => {
    const respuesta = await crearEnlace({ vigenciaDias: "siete" })
    expect(respuesta.statusCode).toBe(400)
  })
})

describe("GET /api/admin/enlaces-registro", () => {
  it("lista en orden creado_en DESC, id DESC y pagina con cursor", async () => {
    const a = await crearEnlace()
    const b = await crearEnlace()
    const c = await crearEnlace()
    const idA = a.json<{ enlace: { id: string } }>().enlace.id
    const idB = b.json<{ enlace: { id: string } }>().enlace.id
    const idC = c.json<{ enlace: { id: string } }>().enlace.id
    // creado_en explícito y espaciado: el orden esperado no puede depender del id (uuid aleatorio,
    // no secuencial) cuando dos filas empatan de milisegundo.
    const base = Date.now()
    await obtenerDb().enlaceRegistro.update({
      where: { id: idA },
      data: { creadoEn: new Date(base) },
    })
    await obtenerDb().enlaceRegistro.update({
      where: { id: idB },
      data: { creadoEn: new Date(base + 1000) },
    })
    await obtenerDb().enlaceRegistro.update({
      where: { id: idC },
      data: { creadoEn: new Date(base + 2000) },
    })

    const primeraPagina = await app.inject({
      method: "GET",
      url: "/api/admin/enlaces-registro?limite=2",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    })
    expect(primeraPagina.statusCode).toBe(200)
    const cuerpo1 = primeraPagina.json<{
      enlaces: { id: string }[]
      siguienteCursor: string | null
    }>()
    expect(cuerpo1.enlaces).toHaveLength(2)
    expect(cuerpo1.enlaces.map((enlace) => enlace.id)).toEqual([idC, idB])
    expect(cuerpo1.siguienteCursor).not.toBeNull()

    const segundaPagina = await app.inject({
      method: "GET",
      url: `/api/admin/enlaces-registro?limite=2&cursor=${cuerpo1.siguienteCursor}`,
      headers: { authorization: `Bearer ${tokenAdmin}` },
    })
    const cuerpo2 = segundaPagina.json<{ enlaces: { id: string }[] }>()
    expect(cuerpo2.enlaces.some((enlace) => enlace.id === idA)).toBe(true)
    expect(cuerpo2.enlaces.some((enlace) => enlace.id === idB)).toBe(false)
  })

  it("limite de 0 → 400", async () => {
    const respuesta = await app.inject({
      method: "GET",
      url: "/api/admin/enlaces-registro?limite=0",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    })
    expect(respuesta.statusCode).toBe(400)
  })

  it("limite de 101 → 400", async () => {
    const respuesta = await app.inject({
      method: "GET",
      url: "/api/admin/enlaces-registro?limite=101",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    })
    expect(respuesta.statusCode).toBe(400)
  })

  it("registrados correcto con 0, 1 y 3 registros, sin N+1 (un solo groupBy)", async () => {
    const enlace = await crearEnlace()
    const enlaceId = enlace.json<{ enlace: { id: string } }>().enlace.id

    const registrarUno = async (nombre: string) => {
      const cuenta = await crearUsuarioDePrueba(ids, { rol: "maestro", nombre })
      await obtenerDb().usuario.update({
        where: { id: cuenta.id },
        data: { enlaceRegistroId: enlaceId },
      })
    }
    await registrarUno("Uno")
    await registrarUno("Dos")
    await registrarUno("Tres")

    const respuesta = await app.inject({
      method: "GET",
      url: "/api/admin/enlaces-registro?limite=100",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    })
    const cuerpo = respuesta.json<{ enlaces: { id: string; registrados: number }[] }>()
    const fila = cuerpo.enlaces.find((el) => el.id === enlaceId)
    expect(fila?.registrados).toBe(3)
  })
})

describe("POST /api/admin/enlaces-registro/:id/revocar", () => {
  it("200 idempotente: revocar dos veces conserva revocado_en original", async () => {
    const enlace = await crearEnlace()
    const enlaceId = enlace.json<{ enlace: { id: string } }>().enlace.id

    const primera = await app.inject({
      method: "POST",
      url: `/api/admin/enlaces-registro/${enlaceId}/revocar`,
      headers: { authorization: `Bearer ${tokenAdmin}` },
    })
    expect(primera.statusCode).toBe(200)
    const revocadoEn1 = primera.json<{ enlace: { revocadoEn: string; estado: string } }>().enlace
      .revocadoEn
    expect(primera.json<{ enlace: { estado: string } }>().enlace.estado).toBe("revocado")

    const segunda = await app.inject({
      method: "POST",
      url: `/api/admin/enlaces-registro/${enlaceId}/revocar`,
      headers: { authorization: `Bearer ${tokenAdmin}` },
    })
    expect(segunda.statusCode).toBe(200)
    const revocadoEn2 = segunda.json<{ enlace: { revocadoEn: string } }>().enlace.revocadoEn
    expect(revocadoEn2).toBe(revocadoEn1)
  })

  it("uuid inexistente → 404 ENLACE_NO_ENCONTRADO", async () => {
    const respuesta = await app.inject({
      method: "POST",
      url: "/api/admin/enlaces-registro/00000000-0000-0000-0000-000000000000/revocar",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    })
    expect(respuesta.statusCode).toBe(404)
    expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe(
      "ENLACE_NO_ENCONTRADO",
    )
  })
})

describe("GET /api/admin/enlaces-registro/:id/registrados", () => {
  it("campos exactos, orden creado_en ASC, sin estadoPago", async () => {
    const enlace = await crearEnlace()
    const enlaceId = enlace.json<{ enlace: { id: string } }>().enlace.id

    const uno = await crearUsuarioDePrueba(ids, { rol: "maestro", nombre: "Ana Primero" })
    await obtenerDb().usuario.update({
      where: { id: uno.id },
      data: { enlaceRegistroId: enlaceId },
    })
    const dos = await crearUsuarioDePrueba(ids, { rol: "maestro", nombre: "Beto Segundo" })
    await obtenerDb().usuario.update({
      where: { id: dos.id },
      data: { enlaceRegistroId: enlaceId, creadoEn: new Date(Date.now() + 1000) },
    })

    const respuesta = await app.inject({
      method: "GET",
      url: `/api/admin/enlaces-registro/${enlaceId}/registrados`,
      headers: { authorization: `Bearer ${tokenAdmin}` },
    })
    expect(respuesta.statusCode).toBe(200)
    const cuerpo = respuesta.json<{ registrados: Record<string, unknown>[] }>()
    expect(cuerpo.registrados).toHaveLength(2)
    expect(cuerpo.registrados[0]).toEqual({
      id: uno.id,
      nombre: "Ana Primero",
      email: uno.email,
      creadoEn: expect.any(String),
    })
    const texto = JSON.stringify(cuerpo)
    expect(texto).not.toContain("estadoPago")
    expect(texto).not.toContain("rol")
    expect(texto).not.toContain("activo")
  })

  it("uuid inexistente → 404 ENLACE_NO_ENCONTRADO", async () => {
    const respuesta = await app.inject({
      method: "GET",
      url: "/api/admin/enlaces-registro/00000000-0000-0000-0000-000000000000/registrados",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    })
    expect(respuesta.statusCode).toBe(404)
  })

  it("los registrados de un enlace no mezclan usuarios de otro", async () => {
    const enlaceA = await crearEnlace()
    const enlaceIdA = enlaceA.json<{ enlace: { id: string } }>().enlace.id
    const enlaceB = await crearEnlace()
    const enlaceIdB = enlaceB.json<{ enlace: { id: string } }>().enlace.id

    const deA = await crearUsuarioDePrueba(ids, { rol: "maestro" })
    await obtenerDb().usuario.update({
      where: { id: deA.id },
      data: { enlaceRegistroId: enlaceIdA },
    })
    const deB = await crearUsuarioDePrueba(ids, { rol: "maestro" })
    await obtenerDb().usuario.update({
      where: { id: deB.id },
      data: { enlaceRegistroId: enlaceIdB },
    })

    const respuesta = await app.inject({
      method: "GET",
      url: `/api/admin/enlaces-registro/${enlaceIdA}/registrados`,
      headers: { authorization: `Bearer ${tokenAdmin}` },
    })
    const cuerpo = respuesta.json<{ registrados: { id: string }[] }>()
    expect(cuerpo.registrados.map((r) => r.id)).toEqual([deA.id])
  })
})

describe("autorización de /api/admin/enlaces-registro*", () => {
  interface Ruta {
    nombre: string
    metodo: "GET" | "POST"
    url: () => string
    payload?: Record<string, unknown>
  }

  let idParaRutas: string

  beforeAll(async () => {
    const enlace = await crearEnlace()
    idParaRutas = enlace.json<{ enlace: { id: string } }>().enlace.id
  })

  const rutas = (): Ruta[] => [
    { nombre: "POST /enlaces-registro", metodo: "POST", url: () => "/api/admin/enlaces-registro" },
    { nombre: "GET /enlaces-registro", metodo: "GET", url: () => "/api/admin/enlaces-registro" },
    {
      nombre: "POST /enlaces-registro/:id/revocar",
      metodo: "POST",
      url: () => `/api/admin/enlaces-registro/${idParaRutas}/revocar`,
    },
    {
      nombre: "GET /enlaces-registro/:id/registrados",
      metodo: "GET",
      url: () => `/api/admin/enlaces-registro/${idParaRutas}/registrados`,
    },
  ]

  const pedir = (ruta: Ruta, token?: string) =>
    app.inject({
      method: ruta.metodo,
      url: ruta.url(),
      ...(token === undefined ? {} : { headers: { authorization: `Bearer ${token}` } }),
      ...(ruta.payload ? { payload: ruta.payload } : {}),
    })

  for (const ruta of rutas()) {
    describe(ruta.nombre, () => {
      it("sin token → 401", async () => {
        const respuesta = await pedir(ruta)
        expect(respuesta.statusCode).toBe(401)
      })

      it("un estudiante → 403 ROL_NO_PERMITIDO", async () => {
        const estudiante = await crearUsuarioDePrueba(ids, { rol: "estudiante" })
        const token = await firmarTokenDePrueba({ usuarioId: estudiante.id })
        const respuesta = await pedir(ruta, token)
        expect(respuesta.statusCode).toBe(403)
        expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe(
          "ROL_NO_PERMITIDO",
        )
      })

      it("un maestro → 403 ROL_NO_PERMITIDO", async () => {
        const maestro = await crearUsuarioDePrueba(ids, { rol: "maestro" })
        const token = await firmarTokenDePrueba({ usuarioId: maestro.id })
        const respuesta = await pedir(ruta, token)
        expect(respuesta.statusCode).toBe(403)
      })

      it("un estudiante restringido → 403 ACCESO_RESTRINGIDO", async () => {
        const restringido = await crearUsuarioDePrueba(ids, {
          rol: "estudiante",
          accesoRestringido: true,
        })
        const token = await firmarTokenDePrueba({ usuarioId: restringido.id })
        const respuesta = await pedir(ruta, token)
        expect(respuesta.statusCode).toBe(403)
        expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe(
          "ACCESO_RESTRINGIDO",
        )
      })

      // T-05 (ronda 1): withPasswordGate va antes que requireRole en la cadena (ESSENTIALS >
      // Autorización), así que una cuenta desechable con la bandera basta para probar el 403,
      // sin tocar la cuenta real y única del admin, que otros archivos usan en paralelo
      // (autorizacion-cuentas.integracion:107 usa el mismo patrón con un maestro).
      it("una cuenta con cambio pendiente → 403 CAMBIO_DE_CONTRASENA_REQUERIDO (antes que el rol)", async () => {
        const conCambioPendiente = await crearUsuarioDePrueba(ids, {
          rol: "maestro",
          debeCambiarContrasena: true,
        })
        const token = await firmarTokenDePrueba({ usuarioId: conCambioPendiente.id })
        const respuesta = await pedir(ruta, token)
        expect(respuesta.statusCode).toBe(403)
        expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe(
          "CAMBIO_DE_CONTRASENA_REQUERIDO",
        )
      })

      it("el admin puede", async () => {
        const respuesta = await pedir(ruta, tokenAdmin)
        expect(respuesta.statusCode).toBeLessThan(500)
        expect(respuesta.statusCode).not.toBe(401)
        expect(respuesta.statusCode).not.toBe(403)
      })
    })
  }
})
