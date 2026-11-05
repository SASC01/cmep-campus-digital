import { randomUUID } from "node:crypto"

import {
  claseRespuestaSchema,
  errorApiSchema,
  listaClasesAdminRespuestaSchema,
  listaClasesAnterioresRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria, type AlmacenEnMemoria } from "./almacen-en-memoria.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  archivarClaseDePrueba,
  leerEstadoDeClase,
  pedirComo,
  rutasDeLaApp,
  type MetodoDePrueba,
} from "./ayudas-clases-archivadas.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  crearComentarioDePrueba,
  crearPublicacionDePrueba,
  inscribirDePrueba,
  leerInscripcion,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { formadasDetrasDe } from "./ayudas-concurrencia.js"
import {
  crearArchivoDeEntregaDePrueba,
  crearEntregaDePrueba,
  type TxDeRetencion,
} from "./ayudas-entregas.js"
import { crearTareaDePrueba } from "./ayudas-tareas.js"

// Ataque del Tester, ADMIN-01a, ronda 1. Lo que las pruebas requeridas (ADM-1A01 a 1A15) no
// recorren: las carreras de archivar (contra otro archivado, contra restaurar, contra unirse y
// contra una escritura que ya pasó el sexto paso), el keyset de GET /clases/anteriores y de la lista
// del admin por estado (empates a lo largo de varias páginas, la clase del cursor restaurada y vuelta
// a archivar), el parámetro `estado` malformado, el orden 403/409 para los actores que la matriz no
// prueba (maestro ajeno, restringido, cambio de contraseña pendiente, sin token, HEAD), las lecturas
// con datos reales (las tres descargas firman y nada se escribe) y las fugas de
// GET /clases/anteriores. N-18: ninguna clase de este archivo queda confirmada con 0 o 3 maestros.
// Las fechas de archivo son fijas; las únicas fechas "ahora" son las que pone la API al archivar.

let app: FastifyInstance | undefined
let almacen: AlmacenEnMemoria | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
let tokenAdmin = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const obtenerAlmacen = (): AlmacenEnMemoria => {
  if (!almacen) throw new Error("El almacén en memoria no se creó en beforeAll")
  return almacen
}

const pedir = (
  method: MetodoDePrueba,
  url: string,
  token?: string,
  payload?: object,
): Promise<LightMyRequestResponse> =>
  pedirComo(obtenerApp(), {
    method,
    url,
    ...(token === undefined ? {} : { token }),
    ...(payload === undefined ? {} : { payload }),
  })

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))
const ficha = (): string => randomUUID().slice(0, 8)

const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })
const maestroDePrueba = (nombre = `Maestro ${ficha()}`) =>
  crearAlumnoDePrueba(idsUsuarios, { nombre, rol: "maestro" })
const estudianteDePrueba = (opciones: { accesoRestringido?: boolean } = {}) =>
  crearAlumnoDePrueba(idsUsuarios, { nombre: `Estudiante ${ficha()}`, ...opciones })

// "200" o "<estado> <codigo>": un 500 o un cuerpo que no es el de error de la API falla aquí.
const resumir = (respuesta: LightMyRequestResponse): string => {
  if (respuesta.statusCode >= 200 && respuesta.statusCode < 300) {
    return String(respuesta.statusCode)
  }
  const { codigo } = errorApiSchema.parse(respuesta.json()).error
  return `${String(respuesta.statusCode)} ${codigo}`
}

const FUGA =
  /estadoPago|fechaEstadoPago|accesoRestringido|motivoRestriccion|"email"|"correo"|"version"|"activo"|hash|codigoInvitacion|"codigo"/

// La clase cumple el CHECK clases_activa_segun_archivada (leída fuera de la API).
const expectEstadoCoherente = async (claseId: string): Promise<boolean> => {
  const estado = await leerEstadoDeClase(claseId)
  expect(estado.activa, `CHECK de ${claseId}`).toBe(estado.archivadaEn === null)
  return estado.archivadaEn !== null
}

type Operacion = () => Promise<LightMyRequestResponse>

interface Retencion {
  respuestas: LightMyRequestResponse[]
  // Por operación: si llegó a esperar la fila retenida (true) o terminó sin esperarla (false).
  formadas: boolean[]
}

// Retiene la fila de la clase con FOR UPDATE en una transacción propia y lanza las operaciones en
// orden fijo: cada una se lanza cuando la anterior ya espera la fila (formadasDetrasDe) o ya
// terminó. `alRetener` corre dentro de la retenedora antes de lanzar nada (por ejemplo, un archivado
// sin confirmar); `antesDeSoltar`, justo antes de confirmar. Timeout explícito mayor que la espera
// más larga (AGENTS.md, CHORE-02).
const conClaseRetenida = async (
  claseId: string,
  operaciones: readonly Operacion[],
  {
    alRetener,
    antesDeSoltar,
  }: {
    alRetener?: (tx: TxDeRetencion) => Promise<void>
    antesDeSoltar?: (tx: TxDeRetencion) => Promise<void>
  } = {},
): Promise<Retencion> => {
  const lanzadas: Promise<LightMyRequestResponse>[] = []
  const formadas: boolean[] = []
  await obtenerDb().$transaction(
    async (tx) => {
      const tomada = await tx.$queryRaw<{ id: string }[]>`
        SELECT id::text AS id FROM clases WHERE id = ${claseId}::uuid FOR UPDATE`
      expect(tomada, "Precondición: la retenedora tomó la fila de la clase").toHaveLength(1)
      if (alRetener) await alRetener(tx)
      const [propio] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
      if (!propio) throw new Error("Precondición: no se obtuvo el pid de la retenedora")
      let enEspera = 0
      for (const operacion of operaciones) {
        let terminada = false
        const lanzada = operacion()
        lanzada.then(
          () => (terminada = true),
          () => (terminada = true),
        )
        lanzadas.push(lanzada)
        const limite = Date.now() + 10_000
        let formada = false
        while (!formada && !terminada && Date.now() < limite) {
          formada = (await formadasDetrasDe(propio.pid)) >= enEspera + 1
          if (!formada) await esperar(25)
        }
        expect(
          formada || terminada,
          `Precondición: la operación ${String(lanzadas.length)} no llegó a la fila en 10 s`,
        ).toBe(true)
        if (formada) enEspera++
        formadas.push(formada)
      }
      if (antesDeSoltar) await antesDeSoltar(tx)
      await esperar(100)
    },
    { timeout: 30_000, maxWait: 5_000 },
  )
  return { respuestas: await Promise.all(lanzadas), formadas }
}

