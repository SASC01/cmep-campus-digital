import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba, crearUsuarioDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import { borrarMovimientosYClasesDePrueba, inscribirDePrueba } from "./ayudas-clases.js"
import { archivarClaseDePrueba } from "./ayudas-clases-archivadas.js"
import { crearEntregaDePrueba } from "./ayudas-entregas.js"
import {
  CLAVES_QUE_NUNCA_SALEN,
  clavesDe,
  codigoDe,
  contarParticipaciones,
  crearEscenarioDeForo,
  crearForoDePrueba,
  crearParticipacionDePrueba,
  pedirForo,
  rutasDelForo,
  urlForos,
  type EscenarioDeForo,
  type RutaDelForo,
} from "./ayudas-foros.js"

// FORO-01a. FORO-1A49 y FORO-1A50 (la tabla de "Autorización" por cada una de las 16 rutas) y FORO-1B01
// a FORO-1B05 (la clase archivada, que pasa a 01a por la Enmienda 7).

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}
const pedir = pedirForo(obtenerApp)

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen: crearAlmacenEnMemoria() })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

// Los roles que admite cada ruta (§D-3.1).
const ROLES: Readonly<Record<number, readonly ("estudiante" | "maestro" | "admin")[]>> = {
  1: ["maestro", "admin"],
  2: ["estudiante", "maestro", "admin"],
  3: ["estudiante", "maestro", "admin"],
  4: ["maestro", "admin"],
  5: ["maestro", "admin"],
  6: ["estudiante"],
  7: ["estudiante"],
  8: ["estudiante", "maestro", "admin"],
  9: ["estudiante"],
  10: ["estudiante", "maestro", "admin"],
  11: ["estudiante", "maestro"],
  12: ["maestro", "admin"],
  13: ["maestro", "admin"],
  14: ["maestro", "admin"],
  15: ["maestro", "admin"],
  16: ["maestro"],
}

const LECTURAS = [2, 3, 6, 7, 8, 10, 12, 13, 14, 15]
const ESCRITURAS = [1, 4, 5, 9, 11, 16]

interface Montaje {
  e: EscenarioDeForo
  foroId: string
  principalId: string
  rutas: RutaDelForo[]
}

const montar = async (): Promise<Montaje> => {
  const e = await crearEscenarioDeForo(idsUsuarios, idsClases)
  const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
  const principalId = await crearParticipacionDePrueba({ foroId, autorId: e.otroAlumno.id })
  const rutas = rutasDelForo({
    claseId: e.claseId,
    foroId,
    participacionId: principalId,
    alumnoId: e.alumno.id,
  })
  return { e, foroId, principalId, rutas }
}

const tokenDe = (e: EscenarioDeForo, rol: "estudiante" | "maestro" | "admin"): string => {
  if (rol === "estudiante") return e.tokenAlumno
  if (rol === "maestro") return e.tokenMaestro
  return e.tokenAdmin
}

const pedirRuta = (ruta: RutaDelForo, token?: string): Promise<LightMyRequestResponse> =>
  pedir({
    method: ruta.method,
    url: ruta.url,
    ...(token === undefined ? {} : { token }),
    ...(ruta.payload === undefined ? {} : { payload: ruta.payload }),
  })

