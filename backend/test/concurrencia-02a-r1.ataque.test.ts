import { randomBytes, randomUUID } from "node:crypto"

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
  idDelAdminDePrueba,
  leerInscripcion,
  leerMovimientos,
} from "./ayudas-clases.js"

// Ataque del Tester (CLASES-02a, ronda 1): tope de 2 y mínimo de 1 con peticiones simultáneas
// (punto 3), escritura doble de clases.maestro_id después de cualquier secuencia (punto 4), orden
// S-05 de los maestros cuando se asigna justo después de crear, y movimientos de inscripción del
// admin y del maestro mezclados en paralelo (punto 8). Paralelismo acotado (de 2 a 8) para no
// agotar el pool de conexiones del proceso (10).

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
let idAdmin = ""
let tokenAdmin = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const ficha = (): string => `qz${randomBytes(5).toString("hex")}`

interface Cuenta {
  id: string
  nombre: string
  token: string
}

const crearCuenta = async (
  nombre: string,
  rol: "estudiante" | "maestro" = "estudiante",
): Promise<Cuenta> => {
  const { id } = await obtenerDb().usuario.create({
    data: {
      email: `c02a-r1-${randomUUID()}@pruebas.local`,
      hashContrasena: "sin-uso-en-esta-prueba",
      nombre,
      nombreBusqueda: normalizarParaBusqueda(nombre),
      rol,
    },
    select: { id: true },
  })
  idsUsuarios.push(id)
  return { id, nombre, token: await firmarTokenDePrueba({ usuarioId: id }) }
}

const pedir = (
  method: "GET" | "POST" | "DELETE",
  url: string,
  token: string,
  payload?: unknown,
): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method,
    url,
    ...(payload === undefined ? {} : { payload: payload as Record<string, unknown> }),
    headers: { authorization: `Bearer ${token}` },
  })

const codigoDe = (r: LightMyRequestResponse): string => {
  try {
    return (JSON.parse(r.body) as { error?: { codigo?: string } }).error?.codigo ?? ""
  } catch {
    return ""
  }
}

const asignar = (claseId: string, maestroId: string) =>
  pedir("POST", `/api/admin/clases/${claseId}/maestros`, tokenAdmin, { maestroId })
const retirar = (claseId: string, maestroId: string) =>
  pedir("DELETE", `/api/admin/clases/${claseId}/maestros/${maestroId}`, tokenAdmin)

const estadoDe = async (claseId: string) => {
  const maestros = (
    await obtenerDb().$queryRaw<{ maestro_id: string }[]>`
      SELECT maestro_id::text AS maestro_id FROM maestros_de_clase
      WHERE clase_id = ${claseId}::uuid ORDER BY creado_en, maestro_id`
  ).map((fila) => fila.maestro_id)
  const clase = await obtenerDb().clase.findUnique({
    where: { id: claseId },
    select: { maestroId: true },
  })
  return { maestros, maestroId: clase?.maestroId ?? "(sin clase)" }
}

