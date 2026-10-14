import {
  comentarioPrivadoRespuestaSchema,
  entregaDeAlumnoRespuestaSchema,
  listaComentariosPrivadosRespuestaSchema,
  listaEntregasRespuestaSchema,
  miEntregaRespuestaSchema,
  sinContenidoSchema,
  tareaRespuestaSchema,
} from "@campus/shared"
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { useLocation } from "react-router"
import { toast } from "sonner"

import { baseDeClase, perspectivaDeRuta } from "@/lib/ruta-de-clase"
import { api, esApiError } from "@/services/apiClient"
import { clavePrefijoDeCalificaciones } from "@/services/calificacionesService"
import { clavePublicaciones } from "@/services/clasesService"
import {
  claveCategorias,
  clavePrefijoDelTrabajo,
  claveTarea,
  claveTemas,
  consultaCategorias,
  consultaTarea,
  consultaTemas,
} from "@/services/trabajoService"

import {
  CODIGOS_QUE_RENUEVAN_LA_TAREA,
  OPCIONES_QUE_CAMBIARON_POR_CODIGO,
  TEXTOS_CALIFICAR,
  TEXTOS_DETALLE_TAREA,
  TEXTOS_FORMULARIO_TAREA,
  TEXTOS_TU_TRABAJO,
} from "./data"
import {
  claveEntregaDeAlumno,
  claveHilo,
  claveListaDeEntregas,
  claveMiEntrega,
  clavePrefijoDeEntregas,
  errorDeEnlacesDeApi,
  errorDeTextoDeApi,
  erroresDeLaTareaDeApi,
  esConflictoDeCalificacion,
  esConflictoDeEntrega,
  erroresDeCalificacionDeApi,
  errorQueRedirigeElCliente,
  errorQueReemplazaLaVista,
  esEntregaVacia,
  esTareaConEntregas,
  mensajeDeErrorTareas,
  mensajeDelAvisoDeCalificar,
  mensajeDelCampoDeCalificacion,
  rutaDeBorrarTarea,
  rutaDeCalificacion,
  rutaDeEntregaDeAlumno,
  rutaDelHiloDeAlumno,
  rutaDeMiEntrega,
  rutaDePaginaDeEntregas,
  rutaDePaginaDelHilo,
} from "./lib"
import type {
  CrearComentario,
  CrearTarea,
  EditarTarea,
  Entregar,
  FalloDeLaConsulta,
  VariablesDeCalificar,
} from "./types"

// CALIFICACIONES-01d (§D-13.1): el gancho de foco vive en components/foco; se reexporta con su
// nombre para que ningún importador de este módulo cambie.
export { useFocoAlPerderseElControl } from "@/components/foco/hooks"

// §D-10 (Enmienda 4, C-13): el único lugar de features/tareas que llama a perspectivaDeRuta. Las tres
// vistas lo usan para sus enlaces y su navegación; la perspectiva solo decide qué se muestra, el
// backend decide qué se permite.
export const useRutaDeLaClase = (claseId: string) => {
  const { pathname } = useLocation()
  const perspectiva = perspectivaDeRuta(pathname)
  return { perspectiva, base: baseDeClase(perspectiva, claseId) }
}

export const useTarea = (claseId: string, tareaId: string) =>
  useQuery(consultaTarea(claseId, tareaId))

export const useTemasDeLaClase = (claseId: string) => useQuery(consultaTemas(claseId))

export const useCategoriasDeLaClase = (claseId: string) => useQuery(consultaCategorias(claseId))

// Crear, editar o borrar una tarea cambia el muro (exacto), "Trabajo de clase" (todas sus listas por
// prefijo), los temas y las categorías (sus conteos) y el detalle.
const invalidarTrasCambiar = async (
  queryClient: ReturnType<typeof useQueryClient>,
  claseId: string,
  tareaId: string | null,
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: clavePublicaciones(claseId), exact: true }),
    queryClient.invalidateQueries({ queryKey: clavePrefijoDelTrabajo(claseId) }),
    queryClient.invalidateQueries({ queryKey: claveTemas(claseId) }),
    queryClient.invalidateQueries({ queryKey: claveCategorias(claseId) }),
    ...(tareaId === null
      ? []
      : [queryClient.invalidateQueries({ queryKey: claveTarea(claseId, tareaId) })]),
  ])
}

