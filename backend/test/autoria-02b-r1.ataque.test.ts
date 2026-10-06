import { randomBytes, randomUUID } from "node:crypto"

import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { normalizarParaBusqueda } from "../src/core/auth/normalizacion.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  crearComentarioDePrueba,
  crearPublicacionDePrueba,
  idDelAdminDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"

// Ataque del Tester (CLASES-02b, ronda 1; "Puntos de ataque / 02b", puntos 1 y 5): la regla de
// autoría (P-01 b, §D-2B2 y §D-2B3) contra la API en todas las combinaciones actor × autor × tipo,
// con un oráculo propio escrito desde el plan (no desde core/autoria.ts): los dos maestros de la
// clase, el maestro retirado después de publicar, un maestro de otra clase, dos alumnos, un alumno no
// inscrito y el admin; puedeBorrar de cada lista contra el resultado real del DELETE; que lo negado
// no escribe nada; el alumno dado de baja y de alta otra vez; y carreras de borrado. Cuentas creadas
// directamente (sin argon2: solo se usa el token firmado).

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
const almacen = crearAlmacenEnMemoria()
let idAdmin = ""
let tokenAdmin = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen })
  await app.ready()
  idAdmin = await idDelAdminDePrueba()
  tokenAdmin = await firmarTokenDePrueba({ usuarioId: idAdmin })
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const ficha = (): string => `qa${randomBytes(5).toString("hex")}`

interface Cuenta {
  id: string
  email: string
  nombre: string
  token: string
}

const crearCuenta = async (nombre: string, rol: "estudiante" | "maestro"): Promise<Cuenta> => {
  const email = `a02b-r1-${randomUUID()}@pruebas.local`
  const { id } = await obtenerDb().usuario.create({
    data: {
      email,
      hashContrasena: "sin-uso-en-esta-prueba",
      nombre,
      nombreBusqueda: normalizarParaBusqueda(nombre),
      rol,
    },
    select: { id: true },
  })
  idsUsuarios.push(id)
  return { id, email, nombre, token: await firmarTokenDePrueba({ usuarioId: id }) }
}

const pedir = (
  method: "GET" | "POST" | "DELETE",
  url: string,
  token: string,
  payload?: Record<string, unknown>,
): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method,
    url,
    ...(payload === undefined ? {} : { payload }),
    headers: { authorization: `Bearer ${token}` },
  })

const codigoDe = (r: LightMyRequestResponse): string => {
  try {
    return (JSON.parse(r.body) as { error?: { codigo?: string } }).error?.codigo ?? ""
  } catch {
    return ""
  }
}

const resultado = (r: LightMyRequestResponse): string =>
  r.statusCode < 300 ? String(r.statusCode) : `${String(r.statusCode)} ${codigoDe(r)}`

// --- Oráculo escrito desde el plan (matriz de "Autorización", §D-2B2 y §D-2B3) ---

type Actor = "E1" | "E2" | "M1" | "M2" | "AD" | "MX" | "MR" | "EN"
type Autor = "E1" | "E2" | "M1" | "M2" | "AD" | "MR"
const ROL_DE: Record<Actor, "estudiante" | "maestro" | "admin"> = {
  E1: "estudiante",
  E2: "estudiante",
  EN: "estudiante",
  M1: "maestro",
  M2: "maestro",
  MX: "maestro",
  MR: "maestro",
  AD: "admin",
}
// Solo E1, E2, M1, M2 y el admin pasan el sexto paso en la clase.
const EN_LA_CLASE = new Set<Actor>(["E1", "E2", "M1", "M2", "AD"])

const reglaDeAutoria = (actor: Actor, autor: Autor): boolean => {
  if (ROL_DE[actor] === "admin") return true
  if (actor === autor) return true
  return ROL_DE[actor] === "maestro" && ROL_DE[autor] === "estudiante"
}

