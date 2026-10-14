import { useEffect, useRef, type RefObject } from "react"

// CALIFICACIONES-01d (§D-13.1, A-4): movido sin cambios desde features/tareas/hooks.ts, que lo
// reexporta, para que features/calificaciones use el mismo criterio de foco (regla 9 de CLAUDE.md).

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
