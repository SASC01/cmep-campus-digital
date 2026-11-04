import { estadoDeEntregaVisible, TEXTOS_ESTADO_DE_ENTREGA } from "@/lib/estado-de-entrega"
import { campoDeErrorDeApi, esErrorDeCursor } from "@/lib/errores-de-api"
import { formatearPuntos } from "@/lib/format"
import { MAXIMO_DE_COLUMNAS_XLSX, MAXIMO_DE_FILAS_XLSX } from "@/lib/xlsx"
import type { CeldaXlsx, HojaXlsx } from "@/lib/xlsx"
import { CODIGOS_QUE_REDIRIGE_EL_CLIENTE, esApiError } from "@/services/apiClient"

import {
  ANCHOS_DE_LA_EXPORTACION,
  CAMPOS_DE_CURSOR_DEL_GRADEBOOK,
  COLUMNAS_FIJAS_DE_LA_HOJA,
  INMOVILIZADO_DE_LA_EXPORTACION,
  LARGO_MAXIMO_DE_LA_CLASE_EN_EL_ARCHIVO,
  MENSAJES_ERROR_CALIFICACIONES,
  MENSAJES_ERROR_EXPORTACION,
  RESERVADOS_DEL_NOMBRE_DE_ARCHIVO,
  TEXTOS_EXPORTACION,
  TEXTOS_GRADEBOOK,
} from "./data"
import type {
  AccionDeVentana,
  AvisoDeLaExportacion,
  CeldaDelGradebook,
  ColumnaDelGradebook,
  CombinacionDeExportacion,
  DimensionDelGradebook,
  ExportacionDeCalificacionesRespuesta,
  FilaDeExportacion,
  FiltroDeMisCalificaciones,
  LimitesDelGradebook,
  MatrizDeExportacion,
  MotivoDeRiesgo,
  ResultadoDeLaExportacion,
  TextoDeCelda,
  VentanaDeExportacion,
  VentanaDelGradebook,
  VentanasDelGradebook,
} from "./types"

// CALIFICACIONES-01d (§D-13.2). Funciones puras del gradebook y de "Mis calificaciones".

const rutaDeLaClase = (claseId: string): string => `/api/clases/${claseId}`

// Una ventana del gradebook: los dos tamaños siempre; cada cursor, solo si hay.
export const rutaDelGradebook = (
  claseId: string,
  ventana: VentanaDelGradebook,
  limites: LimitesDelGradebook,
): string => {
  const consulta = new URLSearchParams({
    limite: String(limites.limite),
    limiteTareas: String(limites.limiteTareas),
  })
  if (ventana.cursor !== null) consulta.set("cursor", ventana.cursor)
  if (ventana.cursorTareas !== null) consulta.set("cursorTareas", ventana.cursorTareas)
  return `${rutaDeLaClase(claseId)}/gradebook?${consulta.toString()}`
}

// Una página de "Mis calificaciones" con su filtro (el filtro lo aplica el servidor).
export const rutaDeMisCalificaciones = (
  claseId: string,
  filtro: FiltroDeMisCalificaciones,
  cursor: string | undefined,
  limite: number,
): string => {
  const consulta = new URLSearchParams({ estado: filtro, limite: String(limite) })
  if (cursor !== undefined) consulta.set("cursor", cursor)
  return `${rutaDeLaClase(claseId)}/mis-calificaciones?${consulta.toString()}`
}

// Lo que dice una celda: la calificación si la hay; si no, el estado en palabras de
// estadoDeEntregaVisible; la asignada sin vencer se ve "—" y se oye "Asignado". "con retraso" va
// aparte solo cuando el texto visible no lo dice ya (una calificada que se entregó tarde).
export const textoDeCelda = (
  celda: CeldaDelGradebook,
  fechaLimite: string,
  ahora: Date,
): TextoDeCelda => {
  if (celda.estado === "calificado" && celda.calificacion !== null) {
    return {
      visible: formatearPuntos(celda.calificacion),
      soloLector: null,
      conRetraso: celda.conRetraso,
    }
  }
  const estado = estadoDeEntregaVisible(celda, fechaLimite, ahora)
  if (estado === "asignado") {
    return {
      visible: TEXTOS_GRADEBOOK.sinDato,
      soloLector: TEXTOS_GRADEBOOK.asignado,
      conRetraso: false,
    }
  }
  return { visible: TEXTOS_ESTADO_DE_ENTREGA[estado], soloLector: null, conRetraso: false }
}