// DELETE de una publicación: maestro y admin, con "propiedad" (paso 5 antes del sexto).
const esperadoPublicacion = (actor: Actor, autor: Autor): string => {
  if (ROL_DE[actor] === "estudiante") return "403 ROL_NO_PERMITIDO"
  if (!EN_LA_CLASE.has(actor)) return "403 SIN_ACCESO_A_LA_CLASE"
  return reglaDeAutoria(actor, autor) ? "204" : "403 BORRADO_NO_PERMITIDO"
}

// DELETE de un comentario por la ruta general: estudiante, maestro y admin, con "inscripcion".
const esperadoComentario = (actor: Actor, autor: Autor): string => {
  if (!EN_LA_CLASE.has(actor)) return "403 SIN_ACCESO_A_LA_CLASE"
  return reglaDeAutoria(actor, autor) ? "204" : "403 BORRADO_NO_PERMITIDO"
}

// --- Escenario: una clase con M1 y M2 (MR estuvo asignado, publicó, comentó y fue retirado) ---

interface Escenario {
  claseId: string
  cuentas: Record<Exclude<Actor, "AD">, Cuenta>
  token: Record<Actor, string>
  publicaciones: Record<"P_M1" | "P_M2" | "P_AD" | "P_MR", string>
  autorDePublicacion: Record<string, Autor>
  comentarios: { id: string; publicacionId: string; autor: Autor }[]
  archivoDeM2: string
}

const escenario = async (): Promise<Escenario> => {
  const t = ficha()
  const M1 = await crearCuenta(`Maestra Uno ${t}`, "maestro")
  const M2 = await crearCuenta(`Maestro Dos ${t}`, "maestro")
  const MR = await crearCuenta(`Maestro Retirado ${t}`, "maestro")
  const MX = await crearCuenta(`Maestro Ajeno ${t}`, "maestro")
  const E1 = await crearCuenta(`Alumna Uno ${t}`, "estudiante")
  const E2 = await crearCuenta(`Alumno Dos ${t}`, "estudiante")
  const EN = await crearCuenta(`Alumna Fuera ${t}`, "estudiante")
  const clase = await crearClaseDePrueba(idsClases, {
    maestroId: M1.id,
    maestroIds: [M1.id, MR.id],
  })
  const otra = await crearClaseDePrueba(idsClases, { maestroId: MX.id })
  await inscribirDePrueba(clase.id, E1.id)
  await inscribirDePrueba(clase.id, E2.id)
  await inscribirDePrueba(otra.id, EN.id)

  const P_M1 = await crearPublicacionDePrueba({ claseId: clase.id, autorId: M1.id })
  const P_MR = await crearPublicacionDePrueba({ claseId: clase.id, autorId: MR.id })
  const P_AD = await crearPublicacionDePrueba({ claseId: clase.id, autorId: idAdmin })
  const comentarios: Escenario["comentarios"] = []
  const comentar = async (publicacionId: string, autor: Autor, autorId: string) =>
    comentarios.push({
      id: await crearComentarioDePrueba({ publicacionId, autorId }),
      publicacionId,
      autor,
    })
  await comentar(P_M1, "MR", MR.id)

  // MR se retira por la API del admin y M2 entra en su lugar (tope de 2).
  const retiro = await pedir(
    "DELETE",
    `/api/admin/clases/${clase.id}/maestros/${MR.id}`,
    tokenAdmin,
  )
  expect(retiro.statusCode, `Precondición: retirar a MR: ${retiro.body}`).toBe(200)
  const alta = await pedir("POST", `/api/admin/clases/${clase.id}/maestros`, tokenAdmin, {
    maestroId: M2.id,
  })
  expect(alta.statusCode, `Precondición: asignar a M2: ${alta.body}`).toBe(200)

  const P_M2 = await crearPublicacionDePrueba({
    claseId: clase.id,
    autorId: M2.id,
    tipo: "material",
  })
  const archivo = await crearArchivoDePrueba({
    claseId: clase.id,
    subidoPor: M2.id,
    estado: "confirmado",
    publicacionId: P_M2,
  })
  await comentar(P_AD, "E1", E1.id)
  await comentar(P_AD, "E2", E2.id)
  await comentar(P_AD, "M2", M2.id)
  await comentar(P_M1, "E1", E1.id)
  await comentar(P_M1, "M1", M1.id)
  await comentar(P_M1, "M2", M2.id)
  await comentar(P_M2, "E2", E2.id)

  return {
    claseId: clase.id,
    cuentas: { E1, E2, EN, M1, M2, MX, MR },
    token: {
      E1: E1.token,
      E2: E2.token,
      EN: EN.token,
      M1: M1.token,
      M2: M2.token,
      MX: MX.token,
      MR: MR.token,
      AD: tokenAdmin,
    },
    publicaciones: { P_M1, P_M2, P_AD, P_MR },
    autorDePublicacion: { [P_M1]: "M1", [P_M2]: "M2", [P_AD]: "AD", [P_MR]: "MR" },
    comentarios,
    archivoDeM2: archivo.id,
  }
}

