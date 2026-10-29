import { describe, expect, it } from "vitest"

import { puedeBorrar, type ParticipanteDeAutoria } from "./autoria.js"
import {
  bloqueAlPublicar,
  bloqueEfectivo,
  puedeBorrarRecurso,
  puedeEditarRecurso,
  puedeMoverRecurso,
  type Bloque,
} from "./recursos.js"

const ADMIN: ParticipanteDeAutoria = { id: "aaaaaaaa-1c1f-4b8e-9a1e-0f2a3b4c5d6e", rol: "admin" }
const MAESTRO_AUTOR: ParticipanteDeAutoria = {
  id: "bbbbbbbb-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  rol: "maestro",
}
const OTRO_MAESTRO: ParticipanteDeAutoria = {
  id: "cccccccc-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  rol: "maestro",
}
const ESTUDIANTE: ParticipanteDeAutoria = {
  id: "dddddddd-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  rol: "estudiante",
}

type Actor = "admin" | "autorMaestro" | "otroMaestro" | "estudiante"
type Autor = "admin" | "maestro"

const ACTORES: Record<Actor, ParticipanteDeAutoria> = {
  admin: ADMIN,
  autorMaestro: MAESTRO_AUTOR,
  otroMaestro: OTRO_MAESTRO,
  estudiante: ESTUDIANTE,
}
// El autor maestro es MAESTRO_AUTOR; el autor admin es la cuenta única de administración.
const AUTORES: Record<Autor, ParticipanteDeAutoria> = { admin: ADMIN, maestro: MAESTRO_AUTOR }
const BLOQUES: Bloque[] = ["aprendizaje", "docente"]
const NOMBRES_DE_ACTOR = Object.keys(ACTORES) as Actor[]
const NOMBRES_DE_AUTOR = Object.keys(AUTORES) as Autor[]

type Tabla = Record<Bloque, Record<Autor, Record<Actor, boolean>>>

// [bloque][autor][actor] -> resultado esperado (§D-2, RN-07, S-02).
const EDITAR: Tabla = {
  aprendizaje: {
    admin: { admin: true, autorMaestro: false, otroMaestro: false, estudiante: false },
    maestro: { admin: true, autorMaestro: false, otroMaestro: false, estudiante: false },
  },
  docente: {
    // Dato que la API no produce (lo del admin va a aprendizaje): manda "solo su autor".
    admin: { admin: true, autorMaestro: false, otroMaestro: false, estudiante: false },
    maestro: { admin: false, autorMaestro: true, otroMaestro: false, estudiante: false },
  },
}

const BORRAR: Tabla = {
  aprendizaje: {
    admin: { admin: true, autorMaestro: false, otroMaestro: false, estudiante: false },
    maestro: { admin: true, autorMaestro: false, otroMaestro: false, estudiante: false },
  },
  docente: {
    admin: { admin: true, autorMaestro: false, otroMaestro: false, estudiante: false },
    maestro: { admin: true, autorMaestro: true, otroMaestro: false, estudiante: false },
  },
}

// Mover no depende del autor (P-05, S-03): [bloque][actor].
const MOVER: Record<Bloque, Record<Actor, boolean>> = {
  aprendizaje: { admin: true, autorMaestro: false, otroMaestro: false, estudiante: false },
  docente: { admin: true, autorMaestro: true, otroMaestro: true, estudiante: false },
}

describe("bloqueAlPublicar (S-01)", () => {
  it("CL3-A04: el admin publica en aprendizaje y un maestro en docente", () => {
    expect(bloqueAlPublicar(ADMIN)).toBe("aprendizaje")
    expect(bloqueAlPublicar(MAESTRO_AUTOR)).toBe("docente")
    expect(bloqueAlPublicar(OTRO_MAESTRO)).toBe("docente")
  })

  it("CL3-A04: con un estudiante lanza ERROR_INTERNO (500), nunca un bloque por defecto", () => {
    expect(() => bloqueAlPublicar(ESTUDIANTE)).toThrow(
      expect.objectContaining({ codigo: "ERROR_INTERNO", estado: 500 }),
    )
  })
})

describe("bloqueEfectivo (DH-02 a)", () => {
  it("CL3-A04: el bloque guardado manda sobre el rol del autor", () => {
    for (const bloque of BLOQUES) {
      for (const autor of NOMBRES_DE_AUTOR) {
        expect(bloqueEfectivo(bloque, AUTORES[autor]), `${bloque} de ${autor}`).toBe(bloque)
      }
    }
  })

  it("CL3-A04: con el bloque nulo, la regla del reparto de la migración (admin aprendizaje, los demás docente)", () => {
    expect(bloqueEfectivo(null, ADMIN)).toBe("aprendizaje")
    expect(bloqueEfectivo(null, MAESTRO_AUTOR)).toBe("docente")
    expect(bloqueEfectivo(null, ESTUDIANTE)).toBe("docente")
  })
})

