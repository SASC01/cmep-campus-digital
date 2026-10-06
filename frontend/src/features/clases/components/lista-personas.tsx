import { AvatarUsuario } from "@/components/avatar-usuario"

import type { PersonaConCorreo } from "../types"

interface ListaPersonasProps {
  personas: PersonaConCorreo[]
  etiqueta: string
}

// DESIGN.md §7.2 (excepción de CLASES-b): filas de solo lectura, sin vidrio fuerte, separadas por
// divisores de --border dentro del panel. Un nombre o un correo sin espacios rompe en cualquier punto; el correo es texto plano (sin mailto:).
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
          <div className="flex min-w-0 flex-col">
            <span className="wrap-anywhere text-body">{persona.nombre}</span>
            <span className="wrap-anywhere text-small text-muted-foreground">{persona.email}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}