const TEXTO_DE_MOTIVO: Readonly<Record<MotivoDeRiesgo, string>> = {
  promedio: TEXTOS_GRADEBOOK.motivoPromedio,
  vencidas: TEXTOS_GRADEBOOK.motivoVencidas,
}

// Los motivos de riesgo de una fila, en el orden del servidor.
export const textoDeMotivos = (motivos: readonly MotivoDeRiesgo[]): string =>
  motivos.map((motivo) => TEXTO_DE_MOTIVO[motivo]).join(TEXTOS_GRADEBOOK.separadorDeMotivos)

// S-14: relativos a la ruta de la clase, así sirven igual para el maestro, el admin y el alumno.
export const enlaceAEntregaDeAlumno = (tareaId: string, alumnoId: string): string =>
  `../tareas/${tareaId}/entregas/${alumnoId}`

export const enlaceATarea = (tareaId: string): string => `../tareas/${tareaId}`

export const VENTANAS_INICIALES: VentanasDelGradebook = {
  ventana: { cursor: null, cursorTareas: null },
  anterioresDeAlumnos: [],
  anterioresDeTareas: [],
}

// La pila de ventanas: avanzar guarda el cursor de esa dimensión en su pila; regresar lo saca. La otra
// dimensión no cambia.
export const ventanaSiguiente = (
  estado: VentanasDelGradebook,
  dimension: DimensionDelGradebook,
  siguienteCursor: string,
): VentanasDelGradebook => {
  if (dimension === "alumnos") {
    return {
      ...estado,
      ventana: { ...estado.ventana, cursor: siguienteCursor },
      anterioresDeAlumnos: [...estado.anterioresDeAlumnos, estado.ventana.cursor],
    }
  }
  return {
    ...estado,
    ventana: { ...estado.ventana, cursorTareas: siguienteCursor },
    anterioresDeTareas: [...estado.anterioresDeTareas, estado.ventana.cursorTareas],
  }
}

// Con la pila vacía no hay a dónde regresar: el estado no cambia (el botón tampoco se muestra).
export const ventanaAnterior = (
  estado: VentanasDelGradebook,
  dimension: DimensionDelGradebook,
): VentanasDelGradebook => {
  const pila = dimension === "alumnos" ? estado.anterioresDeAlumnos : estado.anterioresDeTareas
  const ultimo = pila.at(-1)
  if (ultimo === undefined) return estado
  const resto = pila.slice(0, -1)
  if (dimension === "alumnos") {
    return { ...estado, ventana: { ...estado.ventana, cursor: ultimo }, anterioresDeAlumnos: resto }
  }
  return {
    ...estado,
    ventana: { ...estado.ventana, cursorTareas: ultimo },
    anterioresDeTareas: resto,
  }
}

// La dimensión que mueve cada botón.
export const DIMENSION_DE_LA_ACCION: Readonly<Record<AccionDeVentana, DimensionDelGradebook>> = {
  "tareas-recientes": "tareas",
  "tareas-antiguas": "tareas",
  "alumnos-anteriores": "alumnos",
  "alumnos-siguientes": "alumnos",
}

// Enmienda 2 (§D-13.2): el 400 de un cursor que la vista reconoce. Decide por el prefijo exacto que
// lee campoDeErrorDeApi ("cursor:" en las dos vistas, más "cursorTareas:" en el gradebook), con
// cualquier mensaje después; no mira lo que se envió. CHORE-03 (§D-4): es la misma función de
// lib/errores-de-api.ts.
export const esErrorDeCursorDeCalificaciones = esErrorDeCursor

