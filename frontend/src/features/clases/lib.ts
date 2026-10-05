import {
  estadoDeTerminoDeBusqueda,
  MAXIMO_ADJUNTOS_POR_PUBLICACION,
  TAMANO_MAXIMO_ARCHIVO_BYTES,
  TIPOS_DE_ARCHIVO_PERMITIDOS,
} from "@campus/shared"

import { esApiError } from "@/services/apiClient"

import {
  CAPACIDADES_POR_PERSPECTIVA,
  CODIGOS_CON_MENSAJE_DEL_SERVIDOR,
  MARGEN_DE_VISTA_PREVIA_MS,
  MENSAJES_ERROR_CLASES_GENERALES,
  TEXTOS_ADJUNTOS,
  TEXTOS_CLASE,
  TEXTOS_INICIO_ESTUDIANTE,
  TEXTOS_INICIO_MAESTRO,
  TEXTOS_TARJETA,
  TEXTOS_UNIRSE,
  TIEMPO_FRESCO_DEL_MURO_MS,
} from "./data"
import type {
  ArchivoCandidato,
  PaginaDelMuro,
  ErroresFormulario,
  IncidenciaValidacion,
  Perspectiva,
  RolDeClases,
  SeccionDeClase,
  VarianteDeClase,
} from "./types"

// §D-2C1: la perspectiva sale del prefijo exacto de la ruta (/estudiante, /maestro o /admin, solo o
// seguido de "/"). Un prefijo parecido (/maestros, /administrador) o cualquier otra ruta da
// "estudiante", la perspectiva que menos muestra; el backend decide de todas formas.
export const perspectivaDeRuta = (pathname: string): Perspectiva => {
  for (const perspectiva of ["maestro", "admin"] as const) {
    const base = `/${perspectiva}`
    if (pathname === base || pathname.startsWith(`${base}/`)) return perspectiva
  }
  return "estudiante"
}

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
  const sinBarraFinal = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname
  return secciones.findIndex(({ segmento }) => {
    const destino = segmento === "" ? base : `${base}/${segmento}`
    if (segmento === "") return sinBarraFinal === destino
    return sinBarraFinal === destino || sinBarraFinal.startsWith(`${destino}/`)
  })
}

// La ruta base de las secciones de una clase para una perspectiva.
export const baseDeClase = (perspectiva: Perspectiva, claseId: string): string =>
  `${CAPACIDADES_POR_PERSPECTIVA[perspectiva].base}/${claseId}`

// "Creada" en la tabla de clases del administrador: fecha corta en la zona local.
export const formatearFechaDeClase = (iso: string): string => {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return iso
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(fecha)
}

// S-06: variante determinista a partir del id de la clase (UUID), sin guardarse ni elegirse. La
// suma de los puntos de código módulo 3 reparte entre las tres variantes.
export const varianteDeClase = (claseId: string): VarianteDeClase => {
  let suma = 0
  for (const caracter of claseId) suma += caracter.codePointAt(0) ?? 0
  const variantes: VarianteDeClase[] = ["verde", "azul", "blanca"]
  return variantes[suma % 3] ?? "blanca"
}

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
  ARCHIVO_NO_SUBIDO: MENSAJES_ERROR_CLASES_GENERALES.archivoNoSubido,
  ARCHIVO_INVALIDO: MENSAJES_ERROR_CLASES_GENERALES.archivoInvalido,
  ALMACEN_NO_CONFIGURADO: MENSAJES_ERROR_CLASES_GENERALES.almacenNoDisponible,
  ALMACEN_NO_DISPONIBLE: MENSAJES_ERROR_CLASES_GENERALES.almacenNoDisponible,
}

// T-17 (ronda 2 del tester): el mensaje de un VALIDACION del servidor lleva el nombre técnico del
// campo como prefijo ("descripcion: No puede tener más de 2000 caracteres"), porque el cliente y el
// servidor comparten el mismo esquema de shared/. Ese prefijo nunca es para la persona que usa la
// interfaz (ni siquiera cuando el campo no es uno de un formulario, como claseId).
const PREFIJO_DE_CAMPO = /^([a-zA-Z_]+):\s*/

const quitarPrefijoDeCampo = (mensaje: string): string => mensaje.replace(PREFIJO_DE_CAMPO, "")

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

// T-17 (ronda 2 del tester): el nombre de campo que trae el prefijo técnico del mensaje, o null si
// el error no es un VALIDACION con esa forma.
const campoDeErrorClases = (error: unknown): string | null => {
  if (!esApiError(error) || error.codigo !== "VALIDACION") return null
  const coincidencia = PREFIJO_DE_CAMPO.exec(error.message)
  return coincidencia ? (coincidencia[1] ?? null) : null
}

// T-34: el 400 "cursor: no es válido" de "Ver más" (el cursor ya no existe) no es un texto para la
// persona: en su lugar se muestra `textoDelCursor`, que dice qué pasó y qué hacer. Cualquier otro
// error sigue pasando por mensajeDeErrorClases.
export const mensajeDeErrorDeLista = (error: unknown, textoDelCursor: string): string => {
  if (campoDeErrorClases(error) === "cursor") return textoDelCursor
  return mensajeDeErrorClases(error)
}

// El 400 "cursor: no es válido" de una lista paginada (la fila del cursor ya no existe).
export const esErrorDeCursor = (error: unknown): boolean => campoDeErrorClases(error) === "cursor"

