import {
  CONFIRMAR_BORRADO_DE_CLASE,
  agregarAlumnoRespuestaSchema,
  candidatosMaestroRespuestaSchema,
  candidatosRespuestaSchema,
  claseRespuestaSchema,
  codigoClaseRespuestaSchema,
  comentarioRespuestaSchema,
  conteoDeBorradoRespuestaSchema,
  dudaRespuestaSchema,
  listaAlumnosRespuestaSchema,
  listaClasesAdminRespuestaSchema,
  listaClasesImpartidasRespuestaSchema,
  listaClasesInscritasRespuestaSchema,
  listaComentariosRespuestaSchema,
  listaCategoriasRespuestaSchema,
  listaDudasRespuestaSchema,
  listaPublicacionesRespuestaSchema,
  listaRecursosRespuestaSchema,
  listaTemasRespuestaSchema,
  listaTrabajoRespuestaSchema,
  maestrosDeClaseRespuestaSchema,
  moverElementoRespuestaSchema,
  personasRespuestaSchema,
  publicacionRespuestaSchema,
  recursoRespuestaSchema,
  sinContenidoSchema,
  temaRespuestaSchema,
  unirseRespuestaSchema,
  type CrearClaseAdmin,
  type BloqueDeRecurso,
  type CrearComentario,
  type CrearDuda,
  type CrearRespuesta,
  type CrearTema,
  type ListaDudasRespuesta,
  type EditarRecurso,
  type EditarClase,
  type ListaTemasRespuesta,
  type ReemplazarCategorias,
  type SeccionDeTemas,
  type Unirse,
} from "@campus/shared"
import {
  hashKey,
  useInfiniteQuery,
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query"
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react"
import { toast } from "sonner"

import { consultaMe } from "@/services/sesionService"
import { api, esApiError } from "@/services/apiClient"
import {
  claveCategorias,
  clavePrefijoDelTrabajo,
  claveTarea,
  claveTemas,
  claveTrabajo,
  consultaCategorias,
  consultaTemas,
} from "@/services/trabajoService"

import {
  CLAVE_CLASES_ADMIN,
  claveClasesAdmin,
  claveConteoDeBorrado,
  claveGestionDeClase,
  CLAVE_CLASES_IMPARTIDAS,
  CLAVE_CLASES_INSCRITAS,
  claveAlumnos,
  claveCandidatos,
  claveClaseDetalle,
  claveCodigoDeClase,
  claveComentarios,
  claveDudas,
  claveMaestrosCandidatos,
  clavePrefijoDeRecursos,
  claveRecurso,
  claveRecursos,
  claveRespuestas,
  claveTemasDeLaSeccion,
  clavePersonas,
  clavePublicaciones,
  CODIGOS_QUE_RENUEVAN_LAS_CATEGORIAS,
  CODIGOS_QUE_RENUEVAN_LAS_DUDAS,
  CODIGOS_QUE_RENUEVAN_EL_RECURSO,
  CODIGOS_QUE_RENUEVAN_LOS_RECURSOS,
  CODIGOS_QUE_RENUEVAN_LOS_TEMAS,
  LIMITE_CANDIDATOS,
  LIMITE_CLASES,
  LIMITE_COMENTARIOS,
  LIMITE_DUDAS,
  LIMITE_PAGINAS_RECURSOS,
  LIMITE_PAGINAS_TRABAJO,
  LIMITE_PERSONAS,
  LIMITE_PRIMERA_PAGINA_RECURSOS,
  LIMITE_PRIMERA_PAGINA_TRABAJO,
  LIMITE_PUBLICACIONES,
  LIMITE_RESPUESTAS,
  MENSAJES_ERROR_CLASES_GENERALES,
  MAXIMO_LECTURAS_DE_RECURSOS_EN_VUELO,
  MAXIMO_LECTURAS_DE_TRABAJO_EN_VUELO,
  TEXTOS_BORRAR_CLASE,
  TEXTOS_BUSCADOR_ALUMNOS,
  TEXTOS_CATEGORIAS,
  TEXTOS_CLASES_ADMIN,
  TEXTOS_COMENTARIOS,
  TEXTOS_DUDAS,
  TEXTOS_DUPLICAR_CLASE,
  TEXTOS_FORMULARIO_CLASE,
  TEXTOS_FORMULARIO_PUBLICACION,
  TEXTOS_FORMULARIO_RECURSO,
  TEXTOS_MAESTROS_DE_CLASE,
  TEXTOS_MURO,
  TEXTOS_RECURSOS,
  TEXTOS_RESPUESTAS,
  TEXTOS_TABLA_ALUMNOS,
  TEXTOS_TEMAS,
  TIEMPO_FRESCO_DEL_MURO_MS,
} from "./data"
import {
  consultaDeClasesAdmin,
  crearLimiteDeConcurrencia,
  desplazamientoParaVer,
  erroresDeCategoriasDeApi,
  erroresDelTemaDeApi,
  erroresDeFormularioClases,
  erroresDeLaDudaDeApi,
  erroresDeLaPublicacionDeApi,
  erroresDeLaRespuestaDeApi,
  erroresDelRecursoDeApi,
  errorQueRedirigeElCliente,
  errorQuitaLaVista,
  esCambioDeLaClaseEnGestion,
  esClaseQueYaNoExiste,
  esDudaNoEncontrada,
  focoPerdido,
  medidaDelIndicador,
  mensajeDeErrorClases,
  opcionEnElPanel,
  siguienteCursorDeClasesAdmin,
  temasEnElOrdenDe,
  terminoDeBusquedaValido,
  tiempoFrescoDelMuro,
} from "./lib"
import type {
  AccionDeFilaDeClase,
  CrearAnuncio,
  CrearRecurso,
  CursorDeClasesAdmin,
  DuplicarClase,
  EstadoDeClases,
  MedidaDelIndicadorDeLaClase,
  ModoDelRecurso,
  PosicionDelPanel,
} from "./types"

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

// enabled: solo quien ve el código (maestro y admin, PR-A22e) lo pide; un estudiante nunca llega a
// pedirlo.
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
// T-02 (ronda 1 de 02c): los helpers devuelven la recarga que disparan. invalidateQueries se resuelve
// cuando las consultas activas terminan de volver a pedirse; un onSuccess que la espera mantiene la
// mutación pendiente (y su botón en `enEspera`) hasta que el dato que esconde la acción ya llegó.
const invalidarListasDeClases = async (queryClient: ReturnType<typeof useQueryClient>) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_INSCRITAS }),
    queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_IMPARTIDAS }),
  ])
}

// CLASES-03c2 (§D-11, O-16): `true` mientras el componente que llama al gancho está montado. Lo crea
// cada gancho de mutación de un formulario: su onError corre aunque el formulario ya no esté (T-30), y
// con él sabe si el formulario sigue ahí para mostrar el error bajo su campo.
export const useMontado = (): RefObject<boolean> => {
  const montado = useRef(false)
  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])
  return montado
}

// §D-11, variante de clase (Enmienda 1, M-01): con el formulario montado, `alFallar` y `alTerminar`
// (los callbacks de mutate) avisan y navegan, y el gancho calla. Con el formulario desmontado esos
// callbacks no corren: el gancho avisa una vez cualquier error, salvo uno con que apiClient ya redirige
// (la página se va), y el éxito, sin navegar (la persona ya está en otra pantalla).
const avisarErrorConElFormularioDesmontado = (montado: RefObject<boolean>, error: unknown) => {
  if (montado.current || errorQueRedirigeElCliente(error)) return
  toast.error(mensajeDeErrorClases(error))
}

// CLASES-02c (§D-2C2): crear y editar una clase son del administrador. El maestro ya no las crea.
export const useCrearClase = () => {
  const queryClient = useQueryClient()
  const montado = useMontado()
  return useMutation({
    mutationFn: (datos: CrearClaseAdmin) =>
      api("/api/admin/clases", { method: "POST", body: datos, schema: claseRespuestaSchema }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_ADMIN })
      void invalidarListasDeClases(queryClient)
      if (!montado.current) toast.success(TEXTOS_FORMULARIO_CLASE.avisoCreada)
    },
    onError: (error) => avisarErrorConElFormularioDesmontado(montado, error),
  })
}

// El id llega al mutar (§D-2C5): sin un valor de respaldo para un claseId que falte.
export const useEditarClase = () => {
  const queryClient = useQueryClient()
  const montado = useMontado()
  return useMutation({
    mutationFn: ({ claseId, datos }: { claseId: string; datos: EditarClase }) =>
      api(`/api/admin/clases/${claseId}`, {
        method: "PUT",
        body: datos,
        schema: claseRespuestaSchema,
      }),
    onSuccess: (_respuesta, { claseId }) => {
      void queryClient.invalidateQueries({ queryKey: claveClaseDetalle(claseId) })
      void queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_ADMIN })
      void invalidarListasDeClases(queryClient)
      if (!montado.current) toast.success(TEXTOS_FORMULARIO_CLASE.avisoGuardada)
    },
    onError: (error) => avisarErrorConElFormularioDesmontado(montado, error),
  })
}

// La lista institucional (§D-2C2): de 50 en 50. ADMIN-01c (§D-10, §D-2 y Enmienda 5): una consulta por
// estado; en "Archivadas", la página siguiente lleva la posición de la fila del cursor.
export const useClasesAdmin = (estado: EstadoDeClases) =>
  useInfiniteQuery({
    queryKey: claveClasesAdmin(estado),
    queryFn: ({ pageParam }: { pageParam: CursorDeClasesAdmin | undefined }) =>
      api(`/api/admin/clases?${consultaDeClasesAdmin(estado, pageParam)}`, {
        schema: listaClasesAdminRespuestaSchema,
      }),
    initialPageParam: undefined as CursorDeClasesAdmin | undefined,
    getNextPageParam: (ultimaPagina) => siguienteCursorDeClasesAdmin(estado, ultimaPagina),
  })

