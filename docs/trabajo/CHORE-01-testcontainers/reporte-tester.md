> Registrado por el orquestador el 2026-09-24: el entorno impidió al `tester` crear este archivo ("Subagents should return findings as text, not write report files"). El texto de abajo es su entrega, transcrita sin cambios.

# Reporte del Tester — CHORE-01 — Ajuste M-02
Fecha: 2026-09-24. Alcance: solo M-02 de `revision.md` y la decisión 2 del humano en `aprobacion.md`: "hacer robusta la prueba de tiempos sin debilitar su aserción". Es la excepción autorizada, no una ronda de ataque.
- Cambié solo el caso "el tiempo de respuesta no distingue un correo inexistente de una contraseña incorrecta" de `backend/test/auth-login.ataque.test.ts`.
- No toqué código de producción, pruebas del Programador ni mis otros 13 archivos.
- Las tres pruebas con `if (!admin) return` siguen como estaban.

Resultado: **20 de 20** corridas del archivo y **3 de 3** de la suite completa del backend (330/330), todas en verde.

## Entorno
Comprobado antes y después de las corridas:
- **Red y firewall:** la red `uacam5 2` está en categoría Pública. La regla `Campus: bloquear entrada a Docker en redes publicas` existe y está habilitada (entrada, bloqueo, perfil Público) antes, durante y al final. La red no cambió.
- **Contenedores de infra:** publican solo en `127.0.0.1`.
- **Ryuk** (el contenedor de limpieza de Testcontainers): al terminar las 20 corridas seguía vivo, publicado en `0.0.0.0:32770`. Es el riesgo residual M-01, que cubre la regla del firewall, y se eliminó solo a los pocos segundos. Tras las 3 corridas de la suite quedaban 0 contenedores con la etiqueta `org.testcontainers`.
- **`campus_dev`:** no se tocó. Quedan 0 filas `@pruebas.local` y la guarda sigue activa.
- **Procesos:** solo los `node.exe` 6760 y 15016, que son ajenos; no los toqué.

## Qué cambié
Solo la forma de tomar las muestras; la aserción y la tolerancia no cambian.

| | Antes | Ahora |
|---|---|---|
| Calentamiento | 1 petición | Una vuelta completa de 6 rondas (18 peticiones), descartada. Calienta argon2, el JIT y la conexión a la base en las tres ramas |
| Muestras por rama | 9 | **24** |
| Orden dentro de la ronda | Siempre incorrecta → inexistente → inactivo | Rota por las **6 permutaciones**: cada rama ocupa cada posición 8 veces |
| Estadístico | Mediana de cada rama | **El mismo**: la misma función `mediana` |
| Aserción | `\|mediana(inexistente) − mediana(incorrecta)\| < max(20 ms, 35 % de mediana(incorrecta))`, y lo mismo para `inactivo` | **Idéntica**, línea por línea |
| Aserciones extra | Estado 401 en cada petición | Se mantiene. Se añade `expect(tiempos.incorrecta).toHaveLength(24)`, que garantiza el tamaño de la muestra |
| Salida | Medianas solo si falla | Anotación de Vitest (`annotate`) con la mediana, el p25 y el p75 de cada rama, también en las corridas en verde |
| Timeout del caso | 60 s | 120 s. Son 90 peticiones; bajo la carga de la suite tardaron unos 4–5 s. Es margen, no una aserción |

## Por qué no debilita la aserción
- **Mismo umbral, misma afirmación:** las medianas de las tres ramas no se separan más de `max(20 ms, 35 %)`. No agrandé la tolerancia, no cambié de estadístico, no añadí reintentos ni otras vías de pasar, y no quité ninguna comprobación.
- **Más muestras hacen la prueba más estricta, no más laxa.** Con 24 muestras, la mediana de cada rama varía menos que con 9. Una diferencia real y sistemática sigue superando la tolerancia en cada corrida; por ejemplo, saltarse argon2 cuando el correo no existe, que cuesta unos 30–50 ms. Lo único que baja es la probabilidad de que el ruido la supere sin una diferencia real.
- **La rotación del orden elimina un sesgo de medición.** Antes, "incorrecta" iba siempre primero en la ronda, y el ruido periódico de los otros archivos en paralelo podía cargar siempre esa posición. En el fallo del Manager la rama afectada fue justo esa: `incorrecta=91.4` frente a `inexistente=60.5` e `inactivo=54.9`. Con las 6 permutaciones, las tres ramas reciben por igual el ruido de cada posición.
- **El calentamiento solo quita el arranque en frío,** y recorre las tres ramas, así que no favorece a ninguna.

