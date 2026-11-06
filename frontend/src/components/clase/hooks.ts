import { useContext, useEffect, useRef, useState } from "react"

import { ContextoDeSoloLectura } from "./contexto-de-solo-lectura"

// ADMIN-01d1 (§D-9): lo leen los componentes de features/clases, features/tareas y
// features/calificaciones que pintan un control de escritura; en una clase archivada no lo pintan.
export const useSoloLecturaDeLaClase = (): boolean => useContext(ContextoDeSoloLectura)

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