// ADMIN-01c (ADM-1C07, ADM-1C12): las frases de error y de lista cambiada piden volver a abrir la lista.
// Pulsar "Clases" estando ahí, cambiar de pestaña o ir atrás y adelante (otra location.key con la vista
// montada) llaman a la función que devuelve: si la lista visible quedó en error, se vuelve a pedir desde
// la primera página. Al desmontarse, las listas en error salen de la caché, así que regresar antes de que
// venza el staleTime las pide de nuevo. Una lista sana no se vuelve a pedir.
export const useRecuperarListaDeClasesAdmin = (estado: EstadoDeClases) => {
  const queryClient = useQueryClient()
  useEffect(
    () => () => {
      for (const clave of [claveClasesAdmin("activas"), claveClasesAdmin("archivadas")]) {
        if (queryClient.getQueryState(clave)?.status !== "error") continue
        queryClient.removeQueries({ queryKey: clave, exact: true })
      }
    },
    [queryClient],
  )
  return () => {
    const clave = claveClasesAdmin(estado)
    if (queryClient.getQueryState(clave)?.status !== "error") return
    void queryClient.resetQueries({ queryKey: clave, exact: true })
  }
}

// ADMIN-01c (matriz de 01c): tras archivar, restaurar o borrar, las dos listas del administrador y las
// listas propias de maestros y alumnos (con la barra lateral, que cuelga de ellas). Con el `claseId`,
// también el detalle de esa clase. Enmienda 10 (E10-6): sin claveClasesAnteriores.
const renovarTrasGestionar = async (
  queryClient: ReturnType<typeof useQueryClient>,
  claseId?: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_ADMIN }),
    invalidarListasDeClases(queryClient),
    claseId === undefined
      ? Promise.resolve()
      : queryClient.invalidateQueries({ queryKey: claveClaseDetalle(claseId), exact: true }),
  ])
}

// Un aviso por error, salvo uno con que apiClient ya redirige; si la clase ya no está como la fila la
// mostraba (otra sesión la archivó, la restauró o la borró), las listas se renuevan.
const avisarErrorDeGestion = async (
  queryClient: ReturnType<typeof useQueryClient>,
  error: unknown,
  claseId: string,
) => {
  if (!errorQueRedirigeElCliente(error)) toast.error(mensajeDeErrorClases(error))
  if (esCambioDeLaClaseEnGestion(error)) await renovarTrasGestionar(queryClient, claseId)
}

// ADMIN-01c (§D-10): archivar y restaurar. Los avisos viven aquí (la fila se desmonta al salir de la
// lista); la mutación sigue pendiente hasta que la lista renovada ya no tiene la fila (T-02 de 02c).
// Corrección de la ronda 1 (T-02): cada una lleva la clave de su clase (`claveGestionDeClase`), así que
// la fila o la confirmación que se vuelven a montar con la petición en vuelo la ven en la caché de
// mutaciones (useGestionEnVuelo) y no mandan otra.
export const useArchivarClase = (claseId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: claveGestionDeClase("archivar", claseId),
    mutationFn: () =>
      api(`/api/admin/clases/${claseId}/archivar`, {
        method: "POST",
        schema: claseRespuestaSchema,
      }),
    onSuccess: async () => {
      toast.success(TEXTOS_CLASES_ADMIN.avisoArchivada)
      await renovarTrasGestionar(queryClient, claseId)
    },
    onError: (error) => avisarErrorDeGestion(queryClient, error, claseId),
  })
}

export const useRestaurarClase = (claseId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: claveGestionDeClase("restaurar", claseId),
    mutationFn: () =>
      api(`/api/admin/clases/${claseId}/restaurar`, {
        method: "POST",
        schema: claseRespuestaSchema,
      }),
    onSuccess: async () => {
      toast.success(TEXTOS_CLASES_ADMIN.avisoRestaurada)
      await renovarTrasGestionar(queryClient, claseId)
    },
    onError: (error) => avisarErrorDeGestion(queryClient, error, claseId),
  })
}

// Corrección de la ronda 1 (T-02): si archivar o restaurar esa clase sigue en vuelo, aunque la haya
// lanzado otra instancia de la fila o de la confirmación que ya se desmontó. `enVuelo` sirve para pintar
// la espera; `sigueEnVuelo` se lee en el manejador, sin esperar otro render.
export const useGestionEnVuelo = (accion: "archivar" | "restaurar", claseId: string) => {
  const queryClient = useQueryClient()
  const mutationKey = claveGestionDeClase(accion, claseId)
  const enVuelo = useIsMutating({ mutationKey, exact: true }) > 0
  const sigueEnVuelo = () => queryClient.isMutating({ mutationKey, exact: true }) > 0
  return { enVuelo, sigueEnVuelo }
}

// ADMIN-01c (§D-10, ADM-1C06): el conteo se pide cada vez que el diálogo se abre y nunca se sirve de la
// caché: staleTime y gcTime en 0, y el diálogo lo saca al cerrarse (useOlvidarConteoDeBorrado).
// Corrección de la ronda 1 (T-01): si la clase ya no está como la fila la muestra (otra pestaña la
// borró o la restauró), las listas y el detalle se renuevan, como al archivar o restaurar: al cerrar el
// diálogo, la fila ya no se ofrece.
export const useConteoDeBorrado = (claseId: string) => {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: claveConteoDeBorrado(claseId),
    queryFn: async () => {
      try {
        return await api(`/api/admin/clases/${claseId}/conteo-de-borrado`, {
          schema: conteoDeBorradoRespuestaSchema,
        })
      } catch (error) {
        if (esCambioDeLaClaseEnGestion(error)) void renovarTrasGestionar(queryClient, claseId)
        throw error
      }
    },
    staleTime: 0,
    gcTime: 0,
  })
}

export const useOlvidarConteoDeBorrado = () => {
  const queryClient = useQueryClient()
  return (claseId: string) =>
    queryClient.removeQueries({ queryKey: claveConteoDeBorrado(claseId), exact: true })
}

// ADMIN-01c (§D-10): el borrado definitivo, siempre con la confirmación. Con el diálogo abierto, su
// error se muestra dentro de él; con el diálogo desmontado, el gancho avisa una vez. Corrección de la
// ronda 1 (T-01): si la clase ya no existe (otra pestaña la borró), las listas se renuevan; el `409
// CLASE_NO_ARCHIVADA` sigue la matriz del plan (solo en el diálogo).
export const useBorrarClase = () => {
  const queryClient = useQueryClient()
  const montado = useMontado()
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      api(`/api/admin/clases/${id}?confirmar=${CONFIRMAR_BORRADO_DE_CLASE}`, {
        method: "DELETE",
        schema: sinContenidoSchema,
      }),
    onSuccess: async () => {
      toast.success(TEXTOS_BORRAR_CLASE.avisoBorrada)
      await renovarTrasGestionar(queryClient)
    },
    onError: async (error, { id }) => {
      avisarErrorConElFormularioDesmontado(montado, error)
      if (esClaseQueYaNoExiste(error)) await renovarTrasGestionar(queryClient, id)
    },
  })
}

// ADMIN-01c (§D-10): duplicar, como crear una clase: con el formulario montado, sus callbacks avisan y
// navegan; desmontado, el gancho avisa (Enmienda 10: el aviso de duplicado sale siempre).
export const useDuplicarClase = () => {
  const queryClient = useQueryClient()
  const montado = useMontado()
  return useMutation({
    mutationFn: ({ claseId, datos }: { claseId: string; datos: DuplicarClase }) =>
      api(`/api/admin/clases/${claseId}/duplicar`, {
        method: "POST",
        body: datos,
        schema: claseRespuestaSchema,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_ADMIN })
      void invalidarListasDeClases(queryClient)
      if (!montado.current) toast.success(TEXTOS_DUPLICAR_CLASE.avisoDuplicada)
    },
    onError: (error) => avisarErrorConElFormularioDesmontado(montado, error),
  })
}

// Solo pregunta con un término que el servidor aceptaría; con menos de 3 letras no pide nada.
export const useCandidatosMaestro = (termino: string) =>
  useQuery({
    queryKey: claveMaestrosCandidatos(termino),
    queryFn: () => {
      const parametros = new URLSearchParams({ q: termino, limite: String(LIMITE_CANDIDATOS) })
      return api(`/api/admin/maestros/candidatos?${parametros.toString()}`, {
        schema: candidatosMaestroRespuestaSchema,
      })
    },
    enabled: terminoDeBusquedaValido(termino),
  })

// Tras asignar o retirar a un maestro, el detalle de la clase (sus `maestros`), la lista del
// administrador, los compañeros de esa clase y las listas propias quedan al día.
const invalidarMaestrosDeLaClase = async (
  queryClient: ReturnType<typeof useQueryClient>,
  claseId: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: claveClaseDetalle(claseId) }),
    queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_ADMIN }),
    invalidarListasDeClases(queryClient),
  ])
}

// Los avisos viven aquí y no en los callbacks de mutate (§D-C5 bis): la fila del buscador puede
// desmontarse con la petición en vuelo.
export const useAsignarMaestro = (claseId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; nombre: string }) =>
      api(`/api/admin/clases/${claseId}/maestros`, {
        method: "POST",
        body: { maestroId: id },
        schema: maestrosDeClaseRespuestaSchema,
      }),
    // T-02: el aviso sale una vez, y la mutación sigue pendiente hasta que la clase recargada ya no
    // ofrece la acción (la insignia «Ya da esta clase» sustituye al botón).
    onSuccess: async (_respuesta, { nombre }) => {
      toast.success(TEXTOS_MAESTROS_DE_CLASE.asignado(nombre))
      await invalidarMaestrosDeLaClase(queryClient, claseId)
    },
    onError: (error) => toast.error(mensajeDeErrorClases(error)),
  })
}

