import {
  accesoSchema,
  altaAlumnoRespuestaSchema,
  altaAlumnoSchema,
  cambiarActivoSchema,
  editarNombreSchema,
  estadoPagoLoteRespuestaSchema,
  estadoPagoLoteSchema,
  listaMovimientosConsultaSchema,
  listaMovimientosRespuestaSchema,
  listaUsuariosConsultaSchema,
  listaUsuariosRespuestaSchema,
  resumenAdminRespuestaSchema,
  usuarioAdminFilaSchema,
} from "@campus/shared"
import type { FastifyPluginAsync } from "fastify"
import { z } from "zod"

import { generarContrasenaTemporal, hashContrasena } from "../../adapters/auth/index.js"
import {
  cambiarAcceso,
  cambiarActivo,
  cambiarEstadoPagoEnLote,
  crearAlumnoConTemporal,
  editarNombre,
  leerResumenAdmin,
  leerUsuarioAdmin,
  listarMovimientosDeInscripcion,
  listarUsuarios,
} from "../../adapters/db/index.js"
import { prepararNombre, prepararRegistro } from "../../core/auth/normalizacion.js"
import { firmaDelAutor } from "../../core/autoria.js"
import { AppError } from "../../core/errores.js"
import { decidirCambioDeAcceso } from "../../core/usuarios/acceso.js"
import { decidirCambioDeActivo } from "../../core/usuarios/baja.js"
import { errorBusquedaMuyCorta, prepararBusquedaDeUsuarios } from "../../core/usuarios/busqueda.js"
import { filaDeUsuarioAdmin } from "../../core/usuarios/fila.js"
import { TEXTOS_USUARIOS } from "../../core/usuarios/textos.js"
import { protegido } from "../../middleware/index.js"
import { validarCuerpo, validarParametros } from "../validacion.js"

// ADMIN-01e (§D-7, §D-8): gestión de usuarios, estado de pago, acceso, resumen y movimientos. Lo
// registra el plugin de handlers/admin.ts (mismo prefijo /api/admin). Todas las rutas son solo del
// admin; la cadena de middleware decide quién llega, y core/ y el adaptador, lo demás.

const parametrosIdSchema = z.object({ id: z.uuid("id: debe ser un identificador válido") })

const usuarioNoEncontrado = (): AppError =>
  new AppError("USUARIO_NO_ENCONTRADO", TEXTOS_USUARIOS.usuarioNoEncontrado, 404)

