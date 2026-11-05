import { describe, expect, it } from "vitest"

import {
  esRecursoDeAprendizaje,
  planDeDuplicado,
  type ArchivoOriginal,
  type OriginalParaDuplicar,
  type RecursoOriginal,
} from "./duplicado.js"

const CLASE_NUEVA = "99999999-9999-4999-8999-999999999999"
const AHORA = new Date("2026-11-05T12:00:00.000Z")
const ADMIN = "aaaaaaaa-0000-4000-8000-000000000001"
const MAESTRO = "aaaaaaaa-0000-4000-8000-000000000002"

// Generador de ids predecible: "n-001", "n-002", …
const generador = () => {
  let i = 0
  return () => {
    i += 1
    return `n-${String(i).padStart(3, "0")}`
  }
}

const fecha = (segundos: number): Date => new Date(Date.UTC(2026, 0, 1, 0, 0, segundos))

const recurso = (cambios: Partial<RecursoOriginal> & { id: string }): RecursoOriginal => ({
  tipo: "material",
  bloque: "aprendizaje",
  autorId: ADMIN,
  autorEsAdmin: true,
  titulo: `Título ${cambios.id}`,
  texto: `Texto ${cambios.id}`,
  temaId: null,
  creadoEn: fecha(0),
  ...cambios,
})

const archivo = (cambios: Partial<ArchivoOriginal> & { id: string }): ArchivoOriginal => ({
  publicacionId: null,
  estado: "confirmado",
  nombre: `${cambios.id}.pdf`,
  tipo: "application/pdf",
  tamano: 100,
  subidoPor: ADMIN,
  creadoEn: fecha(0),
  ...cambios,
})

describe("esRecursoDeAprendizaje (ADM-1B01)", () => {
  it("ADM-1B01: bloque aprendizaje sí; bloque nulo con autor admin sí y con autor maestro no; docente no; anuncio y tarea no", () => {
    expect(
      esRecursoDeAprendizaje({ tipo: "material", bloque: "aprendizaje", autorEsAdmin: false }),
    ).toBe(true)
    expect(esRecursoDeAprendizaje({ tipo: "material", bloque: null, autorEsAdmin: true })).toBe(
      true,
    )
    expect(esRecursoDeAprendizaje({ tipo: "material", bloque: null, autorEsAdmin: false })).toBe(
      false,
    )
    expect(
      esRecursoDeAprendizaje({ tipo: "material", bloque: "docente", autorEsAdmin: true }),
    ).toBe(false)
    expect(esRecursoDeAprendizaje({ tipo: "anuncio", bloque: null, autorEsAdmin: true })).toBe(
      false,
    )
    expect(esRecursoDeAprendizaje({ tipo: "tarea", bloque: null, autorEsAdmin: true })).toBe(false)
  })
})

