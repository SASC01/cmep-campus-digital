import { randomBytes, randomUUID } from "node:crypto"

import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { asignarMaestro, retirarMaestro } from "../src/adapters/db/index.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { normalizarParaBusqueda } from "../src/core/auth/normalizacion.js"
import { AppError } from "../src/core/errores.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearClaseDePrueba,
  crearPublicacionDePrueba,
  idDelAdminDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"

// Ataque del Tester (CLASES-02a, ronda 2): la corrección general de T-01 (validarCuerpo rechaza
// arreglos) en sus hermanos: las 21 llamadas a validarCuerpo de handlers/ (gestión, alumnos,
// unirse, muro, archivos, auth y admin), con cuerpos que son arreglo, arreglo anidado, [{}],
// arreglo vacío y un arreglo con un objeto válido adentro: 400 VALIDACION en español, nunca 5xx ni
// inglés, y nada se escribe; y un objeto válido sigue pasando. Además, lo pendiente de la ronda 1:
// la clase que desaparece entre el sexto paso y la transacción de asignar o retirar (§D-2A4, paso 1)
// con el adaptador llamado directamente.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
let tokenAdmin = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const ficha = (): string => `qz${randomBytes(5).toString("hex")}`

const crearCuenta = async (
  nombre: string,
  rol: "estudiante" | "maestro" = "estudiante",
  debeCambiarContrasena = false,
): Promise<{ id: string; email: string; token: string }> => {
  const email = `b02a-r2-${randomUUID()}@pruebas.local`
  const { id } = await obtenerDb().usuario.create({
    data: {
      email,
      hashContrasena: "sin-uso-en-esta-prueba",
      nombre,
      nombreBusqueda: normalizarParaBusqueda(nombre),
      rol,
      debeCambiarContrasena,
    },
    select: { id: true },
  })
  idsUsuarios.push(id)
  return { id, email, token: await firmarTokenDePrueba({ usuarioId: id }) }
}

const pedirCrudo = (
  method: "POST" | "PUT",
  url: string,
  token: string | undefined,
  crudo: string,
): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method,
    url,
    payload: crudo,
    headers: {
      "content-type": "application/json",
      ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
    },
  })

const errorDe = (r: LightMyRequestResponse): { codigo: string; mensaje: string } => {
  try {
    const cuerpo = JSON.parse(r.body) as { error?: { codigo?: string; mensaje?: string } }
    return { codigo: cuerpo.error?.codigo ?? "", mensaje: cuerpo.error?.mensaje ?? "" }
  } catch {
    return { codigo: "", mensaje: "" }
  }
}

