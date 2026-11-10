import { BookOpen } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import { Link } from "react-router"

import { useSoloLecturaDeLaClase } from "@/components/clase/hooks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { formatearFechaHora } from "@/lib/format"

import { CAPACIDADES_POR_PERSPECTIVA, TEXTOS_PUBLICACION, TEXTOS_RECURSOS } from "../data"
import { useBorrarRecurso } from "../hooks"
import type { Perspectiva, Recurso, Tema } from "../types"
import { AdjuntosDePublicacion } from "./adjuntos-de-publicacion"
import { ComentariosDePublicacion } from "./comentarios-de-publicacion"
import { FirmaDelAutor } from "./firma-del-autor"
import { MoverElemento } from "./mover-elemento"

interface ElementoDeRecursoProps {
  claseId: string
  recurso: Recurso
  // La base de la ruta de la clase en esta perspectiva (para "Editar recurso") y la perspectiva (quién
  // comenta y quién ve las acciones). Las decide la vista (perspectivaDeRuta); aquí no se calculan.
  base: string
  perspectiva: Perspectiva
  // El tema donde está hoy el recurso (null es "Sin tema") y los temas de su bloque, para "Mover".
  temaActual: string | null
  temas: readonly Tema[]
}

// CLASES-03d (§D-8.3, DESIGN.md §7.30): un recurso en su sección. La fila de vidrio fuerte de §7.22,
// con la insignia "Recurso" (texto e icono), la firma, la fecha y el título. "Ver recurso" (ghost,
// aria-expanded) despliega la descripción (texto plano: nunca se interpreta como HTML), los adjuntos y
// sus comentarios. Las acciones salen del permiso que da el servidor (`puedeEditar`, `puedeBorrar`,
// `puedeMover`) y nunca se muestran en la perspectiva del estudiante aunque el dato diga true. "Borrar
// recurso" pide confirmación en línea (§7.14): el foco va a "Cancelar" al pedirla y vuelve a "Borrar
// recurso" al cancelar.
export function ElementoDeRecurso({
  claseId,
  recurso,
  base,
  perspectiva,
  temaActual,
  temas,
}: ElementoDeRecursoProps) {
  const [abierto, setAbierto] = useState(false)
  const [comentariosAbiertos, setComentariosAbiertos] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const idContenido = useId()
  const idComentarios = useId()
  const borrar = useBorrarRecurso(claseId)
  const borrarBtnRef = useRef<HTMLButtonElement>(null)
  const cancelarBtnRef = useRef<HTMLButtonElement>(null)
  const confirmandoAnteriorRef = useRef(confirmando)
  // §D-12: guarda síncrona del borrado. `borrar.isPending` llega un render después; mientras está
  // marcada no sale un segundo DELETE y "Cancelar" no cierra la confirmación.
  const borrandoRef = useRef(false)
  // ADMIN-01d1 (§D-9, filas 17 a 19): en una clase archivada no se edita, borra ni mueve un recurso.
  const soloLectura = useSoloLecturaDeLaClase()
  const gestionar = CAPACIDADES_POR_PERSPECTIVA[perspectiva].gestionarTrabajo && !soloLectura
  // T-01 (ronda 1 de 01d1): al pasar a solo lectura, lo que estaba abierto se cierra aquí mismo, para que
  // al volver a activa (restaurada en esta u otra sesión) no reaparezca abierto sin que nadie lo pida.
  if (soloLectura && confirmando) setConfirmando(false)
  const ofreceBorrar = gestionar && recurso.puedeBorrar
  const textoDeConfirmacion =
    recurso.adjuntos.length > 0
      ? TEXTOS_RECURSOS.consecuenciaConAdjuntos
      : TEXTOS_RECURSOS.consecuencia

  useEffect(() => {
    if (confirmandoAnteriorRef.current === confirmando) return
    confirmandoAnteriorRef.current = confirmando
    if (confirmando) {
      cancelarBtnRef.current?.focus()
      return
    }
    borrarBtnRef.current?.focus()
  }, [confirmando])

  const confirmarBorrado = () => {
    if (borrandoRef.current) return
    borrandoRef.current = true
    borrar.mutate(recurso.id, {
      onSettled: () => {
        borrandoRef.current = false
      },
    })
  }

  const cancelarBorrado = () => {
    if (borrandoRef.current) return
    setConfirmando(false)
  }

  return (
    <li
      data-recurso-id={recurso.id}
      tabIndex={-1}
      className="vidrio-fuerte flex flex-col gap-3 rounded-row p-4"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Badge variant="muted" icon={<BookOpen aria-hidden="true" />}>
          {TEXTOS_RECURSOS.insignia}
        </Badge>
        <p className="text-small text-muted-foreground">
          <FirmaDelAutor autor={recurso.autor} /> · {formatearFechaHora(recurso.creadoEn)}
        </p>
      </div>
      <h4 className="font-bold wrap-anywhere">{recurso.titulo}</h4>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={abierto}
          aria-controls={idContenido}
          onClick={() => setAbierto((valor) => !valor)}
        >
          {abierto ? TEXTOS_RECURSOS.ocultarRecurso : TEXTOS_RECURSOS.verRecurso}
        </Button>
        {gestionar && recurso.puedeEditar && (
          <Link
            to={`${base}/recursos/${recurso.id}/editar`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {TEXTOS_RECURSOS.editar}
          </Link>
        )}
        {ofreceBorrar && !confirmando && (
          <Button
            ref={borrarBtnRef}
            type="button"
            variant="ghost"
            size="sm"
            data-borrar-recurso=""
            onClick={() => setConfirmando(true)}
          >
            {TEXTOS_RECURSOS.borrar}
          </Button>
        )}
      </div>

      {ofreceBorrar && confirmando && (
        <div className="flex flex-col gap-2">
          <p className="text-small">{textoDeConfirmacion}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              data-confirmar-borrado=""
              onClick={confirmarBorrado}
              enEspera={borrar.isPending}
            >
              {TEXTOS_RECURSOS.siBorrar}
            </Button>
            <Button
              ref={cancelarBtnRef}
              type="button"
              variant="outline"
              size="sm"
              onClick={cancelarBorrado}
            >
              {TEXTOS_RECURSOS.cancelar}
            </Button>
          </div>
        </div>
      )}

      {gestionar && recurso.puedeMover && (
        <MoverElemento
          claseId={claseId}
          publicacionId={recurso.id}
          titulo={recurso.titulo}
          temaActual={temaActual}
          temas={temas}
        />
      )}

      {abierto && (
        <div id={idContenido} className="flex flex-col gap-3">
          {recurso.texto !== "" && (
            <p className="max-w-prose whitespace-pre-line wrap-anywhere">{recurso.texto}</p>
          )}
          <AdjuntosDePublicacion claseId={claseId} adjuntos={recurso.adjuntos} />
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-expanded={comentariosAbiertos}
              aria-controls={comentariosAbiertos ? idComentarios : undefined}
              onClick={() => setComentariosAbiertos((valor) => !valor)}
            >
              {comentariosAbiertos
                ? TEXTOS_PUBLICACION.ocultarComentarios
                : TEXTOS_PUBLICACION.verComentarios(recurso.comentarios)}
            </Button>
          </div>
          {comentariosAbiertos && (
            <ComentariosDePublicacion
              id={idComentarios}
              claseId={claseId}
              publicacionId={recurso.id}
              perspectiva={perspectiva}
            />
          )}
        </div>
      )}
    </li>
  )
}