const huella = async (e: Escenario) => {
  const publicaciones = await obtenerDb().publicacion.findMany({
    where: { claseId: e.claseId },
    select: { id: true },
    orderBy: { id: "asc" },
  })
  const comentarios = await obtenerDb().comentario.findMany({
    where: { publicacion: { claseId: e.claseId } },
    select: { id: true, texto: true },
    orderBy: { id: "asc" },
  })
  const archivos = await obtenerDb().archivo.findMany({
    where: { claseId: e.claseId },
    select: { id: true, estado: true, publicacionId: true },
    orderBy: { id: "asc" },
  })
  return { publicaciones, comentarios, archivos }
}

const urlPublicaciones = (claseId: string) => `/api/clases/${claseId}/publicaciones`
const urlComentarios = (claseId: string, publicacionId: string) =>
  `${urlPublicaciones(claseId)}/${publicacionId}/comentarios`

const ACTORES: Actor[] = ["E1", "E2", "M1", "M2", "AD", "MX", "MR", "EN"]

describe("ataque CLASES-02b r1: autoría actor × autor × tipo contra la API", () => {
  it.each(ACTORES)(
    "%s: cada DELETE responde lo del oráculo del plan, lo negado no escribe nada y puedeBorrar de las listas coincide con el DELETE",
    { timeout: 60_000 },
    async (actor) => {
      const e = await escenario()
      const token = e.token[actor]
      const fallas: string[] = []

      // 1. Las listas: los miembros ven puedeBorrar; los de fuera, 403 SIN_ACCESO_A_LA_CLASE.
      const lista = await pedir("GET", `${urlPublicaciones(e.claseId)}?limite=100`, token)
      const listaDeclarada = new Map<string, boolean>()
      if (EN_LA_CLASE.has(actor)) {
        expect(lista.statusCode, lista.body).toBe(200)
        for (const p of lista.json<{ publicaciones: { id: string; puedeBorrar: boolean }[] }>()
          .publicaciones)
          listaDeclarada.set(p.id, p.puedeBorrar)
        expect(listaDeclarada.size).toBe(4)
        for (const publicacionId of Object.values(e.publicaciones)) {
          const r = await pedir(
            "GET",
            `${urlComentarios(e.claseId, publicacionId)}?limite=100`,
            token,
          )
          expect(r.statusCode, r.body).toBe(200)
          for (const c of r.json<{ comentarios: { id: string; puedeBorrar: boolean }[] }>()
            .comentarios)
            listaDeclarada.set(c.id, c.puedeBorrar)
        }
        expect(listaDeclarada.size).toBe(4 + e.comentarios.length)
      } else {
        expect(resultado(lista)).toBe("403 SIN_ACCESO_A_LA_CLASE")
      }

      // 2. Primero todo lo que el oráculo niega, con la huella antes y después.
      const casosComentario = e.comentarios.map((c) => ({
        tipo: "comentario" as const,
        id: c.id,
        url: `${urlComentarios(e.claseId, c.publicacionId)}/${c.id}`,
        esperado: esperadoComentario(actor, c.autor),
        autor: c.autor,
      }))
      const casosPublicacion = Object.values(e.publicaciones).map((id) => {
        const autor = e.autorDePublicacion[id] ?? "AD"
        return {
          tipo: "publicacion" as const,
          id,
          url: `${urlPublicaciones(e.claseId)}/${id}`,
          esperado: esperadoPublicacion(actor, autor),
          autor,
        }
      })
      const negados = [...casosComentario, ...casosPublicacion].filter((c) => c.esperado !== "204")
      const permitidos = [...casosComentario, ...casosPublicacion].filter(
        (c) => c.esperado === "204",
      )
      const antes = await huella(e)
      for (const caso of negados) {
        const r = await pedir("DELETE", caso.url, token)
        if (resultado(r) !== caso.esperado)
          fallas.push(
            `${actor} borra ${caso.tipo} de ${caso.autor}: ${resultado(r)} (esperado ${caso.esperado})`,
          )
        if (codigoDe(r) === "BORRADO_NO_PERMITIDO") {
          expect(r.json()).toEqual({
            error: {
              codigo: "BORRADO_NO_PERMITIDO",
              mensaje: "No puedes borrar lo que publicó otra persona.",
            },
          })
        }
      }
      expect(await huella(e), "lo negado no debe escribir nada").toEqual(antes)

      // 3. Después lo permitido: comentarios primero (la publicación los borra en cascada).
      for (const caso of permitidos) {
        const r = await pedir("DELETE", caso.url, token)
        if (resultado(r) !== "204")
          fallas.push(
            `${actor} borra ${caso.tipo} de ${caso.autor}: ${resultado(r)} (esperado 204)`,
          )
      }
      const despues = await huella(e)
      const quedan = new Set([
        ...despues.publicaciones.map((p) => p.id),
        ...despues.comentarios.map((c) => c.id),
      ])
      for (const caso of permitidos) {
        if (quedan.has(caso.id)) fallas.push(`${actor}: sigue el ${caso.tipo} de ${caso.autor}`)
      }
      if (permitidos.some((c) => c.id === e.publicaciones.P_M2)) {
        expect(despues.archivos).toEqual([
          { id: e.archivoDeM2, estado: "descartado", publicacionId: null },
        ])
      }

      // 4. puedeBorrar de las listas contra lo que el DELETE permitió, elemento por elemento.
      if (EN_LA_CLASE.has(actor)) {
        for (const caso of [...casosComentario, ...casosPublicacion]) {
          const declarado = listaDeclarada.get(caso.id)
          if (declarado !== (caso.esperado === "204"))
            fallas.push(
              `${actor}: puedeBorrar del ${caso.tipo} de ${caso.autor} = ${String(declarado)}, el DELETE dio ${caso.esperado}`,
            )
        }
      }
      expect(fallas).toEqual([])
    },
  )
})