export const usuariosAdminHandler: FastifyPluginAsync = async (app) => {
  app.get("/usuarios", protegido({ roles: ["admin"] }), async (request, reply) => {
    const consulta = validarParametros(listaUsuariosConsultaSchema, request.query)
    let busqueda: { nombre: string; email: string } | undefined
    if (consulta.q !== undefined) {
      const preparada = prepararBusquedaDeUsuarios(consulta.q)
      if (preparada === null) throw errorBusquedaMuyCorta()
      busqueda = preparada
    }
    const lista = await listarUsuarios({
      busqueda,
      rol: consulta.rol,
      estadoPago: consulta.estadoPago,
      cursor: consulta.cursor,
      cursorNombre: consulta.cursorNombre,
      limite: consulta.limite,
    })
    return reply.send(
      listaUsuariosRespuestaSchema.parse({
        usuarios: lista.usuarios.map(filaDeUsuarioAdmin),
        siguienteCursor: lista.siguienteCursor,
        siguienteCursorNombre: lista.siguienteCursorNombre,
      }),
    )
  })

  app.get("/usuarios/:id", protegido({ roles: ["admin"] }), async (request, reply) => {
    const { id } = validarParametros(parametrosIdSchema, request.params)
    const cuenta = await leerUsuarioAdmin(id)
    if (cuenta === null) throw usuarioNoEncontrado()
    return reply.send(usuarioAdminFilaSchema.parse(filaDeUsuarioAdmin(cuenta)))
  })

  app.put("/usuarios/:id/nombre", protegido({ roles: ["admin"] }), async (request, reply) => {
    const { id } = validarParametros(parametrosIdSchema, request.params)
    const datos = validarCuerpo(editarNombreSchema, request.body)
    const cuenta = await editarNombre({ id, ...prepararNombre(datos.nombre) })
    if (cuenta === null) throw usuarioNoEncontrado()
    return reply.send(usuarioAdminFilaSchema.parse(filaDeUsuarioAdmin(cuenta)))
  })

  app.put("/usuarios/:id/activo", protegido({ roles: ["admin"] }), async (request, reply) => {
    const { id } = validarParametros(parametrosIdSchema, request.params)
    const datos = validarCuerpo(cambiarActivoSchema, request.body)
    const cuenta = await cambiarActivo({
      id,
      activo: datos.activo,
      ahora: new Date(),
      decidir: decidirCambioDeActivo,
    })
    if (cuenta === null) throw usuarioNoEncontrado()
    return reply.send(usuarioAdminFilaSchema.parse(filaDeUsuarioAdmin(cuenta)))
  })

  // §D-7.5 (P-01 a): el argon2 va antes de la transacción; la temporal se muestra una sola vez.
  app.post("/alumnos", protegido({ roles: ["admin"] }), async (request, reply) => {
    const datos = validarCuerpo(altaAlumnoSchema, request.body)
    const cuenta = prepararRegistro(datos)
    const contrasenaTemporal = generarContrasenaTemporal()
    const hash = await hashContrasena(contrasenaTemporal)
    const creada = await crearAlumnoConTemporal({ ...cuenta, hashContrasena: hash })

    reply.header("Cache-Control", "no-store")
    return reply.status(201).send(
      altaAlumnoRespuestaSchema.parse({
        usuario: filaDeUsuarioAdmin(creada),
        contrasenaTemporal,
      }),
    )
  })

  app.put("/alumnos/estado-pago", protegido({ roles: ["admin"] }), async (request, reply) => {
    const datos = validarCuerpo(estadoPagoLoteSchema, request.body)
    const actualizados = await cambiarEstadoPagoEnLote({
      alumnoIds: datos.alumnoIds,
      estadoPago: datos.estadoPago,
      ahora: new Date(),
    })
    return reply.send(estadoPagoLoteRespuestaSchema.parse({ actualizados }))
  })

  app.put("/alumnos/:id/acceso", protegido({ roles: ["admin"] }), async (request, reply) => {
    const { id } = validarParametros(parametrosIdSchema, request.params)
    const datos = validarCuerpo(accesoSchema, request.body)
    const cuenta = await cambiarAcceso({
      id,
      pedido: datos,
      ahora: new Date(),
      decidir: decidirCambioDeAcceso,
    })
    if (cuenta === null) throw usuarioNoEncontrado()
    return reply.send(usuarioAdminFilaSchema.parse(filaDeUsuarioAdmin(cuenta)))
  })

  app.get("/resumen", protegido({ roles: ["admin"] }), async (_request, reply) => {
    const resumen = await leerResumenAdmin()
    return reply.send(resumenAdminRespuestaSchema.parse(resumen))
  })

  app.get("/movimientos-inscripcion", protegido({ roles: ["admin"] }), async (request, reply) => {
    const { cursor, limite } = validarParametros(listaMovimientosConsultaSchema, request.query)
    const lista = await listarMovimientosDeInscripcion({ cursor, limite })
    return reply.send(
      listaMovimientosRespuestaSchema.parse({
        movimientos: lista.movimientos.map((movimiento) => ({
          id: movimiento.id,
          secuencia: movimiento.secuencia.toString(),
          tipo: movimiento.tipo,
          creadoEn: movimiento.creadoEn.toISOString(),
          clase: movimiento.clase,
          alumno: movimiento.alumno,
          actor: firmaDelAutor(movimiento.actor),
        })),
        siguienteCursor: lista.siguienteCursor,
      }),
    )
  })
}
