import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"

import { FormularioLogin } from "./components/formulario-login"
import { PanelAnuncios } from "./components/panel-anuncios"
import { TEXTOS_LOGIN } from "./data"
import { useAnunciosLogin } from "./hooks"

export function LoginView() {
  const { anuncios } = useAnunciosLogin()

  return (
    <main className="grid min-h-svh grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-12 lg:px-12 lg:py-12">
      <PanelAnuncios anuncios={anuncios} />
      <Card className="self-center">
        <CardHeader>
          <h1 className="font-heading text-2xl font-bold tracking-tight">{TEXTOS_LOGIN.titulo}</h1>
          <CardDescription>{TEXTOS_LOGIN.subtitulo}</CardDescription>
        </CardHeader>
        <CardContent>
          <FormularioLogin />
        </CardContent>
      </Card>
    </main>
  )
}