const resumen = (respuestas: LightMyRequestResponse[]): string[] =>
  respuestas.map((r) => `${r.statusCode} ${codigoDe(r)}`.trim()).sort()

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
  idAdmin = await idDelAdminDePrueba()
  tokenAdmin = await firmarTokenDePrueba({ usuarioId: idAdmin })
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("ataque CLASES-02a r1: tope y mínimo en concurrencia (punto 3)", () => {
  it("6 asignaciones simultáneas de 6 maestros distintos a una clase con 1: una 200, cinco 409 TOPE_DE_MAESTROS, ninguna 5xx; al final 2 y maestro_id asignado", async () => {
    const t = ficha()
    const original = await crearCuenta(`Original ${t}`, "maestro")
    const candidatos = await Promise.all(
      Array.from({ length: 6 }, (_, i) => crearCuenta(`Cand ${i} ${t}`, "maestro")),
    )
    const clase = await crearClaseDePrueba(idsClases, { maestroId: original.id })
    const respuestas = await Promise.all(candidatos.map((c) => asignar(clase.id, c.id)))
    expect(resumen(respuestas)).toEqual([
      "200",
      "409 TOPE_DE_MAESTROS",
      "409 TOPE_DE_MAESTROS",
      "409 TOPE_DE_MAESTROS",
      "409 TOPE_DE_MAESTROS",
      "409 TOPE_DE_MAESTROS",
    ])
    const estado = await estadoDe(clase.id)
    expect(estado.maestros).toHaveLength(2)
    expect(estado.maestros[0]).toBe(original.id)
    expect(estado.maestros).toContain(estado.maestroId)
    const ganador = respuestas.find((r) => r.statusCode === 200)
    expect(ganador?.json<{ maestros: { id: string }[] }>().maestros.map((m) => m.id)).toEqual(
      estado.maestros,
    )
  })

  it("el mismo maestro asignado 6 veces a la vez (mitad en mayúsculas): seis 200, una sola fila, nunca un 500 por la PK", async () => {
    const t = ficha()
    const original = await crearCuenta(`Original ${t}`, "maestro")
    const nuevo = await crearCuenta(`Nuevo ${t}`, "maestro")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: original.id })
    const respuestas = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        asignar(clase.id, i % 2 === 0 ? nuevo.id : nuevo.id.toUpperCase()),
      ),
    )
    expect(resumen(respuestas)).toEqual(["200", "200", "200", "200", "200", "200"])
    expect((await estadoDe(clase.id)).maestros).toEqual([original.id, nuevo.id])
  })

  it("retirar a los dos maestros de una clase a la vez: una 200 y una 409 CLASE_SIN_MAESTRO; queda exactamente uno y maestro_id es ese", async () => {
    const t = ficha()
    for (let vuelta = 0; vuelta < 4; vuelta++) {
      const a = await crearCuenta(`A${vuelta} ${t}`, "maestro")
      const b = await crearCuenta(`B${vuelta} ${t}`, "maestro")
      const clase = await crearClaseDePrueba(idsClases, {
        maestroId: a.id,
        maestroIds: [a.id, b.id],
      })
      const respuestas = await Promise.all([retirar(clase.id, a.id), retirar(clase.id, b.id)])
      expect(resumen(respuestas), `vuelta ${vuelta}`).toEqual(["200", "409 CLASE_SIN_MAESTRO"])
      const estado = await estadoDe(clase.id)
      expect(estado.maestros, `vuelta ${vuelta}`).toHaveLength(1)
      expect(estado.maestroId, `vuelta ${vuelta}`).toBe(estado.maestros[0])
    }
  })

  it("asignar y retirar al mismo maestro a la vez, y reasignar (retirar uno y asignar otro) en paralelo: nunca 0 ni 3 maestros, nunca 5xx, y maestro_id siempre asignado", async () => {
    const t = ficha()
    const fallas: string[] = []
    for (let vuelta = 0; vuelta < 6; vuelta++) {
      const a = await crearCuenta(`A${vuelta} ${t}`, "maestro")
      const b = await crearCuenta(`B${vuelta} ${t}`, "maestro")
      const c = await crearCuenta(`C${vuelta} ${t}`, "maestro")
      const clase = await crearClaseDePrueba(idsClases, { maestroId: a.id })
      const respuestas = await Promise.all([
        asignar(clase.id, b.id),
        retirar(clase.id, b.id),
        retirar(clase.id, a.id),
        asignar(clase.id, c.id),
        asignar(clase.id, b.id.toUpperCase()),
        retirar(clase.id, c.id),
      ])
      const cincos = respuestas.filter((r) => r.statusCode >= 500)
      if (cincos.length > 0)
        fallas.push(`vuelta ${vuelta}: ${cincos.map((r) => r.body).join(" | ")}`)
      const estado = await estadoDe(clase.id)
      if (estado.maestros.length < 1 || estado.maestros.length > 2)
        fallas.push(`vuelta ${vuelta}: ${estado.maestros.length} maestros`)
      if (!estado.maestros.includes(estado.maestroId))
        fallas.push(
          `vuelta ${vuelta}: maestro_id ${estado.maestroId} no asignado (${estado.maestros.join(",")})`,
        )
      const ultimas = respuestas.filter((r) => r.statusCode === 200).at(-1)
      if (ultimas === undefined) fallas.push(`vuelta ${vuelta}: ninguna 200`)
    }
    expect(fallas).toEqual([])
  })

  it("secuencia larga al azar de asignar y retirar (8 en paralelo por ronda, 5 rondas, 4 maestros): el invariante 1 ≤ maestros ≤ 2 y maestro_id ∈ asignados se sostiene después de cada ronda", async () => {
    const t = ficha()
    const maestros = await Promise.all(
      Array.from({ length: 4 }, (_, i) => crearCuenta(`M${i} ${t}`, "maestro")),
    )
    const [primero] = maestros
    if (!primero) throw new Error("Precondición: faltan maestros")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: primero.id })
    const fallas: string[] = []
    for (let ronda = 0; ronda < 5; ronda++) {
      const operaciones = Array.from({ length: 8 }, () => {
        const m = maestros[Math.floor(Math.random() * maestros.length)]
        if (!m) throw new Error("índice fuera de rango")
        return Math.random() < 0.5 ? asignar(clase.id, m.id) : retirar(clase.id, m.id)
      })
      const respuestas = await Promise.all(operaciones)
      const inesperadas = respuestas.filter(
        (r) =>
          r.statusCode !== 200 &&
          !(
            r.statusCode === 409 && ["TOPE_DE_MAESTROS", "CLASE_SIN_MAESTRO"].includes(codigoDe(r))
          ),
      )
      if (inesperadas.length > 0)
        fallas.push(
          `ronda ${ronda}: ${inesperadas.map((r) => `${r.statusCode} ${r.body}`).join(" | ")}`,
        )
      const estado = await estadoDe(clase.id)
      if (estado.maestros.length < 1 || estado.maestros.length > 2)
        fallas.push(`ronda ${ronda}: ${estado.maestros.length} maestros`)
      if (!estado.maestros.includes(estado.maestroId))
        fallas.push(`ronda ${ronda}: maestro_id no asignado`)
      const detalle = await pedir("GET", `/api/clases/${clase.id}`, tokenAdmin)
      const enDetalle = detalle.json<{ clase: { maestros: { id: string }[] } }>().clase.maestros
      if (JSON.stringify(enDetalle.map((m) => m.id)) !== JSON.stringify(estado.maestros))
        fallas.push(`ronda ${ronda}: el detalle no coincide con maestros_de_clase`)
    }
    expect(fallas).toEqual([])
  })
})