## Corridas

### 20 corridas seguidas del archivo (`npx vitest run test/auth-login.ataque.test.ts --reporter=verbose`)
Las 20 salieron en verde, 13/13 casos cada una. Medianas en ms (n = 24 por rama), con [p25, p75] entre corchetes:

| # | incorrecta | inexistente | inactivo |
|---|---|---|---|
| 1 | 35.7 [34.5, 36.2] | 35.7 [34.6, 36.7] | 36.0 [34.3, 36.4] |
| 2 | 36.4 [35.6, 36.9] | 36.2 [34.6, 37.0] | 35.6 [33.8, 35.9] |
| 3 | 35.7 [33.8, 36.7] | 35.8 [34.3, 36.7] | 35.5 [33.7, 36.4] |
| 4 | 35.5 [34.4, 36.7] | 36.0 [35.2, 36.9] | 36.0 [33.8, 36.5] |
| 5 | 36.1 [34.1, 36.6] | 36.3 [32.6, 37.9] | 36.4 [33.7, 36.9] |
| 6 | 35.9 [33.7, 36.3] | 36.2 [35.6, 36.9] | 35.5 [33.7, 36.1] |
| 7 | 36.0 [33.8, 36.6] | 36.4 [34.2, 36.9] | 35.5 [34.0, 36.7] |
| 8 | 36.2 [34.5, 36.7] | 35.9 [34.0, 37.3] | 36.1 [35.5, 36.7] |
| 9 | 35.6 [33.7, 36.5] | 36.2 [34.9, 36.7] | 35.2 [34.6, 36.0] |
| 10 | 35.7 [34.7, 36.5] | 36.0 [34.0, 37.3] | 35.8 [35.2, 37.8] |
| 11 | 35.8 [34.6, 36.4] | 35.5 [34.0, 36.4] | 35.9 [34.2, 36.3] |
| 12 | 36.3 [33.9, 37.6] | 35.5 [34.7, 36.3] | 35.9 [33.8, 36.8] |
| 13 | 31.8 [26.6, 35.9] | 35.1 [26.8, 37.2] | 33.5 [25.9, 36.3] |
| 14 | 36.7 [34.8, 37.8] | 36.3 [35.1, 37.1] | 36.2 [34.5, 36.9] |
| 15 | 35.2 [33.1, 36.4] | 36.3 [35.1, 37.0] | 36.1 [33.5, 36.6] |
| 16 | 35.4 [34.1, 36.3] | 35.3 [33.8, 36.2] | 36.2 [34.7, 37.1] |
| 17 | 35.8 [35.2, 36.1] | 35.9 [34.0, 36.6] | 34.6 [32.7, 36.3] |
| 18 | 35.9 [34.0, 36.3] | 35.3 [33.9, 35.9] | 35.0 [33.5, 36.1] |
| 19 | 35.6 [34.1, 36.4] | 35.7 [34.6, 35.9] | 35.2 [31.8, 36.3] |
| 20 | 35.3 [32.9, 36.2] | 36.1 [33.9, 36.3] | 35.8 [34.2, 36.4] |

- Rango de medianas: incorrecta 31.8–36.7, inexistente 35.1–36.4, inactivo 33.5–36.4.
- Mayor diferencia contra "incorrecta": **3.3 ms** en inexistente y **1.7 ms** en inactivo, ambas en la corrida 13. La tolerancia fue de 20.0 ms en todas.

### 3 corridas de la suite completa del backend
Comando: `npm test -- --reporter=verbose` desde `backend/`, con 31 archivos en paralelo y PostgreSQL de Testcontainers.

