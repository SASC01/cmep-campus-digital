# Plan — AUTH-03 · ajustes de cuentas (cambio obligatorio sin la temporal, nombre al activar, registro de maestros por enlace, invitación masiva y contraseñas fuera de la caché)
Estado: LISTO. Aprobado por escrito por el humano el 2026-09-28, con la recomendación en B-01 a B-03, N-01 a N-06, P-01 y P-02. Las decisiones, los datos de Resend y las bases están en `aprobacion.md`.
Enmienda 1 (revisión del manager): M-01 a M-08
Enmienda 2 (decisiones del humano y revisión de la enmienda 1): M-09 a M-13, ritmo de 250 ms y cambio de proceso
Enmienda 3 (arbitraje de PA-07, AUTH-03a ronda 2)
Enmienda 4 (revisión final de 03a): redacción de V-04 y V-05
Carril: sensible (las tres subentregas; justificación en "Alcance", "Subentregas"). La revisión humana del diff no es obligatoria (`AGENTS.md`, "Commits y cierre de subentregas").
Requisitos: RF-04b, RF-04d, RF-04e y RF-04f; MF-05 de AUTH-02b (contraseña del login y del registro en la caché de mutaciones). Contexto: RF-02, RF-03, RF-04, RF-04a, RN-03 (restringido con cambio pendiente). ESSENTIALS "Autenticación", "Autorización", "Reglas de datos", "Asíncrono y notificaciones". `ARCHITECTURE.md` D-04, §6, §7, §8, §9 y §14.
Rama: `feat/auth-03-ajustes-de-cuentas`, creada por el humano desde `53b3126`. Ningún agente crea ni cambia de rama.
Antecedentes: `docs/trabajo/AUTH-02-cuentas-y-correo/` (`plan.md` DEC-03, DEC-08, DEC-09, DEC-11, Enmiendas 1 y 2; `aprobacion.md`, "Decisiones del humano sobre la escalada de AUTH-02b" y "Nombre ajeno en la invitación de un maestro"); forma de subentregas, ronda 0 y "No se toca" de `docs/trabajo/DESIGN-01-sistema-de-diseno/plan-01b.md`. Revisión del manager y de la enmienda 1: `revision.md`. Aprobación: `aprobacion.md`.

**Marcadores de commit** (Enmienda 2):
- `<R>` = `53b3126`, el commit con que arrancó la rama;
- `<Ca>`, `<Cb>` y `<Cc>`, los commits de 03a, 03b y 03c. El orquestador los lee con `git log` después de cada commit y los anota en `aprobacion.md`.

No hay commit de aprobación del plan.

---

## Enmienda 4 — revisión final de 03a
Cambia solo la redacción de V-04 (la viñeta de `contrasenaActual` y `mostrarTemporal` excluye los comentarios y la lista de censura de `config/logger.ts`, que se conserva por la regla 13) y de V-05, a pedido del manager (`revision.md`, "Revisión final — AUTH-03a", "Documentos a actualizar").
En V-05, `docs/DESIGN.md` queda fuera de la comparación con `<R>` porque lo editan los programadores en los pasos 9, 22 y 35, y un archivo protegido que cambió el orquestador se compara con **el último** SHA-256 anotado para ese archivo en `aprobacion.md` (M-14).

## Enmienda 3 — arbitraje de PA-07 (AUTH-03a, ronda 2)
**Qué cambió.** La fila PA-07 de "PARADAS" pasa a ser el texto exacto que fijó el manager (`revision.md`, "Arbitraje de PA-07 (AUTH-03a, ronda 2)"). Nada más cambia.

**Por qué.** PA-07 no tenía excepciones, y el tester se detuvo, con razón, ante los dos `P2028` que el bloque de AUTH-02 de `cuentas-r3.ataque.test.ts` provoca a propósito. Esos dos ya estaban aceptados en AUTH-02. La fila nueva los excluye por ruta y llamada de Prisma, y exige evidencia (comando, conteo y detalle de cada `P2028`) en todo reporte de PA-07. Vale para 03a, 03b y 03c.

## Enmienda 2 — decisiones del humano y revisión de la enmienda 1 (APROBADO, con M-09 a M-13)
Incorporo todo. No tengo desacuerdos que argumentar.

| Cambio | Qué cambió | Dónde |
|---|---|---|
| **Estado** | LISTO: todas las preguntas quedan resueltas con la recomendación. La tabla de preguntas se conserva como registro, con la decisión del humano anotada | Cabecera, "Preguntas bloqueantes" |
| **M-09** | Cuenta para el ritmo todo intento que llegó al notifier: enviado, rechazado **o lanzado** (por ejemplo, un 429 o un 5xx de Resend). `registrarConsumidores` envuelve el notifier: el envoltorio registra la marca de tiempo en un `finally` y no atrapa el error, que sigue propagándose para que pg-boss reintente. `workers/correo-de-cuenta.ts` no cambia. `cuentaParaElRitmo` desaparece: un omitido nunca llama al notifier y por eso no cuenta | §D-C5, `core/correo/ritmo.ts`, C-13, "Pruebas requeridas" 03c, "Puntos de ataque" 03c |
| **M-10** | La variante del botón de `EstadoVacio` es parte de la prop `accion` (`variante: "primary" \| "outline"`), sin valor por defecto. En `/admin/maestros`, `outline` | §D-B6, §D-B9 (§7.10) |
| **M-11** | En "No se toca", `revision.md` dice "salvo el manager", como `aprobacion.md` dice "salvo el orquestador" | "No se toca" |
| **M-12** | `reloj()` devuelve un `Date`: `esperaAntesDelSiguiente` recibe `reloj().getTime()`. `nombreProvisionalDe` devuelve el valor ya analizado por `nombreSchema` (`resultado.data`, recortado), no el texto de entrada | §D-C5, §D-C1, "Cambios por capa" (core) |
| **M-13** | Regla para el programador de 03b y 03c, por `estatico-r1.ataque.test.ts`: nada de valores arbitrarios de maquetación (`-[…]`) fuera de `components/ui/`, nada de `animate-` nuevos, nada de `bg-background` y nada de `fixed` fuera de la barra y del diálogo | "Pasos de implementación", reglas |
| **Agregados del tester en la ronda 0** | Cada caso que el tester reescriba fuera del inventario cita el C-n que lo contradice. Si no hay C-n, no es una contradicción sino un hallazgo, y no se reescribe | "Puntos de ataque", ronda 0, paso 2 |
| **Ritmo de 250 ms** (B-01) | Resend: 100 correos por día calendario UTC y 10 peticiones por segundo por equipo. `INTERVALO_MINIMO_ENTRE_CORREOS_MS = 250`, y un lote de 80 tarda unos 20 s. `INVITACIONES_LIMITE_DIARIO = 80` no cambia. R-05 explica por qué la ventana móvil de 24 h es más estricta que el día UTC. §18 ya no pide confirmar límites y remite al pendiente de `ESTADO.md` | S-04, §D-C5, R-05, R-06, textos para §9, §18 y ESSENTIALS "Asíncrono" |
| **Cambio de proceso** (`AGENTS.md`, "Commits y cierre de subentregas") | Sin commit de aprobación. Base de "No se toca": `<R>` fuera de los paquetes, y `<R>`, `<Ca>` y `<Cb>` dentro. Tres commits, uno por subentrega. Al cerrar cada una, el orquestador da un resumen de 15 líneas como máximo y el bloque de comandos, y después lee el hash con `git log`; el humano nunca da un hash. Sin revisión humana del diff. Los archivos protegidos que cambie el orquestador (`AGENTS.md` y los documentos que aplica al cerrar cada subentrega) se verifican contra su SHA-256 anotado en `aprobacion.md`. Los textos de documentos se aplican al cerrar cada subentrega, antes de su commit. La comprobación humana sigue siendo una sola, al final de 03c | Marcadores, "Subentregas", "Puntos de commit", paso 0, rondas 0, pasos 2, 12, 14, 25, 27 y 38 a 40, PA-02, V-05, "Textos literales propuestos" |

## Enmienda 1 — revisión del manager (CAMBIOS REQUERIDOS: M-01 bloquea; M-02 a M-08, no)
Incorporé todos los hallazgos; ninguno me pareció incorrecto.

| Hallazgo | Qué cambió | Dónde |
|---|---|---|
| **M-01** | `frontend/src/components/layout/estatico-r1.ataque.test.ts` entra en el inventario de la ronda 0: 3 casos en 03a (C-5b) y 3 en 03b (C-14), cada uno con su texto nuevo y lo que sigue protegiendo. La búsqueda de la ronda 0 suma `CampoContrasena`, `TEXTOS_CAMPO_CONTRASENA` y `mostrarTemporal`. La fila `cuentas-r2:228` de C-2 dice en qué se convierte (lleva la cookie de una sesión propia) y qué sigue protegiendo | §D-A4 (C-2, C-5b), §D-B7 (C-14), "Puntos de ataque", ronda 0, paso 2 |
| **M-02** | Filtro previo, sin bloqueo, sobre la cookie: sin una sesión viva propia, `401 SESION_INVALIDA` **antes** de reservar el intento y de calcular argon2. La decisión definitiva sigue bajo el bloqueo. La reescritura de `cuentas-r1:444` lleva la cookie del login con la temporal | §D-A1, §D-A4 (C-1), "Pruebas requeridas" 03a, "Puntos de ataque" 03a |
| **M-03** | R-15: pestaña vieja del mismo navegador. La tabla de "Autorización" dice que `credencial_cambiada` pasa de `400 CONTRASENA_ACTUAL_INCORRECTA` a `401 SESION_INVALIDA` y que eso dispara el refresco del `apiClient` | R-15, "Autorización" |
| **M-04** | El bloqueo consultivo se toma con `$executeRaw` etiquetado; la alternativa autorizada es `$queryRaw` con `::text`. V-04 acepta las dos | §D-C3 paso 4.1, V-04, PA-14 |
| **M-05** | `components/estado-vacio.tsx` (`EstadoVacio`) se construye en 03b. El vacío de la lista de enlaces lleva la acción "Generar el primer enlace"; la subtabla de registrados, ninguna (excepción documentada en `DESIGN.md` §7.10) | §D-B6, §D-B9 |
| **M-06** | La espera del worker va **antes** del envío siguiente, y solo por lo que falte desde el último | §D-C5, R-06 |
| **M-07** | `nombreProvisionalDe` garantiza un resultado que pasa `nombreSchema` | §D-C1 |
| **M-08** | H-4 se fundió en H-3 y el punto del gestor de contraseñas quedó acotado a un solo navegador: 6 puntos | "Comprobación humana en navegador" |
| Detalles | Texto de §6 "Maestros" como lista y después la nota. La fila de `contrasena-visible.test.tsx` de 03b dice "Modificar". S-13 remite a P-02 | Varios |

---

## Preguntas bloqueantes

**Ninguna pendiente.** El humano respondió todas el 2026-09-28 con la recomendación (`aprobacion.md`, "Respuestas a la tabla de preguntas"). P-01 quedó resuelta: el humano hizo `git restore` de `campo-contrasena.test.tsx`, y el orquestador comprobó con `git status` que el archivo ya no tiene cambios. La tabla se conserva como registro; la columna "Decisión del humano" resume lo aprobado.

| ID | Pregunta | Opciones | Recomendación del arquitecto (y por qué) | Recomendación del manager | Decisión del humano |
|---|---|---|---|---|---|
| **B-01** (03c) | Invitación masiva: ¿cuál es el límite diario y qué pasa si la lista lo rebasa? El PRD dice que se "respetan los límites diarios de Resend", pero no da el número | **(A)** Variable `INVITACIONES_LIMITE_DIARIO`, 80 por defecto. El cupo cuenta las invitaciones creadas en las últimas 24 h, sueltas y masivas. Si los correos **nuevos** de la lista rebasan el cupo que queda, el lote se rechaza completo sin crear nada (`409 CUPO_DIARIO_INSUFICIENTE`), y el mensaje dice cuántas quedan hoy. **(B)** Procesar las primeras N y reportar el resto en una cuarta categoría. **(C)** Crear todas las cuentas y dejar para el día siguiente los envíos que rebasen el cupo | **(A).** Es atómica: nada queda a medias. Conserva las tres categorías del PRD y no necesita trabajos diferidos | **De acuerdo con (A)**, con el número confirmado en la cuenta de Resend (límite diario **y** de ritmo). Valor por defecto con al menos un 20 % de margen (R-05) | **(A)**, `INVITACIONES_LIMITE_DIARIO = 80`. Resend, plan gratuito: 100 correos por día calendario UTC y 10 peticiones por segundo por equipo. Ritmo del worker: 250 ms |
| **B-02** (03c) | ¿Qué nombre recibe una cuenta cuya línea no trae nombre? | **(A)** Nombre provisional: parte local del correo; si no sirve, el correo completo; si tampoco, "Maestro invitado" (M-07). **(B)** `nombre` opcional en la base. **(C)** Nombre obligatorio por línea | **(A).** No toca el esquema ni ningún contrato; el punto 4 permite corregirlo (R-04) | **De acuerdo con (A)**, con la condición de que el nombre provisional siempre pase `nombreSchema` (M-07) | **(A)** |
| **B-03** (03a) | Sin la temporal, ¿qué prueba que quien cambia la contraseña es quien entró con ella? | **(A)** Solo el token de acceso y la bandera (R-01). **(B)** Además, una sesión viva del mismo usuario en la cookie de refresco, con un filtro previo sin bloqueo (M-02) y la decisión bajo el bloqueo del usuario | **(B).** Conserva la garantía que hoy da la temporal, sin pedirle nada al usuario | **De acuerdo con (B)**, más el filtro previo de M-02 | **(B)**, con el filtro de M-02 |
| N-01 (03b) | ¿El enlace de registro se muestra una sola vez o se puede volver a ver? | **(A)** Una sola vez (token aleatorio, solo SHA-256 en la base). **(B)** Derivado del id, visible en la lista | **(A)** | **De acuerdo con (A)** | **(A)** |
| N-02 (03b) | Rango de vigencia del enlace | **(A)** 1 a 30 días. **(B)** 1 a 90 días. **(C)** En horas | **(A)** | **De acuerdo con (A)** | **(A)** |
| N-03 (03b) | ¿El registro por enlace deja la sesión iniciada? | **(A)** Sí, como RF-02. **(B)** No | **(A)** | **De acuerdo con (A)** | **(A)** |
| N-04 (03b) | Usos por enlace | **(A)** Sin límite hasta que venza o se revoque. **(B)** Un máximo por enlace | **(A)** | **De acuerdo con (A)** | **(A)** |
| N-05 (03b y 03c) | ¿Dónde viven las pantallas nuevas del admin? | **(A)** `/admin/maestros` con el destino "Maestros". **(B)** Dentro de `/admin` | **(A)** | **De acuerdo con (A)** | **(A)** |
| N-06 (03c) | Formato y tamaño de la lista | **(A)** Hasta 100 líneas; correo solo, o correo y nombre separados por tabulador, `;` o `,`, en cualquier orden. **(B)** Solo "correo, nombre" | **(A)** | **De acuerdo con (A)** | **(A)** |
| **P-01** (del manager) | Un espacio sobrante sin confirmar en `frontend/src/features/auth/components/campo-contrasena.test.tsx` hacía fallar el Prettier del `lint` y habría activado PA-02 en la ronda 0 | **(A)** Descartarlo con `git restore` antes de empezar. **(B)** Conservarlo y hacer commit de él aparte | **(A).** Lo resuelve el humano; el plan no lo toca | Descartarlo | **Resuelta:** el humano hizo `git restore` y el orquestador lo comprobó |
| **P-02** (del manager) | "Cargar más" como forma de paginar las tablas del admin | **(A)** Solo en `/admin/maestros`; ADMIN decide la tabla de usuarios. **(B)** General. **(C)** Paginación numerada | **(A)** | Aprobarla solo para `/admin/maestros` | **(A)** |

---

## Suposiciones

- **S-01 · Entorno** (de `docs/ESTADO.md` §5, sin volver a verificar): Docker Desktop 4.48.0, Node `v24.21.0`, npm `11.19.0`. Existe la regla del firewall "Campus: bloquear entrada a Docker en redes publicas" (Inbound, Block, perfil Público). La red `IZZI-F281` es pública y el humano la declaró de confianza. La rama es `feat/auth-03-ajustes-de-cuentas`, con base en `<R>` = `53b3126`. La suite del backend solo se corre después de comprobar la regla del firewall (PA-01), por el riesgo residual de Ryuk (`AGENTS.md`, "Pruebas").
- **S-02 · Sin dependencias nuevas.** No cambia ningún `package.json` ni el lockfile. pg-boss 12.34.0 ya tiene `insert(nombre, trabajos, { db })` (`node_modules/pg-boss/dist/manager.js:1277`; manda los trabajos como un único parámetro JSON, `:1348`; `insertJobs` hereda la política de la cola, `plans.js:2071-2079`, según verificó el manager). Prisma 7 tiene `createMany` con `skipDuplicates`.
- **S-03 · Sin la CLI de shadcn.** `components/ui/table.tsx`, `textarea.tsx` y `badge.tsx` se escriben a mano, con la estructura de shadcn y los tokens de `DESIGN.md`, como `label.tsx` y `sonner.tsx` en DESIGN-01 (S-02 de su `plan.md`). D-02 y D-03 de DOCS-01 siguen pendientes.
- **S-04 · Datos de Resend** (confirmados por el humano en la documentación oficial, `aprobacion.md`):
  - el plan gratuito da 100 correos por día calendario UTC, que se reinicia a medianoche UTC;
  - el límite de ritmo es de 10 peticiones por segundo por equipo.

  El worker deja al menos **250 ms** entre dos intentos de envío (4 por segundo como máximo), con margen para cualquier otro uso de la misma cuenta (§D-C5).
