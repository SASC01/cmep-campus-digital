import { createBrowserRouter, Navigate, type RouteObject } from "react-router"

import { ContenedorRol } from "@/components/layout/contenedor-rol"
import { LayoutPublico } from "@/components/layout/layout-publico"
import { LoginView } from "@/features/auth/login-view"
import { DiagnosticoView } from "@/features/diagnostico/diagnostico-view"

import { RequireRol } from "./require-rol"
import { RequireSesion } from "./require-sesion"

export const rutas: RouteObject[] = [
  { path: "/", element: <Navigate to="/login" replace /> },
  {
    element: <LayoutPublico />,
    children: [
      { path: "/login", element: <LoginView /> },
      { path: "/diagnostico", element: <DiagnosticoView /> },
    ],
  },
  {
    element: <RequireSesion />,
    children: [
      {
        path: "/estudiante",
        element: <RequireRol rol="estudiante" />,
        children: [{ index: true, element: <ContenedorRol rol="estudiante" /> }],
      },
      {
        path: "/maestro",
        element: <RequireRol rol="maestro" />,
        children: [{ index: true, element: <ContenedorRol rol="maestro" /> }],
      },
      {
        path: "/admin",
        element: <RequireRol rol="admin" />,
        children: [{ index: true, element: <ContenedorRol rol="admin" /> }],
      },
    ],
  },
  { path: "*", element: <Navigate to="/login" replace /> },
]

export const router = createBrowserRouter(rutas)
