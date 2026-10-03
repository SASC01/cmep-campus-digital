import { randomBytes, randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { normalizarParaBusqueda } from "../src/core/auth/normalizacion.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
  leerInscripcion,
  leerMovimientos,
} from "./ayudas-clases.js"

// Ataque del Tester (CLASES-b, ronda 1): autorización con los cinco tokens (dueño, maestro ajeno,
// estudiante inscrito, restringido inscrito y admin) más un estudiante no inscrito, fugas de estado
// de pago, restricción y correo completo, enmascarado por la API, buscador, paginación por claves,
// registro de movimientos con concurrencia y regresión de CLASES-a sobre las rutas de b.
// Plan de CLASES-01: "Puntos de ataque para el Tester → CLASES-b", "Autorización", §D-B1 a §D-B3 bis,
// S-09 a S-12, S-22 y S-23. Cuentas creadas directamente (sin argon2: solo se usa el token firmado),
// con correos y nombres únicos de esta corrida; limpieza en el orden de N-10.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

// Ficha única de esta corrida: separa los nombres de este archivo de los demás en la base compartida.
const ficha = (): string => `qz${randomBytes(5).toString("hex")}`

interface Cuenta {
  id: string
  email: string
  nombre: string
  token: string
}

interface OpcionesCuenta {
  nombre: string
  email?: string
  rol?: "estudiante" | "maestro"
  estadoPago?: "al_corriente" | "deudor"
  accesoRestringido?: boolean
  activo?: boolean
}

const crearCuenta = async ({
  nombre,
  email = `b-r1-${randomUUID()}@pruebas.local`,
  rol = "estudiante",
  estadoPago = "al_corriente",
  accesoRestringido = false,
  activo = true,
}: OpcionesCuenta): Promise<Cuenta> => {
  const { id } = await obtenerDb().usuario.create({
    data: {
      email,
      hashContrasena: "sin-uso-en-esta-prueba",
      nombre,
      nombreBusqueda: normalizarParaBusqueda(nombre),
      rol,
      estadoPago,
      accesoRestringido,
      activo,
    },
    select: { id: true },
  })
  idsUsuarios.push(id)
  return { id, email, nombre, token: await firmarTokenDePrueba({ usuarioId: id }) }
}

type Metodo = "GET" | "HEAD" | "POST" | "DELETE"

const pedir = (
  method: Metodo,
  url: string,
  token: string | undefined,
  payload?: unknown,
): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method,
    url,
    ...(payload === undefined ? {} : { payload: payload as Record<string, unknown> }),
    headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
  })

const codigoDe = (respuesta: LightMyRequestResponse): string | undefined => {
  if (respuesta.body === "") return undefined
  try {
    const cuerpo = JSON.parse(respuesta.body) as { error?: { codigo?: string } }
    return cuerpo.error?.codigo
  } catch {
    return undefined
  }
}

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

const candidatosDe = (respuesta: LightMyRequestResponse) =>
  respuesta.json<{
    candidatos: { id: string; nombre: string; correoEnmascarado: string; yaInscrito: boolean }[]
    hayMas: boolean
  }>()

const buscar = (claseId: string, token: string, q: string, limite?: string) =>
  pedir(
    "GET",
    `/api/clases/${claseId}/alumnos/candidatos?${new URLSearchParams({
      q,
      ...(limite === undefined ? {} : { limite }),
    }).toString()}`,
    token,
  )

let idAdmin = ""
let tokenAdmin = ""

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
  const admin = await obtenerDb().usuario.findFirst({
    where: { rol: "admin" },
    select: { id: true, debeCambiarContrasena: true, activo: true },
  })
  if (admin === null) throw new Error("No existe el administrador que crea test/global-setup.ts")
  if (admin.debeCambiarContrasena || !admin.activo) {
    throw new Error("El administrador de la corrida no está en condiciones de usarse como token")
  }
  idAdmin = admin.id
  tokenAdmin = await firmarTokenDePrueba({ usuarioId: admin.id })
})