describe("ataque CLASES-02a r1: orden S-05 al asignar justo después de crear", () => {
  it("crear con un maestro por la API y asignar otro enseguida: el primero sigue primero (maestro = el de la creación) en el detalle, la lista del admin e inscritas", async () => {
    const t = ficha()
    const fallas: string[] = []
    const [reloj] = await obtenerDb().$queryRaw<{ base: Date }[]>`SELECT now() AS base`
    const desfaseMs = reloj === undefined ? Number.NaN : Date.now() - reloj.base.getTime()
    for (let vuelta = 0; vuelta < 5; vuelta++) {
      const primero = await crearCuenta(`Primero${vuelta} ${t}`, "maestro")
      const segundo = await crearCuenta(`Segundo${vuelta} ${t}`, "maestro")
      const creada = await pedir("POST", "/api/admin/clases", tokenAdmin, {
        nombre: `Orden ${vuelta} ${t}`,
        maestroIds: [primero.id],
      })
      expect(creada.statusCode, creada.body).toBe(201)
      const claseId = creada.json<{ clase: { id: string } }>().clase.id
      idsClases.push(claseId)
      const asignada = await asignar(claseId, segundo.id)
      expect(asignada.statusCode, asignada.body).toBe(200)
      const orden = asignada.json<{ maestros: { id: string }[] }>().maestros.map((m) => m.id)
      if (orden[0] !== primero.id)
        fallas.push(`vuelta ${vuelta}: el recién asignado quedó primero (${orden.join(",")})`)
      const detalle = (await pedir("GET", `/api/clases/${claseId}`, tokenAdmin)).json<{
        clase: { maestro: { id: string } }
      }>()
      if (detalle.clase.maestro.id !== primero.id)
        fallas.push(`vuelta ${vuelta}: maestro (principal) = ${detalle.clase.maestro.id}`)
    }
    expect(fallas, `desfase reloj de la app − reloj de la base: ${String(desfaseMs)} ms`).toEqual(
      [],
    )
  })
})

