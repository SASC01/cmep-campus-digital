import { describe, expect, it } from "vitest"

// CHORE-06a (§D-1, CH6-A30): lo abierto es del id de la ruta. Toda vista nueva bajo la clase que pinta
// ConClaseDeLaRuta con un render prop de una línea lleva `key={claseId}`; las cuatro listas con memoria de
// foco (O-14) la llevan en su formulario; y las vistas de tarea, entrega y recurso la llevan por todos los
// ids de la ruta de los que depende lo que escriben o muestran. Regla textual: solo ve la forma de una
// línea (R-02 del plan); una vista con un render prop de varias líneas se revisa a mano.

const fuentes = import.meta.glob<string>("/src/features/**/*.tsx", {
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
  .filter(([ruta]) => !/\.test\.tsx$/.test(ruta))
  .map(([ruta, texto]) => [ruta, sinComentarios(texto)] as const)

const nombreDelArchivo = (ruta: string) => ruta.slice(ruta.lastIndexOf("/") + 1)

const RENDER_PROP = /\{\((claseId)\) => <(\w+)([^>]*)\/>\}/g

// Las que no llevan la key en el render prop: el layout (DH-01 a), la clase anterior (su Outlet ya la
// lleva) y las cuatro listas con memoria de foco (O-14), que la llevan en su formulario (Forma B).
const SIN_KEY_EN_EL_RENDER_PROP: readonly string[] = [
  "clase-layout.tsx#ClaseDeLaRuta",
  "clase-anterior-view.tsx#ClaseAnteriorDeLaRuta",
  "muro-view.tsx#MuroDeLaClase",
  "dudas-view.tsx#DudasDeLaClase",
  "recursos-view.tsx#RecursosDeLaClase",
  "trabajo-view.tsx#TrabajoDeLaClase",
]

interface RenderProp {
  sitio: string
  atributos: string
}

const renderPropsDe = (archivos: readonly (readonly [string, string])[]): RenderProp[] =>
  archivos.flatMap(([ruta, texto]) =>
    [...texto.matchAll(RENDER_PROP)].map(([, , componente, atributos]) => ({
      sitio: `${nombreDelArchivo(ruta)}#${componente ?? ""}`,
      atributos: atributos ?? "",
    })),
  )

const sinLaKey = (renderProps: readonly RenderProp[]) =>
  renderProps
    .filter(({ sitio }) => !SIN_KEY_EN_EL_RENDER_PROP.includes(sitio))
    .filter(({ atributos }) => !/(^|\s)key=\{claseId\}(\s|$)/.test(atributos))
    .map(({ sitio }) => sitio)

const textoDe = (archivo: string) => {
  const encontrado = deProduccion.find(([ruta]) => ruta.endsWith(`/${archivo}`))
  if (encontrado === undefined) throw new Error(`Precondición: existe ${archivo}`)
  return encontrado[1]
}

describe("CH6-A30 · lo abierto es del id de la ruta (regla estática)", () => {
  it("CH6-A30 (precondición): el glob ve el código de producción y al menos 15 render props de una línea", () => {
    const renderProps = renderPropsDe(deProduccion)
    if (renderProps.length < 15) {
      throw new Error(
        `Precondición: se esperaban al menos 15 render props de una línea y hay ${String(renderProps.length)}. ` +
          "Si una vista pasó a un render prop de varias líneas, la regla no la ve: revísala a mano o baja la cifra con la lista nueva en el resumen.",
      )
    }
    expect(renderProps.length).toBeGreaterThanOrEqual(15)
    for (const sitio of SIN_KEY_EN_EL_RENDER_PROP) {
      const [archivo] = sitio.split("#")
      expect(() => textoDe(archivo ?? ""), sitio).not.toThrow()
      expect(
        renderProps.map((renderProp) => renderProp.sitio),
        sitio,
      ).toContain(sitio)
    }
  })

  it("CH6-A30 (a): todo render prop de una línea de ConClaseDeLaRuta lleva key={claseId}, salvo la lista cerrada", () => {
    expect(sinLaKey(renderPropsDe(deProduccion))).toEqual([])
  })

  it("CH6-A30 (a, control): la regla señala un render prop de ejemplo sin la key, por ruta#Componente", () => {
    const ejemplo = [
      [
        "/src/features/clases/ejemplo-view.tsx",
        "<ConClaseDeLaRuta>{(claseId) => <Ejemplo claseId={claseId} />}</ConClaseDeLaRuta>",
      ],
      [
        "/src/features/clases/con-key-view.tsx",
        "<ConClaseDeLaRuta>{(claseId) => <ConKey key={claseId} claseId={claseId} />}</ConClaseDeLaRuta>",
      ],
    ] as const
    expect(sinLaKey(renderPropsDe(ejemplo))).toEqual(["ejemplo-view.tsx#Ejemplo"])
  })

  it("CH6-A30 (b): las cuatro listas con memoria de foco llevan la key en su formulario («Nuevo tema», por clase)", () => {
    expect(textoDe("clases/muro-view.tsx")).toContain("<FormularioPublicacion key={claseId}")
    expect(textoDe("clases/dudas-view.tsx")).toContain("<FormularioDuda key={claseId}")
    expect(textoDe("clases/recursos-view.tsx")).toContain("<FormularioRecurso key={claseId}")
    expect(textoDe("clases/trabajo-view.tsx")).toContain("creandoEn !== claseId")
    // T-02 de la ronda 2: la sección lleva la clase en su key («Sin tema» tiene la misma clave en todas).
    const keyDeLaSeccion = ["key={`", "$", "{claseId}:", "$", "{seccion.clave}`}"].join("")
    expect(textoDe("clases/recursos-view.tsx")).toContain(keyDeLaSeccion)
    expect(textoDe("clases/trabajo-view.tsx")).toContain(keyDeLaSeccion)
  })

  it("CH6-A30 (c): la tarea, su edición, el recurso y la entrega de un alumno llevan la key por todos los ids de su ruta", () => {
    expect(textoDe("tareas/detalle-tarea-view.tsx")).toContain("key={tarea.id}")
    expect(textoDe("tareas/editar-tarea-view.tsx")).toContain("key={tareaId}")
    // T-01 de la ronda 1: las entregas de una tarea, en la Forma C, por la tarea (un id global).
    expect(textoDe("tareas/entregas-view.tsx")).toContain("<ListaDeEntregasDeLaTarea key={tareaId}")
    expect(textoDe("clases/editar-recurso-view.tsx")).toContain("key={recursoId}")
    // Enmienda 1 (M-01): la ruta es tareas/:tareaId/entregas/:alumnoId y el mismo alumno tiene entrega en
    // cada tarea; key={alumnoId} sola no basta.
    const keyCompuesta = ["key={`", "$", "{tareaId}:", "$", "{alumnoId}`}"].join("")
    expect(textoDe("tareas/entrega-de-alumno-view.tsx")).toContain(keyCompuesta)
  })
})
