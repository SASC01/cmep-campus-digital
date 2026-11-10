import { createContext } from "react"

// ADMIN-01d1 (§D-9, S-15): si la clase que se mira está archivada, es decir, de solo lectura. Vale false
// sin proveedor porque fuera de ClaseLayout no hay clase que pueda estar archivada: un formulario o un
// elemento montados sueltos se pintan como siempre. ClaseLayout lo provee siempre de forma explícita.
export const ContextoDeSoloLectura = createContext(false)
