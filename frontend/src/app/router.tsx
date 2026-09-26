import { createBrowserRouter, Navigate, type RouteObject } from "react-router"

import { LayoutPublico } from "@/components/layout/layout-publico"
import { CuentasView } from "@/features/admin/cuentas-view"
import { AccesoRestringidoView } from "@/features/auth/acceso-restringido-view"
import { BienvenidaView } from "@/features/auth/bienvenida-view"
import { CambiarContrasenaView } from "@/features/auth/cambiar-contrasena-view"
import { EstablecerContrasenaView } from "@/features/auth/establecer-contrasena-view"
import { LoginView } from "@/features/auth/login-view"
import { RecuperarView } from "@/features/auth/recuperar-view"
import { RegistroView } from "@/features/auth/registro-view"
import { RestablecerView } from "@/features/auth/restablecer-view"
import { DiagnosticoView } from "@/features/diagnostico/diagnostico-view"

import { RequireCambioDeContrasena } from "./require-cambio-de-contrasena"
import { RequireRol } from "./require-rol"
import { RequireSesion } from "./require-sesion"

// /acceso-restringido cuelga de RequireSesion y FUERA de RequireRol, que es quien redirige ahí a
// los restringidos (M-08). /cambiar-contrasena cuelga de su propia guarda y FUERA de RequireSesion
// (DEC-17): un cambio pendiente hace fallar incluso GET /me, así que RequireSesion no puede
// resolverla por sí sola.
export const rutas: RouteObject[] = [
  { path: "/", element: <Navigate to="/login" replace /> },
  {
    element: <LayoutPublico />,
    children: [
      { path: "/login", element: <LoginView /> },
      { path: "/registro", element: <RegistroView /> },
      { path: "/recuperar", element: <RecuperarView /> },
      { path: "/restablecer", element: <RestablecerView /> },
      { path: "/establecer-contrasena", element: <EstablecerContrasenaView /> },
      { path: "/diagnostico", element: <DiagnosticoView /> },
    ],
  },
  {
    path: "/cambiar-contrasena",
    element: <RequireCambioDeContrasena />,
    children: [{ index: true, element: <CambiarContrasenaView /> }],
  },
  {
    element: <RequireSesion />,
    children: [
      { path: "/acceso-restringido", element: <AccesoRestringidoView /> },
      {
        path: "/estudiante",
        element: <RequireRol rol="estudiante" />,
        children: [{ index: true, element: <BienvenidaView /> }],
      },
      {
        path: "/maestro",
        element: <RequireRol rol="maestro" />,
        children: [{ index: true, element: <BienvenidaView /> }],
      },
      {
        path: "/admin",
        element: <RequireRol rol="admin" />,
        children: [{ index: true, element: <CuentasView /> }],
      },
    ],
  },
  { path: "*", element: <Navigate to="/login" replace /> },
]

export const router = createBrowserRouter(rutas)
