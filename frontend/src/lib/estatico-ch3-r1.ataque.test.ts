import { describe, expect, it } from "vitest"

// Tester, ronda 1 de CHORE-03 03c. Reglas estáticas que CH3-C07 no cubre (O-20 del manager): ningún
// archivo de producción de src/ (salvo el contrato y features/diagnostico, S-09) muestra crudo el
// mensaje de un error (`mensaje={error.message}`, plantillas, avisos, `String(error)`, `.message` en
// JSX); solo los archivos ya aprobados leen el `.message` de un error del servidor, y todo lo demás
// lee el de una incidencia de zod local. O-05 extendida a features/admin y features/auth (ni copias de
// la expresión de ruta, ni `new RegExp(`, ni `.split(":")`; los envoltorios son de una línea; cada
// MensajeError usa la traducción del módulo o un texto fijo; acciones y consultas no se cruzan). Y la
// estática final del chore: sin quitarPrefijoDeCampo, PREFIJO_DE_RUTA ni MENSAJES_ERROR_CLASES; la
// lista de códigos que redirige solo en apiClient; esErrorDeCursor definida una vez y nunca pasada
// como referencia; en admin y auth, sin `?? []`, sin `disabled` y sin textos fuera de data.ts.

const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})

const esPrueba = (ruta: string) => /\.test\.tsx?$/.test(ruta)
const CONTRATO = "/src/lib/errores-de-api.ts"
const DIAGNOSTICO = "/src/features/diagnostico/"

const deProduccion = Object.entries(fuentes).filter(([ruta]) => !esPrueba(ruta))
const enAlcance = deProduccion.filter(
  ([ruta]) => ruta !== CONTRATO && !ruta.startsWith(DIAGNOSTICO),
)

// Quita comentarios de línea y de bloque (una cadena con "//" dentro solo puede esconder código,
// nunca inventarlo: la regla puede dejar de ver algo, no ver lo que no hay).
const sinComentarios = (texto: string) =>
  texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1")

const DEL_MODULO = (modulo: "admin" | "auth") =>
  enAlcance.filter(([ruta]) => ruta.startsWith(`/src/features/${modulo}/`))

