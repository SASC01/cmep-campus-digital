# Aprobación — AUTH-03 · ajustes de cuentas

Registro de las decisiones del humano. Lo escribe el orquestador.

## Aprobación del plan (2026-09-28)
El humano **aprobó por escrito** el plan (carril sensible, las tres subentregas) después de la revisión del manager y de la Enmienda 1.

### Respuestas a la tabla de preguntas
| ID | Decisión del humano |
|---|---|
| B-01 | (A), con los datos de Resend que dio el humano (ver abajo). `INVITACIONES_LIMITE_DIARIO = 80` se queda |
| B-02 | (A): nombre provisional (parte local, correo completo, "Maestro invitado") |
| B-03 | (B): sesión viva del mismo usuario en la cookie de refresco, con el filtro previo de M-02 |
| N-01 a N-06 | (A) en todas, como recomendaron el arquitecto y el manager |
| P-01 | Resuelto por el humano con `git restore` de `frontend/src/features/auth/components/campo-contrasena.test.tsx`. El orquestador comprobó con `git status` que el archivo ya no tiene cambios |
| P-02 | (A): "Cargar más" solo en `/admin/maestros`; ADMIN decide la forma de la tabla de usuarios |

### Datos de Resend (B-01), según la documentación oficial que consultó el humano
- Plan gratuito: 100 correos al día, por día calendario UTC (se reinicia a medianoche UTC).
- Límite de ritmo: 10 peticiones por segundo por equipo.
- **Ritmo del worker: 250 ms entre correos**, en lugar de los 600 ms del plan (S-04, §D-C5, R-06 y los textos de §9 y ESSENTIALS).
- Pendiente para DEPLOY, anotado en `docs/ESTADO.md`: "Evaluar plan de pago de Resend: 100/día es insuficiente para 1,500 usuarios en producción."

### Segunda corrección del plan
El humano dio luz verde a una Enmienda 2 corta, con revisión rápida del manager:
- M-09 a M-13 de la revisión del manager ("Revisión de la enmienda 1").
- El ritmo de 250 ms y los datos de Resend de arriba.
- El cambio de proceso de abajo.

## Cambio de proceso (2026-09-28), para todos los encargos
Decisión del humano, registrada en `AGENTS.md`, subsección "Commits y cierre de subentregas" (la aplicó el orquestador con autorización del humano):
1. No hay commit de aprobación del plan. La base de "No se toca" es el commit con que arrancó la rama.
2. Un commit por subentrega (03a, 03b y 03c), nada intermedio. Al cerrar cada una, el orquestador da al humano el bloque de comandos listo para copiar (status, add y commit).
3. El orquestador nunca pide un hash: lo lee con `git log` después del commit del humano.
4. La revisión humana del diff deja de ser obligatoria: basta el APROBADO del manager y las rondas del tester. Al cerrar cada subentrega, el orquestador da un resumen de máximo 15 líneas.
5. El orquestador solo se detiene a preguntar si algo queda BLOQUEADO o surge una decisión que el plan no cubre.

Además cambiaron la fila del carril sensible (la revisión del diff pasa a ser opcional) y el inicio de "Trabajo visual" (remite a la subsección nueva).