// T-08: si el servidor dice que la categoría o el tema que se ofrecían ya no existen (o que la clase ganó
// categorías), la lista que ofrece el formulario está vieja: se vuelve a pedir, y el formulario deja el
// campo en su opción vacía si la elegida ya no está. Es el mismo remedio para crear y para editar.
const pedirDeNuevoLasOpciones = async (
  queryClient: ReturnType<typeof useQueryClient>,
  claseId: string,
  error: unknown,
) => {
  if (!esApiError(error)) return
  if (!Object.hasOwn(OPCIONES_QUE_CAMBIARON_POR_CODIGO, error.codigo)) return
  const lista = OPCIONES_QUE_CAMBIARON_POR_CODIGO[error.codigo]
  const clave = lista === "temas" ? claveTemas(claseId) : claveCategorias(claseId)
  await queryClient.invalidateQueries({ queryKey: clave })
}

// T-11: si el servidor niega borrar o guardar porque la tarea ya no existe, ya no se puede editar o
// borrar, o se perdió el acceso a la clase, la tarea que se tiene en caché está vieja: se vuelve a pedir
// para que la vista reaccione (el permiso que pasa a false, el 404 o el 403 de la recarga). Con un 404
// la tarea además salió del muro, del trabajo de clase, de los temas y de las categorías.
const pedirDeNuevoLaTarea = async (
  queryClient: ReturnType<typeof useQueryClient>,
  claseId: string,
  tareaId: string,
  error: unknown,
) => {
  if (!esApiError(error)) return
  // ENTREGAS-01e (§D-10.3): en el hilo de un alumno, ALUMNO_NO_ENCONTRADO dice que su entrega ya no se
  // puede ver: se vuelven a pedir las entregas de la tarea (la de ese alumno responde su 404 y la vista
  // se reemplaza). Solo lo responden las rutas de los maestros y del admin.
  if (error.codigo === "ALUMNO_NO_ENCONTRADO") {
    await queryClient.invalidateQueries({ queryKey: clavePrefijoDeEntregas(claseId, tareaId) })
    return
  }
  if (!CODIGOS_QUE_RENUEVAN_LA_TAREA.includes(error.codigo)) return
  if (error.codigo === "TAREA_NO_ENCONTRADA") {
    await invalidarTrasCambiar(queryClient, claseId, tareaId)
    return
  }
  await queryClient.invalidateQueries({ queryKey: claveTarea(claseId, tareaId) })
}

// Los avisos viven en el hook y no en los callbacks de mutate (patrón T-30): corren aunque la vista
// ya no esté montada. Un error de un campo lo marca el formulario; los demás, un aviso.
export const useCrearTarea = (claseId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (datos: CrearTarea) =>
      api(`/api/clases/${claseId}/tareas`, {
        method: "POST",
        body: datos,
        schema: tareaRespuestaSchema,
      }),
    onSuccess: ({ tarea }) => {
      void invalidarTrasCambiar(queryClient, claseId, tarea.id)
      toast.success(TEXTOS_FORMULARIO_TAREA.avisoPublicada)
    },
    onError: (error) => {
      void pedirDeNuevoLasOpciones(queryClient, claseId, error)
      if (erroresDeLaTareaDeApi(error)) return
      toast.error(mensajeDeErrorTareas(error))
    },
  })
}

export const useEditarTarea = (claseId: string, tareaId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    // ENTREGAS-01a (P-05 a′): el cuerpo lleva la versión con que se abrió el formulario.
    mutationFn: (datos: EditarTarea) =>
      api(`/api/clases/${claseId}/tareas/${tareaId}`, {
        method: "PUT",
        body: datos,
        schema: tareaRespuestaSchema,
      }),
    onSuccess: () => {
      void invalidarTrasCambiar(queryClient, claseId, tareaId)
      toast.success(TEXTOS_FORMULARIO_TAREA.avisoGuardada)
    },
    onError: (error) => {
      void pedirDeNuevoLasOpciones(queryClient, claseId, error)
      void pedirDeNuevoLaTarea(queryClient, claseId, tareaId, error)
      if (erroresDeLaTareaDeApi(error)) return
      toast.error(mensajeDeErrorTareas(error))
    },
  })
}

