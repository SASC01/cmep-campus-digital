import { useQuery } from "@tanstack/react-query"
import { useEffect, useRef, type RefObject } from "react"

import { consultaClasesDeLaBarra } from "@/services/clasesService"

import type { RolConClases } from "./types"

// CLASES-02d (§D-2D1): las clases del usuario para la barra lateral. La clave cuelga de la de
// inscritas o impartidas, así que lo que ya invalida features/clases también la recarga.
export const useClasesDeLaBarra = (rol: RolConClases) => useQuery(consultaClasesDeLaBarra(rol))

// Marca del contenedor de la lista de clases (la lista, "Reintentar" y "Ver todas" van dentro): la
// escribe lista-de-clases.tsx como data-lista-de-clases.
const SELECTOR_DE_LA_LISTA = "[data-lista-de-clases]"

const estaEnLaLista = (elemento: Element | null): boolean =>
  elemento !== null && elemento.closest(SELECTOR_DE_LA_LISTA) !== null

// T-07 (ronda 1 de 02d, DESIGN.md §7.14): cuando el control de la lista que tiene el foco desaparece
// («Reintentar» que acierta, «Ver todas» o una clase que sale tras una recarga), el foco no cae en
// <body>: va al primer enlace de la lista o, si ya no hay lista, al primer enlace de la nav
// («Inicio»). Se decide después del render y solo si el foco se perdió, sin depender de quién
// resolvió la consulta (el reintento, otra pestaña, la invalidación de unirse). Mismo patrón que
// useFilaEnFoco de features/clases, que components/layout no puede importar.
export const useFocoDeLaLista = (navRef: RefObject<HTMLElement | null>) => {
  const teniaFoco = useRef(false)
  const ventanaConFoco = useRef(true)

  useEffect(() => {
    const alEntrar = (evento: FocusEvent) => {
      teniaFoco.current = evento.target instanceof Element && estaEnLaLista(evento.target)
    }
    // Un clic en blanco saca el foco a ningún elemento y el control sigue en el documento: ya no hay
    // nada que conservar. Si el control salió del documento, no se borra: es justo el caso a atender.
    // T-08 (ronda 2): al cambiar de pestaña o de aplicación el navegador también dispara focusout sin
    // relatedTarget sobre un control que sigue montado y enfocado, y la ventana pierde el foco justo
    // después (blur de window, o la pestaña queda oculta). Por eso se decide en el siguiente turno:
    // solo es un clic en blanco si la ventana conserva el foco; si no, se conserva la memoria.
    const alSalir = (evento: FocusEvent) => {
      if (evento.relatedTarget !== null) return
      const objetivo = evento.target
      if (!(objetivo instanceof Element) || !objetivo.isConnected) return
      setTimeout(() => {
        if (!objetivo.isConnected || !ventanaConFoco.current || !document.hasFocus()) return
        teniaFoco.current = false
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
    if (!teniaFoco.current) return
    const activo = document.activeElement
    const perdido = activo === null || activo === document.body || !activo.isConnected
    if (!perdido) return
    const nav = navRef.current
    const destino =
      nav?.querySelector<HTMLElement>(`${SELECTOR_DE_LA_LISTA} a`) ??
      nav?.querySelector<HTMLElement>("a") ??
      null
    teniaFoco.current = destino !== null && estaEnLaLista(destino)
    destino?.focus()
  })
}
