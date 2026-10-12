import {
  comentarioPrivadoRespuestaSchema,
  listaComentariosPrivadosRespuestaSchema,
  miEntregaRespuestaSchema,
  sinContenidoSchema,
  tareaRespuestaSchema,
} from "@campus/shared"
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, type RefObject } from "react"
import { useLocation } from "react-router"
import { toast } from "sonner"

import { baseDeClase, perspectivaDeRuta } from "@/lib/ruta-de-clase"
import { api, esApiError } from "@/services/apiClient"
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
  TEXTOS_DETALLE_TAREA,
  TEXTOS_FORMULARIO_TAREA,
  TEXTOS_TU_TRABAJO,
} from "./data"
import {
  claveHilo,
  claveMiEntrega,
  errorDeEnlacesDeApi,
  errorDeTextoDeApi,
  erroresDeLaTareaDeApi,
  esConflictoDeEntrega,
  errorQueReemplazaLaVista,
  esEntregaVacia,
  mensajeDeErrorTareas,
  rutaDeMiEntrega,
  rutaDePaginaDelHilo,
} from "./lib"
import type { CrearComentario, CrearTarea, EditarTarea, Entregar, FalloDeLaConsulta } from "./types"

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

export const useBorrarTarea = (claseId: string, tareaId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api(`/api/clases/${claseId}/tareas/${tareaId}`, {
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
const ultimoFalloAvisado = new WeakMap<object, string>()

export const useAvisoDeRecargaFallida = (
  claseId: string,
  tareaId: string,
  activo: boolean,
  fallo: FalloDeLaConsulta,
  texto: string,
) => {
  const queryClient = useQueryClient()
  const marca = `${fallo.errorUpdateCount}:${fallo.errorUpdatedAt}`
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
}

// T-09 y T-14 (DESIGN.md §7.14): si el control que tenía el foco desaparece porque una recarga cambió lo
// que la vista muestra (un permiso que pasa a false, la tarea que ya no existe, un error, otra tarea),
// el foco no cae en <body>: va al contenedor de la vista (tabIndex -1). `clave` resume lo que la vista
// muestra; el foco se recoloca solo cuando cambia, solo si el control que lo tenía estaba dentro del
// contenedor y ya no está en el documento. Mismo criterio que useFilaEnFoco de features/clases: dentro
// lo marca un focusin; un focusout sin destino con el control aún en el documento (un clic en blanco,
// dentro o fuera de la vista) lo borra, para no robar el foco a quien lo soltó. Al cambiar de pestaña o
// de aplicación el navegador también dispara ese focusout, pero el control sigue siendo el elemento
// activo del documento y la ventana pierde el foco: la memoria se conserva. (Aquí el criterio de la
// ventana es el elemento activo, no document.hasFocus(): en un clic en blanco el elemento activo pasa a
// <body>, y al cambiar de pestaña sigue siendo el control.)
export const useFocoAlPerderseElControl = (
  contenedorRef: RefObject<HTMLElement | null>,
  clave: string,
) => {
  const controlRef = useRef<Element | null>(null)
  const ventanaConFoco = useRef(true)

  useEffect(() => {
    const alEnfocar = (evento: FocusEvent) => {
      const contenedor = contenedorRef.current
      const destino = evento.target
      const dentro =
        contenedor !== null && destino instanceof Element && contenedor.contains(destino)
      controlRef.current = dentro ? destino : null
    }
    const alSalir = (evento: FocusEvent) => {
      const objetivo = evento.target
      if (evento.relatedTarget !== null || !(objetivo instanceof Element)) return
      setTimeout(() => {
        if (!objetivo.isConnected || !ventanaConFoco.current) return
        if (document.activeElement === objetivo) return
        if (controlRef.current === objetivo) controlRef.current = null
      }, 0)
    }
    const alPerderLaVentana = () => {
      ventanaConFoco.current = false
    }
    const alRecuperarLaVentana = () => {
      ventanaConFoco.current = true
    }
    const alCambiarLaVisibilidad = () => {
      ventanaConFoco.current = !document.hidden
    }
    document.addEventListener("focusin", alEnfocar)
    document.addEventListener("focusout", alSalir)
    document.addEventListener("visibilitychange", alCambiarLaVisibilidad)
    window.addEventListener("blur", alPerderLaVentana)
    window.addEventListener("focus", alRecuperarLaVentana)
    return () => {
      document.removeEventListener("focusin", alEnfocar)
      document.removeEventListener("focusout", alSalir)
      document.removeEventListener("visibilitychange", alCambiarLaVisibilidad)
      window.removeEventListener("blur", alPerderLaVentana)
      window.removeEventListener("focus", alRecuperarLaVentana)
    }
  }, [contenedorRef])

  useEffect(() => {
    const control = controlRef.current
    if (control === null || control.isConnected) return
    const activo = document.activeElement
    if (activo !== null && activo !== document.body && activo.isConnected) return
    controlRef.current = null
    contenedorRef.current?.focus()
  }, [clave, contenedorRef])
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
) => {
  const consulta = errorQueReemplazaLaVista(true, error)
    ? queryClient.getQueryCache().find({ queryKey: claveTarea(claseId, tareaId), exact: true })
    : undefined
  if (consulta !== undefined) {
    if (tareaPerdidaAvisada.get(consulta) === consulta.state.dataUpdatedAt) return
    tareaPerdidaAvisada.set(consulta, consulta.state.dataUpdatedAt)
  }
  toast.error(mensajeDeErrorTareas(error))
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
