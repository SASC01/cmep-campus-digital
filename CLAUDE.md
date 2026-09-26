# CMEP Campus Digital — Guía de desarrollo

Responde siempre al humano en español de México, incluidos resúmenes, preguntas y reportes.

Las reglas de proceso (qué leer, reglas que no se rompen, qué requiere confirmación, pruebas, git, definición de terminado) viven en `AGENTS.md` y aplican completas:

@AGENTS.md

Este archivo cubre **cómo se escribe el código**: estructura de módulos, sistema de diseño y estilo. No dupliques aquí reglas de `AGENTS.md`.

## Proyecto

CMEP Campus Digital es una plataforma educativa web para una sola institución. Monorepo con:

- **`/frontend`** — (desplegado en Cloudflare Pages) React + Vite + TypeScript (SPA), Tailwind CSS, shadcn/ui reestilizado, TanStack Query, React Router, FullCalendar, LiveKit React
- **`/backend`** — Node.js + Fastify + TypeScript (monolito modular), PostgreSQL con Prisma, pg-boss (cola y trabajos diferidos), autenticación propia (argon2id + JWT), archivos por protocolo S3 (R2 en `prod`, MinIO en `dev`), LiveKit Cloud, correo con Resend. Corre en Docker Compose sobre un Droplet de DigitalOcean
- **`/infra`** — Docker Compose, Caddyfile, configuración de LiveKit, scripts de respaldo
- **`/shared`** — tipos y esquemas zod comunes a ambos
- **`/docs`** — `PRD.md`, `ARCHITECTURE.md`, `ARCHITECTURE-ESSENTIALS.md`

**Fase experimental. Sin AWS.** Proveedores aprobados: DigitalOcean, Cloudflare, LiveKit Cloud y Resend. Los avisos son notificaciones dentro de la plataforma; el correo está activo para cuentas y, para avisos, construido pero apagado por defecto.

Lee `docs/ARCHITECTURE-ESSENTIALS.md` al inicio de cada sesión. Abre `PRD.md` y `ARCHITECTURE.md` solo por la sección que necesites.

## Arquitectura: módulos por dominio

### Frontend (`frontend/src/`)

```
features/
  <modulo>/
    types.ts          — interfaces y alias de tipos exclusivos de la interfaz
    data.ts           — constantes, arreglos de configuración, textos fijos
    lib.ts            — funciones puras (sin React)
    hooks.ts          — hooks propios del módulo, incluidos los de TanStack Query
    components/       — subcomponentes extraídos
    <nombre>-view.tsx — componente de vista a nivel de página
```

### Reglas

1. Los **tipos** van en `types.ts`, NO en línea dentro de vistas ni hooks
2. Las **constantes y datos** van en `data.ts`, NO en línea dentro de vistas
3. Las **funciones puras** van en `lib.ts`, NO en línea dentro de vistas
4. Los **hooks** van en `hooks.ts`, NO en línea dentro de vistas
5. El **código usado por 2 o más módulos** sube a `components/`, `lib/` o `services/`
6. Las **interfaces de Props** son los ÚNICOS tipos permitidos en el archivo de un componente
7. Los **tipos de datos de la API** NO se declaran a mano: se infieren de los esquemas zod de `/shared` y se reexportan desde el `types.ts` del módulo
8. Ningún componente llama a `fetch`: todo pasa por `services/apiClient` dentro de un hook de `hooks.ts`
9. Un módulo no importa de otro módulo. Si lo necesita, ese código es compartido (regla 5)

### Módulos

| Módulo | Contenido | Roles |
|--------|-----------|-------|
| `auth` | Login con panel de anuncios, registro de estudiante, recuperar y restablecer contraseña, establecer contraseña (invitación de maestro), cambio obligatorio de contraseña, pantalla de acceso restringido, bienvenida post-login (provisional hasta los dashboards) | Todos |
| `clases` | Dashboard, muro, crear/editar clase, roster, buscador y alta manual de alumnos | Estudiante, Maestro |
| `tareas` | Detalle de tarea, zona de entrega, crear tarea o material, rúbrica, hilo privado | Estudiante, Maestro |
| `calificaciones` | Mis calificaciones, modal de cálculo, calificar entrega, gradebook, alumnos en riesgo | Estudiante, Maestro |
| `calendario` | Calendario de tareas y clases en vivo | Estudiante, Maestro |
| `envivo` | Sala (asistente y anfitrión), programar clase, grabaciones | Estudiante, Maestro |
| `notificaciones` | Campana con contador y panel | Estudiante, Maestro |
| `pagos` | Estado de pago propio | Estudiante |
| `admin` | Dashboard institucional, usuarios, clases, analytics, estado de pago, restricción de acceso, configuración, anuncios del login; provisional: invitar maestro, buscar una cuenta por correo, restablecer su contraseña y corregir su correo (índice de `/admin`), hasta la gestión de usuarios completa | Administrador |
| `diagnostico` | Vista temporal de `/api/salud` (prueba de conexión con la API). Se mueve a `admin` o se elimina cuando exista ese módulo | Sin sesión (temporal) |