// ENTREGAS-01e (§D-10.5.3, Enmienda 2): la variable de la mutación dice si se confirma borrar con las
// entregas (solo la segunda confirmación del admin la manda en true). Un 409 TAREA_CON_ENTREGAS no
// avisa: el mensaje va en línea, en la confirmación (un solo anuncio).
export const useBorrarTarea = (claseId: string, tareaId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (confirmarEntregas: boolean) =>
      api(rutaDeBorrarTarea(claseId, tareaId, confirmarEntregas), {
        method: "DELETE",
        schema: sinContenidoSchema,
      }),
    onSuccess: async () => {
      toast.success(TEXTOS_DETALLE_TAREA.avisoBorrada)
      // El detalle ya no existe: se marca vieja sin volver a pedirla (daría 404 mientras la vista
      // navega a Trabajo de clase).
      await queryClient.invalidateQueries({
        queryKey: claveTarea(claseId, tareaId),
        refetchType: "none",
      })
      await invalidarTrasCambiar(queryClient, claseId, null)
    },
    onError: (error) => {
      void pedirDeNuevoLaTarea(queryClient, claseId, tareaId, error)
      if (esTareaConEntregas(error)) return
      toast.error(mensajeDeErrorTareas(error))
    },
  })
}

// M-01 y T-12: el aviso (no intrusivo, sin desmontar nada) de una recarga fallida con la tarea en caché.
// Se avisa por cada fallo nuevo de la consulta, no cada vez que una vista se monta con el error ya en
// caché (abrir "Editar tarea" o volver al detalle tras un fallo ya avisado no repite el aviso). Lo último
// avisado se guarda fuera del componente, por consulta (la instancia de la caché), con el contador de
// errores de la consulta y su fecha: dos fallos seguidos avisan dos veces aunque caigan en el mismo
// milisegundo, y StrictMode (que ejecuta el efecto dos veces) no duplica el aviso.
// CALIFICACIONES-01c (M-07): `callado` es un fallo que la vista tiene a la vista pero no anuncia (la
// entrega de un alumno la reemplazó, o se está volviendo a pedir y aún no se sabe). Si la vista se
// desmonta así, el fallo queda como atendido sin aviso: la siguiente vista de la tarea no lo repite y
// solo anuncia los fallos de sus propias recargas. Si deja de estar callado con la vista montada (la
// entrega vuelve bien), se anuncia una vez como siempre.
const ultimoFalloAvisado = new WeakMap<object, string>()

export const useAvisoDeRecargaFallida = (
  claseId: string,
  tareaId: string,
  activo: boolean,
  fallo: FalloDeLaConsulta,
  texto: string,
  callado = false,
) => {
  const queryClient = useQueryClient()
  const marca = `${fallo.errorUpdateCount}:${fallo.errorUpdatedAt}`
  const alSalirRef = useRef({ callado, marca })
  useEffect(() => {
    alSalirRef.current = { callado, marca }
  })
  useEffect(() => {
    const alSalir = alSalirRef
    return () => {
      if (!alSalir.current.callado) return
      const consulta = queryClient
        .getQueryCache()
        .find({ queryKey: claveTarea(claseId, tareaId), exact: true })
      if (consulta !== undefined) ultimoFalloAvisado.set(consulta, alSalir.current.marca)
    }
  }, [queryClient, claseId, tareaId])
  useEffect(() => {
    if (!activo) return
    const consulta = queryClient
      .getQueryCache()
      .find({ queryKey: claveTarea(claseId, tareaId), exact: true })
    if (consulta !== undefined) {
      if (ultimoFalloAvisado.get(consulta) === marca) return
      ultimoFalloAvisado.set(consulta, marca)
    }
    toast.error(texto)
  }, [activo, marca, texto, queryClient, claseId, tareaId])

  // ENTREGAS-01e, ronda 1 (T-01): el error al descargar un adjunto en una vista de la tarea (la tarea,
  // "Tu trabajo" o la entrega de un alumno), para `alFallarLaDescarga` de AdjuntosDePublicacion. Si
  // apiClient ya redirigió, nada. Si no, la regla T-11 de las tareas (pedirDeNuevoLaTarea: un 404 de la
  // tarea, un 403 de la clase o un 404 del alumno vuelven a pedir lo que reemplaza la vista) y un solo
  // aviso por tarea perdida (avisarDelErrorDeLaEntrega), aunque otra petición en vuelo responda lo
  // mismo. Los demás errores (archivo, almacén, 5xx, red) avisan como siempre.
  return (error: unknown) => {
    if (errorQueRedirigeElCliente(error)) return
    void pedirDeNuevoLaTarea(queryClient, claseId, tareaId, error)
    avisarDelErrorDeLaEntrega(queryClient, claseId, tareaId, error)
  }
}

