import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { claveDeEntrega, prefijoDeEntrega, prefijoDeMateriales } from "../archivos/politica.js"
import { AppError } from "../errores.js"
import {
  accionesDeEntrega,
  alumnoDeLaRelacion,
  decidirAnulacion,
  decidirEntrega,
  entregaCerrada,
  esTarde,
  exigirEntregaAbierta,
  type EstadoEntrega,
  type TareaParaEntregar,
} from "./entregas.js"

// ENTREGAS-01b (§D-3.1): reglas puras de la entrega. El reloj es siempre explícito (`ahora`).

const LIMITE = new Date("2026-10-20T17:00:00.000Z")
const antes = new Date(LIMITE.getTime() - 1)
const justo = new Date(LIMITE.getTime())
const despues = new Date(LIMITE.getTime() + 1)

const tarea = (cambios: Partial<TareaParaEntregar> = {}): TareaParaEntregar => ({
  fechaLimite: LIMITE,
  aceptaTardias: true,
  requiereAdjuntos: true,
  ...cambios,
})

const codigoDe = (fn: () => unknown): string | null => {
  try {
    fn()
    return null
  } catch (error) {
    if (!(error instanceof AppError)) throw error
    return error.codigo
  }
}

const capturar = (fn: () => unknown): AppError => {
  try {
    fn()
  } catch (error) {
    if (error instanceof AppError) return error
    throw error
  }
  throw new Error("Precondición: la función debía lanzar")
}

const ESTADOS: readonly EstadoEntrega[] = ["asignado", "entregado", "calificado"]

describe("esTarde y entregaCerrada (PR-1B01)", () => {
  it("PR-1B01: esTarde es falso hasta el milisegundo de la fecha límite inclusive y verdadero desde el siguiente", () => {
    expect(esTarde(LIMITE, antes)).toBe(false)
    expect(esTarde(LIMITE, justo)).toBe(false)
    expect(esTarde(LIMITE, despues)).toBe(true)
  })

  it("PR-1B01: entregaCerrada solo sin tardías y ya tarde; con tardías nunca se cierra", () => {
    expect(entregaCerrada(tarea({ aceptaTardias: false }), antes)).toBe(false)
    expect(entregaCerrada(tarea({ aceptaTardias: false }), justo)).toBe(false)
    expect(entregaCerrada(tarea({ aceptaTardias: false }), despues)).toBe(true)
    expect(entregaCerrada(tarea({ aceptaTardias: true }), antes)).toBe(false)
    expect(entregaCerrada(tarea({ aceptaTardias: true }), justo)).toBe(false)
    expect(entregaCerrada(tarea({ aceptaTardias: true }), despues)).toBe(false)
  })

  it("PR-1B01: el mismo instante escrito con distintos desfases da el mismo resultado (todo se compara en UTC)", () => {
    const limiteConDesfase = new Date("2026-10-20T11:00:00.000-06:00")
    expect(limiteConDesfase.getTime()).toBe(LIMITE.getTime())
    const ahoraEnTokio = new Date("2026-10-21T02:00:00.001+09:00")
    expect(ahoraEnTokio.getTime()).toBe(despues.getTime())
    expect(esTarde(limiteConDesfase, new Date("2026-10-20T19:00:00.000+02:00"))).toBe(false)
    expect(esTarde(limiteConDesfase, ahoraEnTokio)).toBe(true)
    expect(
      entregaCerrada(tarea({ fechaLimite: limiteConDesfase, aceptaTardias: false }), ahoraEnTokio),
    ).toBe(true)
  })
})

