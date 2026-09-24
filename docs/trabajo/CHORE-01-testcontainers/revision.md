# Revisión del Manager — CHORE-01: pruebas de integración con Testcontainers y `fastify-plugin ^6` — final
Veredicto: ESCALAR AL HUMANO
Verificación propia: lint código 0 · test 6 corridas completas desde la raíz: 5 con 399/399 y 1 con 398/399 (falla una prueba de tiempos del Tester, M-02) · build código 0

Detalle de lo que ejecuté yo (2026-09-24, 11:31–11:42):
- **`npm run lint` y `npm run build` desde la raíz.** Código 0 en los dos. El aviso de chunk mayor de 500 kB es del frontend y viene de FRONT-01.
- **Corridas completas de `npm test` desde la raíz:**

  | Corrida | Código | Backend | Duración backend (Vitest) | Frontend | Duración frontend |
  |---|---|---|---|---|---|
  | 1 | 0 | 31/330 | 20,92 s | 11/69 | 7,85 s |
  | 2 | 0 | 31/330 | 19,13 s | 11/69 | 7,64 s |
  | 3 | **1** | **30/31 archivos, 329/330** | 19,82 s | 11/69 | 8,01 s |
  | 4 | 0 | 31/330 | 18,63 s | 11/69 | 7,94 s |
  | 5 | 0 | 31/330 | 18,29 s | 11/69 | 7,88 s |
  | 6 | 0 | 31/330 | 18,28 s | 11/69 | 8,69 s |

  En las seis: `FSTDEP` = 0, y ningún `too many clients`, `remaining connection slots` ni `P2024`.
- **Huella de `campus_dev`.** La tomé con el comando del plan, en solo lectura desde `infra/`: antes de todo, después de cada una de las corridas 1, 2 y 3, y al final (tras las 6 corridas, V-08, V-16 y la corrida con `requireAssertions`). Las cinco son idénticas **byte a byte** (`cmp`) y coinciden con la del programador:
  `usuarios=2 | pruebas_local=0 | max_usuarios=2026-09-24 16:09:30.85+00 | sesiones=7 | max_sesiones=2026-09-24 16:11:11.19+00 | migraciones=2 | stats=_prisma_migrations:2/4/0,sesiones:3235/1055/3228,usuarios:4825/488/4458`.
- **Contenedores de infra.** Siguen `healthy` y con los mismos ids completos que al empezar (`b37f9fd29203…` postgres, `56ad405870ed…` livekit y `67208fead0cc…` minio), todos creados a las 09:31:04.
- **Contenedores de Testcontainers.** 0 al terminar cada corrida y a las 11:41:48.
- **Base efímera, inspeccionada durante las corridas 1, 2 y 3** (solo `SELECT` sobre el contenedor de mi corrida):
  - `_prisma_migrations`: `2 aplicadas; terminadas=2; revertidas=0; 20260922015711_extensiones_iniciales,20260923143021_usuarios_y_sesiones`;
  - 1 administrador (`admin@contenedor-de-pruebas.local`);
  - `max_connections` = 100.
- **Hashes.** Los 14 `*.ataque.test.ts(x)` coinciden con "Cierre (M-13)" (`sha256sum -c`: 14/14 OK, antes y después de las corridas), y `git diff` sobre `*.ataque.test.ts(x)` está vacío. No hay `.skip`, `.only`, `.todo`, `.fails`, `skipIf`, `runIf`, `xit` ni `xdescribe` en `backend/` ni en `frontend/`.
- **V-08, repetida por mí sin escribir en el repositorio** (configuraciones de objeto plano en el scratchpad, sin `globalSetup`):
  - (a) con `provide` de una URL de `campus_dev`: código 1 y `Guarda de la base de pruebas: la base es "campus_dev" y las pruebas solo aceptan "campus_pruebas". No se ejecutó ninguna prueba.`, con 2 archivos bloqueados y `Tests no tests`;
  - (b) sin `provide`: código 1 y `Falta la base de pruebas: …`, con `no tests`.
- **V-16, repetida** con `DOCKER_HOST=tcp://127.0.0.1:1`: código 1, `No se pudo levantar PostgreSQL de pruebas con Testcontainers…` y `Caused by: … Could not find a working container runtime strategy`.
- **Regla de aserciones en toda la suite.** `npx vitest run --expect.requireAssertions` desde `backend/`: 31/330 en verde. **Las 330 pruebas del backend ejecutan al menos una aserción**, incluidas las tres con `if (!admin) return`.
- **Tipos de `test/`.** Corrí `tsc` estricto con un `tsconfig` del scratchpad que extiende `backend/tsconfig.json` e incluye `src/`, `test/` y `vitest.config.ts`: código 0, sin errores. Entre los archivos comprobados están `global-setup.ts`, `setup.ts`, `entorno-de-pruebas*.ts` y la ampliación de `ProvidedContext`.
- **Dependencias:**
  - `npm ls fastify-plugin` muestra una sola copia 6.0.0 (la de `@fastify/cookie` aparece como `deduped`);
  - el lock nuevo frente al de `HEAD`: 149 entradas añadidas, todas `dev`; 1 quitada (`@fastify/cookie/node_modules/fastify-plugin`); 1 cambiada (`fastify-plugin` 5.1.0 → 6.0.0);
  - ninguna entrada nueva contiene `aws`, `firebase`, `supabase` ni `vercel`, y `aws-ssl-profiles` ya estaba en el lock de `HEAD`.