- **S-05 · El registro por enlace pide lo mismo que el registro de estudiante:** nombre completo, correo y contraseña, sin confirmación (RF-02). Un correo que ya existe responde `409 CORREO_EN_USO`, igual que `/auth/registro`.
- **S-06 · Una línea de la masiva con el correo de una cuenta de cualquier rol** (estudiante, maestro o admin) se reporta como "ya tenía cuenta". Su rol no cambia y no se le envía nada.
- **S-07 · Sin reenvío de invitaciones** ni lista de invitaciones pendientes: son de ADMIN. Una invitación masiva vencida se recupera como hoy, con "¿Olvidaste tu contraseña?" (lo dice el correo).
- **S-08 · La invitación individual** (`POST /admin/maestros`) no se rechaza por el cupo, pero su token cuenta en él.
- **S-09 · `enlaces_registro` sin `creado_por`.** El admin es una cuenta única (ESSENTIALS) y el PRD no pide auditar quién generó cada enlace.
- **S-10 · Sin límite por IP en `POST /auth/registro-maestro`**, igual que `/auth/registro`. En un colegio, varios maestros se registran desde la misma red con NAT, y un límite por IP los bloquearía. Lo cubre el límite de tasa de DEPLOY en el borde (texto para §18 en "Riesgos y desacuerdos").
- **S-11 · Un solo hash inutilizable por lote.** La masiva calcula un único `hashDeContrasenaInutilizable()` para todas sus cuentas, porque 100 argon2id dentro de una petición romperían RNF-02 y la regla 5 de `AGENTS.md`. Nadie conoce el secreto que lo originó, así que compartirlo no abre ningún camino (R-07).
- **S-12 · El nombre en `/establecer-contrasena` usa `autoComplete="name"`:** quien lo escribe es el propio maestro (regla de `CLAUDE.md`, "Formularios"). Los formularios nuevos del admin (vigencia y lista de maestros) usan `autoComplete="off"`.
- **S-13 · Las listas de `/admin/maestros` se paginan con "Cargar más"**, 20 elementos por página y un máximo de 100 por petición (P-02 A). La forma de las tablas de ADMIN la decide ADMIN.
- **S-14 · El resumen del lote se muestra, no se guarda.** El cuadro de texto conserva lo escrito, así el admin puede corregir las líneas inválidas y volver a enviar. Las ya enviadas se reportarán como "ya tenían cuenta".
- **S-15 · Textos de interfaz:** los de este plan son propuesta (§D-A6, §D-B8 y §D-C7), con el tono de `DESIGN.md` §9.

---

## Alcance

### Subentregas
Las tres van en la misma rama. Cada una tiene su programador, su ronda 0 del tester, sus rondas 1 a 3 y la revisión final del manager. **La comprobación humana en navegador se hace una sola vez, al final de 03c** (hoja en "Pasos de implementación").

| Subentrega | Puntos del encargo | Contenido | Carril y motivo | Base de "No se toca" dentro de los paquetes |
|---|---|---|---|---|
| **AUTH-03a** | 1, 4 y 5 | El cambio obligatorio sin la temporal (B-03 B). `POST /auth/invitacion` y el nombre corregible en `/establecer-contrasena`. Login y registro fuera de la caché de mutaciones | **Sensible:** contraseñas y sesiones, `middleware/rutas-publicas.ts` | `<R>` = `53b3126` |
| **AUTH-03b** | 2 | Enlaces de registro: migración `enlaces_registro`, 4 rutas del admin, `POST /auth/registro-maestro`, `/registro-maestro`, `/admin/maestros` (panel de enlaces), `table.tsx`, `badge.tsx` y `EstadoVacio` | **Sensible:** migración, `rutas-publicas.ts`, `adapters/auth`, creación de sesiones | `<Ca>` (commit de 03a) |
| **AUTH-03c** | 3 | Invitación masiva: migración del índice `(tipo, creado_en)`, `POST /admin/maestros/lote`, cupo diario, encolado en lote, ritmo del worker, panel en `/admin/maestros` y `textarea.tsx` | **Sensible:** migración, cola y correo | `<Cb>` (commit de 03b) |

**Fuera de los paquetes** (`docs/`, raíz, `infra/`, `.claude/`), la base de "No se toca" es `<R>` para todo el encargo (`AGENTS.md`, "Commits y cierre de subentregas"). Quedan fuera de la verificación los cambios en `docs/trabajo/AUTH-03-ajustes-de-cuentas/` y en `docs/ESTADO.md`.

Los archivos protegidos que el orquestador cambie con autorización del humano se verifican contra el SHA-256 que anota en `aprobacion.md` ("Bases y hashes"), no contra un commit. Hoy son:
- `AGENTS.md` (cambio de proceso del 2026-09-28);
- los documentos que aplique al cerrar cada subentrega: `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-ESSENTIALS.md`, `CLAUDE.md` y `README.md`.

### Puntos de commit
Hay **tres commits en total**, uno al cerrar cada subentrega, y ninguno intermedio: ni en el plan, ni en la ronda 0, ni en las correcciones. Ningún agente hace commit.

1. **Al cerrar AUTH-03a** (APROBADO del manager tras las rondas del tester) → `<Ca>`.
2. **Al cerrar AUTH-03b** (ídem) → `<Cb>`.
3. **Al cerrar AUTH-03c** (ídem, más la comprobación humana en navegador) → `<Cc>`.

Al cerrar cada subentrega, el orquestador:
1. aplica los textos de documentos de esa subentrega que autorice el humano ("Riesgos y desacuerdos", "Textos literales propuestos") y anota en `aprobacion.md` el SHA-256 de cada archivo protegido que cambió;
2. actualiza `docs/ESTADO.md`;
3. le da al humano un resumen de 15 líneas como máximo y el bloque de comandos listo para copiar (`git status`, `git add` con las rutas y `git commit` con el mensaje);
4. después del commit, lee el hash con `git log` y lo anota en `aprobacion.md`. El humano nunca da un hash.

La subentrega siguiente arranca después de ese commit. La revisión humana del diff no es obligatoria: basta el APROBADO del manager y las rondas del tester.

### Entra
1. `POST /auth/cambiar-contrasena` pide solo `contrasenaNueva` y exige una sesión viva del mismo usuario (filtro previo y decisión bajo el bloqueo). La nueva debe ser distinta de la vigente (la temporal). `/cambiar-contrasena` muestra solo "Contraseña nueva" y "Confirma la contraseña nueva".
2. `POST /auth/invitacion` (pública): con el token de un enlace de invitación vivo, devuelve el nombre de la cuenta. `POST /auth/establecer-contrasena` acepta un `nombre` opcional y lo guarda en la misma transacción que consume el token. `/establecer-contrasena` muestra el nombre y deja corregirlo.
3. `useLogin` y `useRegistro` (y la mutación nueva `useRegistroMaestro`) salen de la caché de mutaciones al asentarse, con `gcTime: 0` (patrón DEC-18 de AUTH-02b).
4. Tabla `enlaces_registro` y columna `usuarios.enlace_registro_id`. El admin genera un enlace (vigencia de 1 a 30 días, 7 por defecto), lo copia una sola vez, lo revoca y ve la lista de enlaces con su estado y cuántos se registraron, y los registrados de cada uno. Registro público de maestro con el enlace, con sesión iniciada.
5. `POST /admin/maestros/lote`: análisis de la lista, "ya tenían cuenta", inválidas, cupo diario, cuentas y tokens en una transacción y un solo `insert` de pg-boss. Ritmo mínimo entre correos en el worker (250 ms).
6. Componentes compartidos nuevos: `table.tsx`, `badge.tsx`, `textarea.tsx`, `EstadoVacio` (`components/estado-vacio.tsx`), y `lib/cache-de-mutaciones.ts` (sube de `features/auth/hooks.ts`, porque ahora lo usan dos módulos; regla 5 de `CLAUDE.md`).
7. Los patrones visuales nuevos, documentados en `docs/DESIGN.md` en la misma subentrega (§D-B9, §D-C8).
8. Textos literales propuestos para `ARCHITECTURE.md` §6, §7 y §14 (más §8, §9 y §18 en lo mínimo), ESSENTIALS y `CLAUDE.md`, en "Riesgos y desacuerdos". El orquestador los aplica al cerrar cada subentrega, con autorización del humano.

### No entra
- RF-57 (buscador de usuarios) y RF-58 (editar el nombre de cualquier usuario): son de ADMIN.
- El cambio voluntario de contraseña desde el perfil (con la actual): no hay perfil.
- Reenviar una invitación, listar invitaciones pendientes, dar de baja cuentas creadas con un enlace: son de ADMIN.
- Guardar el límite diario en `configuracion` o editarlo desde la interfaz (RF-56): va en una variable de entorno.
- Rebotes de Resend y el cupo de los correos de aviso: no existen todavía; queda anotado para NOTIFICACIONES (R-05).
- Los pendientes de ADMIN que viven en `/admin` (tarjetas a mano, `fichaDe`, `role="status"` de la temporal, etc.): `cuentas-view.tsx` y sus componentes no se tocan.
- `campo-contrasena.test.tsx`: P-01 ya está resuelta y ningún agente lo toca.

### Qué autoriza la aprobación de este plan (lista cerrada)
- **Tocar** `backend/src/middleware/rutas-publicas.ts`: en 03a, agregar `"POST /api/auth/invitacion"`; en 03b, agregar `"POST /api/auth/registro-maestro"`. Nada más de `middleware/`, salvo su `README.md`.
- **Crear** `backend/src/adapters/auth/enlaces-registro.ts` (03b). Nada más de `adapters/auth` cambia, salvo la línea de reexportación en `adapters/auth/index.ts`.
- **Dos migraciones**, cada una con un único `npx prisma migrate dev --create-only --name <nombre>`, revisión del SQL contra §D-B2 o §D-C2, y un único `npx prisma migrate dev` que la aplica en `campus_dev`: `enlaces_registro` (03b) y `tokens_cuenta_tipo_creado_en` (03c). Si la aplicación falla, se corrige el SQL de esa misma carpeta; nunca se crea una segunda carpeta para tapar la primera.
- **Comandos de solo lectura de Prisma:** `validate`, `format --check`, `generate`, `migrate status` y `migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`.
- **Prohibido:** `migrate reset`, `migrate resolve`, `db push`, `db pull`, `db execute`, `migrate deploy` a mano, editar las migraciones existentes, cualquier escritura manual en `campus_dev`, arrancar la API o el worker, abrir navegadores, instalar dependencias, leer o imprimir cualquier `.env`.

---

## Diseño

### AUTH-03a

#### §D-A1 · `POST /auth/cambiar-contrasena` sin la temporal (RF-04d; B-03 B; M-02)
Cadena sin cambios: `protegido({ permitirCambioPendiente: true, permitirRestringido: true })`, que es `authenticate → withProfile → withPasswordGate(permite el cambio pendiente) → withAccess(permite restringidos) → requireRole([])` → handler.

Flujo del handler (retornos tempranos):
1. `evaluarCambioSolicitado(perfil)`: sin la bandera, `409 CAMBIO_NO_REQUERIDO` (sin cambios).
2. `validarCuerpo(cambiarContrasenaSchema)`: el esquema es `{ contrasenaNueva }`. Si un cliente viejo manda `contrasenaActual`, zod la descarta en silencio (compatibilidad hacia atrás).
3. **Filtro previo, sin bloqueo (M-02).** Lee la cookie `campus_refresco` → `buscarSesionPorHash`. Si no hay cookie, o la sesión no existe, es de otro usuario, está revocada, reemplazada o vencida (`estaVivaParaCambio(sesion, perfil.id, ahora)`, función pura de core), responde `401 SESION_INVALIDA` **sin reservar el intento y sin calcular argon2**. Si pasa, `sesionId` es el id de esa sesión.
4. Reserva en el límite existente, 5 intentos por 15 min por usuario (`reservarIntento`, sin cambios). Si no hay cupo, `429 DEMASIADOS_INTENTOS`. Solo llega aquí quien tiene una sesión viva propia, así que un atacante sin sesión no puede agotar los intentos del usuario legítimo.
5. `buscarCredencialesPorId(perfil.id)`. Si es `null`, `401 SESION_INVALIDA`.
6. `verificarContrasena(hashVigente, contrasenaNueva)`. Si coincide, `400 CONTRASENA_REPETIDA` (`evaluarContrasenaRepetida` de core) y el intento queda contado.
7. Borra la reserva y calcula `hashContrasena(contrasenaNueva)`. Todo argon2 va antes de la transacción.
8. `cambiarContrasenaPropia({ usuarioId, hashContrasena, hashVerificado: hashVigente, sesionId, ahora })` → `"cambiada" | "credencial_cambiada" | "sin_sesion"`. **La decisión definitiva sobre la sesión se toma aquí, bajo el bloqueo:** el filtro del paso 3 no la sustituye, porque entre el paso 3 y el bloqueo la sesión puede rotar o revocarse.
9. `errorDelCambioPropio(resultado)` de core: `"credencial_cambiada"` y `"sin_sesion"` → `401 SESION_INVALIDA` ("Tu sesión terminó. Vuelve a iniciar sesión."); `"cambiada"` → `204`.

**Transacción de `cambiarContrasenaPropia`** (protocolo de bloqueo por usuario, `adapters/README.md`):
- (0) `bloquearUsuarioParaEscribir` (`FOR NO KEY UPDATE`).
- (1) Si el usuario no existe o su hash ya no es `hashVerificado` → `"credencial_cambiada"`, sin escribir.
- (2) Si no existe una sesión con ese `id`, de ese `usuarioId`, con `revocada_en IS NULL`, `reemplazada_por IS NULL` y `expira_en > ahora` → `"sin_sesion"`, sin escribir. Es una lectura por PK.
- (3) Actualiza `hash_contrasena` y pone `debe_cambiar_contrasena = false`; revoca las demás sesiones vivas del usuario (`id <> sesionId`) y todos sus tokens de cuenta vivos → `"cambiada"`.

**Por qué funciona:** `restablecerConTemporal` revoca todas las sesiones bajo el mismo bloqueo. Una sesión viva al tomar el bloqueo nació de un login con la contraseña vigente (la temporal), posterior al restablecimiento, o de rotar esa sesión. Un token de acceso anterior al restablecimiento no tiene sesión viva que lo acompañe, salvo en el mismo navegador donde luego se entró con la temporal (R-15).

**El frontend no cambia su manejo:** ante un `401` en esta ruta, `apiClient` refresca y reintenta una sola vez (DEC-17). Si otra pestaña rotó la sesión, el refresco trae la cookie nueva y el reintento responde 204. Si el refresco falla, lleva a `/login`.

#### §D-A2 · Nombre al establecer la contraseña (RF-04b)
- **`POST /auth/invitacion`** (pública; se agrega a `RUTAS_PUBLICAS`):
  - Entrada: cuerpo `{ token }` (`datosDeInvitacionSchema`).
  - `buscarInvitacionPorHash(hashTokenDeCuenta(token))` y `decidirUsoDeToken({ tipoEsperado: "invitacion" })`, sin cambios en core.
  - Válido → `200 { nombre }`, con `Cache-Control: no-store`.
  - Inexistente, de otro tipo, usado, revocado, vencido o de una cuenta inactiva → `400 ENLACE_INVALIDO`, el mismo mensaje de hoy.
  - No escribe nada ni encola nada. No devuelve el correo, el rol ni el id.
- **`POST /auth/establecer-contrasena`:**
  - El cuerpo es `establecerContrasenaSchema = { token, contrasena, nombre? }`, donde `nombre` es `nombreSchema` opcional.
  - Un nombre inválido responde `400 VALIDACION` antes de tocar el token: el enlace sigue vivo.
  - Con `nombre`, core lo prepara (`prepararNombre` → `{ nombre, nombreBusqueda }`) y `usarTokenYCambiarContrasena` lo escribe en el mismo `UPDATE usuarios` del paso (3) de DEC-08, bajo el mismo bloqueo `FOR NO KEY UPDATE`. No hay subida de modo: `nombre` no es una columna clave.
  - Sin `nombre` (un cliente viejo), el nombre no cambia.
- **`POST /auth/restablecer`** sigue con `nuevaContrasenaConTokenSchema`. Si llega un `nombre`, zod lo descarta: la recuperación nunca cambia el nombre.
- **Frontend** (`/establecer-contrasena`):
  - Con token, `useDatosDeInvitacion(token)` pide `POST /api/auth/invitacion`. Estados en el orden obligatorio:
    - error `ENLACE_INVALIDO` → `EnlaceInvalido`;
    - cualquier otro error → `MensajeError`;
    - cargando → `Cargando`;
    - datos → el formulario, con "Nombre completo" prellenado (`defaultValue`), la ayuda "Así te verán tus alumnos. Corrígelo si hace falta.", "Contraseña nueva" y "Confirma la contraseña nueva".
  - La consulta usa la clave fija `["datos-de-invitacion"]`, **sin el token**; `gcTime: 0`, `staleTime: Infinity`, `retry: false` y `refetchOnWindowFocus: false`. El token no entra en la clave, en `meta` ni en `data` (lo verifica una prueba).
  - Al enviar, la mutación manda `{ token, contrasena, nombre }` y sale de la caché al asentarse (patrón existente).

#### §D-A3 · Login y registro fuera de la caché de mutaciones (MF-05)
- `useLogin` y `useRegistro` reciben un `mutationKey` propio (`["login"]` y `["registro"]`), `onSettled: () => sacarDeLaCacheAlAsentar(queryClient, clave)` y `gcTime: 0`, igual que `useNuevaContrasena` y `useCambiarContrasena`.
- `onSuccess` sigue navegando como hoy.
- Después de un éxito o de un error, ninguna mutación de la caché conserva la contraseña.

#### §D-A4 · Cambios de comportamiento de 03a y ronda 0 del tester
La ronda 0 no cuenta en el tope de 3. El tester reescribe los casos `*.ataque` que **contradicen** estos cambios, sin cambiar lo que protegen:

