import { Card, CardContent } from "@/components/ui/card"

import { TEXTOS_MURO_PROVISIONAL } from "./data"

// Provisional en CLASES-a (§D-A5, §D-C5 lo reemplaza en CLASES-c).
export function MuroView() {
  return (
    <Card>
      <CardContent>
        <p className="text-body text-muted-foreground">{TEXTOS_MURO_PROVISIONAL.aviso}</p>
      </CardContent>
    </Card>
  )
}
