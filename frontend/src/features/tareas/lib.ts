import {
  CONFIRMAR_BORRADO_CON_ENTREGAS,
  crearTareaSchema,
  normalizarTextoLargo,
} from "@campus/shared"

import { erroresDeFormularioDeApi, quitarPrefijoDeCampo } from "@/lib/errores-de-api"
import { formatearFechaLarga } from "@/lib/format"
import { esApiError } from "@/services/apiClient"
import { claveTarea } from "@/services/trabajoService"

import {
  CAMPO_DE_CADA_CODIGO,
  CAMPOS_DEL_FORMULARIO,
  CODIGOS_CON_MENSAJE_DEL_SERVIDOR,
  CODIGOS_DE_CONFLICTO_DE_ENTREGA,
  CODIGOS_QUE_REDIRIGE_EL_CLIENTE,
  CODIGOS_QUE_REEMPLAZAN_LA_VISTA,
  LIMITE_DE_ENTREGAS,
  LIMITE_DEL_HILO,
  MENSAJES_ERROR_TAREAS,
  MENSAJES_POR_CODIGO_DE_TAREAS,
  PREFIJOS_QUE_REEMPLAZAN_LA_VISTA,
  PUNTOS_PROPUESTOS,
  TEXTOS_ENTREGAS,
  TEXTOS_FORMULARIO_TAREA,
  TEXTOS_TU_TRABAJO,
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
    if (error.message.startsWith("alumnoId:")) return MENSAJES_ERROR_TAREAS.alumnoNoEncontrado
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
// ENTREGAS-01e (§D-10.3): en la entrega de un alumno, ALUMNO_NO_ENCONTRADO (o un VALIDACION de
// alumnoId) reemplaza la vista igual que TAREA_NO_ENCONTRADA, por esta misma regla (un aviso deduplicado
// y el foco a la raíz); la consulta de la tarea nunca lo responde.
export const errorQueReemplazaLaVista = (hayTarea: boolean, error: unknown): boolean => {
  if (!hayTarea) return true
  if (!esApiError(error)) return false
  if (CODIGOS_QUE_REEMPLAZAN_LA_VISTA.includes(error.codigo)) return true
  if (error.codigo !== "VALIDACION") return false
  return PREFIJOS_QUE_REEMPLAZAN_LA_VISTA.some((prefijo) => error.message.startsWith(prefijo))
}

// ENTREGAS-01d, ronda 2 (T-05): un error con que apiClient ya redirigió (CODIGOS_QUE_REDIRIGE_EL_CLIENTE).
export const errorQueRedirigeElCliente = (error: unknown): boolean =>
  esApiError(error) && CODIGOS_QUE_REDIRIGE_EL_CLIENTE.includes(error.codigo)

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

// ENTREGAS-01d (§D-9.9): la llave de la entrega del alumno cuelga de la de la tarea (una renovación de
// la tarea la renueva también) y la del hilo, de su ruta (la del alumno o la de un alumno para sus
// maestros, 01e).
export const claveMiEntrega = (claseId: string, tareaId: string) =>
  [...claveTarea(claseId, tareaId), "entrega"] as const

export const claveHilo = (rutaDelHilo: string) => ["hilo-privado", rutaDelHilo] as const

// Las rutas de la entrega del alumno que llama (sin :alumnoId: el servidor usa su sesión).
export const rutaDeMiEntrega = (claseId: string, tareaId: string): string =>
  `/api/clases/${claseId}/tareas/${tareaId}/entrega`

export const rutaDeMiHilo = (claseId: string, tareaId: string): string =>
  `${rutaDeMiEntrega(claseId, tareaId)}/comentarios`

// La página de un hilo privado (20 por página, como el servidor).
export const rutaDePaginaDelHilo = (rutaDelHilo: string, cursor: string | undefined): string => {
  const consulta = new URLSearchParams({ limite: String(LIMITE_DEL_HILO) })
  if (cursor !== undefined) consulta.set("cursor", cursor)
  return `${rutaDelHilo}?${consulta.toString()}`
}

// P-02 (a): con la tarea vigente, ya es tarde (después de la fecha límite; a tiempo hasta su
// milisegundo, como el servidor) y, sin entregas tardías, la entrega está cerrada. El servidor decide
// con su propio reloj; esto solo elige qué frase mostrar.
export const yaEsTarde = (fechaLimiteIso: string, ahora: Date): boolean =>
  ahora.getTime() > new Date(fechaLimiteIso).getTime()

export const entregaCerradaAhora = (
  tarea: { fechaLimite: string; aceptaTardias: boolean },
  ahora: Date,
): boolean => !tarea.aceptaTardias && yaEsTarde(tarea.fechaLimite, ahora)

const horaLocal = (fecha: Date): string =>
  new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
    fecha,
  )

// S-13: "Entregaste el lunes 6 de octubre a las 14:30", o "Marcaste como completada el …" si la entrega
// no lleva archivos ni enlaces. En la zona local del navegador. null si no hay fecha de entrega.
export const fraseDeEntrega = (entrega: {
  fechaEntrega: string | null
  adjuntos: readonly unknown[]
  enlaces: readonly string[]
}): string | null => {
  if (entrega.fechaEntrega === null) return null
  const fecha = new Date(entrega.fechaEntrega)
  if (Number.isNaN(fecha.getTime())) return null
  const vacia = entrega.adjuntos.length === 0 && entrega.enlaces.length === 0
  if (vacia)
    return TEXTOS_TU_TRABAJO.marcasteComoCompletada(formatearFechaLarga(fecha), horaLocal(fecha))
  return TEXTOS_TU_TRABAJO.entregaste(formatearFechaLarga(fecha), horaLocal(fecha))
}