| # | Cambio | Casos que lo contradicen hoy (inventario del arquitecto, revisado por el manager; el tester lo completa con su propia búsqueda) |
|---|---|---|
| C-1 | `cambiar-contrasena` ignora `contrasenaActual`; ya no emite `CONTRASENA_ACTUAL_INCORRECTA` | `backend/test/cuentas-r1.ataque.test.ts:444` (5 temporales incorrectas → 429): pasa a 5 `CONTRASENA_REPETIDA` y la 6.ª válida → 429, con la bandera intacta. **Lleva la cookie del login con la temporal**: sin cookie, el filtro previo respondería 401 sin contar el intento. `logs-cuentas-r1.ataque.test.ts:198-211` y `:269-270` ("cambiar incorrecta" 400): el paso incorrecto pasa a usar una nueva igual a la temporal (400 `CONTRASENA_REPETIDA`). Esa prueba ya manda la cookie, así que "cambiar" sigue en 204 |
| C-2 | Sin una sesión viva del mismo usuario → `401 SESION_INVALIDA` y nada cambia | `cuentas-r1.ataque.test.ts:382`: la cookie de otro usuario pasa a 401; la sesión ajena sigue viva y las del usuario no se revocan. `:400`: el restringido con bandera debe llevar su cookie para el 204. **`cuentas-r2.ataque.test.ts:228`** ("el cambio obligatorio no deja viva la sesión ajena que un refresco concurrente acaba de rotar") se convierte en esto: el usuario tiene además una sesión propia P (con `crearSesionDePrueba`), y el cambio va con la cookie de P mientras la sesión ajena se rota en paralelo con la fila retenida. Espera 204; después, exactamente 1 sesión viva (P), y la cookie que devolvió el refresco de la ajena no refresca. **Sigue protegiendo** que el cambio revoque todas las sesiones salvo la de quien cambia, incluida la ajena recién rotada (DEC-09). `cuentas-r3.ataque.test.ts:313` pasa a "200 y 401, sin 5xx; la bandera sigue"; `:452` pasa a "401 y 401", con 0 sesiones vivas y la bandera intacta; `:501` pasa a "200 y 401", con la bandera intacta |
| C-3 | `CONTRASENA_REPETIDA` compara con la contraseña vigente por argon2 | Los casos que mandan `contrasenaActual === contrasenaNueva` esperando 400 siguen en 400 si la nueva es igual a la vigente y llevan la cookie de una sesión viva propia. Si no, el tester los ajusta |
| C-4 | Ruta pública nueva `POST /api/auth/invitacion` | `sesiones-y-cadena.ataque.test.ts:430` (lista exacta de rutas): se agrega la ruta. La protección se conserva: ninguna ruta crea administradores; solo `/admin/maestros` crea maestros |
| C-5 | `/cambiar-contrasena` sin el campo "Contraseña temporal" | `frontend/src/app/cuentas-r1.ataque.test.tsx` (`llenarCambio`, `:71`, `:366`), `app/cuentas-r2.ataque.test.tsx:81`, `app/contrasena-r1.ataque.test.tsx` (caso de `/cambiar-contrasena`, `:148-157` y `:469-549`), `app/contrasena-r2.ataque.test.tsx:62-66`, `app/en-espera-r1.ataque.test.tsx:194`, `app/marco-r1.ataque.test.tsx:255`. Los textos "La contraseña temporal no es correcta." (`cuentas-r1:329`) dejan de mostrarse |
| **C-5b (M-01)** | El cambio obligatorio queda con 2 campos de contraseña y `TEXTOS_CAMPO_CONTRASENA` pierde `mostrarTemporal` | `frontend/src/components/layout/estatico-r1.ataque.test.ts`, bloque "DESIGN-01b-2 r0". Tres casos se reescriben en 03a. **(1) `:182`**, "exactamente 7 `<CampoContrasena`… 1, 1, 2 y 3", se convierte en "exactamente 6 `<CampoContrasena`, solo en los 4 formularios: 1, 1, 2 y 2", con `formulario-cambiar-contrasena.tsx: 2` en `porArchivo`. **(2) La `TABLA` (`:154-159`)** pierde la fila `["contrasenaActual", "mostrarTemporal"]`: `formulario-cambiar-contrasena.tsx` queda con `[["contrasenaNueva", "mostrarNueva"], ["confirmacion", "mostrarConfirmacion"]]`. El caso `:195` no cambia su texto y se adapta solo. **(3) `:212-228`**, "exactamente los 4 textos", se convierte en "exactamente los 3 textos": `{ mostrar, mostrarNueva, mostrarConfirmacion }`, sin `mostrarTemporal`. Las dos aserciones de `:229` y `:231` no cambian, y `:247` tampoco en 03a (siguen 4 formularios). **Siguen protegiendo** que todo campo de contraseña pase por `CampoContrasena`, con una constante de `TEXTOS_CAMPO_CONTRASENA` por campo y en su orden, sin `type` ni `aria-label`, solo en los formularios listados; y que los nombres del botón vivan solo en `features/auth/data.ts` |
| C-6 | `/establecer-contrasena` pide `POST /api/auth/invitacion` al montar. Mientras llega, muestra `Cargando`; con `ENLACE_INVALIDO`, el enlace inválido; con datos, el formulario con "Nombre completo" | `features/auth/enlace-r1.ataque.test.tsx` y `enlace-r2.ataque.test.tsx` (los `stubFetch` que responden igual a toda ruta, en particular `enlace-r1:299`), y cualquier `*.ataque` que monte `/establecer-contrasena` con token (`app/contrasena-r1`, `app/en-espera-r1`, `app/fondo-r1`, `app/contexto-r1`: el tester lo comprueba) |
| C-7 | Login y registro fuera de la caché | Ninguno: es más estricto. Si alguna prueba afirma que la mutación sigue en la caché, es un hallazgo |

**Al terminar la ronda 0:** los casos reescritos quedan **en rojo** hasta que el programador termine, y ninguno más. El tester publica en `reporte-tester.md` la lista exacta de casos en rojo esperados (archivo, línea, título y C-n) y la tabla de hashes de todas las `*.ataque`.

#### §D-A5 · Datos
03a no tiene migración. Lee `usuarios` (PK), `sesiones` (`hash_token` único y PK) y `tokens_cuenta` (`hash_token` único). Escribe, en transacción, `usuarios`, `sesiones` y `tokens_cuenta`, como hoy. No encola eventos.

#### §D-A6 · Textos (propuesta)
- `TEXTOS_CAMBIAR`: se quita `contrasenaActual`. Los demás no cambian ("Cambia tu contraseña", "Entraste con una contraseña temporal. Elige una propia para continuar.", "Contraseña nueva", "Mínimo 10 caracteres", "Confirma la contraseña nueva", "Guardar y continuar", "Cerrar sesión").
- `TEXTOS_CAMPO_CONTRASENA.mostrarTemporal`: se retira, porque ya no hay campo (C-5b).
- `MENSAJES_ERROR_AUTH` agrega `SESION_INVALIDA: "Tu sesión terminó. Vuelve a iniciar sesión."`. `CONTRASENA_ACTUAL_INCORRECTA` se conserva para respuestas de un backend anterior durante un despliegue escalonado.
- `TEXTOS_NUEVA_CONTRASENA.invitacion` agrega `nombre: "Nombre completo"` y `ayudaNombre: "Así te verán tus alumnos. Corrígelo si hace falta."`.

### AUTH-03b

#### §D-B1 · Modelo
- **`enlaces_registro`:** `id` (uuid), `hash_token` (SHA-256 hex del token, único), `expira_en`, `revocado_en` (nulo), `creado_en` y `actualizado_en`. Índice `(creado_en DESC, id DESC)` para la lista.
- **`usuarios.enlace_registro_id`:** uuid nulo, FK a `enlaces_registro(id)` con `ON DELETE RESTRICT` (un enlace con registrados no se puede borrar; hoy nadie borra enlaces). Índice `(enlace_registro_id, creado_en)` para los registrados y su conteo.
- **Estado derivado**, nunca guardado: `revocado` si `revocado_en` no es nulo; si no, `vencido` si `expira_en <= ahora`; si no, `vigente`. Es la función pura `estadoDeEnlace` de core.

#### §D-B2 · Migración `enlaces_registro` (compatible hacia atrás)
El SQL que genera `--create-only` debe contener **solo** esto (salvo nombres de restricciones o índices que genere Prisma):
```sql
CREATE TABLE "enlaces_registro" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "hash_token" TEXT NOT NULL,
  "expira_en" TIMESTAMPTZ(3) NOT NULL,
  "revocado_en" TIMESTAMPTZ(3),
  "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enlaces_registro_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "enlaces_registro_hash_token_key" ON "enlaces_registro"("hash_token");
CREATE INDEX "enlaces_registro_creado_en_id_idx" ON "enlaces_registro"("creado_en" DESC, "id" DESC);
ALTER TABLE "usuarios" ADD COLUMN "enlace_registro_id" UUID;
CREATE INDEX "usuarios_enlace_registro_id_creado_en_idx" ON "usuarios"("enlace_registro_id", "creado_en");
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_enlace_registro_id_fkey"
  FOREIGN KEY ("enlace_registro_id") REFERENCES "enlaces_registro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```
**Compatibilidad:** la columna nueva es nula y sin valor por defecto (en PostgreSQL 17, `ADD COLUMN` sin `DEFAULT` no reescribe la tabla). El código anterior la ignora. No hay ningún `DROP` ni `ALTER` de columnas existentes.

En `schema.prisma`:
- modelo `EnlaceRegistro` con `@@map("enlaces_registro")` e `@@index([creadoEn(sort: Desc), id(sort: Desc)])`;
- en `Usuario`, `enlaceRegistroId String? @map("enlace_registro_id") @db.Uuid`, la relación con `onDelete: Restrict` y `@@index([enlaceRegistroId, creadoEn])`.

#### §D-B3 · Token del enlace
`generarTokenDeEnlace()` (en `adapters/auth/enlaces-registro.ts`) devuelve 32 bytes aleatorios en base64url (43 caracteres, la misma forma que valida `leerTokenDelFragmento`) y `hash` = SHA-256 hex. `hashTokenDeEnlace(token)` calcula lo mismo para buscar. El token solo existe en la respuesta de `POST /admin/enlaces-registro`, con `Cache-Control: no-store`. Nunca va a la base, a un log ni a la cola.

El frontend compone el enlace como `${window.location.origin}/registro-maestro#token=${token}` (`construirUrlDeRegistro(origen, token)` en `features/admin/lib.ts`). El token va en el fragmento, así que no llega a ningún servidor ni a `Referer` (DEC-14 de AUTH-02). La API no necesita conocer la URL pública del frontend.

#### §D-B4 · Rutas del admin (prefijo `/api/admin`, todas con `protegido({ roles: ["admin"] })`)
| Ruta | Entrada | Respuesta | Notas |
|---|---|---|---|
| `POST /enlaces-registro` | `{ vigenciaDias? }`, entero de 1 a 30, 7 por defecto (N-02) | `201 { enlace, token }` + `no-store` | `enlace = { id, creadoEn, expiraEn, revocadoEn: null, estado: "vigente", registrados: 0 }` |
| `GET /enlaces-registro?cursor=&limite=` | `cursor` uuid opcional; `limite` de 1 a 100, 20 por defecto | `200 { enlaces: EnlaceRegistroAdmin[], siguienteCursor: uuid \| null }` | Orden `creado_en DESC, id DESC`. `registrados` sale de un solo `groupBy` sobre los ids de la página |
| `POST /enlaces-registro/:id/revocar` | `:id` uuid | `200 { enlace }`; `404 ENLACE_NO_ENCONTRADO` | Idempotente: revocar un enlace ya revocado responde 200 y conserva su `revocado_en` original |
| `GET /enlaces-registro/:id/registrados?cursor=&limite=` | ídem | `200 { registrados: { id, nombre, email, creadoEn }[], siguienteCursor }`; `404 ENLACE_NO_ENCONTRADO` | Orden `creado_en ASC, id ASC`. Sin `estadoPago`, `rol`, `activo` ni ningún otro campo |

Las consultas se validan con `validarParametros` (sirve para cualquier objeto) y el esquema `paginacionSchema` de `shared/`.

#### §D-B5 · `POST /api/auth/registro-maestro` (pública; se agrega a `RUTAS_PUBLICAS`)
- Plugin nuevo `handlers/auth/registro-maestro.ts`, registrado en `app.ts` con `{ prefix: "/api/auth", env }`, porque pone la cookie como `/auth/registro`. `handlers/auth/index.ts` y `cookie.ts` no se tocan: solo se importa `ponerCookieRefresco`.
- Cuerpo: `registroMaestroSchema = registroSchema.extend({ token: tokenDeEnlaceSchema })`. `rol`, `enlaceRegistroId` y cualquier otro campo extra se descartan.
- Flujo:
  1. `buscarEnlacePorHash(hashTokenDeEnlace(token))` y `decidirUsoDeEnlace(enlace, ahora)` (core). Si no es válido, `400 ENLACE_INVALIDO` ("El enlace de registro no es válido, ya venció o fue revocado. Pide uno nuevo a administración.").
  2. `prepararRegistro`, `hashContrasena` y `generarTokenRefresco`, todo antes de la transacción.
  3. `registrarMaestroConEnlace({ enlaceId, usuario: { ..., rol: "maestro", enlaceRegistroId }, sesion, ahora })`. Transacción:
     - `SELECT id FROM enlaces_registro WHERE id = $1 AND revocado_en IS NULL AND expira_en > $2 FOR SHARE` (SQL etiquetado con `$queryRaw`). Si no hay fila, devuelve `null` sin escribir.
     - `crearUsuario(tx)`. Un `P2002` se traduce a `409 CORREO_EN_USO` y se relanza, sin atraparlo para seguir (E-02 de AUTH-02).
     - `tx.sesion.create`.

     La transacción crea al usuario, así que el protocolo de bloqueo por usuario no aplica (`adapters/README.md`, "Quedan fuera").
  4. `null` → `400 ENLACE_INVALIDO`. Si no, `firmarTokenAcceso`, `ponerCookieRefresco` y `201 { tokenAcceso }`, como el registro de estudiante.
- **Revocación frente a registro:** `revocarEnlaceRegistro` hace `UPDATE enlaces_registro SET revocado_en = $ahora WHERE id = $1 AND revocado_en IS NULL`. Esa sentencia toma `FOR NO KEY UPDATE` sobre la fila, que choca con el `FOR SHARE` del registro:
  - un registro que ya tenía la fila confirma antes de que la revocación responda;
  - un registro que llega después ve `revocado_en` y responde 400.

  Ningún registro confirma después de que la revocación respondió. El `FOR KEY SHARE` que toma la FK al insertar el usuario no choca con el `UPDATE` de la revocación; por eso hace falta el `FOR SHARE` explícito.

#### §D-B6 · Frontend de 03b
- **Ruta pública `/registro-maestro`** (en `LayoutPublico`), vista `RegistroMaestroView`:
  - token con `useTokenDelEnlace()` (sin cambios);
  - sin token → mensaje de enlace inválido;
  - con token → `FormularioRegistroMaestro`: "Nombre completo" (`autoComplete="name"`), "Correo" (`autoComplete="email"`) y "Contraseña" (`CampoContrasena`, `id="contrasena"`, `new-password`, `nombreDelBoton={TEXTOS_CAMPO_CONTRASENA.mostrar}`);
  - con `ENLACE_INVALIDO` → el mensaje de enlace inválido en lugar del formulario;
  - con éxito → `/maestro` (`rutaTrasLogin`).
  - `useRegistroMaestro` sigue el patrón de §D-A3.
  - `services/authService.ts` agrega `registroMaestro(datos)`, gemela de `registro`. `services/apiClient.ts` agrega `"/registro-maestro"` a `RUTAS_SIN_SESION`.
- **`EstadoVacio`** (M-05, M-10), en `components/estado-vacio.tsx`. Su primer uso es este encargo.
  - Props: `titulo` (obligatorio), `descripcion?` y `accion?: { texto: string; onClick: () => void; variante: "primary" | "outline" }`.
  - La variante la decide quien lo usa, sin valor por defecto dentro del componente. `DESIGN.md` §7.10 pide `primary` cuando es la única acción de la vista y `outline` si no; en `/admin/maestros` es `outline`, porque la vista ya tiene su acción principal.
  - Sin ilustraciones.
- **`/admin/maestros`** (hija de la ruta `/admin`, dentro de `RequireRol rol="admin"`), vista `MaestrosView` con el título "Maestros". En 03b trae el panel "Enlaces de registro":
  1. `FormularioGenerarEnlace`:
     - "Vigencia en días", `Input type="number"` de 1 a 30, 7 por defecto, `autoComplete="off"`, error con `ErrorDeCampo`;
     - botón **"Generar enlace"** con `enEspera`. Es `primary` en 03b y pasa a `outline` en 03c, cuando la acción principal es "Enviar invitaciones".
  2. `EnlaceNuevo`, visible solo mientras el componente siga montado:
     - la URL como texto seleccionable;
     - "Vence el \<fecha\>" (`formatearFechaHora`);
     - el aviso "Cópialo ahora: no se volverá a mostrar. Si lo pierdes, revócalo y genera otro.";
     - el botón "Copiar enlace" (`try/catch/finally` y `toast`).

     Al mostrarse, el foco va a "Copiar enlace" solo si `focoDisponiblePara(...)` (`features/admin/lib.ts`, T-14): nunca le roba el foco a otro campo. `useGenerarEnlace` usa `gcTime: 0` y sale de la caché al asentarse. El componente copia `{ url, expiraEn }` a su estado local en el `onSuccess` de la llamada.
  3. `TablaEnlaces` (`components/ui/table.tsx`), con `useInfiniteQuery(["admin", "enlaces-registro"])`:
     - columnas "Creado", "Vence", "Estado" (insignia con texto: Vigente, Vencido o Revocado), "Registrados" (cifra tabular, a la derecha) y "Acciones";
     - "Ver registrados" / "Ocultar registrados" (con `aria-expanded`) abre, debajo de la fila, `RegistradosDelEnlace`:
       - una tabla con "Nombre", "Correo" y "Registro", y "Cargar más";
       - su vacío es `EstadoVacio` con el título "Nadie se ha registrado con este enlace", **sin acción**, porque dentro de una fila expandida no hay nada que hacer. Es la excepción que documenta `DESIGN.md` §7.10 (§D-B9);
     - "Revocar", solo en los vigentes, abre una confirmación **en línea** (sin diálogo, como la del restablecimiento): "Quien tenga este enlace ya no podrá registrarse. Las cuentas ya creadas no cambian.", con "Sí, revocar" (`destructive`, `enEspera`) y "Cancelar";
     - al revocar, se invalida la consulta de la lista;
     - "Cargar más enlaces" al pie;
     - vacío: `EstadoVacio` con el título "Aún no has generado enlaces de registro", la frase "Genera uno y compártelo con los maestros que quieras dar de alta." y la acción **"Generar el primer enlace"** (`variante: "outline"`), que lleva el foco al campo "Vigencia en días" del formulario de arriba. El texto es distinto de "Generar enlace" para que no haya dos botones con el mismo nombre en la vista;
     - estados en el orden error → carga → vacío → datos.
- **Barra:** `DESTINOS_POR_ROL.admin` pasa a `[{ etiqueta: "Cuentas", ruta: "/admin", icono: Users }, { etiqueta: "Maestros", ruta: "/admin/maestros", icono: UserPlus }]`. `NavLink` ya usa `end`, así que "Cuentas" no queda activa en `/admin/maestros`.
- **`lib/cache-de-mutaciones.ts`** (nuevo): `sacarDeLaCacheAlAsentar(queryClient, mutationKey)`, movida tal cual desde `features/auth/hooks.ts`, que ahora la importa. La usan `auth` y `admin`.

#### §D-B7 · Cambios de comportamiento de 03b y ronda 0
| # | Cambio | Casos que lo contradicen hoy |
|---|---|---|
| C-8 | Rutas nuevas: `POST /api/auth/registro-maestro`, `GET/HEAD/POST /api/admin/enlaces-registro`, `POST /api/admin/enlaces-registro/:id/revocar` y `GET/HEAD /api/admin/enlaces-registro/:id/registrados` | `sesiones-y-cadena.ataque.test.ts:430`: se agregan. **Lo que protege se reformula** sin debilitarse: ninguna ruta crea administradores; solo `POST /api/admin/maestros` (admin) y `POST /api/auth/registro-maestro` (con un enlace vivo del admin) crean maestros, y la segunda nunca crea otro rol |
| C-9 | El admin tiene dos destinos en la barra | `frontend/src/app/marco-r1.ataque.test.tsx:290-319` ("un solo destino"): para el admin pasa a `["/admin", "/admin/maestros"]` y `["Cuentas", "Maestros"]`, con `aria-current` solo en el de la ruta actual |
| C-10 | `sacarDeLaCacheAlAsentar` se mueve a `lib/` | Ninguno previsto (las pruebas miran la caché, no el módulo) |
| **C-14 (M-01)** | Un quinto formulario con un campo de contraseña: `formulario-registro-maestro.tsx` (`id="contrasena"`, `mostrar`) | `frontend/src/components/layout/estatico-r1.ataque.test.ts`, con los textos que dejó la ronda 0 de 03a. Tres casos se reescriben en 03b. **(1) `:182`**, "exactamente 6… 1, 1, 2 y 2", se convierte en "exactamente 7 `<CampoContrasena`, solo en los 5 formularios: 1, 1, 2, 2 y 1", con `formulario-registro-maestro.tsx: 1` en `porArchivo`. **(2) La `TABLA`** suma la fila `"/src/features/auth/components/formulario-registro-maestro.tsx": [["contrasena", "mostrar"]]`, insertada en orden alfabético de la clave (antes de `formulario-registro.tsx`), porque `:247` compara con `rutasCon`, que devuelve la lista ordenada. **(3) `:247`** (`<CampoContrasena` o `./campo-contrasena` solo en los formularios de la `TABLA`) no cambia su texto y queda igual a las 5 claves. El caso de los 3 textos de `TEXTOS_CAMPO_CONTRASENA` no cambia, porque el formulario nuevo usa `mostrar`. **Siguen protegiendo** lo mismo que en C-5b, ahora con el formulario nuevo dentro de la lista |

