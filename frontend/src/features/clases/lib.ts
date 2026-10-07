import { estadoDeTerminoDeBusqueda } from "@campus/shared"

import { MENSAJES_POR_CODIGO_DE_ARCHIVO } from "@/components/adjuntos/data"
import {
  avisoDeFalloAlSubir as avisoDeFalloAlSubirCompartido,
  tiempoFrescoDeAdjuntos,
} from "@/components/adjuntos/lib"
import {
  campoDeErrorDeApi,
  erroresDeFormularioDeApi,
  quitarPrefijoDeCampo,
} from "@/lib/errores-de-api"
import { esApiError } from "@/services/apiClient"

import {
  CODIGOS_CON_MENSAJE_DEL_SERVIDOR,
  MENSAJES_ERROR_CLASES_GENERALES,
  TEXTOS_CLASE,
  TEXTOS_INICIO_ESTUDIANTE,
  TEXTOS_INICIO_MAESTRO,
  TEXTOS_PERSONAS,
  TEXTOS_TARJETA,
  TEXTOS_UNIRSE,
  TIEMPO_FRESCO_DEL_MURO_MS,
} from "./data"
import type { PaginaDelMuro, ErroresFormulario, RolDeClases, SeccionDeClase } from "./types"

// TAREAS-01c (§D-9): la perspectiva de una ruta y la base de una clase viven en lib/ruta-de-clase.ts.
export { baseDeClase, perspectivaDeRuta } from "@/lib/ruta-de-clase"

// §D-2D2: el título de la sección de maestros de "Personas".
export const etiquetaDeMaestros = (total: number): string =>
  total === 1 ? TEXTOS_PERSONAS.maestro : TEXTOS_PERSONAS.maestros

// "A" con uno, "A y B" con dos: los metadatos de las tarjetas y el encabezado de la clase.
export const unirNombres = (nombres: readonly string[]): string => nombres.join(" y ")

// §D-2C1: "Maestro: A" con uno y "Maestros: A y B" con dos.
export const textoDeMaestros = (nombres: readonly string[]): string => {
  if (nombres.length === 1) return TEXTOS_CLASE.maestro(unirNombres(nombres))
  return TEXTOS_CLASE.maestros(unirNombres(nombres))
}

// Índice de la sección activa de una clase según la ruta, o -1 si ninguna lo está (por ejemplo,
// /editar). El muro (segmento "") solo está activo en la base exacta.
export const indiceDeSeccionActiva = (
  pathname: string,
  base: string,
  secciones: readonly SeccionDeClase[],
): number => {
  // M-12 (02d): sin distinguir mayúsculas, como el router y perspectivaDeRuta (O-06). Con la ruta en
  // mayúsculas NavLink marca el enlace activo, y el indicador también debe aparecer.
  const ruta = pathname.toLowerCase()
  const sinBarraFinal = ruta.length > 1 ? ruta.replace(/\/+$/, "") : ruta
  return secciones.findIndex(({ segmento }) => {
    const destino = (segmento === "" ? base : `${base}/${segmento}`).toLowerCase()
    if (segmento === "") return sinBarraFinal === destino
    return sinBarraFinal === destino || sinBarraFinal.startsWith(`${destino}/`)
  })
}

// "Creada" en la tabla de clases del administrador: fecha corta en la zona local.
export const formatearFechaDeClase = (iso: string): string => {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return iso
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(fecha)
}

// A-6 de CLASES-02: la variante de color vive en lib/ porque la usan también la lista de la barra.
export { varianteDeClase } from "@/lib/variante-de-clase"

const textosPorRol = (rol: RolDeClases) =>
  rol === "estudiante" ? TEXTOS_INICIO_ESTUDIANTE : TEXTOS_INICIO_MAESTRO

export const titularInicio = (rol: RolDeClases, total: number): string => {
  const textos = textosPorRol(rol)
  if (total === 0) return textos.titularSinClases
  if (total === 1) return textos.titularUnaClase
  return textos.titularVariasClases(total)
}

