# Resumen del Programador — AUTH-01: autenticación básica

Fecha: 2026-09-23
Plan: `docs/trabajo/AUTH-01-autenticacion-basica/plan.md` (estado LISTO, carril sensible, con Enmienda 1)
Aprobación: `docs/trabajo/AUTH-01-autenticacion-basica/aprobacion.md` (P-01..P-05, M-01..M-11)
Sesiones: la primera se cortó por límite de uso a las 08:44 (pasos 1–10 y las pruebas del paso 11 escritas, sin ejecutar la suite completa). La reanudación empezó con la auditoría que pidió el humano (sección "Auditoría tras el corte") y siguió desde el paso 11. Todo lo de la primera parte que aparece aquí sale de salidas reales que conservo de esa sesión o que volví a ejecutar en la reanudación; lo que no pude reconstruir está marcado como tal.

```
Plan: docs/trabajo/AUTH-01-autenticacion-basica/plan.md
Pasos completados: 21 de 21
Archivos creados / modificados: 56 creados, 30 modificados, 1 borrado (lista por paso al final)
Verificación: lint ok (raíz, 3 workspaces) · test 162 pasan, 0 fallan (backend 126 en 19 archivos; frontend 36 en 8 archivos) · build ok (raíz) · prisma validate ok
Hallazgos atendidos: no aplica (primera ronda; los M-01..M-11 de la revisión del plan están incorporados al plan por la Enmienda 1 y se implementaron)
Desviaciones del plan: 1 de proceso que requiere decisión (D-01: segunda copia de fastify-plugin) y 18 menores documentadas (sección "Desviaciones")
Pendiente o fuera de alcance detectado: sección "Pendiente"
```

**Para el humano, antes que nada (D-01):** `@fastify/cookie@11.1.2` (el rango `^11.1.2` de la tabla "Dependencias") depende de `fastify-plugin ^6.0.0`, así que npm instaló una **segunda copia** (`fastify-plugin@6.0.0`, anidada en `node_modules/@fastify/cookie/node_modules/`) junto a la `5.1.0` del backend. El plan pedía "**[verificar]** par `fastify-plugin ^5` (una sola copia); si exigiera `^6`, reportar antes de instalar". La salida de `npm view` de V-02 ya lo mostraba, y aun así instalé: **fue un error mío de la primera sesión**. Funciona (las 162 pruebas pasan y la cookie se comporta como pide DEC-07), pero V-03 ("una versión de `fastify-plugin`") no se cumple. Opciones, a decidir por el humano (no cambié nada por mi cuenta): (a) aceptar las dos copias; (b) fijar `@fastify/cookie` en `11.0.2`, la última de la serie 11 con `fastify-plugin ^5` y `cookie ^1` (deduplica también `cookie` con la `1.1.1` que ya trae Fastify), con un `npm install` más y otra corrida de las pruebas.

## Auditoría tras el corte (primer paso de la reanudación)

Ejecuté `npm run lint` en `shared` y `backend`, `npm test` del backend y un `tsc` de `src` + `test` con un tsconfig temporal (`backend/tmp/tsconfig.test.json`, ya borrado), y releí contra el plan todo lo escrito antes del corte.

| Qué fallaba | Causa | Corrección |
|---|---|---|
| `prettier --check` en 8 archivos del backend | Solo formato | `npx prettier --write src test prisma.config.ts --ignore-path ../.prettierignore` desde `backend/` |
| `tsc` de `test/auth-registro.integracion.test.ts` | `registrar(cuerpo: unknown)` no es un `InjectPayload` | Tipo `Record<string, unknown>` |
| Registro con correo duplicado → `409 ADMIN_YA_EXISTE` (debía ser `CORREO_EN_USO`) | **Defecto real.** Con Prisma 7 + `@prisma/adapter-pg`, el P2002 no trae `meta.target`; el índice llega en `meta.driverAdapterError.cause.constraint.index` (ver **[verificar]** 2). `errorDeDuplicado` no veía `email` y caía en la rama del admin | `adapters/db/errores.ts` lee las dos formas (`meta.target` y la del adaptador) |
| 2 pruebas de la guarda `onRoute` | La guarda funcionaba (mensaje exacto de DEC-16), pero Fastify ejecuta `onRoute` al **registrar** la ruta: el error sale de `await app.register(...)`, no de `ready()` | Las pruebas envuelven `register` + `ready` en la expectativa |
| "rota la sesión: token nuevo" | Dos JWT firmados en el mismo segundo para el mismo `sub` son idénticos (S-05 no incluye `jti`) | La prueba verifica que el token rotado sea válido y del usuario |
| "`Content-Type` no JSON" esperaba 415 | Fastify trae un parser `text/plain` por defecto: el cuerpo llega como texto y `validarCuerpo` responde `400 VALIDACION`, que es lo que pide el plan | Prueba ajustada: `text/plain` → 400 `VALIDACION`; `application/xml` → 415 `SOLICITUD_INVALIDA`; JSON malformado → 400 `SOLICITUD_INVALIDA`; sin cuerpo → 400 `VALIDACION` |
| Relectura: DEC-06 "cada verificación poda la llave" | El handler solo podaba al escribir un fallo | `fallosVigentes()` en `handlers/auth/index.ts` poda la llave (con `podarLlaves` de `core`) antes de `estaBloqueado` |
| Relectura: DEC-16 "identidad o `name`" | La comparación por `name` dejaba pasar una función ajena llamada `authenticate` | Solo identidad (dentro de lo que permite el plan) |
| Pendientes del corte | `src/scripts/*.ts` no existían (`npm run seed:admin` apuntaba a archivos inexistentes); `pendiente.mjs` y `eslint.config.mjs` sin tocar | Hechos en el paso 12 |

Tras las correcciones: backend 19 archivos / 126 pruebas en verde, `FSTDEP=0`, 0 filas `@pruebas.local`.

## Comprobación de versiones (V-02) y tabla de versiones

No usé la función `ultima` de BACK-02; consulté `version`/`dist-tags.latest` y, para `@fastify/cookie`, cada versión de la serie 11 (información equivalente). Salidas literales (primera sesión):

```
argon2: version = '0.45.1' · dist-tags.latest = '0.45.1' · engines = { node: '>=16.17.0' } · (sin optionalDependencies)
argon2@0.45.1 dependencies = { 'cross-env': '^10.1.0', '@phc/format': '^1.0.0', 'node-addon-api': '^8.9.0', 'node-gyp-build': '^4.8.4' } · binary = { napi_versions: [ 8 ] }
npm pack argon2@0.45.1 --dry-run → prebuilds/win32-x64/argon2.glibc.node (210.9kB), linux-x64 glibc y musl, linux-arm64, darwin-arm64, freebsd…
jose: version = '6.2.12' · dist-tags.latest = '6.2.12'
@fastify/cookie: version = '11.1.2' · dist-tags.latest = '11.1.2' · dependencies = { cookie: '^2.0.0', 'fastify-plugin': '^6.0.0' } (sin peerDependencies)
@fastify/cookie@11.0.0 { cookie: '^1.0.0', 'fastify-plugin': '^5.0.0', 'cookie-signature': '^1.2.1' }
@fastify/cookie@11.0.1 / 11.0.2 { cookie: '^1.0.0', 'fastify-plugin': '^5.0.0' }
@fastify/cookie@11.1.0 { cookie: '^1.0.0', 'fastify-plugin': '^6.0.0' }
@fastify/cookie@11.1.1 { cookie: '^2.0.0', 'fastify-plugin': '^6.0.0' }
fastify-plugin: version = '6.0.0' · dist-tags = { next: '5.0.0', latest: '6.0.0' }
npm ls fastify-plugin (antes de instalar) → @campus/backend → fastify-plugin@5.1.0 (una copia)
```

| Paquete | Dónde | Rango en `package.json` | Instalada | Nota |
|---|---|---|---|---|
| `argon2` | backend deps | `^0.45.1` | 0.45.1 | Binario precompilado `win32-x64`; `node -e "require('argon2')"` carga sin compilar |
| `jose` | backend deps | `^6.2.12` | 6.2.12 | — |
| `@fastify/cookie` | backend deps | `^11.1.2` | 11.1.2 | Trae `fastify-plugin@6.0.0` y `cookie@2.0.1` anidados (**D-01**) |

`npm install` desde la raíz: código 0, `added 10 packages, audited 761 packages`. Entraron al lock: `argon2`, `@phc/format`, `node-addon-api`, `node-gyp-build`, `cross-env` y `@epic-web/invariant` (estas dos las declara `argon2` como dependencias de ejecución), `jose`, `@fastify/cookie`, `@fastify/cookie/node_modules/cookie`, `@fastify/cookie/node_modules/fastify-plugin`. Ninguna es de AWS ni de un proveedor. Avisos `EBADENGINE` de `jsdom@30.1.1`, `@asamuzakjp/css-color`, `@asamuzakjp/dom-selector` y `w3c-xmlserializer` (piden Node `^24.15.0`; hay `24.11.1`): son dependencias previas del frontend, no de este encargo. `npm audit`: las mismas 4 altas que BACK-02 midió y aceptó (`deepmerge-ts` y `mysql2`, transitivas del CLI de Prisma); ninguna viene de lo nuevo.

## SQL final de la migración `20260923143021_usuarios_y_sesiones`

Creada con una sola `npx prisma migrate dev --create-only --name usuarios_y_sesiones` (código 0, sin pedir `reset`); edité el final añadiendo solo el bloque de DEC-01 y la apliqué con una sola `npx prisma migrate dev` (código 0, `Applying migration 20260923143021_usuarios_y_sesiones … Your database is now in sync with your schema.`). No hubo segunda carpeta ni reintento. LF.

