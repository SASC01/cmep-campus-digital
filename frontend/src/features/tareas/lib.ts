import { crearTareaSchema, normalizarTextoLargo } from "@campus/shared"

import { erroresDeFormularioDeApi, quitarPrefijoDeCampo } from "@/lib/errores-de-api"
import { esApiError } from "@/services/apiClient"

import {
  CAMPO_DE_CADA_CODIGO,
  CAMPOS_DEL_FORMULARIO,
  CODIGOS_CON_MENSAJE_DEL_SERVIDOR,
  MENSAJES_ERROR_TAREAS,
  MENSAJES_POR_CODIGO_DE_TAREAS,
  PUNTOS_PROPUESTOS,
  TEXTOS_FORMULARIO_TAREA,
} from "./data"
import type {
  CriterioDelFormulario,
  ErroresFormulario,
  EstadoDelFormulario,
  IncidenciaValidacion,
  MomentoDeLaConsulta,
  ResultadoDelCuerpo,
  TareaDetalle,
} from "./types"

const dosDigitos = (n: number): string => String(n).padStart(2, "0")

// `datetime-local` da "2026-10-06T14:30" sin zona: es la hora del navegador (RNF-07). Se manda al
// servidor en UTC ISO 8601 (regla 7). Una cadena vacía o que no es una fecha da "", que el esquema
// rechaza con "Elige la fecha límite".
export const fechaLocalAIso = (valor: string): string => {
  if (valor.trim() === "") return ""
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return ""
  return fecha.toISOString()
}

// Lo contrario, para cargar una tarea en el formulario: la fecha UTC del servidor, en la hora local
// del navegador y con la forma que pide `datetime-local`.
export const isoAFechaLocal = (iso: string): string => {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return ""
  const dia = `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`
  return `${dia}T${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`
}

// Un entero escrito en un campo: solo dígitos. Cualquier otra cosa ("10,5", "1e3", "-0", "") da NaN
// y el esquema la rechaza con su mensaje (los puntos nunca se coaccionan desde texto).
const aEntero = (texto: string): number => {
  const limpio = texto.trim()
  return /^\d+$/.test(limpio) ? Number(limpio) : Number.NaN
}

// La suma en vivo de la rúbrica: cuenta solo los puntos que ya son un entero válido.
export const totalDeRubrica = (criterios: readonly { puntosMax: string }[]): number =>
  criterios.reduce((suma, { puntosMax }) => {
    const puntos = aEntero(puntosMax)
    return Number.isNaN(puntos) ? suma : suma + puntos
  }, 0)

// Los puntos de la tarea para la frase "se escala a los N puntos": null si todavía no son válidos.
export const puntosDeLaTarea = (texto: string): number | null => {
  const puntos = aEntero(texto)
  return Number.isNaN(puntos) || puntos < 1 ? null : puntos
}

// Primer mensaje de cada campo a partir de las incidencias de safeParse de crearTareaSchema; la clave
// es la ruta completa ("rubrica.0.criterio" es el criterio de la primera fila).
const erroresDeLaRuta = (incidencias: readonly IncidenciaValidacion[]): ErroresFormulario => {
  const errores: ErroresFormulario = {}
  for (const incidencia of incidencias) {
    const clave = incidencia.path.map(String).join(".")
    if (clave === "" || errores[clave] !== undefined) continue
    errores[clave] = incidencia.message
  }
  return errores
}

// Arma el cuerpo de una tarea con lo escrito y lo valida con el mismo esquema del servidor
// (crearTareaSchema) antes de enviar. Además, con categorías en la clase y sin una elegida, el error
// de `categoriaId` "Elige la categoría de la tarea.": la misma regla que core.validarCategoriaRequerida
// (P-01 a); el navegador nunca elige una categoría en silencio. Los archivos no entran: se suben
// después y sus ids se agregan a `archivoIds`.
export const cuerpoDeTarea = (
  estado: EstadoDelFormulario,
  categoriasEnLaClase: number,
): ResultadoDelCuerpo => {
  const resultado = crearTareaSchema.safeParse({
    titulo: normalizarTextoLargo(estado.titulo),
    instrucciones: normalizarTextoLargo(estado.instrucciones),
    fechaLimite: fechaLocalAIso(estado.fechaLimite),
    puntos: aEntero(estado.puntos),
    aceptaTardias: estado.aceptaTardias,
    requiereAdjuntos: estado.requiereAdjuntos,
    categoriaId: estado.categoriaId === "" ? null : estado.categoriaId,
    temaId: estado.temaId === "" ? null : estado.temaId,
    rubrica: estado.rubrica.map(({ criterio, puntosMax }) => ({
      criterio: normalizarTextoLargo(criterio),
      puntosMax: aEntero(puntosMax),
    })),
    archivoIds: [],
  })
  const errores = resultado.success ? {} : erroresDeLaRuta(resultado.error.issues)
  if (categoriasEnLaClase > 0 && estado.categoriaId === "") {
    errores.categoriaId = TEXTOS_FORMULARIO_TAREA.categoriaRequerida
  }
  if (!resultado.success || Object.keys(errores).length > 0) return { ok: false, errores }
  return { ok: true, datos: resultado.data }
}