### Ubicaciones compartidas

- `components/ui/` — componentes de shadcn/ui reestilizados
- `components/layout/` — barra lateral, encabezado de página, contenedores por rol (`ContenedorRol`, `LayoutPublico`). El tipo `Rol` de `components/layout/types.ts` se reexporta de `shared/`
- `components/` — piezas de dominio reutilizadas: `EstadoPagoBadge`, `EstadoEntregaBadge`, `AvatarUsuario`, `EstadoVacio`; ya existen `MensajeError` (`mensaje-error.tsx`) y `Cargando` (`cargando.tsx`). Las variantes del botón viven en `components/ui/button-variants.ts`, separadas de `button.tsx`
- `lib/format.ts` — fechas (UTC → zona local), porcentajes, tamaños de archivo
- `lib/utils.ts` — `cn` (combinador de clases de Tailwind)
- `services/apiClient.ts` — cliente HTTP con el token y el formato de error
- `services/authService.ts` — login, refresco silencioso del token y logout. El token de acceso vive en memoria, nunca en `localStorage`
- `services/tokenAcceso.ts` — el token de acceso en memoria (`obtenerToken`, `establecerToken`, `limpiarToken`, `haySesion`); vive aparte para que `apiClient` lo lea sin ciclo de importación, y `authService` lo reexporta
- `services/navegacion.ts` — `irA` y `rutaActual`: único punto de redirección fuera del router (lo usa `apiClient` al perder la sesión o ante `403 ACCESO_RESTRINGIDO` o `403 CAMBIO_DE_CONTRASENA_REQUERIDO`)
- `services/liveService.ts` — conexión con LiveKit
- `app/` — rutas, layouts y guardas por rol
- `styles/index.css` — entrada de Tailwind (`@import "tailwindcss"`), importa `tokens.css`
- `styles/tokens.css` — tokens de diseño

### Backend (`backend/src/`)

```
core/        lógica pura, sin I/O ni librerías de infraestructura
adapters/    db (Prisma), auth, storage (R2 / MinIO), notifier (canales in-app y correo con Resend), queue y scheduler (pg-boss), live (LiveKit)
config/      validación de las variables de entorno con zod (env.ts) y opciones del logger (logger.ts); el único código de src/ que lee process.env. No es core/ ni adapters/
middleware/  authenticate, withProfile, withPasswordGate, withAccess, requireRole, requireMembership, requireOwnership
handlers/    un plugin de Fastify por dominio
workers/     consumidores de la cola
prisma/      schema.prisma y migraciones (en backend/prisma)
```

Dominios: `auth`, `publico`, `usuarios`, `clases`, `tareas`, `calificaciones`, `archivos`, `notificaciones`, `calendario`, `envivo`, `admin`.

## Sistema de diseño

### Solo modo claro. Sin modo oscuro durante el piloto.

### Dirección visual

Calmada, confiable y cercana, con un toque técnico. Editorial y cálida, con tipografía fuerte (referencias: Notion, Arc Browser, Linear). **No** es una escala de grises neutra con botones negros: ese es justo el aspecto genérico que el proyecto evita.

> **Pendiente:** los valores concretos (colores, fuentes, radios) se fijan al elegir una de las 3 direcciones creativas. Hasta entonces, usa los **nombres** de token de abajo y no inventes valores definitivos.

### Tokens (los nombres son definitivos; los valores, no)

| Token | Uso |
|-------|-----|
| `--background` | Fondo de la aplicación |
| `--surface` | Tarjetas y paneles |
| `--foreground` | Texto principal y títulos |
| `--muted` | Fondos sutiles |
| `--muted-foreground` | Texto secundario |
| `--border` | Todos los bordes |
| `--primary` / `--primary-foreground` | Acción principal y su texto |
| `--accent` | Énfasis puntual, enlaces, elemento activo |
| `--destructive` | Errores y acciones destructivas |
| `--success` | "Al corriente", entregado, calificado |
| `--warning` | Entrega con retraso, fecha límite próxima, alumno en riesgo |
| `--danger` | "Deudor", sin entregar, acceso restringido |

- Ningún color, tamaño de fuente, radio o sombra se escribe suelto en un componente. Siempre mediante token.
- **El estado nunca se comunica solo con color:** siempre acompañado de texto o icono ("Deudor", "Con retraso").
- Prohibido: degradados morado-azul, glassmorphism, manchas brillantes, dashboards flotantes, y cualquier color, logo, tipografía o iconografía de Google Classroom.

