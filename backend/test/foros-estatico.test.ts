import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

// FORO-01a. FORO-1A06 (i), FORO-1A51, FORO-1A52 y FORO-1A53: reglas estáticas del foro. La regla tardía
// decide solo en reglaDeParticipacion; el handler es delgado y cada ruta lleva su cadena exacta; el
// adaptador no usa SQL propio ni consultas en ciclos; y ningún comentario de lo que 01a crea o cambia
// en backend/src nombra las palabras que leen en crudo las listas estáticas.

const SRC = join(import.meta.dirname, "..", "src")
const SHARED = join(import.meta.dirname, "..", "..", "shared", "src")

const sinComentarios = (texto: string): string =>
  texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1")

const comentariosDe = (texto: string): string[] => [
  ...[...texto.matchAll(/\/\*[\s\S]*?\*\//g)].map((m) => m[0]),
  ...[...texto.matchAll(/(?:^|[^:"'`])(\/\/.*)$/gm)].map((m) => m[1] ?? ""),
]

const leerCrudo = (ruta: string): string => readFileSync(join(SRC, ruta), "utf8")
const leer = (ruta: string): string => sinComentarios(leerCrudo(ruta))

// El cuerpo de una declaración de nivel superior, hasta la siguiente.
const cuerpoDe = (codigo: string, inicio: string): string => {
  const desde = codigo.indexOf(inicio)
  expect(desde, `Precondición: existe ${inicio}`).toBeGreaterThanOrEqual(0)
  const siguiente = codigo.slice(desde + inicio.length).search(/\n(export )?(const|interface) /)
  return siguiente < 0
    ? codigo.slice(desde)
    : codigo.slice(desde, desde + inicio.length + siguiente)
}

// Decisiones con la fecha (FORO-1A06 i, reescrita en E2-1): las funciones de la regla, las lecturas
// del reloj y toda comparación con la fecha límite o "ahora" a un lado.
const DECISIONES_CON_LA_FECHA = [
  /\besTarde\(/,
  /\bentregaCerrada\(/,
  /\.getTime\(/,
  /Date\.now\(/,
  /\b(fechaLimite|fecha_limite|ahora)\b\s*(<=?|>=?)(?!>)/,
  /(?<![=-])(<=?|>=?)\s*[\w.]*\b(fechaLimite|fecha_limite|ahora)\b/,
]

const decisionesEn = (codigo: string): string[] =>
  codigo
    .split("\n")
    .filter((linea) => DECISIONES_CON_LA_FECHA.some((patron) => patron.test(linea)))
    .map((linea) => linea.trim())

describe("FORO-1A06 (i): la regla tardía decide en un solo lugar", () => {
  it("FORO-1A06 (i): en core/foros/participacion.ts, las decisiones con la fecha viven solo dentro de reglaDeParticipacion, y aceptaTardias solo se declara en ForoParaParticipar", () => {
    const codigo = leer("core/foros/participacion.ts")
    const regla = cuerpoDe(codigo, "export const reglaDeParticipacion =")
    expect(
      decisionesEn(regla).length,
      "Precondición: la regla decide con la fecha",
    ).toBeGreaterThan(0)
    expect(decisionesEn(codigo.replace(regla, ""))).toEqual([])
    const declaracion = cuerpoDe(codigo, "export interface ForoParaParticipar")
    expect(declaracion).toContain("aceptaTardias: boolean")
    expect(codigo.replace(declaracion, "")).not.toMatch(/aceptaTardias/)
  })

  it("FORO-1A06 (i): adapters/db/foros.ts, adapters/db/actividades.ts y handlers/foros.ts no deciden con la fecha; sus menciones de aceptaTardias y fechaLimite son las admitidas", () => {
    for (const ruta of [
      "adapters/db/foros.ts",
      "adapters/db/actividades.ts",
      "handlers/foros.ts",
    ]) {
      expect(decisionesEn(leer(ruta)), ruta).toEqual([])
    }
    const lineasCon = (ruta: string, palabra: RegExp): string[] =>
      leer(ruta)
        .split("\n")
        .filter((linea) => palabra.test(linea))
        .map((linea) => linea.trim())
    // El tipo del elemento de la lista, el select de la fila de tareas (el foro de "mi participación" y
    // la página de la lista) y el mapeo de la lista; el objeto del foro que se pasa a core/ es la fila
    // bloqueada o leída, sin armarlo.
    expect(lineasCon("adapters/db/foros.ts", /aceptaTardias|fechaLimite/)).toEqual([
      "fechaLimite: Date",
      "tarea: { select: { fechaLimite: true, puntos: true } },",
      "fechaLimite: fila.tarea.fechaLimite,",
      "select: { fechaLimite: true, aceptaTardias: true, puntos: true },",
    ])
    expect(lineasCon("adapters/db/actividades.ts", /aceptaTardias|fechaLimite/)).toEqual([])
    // El paso del formulario a crearTarea y editarTarea, el mapeo de la respuesta y la regla del
    // recordatorio y de la fecha (no la tardía).
    expect(lineasCon("handlers/foros.ts", /aceptaTardias|fechaLimite/)).toEqual([
      "fechaLimite: foro.fechaLimite.toISOString(),",
      "aceptaTardias: foro.aceptaTardias,",
      "const fechaLimite = new Date(datos.fechaLimite)",
      "validarFechaLimite({ nueva: fechaLimite, anterior: null, ahora })",
      "const momento = momentoDelRecordatorio(fechaLimite, ahora)",
      "fechaLimite,",
      "aceptaTardias: datos.aceptaTardias,",
      "fechaLimite: foro.fechaLimite.toISOString(),",
      "const fechaLimite = new Date(datos.fechaLimite)",
      "fechaLimite,",
      "aceptaTardias: datos.aceptaTardias,",
    ])
  })

  it("FORO-1A06 (i): el cuerpo de exigirEntregaCalificable llama a reglaDeParticipacion en la rama del foro", () => {
    const cuerpo = cuerpoDe(
      leer("core/calificaciones/calificar.ts"),
      "export const exigirEntregaCalificable =",
    )
    const rama = cuerpo.slice(cuerpo.indexOf('if (actividad === "foro")'))
    expect(rama.indexOf("reglaDeParticipacion(")).toBeGreaterThan(0)
  })
})

describe("FORO-1A51: handlers/foros.ts es delgado y cada ruta lleva su cadena", () => {
  const handler = leer("handlers/foros.ts")

  it("FORO-1A51: no compara relación ni rol, no toca Prisma ni SQL ni notifier", () => {
    expect(handler.length, "Precondición: existe el handler").toBeGreaterThan(0)
    expect(handler).not.toMatch(
      /\$queryRaw|\$executeRaw|obtenerDb|adapters\/db\/cliente|@prisma|\.rol\b|"admin"\s*===|===\s*"(admin|maestro|estudiante)"|notifier|relacion\s*===/,
    )
  })

  it("FORO-1A51: solo encola COLA_TAREA_CREADA, COLA_RECORDATORIO_24H y COLA_CALIFICACION_PUBLICADA, y solo cancela COLA_RECORDATORIO_24H y COLA_TAREA_CREADA", () => {
    const encoladas = new Set([...handler.matchAll(/encolar\(\s*(\w+)/g)].map((m) => m[1]))
    expect([...encoladas].sort()).toEqual([
      "COLA_CALIFICACION_PUBLICADA",
      "COLA_RECORDATORIO_24H",
      "COLA_TAREA_CREADA",
    ])
    const canceladas = new Set([...handler.matchAll(/cancelar\(\s*(\w+)/g)].map((m) => m[1]))
    expect([...canceladas].sort()).toEqual(["COLA_RECORDATORIO_24H", "COLA_TAREA_CREADA"])
  })

  it("FORO-1A51: cada una de las 16 rutas lleva su protegido exacto de §D-3.1, con enClaseArchivada: «lectura» en las 10 lecturas y sin ella en las 6 escrituras", () => {
    const C = '"/clases/:claseId/foros'
    const lectura = (roles: string, pertenencia: string) =>
      `protegido\\(\\{\\s*roles: \\[${roles}\\],\\s*pertenencia: "${pertenencia}",\\s*enClaseArchivada: "lectura",?\\s*\\}\\)`
    const cerrada = (roles: string, pertenencia: string) =>
      `protegido\\(\\{\\s*roles: \\[${roles}\\],\\s*pertenencia: "${pertenencia}",?\\s*\\}\\)`
    const todos = '"estudiante", "maestro", "admin"'
    const gestion = '"maestro", "admin"'
    const alumno = '"estudiante"'
    const rutas: [string, string, string][] = [
      ["post", `${C}"`, cerrada(gestion, "propiedad")],
      ["get", `${C}"`, lectura(todos, "inscripcion")],
      ["get", `${C}/:foroId"`, lectura(todos, "inscripcion")],
      ["put", `${C}/:foroId"`, cerrada(gestion, "propiedad")],
      ["delete", `${C}/:foroId"`, cerrada(gestion, "propiedad")],
      ["get", `${C}/:foroId/mi-participacion"`, lectura(alumno, "inscripcion")],
      ["get", `${C}/:foroId/mi-participacion/devoluciones"`, lectura(alumno, "inscripcion")],
      ["get", `${C}/:foroId/participaciones"`, lectura(todos, "inscripcion")],
      ["post", `${C}/:foroId/participaciones"`, cerrada(alumno, "inscripcion")],
      [
        "get",
        `${C}/:foroId/participaciones/:participacionId/replicas"`,
        lectura(todos, "inscripcion"),
      ],
      [
        "post",
        `${C}/:foroId/participaciones/:participacionId/replicas"`,
        cerrada('"estudiante", "maestro"', "inscripcion"),
      ],
      ["get", `${C}/:foroId/participantes"`, lectura(gestion, "propiedad")],
      ["get", `${C}/:foroId/participantes/:alumnoId"`, lectura(gestion, "propiedad")],
      [
        "get",
        `${C}/:foroId/participantes/:alumnoId/participaciones"`,
        lectura(gestion, "propiedad"),
      ],
      ["get", `${C}/:foroId/participantes/:alumnoId/devoluciones"`, lectura(gestion, "propiedad")],
      [
        "put",
        `${C}/:foroId/participantes/:alumnoId/calificacion"`,
        cerrada('"maestro"', "propiedad"),
      ],
    ]
    const escapar = (texto: string) => texto.replace(/[/.*+?^${}()|[\]\\]/g, "\\$&")
    for (const [metodo, ruta, protegido] of rutas) {
      const patron = new RegExp(`app\\.${metodo}\\(\\s*${escapar(ruta)},\\s*${protegido}`)
      expect(handler, `${metodo} ${ruta}`).toMatch(patron)
    }
    const registradas = [...handler.matchAll(/app\.(get|post|put|delete)\(/g)]
    expect(registradas).toHaveLength(16)
    expect(handler.match(/enClaseArchivada: "lectura"/g)).toHaveLength(10)
    expect(handler).not.toMatch(/enClaseArchivada: "(gestion|lectura-del-alumno)"/)
  })

  it("FORO-1A51: app.ts registra forosHandler con el almacén, después de calificacionesHandler", () => {
    const app = leer("app.ts")
    const calificaciones = app.indexOf("app.register(calificacionesHandler")
    const foros = app.indexOf(
      'app.register(forosHandler, { prefix: "/api", almacen: almacenDeLaApp })',
    )
    expect(calificaciones).toBeGreaterThan(0)
    expect(foros).toBeGreaterThan(calificaciones)
  })
})

describe("FORO-1A52: el adaptador del foro no usa SQL propio, ni consultas en ciclos, ni la cola", () => {
  it("FORO-1A52: adapters/db/foros.ts y actividades.ts sin $queryRaw, $executeRaw ni FOR …, sin consultas en ciclos y sin importar adapters/queue", () => {
    for (const ruta of ["adapters/db/foros.ts", "adapters/db/actividades.ts"]) {
      const codigo = leer(ruta)
      expect(codigo.length, `Precondición: existe ${ruta}`).toBeGreaterThan(0)
      expect(codigo, ruta).not.toMatch(/\$queryRaw|\$executeRaw|Unsafe/)
      expect(codigo, ruta).not.toMatch(/FOR\s+(UPDATE|SHARE|KEY|NO\s+KEY)/i)
      expect(codigo, ruta).not.toMatch(/\b(for|while)\s*\(/)
      expect(codigo, ruta).not.toMatch(/\.forEach\(/)
      expect(codigo, ruta).not.toMatch(/adapters\/queue|from\s+["']\.\.\/queue/)
    }
    // Una sola ayuda de tipo, sin reexportarla.
    expect(leer("adapters/db/index.ts")).not.toMatch(/esActividadDeTipo/)
  })

  it("FORO-1A52: las respuestas de shared/src/foros.ts son z.strictObject", () => {
    const texto = sinComentarios(readFileSync(join(SHARED, "foros.ts"), "utf8"))
    const respuestas = [
      "foroDetalleSchema",
      "foroRespuestaSchema",
      "elementoDeForoSchema",
      "listaForosRespuestaSchema",
      "participacionSchema",
      "replicaSchema",
      "listaParticipacionesRespuestaSchema",
      "listaReplicasRespuestaSchema",
      "miParticipacionRespuestaSchema",
      "participacionPublicadaRespuestaSchema",
      "replicaPublicadaRespuestaSchema",
      "participacionDeAlumnoSchema",
      "listaParticipacionesDeAlumnoRespuestaSchema",
    ]
    for (const nombre of respuestas) {
      expect(new RegExp(`export const ${nombre} = (z\\.\\w+)\\(`).exec(texto)?.[1], nombre).toBe(
        "z.strictObject",
      )
    }
  })
})

describe("FORO-1A53: los comentarios de lo que 01a crea o cambia en backend/src", () => {
  it("FORO-1A53: ningún comentario nombra las palabras de las listas estáticas (CAL-1A18, N-01) y tareas.ts no nombra la opción de la instantánea en un comentario", () => {
    const archivos = [
      "app.ts",
      "core/actividades.ts",
      "core/foros/participacion.ts",
      "core/tareas/tareas.ts",
      "core/calificaciones/calificar.ts",
      "core/clases/duplicado.ts",
      "adapters/db/actividades.ts",
      "adapters/db/foros.ts",
      "adapters/db/tareas.ts",
      "adapters/db/entregas.ts",
      "adapters/db/publicaciones.ts",
      "adapters/db/index.ts",
      "handlers/foros.ts",
    ]
    const hallazgos: string[] = []
    for (const ruta of archivos) {
      const comentarios = comentariosDe(leerCrudo(ruta)).join("\n")
      const prohibidas = [
        /COMENTARIO_CREADO|AVISO_FALLIDO|PUBLICACION_CREADA|MATERIAL_CREADO|colaDePublicacion/,
        /DELETE\s+FROM|TRUNCATE/i,
        /REPEATABLE READ|RepeatableRead|Serializable/,
        /instantaneaUnica: true/,
        ...(ruta.startsWith("adapters/db/")
          ? []
          : [/enTransaccion|instantaneaUnica|isolationLevel/]),
      ]
      for (const palabra of prohibidas) {
        if (palabra.test(comentarios)) hallazgos.push(`${ruta}: ${String(palabra)}`)
      }
    }
    expect(hallazgos).toEqual([])
    const tareas = leerCrudo("adapters/db/tareas.ts").split(/\r?\n/)
    expect(
      tareas.filter(
        (linea) => linea.trimStart().startsWith("//") && linea.includes("instantaneaUnica"),
      ),
    ).toEqual([])
    const foros = leerCrudo("adapters/db/foros.ts").split(/\r?\n/)
    expect(foros.filter((linea) => linea.includes("instantaneaUnica: true"))).toHaveLength(5)
    expect(
      foros.filter(
        (linea) => linea.trimStart().startsWith("//") && linea.includes("instantaneaUnica"),
      ),
    ).toEqual([])
  })
})
