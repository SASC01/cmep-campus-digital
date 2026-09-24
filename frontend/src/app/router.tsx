import { createBrowserRouter, Navigate, type RouteObject } from "react-router"

import { LayoutPublico } from "@/components/layout/layout-publico"
import { AccesoRestringidoView } from "@/features/auth/acceso-restringido-view"
import { BienvenidaView } from "@/features/auth/bienvenida-view"
import { LoginView } from "@/features/auth/login-view"
import { RegistroView } from "@/features/auth/registro-view"
import { DiagnosticoView } from "@/features/diagnostico/diagnostico-view"

import { RequireRol } from "./require-rol"
import { RequireSesion } from "./require-sesion"

// /acceso-restringido cuelga de RequireSesion y FUERA de RequireRol, que es quien redirige ahí a
// los restringidos (M-08).
export const rutas: RouteObject[] = [
  { path: "/", element: <Navigate to="/login" replace /> },
  {
    element: <LayoutPublico />,
    children: [
      { path: "/login", element: <LoginView /> },
      { path: "/registro", element: <RegistroView /> },
      { path: "/diagnostico", element: <DiagnosticoView /> },
    ],
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
        children: [{ index: true, element: <BienvenidaView /> }],
      },
    ],
  },
  { path: "*", element: <Navigate to="/login" replace /> },
]

export const router = createBrowserRouter(rutas)