const archivarEnLaRetenedora = async (tx: TxDeRetencion, claseId: string): Promise<void> => {
  const n = await tx.$executeRaw`
    UPDATE clases SET activa = false, archivada_en = now()
    WHERE id = ${claseId}::uuid AND archivada_en IS NULL`
  expect(n, "Precondición: la retenedora archivó la clase").toBe(1)
}

beforeAll(async () => {
  almacen = crearAlmacenEnMemoria()
  // warn: los P2028 (warn) y los 500 (error) de este archivo salen en la corrida (PA-07).
  app = await construirApp({ env: { ...cargarEnv(), LOG_LEVEL: "warn" }, almacen })
  await app.ready()
  tokenAdmin = await tokenDelAdminDePrueba()
}, 30_000)

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("carreras de archivar (ataque 01a-r1)", () => {
  it("ADM-T1A01: dos archivados a la vez → uno 200 y otro 409 CLASE_YA_ARCHIVADA; tres restauraciones a la vez → una 200 y dos 409 CLASE_NO_ARCHIVADA; nunca 500 ni el CHECK roto", async () => {
    const maestro = await maestroDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const url = `/api/admin/clases/${clase.id}`

    const archivados = await conClaseRetenida(clase.id, [
      () => pedir("POST", `${url}/archivar`, tokenAdmin),
      () => pedir("POST", `${url}/archivar`, tokenAdmin),
    ])
    expect(archivados.formadas, "Precondición: los dos esperaron la fila").toEqual([true, true])
    expect(archivados.respuestas.map(resumir).sort()).toEqual(["200", "409 CLASE_YA_ARCHIVADA"])
    const ganador = archivados.respuestas.find((r) => r.statusCode === 200)
    expect(ganador, "Precondición: un archivado respondió 200").toBeDefined()
    const fecha = claseRespuestaSchema.parse(ganador?.json()).clase.archivadaEn
    expect(await expectEstadoCoherente(clase.id)).toBe(true)
    expect((await leerEstadoDeClase(clase.id)).archivadaEn?.toISOString()).toBe(fecha)

    const restauraciones = await conClaseRetenida(clase.id, [
      () => pedir("POST", `${url}/restaurar`, tokenAdmin),
      () => pedir("POST", `${url}/restaurar`, tokenAdmin),
      () => pedir("POST", `${url}/restaurar`, tokenAdmin),
    ])
    expect(restauraciones.formadas).toEqual([true, true, true])
    expect(restauraciones.respuestas.map(resumir).sort()).toEqual([
      "200",
      "409 CLASE_NO_ARCHIVADA",
      "409 CLASE_NO_ARCHIVADA",
    ])
    expect(await expectEstadoCoherente(clase.id)).toBe(false)
  }, 60_000)

  it("ADM-T1A02: archivar contra restaurar en los tres órdenes (el que espera la fila, el que no la espera y el que la reevalúa) → 200 o 409 con el código del estado, nunca 500; el estado final es el del que ganó", async () => {
    const maestro = await maestroDePrueba()
    const activa = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const archivada = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const reevaluada = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await archivarClaseDePrueba(archivada.id, new Date("2026-01-10T10:00:00.000Z"))
    const archivar = (id: string) => () =>
      pedir("POST", `/api/admin/clases/${id}/archivar`, tokenAdmin)
    const restaurar = (id: string) => () =>
      pedir("POST", `/api/admin/clases/${id}/restaurar`, tokenAdmin)

    // (a) Activa: el archivado espera la fila; la restauración no la espera (su UPDATE no la ve
    // archivada) y responde 409 al momento.
    const a = await conClaseRetenida(activa.id, [archivar(activa.id), restaurar(activa.id)])
    expect(a.formadas).toEqual([true, false])
    expect(a.respuestas.map(resumir)).toEqual(["200", "409 CLASE_NO_ARCHIVADA"])
    expect(await expectEstadoCoherente(activa.id)).toBe(true)

    // (b) Archivada: al revés.
    const b = await conClaseRetenida(archivada.id, [
      restaurar(archivada.id),
      archivar(archivada.id),
    ])
    expect(b.formadas).toEqual([true, false])
    expect(b.respuestas.map(resumir)).toEqual(["200", "409 CLASE_YA_ARCHIVADA"])
    expect(await expectEstadoCoherente(archivada.id)).toBe(false)

    // (c) Un archivado sin confirmar retiene la fila: el archivado de la API la espera y, al
    // reevaluarla, ya no cumple su filtro (409); la restauración no la ve archivada (409).
    const c = await conClaseRetenida(
      reevaluada.id,
      [archivar(reevaluada.id), restaurar(reevaluada.id)],
      { alRetener: (tx) => archivarEnLaRetenedora(tx, reevaluada.id) },
    )
    expect(c.formadas).toEqual([true, false])
    expect(c.respuestas.map(resumir)).toEqual(["409 CLASE_YA_ARCHIVADA", "409 CLASE_NO_ARCHIVADA"])
    expect(await expectEstadoCoherente(reevaluada.id)).toBe(true)
  }, 60_000)

  it("ADM-T1A02b: ráfagas de archivar y restaurar la misma clase sin retención → solo 200 o 409 con su código, y la fila siempre cumple el CHECK", async () => {
    const maestro = await maestroDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const url = `/api/admin/clases/${clase.id}`
    const vistos = new Set<string>()
    for (let ronda = 0; ronda < 6; ronda++) {
      const respuestas = await Promise.all([
        pedir("POST", `${url}/archivar`, tokenAdmin),
        pedir("POST", `${url}/restaurar`, tokenAdmin),
        pedir("POST", `${url}/archivar`, tokenAdmin),
        pedir("POST", `${url}/restaurar`, tokenAdmin),
      ])
      for (const respuesta of respuestas) vistos.add(resumir(respuesta))
      await expectEstadoCoherente(clase.id)
    }
    for (const visto of vistos) {
      expect(["200", "409 CLASE_YA_ARCHIVADA", "409 CLASE_NO_ARCHIVADA"]).toContain(visto)
    }
    expect(vistos.has("200"), "Precondición: alguna operación ganó").toBe(true)
  }, 60_000)

  it("ADM-T1A03: unirse y archivar a la vez en ocho clases → el archivado siempre 200; unirse 200 (y la inscripción existe) o 404 CODIGO_INVALIDO (y no existe); nunca 500", async () => {
    const maestro = await maestroDePrueba()
    const casos = await Promise.all(
      Array.from({ length: 8 }, async () => {
        const alumno = await estudianteDePrueba()
        const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
        return { alumno, token: await tokenDe(alumno), clase }
      }),
    )
    const resultados = await Promise.all(
      casos.map(async ({ alumno, token, clase }) => {
        const [unirse, archivar] = await Promise.all([
          pedir("POST", "/api/clases/unirse", token, { codigo: clase.codigoInvitacion }),
          pedir("POST", `/api/admin/clases/${clase.id}/archivar`, tokenAdmin),
        ])
        return {
          unirse: resumir(unirse),
          archivar: resumir(archivar),
          inscrito: (await leerInscripcion(clase.id, alumno.id)) !== null,
          archivada: await expectEstadoCoherente(clase.id),
        }
      }),
    )
    for (const resultado of resultados) {
      expect(resultado.archivar).toBe("200")
      expect(resultado.archivada).toBe(true)
      expect(["200", "404 CODIGO_INVALIDO"]).toContain(resultado.unirse)
      expect(resultado.inscrito, JSON.stringify(resultado)).toBe(resultado.unirse === "200")
    }
  }, 60_000)

  it("ADM-T1A04: una escritura que pasó el sexto paso antes del archivado (R-03) confirma después sin 500 ni el CHECK roto: publicar, asignar un segundo maestro y regenerar el código", async () => {
    const maestro = await maestroDePrueba()
    const segundo = await maestroDePrueba()
    const tokenMaestro = await tokenDe(maestro)
    const publicar = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const asignar = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const codigo = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })

    const casos: [string, Operacion][] = [
      [
        publicar.id,
        () =>
          pedir("POST", `/api/clases/${publicar.id}/publicaciones`, tokenMaestro, {
            tipo: "anuncio",
            texto: "Aviso en vuelo",
            archivoIds: [],
          }),
      ],
      [
        asignar.id,
        () =>
          pedir("POST", `/api/admin/clases/${asignar.id}/maestros`, tokenAdmin, {
            maestroId: segundo.id,
          }),
      ],
      [codigo.id, () => pedir("POST", `/api/clases/${codigo.id}/codigo`, tokenMaestro)],
    ]
    for (const [claseId, operacion] of casos) {
      const { respuestas, formadas } = await conClaseRetenida(claseId, [operacion], {
        antesDeSoltar: (tx) => archivarEnLaRetenedora(tx, claseId),
      })
      expect(formadas, `Precondición: la escritura de ${claseId} esperó la fila`).toEqual([true])
      const [respuesta] = respuestas
      expect(respuesta?.statusCode, respuesta?.body).toBeGreaterThanOrEqual(200)
      expect(respuesta?.statusCode, respuesta?.body).toBeLessThan(300)
      expect(await expectEstadoCoherente(claseId)).toBe(true)
    }
    expect(await obtenerDb().publicacion.count({ where: { claseId: publicar.id } })).toBe(1)
    expect(await obtenerDb().maestroDeClase.count({ where: { claseId: asignar.id } })).toBe(2)
    expect((await leerEstadoDeClase(codigo.id)).codigoInvitacion).not.toBe(codigo.codigoInvitacion)
  }, 60_000)

  it("ADM-T1A05: editar la clase (PUT /admin/clases/:claseId) en carrera con un archivado que confirma después del sexto paso → 409 CLASE_ARCHIVADA, no 403 SIN_ACCESO_A_LA_CLASE, y el nombre no cambia", async () => {
    const maestro = await maestroDePrueba()
    const nombre = `Editada ${ficha()}`
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id, nombre })
    const { respuestas, formadas } = await conClaseRetenida(
      clase.id,
      [() => pedir("PUT", `/api/admin/clases/${clase.id}`, tokenAdmin, { nombre: "Otro nombre" })],
      { antesDeSoltar: (tx) => archivarEnLaRetenedora(tx, clase.id) },
    )
    expect(formadas, "Precondición: la edición esperó la fila después del sexto paso").toEqual([
      true,
    ])
    expect((await leerEstadoDeClase(clase.id)).nombre).toBe(nombre)
    const [respuesta] = respuestas
    expect(respuesta?.statusCode, respuesta?.body).toBe(409)
    expect(respuesta?.json()).toEqual({
      error: {
        codigo: "CLASE_ARCHIVADA",
        mensaje: "Esta clase está archivada: solo se puede consultar.",
      },
    })
  }, 30_000)
})