```sql
-- CreateEnum
CREATE TYPE "rol_usuario" AS ENUM ('estudiante', 'maestro', 'admin');

-- CreateEnum
CREATE TYPE "estado_pago" AS ENUM ('al_corriente', 'deudor');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "hash_contrasena" TEXT NOT NULL,
    "debe_cambiar_contrasena" BOOLEAN NOT NULL DEFAULT false,
    "nombre" TEXT NOT NULL,
    "nombre_busqueda" TEXT NOT NULL,
    "rol" "rol_usuario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "estado_pago" "estado_pago" NOT NULL DEFAULT 'al_corriente',
    "fecha_estado_pago" TIMESTAMPTZ(3),
    "acceso_restringido" BOOLEAN NOT NULL DEFAULT false,
    "motivo_restriccion" TEXT,
    "fecha_restriccion" TIMESTAMPTZ(3),
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "hash_token" TEXT NOT NULL,
    "expira_en" TIMESTAMPTZ(3) NOT NULL,
    "revocada_en" TIMESTAMPTZ(3),
    "reemplazada_por" UUID,
    "ip" TEXT,
    "agente" TEXT,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_rol_idx" ON "usuarios"("rol");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_hash_token_key" ON "sesiones"("hash_token");

-- CreateIndex
CREATE INDEX "sesiones_usuario_id_idx" ON "sesiones"("usuario_id");

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Un solo administrador (ESSENTIALS "Tablas"). Prisma no expresa índices parciales; este
-- índice vive solo en la migración. Prisma ignora los índices parciales al comparar el esquema
-- con la base, así que no genera deriva (V-07 lo comprueba).
CREATE UNIQUE INDEX "usuarios_un_solo_admin_idx" ON "usuarios" ("rol") WHERE "rol" = 'admin';
```

## Puntos **[verificar]** del plan

1. **`PrismaClientKnownRequestError`:** lo exporta el cliente generado como `Prisma.PrismaClientKnownRequestError` (`generated/internal/prismaNamespace.ts:32`, reexporta el de `runtime`), accesible con `import { Prisma } from "./generated/client.js"`. `instanceof` funciona (sonda: `esConocido: true`, `code: "P2002"`).
2. **`meta.target` del índice parcial:** **no existe** con el driver adapter. Sonda en dos transacciones siempre revertidas (0 residuos):
   ```
   EMAIL {"code":"P2002","meta":{"driverAdapterError":{"name":"DriverAdapterError","cause":{"originalCode":"23505","originalMessage":"duplicate key value violates unique constraint \"usuarios_email_key\"","kind":"UniqueConstraintViolation","constraint":{"index":"usuarios_email_key"},"table":"usuarios"}},"modelName":"Usuario"}}
   ADMIN {"code":"P2002","meta":{"driverAdapterError":{…"constraint":{"index":"usuarios_un_solo_admin_idx"},"table":"usuarios"}},"modelName":"Usuario"}}
   ```
   `errores.ts` lee `meta.target` (motor clásico) o `meta.driverAdapterError.cause.constraint.{index,fields}` (adaptador). El mapeo del plan no cambia: `email` → `409 CORREO_EN_USO`; cualquier otro → `409 ADMIN_YA_EXISTE`.
3. **Nombre de `Ejecutor`:** `Prisma.TransactionClient` (`generated/internal/prismaNamespace.ts:965`: `export type TransactionClient = Omit<DefaultPrismaClient, runtime.ITXClientDenyList>`). `type Ejecutor = PrismaClient | Prisma.TransactionClient` en `adapters/db/cliente.ts`.
4. **`AppError` a través de `$transaction`:** llega intacto; `admin-unico` pasa con `rejects.toMatchObject({ codigo: "ADMIN_YA_EXISTE", estado: 409 })` en las dos ramas: sin admin real (corridas previas a V-12) y con admin real (corridas posteriores). El `timeout` de 5 s basta porque los hashes se calculan antes de abrir la transacción.
5. **`onRoute` en plugins hijos y `HEAD`:** el `onRoute` del ámbito raíz ve las rutas de los hijos con prefijo (prueba con `prefix: "/api/prueba"`). El error se lanza al **registrar** la ruta, así que sale de `await app.register(...)` y, en `server.ts`, de `construirApp`: la API no llega a escuchar. `HEAD`: con `exposeHeadRoutes` (por defecto) `construirApp` arranca con `GET /api/me`, así que la ruta `HEAD` generada no dispara la guarda, y `curl.exe -I /api/me` sin token responde `401`: la copia `HEAD` pasa por la cadena.
6. **`navigator.locks`:** `lib.dom` declara `readonly locks: LockManager` y `request<T>(name, callback: LockGrantedCallback<T>): Promise<T>`; compila con `tsc -b`. En jsdom no existe y se usa solo la promesa single-flight (guarda `!navigator.locks`). **No verificado en un navegador real.**
7. **Tiempo de argon2id** (m=19456, t=2, p=1; prefijo `$argon2id$v=19$m=19456,p=1,t=2`): 10 hashes, mínimo 38.3 ms, mediana 48.2 ms y máximo 52.6 ms; algo por debajo de los 50–150 ms estimados. Suite del backend: 19–23 s de pared (`Duration` de Vitest entre 5 y 9 s). No supera los 60 s de R-05.
8. **La migración corre en transacción (R-10):** **no verificado**. `migrate dev` aplicó al primer intento y no hubo que repetir nada.
9. **Enums generados:** `generated/enums.ts` exporta `Rol = { estudiante, maestro, admin }` y `EstadoPago = { al_corriente, deudor }`. En `adapters/db/usuarios.ts` una comprobación de tipos en compilación (`Iguales<Rol, RolDb>`) falla si el enum de `shared/` y el de la base divergen.
10. **`fastify-plugin ^5` en `@fastify/cookie`:** **no se cumple** (exige `^6`); ver D-01.
11. **`tsc` dentro de `generated/`:** sin errores en ningún momento.

## Verificaciones V-01 a V-22

- **V-01 — ok.** `node v24.11.1`, `npm 11.6.2`; `git status --short` → solo `?? docs/trabajo/AUTH-01-autenticacion-basica/`; `docker compose ps` → `postgres`, `minio` y `livekit` `Up (healthy)`; puertos 3000 y 5173 libres.
- **V-02 — ok con desviación.** Versiones como la tabla (`argon2 0.45.1`, `jose 6.2.12`, `@fastify/cookie 11.1.2`, todas `latest` del mismo mayor), `argon2` con binario `win32-x64`. `@fastify/cookie` exige `fastify-plugin ^6`: el plan pedía reportar antes de instalar y no lo hice (**D-01**).
- **V-03 — parcial.** `npm install` código 0; `npm ls argon2 jose @fastify/cookie fastify-plugin cookie` código 0, pero con **dos** `fastify-plugin` (5.1.0 y 6.0.0 anidada). `node -e "require('argon2')"` → `argon2 carga; argon2id = 2 ; version 0.45.1`, sin compilar.
- **V-04 — ok.** `shared`: `npm run build` → `dist/auth.js`, `auth.d.ts`, `auth.js.map`; `npm run lint` código 0.
- **V-05 — ok.** `npx vitest run src/core` → 7 archivos, 43 pruebas (34 nuevas: normalización 8, sesiones 8, autorización 9, intentos 6, me 3).
- **V-06 — ok.** `prisma validate` → válido; `prisma format --check` → "All files are formatted correctly!"; `--create-only` → carpeta `20260923143021_usuarios_y_sesiones`, sin el índice parcial, con `"actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP` en las dos tablas.
- **V-07 — ok.** Salida literal:
  ```
  npx prisma migrate status → 2 migrations found in prisma/migrations · Database schema is up to date!
  npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
    Loaded Prisma config from prisma.config.ts.
    No difference detected.
    codigo=0
  pg_indexes:
   sesiones_hash_token_key    | CREATE UNIQUE INDEX sesiones_hash_token_key ON public.sesiones USING btree (hash_token)
   sesiones_pkey              | CREATE UNIQUE INDEX sesiones_pkey ON public.sesiones USING btree (id)
   sesiones_usuario_id_idx    | CREATE INDEX sesiones_usuario_id_idx ON public.sesiones USING btree (usuario_id)
   usuarios_email_key         | CREATE UNIQUE INDEX usuarios_email_key ON public.usuarios USING btree (email)
   usuarios_pkey              | CREATE UNIQUE INDEX usuarios_pkey ON public.usuarios USING btree (id)
   usuarios_rol_idx           | CREATE INDEX usuarios_rol_idx ON public.usuarios USING btree (rol)
   usuarios_un_solo_admin_idx | CREATE UNIQUE INDEX usuarios_un_solo_admin_idx ON public.usuarios USING btree (rol) WHERE (rol = 'admin'::rol_usuario)
  _prisma_migrations: 20260922015711_extensiones_iniciales t · 20260923143021_usuarios_y_sesiones t (sin rolled_back_at)
  ```
  Prisma no ve el índice parcial como deriva: el `migrate dev` del siguiente encargo con migración no debería proponer borrarlo.