// Se perdió el acceso a la clase (o el id de la clase no sirve): reemplaza la vista.
export const esErrorDeSinAcceso = (error: unknown): boolean =>
  (esApiError(error) && error.codigo === "SIN_ACCESO_A_LA_CLASE") ||
  campoDeErrorDeApi(error) === "claseId"

// Un error con que apiClient ya redirigió: no se avisa.
export const errorQueRedirigeElCliente = (error: unknown): boolean =>
  esApiError(error) && CODIGOS_QUE_REDIRIGE_EL_CLIENTE.includes(error.codigo)

// Enmienda 2 (S-22): el texto de un error de consulta. El de "sin acceso" para la clase; para todo lo
// demás (un 400 fuera de contrato, un 5xx, un 503, la falta de conexión o un código desconocido), el
// respaldo del lugar. Nunca el texto que trae el servidor ni un trozo de él.
export const mensajeDeErrorCalificaciones = (error: unknown, respaldo: string): string => {
  if (esErrorDeSinAcceso(error)) return MENSAJES_ERROR_CALIFICACIONES.sinAcceso
  return respaldo
}

// CALIFICACIONES-02b (§D-4 a §D-7). Funciones puras de la exportación a Excel.

// Una ventana de la exportación: los dos tamaños siempre; cada cursor, solo si hay.
export const rutaDeExportacion = (
  claseId: string,
  ventana: VentanaDelGradebook,
  limites: LimitesDelGradebook,
): string => {
  const consulta = new URLSearchParams({
    limite: String(limites.limite),
    limiteTareas: String(limites.limiteTareas),
  })
  if (ventana.cursor !== null) consulta.set("cursor", ventana.cursor)
  if (ventana.cursorTareas !== null) consulta.set("cursorTareas", ventana.cursorTareas)
  return `${rutaDeLaClase(claseId)}/calificaciones/exportacion?${consulta.toString()}`
}

// M-03 y N-06: las respuestas que necesita la clase entera; al menos una por dimensión.
export const ventanasDeLaExportacion = (
  totalAlumnos: number,
  totalTareas: number,
  limite: number,
): number =>
  Math.max(1, Math.ceil(totalAlumnos / limite)) * Math.max(1, Math.ceil(totalTareas / limite))

// M-01: la única comparación de dos filas de la exportación (regla 4 de §D-4).
export const mismoAlumnoDeExportacion = (a: FilaDeExportacion, b: FilaDeExportacion): boolean =>
  a.alumno.id === b.alumno.id &&
  a.alumno.nombre === b.alumno.nombre &&
  a.alumno.email === b.alumno.email &&
  a.porcentaje === b.porcentaje

const CAMBIO: CombinacionDeExportacion = { tipo: "cambio" }

const mismasTareas = (a: readonly { id: string }[], b: readonly { id: string }[]): boolean =>
  a.length === b.length && a.every((tarea, i) => tarea.id === b[i]?.id)

const celdasAlineadas = (respuesta: ExportacionDeCalificacionesRespuesta): boolean =>
  respuesta.alumnos.every(
    (fila) =>
      fila.celdas.length === respuesta.tareas.length &&
      fila.celdas.every((celda, i) => celda.tareaId === respuesta.tareas[i]?.id),
  )

// De la más antigua a la más reciente (DH-04 a), con el id para los empates.
const compararColumnas = (a: ColumnaDelGradebook, b: ColumnaDelGradebook): number => {
  const diferencia = Date.parse(a.fechaLimite) - Date.parse(b.fechaLimite)
  if (diferencia !== 0) return diferencia
  if (a.id === b.id) return 0
  return a.id < b.id ? -1 : 1
}

