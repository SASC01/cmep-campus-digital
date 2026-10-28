import { claveDeNombre, estadoDeTerminoDeBusqueda, normalizarTextoLargo } from "@campus/shared"

import {
  avisoDeFalloAlSubir as avisoDeFalloAlSubirCompartido,
  tiempoFrescoDeAdjuntos,
} from "@/components/adjuntos/lib"
import {
  campoDeErrorDeApi,
  erroresDeFormularioDeApi,
  esErrorDeCursor,
  mensajeDeErrorDeApi,
  mensajeDeErrorDeConsulta,
} from "@/lib/errores-de-api"
import { estadoDeEntregaVisible, TEXTOS_ESTADO_DE_ENTREGA } from "@/lib/estado-de-entrega"
import { vencimientoDe } from "@/lib/vencimiento"
import { esApiError } from "@/services/apiClient"

import {
  CAMPOS_PINTADOS_DE_LA_CLASE,
  CAMPOS_PINTADOS_DE_LA_PUBLICACION,
  CLASES_DEL_CUADRO_DE_ENTREGA,
  CLASES_DEL_CUADRO_DE_FECHA,
  CLAVE_SIN_TEMA,
  TEXTOS_CATEGORIAS,
  TEXTOS_CLASE,
  TEXTOS_INICIO_ESTUDIANTE,
  TEXTOS_INICIO_MAESTRO,
  TEXTOS_PERSONAS,
  TEXTOS_TARJETA,
  TEXTOS_TRABAJO,
  TIEMPO_FRESCO_DEL_MURO_MS,
  TRADUCCION_DE_ERRORES_CLASES,
} from "./data"
import type {
  Categoria,
  ControlDeOrden,
  CuadroDeFecha,
  ElementoDeTrabajo,
  ErroresFormulario,
  FilaDeCategoria,
  IncidenciaValidacion,
  LimiteDeConcurrencia,
  ListaTemasRespuesta,
  PaginaDelMuro,
  RolDeClases,
  SeccionDeClase,
  SeccionDeTrabajo,
  SegundaLineaDeLaFila,
  TipoPublicacion,
} from "./types"

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

// CHORE-03 (§D-4): el mensaje de un error de una acción, con el contrato de lib/errores-de-api.ts y la
// traducción del módulo (data.ts). Un VALIDACION de claseId da el texto de SIN_ACCESO_A_LA_CLASE (T-11,
// S-08); los demás VALIDACION, el mensaje del servidor sin su ruta (T-17) o, sin texto visible, el
// genérico; los códigos de maestros, temas y categorías, su mensaje en español (CLASES-02c).
export const mensajeDeErrorClases = (error: unknown): string =>
  mensajeDeErrorDeApi(error, TRADUCCION_DE_ERRORES_CLASES)

// CHORE-03 (§D-4, S-01): el mensaje de un error de lo que se carga. Un VALIDACION que no es de claseId
// da el genérico, nunca el texto del servidor.
export const mensajeDeConsultaClases = (error: unknown): string =>
  mensajeDeErrorDeConsulta(error, TRADUCCION_DE_ERRORES_CLASES)

// T-34: el 400 "cursor: no es válido" de "Ver más" (el cursor ya no existe) no es un texto para la
// persona: en su lugar se muestra `textoDelCursor`, que dice qué pasó y qué hacer. Cualquier otro
// error es el de una consulta (CHORE-03, R-15).
export const mensajeDeErrorDeLista = (error: unknown, textoDelCursor: string): string => {
  if (esErrorDeCursor(error)) return textoDelCursor
  return mensajeDeConsultaClases(error)
}

// TAREAS-01c (§D-9): erroresPorCampo y esErrorDeCursor viven en lib/errores-de-api.ts; la versión
// compartida de erroresDeFormularioClases recibe los mensajes de cada módulo, y este envoltorio
// conserva el nombre, la firma y la salida de siempre (T-19: un error que no es de un campo da null).
export { erroresPorCampo, esErrorDeCursor } from "@/lib/errores-de-api"

export const erroresDeFormularioClases = (
  error: unknown,
  camposValidos: readonly string[],
): ErroresFormulario | null => erroresDeFormularioDeApi(error, camposValidos, mensajeDeErrorClases)

// Enmienda 4 (T-03): al editar, la lista de maestros no se pinta; su VALIDACION se avisa.
export const erroresDeLaClaseDeApi = (
  error: unknown,
  modo: keyof typeof CAMPOS_PINTADOS_DE_LA_CLASE,
): ErroresFormulario | null => erroresDeFormularioClases(error, CAMPOS_PINTADOS_DE_LA_CLASE[modo])

