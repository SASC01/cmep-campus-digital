import { CircleCheck, CircleSlash, Lock } from "lucide-react"
import { Link } from "react-router"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button-variants"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { TEXTOS_USUARIOS } from "../data"
import { accesoDeLaFila, etiquetaDeRolAdmin } from "../lib"
import type { UsuarioAdminFila } from "../types"

interface InsigniaDeCuentaProps {
  activo: boolean
}

// El estado nunca solo con color: insignia con icono y texto.
export function InsigniaDeCuenta({ activo }: InsigniaDeCuentaProps) {
  if (activo) {
    return (
      <Badge variant="success" icon={<CircleCheck aria-hidden="true" />}>
        {TEXTOS_USUARIOS.cuenta.activa}
      </Badge>
    )
  }
  return (
    <Badge variant="muted" icon={<CircleSlash aria-hidden="true" />}>
      {TEXTOS_USUARIOS.cuenta.desactivada}
    </Badge>
  )
}

interface CeldaDeAccesoProps {
  fila: UsuarioAdminFila
}

function CeldaDeAcceso({ fila }: CeldaDeAccesoProps) {
  const acceso = accesoDeLaFila(fila)
  if (acceso === "restringido") {
    return (
      <Badge variant="warning" icon={<Lock aria-hidden="true" />}>
        {TEXTOS_USUARIOS.acceso.restringido}
      </Badge>
    )
  }
  if (acceso === "sinRestriccion") return <>{TEXTOS_USUARIOS.acceso.sinRestriccion}</>
  return <span className="text-muted-foreground">{TEXTOS_USUARIOS.acceso.noAplica}</span>
}

interface TablaDeUsuariosProps {
  usuarios: readonly UsuarioAdminFila[]
}

// ADMIN-01f (§D-11, DESIGN.md §7.9): la tabla de cuentas, opaca y densa (el contexto lo da el marco del
// administrador). "Ver" lleva la acción y el nombre de la cuenta en un solo texto sr-only (nunca
// aria-label), así el nombre no es un nodo de texto propio dentro del enlace; `data-usuario-id`
// dice a qué fila va el foco al cargar la última página (useFocoAlCargarMas).
export function TablaDeUsuarios({ usuarios }: TablaDeUsuariosProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{TEXTOS_USUARIOS.columnas.nombre}</TableHead>
          <TableHead>{TEXTOS_USUARIOS.columnas.correo}</TableHead>
          <TableHead>{TEXTOS_USUARIOS.columnas.rol}</TableHead>
          <TableHead>{TEXTOS_USUARIOS.columnas.cuenta}</TableHead>
          <TableHead>{TEXTOS_USUARIOS.columnas.acceso}</TableHead>
          <TableHead>{TEXTOS_USUARIOS.columnas.ver}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {usuarios.map((fila) => (
          <TableRow key={fila.id} data-usuario-id={fila.id}>
            <TableCell className="wrap-anywhere font-bold">{fila.nombre}</TableCell>
            <TableCell className="wrap-anywhere">{fila.email}</TableCell>
            <TableCell>{etiquetaDeRolAdmin(fila.rol)}</TableCell>
            <TableCell>
              <InsigniaDeCuenta activo={fila.activo} />
            </TableCell>
            <TableCell>
              <CeldaDeAcceso fila={fila} />
            </TableCell>
            <TableCell>
              <Link
                to={`/admin/usuarios/${fila.id}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <span aria-hidden="true">{TEXTOS_USUARIOS.ver}</span>
                <span className="sr-only">{TEXTOS_USUARIOS.verA(fila.nombre)}</span>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
