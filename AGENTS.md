# AGENTS.md

Instrucciones para cualquier agente de IA que trabaje en este repositorio. Es la **fuente única** de reglas de trabajo; `CLAUDE.md` la importa.

## Proyecto
**CMEP Campus Digital.** Plataforma educativa web para una sola institución: clases, tareas con rúbrica, calificaciones, clases en vivo, estado de pago y restricción de acceso. Tres roles: `estudiante`, `maestro`, `admin`. Fase experimental. Monolito modular (Fastify, PostgreSQL, pg-boss) en Docker Compose sobre un Droplet de DigitalOcean; frontend en Cloudflare Pages; archivos en Cloudflare R2 (MinIO en local); video en LiveKit Cloud; correo con Resend. **Sin AWS.** Interfaz en español (México).

## Qué leer y cuándo
| Documento | Cuándo |
|---|---|
| `docs/ARCHITECTURE-ESSENTIALS.md` | **Siempre, antes de escribir código** |
| `docs/PRD.md` | Al implementar o modificar una funcionalidad o una regla de negocio (busca el `RF-xx` o `RN-xx`) |
| `docs/ARCHITECTURE.md` | Solo si ESSENTIALS no alcanza: flujos, atributos de tablas, justificación de decisiones |

No cargues los tres por defecto. Si encuentras una contradicción entre documentos, detente y avisa.

## Comandos
> Se completan al inicializar el proyecto. Mantener esta sección al día es parte de cualquier cambio que los altere.
> El bloque está marcado como `bash` solo para resaltar la sintaxis: las líneas que copian `.env.example` usan la forma con guarda de Windows PowerShell 5.1, la terminal del proyecto. En Git Bash el equivalente es `cp -n .env.example .env`.

```bash
# Raíz del repositorio (una sola vez tras clonar, y cuando cambie un package.json)
npm install              # instala los tres workspaces: shared, backend, frontend
npm run lint / test / build   # en todos los workspaces

# Frontend (desde /frontend)
if (-not (Test-Path .env)) { Copy-Item .env.example .env }   # opcional: solo VITE_API_URL, vacía por defecto
npm run dev          # SPA en http://127.0.0.1:5173 con proxy de /api hacia la API local (127.0.0.1:3000)
npm run build        # tsc -b + vite build → frontend/dist
npm run lint         # ESLint + Prettier + tsc -b
npm run test         # Vitest con jsdom; no necesita la API ni infra

# Backend (desde /backend)
if (-not (Test-Path .env)) { Copy-Item .env.example .env }   # crea tu configuración local sin sobrescribirla
npm run dev              # API con recarga
npm run dev:worker       # worker de la cola
npm run build
npm run lint
npm run test             # Vitest: unitarias e integración contra un PostgreSQL desechable por corrida (Testcontainers; necesita Docker Desktop, no infra)
npx prisma migrate dev   # crea y aplica una migración en local
npx prisma generate
npm run seed:admin       # crea la cuenta única de administrador con ADMIN_EMAIL, ADMIN_PASSWORD (≥ 10) y ADMIN_NOMBRE de backend/.env; falla si ya existe
npm run reset:admin      # cambia la contraseña del administrador a ADMIN_PASSWORD y cierra sus sesiones; no activa el cambio obligatorio; nunca imprime la contraseña

# Servicios locales (desde /infra)
if (-not (Test-Path .env)) { Copy-Item .env.example .env }   # crea tu configuración local sin sobrescribirla
docker compose up -d     # PostgreSQL, MinIO y LiveKit en modo dev
docker compose down
```

## Estructura
```
frontend/src/{app,features,components,lib,services,styles}
backend/src/{core,adapters,middleware,handlers,workers}
backend/prisma/   schema.prisma y migraciones
shared/        tipos y esquemas zod comunes
infra/         docker-compose, Caddyfile, LiveKit, respaldos
docs/          PRD, arquitectura, operación y trabajo/<RF>/ (planes, reportes, revisiones)
.claude/agents/ arquitecto, programador, tester, manager
```

