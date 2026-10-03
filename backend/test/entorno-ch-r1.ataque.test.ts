import { parse } from "pg-connection-string"
import { describe, expect, it } from "vitest"

import { validarUrlDePruebas } from "./entorno-de-pruebas.js"

// Ataque del Tester (CHORE-02, ronda 1, punto 8): N-01. Lo que importa no es la forma de la URL sino
// adónde conecta pg: para toda URL que la guarda acepta, pg-connection-string (el que usa pg, y por
// tanto @prisma/adapter-pg) debe dar un host local, la base campus_pruebas y ningún parámetro de
// conexión más que los de la propia URL. Las que pg leería distinto deben rechazarse.

const BASE = "postgresql://campus_pruebas:secreto@127.0.0.1:5432/campus_pruebas"
const HOSTS_LOCALES = ["127.0.0.1", "localhost", "[::1]", "::1"]
const CLAVES_PERMITIDAS = ["user", "password", "host", "port", "database"]

const VARIANTES = [
  `${BASE}?HOST=db.remota`,
  `${BASE}?host=db.remota`,
  `${BASE}?%68ost=db.remota`,
  `${BASE}&host=db.remota`,
  `${BASE}?`,
  `${BASE}#host=db.remota`,
  `${BASE}#?host=db.remota`,
  `${BASE}# ?host=db.remota`,
  `${BASE}?user=otro`,
  `postgresql://campus_pruebas:se creto@127.0.0.1:5432/campus_pruebas`,
  `postgresql://campus_pruebas:se%zzcreto@127.0.0.1:5432/campus_pruebas`,
  `postgresql://campus_pruebas:secreto@[::1]:5432/campus_pruebas`,
  `postgresql://campus_pruebas:secreto@[0:0:0:0:0:0:0:1]:5432/campus_pruebas`,
  `postgresql://campus_pruebas:secreto@LOCALHOST:5432/campus_pruebas`,
  `postgresql://campus_pruebas:secreto@localhost.:5432/campus_pruebas`,
  `postgresql://campus_pruebas:secreto@127.1:5432/campus_pruebas`,
  `postgresql://u:p@db.remota@127.0.0.1:5432/campus_pruebas`,
  `postgresql://campus_pruebas:secreto@127.0.0.1:5432/campus_pruebas/../campus_dev`,
  `postgresql://campus_pruebas:secreto@127.0.0.1:5432/campus%5Fpruebas`,
  `postgresql://campus_pruebas:secreto@127.0.0.1:5432,db.remota:5432/campus_pruebas`,
  `postgres://campus_pruebas:secreto@127.0.0.1/campus_pruebas`,
]

describe("ataque (CHORE-02 r1): N-01, lo que la guarda acepta es lo que pg conecta", () => {
  it.each(VARIANTES)("%s", (url) => {
    const motivo = validarUrlDePruebas(url)
    const lecturaDePg = (() => {
      try {
        const config = parse(url) as Record<string, unknown>
        const extra = Object.keys(config).filter(
          (clave) => !CLAVES_PERMITIDAS.includes(clave) && config[clave] !== undefined,
        )
        return {
          local: HOSTS_LOCALES.includes(String(config.host)),
          base: config.database,
          extra,
        }
      } catch {
        return "pg no la entiende"
      }
    })()
    const segura =
      lecturaDePg === "pg no la entiende" ||
      (lecturaDePg.local && lecturaDePg.base === "campus_pruebas" && lecturaDePg.extra.length === 0)

    // Si la guarda la acepta (motivo null), pg tiene que leerla como la base local de pruebas.
    expect(
      { aceptada: motivo === null, segura: motivo === null ? segura : true },
      JSON.stringify(lecturaDePg),
    ).toEqual({ aceptada: motivo === null, segura: true })
    // Ningún motivo de rechazo repite la contraseña (el host y la base sí, por diseño de CHORE-01).
    expect(motivo ?? "").not.toContain("secreto")
  })
})
