import {
  exportacionDeCalificacionesRespuestaSchema,
  gradebookRespuestaSchema,
  LIMITE_DE_LA_EXPORTACION,
  misCalificacionesRespuestaSchema,
} from "@campus/shared"
import {
  hashKey,
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useCallback, useEffect } from "react"

import { armarLibroXlsx, TIPO_MIME_XLSX } from "@/lib/xlsx"
import { api } from "@/services/apiClient"
import {
  claveGradebook,
  claveMisCalificaciones,
  clavePrefijoDeCalificaciones,
} from "@/services/calificacionesService"
import { descargarArchivo } from "@/services/descargaService"

import {
  LIMITE_ALUMNOS_DEL_GRADEBOOK,
  LIMITE_DE_MIS_CALIFICACIONES,
  LIMITE_TAREAS_DEL_GRADEBOOK,
  MAXIMO_DE_PETICIONES_DE_EXPORTACION,
} from "./data"
import {
  cabeEnUnaHoja,
  combinarVentanasDeExportacion,
  hojaDeExportacion,
  nombreDelArchivoDeExportacion,
  rutaDeExportacion,
  rutaDeMisCalificaciones,
  rutaDelGradebook,
  VENTANAS_INICIALES,
  ventanasDeLaExportacion,
} from "./lib"
import type {
  ExportacionDeCalificacionesRespuesta,
  FiltroDeMisCalificaciones,
  PeticionDeExportacion,
  RecorridoDeExportacion,
  ResultadoDeLaExportacion,
  VentanaDeExportacion,
  VentanaDelGradebook,
} from "./types"

// CALIFICACIONES-01d (§D-13.2). Las dos consultas del módulo. Sin avisos dentro de los ganchos: los
// errores los pintan las vistas (S-19, S-21) y el único aviso, el de "Ver más tareas", lo da su
// manejador.

// Una ventana del gradebook. La tabla anterior sigue a la vista mientras llega la nueva.
export const useGradebook = (claseId: string, ventana: VentanaDelGradebook) =>
  useQuery({
    queryKey: claveGradebook(claseId, ventana),
    queryFn: () =>
      api(
        rutaDelGradebook(claseId, ventana, {
          limite: LIMITE_ALUMNOS_DEL_GRADEBOOK,
          limiteTareas: LIMITE_TAREAS_DEL_GRADEBOOK,
        }),
        { schema: gradebookRespuestaSchema },
      ),
    placeholderData: keepPreviousData,
  })

// T-07: cuando la ventana a la vista prueba que la clase cambió (el 400 de un cursor o una ventana con
// cursor que llega vacía), las demás ventanas de la clase en la caché quedan marcadas viejas, para que
// "Vuelve a abrir Calificaciones" pida otra vez la primera ventana aunque no hayan pasado los 30 s del
// staleTime de la app. Corre una vez por ocurrencia (la clave cambia con cada respuesta o fallo nuevo).
// Sin recargar nada ahora (refetchType "none") y sin tocar la ventana a la vista: así la ventana rota no
// se vuelve a pedir sola (ni en bucle) y la pantalla actual no cambia; las otras se piden al mostrarse.
export const useMarcarViejoElGradebook = (
  claseId: string,
  ventana: VentanaDelGradebook,
  ocurrencia: string | null,
) => {
  const queryClient = useQueryClient()
  const actual = hashKey(claveGradebook(claseId, ventana))
  useEffect(() => {
    if (ocurrencia === null) return
    void queryClient.invalidateQueries({
      queryKey: clavePrefijoDeCalificaciones(claseId),
      predicate: (query) => query.queryHash !== actual,
      refetchType: "none",
    })
  }, [actual, claseId, ocurrencia, queryClient])
}

export { useAlPulsarLaSeccionActiva } from "@/components/seccion/hooks"

// T-08: marca vieja la primera ventana del gradebook y, si es la que se observa, la vuelve a pedir;
// si no, se pide al volver a ella. Nunca cancela ni duplica una petición en vuelo de esa ventana.
export const useRecargarLaPrimeraVentana = (claseId: string) => {
  const queryClient = useQueryClient()
  return useCallback(() => {
    void queryClient.invalidateQueries(
      { queryKey: claveGradebook(claseId, VENTANAS_INICIALES.ventana), exact: true },
      { cancelRefetch: false },
    )
  }, [claseId, queryClient])
}

