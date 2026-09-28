# Comprobación del humano — DESIGN-01

## DESIGN-01a

Hoja para llenar. Sale de `plan.md`, "Comprobación del humano en su navegador (DESIGN-01a)". Ningún agente hace esta comprobación.

- **Navegador:** Chrome o Edge, con el zoom al 100 %.
- **Anchos:** cada pantalla, a **1280 × 800** y a **360 × 800**, con el modo de dispositivo de DevTools (Ctrl+Shift+M y dimensiones "Responsive").
- **Cómo anotar:**
  - Marca `[x]` lo que se ve bien.
  - Si algo se ve mal, deja la casilla vacía y escribe qué viste en "Notas".
  - Si algo no se puede comprobar, escribe **no verificada** y el motivo.
- **Lo que no es de 01a:** el fondo todavía es plano, sin orbes, y la composición de las pantallas es la de antes. Las dos cosas llegan con 01b, así que no cuentan como defecto.

> **Comprobación suspendida por el humano (2026-09-27).** Hizo solo el bloque del login y suspendió el resto:
>
> > Sin orbes el vidrio no se aprecia y no tiene sentido juzgarlo sobre fondo plano. Haré UNA comprobación completa (H-01 a H-10 y la tabla de contraste) después de 01b, incluyendo H-05 y H-06. El PR no se abre hasta que esa comprobación pase.
>
> **Resultado parcial (bloque del login), transcrito por el orquestador:**
> - **H-01, fuentes:** pasa a 1280 y a 360 px.
> - **H-02 en `/login`:** pasa a 1280 y a 360 px, salvo el borde de los campos.
> - **H-04, foco en `/login`:** pasa a 1280 y a 360 px, salvo el borde de los campos.
> - **S-07, foco blanco por dentro en el botón azul:** confirmado.
> - **Anillo de foco de los enlaces:** le gusta al humano; se queda.
> - **Borde de los campos: no pasa.** El de 2 px color tinta es demasiado pesado, y al enfocar queda el anillo azul encima del borde oscuro. Se corrige en el cierre de 01a:
>   - un borde más ligero, con contraste mínimo de 3:1 contra el vidrio en el peor caso, contando los orbes de 01b;
>   - al enfocar, el borde pasa a `--accent`.
> - **Rectángulo grisáceo** detrás de las tarjetas de avisos del login, visible entre ellas y debajo. Se investiga y se corrige en el cierre de 01a si no es intencional.
>
> Lo demás de esta hoja (H-02 fuera del login, H-03 y H-05 a H-10, y la tabla C-01 a C-12) queda para la comprobación completa después de 01b. En esa comprobación se repiten todos los puntos, también los que ya pasaron. La hoja de esa comprobación se prepara con 01b.

---

### 1. Levantar todo en local

Abre **cuatro ventanas de PowerShell**, una por servicio, en este orden. No hace falta `npm install`, porque las dependencias ya están instaladas. Tampoco hace falta migrar: `campus_dev` ya tiene las 3 migraciones y este encargo no agrega ninguna.

**Ventana 1 · infra** (Docker Desktop tiene que estar encendido)
```powershell
Set-Location C:\Users\Carlos\Documents\Proyecto_PlataformaEducativa\infra
docker compose up -d
docker compose ps -a
```
Debes ver `postgres`, `minio` y `livekit` en `running (healthy)`, y `minio-init` en `exited (0)`.

**Ventana 2 · API**
```powershell
Set-Location C:\Users\Carlos\Documents\Proyecto_PlataformaEducativa\backend
npm run dev
```
Espera a que escuche en `http://127.0.0.1:3000`. Para comprobarlo, en cualquier otra ventana:
```powershell
curl.exe http://127.0.0.1:3000/api/salud
```
Debe responder `"estado":"ok"` y `"baseDeDatos":"ok"`.

**Ventana 3 · worker** (escribe los correos de recuperación e invitación)
```powershell
Set-Location C:\Users\Carlos\Documents\Proyecto_PlataformaEducativa\backend
npm run dev:worker
```
Debe registrar `"evento":"worker_listo"`.

**Ventana 4 · frontend**
```powershell
Set-Location C:\Users\Carlos\Documents\Proyecto_PlataformaEducativa\frontend
npm run dev
```

**URL que abres:** `http://127.0.0.1:5173/login`. Usa `127.0.0.1`, no `localhost`.

**Para abrir el último correo** (recuperación o invitación), desde cualquier ventana:
```powershell
Set-Location C:\Users\Carlos\Documents\Proyecto_PlataformaEducativa
Invoke-Item (Get-ChildItem backend\tmp\correos | Sort-Object LastWriteTime | Select-Object -Last 1).FullName
```

**Para apagar al terminar:** Ctrl+C en las ventanas 2, 3 y 4. Después, en la ventana 1:
```powershell
docker compose stop
```
Los datos se conservan. Si el puerto 3000 o el 5173 está ocupado, consulta `README.md`, "Problemas frecuentes".

---

### 2. Cuentas

Aquí no va ninguna contraseña. Los correos ficticios `@pruebas.local` pueden quedarse en `campus_dev`.