#### §D-B8 · Textos de 03b (propuesta)
- `TEXTOS_REGISTRO_MAESTRO`:
  - `titulo`: "Crea tu cuenta de maestro"
  - `subtitulo`: "Administración te compartió este enlace. Escribe bien tu correo: con él vas a iniciar sesión."
  - `nombre`, `correo` y `contrasena`, como en el registro
  - `ayudaContrasena`: "Mínimo 10 caracteres"
  - `crear`: "Crear mi cuenta"
  - `tituloError`: "No pudimos crear tu cuenta"
  - `enlaceInvalido`: "Este enlace de registro no es válido, ya venció o fue revocado. Pide uno nuevo a administración."
- `TEXTOS_MAESTROS`:
  - `titulo`: "Maestros"
  - `notaProvisional`: "Pantalla provisional: la gestión completa de usuarios llega después."
  - `enlaces`: el título "Enlaces de registro", la descripción "Quien tenga el enlace puede crear su cuenta de maestro hasta que venza o lo revoques." y los textos de §D-B6, incluidos los dos vacíos
  - `estados`: `{ vigente: "Vigente", vencido: "Vencido", revocado: "Revocado" }`
- `MENSAJES_ERROR_ADMIN` agrega `ENLACE_NO_ENCONTRADO: "Ese enlace ya no existe."`.

#### §D-B9 · `docs/DESIGN.md` (lo edita el programador de 03b, a mano, marcado como **propuesta**)
- **§7.1**, tabla de alcance: `/registro-maestro` en "Demás pantallas" (orbes quietos, vidrio) y `/admin/maestros` en la fila del administrador (opacas).
- **§7.4**, "Destinos de hoy": el admin tiene "Cuentas" (`/admin`) y "Maestros" (`/admin/maestros`).
- **§7.8**, implementación de la insignia en `components/ui/badge.tsx`:
  - variantes `success`, `warning`, `danger` y `muted`, con fondo `*-soft` sólido, texto en el color del estado y un icono opcional de 14 px;
  - filas nuevas: Vigente (success, `CircleCheck`), Vencido (muted, `Clock`) y Revocado (danger, `Ban`).
- **§7.9**, implementación en `components/ui/table.tsx`: contenedor con desplazamiento horizontal propio, encabezado `--muted` y filas de 40 px. "Cargar más" como forma de paginar **solo en `/admin/maestros`** (P-02 A); la forma de la tabla de usuarios la decide ADMIN.
- **§7.10**, vacío: `EstadoVacio` construido (`components/estado-vacio.tsx`), con título, frase opcional y acción opcional. La variante de la acción la pasa quien lo usa (`primary` si es la única acción de la vista, `outline` si no). **Excepción:** un vacío dentro de una fila expandida de una tabla (los registrados de un enlace) lleva solo el título, sin acción, porque ahí no hay nada que hacer.
- **§7.13 nueva, "Dato que se muestra una sola vez"** (contraseña temporal y enlace de registro):
  - bloque sólido `--muted` con `--radius-row`;
  - el dato en `--text-h3` 700 y el aviso en `--text-small` `--muted-foreground`;
  - el botón "Copiar" en `outline`;
  - el foco pasa a "Copiar" solo si nadie más lo tiene (`focoDisponiblePara`);
  - el dato vive solo en el estado del componente.
- **§7.14 nueva, "Confirmación en línea"**, para acciones irreversibles de bajo alcance (revocar un enlace, restablecer una contraseña):
  - la frase de consecuencia, "Sí, …" en `destructive` con `enEspera` y "Cancelar" en `outline`;
  - el diálogo queda para las acciones de la lista de `CLAUDE.md` (restringir, dar de baja, cambio masivo de pago).
- **§7.3**, campo de contraseña: la lista de nombres confirmados deja "Mostrar contraseña temporal" con la nota "(retirado en AUTH-03a: el cambio obligatorio ya no pide la temporal)". Esta línea la edita el programador de **03a**.

### AUTH-03c

#### §D-C1 · Análisis de la lista (core, puro)
`analizarListaDeInvitaciones(texto)` → `{ candidatos: { linea, email, nombre: string | null }[], invalidas: { linea, texto, motivo }[] }`. Para cada línea, con `linea` numerada desde 1 contando también las vacías:
1. Se recorta. Una línea vacía se ignora: no cuenta ni se reporta.
2. Separador: el tabulador si la línea tiene uno; si no, `;`; si no, `,`; si no, ninguno.
3. Sin separador, toda la línea es el correo y `nombre = null`.
4. Con separador:
   - si lo que va antes del **primer** separador pasa `correoSchema`, ese es el correo y el nombre es lo que sigue;
   - si no, si lo que va después del **último** separador pasa `correoSchema`, ese es el correo y el nombre es lo anterior;
   - si ninguna de las dos pasa, la línea es inválida con `correo_invalido`.

   Así, "juan@x.mx, Pérez, Juan" y "Pérez, Juan, juan@x.mx" funcionan.
5. Un nombre recortado y vacío pasa a `null`. Un nombre presente que no pasa `nombreSchema` → `nombre_invalido`.
6. El correo se normaliza (`normalizarCorreo`). Si ya salió en una línea anterior → `repetido`.
7. `texto` es la línea recortada, con un máximo de 200 caracteres.

`nombreProvisionalDe(email)` (B-02 A; M-07 y M-12) **siempre devuelve un valor ya analizado por `nombreSchema`**: el `data` de su `safeParse`, recortado, nunca el texto de entrada. Prueba en este orden y devuelve el primero que pase:
1. la parte local del correo, recortada a 120 caracteres;
2. el correo completo, recortado a 120;
3. el texto fijo `NOMBRE_PROVISIONAL_DE_RESPALDO = "Maestro invitado"`.

`evaluarCupo({ limite, usadas, solicitadas })` devuelve `null` si `solicitadas <= max(0, limite - usadas)`. Si no, devuelve `AppError("CUPO_DIARIO_INSUFICIENTE", "Hoy solo puedes enviar N invitaciones más. Quita líneas de la lista o inténtalo mañana.", 409)`, donde N es lo que queda.

`shared/`: `invitacionMasivaSchema = { lista: string }`, con un máximo de 40,000 caracteres, al menos una línea con contenido y no más de `LIMITE_LINEAS_INVITACION_MASIVA = 100`. `contarLineasConContenido` también vive en `shared/`; el frontend la usa para su contador.

#### §D-C2 · Migración `tokens_cuenta_tipo_creado_en`
Solo esto:
```sql
CREATE INDEX "tokens_cuenta_tipo_creado_en_idx" ON "tokens_cuenta"("tipo", "creado_en");
```
En `schema.prisma`, `@@index([tipo, creadoEn])` en `TokenCuenta`. Es compatible porque solo agrega un índice. Con el volumen de `tokens_cuenta` no hace falta `CONCURRENTLY`, y Prisma no lo genera.

#### §D-C3 · `POST /api/admin/maestros/lote` (`protegido({ roles: ["admin"] })`)
1. `validarCuerpo(invitacionMasivaSchema)` y `analizarListaDeInvitaciones`.
2. Si no hay candidatos → `200 { enviadas: [], yaExistentes: [], invalidas }`, sin transacción.
3. Todo antes de la transacción:
   - `prepararRegistro` de cada candidato, con `nombre ?? nombreProvisionalDe(email)`;
   - **un** `hashDeContrasenaInutilizable()` para todo el lote (S-11);
   - por candidato, un `usuarioId` y un `tokenId` (`randomUUID`) y `derivarTokenDeCuenta(tokenId).hash`;
   - `expiraEn = calcularExpiracionToken("invitacion", ahora)`.
4. `invitarMaestrosEnLote({ candidatos, desde: ahora - 24 h }, evaluarCupoDelLote, alGuardar)`. Transacción, en este orden:
   1. **Bloqueo consultivo (M-04):** `await tx.$executeRaw\`SELECT pg_advisory_xact_lock(${CLAVE_BLOQUEO_INVITACIONES_EN_LOTE})\``. La clave es una constante bigint de `adapters/db/invitaciones.ts`, de uso único en el proyecto. El bloqueo deja en serie dos lotes simultáneos.
      - Se usa `$executeRaw` porque la función devuelve `void`, y `$queryRaw` podría fallar al leer esa columna.
      - **Alternativa autorizada, sin parada:** si Prisma rechaza esa forma, `await tx.$queryRaw\`SELECT pg_advisory_xact_lock(${CLAVE})::text\``. El programador reporta cuál usó.
   2. `count` de `tokens_cuenta` con `tipo = 'invitacion'` y `creado_en >= desde` (índice nuevo).
   3. `findMany` de `usuarios` con `email IN (...)` (índice único de `email`) → existentes.
   4. `nuevos = candidatos − existentes`. Si `evaluarCupoDelLote(usadas, nuevos.length)` devuelve un error, se lanza y la transacción revierte sin haber escrito nada.
   5. `usuario.createMany({ data: nuevos, skipDuplicates: true })`.
   6. `usuario.findMany({ where: { id: { in: idsDeNuevos } }, select: { id, email } })` (PK) → insertados. Un correo que otra transacción creó entre el paso 3 y el 5 no se inserta y se reporta como ya existente, sin atrapar ningún `P2002` (N-04 de AUTH-02).
   7. `tokenCuenta.createMany` con los tokens de los insertados.
   8. `alGuardar(ejecutorSqlDe(tx), idsDeTokens)` → `encolarVarios(COLA_CORREO_DE_CUENTA, ids.map((id) => ({ id, datos: { tipo: "invitacion" } })), { sql })`, que llama a `boss.insert(nombre, trabajos, { db: sql })`. Es una sola sentencia con los trabajos como un parámetro JSON. Si no hay insertados, no se encola nada.

   Crea los usuarios en la misma transacción, así que el protocolo por usuario no aplica.
5. Respuesta `200`:
   - `enviadas`: `{ email, nombre }[]`, las insertadas en orden de línea, con `nombre: null` si era provisional;
   - `yaExistentes`: `{ linea, email }[]`;
   - `invalidas`: `{ linea, texto, motivo }[]`, con `motivo` en `correo_invalido | nombre_invalido | repetido`.

   Sin `estadoPago` ni ids.
6. El worker envía cada invitación como hoy (`procesarCorreoDeCuenta`, sin cambios): el id del trabajo es el del token.

`INVITACIONES_LIMITE_DIARIO` (`config/env.ts`, entero de 1 a 10,000, **80** por defecto) llega al handler como opción del plugin: `app.register(adminHandler, { prefix: "/api/admin", limiteDiarioInvitaciones })`.

#### §D-C4 · `encolarVarios` en `adapters/queue`
`encolarVarios(nombre, trabajos: { id, datos }[], { sql })`. Con `sql` es obligatorio: no existe el encolado en lote fuera de una transacción.

**[verificar] (PA-05):**
- que los trabajos insertados heredan la política de la cola: `retry_limit = 3`, `retry_backoff`, `dead_letter = CORREO_DE_CUENTA_FALLIDO` y la retención. El manager lo vio en `plans.js:2071-2079`; la prueba lo confirma leyendo `pgboss.job` con la ayuda de pruebas `buscarTrabajosPorCorreo` o una gemela nueva;
- que una transacción revertida no deja trabajos;
- que el texto del SQL no lleva datos.

Si algo falla, el programador se detiene.

#### §D-C5 · Ritmo del worker (M-06, M-09 y M-12; 250 ms)
`core/correo/ritmo.ts` exporta:
- `INTERVALO_MINIMO_ENTRE_CORREOS_MS = 250` (S-04: Resend admite 10 peticiones por segundo por equipo; 250 ms son 4 por segundo como máximo);
- `esperaAntesDelSiguiente(ultimoIntentoMs: number | null, ahoraMs: number): number` → `0` si no hubo intento o si ya pasó el intervalo; si no, lo que falta (`INTERVALO − (ahora − ultimoIntento)`), acotado entre 0 y el intervalo.

`registrarConsumidores` guarda en su cierre `ultimoIntentoMs`, que empieza en `null`, y envuelve el notifier que recibe:
```ts
const notifierConRitmo: Notifier = {
  correoDeCuenta: async (correo) => {
    try {
      return await deps.notifier.correoDeCuenta(correo)
    } finally {
      ultimoIntentoMs = deps.reloj().getTime()
    }
  },
}
```

Para cada trabajo:
1. espera `esperaAntesDelSiguiente(ultimoIntentoMs, deps.reloj().getTime())` **antes** de procesarlo (M-06);
2. llama a `procesarCorreoDeCuenta({ id, datos }, { ...deps, notifier: notifierConRitmo })`.

Por qué así:
- **M-09.** Cuenta para el ritmo todo intento que llegó al notifier: enviado, rechazado **o lanzado** (un 429 o un 5xx de Resend). El `finally` registra la marca de tiempo y **no atrapa el error**: el error sigue propagándose por `procesarCorreoDeCuenta` y por el manejador, y pg-boss reintenta ese trabajo con su espera exponencial. Así, el trabajo siguiente de la cola también espera, y el worker no insiste más rápido justo cuando el proveedor pide ir más lento.
- **Un omitido no cuenta**, porque nunca llama al notifier.
- `workers/correo-de-cuenta.ts` **no cambia**: el envoltorio va en `workers/index.ts`.
- **M-12.** `deps.reloj()` devuelve un `Date`, así que se usa `.getTime()`.
- **No hay espera después de enviar.** El trabajo termina en cuanto el correo salió, así no se alarga la ventana en la que una caída del worker, con el correo ya enviado, provocaría un reenvío al reintentar.
- `DependenciasCorreoDeCuenta` recibe `esperar?: (ms: number) => Promise<void>`, que por defecto espera de verdad. Es una inyección explícita para las pruebas. `worker.ts` no cambia.

#### §D-C6 · Frontend de 03c
En `/admin/maestros`, arriba del panel de enlaces, va el panel "Invitar a varios maestros":
- `Textarea` "Lista de maestros" (`autoComplete="off"`, `spellCheck={false}`, 10 filas), con la ayuda "Un maestro por línea: su correo y, si quieres, su nombre, separados por coma, punto y coma o tabulador. Hasta 100 líneas." y el ejemplo "ana.lopez@colegio.mx, Ana López".
- Un contador "N de 100 líneas" (`aria-live="polite"`). El error de validación va con `ErrorDeCampo`.
- **"Enviar invitaciones"** (`primary`, `enEspera`); "Generar enlace" pasa a `outline`.
- Con `CUPO_DIARIO_INSUFICIENTE`, `MensajeError` muestra el mensaje del servidor (lleva el número).
- Con éxito, `ResultadoInvitacionMasiva` muestra un encabezado con el resumen en palabras dentro de `role="status"` ("Invitaciones enviadas: 12 · Ya tenían cuenta: 2 · No válidas: 1") y tres grupos, cada uno con encabezado y lista:
  - las enviadas: correo y nombre, o "Sin nombre: podrá escribirlo al activar su cuenta.", con la nota "Cada uno recibirá un correo para elegir su contraseña; el enlace vence en 72 horas.";
  - las que ya tenían cuenta: "Línea N · correo";
  - las no válidas: "Línea N · texto · motivo".

  Un grupo vacío no se muestra.
- `useInvitarEnLote`: mutación sin datos sensibles. No invalida ninguna consulta, porque la masiva no cambia los enlaces.

#### §D-C7 · Textos de 03c (propuesta)
Los de §D-C6, más:
- `motivos`: `{ correo_invalido: "Correo no válido", nombre_invalido: "Nombre no válido", repetido: "Repetido en la lista" }`;
- `MENSAJES_ERROR_ADMIN`: `CUPO_DIARIO_INSUFICIENTE` muestra el mensaje del servidor, como `VALIDACION`.

#### §D-C8 · `docs/DESIGN.md` (programador de 03c, a mano, **propuesta**)
- **§7.3**, "Campo de texto largo" (`components/ui/textarea.tsx`): el mismo borde, fondo, foco y estado inválido que un campo, `--text-body` de 16 px, altura por filas y redimensionable solo en vertical.
- **§7.15 nueva, "Resumen de una acción por lote":**
  - la línea de conteos en palabras, en `role="status"`;
  - después, un grupo por resultado, con un encabezado `--text-small` 700 que lleva su conteo y una lista;
  - sin color como único indicador y sin grupos vacíos.
- **§7.3**, controles: una vista con dos paneles de acción tiene un solo `primary` (en `/admin/maestros`, "Enviar invitaciones").

#### §D-C9 · Cambios de comportamiento de 03c y ronda 0
| # | Cambio | Casos que lo contradicen hoy |
|---|---|---|
| C-11 | Ruta nueva `POST /api/admin/maestros/lote`, que también crea maestros | `sesiones-y-cadena.ataque.test.ts:430`: se agrega. La protección queda así: ninguna ruta crea admins; crean maestros solo `/admin/maestros`, `/admin/maestros/lote` (las dos solo para el admin) y `/auth/registro-maestro` (con un enlace vivo) |
| C-12 | "Generar enlace" pasa a `outline` y aparece un segundo panel en `/admin/maestros` | Las `*.ataque` de 03b sobre `/admin/maestros` que dependan de la variante o del orden del foco: el tester las revisa |
| C-13 | Antes de procesar cada trabajo, el worker espera lo que falte de los 250 ms desde el último intento que llegó al notifier, **incluidos los que lanzaron** (M-09) | Las `*.ataque` del worker que midan tiempos. `worker-r1` no mide tiempos, pero su notifier siempre lanza: ahora cada intento cuenta para el ritmo y los trabajos siguientes esperan hasta 250 ms, muy por debajo de sus esperas de 25 s. El tester lo confirma en la ronda 0 |

---

## Cambios por capa

