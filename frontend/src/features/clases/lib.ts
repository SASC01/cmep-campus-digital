import {
  claveDeNombre,
  crearPublicacionSchema,
  editarRecursoSchema,
  estadoDeTerminoDeBusqueda,
  normalizarTextoLargo,
} from "@campus/shared"

import {
  avisoDeFalloAlSubir as avisoDeFalloAlSubirCompartido,
  tiempoFrescoDeAdjuntos,
} from "@/components/adjuntos/lib"
import {
  campoDeErrorDeApi,
  erroresDeFormularioDeApi,
  erroresPorCampo,
  esErrorDeCursor,
  mensajeDeErrorDeApi,
  mensajeDeErrorDeConsulta,
} from "@/lib/errores-de-api"
import { estadoDeEntregaVisible, TEXTOS_ESTADO_DE_ENTREGA } from "@/lib/estado-de-entrega"
import { vencimientoDe } from "@/lib/vencimiento"
import { CODIGOS_QUE_REDIRIGE_EL_CLIENTE, esApiError } from "@/services/apiClient"

import {
  CAMPOS_PINTADOS_DE_LA_CLASE,
  CAMPOS_PINTADOS_DE_LA_DUDA,
  CAMPOS_PINTADOS_DE_LA_PUBLICACION,
  CAMPOS_PINTADOS_DE_LA_RESPUESTA,
  CAMPOS_PINTADOS_DEL_RECURSO,
  CAMPOS_QUE_REEMPLAZAN_EL_RECURSO,
  CLASES_DEL_CUADRO_DE_ENTREGA,
  CLASES_DEL_CUADRO_DE_FECHA,
  CLAVE_SIN_TEMA,
  CODIGOS_QUE_REEMPLAZAN_EL_RECURSO,
  LIMITE_CLASES_ADMIN,
  TEXTOS_BORRAR_CLASE,
  TEXTOS_CATEGORIAS,
  TEXTOS_CLASE,
  TEXTOS_EDITAR_RECURSO,
  TEXTOS_INICIO_ESTUDIANTE,
  TEXTOS_INICIO_MAESTRO,
  TEXTOS_PERSONAS,
  TEXTOS_TARJETA,
  TEXTOS_TRABAJO,
  TIEMPO_FRESCO_DEL_MURO_MS,
  TRADUCCION_DE_ERRORES_CLASES,
} from "./data"
import type {
  CamposDelRecurso,
  Categoria,
  ClaseDetalle,
  ConteoDeBorradoRespuesta,
  ControlDeOrden,
  CursorDeClasesAdmin,
  EstadoDeClases,
  ListaClasesAdminRespuesta,
  CrearAnuncio,
  CrearRecurso,
  EditarRecurso,
  CuadroDeFecha,
  ElementoDeTrabajo,
  ErroresFormulario,
  FilaDeCategoria,
  IncidenciaValidacion,
  LimiteDeConcurrencia,
  ListaTemasRespuesta,
  MedidaDeOpcion,
  MedidaDelIndicador,
  MedidaDelPanel,
  PaginaDelMuro,
  PosicionDelPanel,
  RolDeClases,
  SeccionDeClase,
  SeccionDeTrabajo,
  ModoDelRecurso,
  SegundaLineaDeLaFila,
  Tema,
  ValidacionDelCuerpo,
} from "./types"

// TAREAS-01c (§D-9): la perspectiva de una ruta y la base de una clase viven en lib/ruta-de-clase.ts.
export { baseDeClase, perspectivaDeRuta } from "@/lib/ruta-de-clase"

// ADMIN-01d1 (S-14, N-11): el único lugar que lee `archivadaEn`. Ausente es lo que manda un backend
// anterior al despliegue, que no sabe de clases archivadas: la clase está activa.
export const estaArchivada = (clase: Pick<ClaseDetalle, "archivadaEn">): boolean =>
  clase.archivadaEn !== undefined && clase.archivadaEn !== null

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

// CLASES-03 (§D-7.2, DH-03): el indicador de la sección activa toma la posición y el ancho de su
// opción, cada una a su ancho natural.
export const medidaDelIndicador = (opcion: MedidaDeOpcion): MedidaDelIndicador => ({
  x: opcion.offsetLeft,
  ancho: opcion.offsetWidth,
})

