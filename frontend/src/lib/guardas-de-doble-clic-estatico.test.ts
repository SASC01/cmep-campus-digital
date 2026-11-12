import { describe, expect, it } from "vitest"

// CHORE-04 (§D-5): reglas estáticas de las guardas de doble clic en todo el código de producción de
// src/. Leen el texto sin comentarios (los comentarios se vacían conservando las líneas). Se apoyan en
// la sangría que deja Prettier: un manejador del cuerpo de un componente va a dos espacios (R-03).

const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})

const esPrueba = (ruta: string) => /\.test\.tsx?$/.test(ruta)

const sinComentarios = (texto: string) =>
  texto
    .replace(/\/\*[\s\S]*?\*\//g, (comentario) => comentario.replace(/[^\n]/g, ""))
    .replace(/^\s*\/\/.*$/gm, "")

const deProduccion: readonly (readonly [string, string])[] = Object.entries(fuentes)
  .filter(([ruta]) => !esPrueba(ruta))
  .map(([ruta, texto]) => [ruta, sinComentarios(texto)] as const)

const leer = (ruta: string): string => {
  const texto = deProduccion.find(([otra]) => otra === ruta)?.[1]
  if (texto === undefined) throw new Error(`Precondición: existe ${ruta}`)
  return texto
}

const LLAMADA = /\b(\w+)\.(mutate|mutateAsync)\(/g
const MANEJADOR = /^ {2}const (\w+) = (?:async )?\(/
const REF_TOMADA = /\b(\w+Ref)\.current = (?!false\b|null\b)/g
const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const guardaDe = (ref: string) =>
  new RegExp(`^\\s*if \\(.*\\b${escapar(ref)}\\.current\\b.*\\) return\\s*$`)

interface Manejador {
  nombre: string
  desde: number
  hasta: number
}

// Los manejadores a dos espacios de un archivo, cada uno hasta el siguiente.
const manejadoresDe = (lineas: readonly string[]): Manejador[] => {
  const inicios = lineas.flatMap((linea, indice) => {
    const nombre = MANEJADOR.exec(linea)?.[1]
    return nombre === undefined ? [] : [{ nombre, desde: indice }]
  })
  return inicios.map((inicio, i) => ({
    ...inicio,
    hasta: inicios[i + 1]?.desde ?? lineas.length,
  }))
}

// Las llamadas a una mutación sin su guarda, como `ruta#llamada`.
const llamadasSinGuarda = (ruta: string, texto: string): string[] => {
  const lineas = texto.split("\n")
  const manejadores = manejadoresDe(lineas)
  const fallas: string[] = []
  lineas.forEach((linea, indice) => {
    for (const coincidencia of linea.matchAll(LLAMADA)) {
      const llamada = `${ruta}#${coincidencia[1] ?? ""}.${coincidencia[2] ?? ""}`
      const manejador = manejadores.filter(({ desde }) => desde <= indice).at(-1)
      if (manejador === undefined) {
        fallas.push(llamada)
        continue
      }
      const tomadas = lineas.slice(manejador.desde, indice).flatMap((otra, desplazamiento) =>
        [...otra.matchAll(REF_TOMADA)].map((ref) => ({
          ref: ref[1] ?? "",
          linea: manejador.desde + desplazamiento,
        })),
      )
      const conGuarda = tomadas.some(({ ref, linea: dondeSeToma }) => {
        const guarda = guardaDe(ref)
        // (a) La guarda va en el mismo manejador, antes de tomar la ref.
        const enElMismo = lineas
          .slice(manejador.desde, dondeSeToma)
          .some((otra) => guarda.test(otra))
        if (enElMismo) return true
        // (b) Segunda fase: otro manejador comprueba la ref antes de llamar a este.
        return manejadores.some((otro) => {
          if (otro.desde === manejador.desde) return false
          const cuerpo = lineas.slice(otro.desde, otro.hasta)
          const llamaAEste = cuerpo.findIndex((otra) =>
            new RegExp(`\\b${escapar(manejador.nombre)}\\(`).test(otra),
          )
          if (llamaAEste < 0) return false
          return cuerpo.slice(0, llamaAEste).some((otra) => guarda.test(otra))
        })
      })
      if (!conGuarda) fallas.push(llamada)
    }
  })
  return fallas
}

const todasLasLlamadas = () =>
  deProduccion.flatMap(([ruta, texto]) =>
    [...texto.matchAll(LLAMADA)].map(
      (coincidencia) => `${ruta}#${coincidencia[1] ?? ""}.${coincidencia[2] ?? ""}`,
    ),
  )

const FORMULARIO_TAREA = "/src/features/tareas/components/formulario-tarea.tsx"
// Lista cerrada (§D-5): las dos corren dentro de handleGuardar de formulario-tarea.tsx, que toma la ref.
const EXCEPCIONES: readonly string[] = [
  "/src/features/tareas/crear-tarea-view.tsx#crear.mutateAsync",
  "/src/features/tareas/editar-tarea-view.tsx#editar.mutateAsync",
]

const CARPETAS: readonly string[] = [
  "/src/app/",
  "/src/features/auth/",
  "/src/features/clases/",
  "/src/features/admin/",
  "/src/features/tareas/",
  "/src/features/calificaciones/",
]

describe("CHORE-04 · guardas de doble clic en todo src/ (§D-5)", () => {
  it("CH4-01: toda llamada a una mutación tiene su guarda: una ref que el manejador toma y que se comprueba antes, en el mismo manejador o en el que lo llama", () => {
    const llamadas = todasLasLlamadas()
    expect(llamadas.length, "precondición: llamadas encontradas").toBeGreaterThanOrEqual(60)
    for (const carpeta of CARPETAS) {
      expect(
        llamadas.some((llamada) => llamada.startsWith(carpeta)),
        `precondición: hay llamadas en ${carpeta}`,
      ).toBe(true)
    }
    for (const excepcion of EXCEPCIONES) {
      expect(llamadas, `precondición: existe ${excepcion}`).toContain(excepcion)
    }
    const formularioTarea = leer(FORMULARIO_TAREA)
    const toma = formularioTarea.indexOf("guardandoRef.current = true")
    const llamada = formularioTarea.indexOf("await onGuardar(")
    expect(toma, FORMULARIO_TAREA).toBeGreaterThan(-1)
    expect(llamada, FORMULARIO_TAREA).toBeGreaterThan(toma)
    expect(formularioTarea).toMatch(/if \(guardandoRef\.current/)

    const fallas = deProduccion
      .flatMap(([ruta, texto]) => llamadasSinGuarda(ruta, texto))
      .filter((falla) => !EXCEPCIONES.includes(falla))
    expect(fallas).toEqual([])
  })

  it("CH4-01 (control): la regla falla sin guarda, con la guarda después de tomar la ref y con la guarda de otra ref; pasa con la forma de §D-1, la de dos fases y la de §D-4 bis", () => {
    const sinGuarda = ["  const handleBorrar = () => {", "    borrar.mutate(id)", "  }"].join("\n")
    const guardaDespues = [
      "  const handleBorrar = () => {",
      "    borrandoRef.current = true",
      "    if (borrandoRef.current) return",
      "    borrar.mutate(id)",
      "  }",
    ].join("\n")
    const otraRef = [
      "  const handleBorrar = () => {",
      "    if (otroRef.current) return",
      "    borrandoRef.current = true",
      "    borrar.mutate(id)",
      "  }",
    ].join("\n")
    const formaD1 = [
      "  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {",
      "    evento.preventDefault()",
      "    if (enviandoRef.current) return",
      "    if (alta.isPending) return",
      "    enviandoRef.current = true",
      "    alta.mutate(datos, {",
      "      onSettled: () => {",
      "        enviandoRef.current = false",
      "      },",
      "    })",
      "  }",
    ].join("\n")
    const dosFases = [
      "  const handleGuardar = async (datos: Datos) => {",
      "    guardandoRef.current = true",
      "    await guardar.mutateAsync(datos)",
      "  }",
      "  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {",
      "    if (guardandoRef.current) return",
      "    void handleGuardar(datos)",
      "  }",
    ].join("\n")
    const formaD4Bis = [
      "  const handleRestaurar = async () => {",
      "    if (restaurandoRef.current === claseId || restauracion.sigueEnVuelo()) return",
      "    restaurandoRef.current = claseId",
      "    try {",
      "      await restaurar.mutateAsync()",
      "    } finally {",
      "      if (restaurandoRef.current === claseId) restaurandoRef.current = null",
      "    }",
      "  }",
    ].join("\n")

    expect(llamadasSinGuarda("sin-guarda", sinGuarda)).toEqual(["sin-guarda#borrar.mutate"])
    expect(llamadasSinGuarda("despues", guardaDespues)).toEqual(["despues#borrar.mutate"])
    expect(llamadasSinGuarda("otra", otraRef)).toEqual(["otra#borrar.mutate"])
    expect(llamadasSinGuarda("d1", formaD1)).toEqual([])
    expect(llamadasSinGuarda("dos-fases", dosFases)).toEqual([])
    expect(llamadasSinGuarda("d4-bis", formaD4Bis)).toEqual([])
  })

  it("CH4-02: ninguna mutación se llama desde una flecha en línea", () => {
    const enLinea = /=>\s*(?:void\s+)?\w+\.(?:mutate|mutateAsync)\(/
    const fallas = deProduccion.flatMap(([ruta, texto]) =>
      texto
        .split("\n")
        .filter((linea) => enLinea.test(linea))
        .map((linea) => `${ruta}: ${linea.trim()}`),
    )
    expect(fallas).toEqual([])
  })

  it("CH4-03: los «Ver más» y los botones que piden una consulta no cancelan la petición en vuelo", () => {
    const paginas = deProduccion.flatMap(([ruta, texto]) =>
      [...texto.matchAll(/fetchNextPage\([^)]*\)/g)].map(([llamada]) => [ruta, llamada] as const),
    )
    expect(paginas.length, "precondición: «Ver más» encontrados").toBeGreaterThanOrEqual(15)
    expect(
      paginas
        .filter(([, llamada]) => llamada !== "fetchNextPage({ cancelRefetch: false })")
        .map(([ruta, llamada]) => `${ruta}: ${llamada}`),
    ).toEqual([])

    const botones = deProduccion.flatMap(([ruta, texto]) =>
      texto
        .split("\n")
        .filter((linea) => linea.includes("onClick=") && linea.includes(".refetch("))
        .map((linea) => [ruta, linea.trim()] as const),
    )
    expect(
      botones.some(([ruta]) => ruta === "/src/components/layout/lista-de-clases.tsx"),
      "precondición: «Reintentar» de la lista de clases de la barra",
    ).toBe(true)
    expect(
      botones
        .filter(([, linea]) => !linea.includes(".refetch({ cancelRefetch: false })"))
        .map(([ruta, linea]) => `${ruta}: ${linea}`),
    ).toEqual([])
  })

  it("CH4-04: ningún botón espera solo la página siguiente; isFetchingNextPage solo guarda efectos de foco", () => {
    const conEnEspera = deProduccion.flatMap(([ruta, texto]) =>
      texto
        .split("\n")
        .filter((linea) => linea.includes("enEspera=") && linea.includes("isFetchingNextPage"))
        .map((linea) => `${ruta}: ${linea.trim()}`),
    )
    expect(conEnEspera).toEqual([])
    const lectores = deProduccion
      .filter(([, texto]) => texto.includes("isFetchingNextPage"))
      .map(([ruta]) => ruta)
      .sort()
    expect(lectores).toEqual([
      "/src/features/calificaciones/mis-calificaciones-view.tsx",
      "/src/features/tareas/components/hilo-privado.tsx",
      "/src/features/tareas/entregas-view.tsx",
    ])
  })
})