afterAll(async () => {
  // N-10: movimientos y clases antes que los usuarios (ON DELETE RESTRICT).
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("ataque CLASES-b r1: autorización con los cinco tokens en las 8 rutas de b", () => {
  it("cada ruta y método responde exactamente lo de la tabla de autorización, y lo negado no escribe nada", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const ajeno = await crearCuenta({ nombre: `Ajeno ${t}`, rol: "maestro" })
    const inscrito = await crearCuenta({ nombre: `Inscrito ${t}` })
    const restringido = await crearCuenta({
      nombre: `Restringido ${t}`,
      accesoRestringido: true,
      estadoPago: "deudor",
    })
    const noInscrito = await crearCuenta({ nombre: `Fuera ${t}` })
    const objetivo = await crearCuenta({ nombre: `Objetivo ${t}` })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    await crearClaseDePrueba(idsClases, { maestroId: ajeno.id })
    await inscribirDePrueba(clase.id, inscrito.id, "codigo")
    await inscribirDePrueba(clase.id, restringido.id, "codigo")

    const base = `/api/clases/${clase.id}`
    const rutas: {
      nombre: string
      metodo: Metodo
      url: string
      payload?: unknown
      soloDueno: boolean
      okDueno: number
    }[] = [
      {
        nombre: "personas",
        metodo: "GET",
        url: `${base}/personas`,
        soloDueno: false,
        okDueno: 200,
      },
      {
        nombre: "personas HEAD",
        metodo: "HEAD",
        url: `${base}/personas`,
        soloDueno: false,
        okDueno: 200,
      },
      { nombre: "roster", metodo: "GET", url: `${base}/alumnos`, soloDueno: true, okDueno: 200 },
      {
        nombre: "roster HEAD",
        metodo: "HEAD",
        url: `${base}/alumnos`,
        soloDueno: true,
        okDueno: 200,
      },
      {
        nombre: "candidatos",
        metodo: "GET",
        url: `${base}/alumnos/candidatos?q=${t}`,
        soloDueno: true,
        okDueno: 200,
      },
      {
        nombre: "candidatos HEAD",
        metodo: "HEAD",
        url: `${base}/alumnos/candidatos?q=${t}`,
        soloDueno: true,
        okDueno: 200,
      },
      {
        nombre: "agregar",
        metodo: "POST",
        url: `${base}/alumnos`,
        payload: { alumnoId: objetivo.id },
        soloDueno: true,
        okDueno: 200,
      },
      {
        nombre: "quitar",
        metodo: "DELETE",
        url: `${base}/alumnos/${inscrito.id}`,
        soloDueno: true,
        okDueno: 204,
      },
    ]

    // CLASES-02a ronda 0 (C-3, matriz de "Autorización"): el admin pasa el sexto paso en el roster,
    // el buscador, el alta y la baja (soloDueno), y sigue en 403 ROL_NO_PERMITIDO en "personas". Sus
    // lecturas se comprueban en el recorrido de abajo; su alta y su baja escriben, así que se
    // prueban aparte, después del dueño, para que "lo negado no escribe nada" siga valiendo.
    const esperado = (
      ruta: (typeof rutas)[number],
      quien: "ajeno" | "inscrito" | "restringido" | "admin" | "noInscrito" | "sinToken",
    ): [number, string] => {
      if (quien === "sinToken") return [401, "NO_AUTENTICADO"]
      if (quien === "restringido") return [403, "ACCESO_RESTRINGIDO"]
      if (quien === "admin") return ruta.soloDueno ? [ruta.okDueno, ""] : [403, "ROL_NO_PERMITIDO"]
      if (quien === "ajeno") return [403, "SIN_ACCESO_A_LA_CLASE"]
      // requireRole va antes que la pertenencia: un estudiante no inscrito en una ruta del dueño es
      // ROL_NO_PERMITIDO, igual que el inscrito.
      if (quien === "noInscrito") {
        return ruta.soloDueno ? [403, "ROL_NO_PERMITIDO"] : [403, "SIN_ACCESO_A_LA_CLASE"]
      }
      if (ruta.soloDueno) return [403, "ROL_NO_PERMITIDO"]
      return [200, ""]
    }

    const tokens: [
      "ajeno" | "inscrito" | "restringido" | "admin" | "noInscrito" | "sinToken",
      string | undefined,
    ][] = [
      ["sinToken", undefined],
      ["ajeno", ajeno.token],
      ["inscrito", inscrito.token],
      ["restringido", restringido.token],
      ["admin", tokenAdmin],
      ["noInscrito", noInscrito.token],
    ]

    const escribe = (ruta: (typeof rutas)[number]): boolean =>
      ruta.metodo === "POST" || ruta.metodo === "DELETE"
    const discrepancias: string[] = []
    for (const ruta of rutas) {
      for (const [quien, token] of tokens) {
        if (quien === "admin" && escribe(ruta)) continue
        const respuesta = await pedir(ruta.metodo, ruta.url, token, ruta.payload)
        const [estado, codigo] = esperado(ruta, quien)
        const codigoObtenido = ruta.metodo === "HEAD" ? codigo : (codigoDe(respuesta) ?? "")
        if (respuesta.statusCode !== estado || codigoObtenido !== codigo) {
          discrepancias.push(
            `${ruta.nombre} con ${quien}: esperado ${String(estado)} ${codigo}, obtenido ${String(respuesta.statusCode)} ${codigoObtenido}`,
          )
        }
      }
    }
    expect(discrepancias).toEqual([])

    // Nada de lo negado escribió: el inscrito sigue inscrito, el objetivo no entró, sin movimientos.
    expect(await leerInscripcion(clase.id, inscrito.id)).not.toBeNull()
    expect(await leerInscripcion(clase.id, objetivo.id)).toBeNull()
    expect(await leerMovimientos(clase.id)).toEqual([])

    // Y el dueño sí puede todo (en este orden: agregar y después quitar).
    const resultados: string[] = []
    for (const ruta of rutas) {
      const respuesta = await pedir(ruta.metodo, ruta.url, dueno.token, ruta.payload)
      if (respuesta.statusCode !== ruta.okDueno) {
        resultados.push(`${ruta.nombre}: ${String(respuesta.statusCode)} ${respuesta.body}`)
      }
    }
    expect(resultados).toEqual([])
    expect(await leerInscripcion(clase.id, objetivo.id)).not.toBeNull()
    expect(await leerInscripcion(clase.id, inscrito.id)).toBeNull()
    expect((await leerMovimientos(clase.id)).map((fila) => fila.tipo)).toEqual(["alta", "baja"])

    // CLASES-02a ronda 0 (C-3 y C-6): el admin agrega y quita en la clase (P-08 a: el movimiento
    // lleva su id en actorId), con los mismos códigos que el dueño.
    const altaAdmin = await pedir("POST", `${base}/alumnos`, tokenAdmin, {
      alumnoId: noInscrito.id,
    })
    expect(altaAdmin.statusCode, altaAdmin.body).toBe(200)
    const bajaAdmin = await pedir("DELETE", `${base}/alumnos/${objetivo.id}`, tokenAdmin)
    expect(bajaAdmin.statusCode, bajaAdmin.body).toBe(204)
    expect(await leerInscripcion(clase.id, noInscrito.id)).not.toBeNull()
    expect(await leerInscripcion(clase.id, objetivo.id)).toBeNull()
    expect(
      (await leerMovimientos(clase.id)).map((fila) => [fila.tipo, fila.actorId, fila.alumnoId]),
    ).toEqual([
      ["alta", dueno.id, objetivo.id],
      ["baja", dueno.id, inscrito.id],
      ["alta", idAdmin, noInscrito.id],
      ["baja", idAdmin, objetivo.id],
    ])
  })

  it("un maestro dueño de una clase no puede actuar en otra con su claseId; un claseId inexistente o malformado no escribe ni da 500", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const ajeno = await crearCuenta({ nombre: `Ajeno ${t}`, rol: "maestro" })
    const alumno = await crearCuenta({ nombre: `Alumno ${t}` })
    await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const deOtro = await crearClaseDePrueba(idsClases, { maestroId: ajeno.id })
    await inscribirDePrueba(deOtro.id, alumno.id)

    const inexistente = randomUUID()
    const casos: [Metodo, string, unknown][] = [
      ["POST", `/api/clases/${deOtro.id}/alumnos`, { alumnoId: alumno.id }],
      ["DELETE", `/api/clases/${deOtro.id}/alumnos/${alumno.id}`, undefined],
      ["POST", `/api/clases/${inexistente}/alumnos`, { alumnoId: alumno.id }],
      ["DELETE", `/api/clases/${inexistente}/alumnos/${alumno.id}`, undefined],
      ["GET", `/api/clases/${inexistente}/personas`, undefined],
      ["GET", `/api/clases/no-es-uuid/alumnos`, undefined],
      ["DELETE", `/api/clases/no-es-uuid/alumnos/${alumno.id}`, undefined],
      ["GET", `/api/clases/${deOtro.id.toUpperCase()}/alumnos`, undefined],
    ]
    const resultados: string[] = []
    for (const [metodo, url, payload] of casos) {
      const respuesta = await pedir(metodo, url, dueno.token, payload)
      resultados.push(
        `${metodo} ${url.replace(/[0-9a-f-]{36}/gi, "<id>")}: ${String(respuesta.statusCode)} ${codigoDe(respuesta) ?? ""}`,
      )
    }
    expect(resultados).toEqual([
      "POST /api/clases/<id>/alumnos: 403 SIN_ACCESO_A_LA_CLASE",
      "DELETE /api/clases/<id>/alumnos/<id>: 403 SIN_ACCESO_A_LA_CLASE",
      "POST /api/clases/<id>/alumnos: 403 SIN_ACCESO_A_LA_CLASE",
      "DELETE /api/clases/<id>/alumnos/<id>: 403 SIN_ACCESO_A_LA_CLASE",
      "GET /api/clases/<id>/personas: 403 SIN_ACCESO_A_LA_CLASE",
      "GET /api/clases/no-es-uuid/alumnos: 400 VALIDACION",
      "DELETE /api/clases/no-es-uuid/alumnos/<id>: 400 VALIDACION",
      "GET /api/clases/<id>/alumnos: 403 SIN_ACCESO_A_LA_CLASE",
    ])
    expect(await leerInscripcion(deOtro.id, alumno.id)).not.toBeNull()
    expect(await leerMovimientos(deOtro.id)).toEqual([])
  })

  it("rutas vecinas: GET …/alumnos/<uuid> no existe, DELETE …/alumnos/candidatos es 400 y el cuerpo de agregar no acepta otra forma", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const alumno = await crearCuenta({ nombre: `Alumno ${t}` })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const base = `/api/clases/${clase.id}/alumnos`

    const resultados: string[] = []
    const anotar = (nombre: string, respuesta: LightMyRequestResponse) =>
      resultados.push(`${nombre}: ${String(respuesta.statusCode)} ${codigoDe(respuesta) ?? ""}`)

    const vecina = await pedir("GET", `${base}/${alumno.id}`, dueno.token)
    expect(vecina.statusCode).toBe(404)
    expect(vecina.body).not.toContain(alumno.email)
    anotar("DELETE /alumnos/candidatos", await pedir("DELETE", `${base}/candidatos`, dueno.token))
    anotar("POST sin cuerpo", await pedir("POST", base, dueno.token))
    anotar("POST arreglo", await pedir("POST", base, dueno.token, [{ alumnoId: alumno.id }]))
    anotar("POST alumnoId null", await pedir("POST", base, dueno.token, { alumnoId: null }))
    anotar("POST alumnoId número", await pedir("POST", base, dueno.token, { alumnoId: 7 }))
    anotar("POST alumnoId vacío", await pedir("POST", base, dueno.token, { alumnoId: "" }))
    anotar(
      "POST alumnoId con espacios",
      await pedir("POST", base, dueno.token, { alumnoId: ` ${alumno.id} ` }),
    )
    anotar(
      "POST con claseId de otra clase en el cuerpo",
      await pedir("POST", base, dueno.token, { alumnoId: randomUUID(), claseId: randomUUID() }),
    )
    anotar("POST id del admin", await pedir("POST", base, dueno.token, { alumnoId: idAdmin }))
    anotar("POST su propio id", await pedir("POST", base, dueno.token, { alumnoId: dueno.id }))

    expect(resultados).toEqual([
      "DELETE /alumnos/candidatos: 400 VALIDACION",
      "POST sin cuerpo: 400 VALIDACION",
      "POST arreglo: 400 VALIDACION",
      "POST alumnoId null: 400 VALIDACION",
      "POST alumnoId número: 400 VALIDACION",
      "POST alumnoId vacío: 400 VALIDACION",
      "POST alumnoId con espacios: 400 VALIDACION",
      "POST con claseId de otra clase en el cuerpo: 404 ALUMNO_NO_ENCONTRADO",
      "POST id del admin: 404 ALUMNO_NO_ENCONTRADO",
      "POST su propio id: 404 ALUMNO_NO_ENCONTRADO",
    ])
    expect(await obtenerDb().inscripcion.count({ where: { claseId: clase.id } })).toBe(0)
    expect(await leerMovimientos(clase.id)).toEqual([])
  })
})