// "Mis calificaciones" del alumno, por páginas, con el filtro en la clave.
export const useMisCalificaciones = (claseId: string, filtro: FiltroDeMisCalificaciones) =>
  useInfiniteQuery({
    queryKey: claveMisCalificaciones(claseId, filtro),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      api(rutaDeMisCalificaciones(claseId, filtro, pageParam, LIMITE_DE_MIS_CALIFICACIONES), {
        schema: misCalificacionesRespuestaSchema,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultimaPagina) => ultimaPagina.siguienteCursor ?? undefined,
  })

const LIMITES_DE_LA_EXPORTACION = {
  limite: LIMITE_DE_LA_EXPORTACION,
  limiteTareas: LIMITE_DE_LA_EXPORTACION,
}

// CALIFICACIONES-02b (§D-4): recorre las ventanas de la exportación, de una en una: por fuera las de
// tareas y, dentro de cada una, las páginas de alumnos. Un cursor que se repite en su dimensión es que
// la clase cambió. Con los totales de la primera respuesta decide si la clase cabe en 200 peticiones
// (M-03); si crece en medio, para al llegar a ese tope. Un error de la API se propaga a la mutación.
const recorrerLaExportacion = async (
  claseId: string,
  signal: AbortSignal,
): Promise<RecorridoDeExportacion> => {
  const ventanas: VentanaDeExportacion[] = []
  const cursoresDeTareas = new Set<string>()
  let cursorTareas: string | null = null
  let ventanaDeTareas = 0
  let peticiones = 0
  for (;;) {
    const cursoresDeAlumnos = new Set<string>()
    let cursor: string | null = null
    let siguienteCursorTareas: string | null
    do {
      if (peticiones >= MAXIMO_DE_PETICIONES_DE_EXPORTACION) return { tipo: "demasiado" }
      const respuesta: ExportacionDeCalificacionesRespuesta = await api(
        rutaDeExportacion(claseId, { cursor, cursorTareas }, LIMITES_DE_LA_EXPORTACION),
        { schema: exportacionDeCalificacionesRespuestaSchema, signal },
      )
      peticiones += 1
      const necesarias = ventanasDeLaExportacion(
        respuesta.totalAlumnos,
        respuesta.totalTareas,
        LIMITE_DE_LA_EXPORTACION,
      )
      // T-02: con los mismos totales, tampoco sigue si la hoja no cabe en los topes de Excel.
      const noCabe =
        necesarias > MAXIMO_DE_PETICIONES_DE_EXPORTACION ||
        !cabeEnUnaHoja(respuesta.totalAlumnos, respuesta.totalTareas)
      if (peticiones === 1 && noCabe) return { tipo: "demasiado" }
      ventanas.push({ ventanaDeTareas, respuesta })
      cursor = respuesta.siguienteCursor
      siguienteCursorTareas = respuesta.siguienteCursorTareas
      if (cursor !== null && cursoresDeAlumnos.has(cursor)) return { tipo: "cambio" }
      if (cursor !== null) cursoresDeAlumnos.add(cursor)
    } while (cursor !== null)
    if (siguienteCursorTareas === null) return { tipo: "ventanas", ventanas }
    if (cursoresDeTareas.has(siguienteCursorTareas)) return { tipo: "cambio" }
    cursoresDeTareas.add(siguienteCursorTareas)
    cursorTareas = siguienteCursorTareas
    ventanaDeTareas += 1
  }
}

// §D-7: recorre, combina, arma el libro y lo entrega al navegador. Si la señal se abortó (la vista se
// fue), no descarga nada. El resultado solo lleva el nombre del archivo: en la caché de mutaciones no
// queda ningún dato de los alumnos.
const exportarCalificaciones = async (
  claseId: string,
  signal: AbortSignal,
  ahora: Date,
): Promise<ResultadoDeLaExportacion> => {
  const recorrido = await recorrerLaExportacion(claseId, signal)
  if (recorrido.tipo !== "ventanas") return recorrido
  const combinacion = combinarVentanasDeExportacion(recorrido.ventanas)
  if (combinacion.tipo !== "matriz") return combinacion
  const libro = armarLibroXlsx(hojaDeExportacion(combinacion.matriz, ahora))
  const nombre = nombreDelArchivoDeExportacion(combinacion.matriz.clase, ahora)
  if (signal.aborted) return { tipo: "cancelado" }
  descargarArchivo(libro, nombre, TIPO_MIME_XLSX)
  return { tipo: "descargado", nombre }
}

// La exportación a Excel de toda la clase: una mutación (nunca sirve de la caché ni reintenta) sin
// avisos; los da el botón.
export const useExportarCalificaciones = (claseId: string) =>
  useMutation({
    mutationFn: ({ signal, ahora }: PeticionDeExportacion) =>
      exportarCalificaciones(claseId, signal, ahora),
  })