// §D-9.3: un 409 de la entrega (ya realizada, no realizada, calificada o cerrada).
export const esConflictoDeEntrega = (error: unknown): boolean =>
  esApiError(error) && CODIGOS_DE_CONFLICTO_DE_ENTREGA.includes(error.codigo)

export const esEntregaVacia = (error: unknown): boolean =>
  esApiError(error) && error.codigo === "ENTREGA_VACIA"

// Un VALIDACION de un campo con nombre compuesto ("enlaces.1: mensaje", "texto: mensaje"): el
// mensaje sin el prefijo técnico, o null si el error no es de ese campo.
const errorDelCampoDeApi = (error: unknown, campo: RegExp): string | null => {
  if (!esApiError(error) || error.codigo !== "VALIDACION") return null
  const coincidencia = campo.exec(error.message)
  if (coincidencia === null) return null
  return error.message.slice(coincidencia[0].length)
}

export const errorDeEnlacesDeApi = (error: unknown): string | null =>
  errorDelCampoDeApi(error, /^enlaces(\.\d+)?:\s*/)

export const errorDeTextoDeApi = (error: unknown): string | null =>
  errorDelCampoDeApi(error, /^texto:\s*/)

// ENTREGAS-01e (§D-10.5.3, Enmienda 2): sin confirmar, la ruta de siempre (idéntica); con confirmar,
// la misma con `?confirmar=entregas`. Solo la segunda confirmación del admin la pide.
export const rutaDeBorrarTarea = (
  claseId: string,
  tareaId: string,
  confirmarEntregas: boolean,
): string => {
  const ruta = `/api/clases/${claseId}/tareas/${tareaId}`
  if (!confirmarEntregas) return ruta
  return `${ruta}?${new URLSearchParams({ confirmar: CONFIRMAR_BORRADO_CON_ENTREGAS }).toString()}`
}

export const esTareaConEntregas = (error: unknown): boolean =>
  esApiError(error) && error.codigo === "TAREA_CON_ENTREGAS"

// ENTREGAS-01e (§D-10.2 y §D-10.3): las entregas de una tarea para sus maestros y el admin. Sus llaves
// cuelgan de la de la tarea (una renovación de la tarea las renueva) y no chocan con la de la entrega
// propia del alumno (`…, "entrega"`).
export const clavePrefijoDeEntregas = (claseId: string, tareaId: string) =>
  [...claveTarea(claseId, tareaId), "entregas"] as const

export const claveListaDeEntregas = (claseId: string, tareaId: string) =>
  [...clavePrefijoDeEntregas(claseId, tareaId), "lista"] as const

export const claveEntregaDeAlumno = (claseId: string, tareaId: string, alumnoId: string) =>
  [...clavePrefijoDeEntregas(claseId, tareaId), "alumno", alumnoId] as const

const rutaDeEntregas = (claseId: string, tareaId: string): string =>
  `/api/clases/${claseId}/tareas/${tareaId}/entregas`

// Una página de la lista (20 por página, como el servidor y el roster).
export const rutaDePaginaDeEntregas = (
  claseId: string,
  tareaId: string,
  cursor: string | undefined,
): string => {
  const consulta = new URLSearchParams({ limite: String(LIMITE_DE_ENTREGAS) })
  if (cursor !== undefined) consulta.set("cursor", cursor)
  return `${rutaDeEntregas(claseId, tareaId)}?${consulta.toString()}`
}

// La entrega de un alumno: también es la ruta de sus archivos (`…/archivos/:id/descarga`).
export const rutaDeEntregaDeAlumno = (claseId: string, tareaId: string, alumnoId: string): string =>
  `${rutaDeEntregas(claseId, tareaId)}/${alumnoId}`

export const rutaDelHiloDeAlumno = (claseId: string, tareaId: string, alumnoId: string): string =>
  `${rutaDeEntregaDeAlumno(claseId, tareaId, alumnoId)}/comentarios`

// Los destinos de la interfaz, desde la base de la clase de la perspectiva actual.
export const enlaceAEntregas = (base: string, tareaId: string): string =>
  `${base}/tareas/${tareaId}/entregas`

export const enlaceAEntregaDeAlumno = (base: string, tareaId: string, alumnoId: string): string =>
  `${enlaceAEntregas(base, tareaId)}/${alumnoId}`

// §D-10.3: "Entregó el lunes 6 de octubre a las 14:30", "Marcó como completada el …" (sin archivos ni
// enlaces) o "Todavía no entrega." (sin fecha de entrega). En la zona local del navegador.
export const fraseDeEntregaDeAlumno = (entrega: {
  fechaEntrega: string | null
  adjuntos: readonly unknown[]
  enlaces: readonly string[]
}): string => {
  if (entrega.fechaEntrega === null) return TEXTOS_ENTREGAS.todaviaNoEntrega
  const fecha = new Date(entrega.fechaEntrega)
  if (Number.isNaN(fecha.getTime())) return TEXTOS_ENTREGAS.todaviaNoEntrega
  const vacia = entrega.adjuntos.length === 0 && entrega.enlaces.length === 0
  if (vacia)
    return TEXTOS_ENTREGAS.marcoComoCompletada(formatearFechaLarga(fecha), horaLocal(fecha))
  return TEXTOS_ENTREGAS.entrego(formatearFechaLarga(fecha), horaLocal(fecha))
}

// §D-10.2: "Entregaron 12 de 30 alumnos." con lo que dice la página más reciente.
export const conteoDeEntregas = (paginas: readonly { entregadas: number; total: number }[]) => {
  const ultima = paginas.at(-1)
  if (ultima === undefined) return null
  return TEXTOS_ENTREGAS.conteo(ultima.entregadas, ultima.total)
}