// Enmienda 4 (T-04): en un anuncio, el título no se pinta; su VALIDACION se avisa.
export const erroresDeLaPublicacionDeApi = (
  error: unknown,
  tipo: TipoPublicacion,
): ErroresFormulario | null =>
  erroresDeFormularioClases(error, CAMPOS_PINTADOS_DE_LA_PUBLICACION[tipo])

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

// TAREAS-01e (§D-11, Enmienda 5 y corrección M-01). Limitador FIFO de concurrencia: corre la tarea si
// hay menos de `maximo` en curso y, si no, la forma en una cola. (i) Con un `signal` ya abortado
// rechaza enseguida, sin formarla ni correrla. (ii) El oyente de `abort` solo vive mientras la tarea
// espera: se quita al entrar en curso o al salir de la cola por el aborto. (iii) Una tarea en curso
// libera su lugar al asentarse (con éxito, error o aborto, en el `finally`) y la primera de la cola
// entra en ese mismo turno. (iv) Sin reinicio: la instancia de hooks.ts es una por módulo.
const errorDeAborto = (): DOMException => new DOMException("La operación se canceló.", "AbortError")

export const crearLimiteDeConcurrencia = (maximo: number): LimiteDeConcurrencia => {
  let enCurso = 0
  const cola: (() => void)[] = []

  const entrarLaSiguiente = () => {
    while (enCurso < maximo) {
      const siguiente = cola.shift()
      if (siguiente === undefined) return
      siguiente()
    }
  }

  const ejecutar = <T>(tarea: () => Promise<T>, signal?: AbortSignal): Promise<T> => {
    if (signal?.aborted === true) return Promise.reject(errorDeAborto())
    return new Promise<T>((resolver, rechazar) => {
      const correr = async () => {
        enCurso += 1
        try {
          resolver(await tarea())
        } catch (error) {
          rechazar(error)
        } finally {
          enCurso -= 1
          entrarLaSiguiente()
        }
      }

      if (enCurso < maximo) {
        void correr()
        return
      }

      const alAbortar = () => {
        const indice = cola.indexOf(arrancar)
        if (indice >= 0) cola.splice(indice, 1)
        signal?.removeEventListener("abort", alAbortar)
        rechazar(errorDeAborto())
      }
      const arrancar = () => {
        signal?.removeEventListener("abort", alAbortar)
        void correr()
      }
      cola.push(arrancar)
      signal?.addEventListener("abort", alAbortar)
    })
  }

  return { ejecutar }
}

// §D-11: las secciones de "Trabajo de clase" en el orden de la vista: "Sin tema" primero, solo si tiene
// elementos (S-11), y después los temas en el orden en que los da el servidor (`orden`).
export const seccionesDeTrabajo = (lista: ListaTemasRespuesta): SeccionDeTrabajo[] => {
  const temas = lista.temas.map((tema) => ({
    clave: tema.id,
    nombre: tema.nombre,
    elementos: tema.elementos,
    tema,
  }))
  if (lista.sinTema === 0) return temas
  return [
    { clave: CLAVE_SIN_TEMA, nombre: TEXTOS_TRABAJO.sinTema, elementos: lista.sinTema, tema: null },
    ...temas,
  ]
}

// "Subir" y "Bajar" envían el orden completo (§D-2): los ids con el tema `temaId` intercambiado con su
// vecino. Si el movimiento no cabe (el primero no sube, el último no baja), devuelve null.
export const ordenTrasMover = (
  ids: readonly string[],
  temaId: string,
  control: ControlDeOrden,
): string[] | null => {
  const indice = ids.indexOf(temaId)
  const destino = control === "subir" ? indice - 1 : indice + 1
  if (indice < 0 || destino < 0 || destino >= ids.length) return null
  const orden = [...ids]
  const vecino = orden[destino]
  if (vecino === undefined) return null
  orden[destino] = temaId
  orden[indice] = vecino
  return orden
}

// DESIGN.md §7.7: el cuadro de fecha (día y mes abreviado, en mayúsculas, en la zona local). Una fecha
// que no se puede leer da null: la fila no inventa un día.
export const cuadroDeFecha = (iso: string): CuadroDeFecha | null => {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return null
  const mes = new Intl.DateTimeFormat("es-MX", { month: "short" })
    .format(fecha)
    .replace(".", "")
    .toLocaleUpperCase("es-MX")
  return { dia: String(fecha.getDate()), mes }
}