- **V-08 — retirada** (Enmienda 1). La cubre `admin-unico.integracion.test.ts`.
- **V-09 — ok.** `prisma generate` → `✔ Generated Prisma Client (7.10.0)`; enums y `Ejecutor` confirmados ([verificar] 3 y 9).
- **V-10 — ok.** `npm run typecheck` en `backend/` código 0; `grep -w any` en el código nuevo → sin coincidencias.
- **V-11 — ok.** `npm test` del backend → 19 archivos, 126 pruebas, código 0; `grep -c FSTDEP` → 0; duración 19–23 s; `SELECT count(*) FROM usuarios WHERE email LIKE '%@pruebas.local'` → 0 después de cada corrida.
- **V-12 — ok.** Primera `npm run seed:admin` → `Administrador creado: admin@campus.local`, código 0; segunda → `Ya existe una cuenta de administrador. Usa npm run reset:admin para cambiar su contraseña.`, código 1. Apariciones de `ADMIN_PASSWORD` en las dos salidas: 0 y 0 (comparado en memoria, sin imprimirla).
- **V-13 — ok.** Para que el 0 signifique algo, abrí antes dos sesiones del admin con la API (`login admin: 200` ×2) → 2 sesiones vivas → `npm run reset:admin` → `Contraseña del administrador actualizada y sesiones cerradas: admin@campus.local`, código 0 → 0 vivas; la contraseña aparece 0 veces en la salida; el login posterior responde 200. No verificado: `reset:admin` sin admin → código 1 (habría que borrar el admin).
- **V-14 — ok.** API desde `dist/` por PID propio (18348), usuario `v14-<uuid>@pruebas.local`:
  ```
  registro     → HTTP/1.1 201 · set-cookie: campus_refresco=<valor>; Max-Age=2592000; Path=/api/auth; HttpOnly; SameSite=Strict · cuerpo solo ['tokenAcceso']
  refrescar    → HTTP/1.1 200 · set-cookie con los mismos atributos
  reutilización (tarro copiado) → 401 {"error":{"codigo":"SESION_INVALIDA",…}}
  token nuevo tras la reutilización → 401 SESION_INVALIDA
  /me con Authorization → 200 {"id":…,"nombre":"Prueba V14","email":…,"rol":"estudiante","debeCambiarContrasena":false,"accesoRestringido":false} · estadoPago: 0
  6× login contraseña mala  → 401 ×5, 6.º 429 retry-after: 900 DEMASIADOS_INTENTOS
  6× login correo inexistente → 401 ×5, 6.º 429 retry-after: 900 DEMASIADOS_INTENTOS
  logout → 204 · set-cookie: campus_refresco=; Max-Age=0; Path=/api/auth; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict · cuerpo vacío
  grep -ci "contrasena|clave-de-prueba|campus_refresco=" api.log → 0 · JWT (eyJ) en el log → 0 · bearer → 0
  ```
  Filas propias borradas (`DELETE 2`: V-14 y V-15, por correo exacto y `@pruebas.local`); la API se detuvo por PID; tarros borrados.
- **V-15 — ok.** `/api/me` sin token → `401 NO_AUTENTICADO`; con la cookie **viva** de otro usuario propio (`v15`, enviada a mano con `-H "Cookie: …"` porque `Path=/api/auth` impide que `curl -b` la mande a `/api/me`) y sin `Authorization` → `401 NO_AUTENTICADO`; `curl -b` con el tarro → 401; `HEAD /api/me` → 401; la cookie seguía viva (`refrescar` 200) y el logout la cerró.
- **V-16 — ok.** Prueba en `auth-registro.integracion` con `construirApp({ env: { …, NODE_ENV: "production", JWT_SECRET: <48 bytes aleatorios> } })` → la cookie lleva `Secure`. Prueba unitaria en `env.test.ts` con el mensaje exacto de DEC-17. Además, en el arranque real: `NODE_ENV=production node --env-file-if-exists=.env dist/server.js` → código 1, `JWT_SECRET: en production debe ser un secreto propio de al menos 32 caracteres, distinto del de .env.example`, sin el valor.
- **V-17 — ok.** (1) `argon2|from "jose"` fuera de `adapters/auth`: solo el nombre de la clave `argon2` en `config/auth.ts`, comentarios y aserciones de ausencia en `me.test.ts`; los únicos `import` reales están en `adapters/auth/contrasenas.ts` y `tokens.ts`. (2) `obtenerDb|generated/` fuera de `adapters/db` en `src/`: ninguno. (3) `perfil.rol|request.perfil` en `handlers/`: ninguno. (4) `estadoPago` en `handlers`, `middleware` y `core/auth`: solo comentarios y aserciones de ausencia.
- **V-18 — ok.** `npm run lint` desde la raíz → código 0 en los tres workspaces (antes del frontend y al final). Prettier solo acotado: `backend/` (`src test prisma.config.ts`) y `frontend/` (`src`), con `--ignore-path ../.prettierignore`.
- **V-19 — ok.** `npm test` del frontend → 8 archivos, 36 pruebas; `npm run build` → código 0 (aviso de chunk > 500 kB que ya existía desde FRONT-01). `localStorage|sessionStorage` en `frontend/src` → solo el comentario de `tokenAcceso.ts`. `fetch(` fuera de pruebas → solo `apiClient.ts` (línea 60, refresco; línea 107, envío general). `cambiar-contrasena` → 0 apariciones (el punto de extensión de `apiClient.ts:132` nombra el código `CAMBIO_DE_CONTRASENA_REQUERIDO`, no la ruta).
- **V-20 — ok.** API (`dist/`, PID 4692) y Vite (`npm run dev`, raíz propia 18512; puerto 5173 en el nieto 13444) propios. Con la API encendida: `5173/api/salud` → 200, `5173/login` → 200, y el login del admin por el proxy → 200 con `campus_refresco=…; Max-Age=2592000; Path=/api/auth; HttpOnly; SameSite=Strict`. Con la API apagada: `HTTP/1.1 502 Bad Gateway`, `Content-Type: text/plain`, cuerpo de 0 bytes. **Estado real: 502, no el 500 que registró FRONT-01.** Es justo el caso "502 sin JSON → `SIN_CONEXION`" de `apiClient.test.ts`. Árboles detenidos por PID; ningún `node.exe` vivo al final.
- **V-21 — ok.** `git status --short --untracked-files=all`: solo archivos de la tabla, más `estado.ts` (D-02) y este resumen. `git diff --quiet -- infra tsconfig.base.json backend/tsconfig.json backend/vitest.config.ts frontend/vite.config.ts .prettierrc.json .prettierignore .gitignore .gitattributes AGENTS.md CLAUDE.md .claude docs/ARCHITECTURE.md docs/ARCHITECTURE-ESSENTIALS.md docs/PRD.md backend/prisma/migrations/20260922015711_extensiones_iniciales` → 0. También sin cambios: `frontend/tsconfig*.json`, `frontend/vitest.config.ts`, `shared/tsconfig.json`, `backend/prisma.config.ts`, `handlers/salud.ts`, `handlers/errores.ts` y `frontend/.env.example`. `git ls-files --eol`: 58 no rastreados en `w/lf` y 30 modificados en `i/lf w/lf`; el único `w/` vacío es `pendiente.mjs` (borrado).
- **V-22 — parcial (declarado).** En `powershell.exe -NoProfile`, tal cual: §3 copia con guarda → `.env existe=True`, sin copia; §3 generar secreto → longitud 64, código 0 (no lo imprimí); §4 `npx prisma generate` → `✔ Generated Prisma Client (7.10.0)`; §5 `npm run seed:admin` → mensaje de "Ya existe", código 1; §5 `npm run reset:admin` → código 0 con su mensaje; §6 `npm run dev` (lanzado con `Start-Process`, raíz 5988; `predev` tarda más de 20 s) + `curl.exe http://127.0.0.1:3000/api/salud` → `{"estado":"ok",…}`, `curl.exe -i …/api/no-existe` → `404` + `NO_ENCONTRADO`, `/api/me` → 401; árbol detenido con `taskkill`; §7 `SELECT count(*) … @pruebas.local` → 0; frontend §3 `npm run dev` → ejecutado en V-20. **No ejecutados:** `npx prisma migrate dev` de §4 (prohibido por el orquestador en la reanudación; en su lugar `migrate status` → up to date); el `DELETE` de §7 (la `SELECT` dio 0 y el plan solo autoriza borrar filas propias); Ctrl+C (sustituido por `taskkill`); el recorrido en navegador de frontend §3 (sin navegador: está cubierto por `login-view.test`, `registro-view.test`, `router.test` y el login por el proxy de V-20).

## Conteos de pruebas

| Paquete | Archivos | Pruebas | Existentes | Nuevas |
|---|---|---|---|---|
| backend | 19 | 126 | 24 (`env` 7 ajustadas, `errores` 6, `salud` 3, `db-cliente` 3, `salud.integracion` 4, `salud-sin-base` 1) | 102 |
| frontend | 8 | 36 | 13 (`login-view` 3, de las que se adaptó 1) | 23 |
| shared | 0 | 0 | — | — |
| **raíz (`npm test`)** | **27** | **162** | | |

Por archivo. Backend: `config/env` 15 · `core/auth/autorizacion` 9 · `intentos` 6 · `me` 3 · `normalizacion` 8 · `sesiones` 8 · `core/errores` 6 · `core/salud` 3 · `middleware/index` 4 · `admin-unico` 2 · `auth-login` 9 · `auth-refresco` 10 · `auth-registro` 9 · `db-cliente` 3 · `me` 12 · `middleware-orden` 9 · `salud-sin-base` 1 · `salud` 4 · `tokens-acceso` 5. Frontend: `router` 5 · `lib` 6 · `login-view` 7 · `registro-view` 3 · `diagnostico-view` 2 · `format` 1 · `apiClient` 10 · `authService` 2. Supera las cifras del plan (≈118 y ≈32) por casos extra: V-16 en `auth-registro`, cookie sin `Authorization` en `me`, `iss`/`aud`/`sub` en `tokens-acceso`, maestro en ruta de admin y guarda en `construirApp` en `middleware-orden`, `erroresPorCampo` en `lib`, doble clic en `login-view`, y 7 casos (no 6) en `apiClient`, que son los que la lista del plan enumera.