export const useRetirarMaestro = (claseId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; nombre: string }) =>
      api(`/api/admin/clases/${claseId}/maestros/${id}`, {
        method: "DELETE",
        schema: maestrosDeClaseRespuestaSchema,
      }),
    onSuccess: async (_respuesta, { nombre }) => {
      toast.success(TEXTOS_MAESTROS_DE_CLASE.quitado(nombre))
      await invalidarMaestrosDeLaClase(queryClient, claseId)
    },
    onError: (error) => toast.error(mensajeDeErrorClases(error)),
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
const invalidarPersonasDeLaClase = async (
  queryClient: ReturnType<typeof useQueryClient>,
  claseId: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: claveAlumnos(claseId) }),
    queryClient.invalidateQueries({ queryKey: claveCandidatos(claseId) }),
    queryClient.invalidateQueries({ queryKey: clavePersonas(claseId) }),
    queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_IMPARTIDAS }),
  ])
}

// M-10 (revisión de 02c): retorno temprano en lugar de if/else.
const avisarAlumnoAgregado = (yaEstaba: boolean, nombre: string) => {
  if (yaEstaba) {
    toast(TEXTOS_BUSCADOR_ALUMNOS.yaEstaba(nombre))
    return
  }
  toast.success(TEXTOS_BUSCADOR_ALUMNOS.agregado(nombre))
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
    onSuccess: async (respuesta) => {
      avisarAlumnoAgregado(respuesta.yaEstaba, respuesta.alumno.nombre)
      // T-02 (hermano): la mutación sigue pendiente hasta que los candidatos recargados ya no ofrecen
      // «Agregar a la clase».
      await invalidarPersonasDeLaClase(queryClient, claseId)
    },
    onError: (error) => toast.error(mensajeDeErrorClases(error)),
  })
}