describe("ataque CLASES-b r1: estado de pago, restricción y correo completo fuera del roster", () => {
  it("un estudiante inscrito ve al compañero restringido y deudor en personas, sin estado de pago, restricción ni correo en ninguna profundidad; el dueño los ve en el roster", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const yo = await crearCuenta({ nombre: `Yo ${t}` })
    const restringido = await crearCuenta({
      nombre: `Rosa ${t}`,
      accesoRestringido: true,
      estadoPago: "deudor",
    })
    const deudor = await crearCuenta({ nombre: `Diego ${t}`, estadoPago: "deudor" })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    for (const cuenta of [yo, restringido, deudor]) await inscribirDePrueba(clase.id, cuenta.id)

    const personas = await pedir("GET", `/api/clases/${clase.id}/personas`, yo.token)
    expect(personas.statusCode).toBe(200)
    const cuerpo = personas.json<{ alumnos: { id: string }[] }>()
    expect(cuerpo.alumnos.map((a) => a.id)).toContain(restringido.id)
    expect(cuerpo.alumnos.map((a) => a.id)).toContain(deudor.id)
    const claves = new Set(clavesDe(personas.json()))
    for (const prohibida of ["estadoPago", "accesoRestringido", "email", "correoEnmascarado"]) {
      expect(claves.has(prohibida), `clave ${prohibida} en personas`).toBe(false)
    }
    for (const texto of ["deudor", "al_corriente", "restringid", "@", dueno.email]) {
      expect(personas.body.toLowerCase(), `"${texto}" en personas`).not.toContain(
        texto.toLowerCase(),
      )
    }

    // El mismo estudiante intenta las demás rutas de b: ningún cuerpo trae datos de pago ni correos.
    const intentos = await Promise.all([
      pedir("GET", `/api/clases/${clase.id}/alumnos`, yo.token),
      pedir("GET", `/api/clases/${clase.id}/alumnos/candidatos?q=${t}`, yo.token),
      pedir("POST", `/api/clases/${clase.id}/alumnos`, yo.token, { alumnoId: restringido.id }),
      pedir("DELETE", `/api/clases/${clase.id}/alumnos/${restringido.id}`, yo.token),
      pedir("GET", `/api/clases/${clase.id}/personas?limite=1`, yo.token),
      pedir("GET", `/api/clases/${clase.id}/personas?cursor=${randomUUID()}`, yo.token),
    ])
    for (const intento of intentos) {
      expect(intento.body).not.toContain("estadoPago")
      expect(intento.body).not.toContain("accesoRestringido")
      expect(intento.body).not.toContain(restringido.email)
      expect(intento.body).not.toContain(deudor.email)
    }

    const roster = await pedir("GET", `/api/clases/${clase.id}/alumnos`, dueno.token)
    expect(roster.statusCode).toBe(200)
    const alumnos = roster.json<{
      alumnos: { id: string; email: string; estadoPago: string; accesoRestringido: boolean }[]
    }>().alumnos
    const delRestringido = alumnos.find((a) => a.id === restringido.id)
    expect(delRestringido).toMatchObject({
      email: restringido.email,
      estadoPago: "deudor",
      accesoRestringido: true,
    })
    expect(alumnos.find((a) => a.id === deudor.id)).toMatchObject({
      email: deudor.email,
      estadoPago: "deudor",
      accesoRestringido: false,
    })
  })

  it("el buscador y agregar no llevan estado de pago, restricción ni correo completo, tampoco para un candidato ya inscrito ni en los errores", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const restringido = await crearCuenta({
      nombre: `Cand Restringido ${t}`,
      accesoRestringido: true,
      estadoPago: "deudor",
    })
    const inscrito = await crearCuenta({ nombre: `Cand Inscrito ${t}`, estadoPago: "deudor" })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    await inscribirDePrueba(clase.id, inscrito.id)

    const cuerpos: string[] = []
    const busqueda = await buscar(clase.id, dueno.token, `cand restringido ${t}`)
    expect(busqueda.statusCode).toBe(200)
    cuerpos.push(busqueda.body)
    const todos = await buscar(clase.id, dueno.token, t)
    expect(todos.statusCode).toBe(200)
    expect(candidatosDe(todos).candidatos.find((c) => c.id === inscrito.id)?.yaInscrito).toBe(true)
    cuerpos.push(todos.body)
    const agregado = await pedir("POST", `/api/clases/${clase.id}/alumnos`, dueno.token, {
      alumnoId: restringido.id,
    })
    expect(agregado.statusCode).toBe(200)
    cuerpos.push(agregado.body)
    const repetido = await pedir("POST", `/api/clases/${clase.id}/alumnos`, dueno.token, {
      alumnoId: restringido.id,
    })
    expect(repetido.json()).toEqual({
      alumno: { id: restringido.id, nombre: restringido.nombre },
      yaEstaba: true,
    })
    cuerpos.push(repetido.body)
    cuerpos.push((await buscar(clase.id, dueno.token, "ab")).body)
    cuerpos.push((await buscar(clase.id, dueno.token, "  a  ")).body)
    cuerpos.push((await buscar(clase.id, dueno.token, t, "999")).body)

    for (const cuerpo of cuerpos) {
      expect(cuerpo).not.toContain("estadoPago")
      expect(cuerpo).not.toContain("accesoRestringido")
      expect(cuerpo).not.toContain("deudor")
      expect(cuerpo).not.toContain(restringido.email)
      expect(cuerpo).not.toContain(inscrito.email)
      expect(cuerpo).not.toContain(restringido.email.split("@")[0] ?? "sin-parte-local")
    }
    for (const respuesta of [busqueda, todos]) {
      expect(respuesta.headers["x-correo"]).toBeUndefined()
      expect(JSON.stringify(respuesta.headers)).not.toContain("@pruebas.local")
    }
  })
})