describe("ataque CLASES-02a r1: movimientos del admin y del maestro mezclados (punto 8)", () => {
  it("altas y bajas cruzadas del admin y del maestro sobre 3 alumnos, en paralelo: cada alumno alterna alta/baja por secuencia, cada movimiento lleva un actorId de los dos, y el admin aparece como actor", async () => {
    const t = ficha()
    const dueno = await crearCuenta(`Dueño ${t}`, "maestro")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: dueno.id })
    const alumnos = await Promise.all([1, 2, 3].map((i) => crearCuenta(`Alumno ${i} ${t}`)))
    const fallas: string[] = []
    for (let ronda = 0; ronda < 3; ronda++) {
      const operaciones = alumnos.flatMap((alumno) => [
        pedir("POST", `/api/clases/${clase.id}/alumnos`, tokenAdmin, { alumnoId: alumno.id }),
        pedir("POST", `/api/clases/${clase.id}/alumnos`, dueno.token, { alumnoId: alumno.id }),
        pedir(
          "DELETE",
          `/api/clases/${clase.id}/alumnos/${alumno.id}`,
          ronda % 2 ? tokenAdmin : dueno.token,
        ),
      ])
      const respuestas = await Promise.all(operaciones)
      for (const r of respuestas)
        if (r.statusCode >= 300)
          fallas.push(`ronda ${ronda}: ${r.statusCode} ${r.body.slice(0, 120)}`)
    }
    // Una alta segura del admin al final, para que su id aparezca seguro como actor.
    const ultima = alumnos[0]
    if (!ultima) throw new Error("Precondición: faltan alumnos")
    if ((await leerInscripcion(clase.id, ultima.id)) !== null)
      await pedir("DELETE", `/api/clases/${clase.id}/alumnos/${ultima.id}`, dueno.token)
    const alta = await pedir("POST", `/api/clases/${clase.id}/alumnos`, tokenAdmin, {
      alumnoId: ultima.id,
    })
    expect(alta.json<{ yaEstaba: boolean }>().yaEstaba).toBe(false)

    const movimientos = await leerMovimientos(clase.id)
    const secuencias = movimientos.map((m) => m.secuencia)
    expect([...secuencias].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))).toEqual(secuencias)
    for (const alumno of alumnos) {
      const propios = movimientos.filter((m) => m.alumnoId === alumno.id)
      propios.forEach((m, i) => {
        if (m.tipo !== (i % 2 === 0 ? "alta" : "baja"))
          fallas.push(`${alumno.nombre}: ${propios.map((p) => p.tipo).join(",")}`)
      })
      const inscrito = (await leerInscripcion(clase.id, alumno.id)) !== null
      if ((propios.at(-1)?.tipo === "alta") !== inscrito)
        fallas.push(
          `${alumno.nombre}: último movimiento ${String(propios.at(-1)?.tipo)} e inscrito ${String(inscrito)}`,
        )
    }
    for (const m of movimientos)
      if (m.actorId !== idAdmin && m.actorId !== dueno.id) fallas.push(`actor ajeno ${m.actorId}`)
    expect(movimientos.at(-1)).toMatchObject({
      tipo: "alta",
      actorId: idAdmin,
      alumnoId: ultima.id,
    })
    expect(fallas).toEqual([])
  })
})
