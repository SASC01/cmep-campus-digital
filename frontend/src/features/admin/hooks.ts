import {
  altaAlumnoRespuestaSchema,
  contrasenaTemporalRespuestaSchema,
  crearEnlaceRegistroRespuestaSchema,
  enlaceRegistroRespuestaSchema,
  estadoPagoLoteRespuestaSchema,
  invitacionMasivaRespuestaSchema,
  listaEnlacesRegistroRespuestaSchema,
  listaMovimientosRespuestaSchema,
  listaRegistradosRespuestaSchema,
  listaUsuariosRespuestaSchema,
  resumenAdminRespuestaSchema,
  usuarioAdminFilaSchema,
  usuarioAdminSchema,
  type AltaAlumno,
  type CrearEnlaceRegistro,
  type EstadoPagoLote,
  type InvitacionMasiva,
  type InvitarMaestro,
} from "@campus/shared"
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { sacarDeLaCacheAlAsentar } from "@/lib/cache-de-mutaciones"
import { api } from "@/services/apiClient"

import {
  CLAVE_ENLACES_REGISTRO,
  CLAVE_FICHAS,
  CLAVE_LISTAS_DE_USUARIOS,
  CLAVE_MOVIMIENTOS,
  CLAVE_RESUMEN_ADMIN,
  claveRegistradosDelEnlace,
  claveTablaDeEstadoPago,
  claveTablaDeUsuarios,
  claveUsuario,
  TEXTOS_LOTE,
  TEXTOS_USUARIO,
} from "./data"
import {
  consultaDeAlumnos,
  consultaDeMovimientos,
  consultaDeUsuarios,
  errorQueRedirigeElCliente,
  mensajeDeErrorAdmin,
  reintentarConsultaAdmin,
  siguientePaginaDeUsuarios,
} from "./lib"
import type {
  CambiarAccesoVariables,
  CambiarActivoVariables,
  CambiarEstadoPagoVariables,
  CorregirCorreoVariables,
  EditarNombreVariables,
  EstadoPago,
  PaginaDeUsuarios,
  Rol,
  UsuarioAdmin,
  UsuarioAdminFila,
} from "./types"

const LIMITE_ENLACES = 20

const conCursor = (limite: number, cursor?: string): string => {
  const parametros = new URLSearchParams({ limite: String(limite) })
  if (cursor !== undefined) parametros.set("cursor", cursor)
  return parametros.toString()
}

// AUTH-03b, §D-B6: lista paginada de enlaces de registro ("Cargar más enlaces"). ADMIN-01g, ronda 2 (T-04):
// el mismo reintento que las demás consultas del módulo: un 4xx (también el 401 sin sesión) no se
// reintenta.
export const useEnlacesRegistro = () =>
  useInfiniteQuery({
    queryKey: CLAVE_ENLACES_REGISTRO,
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      api(`/api/admin/enlaces-registro?${conCursor(LIMITE_ENLACES, pageParam)}`, {
        schema: listaEnlacesRegistroRespuestaSchema,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultimaPagina) => ultimaPagina.siguienteCursor ?? undefined,
    retry: reintentarConsultaAdmin,
  })

const CLAVE_MUTACION_GENERAR_ENLACE = ["generar-enlace"] as const

// M-05, R-09: el token sale de la caché de mutaciones al asentarse (gcTime 0); quien lo usa lo
// copia a su propio estado en el onSuccess, antes de que se limpie.
export const useGenerarEnlace = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: CLAVE_MUTACION_GENERAR_ENLACE,
    mutationFn: (datos: CrearEnlaceRegistro) =>
      api("/api/admin/enlaces-registro", {
        method: "POST",
        body: datos,
        schema: crearEnlaceRegistroRespuestaSchema,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "enlaces-registro"] })
    },
    onSettled: () => sacarDeLaCacheAlAsentar(queryClient, CLAVE_MUTACION_GENERAR_ENLACE),
    gcTime: 0,
  })
}

// Idempotente en el servidor: revocar un enlace ya revocado responde 200.
export const useRevocarEnlace = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api(`/api/admin/enlaces-registro/${id}/revocar`, {
        method: "POST",
        schema: enlaceRegistroRespuestaSchema,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "enlaces-registro"] })
    },
  })
}