export const useQuitarAlumno = (claseId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; nombre: string }) =>
      api(`/api/clases/${claseId}/alumnos/${id}`, {
        method: "DELETE",
        schema: sinContenidoSchema,
      }),
    // O-10 (revisión de 02c): el aviso sale aquí, una vez, como en sus cinco hermanos, y la mutación
    // sigue pendiente (botón en enEspera) hasta que el roster recargado ya no trae a la persona. Por
    // eso tampoco hay callbacks en el mutate de la fila: la fila puede desmontarse con la petición
    // en vuelo (§D-C5 bis).
    onSuccess: async (_respuesta, { nombre }) => {
      toast.success(TEXTOS_TABLA_ALUMNOS.quitado(nombre))
      await invalidarPersonasDeLaClase(queryClient, claseId)
    },
    onError: (error) => toast.error(mensajeDeErrorClases(error)),
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
// documento. O-19 (ronda 2 de 02d, mismo criterio que T-08 de components/layout/hooks.ts): al cambiar
// de pestaña o de aplicación el navegador también dispara focusout sin relatedTarget sobre un control
// que sigue montado, y la ventana pierde el foco justo después; en ese caso la memoria se conserva.
export const useFilaEnFoco = (atributo: string) => {
  const filaEnFoco = useRef<string | null>(null)
  const ventanaConFoco = useRef(true)
  useEffect(() => {
    const alEntrar = (evento: FocusEvent) => {
      const fila = evento.target instanceof Element ? evento.target.closest(`[${atributo}]`) : null
      filaEnFoco.current = fila?.getAttribute(atributo) ?? null
    }
    const alSalir = (evento: FocusEvent) => {
      const objetivo = evento.target
      if (evento.relatedTarget !== null || !(objetivo instanceof Element)) return
      setTimeout(() => {
        if (!objetivo.isConnected || !ventanaConFoco.current || !document.hasFocus()) return
        filaEnFoco.current = null
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
    document.addEventListener("focusin", alEntrar)
    document.addEventListener("focusout", alSalir)
    document.addEventListener("visibilitychange", alCambiarLaVisibilidad)
    window.addEventListener("blur", alPerderLaVentana)
    window.addEventListener("focus", alRecuperarLaVentana)
    return () => {
      document.removeEventListener("focusin", alEntrar)
      document.removeEventListener("focusout", alSalir)
      document.removeEventListener("visibilitychange", alCambiarLaVisibilidad)
      window.removeEventListener("blur", alPerderLaVentana)
      window.removeEventListener("focus", alRecuperarLaVentana)
    }
  }, [atributo])
  return filaEnFoco
}

// "Ver más" (T-26, T-28): se desmonta con el foco dentro al cargar la última página. Devuelve el ref
// que va en ese botón. Mueve el foco SOLO si el botón estaba montado en el render anterior, ya no lo
// está en este y tenía el foco al desmontarse; con el botón montado nunca lo mueve, aunque el foco
// esté en <body> (un render sin desmontaje no mueve nada). La marca "tenía el foco" se borra con un
// focusin en otro elemento y con un focusout del botón que no lleva a ningún elemento mientras
// sigue conectado (un clic en blanco). Hermano de T-08 (ronda 2 de 02d): al cambiar de pestaña el
// navegador también dispara ese focusout sin destino con el botón conectado, y la ventana pierde el
// foco justo después; se decide en el siguiente turno y la marca solo se borra si la ventana conserva
// el foco (document.hasFocus() y el seguimiento de window), igual que useFilaEnFoco.
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
  const ventanaConFoco = useRef(true)

  useEffect(() => {
    const alEntrar = (evento: FocusEvent) => {
      teniaElFoco.current = botonRef.current !== null && evento.target === botonRef.current
    }
    const alSalir = (evento: FocusEvent) => {
      const boton = botonRef.current
      if (boton === null || evento.target !== boton || evento.relatedTarget !== null) return
      setTimeout(() => {
        if (!boton.isConnected || !ventanaConFoco.current || !document.hasFocus()) return
        teniaElFoco.current = false
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
    document.addEventListener("focusin", alEntrar)
    document.addEventListener("focusout", alSalir)
    document.addEventListener("visibilitychange", alCambiarLaVisibilidad)
    window.addEventListener("blur", alPerderLaVentana)
    window.addEventListener("focus", alRecuperarLaVentana)
    return () => {
      document.removeEventListener("focusin", alEntrar)
      document.removeEventListener("focusout", alSalir)
      document.removeEventListener("visibilitychange", alCambiarLaVisibilidad)
      window.removeEventListener("blur", alPerderLaVentana)
      window.removeEventListener("focus", alRecuperarLaVentana)
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

// T-04 (ronda 2 de 02c, DESIGN.md §7.14, precedente T-29 de CLASES-c): una recarga que falla después
// de una acción sustituye la vista por un MensajeError, y el botón que tenía el foco desaparece. Este
// hook lleva el foco a `destinoRef` (el encabezado de la rama de error, o un contenedor propio con
// tabIndex={-1} que envuelve al MensajeError) cuando la consulta pasa a error y el foco se perdió. Se
// reacciona después del render, no en el onSuccess de la petición.
// T-05 (ronda 3 de 02c): solo tras una recarga. `tieneDatos` dice si la consulta tiene datos; el hook
// recuerda que los hubo, y no mueve el foco si nunca los tuvo: una primera carga que falla no pierde
// ningún control (el foco ya estaba en <body>), igual que una vista que nace en error o un foco que la
// persona eligió.
// T-06 (ronda 4 de 02c): la memoria del gancho es de una consulta. `clave` identifica la consulta (el
// claseId, por ejemplo): cuando cambia, las vistas que reutilizan la misma instancia (ConClaseDeLaRuta
// no usa key) empiezan de cero, sin el "hubo datos" ni el error de la clase anterior, y ese render no
// mueve el foco.
export const useFocoAlPasarAError = (
  esError: boolean,
  tieneDatos: boolean,
  clave: string,
  destinoRef: RefObject<HTMLElement | null>,
) => {
  const eraError = useRef(esError)
  const huboDatos = useRef(tieneDatos)
  const clavePrevia = useRef(clave)
  useEffect(() => {
    if (clavePrevia.current !== clave) {
      clavePrevia.current = clave
      eraError.current = esError
      huboDatos.current = tieneDatos
      return
    }
    const habiaError = eraError.current
    eraError.current = esError
    if (tieneDatos) huboDatos.current = true
    if (!esError || habiaError || !huboDatos.current || !focoPerdido(document)) return
    destinoRef.current?.focus()
  })
}

// ADMIN-01c (DESIGN.md §7.14, T-21): cuando una fila sale de la lista con el foco dentro (archivar,
// restaurar) o después de borrarla desde el diálogo, el foco va al mismo control de la fila que ocupa su
// lugar (la siguiente o, si era la última, la anterior) y, si no queda ninguna, al encabezado. Se decide
// después de cada render, cuando la fila ya no está en los datos. Devuelve con qué marcar la fila borrada
// desde el diálogo, porque entonces el foco estaba en el diálogo y no en la fila.
export const useFocoAlQuitarUnaClase = (
  ids: string[] | undefined,
  accion: AccionDeFilaDeClase,
  enfocarEncabezado: () => void,
) => {
  const filaEnFocoRef = useFilaEnFoco("data-clase-id")
  const pendiente = useRef<{ id: string; accion: AccionDeFilaDeClase } | null>(null)
  // Corrección de la ronda 1 (M-02): el último lugar en que se vio cada fila. La fila puede haber salido
  // varios renders antes de que se decida el foco (la lista se renovó con el diálogo abierto), así que su
  // lugar no se lee de la lista anterior sino de aquí.
  const ultimoLugar = useRef(new Map<string, number>())
  useEffect(() => {
    if (ids === undefined) return
    const enFoco = filaEnFocoRef.current
    const objetivo = pendiente.current ?? (enFoco === null ? null : { id: enFoco, accion })
    const lugar = objetivo === null ? undefined : ultimoLugar.current.get(objetivo.id)
    ids.forEach((id, indice) => ultimoLugar.current.set(id, indice))
    if (objetivo === null || ids.includes(objetivo.id)) return
    pendiente.current = null
    filaEnFocoRef.current = null
    ultimoLugar.current.delete(objetivo.id)
    if (!focoPerdido(document)) return
    const vecina = ids[Math.min(lugar ?? 0, ids.length - 1)]
    const destino =
      vecina === undefined
        ? null
        : document.querySelector<HTMLElement>(
            `[data-clase-id="${vecina}"] [data-accion="${objetivo.accion}"]`,
          )
    if (destino !== null) {
      destino.focus()
      return
    }
    enfocarEncabezado()
  })
  return (id: string) => {
    pendiente.current = { id, accion: "borrar" }
  }
}

// ADMIN-01c (DESIGN.md §7.14): al cerrar el diálogo de borrado sin borrar, el foco vuelve al «Borrar
// definitivamente» que lo abrió; se mueve después del render en que el diálogo ya no está. Devuelve con
// qué marcar la clase de ese botón al cerrarlo.
export const useFocoAlCerrarElBorrado = (abierto: boolean) => {
  const devolverA = useRef<string | null>(null)
  useEffect(() => {
    const id = devolverA.current
    if (id === null || abierto) return
    devolverA.current = null
    document.querySelector<HTMLElement>(`[data-clase-id="${id}"] [data-accion="borrar"]`)?.focus()
  })
  return (id: string) => {
    devolverA.current = id
  }
}

// CLASES-c (§D-C2, §D-C5). El muro y los comentarios paginan de 20 en 20, con el cursor del servidor.
export const usePublicaciones = (claseId: string) =>
  useInfiniteQuery({
    queryKey: clavePublicaciones(claseId),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      // CLASES-03c2 (§D-7.5): Avisos pide solo los anuncios; la clave no cambia.
      api(
        `/api/clases/${claseId}/publicaciones?tipo=anuncio&${conCursor(LIMITE_PUBLICACIONES, pageParam)}`,
        { schema: listaPublicacionesRespuestaSchema },
      ),
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
const invalidarMuro = async (queryClient: ReturnType<typeof useQueryClient>, claseId: string) => {
  await queryClient.invalidateQueries({ queryKey: clavePublicaciones(claseId), exact: true })
}

// CLASES-03d (§D-8.4, §D-8.7): Avisos solo publica anuncios; los recursos se publican con
// useCrearRecurso.
export const useCrearPublicacion = (claseId: string) => {
  const queryClient = useQueryClient()
  const montado = useMontado()
  return useMutation({
    mutationFn: (datos: CrearAnuncio) =>
      api(`/api/clases/${claseId}/publicaciones`, {
        method: "POST",
        body: datos,
        schema: publicacionRespuestaSchema,
      }),
    // T-30: los avisos viven aquí y no en los callbacks de mutate: los de useMutation corren aunque
    // el formulario ya no esté montado.
    onSuccess: () => {
      void invalidarMuro(queryClient, claseId)
      toast.success(TEXTOS_FORMULARIO_PUBLICACION.avisoPublicado)
    },
    // §D-11 (O-16, N-05): el error del campo lo muestra el formulario solo si sigue montado; si no, se
    // avisa. No hay ninguna espera antes de decidirlo.
    onError: (error) => {
      if (montado.current && erroresDeLaPublicacionDeApi(error, "anuncio")) return
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
    onSuccess: async () => {
      toast.success(TEXTOS_MURO.avisoPublicacionBorrada)
      await invalidarMuro(queryClient, claseId)
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

const invalidarComentarios = async (
  queryClient: ReturnType<typeof useQueryClient>,
  claseId: string,
  publicacionId: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: claveComentarios(claseId, publicacionId) }),
    invalidarMuro(queryClient, claseId),
    // CLASES-03d (§D-8.4): el conteo de comentarios de un recurso vive en su lista.
    queryClient.invalidateQueries({ queryKey: clavePrefijoDeRecursos(claseId) }),
  ])
}

export const useComentar = (claseId: string, publicacionId: string) => {
  const queryClient = useQueryClient()
  const montado = useMontado()
  return useMutation({
    mutationFn: (datos: CrearComentario) =>
      api(`/api/clases/${claseId}/publicaciones/${publicacionId}/comentarios`, {
        method: "POST",
        body: datos,
        schema: comentarioRespuestaSchema,
      }),
    // T-30: mismo criterio que useCrearPublicacion.
    onSuccess: () => {
      void invalidarComentarios(queryClient, claseId, publicacionId)
      toast.success(TEXTOS_COMENTARIOS.avisoComentado)
    },
    // §D-11 (O-16): el error del campo lo muestra el formulario solo si sigue montado; si no, se avisa.
    onError: (error) => {
      if (montado.current && erroresDeFormularioClases(error, ["texto"])) return
      toast.error(mensajeDeErrorClases(error))
    },
  })
}

// CLASES-02c (§D-2C4): un solo borrado de comentarios, el de la ruta general; el servidor decide
// con su regla de autoría (`puedeBorrar` de cada comentario dice quién ve el botón).
export const useBorrarComentario = (claseId: string, publicacionId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (comentarioId: string) =>
      api(`/api/clases/${claseId}/publicaciones/${publicacionId}/comentarios/${comentarioId}`, {
        method: "DELETE",
        schema: sinContenidoSchema,
      }),
    onSuccess: async () => {
      toast.success(TEXTOS_COMENTARIOS.avisoComentarioBorrado)
      await invalidarComentarios(queryClient, claseId, publicacionId)
    },
    onError: (error) => toast.error(mensajeDeErrorClases(error)),
  })
}

// TAREAS-01c (§D-9): useSolicitarSubida y useUrlDeDescarga viven en components/adjuntos/hooks.ts.
export { useSolicitarSubida, useUrlDeDescarga } from "@/components/adjuntos/hooks"

// TAREAS-01e (§D-11). "Trabajo de clase", temas y categorías, con las claves y las consultas de
// services/trabajoService.ts (las mismas que usa features/tareas).

// La lista de temas con sus conteos. `enabled`: el formulario del muro solo la pide con "Material", y
// "Actividades de aprendizaje", solo para maestro y admin (la frase de borrar un tema; N-08).
export const useTemas = (claseId: string, enabled = true) =>
  useQuery({ ...consultaTemas(claseId), enabled })

// CLASES-03d (T-02 y T-03 de las rondas 1 y 2): la lista total de temas para el formulario de un
// recurso. Al crear, la de siempre. Al editar, solo cuenta una lista PEDIDA después de abrir el
// formulario: al abrir se pide la lista y la que llega de esa petición la confirma. Si ya había una
// petición en vuelo antes de abrir (por ejemplo, la de «Recursos», que salió antes de la lectura fresca
// del recurso), no cuenta: se espera (o se cancela) y sale otra; si la que está en vuelo es la del propio
// montaje (no había lista o estaba vieja), se espera esa, sin una segunda. Mientras no llega, o si falla,
// `lista` es undefined: el formulario no decide que el tema del recurso "ya no está".
// Enmienda 13 (E13-9): si la lectura pedida al abrir falla, `lecturaFallida` lo dice (la nota del
// formulario) y cualquier respuesta correcta que llegue DESPUÉS de esa falla (una invalidación, recuperar
// la red, otra lectura) confirma la lista. "Después" se cuenta con el contador de datos de la consulta
// (`dataUpdateCount`), nunca con relojes: una respuesta que llegó antes de la falla no cuenta. Una
// lectura posterior en vuelo o fallida no confirma nada.
export const useTemasDelRecurso = (claseId: string, editar: boolean) => {
  const queryClient = useQueryClient()
  const [peticionPrevia] = useState(
    () => queryClient.getQueryState(consultaTemas(claseId).queryKey)?.fetchStatus === "fetching",
  )
  const [confirmada, setConfirmada] = useState(!editar)
  // El contador de datos de la consulta cuando falló la lectura pedida al abrir; null si no falló.
  const [datosAlFallar, setDatosAlFallar] = useState<number | null>(null)
  // "all": el componente se vuelve a pintar al terminar cada lectura, aunque traiga los mismos datos, y
  // así lee el contador de datos al día (por omisión TanStack Query solo avisa de lo que se lee).
  const temas = useQuery({ ...consultaTemas(claseId), notifyOnChangeProps: "all" })
  const pidioRef = useRef(false)

  useEffect(() => {
    if (!editar || pidioRef.current) return
    pidioRef.current = true
    const pedir = async () => {
      // Con una petición previa en vuelo, TanStack Query solo la cancela si la consulta ya tiene datos;
      // sin datos, se une a ella. Por eso, con una previa, se espera a que termine y después se pide otra:
      // solo la respuesta de esa confirma la lista.
      if (peticionPrevia) await temas.refetch({ cancelRefetch: true })
      const resultado = await temas.refetch({ cancelRefetch: false })
      if (resultado.isSuccess) {
        setConfirmada(true)
        return
      }
      setDatosAlFallar(
        queryClient.getQueryState(consultaTemas(claseId).queryKey)?.dataUpdateCount ?? 0,
      )
    }
    void pedir()
  }, [editar, peticionPrevia, temas, queryClient, claseId])

  const datosAhora =
    queryClient.getQueryState(consultaTemas(claseId).queryKey)?.dataUpdateCount ?? 0
  const confirmadaTrasFallar = datosAlFallar !== null && datosAhora > datosAlFallar
  const vigente = confirmada || confirmadaTrasFallar
  return {
    temas,
    lista: vigente ? temas.data?.temas : undefined,
    lecturaFallida: datosAlFallar !== null && !vigente,
  }
}

// CLASES-03c2 (§D-7.6): los mismos temas, en su orden, con los conteos de una sección. De ella sale la
// estructura de la sección (temas, orden, nombres, conteos y "Sin tema").
export const useTemasDeLaSeccion = (claseId: string, seccion: SeccionDeTemas) =>
  useQuery({
    queryKey: claveTemasDeLaSeccion(claseId, seccion),
    queryFn: () =>
      api(`/api/clases/${claseId}/temas?${new URLSearchParams({ seccion }).toString()}`, {
        schema: listaTemasRespuestaSchema,
      }),
  })

// Enmienda 5: una sola instancia por módulo. Toda lectura de GET …/trabajo (primera página y "Ver más")
// pasa por aquí: como máximo 6 en vuelo y las demás en fila, en el orden en que se montan las secciones.
const limiteDeTrabajo = crearLimiteDeConcurrencia(MAXIMO_LECTURAS_DE_TRABAJO_EN_VUELO)

// La primera página pide 5 y "Ver más", 20. El `signal` de TanStack Query saca de la fila a la que espera
// y cancela la que está en curso cuando la sección se desmonta o cambia de clase.
export const useTrabajo = (claseId: string, tema: string) =>
  useInfiniteQuery({
    queryKey: claveTrabajo(claseId, tema),
    queryFn: ({ pageParam, signal }: { pageParam: string | undefined; signal: AbortSignal }) => {
      const limite =
        pageParam === undefined ? LIMITE_PRIMERA_PAGINA_TRABAJO : LIMITE_PAGINAS_TRABAJO
      // CLASES-03c2 (§D-7.6): "Actividades de aprendizaje" pide solo las actividades del tema.
      const parametros = new URLSearchParams({
        tema,
        seccion: "actividades",
        limite: String(limite),
      })
      if (pageParam !== undefined) parametros.set("cursor", pageParam)
      return limiteDeTrabajo.ejecutar(
        () =>
          api(`/api/clases/${claseId}/trabajo?${parametros.toString()}`, {
            schema: listaTrabajoRespuestaSchema,
            signal,
          }),
        signal,
      )
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultimaPagina) => ultimaPagina.siguienteCursor ?? undefined,
  })

// Un aviso por cada fallo nuevo de una recarga que conserva los datos en caché (la vista no se
// reemplaza por un error). Montar la vista con un fallo ya ocurrido no avisa. CLASES-03d (§D-8.1): con
// `idDelAviso`, el aviso lleva ese id de sonner (dos fallos de lugares distintos dejan uno a la vista);
// sin él, el aviso es el de siempre.
export const useAvisoDeRecargaFallida = (
  errorUpdateCount: number,
  hayDatos: boolean,
  texto: string,
  idDelAviso?: string,
) => {
  const fallosVistos = useRef(errorUpdateCount)
  useEffect(() => {
    if (fallosVistos.current === errorUpdateCount) return
    fallosVistos.current = errorUpdateCount
    if (!hayDatos) return
    if (idDelAviso === undefined) {
      toast.error(texto)
      return
    }
    toast.error(texto, { id: idDelAviso })
  }, [errorUpdateCount, hayDatos, texto, idDelAviso])
}

const invalidarTemas = (queryClient: ReturnType<typeof useQueryClient>, claseId: string) =>
  queryClient.invalidateQueries({ queryKey: claveTemas(claseId) })

// Solo las listas por sección (cuelgan de la clave de los temas, un nivel más abajo); el total no.
const filtroDeLasSecciones = (claseId: string) => {
  const prefijo = claveTemas(claseId)
  return {
    queryKey: prefijo,
    predicate: (consulta: { queryKey: readonly unknown[] }) =>
      consulta.queryKey.length > prefijo.length,
  }
}

const invalidarTemasDeLasSecciones = (
  queryClient: ReturnType<typeof useQueryClient>,
  claseId: string,
) => queryClient.invalidateQueries(filtroDeLasSecciones(claseId))

const invalidarTemasYTrabajo = async (
  queryClient: ReturnType<typeof useQueryClient>,
  claseId: string,
) => {
  await Promise.all([
    invalidarTemas(queryClient, claseId),
    queryClient.invalidateQueries({ queryKey: clavePrefijoDelTrabajo(claseId) }),
    // CLASES-03d (§D-7.6): un tema borrado o un elemento movido también cambia "Recursos".
    queryClient.invalidateQueries({ queryKey: clavePrefijoDeRecursos(claseId) }),
  ])
}

// Un error que dice que lo que se ve ya no es lo del servidor (un tema que ya no existe, un nombre que
// otro tomó, el orden que cambió, el elemento que ya no está) vuelve a pedir los temas y el trabajo.
const renovarTrasError = async (
  queryClient: ReturnType<typeof useQueryClient>,
  claseId: string,
  error: unknown,
) => {
  if (!esApiError(error)) return
  if (!CODIGOS_QUE_RENUEVAN_LOS_TEMAS.includes(error.codigo)) return
  await invalidarTemasYTrabajo(queryClient, claseId)
}

// §D-11 (O-16): el error del nombre lo muestra el formulario solo si sigue montado; cualquier otro se
// avisa al momento. M-01 de la verificación de 03c2: lo que decide se lee después de la última espera
// (la renovación de temas y trabajo con TEMA_REPETIDO): TanStack Query espera este onError antes de
// llamar a los callbacks de mutate, y si el formulario se desmonta durante esa espera ya no pinta nada.
const avisarErrorDelTema = async (
  queryClient: ReturnType<typeof useQueryClient>,
  claseId: string,
  montado: RefObject<boolean>,
  error: unknown,
) => {
  const delCampo = erroresDelTemaDeApi(error) !== null
  if (!delCampo) toast.error(mensajeDeErrorClases(error))
  await renovarTrasError(queryClient, claseId, error)
  if (delCampo && !montado.current) toast.error(mensajeDeErrorClases(error))
}

// Los avisos viven en los hooks y no en los callbacks de mutate (patrón T-30): corren aunque el
// componente ya no esté montado. Un error del nombre lo muestra el formulario, sin aviso. El onSuccess
// espera la lista nueva, así que el botón sigue en espera hasta que el tema ya aparece.
export const useCrearTema = (claseId: string) => {
  const queryClient = useQueryClient()
  const montado = useMontado()
  return useMutation({
    mutationFn: (datos: CrearTema) =>
      api(`/api/clases/${claseId}/temas`, {
        method: "POST",
        body: datos,
        schema: temaRespuestaSchema,
      }),
    onSuccess: async () => {
      toast.success(TEXTOS_TEMAS.avisoCreado)
      await invalidarTemas(queryClient, claseId)
    },
    onError: (error) => avisarErrorDelTema(queryClient, claseId, montado, error),
  })
}

export const useRenombrarTema = (claseId: string) => {
  const queryClient = useQueryClient()
  const montado = useMontado()
  return useMutation({
    mutationFn: ({ temaId, nombre }: { temaId: string; nombre: string }) =>
      api(`/api/clases/${claseId}/temas/${temaId}`, {
        method: "PUT",
        body: { nombre },
        schema: temaRespuestaSchema,
      }),
    onSuccess: async () => {
      toast.success(TEXTOS_TEMAS.avisoRenombrado)
      // El nombre del tema también sale en el detalle de sus tareas.
      await Promise.all([
        invalidarTemas(queryClient, claseId),
        queryClient.invalidateQueries({ queryKey: ["clases", claseId, "tareas"] }),
      ])
    },
    onError: (error) => avisarErrorDelTema(queryClient, claseId, montado, error),
  })
}

// Borrar un tema pasa sus elementos a "Sin tema": cambian los temas y las listas del trabajo.
export const useBorrarTema = (claseId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (temaId: string) =>
      api(`/api/clases/${claseId}/temas/${temaId}`, {
        method: "DELETE",
        schema: sinContenidoSchema,
      }),
    onSuccess: async () => {
      toast.success(TEXTOS_TEMAS.avisoBorrado)
      await Promise.all([
        invalidarTemasYTrabajo(queryClient, claseId),
        queryClient.invalidateQueries({ queryKey: ["clases", claseId, "tareas"] }),
      ])
    },
    onError: async (error) => {
      toast.error(mensajeDeErrorClases(error))
      await renovarTrasError(queryClient, claseId, error)
    },
  })
}

// T-01 (ronda 1 de 03c2) y M-01 de su verificación. Tras "Subir"/"Bajar", una lista por sección que no
// trajo el orden nuevo (su recarga falló, o no se volvió a pedir porque no hay vista que la use) toma el
// orden de la respuesta con sus propios conteos, para que el siguiente "Subir"/"Bajar" no parta del
// orden viejo. Escribirla la daría por recién llegada: por eso queda marcada vieja enseguida (sin
// pedirla ahora), y se vuelve a pedir al montar aunque no hayan pasado 30 s. Una lista cuyo error
// reemplaza la vista (sin acceso a la clase) no se toca: su error se sigue mostrando, sin acciones.
// Una recarga que sí llegó tampoco: lo que dice el servidor manda.
const ponerElOrdenEnLasSeccionesSinElNuevo = async (
  queryClient: ReturnType<typeof useQueryClient>,
  claseId: string,
  respuesta: ListaTemasRespuesta,
) => {
  const sinElOrdenNuevo = queryClient
    .getQueryCache()
    .findAll(filtroDeLasSecciones(claseId))
    .filter((consulta) => {
      const { status, error } = consulta.state
      if (status === "error" && errorQuitaLaVista(error)) return false
      return status === "error" || consulta.getObserversCount() === 0
    })
  await Promise.all(
    sinElOrdenNuevo.map(({ queryKey }) => {
      queryClient.setQueryData<ListaTemasRespuesta>(queryKey, (lista) =>
        lista === undefined ? lista : temasEnElOrdenDe(lista, respuesta),
      )
      return queryClient.invalidateQueries({ queryKey, exact: true, refetchType: "none" })
    }),
  )
}

// "Subir" y "Bajar" envían el orden completo; la respuesta es la lista nueva (la misma forma del GET).
// Con 409 ORDEN_DESACTUALIZADO la lista se vuelve a pedir y el aviso lo dice. CLASES-03c2 (§D-7.6): la
// respuesta trae los conteos totales, así que escribe la lista total y espera la recarga de las listas
// por sección: el botón sigue en espera hasta que la vista ya muestra el orden nuevo. T-01 (ronda 1 de
// 03c2): una lista por sección que no pudo traer el orden nuevo (su recarga falló, o no se volvió a
// pedir porque no hay vista que la use) toma, al terminar la espera, el orden de la respuesta
// (ponerElOrdenEnLasSeccionesSinElNuevo). Corre aunque la vista esté desmontada.
export const useOrdenarTemas = (claseId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (temaIds: string[]) =>
      api(`/api/clases/${claseId}/temas/orden`, {
        method: "PUT",
        body: { temaIds },
        schema: listaTemasRespuestaSchema,
      }),
    onSuccess: async (respuesta) => {
      queryClient.setQueryData(claveTemas(claseId), respuesta)
      await invalidarTemasDeLasSecciones(queryClient, claseId)
      await ponerElOrdenEnLasSeccionesSinElNuevo(queryClient, claseId, respuesta)
    },
    onError: async (error) => {
      toast.error(mensajeDeErrorClases(error))
      await renovarTrasError(queryClient, claseId, error)
    },
  })
}

// Mover un elemento de tema (P-02 b: organiza la clase, no es editarlo). Cambian los conteos, las dos
// listas del trabajo y el tema del detalle de la tarea.
export const useMoverElemento = (claseId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      publicacionId,
      temaId,
    }: {
      publicacionId: string
      temaId: string | null
      titulo: string
      nombreDelTema: string
    }) =>
      api(`/api/clases/${claseId}/publicaciones/${publicacionId}/tema`, {
        method: "PUT",
        body: { temaId },
        schema: moverElementoRespuestaSchema,
      }),
    onSuccess: async (_respuesta, { publicacionId, titulo, nombreDelTema }) => {
      toast.success(TEXTOS_TEMAS.avisoMovido(titulo, nombreDelTema))
      await Promise.all([
        invalidarTemasYTrabajo(queryClient, claseId),
        queryClient.invalidateQueries({ queryKey: claveTarea(claseId, publicacionId) }),
        // CLASES-03d (§D-8.4): mover un recurso sube su versión; su edición se vuelve a pedir.
        queryClient.invalidateQueries({ queryKey: claveRecurso(claseId, publicacionId) }),
      ])
    },
    // CLASES-03d (§D-14): con un error con que apiClient ya redirige, la página se va y no se avisa.
    // MOVER_NO_PERMITIDO renueva las listas (CODIGOS_QUE_RENUEVAN_LOS_TEMAS): el control desaparece.
    onError: async (error) => {
      if (errorQueRedirigeElCliente(error)) return
      toast.error(mensajeDeErrorClases(error))
      await renovarTrasError(queryClient, claseId, error)
    },
  })
}

// CLASES-03d (§D-8.2): "Recursos" tiene su propia instancia del limitador (otra que la de
// "Actividades"). Toda lectura de GET …/recursos (primera página y "Ver más") pasa por aquí: como máximo
// 6 en vuelo y las demás en fila, en el orden en que se montan las secciones.
const limiteDeRecursos = crearLimiteDeConcurrencia(MAXIMO_LECTURAS_DE_RECURSOS_EN_VUELO)

// La primera página pide 5 y "Ver más", 20. El `signal` de TanStack Query saca de la fila a la que espera
// y cancela la que está en curso cuando la sección se desmonta.
export const useRecursos = (claseId: string, bloque: BloqueDeRecurso, tema: string) =>
  useInfiniteQuery({
    queryKey: claveRecursos(claseId, bloque, tema),
    queryFn: ({ pageParam, signal }: { pageParam: string | undefined; signal: AbortSignal }) => {
      const limite =
        pageParam === undefined ? LIMITE_PRIMERA_PAGINA_RECURSOS : LIMITE_PAGINAS_RECURSOS
      const parametros = new URLSearchParams({ bloque, tema, limite: String(limite) })
      if (pageParam !== undefined) parametros.set("cursor", pageParam)
      return limiteDeRecursos.ejecutar(
        () =>
          api(`/api/clases/${claseId}/recursos?${parametros.toString()}`, {
            schema: listaRecursosRespuestaSchema,
            signal,
          }),
        signal,
      )
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultimaPagina) => ultimaPagina.siguienteCursor ?? undefined,
  })

// §D-8.6: el recurso que se edita (con su versión y su tema). Solo lo piden los maestros de la clase y
// el admin, desde "Editar recurso".
export const useRecurso = (claseId: string, recursoId: string) =>
  useQuery({
    queryKey: claveRecurso(claseId, recursoId),
    queryFn: () =>
      api(`/api/clases/${claseId}/recursos/${recursoId}`, { schema: recursoRespuestaSchema }),
  })

// Publicar, editar o borrar un recurso cambia las listas de "Recursos" y los conteos de los temas (el
// total y, por colgar de su clave, los de cada sección).
const invalidarRecursosYTemas = async (
  queryClient: ReturnType<typeof useQueryClient>,
  claseId: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: clavePrefijoDeRecursos(claseId) }),
    invalidarTemas(queryClient, claseId),
  ])
}