- **Diff fuera de alcance.** `git diff --quiet` sobre `backend/src`, `backend/prisma`, `prisma.config.ts`, `.env.example`, tsconfigs, `eslint.config.mjs`, `.prettier*`, `.git*`, `shared`, `frontend`, `infra`, `CLAUDE.md` y `PRD.md`: código 0. Ningún archivo de `backend/src/**` importa `@testcontainers/*` ni `vitest`.

## Problemas que bloquean

Ninguno es un defecto del código de CHORE-01, que hace lo planeado, solo lo planeado y todo lo planeado. Los dos son decisiones que solo el humano puede tomar antes del commit.

### M-01 — Ryuk y el PostgreSQL de pruebas quedan expuestos a la red local durante cada corrida, y el firewall de Windows lo permite
Dónde:
- `backend/test/global-setup.ts:45-49`: `PostgreSqlContainer` con la configuración por defecto;
- `node_modules/testcontainers/build/generic-container/generic-container.js:290-305`: `{ HostPort: "0" }` sin `HostIp`;
- `node_modules/testcontainers/build/reaper/reaper.js:75-81`: Ryuk publica el 8080 sin `HostIp` y monta `/var/run/docker.sock`.

Por qué importa:
- **R-03 del plan subestimaba la exposición.** El humano aprobó el plan sabiendo que el PostgreSQL de pruebas "probablemente" se publicaría en todas las interfaces. Tres hechos que verifiqué cambian ese riesgo:
  1. **Confirmado en ejecución.** En las tres corridas en que lo inspeccioné:
     - `docker inspect` da `PortBindings {"5432/tcp":[{"HostIp":"","HostPort":"0"}]}` y `Ports {"HostIp":"0.0.0.0",…},{"HostIp":"::",…}`;
     - `netstat` muestra a `com.docker.backend.exe` (PID 13404) escuchando en `0.0.0.0:32785` y `[::]:32785`;
     - infra, en cambio, escucha en `127.0.0.1:5433`, `:7880` y `:9000`.
  2. **Ryuk también queda expuesto, y es lo grave.** Se publica igual (`0.0.0.0:32782->8080`, `:32784` y `:32786` en mis corridas). El programador no lo reportó; solo habló del PostgreSQL.
     - Ryuk tiene el socket de Docker montado.
     - Acepta por TCP, **sin autenticación**, líneas `label=<clave>=<valor>`, y al cerrarse las conexiones borra lo que coincida. El propio cliente envía `label=com.docker.compose.project=<nombre>` (`reaper.js:143-148`).
     - Cualquiera que llegue a ese puerto mientras vive Ryuk (unos 30 s por corrida del backend) podría pedirle que borre los contenedores de `campus-dev`.
     - Lo deduzco de la lectura del código; no lo demostré, porque la prueba sería destructiva.
  3. **El firewall de Windows no lo frena.** La regla de entrada "Docker Desktop Backend" (TCP y UDP) está habilitada, con acción **Permitir**, cualquier IP remota, cualquier puerto local, programa `com.docker.backend.exe` y perfil **Público**, y el perfil activo del equipo es el Público. No lo probé desde otro equipo.
- **El PostgreSQL por sí solo sí sería un riesgo aceptable documentado:** contraseña aleatoria de 48 caracteres hex, base efímera y datos sintéticos. **Ryuk no**: es un punto de control de Docker sin autenticación, abierto a la red en la que esté la laptop, sea la de casa o una Wi-Fi pública. Contradice el criterio de INFRA-01, que publica todo solo en `127.0.0.1`.

Qué se espera: que el humano elija una salida.
- **(a) Aceptar el riesgo y documentarlo con exactitud,** Ryuk incluido, en D-25 y en README §7.
- **(b) Mitigarlo en el equipo** y documentarlo en README §7 como requisito:
  - la dirección de publicación por defecto del motor en Docker Desktop (Settings › Docker Engine: `"ip": "127.0.0.1"`), que afecta solo a las publicaciones sin IP explícita, así que infra no cambia;
  - o restringir la regla "Docker Desktop Backend" en el perfil Público.

  No verifiqué que Docker Desktop respete `"ip"`. Se comprueba con `docker port <id>` durante una corrida: debe mostrar `127.0.0.1` para Ryuk y para PostgreSQL.