// El scrollLeft que deja la opción entera a la vista dentro de su panel, o null si ya lo está. Si la
// opción es más ancha que el panel, se alinea su inicio.
export const desplazamientoParaVer = (
  panel: MedidaDelPanel,
  opcion: MedidaDeOpcion,
): number | null => {
  const inicio = opcion.offsetLeft
  const fin = opcion.offsetLeft + opcion.offsetWidth
  if (inicio < panel.scrollLeft) return inicio
  if (fin <= panel.scrollLeft + panel.clientWidth) return null
  if (opcion.offsetWidth >= panel.clientWidth) return inicio
  return fin - panel.clientWidth
}

// CLASES-03c1 (T-02 de la ronda 1): la opción en las coordenadas del área desplazable del panel, la que
// usa desplazamientoParaVer. Su offsetLeft se mide desde la lista, y la lista empieza dentro del panel
// después de su borde y de su relleno: esa distancia se mide (el borde izquierdo de la lista en la
// ventana menos el del panel y su borde, más lo que el panel lleva desplazado), nunca se escribe.
export const opcionEnElPanel = (
  opcion: MedidaDeOpcion,
  inicioDeLaLista: number,
  panel: PosicionDelPanel,
): MedidaDeOpcion => ({
  offsetLeft:
    inicioDeLaLista - panel.left - panel.clientLeft + panel.scrollLeft + opcion.offsetLeft,
  offsetWidth: opcion.offsetWidth,
})

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

// Enmienda 4 (T-04): en un anuncio, el título no se pinta; su VALIDACION se avisa. CLASES-03d (§D-8.7):
// Avisos solo publica anuncios; el parámetro se conserva con su único valor.
export const erroresDeLaPublicacionDeApi = (
  error: unknown,
  tipo: "anuncio",
): ErroresFormulario | null =>
  erroresDeFormularioClases(error, CAMPOS_PINTADOS_DE_LA_PUBLICACION[tipo])

// CLASES-03d (§D-8.5, §D-15): "Nuevo recurso" y "Editar recurso" pintan el título y la descripción;
// cualquier otro campo (temaId, archivoIds.<i>, tipo, version) se avisa.
export const erroresDelRecursoDeApi = (
  error: unknown,
  modo: ModoDelRecurso,
): ErroresFormulario | null => erroresDeFormularioClases(error, CAMPOS_PINTADOS_DEL_RECURSO[modo])

// CLASES-03e (§D-9.4, §D-15): "Publicar duda" y "Responder" pintan solo el texto; cualquier otro campo
// (resuelta, dudaId, una ruta con índice) se avisa.
export const erroresDeLaDudaDeApi = (error: unknown): ErroresFormulario | null =>
  erroresDeFormularioClases(error, CAMPOS_PINTADOS_DE_LA_DUDA)

export const erroresDeLaRespuestaDeApi = (error: unknown): ErroresFormulario | null =>
  erroresDeFormularioClases(error, CAMPOS_PINTADOS_DE_LA_RESPUESTA)

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

// CLASES-03c2 (§D-7.6): cuántos elementos tiene un tema en total (todas las secciones), para la frase de
// borrarlo. null si la lista total no llegó, falló o no tiene el tema: la frase va sin conteo.
export const elementosEnTotalDelTema = (
  total: ListaTemasRespuesta | undefined,
  fallo: boolean,
  temaId: string,
): number | null => {
  if (total === undefined || fallo) return null
  const tema = total.temas.find(({ id }) => id === temaId)
  if (tema === undefined) return null
  return tema.elementos
}

