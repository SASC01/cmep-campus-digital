import { sinContenidoSchema, tareaRespuestaSchema } from "@campus/shared"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
} from "./data"
import { erroresDeLaTareaDeApi, mensajeDeErrorTareas } from "./lib"
import type { CrearTarea, FalloDeLaConsulta } from "./types"

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
    mutationFn: (datos: CrearTarea) =>
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