// Un error al guardar que dice que el recurso abierto ya no es el del servidor (ya no existe, ya no se
// puede editar, se perdió el acceso) vuelve a pedirlo, con las listas: la vista se reemplaza o pierde
// `puedeEditar`. Un tema que ya no existe renueva los temas (la regla de siempre).
const renovarTrasErrorDelRecurso = async (
  queryClient: ReturnType<typeof useQueryClient>,
  claseId: string,
  recursoId: string,
  error: unknown,
) => {
  if (!esApiError(error)) return
  // T-04 (ronda 2 de 03d): un 409 dice que el recurso en caché ya no es la versión del servidor. Se marca
  // viejo sin pedirlo: con la vista montada, la recarga la hace recargarTrasConflicto; con la vista
  // desmontada no hay recarga (§D-14) y la próxima apertura hace la lectura fresca.
  if (error.codigo === "RECURSO_MODIFICADO") {
    await queryClient.invalidateQueries({
      queryKey: claveRecurso(claseId, recursoId),
      refetchType: "none",
    })
    return
  }
  if (!CODIGOS_QUE_RENUEVAN_EL_RECURSO.includes(error.codigo)) {
    await renovarTrasError(queryClient, claseId, error)
    return
  }
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: claveRecurso(claseId, recursoId) }),
    invalidarRecursosYTemas(queryClient, claseId),
  ])
}

