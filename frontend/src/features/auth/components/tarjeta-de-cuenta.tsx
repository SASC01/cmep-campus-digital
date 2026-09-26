import type { ReactNode } from "react"

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"

interface TarjetaDeCuentaProps {
  titulo: string
  // string | undefined explícito: TEXTOS_NUEVA_CONTRASENA.invitacion la tiene y .recuperacion no
  // (exactOptionalPropertyTypes exige el undefined explícito para aceptar ese valor tal cual).
  descripcion?: string | undefined
  children: ReactNode
}

// Contenedor centrado de las pantallas de cuenta (recuperar, restablecer, establecer, cambiar).
// Solo lo usa auth (regla 9): las demás pantallas de la plataforma usan otros layouts.
export function TarjetaDeCuenta({ titulo, descripcion, children }: TarjetaDeCuentaProps) {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="font-heading text-2xl font-bold tracking-tight">{titulo}</h1>
          {descripcion && <CardDescription>{descripcion}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  )
}