// ADMIN-01g, ronda 2 (T-04): con el reintento del módulo, como la lista de enlaces.
export const useRegistradosDelEnlace = (enlaceId: string) =>
  useInfiniteQuery({
    queryKey: claveRegistradosDelEnlace(enlaceId),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      api(
        `/api/admin/enlaces-registro/${enlaceId}/registrados?${conCursor(LIMITE_ENLACES, pageParam)}`,
        {
          schema: listaRegistradosRespuestaSchema,
        },
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultimaPagina) => ultimaPagina.siguienteCursor ?? undefined,
    retry: reintentarConsultaAdmin,
  })

// DEC-11. 201 con la cuenta creada (sin hash ni token).
export const useInvitarMaestro = () =>
  useMutation({
    mutationFn: (datos: InvitarMaestro) =>
      api("/api/admin/maestros", { method: "POST", body: datos, schema: usuarioAdminSchema }),
  })

// DEC-19: gcTime 0 para que la temporal no quede en la caché de mutaciones. ADMIN-01f (E-25): la ficha
// se remonta (key por id de usuario) al abrir otra cuenta, así también desaparece de la vista.
export const useRestablecerContrasena = () =>
  useMutation({
    mutationFn: (id: string) =>
      api(`/api/admin/usuarios/${id}/restablecer-contrasena`, {
        method: "POST",
        schema: contrasenaTemporalRespuestaSchema,
      }),
    gcTime: 0,
  })

// AUTH-03c, §D-C6: invitación masiva. Sin datos sensibles y sin invalidar ninguna consulta: la
// masiva no cambia los enlaces de registro.
export const useInvitarEnLote = () =>
  useMutation({
    mutationFn: (datos: InvitacionMasiva) =>
      api("/api/admin/maestros/lote", {
        method: "POST",
        body: datos,
        schema: invitacionMasivaRespuestaSchema,
      }),
  })

// ADMIN-01f (§D-11): lo que corregir el correo responde (sin la fecha de alta ni los datos de alumno) se
// funde con la ficha que ya estaba en la caché; sin ficha no hay nada que fundir.
const fundirEnLaFicha = (queryClient: QueryClient, cuenta: UsuarioAdmin) => {
  queryClient.setQueryData<UsuarioAdminFila>(claveUsuario(cuenta.id), (anterior) =>
    anterior === undefined ? anterior : { ...anterior, ...cuenta },
  )
}

// DEC-10. No revoca sesiones (S-06): el correo no es la credencial. ADMIN-01f (matriz): con éxito se
// renuevan la ficha (con la respuesta, aunque ya no esté a la vista) y las listas de usuarios.
export const useCorregirCorreo = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, datos }: CorregirCorreoVariables) =>
      api(`/api/admin/usuarios/${id}/correo`, {
        method: "PUT",
        body: datos,
        schema: usuarioAdminSchema,
      }),
    onSuccess: (corregido) => {
      fundirEnLaFicha(queryClient, corregido)
      void queryClient.invalidateQueries({ queryKey: CLAVE_LISTAS_DE_USUARIOS })
    },
  })
}

// El mismo fundido, para la vista que recibe la cuenta corregida por props (onCorreoCorregido de
// FichaDeCuenta). Repetirlo no cambia nada: la ficha ya tiene la respuesta.
export const useFundirEnLaFicha = () => {
  const queryClient = useQueryClient()
  return useCallback((cuenta: UsuarioAdmin) => fundirEnLaFicha(queryClient, cuenta), [queryClient])
}

// ADMIN-01f (§D-11, Enmienda 1 y corrección M-17): una consulta que quedó en error se marca vieja, sin
// pedirla, al dejar su clave (otro filtro u otro término) y al desmontarse la vista. Así volver a ella
// antes de que venza el staleTime la vuelve a pedir y la frase "Revisa tu conexión e inténtalo de
// nuevo" se cumple. Una consulta sana no se toca.
const marcarViejaSiQuedoEnError = (queryClient: QueryClient, queryKey: QueryKey) => {
  if (queryClient.getQueryState(queryKey)?.status !== "error") return
  void queryClient.invalidateQueries({ queryKey, exact: true, refetchType: "none" })
}