### Tipografía

- Una familia con carácter para títulos y una muy legible para texto; monoespaciada solo para códigos de clase. Familias concretas: **pendientes**.
- Títulos: peso fuerte y `letter-spacing` negativo ligero.
- Texto: `16px`, `line-height: 1.5`.
- Cifras tabulares en tablas, calificaciones y gradebook.

### Componentes

- Usa los componentes de `components/ui/` (shadcn/ui **reestilizado** con los tokens). NO construyas a mano botones, inputs, tarjetas, diálogos, selects ni tablas.
- shadcn/ui con su aspecto por defecto es inaceptable: todo componente que se agregue se adapta a los tokens antes de usarse.
- Botón de acción principal: `variant="primary"`. Por defecto: `variant="outline"`. Destructivo: `variant="destructive"`.
- Una sola acción principal por vista.
- Iconos: `lucide-react`. Avisos: `sonner`.

### Formularios

- Los formularios donde alguien captura datos de otra persona (el admin invitando o editando usuarios, un maestro agregando alumnos) usan `autoComplete="off"` en sus campos. `autoComplete` con valores como `name` o `email` solo se usa cuando la persona escribe sus propios datos.

### Densidad por rol

| Rol | Densidad | Patrón dominante |
|-----|----------|------------------|
| Estudiante | Ligera, mucho aire | Tarjetas y listas orientadas a la siguiente tarea |
| Maestro | Intermedia | Listas con estado y tablas moderadas |
| Administrador | Densa | Tablas con buscador, filtros y selección múltiple |

Los tres comparten los mismos componentes y tokens; cambia el espaciado y la composición, no la biblioteca.

### Textos de la interfaz

- Español de México, tuteo, frases concretas: "Entrega tu tarea antes del jueves a las 23:59", no "Gestiona tus entregables".
- Nombre del producto: "CMEP Campus Digital"; forma corta "Campus Digital".
- Prohibido: "potencia", "desbloquea", "optimiza", "sin fricciones" y similares.
- Sin emojis en el código ni en la interfaz.

## Estilo de código

- TypeScript en modo estricto. Sin `any` salvo justificación en comentario.
- Solo componentes funcionales.
- TanStack Query para todo el estado del servidor.
- **Dominio en español, técnica en inglés:** `claseId`, `estadoPago`, `/clases/{id}/tareas`; pero `handler`, `middleware`, `withAccess`, `useTareas`.
- Archivos en `kebab-case`, componentes en `PascalCase`, funciones y variables en `camelCase`.
- Comentarios solo para explicar el porqué.

### Retornos tempranos (obligatorio)

Usa siempre retornos tempranos. Nunca anides if/else. Primero las guardas, al final el camino feliz.

**Excepción:** `else` es válido dentro de ciclos para control de flujo y en asignaciones de valor con varias ramas donde el retorno temprano no aplica.

```tsx
// Funciones
const getEtiquetaEntrega = (entrega: Entrega, ahora: Date) => {
  if (entrega.estado === "calificado") return "Calificado"
  if (entrega.estado === "entregado" && entrega.conRetraso) return "Entregado con retraso"
  if (entrega.estado === "entregado") return "Entregado"
  if (new Date(entrega.fechaLimite) < ahora) return "Sin entregar"
  return "Asignado"
}

// Componentes — siempre: error → cargando → vacío → datos
function ListaTareas({ claseId }: ListaTareasProps) {
  const { data, isLoading, isError, error } = useTareas(claseId)

  if (isError) {
    return <MensajeError mensaje={error.message} />
  }

  if (isLoading) {
    return <Cargando />
  }

  if (!data.length) {
    return <EstadoVacio titulo="Aún no hay tareas en esta clase" />
  }

  return <ul>{data.map(tarea => <TarjetaTarea key={tarea.tareaId} tarea={tarea} />)}</ul>
}
```

Casos especiales que `apiClient` resuelve en un solo lugar, no cada vista: `403 ACCESO_RESTRINGIDO` redirige a la pantalla de acceso restringido; `403 CAMBIO_DE_CONTRASENA_REQUERIDO` redirige a la de cambio de contraseña; `401` intenta un refresco silencioso y, si falla, manda al login.

### Manejo de errores en el frontend (nunca lanzar fuera de TanStack Query)

- **Dentro de hooks de TanStack Query:** `throw` es correcto; la librería lo captura y activa `isError`.
- **En cualquier otro lugar:** `try/catch` y aviso con toast.
- **Componentes:** siempre manejan `isError` con retorno temprano.
- **Subidas, descargas y manejadores asíncronos:** `try/catch/finally` y toast en caso de error.