describe("ataque CLASES-02b r1: autores que salen y vuelven a la clase", () => {
  it("el alumno dado de baja no borra su comentario (403 SIN_ACCESO_A_LA_CLASE) pero el comentario sigue y el maestro puede borrarlo; dado de alta otra vez, lo borra él mismo", async () => {
    const t = ficha()
    const maestro = await crearCuenta(`Maestra ${t}`, "maestro")
    const alumno = await crearCuenta(`Alumno Vuelve ${t}`, "estudiante")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, alumno.id)
    const publicacionId = await crearPublicacionDePrueba({ claseId: clase.id, autorId: maestro.id })
    const comentarioId = await crearComentarioDePrueba({ publicacionId, autorId: alumno.id })
    const url = `${urlComentarios(clase.id, publicacionId)}/${comentarioId}`

    const baja = await pedir(
      "DELETE",
      `/api/clases/${clase.id}/alumnos/${alumno.id}`,
      maestro.token,
    )
    expect(baja.statusCode).toBe(204)
    expect(resultado(await pedir("DELETE", url, alumno.token))).toBe("403 SIN_ACCESO_A_LA_CLASE")
    expect(
      resultado(
        await pedir(
          "DELETE",
          `/api/clases/${clase.id}/mis-comentarios/${comentarioId}`,
          alumno.token,
        ),
      ),
    ).toBe("403 SIN_ACCESO_A_LA_CLASE")
    const vista = await pedir("GET", urlComentarios(clase.id, publicacionId), maestro.token)
    const delAlumno = vista
      .json<{ comentarios: { id: string; puedeBorrar: boolean; autor: { nombre: string } }[] }>()
      .comentarios.find((c) => c.id === comentarioId)
    expect(delAlumno?.puedeBorrar).toBe(true)
    expect(delAlumno?.autor.nombre).toBe(alumno.nombre)

    const alta = await pedir("POST", `/api/clases/${clase.id}/alumnos`, tokenAdmin, {
      alumnoId: alumno.id,
    })
    expect(alta.statusCode, alta.body).toBe(200)
    const suya = await pedir("GET", urlComentarios(clase.id, publicacionId), alumno.token)
    expect(
      suya
        .json<{ comentarios: { id: string; puedeBorrar: boolean; propio: boolean }[] }>()
        .comentarios.find((c) => c.id === comentarioId),
    ).toMatchObject({ puedeBorrar: true, propio: true })
    expect(resultado(await pedir("DELETE", url, alumno.token))).toBe("204")
    expect(await obtenerDb().comentario.count({ where: { id: comentarioId } })).toBe(0)
  })

  it("el maestro retirado y asignado de nuevo vuelve a borrar lo suyo; mientras estuvo fuera, el otro maestro no pudo (403 BORRADO_NO_PERMITIDO) y el admin sí", async () => {
    const t = ficha()
    const fijo = await crearCuenta(`Fijo ${t}`, "maestro")
    const vuelve = await crearCuenta(`Vuelve ${t}`, "maestro")
    const clase = await crearClaseDePrueba(idsClases, {
      maestroId: fijo.id,
      maestroIds: [fijo.id, vuelve.id],
    })
    const suya = await crearPublicacionDePrueba({ claseId: clase.id, autorId: vuelve.id })
    const otra = await crearPublicacionDePrueba({ claseId: clase.id, autorId: vuelve.id })
    const gestion = `/api/admin/clases/${clase.id}/maestros`
    expect((await pedir("DELETE", `${gestion}/${vuelve.id}`, tokenAdmin)).statusCode).toBe(200)

    const urlSuya = `${urlPublicaciones(clase.id)}/${suya}`
    expect(resultado(await pedir("DELETE", urlSuya, vuelve.token))).toBe(
      "403 SIN_ACCESO_A_LA_CLASE",
    )
    expect(resultado(await pedir("DELETE", urlSuya, fijo.token))).toBe("403 BORRADO_NO_PERMITIDO")
    const vistaDelFijo = await pedir("GET", urlPublicaciones(clase.id), fijo.token)
    expect(
      vistaDelFijo
        .json<{ publicaciones: { id: string; puedeBorrar: boolean }[] }>()
        .publicaciones.filter((p) => p.id === suya || p.id === otra)
        .map((p) => p.puedeBorrar),
    ).toEqual([false, false])
    expect(
      resultado(await pedir("DELETE", `${urlPublicaciones(clase.id)}/${otra}`, tokenAdmin)),
    ).toBe("204")

    expect((await pedir("POST", gestion, tokenAdmin, { maestroId: vuelve.id })).statusCode).toBe(
      200,
    )
    expect(resultado(await pedir("DELETE", urlSuya, vuelve.token))).toBe("204")
    expect(await obtenerDb().publicacion.count({ where: { claseId: clase.id } })).toBe(0)
  })
})

