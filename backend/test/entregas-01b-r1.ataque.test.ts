import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  entregaDeAlumnoRespuestaSchema,
  errorApiSchema,
  listaEntregasRespuestaSchema,
  listaTrabajoRespuestaSchema,
  miEntregaRespuestaSchema,
  solicitarSubidaRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria, type AlmacenEnMemoria } from "./almacen-en-memoria.js"
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
  leerArchivoDb,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import {
  conFilaDeEntregasRetenida,
  crearEntregaDePrueba,
  leerEntregaDb,
  trabajosDeEntregaDeTarea,
} from "./ayudas-entregas.js"
import { crearTareaDePrueba } from "./ayudas-tareas.js"

// Ataques del Tester, ENTREGAS-01b ronda 1 (entregas, backend). Las fechas límite llevan horas de
// margen respecto de la hora real (la frontera del milisegundo vive en core/, PR-1B01). La app de
// este archivo registra en nivel "error": el 503 por P2028 de T-r1-1 (nivel warn) no suma líneas a
// PA-07, y un "Error no controlado" (nivel error) sí saldría.

const almacen: AlmacenEnMemoria = crearAlmacenEnMemoria()
let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: { ...cargarEnv(), LOG_LEVEL: "error" }, almacen })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const HORA_MS = 3_600_000
const enHoras = (horas: number): Date => new Date(Date.now() + horas * HORA_MS)

interface Escenario {
  claseId: string
  otraClaseId: string
  maestro: UsuarioDePrueba
  ana: UsuarioDePrueba
  beto: UsuarioDePrueba
  t: { maestro: string; ana: string; beto: string; admin: string; ajeno: string }
}

const escenario = async (): Promise<Escenario> => {
  const ficha = randomUUID().slice(0, 6)
  const maestro = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Maestra R1 ${ficha}`,
    rol: "maestro",
  })
  const ajeno = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Ajeno R1 ${ficha}`,
    rol: "maestro",
  })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  const otra = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  const ana = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Ana R1 ${ficha}` })
  const beto = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Beto R1 ${ficha}` })
  await inscribirDePrueba(clase.id, ana.id)
  await inscribirDePrueba(clase.id, beto.id)
  await inscribirDePrueba(otra.id, ana.id)
  // RN-02: los alumnos de la prueba son deudores; nada de eso debe salir en ninguna respuesta.
  await obtenerDb().usuario.updateMany({
    where: { id: { in: [ana.id, beto.id] } },
    data: { estadoPago: "deudor", fechaEstadoPago: new Date() },
  })
  return {
    claseId: clase.id,
    otraClaseId: otra.id,
    maestro,
    ana,
    beto,
    t: {
      maestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
      ana: await firmarTokenDePrueba({ usuarioId: ana.id }),
      beto: await firmarTokenDePrueba({ usuarioId: beto.id }),
      admin: await tokenDelAdminDePrueba(),
      ajeno: await firmarTokenDePrueba({ usuarioId: ajeno.id }),
    },
  }
}

const tarea = async (
  e: Escenario,
  {
    fechaLimite = enHoras(48),
    aceptaTardias = true,
    requiereAdjuntos = true,
    claseId = e.claseId,
  }: {
    fechaLimite?: Date
    aceptaTardias?: boolean
    requiereAdjuntos?: boolean
    claseId?: string
  } = {},
): Promise<string> => {
  const id = await crearTareaDePrueba({
    claseId,
    autorId: e.maestro.id,
    fechaLimite,
    aceptaTardias,
  })
  if (!requiereAdjuntos)
    await obtenerDb().tarea.update({
      where: { id },
      data: { requiereAdjuntos: false },
      select: { id: true },
    })
  return id
}

type Metodo = "GET" | "POST" | "DELETE"

const pedir = (
  metodo: Metodo,
  url: string,
  token: string | undefined,
  payload?: InjectOptions["payload"],
  instancia: FastifyInstance = obtenerApp(),
): Promise<LightMyRequestResponse> =>
  instancia.inject({
    method: metodo,
    url,
    ...(payload === undefined ? {} : { payload }),
    headers: {
      ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
      ...(payload === undefined ? {} : { "content-type": "application/json" }),
    },
  })

const resultado = (r: LightMyRequestResponse): string =>
  r.statusCode < 400
    ? String(r.statusCode)
    : `${String(r.statusCode)} ${errorApiSchema.parse(r.json()).error.codigo}`

const base = (claseId: string, tareaId: string) => `/api/clases/${claseId}/tareas/${tareaId}`

// Sube un archivo de entrega por la API y simula que el navegador ya lo subió al almacén.
const subirDeEntrega = async (
  e: Escenario,
  tareaId: string,
  alumno: UsuarioDePrueba,
  token: string,
  rutaTarea = tareaId,
): Promise<string> => {
  const r = await pedir("POST", `${base(e.claseId, rutaTarea)}/entrega/archivos`, token, {
    nombre: "trabajo.pdf",
    tipo: "application/pdf",
    tamano: 1000,
  })
  expect(r.statusCode, `Precondición: subir el archivo de entrega (${r.body})`).toBe(201)
  const { archivo } = solicitarSubidaRespuestaSchema.parse(r.json())
  almacen.subir(`entregas/${tareaId}/${alumno.id}/${archivo.id}`, {
    tamano: 1000,
    tipo: "application/pdf",
  })
  return archivo.id
}

const entregar = (
  e: Escenario,
  tareaId: string,
  token: string,
  cuerpo: { archivoIds?: string[]; enlaces?: unknown[] },
  instancia?: FastifyInstance,
) =>
  pedir(
    "POST",
    `${base(e.claseId, tareaId)}/entrega`,
    token,
    { archivoIds: cuerpo.archivoIds ?? [], enlaces: cuerpo.enlaces ?? [] },
    instancia,
  )

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