// §D-4: junta las ventanas en una matriz o dice por qué no se puede. Las reglas van en orden.
export const combinarVentanasDeExportacion = (
  ventanas: readonly VentanaDeExportacion[],
): CombinacionDeExportacion => {
  const primera = ventanas[0]?.respuesta
  if (primera === undefined) return { tipo: "vacio" }

  // 1. La misma clase y los mismos totales en todas.
  const mismaClase = ventanas.every(
    ({ respuesta }) =>
      respuesta.clase.nombre === primera.clase.nombre &&
      respuesta.totalAlumnos === primera.totalAlumnos &&
      respuesta.totalTareas === primera.totalTareas,
  )
  if (!mismaClase) return CAMBIO

  const grupos = new Map<number, ExportacionDeCalificacionesRespuesta[]>()
  for (const { ventanaDeTareas, respuesta } of ventanas) {
    const grupo = grupos.get(ventanaDeTareas)
    if (grupo === undefined) grupos.set(ventanaDeTareas, [respuesta])
    else grupo.push(respuesta)
  }

  // N-07: cada grupo nace con su primera respuesta; sin ella, lanza en lugar de inventar tareas.
  const porVentana = [...grupos.values()].map((respuestas) => {
    const [primeraDeLaVentana] = respuestas
    if (primeraDeLaVentana === undefined)
      throw new Error("Una ventana de tareas no tiene respuestas")
    return {
      tareas: primeraDeLaVentana.tareas,
      respuestas,
      filas: respuestas.flatMap((respuesta) => respuesta.alumnos),
    }
  })

  // 2. Las mismas tareas dentro de cada ventana de tareas.
  const tareasEstables = porVentana.every(({ tareas, respuestas }) =>
    respuestas.every((respuesta) => mismasTareas(respuesta.tareas, tareas)),
  )
  if (!tareasEstables) return CAMBIO

  // 3. Cada celda en la columna de su tarea.
  if (!ventanas.every(({ respuesta }) => celdasAlineadas(respuesta))) return CAMBIO

  // 4. Los mismos alumnos, en el mismo orden, en cada ventana de tareas.
  const [ventanaDeReferencia] = porVentana
  if (ventanaDeReferencia === undefined) throw new Error("La exportación no tiene ventanas")
  const referencia = ventanaDeReferencia.filas
  const mismosAlumnos = porVentana.every(
    ({ filas }) =>
      filas.length === referencia.length &&
      filas.every((fila, i) => {
        const otra = referencia[i]
        return otra !== undefined && mismoAlumnoDeExportacion(fila, otra)
      }),
  )
  if (!mismosAlumnos) return CAMBIO

  // 5. Ninguna tarea en dos ventanas.
  const columnas = porVentana.flatMap(({ tareas }) => tareas)
  if (new Set(columnas.map((tarea) => tarea.id)).size !== columnas.length) return CAMBIO

  // 6. Los totales cuadran con lo recorrido.
  if (columnas.length !== primera.totalTareas || referencia.length !== primera.totalAlumnos) {
    return CAMBIO
  }

  // 7. Sin alumnos o sin tareas no hay nada que exportar.
  if (referencia.length === 0 || columnas.length === 0) return { tipo: "vacio" }

  // 8. La matriz, con las columnas de la más antigua a la más reciente.
  const ordenadas = [...columnas].sort(compararColumnas)
  const filas = referencia.map((fila, i) => {
    const celdaDe = new Map(
      porVentana.flatMap(({ filas: deLaVentana }) => {
        const celdas = deLaVentana[i]?.celdas
        if (celdas === undefined) throw new Error("Una ventana no tiene la fila del alumno")
        return celdas.map((celda) => [celda.tareaId, celda] as const)
      }),
    )
    // N-07: las reglas 3 a 5 garantizan una celda por columna; si faltara, lanza, como la fila.
    const celdas = ordenadas.map((columna) => {
      const celda = celdaDe.get(columna.id)
      if (celda === undefined) throw new Error("Una fila no tiene la celda de una columna")
      return celda
    })
    return { alumno: fila.alumno, celdas, porcentaje: fila.porcentaje }
  })
  return { tipo: "matriz", matriz: { clase: primera.clase.nombre, columnas: ordenadas, filas } }
}

const negrita = (valor: string): CeldaXlsx => ({ tipo: "texto", valor, negrita: true })
const VACIA: CeldaXlsx = { tipo: "vacia" }