| Cuenta | Cuál es | Cómo la obtienes | Para qué |
|---|---|---|---|
| **A · Admin** | La de `ADMIN_EMAIL` en `backend/.env`; su contraseña es `ADMIN_PASSWORD` del mismo archivo | Ya existe | `/admin`: H-03, H-05 ("Sí, restablecer"), H-06, H-07, C-11 y C-12 |
| **B · Tu estudiante** | La cuenta de estudiante que ya creaste en `campus_dev` | Ya existe | `/estudiante` (bienvenida) en H-02 y H-04. **No la uses** en flujos que cambian la contraseña |
| **C · Estudiante de prueba** | Correo ficticio, por ejemplo `estudiante-design01@pruebas.local` | Créala en `/registro` (paso 3 del recorrido) | Recuperar y restablecer, cambio obligatorio y la cuenta que el admin restablece en H-05 y H-06 |
| **D · Maestro de prueba** | Correo ficticio, por ejemplo `maestro-design01@pruebas.local` | Invítalo desde `/admin` con la cuenta A; el enlace queda en `backend/tmp/correos/` | C-11, `/establecer-contrasena` y `/maestro` |
| **E · Registro en espera** | Otro correo ficticio nuevo, por ejemplo `espera-design01@pruebas.local` | Se crea al probar "Crear cuenta" en H-05 | Solo H-05 |

**Límites que conviene recordar**
- El login admite 5 intentos fallidos cada 15 minutos por correo e IP. Para C-05 usa un correo que no exista (por ejemplo, `nadie@pruebas.local`), no el de una cuenta real.
- La recuperación admite 3 solicitudes por hora.
- La contraseña temporal se muestra una sola vez. Cada "Sí, restablecer" crea una nueva e invalida la anterior: **para el paso 6, usa la última que viste**.
- `/acceso-restringido` necesita un estudiante restringido, y todavía no hay pantalla para restringir. No se altera la base a mano: queda **no verificada** (la cubren las pruebas de jsdom).

**Recorrido sugerido** (evita repetir pasos)
1. Sin sesión: `/diagnostico` (H-01).
2. `/login`: H-02, H-04 y C-01 a C-08.
3. `/registro`: crea la cuenta C (H-02 y C-10). Quedas en `/estudiante`; usa "Cerrar sesión".
4. `/recuperar` con el correo de C y su confirmación. Abre el correo y sigue el enlace a `/restablecer` (enlace real). Después abre `http://127.0.0.1:5173/restablecer` sin token (enlace inválido).
5. Entra con la cuenta A a `/admin`:
   - invita a D (C-11);
   - busca a C y restablece su contraseña (H-05, H-06, H-07 y C-12);
   - revisa H-03.
   - Al terminar, cierra sesión.
6. Entra con C y la **última** temporal: llegas a `/cambiar-contrasena` (H-02 y C-09). Elige una contraseña propia.
7. Abre el correo de D y sigue el enlace a `/establecer-contrasena` (H-02). Entra con D a `/maestro`.
8. Entra con B a `/estudiante` (H-04).
9. H-05 en login y registro, H-08 y H-10.

---

### 3. Comprobaciones H-01 a H-10

#### H-01 · Fuentes
- **Pantallas:** `/diagnostico` y `/login`.
- **Qué haces:**
  1. DevTools › Network, filtro **Font**, y recarga la página.
  2. Elements: selecciona un párrafo y luego un título. Mira Computed › "Rendered Fonts".
  3. En `/diagnostico`, selecciona el valor de "Última respuesta". En Styles, agrega y quita `font-variant-numeric: tabular-nums`.
- **Qué debes ver:**
  - Solo archivos `.woff2` servidos por `127.0.0.1:5173`, nada de `fonts.googleapis.com` ni `fonts.gstatic.com`.
  - "Atkinson Hyperlegible Next" en el texto y "Bricolage Grotesque" en los títulos.
  - Con `tabular-nums`, las cifras ocupan el mismo ancho.
  - El texto se lee cómodo a 16 px y a 360 px de ancho.
- [ X] 1280 px  [x] 360 px (marcada por el orquestador a pedido del humano: "H-01 a 360 px: pasa (lo revisé junto con el login a 360)", 2026-09-27)
- Notas:

#### H-02 · Materiales y controles
- **Pantallas:**
  - `/login` y `/registro`;
  - `/recuperar` y su confirmación después de enviar;
  - `/restablecer`, sin token (enlace inválido) y con un enlace real;
  - `/establecer-contrasena` (enlace de D);
  - `/cambiar-contrasena` (cuenta C con la temporal);
  - `/estudiante` y `/maestro` (bienvenida).
- **Qué haces:** mira cada pantalla completa.
- **Qué debes ver:**
  - Paneles de vidrio translúcido, con borde blanco y un brillo fino en el filo superior, sobre el fondo plano.
  - Botones en forma de píldora.
  - Campos blancos con borde tinta de 2 px.
  - Títulos en Bricolage Grotesque.
  - El fondo sin orbes: es lo esperado en 01a.

| Pantalla | 1280 px | 360 px | Notas |
|---|---|---|---|
| `/login` | [ ] | [ ] | |
| `/registro` | [ ] | [ ] | |
| `/recuperar` | [ ] | [ ] | |
| `/recuperar`, confirmación | [ ] | [ ] | |
| `/restablecer`, sin token | [ ] | [ ] | |
| `/restablecer`, con enlace real | [ ] | [ ] | |
| `/establecer-contrasena` | [ ] | [ ] | |
| `/cambiar-contrasena` | [ ] | [ ] | |
| `/estudiante` | [ ] | [ ] | |
| `/maestro` | [ ] | [ ] | |
| `/acceso-restringido` | no verificada | no verificada | Sin pantalla para restringir a un estudiante |