describe("FORO-1A49: la cadena de middleware en cada una de las 16 rutas del foro", () => {
  it("FORO-1A49: sin sesión, cada ruta responde 401 NO_AUTENTICADO", async () => {
    const { rutas } = await montar()
    expect(rutas).toHaveLength(16)
    for (const ruta of rutas) {
      const respuesta = await pedirRuta(ruta)
      expect(respuesta.statusCode, `ruta ${String(ruta.numero)}`).toBe(401)
      expect(codigoDe(respuesta)).toBe("NO_AUTENTICADO")
    }
  })

  it("FORO-1A49: con un rol que la ruta no admite, 403 ROL_NO_PERMITIDO (el admin en 6, 7, 9, 11 y 16; el maestro en 6, 7 y 9; el alumno en las de gestión)", async () => {
    const { e, rutas, foroId } = await montar()
    let negadas = 0
    for (const ruta of rutas) {
      for (const rol of ["estudiante", "maestro", "admin"] as const) {
        if (ROLES[ruta.numero]?.includes(rol)) continue
        const respuesta = await pedirRuta(ruta, tokenDe(e, rol))
        expect(respuesta.statusCode, `ruta ${String(ruta.numero)} como ${rol}`).toBe(403)
        expect(codigoDe(respuesta)).toBe("ROL_NO_PERMITIDO")
        negadas += 1
      }
    }
    // 1, 4, 5, 12-15: alumno (7); 6, 7, 9: maestro y admin (6); 11: admin (1); 16: alumno y admin (2).
    expect(negadas).toBe(16)
    // Nada se escribió: el foro sigue con su única principal.
    expect(await contarParticipaciones(foroId)).toBe(1)
  })

  it("FORO-1A49: un maestro de otra clase y un alumno no inscrito reciben 403 SIN_ACCESO_A_LA_CLASE en cada ruta de su rol", async () => {
    const { e, rutas } = await montar()
    for (const ruta of rutas) {
      const roles = ROLES[ruta.numero] ?? []
      const ajenos = [
        ...(roles.includes("maestro") ? [e.tokenMaestroAjeno] : []),
        ...(roles.includes("estudiante") ? [e.tokenAlumnoAjeno] : []),
      ]
      expect(ajenos.length, `ruta ${String(ruta.numero)}`).toBeGreaterThan(0)
      for (const token of ajenos) {
        const respuesta = await pedirRuta(ruta, token)
        expect(respuesta.statusCode, `ruta ${String(ruta.numero)}`).toBe(403)
        expect(codigoDe(respuesta)).toBe("SIN_ACCESO_A_LA_CLASE")
      }
    }
  })

  it("FORO-1A49: una clase inexistente responde lo mismo que una ajena (403 SIN_ACCESO_A_LA_CLASE)", async () => {
    const { e, foroId, principalId } = await montar()
    const rutas = rutasDelForo({
      claseId: "00000000-0000-4000-8000-000000000000",
      foroId,
      participacionId: principalId,
      alumnoId: e.alumno.id,
    })
    for (const ruta of rutas) {
      const rol = ROLES[ruta.numero]?.[0]
      if (rol === undefined)
        throw new Error(`Precondición: la ruta ${String(ruta.numero)} tiene roles`)
      const respuesta = await pedirRuta(
        ruta,
        rol === "estudiante" ? e.tokenAlumnoAjeno : e.tokenMaestroAjeno,
      )
      expect(respuesta.statusCode, `ruta ${String(ruta.numero)}`).toBe(403)
      expect(codigoDe(respuesta)).toBe("SIN_ACCESO_A_LA_CLASE")
    }
  })

  it("FORO-1A49: un alumno inscrito con acceso restringido recibe 403 ACCESO_RESTRINGIDO en las 16 rutas (RN-09)", async () => {
    const { e, rutas, foroId } = await montar()
    const restringido = await crearUsuarioDePrueba(idsUsuarios, {
      nombre: "Alumna Restringida",
      accesoRestringido: true,
      motivoRestriccion: "Pago pendiente",
    })
    await inscribirDePrueba(e.claseId, restringido.id)
    const token = await firmarTokenDePrueba({ usuarioId: restringido.id })
    for (const ruta of rutas) {
      const respuesta = await pedirRuta(ruta, token)
      expect(respuesta.statusCode, `ruta ${String(ruta.numero)}`).toBe(403)
      expect(codigoDe(respuesta)).toBe("ACCESO_RESTRINGIDO")
    }
    expect(await contarParticipaciones(foroId)).toBe(1)
  })
})

describe("FORO-1A50: ninguna respuesta del foro lleva estado de pago, restricción, correo, rol, trabajo ni adjuntos requeridos", () => {
  it("FORO-1A50: las 16 rutas, con éxito y con error, para el alumno, el maestro y el admin", async () => {
    const { e, rutas, foroId } = await montar()
    // El alumno de la ruta con deuda: aun así nada del estado de pago sale, ni al maestro.
    await crearEntregaDePrueba({ tareaId: foroId, alumnoId: e.alumno.id, estado: "entregado" })
    await obtenerDb().usuario.update({
      where: { id: e.alumno.id },
      data: { estadoPago: "deudor" },
      select: { id: true },
    })
    let revisadas = 0
    for (const ruta of rutas) {
      for (const rol of ["estudiante", "maestro", "admin"] as const) {
        const respuesta = await pedirRuta(ruta, tokenDe(e, rol))
        if (respuesta.statusCode === 204) continue
        const claves = clavesDe(respuesta.json())
        for (const prohibida of CLAVES_QUE_NUNCA_SALEN) {
          expect(claves, `ruta ${String(ruta.numero)} como ${rol}`).not.toContain(prohibida)
        }
        revisadas += 1
      }
    }
    expect(revisadas).toBeGreaterThan(40)
  })
})