// Una celda de la hoja: la calificación como número; sin calificar, el estado en palabras. Una forma
// que la base no admite lanza (Enmienda 1): nunca un valor inventado.
const celdaDeLaHoja = (
  celda: CeldaDelGradebook,
  columna: ColumnaDelGradebook,
  ahora: Date,
): CeldaXlsx => {
  if (celda.estado === "calificado" && celda.calificacion === null) {
    throw new Error("Una celda calificada no tiene calificación")
  }
  if (celda.estado === "calificado" && celda.calificacion !== null) {
    return { tipo: "numero", valor: celda.calificacion }
  }
  if (celda.calificacion !== null) throw new Error("Una celda sin calificar trae calificación")
  const estado = estadoDeEntregaVisible(celda, columna.fechaLimite, ahora)
  return { tipo: "texto", valor: TEXTOS_ESTADO_DE_ENTREGA[estado] }
}

// §D-5.2 (DH-04 a): tres filas de encabezado en negrita y una fila por alumno. M-01: es una de las
// tres declaraciones de la lista única de §D-5.2.
export const filasDeLaHojaDeExportacion = (
  matriz: MatrizDeExportacion,
  ahora: Date,
): CeldaXlsx[][] => {
  const { columnas } = matriz
  const encabezados: CeldaXlsx[][] = [
    [
      negrita(TEXTOS_EXPORTACION.alumno),
      negrita(TEXTOS_EXPORTACION.correo),
      ...columnas.map((columna) => negrita(columna.titulo)),
      negrita(TEXTOS_EXPORTACION.promedio),
    ],
    [
      negrita(TEXTOS_EXPORTACION.categoria),
      VACIA,
      ...columnas.map((columna) =>
        negrita(columna.categoria?.nombre ?? TEXTOS_EXPORTACION.sinCategoria),
      ),
      VACIA,
    ],
    [
      negrita(TEXTOS_EXPORTACION.puntos),
      VACIA,
      ...columnas.map((columna): CeldaXlsx => ({
        tipo: "numero",
        valor: columna.puntos,
        negrita: true,
      })),
      VACIA,
    ],
  ]
  const alumnos = matriz.filas.map((fila): CeldaXlsx[] => [
    { tipo: "texto", valor: fila.alumno.nombre },
    { tipo: "texto", valor: fila.alumno.email },
    ...fila.celdas.map((celda, i) => {
      const columna = columnas[i]
      if (columna === undefined) throw new Error("Una celda no tiene columna")
      return celdaDeLaHoja(celda, columna, ahora)
    }),
    fila.porcentaje === null
      ? { tipo: "texto", valor: TEXTOS_EXPORTACION.sinDato }
      : { tipo: "numero", valor: fila.porcentaje },
  ])
  return [...encabezados, ...alumnos]
}

// T-02: una matriz que no cabe lanza antes de armar sus filas, con el mismo criterio del recorrido.
export const hojaDeExportacion = (matriz: MatrizDeExportacion, ahora: Date): HojaXlsx => {
  if (!cabeEnUnaHoja(matriz.filas.length, matriz.columnas.length)) {
    throw new Error("La hoja no cabe en los topes de Excel")
  }
  return {
    nombre: TEXTOS_EXPORTACION.hoja,
    filas: filasDeLaHojaDeExportacion(matriz, ahora),
    anchos: [
      ANCHOS_DE_LA_EXPORTACION.primeraColumna,
      ANCHOS_DE_LA_EXPORTACION.segundaColumna,
      ...matriz.columnas.map(() => ANCHOS_DE_LA_EXPORTACION.tarea),
      ANCHOS_DE_LA_EXPORTACION.promedio,
    ],
    inmovilizar: { ...INMOVILIZADO_DE_LA_EXPORTACION },
  }
}

// §D-6: los de control (C0, DEL y C1) y los de formato de dirección, que podrían disfrazar la
// extensión, pasan a espacio. Se comparan puntos de código.
const esCaracterQueSeQuitaDelNombre = (punto: number): boolean =>
  punto <= 0x1f ||
  (punto >= 0x7f && punto <= 0x9f) ||
  punto === 0x061c ||
  punto === 0x200e ||
  punto === 0x200f ||
  (punto >= 0x202a && punto <= 0x202e) ||
  (punto >= 0x2066 && punto <= 0x2069)

