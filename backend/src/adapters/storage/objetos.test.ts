import { describe, expect, it } from "vitest"

import { crearAlmacenDeObjetos, type ClienteDeObjetos } from "./index.js"

const opciones = {
  endPoint: "127.0.0.1",
  port: 9,
  useSSL: false,
  accessKey: "llave-de-prueba",
  secretKey: "secreto-de-prueba",
  region: "us-east-1",
  bucket: "campus-privado",
}

const errorConCodigo = (code: string): Error => Object.assign(new Error(`fallo ${code}`), { code })

interface ClienteFalso extends ClienteDeObjetos {
  copias: { destinoBucket: string; destino: string; origenConBucket: string }[]
  borrados: { bucket: string; claves: string[] }[]
}

const clienteFalso = ({
  alCopiar = () => Promise.resolve({}),
  alBorrar = () => Promise.resolve([]),
}: {
  alCopiar?: () => Promise<unknown>
  alBorrar?: () => ReturnType<ClienteDeObjetos["removeObjects"]>
} = {}): ClienteFalso => {
  const copias: ClienteFalso["copias"] = []
  const borrados: ClienteFalso["borrados"] = []
  return {
    copias,
    borrados,
    copyObject: (destinoBucket, destino, origenConBucket) => {
      copias.push({ destinoBucket, destino, origenConBucket })
      return alCopiar()
    },
    removeObjects: (bucket, claves) => {
      borrados.push({ bucket, claves })
      return alBorrar()
    },
  }
}

describe("crearAlmacenDeObjetos (ADM-1B15)", () => {
  it("ADM-1B15: copiar llama a copyObject en el bucket privado con el origen en ese bucket y responde copiado", async () => {
    const cliente = clienteFalso()
    const almacen = crearAlmacenDeObjetos(opciones, cliente)

    expect(await almacen.copiar("materiales/a/1", "materiales/b/2")).toBe("copiado")
    expect(cliente.copias).toEqual([
      {
        destinoBucket: "campus-privado",
        destino: "materiales/b/2",
        origenConBucket: "/campus-privado/materiales/a/1",
      },
    ])
  })

  it("ADM-1B15: NoSuchKey (o NotFound) del origen se traduce a origen_inexistente; otro error, a 503 sin llaves", async () => {
    for (const codigo of ["NoSuchKey", "NotFound"]) {
      const almacen = crearAlmacenDeObjetos(
        opciones,
        clienteFalso({ alCopiar: () => Promise.reject(errorConCodigo(codigo)) }),
      )
      expect(await almacen.copiar("materiales/a/1", "materiales/b/2"), codigo).toBe(
        "origen_inexistente",
      )
    }

    const almacen = crearAlmacenDeObjetos(
      opciones,
      clienteFalso({ alCopiar: () => Promise.reject(errorConCodigo("SlowDown")) }),
    )
    const error = await almacen.copiar("materiales/a/1", "materiales/b/2").catch((e: unknown) => e)
    expect(error).toMatchObject({ codigo: "ALMACEN_NO_DISPONIBLE", estado: 503 })
    expect((error as Error).message).not.toContain("secreto-de-prueba")
  })

  it("ADM-1B15: borrar llama a removeObjects con las claves; una lista vacía no llama; un error del almacén o de una clave (forma real de minio y forma de sus tipos) lanza; una clave inexistente no", async () => {
    const cliente = clienteFalso()
    const almacen = crearAlmacenDeObjetos(opciones, cliente)
    await almacen.borrar(["materiales/a/1", "entregas/t/u/2"])
    await almacen.borrar([])
    expect(cliente.borrados).toEqual([
      { bucket: "campus-privado", claves: ["materiales/a/1", "entregas/t/u/2"] },
    ])

    // Las dos formas de un error por clave: la real de minio 8.0.7 ({ Key, Code, Message }, la que
    // arma su parser) y la de sus tipos ({ Error: { Code } }), por defensa (T-01 de la ronda 1).
    const formas = (codigo: string, clave = "materiales/a/1") => [
      { nombre: "real", valor: { Key: clave, Code: codigo, Message: codigo } },
      { nombre: "de los tipos", valor: { Error: { Code: codigo, Key: clave } } },
    ]
    const conRespuesta = (respuesta: unknown[]) =>
      crearAlmacenDeObjetos(opciones, clienteFalso({ alBorrar: () => Promise.resolve(respuesta) }))

    // Una clave que ya no existe no es error: el borrado es idempotente.
    for (const codigo of ["NoSuchKey", "NotFound"]) {
      for (const { nombre, valor } of formas(codigo)) {
        await expect(
          conRespuesta([valor]).borrar(["materiales/a/1"]),
          `${codigo} (${nombre})`,
        ).resolves.toBeUndefined()
      }
    }

    // Un error por clave lanza el 503, sin la llave ni el secreto: todas con error, algunas con error
    // y un elemento sin código reconocible.
    for (const codigo of ["AccessDenied", "InternalError"]) {
      for (const { nombre, valor } of formas(codigo)) {
        const todas = await conRespuesta([valor, { ...valor, Key: "materiales/a/2" }])
          .borrar(["materiales/a/1", "materiales/a/2"])
          .catch((e: unknown) => e)
        expect(todas, `${codigo} (${nombre}), todas`).toMatchObject({
          codigo: "ALMACEN_NO_DISPONIBLE",
          estado: 503,
        })
        expect((todas as Error).message).not.toContain("secreto-de-prueba")
        await expect(
          conRespuesta([valor]).borrar(["materiales/a/1", "materiales/a/2"]),
          `${codigo} (${nombre}), una de dos`,
        ).rejects.toMatchObject({ codigo: "ALMACEN_NO_DISPONIBLE" })
      }
    }
    await expect(
      conRespuesta([{ Key: "materiales/a/1" }]).borrar(["materiales/a/1"]),
    ).rejects.toMatchObject({ codigo: "ALMACEN_NO_DISPONIBLE" })
    // Un NoSuchKey junto a un error real sigue lanzando.
    await expect(
      conRespuesta([
        { Key: "materiales/a/1", Code: "NoSuchKey" },
        { Key: "materiales/a/2", Code: "AccessDenied" },
      ]).borrar(["materiales/a/1", "materiales/a/2"]),
    ).rejects.toMatchObject({ codigo: "ALMACEN_NO_DISPONIBLE" })
    // Sin errores (null o undefined en la lista, o lista vacía), resuelve.
    await expect(
      conRespuesta([null, undefined]).borrar(["materiales/a/1"]),
    ).resolves.toBeUndefined()

    const caido = crearAlmacenDeObjetos(
      opciones,
      clienteFalso({ alBorrar: () => Promise.reject(new Error("ECONNRESET")) }),
    )
    await expect(caido.borrar(["materiales/a/1"])).rejects.toMatchObject({ estado: 503 })
  })
})