// El error de un VALIDACION de "nombre" o de TEMA_REPETIDO se muestra bajo el campo del formulario de
// tema; cualquier otro error lo avisa el hook.
export const erroresDelTemaDeApi = (error: unknown): ErroresFormulario | null => {
  if (esApiError(error) && error.codigo === "TEMA_REPETIDO") {
    return { nombre: mensajeDeErrorClases(error) }
  }
  return erroresDeFormularioClases(error, ["nombre"])
}

// §D-11: las filas del editor a partir de las categorías guardadas; la llave de una guardada es su id.
export const filasDeCategorias = (categorias: readonly Categoria[]): FilaDeCategoria[] =>
  categorias.map(({ id, nombre, peso, tareas }) => ({
    llave: id,
    id,
    nombre,
    peso: String(peso),
    tareas,
  }))

// El peso como lo escribió la persona: un entero, con o sin "%" al final (se pega "40%" o "40 %"). Lo
// demás no es un número y lo rechaza el esquema de shared/ con su mensaje.
const PESO_ESCRITO = /^\s*(\d+)\s*%?\s*$/

export const pesoDeTexto = (texto: string): number => {
  const coincidencia = PESO_ESCRITO.exec(texto)
  if (coincidencia === null) return Number.NaN
  return Number(coincidencia[1])
}

// El total en vivo: los pesos que no son un número cuentan 0.
export const totalDePesos = (filas: readonly FilaDeCategoria[]): number =>
  filas.reduce((total, { peso }) => {
    const valor = pesoDeTexto(peso)
    return Number.isFinite(valor) ? total + valor : total
  }, 0)

export const textoDelTotal = (total: number): string => {
  if (total === 100) return TEXTOS_CATEGORIAS.totalExacto
  if (total < 100) return TEXTOS_CATEGORIAS.totalFaltan(total, 100 - total)
  return TEXTOS_CATEGORIAS.totalSobran(total, total - 100)
}

// Lo que se envía al guardar: las filas en su orden, el nombre normalizado como lo normaliza el
// servidor y el peso convertido a número. La validación es la del servidor (reemplazarCategoriasSchema).
export const cuerpoDeCategorias = (filas: readonly FilaDeCategoria[]) => ({
  categorias: filas.map(({ id, nombre, peso }) => ({
    ...(id === undefined ? {} : { id }),
    nombre: normalizarTextoLargo(nombre),
    peso: pesoDeTexto(peso),
  })),
})

// Los errores del editor viajan con su fila (patrón T-06 de la rúbrica): "<llave>.nombre" y
// "<llave>.peso". `categorias` es el error de la lista entera (suma, repetidos, tope).
export const CAMPO_DE_LA_LISTA = "categorias"

const FILA_DEL_ERROR = /^categorias\.(\d+)\.(nombre|peso)$/
const PREFIJO_DE_FILA_DE_CATEGORIA = /^(categorias\.\d+\.(?:nombre|peso)):\s*/

const errorEnSuFila = (
  ruta: string,
  mensaje: string,
  llaves: readonly string[],
  errores: ErroresFormulario,
) => {
  const fila = FILA_DEL_ERROR.exec(ruta)
  const llave = fila === null ? undefined : llaves[Number(fila[1])]
  const clave = llave === undefined || fila === null ? CAMPO_DE_LA_LISTA : `${llave}.${fila[2]}`
  errores[clave] ??= mensaje
}

// Las incidencias del esquema, cada una en la fila que tenía esa posición al validar.
export const erroresDeCategorias = (
  incidencias: readonly IncidenciaValidacion[],
  llaves: readonly string[],
): ErroresFormulario => {
  const errores: ErroresFormulario = {}
  for (const incidencia of incidencias) {
    errorEnSuFila(incidencia.path.map(String).join("."), incidencia.message, llaves, errores)
  }
  return errores
}

// Un VALIDACION del servidor ("categorias.0.peso: …" o "categorias: …") en su fila o en la lista;
// null si no es un error de las categorías (ese lo avisa el hook).
export const erroresDeCategoriasDeApi = (
  error: unknown,
  llaves: readonly string[],
): ErroresFormulario | null => {
  if (!esApiError(error) || error.codigo !== "VALIDACION") return null
  const fila = PREFIJO_DE_FILA_DE_CATEGORIA.exec(error.message)
  if (fila !== null) {
    const errores: ErroresFormulario = {}
    errorEnSuFila(fila[1] ?? "", mensajeDeErrorClases(error), llaves, errores)
    return errores
  }
  if (campoDeErrorDeApi(error) !== CAMPO_DE_LA_LISTA) return null
  return { [CAMPO_DE_LA_LISTA]: mensajeDeErrorClases(error) }
}

