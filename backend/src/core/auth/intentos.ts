// Límite de intentos de login (ESSENTIALS: 5 / 15 min por IP + correo). Solo cuentan los fallos;
// un acierto borra la llave. El almacén (Map en memoria del proceso, una sola instancia, S-13) vive
// en handlers/auth; aquí solo la política y las funciones puras que la aplican.

export interface PoliticaIntentos {
  maximo: number
  ventanaMs: number
}

export const POLITICA_INTENTOS: PoliticaIntentos = { maximo: 5, ventanaMs: 15 * 60_000 }

export const llaveDeIntento = (ip: string, correoNormalizado: string): string =>
  `${ip}|${correoNormalizado}`

const dentroDeVentana = (
  fallos: readonly number[],
  ahora: Date,
  politica: PoliticaIntentos,
): number[] => {
  const limite = ahora.getTime() - politica.ventanaMs
  return fallos.filter((instante) => instante > limite)
}

export const estaBloqueado = (
  fallos: readonly number[],
  ahora: Date,
  politica: PoliticaIntentos = POLITICA_INTENTOS,
): boolean => dentroDeVentana(fallos, ahora, politica).length >= politica.maximo

// Devuelve un arreglo nuevo: los fallos aún dentro de la ventana más el actual.
export const registrarFallo = (
  fallos: readonly number[],
  ahora: Date,
  politica: PoliticaIntentos = POLITICA_INTENTOS,
): number[] => [...dentroDeVentana(fallos, ahora, politica), ahora.getTime()]

export interface ReservaDeIntento {
  permitido: boolean
  // Estado nuevo de la llave: los fallos vigentes y, si se permitió, el intento reservado.
  fallos: number[]
}

// Comprobación y reserva en un solo paso (T-01). El handler la llama antes de cualquier await: el
// intento cuenta como fallo desde que entra, así que peticiones concurrentes no pueden pasar todas
// la comprobación antes de que se anote el primer fallo. Si la contraseña resulta correcta, el
// handler borra la llave (un acierto reinicia el contador). Un intento bloqueado no se anota: así
// el 429 no alarga la ventana.
export const reservarIntento = (
  fallos: readonly number[],
  ahora: Date,
  politica: PoliticaIntentos = POLITICA_INTENTOS,
): ReservaDeIntento => {
  const vigentes = dentroDeVentana(fallos, ahora, politica)
  if (vigentes.length >= politica.maximo) return { permitido: false, fallos: vigentes }
  return { permitido: true, fallos: [...vigentes, ahora.getTime()] }
}

// Devuelve un mapa nuevo sin las llaves cuyos fallos ya salieron todos de la ventana.
export const podarLlaves = (
  mapa: ReadonlyMap<string, readonly number[]>,
  ahora: Date,
  politica: PoliticaIntentos = POLITICA_INTENTOS,
): Map<string, number[]> => {
  const podado = new Map<string, number[]>()
  for (const [llave, fallos] of mapa) {
    const vivos = dentroDeVentana(fallos, ahora, politica)
    if (vivos.length > 0) podado.set(llave, vivos)
  }
  return podado
}