#### H-03 · Admin opaco y denso
- **Pantalla:** `/admin` (cuenta A).
- **Qué haces:**
  1. Elements: selecciona un panel y un botón, y mira Computed › `backdrop-filter`.
  2. Selecciona un botón y un campo, y mira Computed › `height` en cada ancho de la tabla.
  3. Selecciona un campo y mira Computed › `font-size`.
- **Qué debes ver:**
  - Ningún panel ni botón translúcido: `backdrop-filter` en `none`.
  - Alturas: 36 px a 1280 y a 768; 44 px a 767 y a 360.
  - El texto de los campos, a 16 px en todos los anchos.

| Ancho | `backdrop-filter: none` | Altura de botones y campos | Texto de campos a 16 px |
|---|---|---|---|
| 1280 px | [ ] | [ ] 36 px | [ ] |
| 768 px | [ ] | [ ] 36 px | [ ] |
| 767 px | [ ] | [ ] 44 px | [ ] |
| 360 px | [ ] | [ ] 44 px | [ ] |

- Notas:

#### H-04 · Foco
- **Pantallas:** todas las de H-02, más `/admin`.
- **Qué haces:** recorre cada pantalla con Tab y Shift+Tab.
- **Qué debes ver:**
  - Un contorno azul de 2 px, separado del control, en cada elemento que recibe el foco.
  - En los botones azules y rojos, el contorno va **blanco por dentro** (decisión S-07).
- [ ] 1280 px  [ ] 360 px
- S-07, foco blanco por dentro: [ ] lo confirmo  [ ] lo corrijo así:
- Notas:

#### H-05 · Botón en espera (MF-05)
- **Qué haces:**
  1. DevTools › Network › limitación **Slow 4G** (o 3G). Deja visible la lista de peticiones.
  2. En `/login`, escribe el correo y la contraseña de la cuenta C y pulsa "Iniciar sesión".
  3. Mientras la petición está en vuelo, intenta enviarla de nuevo de cuatro formas:
     - otro clic en el botón;
     - Enter sobre el botón;
     - **Espacio** sobre el botón;
     - Enter desde el campo de contraseña.
  4. Repite en `/registro` con la cuenta E ("Crear cuenta").
  5. Repite en `/admin` con "Sí, restablecer" sobre la cuenta C.
- **Qué debes ver:**
  - El foco se queda en el botón y aparece el indicador de carga.
  - En Network hay **una sola** petición a `/api/auth/login`, a `/api/auth/registro` o a `/api/admin/usuarios/{id}/restablecer-contrasena`, según el caso.

| Botón | Una sola petición | Foco e indicador | Notas |
|---|---|---|---|
| "Iniciar sesión" | [ ] | [ ] | |
| "Crear cuenta" | [ ] | [ ] | |
| "Sí, restablecer" | [ ] | [ ] | |

- Anchos: [ ] 1280 px  [ ] 360 px

#### H-06 · T-14 en Chrome o Edge
- **Pantalla:** `/admin` (cuenta A), con la red en Slow 4G.
- **Qué haces:**
  1. Busca la cuenta C y pulsa "Restablecer contraseña" y luego "Sí, restablecer", con el ratón.
  2. Sin esperar, haz clic en "Nombre completo" (bloque "Invitar a un maestro") y escribe.
  3. Repite, pero antes de ir al campo haz clic en un texto normal de la página, donde no haya control.
- **Qué debes ver:** al llegar la temporal, el foco se queda en tu campo y sigues escribiendo sin perder letras. No salta a "Copiar" ni a "Cancelar".
- Directo al campo: [ ] 1280 px  [ ] 360 px
- Clic en el texto y luego al campo: [ ] 1280 px  [ ] 360 px
- Notas:

#### H-07 · Aviso de "Copiar"
- **Pantalla:** `/admin`, con una temporal a la vista.
- **Qué haces:**
  1. Pulsa "Copiar". El aviso aparece arriba a la derecha; si pasas el ratón encima, no se cierra.
  2. Para ver el aviso de error, bloquea el portapapeles del sitio: icono a la izquierda de la dirección › Configuración del sitio › Portapapeles › Bloquear. Recarga y vuelve a copiar.
  3. Al terminar, devuelve el permiso del portapapeles a "Preguntar".
- **Qué debes ver:**
  - "Contraseña copiada": fondo blanco, borde, esquinas de 14 px, sombra suave e **icono verde**.
  - "No pudimos copiarla. Cópiala a mano.": **icono rojo**.
- Éxito: [ ] 1280 px  [ ] 360 px
- Error: [ ] 1280 px  [ ] 360 px
- Notas:

#### H-08 · Movimiento reducido
- **Qué haces:**
  1. DevTools › Ctrl+Shift+P › "Show Rendering" › "Emulate CSS media feature prefers-reduced-motion" › `reduce`. Red en Slow 4G.
  2. Pulsa "Iniciar sesión" con la cuenta C.
  3. Recarga `/estudiante` o `/admin` para ver el indicador "Cargando".
- **Qué debes ver:** el indicador del botón y el de "Cargando" **no giran**, y su texto se queda.
- [ ] 1280 px  [ ] 360 px
- Notas:

#### H-09 · Contraste medido en navegador
Mide cada par de la tabla C-01 a C-12 (sección 4):
1. Zoom al 100 %. En Elements, selecciona el elemento del texto.
2. En Styles, haz clic en la muestra de color de su propiedad `color` y despliega "Contrast ratio".
3. Si DevTools no puede determinar el fondo (pasa con el vidrio), usa el gotero del fondo ("Pick background color") y haz clic en un pixel del fondo pegado al texto, no sobre las letras.
4. Anota la razón y el hexadecimal del fondo. Cierra con Esc sin guardar cambios.
5. Para C-07 y C-08, que no son texto, o si tu DevTools no ofrece el gotero del fondo: con el gotero, lee el hexadecimal del borde o del anillo y el del pixel de al lado, y anótalos. La razón la calculo yo con la fórmula de `tokens.test.ts`.