## Bases y hashes
- **Commit con que arrancó la rama** `feat/auth-03-ajustes-de-cuentas`: `53b3126` ("docs: DESIGN-01 en encargos completados"). Es la base de "No se toca" fuera de los paquetes para todo el encargo y dentro de los paquetes para 03a.
- **Archivos protegidos que cambió el orquestador con autorización del humano** (se verifican contra el hash, no contra el commit):

  | Archivo | SHA-256 | Motivo |
  |---|---|---|
  | `AGENTS.md` | `BCF186658AC6EC407EAB97062AAACA80EC256CDD28DBFBFC77D18CFBF5C0E5FD` | Cambio de proceso del 2026-09-28 |
  | `docs/ARCHITECTURE.md` | `1EC918DC0D37851526B9C251DEE8EB19A2962DEA446962EBDA21D570166C47DF` | Cierre de 03a: §6 "Maestros" (texto propio de 03a), "Recuperación de contraseña", "Respaldo" y §7, fila `auth` |
  | `docs/ARCHITECTURE-ESSENTIALS.md` | `7AD09943E5DD7F1107907F256BD8E531C5A0F6C9EFE8D2A87EA67AB2D1C320B5` | Cierre de 03a: "Autenticación", "Respaldo por el admin" |
  | `CLAUDE.md` | `7B5E7DA60E0BF75C01C91E93E02B9FBA1B4B06A239B932CD1C89428CB67B3275` | Cierre de 03a: fila `auth` de la tabla de módulos |
  | `README.md` | `590972084A6328B56AA3E9525A11955F1583B3CA8228637FFB0814F16B72D998` | Cierre de 03a: cifras de pruebas de §7 |

  | `docs/ARCHITECTURE.md` | `8BFBADF29A238265612F846A2286B4B971CF27B4C51FDE7ABEEFFBB0C19F6AF3` | Cierre de 03b: §6 "Maestros" (dos formas), §7 filas `auth` y `admin`, §14 diagrama y filas `usuarios` y `enlaces_registro` |
  | `docs/ARCHITECTURE-ESSENTIALS.md` | `170E850082D27B16115087C808F949FFBB3313C590D2E29B5A49E61819EFC3CB` | Cierre de 03b: "Autenticación", "Maestros", y "Tablas" |
  | `CLAUDE.md` | `CD7D2AF10ABD0A3DC52960938E73907E0309D99567F71D71DE284376C50FAB76` | Cierre de 03b: filas `auth` y `admin` de la tabla de módulos y "Ubicaciones compartidas" |
  | `README.md` | `DFDA96198C821439F7F03979EEEF7D616C6EAFC374A698FF45E628954BA31BEE` | Cierre de 03b: cifras de pruebas de §7 (backend 74 / 838, 409 adversarias en 27 archivos; frontend 63 / 985, 600 adversarias en 31 archivos, contadas por el orquestador con `vitest run --reporter=json`) |

  | `AGENTS.md` | `9DAD8ADE065061EB2467BF8EBFB870D5F193EFCE625437D7039CF60E3B19218C` | Antes de 03c: "Resúmenes verificables del programador" (decisión del humano, 2026-09-28) |
  | `.claude/agents/programador.md` | `D8228AD8149F96B5BDD42E9FB61B60B7E21385784F7AEC5C17F1E51DF9285BAA` | Ídem: "Resumen verificable" y el formato de la respuesta final |
  | `.claude/agents/manager.md` | `83D178F2C4FBA73C90295541C61C4F8E92D8E5D5B8B75591184153540A60BCC0` | Ídem: "Verificación del resumen del programador" |

  | `docs/ARCHITECTURE.md` | `8BC3570DC56E45FBB43A051AB84525B20618560E4337E900EFA667033CEEB34F` | Cierre de 03c: §6 "Maestros" (tres formas), §7 fila `admin`, §8 `CORREO_DE_CUENTA`, §9 (plan de Resend y ritmo real), §14 `tokens_cuenta` y "Altas en lote", §18 (dos viñetas) |
  | `docs/ARCHITECTURE-ESSENTIALS.md` | `DBC045F7E599C56C83E3DE899A5BA7F1966B61635A262982E48453136E931387` | Cierre de 03c: "Autenticación" ("o masiva") y "Asíncrono" |
  | `CLAUDE.md` | `665C32111820381AA181B4242D12CF773E6C8B3B7B62A73A15FE42CFB8718F6B` | Cierre de 03c: fila `admin` ("e invitación masiva") y `textarea.tsx` |
  | `README.md` | `E3F544884FBEFA37142ABDEBEEC9DC66928D1DAF689063C540A95BDE1439E918` | Cierre de 03c: backend 82 / 932 (447 adversarias en 32 archivos); frontend 65 / 1007 (612 adversarias en 32 archivos), contadas con `vitest run --reporter=json` |

  | `README.md` | `38027AAC98B2977F405B034B814F39AC05C60AA62A253ABC69248E36AF7F04D3` | Carril trivial de 03c (singular del cupo): backend 82 / 933. Las adversarias no cambian |

  Vale siempre **el último hash anotado** de cada archivo (M-14). Los textos aplicados en el cierre de 03a son los siete bloques de `revision.md`, "Revisión final — AUTH-03a", sección 7. Las cifras del README las contó el orquestador con `vitest run --reporter=json`: backend 68 archivos y 733 pruebas, 366 de ellas adversarias en 24 archivos; frontend 54 archivos y 914 pruebas, 567 adversarias en 28 archivos. Todas en verde.