## Claves agregadas a `backend/.env`

`JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NOMBRE`, con los valores de desarrollo de `backend/.env.example`, añadidas a las 08:28 con `grep -q '^CLAVE=' .env || printf 'CLAVE=valor\n' >> .env` (antes, `grep -q` confirmó que no existían). No modifiqué ninguna clave existente. Hoy `grep -o '^[A-Z_]*=' backend/.env` da exactamente las mismas nueve claves que `.env.example`. Nunca leí ni imprimí sus valores; las verificaciones que necesitaban `ADMIN_*` las leyeron con `process.loadEnvFile` en memoria y solo imprimieron estados o conteos.

## `seed:admin` en local

Creó el administrador `admin@campus.local` en `campus_dev` (V-12). Sigue existiendo, con la contraseña de `ADMIN_PASSWORD` de `backend/.env` (fijada otra vez por `reset:admin` en V-13 y V-22). Tiene una sesión viva, la del último login de V-20 por el proxy. Estado final de la base: `usuarios` = 1 fila (el admin), 0 `@pruebas.local`.

## Desviaciones

- **D-01 (requiere decisión).** Segunda copia de `fastify-plugin` por `@fastify/cookie@11.1.2`; el plan pedía detenerse. Detalle y opciones al principio.
- **D-02.** Archivo extra `backend/src/adapters/auth/estado.ts` (no está en la tabla "Archivos"). Guarda la clave del JWT, los parámetros de argon2 y el hash de relleno, compartidos por `contrasenas.ts`, `tokens.ts` e `index.ts` sin un ciclo de importación (el mismo motivo por el que el plan crea `tokenAcceso.ts` en el frontend).
- **D-03.** `adapters/db/cliente.ts` añade `enTransaccion(ejecutor, fn)`: abre una transacción si recibe el cliente y corre dentro si ya es un `TransactionClient`. Hace posible el parámetro `ejecutor` de DEC-10 en las funciones que ya son transaccionales.
- **D-04.** `errores.ts` lee también la forma del driver adapter (**[verificar]** 2). Sin esto, un correo duplicado respondía `ADMIN_YA_EXISTE`.
- **D-05.** `useCerrarSesion` navega a `/login` **antes** de `queryClient.clear()` (el plan dice limpiar y luego navegar), para que ninguna guarda montada vuelva a pedir `/me` con la caché vacía.
- **D-06.** `AccesoRestringidoView` redirige a su dashboard a quien no está restringido, para no mostrar un mensaje falso. El plan no lo especifica.
- **D-07.** Piezas auxiliares no nombradas en el plan, dentro de archivos listados: `erroresPorCampo` (`lib.ts`); `CampoFormularioAuth`, `ErroresFormulario` e `IncidenciaValidacion` (`types.ts`); `ETIQUETAS_ROL`, `CAMPOS_FORMULARIO_AUTH`, `RUTA_ACCESO_RESTRINGIDO` y `MENSAJE_ERROR_AUTH_GENERICO` (`data.ts`); `rutaActual()` (`navegacion.ts`, para "salvo que ya esté en /login o /registro" y para poder sustituirla en pruebas). El frontend no importa `zod`; valida con los esquemas de `shared/` y un tipo estructural de incidencia.
- **D-08.** `login-view.tsx` no cambió (el plan lo marcaba "Modificar"): no hizo falta; `avisoPendiente` se quitó de `data.ts` y de `formulario-login.tsx`.
- **D-09.** Pruebas existentes ajustadas (son del programador, no del Tester): `env.test.ts` (exige `JWT_SECRET`, R-11), `router.test.tsx` (las 2 existentes simulan `fetch` y usan `vi.resetModules()` con un precalentamiento en `beforeAll`) y `login-view.test.tsx` ("al enviar no navega" pasó a "con campos vacíos no envía, marca los campos y sigue en /login").
- **D-10.** La guarda `onRoute` compara solo por identidad (el plan permitía identidad o `name`).
- **D-11.** V-02 sin la función `ultima` (información equivalente con `npm view`).
- **D-12.** V-13 con dos sesiones del admin abiertas antes por la API, para que el 0 tenga sentido.
- **D-13.** V-22 parcial (lo no ejecutado está listado arriba).
- **D-14.** README §7 documenta cómo revisar y borrar filas `@pruebas.local` residuales (`SELECT` y `DELETE … WHERE email LIKE '%@pruebas.local'`). El plan pedía mencionar que las pruebas insertan y borran filas; el comando de limpieza es un añadido para que el humano lo revise.
- **D-15.** `refrescar` con usuario inactivo también limpia la cookie (el plan dice `revocarSesion` + 401); así todos los rechazos de `refrescar` la limpian igual.
- **D-16.** `revocarSesion`, `revocarSesionPorHash` y `revocarTodasLasSesiones` usan `updateMany … WHERE revocada_en IS NULL` (idempotentes; no reescriben la fecha de una sesión ya revocada).
- **D-17.** En la reanudación, un comando de arranque por tubería se colgó: el hijo de `Start-Process` heredó el *pipe* hacia `tr`. Terminé solo mis procesos: el `bash` 1295 y el `tr` 1301 de ese comando (identificados con `ps -ef`, arrancados por mí a las 09:19:56) y, al final, la API 4692 que ese mismo comando había lanzado (reutilizada en V-20). Desde entonces, arranques solo con redirección a archivo.
- **D-18.** `backend/scripts/` quedó vacía al borrar `pendiente.mjs` y la eliminé con `rmdir` (git no rastrea carpetas).

## Lo no verificado

- Comprobación visual: 360 px en login y registro, foco visible, contraste y recorrido real en navegador (no hay navegador en este entorno). El comportamiento está cubierto por pruebas con jsdom y por el login a través del proxy de V-20.
- `navigator.locks` en un navegador real con dos pestañas (R-03).
- `reset:admin` sin administrador → código 1.
- Que `migrate dev` corra la migración dentro de una transacción (R-10).
- `seed:admin` desde `dist/` (encargo de despliegue).
- `npm run dev:worker`: no se volvió a ejecutar (su código no cambió).

## Pendiente o fuera de alcance detectado

- Decisión sobre D-01 (`@fastify/cookie` 11.1.2 con dos `fastify-plugin`, o fijar 11.0.2).
- Propuestas para `AGENTS.md`, `CLAUDE.md` y DOCS-02: las del plan siguen vigentes; añado para `AGENTS.md` "Comandos" que `seed:admin` y `reset:admin` leen `ADMIN_*` de `backend/.env`, y para la guía de Windows que `Start-Process` no se combine con tuberías (el hijo hereda el *pipe*; redirigir a archivo).
- DOCS: `ARCHITECTURE.md` o ESSENTIALS podría anotar que con el driver adapter de Prisma 7 los P2002 traen el índice en `meta.driverAdapterError.cause.constraint` (quien escriba el próximo `alDuplicar` lo necesita).
- El proxy de Vite responde hoy 502 (no 500) con la API caída; el README ya lo dice. Conviene corregir la mención de FRONT-01 si se reutiliza.
- Los pendientes del plan: `chore/` de Testcontainers inmediato (M-05), AUTH-02, `admin`, `pagos`, despliegue (límite de tasa en `/auth/*` antes de abrir a alumnos, `trustProxy`, CORS, `Secure` real), buscador (índice GIN) y `LIMPIEZA_DIARIA` (purga de `sesiones`).
- `@fastify/cookie` trae `cookie@2.0.1` (pide Node ≥ 22; cumple).

## Para el Tester

**Precondiciones.** Infra levantado (`docker compose up -d` desde `infra/`; `postgres` en `127.0.0.1:5433`, base `campus_dev`). `backend/.env` con `DATABASE_URL`, `JWT_SECRET` y `ADMIN_*` (ya están; no lo leas ni lo imprimas). Migraciones aplicadas (`npx prisma migrate status` → up to date; **no** ejecutes `migrate dev`, `reset`, `resolve` ni `db push`). Dependencias instaladas. Puertos 3000 y 5173 libres al empezar.

**Estado de la base.** Existe un administrador real, `admin@campus.local`, con la contraseña de `ADMIN_PASSWORD`. Solo puede haber uno: no crees otro admin fuera de una transacción que se revierta (patrón de `test/admin-unico.integracion.test.ts`), o chocarás con `usuarios_un_solo_admin_idx`. No hay filas `@pruebas.local`.

**Dónde van tus pruebas.** Backend: `backend/test/*.ataque.test.ts` (entra en `test/**/*.test.ts`) o junto a `src/`. Frontend: `frontend/src/**/*.ataque.test.ts(x)`.

