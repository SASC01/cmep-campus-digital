// Superficie pública de adapters/db. El cliente (obtenerDb) no se reexporta a propósito; solo las
// pruebas lo importan directamente desde ./cliente.js para preparar y limpiar datos.
export {
  cerrarConexion,
  ejecutorSqlDe,
  inicializarDb,
  type Ejecutor,
  type EjecutorSql,
} from "./cliente.js"
export { verificarConexion } from "./salud.js"
export {
  actualizarContrasenaYRevocarSesiones,
  buscarAdmin,
  buscarCredencialesPorEmail,
  buscarCredencialesPorId,
  buscarCuentaPorEmail,
  buscarCuentaPorId,
  buscarPerfilPorId,
  cambiarContrasenaPropia,
  corregirCorreo,
  crearMaestroInvitado,
  crearUsuario,
  crearUsuarioConSesion,
  existeAdmin,
  restablecerConTemporal,
  type CredencialesDeUsuario,
  type NuevaSesionDeUsuario,
  type NuevoMaestroInvitado,
  type NuevoUsuario,
  type UsuarioAdmin,
} from "./usuarios.js"
export {
  cambiarAcceso,
  cambiarActivo,
  cambiarEstadoPagoEnLote,
  crearAlumnoConTemporal,
  editarNombre,
  leerResumenAdmin,
  leerUsuarioAdmin,
  listarUsuarios,
  type EstadoPagoDb,
  type ListaUsuariosDb,
  type ResumenAdminDb,
  type UsuarioGestionDb,
} from "./gestion-de-usuarios.js"
export {
  listarMovimientosDeInscripcion,
  type ListaMovimientosDb,
  type MovimientoDeInscripcionDb,
} from "./movimientos.js"
export {
  buscarEnlacePorHash,
  buscarEnlacePorId,
  crearEnlaceRegistro,
  listarEnlacesRegistro,
  listarRegistradosPorEnlace,
  registrarMaestroConEnlace,
  revocarEnlaceRegistro,
  type EnlaceRegistroConRegistrados,
  type EnlaceRegistroDb,
  type ListaEnlacesDb,
  type ListaRegistradosDb,
  type RegistradoDb,
} from "./enlaces-registro.js"
export {
  buscarSesionPorHash,
  crearSesion,
  revocarSesion,
  revocarSesionPorHash,
  revocarTodasLasSesiones,
  rotarSesion,
  type DatosDeSesion,
  type SesionEncontrada,
} from "./sesiones.js"
export {
  buscarInvitacionPorHash,
  buscarTokenParaEnvio,
  buscarTokenPorHash,
  contarRecuperacionesRecientes,
  prepararTokenDeRecuperacion,
  usarTokenYCambiarContrasena,
  type InvitacionParaUso,
  type TokenParaEnvio,
  type TokenParaUso,
} from "./tokens-cuenta.js"
export {
  CLAVE_BLOQUEO_INVITACIONES_EN_LOTE,
  invitarMaestrosEnLote,
  type CandidatoParaInvitarEnLote,
  type ResultadoInvitacionEnLote,
} from "./invitaciones.js"
export {
  buscarDatosDePertenencia,
  crearClaseAdministrada,
  editarClase,
  leerClase,
  leerCodigo,
  listarClasesAdmin,
  listarClasesImpartidas,
  listarClasesInscritas,
  ORDEN_DE_MAESTROS,
  regenerarCodigo,
  unirseConCodigo,
  type ClaseAdminDb,
  type ClaseDb,
  type DatosDePertenencia,
  type ListaClasesAdminDb,
  type ListaClasesImpartidasDb,
  type ListaClasesInscritasDb,
  type MaestroDb,
} from "./clases.js"
export {
  archivarClase,
  listarClasesAnteriores,
  restaurarClase,
  type ClaseAnteriorDb,
  type ListaClasesAnterioresDb,
} from "./clases-archivadas.js"
export {
  borrarClaseDefinitivamente,
  contarParaBorrar,
  type BorradoDeClase,
} from "./borrado-de-clase.js"
export { duplicarClase, type DuplicadoDeClase } from "./duplicado-de-clase.js"
export {
  descartarCopias,
  leerCopiasPendientes,
  terminarCopias,
  type CopiaPendiente,
} from "./copias-de-archivos.js"
export {
  asignarMaestro,
  buscarMaestrosCandidatos,
  retirarMaestro,
  type CandidatoMaestroDb,
  type ListaCandidatosMaestroDb,
  type MaestrosDeClaseDb,
} from "./maestros-de-clase.js"
export {
  agregarAlumnoManual,
  buscarCandidatos,
  listarAlumnosDeClase,
  listarPersonas,
  quitarAlumno,
  type AlumnoDeClaseDb,
  type CandidatoDb,
  type ListaAlumnosDeClaseDb,
  type ListaCandidatosDb,
  type ListaPersonasDb,
  type PersonaConCorreoDb,
  type PersonaDb,
} from "./inscripciones.js"
export {
  buscarArchivoConfirmado,
  buscarArchivosParaConfirmar,
  registrarArchivoPendiente,
  type ArchivoDb,
} from "./archivos.js"
export {
  borrarComentario,
  borrarMiComentario,
  borrarPublicacion,
  crearComentario,
  crearPublicacion,
  listarComentarios,
  listarPublicaciones,
  type AutorDb,
  type ComentarioDb,
  type ListaComentariosDb,
  type ListaPublicacionesDb,
  type PublicacionDb,
} from "./publicaciones.js"
export {
  borrarTema,
  crearTema,
  listarTemas,
  listarTemasDeLaSeccion,
  moverATema,
  ordenarTemas,
  renombrarTema,
  type ElementoMovidoDb,
  type ListaTemasDb,
  type TemaDb,
} from "./temas.js"
export {
  editarRecurso,
  leerRecurso,
  listarRecursos,
  type ListaRecursosDb,
  type RecursoDb,
  type RecursoDetalleDb,
} from "./recursos.js"
export {
  borrarDuda,
  borrarRespuesta,
  crearDuda,
  crearRespuesta,
  listarDudas,
  listarRespuestas,
  marcarDuda,
  type DudaDb,
  type ListaDudasDb,
  type ListaRespuestasDb,
} from "./dudas.js"
export { listarCategorias, reemplazarCategorias, type CategoriaDb } from "./categorias.js"
export {
  adjuntosConfirmadosDe,
  borrarTarea,
  crearTarea,
  editarTarea,
  leerTarea,
  listarTrabajo,
  type CriterioNuevo,
  type DatosDeTarea,
  type ElementoDeTrabajoDb,
  type ListaTrabajoDb,
  type TareaDetalleDb,
} from "./tareas.js"
export {
  anularEntrega,
  buscarArchivoDeEntregaDeAlumno,
  buscarArchivoDeMiEntrega,
  calificarEntrega,
  comentarEnHiloPrivado,
  entregar,
  leerEntregaDeAlumno,
  leerMiEntrega,
  listarEntregas,
  listarHiloPrivado,
  type AlumnoDeEntregaDb,
  type CalificacionDb,
  type ComentarioPrivadoDb,
  type EntregaDeAlumnoDb,
  type FilaDeEntregaDb,
  type ListaComentariosPrivadosDb,
  type ListaEntregasDb,
  type MiEntregaDb,
  type PuntajeDeCriterioDb,
} from "./entregas.js"
export {
  leerGradebook,
  leerMisCalificaciones,
  type CeldaDelGradebookDb,
  type ColumnaDelGradebookDb,
  type EntregaResumidaDb,
  type FiltroDeMisCalificacionesDb,
  type FilaDelGradebookDb,
  type GradebookDb,
  type MisCalificacionesDb,
  type TareaDeMisCalificacionesDb,
} from "./calificaciones.js"
export {
  leerExportacionDeCalificaciones,
  type AlumnoDeExportacionDb,
  type ExportacionDeCalificacionesDb,
  type FilaDeExportacionDb,
} from "./exportacion-de-calificaciones.js"
