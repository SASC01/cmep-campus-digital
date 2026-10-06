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
| `docs/DESIGN.md` | **En todo encargo que toque `frontend/`**: sistema visual, tokens con valores, patrones, densidad y tono |

No los cargues todos por defecto. Si encuentras una contradicción entre documentos, detente y avisa.

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
npm run dev:worker       # worker de la cola (pg-boss): envía los correos de cuenta; fuera de production los escribe en backend/tmp/correos/ y nunca llama a Resend
npm run build
npm run lint             # ESLint, Prettier y tsc de src/ y de las pruebas (tsconfig.test.json)
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
docs/          PRD, arquitectura, diseño (DESIGN.md y design/), operación y trabajo/<RF>/ (planes, reportes, revisiones)
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

| Agente | Hace | No hace | Entrega | Modelo |
|---|---|---|---|---|
| `arquitecto` | Analiza, pregunta y planea | No escribe código | `plan.md` | `opus`, esfuerzo `high` |
| `programador` | Implementa el plan aprobado y corrige hallazgos | No cambia el plan ni las pruebas del Tester | Código + resumen | `sonnet`, esfuerzo `medium` (a prueba) |
| `tester` | Intenta romper la implementación con pruebas adversarias | No corrige ni toca código de producción | `*.ataque.test.ts` + `reporte-tester.md` | `opus`, esfuerzo `high` |
| `manager` | Revisa el plan y el resultado final; arbitra y destaca lo importante | No reescribe nada | `revision.md` | `opus`, esfuerzo `high` |

El modelo y el esfuerzo de cada agente se fijan en su frontmatter (`model` y `effort` en `.claude/agents/*.md`). El del `programador` se revisó al cerrar CLASES-01 (decisión del humano, 2026-10-02): sigue `sonnet` con esfuerzo `medium`, con la medida de los "hermanos" de "Resúmenes verificables del programador". Si un encargo vuelve a tener 2 o más rondas extra del tester por subentrega por no aplicar el remedio de un hallazgo a sus hermanos, el `programador` pasa a `opus` en el carril sensible. **Decisión del humano (2026-10-05, al cerrar CLASES-02c):** el `programador` sigue en `sonnet`; si en CLASES-02d o en TAREAS vuelve a haber 2 o más rondas extra del tester por este patrón (hermanos o estados vecinos del mismo mecanismo), pasa a `opus` en el carril sensible sin consultar al humano: el orquestador cambia el frontmatter y lo registra en `docs/ESTADO.md` y en el `aprobacion.md` del encargo.

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
| **sensible** | `middleware/`, `adapters/auth`, sesiones y contraseñas, migraciones, `infra/`, estado de pago, restricción de acceso | Flujo completo + aprobación **explícita y por escrito** del plan. La revisión humana del diff es opcional (ver "Commits y cierre de subentregas") |

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
- Al inicio de cada sesión el orquestador lee docs/ESTADO.md. Al cerrar cada encargo, o antes de limpiar o compactar la sesión, lo actualiza.
- Antes de instruir a un agente sobre qué archivo modificar, el orquestador comprueba que no esté en la lista 'No se toca' del plan; si lo está, pide autorización al humano.
- Ningún agente abre navegadores (con o sin interfaz) ni otras aplicaciones gráficas salvo que el plan lo autorice de forma expresa, y nunca con el perfil ni la sesión del humano. Si una comprobación exige un navegador, se reporta como no verificada y la decide el humano.
- Todo patrón visual nuevo que cree un encargo se documenta en `docs/DESIGN.md` en ese mismo encargo, y el manager lo verifica en la revisión final.
- **Transcripción con cotejo (regla de respaldo).** Cuando un agente no puede escribir su entregable (por ejemplo, un plan demasiado grande para reescribirlo entero, o una herramienta que rechaza el archivo), lo entrega como texto o como ediciones con ancla literal y el orquestador lo aplica tal cual, sin cambiar contenido, con una nota de transcripción al inicio, un cotejo mecánico (`git diff -U0` contra el commit base, con cada hunk mapeado a su encabezado) y el SHA-256 resultante en `aprobacion.md`; el manager verifica el diff. Los agentes escriben sus archivos grandes por partes (`Edit` o `cat >>`), nunca reescribiéndolos completos. Decisión del humano (2026-10-02).

