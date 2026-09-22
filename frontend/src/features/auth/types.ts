// Tipo de interfaz provisional: cuando exista el endpoint público de anuncios del login (RF-07)
// se sustituye por el tipo inferido del esquema zod de shared/.
export interface Anuncio {
  anuncioId: string
  titulo: string
  texto: string
  orden: number
}