## Arbitraje de PA-07 (AUTH-03a, ronda 2)
El tester se detuvo en la ronda 2 porque cada corrida del backend registra 2 `P2028`. El orquestador comprobó que ya aparecían en la corrida de la base y que los provoca a propósito el bloque de AUTH-02 "transacciones que Prisma cierra por tiempo (P2028)" de `cuentas-r3.ataque`. El manager arbitró (`revision.md`, "Arbitraje de PA-07 (AUTH-03a, ronda 2)"): se excluyen solo esos dos, identificados por su ruta y su llamada; cualquier otro activa la parada. El arquitecto lo incorporó al plan (Enmienda 3). No lo escaló al humano porque no toca producto ni arquitectura.

## Enmienda 5 (ronda 0 de 03b)
El tester encontró en la ronda 0 de 03b dos casos de `clases-r1.ataque` que 03b contradice y que el inventario no cubría: el conteo de `enEspera=` (T-03) y la lista de archivos con texto rojo (T-04). El arquitecto los incorporó como C-15, C-16 y C-17. El manager la aprobó y agregó M-19: las variantes de la insignia no se exportan desde `badge.tsx`. El orquestador comprobó con `git diff d8cb198` que el plan no cambió fuera de la Enmienda 5.

## Arbitraje de T-07 y T-10 (AUTH-03b, ronda 1)
El manager decidió, sin escalar al humano porque son detalles de diseño del encargo (`revision.md`, "Arbitraje de T-07 y T-10 (AUTH-03b, ronda 1)"):
- **T-07:** el registro por enlace toma `FOR NO KEY UPDATE` en lugar de `FOR SHARE`, así la revocación no puede esperar sin límite. La revocación toma primero el bloqueo y fija `revocado_en` después.
- **T-10:** los cuatro botones de fila tienen un nombre accesible único, con la fecha de creación legible (`formatearFechaHora`) en texto `sr-only` dentro del botón. Se rechazó el `aria-hidden` que había propuesto el programador. Riesgo aceptado: dos enlaces creados en el mismo minuto repetirían el nombre.
- El arquitecto lo incorporó como Enmienda 6. El orquestador comprobó con `git diff d8cb198` que el plan no cambió fuera de las Enmiendas 5 y 6. El tester ajusta en la ronda 2 los localizadores de su `maestros-03b-r1` sin cambiar lo que comprueba cada caso.
- **R-18 (lo señaló el arquitecto en la Enmienda 6):** el "Cargar más" de `RegistradosDelEnlace` repetiría su nombre si dos filas están expandidas. El orquestador le indicó al programador aplicarle el mismo patrón, porque el plan ya exige que ningún nombre de botón se repita en la vista. Lo verifica el manager en la revisión final.

## Resúmenes verificables del programador (2026-09-28, antes de 03c)
Decisión del humano, como regla permanente para todos los encargos (`AGENTS.md`, `programador.md` y `manager.md`):
1. **Propuesta del manager:** el programador indica junto a cada viñeta de "Pruebas requeridas" el archivo y el título exacto del caso que la cubre. Los conteos salen de `npx vitest list`, con el comando incluido.
2. **Medida del humano:** antes de aceptar el resumen, el manager corre `lint`, `test` y `build` y contrasta cada cifra con su propia corrida. Una cifra que no coincide devuelve el resumen al programador; no se corrige a mano.
3. **Ajuste del humano:** el resumen incluye el comando exacto y la última línea de salida de `lint`, `test` y `build`, no un "pasaron".

