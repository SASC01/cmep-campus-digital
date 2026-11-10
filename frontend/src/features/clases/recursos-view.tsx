import { BLOQUES_DE_RECURSO } from "@campus/shared"
import { useEffect, useId, useRef, type ReactNode } from "react"
import { useLocation } from "react-router"

import { Cargando } from "@/components/cargando"
import { useSoloLecturaDeLaClase } from "@/components/clase/hooks"
import { esClaseArchivada } from "@/components/clase/lib"
import { EstadoVacio } from "@/components/estado-vacio"
import { MensajeError } from "@/components/mensaje-error"
import { useAlPulsarLaSeccionActiva } from "@/components/seccion/hooks"
import { Card } from "@/components/ui/card"
import { baseDeClase } from "@/lib/ruta-de-clase"

import { ConClaseDeLaRuta } from "./components/con-clase-de-la-ruta"
import { FormularioRecurso } from "./components/formulario-recurso"
import { SeccionDeRecursos } from "./components/seccion-de-recursos"
import {
  CAPACIDADES_POR_PERSPECTIVA,
  ID_DEL_AVISO_DE_RECARGA_DE_RECURSOS,
  TEXTOS_DE_LOS_BLOQUES,
  TEXTOS_FORMULARIO_RECURSO,
  TEXTOS_RECURSOS,
} from "./data"
import { useAvisoDeRecargaFallida, useFilaEnFoco, useTemasDeLaSeccion } from "./hooks"
import {
  claveDeLaMarcaDeRecursos,
  errorQuitaLaVista,
  focoPerdido,
  marcaDeSeccionDeRecursos,
  mensajeDeConsultaClases,
  perspectivaDeRuta,
  seccionesDeRecursos,
  seccionVecina,
} from "./lib"
import type { BloqueDeRecurso, Perspectiva } from "./types"

interface BloqueDeRecursosProps {
  claseId: string
  bloque: BloqueDeRecurso
  base: string
  perspectiva: Perspectiva
}

