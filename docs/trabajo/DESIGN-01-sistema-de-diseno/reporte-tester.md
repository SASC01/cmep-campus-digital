# Reporte del Tester — DESIGN-01 · sistema de diseño D3

> **Nota de transcripción (orquestador, 2026-09-27).** El entorno impidió que el tester escribiera este archivo ("Subagents should return findings as text, not write report files"). El orquestador lo transcribe tal cual desde la respuesta final del tester, igual que en encargos anteriores (`docs/ESTADO.md` §4).
>
> Antes de transcribir, el orquestador comprobó por su cuenta:
> - Los SHA-256 de r2, r3 y r4 coinciden con la tabla.
> - `sha256sum -c` de las 32 da 32/32 OK, y hay exactamente 32 `*.ataque`.
> - `git status` solo muestra los 3 archivos de ataque y `aprobacion.md`.
> - El diff de `frontend/` solo contiene el auxiliar `fichaDe` y las 2 líneas sustituidas por una en cada archivo.
> - No quedan coincidencias de `rounded` en las `*.ataque`, y r4 conserva sus 4 `it.fails(`.
> - Desde `frontend/`: `npm run test` sale con código 0 (25 archivos, `254 passed | 4 expected fail (258)`) y `npm run lint`, con código 0.

## DESIGN-01a — Ronda 0 (confirmación de T-14 y selectores de la ficha)

Veredicto de la ronda 0: **COMPLETADA**. No se cumplió ninguna condición de parada.
Verificación propia: lint código 0 · test 25 archivos, 258 pruebas (254 en verde, 4 fallos esperados).

Procedimiento: `plan.md`, §D-8, "Ronda 0", pasos 1 a 9. Todo se ejecutó desde `frontend/`, salvo los hashes (desde la raíz). Las salidas se redirigieron a archivos del scratchpad, sin tubería. No abrí navegadores ni corrí `npm run dev`. Git, solo de lectura. No leí ningún `.env`. No toqué código de producción ni otras pruebas. No dejé ningún proceso en marcha.

Base: `HEAD` = `5a32230` (el `<A>` de `aprobacion.md`).

### Paso 1 · Precondición

    git diff --quiet 6868e4d -- .      → código 0
    git status --porcelain -- .        → vacío

### Paso 2 · Hashes contra la tabla vigente de AUTH-02

`sha256sum -c` desde la raíz sobre las 32 rutas de la tabla "Aplicación de la opción B a T-14" de `docs/trabajo/AUTH-02-cuentas-y-correo/reporte-tester.md` → **32/32 OK**, con código 0. Esas 32 rutas incluyen las 11 de `frontend/`. `find` encuentra exactamente 32 `*.ataque`.

`frontend/src/features/admin/cuentas-r4.ataque.test.tsx` = `97b5c0796860736d9fb8d32b96de1feb97ecc074af74fa70d8b4a51ec001ee1a`, que es el valor esperado.

### Paso 3 · Cambio temporal

- Copié `cuentas-r4.ataque.test.tsx` al scratchpad. La copia tiene el hash `97b5c079…`.
- Con `sed`, cambié solo `^  it\.fails($` por `  it(`, sin formatear. Afectó las líneas 208, 232, 256 y 284.
- `git diff --stat`: 4 inserciones y 4 eliminaciones.
- El archivo tiene finales de línea LF: 0 `\r`.

### Paso 4 · Corrida

`npm run test -- src/features/admin/cuentas-r4.ataque.test.tsx`. El `pretest` construyó `shared/`.

     ❯ src/features/admin/cuentas-r4.ataque.test.tsx (13 tests | 4 failed)
         × la temporal que llega mientras escribe en 'Nombre completo' no le roba el foco
         × la temporal que llega mientras escribe en 'Correo correcto' de la misma ficha no le roba el foco
         × un 500 que llega mientras escribe en 'Nombre completo' no le lleva el foco a 'Cancelar'
         × 'Cancelar' con la petición en vuelo, clic fuera y a escribir en 'Nombre completo': la temporal no le roba el foco
          Tests  4 failed | 9 passed (13)

### Paso 5 · Dónde falla cada una

Las 4 fallan en su `expect(document.activeElement, …)` final, con `AssertionError … // Object.is equality`. Ninguna falla en la preparación (`emularCorreccionDelFocoDeChromium`, `escribirEn`, `clicEnZonaNoEnfocable` ni `findByText`).

| # | Prueba (línea del nombre) | `expect` final (líneas) | Línea de la falla | Mensaje |
|---|---|---|---|---|
| 1 | 209 | 224-227 | `cuentas-r4.ataque.test.tsx:227:9` (`).toBe(nombreMaestro)`) | `el admin escribía en "Nombre completo" y la temporal le llevó el foco a button "Copiar"` |
| 2 | 233 | 248-251 | `:251:9` (`).toBe(correo)`) | `el admin escribía en "Correo correcto" y la temporal le llevó el foco a button "Copiar"` |
| 3 | 257 | 272-275 | `:275:9` (`).toBe(nombreMaestro)`) | `el admin escribía en "Nombre completo" y el error le llevó el foco a button "Cancelar"` |
| 4 | 285 | 302-305 | `:305:9` (`).toBe(nombreMaestro)`) | `el admin escribía en "Nombre completo" y la temporal le llevó el foco a button "Copiar"` |

- Vitest señala la línea del `.toBe(…)` con que cierra la cadena de cada `expect` final. Esa línea es la última del `expect`.
- Los 4 mensajes coinciden, palabra por palabra, con los que espera el plan.
- En los 4 casos, el elemento recibido es el `<button>` "Copiar" o "Cancelar" de la ficha, y el esperado es el `<input>` del campo en que escribía el admin (`id="nombre-maestro"` o `id="correo-corregir"`).

### Paso 6 · Restauración

Copié `cuentas-r4.ataque.test.tsx` desde la copia del scratchpad.

    sha256sum src/features/admin/cuentas-r4.ataque.test.tsx
      → 97b5c0796860736d9fb8d32b96de1feb97ecc074af74fa70d8b4a51ec001ee1a
    git diff --quiet -- src/features/admin/cuentas-r4.ataque.test.tsx   → código 0
    git status --porcelain -- .                                         → vacío
    npm run test -- src/features/admin/cuentas-r4.ataque.test.tsx      → código 0
          Tests  9 passed | 4 expected fail (13)

### Paso 7 · Selectores de la ficha

En cada archivo agregué el auxiliar `fichaDe` con el texto literal del plan, justo antes de `afterEach`:
- en r2, después de `pulsarEnter`;
- en r3, después de `describirFoco`;
- en r4, después de `resolverCon`.

También sustituí las dos líneas que localizaban la ficha por `const ficha = fichaDe(X.nombre)`: `carla` en r2 y `beto` en r3 y r4.

`npx prettier --write` sobre las 3 rutas, desde `frontend/`: código 0, con los 3 archivos `(unchanged)`. Siguen en LF (0 `\r`).

Las 4 `it.fails(` de r4 siguen en su sitio (`grep -c` → 4). No cambió ninguna aserción ni ningún nombre de prueba.

### Paso 8 · Verificación

**Mismo elemento que antes, sin clases.**
- Guardé copias de los 3 archivos ya modificados.
- Agregué, de forma temporal, una línea después de cada `const ficha = fichaDe(X.nombre)`: `expect(ficha).toBe(screen.getByText(X.nombre).parentElement?.parentElement)`. Quedaron en r2:304, r3:463 y r4:475.
- Corrí los 3 archivos con `--reporter=verbose`: código 0, `Tests 39 passed | 4 expected fail (43)`. Las 3 pruebas de la ficha, en verde:

      ✓ cuentas-r2 … > la temporal ya visible sigue en la ficha de Carla al corregir su correo, y con el correo nuevo
      ✓ cuentas-r3 … > tras la temporal de Carla (con el foco en 'Copiar'), la ficha de Beto no la muestra y su confirmación enfoca su propio 'Cancelar'
      ✓ cuentas-r4 … > con <StrictMode>: buscar a Beto con la confirmación abierta en Carla no mueve el foco del buscador, y su confirmación enfoca su 'Cancelar'

- Retiré las líneas temporales copiando desde las copias. `sha256sum -c` de los 3 archivos → OK. `grep -c 'parentElement?.parentElement'` → 0 en los 3.

**Diff y estado.** El diff (completo abajo) solo muestra, en cada archivo, el auxiliar agregado y las dos líneas sustituidas por una.

    git status --porcelain -- .
     M frontend/src/features/admin/cuentas-r2.ataque.test.tsx
     M frontend/src/features/admin/cuentas-r3.ataque.test.tsx
     M frontend/src/features/admin/cuentas-r4.ataque.test.tsx

`--untracked-files=all` da la misma salida: no hay archivos sin rastrear en `frontend/`.

**`rounded` en `src/**/*.ataque.test.*`:** 0 coincidencias.

**`npm run test` desde `frontend/`:** código 0.

     Test Files  25 passed (25)
          Tests  254 passed | 4 expected fail (258)

`cuentas-r4.ataque.test.tsx`, corrido solo: `Tests 9 passed | 4 expected fail (13)`.

**`npm run lint` desde `frontend/`:** código 0. Pasan ESLint, `prettier --check` ("All matched files use Prettier code style!") y `tsc -b`.

