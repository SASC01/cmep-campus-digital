import {
  agregarAlumnoRespuestaSchema,
  candidatosRespuestaSchema,
  claseRespuestaSchema,
  codigoClaseRespuestaSchema,
  comentarioRespuestaSchema,
  descargaRespuestaSchema,
  listaAlumnosRespuestaSchema,
  listaClasesImpartidasRespuestaSchema,
  listaClasesInscritasRespuestaSchema,
  listaComentariosRespuestaSchema,
  listaPublicacionesRespuestaSchema,
  personasRespuestaSchema,
  publicacionRespuestaSchema,
  sinContenidoSchema,
  solicitarSubidaRespuestaSchema,
  unirseRespuestaSchema,
  type CrearClase,
  type CrearComentario,
  type CrearPublicacion,
  type EditarClase,
  type SolicitarSubida,
  type Unirse,
} from "@campus/shared"
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { consultaMe } from "@/services/sesionService"
import { api } from "@/services/apiClient"

import {
  CLAVE_CLASES_IMPARTIDAS,
  CLAVE_CLASES_INSCRITAS,
  claveAlumnos,
  claveCandidatos,
  claveClaseDetalle,
  claveCodigoDeClase,
  claveComentarios,
  clavePersonas,
  clavePublicaciones,
  LIMITE_CANDIDATOS,
  LIMITE_CLASES,
  LIMITE_COMENTARIOS,
  LIMITE_PERSONAS,
  LIMITE_PUBLICACIONES,
  TEXTOS_BUSCADOR_ALUMNOS,
  TEXTOS_COMENTARIOS,
  TEXTOS_FORMULARIO_PUBLICACION,
  TEXTOS_MURO,
  TIEMPO_FRESCO_DEL_MURO_MS,
} from "./data"
import {
  erroresDeFormularioClases,
  focoPerdido,
  mensajeDeErrorClases,
  terminoDeBusquedaValido,
  tiempoFrescoDelMuro,
} from "./lib"

// El saludo del bloque destacado depende solo de la sesión (§D-A5): se ve aunque falle la consulta
// de clases. select evita volver a pedir /me: reutiliza la caché de consultaMe.
export const useNombreDeSesion = () => useQuery({ ...consultaMe, select: (me) => me.nombre })

const conCursor = (limite: number, cursor?: string): string => {
  const parametros = new URLSearchParams({ limite: String(limite) })
  if (cursor !== undefined) parametros.set("cursor", cursor)
  return parametros.toString()
}

export const useClasesInscritas = () =>
  useInfiniteQuery({
    queryKey: CLAVE_CLASES_INSCRITAS,
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      api(`/api/clases/inscritas?${conCursor(LIMITE_CLASES, pageParam)}`, {
        schema: listaClasesInscritasRespuestaSchema,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultimaPagina) => ultimaPagina.siguienteCursor ?? undefined,
  })

export const useClasesImpartidas = () =>
  useInfiniteQuery({
    queryKey: CLAVE_CLASES_IMPARTIDAS,
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      api(`/api/clases/impartidas?${conCursor(LIMITE_CLASES, pageParam)}`, {
        schema: listaClasesImpartidasRespuestaSchema,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultimaPagina) => ultimaPagina.siguienteCursor ?? undefined,
  })

export const useClase = (claseId: string) =>
  useQuery({
    queryKey: claveClaseDetalle(claseId),
    queryFn: () => api(`/api/clases/${claseId}`, { schema: claseRespuestaSchema }),
    select: (respuesta) => respuesta.clase,
  })

// enabled: solo el dueño pide el código (PR-A22e); un estudiante nunca llega a pedirlo.
export const useCodigoDeClase = (claseId: string, enabled: boolean) =>
  useQuery({
    queryKey: claveCodigoDeClase(claseId),
    queryFn: () => api(`/api/clases/${claseId}/codigo`, { schema: codigoClaseRespuestaSchema }),
    select: (respuesta) => respuesta.codigo,
    enabled,
    staleTime: 0,
    gcTime: 0,
  })

// Invalida las listas propias del rol tras crear, editar o unirse: los inicios y el panel quedan
// al día sin recargar.
const invalidarListasDeClases = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_INSCRITAS })
  void queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_IMPARTIDAS })
}