## Reglas que no se rompen
1. **Capas.** `core/` no importa librerías de infraestructura ni `adapters/`. Solo `adapters/` importa `@prisma/client`, `@prisma/adapter-pg`, `pg`, el cliente generado por Prisma (`adapters/db/generated/`), `pg-boss`, `minio`, `resend`, `argon2`, `jose` o `livekit-server-sdk`. Los handlers son delgados.
2. **Autorización.** Todo endpoint pasa por la cadena de middleware en su orden. Ninguna verificación de rol, propiedad o inscripción se escribe a mano dentro de un handler. Nada de seguridad solo en el frontend.
3. **Estado de pago.** Nunca devolver el estado de pago de un alumno a otro estudiante. En respuestas para estudiantes el campo se omite.
4. **Consultas sanas.** Sin N+1 (ninguna consulta dentro de un ciclo), toda consulta filtra por columna indexada, toda lista se pagina, y el SQL crudo va siempre parametrizado. Si una consulta no encaja en un índice existente, detente y propón el índice.
5. **Lo lento va por cola.** Ningún handler crea notificaciones ni hace trabajo pesado dentro de la petición. El evento se encola en la misma transacción que el dato.
6. **Los archivos no pasan por Node ni por el servidor.** Solo URLs prefirmadas del almacén (R2 en `prod`, MinIO en `dev`).
7. **Fechas en UTC ISO 8601** al guardar y transportar.
8. **Trabajos diferidos sincronizados.** Editar o borrar una fecha límite o una clase en vivo cancela y recrea su trabajo, en la misma transacción.
9. **Secretos.** Nunca en el código, en el repositorio ni en variables del frontend.
10. **Infraestructura solo en `infra/` y esquema solo por migraciones de Prisma.** Nada se configura a mano en el servidor sin quedar en el repositorio; nunca se altera la base directamente.
11. **Sin AWS y sin proveedores no aprobados.** Aprobados: DigitalOcean, Cloudflare (DNS, Pages, R2), LiveKit Cloud y Resend. No propongas ni instales nada de AWS, Firebase, Supabase, Vercel u otro servicio externo sin aprobación explícita. Todo proveedor va detrás de un adaptador y se cambia por configuración. La regla aplica a servicios y a librerías que nuestro código importa o ejecuta; las dependencias transitivas de herramientas de desarrollo (por ejemplo, del CLI de Prisma) se reportan, pero no bloquean.
12. **Avisos y correos solo por `notifier`.** Nadie más escribe en `notificaciones` ni llama a Resend. Correo solo por la API de Resend (nada de SMTP ni otras librerías). Los correos de aviso respetan los interruptores de `configuracion`, apagados por defecto. **Fuera de `prod` jamás sale un correo real:** en `dev` y pruebas el canal es `registro`.
13. **Autenticación sin atajos.** Contraseñas solo con argon2id; tokens de refresco, enlaces de recuperación e invitación y contraseñas temporales guardados solo como hash; `/auth/recuperar` no revela si un correo existe; una contraseña temporal se muestra una única vez y obliga a cambiarla; el token de acceso nunca en `localStorage`; nada de esto aparece en logs.

## Pide confirmación antes de
- Desplegar, conectarte por SSH a un servidor, o ejecutar cualquier comando contra una base o un almacén que no sea el local.
- `prisma migrate reset`, `docker compose down -v` o cualquier comando que borre datos o volúmenes.
- Cualquier cosa contra `prod`.
- Agregar una dependencia nueva (justifica por qué no basta con lo que hay).
- Crear una migración: cambiar tablas, columnas, restricciones o índices.
- Modificar `middleware/`, `adapters/auth`, o cualquier archivo de `infra/`.
- Borrar archivos o hacer refactors que toquen más de un dominio.
- Apartarte de una decisión de `ARCHITECTURE-ESSENTIALS.md`. Si crees que una decisión es incorrecta, dilo y argumenta; no la cambies por tu cuenta.