### Commits y cierre de subentregas
Decisión del humano (2026-09-28). Aplica a todos los encargos, de cualquier carril.
- **Sin commit de aprobación del plan.** La aprobación es por escrito y el orquestador la registra en `aprobacion.md`.
- **Base de la verificación de "No se toca":**
  - Fuera de los paquetes, es el commit con que arrancó la rama del encargo.
  - Dentro de los paquetes, es ese mismo commit para la primera subentrega y el commit de la subentrega anterior para las siguientes.
  - Los cambios en `docs/trabajo/<encargo>/` y en `docs/ESTADO.md` quedan fuera de esa verificación.
  - Si el orquestador cambia con autorización del humano un archivo de la lista (por ejemplo, `AGENTS.md`), anota en `aprobacion.md` el SHA-256 del archivo resultante, y ese archivo se verifica contra el hash en lugar del commit.
- **Un commit por subentrega** (uno por encargo si no se divide), nada intermedio: ni en el plan, ni en la ronda 0, ni en las correcciones.
  - Al cerrar cada subentrega, el orquestador le da al humano el bloque de comandos listo para copiar: `git status`, `git add` con las rutas y `git commit` con el mensaje.
  - La subentrega siguiente arranca después de ese commit.
- **El orquestador nunca le pide un hash al humano:** después del commit, lo lee con `git log` y lo anota en `aprobacion.md`.
- **La revisión humana del diff no es obligatoria**, tampoco en el carril sensible: basta el APROBADO del manager y las rondas del tester. Al cerrar cada subentrega, el orquestador le entrega al humano un resumen de máximo 15 líneas.
- **Con el plan aprobado, el orquestador avanza sin esperar indicaciones.** Solo se detiene a preguntar si algo queda BLOQUEADO o surge una decisión que el plan no cubre.

### Resúmenes verificables del programador
Decisión del humano (2026-09-28). Aplica a todos los encargos y a toda entrega del programador: implementación y cada corrección.
- **Pruebas requeridas:** el resumen indica, junto a cada viñeta de "Pruebas requeridas" del plan, el archivo y el título exacto del caso que la cubre.
- **Conteos:** toda cifra de archivos, pruebas o casos sale de `npx vitest list` o de la corrida, con el comando incluido.
- **lint, test y build:** el resumen trae el comando exacto y la última línea de salida de cada uno, no un "pasaron".
- **Verificación del manager:** antes de aceptar el resumen, y antes de que el tester ataque, el manager corre `lint`, `test` y `build` y contrasta cada cifra del resumen con su propia corrida. Una cifra que no coincide devuelve el resumen al programador; no se corrige a mano. El detalle está en `.claude/agents/manager.md`, "Verificación del resumen del programador", y en `.claude/agents/programador.md`, "Resumen verificable".
- **Hermanos de un hallazgo** (decisión del humano, 2026-10-02, al cerrar CLASES-01): al corregir un hallazgo, el resumen lista los controles, rutas, campos o unidades hermanos (los que comparten el mismo patrón que el hallazgo) y dice, uno por uno, si el remedio también les aplica y si se aplicó. **Desde el 2026-10-05 (decisión del humano al cerrar CLASES-02c), los hermanos cubren también los estados vecinos del mismo mecanismo:** al corregir un remedio, el programador lista todos los estados o caminos por los que pasa ese mecanismo (por ejemplo, para un gancho de foco: primera carga, recarga, error en caché, cambio de clave, fallos seguidos) y dice si el remedio les aplica. El manager lo contrasta con el código. Motivo: en CLASES, la mayoría de las rondas extra del tester vinieron de remedios que no se extendieron por analogía (T-30/T-31 en c; T-38/T-39 y T-43/T-44 en d); en CLASES-02c, T-04, T-05 y T-06 fueron tres rondas seguidas sobre el mismo mecanismo (el foco tras una recarga fallida), que el humano contó como una sola ronda extra por hermanos.

### Trabajo visual
Decisión del humano (2026-09-27). Aplica a los encargos de diseño y de interfaz. La base de "No se toca" y los commits siguen "Commits y cierre de subentregas".
- **Ajustes visuales que pide el humano después de ver la pantalla:** van por el carril trivial. El `programador` los aplica y las pruebas quedan en verde, sin plan ni ronda 0. Salvo que toquen pruebas `*.ataque` o lógica: entonces siguen el carril que corresponda.
- **Validaciones sobre datos que solo escribe el humano en un archivo de configuración** (por ejemplo, los enlaces del pie): no justifican más de una ronda del tester por casos extremos. Lo que quede se anota como observación o como pendiente con destino.
- **La comprobación humana en navegador es de máximo 10 minutos y máximo 7 puntos: solo lo que las pruebas automáticas no pueden ver. Nada de mediciones manuales de contraste.** El contraste lo verifican las pruebas de tokens. Lo demás se registra como "no verificada por decisión del humano, cubierta por pruebas automáticas". Decisión del humano (2026-09-28).