// Recorre GET /clases/anteriores de página en página con el token dado. C-21 (ronda 2, Enmienda 5):
// cada página manda el cursor y su posición, el siguienteCursorArchivadaEn de la página anterior.
const recorrerAnteriores = async (token: string, limite: number): Promise<string[]> => {
  const ids: string[] = []
  let cursor: string | null = null
  let posicion: string | null = null
  for (let pagina = 0; pagina < 20; pagina++) {
    const consulta: string =
      cursor === null
        ? ""
        : `&cursor=${cursor}&cursorArchivadaEn=${encodeURIComponent(String(posicion))}`
    const respuesta = await pedir(
      "GET",
      `/api/clases/anteriores?limite=${String(limite)}${consulta}`,
      token,
    )
    expect(respuesta.statusCode, respuesta.body).toBe(200)
    const cuerpo = listaClasesAnterioresRespuestaSchema.parse(respuesta.json())
    ids.push(...cuerpo.clases.map((clase) => clase.id))
    cursor = cuerpo.siguienteCursor
    posicion = cuerpo.siguienteCursorArchivadaEn
    expect(posicion === null, "la posición es null exactamente cuando no hay siguiente").toBe(
      cursor === null,
    )
    if (cursor === null) return ids
  }
  throw new Error("La lista no terminó en 20 páginas")
}

