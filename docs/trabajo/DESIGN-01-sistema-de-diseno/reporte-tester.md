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
