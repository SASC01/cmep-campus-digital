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
