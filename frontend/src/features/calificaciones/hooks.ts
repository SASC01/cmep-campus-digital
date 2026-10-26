import { gradebookRespuestaSchema, misCalificacionesRespuestaSchema } from "@campus/shared"
import {
  hashKey,
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useCallback, useEffect, useRef } from "react"
import { useLocation } from "react-router"

import { api } from "@/services/apiClient"
import {
  claveGradebook,
  claveMisCalificaciones,
  clavePrefijoDeCalificaciones,
} from "@/services/calificacionesService"

import {
  LIMITE_ALUMNOS_DEL_GRADEBOOK,
  LIMITE_DE_MIS_CALIFICACIONES,
  LIMITE_TAREAS_DEL_GRADEBOOK,
} from "./data"
import { rutaDeMisCalificaciones, rutaDelGradebook, VENTANAS_INICIALES } from "./lib"
import type { FiltroDeMisCalificaciones, VentanaDelGradebook } from "./types"

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

// T-08: pulsar la sección "Calificaciones" estando en ella navega a la misma ruta con otra
// location.key, pero la vista no se desmonta (el mismo caso que T-35 del muro). Corre `alPulsar` una vez
// por cada location.key nueva con la vista montada; la primera no cuenta.
export const useAlPulsarLaSeccionActiva = (alPulsar: () => void) => {
  const { key } = useLocation()
  const llaveRef = useRef(key)
  useEffect(() => {
    if (llaveRef.current === key) return
    llaveRef.current = key
    alPulsar()
  }, [key, alPulsar])
}

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