// CLASES-03c2 (T-01 de la ronda 1): una lista de temas por sección puesta en el orden de `ordenada`
// (la respuesta de "Subir"/"Bajar", con los conteos totales), conservando los conteos de la sección. Un
// tema que `ordenada` no trae queda al final, en su orden de antes.
export const temasEnElOrdenDe = (
  lista: ListaTemasRespuesta,
  ordenada: ListaTemasRespuesta,
): ListaTemasRespuesta => {
  const posicion = new Map(ordenada.temas.map(({ id }, indice) => [id, indice]))
  const fuera = ordenada.temas.length
  const temas = [...lista.temas]
    .sort((a, b) => (posicion.get(a.id) ?? fuera) - (posicion.get(b.id) ?? fuera))
    .map((tema, orden) => ({ ...tema, orden }))
  return { ...lista, temas }
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

// CLASES-03c2 (§D-11, Enmienda 7): un error con que apiClient ya redirigió (o va a redirigir): no se
// avisa. Mismo nombre y firma que los de features/tareas y features/calificaciones.
export const errorQueRedirigeElCliente = (error: unknown): boolean =>
  esApiError(error) && CODIGOS_QUE_REDIRIGE_EL_CLIENTE.includes(error.codigo)

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

// CLASES-03d (§D-8.7): el anuncio de Avisos, validado con el esquema del servidor sobre lo que el
// servidor va a medir (normalizado), sin reescribir el campo visible. Con éxito, el cuerpo es el `data`
// del esquema (archivoIds va siempre: [] sin adjuntos, C-22).
export const anuncioValidado = (texto: string): ValidacionDelCuerpo<CrearAnuncio> => {
  const resultado = crearPublicacionSchema.safeParse({
    tipo: "anuncio",
    texto: normalizarTextoLargo(texto),
  })
  if (!resultado.success) return { ok: false, errores: erroresPorCampo(resultado.error.issues) }
  // El candidato lleva su tipo: el esquema no devuelve otro.
  if (resultado.data.tipo !== "anuncio") return { ok: false, errores: {} }
  return { ok: true, datos: resultado.data }
}

// Enmienda 10 (§D-8.5): el título de un recurso vacío o sin contenido visible dice "Escribe el título del
// recurso" al crear y al editar: su error sale siempre de la regla del título de editarRecursoSchema.
const errorDelTituloDelRecurso = (titulo: string): ErroresFormulario => {
  const resultado = editarRecursoSchema.pick({ titulo: true }).safeParse({ titulo })
  if (resultado.success) return {}
  return erroresPorCampo(resultado.error.issues)
}

const sinElTitulo = (errores: ErroresFormulario): ErroresFormulario =>
  Object.fromEntries(Object.entries(errores).filter(([campo]) => campo !== "titulo"))

// CLASES-03d (§D-8.5, R-03d-2): "Nuevo recurso". El cuerpo es el `data` del safeParse de
// crearPublicacionSchema (normalizado): { tipo: "material", titulo, texto, archivoIds }, y temaId solo si
// se eligió un tema (con "Sin tema" la clave no viaja). Nunca `bloque` (lo decide el servidor) ni
// `version`. El error del título es el del recurso (Enmienda 10); el resto, el del esquema.
export const recursoNuevoValidado = (
  campos: CamposDelRecurso,
): ValidacionDelCuerpo<CrearRecurso> => {
  const titulo = normalizarTextoLargo(campos.titulo)
  const conTema = campos.temaId === "" ? {} : { temaId: campos.temaId }
  const resultado = crearPublicacionSchema.safeParse({
    tipo: "material",
    titulo,
    texto: normalizarTextoLargo(campos.texto),
    ...conTema,
  })
  const delEsquema = resultado.success ? {} : erroresPorCampo(resultado.error.issues)
  const errores = { ...sinElTitulo(delEsquema), ...errorDelTituloDelRecurso(titulo) }
  if (!resultado.success || Object.keys(errores).length > 0) return { ok: false, errores }
  // El candidato lleva su tipo: el esquema no devuelve otro.
  if (resultado.data.tipo !== "material") return { ok: false, errores: {} }
  return { ok: true, datos: resultado.data }
}

// CLASES-03d (§D-8.5): "Editar recurso", con editarRecursoSchema. `archivoIds` son los adjuntos
// publicados que siguen (los nuevos se suman después de subirlos) y `version`, la de apertura. "Sin
// tema" viaja como null (la clave es obligatoria al editar).
export const recursoEditadoValidado = (
  campos: CamposDelRecurso,
  archivoIds: readonly string[],
  version: number,
): ValidacionDelCuerpo<EditarRecurso> => {
  const resultado = editarRecursoSchema.safeParse({
    titulo: normalizarTextoLargo(campos.titulo),
    texto: normalizarTextoLargo(campos.texto),
    temaId: campos.temaId === "" ? null : campos.temaId,
    archivoIds,
    version,
  })
  if (!resultado.success) return { ok: false, errores: erroresPorCampo(resultado.error.issues) }
  return { ok: true, datos: resultado.data }
}

// CLASES-03d (§D-8.1, DH-04): las secciones de un bloque de "Recursos": "Sin tema" si tiene recursos y
// después cada tema con recursos de ese bloque, en su orden. Un tema sin recursos del bloque no aparece.
export const seccionesDeRecursos = (lista: ListaTemasRespuesta): SeccionDeTrabajo[] =>
  seccionesDeTrabajo(lista).filter(({ elementos }) => elementos > 0)

// Cada sección de un bloque se marca con el bloque y su clave: un mismo tema puede tener sección en los
// dos bloques. Devuelve la clave de la sección si la marca es de ese bloque; null si es del otro.
export const marcaDeSeccionDeRecursos = (bloque: string, clave: string): string =>
  `${bloque}:${clave}`

export const claveDeLaMarcaDeRecursos = (marca: string, bloque: string): string | null => {
  const prefijo = `${bloque}:`
  return marca.startsWith(prefijo) ? marca.slice(prefijo.length) : null
}

// CLASES-03d (§D-8.6): cuándo un error de la consulta del recurso reemplaza "Editar recurso". Sin el
// recurso (la primera carga falló), con RECURSO_NO_ENCONTRADO o SIN_ACCESO_A_LA_CLASE, o con un
// VALIDACION de claseId o recursoId, sí. Con el recurso cargado, cualquier otro error de una recarga
// (sin conexión, 5xx, 429) deja el formulario y lo escrito intactos y solo se avisa.
export const errorQueReemplazaElRecurso = (hayRecurso: boolean, error: unknown): boolean => {
  if (!hayRecurso) return true
  if (!esApiError(error)) return false
  if (CODIGOS_QUE_REEMPLAZAN_EL_RECURSO.includes(error.codigo)) return true
  if (error.codigo !== "VALIDACION") return false
  const campo = campoDeErrorDeApi(error)
  return campo !== null && CAMPOS_QUE_REEMPLAZAN_EL_RECURSO.includes(campo)
}

// R8 (§D-10) y DESIGN.md §7.21 (T-13): sin conexión o con un 5xx, "revisa tu conexión"; cualquier otra
// respuesta del servidor (un 429, una respuesta inválida), "inténtalo de nuevo en un momento".
export const avisoDeRecargaFallidaDelRecurso = (error: unknown): string => {
  if (!esApiError(error) || error.codigo === "SIN_CONEXION" || error.estado >= 500) {
    return TEXTOS_EDITAR_RECURSO.recargaRed
  }
  return TEXTOS_EDITAR_RECURSO.recargaServidor
}

// CLASES-03e (T-02 de la ronda 1): la duda ya no existe (404 DUDA_NO_ENCONTRADA).
export const esDudaNoEncontrada = (error: unknown): boolean =>
  esApiError(error) && error.codigo === "DUDA_NO_ENCONTRADA"

// 409 RECURSO_MODIFICADO: otra persona guardó o movió el recurso mientras se editaba.
export const esRecursoModificado = (error: unknown): boolean =>
  esApiError(error) && error.codigo === "RECURSO_MODIFICADO"

// §D-8.5: el tema que se envía. Con la lista de temas ya llegada, el elegido si sigue en ella o "Sin
// tema" si ya no está; sin la lista (pendiente o fallida), el elegido tal cual: al editar, el recurso
// conserva su tema en lugar de pasar a "Sin tema" por una lista que no llegó.
export const temaVigente = (elegido: string, temas: readonly Tema[] | undefined): string => {
  if (temas === undefined) return elegido
  return temas.some(({ id }) => id === elegido) ? elegido : ""
}

// ADMIN-01c (§D-10): la pestaña de /admin/clases sale de `?estado=`. Que falte vale "Activas" (la vista
// no lo escribe al montar); cualquier otro valor, también.
export const estadoDeLaLista = (valor: string | null): EstadoDeClases =>
  valor === "archivadas" ? "archivadas" : "activas"

// ADMIN-01c (§D-2, Enmienda 5): la consulta de una página de la lista del administrador, siempre con el
// estado primero; la posición va después del cursor, codificada.
export const consultaDeClasesAdmin = (
  estado: EstadoDeClases,
  pagina: CursorDeClasesAdmin | undefined,
): string => {
  const parametros = new URLSearchParams({ estado, limite: String(LIMITE_CLASES_ADMIN) })
  if (pagina === undefined) return parametros.toString()
  parametros.set("cursor", pagina.cursor)
  if (pagina.cursorArchivadaEn !== undefined) {
    parametros.set("cursorArchivadaEn", pagina.cursorArchivadaEn)
  }
  return parametros.toString()
}

// ADMIN-01c (§D-2, Enmienda 5): la página siguiente sale de la última respuesta. Solo en "Archivadas"
// lleva la posición, y solo si el servidor la mandó como texto (sin una posición inventada).
export const siguienteCursorDeClasesAdmin = (
  estado: EstadoDeClases,
  ultima: ListaClasesAdminRespuesta,
): CursorDeClasesAdmin | undefined => {
  if (ultima.siguienteCursor === null) return undefined
  const posicion = ultima.siguienteCursorArchivadaEn
  if (estado === "archivadas" && typeof posicion === "string") {
    return { cursor: ultima.siguienteCursor, cursorArchivadaEn: posicion }
  }
  return { cursor: ultima.siguienteCursor }
}

const cantidadCon = (n: number, unidad: { una: string; varias: string }): string =>
  `${String(n)} ${n === 1 ? unidad.una : unidad.varias}`

// ADMIN-01c (§D-12, Enmienda 2): lo que se pierde, en palabras; cada cifra con su singular y las que
// valen 0 dichas igual, para que el texto no cambie de forma según la clase.
export const consecuenciaDelBorrado = (conteo: ConteoDeBorradoRespuesta): string => {
  const unidades = TEXTOS_BORRAR_CLASE.unidades
  return TEXTOS_BORRAR_CLASE.consecuencia({
    alumnos: cantidadCon(conteo.alumnos, unidades.alumnos),
    actividades: cantidadCon(conteo.actividades, unidades.actividades),
    entregas: cantidadCon(conteo.entregas, unidades.entregas),
    calificaciones: cantidadCon(conteo.calificaciones, unidades.calificaciones),
    archivos: cantidadCon(conteo.archivos, unidades.archivos),
  })
}

const esCodigo = (error: unknown, codigos: readonly string[]): boolean =>
  esApiError(error) && codigos.includes(error.codigo)

// ADMIN-01c (matriz de 01c): el maestro elegido ya no se puede asignar; el error va en el selector.
export const noSeEncontroElMaestro = (error: unknown): boolean =>
  esCodigo(error, ["MAESTRO_NO_ENCONTRADO"])

// ADMIN-01c (matriz de 01c): el estado de la clase ya no es el que la fila mostraba (otra pestaña u otra
// sesión la archivó, la restauró o la borró): las listas se renuevan además de avisar.
export const esCambioDeLaClaseEnGestion = (error: unknown): boolean =>
  esCodigo(error, ["CLASE_YA_ARCHIVADA", "CLASE_NO_ARCHIVADA", "SIN_ACCESO_A_LA_CLASE"])

// ADMIN-01c, corrección de la ronda 1 (T-01): la clase ya no existe (otra pestaña la borró); para el
// administrador, una clase inexistente responde lo mismo que una sin acceso.
export const esClaseQueYaNoExiste = (error: unknown): boolean =>
  esCodigo(error, ["SIN_ACCESO_A_LA_CLASE"])

// ADMIN-01c (matriz de 01c): el conteo de una clase que ya no está archivada dice eso, no la frase de
// recuperación.
export const esClaseNoArchivada = (error: unknown): boolean =>
  esCodigo(error, ["CLASE_NO_ARCHIVADA"])