describe("planDeDuplicado (ADM-1B01)", () => {
  const original: OriginalParaDuplicar = {
    temas: [
      // Con huecos y un empate de orden: se copian tal cual y en el mismo orden (orden, id).
      { id: "t-c", nombre: "Tercero", orden: 7 },
      { id: "t-a", nombre: "Primero", orden: 2 },
      { id: "t-b2", nombre: "Segundo bis", orden: 5 },
      { id: "t-b1", nombre: "Segundo", orden: 5 },
    ],
    categorias: [
      { id: "c-2", nombre: "Exámenes", peso: 60, creadoEn: fecha(5) },
      { id: "c-1", nombre: "Tareas", peso: 40, creadoEn: fecha(1) },
      { id: "c-3", nombre: "Proyecto", peso: 0, creadoEn: fecha(5) },
    ],
    recursos: [
      recurso({ id: "r-viejo", temaId: "t-a", creadoEn: fecha(1) }),
      recurso({ id: "r-nuevo", temaId: null, creadoEn: fecha(9) }),
      recurso({ id: "r-empate-a", temaId: "t-b1", creadoEn: fecha(5) }),
      recurso({ id: "r-empate-b", temaId: "t-b1", creadoEn: fecha(5) }),
      recurso({ id: "r-nulo-admin", bloque: null, autorEsAdmin: true, creadoEn: fecha(3) }),
      recurso({ id: "r-tema-borrado", temaId: "t-no-existe", creadoEn: fecha(2) }),
      // Excluidos.
      recurso({ id: "x-docente", bloque: "docente", autorId: MAESTRO, autorEsAdmin: false }),
      recurso({ id: "x-nulo-maestro", bloque: null, autorId: MAESTRO, autorEsAdmin: false }),
      recurso({ id: "x-anuncio", tipo: "anuncio", bloque: null, titulo: null }),
      recurso({ id: "x-tarea", tipo: "tarea", bloque: null }),
    ],
    archivos: [
      archivo({ id: "a-2", publicacionId: "r-viejo", creadoEn: fecha(8) }),
      archivo({ id: "a-1", publicacionId: "r-viejo", creadoEn: fecha(2) }),
      archivo({ id: "a-3", publicacionId: "r-nuevo", subidoPor: MAESTRO, tamano: 7 }),
      // Excluidos: no confirmados, sin publicación o de un recurso que no se copia.
      archivo({ id: "x-pendiente", publicacionId: "r-viejo", estado: "pendiente" }),
      archivo({ id: "x-descartado", publicacionId: "r-viejo", estado: "descartado" }),
      archivo({ id: "x-sin-publicacion", publicacionId: null }),
      archivo({ id: "x-del-docente", publicacionId: "x-docente" }),
      archivo({ id: "x-de-tarea", publicacionId: "x-tarea" }),
    ],
  }

  const plan = planDeDuplicado(original, {
    claseId: CLASE_NUEVA,
    ahora: AHORA,
    generarId: generador(),
  })

  it("ADM-1B01: los temas conservan nombre, orden (con huecos) y el orden entre empates, en la clase nueva", () => {
    expect(plan.temas.map(({ nombre, orden, claseId }) => ({ nombre, orden, claseId }))).toEqual([
      { nombre: "Primero", orden: 2, claseId: CLASE_NUEVA },
      { nombre: "Segundo", orden: 5, claseId: CLASE_NUEVA },
      { nombre: "Segundo bis", orden: 5, claseId: CLASE_NUEVA },
      { nombre: "Tercero", orden: 7, claseId: CLASE_NUEVA },
    ])
    const ids = plan.temas.map((tema) => tema.id)
    expect(ids).toEqual([...ids].sort())
    expect(new Set(ids).size).toBe(4)
  })

  it("ADM-1B01: las categorías conservan nombre y peso, en el orden (creado_en, id) con marcas crecientes", () => {
    expect(plan.categorias).toEqual([
      expect.objectContaining({ nombre: "Tareas", peso: 40, creadoEn: new Date(AHORA.getTime()) }),
      expect.objectContaining({
        nombre: "Exámenes",
        peso: 60,
        creadoEn: new Date(AHORA.getTime() + 1),
      }),
      expect.objectContaining({
        nombre: "Proyecto",
        peso: 0,
        creadoEn: new Date(AHORA.getTime() + 2),
      }),
    ])
    expect(plan.categorias.every((categoria) => categoria.claseId === CLASE_NUEVA)).toBe(true)
  })

  it("ADM-1B01: solo los recursos de aprendizaje, del más reciente al más antiguo, con el tema mapeado, sin tema o con el tema borrado en nulo", () => {
    const temaNuevo = (nombre: string) => plan.temas.find((tema) => tema.nombre === nombre)?.id
    expect(
      plan.recursos.map(({ titulo, temaId, creadoEn }) => ({
        titulo,
        temaId,
        creadoEn: creadoEn.getTime() - AHORA.getTime(),
      })),
    ).toEqual([
      { titulo: "Título r-nuevo", temaId: null, creadoEn: 0 },
      { titulo: "Título r-empate-b", temaId: temaNuevo("Segundo"), creadoEn: -1 },
      { titulo: "Título r-empate-a", temaId: temaNuevo("Segundo"), creadoEn: -2 },
      { titulo: "Título r-nulo-admin", temaId: null, creadoEn: -3 },
      { titulo: "Título r-tema-borrado", temaId: null, creadoEn: -4 },
      { titulo: "Título r-viejo", temaId: temaNuevo("Primero"), creadoEn: -5 },
    ])
    for (const copia of plan.recursos) {
      expect(copia).toMatchObject({
        claseId: CLASE_NUEVA,
        autorId: ADMIN,
        tipo: "material",
        bloque: "aprendizaje",
        version: 0,
      })
    }
    expect(plan.recursos.find((r) => r.titulo === "Título r-viejo")?.texto).toBe("Texto r-viejo")
  })

  it("ADM-1B01: los archivos confirmados de los recursos copiados, con la clave de la clase nueva y copiaDe = el original; nada de lo excluido", () => {
    const recursoNuevo = (titulo: string) => plan.recursos.find((r) => r.titulo === titulo)?.id
    expect(plan.archivos.map((a) => a.copiaDe)).toEqual(["a-3", "a-1", "a-2"])
    for (const copia of plan.archivos) {
      expect(copia.claveObjeto).toBe(`materiales/${CLASE_NUEVA}/${copia.id}`)
      expect(copia).toMatchObject({ claseId: CLASE_NUEVA, estado: "confirmado" })
    }
    expect(plan.archivos.find((a) => a.copiaDe === "a-3")).toMatchObject({
      publicacionId: recursoNuevo("Título r-nuevo"),
      nombre: "a-3.pdf",
      tipo: "application/pdf",
      tamano: 7,
      subidoPor: MAESTRO,
    })
    expect(plan.archivos.find((a) => a.copiaDe === "a-1")?.publicacionId).toBe(
      recursoNuevo("Título r-viejo"),
    )
    // Dentro de un recurso, el orden (creado_en, id) de la original.
    const delViejo = plan.archivos.filter((a) => a.publicacionId === recursoNuevo("Título r-viejo"))
    expect(delViejo.map((a) => a.copiaDe)).toEqual(["a-1", "a-2"])
    expect(delViejo[0]?.creadoEn.getTime()).toBeLessThan(delViejo[1]?.creadoEn.getTime() ?? 0)

    const textoDelPlan = JSON.stringify(plan)
    for (const excluido of [
      "x-docente",
      "x-nulo-maestro",
      "x-anuncio",
      "x-tarea",
      "x-pendiente",
      "x-descartado",
      "x-sin-publicacion",
      "x-del-docente",
      "x-de-tarea",
    ]) {
      expect(textoDelPlan, excluido).not.toContain(excluido)
    }
    // Ningún id de la original pasa a la copia salvo en copiaDe.
    const idsNuevos = [...plan.temas, ...plan.categorias, ...plan.recursos, ...plan.archivos].map(
      (fila) => fila.id,
    )
    expect(idsNuevos.every((id) => id.startsWith("n-"))).toBe(true)
  })

  it("ADM-1B01: una original sin temas, categorías ni recursos da un plan vacío", () => {
    expect(
      planDeDuplicado(
        { temas: [], categorias: [], recursos: [], archivos: [] },
        { claseId: CLASE_NUEVA, ahora: AHORA, generarId: generador() },
      ),
    ).toEqual({ temas: [], categorias: [], recursos: [], archivos: [] })
  })
})