// §D-11 (O-16) en "Nuevo recurso" y "Editar recurso". Un error del título o de la descripción lo
// muestra el formulario solo si sigue montado; cualquier otro se avisa al momento, salvo uno con que
// apiClient ya redirige (la página se va). M-01 de la verificación de 03c2: lo que decide se lee después
// de la última espera (la renovación), porque TanStack Query espera este onError antes de llamar a los
// callbacks de mutate, y si el formulario se desmonta durante esa espera ya no pinta nada.
const avisarErrorDelRecurso = async (
  montado: RefObject<boolean>,
  modo: ModoDelRecurso,
  error: unknown,
  renovar: () => Promise<void>,
) => {
  if (errorQueRedirigeElCliente(error)) return
  const delCampo = erroresDelRecursoDeApi(error, modo) !== null
  if (!delCampo) toast.error(mensajeDeErrorClases(error))
  await renovar()
  if (delCampo && !montado.current) toast.error(mensajeDeErrorClases(error))
}

// §D-8.4: un recurso se publica por la ruta de las publicaciones, como material (el servidor le pone el
// bloque del rol del autor). Los avisos viven aquí (patrón T-30): corren aunque el formulario ya no esté.
export const useCrearRecurso = (claseId: string) => {
  const queryClient = useQueryClient()
  const montado = useMontado()
  return useMutation({
    mutationFn: (datos: CrearRecurso) =>
      api(`/api/clases/${claseId}/publicaciones`, {
        method: "POST",
        body: datos,
        schema: publicacionRespuestaSchema,
      }),
    onSuccess: () => {
      void invalidarRecursosYTemas(queryClient, claseId)
      toast.success(TEXTOS_FORMULARIO_RECURSO.avisoPublicado)
    },
    onError: (error) =>
      avisarErrorDelRecurso(montado, "crear", error, () =>
        renovarTrasError(queryClient, claseId, error),
      ),
  })
}

// §D-8.5: editar exige la versión con que se abrió el formulario (409 RECURSO_MODIFICADO si ya es otra).
// La respuesta es el recurso guardado: se escribe en su consulta, y las listas y los temas se renuevan.
export const useEditarRecurso = (claseId: string) => {
  const queryClient = useQueryClient()
  const montado = useMontado()
  return useMutation({
    mutationFn: ({ recursoId, datos }: { recursoId: string; datos: EditarRecurso }) =>
      api(`/api/clases/${claseId}/recursos/${recursoId}`, {
        method: "PUT",
        body: datos,
        schema: recursoRespuestaSchema,
      }),
    onSuccess: (respuesta, { recursoId }) => {
      queryClient.setQueryData(claveRecurso(claseId, recursoId), respuesta)
      void invalidarRecursosYTemas(queryClient, claseId)
      toast.success(TEXTOS_FORMULARIO_RECURSO.avisoGuardado)
    },
    onError: (error, { recursoId }) =>
      avisarErrorDelRecurso(montado, "editar", error, () =>
        renovarTrasErrorDelRecurso(queryClient, claseId, recursoId, error),
      ),
  })
}