describe("ataque ENTREGAS-01b r1: enlaces de la entrega (S-08)", () => {
  it("rechaza javascript:, JaVaScRiPt:, data:, file:, ftp:, sin protocolo, con usuario o contraseña, «https://» solo, vacío, solo espacios, que no es texto y de 2049 caracteres: 400 VALIDACION sin crear fila ni trabajo", async () => {
    const e = await escenario()
    const t = await tarea(e)
    const malos: unknown[] = [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "  javascript:alert(1)",
      "data:text/html,<b>x</b>",
      "file:///etc/passwd",
      "ftp://ejemplo.mx/a",
      "ejemplo.mx/a",
      "https://usuario:clave@ejemplo.mx",
      "https://usuario@ejemplo.mx",
      "https://",
      "",
      "   ",
      42,
      null,
      `https://ejemplo.mx/${"a".repeat(2049 - "https://ejemplo.mx/".length)}`,
    ]
    const fallas: string[] = []
    for (const enlace of malos) {
      const r = await entregar(e, t, e.t.ana, { enlaces: [enlace] })
      if (resultado(r) !== "400 VALIDACION")
        fallas.push(`${JSON.stringify(enlace).slice(0, 40)}: ${resultado(r)}`)
    }
    expect(fallas).toEqual([])
    expect(await leerEntregaDb(t, e.ana.id)).toBeNull()
    expect(await trabajosDeEntregaDeTarea(t)).toEqual([])
  })

  it("acepta y normaliza: espacios a los lados se recortan, el esquema y el servidor en mayúsculas pasan a minúsculas, y un inversor de dirección queda codificado en el href guardado y devuelto", async () => {
    const e = await escenario()
    const t = await tarea(e)
    const r = await entregar(e, t, e.t.ana, {
      enlaces: ["  https://ejemplo.mx/a  ", "HTTPS://EJEMPLO.MX/B", "https://ejemplo.mx/‮gpj.exe"],
    })
    expect(resultado(r)).toBe("200")
    const esperados = [
      "https://ejemplo.mx/a",
      "https://ejemplo.mx/B",
      "https://ejemplo.mx/%E2%80%AEgpj.exe",
    ]
    expect(miEntregaRespuestaSchema.parse(r.json()).entrega.enlaces).toEqual(esperados)
    expect((await leerEntregaDb(t, e.ana.id))?.enlaces).toEqual(esperados)
  })

  it("T-r1-2 (N-02): un enlace aceptado nunca se guarda ni se devuelve con más de LONGITUD_MAXIMA_ENLACE (2048) caracteres, aunque la normalización lo alargue (ñ, espacios, inversores)", async () => {
    const e = await escenario()
    const prefijo = "https://ejemplo.mx/"
    const relleno = (c: string) => `${prefijo}${c.repeat(2048 - prefijo.length)}`
    const variantes: [string, string][] = [
      ["2048 con ñ", relleno("ñ")],
      ["2048 con espacios internos", `${prefijo}a${" ".repeat(2048 - prefijo.length - 2)}b`],
      ["2048 con inversores de dirección", relleno("‮")],
    ]
    const fallas: string[] = []
    for (const [etiqueta, enlace] of variantes) {
      expect(enlace.length, `Precondición: ${etiqueta} mide 2048`).toBe(2048)
      const t = await tarea(e)
      const r = await entregar(e, t, e.t.ana, { enlaces: [enlace] })
      if (resultado(r) === "400 VALIDACION") continue
      if (resultado(r) !== "200") {
        fallas.push(`${etiqueta}: ${resultado(r)}`)
        continue
      }
      const devuelto = miEntregaRespuestaSchema.parse(r.json()).entrega.enlaces[0] ?? ""
      const guardado = (await leerEntregaDb(t, e.ana.id))?.enlaces
      const largoGuardado =
        Array.isArray(guardado) && typeof guardado[0] === "string" ? guardado[0].length : -1
      const delMaestro = entregaDeAlumnoRespuestaSchema.parse(
        (await pedir("GET", `${base(e.claseId, t)}/entregas/${e.ana.id}`, e.t.maestro)).json(),
      ).entrega.enlaces[0]
      if (devuelto.length > 2048 || largoGuardado > 2048 || (delMaestro ?? "").length > 2048)
        fallas.push(
          `${etiqueta}: aceptado; mide ${String(devuelto.length)} al responder, ${String(largoGuardado)} guardado y ${String((delMaestro ?? "").length)} para el maestro`,
        )
    }
    expect(fallas).toEqual([])
  })
})