describe("decidirEntrega (PR-1B02)", () => {
  // Matriz: estado × cerrada (sí/no) × requiereAdjuntos (sí/no) × contenido (vacío, archivo, enlace).
  const CONTENIDOS = [
    { nombre: "vacío", archivos: 0, enlaces: 0 },
    { nombre: "solo archivo", archivos: 1, enlaces: 0 },
    { nombre: "solo enlace", archivos: 0, enlaces: 1 },
  ] as const

  const esperado = (p: {
    estado: EstadoEntrega
    cerrada: boolean
    requiereAdjuntos: boolean
    vacio: boolean
  }): string => {
    if (p.estado === "calificado") return "ENTREGA_CALIFICADA"
    if (p.estado === "entregado") return "ENTREGA_YA_REALIZADA"
    if (p.cerrada) return "ENTREGA_CERRADA"
    if (p.requiereAdjuntos && p.vacio) return "ENTREGA_VACIA"
    return "ok"
  }

  it("PR-1B02: la matriz completa respeta el orden de los errores (calificada, ya realizada, cerrada, vacía)", () => {
    const fallas: string[] = []
    let recorridos = 0
    for (const estado of ESTADOS) {
      for (const cerrada of [true, false]) {
        for (const requiereAdjuntos of [true, false]) {
          for (const contenido of CONTENIDOS) {
            recorridos += 1
            const t = tarea({ aceptaTardias: !cerrada, requiereAdjuntos })
            const obtenido =
              codigoDe(() =>
                decidirEntrega({
                  tarea: t,
                  estado,
                  archivos: contenido.archivos,
                  enlaces: contenido.enlaces,
                  ahora: despues,
                }),
              ) ?? "ok"
            const deseado = esperado({
              estado,
              cerrada,
              requiereAdjuntos,
              vacio: contenido.archivos + contenido.enlaces === 0,
            })
            if (obtenido !== deseado) {
              fallas.push(
                `${estado}/${String(cerrada)}/${String(requiereAdjuntos)}/${contenido.nombre}: ${obtenido} en vez de ${deseado}`,
              )
            }
          }
        }
      }
    }
    expect(recorridos).toBe(36)
    expect(fallas).toEqual([])
  })

  it("PR-1B02: cada error es un AppError con su estado HTTP (409, y 400 la vacía) y el mensaje de §D-7", () => {
    const base = { archivos: 0, enlaces: 0, ahora: antes }
    expect(
      capturar(() => decidirEntrega({ ...base, tarea: tarea(), estado: "calificado" })),
    ).toMatchObject({
      codigo: "ENTREGA_CALIFICADA",
      estado: 409,
      message: "Tu entrega ya está calificada y no se puede cambiar.",
    })
    expect(
      capturar(() => decidirEntrega({ ...base, tarea: tarea(), estado: "entregado" })),
    ).toMatchObject({
      codigo: "ENTREGA_YA_REALIZADA",
      estado: 409,
      message: "Ya entregaste esta tarea. Si quieres cambiarla, anula tu entrega primero.",
    })
    expect(
      capturar(() =>
        decidirEntrega({
          ...base,
          ahora: despues,
          tarea: tarea({ aceptaTardias: false }),
          estado: "asignado",
        }),
      ),
    ).toMatchObject({
      codigo: "ENTREGA_CERRADA",
      estado: 409,
      message: "La fecha límite ya pasó y esta tarea no acepta entregas con retraso.",
    })
    expect(
      capturar(() => decidirEntrega({ ...base, tarea: tarea(), estado: "asignado" })),
    ).toMatchObject({
      codigo: "ENTREGA_VACIA",
      estado: 400,
      message: "Agrega al menos un archivo o un enlace para entregar.",
    })
  })

  it("PR-1B02: conRetraso en la frontera: falso en la fecha límite exacta, verdadero un milisegundo después (con tardías)", () => {
    const comun = { tarea: tarea(), estado: "asignado" as const, archivos: 1, enlaces: 0 }
    expect(decidirEntrega({ ...comun, ahora: antes })).toEqual({ conRetraso: false })
    expect(decidirEntrega({ ...comun, ahora: justo })).toEqual({ conRetraso: false })
    expect(decidirEntrega({ ...comun, ahora: despues })).toEqual({ conRetraso: true })
  })

  it("PR-1B02: sin tardías se entrega en la fecha límite exacta (sin retraso) y se cierra un milisegundo después", () => {
    const comun = {
      tarea: tarea({ aceptaTardias: false }),
      estado: "asignado" as const,
      archivos: 0,
      enlaces: 1,
    }
    expect(decidirEntrega({ ...comun, ahora: justo })).toEqual({ conRetraso: false })
    expect(codigoDe(() => decidirEntrega({ ...comun, ahora: despues }))).toBe("ENTREGA_CERRADA")
  })

  it("PR-1B02: sin adjuntos requeridos, una entrega vacía pasa (Marcar como completada)", () => {
    expect(
      decidirEntrega({
        tarea: tarea({ requiereAdjuntos: false }),
        estado: "asignado",
        archivos: 0,
        enlaces: 0,
        ahora: antes,
      }),
    ).toEqual({ conRetraso: false })
  })

  it("PR-1B02: exigirEntregaAbierta aplica las mismas reglas sin mirar el contenido (la usa la subida, S-10)", () => {
    for (const estado of ESTADOS) {
      for (const aceptaTardias of [true, false]) {
        const t = tarea({ aceptaTardias })
        const conContenido = codigoDe(() =>
          decidirEntrega({ tarea: t, estado, archivos: 1, enlaces: 0, ahora: despues }),
        )
        expect(codigoDe(() => exigirEntregaAbierta({ tarea: t, estado, ahora: despues }))).toBe(
          conContenido,
        )
      }
    }
    expect(
      codigoDe(() => exigirEntregaAbierta({ tarea: tarea(), estado: "asignado", ahora: despues })),
    ).toBeNull()
  })
})

