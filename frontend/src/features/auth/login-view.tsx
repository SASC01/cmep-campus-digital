import { CircleCheck } from "lucide-react"
import { useLocation } from "react-router"

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"

import { FormularioLogin } from "./components/formulario-login"
import { PanelAnuncios } from "./components/panel-anuncios"
import { TEXTOS_LOGIN } from "./data"
import { useAnunciosLogin } from "./hooks"
import { avisoDeLogin } from "./lib"

// DEC-17: aviso tras un enlace de cuenta (restablecer / establecer contraseña), pasado por
// location.state. El estado nunca se comunica solo con color: icono y texto.
export function LoginView() {
  const { anuncios } = useAnunciosLogin()
  const location = useLocation()
  const aviso = avisoDeLogin(location.state)

  return (
    <main className="grid min-h-svh grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-12 lg:px-12 lg:py-12">
      <PanelAnuncios anuncios={anuncios} />
      <Card className="self-center">
        <CardHeader>
          <h1 className="font-heading text-2xl font-bold tracking-tight">{TEXTOS_LOGIN.titulo}</h1>
          <CardDescription>{TEXTOS_LOGIN.subtitulo}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {aviso && (
            <p role="status" className="flex items-center gap-2 text-sm text-success">
              <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
              <span>{aviso}</span>
            </p>
          )}
          <FormularioLogin />
        </CardContent>
      </Card>
    </main>
  )
}
