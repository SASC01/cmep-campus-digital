import { AvatarUsuario } from "@/components/avatar-usuario"

import type { PersonaDeClase } from "../types"

interface ListaPersonasProps {
  personas: PersonaDeClase[]
  etiqueta: string
}

// DESIGN.md §7.2 (excepción de CLASES-b): filas de solo lectura, sin vidrio fuerte, separadas por
// divisores de --border dentro del panel. Un nombre sin espacios rompe en cualquier punto.
export function ListaPersonas({ personas, etiqueta }: ListaPersonasProps) {
  return (
    <ul aria-label={etiqueta} className="flex flex-col">
      {personas.map((persona) => (
        <li
          key={persona.id}
          data-persona-id={persona.id}
          tabIndex={-1}
          className="flex items-center gap-3 border-b border-border py-3 last:border-0"
        >
          <AvatarUsuario nombre={persona.nombre} />
          <span className="wrap-anywhere text-body">{persona.nombre}</span>
        </li>
      ))}
    </ul>
  )
}