describe("ataque ENTREGAS-01b r1: lectura cruzada de archivos de entrega", () => {
  it("el archivo de la entrega de Ana: por la descarga de la clase, 404 para Beto, para Ana, para el maestro y para el admin; por la ruta del alumno, 404 para Beto; por la del maestro con :alumnoId de Beto, 404; con el de Ana, 200 para maestro y admin; el maestro ajeno, 403", async () => {
    const e = await escenario()
    const t = await tarea(e)
    const archivo = await subirDeEntrega(e, t, e.ana, e.t.ana)
    expect(resultado(await entregar(e, t, e.t.ana, { archivoIds: [archivo] }))).toBe("200")
    const firmasAntes = almacen.descargasFirmadas.length
    const deLaClase = `/api/clases/${e.claseId}/archivos/${archivo}/descarga`
    const casos: [string, string, string, string][] = [
      ["clase / Beto", deLaClase, e.t.beto, "404 ARCHIVO_NO_ENCONTRADO"],
      ["clase / Ana", deLaClase, e.t.ana, "404 ARCHIVO_NO_ENCONTRADO"],
      ["clase / maestro", deLaClase, e.t.maestro, "404 ARCHIVO_NO_ENCONTRADO"],
      ["clase / admin", deLaClase, e.t.admin, "404 ARCHIVO_NO_ENCONTRADO"],
      [
        "alumno / Beto",
        `${base(e.claseId, t)}/entrega/archivos/${archivo}/descarga`,
        e.t.beto,
        "404 ARCHIVO_NO_ENCONTRADO",
      ],
      [
        "maestro con :alumnoId de Beto",
        `${base(e.claseId, t)}/entregas/${e.beto.id}/archivos/${archivo}/descarga`,
        e.t.maestro,
        "404 ARCHIVO_NO_ENCONTRADO",
      ],
      [
        "admin con :alumnoId de Beto",
        `${base(e.claseId, t)}/entregas/${e.beto.id}/archivos/${archivo}/descarga`,
        e.t.admin,
        "404 ARCHIVO_NO_ENCONTRADO",
      ],
      [
        "maestro ajeno",
        `${base(e.claseId, t)}/entregas/${e.ana.id}/archivos/${archivo}/descarga`,
        e.t.ajeno,
        "403 SIN_ACCESO_A_LA_CLASE",
      ],
      [
        "Ana por la ruta del maestro",
        `${base(e.claseId, t)}/entregas/${e.ana.id}/archivos/${archivo}/descarga`,
        e.t.ana,
        "403 ROL_NO_PERMITIDO",
      ],
    ]
    const fallas: string[] = []
    for (const [etiqueta, url, token, esperado] of casos) {
      const r = await pedir("POST", url, token)
      if (resultado(r) !== esperado) fallas.push(`${etiqueta}: ${resultado(r)}`)
    }
    expect(fallas).toEqual([])
    expect(almacen.descargasFirmadas.length, "ningún rechazo firmó una descarga").toBe(firmasAntes)
    for (const token of [e.t.maestro, e.t.admin]) {
      const r = await pedir(
        "POST",
        `${base(e.claseId, t)}/entregas/${e.ana.id}/archivos/${archivo}/descarga`,
        token,
      )
      expect(resultado(r)).toBe("200")
    }
    expect(
      resultado(
        await pedir("POST", `${base(e.claseId, t)}/entrega/archivos/${archivo}/descarga`, e.t.ana),
      ),
    ).toBe("200")
  })

  it("no se confirma en una entrega: el archivo subido para otra tarea, el de otro alumno, el descartado al anular (id reutilizado) ni un material del maestro; 400 sin escribir", async () => {
    const e = await escenario()
    const t1 = await tarea(e)
    const t2 = await tarea(e)
    const deOtraTarea = await subirDeEntrega(e, t1, e.ana, e.t.ana)
    const deBeto = await subirDeEntrega(e, t2, e.beto, e.t.beto)
    // Un material pendiente del maestro, subido por su ruta.
    const material = await pedir("POST", `/api/clases/${e.claseId}/archivos`, e.t.maestro, {
      nombre: "guia.pdf",
      tipo: "application/pdf",
      tamano: 1000,
    })
    expect(material.statusCode, material.body).toBe(201)
    const idMaterial = solicitarSubidaRespuestaSchema.parse(material.json()).archivo.id
    almacen.subir(`materiales/${e.claseId}/${idMaterial}`, {
      tamano: 1000,
      tipo: "application/pdf",
    })
    // Uno que se entregó y se descartó al anular.
    const usado = await subirDeEntrega(e, t2, e.ana, e.t.ana)
    expect(resultado(await entregar(e, t2, e.t.ana, { archivoIds: [usado] }))).toBe("200")
    expect(resultado(await pedir("POST", `${base(e.claseId, t2)}/entrega/anular`, e.t.ana))).toBe(
      "200",
    )
    expect((await leerArchivoDb(usado))?.estado).toBe("descartado")

    const fallas: string[] = []
    for (const [etiqueta, id] of [
      ["de otra tarea", deOtraTarea],
      ["de otro alumno", deBeto],
      ["material del maestro", idMaterial],
      ["descartado al anular", usado],
    ] as const) {
      const r = await entregar(e, t2, e.t.ana, { archivoIds: [id] })
      if (r.statusCode !== 400) fallas.push(`${etiqueta}: ${resultado(r)}`)
    }
    expect(fallas).toEqual([])
    expect((await leerEntregaDb(t2, e.ana.id))?.estado).toBe("asignado")
    expect(
      await Promise.all(
        [deOtraTarea, deBeto, idMaterial].map(async (id) => (await leerArchivoDb(id))?.estado),
      ),
    ).toEqual(["pendiente", "pendiente", "pendiente"])
  })
})

