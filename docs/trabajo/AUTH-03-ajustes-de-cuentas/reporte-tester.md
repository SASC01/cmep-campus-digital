# Reporte del Tester — AUTH-03 · ajustes de cuentas

> **Nota de transcripción (orquestador, 2026-09-28):** el entorno impidió al tester escribir este archivo: la herramienta de escritura rechaza archivos de reporte cuando los escribe un subagente. El orquestador lo registra tal cual, a partir de la respuesta final del tester (práctica de `docs/ESTADO.md` §4). Antes de transcribirlo, el orquestador comprobó con `Get-FileHash -Algorithm SHA256` que los 47 hashes de la tabla coinciden con los archivos del árbol. También comprobó con `git status` que en los paquetes solo cambiaron archivos `*.ataque.test.*`.

---

## AUTH-03a — Ronda 0
Veredicto: ronda 0 completa, sin hallazgos. Quedan 9 casos en rojo en el backend y 28 en el frontend, y son exactamente los casos reescritos que dependen del código nuevo.

### Verificación propia
- `lint`: frontend 0 y backend 0 (ESLint, Prettier y `tsc`).
- `test` antes de tocar nada: frontend 875/875 y backend 657/657 en verde.
- `test` después de las reescrituras: frontend 28 fallidas de 875; backend 9 fallidas de 657.
- Formateé con Prettier solo los 16 archivos tocados, desde su paquete.
- En los paquetes solo cambiaron `*.ataque.test.*`. `shared/` no se tocó.

### Precondiciones
**PA-02 no se activó:**
- La rama es `feat/auth-03-ajustes-de-cuentas`, con HEAD en `53b3126`, y la base existe.
- `git diff --name-only 53b3126 -- backend shared frontend` y `git status --porcelain -- backend shared frontend` estaban vacíos.
- Fuera de los paquetes solo cambiaban `AGENTS.md`, `docs/ESTADO.md` y la carpeta del encargo.
- El SHA-256 de `AGENTS.md` es `BCF186658AC6EC407EAB97062AAACA80EC256CDD28DBFBFC77D18CFBF5C0E5FD`, igual al de `aprobacion.md`.
- No hay una tabla V-01 anterior: la de este reporte es la primera.

**PA-01 no se activó.** La comprobé antes de cada corrida del backend:
- La regla "Campus: bloquear entrada a Docker en redes publicas" responde `True Inbound Block Public`.
- La red activa es `IZZI-F281` (perfil Public), declarada de confianza por el humano.
- Docker Desktop responde (motor 28.5.1).

**PA-11 no se activó.** Ryuk seguía arriba a los 53 s de terminar la corrida y ya no estaba cuando lo revisé de nuevo, antes de los 120 s.

### Casos reescritos por archivo
Cada caso lleva un comentario `AUTH-03a ronda 0 (C-n)` que explica qué cambió y qué sigue protegiendo.

**Backend (9, todos en rojo):**