export const siguientePasoInicio = (rol: RolDeClases, total: number): string => {
  const textos = textosPorRol(rol)
  return total === 0 ? textos.siguientePasoSinClases : textos.siguientePasoConClases
}

export const textoConteoAlumnos = (n: number): string => {
  if (n === 0) return TEXTOS_TARJETA.sinAlumnos
  if (n === 1) return TEXTOS_TARJETA.unAlumno
  return TEXTOS_TARJETA.variosAlumnos(n)
}

// §D-B5, T-24: el frontend decide con el mismo criterio que el servidor (estadoDeTerminoDeBusqueda,
// de shared/): un término se pregunta solo si, normalizado, mide de 3 a 120 caracteres. Lo que se
// envía es el texto tal cual y el servidor lo normaliza.
export const terminoDeBusquedaValido = (termino: string): boolean =>
  estadoDeTerminoDeBusqueda(termino) === "valido"

// El término es demasiado largo para el servidor (T-24): se avisa y no se pregunta.
export const terminoDeBusquedaMuyLargo = (termino: string): boolean =>
  estadoDeTerminoDeBusqueda(termino) === "largo"

// true si el foco se perdió: ningún elemento, <body> o uno que ya no está en el documento. Recibe el
// documento en lugar de leer el global, así que es pura respecto de su entrada (§D-C5 bis).
export const focoPerdido = (documento: Pick<Document, "activeElement" | "body">): boolean => {
  const activo = documento.activeElement
  return activo === null || activo === documento.body || !activo.isConnected
}

// N-03 (ronda 4 del manager): los dos textos fijos viven en data.ts, no aquí (regla 2 de CLAUDE.md).
const MENSAJES_ERROR_CLASES: Record<string, string> = {
  CODIGO_INVALIDO: TEXTOS_UNIRSE.codigoInvalido,
  SIN_ACCESO_A_LA_CLASE: MENSAJES_ERROR_CLASES_GENERALES.sinAccesoALaClase,
  ALUMNO_NO_ENCONTRADO: MENSAJES_ERROR_CLASES_GENERALES.alumnoNoEncontrado,
  PUBLICACION_NO_ENCONTRADA: MENSAJES_ERROR_CLASES_GENERALES.publicacionNoEncontrada,
  COMENTARIO_NO_ENCONTRADO: MENSAJES_ERROR_CLASES_GENERALES.comentarioNoEncontrado,
  // TAREAS-01c (§D-9): los cuatro códigos de error de archivos vienen de components/adjuntos/data.ts.
  ...MENSAJES_POR_CODIGO_DE_ARCHIVO,
}

// T-11 (ronda 1 del tester): un claseId con una forma inválida en la URL responde 400 VALIDACION
// con el nombre técnico del parámetro ("claseId: debe ser un identificador válido"). El mismo
// mensaje de SIN_ACCESO_A_LA_CLASE (S-08: la misma respuesta visible para lo que no existe) evita
// mostrar ese texto interno. Los demás VALIDACION (nombre, descripcion, codigo de un formulario)
// muestran el mensaje del servidor sin el prefijo técnico del campo (T-17).
export const mensajeDeErrorClases = (error: unknown): string => {
  if (!esApiError(error)) return MENSAJES_ERROR_CLASES_GENERALES.generico
  // CLASES-02c: los errores de maestros y de autoría llegan con su mensaje en español.
  if (CODIGOS_CON_MENSAJE_DEL_SERVIDOR.includes(error.codigo)) return error.message
  if (error.codigo === "VALIDACION") {
    if (error.message.startsWith("claseId:"))
      return MENSAJES_ERROR_CLASES_GENERALES.sinAccesoALaClase
    return quitarPrefijoDeCampo(error.message)
  }
  return MENSAJES_ERROR_CLASES[error.codigo] ?? MENSAJES_ERROR_CLASES_GENERALES.generico
}