// T-06: un VALIDACION del servidor por una fila de la rúbrica lleva "rubrica.<índice>.<campo>: mensaje"
// (el índice de la fila en el envío). El prefijo de campo genérico no lo reconoce porque lleva puntos y
// dígitos.
const PREFIJO_DE_FILA = /^rubrica\.(\d+)\.(criterio|puntosMax):\s*/

// §D-8: el mensaje de un error de la API en español. Los de TAREAS y los de archivos tienen su texto
// fijo; los de autoría y de servicio ocupado ya vienen en español del servidor; un VALIDACION lleva el
// nombre técnico del campo como prefijo, que nunca es para la persona (el de claseId o tareaId dice lo
// mismo que un acceso o una tarea inexistente). Sin conexión, o cualquier otro, el aviso genérico.
export const mensajeDeErrorTareas = (error: unknown): string => {
  if (!esApiError(error)) return MENSAJES_ERROR_TAREAS.generico
  if (Object.hasOwn(MENSAJES_POR_CODIGO_DE_TAREAS, error.codigo)) {
    return MENSAJES_POR_CODIGO_DE_TAREAS[error.codigo] ?? MENSAJES_ERROR_TAREAS.generico
  }
  if (CODIGOS_CON_MENSAJE_DEL_SERVIDOR.includes(error.codigo)) return error.message
  if (error.codigo === "VALIDACION") {
    if (error.message.startsWith("claseId:")) return MENSAJES_ERROR_TAREAS.sinAccesoALaClase
    if (error.message.startsWith("tareaId:")) return MENSAJES_ERROR_TAREAS.tareaNoEncontrada
    return quitarPrefijoDeCampo(error.message.replace(PREFIJO_DE_FILA, ""))
  }
  return MENSAJES_ERROR_TAREAS.generico
}

// El error de un campo del formulario que dice el servidor: por su código (fecha, categoría o tema) o
// por el prefijo de campo de un VALIDACION. null si el error no es de ningún campo: ese lo avisa un
// toast (T-19, CLAUDE.md "Manejo de errores en el frontend").
export const erroresDeLaTareaDeApi = (error: unknown): ErroresFormulario | null => {
  if (!esApiError(error)) return null
  const fila = error.codigo === "VALIDACION" ? PREFIJO_DE_FILA.exec(error.message) : null
  if (fila) return { [`rubrica.${fila[1]}.${fila[2]}`]: mensajeDeErrorTareas(error) }
  if (Object.hasOwn(CAMPO_DE_CADA_CODIGO, error.codigo)) {
    const campo = CAMPO_DE_CADA_CODIGO[error.codigo]
    if (campo !== undefined) return { [campo]: mensajeDeErrorTareas(error) }
  }
  return erroresDeFormularioDeApi(error, CAMPOS_DEL_FORMULARIO, mensajeDeErrorTareas)
}

// La llave local de un criterio: estable aunque se quiten criterios de en medio (el servidor aún no le
// da id), así React conserva lo escrito en cada fila.
let contadorDeLlaves = 0
const nuevaLlaveDeCriterio = (): string => {
  contadorDeLlaves += 1
  return `criterio-${contadorDeLlaves}`
}

export const criterioVacio = (): CriterioDelFormulario => ({
  llave: nuevaLlaveDeCriterio(),
  criterio: "",
  puntosMax: "",
})

// Lo que el formulario muestra al abrirse: una tarea nueva con los puntos propuestos (S-03) o los
// valores de la tarea que se edita (la fecha, en la hora local del navegador; una tarea sin categoría
// carga con categoriaId "" y el selector pide elegir una si la clase ya tiene).
export const estadoInicialDelFormulario = (tarea: TareaDetalle | null): EstadoDelFormulario => {
  if (tarea === null) {
    return {
      titulo: "",
      instrucciones: "",
      fechaLimite: "",
      puntos: String(PUNTOS_PROPUESTOS),
      categoriaId: "",
      temaId: "",
      aceptaTardias: true,
      requiereAdjuntos: true,
      rubrica: [],
    }
  }
  return {
    titulo: tarea.titulo,
    instrucciones: tarea.instrucciones,
    fechaLimite: isoAFechaLocal(tarea.fechaLimite),
    puntos: String(tarea.puntos),
    categoriaId: tarea.categoria === null ? "" : tarea.categoria.id,
    temaId: tarea.tema === null ? "" : tarea.tema.id,
    aceptaTardias: tarea.aceptaTardias,
    requiereAdjuntos: tarea.requiereAdjuntos,
    rubrica: tarea.rubrica.map(({ criterio, puntosMax }) => ({
      llave: nuevaLlaveDeCriterio(),
      criterio,
      puntosMax: String(puntosMax),
    })),
  }
}