describe("ataque CLASES-b r1: correo enmascarado por la API (S-22)", () => {
  it("partes locales de 1, 2, 3 y 64 caracteres, con +, puntos, mayúsculas, Unicode, emojis y subdominios: nunca la parte local completa", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const dominio = `${t}.sub.pruebas.local`
    const larga = `${"l".repeat(30)}${"m".repeat(34)}`
    const casos: { local: string; esperado: string }[] = [
      { local: "a", esperado: `***@${dominio}` },
      { local: "jo", esperado: `j***@${dominio}` },
      { local: "ana", esperado: `an***@${dominio}` },
      { local: larga, esperado: `ll***@${dominio}` },
      { local: "nombre.apellido+etiqueta", esperado: `no***@${dominio}` },
      { local: "Ma.YuS", esperado: `Ma***@${dominio}` },
      { local: "ñu", esperado: `ñ***@${dominio}` },
      { local: "😀😀", esperado: `😀***@${dominio}` },
      { local: "😀", esperado: `***@${dominio}` },
      { local: "x+", esperado: `x***@${dominio}` },
    ]
    expect(larga).toHaveLength(64)
    const cuentas: Cuenta[] = []
    for (const [indice, caso] of casos.entries()) {
      cuentas.push(
        await crearCuenta({
          nombre: `Masc ${t} ${String(indice)}`,
          email: `${caso.local}@${dominio}`,
        }),
      )
    }

    const respuesta = await buscar(
      (await crearClaseDePrueba(idsClases, { maestroId: dueno.id })).id,
      dueno.token,
      `masc ${t}`,
    )
    expect(respuesta.statusCode).toBe(200)
    const { candidatos } = candidatosDe(respuesta)
    expect(candidatos).toHaveLength(casos.length)
    for (const [indice, caso] of casos.entries()) {
      const cuenta = cuentas[indice]
      if (cuenta === undefined) throw new Error("falta la cuenta del caso")
      const candidato = candidatos.find((c) => c.id === cuenta.id)
      expect(candidato?.correoEnmascarado, `parte local "${caso.local}"`).toBe(caso.esperado)
      expect(respuesta.body, `correo completo de "${caso.local}"`).not.toContain(cuenta.email)
      expect(
        candidato?.correoEnmascarado.startsWith(`${caso.local}*`),
        `parte local completa de "${caso.local}" visible`,
      ).toBe(false)
    }
    // Sin unidades UTF-16 sueltas: el emoji no se partió a la mitad.
    expect(respuesta.body).not.toMatch(/\\ud[89ab][0-9a-f]{2}(?!\\ud[c-f])/i)
  })

  it("combinar búsquedas no revela más: el enmascarado de una cuenta es el mismo con cualquier término que la encuentra", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const cuenta = await crearCuenta({
      nombre: `Revertir Pérez ${t}`,
      email: `revertir.perez.${t}@pruebas.local`,
    })

    const vistos = new Set<string>()
    for (const termino of [t, `pérez ${t}`, `REVERTIR PEREZ ${t}`, `rez ${t}`, `ertir pe`]) {
      const respuesta = await buscar(clase.id, dueno.token, termino, "50")
      expect(respuesta.statusCode).toBe(200)
      const candidato = candidatosDe(respuesta).candidatos.find((c) => c.id === cuenta.id)
      if (candidato !== undefined) vistos.add(candidato.correoEnmascarado)
      expect(respuesta.body).not.toContain(cuenta.email)
      expect(respuesta.body).not.toContain(`revertir.perez.${t}`)
    }
    expect([...vistos]).toEqual(["re***@pruebas.local"])
  })

  it("el roster del dueño muestra el correo completo; el roster de la clase de otro maestro le responde 403 sin correos", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const otro = await crearCuenta({ nombre: `Otro ${t}`, rol: "maestro" })
    const mio = await crearCuenta({ nombre: `Mío ${t}` })
    const suyo = await crearCuenta({ nombre: `Suyo ${t}` })
    const miClase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const suClase = await crearClaseDePrueba(idsClases, { maestroId: otro.id })
    await inscribirDePrueba(miClase.id, mio.id)
    await inscribirDePrueba(suClase.id, suyo.id)

    const propio = await pedir("GET", `/api/clases/${miClase.id}/alumnos`, dueno.token)
    expect(propio.statusCode).toBe(200)
    expect(propio.body).toContain(mio.email)
    expect(propio.body).not.toContain(suyo.email)

    const ajeno = await pedir("GET", `/api/clases/${suClase.id}/alumnos`, dueno.token)
    expect(ajeno.statusCode).toBe(403)
    expect(ajeno.body).not.toContain(suyo.email)
    const ajenoPaginado = await pedir(
      "GET",
      `/api/clases/${suClase.id}/alumnos?cursor=${suyo.id}&limite=1`,
      dueno.token,
    )
    expect(ajenoPaginado.statusCode).toBe(403)
    expect(ajenoPaginado.body).not.toContain(suyo.email)
  })
})