## Estilo de código, módulos y sistema de diseño
La guía de código está en `CLAUDE.md`: estructura de módulos de `features/`, reglas técnicas de tokens y componentes, retornos tempranos, manejo de errores en frontend y backend, y la lista de lo que no se hace. El sistema visual (tokens con valores, tipografía, patrones, densidad por rol y tono) está en `docs/DESIGN.md`. Ambos aplican a cualquier agente, no solo a Claude.

## Pruebas
- Toda función de `core/` lleva pruebas unitarias. El cálculo de calificaciones cubre: categorías sin tareas calificadas, pesos redistribuidos, tareas sin calificar, rúbrica parcial, entregas tardías.
- Todo endpoint nuevo lleva pruebas de autorización: rol incorrecto, clase ajena, alumno restringido y, si aplica, que no se filtre el estado de pago.
- Las pruebas unitarias de `core/` usan dobles en memoria. Las de integración (handlers y repositorios) corren con Vitest contra un PostgreSQL desechable que Testcontainers levanta en cada corrida (`backend/test/global-setup.ts`): la misma imagen que `infra/`, las migraciones aplicadas con `prisma migrate deploy` y un único administrador creado con `seed:admin`. Ninguna prueba se conecta a `campus_dev`, a una base compartida ni a `prod`: una guarda en `backend/test/setup.ts` detiene la suite si la base no es la desechable. Toda corrida del backend necesita Docker Desktop encendido.
- **Riesgo residual de Testcontainers:** durante cada corrida del backend, Ryuk (el contenedor que limpia los de la corrida) publica su puerto en todas las interfaces, tiene acceso a Docker y no pide autenticación; Testcontainers 12.1 no permite ligarlo a `127.0.0.1`. El PostgreSQL de pruebas sí se liga a `127.0.0.1`. **No corras la suite del backend en una red pública o no confiable sin la mitigación aplicada en el equipo:** una regla del firewall de Windows que bloquee la entrada a `com.docker.backend.exe` en el perfil de esa red (Docker Desktop 4.48 ignora la opción `"ip"` del motor). La regla solo cubre el perfil en que se crea: una red no confiable clasificada como Privada no queda cubierta. Pasos y verificación en `docs/trabajo/CHORE-01-testcontainers/mitigacion-ryuk.md`. En el equipo de Carlos está aplicado el bloqueo del firewall en el perfil Público; la opción de Docker Engine no aplica en Docker Desktop 4.48.
- Avisos y correos se prueban a través de `notifier` con un doble en memoria que registra lo que se habría enviado. Ninguna prueba llama a Resend.
- No marques nada como terminado con pruebas en rojo ni las desactives para que pase.
- Toda prueba debe ejecutar al menos una aserción. Nunca termines una prueba con un return temprano cuando falte una condición previa: si falta, la prueba falla con un mensaje que lo explique.
- **Bloqueos en las pruebas (CHORE-02).** Ninguna prueba pide un bloqueo de tabla (`LOCK TABLE`) que pueda esperar: solo con `NOWAIT` y un reintento acotado, para no formar una cola delante de las demás pruebas (lo comprueba `higiene-de-pruebas.integracion.test.ts`). Una retención deliberada de una fila da por formada una operación solo cuando un proceso espera **esa fila** (`wait_event` `transactionid` o `tuple`), nunca por cualquier proceso bloqueado detrás (`formadasDetrasDe` de `backend/test/ayudas-concurrencia.ts`). Toda transacción de una prueba que retiene filas o bloqueos pasa un `timeout` explícito mayor que su espera más larga.
- **Nunca se corren dos suites a la vez** (backend y frontend, o dos corridas del backend): la carga deja la corrida sin verificar (antes de CHORE-02, además tumbaba el backend por la espera en cadena de `LOCK TABLE usuarios`). Se corre una, se espera a que termine y se corre la otra. Decisión del humano (2026-10-02).

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