// ENTREGAS-01d (§D-9.2 a §D-9.4). La entrega del alumno que llama: verla, entregar y anular. Los
// avisos viven en el gancho (corren aunque la vista ya no esté montada). La respuesta de entregar y de
// anular reemplaza la consulta de la entrega y "Trabajo de clase" se marca viejo (la fila del alumno
// cambia de estado). Un 409 de la entrega avisa con el mensaje del servidor y vuelve a pedir la tarea y
// la entrega (la vista cambia sola a lo que corresponda); un 404 de la tarea renueva la tarea (T-11).
export const useMiEntrega = (claseId: string, tareaId: string) =>
  useQuery({
    queryKey: claveMiEntrega(claseId, tareaId),
    queryFn: () => api(rutaDeMiEntrega(claseId, tareaId), { schema: miEntregaRespuestaSchema }),
  })

// ENTREGAS-01d, ronda 1 (T-01 y T-02): una sola regla para lo que se renueva tras un error al entregar,
// al anular o al comentar en el hilo. Un 409 de la entrega dice que la que se ve ya no es la de ahora
// (otra pestaña, el maestro la calificó, o cerró o cambió la tarea): se vuelven a pedir la tarea y su
// entrega (la llave de la entrega cuelga de la de la tarea: una sola invalidación, una petición de cada
// una) y "Trabajo de clase" se marca viejo (la fila del alumno dice el estado de su entrega). Un 404 de la
// tarea, un 403 de la clase o un permiso que cambió siguen la regla de las tareas (T-11, con
// CODIGOS_QUE_RENUEVAN_LA_TAREA). Los demás (ENTREGA_VACIA, VALIDACION, archivos, almacén, 5xx, red) no
// renuevan nada: la entrega no cambió.
const renovarTrasErrorDeLaEntrega = async (
  queryClient: ReturnType<typeof useQueryClient>,
  claseId: string,
  tareaId: string,
  error: unknown,
) => {
  if (esConflictoDeEntrega(error)) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: claveTarea(claseId, tareaId) }),
      queryClient.invalidateQueries({ queryKey: clavePrefijoDelTrabajo(claseId) }),
    ])
    return
  }
  await pedirDeNuevoLaTarea(queryClient, claseId, tareaId, error)
}

// ENTREGAS-01d, ronda 2 (T-05): un solo aviso por error aunque varias peticiones en vuelo respondan lo
// mismo. Un error que reemplaza la vista (la tarea ya no existe, se perdió el acceso a la clase) se avisa
// una vez por la tarea que se tenía: entregar, anular y comentar a la vez con el mismo 404 dan un aviso.
// Lo avisado se guarda fuera del componente, por consulta de la tarea (la instancia de la caché), con la
// fecha de sus datos: si la tarea vuelve a cargarse, un fallo nuevo vuelve a avisar (mismo mecanismo que
// useAvisoDeRecargaFallida). Los demás errores avisan cada uno.
const tareaPerdidaAvisada = new WeakMap<object, number>()

const avisarDelErrorDeLaEntrega = (
  queryClient: ReturnType<typeof useQueryClient>,
  claseId: string,
  tareaId: string,
  error: unknown,
  mensajeDe: (error: unknown) => string = mensajeDeErrorTareas,
) => {
  const consulta = errorQueReemplazaLaVista(true, error)
    ? queryClient.getQueryCache().find({ queryKey: claveTarea(claseId, tareaId), exact: true })
    : undefined
  if (consulta !== undefined) {
    if (tareaPerdidaAvisada.get(consulta) === consulta.state.dataUpdatedAt) return
    tareaPerdidaAvisada.set(consulta, consulta.state.dataUpdatedAt)
  }
  toast.error(mensajeDe(error))
}