describe("ataque ENTREGAS-01b r1: mayúsculas en los prefijos (T-r1-3)", () => {
  it("un material subido con :claseId en mayúsculas se publica por la ruta en minúsculas y al revés; un archivo de entrega subido con :tareaId en mayúsculas se entrega por la ruta en minúsculas", async () => {
    const e = await escenario()
    const subirMaterial = async (claseEnRuta: string) => {
      const r = await pedir("POST", `/api/clases/${claseEnRuta}/archivos`, e.t.maestro, {
        nombre: "guia.pdf",
        tipo: "application/pdf",
        tamano: 1000,
      })
      expect(r.statusCode, r.body).toBe(201)
      const id = solicitarSubidaRespuestaSchema.parse(r.json()).archivo.id
      const fila = await leerArchivoDb(id)
      if (!fila) throw new Error("Precondición: el material quedó registrado")
      almacen.subir(fila.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
      return id
    }
    for (const [subida, publicacion] of [
      [e.claseId.toUpperCase(), e.claseId],
      [e.claseId, e.claseId.toUpperCase()],
    ] as const) {
      const id = await subirMaterial(subida)
      const r = await pedir("POST", `/api/clases/${publicacion}/publicaciones`, e.t.maestro, {
        tipo: "material",
        titulo: `Material ${subida.slice(0, 4)}`,
        archivoIds: [id],
      })
      expect([subida === e.claseId ? "minúsculas" : "mayúsculas", resultado(r)]).toEqual([
        subida === e.claseId ? "minúsculas" : "mayúsculas",
        "201",
      ])
      expect((await leerArchivoDb(id))?.estado).toBe("confirmado")
    }
    const t = await tarea(e)
    const archivo = await subirDeEntrega(e, t, e.ana, e.t.ana, t.toUpperCase())
    expect((await leerArchivoDb(archivo))?.claveObjeto).toBe(`entregas/${t}/${e.ana.id}/${archivo}`)
    expect(resultado(await entregar(e, t, e.t.ana, { archivoIds: [archivo.toUpperCase()] }))).toBe(
      "200",
    )
    expect((await leerArchivoDb(archivo))?.estado).toBe("confirmado")
  })
})

describe("ataque ENTREGAS-01b r1: orden de errores en las descargas (T-r1-4)", () => {
  it("tarea de otra clase con un archivo válido: 404 TAREA_NO_ENCONTRADA; alumno dado de baja, desactivado o un maestro como :alumnoId: 404 ALUMNO_NO_ENCONTRADO; ninguno firma nada", async () => {
    const e = await escenario()
    const t = await tarea(e)
    const ajena = await tarea(e, { claseId: e.otraClaseId })
    const deAna = await subirDeEntrega(e, t, e.ana, e.t.ana)
    expect(resultado(await entregar(e, t, e.t.ana, { archivoIds: [deAna] }))).toBe("200")
    const deBeto = await subirDeEntrega(e, t, e.beto, e.t.beto)
    expect(resultado(await entregar(e, t, e.t.beto, { archivoIds: [deBeto] }))).toBe("200")
    const firmasAntes = almacen.descargasFirmadas.length

    expect(
      resultado(
        await pedir(
          "POST",
          `${base(e.claseId, ajena)}/entrega/archivos/${deAna}/descarga`,
          e.t.ana,
        ),
      ),
    ).toBe("404 TAREA_NO_ENCONTRADA")
    expect(
      resultado(
        await pedir(
          "POST",
          `${base(e.claseId, ajena)}/entregas/${e.ana.id}/archivos/${deAna}/descarga`,
          e.t.maestro,
        ),
      ),
    ).toBe("404 TAREA_NO_ENCONTRADA")

    expect(
      resultado(
        await pedir("DELETE", `/api/clases/${e.claseId}/alumnos/${e.beto.id}`, e.t.maestro),
      ),
    ).toBe("204")
    await desactivarUsuarioDePrueba(e.ana.id)
    const fallas: string[] = []
    for (const [etiqueta, alumnoId, archivoId] of [
      ["dado de baja", e.beto.id, deBeto],
      ["desactivado", e.ana.id, deAna],
      ["un maestro", e.maestro.id, deAna],
    ] as const) {
      const descarga = await pedir(
        "POST",
        `${base(e.claseId, t)}/entregas/${alumnoId}/archivos/${archivoId}/descarga`,
        e.t.maestro,
      )
      const lectura = await pedir("GET", `${base(e.claseId, t)}/entregas/${alumnoId}`, e.t.admin)
      for (const [que, r] of [
        ["descarga", descarga],
        ["entrega", lectura],
      ] as const)
        if (resultado(r) !== "404 ALUMNO_NO_ENCONTRADO")
          fallas.push(`${etiqueta} (${que}): ${resultado(r)}`)
    }
    expect(fallas).toEqual([])
    expect(almacen.descargasFirmadas.length).toBe(firmasAntes)
  })
})

describe("ataque ENTREGAS-01b r1: estado de pago, restricción y fugas", () => {
  it("ninguna respuesta de las ocho rutas ni del DELETE con entregas, de éxito o de error, para la alumna, el maestro y el admin, lleva estadoPago, fechaEstadoPago, accesoRestringido, motivoRestriccion, email, rol, la clave del objeto ni «deudor»; la alumna nunca recibe version", async () => {
    const e = await escenario()
    const t = await tarea(e)
    const archivo = await subirDeEntrega(e, t, e.ana, e.t.ana)
    const respuestas: [string, LightMyRequestResponse][] = []
    const anotar = async (etiqueta: string, r: Promise<LightMyRequestResponse>) =>
      respuestas.push([etiqueta, await r])
    await anotar(
      "entregar",
      entregar(e, t, e.t.ana, { archivoIds: [archivo], enlaces: ["https://ejemplo.mx"] }),
    )
    await anotar("entregar otra vez", entregar(e, t, e.t.ana, { enlaces: ["https://ejemplo.mx"] }))
    await anotar("ver la suya", pedir("GET", `${base(e.claseId, t)}/entrega`, e.t.ana))
    await anotar(
      "descarga propia",
      pedir("POST", `${base(e.claseId, t)}/entrega/archivos/${archivo}/descarga`, e.t.ana),
    )
    await anotar(
      "subir ya entregada",
      pedir("POST", `${base(e.claseId, t)}/entrega/archivos`, e.t.ana, {
        nombre: "x.pdf",
        tipo: "application/pdf",
        tamano: 10,
      }),
    )
    for (const [quien, token] of [
      ["maestro", e.t.maestro],
      ["admin", e.t.admin],
    ] as const) {
      await anotar(`${quien} lista`, pedir("GET", `${base(e.claseId, t)}/entregas`, token))
      await anotar(
        `${quien} entrega`,
        pedir("GET", `${base(e.claseId, t)}/entregas/${e.ana.id}`, token),
      )
      await anotar(
        `${quien} entrega de Beto`,
        pedir("GET", `${base(e.claseId, t)}/entregas/${e.beto.id}`, token),
      )
      await anotar(
        `${quien} descarga`,
        pedir(
          "POST",
          `${base(e.claseId, t)}/entregas/${e.ana.id}/archivos/${archivo}/descarga`,
          token,
        ),
      )
      await anotar(
        `${quien} no inscrito`,
        pedir("GET", `${base(e.claseId, t)}/entregas/${randomUUID()}`, token),
      )
      await anotar(
        `${quien} trabajo`,
        pedir("GET", `/api/clases/${e.claseId}/trabajo?tema=sin-tema`, token),
      )
      await anotar(`${quien} borrar sin confirmar`, pedir("DELETE", base(e.claseId, t), token))
    }
    await anotar(
      "alumna trabajo",
      pedir("GET", `/api/clases/${e.claseId}/trabajo?tema=sin-tema`, e.t.ana),
    )
    await anotar("anular", pedir("POST", `${base(e.claseId, t)}/entrega/anular`, e.t.ana))
    await anotar("anular otra vez", pedir("POST", `${base(e.claseId, t)}/entrega/anular`, e.t.ana))

    const prohibidas =
      /estadoPago|estado_pago|fechaEstadoPago|accesoRestringido|acceso_restringido|motivoRestriccion|"email"|"rol"|claveObjeto|clave_objeto|hashContrasena|deudor|al_corriente|@/i
    const fallas = respuestas
      .filter(([, r]) => prohibidas.test(r.body))
      .map(([etiqueta, r]) => `${etiqueta}: ${r.body.slice(0, 160)}`)
    expect(fallas).toEqual([])
    for (const [etiqueta, r] of respuestas.filter(([et]) =>
      ["entregar", "ver la suya", "anular"].includes(et),
    ))
      expect(Object.keys(r.json<{ entrega: object }>().entrega), etiqueta).not.toContain("version")
    expect(respuestas.find(([et]) => et === "maestro borrar sin confirmar")?.[1].statusCode).toBe(
      409,
    )
  })

  it("la alumna restringida recibe 403 ACCESO_RESTRINGIDO en las cinco rutas de la entrega, y no queda fila, archivo, firma ni trabajo", async () => {
    const e = await escenario()
    const t = await tarea(e)
    const restringida = await crearUsuarioDePrueba(idsUsuarios, {
      accesoRestringido: true,
      motivoRestriccion: "Adeudo",
    })
    await inscribirDePrueba(e.claseId, restringida.id)
    const token = await firmarTokenDePrueba({ usuarioId: restringida.id })
    const firmas = almacen.subidasFirmadas.length + almacen.descargasFirmadas.length
    const archivos = await obtenerDb().archivo.count({ where: { claseId: e.claseId } })
    const rutas: [Metodo, string, unknown][] = [
      ["GET", `${base(e.claseId, t)}/entrega`, undefined],
      ["POST", `${base(e.claseId, t)}/entrega`, { enlaces: ["https://ejemplo.mx"] }],
      ["POST", `${base(e.claseId, t)}/entrega/anular`, undefined],
      [
        "POST",
        `${base(e.claseId, t)}/entrega/archivos`,
        { nombre: "x.pdf", tipo: "application/pdf", tamano: 10 },
      ],
      ["POST", `${base(e.claseId, t)}/entrega/archivos/${randomUUID()}/descarga`, undefined],
    ]
    const fallas: string[] = []
    for (const [metodo, url, cuerpo] of rutas) {
      const r = await pedir(metodo, url, token, cuerpo as InjectOptions["payload"])
      if (resultado(r) !== "403 ACCESO_RESTRINGIDO")
        fallas.push(`${metodo} ${url}: ${resultado(r)}`)
      if (/Adeudo|motivo/i.test(r.body)) fallas.push(`${metodo} ${url}: revela el motivo`)
    }
    expect(fallas).toEqual([])
    expect(await leerEntregaDb(t, restringida.id)).toBeNull()
    expect(await obtenerDb().archivo.count({ where: { claseId: e.claseId } })).toBe(archivos)
    expect(almacen.subidasFirmadas.length + almacen.descargasFirmadas.length).toBe(firmas)
    expect(await trabajosDeEntregaDeTarea(t)).toEqual([])
  })
})

describe("ataque ENTREGAS-01b r1: carreras", () => {
  it(
    "anular mientras la entrega pasa a calificado (puesta a mano con la fila retenida): 409 ENTREGA_CALIFICADA y no toca archivos, enlaces ni versión",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const t = await tarea(e)
      const archivo = await subirDeEntrega(e, t, e.ana, e.t.ana)
      expect(
        resultado(
          await entregar(e, t, e.t.ana, {
            archivoIds: [archivo],
            enlaces: ["https://ejemplo.mx/a"],
          }),
        ),
      ).toBe("200")
      const fila = await leerEntregaDb(t, e.ana.id)
      if (!fila) throw new Error("Precondición: la entrega existe")
      const [anulada] = await conFilaDeEntregasRetenida(
        { tabla: "entregas", id: fila.id },
        [() => pedir("POST", `${base(e.claseId, t)}/entrega/anular`, e.t.ana)],
        {
          alRetener: async (tx) => {
            await tx.$executeRaw`UPDATE entregas SET estado = 'calificado' WHERE id = ${fila.id}::uuid`
          },
        },
      )
      if (!anulada?.ok) throw new Error("Precondición: la anulación respondió por la API")
      expect(resultado(anulada.valor)).toBe("409 ENTREGA_CALIFICADA")
      const despues = await leerEntregaDb(t, e.ana.id)
      expect([despues?.estado, despues?.version, despues?.enlaces]).toEqual([
        "calificado",
        fila.version,
        ["https://ejemplo.mx/a"],
      ])
      const archivoDespues = await leerArchivoDb(archivo)
      expect([archivoDespues?.estado, archivoDespues?.entregaId]).toEqual(["confirmado", fila.id])
    },
  )

  it(
    "entregar mientras la tarea pasa a vencida y sin tardías (fila de la tarea retenida): la entrega espera y responde 409 ENTREGA_CERRADA sin fila confirmada ni trabajo; si en cambio pasa a aceptar tardías, entra con retraso",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const cerrar = await tarea(e, { aceptaTardias: true })
      const [cerrada] = await conFilaDeEntregasRetenida(
        { tabla: "tareas", id: cerrar },
        [() => entregar(e, cerrar, e.t.ana, { enlaces: ["https://ejemplo.mx"] })],
        {
          alRetener: async (tx) => {
            await tx.$executeRaw`UPDATE tareas SET fecha_limite = now() - interval '2 hours', acepta_tardias = false WHERE id = ${cerrar}::uuid`
          },
        },
      )
      if (!cerrada?.ok) throw new Error("Precondición: la entrega respondió por la API")
      expect(resultado(cerrada.valor)).toBe("409 ENTREGA_CERRADA")
      const filaCerrada = await leerEntregaDb(cerrar, e.ana.id)
      expect(filaCerrada === null || filaCerrada.estado === "asignado").toBe(true)
      expect(await trabajosDeEntregaDeTarea(cerrar)).toEqual([])

      const abrir = await tarea(e, { fechaLimite: enHoras(-2), aceptaTardias: false })
      const [abierta] = await conFilaDeEntregasRetenida(
        { tabla: "tareas", id: abrir },
        [() => entregar(e, abrir, e.t.ana, { enlaces: ["https://ejemplo.mx"] })],
        {
          alRetener: async (tx) => {
            await tx.$executeRaw`UPDATE tareas SET acepta_tardias = true WHERE id = ${abrir}::uuid`
          },
        },
      )
      if (!abierta?.ok) throw new Error("Precondición: la entrega respondió por la API")
      expect(resultado(abierta.valor)).toBe("200")
      expect(miEntregaRespuestaSchema.parse(abierta.valor.json()).entrega).toMatchObject({
        estado: "entregado",
        conRetraso: true,
      })
    },
  )

  it(
    "cinco entregas simultáneas de la misma alumna, cada una con su archivo: una 200 y cuatro 409 ENTREGA_YA_REALIZADA; un solo trabajo, versión 1 y solo el archivo de la ganadora confirmado",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const t = await tarea(e)
      const archivos: string[] = []
      for (let i = 0; i < 5; i += 1) archivos.push(await subirDeEntrega(e, t, e.ana, e.t.ana))
      const respuestas = await Promise.all(
        archivos.map((id) => entregar(e, t, e.t.ana, { archivoIds: [id] })),
      )
      const codigos = respuestas.map(resultado).sort()
      expect(codigos).toEqual([
        "200",
        "409 ENTREGA_YA_REALIZADA",
        "409 ENTREGA_YA_REALIZADA",
        "409 ENTREGA_YA_REALIZADA",
        "409 ENTREGA_YA_REALIZADA",
      ])
      const ganadora = archivos[respuestas.findIndex((r) => r.statusCode === 200)]
      const estados = await Promise.all(
        archivos.map(async (id) => [id === ganadora, (await leerArchivoDb(id))?.estado] as const),
      )
      expect(estados.filter(([gana]) => gana).map(([, estado]) => estado)).toEqual(["confirmado"])
      expect(estados.filter(([gana]) => !gana).map(([, estado]) => estado)).toEqual([
        "pendiente",
        "pendiente",
        "pendiente",
        "pendiente",
      ])
      expect((await leerEntregaDb(t, e.ana.id))?.version).toBe(1)
      expect((await trabajosDeEntregaDeTarea(t)).length).toBe(1)
    },
  )
})