const CURSOR_INVALIDO = { error: { codigo: "VALIDACION", mensaje: "cursor: no es válido" } }

const porIdDesc = (a: string, b: string): number => (a < b ? 1 : a > b ? -1 : 0)

describe("keyset de las clases archivadas (ataque 01a-r1)", () => {
  it("ADM-T1A06: GET /clases/anteriores con cinco archivadas en la misma fecha entre otras dos, en páginas de 1, 2 y 3 → cada clase una sola vez, en (archivada_en DESC, id DESC), para el alumno y para el maestro", async () => {
    const maestro = await maestroDePrueba()
    const alumno = await estudianteDePrueba()
    const empate = Date.parse("2026-01-15T10:00:00.000Z")
    const crear = async (fecha: number): Promise<string> => {
      const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
      await inscribirDePrueba(clase.id, alumno.id)
      await archivarClaseDePrueba(clase.id, new Date(fecha))
      return clase.id
    }
    const nueva = await crear(empate + 1)
    const empatadas: string[] = []
    for (let i = 0; i < 5; i++) empatadas.push(await crear(empate))
    const vieja = await crear(empate - 1)
    // Una activa del mismo alumno y maestro no entra.
    const activa = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(activa.id, alumno.id)
    const esperado = [nueva, ...[...empatadas].sort(porIdDesc), vieja]

    for (const token of [await tokenDe(alumno), await tokenDe(maestro)]) {
      for (const limite of [1, 2, 3]) {
        expect(await recorrerAnteriores(token, limite), `limite=${String(limite)}`).toEqual(
          esperado,
        )
      }
    }
  }, 60_000)

  it("ADM-T1A07: con la posición de la página 1, la página siguiente de GET /clases/anteriores → 200 [C, D]; con la clase del cursor restaurada → 400 «cursor: no es válido»; restaurada y vuelta a archivar por la API → el mismo 400 (C-22, Enmienda 5)", async () => {
    const maestro = await maestroDePrueba()
    const alumno = await estudianteDePrueba()
    const token = await tokenDe(alumno)
    const ids: string[] = []
    for (const dia of [14, 13, 12, 11]) {
      const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
      await inscribirDePrueba(clase.id, alumno.id)
      await archivarClaseDePrueba(clase.id, new Date(`2026-01-${String(dia)}T10:00:00.000Z`))
      ids.push(clase.id)
    }
    const primera = await pedir("GET", "/api/clases/anteriores?limite=2", token)
    const pagina1 = listaClasesAnterioresRespuestaSchema.parse(primera.json())
    expect(pagina1.clases.map((c) => c.id)).toEqual(ids.slice(0, 2))
    const cursor = pagina1.siguienteCursor
    expect(cursor, "Precondición: hay página siguiente").toBe(ids[1])
    const posicion = pagina1.siguienteCursorArchivadaEn
    expect(posicion).toBe("2026-01-13T10:00:00.000Z")
    const siguiente = `/api/clases/anteriores?limite=2&cursor=${String(cursor)}&cursorArchivadaEn=${encodeURIComponent(String(posicion))}`

    const control = await pedir("GET", siguiente, token)
    expect(control.statusCode, control.body).toBe(200)
    expect(
      listaClasesAnterioresRespuestaSchema.parse(control.json()).clases.map((c) => c.id),
    ).toEqual(ids.slice(2))

    const restaurada = await pedir(
      "POST",
      `/api/admin/clases/${String(cursor)}/restaurar`,
      tokenAdmin,
    )
    expect(restaurada.statusCode).toBe(200)
    const conRestaurada = await pedir("GET", siguiente, token)
    expect(conRestaurada.statusCode).toBe(400)
    expect(conRestaurada.json()).toEqual(CURSOR_INVALIDO)

    const archivada = await pedir(
      "POST",
      `/api/admin/clases/${String(cursor)}/archivar`,
      tokenAdmin,
    )
    expect(archivada.statusCode).toBe(200)
    const segunda = await pedir("GET", siguiente, token)
    expect(segunda.statusCode, segunda.body).toBe(400)
    expect(segunda.json()).toEqual(CURSOR_INVALIDO)
  }, 30_000)

  it("ADM-T1A07b (hermano en GET /admin/clases?estado=archivadas): desde el centinela con su posición → [a, b]; con la posición de b → [c]; b restaurada y vuelta a archivar directo en la base con una fecha posterior → 400 «cursor: no es válido» con la posición vieja (C-23, Enmienda 5)", async () => {
    const maestro = await maestroDePrueba()
    // Fechas de 2020, que ninguna otra prueba usa: el recorrido arranca con un cursor propio, así que
    // las archivadas de otros archivos (con fecha de hoy o de 2099) no entran en la ventana.
    const segundo = (s: number) => new Date(`2020-03-07T08:00:0${String(s)}.000Z`)
    const ids: Record<"centinela" | "a" | "b" | "c", string> = {
      centinela: "",
      a: "",
      b: "",
      c: "",
    }
    for (const [nombre, s] of [
      ["centinela", 6],
      ["a", 5],
      ["b", 4],
      ["c", 3],
    ] as const) {
      const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
      await archivarClaseDePrueba(clase.id, segundo(s))
      ids[nombre] = clase.id
    }
    const url = (cursor: string, posicion: Date, limite = 2) =>
      `/api/admin/clases?estado=archivadas&limite=${String(limite)}&cursor=${cursor}&cursorArchivadaEn=${encodeURIComponent(posicion.toISOString())}`
    const primera = await pedir("GET", url(ids.centinela, segundo(6)), tokenAdmin)
    expect(primera.statusCode, primera.body).toBe(200)
    const pagina1 = listaClasesAdminRespuestaSchema.parse(primera.json())
    expect(
      pagina1.clases.map((c) => c.id),
      "Precondición: nadie más archivó en esa ventana",
    ).toEqual([ids.a, ids.b])
    expect(pagina1.siguienteCursor).toBe(ids.b)
    expect(pagina1.siguienteCursorArchivadaEn).toBe(segundo(4).toISOString())

    // Control: antes de mover b, su posición da exactamente [c] con limite=1.
    const control = await pedir("GET", url(ids.b, segundo(4), 1), tokenAdmin)
    expect(control.statusCode, control.body).toBe(200)
    expect(listaClasesAdminRespuestaSchema.parse(control.json()).clases.map((c) => c.id)).toEqual([
      ids.c,
    ])

    // Restaurada y vuelta a archivar: queda con una fecha posterior a la de la página que ya se vio.
    const restaurada = await pedir("POST", `/api/admin/clases/${ids.b}/restaurar`, tokenAdmin)
    expect(restaurada.statusCode).toBe(200)
    await archivarClaseDePrueba(ids.b, segundo(7))
    const segunda = await pedir("GET", url(ids.b, segundo(4)), tokenAdmin)
    expect(segunda.statusCode, segunda.body).toBe(400)
    expect(segunda.json()).toEqual(CURSOR_INVALIDO)
  }, 30_000)

  it("ADM-T1A08: GET /admin/clases?estado= malformado (mayúsculas, arreglo, vacío, espacios, nulo, comillas) → 400 VALIDACION, nunca 500; sin estado y con un cursor archivado → 200; GET /clases/anteriores con limite o cursor malformados → 400", async () => {
    const maestro = await maestroDePrueba()
    const alumno = await estudianteDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, alumno.id)
    await archivarClaseDePrueba(clase.id, new Date("2026-01-20T10:00:00.000Z"))

    for (const consulta of [
      "estado=Activas",
      "estado=ARCHIVADAS",
      "estado=activas&estado=archivadas",
      "estado=activas&estado=activas",
      "estado=",
      "estado=%20",
      "estado=%20activas",
      "estado=activas%20",
      "estado=activas%00",
      "estado=archivadas%27--",
      "estado=null",
      "estado=undefined",
      "estado=todas",
    ]) {
      const respuesta = await pedir("GET", `/api/admin/clases?${consulta}`, tokenAdmin)
      expect(resumir(respuesta), consulta).toBe("400 VALIDACION")
    }
    const sinEstado = await pedir(
      "GET",
      `/api/admin/clases?limite=1&cursor=${clase.id}`,
      tokenAdmin,
    )
    expect(resumir(sinEstado)).toBe("200")

    const tokenAlumno = await tokenDe(alumno)
    for (const consulta of [
      "limite=0",
      "limite=-1",
      "limite=101",
      "limite=1.5",
      "limite=abc",
      "cursor=no-es-uuid",
      "cursor=",
      `cursor=${randomUUID()}`,
      `cursor=${clase.id}&cursor=${clase.id}`,
      `cursor=${clase.id}'--`,
      // C-24 (Enmienda 5): el cursor sin su posición y posiciones manipuladas.
      `cursor=${clase.id}`,
      "cursorArchivadaEn=2026-01-20T10%3A00%3A00.000Z",
      `cursor=${clase.id}&cursorArchivadaEn=`,
      `cursor=${clase.id}&cursorArchivadaEn=2026-01-20T10%3A00%3A00Z`,
      `cursor=${clase.id}&cursorArchivadaEn=2026-01-20T10%3A00%3A00.000%2B00%3A00`,
      `cursor=${clase.id}&cursorArchivadaEn=2026-01-20T10%3A00%3A00.000Z&cursorArchivadaEn=2026-01-20T10%3A00%3A00.000Z`,
    ]) {
      const respuesta = await pedir("GET", `/api/clases/anteriores?${consulta}`, tokenAlumno)
      expect(resumir(respuesta), consulta).toBe("400 VALIDACION")
    }
    const conSuCursor = await pedir(
      "GET",
      `/api/clases/anteriores?cursor=${clase.id}&cursorArchivadaEn=2026-01-20T10%3A00%3A00.000Z`,
      tokenAlumno,
    )
    expect(resumir(conSuCursor)).toBe("200")
  }, 30_000)
})