export const useMarcarViejaSiQuedoEnError = (queryKey: QueryKey) => {
  const queryClient = useQueryClient()
  const huella = JSON.stringify(queryKey)
  const claveRef = useRef(queryKey)
  useEffect(() => {
    claveRef.current = queryKey
  })
  useEffect(() => {
    const clave = claveRef.current
    return () => marcarViejaSiQuedoEnError(queryClient, clave)
  }, [queryClient, huella])
}

// ADMIN-01f (ADM-1F01, ADM-1F17): pulsar la sección en la que ya se está (useAlPulsarLaSeccionActiva)
// vuelve a pedir la consulta visible si quedó en error, desde la primera página; una sana no se pide.
export const useVolverAPedirSiFallo = (queryKey: QueryKey) => {
  const queryClient = useQueryClient()
  const claveRef = useRef(queryKey)
  useEffect(() => {
    claveRef.current = queryKey
  })
  return useCallback(() => {
    const clave = claveRef.current
    const estado = queryClient.getQueryState(clave)
    if (estado?.status !== "error") return
    // ADMIN-01g, ronda 3 (T-07): una consulta en error que ya se está recargando conserva status
    // "error"; resetQueries descartaría esa recarga y lanzaría una segunda petición.
    if (estado.fetchStatus === "fetching") return
    void queryClient.resetQueries({ queryKey: clave, exact: true })
  }, [queryClient])
}

// ADMIN-01f (§D-11, DESIGN.md §7.17): devuelve `valor` después de `ms` sin cambios; el buscador espera
// 300 ms desde la última tecla antes de decidir qué pide. Como el de features/clases, sin importarlo
// (regla 9).
export const useValorDiferido = (valor: string, ms: number): string => {
  const [diferido, setDiferido] = useState(valor)
  useEffect(() => {
    const temporizador = setTimeout(() => setDiferido(valor), ms)
    return () => clearTimeout(temporizador)
  }, [valor, ms])
  return diferido
}

// ADMIN-01f (§D-11): las tres cifras del dashboard (S-13).
export const useResumenAdmin = () =>
  useQuery({
    queryKey: CLAVE_RESUMEN_ADMIN,
    queryFn: () => api("/api/admin/resumen", { schema: resumenAdminRespuestaSchema }),
    retry: reintentarConsultaAdmin,
  })

// ADMIN-01f (§D-7.1, §D-11, Enmienda 5 y Enmienda 14): la tabla de /admin/usuarios, de 50 en 50 (el
// límite del servidor por omisión). La clave lleva el q que se manda, no lo escrito; `habilitada` es
// false cuando la tabla muestra su vacío de búsqueda sin preguntar.
export const useUsuariosAdmin = (
  q: string | undefined,
  rol: Rol | undefined,
  habilitada: boolean,
) =>
  useInfiniteQuery({
    queryKey: claveTablaDeUsuarios(q, rol),
    queryFn: ({ pageParam }: { pageParam: PaginaDeUsuarios | undefined }) =>
      api(`/api/admin/usuarios?${consultaDeUsuarios(q, rol, pageParam)}`, {
        schema: listaUsuariosRespuestaSchema,
      }),
    initialPageParam: undefined as PaginaDeUsuarios | undefined,
    getNextPageParam: (ultimaPagina) => siguientePaginaDeUsuarios(ultimaPagina),
    enabled: habilitada,
    retry: reintentarConsultaAdmin,
  })

// ADMIN-01f (§D-11): la ficha de una cuenta.
export const useUsuario = (id: string) =>
  useQuery({
    queryKey: claveUsuario(id),
    queryFn: () =>
      api(`/api/admin/usuarios/${encodeURIComponent(id)}`, { schema: usuarioAdminFilaSchema }),
    retry: reintentarConsultaAdmin,
  })

// ADMIN-01f (matriz de 01f): tras cambiar una cuenta, su ficha toma la respuesta del servidor y las
// listas de usuarios (la tabla y, en 01g, la de estado de pago) quedan viejas; con `conResumen`,
// también las cifras del dashboard.
const renovarTrasCambiarLaCuenta = (
  queryClient: QueryClient,
  cuenta: UsuarioAdminFila,
  conResumen: boolean,
) => {
  queryClient.setQueryData(claveUsuario(cuenta.id), cuenta)
  void queryClient.invalidateQueries({ queryKey: CLAVE_LISTAS_DE_USUARIOS })
  if (conResumen) void queryClient.invalidateQueries({ queryKey: CLAVE_RESUMEN_ADMIN })
}