"Crear" y "Modificar", por subentrega. Todo archivo que no aparece aquí está en "No se toca" (al final de "Pasos de implementación").

### shared/
| Archivo | Sub. | Acción | Contenido |
|---|---|---|---|
| `src/cuentas.ts` | 03a | Modificar | `cambiarContrasenaSchema = z.object({ contrasenaNueva: contrasenaSchema })`; `establecerContrasenaSchema`; `datosDeInvitacionSchema = z.object({ token: tokenDeEnlaceSchema })`; `datosDeInvitacionRespuestaSchema = z.object({ nombre: z.string() })`; tipos `EstablecerContrasena`, `DatosDeInvitacion` y `DatosDeInvitacionRespuesta`. `CONTRASENA_ACTUAL_INCORRECTA` se queda, con el comentario "ya no se emite desde AUTH-03a" |
| `src/cuentas.ts` | 03c | Modificar | `CODIGOS_CUENTAS.CUPO_DIARIO_INSUFICIENTE`; `invitacionMasivaSchema`, `LIMITE_LINEAS_INVITACION_MASIVA`, `contarLineasConContenido`, `motivoLineaInvalidaSchema` e `invitacionMasivaRespuestaSchema`, con sus tipos |
| `src/enlaces-registro.ts` | 03b | Crear | `VIGENCIA_ENLACE_REGISTRO = { minimaDias: 1, maximaDias: 30, porDefectoDias: 7 }`; `crearEnlaceRegistroSchema`; `estadoEnlaceSchema`; `enlaceRegistroAdminSchema`; `crearEnlaceRegistroRespuestaSchema` (`{ enlace, token }`); `paginacionSchema`; `listaEnlacesRegistroRespuestaSchema`; `registradoPorEnlaceSchema`; `listaRegistradosRespuestaSchema`; `enlaceRegistroRespuestaSchema` (`{ enlace }`); `registroMaestroSchema`; `CODIGOS_ENLACES = { ENLACE_NO_ENCONTRADO }`; tipos |
| `src/index.ts` | 03a, 03b, 03c | Modificar | Reexporta lo nuevo |

### backend/core/ (funciones puras, con pruebas unitarias)
| Archivo | Sub. | Firma |
|---|---|---|
| `core/auth/cambio-de-contrasena.ts` (Modificar) | 03a | Se quita `evaluarContrasenaNueva`. Se agregan `evaluarContrasenaRepetida(coincideConLaVigente: boolean): AppError \| null`; `estaVivaParaCambio(sesion: { usuarioId: string; revocadaEn: Date \| null; reemplazadaPor: string \| null; expiraEn: Date } \| null, usuarioId: string, ahora: Date): boolean` (filtro previo, M-02); `type ResultadoCambioPropio = "cambiada" \| "credencial_cambiada" \| "sin_sesion"`; `errorDelCambioPropio(resultado: ResultadoCambioPropio): AppError \| null` |
| `core/auth/normalizacion.ts` (Modificar) | 03a | `prepararNombre(nombre: string): { nombre: string; nombreBusqueda: string }`. `prepararRegistro` la usa por dentro, sin cambiar su resultado |
| `core/auth/enlaces-registro.ts` (Crear) | 03b | `calcularExpiracionEnlace(vigenciaDias: number, ahora: Date): Date`; `type EstadoEnlace = "vigente" \| "vencido" \| "revocado"`; `estadoDeEnlace(e: { expiraEn: Date; revocadoEn: Date \| null }, ahora: Date): EstadoEnlace`; `decidirUsoDeEnlace(e \| null, ahora): { valido: true } \| { valido: false; motivo: "inexistente" \| "vencido" \| "revocado" }` |
| `core/auth/invitacion-masiva.ts` (Crear) | 03c | `analizarListaDeInvitaciones(texto: string): AnalisisDeLista`; `nombreProvisionalDe(email: string): string` (devuelve el `data` de `nombreSchema.safeParse`, M-07 y M-12); `NOMBRE_PROVISIONAL_DE_RESPALDO`; `evaluarCupo({ limite, usadas, solicitadas }: {...numbers}): AppError \| null`; `VENTANA_CUPO_MS = 24 * 3_600_000` |
| `core/correo/ritmo.ts` (Crear) | 03c | `INTERVALO_MINIMO_ENTRE_CORREOS_MS = 250`; `esperaAntesDelSiguiente(ultimoIntentoMs: number \| null, ahoraMs: number): number` |

### backend/adapters/
| Archivo | Sub. | Acción | Contenido |
|---|---|---|---|
| `db/usuarios.ts` | 03a | Modificar | `cambiarContrasenaPropia({ usuarioId, hashContrasena, hashVerificado, sesionId, ahora }): Promise<ResultadoCambioPropio>`, según §D-A1 (el tipo se importa de core). En 03b, `NuevoUsuario` agrega `enlaceRegistroId?: string` |
| `db/tokens-cuenta.ts` | 03a | Modificar | `usarTokenYCambiarContrasena` acepta `nombre?: { nombre: string; nombreBusqueda: string }` y lo agrega al `data` del `UPDATE usuarios` existente. Nueva `buscarInvitacionPorHash(hash): Promise<(TokenParaUso & { usuario: { activo: boolean; nombre: string } }) \| null>` |
| `db/index.ts` | 03a, 03b, 03c | Modificar | Reexporta lo nuevo. No reexporta `obtenerDb` ni las funciones de bloqueo |
| `db/enlaces-registro.ts` | 03b | Crear | `crearEnlaceRegistro({ hashToken, expiraEn })`; `listarEnlacesRegistro({ cursor, limite })`; `buscarEnlacePorHash(hash)`; `buscarEnlacePorId(id)`; `revocarEnlaceRegistro({ id, ahora })` (null si no existe); `listarRegistradosPorEnlace({ enlaceId, cursor, limite })`; `registrarMaestroConEnlace({ enlaceId, usuario, sesion, ahora }): Promise<{ usuarioId: string } \| null>`, con el `FOR SHARE` de §D-B5 en `$queryRaw` etiquetado |
| `db/invitaciones.ts` | 03c | Crear | `CLAVE_BLOQUEO_INVITACIONES_EN_LOTE`; `invitarMaestrosEnLote({ candidatos, desde }, evaluarCupoDelLote: (usadas: number, solicitadas: number) => AppError \| null, alGuardar: (sql: EjecutorSql, idsDeTokens: string[]) => Promise<void>): Promise<{ insertados: { id, email }[]; existentes: string[] }>`, según §D-C3 (bloqueo con `$executeRaw`, M-04) |
| `auth/enlaces-registro.ts` | 03b | Crear | `generarTokenDeEnlace(): { token: string; hash: string }`; `hashTokenDeEnlace(token: string): string` |
| `auth/index.ts` | 03b | Modificar | Solo la línea de reexportación de `./enlaces-registro.js` |
| `queue/index.ts` | 03c | Modificar | `encolarVarios(nombre, trabajos, { sql })` (§D-C4) |
| `README.md` (adapters) | 03b, 03c | Modificar | En "Quedan fuera del protocolo", `registrarMaestroConEnlace` e `invitarMaestrosEnLote`. Una nota del `FOR SHARE` del enlace frente a la revocación y otra del bloqueo consultivo de invitaciones y de `encolarVarios` |

### backend/handlers/ (ruta, método y cadena exacta)
| Ruta | Sub. | Archivo | Cadena |
|---|---|---|---|
| `POST /api/auth/cambiar-contrasena` | 03a | `auth/cuentas.ts` (Modificar) | `authenticate → withProfile → withPasswordGate(permitirCambioPendiente) → withAccess(permitirRestringido) → requireRole([])` → handler (§D-A1) |
| `POST /api/auth/invitacion` | 03a | `auth/cuentas.ts` | Pública (`RUTAS_PUBLICAS`); se autentica con el token del enlace |
| `POST /api/auth/establecer-contrasena` | 03a | `auth/cuentas.ts` | Pública (sin cambio); nuevo esquema con `nombre` opcional |
| `POST /api/auth/registro-maestro` | 03b | `auth/registro-maestro.ts` (Crear) | Pública (`RUTAS_PUBLICAS`); se autentica con el token del enlace de registro |
| `POST /api/admin/enlaces-registro` | 03b | `admin.ts` (Modificar) | `authenticate → withProfile → withPasswordGate → withAccess → requireRole(["admin"])` |
| `GET /api/admin/enlaces-registro` | 03b | `admin.ts` | ídem |
| `POST /api/admin/enlaces-registro/:id/revocar` | 03b | `admin.ts` | ídem |
| `GET /api/admin/enlaces-registro/:id/registrados` | 03b | `admin.ts` | ídem |
| `POST /api/admin/maestros/lote` | 03c | `admin.ts` | ídem |

Otros cambios:
- `middleware/rutas-publicas.ts`: agrega `"POST /api/auth/invitacion"` (03a) y `"POST /api/auth/registro-maestro"` (03b), y actualiza el comentario.
- `app.ts`: registra `registroMaestroHandler` con `{ prefix: "/api/auth", env }` (03b) y pasa `limiteDiarioInvitaciones` a `adminHandler` (03c).
- `handlers/README.md`: la lista de plugins y rutas.
- `middleware/README.md`: la nota de las rutas públicas nuevas.

Ningún handler lleva `try/catch`, verifica roles a mano ni importa `adapters/notifier`.

### backend/workers/
- `workers/index.ts` (03c, Modificar): el ritmo y el envoltorio del notifier de §D-C5.
- `workers/README.md`: el ritmo, con la nota de que cuentan también los intentos que lanzaron.
- `workers/correo-de-cuenta.ts`: **no cambia**.

### backend/prisma/
- 03b: migración `<timestamp>_enlaces_registro` (§D-B2) y `schema.prisma`.
- 03c: migración `<timestamp>_tokens_cuenta_tipo_creado_en` (§D-C2) y `schema.prisma`.

Las dos son compatibles hacia atrás. Detalle en §D-B2 y §D-C2.

### infra/ y .env.example
- `infra/`: sin cambios.
- `backend/src/config/env.ts` (03c): `INVITACIONES_LIMITE_DIARIO: z.coerce.number().int().min(1).max(10_000).default(80)`, con mensaje sin valores. Se actualiza `config/env.test.ts`, que compara el objeto completo.
- `backend/.env.example` (03c): `INVITACIONES_LIMITE_DIARIO=80`, con este comentario: "Cupo de invitaciones de maestro por 24 horas (sueltas y masivas). La masiva se rechaza completa si sus correos nuevos lo rebasan. Resend, plan gratuito: 100 correos por día UTC; deja margen para las recuperaciones de contraseña."

### frontend/
**Compartido**
| Archivo | Sub. | Acción |
|---|---|---|
| `src/lib/cache-de-mutaciones.ts` y `.test.ts` | 03b | Crear (§D-B6) |
| `src/components/estado-vacio.tsx` y su prueba | 03b | Crear (M-05 y M-10, §D-B6) |
| `src/components/ui/table.tsx` y `badge.tsx`, con sus pruebas | 03b | Crear, a mano, con tokens (§D-B9) |
| `src/components/ui/textarea.tsx` y su prueba | 03c | Crear |
| `src/components/layout/data.ts` | 03b | Modificar: solo `DESTINOS_POR_ROL.admin` y su comentario; se importa `UserPlus` |
| `src/components/layout/contenedor-rol.test.tsx` | 03b | Modificar: dos destinos del admin |
| `src/app/router.tsx` | 03b | Modificar: `/registro-maestro` en `LayoutPublico` y `{ path: "maestros", element: <MaestrosView /> }` bajo `/admin` |
| `src/app/router.test.tsx`, `marco.test.tsx` | 03b | Modificar solo si una prueba normal enumera rutas o destinos |
| `src/services/authService.ts` y su prueba | 03b | Modificar: `registroMaestro` |
| `src/services/apiClient.ts` y su prueba | 03b | Modificar: `"/registro-maestro"` en `RUTAS_SIN_SESION` |
| `src/styles/tokens.test.ts` | 03b | Modificar solo si un par de contraste de las insignias no está ya comprobado (§3 de `DESIGN.md`) |

**`features/auth/`**
| Archivo | Sub. | Acción |
|---|---|---|
| `types.ts` | 03a, 03b | Reexporta `EstablecerContrasena`, `DatosDeInvitacionRespuesta` y `RegistroMaestro`; `CampoFormularioAuth` pierde `contrasenaActual`; `TextosNuevaContrasena` suma `nombre?` y `ayudaNombre?` |
| `data.ts` | 03a, 03b | §D-A6 y §D-B8; `CAMPOS_FORMULARIO_AUTH` sin `contrasenaActual` |
| `hooks.ts` | 03a, 03b | 03a: `useLogin` y `useRegistro` (§D-A3), `useDatosDeInvitacion` y `useNuevaContrasena` con `nombre`. 03b: `useRegistroMaestro`; `sacarDeLaCacheAlAsentar` se importa de `@/lib/cache-de-mutaciones` |
| `components/formulario-cambiar-contrasena.tsx` | 03a | Sin el campo de la temporal |
| `components/formulario-nueva-contrasena.tsx` | 03a | Prop `nombreInicial?: string`: con ella, el campo "Nombre completo" (`autoComplete="name"`, `ErrorDeCampo`) y la validación con `establecerContrasenaSchema` |
| `establecer-contrasena-view.tsx` | 03a | Estados de §D-A2 |
| `components/formulario-registro-maestro.tsx`, `registro-maestro-view.tsx` | 03b | Crear |
| Pruebas normales: `cambiar-contrasena-view.test.tsx`, `establecer-contrasena-view.test.tsx`, `login-view.test.tsx`, `registro-view.test.tsx`, `contrasena-visible.test.tsx`, `lib.test.ts` | 03a | Modificar lo que el cambio exige. `contrasena-visible` pasa de 7 a 6 campos en 03a |
| `registro-maestro-view.test.tsx` | 03b | Crear |
| `contrasena-visible.test.tsx` | 03b | Modificar (vuelve a 7 campos) |

`components/campo-contrasena.test.tsx` **no está en ningún paso**. P-01 está resuelta.

**`features/admin/`**
| Archivo | Sub. | Acción |
|---|---|---|
| `maestros-view.tsx` y su prueba | 03b (crear), 03c (modificar) | Vista de §D-B6 y §D-C6, con densidad de admin |
| `components/formulario-generar-enlace.tsx`, `enlace-nuevo.tsx`, `tabla-enlaces.tsx`, `registrados-del-enlace.tsx`, `insignia-estado-enlace.tsx` | 03b | Crear |
| `components/formulario-invitacion-masiva.tsx`, `resultado-invitacion-masiva.tsx` | 03c | Crear |
| `types.ts`, `data.ts`, `lib.ts` (y `lib.test.ts`), `hooks.ts` | 03b, 03c | Tipos reexportados de `shared/` (más las props de variables en `types.ts`), textos, `construirUrlDeRegistro`, `etiquetaDeEstadoEnlace`, `etiquetaDeMotivo`, `useEnlacesRegistro`, `useGenerarEnlace`, `useRevocarEnlace`, `useRegistradosDelEnlace` y `useInvitarEnLote` |

Ningún componente llama a `fetch`. Los tipos de la API se infieren de `shared/`. Nada se importa entre módulos.

---

## Acceso a datos
Ninguna consulta va dentro de un ciclo. Toda lista se pagina con un máximo de 100. Todo el SQL crudo es `$queryRaw` o `$executeRaw` etiquetado y parametrizado.

| Operación | Tablas y consulta | Índice | Paginación | Transacción |
|---|---|---|---|---|
| `buscarCredencialesPorId` | `usuarios` por `id` | PK | — | No |
| `buscarSesionPorHash` (filtro previo, M-02) | `sesiones` por `hash_token` | único | — | No |
| `cambiarContrasenaPropia` (03a) | `usuarios FOR NO KEY UPDATE` (PK); `sesiones` por `id` y `usuario_id`; `UPDATE usuarios` (PK); `UPDATE sesiones` por `usuario_id`; `UPDATE tokens_cuenta` por `usuario_id` | PK; PK; PK; `(usuario_id)`; `(usuario_id)` | — | Sí, READ COMMITTED, con el protocolo |
| `buscarInvitacionPorHash` (03a) | `tokens_cuenta` por `hash_token` + `usuarios` (PK) | único; PK | — | No |
| `usarTokenYCambiarContrasena` (+ nombre) | Sin cambios de consultas; el `UPDATE usuarios` suma dos columnas | PK | — | Sí (existente) |
| `crearEnlaceRegistro` (03b) | `INSERT enlaces_registro` | PK, único | — | No (una sentencia) |
| `listarEnlacesRegistro` (03b) | `enlaces_registro ORDER BY creado_en DESC, id DESC`, con cursor de Prisma sobre `id` y `take: limite + 1`; después, `usuarios GROUP BY enlace_registro_id WHERE enlace_registro_id IN (≤ 100 ids)` | `(creado_en DESC, id DESC)`; `(enlace_registro_id, creado_en)` | Sí (20 por defecto, máx. 100) | No: son dos lecturas, y un conteo desfasado un instante es aceptable |
| `revocarEnlaceRegistro` (03b) | `UPDATE enlaces_registro … WHERE id AND revocado_en IS NULL`; `findUnique` (PK) + conteo de registrados | PK; `(enlace_registro_id, creado_en)` | — | Sí (para devolver el estado confirmado) |
| `listarRegistradosPorEnlace` (03b) | `enlaces_registro` (PK, para el 404); `usuarios WHERE enlace_registro_id = $1 ORDER BY creado_en, id`, con cursor | PK; `(enlace_registro_id, creado_en)` | Sí | No |
| `buscarEnlacePorHash` (03b) | `enlaces_registro` por `hash_token` | único | — | No |
| `registrarMaestroConEnlace` (03b) | `SELECT … FROM enlaces_registro WHERE id … FOR SHARE`; `INSERT usuarios`; `INSERT sesiones` | PK; único `email`; único `hash_token` | — | Sí |
| `invitarMaestrosEnLote` (03c) | `pg_advisory_xact_lock` (`$executeRaw`); `COUNT tokens_cuenta WHERE tipo AND creado_en >=`; `usuarios WHERE email IN (≤ 100)`; `createMany usuarios` (`skipDuplicates`); `usuarios WHERE id IN (≤ 100)`; `createMany tokens_cuenta`; `insert` de pg-boss (una sentencia) | —; **`(tipo, creado_en)` nuevo**; único `email`; único; PK; PK | Entrada acotada a 100 | Sí, todo junto, incluido el encolado |

La única consulta nueva que no encajaba en un índice existente es el conteo del cupo. Por eso la migración de 03c agrega `(tipo, creado_en)`.

---