// La URL concreta de una ruta de printRoutes: la clase dada y un id al azar en los demás parámetros.
const urlDeRuta = (ruta: string, claseId: string): string =>
  ruta
    .slice(ruta.indexOf(" ") + 1)
    .replace(":claseId", claseId)
    .replace(/:[a-zA-Z]+/g, () => randomUUID())

const metodoDeRuta = (ruta: string): MetodoDePrueba =>
  ruta.slice(0, ruta.indexOf(" ")) as MetodoDePrueba

const rutasConClase = (): string[] => {
  const { rutas, noReconocidas } = rutasDeLaApp(obtenerApp())
  expect(noReconocidas, "líneas del árbol de rutas que no se pudieron analizar").toEqual([])
  const conClase = [...rutas].filter((ruta) => ruta.includes(":claseId")).sort()
  expect(conClase.length, "Precondición: hay rutas con :claseId").toBeGreaterThan(60)
  return conClase
}

describe("orden 403/409 en una clase archivada (ataque 01a-r1)", () => {
  it("ADM-T1A09: en toda ruta con :claseId (HEAD incluidos) de una archivada, el maestro ajeno, el alumno restringido inscrito, el maestro de la clase con cambio de contraseña pendiente y la petición sin token reciben su 401/403 de siempre, nunca 409; el admin, el mismo 403 que en una gemela activa", async () => {
    const maestro = await maestroDePrueba()
    const ajeno = await maestroDePrueba()
    const restringido = await estudianteDePrueba({ accesoRestringido: true })
    const pendiente = await crearUsuarioDePrueba(idsUsuarios, {
      rol: "maestro",
      nombre: `Pendiente ${ficha()}`,
      debeCambiarContrasena: true,
    })
    const archivada = await crearClaseDePrueba(idsClases, {
      maestroId: maestro.id,
      maestroIds: [maestro.id, pendiente.id],
    })
    const gemela = await crearClaseDePrueba(idsClases, {
      maestroId: maestro.id,
      maestroIds: [maestro.id, pendiente.id],
    })
    for (const clase of [archivada, gemela]) await inscribirDePrueba(clase.id, restringido.id)
    await archivarClaseDePrueba(archivada.id, new Date("2026-01-21T10:00:00.000Z"))
    const tokens = {
      ajeno: await tokenDe(ajeno),
      restringido: await tokenDe(restringido),
      pendiente: await tokenDe(pendiente),
    }
    const esperadoPorActor: Record<keyof typeof tokens, readonly string[]> = {
      ajeno: ["403 SIN_ACCESO_A_LA_CLASE", "403 ROL_NO_PERMITIDO"],
      restringido: ["403 ACCESO_RESTRINGIDO"],
      pendiente: ["403 CAMBIO_DE_CONTRASENA_REQUERIDO"],
    }

    let revisadas = 0
    for (const ruta of rutasConClase()) {
      const metodo = metodoDeRuta(ruta)
      const esHead = metodo === "HEAD"
      for (const actor of ["ajeno", "restringido", "pendiente"] as const) {
        const respuesta = await pedir(metodo, urlDeRuta(ruta, archivada.id), tokens[actor])
        if (esHead) {
          expect(respuesta.statusCode, `${actor} ${ruta}`).toBe(403)
          continue
        }
        expect(esperadoPorActor[actor], `${actor} ${ruta}`).toContain(resumir(respuesta))
      }
      const sinToken = await pedir(metodo, urlDeRuta(ruta, archivada.id))
      expect(sinToken.statusCode, `sin token ${ruta}`).toBe(401)

      const adminEnLaGemela = await pedir(metodo, urlDeRuta(ruta, gemela.id), tokenAdmin)
      if (adminEnLaGemela.statusCode === 403) {
        const adminEnLaArchivada = await pedir(metodo, urlDeRuta(ruta, archivada.id), tokenAdmin)
        expect(adminEnLaArchivada.statusCode, `admin ${ruta}`).toBe(403)
        if (!esHead)
          expect(resumir(adminEnLaArchivada), `admin ${ruta}`).toBe(resumir(adminEnLaGemela))
      }
      revisadas++
    }
    expect(revisadas).toBeGreaterThan(60)
  }, 180_000)
})