Un "no pasa" se escala antes del commit. Los pares sobre los orbes se miden en 01b.
- [ ] Tabla completa

#### H-10 · Parecido general
- **Qué haces:** compara las pantallas con `docs/design/referencia-direccion-d3.png` en materiales, tipografía, botones y campos. La composición y el fondo son de 01b.
- **Detalles que decides aquí**, por el manager:
  - **Enlaces a 360 px:** el tamaño `enlace` no hace salto de línea (`whitespace-nowrap`). El más largo, "¿Ya tienes cuenta? Inicia sesión" en `/registro`, cabe sin margen. ¿Lo dejas así o prefieres que pueda partirse en dos líneas?
    - [ ] Así está bien  [ ] Que pueda partirse
  - **Títulos de los anuncios en el panel del login:** a 360 px van en el tamaño del texto (`text-body`) y a 1280 px como subtítulo (`text-h3`). ¿Su peso se distingue bien del texto del anuncio?
    - [ ] Así está bien  [ ] Hay que ajustarlo
- Parecido general: [ ] 1280 px  [ ] 360 px
- Notas:

---

### 4. Tabla de contraste C-01 a C-12

Mídela a 1280 px: el ancho no cambia los colores. "Vidrio" es el panel translúcido de la tarjeta sobre el fondo plano. "Superficie" es `--surface`, blanco sólido `#FFFFFF`.

En la columna **Medido** escribe la razón y el hexadecimal del fondo; por ejemplo, `5.1 · fondo #F6F8FA`. En C-07 y C-08 escribe los dos hexadecimales.

| Id | Pantalla | Elemento | Dónde está en pantalla | Color del texto (o del trazo) | Sobre | Umbral | Medido |
|---|---|---|---|---|---|---|---|
| C-01 | `/login` | "¿No te llega el correo? Acude a administración." | Tarjeta del formulario (a la derecha a 1280, debajo de los avisos a 360), bajo el enlace "¿Olvidaste tu contraseña?" | `--muted-foreground` `#3D4654` | Vidrio | 4.5 | |
| C-02 | `/login` | "¿Olvidaste tu contraseña?" | Tarjeta del formulario, debajo del botón "Iniciar sesión" | `--link` `#1B3480` | Vidrio | 4.5 | |
| C-03 | `/login` | Etiqueta "Correo" | Tarjeta del formulario, encima del primer campo | `--foreground` `#16202E` | Vidrio | 4.5 | |
| C-04 | `/login` | Error de campo (pulsa "Iniciar sesión" con los campos vacíos) | Debajo del campo "Correo", en una franja rosada | `--destructive` `#A3341F` | `--danger-soft` `#F7E4DE` | 4.5 | |
| C-05 | `/login` | Título del aviso de error (correo inexistente, como `nadie@pruebas.local`, y cualquier contraseña de 10 caracteres o más) | Recuadro blanco con borde rojo, arriba del campo "Correo" | `--destructive` `#A3341F` | Superficie `#FFFFFF` | 4.5 | |
| C-06 | `/login` | Texto del botón "Iniciar sesión" | Botón azul de la tarjeta | Blanco `#FFFFFF` | `--primary` `#22409A` | 4.5 | |
| C-07 | `/login` | Borde del campo "Correo" (no es texto) | Contorno de 2 px del primer campo | `--input` = `--foreground` `#16202E` | Vidrio (pixel junto al borde) | 3 | |
| C-08 | `/login` | Anillo de foco de un campo (no es texto; llega con Tab a "Correo") | Contorno azul separado del campo | `--ring` = `--accent` `#22409A` | Vidrio (pixel junto al anillo) | 3 | |
| C-09 | `/cambiar-contrasena` | Texto del botón "Cerrar sesión" | Al pie del formulario, junto al botón azul (debajo a 360) | `--foreground` `#16202E` | Vidrio fuerte | 4.5 | |
| C-10 | `/registro` | Ayuda "Mínimo 10 caracteres" | Debajo del campo "Contraseña" | `--muted-foreground` `#3D4654` | Vidrio | 4.5 | |
| C-11 | `/admin` | "Invitación creada. … el enlace vence en 72 horas." (el plan lo llamaba "Invitación enviada…") | Bloque "Invitar a un maestro", después de enviar la invitación de D | `--success` `#1D5B4B` | Superficie `#FFFFFF` | 4.5 | |
| C-12 | `/admin` | Aviso "Contraseña copiada" | Arriba a la derecha, después de "Copiar"; pasa el ratón encima para que no se cierre | `--foreground` `#16202E` | Superficie `#FFFFFF` | 4.5 | |

---

### 5. Resultado (lo llena el orquestador con lo que le pases)
- Fecha:
- Navegador y versión:
- Veredicto: pasa todo / pasa con correcciones / no pasa
- Correcciones pedidas:
- Valores de `DESIGN.md` que el humano aprueba (pasan de "propuesta" a "propuesta aprobada (fecha)"):
- No verificadas y motivo:

---

## DESIGN-01 · comprobación completa (después de 01b)

Hoja para llenar. Sale de `plan-01b.md`, "Comprobación completa del humano". **El PR de DESIGN-01 no se abre hasta que esta comprobación pase.** Ningún agente la hace.