describe("ataque ENTREGAS-01b r1: subidas (S-10)", () => {
  it("subir a una tarea cerrada (409 ENTREGA_CERRADA), ya entregada (409 ENTREGA_YA_REALIZADA) o calificada (409 ENTREGA_CALIFICADA) no registra fila ni firma; tras anular se puede volver a subir, y lo subido antes de anular sigue pendiente y se puede entregar", async () => {
    const e = await escenario()
    const cerrada = await tarea(e, { fechaLimite: enHoras(-2), aceptaTardias: false })
    const t = await tarea(e)
    const calificada = await tarea(e)
    await crearEntregaDePrueba({ tareaId: calificada, alumnoId: e.ana.id, estado: "calificado" })
    const pendienteAntes = await subirDeEntrega(e, t, e.ana, e.t.ana)
    const usada = await subirDeEntrega(e, t, e.ana, e.t.ana)
    expect(resultado(await entregar(e, t, e.t.ana, { archivoIds: [usada] }))).toBe("200")
    const firmas = almacen.subidasFirmadas.length
    const filas = await obtenerDb().archivo.count({ where: { claseId: e.claseId } })
    const subir = (tareaId: string) =>
      pedir("POST", `${base(e.claseId, tareaId)}/entrega/archivos`, e.t.ana, {
        nombre: "x.pdf",
        tipo: "application/pdf",
        tamano: 10,
      })
    expect([
      resultado(await subir(cerrada)),
      resultado(await subir(t)),
      resultado(await subir(calificada)),
    ]).toEqual(["409 ENTREGA_CERRADA", "409 ENTREGA_YA_REALIZADA", "409 ENTREGA_CALIFICADA"])
    expect(almacen.subidasFirmadas.length).toBe(firmas)
    expect(await obtenerDb().archivo.count({ where: { claseId: e.claseId } })).toBe(filas)

    expect(resultado(await pedir("POST", `${base(e.claseId, t)}/entrega/anular`, e.t.ana))).toBe(
      "200",
    )
    expect((await leerArchivoDb(pendienteAntes))?.estado).toBe("pendiente")
    const nueva = await subirDeEntrega(e, t, e.ana, e.t.ana)
    const r = await entregar(e, t, e.t.ana, { archivoIds: [pendienteAntes, nueva] })
    expect(resultado(r)).toBe("200")
    expect(
      miEntregaRespuestaSchema
        .parse(r.json())
        .entrega.adjuntos.map(({ id }) => id)
        .sort(),
    ).toEqual([pendienteAntes, nueva].sort())
    expect((await leerEntregaDb(t, e.ana.id))?.version).toBe(3)
  })
})

