import { randomUUID } from "node:crypto"

import { beforeAll, describe, expect, it } from "vitest"

import {
  firmarTokenAcceso,
  inicializarAuth,
  verificarTokenAcceso,
} from "../src/adapters/auth/index.js"
import { esAppError } from "../src/core/errores.js"
import { cargaDeTokenDePrueba, firmarJwtDePrueba } from "./ayudas-auth.js"

// Unitaria, sin base: inicializarAuth con un secreto de prueba y argon2 con los parámetros reales.
const secreto = "secreto-de-prueba-de-tokens-con-mas-de-32-caracteres"
const T = new Date("2026-09-23T12:00:00.000Z")
const minutos = (n: number) => n * 60_000
const usuarioId = randomUUID()

const esperarNoAutenticado = async (promesa: Promise<unknown>) => {
  const error = await promesa.then(
    () => undefined,
    (e: unknown) => e,
  )
  expect(esAppError(error)).toBe(true)
  if (!esAppError(error)) return
  expect(error.codigo).toBe("NO_AUTENTICADO")
  expect(error.estado).toBe(401)
}

beforeAll(async () => {
  await inicializarAuth({
    jwtSecret: secreto,
    argon2: { memoryCost: 19456, timeCost: 2, parallelism: 1 },
  })
})

describe("firmarTokenAcceso / verificarTokenAcceso", () => {
  it("un token firmado en T vale en T + 14 min y devuelve su sub", async () => {
    const token = await firmarTokenAcceso({ usuarioId, ahora: T })

    const resultado = await verificarTokenAcceso(token, {
      ahora: new Date(T.getTime() + minutos(14)),
    })

    expect(resultado).toEqual({ usuarioId })
  })

  it("el mismo token no vale en T + 16 min: dura 15 minutos (M-03)", async () => {
    const token = await firmarTokenAcceso({ usuarioId, ahora: T })

    await esperarNoAutenticado(
      verificarTokenAcceso(token, { ahora: new Date(T.getTime() + minutos(16)) }),
    )
  })

  it("rechaza un token firmado con otro secreto", async () => {
    const token = firmarJwtDePrueba({
      payload: cargaDeTokenDePrueba({ usuarioId, ahora: T }),
      secreto: "otro-secreto-que-no-es-el-de-la-api-0123456789",
    })

    await esperarNoAutenticado(verificarTokenAcceso(token, { ahora: T }))
  })

  it("rechaza alg: none aunque la carga sea válida", async () => {
    const token = firmarJwtDePrueba({
      payload: cargaDeTokenDePrueba({ usuarioId, ahora: T }),
      alg: "none",
    })

    await esperarNoAutenticado(verificarTokenAcceso(token, { ahora: T }))
  })

  it("rechaza tokens sin exp o sin iat, con vigencia mayor a 15 min o con iat futuro (T-05)", async () => {
    const { exp: _exp, ...sinExp } = cargaDeTokenDePrueba({ usuarioId, ahora: T })
    const { iat: _iat, ...sinIat } = cargaDeTokenDePrueba({ usuarioId, ahora: T })
    void _exp
    void _iat
    const deUnAnio = cargaDeTokenDePrueba({ usuarioId, ahora: T, duracionS: 365 * 24 * 3600 })
    const deDieciseisMinutos = cargaDeTokenDePrueba({ usuarioId, ahora: T, duracionS: 16 * 60 })
    const futuro = cargaDeTokenDePrueba({ usuarioId, ahora: new Date(T.getTime() + minutos(60)) })

    for (const payload of [sinExp, sinIat, deUnAnio, deDieciseisMinutos, futuro]) {
      await esperarNoAutenticado(
        verificarTokenAcceso(firmarJwtDePrueba({ payload, secreto }), { ahora: T }),
      )
    }
  })

  it("rechaza iss o aud distintos y un sub que no es uuid, aunque la firma sea correcta", async () => {
    const otroEmisor = firmarJwtDePrueba({
      payload: cargaDeTokenDePrueba({ usuarioId, ahora: T, iss: "otro-emisor" }),
      secreto,
    })
    const otraAudiencia = firmarJwtDePrueba({
      payload: cargaDeTokenDePrueba({ usuarioId, ahora: T, aud: "otra-api" }),
      secreto,
    })
    const subInvalido = firmarJwtDePrueba({
      payload: cargaDeTokenDePrueba({ usuarioId: "no-es-uuid", ahora: T }),
      secreto,
    })
    const correcto = firmarJwtDePrueba({
      payload: cargaDeTokenDePrueba({ usuarioId, ahora: T }),
      secreto,
    })

    await esperarNoAutenticado(verificarTokenAcceso(otroEmisor, { ahora: T }))
    await esperarNoAutenticado(verificarTokenAcceso(otraAudiencia, { ahora: T }))
    await esperarNoAutenticado(verificarTokenAcceso(subInvalido, { ahora: T }))
    expect(await verificarTokenAcceso(correcto, { ahora: T })).toEqual({ usuarioId })
  })
})