export const useCrearClase = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (datos: CrearClase) =>
      api("/api/clases", { method: "POST", body: datos, schema: claseRespuestaSchema }),
    onSuccess: () => invalidarListasDeClases(queryClient),
  })
}

export const useEditarClase = (claseId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (datos: EditarClase) =>
      api(`/api/clases/${claseId}`, {
        method: "PUT",
        body: datos,
        schema: claseRespuestaSchema,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: claveClaseDetalle(claseId) })
      invalidarListasDeClases(queryClient)
    },
  })
}

export const useRegenerarCodigo = (claseId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api(`/api/clases/${claseId}/codigo`, {
        method: "POST",
        schema: codigoClaseRespuestaSchema,
      }),
    onSuccess: (respuesta) => {
      queryClient.setQueryData(claveCodigoDeClase(claseId), respuesta)
    },
  })
}

export const useUnirseAClase = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (datos: Unirse) =>
      api("/api/clases/unirse", { method: "POST", body: datos, schema: unirseRespuestaSchema }),
    onSuccess: () => invalidarListasDeClases(queryClient),
  })
}

// CLASES-b (§D-B5).
export const usePersonas = (claseId: string) =>
  useInfiniteQuery({
    queryKey: clavePersonas(claseId),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      api(`/api/clases/${claseId}/personas?${conCursor(LIMITE_PERSONAS, pageParam)}`, {
        schema: personasRespuestaSchema,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultimaPagina) => ultimaPagina.siguienteCursor ?? undefined,
  })

export const useAlumnos = (claseId: string) =>
  useInfiniteQuery({
    queryKey: claveAlumnos(claseId),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      api(`/api/clases/${claseId}/alumnos?${conCursor(LIMITE_PERSONAS, pageParam)}`, {
        schema: listaAlumnosRespuestaSchema,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultimaPagina) => ultimaPagina.siguienteCursor ?? undefined,
  })

// Solo pregunta con un término que el servidor aceptaría (terminoDeBusquedaValido); con menos de 3
// letras no hace ninguna petición (RN-04).
export const useCandidatos = (claseId: string, termino: string) =>
  useQuery({
    queryKey: [...claveCandidatos(claseId), termino],
    queryFn: () => {
      const parametros = new URLSearchParams({ q: termino, limite: String(LIMITE_CANDIDATOS) })
      return api(`/api/clases/${claseId}/alumnos/candidatos?${parametros.toString()}`, {
        schema: candidatosRespuestaSchema,
      })
    },
    enabled: terminoDeBusquedaValido(termino),
  })

// Tras agregar o quitar, el roster, el buscador (el "Ya está en la clase" de cada fila), los
// compañeros de esa clase y el contador de alumnos de "Mis clases" quedan al día.
const invalidarPersonasDeLaClase = (
  queryClient: ReturnType<typeof useQueryClient>,
  claseId: string,
) => {
  void queryClient.invalidateQueries({ queryKey: claveAlumnos(claseId) })
  void queryClient.invalidateQueries({ queryKey: claveCandidatos(claseId) })
  void queryClient.invalidateQueries({ queryKey: clavePersonas(claseId) })
  void queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_IMPARTIDAS })
}

export const useAgregarAlumno = (claseId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (alumnoId: string) =>
      api(`/api/clases/${claseId}/alumnos`, {
        method: "POST",
        body: { alumnoId },
        schema: agregarAlumnoRespuestaSchema,
      }),
    // §D-C5 bis: los avisos viven aquí y no en los callbacks de mutate de la fila. Si la persona escribe
    // otro término con el POST en vuelo, la fila se desmonta y TanStack Query no llama a los callbacks
    // de mutate; los de useMutation corren aunque el componente ya no exista.
    onSuccess: (respuesta) => {
      invalidarPersonasDeLaClase(queryClient, claseId)
      if (respuesta.yaEstaba) {
        toast(TEXTOS_BUSCADOR_ALUMNOS.yaEstaba(respuesta.alumno.nombre))
        return
      }
      toast.success(TEXTOS_BUSCADOR_ALUMNOS.agregado(respuesta.alumno.nombre))
    },
    onError: (error) => toast.error(mensajeDeErrorClases(error)),
  })
}

