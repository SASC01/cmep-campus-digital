// CALIFICACIONES-02b (§D-5.3). Entrega al navegador un archivo armado en la página: la URL de un Blob
// y un enlace con download que se pulsa una vez y se quita. Sin red. La URL se revoca en el turno
// siguiente, cuando el navegador ya tomó la descarga.
export const descargarArchivo = (contenido: Uint8Array, nombre: string, tipo: string): void => {
  const url = URL.createObjectURL(new Blob([new Uint8Array(contenido)], { type: tipo }))
  const enlace = document.createElement("a")
  enlace.href = url
  enlace.download = nombre
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 0)
}