## Autorización
| Endpoint | Pueden | No pueden (y respuesta) | Campos que nunca salen |
|---|---|---|---|
| `POST /auth/cambiar-contrasena` | El propio usuario con la bandera y una sesión viva propia; también un estudiante restringido con la bandera (RN-03, C-01 de AUTH-02) | Sin token → 401. Sin la bandera → 409. Sin sesión viva, o con una sesión ajena o revocada → 401 `SESION_INVALIDA`, **sin gastar intento ni argon2** (M-02) y sin escribir. **Cambio visible (M-03):** si la contraseña vigente cambió entre la verificación y el bloqueo (`"credencial_cambiada"`), la respuesta pasa de `400 CONTRASENA_ACTUAL_INCORRECTA` a `401 SESION_INVALIDA`. Eso dispara el refresco del `apiClient`, que tras un restablecimiento concurrente falla y lleva a `/login` | — (respuesta 204) |
| `POST /auth/invitacion` | Quien tenga el token de una invitación viva | Token inválido de cualquier tipo → 400 `ENLACE_INVALIDO`, siempre el mismo | Correo, rol, id, estado de la cuenta |
| `POST /auth/establecer-contrasena` | Ídem | Ídem. No inicia sesión | — |
| `POST /auth/registro-maestro` | Quien tenga un enlace de registro vivo | Enlace inexistente, vencido o revocado, o un token de `tokens_cuenta` → 400. El rol siempre es `maestro` | Solo sale `tokenAcceso` |
| Rutas `/admin/enlaces-registro*` y `/admin/maestros/lote` | Admin sin cambio pendiente | Sin token → 401; estudiante o maestro → 403 `ROL_NO_PERMITIDO`; estudiante restringido → 403 `ACCESO_RESTRINGIDO` (`withAccess` va antes que `requireRole`); admin con `debe_cambiar_contrasena` → 403 `CAMBIO_DE_CONTRASENA_REQUERIDO` | `estadoPago`, `accesoRestringido`, `hash*`, token (salvo la única vez, al crearlo) |

El estado de pago no aparece en ninguna respuesta nueva. Lo comprueban las pruebas: la clave no existe en ningún objeto.

---

## Pruebas requeridas
Todas llevan al menos una aserción, sin `return` temprano ante una precondición que falte. Los avisos y correos se prueban con el doble en memoria de `notifier`. Nada llama a Resend. **La suite del backend solo corre con la precondición del firewall (PA-01), por el riesgo residual de Ryuk.**

### Unitarias de core
- **03a:**
  - `evaluarContrasenaRepetida` (true/false);
  - `estaVivaParaCambio`: null, otro usuario, revocada, reemplazada, `expira_en == ahora`, viva;
  - `errorDelCambioPropio` (los tres resultados → `null` / 401 con código y mensaje);
  - `prepararNombre` (espacios, acentos → `nombreBusqueda`);
  - `prepararRegistro` sin cambios de resultado.
- **03b:**
  - `calcularExpiracionEnlace` (1, 7 y 30 días; la hora UTC);
  - `estadoDeEnlace`: revocado y vencido a la vez → revocado; `expira_en == ahora` → vencido; un ms antes → vigente;
  - `decidirUsoDeEnlace`: null, vencido, revocado, vigente.
- **03c:**
  - `analizarListaDeInvitaciones`: vacía; solo líneas vacías; CRLF; tab, `;` y `,`; correo primero y último; un nombre con comas; un nombre vacío tras el separador; un correo inválido; un nombre de 1 carácter, con controles o de 121; repetido con mayúsculas distintas; 100 líneas; numeración con líneas vacías intercaladas; texto de más de 200 caracteres recortado;
  - `nombreProvisionalDe` (M-07 y M-12):
    - casos: parte local de 1 carácter (cae al correo completo), normal, de 64 o más caracteres, y uno en que ni la parte local ni el correo recortado pasan (cae al respaldo);
    - en todos, el resultado pasa `nombreSchema.safeParse` y es **igual** a su `data`.
  - `evaluarCupo`: `solicitadas == restantes` pasa; `+1` → 409 con N en el mensaje; `usadas > limite` → N = 0;
  - `esperaAntesDelSiguiente`: sin intento previo → 0; justo en el intervalo → 0; a la mitad → lo que falta (125 ms); reloj hacia atrás → nunca más del intervalo ni negativo.

### Integración del backend (Testcontainers)
- **03a:**
  - `cambiar-contrasena.integracion`:
    - con la sesión viva del login con la temporal → 204, esa sesión se conserva y las demás se revocan;
    - sin cookie → 401 y la bandera sigue, **sin contar el intento**: 6 peticiones sin cookie seguidas de una con cookie y una nueva válida dan 204, no 429 (M-02);
    - con una cookie revocada o reemplazada → 401;
    - con la cookie de otro usuario → 401, sin tocar las sesiones ajenas;
    - la nueva igual a la temporal, con cookie → 400 `CONTRASENA_REPETIDA`;
    - con `contrasenaActual` en el cuerpo → se ignora;
    - sin la bandera → 409;
    - restringido con la bandera, con su cookie → 204;
    - 5 repetidas con cookie → la 6.ª → 429.
  - `bloqueo-usuario.integracion`:
    - casos de cambio con la cookie vigente, que retienen al usuario: el restablecimiento del admin gana → 401;
    - la sesión pasa el filtro previo y se revoca antes del bloqueo → 401 sin escribir.
  - `invitacion.integracion`:
    - `POST /auth/invitacion` → `{ nombre }` exacto (sin otras claves) y `no-store`;
    - token usado, vencido, revocado, de recuperación, basura o de una cuenta inactiva → el mismo 400;
    - `establecer-contrasena` con nombre → `nombre` y `nombre_busqueda` actualizados;
    - sin nombre → no cambia;
    - con un nombre inválido → 400 `VALIDACION` y el token sigue vivo;
    - `restablecer` con `nombre` → el nombre no cambia.
  - `autorizacion-cuentas.integracion`: `invitacion` es pública y un `Authorization` ajeno no cambia nada.
- **03b:**
  - `enlaces-registro.integracion` (nuevo), con la matriz de autorización de los 4 endpoints (sin token, estudiante, maestro, estudiante restringido, admin con bandera y admin):
    - crear: 201, `no-store`, token de 43 caracteres, `hash_token` = SHA-256 y ningún token en la base; vigencia de 0, 31, 1.5 o texto → 400;
    - listar: orden, cursor, `limite` de 0 o de 101 → 400; `registrados` correcto con 0, 1 y 3 registrados, con una sola consulta de conteo;
    - revocar: 200 idempotente, `revocado_en` conservado; uuid inexistente → 404;
    - registrados: campos exactos, orden, cursor, sin `estadoPago`.
  - `registro-maestro.integracion` (nuevo):
    - 201 + cookie; la cuenta con `rol = maestro` y `enlace_registro_id`;
    - `rol: "admin"` en el cuerpo → sigue siendo maestro;
    - enlace vencido, revocado o inexistente → 400;
    - un token de invitación de `tokens_cuenta` → 400;
    - correo existente → 409 y nada creado;
    - la cookie refresca;
    - `/me` → maestro;
    - carrera entre revocación y registro con `conFilaRetenida` sobre `enlaces_registro`, en los dos órdenes: nunca un registrado después de la respuesta de la revocación, nunca un 5xx.
  - `sesiones-y-cadena` (la actualiza el tester en la ronda 0).
- **03c:**
  - `invitacion-masiva.integracion` (nuevo):
    - matriz de autorización;
    - lista mixta (válidas, existentes de los tres roles, inválidas y repetidas) → las tres listas exactas;
    - cuentas creadas como maestro, con un hash inutilizable compartido, un token de invitación por cuenta y un trabajo por token en `pgboss.job`, con `retry_limit`, `dead_letter` y el id igual al del token;
    - la cuenta de una línea sin nombre tiene un nombre que pasa `nombreSchema` (M-07);
    - cupo exacto → 200; uno más → 409 y **nada** creado ni encolado;
    - las existentes no consumen cupo;
    - dos lotes simultáneos con cupo para uno solo → uno 200 y el otro 409 (bloqueo consultivo);
    - un correo creado por otra transacción entre la lectura y la inserción → reportado como existente, sin 5xx;
    - rollback de `alGuardar` → nada creado.
  - `worker-correo-de-cuenta.integracion`, con un `esperar` y un `reloj` falsos que registran (M-06 y M-09):
    - el primer trabajo no espera;
    - el segundo, tras un enviado, espera lo que falta **antes** de procesarse;
    - **tras un error del notifier, el siguiente trabajo espera**, y el error se propaga (el trabajo fallido queda para reintento);
    - tras un omitido no se registra intento;
    - ninguna espera ocurre después del último envío.
  - `cola.integracion`: `encolarVarios` dentro y fuera de una transacción revertida.
  - `config/env.test.ts`: el valor por defecto (80) y los límites de `INVITACIONES_LIMITE_DIARIO`.

### Frontend (jsdom)
- **03a:**
  - `/cambiar-contrasena` con 2 campos, envío `{ contrasenaNueva }`, `SESION_INVALIDA` con su mensaje;
  - `/establecer-contrasena`:
    - carga → formulario con el nombre prellenado;
    - `ENLACE_INVALIDO` en la consulta → enlace inválido, sin formulario;
    - otro error → `MensajeError`;
    - el envío lleva `nombre`;
    - nombre inválido → `ErrorDeCampo` y ninguna petición;
    - ni la clave, ni `meta`, ni `data` de la consulta contienen el token, y al desmontar la consulta desaparece;
  - login y registro: tras un éxito y tras un error, la contraseña no está en ninguna mutación de la caché.
- **03b:**
  - `table`, `badge` y `cache-de-mutaciones`;
  - `estado-vacio`: título, frase opcional y acción opcional, y la variante del botón es la que recibe;
  - `/registro-maestro`: sin token, envío correcto → `/maestro`, `ENLACE_INVALIDO`, `CORREO_EN_USO` y contraseña fuera de la caché;
  - `/admin/maestros`:
    - generar: vigencia fuera de rango → `ErrorDeCampo` y ninguna petición; `autoComplete="off"`; `enEspera`;
    - el enlace nuevo con la URL del origen y `#token=`;
    - "Copiar enlace" con un portapapeles simulado: éxito y fallo, cada uno con su `toast`;
    - el token fuera de la caché de mutaciones tras asentarse;
    - la tabla con las tres insignias con texto;
    - ver registrados y cargar más; el vacío de registrados sin acción;
    - revocar con confirmación en línea;
    - el vacío de la lista con "Generar el primer enlace" en `outline`, que lleva el foco al campo de vigencia; ningún par de botones con el mismo nombre;
    - estados en el orden error → carga → vacío → datos;
  - la barra del admin con dos destinos.
- **03c:**
  - `textarea`;
  - el formulario de la masiva: contador; más de 100 líneas → `ErrorDeCampo` y ninguna petición; `autoComplete="off"`; `enEspera`;
  - el resultado con los tres grupos y sin grupos vacíos;
  - `CUPO_DIARIO_INSUFICIENTE` con el mensaje del servidor;
  - un solo `primary` en la vista.

---

## Puntos de ataque para el Tester
Reglas de `tester.md`: sin selectores de clase y sin navegadores. Las `*.ataque` nuevas se escriben en archivos nuevos con sufijo `-r<N>`.

### Ronda 0 (cada subentrega; no cuenta en el tope de 3)
1. **Precondiciones:**
   - árbol limpio dentro de los paquetes contra la base de la subentrega (`<R>` en 03a, `<Ca>` en 03b, `<Cb>` en 03c);
   - V-01 con la tabla vigente;
   - PA-01 antes de cualquier prueba del backend.
2. **Reescritura:** reescribe **solo** los casos que contradicen los cambios C-n de la subentrega (§D-A4, §D-B7, §D-C9), conservando lo que protegen. Completa el inventario con tu propia búsqueda en todas las `*.ataque` de los dos paquetes. **En las tres rondas 0** busca, como mínimo:
   - `contrasenaActual`, "Contraseña temporal" y `mostrarTemporal`;
   - `CampoContrasena` (elementos y conteos por archivo) y `TEXTOS_CAMPO_CONTRASENA` (claves y número de textos). En 03a y 03b llevan a `estatico-r1.ataque.test.ts` (C-5b y C-14) y a cualquier otra prueba que enumere los formularios o los campos de contraseña, por ejemplo `app/contrasena-r1` y `app/contrasena-r2`;
   - `/establecer-contrasena` con token;
   - la lista exacta de rutas (`printRoutes`, `sesiones-y-cadena`) y `RUTAS_PUBLICAS`;
   - los destinos del admin (`DESTINOS_POR_ROL`, "Cuentas", `/admin`).

   **Casos fuera del inventario:** si encuentras un caso contradicho que el plan no lista, lo reescribes igual, conservando lo que protege, y en tu reporte **citas el C-n que lo contradice**. Si ningún C-n lo contradice, no es una contradicción sino un hallazgo: no lo reescribes y lo reportas.
3. **Reporte:** publica en `reporte-tester.md`, sección "AUTH-03x — Ronda 0":
   - el diff;
   - la **lista exacta de casos que quedan en rojo** hasta que el programador termine (archivo, línea, título y C-n);
   - la tabla de hashes de todas las `*.ataque`.

   Formatea solo los archivos que tocaste, desde su paquete.

### AUTH-03a
1. **Cambio obligatorio sin la temporal:**
   - un token de acceso emitido antes del restablecimiento, con y sin la cookie vieja → nunca 204;
   - sin sesión viva, 10 peticiones seguidas no bloquean al usuario legítimo (M-02): su petición con cookie después no recibe 429;
   - la cookie de la sesión de la temporal con el token de otro usuario;
   - la cookie rotada a mitad de la petición (`conFilaRetenida` sobre `sesiones`), también entre el filtro previo y el bloqueo;
   - dos cambios simultáneos con la misma sesión → uno 204 y el otro 401 o 409, nunca un 5xx, y un solo hash final;
   - un restablecimiento del admin simultáneo al cambio;
   - un restringido con bandera;
   - un cuerpo con `contrasenaActual` y claves extra;
   - la nueva igual a la temporal pero con mayúsculas y minúsculas cambiadas (debe pasar, porque son distintas);
   - 429 tras 5 repetidas con cookie.
2. **`/auth/invitacion`:**
   - distinguir tokens por el tiempo o el mensaje (todos los inválidos deben verse igual);
   - un token de recuperación válido;
   - una invitación de una cuenta inactiva;
   - cuerpos enormes o sin `token`;
   - que la respuesta no traiga el correo;
   - que el log no contenga el token ni el nombre.
3. **Nombre al establecer:**
   - un nombre con `\p{Cf}`, relleno Hangul o 121 caracteres → 400 y el token sigue vivo;
   - un nombre en `restablecer` → ignorado;
   - una carrera entre dos `establecer` con nombres distintos → uno gana entero (nombre y contraseña del mismo).
4. **Caché:** en el login fallido, el login con éxito, el registro con `CORREO_EN_USO`, el cambio obligatorio y `establecer`, ninguna contraseña ni token queda en la caché de mutaciones ni en la de consultas.
5. **Regresión:** todas las `*.ataque` de `auth`, `app`, `components/layout` y del backend de cuentas.

### AUTH-03b
1. **Registro por enlace:**
   - un enlace vencido por 1 ms;
   - la revocación y el registro en carrera, en los dos órdenes;
   - 20 registros simultáneos con el mismo enlace y la revocación en medio → ningún registrado con `creado_en` posterior al `revocado_en`;
   - `rol`, `enlaceRegistroId`, `activo` o `estadoPago` en el cuerpo;
   - un token de invitación o de recuperación;
   - el token con espacios o de 42 o 44 caracteres;
   - el mismo correo en dos registros simultáneos → 201 y 409, nunca un 5xx;
   - la sesión creada refresca, y la guarda de rutas acepta la ruta como pública.
2. **Admin:**
   - la matriz de autorización completa;
   - un `cursor` de otro enlace o inexistente;
   - los valores límite de `limite`;
   - un IDOR es imposible (todo es del admin único), pero comprueba que los `registrados` de un enlace no mezclen usuarios de otro;
   - ninguna respuesta lleva `hash_token`, el token (salvo en la creación) ni `estadoPago`;
   - `no-store` en la creación.
3. **Frontend:**
   - el enlace nuevo desaparece al desmontar y no está en ninguna caché;
   - "Copiar enlace" no le roba el foco a un campo que el admin tomó mientras la petición estaba en vuelo (T-14);
   - la confirmación en línea no revoca con un doble Enter;
   - estados vacío y error; ningún nombre de botón repetido en la vista;
   - `/registro-maestro` limpia el fragmento del historial;
   - la vista a 360 px no se puede medir en jsdom: queda para el humano (H-5).
4. **Regresión:** las de 03a y las de `/admin`, que siguen en verde sin cambios.

### AUTH-03c
1. **Lote:**
   - 100 líneas justas y 101;
   - 40,001 caracteres;
   - una línea de solo separadores;
   - un correo repetido con mayúsculas;
   - el correo del admin;
   - un correo con un `‮`;
   - un nombre con `<script>` (se muestra como texto);
   - líneas sin nombre con partes locales raras (1 carácter, solo símbolos): el nombre guardado siempre pasa `nombreSchema`;
   - cupo exacto, cupo en 0 y lotes simultáneos;
   - que un 409 no deje usuarios, tokens ni trabajos;
   - que cada trabajo tenga el id de su token y la política de reintentos de la cola;
   - que el log no contenga los correos de la lista.
2. **Worker:**
   - el ritmo: espera antes del siguiente y nunca después del último;
   - cuentan también los intentos que lanzaron (M-09), y el error no se traga;
   - no cuentan los omitidos;
   - un lote de 5 con el canal `registro` escribe 5 HTML y ninguno de más.
3. **Frontend:** contador con CRLF y líneas vacías; resultado sin grupos vacíos; mensaje del cupo; un solo `primary`.
4. **Regresión:** todo.

---

## Riesgos y desacuerdos

**Sin desacuerdos con `ARCHITECTURE-ESSENTIALS.md`.** B-03 (B) agrega una comprobación del servidor que ESSENTIALS no menciona, sin contradecirla; el texto propuesto la incorpora. **Sin desacuerdos con las revisiones del manager:** M-01 a M-13 y los detalles quedan incorporados (secciones "Enmienda 1" y "Enmienda 2").

- **R-01 · Superado por B-03 (B).** Con la opción A, durante los 15 minutos de vida de un token de acceso emitido antes de un restablecimiento, su portador habría podido fijar la contraseña sin conocer la temporal. Con B no es posible, salvo el caso acotado de R-15.
- **R-02 · Orden de despliegue.** El frontend nuevo manda `{ contrasenaNueva }` y `nombre`, y el backend anterior rechaza el primero con 400. **Se despliega primero el backend.** El backend nuevo acepta los cuerpos del frontend anterior. Texto para §18 abajo.
- **R-03 · Enlace de registro filtrado.** Quien lo tenga crea cuentas de maestro hasta que venza (30 días como máximo) o se revoque. Mitigaciones:
  - el enlace es visible una sola vez;
  - el admin lo revoca y ve quién se registró;
  - dar de baja una cuenta es de ADMIN.

  No hay límite por IP (S-10): lo cubre el límite de DEPLOY.