## Forma de trabajar
- Para cambios no triviales, presenta primero un plan breve: archivos a tocar, enfoque y riesgos. Espera el visto bueno.
- Cambios pequeños y enfocados. Una funcionalidad por cambio. No mezcles refactor con funcionalidad.
- No inventes requisitos. Si el PRD no lo cubre, pregunta.
- Si algo no se puede verificar (no hay credenciales, no hay red), dilo; no afirmes que funciona.
- Al terminar, resume qué cambió, cómo lo probaste y qué queda pendiente.

## Equipo de agentes y flujo de trabajo
Cuatro subagentes en `.claude/agents/`. El **orquestador** es la sesión principal: invoca a cada agente, le pasa la ruta de la carpeta de trabajo y transmite al humano las preguntas y los veredictos. Los agentes no comparten memoria: **todo traspaso es un archivo** en `docs/trabajo/<RF-xx-nombre-corto>/`.

| Agente | Hace | No hace | Entrega |
|---|---|---|---|
| `arquitecto` | Analiza, pregunta y planea | No escribe código | `plan.md` |
| `programador` | Implementa el plan aprobado y corrige hallazgos | No cambia el plan ni las pruebas del Tester | Código + resumen |
| `tester` | Intenta romper la implementación con pruebas adversarias | No corrige ni toca código de producción | `*.ataque.test.ts` + `reporte-tester.md` |
| `manager` | Revisa el plan y el resultado final; arbitra y destaca lo importante | No reescribe nada | `revision.md` |

### Flujo
1. El humano pide una funcionalidad citando su `RF-xx`.
2. `arquitecto` → `plan.md`. Si el estado es `BLOQUEADO`, el orquestador hace las preguntas al humano y vuelve a invocar al arquitecto con las respuestas.
3. `manager` (modo plan) → `revision.md`. Si pide cambios, regresa al paso 2.
4. **El humano aprueba el plan.** Sin aprobación no se programa.
5. `programador` implementa.
6. `tester` ataca. Si el veredicto es `ROTO`, vuelve al paso 5 con el reporte. **Máximo 3 rondas**; a la tercera se escala.
7. `manager` (modo final) → veredicto.
8. **El humano decide** commit y despliegue. Ningún agente hace commit, push ni deploy.

### Carriles (los asigna el arquitecto, los confirma el manager)
| Carril | Cuándo | Recorrido |
|---|---|---|
| **trivial** | Texto, estilo o corrección sin cambio de comportamiento ni de datos | `programador` con pruebas → resumen al humano |
| **normal** | Cualquier funcionalidad | Flujo completo |
| **sensible** | `middleware/`, `adapters/auth`, sesiones y contraseñas, migraciones, `infra/`, estado de pago, restricción de acceso | Flujo completo + aprobación **explícita y por escrito** del plan + revisión humana del diff antes del commit |

### Reglas del equipo
- Los hallazgos se identifican (`T-01`, `M-01`) y se responden uno por uno.
- El Programador nunca modifica, desactiva ni borra pruebas `*.ataque.test.ts`. Si considera incorrecta una, argumenta y decide el Manager.
- Ningún agente declara verde algo que no ejecutó.
- Un desacuerdo con `ARCHITECTURE-ESSENTIALS.md` se escala; no se resuelve entre agentes.
- La carpeta `docs/trabajo/` se versiona: es el historial de decisiones de cada funcionalidad.
- Los formateadores y cualquier comando con `--write`, `--fix` o `-i` se ejecutan solo acotados al paquete del encargo (`shared/`, `backend/` o `frontend/`), nunca desde la raíz sobre todo el repositorio.
- Un agente no termina procesos que no arrancó; si el puerto está ocupado por un proceso ajeno o el remedio del plan no aplica, se detiene y pregunta.
- En Windows, un proceso de larga vida (API, Vite, worker) se arranca redirigiendo su salida a un archivo y guardando su PID (por ejemplo, `Start-Process` con `-RedirectStandardOutput` y `-PassThru`); nunca combinado con una tubería, porque el hijo hereda la tubería y el comando no termina.
- Cuando el plan dice detenerse ante una condición, te detienes aunque la alternativa parezca obvia o inofensiva. Resolverlo por tu cuenta es una desviación, aunque salga bien.

