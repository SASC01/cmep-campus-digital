import { describe, expect, it } from "vitest"

import { JWT_SECRET_DE_EJEMPLO, validarEnv, validarEnvAdmin } from "./env.js"

const urlDePrueba = "postgresql://usuario:clave-de-prueba@127.0.0.1:5433/base?schema=public"
const secretoDePrueba = "secreto-de-prueba-con-mas-de-treinta-y-dos-caracteres"
const minimo = { DATABASE_URL: urlDePrueba, JWT_SECRET: secretoDePrueba }
// CLASES-d (Enmienda 10): en production el almacén es obligatorio; valores ficticios y válidos.
const almacenValido = {
  STORAGE_ENDPOINT: "https://almacen.ejemplo-de-prueba.mx",
  STORAGE_ACCESS_KEY: "llave-de-acceso-de-prueba",
  STORAGE_SECRET_KEY: "secreto-del-almacen-de-prueba",
}

describe("validarEnv", () => {
  it("acepta el mínimo (DATABASE_URL y JWT_SECRET) y aplica los valores por defecto", () => {
    const resultado = validarEnv(minimo)

    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return

    expect(resultado.env).toEqual({
      NODE_ENV: "development",
      HOST: "127.0.0.1",
      PORT: 3000,
      LOG_LEVEL: "info",
      DATABASE_URL: urlDePrueba,
      JWT_SECRET: secretoDePrueba,
      INVITACIONES_LIMITE_DIARIO: 80,
      STORAGE_REGION: "us-east-1",
      STORAGE_BUCKET_PRIVADO: "campus-privado",
    })
  })

  it("acepta valores explícitos y convierte PORT a número", () => {
    const resultado = validarEnv({
      ...minimo,
      NODE_ENV: "test",
      HOST: "0.0.0.0",
      PORT: "8080",
      LOG_LEVEL: "debug",
      DATABASE_URL: "postgres://usuario:clave-de-prueba@127.0.0.1:5433/base",
    })

    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return

    expect(resultado.env.PORT).toBe(8080)
    expect(resultado.env.NODE_ENV).toBe("test")
    expect(resultado.env.LOG_LEVEL).toBe("debug")
  })

  it("rechaza DATABASE_URL ausente y la nombra como obligatoria", () => {
    const resultado = validarEnv({ JWT_SECRET: secretoDePrueba })

    expect(resultado.ok).toBe(false)
    if (resultado.ok) return

    expect(resultado.errores).toContain("DATABASE_URL: obligatoria")
  })

  it("rechaza DATABASE_URL con un protocolo distinto de postgresql:// o postgres://", () => {
    const resultado = validarEnv({
      ...minimo,
      DATABASE_URL: "mysql://usuario:clave-de-prueba@127.0.0.1/base",
    })

    expect(resultado.ok).toBe(false)
    if (resultado.ok) return

    expect(resultado.errores.some((error) => error.startsWith("DATABASE_URL: "))).toBe(true)
  })

  it("rechaza PORT no numérico nombrando la variable sin repetir su valor", () => {
    const resultado = validarEnv({ ...minimo, PORT: "puerto-invalido" })

    expect(resultado.ok).toBe(false)
    if (resultado.ok) return

    expect(resultado.errores).toContain("PORT: debe ser un entero entre 1 y 65535")
    expect(resultado.errores.join("\n")).not.toContain("puerto-invalido")
  })

  it("rechaza PORT fuera de rango", () => {
    const resultado = validarEnv({ ...minimo, PORT: "70000" })

    expect(resultado.ok).toBe(false)
    if (resultado.ok) return

    expect(resultado.errores).toContain("PORT: debe ser un entero entre 1 y 65535")
  })

  it("no incluye el valor de DATABASE_URL en los mensajes de error", () => {
    const resultado = validarEnv({ ...minimo, DATABASE_URL: "no es una url clave-centinela" })

    expect(resultado.ok).toBe(false)
    if (resultado.ok) return

    expect(resultado.errores.join("\n")).not.toContain("clave-centinela")
    expect(resultado.errores.every((error) => error.startsWith("DATABASE_URL: "))).toBe(true)
  })

  it("rechaza JWT_SECRET ausente y la nombra como obligatoria", () => {
    const resultado = validarEnv({ DATABASE_URL: urlDePrueba })

    expect(resultado.ok).toBe(false)
    if (resultado.ok) return

    expect(resultado.errores).toContain("JWT_SECRET: obligatoria")
  })

  it("rechaza JWT_SECRET corta sin repetir su valor", () => {
    const resultado = validarEnv({ ...minimo, JWT_SECRET: "corta-centinela" })

    expect(resultado.ok).toBe(false)
    if (resultado.ok) return

    expect(resultado.errores).toContain("JWT_SECRET: debe tener al menos 32 caracteres")
    expect(resultado.errores.join("\n")).not.toContain("corta-centinela")
  })

  it("rechaza en production el JWT_SECRET de .env.example sin mostrar el valor (DEC-17)", () => {
    const resultado = validarEnv({
      ...minimo,
      NODE_ENV: "production",
      JWT_SECRET: JWT_SECRET_DE_EJEMPLO,
    })

    expect(resultado.ok).toBe(false)
    if (resultado.ok) return

    expect(resultado.errores).toContain(
      "JWT_SECRET: en production debe ser un secreto propio de al menos 32 caracteres, distinto del de .env.example",
    )
    expect(resultado.errores.join("\n")).not.toContain(JWT_SECRET_DE_EJEMPLO)
  })

  it("en production también rechaza el ejemplo con blancos alrededor y un secreto de solo blancos (T-08)", () => {
    for (const JWT_SECRET of [
      ` ${JWT_SECRET_DE_EJEMPLO}`,
      `${JWT_SECRET_DE_EJEMPLO}\n`,
      " ".repeat(40),
      `${" ".repeat(10)}corto-de-veinte-chars${" ".repeat(10)}`,
    ]) {
      const resultado = validarEnv({
        ...minimo,
        ...almacenValido,
        NODE_ENV: "production",
        JWT_SECRET,
      })

      expect(resultado.ok).toBe(false)
      if (resultado.ok) continue
      expect(resultado.errores.join("\n")).not.toContain(JWT_SECRET_DE_EJEMPLO)
    }
  })

  it("acepta en development el JWT_SECRET de .env.example", () => {
    const resultado = validarEnv({
      ...minimo,
      NODE_ENV: "development",
      JWT_SECRET: JWT_SECRET_DE_EJEMPLO,
    })

    expect(resultado.ok).toBe(true)
  })

  it("INVITACIONES_LIMITE_DIARIO: por defecto 80", () => {
    const resultado = validarEnv(minimo)

    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.env.INVITACIONES_LIMITE_DIARIO).toBe(80)
  })

  it("INVITACIONES_LIMITE_DIARIO: acepta 1 y 10000, y convierte el texto a número", () => {
    const minimoResultado = validarEnv({ ...minimo, INVITACIONES_LIMITE_DIARIO: "1" })
    expect(minimoResultado.ok).toBe(true)
    if (minimoResultado.ok) expect(minimoResultado.env.INVITACIONES_LIMITE_DIARIO).toBe(1)

    const maximoResultado = validarEnv({ ...minimo, INVITACIONES_LIMITE_DIARIO: "10000" })
    expect(maximoResultado.ok).toBe(true)
    if (maximoResultado.ok) expect(maximoResultado.env.INVITACIONES_LIMITE_DIARIO).toBe(10_000)
  })

  it("INVITACIONES_LIMITE_DIARIO: rechaza 0, 10001 y un valor no entero", () => {
    for (const valor of ["0", "10001", "1.5"]) {
      const resultado = validarEnv({ ...minimo, INVITACIONES_LIMITE_DIARIO: valor })
      expect(resultado.ok).toBe(false)
      if (resultado.ok) continue
      expect(resultado.errores).toContain(
        "INVITACIONES_LIMITE_DIARIO: debe ser un entero entre 1 y 10000",
      )
    }
  })

  it("acepta en production un JWT_SECRET propio de 32 caracteres o más", () => {
    const resultado = validarEnv({
      ...minimo,
      ...almacenValido,
      NODE_ENV: "production",
      JWT_SECRET: "un-secreto-propio-de-produccion-de-prueba-1234567890",
    })

    expect(resultado.ok).toBe(true)
  })

  it("PR-D02a: las tres variables STORAGE_* van todas o ninguna", () => {
    const ninguna = validarEnv(minimo)
    expect(ninguna.ok).toBe(true)
    const todas = validarEnv({ ...minimo, ...almacenValido })
    expect(todas.ok).toBe(true)

    const soloElEndpoint = validarEnv({
      ...minimo,
      STORAGE_ENDPOINT: almacenValido.STORAGE_ENDPOINT,
    })
    expect(soloElEndpoint.ok).toBe(false)
    if (soloElEndpoint.ok) throw new Error("soloElEndpoint debía ser inválido y salió válido")
    expect(soloElEndpoint.errores).toEqual([
      "STORAGE_ACCESS_KEY: debe definirse junto con STORAGE_ENDPOINT, STORAGE_ACCESS_KEY y STORAGE_SECRET_KEY",
      "STORAGE_SECRET_KEY: debe definirse junto con STORAGE_ENDPOINT, STORAGE_ACCESS_KEY y STORAGE_SECRET_KEY",
    ])

    const sinElSecreto = validarEnv({
      ...minimo,
      STORAGE_ENDPOINT: almacenValido.STORAGE_ENDPOINT,
      STORAGE_ACCESS_KEY: almacenValido.STORAGE_ACCESS_KEY,
    })
    expect(sinElSecreto.ok).toBe(false)

    const vacias = validarEnv({
      ...minimo,
      STORAGE_ENDPOINT: "",
      STORAGE_ACCESS_KEY: "",
      STORAGE_SECRET_KEY: "",
    })
    expect(vacias.ok).toBe(true)

    const protocoloInvalido = validarEnv({
      ...minimo,
      ...almacenValido,
      STORAGE_ENDPOINT: "ftp://almacen.ejemplo-de-prueba.mx",
    })
    expect(protocoloInvalido.ok).toBe(false)
    if (protocoloInvalido.ok) throw new Error("protocoloInvalido debía ser inválido y salió válido")
    expect(protocoloInvalido.errores).toEqual([
      "STORAGE_ENDPOINT: debe ser una URL que empiece con http:// o https://",
    ])
  })

  it("PR-D02b: production exige las tres variables STORAGE_*", () => {
    const resultado = validarEnv({ ...minimo, NODE_ENV: "production" })

    expect(resultado.ok).toBe(false)
    if (resultado.ok) throw new Error("resultado debía ser inválido y salió válido")
    expect(resultado.errores).toEqual([
      "STORAGE_ENDPOINT: obligatoria en production",
      "STORAGE_ACCESS_KEY: obligatoria en production",
      "STORAGE_SECRET_KEY: obligatoria en production",
    ])

    const conAlmacen = validarEnv({
      ...minimo,
      ...almacenValido,
      NODE_ENV: "production",
      STORAGE_REGION: "auto",
      STORAGE_BUCKET_PRIVADO: "bucket-propio",
    })
    expect(conAlmacen.ok).toBe(true)
    if (!conAlmacen.ok) throw new Error("conAlmacen debía ser válido y salió inválido")
    expect(conAlmacen.env.STORAGE_REGION).toBe("auto")
    expect(conAlmacen.env.STORAGE_BUCKET_PRIVADO).toBe("bucket-propio")
  })

  it("PR-D02c: los mensajes de STORAGE_* no llevan valores", () => {
    const resultado = validarEnv({
      ...minimo,
      STORAGE_ENDPOINT: "ftp://centinela-endpoint.mx",
      STORAGE_ACCESS_KEY: "centinela-llave",
    })

    expect(resultado.ok).toBe(false)
    if (resultado.ok) throw new Error("resultado debía ser inválido y salió válido")
    const texto = resultado.errores.join(" | ")
    expect(texto).toContain("STORAGE_ENDPOINT")
    expect(texto).toContain("STORAGE_SECRET_KEY")
    expect(texto).not.toContain("centinela")

    const enProduction = validarEnv({
      ...minimo,
      NODE_ENV: "production",
      STORAGE_ACCESS_KEY: "centinela-llave",
    })
    expect(enProduction.ok).toBe(false)
    if (enProduction.ok) throw new Error("enProduction debía ser inválido y salió válido")
    expect(enProduction.errores.join(" | ")).not.toContain("centinela")
  })
})