// Las filas de la clase que una lectura no debe tocar (sin la fila de la clase, que se compara
// aparte): ids, estados, versiones y marcas de actualización.
const fotoDeLaClase = async (claseId: string): Promise<unknown> => {
  const db = obtenerDb()
  return {
    clase: await leerEstadoDeClase(claseId),
    archivos: await db.$queryRaw`
      SELECT id::text, estado::text, publicacion_id::text, entrega_id::text, actualizado_en
      FROM archivos WHERE clase_id = ${claseId}::uuid ORDER BY id`,
    entregas: await db.$queryRaw`
      SELECT e.id::text, e.estado::text, e.version, e.actualizado_en, e.calificacion::text
      FROM entregas e JOIN tareas t ON t.id = e.tarea_id
      WHERE t.clase_id = ${claseId}::uuid ORDER BY e.id`,
    publicaciones: await db.$queryRaw`
      SELECT id::text, actualizado_en FROM publicaciones WHERE clase_id = ${claseId}::uuid ORDER BY id`,
    comentarios: await db.comentario.count({ where: { publicacion: { claseId } } }),
    inscripciones: await db.inscripcion.count({ where: { claseId } }),
    maestros: await db.maestroDeClase.count({ where: { claseId } }),
    trabajos: await db.$queryRaw`
      SELECT count(*)::int AS n FROM pgboss.job WHERE data::text LIKE ${`%${claseId}%`}`,
  }
}