```tsx
// BIEN — try/catch en el manejador
const handleEntregar = async () => {
  try {
    setSubiendo(true)
    const archivos = await subirArchivos(seleccion)
    await entregar.mutateAsync({ tareaId, archivos })
    toast.success("Tarea entregada")
  } catch {
    toast.error("No pudimos subir tu entrega. Inténtalo de nuevo.")
  } finally {
    setSubiendo(false)
  }
}

// MAL — rechazo sin manejar si la subida falla
const handleEntregar = async () => {
  const archivos = await subirArchivos(seleccion)
  await entregar.mutateAsync({ tareaId, archivos })
}
```

### Manejo de errores en el backend (la regla es la contraria)

- `core/` y `adapters/` **sí lanzan** errores tipados (`AppError` con `codigo` y estado HTTP).
- Un único envoltorio en `handlers/` los captura y responde `{ "error": { "codigo", "mensaje" } }`.
- Los handlers no llevan `try/catch` propios salvo para traducir un error de proveedor a `AppError`.
- En `workers/`, un error se deja propagar para que pg-boss reintente (3 veces, con espera exponencial) y después lo mande a la cola de fallidos. Nunca se traga un error en silencio.
- Los errores de Prisma (violación de unicidad, registro inexistente) se traducen a `AppError` dentro de `adapters/db`; ningún otro archivo conoce los códigos de Prisma.

### Valores por defecto (explícitos, no silenciosos)

- **BIEN:** `tarea.instrucciones ?? ""` — cadena vacía es un valor válido para un campo de texto
- **BIEN:** `usuario.fotoUrl ?? inicialesDe(usuario.nombre)` — cadena de respaldo explícita
- **MAL:** `const entregas = data ?? []` y luego iterar — oculta que faltan datos
- **MEJOR:** `if (!data) return <EstadoVacio />` y después usar `data` directamente
- **Nunca** pongas un valor por defecto a `estadoPago`, `accesoRestringido`, `rol` o `calificacion` en el frontend. Si faltan, es un error, no un vacío.

## Claude Code

- Usa el modo plan para: una funcionalidad completa, cualquier cambio en `middleware/`, `adapters/auth`, `infra/` o migraciones, y cambios que toquen más de un dominio.
- Orden de implementación: esquemas en `shared/` → `core/` con pruebas → migración de Prisma → `adapters/` → `handlers/` → `workers/` → módulo de `features/`.
- Sin preguntar: `lint`, `test`, `build`, `prisma generate`, `prisma validate`, `prisma format`, `docker compose up/ps/logs` en local y git de solo lectura.
- Preguntando antes: `prisma migrate dev`, `prisma migrate reset`, `docker compose down -v`, cualquier SSH o despliegue, `git commit`, `git push`, instalar dependencias, borrar archivos. Nunca contra `prod`. No leas ni imprimas `.env` ni secretos.
- Tras cada cambio: `lint` y `test` del paquete afectado; `build` si tocaste `shared/`; `prisma validate` si tocaste el esquema. Si no pudiste verificar, dilo.
- Para explorar el repositorio, usa subagentes y conserva solo el resumen.
- Si el humano corrige dos veces lo mismo, propón agregar la regla aquí o en `AGENTS.md`.

## Lo que no se hace

- No uses ni propongas AWS ni ningún proveedor fuera de los aprobados (DigitalOcean, Cloudflare, LiveKit Cloud, Resend)
- No envíes correos ni escribas notificaciones fuera de `adapters/notifier`; no uses SMTP ni otra librería de correo
- No guardes el token de acceso en `localStorage` ni en `sessionStorage`
- No importes Prisma fuera de `adapters/db` ni escribas consultas dentro de un ciclo

- No agregues modo oscuro
- No uses el aspecto por defecto de shadcn/ui ni una paleta neutra en blanco y negro
- No imites a Google Classroom
- No pongas tipos en archivos de hooks ni declares a mano tipos que ya existen en `shared/`
- No dupliques datos entre módulos
- No uses modales cuando una interfaz en línea o un popover funcionan. Excepciones del PRD: el modal de cálculo de calificación y las confirmaciones de acciones destructivas o sensibles (restringir acceso, dar de baja, cambio masivo de estado de pago)
- No sobreconstruyas: entrega lo mínimo que cumple el requisito. Las capas del backend y la cadena de middleware **no** son sobreingeniería y no se omiten
- No lances errores fuera de hooks de TanStack Query en el frontend
- No uses if/else anidados: retornos tempranos
- No uses `?? []` para ocultar datos faltantes
- No anides ternarios en JSX: extrae a retornos tempranos o variables
- No ocultes en la interfaz lo que el backend debería negar: la seguridad va en el middleware