describe("ataque ENTREGAS-01b r1: «Trabajo de clase» y la lista del maestro", () => {
  it("cada alumna ve solo su entrega en «Trabajo de clase»; el maestro y el admin reciben entrega null en todas", async () => {
    const e = await escenario()
    const t1 = await tarea(e)
    const t2 = await tarea(e)
    expect(resultado(await entregar(e, t1, e.t.ana, { enlaces: ["https://ejemplo.mx"] }))).toBe(
      "200",
    )
    await crearEntregaDePrueba({
      tareaId: t2,
      alumnoId: e.beto.id,
      estado: "entregado",
      conRetraso: true,
    })
    const trabajo = async (token: string) =>
      Object.fromEntries(
        listaTrabajoRespuestaSchema
          .parse(
            (
              await pedir("GET", `/api/clases/${e.claseId}/trabajo?tema=sin-tema&limite=50`, token)
            ).json(),
          )
          .elementos.filter(({ id }) => id === t1 || id === t2)
          .map(({ id, entrega }) => [id === t1 ? "t1" : "t2", entrega]),
      )
    expect(await trabajo(e.t.ana)).toEqual({
      t1: { estado: "entregado", conRetraso: false },
      t2: null,
    })
    expect(await trabajo(e.t.beto)).toEqual({
      t1: null,
      t2: { estado: "entregado", conRetraso: true },
    })
    expect(await trabajo(e.t.maestro)).toEqual({ t1: null, t2: null })
    expect(await trabajo(e.t.admin)).toEqual({ t1: null, t2: null })
  })

  it("lista del maestro: la alumna desactivada y el alumno dado de baja (con entrega) no aparecen ni cuentan; un cursor de un maestro o del admin no da 500; un cursor inexistente, 400", async () => {
    const e = await escenario()
    const t = await tarea(e)
    expect(resultado(await entregar(e, t, e.t.ana, { enlaces: ["https://ejemplo.mx"] }))).toBe(
      "200",
    )
    expect(resultado(await entregar(e, t, e.t.beto, { enlaces: ["https://ejemplo.mx"] }))).toBe(
      "200",
    )
    const carla = await crearAlumnoDePrueba(idsUsuarios, {
      nombre: `Carla R1 ${randomUUID().slice(0, 4)}`,
    })
    await inscribirDePrueba(e.claseId, carla.id)
    expect(
      resultado(
        await pedir("DELETE", `/api/clases/${e.claseId}/alumnos/${e.beto.id}`, e.t.maestro),
      ),
    ).toBe("204")
    await desactivarUsuarioDePrueba(e.ana.id)
    const lista = listaEntregasRespuestaSchema.parse(
      (await pedir("GET", `${base(e.claseId, t)}/entregas`, e.t.maestro)).json(),
    )
    expect([lista.entregas.map(({ alumno }) => alumno.id), lista.total, lista.entregadas]).toEqual([
      [carla.id],
      1,
      0,
    ])
    const admin = await obtenerDb().usuario.findFirst({
      where: { rol: "admin" },
      select: { id: true },
    })
    for (const cursor of [e.maestro.id, admin?.id ?? randomUUID()]) {
      const r = await pedir("GET", `${base(e.claseId, t)}/entregas?cursor=${cursor}`, e.t.maestro)
      expect(r.statusCode, r.body).toBeLessThan(500)
    }
    expect(
      resultado(
        await pedir("GET", `${base(e.claseId, t)}/entregas?cursor=${randomUUID()}`, e.t.maestro),
      ),
    ).toBe("400 VALIDACION")
  })
})

