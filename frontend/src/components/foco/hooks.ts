import { useEffect, useRef, type RefObject } from "react"

import { focoPerdido } from "./lib"

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
// ADMIN-01f (T-02 de la ronda 1): con incluirDialogos, también cuenta como de la vista un control dentro
// de un diálogo abierto (role="dialog"), que vive en un portal fuera del contenedor. Si un cambio de la
// clave lo desmonta con el foco dentro (otra cuenta con el diálogo abierto), el foco va al contenedor.
// Sin el parámetro, el criterio no cambia.
export const useFocoAlPerderseElControl = (
  contenedorRef: RefObject<HTMLElement | null>,
  clave: string,
  incluirDialogos = false,
) => {
  const controlRef = useRef<Element | null>(null)
  const ventanaConFoco = useRef(true)

  useEffect(() => {
    const alEnfocar = (evento: FocusEvent) => {
      const contenedor = contenedorRef.current
      const destino = evento.target
      const dentro =
        contenedor !== null && destino instanceof Element && contenedor.contains(destino)
      const enUnDialogo =
        incluirDialogos && destino instanceof Element && destino.closest('[role="dialog"]') !== null
      controlRef.current = dentro || enUnDialogo ? destino : null
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
  }, [contenedorRef, incluirDialogos])

  useEffect(() => {
    const control = controlRef.current
    if (control === null || control.isConnected) return
    const activo = document.activeElement
    if (activo !== null && activo !== document.body && activo.isConnected) return
    controlRef.current = null
    contenedorRef.current?.focus()
  }, [clave, contenedorRef])
}

// ADMIN-01f (§D-11): movido sin cambios desde features/clases/hooks.ts, que lo reexporta.
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