describe("decidirAnulacion y accionesDeEntrega (PR-1B03)", () => {
  const esperadoAnulacion = (estado: EstadoEntrega, cerrada: boolean): string => {
    if (estado === "asignado") return "ENTREGA_NO_REALIZADA"
    if (estado === "calificado") return "ENTREGA_CALIFICADA"
    if (cerrada) return "ENTREGA_CERRADA"
    return "ok"
  }

  it("PR-1B03: decidirAnulacion respeta el orden (no realizada, calificada, cerrada) en toda la matriz", () => {
    const fallas: string[] = []
    for (const estado of ESTADOS) {
      for (const cerrada of [true, false]) {
        for (const requiereAdjuntos of [true, false]) {
          const t = tarea({ aceptaTardias: !cerrada, requiereAdjuntos })
          const obtenido =
            codigoDe(() => decidirAnulacion({ tarea: t, estado, ahora: despues })) ?? "ok"
          const deseado = esperadoAnulacion(estado, cerrada)
          if (obtenido !== deseado) {
            fallas.push(`${estado}/${String(cerrada)}: ${obtenido} en vez de ${deseado}`)
          }
        }
      }
    }
    expect(fallas).toEqual([])
  })

  it("PR-1B03: decidirAnulacion lanza AppError 409 con el mensaje de §D-7", () => {
    expect(
      capturar(() => decidirAnulacion({ tarea: tarea(), estado: "asignado", ahora: antes })),
    ).toMatchObject({
      codigo: "ENTREGA_NO_REALIZADA",
      estado: 409,
      message: "No tienes una entrega que anular.",
    })
  })

  it("PR-1B03: accionesDeEntrega nunca contradice a decidirEntrega (con un archivo) ni a decidirAnulacion, en toda la matriz y en la frontera", () => {
    const contradicciones: string[] = []
    let recorridos = 0
    for (const estado of ESTADOS) {
      for (const aceptaTardias of [true, false]) {
        for (const requiereAdjuntos of [true, false]) {
          for (const ahora of [antes, justo, despues]) {
            recorridos += 1
            const t = tarea({ aceptaTardias, requiereAdjuntos })
            const acciones = accionesDeEntrega({ tarea: t, estado, ahora })
            const entrega =
              codigoDe(() =>
                decidirEntrega({ tarea: t, estado, archivos: 1, enlaces: 0, ahora }),
              ) === null
            const anulacion = codigoDe(() => decidirAnulacion({ tarea: t, estado, ahora })) === null
            if (acciones.puedeEntregar !== entrega || acciones.puedeAnular !== anulacion) {
              contradicciones.push(
                `${estado}/${String(aceptaTardias)}/${String(requiereAdjuntos)}/${ahora.toISOString()}`,
              )
            }
          }
        }
      }
    }
    expect(recorridos).toBe(36)
    expect(contradicciones).toEqual([])
  })

  it("PR-1B03: valores concretos: asignado abierta entrega; entregado abierta anula; cerrada ni entrega ni anula; calificada nada", () => {
    const cerrada = tarea({ aceptaTardias: false })
    expect(accionesDeEntrega({ tarea: tarea(), estado: "asignado", ahora: despues })).toEqual({
      puedeEntregar: true,
      puedeAnular: false,
    })
    expect(accionesDeEntrega({ tarea: tarea(), estado: "entregado", ahora: despues })).toEqual({
      puedeEntregar: false,
      puedeAnular: true,
    })
    expect(accionesDeEntrega({ tarea: cerrada, estado: "asignado", ahora: despues })).toEqual({
      puedeEntregar: false,
      puedeAnular: false,
    })
    expect(accionesDeEntrega({ tarea: cerrada, estado: "entregado", ahora: despues })).toEqual({
      puedeEntregar: false,
      puedeAnular: false,
    })
    expect(accionesDeEntrega({ tarea: tarea(), estado: "calificado", ahora: antes })).toEqual({
      puedeEntregar: false,
      puedeAnular: false,
    })
  })
})