// T-34: el 400 "cursor: no es válido" de "Ver más" (el cursor ya no existe) no es un texto para la
// persona: en su lugar se muestra `textoDelCursor`, que dice qué pasó y qué hacer. Cualquier otro
// error sigue pasando por mensajeDeErrorClases.
export const mensajeDeErrorDeLista = (error: unknown, textoDelCursor: string): string => {
  if (campoDeErrorDeApi(error) === "cursor") return textoDelCursor
  return mensajeDeErrorClases(error)
}

// TAREAS-01c (§D-9): erroresPorCampo y esErrorDeCursor viven en lib/errores-de-api.ts; la versión
// compartida de erroresDeFormularioClases recibe los mensajes de cada módulo, y este envoltorio
// conserva el nombre, la firma y la salida de siempre (T-19: un error que no es de un campo da null).
export { erroresPorCampo, esErrorDeCursor } from "@/lib/errores-de-api"

export const erroresDeFormularioClases = (
  error: unknown,
  camposValidos: readonly string[],
): ErroresFormulario | null => erroresDeFormularioDeApi(error, camposValidos, mensajeDeErrorClases)

// N-04 (ronda 4 de CLASES-a, §D-B4 bis): en "Unirme a la clase" solo CODIGO_INVALIDO y un VALIDACION
// de "codigo" son errores del campo del código. Cualquier otro (un 500, "sin conexión",
// ACCESO_RESTRINGIDO) devuelve null y el formulario avisa con un toast, sin marcar el campo: es el
// mismo patrón que T-19 en FormularioClase.
export const errorDelCampoCodigo = (error: unknown): ErroresFormulario | null => {
  if (esApiError(error) && error.codigo === "CODIGO_INVALIDO") {
    return { codigo: mensajeDeErrorClases(error) }
  }
  return erroresDeFormularioClases(error, ["codigo"])
}

// DESIGN.md §7.14: cuando la fila con el foco sale de la lista, el foco va a la fila que ocupa su
// lugar (la siguiente o, si era la última, la anterior). `previos` son los ids del render anterior;
// undefined si la lista no estaba cargada. Sin filas, no hay vecina y el foco va al encabezado.
export const vecinaDeFila = (
  previos: string[] | undefined,
  actuales: string[],
  id: string,
): string | undefined => {
  if (actuales.length === 0) return undefined
  const indice = previos?.indexOf(id) ?? actuales.indexOf(id)
  return actuales[Math.min(Math.max(indice, 0), actuales.length - 1)]
}

// TAREAS-01c (§D-9): tipoDeArchivo y errorDeArchivoElegido viven en components/adjuntos/lib.ts.
export { errorDeArchivoElegido, tipoDeArchivo } from "@/components/adjuntos/lib"

// T-40 (§D-D5): cuánto tiempo se considera fresco el muro cargado. El cálculo vive en
// components/adjuntos/lib.ts (tiempoFrescoDeAdjuntos); aquí solo se juntan los adjuntos de todas las
// páginas cargadas.
export const tiempoFrescoDelMuro = (
  paginas: readonly PaginaDelMuro[],
  dataUpdatedAt: number,
): number =>
  tiempoFrescoDeAdjuntos(
    paginas
      .flatMap((pagina) => pagina.publicaciones)
      .flatMap((publicacion) => publicacion.adjuntos),
    dataUpdatedAt,
    TIEMPO_FRESCO_DEL_MURO_MS,
  )

// T-41: el aviso de un fallo al subir vive en components/adjuntos/lib.ts, con los mensajes de cada
// módulo como parámetro; este envoltorio conserva el nombre, la firma y la salida de siempre.
export const avisoDeFalloAlSubir = (error: unknown, nombre: string): string =>
  avisoDeFalloAlSubirCompartido(error, nombre, mensajeDeErrorClases)
