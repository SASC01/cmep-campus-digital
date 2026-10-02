import { errorApiSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import { borrarClasesDePrueba, crearClaseDePrueba, inscribirDePrueba } from "./ayudas-clases.js"

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
const cuerposRecibidos: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const maestroDePrueba = (opciones: Parameters<typeof crearUsuarioDePrueba>[1] = {}) =>
  crearUsuarioDePrueba(idsUsuarios, { ...opciones, rol: "maestro" })
const estudianteDePrueba = (opciones: Parameters<typeof crearUsuarioDePrueba>[1] = {}) =>
  crearUsuarioDePrueba(idsUsuarios, { ...opciones, rol: "estudiante" })
const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

interface PreparadoRuta {
  nombre: string
  metodo: "GET" | "POST" | "PUT"
  url: string
  payload?: unknown
  tokenPermitido: string
  // Token de un rol distinto del exigido, si existe uno "incorrecto" entre los dos roles no-admin
  // (GET /clases/:claseId acepta a los dos, así que no tiene).
  tokenIncorrecto?: string
  // Tokens de "ajeno" (maestro ajeno y/o estudiante no inscrito): [] en las 4 rutas sin :claseId.
  tokensAjenos: string[]
  // Crea un restringido apropiado para la ruta (inscrito en su clase si la ruta cuelga de
  // :claseId) y devuelve su token. M-01: para que el caso detecte lo que dice su fila, el
  // restringido debe ser un miembro de verdad de la clase, no un extraño.
  prepararRestringido: () => Promise<string>
  // Estado que ninguna negación debe cambiar (M-03): normalmente la fila de la clase que controla
  // el preparador o sus inscripciones (un objetivo fijo, sin depender de quién hace la petición).
  // En POST /clases el éxito crea una fila nueva a nombre de quien la pide (el permitido nunca es
  // quien manda una petición negada), así que ahí el snapshot necesita el id de esa cuenta
  // (actorId) para contar sus propias clases; los demás preparadores lo ignoran. Sigue siendo un
  // conteo local (acotado a un id), nunca global.
  snapshotControlado: (contexto: { actorId: string }) => Promise<unknown>
}

// Extrae "sub" (el uuid del usuario) de un token de acceso de prueba, sin verificar la firma: solo
// para saber a nombre de quién quedaría una fila si una negación se colara (M-03).
const idDelToken = (token: string): string => {
  const carga = token.split(".")[1]
  if (carga === undefined) throw new Error("Token de prueba sin carga")
  const payload = JSON.parse(Buffer.from(carga, "base64url").toString("utf8")) as {
    sub?: string
  }
  if (payload.sub === undefined) throw new Error("Token de prueba sin sub")
  return payload.sub
}

const prepararPostClases = async (): Promise<PreparadoRuta> => {
  const maestro = await maestroDePrueba()
  const estudiante = await estudianteDePrueba()
  return {
    nombre: "POST /clases",
    metodo: "POST",
    url: "/api/clases",
    payload: { nombre: "Clase de autorización" },
    tokenPermitido: await tokenDe(maestro),
    tokenIncorrecto: await tokenDe(estudiante),
    tokensAjenos: [],
    prepararRestringido: async () => tokenDe(await estudianteDePrueba({ accesoRestringido: true })),
    // M-03: el maestro permitido nunca manda una petición negada; contar sus clases no detectaría
    // que una negación colada creó una fila a nombre de quien sí la mandó. Se cuenta por esa cuenta.
    snapshotControlado: ({ actorId }) => obtenerDb().clase.count({ where: { maestroId: actorId } }),
  }
}

const prepararGetInscritas = async (): Promise<PreparadoRuta> => {
  const estudiante = await estudianteDePrueba()
  const maestro = await maestroDePrueba()
  return {
    nombre: "GET /clases/inscritas",
    metodo: "GET",
    url: "/api/clases/inscritas",
    tokenPermitido: await tokenDe(estudiante),
    tokenIncorrecto: await tokenDe(maestro),
    tokensAjenos: [],
    prepararRestringido: async () => tokenDe(await estudianteDePrueba({ accesoRestringido: true })),
    snapshotControlado: () =>
      obtenerDb().inscripcion.count({ where: { usuarioId: estudiante.id } }),
  }
}

const prepararGetImpartidas = async (): Promise<PreparadoRuta> => {
  const maestro = await maestroDePrueba()
  const estudiante = await estudianteDePrueba()
  return {
    nombre: "GET /clases/impartidas",
    metodo: "GET",
    url: "/api/clases/impartidas",
    tokenPermitido: await tokenDe(maestro),
    tokenIncorrecto: await tokenDe(estudiante),
    tokensAjenos: [],
    prepararRestringido: async () => tokenDe(await estudianteDePrueba({ accesoRestringido: true })),
    snapshotControlado: () => obtenerDb().clase.count({ where: { maestroId: maestro.id } }),
  }
}

const prepararPostUnirse = async (): Promise<PreparadoRuta> => {
  const maestro = await maestroDePrueba()
  const estudiante = await estudianteDePrueba()
  const otroMaestro = await maestroDePrueba()
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  return {
    nombre: "POST /clases/unirse",
    metodo: "POST",
    url: "/api/clases/unirse",
    payload: { codigo: clase.codigoInvitacion },
    tokenPermitido: await tokenDe(estudiante),
    tokenIncorrecto: await tokenDe(otroMaestro),
    tokensAjenos: [],
    prepararRestringido: async () => tokenDe(await estudianteDePrueba({ accesoRestringido: true })),
    snapshotControlado: () => obtenerDb().inscripcion.count({ where: { claseId: clase.id } }),
  }
}

const prepararGetClase = async (): Promise<PreparadoRuta> => {
  const maestro = await maestroDePrueba()
  const estudianteInscrito = await estudianteDePrueba()
  const otroMaestro = await maestroDePrueba()
  const estudianteNoInscrito = await estudianteDePrueba()
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  await inscribirDePrueba(clase.id, estudianteInscrito.id, "codigo")
  return {
    nombre: "GET /clases/:claseId",
    metodo: "GET",
    url: `/api/clases/${clase.id}`,
    tokenPermitido: await tokenDe(estudianteInscrito),
    // M-02: la fila exige maestro ajeno Y estudiante no inscrito; es la única ruta de a con
    // pertenencia por inscripción, así que es la única donde el segundo caso existe de verdad.
    tokensAjenos: [await tokenDe(otroMaestro), await tokenDe(estudianteNoInscrito)],
    prepararRestringido: async () => {
      const restringido = await estudianteDePrueba({ accesoRestringido: true })
      await inscribirDePrueba(clase.id, restringido.id, "codigo")
      return tokenDe(restringido)
    },
    snapshotControlado: async () => ({
      clase: await obtenerDb().clase.findUnique({
        where: { id: clase.id },
        select: { nombre: true, descripcion: true, codigoInvitacion: true },
      }),
      inscripciones: await obtenerDb().inscripcion.count({ where: { claseId: clase.id } }),
    }),
  }
}

const prepararPutClase = async (): Promise<PreparadoRuta> => {
  const maestro = await maestroDePrueba()
  const estudiante = await estudianteDePrueba()
  const otroMaestro = await maestroDePrueba()
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  return {
    nombre: "PUT /clases/:claseId",
    metodo: "PUT",
    url: `/api/clases/${clase.id}`,
    payload: { nombre: "Editada por autorización" },
    tokenPermitido: await tokenDe(maestro),
    tokenIncorrecto: await tokenDe(estudiante),
    tokensAjenos: [await tokenDe(otroMaestro)],
    prepararRestringido: async () => {
      const restringido = await estudianteDePrueba({ accesoRestringido: true })
      await inscribirDePrueba(clase.id, restringido.id, "codigo")
      return tokenDe(restringido)
    },
    snapshotControlado: () =>
      obtenerDb().clase.findUnique({
        where: { id: clase.id },
        select: { nombre: true, descripcion: true, codigoInvitacion: true },
      }),
  }
}

const prepararGetCodigo = async (): Promise<PreparadoRuta> => {
  const maestro = await maestroDePrueba()
  const estudiante = await estudianteDePrueba()
  const otroMaestro = await maestroDePrueba()
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  return {
    nombre: "GET /clases/:claseId/codigo",
    metodo: "GET",
    url: `/api/clases/${clase.id}/codigo`,
    tokenPermitido: await tokenDe(maestro),
    tokenIncorrecto: await tokenDe(estudiante),
    tokensAjenos: [await tokenDe(otroMaestro)],
    prepararRestringido: async () => {
      const restringido = await estudianteDePrueba({ accesoRestringido: true })
      await inscribirDePrueba(clase.id, restringido.id, "codigo")
      return tokenDe(restringido)
    },
    snapshotControlado: () =>
      obtenerDb().clase.findUnique({ where: { id: clase.id }, select: { codigoInvitacion: true } }),
  }
}

const prepararPostCodigo = async (): Promise<PreparadoRuta> => {
  const maestro = await maestroDePrueba()
  const estudiante = await estudianteDePrueba()
  const otroMaestro = await maestroDePrueba()
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  return {
    nombre: "POST /clases/:claseId/codigo",
    metodo: "POST",
    url: `/api/clases/${clase.id}/codigo`,
    tokenPermitido: await tokenDe(maestro),
    tokenIncorrecto: await tokenDe(estudiante),
    tokensAjenos: [await tokenDe(otroMaestro)],
    prepararRestringido: async () => {
      const restringido = await estudianteDePrueba({ accesoRestringido: true })
      await inscribirDePrueba(clase.id, restringido.id, "codigo")
      return tokenDe(restringido)
    },
    snapshotControlado: () =>
      obtenerDb().clase.findUnique({ where: { id: clase.id }, select: { codigoInvitacion: true } }),
  }
}

// Las 8 rutas de CLASES-a (§D-A2). Cada preparador crea un escenario fresco (clase y cuentas) para
// no arrastrar estado entre pruebas.
const preparadores = [
  prepararPostClases,
  prepararGetInscritas,
  prepararGetImpartidas,
  prepararPostUnirse,
  prepararGetClase,
  prepararPutClase,
  prepararGetCodigo,
  prepararPostCodigo,
]

const pedir = async (
  prep: Pick<PreparadoRuta, "metodo" | "url" | "payload">,
  token?: string,
): Promise<LightMyRequestResponse> => {
  const respuesta = await obtenerApp().inject({
    method: prep.metodo,
    url: prep.url,
    payload: prep.payload,
    headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
  })
  cuerposRecibidos.push(respuesta.body)
  return respuesta
}

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

// El admin es único por base (índice parcial); se usa el que sembró seed:admin (S-01) con sus
// credenciales de prueba, nunca se crea uno nuevo.
const tokenAdminDePrueba = async (): Promise<string> => {
  const email = process.env.ADMIN_EMAIL
  const contrasena = process.env.ADMIN_PASSWORD
  if (!email || !contrasena)
    throw new Error("Faltan ADMIN_EMAIL/ADMIN_PASSWORD en el entorno de pruebas")
  const login = await obtenerApp().inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email, contrasena },
  })
  if (login.statusCode !== 200) {
    throw new Error(`El login del admin de prueba respondió ${login.statusCode}: ${login.body}`)
  }
  return login.json<{ tokenAcceso: string }>().tokenAcceso
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  await borrarClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("autorización de las rutas de CLASES-a", () => {
  it("PR-A15a: cada ruta: sin token, 401", async () => {
    for (const preparar of preparadores) {
      const prep = await preparar()
      const respuesta = await pedir(prep)
      expect(respuesta.statusCode, prep.nombre).toBe(401)
      expect(codigoDe(respuesta), prep.nombre).toBe("NO_AUTENTICADO")
    }
  })

  it("PR-A15b: cada ruta: con debe_cambiar_contrasena, 403 CAMBIO_DE_CONTRASENA_REQUERIDO", async () => {
    for (const preparar of preparadores) {
      const prep = await preparar()
      const conCambioPendiente = await estudianteDePrueba({ debeCambiarContrasena: true })
      const respuesta = await pedir(prep, await tokenDe(conCambioPendiente))
      expect(respuesta.statusCode, prep.nombre).toBe(403)
      expect(codigoDe(respuesta), prep.nombre).toBe("CAMBIO_DE_CONTRASENA_REQUERIDO")
    }
  })

  // M-01: el restringido debe ser un miembro de verdad de la clase del preparador (inscrito, en
  // las rutas con :claseId), para que el caso detecte que la restricción gana aunque la
  // pertenencia sea legítima; prepararRestringido lo deja así.
  it("PR-A15c: cada ruta: estudiante restringido inscrito, 403 ACCESO_RESTRINGIDO", async () => {
    for (const preparar of preparadores) {
      const prep = await preparar()
      const respuesta = await pedir(prep, await prep.prepararRestringido())
      expect(respuesta.statusCode, prep.nombre).toBe(403)
      expect(codigoDe(respuesta), prep.nombre).toBe("ACCESO_RESTRINGIDO")
    }
  })

  it("PR-A15d: cada ruta: admin, 403 ROL_NO_PERMITIDO", async () => {
    // Un solo admin por base (índice único parcial): se usa el que sembró seed:admin (S-01), con
    // sus credenciales de prueba, en lugar de crear uno nuevo por iteración.
    const token = await tokenAdminDePrueba()
    for (const preparar of preparadores) {
      const prep = await preparar()
      const respuesta = await pedir(prep, token)
      expect(respuesta.statusCode, prep.nombre).toBe(403)
      expect(codigoDe(respuesta), prep.nombre).toBe("ROL_NO_PERMITIDO")
    }
  })

  it("PR-A15e: cada ruta: rol incorrecto, 403 ROL_NO_PERMITIDO", async () => {
    for (const preparar of preparadores) {
      const prep = await preparar()
      if (prep.tokenIncorrecto === undefined) continue
      const respuesta = await pedir(prep, prep.tokenIncorrecto)
      expect(respuesta.statusCode, prep.nombre).toBe(403)
      expect(codigoDe(respuesta), prep.nombre).toBe("ROL_NO_PERMITIDO")
    }
  })

  // M-02: GET /clases/:claseId es la única ruta de pertenencia por inscripción de a, así que es la
  // única con dos "ajenos" (maestro ajeno y estudiante no inscrito); las demás con :claseId son de
  // propiedad y solo tienen el maestro ajeno (un estudiante ahí ya da ROL_NO_PERMITIDO, PR-A15e).
  it("PR-A15f: cada ruta de clase: maestro ajeno y estudiante no inscrito, 403 SIN_ACCESO_A_LA_CLASE", async () => {
    for (const preparar of preparadores) {
      const prep = await preparar()
      for (const tokenAjeno of prep.tokensAjenos) {
        const respuesta = await pedir(prep, tokenAjeno)
        expect(respuesta.statusCode, prep.nombre).toBe(403)
        expect(codigoDe(respuesta), prep.nombre).toBe("SIN_ACCESO_A_LA_CLASE")
      }
    }
  })

  it("PR-A15g: cada ruta: el caso permitido, 2xx", async () => {
    for (const preparar of preparadores) {
      const prep = await preparar()
      const respuesta = await pedir(prep, prep.tokenPermitido)
      expect(respuesta.statusCode, prep.nombre).toBeGreaterThanOrEqual(200)
      expect(respuesta.statusCode, prep.nombre).toBeLessThan(300)
      // POST /clases crea una fila de verdad (fuera de crearClaseDePrueba): se registra para que
      // el afterAll la borre antes que a su maestro (clases.maestro_id es ON DELETE RESTRICT).
      if (prep.nombre === "POST /clases") {
        idsClases.push(respuesta.json<{ clase: { id: string } }>().clase.id)
      }
    }
  })

  // M-03: para cada negación de PR-A15b a PR-A15f que aplica a la ruta (cambio pendiente,
  // restringido, admin, rol incorrecto si existe, cada ajeno), el estado que controla el
  // preparador (la fila de su clase, sus inscripciones, o el conteo de clases de su maestro) no
  // cambia. Acotado por ruta (nunca un conteo global de toda la tabla): así detecta un UPDATE
  // ajeno y no depende de lo que otros archivos de prueba escriban en paralelo (PA-12).
  it("PR-A15h: en cada caso negado, lo que controla el preparador de la ruta queda como estaba", async () => {
    const tokenAdmin = await tokenAdminDePrueba()
    for (const preparar of preparadores) {
      const prep = await preparar()
      const conCambioPendiente = await estudianteDePrueba({ debeCambiarContrasena: true })
      const negaciones: { descripcion: string; token: string }[] = [
        { descripcion: "cambio pendiente", token: await tokenDe(conCambioPendiente) },
        { descripcion: "restringido", token: await prep.prepararRestringido() },
        { descripcion: "admin", token: tokenAdmin },
      ]
      if (prep.tokenIncorrecto !== undefined) {
        negaciones.push({ descripcion: "rol incorrecto", token: prep.tokenIncorrecto })
      }
      prep.tokensAjenos.forEach((token, indice) => {
        negaciones.push({ descripcion: `ajeno ${String(indice)}`, token })
      })

      for (const { descripcion, token } of negaciones) {
        const contexto = { actorId: idDelToken(token) }
        const antes = await prep.snapshotControlado(contexto)
        await pedir(prep, token)
        const despues = await prep.snapshotControlado(contexto)
        expect(despues, `${prep.nombre} / ${descripcion}`).toEqual(antes)
      }
    }
  })

  it("PR-A16: el recorrido recursivo de toda respuesta de a no encuentra estadoPago, accesoRestringido ni email", () => {
    expect(cuerposRecibidos.length).toBeGreaterThan(0)
    const clavesProhibidas = ["estadoPago", "estado_pago", "accesoRestringido", "email"]
    for (const cuerpo of cuerposRecibidos) {
      let json: unknown
      try {
        json = JSON.parse(cuerpo)
      } catch {
        continue
      }
      const pila: unknown[] = [json]
      while (pila.length > 0) {
        const actual = pila.pop()
        if (actual === null || typeof actual !== "object") continue
        for (const [clave, valor] of Object.entries(actual as Record<string, unknown>)) {
          expect(clavesProhibidas, `clave ${clave} en ${JSON.stringify(actual)}`).not.toContain(
            clave,
          )
          pila.push(valor)
        }
      }
    }
  })
})