export const useEntregar = (claseId: string, tareaId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (datos: Entregar) =>
      api(rutaDeMiEntrega(claseId, tareaId), {
        method: "POST",
        body: datos,
        schema: miEntregaRespuestaSchema,
      }),
    onSuccess: (respuesta, datos) => {
      queryClient.setQueryData(claveMiEntrega(claseId, tareaId), respuesta)
      void queryClient.invalidateQueries({ queryKey: clavePrefijoDelTrabajo(claseId) })
      const vacia = datos.archivoIds.length === 0 && datos.enlaces.length === 0
      toast.success(vacia ? TEXTOS_TU_TRABAJO.avisoCompletada : TEXTOS_TU_TRABAJO.avisoEntregada)
    },
    onError: (error) => {
      void renovarTrasErrorDeLaEntrega(queryClient, claseId, tareaId, error)
      // La entrega vacía y un enlace inválido los marca el formulario bajo su grupo.
      if (esEntregaVacia(error) || errorDeEnlacesDeApi(error) !== null) return
      avisarDelErrorDeLaEntrega(queryClient, claseId, tareaId, error)
    },
  })
}

export const useAnularEntrega = (claseId: string, tareaId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api(`${rutaDeMiEntrega(claseId, tareaId)}/anular`, {
        method: "POST",
        schema: miEntregaRespuestaSchema,
      }),
    onSuccess: (respuesta) => {
      queryClient.setQueryData(claveMiEntrega(claseId, tareaId), respuesta)
      void queryClient.invalidateQueries({ queryKey: clavePrefijoDelTrabajo(claseId) })
      toast.success(TEXTOS_TU_TRABAJO.avisoAnulada)
    },
    onError: (error) => {
      void renovarTrasErrorDeLaEntrega(queryClient, claseId, tareaId, error)
      avisarDelErrorDeLaEntrega(queryClient, claseId, tareaId, error)
    },
  })
}

// ENTREGAS-01d (§D-9.6). El hilo privado de una ruta (la del alumno; en 01e, la de un alumno para sus
// maestros): del más antiguo al más reciente, de 20 en 20. Ronda 2 (T-05): si una página dice que la
// tarea ya no existe o que se perdió el acceso a la clase, la tarea se renueva (regla T-11) para que la
// vista pase a su mensaje; el aviso no sale de aquí.
export const useHiloPrivado = (claseId: string, tareaId: string, rutaDelHilo: string) => {
  const queryClient = useQueryClient()
  return useInfiniteQuery({
    queryKey: claveHilo(rutaDelHilo),
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      try {
        return await api(rutaDePaginaDelHilo(rutaDelHilo, pageParam), {
          schema: listaComentariosPrivadosRespuestaSchema,
        })
      } catch (error) {
        void pedirDeNuevoLaTarea(queryClient, claseId, tareaId, error)
        throw error
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultimaPagina) => ultimaPagina.siguienteCursor ?? undefined,
  })
}

export const useComentarEnHilo = (claseId: string, tareaId: string, rutaDelHilo: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (datos: CrearComentario) =>
      api(rutaDelHilo, { method: "POST", body: datos, schema: comentarioPrivadoRespuestaSchema }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: claveHilo(rutaDelHilo) })
    },
    onError: (error) => {
      // La misma regla que la entrega: un 404 de la tarea o un 403 de la clase renuevan la tarea.
      void renovarTrasErrorDeLaEntrega(queryClient, claseId, tareaId, error)
      // Un error del texto lo marca el formulario bajo el campo.
      if (errorDeTextoDeApi(error) !== null) return
      avisarDelErrorDeLaEntrega(queryClient, claseId, tareaId, error)
    },
  })
}

