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

  Vale siempre **el último hash anotado** de cada archivo (M-14). Los textos aplicados en el cierre de 03a son los siete bloques de `revision.md`, "Revisión final — AUTH-03a", sección 7. Las cifras del README las contó el orquestador con `vitest run --reporter=json`: backend 68 archivos y 733 pruebas, 366 de ellas adversarias en 24 archivos; frontend 54 archivos y 914 pruebas, 567 adversarias en 28 archivos. Todas en verde.

## Arbitraje de PA-07 (AUTH-03a, ronda 2)
El tester se detuvo en la ronda 2 porque cada corrida del backend registra 2 `P2028`. El orquestador comprobó que ya aparecían en la corrida de la base y que los provoca a propósito el bloque de AUTH-02 "transacciones que Prisma cierra por tiempo (P2028)" de `cuentas-r3.ataque`. El manager arbitró (`revision.md`, "Arbitraje de PA-07 (AUTH-03a, ronda 2)"): se excluyen solo esos dos, identificados por su ruta y su llamada; cualquier otro activa la parada. El arquitecto lo incorporó al plan (Enmienda 3). No lo escaló al humano porque no toca producto ni arquitectura.

## Cierre de AUTH-03a (2026-09-28)
- **Tester:** ronda 0 sin hallazgos. Ronda 1 ROTO por T-01 (media): faltaban las pruebas normales que exigía el plan. Ronda 2 ROTO por T-02 (media): la corrección de T-01 había borrado 9 casos de AUTH-02 en `invitacion.integracion`. Ronda 3 RESISTE.
- **Manager:** APROBADO, sin problemas que bloqueen. Desviación 1 (`config/logger.ts` conserva la censura de `contrasenaActual`): justificada; se corrigió la redacción de V-04 (Enmienda 4). Pendientes M-17 y M-18, en `docs/ESTADO.md`.
- **Revisión humana del diff:** no obligatoria (cambio de proceso).

## Commits de las subentregas
| Subentrega | Commit | Anotado por |
|---|---|---|
| AUTH-03a | pendiente | orquestador, con `git log` |
| AUTH-03b | pendiente | ídem |
| AUTH-03c | pendiente | ídem |