Interpretación del orquestador, anotada en `manager.md`: la verificación ocurre después de cada entrega del programador (implementación y cada corrección) y antes de la ronda siguiente del tester. `docs/ESTADO.md` registra que las medidas empiezan en 03c, para medir si bajan las rondas extra del tester.

## Cierre de AUTH-03c y del encargo (2026-09-29)
- **Tester:** ronda 0 sin hallazgos. Ronda 1 ROTO: T-13 (medio, pruebas del cupo intermitentes por la base compartida), T-14 y T-15 (bajos). Ronda 2 RESISTE.
- **Verificación de los resúmenes del programador**, primera subentrega con la regla nueva: el manager devolvió 2 de 5 entregas.
  - El resumen de la implementación: faltaban las líneas literales y la viñeta de "nada encolado".
  - El de la corrección de la ronda 1: las pruebas de la carrera del cupo habían quedado con margen 0 y ya no probaban la propiedad.
- **Manager:** APROBADO. Decidió las observaciones (a) a (f); las que quedan abiertas están en `docs/ESTADO.md`, sección 3.
- **Carril trivial pedido por el humano antes del commit:** el mensaje del cupo usa el singular con 1 ("1 invitación más"). El manager lo aceptó. Durante esa verificación, el "failed to find the runner" que reportó el programador desde la raíz no se reprodujo. La prueba A3 intermitente de `bloqueo-usuario.integracion` queda como `chore`, por decisión del humano, y no se corrige ahora.
- **Comprobación humana en navegador:** H-1 a H-6 "bien", el 2026-09-29, incluida una segunda pestaña en H-1 (`comprobacion-humano.md`).
- **Documentos aplicados por el orquestador:** los bloques de 03c. Sus hashes están en "Bases y hashes".
- **Commit de 03c:** pendiente. Lo hace el humano; el push y el PR también.

## Cierre de AUTH-03b (2026-09-28)
- **Tester:** ronda 0 con T-03 y T-04, resueltos por la Enmienda 5. Ronda 1 ROTO (T-05 a T-11: intermitencia de la suite, pruebas normales faltantes, registro con fecha posterior a la revocación, foco y nombres accesibles, `?? []`). Ronda 2 ROTO por T-12 (pruebas normales incompletas en `maestros-view.test.tsx`). Ronda 3 RESISTE.
- **Manager:** APROBADO. Confirmó R-18 y las tres desviaciones del programador. Pendientes M-20, M-21 y M-22, y una nota para la revisión del modelo del programador, todo en `docs/ESTADO.md`.
- **Mitigación para 03c** (propuesta del manager): el resumen del programador asocia cada viñeta de "Pruebas requeridas" con el archivo y el título exacto del caso que la cubre, y todo conteo sale de `npx vitest list`.

## Cierre de AUTH-03a (2026-09-28)
- **Tester:** ronda 0 sin hallazgos. Ronda 1 ROTO por T-01 (media): faltaban las pruebas normales que exigía el plan. Ronda 2 ROTO por T-02 (media): la corrección de T-01 había borrado 9 casos de AUTH-02 en `invitacion.integracion`. Ronda 3 RESISTE.
- **Manager:** APROBADO, sin problemas que bloqueen. Desviación 1 (`config/logger.ts` conserva la censura de `contrasenaActual`): justificada; se corrigió la redacción de V-04 (Enmienda 4). Pendientes M-17 y M-18, en `docs/ESTADO.md`.
- **Revisión humana del diff:** no obligatoria (cambio de proceso).

## Commits de las subentregas
| Subentrega | Commit | Anotado por |
|---|---|---|
| AUTH-03a | `d8cb198` (`d8cb198c9ed306b78ff276f764702ec2632d8e6e`), 2026-09-28. Es `<Ca>`, la base de 03b dentro de los paquetes | orquestador, con `git log` |
| AUTH-03b | `32afeef` (`32afeef94109f505e2cd82ceb41e8c704284f344`), 2026-09-28. Es `<Cb>`, la base de 03c dentro de los paquetes | ídem |
| AUTH-03c | pendiente | ídem |