// ENTREGAS-01e (§D-10.2). Quiénes entregaron una tarea, para sus maestros y el admin: los alumnos de la
// clase de 20 en 20, con su entrega. Sin avisos ni renovaciones aquí: la vista decide qué reemplaza
// la lista y qué se avisa (la llave cuelga de la de la tarea, así que renovar desde aquí la volvería a
// pedir a ella misma).
export const useEntregasDeLaTarea = (claseId: string, tareaId: string) =>
  useInfiniteQuery({
    queryKey: claveListaDeEntregas(claseId, tareaId),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      api(rutaDePaginaDeEntregas(claseId, tareaId, pageParam), {
        schema: listaEntregasRespuestaSchema,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultimaPagina) => ultimaPagina.siguienteCursor ?? undefined,
  })

// ENTREGAS-01e (§D-10.3). La entrega de un alumno, para sus maestros y el admin.
export const useEntregaDeAlumno = (claseId: string, tareaId: string, alumnoId: string) =>
  useQuery({
    queryKey: claveEntregaDeAlumno(claseId, tareaId, alumnoId),
    queryFn: () =>
      api(rutaDeEntregaDeAlumno(claseId, tareaId, alumnoId), {
        schema: entregaDeAlumnoRespuestaSchema,
      }),
  })

// CALIFICACIONES-01c (§D-12.4). Calificar (o recalificar) la entrega de un alumno: un maestro de la
// clase. La respuesta reemplaza la entrega en caché; la lista de entregas, el gradebook y "Mis
// calificaciones" (el prefijo de calificaciones de la clase) y, si hubo comentario, el hilo de ese
// alumno se marcan viejos. Los avisos viven aquí (corren aunque la vista ya no esté montada).
// - Un 409 de calificar avisa con el mensaje del servidor y nada más: la recarga la hace la vista,
//   una sola vez (Enmienda 1, N-04).
// - Un error de un campo que el panel puede pintar no avisa: lo pinta el panel; uno de un campo que el
//   panel no tiene avisa con su mensaje (ronda 1, T-02). Si apiClient ya redirigió, nada.
// - Lo demás sigue la regla de las tareas (T-11: un 404 de la tarea o del alumno, o un 403 de la clase,
//   renuevan lo que reemplaza la vista) con un solo aviso por tarea perdida.
export const useCalificarEntrega = (claseId: string, tareaId: string, alumnoId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ cuerpo }: VariablesDeCalificar) =>
      api(rutaDeCalificacion(claseId, tareaId, alumnoId), {
        method: "PUT",
        body: cuerpo,
        schema: entregaDeAlumnoRespuestaSchema,
      }),
    onSuccess: (respuesta, { cuerpo, habiaCalificacion }) => {
      queryClient.setQueryData(claveEntregaDeAlumno(claseId, tareaId, alumnoId), respuesta)
      void queryClient.invalidateQueries({ queryKey: claveListaDeEntregas(claseId, tareaId) })
      void queryClient.invalidateQueries({ queryKey: clavePrefijoDeCalificaciones(claseId) })
      if (cuerpo.comentario !== undefined) {
        void queryClient.invalidateQueries({
          queryKey: claveHilo(rutaDelHiloDeAlumno(claseId, tareaId, alumnoId)),
        })
      }
      toast.success(
        habiaCalificacion ? TEXTOS_CALIFICAR.avisoActualizada : TEXTOS_CALIFICAR.avisoPublicada,
      )
    },
    onError: (error, { cuerpo }) => {
      if (esConflictoDeCalificacion(error)) {
        toast.error(mensajeDeErrorTareas(error))
        return
      }
      void pedirDeNuevoLaTarea(queryClient, claseId, tareaId, error)
      if (errorQueRedirigeElCliente(error)) return
      // Ronda 1 (T-02): calla solo si el panel puede pintar el error (con la misma regla y los mismos
      // criterios, los del envío, en su orden); un campo que el panel no tiene se avisa una vez.
      const criteriosEnviados = cuerpo.puntajes.map(({ criterioId }) => ({ id: criterioId }))
      if (erroresDeCalificacionDeApi(error, criteriosEnviados) !== null) return
      const sinLugar = mensajeDelCampoDeCalificacion(error)
      if (sinLugar !== null) {
        toast.error(sinLugar)
        return
      }
      // Ronda 2 (T-04): sin el prefijo de ruta que el panel no reconoce.
      avisarDelErrorDeLaEntrega(queryClient, claseId, tareaId, error, mensajeDelAvisoDeCalificar)
    },
  })
}
