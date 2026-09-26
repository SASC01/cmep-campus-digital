import { BuscadorDeCuenta } from "./components/buscador-de-cuenta"
import { FormularioInvitarMaestro } from "./components/formulario-invitar-maestro"
import { TEXTOS_CUENTAS } from "./data"

// DEC-19: índice de /admin, provisional hasta la gestión de usuarios completa. Densidad de admin
// (CLAUDE.md): tablas y formularios compactos, sin aire de sobra. Sin consultas al montar: solo
// mutaciones bajo demanda.
export function CuentasView() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">{TEXTOS_CUENTAS.titulo}</h1>
        <p className="text-sm text-muted-foreground">{TEXTOS_CUENTAS.notaProvisional}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <FormularioInvitarMaestro />
        <BuscadorDeCuenta />
      </div>
    </div>
  )
}
