// FORO-01c2, corrección de la ronda 1 (T-01): la clave de un foro y la de la lista de «Foro» no pueden
// coincidir para ningún foroId, ni una ser prefijo de la otra; las dos cuelgan del prefijo de los foros.
import { describe, expect, it } from "vitest"

import { claveForo, claveListaDeForos, clavePrefijoDeForos } from "@/services/trabajoService"

import { idCanonicoDeLaRuta } from "./lib"

const CLASE = "2a2b3c4d-1c2f-4b8e-9a1e-000000000001"
const FOROS = [
  "lista",
  "foro",
  "nuevo",
  "",
  "5a5b3c4d-1c2f-4b8e-9a1e-000000000001",
  "LISTA",
  "foros",
]

const esPrefijo = (corta: readonly unknown[], larga: readonly unknown[]) =>
  corta.length <= larga.length && corta.every((parte, indice) => parte === larga[indice])

describe("T-01 (ronda 1 de 01c2) · las claves del foro y de la lista no chocan", () => {
  it.each(FOROS)(
    "T-01: con foroId «%s», claveForo no es la de la lista ni una es prefijo de la otra, y las dos cuelgan de clavePrefijoDeForos",
    (foroId) => {
      const delForo = claveForo(CLASE, foroId)
      const deLaLista = claveListaDeForos(CLASE)
      expect(delForo).not.toEqual(deLaLista)
      expect(esPrefijo(deLaLista, delForo)).toBe(false)
      expect(esPrefijo(delForo, deLaLista)).toBe(false)
      expect(esPrefijo(clavePrefijoDeForos(CLASE), delForo)).toBe(true)
      expect(esPrefijo(clavePrefijoDeForos(CLASE), deLaLista)).toBe(true)
    },
  )
})

describe("T-02 (ronda 2 de 01c2) · el id de la ruta en su forma canónica", () => {
  it("T-02: idCanonicoDeLaRuta pasa un uuid a minúsculas, deja igual uno ya canónico y no inventa nada con lo que no es uuid", () => {
    expect(idCanonicoDeLaRuta("5A5B3C4D-1C2F-4B8E-9A1E-000000000001")).toBe(
      "5a5b3c4d-1c2f-4b8e-9a1e-000000000001",
    )
    expect(idCanonicoDeLaRuta("5a5B3c4D-1C2f-4b8e-9A1e-000000000001")).toBe(
      "5a5b3c4d-1c2f-4b8e-9a1e-000000000001",
    )
    expect(idCanonicoDeLaRuta("5a5b3c4d-1c2f-4b8e-9a1e-000000000001")).toBe(
      "5a5b3c4d-1c2f-4b8e-9a1e-000000000001",
    )
    expect(idCanonicoDeLaRuta("lista")).toBe("lista")
    expect(idCanonicoDeLaRuta("no-es-un-uuid")).toBe("no-es-un-uuid")
    expect(idCanonicoDeLaRuta("")).toBe("")
  })

  it("T-02: con el id en mayúsculas y en minúsculas, claveForo da la misma clave tras la forma canónica", () => {
    const mayusculas = "5A5B3C4D-1C2F-4B8E-9A1E-000000000001"
    expect(claveForo(CLASE, idCanonicoDeLaRuta(mayusculas))).toEqual(
      claveForo(CLASE, mayusculas.toLowerCase()),
    )
  })
})