- **R-04 · Nombre provisional** (B-02 A). "ana.lopez" (o "Maestro invitado", si ni la parte local ni el correo sirven) aparece en el correo y en la ficha hasta que el maestro activa la cuenta y lo corrige.
- **R-05 · El cupo cuenta invitaciones, no envíos reales.** Cuenta las invitaciones creadas en una **ventana móvil de 24 h**. Esa ventana es más estricta que el día calendario UTC de Resend:
  - todo día UTC (de 00:00 a 24:00) es en sí una ventana de 24 h;
  - por eso nunca se crean más de 80 invitaciones dentro de un mismo día UTC, sin importar a qué hora empiecen.

  Las recuperaciones y los futuros correos de aviso no descuentan del cupo: el margen de 20 sobre los 100 diarios los cubre. NOTIFICACIONES debe contar todos los correos cuando encienda los avisos. Que 100 al día no alcanzan para 1,500 usuarios en producción ya está anotado para DEPLOY en `docs/ESTADO.md`.
- **R-06 · Ritmo.** 250 ms entre intentos: un lote de 80 tarda unos 20 s en salir. Una recuperación pedida en ese rato espera detrás, en la misma cola; es aceptable, porque su enlace dura 30 minutos. Si llegara a molestar, se les da prioridad a las recuperaciones (opción `priority` de pg-boss en `recuperar`); no lo propongo ahora.
  - La espera va antes del intento siguiente, no después (M-06), así que no alarga la ventana de reenvío por una caída del worker.
  - Un intento que lanzó también cuenta (M-09), así que un 429 de Resend no acelera la cola.
- **R-07 · Hash inutilizable compartido por lote** (S-11). Nadie conoce su preimagen. Un login contra cualquiera de esas cuentas cuesta lo mismo que una contraseña incorrecta. `crearSesion` y `cambiarContrasenaPropia` comparan el hash de cada usuario, así que dos filas con el mismo hash no se confunden.
- **R-08 · Un argon2 más** en `cambiar-contrasena`, para `CONTRASENA_REPETIDA`: unos 100 ms. Con el filtro previo (M-02), solo lo paga quien tiene una sesión viva propia, y el límite de 5 intentos por 15 min lo acota.
- **R-09 · El token en la función de la consulta** de `useDatosDeInvitacion`. No va en la clave ni en los datos, pero la función vive en las opciones de la consulta hasta que se recolecta (`gcTime: 0` al desmontar). Es el mismo alcance que el estado de React que ya lo guarda.
- **R-10 · Las `*.ataque` reescritas en la ronda 0 cambian lo que exigen.** El manager compara en su revisión final el diff de cada una contra la base, línea por línea. Verifica que ninguna protección se debilitó más allá de los C-n aprobados (incluidos C-5b y C-14 de `estatico-r1`) y que cada agregado del tester cita su C-n.
- **R-11 · Pantallas provisionales.** `/admin` y `/admin/maestros` las reordenará ADMIN.
- **R-12 · Testcontainers y Ryuk.** Durante cada corrida del backend, Ryuk publica su puerto sin autenticación en todas las interfaces. Solo se corre con la regla del firewall aplicada y en una red de confianza (PA-01; `docs/trabajo/CHORE-01-testcontainers/mitigacion-ryuk.md`).
- **R-13 · `POST /auth/invitacion` revela el nombre** de la cuenta a quien tiene el token, que de todos modos puede activarla. Aceptable.
- **R-14 · La respuesta del lote repite el texto de las líneas inválidas.** React lo pinta como texto. No se registra en el log (Fastify no registra cuerpos; lo comprueba el tester).
- **R-15 · Pestaña vieja en el mismo navegador (M-03).** El token de acceso no está atado a una sesión (solo lleva `sub`). Supongamos una pestaña abierta antes del restablecimiento, con un token anterior, en el **mismo navegador** donde después alguien entró con la temporal. Esa pestaña manda la cookie de la sesión nueva y puede completar el cambio. No abre nada nuevo: ese navegador ya tiene la sesión de la temporal y podría hacer el cambio desde cualquier pestaña. Atar el token a la sesión (un `sid` en el JWT) cambiaría la decisión de ESSENTIALS "solo `sub`", y no lo propongo.

### Textos literales propuestos para documentos (los aplica el orquestador al cerrar cada subentrega)
Con el cambio de proceso, el orquestador aplica al cerrar cada subentrega, antes de su commit, los textos que ya son ciertos en ese momento, con autorización del humano. Después anota en `aprobacion.md` el SHA-256 de cada archivo protegido que cambió. Cada bloque lleva la marca de la subentrega que lo aplica.

Si un bloque abarca varias subentregas, se aplica al cerrar la primera con la parte que ya es cierta y se completa al cerrar las siguientes; el texto de abajo es el final. En particular, en §6 "Maestros":
- **03a:** la lista con solo el ítem 1, y la nota "En la forma 1, …";
- **03b:** se agrega el ítem 3;
- **03c:** se agrega el ítem 2, y la nota pasa a "En las formas 1 y 2, …".

Lo mismo vale para las filas `auth` y `admin` de §7, que crecen con cada ruta.

**`ARCHITECTURE.md` §6, "Autenticación propia"**, reemplaza la viñeta "Maestros" (03a, 03b y 03c; texto final):
> - **Maestros:** no hay registro público abierto de maestros (D-04). Se dan de alta de tres formas:
>   1. **Invitación individual** (`POST /admin/maestros`).
>   2. **Invitación masiva** (`POST /admin/maestros/lote`): el admin pega hasta 100 líneas con un correo y, opcionalmente, un nombre. Una línea sin nombre usa un nombre provisional (la parte local del correo, el correo completo o "Maestro invitado"). El lote se rechaza completo (`409 CUPO_DIARIO_INSUFICIENTE`) si sus correos nuevos rebasan el cupo `INVITACIONES_LIMITE_DIARIO` (80), que cuenta las invitaciones creadas en las últimas 24 horas.
>   3. **Enlace de registro** que genera el admin (`POST /admin/enlaces-registro`): token aleatorio de 256 bits, mostrado una sola vez y guardado solo como SHA-256 (`enlaces_registro`). Vigencia de 1 a 30 días, 7 por defecto; sin límite de usos; revocable. Con él, `POST /auth/registro-maestro` crea una cuenta de maestro con la sesión iniciada y guarda en `usuarios.enlace_registro_id` el enlace usado; el admin ve quién se registró con cada uno. El registro toma `FOR SHARE` sobre la fila del enlace, así que ninguno confirma después de que la revocación respondió.
>
>   En las formas 1 y 2, la cuenta nace con una contraseña inutilizable y el maestro recibe por correo un enlace de un solo uso (72 horas) para establecer su contraseña. Al abrirlo ve su nombre (`POST /auth/invitacion`) y puede corregirlo antes de guardar.

**§6, "Recuperación de contraseña"** (03a): en la viñeta que empieza por "`POST /auth/recuperar` no consulta la cuenta", reemplaza "conserva la sesión actual y revoca las demás" por:
> conserva la sesión con la que se hizo el cambio y revoca las demás

**§6, "Respaldo, por el Administrador"** (03a): reemplaza la segunda viñeta por:
> - Activa `debe_cambiar_contrasena` y revoca las sesiones. Con esa bandera, tras iniciar sesión **el único endpoint permitido es el cambio de contraseña**. Pide solo la contraseña nueva, que debe ser distinta de la temporal, y exige una sesión viva del mismo usuario (la cookie de refresco del login con la temporal): un filtro previo sin bloqueo responde `401 SESION_INVALIDA` sin gastar intentos, y la decisión definitiva se toma bajo el bloqueo del usuario. Un futuro cambio voluntario desde el perfil pedirá la contraseña actual.

**§7, fila `auth`** (03a; 03b agrega `registro-maestro`):
> `POST /auth/registro` · `POST /auth/login` · `POST /auth/refrescar` · `POST /auth/logout` · `POST /auth/recuperar` · `POST /auth/restablecer` · `POST /auth/invitacion` (nombre del maestro invitado, con el token del enlace) · `POST /auth/establecer-contrasena` (invitación de maestro; admite corregir el nombre) · `POST /auth/registro-maestro` (con un enlace de registro del admin) · `POST /auth/cambiar-contrasena` (solo la contraseña nueva; exige una sesión viva)

**§7, fila `admin`** (03b; 03c agrega `maestros/lote`):
> usuarios (`POST /admin/maestros` (invitación), `POST /admin/maestros/lote` (invitación masiva), `GET/POST /admin/enlaces-registro`, `POST /admin/enlaces-registro/{id}/revocar`, `GET /admin/enlaces-registro/{id}/registrados`, `POST /admin/usuarios/buscar`, `POST /admin/usuarios/{id}/restablecer-contrasena`, `PUT /admin/usuarios/{id}/correo`, baja), clases, `PUT /admin/alumnos/estado-pago` (por lote), `PUT /admin/alumnos/{id}/acceso`, anuncios, `GET/PUT /admin/configuracion/avisos-correo`, KPIs, analytics

**§14, diagrama** (03b): se agrega la línea
> `  enlaces_registro ||--o{ usuarios : registra`

**§14, tabla** (las filas `usuarios` y `enlaces_registro` en 03b; la fila `tokens_cuenta` en 03c):
> | `usuarios` | `id`, `email`, `hash_contrasena`, `debe_cambiar_contrasena`, `nombre`, `nombre_busqueda`, `rol`, `activo`, `estado_pago`, `fecha_estado_pago`, `acceso_restringido`, `motivo_restriccion`, `fecha_restriccion`, `enlace_registro_id` | `email` único (en minúsculas) · GIN trigrama sobre `nombre_busqueda` · índice `(rol)` · único parcial que garantiza **un solo** `rol = 'admin'` · índice `(enlace_registro_id, creado_en)` · FK a `enlaces_registro` con `ON DELETE RESTRICT` |
> | `tokens_cuenta` | `id`, `usuario_id`, `tipo` (`recuperacion` / `invitacion`), `hash_token`, `expira_en`, `usado_en`, `revocado_en`, `creado_en`, `actualizado_en` | `hash_token` único · índice `(usuario_id)` · índice `(tipo, creado_en)` (cupo diario de invitaciones) · FK con `ON DELETE CASCADE` |
> | `enlaces_registro` | `id`, `hash_token`, `expira_en`, `revocado_en`, `creado_en`, `actualizado_en` | `hash_token` único · índice `(creado_en DESC, id DESC)`. El estado (vigente, vencido, revocado) se deriva; no se guarda |

**§14, "Reglas de acceso a datos"** (03c): viñeta nueva
> - **Altas en lote** (invitación masiva): una transacción con el bloqueo consultivo de invitaciones (`pg_advisory_xact_lock`, con `$executeRaw`), `createMany` con `skipDuplicates`, la relectura por id de lo insertado y un solo `insert` de pg-boss con la conexión de la transacción. Ninguna consulta por línea y ningún `P2002` atrapado.

**§8, fila `CORREO_DE_CUENTA`** (03c): se agrega al final
> La invitación masiva encola un trabajo por maestro con un solo `insert` dentro de su transacción.

**§9, "Reglas"** (03c): viñeta nueva, y en la viñeta "Plan gratuito: 3,000 correos al mes", se agrega "y 100 al día, por día calendario UTC; 10 peticiones por segundo por equipo".
> - El worker deja al menos 250 ms entre dos intentos de envío a Resend (el límite es de 10 peticiones por segundo por equipo): antes de cada trabajo espera lo que falte desde el último intento que llegó al notifier, también si lanzó. La invitación masiva respeta además un cupo de 80 invitaciones en una ventana móvil de 24 horas (`INVITACIONES_LIMITE_DIARIO`), más estricta que el día UTC de Resend, que deja margen a las recuperaciones.

**§18, "Requisitos previos a abrir la plataforma"** (03c): dos viñetas
> - El límite de tasa del borde cubre también `POST /auth/registro-maestro` y `POST /auth/invitacion`.
> - Desplegar el backend antes que el frontend cuando un encargo cambia un cuerpo de petición (AUTH-03: `cambiar-contrasena` y `establecer-contrasena`). Para el volumen de correo en producción, ver el pendiente de DEPLOY en `docs/ESTADO.md` ("Evaluar plan de pago de Resend").

**ESSENTIALS, "Autenticación"** (03b y 03c): en la viñeta "Registro público: solo estudiantes.", reemplaza todo lo que va desde "Maestros:" hasta el final de la viñeta por el texto de abajo. En 03b se aplica sin "o masiva"; 03c lo completa.
> Maestros: los da de alta el admin, por invitación individual o masiva (enlace de un solo uso por correo, 72 h; al activarlo, el maestro ve y puede corregir su nombre), o se registran con un enlace de registro que genera el admin (token aleatorio mostrado una sola vez y guardado solo como hash; vigencia de 1 a 30 días, 7 por defecto; revocable; el admin ve quién se registró con cada enlace; D-04). Admin: `npm run seed:admin`, cuenta única, sin endpoint.

**ESSENTIALS, "Autenticación"** (03a): en "Respaldo por el admin", reemplaza "Decidido para AUTH-03: ese cambio obligatorio pide solo la contraseña nueva y su confirmación, no la temporal; un futuro cambio voluntario desde el perfil sí pedirá la actual." por:
> El cambio obligatorio pide solo la contraseña nueva y su confirmación, no la temporal, y exige una sesión viva del mismo usuario (cookie de refresco); un futuro cambio voluntario desde el perfil sí pedirá la actual.

**ESSENTIALS, "Tablas"** (03b): se agrega `enlaces_registro` después de `tokens_cuenta`.

**ESSENTIALS, "Asíncrono"** (03c): reemplaza "La invitación masiva (AUTH-03) respeta los límites diarios de Resend." por:
> La invitación masiva se rechaza completa si rebasa el cupo `INVITACIONES_LIMITE_DIARIO` (80 invitaciones en las últimas 24 h; Resend gratuito: 100 correos por día UTC) y encola un trabajo por maestro en su misma transacción; el worker deja al menos 250 ms entre dos intentos de envío.

**`CLAUDE.md`, tabla de módulos** (03a y 03b):
- fila `auth`: después de "establecer contraseña (invitación de maestro)", "con su nombre corregible" (03a) y ", registro de maestro por enlace" (03b);
- fila `admin` (03b): después de "(índice de `/admin`)", "; enlaces de registro de maestros e invitación masiva (`/admin/maestros`)" (en 03b, sin "e invitación masiva"; 03c lo completa).

**`CLAUDE.md`, "Ubicaciones compartidas"** (03b y 03c):
- en `components/ui/`, `table.tsx` y `badge.tsx` (03b) y `textarea.tsx` (03c);
- en `components/`, `EstadoVacio` pasa de "por construir" a existente (`estado-vacio.tsx`, con la variante de la acción como prop) (03b);
- línea nueva (03b): "`lib/cache-de-mutaciones.ts` — `sacarDeLaCacheAlAsentar`: saca de la caché de TanStack Query una mutación con datos sensibles (contraseñas, tokens) en cuanto se asienta".

**`README.md` raíz, §7 (cifras de pruebas)** (03a, 03b y 03c): el orquestador las ajusta al cerrar cada subentrega con los conteos de esa suite, con autorización del humano.

---

## Pasos de implementación

**Reglas para todos los pasos y todos los agentes:**
- **Formateadores:** solo `npx prettier --write <rutas concretas>` y `npx eslint --fix <rutas concretas>`, **ejecutados desde el paquete del encargo** (`shared/`, `backend/` o `frontend/`) y solo sobre los archivos que tocaste. Nunca `npm run format`, nunca desde la raíz, nunca `--write`, `--fix` o `-i` fuera de ese paquete. `docs/DESIGN.md` y los `README.md` se editan a mano.
- **Sin navegadores ni aplicaciones gráficas.** Sin `npm run dev`, sin arrancar la API ni el worker.
- **Git solo de lectura. Ningún agente hace commit.** Los tres commits del encargo los hace el humano con el bloque que le da el orquestador ("Puntos de commit").
- **No leas ni imprimas ningún `.env`.**
- **No termines procesos que no arrancaste.**
- **Salidas largas**, a un archivo del scratchpad, sin tubería.
- **Backend:** antes de cualquier `npm test` del backend, PA-01.
- **Cuando una parada se cumple, te detienes**, aunque la alternativa parezca obvia o inofensiva, y reportas el comando, la salida literal y tu hipótesis.
- **El programador nunca toca `*.ataque.test.*`. El tester nunca toca código de producción ni pruebas normales.** Nadie toca `frontend/src/features/auth/components/campo-contrasena.test.tsx`.
- **Frontend de 03b y 03c (M-13, por `estatico-r1.ataque.test.ts`):**
  - ningún valor arbitrario de maquetación (`-[…]`) fuera de `components/ui/`;
  - ningún `animate-` nuevo (solo existen en `cargando.tsx` y `button.tsx`);
  - ningún `bg-background`;
  - ningún `fixed` fuera de la barra de navegación y del diálogo.

  Si un componente lo necesitara, detente (PA-06 lo haría saltar).

