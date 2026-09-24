import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"

import { FormularioRegistro } from "./components/formulario-registro"
import { PanelAnuncios } from "./components/panel-anuncios"
import { TEXTOS_REGISTRO } from "./data"
import { useAnunciosLogin } from "./hooks"

// Misma rejilla que el login (RF-06): anuncios a la izquierda, formulario a la derecha.
export function RegistroView() {
  const { anuncios } = useAnunciosLogin()

  return (
    <main className="grid min-h-svh grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-12 lg:px-12 lg:py-12">
      <PanelAnuncios anuncios={anuncios} />
      <Card className="self-center">
        <CardHeader>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {TEXTOS_REGISTRO.titulo}
          </h1>
          <CardDescription>{TEXTOS_REGISTRO.subtitulo}</CardDescription>
        </CardHeader>
        <CardContent>
          <FormularioRegistro />
        </CardContent>
      </Card>
    </main>
  )
}
