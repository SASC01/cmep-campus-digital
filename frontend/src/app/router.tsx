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
import { GradebookView } from "@/features/calificaciones/gradebook-view"
import { MisCalificacionesView } from "@/features/calificaciones/mis-calificaciones-view"
import { CategoriasView } from "@/features/clases/categorias-view"
import { ClaseAnteriorView } from "@/features/clases/clase-anterior-view"
import { ClaseLayout } from "@/features/clases/clase-layout"
import { ClasesAdminView } from "@/features/clases/clases-admin-view"
import { ClasesAnterioresView } from "@/features/clases/clases-anteriores-view"
import { ClasesArchivadasView } from "@/features/clases/clases-archivadas-view"
import { CrearClaseView } from "@/features/clases/crear-clase-view"
import { EditarClaseView } from "@/features/clases/editar-clase-view"
import { DudasView } from "@/features/clases/dudas-view"
import { DuplicarClaseView } from "@/features/clases/duplicar-clase-view"
import { EditarRecursoView } from "@/features/clases/editar-recurso-view"
import { InicioEstudianteView } from "@/features/clases/inicio-estudiante-view"
import { InicioMaestroView } from "@/features/clases/inicio-maestro-view"
import { MuroView } from "@/features/clases/muro-view"
import { PersonasView } from "@/features/clases/personas-view"
import { RecursosView } from "@/features/clases/recursos-view"
import { TrabajoView } from "@/features/clases/trabajo-view"
import { DiagnosticoView } from "@/features/diagnostico/diagnostico-view"
import { CrearTareaView } from "@/features/tareas/crear-tarea-view"
import { DetalleTareaView } from "@/features/tareas/detalle-tarea-view"
import { EditarTareaView } from "@/features/tareas/editar-tarea-view"
import { EntregaDeAlumnoView } from "@/features/tareas/entrega-de-alumno-view"
import { EntregasView } from "@/features/tareas/entregas-view"

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
          // ADMIN-01d2 (§D-9, Enmienda 12, P-02): "Clases anteriores" y una clase anterior. Se compone aquí
          // porque features/clases no importa de features/calificaciones (regla 9).
          { path: "clases-anteriores", element: <ClasesAnterioresView /> },
          {
            path: "clases-anteriores/:claseId",
            element: <ClaseAnteriorView />,
            children: [{ index: true, element: <MisCalificacionesView /> }],
          },
          {
            path: "clases/:claseId",
            element: <ClaseLayout />,
            children: [
              // CLASES-03 (§D-7.1): "Avisos" (el muro) y "Actividades de aprendizaje" (el segmento
              // `trabajo` se conserva, DH-09), de solo lectura para el alumno.
              { index: true, element: <MuroView /> },
              { path: "trabajo", element: <TrabajoView /> },
              // CLASES-03d (§D-7.4): "Recursos", de solo lectura para el alumno (comenta). Editar un
              // recurso no existe en esta rama y cae en `*`.
              { path: "recursos", element: <RecursosView /> },
              // CLASES-03e (§D-9.1): "Dudas", en las tres perspectivas.
              { path: "dudas", element: <DudasView /> },
              { path: "personas", element: <PersonasView /> },
              // CALIFICACIONES-01d (§D-13.6): "Mis calificaciones" en la rama del alumno.
              { path: "calificaciones", element: <MisCalificacionesView /> },
              // TAREAS-01d (§D-10): el alumno solo ve el detalle. "nueva" no es un tareaId: sin esta ruta
              // literal coincidiría con `tareas/:tareaId` y se pediría GET /tareas/nueva; cae donde cae
              // cualquier ruta desconocida. `tareas/:id/editar` no existe para el alumno y cae en `*`.
              { path: "tareas/nueva", element: <Navigate to="/login" replace /> },
              { path: "tareas/:tareaId", element: <DetalleTareaView /> },
            ],
          },
        ],
      },
      {
        path: "/maestro",
        element: <RequireRol rol="maestro" />,
        children: [
          { index: true, element: <InicioMaestroView /> },
          // ADMIN-01d2 (§D-9): "Clases archivadas"; cada una se abre en la ruta normal, en solo lectura.
          { path: "clases-archivadas", element: <ClasesArchivadasView /> },
          // CLASES-02c (§D-2C3): el maestro ya no crea ni edita clases. "nueva" no es un claseId:
          // sin esta ruta literal coincidiría con `clases/:claseId` y se pediría GET /clases/nueva.
          // Cae donde cae cualquier ruta desconocida (R-07).
          { path: "clases/nueva", element: <Navigate to="/login" replace /> },
          {
            path: "clases/:claseId",
            element: <ClaseLayout />,
            children: [
              { index: true, element: <MuroView /> },
              // TAREAS-01e (§D-11): "Trabajo de clase" y "Categorías de calificación" (no es una sección).
              { path: "trabajo", element: <TrabajoView /> },
              { path: "categorias", element: <CategoriasView /> },
              // CLASES-03d (§D-7.4, S-11): "Recursos" y su edición, que deja activa la sección.
              { path: "recursos", element: <RecursosView /> },
              { path: "recursos/:recursoId/editar", element: <EditarRecursoView /> },
              { path: "dudas", element: <DudasView /> },
              // CLASES-03 (§D-7.4, §D-7.7, DH-09): "Personas" junta a los maestros y el roster; la
              // ruta vieja de "Alumnos" redirige sin dejar entrada en el historial.
              { path: "personas", element: <PersonasView /> },
              { path: "alumnos", element: <Navigate to="../personas" replace /> },
              // CALIFICACIONES-01d (§D-13.6): el gradebook en las ramas del maestro y del admin.
              { path: "calificaciones", element: <GradebookView /> },
              // TAREAS-01d (§D-10): ninguna activa una sección (como /editar); el literal gana a :tareaId.
              { path: "tareas/nueva", element: <CrearTareaView /> },
              { path: "tareas/:tareaId", element: <DetalleTareaView /> },
              { path: "tareas/:tareaId/editar", element: <EditarTareaView /> },
              { path: "tareas/:tareaId/entregas", element: <EntregasView /> },
              {
                path: "tareas/:tareaId/entregas/:alumnoId",
                element: <EntregaDeAlumnoView />,
              },
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
          // CLASES-02c (§D-2C2): las clases del administrador. El literal "nueva" gana a :claseId.
          {
            path: "clases",
            children: [
              { index: true, element: <ClasesAdminView /> },
              { path: "nueva", element: <CrearClaseView /> },
              {
                path: ":claseId",
                element: <ClaseLayout />,
                children: [
                  { index: true, element: <MuroView /> },
                  { path: "trabajo", element: <TrabajoView /> },
                  { path: "categorias", element: <CategoriasView /> },
                  { path: "recursos", element: <RecursosView /> },
                  { path: "recursos/:recursoId/editar", element: <EditarRecursoView /> },
                  { path: "dudas", element: <DudasView /> },
                  // CLASES-03 (§D-7.4, DH-09): "Alumnos" y "Maestros" se juntan en "Personas".
                  { path: "personas", element: <PersonasView /> },
                  { path: "alumnos", element: <Navigate to="../personas" replace /> },
                  { path: "maestros", element: <Navigate to="../personas" replace /> },
                  { path: "calificaciones", element: <GradebookView /> },
                  { path: "editar", element: <EditarClaseView /> },
                  // ADMIN-01c (§D-10): duplicar, dentro de la clase como "editar".
                  { path: "duplicar", element: <DuplicarClaseView /> },
                  { path: "tareas/nueva", element: <CrearTareaView /> },
                  { path: "tareas/:tareaId", element: <DetalleTareaView /> },
                  { path: "tareas/:tareaId/editar", element: <EditarTareaView /> },
                  { path: "tareas/:tareaId/entregas", element: <EntregasView /> },
                  {
                    path: "tareas/:tareaId/entregas/:alumnoId",
                    element: <EntregaDeAlumnoView />,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/login" replace /> },
]

export const router = createBrowserRouter(rutas)