// M-01 y T-13: cuándo un error de la consulta de la tarea reemplaza la vista. Sin la tarea (la primera
// carga falló), con un 404 (la tarea ya no existe), con un 403 SIN_ACCESO_A_LA_CLASE (se perdió el
// acceso: no tiene sentido seguir ofreciendo guardar o borrar) o con un VALIDACION de claseId o tareaId
// (lo mismo que un acceso o una tarea inexistentes) sí. Con la tarea ya cargada, cualquier otro error de
// una recarga (sin conexión, 5xx) deja la vista y lo escrito intactos y solo se avisa. Los 403
// ACCESO_RESTRINGIDO y CAMBIO_DE_CONTRASENA_REQUERIDO no se distinguen aquí: apiClient redirige antes.
export const errorQueReemplazaLaVista = (hayTarea: boolean, error: unknown): boolean => {
  if (!hayTarea) return true
  if (!esApiError(error)) return false
  if (error.codigo === "TAREA_NO_ENCONTRADA" || error.codigo === "SIN_ACCESO_A_LA_CLASE")
    return true
  if (error.codigo !== "VALIDACION") return false
  return error.message.startsWith("claseId:") || error.message.startsWith("tareaId:")
}

// T-13: el aviso de una recarga fallida con el formulario de edición abierto. Sin conexión, o con un
// 5xx (la API caída o un error interno: para la interfaz es lo mismo, DEC-12 de apiClient y la prueba
// de ataque de M-01 lo fijan así), dice que revise la conexión; cualquier otra respuesta del servidor
// (por ejemplo un 429 o una respuesta inválida) no habla de conexión.
export const avisoDeRecargaFallidaAlEditar = (error: unknown): string => {
  if (!esApiError(error) || error.codigo === "SIN_CONEXION" || error.estado >= 500) {
    return TEXTOS_FORMULARIO_TAREA.avisoRecargaFallida
  }
  return TEXTOS_FORMULARIO_TAREA.avisoRecargaFallidaDelServidor
}

// T-06: los errores de una fila de la rúbrica viajan con su fila. `cuerpoDeTarea` y los errores del
// servidor nombran la fila por su posición en el envío ("rubrica.0.criterio"); aquí se pasan a la llave
// estable de esa fila ("rubrica.<llave>.criterio") con las filas tal como estaban al enviar. Así, quitar
// o agregar filas después no cambia a qué fila pertenece cada error. Una posición que ya no existe en
// el envío (no debería pasar) se avisa como error de la rúbrica entera, nunca se pierde.
export const erroresConLlavesDeFila = (
  errores: ErroresFormulario,
  filasEnviadas: readonly CriterioDelFormulario[],
): ErroresFormulario => {
  const resultado: ErroresFormulario = {}
  for (const [clave, mensaje] of Object.entries(errores)) {
    const coincidencia = /^rubrica\.(\d+)\.(criterio|puntosMax)$/.exec(clave)
    if (!coincidencia) {
      resultado[clave] = mensaje
      continue
    }
    const fila = filasEnviadas[Number(coincidencia[1])]
    if (fila === undefined) {
      resultado.rubrica ??= mensaje
      continue
    }
    resultado[`rubrica.${fila.llave}.${coincidencia[2]}`] = mensaje
  }
  return resultado
}

// T-10: un error por una fila cuya llave ya no está (se quitó mientras el envío estaba en vuelo) no se
// pierde ni queda en una llave sin fila: pasa a ser el error de la rúbrica entera, que el editor
// muestra. Las filas que siguen conservan su error aunque hayan cambiado de posición.
export const erroresSinFilasQuitadas = (
  errores: ErroresFormulario,
  filasVigentes: readonly CriterioDelFormulario[],
): ErroresFormulario => {
  const resultado: ErroresFormulario = {}
  for (const [clave, mensaje] of Object.entries(errores)) {
    const coincidencia = /^rubrica\.([^.]+)\.(criterio|puntosMax)$/.exec(clave)
    if (!coincidencia || filasVigentes.some(({ llave }) => llave === coincidencia[1])) {
      resultado[clave] = mensaje
      continue
    }
    resultado.rubrica ??= mensaje
  }
  return resultado
}

// ENTREGAS-01a (P-05 a′, §D-8.3.3): otra persona guardó o movió la tarea mientras se editaba. El
// formulario lo reconoce para pedirle a la vista que recargue la tarea y lo reinicie.
export const esTareaModificada = (error: unknown): boolean =>
  esApiError(error) && error.codigo === "TAREA_MODIFICADA"

// T-09, T-14 y T-15: la clave con que el detalle y la edición le dicen a useFocoAlPerderseElControl que
// la vista pudo cambiar. Cambia con cada respuesta y con cada fallo nuevo (también con dos fallos
// seguidos, aunque el estado siga en error y caigan en el mismo milisegundo): un fallo que conserva la
// vista seguido de otro que la reemplaza vuelve a evaluar el foco. Una sola función para las dos vistas,
// para que no vuelvan a divergir.
export const claveDeFocoDeLaTarea = (tareaId: string, consulta: MomentoDeLaConsulta): string =>
  [
    tareaId,
    consulta.status,
    consulta.dataUpdatedAt,
    consulta.errorUpdatedAt,
    consulta.errorUpdateCount,
  ].join(":")
