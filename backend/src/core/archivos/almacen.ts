// Puerto del almacén de archivos (§D-D2). Lo implementa adapters/storage; las pruebas usan un doble
// en memoria. Los archivos nunca pasan por Node: solo se firman URL y se consultan metadatos.
export interface Almacen {
  urlDeSubida(o: { clave: string; tipo: string }): Promise<string>
  urlDeDescarga(o: { clave: string; tipo: string; disposicion: string }): Promise<string>
  metadatosDe(clave: string): Promise<{ tamano: number; tipo: string } | null>
}