- **Navegador:** Chrome o Edge, con el zoom al 100 %.
- **Anchos:** cada pantalla a **1280 × 800** y a **360 × 800**. H-03 y H-12, además, a 768 y a 767.
- **Qué es nuevo respecto de 01a:** el fondo con orbes, el marco, la composición, el pie, el botón para mostrar la contraseña y el borde de 1 px de los campos. **Se repiten todos los puntos**, también los que ya pasaron en el bloque del login de 01a.
- **Recordatorios:**
  - La barra tiene **un solo destino por rol** ("Inicio" o "Cuentas"). Es lo decidido, no un defecto (R-12).
  - Los textos de los marcadores del pie viajan en el JavaScript de producción, aunque no se pinten (R-15).
- **Cómo anotar:**
  - Marca `[x]` lo que se ve bien.
  - Si algo se ve mal, deja la casilla vacía y escribe qué viste en "Notas".
  - Si algo no se puede comprobar, escribe **no verificada** y el motivo.

### 1. Levantar todo en local
Las cuatro ventanas de la hoja de 01a (arriba, "1. Levantar todo en local"), en el mismo orden:
1. infra: `docker compose up -d` y `docker compose ps -a`;
2. API: `npm run dev` en `backend`, y `curl.exe http://127.0.0.1:3000/api/salud`;
3. worker: `npm run dev:worker` en `backend`;
4. frontend: `npm run dev` en `frontend`.

URL: `http://127.0.0.1:5173/login`. Allí también están el comando para abrir el último correo de `backend\tmp\correos` y cómo apagar todo.

**Ventana 5, solo para H-15 (pie en producción), al final:**
```powershell
Set-Location C:\Users\Carlos\Documents\Proyecto_PlataformaEducativa\frontend
npm run build
npm run preview
```
URL: `http://127.0.0.1:4173/login`. En esta vista solo se mira el pie. Ctrl+C al terminar.

### 2. Cuentas
Aquí no va ninguna contraseña.
- Las mismas cuentas A a E de la hoja de 01a (arriba, "2. Cuentas"), con sus límites:
  - 5 intentos de login cada 15 minutos por correo e IP;
  - 3 recuperaciones por hora;
  - la contraseña temporal se ve una sola vez: usa la última.
- `/acceso-restringido`: **no verificada** si no hay un estudiante restringido. No se altera la base a mano.
- "Cuenta inactiva" (C-13): solo si ya existe una cuenta dada de baja; si no, **no verificada**.

**Recorrido sugerido:** el de 01a, más:
- en cada pantalla, una mirada al fondo y al pie;
- el botón de la contraseña en cada formulario, al pasar por él;
- H-11 al principio, en `/login`;
- H-15 con la ventana 5, al final.

### 3. Comprobaciones H-01 a H-17

#### H-01 · Fuentes
- **Qué haces:** lo mismo que en 01a, en `/diagnostico` y `/login`.
- **Qué debes ver:**
  - solo archivos `.woff2` del propio origen;
  - Atkinson Hyperlegible Next en el texto y Bricolage Grotesque en los títulos;
  - con `tabular-nums`, las cifras ocupan el mismo ancho;
  - el texto se lee cómodo a 16 px y a 360 px.
- [ ] 1280 px  [ ] 360 px
- Notas:

#### H-02 · Materiales y controles
- **Qué debes ver:**
  - paneles de vidrio translúcido **con los orbes detrás**, con borde blanco y brillo en el filo;
  - botones en píldora;
  - **campos blancos con borde gris de 1 px (`#5A6472`)**, que pasa a azul al enfocar sin cambiar de grosor, con el anillo azul por fuera;
  - un campo con error conserva el borde rojo al enfocarlo;
  - títulos en Bricolage Grotesque.

| Pantalla | 1280 px | 360 px | Notas |
|---|---|---|---|
| `/login` | [ ] | [ ] | |
| `/registro` | [ ] | [ ] | |
| `/recuperar` | [ ] | [ ] | |
| `/recuperar`, confirmación | [ ] | [ ] | |
| `/restablecer`, sin token | [ ] | [ ] | |
| `/restablecer`, con enlace real | [ ] | [ ] | |
| `/establecer-contrasena` | [ ] | [ ] | |
| `/cambiar-contrasena` | [ ] | [ ] | |
| `/estudiante` | [ ] | [ ] | |
| `/maestro` | [ ] | [ ] | |
| `/diagnostico` | [ ] | [ ] | |
| `/acceso-restringido` | no verificada | no verificada | Sin pantalla para restringir a un estudiante |

#### H-03 · Admin opaco y denso
- **Qué debes ver:**
  - lo mismo que en 01a: `backdrop-filter: none`, controles de 36 px a 1280 y a 768, de 44 px a 767 y a 360, y texto de los campos a 16 px;
  - además, la barra lateral, la barra superior y el pie, opacos;
  - "Cuentas" activo sobre azul claro (`--accent-soft`);
  - los orbes, quietos detrás.
- Al recargar `/admin`, el "Cargando" de la guarda puede verse un instante en vidrio (R-09).

| Ancho | Todo opaco | Controles | Texto de campos a 16 px |
|---|---|---|---|
| 1280 px | [ ] | [ ] 36 px | [ ] |
| 768 px | [ ] | [ ] 36 px | [ ] |
| 767 px | [ ] | [ ] 44 px | [ ] |
| 360 px | [ ] | [ ] 44 px | [ ] |

- Notas:

#### H-04 · Foco
- **Qué haces:** recorre con Tab y Shift+Tab todas las pantallas de H-02 y `/admin`.
- **Qué debes ver:**
  - un contorno azul de 2 px, separado del control;
  - blanco por dentro en los botones azules y rojos (S-07; el rojo, solo si aparece uno);
  - el foco también en "Inicio" o "Cuentas", "Cerrar sesión", la lista de anuncios del login y el botón del ojo;
  - los marcadores del pie **no** reciben el foco;
  - a 360 px, fíjate en el orden: la barra inferior va antes que la superior (O-4). Anota si te parece bien.
- [ ] 1280 px  [ ] 360 px
- Notas:

#### H-05 · Botón en espera
- **Qué haces:** lo mismo que en 01a, con "Iniciar sesión", "Crear cuenta" y "Sí, restablecer": cuatro formas de reenviar, con la red lenta.
- **Qué debes ver:** una sola petición en Network, y el foco y el indicador en el botón.
  - **Además:** con la contraseña a la vista, Enter desde el campo también manda una sola petición.

| Botón | Una sola petición | Foco e indicador | Notas |
|---|---|---|---|
| "Iniciar sesión" | [ ] | [ ] | |
| "Crear cuenta" | [ ] | [ ] | |
| "Sí, restablecer" | [ ] | [ ] | |
| Enter con la contraseña a la vista | [ ] | [ ] | |

#### H-06 · T-14 en Chrome o Edge
- **Qué haces:** lo mismo que en 01a, primero directo al campo y después con un clic previo en el texto de la página.
- Directo al campo: [ ] 1280 px  [ ] 360 px
- Clic en el texto y luego al campo: [ ] 1280 px  [ ] 360 px
- Notas:

#### H-07 · Aviso de "Copiar"
- **Qué haces:** lo mismo que en 01a. Para ver el error, bloquea el portapapeles y al terminar devuelve el permiso a "Preguntar".
- **Qué debes ver:** en el éxito, icono verde; en el error, icono rojo.
- Éxito: [ ] 1280 px  [ ] 360 px
- Error: [ ] 1280 px  [ ] 360 px
- Notas:

#### H-08 · Movimiento reducido
- **Qué haces:** DevTools › Rendering › `prefers-reduced-motion: reduce`.
- **Qué debes ver:**
  - el indicador del botón y el de "Cargando" no giran y conservan su texto;
  - **los orbes quedan quietos en la posición de la captura**, en `/login` y en `/estudiante`.
- [ ] 1280 px  [ ] 360 px
- Notas:

#### H-09 · Contraste medido en navegador
Mide la tabla C-01 a C-26 (sección 4) con el método de 01a: selector de color de Styles, "Contrast ratio" y, si hace falta, el gotero del fondo en un pixel pegado al texto. En los bordes y los anillos, anota los dos hexadecimales y la razón la calculo yo.

**Para los pares sobre vidrio con un orbe detrás:**
1. Activa primero el movimiento reducido (H-08).
2. En Elements, dentro de `div data-fondo`, selecciona `div data-orbe="azul"`.
3. En Styles › `element.style`, agrega `translate: <x>px <y>px` y ajústalo hasta que el orbe azul quede justo detrás del texto que vas a medir.
4. Mide y borra la propiedad al terminar.

- [ ] Tabla completa

#### H-10 · Parecido general
- **Qué haces:** compara las pantallas con `docs/design/referencia-direccion-d3.png`: materiales, tipografía, botones, campos, **fondo, posición de los orbes y marco**.
- **Lo que decides aquí:**
  - **Enlaces a 360 px:** no hacen salto de línea. [ ] Así está bien  [ ] Que puedan partirse
  - **Títulos de los anuncios, en negrita:** [ ] Así está bien  [ ] Hay que ajustarlo
  - **Posición de los orbes a 360 px:** [ ] Así está bien  [ ] Hay que ajustarla
  - **Separación entre la barra superior, el contenido y el pie:** 20 px para estudiante y maestro (el maestro tenía 24 px) y 16 px en `/admin`. [ ] Así está bien  [ ] Hay que ajustarla
  - **Acceso restringido solo con el candado, sin insignia:** [ ] Así está bien  [ ] Hay que ajustarlo
- Parecido general: [ ] 1280 px  [ ] 360 px
- Notas:

#### H-11 · Fondo y orbes
- (a) En `/login`, `/estudiante` y `/maestro`, los orbes se mueven despacio; espera 10 s. [ ]
- (b) En `/registro`, `/recuperar`, `/restablecer`, `/establecer-contrasena`, `/cambiar-contrasena`, `/diagnostico` y `/admin`, están quietos. [ ]
- (c) De `/login` a "Regístrate como estudiante", se detienen donde estaban, sin salto. [ ]
- (d) En una pantalla larga (`/admin` a 360), al desplazar la página el fondo no se mueve con el contenido. [ ]
- (e) No hay desplazamiento horizontal en ninguna pantalla. [ ]
- (f) **Rendimiento:** en `/login`, DevTools › Ctrl+Shift+P › "Show frame rendering stats" durante 10 s. No debe haber caídas evidentes; si las hay, anota la cifra. [ ]
- Notas:

#### H-12 · Marco
En `/estudiante`, `/maestro` y `/admin`:
- **A 1280 y a 768 px:**
  - barra lateral de 96 px, con el monograma "cm";
  - "Inicio" (o "Cuentas") activo en vidrio fuerte y con texto azul; en Elements, el enlace activo tiene `aria-current="page"`;
  - barra superior de 64 px, con "CMEP" en tinta y "Campus Digital" en verde, el nombre, el rol, el avatar con iniciales y "Cerrar sesión".
  - [ ] 1280 px  [ ] 768 px
