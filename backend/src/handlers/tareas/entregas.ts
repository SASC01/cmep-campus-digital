import { randomUUID } from "node:crypto"

import {
  alumnoDeEntregaParamSchema,
  anularEntregaSchema,
  archivoDeEntregaDeAlumnoParamSchema,
  archivoDeEntregaParamSchema,
  descargaRespuestaSchema,
  entregaDeAlumnoRespuestaSchema,
  entregarSchema,
  listaEntregasRespuestaSchema,
  miEntregaRespuestaSchema,
  paginacionRosterSchema,
  solicitarSubidaRespuestaSchema,
  solicitarSubidaSchema,
  tareaDeEntregaParamSchema,
} from "@campus/shared"
import type { FastifyPluginAsync, FastifyReply } from "fastify"

import {
  anularEntrega,
  buscarArchivoDeEntregaDeAlumno,
  buscarArchivoDeMiEntrega,
  entregar,
  leerEntregaDeAlumno,
  leerMiEntrega,
  listarEntregas,
  registrarArchivoPendiente,
  type ArchivoDb,
} from "../../adapters/db/index.js"
import { encolar } from "../../adapters/queue/index.js"
import type { Almacen } from "../../core/archivos/almacen.js"
import {
  almacenNoConfigurado,
  claveDeEntrega,
  disposicionDeContenido,
  prefijoDeEntrega,
  validarArchivoDeclarado,
  VIGENCIA_URL_FIRMADA_S,
} from "../../core/archivos/politica.js"
import { exigirEntregaAbierta } from "../../core/entregas/entregas.js"
import { AppError } from "../../core/errores.js"
import {
  COLA_ENTREGA_REALIZADA,
  type DatosEntregaRealizada,
} from "../../core/eventos/avisos-de-clase.js"
import { claseDe, perfilDe, protegido } from "../../middleware/index.js"
import { archivosParaConfirmar } from "../adjuntos.js"
import { entregaDeAlumnoParaResponder, miEntregaParaResponder } from "../respuestas-de-entrega.js"
import { validarCuerpo, validarParametros } from "../validacion.js"

const tareaNoEncontrada = (): AppError =>
  new AppError("TAREA_NO_ENCONTRADA", "Esa tarea ya no existe.", 404)

const archivoNoEncontrado = (): AppError =>
  new AppError("ARCHIVO_NO_ENCONTRADO", "Ese archivo ya no existe.", 404)

const expiraEn = (): string => new Date(Date.now() + VIGENCIA_URL_FIRMADA_S * 1000).toISOString()

// URL de descarga de 5 minutos, siempre como adjunto y sin caché (§D-3.6).
const responderDescarga = async (
  reply: FastifyReply,
  almacen: Almacen,
  archivo: ArchivoDb,
): Promise<FastifyReply> => {
  const url = await almacen.urlDeDescarga({
    clave: archivo.claveObjeto,
    tipo: archivo.tipo,
    disposicion: disposicionDeContenido(archivo.nombre, "attachment"),
  })
  reply.header("Cache-Control", "no-store")
  return reply.send(descargaRespuestaSchema.parse({ url, expiraEn: expiraEn() }))
}