// Una recarga fallida conserva la vista con lo último que llegó (y avisa), salvo que diga que ya no hay
// acceso a la clase (o que el id de la clase no es válido, que es lo mismo): entonces el mensaje
// reemplaza la vista y deja de ofrecer acciones.
export const errorQuitaLaVista = (error: unknown): boolean =>
  esApiError(error) &&
  (error.codigo === "SIN_ACCESO_A_LA_CLASE" ||
    (error.codigo === "VALIDACION" && campoDeErrorDeApi(error) === "claseId"))

// §7.14 en "Trabajo de clase": la sección vecina de la que desapareció, entre las que ya estaban antes
// (la siguiente o, si era la última, la anterior). Una sección que aparece en ese mismo cambio (por
// ejemplo, "Sin tema", que recibe los elementos del tema borrado) no cuenta como vecina.
export const seccionVecina = (
  previas: readonly string[] | undefined,
  actuales: readonly string[],
  clave: string,
): string | undefined => {
  if (previas === undefined) return undefined
  const indice = previas.indexOf(clave)
  const siguen = (candidata: string) => actuales.includes(candidata)
  const despues = previas.slice(indice + 1).find(siguen)
  if (despues !== undefined) return despues
  return [...previas.slice(0, Math.max(indice, 0))].reverse().find(siguen)
}

// T-17 (ronda 1 de 01e): los errores de una fila se van con ella cuando se quita. El editor no deja
// quitar filas mientras guarda, así que ningún error de fila puede llegar sin su fila (en la rúbrica de
// features/tareas sí, porque allí se quita con el envío en vuelo).
export const erroresSinLaFila = (errores: ErroresFormulario, llave: string): ErroresFormulario =>
  Object.fromEntries(Object.entries(errores).filter(([clave]) => !clave.startsWith(`${llave}.`)))

// T-18 (ronda 1 de 01e): las filas que deja la respuesta del servidor conservan la llave de la fila de
// la que salieron (la guardada, por su id; la nueva, por su nombre, que no se repite en la clase), así
// que React no las vuelve a montar y el campo con el foco lo conserva. Una categoría que no estaba en
// la lista que se ve (llega tras un conflicto) usa su id.
export const filasDelServidor = (
  previas: readonly FilaDeCategoria[],
  categorias: readonly Categoria[],
): FilaDeCategoria[] => {
  const llavePorId = new Map(
    previas.flatMap(({ id, llave }) => (id === undefined ? [] : [[id.toLowerCase(), llave]])),
  )
  const llavePorNombre = new Map(
    previas
      .filter(({ id }) => id === undefined)
      .map(({ nombre, llave }) => [claveDeNombre(normalizarTextoLargo(nombre)), llave]),
  )
  return filasDeCategorias(categorias).map((fila) => {
    const llave =
      llavePorId.get(fila.llave.toLowerCase()) ?? llavePorNombre.get(claveDeNombre(fila.nombre))
    return llave === undefined ? fila : { ...fila, llave }
  })
}

// ENTREGAS-01d (§D-9.8, DESIGN.md §7.7): la segunda línea de una fila de "Trabajo de clase" y sus
// colores. Sin `entrega` (maestro y admin) o con una tarea pendiente sin entregar (asignado), el texto
// y el color del vencimiento de siempre; para el alumno, el estado de su entrega en palabras
// ("Entregado", "Entregado con retraso", "Calificado" o "Sin entregar"). Puro: recibe `ahora`.
export const segundaLineaDeLaFila = (
  fechaLimite: string,
  entrega: ElementoDeTrabajo["entrega"] | undefined,
  ahora: Date,
): SegundaLineaDeLaFila => {
  const vencimiento = vencimientoDe(fechaLimite, ahora)
  const deVencimiento = {
    texto: vencimiento.texto,
    colores: CLASES_DEL_CUADRO_DE_FECHA[vencimiento.estado],
  }
  if (entrega === undefined) return deVencimiento
  const estado = estadoDeEntregaVisible(entrega, fechaLimite, ahora)
  if (estado === "asignado") return deVencimiento
  return { texto: TEXTOS_ESTADO_DE_ENTREGA[estado], colores: CLASES_DEL_CUADRO_DE_ENTREGA[estado] }
}
