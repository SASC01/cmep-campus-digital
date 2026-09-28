import { CircleAlert, CircleCheck } from "lucide-react"
import type { CSSProperties } from "react"
import { Toaster as SonnerToaster } from "sonner"

// Solo lo importa app/providers.tsx (§7.11): otro componente que lo importe monta un Toaster
// sin simular, y las pruebas de ataque que sustituyen sonner dejarían de reflejar la realidad.
function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      icons={{
        success: <CircleCheck aria-hidden="true" className="size-4 text-success" />,
        error: <CircleAlert aria-hidden="true" className="size-4 text-destructive" />,
      }}
      style={
        {
          "--normal-bg": "var(--surface)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "font-sans rounded-row! shadow-overlay!",
        },
      }}
    />
  )
}

export { Toaster }
