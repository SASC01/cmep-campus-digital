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