describe("lecturas con datos reales en una archivada (ataque 01a-r1)", () => {
  it("ADM-T1A10: el maestro y el admin leen con 200 cada ruta «lectura» de una archivada con datos, las dos descargas que admiten su rol firman su objeto, y nada se escribe; el alumno inscrito recibe 409 en las tres descargas y en su entrega, y no se firma nada para él", async () => {
    const maestro = await maestroDePrueba()
    const alumno = await estudianteDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, alumno.id)
    const anuncio = await crearPublicacionDePrueba({ claseId: clase.id, autorId: maestro.id })
    await crearComentarioDePrueba({ publicacionId: anuncio, autorId: alumno.id })
    const material = await crearPublicacionDePrueba({
      claseId: clase.id,
      autorId: maestro.id,
      tipo: "material",
    })
    const adjunto = await crearArchivoDePrueba({
      claseId: clase.id,
      subidoPor: maestro.id,
      estado: "confirmado",
      publicacionId: anuncio,
    })
    const tareaId = await crearTareaDePrueba({
      claseId: clase.id,
      autorId: maestro.id,
      fechaLimite: new Date("2026-01-05T10:00:00.000Z"),
    })
    const entregaId = await crearEntregaDePrueba({
      tareaId,
      alumnoId: alumno.id,
      fechaEntrega: new Date("2026-01-04T10:00:00.000Z"),
    })
    const deEntrega = await crearArchivoDeEntregaDePrueba({
      claseId: clase.id,
      tareaId,
      alumnoId: alumno.id,
      estado: "confirmado",
      entregaId,
    })
    await archivarClaseDePrueba(clase.id, new Date("2026-01-22T10:00:00.000Z"))
    const tokens = { maestro: await tokenDe(maestro), admin: tokenAdmin }
    const tokenAlumno = await tokenDe(alumno)

    const base = `/api/clases/${clase.id}`
    const lecturas: [MetodoDePrueba, string][] = [
      ["GET", base],
      ["GET", `${base}/personas`],
      ["GET", `${base}/alumnos`],
      ["GET", `${base}/publicaciones`],
      ["GET", `${base}/publicaciones/${anuncio}/comentarios`],
      ["GET", `${base}/recursos?bloque=docente&tema=sin-tema`],
      ["GET", `${base}/recursos/${material}`],
      ["GET", `${base}/dudas`],
      ["GET", `${base}/temas`],
      ["GET", `${base}/categorias`],
      ["GET", `${base}/tareas/${tareaId}`],
      ["GET", `${base}/trabajo?tema=sin-tema`],
      ["GET", `${base}/tareas/${tareaId}/entregas`],
      ["GET", `${base}/tareas/${tareaId}/entregas/${alumno.id}`],
      ["GET", `${base}/tareas/${tareaId}/entregas/${alumno.id}/comentarios`],
      ["GET", `${base}/gradebook`],
      ["GET", `${base}/calificaciones/exportacion`],
      ["POST", `${base}/archivos/${adjunto.id}/descarga`],
      ["POST", `${base}/tareas/${tareaId}/entregas/${alumno.id}/archivos/${deEntrega.id}/descarga`],
    ]
    const antes = await fotoDeLaClase(clase.id)
    const firmadas = obtenerAlmacen().descargasFirmadas
    for (const [actor, token] of Object.entries(tokens)) {
      let leidas = 0
      for (const [metodo, url] of lecturas) {
        const respuesta = await pedir(metodo, url, token)
        // Las rutas que no nombran al admin en sus roles lo rechazan en requireRole, antes del sexto
        // paso y sin mirar la clase (igual en una activa).
        const admitidos = actor === "admin" ? ["200", "403 ROL_NO_PERMITIDO"] : ["200"]
        expect(admitidos, `${actor} ${metodo} ${url}: ${respuesta.body}`).toContain(
          resumir(respuesta),
        )
        if (respuesta.statusCode === 200) leidas++
      }
      expect(leidas, `${actor}: lecturas con 200`).toBeGreaterThanOrEqual(
        actor === "admin" ? 12 : 19,
      )
      const firmadasDelActor = firmadas.filter(
        (f) =>
          (f.clave === adjunto.claveObjeto || f.clave === deEntrega.claveObjeto) &&
          f.disposicion.startsWith("attachment"),
      )
      expect(firmadasDelActor.length, `${actor}: firmó las dos descargas`).toBeGreaterThanOrEqual(2)
    }
    expect(await fotoDeLaClase(clase.id), "una lectura escribió algo").toEqual(antes)

    const firmadasAntesDelAlumno = firmadas.length
    for (const [metodo, url] of [
      ["POST", `${base}/archivos/${adjunto.id}/descarga`],
      ["POST", `${base}/tareas/${tareaId}/entrega/archivos/${deEntrega.id}/descarga`],
      ["GET", `${base}/tareas/${tareaId}/entrega`],
      ["GET", `${base}/tareas/${tareaId}/entrega/comentarios`],
    ] as const) {
      const respuesta = await pedir(metodo, url, tokenAlumno)
      expect(resumir(respuesta), `alumno ${metodo} ${url}`).toBe("409 CLASE_ARCHIVADA")
    }
    expect(firmadas.length, "se firmó una URL para el alumno").toBe(firmadasAntesDelAlumno)
    expect(await fotoDeLaClase(clase.id)).toEqual(antes)
  }, 60_000)
})