export const useQuitarAlumno = (claseId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (alumnoId: string) =>
      api(`/api/clases/${claseId}/alumnos/${alumnoId}`, {
        method: "DELETE",
        schema: sinContenidoSchema,
      }),
    onSuccess: () => invalidarPersonasDeLaClase(queryClient, claseId),
  })
}

// Devuelve `valor` después de `ms` sin cambios: el buscador espera 300 ms desde la última tecla
// antes de preguntar (RN-04).
export const useTerminoDiferido = (valor: string, ms: number): string => {
  const [diferido, setDiferido] = useState(valor)
  useEffect(() => {
    const temporizador = setTimeout(() => setDiferido(valor), ms)
    return () => clearTimeout(temporizador)
  }, [valor, ms])
  return diferido
}

// Foco que sobrevive cuando su control se desmonta o se reemplaza (T-21 a T-26, DESIGN.md §7.14).
// Un control con el foco que desaparece lo deja en <body>, y el navegador no avisa con ningún
// evento: por eso se recuerda qué fila tiene el foco y cada componente reacciona después de cada
// render, sin depender del onSuccess de ninguna petición (un componente desmontado no lo recibe).
//
// useFilaEnFoco(atributo) devuelve un ref con el valor del atributo `data-…` de la fila que tiene el
// foco, o null: focusin lo marca al entrar a una fila (y lo borra al ir a otro lado) y focusout lo
// borra si la persona se fue a ningún elemento (un clic en blanco) y el control sigue en el
// documento.
export const useFilaEnFoco = (atributo: string) => {
  const filaEnFoco = useRef<string | null>(null)
  useEffect(() => {
    const alEntrar = (evento: FocusEvent) => {
      const fila = evento.target instanceof Element ? evento.target.closest(`[${atributo}]`) : null
      filaEnFoco.current = fila?.getAttribute(atributo) ?? null
    }
    const alSalir = (evento: FocusEvent) => {
      const objetivo = evento.target
      if (evento.relatedTarget !== null || !(objetivo instanceof Element)) return
      setTimeout(() => {
        if (objetivo.isConnected) filaEnFoco.current = null
      }, 0)
    }
    document.addEventListener("focusin", alEntrar)
    document.addEventListener("focusout", alSalir)
    return () => {
      document.removeEventListener("focusin", alEntrar)
      document.removeEventListener("focusout", alSalir)
    }
  }, [atributo])
  return filaEnFoco
}