// Si el componente que lanzó la mutación sigue montado.
const useMontadoAdmin = () => {
  const montado = useRef(false)
  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])
  return montado
}

// ADMIN-01f (§D-11, "Avisos con la vista desmontada"): con el control montado, el error lo pinta el
// propio control; desmontado, el gancho avisa una vez con el texto traducido, salvo un error con que
// apiClient ya redirige.
const avisarErrorConElControlDesmontado = (montado: { current: boolean }, error: unknown) => {
  if (montado.current || errorQueRedirigeElCliente(error)) return
  toast.error(mensajeDeErrorAdmin(error))
}

export const useEditarNombre = () => {
  const queryClient = useQueryClient()
  const montado = useMontadoAdmin()
  return useMutation({
    mutationFn: ({ id, datos }: EditarNombreVariables) =>
      api(`/api/admin/usuarios/${id}/nombre`, {
        method: "PUT",
        body: datos,
        schema: usuarioAdminFilaSchema,
      }),
    onSuccess: (cuenta) => {
      renovarTrasCambiarLaCuenta(queryClient, cuenta, false)
      toast.success(TEXTOS_USUARIO.editarNombre.aviso)
    },
    onError: (error) => avisarErrorConElControlDesmontado(montado, error),
  })
}

// ADMIN-01f (P-01 a, §7.13): la temporal se muestra una sola vez; gcTime 0 y fuera de la caché de
// mutaciones al asentarse, como el token de un enlace. Quien la muestra la copia a su estado.
const CLAVE_MUTACION_ALTA_ALUMNO = ["alta-alumno"] as const

export const useAltaAlumno = () => {
  const queryClient = useQueryClient()
  const montado = useMontadoAdmin()
  return useMutation({
    mutationKey: CLAVE_MUTACION_ALTA_ALUMNO,
    mutationFn: (datos: AltaAlumno) =>
      api("/api/admin/alumnos", { method: "POST", body: datos, schema: altaAlumnoRespuestaSchema }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLAVE_LISTAS_DE_USUARIOS })
      void queryClient.invalidateQueries({ queryKey: CLAVE_RESUMEN_ADMIN })
    },
    onError: (error) => avisarErrorConElControlDesmontado(montado, error),
    onSettled: () => sacarDeLaCacheAlAsentar(queryClient, CLAVE_MUTACION_ALTA_ALUMNO),
    gcTime: 0,
  })
}

// Dar de baja ({ activo: false }) y reactivar ({ activo: true }).
export const useCambiarActivo = () => {
  const queryClient = useQueryClient()
  const montado = useMontadoAdmin()
  return useMutation({
    mutationFn: ({ id, activo }: CambiarActivoVariables) =>
      api(`/api/admin/usuarios/${id}/activo`, {
        method: "PUT",
        body: { activo },
        schema: usuarioAdminFilaSchema,
      }),
    onSuccess: (cuenta, { activo }) => {
      renovarTrasCambiarLaCuenta(queryClient, cuenta, true)
      toast.success(activo ? TEXTOS_USUARIO.reactivar.aviso : TEXTOS_USUARIO.baja.aviso)
    },
    onError: (error) => avisarErrorConElControlDesmontado(montado, error),
  })
}

// Restringir ({ restringido: true, motivo? }) y restablecer el acceso ({ restringido: false }).
export const useCambiarAcceso = () => {
  const queryClient = useQueryClient()
  const montado = useMontadoAdmin()
  return useMutation({
    mutationFn: ({ id, datos }: CambiarAccesoVariables) =>
      api(`/api/admin/alumnos/${id}/acceso`, {
        method: "PUT",
        body: datos,
        schema: usuarioAdminFilaSchema,
      }),
    onSuccess: (cuenta, { datos }) => {
      renovarTrasCambiarLaCuenta(queryClient, cuenta, true)
      toast.success(
        datos.restringido
          ? TEXTOS_USUARIO.restringir.aviso
          : TEXTOS_USUARIO.restablecerAcceso.aviso,
      )
    },
    onError: (error) => avisarErrorConElControlDesmontado(montado, error),
  })
}