// §D-8.3: borrar un recurso es borrar su publicación. Al éxito, el aviso, las listas y los temas se
// renuevan y su edición sale de la caché. Con 403 o 404, el aviso y la lista se renuevan (la fila que ya
// no está desaparece y `puedeBorrar` se actualiza). La mutación sigue pendiente hasta que la lista nueva
// llegó, así que "Sí, borrar recurso" espera con ella.
export const useBorrarRecurso = (claseId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (recursoId: string) =>
      api(`/api/clases/${claseId}/publicaciones/${recursoId}`, {
        method: "DELETE",
        schema: sinContenidoSchema,
      }),
    onSuccess: async (_respuesta, recursoId) => {
      toast.success(TEXTOS_RECURSOS.avisoBorrado)
      queryClient.removeQueries({ queryKey: claveRecurso(claseId, recursoId), exact: true })
      await invalidarRecursosYTemas(queryClient, claseId)
    },
    // T-05 (ronda 2 de 03d): con 404 el recurso ya no existe y su edición sale de la caché, como con el
    // 204; con 403 sigue existiendo y su edición se marca vieja, sin pedirla.
    // Enmienda 13 (decisión (2) del humano): el 404 de esta ruta (PUBLICACION_NO_ENCONTRADA) dice "Ese
    // recurso ya no existe.", no el texto de Avisos.
    onError: async (error, recursoId) => {
      if (errorQueRedirigeElCliente(error)) return
      const recursoQueYaNoEsta = esApiError(error) && error.codigo === "PUBLICACION_NO_ENCONTRADA"
      toast.error(
        recursoQueYaNoEsta
          ? MENSAJES_ERROR_CLASES_GENERALES.recursoNoEncontrado
          : mensajeDeErrorClases(error),
      )
      if (!esApiError(error) || !CODIGOS_QUE_RENUEVAN_LOS_RECURSOS.includes(error.codigo)) return
      const deSuEdicion = { queryKey: claveRecurso(claseId, recursoId), exact: true }
      if (error.codigo === "PUBLICACION_NO_ENCONTRADA") {
        queryClient.removeQueries(deSuEdicion)
      } else {
        await queryClient.invalidateQueries({ ...deSuEdicion, refetchType: "none" })
      }
      await invalidarRecursosYTemas(queryClient, claseId)
    },
  })
}

// CLASES-03e (§D-9.4). "Dudas": la lista, de la más reciente a la más antigua, de 20 en 20.
export const useDudas = (claseId: string) =>
  useInfiniteQuery({
    queryKey: claveDudas(claseId),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      api(`/api/clases/${claseId}/dudas?${conCursor(LIMITE_DUDAS, pageParam)}`, {
        schema: listaDudasRespuestaSchema,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultimaPagina) => ultimaPagina.siguienteCursor ?? undefined,
  })

// Solo la lista (exact): las respuestas abiertas viven fuera de su clave.
const invalidarDudas = async (queryClient: ReturnType<typeof useQueryClient>, claseId: string) => {
  await queryClient.invalidateQueries({ queryKey: claveDudas(claseId), exact: true })
}

// Las respuestas de una duda: se piden solo mientras su bloque está desplegado (el componente que usa
// este gancho se monta al abrirlo), de la más antigua a la más reciente. `pedir` es false mientras la
// duda se borra o si ya no existe (T-02 de la ronda 1): la consulta no se vuelve a pedir.
export const useRespuestas = (claseId: string, dudaId: string, pedir = true) =>
  useInfiniteQuery({
    enabled: pedir,
    queryKey: claveRespuestas(claseId, dudaId),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      api(
        `/api/clases/${claseId}/dudas/${dudaId}/respuestas?${conCursor(LIMITE_RESPUESTAS, pageParam)}`,
        { schema: listaComentariosRespuestaSchema },
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultimaPagina) => ultimaPagina.siguienteCursor ?? undefined,
  })

// El conteo de respuestas de cada duda vive en la lista: tras responder o borrar una respuesta se
// renuevan las respuestas de esa duda y la lista.
const invalidarRespuestasYDudas = async (
  queryClient: ReturnType<typeof useQueryClient>,
  claseId: string,
  dudaId: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: claveRespuestas(claseId, dudaId) }),
    invalidarDudas(queryClient, claseId),
  ])
}

// §D-9.4: con DUDA_NO_ENCONTRADA, RESPUESTA_NO_ENCONTRADA o BORRADO_NO_PERMITIDO lo que se ve ya no es lo
// del servidor: la lista (y las respuestas de esa duda) se renuevan; la duda que ya no está desaparece y
// `puedeBorrar` se actualiza.
const renuevaLasDudas = (error: unknown): boolean =>
  esApiError(error) && CODIGOS_QUE_RENUEVAN_LAS_DUDAS.includes(error.codigo)

// T-02 (ronda 1 de 03e): tras un error de una acción sobre una respuesta. Si la duda ya no existe, solo se
// renueva la lista (la fila y su bloque salen con ella): volver a pedir sus respuestas daría otro 404 que
// el bloque pintaría como un error en la fila, además del aviso. Con cualquier otro código que renueva, la
// duda sigue y se renuevan sus respuestas y la lista.
const renovarTrasErrorDeRespuesta = async (
  queryClient: ReturnType<typeof useQueryClient>,
  claseId: string,
  dudaId: string,
  error: unknown,
) => {
  if (!renuevaLasDudas(error)) return
  if (esDudaNoEncontrada(error)) {
    await invalidarDudas(queryClient, claseId)
    return
  }
  await invalidarRespuestasYDudas(queryClient, claseId, dudaId)
}

// T-02 (ronda 1 de 03e): un GET de las respuestas que dice que la duda ya no existe (se abrió o se pidió
// "Ver más" de una duda que otra persona borró) renueva la lista, para que la fila salga. Una vez por
// fallo; el bloque muestra mientras tanto su único mensaje, sin aviso.
export const useRenovarSiLaDudaYaNoEsta = (
  claseId: string,
  errorUpdateCount: number,
  error: unknown,
) => {
  const queryClient = useQueryClient()
  const fallosVistos = useRef(errorUpdateCount)
  useEffect(() => {
    if (fallosVistos.current === errorUpdateCount) return
    fallosVistos.current = errorUpdateCount
    if (!esDudaNoEncontrada(error)) return
    void invalidarDudas(queryClient, claseId)
  }, [errorUpdateCount, error, queryClient, claseId])
}

// §D-11 (O-16) en "Publicar duda" y "Responder": un error del texto lo muestra el formulario solo si
// sigue montado; cualquier otro se avisa al momento, salvo uno con que apiClient ya redirige (la página
// se va). Lo que decide si el formulario sigue montado se lee DESPUÉS de la última espera (la
// renovación), porque TanStack Query espera este onError antes de llamar a los callbacks de mutate y el
// formulario puede desmontarse durante esa espera (M-01 de la verificación de 03c2).
const avisarErrorDelTexto = async (
  montado: RefObject<boolean>,
  delCampo: boolean,
  error: unknown,
  renovar: () => Promise<void>,
) => {
  if (errorQueRedirigeElCliente(error)) return
  if (!delCampo) toast.error(mensajeDeErrorClases(error))
  await renovar()
  if (delCampo && !montado.current) toast.error(mensajeDeErrorClases(error))
}

// Los avisos viven en los ganchos (patrón T-30): corren aunque el formulario ya no esté montado.
export const useCrearDuda = (claseId: string) => {
  const queryClient = useQueryClient()
  const montado = useMontado()
  return useMutation({
    mutationFn: (datos: CrearDuda) =>
      api(`/api/clases/${claseId}/dudas`, {
        method: "POST",
        body: datos,
        schema: dudaRespuestaSchema,
      }),
    onSuccess: () => {
      void invalidarDudas(queryClient, claseId)
      toast.success(TEXTOS_DUDAS.avisoPublicada)
    },
    onError: (error) =>
      avisarErrorDelTexto(montado, erroresDeLaDudaDeApi(error) !== null, error, async () => {
        if (renuevaLasDudas(error)) await invalidarDudas(queryClient, claseId)
      }),
  })
}

// "Marcar como resuelta" / "Quitar «Resuelta»" (P-07: maestros de la clase y admin). La mutación sigue
// pendiente hasta que la lista nueva llegó: el botón sigue en espera y cambia de texto con el dato del
// servidor, sin desmontarse.
export const useMarcarDuda = (claseId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ dudaId, resuelta }: { dudaId: string; resuelta: boolean }) =>
      api(`/api/clases/${claseId}/dudas/${dudaId}/resuelta`, {
        method: "PUT",
        body: { resuelta },
        schema: dudaRespuestaSchema,
      }),
    onSuccess: async (_respuesta, { resuelta }) => {
      toast.success(resuelta ? TEXTOS_DUDAS.avisoMarcada : TEXTOS_DUDAS.avisoDesmarcada)
      await invalidarDudas(queryClient, claseId)
    },
    onError: async (error) => {
      if (errorQueRedirigeElCliente(error)) return
      toast.error(mensajeDeErrorClases(error))
      if (renuevaLasDudas(error)) await invalidarDudas(queryClient, claseId)
    },
  })
}