- **(c) Desactivar Ryuk** (`TESTCONTAINERS_RYUK_DISABLED=true`). Se aparta del plan (PA-08) y pierde la limpieza ante interrupciones (V-15).

Sobre un "ajuste pequeño en código", como pide el orquestador:
- **PostgreSQL.** Con la API de Testcontainers 12.1 no hay opción pública de `HostIp`. Solo se puede con una subclase de `PostgreSqlContainer` que reescriba `this.hostConfig.PortBindings["5432/tcp"]` con `{ HostIp: "127.0.0.1", HostPort: "0" }` en el gancho protegido `beforeContainerCreated()` (`generic-container.d.ts:14,36`). Son unas 10 líneas en `global-setup.ts`, pero dependen de miembros protegidos. `getPort()` debería seguir funcionando (`utils/bound-ports.js:77-90` elige el enlace por familia de IP); no lo ejecuté.
- **Ryuk.** No tiene arreglo en código ni por configuración: `TESTCONTAINERS_RYUK_PORT` fija el puerto, no la IP.

**Mi recomendación:** (b) más documentación, y no gastar en la subclase, que deja a Ryuk expuesto.

### M-02 — PA-12 se activó en mi verificación: una prueba adversaria de tiempos falló en 1 de 6 corridas completas
Dónde: `backend/test/auth-login.ataque.test.ts:208-240`, "el tiempo de respuesta no distingue un correo inexistente de una contraseña incorrecta" (hash sin cambios desde AUTH-01). Falló en mi corrida 3:
```
AssertionError: medianas ms: incorrecta=91.4 inexistente=60.5 inactivo=54.9: expected 36.424699999999575 to be less than 31.973619999999844
```

Por qué importa:
- **El criterio de cierre no se reprodujo.** El humano fijó "399 en verde en tres corridas completas", y mis tres primeras corridas dieron 2 de 3; con las tres adicionales, 5 de 6.
- **La definición de terminado exige `test` en verde,** y `AGENTS.md` prohíbe marcar como terminado algo con pruebas en rojo.
- **El plan tiene previsto este caso** (PA-12 y `aprobacion.md`): se reporta y se consulta al humano, y solo el Tester puede ajustar la prueba, sin debilitar aserciones.

**Mi diagnóstico: no es atribuible a CHORE-01.**
- Las tres ramas hacen la misma consulta (`buscarCredencialesPorEmail`) y verifican con argon2 con los mismos parámetros: el hash de relleno y el del usuario salen de la misma configuración (`adapters/auth/index.ts:11`, `config/auth.ts:19`). El cambio de base no crea una diferencia entre ramas.
- La brecha de unos 30 ms entre medianas de 9 muestras es ruido de CPU, con 31 archivos en paralelo haciendo argon2 con parámetros de `prod`.
- El paralelismo es el mismo que en AUTH-01 (DEC-02).
- La tolerancia de la prueba (`max(20 ms, 35 %)`) es estrecha para esa carga.

Qué se espera: que el humano decida.
- **(a) Hacer el commit con la intermitencia anotada** y mandar la prueba a la próxima ronda del Tester, que ya está pendiente por los `if (!admin) return`. Es mi recomendación.
- **(b) Invocar ahora al Tester** con la excepción de PA-12 y repetir las tres corridas antes del commit.

## Problemas que no bloquean

- **N-01 — La guarda acepta una URL con `?host=` en la query, y `pg` la obedece.**
  - `validarUrlDePruebas` (`backend/test/entorno-de-pruebas.ts:30-41`) solo mira el `hostname` y el `pathname`.
  - `pg-connection-string` copia la query a la configuración y usa `config.host` de la query si existe (`node_modules/pg-connection-string/index.js:40,54`). Así, `postgresql://u:p@127.0.0.1:5432/campus_pruebas?host=db.remota` pasaría la guarda y conectaría a otro host.
  - No es un camino real: la URL solo la arma `global-setup.ts`, y forzarla exige escribir un `provide` a propósito.
  - Endurecimiento propuesto para un encargo posterior: rechazar cualquier URL con query (la de la corrida no lleva) y un caso más en `entorno-de-pruebas.test.ts`.
- **N-02 — R-03 quedó reportado a medias.** El resumen del programador describe solo el puerto de PostgreSQL y lo da por "no comprobado con `docker inspect`". Ya lo comprobé, y la parte relevante es Ryuk (M-01).
- **N-03 — Los tipos de `test/` siguen fuera de `lint`.** Hoy están limpios (`tsc` código 0, verificado por mí), pero nada lo garantiza en la próxima corrida de `lint`: `backend/tsconfig.json` incluye solo `src` y excluye `src/**/*.test.ts`. Es anterior a este encargo. Queda como pendiente un `tsconfig` para pruebas que `npm run lint` compruebe.

## Detalles menores
- **README §3** dice que el `JWT_SECRET` de `backend/.env.example` "sirve en `development` y `test`". Sigue siendo cierto para la validación de `NODE_ENV=test`, pero las pruebas ya generan su propio secreto (DEC-09). Conviene precisarlo la próxima vez que se toque el README; este encargo solo autorizaba §1 y §7.
- **V-16:** Vitest imprime además `No test files found, exiting with code 1` antes del mensaje propio. Es cosmético y ya está reportado.
- **README §7** dice que Ryuk "tarda hasta un minuto"; lo medido es 20 s o menos. Es conservador y aceptable.
- **`backend/tmp/`** conserva los temporales del programador: huellas, logs, `v15.pid` y el análisis del lock. Git los ignora y no contienen secretos útiles; el humano puede borrarlos cuando quiera. No quedó ninguna configuración temporal de Vitest.
- **PA-06 estaba mal escrita en el plan.** Debió redactarse sobre el delta del lock y excluir `aws-ssl-profiles`, ya aceptada en BACK-02. Es una lección para el Arquitecto: las paradas sobre dependencias se escriben contra lo que el encargo añade.

## Desacuerdos arbitrados
- **Resolución de PA-06 (orquestador): correcta en el fondo; el humano debe confirmarla con una línea.**
  - La redefinición ("paquete de AWS, Firebase, Supabase o Vercel que no estaba en el lock anterior") coincide con la aceptación escrita del humano en BACK-02 (`aprobacion.md:47`, M-01) y con la regla 11 y ESSENTIALS, que ya dicen que las transitivas de herramientas de desarrollo "se reportan, pero no bloquean".
  - Verifiqué que el lock nuevo no añade ningún paquete así y que `aws-ssl-profiles` ya estaba en `HEAD`.
  - Aun así, una parada aprobada por el humano solo la reinterpreta el humano. No hace falta retrabajo si la confirma.
- **R-03 (puertos):** ver M-01. El PostgreSQL solo sería aceptable como riesgo documentado; Ryuk no, por ser un punto de control de Docker sin autenticación y porque el firewall admite entradas en el perfil activo. En código solo cabe un arreglo parcial (PostgreSQL, con miembros protegidos). La mitigación efectiva es del equipo o consiste en desactivar Ryuk, y la decide el humano.
- **Tipos sin comprobar:** resuelto para este diff. `tsc` estricto sobre `src/`, `test/` y `vitest.config.ts` da código 0, incluida la ampliación de `ProvidedContext`: sin ella, `inject("entornoDePruebas").databaseUrl` de `entorno-de-pruebas.test.ts:37` no compilaría. Queda el pendiente estructural de N-03.
- **Desviaciones del programador.** Acepto las cinco; ninguna cambia el comportamiento ni sale de lo autorizado.
  1. El mensaje en la precondición de `admin-unico.integracion` aplica la regla nueva de aserciones.
  2. El contenido de `entorno-de-pruebas.test.ts` era obligado por P-02 = sí. Cubre los 4 casos que describía el plan, y además afirma sobre la URL inyectada real.
  3. Las cifras del README §7 coinciden con lo que medí (backend entre 17,4 y 20,9 s en Vitest).
  4. Git Bash, `prettier --check` acotado, `grep -r` y la comprobación de existencia de `~/.testcontainers.properties` son todos de solo lectura o equivalentes a lo autorizado.
  5. Los temporales extra están en `backend/tmp/`, que git ignora.
- **PA-13:** el programador la comprobó solo de forma indirecta. Yo la verifiqué directamente en tres corridas: 2 migraciones aplicadas, 2 terminadas, 0 revertidas, con los nombres esperados. No se activó.
- **Regla nueva de aserciones y las tres pruebas con `if (!admin) return`:** confirmado que, con el administrador sembrado, las tres ejecutan aserciones. `requireAssertions` pasó sobre las 330 del backend, y las tres aparecen en verde en el reporte detallado. Siguen conteniendo el patrón que la regla prohíbe, por decisión del humano, y hoy afirman solo gracias a la fixture (R-08). La ronda del Tester las corrige.
- **Textos del orquestador: exactamente los autorizados.** Los comparé contra "Propuestas de texto literal" y `aprobacion.md`:
  - `AGENTS.md`: el comentario de `npm run test`, la tercera viñeta de "Pruebas" y la regla nueva;
  - `tester.md`: la regla nueva, en "Reglas de combate";
  - ESSENTIALS: "Stack › Pruebas";
  - `ARCHITECTURE.md`: §2, §5 y D-25.

  Son literales, y no hay ningún otro cambio en esos archivos (`git diff --numstat`: 3/2, 1/0, 1/1 y 3/2).

## Definición de terminado (`AGENTS.md`)
- [x] Cumple el encargo. No hay `RF`: se cumplen los pasos 1 a 20 del plan con P-01 = no, P-02 = sí y P-03 = solo `@testcontainers/postgresql`.
- [x] Capas y middleware: `backend/src/**` sin diff, y ningún código de producción importa `@testcontainers/*`.
- [ ] `lint`, `build` y `test` en verde: `lint` y `build`, sí; `test`, 5 de 6 corridas (M-02).
- [x] Pruebas de autorización: no aplica (no hay endpoints nuevos).
- [x] Migración: no aplica (no hay cambio de esquema).
- [x] `infra/` y `.env.example`: no aplica. No hay variables nuevas, e `infra/` solo se lee.
- [ ] Documentos: los autorizados están aplicados. Falta documentar R-03 con Ryuk según lo que decida el humano en M-01.

## Documentos a actualizar
- **Según M-01:** D-25 (o una nota junto a ella) y README §7, con la exposición de Ryuk y PostgreSQL durante la corrida y, si se elige (b), el ajuste del equipo como requisito y el comando `docker port` para comprobarlo.
- **Opcional, en el próximo cambio del README:** la precisión de §3 sobre `JWT_SECRET` en `test`.
- Nada más. `AGENTS.md`, `tester.md`, ESSENTIALS y `ARCHITECTURE.md` quedaron alineados con el comportamiento real, y no quedan menciones a "PostgreSQL de infra" para pruebas en código ni en documentos. La única es la de README §7, que dice justamente que las pruebas **no** lo usan.

## Para el humano
1. **Decide M-01 (puertos y Ryuk):** (a) aceptar y documentar, (b) mitigar en el equipo con `"ip": "127.0.0.1"` en Docker Engine o con el firewall, y documentarlo, o (c) desactivar Ryuk. Recomiendo (b).
2. **Decide M-02 (prueba de tiempos intermitente):** (a) commit con la intermitencia anotada y la prueba a la próxima ronda del Tester, o (b) el Tester ahora, por la excepción de PA-12. Recomiendo (a).
3. **Confirma la resolución de PA-06** con una línea en `aprobacion.md`, algo como "confirmo la resolución del orquestador sobre PA-06". Es coherente con tu decisión de BACK-02.
4. **Commit, tras revisar el diff:** rama `chore/chore-01-testcontainers` y un solo commit (el lock mezcla los dos cambios de dependencias). Por ejemplo: `chore(pruebas): base desechable con Testcontainers y fastify-plugin 6`. Orden de revisión propuesto:
   1. `backend/test/entorno-de-pruebas.ts`: la guarda, los tipos y la fixture del admin;
   2. `backend/test/global-setup.ts`;
   3. `backend/test/setup.ts` y `backend/vitest.config.ts`;
   4. `backend/test/entorno-de-pruebas.test.ts`;
   5. `backend/test/admin-unico.integracion.test.ts`;
   6. los comentarios de `ayudas-auth.ts`, `salud.integracion.test.ts`, `auth-login.integracion.test.ts` y `auth-registro.integracion.test.ts`;
   7. `backend/package.json` y, de un vistazo, `package-lock.json` (149 entradas añadidas, todas `dev`; 1 quitada; 1 cambiada);
   8. `README.md` §1 y §7;
   9. los textos del orquestador: `AGENTS.md`, `.claude/agents/tester.md`, ESSENTIALS y `ARCHITECTURE.md` (§2, §5 y D-25);
   10. `docs/trabajo/CHORE-01-testcontainers/`: `plan.md`, `aprobacion.md`, `resumen-programador.md` y esta revisión.
5. **Pendientes para encargos siguientes:**
   - **Ronda del Tester:**
     - convertir los `if (!admin) return` en aserciones de precondición;
     - retirar la transacción revertida de `admin-unico.ataque`;
     - hacer robusta la prueba de tiempos (M-02);
   - **CI / DEPLOY:** una `DATABASE_URL` de relleno para `prisma generate` y Docker en CI para Testcontainers. Cuidado: en CI también se publicarán los puertos de Ryuk y PostgreSQL;
   - **Pruebas:**
     - un `tsconfig` para `backend/test/` que `npm run lint` compruebe (N-03);
     - endurecer la guarda contra URLs con query (N-01);
     - un proyecto de Vitest para las unitarias sin `globalSetup` (R-01);
   - **Lint:** una regla de ESLint contra `@testcontainers/*` en `backend/src/**` (R-11).

---

# Revisión del Manager — CHORE-01 — cierre
Veredicto: APROBADO
Verificación propia: lint código 0 · test 3 corridas completas desde la raíz, **399/399 en las tres** (backend 31 archivos / 330 pruebas, frontend 11 / 69) · build código 0 (el aviso de chunk mayor de 500 kB es de FRONT-01)

Alcance del cierre:
- Lo verifiqué el 2026-09-24, entre las 12:27 y las 12:33.
- Parto de las decisiones del humano que están al final de `aprobacion.md`:
  - **M-01:** el PostgreSQL de pruebas se liga a `127.0.0.1`, y Ryuk se mitiga en el equipo;
  - **M-02:** el Tester hace robusta la prueba de tiempos y el Manager repite tres corridas;
  - **PA-06:** confirmada;
  - **N-01 y N-03:** pasan a CHORE-02.
- Revisé el ajuste del Programador (`resumen-programador.md`, "Ajuste M-01"), el del Tester (`reporte-tester.md`) y `mitigacion-ryuk.md`.
- El texto de `AGENTS.md` sobre el riesgo residual de Ryuk lo aplica el orquestador después de esta verificación, así que no lo reviso aquí.

## Problemas que bloquean
Ninguno.

## Precondición de red (comprobada antes de correr nada)
- **La regla existe y está activa.** `Get-NetFirewallRule -DisplayName "Campus: bloquear entrada a Docker en redes publicas"` la encuentra en `PersistentStore` y en `ActiveStore`: `Enabled True`, `Inbound`, `Block`, `Public` y `PrimaryStatus OK`.
- **Apunta al binario correcto.** El programa de la regla es `C:\Program Files\Docker\Docker\resources\com.docker.backend.exe`: el archivo existe (`Test-Path` da `True`) y coincide con la ruta del `com.docker.backend` en ejecución.
- **El firewall está encendido en el perfil Público** (`Enabled True`).
- **La red activa** es `uacam5 2` (Wi-Fi), de categoría `Public`, así que la regla la cubre.
- **La sonda de cada corrida** volvió a comprobar la regla en el almacén activo antes de arrancar: a las 12:28:56, 12:30:03 y 12:31:05, y antes de la corrida complementaria. Estaba habilitada las cuatro veces.

## Corridas (`npm test` desde la raíz)
| Corrida | Código | Backend | Duración backend (Vitest) | Frontend | Duración frontend | PostgreSQL de pruebas | Ryuk | Ryuk borrado |
|---|---|---|---|---|---|---|---|---|
| 1 | 0 | 31/330 | 17,32 s | 11/69 | 7,37 s | `127.0.0.1:32795->5432/tcp` (8 muestras) | `0.0.0.0:32773->8080/tcp, [::]:32773->8080/tcp` | en 10 s o menos |
| 2 | 0 | 31/330 | 16,92 s | 11/69 | 7,37 s | `127.0.0.1:32796->5432/tcp` (6 muestras) | `0.0.0.0:32774`, `[::]:32774` | en 10 s o menos |
| 3 | 0 | 31/330 | 20,00 s | 11/69 | 8,32 s | `127.0.0.1:32797->5432/tcp` (10 muestras) | `0.0.0.0:32775`, `[::]:32775` | ya no estaba al terminar |

- En las tres: `FSTDEP` = 0, y ningún `too many clients`, `remaining connection slots` ni `P2024`. Ninguna intermitencia.
- **Direcciones observadas.** Muestreé cada segundo `docker ps --filter label=org.testcontainers=true --format "{{.Image}}  {{.Ports}}"` y las escuchas de `com.docker.backend` (PID 13404) fuera de loopback:
  - el PostgreSQL de pruebas apareció **siempre** solo en `127.0.0.1`, con 0 muestras fuera de loopback en las tres corridas;
  - la **única** escucha fuera de loopback fue la del puerto de Ryuk (`0.0.0.0` y `[::]`). Es el riesgo residual que cubre la regla del firewall.
- **La prueba de tiempos.** El reporter por defecto no imprime anotaciones de pruebas en verde, así que tomé las medianas en una **corrida complementaria** del backend completo (`npx vitest run --reporter=verbose` desde `backend/`, código 0, 31/330):
  ```
  medianas ms (n=24 por rama): incorrecta=45.8 [p25 39.3, p75 48.9] inexistente=46.4 [p25 37.2, p75 50.1] inactivo=47.0 [p25 38.8, p75 49.3] · tolerancia 20.0
  ```
  Las diferencias con "incorrecta" son de 0,6 y 1,2 ms, frente a una tolerancia de 20 ms. En M-02 habían sido 30,9 y 36,4 ms, con 9 muestras.
- **Huella de `campus_dev`.** La tomé con el comando del plan, en solo lectura desde `infra/`: antes, tras cada corrida, al final y tras la corrida complementaria. Las cinco son idénticas byte a byte (`cmp`) entre sí y a la de la revisión final:
  `usuarios=2 | pruebas_local=0 | max_usuarios=2026-09-24 16:09:30.85+00 | sesiones=7 | max_sesiones=2026-09-24 16:11:11.19+00 | migraciones=2 | stats=_prisma_migrations:2/4/0,sesiones:3235/1055/3228,usuarios:4825/488/4458`
- **Contenedores de Testcontainers:** 0 a las 12:31:55 y a las 12:32:03 (14 y 22 s después de la corrida 3), y 0 a las 12:32:47, tras la complementaria.
- **Infra:** `campus-dev-postgres-1`, `livekit` y `minio` siguen `healthy`, con los mismos ids completos (`b37f9fd29203…`, `56ad405870ed…` y `67208fead0cc…`) y todos creados a las 09:31:04. Llevan "Up 20 minutes" porque se reiniciaron con el "Apply & restart" de Docker Desktop que hizo el humano (paso 3 de `mitigacion-ryuk.md`), no por las pruebas. La huella no cambió.

## Hashes
- **`sha256sum -c`: 14/14 OK.**
  - `backend/test/auth-login.ataque.test.ts` = `2c83d82d10bdd9b7a969768774d75b18b7a71a594bbaac5fae36a0e134d2336c`, el nuevo que publicó el Tester;
  - los otros 13 coinciden con "Cierre (M-13)" de `docs/trabajo/AUTH-01-autenticacion-basica/reporte-tester.md`.
- `git diff --name-only -- '*.ataque.test.ts' '*.ataque.test.tsx'` muestra solo `backend/test/auth-login.ataque.test.ts`.
- No hay `.skip`, `.only`, `.todo`, `.fails`, `skipIf`, `runIf`, `xit` ni `xdescribe` en `backend/` ni en `frontend/`.
- **Desde ahora, la referencia de hashes** para futuras rondas es la tabla de `docs/trabajo/CHORE-01-testcontainers/reporte-tester.md`, no la de M-13.

## Revisión de los ajustes
- **`backend/test/global-setup.ts`, subclase `PostgreSqlSoloEnLoopback` (líneas 40-55 y 63). Correcta.**
  - `protected override async beforeContainerCreated()` llama primero al gancho del padre y después reescribe cada enlace de `hostConfig.PortBindings`: conserva su `HostPort` y le añade `HostIp: "127.0.0.1"`.
  - Sin `any`: el `any` de `@types/dockerode` se lee en una constante tipada.
  - El resto del archivo no cambió respecto de la revisión final.
  - Las verificaciones que el programador dejó pendientes se confirmaron en ejecución: el enlace real es solo `127.0.0.1` (arriba), y `getPort()` y la espera `forListeningPorts` funcionan con el enlace solo IPv4, porque el contenedor arrancó y las tres corridas pasaron.
- **`backend/test/auth-login.ataque.test.ts`, caso de tiempos, comparado con `HEAD`. La aserción no se debilitó.**
  - Siguen idénticas, línea por línea:
    - `const base = mediana(tiempos.incorrecta)`;
    - `const tolerancia = Math.max(20, base * 0.35)`;
    - los dos `expect(Math.abs(mediana(...) - base), resumen).toBeLessThan(tolerancia)`.
  - Cambió solo el muestreo:
    - calentamiento de una vuelta completa, descartada;
    - 24 muestras por rama en vez de 9;
    - rotación por las 6 permutaciones. Comprobé que son las 6 distintas y que cada rama ocupa cada posición dos veces por vuelta.
  - Se añadieron `expect(tiempos.incorrecta).toHaveLength(24)` y una anotación con medianas y cuartiles. El tiempo límite pasó de 60 a 120 s, que es solo margen.
  - No toca código de producción ni las otras pruebas del archivo.
- **Diff fuera de alcance.** `git diff --quiet` sobre `backend/src`, `backend/prisma`, `prisma.config.ts`, `.env.example`, tsconfigs, `eslint.config.mjs`, `.prettier*`, `.git*`, `shared`, `frontend`, `infra`, `CLAUDE.md` y `PRD.md` da código 0.
  - Los documentos que tocó el orquestador (`AGENTS.md`, `tester.md`, ESSENTIALS y `ARCHITECTURE.md`) y el `README.md` tienen el mismo `numstat` que en la revisión final.
  - `git status` muestra 24 entradas: 15 modificadas, 3 nuevas en `backend/test/` y 6 en esta carpeta.

## Estado de los hallazgos de la revisión final
| # | Estado |
|---|---|
| M-01 | **Cerrado.** PostgreSQL de pruebas en `127.0.0.1`, verificado en ejecución. Ryuk queda expuesto por diseño de Testcontainers 12.1 y mitigado con la regla del firewall en el perfil Público (verificada). Riesgo residual aceptado por el humano, sin prueba desde otro equipo. Falta el texto de `AGENTS.md`, que aplica el orquestador |
| M-02 | **Cerrado.** 3/3 corridas completas en verde; diferencias de medianas por debajo de 1,3 ms con tolerancia de 20 ms |
| PA-06 | **Cerrado.** Confirmada por el humano |
| N-01, N-03 | Pasan a CHORE-02 (`aprobacion.md`) |
| N-02 | Cerrado: M-01 ya describe Ryuk |

## Problemas que no bloquean
Ninguno nuevo.

## Detalles menores
- **`mitigacion-ryuk.md`, sección "Mitigación aplicada":** la ruta aparece como `C:\Program Files\Docker\Dockeresources\com.docker.backend.exe`, con el `\r` comido al transcribir. La regla real tiene la ruta correcta, como comprobé arriba. Conviene corregir el texto para que nadie copie la ruta rota si tiene que recrear la regla.
- **Cobertura de la regla.** Cubre solo el perfil **Público**. Si una red no confiable se clasificara como Privada, Ryuk quedaría expuesto. `mitigacion-ryuk.md` ya lo dice; el texto de `AGENTS.md` debería decirlo también.
- **`ORDENES[i % ORDENES.length] ?? []`** (prueba de tiempos). El `?? []` existe solo por `noUncheckedIndexedAccess`: el índice no puede salirse del arreglo, y `toHaveLength(24)` detectaría una ronda vacía. No es el patrón que prohíbe `CLAUDE.md`, que es ocultar datos faltantes de la API. Se acepta.
- **V-15 (interrupción) no se repitió** tras la subclase. La subclase solo cambia `HostIp` y no toca etiquetas, sesión ni Ryuk, así que no espero cambios. Queda como no reverificado.

## Documentos a actualizar
- **`AGENTS.md` "Pruebas"** (orquestador, después de esta verificación):
  - durante cada corrida, Ryuk escucha en todas las interfaces, y el PostgreSQL de pruebas solo en `127.0.0.1`;
  - no se corre la suite en una red Pública sin la regla de bloqueo activa, ni en una red no confiable clasificada como Privada;
  - cómo comprobarlo: `Get-NetFirewallRule` y `docker ps --filter label=org.testcontainers=true --format "{{.Image}}  {{.Ports}}"`.
- **Sugerido:** una línea en README §7 que remita a esa regla, porque es lo que lee quien va a correr las pruebas. Y la precisión de la ruta en `mitigacion-ryuk.md`.

## Para el humano
1. **Revisa el texto de `AGENTS.md`** que aplique el orquestador sobre Ryuk y las redes públicas. No forma parte de esta verificación.
2. **Commit, tras revisar el diff:** rama `chore/chore-01-testcontainers` y un solo commit, por ejemplo `chore(pruebas): base desechable con Testcontainers y fastify-plugin 6`. Orden de revisión propuesto:
   1. `backend/test/entorno-de-pruebas.ts`: la guarda, los tipos y la fixture del administrador;
   2. `backend/test/global-setup.ts`, incluida la subclase `PostgreSqlSoloEnLoopback` (líneas 40-55 y 63);
   3. `backend/test/setup.ts` y `backend/vitest.config.ts`;
   4. `backend/test/entorno-de-pruebas.test.ts`;
   5. `backend/test/admin-unico.integracion.test.ts`;
   6. los comentarios de `ayudas-auth.ts`, `salud.integracion.test.ts`, `auth-login.integracion.test.ts` y `auth-registro.integracion.test.ts`;
   7. `backend/test/auth-login.ataque.test.ts`: solo el caso de tiempos, comparado con `git show HEAD:backend/test/auth-login.ataque.test.ts`. La aserción y la tolerancia son iguales;
   8. `backend/package.json` y, de un vistazo, `package-lock.json` (149 entradas añadidas, todas `dev`; 1 quitada; 1 cambiada);
   9. `README.md` §1 y §7;
   10. los textos del orquestador: `AGENTS.md` (incluido el de Ryuk cuando esté), `.claude/agents/tester.md`, ESSENTIALS y `ARCHITECTURE.md` (§2, §5 y D-25);
   11. `docs/trabajo/CHORE-01-testcontainers/`: `plan.md`, `aprobacion.md`, `mitigacion-ryuk.md`, `resumen-programador.md`, `reporte-tester.md` y esta revisión.
3. **Pendientes que siguen vigentes:**
   - **CHORE-02:** N-01 (guarda contra `?host=`) y N-03 (`tsconfig` de `test/` dentro de `lint`);
   - **Tester:** convertir los `if (!admin) return` en aserciones y retirar la transacción de `admin-unico.ataque`;
   - **CI / DEPLOY:** una `DATABASE_URL` de relleno y Docker en CI, donde Ryuk y los puertos también se publicarán;
   - **Opcional:** un proyecto de Vitest sin `globalSetup` para las unitarias, y ESLint contra `@testcontainers/*` en `backend/src/**`.