// "Ver más" (T-26, T-28): se desmonta con el foco dentro al cargar la última página. Devuelve el ref
// que va en ese botón. Mueve el foco SOLO si el botón estaba montado en el render anterior, ya no lo
// está en este y tenía el foco al desmontarse; con el botón montado nunca lo mueve, aunque el foco
// esté en <body> (un render sin desmontaje no mueve nada). La marca "tenía el foco" se borra con un
// focusin en otro elemento y con un focusout del botón que no lleva a ningún elemento mientras
// sigue conectado (un clic en blanco).
// Destino: el primer elemento nuevo (`enfocarFila` devuelve false si no pudo) o, si no llegó nada, el
// encabezado de la lista (`enfocarEncabezado`). Defensa (T-27): si después de eso el foco sigue
// perdido (el destino no existía o no estaba conectado), va al primer elemento enfocable y conectado
// de la sección donde estaba el botón y, si no hay ninguno, no se mueve.
export const useFocoAlCargarMas = (
  ids: string[] | undefined,
  enfocarFila: (id: string) => boolean,
  enfocarEncabezado: () => void,
) => {
  const botonRef = useRef<HTMLButtonElement | null>(null)
  const teniaElFoco = useRef(false)
  const estabaMontado = useRef(false)
  const seccionDelBoton = useRef<Element | null>(null)
  const idsPrevios = useRef<string[] | undefined>(undefined)

  useEffect(() => {
    const alEntrar = (evento: FocusEvent) => {
      teniaElFoco.current = botonRef.current !== null && evento.target === botonRef.current
    }
    const alSalir = (evento: FocusEvent) => {
      const boton = botonRef.current
      if (boton === null || evento.target !== boton || evento.relatedTarget !== null) return
      setTimeout(() => {
        if (boton.isConnected) teniaElFoco.current = false
      }, 0)
    }
    document.addEventListener("focusin", alEntrar)
    document.addEventListener("focusout", alSalir)
    return () => {
      document.removeEventListener("focusin", alEntrar)
      document.removeEventListener("focusout", alSalir)
    }
  }, [])

  useEffect(() => {
    const previos = idsPrevios.current
    idsPrevios.current = ids
    const montadoAntes = estabaMontado.current
    const montadoAhora = botonRef.current !== null
    estabaMontado.current = montadoAhora
    if (montadoAhora) {
      seccionDelBoton.current = botonRef.current?.closest("section, [data-slot='card']") ?? null
      return
    }
    if (!(montadoAntes && teniaElFoco.current)) return
    teniaElFoco.current = false
    if (!focoPerdido(document)) return
    const nuevo = ids?.find((id) => previos?.includes(id) !== true)
    if (nuevo !== undefined && enfocarFila(nuevo)) return
    enfocarEncabezado()
    if (!focoPerdido(document)) return
    const seccion = seccionDelBoton.current
    if (seccion === null || !seccion.isConnected) return
    seccion.querySelector<HTMLElement>("button, a[href], input, [tabindex]")?.focus()
  })

  return botonRef
}

// CLASES-c (§D-C2, §D-C5). El muro y los comentarios paginan de 20 en 20, con el cursor del servidor.
export const usePublicaciones = (claseId: string) =>
  useInfiniteQuery({
    queryKey: clavePublicaciones(claseId),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      api(`/api/clases/${claseId}/publicaciones?${conCursor(LIMITE_PUBLICACIONES, pageParam)}`, {
        schema: listaPublicacionesRespuestaSchema,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultimaPagina) => ultimaPagina.siguienteCursor ?? undefined,
    // d (T-40): las vistas previas del muro son URL firmadas; el muro se vuelve viejo antes de que
    // venza la primera. dataUpdatedAt se renueva con cada página, por eso es una función.
    staleTime: (consulta) => {
      const datos = consulta.state.data
      if (datos === undefined) return TIEMPO_FRESCO_DEL_MURO_MS
      return tiempoFrescoDelMuro(datos.pages, consulta.state.dataUpdatedAt)
    },
  })

// Los conteos de comentarios de cada publicación salen de la lista del muro: tras comentar o borrar
// un comentario, solo esa consulta (exact) se vuelve a pedir, junto con los comentarios abiertos.
const invalidarMuro = (queryClient: ReturnType<typeof useQueryClient>, claseId: string) => {
  void queryClient.invalidateQueries({ queryKey: clavePublicaciones(claseId), exact: true })
}

export const useCrearPublicacion = (claseId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (datos: CrearPublicacion) =>
      api(`/api/clases/${claseId}/publicaciones`, {
        method: "POST",
        body: datos,
        schema: publicacionRespuestaSchema,
      }),
    // T-30: los avisos viven aquí y no en los callbacks de mutate: los de useMutation corren aunque
    // el formulario ya no esté montado. Un error de campo lo muestra el formulario, no un aviso.
    onSuccess: () => {
      invalidarMuro(queryClient, claseId)
      toast.success(TEXTOS_FORMULARIO_PUBLICACION.avisoPublicado)
    },
    onError: (error) => {
      if (erroresDeFormularioClases(error, ["titulo", "texto"])) return
      toast.error(mensajeDeErrorClases(error))
    },
  })
}