// CLASES-03d (§D-8.1, DH-04): un bloque de "Recursos", una `section` con su h2 visible. La estructura
// (temas, orden, nombres y conteos) sale de la lista de temas del bloque: "Sin tema" si tiene recursos y
// después cada tema con recursos de ese bloque, en su orden. Un error solo afecta a este bloque; una
// recarga fallida con datos avisa una vez por fallo, con el id compartido por los dos bloques (un solo
// aviso a la vista). Estados: error → cargando → vacío → datos.
function BloqueDeRecursos({ claseId, bloque, base, perspectiva }: BloqueDeRecursosProps) {
  const temas = useTemasDeLaSeccion(claseId, bloque)
  const idTitulo = useId()
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  const bloqueRef = useRef<HTMLElement>(null)
  const seccionEnFocoRef = useFilaEnFoco("data-seccion-de-recursos")
  const clavesPrevias = useRef<string[] | undefined>(undefined)
  const clasePrevia = useRef(claseId)
  const textos = TEXTOS_DE_LOS_BLOQUES[bloque]
  const quitaLaVista = temas.isError && errorQuitaLaVista(temas.error)
  const secciones =
    temas.data === undefined || quitaLaVista ? undefined : seccionesDeRecursos(temas.data)
  const claves = secciones?.map(({ clave }) => clave)

  useAvisoDeRecargaFallida(
    temas.errorUpdateCount,
    temas.data !== undefined && !errorQuitaLaVista(temas.error) && !esClaseArchivada(temas.error),
    TEXTOS_RECURSOS.recargaFallida,
    ID_DEL_AVISO_DE_RECARGA_DE_RECURSOS,
  )

  // R3 y R9 (§D-10 a): pulsar "Recursos" estando ahí vuelve a pedir la lista de temas del bloque si está
  // en error; cada sección en error lo hace por su cuenta (SeccionDeRecursos). Lo sano no se pide.
  useAlPulsarLaSeccionActiva(() => {
    if (!temas.isError) return
    void temas.refetch()
  })

  // §7.14: si la sección que tenía el foco desaparece del bloque (se borró o se movió su último recurso),
  // el foco va al encabezado de la sección vecina y, sin vecinas, al h2 del bloque. Si la sección sigue
  // pero el control con el foco desapareció (su lista falló), a su encabezado. Al cambiar de clase, al
  // h2. Nunca a <body>. Las filas que salen de una sección que sigue las atiende SeccionDeRecursos.
  useEffect(() => {
    const previas = clavesPrevias.current
    clavesPrevias.current = claves
    const marca = seccionEnFocoRef.current
    const claveEnFoco = marca === null ? null : claveDeLaMarcaDeRecursos(marca, bloque)
    if (clasePrevia.current !== claseId) {
      clasePrevia.current = claseId
      if (claveEnFoco === null || !focoPerdido(document)) return
      seccionEnFocoRef.current = null
      encabezadoRef.current?.focus()
      return
    }
    if (claveEnFoco === null || !focoPerdido(document)) return
    seccionEnFocoRef.current = null
    const encabezadoDe = (clave: string): HTMLElement | null => {
      const raiz = bloqueRef.current
      if (raiz === null) return null
      const marcaBuscada = marcaDeSeccionDeRecursos(bloque, clave)
      const seccion = Array.from(raiz.querySelectorAll("[data-seccion-de-recursos]")).find(
        (elemento) => elemento.getAttribute("data-seccion-de-recursos") === marcaBuscada,
      )
      return seccion?.querySelector<HTMLElement>("[data-encabezado-tema]") ?? null
    }
    if (claves?.includes(claveEnFoco) === true) {
      encabezadoDe(claveEnFoco)?.focus()
      return
    }
    const vecina = claves === undefined ? undefined : seccionVecina(previas, claves, claveEnFoco)
    const destino = vecina === undefined ? null : encabezadoDe(vecina)
    if (destino === null) {
      encabezadoRef.current?.focus()
      return
    }
    destino.focus()
  })

  const contenido = (): ReactNode => {
    if (temas.isError && (temas.data === undefined || quitaLaVista)) {
      return <MensajeError mensaje={mensajeDeConsultaClases(temas.error)} />
    }
    if (secciones === undefined || temas.data === undefined) return <Cargando />
    if (secciones.length === 0) {
      return (
        <Card>
          <EstadoVacio titulo={textos.vacio} />
        </Card>
      )
    }
    const listaDeTemas = temas.data.temas
    return (
      <div className="flex flex-col gap-4">
        {secciones.map((seccion) => (
          <SeccionDeRecursos
            key={seccion.clave}
            claseId={claseId}
            bloque={bloque}
            seccion={seccion}
            temas={listaDeTemas}
            base={base}
            perspectiva={perspectiva}
          />
        ))}
      </div>
    )
  }

  return (
    <section ref={bloqueRef} aria-labelledby={idTitulo} className="flex flex-col gap-4">
      <h2 ref={encabezadoRef} id={idTitulo} tabIndex={-1} className="text-h2">
        {textos.titulo}
      </h2>
      {contenido()}
    </section>
  )
}

interface RecursosDeLaClaseProps {
  claseId: string
}

// CLASES-03d (§D-8.1, DESIGN.md §7.30): "Recursos" en las tres perspectivas. El maestro y el admin ven
// arriba "Nuevo recurso" (su "Publicar recurso" es la única acción principal de la vista), con la frase
// del bloque al que va: el del docente para el maestro y el de aprendizaje para el admin (el servidor
// decide el bloque por el rol del autor, S-01). Después, los dos bloques en orden. El estudiante solo lee
// y comenta. La ruta decide la perspectiva (perspectivaDeRuta); el backend lo exige por su cuenta.
function RecursosDeLaClase({ claseId }: RecursosDeLaClaseProps) {
  const { pathname } = useLocation()
  const perspectiva = perspectivaDeRuta(pathname)
  const capacidades = CAPACIDADES_POR_PERSPECTIVA[perspectiva]
  const base = baseDeClase(perspectiva, claseId)
  // ADMIN-01d1 (§D-9, fila 16): en una clase archivada no se publica un recurso.
  const soloLectura = useSoloLecturaDeLaClase()
  const destino =
    perspectiva === "admin"
      ? TEXTOS_FORMULARIO_RECURSO.destinoAprendizaje
      : TEXTOS_FORMULARIO_RECURSO.destinoDocente

  return (
    <div className="flex flex-col gap-6">
      {capacidades.gestionarTrabajo && !soloLectura && (
        <FormularioRecurso modo="crear" claseId={claseId} destino={destino} />
      )}
      {BLOQUES_DE_RECURSO.map((bloque) => (
        <BloqueDeRecursos
          key={bloque}
          claseId={claseId}
          bloque={bloque}
          base={base}
          perspectiva={perspectiva}
        />
      ))}
    </div>
  )
}

export function RecursosView() {
  return <ConClaseDeLaRuta>{(claseId) => <RecursosDeLaClase claseId={claseId} />}</ConClaseDeLaRuta>
}