## Estilo de código, módulos y sistema de diseño
La guía completa está en `CLAUDE.md`: estructura de módulos de `features/`, tokens y componentes, retornos tempranos, manejo de errores en frontend y backend, y la lista de lo que no se hace. Aplica a cualquier agente, no solo a Claude.

## Pruebas
- Toda función de `core/` lleva pruebas unitarias. El cálculo de calificaciones cubre: categorías sin tareas calificadas, pesos redistribuidos, tareas sin calificar, rúbrica parcial, entregas tardías.
- Todo endpoint nuevo lleva pruebas de autorización: rol incorrecto, clase ajena, alumno restringido y, si aplica, que no se filtre el estado de pago.
- Las pruebas unitarias de `core/` usan dobles en memoria. Las de integración (handlers y repositorios) corren con Vitest contra un PostgreSQL desechable que Testcontainers levanta en cada corrida (`backend/test/global-setup.ts`): la misma imagen que `infra/`, las migraciones aplicadas con `prisma migrate deploy` y un único administrador creado con `seed:admin`. Ninguna prueba se conecta a `campus_dev`, a una base compartida ni a `prod`: una guarda en `backend/test/setup.ts` detiene la suite si la base no es la desechable. Toda corrida del backend necesita Docker Desktop encendido.
- **Riesgo residual de Testcontainers:** durante cada corrida del backend, Ryuk (el contenedor que limpia los de la corrida) publica su puerto en todas las interfaces, tiene acceso a Docker y no pide autenticación; Testcontainers 12.1 no permite ligarlo a `127.0.0.1`. El PostgreSQL de pruebas sí se liga a `127.0.0.1`. **No corras la suite del backend en una red pública o no confiable sin la mitigación aplicada en el equipo:** una regla del firewall de Windows que bloquee la entrada a `com.docker.backend.exe` en el perfil de esa red (Docker Desktop 4.48 ignora la opción `"ip"` del motor). La regla solo cubre el perfil en que se crea: una red no confiable clasificada como Privada no queda cubierta. Pasos y verificación en `docs/trabajo/CHORE-01-testcontainers/mitigacion-ryuk.md`. En el equipo de Carlos está aplicado el bloqueo del firewall en el perfil Público; la opción de Docker Engine no aplica en Docker Desktop 4.48.
- Avisos y correos se prueban a través de `notifier` con un doble en memoria que registra lo que se habría enviado. Ninguna prueba llama a Resend.
- No marques nada como terminado con pruebas en rojo ni las desactives para que pase.
- Toda prueba debe ejecutar al menos una aserción. Nunca termines una prueba con un return temprano cuando falte una condición previa: si falta, la prueba falla con un mensaje que lo explique.

## Git
- Ramas: `feat/…`, `fix/…`, `chore/…`, `docs/…`.
- Commits convencionales en español: `feat(tareas): permite enlaces en la entrega`.
- No hagas commit ni push sin que se te pida. Nunca `push --force` a `main`.
- No subas `.env`, respaldos, volcados de base ni `node_modules`.

## Definición de terminado
- [ ] Cumple el `RF-xx` / `RN-xx` correspondiente
- [ ] Respeta las capas y pasa por el middleware
- [ ] `lint`, `build` y `test` en verde
- [ ] Pruebas de autorización incluidas si hay endpoint nuevo
- [ ] Migración de Prisma incluida y compatible hacia atrás si cambió el esquema
- [ ] `infra/` y `.env.example` actualizados si cambió la infraestructura o la configuración
- [ ] Documentos actualizados si cambió una decisión, una tabla o un comando
