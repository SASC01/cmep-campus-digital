import { createBrowserRouter, Navigate, type RouteObject } from "react-router"

import { LayoutPublico } from "@/components/layout/layout-publico"
import { CuentasView } from "@/features/admin/cuentas-view"
import { MaestrosView } from "@/features/admin/maestros-view"
import { AccesoRestringidoView } from "@/features/auth/acceso-restringido-view"
import { CambiarContrasenaView } from "@/features/auth/cambiar-contrasena-view"
import { EstablecerContrasenaView } from "@/features/auth/establecer-contrasena-view"
import { LoginView } from "@/features/auth/login-view"
import { RecuperarView } from "@/features/auth/recuperar-view"
import { RegistroMaestroView } from "@/features/auth/registro-maestro-view"
import { RegistroView } from "@/features/auth/registro-view"
import { RestablecerView } from "@/features/auth/restablecer-view"
import { ClaseLayout } from "@/features/clases/clase-layout"
import { CrearClaseView } from "@/features/clases/crear-clase-view"
import { EditarClaseView } from "@/features/clases/editar-clase-view"
import { InicioEstudianteView } from "@/features/clases/inicio-estudiante-view"
import { InicioMaestroView } from "@/features/clases/inicio-maestro-view"
import { MuroView } from "@/features/clases/muro-view"
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
      { path: "/registro-maestro", element: <RegistroMaestroView /> },
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
        children: [
          { index: true, element: <InicioEstudianteView /> },
          {
            path: "clases/:claseId",
            element: <ClaseLayout />,
            children: [{ index: true, element: <MuroView /> }],
          },
        ],
      },
      {
        path: "/maestro",
        element: <RequireRol rol="maestro" />,
        children: [
          { index: true, element: <InicioMaestroView /> },
          { path: "clases/nueva", element: <CrearClaseView /> },
          {
            path: "clases/:claseId",
            element: <ClaseLayout />,
            children: [
              { index: true, element: <MuroView /> },
              { path: "editar", element: <EditarClaseView /> },
            ],
          },
        ],
      },
      {
        path: "/admin",
        element: <RequireRol rol="admin" />,
        children: [
          { index: true, element: <CuentasView /> },
          { path: "maestros", element: <MaestrosView /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/login" replace /> },
]

export const router = createBrowserRouter(rutas)