describe("ataque CLASES-02b r1: 403 BORRADO_NO_PERMITIDO sin oráculo fuera de la clase", () => {
  it("un comentario o una publicación de otra clase (aunque el actor esté en las dos) responde igual que un id inexistente (404), nunca 403 BORRADO_NO_PERMITIDO", async () => {
    const t = ficha()
    const maestroA = await crearCuenta(`Maestra A ${t}`, "maestro")
    const maestroB = await crearCuenta(`Maestro B ${t}`, "maestro")
    const alumno = await crearCuenta(`Alumna en dos ${t}`, "estudiante")
    const otroAlumno = await crearCuenta(`Otro en B ${t}`, "estudiante")
    const claseA = await crearClaseDePrueba(idsClases, { maestroId: maestroA.id })
    const claseB = await crearClaseDePrueba(idsClases, { maestroId: maestroB.id })
    await inscribirDePrueba(claseA.id, alumno.id)
    await inscribirDePrueba(claseB.id, alumno.id)
    await inscribirDePrueba(claseB.id, otroAlumno.id)
    const enA = await crearPublicacionDePrueba({ claseId: claseA.id, autorId: maestroA.id })
    const enB = await crearPublicacionDePrueba({ claseId: claseB.id, autorId: maestroB.id })
    const ajenoEnB = await crearComentarioDePrueba({ publicacionId: enB, autorId: otroAlumno.id })
    const delMaestroB = await crearComentarioDePrueba({ publicacionId: enB, autorId: maestroB.id })

    const comoVe = async (url: string, token: string) => {
      const r = await pedir("DELETE", url, token)
      return { estado: r.statusCode, cuerpo: r.json<unknown>() }
    }
    const inexistenteComentario = await comoVe(
      `${urlComentarios(claseA.id, enA)}/${randomUUID()}`,
      alumno.token,
    )
    expect(inexistenteComentario.estado).toBe(404)
    for (const [publicacionId, comentarioId] of [
      [enA, ajenoEnB],
      [enB, ajenoEnB],
      [enA, delMaestroB],
      [enB, delMaestroB],
    ] as const) {
      expect(
        await comoVe(`${urlComentarios(claseA.id, publicacionId)}/${comentarioId}`, alumno.token),
        `alumno, claseA, ${publicacionId === enA ? "publicación de A" : "publicación de B"}`,
      ).toEqual(inexistenteComentario)
    }
    // El admin tampoco recibe otra cosa que 404 con la clase equivocada.
    const inexistentePublicacionAdmin = await comoVe(
      `${urlPublicaciones(claseA.id)}/${randomUUID()}`,
      tokenAdmin,
    )
    expect(inexistentePublicacionAdmin.estado).toBe(404)
    expect(await comoVe(`${urlPublicaciones(claseA.id)}/${enB}`, tokenAdmin)).toEqual(
      inexistentePublicacionAdmin,
    )
    expect(await comoVe(`${urlPublicaciones(claseA.id)}/${enB}`, maestroA.token)).toEqual(
      inexistentePublicacionAdmin,
    )
    expect(await obtenerDb().comentario.count({ where: { publicacionId: enB } })).toBe(2)
    expect(await obtenerDb().publicacion.count({ where: { id: enB } })).toBe(1)
  })
})