describe("alumnoDeLaRelacion (PR-1B03 bis)", () => {
  const PERFIL = "aaaaaaaa-1c1f-4b8e-9a1e-0f2a3b4c5d6e"

  it("PR-1B03 bis: estudiante devuelve el id del perfil; maestro y admin devuelven null", () => {
    expect(alumnoDeLaRelacion("estudiante", PERFIL)).toBe(PERFIL)
    expect(alumnoDeLaRelacion("maestro", PERFIL)).toBeNull()
    expect(alumnoDeLaRelacion("admin", PERFIL)).toBeNull()
  })

  it("PR-1B03 bis: handlers/tareas/tareas.ts no compara la relación a mano y usa alumnoDeLaRelacion", () => {
    const ruta = fileURLToPath(new URL("../../handlers/tareas/tareas.ts", import.meta.url))
    const codigo = readFileSync(ruta, "utf8")
    expect(codigo).not.toMatch(/relacion\s*===/)
    expect(codigo).toMatch(/alumnoDeLaRelacion\(/)
  })
})

describe("prefijoDeEntrega, claveDeEntrega y prefijoDeMateriales (PR-1B04)", () => {
  const TAREA = "bbbbbbbb-1c1f-4b8e-9a1e-0f2a3b4c5d6e"
  const ALUMNO = "cccccccc-1c1f-4b8e-9a1e-0f2a3b4c5d6e"
  const ARCHIVO = "dddddddd-1c1f-4b8e-9a1e-0f2a3b4c5d6e"
  const CLASE = "eeeeeeee-1c1f-4b8e-9a1e-0f2a3b4c5d6e"
  const OTRO = "ffffffff-1c1f-4b8e-9a1e-0f2a3b4c5d6e"

  it("PR-1B04: la clave de un archivo de entrega es entregas/{tareaId}/{alumnoId}/{archivoId} y empieza con su prefijo", () => {
    expect(prefijoDeEntrega(TAREA, ALUMNO)).toBe(`entregas/${TAREA}/${ALUMNO}/`)
    expect(claveDeEntrega(TAREA, ALUMNO, ARCHIVO)).toBe(`entregas/${TAREA}/${ALUMNO}/${ARCHIVO}`)
    expect(claveDeEntrega(TAREA, ALUMNO, ARCHIVO).startsWith(prefijoDeEntrega(TAREA, ALUMNO))).toBe(
      true,
    )
  })

  it("PR-1B04: los prefijos y la clave van en minúsculas, y el prefijo de materiales es materiales/{claseId}/", () => {
    expect(prefijoDeEntrega(TAREA.toUpperCase(), ALUMNO.toUpperCase())).toBe(
      `entregas/${TAREA}/${ALUMNO}/`,
    )
    expect(claveDeEntrega(TAREA.toUpperCase(), ALUMNO, ARCHIVO.toUpperCase())).toBe(
      `entregas/${TAREA}/${ALUMNO}/${ARCHIVO}`,
    )
    expect(prefijoDeMateriales(CLASE.toUpperCase())).toBe(`materiales/${CLASE}/`)
  })

  it("PR-1B04: el prefijo de una entrega no es prefijo de la de otro alumno ni de otra tarea, ni de un material", () => {
    const clave = claveDeEntrega(TAREA, ALUMNO, ARCHIVO)
    expect(clave.startsWith(prefijoDeEntrega(TAREA, OTRO))).toBe(false)
    expect(clave.startsWith(prefijoDeEntrega(OTRO, ALUMNO))).toBe(false)
    expect(clave.startsWith(prefijoDeMateriales(CLASE))).toBe(false)
  })
})
