import { Landmark } from "lucide-react"

import { Badge } from "@/components/ui/badge"

import { TEXTOS_MURO } from "../data"
import type { Publicacion } from "../types"

interface FirmaDelAutorProps {
  autor: Publicacion["autor"]
}

// §D-2C4, DESIGN.md §7.18: la firma de una publicación o un comentario. Lo que publica la
// administración lleva la insignia «Administración» (texto e icono, nunca solo color), decidida
// únicamente por `autor.administracion`: el frontend nunca deduce la firma del nombre (una persona
// puede llamarse "Administración"). Si no, el nombre en negrita.
export function FirmaDelAutor({ autor }: FirmaDelAutorProps) {
  if (autor.administracion) {
    return (
      <Badge variant="institucional" icon={<Landmark aria-hidden="true" />}>
        {TEXTOS_MURO.firmaAdministracion}
      </Badge>
    )
  }

  return <span className="wrap-anywhere font-bold text-foreground">{autor.nombre}</span>
}