**Ayudas (`backend/test/ayudas-auth.ts`).**
- `crearUsuarioDePrueba(ids, { rol?, activo?, accesoRestringido?, motivoRestriccion?, debeCambiarContrasena?, contrasena?, nombre? })` inserta con Prisma un usuario `auth-<uuid>@pruebas.local` (contraseña por defecto `CONTRASENA_DE_PRUEBA`) y añade su id a `ids`.
- `iniciarSesionDePrueba(app, usuario)` → `{ tokenAcceso, cookie, respuesta }` por `POST /api/auth/login`.
- `firmarTokenDePrueba({ usuarioId, ahora })` firma un JWT real (para vencidos, usa `ahora` en el pasado).
- `firmarJwtDePrueba({ payload, secreto?, alg? })` + `cargaDeTokenDePrueba({ usuarioId, ahora, duracionS?, iss?, aud? })` arman JWT a mano (`alg: none`, otro secreto, otro `iss`/`aud`, `sub` inválido) sin importar `jose`. `alterarFirma(token)` invalida la firma.
- `crearSesionDePrueba({ usuarioId, expiraEn, revocadaEn? })` → `{ id, token }` (sesiones vencidas o revocadas a medida).
- `refrescarDePrueba(app, cookie?)` y `consultarMe(app, token?, cookie?)`.
- `contarSesionesVivas(usuarioId)`, `leerSesiones(usuarioId)`, `leerUsuarioPorCorreo(email)`, `desactivarUsuarioDePrueba(id)`.
- Limpieza: `borrarUsuariosDePrueba(ids)` en `afterAll` (las sesiones caen en cascada) y, para usuarios creados por la API, `borrarUsuariosDePruebaPorCorreo(correos)` (solo borra correos `@pruebas.local`).
- Construye la app con `construirApp({ env: cargarEnv() })` y `await app.ready()`. Cada instancia tiene su propio almacén de intentos. Para simular otra IP, usa `remoteAddress` en `inject`.

**Con la API real.** `npm run build` y luego `node --env-file-if-exists=.env dist/server.js` desde `backend/` (o `npm run dev`; su `predev` tarda más de 20 s). Arráncala con `Start-Process … -RedirectStandardOutput <archivo> -PassThru` y guarda el PID; **no la combines con una tubería** (`| …`), porque el hijo hereda el *pipe* y el comando no vuelve (D-17). Detén solo tu árbol con `taskkill //PID <pid> //T //F`. Para obtener un token:
```bash
curl.exe -s -c backend/tmp/cookies.txt -H "Content-Type: application/json" \
  -d '{"nombre":"Prueba Tester","email":"t-<uuid>@pruebas.local","contrasena":"clave-de-prueba-1234"}' \
  http://127.0.0.1:3000/api/auth/registro        # 201 {"tokenAcceso":"…"} + cookie en el tarro
curl.exe -s -H "Authorization: Bearer <token>" http://127.0.0.1:3000/api/me
curl.exe -s -b backend/tmp/cookies.txt -c backend/tmp/cookies.txt -X POST http://127.0.0.1:3000/api/auth/refrescar
```
La cookie tiene `Path=/api/auth`: `curl -b` no la envía a `/api/me`; para forzarla usa `-H "Cookie: campus_refresco=<valor>"`. El límite de intentos vive en memoria del proceso: se reinicia al reiniciar la API. Limpia al terminar: tus filas por correo exacto (`DELETE FROM usuarios WHERE email = '<tu correo>@pruebas.local'`, única escritura manual autorizada, desde `infra/` con `docker compose exec -T postgres psql -U campus -d campus_dev -c …`), y borra los tarros de cookies.

**Comportamientos esperados (no son defectos).**
- Un JWT sigue valiendo hasta su `exp` (máximo 15 min) aunque su sesión se revoque (S-15).
- Tras rotar, el `tokenAcceso` puede ser idéntico al anterior si ambos se firmaron en el mismo segundo (no hay `jti`); la cookie sí cambia.
- `text/plain` → `400 VALIDACION` (`cuerpo: debe ser un objeto JSON`); `application/xml` → `415 SOLICITUD_INVALIDA`; JSON malformado → `400 SOLICITUD_INVALIDA`.
- La guarda de rutas falla en el `register` (al arrancar), no en una petición.
- El 429 es por IP + correo normalizado: otro correo desde la misma IP, u otra IP con el mismo correo, no está bloqueado.
- Todos los rechazos de `refrescar` responden `401 SESION_INVALIDA` y limpian la cookie.

**Frontend.** Pruebas con jsdom, sin API. Sustituye `@/services/navegacion` con `vi.mock` (`irA`, `rutaActual`). `restaurarSesion` memoiza por carga del módulo: usa `vi.resetModules()` con importación dinámica, y un `beforeAll` que importe una vez `./router` (en frío tarda más de 5 s).

## Archivos por paso

- **Paso 2 (`shared/`):** creado `shared/src/auth.ts`; modificado `shared/src/index.ts`.
- **Paso 3:** modificados `backend/package.json` y `package-lock.json`.
- **Paso 4 (`core/`):** creados `backend/src/core/auth/{normalizacion,sesiones,autorizacion,intentos,me}.ts` y sus `.test.ts`.
- **Paso 5 (`config/`):** modificados `backend/src/config/{env,env.test,logger}.ts`; creado `backend/src/config/auth.ts`.
- **Paso 6 (Prisma):** modificado `backend/prisma/schema.prisma`; creado `backend/prisma/migrations/20260923143021_usuarios_y_sesiones/migration.sql`.
- **Paso 7 (`adapters/db`):** modificados `backend/src/adapters/db/{cliente,index}.ts`; creados `backend/src/adapters/db/{errores,usuarios,sesiones}.ts`.
- **Paso 8 (`adapters/auth`):** creados `backend/src/adapters/auth/{index,contrasenas,tokens,refresco,estado}.ts` (`estado.ts`: D-02) y `backend/test/tokens-acceso.test.ts`.
- **Paso 9 (`middleware/`):** creados `backend/src/middleware/{tipos,rutas-publicas,guarda-de-rutas,authenticate,with-profile,with-password-gate,with-access,require-role,require-membership,require-ownership,index}.ts` e `index.test.ts`; modificado `backend/src/middleware/README.md`.
- **Paso 10 (`handlers/`, `app.ts`):** creados `backend/src/handlers/{validacion,usuarios}.ts` y `backend/src/handlers/auth/{index,cookie}.ts`; modificado `backend/src/app.ts`.
- **Paso 11:** creados `backend/test/ayudas-auth.ts` y `backend/test/{auth-registro,auth-login,auth-refresco,me,middleware-orden,admin-unico}.integracion.test.ts`.
- **Paso 12:** creados `backend/src/scripts/{seed-admin,reset-admin}.ts`; borrado `backend/scripts/pendiente.mjs` (y la carpeta vacía); modificado `eslint.config.mjs`.
- **Paso 14:** modificado `backend/.env.example` (y `backend/.env` local, no versionado: solo claves añadidas).
- **Paso 15 (`services/`):** creados `frontend/src/services/{tokenAcceso,navegacion}.ts` y `authService.test.ts`; modificados `frontend/src/services/{apiClient,apiClient.test,authService}.ts`.
- **Paso 16 (`layout`):** modificados `frontend/src/components/layout/{types.ts,contenedor-rol.tsx}`.
- **Paso 17 (`features/auth`):** modificados `frontend/src/features/auth/{types,data,lib,hooks,lib.test}.ts`.
- **Paso 18 (vistas y rutas):** modificados `frontend/src/features/auth/components/formulario-login.tsx`, `frontend/src/app/{require-sesion,require-rol,router}.tsx`; creados `frontend/src/features/auth/{registro-view,bienvenida-view,acceso-restringido-view}.tsx` y `components/formulario-registro.tsx`.
- **Paso 19 (pruebas del frontend):** modificados `frontend/src/app/router.test.tsx` y `frontend/src/features/auth/login-view.test.tsx`; creado `frontend/src/features/auth/registro-view.test.tsx`.
- **Paso 20:** modificado `README.md`.
- **Paso 21:** creado `docs/trabajo/AUTH-01-autenticacion-basica/resumen-programador.md`.

## Ronda 2 — hallazgos del Tester

Fecha: 2026-09-23. Entrada: `docs/trabajo/AUTH-01-autenticacion-basica/reporte-tester.md` (veredicto ROTO, 10 hallazgos, 15 casos en rojo: 12 del backend y 3 del frontend). No modifiqué, desactivé ni borré ningún `*.ataque.test.ts(x)`. Los 8 archivos tienen fecha de modificación entre 09:56:06 y 10:19:51, anterior a mi primera edición de la ronda (10:30:52 en `shared/src/auth.ts`). El `prettier --write` acotado sobre `backend/test` informó "unchanged" en todos los archivos.

```
Plan: docs/trabajo/AUTH-01-autenticacion-basica/plan.md
Pasos completados: 21 de 21 (más la ronda 2 de corrección)
Archivos creados / modificados en la ronda: 0 creados; 17 modificados (lista abajo). Ninguno borrado
Verificación: lint ok (raíz, 3 workspaces) · test 284 pasan, 0 fallan (backend 220 en 25 archivos; frontend 64 en 10) · build ok (raíz) · prisma validate n/a (sin cambios de esquema)
Hallazgos atendidos: T-01 a T-10 corregidos (T-06 amplía DEC-16: lo decide el Manager)
Desviaciones del plan: T-06 amplía DEC-16; T-01 añade reservarIntento a core; D-01 sigue pendiente, sin tocar
Pendiente o fuera de alcance detectado: ver abajo
```

### Hallazgos uno por uno

