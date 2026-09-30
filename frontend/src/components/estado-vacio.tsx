import { Button } from "@/components/ui/button"

// M-05, M-10 (AUTH-03b, §D-B6, §D-B9 §7.10): quien usa el componente decide la variante del botón
// ("primary" si es la única acción de la vista, "outline" si no), sin valor por defecto aquí. Sin
// "enEspera": la acción de un vacío no hace ninguna petición.
// M-20 (CLASES-a): el tipo de la acción ya no se exporta; es el único tipo permitido de este
// archivo, en línea dentro de EstadoVacioProps (regla 6 de CLAUDE.md).
interface EstadoVacioProps {
  titulo: string
  descripcion?: string
  accion?: {
    texto: string
    onClick: () => void
    variante: "primary" | "outline"
  }
}

export function EstadoVacio({ titulo, descripcion, accion }: EstadoVacioProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <p className="text-h3 font-bold text-foreground">{titulo}</p>
      {descripcion && <p className="text-small text-muted-foreground">{descripcion}</p>}
      {accion && (
        <Button type="button" variant={accion.variante} onClick={accion.onClick} className="mt-2">
          {accion.texto}
        </Button>
      )}
    </div>
  )
}