### PARADAS
| # | Condición |
|---|---|
| PA-01 | La regla del firewall "Campus: bloquear entrada a Docker en redes publicas" no existe, está deshabilitada o no es Inbound/Block/Public, o la red activa no es de confianza. **No se corre ninguna prueba del backend** (`Get-NetFirewallRule -DisplayName "…"`, `Get-NetConnectionProfile`) |
| PA-02 | Pasa cualquiera de estas cosas: la rama no es `feat/auth-03-ajustes-de-cuentas`; hay cambios fuera de los permitidos contra la base de la subentrega (`<R>`, `<Ca>` o `<Cb>` dentro de los paquetes y `<R>` fuera de ellos); falta la base o no existe (`git cat-file -e '<hash>^{commit}'`; `<Ca>` y `<Cb>` los anota el orquestador en `aprobacion.md`); un archivo protegido que cambió el orquestador no coincide con el SHA-256 de `aprobacion.md`; V-01 no coincide con la última tabla del tester |
| PA-03 | El SQL de `--create-only` contiene algo distinto de §D-B2 o §D-C2 (en particular un `DROP`, un `ALTER` de columnas existentes o un `NOT NULL` en la columna nueva), o `migrate dev` propone `reset` o avisa de deriva |
| PA-04 | `migrate diff … --exit-code` no termina con código 0 |
| PA-05 | `encolarVarios`: los trabajos no heredan `retry_limit`, `dead_letter` o la retención de la cola; una transacción revertida deja trabajos; el SQL lleva datos en el texto o más de una sentencia |
| PA-06 | Falla una `*.ataque` que no está en la lista de rojos esperados de la ronda 0, o al terminar sigue en rojo una de esa lista |
| PA-07 | En la salida completa de la suite del backend aparece `40P01`, `deadlock detected`, `could not serialize`, `P2028` o `too many clients`. **Única exclusión** (arbitraje del manager, AUTH-03a, ronda 2): los dos `P2028` que provoca a propósito el bloque de AUTH-02 `describe("ataque: transacciones que Prisma cierra por tiempo (P2028) a mitad de una espera de bloqueo")` de `backend/test/cuentas-r3.ataque.test.ts`, aceptados en `docs/trabajo/AUTH-02-cuentas-y-correo/revision.md` (pendiente MF-04 de ADMIN). Son exactamente uno en `POST /api/auth/login` sobre `tx.sesion.create` (`crearSesion`) y uno en `POST /api/auth/restablecer` sobre `tx.tokenCuenta.updateMany` (`usarTokenYCambiarContrasena`), y se identifican por la ruta y la llamada, no por el número de línea. Cualquier otro `P2028` (otra ruta, otra llamada o más de uno de cada tipo) y cualquier aparición de los otros cuatro términos activa la parada. Si falta uno de los dos excluidos, no se activa la parada, pero se reporta. La exclusión vale para 03a, 03b y 03c. Todo reporte que responda a PA-07 incluye el comando de búsqueda, el conteo por término y, para cada `P2028`, su ruta y su llamada; escribir "no se activó" sin esa evidencia no vale |
| PA-08 | Cualquier camino por el que un correo real podría salir fuera de `production` |
| PA-09 | La implementación exige tocar un archivo de "No se toca", instalar una dependencia o cambiar una firma de AUTH-01/02 que no está en "Cambios por capa" |
| PA-10 | Un log contiene un token de enlace, `#token=`, una contraseña o una cookie |
| PA-11 | Quedan contenedores de Testcontainers 120 s después de terminar una corrida (no se borran a mano) |
| PA-12 | Una prueba propia es intermitente |
| PA-13 | (03a) La comprobación de la sesión viva no puede hacerse bajo el bloqueo sin cambiar `bloqueo-usuario.ts` o `sesiones.ts` |
| PA-14 | (03c, M-04) Ni `$executeRaw` ni `$queryRaw` con `::text` toman el bloqueo consultivo (la prueba de dos lotes simultáneos no queda en serie) |

### Verificaciones
- **V-01 (hashes):** `Get-FileHash -Algorithm SHA256` de todas las `*.ataque`, contra la última tabla del tester.
- **V-02 (paquetes):** desde la raíz, `npm run build` (compila `shared/` primero), `npm run lint` y `npm run test`, todos con código 0. El backend solo si PA-01 pasó.
- **V-03 (Prisma, 03b y 03c):** `npx prisma validate`, `npx prisma format --check`, `npx prisma generate`, `npx prisma migrate status` y `migrate diff --exit-code`.
- **V-04 (búsquedas en el código de producción, sin pruebas):**
  - `contrasenaActual` y `mostrarTemporal` → 0 fuera de comentarios y de la lista de censura de `config/logger.ts`, que se conserva (regla 13);
  - `type="password"` → 0;
  - `<CampoContrasena` → 6 tras 03a (4 formularios: 1, 1, 2 y 2) y 7 tras 03b (5 formularios: 1, 1, 2, 2 y 1);
  - `autoComplete="off"` en todos los campos de los formularios nuevos del admin;
  - `console.` y `estadoPago` → 0 en los archivos nuevos del backend;
  - `$queryRawUnsafe` → exactamente 1 (`adapters/db/cliente.ts`); `$executeRawUnsafe` → 0;
  - SQL etiquetado (`$queryRaw` o `$executeRaw`) solo en `salud.ts`, `bloqueo-usuario.ts`, `enlaces-registro.ts` e `invitaciones.ts`; en `invitaciones.ts`, la forma elegida para el bloqueo consultivo (M-04), reportada en el resumen;
  - `INTERVALO_MINIMO_ENTRE_CORREOS_MS = 250` (03c);
  - `fetch(` → solo en `services/apiClient.ts`.
- **V-05 ("No se toca"):**
  - **Dentro de los paquetes:** por cada ruta de la lista de la subentrega, `git diff --quiet <base> -- <ruta>` con código 0 y `git status --porcelain -- <ruta>` vacío. La base es `<R>` en 03a, `<Ca>` en 03b y `<Cb>` en 03c.
  - **Fuera de los paquetes:** lo mismo con base `<R>`, salvo los archivos protegidos que cambió el orquestador. Esos se comparan contra **el último** SHA-256 anotado para ese archivo en `aprobacion.md`, "Bases y hashes" (`Get-FileHash -Algorithm SHA256`), no contra el commit (M-14). Hoy la lista es `AGENTS.md`; después de cada cierre se agregan los documentos que aplicó el orquestador (`docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-ESSENTIALS.md`, `CLAUDE.md`, `README.md`), cada uno con el hash que él anotó después de aplicar sus textos.
  - **`docs/DESIGN.md`:** lo editan los programadores en los pasos 9, 22 y 35 (las secciones de §D-B9 y §D-C8 y la nota de §7.3), así que no se compara con `<R>`; su diff lo revisa el manager en la revisión final de cada subentrega.
  - **Excluidos:** `docs/trabajo/AUTH-03-ajustes-de-cuentas/` y `docs/ESTADO.md` quedan fuera de V-05.
- **V-06 (rutas):** la lista de `printRoutes` coincide con la de la ronda 0, y `RUTAS_PUBLICAS` tiene exactamente las 8 de hoy más las nuevas de la subentrega.

### Antes de empezar (orquestador)
0. **Hecho el 2026-09-28** (`aprobacion.md`):
   - el manager revisó el plan y la Enmienda 1;
   - el humano aprobó por escrito con todas las recomendaciones y resolvió P-01;
   - las bases y el hash de `AGENTS.md` están anotados.

   No hay commit de aprobación. El orquestador pide la revisión rápida de esta Enmienda 2 al manager y, con su APROBADO, empieza el paso 1 sin esperar indicaciones.

### AUTH-03a
1. **Tester, ronda 0 de 03a** (§D-A4, incluida C-5b de `estatico-r1`, y "Puntos de ataque", ronda 0). Base `<R>`.
2. **Programador, precondiciones:**
   - PA-01 y PA-02;
   - `git diff --name-only <R> -- shared backend frontend` lista solo las `*.ataque` de la ronda 0;
   - V-01 con la tabla de la ronda 0.
3. `shared/`: `cuentas.ts` e `index.ts`; `npm run build` desde `shared/`.
4. `core/`: `cambio-de-contrasena.ts`, `normalizacion.ts` y sus pruebas; `npm test` de esos archivos.
5. `adapters/db`: `usuarios.ts` (`cambiarContrasenaPropia`), `tokens-cuenta.ts` e `index.ts`.
6. `handlers/auth/cuentas.ts` (con el filtro previo de M-02) y `middleware/rutas-publicas.ts`; `handlers/README.md` y `middleware/README.md`.
7. Pruebas del backend ("Pruebas requeridas", 03a) y la suite completa del backend. Los rojos deben ser exactamente los de la ronda 0 del backend; al terminar, ninguno.
8. `frontend/`: `features/auth` (`types.ts`, `data.ts`, `hooks.ts`, los dos formularios y la vista) y sus pruebas. Suite completa del frontend: los rojos esperados (incluidos los de `estatico-r1`) → ninguno.
9. `docs/DESIGN.md` §7.3 (la nota de la temporal), a mano.
10. V-01 a V-06. `resumen-programador.md`, sección "AUTH-03a", con la salida de cada V y la respuesta a cada PA ("no se activó" o "se activó y me detuve").
11. **Tester, rondas 1 a 3 de 03a.** **Manager, final de 03a** (incluye el diff línea por línea de las `*.ataque` de la ronda 0, R-10).
12. **Cierre de 03a (orquestador), con el APROBADO del manager:**
    - aplica los textos de documentos marcados 03a y anota sus SHA-256 en `aprobacion.md`;
    - actualiza `docs/ESTADO.md`;
    - da al humano el resumen (15 líneas como máximo) y el bloque de comandos;
    - tras el commit, lee el hash con `git log` y lo anota como `<Ca>`.

### AUTH-03b
13. **Tester, ronda 0 de 03b** (§D-B7, incluida C-14 de `estatico-r1`). Base `<Ca>`.
14. **Programador, precondiciones** (como en el paso 2, con `git diff --name-only <Ca> -- shared backend frontend`).
15. `shared/enlaces-registro.ts` e `index.ts`; build.
16. `core/auth/enlaces-registro.ts` y sus pruebas.
17. **Migración:** `schema.prisma`; `npx prisma migrate dev --create-only --name enlaces_registro`; revisión del SQL contra §D-B2 (PA-03); `npx prisma migrate dev` una sola vez; V-03.
18. `adapters/auth/enlaces-registro.ts` e `index.ts`; `adapters/db/enlaces-registro.ts`, `usuarios.ts` (`NuevoUsuario`) e `index.ts`; `adapters/README.md`.
19. `handlers/auth/registro-maestro.ts`, `handlers/admin.ts`, `middleware/rutas-publicas.ts` y `app.ts`; los README.
20. Pruebas del backend de 03b y la suite completa.
21. `frontend/`: `lib/cache-de-mutaciones.ts`, `components/estado-vacio.tsx`, `components/ui/table.tsx` y `badge.tsx`, `components/layout/data.ts`, `router.tsx`, `services/`, `features/auth` (registro de maestro) y `features/admin` (maestros y enlaces), con sus pruebas, respetando la regla de M-13. Suite completa.
22. `docs/DESIGN.md` (§D-B9, incluido §7.10), a mano.
23. V-01 a V-06. `resumen-programador.md`, "AUTH-03b".
24. **Tester, rondas 1 a 3 de 03b. Manager, final de 03b** (incluye los patrones nuevos de `DESIGN.md`).
25. **Cierre de 03b (orquestador):** como en el paso 12, con los textos marcados 03b. El hash queda como `<Cb>`.

### AUTH-03c
26. **Tester, ronda 0 de 03c** (§D-C9). Base `<Cb>`.
27. **Programador, precondiciones** (como en el paso 2, con `git diff --name-only <Cb> -- shared backend frontend`).
28. `shared/cuentas.ts` e `index.ts`; build.
29. `core/auth/invitacion-masiva.ts`, `core/correo/ritmo.ts` y sus pruebas.
30. **Migración:** `schema.prisma`; `--create-only --name tokens_cuenta_tipo_creado_en`; revisión contra §D-C2; `migrate dev` una sola vez; V-03.
31. `adapters/queue/index.ts` (`encolarVarios`) y su prueba de PA-05, **antes de seguir**. Después, `adapters/db/invitaciones.ts` (bloqueo con `$executeRaw`, o la alternativa de M-04) e `index.ts`, y `adapters/README.md`.
32. `config/env.ts` y su prueba; `backend/.env.example`; `handlers/admin.ts` y `app.ts`; `workers/index.ts` (ritmo de 250 ms con el envoltorio de M-09); los README.
33. Pruebas del backend de 03c y la suite completa.
34. `frontend/`: `components/ui/textarea.tsx`, `features/admin` (panel de la masiva y resultado) y sus pruebas, respetando la regla de M-13. Suite completa.
35. `docs/DESIGN.md` (§D-C8), a mano.
36. V-01 a V-06. `resumen-programador.md`, "AUTH-03c".
37. **Tester, rondas 1 a 3 de 03c. Manager, final de 03c.**
38. **Comprobación humana** (abajo). El orquestador la escribe en `comprobacion-humano.md`. Un "no pasa" se escala: los ajustes visuales van por el carril trivial; lo que cambie la lógica, al carril que corresponda.
39. **Documentos de 03c (orquestador):** aplica los textos marcados 03c y anota sus SHA-256 en `aprobacion.md`; actualiza `docs/ESTADO.md` con el cierre del encargo.
40. **Cierre de 03c (orquestador):** resumen (15 líneas como máximo) y bloque de comandos; tras el commit, lee el hash con `git log` y lo anota como `<Cc>`. El humano decide el PR.

### Comprobación humana en navegador (una sola, al final de 03c; máximo 10 minutos y 6 puntos; solo lo que las pruebas no ven)
Con la API, el worker y la SPA en local, que arranca el humano. Los correos se abren desde `backend/tmp/correos/`. Ningún agente abre navegadores.
- **H-1.** En `/admin`, restablece la contraseña de una cuenta de prueba, entra con la temporal y comprueba que `/cambiar-contrasena` pide solo la nueva y su confirmación, y que te lleva al dashboard. Es el único punto que prueba en real la cookie de B-03 (proxy de Vite, `Path` y `SameSite`).
- **H-2.** Invita a un maestro desde `/admin` y abre el HTML del correo. En `/establecer-contrasena` debe verse su nombre. Corrígelo, activa la cuenta y comprueba que la barra superior muestra el nombre corregido.
- **H-3.** En `/admin/maestros`, genera un enlace, usa "Copiar enlace" y regístrate con él en una ventana privada. De vuelta en la lista, el enlace debe mostrar 1 registrado con su nombre. Después revócalo y vuelve a abrirlo en la misma ventana privada: debe decir que no es válido.
- **H-4.** Envía una invitación masiva con una lista mixta (dos válidas, una sin nombre, un correo ya existente, una inválida y una repetida). Comprueba el resumen y que en `backend/tmp/correos/` aparezcan solo los correos enviados, con el nombre provisional en el de la línea sin nombre.
- **H-5.** A 360 px, en `/admin/maestros`, la tabla se desplaza dentro de su contenedor y la página no; la barra inferior muestra "Cuentas" y "Maestros".
- **H-6.** En **un solo navegador** (el que uses a diario, Chrome o Edge), comprueba que el gestor de contraseñas:
  - sugiere una contraseña nueva en `/registro-maestro` y en `/cambiar-contrasena`;
  - no rellena el formulario de invitación en `/admin` ni la lista en `/admin/maestros` (N-02 de AUTH-02b).

Lo demás queda "no verificado por decisión del humano, cubierto por pruebas automáticas". El contraste de las insignias lo cubre `tokens.test.ts`.

### No se toca
Nadie modifica estas rutas, salvo lo que diga "Cambios por capa" para la subentrega en curso. La base es la de V-05. Los archivos protegidos que cambie el orquestador con autorización del humano se verifican contra su SHA-256.

**Común a las tres subentregas**
- `infra/**`, `.claude/**`, `.codex/**`.
- `AGENTS.md`, `CLAUDE.md` y `README.md`: solo el orquestador, con autorización del humano, y con hash anotado.
- `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-ESSENTIALS.md` y `docs/PRD.md`: solo el orquestador, al cerrar cada subentrega, con hash anotado.
- `docs/ESTADO.md` (orquestador) y `docs/design/**`.
- `docs/trabajo/**` fuera de esta carpeta. Dentro de ella:
  - `plan.md` (arquitecto);
  - `revision.md`, salvo el manager (M-11);
  - `aprobacion.md` y `comprobacion-humano.md`, salvo el orquestador.

  Cada agente escribe solo su entregable (`resumen-programador.md`, `reporte-tester.md`).
- Raíz: `package.json`, `package-lock.json`, `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `tsconfig.base.json`, `.gitignore`, `.gitattributes`, `.nvmrc`.
- **Backend:**
  - `package.json`, `prisma.config.ts`, `vitest.config.ts`, `tsconfig*.json` y cualquier `.env`;
  - las migraciones existentes;
  - `src/server.ts`, `src/worker.ts`, `src/scripts/**`;
  - `src/config/{auth,cola,correo,logger}.ts`;
  - `src/adapters/notifier/**`;
  - `src/adapters/auth/{contrasenas,contrasena-temporal,estado,tokens,refresco,tokens-cuenta}.ts`;
  - `src/adapters/db/{cliente,bloqueo-usuario,sesiones,salud,errores}.ts`;
  - `src/adapters/queue/colas.ts`;
  - `src/middleware/**`, salvo `rutas-publicas.ts` y `README.md`;
  - `src/handlers/auth/index.ts`, `src/handlers/auth/cookie.ts`, `src/handlers/{errores,salud,usuarios,validacion}.ts`;
  - `src/core/correo/{plantillas,fallos,notifier}.ts`, `src/core/eventos/**`, `src/core/auth/{autorizacion,intentos,me,sesiones,recuperacion,respaldo,tokens-cuenta,enlaces,contrasena-temporal}.ts`;
  - `src/workers/correo-de-cuenta.ts`;
  - `test/global-setup.ts`, `test/setup.ts`, `test/entorno-de-pruebas.ts`.
- **Frontend:**
  - `package.json`, `components.json`, `tsconfig*.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `.env*`;
  - `src/main.tsx`, `src/test/setup.ts`;
  - `src/styles/**`, salvo `tokens.test.ts` si §3 no cubre un par;
  - `src/app/require-*.tsx`, `providers.tsx`, `fondo-de-la-app.tsx`;
  - `src/services/{tokenAcceso,navegacion,liveService}.ts`;
  - `src/components/layout/**`, salvo `data.ts` y `contenedor-rol.test.tsx` (03b);
  - `src/components/ui/{button,button-variants,card,dialog,input,label,sonner}.tsx`;
  - `src/components/{mensaje-error,error-de-campo,cargando,avatar-usuario}.tsx`, `src/lib/utils.ts`, `src/lib/format.ts`;
  - `src/features/admin/cuentas-view.tsx` y los componentes existentes de `src/features/admin/components/**` (`buscador-de-cuenta`, `ficha-de-cuenta`, `contrasena-temporal`, `formulario-corregir-correo`, `formulario-invitar-maestro`);
  - `src/features/diagnostico/**`;
  - `src/features/auth/components/{campo-contrasena,formulario-login,formulario-registro,formulario-recuperar,panel-anuncios,tarjeta-de-cuenta}.tsx` y `campo-contrasena.test.tsx`;
  - `src/features/auth/{login-view,registro-view,recuperar-view,restablecer-view,acceso-restringido-view,bienvenida-view}.tsx`.
- **Para el programador:** todo `*.ataque.test.*`. **Para el tester:** el código de producción y las pruebas normales.

**AUTH-03a, además:** todo lo que "Cambios por capa" asigna a 03b o 03c, en particular:
- `app.ts`, `admin.ts` y `schema.prisma`;
- `router.tsx`, `services/**` y `components/layout/data.ts`;
- `components/estado-vacio.tsx` y `features/admin/**`.

**AUTH-03b, además:**
- lo que "Cambios por capa" asigna solo a 03a: `core/auth/cambio-de-contrasena.ts`, `adapters/db/tokens-cuenta.ts`, `handlers/auth/cuentas.ts` y los formularios de cambio y de nueva contraseña;
- lo que asigna a 03c.

**AUTH-03c, además:** lo que "Cambios por capa" asigna solo a 03a o 03b:
- `handlers/auth/**`, `adapters/auth/**`, `adapters/db/{usuarios,tokens-cuenta,enlaces-registro}.ts` y `middleware/rutas-publicas.ts`;
- `router.tsx`, `services/**` y `features/auth/**`;
- `components/estado-vacio.tsx` y `components/ui/{table,badge}.tsx`.