// T-19 (ronda 3 del tester): un error que no es de un campo (500, sin conexión, SIN_ACCESO_A_LA_CLASE
// al editar) no es un VALIDACION con el prefijo técnico de un campo, así que no debe marcar ningún
// campo como inválido: es un error del formulario, no de un campo (CLAUDE.md, "Manejo de errores en
// el frontend"). Devuelve el error asociado al campo del formulario que nombra el VALIDACION del
// servidor, o `null` si el error no encaja en ninguno de `camposValidos` (porque no es VALIDACION,
// o porque nombra un campo que ese formulario no tiene); en ese caso, cada formulario decide qué
// hacer con el error (un aviso del formulario, o su propio error de dominio, como CODIGO_INVALIDO
// en "Unirme a la clase").
export const erroresDeFormularioClases = (
  error: unknown,
  camposValidos: readonly string[],
): ErroresFormulario | null => {
  if (!esApiError(error) || error.codigo !== "VALIDACION") return null
  const campo = campoDeErrorClases(error)
  if (campo === null || !camposValidos.includes(campo)) return null
  return { [campo]: mensajeDeErrorClases(error) }
}

// Primer mensaje de cada campo a partir de las incidencias de safeParse de un esquema de shared/.
export const erroresPorCampo = (
  incidencias: readonly IncidenciaValidacion[],
): ErroresFormulario => {
  const errores: ErroresFormulario = {}
  for (const incidencia of incidencias) {
    const campo = incidencia.path[0]
    if (typeof campo !== "string" || errores[campo] !== undefined) continue
    errores[campo] = incidencia.message
  }
  return errores
}

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

const extensionDe = (nombre: string): string => {
  const punto = nombre.lastIndexOf(".")
  if (punto < 0) return ""
  return nombre.slice(punto + 1).toLowerCase()
}

// Algunos sistemas no informan el tipo de un archivo (File.type vacío): se infiere por la extensión,
// con la misma tabla que usa el servidor. "" si no se reconoce.
export const tipoDeArchivo = (archivo: Pick<ArchivoCandidato, "name" | "type">): string => {
  if (archivo.type !== "") return archivo.type
  const extension = extensionDe(archivo.name)
  const entrada = Object.entries(TIPOS_DE_ARCHIVO_PERMITIDOS).find(([, extensiones]) =>
    extensiones.includes(extension),
  )
  return entrada?.[0] ?? ""
}

// §D-D5: la misma política del servidor, antes de pedirle una URL de subida. `yaElegidos` es el
// número de archivos que ya estaban en la lista. null: el archivo se puede agregar.
export const errorDeArchivoElegido = (
  archivo: ArchivoCandidato,
  yaElegidos: number,
): string | null => {
  if (archivo.size > TAMANO_MAXIMO_ARCHIVO_BYTES)
    return TEXTOS_ADJUNTOS.errorPesaMucho(archivo.name)
  const tipo = tipoDeArchivo(archivo)
  const extensiones = Object.hasOwn(TIPOS_DE_ARCHIVO_PERMITIDOS, tipo)
    ? TIPOS_DE_ARCHIVO_PERMITIDOS[tipo]
    : undefined
  if (extensiones === undefined || !extensiones.includes(extensionDe(archivo.name))) {
    return TEXTOS_ADJUNTOS.errorTipo(archivo.name)
  }
  if (yaElegidos >= MAXIMO_ADJUNTOS_POR_PUBLICACION) return TEXTOS_ADJUNTOS.errorCantidad
  return null
}

// T-40 (§D-D5): cuánto tiempo se considera fresco el muro cargado. Las vistas previas son URL firmadas
// que vencen; el muro se vuelve viejo MARGEN_DE_VISTA_PREVIA_MS antes del `expiraEn` más temprano de
// todas las páginas cargadas, medido desde `dataUpdatedAt` (que se renueva con cada página). Con un
// vencimiento ya pasado da 0; sin vistas previas, el valor de siempre.
export const tiempoFrescoDelMuro = (
  paginas: readonly PaginaDelMuro[],
  dataUpdatedAt: number,
): number => {
  const vencimientos = paginas
    .flatMap((pagina) => pagina.publicaciones)
    .flatMap((publicacion) => publicacion.adjuntos)
    .flatMap((adjunto) =>
      adjunto.vistaPrevia === null ? [] : [Date.parse(adjunto.vistaPrevia.expiraEn)],
    )
    .filter((vencimiento) => !Number.isNaN(vencimiento))
  if (vencimientos.length === 0) return TIEMPO_FRESCO_DEL_MURO_MS
  const primero = Math.min(...vencimientos)
  return Math.max(0, primero - MARGEN_DE_VISTA_PREVIA_MS - dataUpdatedAt)
}

// T-41: una solicitud rechazada (ApiError) dice qué archivo y por qué; con ARCHIVO_INVALIDO el motivo es
// el mensaje del servidor (ya en español y sin valores). Un fallo del PUT al almacén no es un
// ApiError: conserva el texto de siempre.
export const avisoDeFalloAlSubir = (error: unknown, nombre: string): string => {
  if (!esApiError(error)) return TEXTOS_ADJUNTOS.errorSubida(nombre)
  const motivo = error.codigo === "ARCHIVO_INVALIDO" ? error.message : mensajeDeErrorClases(error)
  return TEXTOS_ADJUNTOS.errorRechazado(nombre, motivo)
}