- **T-01 (alta) — corregido.**
  - `backend/src/core/auth/intentos.ts` (~l. 37–55): función pura nueva `reservarIntento(fallos, ahora, politica) → { permitido, fallos }`. Comprueba y reserva en un solo paso: el intento cuenta como fallo desde que entra. Si la llave está bloqueada, no se anota, así que el 429 no alarga la ventana.
  - `backend/src/handlers/auth/index.ts` (~l. 56–62 y 113): `reservar(llave, ahora)` se ejecuta **antes de cualquier `await`** (solo le precede lo síncrono: validación, normalización y llave). También poda la llave y cuenta las escrituras para la poda de cada 500.
  - Las tres ramas de `CREDENCIALES_INVALIDAS` (inexistente, inactivo, contraseña incorrecta) dejan en pie el intento reservado (M-07). Un acierto borra la llave (`intentos.delete`, l. 132; DEC-06).
  - Se conservan la ventana de 15 min, `Retry-After: 900` y el 429 comprobado antes de tocar la base.
  - Desaparecieron `fallosVigentes` y `anotarFallo`. `estaBloqueado` y `registrarFallo` siguen en `core` con sus pruebas.
  - Pruebas unitarias nuevas en `intentos.test.ts` (3): reserva hasta el máximo y bloqueo del sexto sin anotarlo; poda y nuevo permiso pasados 15 min; no muta la entrada.
  - Casos del tester: 20 concurrentes → 5 × 401 y 15 × 429; 19 incorrectas + la correcta → la vigésima 429. Estable en 3 corridas del backend.
  - Límite conocido, igual que antes: si la contraseña correcta llega dentro de los 5 primeros de una ráfaga, el acierto borra la llave, también las reservas de las peticiones aún en vuelo. Es la regla "un acierto reinicia el contador" de DEC-06, y quien ya tiene la contraseña no necesita fuerza bruta.
- **T-02 (media) — corregido.**
  - `frontend/src/features/auth/hooks.ts` (~l. 45–75): `useLogin` y `useRegistro` pasan por `consultarMeDeLaCuentaNueva`, que hace `queryClient.removeQueries({ queryKey: ["me"] })` y después `fetchQuery(consultaMe)`.
  - Siempre hay una sola petición a `/me`, fresca, y el destino lo decide la cuenta nueva.
  - Se **elimina** la consulta en lugar de solo invalidarla: si el `/me` nuevo fallara, no quedaría en caché el de la cuenta anterior junto al token nuevo.
- **T-03 (media) — corregido, en dos capas.**
  - (1) `shared/src/auth.ts` (~l. 16–39): `nombreSchema` rechaza `\p{Cc}` (incluido `\u0000`) con `400 VALIDACION` "nombre: El nombre tiene caracteres no permitidos".
  - (2) `backend/src/adapters/db/errores.ts` (~l. 34–58): `traducirErrorPrisma` traduce el SQLSTATE `22021` a `AppError("VALIDACION", "Los datos enviados tienen caracteres no permitidos.", 400)`.
  - Sonda en una transacción revertida (0 residuos): con Prisma 7 + adapter-pg el nulo llega como `PrismaClientKnownRequestError` `P2039` con `meta.driverAdapterError.cause.originalCode: "22021"`.
  - Prueba propia nueva en `test/auth-registro.integracion.test.ts`: `crearUsuario` con un nombre con nulo, dentro de una transacción, responde `{ codigo: "VALIDACION", estado: 400 }` sin dejar filas.
  - `traducirErrorPrisma` solo envuelve `crearUsuario`: es la única escritura con texto del usuario. `agente` viene de `User-Agent`, y el parser HTTP de Node no admite NUL en encabezados.
- **T-04 (baja) — corregido.**
  - `shared/src/auth.ts`: `nombreSchema` también rechaza `\p{Cf}` (U+200B, U+202E y demás marcas de dirección y caracteres de formato invisibles).
  - El mínimo de 2 cuenta solo caracteres visibles (`\p{L}\p{N}\p{P}\p{S}`), así que tres marcas combinantes sueltas no bastan.
  - Siguen aceptados: "José Ángel  Núñez", "O'Connor", "María-José" y el nombre con HTML/SQL del tester.
  - Mensajes: "Escribe tu nombre completo" para el mínimo; "El nombre tiene caracteres no permitidos" para los prohibidos. Los usa también el formulario de registro, que valida con el mismo esquema.
- **T-05 (baja) — corregido.**
  - `backend/src/adapters/auth/tokens.ts` (~l. 40–62): `jwtVerify` con `requiredClaims: ["exp", "iat", "sub"]` y `maxTokenAge: DURACION_TOKEN_ACCESO_S` (jose también rechaza así un `iat` futuro), más una comprobación explícita `exp − iat ≤ 900`. Cualquier fallo → `401 NO_AUTENTICADO`.
  - Prueba propia nueva en `test/tokens-acceso.test.ts`: sin `exp`, sin `iat`, vigencia de un año, vigencia de 16 min e `iat` una hora en el futuro → 401.
- **T-06 (baja) — corregido; amplía DEC-16 (lo decide el Manager).**
  - `backend/src/middleware/guarda-de-rutas.ts` (reescrito, ~l. 7–70): registro `WeakMap` de los pasos que produce `protegido()`, rellenado con `marcarPasoDeLaCadena` en `middleware/index.ts` (~l. 31–52).
  - La guarda exige que los **cinco primeros** `preHandler` sean, **por identidad y en orden**, `authenticate`, `withProfile`, `withPasswordGate`, `withAccess` y `requireRole`, tal como los emitió `protegido()`. Una cadena compuesta a mano o una función ajena con el mismo nombre no pasan. El sexto paso (pertenencia) sigue opcional.
  - Aplica a toda ruta que pueda atender `/api/*`: su URL empieza por `/api`, o su primer segmento es un parámetro (`/:seccion/...`) o un comodín (`*`, `/*`). Las públicas siguen exentas por la misma lista única, y `HEAD` sigue tratándose como su `GET`.
  - Pruebas: las dos del tester, más una propia en `middleware-orden.integracion.test.ts` ("una cadena compuesta a mano con los mismos pasos no pasa la guarda"). Actualicé `middleware/README.md`.
  - **Argumento para el Manager:** DEC-16 fijaba "el primer `preHandler` debe ser `authenticate`". Esto es un superconjunto que cumple mejor la regla 2 ("todo endpoint pasa por la cadena en su orden") y DEC-08 ("ningún handler compone la cadena a mano"). No cambia el comportamiento de ninguna ruta válida (las 6 de AUTH-01 arrancan igual) ni el mensaje de error. Si el Manager prefiere la letra de DEC-16, basta con revertir `guarda-de-rutas.ts` e `index.ts` a la comparación por identidad del primer paso; las dos pruebas del tester volverían a fallar.
- **T-07 (baja) — corregido.**
  - `frontend/src/services/authService.ts` (~l. 50–58): `logout` deja la restauración **cerrada** (`restauracion = Promise.resolve(false)`) en lugar de reiniciarla.
  - Después de salir, ninguna guarda vuelve a pedir `/refrescar`, y si el logout no llegó al servidor la sesión no se reabre sola.
  - Una carga nueva de la aplicación reinicia el módulo, y un login deja un token en memoria, así que no se necesita restaurar.
  - Se mantiene el orden de `useCerrarSesion` (D-05).
  - Prueba propia nueva en `services/authService.test.ts`: tras `logout`, `restaurarSesion()` devuelve `false` y la única llamada a `fetch` fue `/api/auth/logout`.
- **T-08 (baja) — corregido.**
  - `backend/src/config/env.ts` (~l. 47–60): en `production`, `JWT_SECRET.trim()` se compara con el literal de `.env.example`, y la longitud mínima de 32 se mide **sin espacios en blanco** (`replace(/\s/gu, "")`). Un secreto de solo blancos queda rechazado.
  - En todos los entornos se mantiene el `min(32)` sobre el valor crudo. El mensaje no repite el valor.
  - Prueba propia nueva en `env.test.ts`: ejemplo con espacio delante, ejemplo con salto de línea, 40 espacios, y 21 caracteres útiles rodeados de blancos.
- **T-09 (baja) — corregido.**
  - `backend/src/middleware/authenticate.ts` (~l. 13–26): tras validar el JWT, `request.log = request.log.child({ userId })` y `reply.log = request.log` (`reply.log` es el que escribe "request completed").
  - Desde `authenticate` en adelante, cada línea de la petición lleva `requestId` y `userId` (el uuid; nunca el token).
  - El caso del tester con la API real y `LOG_LEVEL=trace` pasa, y el caso de "sin secretos en el log" sigue en verde.
- **T-10 (baja) — corregido.**
  - `backend/test/ayudas-auth.ts` (~l. 227–240): `alterarFirma` cambia el carácter **central** de la firma (A↔B). Ese carácter aporta 6 bits completos a los bytes, así que siempre invalida.
  - Pasan el caso del tester (firma terminada en "A") y `me.integracion` "firma alterada → 401".

### Verificación de la ronda

| Qué | Resultado |
|---|---|
| `npm run lint` desde la raíz | código 0; ESLint, Prettier y `tsc` en `shared`, `backend` y `frontend` |
| `npm test` desde la raíz | código 0. Backend 25 archivos / 220 pruebas: 133 mías (126 + 7 nuevas) + 87 del tester. Frontend 10 archivos / 64: 37 mías (36 + 1) + 27 del tester. **Total 284; las 114 del tester pasan** (backend: `auth-login` 13, `auth-registro` 29, `sesiones-y-cadena` 33, `api-real` 6, `admin-unico` 1, `env` 5; frontend: `router` 12, `apiClient` 15) |
| Estabilidad | backend completo 3 veces, 220/220 cada vez; `FSTDEP=0` |
| `npm run build` desde la raíz | código 0 |
| Residuos en `campus_dev` | 0 filas `@pruebas.local`; `usuarios` = 1 fila (el admin real, sin tocar) |
| Procesos y puertos | 3000 y 5173 libres. Solo quedan los `node.exe` ajenos 3884 y 12228 (no los toqué). No arranqué procesos de larga vida en esta ronda: la API real la levanta y la detiene la prueba del tester |
| Sin tocar | migraciones, esquema, `infra/`, tsconfigs, `vitest.config.ts`, `vite.config.ts`, `.env` (ni leído ni impreso), `AGENTS.md`, `CLAUDE.md`, `docs/` salvo este resumen, y las dependencias (D-01 sigue pendiente) |