describe("ataque CHORE-03 03c r1 · O-20: nadie muestra crudo el mensaje de un error", () => {
  const MUESTRAS_CRUDAS: readonly [string, RegExp][] = [
    ["mensaje={….message}", /mensaje=\{[^}]*\.message\b/],
    ["titulo={….message}", /titulo=\{[^}]*\.message\b/],
    ["children={….message}", /children=\{[^}]*\.message\b/],
    ["${….message}", /\$\{[^}]*\.message\b/],
    ["toast(….message)", /toast(\.\w+)?\([^)]*\.message\b/],
    ["{….message} en JSX", /\{\s*[\w$.?[\]]*\.message\s*\}/],
    ["String(error)", /String\(\s*[\w$.?]*(error|err|fallo|causa|motivo)\s*\)/i],
    ["error.toString()", /\b(error|err)\??\.toString\(/],
    ["JSON.stringify(error)", /JSON\.stringify\(\s*[\w$.?]*(error|err)\b/],
    // El respaldo de una incidencia de zod local (`issues[0]?.message ?? …`) no es texto del servidor.
    [
      ".message ?? / || (respaldo con el texto del servidor)",
      /(?<!issues\[\d+\]\??)\.message\s*(\?\?|\|\|)/,
    ],
    ["e.message / err.message", /\b(e|err|ex|fallo|causa)\??\.message\b/],
  ]

  it("ningún archivo de producción en el alcance de 03c tiene una muestra cruda del mensaje", () => {
    expect(enAlcance.length).toBeGreaterThan(150)
    for (const prefijo of [
      "/src/features/admin/",
      "/src/features/auth/",
      "/src/app/",
      "/src/services/",
    ]) {
      expect(enAlcance.some(([ruta]) => ruta.startsWith(prefijo))).toBe(true)
    }
    const fallas = enAlcance.flatMap(([ruta, texto]) =>
      MUESTRAS_CRUDAS.filter(([, regla]) => regla.test(sinComentarios(texto))).map(
        ([nombre]) => `${ruta}: ${nombre}`,
      ),
    )
    expect(fallas).toEqual([])
  })

  it("las reglas detectan las formas que dice O-20 (control de la regla)", () => {
    const muestras = [
      "<MensajeError mensaje={error.message} />",
      "toast.error(error.message)",
      "const t = `${consulta.error.message}`",
      "String(error)",
      "<p>{error.message}</p>",
      "<p>{mutacion.error?.message}</p>",
      "return err.message",
      "const texto = error.message ?? GENERICO",
    ]
    for (const muestra of muestras) {
      expect(
        MUESTRAS_CRUDAS.some(([, regla]) => regla.test(muestra)),
        `ninguna regla ve: ${muestra}`,
      ).toBe(true)
    }
    expect(
      MUESTRAS_CRUDAS.some(([, regla]) => regla.test("errores[campo] = incidencia.message")),
    ).toBe(false)
  })

  it("solo los archivos aprobados leen el .message de un error; los demás, solo el de una incidencia de zod local", () => {
    const APROBADOS = [
      "/src/components/adjuntos/lib.ts",
      "/src/features/tareas/lib.ts",
      "/src/features/clases/lib.ts",
    ]
    const lecturas = enAlcance.flatMap(([ruta, texto]) => {
      const codigo = sinComentarios(texto)
      return [...codigo.matchAll(/\.message\b/g)]
        .map((coincidencia) =>
          codigo.slice(Math.max(0, (coincidencia.index ?? 0) - 40), coincidencia.index),
        )
        .filter((antes) => !/(incidencia|issues\[\d+\])\??$/.test(antes))
        .map(() => ruta)
    })
    const fuera = [...new Set(lecturas)].filter((ruta) => !APROBADOS.includes(ruta))
    expect(fuera).toEqual([])
    for (const modulo of ["admin", "auth"] as const) {
      expect(lecturas.filter((ruta) => ruta.startsWith(`/src/features/${modulo}/`))).toEqual([])
    }
  })
})

describe("ataque CHORE-03 03c r1 · O-05 extendida a features/admin y features/auth", () => {
  it.each([["admin"], ["auth"]] as const)(
    "features/%s no copia la expresión de ruta ni parte mensajes con dos puntos",
    (modulo) => {
      const archivos = DEL_MODULO(modulo)
      expect(archivos.length).toBeGreaterThan(10)
      const PROHIBIDOS: readonly [string, RegExp][] = [
        ["new RegExp(", /new RegExp\(/],
        ['.split(":")', /\.split\(\s*["'`]:/],
        ['.indexOf(":")', /\.(indexOf|lastIndexOf|search)\(\s*["'`]:/],
        ["expresión que termina en dos puntos", /\/\^?[^/\n]*\]\+?\*?:\\s/],
        [
          "PREFIJO_DE_CAMPO, RUTA_DEL_MENSAJE o CAMPO_QUE_REPITE",
          /PREFIJO_DE_CAMPO|RUTA_DEL_MENSAJE|CAMPO_QUE_REPITE/,
        ],
        [
          "piezas internas del contrato",
          /\b(campoDeErrorDeApi|quitarRutaDelMensaje|textoVisibleOGenerico|erroresDeFormularioDeApi)\b/,
        ],
      ]
      const fallas = archivos.flatMap(([ruta, texto]) =>
        PROHIBIDOS.filter(([, regla]) => regla.test(sinComentarios(texto))).map(
          ([nombre]) => `${ruta}: ${nombre}`,
        ),
      )
      expect(fallas).toEqual([])
    },
  )

  it("los envoltorios de admin y auth son de una línea sobre el contrato", () => {
    const admin = fuentes["/src/features/admin/lib.ts"] ?? ""
    const auth = fuentes["/src/features/auth/lib.ts"] ?? ""
    expect(admin).toMatch(
      /export const mensajeDeErrorAdmin = \(error: unknown\): string =>\s*mensajeDeErrorDeApi\(error, TRADUCCION_DE_ERRORES_ADMIN\)\n/,
    )
    expect(admin).toMatch(
      /export const mensajeDeConsultaAdmin = \(error: unknown\): string =>\s*mensajeDeErrorDeConsulta\(error, TRADUCCION_DE_ERRORES_ADMIN\)\n/,
    )
    expect(auth).toMatch(
      /export const mensajeDeErrorAuth = \(error: unknown\): string =>\s*mensajeDeErrorDeApi\(error, TRADUCCION_DE_ERRORES_AUTH\)\n/,
    )
    for (const [ruta, nombre] of [
      ["/src/features/admin/lib.ts", "mensajeDeErrorAdmin"],
      ["/src/features/admin/lib.ts", "mensajeDeConsultaAdmin"],
      ["/src/features/auth/lib.ts", "mensajeDeErrorAuth"],
    ] as const) {
      const definiciones = deProduccion.filter(([, texto]) =>
        new RegExp(`(const|function)\\s+${nombre}\\b`).test(texto),
      )
      expect(definiciones.map(([r]) => r)).toEqual([ruta])
    }
  })

  it("cada MensajeError de admin y auth usa la traducción del módulo o un texto fijo de data.ts; acciones y consultas no se cruzan", () => {
    const usos = [...DEL_MODULO("admin"), ...DEL_MODULO("auth")].flatMap(([ruta, texto]) =>
      [...sinComentarios(texto).matchAll(/<MensajeError\b[^>]*?mensaje=\{([^}]*)\}/g)].map(
        (coincidencia) => [ruta, (coincidencia[1] ?? "").trim()] as const,
      ),
    )
    expect(usos.length).toBeGreaterThanOrEqual(18)
    const permitidos =
      /^(mensajeDeErrorAdmin\((buscar|restablecer|corregir|generar|invitar|revocar)\.error\)|mensajeDeConsultaAdmin\((enlaces|registrados)\.error\)|mensajeDeErrorAuth\([\w.]*error\)|(TEXTOS_[A-Z_]+|textos)\.\w+)$/
    expect(usos.filter(([, expresion]) => !permitidos.test(expresion))).toEqual([])
  })
})

describe("ataque CHORE-03 03c r1 · estática final del chore en todo src/ de producción", () => {
  it("quitarPrefijoDeCampo y PREFIJO_DE_RUTA no existen; MENSAJES_ERROR_CLASES no se declara ni se usa", () => {
    const conNombres = deProduccion
      .filter(([, texto]) => /quitarPrefijoDeCampo|PREFIJO_DE_RUTA\b/.test(texto))
      .map(([ruta]) => ruta)
    expect(conNombres).toEqual([])
    const conLaVieja = deProduccion
      .filter(([, texto]) => /\bMENSAJES_ERROR_CLASES\b/.test(sinComentarios(texto)))
      .map(([ruta]) => ruta)
    expect(conLaVieja).toEqual([])
  })

  it("CODIGOS_QUE_REDIRIGE_EL_CLIENTE se declara solo en apiClient, y nadie más copia sus tres códigos", () => {
    const declaraciones = deProduccion
      .filter(([, texto]) =>
        /(const|let|var)\s+CODIGOS_QUE_REDIRIGE_EL_CLIENTE\b|\bCODIGOS_QUE_REDIRIGE_EL_CLIENTE\s*:/.test(
          texto,
        ),
      )
      .map(([ruta]) => ruta)
    expect(declaraciones).toEqual(["/src/services/apiClient.ts"])
    const conLosTres = deProduccion
      .filter(([, texto]) => {
        const codigo = sinComentarios(texto)
        return ["ACCESO_RESTRINGIDO", "CAMBIO_DE_CONTRASENA_REQUERIDO", "NO_AUTENTICADO"].every(
          (codigoDeError) => new RegExp(`["'\`]${codigoDeError}["'\`]`).test(codigo),
        )
      })
      .map(([ruta]) => ruta)
    expect(conLosTres).toEqual(["/src/services/apiClient.ts"])
  })

  it("esErrorDeCursor se define una vez, en el contrato, y nadie la pasa como referencia a un método de arreglo", () => {
    const definiciones = deProduccion
      .filter(([, texto]) => /(const|let|var|function)\s+esErrorDeCursor\b/.test(texto))
      .map(([ruta]) => ruta)
    expect(definiciones).toEqual([CONTRATO])
    const comoReferencia = deProduccion
      .filter(([, texto]) =>
        /\.(map|filter|some|every|find|findIndex|findLast|findLastIndex|forEach|flatMap|reduce)\(\s*esErrorDeCursor\w*\s*[,)]/.test(
          texto,
        ),
      )
      .map(([ruta]) => ruta)
    expect(comoReferencia).toEqual([])
  })

  it.each([["admin"], ["auth"]] as const)(
    "features/%s: sin `?? []`, sin `disabled` y sin textos de la interfaz en lib.ts ni hooks.ts",
    (modulo) => {
      const archivos = DEL_MODULO(modulo)
      const fallas = archivos.flatMap(([ruta, texto]) => {
        const codigo = sinComentarios(texto)
        return [
          ...(/\?\?\s*\[\s*\]/.test(codigo) ? [`${ruta}: ?? []`] : []),
          ...(/\bdisabled\b/.test(codigo) ? [`${ruta}: disabled`] : []),
        ]
      })
      expect(fallas).toEqual([])
      for (const nombre of ["lib.ts", "hooks.ts"]) {
        const codigo = sinComentarios(fuentes[`/src/features/${modulo}/${nombre}`] ?? "")
        expect(codigo.length).toBeGreaterThan(100)
        const textos = [
          ...codigo.matchAll(/(["'`])([^"'`\r\n]*\p{L}{2,} +\p{L}{2,}[^"'`\r\n]*)\1/gu),
        ].map((coincidencia) => coincidencia[2])
        expect(textos).toEqual([])
      }
    },
  )
})