| Archivo | Casos | C-n | Qué cambia | Qué sigue protegiendo |
|---|---|---|---|---|
| `backend/test/cuentas-r1.ataque.test.ts` | `:385` | C-2 | Con la cookie de otro usuario: antes 204, ahora 401 `SESION_INVALIDA`. Queda 1 sesión viva de A y 1 de B, la bandera sigue y la contraseña nueva no entra | La sesión ajena no se conserva ni se revoca, y nada del usuario cambia |
| ídem | `:412` | C-2 | El restringido con bandera lleva la cookie de su login con la temporal y espera 204. El segundo cambio sigue en 409 | Después del cambio solo ve `/me` (RN-03) |
| ídem | `:462` | C-1 | Con cookie: 5 intentos con `CONTRASENA_REPETIDA` y la 6.ª, con una nueva válida | La 6.ª responde 429 y la bandera sigue |
| `backend/test/cuentas-r2.ataque.test.ts` | `:219` | C-2 | Se agrega una sesión propia P y el cambio lleva la cookie de P mientras la sesión ajena se rota. Espera 204 y que la única sesión viva sea P | La cookie rotada de la ajena no refresca (DEC-09) |
| `backend/test/cuentas-r3.ataque.test.ts` | `:316` | C-2 | Espera 200 y 401. Queda 1 sesión viva (la del login) y la contraseña nueva no entra | La bandera sigue |
| ídem | `:465` | C-2 | Espera 401 y 401, con 0 sesiones vivas | La bandera sigue |
| ídem | `:520` | C-2 | Espera 200 y 401. Queda 1 sesión viva (S') y la contraseña nueva no entra | La bandera sigue; la decisión se toma bajo el bloqueo (PB-4) |
| `backend/test/logs-cuentas-r1.ataque.test.ts` | Paso "cambiar incorrecta" y precondición `:268` | C-1 | La nueva viaja igual a la temporal. La temporal incorrecta viaja como `contrasenaActual`, el campo que manda un cliente viejo, para que la revisión del log siga teniendo sentido. La precondición exige el código `CONTRASENA_REPETIDA` | Ningún secreto en el log |
| `backend/test/sesiones-y-cadena.ataque.test.ts` | `:432` | C-4 | Se agrega `POST /api/auth/invitacion` a la lista exacta de rutas | Ninguna ruta crea administradores |

**Frontend (68 instancias de Vitest reescritas o adaptadas; 28 en rojo):**

| Archivo | Reescritos | En rojo | C-n | Qué cambia |
|---|---|---|---|---|
| `frontend/src/components/layout/estatico-r1.ataque.test.ts` | 3 casos, más el título del `describe` | 3 | C-5b | La `TABLA` pierde la fila de la temporal. `:183` pasa a 6 campos y a `2` en `formulario-cambiar-contrasena.tsx`. `:196` se adapta sola. `:214` queda con 3 textos, sin `mostrarTemporal`. El título pasa de "los 7 campos" a "los campos" |
| `frontend/src/app/cuentas-r1.ataque.test.tsx` | 11 | 11 | C-5 | `llenarCambio` ya no llena la temporal. El caso de caché `:215` pierde la aserción sobre la temporal |
| `frontend/src/app/cuentas-r2.ataque.test.tsx` | 6 | 6 | C-5 | Igual que el anterior; las aserciones de caché ahora buscan la nueva |
| `frontend/src/app/contrasena-r1.ataque.test.tsx` | 21 | 4 | C-5, C-1 y C-6 | El caso "cambio obligatorio" usa `[nueva, confirmación]` y el error `CONTRASENA_REPETIDA`. El stub responde `/api/auth/invitacion`. CC-3 pasa a la nueva y la confirmación. Se quita la aserción sobre la temporal |
| `frontend/src/app/contrasena-r2.ataque.test.tsx` | 10 | 1 | C-5 | Remapeo de la temporal a la nueva y de la nueva a la confirmación, con valores de la misma longitud |
| `frontend/src/app/en-espera-r1.ataque.test.tsx` | 2 | 1 | C-5, C-1 y C-6 | Sin la temporal, error `CONTRASENA_REPETIDA` y stub de `/api/auth/invitacion` |
| `frontend/src/app/marco-r1.ataque.test.tsx` | 2 | 1 | C-5 y C-6 | `:239` sin la temporal. La pantalla `/establecer-contrasena` con token recibe un manejador que responde la invitación |
| `frontend/src/app/contexto-r1.ataque.test.tsx` | 1 | 0 | C-6 | Stub de `/api/auth/invitacion` |
| `frontend/src/app/errores-r1.ataque.test.tsx` | 1 | 1 | C-5 | El envío vacío pasa de 2 a 1 campo inválido. Estaba fuera del inventario |
| `frontend/src/features/auth/enlace-r1.ataque.test.tsx` | 1 (`:301`) | 0 | C-6 | El stub responde la invitación con un nombre; espera el botón antes de llenar |
| `frontend/src/features/auth/enlace-r2.ataque.test.tsx` | 3 (`:143` ×2 y `:207`) | 0 | C-6 | Igual que el anterior |

Los reescritos que hoy están en verde son compatibles con el código actual y con el de 03a, y **deben seguir en verde** después del programador.

`fondo-r1` no cambia: no monta `/establecer-contrasena` con token.

### Rojos esperados
Quedan en rojo hasta que el programador termine 03a. Cualquier otro rojo, o que uno de estos siga en rojo al final, activa PA-06.

**Backend (9):**
- B-1 `backend/test/cuentas-r1.ataque.test.ts:385` "con la cookie de OTRO usuario: 401 SESION_INVALIDA, la sesión ajena sigue viva y nada del usuario cambia" (C-2)
- B-2 `backend/test/cuentas-r1.ataque.test.ts:412` "un restringido con bandera cambia la contraseña con su cookie y después solo ve /me; un segundo cambio → 409" (C-2)
- B-3 `backend/test/cuentas-r1.ataque.test.ts:462` "tras 5 CONTRASENA_REPETIDA con la cookie propia, la 6.ª con una nueva VÁLIDA también es 429 y la bandera sigue" (C-1)
- B-4 `backend/test/cuentas-r2.ataque.test.ts:219` "el cambio obligatorio de contraseña con la cookie propia no deja viva la sesión ajena que un refresco concurrente acaba de rotar" (C-2)
- B-5 `backend/test/cuentas-r3.ataque.test.ts:316` "login con la temporal que termina antes de cambiar-contrasena (sin cookie): 200 y 401, sin 5xx; la bandera sigue" (C-2)
- B-6 `backend/test/cuentas-r3.ataque.test.ts:465` "reutilización y cambiar-contrasena con la cookie vigente a la vez: 401 y 401, sin 5xx, 0 sesiones vivas y la bandera sigue" (C-2)
- B-7 `backend/test/cuentas-r3.ataque.test.ts:520` "cambiar-contrasena con la cookie S mientras la misma S se refresca: 200 y 401, la decisión se toma bajo el bloqueo (S ya reemplazada) y la bandera sigue" (C-2)
- B-8 `backend/test/logs-cuentas-r1.ataque.test.ts:268` "el recorrido llegó a cada ruta con el resultado esperado (precondición)" (C-1)
- B-9 `backend/test/sesiones-y-cadena.ataque.test.ts:432` "bajo /api solo existen las rutas de AUTH-01, AUTH-02a y AUTH-03a: ninguna crea admins; solo /admin/maestros crea maestros" (C-4)

**Frontend (28):**
- F-1 `frontend/src/components/layout/estatico-r1.ataque.test.ts:183` "exactamente 6 <CampoContrasena, solo en los 4 formularios: 1, 1, 2 y 2" (C-5b)
- F-2 `frontend/src/components/layout/estatico-r1.ataque.test.ts:196` "cada campo lleva, en orden, la constante de su fila de la tabla, sin type ni aria-label" (C-5b)
- F-3 `frontend/src/components/layout/estatico-r1.ataque.test.ts:214` "TEXTOS_CAMPO_CONTRASENA tiene exactamente los 3 textos de §D-7, sin mostrarTemporal, y vive solo en features/auth/data.ts" (C-5b)
- F-4 `frontend/src/app/cuentas-r1.ataque.test.tsx:188` "cambia la contraseña y termina en /acceso-restringido, sin pasar por su dashboard" (C-5)
- F-5 `frontend/src/app/cuentas-r1.ataque.test.tsx:215` "tras cambiarla y llegar al dashboard, la contraseña nueva no queda en la caché de mutaciones" (C-5)
- F-6 `frontend/src/app/cuentas-r1.ataque.test.tsx:248` "token vencido: refresca una vez, reintenta con el nuevo y llega al dashboard" (C-5)
- F-7 `frontend/src/app/cuentas-r1.ataque.test.tsx:274` "si el refresco falla, la sesión se pierde y se va a /login (una sola vez)" (C-5)
- F-8 a F-11 `frontend/src/app/cuentas-r1.ataque.test.tsx:339`, cuatro casos (C-5):
  - "429 DEMASIADOS_INTENTOS: alerta con su mensaje y se queda en el formulario"
  - "400 CONTRASENA_ACTUAL_INCORRECTA: alerta con su mensaje y se queda en el formulario"
  - "400 CONTRASENA_REPETIDA: alerta con su mensaje y se queda en el formulario"
  - "400 VALIDACION: alerta con su mensaje y se queda en el formulario"
- F-12 `frontend/src/app/cuentas-r1.ataque.test.tsx:357` "dos envíos en el mismo instante hacen una sola petición" (C-5)
- F-13 `frontend/src/app/cuentas-r1.ataque.test.tsx:381` "409 CAMBIO_NO_REQUERIDO (ya se cambió, por ejemplo en otra pestaña): sale del formulario hacia su dashboard" (C-5)
- F-14 `frontend/src/app/cuentas-r1.ataque.test.tsx:407` "el 409 CAMBIO_NO_REQUERIDO no se presenta como un error genérico que invita a reintentar" (C-5)
- F-15 `frontend/src/app/cuentas-r2.ataque.test.tsx:117` "409 y después /me sin conexión: se queda en el formulario (no rebota a /login), con el mensaje propio y sin bucle" (C-5)
- F-16 `frontend/src/app/cuentas-r2.ataque.test.tsx:141` "409 pero /me insiste en 403 CAMBIO… (servidor incoherente): sin irA, sin bucle, /me solo una vez más" (C-5)
- F-17 `frontend/src/app/cuentas-r2.ataque.test.tsx:161` "204 con /me caído, y el reintento (ahora 409) llega al dashboard: el camino 2 de T-02 queda resuelto" (C-5)
- F-18 `frontend/src/app/cuentas-r2.ataque.test.tsx:192` "409 de un restringido: /me decide y termina en /acceso-restringido, no en su dashboard" (C-5)
- F-19 `frontend/src/app/cuentas-r2.ataque.test.tsx:210` "mientras se resuelve el /me del 409, un segundo envío no sale" (C-5)
- F-20 `frontend/src/app/cuentas-r2.ataque.test.tsx:237` "204 y la sesión se pierde al pedir /me (401 y refresco fallido): un solo irA a /login" (C-5)
- F-21 `frontend/src/app/contrasena-r1.ataque.test.tsx:359` "'cambio obligatorio': envío válido con Enter: todo oculto antes de la mutación, una sola petición, el ojo no reenvía" (C-5)
- F-22 `frontend/src/app/contrasena-r1.ataque.test.tsx:420` "'cambio obligatorio': error del servidor: tras volver a mostrarla y reenviar, vuelve a ocultarse antes de la segunda petición" (C-5 y C-1)
- F-23 `frontend/src/app/contrasena-r1.ataque.test.tsx:560` "'cambio obligatorio': ni en localStorage ni en sessionStorage, ni con éxito ni con error" (C-5 y C-1)
- F-24 `frontend/src/app/contrasena-r1.ataque.test.tsx:587` "cambio obligatorio con las contraseñas a la vista: tras el éxito, la nueva no queda en la caché de mutaciones (MF-05)" (C-5)
- F-25 `frontend/src/app/contrasena-r2.ataque.test.tsx:301` "el envío con éxito desmonta el formulario: la contraseña quedó oculta antes y no hay errores" (C-5)
- F-26 `frontend/src/app/en-espera-r1.ataque.test.tsx:220` "'cambio obligatorio': en vuelo, en espera con el foco y una sola petición; con error, sale de la espera" (C-5 y C-1)
- F-27 `frontend/src/app/errores-r1.ataque.test.tsx:72` "'/cambiar-contrasena', formulario 'Guardar y continuar' enviado vacío: 1 campos inválidos, cada uno descrito por su mensaje" (C-5, fuera del inventario)
- F-28 `frontend/src/app/marco-r1.ataque.test.tsx:239` "/cambiar-contrasena → /maestro tras cambiarla: nunca dos pies; al final, el del marco" (C-5)

Revisé en la salida por qué falla cada uno con el código de hoy, y ninguno falla por un error de la prueba:
- **Frontend:** el formulario de hoy exige la temporal, así que no envía la petición. En `errores-r1` quedan 2 campos inválidos, y en `estatico-r1`, 7 campos, la fila de la temporal y `mostrarTemporal`.
- **Backend:** la API de hoy responde 400 `VALIDACION` o `CONTRASENA_ACTUAL_INCORRECTA`, y su lista de rutas no tiene `/api/auth/invitacion`.

### Agregados fuera del inventario, con su C-n
- `app/errores-r1:72` (C-5): el envío vacío pasa de 2 a 1 campo inválido.
- `app/contrasena-r2`, todos sus casos (C-5): el plan citaba solo las constantes de `:62-66`.
- `app/contrasena-r1` (C-1 y C-5): el error del servidor pasa a `CONTRASENA_REPETIDA`, y CC-3 usaba la temporal como primer campo.
- `app/en-espera-r1` (C-1): el error del servidor pasa a `CONTRASENA_REPETIDA`.
- `app/marco-r1`, la entrada de `/establecer-contrasena` en `PANTALLAS` (C-6).
- `app/contexto-r1` (C-6): el plan pedía comprobarlo, y sí monta la pantalla con token.
- `features/auth/enlace-r2:207` (C-6): el stub respondía 204 sin cuerpo a toda ruta.

### Hallazgos
Ninguno. Busqué todos los términos del punto 2 de la ronda 0 y, además:
- `CONTRASENA_ACTUAL_INCORRECTA`, `CONTRASENA_REPETIDA`, `SESION_INVALIDA`, `getMutationCache` y `enEspera=`;
- los archivos `arquitectura-cuentas-r1`, `guarda-r2` y `logger.ataque`.

No encontré ningún caso contradicho sin un C-n que lo cubra. Para C-7, ninguna prueba afirma que una mutación de login o registro siga en la caché.

### Observaciones para el manager (no son hallazgos)
1. **`app/cuentas-r1:339`, caso "400 CONTRASENA_ACTUAL_INCORRECTA".** Conserva su expectativa porque §D-A6 mantiene la traducción de ese código para un despliegue escalonado. Interpreto el "dejan de mostrarse" de C-5 como que el servidor ya no emite ese código, no como que el frontend deje de traducirlo.
2. **Título del `describe` de `estatico-r1:150`.** Pasó de "los 7 campos" a "los campos", fuera de los tres casos de C-5b, para que no quede falso después de 03a ni en 03b.
3. **Aserciones retiradas sobre la temporal** en `app/cuentas-r1:215`, `app/cuentas-r2:161` y `contrasena-r1:560` y `:587`. Ya no se escribe en `/cambiar-contrasena`, así que quedaban vacías de sentido. La aserción sobre la nueva se conserva en todos. Que la temporal no quede en la caché del login es un punto de las rondas 1 a 3.
4. **`logs-cuentas-r1`.** El valor `incorrecta` sigue viajando, ahora como `contrasenaActual`, así que la revisión del log sigue siendo significativa.

### Tabla SHA-256 de las 47 `*.ataque` (V-01, después de formatear)
| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `4FCE3CEDF662BA3A188F21A2277DB417747D342C115EFD4746D3CFF58499289B` | `backend/src/config/env.ataque.test.ts` |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `AAE65C95CF34DB814D650AF5F7FA08D09BFF3E6FC6863D4252383058499AA10E` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` (modificado) |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` (modificado) |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` (modificado) |
| `EA078F41CC98C947D9B3966EE8ECCEC2BD5D06EACBAF7EE8CD85F38E6A697C15` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` (modificado) |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `C989C571F06678A96B7D271B9E011E389B2630EB7C5995D5B507EB427AAB6CA4` | `backend/test/sesiones-y-cadena.ataque.test.ts` (modificado) |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` (modificado) |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` (modificado) |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` (modificado) |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` (modificado) |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` (modificado) |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` (modificado) |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` (modificado) |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `4B18F80776B7B203FAB1B3587EBD790709E23EFE05D9E5C4BAED4227F113226E` | `frontend/src/app/marco-r1.ataque.test.tsx` (modificado) |
| `E58293532633DC5CFE21561E2609D170638C81886B9C31129F03864C73A34F45` | `frontend/src/app/router.ataque.test.tsx` |
| `06F35BE8AE68F0ABAE775268E4E64F3DF880FF137A9B54AA3C135941DDB93DCF` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `26DDDDFB3668635A2A0B0BCD9F4D81E17FB7B35605F42B542C2D7A308C2C66ED` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` (modificado) |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` (modificado) |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` (modificado) |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `AFB427A8379719AEB979414E328871CAC0CBDD110541C6D9C1A7490907C6AD97` | `frontend/src/styles/clases-r1.ataque.test.ts` |
| `D81ED462116AFDD16D4C8AD534941999487D8DBF5EB9DAD22DD242CF68044115` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

### No atacado y por qué
No escribí pruebas de ataque nuevas para 03a: corresponden a las rondas 1 a 3, después del programador.

Las salidas completas de las corridas y del `lint` quedaron en el scratchpad de la sesión (`frontend-base.txt`, `backend-base.txt`, `frontend-r0.txt`, `backend-r0.txt`, `frontend-lint.txt` y `backend-lint.txt`).

---

## AUTH-03a — Ronda 1
Veredicto: ROTO. Solo por T-01, que es de proceso: el código de 03a resistió todos los ataques de esta ronda (68 pruebas nuevas, todas en verde), pero faltan las pruebas normales que el plan exige y el resumen del programador no lo declara.
Verificación propia (2026-09-28): lint 0 · build 0 · test backend 714/714 (67 archivos) · test frontend 904/904 (54 archivos).

### Precondiciones y verificación
- **V-01:** coincide. Las 47 `*.ataque` de la ronda 0 tienen el mismo SHA-256 que la tabla de la ronda 0 (diff vacío).
- **PA-01 no se activó.** La comprobé antes de cada corrida del backend: la regla responde `True Inbound Block Public`, la red es `IZZI-F281` (Public) y Docker responde (28.5.1).
- **Antes de agregar mis pruebas**, desde la raíz:
  - `npm run build` y `npm run lint`: 0.
  - Backend: 671/671. Frontend: 877/877.
  - Los 37 rojos de la ronda 0 (B-1 a B-9 y F-1 a F-28) están en verde y no hay otro rojo.
- **Después de agregar mis pruebas:** `lint` 0, backend 714/714 y frontend 904/904.
- **PA-12 no se activó.** `cuentas-03a-r1` corrió 3 veces (41/41 cada vez) y las dos del frontend, 2 veces (27/27).
- **PA-11 no se activó.** Ryuk se fue antes de los 120 s; no quedó ningún contenedor de Testcontainers.
- **PA-07 no se activó.** No apareció `40P01`, `deadlock detected`, `could not serialize` ni `P2028` en ninguna corrida.
- **PA-10 no se activó** (ver `logs-03a-r1` abajo).
- En los paquetes solo agregué 4 archivos `*.ataque` nuevos; no edité ninguna `*.ataque` existente.

### Hallazgos

#### T-01 — Faltan las pruebas normales de 03a que exige el plan, y el resumen solo declara una de las omisiones
Severidad: media

Prueba: no se puede demostrar con una prueba que falle, porque es una omisión de pruebas. Reproducción:
1. `git diff --quiet 53b3126 -- backend/test/invitacion.integracion.test.ts backend/test/autorizacion-cuentas.integracion.test.ts frontend/src/features/auth/login-view.test.tsx frontend/src/features/auth/registro-view.test.tsx` responde 0: ninguno de los cuatro cambió.
2. `grep -rln "api/auth/invitacion" backend/test` no encuentra ninguna prueba normal del backend.
3. `grep -rln "getMutationCache" frontend/src --include=*.test.tsx`, sin contar las `*.ataque`, no encuentra nada.

Esperado ("Pruebas requeridas", 03a):
- `invitacion.integracion`:
  - `POST /auth/invitacion` responde `{ nombre }` exacto con `no-store`;
  - los 6 tokens inválidos dan el mismo 400;
  - establecer con nombre actualiza `nombre` y `nombre_busqueda`; sin nombre, no cambia;
  - un nombre inválido da 400 y el token sigue vivo;
  - `restablecer` con `nombre` no cambia el nombre.
- `autorizacion-cuentas.integracion`: `invitacion` es pública y un `Authorization` ajeno no cambia nada.
- `bloqueo-usuario.integracion`: la sesión pasa el filtro previo y se revoca antes del bloqueo → 401 sin escribir.
- Frontend:
  - login y registro: tras un éxito y tras un error, la contraseña no queda en ninguna mutación;
  - `/establecer-contrasena`: otro error → `MensajeError`; el envío lleva `nombre`; nombre inválido → `ErrorDeCampo` y ninguna petición; ni la clave, ni `meta`, ni `data` contienen el token, y al desmontar la consulta desaparece;
  - `/cambiar-contrasena`: `SESION_INVALIDA` con su mensaje.

Obtenido:
- `POST /api/auth/invitacion`, un endpoint nuevo, no tiene ninguna prueba normal, ni de autorización.
- No hay ninguna prueba normal de la caché del login y del registro (§D-A3).
- `establecer-contrasena-view.test.tsx` no cubre el envío con `nombre`, el nombre inválido, otro error ni la clave de la consulta.
- `cambiar-contrasena-view.test.tsx` no tiene ningún caso de `SESION_INVALIDA`.
- El resumen declara solo la prueba de `bloqueo-usuario` (desviación 4) y afirma "Pruebas del backend 03a" completas.

Sobre la desviación 4: la carrera "entre el filtro previo y el bloqueo" sí es determinista. Basta retener la fila de `usuarios` (no la de `sesiones`): la petición ya pasó el filtro, que es una lectura sin bloqueo, y queda formada en el `FOR NO KEY UPDATE`. La transacción retenedora revoca o rota la sesión antes de soltar la fila. Así lo hacen `cuentas-03a-r1.ataque.test.ts`, en los casos "entre el filtro previo y el bloqueo…" (revocación y rotación), que pasaron en 3 corridas seguidas. El motivo de intermitencia no se sostiene.

Mis pruebas de ataque cubren hoy ese comportamiento y resiste, pero no sustituyen a las pruebas normales del programador.

Requisito o regla violada: `AGENTS.md`, "Pruebas" ("Todo endpoint nuevo lleva pruebas de autorización…") y "Definición de terminado" ("Pruebas de autorización incluidas si hay endpoint nuevo"); `plan.md`, "Pruebas requeridas", 03a; paso 7 ("Pruebas del backend ('Pruebas requeridas', 03a)") y paso 8.

### Atacado sin hallazgos

**`backend/test/cuentas-03a-r1.ataque.test.ts` (41 casos, en verde).**

Cambio obligatorio:
- **JWT emitido antes del restablecimiento.** Sin cookie y con la cookie vieja da 401 `SESION_INVALIDA`; el hash y la bandera no cambian y la temporal sigue sirviendo.
- **M-02.** Diez peticiones sin una sesión viva propia dan 401 y no gastan intentos: 2 sin cookie, vacía, basura, 4 KB, revocada ×2, vencida y ajena ×2. Después, 4 `CONTRASENA_REPETIDA` y la 5.ª válida da 204. Si alguna de las 10 hubiera contado, esa sería 429.
- **La cookie de la sesión con la temporal de A con el JWT de B** (los dos con bandera): 401 y nada cambia en ninguno.
- **Una sesión propia vencida hace 1 ms:** 401.
- **Carrera entre el filtro previo y el bloqueo:**
  - con la sesión revocada: 401 sin escribir y la otra sesión del usuario sigue viva;
  - con la sesión rotada a S2: 401 sin escribir y S2 sigue viva.
- **Dos cambios simultáneos con la misma sesión:** 204 y 401, nunca 5xx; queda un solo hash, el del 204.
- **Cambio formado antes de un restablecimiento del admin:** 204 y 200. Al final manda la temporal nueva, la bandera está encendida, no queda ninguna sesión y la cookie no refresca.
- **Cuerpo con `contrasenaActual` y claves extra** (`rol`, `debeCambiarContrasena`, `accesoRestringido`, `estadoPago`, `usuarioId`, `id`, `sesionId`): 204, solo cambia la contraseña propia, sigue habiendo un solo admin y el otro usuario queda intacto.
- **La nueva igual a la temporal con mayúsculas y minúsculas invertidas:** 204.
- **Con la bandera ya apagada:** 409 y la contraseña no cambia.

`/auth/invitacion`:
- **Con una invitación viva:** `{ nombre }` exacto con `no-store`, sin correo, id, rol ni `activo`. No consume el enlace, que después sirve para establecer.
- **Inválidos:** inexistente, usado, revocado, vencido por 1 ms, de recuperación, de una cuenta inactiva, de 42 caracteres y con espacios. Todos dan un 400 idéntico en estado, cuerpo y encabezados, y el token de recuperación sigue sirviendo para lo suyo.
- **Cuerpos:**
  - sin token, `null`, número, arreglo, objeto, vacío y 257 caracteres: 400 con el formato de la API y sin eco;
  - más de 1 MB: 413;
  - texto plano y JSON roto: 4xx con el formato de la API.
- **GET con el token en la query:** 404.
- **Es pública:** un `Authorization` de admin, de un restringido o basura no cambia la respuesta.

Nombre al establecer:
- **Nombres inválidos:** U+202E, U+200B, nulo, relleno Hangul (solo y con una letra), 121 caracteres, 1 carácter, solo espacios, vacío, `null`, número y arreglo. Todos dan 400 `VALIDACION`, el enlace sigue vivo y el nombre no cambia; después, sin nombre, da 204.
- **Nombre con espacios sobrantes y acentos:** se normaliza, con `nombre_busqueda` coherente.
- **Exactamente 120 caracteres:** entra completo.
- **`restablecer` con `nombre`:** lo ignora.
- **Nombre con un token de recuperación:** 400, sin cambiar el nombre y sin consumir el token.
- **Cuenta inactiva:** 400.
- **Dos `establecer` simultáneos** con nombres y contraseñas distintos: 204 y 400, y gana uno entero (nombre y contraseña del mismo).

**`backend/test/logs-03a-r1.ataque.test.ts` (2 casos, en verde).** La API real, con nivel `trace`, recorre la invitación, `/auth/invitacion` (válida, basura y usada), establecer con un nombre corregido y el cambio (sin cookie, repetida y con éxito, más un `contrasenaActual` sobrante). Ninguno de los 14 secretos aparece en el log: los tokens, las contraseñas, los dos nombres de la invitación, los JWT y las cookies. La prueba comprueba también que el log sí registró las tres rutas atacadas.

**`frontend/src/features/auth/invitacion-r1.ataque.test.tsx` (18 casos, en verde).**
- **La consulta:**
  - el token viaja solo en el cuerpo de un POST, una vez, nunca en la URL;
  - la clave es `["datos-de-invitacion"]`; ni la clave, ni `meta`, ni `data` contienen el token, y no hay nada en `localStorage` ni en `sessionStorage`.
- **Estados:**
  - mientras llega, `Cargando` y ningún campo;
  - con `ENLACE_INVALIDO`, el enlace inválido, sin formulario, sin reintentos y sin llamar a establecer;
  - con un 500, un 429 o la red caída, un `role="alert"`, sin formulario y sin reintentos.
- **Respuestas raras del servidor:**
  - si filtra el correo, el id y el rol, no se muestran ni quedan en la caché (zod los descarta);
  - `{ nombre: 123 }` muestra un error y no el formulario.
- **El campo "Nombre completo":** `autoComplete="name"`, prellenado y con su ayuda como descripción accesible. El envío lleva el nombre corregido y recortado.
- **Nombres inválidos:** vacío, espacios, U+200B, U+202E, Hangul y 121 caracteres dan un `ErrorDeCampo` descrito por el campo y ninguna petición.
- **Doble clic:** una sola petición.
- **Tras activar la cuenta y salir:** la consulta desaparece, y ni el token, ni la contraseña, ni el nombre quedan en ninguna caché.
- **`ENLACE_INVALIDO` al enviar:** ni el token ni el nombre quedan en la caché de mutaciones.

**`frontend/src/app/cache-03a-r1.ataque.test.tsx` (9 casos, en verde).**
- **Login con la temporal** (el `/me` responde 403 `CAMBIO…`): la temporal no queda en ninguna caché y no hay ninguna mutación con la clave `["login"]`.
- **Login** con 401, con 429, con la red caída y con éxito: la contraseña fuera de la caché.
- **Registro** con 409 `CORREO_EN_USO` y con éxito: fuera de la caché.
- **`/cambiar-contrasena`:**
  - no tiene ningún campo "temporal" y el envío es exactamente `{ contrasenaNueva }`;
  - con `SESION_INVALIDA` en el envío y en el reintento tras refrescar: a lo más 2 envíos y 2 refrescos (sin bucle), el mensaje "Tu sesión terminó. Vuelve a iniciar sesión." y la contraseña fuera de la caché.

**Revisión estática** (sin hallazgos):
- `contrasenaActual` y `mostrarTemporal` solo quedan en comentarios y en `config/logger.ts` (desviación 1);
- `CONTRASENA_ACTUAL_INCORRECTA` ya no se emite en `backend/src`;
- ningún `console.` ni `estadoPago` en los archivos de 03a;
- ninguna librería de infraestructura fuera de `adapters/`;
- ninguna verificación de rol en `handlers/auth/cuentas.ts`;
- SQL crudo solo en `salud.ts`, `bloqueo-usuario.ts` y `cliente.ts` (sin cambios en 03a);
- `fetch(` solo en `apiClient.ts`;
- 0 `type="password"`;
- `<CampoContrasena` = 6 (1, 1, 2 y 2).

**Observaciones sobre las desviaciones del programador** (las decide el manager; no son hallazgos):
- **Desviación 1 (`logger.ts`):** tiene razón. Quitar la ruta de censura sería una regresión, y `logs-03a-r1` comprueba que el `contrasenaActual` sobrante no llega al log. Lo que no cuadra es la redacción de V-04, no el código.
- **Desviaciones 2 y 3:** no afectan a las `*.ataque`.
- **Desviación 4:** ver T-01.
- **Desviación 5 (`docs/DESIGN.md`):** queda fuera del alcance del tester.

### No atacado y por qué
- **Diferencias de tiempo entre tokens inválidos en `/auth/invitacion`:** no hay argon2 en esa ruta y todos los casos hacen la misma búsqueda única por `hash_token`. Una medición de tiempos sería intermitente (PA-12). La igualdad de estado, cuerpo y encabezados sí está probada.
- **La cookie en un navegador real** (proxy de Vite, `Path` y `SameSite`) y **el ancho de 360 px:** exigen un navegador; son el punto H-1 de la comprobación humana.
- **Una desactivación entre `decidirUsoDeToken` y la transacción de `establecer`:** `usarTokenYCambiarContrasena` no vuelve a leer `activo` bajo el bloqueo, pero ese comportamiento es anterior a 03a y hoy no hay ninguna ruta de baja (es de ADMIN). Queda anotado para ADMIN.

### Tabla de SHA-256 de todas las `*.ataque` (V-01 para la ronda 2)
51 archivos: los 47 de la ronda 0, sin cambios, y los 4 nuevos, marcados.

| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `4FCE3CEDF662BA3A188F21A2277DB417747D342C115EFD4746D3CFF58499289B` | `backend/src/config/env.ataque.test.ts` |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `AAE65C95CF34DB814D650AF5F7FA08D09BFF3E6FC6863D4252383058499AA10E` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `3C069EF866C4A4239BF9584C56B84B5819D4018BAC309454765101ED36FF7237` | `backend/test/cuentas-03a-r1.ataque.test.ts` (nuevo) |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `EA078F41CC98C947D9B3966EE8ECCEC2BD5D06EACBAF7EE8CD85F38E6A697C15` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` (nuevo) |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `C989C571F06678A96B7D271B9E011E389B2630EB7C5995D5B507EB427AAB6CA4` | `backend/test/sesiones-y-cadena.ataque.test.ts` |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` (nuevo) |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `4B18F80776B7B203FAB1B3587EBD790709E23EFE05D9E5C4BAED4227F113226E` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `E58293532633DC5CFE21561E2609D170638C81886B9C31129F03864C73A34F45` | `frontend/src/app/router.ataque.test.tsx` |
| `06F35BE8AE68F0ABAE775268E4E64F3DF880FF137A9B54AA3C135941DDB93DCF` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `26DDDDFB3668635A2A0B0BCD9F4D81E17FB7B35605F42B542C2D7A308C2C66ED` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` (nuevo) |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `AFB427A8379719AEB979414E328871CAC0CBDD110541C6D9C1A7490907C6AD97` | `frontend/src/styles/clases-r1.ataque.test.ts` |
| `D81ED462116AFDD16D4C8AD534941999487D8DBF5EB9DAD22DD242CF68044115` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

Salidas completas en el scratchpad de la sesión: `r1-build.txt`, `r1-lint.txt`, `r1-lint2.txt`, `r1-backend-test.txt`, `r1-frontend-test.txt`, `r1-backend-full.txt`, `r1-frontend-full.txt`, `r1-cuentas03a.txt`, `r1-back-nuevos.txt`, `r1-front-nuevos.txt`, `r1-rep1.txt`, `r1-rep2.txt` y `r1-front-rep.txt`.

---

## AUTH-03a — Ronda 2
Veredicto: ROTO, por T-02 (pérdida de cobertura no declarada). Además, **PA-07 se cumple al pie de la letra** (ver "Parada PA-07", abajo): el orquestador decide si la excepción que propongo aplica. El código de producción de 03a resistió todos los ataques de esta ronda y de la anterior.
Verificación propia (2026-09-28): build 0 · lint 0 · test backend 724/724 (68 archivos, con mi archivo nuevo; 720/720 antes de agregarlo) · test frontend 914/914 (54 archivos).

### Precondiciones y verificación
- **Script de hashes:** mi `hashes.ps1` del scratchpad conserva exactamente el contenido y la fecha (14:34) con que lo escribí en la ronda 1. Aun así, calculé V-01 por dos vías independientes: `hashes.ps1` (`Get-FileHash`) y `sha256sum` de Git Bash.
- **V-01:** coincide por las dos vías. Las 51 `*.ataque` de la tabla de la ronda 1 no cambiaron.
- **Código de producción sin cambios desde la ronda 1:**
  - `git diff 53b3126 -- backend/src shared/src` es byte a byte igual al diff que guardé en la ronda 1 (`cmp` sin diferencias);
  - la lista de archivos de producción modificados en el frontend es la misma y ninguno tiene fecha posterior a la ronda 1;
  - `services/liveService.ts` tiene fecha 16:02, pero es idéntico a `53b3126` (`git diff --quiet`);
  - los archivos de `adapters/db/generated/`, más nuevos, están en `.gitignore` y se regeneran en el `build`; `backend/prisma` no cambió.
- **PA-01 no se activó.** La comprobé antes de cada corrida del backend: `True Inbound Block Public`, red `IZZI-F281` (Public) y Docker 28.5.1.
- **Build, lint y test:** `npm run build` y `npm run lint` desde la raíz: 0. Backend 720/720 y frontend 914/914, igual que las cifras del programador.
- **PA-11 no se activó:** no quedó ningún contenedor de Testcontainers.

### Parada PA-07 (condición cumplida; me detuve y la reporto)
- **Comando:** `grep -cE "40P01|deadlock detected|could not serialize|P2028|too many clients"` sobre la salida de `npm run test` del backend.
- **Salida literal** (extracto):
  ```
  handlers/auth/index.ts:134:20)","code":"P2028","meta":{"modelName":"Sesion","operation":"query","timeout":5000,"timeTaken":6455}
  handlers/auth/cuentas.ts:106:23)","code":"P2028","meta":{"modelName":"TokenCuenta","operation":"query","timeout":5000,"timeTaken":6042}
  ```
  Hay 2 coincidencias en cada corrida. **Las mismas 2 aparecen en la corrida de la base, antes de cualquier cambio de 03a** (`backend-base.txt`): `index.ts:134` (login) y `cuentas.ts:103` (el mismo `usarTokenYCambiarContrasena` de `restablecer`, que en 03a solo cambió de línea).
- **Hipótesis:** las provoca a propósito el bloque de `cuentas-r3.ataque.test.ts` "transacciones que Prisma cierra por tiempo (P2028) a mitad de una espera de bloqueo" (AUTH-02). Ese bloque retiene una fila más de 5 s y comprueba que la API responda con su formato de error. No es un P2028 nuevo de 03a.
- **Qué hice:** no ataqué nada más después de encontrarlo. Propongo que PA-07 excluya los P2028 provocados por ese bloque, pero la decisión es del orquestador o del manager.
- **Corrección de mi reporte de la ronda 1:** ahí escribí "PA-07 no se activó". No lo había verificado con esa búsqueda. La salida de la ronda 1 (`r1-backend-full.txt`) tiene las mismas 2 coincidencias. El resumen del programador afirma lo mismo ("PA-07: no se activó") y tampoco es exacto.

### Hallazgos

#### T-02 — La corrección de T-01 borró los 9 casos de AUTH-02 de `invitacion.integracion.test.ts` y el resumen lo presenta como un archivo nuevo
Severidad: media

Prueba: es una omisión de pruebas y no se puede demostrar con una prueba que falle. Reproducción:
1. `git status --porcelain -- backend/test/invitacion.integracion.test.ts` → ` M`: el archivo ya existía en `53b3126`; no es nuevo.
2. `git show 53b3126:backend/test/invitacion.integracion.test.ts | grep -cE "^\s*it\("` → 9. Hoy tiene 13 casos, todos de 03a, y ninguno de los 9 anteriores.
3. Busqué por título en todo `backend/test` los 9 casos borrados y no aparecen en ningún archivo:
   - "201 crea un maestro activo sin hash en la respuesta";
   - "el login del invitado responde 401 CREDENCIALES_INVALIDAS, igual que una contraseña incorrecta";
   - "existe un trabajo con id igual al id del token de invitación";
   - "un correo duplicado responde 409 sin usuario, token ni trabajo nuevos";
   - "establecer-contrasena activa la cuenta y el login entra como maestro";
   - "un token de recuperación no vale en establecer-contrasena → 400";
   - "un token de invitación vencido (72 h) → 400";
   - "un segundo uso del mismo token de invitación → 400";
   - "crearMaestroInvitado con un alGuardar que lanza no deja ni usuario ni token".
4. La cuenta lo confirma: 714 − 9 + 13 (invitación) + 1 (autorización) + 1 (A5) = 720.
5. Fuera de las `*.ataque`, ninguna prueba normal cubre ya:
   - el camino feliz de `POST /api/admin/maestros`;
   - el 409 por correo duplicado;
   - el login del invitado antes de activar;
   - el recorrido "correo → establecer → login como maestro";
   - el rollback de `crearMaestroInvitado`.

   `autorizacion-cuentas` solo cubre los rechazos.

Esperado:
- que `invitacion.integracion` se **modificara** agregando los casos de 03a ("Cambios por capa" y "Pruebas requeridas" lo nombran como un archivo existente), conservando los de AUTH-02;
- que cualquier retiro de pruebas se declarara;
- `AGENTS.md`: "Pide confirmación antes de… borrar archivos".

Obtenido:
- el contenido se reemplazó entero;
- el resumen dice "nuevo, 13 casos" en tres lugares;
- la pérdida no aparece como desviación.

**El código no está roto:** mi prueba nueva `invitacion-flujo-03a-r2.ataque.test.ts` recorre esos comportamientos de punta a punta y pasa. El hallazgo es la cobertura normal perdida y el resumen inexacto.

Requisito o regla violada: RF-04a (la invitación de maestros pierde sus pruebas normales); `AGENTS.md`, "Pruebas" y "Definición de terminado"; `AGENTS.md`, "Pide confirmación antes de" (borrar); `plan.md`, "Pruebas requeridas", 03a (`invitacion.integracion` como archivo que se amplía).

### T-01, revisado punto por punto
- **Cubiertos** (backend):
  - `invitacion.integracion`: `{ nombre }` exacto con `no-store`; inexistente, recuperación, usado, revocado, vencido e inactiva → 400; no consume el enlace; es pública;
  - establecer con nombre (`nombre` y `nombre_busqueda`), sin nombre, con un nombre inválido (400 y el token sigue vivo), y `restablecer` con nombre;
  - `autorizacion-cuentas`: pública con un `Authorization` ajeno;
  - `bloqueo-usuario` A5.
- **Cubiertos** (frontend):
  - `login-view` y `registro-view`: la caché tras el éxito y tras el error;
  - `establecer-contrasena-view`: el envío con `nombre`, el nombre inválido (con `ErrorDeCampo` y ninguna petición), el 500 → `MensajeError`, la clave, `meta` y `data` sin el token, y la consulta que desaparece al desmontar;
  - `cambiar-contrasena-view`: `SESION_INVALIDA` con su mensaje.
- **Calidad:**
  - toda prueba nueva tiene aserciones y ninguna termina con un `return` temprano;
  - las de la caché fallarían sin `sacarDeLaCacheAlAsentar`, porque la mutación conservaría la contraseña en sus variables;
  - A5 fallaría si faltara la decisión bajo el bloqueo: daría 204.
- **Detalles** (no son hallazgos):
  - en `invitacion.integracion`, "usado", "revocado", "vencido" e "inactiva" comprueban solo el estado 400, no el código `ENLACE_INVALIDO` ni que el cuerpo sea idéntico. `cuentas-03a-r1` lo cubre;
  - A5 usa una ayuda que acepta `formada || terminada`. Si la petición terminara antes de formarse, el 401 vendría del filtro previo, y eso lo detectarían otras pruebas.
- **`ayudas-concurrencia.ts`:** el cambio es aditivo. Agrega un parámetro opcional al final, un tipo nuevo y una constante `sql` que solo se usa si llega `antesDeSoltar`. La única llamada existente (`bloqueo-usuario.integracion`, casos A1 a D1) no pasa el parámetro y conserva su comportamiento. No debilita ninguna prueba.

### Atacado sin hallazgos
- **Regresión de todas las `*.ataque`:** las 51 anteriores y la nueva pasan (backend 724/724 y frontend 914/914).
- **`backend/test/invitacion-flujo-03a-r2.ataque.test.ts` (4 casos, en verde)**, regresión del recorrido de AUTH-02 con el código de 03a:
  1. invitar → correo del worker (notifier en memoria) → `/auth/invitacion` devuelve el nombre del admin → establecer con el nombre corregido → login → `/me` con `rol: maestro` y el nombre corregido. Después, un segundo `establecer` y un segundo `/auth/invitacion` dan 400 y el nombre no cambia;
  2. antes de activar, el login del invitado es idéntico (estado, cuerpo y encabezados) a una contraseña incorrecta de otra cuenta;
  3. un correo duplicado con otra capitalización da 409, sin usuario ni token nuevos y conservando el nombre original;
  4. una invitación vencida no vale ni para leer el nombre ni para establecer, con o sin nombre, y la contraseña no entra.

### No atacado y por qué
- **Nada más después de PA-07:** me detuve al encontrarla, como dice el plan.
- **Un cambio de fragmento en la misma pestaña** (`#token=A` → `#token=B` sin recargar): `useTokenDelEnlace` lee el token una sola vez, igual que en `/restablecer` desde AUTH-02, y abrir un enlace de correo carga la página de nuevo. No es de 03a.