describe("GET /clases/anteriores sin fugas (ataque 01a-r1)", () => {
  it("ADM-T1A11: con dos maestros (uno dado de baja) de nombres raros, el alumno y el maestro ven los dos nombres y nada más (sin correo, estado de pago, restricción, versión, actividad ni código); una archivada con su único maestro dado de baja sigue listándose con su nombre, sin 500", async () => {
    const raro = `Zoë "O'Hara" <b>ñ</b> ${ficha()}`
    const principal = await maestroDePrueba(raro)
    const deBaja = await maestroDePrueba(`Baja ${ficha()}`)
    const alumno = await estudianteDePrueba()
    const companero = await crearAlumnoDePrueba(idsUsuarios, {
      nombre: `Deudor ${ficha()}`,
      estadoPago: "deudor",
      accesoRestringido: true,
    })
    const dos = await crearClaseDePrueba(idsClases, {
      maestroId: principal.id,
      maestroIds: [principal.id, deBaja.id],
    })
    const soloDeBaja = await crearClaseDePrueba(idsClases, { maestroId: deBaja.id })
    for (const clase of [dos, soloDeBaja]) {
      await inscribirDePrueba(clase.id, alumno.id)
      await inscribirDePrueba(clase.id, companero.id)
    }
    await archivarClaseDePrueba(dos.id, new Date("2026-01-23T10:00:00.000Z"))
    await archivarClaseDePrueba(soloDeBaja.id, new Date("2026-01-22T10:00:00.000Z"))
    await obtenerDb().usuario.update({
      where: { id: deBaja.id },
      data: { activo: false },
      select: { id: true },
    })

    const respuesta = await pedir("GET", "/api/clases/anteriores", await tokenDe(alumno))
    expect(respuesta.statusCode, respuesta.body).toBe(200)
    expect(respuesta.body).not.toMatch(FUGA)
    const cuerpo = listaClasesAnterioresRespuestaSchema.parse(respuesta.json())
    expect(cuerpo.clases.map((c) => c.id)).toEqual([dos.id, soloDeBaja.id])
    expect(cuerpo.clases[1]?.maestros.map((m) => m.nombre)).toHaveLength(1)
    expect(cuerpo.clases[0]?.maestros.map((m) => m.nombre)).toContain(raro)
    expect(Object.keys(cuerpo.clases[0] ?? {}).sort()).toEqual([
      "archivadaEn",
      "id",
      "maestros",
      "nombre",
    ])
    expect(Object.keys(cuerpo.clases[0]?.maestros[0] ?? {})).toEqual(["nombre"])

    const delMaestro = await pedir("GET", "/api/clases/anteriores", await tokenDe(principal))
    expect(delMaestro.statusCode, delMaestro.body).toBe(200)
    expect(delMaestro.body).not.toMatch(FUGA)
    expect(
      listaClasesAnterioresRespuestaSchema.parse(delMaestro.json()).clases.map((c) => c.id),
    ).toEqual([dos.id])
  }, 30_000)

  it("ADM-T1A12: unirse con el código de una archivada responde igual que un código inexistente con la misma forma (en mayúsculas, minúsculas y con espacios), también para un alumno que ya estaba inscrito, y no inscribe", async () => {
    const maestro = await maestroDePrueba()
    const inscrito = await estudianteDePrueba()
    const nuevo = await estudianteDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, inscrito.id)
    await archivarClaseDePrueba(clase.id, new Date("2026-01-24T10:00:00.000Z"))
    // Un código con la misma forma que no existe: se cambia el último carácter por otro del alfabeto.
    const ultimo = clase.codigoInvitacion.slice(-1)
    const inexistente = `${clase.codigoInvitacion.slice(0, -1)}${ultimo === "A" ? "B" : "A"}`
    const variantes = (codigo: string) => [codigo, codigo.toLowerCase(), `  ${codigo}  `]

    for (const alumno of [inscrito, nuevo]) {
      const token = await tokenDe(alumno)
      const delArchivado = variantes(clase.codigoInvitacion)
      const delInexistente = variantes(inexistente)
      for (let i = 0; i < delArchivado.length; i++) {
        const a = await pedir("POST", "/api/clases/unirse", token, { codigo: delArchivado[i] })
        const b = await pedir("POST", "/api/clases/unirse", token, { codigo: delInexistente[i] })
        expect(a.statusCode, `${String(i)}: ${a.body}`).toBe(b.statusCode)
        expect(a.json(), String(i)).toEqual(b.json())
        expect(resumir(a)).toBe("404 CODIGO_INVALIDO")
      }
    }
    expect(await leerInscripcion(clase.id, nuevo.id)).toBeNull()
    expect(await leerInscripcion(clase.id, inscrito.id)).not.toBeNull()
  }, 30_000)

  it("ADM-T1A13: archivadaEn y activa en el cuerpo de crear, editar, archivar y restaurar no llegan a la base: crear y editar dejan la clase activa, y la fecha de archivo es la del servidor", async () => {
    const maestro = await maestroDePrueba()
    const falsa = "1999-12-31T00:00:00.000Z"
    const creada = await pedir("POST", "/api/admin/clases", tokenAdmin, {
      nombre: `Con extras ${ficha()}`,
      maestroIds: [maestro.id],
      archivadaEn: falsa,
      archivada_en: falsa,
      activa: false,
    })
    expect(creada.statusCode, creada.body).toBe(201)
    const { clase } = claseRespuestaSchema.parse(creada.json())
    idsClases.push(clase.id)
    expect(clase.archivadaEn).toBeNull()
    expect(await expectEstadoCoherente(clase.id)).toBe(false)

    const editada = await pedir("PUT", `/api/admin/clases/${clase.id}`, tokenAdmin, {
      nombre: "Editada con extras",
      archivadaEn: falsa,
      activa: false,
    })
    expect(editada.statusCode, editada.body).toBe(200)
    expect(await expectEstadoCoherente(clase.id)).toBe(false)

    const archivada = await pedir("POST", `/api/admin/clases/${clase.id}/archivar`, tokenAdmin, {
      archivadaEn: falsa,
    })
    expect(archivada.statusCode, archivada.body).toBe(200)
    const fecha = claseRespuestaSchema.parse(archivada.json()).clase.archivadaEn
    expect(fecha).not.toBe(falsa)
    expect((await leerEstadoDeClase(clase.id)).archivadaEn?.toISOString()).toBe(fecha)
    const restaurada = await pedir("POST", `/api/admin/clases/${clase.id}/restaurar`, tokenAdmin, {
      archivadaEn: falsa,
      activa: false,
    })
    expect(restaurada.statusCode, restaurada.body).toBe(200)
    expect(await expectEstadoCoherente(clase.id)).toBe(false)
  }, 30_000)
})