describe("puedeEditarRecurso (RN-07, S-02)", () => {
  it("CL3-A04: tabla completa actor × autor × bloque", () => {
    for (const bloque of BLOQUES) {
      for (const autor of NOMBRES_DE_AUTOR) {
        for (const actor of NOMBRES_DE_ACTOR) {
          expect(
            puedeEditarRecurso(ACTORES[actor], AUTORES[autor], bloque),
            `${actor} sobre un recurso de ${autor} en ${bloque}`,
          ).toBe(EDITAR[bloque][autor][actor])
        }
      }
    }
  })

  it("CL3-A04: con el bloque nulo sigue el bloque efectivo del autor", () => {
    for (const autor of NOMBRES_DE_AUTOR) {
      const bloque = bloqueEfectivo(null, AUTORES[autor])
      for (const actor of NOMBRES_DE_ACTOR) {
        expect(
          puedeEditarRecurso(ACTORES[actor], AUTORES[autor], bloque),
          `${actor} sobre un recurso sin bloque de ${autor}`,
        ).toBe(EDITAR[bloque][autor][actor])
      }
    }
    expect(puedeEditarRecurso(ADMIN, ADMIN, bloqueEfectivo(null, ADMIN))).toBe(true)
    expect(puedeEditarRecurso(ADMIN, MAESTRO_AUTOR, bloqueEfectivo(null, MAESTRO_AUTOR))).toBe(
      false,
    )
  })
})

describe("puedeBorrarRecurso (RN-07)", () => {
  it("CL3-A04: tabla completa actor × autor × bloque", () => {
    for (const bloque of BLOQUES) {
      for (const autor of NOMBRES_DE_AUTOR) {
        for (const actor of NOMBRES_DE_ACTOR) {
          expect(
            puedeBorrarRecurso(ACTORES[actor], AUTORES[autor], bloque),
            `${actor} sobre un recurso de ${autor} en ${bloque}`,
          ).toBe(BORRAR[bloque][autor][actor])
        }
      }
    }
  })

  it("CL3-A04: con el bloque nulo sigue el bloque efectivo del autor", () => {
    for (const autor of NOMBRES_DE_AUTOR) {
      const bloque = bloqueEfectivo(null, AUTORES[autor])
      for (const actor of NOMBRES_DE_ACTOR) {
        expect(
          puedeBorrarRecurso(ACTORES[actor], AUTORES[autor], bloque),
          `${actor} sobre un recurso sin bloque de ${autor}`,
        ).toBe(BORRAR[bloque][autor][actor])
      }
    }
  })

  it("CL3-A04: con el bloque que da bloqueAlPublicar al autor, coincide con puedeBorrar en todas las combinaciones", () => {
    for (const autor of NOMBRES_DE_AUTOR) {
      const bloque = bloqueAlPublicar(AUTORES[autor])
      for (const actor of NOMBRES_DE_ACTOR) {
        expect(
          puedeBorrarRecurso(ACTORES[actor], AUTORES[autor], bloque),
          `${actor} sobre un recurso de ${autor}`,
        ).toBe(puedeBorrar(ACTORES[actor], AUTORES[autor]))
      }
    }
  })
})

describe("puedeMoverRecurso (P-05, S-03)", () => {
  it("CL3-A04: tabla completa actor × bloque; un estudiante nunca", () => {
    for (const bloque of BLOQUES) {
      for (const actor of NOMBRES_DE_ACTOR) {
        expect(puedeMoverRecurso(ACTORES[actor], bloque), `${actor} en ${bloque}`).toBe(
          MOVER[bloque][actor],
        )
      }
    }
  })

  it("CL3-A04: con el bloque nulo sigue el bloque efectivo del autor", () => {
    for (const autor of NOMBRES_DE_AUTOR) {
      const bloque = bloqueEfectivo(null, AUTORES[autor])
      for (const actor of NOMBRES_DE_ACTOR) {
        expect(
          puedeMoverRecurso(ACTORES[actor], bloque),
          `${actor} sobre un recurso sin bloque de ${autor}`,
        ).toBe(MOVER[bloque][actor])
      }
    }
    expect(puedeMoverRecurso(OTRO_MAESTRO, bloqueEfectivo(null, ADMIN))).toBe(false)
    expect(puedeMoverRecurso(OTRO_MAESTRO, bloqueEfectivo(null, MAESTRO_AUTOR))).toBe(true)
  })
})