const sinPuntosNiEspaciosAlFinal = (texto: string): string => texto.replace(/[. ]+$/, "")

const dosDigitos = (n: number): string => String(n).padStart(2, "0")

// T-01 (DH-03 a): hasta 80 puntos de código sin partir nunca un grafema (una bandera, una familia con
// ZWJ, una tecla con número o un tono de piel). El primer grafema que no cabe se descarta entero con
// lo que sigue. Sin Intl.Segmenter (Firefox anterior a 125) se recorta por puntos de código, que no
// parte un par sustituto: un detalle del nombre nunca hace fallar la exportación.
const recortarSinPartirGrafemas = (texto: string): string => {
  const Segmentador = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter
  if (Segmentador === undefined) {
    return Array.from(texto).slice(0, LARGO_MAXIMO_DE_LA_CLASE_EN_EL_ARCHIVO).join("")
  }
  let recortado = ""
  let puntos = 0
  for (const { segment } of new Segmentador(undefined, { granularity: "grapheme" }).segment(
    texto,
  )) {
    const largo = Array.from(segment).length
    if (puntos + largo > LARGO_MAXIMO_DE_LA_CLASE_EN_EL_ARCHIVO) break
    recortado += segment
    puntos += largo
  }
  return recortado
}

// T-02 (M-03): la hoja cabe en los topes de Excel: las tareas más las columnas fijas, y los alumnos
// más las filas de encabezado.
export const cabeEnUnaHoja = (totalAlumnos: number, totalTareas: number): boolean =>
  totalTareas + COLUMNAS_FIJAS_DE_LA_HOJA <= MAXIMO_DE_COLUMNAS_XLSX &&
  totalAlumnos + INMOVILIZADO_DE_LA_EXPORTACION.filas <= MAXIMO_DE_FILAS_XLSX

// §D-6 (DH-03 a): el nombre del archivo, con la fecha local del clic.
export const nombreDelArchivoDeExportacion = (clase: string, ahora: Date): string => {
  const fecha = [
    String(ahora.getFullYear()),
    dosDigitos(ahora.getMonth() + 1),
    dosDigitos(ahora.getDate()),
  ].join("-")
  const conEspacios = Array.from(clase.replace(RESERVADOS_DEL_NOMBRE_DE_ARCHIVO, " "))
    .map((caracter) => {
      const punto = caracter.codePointAt(0)
      return punto !== undefined && esCaracterQueSeQuitaDelNombre(punto) ? " " : caracter
    })
    .join("")
  const limpio = sinPuntosNiEspaciosAlFinal(conEspacios.replace(/ +/g, " ").replace(/^ +/, ""))
  const recortado = sinPuntosNiEspaciosAlFinal(recortarSinPartirGrafemas(limpio))
  const prefijo = TEXTOS_EXPORTACION.prefijoDelArchivo
  if (recortado.length === 0) return `${prefijo} - ${fecha}.xlsx`
  return `${prefijo} - ${recortado} - ${fecha}.xlsx`
}

// §D-7: el texto de un error de la exportación. El 400 de un cursor es que la clase cambió; lo demás,
// el de sin acceso o el genérico. Nunca el texto del servidor (DH-12 a).
export const mensajeDeErrorDeExportacion = (error: unknown): string => {
  if (esErrorDeCursorDeCalificaciones(error, CAMPOS_DE_CURSOR_DEL_GRADEBOOK)) {
    return MENSAJES_ERROR_EXPORTACION.cambio
  }
  return mensajeDeErrorCalificaciones(error, MENSAJES_ERROR_EXPORTACION.generico)
}

// §D-7: el aviso de cada resultado; ninguno si se canceló.
export const avisoDelResultadoDeExportacion = (
  resultado: ResultadoDeLaExportacion,
): AvisoDeLaExportacion | null => {
  if (resultado.tipo === "descargado") {
    return { tipo: "exito", texto: TEXTOS_EXPORTACION.listo(resultado.nombre) }
  }
  if (resultado.tipo === "cancelado") return null
  return { tipo: "error", texto: MENSAJES_ERROR_EXPORTACION[resultado.tipo] }
}
