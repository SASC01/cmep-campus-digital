// Clasificación de un fallo de envío (C-04). Permanente: Resend rechaza en el acto una dirección
// mal formada (400/422); no se reintenta. Cualquier otro caso, incluido un 403 (dominio no
// verificado o llave inválida) y un fallo de red (statusCode: null), es transitorio: se reintenta.
const ESTADOS_PERMANENTES = new Set([400, 422])

export const clasificarFalloDeCorreo = ({
  estado,
}: {
  estado: number | null
}): "permanente" | "transitorio" => {
  if (estado !== null && ESTADOS_PERMANENTES.has(estado)) return "permanente"
  return "transitorio"
}