// Rutas de ENTREGAS-01b (§D-0.1 y §D-3). Dos familias bajo /clases/:claseId/tareas/:tareaId/:
// …/entrega (singular) es la del alumno que llama, siempre perfilDe(request).id, sin :alumnoId; …/entregas
// y …/entregas/:alumnoId son las de los maestros de la clase y el admin (P-01 a: el admin lee). Ningún
// handler verifica rol, propiedad ni inscripción a mano: todo pasa por protegido() y por claseDe(request)
// (sexto paso); que :alumnoId sea un alumno inscrito con cuenta activa es un filtro de datos del
// adaptador (404 ALUMNO_NO_ENCONTRADO). ENTREGA_REALIZADA se encola en la transacción de la entrega:
// este handler solo pasa `sql` a encolar dentro de alGuardar (§D-0.4, §D-5). Anular no encola ni
// cancela nada (S-09).
export const entregasHandler: FastifyPluginAsync<{ almacen: Almacen | null }> = async (
  app,
  { almacen },
) => {
  app.get(
    "/clases/:claseId/tareas/:tareaId/entrega",
    protegido({ roles: ["estudiante"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { tareaId } = validarParametros(tareaDeEntregaParamSchema, request.params)
      const entrega = await leerMiEntrega({
        claseId,
        tareaId,
        alumnoId: perfilDe(request).id,
        ahora: new Date(),
      })
      if (entrega === null) throw tareaNoEncontrada()
      return reply.send(
        miEntregaRespuestaSchema.parse(await miEntregaParaResponder(almacen, entrega)),
      )
    },
  )

  app.post(
    "/clases/:claseId/tareas/:tareaId/entrega",
    protegido({ roles: ["estudiante"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const claseId = claseDe(request).id.toLowerCase()
      const { tareaId } = validarParametros(tareaDeEntregaParamSchema, request.params)
      const datos = validarCuerpo(entregarSchema, request.body)
      const alumnoId = perfilDe(request).id
      const ahora = new Date()
      // Un id nuevo por cada entrega (S-09): la misma fila puede entregarse varias veces.
      const eventoId = randomUUID()
      // Fuera de la transacción: los archivos pendientes del alumno con el prefijo de esta entrega,
      // comprobados en el almacén. La entrega los vuelve a comprobar al confirmarlos.
      const archivos = await archivosParaConfirmar({
        almacen,
        ids: datos.archivoIds,
        claseId,
        subidoPor: alumnoId,
        prefijo: prefijoDeEntrega(tareaId, alumnoId),
      })
      const entrega = await entregar(
        { claseId, tareaId, alumnoId, ahora, archivos, enlaces: datos.enlaces },
        async (sql, { entregaId, version }) => {
          const aviso: DatosEntregaRealizada = { entregaId, tareaId, claseId, version }
          await encolar(COLA_ENTREGA_REALIZADA, aviso, { id: eventoId, sql })
        },
      )
      if (entrega === null) throw tareaNoEncontrada()
      return reply.send(
        miEntregaRespuestaSchema.parse(await miEntregaParaResponder(almacen, entrega)),
      )
    },
  )

  app.post(
    "/clases/:claseId/tareas/:tareaId/entrega/anular",
    protegido({ roles: ["estudiante"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { tareaId } = validarParametros(tareaDeEntregaParamSchema, request.params)
      // Sin cuerpo; si llega uno, no puede traer campos (§D-3.7).
      if (request.body !== undefined) validarCuerpo(anularEntregaSchema, request.body)
      const entrega = await anularEntrega({
        claseId,
        tareaId,
        alumnoId: perfilDe(request).id,
        ahora: new Date(),
      })
      if (entrega === null) throw tareaNoEncontrada()
      return reply.send(
        miEntregaRespuestaSchema.parse(await miEntregaParaResponder(almacen, entrega)),
      )
    },
  )

  app.post(
    "/clases/:claseId/tareas/:tareaId/entrega/archivos",
    protegido({ roles: ["estudiante"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { tareaId } = validarParametros(tareaDeEntregaParamSchema, request.params)
      const datos = validarCuerpo(solicitarSubidaSchema, request.body)
      const invalido = validarArchivoDeclarado(datos)
      if (invalido !== null) throw invalido
      if (almacen === null) throw almacenNoConfigurado()
      const alumnoId = perfilDe(request).id

      // S-10: solo se sube si en este momento se puede entregar (la tarea existe, no hay entrega
      // vigente y no está cerrada); al entregar se vuelve a comprobar con la fila bloqueada.
      const ahora = new Date()
      const miEntrega = await leerMiEntrega({ claseId, tareaId, alumnoId, ahora })
      if (miEntrega === null) throw tareaNoEncontrada()
      exigirEntregaAbierta({ tarea: miEntrega.tarea, estado: miEntrega.estado, ahora })

      // El id nace aquí; el nombre del usuario nunca forma parte de la clave.
      const archivoId = randomUUID()
      const claveObjeto = claveDeEntrega(tareaId, alumnoId, archivoId)
      // Primero se firma: si el almacén falla no queda una fila pendiente huérfana.
      const url = await almacen.urlDeSubida({ clave: claveObjeto, tipo: datos.tipo })
      await registrarArchivoPendiente({
        id: archivoId,
        claseId,
        subidoPor: alumnoId,
        nombre: datos.nombre,
        tipo: datos.tipo,
        tamano: datos.tamano,
        claveObjeto,
      })
      reply.header("Cache-Control", "no-store")
      return reply.status(201).send(
        solicitarSubidaRespuestaSchema.parse({
          archivo: { id: archivoId, nombre: datos.nombre, tipo: datos.tipo, tamano: datos.tamano },
          subida: {
            url,
            metodo: "PUT",
            cabeceras: { "Content-Type": datos.tipo },
            expiraEn: expiraEn(),
          },
        }),
      )
    },
  )

  app.post(
    "/clases/:claseId/tareas/:tareaId/entrega/archivos/:archivoId/descarga",
    protegido({ roles: ["estudiante"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { tareaId, archivoId } = validarParametros(archivoDeEntregaParamSchema, request.params)
      if (almacen === null) throw almacenNoConfigurado()
      const archivo = await buscarArchivoDeMiEntrega({
        claseId,
        tareaId,
        alumnoId: perfilDe(request).id,
        archivoId,
      })
      if (archivo === null) throw archivoNoEncontrado()
      return responderDescarga(reply, almacen, archivo)
    },
  )

  app.get(
    "/clases/:claseId/tareas/:tareaId/entregas",
    protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { tareaId } = validarParametros(tareaDeEntregaParamSchema, request.params)
      const { cursor, limite } = validarParametros(paginacionRosterSchema, request.query)
      const lista = await listarEntregas({ claseId, tareaId, cursor, limite })
      if (lista === null) throw tareaNoEncontrada()
      return reply.send(
        listaEntregasRespuestaSchema.parse({
          entregas: lista.entregas.map((fila) => ({
            alumno: fila.alumno,
            estado: fila.estado,
            fechaEntrega: fila.fechaEntrega === null ? null : fila.fechaEntrega.toISOString(),
            conRetraso: fila.conRetraso,
          })),
          total: lista.total,
          entregadas: lista.entregadas,
          siguienteCursor: lista.siguienteCursor,
        }),
      )
    },
  )

  app.get(
    "/clases/:claseId/tareas/:tareaId/entregas/:alumnoId",
    protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { tareaId, alumnoId } = validarParametros(alumnoDeEntregaParamSchema, request.params)
      const entrega = await leerEntregaDeAlumno({ claseId, tareaId, alumnoId })
      if (entrega === null) throw tareaNoEncontrada()
      return reply.send(
        entregaDeAlumnoRespuestaSchema.parse(await entregaDeAlumnoParaResponder(almacen, entrega)),
      )
    },
  )

  app.post(
    "/clases/:claseId/tareas/:tareaId/entregas/:alumnoId/archivos/:archivoId/descarga",
    protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { tareaId, alumnoId, archivoId } = validarParametros(
        archivoDeEntregaDeAlumnoParamSchema,
        request.params,
      )
      if (almacen === null) throw almacenNoConfigurado()
      const archivo = await buscarArchivoDeEntregaDeAlumno({
        claseId,
        tareaId,
        alumnoId,
        archivoId,
      })
      if (archivo === null) throw archivoNoEncontrado()
      return responderDescarga(reply, almacen, archivo)
    },
  )
}
