import { useRef, type ReactNode } from "react"
import { Link, useParams } from "react-router"

import { Cargando } from "@/components/cargando"
import { useFocoAlPerderseElControl } from "@/components/foco/hooks"
import { claveDeFocoDeLaConsulta } from "@/components/foco/lib"
import { MensajeError } from "@/components/mensaje-error"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

import { AccionesDeCuenta } from "./components/acciones-de-cuenta"
import { EstadoDePagoDeCuenta } from "./components/estado-de-pago-de-cuenta"
import { FichaDeCuenta } from "./components/ficha-de-cuenta"
import { FormularioNombreDeCuenta } from "./components/formulario-nombre-de-cuenta"
import { InsigniaDeCuenta } from "./components/tabla-de-usuarios"
import { claveUsuario, TEXTOS_USUARIO, TEXTOS_USUARIOS } from "./data"
import { useFundirEnLaFicha, useMarcarViejaSiQuedoEnError, useUsuario } from "./hooks"
import {
  errorQueRedirigeElCliente,
  esCuentaQueNoExiste,
  etiquetaDeRolAdmin,
  formatearFechaCorta,
} from "./lib"

interface FichaDeLaCuentaProps {
  usuarioId: string
}

// El contenido de la ficha de una cuenta. Vive con key por id: abrir otra cuenta lo desmonta, así que una
// temporal, un error o una confirmación de la anterior nunca aparecen en la nueva (E-25), y una respuesta
// tardía no escribe en ella. La raíz que recibe el foco no vive aquí: queda montada entre cuentas.
function FichaDeLaCuenta({ usuarioId }: FichaDeLaCuentaProps) {
  const usuario = useUsuario(usuarioId)
  const fundirEnLaFicha = useFundirEnLaFicha()

  useMarcarViejaSiQuedoEnError(claveUsuario(usuarioId))

  // Estados en orden: la cuenta que no existe (404 o id mal formado) → otro error → cargando → datos.
  const contenido = (): ReactNode => {
    // ADMIN-01g, ronda 1 (T-01, R-23, autorizado por el humano): un error con que apiClient redirige (un
    // 401 tras el refresco fallido) no se pinta: la página se va. Se queda lo que había.
    const errorVisible = usuario.isError && !errorQueRedirigeElCliente(usuario.error)
    if (errorVisible && esCuentaQueNoExiste(usuario.error)) {
      return (
        <div className="flex flex-col gap-3">
          <MensajeError mensaje={TEXTOS_USUARIO.noExiste} />
          <Link to="/admin/usuarios" className={buttonVariants({ variant: "outline" })}>
            {TEXTOS_USUARIO.volver}
          </Link>
        </div>
      )
    }
    if (errorVisible) return <MensajeError mensaje={TEXTOS_USUARIO.error} />
    if (usuario.isLoading || !usuario.data) return <Cargando />
    const cuenta = usuario.data
    const idDelNombre = `cuenta-${cuenta.id}`
    return (
      <section aria-labelledby={idDelNombre} className="flex flex-col gap-4">
        <h2 id={idDelNombre} className="text-h2 wrap-anywhere">
          {cuenta.nombre}
        </h2>
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <dt className="text-small text-muted-foreground">{TEXTOS_USUARIO.datos.correo}</dt>
          <dd className="wrap-anywhere">{cuenta.email}</dd>
          <dt className="text-small text-muted-foreground">{TEXTOS_USUARIO.datos.rol}</dt>
          <dd>{etiquetaDeRolAdmin(cuenta.rol)}</dd>
          <dt className="text-small text-muted-foreground">{TEXTOS_USUARIO.datos.cuenta}</dt>
          <dd>
            <InsigniaDeCuenta activo={cuenta.activo} />
          </dd>
          <dt className="text-small text-muted-foreground">{TEXTOS_USUARIO.datos.alta}</dt>
          <dd>{formatearFechaCorta(cuenta.creadoEn)}</dd>
        </dl>
        <FormularioNombreDeCuenta cuenta={cuenta} />
        <AccionesDeCuenta cuenta={cuenta} />
        {cuenta.rol === "estudiante" && cuenta.estadoPago !== undefined && (
          <EstadoDePagoDeCuenta alumnoId={cuenta.id} estadoPago={cuenta.estadoPago} />
        )}
        <FichaDeCuenta usuario={cuenta} onCorreoCorregido={fundirEnLaFicha} />
      </section>
    )
  }

  return contenido()
}

// ADMIN-01f (corrección M-20; matriz de 01f): la raíz de la vista, sin key, para que sobreviva al cambio
// de cuenta. Si un cambio de la consulta (otra cuenta, un 404, un id mal formado, un error de carga o una
// recarga) quita el control que tenía el foco dentro de la ficha, el foco va a esta raíz, nunca a <body>;
// si estaba fuera (la barra de navegación), no se mueve (A-4). La consulta es la misma que la del
// contenido (misma clave, una sola petición): aquí solo se lee su momento.
// T-02 (ronda 1): cuenta también el foco dentro de un diálogo de la ficha (baja, restringir), que vive en
// un portal; si el cambio de cuenta lo desmonta con el foco dentro, el foco va a esta raíz.
function VistaDeLaCuenta({ usuarioId }: FichaDeLaCuentaProps) {
  const usuario = useUsuario(usuarioId)
  const raizRef = useRef<HTMLDivElement>(null)

  useFocoAlPerderseElControl(raizRef, claveDeFocoDeLaConsulta(usuarioId, usuario), true)

  return (
    <div ref={raizRef} tabIndex={-1} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <h1 className="text-h1">{TEXTOS_USUARIOS.titulo}</h1>
        </CardHeader>
        <CardContent>
          <FichaDeLaCuenta key={usuarioId} usuarioId={usuarioId} />
        </CardContent>
      </Card>
    </div>
  )
}

// ADMIN-01f (§D-11, DH-05 a, E-24, RF-57): /admin/usuarios/:usuarioId. El h1 es el de la sección
// ("Usuarios"); la ficha es una región cuyo nombre es el de la cuenta. Reúne los datos, "Editar nombre",
// dar de baja o reactivar, el acceso y el estado de pago de un alumno, y lo de hoy: restablecer la
// contraseña (no en la cuenta de administración, DH-06) y corregir el correo. Sin «Reintentar»: un error
// de carga se recupera volviendo a abrir la cuenta (la consulta en error se marca vieja al salir).
export function UsuarioView() {
  const { usuarioId } = useParams()
  if (usuarioId === undefined) return null
  return <VistaDeLaCuenta usuarioId={usuarioId} />
}
