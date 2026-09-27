import { CircleAlert } from "lucide-react"

interface MensajeErrorProps {
  titulo?: string
  mensaje: string
}

// El estado nunca se comunica solo con color: icono y texto explícito además del token destructive.
export function MensajeError({ titulo = "Error", mensaje }: MensajeErrorProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-row border border-destructive bg-surface p-4 text-foreground"
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-destructive" />
      <div className="flex flex-col gap-1">
        <p className="font-bold text-destructive">{titulo}</p>
        <p className="text-small">{mensaje}</p>
      </div>
    </div>
  )
}