### Tabla de SHA-256 de todas las `*.ataque` (V-01 para la ronda siguiente)
52 archivos: los 51 de la ronda 1, sin cambios, y uno nuevo, marcado.

| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `4FCE3CEDF662BA3A188F21A2277DB417747D342C115EFD4746D3CFF58499289B` | `backend/src/config/env.ataque.test.ts` |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `AAE65C95CF34DB814D650AF5F7FA08D09BFF3E6FC6863D4252383058499AA10E` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `3C069EF866C4A4239BF9584C56B84B5819D4018BAC309454765101ED36FF7237` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `EA078F41CC98C947D9B3966EE8ECCEC2BD5D06EACBAF7EE8CD85F38E6A697C15` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` (nuevo) |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `C989C571F06678A96B7D271B9E011E389B2630EB7C5995D5B507EB427AAB6CA4` | `backend/test/sesiones-y-cadena.ataque.test.ts` |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `4B18F80776B7B203FAB1B3587EBD790709E23EFE05D9E5C4BAED4227F113226E` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `E58293532633DC5CFE21561E2609D170638C81886B9C31129F03864C73A34F45` | `frontend/src/app/router.ataque.test.tsx` |
| `06F35BE8AE68F0ABAE775268E4E64F3DF880FF137A9B54AA3C135941DDB93DCF` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `26DDDDFB3668635A2A0B0BCD9F4D81E17FB7B35605F42B542C2D7A308C2C66ED` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `AFB427A8379719AEB979414E328871CAC0CBDD110541C6D9C1A7490907C6AD97` | `frontend/src/styles/clases-r1.ataque.test.ts` |
| `D81ED462116AFDD16D4C8AD534941999487D8DBF5EB9DAD22DD242CF68044115` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

Salidas completas en el scratchpad de la sesión: `r2-build.txt`, `r2-lint.txt`, `r2-backend.txt`, `r2-frontend.txt`, `r2-flujo.txt`, `r2-backend-final.txt`, `r2-lint-back.txt`, `diff-prod-r2.txt`, `h-r2s.txt`, `h-r2-sha2.txt` y `h-r2fs.txt`.

---

## AUTH-03a — Ronda 3
Veredicto: RESISTE
Verificación propia (2026-09-28): build 0 · lint 0 · test backend 733/733 (68 archivos) · test frontend 914/914 (54 archivos).

### Precondiciones y verificación
- **Scripts del scratchpad:** `hashes.ps1` y `pa01.ps1` conservan la fecha (14:34) y el contenido con que los escribí. El archivo del programador es otro (`hashes-prog.ps1`) y no lo usé.
- **V-01:** coincide por dos vías independientes (`Get-FileHash` y `sha256sum`). Las 52 `*.ataque` de la tabla de la ronda 2 no cambiaron.
- **Código de producción sin cambios desde la ronda 2:**
  - `git diff 53b3126 -- backend/src shared/src` es byte a byte igual al de las rondas 1 y 2 (`cmp`);
  - ningún archivo de `backend/src`, `frontend/src` ni `shared/src` es posterior a mi reporte de la ronda 2, salvo el cliente generado de Prisma, que está en `.gitignore`;
  - los 6 archivos de producción del frontend conservan sus fechas (14:20 a 14:30);
  - `backend/prisma` no cambió.
- **PA-01 no se activó.** La comprobé antes de cada corrida del backend: `True Inbound Block Public`, red `IZZI-F281` (Public) y Docker 28.5.1.
- **Build, lint y test:** `npm run build` y `npm run lint` desde la raíz: 0. Backend 733/733 (724 de la ronda 2 más los 9 casos restaurados) y frontend 914/914.
- **PA-11 no se activó:** no quedó ningún contenedor de Testcontainers.
- **PA-12:** ninguna prueba fue intermitente en esta ronda.

### PA-07 (Enmienda 3): no se activó. Evidencia completa
- **Comando**, sobre la salida completa de `npm run test` del backend (`r3-backend.txt`), un término a la vez:
  ```
  grep -oF "<término>" r3-backend.txt | wc -l
  ```
- **Conteo por término:**

  | Término | Apariciones |
  |---|---|
  | `40P01` | 0 |
  | `deadlock detected` | 0 |
  | `could not serialize` | 0 |
  | `P2028` | 2 |
  | `too many clients` | 0 |

- **Los dos `P2028`:**

  | # | Ruta | Llamada de Prisma | Dónde (de la pila del error) |
  |---|---|---|---|
  | 1 | `POST /api/auth/login` | `tx.sesion.create` (`crearSesion`) | `adapters/db/sesiones.ts:39` ← `handlers/auth/index.ts:134` |
  | 2 | `POST /api/auth/restablecer` | `tx.tokenCuenta.updateMany` (`usarTokenYCambiarContrasena`) | `adapters/db/tokens-cuenta.ts:116` ← `handlers/auth/cuentas.ts:106` |

- **Cómo identifiqué la ruta:** no por el `requestId` del log. Todos los archivos corren en el mismo proceso (pid 26668) y cada app numera sus peticiones desde cero, así que los ids se repiten entre archivos y el emparejamiento automático atribuyó el primero a `/refrescar`, que no corresponde. Lo identifiqué por el código:
  - `index.ts:134` está dentro de `app.post("/login")` (líneas 105 a 153) y es la llamada a `crearSesion`;
  - `cuentas.ts:106` está dentro de `app.post("/restablecer")` (desde la línea 98) y es la llamada a `usarTokenYCambiarContrasena`.
- **Origen:** corrí solo `cuentas-r3.ataque.test.ts` (`r3-solo-cuentas-r3.txt`, 22/22). Produce exactamente esos dos `P2028`, uno en `index.ts:134` y otro en `cuentas.ts:106`.
- **Conclusión:** son los dos excluidos, uno de cada tipo. No hay otro `P2028` ni ninguno de los otros cuatro términos.

### T-02, revisado
- **Los 9 casos restaurados:**
  - extraje el bloque `describe("POST /api/admin/maestros")` de `53b3126` y el de hoy, y los comparé con `diff`;
  - la única diferencia es una línea: `const { crearTokenDePrueba } = await import("./ayudas-cuentas.js")` dentro del caso "un token de recuperación no vale en establecer-contrasena → 400", que pasó a la importación estática de la cabecera. Es la misma función;
  - títulos idénticos, cuerpos idénticos y 20 `expect` en los dos. Nada debilitado.
- **Los 13 casos de 03a** siguen en sus tres `describe` (`/auth/invitacion`, `establecer-contrasena` y `restablecer`); en total son 22.
- **Limpieza doble:**
  - `afterAll` borra primero por `correos` (los invitados por `POST /admin/maestros`, `@pruebas.local`) y después por `ids` (los creados con `crearUsuarioDePrueba`);
  - las dos listas son locales al archivo, con correos e ids aleatorios, y las dos funciones usan `deleteMany` con un filtro explícito. Un id ya borrado no provoca error y no alcanza filas de otros archivos;
  - las sesiones y los tokens caen en cascada;
  - la suite completa y `invitacion.integracion` pasan.
- **Ningún otro archivo de pruebas se reemplazó.** Comparé los títulos de `it()` contra `53b3126` en los 11 archivos de pruebas normales que cambiaron. Ninguno perdió casos en neto. Cada título retirado es un renombre o lo contradice un C-n de 03a:
  - `cambio-de-contrasena.test.ts`: los 2 de `evaluarContrasenaNueva`, que el plan retira ("Cambios por capa", core), sustituidos por `evaluarContrasenaRepetida`;
  - `bloqueo-usuario.integracion`: A3, C2, D1 y E4, renombrados (con su cookie, o `credencial_cambiada`);
  - `cambiar-contrasena.integracion`: 6. Los cuatro que no contradice C-1 ni C-2 siguen como equivalentes (204 con la cookie, la 6.ª repetida → 429, repetida → 400 y el restringido con su cookie). "Temporal incorrecta" cae por C-1 y "sin cookie revoca todas las sesiones", por C-2;
  - `cambiar-contrasena-view`: "con una temporal incorrecta" pasa a "con una nueva igual a la temporal" (C-1);
  - `establecer-contrasena-view`: "con ENLACE_INVALIDO muestra el mensaje…" pasa a "…al enviar…" (renombre).

### Hallazgos
Ninguno. T-01 y T-02 quedaron corregidos y no encontré regresiones.

### Atacado sin hallazgos
- **Regresión completa:** las 52 `*.ataque` pasan (backend 733/733 y frontend 914/914), incluidas las 5 de 03a:
  - `cuentas-03a-r1` (41 casos);
  - `logs-03a-r1` (2);
  - `invitacion-flujo-03a-r2` (4);
  - `invitacion-r1` (18);
  - `cache-03a-r1` (9).
- **Todo lo de la ronda 1**, contra el mismo código de producción:
  - el cambio obligatorio sin la temporal y M-02;
  - la carrera entre el filtro previo y el bloqueo;
  - `/auth/invitacion`;
  - el nombre al establecer;
  - la caché del login (incluida la temporal), del registro, del cambio y de `establecer`;
  - los logs.
- **El recorrido de AUTH-02 de la ronda 2.**
- **Las pruebas normales de T-01 y T-02**, que ahora también pasan.

### No atacado y por qué
Sin cambios respecto a las rondas 1 y 2:
- **Tiempos entre tokens inválidos:** una medición sería intermitente; la igualdad de estado, cuerpo y encabezados sí está probada.
- **La cookie en un navegador real** (proxy de Vite, `Path` y `SameSite`) **y el ancho de 360 px:** son del punto H-1 de la comprobación humana.
- **Una desactivación entre `decidirUsoDeToken` y la transacción de `establecer`:** es anterior a 03a y hoy no hay ninguna ruta de baja. Queda para ADMIN.
- **Un cambio de fragmento en la misma pestaña:** es un comportamiento de AUTH-02.

No escribí archivos nuevos en esta ronda: la regresión completa y la revisión de T-02 no lo exigían.

### Tabla final de SHA-256 de todas las `*.ataque` (cierre de 03a; base de V-01 para 03b)
52 archivos, idénticos a la tabla de la ronda 2.

| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `4FCE3CEDF662BA3A188F21A2277DB417747D342C115EFD4746D3CFF58499289B` | `backend/src/config/env.ataque.test.ts` |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `AAE65C95CF34DB814D650AF5F7FA08D09BFF3E6FC6863D4252383058499AA10E` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `3C069EF866C4A4239BF9584C56B84B5819D4018BAC309454765101ED36FF7237` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `EA078F41CC98C947D9B3966EE8ECCEC2BD5D06EACBAF7EE8CD85F38E6A697C15` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `C989C571F06678A96B7D271B9E011E389B2630EB7C5995D5B507EB427AAB6CA4` | `backend/test/sesiones-y-cadena.ataque.test.ts` |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `4B18F80776B7B203FAB1B3587EBD790709E23EFE05D9E5C4BAED4227F113226E` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `E58293532633DC5CFE21561E2609D170638C81886B9C31129F03864C73A34F45` | `frontend/src/app/router.ataque.test.tsx` |
| `06F35BE8AE68F0ABAE775268E4E64F3DF880FF137A9B54AA3C135941DDB93DCF` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `26DDDDFB3668635A2A0B0BCD9F4D81E17FB7B35605F42B542C2D7A308C2C66ED` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `AFB427A8379719AEB979414E328871CAC0CBDD110541C6D9C1A7490907C6AD97` | `frontend/src/styles/clases-r1.ataque.test.ts` |
| `D81ED462116AFDD16D4C8AD534941999487D8DBF5EB9DAD22DD242CF68044115` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

Salidas completas en el scratchpad de la sesión: `r3-build.txt`, `r3-lint.txt`, `r3-backend.txt`, `r3-frontend.txt`, `r3-solo-cuentas-r3.txt`, `diff-prod-r3.txt`, `diff-front-prod-r3.txt`, `bloque-base.ts`, `bloque-r3.ts`, `h-r3s.txt`, `h-r3-sha.txt` y `h-r3fs.txt`.

---

## AUTH-03b — Ronda 0
> **Actualización:** T-03 y T-04 quedaron resueltos por la Enmienda 5. La lista final de rojos esperados (7) está en "Complemento por la Enmienda 5", al final de esta sección.

Veredicto: ronda 0 completa, **con 2 hallazgos del inventario** (T-03 y T-04, los dos en `clases-r1`) que bloquean el paso 21 del programador. Los reescribí solo donde había un C-n: quedan 1 caso en rojo en el backend y 4 en el frontend, y son exactamente los reescritos que dependen del código de 03b.
Verificación propia (2026-09-28):
- `lint`: frontend 0 y backend 0 (ESLint, Prettier y `tsc`).
- `test` antes de tocar nada: frontend 914/914 (54 archivos) y backend 733/733 (68 archivos).
- `test` después de las reescrituras: frontend 4 fallidas de 914; backend 1 fallida de 733.

### Precondiciones
**PA-02 no se activó:**
- La rama es `feat/auth-03-ajustes-de-cuentas`, con HEAD en `d8cb198`. `d8cb198` y `53b3126` existen (`git cat-file -e`).
- `git diff --name-only d8cb198 -- backend shared frontend` estaba vacío. `git status --porcelain` solo mostraba `docs/trabajo/AUTH-03-ajustes-de-cuentas/aprobacion.md`.
- Fuera de los paquetes, contra `<R>` = `53b3126`, solo cambiaron los archivos protegidos por hash, `docs/DESIGN.md` (excluido de V-05), `docs/ESTADO.md` y la carpeta del encargo.
- Los 5 archivos protegidos coinciden con el último SHA-256 de `aprobacion.md`: `AGENTS.md` (`BCF18665…E5FD`), `docs/ARCHITECTURE.md` (`1EC918DC…47DF`), `docs/ARCHITECTURE-ESSENTIALS.md` (`7AD09943…20B5`), `CLAUDE.md` (`7B5E7DA6…3275`) y `README.md` (`59097208…D998`).
- **V-01:** las 52 `*.ataque` coinciden con la tabla final de "AUTH-03a — Ronda 3" (`sha256sum` contra la tabla, 52/52).

**PA-01 no se activó.** La comprobé antes de cada corrida del backend: la regla responde `True Inbound Block Public`, la red activa es `IZZI-F281` (perfil Public, declarada de confianza por el humano) y Docker responde (motor 28.5.1).

**PA-11 no se activó:** después de cada corrida no quedó ningún contenedor de Testcontainers.

**PA-07 no se activó.** Evidencia:
- **Comando**, sobre la salida completa de `npm run test` del backend después de las reescrituras (`b0-backend-r0.txt`), un término a la vez: `grep -oF "<término>" b0-backend-r0.txt | wc -l`.
- **Conteo por término:**

  | Término | Apariciones |
  |---|---|
  | `40P01` | 0 |
  | `deadlock detected` | 0 |
  | `could not serialize` | 0 |
  | `P2028` | 2 |
  | `too many clients` | 0 |

- **Los dos `P2028`** (identificados por la llamada de Prisma y por la pila del error):

  | # | Ruta | Llamada de Prisma | Dónde |
  |---|---|---|---|
  | 1 | `POST /api/auth/login` | `tx.sesion.create` (`crearSesion`, `modelName: "Sesion"`) | `adapters/db/sesiones.ts:39` ← `handlers/auth/index.ts:134`, dentro de `app.post("/login")` (líneas 105 a 153) |
  | 2 | `POST /api/auth/restablecer` | `tx.tokenCuenta.updateMany` (`usarTokenYCambiarContrasena`, `modelName: "TokenCuenta"`) | `adapters/db/tokens-cuenta.ts:116` ← `handlers/auth/cuentas.ts:106`, dentro de `app.post("/restablecer")` (desde la línea 98) |

- Son los dos excluidos, uno de cada tipo. La corrida de base (`b0-backend-base.txt`) da los mismos cinco conteos.

### Casos reescritos por archivo
Cada uno lleva un comentario `AUTH-03b ronda 0 (C-n)` que explica qué cambió y qué sigue protegiendo.

| Archivo | Caso | C-n | Qué cambia | Qué sigue protegiendo |
|---|---|---|---|---|
| `backend/test/sesiones-y-cadena.ataque.test.ts` | `:443` | C-8 | Se agregan las 7 entradas nuevas a la lista exacta: `POST /api/auth/registro-maestro`, `GET`, `HEAD` y `POST /api/admin/enlaces-registro`, `POST /api/admin/enlaces-registro/:id/revocar` y `GET` y `HEAD /api/admin/enlaces-registro/:id/registrados`. **El analizador de `printRoutes` se reconstruye** (ver la observación 1): arma la ruta completa por nivel de sangría y falla si alguna línea no se reconoce. El título pasa a "…AUTH-03a y AUTH-03b: … solo /admin/maestros y /auth/registro-maestro crean maestros" | Ninguna ruta fuera de la lista existe bajo `/api`, así que ninguna crea administradores; solo `POST /api/admin/maestros` (admin) y `POST /api/auth/registro-maestro` (con un enlace vivo) crean maestros. Queda **más estricta**: ahora también ve las rutas que extienden a otra registrada |
| `frontend/src/app/marco-r1.ataque.test.tsx` | `:278` (título en `:304`) | C-9 | Cada fila lleva `destinos` y `textos`. El admin pasa a `["/admin", "/admin/maestros"]` y `["Cuentas", "Maestros"]`. En lugar de "el primero lleva `aria-current`", compara todos: `"page"` en el de la ruta actual y ningún `aria-current` en los demás. El título pasa de "un solo destino existente y activo" a "sus destinos existentes, solo el de la ruta actual activo" | Cada destino es una ruta existente (no cae en `*`) y enfocable, en su orden; una sola nav hija de la raíz del marco; nada que cree un bloque contenedor para lo fijo; un banner, un pie y un "Cerrar sesión"; contexto opaco y denso solo en el admin. Estudiante y maestro siguen con un solo destino |
| `frontend/src/components/layout/estatico-r1.ataque.test.ts` | `TABLA` | C-14 | Suma la fila `"/src/features/auth/components/formulario-registro-maestro.tsx": [["contrasena", "mostrar"]]`, antes de `formulario-registro.tsx` (orden alfabético de la clave) | El caso `:203` (adaptado por la tabla) y el de `:248` (`Object.keys(TABLA)`) |
| ídem | `:189` | C-14 | "exactamente 6… 1, 1, 2 y 2" pasa a "exactamente 7 `<CampoContrasena`, solo en los 5 formularios: 1, 1, 2, 2 y 1", con `formulario-registro-maestro.tsx: 1` en `porArchivo` | Todo campo de contraseña pasa por `CampoContrasena` y solo en los formularios listados |
| ídem | `:203` y `:248` | C-14 | No cambian su texto. Se adaptan solos por la `TABLA` | Una constante de `TEXTOS_CAMPO_CONTRASENA` por campo, en su orden, sin `type` ni `aria-label`; `CampoContrasena` solo en los formularios de la tabla |

El caso de los 3 textos de `TEXTOS_CAMPO_CONTRASENA` (`:221`) no cambia, porque el formulario nuevo usa `mostrar`, y sigue en verde.

**C-10:** ninguna `*.ataque` importa `sacarDeLaCacheAlAsentar` ni `features/auth/hooks`. Las pruebas de caché (`cache-03a-r1`, `invitacion-r1`, `cuentas-r1` y `cuentas-r2` de `app/`, `contrasena-r1`) miran la caché, no el módulo. No hay nada que reescribir.

### Rojos esperados
Quedan en rojo hasta que el programador termine 03b. Cualquier otro rojo, o que uno de estos siga en rojo al final, activa PA-06 (salvo lo que resuelva la enmienda de T-03 y T-04).

**Backend (1):**
- B-1 `backend/test/sesiones-y-cadena.ataque.test.ts:443` "bajo /api solo existen las rutas de AUTH-01, AUTH-02a, AUTH-03a y AUTH-03b: ninguna crea admins; solo /admin/maestros y /auth/registro-maestro crean maestros" (C-8)

**Frontend (4):**
- F-1 `frontend/src/app/marco-r1.ataque.test.tsx:278` (título en `:304`), solo la fila del admin: "'admin': una nav con sus destinos existentes, solo el de la ruta actual activo, un banner, un pie, un 'Cerrar sesión'" (C-9). Las filas de estudiante y maestro siguen en verde.
- F-2 `frontend/src/components/layout/estatico-r1.ataque.test.ts:189` "exactamente 7 <CampoContrasena, solo en los 5 formularios: 1, 1, 2, 2 y 1" (C-14)
- F-3 `frontend/src/components/layout/estatico-r1.ataque.test.ts:203` "cada campo lleva, en orden, la constante de su fila de la tabla, sin type ni aria-label" (C-14)
- F-4 `frontend/src/components/layout/estatico-r1.ataque.test.ts:248` "V-17: en campo-contrasena.tsx, sin aria-label ni aria-labelledby; un sr-only y un aria-pressed en el código" (C-14; falla la aserción de `:255`, `Object.keys(TABLA)`)

Revisé en la salida por qué falla cada uno con el código de hoy, y ninguno falla por un error de la prueba:
- **B-1:** la aserción de líneas no reconocidas pasa (el analizador nuevo reconoce las 17 rutas actuales sin descartar ninguna línea). La diferencia son exactamente las 7 entradas nuevas.
- **F-1:** `expected [ '/admin' ] to deeply equal [ '/admin', '/admin/maestros' ]`.
- **F-2:** 6 usos en lugar de 7.
- **F-3:** `no se leyó /src/features/auth/components/formulario-registro-maestro.tsx`.
- **F-4:** 4 rutas en lugar de 5.

### Agregados fuera del inventario, con su C-n
Ninguno. Los tres archivos reescritos son los del inventario de §D-B7. La reconstrucción del analizador de `sesiones-y-cadena` es parte del caso de C-8, no un caso nuevo: sin ella, las rutas nuevas no se pueden agregar (observación 1).

### Hallazgos
Busqué todos los términos del punto 2 de la ronda 0 en las 52 `*.ataque` de los dos paquetes, incluidas las 5 de 03a:
- `contrasenaActual`, "Contraseña temporal", `mostrarTemporal`, `CampoContrasena`, `campo-contrasena` y `TEXTOS_CAMPO_CONTRASENA`;
- `/establecer-contrasena` con token;
- `printRoutes`, `RUTAS_PUBLICAS` y `RUTAS_SIN_SESION`;
- `DESTINOS_POR_ROL`, "Cuentas", "Maestros", `/admin` y los localizadores de enlaces.

Además revisé cada prueba estática que recorre el código fuente (`import.meta.glob` o `readdirSync`): `estatico-r1`, `clases-r1`, `features/admin/cuentas-r1` y `arquitectura-cuentas-r1`. También revisé las que leen `docs/DESIGN.md`, que el programador edita en 03b (`tokens-r1`). Solo en `clases-r1` encontré casos contradichos sin C-n.

#### T-03 — `clases-r1` exige exactamente 13 `enEspera=` y §D-B6 agrega al menos dos
Severidad: media (proceso). **Bloquea el paso 21:** con el plan como está, PA-06 se activa en cuanto el programador implemente §D-B6.
Prueba: `frontend/src/styles/clases-r1.ataque.test.ts:68`, "V-06: ningún control con `disabled` en JSX; aria-busy y aria-disabled solo en Button; 13 enEspera" (aserción de `:74`, `toHaveLength(13)`).
Esperado / Obtenido:
- §D-B6 prescribe `enEspera` en "Generar enlace" y en "Sí, revocar". Además, `CLAUDE.md` exige `enEspera` en todo botón con la petición en vuelo, así que "Crear mi cuenta" de `/registro-maestro` (gemelo del registro, que hoy lo usa) y los "Cargar más", si piden con el botón en espera, también lo llevan.
- Hoy hay 13 (`grep -rn "enEspera=" frontend/src --include=*.tsx`, sin pruebas). Tras 03b habrá 15 como mínimo, y la prueba fallará aunque la implementación sea correcta.
- §D-B7 no tiene un C-n que la cubra, y ni `plan.md` ni `revision.md` mencionan `clases-r1`. Por la regla de la ronda 0 (Enmienda 2), no la reescribí.
Reproducción: implementar §D-B6 tal como está escrito y correr `npm run test` desde `frontend/`.
Requisito o regla violada: "Puntos de ataque", ronda 0, punto 2 (inventario incompleto); PA-06.

#### T-04 — `clases-r1` limita el texto rojo a 4 archivos y la insignia de §D-B9 suma `components/ui/badge.tsx`
Severidad: media (proceso). **Bloquea el paso 21** por la misma razón.
Prueba: `frontend/src/styles/clases-r1.ataque.test.ts:105`, "V-13: texto rojo solo donde el plan lo permite (sólido, --danger-soft o iconos)".
Esperado / Obtenido:
- La prueba exige que `text-destructive` o `text-danger` aparezcan solo en `error-de-campo.tsx`, `mensaje-error.tsx`, `ui/sonner.tsx` y `acceso-restringido-view.tsx`.
- §D-B9 (§7.8) y `DESIGN.md` §7.8 piden que la variante `danger` de `components/ui/badge.tsx` lleve "fondo `*-soft` sólido y texto en el color del estado", es decir `text-danger` sobre `bg-danger-soft`, para la insignia "Revocado". Es un uso permitido por la regla que protege la prueba ("sólido, `--danger-soft` o iconos"), pero la lista exacta lo rechaza.
- Sin C-n, no la reescribí.
Reproducción: implementar `badge.tsx` según §D-B9 y correr `npm run test` desde `frontend/`.
Requisito o regla violada: "Puntos de ataque", ronda 0, punto 2 (inventario incompleto); PA-06.

**Qué propongo que resuelva la enmienda** (decide el arquitecto; no es una corrección):
- un C-n nuevo que cubra `clases-r1:68` y `:105`;
- el número exacto de `enEspera=` tras 03b, o la lista de botones que lo llevan;
- que `ui/badge.tsx` entre en la lista de V-13, conservando la protección: en ese archivo, el rojo solo con `bg-danger-soft`.

Con la enmienda, rehago esta ronda 0 solo para esos dos casos.

### Observaciones para el manager (no son hallazgos)
1. **El analizador viejo de `sesiones-y-cadena` no veía las rutas anidadas.** Lo comprobé con una app de Fastify 5.12.5 de prueba, fuera del repositorio (`printroutes.mjs` y `printroutes2.mjs` en el scratchpad). `printRoutes({ commonPrefix: false })` imprime `/api/auth/registro-maestro` como `-maestro`, bajo `/api/auth/registro`, y `/:id/revocar` y `/:id/registrados` bajo `/api/admin/enlaces-registro`. La expresión anterior (`/(\/\S*) \(/` más `startsWith("/api")`) descartaba esas líneas en silencio. Tiene dos efectos:
   - con agregar las rutas a la lista, la prueba habría quedado en rojo para siempre, aun con una implementación correcta;
   - desde AUTH-02a, una ruta nueva que extendiera a otra registrada (por ejemplo, `POST /api/auth/registro-admin` o `GET /api/me/x`) escapaba de la guarda. No existe ninguna hoy: la corrida de base listaba las mismas 17 que el analizador nuevo.

   El analizador nuevo reconstruye la ruta completa y, sobre la app de prueba, detecta `registro-admin` y `me/x`, mientras que el viejo no ve ni `registro-maestro` ni `registro-admin`. Lo cuento dentro de C-8 y no como agregado, porque sin él las rutas de C-8 no se pueden agregar. Es más estricto, no más débil.
2. **"La segunda nunca crea otro rol" (C-8)** no se prueba en esta ronda. Hacerlo pide un enlace vivo, es decir el modelo `EnlaceRegistro`, que todavía no existe, y la ronda 0 no admite ataques nuevos de 03b. Lo cubren `registro-maestro.integracion` ("`rol: "admin"` en el cuerpo → sigue siendo maestro") y la ronda 1 (punto 1: `rol`, `enlaceRegistroId`, `activo` o `estadoPago` en el cuerpo).
3. **`marco-r1` en `/admin/maestros`.** El caso reescrito se monta en `/admin`, como antes. Que "Maestros" lleve `aria-current` y "Cuentas" no, estando en `/admin/maestros`, sería un caso nuevo: queda para la ronda 1.

### No atacado y por qué
No escribí pruebas de ataque nuevas para 03b: corresponden a las rondas 1 a 3, después del programador.

### Tabla SHA-256 de las 52 `*.ataque` (V-01 para el programador de 03b, después de formatear)
| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `4FCE3CEDF662BA3A188F21A2277DB417747D342C115EFD4746D3CFF58499289B` | `backend/src/config/env.ataque.test.ts` |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `AAE65C95CF34DB814D650AF5F7FA08D09BFF3E6FC6863D4252383058499AA10E` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `3C069EF866C4A4239BF9584C56B84B5819D4018BAC309454765101ED36FF7237` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `EA078F41CC98C947D9B3966EE8ECCEC2BD5D06EACBAF7EE8CD85F38E6A697C15` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `F0CAD74195F7149BCF9E88E3A1CB5A91A3E58095194D40CBF037444BF98785AC` | `backend/test/sesiones-y-cadena.ataque.test.ts` (modificado) |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `5E92F1C572A18BC19CD06E9584AB8FC5C5A0EF709D9782AE05C85229BAAE78A0` | `frontend/src/app/marco-r1.ataque.test.tsx` (modificado) |
| `E58293532633DC5CFE21561E2609D170638C81886B9C31129F03864C73A34F45` | `frontend/src/app/router.ataque.test.tsx` |
| `06F35BE8AE68F0ABAE775268E4E64F3DF880FF137A9B54AA3C135941DDB93DCF` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` (modificado) |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `AFB427A8379719AEB979414E328871CAC0CBDD110541C6D9C1A7490907C6AD97` | `frontend/src/styles/clases-r1.ataque.test.ts` |
| `D81ED462116AFDD16D4C8AD534941999487D8DBF5EB9DAD22DD242CF68044115` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

Salidas completas en el scratchpad de la sesión: `b0-frontend-base.txt`, `b0-backend-base.txt`, `b0-frontend-r0.txt`, `b0-backend-r0.txt`, `b0-frontend-lint.txt`, `b0-backend-lint.txt`, `b0-tabla.md`, `printroutes.mjs` y `printroutes2.mjs`.

### Complemento por la Enmienda 5
La Enmienda 5 (`plan.md`; aprobada en `revision.md`, "Revisión de la enmienda 5") agregó C-15 y C-16 a §D-B7 y amplió el paso 2 de la ronda 0. Con eso reescribí los dos casos de `clases-r1`. El resto de esta ronda 0 sigue valiendo tal cual.

**T-03 y T-04: resueltos por la Enmienda 5** (C-15 y C-16).

**Precondiciones:**
- El código de producción no cambió desde la primera parte de esta ronda: `git status --porcelain -- backend shared frontend` solo muestra mis `*.ataque`.
- Mis tres archivos de la primera parte conservan su hash, y `clases-r1` tenía el de la tabla de "AUTH-03a — Ronda 3" (`AFB427A8…7AD97`).
- **PA-01 no se activó:** `True Inbound Block Public`, red `IZZI-F281` (Public) y Docker 28.5.1, comprobado antes de la corrida del backend.
- **PA-11 no se activó:** no quedó ningún contenedor de Testcontainers.

**Verificación (2026-09-28):**
- `lint`: frontend 0 y backend 0.
- `test`: frontend 6 fallidas de 914 (54 archivos); backend 1 fallida de 733 (68 archivos).

**PA-07 no se activó.** Evidencia:
- **Comando**, sobre la salida completa del backend (`b0e5-backend.txt`), un término a la vez: `grep -oF "<término>" b0e5-backend.txt | wc -l`.
- **Conteo por término:** `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `P2028` 2 y `too many clients` 0.
- **Los dos `P2028`** son los excluidos:

  | # | Ruta | Llamada de Prisma | Dónde |
  |---|---|---|---|
  | 1 | `POST /api/auth/login` | `tx.sesion.create` (`crearSesion`, `modelName: "Sesion"`) | `adapters/db/sesiones.ts:39` ← `handlers/auth/index.ts:134` |
  | 2 | `POST /api/auth/restablecer` | `tx.tokenCuenta.updateMany` (`usarTokenYCambiarContrasena`, `modelName: "TokenCuenta"`) | `adapters/db/tokens-cuenta.ts:116` ← `handlers/auth/cuentas.ts:106` |

#### Diff de `frontend/src/styles/clases-r1.ataque.test.ts`
Cada caso lleva un comentario `AUTH-03b ronda 0 (C-n, Enmienda 5)` que explica qué cambió y qué sigue protegiendo.

| Caso | C-n | Qué cambia | Qué sigue protegiendo |
|---|---|---|---|
| `:75` (antes `:68`), "V-06: … 19 enEspera" | C-15 | `toHaveLength(13)` pasa a `toHaveLength(19)`. Además fija la lista cerrada que el plan permite: <br>• los 13 de hoy siguen en sus 12 archivos, con el mismo número cada uno; <br>• se suma exactamente 1 en `formulario-registro-maestro.tsx`, `formulario-generar-enlace.tsx`, `enlace-nuevo.tsx` y `registrados-del-enlace.tsx`; <br>• los 2 restantes ("Sí, revocar" y "Cargar más enlaces") van en `features/admin/components/`, en `tabla-enlaces.tsx` o en el componente de su fila si se extrae, con al menos 1 en `tabla-enlaces.tsx` | Ningún `disabled` en JSX. `aria-busy` y `aria-disabled` solo en `button.tsx`. El número y el lugar de los botones con espera cambian solo con el plan: un botón de más o de menos, o un envoltorio que reparta `enEspera` (R-16), vuelve a poner la prueba en rojo |
| `:158` (antes `:105`), "V-13: texto rojo solo donde el plan lo permite" | C-16 | La lista pasa a 5 archivos, con `/src/components/ui/badge.tsx` entre `mensaje-error.tsx` y `ui/sonner.tsx` (orden de `rutasDe`). Aserción nueva: `badge.tsx` tiene al menos una línea con texto rojo, toda línea suya con `text-danger` o `text-destructive` contiene también `bg-danger-soft`, y ninguna usa `text-destructive` (C-16: "el archivo no usa `text-destructive`") | El texto rojo solo va donde el plan lo permite (sólido, `--danger-soft` o iconos), nunca sobre vidrio al 62 %. Ningún archivo de `features/` gana texto rojo. El caso de `acceso-restringido-view.tsx` (`:177`, los dos iconos) no cambia |

Diff completo en el scratchpad: `b0e5-diff-clases.txt` (66 líneas agregadas y 3 quitadas).

#### Búsqueda ampliada del paso 2
- Busqué `enEspera=`, `text-danger` y `text-destructive` en las 52 `*.ataque`. Fuera de `clases-r1` solo aparecen comprobaciones de comportamiento (`aria-busy` en `contrasena-r1`, `marco-r1`, `en-espera-r1` de `app/` y de `admin/`, `cuentas-r3`, `cuentas-r4` y `foco-r1`), que montan pantallas existentes y no cuentan archivos.
- También busqué los conteos y las listas cerradas de `variant=`, `primary`, `rounded-`, `shadow-`, `vidrio`, `data-material`, `animate-`, `fixed`, `ring-`, `focus:`, `outline-none`, `disabled` y `aria-busy`.
- Las pruebas que recorren el código (`import.meta.glob`, `readdirSync` o `?raw`) son 6:
  - `clases-r1`: C-15 y C-16, reescritos aquí;
  - `estatico-r1`: C-14, reescrito en la primera parte. Sus demás casos no se contradicen (M-13);
  - `features/admin/cuentas-r1`: reglas 8 y 9, sin conteos que 03b cambie;
  - `tokens-r1`: lee las tablas de tokens, radios y escala de `DESIGN.md`, que §D-B9 no amplía;
  - `fondo-r1`: lee `tokens.css`, que está en "No se toca";
  - `arquitectura-cuentas-r1`, en el backend: sus listas no cambian con 03b.
- **Ningún otro caso contradicho.** No hay agregados fuera del inventario.

#### Lista final de rojos esperados (7)
Quedan en rojo hasta que el programador termine 03b. Cualquier otro rojo, o que uno de estos siga en rojo al final, activa PA-06.

**Backend (1):**
- B-1 `backend/test/sesiones-y-cadena.ataque.test.ts:443` "bajo /api solo existen las rutas de AUTH-01, AUTH-02a, AUTH-03a y AUTH-03b: ninguna crea admins; solo /admin/maestros y /auth/registro-maestro crean maestros" (C-8)

**Frontend (6):**
- F-1 `frontend/src/app/marco-r1.ataque.test.tsx:278` (título en `:304`), solo la fila del admin: "'admin': una nav con sus destinos existentes, solo el de la ruta actual activo, un banner, un pie, un 'Cerrar sesión'" (C-9)
- F-2 `frontend/src/components/layout/estatico-r1.ataque.test.ts:189` "exactamente 7 <CampoContrasena, solo en los 5 formularios: 1, 1, 2, 2 y 1" (C-14)
- F-3 `frontend/src/components/layout/estatico-r1.ataque.test.ts:203` "cada campo lleva, en orden, la constante de su fila de la tabla, sin type ni aria-label" (C-14)
- F-4 `frontend/src/components/layout/estatico-r1.ataque.test.ts:248` "V-17: en campo-contrasena.tsx, sin aria-label ni aria-labelledby; un sr-only y un aria-pressed en el código" (C-14)
- F-5 `frontend/src/styles/clases-r1.ataque.test.ts:75` "V-06: ningún control con `disabled` en JSX; aria-busy y aria-disabled solo en Button; 19 enEspera" (C-15). Hoy falla con "expected 13 to have a length of 19".
- F-6 `frontend/src/styles/clases-r1.ataque.test.ts:158` "V-13: texto rojo solo donde el plan lo permite (sólido, --danger-soft o iconos)" (C-16). Hoy falla porque faltan `badge.tsx` y la quinta ruta ("expected 4 to deeply equal 5").

Revisé en la salida por qué falla cada uno: todos fallan por falta del código de 03b, no por un error de la prueba.

#### Hallazgos
Ninguno abierto. T-03 y T-04 quedan resueltos por la Enmienda 5.

#### Tabla SHA-256 final de las 52 `*.ataque` (V-01 para el programador de 03b)
"(modificado)" marca un cambio respecto de la tabla final de "AUTH-03a — Ronda 3".

| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `4FCE3CEDF662BA3A188F21A2277DB417747D342C115EFD4746D3CFF58499289B` | `backend/src/config/env.ataque.test.ts` |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `AAE65C95CF34DB814D650AF5F7FA08D09BFF3E6FC6863D4252383058499AA10E` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `3C069EF866C4A4239BF9584C56B84B5819D4018BAC309454765101ED36FF7237` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `EA078F41CC98C947D9B3966EE8ECCEC2BD5D06EACBAF7EE8CD85F38E6A697C15` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `F0CAD74195F7149BCF9E88E3A1CB5A91A3E58095194D40CBF037444BF98785AC` | `backend/test/sesiones-y-cadena.ataque.test.ts` (modificado) |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `5E92F1C572A18BC19CD06E9584AB8FC5C5A0EF709D9782AE05C85229BAAE78A0` | `frontend/src/app/marco-r1.ataque.test.tsx` (modificado) |
| `E58293532633DC5CFE21561E2609D170638C81886B9C31129F03864C73A34F45` | `frontend/src/app/router.ataque.test.tsx` |
| `06F35BE8AE68F0ABAE775268E4E64F3DF880FF137A9B54AA3C135941DDB93DCF` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` (modificado) |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `541EACE1C0389C2F7D8858A7818BB0C1FD9DEADD712C6E5F9995003813639165` | `frontend/src/styles/clases-r1.ataque.test.ts` (modificado) |
| `D81ED462116AFDD16D4C8AD534941999487D8DBF5EB9DAD22DD242CF68044115` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

Salidas completas en el scratchpad: `b0e5-frontend.txt`, `b0e5-backend.txt`, `b0e5-frontend-lint.txt`, `b0e5-backend-lint.txt`, `b0e5-diff-clases.txt` y `b0e5-tabla.md`.

---

## AUTH-03b — Ronda 1
Veredicto: **ROTO**. 7 hallazgos: 1 alta, 4 media y 2 baja.

Verificación propia (2026-09-28):
- `build` 0 y `lint` 0, desde la raíz, antes de mis pruebas.
- `test` sobre el código del programador, sin mis pruebas:
  - frontend 927/927 (58 archivos);
  - **backend 794/795 (71 archivos): falló una `*.ataque` existente, por T-05.**
- Con mis pruebas: `lint` 0 en los dos paquetes.
  - Frontend 954/960 (61 archivos): los 6 rojos son mis hallazgos.
  - Backend 834/835 (73 archivos): el rojo es T-07. En esta corrida el 403 de T-05 no apareció, porque es intermitente.

### Precondiciones y verificación
- **V-01:** las 52 `*.ataque` coinciden con la tabla final de "AUTH-03b — Ronda 0" (Complemento por la Enmienda 5), 52/52. El programador no tocó ninguna.
- **PA-01 no se activó:** `True Inbound Block Public`, red `IZZI-F281` (Public) y Docker 28.5.1, comprobado antes de cada corrida del backend.
- **PA-11 no se activó:** después de cada corrida no quedó ningún contenedor de Testcontainers.
- **PA-07 no se activó.** Evidencia sobre las dos corridas completas del backend (`r1-backend.txt` y `r1b-backend.txt`), con `grep -oF "<término>" <archivo> | wc -l`:

  | Término | `r1-backend.txt` | `r1b-backend.txt` |
  |---|---|---|
  | `40P01` | 0 | 0 |
  | `deadlock detected` | 0 | 0 |
  | `could not serialize` | 0 | 0 |
  | `P2028` | 2 | 2 |
  | `too many clients` | 0 | 0 |

  En las dos corridas, los dos `P2028` son los excluidos:
  - `POST /api/auth/login`, sobre `tx.sesion.create` (`adapters/db/sesiones.ts:39` ← `handlers/auth/index.ts:134`);
  - `POST /api/auth/restablecer`, sobre `tx.tokenCuenta.updateMany` (`adapters/db/tokens-cuenta.ts:116` ← `handlers/auth/cuentas.ts:106`).

  Ninguno sale de las transacciones nuevas de 03b.
- **Migración** `20260928224422_enlaces_registro/migration.sql`: coincide con §D-B2.
  - Tabla, índice único de `hash_token`, índice `(creado_en DESC, id DESC)`, columna `enlace_registro_id UUID` nula y sin `DEFAULT`, índice `(enlace_registro_id, creado_en)` y FK con `ON DELETE RESTRICT ON UPDATE CASCADE`.
  - No hay ningún `DROP` ni `ALTER` de columnas existentes. Solo cambia el orden de las sentencias, que genera Prisma.
  - Es compatible hacia atrás: el código anterior ignora la columna nueva.
- **Pruebas normales existentes:** comparé los títulos de `it()` contra `d8cb198` en las 5 que cambiaron. Ninguna perdió casos:
  - `bloqueo-usuario.integracion`: 21/21; E6 cambia de título y suma `enlaces-registro.ts`;
  - `contenedor-rol.test`: 9/9; un título cambia a dos enlaces;
  - `admin/lib.test`: 6 → 8;
  - `apiClient.test`: 14 → 15;
  - `authService.test`: 3 → 4.

### Hallazgos

#### T-05 — La suite del backend queda en rojo de forma intermitente: una prueba normal nueva activa el cambio obligatorio en el único admin mientras otros archivos lo usan en paralelo
Severidad: alta
Prueba: `backend/test/sesiones-y-cadena.ataque.test.ts:519`, "ninguna ruta nueva crea un administrador: invitar con rol admin en el cuerpo crea un maestro y sigue habiendo un solo admin". Falló en mi primera corrida completa (`r1-backend.txt`, 403 en lugar de 201) y pasó en la segunda.
Esperado / Obtenido:
- `backend/test/enlaces-registro.integracion.test.ts:376` ("el admin con cambio pendiente → 403 CAMBIO_DE_CONTRASENA_REQUERIDO") pone `debe_cambiar_contrasena = true` en **la cuenta real del admin único**, una vez por cada una de las 4 rutas, y la regresa a `false` en un `finally`.
- Vitest corre los archivos en paralelo contra la misma base desechable (`vitest.config.ts` no la serializa). Mientras la bandera está activa, cualquier petición del admin en otro archivo recibe `403 CAMBIO_DE_CONTRASENA_REQUERIDO`.
- Hay al menos 11 archivos que actúan como admin: `sesiones-y-cadena`, `cuentas-r1`, `cuentas-r3`, `invitacion.integracion`, `admin-correo`, `admin-restablecimiento`, `registro-maestro.integracion`, mis dos archivos de 03b, entre otros.
- Las pruebas anteriores evitan este problema: `autorizacion-cuentas.integracion:107` cubre el caso de la bandera con un maestro creado para la prueba, nunca con el admin compartido.
- El resumen del programador declara la suite en verde; fue suerte del orden de ejecución.
- Una suite intermitente activa PA-12 y, cuando cae en una `*.ataque`, PA-06.
Reproducción: correr `npm run test` desde `backend/` varias veces. El fallo aparece cuando un caso de otro archivo que usa el admin se ejecuta dentro de la ventana de la bandera.
Requisito o regla violada: `AGENTS.md`, "Pruebas" y "Definición de terminado" (`test` en verde); PA-12; PA-06.

#### T-06 — Faltan las pruebas normales del frontend de 03b que exige el plan, y el resumen no lo declara
Severidad: media (proceso; es la misma clase de omisión que T-01 de 03a)
Prueba: revisión de archivos. `grep -rln "RegistroMaestroView\|MaestrosView\|registro-maestro" frontend/src --include=*.test.*` (sin `*.ataque`) solo encuentra `admin/lib.test.ts`, `apiClient.test.ts` y `authService.test.ts`.
Esperado / Obtenido (plan, "Cambios por capa" frontend y "Pruebas requeridas" 03b):
- **`features/auth/registro-maestro-view.test.tsx` (Crear): no existe.** Faltan "sin token, envío correcto → `/maestro`, `ENLACE_INVALIDO`, `CORREO_EN_USO` y contraseña fuera de la caché".
- **`features/admin/maestros-view.tsx` "y su prueba": no existe.** Faltan todos los puntos de `/admin/maestros`:
  - vigencia fuera de rango;
  - `autoComplete="off"`;
  - `enEspera`;
  - la URL con `#token=`;
  - "Copiar enlace" con éxito y fallo;
  - el token fuera de la caché;
  - las tres insignias;
  - ver registrados y cargar más;
  - el vacío de registrados;
  - revocar con confirmación en línea;
  - el vacío de la lista con el foco;
  - el orden de los estados.
- **`features/auth/contrasena-visible.test.tsx` (Modificar, "vuelve a 7 campos"): sin cambios.** Sigue recorriendo 5 pantallas y no incluye `/registro-maestro`.

La sección "Desviaciones" del resumen no menciona ninguna de las tres. Mis `*.ataque` cubren parte de esos puntos, pero no sustituyen las pruebas del programador.
Requisito o regla violada: plan, "Cambios por capa" y "Pruebas requeridas" (03b); `AGENTS.md`, "Definición de terminado".

#### T-07 — Una cuenta queda registrada con `creado_en` posterior al `revocado_en` de su enlace
Severidad: media
Prueba: `backend/test/enlaces-03b-r1.ataque.test.ts:354`, "revocación formada detrás de un registro en curso: ningún registrado queda con creado_en posterior a revocado_en, y ninguno confirma después de la respuesta de la revocación".
Esperado / Obtenido:
- El plan pide, en "Puntos de ataque" AUTH-03b, punto 1: "ningún registrado con `creado_en` posterior al `revocado_en`".
- Obtenido: en dos corridas, "registrado el …13.280Z con el enlace revocado el …13.151Z" y "…35.110Z con el enlace revocado el …34.972Z", es decir, 129 y 138 ms después de la revocación.
- **Mecanismo:**
  1. El handler de la revocación fija `revocado_en = ahora` (`new Date()` en `handlers/admin.ts`) **antes** de que el `UPDATE` obtenga el bloqueo de la fila.
  2. Si un registro en curso tiene la fila con `FOR SHARE`, la revocación espera.
  3. Mientras espera, otros registros toman `FOR SHARE` sin esperar (es compatible y PostgreSQL no los forma detrás del `UPDATE`), crean su cuenta y confirman.
  4. Al final, la revocación escribe el `ahora` viejo.
- Se sigue cumpliendo que ningún registro confirma después de la respuesta de la revocación. Lo que falla es que el historial del admin muestra cuentas registradas después de la fecha de revocación.
- Con registros continuos, la revocación puede esperar sin límite: mientras siempre haya algún `FOR SHARE` vivo, los registros nuevos siguen entrando.
- **Método:** la prueba toma el mismo `FOR SHARE` que un registro en curso, espera con `pg_blocking_pids` a que la revocación quede formada detrás y lanza otro registro. Es determinista.
Requisito o regla violada: plan, "Puntos de ataque" AUTH-03b, punto 1; §D-B5 ("Revocación frente a registro").

#### T-08 — "Copiar enlace" le roba el foco al campo "Vigencia en días" si el admin lo tomó con la petición en vuelo (T-14)
Severidad: media
Prueba: `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx:170`, "T-14: si el admin toma el campo 'Vigencia en días' con la petición en vuelo, 'Copiar enlace' no le roba el foco".
Esperado / Obtenido:
- Esperado: el foco se queda en el campo. Obtenido: `button "Copiar enlace"`.
- `FormularioGenerarEnlace` llama a `focoDisponiblePara(raizRef.current, …)` con la raíz en **todo el formulario**, que contiene el campo de vigencia. Para esa función, el foco dentro del contenedor cuenta como disponible.
- En `ficha-de-cuenta.tsx` (AUTH-02) el contenedor no tiene campos; aquí sí.
- El caso de control (foco en "Ver registrados", fuera del formulario) sí resiste.
Requisito o regla violada: §D-B6 ("nunca le roba el foco a otro campo", T-14); `DESIGN.md` §7.13 ("el foco pasa al botón de copiar solo si nadie más lo tiene"); plan, "Puntos de ataque" AUTH-03b, punto 3.

#### T-09 — La confirmación en línea de "Revocar" no sigue §7.14: el foco cae a `<body>` al abrirla y al cancelarla, y la frase va después de "Sí, revocar"
Severidad: media
Pruebas en `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx`:
- `:266`, "al pedir la confirmación, el foco va a 'Cancelar' (nunca a <body> ni a 'Sí, revocar')";
- `:278`, "al cancelar, el foco vuelve a 'Revocar' (nunca a <body>)";
- `:292`, "la frase de consecuencia va antes de 'Sí, revocar' en el orden de lectura".

Esperado / Obtenido:
- **Foco:** en los dos primeros casos, el foco queda en `<body>`. `FilaEnlace` (`tabla-enlaces.tsx`) desmonta el botón que tenía el foco ("Revocar" o "Cancelar") y no mueve el foco a ningún lado. Una persona con teclado pierde su lugar en la tabla.
- **Orden de lectura:** la frase de consecuencia se pinta en una fila aparte, **después** de "Sí, revocar", así que un lector de pantalla llega al botón destructivo antes que a la explicación.
- **Documentación:** `DESIGN.md` §7.14, redactado por el mismo programador, pide "la frase de consecuencia, seguida de 'Sí, …'", que "al pedir la confirmación, el foco va a 'Cancelar'" y que "al cancelar, vuelve al botón que abrió la confirmación". Además afirma que `TablaEnlaces` implementa el patrón. `AccionRestablecer` (`ficha-de-cuenta.tsx`) sí lo hace (T-09 y T-10 de AUTH-02).
- Doble clic y Enter repetido sobre "Sí, revocar" resisten: una sola petición.
Requisito o regla violada: `DESIGN.md` §7.14; §D-B6 (confirmación en línea "como la del restablecimiento"); plan, "Puntos de ataque" AUTH-03b, punto 3.

#### T-10 — Con dos o más enlaces, "Revocar" y "Ver registrados" se repiten con el mismo nombre accesible
Severidad: baja
Prueba: `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx:364`, "con dos enlaces vigentes, ningún nombre de botón se repite en la vista".
Esperado / Obtenido:
- Esperado: nombres distintos. Obtenido: botones repetidos, `Ver registrados, Revocar`.
- Cada fila pinta "Revocar" y "Ver registrados" sin nada que los distinga (por ejemplo, la fecha de creación del enlace). En la lista de botones del lector de pantalla son indistinguibles.
- El plan lo nombra como punto de ataque ("ningún nombre de botón repetido en la vista"). La prueba requerida del plan lo pedía solo para el vacío, así que el manager decide el alcance.
Requisito o regla violada: plan, "Puntos de ataque" AUTH-03b, punto 3.

#### T-11 — `?? []` para ocultar datos faltantes en las dos tablas nuevas
Severidad: baja
Prueba: `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx:441`, "tabla-enlaces y registrados-del-enlace no usan `?? []` para ocultar datos faltantes".
Esperado / Obtenido: `tabla-enlaces.tsx:136` y `registrados-del-enlace.tsx:36` hacen `data?.pages.flatMap(…) ?? []` y después iteran. Obtenido: los dos archivos.
Requisito o regla violada: `CLAUDE.md`, "Valores por defecto" y "Lo que no se hace" ("No uses `?? []` para ocultar datos faltantes").

### Atacado sin hallazgos
**Backend** (`enlaces-03b-r1.ataque.test.ts`, 38 casos; `logs-03b-r1.ataque.test.ts`, 2):
- **Registro con el enlace:**
  - vencido hace 1 ms → 400;
  - inexistente, vencido, revocado, invitación y recuperación vivas de `tokens_cuenta`, 42 y 44 caracteres, con espacios, el hash como token y un carácter cambiado → **el mismo** 400, cuerpo y encabezados, sin cookie y sin crear nada;
  - `rol`, `enlaceRegistroId` de otro enlace, `activo`, `estadoPago`, `accesoRestringido`, `motivoRestriccion`, `debeCambiarContrasena`, `id` y `creadoEn` en el cuerpo → ignorados: la cuenta es maestro, del enlace del token y al corriente, sigue habiendo un solo admin y la respuesta es exactamente `{ tokenAcceso }`;
  - el mismo correo en dos registros simultáneos, con otra capitalización → 201 y 409, sin 5xx;
  - el correo del admin o de un estudiante, con mayúsculas y espacios → 409, sin tocar su rol, su enlace ni su hash;
  - los atributos de la cookie;
  - revocar no toca las cuentas ya creadas: siguen entrando y refrescando, y el enlace revocado responde 400;
  - 20 registros simultáneos con la revocación en medio → sin 5xx, solo 201 o 400, tantas cuentas como 201 y ninguna después.
- **Token:**
  - 201 con `no-store`;
  - la respuesta trae exactamente `{ enlace, token }` y las 6 claves del enlace;
  - el token tiene 43 caracteres base64url, y en la base solo está su SHA-256;
  - la lista, la revocación y los registrados no traen el token, el hash, ninguna clave `hash*` ni `estadoPago`;
  - dos enlaces seguidos tienen tokens distintos;
  - `expiraEn`, `revocadoEn`, `hashToken`, `id` y `estado` en el cuerpo se ignoran;
  - `vigenciaDias` en -1, 0, 31, 1.5, "7", `null`, `true`, `[7]` y `1e308` → 400 `VALIDACION`.
- **Autorización de las 4 rutas, más los dos `HEAD`:** sin token y con un JWT alterado → 401; un maestro creado con un enlace y un estudiante → 403 `ROL_NO_PERMITIDO`, sin datos y sin revocar nada.
- **Paginación:**
  - `limite` en -1, 0, 101, 1.5, `abc`, gigante o repetido → 400;
  - `cursor` que no es uuid, con inyección SQL o repetido → 400;
  - `cursor` inexistente o que es el id de un usuario → nunca 5xx ni datos de usuarios;
  - enlaces con el mismo `creado_en`, de 2 en 2 → todos, una sola vez y en orden `id DESC`;
  - registrados de 1 en 1 con empates → todos, una vez, en orden y con las 4 claves exactas;
  - un cursor de otro enlace no mezcla usuarios, y un `deudor` no filtra `estadoPago`.
- **Revocar:**
  - un enlace vencido → 200, estado `revocado` y fecha guardada;
  - dos revocaciones simultáneas → 200 y 200 con la misma fecha;
  - un `:id` que no es uuid → 400;
  - el id de un usuario → 404 `ENLACE_NO_ENCONTRADO`.
- **Log de la API real (PA-10):** ni el token del enlace, ni su hash, ni las 3 contraseñas, ni los JWT, ni las cookies, ni `#token=`.
- **Revisión estática del código:**
  - el SQL etiquetado de `registrarMaestroConEnlace` va parametrizado;
  - la lista cuenta los registrados con un solo `groupBy`, sin N+1;
  - las rutas del admin pasan por `protegido({ roles: ["admin"] })`;
  - `registro-maestro` está en `RUTAS_PUBLICAS`;
  - ningún handler lleva `try/catch` ni verificaciones de rol a mano.

**Frontend** (`maestros-03b-r1`, 20 casos; `registro-maestro-03b-r1`, 11; `badge-03b-r1`, 2):
- **El enlace nuevo:**
  - aparece con el origen y `#token=`;
  - no queda en la caché de consultas, en la de mutaciones ni en `localStorage` o `sessionStorage`, y desaparece al desmontar;
  - si el foco se fue fuera del formulario, no se lo roba;
  - con clic triple y los dos envíos del formulario → una sola petición, en espera y con el foco;
  - una vigencia de 0, 31, 1.5 o -3 → `ErrorDeCampo` descrito por el campo, ninguna petición y `autoComplete="off"`;
  - "Copiar enlace" copia la URL exacta y avisa del éxito y del fallo.
- **Estados:**
  - error → `MensajeError`, sin tabla ni vacío;
  - carga → `Cargando`;
  - vacío → título, frase y "Generar el primer enlace", que lleva el foco al campo, sin nombres repetidos;
  - el vacío de registrados no tiene botones, y su error muestra `MensajeError`.
- **Insignias:** las tres con texto e icono `aria-hidden`; solo la vigente ofrece "Revocar". Las cuatro variantes de `badge.tsx` superan 4.5:1.
- **`/registro-maestro`:**
  - limpia el fragmento y no pinta el token;
  - sin token muestra el enlace inválido sin hacer ninguna petición;
  - el cuerpo del envío lleva exactamente `{ nombre, email, contrasena, token }`, llega a `/maestro` y ni la contraseña ni el token quedan en ninguna caché;
  - `ENLACE_INVALIDO` → enlace inválido, sin formulario ni caché;
  - `CORREO_EN_USO` → alerta, y se queda;
  - con clic triple y los envíos del formulario → una sola petición.
- **Marco del admin en `/admin/maestros`:**
  - "Maestros" activo y "Cuentas" no;
  - un `h1` "Maestros";
  - todo cuelga de `data-material="opaco"` y `data-densidad="densa"`.
- **Guardas:** estudiante, maestro, restringido y sin sesión terminan en su destino sin pedir nada a `/api/admin/`.
- **Regresión de 03a y anteriores:** las 52 `*.ataque` previas pasan. En la primera corrida falló la de T-05, por la prueba del programador, no por el código de producción.

### Observaciones (no son hallazgos)
1. **Vencimiento durante argon2.** `registrarMaestroConEnlace` comprueba `expira_en > ahora` con el `ahora` del inicio de la petición, calculado antes de argon2. Un registro que empezó antes del vencimiento puede confirmar hasta unos cientos de milisegundos después. Así lo define §D-B5 (`$2` = `ahora`), y tiene la misma raíz que T-07.
2. **`DESIGN.md` §7.14 afirma que `TablaEnlaces` implementa el patrón.** Hoy no es cierto (T-09). El manager lo revisa en el diff del documento.
3. **Un error mío corregido antes del reporte.** Mi primer caso de "dos envíos en el mismo instante" disparaba dos `requestSubmit` dentro de un solo `act`, algo que no ocurre en un navegador (React procesa cada clic discreto por separado). Todos los formularios del proyecto usan el mismo patrón `isPending`. Lo reescribí con eventos separados, como `en-espera-r1`, y resiste.

### No atacado y por qué
- **360 px y el gestor de contraseñas:** son H-5 y H-6 de la comprobación humana.
- **Tiempos de respuesta entre tokens inválidos:** una medición sería intermitente. Sí probé la igualdad de estado, cuerpo y encabezados.
- **La carrera con 20 registros midiendo el orden de las respuestas:** el orden en que se resuelven las promesas no refleja el orden de confirmación, así que la prueba sería intermitente. Lo cubren el caso determinista de T-07 y el de 20 registros, que no depende del orden.

### Tabla SHA-256 de las 57 `*.ataque` (V-01 para la ronda siguiente)
"(nuevo)" marca los 5 archivos de esta ronda. Las 52 anteriores no cambiaron respecto de la tabla final de la ronda 0.

| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `4FCE3CEDF662BA3A188F21A2277DB417747D342C115EFD4746D3CFF58499289B` | `backend/src/config/env.ataque.test.ts` |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `AAE65C95CF34DB814D650AF5F7FA08D09BFF3E6FC6863D4252383058499AA10E` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `3C069EF866C4A4239BF9584C56B84B5819D4018BAC309454765101ED36FF7237` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` (nuevo) |
| `EA078F41CC98C947D9B3966EE8ECCEC2BD5D06EACBAF7EE8CD85F38E6A697C15` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` (nuevo) |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `F0CAD74195F7149BCF9E88E3A1CB5A91A3E58095194D40CBF037444BF98785AC` | `backend/test/sesiones-y-cadena.ataque.test.ts` |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `5E92F1C572A18BC19CD06E9584AB8FC5C5A0EF709D9782AE05C85229BAAE78A0` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` (nuevo) |
| `E58293532633DC5CFE21561E2609D170638C81886B9C31129F03864C73A34F45` | `frontend/src/app/router.ataque.test.tsx` |
| `06F35BE8AE68F0ABAE775268E4E64F3DF880FF137A9B54AA3C135941DDB93DCF` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` (nuevo) |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `2BE549BAB5A49F603C7CA1C9F28BEF7E2322D5A8ABA1486756A080C39A2A767A` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` (nuevo) |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `541EACE1C0389C2F7D8858A7818BB0C1FD9DEADD712C6E5F9995003813639165` | `frontend/src/styles/clases-r1.ataque.test.ts` |
| `D81ED462116AFDD16D4C8AD534941999487D8DBF5EB9DAD22DD242CF68044115` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

Salidas completas en el scratchpad de la sesión: `r1-build.txt`, `r1-lint.txt`, `r1-backend.txt` (con el fallo de T-05), `r1-frontend.txt`, `r1b-backend.txt`, `r1b-frontend.txt`, `r1b-frontend-lint.txt`, `r1b-backend-lint.txt`, `r1-solo-enlaces.txt`, `r1-solo-logs.txt`, `r1-solo-maestros.txt`, `r1-solo-front.txt` y `r1-tabla.md`.

---

## AUTH-03b — Ronda 2
Veredicto: **ROTO**, solo por T-12 (media, de proceso). El código de producción resistió todos los ataques de esta ronda: T-05, T-07, T-08, T-09, T-10 y T-11 quedaron corregidos. T-06 quedó a medias.

Verificación propia (2026-09-28):
- `build` 0, desde la raíz, antes de mis cambios. Después solo cambiaron archivos de pruebas.
- `lint` 0, desde la raíz, antes y después de mis cambios.
- `test`:
  - frontend 981/981 (63 archivos);
  - backend, tres corridas completas y todas en verde: 835/835 antes de mis cambios y 838/838 dos veces con ellos.

### Precondiciones y verificación
- **V-01:** antes de tocar nada, las 57 `*.ataque` coincidían con la tabla de "AUTH-03b — Ronda 1", 57/57. El programador no tocó ninguna.
- **PA-01 no se activó:** `True Inbound Block Public`, red `IZZI-F281` (Public) y Docker 28.5.1, comprobado antes de las corridas del backend.
- **PA-11 no se activó.** Ryuk seguía arriba justo al terminar la tercera corrida, y ya no estaba al revisar de nuevo, dentro de los 120 s.
- **PA-12:** mis pruebas nuevas corrieron 3 veces seguidas por separado (`enlaces-03b-r2`) y 3 veces el archivo `maestros-03b-r1`, más las corridas completas. Ninguna fue intermitente.
- **PA-07 no se activó.** Evidencia sobre las tres corridas completas del backend (`r2-backend-1.txt`, `-2` y `-3`), con `grep -oF "<término>" <archivo> | wc -l`:

  | Término | Corrida 1 | Corrida 2 | Corrida 3 |
  |---|---|---|---|
  | `40P01` | 0 | 0 | 0 |
  | `deadlock detected` | 0 | 0 | 0 |
  | `could not serialize` | 0 | 0 | 0 |
  | `P2028` | 2 | 2 | 2 |
  | `too many clients` | 0 | 0 | 0 |

  En las tres corridas, los dos `P2028` son los excluidos:
  - `POST /api/auth/login`, sobre `tx.sesion.create` (`adapters/db/sesiones.ts:39` ← `handlers/auth/index.ts:134`);
  - `POST /api/auth/restablecer`, sobre `tx.tokenCuenta.updateMany` (`adapters/db/tokens-cuenta.ts:116` ← `handlers/auth/cuentas.ts:106`).

  Mis archivos de T-07, corridos solos, no produjeron ningún `P2028` en 5 corridas.
- **Pruebas normales, títulos de `it()` contra `d8cb198`:** ninguna perdió casos.
  - `bloqueo-usuario.integracion`: 21/21; E6 renombrado, como en la ronda 1;
  - `contenedor-rol.test`: 9/9, igual que en la ronda 1;
  - `admin/lib.test`: 6 → 10;
  - `contrasena-visible.test`: un `it.each` con un caso más (6 formularios);
  - `apiClient.test`: 14 → 15;
  - `authService.test`: 3 → 4.

  Los 9 archivos de pruebas normales nuevos de 03b no tienen base en `d8cb198`.

### T-05 a T-11, uno por uno
| Hallazgo | Estado | Cómo lo verifiqué |
|---|---|---|
| **T-05** | **Corregido** | `enlaces-registro.integracion.test.ts:380` usa una cuenta desechable con la bandera, sin tocar al admin. Ningún archivo de `backend/test` hace `update` sobre la cuenta del admin. Tres corridas completas del backend en verde, sin el 403 intermitente |
| **T-06** | **A medias → T-12** | `registro-maestro-view.test.tsx` cubre lo requerido. `contrasena-visible.test.tsx` suma `/registro-maestro`. `maestros-view.test.tsx` no cubre todo lo que exige el plan (T-12) |
| **T-07** | **Corregido** | `enlaces-03b-r1:354` sigue en verde sin cambios. El caso determinista nuevo del arbitraje (`enlaces-03b-r2:92`) pasa en sus dos variantes. 40 registros simultáneos con el mismo enlace, ahora en serie, dan 40 × 201, sin 5xx y sin `P2028` |
| **T-08** | **Corregido** | `maestros-03b-r1:182` ("T-14… vigencia") en verde. El contenedor de `focoDisponiblePara` ya no incluye el campo |
| **T-09** | **Corregido** | `maestros-03b-r1:278`, `:290` y `:304` en verde: el foco va a "Cancelar", vuelve a "Revocar" y la frase va antes de "Sí, revocar" |
| **T-10** | **Corregido**, con la Enmienda 6 y R-18 | El caso reforzado (`maestros-03b-r1:382`, abajo) pasa con el nombre accesible calculado, en los tres momentos, con los 8 nombres exactos de la Enmienda 6 y de R-18 |
| **T-11** | **Corregido** | `maestros-03b-r1:547` en verde. `grep "?? \[\]"` sobre el código de producción de `frontend/src` da 0 |

### Diff de mi `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` (R-10), caso por caso
El archivo se ajusta por instrucción del manager (arbitraje de T-10). Diff completo en el scratchpad: `r2-diff-maestros.txt`, contra la copia `r2-maestros-antes.tsx` que guardé antes de tocarlo.

**Cabecera:**
- se importa `formatearFechaHora` de `@/lib/format` (lo usa el caso de T-10);
- 6 expresiones ancladas: `REVOCAR = /^Revocar( |$)/`, `SI_REVOCAR`, `CANCELAR`, `VER_REGISTRADOS`, `OCULTAR_REGISTRADOS` y `CARGAR_MAS`, con la misma forma.
  - `( |$)` en lugar de `\b` exige que después del texto visible venga un espacio o el final, así que "Revocar" no coincide con "Revocado".
- `boton()` acepta `string | RegExp`.

**Solo cambia el localizador. Lo que comprueba cada caso queda igual, aserción por aserción:**

| Caso (línea nueva) | Antes | Ahora | Lo que sigue comprobando, sin cambios |
|---|---|---|---|
| `:164` enlace nuevo fuera de la caché | `{ name: "Revocar" }` como espera de carga | `{ name: REVOCAR }` | La URL con `#token=`, fuera de las dos cachés y de `storage`, y ausente tras desmontar |
| `:182` T-14, vigencia | ídem | ídem | El foco se queda en el campo |
| `:201` T-14, "Ver registrados" | `{ name: "Ver registrados" }` | `{ name: VER_REGISTRADOS }` | El foco se queda en "Ver registrados" |
| `:215` clic triple | `{ name: "Revocar" }` | `{ name: REVOCAR }` | Una sola petición, en espera y con el foco |
| `:236` vigencia × 4 | ídem | ídem | `ErrorDeCampo` descrito, ninguna petición, `autoComplete="off"` |
| `:255` "Copiar enlace" | ídem | ídem | La URL exacta, el aviso de éxito y el de fallo |
| `:278` foco a "Cancelar" | `"Revocar"`, `"Sí, revocar"` y `boton("Cancelar")` | `REVOCAR`, `SI_REVOCAR` y `boton(CANCELAR)` | El foco en "Cancelar" |
| `:290` foco de vuelta a "Revocar" | `"Revocar"` ×2, `"Cancelar"` y `boton("Revocar")` | las expresiones equivalentes | El foco en "Revocar" |
| `:304` orden de lectura | `"Revocar"` y `boton("Sí, revocar")` | `REVOCAR` y `boton(SI_REVOCAR)` | La frase va antes de "Sí, revocar" |
| `:318` doble clic y Enter | `"Revocar"`, `"Sí, revocar"` ×4 | `REVOCAR` y `SI_REVOCAR` | Una petición, en espera y sin `disabled` |
| `:486` insignias | `within(fila).queryByRole("button", { name: "Revocar" })` | `{ name: REVOCAR }`, dentro de la misma fila | Texto e icono `aria-hidden` en las tres; "Revocar" solo en la vigente |
| `:517` registrados vacío | `"Ver registrados"` ×2 y `"Ocultar registrados"` ×2 | `VER_REGISTRADOS` y `OCULTAR_REGISTRADOS` | Sin botones en el vacío, `aria-expanded` y `MensajeError` con error |

Sin cambios:
- `:343` error, `:352` carga, `:362` vacío (su comprobación de nombres usa `textContent`, pero en el vacío no hay botones de fila);
- `:547`, `?? []`.

**Caso reforzado de T-10 (`:382`, antes `:364`)**, con el título nuevo "con dos enlaces vigentes, ningún nombre accesible de botón se repite: cerradas, con las dos confirmaciones abiertas y con las dos filas expandidas con más de 20 registrados".
- **Qué comparaba antes:** `aria-label ?? textContent`, que un `<span aria-hidden>` satisfacía (lo que pasó en la primera corrección).
- **Qué compara ahora:**
  1. **El nombre accesible calculado**, que se obtiene con el comparador de función de Testing Library: `getAllByRole("button", { name: (nombre, elemento) => … })` recibe el nombre que calcula la librería para cada botón. No se importa `dom-accessibility-api`.
  2. **Unicidad, en tres momentos:** las dos filas cerradas; las dos confirmaciones abiertas; y las dos filas expandidas, con 20 registrados y `siguienteCursor`, así que aparecen los dos "Cargar más" (R-18). En cada momento, todos los botones tienen nombre, ningún nombre se repite y `getAllByRole("button", { name })` devuelve un solo botón por nombre.
  3. **Los nombres exactos de la Enmienda 6 y de R-18**, con `formatearFechaHora(creadoEn)` de cada fila:
     - "Ver registrados del enlace creado el …";
     - "Revocar el enlace creado el …";
     - "Sí, revocar el enlace creado el …";
     - "Cancelar la revocación del enlace creado el …";
     - "Ocultar registrados del enlace creado el …";
     - "Cargar más registrados del enlace creado el …".

     Uno por fila en cada caso.
  4. **Los 8 botones de fila del último momento:**
     - ninguno tiene `aria-label` ni `aria-labelledby`;
     - ninguno está dentro de un `aria-hidden`;
     - ningún descendiente con texto es `aria-hidden`;
     - el dato de la fila vive en un elemento propio dentro del botón.
- **Una espera corregida en mi borrador.** Los dos "Cargar más" se esperan con `waitFor(… toHaveLength(2))`, porque `findAll` se resuelve con el primero y cada fila pide sus registrados por separado. La primera versión fallaba por eso, no por el código de producción.

### Pruebas nuevas
- **`backend/test/enlaces-03b-r2.ataque.test.ts`** (archivo nuevo, 3 casos):
  - **`:92`, T-07 determinista** (arbitraje): una transacción retiene la fila del enlace, la revocación queda formada detrás, llegan N = 5 registros formados uno por uno y se suelta la fila.
    - Exige que la revocación responda primera (orden de respuesta 1) con 200, los 5 con `400 ENLACE_INVALIDO`, ningún 5xx, `revocado_en` guardado, ninguna cuenta creada y ningún `creado_en` posterior a `revocado_en`.
    - **Dos variantes de la retención:** `FOR NO KEY UPDATE` (el modo de un registro en curso) y `FOR SHARE`. La segunda es la que distingue la cola justa: con el registro en `FOR SHARE` (el diseño anterior), los 5 se habrían concedido sin formarse y habrían creado su cuenta.
    - Si un registro termina en lugar de formarse, la precondición no falla: llega a las aserciones.
    - N = 5 porque el pool de `pg` tiene 10 conexiones por defecto.
  - **`:223`, 40 registros simultáneos con el mismo enlace**, que ahora van en serie: 40 × 201, 40 cuentas, sin 5xx y sin `P2028`. Ataca la afirmación de la Enmienda 6 ("tiempo acotado, sin riesgo de `P2028`") con el cuádruple del pool.

  Los P2028 de estos casos se revisan en la salida completa (PA-07): ninguno.

### Hallazgos

#### T-12 — La corrección de T-06 dejó `maestros-view.test.tsx` sin varios casos que exige el plan, y el resumen los da por cubiertos
Severidad: media (proceso; la misma clase que T-01 y T-06)
Prueba: revisión de `frontend/src/features/admin/maestros-view.test.tsx` contra "Pruebas requeridas" (frontend de 03b, `/admin/maestros`). No hay una prueba que falle, porque falta cobertura; la reproducción es la lectura del archivo.
Esperado / Obtenido:
- **"generar: … `enEspera`":** ningún caso comprueba `aria-busy` ni la espera de "Generar enlace". El archivo no menciona `enEspera`, `aria-busy` ni `isPending`.
- **"'Copiar enlace' con un portapapeles simulado: éxito y fallo, cada uno con su `toast`":**
  - `:147` solo prueba el éxito, y sin comprobar el `toast`: solo que `writeText` recibió la URL;
  - no hay ningún caso de fallo del portapapeles.
- **"el token fuera de la caché de mutaciones tras asentarse":** `:163` solo mira la caché de **consultas** (`volcadoDeConsultas`), no la de mutaciones, que es donde vive el token de `useGenerarEnlace`.
- **"el vacío de la lista con 'Generar el primer enlace' en `outline` … ningún par de botones con el mismo nombre":** `:268` no comprueba ni la variante ni los nombres repetidos.
- **"estados en el orden error → carga → vacío → datos":** `:280` lleva ese título, pero solo comprueba que el error muestra una alerta. No toca carga, vacío ni datos, ni el orden.
- **El resumen del programador no es exacto:**
  - en "Corrección de la ronda 1" lista "12 pruebas" que incluyen "'Copiar enlace' copia y avisa" y "el token fuera de la caché de consultas", y da T-06 por "corregido";
  - en "Arbitraje de T-07 y T-10" afirma que `maestros-view.test.tsx` "sigue con sus 22 casos". El archivo tiene 12.

Mis `*.ataque` cubren esos comportamientos y resisten, pero no sustituyen las pruebas normales que exige el plan (T-06).
Requisito o regla violada: plan, "Pruebas requeridas" (frontend de 03b); `AGENTS.md`, "Definición de terminado" y "Ningún agente declara verde algo que no ejecutó".

### Atacado sin hallazgos
- **T-07:**
  - la revocación formada detrás de un titular en `FOR NO KEY UPDATE` y en `FOR SHARE`, con 5 registros formados después: la cola es justa, la revocación responde primera y los 5 responden 400;
  - la serie de 40 registros simultáneos: 40 × 201, sin 5xx ni `P2028`;
  - `enlaces-03b-r1:354` (un registro que llega detrás de una revocación formada) en verde sin cambios.
- **T-10 y R-18:** el nombre accesible calculado es único en los tres momentos y es exactamente el de la Enmienda 6 en los 8 botones de fila. No hay `aria-label`, `aria-labelledby` ni `aria-hidden`.
- **T-08 y T-09:** el foco con la petición en vuelo, al abrir y al cancelar la confirmación, y el orden de lectura.
- **T-11:** 0 usos de `?? []` en el código de producción del frontend.
- **Regresión de 03a y de 03b:** las 58 `*.ataque` en verde (backend 838/838 dos veces y frontend 981/981), incluidas las 5 de 03a y las 6 de 03b.

### Observaciones (no son hallazgos)
1. **R-17 (riesgo aceptado).** Dos enlaces creados en el mismo minuto repetirían los nombres. No lo ataqué: el plan lo acepta.
2. **La observación 1 de la ronda 1 sigue:** el vencimiento se evalúa con el `ahora` del inicio de la petición, antes de argon2. §D-B5 lo define así, y la Enmienda 6 no lo cambió.

### No atacado y por qué
- **360 px y el gestor de contraseñas:** son H-5 y H-6 de la comprobación humana.
- **Un lector de pantalla real:** jsdom no lee en voz alta. El nombre accesible que calcula Testing Library sigue la misma especificación (accname) que los navegadores.

### Tabla SHA-256 de las 58 `*.ataque` (V-01 para la ronda siguiente)
"(nuevo)" y "(modificado)" se comparan contra la tabla de "AUTH-03b — Ronda 1". Las otras 56 no cambiaron.

| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `4FCE3CEDF662BA3A188F21A2277DB417747D342C115EFD4746D3CFF58499289B` | `backend/src/config/env.ataque.test.ts` |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `AAE65C95CF34DB814D650AF5F7FA08D09BFF3E6FC6863D4252383058499AA10E` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `3C069EF866C4A4239BF9584C56B84B5819D4018BAC309454765101ED36FF7237` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` (nuevo) |
| `EA078F41CC98C947D9B3966EE8ECCEC2BD5D06EACBAF7EE8CD85F38E6A697C15` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `F0CAD74195F7149BCF9E88E3A1CB5A91A3E58095194D40CBF037444BF98785AC` | `backend/test/sesiones-y-cadena.ataque.test.ts` |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `5E92F1C572A18BC19CD06E9584AB8FC5C5A0EF709D9782AE05C85229BAAE78A0` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |
| `E58293532633DC5CFE21561E2609D170638C81886B9C31129F03864C73A34F45` | `frontend/src/app/router.ataque.test.tsx` |
| `06F35BE8AE68F0ABAE775268E4E64F3DF880FF137A9B54AA3C135941DDB93DCF` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` (modificado) |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `541EACE1C0389C2F7D8858A7818BB0C1FD9DEADD712C6E5F9995003813639165` | `frontend/src/styles/clases-r1.ataque.test.ts` |
| `D81ED462116AFDD16D4C8AD534941999487D8DBF5EB9DAD22DD242CF68044115` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

Salidas completas en el scratchpad de la sesión: `r2-build.txt`, `r2-lint.txt`, `r2-lint-fin.txt`, `r2-backend-1.txt`, `r2-backend-2.txt`, `r2-backend-3.txt`, `r2-frontend-base.txt` (los 15 rojos de antes del ajuste), `r2-frontend.txt`, `r2-solo-1.txt` a `r2-solo-3.txt`, `r2-serie-1.txt` y `r2-serie-2.txt`, `r2-maestros-antes.tsx`, `r2-diff-maestros.txt` y `r2-tabla.md`.

---

## AUTH-03b — Ronda 3
Veredicto: **RESISTE**. Sin hallazgos. T-12 quedó corregido y no encontré regresiones en 03b ni en 03a.

Verificación propia (2026-09-28):
- `build` 0 y `lint` 0, desde la raíz.
- `test`: frontend 985/985 (63 archivos) y backend 838/838 (74 archivos).

### Precondiciones y verificación
- **V-01:** las 58 `*.ataque` coinciden con la tabla de "AUTH-03b — Ronda 2", 58/58. Nadie las tocó y yo no las toqué en esta ronda.
- **Código de producción sin cambios desde mi ronda 2:**
  - el único archivo de `backend/src`, `backend/prisma`, `frontend/src` y `shared/src` posterior a mi reporte de la ronda 2 es `frontend/src/features/admin/maestros-view.test.tsx`, una prueba normal (`find -newer`, sin el cliente generado de Prisma);
  - coincide con lo que declara el programador.
- **PA-01 no se activó:** `True Inbound Block Public`, red `IZZI-F281` (Public) y Docker 28.5.1, antes de la corrida del backend.
- **PA-11 no se activó:** sin contenedores de Testcontainers al terminar.
- **PA-07 no se activó.** Sobre la salida completa del backend (`r3-backend.txt`), con `grep -oF "<término>" r3-backend.txt | wc -l`:

  | Término | Apariciones |
  |---|---|
  | `40P01` | 0 |
  | `deadlock detected` | 0 |
  | `could not serialize` | 0 |
  | `P2028` | 2 |
  | `too many clients` | 0 |

  Los dos `P2028` son los excluidos:
  - `POST /api/auth/login`, sobre `tx.sesion.create` (`adapters/db/sesiones.ts:39` ← `handlers/auth/index.ts:134`);
  - `POST /api/auth/restablecer`, sobre `tx.tokenCuenta.updateMany` (`adapters/db/tokens-cuenta.ts:116` ← `handlers/auth/cuentas.ts:106`).
- **Una sola corrida del backend en esta ronda**, porque el backend no cambió desde la ronda 2, que ya tuvo tres corridas completas sin intermitencia (T-05).

### T-12, punto por punto
**16 casos, confirmados con la herramienta:** `npx vitest list src/features/admin/maestros-view.test.tsx` lista 16, y la corrida da 16 passed.

**Revisión de lectura:**
- ningún caso termina con un `return` temprano;
- todos ejecutan al menos una aserción;
- las esperas diferidas se resuelven dentro del caso.

**Verificación por mutación.** Hice copias de la prueba en el scratchpad, cada una con un `vi.mock` que quita un comportamiento, y las corrí con una configuración de Vitest propia (`scratchpad/mut/`). No toqué el código de producción ni el repositorio. La copia sin mutar (control) pasa 16/16.

| Punto de T-12 | Caso nuevo o ampliado | Mutante | Qué falla con el mutante |
|---|---|---|---|
| "Generar enlace" con `enEspera` | `:152` (nuevo) | m1: `Button` ignora `enEspera` | `:152`, y también `:300` |
| "Copiar enlace", fallo con su `toast` | `:211` (nuevo); `:193` ampliado con `aviso.success` y sin `aviso.error` | m5: el `toast.error` no se llama | `:211` |
| El token fuera de la caché de **mutaciones** | `:229` (ampliado) | m2: `sacarDeLaCacheAlAsentar` no hace nada | `:229` |
| "Generar el primer enlace" en `outline` y sin nombres repetidos | `:406` (ampliado) | m4: el vacío pinta su acción en `primary` | `:406` |
| Estados error → carga → vacío → datos | `:422` (reescrito: los cuatro estados, cada uno con lo que no debe aparecer) | — (por lectura: cada estado comprueba su elemento y la ausencia de los otros) | — |
| Agregado del programador: "Cargar más" en espera | `:300` (nuevo) | m1 | `:300` |
| Agregado del programador: los cuatro nombres de fila con la fecha (Enmienda 6) | `:351` (nuevo) | m3: `textoOcultoDeFila` devuelve "" | `:351` |

Cada mutante lo detecta exactamente el caso que dice cubrirlo, y ninguno más salvo m1, que detectan los dos casos de espera. Salidas: `r3-m0-control.txt` a `r3-m5-sin-toast-de-error.txt`.

**La pregunta del orquestador: comparar `textContent` en `:406`, ¿basta o es un hueco?** Basta para una prueba normal, y no es un hueco en este estado. Lo comprobé con dos mutantes más:
- **m6:** el botón del vacío recibe por `aria-label` el nombre "Generar enlace", con el mismo texto visible. La comparación de `textContent` no lo ve, pero `:406` falla igual, porque localiza el botón por su nombre accesible exacto ("Generar el primer enlace") y ya no lo encuentra.
- **m7:** "Generar enlace" recibe por `aria-label` el nombre "Generar el primer enlace". `:406` falla: el localizador exacto de `findByRole` choca con otro botón del mismo nombre.

En el vacío solo hay esos dos botones, así que cualquier choque de nombres accesibles pasa por el botón que la prueba localiza por nombre exacto. Por eso la comparación de `textContent` solo tiene que cubrir los textos visibles repetidos, y lo hace. Para las filas, donde el nombre accesible difiere del texto visible, el hueco sí existiría, y lo cubre `maestros-03b-r1.ataque.test.tsx:382`, que compara el nombre calculado en los tres momentos.

**El conteo del resumen:** el programador corrigió los "22 casos" (eran 12) y ahora cuenta con `vitest list`. Su conteo de 16 coincide con el mío.

### Última pasada de regresión (03b y 03a)
- **Las 58 `*.ataque` en verde:** frontend 985/985 y backend 838/838. Incluyen:
  - las de 03a: `cuentas-03a-r1`, `logs-03a-r1`, `invitacion-flujo-03a-r2`, `cache-03a-r1` e `invitacion-r1`;
  - las de 03b: `enlaces-03b-r1` y `-r2`, `logs-03b-r1`, `maestros-03b-r1`, `registro-maestro-03b-r1` y `badge-03b-r1`;
  - las 4 reescritas en la ronda 0: `sesiones-y-cadena`, `marco-r1`, `estatico-r1` y `clases-r1`.
- Las pruebas normales nuevas de 03b y las anteriores, en verde.

### Hallazgos
Ninguno.

### Observaciones (no son hallazgos)
1. **R-17 (riesgo aceptado por el plan):** dos enlaces creados en el mismo minuto repetirían los nombres accesibles de fila.
2. **La observación 1 de la ronda 1 sigue:** el vencimiento se evalúa con el `ahora` del inicio de la petición, antes de argon2. Así lo define §D-B5.

### No atacado y por qué
- **360 px, el gestor de contraseñas y un lector de pantalla real:** son H-5 y H-6 de la comprobación humana, y jsdom no los reproduce.

### Tabla SHA-256 final de las 58 `*.ataque` (cierre de 03b; base de V-01 para 03c)
Idéntica a la tabla de "AUTH-03b — Ronda 2": esta ronda no cambió ninguna `*.ataque`. Va sin marcas de cambio, para que sirva de base limpia.

| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `4FCE3CEDF662BA3A188F21A2277DB417747D342C115EFD4746D3CFF58499289B` | `backend/src/config/env.ataque.test.ts` |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `AAE65C95CF34DB814D650AF5F7FA08D09BFF3E6FC6863D4252383058499AA10E` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `3C069EF866C4A4239BF9584C56B84B5819D4018BAC309454765101ED36FF7237` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |
| `EA078F41CC98C947D9B3966EE8ECCEC2BD5D06EACBAF7EE8CD85F38E6A697C15` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `F0CAD74195F7149BCF9E88E3A1CB5A91A3E58095194D40CBF037444BF98785AC` | `backend/test/sesiones-y-cadena.ataque.test.ts` |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `5E92F1C572A18BC19CD06E9584AB8FC5C5A0EF709D9782AE05C85229BAAE78A0` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |
| `E58293532633DC5CFE21561E2609D170638C81886B9C31129F03864C73A34F45` | `frontend/src/app/router.ataque.test.tsx` |
| `06F35BE8AE68F0ABAE775268E4E64F3DF880FF137A9B54AA3C135941DDB93DCF` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `541EACE1C0389C2F7D8858A7818BB0C1FD9DEADD712C6E5F9995003813639165` | `frontend/src/styles/clases-r1.ataque.test.ts` |
| `D81ED462116AFDD16D4C8AD534941999487D8DBF5EB9DAD22DD242CF68044115` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

Salidas completas en el scratchpad de la sesión: `r3-build.txt`, `r3-lint.txt`, `r3-frontend.txt`, `r3-backend.txt`, `r3-m0-control.txt` a `r3-m5-sin-toast-de-error.txt`, `r3-m6.txt`, `r3-m7.txt`, `r3-tabla.md`, y el directorio `mut/` (configuración, generador y copias mutadas; sin el enlace a `node_modules`, que retiré al terminar).