// Los avisos de los borrados viven aquí y no en los callbacks de mutate: al borrar, el componente
// desaparece cuando llega la lista nueva y TanStack Query no llamaría a esos callbacks (§D-C5 bis).
export const useBorrarPublicacion = (claseId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (publicacionId: string) =>
      api(`/api/clases/${claseId}/publicaciones/${publicacionId}`, {
        method: "DELETE",
        schema: sinContenidoSchema,
      }),
    onSuccess: () => {
      invalidarMuro(queryClient, claseId)
      toast.success(TEXTOS_MURO.avisoPublicacionBorrada)
    },
    onError: (error) => toast.error(mensajeDeErrorClases(error)),
  })
}

// Los comentarios se piden solo mientras la publicación está abierta: el componente que usa este
// hook se monta al abrirla.
export const useComentarios = (claseId: string, publicacionId: string) =>
  useInfiniteQuery({
    queryKey: claveComentarios(claseId, publicacionId),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      api(
        `/api/clases/${claseId}/publicaciones/${publicacionId}/comentarios?${conCursor(LIMITE_COMENTARIOS, pageParam)}`,
        { schema: listaComentariosRespuestaSchema },
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultimaPagina) => ultimaPagina.siguienteCursor ?? undefined,
  })

const invalidarComentarios = (
  queryClient: ReturnType<typeof useQueryClient>,
  claseId: string,
  publicacionId: string,
) => {
  void queryClient.invalidateQueries({ queryKey: claveComentarios(claseId, publicacionId) })
  invalidarMuro(queryClient, claseId)
}

export const useComentar = (claseId: string, publicacionId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (datos: CrearComentario) =>
      api(`/api/clases/${claseId}/publicaciones/${publicacionId}/comentarios`, {
        method: "POST",
        body: datos,
        schema: comentarioRespuestaSchema,
      }),
    // T-30: mismo criterio que useCrearPublicacion.
    onSuccess: () => {
      invalidarComentarios(queryClient, claseId, publicacionId)
      toast.success(TEXTOS_COMENTARIOS.avisoComentado)
    },
    onError: (error) => {
      if (erroresDeFormularioClases(error, ["texto"])) return
      toast.error(mensajeDeErrorClases(error))
    },
  })
}

// El maestro dueño borra cualquier comentario de su clase.
export const useBorrarComentario = (claseId: string, publicacionId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (comentarioId: string) =>
      api(`/api/clases/${claseId}/publicaciones/${publicacionId}/comentarios/${comentarioId}`, {
        method: "DELETE",
        schema: sinContenidoSchema,
      }),
    onSuccess: () => {
      invalidarComentarios(queryClient, claseId, publicacionId)
      toast.success(TEXTOS_COMENTARIOS.avisoComentarioBorrado)
    },
    onError: (error) => toast.error(mensajeDeErrorClases(error)),
  })
}

// Cada persona borra el suyo («mis comentarios»).
export const useBorrarMiComentario = (claseId: string, publicacionId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (comentarioId: string) =>
      api(`/api/clases/${claseId}/mis-comentarios/${comentarioId}`, {
        method: "DELETE",
        schema: sinContenidoSchema,
      }),
    onSuccess: () => {
      invalidarComentarios(queryClient, claseId, publicacionId)
      toast.success(TEXTOS_COMENTARIOS.avisoComentarioBorrado)
    },
    onError: (error) => toast.error(mensajeDeErrorClases(error)),
  })
}

// CLASES-d (§D-D3, §D-D5). Pide una URL prefirmada para subir un archivo directo al almacén. Sin
// avisos propios: el formulario decide qué decirle a la persona según en qué paso falló.
export const useSolicitarSubida = (claseId: string) =>
  useMutation({
    mutationFn: (datos: SolicitarSubida) =>
      api(`/api/clases/${claseId}/archivos`, {
        method: "POST",
        body: datos,
        schema: solicitarSubidaRespuestaSchema,
      }),
  })

// Pide la URL de descarga de un adjunto (5 minutos de vigencia); quien la usa decide qué hacer con
// ella y avisa si falla.
export const useUrlDeDescarga = (claseId: string) =>
  useMutation({
    mutationFn: (archivoId: string) =>
      api(`/api/clases/${claseId}/archivos/${archivoId}/descarga`, {
        method: "POST",
        schema: descargaRespuestaSchema,
      }),
  })
