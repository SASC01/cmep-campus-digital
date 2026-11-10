import { useContext, useEffect, useRef, useState, type RefObject } from "react"

import { ContextoDeSoloLectura } from "./contexto-de-solo-lectura"

// ADMIN-01d1 (§D-9): lo leen los componentes de features/clases, features/tareas y
// features/calificaciones que pintan un control de escritura; en una clase archivada no lo pintan.
export const useSoloLecturaDeLaClase = (): boolean => useContext(ContextoDeSoloLectura)

// CLASES-03c2 (§D-11, O-16): `true` mientras el componente que llama al gancho está montado. Lo crea
// cada gancho de mutación de un formulario: su onError corre aunque el formulario ya no esté (T-30), y
// con él sabe si el formulario sigue ahí para mostrar el error bajo su campo. ADMIN-01d2 (Enmienda 11):
// sube aquí desde features/clases porque lo usan también los ganchos de features/tareas.
export const useMontado = (): RefObject<boolean> => {
  const montado = useRef(false)
  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])
  return montado
}

// T-02 (ronda 2 de 01d1): la generación de lo que se pinta en una clase. Sube cada vez que la clase entra
// en solo lectura. Un efecto asíncrono que al llegar reiniciaría un formulario, navegaría o movería el
// foco anota la generación del control que lo lanzó y, si al llegar ya no es la vigente, no hace nada: la
// clase se archivó (y quizá se restauró) mientras tanto, y lo que se ve ya no es aquel control.
export const useGeneracionDeSoloLectura = () => {
  const soloLectura = useSoloLecturaDeLaClase()
  const [anterior, setAnterior] = useState(soloLectura)
  const [generacion, setGeneracion] = useState(0)
  if (anterior !== soloLectura) {
    setAnterior(soloLectura)
    if (soloLectura) setGeneracion(generacion + 1)
  }
  const vigenteRef = useRef(generacion)
  useEffect(() => {
    vigenteRef.current = generacion
  }, [generacion])
  const sigueVigente = (anotada: number): boolean => vigenteRef.current === anotada
  return { generacion, sigueVigente }
}