// El estado de pago de un alumno desde su ficha: el lote con un solo id (§D-8). La respuesta trae solo
// el número de actualizados, así que la ficha se vuelve a pedir.
export const useCambiarEstadoPago = () => {
  const queryClient = useQueryClient()
  const montado = useMontadoAdmin()
  return useMutation({
    mutationFn: ({ id, estadoPago }: CambiarEstadoPagoVariables) =>
      api("/api/admin/alumnos/estado-pago", {
        method: "PUT",
        body: { alumnoIds: [id], estadoPago },
        schema: estadoPagoLoteRespuestaSchema,
      }),
    onSuccess: (_respuesta, { id, estadoPago }) => {
      // T-01 (ronda 1): la ficha toma el estado guardado en cuanto el servidor lo confirma, y además se
      // vuelve a pedir (la respuesta solo trae el número de actualizados).
      queryClient.setQueryData<UsuarioAdminFila>(claveUsuario(id), (anterior) =>
        anterior === undefined ? anterior : { ...anterior, estadoPago },
      )
      void queryClient.invalidateQueries({ queryKey: claveUsuario(id) })
      void queryClient.invalidateQueries({ queryKey: CLAVE_LISTAS_DE_USUARIOS })
      void queryClient.invalidateQueries({ queryKey: CLAVE_RESUMEN_ADMIN })
      toast.success(TEXTOS_USUARIO.estadoPago.aviso)
    },
    onError: (error) => avisarErrorConElControlDesmontado(montado, error),
  })
}

// ADMIN-01g (§D-11, Enmienda 15): la tabla de /admin/estado-pago, sobre GET /admin/usuarios con
// rol=estudiante y, si el filtro lo pide, estadoPago; la página siguiente lleva la posición del cursor.
export const useAlumnosEstadoPago = (
  q: string | undefined,
  estadoPago: EstadoPago | undefined,
  habilitada: boolean,
) =>
  useInfiniteQuery({
    queryKey: claveTablaDeEstadoPago(q, estadoPago),
    queryFn: ({ pageParam }: { pageParam: PaginaDeUsuarios | undefined }) =>
      api(`/api/admin/usuarios?${consultaDeAlumnos(q, estadoPago, pageParam)}`, {
        schema: listaUsuariosRespuestaSchema,
      }),
    initialPageParam: undefined as PaginaDeUsuarios | undefined,
    getNextPageParam: (ultimaPagina) => siguientePaginaDeUsuarios(ultimaPagina),
    enabled: habilitada,
    retry: reintentarConsultaAdmin,
  })

// ADMIN-01g (§D-8, §D-11): el cambio de estado de pago por lote (hasta 100). Con éxito, las listas, las
// fichas y el resumen quedan viejos y se avisa con el número de alumnos enviados; con el diálogo
// desmontado, el error se avisa una vez (salvo uno que redirige).
export const useCambiarEstadoPagoLote = () => {
  const queryClient = useQueryClient()
  const montado = useMontadoAdmin()
  return useMutation({
    mutationFn: (datos: EstadoPagoLote) =>
      api("/api/admin/alumnos/estado-pago", {
        method: "PUT",
        body: datos,
        schema: estadoPagoLoteRespuestaSchema,
      }),
    onSuccess: (_respuesta, { alumnoIds }) => {
      void queryClient.invalidateQueries({ queryKey: CLAVE_LISTAS_DE_USUARIOS })
      void queryClient.invalidateQueries({ queryKey: CLAVE_FICHAS })
      void queryClient.invalidateQueries({ queryKey: CLAVE_RESUMEN_ADMIN })
      toast.success(TEXTOS_LOTE.aviso(alumnoIds.length))
    },
    onError: (error) => avisarErrorConElControlDesmontado(montado, error),
  })
}

// ADMIN-01g (§D-7.7): /admin/movimientos, de 50 en 50, solo con el cursor.
export const useMovimientos = () =>
  useInfiniteQuery({
    queryKey: CLAVE_MOVIMIENTOS,
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      api(`/api/admin/movimientos-inscripcion?${consultaDeMovimientos(pageParam)}`, {
        schema: listaMovimientosRespuestaSchema,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultimaPagina) => ultimaPagina.siguienteCursor ?? undefined,
    retry: reintentarConsultaAdmin,
  })
