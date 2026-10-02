import type { SolicitarSubidaRespuesta } from "@campus/shared"

// CLASES-d (§D-D5). El segundo (y último) lugar con fetch: sube un archivo directo al almacén con la
// URL prefirmada que dio la API. El archivo nunca pasa por la API, y por eso esta petición NO usa
// apiClient: así el token de acceso jamás viaja al almacén (otro origen, otro dueño).
const baseUrl = import.meta.env.VITE_API_URL ?? ""

const origenDeLaApi = (): string => {
  if (baseUrl === "") return window.location.origin
  return new URL(baseUrl, window.location.origin).origin
}

// La URL viene del servidor, pero se comprueba igual: solo http(s), y nunca el origen de la API (una
// URL así mandaría el archivo, y las cookies que el navegador pegue, a la propia API).
const validarUrlDeSubida = (texto: string): void => {
  let url: URL
  try {
    url = new URL(texto)
  } catch {
    throw new Error("La URL de subida no es válida.")
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("La URL de subida no es válida.")
  }
  if (url.origin === origenDeLaApi()) throw new Error("La URL de subida no es válida.")
}

export const subirArchivo = async (
  subida: SolicitarSubidaRespuesta["subida"],
  archivo: File,
): Promise<void> => {
  validarUrlDeSubida(subida.url)
  const respuesta = await fetch(subida.url, {
    method: "PUT",
    headers: subida.cabeceras,
    body: archivo,
    credentials: "omit",
  })
  if (!respuesta.ok) throw new Error("El almacén rechazó el archivo.")
}