describe("ataque CLASES-02b r1: carreras de borrado", () => {
  it(
    "el maestro borra su publicación mientras el admin lo retira de la clase (8 rondas): 204 con la publicación borrada o 403 SIN_ACCESO_A_LA_CLASE con la publicación intacta; nunca 500 ni un estado mixto",
    { timeout: 60_000 },
    async () => {
      const t = ficha()
      const fijo = await crearCuenta(`Fijo carrera ${t}`, "maestro")
      const fallas: string[] = []
      const vistos = new Set<string>()
      for (let ronda = 0; ronda < 8; ronda++) {
        const sale = await crearCuenta(`Sale ${t} ${String(ronda)}`, "maestro")
        const clase = await crearClaseDePrueba(idsClases, {
          maestroId: fijo.id,
          maestroIds: [fijo.id, sale.id],
        })
        const publicacionId = await crearPublicacionDePrueba({
          claseId: clase.id,
          autorId: sale.id,
        })
        const [borrado, retiro] = await Promise.all([
          pedir("DELETE", `${urlPublicaciones(clase.id)}/${publicacionId}`, sale.token),
          pedir("DELETE", `/api/admin/clases/${clase.id}/maestros/${sale.id}`, tokenAdmin),
        ])
        const existe = (await obtenerDb().publicacion.count({ where: { id: publicacionId } })) === 1
        const r = resultado(borrado)
        vistos.add(r)
        if (retiro.statusCode !== 200)
          fallas.push(`ronda ${String(ronda)}: retiro ${resultado(retiro)}`)
        if (r === "204" && existe) fallas.push(`ronda ${String(ronda)}: 204 y la publicación sigue`)
        if (r === "403 SIN_ACCESO_A_LA_CLASE" && !existe)
          fallas.push(`ronda ${String(ronda)}: 403 y la publicación desapareció`)
        if (r !== "204" && r !== "403 SIN_ACCESO_A_LA_CLASE")
          fallas.push(`ronda ${String(ronda)}: ${r} ${borrado.body.slice(0, 120)}`)
      }
      expect(fallas).toEqual([])
      expect(vistos.size).toBeGreaterThan(0)
    },
  )

  it(
    "el alumno y el maestro borran a la vez el mismo comentario del alumno (6 rondas): uno 204 y otro 404, ninguno 500 ni 403",
    { timeout: 60_000 },
    async () => {
      const t = ficha()
      const maestro = await crearCuenta(`Maestra par ${t}`, "maestro")
      const alumno = await crearCuenta(`Alumno par ${t}`, "estudiante")
      const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
      await inscribirDePrueba(clase.id, alumno.id)
      const publicacionId = await crearPublicacionDePrueba({
        claseId: clase.id,
        autorId: maestro.id,
      })
      const fallas: string[] = []
      for (let ronda = 0; ronda < 6; ronda++) {
        const comentarioId = await crearComentarioDePrueba({ publicacionId, autorId: alumno.id })
        const url = `${urlComentarios(clase.id, publicacionId)}/${comentarioId}`
        const respuestas = await Promise.all([
          pedir("DELETE", url, alumno.token),
          pedir("DELETE", url, maestro.token),
        ])
        const estados = respuestas.map(resultado).sort()
        if (JSON.stringify(estados) !== JSON.stringify(["204", "404 COMENTARIO_NO_ENCONTRADO"]))
          fallas.push(`ronda ${String(ronda)}: ${estados.join(", ")}`)
      }
      expect(fallas).toEqual([])
      expect(await obtenerDb().comentario.count({ where: { publicacionId } })).toBe(0)
    },
  )

  it(
    "el admin borra una publicación mientras una alumna la comenta (8 rondas): el comentario es 201 o 404, nunca 500, y nunca queda un comentario sin su publicación",
    { timeout: 60_000 },
    async () => {
      const t = ficha()
      const maestro = await crearCuenta(`Maestra cm ${t}`, "maestro")
      const alumno = await crearCuenta(`Alumna cm ${t}`, "estudiante")
      const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
      await inscribirDePrueba(clase.id, alumno.id)
      const fallas: string[] = []
      for (let ronda = 0; ronda < 8; ronda++) {
        const publicacionId = await crearPublicacionDePrueba({
          claseId: clase.id,
          autorId: maestro.id,
        })
        const [borrado, comentario] = await Promise.all([
          pedir("DELETE", `${urlPublicaciones(clase.id)}/${publicacionId}`, tokenAdmin),
          pedir("POST", urlComentarios(clase.id, publicacionId), alumno.token, {
            texto: `En carrera ${String(ronda)}`,
          }),
        ])
        if (resultado(borrado) !== "204")
          fallas.push(`ronda ${String(ronda)}: borrar ${resultado(borrado)}`)
        if (!["201", "404 PUBLICACION_NO_ENCONTRADA"].includes(resultado(comentario)))
          fallas.push(`ronda ${String(ronda)}: comentar ${resultado(comentario)}`)
      }
      expect(fallas).toEqual([])
      const huerfanos = await obtenerDb().comentario.count({
        where: { autorId: alumno.id, texto: { startsWith: "En carrera" } },
      })
      expect(huerfanos).toBe(0)
    },
  )
})
