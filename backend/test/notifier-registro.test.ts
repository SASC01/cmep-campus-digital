import { randomUUID } from "node:crypto"
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { crearNotifier } from "../src/adapters/notifier/index.js"
import { crearCanalRegistro } from "../src/adapters/notifier/registro.js"
import type { CorreoDeCuenta } from "../src/core/correo/notifier.js"

let directorio: string
const logs: unknown[] = []
const log = { info: (obj: unknown) => logs.push(obj), warn: () => undefined }

const correoDePrueba: CorreoDeCuenta = {
  para: "ana@ejemplo.mx",
  nombre: "Ana",
  tipo: "recuperacion",
  enlace: "http://127.0.0.1:5173/restablecer#token=un-token-secreto",
  idempotencia: randomUUID(),
}

beforeEach(async () => {
  directorio = await mkdtemp(join(tmpdir(), "campus-correos-"))
  logs.length = 0
})

afterEach(async () => {
  await rm(directorio, { recursive: true, force: true })
})

describe("crearCanalRegistro", () => {
  it("escribe <fecha>-<idempotencia>.html con el enlace dentro", async () => {
    const canal = crearCanalRegistro({
      directorio,
      urlPublicaFrontend: "http://127.0.0.1:5173",
      log,
    })
    const resultado = await canal.correoDeCuenta(correoDePrueba)
    expect(resultado.estado).toBe("enviado")

    const archivos = await readdir(directorio)
    expect(archivos).toHaveLength(1)
    expect(archivos[0]).toContain(correoDePrueba.idempotencia)
    expect(archivos[0]).toMatch(/\.html$/)

    const contenido = await readFile(join(directorio, archivos[0]!), "utf8")
    expect(contenido).toContain(correoDePrueba.enlace)
  })

  it("crea el directorio si falta", async () => {
    await rm(directorio, { recursive: true, force: true })
    const canal = crearCanalRegistro({
      directorio,
      urlPublicaFrontend: "http://127.0.0.1:5173",
      log,
    })
    await canal.correoDeCuenta(correoDePrueba)
    const archivos = await readdir(directorio)
    expect(archivos).toHaveLength(1)
  })

  it("el log no contiene el enlace, el token ni la dirección", async () => {
    const canal = crearCanalRegistro({
      directorio,
      urlPublicaFrontend: "http://127.0.0.1:5173",
      log,
    })
    await canal.correoDeCuenta(correoDePrueba)
    const textoDeLosLogs = JSON.stringify(logs)
    expect(textoDeLosLogs).not.toContain("un-token-secreto")
    expect(textoDeLosLogs).not.toContain(correoDePrueba.enlace)
    expect(textoDeLosLogs).not.toContain(correoDePrueba.para)
  })
})

describe("crearNotifier con canal resend fuera de production (PA-10)", () => {
  it("lanza si nodeEnv es development", () => {
    expect(() =>
      crearNotifier(
        {
          canal: "resend",
          remitente: "CMEP Campus Digital <notificaciones@ejemplo.mx>",
          apiKey: "re_algo",
          urlPublicaFrontend: "http://127.0.0.1:5173",
          directorioRegistro: directorio,
        },
        { log: { info: () => undefined, warn: () => undefined }, nodeEnv: "development" },
      ),
    ).toThrow()
  })
})
