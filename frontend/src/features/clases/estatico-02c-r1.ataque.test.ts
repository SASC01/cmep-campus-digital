import { describe, expect, it } from "vitest"

// Tester, CLASES-02c, ronda 1. Revisión estática del código de src/ (sin pruebas) para lo que una
// prueba de DOM no ve en todas sus ramas: que la firma del admin solo salga de `autor.administracion`
// (O-07), que ningún botón de borrar decida por el rol o por `propio` (C-13), que la ruta
// `mis-comentarios` no quede en el frontend (A-5), que la perspectiva salga de un solo lugar
// (§D-2C1) y que ningún código lleve al maestro a crear o editar una clase (§D-2C3).

const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})

const codigo = Object.entries(fuentes).filter(([ruta]) => !/\.test\.tsx?$/.test(ruta))

// Sin las líneas de comentario: un comentario que explica la regla no es código. Sin el número de
// línea, para que un cambio ajeno en el archivo no rompa la regla.
const lineasCon = (patron: RegExp) =>
  codigo.flatMap(([ruta, texto]) =>
    texto
      .split("\n")
      .map((linea) => ({ ruta, linea }))
      .filter(({ linea }) => !/^\s*(\/\/|\/?\*|\{\/\*)/.test(linea) && patron.test(linea))
      .map(({ ruta: r, linea }) => `${r}: ${linea.trim()}`),
  )

const rutasCon = (patron: RegExp) =>
  [...new Set(lineasCon(patron).map((l) => l.split(":")[0] ?? ""))].sort()

describe("ataque CLASES-02c r1: reglas de 02c en el código fuente", () => {
  it("se leyó el código fuente", () => {
    expect(codigo.length).toBeGreaterThan(60)
  })

  it("O-07: `administracion` solo se lee en firma-del-autor.tsx, y nadie compara un nombre con «Administración»", () => {
    // TAREAS-01c ronda 0 (C-8, §D-R0; §D-9): FirmaDelAutor pasa a components/clase/ y el archivo de
    // origen queda como reexportación; `administracion` sigue leyéndose en un solo archivo, el de la
    // firma. Solo cambia la ruta.
    expect(rutasCon(/\.administracion\b/)).toEqual(["/src/components/clase/firma-del-autor.tsx"])
    // Ninguna comparación (igualdad, includes, startsWith, test) contra la firma o su texto.
    expect(
      lineasCon(
        /(===|!==|==|!=|includes\(|startsWith\(|endsWith\(|\.test\(|localeCompare\()[^;]*(FIRMA_ADMINISTRACION|firmaAdministracion|[Aa]dministraci)|(FIRMA_ADMINISTRACION|firmaAdministracion)\s*(===|!==|==|!=)/,
      ),
    ).toEqual([])
    // TAREAS-01c ronda 0 complementaria (C-8, Enmienda 3; §D-9): el texto de la firma vive en
    // components/clase/data.ts (TEXTOS_DE_LA_CLASE.firmaAdministracion: FIRMA_ADMINISTRACION, con el
    // import de @campus/shared en una línea) y solo lo lee components/clase/firma-del-autor.tsx;
    // features/clases/data.ts y la reexportación de la firma ya no lo nombran. Siguen siendo tres
    // líneas en dos archivos: un solo lugar de datos y la firma.
    expect(
      lineasCon(/FIRMA_ADMINISTRACION|firmaAdministracion/).map((l) => l.split(":")[0]),
    ).toEqual([
      "/src/components/clase/data.ts",
      "/src/components/clase/data.ts",
      "/src/components/clase/firma-del-autor.tsx",
    ])
    expect(lineasCon(/"Administración"/)).toEqual([])
  })

  it("C-13 y A-5: los botones de borrar leen puedeBorrar del dato; nada decide por el rol, por `propio` ni por mis-comentarios", () => {
    expect(lineasCon(/mis-comentarios|useBorrarMiComentario|esMaestro|esDueno/)).toEqual([])
    expect(lineasCon(/\.propio\b/)).toEqual([])
    // TAREAS-01d ronda 0 complementaria (C-13, Enmienda 4; §D-10): "Borrar tarea" lee puedeBorrar de
    // la tarea en acciones-de-la-tarea.tsx, el único lector nuevo (detalle-tarea-view.tsx le pasa el
    // objeto entero y tarjeta-de-tarea.tsx no lo lee). Sigue protegiendo que el botón decida por el
    // dato y nunca por el rol, y que nadie más lea puedeBorrar.
    expect(rutasCon(/\.puedeBorrar\b/)).toEqual([
      "/src/features/clases/components/comentarios-de-publicacion.tsx",
      "/src/features/clases/components/publicacion-del-muro.tsx",
      "/src/features/tareas/components/acciones-de-la-tarea.tsx",
    ])
    expect(
      lineasCon(/puedeBorrar\s*[:=]\s*(?!\s*(comentario|publicacion|tarea)\.puedeBorrar)/),
    ).toEqual([])
  })

  // CLASES-02 ronda 0 de 02d (O-06, arbitraje del manager en revision.md, "Verificación del resumen
  // — CLASES-02c — corrección de la ronda 1", que pasó a 02d): perspectivaDeRuta compara el prefijo
  // sin distinguir mayúsculas, como el router, así que su línea de comparación cambia. El caso ya no
  // fija esa línea, que es la comparación por prefijo exacto que O-06 retira, y sigue protegiendo lo
  // mismo: fuera de features/clases/lib.ts (donde vive perspectivaDeRuta), ningún archivo compara el
  // pathname con un prefijo, ni directo ni pasado a minúsculas.
  it("§D-2C1: la perspectiva sale solo de perspectivaDeRuta; ninguna vista mira el prefijo de la ruta por su cuenta", () => {
    expect(lineasCon(/startsWith\(\s*["'`]\/(maestro|estudiante|admin)/)).toEqual([])
    expect(
      lineasCon(
        /pathname\s*(\.\s*(toLowerCase|toLocaleLowerCase)\(\s*\)\s*)?\.\s*(startsWith|includes|match|indexOf)\(/,
      ).filter((linea) => !linea.startsWith("/src/lib/ruta-de-clase.ts: ")),
    ).toEqual([])
    // TAREAS-01d ronda 0 complementaria (C-13, Enmienda 4; §D-9 y §D-10): perspectivaDeRuta vive en
    // lib/ruta-de-clase.ts desde 01c (la exención de arriba apunta ahí; O-2 de la ronda 0 de 01c), y
    // features/tareas la llama solo desde su gancho useRutaDeLaClase (hooks.ts). Sigue protegiendo
    // que nadie más la llame ni compare el pathname por su cuenta.
    expect(rutasCon(/perspectivaDeRuta\(/)).toEqual([
      "/src/features/clases/clase-layout.tsx",
      "/src/features/clases/muro-view.tsx",
      "/src/features/tareas/hooks.ts",
    ])
  })

  it("§D-2C3: ningún código lleva a /maestro/clases/nueva ni a /editar del maestro; «Crear clase» solo vive en la lista del admin", () => {
    // La ruta literal "clases/nueva" del router (redirige a /login, O-01) no escribe "/maestro/…".
    expect(lineasCon(/["'`]\/maestro\/clases\/(nueva|\$\{[^}]+\}\/editar)/)).toEqual([])
    expect(lineasCon(/path:\s*"clases\/nueva"/)).toEqual([
      '/src/app/router.tsx: { path: "clases/nueva", element: <Navigate to="/login" replace /> },',
    ])
    expect(rutasCon(/to=\{?["'`][^"'`]*\/clases\/nueva/)).toEqual([
      "/src/features/clases/clases-admin-view.tsx",
    ])
    expect(lineasCon(/TEXTOS_INICIO_MAESTRO\.(insignia|crearClase)|accionMaestro/)).toEqual([])
    // Los textos viven solo en data.ts: los títulos del formulario, su botón, el enlace de la lista
    // del admin y el enlace del encabezado (que solo pinta la perspectiva admin).
    expect(
      lineasCon(/"Crear clase"|"Editar clase"/).map((l) => l.split(": ").slice(1).join(": ")),
    ).toEqual([
      'tituloCrear: "Crear clase",',
      'tituloEditar: "Editar clase",',
      'botonCrear: "Crear clase",',
      'crear: "Crear clase",',
      'editar: "Editar clase",',
    ])
    expect(rutasCon(/"Crear clase"|"Editar clase"/)).toEqual(["/src/features/clases/data.ts"])
  })
})