describe("ataque ENTREGAS-01b r1: borrar una tarea con entregas (§D-3.8)", () => {
  const foto = async (tareaId: string) => ({
    tarea: await obtenerDb().tarea.findUnique({ where: { id: tareaId } }),
    publicacion: await obtenerDb().publicacion.findUnique({ where: { id: tareaId } }),
    criterios: await obtenerDb().criterioRubrica.findMany({
      where: { tareaId },
      orderBy: { orden: "asc" },
    }),
    entregas: await obtenerDb().entrega.findMany({ where: { tareaId }, orderBy: { id: "asc" } }),
    archivos: await obtenerDb().archivo.findMany({
      where: {
        OR: [
          { publicacionId: tareaId },
          { entrega: { tareaId } },
          { claveObjeto: { startsWith: `entregas/${tareaId}/` } },
        ],
      },
      orderBy: { id: "asc" },
    }),
    trabajos: await obtenerDb().$queryRaw<{ id: string; state: string }[]>`
      SELECT id::text AS id, state::text AS state FROM pgboss.job
      WHERE data ->> 'tareaId' = ${tareaId}::text ORDER BY id`,
  })

  it("consultas raras (ENTREGAS, 1, true, vacía, repetida, con espacio, con una llave de más o en otra forma): 400 VALIDACION para maestro y admin, y nada cambia; el maestro con el parámetro recibe 409 con el conteo exacto", async () => {
    const e = await escenario()
    const t = await tarea(e)
    await crearEntregaDePrueba({ tareaId: t, alumnoId: e.ana.id })
    await crearEntregaDePrueba({ tareaId: t, alumnoId: e.beto.id, estado: "calificado" })
    const antes = await foto(t)
    const fallas: string[] = []
    for (const consulta of [
      "confirmar=ENTREGAS",
      "confirmar=1",
      "confirmar=true",
      "confirmar=",
      "confirmar=entregas&confirmar=entregas",
      "confirmar=%20entregas",
      "confirmar=entregas%00",
      "confirmar=entregas&x=1",
      "CONFIRMAR=entregas",
      "confirmar[]=entregas",
    ]) {
      for (const [quien, token] of [
        ["maestro", e.t.maestro],
        ["admin", e.t.admin],
      ] as const) {
        const r = await pedir("DELETE", `${base(e.claseId, t)}?${consulta}`, token)
        if (resultado(r) !== "400 VALIDACION") fallas.push(`${quien} ?${consulta}: ${resultado(r)}`)
      }
    }
    expect(fallas).toEqual([])
    const maestro = await pedir("DELETE", `${base(e.claseId, t)}?confirmar=entregas`, e.t.maestro)
    expect([resultado(maestro), errorApiSchema.parse(maestro.json()).error.mensaje]).toEqual([
      "409 TAREA_CON_ENTREGAS",
      "Esta tarea tiene 2 entregas y no se puede borrar. Si de verdad hay que borrarla, pídelo a administración.",
    ])
    expect(await foto(t)).toEqual(antes)
  })

  it("admin con ?confirmar=entregas y archivos confirmados en entregas, una entrega asignada y un hilo privado: 204, sin 500 ni P2003; no queda nada de la tarea y sus archivos quedan descartados sin contexto", async () => {
    const e = await escenario()
    const t = await tarea(e)
    const archivo = await subirDeEntrega(e, t, e.ana, e.t.ana)
    expect(resultado(await entregar(e, t, e.t.ana, { archivoIds: [archivo] }))).toBe("200")
    const pendiente = await subirDeEntrega(e, t, e.beto, e.t.beto)
    const asignada = await crearEntregaDePrueba({
      tareaId: t,
      alumnoId: e.beto.id,
      estado: "asignado",
    })
    await obtenerDb().comentario.create({
      data: { entregaId: asignada, autorId: e.beto.id, texto: "privado" },
    })
    const sin = await pedir("DELETE", base(e.claseId, t), e.t.admin)
    expect([resultado(sin), errorApiSchema.parse(sin.json()).error.mensaje]).toEqual([
      "409 TAREA_CON_ENTREGAS",
      "Esta tarea tiene 1 entrega. Si la borras, también se borrarán la entrega y los comentarios privados, y no se puede deshacer.",
    ])
    expect(
      resultado(await pedir("DELETE", `${base(e.claseId, t)}?confirmar=entregas`, e.t.admin)),
    ).toBe("204")
    const despues = await foto(t)
    expect([despues.tarea, despues.publicacion, despues.criterios, despues.entregas]).toEqual([
      null,
      null,
      [],
      [],
    ])
    expect(await obtenerDb().comentario.count({ where: { entregaId: asignada } })).toBe(0)
    const confirmado = await leerArchivoDb(archivo)
    expect([confirmado?.estado, confirmado?.entregaId, confirmado?.publicacionId]).toEqual([
      "descartado",
      null,
      null,
    ])
    expect((await leerArchivoDb(pendiente))?.estado).toBe("pendiente")
    expect(resultado(await entregar(e, t, e.t.beto, { archivoIds: [pendiente] }))).toBe(
      "404 TAREA_NO_ENCONTRADA",
    )
  })
})