- **A 767 y a 360 px:**
  - la barra inferior está fija a la ventana y **no pegada a un panel**: al desplazar la página, la barra no se mueve;
  - no tapa el contenido ni el pie: desplaza hasta el final y el pie queda por encima de la barra;
  - barra superior con el nombre del producto y "Cerrar sesión" solo con icono;
  - sin desplazamiento horizontal.
  - [ ] 767 px  [ ] 360 px
- En `/admin`, todo opaco (H-03). [ ]
- En `/admin`, pasa el puntero sobre "Cuentas" activo. Si pierde el azul claro, anótalo (O-2). [ ] Se queda azul claro
- Notas:

#### H-13 · Composición
- Ningún texto queda directamente sobre el fondo con orbes, en ninguna pantalla. [ ]
- Las pantallas de cuenta llevan el panel centrado y el monograma encima del título. [ ]
- La bienvenida va en un panel. [ ]
- La cabecera de `/admin` va en un panel opaco. [ ]
- "Cargando" aparece en una píldora; se ve con la red lenta al recargar `/estudiante`. [ ]
- `/diagnostico` se ve bien. [ ]
- `/acceso-restringido`, con el candado: **no verificada** si no hay un estudiante restringido.
- Anchos: [ ] 1280 px  [ ] 360 px
- Notas:

#### H-14 · Recorte de la sombra (login y registro)
- **Qué haces:** desplaza la lista de anuncios. A 360 px se desplaza sola; a 1280, reduce la altura con el modo de dispositivo a 1280 × 600.
- **Qué debes ver:**
  - no hay ningún rectángulo grisáceo entre los anuncios ni debajo de ellos;
  - al desplazar, las filas no dejan un filo recto gris al entrar ni al salir;
  - la sombra del panel se ve completa;
  - con Tab, la lista recibe el foco y se desplaza con las flechas.
- [ ] 1280 px  [ ] 360 px
- Notas:

#### H-15 · Pie
- **En desarrollo:** en todas las pantallas de H-02, en `/admin` y, si aplica, en `/acceso-restringido`:
  - se ve "© 2026 Colegio Mexicano de Estudios de Posgrado Jurídicos y Económicos";
  - se ven los 4 marcadores ("Sitio web", "Facebook", "Contacto" y "Aviso de privacidad") con subrayado discontinuo, y no se pueden pulsar ni enfocar;
  - en `/admin`, el pie es opaco;
  - a 360 px se acomoda sin desplazamiento horizontal.
  - [ ] 1280 px  [ ] 360 px
- **En producción** (ventana 5, `http://127.0.0.1:4173/login`): solo se ve "© 2026 …", **sin ningún marcador**. [ ]
- **En Elements, en los dos casos:** no hay ningún `href="#"`. [ ]
- Notas:

#### H-16 · Botón para mostrar la contraseña
En cada campo de contraseña de `/login`, `/registro`, `/restablecer` (con enlace real), `/establecer-contrasena` y `/cambiar-contrasena`:
- [ ] Escribe "abcdef", lleva el cursor entre la "c" y la "d" con las flechas, pulsa el ojo con el ratón y escribe "X": queda "abcXdef", y el foco nunca salió del campo.
- [ ] **A 360 px, con la emulación táctil de DevTools** (modo de dispositivo con un teléfono): toca el ojo y el foco sigue en el campo (R-17).
- [ ] El texto se ve y el icono cambia a ojo tachado. En DevTools › Accessibility, **el nombre del botón no cambia**, y el estado pasa de "no presionado" a "presionado". Al volver a pulsarlo: mismo nombre y "no presionado".
- [ ] **Nombres esperados** (DevTools › Accessibility › Name):
  - en `/login` y `/registro`, "Mostrar contraseña";
  - en `/restablecer` y `/establecer-contrasena`, "Mostrar contraseña nueva" y "Mostrar confirmación de contraseña";
  - en `/cambiar-contrasena`, "Mostrar contraseña temporal", "Mostrar contraseña nueva" y "Mostrar confirmación de contraseña".
- [ ] El nombre no se ve en pantalla (es texto solo para lectores de pantalla) y el botón no tiene `aria-label` (Elements).
- [ ] Pulsar el ojo **no** envía el formulario: Network, sin ninguna petición.
- [ ] Con Tab se llega al ojo justo después de su campo, y Espacio lo activa.
- [ ] En Elements, el `autocomplete` del campo es el mismo en los dos estados.
- [ ] Con la contraseña a la vista, envía el formulario (por ejemplo, un login con una contraseña equivocada): el campo vuelve a ocultarse y el botón a "no presionado". **El cursor se queda donde lo tenías** (T-01 de 01b-2).
- Con la cuenta C, inicia sesión con la contraseña a la vista. ¿Chrome o Edge ofrecen guardar la contraseña como de costumbre? Anótalo.
- Si usas un gestor de contraseñas con icono dentro del campo (1Password, Bitwarden…), ¿su icono se encima con el ojo? Anótalo (R-18).
- Opcional, con NVDA o el Narrador de Windows: el botón se anuncia como "Mostrar contraseña nueva, botón de alternancia, no presionado", o algo equivalente (R-06).
- Notas:

#### H-17 · Borde de los campos sobre los orbes
- **Qué haces:** pon el orbe azul detrás del panel del login, con el método de H-09.
- **Qué debes ver:**
  - el borde gris de 1 px se distingue del vidrio (C-07);
  - al enfocar, el borde azul y el anillo se leen como un solo indicador, no como una línea doble molesta.
- [ ] 1280 px  [ ] 360 px
- Notas:

### 4. Tabla de contraste C-01 a C-26
Mídela a 1280 px, salvo C-16. "Orbe: sí" significa medir con el orbe azul detrás (método de H-09). "Calculado" es el valor de `DESIGN.md` §3 o del cálculo del plan. En la columna **Medido** escribe la razón y el hexadecimal del fondo; en los bordes y los anillos, los dos hexadecimales.

| Id | Pantalla | Elemento | Texto o trazo | Sobre | Orbe | Umbral | Calculado | Medido |
|---|---|---|---|---|---|---|---|---|
| C-01 | `/login` | "¿No te llega el correo? Acude a administración." | `--muted-foreground` `#3D4654` | Vidrio | sí | 4.5 | 6.0 | |
| C-02 | `/login` | "¿Olvidaste tu contraseña?" | `--link` `#1B3480` | Vidrio | sí | 4.5 | 7.2 | |
| C-03 | `/login` | Etiqueta "Correo" | `--foreground` `#16202E` | Vidrio | sí | 4.5 | 10.4 | |
| C-04 | `/login` | Error de campo (enviar vacío) | `--destructive` `#A3341F` | `--danger-soft` `#F7E4DE` | no | 4.5 | 5.5 | |
| C-05 | `/login` | Título del aviso de error (`nadie@pruebas.local`) | `--destructive` | `--surface` `#FFFFFF` | no | 4.5 | 6.8 | |
| C-06 | `/login` | Texto de "Iniciar sesión" | `#FFFFFF` | `--primary` `#22409A` | no | 4.5 | 9.2 | |
| C-07 | `/login` | **Borde del campo "Correo"** (1 px, sin foco) | `--field-border` `#5A6472` | Vidrio (pixel junto al borde) | **sí** | 3 | **3.8 (el de menos margen)** | |
| C-08 | `/login` | Anillo de foco de "Correo" | `--ring` `#22409A` | Vidrio | sí | 3 | 5.8 | |
| C-09 | `/cambiar-contrasena` | Texto de "Cerrar sesión" | `--foreground` | Vidrio fuerte | sí | 4.5 | 12.7 | |
| C-10 | `/registro` | Ayuda "Mínimo 10 caracteres" | `--muted-foreground` | Vidrio | sí | 4.5 | 6.0 | |
| C-11 | `/admin` | "Invitación creada…" | `--success` `#1D5B4B` | `--surface` | no | 4.5 | 7.9 | |
| C-12 | `/admin` | Aviso "Contraseña copiada" | `--foreground` | `--surface` | no | 4.5 | 16.4 | |
| C-13 | `/admin` | "Cuenta inactiva" (solo si existe una cuenta dada de baja) | `--warning` `#7A4F09` | `--surface` | no | 4.5 | 7.1 | |
| C-14 | `/estudiante` | "Campus Digital" en la barra superior | `--brand` `#1D5B4B` | Vidrio | sí | 4.5 | 5.0 | |
| C-15 | `/estudiante` (1280) | "Inicio" activo en la barra lateral | `--link` | Vidrio fuerte | sí | 4.5 | 8.8 | |
| C-16 | `/estudiante` (360) | "Inicio" activo en la barra inferior | `--link` | Vidrio fuerte | sí | 4.5 | 8.8 | |
| C-17 | `/admin` | "Cuentas" activo | `--link` | `--accent-soft` `#E1E7F7` | no | 4.5 | 9.1 | |
| C-18 | `/estudiante` | "Tu dashboard estará disponible pronto." | `--muted-foreground` | Vidrio | sí | 4.5 | 6.0 | |
| C-19 | `/login` | Título de un anuncio | `--foreground` | Vidrio fuerte | sí | 4.5 | 12.7 | |
| C-20 | `/login` | Texto de un anuncio | `--muted-foreground` | Vidrio fuerte | sí | 4.5 | 7.3 | |
| C-21 | `/login` | "© 2026 Colegio…" en el pie | `--muted-foreground` | Vidrio | sí | 4.5 | 6.0 | |
| C-22 | `/login` | Marcador "Aviso de privacidad" (desarrollo) | `--link` | Vidrio | sí | 4.5 | 7.2 | |
| C-23 | `/login` tras restablecer | "Tu contraseña se actualizó. Inicia sesión con la nueva." | `--success` | Vidrio | sí | 4.5 | 5.0 | |
| C-24 | `/estudiante` | Iniciales del avatar | `#FFFFFF` | `--accent` | no | 4.5 | 9.2 | |
| C-25 | `/login` | Icono del ojo (no es texto) | `--foreground` | `--surface`, dentro del campo | no | 3 | 16.4 | |
| C-26 | `/login` | Anillo de foco del ojo (no es texto) | `--ring` | Vidrio junto al campo | sí | 3 | 5.8 | |

Un "no pasa" se escala antes del PR.

### 5. Resultado (lo llena el orquestador con lo que le pases)
- Fecha:
- Navegador y versión:
- Veredicto: pasa todo / pasa con correcciones / no pasa
- Correcciones pedidas (por el carril trivial, según `AGENTS.md`, "Trabajo visual"):
- Valores de `DESIGN.md` que el humano aprueba (pasan de "propuesta" a "propuesta aprobada (fecha)"):
- No verificadas y motivo:
