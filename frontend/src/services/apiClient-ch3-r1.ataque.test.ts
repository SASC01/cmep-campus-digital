import { describe, expect, it } from "vitest"

import * as datosDeCalificaciones from "@/features/calificaciones/data"
import { errorQueRedirigeElCliente as redirigeEnCalificaciones } from "@/features/calificaciones/lib"
import * as datosDeTareas from "@/features/tareas/data"
import { errorQueRedirigeElCliente as redirigeEnTareas } from "@/features/tareas/lib"

import { ApiError, CODIGOS_QUE_REDIRIGE_EL_CLIENTE } from "./apiClient"

// Tester, ronda 1 de CHORE-03 03b: ataque a N-46 (la lista de los errores con que apiClient saca a la
// persona de la vista vive solo aquí). Sin fechas ni reloj.

const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})
const deProduccion = Object.entries(fuentes).filter(([ruta]) => !/\.test\.tsx?$/.test(ruta))
const CLIENTE = "/src/services/apiClient.ts"

describe("ataque CHORE-03 03b r1 · N-46", () => {
  it("ningún data.ts de tareas ni de calificaciones exporta la lista (en tiempo de ejecución)", () => {
    expect(CODIGOS_QUE_REDIRIGE_EL_CLIENTE).toEqual([
      "ACCESO_RESTRINGIDO",
      "CAMBIO_DE_CONTRASENA_REQUERIDO",
      "NO_AUTENTICADO",
    ])
    expect(Object.keys(datosDeTareas)).not.toContain("CODIGOS_QUE_REDIRIGE_EL_CLIENTE")
    expect(Object.keys(datosDeCalificaciones)).not.toContain("CODIGOS_QUE_REDIRIGE_EL_CLIENTE")
  })

  it.each([
    [new ApiError("ACCESO_RESTRINGIDO", "x", 403), true],
    [new ApiError("CAMBIO_DE_CONTRASENA_REQUERIDO", "x", 403), true],
    [new ApiError("NO_AUTENTICADO", "x", 401), true],
    [new ApiError("acceso_restringido", "x", 403), false],
    [new ApiError(" ACCESO_RESTRINGIDO", "x", 403), false],
    [new ApiError("NO_AUTENTICADO ", "x", 401), false],
    [new ApiError("ACCESO", "x", 403), false],
    [new ApiError("constructor", "x", 400), false],
    [new ApiError("length", "x", 400), false],
    [new ApiError("VALIDACION", "ACCESO_RESTRINGIDO: x", 400), false],
    [new ApiError("SIN_ACCESO_A_LA_CLASE", "x", 403), false],
    [{ codigo: "ACCESO_RESTRINGIDO" }, false],
    [new Error("NO_AUTENTICADO"), false],
    [null, false],
  ] as const)(
    "errorQueRedirigeElCliente de tareas y de calificaciones dan lo mismo ante %o",
    (error, esperado) => {
      expect(redirigeEnTareas(error)).toBe(esperado)
      expect(redirigeEnCalificaciones(error)).toBe(esperado)
    },
  )

  it("fuera de services/apiClient ningún archivo de producción repite los tres códigos juntos (con otro nombre) y solo tareas y calificaciones importan la lista, de @/services/apiClient", () => {
    const conLosTres = deProduccion
      .filter(([, texto]) =>
        ["ACCESO_RESTRINGIDO", "CAMBIO_DE_CONTRASENA_REQUERIDO", "NO_AUTENTICADO"].every((codigo) =>
          new RegExp(`["'\`]${codigo}["'\`]`).test(texto),
        ),
      )
      .map(([ruta]) => ruta)
    expect(conLosTres).toEqual([CLIENTE])
    const usan = deProduccion
      .filter(
        ([ruta, texto]) => ruta !== CLIENTE && /\bCODIGOS_QUE_REDIRIGE_EL_CLIENTE\b/.test(texto),
      )
      .map(([ruta, texto]) => [
        ruta,
        /import \{[^}]*\bCODIGOS_QUE_REDIRIGE_EL_CLIENTE\b[^}]*\} from "@\/services\/apiClient"/.test(
          texto,
        ),
        /(const|let|var)\s+CODIGOS_QUE_REDIRIGE_EL_CLIENTE\b/.test(texto),
      ])
    expect(usan).toEqual([
      ["/src/features/calificaciones/lib.ts", true, false],
      ["/src/features/tareas/lib.ts", true, false],
    ])
  })

  it("apiClient no importa de features/ ni de lib/: solo @campus/shared, ./navegacion y ./tokenAcceso, sin import( ni require(", () => {
    const cliente = fuentes[CLIENTE]
    expect(cliente, "Precondición: existe services/apiClient.ts").toBeDefined()
    const texto = cliente ?? ""
    expect(Array.from(texto.matchAll(/from\s+["']([^"']+)["']/g)).map((m) => m[1])).toEqual([
      "@campus/shared",
      "./navegacion",
      "./tokenAcceso",
    ])
    expect(texto).not.toMatch(/\bimport\s*\(|\brequire\s*\(/)
    expect(texto).not.toMatch(/@\/(features|lib)\//)
    // navegacion y tokenAcceso tampoco cierran un ciclo hacia features/ o lib/.
    for (const ruta of ["/src/services/navegacion.ts", "/src/services/tokenAcceso.ts"]) {
      const vecino = fuentes[ruta] ?? ""
      expect(vecino.length, `Precondición: existe ${ruta}`).toBeGreaterThan(0)
      expect(vecino).not.toMatch(/from\s+["'](@\/(features|lib)\/|\.\.\/)/)
    }
  })

  it("el archivo de ataque de clases que revisa los invisibles de esta ronda tampoco tiene uno literal (se revisa desde aquí)", () => {
    const ruta = "/src/features/clases/errores-ch3-r1.ataque.test.ts"
    const texto = fuentes[ruta] ?? ""
    expect(texto.length, `Precondición: existe ${ruta}`).toBeGreaterThan(0)
    const puntos = [
      0x00a0, 0x3000, 0x200b, 0x200c, 0x200d, 0x2060, 0xfeff, 0x0085, 0x2800, 0x3164, 0x1d159,
      0x00ad, 0x2028, 0x2029, 0x0301,
    ]
    const hallados = puntos.filter((punto) => texto.includes(String.fromCodePoint(punto)))
    expect(hallados).toEqual([])
  })
})