### Archivos modificados en la ronda 2

- **`shared/`:** `shared/src/auth.ts`.
- **Backend, código:**
  - `backend/src/core/auth/intentos.ts` e `intentos.test.ts`
  - `backend/src/handlers/auth/index.ts`
  - `backend/src/adapters/db/errores.ts`
  - `backend/src/adapters/auth/tokens.ts`
  - `backend/src/config/env.ts` y `env.test.ts`
  - `backend/src/middleware/{authenticate,guarda-de-rutas,index}.ts` y `README.md`
- **Backend, pruebas:** `backend/test/{ayudas-auth.ts,tokens-acceso.test.ts,auth-registro.integracion.test.ts,middleware-orden.integracion.test.ts}`.
- **Frontend:** `frontend/src/features/auth/hooks.ts`, `frontend/src/services/authService.ts` y `authService.test.ts`.

### Desviaciones de la ronda

- **R2-D1 (T-06):** la guarda exige la cadena completa por identidad y cubre las rutas con primer segmento paramétrico o comodín, más allá de la letra de DEC-16. Argumento arriba; decide el Manager.
- **R2-D2 (T-01):** función pura nueva `reservarIntento` en `core/auth/intentos.ts` (no estaba en la lista de firmas del plan). Mantiene la decisión en `core`, como pide el hallazgo.
- **R2-D3 (T-03):** mensajes nuevos: "El nombre tiene caracteres no permitidos" (esquema) y "Los datos enviados tienen caracteres no permitidos." (adaptador).
- **R2-D4 (T-02):** eliminar la consulta `/me` de la caché (no solo invalidarla) antes de consultar la de la cuenta nueva.
- **R2-D5 (T-07):** la restauración queda cerrada tras `logout` hasta una carga nueva.

### Lo no verificado en la ronda

- Navegador real: cambio de cuenta en `/login` (T-02) y logout con varias pestañas (T-07). Solo hay pruebas con jsdom.
- La guarda de T-06 frente a rutas con expresiones regulares en el primer segmento (`/:id(^\\d+)`): se tratan como paramétricas porque contienen `:`, pero no las probé.
- La traducción de `22021` en escrituras distintas de `crearUsuario` (no hay otra con texto del usuario).

### Pendiente o fuera de alcance

- **D-01** (dos copias de `fastify-plugin` por `@fastify/cookie@11.1.2`): sigue pendiente de decisión del humano; no lo toqué.
- `README.md` §7 dice "19 archivos con 126 pruebas" para el backend. Hoy son 25 / 220, porque incluyen las 87 del tester y 7 mías nuevas. No lo cambié en esta ronda (fuera de los hallazgos); conviene actualizarlo al cerrar el encargo, cuando los conteos sean definitivos.
- Del reporte del tester, para el encargo de despliegue: sin `trustProxy`, la llave del límite de intentos en `prod` sería IP de Caddy + correo, y cualquiera podría bloquear el login de cualquier cuenta con 5 fallos. Y `NODE_ENV` vale `development` por omisión: si el despliegue no fija `production`, no se activan la guarda de DEC-17 ni `Secure`.

## Ronda 3 — hallazgos del Tester

Fecha: 2026-09-23. Entrada: la sección "Reporte del Tester — AUTH-01 — Ronda 2" de `reporte-tester.md`: veredicto ROTO, T-01..T-10 resueltos, 2 hallazgos nuevos de severidad baja y 5 casos en rojo (4 de T-11 y 1 de T-12). No modifiqué ningún `*.ataque.test.ts(x)`. Lo comprobé con el SHA-256 de los 13 archivos antes y después del `prettier --write` acotado: sin diferencias. Los 8 de la ronda 1 conservan los hashes que publicó el tester (`auth-login` b28792465e598a7f, `auth-registro` 7fbb3d4178842758, `sesiones-y-cadena` 7b979360c3773e31, `api-real` 1cd21770bdb4aad9, `admin-unico` dfa214f4ec49a266, `env` 4fce3cedf662ba3a, `apiClient` 10c730348d18ff8d, `router` e58293532633dc5c).

```
Plan: docs/trabajo/AUTH-01-autenticacion-basica/plan.md
Pasos completados: 21 de 21 (más las rondas 2 y 3 de corrección)
Archivos creados / modificados en la ronda: 0 creados; 5 modificados (shared/src/auth.ts, backend/src/middleware/guarda-de-rutas.ts, backend/src/middleware/README.md, backend/test/middleware-orden.integracion.test.ts, README.md)
Verificación: lint ok (raíz, 3 workspaces) · test 351 pasan, 0 fallan (backend 282 en 29 archivos; frontend 69 en 11) · build ok (raíz) · prisma validate n/a
Hallazgos atendidos: T-11 corregido, T-12 corregido (amplía DEC-16: lo decide el Manager)
Desviaciones del plan: T-12 amplía DEC-16, igual que T-06
Pendiente o fuera de alcance detectado: D-01 sin decidir; observaciones del tester para encargos siguientes
```

### Hallazgos

- **T-11 (baja) — corregido.**
  - `shared/src/auth.ts` (~l. 24–36): `contarVisibles` ya no cuenta los caracteres que Unicode clasifica como letra o símbolo pero se ven vacíos. Son los `\p{Default_Ignorable_Code_Point}`, que incluyen los rellenos Hangul U+115F, U+1160, U+3164 y U+FFA0 y los selectores de variante, más el Braille en blanco U+2800.
  - Un nombre hecho solo de ellos no llega al mínimo de 2 y responde `400 VALIDACION` "nombre: Escribe tu nombre completo".
  - No los prohíbo: los ignorables también aparecen en emojis con selector de variante, que el tester observó aceptados y no exige rechazar. Un nombre con letras reales más uno de estos caracteres sigue siendo válido.
  - El conteo se hace carácter por carácter, sin el flag `v` de las expresiones regulares, porque el `target` ES2022 de `tsconfig.base.json` no lo admite.
  - Siguen aceptados los 16 nombres legítimos del tester (acentos, ñ, diéresis, apóstrofos recto y tipográfico, guion, NFD, CJK, coreano, árabe, devanagari, espacio duro) y el nombre con HTML de la ronda 1.
  - Después de Prettier, el `⠀` de la expresión regular había quedado como el carácter literal invisible en el código fuente. Lo devolví a la secuencia de escape y verifiqué que en los archivos que edité no hay caracteres invisibles.
- **T-12 (baja) — corregido; amplía DEC-16 (lo decide el Manager).**
  - `backend/src/middleware/guarda-de-rutas.ts` (~l. 38–53 y 60–90): la nueva `motivoDeRechazo` rechaza al arrancar una ruta no pública que pueda atender `/api/*` si no pasa por la cadena completa (como antes) **o** si declara hooks de ruta que Fastify ejecuta antes que `preHandler`: `onRequest`, `preParsing` y `preValidation`.
  - Mensaje: `La ruta <METODO> <url> declara <hooks>, que se ejecuta antes de protegido() (AGENTS.md, regla 2)`. El de la cadena incompleta no cambia.
  - Se permiten los hooks posteriores (`preSerialization`, `onSend`, `onResponse`): corren después de la cadena y del handler. Las rutas públicas de la lista quedan exentas, igual que antes.
  - Ninguna ruta actual cambia: las 6 de AUTH-01 no declaran hooks de ruta, y la guarda solo mira hooks **de ruta**. Los hooks de plugin o globales (por ejemplo, el `onRequest` con que `@fastify/cookie` lee las cookies) no aparecen en `onRoute` y siguen funcionando.
  - Pruebas: el caso del tester (`onRequest` que responde) y uno propio en `middleware-orden.integracion.test.ts` con `preValidation`. Actualicé `middleware/README.md`.
  - **Argumento para el Manager:** esto completa lo que ya se amplió en T-06 (DEC-16 → cadena completa por identidad). Un hook de ruta anterior a `preHandler` puede responder sin que corra la cadena, así que admitirlo contradice la regla 2 ("todo endpoint pasa por la cadena en su orden"). El criterio es estático, falla al arrancar y no toca rutas válidas.
  - **Límite declarado:** un hook `onRequest` añadido con `addHook` dentro de un plugin **sí** corre antes de la cadena, y `onRoute` no lo ve. Detectarlo exigiría inspeccionar el contexto interno de Fastify, y hay usos legítimos (el de `@fastify/cookie`). Queda cubierto por la regla de revisión: ningún handler escribe verificaciones de permisos ni responde desde hooks propios.
  - Si el Manager prefiere la letra de DEC-16 para T-06 y T-12, basta con revertir `guarda-de-rutas.ts` e `index.ts` de `middleware/`; las pruebas del tester correspondientes volverían a fallar.

### Verificación de la ronda

