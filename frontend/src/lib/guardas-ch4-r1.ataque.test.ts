import { describe, expect, it } from "vitest"

// Tester, ronda 1 de CHORE-04 (punto 2 del manager y punto 5 de "Puntos de ataque"). CH4-01 y CH4-03
// son reglas textuales con huecos conocidos: no ven una mutación desestructurada (`const { mutate } =`),
// pasada como valor (`descargar(x.mutateAsync, …)`), llamada dentro de un efecto, de un useCallback, de
// una `function` o de un manejador anidado (la atribuyen al manejador anterior), aceptan una guarda
// negada (`if (!xRef.current) return`) y solo miran `.refetch(` en la línea del `onClick=`. Ninguna de
// esas formas existe hoy en src/ sin guarda (son observaciones del reporte). Estas reglas fijan ese
// inventario para que una forma nueva no pase sin que nadie la mire.

const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})

const sinComentarios = (texto: string) =>
  texto
    .replace(/\/\*[\s\S]*?\*\//g, (comentario) => comentario.replace(/[^\n]/g, ""))
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")

const deProduccion: readonly (readonly [string, string])[] = Object.entries(fuentes)
  .filter(([ruta]) => !/\.test\.tsx?$/.test(ruta))
  .map(([ruta, texto]) => [ruta, sinComentarios(texto)] as const)

const lineasQue = (cumple: (linea: string) => boolean) =>
  deProduccion.flatMap(([ruta, texto]) =>
    texto
      .split("\n")
      .filter(cumple)
      .map((linea) => `${ruta}: ${linea.trim()}`),
  )

const LLAMADA = /\b(\w+)\.(mutate|mutateAsync)\(/
// Lo que abre un bloque en el que puede vivir una llamada: un manejador (`const x = (`), una función
// declarada, un efecto, un useCallback o useMemo, o un `.then(`.
const ABRE =
  /^(\s*)(?:const \w+ = (?:async )?\(|(?:export )?(?:async )?function \w+|(?:const \w+ = )?use(?:Effect|LayoutEffect|Callback|Memo)\(|.*\.then\()/

describe("ataque CHORE-04 r1 · formas de llamar a una mutación que la regla estática no ve", () => {
  it("precondición: el glob ve el código de producción y las llamadas que lee CH4-01", () => {
    expect(deProduccion.length).toBeGreaterThan(150)
    expect(lineasQue((linea) => LLAMADA.test(linea)).length).toBeGreaterThanOrEqual(60)
  })

  it("ATQ-CH4-30: ninguna mutación se desestructura ni se renombra (CH4-01 solo ve `x.mutate(`)", () => {
    const desestructuradas = lineasQue((linea) =>
      /\{[^}]*\bmutate(?:Async)?\b[^}]*\}\s*=/.test(linea),
    )
    const renombradas = lineasQue((linea) => /=\s*\w+\.mutate(?:Async)?\s*(?:$|[;,)])/.test(linea))
    expect(desestructuradas).toEqual([])
    expect(renombradas).toEqual([])
  })

  it("ATQ-CH4-31: una mutación pasada como valor solo existe en la descarga de adjuntos, que guarda su ref antes de llamarla", () => {
    const comoValor = lineasQue((linea) => /\.mutate(?:Async)?\b(?!\s*\()/.test(linea))
    expect(comoValor).toEqual([
      "/src/components/adjuntos/adjuntos-de-publicacion.tsx: descargar(descarga.mutateAsync, adjunto, mensajeDeError, alFallarLaDescarga)",
      "/src/components/adjuntos/adjuntos-de-publicacion.tsx: descargar(descarga.mutateAsync, adjunto, mensajeDeError, alFallarLaDescarga)",
    ])
    const adjuntos = deProduccion.find(
      ([ruta]) => ruta === "/src/components/adjuntos/adjuntos-de-publicacion.tsx",
    )?.[1]
    if (adjuntos === undefined) throw new Error("Precondición: existe adjuntos-de-publicacion.tsx")
    const guarda = adjuntos.indexOf("if (descargandoRef.current) return")
    const toma = adjuntos.indexOf("descargandoRef.current = true")
    expect(guarda).toBeGreaterThan(-1)
    expect(toma).toBeGreaterThan(guarda)
  })

  it("ATQ-CH4-32: toda llamada a una mutación vive en un manejador a dos espacios del cuerpo de un componente: ninguna en un efecto, un useCallback, un useMemo, un .then, una function declarada o un manejador anidado", () => {
    const fuera = deProduccion.flatMap(([ruta, texto]) => {
      const lineas = texto.split("\n")
      return lineas.flatMap((linea, indice) => {
        if (!LLAMADA.test(linea)) return []
        const abre = lineas
          .slice(0, indice + 1)
          .map((otra, posicion) => ({ otra, posicion }))
          .filter(({ otra }) => ABRE.test(otra))
          .at(-1)
        if (abre === undefined) return [`${ruta}:${String(indice + 1)} sin bloque`]
        const enManejador = /^ {2}const \w+ = (?:async )?\(/.test(abre.otra)
        return enManejador ? [] : [`${ruta}:${String(indice + 1)} en «${abre.otra.trim()}»`]
      })
    })
    // Inventario cerrado de hoy, los dos guardados: una ayuda anidada dentro de handleSubmit, que ya
    // tomó guardandoRef, y la excepción de §D-5 (la guarda vive en formulario-tarea.tsx).
    expect(fuera.map((falla) => falla.replace(/:\d+ /, " "))).toEqual([
      "/src/features/clases/components/editor-de-categorias.tsx en «const reemplazarFilas = (categoriasDelServidor: readonly Categoria[]) => {»",
      "/src/features/tareas/editar-tarea-view.tsx en «const handleGuardar = async (datos: CrearTarea, version: number) => {»",
    ])
  })

  it("ATQ-CH4-33: ninguna guarda negada sobre una ref que se toma (`if (!xRef.current) return`)", () => {
    const negadas = deProduccion.flatMap(([ruta, texto]) =>
      [...texto.matchAll(/if \(!\s*(\w+Ref)\.current\s*\)\s*return/g)]
        .filter(([, ref]) =>
          new RegExp(`\\b${ref ?? ""}\\.current = (?!false\\b|null\\b)`).test(texto),
        )
        .map(([linea]) => `${ruta}: ${linea}`),
    )
    expect(negadas).toEqual([])
  })

  it("ATQ-CH4-34: todo .refetch( de producción sin { cancelRefetch: false } está en la lista cerrada (S-04 y las recargas de un conflicto), y refetch nunca se pasa como valor", () => {
    const sinOpcion = lineasQue(
      (linea) =>
        linea.includes(".refetch(") && !linea.includes(".refetch({ cancelRefetch: false })"),
    )
    expect(sinOpcion.sort()).toEqual(
      [
        // S-04 (H-2): pulsar la sección activa con la lista en error; destino el chore de foco y navegación.
        "/src/features/clases/components/respuestas-de-duda.tsx: void respuestas.refetch()",
        "/src/features/clases/components/seccion-de-recursos.tsx: void recursos.refetch()",
        "/src/features/clases/components/seccion-de-tema.tsx: void trabajo.refetch()",
        "/src/features/clases/dudas-view.tsx: void dudas.refetch()",
        "/src/features/clases/muro-view.tsx: void publicaciones.refetch()",
        "/src/features/clases/recursos-view.tsx: void temas.refetch()",
        "/src/features/clases/trabajo-view.tsx: void temas.refetch()",
        // Recargas tras un conflicto, dentro de un manejador que ya guarda su ref.
        "/src/features/clases/editar-recurso-view.tsx: const resultado = await consulta.refetch()",
        "/src/features/tareas/editar-tarea-view.tsx: const resultado = await consulta.refetch()",
        "/src/features/tareas/entrega-de-alumno-view.tsx: consulta.refetch(),",
        "/src/features/tareas/entrega-de-alumno-view.tsx: recargaLaTareaTrasConflicto(error) ? tarea.refetch() : Promise.resolve(null),",
        // Cancela a propósito la petición previa del orden por sección.
        "/src/features/clases/hooks.ts: if (peticionPrevia) await temas.refetch({ cancelRefetch: true })",
      ].sort(),
    )
    const comoValor = lineasQue((linea) => /\.refetch\b(?!\s*\()/.test(linea))
    expect(comoValor).toEqual([])
    const desestructurado = lineasQue((linea) => /\{[^}]*\brefetch\b[^}]*\}\s*=/.test(linea))
    expect(desestructurado).toEqual([
      "/src/features/calificaciones/mis-calificaciones-view.tsx: const { refetch } = lista",
    ])
    const llamadasSueltas = lineasQue((linea) => /(?<![.\w])refetch\(/.test(linea))
    expect(llamadasSueltas).toEqual([
      "/src/features/calificaciones/mis-calificaciones-view.tsx: void refetch({ cancelRefetch: false })",
    ])
  })
})