| # | Resultado | incorrecta | inexistente | inactivo |
|---|---|---|---|---|
| 1 | código 0 · 31/31 archivos · **330/330** | 46.2 [36.9, 49.5] | 46.2 [36.3, 47.5] | 45.0 [38.3, 49.6] |
| 2 | código 0 · 31/31 · **330/330** | 44.7 [36.0, 46.1] | 44.9 [35.8, 46.5] | 43.7 [34.1, 46.5] |
| 3 | código 0 · 31/31 · **330/330** | 47.1 [41.9, 50.6] | 47.5 [44.4, 50.8] | 47.2 [42.5, 51.8] |

- Bajo carga, la mayor diferencia contra "incorrecta" fue de **0.4 ms** en inexistente y **1.2 ms** en inactivo. La tolerancia fue de 20.0 ms.
- Las medianas suben unos 10 ms por la carga, igual en las tres ramas.

### Otras comprobaciones
- `npx vitest run test/auth-login.ataque.test.ts --expect.requireAssertions`: código 0, 13/13. Todas las pruebas del archivo ejecutan al menos una aserción, y el caso cambiado no tiene `return` temprano.
- `npm run lint` en `backend/` (ESLint, Prettier `--check` y `tsc`): código 0.
- `tsc` estricto de `src/` y `test/` con un `tsconfig` del scratchpad: código 0.
- Prettier y ESLint corrieron solo sobre este archivo, por ruta desde `backend/`.

## Hashes (SHA-256)
Cambió solo `backend/test/auth-login.ataque.test.ts`:
- Antes, en "Cierre (M-13)": `b28792465e598a7ffbd223f541e136dd7b7a86cafc6c478865f33656a0334a48`
- **Ahora: `2c83d82d10bdd9b7a969768774d75b18b7a71a594bbaac5fae36a0e134d2336c`**

Los otros 13 coinciden byte a byte con la tabla de "Cierre (M-13)" en `docs/trabajo/AUTH-01-autenticacion-basica/reporte-tester.md`. Lo comparé con `diff`, y solo difiere la línea de `auth-login`:

| Archivo | SHA-256 |
|---|---|
| `backend/test/auth-registro.ataque.test.ts` | `7fbb3d41788427586b62b026ad91bbf33ce338fb9bd4dbe7acd54be19d4d5710` |
| `backend/test/sesiones-y-cadena.ataque.test.ts` | `7b979360c3773e316a641a7521795ffe7f99d9e625dc18ab3992868cfb8db249` |
| `backend/test/api-real.ataque.test.ts` | `d9553a09f5a52fb27fdddf77c4d28e3d9d3af34797436a7b02bdb7c2eb08cc17` |
| `backend/test/admin-unico.ataque.test.ts` | `dfa214f4ec49a2662b0e6069b45bac162f9bb5f5f1ec5262511919c3b530f6c1` |
| `backend/src/config/env.ataque.test.ts` | `4fce3cedf662ba3a188f21a2277db417747d342c115efd4746d3cff58499289b` |
| `frontend/src/services/apiClient.ataque.test.ts` | `10c730348d18ff8dae7b3623751d31122aa58560b564ad191717fa1938a6f8ce` |
| `frontend/src/app/router.ataque.test.tsx` | `e58293532633dc5cfe21561e2609d170638c81886b9c31129f03864c73a34f45` |
| `backend/test/intentos-r2.ataque.test.ts` | `a8b79d5ad98270be3747f493865708a78bb73add08d832584db4464c3582777a` |
| `backend/test/guarda-r2.ataque.test.ts` | `ea078f41cc98c947d9b3966ee8eccec2bd5d06eacbaf7ee8cd85f38e6a697c15` |
| `backend/test/nombres-tokens-r2.ataque.test.ts` | `00a6eb6f7ccd7d8790c356befcc96ddfda6eacce0be53de255cfe3626d8f2adb` |
| `backend/test/logs-r2.ataque.test.ts` | `5af3909e4b7ca485e78979567872ea78bf41e6d679b9ec2c761eaa0b250df689` |
| `frontend/src/app/sesion-r2.ataque.test.tsx` | `06f35be8ae68f0abae775268e4e64f3df880ff137a9b54aa3c135941ddb93dcf` |
| `backend/test/nombres-guarda-r3.ataque.test.ts` | `97b8d6f6c6b26b9b651eb0b46a48ed27b594a8ef659937eb600fde793f07e873` |