const EN_INGLES = /Invalid|expected|received|Required|discriminator|Unrecognized|must be/

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
  tokenAdmin = await firmarTokenDePrueba({ usuarioId: await idDelAdminDePrueba() })
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("ataque CLASES-02a r2: T-01 en sus hermanos (las 21 llamadas a validarCuerpo)", () => {
  it('[], [[]], [{}], ["x"] y un arreglo con el objeto válido adentro: 400 VALIDACION en español en las 21 rutas, nunca 5xx, y nada se escribe', async () => {
    const t = ficha()
    const maestro = await crearCuenta(`Maestro ${t}`, "maestro")
    const otro = await crearCuenta(`Otro ${t}`, "maestro")
    const alumno = await crearCuenta(`Alumno ${t}`)
    const objetivo = await crearCuenta(`Objetivo ${t}`)
    // cambiar-contrasena responde 409 CAMBIO_NO_REQUERIDO antes de validar si no hay cambio
    // pendiente (middleware/README.md): la cuenta lo tiene, para llegar a validarCuerpo.
    const conCambio = await crearCuenta(`Cambio ${t}`, "estudiante", true)
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id, nombre: `C ${t}` })
    await inscribirDePrueba(clase.id, alumno.id)
    const publicacionId = await crearPublicacionDePrueba({ claseId: clase.id, autorId: maestro.id })
    const correoNuevo = `b02a-r2-nuevo-${randomUUID()}@pruebas.local`
    const base = `/api/clases/${clase.id}`

    // [método, ruta, token, objeto válido que se mete dentro del arreglo]
    const rutas: ["POST" | "PUT", string, string | undefined, Record<string, unknown>][] = [
      ["POST", "/api/admin/clases", tokenAdmin, { nombre: `Nueva ${t}`, maestroIds: [maestro.id] }],
      ["PUT", `/api/admin/clases/${clase.id}`, tokenAdmin, { nombre: `Robada ${t}` }],
      ["POST", `/api/admin/clases/${clase.id}/maestros`, tokenAdmin, { maestroId: otro.id }],
      ["POST", `${base}/alumnos`, maestro.token, { alumnoId: objetivo.id }],
      ["POST", `${base}/alumnos`, tokenAdmin, { alumnoId: objetivo.id }],
      ["POST", "/api/clases/unirse", objetivo.token, { codigo: clase.codigoInvitacion }],
      ["POST", `${base}/publicaciones`, maestro.token, { tipo: "anuncio", texto: `Arreglo ${t}` }],
      [
        "POST",
        `${base}/publicaciones/${publicacionId}/comentarios`,
        alumno.token,
        { texto: `Arreglo ${t}` },
      ],
      [
        "POST",
        `${base}/archivos`,
        maestro.token,
        { nombre: "a.pdf", tipo: "application/pdf", tamano: 10 },
      ],
      [
        "POST",
        "/api/auth/registro",
        undefined,
        { nombre: `R ${t}`, email: correoNuevo, contrasena: "clave-larga-1234" },
      ],
      ["POST", "/api/auth/login", undefined, { email: maestro.email, contrasena: "x" }],
      ["POST", "/api/auth/recuperar", undefined, { email: maestro.email }],
      [
        "POST",
        "/api/auth/restablecer",
        undefined,
        { token: "x".repeat(43), contrasena: "clave-larga-1234" },
      ],
      ["POST", "/api/auth/invitacion", undefined, { token: "x".repeat(43) }],
      [
        "POST",
        "/api/auth/establecer-contrasena",
        undefined,
        { token: "x".repeat(43), contrasena: "clave-larga-1234" },
      ],
      [
        "POST",
        "/api/auth/cambiar-contrasena",
        conCambio.token,
        { contrasenaActual: "x", contrasenaNueva: "clave-larga-1234" },
      ],
      [
        "POST",
        "/api/auth/registro-maestro",
        undefined,
        { token: "x".repeat(43), nombre: "M", email: correoNuevo, contrasena: "clave-larga-1234" },
      ],
      ["POST", "/api/admin/maestros", tokenAdmin, { nombre: `Inv ${t}`, email: correoNuevo }],
      [
        "POST",
        "/api/admin/maestros/lote",
        tokenAdmin,
        { maestros: [{ nombre: `Inv ${t}`, email: correoNuevo }] },
      ],
      ["POST", "/api/admin/usuarios/buscar", tokenAdmin, { email: alumno.email }],
      ["PUT", `/api/admin/usuarios/${objetivo.id}/correo`, tokenAdmin, { email: correoNuevo }],
      ["POST", "/api/admin/enlaces-registro", tokenAdmin, { etiqueta: `Enlace ${t}` }],
    ]

    const fallas: string[] = []
    for (const [metodo, url, token, valido] of rutas) {
      const cuerpos = [
        "[]",
        "[[]]",
        "[{}]",
        '["x"]',
        JSON.stringify([valido]),
        JSON.stringify([valido, valido]),
      ]
      for (const crudo of cuerpos) {
        const r = await pedirCrudo(metodo, url, token, crudo)
        const { codigo, mensaje } = errorDe(r)
        const etiqueta = `${metodo} ${url.replace(/[0-9a-f-]{36}/g, ":id")} ${crudo.slice(0, 40)}`
        if (r.statusCode !== 400 || codigo !== "VALIDACION")
          fallas.push(`${etiqueta}: ${r.statusCode} ${r.body.slice(0, 140)}`)
        else if (EN_INGLES.test(mensaje)) fallas.push(`${etiqueta}: «${mensaje}»`)
        if (mensaje.includes(correoNuevo) || mensaje.includes(maestro.email))
          fallas.push(`${etiqueta}: el mensaje repite el valor recibido`)
      }
    }
    expect(fallas).toEqual([])

    // Nada se escribió.
    expect(await obtenerDb().clase.count({ where: { nombre: `Nueva ${t}` } })).toBe(0)
    expect((await obtenerDb().clase.findUnique({ where: { id: clase.id } }))?.nombre).toBe(`C ${t}`)
    expect(await obtenerDb().maestroDeClase.count({ where: { claseId: clase.id } })).toBe(1)
    expect(await obtenerDb().inscripcion.count({ where: { claseId: clase.id } })).toBe(1)
    expect(await obtenerDb().publicacion.count({ where: { claseId: clase.id } })).toBe(1)
    expect(await obtenerDb().comentario.count({ where: { publicacionId } })).toBe(0)
    expect(await obtenerDb().archivo.count({ where: { claseId: clase.id } })).toBe(0)
    expect(await obtenerDb().usuario.count({ where: { email: correoNuevo } })).toBe(0)
    expect((await obtenerDb().usuario.findUnique({ where: { id: objetivo.id } }))?.email).toBe(
      objetivo.email,
    )
  })

  it("un objeto válido sigue pasando en las rutas de clases (asignar, alta, unirse, publicar, comentar, editar)", async () => {
    const t = ficha()
    const maestro = await crearCuenta(`Maestro ${t}`, "maestro")
    const otro = await crearCuenta(`Otro ${t}`, "maestro")
    const alumno = await crearCuenta(`Alumno ${t}`)
    const objetivo = await crearCuenta(`Objetivo ${t}`)
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, alumno.id)
    const publicacionId = await crearPublicacionDePrueba({ claseId: clase.id, autorId: maestro.id })
    const base = `/api/clases/${clase.id}`
    const casos: [string, "POST" | "PUT", string, string, Record<string, unknown>, number][] = [
      [
        "asignar",
        "POST",
        `/api/admin/clases/${clase.id}/maestros`,
        tokenAdmin,
        { maestroId: otro.id },
        200,
      ],
      [
        "editar",
        "PUT",
        `/api/admin/clases/${clase.id}`,
        tokenAdmin,
        { nombre: `Editada ${t}` },
        200,
      ],
      ["alta", "POST", `${base}/alumnos`, tokenAdmin, { alumnoId: objetivo.id }, 200],
      [
        "unirse",
        "POST",
        "/api/clases/unirse",
        (await crearCuenta(`Nuevo ${t}`)).token,
        { codigo: clase.codigoInvitacion },
        200,
      ],
      [
        "publicar",
        "POST",
        `${base}/publicaciones`,
        maestro.token,
        { tipo: "anuncio", texto: "Hola" },
        201,
      ],
      [
        "comentar",
        "POST",
        `${base}/publicaciones/${publicacionId}/comentarios`,
        alumno.token,
        { texto: "Hola" },
        201,
      ],
    ]
    const fallas: string[] = []
    for (const [nombre, metodo, url, token, valido, estado] of casos) {
      const r = await pedirCrudo(metodo, url, token, JSON.stringify(valido))
      if (r.statusCode !== estado) fallas.push(`${nombre}: ${r.statusCode} ${r.body.slice(0, 140)}`)
    }
    expect(fallas).toEqual([])
    expect(await obtenerDb().maestroDeClase.count({ where: { claseId: clase.id } })).toBe(2)
  })
})

describe("ataque CLASES-02a r2: la clase que ya no existe dentro de la transacción (§D-2A4, paso 1)", () => {
  it("asignarMaestro y retirarMaestro sobre una clase inexistente lanzan 403 SIN_ACCESO_A_LA_CLASE y no escriben", async () => {
    const t = ficha()
    const maestro = await crearCuenta(`Maestro ${t}`, "maestro")
    const fantasma = randomUUID()
    for (const operacion of [
      () => asignarMaestro({ claseId: fantasma, maestroId: maestro.id }),
      () => retirarMaestro({ claseId: fantasma, maestroId: maestro.id }),
    ]) {
      const error = await operacion().then(
        () => null,
        (e: unknown) => e,
      )
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).codigo).toBe("SIN_ACCESO_A_LA_CLASE")
      expect((error as AppError).estado).toBe(403)
    }
    expect(await obtenerDb().maestroDeClase.count({ where: { maestroId: maestro.id } })).toBe(0)
  })
})