describe("ataque ENTREGAS-01b r1: P2028 por HTTP (T-r1-1)", () => {
  it(
    "con la fila de la entrega retenida más que el timeout de la transacción, POST …/entrega responde 503 SERVICIO_OCUPADO y no escribe nada",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const t = await tarea(e)
      const id = await crearEntregaDePrueba({
        tareaId: t,
        alumnoId: e.ana.id,
        estado: "asignado",
        version: 2,
      })
      const [r] = await conFilaDeEntregasRetenida(
        { tabla: "entregas", id },
        [() => entregar(e, t, e.t.ana, { enlaces: ["https://ejemplo.mx"] })],
        { antesDeSoltar: () => esperar(5_500) },
      )
      if (!r?.ok) throw new Error("Precondición: la entrega respondió por la API")
      expect(resultado(r.valor)).toBe("503 SERVICIO_OCUPADO")
      const fila = await leerEntregaDb(t, e.ana.id)
      expect([fila?.estado, fila?.version, fila?.enlaces]).toEqual(["asignado", 2, []])
      expect(await trabajosDeEntregaDeTarea(t)).toEqual([])
    },
  )
})

describe("ataque ENTREGAS-01b r1: revisión estática de 01b", () => {
  const SRC = join(import.meta.dirname, "..", "src")
  const SHARED = join(import.meta.dirname, "..", "..", "shared", "src")
  const sinComentarios = (texto: string): string =>
    texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1")
  const leer = (ruta: string) => sinComentarios(readFileSync(join(SRC, ruta), "utf8"))

  it("O-2 de la Enmienda 3: FOR KEY SHARE aparece una sola vez en el código de adapters/db/entregas.ts, dentro de bloquearTareaParaEntregar, y la usan entregar y anularEntrega", () => {
    const codigo = leer("adapters/db/entregas.ts")
    expect(codigo.match(/FOR\s+KEY\s+SHARE/gi)?.length).toBe(1)
    const inicio = codigo.indexOf("const bloquearTareaParaEntregar")
    const fin = codigo.indexOf("\nconst ", inicio + 1)
    expect(inicio, "Precondición: bloquearTareaParaEntregar existe").toBeGreaterThanOrEqual(0)
    expect(codigo.slice(inicio, fin)).toMatch(/FOR\s+KEY\s+SHARE/)
    for (const nombre of ["export const entregar =", "export const anularEntrega ="]) {
      const desde = codigo.indexOf(nombre)
      const hasta = codigo.indexOf("\nexport const ", desde + 1)
      expect(codigo.slice(desde, hasta), nombre).toContain("bloquearTareaParaEntregar(tx")
    }
  })

  it("adapters/db no importa adapters/queue; handlers/tareas/entregas.ts no compara relación ni rol y no toca Prisma ni SQL; el SQL de entregas.ts es etiquetado, sin Unsafe ni consultas en ciclos", () => {
    const db = ["entregas.ts", "tareas.ts", "archivos.ts", "inscripciones.ts"].map((a) =>
      leer(`adapters/db/${a}`),
    )
    expect(db.filter((c) => /adapters\/queue|from\s+["']\.\.\/queue/.test(c))).toEqual([])
    const handler = leer("handlers/tareas/entregas.ts")
    expect(handler).not.toMatch(
      /relacion\s*===|\.rol\b|===\s*"(admin|maestro|estudiante)"|\$queryRaw|\$executeRaw|obtenerDb|@prisma/,
    )
    const entregas = leer("adapters/db/entregas.ts")
    expect(entregas).not.toMatch(/Unsafe/)
    expect(entregas).not.toMatch(/\b(for|while)\s*\([^)]*\)\s*\{[^}]*await\s/)
    expect(entregas).not.toMatch(/\.forEach\([^)]*async/)
  })

  it("toda respuesta nueva de shared/src/entregas.ts es z.strictObject", () => {
    const texto = sinComentarios(readFileSync(join(SHARED, "entregas.ts"), "utf8"))
    const respuestas = [...texto.matchAll(/export const (\w+(?:Schema)) = (z\.\w+)\(/g)]
      .filter(([, nombre]) =>
        /^(miEntrega|entregaDeAlumno|filaDeEntrega|listaEntregas|alumnoDeEntrega)(Respuesta)?Schema$/.test(
          nombre ?? "",
        ),
      )
      .map(([, nombre, constructor]) => `${nombre ?? ""}: ${constructor ?? ""}`)
    expect(respuestas.length).toBe(7)
    expect(respuestas.filter((r) => !r.endsWith("z.strictObject"))).toEqual([])
  })
})