describe("ataque CLASES-b r1: buscador", () => {
  it("comodines y barra invertida se buscan como texto literal, sin 500", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const literal = await crearCuenta({ nombre: `Lit ${t} 5%_\\x` })
    const parecido = await crearCuenta({ nombre: `Lit ${t} 5ab\\x` })

    const exacto = await buscar(clase.id, dueno.token, `${t} 5%_\\`)
    expect(exacto.statusCode).toBe(200)
    expect(candidatosDe(exacto).candidatos.map((c) => c.id)).toEqual([literal.id])

    for (const termino of [
      "%_\\",
      "\\\\\\",
      "%%%",
      "___",
      "_%_",
      "a%b",
      "\\%\\",
      "'; --",
      "'||'",
    ]) {
      const respuesta = await buscar(clase.id, dueno.token, termino, "50")
      expect(respuesta.statusCode, `término ${JSON.stringify(termino)}`).toBe(200)
      const normalizado = normalizarParaBusqueda(termino)
      for (const candidato of candidatosDe(respuesta).candidatos) {
        expect(
          normalizarParaBusqueda(candidato.nombre),
          `"${candidato.nombre}" con el término ${JSON.stringify(termino)}`,
        ).toContain(normalizado)
      }
    }
    expect(parecido.id).not.toBe(literal.id)
  })

  it("términos que quedan en menos de 3 al normalizar responden 400 BUSQUEDA_MUY_CORTA; los que no, 200", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const casos: [string, number, string][] = [
      ["á́", 400, "BUSQUEDA_MUY_CORTA"],
      ["ab́", 400, "BUSQUEDA_MUY_CORTA"],
      ["  ab  ", 400, "BUSQUEDA_MUY_CORTA"],
      [" 　 ", 400, "BUSQUEDA_MUY_CORTA"],
      // zod cuenta puntos de código: "😀a" son 2 en crudo, así que es VALIDACION (§D-B1).
      ["😀a", 400, "VALIDACION"],
      ["́́́", 400, "BUSQUEDA_MUY_CORTA"],
      ["ab", 400, "VALIDACION"],
      [" a　b ", 200, ""],
      ["a b", 200, ""],
      ["a  b", 200, ""],
      ["😀😀😀", 200, ""],
    ]
    const resultados: string[] = []
    for (const [q, estado, codigo] of casos) {
      const respuesta = await buscar(clase.id, dueno.token, q)
      const obtenido = `${String(respuesta.statusCode)} ${codigoDe(respuesta) ?? ""}`
      if (obtenido !== `${String(estado)} ${codigo}`) {
        resultados.push(
          `${JSON.stringify(q)}: esperado ${String(estado)} ${codigo}, obtenido ${obtenido}`,
        )
      }
      if (respuesta.statusCode === 200) {
        const termino = normalizarParaBusqueda(q)
        for (const candidato of candidatosDe(respuesta).candidatos) {
          if (!normalizarParaBusqueda(candidato.nombre).includes(termino)) {
            resultados.push(`${JSON.stringify(q)} devolvió "${candidato.nombre}"`)
          }
        }
      }
    }
    expect(resultados).toEqual([])
  })

  it("T-20: un término con 3 o más caracteres después de normalizar (S-11) que el frontend da por válido no recibe 400 (hangul: «각», «가나»)", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const coreana = await crearCuenta({ nombre: `가나 각 ${t}` })

    // Precondición: el término normalizado mide 3 o más (lo que pide S-11 y lo que comprueba
    // terminoDeBusquedaValido en el frontend, que hace la misma normalización sin toLowerCase).
    expect(Array.from(normalizarParaBusqueda("각")).length).toBeGreaterThanOrEqual(3)
    expect(Array.from(normalizarParaBusqueda("가나")).length).toBeGreaterThanOrEqual(3)

    const resultados: string[] = []
    for (const q of ["각", "가나"]) {
      const respuesta = await buscar(clase.id, dueno.token, q, "50")
      const ids =
        respuesta.statusCode === 200 ? candidatosDe(respuesta).candidatos.map((c) => c.id) : []
      resultados.push(
        `${q}: ${String(respuesta.statusCode)} ${codigoDe(respuesta) ?? ""} encontrada=${String(ids.includes(coreana.id))}`,
      )
    }
    expect(resultados).toEqual(["각: 200  encontrada=true", "가나: 200  encontrada=true"])
  })

  it("120 caracteres pasan y 121 no; 60 emojis (120 unidades) pasan; el NUL, q repetido o ausente dan 400 y nunca 500", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const base = `/api/clases/${clase.id}/alumnos/candidatos`

    const resultados: string[] = []
    const anotar = (nombre: string, respuesta: LightMyRequestResponse) =>
      resultados.push(`${nombre}: ${String(respuesta.statusCode)} ${codigoDe(respuesta) ?? ""}`)

    anotar("120", await buscar(clase.id, dueno.token, `${t}${"a".repeat(120 - t.length)}`))
    anotar("121", await buscar(clase.id, dueno.token, `${t}${"a".repeat(121 - t.length)}`))
    anotar("60 emojis", await buscar(clase.id, dueno.token, "😀".repeat(60)))
    anotar("NUL", await buscar(clase.id, dueno.token, "abc\u0000"))
    anotar("q repetido", await pedir("GET", `${base}?q=abc&q=def`, dueno.token))
    anotar("sin q", await pedir("GET", base, dueno.token))
    anotar("q vacío", await pedir("GET", `${base}?q=`, dueno.token))
    anotar("q con % roto", await pedir("GET", `${base}?q=%E0%A4%A`, dueno.token))
    anotar("q[]=", await pedir("GET", `${base}?q[a]=abc`, dueno.token))
    expect(resultados).toEqual([
      "120: 200 ",
      "121: 400 VALIDACION",
      "60 emojis: 200 ",
      "NUL: 400 VALIDACION",
      "q repetido: 400 VALIDACION",
      "sin q: 400 VALIDACION",
      "q vacío: 400 VALIDACION",
      expect.stringMatching(/^q con % roto: (200 |400 VALIDACION)$/) as unknown as string,
      "q[]=: 400 VALIDACION",
    ])
  })

  it("limite fuera de rango, decimal, no numérico, vacío o repetido da 400 VALIDACION; 1 y 50 funcionan con hayMas", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    await crearCuenta({ nombre: `Lim ${t} uno` })
    await crearCuenta({ nombre: `Lim ${t} dos` })
    const base = `/api/clases/${clase.id}/alumnos/candidatos?q=${t}`

    const resultados: string[] = []
    for (const limite of ["0", "-1", "51", "1.5", "abc", "", "1e400", "NaN", " "]) {
      const respuesta = await pedir(
        "GET",
        `${base}&limite=${encodeURIComponent(limite)}`,
        dueno.token,
      )
      resultados.push(
        `${JSON.stringify(limite)}: ${String(respuesta.statusCode)} ${codigoDe(respuesta) ?? ""}`,
      )
    }
    const repetido = await pedir("GET", `${base}&limite=1&limite=2`, dueno.token)
    resultados.push(`repetido: ${String(repetido.statusCode)} ${codigoDe(repetido) ?? ""}`)
    expect(resultados).toEqual([
      '"0": 400 VALIDACION',
      '"-1": 400 VALIDACION',
      '"51": 400 VALIDACION',
      '"1.5": 400 VALIDACION',
      '"abc": 400 VALIDACION',
      '"": 400 VALIDACION',
      '"1e400": 400 VALIDACION',
      '"NaN": 400 VALIDACION',
      '" ": 400 VALIDACION',
      "repetido: 400 VALIDACION",
    ])

    const uno = await pedir("GET", `${base}&limite=1`, dueno.token)
    expect(uno.statusCode).toBe(200)
    expect(candidatosDe(uno).candidatos).toHaveLength(1)
    expect(candidatosDe(uno).hayMas).toBe(true)
    const cincuenta = await pedir("GET", `${base}&limite=50`, dueno.token)
    expect(candidatosDe(cincuenta).candidatos).toHaveLength(2)
    expect(candidatosDe(cincuenta).hayMas).toBe(false)
  })

  it("el buscador solo devuelve estudiantes activos (también restringidos) y nunca al dueño, a otros maestros ni al admin, con un término que coincide con todos", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Todos ${t} dueño`, rol: "maestro" })
    const otroMaestro = await crearCuenta({ nombre: `Todos ${t} maestro`, rol: "maestro" })
    const inactivo = await crearCuenta({ nombre: `Todos ${t} inactivo`, activo: false })
    const restringido = await crearCuenta({
      nombre: `Todos ${t} restringido`,
      accesoRestringido: true,
    })
    const activo = await crearCuenta({ nombre: `Todos ${t} activo` })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })

    const respuesta = await buscar(clase.id, dueno.token, `todos ${t}`)
    expect(respuesta.statusCode).toBe(200)
    const ids = candidatosDe(respuesta)
      .candidatos.map((c) => c.id)
      .sort()
    expect(ids).toEqual([activo.id, restringido.id].sort())
    expect(ids).not.toContain(otroMaestro.id)
    expect(ids).not.toContain(inactivo.id)
    expect(ids).not.toContain(dueno.id)
    expect(ids).not.toContain(idAdmin)
  })
})

describe("ataque CLASES-b r1: paginación de personas y del roster", () => {
  it("cinco homónimos con limite=2 en roster y personas: todos, sin repetir, en orden (nombre_busqueda, id)", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const cuentas: Cuenta[] = []
    for (let i = 0; i < 5; i++) cuentas.push(await crearCuenta({ nombre: `Homónimo ${t}` }))
    cuentas.push(await crearCuenta({ nombre: `Aaa ${t}` }))
    cuentas.push(await crearCuenta({ nombre: `Zzz ${t}` }))
    for (const cuenta of cuentas) await inscribirDePrueba(clase.id, cuenta.id)
    const lector = cuentas[0]
    if (lector === undefined) throw new Error("sin lector")

    const esperado = [...cuentas]
      .sort((a, b) => {
        const na = normalizarParaBusqueda(a.nombre)
        const nb = normalizarParaBusqueda(b.nombre)
        if (na !== nb) return na < nb ? -1 : 1
        return a.id < b.id ? -1 : 1
      })
      .map((c) => c.id)

    for (const [ruta, token] of [
      ["alumnos", dueno.token],
      ["personas", lector.token],
    ] as const) {
      const vistos: string[] = []
      let cursor: string | null = null
      for (let vuelta = 0; vuelta < 10; vuelta++) {
        const sufijo: string = cursor === null ? "" : `&cursor=${cursor}`
        const respuesta = await pedir(
          "GET",
          `/api/clases/${clase.id}/${ruta}?limite=2${sufijo}`,
          token,
        )
        expect(respuesta.statusCode).toBe(200)
        const cuerpo = respuesta.json<{
          alumnos: { id: string }[]
          siguienteCursor: string | null
        }>()
        vistos.push(...cuerpo.alumnos.map((a) => a.id))
        cursor = cuerpo.siguienteCursor
        if (cursor === null) break
      }
      expect(vistos, ruta).toEqual(esperado)
    }
  })

  it("cursor inexistente, malformado o de otra clase; cursor del admin y en mayúsculas: 400 solo si el usuario no existe", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const otro = await crearCuenta({ nombre: `Otro ${t}`, rol: "maestro" })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const otraClase = await crearClaseDePrueba(idsClases, { maestroId: otro.id })
    const miembros: Cuenta[] = []
    for (const letra of ["b", "d", "f", "h"]) {
      const cuenta = await crearCuenta({ nombre: `${letra}${letra} ${t}` })
      miembros.push(cuenta)
      await inscribirDePrueba(clase.id, cuenta.id)
    }
    const ajeno = await crearCuenta({ nombre: `ee ${t}` })
    await inscribirDePrueba(otraClase.id, ajeno.id)
    const lector = miembros[0]
    if (lector === undefined) throw new Error("sin lector")

    for (const [ruta, token] of [
      ["alumnos", dueno.token],
      ["personas", lector.token],
    ] as const) {
      const url = (cursor: string) => `/api/clases/${clase.id}/${ruta}?limite=50&cursor=${cursor}`
      const inexistente = await pedir("GET", url(randomUUID()), token)
      expect(inexistente.statusCode, `${ruta} inexistente`).toBe(400)
      expect(inexistente.json()).toEqual({
        error: { codigo: "VALIDACION", mensaje: "cursor: no es válido" },
      })
      const malformado = await pedir("GET", url("no-es-uuid"), token)
      expect(malformado.statusCode, `${ruta} malformado`).toBe(400)

      // Cursor de un alumno de otra clase ("ee …"): la página sigue desde su clave, sin colarlo.
      const deOtraClase = await pedir("GET", url(ajeno.id), token)
      expect(deOtraClase.statusCode, `${ruta} cursor de otra clase`).toBe(200)
      const ids = deOtraClase.json<{ alumnos: { id: string }[] }>().alumnos.map((a) => a.id)
      expect(ids).not.toContain(ajeno.id)
      expect(ids).toEqual([miembros[2]?.id, miembros[3]?.id])

      const enMayusculas = await pedir("GET", url((miembros[1]?.id ?? "").toUpperCase()), token)
      expect(enMayusculas.statusCode, `${ruta} cursor en mayúsculas`).toBe(200)
      expect(enMayusculas.json<{ alumnos: { id: string }[] }>().alumnos.map((a) => a.id)).toEqual([
        miembros[2]?.id,
        miembros[3]?.id,
      ])

      const delAdmin = await pedir("GET", url(idAdmin), token)
      expect([200, 400], `${ruta} cursor del admin`).toContain(delAdmin.statusCode)
      if (ruta === "personas") expect(delAdmin.body).not.toContain("estadoPago")
      else expect(delAdmin.body).not.toContain(idAdmin)
    }
  })

  it("un alumno quitado entre dos páginas del roster no hace perder a nadie de la página siguiente", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const miembros: Cuenta[] = []
    for (const letra of ["b", "c", "d", "e", "f"]) {
      const cuenta = await crearCuenta({ nombre: `${letra} ${t}` })
      miembros.push(cuenta)
      await inscribirDePrueba(clase.id, cuenta.id)
    }
    const primera = await pedir("GET", `/api/clases/${clase.id}/alumnos?limite=2`, dueno.token)
    const { alumnos, siguienteCursor } = primera.json<{
      alumnos: { id: string }[]
      siguienteCursor: string | null
    }>()
    expect(siguienteCursor).toBe(miembros[1]?.id)
    const quitar = await pedir(
      "DELETE",
      `/api/clases/${clase.id}/alumnos/${siguienteCursor ?? ""}`,
      dueno.token,
    )
    expect(quitar.statusCode).toBe(204)
    const segunda = await pedir(
      "GET",
      `/api/clases/${clase.id}/alumnos?limite=50&cursor=${siguienteCursor ?? ""}`,
      dueno.token,
    )
    expect(segunda.statusCode).toBe(200)
    const resto = segunda.json<{ alumnos: { id: string }[] }>().alumnos.map((a) => a.id)
    expect([...alumnos.map((a) => a.id), ...resto]).toEqual(miembros.map((m) => m.id))
  })
})

describe("ataque CLASES-b r1: «a b» y el índice de trigramas", () => {
  // D-2 / punto 4 del manager: "a b" mide 3 después de normalizar y se busca como LIKE '%a b%'. Se
  // comprueba en una tabla temporal (ON COMMIT DROP), con el mismo operador gin_trgm_ops, que ese
  // patrón todavía puede resolverse con el índice: sin tocar `usuarios` ni retener sus bloqueos.
  it("LIKE '%a b%' y '%a  b%' (normalizado) se pueden resolver con un índice GIN de trigramas", async () => {
    const planes = await obtenerDb().$transaction(
      async (tx) => {
        await tx.$executeRaw`CREATE TEMP TABLE b_r1_trgm (n text) ON COMMIT DROP`
        await tx.$executeRaw`INSERT INTO b_r1_trgm SELECT 'alumno ' || md5(i::text) FROM generate_series(1, 5000) AS i`
        await tx.$executeRaw`CREATE INDEX b_r1_trgm_idx ON b_r1_trgm USING gin (n gin_trgm_ops)`
        await tx.$executeRaw`ANALYZE b_r1_trgm`
        await tx.$executeRaw`SET LOCAL enable_seqscan = off`
        const resultado: string[] = []
        for (const patron of [
          `%${normalizarParaBusqueda("a b")}%`,
          `%${normalizarParaBusqueda("a  b")}%`,
        ]) {
          const filas = await tx.$queryRaw<
            unknown[]
          >`EXPLAIN (FORMAT JSON) SELECT n FROM b_r1_trgm WHERE n LIKE ${patron}`
          resultado.push(JSON.stringify(filas))
        }
        return resultado
      },
      { timeout: 20000 },
    )
    expect(planes).toHaveLength(2)
    for (const plan of planes) expect(plan).toContain("b_r1_trgm_idx")
  })
})

describe("ataque CLASES-b r1: límite de personas y del roster", () => {
  it("limite de 1 a 100 (50 por defecto); 0, 101, decimal, texto o repetido dan 400 y nunca 500", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const alumno = await crearCuenta({ nombre: `Alumno ${t}` })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    await inscribirDePrueba(clase.id, alumno.id)

    const resultados: string[] = []
    for (const [ruta, token] of [
      ["alumnos", dueno.token],
      ["personas", alumno.token],
    ] as const) {
      for (const limite of ["1", "100", "0", "101", "2.5", "abc", "", "-5"]) {
        const respuesta = await pedir(
          "GET",
          `/api/clases/${clase.id}/${ruta}?limite=${encodeURIComponent(limite)}`,
          token,
        )
        resultados.push(
          `${ruta} ${JSON.stringify(limite)}: ${String(respuesta.statusCode)} ${codigoDe(respuesta) ?? ""}`,
        )
      }
      const repetido = await pedir(
        "GET",
        `/api/clases/${clase.id}/${ruta}?limite=1&limite=2`,
        token,
      )
      resultados.push(
        `${ruta} repetido: ${String(repetido.statusCode)} ${codigoDe(repetido) ?? ""}`,
      )
    }
    const esperadas = (ruta: string) => [
      `${ruta} "1": 200 `,
      `${ruta} "100": 200 `,
      `${ruta} "0": 400 VALIDACION`,
      `${ruta} "101": 400 VALIDACION`,
      `${ruta} "2.5": 400 VALIDACION`,
      `${ruta} "abc": 400 VALIDACION`,
      `${ruta} "": 400 VALIDACION`,
      `${ruta} "-5": 400 VALIDACION`,
      `${ruta} repetido: 400 VALIDACION`,
    ]
    expect(resultados).toEqual([...esperadas("alumnos"), ...esperadas("personas")])
  })
})

describe("ataque CLASES-b r1: movimientos_inscripcion", () => {
  const agregar = (claseId: string, token: string, alumnoId: string) =>
    pedir("POST", `/api/clases/${claseId}/alumnos`, token, { alumnoId })
  const quitar = (claseId: string, token: string, alumnoId: string) =>
    pedir("DELETE", `/api/clases/${claseId}/alumnos/${alumnoId}`, token)

  it("4 altas simultáneas del mismo alumno: una sola con yaEstaba false y un solo movimiento; después 4 bajas simultáneas: una sola baja", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const alumno = await crearCuenta({ nombre: `Alumno ${t}` })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })

    const altas = await Promise.all(
      Array.from({ length: 4 }, () => agregar(clase.id, dueno.token, alumno.id)),
    )
    expect(altas.map((r) => r.statusCode)).toEqual([200, 200, 200, 200])
    expect(altas.filter((r) => r.json<{ yaEstaba: boolean }>().yaEstaba === false)).toHaveLength(1)
    expect((await leerMovimientos(clase.id)).map((f) => f.tipo)).toEqual(["alta"])

    const bajas = await Promise.all(
      Array.from({ length: 4 }, () => quitar(clase.id, dueno.token, alumno.id)),
    )
    expect(bajas.map((r) => r.statusCode)).toEqual([204, 204, 204, 204])
    expect((await leerMovimientos(clase.id)).map((f) => f.tipo)).toEqual(["alta", "baja"])
    expect(await leerInscripcion(clase.id, alumno.id)).toBeNull()
  })

  // CLASES-02a ronda 0 (C-6, P-08 a): MovimientoInscripcion.maestroId pasa a actorId (misma columna
  // maestro_id en la base); lo protegido no cambia: cada alta queda con quien la hizo.
  it("el mismo alumno agregado a la vez a dos clases de dos maestros: cada clase registra su alta con su maestro", async () => {
    const t = ficha()
    const uno = await crearCuenta({ nombre: `Uno ${t}`, rol: "maestro" })
    const dos = await crearCuenta({ nombre: `Dos ${t}`, rol: "maestro" })
    const alumno = await crearCuenta({ nombre: `Alumno ${t}` })
    const claseUno = await crearClaseDePrueba(idsClases, { maestroId: uno.id })
    const claseDos = await crearClaseDePrueba(idsClases, { maestroId: dos.id })

    const respuestas = await Promise.all([
      agregar(claseUno.id, uno.token, alumno.id),
      agregar(claseDos.id, dos.token, alumno.id),
      quitar(claseUno.id, dos.token, alumno.id),
      agregar(claseDos.id, uno.token, alumno.id),
    ])
    expect(respuestas.map((r) => r.statusCode)).toEqual([200, 200, 403, 403])
    const filasUno = await leerMovimientos(claseUno.id)
    const filasDos = await leerMovimientos(claseDos.id)
    expect(filasUno.map((f) => [f.tipo, f.actorId, f.alumnoId])).toEqual([
      ["alta", uno.id, alumno.id],
    ])
    expect(filasDos.map((f) => [f.tipo, f.actorId, f.alumnoId])).toEqual([
      ["alta", dos.id, alumno.id],
    ])
  })

  it("unirse con código después de una baja no escribe movimiento y el roster lo muestra con origen codigo; la segunda baja sí se registra", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const alumno = await crearCuenta({ nombre: `Alumno ${t}` })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })

    expect((await agregar(clase.id, dueno.token, alumno.id)).statusCode).toBe(200)
    expect((await quitar(clase.id, dueno.token, alumno.id)).statusCode).toBe(204)
    const unirse = await pedir("POST", "/api/clases/unirse", alumno.token, {
      codigo: clase.codigoInvitacion,
    })
    expect(unirse.statusCode).toBe(200)
    expect((await leerMovimientos(clase.id)).map((f) => f.tipo)).toEqual(["alta", "baja"])

    const roster = await pedir("GET", `/api/clases/${clase.id}/alumnos`, dueno.token)
    expect(
      roster
        .json<{ alumnos: { id: string; origen: string }[] }>()
        .alumnos.find((a) => a.id === alumno.id)?.origen,
    ).toBe("codigo")
    // Agregar ahora es yaEstaba: no escribe; quitar escribe la segunda baja.
    expect((await agregar(clase.id, dueno.token, alumno.id)).json()).toMatchObject({
      yaEstaba: true,
    })
    expect((await quitar(clase.id, dueno.token, alumno.id)).statusCode).toBe(204)
    expect((await leerMovimientos(clase.id)).map((f) => f.tipo)).toEqual(["alta", "baja", "baja"])
  })

  it("ningún código de producción lee la tabla ni ordena por creado_en: solo inscripciones.ts la escribe, con create", () => {
    const leer = (relativa: string) =>
      readFileSync(fileURLToPath(new URL(`../src/${relativa}`, import.meta.url)), "utf8")
    const inscripciones = leer("adapters/db/inscripciones.ts")
    const usos = inscripciones.match(/movimientoInscripcion\.\w+/g) ?? []
    expect(usos).toEqual(["movimientoInscripcion.create", "movimientoInscripcion.create"])
    expect(inscripciones).not.toMatch(/orderBy[^\n]*creadoEn/)
    expect(inscripciones).not.toMatch(/\$queryRaw|\$executeRaw/)
    const handler = leer("handlers/clases/alumnos.ts")
    expect(handler).not.toMatch(/movimiento/i)
    expect(handler).not.toMatch(
      /\brol\b\s*[!=]==|\.rol\b|relacion\s*[!=]==|esDueno|maestroId\s*[!=]==/,
    )
    expect(handler).not.toMatch(/console\.|obtenerDb|@prisma|generated\//)
  })
})

describe("ataque CLASES-b r1: regresión de CLASES-a con las rutas de b", () => {
  it("T-18: inscritas e impartidas con un cursor que ya no es suyo siguen respondiendo 400", async () => {
    const t = ficha()
    const dueno = await crearCuenta({ nombre: `Dueño ${t}`, rol: "maestro" })
    const otro = await crearCuenta({ nombre: `Otro ${t}`, rol: "maestro" })
    const alumno = await crearCuenta({ nombre: `Alumno ${t}` })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const ajena = await crearClaseDePrueba(idsClases, { maestroId: otro.id })
    await inscribirDePrueba(clase.id, alumno.id)

    // Quitado por el maestro: el cursor de esa clase ya no es una inscripción del alumno.
    expect(
      (await pedir("DELETE", `/api/clases/${clase.id}/alumnos/${alumno.id}`, dueno.token))
        .statusCode,
    ).toBe(204)
    const inscritas = await pedir("GET", `/api/clases/inscritas?cursor=${clase.id}`, alumno.token)
    expect(inscritas.statusCode).toBe(400)
    const impartidas = await pedir("GET", `/api/clases/impartidas?cursor=${ajena.id}`, dueno.token)
    expect(impartidas.statusCode).toBe(400)
    // Y el alumno quitado ya no entra a la clase ni a sus personas.
    expect((await pedir("GET", `/api/clases/${clase.id}/personas`, alumno.token)).statusCode).toBe(
      403,
    )
  })
})