### Diff de los 3 archivos (contra `HEAD` = `5a32230`, que en `frontend/` es igual a `6868e4d`)

    diff --git a/frontend/src/features/admin/cuentas-r2.ataque.test.tsx b/frontend/src/features/admin/cuentas-r2.ataque.test.tsx
    index e53f3ce..15d62e4 100644
    --- a/frontend/src/features/admin/cuentas-r2.ataque.test.tsx
    +++ b/frontend/src/features/admin/cuentas-r2.ataque.test.tsx
    @@ -125,6 +125,19 @@ const pulsarEnter = () => {
       fireEvent.click(conFoco)
     }
     
    +// La ficha de una cuenta: el ancestro común más cercano de su nombre y del formulario
    +// "Guardar correo". Sin clases de estilo (tester.md, "Reglas de combate").
    +const fichaDe = (nombre: string): HTMLElement => {
    +  const formularioCorreo = screen.getByRole("form", { name: "Guardar correo" })
    +  let nodo: HTMLElement | null = screen.getByText(nombre).parentElement
    +  while (nodo && !nodo.contains(formularioCorreo)) nodo = nodo.parentElement
    +  if (!nodo) throw new Error("no se encontró el contenedor de la ficha")
    +  if (nodo.contains(screen.getByRole("form", { name: "Buscar" }))) {
    +    throw new Error("el contenedor encontrado incluye el buscador: no es la ficha")
    +  }
    +  return nodo
    +}
    +
     afterEach(() => {
       vi.unstubAllGlobals()
       Reflect.deleteProperty(window.navigator, "clipboard")
    @@ -287,8 +300,7 @@ describe("ataque (AUTH-02b r2): sin estados cruzados entre cuentas", () => {
         corregirCorreo(CORREO_CORREGIDO)
         await screen.findByText(CORREO_CORREGIDO)
     
    -    const ficha = screen.getByText(carla.nombre).closest("div.rounded-lg")
    -    if (!(ficha instanceof HTMLElement)) throw new Error("no se encontró el contenedor de la ficha")
    +    const ficha = fichaDe(carla.nombre)
         expect(within(ficha).getByText(TEMPORAL)).toBeVisible()
         expect(within(ficha).queryByText(carla.email)).not.toBeInTheDocument()
       })
    diff --git a/frontend/src/features/admin/cuentas-r3.ataque.test.tsx b/frontend/src/features/admin/cuentas-r3.ataque.test.tsx
    index c06dd91..859f8ea 100644
    --- a/frontend/src/features/admin/cuentas-r3.ataque.test.tsx
    +++ b/frontend/src/features/admin/cuentas-r3.ataque.test.tsx
    @@ -158,6 +158,19 @@ const describirFoco = () => {
       return `${conFoco.tagName.toLowerCase()} "${conFoco.textContent || conFoco.getAttribute("aria-label") || conFoco.id}"`
     }
     
    +// La ficha de una cuenta: el ancestro común más cercano de su nombre y del formulario
    +// "Guardar correo". Sin clases de estilo (tester.md, "Reglas de combate").
    +const fichaDe = (nombre: string): HTMLElement => {
    +  const formularioCorreo = screen.getByRole("form", { name: "Guardar correo" })
    +  let nodo: HTMLElement | null = screen.getByText(nombre).parentElement
    +  while (nodo && !nodo.contains(formularioCorreo)) nodo = nodo.parentElement
    +  if (!nodo) throw new Error("no se encontró el contenedor de la ficha")
    +  if (nodo.contains(screen.getByRole("form", { name: "Buscar" }))) {
    +    throw new Error("el contenedor encontrado incluye el buscador: no es la ficha")
    +  }
    +  return nodo
    +}
    +
     afterEach(() => {
       vi.unstubAllGlobals()
       vi.restoreAllMocks()
    @@ -446,8 +459,7 @@ describe("ataque (AUTH-02b r3): sin fugas de estado entre cuentas", () => {
         expect(screen.queryByRole("button", { name: "Copiar" })).not.toBeInTheDocument()
         expect(document.activeElement).toBe(campoBuscar())
     
    -    const ficha = screen.getByText(beto.nombre).closest("div.rounded-lg")
    -    if (!(ficha instanceof HTMLElement)) throw new Error("no se encontró el contenedor de la ficha")
    +    const ficha = fichaDe(beto.nombre)
         fireEvent.click(within(ficha).getByRole("button", { name: "Restablecer contraseña" }))
         expect(document.activeElement).toBe(within(ficha).getByRole("button", { name: "Cancelar" }))
         expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(1)
    diff --git a/frontend/src/features/admin/cuentas-r4.ataque.test.tsx b/frontend/src/features/admin/cuentas-r4.ataque.test.tsx
    index 4b07bf8..4a6a9a7 100644
    --- a/frontend/src/features/admin/cuentas-r4.ataque.test.tsx
    +++ b/frontend/src/features/admin/cuentas-r4.ataque.test.tsx
    @@ -192,6 +192,19 @@ const resolverCon = async (pendiente: ReturnType<typeof diferida>, respuesta: Re
       })
     }
     
    +// La ficha de una cuenta: el ancestro común más cercano de su nombre y del formulario
    +// "Guardar correo". Sin clases de estilo (tester.md, "Reglas de combate").
    +const fichaDe = (nombre: string): HTMLElement => {
    +  const formularioCorreo = screen.getByRole("form", { name: "Guardar correo" })
    +  let nodo: HTMLElement | null = screen.getByText(nombre).parentElement
    +  while (nodo && !nodo.contains(formularioCorreo)) nodo = nodo.parentElement
    +  if (!nodo) throw new Error("no se encontró el contenedor de la ficha")
    +  if (nodo.contains(screen.getByRole("form", { name: "Buscar" }))) {
    +    throw new Error("el contenedor encontrado incluye el buscador: no es la ficha")
    +  }
    +  return nodo
    +}
    +
     afterEach(() => {
       vi.unstubAllGlobals()
       vi.restoreAllMocks()
    @@ -458,8 +471,7 @@ describe("ataque (AUTH-02b r4): confirmandoAnteriorRef con <StrictMode>, remonta
         expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(campoBuscar())
         expect(screen.queryByRole("button", { name: "Sí, restablecer" })).not.toBeInTheDocument()
     
    -    const ficha = screen.getByText(beto.nombre).closest("div.rounded-lg")
    -    if (!(ficha instanceof HTMLElement)) throw new Error("no se encontró el contenedor de la ficha")
    +    const ficha = fichaDe(beto.nombre)
         fireEvent.click(within(ficha).getByRole("button", { name: "Restablecer contraseña" }))
         expect(document.activeElement).toBe(within(ficha).getByRole("button", { name: "Cancelar" }))
       })

### Números de línea nuevos (r2, r3 y r4)

El auxiliar ocupa 13 líneas y se inserta antes de `afterEach`. Las líneas anteriores al auxiliar no se mueven. Las que están entre el auxiliar y la sustitución se desplazan +13, y las que siguen a la sustitución, +12.

| Referencia | Línea en `6868e4d` | Línea nueva |
|---|---|---|
| **r3** · `emularCorreccionDelFocoDeChromium`: `await waitFor(() => expect(control).toBeDisabled())` | 144 | **144** (sin cambio) |
| r3 · `controlesEnfocables` | 121 | 121 (sin cambio) |
| r3 · auxiliar `fichaDe` | — | 163 |
| r3 · `toBeEnabled` (Tareas de la ronda 1, N-01): `await waitFor(() => expect(boton("Sí, restablecer")).toBeEnabled())` | 393 | **406** |
| r3 · prueba de la ficha "tras la temporal de Carla (con el foco en 'Copiar')…" | 432 | 445 |
| r3 · `const ficha = fichaDe(beto.nombre)` | 449-450 | 462 |
| r3 · Rojo previsto 1: "el admin confirma y no se mueve: al llegar la temporal, el foco llega a 'Copiar'" | 459 | **471** |
| r3 · Rojo previsto 2: "el admin confirma y el servidor responde 500: el foco no queda en <body>" | 483 | **495** |
| **r4** · `emularCorreccionDelFocoDeChromium`: `await waitFor(() => expect(control).toBeDisabled())` | 144 | **144** (sin cambio) |
| r4 · `controlesEnfocables` | 125 | 125 (sin cambio) |
| r4 · auxiliar `fichaDe` | — | 197 |
| r4 · `it.fails` 1.ª ("…'Nombre completo' no le roba el foco"); `expect` final | 208; 224-227 | **221**; 237-240 |
| r4 · `it.fails` 2.ª ("…'Correo correcto'…"); `expect` final | 232; 248-251 | **245**; 261-264 |
| r4 · `it.fails` 3.ª ("un 500…"); `expect` final | 256; 272-275 | **269**; 285-288 |
| r4 · `it.fails` 4.ª, Rojo previsto 6 ("'Cancelar' con la petición en vuelo, clic fuera…"); `expect` final | 284; 302-305 | **297**; 315-318 |
| r4 · Rojo previsto 3: "en Chromium: 500, el foco vuelve a 'Cancelar'…" | 346 | **359** |
| r4 · `toBeEnabled` (Tareas de la ronda 1, N-01): `await waitFor(() => expect(boton("Sí, restablecer")).toBeEnabled())` | 359 | **372** |
| r4 · Rojo previsto 4: "en Chromium: tras la corrección, el admin vuelve a 'Cancelar'…" | 376 | **389** |
| r4 · Rojo previsto 5: "con <StrictMode> y en Chromium: el admin confirma y no se mueve…" | 434 | **447** |
| r4 · prueba de la ficha "con <StrictMode>: buscar a Beto con la confirmación abierta en Carla…" | 449 | 462 |
| r4 · `const ficha = fichaDe(beto.nombre)` | 461-462 | 474 |
| r2 · auxiliar `fichaDe` | — | 130 |
| r2 · prueba de la ficha "la temporal ya visible sigue en la ficha de Carla…" | 279 | 292 |
| r2 · `const ficha = fichaDe(carla.nombre)` | 290-291 | 303 |

Las `toBeEnabled` de `cuentas-r1.ataque` (337 y 354) no cambian: ese archivo no se tocó.

### Tabla de hashes vigente (SHA-256) de las 32 `*.ataque`

Esta tabla es la base de V-01 para el programador. Sustituye a la de AUTH-02. `sha256sum -c` desde la raíz da 32/32 OK, y `find` encuentra exactamente 32 `*.ataque`.

| Archivo | SHA-256 | Estado |
|---|---|---|
| `backend/test/auth-login.ataque.test.ts` | `2c83d82d10bdd9b7a969768774d75b18b7a71a594bbaac5fae36a0e134d2336c` | sin cambios |
| `backend/test/auth-registro.ataque.test.ts` | `73d3a2ae708a0ef676547a8094115b1419423057378387269bc3eadb34c7724e` | sin cambios |
| `backend/test/sesiones-y-cadena.ataque.test.ts` | `6e4b4677d73bde3d7c7845c729637186249e704f2aa803fb5efa25e76126b445` | sin cambios |
| `backend/test/api-real.ataque.test.ts` | `441a766a94e7d9b26807790402e06ed94d4cc378d8f6ecf0bccc3259c7ff55fb` | sin cambios |
| `backend/test/admin-unico.ataque.test.ts` | `388ad0e585639b8c3e0e0a6657fb42c1b9cb83db721c4863c4fa19e0be42ec85` | sin cambios |
| `backend/src/config/env.ataque.test.ts` | `4fce3cedf662ba3a188f21a2277db417747d342c115efd4746d3cff58499289b` | sin cambios |
| `frontend/src/services/apiClient.ataque.test.ts` | `10c730348d18ff8dae7b3623751d31122aa58560b564ad191717fa1938a6f8ce` | sin cambios |
| `frontend/src/app/router.ataque.test.tsx` | `e58293532633dc5cfe21561e2609d170638c81886b9c31129f03864c73a34f45` | sin cambios |
| `backend/test/intentos-r2.ataque.test.ts` | `a8b79d5ad98270be3747f493865708a78bb73add08d832584db4464c3582777a` | sin cambios |
| `backend/test/guarda-r2.ataque.test.ts` | `ea078f41cc98c947d9b3966ee8eccec2bd5d06eacbaf7ee8cd85f38e6a697c15` | sin cambios |
| `backend/test/nombres-tokens-r2.ataque.test.ts` | `00a6eb6f7ccd7d8790c356befcc96ddfda6eacce0be53de255cfe3626d8f2adb` | sin cambios |
| `backend/test/logs-r2.ataque.test.ts` | `5af3909e4b7ca485e78979567872ea78bf41e6d679b9ec2c761eaa0b250df689` | sin cambios |
| `frontend/src/app/sesion-r2.ataque.test.tsx` | `06f35be8ae68f0abae775268e4e64f3df880ff137a9b54aa3c135941ddb93dcf` | sin cambios |
| `backend/test/nombres-guarda-r3.ataque.test.ts` | `97b8d6f6c6b26b9b651eb0b46a48ed27b594a8ef659937eb600fde793f07e873` | sin cambios |
| `backend/test/cuentas-r1.ataque.test.ts` | `994a38f476d55f0b8826dc4b80e07dfb013f9034c7f7aee3cdc29dd74338b793` | sin cambios |
| `backend/test/worker-r1.ataque.test.ts` | `f4ea0bd908d8ec538aa479f9b09bf6fc6f86df6f93bb7abaaccd7001de876395` | sin cambios |
| `backend/test/logs-cuentas-r1.ataque.test.ts` | `a47af988453adcbc0e7ca710e670b5e2b9906e995ae6aa71e43fa8555764014c` | sin cambios |
| `backend/test/arquitectura-cuentas-r1.ataque.test.ts` | `42bb7bf3086230c6edc65ab73976ac8a801956336561aadbee65cc3b40eb8612` | sin cambios |
| `backend/test/arranque-r1.ataque.test.ts` | `aae65c95cf34db814d650af5f7fa08d09bff3e6fc6863d4252383058499aa10e` | sin cambios |
| `backend/src/config/logger.ataque.test.ts` | `43f1754c8c33f7de285ab77dbabb0f493422e858529432c9b2be26ff9423b01b` | sin cambios |
| `backend/src/config/correo.ataque.test.ts` | `bcce2cae771f97957d8691bef7fff4ec42412daaeabf726aeb0afc59f6f25671` | sin cambios |
| `backend/test/cuentas-r2.ataque.test.ts` | `736ae5fc909b5f53b6768010047378324e808c5bbe0434c0b0d140b58d0e598b` | sin cambios |
| `backend/test/worker-r2.ataque.test.ts` | `64aa76974c7ae3e89b2f1ed3d7efc7864d4323310932a9f46f02c798c363a6d2` | sin cambios |
| `backend/test/cuentas-r3.ataque.test.ts` | `a352625e291810251f41f53c3da37de82b662a20a82a66127f4d210ba6041b34` | sin cambios |
| `frontend/src/features/auth/enlace-r1.ataque.test.tsx` | `2584bd412e2d70e22a97cefeeb6278597d2e67ddf55f749bc739411ba432590a` | sin cambios |
| `frontend/src/app/cuentas-r1.ataque.test.tsx` | `a66120ed3c04a5c02dc64b33ad008be420739fa24eb67ac42d546429e74d7a4a` | sin cambios |
| `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` | `fc4b41d188dde4b48daf6fe5a52efc7862678d81931ad9e09546807e34afaf3a` | sin cambios |
| `frontend/src/features/auth/enlace-r2.ataque.test.tsx` | `5fda63b653dbc0db6b1d16c3f26506f5fae630fdfd4a9921a9ef5db98e39d438` | sin cambios |
| `frontend/src/app/cuentas-r2.ataque.test.tsx` | `b61346baf0c3789fdc15eea548623afb4bf3dc8c230f1944df4336de3a27f9eb` | sin cambios |
| `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` | `b948e9359fd3981e08b850540027f536f345a3f48d7c0749ba0c16c2c1df1184` | modificado en la ronda 0: auxiliar `fichaDe` y localizador de la ficha |
| `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` | `e6cd491eeced3663e92f52700bed5055d0a0138cdf59cd2f4f7898610302961a` | modificado en la ronda 0: auxiliar `fichaDe` y localizador de la ficha |
| `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` | `c92552c339db27dfd3d5315b67426dea9f6c32ab9e65e392da7dfcaa7cab2d86` | modificado en la ronda 0: auxiliar `fichaDe` y localizador de la ficha (las 4 `it.fails` siguen) |

Conteos: hay 32 `*.ataque`, 29 sin cambios y 3 modificadas. El frontend tiene 25 archivos y 258 pruebas: 254 en verde y 4 fallos esperados. No corrí el backend: `backend/` no cambió y sus 21 hashes coinciden.

Nota: la tabla de AUTH-02 anota 257 pruebas en el frontend, pero la línea base de `6868e4d` que cita el plan es 258, y eso es lo que obtuve. Con el `frontend/` idéntico a `6868e4d` (paso 1), la suite ya contaba 258 antes de mis cambios, y los cambios de la ronda 0 no agregan ni quitan pruebas. No investigué de dónde viene la diferencia con AUTH-02.

### Estado al terminar

    git status --porcelain --untracked-files=all   (desde la raíz)
     M docs/trabajo/DESIGN-01-sistema-de-diseno/aprobacion.md        ← ya estaba así al empezar; no lo toqué
     M frontend/src/features/admin/cuentas-r2.ataque.test.tsx
     M frontend/src/features/admin/cuentas-r3.ataque.test.tsx
     M frontend/src/features/admin/cuentas-r4.ataque.test.tsx

Con el reporte ya transcrito, aparecerá además `?? docs/trabajo/DESIGN-01-sistema-de-diseno/reporte-tester.md`.

---

## DESIGN-01a — Ronda 1

# Reporte del Tester — DESIGN-01a · sistema de diseño D3 — Ronda 1
Veredicto: **RESISTE** en el código. Hay un hallazgo, T-01 (baja), que es de registro y no del programador: la lista de bajas de `"peer": true` que aceptó el humano en `aprobacion.md` no coincide con el diff real de `package-lock.json`. Lo decide el humano antes del commit.
Verificación propia (desde `frontend/`, tras mis cambios): lint código 0 (ESLint, `prettier --check` y `tsc -b`) · test código 0, **37 archivos, 494 pruebas, 494 en verde**, sin fallos esperados · build código 0.

Antes de tocar nada reproduje el estado del orquestador: `npm run test` código 1, `6 failed | 402 passed | 3 expected fail (411)`, con exactamente los 6 rojos previstos; V-01 32/32 OK contra la tabla de la ronda 0.

Procedimiento: todo desde `frontend/`, salvo hashes, V-08 y `package-lock.json` (desde la raíz). Salidas redirigidas al scratchpad. Sin navegadores ni `npm run dev`. Git solo de lectura. No leí ningún `.env`. Solo escribí `*.ataque.test.*` y este reporte. Formateé solo mis rutas con `npx prettier --write <ruta>` desde `frontend/`.

**Incidente propio, ya resuelto.** En un comando de sondeo escribí por error `cat > /tmp/x`, que se quedó esperando la entrada estándar. Terminé ese proceso (PID 1133, lo arranqué yo) y borré el `/tmp/x` vacío que creó. No toqué nada más fuera del scratchpad.

### Estado de los 6 rojos previstos, tras la ronda 1

Los 6 pasan en verde, en su línea nueva.

| # | Archivo y línea actual | Prueba | Antes | Ahora |
|---|---|---|---|---|
| 1 | `cuentas-r3.ataque.test.tsx:468` | "el admin confirma y no se mueve: al llegar la temporal, el foco llega a 'Copiar'" | rojo en la preparación (`toBeDisabled`) | verde |
| 2 | `cuentas-r3.ataque.test.tsx:492` | "el admin confirma y el servidor responde 500: el foco no queda en <body>" | ídem | verde |
| 3 | `cuentas-r4.ataque.test.tsx:346` | "en Chromium: 500, el foco vuelve a 'Cancelar', Shift+Tab y Enter reintentan…" | ídem | verde |
| 4 | `cuentas-r4.ataque.test.tsx:378` | "en Chromium: tras la corrección, el admin vuelve a 'Cancelar' con Tab…" | ídem | verde |
| 5 | `cuentas-r4.ataque.test.tsx:436` | "con <StrictMode> y en Chromium: el admin confirma y no se mueve…" | ídem | verde |
| 6 | `cuentas-r4.ataque.test.tsx:287` | "'Cancelar' con la petición en vuelo, clic fuera y a escribir en 'Nombre completo'…" | `it.fails` que ya pasaba | `it`, verde |

Las otras 3 `it.fails` de T-14 (r4:220, 241 y 262) también pasan como `it`, y ahora fallarían en su `expect(document.activeElement, …)` final si T-14 volviera.

## Hallazgos

### T-01 — La lista de bajas de `"peer": true` aceptada en `aprobacion.md` no es la del diff real
Severidad: baja (de registro; no hay trabajo para el programador)
Prueba: no se puede automatizar con Vitest sin leer git. Reproducción, desde la raíz:
1. `git show 6868e4d:package-lock.json > <scratchpad>/lock-base.json`.
2. Compara `packages` de los dos JSON entrada por entrada. Una entrada cuenta como "baja de peer" si, quitando la clave `peer`, es idéntica, y si antes valía `true` y ahora no existe. Usé un script de Node en el scratchpad; no se guardó en el repositorio.
3. `git diff 6868e4d -- package-lock.json | grep -c '^-.*"peer": true'` → **19**.

Esperado: la decisión del humano (`aprobacion.md`, "Parada de V-08…") acepta **18** bajas con nombre: `@babel/core`, `@electric-sql/pglite`, `@testing-library/dom`, `@types/react`, `@types/react-dom`, `@typescript-eslint/parser`, `abstract-logging`, `acorn`, `eslint`, `keyv`, `perfect-debounce`, `pg`, `prisma`, `react`, `react-dom`, `typescript`, `vite` y `zod`. Dice también: "Cualquier otra diferencia en ese archivo sigue siendo parada".

Obtenido: son **19** bajas, y el conjunto es otro:
- Tres bajas que **no están** en la lista aceptada: `@csstools/css-parser-algorithms`, `@csstools/css-tokenizer` y `browserslist`.
- Dos nombres de la lista que **no cambiaron**: `abstract-logging` y `perfect-debounce` (sin `peer` antes ni ahora).
- Lo demás coincide con E-2:
  - la sección `frontend` solo agrega las 3 dependencias `@fontsource/*` en `^5.3.0`;
  - las 3 entradas nuevas `node_modules/@fontsource/*` están en 5.3.0, con licencia OFL-1.1;
  - no cambia ningún `version`, `resolved` ni `integrity` ajeno;
  - no hay cambios en la raíz del JSON fuera de `packages`.

Lo más probable es un error al transcribir: una lectura del diff de texto que atribuyó cada `"peer": true` quitado al paquete del encabezado del bloque siguiente. El resumen del programador sí menciona `browserslist`. La naturaleza de las 3 bajas no listadas es idéntica a la de las aceptadas. Pero la regla literal de V-08 las marca como parada, y no me corresponde darlas por buenas.
Requisito o regla violada: V-08 y E-2 del plan, y la decisión del humano registrada en `aprobacion.md`. Acción sugerida al orquestador: pedirle al humano que confirme la lista corregida de 19 y anotarla en `aprobacion.md`.

## Tareas obligatorias de la ronda 1 (§D-8) y justificación de cada cambio a una `*.ataque` existente

Solo cambié `cuentas-r1`, `cuentas-r3` y `cuentas-r4`. `cuentas-r2` queda byte a byte como en la ronda 0 (hash `b948e935…`). Ninguna aserción final se debilitó ni se borró. Ningún localizador usa clases de estilo. Diff contra la ronda 0 (las copias están en el scratchpad) y justificación de cada cambio:

**1. `emularCorreccionDelFocoDeChromium` (r3:137-148 y r4:141-152) pasa a comprobar F-1.**
- **Antes:** esperaba `toBeDisabled()`, quitaba y ponía `disabled` y exigía el foco en `<body>`.
- **Ahora:** `waitFor(aria-disabled="true")`, `aria-busy="true"`, `not.toBeDisabled()`, `not.toHaveAttribute("disabled")` y el foco en el botón.
- **Por qué:** es la preparación que manda §D-8. Con `enEspera`, Chromium ya no le aplica la corrección del foco al botón, así que el `<body>` de la preparación ya no representa ningún navegador.
- **No debilita nada, y lo endurece:** las aserciones finales de las 7 pruebas que la usan no cambian. Además, la preparación pasa a exigir F-1 en cada una.
- **El camino "foco en `<body>`" sigue cubierto:** r4:287 con `clicEnZonaNoEnfocable`, más 5 pruebas nuevas en `foco-r1.ataque.test.tsx` (clic fuera y otro campo, con éxito y con error, y clic fuera sin ir a otro campo). Se conserva el nombre de la función para no mover las 7 llamadas; el comentario explica el cambio.
- **Import:** `act` sigue en uso en los dos archivos.

**2. Las 4 `it.fails` de r4 (ahora 220, 241, 262 y 287) pasan a `it`.**
- El comentario "Riesgo aceptado… pasa al encargo del sistema de diseño" cambia a "T-14: riesgo aceptado el 2026-09-26; corregido en DESIGN-01a (§D-6), sin it.fails (ronda 1)".
- Prettier reindentó el cuerpo de las 4 (la forma `it("…", async () => {`). Con `diff -w`, el cambio se reduce a la línea `it(`, al cierre `})` y al comentario.
- Ni los nombres ni las aserciones cambian.

**3. N-01, refuerzo de las `toBeEnabled()`.** Las líneas que publicó la ronda 0 son correctas: r1:337, r1:354, r3:406 y r4:372.
- **Qué agregué:** debajo de cada una, sin quitarla, una aserción con un comentario de una línea:
  - r1: `expect(<"Copiar">).not.toHaveAttribute("aria-disabled")`, síncrona como la original, en r1:338-339 y 357-358;
  - r3 y r4: `await waitFor(() => expect(boton("Sí, restablecer")).not.toHaveAttribute("aria-disabled"))`, con `waitFor` como la original, en r3:401-403 y r4:359-361.
- **Por qué:** `toBeEnabled()` pasa siempre con `aria-disabled`, así que dejó de comprobar que el botón salió de la espera.

**Hashes antes y después (solo los 3 modificados):**

| Archivo | Ronda 0 | Ronda 1 |
|---|---|---|
| `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` | `fc4b41d1…` | `86adaa9a…` |
| `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` | `e6cd491e…` | `72bf9af4…` |
| `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` | `c92552c3…` | `942df301…` |

Los tres siguen en LF (0 `\r`).

## Atacado sin hallazgos

**`enEspera` en los 13 botones (punto 2).** Van en `features/admin/en-espera-r1.ataque.test.tsx` (10 pruebas) y `app/en-espera-r1.ataque.test.tsx` (12 pruebas, con el router completo).
- **Botones cubiertos:** "Buscar", "Enviar invitación", "Guardar correo", "Sí, restablecer", "Copiar" (con `writeText` lento), "Iniciar sesión", "Crear cuenta", "Enviar enlace", "Guardar contraseña", "Activar mi cuenta", "Guardar y continuar", y "Cerrar sesión" en el marco de `/estudiante`, en el de `/admin`, en `/cambiar-contrasena` y en `/acceso-restringido`.
- **Con la petición en vuelo, en todos:**
  - `aria-disabled` y `aria-busy` en `"true"`, sin `disabled`;
  - el mismo nombre accesible;
  - el foco conservado;
  - `tabIndex ≥ 0`.
- **Activaciones repetidas:** tres clics (emulan Enter y Espacio), `fireEvent.submit` y `form.requestSubmit()`. Todo eso da **una sola petición**.
- **Al asentarse, con error:** salen de la espera (sin `aria-disabled`, `aria-busy` ni `data-en-espera`) y conservan el foco.
- **Con éxito:** donde el botón sigue en pantalla, sale de la espera; "Cerrar sesión" termina en `/login` con un solo `logout`.
- **Doble clic en el mismo instante** (sin tarea ni repintado entre los dos), en "Iniciar sesión" y "Crear cuenta": una sola petición en jsdom. El plan lo daba por "igual que hoy" (§D-5); lo dejo como prueba de regresión.
- **"Sí, restablecer" en éxito:** aparece una sola temporal.

**T-14 y el contrato F-1 a F-4 (punto 3).** Van en `features/admin/foco-r1.ataque.test.tsx` (12 pruebas), y todas resisten:
- clic en una zona no enfocable y después a "Nombre completo" (éxito) o a "Correo correcto" (500): el foco no se mueve;
- clic fuera sin ir a otro campo: la temporal lleva el foco a "Copiar", y un 500 lo lleva a "Cancelar" (F-2 y F-3 con `<body>`);
- salir a "Correo correcto" y volver a "Sí, restablecer" antes de la respuesta: el foco va a "Copiar";
- salir a "Buscar" y quedarse ahí: el foco no se mueve;
- cambio de ventana (`blur` y `focus` de `window`, con `activeElement` conservado): el foco va a "Copiar";
- "Cancelar" en vuelo y a escribir en el buscador: la temporal no roba el foco;
- "Cancelar" en vuelo, reabrir y llega un 500: el foco va a "Cancelar" y el reintento funciona, con 2 peticiones en total;
- un 500 mientras escribe en otro campo, vuelta y reintento: el foco va a "Copiar";
- con `<StrictMode>`, el camino por `<body>` y el foco al montar, abrir y cancelar (F-4).

Buscar otra cuenta en vuelo sigue cubierto por r3:290 y r3:311: la temporal perdida no empeoró.

**Regresión (punto 4).**
- Las 32 `*.ataque` de la ronda 0 están en verde.
- Doble envío: `router.ataque` ("Crear cuenta"), `app/cuentas-r1`, `enlace-r1`, `features/admin/cuentas-r1` y `cuentas-r2`, todos en verde.
- Las 3 pruebas de la ficha (`fichaDe`), en verde.

**Anulación y materiales (punto 5).** Las búsquedas V-02 a V-07 y V-13, hechas por mi cuenta, dan 0 o solo lo permitido. Además, `styles/clases-r1.ataque.test.ts` (11 pruebas) las deja como guarda de regresión, leyendo el código con `import.meta.glob`:
- sin paleta por defecto ni `dark:`;
- sin escalas anuladas ni `backdrop-blur`;
- sin colores sueltos ni valores arbitrarios;
- sin fondos translúcidos hechos a mano;
- `outline-none` solo en `DialogContent`;
- ningún `disabled` en JSX, y 13 `enEspera=`;
- `vidrio` solo en `Card`, `vidrio-fuerte` solo en las variantes del botón y `vidrio-azul` en ningún componente;
- texto rojo solo en `ErrorDeCampo`, `MensajeError`, el icono de `sonner` y los 2 iconos `aria-hidden` de acceso restringido;
- el `Toaster` solo en `app/providers.tsx`.

**Clases coladas que no generan CSS (R-02).**
- Cargué el sistema de diseño real de Tailwind 4.3.3 (`__unstable__loadDesignSystem` con `index.css`, `tokens.css` y `tw-animate-css`, desde un script del scratchpad).
- Pasé por `candidatesToCss` cada palabra de cada cadena de `src/` (sin pruebas): 535 candidatos, 180 con CSS.
- Entre los 355 sin CSS **no hay ninguna clase**: solo módulos, ids, textos y nombres de variante.
- En `dist/`, además:
  - `.vidrio-fuerte` va antes que las reglas `:where([data-material=opaco]) .in-data-…:border-2` y `…:border-input` (misma especificidad; gana la variante opaca);
  - `in-data-[material=opaco]:hover:bg-muted` va después de `hover:bg-surface`;
  - `@media (width>=48rem){[data-densidad=densa]{--control-height:2.25rem}}`;
  - `@supports not ((-webkit-backdrop-filter:blur(1px)) or (backdrop-filter:blur(1px)))` con el respaldo sólido;
  - no hay ningún `--color-*` de la paleta por defecto.

**Contexto opaco y densidad (punto 6).** En `app/contexto-r1.ataque.test.tsx` (12 pruebas):
- En `/admin`, cada botón, campo, enlace y encabezado cuelga de `[data-material="opaco"]` y `[data-densidad="densa"]`, y hay un solo contenedor marcado.
- Tras cerrar sesión desde `/admin`, `/login` no conserva el contexto.
- `/login`, `/registro`, `/recuperar`, `/restablecer`, `/establecer-contrasena`, `/cambiar-contrasena`, `/acceso-restringido`, `/estudiante`, `/maestro` y `/diagnostico` no tienen ninguno de los dos atributos.

**`cn` y `tailwind-merge` (punto 7).** Probé 36 combinaciones con la configuración real de `lib/utils.ts`, y todas son correctas:
- la escala propia contra colores: `text-small` con `text-destructive`, `text-h1` con `text-link`;
- tamaños entre sí: `text-small` con `text-caption` o con `lg:text-body`, y `font-heading text-h3` con `text-body lg:text-h3`;
- radios y sombras: `rounded-panel` con `rounded-pill` o `rounded-full`, `shadow-overlay` con `shadow-none` o con colores;
- familias y pesos: `font-heading` con `font-bold` (se conservan las dos) y con `font-mono`;
- alturas: `h-(--control-height)` con `h-9`.

**Tokens y contraste (punto 8).** En `styles/tokens-r1.ataque.test.ts` (19 pruebas):
- **Contra `docs/DESIGN.md`**, leído con `?raw` del propio documento, no copiado del plan:
  - más de 25 colores de las tablas de §3, con `var()` resuelto;
  - materiales, filtros, borde, brillo y sombra del vidrio;
  - los 7 radios de §5;
  - la escala de §4: tamaño, interlineado, interletraje y peso de los títulos;
  - `--shadow-overlay` y las familias;
  - el signo menos ASCII en `tokens.css` y en la tabla.
- **Contraste de pares sólidos que usa el código:** `--muted-foreground` y `--foreground` sobre `--muted` (la temporal); `--success` y `--warning` sobre `--surface` en `/admin`; `--destructive` sobre `--surface` y sobre `--danger-soft`; `--muted-foreground` sobre `--background`; `--ring` sobre `--muted` (foco de "Copiar"); `--input` sobre `--surface`; y blanco sobre el `hover` al 90 % de `primary` y `destructive`. Todos pasan su umbral.

**`ErrorDeCampo`.** En `app/errores-r1.ataque.test.tsx` (7 pruebas), envié vacíos los formularios de `/login`, `/registro`, `/recuperar`, `/restablecer`, `/cambiar-contrasena` y los de "Enviar invitación" y "Buscar" en `/admin`. En cada uno:
- cada campo con `aria-invalid="true"` apunta con `aria-describedby` a su `…-error`;
- tiene ese mensaje como descripción accesible (el icono `aria-hidden` no entra);
- el mensaje es un nodo de texto del propio `<p>`, que lleva el icono;
- no sale ninguna petición a la API más allá de la sesión.

**Fuentes en `dist/` (V-09).**
- Hay 6 `.woff2` y 6 `.woff`, todos `latin`, ninguno `latin-ext`.
- No hay ninguna referencia a `fonts.googleapis` ni a `fonts.gstatic`.

**V-08 ("No se toca"), por mi cuenta:**
- Base `6868e4d`: limpias todas las rutas de `frontend/` de la lista, incluidos `services/`, las guardas de `app/`, los `hooks.ts`, `types.ts` y `data.ts` de `features/`, `layout-publico.tsx`, `format.ts` y `.env.example` (`.env` está ignorado y no lo leí).
- Las únicas pruebas normales modificadas son las 3 permitidas.
- `frontend/package.json` solo agrega las 3 líneas de E-1, y `vitest.config.ts` es exactamente E-3.
- Base `5a32230`: limpios `backend/`, `shared/`, `infra/`, `.claude/`, `.codex/`, `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/ARCHITECTURE*.md`, `docs/PRD.md`, `docs/design/`, los 7 archivos de la raíz, `docs/trabajo/` fuera de esta carpeta, `plan.md`, `plan-direccion-c.md` y `revision-direccion-c.md`.
- El diff de `docs/DESIGN.md` solo toca las secciones de E-5.
- `package-lock.json`: ver T-01.

**Invariantes de DOM (R-08):**
- `enlace-r1:483` (un solo `heading` "CMEP Campus Digital") y `cuentas-r1:381` y `:407` (icono y primer `div` de la ficha) siguen en verde;
- `fichaDe` sigue encontrando la ficha en r2, r3 y r4.

**Otras comprobaciones:**
- Los textos de los 6 enlaces con `whitespace-nowrap` miden 32 caracteres como máximo, así que caben en el ancho útil de la tarjeta a 360 px. El humano los juzga en H-10.
- La minúscula de los hexadecimales de `tokens.css` (el plan pedía mayúsculas) la impone Prettier: `printf ':root {--a: #ABCDEF;}' | npx prettier --parser css` da `#abcdef`, y `lint` exige Prettier. No es un hallazgo.

## Observaciones para el manager (sin prueba en rojo; no las cuento como hallazgos)
- **O-1 · Los portales salen del contexto opaco.**
  - **Qué pasa:** `Dialog` se pinta en un portal a `<body>`, fuera de `ContenedorRol`.
  - **Consecuencia:** un `Button` `outline` dentro de un diálogo abierto en `/admin` tendría `vidrio-fuerte` con `backdrop-filter` y 44 px de alto en escritorio. El contenido del diálogo sí es opaco (`bg-surface`).
  - **Por qué no es hallazgo:** hoy ningún consumidor usa `Dialog`. Pero §7.9 pide las confirmaciones del admin en un diálogo, así que aparecerá con la primera tabla del admin.
- **O-2 · Marca de §6 adelantada.** `DESIGN.md` §6 marca el anillo interior de los botones rellenos como "propuesta, confirmada por el humano". El humano lo aceptó al planear (S-07), pero lo confirma en H-04; la marca se adelanta a la comprobación.
- **O-3 · Clases residuales en el CSS de `dist/`.** Contiene `.outline{…}` y `.backdrop-filter{…}`: Tailwind los genera porque las palabras "outline" y "backdrop-filter" aparecen en el código fuente (nombres de variante y comentarios). No las aplica ningún elemento, así que no tienen efecto.
- **O-4 · `tailwind-merge` y el interlineado.** `cn("leading-tight", "text-small")` descarta `leading-tight` (regla de `tailwind-merge`), aunque en Tailwind 4 el interlineado sí se conservaría. Hoy ningún `cn` combina los dos en ese orden: `ContenedorRol` los usa en una cadena fija.
- **O-5 · V-06 contradice al propio plan.** Leída literalmente ("`aria-busy` y `aria-disabled` solo en `button.tsx`"), choca con la variante `aria-busy:cursor-progress` que el plan pide en `button-variants.ts`. La interpreté como "atributos JSX".
- **O-6 · Peso de los títulos de los anuncios en móvil.** `CardTitle` con `text-body` en móvil queda en Bricolage 400, un peso que no se carga (§4 dice 500 y 700). El humano lo juzga en H-10 (decisión de `aprobacion.md`).

## No atacado y por qué
- **Contraste medido en navegador, apariencia del vidrio, altura real de 36 y 44 px con el corte de 768 px, foco blanco interior, `prefers-reduced-motion` y el aviso de `sonner`:** necesitan un navegador. Quedan **no verificados** por mí; los deciden H-03, H-04, H-07, H-08 y H-09 del humano.
- **Envío implícito con Enter desde un campo:** jsdom no lo implementa. Lo cubren el `click` sintético interceptado, que sí probé, y la guarda (b). Queda para H-05.
- **Suite del backend:** `backend/` no cambió (V-08), y sus 21 hashes coinciden con la tabla de la ronda 0.

## Tabla de hashes vigente (SHA-256) de las `*.ataque`: 32 previas + 7 nuevas = 39

`find` encuentra exactamente 39. Rutas desde la raíz.

| Archivo | SHA-256 | Estado |
|---|---|---|
| `backend/test/auth-login.ataque.test.ts` | `2c83d82d10bdd9b7a969768774d75b18b7a71a594bbaac5fae36a0e134d2336c` | sin cambios |
| `backend/test/auth-registro.ataque.test.ts` | `73d3a2ae708a0ef676547a8094115b1419423057378387269bc3eadb34c7724e` | sin cambios |
| `backend/test/sesiones-y-cadena.ataque.test.ts` | `6e4b4677d73bde3d7c7845c729637186249e704f2aa803fb5efa25e76126b445` | sin cambios |
| `backend/test/api-real.ataque.test.ts` | `441a766a94e7d9b26807790402e06ed94d4cc378d8f6ecf0bccc3259c7ff55fb` | sin cambios |
| `backend/test/admin-unico.ataque.test.ts` | `388ad0e585639b8c3e0e0a6657fb42c1b9cb83db721c4863c4fa19e0be42ec85` | sin cambios |
| `backend/src/config/env.ataque.test.ts` | `4fce3cedf662ba3a188f21a2277db417747d342c115efd4746d3cff58499289b` | sin cambios |
| `frontend/src/services/apiClient.ataque.test.ts` | `10c730348d18ff8dae7b3623751d31122aa58560b564ad191717fa1938a6f8ce` | sin cambios |
| `frontend/src/app/router.ataque.test.tsx` | `e58293532633dc5cfe21561e2609d170638c81886b9c31129f03864c73a34f45` | sin cambios |
| `backend/test/intentos-r2.ataque.test.ts` | `a8b79d5ad98270be3747f493865708a78bb73add08d832584db4464c3582777a` | sin cambios |
| `backend/test/guarda-r2.ataque.test.ts` | `ea078f41cc98c947d9b3966ee8eccec2bd5d06eacbaf7ee8cd85f38e6a697c15` | sin cambios |
| `backend/test/nombres-tokens-r2.ataque.test.ts` | `00a6eb6f7ccd7d8790c356befcc96ddfda6eacce0be53de255cfe3626d8f2adb` | sin cambios |
| `backend/test/logs-r2.ataque.test.ts` | `5af3909e4b7ca485e78979567872ea78bf41e6d679b9ec2c761eaa0b250df689` | sin cambios |
| `frontend/src/app/sesion-r2.ataque.test.tsx` | `06f35be8ae68f0abae775268e4e64f3df880ff137a9b54aa3c135941ddb93dcf` | sin cambios |
| `backend/test/nombres-guarda-r3.ataque.test.ts` | `97b8d6f6c6b26b9b651eb0b46a48ed27b594a8ef659937eb600fde793f07e873` | sin cambios |
| `backend/test/cuentas-r1.ataque.test.ts` | `994a38f476d55f0b8826dc4b80e07dfb013f9034c7f7aee3cdc29dd74338b793` | sin cambios |
| `backend/test/worker-r1.ataque.test.ts` | `f4ea0bd908d8ec538aa479f9b09bf6fc6f86df6f93bb7abaaccd7001de876395` | sin cambios |
| `backend/test/logs-cuentas-r1.ataque.test.ts` | `a47af988453adcbc0e7ca710e670b5e2b9906e995ae6aa71e43fa8555764014c` | sin cambios |
| `backend/test/arquitectura-cuentas-r1.ataque.test.ts` | `42bb7bf3086230c6edc65ab73976ac8a801956336561aadbee65cc3b40eb8612` | sin cambios |
| `backend/test/arranque-r1.ataque.test.ts` | `aae65c95cf34db814d650af5f7fa08d09bff3e6fc6863d4252383058499aa10e` | sin cambios |
| `backend/src/config/logger.ataque.test.ts` | `43f1754c8c33f7de285ab77dbabb0f493422e858529432c9b2be26ff9423b01b` | sin cambios |
| `backend/src/config/correo.ataque.test.ts` | `bcce2cae771f97957d8691bef7fff4ec42412daaeabf726aeb0afc59f6f25671` | sin cambios |
| `backend/test/cuentas-r2.ataque.test.ts` | `736ae5fc909b5f53b6768010047378324e808c5bbe0434c0b0d140b58d0e598b` | sin cambios |
| `backend/test/worker-r2.ataque.test.ts` | `64aa76974c7ae3e89b2f1ed3d7efc7864d4323310932a9f46f02c798c363a6d2` | sin cambios |
| `backend/test/cuentas-r3.ataque.test.ts` | `a352625e291810251f41f53c3da37de82b662a20a82a66127f4d210ba6041b34` | sin cambios |
| `frontend/src/features/auth/enlace-r1.ataque.test.tsx` | `2584bd412e2d70e22a97cefeeb6278597d2e67ddf55f749bc739411ba432590a` | sin cambios |
| `frontend/src/app/cuentas-r1.ataque.test.tsx` | `a66120ed3c04a5c02dc64b33ad008be420739fa24eb67ac42d546429e74d7a4a` | sin cambios |
| `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` | `86adaa9a093a987dafd97e279e600211cbdf6cef97879d16fa2d8a9d2846f8b5` | modificado en la ronda 1 (N-01) |
| `frontend/src/features/auth/enlace-r2.ataque.test.tsx` | `5fda63b653dbc0db6b1d16c3f26506f5fae630fdfd4a9921a9ef5db98e39d438` | sin cambios |
| `frontend/src/app/cuentas-r2.ataque.test.tsx` | `b61346baf0c3789fdc15eea548623afb4bf3dc8c230f1944df4336de3a27f9eb` | sin cambios |
| `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` | `b948e9359fd3981e08b850540027f536f345a3f48d7c0749ba0c16c2c1df1184` | sin cambios desde la ronda 0 |
| `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` | `72bf9af4ce8f52a114897e038cefb0947841a37f74074f4c5f8dec68a71b654a` | modificado en la ronda 1 (F-1 y N-01) |
| `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` | `942df3015424aed56e83661993ba015e871cd6be8e797920d47e8cbf0c56eac4` | modificado en la ronda 1 (F-1, sin `it.fails`, N-01) |
| `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` | `3bd26e7e3bf019d462db4837861ed22017bbb9e9a6276720bf0dea6c2b5b0998` | nueva (ronda 1) |
| `frontend/src/features/admin/foco-r1.ataque.test.tsx` | `8219c864e7bdc1315e6a0f0ff1cd6f54e4710cebdceb8e316f4e53aacc0cff35` | nueva (ronda 1) |
| `frontend/src/app/en-espera-r1.ataque.test.tsx` | `bce6e497f61ed77d91b8d45958a4ad6f441be905deefa10d7f902155c850f57f` | nueva (ronda 1) |
| `frontend/src/app/contexto-r1.ataque.test.tsx` | `03642a556e05eda6509853d38a5b6c27836643166e835075bf3b4ba1c580d892` | nueva (ronda 1) |
| `frontend/src/app/errores-r1.ataque.test.tsx` | `2cfea81b66767023799188baa8babeab680360529a5de44eb5855d9032ae6413` | nueva (ronda 1) |
| `frontend/src/styles/tokens-r1.ataque.test.ts` | `1ffcd996ba2f35ef9dbb3a2c209f314ed0df34c6d2ecef8b6369d23a4dbaed02` | nueva (ronda 1) |
| `frontend/src/styles/clases-r1.ataque.test.ts` | `9921f668335a999e309364b76a7be6dd3c7825cebf1a23de7b85b03c3885498b` | nueva (ronda 1) |

**Conteos:**
- Hay 39 `*.ataque`: 29 sin cambios desde la ronda 0, `cuentas-r2` igual que en la ronda 0, 3 modificadas en esta ronda y 7 nuevas (83 pruebas).
- Frontend: 37 archivos y 494 pruebas, todas en verde. Las 7 nuevas no tienen ningún rojo, porque el código resiste.

**Estado al terminar** (`git status --porcelain --untracked-files=all`, solo lo mío):
- 3 modificados: `M` en `cuentas-r1`, `-r3` y `-r4` de `features/admin/`.
- 7 nuevos (`??`): los archivos de la tabla marcados "nueva (ronda 1)".
- Más este reporte.

---

## DESIGN-01b-1 — Ronda 0 (guarda V-07)

**Estado: DETENIDA en el subpaso 5.** `npm run lint` sale con código 2: `tsc -b` rechaza el texto exacto de §D-9. Es una condición de parada del encargo, así que no corregí nada. El archivo queda con el cambio aplicado para que se vea el fallo. La copia original, con el hash `9921f668…498b` de la ronda 1 de 01a, está en el scratchpad de la sesión (`clases-r1.ataque.test.ts.orig`).

Base: `HEAD` = `0fc961b`; `frontend/` comparado contra `e39500a`.

### Subpaso 1 · Precondición (desde `frontend/`)
- `git diff --quiet e39500a -- .` → código 0.
- `git status --porcelain -- .` → vacío.
- Observación: en la raíz, `git status` muestra además `docs/ESTADO.md` modificado, y no solo `aprobacion.md` como indicaba el orquestador. Está fuera de `frontend/` y no afecta a la precondición. No lo toqué.

### Subpaso 2 · V-01 con la tabla de 39 de "DESIGN-01a — Ronda 1"
- `sha256sum -c` desde la raíz → **39/39 OK**, código 0.
- `find backend frontend shared -name '*.ataque.test.*'` (sin `node_modules`) → 39 archivos.

### Subpaso 3 · Copia y sustitución
- Copia previa de `src/styles/clases-r1.ataque.test.ts` en el scratchpad.
- Sustituí la prueba V-07 (líneas 77 a 89) por el texto de §D-9. Comparé con `cmp` las líneas 535 a 560 de `plan-01b.md` contra las líneas 77 a 102 del archivo: son **idénticas byte a byte**. El archivo usa finales LF y no tiene ningún `\r`.
- `npx prettier --write src/styles/clases-r1.ataque.test.ts` → `(unchanged)`, código 0.

### Subpaso 4 · Diff y estado
- `git diff --name-only e39500a -- .` → solo `frontend/src/styles/clases-r1.ataque.test.ts`.
- `git status --porcelain --untracked-files=all -- .` → solo ` M frontend/src/styles/clases-r1.ataque.test.ts`.
- `git diff --numstat` → 19 líneas agregadas y 6 quitadas, todas dentro de la prueba V-07.

```diff
diff --git a/frontend/src/styles/clases-r1.ataque.test.ts b/frontend/src/styles/clases-r1.ataque.test.ts
index 42c88f7..48c8c5d 100644
--- a/frontend/src/styles/clases-r1.ataque.test.ts
+++ b/frontend/src/styles/clases-r1.ataque.test.ts
@@ -74,14 +74,27 @@ describe("ataque (DESIGN-01a r1): foco, espera y materiales (V-05 a V-07)", () =
     expect(coincidencias(/enEspera=/, soloTsx)).toHaveLength(13)
   })
 
-  it("V-07: vidrio solo en Card, vidrio fuerte solo en las variantes del botón, sin vidrio azul", () => {
-    // Dentro de una cadena de clases, no en la prosa de un comentario.
-    expect(rutasDe(coincidencias(/"[^"\n]*(?<![\w-])vidrio(?![\w-])[^"\n]*"/))).toEqual([
+  it("V-07: vidrio y vidrio fuerte solo donde lo permite el plan, sin vidrio azul", () => {
+    // DESIGN-01b-1, ronda 0 (plan-01b.md, §D-9): lista permitida mientras el programador trabaja.
+    // En la ronda 1 vuelve a igualdad exacta con la lista final.
+    const VIDRIO_PERMITIDO = [
+      "/src/components/layout/barra-navegacion.tsx",
+      "/src/components/layout/barra-superior.tsx",
+      "/src/components/layout/pie-de-pagina.tsx",
       "/src/components/ui/card.tsx",
-    ])
-    expect(rutasDe(coincidencias(/\bvidrio-fuerte\b/))).toEqual([
+    ]
+    const VIDRIO_FUERTE_PERMITIDO = [
+      "/src/components/cargando.tsx",
+      "/src/components/layout/barra-navegacion.tsx",
       "/src/components/ui/button-variants.ts",
-    ])
+      "/src/features/auth/components/panel-anuncios.tsx",
+    ]
+    const vidrio = rutasDe(coincidencias(/"[^"\n]*(?<![\w-])vidrio(?![\w-])[^"\n]*"/))
+    expect(vidrio).toContain("/src/components/ui/card.tsx")
+    expect(vidrio.filter((ruta) => !VIDRIO_PERMITIDO.includes(ruta))).toEqual([])
+    const vidrioFuerte = rutasDe(coincidencias(/\bvidrio-fuerte\b/))
+    expect(vidrioFuerte).toContain("/src/components/ui/button-variants.ts")
+    expect(vidrioFuerte.filter((ruta) => !VIDRIO_FUERTE_PERMITIDO.includes(ruta))).toEqual([])
     expect(coincidencias(/\bvidrio-azul\b/)).toEqual([])
     expect(rutasDe(coincidencias(/data-material|data-densidad/))).toEqual([
       "/src/components/layout/contenedor-rol.tsx",
```

### Subpaso 5 · Pruebas y lint
- `npx vitest run src/styles/clases-r1.ataque.test.ts` → 1 archivo, **11/11 en verde**, código 0.
- `npm run test` (desde `frontend/`) → **37 archivos y 496 pruebas en verde**, código 0.
- `npm run lint` (desde `frontend/`) → **código 2. CONDICIÓN DE PARADA.** ESLint y `prettier --check` pasan. Falla `npm run typecheck` (`tsc -b`):

```
src/styles/clases-r1.ataque.test.ts(94,63): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
src/styles/clases-r1.ataque.test.ts(97,76): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
```

**Causa.** `tsconfig.base.json` tiene activada la opción `"noUncheckedIndexedAccess": true`. La función auxiliar existente `rutasDe` (línea 28, `lista.map((l) => l.split(":")[0])`) devuelve `(string | undefined)[]`. El texto de §D-9 pasa cada `ruta` a `VIDRIO_PERMITIDO.includes(ruta)` y a `VIDRIO_FUERTE_PERMITIDO.includes(ruta)`; esas constantes se infieren como `string[]`, y `includes` no acepta `undefined`. Las líneas 94 y 97 son las dos `filter` nuevas. Vitest no comprueba tipos, por eso la prueba pasa en verde. La igualdad exacta anterior (`toEqual([...])`) no tenía este problema.

**No lo corregí:** cualquier arreglo (tipar las listas como `(string | undefined)[]`, usar `ruta ?? ""`, tocar `rutasDe`…) se aparta del "texto exacto" de §D-9 y de "Ninguna otra línea del archivo cambia". Lo decide el arquitecto o el humano.

### Subpaso 6 · Tabla de hashes
**No publico una tabla vigente para el programador**, porque la ronda 0 no terminó. Estado actual, desde la raíz:
- `sha256sum -c` con la tabla de 39 de "DESIGN-01a — Ronda 1" → 38 OK. Solo falla `frontend/src/styles/clases-r1.ataque.test.ts`, el archivo cambiado a propósito.
- Hash actual de `frontend/src/styles/clases-r1.ataque.test.ts` con el texto de §D-9, que no pasa lint: `ea2b647797b1ecdf61e85b9d5d4744ac50e9908c63cf6fdf02f9f6faecb04545`. **No es base de V-01.**
- Hash de la copia original: `9921f668335a999e309364b76a7be6dd3c7825cebf1a23de7b85b03c3885498b`, igual al de la tabla de 01a.
- Las otras 38 conservan exactamente los hashes de la tabla de "DESIGN-01a — Ronda 1".

### Estado al terminar
- `git status --porcelain --untracked-files=all`: ` M docs/ESTADO.md`, ` M docs/trabajo/DESIGN-01-sistema-de-diseno/aprobacion.md` (los dos del orquestador), ` M frontend/src/styles/clases-r1.ataque.test.ts` (mío) y este reporte.
- No arranqué ningún proceso de larga vida, no usé git para escribir y no abrí ningún navegador.

---

## DESIGN-01b-1 — Ronda 0, segundo intento (guarda V-07)

**Estado: COMPLETADA.** El humano decidió "Corregir §D-9 y repetir" (`aprobacion.md`, "Parada de la ronda 0 de 01b-1"). El arquitecto corrigió solo el tipado del texto de V-07 en `plan-01b.md`. Lo apliqué y todas las condiciones de parada se cumplen: el diff solo toca V-07, `git status` de `frontend/` solo muestra ese archivo, la suite da 37 archivos y 496 pruebas en verde, y `npm run lint` sale con código 0.

### Restauración del primer intento
- Copié `clases-r1.ataque.test.ts.orig`, del scratchpad, sobre `frontend/src/styles/clases-r1.ataque.test.ts`.
- `sha256sum` → `9921f668335a999e309364b76a7be6dd3c7825cebf1a23de7b85b03c3885498b`, el mismo de la tabla de 01a.
- `git diff --quiet e39500a -- .` (desde `frontend/`) → código 0. `git status --porcelain -- .` → vacío.
- `npm run lint` (desde `frontend/`) → código 0, con `tsc -b` incluido.

### Subpaso 1 · Precondición (desde `frontend/`)
- `git diff --quiet e39500a -- .` → código 0; `git status --porcelain --untracked-files=all -- .` → vacío.

### Subpaso 2 · V-01 con la tabla de 39 de "DESIGN-01a — Ronda 1"
- `sha256sum -c` desde la raíz → **39/39 OK**, código 0.

### Subpaso 3 · Sustitución y formato
- Tomé el bloque de §D-9 directamente del plan (líneas 541 a 571 de `plan-01b.md`) y lo puse en lugar de las líneas 77 a 89 del archivo. Las líneas 1 a 76 y del `})` que cierra el `describe` en adelante quedaron **idénticas byte a byte** al original, comprobado con `cmp`.
- `npx prettier --write src/styles/clases-r1.ataque.test.ts` (desde `frontend/`) → código 0. Prettier solo cambió el corte de líneas del **primer** `expect(... .filter(...))`: lo juntó en una línea y partió `.toEqual([])` en `.toEqual(\n [],\n )`. El plan lo permite ("Prettier puede partir o juntar las líneas de los `expect`").
- **El contenido es el mismo.** Sin espacios ni saltos de línea, el bloque del archivo (líneas 77 a 107) y el del plan solo difieren en la coma final que Prettier agrega al partir: `([],)` frente a `,)`. Quitando las comas finales antes de `)` o `]`, son idénticos.
- El archivo usa finales LF: 0 `\r`.

### Subpaso 4 · Diff y estado
- `git diff --name-only e39500a -- .` → solo `frontend/src/styles/clases-r1.ataque.test.ts`.
- `git status --porcelain --untracked-files=all -- .` (desde `frontend/`) → solo ` M frontend/src/styles/clases-r1.ataque.test.ts`.
- `git diff --numstat` → 24 líneas agregadas y 6 quitadas, todas dentro de la prueba V-07.

```diff
diff --git a/frontend/src/styles/clases-r1.ataque.test.ts b/frontend/src/styles/clases-r1.ataque.test.ts
index 42c88f7..3cee41b 100644
--- a/frontend/src/styles/clases-r1.ataque.test.ts
+++ b/frontend/src/styles/clases-r1.ataque.test.ts
@@ -74,14 +74,32 @@ describe("ataque (DESIGN-01a r1): foco, espera y materiales (V-05 a V-07)", () =
     expect(coincidencias(/enEspera=/, soloTsx)).toHaveLength(13)
   })
 
-  it("V-07: vidrio solo en Card, vidrio fuerte solo en las variantes del botón, sin vidrio azul", () => {
-    // Dentro de una cadena de clases, no en la prosa de un comentario.
-    expect(rutasDe(coincidencias(/"[^"\n]*(?<![\w-])vidrio(?![\w-])[^"\n]*"/))).toEqual([
+  it("V-07: vidrio y vidrio fuerte solo donde lo permite el plan, sin vidrio azul", () => {
+    // DESIGN-01b-1, ronda 0 (plan-01b.md, §D-9): lista permitida mientras el programador trabaja.
+    // En la ronda 1 vuelve a igualdad exacta con la lista final. Con noUncheckedIndexedAccess,
+    // rutasDe devuelve (string | undefined)[]: una ruta undefined cuenta como violación.
+    const VIDRIO_PERMITIDO: readonly string[] = [
+      "/src/components/layout/barra-navegacion.tsx",
+      "/src/components/layout/barra-superior.tsx",
+      "/src/components/layout/pie-de-pagina.tsx",
       "/src/components/ui/card.tsx",
-    ])
-    expect(rutasDe(coincidencias(/\bvidrio-fuerte\b/))).toEqual([
+    ]
+    const VIDRIO_FUERTE_PERMITIDO: readonly string[] = [
+      "/src/components/cargando.tsx",
+      "/src/components/layout/barra-navegacion.tsx",
       "/src/components/ui/button-variants.ts",
-    ])
+      "/src/features/auth/components/panel-anuncios.tsx",
+    ]
+    const vidrio = rutasDe(coincidencias(/"[^"\n]*(?<![\w-])vidrio(?![\w-])[^"\n]*"/))
+    expect(vidrio).toContain("/src/components/ui/card.tsx")
+    expect(vidrio.filter((ruta) => ruta === undefined || !VIDRIO_PERMITIDO.includes(ruta))).toEqual(
+      [],
+    )
+    const vidrioFuerte = rutasDe(coincidencias(/\bvidrio-fuerte\b/))
+    expect(vidrioFuerte).toContain("/src/components/ui/button-variants.ts")
+    expect(
+      vidrioFuerte.filter((ruta) => ruta === undefined || !VIDRIO_FUERTE_PERMITIDO.includes(ruta)),
+    ).toEqual([])
     expect(coincidencias(/\bvidrio-azul\b/)).toEqual([])
     expect(rutasDe(coincidencias(/data-material|data-densidad/))).toEqual([
       "/src/components/layout/contenedor-rol.tsx",
```

### Subpaso 5 · Pruebas y lint (desde `frontend/`)
- `npx vitest run src/styles/clases-r1.ataque.test.ts` → 1 archivo, **11/11 en verde**, código 0.
- `npm run test` → **37 archivos y 496 pruebas en verde**, código 0.
- `npm run lint` → **código 0**: ESLint limpio, "All matched files use Prettier code style!" y `tsc -b` sin errores.

### Subpaso 6 · Tabla de hashes vigente (SHA-256) de las 39 `*.ataque`: base de V-01 para el programador de 01b-1

Rutas desde la raíz. `find backend frontend shared -name '*.ataque.test.*'` (sin `node_modules`) → 39. Comprobé la tabla con `sha256sum -c` desde la raíz → 39/39 OK. Contra la tabla de "DESIGN-01a — Ronda 1": 38 iguales, y solo cambia `clases-r1`.

| Archivo | SHA-256 | Estado |
|---|---|---|
| `backend/test/auth-login.ataque.test.ts` | `2c83d82d10bdd9b7a969768774d75b18b7a71a594bbaac5fae36a0e134d2336c` | sin cambios |
| `backend/test/auth-registro.ataque.test.ts` | `73d3a2ae708a0ef676547a8094115b1419423057378387269bc3eadb34c7724e` | sin cambios |
| `backend/test/sesiones-y-cadena.ataque.test.ts` | `6e4b4677d73bde3d7c7845c729637186249e704f2aa803fb5efa25e76126b445` | sin cambios |
| `backend/test/api-real.ataque.test.ts` | `441a766a94e7d9b26807790402e06ed94d4cc378d8f6ecf0bccc3259c7ff55fb` | sin cambios |
| `backend/test/admin-unico.ataque.test.ts` | `388ad0e585639b8c3e0e0a6657fb42c1b9cb83db721c4863c4fa19e0be42ec85` | sin cambios |
| `backend/src/config/env.ataque.test.ts` | `4fce3cedf662ba3a188f21a2277db417747d342c115efd4746d3cff58499289b` | sin cambios |
| `frontend/src/services/apiClient.ataque.test.ts` | `10c730348d18ff8dae7b3623751d31122aa58560b564ad191717fa1938a6f8ce` | sin cambios |
| `frontend/src/app/router.ataque.test.tsx` | `e58293532633dc5cfe21561e2609d170638c81886b9c31129f03864c73a34f45` | sin cambios |
| `backend/test/intentos-r2.ataque.test.ts` | `a8b79d5ad98270be3747f493865708a78bb73add08d832584db4464c3582777a` | sin cambios |
| `backend/test/guarda-r2.ataque.test.ts` | `ea078f41cc98c947d9b3966ee8eccec2bd5d06eacbaf7ee8cd85f38e6a697c15` | sin cambios |
| `backend/test/nombres-tokens-r2.ataque.test.ts` | `00a6eb6f7ccd7d8790c356befcc96ddfda6eacce0be53de255cfe3626d8f2adb` | sin cambios |
| `backend/test/logs-r2.ataque.test.ts` | `5af3909e4b7ca485e78979567872ea78bf41e6d679b9ec2c761eaa0b250df689` | sin cambios |
| `frontend/src/app/sesion-r2.ataque.test.tsx` | `06f35be8ae68f0abae775268e4e64f3df880ff137a9b54aa3c135941ddb93dcf` | sin cambios |
| `backend/test/nombres-guarda-r3.ataque.test.ts` | `97b8d6f6c6b26b9b651eb0b46a48ed27b594a8ef659937eb600fde793f07e873` | sin cambios |
| `backend/test/cuentas-r1.ataque.test.ts` | `994a38f476d55f0b8826dc4b80e07dfb013f9034c7f7aee3cdc29dd74338b793` | sin cambios |
| `backend/test/worker-r1.ataque.test.ts` | `f4ea0bd908d8ec538aa479f9b09bf6fc6f86df6f93bb7abaaccd7001de876395` | sin cambios |
| `backend/test/logs-cuentas-r1.ataque.test.ts` | `a47af988453adcbc0e7ca710e670b5e2b9906e995ae6aa71e43fa8555764014c` | sin cambios |
| `backend/test/arquitectura-cuentas-r1.ataque.test.ts` | `42bb7bf3086230c6edc65ab73976ac8a801956336561aadbee65cc3b40eb8612` | sin cambios |
| `backend/test/arranque-r1.ataque.test.ts` | `aae65c95cf34db814d650af5f7fa08d09bff3e6fc6863d4252383058499aa10e` | sin cambios |
| `backend/src/config/logger.ataque.test.ts` | `43f1754c8c33f7de285ab77dbabb0f493422e858529432c9b2be26ff9423b01b` | sin cambios |
| `backend/src/config/correo.ataque.test.ts` | `bcce2cae771f97957d8691bef7fff4ec42412daaeabf726aeb0afc59f6f25671` | sin cambios |
| `backend/test/cuentas-r2.ataque.test.ts` | `736ae5fc909b5f53b6768010047378324e808c5bbe0434c0b0d140b58d0e598b` | sin cambios |
| `backend/test/worker-r2.ataque.test.ts` | `64aa76974c7ae3e89b2f1ed3d7efc7864d4323310932a9f46f02c798c363a6d2` | sin cambios |
| `backend/test/cuentas-r3.ataque.test.ts` | `a352625e291810251f41f53c3da37de82b662a20a82a66127f4d210ba6041b34` | sin cambios |
| `frontend/src/features/auth/enlace-r1.ataque.test.tsx` | `2584bd412e2d70e22a97cefeeb6278597d2e67ddf55f749bc739411ba432590a` | sin cambios |
| `frontend/src/app/cuentas-r1.ataque.test.tsx` | `a66120ed3c04a5c02dc64b33ad008be420739fa24eb67ac42d546429e74d7a4a` | sin cambios |
| `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` | `86adaa9a093a987dafd97e279e600211cbdf6cef97879d16fa2d8a9d2846f8b5` | sin cambios |
| `frontend/src/features/auth/enlace-r2.ataque.test.tsx` | `5fda63b653dbc0db6b1d16c3f26506f5fae630fdfd4a9921a9ef5db98e39d438` | sin cambios |
| `frontend/src/app/cuentas-r2.ataque.test.tsx` | `b61346baf0c3789fdc15eea548623afb4bf3dc8c230f1944df4336de3a27f9eb` | sin cambios |
| `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` | `b948e9359fd3981e08b850540027f536f345a3f48d7c0749ba0c16c2c1df1184` | sin cambios |
| `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` | `72bf9af4ce8f52a114897e038cefb0947841a37f74074f4c5f8dec68a71b654a` | sin cambios |
| `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` | `942df3015424aed56e83661993ba015e871cd6be8e797920d47e8cbf0c56eac4` | sin cambios |
| `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` | `3bd26e7e3bf019d462db4837861ed22017bbb9e9a6276720bf0dea6c2b5b0998` | sin cambios |
| `frontend/src/features/admin/foco-r1.ataque.test.tsx` | `8219c864e7bdc1315e6a0f0ff1cd6f54e4710cebdceb8e316f4e53aacc0cff35` | sin cambios |
| `frontend/src/app/en-espera-r1.ataque.test.tsx` | `bce6e497f61ed77d91b8d45958a4ad6f441be905deefa10d7f902155c850f57f` | sin cambios |
| `frontend/src/app/contexto-r1.ataque.test.tsx` | `03642a556e05eda6509853d38a5b6c27836643166e835075bf3b4ba1c580d892` | sin cambios |
| `frontend/src/app/errores-r1.ataque.test.tsx` | `2cfea81b66767023799188baa8babeab680360529a5de44eb5855d9032ae6413` | sin cambios |
| `frontend/src/styles/tokens-r1.ataque.test.ts` | `1ffcd996ba2f35ef9dbb3a2c209f314ed0df34c6d2ecef8b6369d23a4dbaed02` | sin cambios |
| `frontend/src/styles/clases-r1.ataque.test.ts` | `dd520b045bd16fea0fd71a39954b73b882b6f913a30734c369c5d6cc5cc96f6f` | **modificado en la ronda 0 de 01b-1 (§D-9, segundo intento)** |

### Estado al terminar
- `git status --porcelain --untracked-files=all` (raíz):
  - ` M frontend/src/styles/clases-r1.ataque.test.ts` y este reporte (míos);
  - ` M docs/ESTADO.md`, ` M docs/trabajo/DESIGN-01-sistema-de-diseno/aprobacion.md` y ` M docs/trabajo/DESIGN-01-sistema-de-diseno/plan-01b.md` (del orquestador y del arquitecto; no los toqué).
- No arranqué ningún proceso de larga vida, no usé git para escribir y no abrí ningún navegador.

## DESIGN-01b-1 — Ronda 1

# Reporte del Tester — DESIGN-01b-1 · fondo, marco, composición, pie y recorte de la sombra — Ronda 1
Veredicto: **ROTO**
Verificación propia (desde `frontend/`, salvo la última):
- **lint:** código 0 antes y después de mis pruebas (ESLint, `prettier --check` y `tsc -b`). También `npm run lint` desde la raíz: código 0.
- **test:** antes de mis pruebas, código 0 (42 archivos, 578 pruebas). Con mis pruebas, código 1: 46 archivos y 682 pruebas, de las que 679 pasan y 3 fallan. Las 3 son T-01.
- **build:** código 0 antes y después. Solo sale el aviso ya conocido de Vite sobre el bloque de más de 500 kB.

Hallazgos: **2**, los dos de severidad **baja**: T-01, con prueba en rojo, y T-02, de proceso, con su reproducción. No hay hallazgos críticos, altos ni medios.

### Comprobaciones previas
- **V-01:** `sha256sum -c` contra la tabla de 39 de "Ronda 0, segundo intento", desde la raíz: **39/39 OK** antes de tocar nada.
- **V-14, repetida por mi cuenta:**
  1. `git diff --quiet e39500a --` sobre `router.tsx` y las tres guardas `require-*.tsx` → código 0.
  2. En el diff `-U0` de `acceso-restringido-view.tsx`, ninguna línea agregada o quitada contiene alguno de los 10 textos fijos (0 coincidencias con cada uno).
  3. Las cuatro líneas existen idénticas y en orden: líneas 21, 31, 42 y 43 (en `e39500a` eran 19, 27, 36 y 37).
- **V-08 en `frontend/`:** la lista de modificados y nuevos coincide con "Cambios por capa". Las rutas de "No se toca" no tienen cambios: `features/auth/{data,hooks,lib,types}.ts`, los 5 `formulario-*.tsx`, `components/ui/`, `services/`, `features/diagnostico/`, `features/admin/components/`, `providers.tsx`, `index.css`, `index.html`, `package.json`, `vite.config.ts`, `vitest.config.ts` y `src/test/`.
  - Salvo T-02: `format.test.ts` quita una línea.
  - Fuera de `frontend/`, contra `8feab74`, solo cambian `docs/DESIGN.md`, `docs/ESTADO.md`, `aprobacion.md` y `resumen-programador.md`.
- **V-10**, sobre el `dist/` de mi build:
  - En el CSS están `[data-fondo]`, los tres `@keyframes orbe-*`, `prefers-reduced-motion`, `animation-play-state:paused`, `will-change:transform`, `.sin-sombra-de-vidrio`, `--orb-blue-size`, `.sr-only` y `max-sm\:sr-only`.
  - En el JS, `href:"#"` aparece 0 veces.
  - Hay 6 `.woff2`.
- **Clases que no generan CSS:** saqué cada clase de los 14 archivos de producción tocados y la busqué en el CSS de `dist/`. Todas generan CSS, incluidas `w-18`, `md:h-15`, `size-13`, `rounded-bar`, `text-caption`, `max-sm:size-(--control-height)`, `hover:vidrio-fuerte` e `in-data-[material=opaco]:*`.

### Hallazgos

#### T-01 — Una URL con un carácter de control invisible al inicio o al final sale como enlace real
Severidad: **baja**
Prueba: `frontend/src/components/layout/pie-r1.ataque.test.tsx`, "ataque (DESIGN-01b-1 r1): caracteres de control alrededor de la URL (M-03)". Son 3 casos: U+0001 al inicio, U+001F al inicio y U+0000 al final.

**Esperado:** §D-5, paso 2, dice "`false` si `url !== url.trim()` (espacios o caracteres de control al inicio o al final, M-03): el analizador de URL los quitaría en silencio y el `href` saldría con ellos". El comentario de `esUrlPublicable` (`components/layout/lib.ts:15-16`) repite que cubre los caracteres de control. Por eso `"\u0001https://colegio.mx"` debería salir como marcador en desarrollo y omitirse en producción.

**Obtenido:**
- `String.prototype.trim` solo quita espacios y los controles `\t\n\v\f\r`. No quita U+0000 a U+0008 ni U+000E a U+001F.
- `new URL` sí los quita: `new URL("\u0001https://colegio.mx").protocol` es `"https:"`.
- Resultado: `esUrlPublicable` devuelve `true` y el pie pinta `<a href="\u0001https://colegio.mx">`, con el carácter invisible dentro del `href`.

Es justo el caso que M-03 quería dejar a la vista como marcador, y el enlace sale como real en los dos modos.

**Impacto (por eso es baja):**
- No abre ninguna vía de `javascript:`: el protocolo se revisa después del análisis. `"\u0001javascript:alert(1)"` da `javascript:` y se rechaza.
- El navegador también quita el carácter al seguir el enlace.
- El daño es que un error de captura invisible no queda a la vista.

**Nota para el árbitro:** el código aplica al pie de la letra el `trim()` que prescribe §D-5. La contradicción está entre el mecanismo del plan y la intención que el mismo plan declara. No propongo corrección.

Requisito o regla violada: plan-01b.md §D-5 (paso 2, M-03) y S-07.

#### T-02 — V-08 (E-2) no se cumple en `format.test.ts`, y el resumen dice que sí
Severidad: **baja** (proceso; no cambia ningún comportamiento)
Prueba: no automatizable como `*.ataque`, porque depende de `git` y de la base `e39500a`. Reproducción desde la raíz:
1. `git diff e39500a -- frontend/src/lib/format.ts frontend/src/lib/format.test.ts frontend/src/components/layout/types.ts | grep -E '^-[^-]'`
2. Sale una línea quitada: `-import { formatearFechaHora } from "./format"`. Se sustituyó por `+import { formatearFechaHora, inicialesDe } from "./format"`.

**Esperado:**
- V-08, excepción E-2: el diff de esos tres archivos "no quita ninguna línea (solo agrega)".
- E-2 dice "nada existente cambia".
- La parada de V-08 dice: "Si V-08 marca un archivo cambiado con autorización, el agente se detiene y pregunta".

**Obtenido:**
- Una línea existente cambió.
- `resumen-programador.md`, paso 11, V-08, afirma: "E-2 y E-3 (…`format.test.ts`…): el diff contra `e39500a` no quita ninguna línea, solo agrega". Eso es falso para `format.test.ts`.

El cambio es inocuo: solo agrega `inicialesDe` a la importación. Lo que falla es la verificación declarada, que no se ejecutó o se leyó mal.

Requisito o regla violada: plan-01b.md V-08 (E-2) y AGENTS.md ("Ningún agente declara verde algo que no ejecutó").

### Tareas obligatorias de la ronda 1 y justificación de cada cambio a una `*.ataque` existente
- **`frontend/src/styles/clases-r1.ataque.test.ts`, V-07 (la única `*.ataque` existente que toqué).**
  - **Qué cambié:** sustituí las dos listas permitidas y sus `filter` por las dos igualdades exactas del **texto de referencia de la ronda 1 de §D-9**, letra por letra. Conservé las dos aserciones `toContain` (`card.tsx` y `button-variants.ts`) y dejé sin cambios `vidrio-azul` y `data-material|data-densidad`.
  - **Nombre y comentario:** el nombre de la prueba vuelve a decir "igualdad exacta" y el comentario cita §D-9. El plan lo permite.
  - **Por qué no debilita nada:**
    - la lista final es la misma que la permitida;
    - la igualdad es más estricta que el filtro de la ronda 0, porque ahora también falla si falta uno;
    - una ruta `undefined` hace fallar la igualdad.
  - **El código cumple la lista exacta:** `vidrio` está en `barra-navegacion`, `barra-superior`, `pie-de-pagina` y `card`; `vidrio-fuerte`, en `cargando`, `barra-navegacion`, `button-variants` y `panel-anuncios`. No es hallazgo y la lista no se amplió.
  - **Verificación:**
    - `git diff --numstat e39500a` da 16 líneas agregadas y 4 quitadas, todas dentro de V-07;
    - 11/11 en verde;
    - `npm run lint` (con `tsc -b`) sale con código 0.
- **`tokens-r1.ataque.test.ts`, descripciones de `:185` y `:188`: no las toqué.** El plan (punto de ataque 9 y "Pruebas existentes afectadas") le asigna a esta ronda actualizar el texto de esas dos descripciones sin tocar sus aserciones. Los límites del orquestador para esta ronda solo autorizan "V-07 de `clases-r1` y archivos `*.ataque` nuevos", y seguí el límite más estrecho. Queda pendiente: si el orquestador lo autoriza, se hace en la ronda 2. Sus aserciones siguen valiendo.
- **Condición de detención y RN-03:**
  - Un estudiante, un maestro y un admin **no restringidos** que entran a `/acceso-restringido` terminan en `/estudiante`, `/maestro` y `/admin`:
    - con un solo `contentinfo`, dentro de `[data-rol=<rol>]`;
    - con una sola `navigation`;
    - sin que el encabezado "Acceso restringido" aparezca **en ningún momento** (lo vigila un `MutationObserver` durante todo el flujo);
    - sin que haya dos `footer` a la vez.
  - El restringido se queda, entre por donde entre (`/acceso-restringido`, `/estudiante`, `/admin` o `/maestro`): tiene el pie fuera de cualquier `data-rol` o `data-material`, 0 `navigation`, 0 `banner` y un solo "Cerrar sesión".
  - Las 9 `*.ataque` de `/acceso-restringido` siguen en verde con su hash sin cambios.
  - Ni las guardas ni las rutas cambiaron (V-14).

### Archivos nuevos de esta ronda (4; 104 pruebas)
- `frontend/src/components/layout/pie-r1.ataque.test.tsx` (13 pruebas: 10 en verde y 3 en rojo, T-01).
  - Con `vi.mock("./data")`, prueba 21 URL hostiles: `#`, `#aviso`, `javascript:` (también en mayúsculas, partido con `\n` y con `\t`), `vbscript:`, `data:`, `http:`, espacios alrededor, al inicio o al final, `\t` al inicio, `\n` al final, espacio duro, vacía, solo espacios, relativa, relativa al protocolo, sin esquema y `null`.
  - Revisa URL publicables mezcladas, producción y desarrollo, la lista vacía y que `PROD` se lea al pintar.
  - Revisa el año en la víspera de Año Nuevo, el 1 de enero y 2099.
- `frontend/src/components/layout/estatico-r1.ataque.test.ts` (13 pruebas). Búsquedas estáticas:
  - los enlaces y el nombre del colegio solo en `data.ts`;
  - nunca `href="#"` ni `javascript:` en el código;
  - ningún año escrito a mano en el marco;
  - `FondoAnimado` solo en `FondoDeLaApp`, y `FondoDeLaApp` solo en `main.tsx`, dentro de `Providers`, antes de `RouterProvider` y fuera de él;
  - `router.tsx` sin fondo;
  - ningún `bg-background` en componentes;
  - V-15 y V-16;
  - los valores arbitrarios de maquetación son exactamente los que prescribe el plan;
  - nada de 01b-2: 0 `CampoContrasena`, `aria-pressed`, `nombreDelBoton` o "Mostrar contrase…", y los 7 `type="password"` siguen en los 4 formularios.
- `frontend/src/app/fondo-r1.ataque.test.tsx` (50 pruebas):
  - `orbesEnMovimiento` con 29 rutas raras;
  - el fondo montado como en `main.tsx`, en `StrictMode`, a través de 11 redirecciones de guardas;
  - el mismo nodo de fondo desde `/registro`, pasando por login y `/estudiante`, hasta `/diagnostico` (no se vuelve a montar);
  - fuera del árbol accesible, sin foco y fuera del marco;
  - una sola suscripción con 6 navegaciones y la baja al desmontarse;
  - no navega por su cuenta;
  - en `tokens.css`: solo `transform` en cada paso de los `@keyframes`, y la regla de movimiento reducido gana por orden y peso sin `!important`, sin otra regla que vuelva a animar;
  - también en `tokens.css`: la pausa con más peso, `[data-fondo]` sin `transform`, `filter`, `contain` ni `will-change`, y un solo `will-change`, sobre `transform`.
- `frontend/src/app/marco-r1.ataque.test.tsx` (28 pruebas):
  - la condición de detención (arriba);
  - un solo pie al navegar: login → estudiante, cerrar sesión desde `/admin` y `/cambiar-contrasena` → `/maestro`;
  - el marco de los tres roles: una `nav` hija directa de la raíz, con un solo destino hacia una ruta existente (`matchRoutes`, sin caer en `*`), `aria-current`, enfocable, un `banner`, un pie, nombre y rol una vez, y el nombre del producto que no es un encabezado;
  - en la cadena de ancestros de la `nav`, ninguna clase que cree un bloque contenedor (`vidrio*`, `transform`, `translate-`, `filter`, `backdrop-`, `will-change-`, `contain-`, `perspective-`…);
  - en `/admin`, `nav`, `banner` y pie dentro del contexto opaco y denso;
  - "Cerrar sesión" en espera, con el foco y un solo logout;
  - en las 11 pantallas: un pie con los 4 marcadores inertes, ningún `href` `#` o `javascript:`, y **ningún nodo de texto fuera de `Card`, vidrio o un fondo sólido de token**. También el `Cargando` de las guardas;
  - recorte de la sombra en `/login` y `/registro`:
    - la lista de avisos es la única que desplaza en toda la pantalla, enfocable y con un `h3` por fila, y lleva `sin-sombra-de-vidrio`;
    - el panel que da la sombra no tiene ningún ancestro que recorte;
    - no queda ningún `-m-2`.

Ninguna prueba localiza por clases de estilo. Las clases solo se leen como aserción sobre elementos ya localizados por rol, texto o atributo de datos, como piden §D-1 y el punto 6.

### Atacado sin hallazgos
- **Condición de detención y RN-03:** todo lo de arriba.
- **Pie:**
  - el año se calcula;
  - ninguna URL hostil sale como `<a>`, ni tal cual ni recortada; la única excepción es T-01;
  - en producción no hay marcadores ni lista;
  - los marcadores no se enfocan, no están dentro de un `<a>` o `<button>` y no tienen `href`, `role` ni `tabindex`;
  - sin `target="_blank"`;
  - el orden se conserva;
  - no hay `href="#"` ni en el código ni en el build;
  - el pie aparece en las 11 pantallas, también en `/cambiar-contrasena` y en `/admin`, donde queda dentro del contexto opaco;
  - los enlaces salen de un solo archivo.
- **Fondo:** los orbes solo se animan con `transform`; solo se mueven en `/login`, `/estudiante` y `/maestro`, y en las demás se pausan; con movimiento reducido se quedan quietos; se monta fuera del router, sin tocar la navegación y sin volver a montarse; lo fijo no queda dentro de vidrio (M-03).
- **Marco:** destinos solo con rutas existentes; `nav` fija, hija directa de la raíz sin vidrio; `/admin` opaco y denso, con un solo contenedor marcado; estudiante y maestro sin contexto; foco en el destino y en "Cerrar sesión"; `enEspera` sigue en 13.
- **Recorte de la sombra:** filas sin sombra dentro de la única lista que desplaza; `p-2 -m-2` retirado.
- **Valores arbitrarios** (el orquestador pidió juzgarlos): `min-h-[calc(100svh-7rem)]`, `md:min-h-[calc(100svh-3rem)]`, `md:h-[calc(100svh-3rem)]`, `lg:max-h-[calc(100svh-6rem)]`, `md:grid-cols-[6rem_minmax(0,1fr)]` y `lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]`.
  - **Permitidos.** `CLAUDE.md` prohíbe escribir sueltos el color, el tamaño de fuente, el radio y la sombra ("Siempre mediante token"), y V-04 solo busca `text|rounded|shadow|leading|tracking|font|bg|border|outline-[`.
  - Estos son medidas de maquetación que el plan prescribe literalmente (§D-3, §D-6 y §D-3 de la `nav`). La rejilla del login ya estaba en `e39500a`.
  - `estatico-r1` los fija, para que un valor arbitrario nuevo se ponga en rojo.
- **Regresiones:** las 39 `*.ataque` previas pasan (38 con su hash sin cambios, más `clases-r1` con V-07). Nada de 01b-2 está implementado.

### Observaciones para el manager (sin prueba en rojo; no las cuento como hallazgos)
- **O-1 · Dos clics en el mismo instante sobre "Cerrar sesión" mandan dos logout.** Con dos `fireEvent.click` seguidos, sin repintado entre ellos, salen dos `POST /api/auth/logout`.
  - **Es idéntico en `e39500a`:** el mismo `enEspera={cerrando}` solo se mudó a `BarraSuperior`.
  - `en-espera-r1` solo exige ese caso a login y registro, que cuentan intentos. El logout es idempotente.
  - Con repintado de por medio, `marco-r1` comprueba que sale un solo logout.
- **O-2 · En `/admin`, "Cuentas" activo pierde `--accent-soft` al pasar el puntero.** En el CSS de `dist/`, `.in-data-[material=opaco]:hover:bg-muted:hover` pesa (0,2,0) y va después de `.in-data-[material=opaco]:bg-accent-soft`, que pesa (0,1,0). El activo se ve `--muted` con el puntero encima.
  - Son exactamente las clases del plan (§D-3). Es solo visual: `--link` sobre `--muted` sigue pasando AA.
  - No está verificado en navegador. Que lo mire el humano en H-12.
- **O-3 · `DESIGN.md` §7.4 (texto del programador) se contradice.**
  - Dice "flotante a 16 px de los bordes de la ventana (no a 24 px: la barra inferior necesita más margen …)", pero 16 px es menos margen que 24.
  - La línea 410 del mismo documento dice "Las dos barras flotan … a 24 px de los bordes".
  - El código usa 16 px en móvil, como pide §D-3 (`inset-x-4 bottom-4`, `p-4`). Lo que falla es el texto; lo revisa el manager (E-1).
- **O-4 · Orden de tabulación en móvil.** La `nav`, que por debajo de 768 px es la barra inferior, va antes que la barra superior en el DOM. Con Tab se llega primero a "Inicio", abajo, y después a "Cerrar sesión", arriba. Es la estructura que prescribe §D-3; lo juzga el humano en H-04.

### No atacado y por qué
- **Todo lo que exige navegador** (S-01): la apariencia, la posición y el movimiento real de los orbes, el rendimiento (H-11), el contraste medido (H-09, C-01 a C-26), la sombra real y el filo al desplazar (H-14), la barra inferior fija a 360 y 767 px sin pegarse a un panel (H-12), el área segura de iOS (R-10) y el foco visible. Jsdom no calcula el diseño ni aplica `tokens.css`. **No verificado; lo decide el humano.**
- **Rama de error de `AccesoRestringidoView`:** es inalcanzable desde las rutas, porque `RequireSesion` comparte la consulta `useMe` y navega antes a `/login` o `/cambiar-contrasena`. No la ataqué por separado: la vista está en "No se toca" salvo E-6, y V-14 confirma que la rama no cambió.
- **`tokens-r1`, descripciones de `:185` y `:188`:** fuera de los límites de esta ronda (arriba).

### Tabla de hashes vigente (SHA-256) de las `*.ataque`: 39 previas + 4 nuevas = 43
Rutas desde la raíz. `find backend frontend shared -name '*.ataque.test.*'` (sin `node_modules`) → 43. `sha256sum -c` desde la raíz → 43/43 OK. Contra la tabla de "Ronda 0, segundo intento": 38 iguales, `clases-r1` modificada y 4 nuevas.

| Archivo | SHA-256 | Estado |
|---|---|---|
| `backend/test/auth-login.ataque.test.ts` | `2c83d82d10bdd9b7a969768774d75b18b7a71a594bbaac5fae36a0e134d2336c` | sin cambios |
| `backend/test/auth-registro.ataque.test.ts` | `73d3a2ae708a0ef676547a8094115b1419423057378387269bc3eadb34c7724e` | sin cambios |
| `backend/test/sesiones-y-cadena.ataque.test.ts` | `6e4b4677d73bde3d7c7845c729637186249e704f2aa803fb5efa25e76126b445` | sin cambios |
| `backend/test/api-real.ataque.test.ts` | `441a766a94e7d9b26807790402e06ed94d4cc378d8f6ecf0bccc3259c7ff55fb` | sin cambios |
| `backend/test/admin-unico.ataque.test.ts` | `388ad0e585639b8c3e0e0a6657fb42c1b9cb83db721c4863c4fa19e0be42ec85` | sin cambios |
| `backend/src/config/env.ataque.test.ts` | `4fce3cedf662ba3a188f21a2277db417747d342c115efd4746d3cff58499289b` | sin cambios |
| `frontend/src/services/apiClient.ataque.test.ts` | `10c730348d18ff8dae7b3623751d31122aa58560b564ad191717fa1938a6f8ce` | sin cambios |
| `frontend/src/app/router.ataque.test.tsx` | `e58293532633dc5cfe21561e2609d170638c81886b9c31129f03864c73a34f45` | sin cambios |
| `backend/test/intentos-r2.ataque.test.ts` | `a8b79d5ad98270be3747f493865708a78bb73add08d832584db4464c3582777a` | sin cambios |
| `backend/test/guarda-r2.ataque.test.ts` | `ea078f41cc98c947d9b3966ee8eccec2bd5d06eacbaf7ee8cd85f38e6a697c15` | sin cambios |
| `backend/test/nombres-tokens-r2.ataque.test.ts` | `00a6eb6f7ccd7d8790c356befcc96ddfda6eacce0be53de255cfe3626d8f2adb` | sin cambios |
| `backend/test/logs-r2.ataque.test.ts` | `5af3909e4b7ca485e78979567872ea78bf41e6d679b9ec2c761eaa0b250df689` | sin cambios |
| `frontend/src/app/sesion-r2.ataque.test.tsx` | `06f35be8ae68f0abae775268e4e64f3df880ff137a9b54aa3c135941ddb93dcf` | sin cambios |
| `backend/test/nombres-guarda-r3.ataque.test.ts` | `97b8d6f6c6b26b9b651eb0b46a48ed27b594a8ef659937eb600fde793f07e873` | sin cambios |
| `backend/test/cuentas-r1.ataque.test.ts` | `994a38f476d55f0b8826dc4b80e07dfb013f9034c7f7aee3cdc29dd74338b793` | sin cambios |
| `backend/test/worker-r1.ataque.test.ts` | `f4ea0bd908d8ec538aa479f9b09bf6fc6f86df6f93bb7abaaccd7001de876395` | sin cambios |
| `backend/test/logs-cuentas-r1.ataque.test.ts` | `a47af988453adcbc0e7ca710e670b5e2b9906e995ae6aa71e43fa8555764014c` | sin cambios |
| `backend/test/arquitectura-cuentas-r1.ataque.test.ts` | `42bb7bf3086230c6edc65ab73976ac8a801956336561aadbee65cc3b40eb8612` | sin cambios |
| `backend/test/arranque-r1.ataque.test.ts` | `aae65c95cf34db814d650af5f7fa08d09bff3e6fc6863d4252383058499aa10e` | sin cambios |
| `backend/src/config/logger.ataque.test.ts` | `43f1754c8c33f7de285ab77dbabb0f493422e858529432c9b2be26ff9423b01b` | sin cambios |
| `backend/src/config/correo.ataque.test.ts` | `bcce2cae771f97957d8691bef7fff4ec42412daaeabf726aeb0afc59f6f25671` | sin cambios |
| `backend/test/cuentas-r2.ataque.test.ts` | `736ae5fc909b5f53b6768010047378324e808c5bbe0434c0b0d140b58d0e598b` | sin cambios |
| `backend/test/worker-r2.ataque.test.ts` | `64aa76974c7ae3e89b2f1ed3d7efc7864d4323310932a9f46f02c798c363a6d2` | sin cambios |
| `backend/test/cuentas-r3.ataque.test.ts` | `a352625e291810251f41f53c3da37de82b662a20a82a66127f4d210ba6041b34` | sin cambios |
| `frontend/src/features/auth/enlace-r1.ataque.test.tsx` | `2584bd412e2d70e22a97cefeeb6278597d2e67ddf55f749bc739411ba432590a` | sin cambios |
| `frontend/src/app/cuentas-r1.ataque.test.tsx` | `a66120ed3c04a5c02dc64b33ad008be420739fa24eb67ac42d546429e74d7a4a` | sin cambios |
| `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` | `86adaa9a093a987dafd97e279e600211cbdf6cef97879d16fa2d8a9d2846f8b5` | sin cambios |
| `frontend/src/features/auth/enlace-r2.ataque.test.tsx` | `5fda63b653dbc0db6b1d16c3f26506f5fae630fdfd4a9921a9ef5db98e39d438` | sin cambios |
| `frontend/src/app/cuentas-r2.ataque.test.tsx` | `b61346baf0c3789fdc15eea548623afb4bf3dc8c230f1944df4336de3a27f9eb` | sin cambios |
| `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` | `b948e9359fd3981e08b850540027f536f345a3f48d7c0749ba0c16c2c1df1184` | sin cambios |
| `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` | `72bf9af4ce8f52a114897e038cefb0947841a37f74074f4c5f8dec68a71b654a` | sin cambios |
| `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` | `942df3015424aed56e83661993ba015e871cd6be8e797920d47e8cbf0c56eac4` | sin cambios |
| `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` | `3bd26e7e3bf019d462db4837861ed22017bbb9e9a6276720bf0dea6c2b5b0998` | sin cambios |
| `frontend/src/features/admin/foco-r1.ataque.test.tsx` | `8219c864e7bdc1315e6a0f0ff1cd6f54e4710cebdceb8e316f4e53aacc0cff35` | sin cambios |
| `frontend/src/app/en-espera-r1.ataque.test.tsx` | `bce6e497f61ed77d91b8d45958a4ad6f441be905deefa10d7f902155c850f57f` | sin cambios |
| `frontend/src/app/contexto-r1.ataque.test.tsx` | `03642a556e05eda6509853d38a5b6c27836643166e835075bf3b4ba1c580d892` | sin cambios |
| `frontend/src/app/errores-r1.ataque.test.tsx` | `2cfea81b66767023799188baa8babeab680360529a5de44eb5855d9032ae6413` | sin cambios |
| `frontend/src/styles/tokens-r1.ataque.test.ts` | `1ffcd996ba2f35ef9dbb3a2c209f314ed0df34c6d2ecef8b6369d23a4dbaed02` | sin cambios |
| `frontend/src/styles/clases-r1.ataque.test.ts` | `afb427a8379719aeb979414e328871cac0cbdd110541c6d9c1a7490907c6ad97` | **modificado en la ronda 1 de 01b-1 (V-07, igualdad exacta)** |
| `frontend/src/components/layout/pie-r1.ataque.test.tsx` | `0aaa18cd70465293b6fca6cc051b8e4ac360a838d02fede848c35376c3d0066c` | **nuevo (ronda 1 de 01b-1)** |
| `frontend/src/components/layout/estatico-r1.ataque.test.ts` | `2b3f64cf39d79e7fbe15ecab45364b6603a1fa26d2e05d72ab2e16550d218860` | **nuevo (ronda 1 de 01b-1)** |
| `frontend/src/app/fondo-r1.ataque.test.tsx` | `f95321e604e20b533ebf2db3c1c6c66ba2f2d87a48f075415b766551f6ee30f4` | **nuevo (ronda 1 de 01b-1)** |
| `frontend/src/app/marco-r1.ataque.test.tsx` | `ff15cb0b7b70918877d2c023886462229d5cc2aba8449353beb4154bdabe5552` | **nuevo (ronda 1 de 01b-1)** |

### Estado al terminar
- Escribí solo:
  - `frontend/src/styles/clases-r1.ataque.test.ts` (V-07);
  - los 4 `*.ataque` nuevos;
  - esta sección.
- Formateé solo esas 5 rutas, con `npx prettier --write <rutas>` desde `frontend/`.
- Git solo de lectura. No abrí navegadores ni corrí `npm run dev`. No leí ningún `.env`.
- Un error de comillas en uno de mis comandos dejó colgado un proceso `python` que yo mismo había arrancado; lo terminé. No toqué procesos ajenos.

## DESIGN-01b-1 — Ronda 2

# Reporte del Tester — DESIGN-01b-1 · fondo, marco, composición, pie y recorte de la sombra — Ronda 2
Veredicto: **ROTO**
Verificación propia:
- **lint:** código 0 desde `frontend/` y desde la raíz, con ESLint, `prettier --check` y `tsc -b`.
- **test (`frontend/`):** con mis pruebas, código 1. Son 47 archivos y 738 pruebas: 734 pasan y 4 fallan, todas de T-03. Sin `pie-r2`, las 686 pruebas del orquestador pasan.
- **build:** código 0. En `dist/`, `href:"#"` aparece 0 veces (V-10).

Hallazgos: **1**, de severidad **baja** (T-03, prueba en rojo). No hay hallazgos críticos, altos ni medios. T-01 y T-02 de la ronda 1 quedaron corregidos.

### Regresiones y comprobaciones repetidas
- **V-01:** `sha256sum -c` con la tabla de 43 de la ronda 1 da **43/43 OK** al empezar. Nadie modificó ninguna `*.ataque`, tampoco `pie-r1` (`0aaa18cd…`).
- **Mis pruebas de la ronda 1 y las 43 `*.ataque`:** pasan todas en la suite completa.
  - Las 3 de T-01 en `pie-r1` pasan sin cambios en el archivo (13/13).
  - Las 9 de `/acceso-restringido` (`router.ataque`, `cuentas-r1`, `cuentas-r2`, `en-espera-r1`, `contexto-r1` y `apiClient.ataque`) siguen en verde, con su hash sin cambios.
- **V-14:**
  1. `git diff --quiet e39500a` sobre `router.tsx` y las tres guardas da código 0.
  2. En el diff `-U0` de `acceso-restringido-view.tsx`, cada uno de los 10 textos fijos aparece 0 veces.
  3. Las cuatro líneas están en las líneas 21, 31, 42 y 43, en orden.
- **V-10:** `href:"#"` aparece 0 veces en el JS de `dist/`.

### Tareas de la ronda 2
- **Tarea 1. Descripciones de `tokens-r1.ataque.test.ts:185` y `:188`.** Solo cambió el cuarto elemento de esas dos tuplas, con los textos sugeridos por el arbitraje:
  - `:185`: `"Cargando y notas sobre el fondo (sin orbes en 01a)"` pasa a `"respaldo sólido: texto secundario sobre el fondo, sin vidrio"`;
  - `:188`: `"borde de 2 px de los campos y del outline opaco"` pasa a `"borde de 1 px de los campos (--input apunta a --field-border)"`. Lo confirmé en `tokens.css:16`: `--input: var(--field-border)`.

  Comprobación:
  - Formateé solo ese archivo y Prettier no hizo cambios.
  - `git diff --numstat` da 2 líneas agregadas y 2 quitadas, y el diff solo contiene esas dos cadenas.
  - No toqué los tokens, el fondo, el umbral ni la aserción.
  - **Por qué no debilita nada:** la descripción solo aparece en el nombre de la prueba y en el mensaje de la aserción.
- **Tarea 2. T-01, la guarda nueva.** Las 3 pruebas de `pie-r1` pasan sin cambios en el archivo. El archivo nuevo `pie-r2.ataque.test.tsx` agrega 52 pruebas:
  - **Controles en cualquier posición:** 20 casos, todos rechazados.
    - `\t`, `\n`, `\r`, `\r\n`, U+0000 y U+007F en medio;
    - U+007F al inicio y al final;
    - U+0001 en el esquema y U+001F en la ruta;
    - un `\t` en un `tel:`, y un `\n` o un U+0000 en un `mailto:`;
    - `\v` y `\f` en los extremos;
    - combinados con espacios en los dos órdenes y en los dos extremos.

    En el pie, ninguno sale como `<a>`: en desarrollo son marcadores y en producción no aparecen.
  - **`tel:+52 55 1234 5678`:** es publicable y sale como enlace con el `href` tal cual.
  - **Espacio en el dominio de un `https:`:** común, antes del punto o duro; ninguno sale.
  - **Formas de `javascript:`:** 21 casos, y ninguno pasa, ni suelto ni en el pie.
    - `javascript:` en mayúsculas o mezcladas, y partido con `\n`, `\t` o `\r`;
    - con un control o un espacio delante, o un U+0000 antes de los dos puntos;
    - con guion suave;
    - con entidades (`&colon;`, `&#58;`, `&#x09;`) o con `%6A`;
    - `javascript://…%0A`, `https:javascript:`, `vbscript:`, `data:`, `blob:` y `file:`.
- **Tarea 3. T-02, V-08 con el E-2 ampliado.** `git diff e39500a` de `format.ts`, `format.test.ts` y `layout/types.ts`, filtrado a las líneas quitadas, da **exactamente una**: `-import { formatearFechaHora } from "./format"`, sustituida por `+import { formatearFechaHora, inicialesDe } from "./format"`. Es la única que autoriza E-2. `main.tsx` (E-5) sigue sin líneas quitadas.
- **Tarea 4. O-3.** El texto nuevo de `DESIGN.md` §7.4 no contradice §5.
  - §5 dice "A menos de 640 px, los márgenes de la ventana bajan a 16 px".
  - §7.4 dice 16 px en la barra inferior y 24 px desde 768 px, y declara de forma explícita que entre 640 y 767 px el margen es de 16 px "y no de 24 como pide §5", marcado como propuesta.
  - El código coincide: `p-4` y `bottom-4` por debajo de `md`, y `md:p-6` desde 768 px.
  - El inicio de §7.4 (24 px) quedó intacto y describe el escritorio.

### Hallazgos

#### T-03 — Un carácter invisible de formato en el dominio sale como enlace real
Severidad: **baja**
Prueba: `frontend/src/components/layout/pie-r2.ataque.test.tsx`, "caracteres invisibles que el analizador quita en silencio". Son 4 casos: U+00AD (guion suave), U+200B (espacio de ancho cero), U+2060 (unión de palabras) y U+FEFF en medio.

**Esperado:** la razón de T-01, que ahora recoge §D-5, paso 2, es que "el analizador de URL quita en silencio … y el `href` saldría con ellos". Una URL con un carácter invisible que el analizador quita en silencio debería quedar como marcador en desarrollo y no publicarse.

**Obtenido:**
- Estos caracteres no son controles de U+0000 a U+001F ni U+007F, así que la guarda nueva no los ve.
- `trim()` no los quita en medio.
- El paso de mapeo de dominios del analizador de URL (IDNA) los elimina: `new URL("https://cole­gio.mx").href` da `"https://colegio.mx/"`.
- Resultado: `esUrlPublicable` devuelve `true` y el pie pinta `<a href="https://cole­gio.mx">`, con el carácter invisible dentro del `href`.

Es el mismo daño que T-01: un error de captura invisible que sale como enlace real y no queda a la vista. Un guion suave o un espacio de ancho cero llegan con facilidad al copiar una URL de un documento o de una página.

**Impacto:** el mismo de T-01. No abre ninguna vía de `javascript:` (`"java­script:"` falla en el analizador) y el navegador limpia el dominio al seguir el enlace.

**Nota para el árbitro:** el código cumple al pie de la letra la regla arbitrada, que se limita a U+0000–U+001F y U+007F. El hallazgo muestra que esa regla no cubre toda la intención de M-03. Decide el manager si entra en este encargo. No propongo corrección.

Requisito o regla violada: plan-01b.md §D-5, paso 2 (su razón, M-03 y T-01), y S-07.

### Atacado sin hallazgos
- Todo lo de las tareas 1 a 5.
- Además de lo atacado en la ronda 1, que sigue en verde: la guarda de controles en cualquier posición, los espacios en los extremos, los espacios en medio (`tel:`), y ninguna forma de `javascript:`.

### Observaciones para el manager (sin prueba en rojo; no las cuento como hallazgos)
- **O-5 · Un `mailto:` con un espacio en el dominio sí se publica.**
  - `new URL("mailto:contacto@cole gio.mx").href` conserva el espacio tal cual, porque el `mailto:` no tiene dominio que analizar. `esUrlPublicable` devuelve `true`.
  - El arbitraje dice "Un espacio en el dominio lo rechaza el propio analizador", y eso solo es cierto para `https:`.
  - No es una modificación en silencio: el `href` sale con el error a la vista y la regla arbitrada acepta espacios en medio. Por eso no lo cuento como hallazgo y lo quité de mis pruebas.
- **O-6 · `"tel:"` y `"mailto:"` vacíos se publican** como enlaces sin destino. S-07 no exige contenido después del esquema. Es un error de captura visible.
- **O-1 a O-4 de la ronda 1:** sin cambios. El arbitraje las dejó así, y O-3 ya está corregida (arriba).

### No atacado y por qué
- Todo lo que exige navegador (S-01), igual que en la ronda 1. **No verificado; lo decide el humano.**
- La rama de error de `AccesoRestringidoView`: sigue siendo inalcanzable por las rutas, igual que en la ronda 1.

### Justificación de cada cambio a una `*.ataque` existente
- **`frontend/src/styles/tokens-r1.ataque.test.ts`:** solo las dos descripciones de la tarea 1, dentro del alcance exacto del arbitraje. No toqué ninguna aserción, token ni umbral.
- No toqué ninguna otra `*.ataque` existente. `pie-r1`, `marco-r1`, `fondo-r1`, `estatico-r1` y `clases-r1` tienen el mismo hash que en la ronda 1.

### Tabla de hashes vigente (SHA-256) de las `*.ataque`: 43 previas + 1 nueva = 44
Rutas desde la raíz. `find backend frontend shared -name '*.ataque.test.*'` (sin `node_modules`) da 44. `sha256sum -c` desde la raíz da 44/44 OK. Contra la tabla de la ronda 1: 42 iguales, `tokens-r1` modificada y 1 nueva.

| Archivo | SHA-256 | Estado |
|---|---|---|
| `backend/test/auth-login.ataque.test.ts` | `2c83d82d10bdd9b7a969768774d75b18b7a71a594bbaac5fae36a0e134d2336c` | sin cambios |
| `backend/test/auth-registro.ataque.test.ts` | `73d3a2ae708a0ef676547a8094115b1419423057378387269bc3eadb34c7724e` | sin cambios |
| `backend/test/sesiones-y-cadena.ataque.test.ts` | `6e4b4677d73bde3d7c7845c729637186249e704f2aa803fb5efa25e76126b445` | sin cambios |
| `backend/test/api-real.ataque.test.ts` | `441a766a94e7d9b26807790402e06ed94d4cc378d8f6ecf0bccc3259c7ff55fb` | sin cambios |
| `backend/test/admin-unico.ataque.test.ts` | `388ad0e585639b8c3e0e0a6657fb42c1b9cb83db721c4863c4fa19e0be42ec85` | sin cambios |
| `backend/src/config/env.ataque.test.ts` | `4fce3cedf662ba3a188f21a2277db417747d342c115efd4746d3cff58499289b` | sin cambios |
| `frontend/src/services/apiClient.ataque.test.ts` | `10c730348d18ff8dae7b3623751d31122aa58560b564ad191717fa1938a6f8ce` | sin cambios |
| `frontend/src/app/router.ataque.test.tsx` | `e58293532633dc5cfe21561e2609d170638c81886b9c31129f03864c73a34f45` | sin cambios |
| `backend/test/intentos-r2.ataque.test.ts` | `a8b79d5ad98270be3747f493865708a78bb73add08d832584db4464c3582777a` | sin cambios |
| `backend/test/guarda-r2.ataque.test.ts` | `ea078f41cc98c947d9b3966ee8eccec2bd5d06eacbaf7ee8cd85f38e6a697c15` | sin cambios |
| `backend/test/nombres-tokens-r2.ataque.test.ts` | `00a6eb6f7ccd7d8790c356befcc96ddfda6eacce0be53de255cfe3626d8f2adb` | sin cambios |
| `backend/test/logs-r2.ataque.test.ts` | `5af3909e4b7ca485e78979567872ea78bf41e6d679b9ec2c761eaa0b250df689` | sin cambios |
| `frontend/src/app/sesion-r2.ataque.test.tsx` | `06f35be8ae68f0abae775268e4e64f3df880ff137a9b54aa3c135941ddb93dcf` | sin cambios |
| `backend/test/nombres-guarda-r3.ataque.test.ts` | `97b8d6f6c6b26b9b651eb0b46a48ed27b594a8ef659937eb600fde793f07e873` | sin cambios |
| `backend/test/cuentas-r1.ataque.test.ts` | `994a38f476d55f0b8826dc4b80e07dfb013f9034c7f7aee3cdc29dd74338b793` | sin cambios |
| `backend/test/worker-r1.ataque.test.ts` | `f4ea0bd908d8ec538aa479f9b09bf6fc6f86df6f93bb7abaaccd7001de876395` | sin cambios |
| `backend/test/logs-cuentas-r1.ataque.test.ts` | `a47af988453adcbc0e7ca710e670b5e2b9906e995ae6aa71e43fa8555764014c` | sin cambios |
| `backend/test/arquitectura-cuentas-r1.ataque.test.ts` | `42bb7bf3086230c6edc65ab73976ac8a801956336561aadbee65cc3b40eb8612` | sin cambios |
| `backend/test/arranque-r1.ataque.test.ts` | `aae65c95cf34db814d650af5f7fa08d09bff3e6fc6863d4252383058499aa10e` | sin cambios |
| `backend/src/config/logger.ataque.test.ts` | `43f1754c8c33f7de285ab77dbabb0f493422e858529432c9b2be26ff9423b01b` | sin cambios |
| `backend/src/config/correo.ataque.test.ts` | `bcce2cae771f97957d8691bef7fff4ec42412daaeabf726aeb0afc59f6f25671` | sin cambios |
| `backend/test/cuentas-r2.ataque.test.ts` | `736ae5fc909b5f53b6768010047378324e808c5bbe0434c0b0d140b58d0e598b` | sin cambios |
| `backend/test/worker-r2.ataque.test.ts` | `64aa76974c7ae3e89b2f1ed3d7efc7864d4323310932a9f46f02c798c363a6d2` | sin cambios |
| `backend/test/cuentas-r3.ataque.test.ts` | `a352625e291810251f41f53c3da37de82b662a20a82a66127f4d210ba6041b34` | sin cambios |
| `frontend/src/features/auth/enlace-r1.ataque.test.tsx` | `2584bd412e2d70e22a97cefeeb6278597d2e67ddf55f749bc739411ba432590a` | sin cambios |
| `frontend/src/app/cuentas-r1.ataque.test.tsx` | `a66120ed3c04a5c02dc64b33ad008be420739fa24eb67ac42d546429e74d7a4a` | sin cambios |
| `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` | `86adaa9a093a987dafd97e279e600211cbdf6cef97879d16fa2d8a9d2846f8b5` | sin cambios |
| `frontend/src/features/auth/enlace-r2.ataque.test.tsx` | `5fda63b653dbc0db6b1d16c3f26506f5fae630fdfd4a9921a9ef5db98e39d438` | sin cambios |
| `frontend/src/app/cuentas-r2.ataque.test.tsx` | `b61346baf0c3789fdc15eea548623afb4bf3dc8c230f1944df4336de3a27f9eb` | sin cambios |
| `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` | `b948e9359fd3981e08b850540027f536f345a3f48d7c0749ba0c16c2c1df1184` | sin cambios |
| `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` | `72bf9af4ce8f52a114897e038cefb0947841a37f74074f4c5f8dec68a71b654a` | sin cambios |
| `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` | `942df3015424aed56e83661993ba015e871cd6be8e797920d47e8cbf0c56eac4` | sin cambios |
| `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` | `3bd26e7e3bf019d462db4837861ed22017bbb9e9a6276720bf0dea6c2b5b0998` | sin cambios |
| `frontend/src/features/admin/foco-r1.ataque.test.tsx` | `8219c864e7bdc1315e6a0f0ff1cd6f54e4710cebdceb8e316f4e53aacc0cff35` | sin cambios |
| `frontend/src/app/en-espera-r1.ataque.test.tsx` | `bce6e497f61ed77d91b8d45958a4ad6f441be905deefa10d7f902155c850f57f` | sin cambios |
| `frontend/src/app/contexto-r1.ataque.test.tsx` | `03642a556e05eda6509853d38a5b6c27836643166e835075bf3b4ba1c580d892` | sin cambios |
| `frontend/src/app/errores-r1.ataque.test.tsx` | `2cfea81b66767023799188baa8babeab680360529a5de44eb5855d9032ae6413` | sin cambios |
| `frontend/src/styles/tokens-r1.ataque.test.ts` | `d81ed462116afdd16d4c8ad534941999487d8dbf5eb9dad22dd242cf68044115` | **modificado en la ronda 2 de 01b-1 (solo las descripciones de `:185` y `:188`)** |
| `frontend/src/styles/clases-r1.ataque.test.ts` | `afb427a8379719aeb979414e328871cac0cbdd110541c6d9c1a7490907c6ad97` | sin cambios |
| `frontend/src/components/layout/pie-r1.ataque.test.tsx` | `0aaa18cd70465293b6fca6cc051b8e4ac360a838d02fede848c35376c3d0066c` | sin cambios |
| `frontend/src/components/layout/estatico-r1.ataque.test.ts` | `2b3f64cf39d79e7fbe15ecab45364b6603a1fa26d2e05d72ab2e16550d218860` | sin cambios |
| `frontend/src/app/fondo-r1.ataque.test.tsx` | `f95321e604e20b533ebf2db3c1c6c66ba2f2d87a48f075415b766551f6ee30f4` | sin cambios |
| `frontend/src/app/marco-r1.ataque.test.tsx` | `ff15cb0b7b70918877d2c023886462229d5cc2aba8449353beb4154bdabe5552` | sin cambios |
| `frontend/src/components/layout/pie-r2.ataque.test.tsx` | `00a707429af6b5326f9a96def6382823cf4a6a092aac7e7bd7cbcb8dc9aa1d21` | **nuevo (ronda 2 de 01b-1)** |

### Estado al terminar
- Solo escribí:
  - `frontend/src/styles/tokens-r1.ataque.test.ts` (las dos descripciones);
  - el nuevo `frontend/src/components/layout/pie-r2.ataque.test.tsx`;
  - esta sección.
- Formateé solo esas dos rutas, con `npx prettier --write` desde `frontend/`.
- Git solo de lectura. No abrí navegadores ni corrí `npm run dev`. No leí ningún `.env` y no dejé procesos en marcha.

## DESIGN-01b-1 — Ronda 3

# Reporte del Tester — DESIGN-01b-1 · fondo, marco, composición, pie y recorte de la sombra — Ronda 3 (última)
Veredicto: **RESISTE**
Verificación propia:
- **lint:** código 0 desde `frontend/` y desde la raíz, con ESLint, `prettier --check` y `tsc -b`.
- **test:** código 0 en `frontend/`. Son 48 archivos y 806 pruebas en verde: las 740 de la corrida del orquestador más las 66 de `pie-r3`.
- **build:** código 0. El único aviso es el ya conocido de Vite sobre el bloque de más de 500 kB.

Hallazgos: **0**. T-01, T-02 y T-03 quedaron corregidos; no hay hallazgos críticos, altos, medios ni bajos.

### Comprobaciones
- **V-01:** `sha256sum -c` con la tabla de 44 de la ronda 2 da **44/44 OK**. Nadie modificó ninguna `*.ataque`:
  - `pie-r1` conserva el hash `0aaa18cd…`;
  - `pie-r2` conserva el hash `00a70742…`.
- **T-01 y T-03 sin tocar las pruebas:**
  - las 3 de T-01 en `pie-r1` y las 4 de T-03 en `pie-r2` pasan con sus archivos intactos;
  - las 44 `*.ataque` y la suite completa están en verde.
- **V-14:**
  1. `git diff --quiet e39500a` sobre `router.tsx` y las tres guardas da código 0.
  2. En el diff `-U0` de `acceso-restringido-view.tsx`, cada uno de los 10 textos fijos aparece 0 veces.
  3. Las cuatro líneas de §D-1 están en las líneas 21, 31, 42 y 43, en orden.
- **Las 9 `*.ataque` de `/acceso-restringido`:** siguen en verde, con su hash sin cambios.
- **V-08:**
  - **`plan-01b.md` contra `8feab74`:** `git diff --numstat` da **17 líneas agregadas y 11 quitadas**, y `git diff -U0` da **10 tramos**. Coincide con los dos arbitrajes autorizados.
  - **E-2:** en `format.ts`, `format.test.ts` y `layout/types.ts` solo se quita `-import { formatearFechaHora } from "./format"`, que es la única línea permitida.
  - **E-5:** en `main.tsx` no se quita ninguna línea.
  - **"No se toca" del frontend:** sin cambios contra `e39500a`. Revisé `features/auth/{data,hooks,lib,types}.ts`, los 5 `formulario-*.tsx`, `components/ui/`, `services/`, `features/diagnostico/`, `features/admin/components/`, `providers.tsx`, `index.css`, `index.html`, `package.json`, `vite.config.ts`, `vitest.config.ts` y `src/test/`.
  - **Lista de archivos del frontend:** 20 modificados y 20 nuevos, igual que en las rondas anteriores más mis `*.ataque`.
  - **Fuera de `frontend/`:** solo cambian `docs/` de esta carpeta (entregables, `aprobacion.md`, `plan-01b.md` por los arbitrajes y `revision.md`), `docs/DESIGN.md` (E-1) y `docs/ESTADO.md`.
- **V-10:** en el JS de `dist/`, `href:"#"` aparece 0 veces.

### Ataque a la regla nueva (archivo nuevo: `frontend/src/components/layout/pie-r3.ataque.test.tsx`, 66 pruebas, todas en verde)
- **Las 4 URL publicables** (`https://colegio.mx`, `mailto:contacto@colegio.mx`, `tel:+525555555555` y `tel:+52 55 1234 5678`) son publicables. Con `PROD` en `false` y en `true`, salen como enlace en su orden, con el `href` exacto y sin marcadores.
- **54 URL que el analizador acepta pero reescribe.** Una precondición comprueba en jsdom que el analizador de verdad cambia cada una. Ninguna es publicable:
  - en desarrollo, las 54 quedan como marcadores, en orden y sin ningún `<a>`;
  - en producción, no sale nada: ni `<a>`, ni marcador, ni la lista.

  La lista cubre:
  - mayúsculas en el esquema o en el dominio;
  - el puerto por defecto y con cero a la izquierda;
  - acentos y caracteres de ancho completo en el dominio;
  - espacios y caracteres fuera de ASCII en la ruta, la consulta y el fragmento;
  - `.` y `..` en la ruta, y `?` o `#` vacíos o con contenido detrás de un dominio sin ruta;
  - `https:` sin barras, con una barra o con barra invertida;
  - direcciones IP en forma decimal, hexadecimal, abreviada y IPv6 sin comprimir;
  - guion suave, espacio de ancho cero, U+2060, U+FEFF, U+034F y U+180E en el dominio;
  - U+200B, U+202E, U+200E y U+2066 en la ruta, la consulta y el fragmento;
  - caracteres invisibles o fuera de ASCII en un `mailto:` y en un `tel:`;
  - espacios y controles en los extremos y en medio;
  - un `tel:` con espacio al final.
- **Mezcla:** con las 54 reescritas intercaladas con las 4 publicables, en los dos modos solo salen las 4 publicables, en su orden.
- **Barrido.** Inserté un carácter en cada posición de las 4 URL publicables y de una URL con ruta, consulta y fragmento: **más de 30 000 casos**, con estos caracteres:
  - los controles C0, el espacio, DEL y los controles C1;
  - U+00A0 y los de U+2000 a U+206F (espacios, marcas de dirección y caracteres de formato);
  - los selectores de variante U+FE00 a U+FE0F y las etiquetas U+E0020 a U+E007F;
  - U+00AD, U+034F, U+061C, U+115F, U+1160, U+17B4, U+17B5, U+180E, U+3000, U+3164, U+FEFF, U+FFA0, U+FFF9 a U+FFFB, U+E0001, U+E0100 y U+1D173.

  Resultado:
  - **ninguna URL publicable lleva un carácter invisible o de control.** Solo tienen ASCII visible, más espacios en `tel:` o `mailto:`, donde el analizador los deja tal cual;
  - toda URL publicable del barrido es exactamente la que usa el navegador.

  Antes corrí el mismo barrido en Node, con 40 170 casos: 0 casos malos.

### Observaciones (no son hallazgos, según el alcance que fijó el arbitraje)
- **O-7 · Una URL con usuario o contraseña se publica tal cual.** Por ejemplo, `https://colegio.mx@otro-sitio.mx` va en realidad a `otro-sitio.mx`, y `https://user:pass@colegio.mx` también pasa.
  - La regla se cumple: el analizador no las cambia.
  - Es el "Alcance de la regla" de §D-5: la regla no comprueba que el destino sea el esperado.
  - Lo cubre la revisión humana de las URL reales antes de DEPLOY.
- **O-8 · Una secuencia ya codificada se publica tal cual.** Por ejemplo, `https://colegio.mx/%E2%80%8B` (un espacio de ancho cero ya codificado) o `https://colegio.mx/a%0Ab`.
  - No es un cambio en silencio: el `href` es exactamente lo escrito y el código es visible en el texto.
  - Queda dentro del alcance aceptado.
- **O-9 · Un puerto que no es el por defecto se publica tal cual**, por ejemplo `https://colegio.mx:8443`. Es correcto según la regla y lo dejo solo como nota.
- **O-5 y O-6** (espacio en el dominio de un `mailto:`, y `tel:` o `mailto:` vacíos) siguen igual. Ahora están escritas en §D-5 como límite de la regla, así que no son hallazgos.
- **O-1, O-2 y O-4 de la ronda 1:** sin cambios, como decidió el arbitraje.

### No atacado y por qué
- **Todo lo que exige navegador** (S-01): orbes, rendimiento, contraste medido, sombra real, barra inferior a 360 y 767 px y área segura de iOS. **No verificado; lo decide el humano en la comprobación completa.**
- **Fuera del alcance cerrado de la ronda 3:** no volví a atacar el marco, el fondo ni la composición más allá de repetir mis pruebas de las rondas 1 y 2, que siguen en verde.

### Justificación de cada cambio a una `*.ataque` existente
Ninguno. En esta ronda no modifiqué ninguna `*.ataque` existente; solo agregué `pie-r3.ataque.test.tsx`.

### Tabla de hashes vigente (SHA-256) de las `*.ataque`: 44 previas + 1 nueva = 45
Rutas desde la raíz. `find backend frontend shared -name '*.ataque.test.*'`, sin `node_modules`, da 45. `sha256sum -c` desde la raíz da 45/45 OK. Contra la tabla de la ronda 2: 44 iguales y 1 nueva.

| Archivo | SHA-256 | Estado |
|---|---|---|
| `backend/test/auth-login.ataque.test.ts` | `2c83d82d10bdd9b7a969768774d75b18b7a71a594bbaac5fae36a0e134d2336c` | sin cambios |
| `backend/test/auth-registro.ataque.test.ts` | `73d3a2ae708a0ef676547a8094115b1419423057378387269bc3eadb34c7724e` | sin cambios |
| `backend/test/sesiones-y-cadena.ataque.test.ts` | `6e4b4677d73bde3d7c7845c729637186249e704f2aa803fb5efa25e76126b445` | sin cambios |
| `backend/test/api-real.ataque.test.ts` | `441a766a94e7d9b26807790402e06ed94d4cc378d8f6ecf0bccc3259c7ff55fb` | sin cambios |
| `backend/test/admin-unico.ataque.test.ts` | `388ad0e585639b8c3e0e0a6657fb42c1b9cb83db721c4863c4fa19e0be42ec85` | sin cambios |
| `backend/src/config/env.ataque.test.ts` | `4fce3cedf662ba3a188f21a2277db417747d342c115efd4746d3cff58499289b` | sin cambios |
| `frontend/src/services/apiClient.ataque.test.ts` | `10c730348d18ff8dae7b3623751d31122aa58560b564ad191717fa1938a6f8ce` | sin cambios |
| `frontend/src/app/router.ataque.test.tsx` | `e58293532633dc5cfe21561e2609d170638c81886b9c31129f03864c73a34f45` | sin cambios |
| `backend/test/intentos-r2.ataque.test.ts` | `a8b79d5ad98270be3747f493865708a78bb73add08d832584db4464c3582777a` | sin cambios |
| `backend/test/guarda-r2.ataque.test.ts` | `ea078f41cc98c947d9b3966ee8eccec2bd5d06eacbaf7ee8cd85f38e6a697c15` | sin cambios |
| `backend/test/nombres-tokens-r2.ataque.test.ts` | `00a6eb6f7ccd7d8790c356befcc96ddfda6eacce0be53de255cfe3626d8f2adb` | sin cambios |
| `backend/test/logs-r2.ataque.test.ts` | `5af3909e4b7ca485e78979567872ea78bf41e6d679b9ec2c761eaa0b250df689` | sin cambios |
| `frontend/src/app/sesion-r2.ataque.test.tsx` | `06f35be8ae68f0abae775268e4e64f3df880ff137a9b54aa3c135941ddb93dcf` | sin cambios |
| `backend/test/nombres-guarda-r3.ataque.test.ts` | `97b8d6f6c6b26b9b651eb0b46a48ed27b594a8ef659937eb600fde793f07e873` | sin cambios |
| `backend/test/cuentas-r1.ataque.test.ts` | `994a38f476d55f0b8826dc4b80e07dfb013f9034c7f7aee3cdc29dd74338b793` | sin cambios |
| `backend/test/worker-r1.ataque.test.ts` | `f4ea0bd908d8ec538aa479f9b09bf6fc6f86df6f93bb7abaaccd7001de876395` | sin cambios |
| `backend/test/logs-cuentas-r1.ataque.test.ts` | `a47af988453adcbc0e7ca710e670b5e2b9906e995ae6aa71e43fa8555764014c` | sin cambios |
| `backend/test/arquitectura-cuentas-r1.ataque.test.ts` | `42bb7bf3086230c6edc65ab73976ac8a801956336561aadbee65cc3b40eb8612` | sin cambios |
| `backend/test/arranque-r1.ataque.test.ts` | `aae65c95cf34db814d650af5f7fa08d09bff3e6fc6863d4252383058499aa10e` | sin cambios |
| `backend/src/config/logger.ataque.test.ts` | `43f1754c8c33f7de285ab77dbabb0f493422e858529432c9b2be26ff9423b01b` | sin cambios |
| `backend/src/config/correo.ataque.test.ts` | `bcce2cae771f97957d8691bef7fff4ec42412daaeabf726aeb0afc59f6f25671` | sin cambios |
| `backend/test/cuentas-r2.ataque.test.ts` | `736ae5fc909b5f53b6768010047378324e808c5bbe0434c0b0d140b58d0e598b` | sin cambios |
| `backend/test/worker-r2.ataque.test.ts` | `64aa76974c7ae3e89b2f1ed3d7efc7864d4323310932a9f46f02c798c363a6d2` | sin cambios |
| `backend/test/cuentas-r3.ataque.test.ts` | `a352625e291810251f41f53c3da37de82b662a20a82a66127f4d210ba6041b34` | sin cambios |
| `frontend/src/features/auth/enlace-r1.ataque.test.tsx` | `2584bd412e2d70e22a97cefeeb6278597d2e67ddf55f749bc739411ba432590a` | sin cambios |
| `frontend/src/app/cuentas-r1.ataque.test.tsx` | `a66120ed3c04a5c02dc64b33ad008be420739fa24eb67ac42d546429e74d7a4a` | sin cambios |
| `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` | `86adaa9a093a987dafd97e279e600211cbdf6cef97879d16fa2d8a9d2846f8b5` | sin cambios |
| `frontend/src/features/auth/enlace-r2.ataque.test.tsx` | `5fda63b653dbc0db6b1d16c3f26506f5fae630fdfd4a9921a9ef5db98e39d438` | sin cambios |
| `frontend/src/app/cuentas-r2.ataque.test.tsx` | `b61346baf0c3789fdc15eea548623afb4bf3dc8c230f1944df4336de3a27f9eb` | sin cambios |
| `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` | `b948e9359fd3981e08b850540027f536f345a3f48d7c0749ba0c16c2c1df1184` | sin cambios |
| `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` | `72bf9af4ce8f52a114897e038cefb0947841a37f74074f4c5f8dec68a71b654a` | sin cambios |
| `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` | `942df3015424aed56e83661993ba015e871cd6be8e797920d47e8cbf0c56eac4` | sin cambios |
| `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` | `3bd26e7e3bf019d462db4837861ed22017bbb9e9a6276720bf0dea6c2b5b0998` | sin cambios |
| `frontend/src/features/admin/foco-r1.ataque.test.tsx` | `8219c864e7bdc1315e6a0f0ff1cd6f54e4710cebdceb8e316f4e53aacc0cff35` | sin cambios |
| `frontend/src/app/en-espera-r1.ataque.test.tsx` | `bce6e497f61ed77d91b8d45958a4ad6f441be905deefa10d7f902155c850f57f` | sin cambios |
| `frontend/src/app/contexto-r1.ataque.test.tsx` | `03642a556e05eda6509853d38a5b6c27836643166e835075bf3b4ba1c580d892` | sin cambios |
| `frontend/src/app/errores-r1.ataque.test.tsx` | `2cfea81b66767023799188baa8babeab680360529a5de44eb5855d9032ae6413` | sin cambios |
| `frontend/src/styles/tokens-r1.ataque.test.ts` | `d81ed462116afdd16d4c8ad534941999487d8dbf5eb9dad22dd242cf68044115` | sin cambios |
| `frontend/src/styles/clases-r1.ataque.test.ts` | `afb427a8379719aeb979414e328871cac0cbdd110541c6d9c1a7490907c6ad97` | sin cambios |
| `frontend/src/components/layout/pie-r1.ataque.test.tsx` | `0aaa18cd70465293b6fca6cc051b8e4ac360a838d02fede848c35376c3d0066c` | sin cambios |
| `frontend/src/components/layout/estatico-r1.ataque.test.ts` | `2b3f64cf39d79e7fbe15ecab45364b6603a1fa26d2e05d72ab2e16550d218860` | sin cambios |
| `frontend/src/app/fondo-r1.ataque.test.tsx` | `f95321e604e20b533ebf2db3c1c6c66ba2f2d87a48f075415b766551f6ee30f4` | sin cambios |
| `frontend/src/app/marco-r1.ataque.test.tsx` | `ff15cb0b7b70918877d2c023886462229d5cc2aba8449353beb4154bdabe5552` | sin cambios |
| `frontend/src/components/layout/pie-r2.ataque.test.tsx` | `00a707429af6b5326f9a96def6382823cf4a6a092aac7e7bd7cbcb8dc9aa1d21` | sin cambios |
| `frontend/src/components/layout/pie-r3.ataque.test.tsx` | `472e1f46d0c899496aa334909b02988962aab07b9bd29a8d7b8af3987fac6c76` | **nuevo (ronda 3 de 01b-1)** |

### Estado al terminar
- Solo escribí el nuevo `frontend/src/components/layout/pie-r3.ataque.test.tsx` y esta sección.
- Formateé solo ese archivo, con `npx prettier --write` desde `frontend/`.
- Git solo de lectura. No abrí navegadores ni corrí `npm run dev`, y no leí ningún `.env`.
- El barrido de Node lo corrí como script en el scratchpad y terminó solo. No dejé procesos en marcha.