| Qué | Resultado |
|---|---|
| `npm run lint` desde la raíz | código 0 en los tres workspaces |
| `npm test` desde la raíz | código 0. Backend 29 archivos / 282 pruebas: 134 mías (133 + 1 nueva) y 148 del tester (87 de la ronda 1 + 61 de la ronda 2). Frontend 11 archivos / 69: 37 mías y 32 del tester (27 + 5). **Total 351; las 180 del tester pasan**, incluidas las 5 que estaban en rojo |
| Estabilidad | backend 3 corridas, 282/282 cada una; `FSTDEP=0` |
| `npm run build` desde la raíz | código 0 |
| Residuos | 0 filas `@pruebas.local`; `usuarios` = 1 fila (el admin real, sin tocar) |
| Procesos y puertos | no arranqué procesos de larga vida. 3000 y 5173 libres; solo siguen los `node.exe` ajenos 3884 y 12228 |
| `README.md` §7 | conteos actualizados: backend 29 archivos / 282 pruebas (148 adversarias); frontend 11 / 69 (32 adversarias); duración de 15 a 25 s |

### Desviaciones de la ronda

- **R3-D1 (T-12):** la guarda rechaza hooks de ruta anteriores a `preHandler` en rutas protegidas bajo `/api`. Amplía DEC-16, como R2-D1; decide el Manager.
- **R3-D2 (T-11):** los caracteres ignorables y el U+2800 no se prohíben; solo dejan de contar para el mínimo visible.

### Lo no verificado

- Hooks `onRequest` a nivel de plugin, fuera del alcance de `onRoute` (límite declarado arriba).
- Otros caracteres "vacíos" fuera de las categorías tratadas (por ejemplo, U+3000 y los demás `\p{Zs}`, que `trim` recorta y no cuentan como visibles). No encontré otro caso que Unicode clasifique como letra o símbolo y no sea ignorable por defecto aparte del U+2800.

### Observaciones del tester (ronda 2) que no cambian código

Las anoto para el Manager y para los encargos siguientes. No las atendí porque no son hallazgos:
- el límite de intentos funciona como *fail-closed* ante errores de la base;
- el almacén de intentos no tiene tope de memoria (depende del límite de tasa de despliegue, S-14);
- prefijos mal escritos (`//api`, `/API`);
- `marcarPasoDeLaCadena` está exportada;
- el encargo de CORS tendrá que añadir `OPTIONS *` a `rutas-publicas.ts`;
- `nombreSchema` rechaza tabuladores y saltos de línea internos, y U+200C/U+200D;
- al cambiar de identidad convendría vaciar toda la caché cuando haya consultas por usuario;
- la restauración queda cerrada tras salir hasta recargar.

## Cierre — mini-ronda autorizada

Fecha: 2026-09-24. Ronda 4 única, autorizada por el humano fuera del máximo (`aprobacion.md`, "Decisiones del humano tras la revisión final"). Entradas:
- `revision.md`, "Revisión del Manager — AUTH-01 — final": M-12, M-14 y M-17;
- `reporte-tester.md`, "Cierre (M-13)": arneses corregidos por el tester y hashes publicados.

Al empezar solo fallaba 1 prueba: T-13, en `backend/test/nombres-guarda-r3.ataque.test.ts`.

```
Plan: docs/trabajo/AUTH-01-autenticacion-basica/plan.md
Pasos completados: 21 de 21, más las rondas 2, 3 y esta mini-ronda de cierre
Archivos creados / modificados en la mini-ronda: 0 creados; 3 modificados (shared/src/auth.ts, backend/src/middleware/README.md, README.md), más este anexo
Verificación: lint ok · build ok · test 395 pasan, 0 fallan (backend 326 en 30 archivos; frontend 69 en 11); las 224 del tester pasan · prisma validate n/a
Hallazgos atendidos: T-13 / M-12 corregido; M-14 corregido; M-17 corregido
Desviaciones del plan: ninguna
Pendiente o fuera de alcance detectado: lo que el Manager y el humano ya asignaron a CHORE-01, DEPLOY y DOCS-02
```

### Los tres cambios

1. **T-13 / M-12** (`shared/src/auth.ts`, ~l. 27–33).
   - U+1D159 (MUSICAL SYMBOL NULL NOTEHEAD) se suma a los caracteres que se ven vacíos y no cuentan como visibles, con el mismo criterio que T-11: no se prohíbe, solo no cuenta para el mínimo.
   - Está escrito como secuencia de escape dentro de la clase de la expresión regular, junto a la del Braille en blanco.
   - El comentario declara la limitación aceptada: otros caracteres cuya apariencia vacía depende de la fuente no están en la lista, y si alguno llega a un nombre, el admin lo corrige.
   - **Cómo evité el literal:** la herramienta de edición convierte las secuencias de escape Unicode en el carácter real; así se había colado el U+2800 literal en la ronda 3. Por eso el cambio lo hizo un script de Node que arma la barra invertida con `String.fromCharCode(92)`.
   - Tras `npx prettier --write src/auth.ts` (desde `shared/`, sin cambios), comprobé que la línea conserva las dos secuencias de escape y que el archivo tiene 0 caracteres invisibles literales.
   - Los nombres legítimos del tester siguen aceptados (sus casos de "acepta" pasan).
2. **M-14** (`backend/src/middleware/README.md`, sección de la guarda). Tres subsecciones breves:
   - **"Ampliación de DEC-16 (aceptada por el humano; T-06 y T-12)":** los cinco pasos de `protegido()` en orden y por identidad; las rutas con primer segmento paramétrico o comodín; ningún hook de ruta anterior a `preHandler`.
   - **"Límite: hooks de plugin":** los hooks `onRequest`, `preParsing`, `preValidation` o `preHandler` añadidos con `addHook` dentro de un plugin corren antes de `protegido()` y la guarda no los ve; quedan a la revisión de código.
   - **"Orden de los plugins transversales":** la guarda depende del orden de registro. En despliegue y CORS, `@fastify/rate-limit` se registra con `hook: "preHandler"` y hay que añadir `OPTIONS *` a `rutas-publicas.ts`; al registrarlos se comprueba que la API arranca y que las rutas protegidas siguen respondiendo 401 sin token.

   El archivo no está en `.prettierignore` (solo lo están los `.md` de la raíz), así que el lint lo revisa. No lo formateé: lo escribí a mano y lo comprobé con `npx prettier --check` → "All matched files use Prettier code style!".
3. **M-17** (`README.md`, "Backend en local" §7, una sola frase): backend "30 archivos con 326 pruebas … adversarias (`*.ataque.test.ts`, 192 de ellas)". La frase del frontend ya decía 11 archivos, 69 pruebas y 32 adversarias, y sigue siendo correcta. Números sacados de corridas reales, después del cambio de T-13.

### Verificación

| Qué | Resultado |
|---|---|
| `npm run lint` desde la raíz | código 0 en los tres workspaces (ESLint, Prettier `--check`, `tsc`) |
| `npm run build` desde la raíz | código 0 |
| `npm test` desde la raíz | código 0. Backend 30 archivos / 326 pruebas: 134 del Programador y 192 del tester (11 archivos). Frontend 11 archivos / 69: 37 del Programador y 32 del tester (3 archivos). **Total 395; las 224 del tester pasan**, T-13 incluida. Conteos contados por archivo con el reporter `verbose` |
| Suite del backend, 3 corridas | 1.ª (dentro del `npm test` de la raíz), 2.ª y 3.ª (`npm test` en `backend/`): 30/30 archivos y 326/326 pruebas cada vez; `FSTDEP=0` en las tres |
| Integridad de las pruebas del tester | SHA-256 de los 14 archivos, **antes** de cualquier cambio y **al final**: idénticos a los publicados en "Cierre (M-13)" de `reporte-tester.md` (entre ellos `api-real` d9553a09…, `logs-r2` 5af3909e… y `nombres-guarda-r3` 97b8d6f6…). `diff` sin diferencias en las dos comparaciones |
| Alcance | Foto del SHA-256 de todo lo modificado o nuevo del árbol de trabajo al empezar, comparada al terminar: cambiaron exactamente `shared/src/auth.ts`, `backend/src/middleware/README.md` y `README.md` (más este anexo, escrito después de la comparación) |
| Residuos | 0 filas `@pruebas.local`; `usuarios` = 1 fila (el admin real, sin tocar) |
| Procesos y puertos | no arranqué procesos de larga vida. 3000 y 5173 libres; solo siguen los `node.exe` ajenos 6760 y 15016 (runtime de Codex) |
| Sin tocar | migraciones, esquema, dependencias (D-01 aceptada como opción (a)), `infra/`, tsconfigs, `.env` (ni leído ni impreso), `AGENTS.md`, `CLAUDE.md`, `.claude/`, pruebas del tester y del Programador |

### Lo no verificado

- La nota de orden de M-14 (`@fastify/rate-limit` con `hook: "preHandler"`, `OPTIONS *` de `@fastify/cors`) se documentó como requisito para esos encargos, sin probarla aquí: ninguno de los dos plugins está instalado en AUTH-01. La URL exacta con que `@fastify/cors` registra su ruta `OPTIONS` se confirmará al instalarlo.
- Otros caracteres cuya apariencia vacía depende de la fuente, fuera de la lista (limitación aceptada, declarada en el comentario).
- Lo pendiente de rondas anteriores sigue igual: navegador real (360 px, foco, `navigator.locks`), `reset:admin` sin admin, y la transacción de `migrate dev` (R-10).

### Nota sobre este mismo resumen

En la sección "Ronda 3" (línea 459), donde dice que la secuencia de escape del Braille en blanco se había vuelto un carácter literal, la herramienta hizo lo mismo con el texto del resumen: entre las comillas invertidas quedó el carácter U+2800 literal, que se ve como un espacio. No lo corregí porque esta mini-ronda solo autoriza añadir el anexo a este archivo. Es solo del documento; el código está limpio (0 caracteres invisibles literales en `shared/src/auth.ts`).