describe("FORO-1B01 a FORO-1B05: el foro en una clase archivada", () => {
  it("FORO-1B01: en una clase archivada, cada escritura responde 409 CLASE_ARCHIVADA al rol que la admite y 403 al que no, sin escribir nada", async () => {
    const { e, rutas, foroId } = await montar()
    await archivarClaseDePrueba(e.claseId)
    let casos = 0
    for (const ruta of rutas.filter(({ numero }) => ESCRITURAS.includes(numero))) {
      for (const rol of ["estudiante", "maestro", "admin"] as const) {
        const respuesta = await pedirRuta(ruta, tokenDe(e, rol))
        const admitido = ROLES[ruta.numero]?.includes(rol) ?? false
        expect(respuesta.statusCode, `ruta ${String(ruta.numero)} como ${rol}`).toBe(
          admitido ? 409 : 403,
        )
        expect(codigoDe(respuesta)).toBe(admitido ? "CLASE_ARCHIVADA" : "ROL_NO_PERMITIDO")
        casos += 1
      }
    }
    expect(casos).toBe(18)
    expect(await contarParticipaciones(foroId)).toBe(1)
    const lista = await pedir({ method: "GET", url: urlForos(e.claseId), token: e.tokenMaestro })
    expect(lista.json()).toMatchObject({ foros: [{ id: foroId }] })
  })

  it("FORO-1B02: en una clase archivada, las lecturas responden 200 al maestro y al admin y 409 CLASE_ARCHIVADA al alumno", async () => {
    const { e, rutas } = await montar()
    await archivarClaseDePrueba(e.claseId)
    for (const ruta of rutas.filter(({ numero }) => LECTURAS.includes(numero))) {
      for (const rol of ["estudiante", "maestro", "admin"] as const) {
        if (!(ROLES[ruta.numero]?.includes(rol) ?? false)) continue
        const respuesta = await pedirRuta(ruta, tokenDe(e, rol))
        if (rol === "estudiante") {
          expect(respuesta.statusCode, `ruta ${String(ruta.numero)} como alumno`).toBe(409)
          expect(codigoDe(respuesta)).toBe("CLASE_ARCHIVADA")
          continue
        }
        expect(respuesta.statusCode, `ruta ${String(ruta.numero)} como ${rol}`).toBe(200)
      }
    }
  })

  it("FORO-1B03: en una clase archivada, una clase ajena o un rol incorrecto siguen dando 403 antes de mirar si está archivada", async () => {
    const { e, rutas } = await montar()
    await archivarClaseDePrueba(e.claseId)
    for (const ruta of rutas) {
      const roles = ROLES[ruta.numero] ?? []
      const token = roles.includes("maestro") ? e.tokenMaestroAjeno : e.tokenAlumnoAjeno
      const ajena = await pedirRuta(ruta, token)
      expect(ajena.statusCode, `ruta ${String(ruta.numero)}`).toBe(403)
      expect(codigoDe(ajena)).toBe("SIN_ACCESO_A_LA_CLASE")
      if (!roles.includes("estudiante")) {
        const rol = await pedirRuta(ruta, e.tokenAlumno)
        expect(rol.statusCode, `ruta ${String(ruta.numero)}`).toBe(403)
        expect(codigoDe(rol)).toBe("ROL_NO_PERMITIDO")
      }
    }
  })

  it("FORO-1B05: restaurar la clase vuelve a abrir las escrituras del foro", async () => {
    const { e, rutas, foroId } = await montar()
    await archivarClaseDePrueba(e.claseId)
    const participar = rutas.find(({ numero }) => numero === 9)
    if (participar === undefined) throw new Error("Precondición: la ruta 9 existe")
    expect((await pedirRuta(participar, e.tokenAlumno)).statusCode).toBe(409)
    const restaurada = await pedir({
      method: "POST",
      url: `/api/admin/clases/${e.claseId}/restaurar`,
      token: e.tokenAdmin,
    })
    expect(restaurada.statusCode, restaurada.body).toBe(200)
    const respuesta = await pedirRuta(participar, e.tokenAlumno)
    expect(respuesta.statusCode, respuesta.body).toBe(201)
    expect(await contarParticipaciones(foroId)).toBe(2)
  })
})