// T-03 (ronda 2 de 03e) y T-05 (ronda 3): las respuestas de una duda que se va (se borró o ya no existe)
// salen de la caché cuando nadie las observa, nunca antes. Con TanStack Query 5.103.2, quitar la consulta con
// su observador montado hace que el siguiente pintado construya una consulta nueva sin datos (isPending) y
// el bloque cambie lo que se veía por "Cargando…". Y como plegar y desplegar el bloque mientras llega la
// lista crea otra consulta (vacía, desactivada), la escucha no termina con el primer observador que se va:
// cada consulta de esa clave que se queda sin observadores sale, hasta que la duda ya no está en la lista
// y no queda ninguna consulta de sus respuestas. Si la lista sale de la caché (cerrar sesión), deja de
// escuchar: la caché ya se vació.
const quitarRespuestasDeUnaDudaQueSeVa = (
  queryClient: ReturnType<typeof useQueryClient>,
  claseId: string,
  dudaId: string,
) => {
  const filtro = { queryKey: claveRespuestas(claseId, dudaId), exact: true }
  const hashDeLasRespuestas = hashKey(claveRespuestas(claseId, dudaId))
  const hashDeLaLista = hashKey(claveDudas(claseId))
  const cache = queryClient.getQueryCache()
  const quitarSiNadieLaObserva = () => {
    const consulta = cache.find(filtro)
    if (consulta === undefined || consulta.getObserversCount() > 0) return
    queryClient.removeQueries(filtro)
  }
  const sigueEnLaLista = () =>
    queryClient
      .getQueryData<InfiniteData<ListaDudasRespuesta>>(claveDudas(claseId))
      ?.pages.some((pagina) => pagina.dudas.some(({ id }) => id === dudaId)) === true
  quitarSiNadieLaObserva()
  const dejarDeEscuchar = cache.subscribe((evento) => {
    if (evento.query.queryHash === hashDeLaLista && evento.type === "removed") {
      dejarDeEscuchar()
      return
    }
    if (evento.query.queryHash === hashDeLasRespuestas && evento.type === "observerRemoved") {
      quitarSiNadieLaObserva()
    }
    if (sigueEnLaLista() || cache.find(filtro) !== undefined) return
    dejarDeEscuchar()
  })
}

// Borrar una duda borra sus respuestas (DH-05): al éxito, sus respuestas salen de la caché (cuando su
// bloque se cierra, T-03 y T-05) y la lista se renueva; con 404 también salen (la duda ya no está). La mutación
// sigue pendiente hasta que la lista nueva llegó, así que "Sí, borrar duda" espera con ella.
export const useBorrarDuda = (claseId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dudaId: string) =>
      api(`/api/clases/${claseId}/dudas/${dudaId}`, {
        method: "DELETE",
        schema: sinContenidoSchema,
      }),
    onSuccess: async (_respuesta, dudaId) => {
      toast.success(TEXTOS_DUDAS.avisoBorrada)
      quitarRespuestasDeUnaDudaQueSeVa(queryClient, claseId, dudaId)
      await invalidarDudas(queryClient, claseId)
    },
    onError: async (error, dudaId) => {
      if (errorQueRedirigeElCliente(error)) return
      toast.error(mensajeDeErrorClases(error))
      if (!renuevaLasDudas(error)) return
      if (esDudaNoEncontrada(error)) quitarRespuestasDeUnaDudaQueSeVa(queryClient, claseId, dudaId)
      await invalidarDudas(queryClient, claseId)
    },
  })
}

export const useResponder = (claseId: string, dudaId: string) => {
  const queryClient = useQueryClient()
  const montado = useMontado()
  return useMutation({
    mutationFn: (datos: CrearRespuesta) =>
      api(`/api/clases/${claseId}/dudas/${dudaId}/respuestas`, {
        method: "POST",
        body: datos,
        schema: comentarioRespuestaSchema,
      }),
    onSuccess: () => {
      void invalidarRespuestasYDudas(queryClient, claseId, dudaId)
      toast.success(TEXTOS_RESPUESTAS.avisoPublicada)
    },
    onError: (error) =>
      avisarErrorDelTexto(montado, erroresDeLaRespuestaDeApi(error) !== null, error, () =>
        renovarTrasErrorDeRespuesta(queryClient, claseId, dudaId, error),
      ),
  })
}

export const useBorrarRespuesta = (claseId: string, dudaId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (respuestaId: string) =>
      api(`/api/clases/${claseId}/dudas/${dudaId}/respuestas/${respuestaId}`, {
        method: "DELETE",
        schema: sinContenidoSchema,
      }),
    onSuccess: async () => {
      toast.success(TEXTOS_RESPUESTAS.avisoBorrada)
      await invalidarRespuestasYDudas(queryClient, claseId, dudaId)
    },
    onError: async (error) => {
      if (errorQueRedirigeElCliente(error)) return
      toast.error(mensajeDeErrorClases(error))
      await renovarTrasErrorDeRespuesta(queryClient, claseId, dudaId, error)
    },
  })
}

export const useCategorias = (claseId: string, enabled = true) =>
  useQuery({ ...consultaCategorias(claseId), enabled })

// La lista de categorías que hay en la caché (la que dejó la última respuesta del servidor): el editor
// parte de ella tras un conflicto.
export const useCategoriasEnCache = (claseId: string) => {
  const queryClient = useQueryClient()
  return () => queryClient.getQueryData(consultaCategorias(claseId).queryKey)
}

// Las categorías se guardan en bloque (S-06). La respuesta es la lista guardada. Un error de una fila
// o de la lista lo muestra el editor; un conflicto (una categoría que ganó tareas o que ya no existe)
// avisa con el mensaje del servidor y vuelve a pedir la lista antes de terminar.
export const useGuardarCategorias = (claseId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (datos: ReemplazarCategorias) =>
      api(`/api/clases/${claseId}/categorias`, {
        method: "PUT",
        body: datos,
        schema: listaCategoriasRespuestaSchema,
      }),
    onSuccess: async (respuesta) => {
      queryClient.setQueryData(claveCategorias(claseId), respuesta)
      toast.success(TEXTOS_CATEGORIAS.avisoGuardadas)
      // La categoría y su peso también salen en el detalle de las tareas.
      await queryClient.invalidateQueries({ queryKey: ["clases", claseId, "tareas"] })
    },
    onError: async (error) => {
      if (erroresDeCategoriasDeApi(error, []) !== null) return
      toast.error(mensajeDeErrorClases(error))
      if (!esApiError(error) || !CODIGOS_QUE_RENUEVAN_LAS_CATEGORIAS.includes(error.codigo)) return
      await queryClient.invalidateQueries({ queryKey: claveCategorias(claseId) })
    },
  })
}

// CLASES-03 (§D-7.2, DH-03): el indicador de la sección activa toma la posición y el ancho de su
// opción (cada una a su ancho natural). Se mide antes de pintar al montar y al cambiar la sección
// activa, y solo entonces el panel se desplaza para dejar la opción a la vista (la página nunca). Un
// ResizeObserver sobre la lista y la carga de las fuentes vuelven a medir sin desplazar, si existen
// en el entorno. Sin sección activa (activa < 0) no mide.
// CLASES-03c1 (T-01 de la ronda 1): el indicador solo se desliza al cambiar de una sección a otra de
// la misma clase. Sin sección activa se olvida la medida, y la de otra clase (otra `base`) no se
// devuelve: al entrar, al volver de una pantalla sin sección o al cambiar de clase, el indicador no
// está en la página cuando se mide y aparece ya en su lugar, sin una posición vieja desde la que
// deslizarse.
export const useIndicadorDeSecciones = (activa: number, base: string) => {
  const panelRef = useRef<HTMLDivElement>(null)
  const listaRef = useRef<HTMLUListElement>(null)
  const [medida, setMedida] = useState<MedidaDelIndicadorDeLaClase | null>(null)
  // Se olvida durante el render (no en un efecto), en cuanto no hay sección activa.
  if (activa < 0 && medida !== null) setMedida(null)

  useLayoutEffect(() => {
    const opcion = opcionDeLaLista(listaRef.current, activa)
    if (opcion === null) return
    setMedida(conservarSiIgual({ ...medidaDelIndicador(opcion), base }))
    const panel = panelRef.current
    const lista = listaRef.current
    if (panel === null || lista === null) return
    // T-02: la opción se lleva a las coordenadas del área desplazable del panel (con su relleno).
    const enElPanel = opcionEnElPanel(
      opcion,
      lista.getBoundingClientRect().left,
      posicionDelPanel(panel),
    )
    const destino = desplazamientoParaVer(panel, enElPanel)
    if (destino === null) return
    panel.scrollLeft = destino
  }, [activa, base])

  useEffect(() => {
    const lista = listaRef.current
    if (activa < 0 || lista === null) return
    let vigente = true
    const volverAMedir = () => {
      const opcion = opcionDeLaLista(listaRef.current, activa)
      if (!vigente || opcion === null) return
      setMedida(conservarSiIgual({ ...medidaDelIndicador(opcion), base }))
    }
    const observador =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(volverAMedir)
    observador?.observe(lista)
    if ("fonts" in document && document.fonts !== undefined) {
      void document.fonts.ready.then(volverAMedir)
    }
    return () => {
      vigente = false
      observador?.disconnect()
    }
  }, [activa, base])

  const medidaDeLaClase = medida !== null && medida.base === base ? medida : null
  return { panelRef, listaRef, medida: medidaDeLaClase }
}

// El <li> de la sección activa (null sin sección activa o si la lista todavía no está).
const opcionDeLaLista = (lista: HTMLUListElement | null, activa: number): HTMLElement | null => {
  if (activa < 0 || lista === null) return null
  const opcion = lista.children[activa]
  return opcion instanceof HTMLElement ? opcion : null
}

// Una medida igual a la anterior (en la misma clase) no vuelve a pintar el indicador.
const conservarSiIgual =
  (nueva: MedidaDelIndicadorDeLaClase) =>
  (previa: MedidaDelIndicadorDeLaClase | null): MedidaDelIndicadorDeLaClase =>
    previa !== null &&
    previa.base === nueva.base &&
    previa.x === nueva.x &&
    previa.ancho === nueva.ancho
      ? previa
      : nueva

// Lo que opcionEnElPanel necesita del panel: su borde izquierdo en la ventana, su borde y su
// desplazamiento.
const posicionDelPanel = (panel: HTMLElement): PosicionDelPanel => ({
  left: panel.getBoundingClientRect().left,
  clientLeft: panel.clientLeft,
  scrollLeft: panel.scrollLeft,
})