describe("validarEnvAdmin", () => {
  it("acepta ADMIN_EMAIL, ADMIN_PASSWORD y ADMIN_NOMBRE válidos", () => {
    const resultado = validarEnvAdmin({
      ADMIN_EMAIL: "admin@campus.local",
      ADMIN_PASSWORD: "clave-de-prueba-larga",
      ADMIN_NOMBRE: "Administración CMEP",
    })

    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return

    expect(resultado.env).toEqual({
      ADMIN_EMAIL: "admin@campus.local",
      ADMIN_PASSWORD: "clave-de-prueba-larga",
      ADMIN_NOMBRE: "Administración CMEP",
    })
  })

  it("rechaza ADMIN_PASSWORD corta sin repetir su valor", () => {
    const resultado = validarEnvAdmin({
      ADMIN_EMAIL: "admin@campus.local",
      ADMIN_PASSWORD: "corta-xyz",
      ADMIN_NOMBRE: "Administración CMEP",
    })

    expect(resultado.ok).toBe(false)
    if (resultado.ok) return

    expect(resultado.errores).toContain("ADMIN_PASSWORD: debe tener entre 10 y 128 caracteres")
    expect(resultado.errores.join("\n")).not.toContain("corta-xyz")
  })

  it("rechaza las tres variables ausentes nombrándolas como obligatorias", () => {
    const resultado = validarEnvAdmin({})

    expect(resultado.ok).toBe(false)
    if (resultado.ok) return

    expect(resultado.errores).toEqual([
      "ADMIN_EMAIL: obligatoria",
      "ADMIN_PASSWORD: obligatoria",
      "ADMIN_NOMBRE: obligatoria",
    ])
  })
})
